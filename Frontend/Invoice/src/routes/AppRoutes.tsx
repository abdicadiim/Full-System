import React, { Suspense, lazy } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'

const DashboardRoutes = lazy(() => import('../pages/home/DashboardRoutes'))
const CustomersRoutes = lazy(() => import('../pages/Customers/CustomersRoutes'))
const SalesInvoicesRoutes = lazy(() => import('../pages/Invoices/InvoicesRoutes'))
const RetainerInvoiceRoutes = lazy(() => import('../pages/RetainerInvoice/RetainerInvoiceRoutes'))
const SalesReceiptsRoutes = lazy(() => import('../pages/SalesReceipts/SalesReceiptsRoutes'))
const CreditNotesRoutes = lazy(() => import('../pages/CreditNotes/CreditNotesRoutes'))
const RecurringInvoicesRoutes = lazy(() => import('../pages/RecurringInvoices/RecurringInvoicesRoutes'))
const PaymentsRoutes = lazy(() => import('../pages/payments/PaymentsRoutes'))
const ReportsRoutes = lazy(() => import('../pages/reports/ReportsRoutes'))
const TaxesRoutes = lazy(() => import('../pages/taxes/TaxesRoutes'))
const OrgsRoutes = lazy(() => import('../pages/orgs/OrgsRoutes'))
const QuotesRoutes = lazy(() => import('../pages/Quotes/QuotesRoutes'))
const InvoiceDetail = lazy(() => import('../pages/Invoices/InvoiceDetail/InvoiceDetail'))
const NewDebitNote = lazy(() => import('../pages/DebitNotes/NewDebitNote/NewDebitNote'))
const ItemsPage = lazy(() => import('../pages/items/ItemsPage'))
const ImportItems = lazy(() => import('../pages/items/ImportItems'))
const ExpensesRoutes = lazy(() => import('../pages/Expense/ExpensesRoutes'))
const SettingsRoutes = lazy(() => import('../pages/settings/SettingsRoutes'))
const TimeTrackingPage = lazy(() => import('../pages/timeTracking/TimeTrackingPage'))
const EventsPage = lazy(() => import('../pages/events/EventsPage'))
const DocumentsPage = lazy(() => import('../pages/documents/DocumentsPage'))
const SenderVerificationPage = lazy(() => import('../pages/public/SenderVerificationPage'))

function RouteFallback() {
  return null
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
        <Route path="/sales/recurring-invoices/*" element={<RecurringInvoicesRoutes />} />
        <Route path="/sales/debit-notes/:id" element={<InvoiceDetail />} />
        <Route path="/sales/debit-notes/new" element={<NewDebitNote />} />
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

        <Route path="/products/*" element={<Navigate to="/products/items" replace />} />
        <Route path="/items/*" element={<Navigate to="/products/items" replace />} />
        <Route path="/time-tracking/*" element={<TimeTrackingPage />} />
        <Route path="/events/*" element={<EventsPage />} />

        <Route path="/documents/*" element={<DocumentsPage />} />
        <Route path="/settings/*" element={<SettingsRoutes />} />
        <Route path="/reports/*" element={<ReportsRoutes />} />

        <Route path="*" element={<div className="p-6">Not Found</div>} />
      </Routes>
    </Suspense>
  )
}
