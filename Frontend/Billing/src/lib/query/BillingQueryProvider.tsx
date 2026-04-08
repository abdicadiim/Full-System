import React from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import {
  billingQueryClient,
  CUSTOMER_QUERY_CACHE_BUSTER,
  CUSTOMER_QUERY_PERSIST_KEY,
  CUSTOMER_QUERY_PERSIST_MAX_AGE_MS,
} from "./queryClient";

const PERSISTED_QUERY_ROOT_KEYS = new Set([
  "customers",
  "items",
  "quotes",
  "products",
  "plans",
  "coupons",
  "price-lists",
  "retainer-invoices",
  "invoices",
  "sales-receipts",
  "subscriptions",
  "credit-notes",
]);

const wrapPersisterWithPromises = (persister: ReturnType<typeof createSyncStoragePersister>) => ({
  ...persister,
  persistClient: (client: Parameters<typeof persister.persistClient>[0]) =>
    Promise.resolve(persister.persistClient(client)),
  restoreClient: () => Promise.resolve(persister.restoreClient()),
  removeClient: () => Promise.resolve(persister.removeClient()),
});

const createCustomerPersister = () => {
  if (typeof window === "undefined") return null;

  const basePersister = createSyncStoragePersister({
    storage: window.localStorage,
    key: CUSTOMER_QUERY_PERSIST_KEY,
    throttleTime: 1000,
  });

  return wrapPersisterWithPromises(basePersister);
};

export function BillingQueryProvider({ children }: { children: React.ReactNode }) {
  const persister = React.useMemo(() => createCustomerPersister(), []);

  if (!persister) {
    return (
      <QueryClientProvider client={billingQueryClient}>
        {children}
      </QueryClientProvider>
    );
  }

  return (
    <PersistQueryClientProvider
      client={billingQueryClient}
      persistOptions={{
        persister,
        buster: CUSTOMER_QUERY_CACHE_BUSTER,
        maxAge: CUSTOMER_QUERY_PERSIST_MAX_AGE_MS,
        dehydrateOptions: {
          shouldDehydrateQuery: (query) =>
            Array.isArray(query.queryKey) &&
            PERSISTED_QUERY_ROOT_KEYS.has(String(query.queryKey[0] || "")),
        },
      }}
    >
      {children}
    </PersistQueryClientProvider>
  );
}
