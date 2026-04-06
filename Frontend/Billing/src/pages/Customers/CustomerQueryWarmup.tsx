import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { customerQueryKeys, fetchCustomersList } from "./customerQueries";

const CUSTOMER_QUERY_WARMUP_SESSION_KEY = "billing_customer_query_warmup_v1";

const hasStoredAuthToken = () => {
  if (typeof window === "undefined") return false;

  return Boolean(
    localStorage.getItem("auth_token") ||
      localStorage.getItem("token") ||
      localStorage.getItem("accessToken")
  );
};

export default function CustomerQueryWarmup() {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!hasStoredAuthToken()) return;

    const hasWarmedUp = sessionStorage.getItem(CUSTOMER_QUERY_WARMUP_SESSION_KEY) === "1";
    if (hasWarmedUp) return;

    sessionStorage.setItem(CUSTOMER_QUERY_WARMUP_SESSION_KEY, "1");

    void queryClient.prefetchQuery({
      queryKey: customerQueryKeys.list({ page: 1, limit: 50, search: "" }),
      queryFn: () => fetchCustomersList({ page: 1, limit: 50, search: "" }),
    });

    void queryClient.prefetchQuery({
      queryKey: customerQueryKeys.list({ page: 1, limit: 1000, search: "" }),
      queryFn: () => fetchCustomersList({ page: 1, limit: 1000, search: "" }),
    });
  }, [queryClient]);

  return null;
}
