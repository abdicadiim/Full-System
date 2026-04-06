import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { fetchPriceLists, priceListQueryKeys } from "./priceListQueries";

const PRICE_LIST_QUERY_WARMUP_SESSION_KEY = "billing_price_list_query_warmup_v1";

const hasStoredAuthToken = () => {
  if (typeof window === "undefined") return false;
  return Boolean(
    localStorage.getItem("auth_token") ||
      localStorage.getItem("token") ||
      localStorage.getItem("accessToken")
  );
};

export default function PriceListQueryWarmup() {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!hasStoredAuthToken()) return;

    const warmed = sessionStorage.getItem(PRICE_LIST_QUERY_WARMUP_SESSION_KEY) === "1";
    if (warmed) return;

    sessionStorage.setItem(PRICE_LIST_QUERY_WARMUP_SESSION_KEY, "1");

    void queryClient.prefetchQuery({
      queryKey: priceListQueryKeys.list({ limit: 1000 }),
      queryFn: () => fetchPriceLists({ limit: 1000 }),
    });
  }, [queryClient]);

  return null;
}
