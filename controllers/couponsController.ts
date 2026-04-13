import type express from "express";
import mongoose from "mongoose";
import { Coupon } from "../models/Coupon.js";
import { Product } from "../models/Product.js";
import { recordDeletion } from "../services/syncTombstoneService.js";

const asString = (v: unknown) => (typeof v === "string" ? v : "");

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

const escapeRegex = (input: string) => input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

type ProductLookup = {
  byId: Map<string, { id: string; name: string }>;
  byName: Map<string, { id: string; name: string }>;
};

const buildProductLookup = async (orgId: string): Promise<ProductLookup> => {
  const products = await Product.find({ organizationId: orgId }).select({ _id: 1, name: 1 }).lean();
  const byId = new Map<string, { id: string; name: string }>();
  const byName = new Map<string, { id: string; name: string }>();

  products.forEach((p: any) => {
    const id = String(p?._id || "").trim();
    const name = String(p?.name || "").trim();
    if (!id || !name) return;
    const entry = { id, name };
    byId.set(id.toLowerCase(), entry);
    byName.set(name.toLowerCase(), entry);
  });

  return { byId, byName };
};

const resolveCouponProduct = (row: any, productLookup?: ProductLookup) => {
  const rawProduct = asString(row?.product).trim();
  const rawProductId = asString(row?.productId).trim();
  const byId = rawProductId ? productLookup?.byId.get(rawProductId.toLowerCase()) : undefined;
  const byRawProductId = rawProduct ? productLookup?.byId.get(rawProduct.toLowerCase()) : undefined;
  const byName = rawProduct ? productLookup?.byName.get(rawProduct.toLowerCase()) : undefined;
  const productId = byId?.id || byRawProductId?.id || String(row?.productId || "").trim();
  const product = byId?.name || byRawProductId?.name || byName?.name || rawProduct || rawProductId;

  return {
    ...row,
    id: String(row?._id || row?.id || "").trim(),
    ...(productId ? { productId } : {}),
    product,
    productName: product,
  };
};

const toPayload = (orgId: string, body: any, productLookup?: { byId: Map<string, { id: string; name: string }>; byName: Map<string, { id: string; name: string }> }) => {
  const rawProductId = String(body?.productId || "").trim();
  const rawProductName = asString(body?.product).trim();
  const couponName = asString(body?.couponName ?? body?.name).trim();
  const couponCodeRaw = asString(body?.couponCode ?? body?.code).trim();

  let productId = "";
  let productName = "";

  if (rawProductId) {
    const key = rawProductId.toLowerCase();
    const matched = productLookup?.byId.get(key);
    if (matched) {
      productId = matched.id;
      productName = matched.name;
    } else if (mongoose.isValidObjectId(rawProductId)) {
      productId = rawProductId;
    } else {
      return { ok: false as const, message: "Invalid productId" };
    }
  } else if (rawProductName) {
    const key = rawProductName.toLowerCase();
    const matched = productLookup?.byName.get(key);
    if (matched) {
      productId = matched.id;
      productName = matched.name;
    } else {
      productName = rawProductName;
    }
  } else {
    return { ok: false as const, message: "Product is required" };
  }

  if (!couponName) return { ok: false as const, message: "Coupon Name is required" };
  if (!couponCodeRaw) return { ok: false as const, message: "Coupon Code is required" };

  const numericDiscount = Number(body?.discountValue ?? 0);
  const numericCycles = Number(body?.limitedCycles ?? 0);
  const numericMaxRedemption = Number(body?.maxRedemption ?? 0);

  const payload: any = {
    organizationId: orgId,
    ...(productId ? { productId } : {}),
    product: (productName || rawProductName).slice(0, 220),
    couponName: couponName.slice(0, 220),
    couponCode: couponCodeRaw.toUpperCase().slice(0, 100),
    discountType: asString(body?.discountType).trim().slice(0, 40) || "Flat",
    discountValue: Number.isFinite(numericDiscount) ? numericDiscount : 0,
    redemptionType: asString(body?.redemptionType).trim().slice(0, 40) || "One Time",
    limitedCycles: Number.isFinite(numericCycles) ? numericCycles : 0,
    maxRedemption: Number.isFinite(numericMaxRedemption) ? numericMaxRedemption : 0,
    associatedPlans: asString(body?.associatedPlans ?? body?.associatePlans).trim().slice(0, 2000) || "All Plans",
    associatedAddons: asString(body?.associatedAddons ?? body?.associateAddons).trim().slice(0, 2000) || "All Addons",
    expirationDate: asString(body?.expirationDate).trim().slice(0, 40),
    status: asString(body?.status).trim().slice(0, 40) || "Active",
  };

  return { ok: true as const, payload };
};

