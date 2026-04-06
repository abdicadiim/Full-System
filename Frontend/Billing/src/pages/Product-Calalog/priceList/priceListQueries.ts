import { useEffect } from "react";
import {
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import { priceListsAPI } from "../../../services/api";

const PRICE_LIST_LIST_STALE_TIME_MS = 30 * 1000;
const PRICE_LIST_DETAIL_STALE_TIME_MS = 30 * 1000;

const normalizePriceListId = (value: any) => String(value ?? "").trim();

const ensureArray = <T>(value: any): T[] => {
  if (Array.isArray(value)) return value;
  if (value === undefined || value === null) return [];
  return [value];
};

export const normalizePriceList = (row: any, fallbackId?: string) => {
  if (!row || typeof row !== "object") return null;

  const id = normalizePriceListId(row?.id || row?._id || row?.priceListId || fallbackId);
  if (!id) return null;

  const product = String(row?.product || row?.productName || row?.product_id || "").trim();
  const currency = String(row?.currency || row?.currencyCode || "").trim();
  const name = String(row?.name || row?.priceListName || "").trim();
  const status = String(row?.status || row?.state || "Active").trim();
  const productRates = ensureArray<any>(row?.productRates || row?.rates || row?.pricing || []);

  return {
    ...row,
    id,
    _id: row?._id || row?.id || id,
    priceListId: id,
    name,
    currency,
    status,
    description: String(row?.description || row?.details || "").trim(),
    product,
    productName: product,
    productRates,
  };
};

const priceListMatchesId = (row: any, id: string) => {
  const normalized = normalizePriceListId(id);
  if (!normalized) return false;
  return [row?._id, row?.id, row?.priceListId].map((value) => normalizePriceListId(value)).filter(Boolean).includes(normalized);
};

const readPriceListFromAnyCachedList = (queryClient: QueryClient, priceListId: string) => {
  const normalized = normalizePriceListId(priceListId);
  if (!normalized) return null;

  const cached = queryClient.getQueriesData<any[]>({
    queryKey: priceListQueryKeys.lists(),
  });

  for (const [, rows] of cached) {
    if (!Array.isArray(rows)) continue;
    const match = rows.find((row) => priceListMatchesId(row, normalized));
    if (match) {
      return normalizePriceList(match, normalized);
    }
  }

  return null;
};

export const priceListQueryKeys = {
  all: () => ["price-lists"] as const,
  lists: () => ["price-lists", "list"] as const,
  list: (params?: { limit?: number }) =>
    ["price-lists", "list", { limit: Math.max(1, Number(params?.limit || 1000)) }] as const,
  detail: (priceListId: string) => ["price-lists", "detail", normalizePriceListId(priceListId)] as const,
};

export const fetchPriceLists = async (params?: { limit?: number }) => {
  const normalizedParams = { limit: Math.max(1, Number(params?.limit || 1000)) };
  const response = await priceListsAPI.list(normalizedParams);
  if (response?.success === false) {
    throw new Error(response?.message || "Failed to load price lists");
  }
  const rows = Array.isArray(response?.data) ? response.data : [];
  return rows
    .map((row: any) => normalizePriceList(row))
    .filter(Boolean) as any[];
};

export const fetchPriceListDetail = async (priceListId: string) => {
  const normalizedId = normalizePriceListId(priceListId);
  if (!normalizedId) throw new Error("Price list ID is required");

  const response = await priceListsAPI.getById(normalizedId);
  if (response?.success === false) {
    throw new Error(response?.message || "Failed to load price list");
  }

  const priceList = normalizePriceList(response?.data || response, normalizedId);
  if (!priceList) throw new Error("Price list not found");
  return priceList;
};

const upsertPriceListInList = (existing: any[] | undefined, priceList: any) => {
  if (!Array.isArray(existing)) return [priceList];
  const index = existing.findIndex((row) => priceListMatchesId(row, priceList.id));
  if (index >= 0) {
    const copy = [...existing];
    copy[index] = { ...copy[index], ...priceList };
    return copy;
  }
  return [priceList, ...existing];
};

export const syncPriceListIntoQueries = (queryClient: QueryClient, priceList: any) => {
  const normalized = normalizePriceList(priceList);
  if (!normalized) return null;

  queryClient.setQueryData(priceListQueryKeys.detail(normalized.id), normalized);

  const cached = queryClient.getQueriesData<any[]>({ queryKey: priceListQueryKeys.lists() });
  if (cached.length === 0) {
    queryClient.setQueryData(priceListQueryKeys.list(), [normalized]);
    return normalized;
  }

  cached.forEach(([queryKey, rows]) => {
    queryClient.setQueryData(queryKey, (prev: any[] | undefined) => upsertPriceListInList(prev, normalized));
  });

  return normalized;
};

export const invalidatePriceListQueries = async (queryClient: QueryClient, priceListId?: string) => {
  const tasks: Promise<unknown>[] = [queryClient.invalidateQueries({ queryKey: priceListQueryKeys.lists() })];
  if (priceListId) {
    tasks.push(queryClient.invalidateQueries({ queryKey: priceListQueryKeys.detail(normalizePriceListId(priceListId)) }));
  }
  await Promise.all(tasks);
};

export const usePriceListsQuery = (
  options?: { enabled?: boolean; limit?: number }
) => {
  const normalizedParams = { limit: Math.max(1, Number(options?.limit || 1000)) };

  return useQuery({
    queryKey: priceListQueryKeys.list(normalizedParams),
    queryFn: () => fetchPriceLists(normalizedParams),
    enabled: options?.enabled ?? true,
    staleTime: PRICE_LIST_LIST_STALE_TIME_MS,
    placeholderData: (previousData) => previousData,
  });
};

export const usePriceListDetailQuery = (
  priceListId: string | undefined,
  options?: { enabled?: boolean; initialPriceList?: any }
) => {
  const queryClient = useQueryClient();
  const normalizedId = normalizePriceListId(priceListId);
  const cached = normalizedId ? readPriceListFromAnyCachedList(queryClient, normalizedId) : null;
  const initialData =
    normalizePriceList(options?.initialPriceList, normalizedId) ||
    cached ||
    undefined;

  const query = useQuery({
    queryKey: priceListQueryKeys.detail(normalizedId),
    queryFn: () => fetchPriceListDetail(normalizedId),
    enabled: Boolean(normalizedId) && (options?.enabled ?? true),
    staleTime: PRICE_LIST_DETAIL_STALE_TIME_MS,
    initialData,
  });

  useEffect(() => {
    if (query.data) {
      syncPriceListIntoQueries(queryClient, query.data);
    }
  }, [query.data, queryClient]);

  return query;
};
