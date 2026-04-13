import type { QueryClient } from "@tanstack/react-query";
import { customerQueryKeys, normalizeCustomerForQueryCache, type CustomersListQueryResult } from "../../pages/Customers/customerQueries";
import { normalizeCoupon, couponQueryKeys } from "../../pages/Product-Calalog/coupons/couponQueries";
import { normalizeItemForQueryCache, itemQueryKeys } from "../../pages/Product-Calalog/items/itemQueries";
import { normalizePlan, planQueryKeys } from "../../pages/Product-Calalog/plans/planQueries";
import { priceListQueryKeys, normalizePriceList } from "../../pages/Product-Calalog/priceList/priceListQueries";
import { normalizeProductForQueryCache, productQueryKeys } from "../../pages/Product-Calalog/plans/productQueries";
import { ADDONS_STORAGE_KEY, normalizeAddon } from "../../pages/Product-Calalog/addons/storage";
import { readSyncEnvelope, type SyncEnvelope, writeSyncEnvelope } from "../sync/syncStorage";
import { startupSyncAPI } from "../../services/api";

export const DASHBOARD_SUMMARY_CACHE_KEY = "billing_dashboard_summary_v1";
export const BASE_CURRENCY_CACHE_KEY = "billing_base_currency_v1";
const CUSTOMERS_CACHE_KEY = "billing_customers_sync_v1";
const ITEMS_CACHE_KEY = "billing_items_sync_v1";
const PRODUCTS_CACHE_KEY = "billing_products_sync_v1";
const ADDONS_CACHE_KEY = "billing_addons_sync_v1";
const PLANS_CACHE_KEY = "billing_plans_sync_v1";
const COUPONS_CACHE_KEY = "billing_coupons_sync_v1";
const PRICE_LISTS_CACHE_KEY = "billing_price_lists_sync_v1";

const ITEMS_STORAGE_KEY = "inv_items_v1";
const PRODUCTS_STORAGE_KEY = "inv_products_v1";
const PLANS_STORAGE_KEY = "inv_plans_v1";
const COUPONS_STORAGE_KEY = "inv_coupons_v1";
const PRICE_LISTS_STORAGE_KEY = "inv_price_lists_v1";

type ResourceId =
  | "dashboard.summary"
  | "currencies.base"
  | "customers.list"
  | "items.list"
  | "addons.list"
  | "products.list"
  | "plans.list"
  | "coupons.list"
  | "price-lists.list";

type ListResourceDefinition = {
  id: ResourceId;
  cacheKey: string;
  kind: "list";
  normalizeRow: (row: any) => any;
  primeQueryCache?: (queryClient: QueryClient, rows: any[]) => void;
  legacyStorageKey?: string;
};

type SingletonResourceDefinition = {
  id: ResourceId;
  cacheKey: string;
  kind: "singleton";
  normalizeValue: (value: any) => any;
  afterWrite?: (value: any) => void;
};

type ResourceDefinition = ListResourceDefinition | SingletonResourceDefinition;

type SyncResourceRequest = {
  id: ResourceId;
  version_id?: string;
  last_updated?: string;
  count?: number;
};

const hasLocalStorage = () => typeof window !== "undefined" && typeof window.localStorage !== "undefined";

const readEnvelope = <T>(cacheKey: string) => readSyncEnvelope<T>(cacheKey);

const writeLegacyRows = (storageKey: string, rows: any[]) => {
  if (!hasLocalStorage()) return;
  try {
    localStorage.setItem(storageKey, JSON.stringify(rows));
  } catch {
    // Ignore quota errors for legacy caches.
  }
};

const clearLegacyItemCache = () => {
  if (!hasLocalStorage()) return;
  try {
    localStorage.removeItem(ITEMS_STORAGE_KEY);
  } catch {
    // Ignore cleanup failures.
  }
};

const normalizeCount = (value: unknown) => {
  if (Array.isArray(value)) return value.length;
  return value ? 1 : 0;
};

const mergeRowsById = (existingRows: any[], incomingRows: any[]) => {
  const nextRows = Array.isArray(existingRows) ? [...existingRows] : [];
  const indexById = new Map<string, number>();

  nextRows.forEach((row, index) => {
    const id = String(row?.id || row?._id || "").trim();
    if (id) indexById.set(id, index);
  });

  (Array.isArray(incomingRows) ? incomingRows : []).forEach((row) => {
    const id = String(row?.id || row?._id || "").trim();
    if (!id) return;

    const existingIndex = indexById.get(id);
    if (typeof existingIndex === "number") {
      nextRows[existingIndex] = {
        ...nextRows[existingIndex],
        ...row,
      };
      return;
    }

    nextRows.unshift(row);
    indexById.set(id, 0);
  });

  return nextRows;
};

const removeRowsById = (rows: any[], ids: string[]) => {
  const toRemove = new Set(
    (Array.isArray(ids) ? ids : []).map((id) => String(id || "").trim()).filter(Boolean)
  );
  if (toRemove.size === 0) return Array.isArray(rows) ? rows : [];
  return (Array.isArray(rows) ? rows : []).filter((row) => {
    const id = String(row?.id || row?._id || "").trim();
    return id ? !toRemove.has(id) : true;
  });
};

