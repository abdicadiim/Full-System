import React, { Suspense, lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

const SettingsProfileWrapper = lazy(() => import("./SettingsProfileWrapper"));
const SettingsBrandingWrapper = lazy(() => import("./SettingsBrandingWrapper"));
const SettingsCustomDomainWrapper = lazy(() => import("./SettingsCustomDomainWrapper"));
const SettingsLocationsWrapper = lazy(() => import("./SettingsLocationsWrapper"));
const SettingsSubscriptionWrapper = lazy(() => import("./SettingsSubscriptionWrapper"));
const SettingsUsersWrapper = lazy(() => import("./SettingsUsersWrapper"));
const SettingsRolesWrapper = lazy(() => import("./SettingsRolesWrapper"));
const SettingsTaxesWrapper = lazy(() => import("./SettingsTaxesWrapper"));
const SettingsGeneralWrapper = lazy(() => import("./organization-settings/setup-configurations/general/SettingsGeneralWrapper"));
const SettingsCurrenciesWrapper = lazy(() => import("./organization-settings/setup-configurations/currencies/SettingsCurrenciesWrapper"));
const SettingsOpeningBalancesWrapper = lazy(() => import("./organization-settings/setup-configurations/opening-balances/SettingsOpeningBalancesWrapper"));
const SettingsRemindersWrapper = lazy(() => import("./organization-settings/setup-configurations/reminders/SettingsRemindersWrapper"));
const SettingsCustomizationWrapper = lazy(() => import("./SettingsCustomizationWrapper"));
const SettingsWorkflowRulesWrapper = lazy(() => import("./organization-settings/automation/workflow-rules/SettingsWorkflowRulesWrapper"));
const SettingsWorkflowActionsWrapper = lazy(() => import("./organization-settings/automation/workflow-actions/SettingsWorkflowActionsWrapper"));
const SettingsWorkflowLogsWrapper = lazy(() => import("./organization-settings/automation/workflow-logs/SettingsWorkflowLogsWrapper"));
const SettingsUsageStatsWrapper = lazy(() => import("./SettingsUsageStatsWrapper"));
const SettingsSchedulesWrapper = lazy(() => import("./organization-settings/automation/schedules/SettingsSchedulesWrapper"));
const SettingsCustomersVendorsWrapper = lazy(() => import("./module-settings/customers-vendors/SettingsCustomersVendorsWrapper"));
const SettingsItemsWrapper = lazy(() => import("./module-settings/items/SettingsItemsWrapper"));
const SettingsAccountantWrapper = lazy(() => import("./module-settings/accountant/SettingsAccountantWrapper"));
const SettingsProjectsWrapper = lazy(() => import("./module-settings/projects/SettingsProjectsWrapper"));
const SettingsTimesheetWrapper = lazy(() => import("./module-settings/timesheet/SettingsTimesheetWrapper"));
const SettingsInventoryAdjustmentsWrapper = lazy(() => import("./SettingsInventoryAdjustmentsWrapper"));
const SettingsQuotesWrapper = lazy(() => import("./SettingsQuotesWrapper"));
const SettingsInvoicesWrapper = lazy(() => import("./SettingsInvoicesWrapper"));
const SettingsRecurringInvoicesWrapper = lazy(() => import("./SettingsRecurringInvoicesWrapper"));
const SettingsSalesReceiptsWrapper = lazy(() => import("./SettingsSalesReceiptsWrapper"));
const SettingsPaymentsReceivedWrapper = lazy(() => import("./SettingsPaymentsReceivedWrapper"));
const SettingsCreditNotesWrapper = lazy(() => import("./SettingsCreditNotesWrapper"));
const SettingsDeliveryNotesWrapper = lazy(() => import("./SettingsDeliveryNotesWrapper"));
const SettingsPackingSlipsWrapper = lazy(() => import("./SettingsPackingSlipsWrapper"));
const SettingsExpensesWrapper = lazy(() => import("./SettingsExpensesWrapper"));
const SettingsPurchaseOrdersWrapper = lazy(() => import("./SettingsPurchaseOrdersWrapper"));
const SettingsBillsWrapper = lazy(() => import("./SettingsBillsWrapper"));
const SettingsRecurringBillsWrapper = lazy(() => import("./SettingsRecurringBillsWrapper"));
const SettingsPaymentsMadeWrapper = lazy(() => import("./SettingsPaymentsMadeWrapper"));
const SettingsVendorCreditsWrapper = lazy(() => import("./SettingsVendorCreditsWrapper"));
const SettingsCustomerPortalWrapper = lazy(() => import("./SettingsCustomerPortalWrapper"));
const SettingsVendorPortalWrapper = lazy(() => import("./SettingsVendorPortalWrapper"));
const SettingsOnlinePaymentsWrapper = lazy(() => import("./SettingsOnlinePaymentsWrapper"));
const SettingsCustomModulesWrapper = lazy(() => import("./SettingsCustomModulesWrapper"));
const SettingsUserPreferencesWrapper = lazy(() => import("./SettingsUserPreferencesWrapper"));
const SettingsVATWrapper = lazy(() => import("./SettingsVATWrapper"));

function SettingsRouteFallback() {
  return null;
}

const withSuspense = (node: React.ReactNode) => (
  <Suspense fallback={<SettingsRouteFallback />}>
    {node}
  </Suspense>
);

export default function SettingsRoutes() {
  return (
    <Routes>
      <Route index element={<Navigate to="/settings/profile" replace />} />
      <Route path="system" element={<Navigate to="/settings/general" replace />} />

      <Route path="profile/*" element={withSuspense(<SettingsProfileWrapper />)} />
      <Route path="branding/*" element={withSuspense(<SettingsBrandingWrapper />)} />
      <Route path="custom-domain/*" element={withSuspense(<SettingsCustomDomainWrapper />)} />
      <Route path="locations/*" element={withSuspense(<SettingsLocationsWrapper />)} />
      <Route path="subscription/*" element={withSuspense(<SettingsSubscriptionWrapper />)} />
      <Route path="users/*" element={withSuspense(<SettingsUsersWrapper />)} />
      <Route path="roles/*" element={withSuspense(<SettingsRolesWrapper />)} />
      <Route path="taxes/*" element={withSuspense(<SettingsTaxesWrapper />)} />
      <Route path="general/*" element={withSuspense(<SettingsGeneralWrapper />)} />
      <Route path="currencies/*" element={withSuspense(<SettingsCurrenciesWrapper />)} />
      <Route path="opening-balances/*" element={withSuspense(<SettingsOpeningBalancesWrapper />)} />
      <Route path="reminders/*" element={withSuspense(<SettingsRemindersWrapper />)} />

      <Route path="customization" element={<Navigate to="/settings/customization/transaction-number-series" replace />} />
      <Route path="customization/*" element={withSuspense(<SettingsCustomizationWrapper />)} />
      <Route path="workflow-rules/*" element={withSuspense(<SettingsWorkflowRulesWrapper />)} />
      <Route path="workflow-actions/*" element={withSuspense(<SettingsWorkflowActionsWrapper />)} />
      <Route path="workflow-logs/*" element={withSuspense(<SettingsWorkflowLogsWrapper />)} />
      <Route path="usage-stats/*" element={withSuspense(<SettingsUsageStatsWrapper />)} />
      <Route path="schedules/*" element={withSuspense(<SettingsSchedulesWrapper />)} />

      <Route path="customers-vendors/*" element={withSuspense(<SettingsCustomersVendorsWrapper />)} />
      <Route path="items/*" element={withSuspense(<SettingsItemsWrapper />)} />
      <Route path="accountant/*" element={withSuspense(<SettingsAccountantWrapper />)} />
      <Route path="projects/*" element={withSuspense(<SettingsProjectsWrapper />)} />
      <Route path="timesheet/*" element={withSuspense(<SettingsTimesheetWrapper />)} />
      <Route path="inventory-adjustments/*" element={withSuspense(<SettingsInventoryAdjustmentsWrapper />)} />
      <Route path="quotes/*" element={withSuspense(<SettingsQuotesWrapper />)} />
      <Route path="invoices/*" element={withSuspense(<SettingsInvoicesWrapper />)} />
      <Route path="recurring-invoices/*" element={withSuspense(<SettingsRecurringInvoicesWrapper />)} />
      <Route path="sales-receipts/*" element={withSuspense(<SettingsSalesReceiptsWrapper />)} />
      <Route path="payments-received/*" element={withSuspense(<SettingsPaymentsReceivedWrapper />)} />
      <Route path="credit-notes/*" element={withSuspense(<SettingsCreditNotesWrapper />)} />
      <Route path="delivery-notes/*" element={withSuspense(<SettingsDeliveryNotesWrapper />)} />
      <Route path="packing-slips/*" element={withSuspense(<SettingsPackingSlipsWrapper />)} />
      <Route path="expenses/*" element={withSuspense(<SettingsExpensesWrapper />)} />
      <Route path="recurring-expenses/*" element={withSuspense(<SettingsExpensesWrapper />)} />
      <Route path="purchase-orders/*" element={withSuspense(<SettingsPurchaseOrdersWrapper />)} />
      <Route path="bills/*" element={withSuspense(<SettingsBillsWrapper />)} />
      <Route path="recurring-bills/*" element={withSuspense(<SettingsRecurringBillsWrapper />)} />
      <Route path="payments-made/*" element={withSuspense(<SettingsPaymentsMadeWrapper />)} />
      <Route path="vendor-credits/*" element={withSuspense(<SettingsVendorCreditsWrapper />)} />

      <Route path="customer-portal/*" element={withSuspense(<SettingsCustomerPortalWrapper />)} />
      <Route path="vendor-portal/*" element={withSuspense(<SettingsVendorPortalWrapper />)} />
      <Route path="online-payments/*" element={withSuspense(<SettingsOnlinePaymentsWrapper />)} />
      <Route path="custom-modules/*" element={withSuspense(<SettingsCustomModulesWrapper />)} />
      <Route path="user-preferences/*" element={withSuspense(<SettingsUserPreferencesWrapper />)} />
      <Route path="vat/*" element={withSuspense(<SettingsVATWrapper />)} />

      <Route path="*" element={<Navigate to="/settings/profile" replace />} />
    </Routes>
  );
}
