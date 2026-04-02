import type express from "express";
import mongoose from "mongoose";
import { Product } from "../models/Product.js";
import {
  buildFrontendProductPayload,
  buildZohoProductPayload,
  normalizeProductStatus,
  parseProductPayload,
} from "../services/productPayloads.js";

const asString = (value: unknown) => String(typeof value === "string" ? value : "").trim();
const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const toPositiveInt = (value: unknown, fallback: number, max = Number.MAX_SAFE_INTEGER) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.max(1, Math.min(max, Math.trunc(parsed)));
};

const getOrgId = (req: express.Request) => {
  const orgId = req.user?.organizationId;
  if (!orgId) return null;
  if (!mongoose.isValidObjectId(orgId)) return null;
  return orgId;
};

const buildErrorResponse = (
  res: express.Response,
  status: number,
  code: number,
  message: string,
) =>
  res.status(status).json({
    success: false,
    code,
    message,
    data: null,
  });

const buildListResponse = (rows: any[], meta: { page: number; perPage: number; total: number }) => {
  const pageCount = Math.max(1, Math.ceil(meta.total / meta.perPage));
  return {
    success: true,
    code: 0,
    message: "success",
    data: rows.map(buildFrontendProductPayload),
    products: rows.map(buildZohoProductPayload),
    page: meta.page,
    per_page: meta.perPage,
    total: meta.total,
    has_more_page: meta.page * meta.perPage < meta.total,
    pagination: {
      total: meta.total,
      page: meta.page,
      limit: meta.perPage,
      pages: pageCount,
    },
  };
};

const buildSingleResponse = (row: any, message: string) => ({
  success: true,
  code: 0,
  message,
  data: buildFrontendProductPayload(row),
  product: buildZohoProductPayload(row),
});

const findProductById = async (orgId: string, productId: string) => {
  if (!mongoose.isValidObjectId(productId)) return null;
  return Product.findOne({ _id: productId, organizationId: orgId }).lean();
};

const findDuplicateProductByName = async (orgId: string, name: string, excludeId?: string) => {
  if (!name) return null;
  const filter: any = {
    organizationId: orgId,
    name: new RegExp(`^${escapeRegExp(name)}$`, "i"),
  };
  if (excludeId && mongoose.isValidObjectId(excludeId)) {
    filter._id = { $ne: excludeId };
  }
  return Product.findOne(filter).lean();
};

export const listProducts: express.RequestHandler = async (req, res, next) => {
  try {
    const orgId = getOrgId(req);
    if (!orgId) return res.status(401).json({ success: false, message: "Unauthenticated", data: null });

    const filter: any = { organizationId: orgId };
    const searchText = asString(req.query.search_text ?? req.query.search ?? req.query.q);
    const status = asString(req.query.status ?? req.query.filter_by);

    if (searchText) {
      const searchRegex = new RegExp(escapeRegExp(searchText), "i");
      filter.$or = [{ name: searchRegex }, { description: searchRegex }];
    }

    const normalizedStatus = status.toLowerCase();
    if (normalizedStatus === "active" || normalizedStatus === "status.active") {
      filter.status = new RegExp("^active$", "i");
    } else if (normalizedStatus === "inactive" || normalizedStatus === "status.inactive") {
      filter.status = new RegExp("^inactive$", "i");
    }

    const page = toPositiveInt(req.query.page, 1);
    const perPage = toPositiveInt(req.query.per_page ?? req.query.limit, 200, 1000);
    const total = await Product.countDocuments(filter);
    const rows = await Product.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip((page - 1) * perPage)
      .limit(perPage)
      .lean();

    return res.json(buildListResponse(rows, { page, perPage, total }));
  } catch (error) {
    next(error);
  }
};

export const getProductById: express.RequestHandler = async (req, res, next) => {
  try {
    const orgId = getOrgId(req);
    if (!orgId) return res.status(401).json({ success: false, message: "Unauthenticated", data: null });

    const productId = String(req.params.product_id || req.params.id || "").trim();
    const row = await findProductById(orgId, productId);
    if (!row) return buildErrorResponse(res, 404, 4004, "Product not found");
    return res.json(buildSingleResponse(row, "success"));
  } catch (error) {
    next(error);
  }
};

