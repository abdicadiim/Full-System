import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { fetchItemsList, itemQueryKeys } from "./itemQueries";

const ITEM_QUERY_WARMUP_SESSION_KEY = "billing_item_query_warmup_v1";

const hasStoredAuthToken = () => {
  if (typeof window === "undefined") return false;

  return Boolean(
    localStorage.getItem("auth_token") ||
      localStorage.getItem("token") ||
      localStorage.getItem("accessToken")
  );
};

export default function ItemQueryWarmup() {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!hasStoredAuthToken()) return;

    const hasWarmedUp = sessionStorage.getItem(ITEM_QUERY_WARMUP_SESSION_KEY) === "1";
    if (hasWarmedUp) return;

    sessionStorage.setItem(ITEM_QUERY_WARMUP_SESSION_KEY, "1");

    void queryClient.prefetchQuery({
      queryKey: itemQueryKeys.list(),
      queryFn: () => fetchItemsList({ queryClient }),
    });
  }, [queryClient]);

  return null;
}
