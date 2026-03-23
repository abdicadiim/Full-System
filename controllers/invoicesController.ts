import type express from "express";
import mongoose from "mongoose";
import { Invoice } from "../models/Invoice.js";

const asString = (v: unknown) => (typeof v === "string" ? v : "");
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

  let row: any = await Invoice.findOne({ _id: id, organizationId: orgId }).lean();
  if (!row) return res.status(404).json({ success: false, message: "Invoice not found", data: null });

  if (row.customerId) {
    try {
      const cust = await mongoose.model("Customer").findOne({ _id: row.customerId, organizationId: orgId }).lean();
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
      const cust = await mongoose.model("Customer").findOne({ _id: customerId, organizationId: orgId }).lean();
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
      const cust = await mongoose.model("Customer").findOne({ _id: patch.customerId, organizationId: orgId }).lean();
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

