import { useEffect } from "react";
import { useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { itemsAPI } from "../../../services/api";

const ITEM_LIST_STALE_TIME_MS = 30 * 1000;
const ITEM_DETAIL_STALE_TIME_MS = 30 * 1000;

const normalizeItemId = (value: any) => String(value ?? "").trim();

const normalizeItemStatus = (item: any, isActive: boolean) => {
  const status = String(item?.status || "").trim();
  if (status) return status;
  return isActive ? "Active" : "Inactive";
};

export const normalizeItemForQueryCache = (item: any, fallbackId?: string) => {
  if (!item || typeof item !== "object") return null;

  const id = normalizeItemId(item?._id || item?.id || fallbackId);
  if (!id) return null;

  const isActive =
    typeof item?.active === "boolean"
      ? item.active
      : typeof item?.isActive === "boolean"
        ? item.isActive
        : String(item?.status || "active").trim().toLowerCase() !== "inactive";

  return {
    ...item,
    id,
    _id: item?._id || item?.id || id,
    images: Array.isArray(item?.images) ? item.images : item?.image ? [item.image] : [],
    active: isActive,
    isActive,
    status: normalizeItemStatus(item, isActive),
  };
};

const itemMatchesId = (item: any, itemId: string) => {
  const normalizedItemId = normalizeItemId(itemId);
  if (!normalizedItemId) return false;

  return [item?._id, item?.id, item?.itemId, item?.item_id]
    .map((value) => normalizeItemId(value))
    .filter(Boolean)
    .includes(normalizedItemId);
};

const upsertItemInListResult = (existing: any[] | undefined, item: any) => {
  const normalizedItem = normalizeItemForQueryCache(item);
  if (!normalizedItem) return Array.isArray(existing) ? existing : [];

  if (!Array.isArray(existing) || existing.length === 0) {
    return [normalizedItem];
  }

  const index = existing.findIndex((row: any) => itemMatchesId(row, normalizedItem.id));
  if (index >= 0) {
    const nextRows = [...existing];
    nextRows[index] = {
      ...nextRows[index],
      ...normalizedItem,
    };
    return nextRows;
  }

  return [normalizedItem, ...existing];
};

const removeItemFromListResult = (existing: any[] | undefined, itemId: string) => {
  if (!Array.isArray(existing) || existing.length === 0) return existing || [];

  const normalizedItemId = normalizeItemId(itemId);
  if (!normalizedItemId) return existing;

  return existing.filter((row: any) => !itemMatchesId(row, normalizedItemId));
};

const readItemFromAnyCachedList = (queryClient: QueryClient, itemId: string) => {
  const normalizedItemId = normalizeItemId(itemId);
  if (!normalizedItemId) return null;

  const cachedLists = queryClient.getQueriesData<any[]>({
    queryKey: itemQueryKeys.lists(),
  });

  for (const [, rows] of cachedLists) {
    if (!Array.isArray(rows)) continue;
    const matched = rows.find((row: any) => itemMatchesId(row, normalizedItemId));
    if (matched) {
      return normalizeItemForQueryCache(matched, normalizedItemId);
    }
  }

  return null;
};

export const itemQueryKeys = {
  all: () => ["items"] as const,
  lists: () => ["items", "list"] as const,
  list: () => ["items", "list", "all"] as const,
  details: () => ["items", "detail"] as const,
  detail: (itemId: string) => ["items", "detail", normalizeItemId(itemId)] as const,
};

const extractRowsFromResponse = (response: any) => {
  if (!response) return [];
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.items)) return response.items;
  if (Array.isArray(response?.rows)) return response.rows;
  return [];
};

export const fetchItemsList = async () => {
  const perPage = 200;
  const accumulatedRows: any[] = [];
  let page = 1;

  while (true) {
    const response = await itemsAPI.getAll({ page, per_page: perPage });
    if (response?.success === false) {
      throw new Error(response?.message || "Failed to load items");
    }

    const rows = extractRowsFromResponse(response);
    if (rows.length > 0) {
      accumulatedRows.push(...rows);
    }

    const hasMorePage = Boolean(response?.has_more_page);
    if (!hasMorePage || rows.length === 0 || rows.length < perPage) {
      break;
    }

    page += 1;
  }

  return accumulatedRows
    .map((row: any) => normalizeItemForQueryCache(row))
    .filter(Boolean) as any[];
};

export const fetchItemDetail = async (itemId: string) => {
  const normalizedItemId = normalizeItemId(itemId);
  if (!normalizedItemId) {
    throw new Error("Item ID is required");
  }

  const response = await itemsAPI.getById(normalizedItemId);
  if (response?.success === false) {
    throw new Error(response?.message || "Failed to load item");
  }

  const normalizedItem = normalizeItemForQueryCache(response?.data ?? response, normalizedItemId);
  if (!normalizedItem) {
    throw new Error("Item not found");
  }

  return normalizedItem;
};

export const syncItemIntoItemQueries = (queryClient: QueryClient, item: any) => {
  const normalizedItem = normalizeItemForQueryCache(item);
  if (!normalizedItem) return null;

  queryClient.setQueryData(itemQueryKeys.detail(normalizedItem.id), normalizedItem);

  const cachedLists = queryClient.getQueriesData<any[]>({
    queryKey: itemQueryKeys.lists(),
  });

  if (cachedLists.length === 0) {
    queryClient.setQueryData(itemQueryKeys.list(), [normalizedItem]);
    return normalizedItem;
  }

  cachedLists.forEach(([queryKey, rows]) => {
    queryClient.setQueryData(queryKey, upsertItemInListResult(rows, normalizedItem));
  });

  return normalizedItem;
};

export const removeItemFromItemQueries = (queryClient: QueryClient, itemId: string) => {
  const normalizedItemId = normalizeItemId(itemId);
  if (!normalizedItemId) return;

  queryClient.removeQueries({
    queryKey: itemQueryKeys.detail(normalizedItemId),
    exact: true,
  });

  const cachedLists = queryClient.getQueriesData<any[]>({
    queryKey: itemQueryKeys.lists(),
  });

  cachedLists.forEach(([queryKey, rows]) => {
    queryClient.setQueryData(queryKey, removeItemFromListResult(rows, normalizedItemId));
  });
};

export const useItemsListQuery = (options?: { enabled?: boolean; initialData?: any[] }) =>
  useQuery({
    queryKey: itemQueryKeys.list(),
    queryFn: fetchItemsList,
    enabled: options?.enabled ?? true,
    staleTime: ITEM_LIST_STALE_TIME_MS,
    initialData: options?.initialData,
    placeholderData: options?.initialData ?? ((previousData) => previousData),
  });

export const useItemDetailQuery = (
  itemId: string,
  options?: { enabled?: boolean; initialItem?: any }
) => {
  const queryClient = useQueryClient();
  const normalizedItemId = normalizeItemId(itemId);
  const cachedItem = readItemFromAnyCachedList(queryClient, normalizedItemId);
  const initialData =
    normalizeItemForQueryCache(options?.initialItem, normalizedItemId) ||
    cachedItem ||
    undefined;

  const query = useQuery({
    queryKey: itemQueryKeys.detail(normalizedItemId),
    queryFn: () => fetchItemDetail(normalizedItemId),
    enabled: Boolean(normalizedItemId) && (options?.enabled ?? true),
    staleTime: ITEM_DETAIL_STALE_TIME_MS,
    initialData,
  });

  useEffect(() => {
    if (query.data) {
      syncItemIntoItemQueries(queryClient, query.data);
    }
  }, [query.data, queryClient]);

  return query;
};
