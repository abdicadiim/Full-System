import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { fetchProductsList, productQueryKeys } from "./productQueries";

const PRODUCT_QUERY_WARMUP_SESSION_KEY = "billing_product_query_warmup_v1";

const hasStoredAuthToken = () => {
  if (typeof window === "undefined") return false;

  return Boolean(
    localStorage.getItem("auth_token") ||
      localStorage.getItem("token") ||
      localStorage.getItem("accessToken")
  );
};

export default function ProductQueryWarmup() {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!hasStoredAuthToken()) return;

    const hasWarmedUp = sessionStorage.getItem(PRODUCT_QUERY_WARMUP_SESSION_KEY) === "1";
    if (hasWarmedUp) return;

    sessionStorage.setItem(PRODUCT_QUERY_WARMUP_SESSION_KEY, "1");

    void queryClient.prefetchQuery({
      queryKey: productQueryKeys.list({ limit: 1000 }),
      queryFn: () => fetchProductsList({ limit: 1000 }),
    });
  }, [queryClient]);

  return null;
}
