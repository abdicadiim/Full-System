import { queryClient } from "../queryClient";
import { customerQueryKeys, normalizeCustomerForQueryCache, type CustomersListQueryResult } from "../../pages/Customers/customerQueries";
import { startupSyncAPI } from "../../services/api";
import { readSyncEnvelope, type SyncEnvelope, writeSyncEnvelope, createLocalVersionId } from "../sync/syncStorage";

export const DASHBOARD_SUMMARY_CACHE_KEY = "invoice_dashboard_summary_v1";
export const BASE_CURRENCY_CACHE_KEY = "invoice_base_currency_v1";
export const CUSTOMERS_CACHE_KEY = "invoice_customers_sync_v1";
const LEGACY_CURRENCY_KEYS = ["taban_currencies", "taban_books_currencies"];

type ResourceId = "dashboard.summary" | "currencies.base" | "customers.list";

type ListResourceDefinition = {
  id: ResourceId;
  cacheKeyBase: string;
  kind: "list";
  normalizeRow: (row: any) => any;
  primeQueryCache?: (rows: any[], context?: Record<string, any>) => void;
  legacyStorageKey?: string;
};

type SingletonResourceDefinition = {
  id: ResourceId;
  cacheKeyBase: string;
  kind: "singleton";
  normalizeValue: (value: any) => any;
  afterWrite?: (value: any) => void;
  primeQueryCache?: (value: any, context?: Record<string, any>) => void;
};

type ResourceDefinition = ListResourceDefinition | SingletonResourceDefinition;

type SyncResourceRequest = {
  id: ResourceId;
  version_id?: string;
  last_updated?: string;
  count?: number;
};

const nowIso = () => new Date().toISOString();
const hasLocalStorage = () => typeof window !== "undefined" && typeof window.localStorage !== "undefined";

const orgScopedKey = (baseKey: string, organizationId = "global") =>
  `${baseKey}:${String(organizationId || "global").trim() || "global"}`;

const readEnvelope = <T>(cacheKeyBase: string, organizationId = "global") => readSyncEnvelope<T>(orgScopedKey(cacheKeyBase, organizationId));

const normalizeCount = (value: unknown) => {
  if (Array.isArray(value)) return value.length;
  if (value && typeof value === "object") return 1;
  return 0;
};

const normalizeCustomerRow = (row: any) => normalizeCustomerForQueryCache(row);

const buildCustomersQueryResult = (rows: any[], limit: number): CustomersListQueryResult => {
  const safeRows = Array.isArray(rows) ? rows : [];
  const total = safeRows.length;
  const page = 1;
  const nextLimit = Math.max(1, limit);
  const pages = Math.max(1, Math.ceil(total / nextLimit));

  return {
    data: safeRows.slice(0, nextLimit),
    total,
    page,
    limit: nextLimit,
    totalPages: pages,
    pagination: {
      total,
      page,
      limit: nextLimit,
      pages,
    },
  };
};

const writeLegacyCurrencyCache = (value: any) => {
  if (!hasLocalStorage()) return;
  const rows = value ? [value] : [];
  try {
    LEGACY_CURRENCY_KEYS.forEach((key) => localStorage.setItem(key, JSON.stringify(rows)));
  } catch {
  }
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

const resourceDefinitions: Record<ResourceId, ResourceDefinition> = {
  "dashboard.summary": {
    id: "dashboard.summary",
    cacheKeyBase: DASHBOARD_SUMMARY_CACHE_KEY,
    kind: "singleton",
    normalizeValue: (value) => value,
    primeQueryCache: (value, context) => {
      const organizationId = String(context?.organizationId || "global").trim() || "global";
      const baseCurrencyCode = String(context?.baseCurrencyCode || "").trim().toUpperCase();
      queryClient.setQueryData(["dashboard", "summary", organizationId, baseCurrencyCode], value);
    },
  },
  "currencies.base": {
    id: "currencies.base",
    cacheKeyBase: BASE_CURRENCY_CACHE_KEY,
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
    afterWrite: (value) => {
      writeLegacyCurrencyCache(value);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("taban:currency-changed"));
      }
    },
    primeQueryCache: (value) => {
      writeLegacyCurrencyCache(value);
    },
  },
  "customers.list": {
    id: "customers.list",
    cacheKeyBase: CUSTOMERS_CACHE_KEY,
    kind: "list",
    normalizeRow: normalizeCustomerRow,
    primeQueryCache: (rows) => {
      queryClient.setQueryData(customerQueryKeys.list({ page: 1, limit: 50, search: "" }), buildCustomersQueryResult(rows, 50));
      queryClient.setQueryData(customerQueryKeys.list({ page: 1, limit: 1000, search: "" }), buildCustomersQueryResult(rows, 1000));
    },
  },
};

const buildSyncRequest = (definition: ResourceDefinition, organizationId: string): SyncResourceRequest => {
  const envelope = readEnvelope<any>(definition.cacheKeyBase, organizationId);
  return {
    id: definition.id,
    version_id: envelope?.version_id || "",
    last_updated: envelope?.last_updated || "",
    count: normalizeCount(envelope?.payload),
  };
};

const normalizeListRows = (definition: ListResourceDefinition, rows: any[]) =>
  (Array.isArray(rows) ? rows : []).map((row) => definition.normalizeRow(row)).filter(Boolean);

