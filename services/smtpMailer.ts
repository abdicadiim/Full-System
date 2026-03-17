import net from "node:net";
import tls from "node:tls";

export type SmtpConfig = {
  host: string;
  port: number;
  secure: boolean; // true = TLS from connect (465)
  user: string;
  pass: string;
};

export type MailMessage = {
  from: string;
  to: string;
  subject: string;
  text: string;
  html?: string;
  attachments?: Array<{
    cid: string;
    filename: string;
    contentType: string;
    contentBase64: string;
    disposition?: "inline" | "attachment";
  }>;
};

type SmtpResponse = { code: number; lines: string[] };

const toBase64 = (value: string) => Buffer.from(value, "utf8").toString("base64");

class SmtpClient {
  private socket: net.Socket | tls.TLSSocket;
  private buffer = "";
  private pending: { resolve: (r: SmtpResponse) => void; reject: (e: any) => void } | null = null;

  constructor(socket: net.Socket | tls.TLSSocket) {
    this.socket = socket;
    this.socket.setEncoding("utf8");
    this.socket.on("data", (chunk: string) => this.onData(chunk));
    this.socket.on("error", (err) => this.pending?.reject(err));
  }

  setSocket(socket: net.Socket | tls.TLSSocket) {
    this.socket.removeAllListeners("data");
    this.socket.removeAllListeners("error");
    this.socket = socket;
    this.socket.setEncoding("utf8");
    this.socket.on("data", (chunk: string) => this.onData(chunk));
    this.socket.on("error", (err) => this.pending?.reject(err));
  }

  write(line: string) {
    this.socket.write(line);
  }

  end() {
    try {
      this.socket.end();
    } catch {}
  }

  async readResponse(timeoutMs = 15_000): Promise<SmtpResponse> {
    if (this.pending) throw new Error("Concurrent SMTP read not supported");

    return new Promise<SmtpResponse>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pending = null;
        reject(new Error("SMTP timeout"));
      }, timeoutMs);

      this.pending = {
        resolve: (r) => {
          clearTimeout(timeout);
          this.pending = null;
          resolve(r);
        },
        reject: (e) => {
          clearTimeout(timeout);
          this.pending = null;
          reject(e);
        },
      };

      this.tryFlush();
    });
  }

  private onData(chunk: string) {
    this.buffer += chunk;
    this.tryFlush();
  }

  private tryFlush() {
    if (!this.pending) return;

    const lines = this.buffer.split(/\r\n/);
    if (lines.length < 2) return;

    this.buffer = lines.pop() || "";

    const collected: string[] = [];
    let finalCode: number | null = null;
    for (const line of lines) {
      if (!line) continue;
      collected.push(line);
      const m = line.match(/^(\d{3})([ -])(.*)$/);
      if (!m) continue;
      const code = Number(m[1]);
      const sep = m[2];
      if (sep === " ") finalCode = code;
    }

    if (finalCode === null) return;
    this.pending.resolve({ code: finalCode, lines: collected });
  }
}

const expect = async (client: SmtpClient, allowedCodes: number[], context: string) => {
  const resp = await client.readResponse();
  if (!allowedCodes.includes(resp.code)) throw new Error(`${context} failed: ${resp.lines.join(" | ")}`);
  return resp;
};

