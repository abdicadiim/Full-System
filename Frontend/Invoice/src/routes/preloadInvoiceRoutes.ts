const coreRouteLoaders = [
  () => import('../pages/Customers/CustomersRoutes'),
  () => import('../pages/Invoices/InvoicesRoutes'),
  () => import('../pages/Quotes/QuotesRoutes'),
  () => import('../pages/RecurringInvoices/RecurringInvoicesRoutes'),
  () => import('../pages/SalesReceipts/SalesReceiptsRoutes'),
  () => import('../pages/CreditNotes/CreditNotesRoutes'),
  () => import('../pages/payments/PaymentsRoutes'),
  () => import('../pages/items/ItemsPage'),
  () => import('../pages/settings/SettingsRoutes'),
];

const secondaryRouteLoaders = [
  () => import('../pages/home/DashboardRoutes'),
  () => import('../pages/Expense/ExpensesRoutes'),
  () => import('../pages/reports/ReportsRoutes'),
  () => import('../pages/taxes/TaxesRoutes'),
  () => import('../pages/orgs/OrgsRoutes'),
  () => import('../pages/timeTracking/TimeTrackingPage'),
  () => import('../pages/events/EventsPage'),
  () => import('../pages/documents/DocumentsPage'),
];

let preloadStarted = false;

function runLoaders(loaders: Array<() => Promise<unknown>>) {
  loaders.forEach((load) => {
    void load().catch(() => null);
  });
}

export function preloadInvoiceRoutes() {
  if (preloadStarted || typeof window === "undefined") return;
  preloadStarted = true;

  runLoaders(coreRouteLoaders);

  window.setTimeout(() => {
    runLoaders(secondaryRouteLoaders);
  }, 2500);
}
