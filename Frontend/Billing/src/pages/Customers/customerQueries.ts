import { useEffect } from "react";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import { customersAPI } from "../../services/api";

export type CustomerListQueryParams = {
  page?: number;
  limit?: number;
  search?: string;
};

export type CustomersListQueryResult = {
  data: any[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
};

const CUSTOMER_LIST_STALE_TIME_MS = 30 * 1000;
const CUSTOMER_DETAIL_STALE_TIME_MS = 30 * 1000;

const normalizeCustomerId = (value: any) => String(value ?? "").trim();

const buildCustomerDisplayName = (customer: any) =>
  String(
    customer?.displayName ||
      customer?.companyName ||
      customer?.name ||
      `${customer?.firstName || ""} ${customer?.lastName || ""}`.trim() ||
      "Customer"
  ).trim() || "Customer";

export const normalizeCustomerForQueryCache = (customer: any, fallbackId?: string) => {
  if (!customer || typeof customer !== "object") return null;

  const id = normalizeCustomerId(customer?._id || customer?.id || fallbackId);
  if (!id) return null;

  const displayName = buildCustomerDisplayName(customer);

  return {
    ...customer,
    id,
    _id: customer?._id || customer?.id || id,
    name: displayName,
    displayName,
  };
};

const customerMatchesId = (customer: any, customerId: string) => {
  const normalizedCustomerId = normalizeCustomerId(customerId);
  if (!normalizedCustomerId) return false;

  return [
    customer?._id,
    customer?.id,
    customer?.customerId,
    customer?.customer_id,
  ]
    .map((value) => normalizeCustomerId(value))
    .filter(Boolean)
    .includes(normalizedCustomerId);
};

const normalizeCustomerListParams = (params?: CustomerListQueryParams) => ({
  page: Math.max(1, Number(params?.page || 1)),
  limit: Math.max(1, Number(params?.limit || 50)),
  search: String(params?.search || "").trim(),
});

const toListQueryResult = (
  response: any,
  params: ReturnType<typeof normalizeCustomerListParams>
): CustomersListQueryResult => {
  const rows = Array.isArray(response?.data) ? response.data : [];
  const normalizedRows = rows
    .map((row: any) => normalizeCustomerForQueryCache(row))
    .filter(Boolean) as any[];

  const total = Number(response?.pagination?.total ?? response?.total ?? normalizedRows.length) || 0;
  const page = Number(response?.pagination?.page ?? response?.page ?? params.page) || params.page;
  const limit = Number(response?.pagination?.limit ?? response?.limit ?? params.limit) || params.limit;
  const pages =
    Number(response?.pagination?.pages ?? response?.totalPages ?? Math.max(1, Math.ceil(total / limit))) || 1;

  return {
    data: normalizedRows,
    total,
    page,
    limit,
    totalPages: pages,
    pagination: {
      total,
      page,
      limit,
      pages,
    },
  };
};

const readCustomerFromListResult = (result: CustomersListQueryResult | undefined, customerId: string) => {
  if (!result || !Array.isArray(result.data)) return null;
  return result.data.find((row: any) => customerMatchesId(row, customerId)) || null;
};

const readCustomerFromAnyCachedList = (queryClient: QueryClient, customerId: string) => {
  const normalizedCustomerId = normalizeCustomerId(customerId);
  if (!normalizedCustomerId) return null;

  const cachedListQueries = queryClient.getQueriesData<CustomersListQueryResult>({
    queryKey: customerQueryKeys.lists(),
  });

  for (const [, result] of cachedListQueries) {
    const matched = readCustomerFromListResult(result, normalizedCustomerId);
    if (matched) {
      return normalizeCustomerForQueryCache(matched, normalizedCustomerId);
    }
  }

  return null;
};

const parseListParamsFromQueryKey = (queryKey: readonly unknown[]) => {
  const params =
    queryKey.length >= 3 && queryKey[2] && typeof queryKey[2] === "object"
      ? (queryKey[2] as CustomerListQueryParams)
      : {};

  return normalizeCustomerListParams(params);
};

const upsertCustomerInListResult = (
  existing: CustomersListQueryResult | undefined,
  customer: any,
  queryKey: readonly unknown[]
) => {
  if (!existing || !Array.isArray(existing.data)) return existing;

  const normalizedCustomer = normalizeCustomerForQueryCache(customer);
  if (!normalizedCustomer) return existing;

  const params = parseListParamsFromQueryKey(queryKey);
  const existingIndex = existing.data.findIndex((row: any) => customerMatchesId(row, normalizedCustomer.id));

  if (existingIndex >= 0) {
    const nextRows = [...existing.data];
    nextRows[existingIndex] = {
      ...nextRows[existingIndex],
      ...normalizedCustomer,
    };
    return {
      ...existing,
      data: nextRows,
    };
  }

  if (params.search) {
    return existing;
  }

  if (params.page !== 1) {
    return existing;
  }

  const nextRows = [normalizedCustomer, ...existing.data];
  const trimmedRows = nextRows.slice(0, existing.limit || nextRows.length);
  const nextTotal = existing.total + 1;
  const nextPages = Math.max(1, Math.ceil(nextTotal / Math.max(1, existing.limit || params.limit)));

  return {
    ...existing,
    data: trimmedRows,
    total: nextTotal,
    totalPages: nextPages,
    pagination: {
      ...existing.pagination,
      total: nextTotal,
      pages: nextPages,
    },
  };
};

const removeCustomerFromListResult = (
  existing: CustomersListQueryResult | undefined,
  customerId: string
) => {
  if (!existing || !Array.isArray(existing.data)) return existing;

  const normalizedCustomerId = normalizeCustomerId(customerId);
  if (!normalizedCustomerId) return existing;

  const nextRows = existing.data.filter((row: any) => !customerMatchesId(row, normalizedCustomerId));
  if (nextRows.length === existing.data.length) return existing;

  const nextTotal = Math.max(0, existing.total - (existing.data.length - nextRows.length));
  const nextPages = Math.max(1, Math.ceil(nextTotal / Math.max(1, existing.limit || 1)));

  return {
    ...existing,
    data: nextRows,
    total: nextTotal,
    totalPages: nextPages,
    pagination: {
      ...existing.pagination,
      total: nextTotal,
      pages: nextPages,
    },
  };
};

export const customerQueryKeys = {
  all: () => ["customers"] as const,
  lists: () => ["customers", "list"] as const,
  list: (params?: CustomerListQueryParams) =>
    ["customers", "list", normalizeCustomerListParams(params)] as const,
  details: () => ["customers", "detail"] as const,
  detail: (customerId: string) => ["customers", "detail", normalizeCustomerId(customerId)] as const,
};

export const fetchCustomersList = async (
  params?: CustomerListQueryParams
): Promise<CustomersListQueryResult> => {
  const normalizedParams = normalizeCustomerListParams(params);
  const response = await customersAPI.getAll(normalizedParams);

  if (!response?.success) {
    throw new Error(response?.message || "Failed to load customers");
  }

  return toListQueryResult(response, normalizedParams);
};

export const fetchCustomerDetail = async (customerId: string) => {
  const normalizedCustomerId = normalizeCustomerId(customerId);
  if (!normalizedCustomerId) {
    throw new Error("Customer ID is required");
  }

  const response = await customersAPI.getById(normalizedCustomerId);
  if (!response?.success) {
    throw new Error(response?.message || "Failed to load customer");
  }

  const normalizedCustomer = normalizeCustomerForQueryCache(response?.data, normalizedCustomerId);
  if (!normalizedCustomer) {
    throw new Error("Customer not found");
  }

  return normalizedCustomer;
};

export const syncCustomerIntoCustomerQueries = (queryClient: QueryClient, customer: any) => {
  const normalizedCustomer = normalizeCustomerForQueryCache(customer);
  if (!normalizedCustomer) return null;

  queryClient.setQueryData(customerQueryKeys.detail(normalizedCustomer.id), normalizedCustomer);

  const cachedListQueries = queryClient.getQueryCache().findAll({
    queryKey: customerQueryKeys.lists(),
  });

  cachedListQueries.forEach((query) => {
    queryClient.setQueryData(query.queryKey, (existing: CustomersListQueryResult | undefined) =>
      upsertCustomerInListResult(existing, normalizedCustomer, query.queryKey)
    );
  });

  return normalizedCustomer;
};

export const removeCustomerFromCustomerQueries = (queryClient: QueryClient, customerId: string) => {
  const normalizedCustomerId = normalizeCustomerId(customerId);
  if (!normalizedCustomerId) return;

  queryClient.removeQueries({
    queryKey: customerQueryKeys.detail(normalizedCustomerId),
  });

  const cachedListQueries = queryClient.getQueryCache().findAll({
    queryKey: customerQueryKeys.lists(),
  });

  cachedListQueries.forEach((query) => {
    queryClient.setQueryData(query.queryKey, (existing: CustomersListQueryResult | undefined) =>
      removeCustomerFromListResult(existing, normalizedCustomerId)
    );
  });
};

export const invalidateCustomerQueries = async (queryClient: QueryClient, customerId?: string) => {
  const tasks: Promise<unknown>[] = [
    queryClient.invalidateQueries({ queryKey: customerQueryKeys.lists() }),
  ];

  const normalizedCustomerId = normalizeCustomerId(customerId);
  if (normalizedCustomerId) {
    tasks.push(queryClient.invalidateQueries({ queryKey: customerQueryKeys.detail(normalizedCustomerId) }));
  }

  await Promise.all(tasks);
};

export const useCustomersListQuery = (
  params?: CustomerListQueryParams,
  options?: { enabled?: boolean }
) => {
  const normalizedParams = normalizeCustomerListParams(params);

  return useQuery({
    queryKey: customerQueryKeys.list(normalizedParams),
    queryFn: () => fetchCustomersList(normalizedParams),
    enabled: options?.enabled ?? true,
    staleTime: CUSTOMER_LIST_STALE_TIME_MS,
    placeholderData: keepPreviousData,
  });
};

export const useCustomersSidebarQuery = (options?: { enabled?: boolean; limit?: number }) =>
  useCustomersListQuery(
    {
      page: 1,
      limit: options?.limit ?? 1000,
      search: "",
    },
    options
  );

export const useCustomerDetailQuery = (
  customerId: string | undefined,
  options?: { enabled?: boolean; initialCustomer?: any; preferFresh?: boolean }
) => {
  const queryClient = useQueryClient();
  const normalizedCustomerId = normalizeCustomerId(customerId);

  const detailQuery = useQuery({
    queryKey: customerQueryKeys.detail(normalizedCustomerId),
    queryFn: () => fetchCustomerDetail(normalizedCustomerId),
    enabled: (options?.enabled ?? true) && Boolean(normalizedCustomerId),
    staleTime: CUSTOMER_DETAIL_STALE_TIME_MS,
    placeholderData: options?.preferFresh
      ? undefined
      : () =>
          normalizeCustomerForQueryCache(options?.initialCustomer, normalizedCustomerId) ||
          readCustomerFromAnyCachedList(queryClient, normalizedCustomerId) ||
          undefined,
  });

  useEffect(() => {
    if (!detailQuery.data || detailQuery.isPlaceholderData) return;
    syncCustomerIntoCustomerQueries(queryClient, detailQuery.data);
  }, [detailQuery.data, detailQuery.isPlaceholderData, queryClient]);

  return detailQuery;
};

export const useSaveCustomerMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["customers", "save"],
    mutationFn: async ({ id, data }: { id?: string; data: any }) => {
      const response = id
        ? await customersAPI.update(id, data)
        : await customersAPI.create(data);

      if (!response?.success) {
        throw new Error(response?.message || "Failed to save customer");
      }

      const normalizedCustomer = normalizeCustomerForQueryCache(
        response?.data || data,
        response?.data?._id || response?.data?.id || id
      );

      if (!normalizedCustomer) {
        throw new Error("Failed to normalize saved customer");
      }

      return normalizedCustomer;
    },
    onSuccess: async (savedCustomer) => {
      syncCustomerIntoCustomerQueries(queryClient, savedCustomer);
      await invalidateCustomerQueries(queryClient, savedCustomer.id);
    },
  });
};
