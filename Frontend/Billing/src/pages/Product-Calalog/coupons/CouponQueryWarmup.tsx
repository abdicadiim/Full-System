import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { couponQueryKeys, fetchCouponsList } from "./couponQueries";

const COUPON_QUERY_WARMUP_SESSION_KEY = "billing_coupon_query_warmup_v1";

const hasStoredAuthToken = () => {
  if (typeof window === "undefined") return false;
  return Boolean(
    localStorage.getItem("auth_token") ||
      localStorage.getItem("token") ||
      localStorage.getItem("accessToken")
  );
};

export default function CouponQueryWarmup() {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!hasStoredAuthToken()) return;

    const warmed = sessionStorage.getItem(COUPON_QUERY_WARMUP_SESSION_KEY) === "1";
    if (warmed) return;

    sessionStorage.setItem(COUPON_QUERY_WARMUP_SESSION_KEY, "1");

    void queryClient.prefetchQuery({
      queryKey: couponQueryKeys.list({ limit: 1000 }),
      queryFn: () => fetchCouponsList({ limit: 1000 }),
    });
  }, [queryClient]);

  return null;
}
