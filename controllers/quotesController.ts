import type express from "express";
import mongoose from "mongoose";
import { Quote } from "../models/Quote.js";
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
const asNumber = (v: unknown) => (typeof v === "number" ? v : 0);
const asDate = (v: unknown) => (v ? new Date(String(v)) : null);
const normalizeAddressSnapshot = (address: any) => {
  if (!address) return "";
  if (typeof address === "string") return address.trim();

  const attention = String(address?.attention || "").trim();
  const street1 = String(address?.street1 || "").trim();
  const street2 = String(address?.street2 || "").trim();
  const city = String(address?.city || "").trim();
  const state = String(address?.state || "").trim();
  const zipCode = String(address?.zipCode || "").trim();
  const country = String(address?.country || "").trim();

  const cityStateZip = [city, state, zipCode].filter(Boolean).join(", ");
  return [attention, street1, street2, cityStateZip, country].filter(Boolean).join(", ");
};

const toFiniteNumber = (value: unknown, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeQuoteFinancialFields = (source: any = {}) => {
  const shippingCharges = toFiniteNumber(
    source?.shippingCharges ??
      source?.shipping ??
      source?.shippingCharge ??
      source?.shippingAmount ??
      source?.shipmentCharges ??
      source?.shipping_charges ??
      source?.shipping_charge ??
      source?.shipping_amount,
  );
  const shippingChargeTax = String(
    source?.shippingChargeTax ??
      source?.shippingTax ??
      source?.shipping_tax ??
      source?.shippingTaxId ??
      source?.shipping_tax_id ??
      source?.shippingTaxName ??
      source?.shipping_tax_name ??
      "",
  ).trim();
  const shippingTaxAmount = toFiniteNumber(
    source?.shippingTaxAmount ??
      source?.shippingTax ??
      source?.shipping_tax_amount ??
      source?.shipping_tax ??
      0,
  );
  const shippingTaxName = String(
    source?.shippingTaxName ??
      source?.shipping_tax_name ??
      "",
  ).trim();
  const shippingTaxRate = toFiniteNumber(
    source?.shippingTaxRate ??
      source?.shipping_tax_rate ??
      0,
  );
  const adjustment = toFiniteNumber(
    source?.adjustment ??
      source?.adjustments ??
      source?.roundingAdjustment ??
      source?.adjustmentAmount ??
      source?.adjustment_amount ??
      source?.rounding_adjustment ??
      0,
  );
  const roundOff = toFiniteNumber(
    source?.roundOff ??
      source?.rounding ??
      source?.roundOffAmount ??
      source?.round_off ??
      source?.rounding_amount ??
      0,
  );

  return {
    shippingCharges,
    shippingChargeTax,
    shippingTaxAmount,
    shippingTaxName,
    shippingTaxRate,
    adjustment,
    roundOff,
  };
};

const requireOrgId = (req: express.Request, res: express.Response) => {
  const orgId = req.user?.organizationId;
  if (!orgId) {
    res.status(401).json({ success: false, message: "Unauthenticated", data: null });
    return null;
  }
  return orgId;
};

const normalizeRow = (row: any) => {
  if (!row) return row;
  return {
    ...row,
    id: String(row._id),
    comments: Array.isArray(row.comments) ? row.comments : [],
    activityLogs: Array.isArray(row.activityLogs) ? row.activityLogs : [],
  };
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

export const listQuotes: express.RequestHandler = async (req, res) => {
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
    filter.$or = [{ quoteNumber: re }, { customerName: re }, { subject: re }];
  }

  const shouldPage = limit > 0;
  let query = Quote.find(filter).sort({ createdAt: -1 });
  if (shouldPage) query = query.skip((page - 1) * limit).limit(limit);

  const [total, rows] = await Promise.all([
    shouldPage ? Quote.countDocuments(filter) : Promise.resolve(0),
    query.lean(),
  ]);
  const effectiveTotal = shouldPage ? total : rows.length;

  return res.json({
    success: true,
    data: rows.map(normalizeRow),
    pagination: {
      total: effectiveTotal,
      page,
      limit: limit || effectiveTotal,
      pages: shouldPage ? Math.max(1, Math.ceil(effectiveTotal / limit)) : 1,
    },
  });
};

export const getQuoteById: express.RequestHandler = async (req, res) => {
  const orgId = requireOrgId(req, res);
  if (!orgId) return;

  const id = String(req.params.id || "").trim();
  if (!id) return res.status(400).json({ success: false, message: "Invalid id", data: null });

  let row: any = await Quote.findOne({ _id: id, organizationId: orgId }).lean();
  if (!row) return res.status(404).json({ success: false, message: "Quote not found", data: null });

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
};

export const createQuote: express.RequestHandler = async (req, res) => {
  const orgId = requireOrgId(req, res);
  if (!orgId) return;

  let customerName = asString(req.body?.customerName).trim();
  const customerId = asString(req.body?.customerId).trim();
  if (!customerId) {
    return res.status(400).json({ success: false, message: "Customer is required", data: null });
  }

  let customerRecord: any = null;
  if (customerId && (!customerName || customerName === customerId)) {
    try {
      customerRecord = await findCustomerByAnyId(orgId, customerId);
      if (customerRecord) {
        customerName = (customerRecord as any).displayName || (customerRecord as any).name || (customerRecord as any).companyName || customerName;
      }
    } catch (e) {
      // ignore
    }
  }

  if (!customerRecord) {
    try {
      customerRecord = await findCustomerByAnyId(orgId, customerId);
    } catch (e) {
      customerRecord = null;
    }
  }

  if (!customerRecord) {
    return res.status(404).json({ success: false, message: "Customer not found", data: null });
  }

  const billingAddress = normalizeAddressSnapshot(req.body?.billingAddress || customerRecord?.billingAddress);
  const shippingAddress = normalizeAddressSnapshot(req.body?.shippingAddress || customerRecord?.shippingAddress);
  if (!billingAddress && !shippingAddress) {
    return res.status(400).json({
      success: false,
      message: "Customer must have at least one address before creating a quote",
      data: null
    });
  }

  const financialFields = normalizeQuoteFinancialFields(req.body);
  const payload: any = {
    organizationId: orgId,
    ...req.body,
    ...financialFields,
    customerName,
    billingAddress,
    shippingAddress,
    quoteDate: asDate(req.body?.quoteDate) || new Date(),
    expiryDate: asDate(req.body?.expiryDate)
  };

  try {
    const created = await Quote.create(payload);
    await recordEvent('quote_created', { quote: created || null }, 'user');
    return res.status(201).json({ success: true, data: normalizeRow(created.toObject()) });
  } catch (e: any) {
    if (e?.code === 11000) {
      return res.status(409).json({ success: false, message: "Quote number already exists", data: null });
    }
    return res.status(500).json({ success: false, message: e.message || "Failed to create quote", data: null });
  }
};

export const updateQuote: express.RequestHandler = async (req, res) => {
  const orgId = requireOrgId(req, res);
  if (!orgId) return;

  const id = String(req.params.id || "").trim();
  if (!id) return res.status(400).json({ success: false, message: "Invalid id", data: null });

  const patch: any = {
    ...req.body,
    ...normalizeQuoteFinancialFields(req.body),
  };
  if (patch.quoteDate) patch.quoteDate = asDate(patch.quoteDate);
  if (patch.expiryDate) patch.expiryDate = asDate(patch.expiryDate);
  if (patch.billingAddress !== undefined) patch.billingAddress = normalizeAddressSnapshot(patch.billingAddress);
  if (patch.shippingAddress !== undefined) patch.shippingAddress = normalizeAddressSnapshot(patch.shippingAddress);

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

  const updated: any = await Quote.findOneAndUpdate({ _id: id, organizationId: orgId }, { $set: patch }, { new: true })
    .lean();
  if (!updated) return res.status(404).json({ success: false, message: "Quote not found", data: null });

  return res.json({ success: true, data: normalizeRow(updated) });
};

export const deleteQuote: express.RequestHandler = async (req, res) => {
  const orgId = requireOrgId(req, res);
  if (!orgId) return;

  const id = String(req.params.id || "").trim();
  const deleted = await Quote.findOneAndDelete({ _id: id, organizationId: orgId }).lean();
  if (deleted) await recordEvent("quote_deleted", { quote: deleted }, "user");
  if (!deleted) return res.status(404).json({ success: false, message: "Quote not found", data: null });
  return res.json({ success: true, data: { id } });
};

export const bulkDeleteQuotes: express.RequestHandler = async (req, res) => {
  const orgId = requireOrgId(req, res);
  if (!orgId) return;

  const ids = Array.isArray(req.body?.ids) ? (req.body.ids as unknown[]) : [];
  const objectIds = ids
    .filter((id) => mongoose.isValidObjectId(id))
    .map((id) => new mongoose.Types.ObjectId(String(id)));

  if (!objectIds.length) return res.json({ success: true, data: { ids: [] } });

  await Quote.deleteMany({ organizationId: orgId, _id: { $in: objectIds } });
  return res.json({ success: true, data: { ids: objectIds.map((id) => String(id)) } });
};

export const getNextQuoteNumber: express.RequestHandler = async (req, res) => {
  const orgId = requireOrgId(req, res);
  if (!orgId) return;

  const prefix = asString(req.query.prefix || "QT-");
  const last = await Quote.findOne({ organizationId: orgId, quoteNumber: new RegExp(`^${prefix}`) })
    .sort({ quoteNumber: -1 })
    .lean();

  let nextNo = 1;
  if (last) {
    const digits = last.quoteNumber.match(/\d+$/);
    if (digits) {
      nextNo = parseInt(digits[0]) + 1;
    }
  }

  const nextNumber = `${prefix}${String(nextNo).padStart(6, "0")}`;
  return res.json({ success: true, data: { nextNumber } });
};

export const sendQuoteEmail: express.RequestHandler = async (req, res) => {
  const orgId = requireOrgId(req, res);
  if (!orgId) return;

  const id = String(req.params.id || "").trim();
  if (!id) return res.status(400).json({ success: false, message: "Invalid quote id", data: null });

  const quote: any = await Quote.findOne({ _id: id, organizationId: orgId }).lean();
  if (!quote) return res.status(404).json({ success: false, message: "Quote not found", data: null });

  const to = normalizeEmail(req.body?.to);
  if (!to || !to.includes("@")) {
    return res.status(400).json({ success: false, message: "Recipient email is required", data: null });
  }

  const sender = await pickSmtpSender(orgId);
  if (!sender) {
    return res.status(400).json({
      success: false,
      message: "SMTP sender is not configured. Go to Settings > Emails > New Sender and add SMTP Host/User/Password.",
      data: null,
    });
  }

  const org: any = await Organization.findById(orgId).lean();
  const orgName = String(org?.name || "Organization");
  const senderEmail = String(sender.email || "").trim();
  const senderName = String(sender.name || orgName || "Organization").trim() || orgName;
  const fromHeaderRaw = String(req.body?.from || "").trim();
  const fromHeader = senderEmail
    ? `${senderName} <${senderEmail}>`
    : fromHeaderRaw && fromHeaderRaw.includes("@")
      ? fromHeaderRaw
      : fromHeaderRaw;

  const subject = String(req.body?.subject || `Quote ${quote.quoteNumber || ""}`).trim();
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
      const cid = `quote_${Date.now()}_${index}`;
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

  await Quote.updateOne({ _id: id, organizationId: orgId }, { $set: { status: "Sent" } });

  return res.json({ success: true, data: { id, status: "Sent" } });
};
