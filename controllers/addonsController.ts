import type express from "express";
import mongoose from "mongoose";
import { Addon } from "../models/Addon.js";
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

const normalizePricingModel = (value: unknown) => {
  const text = asString(value).trim().toLowerCase();
  if (text.includes("volume")) return "Volume";
  if (text.includes("tier")) return "Tier";
  if (text.includes("package")) return "Package";
  if (text.includes("flat")) return "Flat";
  if (text.includes("per unit") || text === "unit" || text === "perunit") return "Per Unit";
  return "Per Unit";
};

const normalizeBracketRows = (rows: unknown) => {
  if (!Array.isArray(rows)) return [];
  return rows
    .map((row: any) => ({
      startingQty: String(row?.startingQty ?? row?.startingQuantity ?? "").trim(),
      endingQty: String(row?.endingQty ?? row?.endingQuantity ?? "").trim(),
      price: String(row?.price ?? "").trim(),
    }))
    .filter((row) => row.startingQty || row.endingQty || row.price);
};

const readBracketRows = (body: any) => {
  const rows = normalizeBracketRows(body?.pricingBrackets);
  if (rows.length > 0) return rows;
  return normalizeBracketRows(body?.volumeBrackets);
};

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

export const listAddons: express.RequestHandler = async (req, res) => {
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
    filter.$or = [{ addonName: re }, { addonCode: re }, { product: re }, { description: re }];
  }

  const total = await Addon.countDocuments(filter);
  let query = Addon.find(filter).sort({ createdAt: -1 });
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

export const getAddonById: express.RequestHandler = async (req, res) => {
  const orgId = requireOrgId(req, res);
  if (!orgId) return;

  const id = String(req.params.id || "").trim();
  if (!id) return res.status(400).json({ success: false, message: "Invalid addon id", data: null });

  const row = await Addon.findOne({ _id: id, organizationId: orgId }).lean();
  if (!row) return res.status(404).json({ success: false, message: "Addon not found", data: null });
  return res.json({ success: true, data: normalizeRow(row) });
};

export const createAddon: express.RequestHandler = async (req, res) => {
  const orgId = requireOrgId(req, res);
  if (!orgId) return;

  const addonName = asString(req.body?.addonName ?? req.body?.name).trim();
  const addonCode = asString(req.body?.addonCode ?? req.body?.code).trim();

  const productResolved = await resolveProductForOrg(orgId, req.body);
  if (!productResolved.ok) return res.status(400).json({ success: false, message: productResolved.message, data: null });
  if (!addonName) return res.status(400).json({ success: false, message: "Addon Name is required", data: null });
  if (!addonCode) return res.status(400).json({ success: false, message: "Addon Code is required", data: null });

  const pricingModel = normalizePricingModel(req.body?.pricingModel ?? req.body?.pricingScheme);
  const bracketRows = readBracketRows(req.body);
  const legacyRow =
    bracketRows.length === 0 && (req.body?.startingQuantity !== undefined || req.body?.endingQuantity !== undefined || req.body?.price !== undefined)
      ? [
          {
            startingQty: pricingModel === "Package" ? "" : String(req.body?.startingQuantity ?? "1").trim(),
            endingQty: String(req.body?.endingQuantity ?? (pricingModel === "Package" ? "" : "2")).trim(),
            price: String(req.body?.price ?? "").trim(),
          },
        ]
      : [];
  const pricingRows = bracketRows.length > 0 ? bracketRows : legacyRow;

  const payload: any = {
    organizationId: orgId,
    productId: productResolved.productId,
    product: productResolved.productName.slice(0, 220),
    addonName: addonName.slice(0, 220),
    addonCode: addonCode.slice(0, 100),
    description: asString(req.body?.description).trim().slice(0, 5000),
    status: asString(req.body?.status).trim().slice(0, 40) || "Active",
    addonType: asString(req.body?.addonType ?? req.body?.type).trim().slice(0, 40) || "Recurring",
    pricingModel,
    unit: asString(req.body?.unit ?? req.body?.unitName).trim().slice(0, 60),
    billingFrequency: asString(req.body?.billingFrequency).trim().slice(0, 120),
    startingQuantity: Number(pricingRows[0]?.startingQty ?? req.body?.startingQuantity ?? 0) || 0,
    endingQuantity: Number(pricingRows[0]?.endingQty ?? req.body?.endingQuantity ?? 0) || 0,
    price: Number(pricingRows[0]?.price ?? req.body?.price ?? 0) || 0,
    imageUrl: asString(req.body?.imageUrl).trim().slice(0, 2_000_000),
    account: asString(req.body?.account).trim().slice(0, 120) || "Sales",
    taxName: asString(req.body?.taxName ?? req.body?.salesTax).trim().slice(0, 120),
    associatedPlans: asString(req.body?.associatedPlans ?? req.body?.plan).trim().slice(0, 2000) || "All Plans",
    selectedPlans: Array.isArray(req.body?.selectedPlans) ? req.body.selectedPlans.map((v: any) => String(v || "").trim()).filter(Boolean) : [],
    includeInWidget: Boolean(req.body?.includeInWidget ?? req.body?.showInWidget ?? false),
    showInPortal: Boolean(req.body?.showInPortal ?? false),
    volumeBrackets: pricingRows,
    pricingBrackets: pricingRows,
  };

  try {
    const created = await Addon.create(payload);
    return res.status(201).json({ success: true, data: normalizeRow(created.toObject()) });
  } catch (e: any) {
    if (e?.code === 11000) return res.status(409).json({ success: false, message: "Addon code already exists", data: null });
    return res.status(500).json({ success: false, message: "Failed to create addon", data: null });
  }
};

