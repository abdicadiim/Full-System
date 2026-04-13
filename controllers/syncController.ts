import type express from "express";
import { createHash } from "node:crypto";
import mongoose from "mongoose";
import { Currency } from "../models/Currency.js";
import { Customer } from "../models/Customer.js";
import { Coupon } from "../models/Coupon.js";
import { Addon } from "../models/Addon.js";
import { Item } from "../models/Item.js";
import { Organization } from "../models/Organization.js";
import { Plan } from "../models/Plan.js";
import { PriceList } from "../models/PriceList.js";
import { Product } from "../models/Product.js";
import { buildFrontendItemPayload } from "../services/itemPayloads.js";
import { buildFrontendProductPayload } from "../services/productPayloads.js";
import { getDashboardSummaryPayload, getDashboardSummarySourceMeta } from "../services/dashboardSummaryService.js";
import { SyncTombstone } from "../models/SyncTombstone.js";

type ClientResourceMeta = {
  id?: string;
  version_id?: string;
  last_updated?: string;
  count?: number;
};

type ResourceMeta = {
  versionId: string;
  lastUpdated: string;
  count: number;
};

type ResourceConfig = {
  getMeta: (orgId: string) => Promise<ResourceMeta>;
  fetchFull: (orgId: string) => Promise<any>;
  fetchDelta?: (
    orgId: string,
    lastUpdated: string
  ) => Promise<{ upserts: any[]; deleted_ids?: string[] }>;
};

const hashVersionId = (value: unknown) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");

const normalizeIsoDate = (value: unknown) => {
  if (!value) return "";
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
};

const normalizeCount = (value: unknown) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric >= 0 ? Math.trunc(numeric) : 0;
};

const toObjectId = (orgId: string) => new mongoose.Types.ObjectId(orgId);

const getCollectionMeta = async (Model: any, orgId: string) => {
  const [summary] = await Model.aggregate([
    { $match: { organizationId: toObjectId(orgId) } },
    {
      $group: {
        _id: null,
        count: { $sum: 1 },
        lastUpdated: { $max: { $ifNull: ["$updatedAt", "$createdAt"] } },
      },
    },
  ]);

  const count = normalizeCount(summary?.count);
  const lastUpdated = normalizeIsoDate(summary?.lastUpdated) || new Date(0).toISOString();
  return {
    versionId: hashVersionId({ count, lastUpdated }),
    lastUpdated,
    count,
  };
};

const normalizeRowId = (row: any) => ({
  ...row,
  id: String(row?._id || row?.id || ""),
});

const normalizeCurrency = (row: any) => {
  if (!row) return null;
  const code = String(row?.code || row?.currencyCode || "").trim().toUpperCase();
  return {
    ...row,
    id: String(row?._id || row?.id || row?.currencyId || ""),
    code,
    symbol: String(row?.symbol || row?.currencySymbol || code || "").trim(),
    name: String(row?.name || row?.currencyName || "").trim(),
  };
};

const createListResource = (options: {
  resourceId: string;
  Model: any;
  select?: Record<string, number>;
  sort?: Record<string, 1 | -1>;
  normalize?: (row: any) => any;
}) => {
  const normalize = options.normalize || normalizeRowId;
  const sort = options.sort || { createdAt: -1, _id: -1 };

  return {
    getMeta: (orgId: string) => getCollectionMeta(options.Model, orgId),
    fetchFull: async (orgId: string) => {
      const query = options.Model.find({ organizationId: orgId }).sort(sort);
      if (options.select) query.select(options.select);
      const rows = await query.lean();
      return rows.map((row: any) => normalize(row));
    },
    fetchDelta: async (orgId: string, lastUpdated: string) => {
      const query = options.Model.find({
        organizationId: orgId,
        updatedAt: { $gt: new Date(lastUpdated) },
      }).sort({ updatedAt: 1, _id: 1 });
      if (options.select) query.select(options.select);
      const rows = await query.lean();
      const deletedRows = await SyncTombstone.find({
        organizationId: orgId,
        resourceId: options.resourceId,
        deletedAt: { $gt: new Date(lastUpdated) },
      })
        .select({ documentId: 1 })
        .sort({ deletedAt: 1, _id: 1 })
        .lean();

      return {
        upserts: rows.map((row: any) => normalize(row)),
        deleted_ids: deletedRows.map((row: any) => String(row?.documentId || "")).filter(Boolean),
      };
    },
  } satisfies ResourceConfig;
};

