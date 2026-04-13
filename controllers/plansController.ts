import type express from "express";
import mongoose from "mongoose";
import { Plan } from "../models/Plan.js";
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

const normalizeRow = (row: any) => {
  if (!row) return row;
  return {
    ...row,
    id: String(row._id),
    comments: normalizePlanComments(row.comments),
  };
};

const normalizePlanComment = (comment: any, index = 0) => {
  if (!comment || typeof comment !== "object") {
    return null;
  }
  const id = String(comment.id || comment._id || `comment-${index}-${Date.now()}`).trim();
  if (!id) return null;
  const content = asString(comment.content ?? comment.text).trim();
  return {
    id,
    content,
    text: asString(comment.text ?? comment.content).trim(),
    createdAt: asString(comment.createdAt).trim() || new Date().toISOString(),
    authorName: asString(comment.authorName).trim(),
    authorInitial: asString(comment.authorInitial).trim(),
  };
};

const normalizePlanComments = (comments: any) =>
  Array.isArray(comments) ? comments.map((comment, index) => normalizePlanComment(comment, index)).filter(Boolean) : [];

const escapeRegex = (input: string) => input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const resolveProductForOrg = async (orgId: string, body: any) => {
  const rawProductId = String(body?.productId || "").trim();
  const rawProductName = asString(body?.product).trim();

  if (rawProductId) {
    if (!mongoose.isValidObjectId(rawProductId)) {
      return { ok: false as const, message: "Invalid productId" };
    }
    const product = await Product.findOne({ _id: rawProductId, organizationId: orgId }).select({ _id: 1, name: 1 }).lean();
    if (!product) return { ok: false as const, message: "Product not found" };
    return { ok: true as const, productId: String(product._id), productName: String(product.name) };
  }

  if (!rawProductName) return { ok: false as const, message: "Product is required" };

  const product = await Product.findOne({ organizationId: orgId, name: new RegExp(`^${escapeRegex(rawProductName)}$`, "i") })
    .select({ _id: 1, name: 1 })
    .lean();
  if (!product) return { ok: false as const, message: "Invalid product" };
  return { ok: true as const, productId: String(product._id), productName: String(product.name) };
};

export const listPlans: express.RequestHandler = async (req, res) => {
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
    filter.$or = [{ planName: re }, { planCode: re }, { product: re }, { planDescription: re }];
  }

  const total = await Plan.countDocuments(filter);
  let query = Plan.find(filter).sort({ createdAt: -1 });
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

export const getPlanById: express.RequestHandler = async (req, res) => {
  const orgId = requireOrgId(req, res);
  if (!orgId) return;

  const id = String(req.params.id || "").trim();
  if (!id) return res.status(400).json({ success: false, message: "Invalid plan id", data: null });

  const row = await Plan.findOne({ _id: id, organizationId: orgId }).lean();
  if (!row) return res.status(404).json({ success: false, message: "Plan not found", data: null });
  return res.json({ success: true, data: normalizeRow(row) });
};