export const createProduct: express.RequestHandler = async (req, res, next) => {
  try {
    const orgId = getOrgId(req);
    if (!orgId) return res.status(401).json({ success: false, message: "Unauthenticated", data: null });

    const { patch, errors } = parseProductPayload(req.body || {}, { requireName: true });
    if (errors.length > 0) {
      return buildErrorResponse(res, 400, 4000, errors[0]);
    }

    const name = asString(patch.name);
    const duplicate = await findDuplicateProductByName(orgId, name);
    if (duplicate) {
      return buildErrorResponse(res, 409, 4001, "Product name already exists");
    }

    patch.status = String(patch.status || "Active").trim() || "Active";
    if (patch.autoGenerateSubscriptionNumbers === true) {
      patch.prefix = asString(patch.prefix) || "SUB-";
      patch.nextNumber = asString(patch.nextNumber) || "00001";
    } else {
      patch.autoGenerateSubscriptionNumbers = false;
      patch.prefix = "";
      patch.nextNumber = "";
    }

    const created = await Product.create({
      organizationId: orgId,
      ...patch,
    });

    return res.status(201).json(buildSingleResponse(created.toObject(), "The product has been created"));
  } catch (error: any) {
    if (error?.code === 11000) {
      return buildErrorResponse(res, 409, 4001, "Product name already exists");
    }
    next(error);
  }
};

export const updateProduct: express.RequestHandler = async (req, res, next) => {
  try {
    const orgId = getOrgId(req);
    if (!orgId) return res.status(401).json({ success: false, message: "Unauthenticated", data: null });

    const productId = String(req.params.product_id || req.params.id || "").trim();
    const existing = await findProductById(orgId, productId);
    if (!existing) return buildErrorResponse(res, 404, 4004, "Product not found");

    const { patch, errors } = parseProductPayload(req.body || {});
    if (errors.length > 0) {
      return buildErrorResponse(res, 400, 4000, errors[0]);
    }

    if (Object.prototype.hasOwnProperty.call(patch, "name")) {
      const duplicate = await findDuplicateProductByName(orgId, asString(patch.name), productId);
      if (duplicate) {
        return buildErrorResponse(res, 409, 4001, "Product name already exists");
      }
    }

    const existingProduct = existing as any;
    const nextAutoGenerate =
      typeof patch.autoGenerateSubscriptionNumbers === "boolean"
        ? patch.autoGenerateSubscriptionNumbers
        : Boolean(existingProduct.autoGenerateSubscriptionNumbers);

    if (nextAutoGenerate) {
      patch.prefix = asString(patch.prefix) || asString(existingProduct.prefix) || "SUB-";
      patch.nextNumber = asString(patch.nextNumber) || asString(existingProduct.nextNumber) || "00001";
    } else if (
      patch.autoGenerateSubscriptionNumbers === false ||
      Object.prototype.hasOwnProperty.call(patch, "prefix") ||
      Object.prototype.hasOwnProperty.call(patch, "nextNumber")
    ) {
      patch.autoGenerateSubscriptionNumbers = false;
      patch.prefix = "";
      patch.nextNumber = "";
    }

    if (Object.keys(patch).length === 0) {
      return res.json(buildSingleResponse(existing, "The product details have been updated."));
    }

    const updated = await Product.findOneAndUpdate(
      { _id: productId, organizationId: orgId },
      { $set: patch },
      { new: true }
    ).lean();

    if (!updated) return buildErrorResponse(res, 404, 4004, "Product not found");
    return res.json(buildSingleResponse(updated, "The product details have been updated."));
  } catch (error: any) {
    if (error?.code === 11000) {
      return buildErrorResponse(res, 409, 4001, "Product name already exists");
    }
    next(error);
  }
};

export const deleteProduct: express.RequestHandler = async (req, res, next) => {
  try {
    const orgId = getOrgId(req);
    if (!orgId) return res.status(401).json({ success: false, message: "Unauthenticated", data: null });

    const productId = String(req.params.product_id || req.params.id || "").trim();
    const existing = await findProductById(orgId, productId);
    if (!existing) return buildErrorResponse(res, 404, 4004, "Product not found");

    await Product.deleteOne({ _id: productId, organizationId: orgId });
    return res.json({
      success: true,
      code: 0,
      message: "The product has been deleted.",
      data: { id: productId },
    });
  } catch (error) {
    next(error);
  }
};

