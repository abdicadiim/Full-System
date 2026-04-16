import express from "express";
import mongoose from "mongoose";
import { SalesReceipt } from "../models/SalesReceipt.js";
import { SenderEmail } from "../models/SenderEmail.js";
import { Organization } from "../models/Organization.js";
import { sendSmtpMail } from "../services/smtpMailer.js";

const asString = (v: unknown) => (typeof v === "string" ? v : "");
const asNumber = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const asDate = (v: unknown) => (v ? new Date(String(v)) : null);
const normalizeEmail = (value: unknown) => {
  const raw = String(typeof value === "string" ? value : "").trim();
  if (!raw) return "";
  const angle = raw.match(/<([^>]+)>/);
  const candidate = angle?.[1] ? angle[1] : raw;
  const first = candidate.split(/[;,]/)[0]?.trim() || "";
  const match = first.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return String(match?.[0] || first).trim().toLowerCase();
};

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

const normalizeRow = (row: any) => (row ? { ...row, id: String(row._id) } : row);

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

export const listSalesReceipts: express.RequestHandler = async (req, res) => {
  const orgId = requireOrgId(req, res);
  if (!orgId) return;

  const q = asString(req.query.search ?? req.query.q).trim();
  const statusRaw = asString(req.query.status).trim();
  const status = statusRaw && statusRaw.toLowerCase() === "all" ? "" : statusRaw;
  const customerId = asString(req.query.customerId).trim();
  const limit = Math.max(0, Number(req.query.limit || 0));
  const page = Math.max(1, Number(req.query.page || 1));

  const filter: any = { organizationId: orgId };
  if (status) filter.status = new RegExp(`^${status}$`, "i");
  if (customerId) filter.customerId = customerId;
  if (q) {
    const re = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [{ receiptNumber: re }, { customerName: re }, { referenceNumber: re }];
  }

  const total = await SalesReceipt.countDocuments(filter);
  let query = SalesReceipt.find(filter).sort({ date: -1, createdAt: -1 });
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

export const getSalesReceiptById: express.RequestHandler = async (req, res) => {
  const orgId = requireOrgId(req, res);
  if (!orgId) return;

  const id = String(req.params.id || "").trim();
  const row = await SalesReceipt.findOne({ _id: id, organizationId: orgId }).lean();
  if (!row) return res.status(404).json({ success: false, message: "Sales receipt not found", data: null });
  return res.json({ success: true, data: normalizeRow(row) });
};

export const createSalesReceipt: express.RequestHandler = async (req, res) => {
  const orgId = requireOrgId(req, res);
  if (!orgId) return;

  try {
    const payload = {
      ...req.body,
      organizationId: orgId,
      receiptNumber: String(req.body?.receiptNumber || "").trim(),
      customerId: String(req.body?.customerId || req.body?.customer || "").trim(),
      customerName: String(req.body?.customerName || "").trim(),
      date: asDate(req.body?.receiptDate || req.body?.date) || new Date(),
      total: asNumber(req.body?.total),
    };

    const created = await SalesReceipt.create(payload);
    return res.status(201).json({ success: true, data: normalizeRow(created.toObject()) });
  } catch (error: any) {
    const msg = String(error?.message || "");
    if (msg.toLowerCase().includes("duplicate") || msg.toLowerCase().includes("exists")) {
      return res.status(409).json({ success: false, message: "Sales receipt number already exists", data: null });
    }
    return res.status(500).json({ success: false, message: msg || "Failed to create sales receipt", data: null });
  }
};

export const updateSalesReceipt: express.RequestHandler = async (req, res) => {
  const orgId = requireOrgId(req, res);
  if (!orgId) return;

  const id = String(req.params.id || "").trim();
  const update: any = {
    ...req.body,
  };
  if (req.body?.receiptDate || req.body?.date) {
    update.date = asDate(req.body?.receiptDate || req.body?.date) || update.date;
  }

  const updated = await SalesReceipt.findOneAndUpdate(
    { _id: id, organizationId: orgId },
    { $set: update },
    { new: true }
  ).lean();
  if (!updated) return res.status(404).json({ success: false, message: "Sales receipt not found", data: null });
  return res.json({ success: true, data: normalizeRow(updated) });
};

export const deleteSalesReceipt: express.RequestHandler = async (req, res) => {
  const orgId = requireOrgId(req, res);
  if (!orgId) return;

  const id = String(req.params.id || "").trim();
  await SalesReceipt.findOneAndDelete({ _id: id, organizationId: orgId }).lean();
  return res.json({ success: true, data: { id } });
};

export const getNextSalesReceiptNumber: express.RequestHandler = async (req, res) => {
  const orgId = requireOrgId(req, res);
  if (!orgId) return;

  const prefix = asString(req.query.prefix || "SR").replace(/[^A-Za-z0-9]/g, "") || "SR";
  const last = await SalesReceipt.findOne({ organizationId: orgId, receiptNumber: new RegExp(`^${prefix}`) })
    .sort({ receiptNumber: -1 })
    .lean();

  let nextNo = 1;
  if (last) {
    const digits = String((last as any).receiptNumber || "").match(/\d+$/);
    if (digits) nextNo = parseInt(digits[0], 10) + 1;
  }

  const nextNumber = `${prefix}${String(nextNo).padStart(6, "0")}`;
  return res.json({ success: true, data: { nextNumber } });
};

export const sendSalesReceiptEmail: express.RequestHandler = async (req, res) => {
  try {
    const orgId = requireOrgId(req, res);
    if (!orgId) return;

    const id = String(req.params.id || "").trim();
    if (!id) return res.status(400).json({ success: false, message: "Invalid sales receipt id", data: null });

    const receipt: any = await SalesReceipt.findOne({ _id: id, organizationId: orgId }).lean();
    if (!receipt) return res.status(404).json({ success: false, message: "Sales receipt not found", data: null });

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

    const subject = String(req.body?.subject || `Sales Receipt ${receipt.receiptNumber || ""}`).trim();
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
        const cid = `sales_receipt_${Date.now()}_${index}`;
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
        attachments,
      }
    );

    if (!result.ok) {
      return res.status(400).json({ success: false, message: result.error || "Failed to send email", data: result.debug || null });
    }

    await SalesReceipt.updateOne({ _id: id, organizationId: orgId }, { $set: { status: "Sent" } });
    return res.json({ success: true, data: { id, status: "Sent" } });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: String(error?.message || "SMTP send failed"),
      data: null,
    });
  }
};
