import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { getInvoicesPaginated, Invoice } from "../salesModel";

const INVOICE_LIST_STALE_TIME_MS = 30 * 1000;

export type InvoiceListQueryParams = {
  page?: number;
  limit?: number;
  search?: string;
  sort?: string;
  order?: string;
  status?: string;
  status_ne?: string;
};

export type InvoiceListQueryResult = {
  data: Invoice[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
};

const normalizeListParams = (params?: InvoiceListQueryParams) => {
  return {
    page: Math.max(1, Number(params?.page || 1)),
    limit: Math.max(1, Number(params?.limit || 50)),
    search: String(params?.search || "").trim(),
    sort: String(params?.sort || "").trim(),
    order: String(params?.order || "desc").trim(),
    status: params?.status ? String(params.status).trim() : undefined,
    status_ne: params?.status_ne ? String(params.status_ne).trim() : undefined,
  };
};

export const invoiceQueryKeys = {
  all: () => ["invoices"] as const,
  lists: () => ["invoices", "list"] as const,
  list: (params?: InvoiceListQueryParams) => [
    "invoices",
    "list",
    normalizeListParams(params),
  ] as const,
};

const toListResult = (
  response: any,
  params: ReturnType<typeof normalizeListParams>
): InvoiceListQueryResult => {
  const rows = Array.isArray(response?.data) ? response.data : [];
  const total = Number(response?.pagination?.total ?? rows.length) || 0;
  const page = Number(response?.pagination?.page ?? params.page) || params.page;
  const limit = Number(response?.pagination?.limit ?? params.limit) || params.limit;
  const pages =
    Number(response?.pagination?.pages ?? Math.max(1, Math.ceil(total / Math.max(1, limit)))) || 1;

  return {
    data: rows.map((row: any) => {
      const normalized: Invoice = {
        ...row,
        id: row._id || row.id,
      };
      return normalized;
    }),
    pagination: {
      total,
      page,
      limit,
      pages,
    },
  };
};

export const fetchInvoicesList = async (
  params?: InvoiceListQueryParams
): Promise<InvoiceListQueryResult> => {
  const normalizedParams = normalizeListParams(params);
  const response = await getInvoicesPaginated(normalizedParams);
  if (!response) {
    throw new Error("Failed to load invoices");
  }

  return toListResult(response, normalizedParams);
};

export const useInvoicesListQuery = (
  params?: InvoiceListQueryParams,
  options?: { enabled?: boolean }
) =>
  useQuery<InvoiceListQueryResult>({
    queryKey: invoiceQueryKeys.list(params),
    queryFn: () => fetchInvoicesList(params),
    enabled: options?.enabled ?? true,
    staleTime: INVOICE_LIST_STALE_TIME_MS,
    placeholderData: keepPreviousData,
  });