const buildCustomersQueryResult = (rows: any[], limit: number): CustomersListQueryResult => {
  const safeRows = Array.isArray(rows) ? rows : [];
  const total = safeRows.length;
  return {
    data: safeRows.slice(0, limit),
    total,
    page: 1,
    limit,
    totalPages: Math.max(1, Math.ceil(total / Math.max(1, limit))),
    pagination: {
      total,
      page: 1,
      limit,
      pages: Math.max(1, Math.ceil(total / Math.max(1, limit))),
    },
  };
};

const resourceDefinitions: Record<ResourceId, ResourceDefinition> = {
  "dashboard.summary": {
    id: "dashboard.summary",
    cacheKey: DASHBOARD_SUMMARY_CACHE_KEY,
    kind: "singleton",
    normalizeValue: (value) => value,
  },
  "currencies.base": {
    id: "currencies.base",
    cacheKey: BASE_CURRENCY_CACHE_KEY,
    kind: "singleton",
    normalizeValue: (value) => {
      if (!value || typeof value !== "object") return null;
      const code = String(value?.code || value?.currencyCode || "").trim().toUpperCase();
      return {
        ...value,
        id: String(value?.id || value?._id || value?.currencyId || "").trim(),
        code,
        symbol: String(value?.symbol || value?.currencySymbol || code || "").trim(),
        name: String(value?.name || value?.currencyName || "").trim(),
      };
    },
    afterWrite: () => {
      if (typeof window === "undefined") return;
      window.dispatchEvent(new Event("taban:currency-changed"));
    },
  },
  "customers.list": {
    id: "customers.list",
    cacheKey: CUSTOMERS_CACHE_KEY,
    kind: "list",
    normalizeRow: (row) => normalizeCustomerForQueryCache(row),
    primeQueryCache: (queryClient, rows) => {
      queryClient.setQueryData(customerQueryKeys.list({ page: 1, limit: 50, search: "" }), buildCustomersQueryResult(rows, 50));
      queryClient.setQueryData(customerQueryKeys.list({ page: 1, limit: 1000, search: "" }), buildCustomersQueryResult(rows, 1000));
    },
  },
  "items.list": {
    id: "items.list",
    cacheKey: ITEMS_CACHE_KEY,
    kind: "list",
    normalizeRow: (row) => normalizeItemForQueryCache(row),
    primeQueryCache: (queryClient, rows) => {
      queryClient.setQueryData(itemQueryKeys.list(), rows);
    },
    legacyStorageKey: ITEMS_STORAGE_KEY,
  },
  "addons.list": {
    id: "addons.list",
    cacheKey: ADDONS_CACHE_KEY,
    kind: "list",
    normalizeRow: (row) => normalizeAddon(row),
    legacyStorageKey: ADDONS_STORAGE_KEY,
  },
  "products.list": {
    id: "products.list",
    cacheKey: PRODUCTS_CACHE_KEY,
    kind: "list",
    normalizeRow: (row) => normalizeProductForQueryCache(row),
    primeQueryCache: (queryClient, rows) => {
      queryClient.setQueryData(productQueryKeys.list({ limit: 1000 }), rows);
    },
    legacyStorageKey: PRODUCTS_STORAGE_KEY,
  },
  "plans.list": {
    id: "plans.list",
    cacheKey: PLANS_CACHE_KEY,
    kind: "list",
    normalizeRow: (row) => normalizePlan(row),
    primeQueryCache: (queryClient, rows) => {
      queryClient.setQueryData(planQueryKeys.list(), rows);
    },
    legacyStorageKey: PLANS_STORAGE_KEY,
  },
  "coupons.list": {
    id: "coupons.list",
    cacheKey: COUPONS_CACHE_KEY,
    kind: "list",
    normalizeRow: (row) => normalizeCoupon(row),
    primeQueryCache: (queryClient, rows) => {
      queryClient.setQueryData(couponQueryKeys.list({ limit: 1000 }), rows);
    },
    legacyStorageKey: COUPONS_STORAGE_KEY,
  },
  "price-lists.list": {
    id: "price-lists.list",
    cacheKey: PRICE_LISTS_CACHE_KEY,
    kind: "list",
    normalizeRow: (row) => normalizePriceList(row),
    primeQueryCache: (queryClient, rows) => {
      queryClient.setQueryData(priceListQueryKeys.list({ limit: 1000 }), rows);
    },
    legacyStorageKey: PRICE_LISTS_STORAGE_KEY,
  },
};

export const STARTUP_RESOURCE_IDS = Object.keys(resourceDefinitions) as ResourceId[];

const buildSyncRequest = (definition: ResourceDefinition): SyncResourceRequest => {
  const envelope = readEnvelope<any>(definition.cacheKey);
  const payload = envelope?.payload;
  return {
    id: definition.id,
    version_id: envelope?.version_id || "",
    last_updated: envelope?.last_updated || "",
    count: normalizeCount(payload),
  };
};

