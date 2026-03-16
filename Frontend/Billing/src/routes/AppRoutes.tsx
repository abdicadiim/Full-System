import React from 'react'
// Force refresh routes

import { Routes, Route, Navigate, useLocation } from 'react-router-dom'

import DashboardRoutes from '../pages/home/DashboardRoutes'
import SalesInvoicesRoutes from '../pages/sales/Invoices/InvoicesRoutes'
import RetainerInvoiceRoutes from '../pages/sales/RetainerInvoice/RetainerInvoiceRoutes'
import SalesReceiptsRoutes from '../pages/sales/SalesReceipts/SalesReceiptsRoutes'
import CreditNotesRoutes from '../pages/sales/CreditNotes/CreditNotesRoutes'
import SubscriptionsRoutes from '../pages/sales/subscriptions/SubscriptionsRoutes'
import CustomersRoutes from '../pages/Customers/CustomersRoutes'
import PaymentsRoutes from '../pages/payments/PaymentsRoutes'
import ReportsRoutes from '../pages/reports/ReportsRoutes'

import TaxesRoutes from '../pages/taxes/TaxesRoutes'
import OrgsRoutes from '../pages/orgs/OrgsRoutes'
import QuotesRoutes from '../pages/sales/Quotes/QuotesRoutes'
import NewDebitNote from '../pages/sales/DebitNotes/NewDebitNote/NewDebitNote'
import ItemsPage from '../pages/Product-Calalog/items/ItemsPage'
import ImportItems from '../pages/Product-Calalog/items/ImportItems'
import PlansPage from '../pages/Product-Calalog/plans/PlansPage'
import ImportPlansPage from '../pages/Product-Calalog/plans/import/ImportPlansPage'
import ImportProductsPage from '../pages/Product-Calalog/plans/import/ImportProductsPage'
import NewPlanPage from '../pages/Product-Calalog/plans/newplan/NewPlanPage'
import PlanDetailPage from '../pages/Product-Calalog/plans/planDetail/PlanDetailPage'
import ProductDetailPage from '../pages/Product-Calalog/plans/productDetail/productDetail'
import CouponsPage from '../pages/Product-Calalog/coupons/CouponsPage'
import NewCouponPage from '../pages/Product-Calalog/coupons/NewCouponPage'
import ImportCouponsPage from '../pages/Product-Calalog/coupons/import/ImportCouponsPage'
import AddonListPage from '../pages/Product-Calalog/addons/AddonsPage'
import AddonDetailPage from '../pages/Product-Calalog/addons/AddonDetailPage/AddonDetail'
import NewAddonPage from '../pages/Product-Calalog/addons/NewAddon/NewAddon'
import ImportAddonsPage from '../pages/Product-Calalog/addons/import/ImportAddonsPage'
import PricingWidgetsList from '../pages/Product-Calalog/PricingWidgets/PricingWidgetsList'
import ImportPricingWidgetsPage from '../pages/Product-Calalog/PricingWidgets/import/ImportPricingWidgetsPage'
import PricingWidgetBuilderPage from '../pages/Product-Calalog/PricingWidgets/components/PricingWidgetBuilderPage'
import PriceListPage from '../pages/Product-Calalog/priceList/PriceListPage'
import ImportPriceListsPage from '../pages/Product-Calalog/priceList/import/ImportPriceListsPage'
import ConfigureCheckoutButton from '../pages/Product-Calalog/plans/productDetail/ConfigureCheckoutButton'
import ExpensesRoutes from '../pages/Expense/ExpensesRoutes'
import SettingsRoutes from '../pages/settings/SettingsRoutes'
import TimeTrackingPage from '../pages/timeTracking/TimeTrackingPage'
import EventsPage from '../pages/events/EventsPage'


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

  return <Navigate to={`${nextPath}${location.search}${location.hash}`} replace />
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
      <Route path="/sales/debit-notes/new" element={<NewDebitNote />} />

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
      <Route path="/products/products/import" element={<ImportProductsPage />} />
      <Route path="/products/products/new" element={<Navigate to="/products/plans?tab=products" replace />} />
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

      <Route path="/documents/*" element={<ModulePlaceholder title="Documents" />} />
      <Route path="/settings/*" element={<SettingsRoutes />} />
      <Route path="/reports/*" element={<ReportsRoutes />} />

      <Route path="*" element={<div className="p-6">Not Found</div>} />
    </Routes>
  )
}
