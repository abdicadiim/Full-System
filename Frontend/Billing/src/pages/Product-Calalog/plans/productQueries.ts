import { useEffect } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import { productsAPI } from "../../../services/api";

type ProductListQueryParams = {
  limit?: number;
};

const PRODUCT_LIST_STALE_TIME_MS = 30 * 1000;
const PRODUCT_DETAIL_STALE_TIME_MS = 30 * 1000;

const normalizeProductId = (value: any) => String(value ?? "").trim();

const normalizeProductListParams = (params?: ProductListQueryParams) => ({
  limit: Math.max(1, Number(params?.limit || 1000)),
});

const normalizeProductStatus = (product: any, isActive: boolean) => {
  const status = String(product?.status || "").trim();
  if (status) return status;
  return isActive ? "Active" : "Inactive";
};

export const normalizeProductForQueryCache = (product: any, fallbackId?: string) => {
  if (!product || typeof product !== "object") return null;

  const id = normalizeProductId(product?._id || product?.id || product?.product_id || fallbackId);
  if (!id) return null;

  const name = String(product?.name || product?.product || "").trim();
  const isActive =
    typeof product?.active === "boolean"
      ? product.active
      : typeof product?.isActive === "boolean"
        ? product.isActive
        : String(product?.status || "active").trim().toLowerCase() !== "inactive";
  const status = normalizeProductStatus(product, isActive);
  const emailRecipients = String(product?.emailRecipients || product?.email_ids || "").trim();
  const redirectionUrl = String(product?.redirectionUrl || product?.redirect_url || "").trim();
  const createdAt = String(
    product?.createdAt || product?.creationDate || product?.created_time || ""
  ).trim();

  return {
    ...product,
    id,
    _id: product?._id || product?.id || product?.product_id || id,
    product_id: product?.product_id || id,
    name,
    product: name,
    description: String(product?.description || "").trim(),
    status,
    active: isActive,
    isActive,
    plans: Number(product?.plans || 0),
    addons: Number(product?.addons || 0),
    coupons: Number(product?.coupons || 0),
    emailRecipients,
    email_ids: emailRecipients,
    redirectionUrl,
    redirect_url: redirectionUrl,
    createdAt,
    creationDate: createdAt,
  };
};

const productMatchesId = (product: any, productId: string) => {
  const normalizedProductId = normalizeProductId(productId);
  if (!normalizedProductId) return false;

  return [product?._id, product?.id, product?.product_id, product?.productId]
    .map((value) => normalizeProductId(value))
    .filter(Boolean)
    .includes(normalizedProductId);
};

const upsertProductInListResult = (existing: any[] | undefined, product: any) => {
  const normalizedProduct = normalizeProductForQueryCache(product);
  if (!normalizedProduct) return Array.isArray(existing) ? existing : [];

  if (!Array.isArray(existing) || existing.length === 0) {
    return [normalizedProduct];
  }

  const index = existing.findIndex((row: any) => productMatchesId(row, normalizedProduct.id));
  if (index >= 0) {
    const nextRows = [...existing];
    nextRows[index] = {
      ...nextRows[index],
      ...normalizedProduct,
    };
    return nextRows;
  }

  return [normalizedProduct, ...existing];
};

const removeProductFromListResult = (existing: any[] | undefined, productId: string) => {
  if (!Array.isArray(existing) || existing.length === 0) return existing || [];

  const normalizedProductId = normalizeProductId(productId);
  if (!normalizedProductId) return existing;

  return existing.filter((row: any) => !productMatchesId(row, normalizedProductId));
};

const readProductFromAnyCachedList = (queryClient: QueryClient, productId: string) => {
  const normalizedProductId = normalizeProductId(productId);
  if (!normalizedProductId) return null;

  const cachedLists = queryClient.getQueriesData<any[]>({
    queryKey: productQueryKeys.lists(),
  });

  for (const [, rows] of cachedLists) {
    if (!Array.isArray(rows)) continue;
    const matched = rows.find((row: any) => productMatchesId(row, normalizedProductId));
    if (matched) {
      return normalizeProductForQueryCache(matched, normalizedProductId);
    }
  }

  return null;
};

export const productQueryKeys = {
  all: () => ["products"] as const,
  lists: () => ["products", "list"] as const,
  list: (params?: ProductListQueryParams) =>
    ["products", "list", normalizeProductListParams(params)] as const,
  details: () => ["products", "detail"] as const,
  detail: (productId: string) => ["products", "detail", normalizeProductId(productId)] as const,
};

export const fetchProductsList = async (params?: ProductListQueryParams) => {
  const normalizedParams = normalizeProductListParams(params);
  const response = await productsAPI.getAll(normalizedParams);

  if (response?.success === false) {
    throw new Error(response?.message || "Failed to load products");
  }

  const rows = Array.isArray(response)
    ? response
    : Array.isArray(response?.data)
      ? response.data
      : [];

  return rows
    .map((row: any) => normalizeProductForQueryCache(row))
    .filter(Boolean) as any[];
};

