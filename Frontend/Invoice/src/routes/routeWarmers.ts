import { queryClient } from "../lib/queryClient";
import { waitForBackendReady } from "../services/backendReady";

const warmedModules = new Set<string>();
const warmedQueries = new Set<string>();

function warmModule(key: string, loader: () => Promise<unknown>) {
  if (typeof window === "undefined" || warmedModules.has(key)) return;
  warmedModules.add(key);
  void loader().catch(() => null);
}

function normalizeItemForList(item: any) {
  return {
    ...item,
    images: Array.isArray(item?.images) ? item.images : (item?.image ? [item.image] : []),
    id: item?.id || item?._id,
    active: item?.active !== undefined ? item.active : item?.isActive,
  };
}

function extractItemRows(response: any): any[] {
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.items)) return response.items;
  if (Array.isArray(response?.data?.data)) return response.data.data;
  return [];
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

async function warmItemsList() {
  await prefetchOnce("items:list", async () => {
    await queryClient.prefetchQuery({
      queryKey: ["items", "list"],
      queryFn: async () => {
        if ((import.meta as any).env?.DEV) {
          await waitForBackendReady();
        }
        const { itemsAPI } = await import("../services/api");
        const response = await itemsAPI.getAll();
        return extractItemRows(response).map((item) => normalizeItemForList(item));
      },
      staleTime: 2 * 60 * 1000,
    });
  });
}

async function warmQuotesList() {
  await prefetchOnce("quotes:list", async () => {
    await queryClient.prefetchQuery({
      queryKey: ["quotes", "list"],
      queryFn: async () => {
        const { getQuotes } = await import("../pages/salesModel");
        const loadedQuotes = await getQuotes();
        return Array.isArray(loadedQuotes) ? loadedQuotes : [];
      },
      staleTime: 2 * 60 * 1000,
    });
  });
}

async function warmCustomersList() {
  await prefetchOnce("customers:list", async () => {
    await queryClient.prefetchQuery({
      queryKey: ["customers", 1, 25, ""],
      queryFn: async () => {
        if ((import.meta as any).env?.DEV) {
          await waitForBackendReady();
        }
        const { getCustomersPaginated } = await import("../pages/salesModel");
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

async function warmInvoicesList() {
  await prefetchOnce("invoices:list", async () => {
    await queryClient.prefetchQuery({
      queryKey: ["invoices", 1, 25, "", "All", "All", "createdAt", "desc"],
      queryFn: async () => {
        if ((import.meta as any).env?.DEV) {
          await waitForBackendReady();
        }
        const { getInvoicesPaginated } = await import("../pages/salesModel");
        const response = await getInvoicesPaginated({
          page: 1,
          limit: 25,
          search: "",
        });
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
    await queryClient.prefetchQuery({
      queryKey: ["sales-receipts", 1, 25, "", "All"],
      queryFn: async () => {
        if ((import.meta as any).env?.DEV) {
          await waitForBackendReady();
        }
        const { getSalesReceiptsPaginated } = await import("../pages/salesModel");
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
    await queryClient.prefetchQuery({
      queryKey: ["recurring-invoices", "list"],
      queryFn: async () => {
        const { getRecurringInvoices } = await import("../pages/salesModel");
        const response = await getRecurringInvoices();
        return Array.isArray(response) ? response : [];
      },
      staleTime: 2 * 60 * 1000,
    });
  });
}

async function warmCreditNotesList() {
  await prefetchOnce("creditNotes:list", async () => {
    await queryClient.prefetchQuery({
      queryKey: ["credit-notes", "list"],
      queryFn: async () => {
        const { getCreditNotes } = await import("../pages/salesModel");
        const response = await getCreditNotes();
        return Array.isArray(response) ? response : [];
      },
      staleTime: 2 * 60 * 1000,
    });
  });
}

const ROUTE_WARMERS: Record<string, () => void> = {
  "/products/items": () => {
    warmModule("items-module", () => import("../pages/items/ItemsPage"));
    void warmItemsList();
  },
  "/settings": () => {
    warmModule("settings-module", () => import("../pages/settings/SettingsRoutes"));
  },
  "/sales/quotes": () => {
    warmModule("quotes-module", () => import("../pages/Quotes/QuotesRoutes"));
    void warmQuotesList();
  },
  "/sales/customers": () => {
    warmModule("customers-module", () => import("../pages/Customers/CustomersRoutes"));
    void warmCustomersList();
  },
  "/sales/invoices": () => {
    warmModule("invoices-module", () => import("../pages/Invoices/InvoicesRoutes"));
    void warmInvoicesList();
  },
  "/sales/sales-receipts": () => {
    warmModule("sales-receipts-module", () => import("../pages/SalesReceipts/SalesReceiptsRoutes"));
    void warmSalesReceiptsList();
  },
  "/sales/recurring-invoices": () => {
    warmModule("recurring-invoices-module", () => import("../pages/RecurringInvoices/RecurringInvoicesRoutes"));
    void warmRecurringInvoicesList();
  },
  "/sales/credit-notes": () => {
    warmModule("credit-notes-module", () => import("../pages/CreditNotes/CreditNotesRoutes"));
    void warmCreditNotesList();
  },
};

export function prefetchRouteChunk(path: string) {
  const warmer = ROUTE_WARMERS[path] || Object.entries(ROUTE_WARMERS).find(([route]) => path.startsWith(route + "/"))?.[1];
  if (!warmer) return;
  warmer();
}
