import type express from "express";
import mongoose from "mongoose";
import { Quote } from "../models/Quote.js";

const asString = (v: unknown) => (typeof v === "string" ? v : "");
const asNumber = (v: unknown) => (typeof v === "number" ? v : 0);
const asDate = (v: unknown) => (v ? new Date(String(v)) : null);

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
  return { ...row, id: String(row._id) };
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

  const total = await Quote.countDocuments(filter);
  let query = Quote.find(filter).sort({ createdAt: -1 });
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

export const getQuoteById: express.RequestHandler = async (req, res) => {
  const orgId = requireOrgId(req, res);
  if (!orgId) return;

  const id = String(req.params.id || "").trim();
  if (!id) return res.status(400).json({ success: false, message: "Invalid id", data: null });

  const row = await Quote.findOne({ _id: id, organizationId: orgId }).lean();
  if (!row) return res.status(404).json({ success: false, message: "Quote not found", data: null });
  return res.json({ success: true, data: normalizeRow(row) });
};

export const createQuote: express.RequestHandler = async (req, res) => {
  const orgId = requireOrgId(req, res);
  if (!orgId) return;

  const payload: any = {
    organizationId: orgId,
    ...req.body,
    quoteDate: asDate(req.body?.quoteDate) || new Date(),
    expiryDate: asDate(req.body?.expiryDate)
  };

  try {
    const created = await Quote.create(payload);
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

  const patch = { ...req.body };
  if (patch.quoteDate) patch.quoteDate = asDate(patch.quoteDate);
  if (patch.expiryDate) patch.expiryDate = asDate(patch.expiryDate);

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
  if (!deleted) return res.status(404).json({ success: false, message: "Quote not found", data: null });
  return res.json({ success: true, data: { id } });
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
