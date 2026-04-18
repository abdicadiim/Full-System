import { useEffect } from "react";
import { useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { itemsAPI } from "../../../services/api";

const ITEM_LIST_STALE_TIME_MS = 30 * 1000;
const ITEM_DETAIL_STALE_TIME_MS = 30 * 1000;
const ITEM_DEBUG_STORAGE_KEY = "billing_debug_items_v1";
const ITEM_LIST_PAGE_SIZE = 200;

const normalizeItemId = (value: any) => String(value ?? "").trim();

const normalizeItemStatus = (item: any, isActive: boolean) => {
  const status = String(item?.status || "").trim();
  if (status) return status;
  return isActive ? "Active" : "Inactive";
};

export const isItemDebugEnabled = () => {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(ITEM_DEBUG_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
};

export const debugItems = (...args: any[]) => {
  if (!isItemDebugEnabled()) return;
  // Keep debug output lightweight and easy to search in DevTools.
  console.debug("[items-debug]", ...args);
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
  const candidates = [
    response,
    response?.data,
    response?.data?.data,
    response?.data?.data?.items,
    response?.data?.data?.rows,
    response?.data?.data?.results,
    response?.data?.items,
    response?.data?.rows,
    response?.data?.results,
    response?.items,
    response?.rows,
    response?.results,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate;
    }
  }

  return [];
};

const getPaginationPagesFromResponse = (response: any) =>
  Number(
    response?.pagination?.pages ??
    response?.data?.pagination?.pages ??
    response?.data?.data?.pagination?.pages ??
    response?.totalPages ??
    response?.data?.totalPages ??
    response?.data?.data?.totalPages ??
    response?.meta?.pages ??
    response?.data?.meta?.pages ??
    response?.data?.data?.meta?.pages ??
    0
  );

const getPaginationTotalFromResponse = (response: any) =>
  Number(
    response?.pagination?.total ??
    response?.data?.pagination?.total ??
    response?.data?.data?.pagination?.total ??
    response?.total ??
    response?.count ??
    response?.data?.total ??
    response?.data?.count ??
    response?.data?.data?.total ??
    response?.data?.data?.count ??
    response?.meta?.total ??
    response?.data?.meta?.total ??
    response?.data?.data?.meta?.total ??
    0
  );

const getHasMorePageFromResponse = (response: any) =>
  Boolean(
    response?.has_more_page ??
    response?.data?.has_more_page ??
    response?.data?.data?.has_more_page ??
    response?.pagination?.has_more_page ??
    response?.data?.pagination?.has_more_page ??
    response?.data?.data?.pagination?.has_more_page ??
    response?.meta?.hasMore ??
    response?.data?.meta?.hasMore ??
    response?.data?.data?.meta?.hasMore ??
    false
  );

const buildItemsListRequestParams = (page: number, pageSize: number) => ({
  page,
  per_page: pageSize,
  limit: pageSize,
  pageSize,
  size: pageSize,
});

export const readCachedItems = () => {
  return [];
};

const writePreviewItems = (rows: any[]) => {
  // Database-only mode: do not persist items to localStorage.
  void rows;
};

const mergeRemoteAndCachedItems = (remoteRows: any[], cachedRows?: any[]) => {
  const normalizedRemoteRows = (Array.isArray(remoteRows) ? remoteRows : [])
    .map((row: any) => normalizeItemForQueryCache(row))
    .filter(Boolean) as any[];
  void cachedRows;
  return normalizedRemoteRows;
};

type FetchItemsListOptions = {
  queryClient?: QueryClient;
};

export const fetchItemsList = async (options?: FetchItemsListOptions) => {
  const pageSize = ITEM_LIST_PAGE_SIZE;
  const cachedRows = readCachedItems();
  debugItems("starting fetch", {
    cachedRows: cachedRows.length,
    pageSize,
  });

  if (cachedRows.length > 0) {
    // Serve preview cache immediately, then refresh in the background.
    void (async () => {
      try {
        const firstResponse = await itemsAPI.getAll(buildItemsListRequestParams(1, pageSize));
        if (firstResponse?.success === false) {
          debugItems("first page failed", firstResponse?.message || "unknown error");
          return;
        }

        const firstRows = extractRowsFromResponse(firstResponse);
        const accumulatedRows: any[] = [...firstRows];
        const paginationPages = getPaginationPagesFromResponse(firstResponse);
        const paginationTotal = getPaginationTotalFromResponse(firstResponse);
        const hasMorePage = getHasMorePageFromResponse(firstResponse);
        debugItems("page", 1, {
          rows: firstRows.length,
          paginationPages,
          paginationTotal,
          hasMorePage,
        });

        const dedupeById = (rows: any[]) => {
          const seen = new Set<string>();
          return rows.filter((row: any) => {
            const id = normalizeItemId(row?._id || row?.id || row?.itemId || row?.item_id);
            if (!id) return true;
            if (seen.has(id)) return false;
            seen.add(id);
            return true;
          });
        };

        if (
          hasMorePage ||
          paginationPages > 1 ||
          firstRows.length >= pageSize ||
          (paginationTotal > 0 && firstRows.length < paginationTotal)
        ) {
          const inferredPagesFromTotal =
            paginationTotal > 0 && firstRows.length > 0
              ? Math.ceil(paginationTotal / firstRows.length)
              : 0;
          const maxPages = Math.min(
            Math.max(paginationPages, inferredPagesFromTotal, 1),
            1000
          );
          const pageNumbers = Array.from({ length: Math.max(0, maxPages - 1) }, (_, index) => index + 2);

          if (pageNumbers.length > 0) {
            const pageResponses = await Promise.all(
              pageNumbers.map(async (page) => {
                const response = await itemsAPI.getAll(buildItemsListRequestParams(page, pageSize));
                if (response?.success === false) {
                  debugItems("page failed", page, response?.message || "unknown error");
                  throw new Error(response?.message || "Failed to load items");
                }
                return { page, response };
              })
            );

            const backgroundRows = [...accumulatedRows];
            for (const { page, response } of pageResponses) {
              const rows = extractRowsFromResponse(response);
              const nextPaginationPages = getPaginationPagesFromResponse(response);
              const nextPaginationTotal = getPaginationTotalFromResponse(response) || paginationTotal;
              const nextHasMorePage = getHasMorePageFromResponse(response);
              debugItems("page", page, {
                rows: rows.length,
                paginationPages: nextPaginationPages,
                paginationTotal: nextPaginationTotal,
                hasMorePage: nextHasMorePage,
              });
              if (rows.length === 0) continue;

              backgroundRows.push(...rows);
              const uniqueRows = dedupeById(backgroundRows);
              backgroundRows.length = 0;
              backgroundRows.push(...uniqueRows);
            }

            const finalBackgroundRows = mergeRemoteAndCachedItems(dedupeById(backgroundRows), cachedRows);
            debugItems("background finished", {
              finalRows: finalBackgroundRows.length,
            });

            options?.queryClient?.setQueryData(itemQueryKeys.list(), finalBackgroundRows);
            writePreviewItems(finalBackgroundRows);
            return;
          }
        }

        const finalRows = mergeRemoteAndCachedItems(dedupeById(accumulatedRows), cachedRows);
        debugItems("finished fetch", {
          remoteRows: accumulatedRows.length,
          finalRows: finalRows.length,
          cachedRows: cachedRows.length,
        });
        options?.queryClient?.setQueryData(itemQueryKeys.list(), finalRows);
        writePreviewItems(finalRows);
      } catch (error) {
        debugItems("background fetch failed", error instanceof Error ? error.message : String(error));
      }
    })();

    return cachedRows;
  }

  const firstResponse = await itemsAPI.getAll(buildItemsListRequestParams(1, pageSize));
  if (firstResponse?.success === false) {
    debugItems("first page failed", firstResponse?.message || "unknown error");
    const fallbackRows = mergeRemoteAndCachedItems([], cachedRows);
    if (fallbackRows.length > 0) {
      return fallbackRows;
    }
    throw new Error(firstResponse?.message || "Failed to load items");
  }

  const firstRows = extractRowsFromResponse(firstResponse);
  const accumulatedRows: any[] = [...firstRows];
  writePreviewItems(firstRows);
  const paginationPages = getPaginationPagesFromResponse(firstResponse);
  const paginationTotal = getPaginationTotalFromResponse(firstResponse);
  const hasMorePage = getHasMorePageFromResponse(firstResponse);
  debugItems("page", 1, {
    rows: firstRows.length,
    paginationPages,
    paginationTotal,
    hasMorePage,
  });
  const dedupeById = (rows: any[]) => {
    const seen = new Set<string>();
    return rows.filter((row: any) => {
      const id = normalizeItemId(row?._id || row?.id || row?.itemId || row?.item_id);
      if (!id) return true;
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  };

  if (
    hasMorePage ||
    paginationPages > 1 ||
    firstRows.length >= pageSize ||
    (paginationTotal > 0 && firstRows.length < paginationTotal)
  ) {
    const inferredPagesFromTotal =
      paginationTotal > 0 && firstRows.length > 0
        ? Math.ceil(paginationTotal / firstRows.length)
        : 0;
    const maxPages = Math.min(
      Math.max(paginationPages, inferredPagesFromTotal, 1),
      1000
    );
    const pageNumbers = Array.from({ length: Math.max(0, maxPages - 1) }, (_, index) => index + 2);

    if (pageNumbers.length > 0) {
      void (async () => {
        const pageResponses = await Promise.all(
          pageNumbers.map(async (page) => {
            const response = await itemsAPI.getAll(buildItemsListRequestParams(page, pageSize));
            if (response?.success === false) {
              debugItems("page failed", page, response?.message || "unknown error");
              throw new Error(response?.message || "Failed to load items");
            }
            return { page, response };
          })
        );

        const backgroundRows = [...accumulatedRows];
        for (const { page, response } of pageResponses) {
          const rows = extractRowsFromResponse(response);
          const nextPaginationPages = getPaginationPagesFromResponse(response);
          const nextPaginationTotal = getPaginationTotalFromResponse(response) || paginationTotal;
          const nextHasMorePage = getHasMorePageFromResponse(response);
          debugItems("page", page, {
            rows: rows.length,
            paginationPages: nextPaginationPages,
            paginationTotal: nextPaginationTotal,
            hasMorePage: nextHasMorePage,
          });
          if (rows.length === 0) continue;

          backgroundRows.push(...rows);
          const uniqueRows = dedupeById(backgroundRows);
          backgroundRows.length = 0;
          backgroundRows.push(...uniqueRows);
        }

        const finalBackgroundRows = mergeRemoteAndCachedItems(dedupeById(backgroundRows), cachedRows);
        debugItems("background finished", {
          finalRows: finalBackgroundRows.length,
        });

        options?.queryClient?.setQueryData(itemQueryKeys.list(), finalBackgroundRows);
      })().catch((error) => {
        debugItems("background fetch failed", error instanceof Error ? error.message : String(error));
      });
    }
  }

  const finalRows = mergeRemoteAndCachedItems(dedupeById(accumulatedRows), cachedRows);
  debugItems("finished fetch", {
    remoteRows: accumulatedRows.length,
    finalRows: finalRows.length,
    cachedRows: cachedRows.length,
  });
  return finalRows;
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

  if (cachedLists.length === 0) return normalizedItem;

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

export const useItemsListQuery = (options?: { enabled?: boolean }) =>
  {
    const queryClient = useQueryClient();
    const initialData = queryClient.getQueryData<any[]>(itemQueryKeys.list());

    return useQuery({
      queryKey: itemQueryKeys.list(),
      queryFn: () => fetchItemsList({ queryClient }),
      enabled: options?.enabled ?? true,
      staleTime: 0,
      initialData,
      placeholderData: (previousData) => previousData,
      refetchOnMount: "always",
      refetchOnWindowFocus: false,
    });
  };

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
