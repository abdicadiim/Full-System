import type express from "express";
import mongoose from "mongoose";
import { Item } from "../models/Item.js";
import { Invoice } from "../models/Invoice.js";
import { Quote } from "../models/Quote.js";
import { CreditNote } from "../models/CreditNote.js";
import { DebitNote } from "../models/DebitNote.js";
import { SalesReceipt } from "../models/SalesReceipt.js";
import { Bill } from "../models/Bill.js";
import { RecurringInvoice } from "../models/RecurringInvoice.js";
import {
  buildFrontendItemPayload,
  buildZohoItemPayload,
  normalizeProductType,
  parseItemPayload,
} from "../services/itemPayloads.js";

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const asString = (value: unknown) => String(typeof value === "string" ? value : "").trim();
const asNumber = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
};

const getOrgId = (req: express.Request) => {
  const orgId = req.user?.organizationId;
  if (!orgId) return null;
  if (!mongoose.isValidObjectId(orgId)) return null;
  return orgId;
};

const getActor = (req: express.Request) => {
  const user = req.user;
  if (!user) return { id: "unknown", name: "Unknown" };
  return { id: String(user.id || "unknown"), name: String(user.name || user.email || "Unknown") };
};

const computeIsInactive = (row: any) =>
  row?.active === false || row?.isActive === false || String(row?.status || "").toLowerCase() === "inactive";

const TRANSACTION_MODELS = [
  Invoice,
  Quote,
  CreditNote,
  DebitNote,
  SalesReceipt,
  Bill,
  RecurringInvoice,
];

const buildTransactionUsageFilter = (item: any) => {
  const itemId = String(item?._id || item?.id || item?.item_id || "").trim();
  const sku = asString(item?.sku);
  const name = asString(item?.name);
  const or: Record<string, unknown>[] = [];

  if (itemId) {
    or.push(
      { "items.itemId": itemId },
      { "items.item": itemId },
      { "items.id": itemId },
      { "items._id": itemId },
    );
  }
  if (sku) {
    or.push({ "items.sku": sku });
  }
  if (name) {
    or.push({ "items.name": name });
    or.push({ "items.itemDetails": name });
  }

  return or.length > 0 ? { $or: or } : null;
};

const hasTransactionsForItem = async (orgId: string, item: any) => {
  const usageFilter = buildTransactionUsageFilter(item);
  if (!usageFilter) return false;

  for (const Model of TRANSACTION_MODELS) {
    const exists = await Model.exists({
      organizationId: orgId,
      ...usageFilter,
    });
    if (exists) return true;
  }

  return false;
};

const findDuplicateItemByName = async (orgId: string, name: string, excludeId?: string) => {
  if (!name) return null;
  const filter: any = {
    organizationId: orgId,
    name: new RegExp(`^${escapeRegExp(name)}$`, "i"),
  };
  if (excludeId && mongoose.isValidObjectId(excludeId)) {
    filter._id = { $ne: excludeId };
  }
  return Item.findOne(filter).lean();
};

const findDuplicateItemBySku = async (orgId: string, sku: string, excludeId?: string) => {
  if (!sku) return null;
  const filter: any = {
    organizationId: orgId,
    sku: new RegExp(`^${escapeRegExp(sku)}$`, "i"),
  };
  if (excludeId && mongoose.isValidObjectId(excludeId)) {
    filter._id = { $ne: excludeId };
  }
  return Item.findOne(filter).lean();
};

const buildListResponse = (rows: any[], meta: { page: number; perPage: number; total: number }) => ({
  success: true,
  code: 0,
  message: "success",
  data: rows.map(buildFrontendItemPayload),
  items: rows.map(buildZohoItemPayload),
  page: meta.page,
  per_page: meta.perPage,
  total: meta.total,
  has_more_page: meta.page * meta.perPage < meta.total,
  totalPages: Math.max(1, Math.ceil(meta.total / meta.perPage)),
});

const buildSingleItemResponse = (row: any, message: string) => ({
  success: true,
  code: 0,
  message,
  data: buildFrontendItemPayload(row),
  item: buildZohoItemPayload(row),
});

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

