import { billingQueryClient } from "../lib/query/queryClient";
import { waitForBackendReady } from "../services/backendReady";

const warmedModules = new Set<string>();
const warmedQueries = new Set<string>();
const warmTimestamps = new Map<string, number>();
const ROUTE_WARM_COOLDOWN_MS = 4000;

function warmModule(key: string, loader: () => Promise<unknown>) {
  if (typeof window === "undefined" || warmedModules.has(key)) return;
  warmedModules.add(key);
  void loader().catch(() => null);
}

function shouldWarm(key: string) {
  if (typeof window === "undefined") return false;
  const now = Date.now();
  const last = warmTimestamps.get(key) || 0;
  if (now - last < ROUTE_WARM_COOLDOWN_MS) return false;
  warmTimestamps.set(key, now);
  return true;
}

function scheduleWarm(key: string, task: () => void) {
  if (!shouldWarm(key)) return;
  if (typeof document !== "undefined" && document.hidden) return;

  const idleCallback = (window as any)?.requestIdleCallback;
  if (typeof idleCallback === "function") {
    idleCallback(() => task(), { timeout: 1200 });
    return;
  }

  window.setTimeout(() => task(), 150);
}

async function prefetchOnce<T>(key: string, loader: () => Promise<T>) {
  if (typeof window === "undefined" || warmedQueries.has(key)) return;
  warmedQueries.add(key);
  try {
    await loader();
  } catch {
    warmedQueries.delete(key);
  }
}

async function warmCustomersList() {
  await prefetchOnce("customers:list", async () => {
    await billingQueryClient.prefetchQuery({
      queryKey: ["customers", 1, 25, ""],
      queryFn: async () => {
        if ((import.meta as any).env?.DEV) {
          await waitForBackendReady();
        }
        const { getCustomersPaginated } = await import("../pages/sales/salesModel");
        const response = await getCustomersPaginated({ page: 1, limit: 25, search: "" });
        const rows = Array.isArray(response?.data)
          ? response.data
          : Array.isArray(response?.items)
            ? response.items
            : Array.isArray(response?.data?.data)
              ? response.data.data
              : [];
        return rows;
      },
      staleTime: 2 * 60 * 1000,
    });
  });
}

async function warmQuotesList() {
  await prefetchOnce("quotes:list", async () => {
    await billingQueryClient.prefetchQuery({
      queryKey: ["quotes", "list"],
      queryFn: async () => {
        const { getQuotes } = await import("../pages/sales/salesModel");
        const response = await getQuotes();
        return Array.isArray(response) ? response : [];
      },
      staleTime: 2 * 60 * 1000,
    });
  });
}

async function warmInvoicesList() {
  await prefetchOnce("invoices:list", async () => {
    await billingQueryClient.prefetchQuery({
      queryKey: ["invoices", 1, 25, "", "All", "All", "createdAt", "desc"],
      queryFn: async () => {
        if ((import.meta as any).env?.DEV) {
          await waitForBackendReady();
        }
        const { getInvoicesPaginated } = await import("../pages/sales/salesModel");
        const response = await getInvoicesPaginated({ page: 1, limit: 25, search: "" });
        return Array.isArray(response?.data)
          ? response.data
          : Array.isArray(response?.items)
            ? response.items
            : Array.isArray(response?.data?.data)
              ? response.data.data
              : [];
      },
      staleTime: 2 * 60 * 1000,
    });
  });
}

async function warmSalesReceiptsList() {
  await prefetchOnce("salesReceipts:list", async () => {
    await billingQueryClient.prefetchQuery({
      queryKey: ["sales-receipts", 1, 25, "", "All"],
      queryFn: async () => {
        if ((import.meta as any).env?.DEV) {
          await waitForBackendReady();
        }
        const { getSalesReceiptsPaginated } = await import("../pages/sales/salesModel");
        const response = await getSalesReceiptsPaginated({ page: 1, limit: 25, search: "" });
        return Array.isArray(response?.data)
          ? response.data
          : Array.isArray(response?.items)
            ? response.items
            : Array.isArray(response?.data?.data)
              ? response.data.data
              : [];
      },
      staleTime: 2 * 60 * 1000,
    });
  });
}

async function warmRecurringInvoicesList() {
  await prefetchOnce("recurringInvoices:list", async () => {
    await billingQueryClient.prefetchQuery({
      queryKey: ["recurring-invoices", "list"],
      queryFn: async () => {
        const { getRecurringInvoices } = await import("../pages/sales/salesModel");
        const response = await getRecurringInvoices();
        return Array.isArray(response) ? response : [];
      },
      staleTime: 2 * 60 * 1000,
    });
  });
}

async function warmCreditNotesList() {
  await prefetchOnce("creditNotes:list", async () => {
    await billingQueryClient.prefetchQuery({
      queryKey: ["credit-notes", "list"],
      queryFn: async () => {
        const { getCreditNotes } = await import("../pages/sales/salesModel");
        const response = await getCreditNotes();
        return Array.isArray(response) ? response : [];
      },
      staleTime: 2 * 60 * 1000,
    });
  });
}

const ROUTE_WARMERS: Record<string, () => void> = {
  "/dashboard": () => {
    warmModule("dashboard-module", () => import("../pages/home/DashboardRoutes"));
  },
  "/sales/customers": () => {
    warmModule("customers-module", () => import("../pages/Customers/CustomersRoutes"));
    void warmCustomersList();
  },
  "/sales/quotes": () => {
    warmModule("quotes-module", () => import("../pages/sales/Quotes/QuotesRoutes"));
    void warmQuotesList();
  },
  "/sales/invoices": () => {
    warmModule("invoices-module", () => import("../pages/sales/Invoices/InvoicesRoutes"));
    void warmInvoicesList();
  },
  "/sales/sales-receipts": () => {
    warmModule("sales-receipts-module", () => import("../pages/sales/SalesReceipts/SalesReceiptsRoutes"));
    void warmSalesReceiptsList();
  },
  "/sales/retainer-invoices": () => {
    warmModule("retainer-invoices-module", () => import("../pages/sales/RetainerInvoice/RetainerInvoiceRoutes"));
  },
  "/sales/subscriptions": () => {
    warmModule("subscriptions-module", () => import("../pages/sales/subscriptions/SubscriptionsRoutes"));
  },
  "/sales/credit-notes": () => {
    warmModule("credit-notes-module", () => import("../pages/sales/CreditNotes/CreditNotesRoutes"));
    void warmCreditNotesList();
  },
  "/sales/recurring-invoices": () => {
    warmModule("recurring-invoices-module", () => import("../pages/sales/subscriptions/SubscriptionsRoutes"));
    void warmRecurringInvoicesList();
  },
  "/products/items": () => {
    warmModule("items-module", () => import("../pages/Product-Calalog/items/ItemsPage"));
  },
};

export function prefetchRouteChunk(path: string) {
  const warmer = ROUTE_WARMERS[path] || Object.entries(ROUTE_WARMERS).find(([route]) => path.startsWith(route + "/"))?.[1];
  if (!warmer) return;
  scheduleWarm(`route:${path}`, warmer);
}