export const createPlan: express.RequestHandler = async (req, res) => {
  const orgId = requireOrgId(req, res);
  if (!orgId) return;

  const planName = asString(req.body?.planName ?? req.body?.plan).trim();
  const planCode = asString(req.body?.planCode ?? req.body?.code).trim();
  const price = Number(req.body?.price ?? 0);

  const productResolved = await resolveProductForOrg(orgId, req.body);
  if (!productResolved.ok) return res.status(400).json({ success: false, message: productResolved.message, data: null });
  if (!planName) return res.status(400).json({ success: false, message: "Plan Name is required", data: null });
  if (!planCode) return res.status(400).json({ success: false, message: "Plan Code is required", data: null });
  if (!Number.isFinite(price) || price <= 0) {
    return res.status(400).json({ success: false, message: "Price must be greater than 0", data: null });
  }

  const payload: any = {
    organizationId: orgId,
    productId: productResolved.productId,
    product: productResolved.productName.slice(0, 220),
    planName: planName.slice(0, 220),
    planCode: planCode.slice(0, 100),
    status: asString(req.body?.status).trim() || "Active",
    billingFrequencyValue: asString(req.body?.billingFrequencyValue).trim().slice(0, 20) || "1",
    billingFrequencyPeriod: asString(req.body?.billingFrequencyPeriod).trim().slice(0, 40) || "Month(s)",
    billingCyclesType: asString(req.body?.billingCyclesType).trim().slice(0, 60) || "Auto-renews until canceled",
    billingCyclesCount: asString(req.body?.billingCyclesCount).trim().slice(0, 20),
    planDescription: asString(req.body?.planDescription ?? req.body?.description).trim().slice(0, 5000),
    pricingModel: asString(req.body?.pricingModel ?? req.body?.pricingScheme).trim().slice(0, 40) || "Per Unit",
    unitName: asString(req.body?.unitName).trim().slice(0, 60),
    price,
    freeTrialDays: Number(req.body?.freeTrialDays ?? req.body?.trialDays ?? 0) || 0,
    setupFee: Number(req.body?.setupFee ?? 0) || 0,
    type: asString(req.body?.type).trim().slice(0, 30) || "Service",
    salesTax: asString(req.body?.salesTax ?? req.body?.taxName).trim().slice(0, 120),
    widgetsPreference: Boolean(req.body?.widgetsPreference ?? false),
    showInPortal: Boolean(req.body?.showInPortal ?? false),
    planFeatures: Array.isArray(req.body?.planFeatures) ? req.body.planFeatures : [],
    planChange: Boolean(req.body?.planChange ?? false),
    planAccount: asString(req.body?.planAccount).trim().slice(0, 120) || "Sales",
    setupFeeAccount: asString(req.body?.setupFeeAccount).trim().slice(0, 120) || "Sales",
    image: asString(req.body?.image).trim().slice(0, 2_000_000),
    comments: normalizePlanComments(req.body?.comments),
    reportingTagValues: req.body?.reportingTagValues && typeof req.body.reportingTagValues === "object" ? req.body.reportingTagValues : {},
  };

  try {
    const created = await Plan.create(payload);
    return res.status(201).json({ success: true, data: normalizeRow(created.toObject()) });
  } catch (e: any) {
    if (e?.code === 11000) {
      return res.status(409).json({ success: false, message: "Plan code already exists", data: null });
    }
    return res.status(500).json({ success: false, message: "Failed to create plan", data: null });
  }
};

export const updatePlan: express.RequestHandler = async (req, res) => {
  const orgId = requireOrgId(req, res);
  if (!orgId) return;

  const id = String(req.params.id || "").trim();
  if (!id) return res.status(400).json({ success: false, message: "Invalid plan id", data: null });

  const patch: any = {};
  const setString = (key: string, max: number) => {
    if (typeof req.body?.[key] === "string") patch[key] = asString(req.body[key]).trim().slice(0, max);
  };

  setString("planName", 220);
  setString("planCode", 100);
  setString("status", 40);
  setString("billingFrequencyValue", 20);
  setString("billingFrequencyPeriod", 40);
  setString("billingCyclesType", 60);
  setString("billingCyclesCount", 20);
  setString("planDescription", 5000);
  setString("pricingModel", 40);
  setString("unitName", 60);
  setString("type", 30);
  setString("salesTax", 120);
  setString("planAccount", 120);
  setString("setupFeeAccount", 120);

  if (typeof req.body?.price !== "undefined") {
    const v = Number(req.body.price);
    if (!Number.isFinite(v) || v <= 0) return res.status(400).json({ success: false, message: "Invalid price", data: null });
    patch.price = v;
  }
  if (typeof req.body?.freeTrialDays !== "undefined") patch.freeTrialDays = Number(req.body.freeTrialDays) || 0;
  if (typeof req.body?.setupFee !== "undefined") patch.setupFee = Number(req.body.setupFee) || 0;
  if (typeof req.body?.widgetsPreference === "boolean") patch.widgetsPreference = req.body.widgetsPreference;
  if (typeof req.body?.showInPortal === "boolean") patch.showInPortal = req.body.showInPortal;
  if (typeof req.body?.planChange === "boolean") patch.planChange = req.body.planChange;
  if (typeof req.body?.image === "string") patch.image = asString(req.body.image).trim().slice(0, 2_000_000);
  if (Array.isArray(req.body?.planFeatures)) patch.planFeatures = req.body.planFeatures;
  if (Array.isArray(req.body?.comments)) patch.comments = normalizePlanComments(req.body.comments);
  if (req.body?.reportingTagValues && typeof req.body.reportingTagValues === "object") patch.reportingTagValues = req.body.reportingTagValues;

  if (typeof req.body?.productId !== "undefined" || typeof req.body?.product !== "undefined") {
    const productResolved = await resolveProductForOrg(orgId, req.body);
    if (!productResolved.ok) return res.status(400).json({ success: false, message: productResolved.message, data: null });
    patch.productId = productResolved.productId;
    patch.product = productResolved.productName.slice(0, 220);
  }

  const updated: any = await Plan.findOneAndUpdate({ _id: id, organizationId: orgId }, { $set: patch }, { new: true }).lean();
  if (!updated) return res.status(404).json({ success: false, message: "Plan not found", data: null });
  return res.json({ success: true, data: normalizeRow(updated) });
};