export const updateAddon: express.RequestHandler = async (req, res) => {
  const orgId = requireOrgId(req, res);
  if (!orgId) return;

  const id = String(req.params.id || "").trim();
  if (!id) return res.status(400).json({ success: false, message: "Invalid addon id", data: null });

  const patch: any = {};
  const setString = (key: string, max: number) => {
    if (typeof req.body?.[key] === "string") patch[key] = asString(req.body[key]).trim().slice(0, max);
  };

  setString("addonName", 220);
  setString("addonCode", 100);
  setString("description", 5000);
  setString("status", 40);
  setString("addonType", 40);
  setString("pricingModel", 40);
  setString("unit", 60);
  setString("billingFrequency", 120);
  setString("imageUrl", 2_000_000);
  setString("account", 120);
  setString("taxName", 120);
  setString("associatedPlans", 2000);

  if (typeof req.body?.pricingModel !== "undefined" || typeof req.body?.pricingScheme !== "undefined") {
    patch.pricingModel = normalizePricingModel(req.body?.pricingModel ?? req.body?.pricingScheme);
  }

  if (typeof req.body?.startingQuantity !== "undefined") patch.startingQuantity = Number(req.body.startingQuantity) || 0;
  if (typeof req.body?.endingQuantity !== "undefined") patch.endingQuantity = Number(req.body.endingQuantity) || 0;
  if (typeof req.body?.price !== "undefined") patch.price = Number(req.body.price) || 0;
  if (typeof req.body?.includeInWidget === "boolean") patch.includeInWidget = req.body.includeInWidget;
  if (typeof req.body?.showInPortal === "boolean") patch.showInPortal = req.body.showInPortal;
  if (Array.isArray(req.body?.selectedPlans)) {
    patch.selectedPlans = req.body.selectedPlans.map((v: any) => String(v || "").trim()).filter(Boolean);
  }
  const bracketRows = readBracketRows(req.body);
  if (bracketRows.length > 0) {
    patch.volumeBrackets = bracketRows;
    patch.pricingBrackets = bracketRows;
    patch.startingQuantity = Number(bracketRows[0]?.startingQty ?? req.body.startingQuantity ?? 0) || 0;
    patch.endingQuantity = Number(bracketRows[0]?.endingQty ?? req.body.endingQuantity ?? 0) || 0;
    if (typeof req.body?.price === "undefined" && typeof bracketRows[0]?.price !== "undefined") {
      patch.price = Number(bracketRows[0]?.price ?? 0) || 0;
    }
  } else {
    if (Array.isArray(req.body?.volumeBrackets)) patch.volumeBrackets = req.body.volumeBrackets;
    if (Array.isArray(req.body?.pricingBrackets)) patch.pricingBrackets = req.body.pricingBrackets;
  }

  if (typeof req.body?.productId !== "undefined" || typeof req.body?.product !== "undefined") {
    const productResolved = await resolveProductForOrg(orgId, req.body);
    if (!productResolved.ok) return res.status(400).json({ success: false, message: productResolved.message, data: null });
    patch.productId = productResolved.productId;
    patch.product = productResolved.productName.slice(0, 220);
  }

  const updated: any = await Addon.findOneAndUpdate({ _id: id, organizationId: orgId }, { $set: patch }, { new: true }).lean();
  if (!updated) return res.status(404).json({ success: false, message: "Addon not found", data: null });
  return res.json({ success: true, data: normalizeRow(updated) });
};