export const listCoupons: express.RequestHandler = async (req, res) => {
  const orgId = requireOrgId(req, res);
  if (!orgId) return;

  const q = asString(req.query.search ?? req.query.q).trim();
  const status = asString(req.query.status).trim();
  const product = asString(req.query.product).trim();
  const productId = asString(req.query.productId).trim();
  const limit = Math.max(0, Number(req.query.limit || 0));
  const page = Math.max(1, Number(req.query.page || 1));

  const filter: any = { organizationId: orgId };
  if (status) filter.status = new RegExp(`^${status}$`, "i");
  if (productId) {
    if (!mongoose.isValidObjectId(productId)) return res.status(400).json({ success: false, message: "Invalid productId", data: null });
    filter.productId = productId;
  } else if (product) {
    filter.product = new RegExp(`^${escapeRegex(product)}$`, "i");
  }
  if (q) {
    const re = new RegExp(escapeRegex(q), "i");
    filter.$or = [{ couponName: re }, { couponCode: re }, { product: re }];
  }

  const total = await Coupon.countDocuments(filter);
  let query = Coupon.find(filter).sort({ createdAt: -1 });
  if (limit > 0) query = query.skip((page - 1) * limit).limit(limit);
  const rows = await query.lean();
  const productLookup = await buildProductLookup(orgId);

  return res.json({
    success: true,
    data: rows.map((row) => resolveCouponProduct(normalizeRow(row), productLookup)),
    pagination: {
      total,
      page,
      limit: limit || total,
      pages: limit > 0 ? Math.max(1, Math.ceil(total / limit)) : 1,
    },
  });
};

export const getCouponById: express.RequestHandler = async (req, res) => {
  const orgId = requireOrgId(req, res);
  if (!orgId) return;

  const id = String(req.params.id || "").trim();
  if (!id) return res.status(400).json({ success: false, message: "Invalid coupon id", data: null });

  const row = await Coupon.findOne({ _id: id, organizationId: orgId }).lean();
  if (!row) return res.status(404).json({ success: false, message: "Coupon not found", data: null });
  const productLookup = await buildProductLookup(orgId);
  return res.json({ success: true, data: resolveCouponProduct(normalizeRow(row), productLookup) });
};

export const createCoupon: express.RequestHandler = async (req, res) => {
  const orgId = requireOrgId(req, res);
  if (!orgId) return;

  const productLookup = await buildProductLookup(orgId);
  const parsed = toPayload(orgId, req.body, productLookup);
  if (!parsed.ok) return res.status(400).json({ success: false, message: parsed.message, data: null });
  if (!parsed.payload?.productId) return res.status(400).json({ success: false, message: "Invalid product", data: null });

  try {
    const created = await Coupon.create(parsed.payload);
    return res.status(201).json({ success: true, data: resolveCouponProduct(normalizeRow(created.toObject()), productLookup) });
  } catch (e: any) {
    if (e?.code === 11000) return res.status(409).json({ success: false, message: "Coupon code already exists", data: null });
    return res.status(500).json({ success: false, message: "Failed to create coupon", data: null });
  }
};

