import type express from "express";
import mongoose from "mongoose";
import { PriceList } from "../models/PriceList.js";
import { recordDeletion } from "../services/syncTombstoneService.js";

const asString = (v: unknown) => (typeof v === "string" ? v : "");
const asNumber = (v: unknown) => (typeof v === "number" ? v : null);
const asBool = (v: unknown) => (typeof v === "boolean" ? v : false);

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

export const listPriceLists: express.RequestHandler = async (req, res) => {
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

  const total = await PriceList.countDocuments(filter);
  let query = PriceList.find(filter).sort({ createdAt: -1 });
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

export const getPriceListById: express.RequestHandler = async (req, res) => {
  const orgId = requireOrgId(req, res);
  if (!orgId) return;

  const id = String(req.params.id || "").trim();
  if (!id) return res.status(400).json({ success: false, message: "Invalid id", data: null });

  const row = await PriceList.findOne({ _id: id, organizationId: orgId }).lean();
  if (!row) return res.status(404).json({ success: false, message: "Price List not found", data: null });
  return res.json({ success: true, data: normalizeRow(row) });
};

export const createPriceList: express.RequestHandler = async (req, res) => {
  const orgId = requireOrgId(req, res);
  if (!orgId) return;

  const name = asString(req.body?.name).trim();
  if (!name) return res.status(400).json({ success: false, message: "Name is required", data: null });

  const payload: any = {
    organizationId: orgId,
    name: name.slice(0, 220),
    description: asString(req.body?.description).trim(),
    status: asString(req.body?.status).trim() || "Active",
    currency: asString(req.body?.currency).trim() || "USD",
    priceListType: asString(req.body?.priceListType).trim() || "Sales",
    pricingScheme: asString(req.body?.pricingScheme).trim() || "Unit",
    discountEnabled: asBool(req.body?.discountEnabled),
    roundOffTo: asString(req.body?.roundOffTo).trim() || "Never mind",
    markup: asString(req.body?.markup).trim() || "1%",
    markupType: asString(req.body?.markupType).trim() || "Markup",
    itemRates: Array.isArray(req.body?.itemRates) ? req.body.itemRates : [],
    productRates: Array.isArray(req.body?.productRates) ? req.body.productRates : []
  };

  try {
    const created = await PriceList.create(payload);
    return res.status(201).json({ success: true, data: normalizeRow(created.toObject()) });
  } catch (e: any) {
    if (e?.code === 11000) {
      return res.status(409).json({ success: false, message: "Price list name already exists", data: null });
    }
    return res.status(500).json({ success: false, message: "Failed to create price list", data: null });
  }
};

export const updatePriceList: express.RequestHandler = async (req, res) => {
  const orgId = requireOrgId(req, res);
  if (!orgId) return;

  const id = String(req.params.id || "").trim();
  if (!id) return res.status(400).json({ success: false, message: "Invalid id", data: null });

  const patch: any = {};
  if (typeof req.body?.name === "string") patch.name = asString(req.body.name).trim();
  if (typeof req.body?.description === "string") patch.description = asString(req.body.description).trim();
  if (typeof req.body?.status === "string") patch.status = asString(req.body.status).trim();
  if (typeof req.body?.currency === "string") patch.currency = asString(req.body.currency).trim();
  if (typeof req.body?.priceListType === "string") patch.priceListType = asString(req.body.priceListType).trim();
  if (typeof req.body?.pricingScheme === "string") patch.pricingScheme = asString(req.body.pricingScheme).trim();
  if (typeof req.body?.discountEnabled === "boolean") patch.discountEnabled = asBool(req.body.discountEnabled);
  if (typeof req.body?.roundOffTo === "string") patch.roundOffTo = asString(req.body.roundOffTo).trim();
  if (typeof req.body?.markup === "string") patch.markup = asString(req.body.markup).trim();
  if (typeof req.body?.markupType === "string") patch.markupType = asString(req.body.markupType).trim();
  if (Array.isArray(req.body?.itemRates)) patch.itemRates = req.body.itemRates;
  if (Array.isArray(req.body?.productRates)) patch.productRates = req.body.productRates;

  const updated: any = await PriceList.findOneAndUpdate({ _id: id, organizationId: orgId }, { $set: patch }, { new: true })
    .lean();
  if (!updated) return res.status(404).json({ success: false, message: "Price List not found", data: null });

  return res.json({ success: true, data: normalizeRow(updated) });
};

export const deletePriceList: express.RequestHandler = async (req, res) => {
  const orgId = requireOrgId(req, res);
  if (!orgId) return;

  const id = String(req.params.id || "").trim();
  if (!id) return res.status(400).json({ success: false, message: "Invalid id", data: null });

  const deleted = await PriceList.findOneAndDelete({ _id: id, organizationId: orgId }).lean();
  if (!deleted) return res.status(404).json({ success: false, message: "Price List not found", data: null });
  await recordDeletion({
    organizationId: orgId,
    resourceId: "price-lists.list",
    documentId: id,
  });
  return res.json({ success: true, data: { id } });
};
