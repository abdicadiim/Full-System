import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { fetchQuotesList, quoteQueryKeys } from "./quoteQueries";

const QUOTE_QUERY_WARMUP_SESSION_KEY = "billing_quote_query_warmup_v1";

const hasStoredAuthToken = () => {
  if (typeof window === "undefined") return false;
  return Boolean(
    localStorage.getItem("auth_token") ||
      localStorage.getItem("token") ||
      localStorage.getItem("accessToken")
  );
};

export default function QuoteQueryWarmup() {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!hasStoredAuthToken()) return;

    const warmed = sessionStorage.getItem(QUOTE_QUERY_WARMUP_SESSION_KEY) === "1";
    if (warmed) return;

    sessionStorage.setItem(QUOTE_QUERY_WARMUP_SESSION_KEY, "1");

    void queryClient.prefetchQuery({
      queryKey: quoteQueryKeys.list(),
      queryFn: fetchQuotesList,
    });
  }, [queryClient]);

  return null;
}
