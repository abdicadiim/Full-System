import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { getSalesReceiptsPaginated, getSalesReceiptById } from "../salesModel";

export type SalesReceiptQueryParams = {
  page?: number;
  limit?: number;
  status?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
};

export type SalesReceiptListQueryResult = {
  data: any[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
};

const DEFAULT_LIMIT = 50;

const normalizeParams = (params?: SalesReceiptQueryParams) => {
  return {
    page: Math.max(1, Number(params?.page || 1)),
    limit: Math.max(1, Number(params?.limit || DEFAULT_LIMIT)),
    status: params?.status ? String(params.status).trim() : undefined,
    sortBy: params?.sortBy ? String(params.sortBy).trim() : undefined,
    sortOrder: params?.sortOrder ? String(params.sortOrder).toLowerCase() as "asc" | "desc" : "desc",
  };
};

export const salesReceiptsQueryKeys = {
  all: () => ["sales-receipts"] as const,
  lists: () => ["sales-receipts", "list"] as const,
  list: (params?: SalesReceiptQueryParams) =>
    ["sales-receipts", "list", normalizeParams(params)] as const,
  detail: (id: string) => ["sales-receipts", "detail", id] as const,
};

const toListResult = (
  response: any,
  params: ReturnType<typeof normalizeParams>
): SalesReceiptListQueryResult => {
  const rows = Array.isArray(response?.data) ? response.data : [];
  const total = Number(response?.pagination?.total ?? rows.length) || 0;
  const page = Number(response?.pagination?.page ?? params.page) || params.page;
  const limit = Number(response?.pagination?.limit ?? params.limit) || params.limit;
  const pages =
    Number(
      response?.pagination?.pages ??
        Math.max(1, Math.ceil(total / Math.max(1, limit)))
    ) || 1;

  return {
    data: rows,
    pagination: {
      total,
      page,
      limit,
      pages,
    },
  };
};

export const fetchSalesReceiptsList = async (
  params?: SalesReceiptQueryParams
): Promise<SalesReceiptListQueryResult> => {
  const normalized = normalizeParams(params);
  const response = await getSalesReceiptsPaginated(normalized);
  if (!response) {
    throw new Error("Failed to load sales receipts");
  }
  return toListResult(response, normalized);
};

export const useSalesReceiptsListQuery = (
  params?: SalesReceiptQueryParams,
  options?: { enabled?: boolean }
) =>
  useQuery<SalesReceiptListQueryResult>({
    queryKey: salesReceiptsQueryKeys.list(params),
    queryFn: () => fetchSalesReceiptsList(params),
    enabled: options?.enabled ?? true,
    staleTime: 30 * 1000,
    placeholderData: keepPreviousData,
  });

export const fetchSalesReceiptById = async (id?: string) => {
  const normalized = String(id || "").trim();
  if (!normalized) {
    throw new Error("Missing receipt ID");
  }

  const receipt = await getSalesReceiptById(normalized);
  if (!receipt) {
    throw new Error("Sales receipt not found");
  }

  return receipt;
};

export const useSalesReceiptQuery = (id?: string, options?: { enabled?: boolean }) =>
  useQuery({
    queryKey: salesReceiptsQueryKeys.detail(String(id || "")),
    queryFn: () => fetchSalesReceiptById(id),
    enabled: options?.enabled ?? Boolean(id),
    staleTime: 30 * 1000,
    cacheTime: 5 * 60 * 1000,
  });