const normalizeListRows = (definition: ListResourceDefinition, rows: any[]) =>
  (Array.isArray(rows) ? rows : []).map((row) => definition.normalizeRow(row)).filter(Boolean);

const applyResourceData = async (
  definition: ResourceDefinition,
  result: any,
  queryClient?: QueryClient
) => {
  const currentEnvelope = readEnvelope<any>(definition.cacheKey);

  if (definition.kind === "list") {
    const currentRows = Array.isArray(currentEnvelope?.payload) ? currentEnvelope?.payload : [];
    const nextRows =
      result?.mode === "delta"
        ? removeRowsById(
            mergeRowsById(currentRows, normalizeListRows(definition, result?.upserts)),
            result?.deleted_ids
          )
        : normalizeListRows(definition, result?.data);

    const nextEnvelope: SyncEnvelope<any[]> = {
      version_id: String(result?.version_id || currentEnvelope?.version_id || ""),
      last_updated: String(result?.last_updated || currentEnvelope?.last_updated || ""),
      payload: nextRows,
      pending_sync: false,
    };

    await writeSyncEnvelope(definition.cacheKey, nextEnvelope);
    if (definition.legacyStorageKey) {
      if (definition.legacyStorageKey === ITEMS_STORAGE_KEY) {
        clearLegacyItemCache();
      } else {
        writeLegacyRows(definition.legacyStorageKey, nextRows);
      }
    }
    if (queryClient && definition.primeQueryCache) definition.primeQueryCache(queryClient, nextRows);
    return nextRows;
  }

  const nextValue = definition.normalizeValue(result?.data);
  const nextEnvelope: SyncEnvelope<any> = {
    version_id: String(result?.version_id || currentEnvelope?.version_id || ""),
    last_updated: String(result?.last_updated || currentEnvelope?.last_updated || ""),
    payload: nextValue,
    pending_sync: false,
  };

  await writeSyncEnvelope(definition.cacheKey, nextEnvelope);
  definition.afterWrite?.(nextValue);
  return nextValue;
};

export const primeStartupResources = (queryClient?: QueryClient) => {
  let hasCachedData = false;

  STARTUP_RESOURCE_IDS.forEach((resourceId) => {
    const definition = resourceDefinitions[resourceId];
    const envelope = readEnvelope<any>(definition.cacheKey);
    const payload = envelope?.payload;

    if (!payload) return;
    hasCachedData = true;

    if (definition.kind === "list") {
      const rows = normalizeListRows(definition, payload);
      if (definition.legacyStorageKey) {
        if (definition.legacyStorageKey === ITEMS_STORAGE_KEY) {
          clearLegacyItemCache();
        } else {
          writeLegacyRows(definition.legacyStorageKey, rows);
        }
      }
      if (queryClient && definition.primeQueryCache) definition.primeQueryCache(queryClient, rows);
      return;
    }

    const nextValue = definition.normalizeValue(payload);
    definition.afterWrite?.(nextValue);
  });

  return hasCachedData;
};

export const syncStartupResources = async (options?: {
  queryClient?: QueryClient;
  resourceIds?: Array<ResourceId | string>;
}) => {
  const resourceIds = (options?.resourceIds || STARTUP_RESOURCE_IDS).filter(
    (resourceId): resourceId is ResourceId => Boolean(resourceDefinitions[resourceId])
  );
  const requestedResources = resourceIds.map((resourceId) => buildSyncRequest(resourceDefinitions[resourceId]));

  const validationResponse: any = await startupSyncAPI.validate(requestedResources);
  if (!validationResponse?.success) {
    throw new Error(validationResponse?.message || "Failed to validate startup resources.");
  }

  const validationRows = Array.isArray(validationResponse?.data?.resources)
    ? validationResponse.data.resources
    : [];
  const staleIds = new Set(
    validationRows
      .filter((row: any) => String(row?.status || "") !== "match")
      .map((row: any) => String(row?.id || "").trim())
  );

  if (staleIds.size === 0) {
    return { updated: [] as ResourceId[], stale: [] as ResourceId[] };
  }

  const fetchResponse: any = await startupSyncAPI.fetch(
    requestedResources.filter((resource) => staleIds.has(resource.id))
  );

  if (!fetchResponse?.success) {
    throw new Error(fetchResponse?.message || "Failed to fetch startup resources.");
  }

  const fetchedRows = Array.isArray(fetchResponse?.data?.resources) ? fetchResponse.data.resources : [];
  const updated: ResourceId[] = [];

  for (const row of fetchedRows) {
    const resourceId = String(row?.id || "").trim() as ResourceId;
    const definition = resourceDefinitions[resourceId];
    if (!definition) continue;
    await applyResourceData(definition, row, options?.queryClient);
    updated.push(resourceId);
  }

  return { updated, stale: [...staleIds] as ResourceId[] };
};
