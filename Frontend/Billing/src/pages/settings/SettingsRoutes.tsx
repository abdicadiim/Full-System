import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import AllSettings from "./AllSettings";
import SettingsProfileWrapper from "./SettingsProfileWrapper";
import SettingsBrandingWrapper from "./SettingsBrandingWrapper";
import SettingsCustomDomainWrapper from "./SettingsCustomDomainWrapper";
import SettingsLocationsWrapper from "./SettingsLocationsWrapper";
import SettingsSubscriptionWrapper from "./SettingsSubscriptionWrapper";
import SettingsUsersWrapper from "./SettingsUsersWrapper";
import SettingsRolesWrapper from "./SettingsRolesWrapper";
import SettingsTaxesWrapper from "./SettingsTaxesWrapper";
import SettingsGeneralWrapper from "./organization-settings/setup-configurations/general/SettingsGeneralWrapper";
import SettingsCurrenciesWrapper from "./organization-settings/setup-configurations/currencies/SettingsCurrenciesWrapper";
import SettingsOpeningBalancesWrapper from "./organization-settings/setup-configurations/opening-balances/SettingsOpeningBalancesWrapper";
import SettingsRemindersWrapper from "./organization-settings/setup-configurations/reminders/SettingsRemindersWrapper";
import SettingsCustomizationWrapper from "./SettingsCustomizationWrapper";
import SettingsWorkflowRulesWrapper from "./organization-settings/automation/workflow-rules/SettingsWorkflowRulesWrapper";
import SettingsWorkflowActionsWrapper from "./organization-settings/automation/workflow-actions/SettingsWorkflowActionsWrapper";
import SettingsWorkflowLogsWrapper from "./organization-settings/automation/workflow-logs/SettingsWorkflowLogsWrapper";
import SettingsSchedulesWrapper from "./organization-settings/automation/schedules/SettingsSchedulesWrapper";
import SettingsCustomersVendorsWrapper from "./module-settings/customers-vendors/SettingsCustomersVendorsWrapper";
import SettingsItemsWrapper from "./module-settings/items/SettingsItemsWrapper";
import SettingsAccountantWrapper from "./module-settings/accountant/SettingsAccountantWrapper";
import SettingsProjectsWrapper from "./module-settings/projects/SettingsProjectsWrapper";
import SettingsTimesheetWrapper from "./module-settings/timesheet/SettingsTimesheetWrapper";
import SettingsTasksWrapper from "./SettingsTasksWrapper";
import SettingsInventoryAdjustmentsWrapper from "./SettingsInventoryAdjustmentsWrapper";
import SettingsQuotesWrapper from "./SettingsQuotesWrapper";
import SettingsInvoicesWrapper from "./SettingsInvoicesWrapper";
import SettingsRecurringInvoicesWrapper from "./SettingsRecurringInvoicesWrapper";
import SettingsSalesReceiptsWrapper from "./SettingsSalesReceiptsWrapper";
import SettingsPaymentsReceivedWrapper from "./SettingsPaymentsReceivedWrapper";
import SettingsCreditNotesWrapper from "./SettingsCreditNotesWrapper";
import SettingsDeliveryNotesWrapper from "./SettingsDeliveryNotesWrapper";
import SettingsPackingSlipsWrapper from "./SettingsPackingSlipsWrapper";
import SettingsExpensesWrapper from "./SettingsExpensesWrapper";
import SettingsPurchaseOrdersWrapper from "./SettingsPurchaseOrdersWrapper";
import SettingsBillsWrapper from "./SettingsBillsWrapper";
import SettingsRecurringBillsWrapper from "./SettingsRecurringBillsWrapper";
import SettingsPaymentsMadeWrapper from "./SettingsPaymentsMadeWrapper";
import SettingsVendorCreditsWrapper from "./SettingsVendorCreditsWrapper";
import SettingsCustomerPortalWrapper from "./SettingsCustomerPortalWrapper";
import SettingsVendorPortalWrapper from "./SettingsVendorPortalWrapper";
import SettingsOnlinePaymentsWrapper from "./SettingsOnlinePaymentsWrapper";
import SettingsCustomModulesWrapper from "./SettingsCustomModulesWrapper";
import SettingsUserPreferencesWrapper from "./SettingsUserPreferencesWrapper";
import SettingsVATWrapper from "./SettingsVATWrapper";