const findItemById = async (orgId: string, itemId: string) => {
  if (!mongoose.isValidObjectId(itemId)) return null;
  return Item.findOne({ _id: itemId, organizationId: orgId }).lean();
};

const createHistoryEntry = (actor: { id: string; name: string }, details: { action: string; description: string }) => ({
  action: details.action,
  by: actor,
  at: new Date().toISOString(),
  details: details.description,
});

export const listItems: express.RequestHandler = async (req, res, next) => {
  try {
    const orgId = getOrgId(req);
    if (!orgId) return res.status(401).json({ success: false, message: "Unauthenticated", data: null });

    const filter: any = { organizationId: orgId };
    const nameExact = asString(req.query.name);
    const nameStartsWith = asString(req.query.name_startswith);
    const nameContains = asString(req.query.name_contains);
    const descriptionExact = asString(req.query.description);
    const descriptionStartsWith = asString(req.query.description_startswith);
    const descriptionContains = asString(req.query.description_contains);
    const searchText = asString(req.query.search_text ?? req.query.search ?? req.query.q);
    const filterBy = asString(req.query.filter_by ?? req.query.status);
    const taxId = asString(req.query.tax_id);
    const productType = asString(req.query.product_type ?? req.query.type);

    if (nameExact) filter.name = new RegExp(`^${escapeRegExp(nameExact)}$`, "i");
    else if (nameStartsWith) filter.name = new RegExp(`^${escapeRegExp(nameStartsWith)}`, "i");
    else if (nameContains) filter.name = new RegExp(escapeRegExp(nameContains), "i");

    if (descriptionExact) filter.description = new RegExp(`^${escapeRegExp(descriptionExact)}$`, "i");
    else if (descriptionStartsWith) filter.description = new RegExp(`^${escapeRegExp(descriptionStartsWith)}`, "i");
    else if (descriptionContains) filter.description = new RegExp(escapeRegExp(descriptionContains), "i");

    if (searchText) {
      const re = new RegExp(escapeRegExp(searchText), "i");
      filter.$or = [{ name: re }, { description: re }, { sku: re }];
    }

    if (taxId) {
      filter.$or = [...(filter.$or || []), { tax_id: taxId }, { taxId }];
    }

    if (productType) {
      const normalizedType = normalizeProductType(productType);
      filter.$and = [...(filter.$and || []), { $or: [{ product_type: normalizedType }, { type: new RegExp(`^${escapeRegExp(normalizedType === "service" ? "Service" : "Goods")}$`, "i") }] }];
    }

    const rateEquals = asNumber(req.query.rate);
    const rateLessThan = asNumber(req.query.rate_less_than);
    const rateLessEquals = asNumber(req.query.rate_less_equals);
    const rateGreaterThan = asNumber(req.query.rate_greater_than);
    const rateGreaterEquals = asNumber(req.query.rate_greater_equals);
    if (rateEquals !== null) filter.rate = rateEquals;
    if (rateLessThan !== null) filter.rate = { ...(filter.rate || {}), $lt: rateLessThan };
    if (rateLessEquals !== null) filter.rate = { ...(filter.rate || {}), $lte: rateLessEquals };
    if (rateGreaterThan !== null) filter.rate = { ...(filter.rate || {}), $gt: rateGreaterThan };
    if (rateGreaterEquals !== null) filter.rate = { ...(filter.rate || {}), $gte: rateGreaterEquals };

    const normalizedFilterBy = filterBy.toLowerCase();
    if (normalizedFilterBy === "status.active" || normalizedFilterBy === "active") {
      filter.status = new RegExp("^active$", "i");
    } else if (normalizedFilterBy === "status.inactive" || normalizedFilterBy === "inactive") {
      filter.status = new RegExp("^inactive$", "i");
    }

    const sortColumn = asString(req.query.sort_column).toLowerCase();
    const sortField =
      sortColumn === "rate" ? "rate" :
      sortColumn === "tax_name" ? "tax_name" :
      "name";

    const page = Math.max(1, Number(req.query.page || 1));
    const perPage = Math.max(1, Math.min(200, Number(req.query.per_page || req.query.limit || 200)));
    const total = await Item.countDocuments(filter);
    const rows = await Item.find(filter)
      .sort({ [sortField]: 1, createdAt: -1 })
      .skip((page - 1) * perPage)
      .limit(perPage)
      .lean();

    return res.json(buildListResponse(rows, { page, perPage, total }));
  } catch (err) {
    next(err);
  }
};

