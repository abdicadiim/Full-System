import type express from "express";
import mongoose from "mongoose";
import { Invoice } from "../models/Invoice.js";
import { SenderEmail } from "../models/SenderEmail.js";
import { Organization } from "../models/Organization.js";
import { sendSmtpMail } from "../services/smtpMailer.js";
import { recordEvent } from "../services/eventService.js";
import { findCustomerByAnyId } from "./customerIdentity.js";

const asString = (v: unknown) => (typeof v === "string" ? v : "");
const normalizeEmail = (value: unknown) => {
  const raw = String(typeof value === "string" ? value : "").trim();
  if (!raw) return "";
  const angle = raw.match(/<([^>]+)>/);
  const candidate = angle?.[1] ? angle[1] : raw;
  const first = candidate.split(/[;,]/)[0]?.trim() || "";
  const match = first.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return String(match?.[0] || first).trim().toLowerCase();
};
const asDate = (v: unknown) => (v ? new Date(String(v)) : null);

const requireOrgId = (req: express.Request, res: express.Response) => {
  const orgId = req.user?.organizationId;
  if (!orgId) {
    res.status(401).json({ success: false, message: "Unauthenticated", data: null });
    return null;
  }
  if (!mongoose.isValidObjectId(orgId)) {
    res.status(400).json({ success: false, message: "Invalid organization", data: null });
    return null;
  }
  return orgId;
};

const normalizeRow = (row: any) => {
  if (!row) return row;
  return { ...row, id: String(row._id) };
};

const pickSmtpSender = async (organizationId: any) => {
  const primary: any = await SenderEmail.findOne({
    organizationId,
    isPrimary: true,
    isVerified: true,
    smtpHost: { $ne: "" },
    smtpUser: { $ne: "" },
    smtpPassword: { $ne: "" },
    smtpPort: { $gt: 0 },
  }).lean();
  if (primary) return primary;

  const fallback: any = await SenderEmail.findOne({
    organizationId,
    isVerified: true,
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
      isEnvFallback: true,
    };
  }

  return null;
};

export const listInvoices: express.RequestHandler = async (req, res) => {
  const orgId = requireOrgId(req, res);
  if (!orgId) return;

  const q = asString(req.query.search ?? req.query.q).trim();
  const status = asString(req.query.status).trim();
  const customerId = asString(req.query.customerId).trim();
  const limit = Math.max(0, Number(req.query.limit || 0));
  const page = Math.max(1, Number(req.query.page || 1));

  const filter: any = { organizationId: orgId };
  if (status) filter.status = new RegExp(`^${status}$`, "i");
  if (customerId) filter.customerId = customerId;
  if (q) {
    const re = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [{ invoiceNumber: re }, { customerName: re }];
  }

  const total = await Invoice.countDocuments(filter);
  let query = Invoice.find(filter).sort({ createdAt: -1 });
  if (limit > 0) query = query.skip((page - 1) * limit).limit(limit);
  const rows = await query.lean();

  return res.json({
    success: true,
    data: rows.map(normalizeRow),
    pagination: {
      total,
      page,
      limit: limit || total,
      pages: limit > 0 ? Math.max(1, Math.ceil(total / limit)) : 1,
    },
  });
};

export const getInvoiceById: express.RequestHandler = async (req, res) => {
  const orgId = requireOrgId(req, res);
  if (!orgId) return;

  const id = String(req.params.id || "").trim();
  if (!id) return res.status(400).json({ success: false, message: "Invalid id", data: null });
  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ success: false, message: "Invalid invoice id", data: null });
  }

  try {
    let row: any = await Invoice.findOne({ _id: id, organizationId: orgId }).lean();
    if (!row) return res.status(404).json({ success: false, message: "Invoice not found", data: null });

    if (row.customerId) {
      try {
        const cust = await findCustomerByAnyId(orgId, row.customerId);
        if (cust) {
          row.customer = cust;
          if (!row.customerName) row.customerName = (cust as any).displayName || (cust as any).name || (cust as any).companyName;
          if (!row.customerEmail && !row.email) row.customerEmail = (cust as any).email;
        }
      } catch (e) {
        // ignore
      }
    }

    return res.json({ success: true, data: normalizeRow(row) });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: String(error?.message || "Failed to fetch invoice"), data: null });
  }
};

export const createInvoice: express.RequestHandler = async (req, res) => {
  const orgId = requireOrgId(req, res);
  if (!orgId) return;

  const invoiceNumber = asString(req.body?.invoiceNumber).trim();
  if (!invoiceNumber) {
    return res.status(400).json({ success: false, message: "Invoice number is required", data: null });
  }

  let customerName = asString(req.body?.customerName).trim();
  const customerId = asString(req.body?.customerId).trim();
  
  if (customerId && (!customerName || customerName === customerId)) {
    try {
      const cust = await findCustomerByAnyId(orgId, customerId);
      if (cust) {
        customerName = (cust as any).displayName || (cust as any).name || (cust as any).companyName || customerName;
      }
    } catch (e) {
      // ignore
    }
  }

  const payload: any = {
    organizationId: orgId,
    ...req.body,
    invoiceNumber,
    customerName,
    date: asDate(req.body?.date) || asDate(req.body?.invoiceDate) || new Date(),
    dueDate: asDate(req.body?.dueDate),
  };

  try {
    const created = await Invoice.create(payload);
    await recordEvent('invoice_created', { invoice: created || null }, 'user');
    return res.status(201).json({ success: true, data: normalizeRow(created.toObject()) });
  } catch (e: any) {
    if (e?.code === 11000) {
      return res.status(409).json({ success: false, message: "Invoice number already exists", data: null });
    }
    return res.status(500).json({ success: false, message: e.message || "Failed to create invoice", data: null });
  }
};