export default function SettingsRoutes() {
  return (
    <Routes>
      <Route index element={<AllSettings />} />
      <Route path="system" element={<Navigate to="/settings/general" replace />} />

      <Route path="profile/*" element={<SettingsProfileWrapper />} />
      <Route path="branding/*" element={<SettingsBrandingWrapper />} />
      <Route path="custom-domain/*" element={<SettingsCustomDomainWrapper />} />
      <Route path="locations/*" element={<SettingsLocationsWrapper />} />
      <Route path="subscription/*" element={<SettingsSubscriptionWrapper />} />
      <Route path="users/*" element={<SettingsUsersWrapper />} />
      <Route path="roles/*" element={<SettingsRolesWrapper />} />
      <Route path="taxes/*" element={<SettingsTaxesWrapper />} />
      <Route path="general/*" element={<SettingsGeneralWrapper />} />
      <Route path="currencies/*" element={<SettingsCurrenciesWrapper />} />
      <Route path="opening-balances/*" element={<SettingsOpeningBalancesWrapper />} />
      <Route path="reminders/*" element={<SettingsRemindersWrapper />} />

      <Route path="customization" element={<Navigate to="/settings/customization/transaction-number-series" replace />} />
      <Route path="customization/*" element={<SettingsCustomizationWrapper />} />
      <Route path="workflow-rules/*" element={<SettingsWorkflowRulesWrapper />} />
      <Route path="workflow-actions/*" element={<SettingsWorkflowActionsWrapper />} />
      <Route path="workflow-logs/*" element={<SettingsWorkflowLogsWrapper />} />
      <Route path="schedules/*" element={<SettingsSchedulesWrapper />} />

      <Route path="customers-vendors/*" element={<SettingsCustomersVendorsWrapper />} />
      <Route path="items/*" element={<SettingsItemsWrapper />} />
      <Route path="accountant/*" element={<SettingsAccountantWrapper />} />
      <Route path="projects/*" element={<SettingsProjectsWrapper />} />
      <Route path="tasks/*" element={<SettingsTasksWrapper />} />
      <Route path="timesheet/*" element={<SettingsTimesheetWrapper />} />
      <Route path="inventory-adjustments/*" element={<SettingsInventoryAdjustmentsWrapper />} />
      <Route path="quotes/*" element={<SettingsQuotesWrapper />} />
      <Route path="invoices/*" element={<SettingsInvoicesWrapper />} />
      <Route path="recurring-invoices/*" element={<SettingsRecurringInvoicesWrapper />} />
      <Route path="sales-receipts/*" element={<SettingsSalesReceiptsWrapper />} />
      <Route path="payments-received/*" element={<SettingsPaymentsReceivedWrapper />} />
      <Route path="credit-notes/*" element={<SettingsCreditNotesWrapper />} />
      <Route path="delivery-notes/*" element={<SettingsDeliveryNotesWrapper />} />
      <Route path="packing-slips/*" element={<SettingsPackingSlipsWrapper />} />
      <Route path="expenses/*" element={<SettingsExpensesWrapper />} />
      <Route path="recurring-expenses/*" element={<SettingsExpensesWrapper />} />
      <Route path="purchase-orders/*" element={<SettingsPurchaseOrdersWrapper />} />
      <Route path="bills/*" element={<SettingsBillsWrapper />} />
      <Route path="recurring-bills/*" element={<SettingsRecurringBillsWrapper />} />
      <Route path="payments-made/*" element={<SettingsPaymentsMadeWrapper />} />
      <Route path="vendor-credits/*" element={<SettingsVendorCreditsWrapper />} />

      <Route path="customer-portal/*" element={<SettingsCustomerPortalWrapper />} />
      <Route path="vendor-portal/*" element={<SettingsVendorPortalWrapper />} />
      <Route path="online-payments/*" element={<SettingsOnlinePaymentsWrapper />} />
      <Route path="custom-modules/*" element={<SettingsCustomModulesWrapper />} />
      <Route path="user-preferences/*" element={<SettingsUserPreferencesWrapper />} />
      <Route path="vat/*" element={<SettingsVATWrapper />} />

      <Route path="*" element={<AllSettings />} />
    </Routes>
  );
}
