import React, { Suspense, lazy } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'

const DashboardRoutes = lazy(() => import('../pages/home/DashboardRoutes'))
const SalesInvoicesRoutes = lazy(() => import('../pages/sales/Invoices/InvoicesRoutes'))
const RetainerInvoiceRoutes = lazy(() => import('../pages/sales/RetainerInvoice/RetainerInvoiceRoutes'))
const SalesReceiptsRoutes = lazy(() => import('../pages/sales/SalesReceipts/SalesReceiptsRoutes'))
const CreditNotesRoutes = lazy(() => import('../pages/sales/CreditNotes/CreditNotesRoutes'))
const SubscriptionsRoutes = lazy(() => import('../pages/sales/subscriptions/SubscriptionsRoutes'))
const CustomersRoutes = lazy(() => import('../pages/Customers/CustomersRoutes'))
const PaymentsRoutes = lazy(() => import('../pages/payments/PaymentsRoutes'))
const ReportsRoutes = lazy(() => import('../pages/reports/ReportsRoutes'))
const CreateCustomReportPage = lazy(() => import('../pages/reports/CreateCustomReportPage'))
const TaxesRoutes = lazy(() => import('../pages/taxes/TaxesRoutes'))
const OrgsRoutes = lazy(() => import('../pages/orgs/OrgsRoutes'))
const QuotesRoutes = lazy(() => import('../pages/sales/Quotes/QuotesRoutes'))
const NewDebitNote = lazy(() => import('../pages/sales/DebitNotes/NewDebitNote/NewDebitNote'))
const InvoiceDetail = lazy(() => import('../pages/sales/Invoices/InvoiceDetail/InvoiceDetail'))
const SendInvoiceEmail = lazy(() => import('../pages/sales/Invoices/SendInvoiceEmail/SendInvoiceEmail'))
const ItemsPage = lazy(() => import('../pages/Product-Calalog/items/ItemsPage'))
const ImportItems = lazy(() => import('../pages/Product-Calalog/items/ImportItems'))
const PlansPage = lazy(() => import('../pages/Product-Calalog/plans/PlansPage'))
const ImportPlansPage = lazy(() => import('../pages/Product-Calalog/plans/import/ImportPlansPage'))
const ImportProductsPage = lazy(() => import('../pages/Product-Calalog/plans/import/ImportProductsPage'))
const NewPlanPage = lazy(() => import('../pages/Product-Calalog/plans/newplan/NewPlanPage'))
const PlanDetailPage = lazy(() => import('../pages/Product-Calalog/plans/planDetail/PlanDetailPage'))
const ProductDetailPage = lazy(() => import('../pages/Product-Calalog/plans/productDetail/productDetail'))
const CouponsPage = lazy(() => import('../pages/Product-Calalog/coupons/CouponsPage'))
const NewCouponPage = lazy(() => import('../pages/Product-Calalog/coupons/NewCouponPage'))
const ImportCouponsPage = lazy(() => import('../pages/Product-Calalog/coupons/import/ImportCouponsPage'))
const AddonListPage = lazy(() => import('../pages/Product-Calalog/addons/AddonsPage'))
const AddonDetailPage = lazy(() => import('../pages/Product-Calalog/addons/AddonDetailPage/AddonDetail'))
const NewAddonPage = lazy(() => import('../pages/Product-Calalog/addons/NewAddon/NewAddon'))
const ImportAddonsPage = lazy(() => import('../pages/Product-Calalog/addons/import/ImportAddonsPage'))
const PricingWidgetsList = lazy(() => import('../pages/Product-Calalog/PricingWidgets/PricingWidgetsList'))
const ImportPricingWidgetsPage = lazy(() => import('../pages/Product-Calalog/PricingWidgets/import/ImportPricingWidgetsPage'))
const PricingWidgetBuilderPage = lazy(() => import('../pages/Product-Calalog/PricingWidgets/components/PricingWidgetBuilderPage'))
const PriceListPage = lazy(() => import('../pages/Product-Calalog/priceList/PriceListPage'))
const ImportPriceListsPage = lazy(() => import('../pages/Product-Calalog/priceList/import/ImportPriceListsPage'))
const ConfigureCheckoutButton = lazy(() => import('../pages/Product-Calalog/plans/productDetail/ConfigureCheckoutButton'))
const ExpensesRoutes = lazy(() => import('../pages/Expense/ExpensesRoutes'))
const SettingsRoutes = lazy(() => import('../pages/settings/SettingsRoutes'))
const TimeTrackingPage = lazy(() => import('../pages/timeTracking/TimeTrackingPage'))
const EventsPage = lazy(() => import('../pages/events/EventsPage'))
const DocumentsPage = lazy(() => import('../pages/documents/DocumentsPage'))
const SenderVerificationPage = lazy(() => import('../pages/public/SenderVerificationPage'))

function RouteFallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center p-6 text-sm text-gray-500">
      Loading...
    </div>
  )
}

function LegacyPaymentsReceivedRedirect() {
  const location = useLocation()
  let nextPath = location.pathname

  if (nextPath.startsWith('/sales/payments-received')) {
    nextPath = nextPath.replace('/sales/payments-received', '/payments/payments-received')
  } else if (nextPath.startsWith('/payments-received')) {
    nextPath = nextPath.replace('/payments-received', '/payments/payments-received')
  } else {
    nextPath = '/payments/payments-received'
  }

  return <Navigate to={`${nextPath}${location.search}${location.hash}`} state={location.state} replace />
}

function LegacyPurchasesExpensesRedirect() {
  const location = useLocation()
  let nextPath = location.pathname

  if (nextPath.startsWith('/purchases/expenses/recurring/')) {
    nextPath = nextPath.replace('/purchases/expenses/recurring/', '/expenses/recurring-expenses/')
  } else if (nextPath === '/purchases/expenses/recurring') {
    nextPath = '/expenses/recurring-expenses'
  } else if (nextPath.startsWith('/purchases/expenses')) {
    nextPath = nextPath.replace('/purchases/expenses', '/expenses')
  } else if (nextPath.startsWith('/purchases/recurring-expenses')) {
    nextPath = nextPath.replace('/purchases/recurring-expenses', '/expenses/recurring-expenses')
  } else {
    nextPath = '/expenses'
  }

  return <Navigate to={`${nextPath}${location.search}${location.hash}`} replace />
}

function LegacyCustomersRedirect() {
  const location = useLocation()
  let nextPath = location.pathname

  if (nextPath.startsWith('/sales/customer')) {
    nextPath = nextPath.replace('/sales/customer', '/sales/customers')
  } else if (nextPath.startsWith('/customers')) {
    nextPath = nextPath.replace('/customers', '/sales/customers')
  } else {
    nextPath = '/sales/customers'
  }

  return <Navigate to={`${nextPath}${location.search}${location.hash}`} replace />
}

