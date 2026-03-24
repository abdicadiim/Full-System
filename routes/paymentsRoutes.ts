import express from "express";
import mongoose from "mongoose";
import { PaymentReceived } from "../models/PaymentReceived.js";
import { SenderEmail } from "../models/SenderEmail.js";
import { Organization } from "../models/Organization.js";
import { sendSmtpMail } from "../services/smtpMailer.js";
import { requireAuth } from "../midelwares/requireAuth.js";

const router = express.Router();
router.use(requireAuth);

const normalizeRow = (row: any) => (row ? { ...row, id: String(row._id) } : row);
const normalizeEmail = (value: unknown) => {
  const raw = String(typeof value === "string" ? value : "").trim();
  if (!raw) return "";
  const angle = raw.match(/<([^>]+)>/);
  const candidate = angle?.[1] ? angle[1] : raw;
  const first = candidate.split(/[;,]/)[0]?.trim() || "";
  const match = first.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return String(match?.[0] || first).trim().toLowerCase();
};

const pickSmtpSender = async (organizationId: any) => {
  const primary: any = await SenderEmail.findOne({
    organizationId,
    isPrimary: true,
    smtpHost: { $ne: "" },
    smtpUser: { $ne: "" },
    smtpPassword: { $ne: "" },
    smtpPort: { $gt: 0 },
  }).lean();
  if (primary) return primary;

  const fallback: any = await SenderEmail.findOne({
    organizationId,
    smtpHost: { $ne: "" },
    smtpUser: { $ne: "" },
    smtpPassword: { $ne: "" },
    smtpPort: { $gt: 0 },
  })
    .sort({ isPrimary: -1, createdAt: -1 })
    .lean();
  if (fallback) return fallback;

  const host = String(process.env.SMTP_HOST || "").trim();
  const port = Number(process.env.SMTP_PORT || 0);
  const user = String(process.env.SMTP_USER || "").trim();
  const pass = String(process.env.SMTP_PASS || process.env.SMTP_PASSWORD || "").trim();
  if (host && port > 0 && user && pass) {
    return {
      smtpHost: host,
      smtpPort: port,
      smtpUser: user,
      smtpPassword: pass,
      smtpSecure: port === 465,
      email: String(process.env.SMTP_FROM || user || "").trim(),
    };
  }

  return null;
};

router.get("/", async (req, res) => {
  const orgId = req.user?.organizationId;
  const filter: any = { organizationId: orgId };
  if (req.query.customerId) filter.customerId = req.query.customerId;
  const total = await PaymentReceived.countDocuments(filter);
  const rows = await PaymentReceived.find(filter).sort({ date: -1 }).lean();
  res.json({ success: true, data: rows.map(normalizeRow), pagination: { total, page: 1, limit: total, pages: 1 } });
});

router.post("/", async (req, res) => {
  try {
    const orgId = req.user?.organizationId;
    const created = await PaymentReceived.create({ ...req.body, organizationId: orgId });
    return res.status(201).json({ success: true, data: normalizeRow(created.toObject()) });
  } catch (error: any) {
    if (error?.code === 11000) {
      return res.status(409).json({ success: false, message: "Payment number already exists", data: null });
    }
    return res.status(400).json({ success: false, message: String(error?.message || "Failed to save payment"), data: null });
  }
});

router.get("/:id", async (req, res) => {
  const orgId = req.user?.organizationId;
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ success: false, message: "Invalid payment id", data: null });
  }
  const row = await PaymentReceived.findOne({ _id: req.params.id, organizationId: orgId }).lean();
  if (!row) return res.status(404).json({ success: false, message: "Not found", data: null });
  res.json({ success: true, data: normalizeRow(row) });
});

router.put("/:id", async (req, res) => {
  const orgId = req.user?.organizationId;
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ success: false, message: "Invalid payment id", data: null });
  }
  const updated = await PaymentReceived.findOneAndUpdate({ _id: req.params.id, organizationId: orgId }, { $set: req.body }, { new: true }).lean();
  res.json({ success: true, data: normalizeRow(updated) });
});

router.delete("/:id", async (req, res) => {
  const orgId = req.user?.organizationId;
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ success: false, message: "Invalid payment id", data: null });
  }
  await PaymentReceived.findOneAndDelete({ _id: req.params.id, organizationId: orgId });
  res.json({ success: true, data: { id: req.params.id } });
});

router.post("/:id/send-email", async (req, res) => {
  try {
    const orgId = req.user?.organizationId;
    const id = String(req.params.id || "").trim();
    if (!orgId || !id) {
      return res.status(400).json({ success: false, message: "Invalid request", data: null });
    }

    const payment: any = await PaymentReceived.findOne({ _id: id, organizationId: orgId }).lean();
    if (!payment) {
      return res.status(404).json({ success: false, message: "Payment not found", data: null });
    }

    const to = normalizeEmail(req.body?.to);
    if (!to || !to.includes("@")) {
      return res.status(400).json({ success: false, message: "Recipient email is required", data: null });
    }

    const sender = await pickSmtpSender(orgId);
    if (!sender) {
      return res.status(400).json({
        success: false,
        message:
          "SMTP sender is not configured. Add it in Settings > Emails, or set SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS.",
        data: null,
      });
    }

    const org: any = await Organization.findById(orgId).lean();
    const orgName = String(org?.name || "Organization");
    const senderEmail = String(sender.email || sender.smtpUser || "").trim();
    const fromHeaderRaw = String(req.body?.from || "").trim();
    const fromHeader =
      fromHeaderRaw && fromHeaderRaw.includes("@")
        ? fromHeaderRaw
        : senderEmail
          ? `${orgName} <${senderEmail}>`
          : fromHeaderRaw;

    const defaultSubject = `Payment Receipt ${payment.paymentNumber || id}`;
    const subject = String(req.body?.subject || defaultSubject).trim();
    const rawBody = String(req.body?.body || "").trim();
    const fallbackBody = `Dear ${payment.customerName || "Customer"},\n\nThank you for your payment.\nPayment Number: ${payment.paymentNumber || "-"}\nAmount: ${payment.amount || 0}\nDate: ${payment.date ? new Date(payment.date).toDateString() : "-"}\n\nRegards,\n${orgName}`;
    const textBody = (rawBody ? rawBody.replace(/<[^>]*>/g, " ") : fallbackBody).replace(/\s+/g, " ").trim();
    const htmlBody = rawBody || `<p>${fallbackBody.replace(/\n/g, "<br/>")}</p>`;

    const result = await sendSmtpMail(
      {
        host: String(sender.smtpHost || ""),
        port: Number(sender.smtpPort || 0),
        secure: Boolean(sender.smtpSecure),
        user: String(sender.smtpUser || ""),
        pass: String(sender.smtpPassword || ""),
      },
      {
        from: fromHeader || senderEmail,
        to,
        subject,
        text: textBody,
        html: htmlBody,
      }
    );

    if (!result.ok) {
      return res.status(400).json({ success: false, message: result.error || "Failed to send email", data: result.debug || null });
    }

    return res.json({ success: true, data: { id, emailed: true } });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: String(error?.message || "Failed to send email"),
      data: null,
    });
  }
});

export default router;