export const bulkFetchItemDetails: express.RequestHandler = async (req, res, next) => {
  try {
    const orgId = getOrgId(req);
    if (!orgId) return res.status(401).json({ success: false, message: "Unauthenticated", data: null });

    const ids = asString(req.query.item_ids)
      .split(",")
      .map((value) => value.trim())
      .filter((value) => mongoose.isValidObjectId(value));

    if (ids.length === 0) {
      return buildErrorResponse(res, 400, 2006, "Item does not exist");
    }

    const rows = await Item.find({ organizationId: orgId, _id: { $in: ids } }).lean();
    return res.json({
      success: true,
      code: 0,
      message: "success",
      data: rows.map(buildFrontendItemPayload),
      items: rows.map(buildZohoItemPayload),
    });
  } catch (err) {
    next(err);
  }
};

export const getItemById: express.RequestHandler = async (req, res, next) => {
  try {
    const orgId = getOrgId(req);
    if (!orgId) return res.status(401).json({ success: false, message: "Unauthenticated", data: null });

    const row = await findItemById(orgId, String(req.params.item_id || req.params.id || ""));
    if (!row) return buildErrorResponse(res, 404, 2006, "Item does not exist");
    return res.json(buildSingleItemResponse(row, "success"));
  } catch (err) {
    next(err);
  }
};

export const createItem: express.RequestHandler = async (req, res, next) => {
  try {
    const orgId = getOrgId(req);
    if (!orgId) return res.status(401).json({ success: false, message: "Unauthenticated", data: null });

    const actor = getActor(req);
    const { patch, errors } = parseItemPayload(req.body || {}, { requireName: true, requireRate: true });
    if (errors.length > 0) {
      return buildErrorResponse(res, 400, 4000, errors[0]);
    }

    const name = asString(patch.name);
    const sku = asString(patch.sku);

    const duplicateName = await findDuplicateItemByName(orgId, name);
    if (duplicateName) {
      return buildErrorResponse(res, 409, 1000, "The item name already exist");
    }

    const duplicateSku = await findDuplicateItemBySku(orgId, sku);
    if (duplicateSku) {
      return buildErrorResponse(res, 409, 1001, "The SKU already exists");
    }

    const created = await Item.create({
      ...patch,
      organizationId: orgId,
      createdBy: actor,
      updatedBy: actor,
      history: [
        createHistoryEntry(actor, {
          action: "created",
          description: "created",
        }),
      ],
    });

    return res.status(201).json(buildSingleItemResponse(created.toObject(), "The item has been added."));
  } catch (err) {
    next(err);
  }
};