export const deletePlan: express.RequestHandler = async (req, res) => {
  const orgId = requireOrgId(req, res);
  if (!orgId) return;

  const id = String(req.params.id || "").trim();
  if (!id) return res.status(400).json({ success: false, message: "Invalid plan id", data: null });

  const deleted = await Plan.findOneAndDelete({ _id: id, organizationId: orgId }).lean();
  if (!deleted) return res.status(404).json({ success: false, message: "Plan not found", data: null });
  await recordDeletion({
    organizationId: orgId,
    resourceId: "plans.list",
    documentId: id,
  });
  return res.json({ success: true, data: { id } });
};

export const bulkCreatePlans: express.RequestHandler = async (req, res) => {
  const orgId = requireOrgId(req, res);
  if (!orgId) return;

  const input = Array.isArray(req.body) ? req.body : req.body?.rows;
  if (!Array.isArray(input)) {
    return res.status(400).json({ success: false, message: "Expected an array of plans (or { rows: [...] })", data: null });
  }

  const products = await Product.find({ organizationId: orgId }).select({ _id: 1, name: 1 }).lean();
  const byId = new Map<string, { id: string; name: string }>();
  const byName = new Map<string, { id: string; name: string }>();
  products.forEach((p: any) => {
    const id = String(p?._id || "").trim();
    const name = String(p?.name || "").trim();
    if (!id || !name) return;
    byId.set(id.toLowerCase(), { id, name });
    byName.set(name.toLowerCase(), { id, name });
  });

  const invalid: { index: number; message: string }[] = [];
  const prepared: any[] = [];
  const seenPlanCodes = new Set<string>();

  input.forEach((row, index) => {
    const planName = asString(row?.planName ?? row?.plan).trim();
    const planCode = asString(row?.planCode ?? row?.code).trim();
    const price = Number(row?.price ?? 0);
    if (!planName) {
      invalid.push({ index, message: "Plan Name is required" });
      return;
    }
    if (!planCode) {
      invalid.push({ index, message: "Plan Code is required" });
      return;
    }
    if (!Number.isFinite(price) || price <= 0) {
      invalid.push({ index, message: "Price must be greater than 0" });
      return;
    }

    const rawProductId = String(row?.productId || "").trim();
    const rawProductName = asString(row?.product).trim();
    let productId = "";
    let productName = "";
    if (rawProductId) {
      const matched = byId.get(rawProductId.toLowerCase());
      if (!matched) {
        invalid.push({ index, message: "Invalid productId" });
        return;
      }
      productId = matched.id;
      productName = matched.name;
    } else if (rawProductName) {
      const matched = byName.get(rawProductName.toLowerCase());
      if (!matched) {
        invalid.push({ index, message: "Invalid product" });
        return;
      }
      productId = matched.id;
      productName = matched.name;
    } else {
      invalid.push({ index, message: "Product is required" });
      return;
    }

    const codeKey = planCode.toLowerCase();
    if (seenPlanCodes.has(codeKey)) {
      invalid.push({ index, message: `Duplicate plan code in import: ${planCode}` });
      return;
    }
    seenPlanCodes.add(codeKey);

    prepared.push({
      organizationId: orgId,
      productId,
      product: productName.slice(0, 220),
      planName: planName.slice(0, 220),
      planCode: planCode.slice(0, 100),
      status: asString(row?.status).trim() || "Active",
      billingFrequencyValue: asString(row?.billingFrequencyValue).trim().slice(0, 20) || "1",
      billingFrequencyPeriod: asString(row?.billingFrequencyPeriod).trim().slice(0, 40) || "Month(s)",
      billingCyclesType: asString(row?.billingCyclesType).trim().slice(0, 60) || "Auto-renews until canceled",
      billingCyclesCount: asString(row?.billingCyclesCount).trim().slice(0, 20),
      planDescription: asString(row?.planDescription ?? row?.description).trim().slice(0, 5000),
      pricingModel: asString(row?.pricingModel ?? row?.pricingScheme).trim().slice(0, 40) || "Per Unit",
      unitName: asString(row?.unitName).trim().slice(0, 60),
      price,
      freeTrialDays: Number(row?.freeTrialDays ?? row?.trialDays ?? 0) || 0,
      setupFee: Number(row?.setupFee ?? 0) || 0,
      type: asString(row?.type).trim().slice(0, 30) || "Service",
      salesTax: asString(row?.salesTax ?? row?.taxName).trim().slice(0, 120),
      widgetsPreference: Boolean(row?.widgetsPreference ?? false),
      showInPortal: Boolean(row?.showInPortal ?? false),
      planFeatures: Array.isArray(row?.planFeatures) ? row.planFeatures : [],
      planChange: Boolean(row?.planChange ?? false),
      planAccount: asString(row?.planAccount).trim().slice(0, 120) || "Sales",
      setupFeeAccount: asString(row?.setupFeeAccount).trim().slice(0, 120) || "Sales",
      image: asString(row?.image).trim().slice(0, 2_000_000),
      comments: normalizePlanComments(row?.comments),
      reportingTagValues: row?.reportingTagValues && typeof row.reportingTagValues === "object" ? row.reportingTagValues : {},
    });
  });

  if (prepared.length === 0) {
    return res.status(400).json({ success: false, message: "No valid plans to import", data: { invalid } });
  }

  const existing = await Plan.find({ organizationId: orgId }).select({ planCode: 1 }).lean();
  const existingSet = new Set(existing.map((p: any) => String(p?.planCode || "").toLowerCase()));
  const filtered = prepared.filter((p) => !existingSet.has(String(p.planCode || "").toLowerCase()));
  const skippedExisting = prepared.length - filtered.length;

  if (filtered.length === 0) {
    return res.status(409).json({ success: false, message: "All plan codes already exist", data: { insertedCount: 0, skippedExisting, invalid } });
  }

  try {
    const insertedDocs = await Plan.insertMany(filtered, { ordered: false });
    return res.status(201).json({
      success: true,
      data: {
        insertedCount: insertedDocs.length,
        skippedExisting,
        invalid,
        inserted: insertedDocs.map((d: any) => normalizeRow(d.toObject ? d.toObject() : d)),
      },
    });
  } catch (e: any) {
    const insertedDocs = Array.isArray(e?.insertedDocs) ? e.insertedDocs : [];
    const writeErrors = Array.isArray(e?.writeErrors) ? e.writeErrors : [];
    return res.status(207).json({
      success: true,
      data: {
        insertedCount: insertedDocs.length,
        skippedExisting,
        skippedDuplicates: writeErrors.length,
        invalid,
        inserted: insertedDocs.map((d: any) => normalizeRow(d.toObject ? d.toObject() : d)),
      },
    });
  }
};