const getBaseCurrencyMeta = async (orgId: string): Promise<ResourceMeta> => {
  const [currency, organization] = await Promise.all([
    Currency.findOne({ organizationId: orgId, isBaseCurrency: true })
      .sort({ updatedAt: -1, createdAt: -1 })
      .select({ _id: 1, code: 1, symbol: 1, name: 1, updatedAt: 1, createdAt: 1 })
      .lean(),
    Organization.findById(orgId)
      .select({ baseCurrency: 1, currencySymbol: 1, currencyId: 1, updatedAt: 1, createdAt: 1 })
      .lean(),
  ]);

  const payload = normalizeCurrency(currency) || {
    id: String((organization as any)?.currencyId || ""),
    code: String((organization as any)?.baseCurrency || "").trim().toUpperCase(),
    symbol: String((organization as any)?.currencySymbol || "").trim(),
    name: "",
  };
  const count = payload?.code ? 1 : 0;
  const lastUpdated =
    normalizeIsoDate((currency as any)?.updatedAt) ||
    normalizeIsoDate((currency as any)?.createdAt) ||
    normalizeIsoDate((organization as any)?.updatedAt) ||
    normalizeIsoDate((organization as any)?.createdAt) ||
    new Date(0).toISOString();

  return {
    versionId: hashVersionId({ payload, lastUpdated }),
    lastUpdated,
    count,
  };
};

const fetchBaseCurrency = async (orgId: string) => {
  const currency = await Currency.findOne({ organizationId: orgId, isBaseCurrency: true })
    .sort({ updatedAt: -1, createdAt: -1 })
    .select({ _id: 1, code: 1, symbol: 1, name: 1, isBaseCurrency: 1, updatedAt: 1, createdAt: 1 })
    .lean();
  if (currency) return normalizeCurrency(currency);

  const organization = await Organization.findById(orgId)
    .select({ baseCurrency: 1, currencySymbol: 1, currencyId: 1 })
    .lean();

  const fallback = normalizeCurrency({
    _id: (organization as any)?.currencyId || "",
    code: (organization as any)?.baseCurrency || "",
    symbol: (organization as any)?.currencySymbol || "",
    name: "",
  });

  return fallback?.code ? fallback : null;
};

const resourceConfigs: Record<string, ResourceConfig> = {
  "dashboard.summary": {
    getMeta: async (orgId: string) => {
      const meta = await getDashboardSummarySourceMeta(orgId);
      return {
        versionId: meta.versionId,
        lastUpdated: meta.lastUpdated,
        count: 1,
      };
    },
    fetchFull: async (orgId: string) => {
      const summary = await getDashboardSummaryPayload(orgId);
      return {
        ...summary.payloadData,
        version_id: summary.versionId,
        last_updated: summary.lastUpdated,
      };
    },
  },
  "currencies.base": {
    getMeta: getBaseCurrencyMeta,
    fetchFull: fetchBaseCurrency,
  },
  "customers.list": createListResource({
    resourceId: "customers.list",
    Model: Customer,
    sort: { createdAt: -1, _id: -1 },
    normalize: normalizeRowId,
  }),
  "items.list": createListResource({
    resourceId: "items.list",
    Model: Item,
    sort: { createdAt: -1, _id: -1 },
    normalize: (row) => buildFrontendItemPayload(row),
  }),
  "addons.list": createListResource({
    resourceId: "addons.list",
    Model: Addon,
    sort: { createdAt: -1, _id: -1 },
    normalize: normalizeRowId,
  }),
  "products.list": createListResource({
    resourceId: "products.list",
    Model: Product,
    sort: { createdAt: -1, _id: -1 },
    normalize: (row) => buildFrontendProductPayload(row),
  }),
  "plans.list": createListResource({
    resourceId: "plans.list",
    Model: Plan,
    sort: { createdAt: -1, _id: -1 },
    normalize: normalizeRowId,
  }),
  "coupons.list": createListResource({
    resourceId: "coupons.list",
    Model: Coupon,
    sort: { createdAt: -1, _id: -1 },
    normalize: normalizeRowId,
  }),
  "price-lists.list": createListResource({
    resourceId: "price-lists.list",
    Model: PriceList,
    sort: { createdAt: -1, _id: -1 },
    normalize: normalizeRowId,
  }),
};