export const updateItem: express.RequestHandler = async (req, res, next) => {
  try {
    const orgId = getOrgId(req);
    if (!orgId) return res.status(401).json({ success: false, message: "Unauthenticated", data: null });

    const itemId = String(req.params.item_id || req.params.id || "").trim();
    const actor = getActor(req);
    const existing = await findItemById(orgId, itemId);
    if (!existing) return buildErrorResponse(res, 404, 2006, "Item does not exist");

    const { patch, errors } = parseItemPayload(req.body || {});
    if (errors.length > 0) {
      return buildErrorResponse(res, 400, 4000, errors[0]);
    }

    const nextName = asString(patch.name || existing.name);
    const nextSku = asString(patch.sku || existing.sku);

    if (Object.prototype.hasOwnProperty.call(patch, "name")) {
      const duplicateName = await findDuplicateItemByName(orgId, nextName, itemId);
      if (duplicateName) {
        return buildErrorResponse(res, 409, 1000, "The item name already exist");
      }
    }

    if (Object.prototype.hasOwnProperty.call(patch, "sku") && nextSku) {
      const duplicateSku = await findDuplicateItemBySku(orgId, nextSku, itemId);
      if (duplicateSku) {
        return buildErrorResponse(res, 409, 1001, "The SKU already exists");
      }
    }

    const existingItem = existing as any;
    const currentProductType = normalizeProductType(existingItem.product_type ?? existingItem.type);
    const requestedProductType = normalizeProductType(patch.product_type ?? patch.type ?? currentProductType);
    if (requestedProductType !== currentProductType) {
      const hasTransactions = await hasTransactionsForItem(orgId, existing);
      if (hasTransactions) {
        return buildErrorResponse(res, 400, 2076, "Product type cannot be changed for Items having transactions");
      }
    }

    const prevInactive = computeIsInactive(existing);
    const nextInactive = computeIsInactive({ ...existing, ...patch });
    const activeChanged = prevInactive !== nextInactive;
    const changedFields = Object.keys(patch).filter((key) => !["updatedBy", "createdBy", "history"].includes(key));

    const historyEntry = createHistoryEntry(actor, {
      action: activeChanged ? (nextInactive ? "marked_inactive" : "marked_active") : "updated",
      description: activeChanged
        ? (nextInactive ? "marked as inactive" : "marked as active")
        : changedFields.length > 0
          ? `updated: ${changedFields.slice(0, 8).join(", ")}${changedFields.length > 8 ? "..." : ""}`
          : "updated",
    });

    const updated = await Item.findOneAndUpdate(
      { _id: itemId, organizationId: orgId },
      { $set: { ...patch, updatedBy: actor }, $push: { history: historyEntry } },
      { new: true }
    ).lean();
    if (!updated) return buildErrorResponse(res, 404, 2006, "Item does not exist");

    return res.json(buildSingleItemResponse(updated, "Item details have been saved."));
  } catch (err) {
    next(err);
  }
};

export const deleteItem: express.RequestHandler = async (req, res, next) => {
  try {
    const orgId = getOrgId(req);
    if (!orgId) return res.status(401).json({ success: false, message: "Unauthenticated", data: null });

    const itemId = String(req.params.item_id || req.params.id || "").trim();
    const existing = await findItemById(orgId, itemId);
    if (!existing) return buildErrorResponse(res, 404, 2006, "Item does not exist");

    const hasTransactions = await hasTransactionsForItem(orgId, existing);
    if (hasTransactions) {
      return buildErrorResponse(
        res,
        400,
        2049,
        "Items which are a part of other transactions cannot be deleted. Instead, mark them as inactive",
      );
    }

    await Item.deleteOne({ _id: itemId, organizationId: orgId });
    return res.json({
      success: true,
      code: 0,
      message: "The item has been deleted.",
      data: { id: itemId },
    });
  } catch (err) {
    next(err);
  }
};

const setItemStatus = async (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
  active: boolean,
  message: string,
) => {
  try {
    const orgId = getOrgId(req);
    if (!orgId) return res.status(401).json({ success: false, message: "Unauthenticated", data: null });

    const itemId = String(req.params.item_id || req.params.id || "").trim();
    const actor = getActor(req);
    const existing = await findItemById(orgId, itemId);
    if (!existing) return buildErrorResponse(res, 404, 2006, "Item does not exist");

    const updated = await Item.findOneAndUpdate(
      { _id: itemId, organizationId: orgId },
      {
        $set: {
          active,
          isActive: active,
          status: active ? "Active" : "Inactive",
          updatedBy: actor,
        },
        $push: {
          history: createHistoryEntry(actor, {
            action: active ? "marked_active" : "marked_inactive",
            description: active ? "marked as active" : "marked as inactive",
          }),
        },
      },
      { new: true }
    ).lean();

    if (!updated) return buildErrorResponse(res, 404, 2006, "Item does not exist");

    return res.json({
      ...buildSingleItemResponse(updated, message),
      data: buildFrontendItemPayload(updated),
    });
  } catch (err) {
    next(err);
  }
};

export const markItemActive: express.RequestHandler = (req, res, next) =>
  setItemStatus(req, res, next, true, "The item has been marked Active.");

export const markItemInactive: express.RequestHandler = (req, res, next) =>
  setItemStatus(req, res, next, false, "The item has been marked Inactive.");
