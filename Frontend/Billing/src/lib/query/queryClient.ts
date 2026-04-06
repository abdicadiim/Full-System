import { QueryClient } from "@tanstack/react-query";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export const CUSTOMER_QUERY_PERSIST_KEY = "billing_customer_query_cache_v1";
export const CUSTOMER_QUERY_CACHE_BUSTER = "billing-customers-v1";
export const CUSTOMER_QUERY_PERSIST_MAX_AGE_MS = ONE_DAY_MS;

export const billingQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: ONE_DAY_MS,
      retry: 1,
      refetchOnReconnect: true,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});