export const deleteAddon: express.RequestHandler = async (req, res) => {
  const orgId = requireOrgId(req, res);
  if (!orgId) return;

  const id = String(req.params.id || "").trim();
  if (!id) return res.status(400).json({ success: false, message: "Invalid addon id", data: null });

  const deleted = await Addon.findOneAndDelete({ _id: id, organizationId: orgId }).lean();
  if (!deleted) return res.status(404).json({ success: false, message: "Addon not found", data: null });
  await recordDeletion({
    organizationId: orgId,
    resourceId: "addons.list",
    documentId: id,
  });
  return res.json({ success: true, data: { id } });
};

export const bulkCreateAddons: express.RequestHandler = async (req, res) => {
  const orgId = requireOrgId(req, res);
  if (!orgId) return;

  const input = Array.isArray(req.body) ? req.body : req.body?.rows;
  if (!Array.isArray(input)) {
    return res.status(400).json({ success: false, message: "Expected an array of addons (or { rows: [...] })", data: null });
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
  const seenCodes = new Set<string>();

  input.forEach((row, index) => {
    const addonName = asString(row?.addonName ?? row?.name).trim();
    const addonCode = asString(row?.addonCode ?? row?.code).trim();
    if (!addonName) {
      invalid.push({ index, message: "Addon Name is required" });
      return;
    }
    if (!addonCode) {
      invalid.push({ index, message: "Addon Code is required" });
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

    const codeKey = addonCode.toLowerCase();
    if (seenCodes.has(codeKey)) {
      invalid.push({ index, message: `Duplicate addon code in import: ${addonCode}` });
      return;
    }
    seenCodes.add(codeKey);

    prepared.push({
      organizationId: orgId,
      productId,
      product: productName.slice(0, 220),
      addonName: addonName.slice(0, 220),
      addonCode: addonCode.slice(0, 100),
      description: asString(row?.description).trim().slice(0, 5000),
      status: asString(row?.status).trim().slice(0, 40) || "Active",
      addonType: asString(row?.addonType ?? row?.type).trim().slice(0, 40) || "Recurring",
      pricingModel: normalizePricingModel(row?.pricingModel ?? row?.pricingScheme),
      unit: asString(row?.unit ?? row?.unitName).trim().slice(0, 60),
      billingFrequency: asString(row?.billingFrequency).trim().slice(0, 120),
      startingQuantity: Number(row?.startingQuantity ?? 0) || 0,
      endingQuantity: Number(row?.endingQuantity ?? 0) || 0,
      price: Number(row?.price ?? 0) || 0,
      imageUrl: asString(row?.imageUrl).trim().slice(0, 2_000_000),
      account: asString(row?.account).trim().slice(0, 120) || "Sales",
      taxName: asString(row?.taxName ?? row?.salesTax).trim().slice(0, 120),
      associatedPlans: asString(row?.associatedPlans ?? row?.plan).trim().slice(0, 2000) || "All Plans",
      selectedPlans: Array.isArray(row?.selectedPlans) ? row.selectedPlans.map((v: any) => String(v || "").trim()).filter(Boolean) : [],
      includeInWidget: Boolean(row?.includeInWidget ?? row?.showInWidget ?? false),
      showInPortal: Boolean(row?.showInPortal ?? false),
      volumeBrackets: readBracketRows(row),
      pricingBrackets: readBracketRows(row),
    });
  });

  if (prepared.length === 0) {
    return res.status(400).json({ success: false, message: "No valid addons to import", data: { invalid } });
  }

  const existing = await Addon.find({ organizationId: orgId }).select({ addonCode: 1 }).lean();
  const existingSet = new Set(existing.map((p: any) => String(p?.addonCode || "").toLowerCase()));
  const filtered = prepared.filter((p) => !existingSet.has(String(p.addonCode || "").toLowerCase()));
  const skippedExisting = prepared.length - filtered.length;

  if (filtered.length === 0) {
    return res.status(409).json({ success: false, message: "All addon codes already exist", data: { insertedCount: 0, skippedExisting, invalid } });
  }

  try {
    const insertedDocs = await Addon.insertMany(filtered, { ordered: false });
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
