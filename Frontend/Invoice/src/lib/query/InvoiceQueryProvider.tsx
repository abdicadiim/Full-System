import React from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { queryClient } from "../queryClient";

const INVOICE_QUERY_PERSIST_KEY = "invoice_query_cache_v1";
const INVOICE_QUERY_CACHE_BUSTER = "invoice-cache-v1";
const INVOICE_QUERY_PERSIST_MAX_AGE_MS = 24 * 60 * 60 * 1000;

const PERSISTED_QUERY_ROOT_KEYS = new Set([
  "dashboard",
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
  "recurring-invoices",
  "expenses",
  "projects",
  "time-entries",
  "locations",
  "bank-accounts",
  "payment-modes",
  "reporting-tags",
  "currencies",
  "taxes",
  "users",
  "roles",
  "sender-emails",
  "email-templates",
]);

const wrapPersisterWithPromises = (persister: ReturnType<typeof createSyncStoragePersister>) => ({
  ...persister,
  persistClient: (client: Parameters<typeof persister.persistClient>[0]) =>
    Promise.resolve(persister.persistClient(client)),
  restoreClient: () => Promise.resolve(persister.restoreClient()),
  removeClient: () => Promise.resolve(persister.removeClient()),
});

const createPersister = () => {
  if (typeof window === "undefined") return null;

  const basePersister = createSyncStoragePersister({
    storage: window.localStorage,
    key: INVOICE_QUERY_PERSIST_KEY,
    throttleTime: 1000,
  });

  return wrapPersisterWithPromises(basePersister);
};

export function InvoiceQueryProvider({ children }: { children: React.ReactNode }) {
  const persister = React.useMemo(() => createPersister(), []);

  if (!persister) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        buster: INVOICE_QUERY_CACHE_BUSTER,
        maxAge: INVOICE_QUERY_PERSIST_MAX_AGE_MS,
        dehydrateOptions: {
          shouldDehydrateQuery: (query) =>
            Array.isArray(query.queryKey) && PERSISTED_QUERY_ROOT_KEYS.has(String(query.queryKey[0] || "")),
        },
      }}
    >
      {children}
    </PersistQueryClientProvider>
  );
}
