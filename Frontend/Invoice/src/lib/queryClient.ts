import { QueryClient } from "@tanstack/react-query";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 0,
      gcTime: ONE_DAY_MS,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      refetchOnMount: true,
      retry: 1,
    },
    mutations: {
      retry: 0,
    },
  },
});

export const QUERY_CACHE_TTL_MS = ONE_DAY_MS;