const applyResourceData = async (
  definition: ResourceDefinition,
  result: any,
  context: Record<string, any>
) => {
  const currentEnvelope = readEnvelope<any>(definition.cacheKeyBase, context.organizationId);
  const scopedCacheKey = orgScopedKey(definition.cacheKeyBase, context.organizationId);

  if (definition.kind === "list") {
    const currentRows = Array.isArray(currentEnvelope?.payload) ? currentEnvelope?.payload : [];
    const nextRows =
      result?.mode === "delta"
        ? removeRowsById(
            mergeRowsById(currentRows, normalizeListRows(definition, result?.upserts)),
            Array.isArray(result?.deleted_ids) ? result.deleted_ids : []
          )
        : normalizeListRows(definition, result?.data);
    const nextEnvelope: SyncEnvelope<any[]> = {
      version_id: String(result?.version_id || currentEnvelope?.version_id || createLocalVersionId()),
      last_updated: String(result?.last_updated || currentEnvelope?.last_updated || nowIso()),
      payload: nextRows,
      pending_sync: false,
    };

    await writeSyncEnvelope(scopedCacheKey, nextEnvelope);
    definition.primeQueryCache?.(nextRows, context);
    return nextRows;
  }

  const nextValue = definition.normalizeValue(result?.data);
  const nextEnvelope: SyncEnvelope<any> = {
    version_id: String(result?.version_id || currentEnvelope?.version_id || createLocalVersionId()),
    last_updated: String(result?.last_updated || currentEnvelope?.last_updated || nowIso()),
    payload: nextValue,
    pending_sync: false,
  };

  await writeSyncEnvelope(scopedCacheKey, nextEnvelope);
  definition.afterWrite?.(nextValue);
  definition.primeQueryCache?.(nextValue, context);
  return nextValue;
};

export const primeStartupResources = (options?: { organizationId?: string }) => {
  const context = {
    organizationId: String(options?.organizationId || "global").trim() || "global",
    baseCurrencyCode: "",
  };
  let hasCachedData = false;

  const orderedResourceIds: ResourceId[] = ["currencies.base", "customers.list", "dashboard.summary"];

  orderedResourceIds.forEach((resourceId) => {
    const definition = resourceDefinitions[resourceId];
    const envelope = readEnvelope<any>(definition.cacheKeyBase, context.organizationId);
    const payload = envelope?.payload;
    if (payload === undefined || payload === null) return;
    hasCachedData = true;

    if (definition.kind === "list") {
      const rows = normalizeListRows(definition, payload);
      definition.primeQueryCache?.(rows, context);
      return;
    }

    const nextValue = definition.normalizeValue(payload);
    definition.afterWrite?.(nextValue);
    if (definition.id === "currencies.base") {
      context.baseCurrencyCode = String((nextValue as any)?.code || "").trim().toUpperCase();
    }
    definition.primeQueryCache?.(nextValue, context);
  });

  return hasCachedData;
};

export const syncStartupResources = async (options?: {
  organizationId?: string;
}) => {
  const context = {
    organizationId: String(options?.organizationId || "global").trim() || "global",
    baseCurrencyCode: "",
  };

  const resourceIds = Object.keys(resourceDefinitions) as ResourceId[];
  const requestedResources = resourceIds.map((resourceId) => buildSyncRequest(resourceDefinitions[resourceId], context.organizationId));

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
    const cachedCurrency = readEnvelope<any>(BASE_CURRENCY_CACHE_KEY, context.organizationId)?.payload;
    context.baseCurrencyCode = String(cachedCurrency?.code || "").trim().toUpperCase();
    const cachedDashboard = readEnvelope<any>(DASHBOARD_SUMMARY_CACHE_KEY, context.organizationId)?.payload;
    resourceDefinitions["currencies.base"].primeQueryCache?.(cachedCurrency, context);
    resourceDefinitions["dashboard.summary"].primeQueryCache?.(cachedDashboard, context);
    return { updated: [] as ResourceId[], stale: [] as ResourceId[] };
  }

  const fetchResponse: any = await startupSyncAPI.fetch(
    requestedResources.filter((resource) => staleIds.has(resource.id))
  );

  if (!fetchResponse?.success) {
    throw new Error(fetchResponse?.message || "Failed to fetch startup resources.");
  }

  const fetchedRows = Array.isArray(fetchResponse?.data?.resources) ? fetchResponse.data.resources : [];
  const updatesById = new Map<string, any>();
  const updated: ResourceId[] = [];

  for (const row of fetchedRows) {
    const resourceId = String(row?.id || "").trim() as ResourceId;
    const definition = resourceDefinitions[resourceId];
    if (!definition) continue;
    const data = await applyResourceData(definition, row, context);
    updatesById.set(resourceId, data);
    updated.push(resourceId);

    if (resourceId === "currencies.base") {
      context.baseCurrencyCode = String((data as any)?.code || "").trim().toUpperCase();
    }
  }

  const cachedDashboard = updatesById.get("dashboard.summary") || readEnvelope<any>(DASHBOARD_SUMMARY_CACHE_KEY, context.organizationId)?.payload;
  const cachedCurrency = updatesById.get("currencies.base") || readEnvelope<any>(BASE_CURRENCY_CACHE_KEY, context.organizationId)?.payload;
  context.baseCurrencyCode = String(cachedCurrency?.code || context.baseCurrencyCode || "").trim().toUpperCase();
  resourceDefinitions["dashboard.summary"].primeQueryCache?.(cachedDashboard, context);
  resourceDefinitions["currencies.base"].primeQueryCache?.(cachedCurrency, context);

  return { updated, stale: [...staleIds] as ResourceId[] };
};
