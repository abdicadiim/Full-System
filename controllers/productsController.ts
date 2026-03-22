import type express from "express";
import mongoose from "mongoose";
import { Product } from "../models/Product.js";

const asString = (v: unknown) => (typeof v === "string" ? v : "");
const asBool = (v: unknown) => (typeof v === "boolean" ? v : undefined);

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

export const listProducts: express.RequestHandler = async (req, res) => {
  const orgId = requireOrgId(req, res);
  if (!orgId) return;

  const q = asString(req.query.search ?? req.query.q).trim();
  const status = asString(req.query.status).trim();
  const limit = Math.max(0, Number(req.query.limit || 0));
  const page = Math.max(1, Number(req.query.page || 1));

  const filter: any = { organizationId: orgId };
  if (status) filter.status = new RegExp(`^${status}$`, "i");
  if (q) {
    const re = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [{ name: re }, { description: re }];
  }

  const total = await Product.countDocuments(filter);
  let query = Product.find(filter).sort({ createdAt: -1 });
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

export const getProductById: express.RequestHandler = async (req, res) => {
  const orgId = requireOrgId(req, res);
  if (!orgId) return;

  const id = String(req.params.id || "").trim();
  if (!id) return res.status(400).json({ success: false, message: "Invalid product id", data: null });

  const row = await Product.findOne({ _id: id, organizationId: orgId }).lean();
  if (!row) return res.status(404).json({ success: false, message: "Product not found", data: null });
  return res.json({ success: true, data: normalizeRow(row) });
};

export const createProduct: express.RequestHandler = async (req, res) => {
  const orgId = requireOrgId(req, res);
  if (!orgId) return;

  const name = asString(req.body?.name).trim();
  if (!name) return res.status(400).json({ success: false, message: "Name is required", data: null });

  const payload: any = {
    organizationId: orgId,
    name: name.slice(0, 220),
    description: asString(req.body?.description).trim().slice(0, 5000),
    status: asString(req.body?.status).trim() || "Active",
    emailRecipients: asString(req.body?.emailRecipients).trim().slice(0, 1000),
    redirectionUrl: asString(req.body?.redirectionUrl).trim().slice(0, 2000),
    autoGenerateSubscriptionNumbers: Boolean(asBool(req.body?.autoGenerateSubscriptionNumbers) ?? false),
    prefix: asString(req.body?.prefix).trim().slice(0, 30),
    nextNumber: asString(req.body?.nextNumber).trim().slice(0, 30),
  };

  if (!payload.autoGenerateSubscriptionNumbers) {
    payload.prefix = "";
    payload.nextNumber = "";
  }

  try {
    const created = await Product.create(payload);
    return res.status(201).json({ success: true, data: normalizeRow(created.toObject()) });
  } catch (e: any) {
    if (e?.code === 11000) {
      return res.status(409).json({ success: false, message: "Product name already exists", data: null });
    }
    return res.status(500).json({ success: false, message: "Failed to create product", data: null });
  }
};

export const updateProduct: express.RequestHandler = async (req, res) => {
  const orgId = requireOrgId(req, res);
  if (!orgId) return;

  const id = String(req.params.id || "").trim();
  if (!id) return res.status(400).json({ success: false, message: "Invalid product id", data: null });

  const patch: any = {};
  if (typeof req.body?.name === "string") patch.name = asString(req.body.name).trim().slice(0, 220);
  if (typeof req.body?.description === "string") patch.description = asString(req.body.description).trim().slice(0, 5000);
  if (typeof req.body?.status === "string") patch.status = asString(req.body.status).trim().slice(0, 40);
  if (typeof req.body?.emailRecipients === "string") patch.emailRecipients = asString(req.body.emailRecipients).trim().slice(0, 1000);
  if (typeof req.body?.redirectionUrl === "string") patch.redirectionUrl = asString(req.body.redirectionUrl).trim().slice(0, 2000);

  const autoGen = asBool(req.body?.autoGenerateSubscriptionNumbers);
  if (typeof autoGen === "boolean") patch.autoGenerateSubscriptionNumbers = autoGen;
  if (typeof req.body?.prefix === "string") patch.prefix = asString(req.body.prefix).trim().slice(0, 30);
  if (typeof req.body?.nextNumber === "string") patch.nextNumber = asString(req.body.nextNumber).trim().slice(0, 30);

  const updated: any = await Product.findOneAndUpdate({ _id: id, organizationId: orgId }, { $set: patch }, { new: true })
    .lean();
  if (!updated) return res.status(404).json({ success: false, message: "Product not found", data: null });

  if (updated.autoGenerateSubscriptionNumbers !== true) {
    await Product.updateOne({ _id: updated._id }, { $set: { prefix: "", nextNumber: "" } });
    updated.prefix = "";
    updated.nextNumber = "";
  }

  return res.json({ success: true, data: normalizeRow(updated) });
};

export const deleteProduct: express.RequestHandler = async (req, res) => {
  const orgId = requireOrgId(req, res);
  if (!orgId) return;

  const id = String(req.params.id || "").trim();
  if (!id) return res.status(400).json({ success: false, message: "Invalid product id", data: null });

  const deleted = await Product.findOneAndDelete({ _id: id, organizationId: orgId }).lean();
  if (!deleted) return res.status(404).json({ success: false, message: "Product not found", data: null });
  return res.json({ success: true, data: { id } });
};