export const updateInvoice: express.RequestHandler = async (req, res) => {
  const orgId = requireOrgId(req, res);
  if (!orgId) return;

  const id = String(req.params.id || "").trim();
  if (!id) return res.status(400).json({ success: false, message: "Invalid id", data: null });

  const patch: any = { ...req.body };
  if (patch.date) patch.date = asDate(patch.date);
  if (patch.invoiceDate) patch.invoiceDate = asDate(patch.invoiceDate);
  if (patch.dueDate) patch.dueDate = asDate(patch.dueDate);

  if (patch.customerId && (!patch.customerName || patch.customerName === patch.customerId)) {
    try {
      const cust = await findCustomerByAnyId(orgId, patch.customerId);
      if (cust) {
        patch.customerName = (cust as any).displayName || (cust as any).name || (cust as any).companyName || patch.customerName;
      }
    } catch (e) {
      // ignore
    }
  }

  const updated: any = await Invoice.findOneAndUpdate({ _id: id, organizationId: orgId }, { $set: patch }, { new: true })
    .lean();
  if (!updated) return res.status(404).json({ success: false, message: "Invoice not found", data: null });

  return res.json({ success: true, data: normalizeRow(updated) });
};

export const deleteInvoice: express.RequestHandler = async (req, res) => {
  const orgId = requireOrgId(req, res);
  if (!orgId) return;

  const id = String(req.params.id || "").trim();
  const deleted = await Invoice.findOneAndDelete({ _id: id, organizationId: orgId }).lean();
  if (deleted) await recordEvent('invoice_deleted', { invoice: deleted }, 'user');
  if (!deleted) return res.status(404).json({ success: false, message: "Invoice not found", data: null });
  return res.json({ success: true, data: { id } });
};

export const getNextInvoiceNumber: express.RequestHandler = async (req, res) => {
  const orgId = requireOrgId(req, res);
  if (!orgId) return;

  const prefix = asString(req.query.prefix || "INV-");
  const last = await Invoice.findOne({ organizationId: orgId, invoiceNumber: new RegExp(`^${prefix}`) })
    .sort({ invoiceNumber: -1 })
    .lean();

  let nextNo = 1;
  if (last) {
    const digits = String((last as any).invoiceNumber || "").match(/\d+$/);
    if (digits) nextNo = parseInt(digits[0]) + 1;
  }

  const nextNumber = `${prefix}${String(nextNo).padStart(6, "0")}`;
  return res.json({ success: true, data: { nextNumber } });
};

export const sendInvoiceEmail: express.RequestHandler = async (req, res) => {
  try {
    const orgId = requireOrgId(req, res);
    if (!orgId) return;

    const id = String(req.params.id || "").trim();
    if (!id) return res.status(400).json({ success: false, message: "Invalid invoice id", data: null });

    const invoice: any = await Invoice.findOne({ _id: id, organizationId: orgId }).lean();
    if (!invoice) return res.status(404).json({ success: false, message: "Invoice not found", data: null });

    const to = normalizeEmail(req.body?.to);
    if (!to || !to.includes("@")) {
      return res.status(400).json({ success: false, message: "Recipient email is required", data: null });
    }

    const sender = await pickSmtpSender(orgId);
    if (!sender) {
      return res.status(400).json({
        success: false,
        message:
          "SMTP sender is not configured. Add it in Settings > Emails, or set SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS in the server env.",
        data: null,
      });
    }

    const org: any = await Organization.findById(orgId).lean();
    const orgName = String(org?.name || "Organization");
    const senderEmail = String(sender.email || sender.smtpUser || "").trim();
    const senderName = String(sender.name || orgName || "Organization").trim() || orgName;
    const fromHeaderRaw = String(req.body?.from || "").trim();
    const fromHeader = senderEmail
      ? `${senderName} <${senderEmail}>`
      : fromHeaderRaw && fromHeaderRaw.includes("@")
        ? fromHeaderRaw
        : fromHeaderRaw;

    const subject = String(req.body?.subject || `Invoice ${invoice.invoiceNumber || ""}`).trim();
    const htmlBody = String(req.body?.body || "").trim();
    const textBody = htmlBody ? htmlBody.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim() : subject;

    const rawAttachments = Array.isArray(req.body?.attachments) ? req.body.attachments : [];
    const attachments = rawAttachments
      .map((att: any, index: number) => {
        const filename = String(att?.filename || att?.name || `attachment-${index + 1}`).trim() || `attachment-${index + 1}`;
        const contentType = String(att?.contentType || att?.type || "application/octet-stream").trim();
        const raw = String(att?.content || att?.contentBase64 || "").trim();
        if (!raw) return null;
        const cleaned = raw.includes(",") ? raw.split(",").pop() || raw : raw;
        const cid = `invoice_${Date.now()}_${index}`;
        return {
          cid,
          filename,
          contentType,
          contentBase64: cleaned,
          disposition: "attachment" as const
        };
      })
      .filter(Boolean);

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
        replyTo: senderEmail || undefined,
        to,
        subject,
        text: textBody,
        html: htmlBody,
        attachments
      }
    );

    if (!result.ok) {
      return res.status(400).json({ success: false, message: result.error || "Failed to send email", data: result.debug || null });
    }

    await Invoice.updateOne({ _id: id, organizationId: orgId }, { $set: { status: "Sent" } });

    return res.json({ success: true, data: { id, status: "Sent" } });
  } catch (error: any) {
    const message = String(error?.message || "SMTP send failed");
    return res.status(400).json({
      success: false,
      message,
      data: null,
    });
  }
};