export default function AppRoutes() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/sender-verification/*" element={<SenderVerificationPage />} />
        <Route index element={<Navigate to="/dashboard" replace />} />

        <Route path="/dashboard/*" element={<DashboardRoutes />} />

        <Route path="/invoices/*" element={<Navigate to="/sales/invoices" replace />} />
        <Route path="/quotes/*" element={<Navigate to="/sales/quotes" replace />} />

        <Route path="/sales" element={<Navigate to="/sales/invoices" replace />} />

        <Route path="/sales/invoices/*" element={<SalesInvoicesRoutes />} />
        <Route path="/sales/quotes/*" element={<QuotesRoutes />} />
        <Route path="/sales/retainer-invoices/*" element={<RetainerInvoiceRoutes />} />
        <Route path="/sales/receipts/*" element={<Navigate to="/sales/sales-receipts" replace />} />
        <Route path="/sales/sales-receipts/*" element={<SalesReceiptsRoutes />} />
        <Route path="/sales/credit-notes/*" element={<CreditNotesRoutes />} />
        <Route path="/sales/debit-notes/:id/edit" element={<NewDebitNote />} />
        <Route path="/sales/debit-notes/new" element={<NewDebitNote />} />
        <Route path="/sales/debit-notes/:id/email" element={<SendInvoiceEmail />} />
        <Route path="/sales/debit-notes/:id" element={<InvoiceDetail />} />

        <Route path="/sales/subscriptions/*" element={<SubscriptionsRoutes />} />
        <Route path="/subscriptions/*" element={<SubscriptionsRoutes />} />
        <Route path="/sales/customer/*" element={<LegacyCustomersRedirect />} />
        <Route path="/customers/*" element={<LegacyCustomersRedirect />} />
        <Route path="/sales/customers/*" element={<CustomersRoutes />} />
        <Route path="/sales/payments-received/*" element={<LegacyPaymentsReceivedRedirect />} />
        <Route path="/payments-received/*" element={<LegacyPaymentsReceivedRedirect />} />
        <Route path="/purchases/expenses/*" element={<LegacyPurchasesExpensesRedirect />} />
        <Route path="/purchases/recurring-expenses/*" element={<LegacyPurchasesExpensesRedirect />} />
        <Route path="/payments/*" element={<PaymentsRoutes />} />

        <Route path="/taxes/*" element={<TaxesRoutes />} />
        <Route path="/orgs/*" element={<OrgsRoutes />} />
        <Route path="/expenses/*" element={<ExpensesRoutes />} />
        <Route path="/products" element={<Navigate to="/products/items" replace />} />
        <Route path="/products/items" element={<ItemsPage />} />
        <Route path="/products/items/import" element={<ImportItems />} />
        <Route path="/products/items/new" element={<Navigate to="/products/items" replace />} />
        <Route path="/products/plans" element={<PlansPage />} />
        <Route path="/products/plans/import" element={<ImportPlansPage />} />
        <Route path="/products/products" element={<PlansPage />} />
        <Route path="/products/products/import" element={<ImportProductsPage />} />
        <Route path="/products/products/new" element={<Navigate to="/products/products?new=1" replace />} />
        <Route path="/products/products/:productId" element={<ProductDetailPage />} />
        <Route path="/products/plans/new" element={<NewPlanPage />} />
        <Route path="/products/plans/:planId" element={<PlanDetailPage />} />
        <Route path="/products/addons" element={<AddonListPage />} />
        <Route path="/products/addons/new" element={<NewAddonPage />} />
        <Route path="/products/addons/:addonId/edit" element={<NewAddonPage />} />
        <Route path="/products/addons/import" element={<ImportAddonsPage />} />
        <Route path="/products/addons/:addonId" element={<AddonDetailPage />} />
        <Route path="/products/coupons" element={<CouponsPage />} />
        <Route path="/products/coupons/new" element={<NewCouponPage />} />
        <Route path="/products/coupons/import" element={<ImportCouponsPage />} />
        <Route path="/products/pricing-widgets" element={<PricingWidgetsList />} />
        <Route path="/products/pricing-widgets/new" element={<PricingWidgetBuilderPage />} />
        <Route path="/products/pricing-widgets/import" element={<ImportPricingWidgetsPage />} />
        <Route path="/products/checkout-button" element={<ConfigureCheckoutButton />} />
        <Route path="/products/price-lists" element={<PriceListPage />} />
        <Route path="/products/price-lists/import" element={<ImportPriceListsPage />} />
        <Route path="/products/*" element={<Navigate to="/products/items" replace />} />
        <Route path="/items/*" element={<Navigate to="/products/items" replace />} />
        <Route path="/time-tracking/*" element={<TimeTrackingPage />} />
        <Route path="/events/*" element={<EventsPage />} />

        <Route path="/documents/*" element={<DocumentsPage />} />
        <Route path="/settings/*" element={<SettingsRoutes />} />
        <Route path="/reports/custom/create" element={<CreateCustomReportPage />} />
        <Route path="/reports/*" element={<ReportsRoutes />} />

        <Route path="*" element={<div className="p-6">Not Found</div>} />
      </Routes>
    </Suspense>
  )
}
