import { useEffect } from "react";
import {
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import { couponsAPI } from "../../../services/api";

const COUPON_LIST_STALE_TIME_MS = 30 * 1000;
const COUPON_DETAIL_STALE_TIME_MS = 30 * 1000;

const normalizeCouponId = (value: any) => String(value ?? "").trim();

const resolveCouponStatus = (row: any) => {
  const status = String(row?.status || row?.state || "Active").trim();
  if (!status) return "Active";
  return status;
};

const resolveCouponDiscountValue = (row: any) => {
  const fallback = Number(row?.discountValue ?? row?.value ?? row?.amount ?? 0);
  return Number.isFinite(fallback) ? fallback : 0;
};

export const normalizeCoupon = (row: any, fallbackId?: string) => {
  if (!row || typeof row !== "object") return null;

  const id = normalizeCouponId(row?.id || row?._id || row?.couponId || fallbackId);
  if (!id) return null;

  const couponName = String(row?.couponName || row?.name || row?.title || "").trim();
  const couponCode = String(row?.couponCode || row?.code || "").trim();
  const status = resolveCouponStatus(row);
  const discountValue = resolveCouponDiscountValue(row);
  const discountType = String(row?.discountType || row?.type || "Amount").trim();
  const redemptionType = String(row?.redemptionType || row?.limitedTo || "").trim();
  const productName = String(row?.productName || row?.product || "").trim();
  const associatePlans =
    Array.isArray(row?.associatedPlans) || Array.isArray(row?.plans)
      ? (row?.associatedPlans || row?.plans)
      : String(row?.associatedPlans || row?.plans || "").split(",").map((value: any) => String(value || "").trim()).filter(Boolean);
  const associateAddons =
    Array.isArray(row?.associatedAddons) || Array.isArray(row?.addons)
      ? (row?.associatedAddons || row?.addons)
      : String(row?.associatedAddons || row?.addons || "").split(",").map((value: any) => String(value || "").trim()).filter(Boolean);

  return {
    ...row,
    id,
    _id: row?._id || row?.id || id,
    couponName,
    couponCode,
    status,
    discountValue,
    discountType,
    redemptionType,
    productName,
    associatePlans,
    associateAddons,
    expirationDate: String(row?.expirationDate || row?.validTill || row?.expiresOn || ""),
    maxRedemption: Number(row?.maxRedemption ?? row?.maximumRedemption ?? row?.limit ?? 0),
  };
};

const couponMatchesId = (coupon: any, couponId: string) => {
  const normalized = normalizeCouponId(couponId);
  if (!normalized) return false;

  return [coupon?._id, coupon?.id, coupon?.couponId]
    .map((value) => normalizeCouponId(value))
    .filter(Boolean)
    .includes(normalized);
};

const readCouponFromAnyCachedList = (queryClient: QueryClient, couponId: string) => {
  const normalizedId = normalizeCouponId(couponId);
  if (!normalizedId) return null;

  const cached = queryClient.getQueriesData<any[]>({
    queryKey: couponQueryKeys.lists(),
  });

  for (const [, rows] of cached) {
    if (!Array.isArray(rows)) continue;
    const match = rows.find((row) => couponMatchesId(row, normalizedId));
    if (match) return normalizeCoupon(match, normalizedId);
  }

  return null;
};

export const couponQueryKeys = {
  all: () => ["coupons"] as const,
  lists: () => ["coupons", "list"] as const,
  list: (params?: { limit?: number }) =>
    ["coupons", "list", { limit: Math.max(1, Number(params?.limit || 1000)) }] as const,
  detail: (couponId: string) => ["coupons", "detail", normalizeCouponId(couponId)] as const,
};

export const fetchCouponsList = async (params?: { limit?: number }) => {
  const normalizedParams = { limit: Math.max(1, Number(params?.limit || 1000)) };
  const response = await couponsAPI.getAll(normalizedParams);
  if (response?.success === false) {
    throw new Error(response?.message || "Failed to load coupons");
  }

  const rows = Array.isArray(response?.data) ? response.data : [];
  return rows
    .map((row: any) => normalizeCoupon(row))
    .filter(Boolean) as any[];
};

export const fetchCouponDetail = async (couponId: string) => {
  const normalizedCouponId = normalizeCouponId(couponId);
  if (!normalizedCouponId) throw new Error("Coupon ID is required");

  const response = await couponsAPI.getById(normalizedCouponId);
  if (response?.success === false) {
    throw new Error(response?.message || "Failed to load coupon");
  }

  const coupon = normalizeCoupon(response?.data || response, normalizedCouponId);
  if (!coupon) throw new Error("Coupon not found");
  return coupon;
};

const upsertCouponInList = (existing: any[] | undefined, coupon: any) => {
  if (!Array.isArray(existing)) return [coupon];

  const index = existing.findIndex((row) => couponMatchesId(row, coupon.id));
  if (index >= 0) {
    const copy = [...existing];
    copy[index] = { ...copy[index], ...coupon };
    return copy;
  }

  return [coupon, ...existing];
};

export const syncCouponIntoQueries = (queryClient: QueryClient, coupon: any) => {
  const normalizedCoupon = normalizeCoupon(coupon);
  if (!normalizedCoupon) return null;

  queryClient.setQueryData(couponQueryKeys.detail(normalizedCoupon.id), normalizedCoupon);

  const cached = queryClient.getQueriesData<any[]>({ queryKey: couponQueryKeys.lists() });
  if (cached.length === 0) {
    queryClient.setQueryData(couponQueryKeys.list(), [normalizedCoupon]);
    return normalizedCoupon;
  }

  cached.forEach(([queryKey, rows]) => {
    queryClient.setQueryData(queryKey, (prev: any[] | undefined) => upsertCouponInList(prev, normalizedCoupon));
  });

  return normalizedCoupon;
};

export const removeCouponFromQueries = (queryClient: QueryClient, couponId: string) => {
  const normalizedCouponId = normalizeCouponId(couponId);
  if (!normalizedCouponId) return;

  queryClient.removeQueries({ queryKey: couponQueryKeys.detail(normalizedCouponId) });

  const cached = queryClient.getQueriesData<any[]>({ queryKey: couponQueryKeys.lists() });
  cached.forEach(([queryKey, rows]) => {
    queryClient.setQueryData(queryKey, (prev: any[] | undefined) =>
      Array.isArray(prev) ? prev.filter((row) => !couponMatchesId(row, normalizedCouponId)) : prev
    );
  });
};

export const invalidateCouponQueries = async (queryClient: QueryClient, couponId?: string) => {
  const tasks: Promise<unknown>[] = [
    queryClient.invalidateQueries({ queryKey: couponQueryKeys.lists() }),
  ];
  if (couponId) {
    tasks.push(queryClient.invalidateQueries({ queryKey: couponQueryKeys.detail(normalizeCouponId(couponId)) }));
  }
  await Promise.all(tasks);
};

export const useCouponsListQuery = (
  options?: { enabled?: boolean; limit?: number }
) => {
  const normalizedParams = { limit: Math.max(1, Number(options?.limit || 1000)) };

  return useQuery({
    queryKey: couponQueryKeys.list(normalizedParams),
    queryFn: () => fetchCouponsList(normalizedParams),
    enabled: options?.enabled ?? true,
    staleTime: COUPON_LIST_STALE_TIME_MS,
    placeholderData: (previousData) => previousData,
  });
};

export const useCouponDetailQuery = (
  couponId: string | undefined,
  options?: { enabled?: boolean; initialCoupon?: any }
) => {
  const queryClient = useQueryClient();
  const normalizedCouponId = normalizeCouponId(couponId);
  const cached = normalizedCouponId ? readCouponFromAnyCachedList(queryClient, normalizedCouponId) : null;
  const initialData =
    normalizeCoupon(options?.initialCoupon, normalizedCouponId) ||
    cached ||
    undefined;

  const query = useQuery({
    queryKey: couponQueryKeys.detail(normalizedCouponId),
    queryFn: () => fetchCouponDetail(normalizedCouponId),
    enabled: Boolean(normalizedCouponId) && (options?.enabled ?? true),
    staleTime: COUPON_DETAIL_STALE_TIME_MS,
    initialData,
  });

  useEffect(() => {
    if (query.data) {
      syncCouponIntoQueries(queryClient, query.data);
    }
  }, [query.data, queryClient]);

  return query;
};