export const fetchProductDetail = async (productId: string) => {
  const normalizedProductId = normalizeProductId(productId);
  if (!normalizedProductId) {
    throw new Error("Product ID is required");
  }

  const response = await productsAPI.getById(normalizedProductId);
  if (response?.success === false) {
    throw new Error(response?.message || "Failed to load product");
  }

  const normalizedProduct = normalizeProductForQueryCache(
    response?.data ?? response,
    normalizedProductId
  );
  if (!normalizedProduct) {
    throw new Error("Product not found");
  }

  return normalizedProduct;
};

export const syncProductIntoProductQueries = (queryClient: QueryClient, product: any) => {
  const normalizedProduct = normalizeProductForQueryCache(product);
  if (!normalizedProduct) return null;

  queryClient.setQueryData(productQueryKeys.detail(normalizedProduct.id), normalizedProduct);

  const cachedLists = queryClient.getQueriesData<any[]>({
    queryKey: productQueryKeys.lists(),
  });

  if (cachedLists.length === 0) {
    queryClient.setQueryData(productQueryKeys.list(), [normalizedProduct]);
    return normalizedProduct;
  }

  cachedLists.forEach(([queryKey, rows]) => {
    queryClient.setQueryData(queryKey, upsertProductInListResult(rows, normalizedProduct));
  });

  return normalizedProduct;
};

export const removeProductFromProductQueries = (queryClient: QueryClient, productId: string) => {
  const normalizedProductId = normalizeProductId(productId);
  if (!normalizedProductId) return;

  queryClient.removeQueries({
    queryKey: productQueryKeys.detail(normalizedProductId),
    exact: true,
  });

  const cachedLists = queryClient.getQueriesData<any[]>({
    queryKey: productQueryKeys.lists(),
  });

  cachedLists.forEach(([queryKey, rows]) => {
    queryClient.setQueryData(queryKey, removeProductFromListResult(rows, normalizedProductId));
  });
};

export const invalidateProductQueries = async (queryClient: QueryClient, productId?: string) => {
  const tasks: Promise<unknown>[] = [
    queryClient.invalidateQueries({ queryKey: productQueryKeys.lists() }),
    queryClient.invalidateQueries({ queryKey: productQueryKeys.details() }),
  ];

  const normalizedProductId = normalizeProductId(productId);
  if (normalizedProductId) {
    tasks.push(
      queryClient.invalidateQueries({
        queryKey: productQueryKeys.detail(normalizedProductId),
      })
    );
  }

  await Promise.all(tasks);
};

export const useProductsListQuery = (
  params?: ProductListQueryParams,
  options?: { enabled?: boolean }
) => {
  const normalizedParams = normalizeProductListParams(params);

  return useQuery({
    queryKey: productQueryKeys.list(normalizedParams),
    queryFn: () => fetchProductsList(normalizedParams),
    enabled: options?.enabled ?? true,
    staleTime: PRODUCT_LIST_STALE_TIME_MS,
    placeholderData: (previousData) => previousData,
  });
};

export const useProductDetailQuery = (
  productId: string,
  options?: { enabled?: boolean; initialProduct?: any }
) => {
  const queryClient = useQueryClient();
  const normalizedProductId = normalizeProductId(productId);
  const cachedProduct = readProductFromAnyCachedList(queryClient, normalizedProductId);
  const initialData =
    normalizeProductForQueryCache(options?.initialProduct, normalizedProductId) ||
    cachedProduct ||
    undefined;

  const query = useQuery({
    queryKey: productQueryKeys.detail(normalizedProductId),
    queryFn: () => fetchProductDetail(normalizedProductId),
    enabled: Boolean(normalizedProductId) && (options?.enabled ?? true),
    staleTime: PRODUCT_DETAIL_STALE_TIME_MS,
    initialData,
  });

  useEffect(() => {
    if (query.data) {
      syncProductIntoProductQueries(queryClient, query.data);
    }
  }, [query.data, queryClient]);

  return query;
};

export const useSaveProductMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["products", "save"],
    mutationFn: async ({ id, data }: { id?: string; data: any }) => {
      const response = id
        ? await productsAPI.update(id, data)
        : await productsAPI.create(data);

      if (response?.success === false) {
        throw new Error(response?.message || "Failed to save product");
      }

      const normalizedProduct = normalizeProductForQueryCache(
        response?.data || data,
        response?.data?._id || response?.data?.id || response?.data?.product_id || id
      );

      if (!normalizedProduct) {
        throw new Error("Failed to normalize saved product");
      }

      return normalizedProduct;
    },
    onSuccess: async (savedProduct) => {
      syncProductIntoProductQueries(queryClient, savedProduct);
      await invalidateProductQueries(queryClient, savedProduct.id);
    },
  });
};
