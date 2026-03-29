import React from 'react'
// Force refresh routes

import { Routes, Route, Navigate, useLocation } from 'react-router-dom'

import DashboardRoutes from '../pages/home/DashboardRoutes'
import SalesInvoicesRoutes from '../pages/Invoices/InvoicesRoutes'
import RetainerInvoiceRoutes from '../pages/RetainerInvoice/RetainerInvoiceRoutes'
import SalesReceiptsRoutes from '../pages/SalesReceipts/SalesReceiptsRoutes'
import CreditNotesRoutes from '../pages/CreditNotes/CreditNotesRoutes'
import RecurringInvoicesRoutes from '../pages/RecurringInvoices/RecurringInvoicesRoutes'
import CustomersRoutes from '../pages/Customers/CustomersRoutes'
import PaymentsRoutes from '../pages/payments/PaymentsRoutes'
import ReportsRoutes from '../pages/reports/ReportsRoutes'

import TaxesRoutes from '../pages/taxes/TaxesRoutes'
import OrgsRoutes from '../pages/orgs/OrgsRoutes'
import QuotesRoutes from '../pages/Quotes/QuotesRoutes'
import InvoiceDetail from '../pages/Invoices/InvoiceDetail/InvoiceDetail'
import NewDebitNote from '../pages/DebitNotes/NewDebitNote/NewDebitNote'
import ItemsPage from '../pages/items/ItemsPage'
import ImportItems from '../pages/items/ImportItems'
import ExpensesRoutes from '../pages/Expense/ExpensesRoutes'
import SettingsRoutes from '../pages/settings/SettingsRoutes'
import TimeTrackingPage from '../pages/timeTracking/TimeTrackingPage'
import EventsPage from '../pages/events/EventsPage'
import DocumentsPage from '../pages/documents/DocumentsPage'
import SenderVerificationPage from '../pages/public/SenderVerificationPage'


function ModulePlaceholder({ title }: { title: string }) {
  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold">{title}</h1>
      <p className="mt-2 text-sm text-gray-600">This module will be configured next.</p>
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
  )
}