export const bulkCreateCoupons: express.RequestHandler = async (req, res) => {
  const orgId = requireOrgId(req, res);
  if (!orgId) return;

  const input = Array.isArray(req.body) ? req.body : req.body?.rows;
  if (!Array.isArray(input)) {
    return res.status(400).json({ success: false, message: "Expected an array of coupons (or { rows: [...] })", data: null });
  }

  const productLookup = await buildProductLookup(orgId);

  const invalid: { index: number; message: string }[] = [];
  const prepared: any[] = [];
  const seenCodes = new Set<string>();

  input.forEach((row, index) => {
    const parsed = toPayload(orgId, row, productLookup);
    if (!parsed.ok) {
      invalid.push({ index, message: parsed.message });
      return;
    }
    if (!parsed.payload?.productId) {
      invalid.push({ index, message: "Invalid product" });
      return;
    }
    const code = String(parsed.payload.couponCode || "").toUpperCase();
    if (!code) {
      invalid.push({ index, message: "Coupon Code is required" });
      return;
    }
    if (seenCodes.has(code)) {
      invalid.push({ index, message: `Duplicate coupon code in import: ${code}` });
      return;
    }
    seenCodes.add(code);
    prepared.push(parsed.payload);
  });

  if (prepared.length === 0) {
    return res.status(400).json({ success: false, message: "No valid coupons to import", data: { invalid } });
  }

  const codes = prepared.map((p) => String(p.couponCode || "").toUpperCase());
  const existing = await Coupon.find({ organizationId: orgId, couponCode: { $in: codes } })
    .select({ couponCode: 1 })
    .lean();
  const existingSet = new Set(existing.map((r: any) => String(r?.couponCode || "").toUpperCase()));
  const filtered = prepared.filter((p) => !existingSet.has(String(p.couponCode || "").toUpperCase()));
  const skippedExisting = prepared.length - filtered.length;

  if (filtered.length === 0) {
    return res.status(409).json({
      success: false,
      message: "All coupon codes already exist",
      data: { insertedCount: 0, skippedExisting, invalid },
    });
  }

  try {
    const insertedDocs = await Coupon.insertMany(filtered, { ordered: false });
    return res.status(201).json({
      success: true,
      data: {
        insertedCount: insertedDocs.length,
        skippedExisting,
        invalid,
        inserted: insertedDocs.map((d: any) => resolveCouponProduct(normalizeRow(d.toObject ? d.toObject() : d), productLookup)),
      },
    });
  } catch (e: any) {
    const insertedDocs = Array.isArray(e?.insertedDocs) ? e.insertedDocs : [];
    const insertedCount = insertedDocs.length;
    const writeErrors = Array.isArray(e?.writeErrors) ? e.writeErrors : [];
    const skippedDuplicates = writeErrors.length;

    return res.status(207).json({
      success: true,
      data: {
        insertedCount,
        skippedExisting,
        skippedDuplicates,
        invalid,
        inserted: insertedDocs.map((d: any) => resolveCouponProduct(normalizeRow(d.toObject ? d.toObject() : d), productLookup)),
      },
    });
  }
};

export const updateCoupon: express.RequestHandler = async (req, res) => {
  const orgId = requireOrgId(req, res);
  if (!orgId) return;

  const id = String(req.params.id || "").trim();
  if (!id) return res.status(400).json({ success: false, message: "Invalid coupon id", data: null });

  const existing = await Coupon.findOne({ _id: id, organizationId: orgId }).lean();
  if (!existing) return res.status(404).json({ success: false, message: "Coupon not found", data: null });

  const productLookup = await buildProductLookup(orgId);
  const parsed = toPayload(orgId, { ...existing, ...req.body }, productLookup);
  if (!parsed.ok) return res.status(400).json({ success: false, message: parsed.message, data: null });

  const updated: any = await Coupon.findOneAndUpdate(
    { _id: id, organizationId: orgId },
    { $set: { ...parsed.payload, updatedAt: new Date().toISOString() } },
    { new: true }
  ).lean();
  if (!updated) return res.status(404).json({ success: false, message: "Coupon not found", data: null });
  return res.json({ success: true, data: resolveCouponProduct(normalizeRow(updated), productLookup) });
};

export const deleteCoupon: express.RequestHandler = async (req, res) => {
  const orgId = requireOrgId(req, res);
  if (!orgId) return;

  const id = String(req.params.id || "").trim();
  if (!id) return res.status(400).json({ success: false, message: "Invalid coupon id", data: null });

  const deleted = await Coupon.findOneAndDelete({ _id: id, organizationId: orgId }).lean();
  if (!deleted) return res.status(404).json({ success: false, message: "Coupon not found", data: null });
  await recordDeletion({
    organizationId: orgId,
    resourceId: "coupons.list",
    documentId: id,
  });
  return res.json({ success: true, data: { id } });
};