export const sendSmtpMail = async (cfg: SmtpConfig, msg: MailMessage) => {
  const host = String(cfg.host || "").trim();
  const port = Number(cfg.port || 0);
  const user = String(cfg.user || "").trim();
  const pass = String(cfg.pass || "");
  // Normalize secure mode based on common SMTP ports to avoid TLS "wrong version number" errors.
  // 465 = implicit TLS, 587 = STARTTLS (plain connect then upgrade).
  const secure = port === 465 ? true : port === 587 ? false : Boolean(cfg.secure);

  if (!host || !Number.isFinite(port) || port <= 0 || !user || !pass) {
    return { ok: false as const, error: "SMTP config incomplete" };
  }

  const parseEnvelopeEmail = (fromHeader: string) => {
    const raw = String(fromHeader || "").trim();
    const m = raw.match(/<([^>]+)>/);
    if (m?.[1]) return m[1].trim();
    return raw;
  };

  const socket = secure
    ? tls.connect({ host, port, servername: host, rejectUnauthorized: false })
    : net.connect({ host, port });

  const client = new SmtpClient(socket);
  const debugSteps: Array<{ step: string; code?: number; lines?: string[] }> = [];

  try {
    await new Promise<void>((resolve, reject) => {
      const t = setTimeout(() => reject(new Error("SMTP connect timeout")), 15_000);
      socket.once("connect", () => {
        clearTimeout(t);
        resolve();
      });
      socket.once("error", (e) => {
        clearTimeout(t);
        reject(e);
      });
    });

    const greet = await expect(client, [220], "Greeting");
    debugSteps.push({ step: "greeting", code: greet.code, lines: greet.lines });
    client.write(`EHLO localhost\r\n`);
    const ehlo = await expect(client, [250], "EHLO");
    debugSteps.push({ step: "ehlo", code: ehlo.code, lines: ehlo.lines });

    if (!secure) {
      client.write(`STARTTLS\r\n`);
      const starttls = await client.readResponse();
      debugSteps.push({ step: "starttls", code: starttls.code, lines: starttls.lines });
      if (starttls.code === 220) {
        const upgraded = tls.connect({ socket, servername: host, rejectUnauthorized: false });
        await new Promise<void>((resolve, reject) => {
          const t = setTimeout(() => reject(new Error("STARTTLS timeout")), 15_000);
          upgraded.once("secureConnect", () => {
            clearTimeout(t);
            resolve();
          });
          upgraded.once("error", (e) => {
            clearTimeout(t);
            reject(e);
          });
        });
        client.setSocket(upgraded);
        client.write(`EHLO localhost\r\n`);
        const ehlo2 = await expect(client, [250], "EHLO after STARTTLS");
        debugSteps.push({ step: "ehlo_after_starttls", code: ehlo2.code, lines: ehlo2.lines });
      }
    }

    client.write(`AUTH LOGIN\r\n`);
    const authLogin = await expect(client, [334], "AUTH LOGIN");
    debugSteps.push({ step: "auth_login", code: authLogin.code, lines: authLogin.lines });
    client.write(`${toBase64(user)}\r\n`);
    const authUser = await expect(client, [334], "AUTH user");
    debugSteps.push({ step: "auth_user", code: authUser.code, lines: authUser.lines });
    client.write(`${toBase64(pass)}\r\n`);
    const authPass = await expect(client, [235], "AUTH pass");
    debugSteps.push({ step: "auth_pass", code: authPass.code, lines: authPass.lines });

    const from = String(msg.from || "").trim();
    const to = String(msg.to || "").trim();
    if (!from || !to) return { ok: false as const, error: "Missing from/to" };

    const envelopeFrom = parseEnvelopeEmail(from);
    client.write(`MAIL FROM:<${envelopeFrom}>\r\n`);
    const mailFrom = await expect(client, [250], "MAIL FROM");
    debugSteps.push({ step: "mail_from", code: mailFrom.code, lines: mailFrom.lines });
    client.write(`RCPT TO:<${to}>\r\n`);
    const rcpt = await expect(client, [250, 251], "RCPT TO");
    debugSteps.push({ step: "rcpt_to", code: rcpt.code, lines: rcpt.lines });
    client.write(`DATA\r\n`);
    const dataStart = await expect(client, [354], "DATA");
    debugSteps.push({ step: "data", code: dataStart.code, lines: dataStart.lines });

    const isHtml = Boolean(msg.html);
    const attachments = Array.isArray(msg.attachments) ? msg.attachments : [];
    const hasInline = attachments.length > 0 && isHtml;

    const wrapBase64 = (input: string) => {
      const clean = String(input || "").replace(/\s+/g, "");
      const parts: string[] = [];
      for (let i = 0; i < clean.length; i += 76) parts.push(clean.slice(i, i + 76));
      return parts.join("\r\n");
    };

    const renderBody = () => {
      if (!hasInline) {
        const contentType = isHtml ? "text/html" : "text/plain";
        const content = isHtml ? String(msg.html || "") : String(msg.text || "");
        return (
          `MIME-Version: 1.0\r\n` +
          `Content-Type: ${contentType}; charset=utf-8\r\n` +
          `\r\n` +
          `${content}\r\n`
        );
      }

      const boundary = `rel_${Math.random().toString(16).slice(2)}_${Date.now()}`;
      const html = String(msg.html || "");
      let out = "";
      out += `MIME-Version: 1.0\r\n`;
      out += `Content-Type: multipart/related; boundary="${boundary}"\r\n`;
      out += `\r\n`;
      out += `--${boundary}\r\n`;
      out += `Content-Type: text/html; charset=utf-8\r\n`;
      out += `Content-Transfer-Encoding: 7bit\r\n`;
      out += `\r\n`;
      out += `${html}\r\n`;

      for (const att of attachments) {
        const cid = String(att.cid || "").trim();
        const filename = String(att.filename || "file").trim();
        const contentType = String(att.contentType || "application/octet-stream").trim();
        const disposition = att.disposition || "inline";
        const contentBase64 = wrapBase64(att.contentBase64 || "");

        if (!cid || !contentBase64) continue;
        out += `--${boundary}\r\n`;
        out += `Content-Type: ${contentType}; name="${filename}"\r\n`;
        out += `Content-Transfer-Encoding: base64\r\n`;
        out += `Content-ID: <${cid}>\r\n`;
        out += `Content-Disposition: ${disposition}; filename="${filename}"\r\n`;
        out += `\r\n`;
        out += `${contentBase64}\r\n`;
      }

      out += `--${boundary}--\r\n`;
      return out;
    };

    const body =
      `Subject: ${msg.subject}\r\n` +
      `From: ${from}\r\n` +
      `To: ${to}\r\n` +
      renderBody();

    client.write(`${body}\r\n.\r\n`);
    const accepted = await expect(client, [250], "Message");
    debugSteps.push({ step: "accepted", code: accepted.code, lines: accepted.lines });

    client.write(`QUIT\r\n`);
    await client.readResponse().catch(() => null);
    client.end();
    return { ok: true as const, debug: debugSteps };
  } catch (error: any) {
    client.end();
    const msg = String(error?.message || "SMTP send failed");
    const lower = msg.toLowerCase();
    if (msg.toLowerCase().includes("wrong version number")) {
      return {
        ok: false as const,
        error:
          "SMTP TLS mode mismatch. If you use port 587, disable SSL and use STARTTLS. If you use port 465, enable SSL/TLS.",
      };
    }
    if (lower.includes("535") || lower.includes("badcredentials") || lower.includes("username and password not accepted")) {
      return {
        ok: false as const,
        error: "SMTP auth failed (Gmail). Use SMTP User = full email, SMTP Password = Google App Password (16 chars), and enable 2‑Step Verification.",
        debug: debugSteps,
      };
    }
    return { ok: false as const, error: msg, debug: debugSteps };
  }
};
