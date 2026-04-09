import { useEffect } from "react";
import {
  keepPreviousData,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import { getQuoteById, getQuotes, mapQuoteFromApi } from "../salesModel";

const QUOTE_LIST_STALE_TIME_MS = 30 * 1000;
const QUOTE_DETAIL_STALE_TIME_MS = 30 * 1000;

const normalizeQuoteId = (value: any) => String(value ?? "").trim();

const normalizeQuoteForCache = (row: any, fallbackId?: string) => {
  if (!row || typeof row !== "object") return null;
  const id = normalizeQuoteId(row?._id || row?.id || row?.quoteId || fallbackId);
  if (!id) return null;
  const normalized = mapQuoteFromApi(row);
  return normalized ? { ...normalized, id: normalized.id || id, _id: normalized._id || id } : null;
};

const quoteMatchesId = (quote: any, quoteId: string) => {
  const normalizedId = normalizeQuoteId(quoteId);
  if (!normalizedId) return false;

  return [quote?._id, quote?.id, quote?.quoteId]
    .map((value) => normalizeQuoteId(value))
    .filter(Boolean)
    .includes(normalizedId);
};

const readQuoteFromAnyCachedList = (queryClient: QueryClient, quoteId: string) => {
  const normalized = normalizeQuoteId(quoteId);
  if (!normalized) return null;

  const cachedLists = queryClient.getQueriesData<any[]>({
    queryKey: quoteQueryKeys.lists(),
  });

  for (const [, rows] of cachedLists) {
    if (!Array.isArray(rows)) continue;
    const matched = rows.find((row) => quoteMatchesId(row, normalized));
    if (matched) return normalizeQuoteForCache(matched, normalized);
  }

  return null;
};

export const quoteQueryKeys = {
  all: () => ["quotes"] as const,
  lists: () => ["quotes", "list"] as const,
  list: () => ["quotes", "list", { limit: 1000 }] as const,
  details: () => ["quotes", "detail"] as const,
  detail: (quoteId: string) => ["quotes", "detail", normalizeQuoteId(quoteId)] as const,
};

export const fetchQuotesList = async () => {
  const response = await getQuotes();
  return Array.isArray(response) ? response : [];
};

export const fetchQuoteDetail = async (quoteId: string) => {
  const normalizedId = normalizeQuoteId(quoteId);
  if (!normalizedId) throw new Error("Quote ID is required");

  const response = await getQuoteById(normalizedId);
  if (!response) {
    throw new Error("Quote not found");
  }

  const normalized = normalizeQuoteForCache(response, normalizedId);
  if (!normalized) throw new Error("Quote not found");
  return normalized;
};

const upsertQuoteInList = (existing: any[] | undefined, quote: any) => {
  if (!Array.isArray(existing)) return [quote];
  const index = existing.findIndex((row) => quoteMatchesId(row, quote.id));
  if (index >= 0) {
    const copy = [...existing];
    copy[index] = { ...copy[index], ...quote };
    return copy;
  }
  return [quote, ...existing];
};

export const syncQuoteIntoQueries = (queryClient: QueryClient, quote: any) => {
  const normalized = normalizeQuoteForCache(quote);
  if (!normalized) return null;

  queryClient.setQueryData(quoteQueryKeys.detail(normalized.id), normalized);

  const cachedLists = queryClient.getQueriesData<any[]>({ queryKey: quoteQueryKeys.lists() });
  if (cachedLists.length === 0) {
    queryClient.setQueryData(quoteQueryKeys.list(), [normalized]);
    return normalized;
  }

  cachedLists.forEach(([queryKey]) => {
    queryClient.setQueryData(queryKey, (prev: any[] | undefined) => upsertQuoteInList(prev, normalized));
  });

  return normalized;
};

export const removeQuoteFromQueries = (queryClient: QueryClient, quoteId: string) => {
  const normalized = normalizeQuoteId(quoteId);
  if (!normalized) return;

  queryClient.removeQueries({ queryKey: quoteQueryKeys.detail(normalized) });

  const cachedLists = queryClient.getQueriesData<any[]>({ queryKey: quoteQueryKeys.lists() });
  cachedLists.forEach(([queryKey]) => {
    queryClient.setQueryData(queryKey, (prev: any[] | undefined) =>
      Array.isArray(prev) ? prev.filter((row) => !quoteMatchesId(row, normalized)) : prev
    );
  });
};

export const invalidateQuoteQueries = async (queryClient: QueryClient, quoteId?: string) => {
  const tasks: Promise<unknown>[] = [
    queryClient.invalidateQueries({ queryKey: quoteQueryKeys.lists() }),
  ];
  if (quoteId) {
    tasks.push(
      queryClient.invalidateQueries({
        queryKey: quoteQueryKeys.detail(normalizeQuoteId(quoteId)),
      })
    );
  }
  await Promise.all(tasks);
};

export const useQuotesListQuery = (options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: quoteQueryKeys.list(),
    queryFn: fetchQuotesList,
    enabled: options?.enabled ?? true,
    staleTime: QUOTE_LIST_STALE_TIME_MS,
    placeholderData: keepPreviousData,
  });
};

export const useQuoteDetailQuery = (
  quoteId: string | undefined,
  options?: { enabled?: boolean; initialQuote?: any }
) => {
  const queryClient = useQueryClient();
  const normalizedQuoteId = normalizeQuoteId(quoteId);
  const initialData = normalizedQuoteId
    ? normalizeQuoteForCache(options?.initialQuote, normalizedQuoteId) ?? readQuoteFromAnyCachedList(queryClient, normalizedQuoteId)
    : undefined;

  const query = useQuery({
    queryKey: quoteQueryKeys.detail(normalizedQuoteId),
    queryFn: () => fetchQuoteDetail(normalizedQuoteId),
    enabled: Boolean(normalizedQuoteId) && (options?.enabled ?? true),
    staleTime: QUOTE_DETAIL_STALE_TIME_MS,
    initialData,
  });

  useEffect(() => {
    if (query.data) {
      syncQuoteIntoQueries(queryClient, query.data);
    }
  }, [query.data, queryClient]);

  return query;
};