const setProductStatus = async (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
  status: "Active" | "Inactive",
  message: string,
) => {
  try {
    const orgId = getOrgId(req);
    if (!orgId) return res.status(401).json({ success: false, message: "Unauthenticated", data: null });

    const productId = String(req.params.product_id || req.params.id || "").trim();
    const existing = await findProductById(orgId, productId);
    if (!existing) return buildErrorResponse(res, 404, 4004, "Product not found");

    const updated = await Product.findOneAndUpdate(
      { _id: productId, organizationId: orgId },
      { $set: { status } },
      { new: true }
    ).lean();

    if (!updated) return buildErrorResponse(res, 404, 4004, "Product not found");
    return res.json(buildSingleResponse(updated, message));
  } catch (error) {
    next(error);
  }
};

export const markProductActive: express.RequestHandler = (req, res, next) =>
  setProductStatus(req, res, next, "Active", "The product has been marked as active.");

export const markProductInactive: express.RequestHandler = (req, res, next) =>
  setProductStatus(req, res, next, "Inactive", "The product has been marked as inactive.");

export const bulkCreateProducts: express.RequestHandler = async (req, res, next) => {
  try {
    const orgId = getOrgId(req);
    if (!orgId) return res.status(401).json({ success: false, message: "Unauthenticated", data: null });

    const input = Array.isArray(req.body) ? req.body : req.body?.rows;
    if (!Array.isArray(input)) {
      return res.status(400).json({
        success: false,
        message: "Expected an array of products (or { rows: [...] })",
        data: null,
      });
    }

    const invalid: { index: number; message: string }[] = [];
    const prepared: any[] = [];
    const seenNames = new Set<string>();

    input.forEach((row, index) => {
      const { patch, errors } = parseProductPayload(row, { requireName: true });
      if (errors.length > 0) {
        invalid.push({ index, message: errors[0] });
        return;
      }

      const name = asString(patch.name);
      const key = name.toLowerCase();
      if (seenNames.has(key)) {
        invalid.push({ index, message: `Duplicate product name in import: ${name}` });
        return;
      }

      seenNames.add(key);
      if (patch.autoGenerateSubscriptionNumbers === true) {
        patch.prefix = asString(patch.prefix) || "SUB-";
        patch.nextNumber = asString(patch.nextNumber) || "00001";
      } else {
        patch.autoGenerateSubscriptionNumbers = false;
        patch.prefix = "";
        patch.nextNumber = "";
      }

      patch.status = asString(patch.status) || "Active";
      prepared.push({
        organizationId: orgId,
        ...patch,
      });
    });

    if (prepared.length === 0) {
      return res.status(400).json({
        success: false,
        code: 4000,
        message: "No valid products to import",
        data: { invalid },
      });
    }

    const existingProducts = await Product.find({ organizationId: orgId }).select({ name: 1 }).lean();
    const existingNames = new Set(existingProducts.map((row: any) => asString(row?.name).toLowerCase()));
    const filtered = prepared.filter((row) => !existingNames.has(asString(row?.name).toLowerCase()));
    const skippedExisting = prepared.length - filtered.length;

    if (filtered.length === 0) {
      return res.status(409).json({
        success: false,
        code: 4001,
        message: "All product names already exist",
        data: { insertedCount: 0, skippedExisting, invalid },
      });
    }

    try {
      const insertedDocs = await Product.insertMany(filtered, { ordered: false });
      return res.status(201).json({
        success: true,
        code: 0,
        message: "Products imported successfully",
        data: {
          insertedCount: insertedDocs.length,
          skippedExisting,
          invalid,
          inserted: insertedDocs.map((row: any) => buildFrontendProductPayload(row.toObject ? row.toObject() : row)),
        },
        products: insertedDocs.map((row: any) => buildZohoProductPayload(row.toObject ? row.toObject() : row)),
      });
    } catch (error: any) {
      const insertedDocs = Array.isArray(error?.insertedDocs) ? error.insertedDocs : [];
      const writeErrors = Array.isArray(error?.writeErrors) ? error.writeErrors : [];
      return res.status(207).json({
        success: true,
        code: 0,
        message: "Products imported with partial success",
        data: {
          insertedCount: insertedDocs.length,
          skippedExisting,
          skippedDuplicates: writeErrors.length,
          invalid,
          inserted: insertedDocs.map((row: any) => buildFrontendProductPayload(row.toObject ? row.toObject() : row)),
        },
        products: insertedDocs.map((row: any) => buildZohoProductPayload(row.toObject ? row.toObject() : row)),
      });
    }
  } catch (error) {
    next(error);
  }
};