const getRequestedResources = (req: express.Request) => {
  const input = Array.isArray(req.body?.resources) ? (req.body.resources as ClientResourceMeta[]) : [];
  return input
    .map((resource) => ({
      id: String(resource?.id || "").trim(),
      version_id: String(resource?.version_id || "").trim(),
      last_updated: normalizeIsoDate(resource?.last_updated),
      count: normalizeCount(resource?.count),
    }))
    .filter((resource) => resource.id && resourceConfigs[resource.id]);
};

const getOrgId = (req: express.Request, res: express.Response) => {
  const orgId = req.user?.organizationId;
  if (!orgId) {
    res.status(401).json({ success: false, message: "Unauthenticated", data: null });
    return null;
  }
  if (!mongoose.isValidObjectId(orgId)) {
    res.status(400).json({ success: false, message: "Invalid organization", data: null });
    return null;
  }
  return String(orgId);
};

export const validateResources: express.RequestHandler = async (req, res) => {
  const orgId = getOrgId(req, res);
  if (!orgId) return;

  const resources = getRequestedResources(req);
  const results = await Promise.all(
    resources.map(async (resource) => {
      const meta = await resourceConfigs[resource.id].getMeta(orgId);
      const matches =
        (resource.version_id && resource.version_id === meta.versionId) ||
        (!resource.version_id &&
          resource.last_updated === meta.lastUpdated &&
          resource.count === meta.count);

      return {
        id: resource.id,
        status: matches ? "match" : resource.version_id || resource.last_updated || resource.count ? "stale" : "missing",
        version_id: meta.versionId,
        last_updated: meta.lastUpdated,
        count: meta.count,
      };
    })
  );

  return res.json({ success: true, data: { resources: results } });
};

export const fetchResources: express.RequestHandler = async (req, res) => {
  const orgId = getOrgId(req, res);
  if (!orgId) return;

  const resources = getRequestedResources(req);
  const results = await Promise.all(
    resources.map(async (resource) => {
      const config = resourceConfigs[resource.id];
      const meta = await config.getMeta(orgId);
      const canUseDelta =
        Boolean(config.fetchDelta) &&
        Boolean(resource.last_updated) &&
        resource.last_updated < meta.lastUpdated;

      if (canUseDelta && config.fetchDelta) {
        const delta = await config.fetchDelta(orgId, resource.last_updated);
        return {
          id: resource.id,
          mode: "delta",
          version_id: meta.versionId,
          last_updated: meta.lastUpdated,
          count: meta.count,
          upserts: Array.isArray(delta?.upserts) ? delta.upserts : [],
          deleted_ids: Array.isArray(delta?.deleted_ids) ? delta.deleted_ids : [],
        };
      }

      const data = await config.fetchFull(orgId);
      return {
        id: resource.id,
        mode: "full",
        version_id: meta.versionId,
        last_updated: meta.lastUpdated,
        count: meta.count,
        data,
      };
    })
  );

  return res.json({ success: true, data: { resources: results } });
};
