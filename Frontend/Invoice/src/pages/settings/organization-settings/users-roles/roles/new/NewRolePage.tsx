import React, { useState, useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { HelpCircle, Lock, ChevronRight, ChevronDown, AlertCircle, X } from "lucide-react";
import { rolesAPI } from "../../../../../../services/api";

const isPlainObject = (value: any) =>
  value && typeof value === "object" && !Array.isArray(value);

const mergeWithDefaults = (defaults: any, incoming: any): any => {
  if (!isPlainObject(defaults)) {
    return incoming === undefined ? defaults : incoming;
  }
  if (!isPlainObject(incoming)) {
    return defaults;
  }

  const result: any = { ...defaults };
  Object.keys(incoming).forEach((key) => {
    const incomingValue = incoming[key];
    const defaultValue = defaults[key];

    if (incomingValue === undefined) return;
    if (isPlainObject(defaultValue) && isPlainObject(incomingValue)) {
      result[key] = mergeWithDefaults(defaultValue, incomingValue);
      return;
    }
    result[key] = incomingValue;
  });

  return result;
};

export default function NewRolePage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const isEditMode = Boolean(id);
  const [isLoadingRole, setIsLoadingRole] = useState(isEditMode);
  const [roleName, setRoleName] = useState("");
  const [description, setDescription] = useState("");
  const [isAccountantRole, setIsAccountantRole] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);

  // Contacts permissions
  const [contactsPermissions, setContactsPermissions] = useState({
    customers: {
      full: false,
      view: true,
      create: true,
      edit: true,
      delete: true,
      assignOwner: false,
      assignedOnly: false,
      communication: true,
      statement: true,
      syncZohoCRM: true,
      merge: true
    },
    vendors: {
      full: false,
      view: true,
      create: true,
      edit: true,
      delete: true,
      bankAccount: false,
      communication: true,
      statement: true,
      syncZohoCRM: true,
      merge: true
    }
  });

  // More Permissions modal state
  const [morePermissionsModal, setMorePermissionsModal] = useState({
    isOpen: false,
    contactType: null // 'customers' or 'vendors'
  });

  // Items permissions
  const [itemsPermissions, setItemsPermissions] = useState({
    item: { full: true, view: true, create: true, edit: true, delete: true, approve: false },
    inventoryAdjustments: {
      full: true,
      view: true,
      create: true,
      edit: true,
      delete: true,
      approve: true,
      configureReason: true,
      editDeleteApproved: true
    },
    priceList: { full: true, view: true, create: true, edit: true, delete: true, approve: false }
  });

  // Items More Permissions modal state
  const [itemsMorePermissionsModal, setItemsMorePermissionsModal] = useState(false);

  // Banking permissions
  const [bankingPermissions, setBankingPermissions] = useState({
    banking: {
      full: true,
      view: true,
      create: true,
      edit: true,
      delete: true,
      reconciliation: true,
      manageBankTransactions: true,
      manageBankFeeds: true
    }
  });

  // Banking More Permissions modal state
  const [bankingMorePermissionsModal, setBankingMorePermissionsModal] = useState(false);

  // Sales permissions
  const [salesPermissions, setSalesPermissions] = useState({
    invoices: {
      full: false,
      view: true,
      create: true,
      edit: true,
      delete: true,
      approve: false,
      communication: true,
      voidInvoices: true,
      writeOffInvoices: true,
      editDeleteApproved: false
    },
    customerPayments: {
      full: true,
      view: true,
      create: true,
      edit: true,
      delete: true,
      approve: false,
      communication: true
    },
    quotes: {
      full: false,
      view: true,
      create: true,
      edit: true,
      delete: true,
      approve: false,
      communication: true,
      editDeleteApproved: false
    },
    salesReceipt: { full: false, view: true, create: true, edit: true, delete: true, approve: false },
    salesOrders: {
      full: false,
      view: true,
      create: true,
      edit: true,
      delete: true,
      approve: false,
      communication: true,
      editDeleteApproved: false
    },
    creditNotes: {
      full: false,
      view: true,
      create: true,
      edit: true,
      delete: true,
      approve: false,
      communication: true,
      editDeleteApproved: false
    }
  });

  // Sales More Permissions modal state (for invoices, customerPayments, quotes, etc.)
  const [salesMorePermissionsModal, setSalesMorePermissionsModal] = useState({
    isOpen: false,
    type: null // 'invoices', 'customerPayments', 'quotes', etc.
  });

  // Purchases permissions
  const [purchasesPermissions, setPurchasesPermissions] = useState({
    bills: {
      full: false,
      view: true,
      create: true,
      edit: true,
      delete: true,
      approve: false,
      voidBills: true,
      editDeleteApproved: false
    },
    vendorPayments: {
      full: false,
      view: true,
      create: true,
      edit: true,
      delete: true,
      approve: false,
      editDeleteApproved: false
    },
    expenses: { full: true, view: true, create: true, edit: true, delete: true, approve: false },
    purchaseOrders: {
      full: false,
      view: true,
      create: true,
      edit: true,
      delete: true,
      approve: false,
      communication: true,
      editDeleteApproved: false
    },
    vendorCredits: {
      full: false,
      view: true,
      create: true,
      edit: true,
      delete: true,
      approve: false,
      refund: true,
      editDeleteApproved: false
    }
  });

  // Purchases More Permissions modal state (for bills, etc.)
  const [purchasesMorePermissionsModal, setPurchasesMorePermissionsModal] = useState({
    isOpen: false,
    type: null // 'bills', etc.
  });

  // Accountant permissions
  const [accountantPermissions, setAccountantPermissions] = useState({
    chartOfAccounts: {
      full: false,
      view: false,
      create: false,
      edit: false,
      delete: false,
      approve: false,
      taxPayments: false,
      baseCurrencyAdjustments: false,
      openingBalance: false,
      transactionLock: false,
      bulkUpdate: false
    },
    journals: {
      full: false,
      view: false,
      create: false,
      edit: false,
      delete: false,
      approve: false,
      publish: false,
      editDeleteApproved: false
    },
    budget: { full: false, view: false, create: false, edit: false, delete: false, approve: false }
  });

  // Accountant More Permissions modal state
  const [accountantMorePermissionsModal, setAccountantMorePermissionsModal] = useState({
    isOpen: false,
    type: null // 'chartOfAccounts' or 'journals'
  });

  // Timesheets permissions
  const [timesheetsPermissions, setTimesheetsPermissions] = useState({
    projects: {
      full: false,
      view: true,
      create: false,
      edit: false,
      delete: false,
      manageTimeEntriesOtherUsers: true,
      viewTimeEntriesOtherUsers: true,
      viewProjectsOtherUsers: true,
      manageTimeEntryCost: true
    },
    noExpenses: true
  });

  // Timesheets More Permissions modal state
  const [timesheetsMorePermissionsModal, setTimesheetsMorePermissionsModal] = useState(false);

  // Locations permissions
  const [locationsPermissions, setLocationsPermissions] = useState({
    locations: { full: false, view: false, create: false, edit: false, delete: false }
  });

  // VAT Filing permissions
  const [vatFilingEnabled, setVatFilingEnabled] = useState(false);
  const [vatFilingPermissions, setVatFilingPermissions] = useState({
    viewAgentInvitationDetails: false,
    manageAgentInvitation: false,
    manageVatReturn: false,
    submitVatReturn: false
  });

  // Documents permissions
  const [documentsEnabled, setDocumentsEnabled] = useState(true);
  const [documentsPermissions, setDocumentsPermissions] = useState({
    view: true,
    upload: true,
    delete: true,
    manageFolder: true
  });

  // Settings permissions
  const [settingsEnabled, setSettingsEnabled] = useState(false);
  const [settingsPermissions, setSettingsPermissions] = useState({
    updateOrgProfile: false,
    users: false,
    exportData: false,
    generalPreferences: false,
    accountantPreferences: false,
    taxes: false,
    protectedData: false,
    paymentTerms: false,
    templates: false,
    emailTemplate: false,
    reportingTags: false,
    manageIntegration: false,
    automation: false,
    incomingWebhook: false,
    signal: false
  });

  // Dashboard permissions
  const [dashboardEnabled, setDashboardEnabled] = useState(false);
  const [dashboardPermissions, setDashboardPermissions] = useState({
    totalPayables: false,
    totalReceivables: false,
    cashFlow: false,
    incomeAndExpenses: false,
    topExpense: false,
    projects: false,
    bankAndCreditCards: false,
    accountWatchlist: false
  });
  const [allowDashboardManagement, setAllowDashboardManagement] = useState(false);

  // Reports permissions
  const [fullReportsAccess, setFullReportsAccess] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState({});

  // Business Overview sub-items permissions
  const [businessOverviewPermissions, setBusinessOverviewPermissions] = useState({
    "Profit and Loss": { fullAccess: false, view: false, export: false, schedule: false, share: false },
    "Cash Flow Statement": { fullAccess: false, view: false, export: false, schedule: false, share: false },
    "Balance Sheet": { fullAccess: false, view: false, export: false, schedule: false, share: false },
    "Business Performance Ratios": { fullAccess: false, view: false, export: false, schedule: false, share: false },
    "Cash Flow Forecasting": { fullAccess: false, view: false, export: false, schedule: false, share: false },
    "Movement of Equity": { fullAccess: false, view: false, export: false, schedule: false, share: false }
  });

  // Sales Reports sub-items permissions
  const [salesReportsPermissions, setSalesReportsPermissions] = useState({
    "Sales by Customer": { fullAccess: false, view: false, export: false, schedule: false, share: false, locked: true },
    "Sales by Item": { fullAccess: false, view: false, export: false, schedule: false, share: false, locked: false },
    "Order Fulfillment By Item": { fullAccess: false, view: false, export: false, schedule: false, share: false, locked: false },
    "Sales Return History": { fullAccess: false, view: false, export: false, schedule: false, share: false, locked: false },
    "Sales by Sales Person": { fullAccess: false, view: false, export: false, schedule: false, share: false, locked: false },
    "EC Sales list": { fullAccess: false, view: false, export: false, schedule: false, share: false, locked: false },
    "Sales Summary": { fullAccess: false, view: false, export: false, schedule: false, share: false, locked: false },
    "Profit By Item": { fullAccess: false, view: false, export: false, schedule: false, share: false, locked: false }
  });

  // Inventory sub-items permissions
  const [inventoryPermissions, setInventoryPermissions] = useState({
    "Inventory Summary": { fullAccess: false, view: false, export: false, schedule: false, share: false },
    "Committed Stock Details": { fullAccess: false, view: false, export: false, schedule: false, share: false },
    "Inventory Aging Summary": { fullAccess: false, view: false, export: false, schedule: false, share: false },
    "Stock Summary": { fullAccess: false, view: false, export: false, schedule: false, share: false },
    "Inventory Adjustment Summary": { fullAccess: false, view: false, export: false, schedule: false, share: false },
    "Inventory Adjustment Details": { fullAccess: false, view: false, export: false, schedule: false, share: false }
  });

  // Inventory Valuation sub-items permissions
  const [inventoryValuationPermissions, setInventoryValuationPermissions] = useState({
    "Inventory Valuation Summary": { fullAccess: false, view: false, export: false, schedule: false, share: false },
    "FIFO Cost Lot Tracking": { fullAccess: false, view: false, export: false, schedule: false, share: false },
    "ABC classification": { fullAccess: false, view: false, export: false, schedule: false, share: false }
  });

  // Receivables sub-items permissions
  const [receivablesPermissions, setReceivablesPermissions] = useState({
    "AR Aging Summary": { fullAccess: false, view: false, export: false, schedule: false, share: false, locked: true },
    "AR Aging Details": { fullAccess: false, view: false, export: false, schedule: false, share: false, locked: true },
    "Invoice Details": { fullAccess: false, view: false, export: false, schedule: false, share: false, locked: false },
    "Retainer Invoice Details": { fullAccess: false, view: false, export: false, schedule: false, share: false, locked: false },
    "Sales Order Details": { fullAccess: false, view: false, export: false, schedule: false, share: false, locked: false },
    "Delivery Challan Details": { fullAccess: false, view: false, export: false, schedule: false, share: false, locked: false },
    "Quote Details": { fullAccess: false, view: false, export: false, schedule: false, share: false, locked: false },
    "Customer Balance Summary": { fullAccess: false, view: false, export: false, schedule: false, share: false, locked: true },
    "Receivable Summary": { fullAccess: false, view: false, export: false, schedule: false, share: false, locked: false },
    "Receivable Details": { fullAccess: false, view: false, export: false, schedule: false, share: false, locked: false }
  });

  // Payments Received sub-items permissions
  const [paymentsReceivedPermissions, setPaymentsReceivedPermissions] = useState({
    "Payments Received": { fullAccess: false, view: false, export: false, schedule: false, share: false },
    "Time to Get Paid": { fullAccess: false, view: false, export: false, schedule: false, share: false },
    "Credit Note Details": { fullAccess: false, view: false, export: false, schedule: false, share: false },
    "Refund History": { fullAccess: false, view: false, export: false, schedule: false, share: false }
  });

  // Recurring Invoices sub-items permissions
  const [recurringInvoicesPermissions, setRecurringInvoicesPermissions] = useState({
    "Recurring Invoice Details": { fullAccess: false, view: false, export: false, schedule: false, share: false },
    "Payment Failure": { fullAccess: false, view: false, export: false, schedule: false, share: false },
    "Payment Retry": { fullAccess: false, view: false, export: false, schedule: false, share: false },
    "Card Expiry": { fullAccess: false, view: false, export: false, schedule: false, share: false }
  });

  // Payables sub-items permissions
  const [payablesPermissions, setPayablesPermissions] = useState({
    "Vendor Balance Summary": { fullAccess: false, view: false, export: false, schedule: false, share: false, locked: true },
    "AP Aging Summary": { fullAccess: false, view: false, export: false, schedule: false, share: false, locked: true },
    "AP Aging Details": { fullAccess: false, view: false, export: false, schedule: false, share: false, locked: true },
    "Bill Details": { fullAccess: false, view: false, export: false, schedule: false, share: false, locked: false },
    "Vendor Credit Details": { fullAccess: false, view: false, export: false, schedule: false, share: false, locked: false },
    "Payments Made": { fullAccess: false, view: false, export: false, schedule: false, share: false, locked: false },
    "Refund History": { fullAccess: false, view: false, export: false, schedule: false, share: false, locked: false },
    "Purchase Order Details": { fullAccess: false, view: false, export: false, schedule: false, share: false, locked: false },
    "Purchase Orders by Vendor": { fullAccess: false, view: false, export: false, schedule: false, share: false, locked: false },
    "Payable Summary": { fullAccess: false, view: false, export: false, schedule: false, share: false, locked: false },
    "Payable Details": { fullAccess: false, view: false, export: false, schedule: false, share: false, locked: false }
  });

  // Purchases and Expenses sub-items permissions
  const [purchasesAndExpensesPermissions, setPurchasesAndExpensesPermissions] = useState({
    "Active Purchase Orders Report": { fullAccess: false, view: false, export: false, schedule: false, share: false, locked: false },
    "Purchases by Vendor": { fullAccess: false, view: false, export: false, schedule: false, share: false, locked: true },
    "Purchases by Item": { fullAccess: false, view: false, export: false, schedule: false, share: false, locked: false },
    "Expense Details": { fullAccess: false, view: false, export: false, schedule: false, share: false, locked: false },
    "Expenses by Category": { fullAccess: false, view: false, export: false, schedule: false, share: false, locked: true },
    "Expenses by Customer": { fullAccess: false, view: false, export: false, schedule: false, share: false, locked: false },
    "Expenses by Project": { fullAccess: false, view: false, export: false, schedule: false, share: false, locked: false },
    "Expenses by Employee": { fullAccess: false, view: false, export: false, schedule: false, share: false, locked: false },
    "Billable Expense Details": { fullAccess: false, view: false, export: false, schedule: false, share: false, locked: false }
  });

  // Taxes sub-items permissions
  const [taxesPermissions, setTaxesPermissions] = useState({
    "VAT Calculation Summary": { fullAccess: false, view: false, export: false, schedule: false, share: false },
    "VAT MOSS Report": { fullAccess: false, view: false, export: false, schedule: false, share: false },
    "IOSS Report": { fullAccess: false, view: false, export: false, schedule: false, share: false }
  });

  // Banking Reports sub-items permissions
  const [bankingReportsPermissions, setBankingReportsPermissions] = useState({
    "Reconciliation Status": { fullAccess: false, view: false, export: false, schedule: false, share: false }
  });

  // Projects and Timesheet sub-items permissions
  const [projectsAndTimesheetPermissions, setProjectsAndTimesheetPermissions] = useState({
    "Timesheet Details": { fullAccess: false, view: false, export: false, schedule: false, share: false },
    "Timesheet Profitability Summary": { fullAccess: false, view: false, export: false, schedule: false, share: false },
    "Project Summary": { fullAccess: false, view: false, export: false, schedule: false, share: false },
    "Project Details": { fullAccess: false, view: false, export: false, schedule: false, share: false },
    "Projects Cost Summary": { fullAccess: false, view: false, export: false, schedule: false, share: false },
    "Projects Revenue Summary": { fullAccess: false, view: false, export: false, schedule: false, share: false },
    "Projects Performance Summary": { fullAccess: false, view: false, export: false, schedule: false, share: false },
    "Project Revenue Details": { fullAccess: false, view: false, export: false, schedule: false, share: false },
    "TimeSheet Profitability Details": { fullAccess: false, view: false, export: false, schedule: false, share: false }
  });

  // Accountant sub-items permissions
  const [accountantReportsPermissions, setAccountantReportsPermissions] = useState({
    "Account Transactions": { fullAccess: false, view: false, export: false, schedule: false, share: false },
    "Account Type Summary": { fullAccess: false, view: false, export: false, schedule: false, share: false },
    "General Ledger": { fullAccess: false, view: false, export: false, schedule: false, share: false },
    "Detailed General Ledger": { fullAccess: false, view: false, export: false, schedule: false, share: false },
    "Journal Report": { fullAccess: false, view: false, export: false, schedule: false, share: false },
    "Trial Balance": { fullAccess: false, view: false, export: false, schedule: false, share: false }
  });

  // Budgets sub-items permissions
  const [budgetsPermissions, setBudgetsPermissions] = useState({
    "Budget Vs Actuals": { fullAccess: false, view: false, export: false, schedule: false, share: false }
  });

  // Currency sub-items permissions
  const [currencyPermissions, setCurrencyPermissions] = useState({
    "Realised Gain or Loss": { fullAccess: false, view: false, export: false, schedule: false, share: false },
    "Unrealised Gain or Loss": { fullAccess: false, view: false, export: false, schedule: false, share: false }
  });

  // Activity sub-items permissions
  const [activityPermissions, setActivityPermissions] = useState({
    "System Mails": { fullAccess: false, view: false, export: false, schedule: false, share: false },
    "SMS Notifications": { fullAccess: false, view: false, export: false, schedule: false, share: false },
    "Snail Mail Credits Report": { fullAccess: false, view: false, export: false, schedule: false, share: false },
    "Activity Logs": { fullAccess: false, view: false, export: false, schedule: false, share: false },
    "Exception Report": { fullAccess: false, view: false, export: false, schedule: false, share: false },
    "Portal Activities": { fullAccess: false, view: false, export: false, schedule: false, share: false },
    "Customer Reviews": { fullAccess: false, view: false, export: false, schedule: false, share: false },
    "API Usage": { fullAccess: false, view: false, export: false, schedule: false, share: false },
    "Pending Inventory Valuations": { fullAccess: false, view: false, export: false, schedule: false, share: false }
  });

  // Automation sub-items permissions
  const [automationPermissions, setAutomationPermissions] = useState({
    "Scheduled Date Based Workflow Rules": { fullAccess: false, view: false, export: false, schedule: false, share: false },
    "Scheduled Time Based Workflow Actions": { fullAccess: false, view: false, export: false, schedule: false, share: false }
  });

  useEffect(() => {
    const applyRoleData = (roleData: any) => {
      if (!roleData) return;

      if (roleData.name) setRoleName(String(roleData.name));
      if (roleData.description !== undefined) setDescription(String(roleData.description || ""));
      setIsAccountantRole(Boolean(roleData.isAccountantRole));

      setContactsPermissions((prev) => mergeWithDefaults(prev, roleData.contacts || {}));
      setItemsPermissions((prev) => mergeWithDefaults(prev, roleData.items || {}));
      setBankingPermissions((prev) => mergeWithDefaults(prev, roleData.banking || {}));
      setSalesPermissions((prev) => mergeWithDefaults(prev, roleData.sales || {}));
      setPurchasesPermissions((prev) => mergeWithDefaults(prev, roleData.purchases || {}));
      setAccountantPermissions((prev) => mergeWithDefaults(prev, roleData.accountant || {}));
      setTimesheetsPermissions((prev) => mergeWithDefaults(prev, roleData.timesheets || {}));
      setLocationsPermissions((prev) => mergeWithDefaults(prev, roleData.locations || {}));

      if (roleData.vatFiling) {
        setVatFilingEnabled(Boolean(roleData.vatFiling.enabled));
        setVatFilingPermissions((prev) => mergeWithDefaults(prev, roleData.vatFiling));
      }

      if (roleData.documents) {
        setDocumentsEnabled(Boolean(roleData.documents.enabled));
        setDocumentsPermissions((prev) => mergeWithDefaults(prev, roleData.documents));
      }

      if (roleData.settings) {
        setSettingsEnabled(Boolean(roleData.settings.enabled));
        setSettingsPermissions((prev) => mergeWithDefaults(prev, roleData.settings));
      }

      if (roleData.dashboard) {
        setDashboardEnabled(Boolean(roleData.dashboard.enabled));
        setAllowDashboardManagement(Boolean(roleData.dashboard.allowDashboardManagement));
        setDashboardPermissions((prev) => mergeWithDefaults(prev, roleData.dashboard));
      }

      if (roleData.reports) {
        setFullReportsAccess(Boolean(roleData.reports.fullReportsAccess));
        const reportGroups = roleData.reports.reportGroups || {};
        setBusinessOverviewPermissions((prev) => mergeWithDefaults(prev, reportGroups["Business Overview"] || {}));
        setSalesReportsPermissions((prev) => mergeWithDefaults(prev, reportGroups["Sales"] || {}));
        setInventoryPermissions((prev) => mergeWithDefaults(prev, reportGroups["Inventory"] || {}));
        setInventoryValuationPermissions((prev) => mergeWithDefaults(prev, reportGroups["Inventory Valuation"] || {}));
        setReceivablesPermissions((prev) => mergeWithDefaults(prev, reportGroups["Receivables"] || {}));
        setPaymentsReceivedPermissions((prev) => mergeWithDefaults(prev, reportGroups["Payments Received"] || {}));
        setRecurringInvoicesPermissions((prev) => mergeWithDefaults(prev, reportGroups["Recurring Invoices"] || {}));
        setPayablesPermissions((prev) => mergeWithDefaults(prev, reportGroups["Payables"] || {}));
        setPurchasesAndExpensesPermissions((prev) => mergeWithDefaults(prev, reportGroups["Purchases and Expenses"] || {}));
        setTaxesPermissions((prev) => mergeWithDefaults(prev, reportGroups["Taxes"] || {}));
        setBankingReportsPermissions((prev) => mergeWithDefaults(prev, reportGroups["Banking"] || {}));
        setProjectsAndTimesheetPermissions((prev) => mergeWithDefaults(prev, reportGroups["Projects and Timesheet"] || {}));
        setAccountantReportsPermissions((prev) => mergeWithDefaults(prev, reportGroups["Accountant"] || {}));
        setBudgetsPermissions((prev) => mergeWithDefaults(prev, reportGroups["Budgets"] || {}));
        setCurrencyPermissions((prev) => mergeWithDefaults(prev, reportGroups["Currency"] || {}));
        setActivityPermissions((prev) => mergeWithDefaults(prev, reportGroups["Activity"] || {}));
        setAutomationPermissions((prev) => mergeWithDefaults(prev, reportGroups["Automation"] || {}));
      }
    };

    const cloneData = (location.state as any)?.cloneData;
    if (!isEditMode && cloneData) {
      applyRoleData(cloneData);
      return;
    }

    if (!isEditMode || !id) {
      setIsLoadingRole(false);
      return;
    }

    let isMounted = true;

    const loadRole = async () => {
      try {
        setIsLoadingRole(true);
        setError(null);

        const response = await rolesAPI.getById(id);
        if (!response?.success || !response?.data) {
          throw new Error(response?.message || "Failed to load role");
        }

        if (!isMounted) return;
        applyRoleData(response.data);
      } catch (loadError: any) {
        if (!isMounted) return;
        console.error("Error loading role:", loadError);
        setError(loadError?.message || "Failed to load role");
      } finally {
        if (isMounted) setIsLoadingRole(false);
      }
    };

    loadRole();

    return () => {
      isMounted = false;
    };
  }, [id, isEditMode, location.state]);

  const toggleGroup = (groupName) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupName]: !prev[groupName]
    }));
  };

  const handleBusinessOverviewPermission = (reportName, permissionType) => {
    setBusinessOverviewPermissions(prev => ({
      ...prev,
      [reportName]: {
        ...prev[reportName],
        [permissionType]: !prev[reportName][permissionType]
      }
    }));
  };

  const handleSalesReportsPermission = (reportName, permissionType) => {
    const report = salesReportsPermissions[reportName];
    if (report.locked) return; // Don't allow changes for locked items

    setSalesReportsPermissions(prev => ({
      ...prev,
      [reportName]: {
        ...prev[reportName],
        [permissionType]: !prev[reportName][permissionType]
      }
    }));
  };

  const handleInventoryPermission = (reportName, permissionType) => {
    setInventoryPermissions(prev => ({
      ...prev,
      [reportName]: {
        ...prev[reportName],
        [permissionType]: !prev[reportName][permissionType]
      }
    }));
  };

  const handleInventoryValuationPermission = (reportName, permissionType) => {
    setInventoryValuationPermissions(prev => ({
      ...prev,
      [reportName]: {
        ...prev[reportName],
        [permissionType]: !prev[reportName][permissionType]
      }
    }));
  };

  const handleReceivablesPermission = (reportName, permissionType) => {
    const report = receivablesPermissions[reportName];
    if (report.locked) return; // Don't allow changes for locked items

    setReceivablesPermissions(prev => ({
      ...prev,
      [reportName]: {
        ...prev[reportName],
        [permissionType]: !prev[reportName][permissionType]
      }
    }));
  };

  const handlePaymentsReceivedPermission = (reportName, permissionType) => {
    setPaymentsReceivedPermissions(prev => ({
      ...prev,
      [reportName]: {
        ...prev[reportName],
        [permissionType]: !prev[reportName][permissionType]
      }
    }));
  };

  const handleRecurringInvoicesPermission = (reportName, permissionType) => {
    setRecurringInvoicesPermissions(prev => ({
      ...prev,
      [reportName]: {
        ...prev[reportName],
        [permissionType]: !prev[reportName][permissionType]
      }
    }));
  };

  const handlePayablesPermission = (reportName, permissionType) => {
    const report = payablesPermissions[reportName];
    if (report.locked) return; // Don't allow changes for locked items

    setPayablesPermissions(prev => ({
      ...prev,
      [reportName]: {
        ...prev[reportName],
        [permissionType]: !prev[reportName][permissionType]
      }
    }));
  };

  const handlePurchasesAndExpensesPermission = (reportName, permissionType) => {
    const report = purchasesAndExpensesPermissions[reportName];
    if (report.locked) return; // Don't allow changes for locked items

    setPurchasesAndExpensesPermissions(prev => ({
      ...prev,
      [reportName]: {
        ...prev[reportName],
        [permissionType]: !prev[reportName][permissionType]
      }
    }));
  };

  const handleTaxesPermission = (reportName, permissionType) => {
    setTaxesPermissions(prev => ({
      ...prev,
      [reportName]: {
        ...prev[reportName],
        [permissionType]: !prev[reportName][permissionType]
      }
    }));
  };

  const handleBankingReportsPermission = (reportName, permissionType) => {
    setBankingReportsPermissions(prev => ({
      ...prev,
      [reportName]: {
        ...prev[reportName],
        [permissionType]: !prev[reportName][permissionType]
      }
    }));
  };

  const handleProjectsAndTimesheetPermission = (reportName, permissionType) => {
    setProjectsAndTimesheetPermissions(prev => ({
      ...prev,
      [reportName]: {
        ...prev[reportName],
        [permissionType]: !prev[reportName][permissionType]
      }
    }));
  };

  const handleAccountantReportsPermission = (reportName, permissionType) => {
    setAccountantReportsPermissions(prev => ({
      ...prev,
      [reportName]: {
        ...prev[reportName],
        [permissionType]: !prev[reportName][permissionType]
      }
    }));
  };

  const handleBudgetsPermission = (reportName, permissionType) => {
    setBudgetsPermissions(prev => ({
      ...prev,
      [reportName]: {
        ...prev[reportName],
        [permissionType]: !prev[reportName][permissionType]
      }
    }));
  };

  const handleCurrencyPermission = (reportName, permissionType) => {
    setCurrencyPermissions(prev => ({
      ...prev,
      [reportName]: {
        ...prev[reportName],
        [permissionType]: !prev[reportName][permissionType]
      }
    }));
  };

  const handleActivityPermission = (reportName, permissionType) => {
    setActivityPermissions(prev => ({
      ...prev,
      [reportName]: {
        ...prev[reportName],
        [permissionType]: !prev[reportName][permissionType]
      }
    }));
  };

  const handleAutomationPermission = (reportName, permissionType) => {
    setAutomationPermissions(prev => ({
      ...prev,
      [reportName]: {
        ...prev[reportName],
        [permissionType]: !prev[reportName][permissionType]
      }
    }));
  };

  const handleSelectAll = (permissionType, groupName) => {
    if (groupName === "Business Overview") {
      const allSelected = Object.values(businessOverviewPermissions).every(
        perm => perm[permissionType]
      );

      const updated = { ...businessOverviewPermissions };
      Object.keys(updated).forEach(key => {
        updated[key] = {
          ...updated[key],
          [permissionType]: !allSelected
        };
      });
      setBusinessOverviewPermissions(updated);
    } else if (groupName === "Sales") {
      const unlockedPermissions = Object.entries(salesReportsPermissions).filter(([_, perm]) => !perm.locked);
      const allSelected = unlockedPermissions.every(
        ([_, perm]) => perm[permissionType]
      );

      const updated = { ...salesReportsPermissions };
      Object.keys(updated).forEach(key => {
        if (!updated[key].locked) {
          updated[key] = {
            ...updated[key],
            [permissionType]: !allSelected
          };
        }
      });
      setSalesReportsPermissions(updated);
    } else if (groupName === "Inventory") {
      const allSelected = Object.values(inventoryPermissions).every(
        perm => perm[permissionType]
      );

      const updated = { ...inventoryPermissions };
      Object.keys(updated).forEach(key => {
        updated[key] = {
          ...updated[key],
          [permissionType]: !allSelected
        };
      });
      setInventoryPermissions(updated);
    } else if (groupName === "Inventory Valuation") {
      const allSelected = Object.values(inventoryValuationPermissions).every(
        perm => perm[permissionType]
      );

      const updated = { ...inventoryValuationPermissions };
      Object.keys(updated).forEach(key => {
        updated[key] = {
          ...updated[key],
          [permissionType]: !allSelected
        };
      });
      setInventoryValuationPermissions(updated);
    } else if (groupName === "Receivables") {
      const unlockedPermissions = Object.entries(receivablesPermissions).filter(([_, perm]) => !perm.locked);
      const allSelected = unlockedPermissions.every(
        ([_, perm]) => perm[permissionType]
      );

      const updated = { ...receivablesPermissions };
      Object.keys(updated).forEach(key => {
        if (!updated[key].locked) {
          updated[key] = {
            ...updated[key],
            [permissionType]: !allSelected
          };
        }
      });
      setReceivablesPermissions(updated);
    } else if (groupName === "Payments Received") {
      const allSelected = Object.values(paymentsReceivedPermissions).every(
        perm => perm[permissionType]
      );

      const updated = { ...paymentsReceivedPermissions };
      Object.keys(updated).forEach(key => {
        updated[key] = {
          ...updated[key],
          [permissionType]: !allSelected
        };
      });
      setPaymentsReceivedPermissions(updated);
    } else if (groupName === "Recurring Invoices") {
      const allSelected = Object.values(recurringInvoicesPermissions).every(
        perm => perm[permissionType]
      );

      const updated = { ...recurringInvoicesPermissions };
      Object.keys(updated).forEach(key => {
        updated[key] = {
          ...updated[key],
          [permissionType]: !allSelected
        };
      });
      setRecurringInvoicesPermissions(updated);
    } else if (groupName === "Payables") {
      const unlockedPermissions = Object.entries(payablesPermissions).filter(([_, perm]) => !perm.locked);
      const allSelected = unlockedPermissions.every(
        ([_, perm]) => perm[permissionType]
      );

      const updated = { ...payablesPermissions };
      Object.keys(updated).forEach(key => {
        if (!updated[key].locked) {
          updated[key] = {
            ...updated[key],
            [permissionType]: !allSelected
          };
        }
      });
      setPayablesPermissions(updated);
    } else if (groupName === "Purchases and Expenses") {
      const unlockedPermissions = Object.entries(purchasesAndExpensesPermissions).filter(([_, perm]) => !perm.locked);
      const allSelected = unlockedPermissions.every(
        ([_, perm]) => perm[permissionType]
      );

      const updated = { ...purchasesAndExpensesPermissions };
      Object.keys(updated).forEach(key => {
        if (!updated[key].locked) {
          updated[key] = {
            ...updated[key],
            [permissionType]: !allSelected
          };
        }
      });
      setPurchasesAndExpensesPermissions(updated);
    } else if (groupName === "Taxes") {
      const allSelected = Object.values(taxesPermissions).every(
        perm => perm[permissionType]
      );

      const updated = { ...taxesPermissions };
      Object.keys(updated).forEach(key => {
        updated[key] = {
          ...updated[key],
          [permissionType]: !allSelected
        };
      });
      setTaxesPermissions(updated);
    } else if (groupName === "Banking") {
      const allSelected = Object.values(bankingReportsPermissions).every(
        perm => perm[permissionType]
      );

      const updated = { ...bankingReportsPermissions };
      Object.keys(updated).forEach(key => {
        updated[key] = {
          ...updated[key],
          [permissionType]: !allSelected
        };
      });
      setBankingReportsPermissions(updated);
    } else if (groupName === "Projects and Timesheet") {
      const allSelected = Object.values(projectsAndTimesheetPermissions).every(
        perm => perm[permissionType]
      );

      const updated = { ...projectsAndTimesheetPermissions };
      Object.keys(updated).forEach(key => {
        updated[key] = {
          ...updated[key],
          [permissionType]: !allSelected
        };
      });
      setProjectsAndTimesheetPermissions(updated);
    } else if (groupName === "Accountant") {
      const allSelected = Object.values(accountantReportsPermissions).every(
        perm => perm[permissionType]
      );

      const updated = { ...accountantReportsPermissions };
      Object.keys(updated).forEach(key => {
        updated[key] = {
          ...updated[key],
          [permissionType]: !allSelected
        };
      });
      setAccountantReportsPermissions(updated);
    } else if (groupName === "Budgets") {
      const allSelected = Object.values(budgetsPermissions).every(
        perm => perm[permissionType]
      );

      const updated = { ...budgetsPermissions };
      Object.keys(updated).forEach(key => {
        updated[key] = {
          ...updated[key],
          [permissionType]: !allSelected
        };
      });
      setBudgetsPermissions(updated);
    } else if (groupName === "Currency") {
      const allSelected = Object.values(currencyPermissions).every(
        perm => perm[permissionType]
      );

      const updated = { ...currencyPermissions };
      Object.keys(updated).forEach(key => {
        updated[key] = {
          ...updated[key],
          [permissionType]: !allSelected
        };
      });
      setCurrencyPermissions(updated);
    } else if (groupName === "Activity") {
      const allSelected = Object.values(activityPermissions).every(
        perm => perm[permissionType]
      );

      const updated = { ...activityPermissions };
      Object.keys(updated).forEach(key => {
        updated[key] = {
          ...updated[key],
          [permissionType]: !allSelected
        };
      });
      setActivityPermissions(updated);
    } else if (groupName === "Automation") {
      const allSelected = Object.values(automationPermissions).every(
        perm => perm[permissionType]
      );

      const updated = { ...automationPermissions };
      Object.keys(updated).forEach(key => {
        updated[key] = {
          ...updated[key],
          [permissionType]: !allSelected
        };
      });
      setAutomationPermissions(updated);
    }
  };

  return (
    <div className="p-6 w-full">
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">{isEditMode ? "Edit Role" : "New Role"}</h1>

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
          <AlertCircle size={20} className="text-red-600 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Basic Info */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Role Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={roleName}
              onChange={(e) => setRoleName(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter role name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              maxLength={500}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="Enter description"
            />
            <p className="mt-1 text-xs text-gray-500">Max. 500 characters</p>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={isAccountantRole}
                onChange={(e) => setIsAccountantRole(e.target.checked)}
                className="mt-1 h-4 w-4"
              />
              <div>
                <span className="text-sm font-medium text-gray-900">This role is for Accountant users</span>
                <p className="text-xs text-gray-600 mt-1">
                  If you mark this option, all users who are added with this role will be an accountant user.
                </p>
              </div>
            </label>
          </div>
        </div>
      </div>

      {/* Contacts Section */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Contacts</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">Particulars</th>
                <th className="px-4 py-2 text-center text-xs font-semibold text-gray-700">Full</th>
                <th className="px-4 py-2 text-center text-xs font-semibold text-gray-700">View</th>
                <th className="px-4 py-2 text-center text-xs font-semibold text-gray-700">Create</th>
                <th className="px-4 py-2 text-center text-xs font-semibold text-gray-700">Edit</th>
                <th className="px-4 py-2 text-center text-xs font-semibold text-gray-700">Delete</th>
                <th className="px-4 py-2 text-center text-xs font-semibold text-gray-700">Assign owner</th>
                <th className="px-4 py-2 text-center text-xs font-semibold text-gray-700">Others</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              <tr>
                <td className="px-4 py-3 text-sm font-medium text-gray-900">Customers</td>
                <td className="px-4 py-3 text-center">
                  <input type="checkbox" checked={contactsPermissions.customers.full} onChange={(e) => {
                    const val = e.target.checked;
                    setContactsPermissions({
                      ...contactsPermissions,
                      customers: { ...contactsPermissions.customers, full: val, view: val, create: val, edit: val, delete: val }
                    });
                  }} className="h-4 w-4" />
                </td>
                <td className="px-4 py-3 text-center">
                  <input type="checkbox" checked={contactsPermissions.customers.view} onChange={(e) => setContactsPermissions({
                    ...contactsPermissions,
                    customers: { ...contactsPermissions.customers, view: e.target.checked }
                  })} className="h-4 w-4" />
                </td>
                <td className="px-4 py-3 text-center">
                  <input type="checkbox" checked={contactsPermissions.customers.create} onChange={(e) => setContactsPermissions({
                    ...contactsPermissions,
                    customers: { ...contactsPermissions.customers, create: e.target.checked }
                  })} className="h-4 w-4" />
                </td>
                <td className="px-4 py-3 text-center">
                  <input type="checkbox" checked={contactsPermissions.customers.edit} onChange={(e) => setContactsPermissions({
                    ...contactsPermissions,
                    customers: { ...contactsPermissions.customers, edit: e.target.checked }
                  })} className="h-4 w-4" />
                </td>
                <td className="px-4 py-3 text-center">
                  <input type="checkbox" checked={contactsPermissions.customers.delete} onChange={(e) => setContactsPermissions({
                    ...contactsPermissions,
                    customers: { ...contactsPermissions.customers, delete: e.target.checked }
                  })} className="h-4 w-4" />
                </td>
                <td className="px-4 py-3 text-center">
                  <input type="checkbox" checked={contactsPermissions.customers.assignOwner} onChange={(e) => setContactsPermissions({
                    ...contactsPermissions,
                    customers: { ...contactsPermissions.customers, assignOwner: e.target.checked }
                  })} className="h-4 w-4" />
                </td>
                <td className="px-4 py-3 text-center">
                  <button
                    onClick={() => setMorePermissionsModal({ isOpen: true, contactType: 'customers' })}
                    className="text-blue-600 hover:text-blue-700 text-sm"
                  >
                    More Permissions
                  </button>
                </td>
              </tr>
              <tr>
                <td colSpan={8} className="px-4 py-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={contactsPermissions.customers.assignedOnly}
                      onChange={(e) => setContactsPermissions({
                        ...contactsPermissions,
                        customers: { ...contactsPermissions.customers, assignedOnly: e.target.checked }
                      })}
                      className="h-4 w-4"
                    />
                    <span className="text-sm text-gray-700">Allow users to handle the data and transactions for assigned customers only.</span>
                  </label>
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-sm font-medium text-gray-900">Vendors</td>
                <td className="px-4 py-3 text-center">
                  <input type="checkbox" checked={contactsPermissions.vendors.full} onChange={(e) => {
                    const val = e.target.checked;
                    setContactsPermissions({
                      ...contactsPermissions,
                      vendors: { ...contactsPermissions.vendors, full: val, view: val, create: val, edit: val, delete: val }
                    });
                  }} className="h-4 w-4" />
                </td>
                <td className="px-4 py-3 text-center">
                  <input type="checkbox" checked={contactsPermissions.vendors.view} onChange={(e) => setContactsPermissions({
                    ...contactsPermissions,
                    vendors: { ...contactsPermissions.vendors, view: e.target.checked }
                  })} className="h-4 w-4" />
                </td>
                <td className="px-4 py-3 text-center">
                  <input type="checkbox" checked={contactsPermissions.vendors.create} onChange={(e) => setContactsPermissions({
                    ...contactsPermissions,
                    vendors: { ...contactsPermissions.vendors, create: e.target.checked }
                  })} className="h-4 w-4" />
                </td>
                <td className="px-4 py-3 text-center">
                  <input type="checkbox" checked={contactsPermissions.vendors.edit} onChange={(e) => setContactsPermissions({
                    ...contactsPermissions,
                    vendors: { ...contactsPermissions.vendors, edit: e.target.checked }
                  })} className="h-4 w-4" />
                </td>
                <td className="px-4 py-3 text-center">
                  <input type="checkbox" checked={contactsPermissions.vendors.delete} onChange={(e) => setContactsPermissions({
                    ...contactsPermissions,
                    vendors: { ...contactsPermissions.vendors, delete: e.target.checked }
                  })} className="h-4 w-4" />
                </td>
                <td className="px-4 py-3"></td>
                <td className="px-4 py-3 text-center">
                  <button
                    onClick={() => setMorePermissionsModal({ isOpen: true, contactType: 'vendors' })}
                    className="text-blue-600 hover:text-blue-700 text-sm"
                  >
                    More Permissions
                  </button>
                </td>
              </tr>
              <tr>
                <td colSpan={8} className="px-4 py-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={contactsPermissions.vendors.bankAccount}
                      onChange={(e) => setContactsPermissions({
                        ...contactsPermissions,
                        vendors: { ...contactsPermissions.vendors, bankAccount: e.target.checked }
                      })}
                      className="h-4 w-4"
                    />
                    <span className="text-sm text-gray-700">Allow users to add, edit and delete vendor's bank account details.</span>
                  </label>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* More Permissions Modal */}
      {morePermissionsModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setMorePermissionsModal({ isOpen: false, contactType: null })}>
          <div className="bg-white rounded-lg shadow-xl p-6 w-80 relative" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setMorePermissionsModal({ isOpen: false, contactType: null })}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X size={20} />
            </button>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 pr-6">
              More Permissions - {morePermissionsModal.contactType === 'customers' ? 'Customers' : 'Vendors'}
            </h3>
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={contactsPermissions[morePermissionsModal.contactType]?.communication || false}
                  onChange={(e) => setContactsPermissions({
                    ...contactsPermissions,
                    [morePermissionsModal.contactType]: {
                      ...contactsPermissions[morePermissionsModal.contactType],
                      communication: e.target.checked
                    }
                  })}
                  className="h-4 w-4 accent-blue-600"
                />
                <span className="text-sm text-gray-700 flex items-center gap-1">
                  Communication
                  <HelpCircle size={14} className="text-yellow-500" />
                </span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={contactsPermissions[morePermissionsModal.contactType]?.statement || false}
                  onChange={(e) => setContactsPermissions({
                    ...contactsPermissions,
                    [morePermissionsModal.contactType]: {
                      ...contactsPermissions[morePermissionsModal.contactType],
                      statement: e.target.checked
                    }
                  })}
                  className="h-4 w-4 accent-blue-600"
                />
                <span className="text-sm text-gray-700">Statement</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={contactsPermissions[morePermissionsModal.contactType]?.syncZohoCRM || false}
                  onChange={(e) => setContactsPermissions({
                    ...contactsPermissions,
                    [morePermissionsModal.contactType]: {
                      ...contactsPermissions[morePermissionsModal.contactType],
                      syncZohoCRM: e.target.checked
                    }
                  })}
                  className="h-4 w-4 accent-blue-600"
                />
                <span className="text-sm text-gray-700">Sync Zoho CRM</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={contactsPermissions[morePermissionsModal.contactType]?.merge || false}
                  onChange={(e) => setContactsPermissions({
                    ...contactsPermissions,
                    [morePermissionsModal.contactType]: {
                      ...contactsPermissions[morePermissionsModal.contactType],
                      merge: e.target.checked
                    }
                  })}
                  className="h-4 w-4 accent-blue-600"
                />
                <span className="text-sm text-gray-700">Merge</span>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Items Section */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Items</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">Particulars</th>
                <th className="px-4 py-2 text-center text-xs font-semibold text-gray-700">Full</th>
                <th className="px-4 py-2 text-center text-xs font-semibold text-gray-700">View</th>
                <th className="px-4 py-2 text-center text-xs font-semibold text-gray-700">Create</th>
                <th className="px-4 py-2 text-center text-xs font-semibold text-gray-700">Edit</th>
                <th className="px-4 py-2 text-center text-xs font-semibold text-gray-700">Delete</th>
                <th className="px-4 py-2 text-center text-xs font-semibold text-gray-700">Approve</th>
                <th className="px-4 py-2 text-center text-xs font-semibold text-gray-700">Others</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {["item", "inventoryAdjustments", "priceList"].map((key) => {
                const perm = itemsPermissions[key];
                return (
                  <tr key={key}>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 capitalize">
                      {key === "inventoryAdjustments" ? "Inventory Adjustments" : key === "priceList" ? "Price List" : "Item"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <input type="checkbox" checked={perm.full} onChange={(e) => {
                        const val = e.target.checked;
                        setItemsPermissions({
                          ...itemsPermissions,
                          [key]: { ...perm, full: val, view: val, create: val, edit: val, delete: val }
                        });
                      }} className="h-4 w-4" />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <input type="checkbox" checked={perm.view} onChange={(e) => setItemsPermissions({
                        ...itemsPermissions,
                        [key]: { ...perm, view: e.target.checked }
                      })} className="h-4 w-4" />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <input type="checkbox" checked={perm.create} onChange={(e) => setItemsPermissions({
                        ...itemsPermissions,
                        [key]: { ...perm, create: e.target.checked }
                      })} className="h-4 w-4" />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <input type="checkbox" checked={perm.edit} onChange={(e) => setItemsPermissions({
                        ...itemsPermissions,
                        [key]: { ...perm, edit: e.target.checked }
                      })} className="h-4 w-4" />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <input type="checkbox" checked={perm.delete} onChange={(e) => setItemsPermissions({
                        ...itemsPermissions,
                        [key]: { ...perm, delete: e.target.checked }
                      })} className="h-4 w-4" />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <input type="checkbox" checked={perm.approve} onChange={(e) => setItemsPermissions({
                        ...itemsPermissions,
                        [key]: { ...perm, approve: e.target.checked }
                      })} className="h-4 w-4" />
                    </td>
                    <td className="px-4 py-3 text-center">
                      {key === "inventoryAdjustments" && (
                        <button
                          onClick={() => setItemsMorePermissionsModal(true)}
                          className="text-blue-600 hover:text-blue-700 text-sm"
                        >
                          More Permissions
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Items More Permissions Modal */}
      {itemsMorePermissionsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setItemsMorePermissionsModal(false)}>
          <div className="bg-white rounded-lg shadow-xl p-6 w-80 relative" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setItemsMorePermissionsModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X size={20} />
            </button>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 pr-6">
              More Permissions - Inventory Adjustments
            </h3>
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={itemsPermissions.inventoryAdjustments.configureReason || false}
                  onChange={(e) => setItemsPermissions({
                    ...itemsPermissions,
                    inventoryAdjustments: {
                      ...itemsPermissions.inventoryAdjustments,
                      configureReason: e.target.checked
                    }
                  })}
                  className="h-4 w-4 accent-blue-600"
                />
                <span className="text-sm text-gray-700">Configure Reason</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={itemsPermissions.inventoryAdjustments.editDeleteApproved || false}
                  onChange={(e) => setItemsPermissions({
                    ...itemsPermissions,
                    inventoryAdjustments: {
                      ...itemsPermissions.inventoryAdjustments,
                      editDeleteApproved: e.target.checked
                    }
                  })}
                  className="h-4 w-4 accent-blue-600"
                />
                <span className="text-sm text-gray-700">Edit and Delete approved Inventory Adjustment</span>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Banking Section */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Banking</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">Particulars</th>
                <th className="px-4 py-2 text-center text-xs font-semibold text-gray-700">Full</th>
                <th className="px-4 py-2 text-center text-xs font-semibold text-gray-700">View</th>
                <th className="px-4 py-2 text-center text-xs font-semibold text-gray-700">Create</th>
                <th className="px-4 py-2 text-center text-xs font-semibold text-gray-700">Edit</th>
                <th className="px-4 py-2 text-center text-xs font-semibold text-gray-700">Delete</th>
                <th className="px-4 py-2 text-center text-xs font-semibold text-gray-700">Others</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              <tr>
                <td className="px-4 py-3 text-sm font-medium text-gray-900">Banking</td>
                <td className="px-4 py-3 text-center">
                  <input type="checkbox" checked={bankingPermissions.banking.full} onChange={(e) => {
                    const val = e.target.checked;
                    setBankingPermissions({
                      ...bankingPermissions,
                      banking: { ...bankingPermissions.banking, full: val, view: val, create: val, edit: val, delete: val }
                    });
                  }} className="h-4 w-4" />
                </td>
                <td className="px-4 py-3 text-center">
                  <input type="checkbox" checked={bankingPermissions.banking.view} onChange={(e) => setBankingPermissions({
                    ...bankingPermissions,
                    banking: { ...bankingPermissions.banking, view: e.target.checked }
                  })} className="h-4 w-4" />
                </td>
                <td className="px-4 py-3 text-center">
                  <input type="checkbox" checked={bankingPermissions.banking.create} onChange={(e) => setBankingPermissions({
                    ...bankingPermissions,
                    banking: { ...bankingPermissions.banking, create: e.target.checked }
                  })} className="h-4 w-4" />
                </td>
                <td className="px-4 py-3 text-center">
                  <input type="checkbox" checked={bankingPermissions.banking.edit} onChange={(e) => setBankingPermissions({
                    ...bankingPermissions,
                    banking: { ...bankingPermissions.banking, edit: e.target.checked }
                  })} className="h-4 w-4" />
                </td>
                <td className="px-4 py-3 text-center">
                  <input type="checkbox" checked={bankingPermissions.banking.delete} onChange={(e) => setBankingPermissions({
                    ...bankingPermissions,
                    banking: { ...bankingPermissions.banking, delete: e.target.checked }
                  })} className="h-4 w-4" />
                </td>
                <td className="px-4 py-3 text-center">
                  <button
                    onClick={() => setBankingMorePermissionsModal(true)}
                    className="text-blue-600 hover:text-blue-700 text-sm"
                  >
                    More Permissions
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Banking More Permissions Modal */}
      {bankingMorePermissionsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setBankingMorePermissionsModal(false)}>
          <div className="bg-white rounded-lg shadow-xl p-6 w-80 relative" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setBankingMorePermissionsModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X size={20} />
            </button>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 pr-6">
              More Permissions - Banking
            </h3>
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={bankingPermissions.banking.reconciliation || false}
                  onChange={(e) => setBankingPermissions({
                    ...bankingPermissions,
                    banking: {
                      ...bankingPermissions.banking,
                      reconciliation: e.target.checked
                    }
                  })}
                  className="h-4 w-4 accent-blue-600"
                />
                <span className="text-sm text-gray-700">Reconciliation</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={bankingPermissions.banking.manageBankTransactions || false}
                  onChange={(e) => setBankingPermissions({
                    ...bankingPermissions,
                    banking: {
                      ...bankingPermissions.banking,
                      manageBankTransactions: e.target.checked
                    }
                  })}
                  className="h-4 w-4 accent-blue-600"
                />
                <span className="text-sm text-gray-700">Manage bank transactions</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={bankingPermissions.banking.manageBankFeeds || false}
                  onChange={(e) => setBankingPermissions({
                    ...bankingPermissions,
                    banking: {
                      ...bankingPermissions.banking,
                      manageBankFeeds: e.target.checked
                    }
                  })}
                  className="h-4 w-4 accent-blue-600"
                />
                <span className="text-sm text-gray-700">Manage bank feeds</span>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Sales Section */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Sales</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">Particulars</th>
                <th className="px-4 py-2 text-center text-xs font-semibold text-gray-700">Full</th>
                <th className="px-4 py-2 text-center text-xs font-semibold text-gray-700">View</th>
                <th className="px-4 py-2 text-center text-xs font-semibold text-gray-700">Create</th>
                <th className="px-4 py-2 text-center text-xs font-semibold text-gray-700">Edit</th>
                <th className="px-4 py-2 text-center text-xs font-semibold text-gray-700">Delete</th>
                <th className="px-4 py-2 text-center text-xs font-semibold text-gray-700">Approve</th>
                <th className="px-4 py-2 text-center text-xs font-semibold text-gray-700">Others</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {Object.keys(salesPermissions).map((key) => {
                const perm = salesPermissions[key];
                return (
                  <tr key={key}>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 capitalize">
                      {key === "customerPayments" ? "Customer Payments" : key === "salesReceipt" ? "Sales Receipt" : key === "salesOrders" ? "Sales Orders" : key === "creditNotes" ? "Credit Notes" : key}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <input type="checkbox" checked={perm.full} onChange={(e) => {
                        const val = e.target.checked;
                        setSalesPermissions({
                          ...salesPermissions,
                          [key]: { ...perm, full: val, view: val, create: val, edit: val, delete: val }
                        });
                      }} className="h-4 w-4" />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <input type="checkbox" checked={perm.view} onChange={(e) => setSalesPermissions({
                        ...salesPermissions,
                        [key]: { ...perm, view: e.target.checked }
                      })} className="h-4 w-4" />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <input type="checkbox" checked={perm.create} onChange={(e) => setSalesPermissions({
                        ...salesPermissions,
                        [key]: { ...perm, create: e.target.checked }
                      })} className="h-4 w-4" />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <input type="checkbox" checked={perm.edit} onChange={(e) => setSalesPermissions({
                        ...salesPermissions,
                        [key]: { ...perm, edit: e.target.checked }
                      })} className="h-4 w-4" />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <input type="checkbox" checked={perm.delete} onChange={(e) => setSalesPermissions({
                        ...salesPermissions,
                        [key]: { ...perm, delete: e.target.checked }
                      })} className="h-4 w-4" />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <input type="checkbox" checked={perm.approve} onChange={(e) => setSalesPermissions({
                        ...salesPermissions,
                        [key]: { ...perm, approve: e.target.checked }
                      })} className="h-4 w-4" />
                    </td>
                    <td className="px-4 py-3 text-center">
                      {(key === "invoices" || key === "customerPayments" || key === "quotes" || key === "salesOrders" || key === "creditNotes") && (
                        <button
                          onClick={() => setSalesMorePermissionsModal({ isOpen: true, type: key })}
                          className="text-blue-600 hover:text-blue-700 text-sm"
                        >
                          More Permissions
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sales More Permissions Modal (for Invoices and Customer Payments) */}
      {salesMorePermissionsModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setSalesMorePermissionsModal({ isOpen: false, type: null })}>
          <div className="bg-white rounded-lg shadow-xl p-6 w-80 relative" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setSalesMorePermissionsModal({ isOpen: false, type: null })}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X size={20} />
            </button>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 pr-6">
              More Permissions - {
                salesMorePermissionsModal.type === 'invoices' ? 'Invoices' :
                  salesMorePermissionsModal.type === 'customerPayments' ? 'Customer Payments' :
                    salesMorePermissionsModal.type === 'quotes' ? 'Quotes' :
                      salesMorePermissionsModal.type === 'salesOrders' ? 'Sales Orders' :
                        salesMorePermissionsModal.type === 'creditNotes' ? 'Credit Notes' : ''
              }
            </h3>
            <div className="space-y-3">
              {salesMorePermissionsModal.type === 'invoices' && (
                <>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={salesPermissions.invoices.communication || false}
                      onChange={(e) => setSalesPermissions({
                        ...salesPermissions,
                        invoices: {
                          ...salesPermissions.invoices,
                          communication: e.target.checked
                        }
                      })}
                      className="h-4 w-4 accent-blue-600"
                    />
                    <span className="text-sm text-gray-700 flex items-center gap-1">
                      Communication
                      <HelpCircle size={14} className="text-yellow-500" />
                    </span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={salesPermissions.invoices.voidInvoices || false}
                      onChange={(e) => setSalesPermissions({
                        ...salesPermissions,
                        invoices: {
                          ...salesPermissions.invoices,
                          voidInvoices: e.target.checked
                        }
                      })}
                      className="h-4 w-4 accent-blue-600"
                    />
                    <span className="text-sm text-gray-700">Void invoices</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={salesPermissions.invoices.writeOffInvoices || false}
                      onChange={(e) => setSalesPermissions({
                        ...salesPermissions,
                        invoices: {
                          ...salesPermissions.invoices,
                          writeOffInvoices: e.target.checked
                        }
                      })}
                      className="h-4 w-4 accent-blue-600"
                    />
                    <span className="text-sm text-gray-700">Write Off invoices</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={salesPermissions.invoices.editDeleteApproved || false}
                      onChange={(e) => setSalesPermissions({
                        ...salesPermissions,
                        invoices: {
                          ...salesPermissions.invoices,
                          editDeleteApproved: e.target.checked
                        }
                      })}
                      className="h-4 w-4 accent-blue-600"
                    />
                    <span className="text-sm text-gray-700">Edit and Delete approved Invoices</span>
                  </label>
                </>
              )}
              {salesMorePermissionsModal.type === 'customerPayments' && (
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={salesPermissions.customerPayments.communication || false}
                    onChange={(e) => setSalesPermissions({
                      ...salesPermissions,
                      customerPayments: {
                        ...salesPermissions.customerPayments,
                        communication: e.target.checked
                      }
                    })}
                    className="h-4 w-4 accent-blue-600"
                  />
                  <span className="text-sm text-gray-700 flex items-center gap-1">
                    Communication
                    <HelpCircle size={14} className="text-yellow-500" />
                  </span>
                </label>
              )}
              {salesMorePermissionsModal.type === 'quotes' && (
                <>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={salesPermissions.quotes.communication || false}
                      onChange={(e) => setSalesPermissions({
                        ...salesPermissions,
                        quotes: {
                          ...salesPermissions.quotes,
                          communication: e.target.checked
                        }
                      })}
                      className="h-4 w-4 accent-blue-600"
                    />
                    <span className="text-sm text-gray-700 flex items-center gap-1">
                      Communication
                      <HelpCircle size={14} className="text-yellow-500" />
                    </span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={salesPermissions.quotes.editDeleteApproved || false}
                      onChange={(e) => setSalesPermissions({
                        ...salesPermissions,
                        quotes: {
                          ...salesPermissions.quotes,
                          editDeleteApproved: e.target.checked
                        }
                      })}
                      className="h-4 w-4 accent-blue-600"
                    />
                    <span className="text-sm text-gray-700">Edit and Delete approved Quotes</span>
                  </label>
                </>
              )}
              {salesMorePermissionsModal.type === 'salesOrders' && (
                <>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={salesPermissions.salesOrders.communication || false}
                      onChange={(e) => setSalesPermissions({
                        ...salesPermissions,
                        salesOrders: {
                          ...salesPermissions.salesOrders,
                          communication: e.target.checked
                        }
                      })}
                      className="h-4 w-4 accent-blue-600"
                    />
                    <span className="text-sm text-gray-700 flex items-center gap-1">
                      Communication
                      <HelpCircle size={14} className="text-yellow-500" />
                    </span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={salesPermissions.salesOrders.editDeleteApproved || false}
                      onChange={(e) => setSalesPermissions({
                        ...salesPermissions,
                        salesOrders: {
                          ...salesPermissions.salesOrders,
                          editDeleteApproved: e.target.checked
                        }
                      })}
                      className="h-4 w-4 accent-blue-600"
                    />
                    <span className="text-sm text-gray-700">Edit and Delete approved Sales Order</span>
                  </label>
                </>
              )}
              {salesMorePermissionsModal.type === 'creditNotes' && (
                <>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={salesPermissions.creditNotes.communication || false}
                      onChange={(e) => setSalesPermissions({
                        ...salesPermissions,
                        creditNotes: {
                          ...salesPermissions.creditNotes,
                          communication: e.target.checked
                        }
                      })}
                      className="h-4 w-4 accent-blue-600"
                    />
                    <span className="text-sm text-gray-700 flex items-center gap-1">
                      Communication
                      <HelpCircle size={14} className="text-yellow-500" />
                    </span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={salesPermissions.creditNotes.editDeleteApproved || false}
                      onChange={(e) => setSalesPermissions({
                        ...salesPermissions,
                        creditNotes: {
                          ...salesPermissions.creditNotes,
                          editDeleteApproved: e.target.checked
                        }
                      })}
                      className="h-4 w-4 accent-blue-600"
                    />
                    <span className="text-sm text-gray-700">Edit and Delete approved Credit Notes</span>
                  </label>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Purchases Section */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Purchases</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">Particulars</th>
                <th className="px-4 py-2 text-center text-xs font-semibold text-gray-700">Full</th>
                <th className="px-4 py-2 text-center text-xs font-semibold text-gray-700">View</th>
                <th className="px-4 py-2 text-center text-xs font-semibold text-gray-700">Create</th>
                <th className="px-4 py-2 text-center text-xs font-semibold text-gray-700">Edit</th>
                <th className="px-4 py-2 text-center text-xs font-semibold text-gray-700">Delete</th>
                <th className="px-4 py-2 text-center text-xs font-semibold text-gray-700">Approve</th>
                <th className="px-4 py-2 text-center text-xs font-semibold text-gray-700">Others</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {Object.keys(purchasesPermissions).map((key) => {
                const perm = purchasesPermissions[key];
                return (
                  <tr key={key}>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 capitalize">
                      {key === "vendorPayments" ? "Vendor Payments" : key === "purchaseOrders" ? "Purchase Orders" : key === "vendorCredits" ? "Vendor Credits" : key}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <input type="checkbox" checked={perm.full} onChange={(e) => {
                        const val = e.target.checked;
                        setPurchasesPermissions({
                          ...purchasesPermissions,
                          [key]: { ...perm, full: val, view: val, create: val, edit: val, delete: val }
                        });
                      }} className="h-4 w-4" />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <input type="checkbox" checked={perm.view} onChange={(e) => setPurchasesPermissions({
                        ...purchasesPermissions,
                        [key]: { ...perm, view: e.target.checked }
                      })} className="h-4 w-4" />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <input type="checkbox" checked={perm.create} onChange={(e) => setPurchasesPermissions({
                        ...purchasesPermissions,
                        [key]: { ...perm, create: e.target.checked }
                      })} className="h-4 w-4" />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <input type="checkbox" checked={perm.edit} onChange={(e) => setPurchasesPermissions({
                        ...purchasesPermissions,
                        [key]: { ...perm, edit: e.target.checked }
                      })} className="h-4 w-4" />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <input type="checkbox" checked={perm.delete} onChange={(e) => setPurchasesPermissions({
                        ...purchasesPermissions,
                        [key]: { ...perm, delete: e.target.checked }
                      })} className="h-4 w-4" />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <input type="checkbox" checked={perm.approve} onChange={(e) => setPurchasesPermissions({
                        ...purchasesPermissions,
                        [key]: { ...perm, approve: e.target.checked }
                      })} className="h-4 w-4" />
                    </td>
                    <td className="px-4 py-3 text-center">
                      {(key === "bills" || key === "vendorPayments" || key === "purchaseOrders" || key === "vendorCredits") && (
                        <button
                          onClick={() => setPurchasesMorePermissionsModal({ isOpen: true, type: key })}
                          className="text-blue-600 hover:text-blue-700 text-sm"
                        >
                          More Permissions
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Purchases More Permissions Modal (for Bills) */}
      {purchasesMorePermissionsModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setPurchasesMorePermissionsModal({ isOpen: false, type: null })}>
          <div className="bg-white rounded-lg shadow-xl p-6 w-80 relative" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setPurchasesMorePermissionsModal({ isOpen: false, type: null })}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X size={20} />
            </button>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 pr-6">
              More Permissions - {
                purchasesMorePermissionsModal.type === 'bills' ? 'Bills' :
                  purchasesMorePermissionsModal.type === 'vendorPayments' ? 'Vendor Payments' :
                    purchasesMorePermissionsModal.type === 'purchaseOrders' ? 'Purchase Orders' :
                      purchasesMorePermissionsModal.type === 'vendorCredits' ? 'Vendor Credits' : ''
              }
            </h3>
            <div className="space-y-3">
              {purchasesMorePermissionsModal.type === 'bills' && (
                <>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={purchasesPermissions.bills.voidBills || false}
                      onChange={(e) => setPurchasesPermissions({
                        ...purchasesPermissions,
                        bills: {
                          ...purchasesPermissions.bills,
                          voidBills: e.target.checked
                        }
                      })}
                      className="h-4 w-4 accent-blue-600"
                    />
                    <span className="text-sm text-gray-700">Void bills</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={purchasesPermissions.bills.editDeleteApproved || false}
                      onChange={(e) => setPurchasesPermissions({
                        ...purchasesPermissions,
                        bills: {
                          ...purchasesPermissions.bills,
                          editDeleteApproved: e.target.checked
                        }
                      })}
                      className="h-4 w-4 accent-blue-600"
                    />
                    <span className="text-sm text-gray-700">Edit and Delete approved bills</span>
                  </label>
                </>
              )}
              {purchasesMorePermissionsModal.type === 'vendorPayments' && (
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={purchasesPermissions.vendorPayments.editDeleteApproved || false}
                    onChange={(e) => setPurchasesPermissions({
                      ...purchasesPermissions,
                      vendorPayments: {
                        ...purchasesPermissions.vendorPayments,
                        editDeleteApproved: e.target.checked
                      }
                    })}
                    className="h-4 w-4 accent-blue-600"
                  />
                  <span className="text-sm text-gray-700">Edit and Delete approved vendor payments</span>
                </label>
              )}
              {purchasesMorePermissionsModal.type === 'purchaseOrders' && (
                <>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={purchasesPermissions.purchaseOrders.communication || false}
                      onChange={(e) => setPurchasesPermissions({
                        ...purchasesPermissions,
                        purchaseOrders: {
                          ...purchasesPermissions.purchaseOrders,
                          communication: e.target.checked
                        }
                      })}
                      className="h-4 w-4 accent-blue-600"
                    />
                    <span className="text-sm text-gray-700 flex items-center gap-1">
                      Communication
                      <HelpCircle size={14} className="text-yellow-500" />
                    </span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={purchasesPermissions.purchaseOrders.editDeleteApproved || false}
                      onChange={(e) => setPurchasesPermissions({
                        ...purchasesPermissions,
                        purchaseOrders: {
                          ...purchasesPermissions.purchaseOrders,
                          editDeleteApproved: e.target.checked
                        }
                      })}
                      className="h-4 w-4 accent-blue-600"
                    />
                    <span className="text-sm text-gray-700">Edit and Delete approved purchase orders</span>
                  </label>
                </>
              )}
              {purchasesMorePermissionsModal.type === 'vendorCredits' && (
                <>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={purchasesPermissions.vendorCredits.refund || false}
                      onChange={(e) => setPurchasesPermissions({
                        ...purchasesPermissions,
                        vendorCredits: {
                          ...purchasesPermissions.vendorCredits,
                          refund: e.target.checked
                        }
                      })}
                      className="h-4 w-4 accent-blue-600"
                    />
                    <span className="text-sm text-gray-700">Refund</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={purchasesPermissions.vendorCredits.editDeleteApproved || false}
                      onChange={(e) => setPurchasesPermissions({
                        ...purchasesPermissions,
                        vendorCredits: {
                          ...purchasesPermissions.vendorCredits,
                          editDeleteApproved: e.target.checked
                        }
                      })}
                      className="h-4 w-4 accent-blue-600"
                    />
                    <span className="text-sm text-gray-700">Edit and Delete approved credits</span>
                  </label>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Accountant Section */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Accountant</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">Particulars</th>
                <th className="px-4 py-2 text-center text-xs font-semibold text-gray-700">Full</th>
                <th className="px-4 py-2 text-center text-xs font-semibold text-gray-700">View</th>
                <th className="px-4 py-2 text-center text-xs font-semibold text-gray-700">Create</th>
                <th className="px-4 py-2 text-center text-xs font-semibold text-gray-700">Edit</th>
                <th className="px-4 py-2 text-center text-xs font-semibold text-gray-700">Delete</th>
                <th className="px-4 py-2 text-center text-xs font-semibold text-gray-700">Approve</th>
                <th className="px-4 py-2 text-center text-xs font-semibold text-gray-700">Others</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {Object.keys(accountantPermissions).map((key) => {
                const perm = accountantPermissions[key];
                return (
                  <tr key={key}>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 capitalize">
                      {key === "chartOfAccounts" ? "Chart of Accounts" : key}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <input type="checkbox" checked={perm.full} onChange={(e) => {
                        const val = e.target.checked;
                        setAccountantPermissions({
                          ...accountantPermissions,
                          [key]: { ...perm, full: val, view: val, create: val, edit: val, delete: val }
                        });
                      }} className="h-4 w-4" />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <input type="checkbox" checked={perm.view} onChange={(e) => setAccountantPermissions({
                        ...accountantPermissions,
                        [key]: { ...perm, view: e.target.checked }
                      })} className="h-4 w-4" />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <input type="checkbox" checked={perm.create} onChange={(e) => setAccountantPermissions({
                        ...accountantPermissions,
                        [key]: { ...perm, create: e.target.checked }
                      })} className="h-4 w-4" />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <input type="checkbox" checked={perm.edit} onChange={(e) => setAccountantPermissions({
                        ...accountantPermissions,
                        [key]: { ...perm, edit: e.target.checked }
                      })} className="h-4 w-4" />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <input type="checkbox" checked={perm.delete} onChange={(e) => setAccountantPermissions({
                        ...accountantPermissions,
                        [key]: { ...perm, delete: e.target.checked }
                      })} className="h-4 w-4" />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <input type="checkbox" checked={perm.approve} onChange={(e) => setAccountantPermissions({
                        ...accountantPermissions,
                        [key]: { ...perm, approve: e.target.checked }
                      })} className="h-4 w-4" />
                    </td>
                    <td className="px-4 py-3 text-center">
                      {(key === "chartOfAccounts" || key === "journals") && (
                        <button
                          onClick={() => setAccountantMorePermissionsModal({ isOpen: true, type: key })}
                          className="text-blue-600 hover:text-blue-700 text-sm"
                        >
                          More Permissions
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Accountant More Permissions Modal (for Chart of Accounts and Journals) */}
      {accountantMorePermissionsModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setAccountantMorePermissionsModal({ isOpen: false, type: null })}>
          <div className="bg-white rounded-lg shadow-xl p-6 w-80 relative" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setAccountantMorePermissionsModal({ isOpen: false, type: null })}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X size={20} />
            </button>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 pr-6">
              More Permissions - {
                accountantMorePermissionsModal.type === 'chartOfAccounts' ? 'Chart of Accounts' :
                  accountantMorePermissionsModal.type === 'journals' ? 'Journals' : ''
              }
            </h3>
            <div className="space-y-3">
              {accountantMorePermissionsModal.type === 'chartOfAccounts' && (
                <>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={accountantPermissions.chartOfAccounts.taxPayments || false}
                      onChange={(e) => setAccountantPermissions({
                        ...accountantPermissions,
                        chartOfAccounts: {
                          ...accountantPermissions.chartOfAccounts,
                          taxPayments: e.target.checked
                        }
                      })}
                      className="h-4 w-4 accent-blue-600"
                    />
                    <span className="text-sm text-gray-700">Tax payments</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={accountantPermissions.chartOfAccounts.baseCurrencyAdjustments || false}
                      onChange={(e) => setAccountantPermissions({
                        ...accountantPermissions,
                        chartOfAccounts: {
                          ...accountantPermissions.chartOfAccounts,
                          baseCurrencyAdjustments: e.target.checked
                        }
                      })}
                      className="h-4 w-4 accent-blue-600"
                    />
                    <span className="text-sm text-gray-700">Base Currency Adjustments</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={accountantPermissions.chartOfAccounts.openingBalance || false}
                      onChange={(e) => setAccountantPermissions({
                        ...accountantPermissions,
                        chartOfAccounts: {
                          ...accountantPermissions.chartOfAccounts,
                          openingBalance: e.target.checked
                        }
                      })}
                      className="h-4 w-4 accent-blue-600"
                    />
                    <span className="text-sm text-gray-700">Opening Balance</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={accountantPermissions.chartOfAccounts.transactionLock || false}
                      onChange={(e) => setAccountantPermissions({
                        ...accountantPermissions,
                        chartOfAccounts: {
                          ...accountantPermissions.chartOfAccounts,
                          transactionLock: e.target.checked
                        }
                      })}
                      className="h-4 w-4 accent-blue-600"
                    />
                    <span className="text-sm text-gray-700">Transaction Lock</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={accountantPermissions.chartOfAccounts.bulkUpdate || false}
                      onChange={(e) => setAccountantPermissions({
                        ...accountantPermissions,
                        chartOfAccounts: {
                          ...accountantPermissions.chartOfAccounts,
                          bulkUpdate: e.target.checked
                        }
                      })}
                      className="h-4 w-4 accent-blue-600"
                    />
                    <span className="text-sm text-gray-700">Bulk update</span>
                  </label>
                </>
              )}
              {accountantMorePermissionsModal.type === 'journals' && (
                <>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={accountantPermissions.journals.publish || false}
                      onChange={(e) => setAccountantPermissions({
                        ...accountantPermissions,
                        journals: {
                          ...accountantPermissions.journals,
                          publish: e.target.checked
                        }
                      })}
                      className="h-4 w-4 accent-blue-600"
                    />
                    <span className="text-sm text-gray-700">Publish</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={accountantPermissions.journals.editDeleteApproved || false}
                      onChange={(e) => setAccountantPermissions({
                        ...accountantPermissions,
                        journals: {
                          ...accountantPermissions.journals,
                          editDeleteApproved: e.target.checked
                        }
                      })}
                      className="h-4 w-4 accent-blue-600"
                    />
                    <span className="text-sm text-gray-700">Edit and Delete approved journals</span>
                  </label>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Timesheets Section */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Timesheets</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">Particulars</th>
                <th className="px-4 py-2 text-center text-xs font-semibold text-gray-700">Full</th>
                <th className="px-4 py-2 text-center text-xs font-semibold text-gray-700">View</th>
                <th className="px-4 py-2 text-center text-xs font-semibold text-gray-700">Create</th>
                <th className="px-4 py-2 text-center text-xs font-semibold text-gray-700">Edit</th>
                <th className="px-4 py-2 text-center text-xs font-semibold text-gray-700">Delete</th>
                <th className="px-4 py-2 text-center text-xs font-semibold text-gray-700">Others</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              <tr>
                <td className="px-4 py-3 text-sm font-medium text-gray-900">Projects</td>
                <td className="px-4 py-3 text-center">
                  <input type="checkbox" checked={timesheetsPermissions.projects.full} onChange={(e) => {
                    const val = e.target.checked;
                    setTimesheetsPermissions({
                      ...timesheetsPermissions,
                      projects: { ...timesheetsPermissions.projects, full: val, view: val, create: val, edit: val, delete: val }
                    });
                  }} className="h-4 w-4" />
                </td>
                <td className="px-4 py-3 text-center">
                  <input type="checkbox" checked={timesheetsPermissions.projects.view} onChange={(e) => setTimesheetsPermissions({
                    ...timesheetsPermissions,
                    projects: { ...timesheetsPermissions.projects, view: e.target.checked }
                  })} className="h-4 w-4" />
                </td>
                <td className="px-4 py-3 text-center">
                  <input type="checkbox" checked={timesheetsPermissions.projects.create} onChange={(e) => setTimesheetsPermissions({
                    ...timesheetsPermissions,
                    projects: { ...timesheetsPermissions.projects, create: e.target.checked }
                  })} className="h-4 w-4" />
                </td>
                <td className="px-4 py-3 text-center">
                  <input type="checkbox" checked={timesheetsPermissions.projects.edit} onChange={(e) => setTimesheetsPermissions({
                    ...timesheetsPermissions,
                    projects: { ...timesheetsPermissions.projects, edit: e.target.checked }
                  })} className="h-4 w-4" />
                </td>
                <td className="px-4 py-3 text-center">
                  <input type="checkbox" checked={timesheetsPermissions.projects.delete} onChange={(e) => setTimesheetsPermissions({
                    ...timesheetsPermissions,
                    projects: { ...timesheetsPermissions.projects, delete: e.target.checked }
                  })} className="h-4 w-4" />
                </td>
                <td className="px-4 py-3 text-center">
                  <button
                    onClick={() => setTimesheetsMorePermissionsModal(true)}
                    className="text-blue-600 hover:text-blue-700 text-sm"
                  >
                    More Permissions
                  </button>
                </td>
              </tr>
              <tr>
                <td colSpan={7} className="px-4 py-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={timesheetsPermissions.noExpenses}
                      onChange={(e) => setTimesheetsPermissions({
                        ...timesheetsPermissions,
                        noExpenses: e.target.checked
                      })}
                      className="h-4 w-4"
                    />
                    <span className="text-sm text-gray-700">Don't allow timesheet staffs to record expenses for the associated project(s).</span>
                  </label>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Timesheets More Permissions Modal (for Projects) */}
      {timesheetsMorePermissionsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setTimesheetsMorePermissionsModal(false)}>
          <div className="bg-white rounded-lg shadow-xl p-6 w-80 relative" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setTimesheetsMorePermissionsModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X size={20} />
            </button>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 pr-6">
              More Permissions - Projects
            </h3>
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={timesheetsPermissions.projects.manageTimeEntriesOtherUsers || false}
                  onChange={(e) => setTimesheetsPermissions({
                    ...timesheetsPermissions,
                    projects: {
                      ...timesheetsPermissions.projects,
                      manageTimeEntriesOtherUsers: e.target.checked
                    }
                  })}
                  className="h-4 w-4 accent-blue-600"
                />
                <span className="text-sm text-gray-700">Manage the time entries of other users</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={timesheetsPermissions.projects.viewTimeEntriesOtherUsers || false}
                  onChange={(e) => setTimesheetsPermissions({
                    ...timesheetsPermissions,
                    projects: {
                      ...timesheetsPermissions.projects,
                      viewTimeEntriesOtherUsers: e.target.checked
                    }
                  })}
                  className="h-4 w-4 accent-blue-600"
                />
                <span className="text-sm text-gray-700">View the time entries of other users</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={timesheetsPermissions.projects.viewProjectsOtherUsers || false}
                  onChange={(e) => setTimesheetsPermissions({
                    ...timesheetsPermissions,
                    projects: {
                      ...timesheetsPermissions.projects,
                      viewProjectsOtherUsers: e.target.checked
                    }
                  })}
                  className="h-4 w-4 accent-blue-600"
                />
                <span className="text-sm text-gray-700">View the projects of other users</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={timesheetsPermissions.projects.manageTimeEntryCost || false}
                  onChange={(e) => setTimesheetsPermissions({
                    ...timesheetsPermissions,
                    projects: {
                      ...timesheetsPermissions.projects,
                      manageTimeEntryCost: e.target.checked
                    }
                  })}
                  className="h-4 w-4 accent-blue-600"
                />
                <span className="text-sm text-gray-700">Manage the time entry cost</span>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Locations Section */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Locations</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">Particulars</th>
                <th className="px-4 py-2 text-center text-xs font-semibold text-gray-700">Full</th>
                <th className="px-4 py-2 text-center text-xs font-semibold text-gray-700">View</th>
                <th className="px-4 py-2 text-center text-xs font-semibold text-gray-700">Create</th>
                <th className="px-4 py-2 text-center text-xs font-semibold text-gray-700">Edit</th>
                <th className="px-4 py-2 text-center text-xs font-semibold text-gray-700">Delete</th>
                <th className="px-4 py-2 text-center text-xs font-semibold text-gray-700">Others</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              <tr>
                <td className="px-4 py-3 text-sm font-medium text-gray-900">Locations</td>
                <td className="px-4 py-3 text-center">
                  <input type="checkbox" checked={locationsPermissions.locations.full} onChange={(e) => {
                    const val = e.target.checked;
                    setLocationsPermissions({
                      ...locationsPermissions,
                      locations: { ...locationsPermissions.locations, full: val, view: val, create: val, edit: val, delete: val }
                    });
                  }} className="h-4 w-4" />
                </td>
                <td className="px-4 py-3 text-center">
                  <input type="checkbox" checked={locationsPermissions.locations.view} onChange={(e) => setLocationsPermissions({
                    ...locationsPermissions,
                    locations: { ...locationsPermissions.locations, view: e.target.checked }
                  })} className="h-4 w-4" />
                </td>
                <td className="px-4 py-3 text-center">
                  <input type="checkbox" checked={locationsPermissions.locations.create} onChange={(e) => setLocationsPermissions({
                    ...locationsPermissions,
                    locations: { ...locationsPermissions.locations, create: e.target.checked }
                  })} className="h-4 w-4" />
                </td>
                <td className="px-4 py-3 text-center">
                  <input type="checkbox" checked={locationsPermissions.locations.edit} onChange={(e) => setLocationsPermissions({
                    ...locationsPermissions,
                    locations: { ...locationsPermissions.locations, edit: e.target.checked }
                  })} className="h-4 w-4" />
                </td>
                <td className="px-4 py-3 text-center">
                  <input type="checkbox" checked={locationsPermissions.locations.delete} onChange={(e) => setLocationsPermissions({
                    ...locationsPermissions,
                    locations: { ...locationsPermissions.locations, delete: e.target.checked }
                  })} className="h-4 w-4" />
                </td>
                <td className="px-4 py-3 text-center"></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* VAT Filing Section */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <input
            type="checkbox"
            checked={vatFilingEnabled}
            onChange={(e) => setVatFilingEnabled(e.target.checked)}
            className="h-4 w-4"
          />
          <h2 className="text-lg font-semibold text-gray-900">VAT Filing</h2>
        </div>
        {vatFilingEnabled && (
          <div className="ml-7 space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={vatFilingPermissions.viewAgentInvitationDetails}
                onChange={(e) => setVatFilingPermissions({ ...vatFilingPermissions, viewAgentInvitationDetails: e.target.checked })}
                className="h-4 w-4"
              />
              <span className="text-sm text-gray-700">View Agent Invitation Details</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={vatFilingPermissions.manageAgentInvitation}
                onChange={(e) => setVatFilingPermissions({ ...vatFilingPermissions, manageAgentInvitation: e.target.checked })}
                className="h-4 w-4"
              />
              <span className="text-sm text-gray-700">Manage Agent Invitation</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={vatFilingPermissions.manageVatReturn}
                onChange={(e) => setVatFilingPermissions({ ...vatFilingPermissions, manageVatReturn: e.target.checked })}
                className="h-4 w-4"
              />
              <span className="text-sm text-gray-700">Manage VAT Return</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={vatFilingPermissions.submitVatReturn}
                onChange={(e) => setVatFilingPermissions({ ...vatFilingPermissions, submitVatReturn: e.target.checked })}
                className="h-4 w-4"
              />
              <span className="text-sm text-gray-700">Submit VAT Return</span>
            </label>
          </div>
        )}
      </div>

      {/* Documents Section */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <input
            type="checkbox"
            checked={documentsEnabled}
            onChange={(e) => setDocumentsEnabled(e.target.checked)}
            className="h-4 w-4"
          />
          <h2 className="text-lg font-semibold text-gray-900">Documents</h2>
        </div>
        {documentsEnabled && (
          <div className="ml-7 space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={documentsPermissions.view}
                onChange={(e) => setDocumentsPermissions({ ...documentsPermissions, view: e.target.checked })}
                className="h-4 w-4"
              />
              <span className="text-sm text-gray-700">View Documents</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={documentsPermissions.upload}
                onChange={(e) => setDocumentsPermissions({ ...documentsPermissions, upload: e.target.checked })}
                className="h-4 w-4"
              />
              <span className="text-sm text-gray-700">Upload Documents</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={documentsPermissions.delete}
                onChange={(e) => setDocumentsPermissions({ ...documentsPermissions, delete: e.target.checked })}
                className="h-4 w-4"
              />
              <span className="text-sm text-gray-700">Delete Documents</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={documentsPermissions.manageFolder}
                onChange={(e) => setDocumentsPermissions({ ...documentsPermissions, manageFolder: e.target.checked })}
                className="h-4 w-4"
              />
              <span className="text-sm text-gray-700">Manage Folder</span>
            </label>
          </div>
        )}
      </div>

      {/* Settings Section */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <input
            type="checkbox"
            checked={settingsEnabled}
            onChange={(e) => setSettingsEnabled(e.target.checked)}
            className="h-4 w-4"
          />
          <h2 className="text-lg font-semibold text-gray-900">Settings</h2>
        </div>
        {settingsEnabled && (
          <div className="ml-7 space-y-2">
            {[
              { key: "updateOrgProfile", label: "Update organization profile" },
              { key: "users", label: "Users" },
              { key: "exportData", label: "Export data" },
              { key: "generalPreferences", label: "General preferences", hasIcon: true },
              { key: "accountantPreferences", label: "Accountant preferences" },
              { key: "taxes", label: "Taxes" },
              { key: "protectedData", label: "Provide access to protected data", hasIcon: true },
              { key: "paymentTerms", label: "Payment Terms" },
              { key: "templates", label: "Templates" },
              { key: "emailTemplate", label: "Email Template" },
              { key: "reportingTags", label: "Reporting Tags" },
              { key: "manageIntegration", label: "Manage Integration" },
              { key: "automation", label: "Automation", hasIcon: true },
              { key: "incomingWebhook", label: "Incoming Webhook", hasIcon: true },
              { key: "signal", label: "Signal", hasIcon: true }
            ].map((item) => (
              <label key={item.key} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settingsPermissions[item.key]}
                  onChange={(e) => setSettingsPermissions({ ...settingsPermissions, [item.key]: e.target.checked })}
                  className="h-4 w-4"
                />
                <span className="text-sm text-gray-700">{item.label}</span>
                {item.hasIcon && (
                  <HelpCircle size={14} className="text-yellow-500" />
                )}
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Dashboard Section */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <div className="mb-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={dashboardEnabled}
              onChange={(e) => setDashboardEnabled(e.target.checked)}
              className="h-4 w-4 accent-blue-600"
            />
            <h2 className="text-lg font-semibold text-gray-900">Dashboard</h2>
          </label>
        </div>
        {dashboardEnabled && (
          <div className="space-y-2 mb-4">
            {[
              { key: "totalPayables", label: "Total Payables", hasLock: true, hasUpdate: true },
              { key: "totalReceivables", label: "Total Receivables", hasLock: true, hasUpdate: true },
              { key: "cashFlow", label: "Cash Flow", hasLock: false, hasUpdate: false },
              { key: "incomeAndExpenses", label: "Income and Expenses", hasLock: false, hasUpdate: false },
              { key: "topExpense", label: "Your Top Expense", hasLock: true, hasUpdate: true },
              { key: "projects", label: "Projects", hasLock: false, hasUpdate: false },
              { key: "bankAndCreditCards", label: "Bank and Credit Cards", hasLock: false, hasUpdate: false },
              { key: "accountWatchlist", label: "Account Watchlist", hasLock: true, hasUpdate: true }
            ].map((item) => (
              <label key={item.key} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={dashboardPermissions[item.key]}
                  onChange={(e) => setDashboardPermissions({ ...dashboardPermissions, [item.key]: e.target.checked })}
                  className="h-4 w-4 accent-blue-600"
                />
                <span className="text-sm text-gray-700">{item.label}</span>
                {item.hasLock && !dashboardPermissions[item.key] && (
                  <Lock size={14} className="text-gray-400 ml-auto" />
                )}
                {item.hasUpdate && dashboardPermissions[item.key] && (
                  <div className="flex items-center gap-1 ml-auto">
                    <AlertCircle size={14} className="text-orange-500" />
                    <button
                      type="button"
                      className="text-sm text-blue-600 hover:text-blue-700"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        // Handle update action
                      }}
                    >
                      Update
                    </button>
                  </div>
                )}
              </label>
            ))}
          </div>
        )}
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-100 mt-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={allowDashboardManagement}
              onChange={(e) => setAllowDashboardManagement(e.target.checked)}
              className="h-4 w-4 accent-blue-600"
            />
            <span className="text-sm font-medium text-gray-900">Allow Dashboard Management</span>
          </label>
          <p className="text-xs text-gray-600 mt-2 ml-6">
            Users with the above permission can create and manage custom dashboards.
          </p>
        </div>
      </div>

      {/* Reports Section */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <div className="mb-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={fullReportsAccess}
              onChange={(e) => setFullReportsAccess(e.target.checked)}
              className="h-4 w-4"
            />
            <span className="text-sm font-medium text-gray-900">Enable full access for all reports</span>
            <HelpCircle size={14} className="text-gray-400" />
          </label>
        </div>
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4 flex items-start gap-2">
          <AlertCircle size={16} className="text-orange-600 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-orange-800">
            When new reports are introduced, you will have to edit the role and provide access to them.
          </p>
        </div>
        {!fullReportsAccess && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">Report Groups</th>
                  <th className="px-4 py-2 text-center text-xs font-semibold text-gray-700">
                    <div className="flex flex-col items-center gap-1">
                      <span>Full Access</span>
                      <button
                        onClick={() => {
                          const expandedGroup = Object.keys(expandedGroups).find(key => expandedGroups[key]);
                          if (expandedGroup) {
                            handleSelectAll("fullAccess", expandedGroup);
                          }
                        }}
                        disabled={!Object.values(expandedGroups).some(expanded => expanded)}
                        className={`text-xs ${Object.values(expandedGroups).some(expanded => expanded)
                            ? "text-blue-600 hover:text-blue-700 cursor-pointer"
                            : "text-gray-400 cursor-not-allowed"
                          }`}
                      >
                        Select All
                      </button>
                    </div>
                  </th>
                  <th className="px-4 py-2 text-center text-xs font-semibold text-gray-700">
                    <div className="flex flex-col items-center gap-1">
                      <span>View</span>
                      <button
                        onClick={() => {
                          const expandedGroup = Object.keys(expandedGroups).find(key => expandedGroups[key]);
                          if (expandedGroup) {
                            handleSelectAll("view", expandedGroup);
                          }
                        }}
                        disabled={!Object.values(expandedGroups).some(expanded => expanded)}
                        className={`text-xs ${Object.values(expandedGroups).some(expanded => expanded)
                            ? "text-blue-600 hover:text-blue-700 cursor-pointer"
                            : "text-gray-400 cursor-not-allowed"
                          }`}
                      >
                        Select All
                      </button>
                    </div>
                  </th>
                  <th className="px-4 py-2 text-center text-xs font-semibold text-gray-700">
                    <div className="flex flex-col items-center gap-1">
                      <span>Export</span>
                      <button
                        onClick={() => {
                          const expandedGroup = Object.keys(expandedGroups).find(key => expandedGroups[key]);
                          if (expandedGroup) {
                            handleSelectAll("export", expandedGroup);
                          }
                        }}
                        disabled={!Object.values(expandedGroups).some(expanded => expanded)}
                        className={`text-xs ${Object.values(expandedGroups).some(expanded => expanded)
                            ? "text-blue-600 hover:text-blue-700 cursor-pointer"
                            : "text-gray-400 cursor-not-allowed"
                          }`}
                      >
                        Select All
                      </button>
                    </div>
                  </th>
                  <th className="px-4 py-2 text-center text-xs font-semibold text-gray-700">
                    <div className="flex flex-col items-center gap-1">
                      <span>Schedule</span>
                      <button
                        onClick={() => {
                          const expandedGroup = Object.keys(expandedGroups).find(key => expandedGroups[key]);
                          if (expandedGroup) {
                            handleSelectAll("schedule", expandedGroup);
                          }
                        }}
                        disabled={!Object.values(expandedGroups).some(expanded => expanded)}
                        className={`text-xs ${Object.values(expandedGroups).some(expanded => expanded)
                            ? "text-blue-600 hover:text-blue-700 cursor-pointer"
                            : "text-gray-400 cursor-not-allowed"
                          }`}
                      >
                        Select All
                      </button>
                    </div>
                  </th>
                  <th className="px-4 py-2 text-center text-xs font-semibold text-gray-700">
                    <div className="flex flex-col items-center gap-1">
                      <span>Share</span>
                      <button
                        onClick={() => {
                          const expandedGroup = Object.keys(expandedGroups).find(key => expandedGroups[key]);
                          if (expandedGroup) {
                            handleSelectAll("share", expandedGroup);
                          }
                        }}
                        disabled={!Object.values(expandedGroups).some(expanded => expanded)}
                        className={`text-xs ${Object.values(expandedGroups).some(expanded => expanded)
                            ? "text-blue-600 hover:text-blue-700 cursor-pointer"
                            : "text-gray-400 cursor-not-allowed"
                          }`}
                      >
                        Select All
                      </button>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {[
                  "Business Overview", "Sales", "Inventory", "Inventory Valuation", "Receivables",
                  "Payments Received", "Recurring Invoices", "Payables", "Purchases and Expenses",
                  "Taxes", "Banking", "Projects and Timesheet", "Accountant", "Budgets", "Currency",
                  "Activity", "Automation"
                ].map((group) => {
                  const isExpanded = expandedGroups[group];
                  const isBusinessOverview = group === "Business Overview";
                  const isSales = group === "Sales";
                  const isInventory = group === "Inventory";
                  const isInventoryValuation = group === "Inventory Valuation";
                  const isReceivables = group === "Receivables";
                  const isPaymentsReceived = group === "Payments Received";
                  const isRecurringInvoices = group === "Recurring Invoices";
                  const isPayables = group === "Payables";
                  const isPurchasesAndExpenses = group === "Purchases and Expenses";
                  const isTaxes = group === "Taxes";
                  const isBanking = group === "Banking";
                  const isProjectsAndTimesheet = group === "Projects and Timesheet";
                  const isAccountant = group === "Accountant";
                  const isBudgets = group === "Budgets";
                  const isCurrency = group === "Currency";
                  const isActivity = group === "Activity";
                  const isAutomation = group === "Automation";
                  const isExpandable = isBusinessOverview || isSales || isInventory || isInventoryValuation || isReceivables || isPaymentsReceived || isRecurringInvoices || isPayables || isPurchasesAndExpenses || isTaxes || isBanking || isProjectsAndTimesheet || isAccountant || isBudgets || isCurrency || isActivity || isAutomation;

                  return (
                    <React.Fragment key={group}>
                      <tr className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                          <div
                            className="flex items-center gap-2 cursor-pointer"
                            onClick={() => isExpandable && toggleGroup(group)}
                          >
                            {isExpandable ? (
                              isExpanded ? (
                                <ChevronDown size={16} className="text-gray-400" />
                              ) : (
                                <ChevronRight size={16} className="text-gray-400" />
                              )
                            ) : (
                              <ChevronRight size={16} className="text-gray-400" />
                            )}
                            {group}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {isExpanded && isExpandable ? (
                            <button
                              onClick={() => handleSelectAll("fullAccess", group)}
                              className="text-xs text-blue-600 hover:text-blue-700"
                            >
                              Select All
                            </button>
                          ) : (
                            <div className="h-8 w-full cursor-pointer hover:bg-gray-100 rounded transition-colors"></div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {isExpanded && isExpandable ? (
                            <button
                              onClick={() => handleSelectAll("view", group)}
                              className="text-xs text-blue-600 hover:text-blue-700"
                            >
                              Select All
                            </button>
                          ) : (
                            <div className="h-8 w-full cursor-pointer hover:bg-gray-100 rounded transition-colors"></div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {isExpanded && isExpandable ? (
                            <button
                              onClick={() => handleSelectAll("export", group)}
                              className="text-xs text-blue-600 hover:text-blue-700"
                            >
                              Select All
                            </button>
                          ) : (
                            <div className="h-8 w-full cursor-pointer hover:bg-gray-100 rounded transition-colors"></div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {isExpanded && isExpandable ? (
                            <button
                              onClick={() => handleSelectAll("schedule", group)}
                              className="text-xs text-blue-600 hover:text-blue-700"
                            >
                              Select All
                            </button>
                          ) : (
                            <div className="h-8 w-full cursor-pointer hover:bg-gray-100 rounded transition-colors"></div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {isExpanded && isExpandable ? (
                            <button
                              onClick={() => handleSelectAll("share", group)}
                              className="text-xs text-blue-600 hover:text-blue-700"
                            >
                              Select All
                            </button>
                          ) : (
                            <div className="h-8 w-full cursor-pointer hover:bg-gray-100 rounded transition-colors"></div>
                          )}
                        </td>
                      </tr>
                      {isBusinessOverview && isExpanded && (
                        <>
                          {Object.keys(businessOverviewPermissions).map((reportName) => (
                            <tr key={reportName} className="bg-gray-50 hover:bg-gray-100">
                              <td className="px-4 py-2 pl-12 text-sm text-gray-700">{reportName}</td>
                              <td className="px-4 py-2 text-center">
                                <input
                                  type="checkbox"
                                  checked={businessOverviewPermissions[reportName].fullAccess}
                                  onChange={() => handleBusinessOverviewPermission(reportName, "fullAccess")}
                                  className="h-4 w-4"
                                />
                              </td>
                              <td className="px-4 py-2 text-center">
                                <input
                                  type="checkbox"
                                  checked={businessOverviewPermissions[reportName].view}
                                  onChange={() => handleBusinessOverviewPermission(reportName, "view")}
                                  className="h-4 w-4"
                                />
                              </td>
                              <td className="px-4 py-2 text-center">
                                <input
                                  type="checkbox"
                                  checked={businessOverviewPermissions[reportName].export}
                                  onChange={() => handleBusinessOverviewPermission(reportName, "export")}
                                  className="h-4 w-4"
                                />
                              </td>
                              <td className="px-4 py-2 text-center">
                                <input
                                  type="checkbox"
                                  checked={businessOverviewPermissions[reportName].schedule}
                                  onChange={() => handleBusinessOverviewPermission(reportName, "schedule")}
                                  className="h-4 w-4"
                                />
                              </td>
                              <td className="px-4 py-2 text-center">
                                <input
                                  type="checkbox"
                                  checked={businessOverviewPermissions[reportName].share}
                                  onChange={() => handleBusinessOverviewPermission(reportName, "share")}
                                  className="h-4 w-4"
                                />
                              </td>
                            </tr>
                          ))}
                        </>
                      )}
                      {isSales && isExpanded && (
                        <>
                          {Object.keys(salesReportsPermissions).map((reportName) => {
                            const report = salesReportsPermissions[reportName];
                            return (
                              <tr key={reportName} className="bg-gray-50 hover:bg-gray-100">
                                <td className="px-4 py-2 pl-12 text-sm text-gray-700">
                                  <div className="flex items-center gap-2">
                                    {reportName}
                                    {report.locked && <Lock size={14} className="text-gray-400" />}
                                  </div>
                                </td>
                                <td className="px-4 py-2 text-center">
                                  <input
                                    type="checkbox"
                                    checked={report.fullAccess}
                                    onChange={() => handleSalesReportsPermission(reportName, "fullAccess")}
                                    disabled={report.locked}
                                    className="h-4 w-4"
                                  />
                                </td>
                                <td className="px-4 py-2 text-center">
                                  <input
                                    type="checkbox"
                                    checked={report.view}
                                    onChange={() => handleSalesReportsPermission(reportName, "view")}
                                    disabled={report.locked}
                                    className="h-4 w-4"
                                  />
                                </td>
                                <td className="px-4 py-2 text-center">
                                  <input
                                    type="checkbox"
                                    checked={report.export}
                                    onChange={() => handleSalesReportsPermission(reportName, "export")}
                                    disabled={report.locked}
                                    className="h-4 w-4"
                                  />
                                </td>
                                <td className="px-4 py-2 text-center">
                                  <input
                                    type="checkbox"
                                    checked={report.schedule}
                                    onChange={() => handleSalesReportsPermission(reportName, "schedule")}
                                    disabled={report.locked}
                                    className="h-4 w-4"
                                  />
                                </td>
                                <td className="px-4 py-2 text-center">
                                  <input
                                    type="checkbox"
                                    checked={report.share}
                                    onChange={() => handleSalesReportsPermission(reportName, "share")}
                                    disabled={report.locked}
                                    className="h-4 w-4"
                                  />
                                </td>
                              </tr>
                            );
                          })}
                        </>
                      )}
                      {isInventory && isExpanded && (
                        <>
                          {Object.keys(inventoryPermissions).map((reportName) => (
                            <tr key={reportName} className="bg-gray-50 hover:bg-gray-100">
                              <td className="px-4 py-2 pl-12 text-sm text-gray-700">{reportName}</td>
                              <td className="px-4 py-2 text-center">
                                <input
                                  type="checkbox"
                                  checked={inventoryPermissions[reportName].fullAccess}
                                  onChange={() => handleInventoryPermission(reportName, "fullAccess")}
                                  className="h-4 w-4"
                                />
                              </td>
                              <td className="px-4 py-2 text-center">
                                <input
                                  type="checkbox"
                                  checked={inventoryPermissions[reportName].view}
                                  onChange={() => handleInventoryPermission(reportName, "view")}
                                  className="h-4 w-4"
                                />
                              </td>
                              <td className="px-4 py-2 text-center">
                                <input
                                  type="checkbox"
                                  checked={inventoryPermissions[reportName].export}
                                  onChange={() => handleInventoryPermission(reportName, "export")}
                                  className="h-4 w-4"
                                />
                              </td>
                              <td className="px-4 py-2 text-center">
                                <input
                                  type="checkbox"
                                  checked={inventoryPermissions[reportName].schedule}
                                  onChange={() => handleInventoryPermission(reportName, "schedule")}
                                  className="h-4 w-4"
                                />
                              </td>
                              <td className="px-4 py-2 text-center">
                                <input
                                  type="checkbox"
                                  checked={inventoryPermissions[reportName].share}
                                  onChange={() => handleInventoryPermission(reportName, "share")}
                                  className="h-4 w-4"
                                />
                              </td>
                            </tr>
                          ))}
                        </>
                      )}
                      {isInventoryValuation && isExpanded && (
                        <>
                          {Object.keys(inventoryValuationPermissions).map((reportName) => (
                            <tr key={reportName} className="bg-gray-50 hover:bg-gray-100">
                              <td className="px-4 py-2 pl-12 text-sm text-gray-700">{reportName}</td>
                              <td className="px-4 py-2 text-center">
                                <input
                                  type="checkbox"
                                  checked={inventoryValuationPermissions[reportName].fullAccess}
                                  onChange={() => handleInventoryValuationPermission(reportName, "fullAccess")}
                                  className="h-4 w-4"
                                />
                              </td>
                              <td className="px-4 py-2 text-center">
                                <input
                                  type="checkbox"
                                  checked={inventoryValuationPermissions[reportName].view}
                                  onChange={() => handleInventoryValuationPermission(reportName, "view")}
                                  className="h-4 w-4"
                                />
                              </td>
                              <td className="px-4 py-2 text-center">
                                <input
                                  type="checkbox"
                                  checked={inventoryValuationPermissions[reportName].export}
                                  onChange={() => handleInventoryValuationPermission(reportName, "export")}
                                  className="h-4 w-4"
                                />
                              </td>
                              <td className="px-4 py-2 text-center">
                                <input
                                  type="checkbox"
                                  checked={inventoryValuationPermissions[reportName].schedule}
                                  onChange={() => handleInventoryValuationPermission(reportName, "schedule")}
                                  className="h-4 w-4"
                                />
                              </td>
                              <td className="px-4 py-2 text-center">
                                <input
                                  type="checkbox"
                                  checked={inventoryValuationPermissions[reportName].share}
                                  onChange={() => handleInventoryValuationPermission(reportName, "share")}
                                  className="h-4 w-4"
                                />
                              </td>
                            </tr>
                          ))}
                        </>
                      )}
                      {isReceivables && isExpanded && (
                        <>
                          {Object.keys(receivablesPermissions).map((reportName) => {
                            const report = receivablesPermissions[reportName];
                            return (
                              <tr key={reportName} className="bg-gray-50 hover:bg-gray-100">
                                <td className="px-4 py-2 pl-12 text-sm text-gray-700">
                                  <div className="flex items-center gap-2">
                                    {reportName}
                                    {report.locked && <Lock size={14} className="text-gray-400" />}
                                  </div>
                                </td>
                                <td className="px-4 py-2 text-center">
                                  <input
                                    type="checkbox"
                                    checked={report.fullAccess}
                                    onChange={() => handleReceivablesPermission(reportName, "fullAccess")}
                                    disabled={report.locked}
                                    className="h-4 w-4"
                                  />
                                </td>
                                <td className="px-4 py-2 text-center">
                                  <input
                                    type="checkbox"
                                    checked={report.view}
                                    onChange={() => handleReceivablesPermission(reportName, "view")}
                                    disabled={report.locked}
                                    className="h-4 w-4"
                                  />
                                </td>
                                <td className="px-4 py-2 text-center">
                                  <input
                                    type="checkbox"
                                    checked={report.export}
                                    onChange={() => handleReceivablesPermission(reportName, "export")}
                                    disabled={report.locked}
                                    className="h-4 w-4"
                                  />
                                </td>
                                <td className="px-4 py-2 text-center">
                                  <input
                                    type="checkbox"
                                    checked={report.schedule}
                                    onChange={() => handleReceivablesPermission(reportName, "schedule")}
                                    disabled={report.locked}
                                    className="h-4 w-4"
                                  />
                                </td>
                                <td className="px-4 py-2 text-center">
                                  <input
                                    type="checkbox"
                                    checked={report.share}
                                    onChange={() => handleReceivablesPermission(reportName, "share")}
                                    disabled={report.locked}
                                    className="h-4 w-4"
                                  />
                                </td>
                              </tr>
                            );
                          })}
                        </>
                      )}
                      {isPaymentsReceived && isExpanded && (
                        <>
                          {Object.keys(paymentsReceivedPermissions).map((reportName) => (
                            <tr key={reportName} className="bg-gray-50 hover:bg-gray-100">
                              <td className="px-4 py-2 pl-12 text-sm text-gray-700">{reportName}</td>
                              <td className="px-4 py-2 text-center">
                                <input
                                  type="checkbox"
                                  checked={paymentsReceivedPermissions[reportName].fullAccess}
                                  onChange={() => handlePaymentsReceivedPermission(reportName, "fullAccess")}
                                  className="h-4 w-4"
                                />
                              </td>
                              <td className="px-4 py-2 text-center">
                                <input
                                  type="checkbox"
                                  checked={paymentsReceivedPermissions[reportName].view}
                                  onChange={() => handlePaymentsReceivedPermission(reportName, "view")}
                                  className="h-4 w-4"
                                />
                              </td>
                              <td className="px-4 py-2 text-center">
                                <input
                                  type="checkbox"
                                  checked={paymentsReceivedPermissions[reportName].export}
                                  onChange={() => handlePaymentsReceivedPermission(reportName, "export")}
                                  className="h-4 w-4"
                                />
                              </td>
                              <td className="px-4 py-2 text-center">
                                <input
                                  type="checkbox"
                                  checked={paymentsReceivedPermissions[reportName].schedule}
                                  onChange={() => handlePaymentsReceivedPermission(reportName, "schedule")}
                                  className="h-4 w-4"
                                />
                              </td>
                              <td className="px-4 py-2 text-center">
                                <input
                                  type="checkbox"
                                  checked={paymentsReceivedPermissions[reportName].share}
                                  onChange={() => handlePaymentsReceivedPermission(reportName, "share")}
                                  className="h-4 w-4"
                                />
                              </td>
                            </tr>
                          ))}
                        </>
                      )}
                      {isRecurringInvoices && isExpanded && (
                        <>
                          {Object.keys(recurringInvoicesPermissions).map((reportName) => (
                            <tr key={reportName} className="bg-gray-50 hover:bg-gray-100">
                              <td className="px-4 py-2 pl-12 text-sm text-gray-700">{reportName}</td>
                              <td className="px-4 py-2 text-center">
                                <input
                                  type="checkbox"
                                  checked={recurringInvoicesPermissions[reportName].fullAccess}
                                  onChange={() => handleRecurringInvoicesPermission(reportName, "fullAccess")}
                                  className="h-4 w-4"
                                />
                              </td>
                              <td className="px-4 py-2 text-center">
                                <input
                                  type="checkbox"
                                  checked={recurringInvoicesPermissions[reportName].view}
                                  onChange={() => handleRecurringInvoicesPermission(reportName, "view")}
                                  className="h-4 w-4"
                                />
                              </td>
                              <td className="px-4 py-2 text-center">
                                <input
                                  type="checkbox"
                                  checked={recurringInvoicesPermissions[reportName].export}
                                  onChange={() => handleRecurringInvoicesPermission(reportName, "export")}
                                  className="h-4 w-4"
                                />
                              </td>
                              <td className="px-4 py-2 text-center">
                                <input
                                  type="checkbox"
                                  checked={recurringInvoicesPermissions[reportName].schedule}
                                  onChange={() => handleRecurringInvoicesPermission(reportName, "schedule")}
                                  className="h-4 w-4"
                                />
                              </td>
                              <td className="px-4 py-2 text-center">
                                <input
                                  type="checkbox"
                                  checked={recurringInvoicesPermissions[reportName].share}
                                  onChange={() => handleRecurringInvoicesPermission(reportName, "share")}
                                  className="h-4 w-4"
                                />
                              </td>
                            </tr>
                          ))}
                        </>
                      )}
                      {isPayables && isExpanded && (
                        <>
                          {Object.keys(payablesPermissions).map((reportName) => {
                            const report = payablesPermissions[reportName];
                            return (
                              <tr key={reportName} className="bg-gray-50 hover:bg-gray-100">
                                <td className="px-4 py-2 pl-12 text-sm text-gray-700">
                                  <div className="flex items-center gap-2">
                                    {reportName}
                                    {report.locked && <Lock size={14} className="text-gray-400" />}
                                  </div>
                                </td>
                                <td className="px-4 py-2 text-center">
                                  <input
                                    type="checkbox"
                                    checked={report.fullAccess}
                                    onChange={() => handlePayablesPermission(reportName, "fullAccess")}
                                    disabled={report.locked}
                                    className="h-4 w-4"
                                  />
                                </td>
                                <td className="px-4 py-2 text-center">
                                  <input
                                    type="checkbox"
                                    checked={report.view}
                                    onChange={() => handlePayablesPermission(reportName, "view")}
                                    disabled={report.locked}
                                    className="h-4 w-4"
                                  />
                                </td>
                                <td className="px-4 py-2 text-center">
                                  <input
                                    type="checkbox"
                                    checked={report.export}
                                    onChange={() => handlePayablesPermission(reportName, "export")}
                                    disabled={report.locked}
                                    className="h-4 w-4"
                                  />
                                </td>
                                <td className="px-4 py-2 text-center">
                                  <input
                                    type="checkbox"
                                    checked={report.schedule}
                                    onChange={() => handlePayablesPermission(reportName, "schedule")}
                                    disabled={report.locked}
                                    className="h-4 w-4"
                                  />
                                </td>
                                <td className="px-4 py-2 text-center">
                                  <input
                                    type="checkbox"
                                    checked={report.share}
                                    onChange={() => handlePayablesPermission(reportName, "share")}
                                    disabled={report.locked}
                                    className="h-4 w-4"
                                  />
                                </td>
                              </tr>
                            );
                          })}
                        </>
                      )}
                      {isPurchasesAndExpenses && isExpanded && (
                        <>
                          {Object.keys(purchasesAndExpensesPermissions).map((reportName) => {
                            const report = purchasesAndExpensesPermissions[reportName];
                            return (
                              <tr key={reportName} className="bg-gray-50 hover:bg-gray-100">
                                <td className="px-4 py-2 pl-12 text-sm text-gray-700">
                                  <div className="flex items-center gap-2">
                                    {reportName}
                                    {report.locked && <Lock size={14} className="text-gray-400" />}
                                  </div>
                                </td>
                                <td className="px-4 py-2 text-center">
                                  <input
                                    type="checkbox"
                                    checked={report.fullAccess}
                                    onChange={() => handlePurchasesAndExpensesPermission(reportName, "fullAccess")}
                                    disabled={report.locked}
                                    className="h-4 w-4"
                                  />
                                </td>
                                <td className="px-4 py-2 text-center">
                                  <input
                                    type="checkbox"
                                    checked={report.view}
                                    onChange={() => handlePurchasesAndExpensesPermission(reportName, "view")}
                                    disabled={report.locked}
                                    className="h-4 w-4"
                                  />
                                </td>
                                <td className="px-4 py-2 text-center">
                                  <input
                                    type="checkbox"
                                    checked={report.export}
                                    onChange={() => handlePurchasesAndExpensesPermission(reportName, "export")}
                                    disabled={report.locked}
                                    className="h-4 w-4"
                                  />
                                </td>
                                <td className="px-4 py-2 text-center">
                                  <input
                                    type="checkbox"
                                    checked={report.schedule}
                                    onChange={() => handlePurchasesAndExpensesPermission(reportName, "schedule")}
                                    disabled={report.locked}
                                    className="h-4 w-4"
                                  />
                                </td>
                                <td className="px-4 py-2 text-center">
                                  <input
                                    type="checkbox"
                                    checked={report.share}
                                    onChange={() => handlePurchasesAndExpensesPermission(reportName, "share")}
                                    disabled={report.locked}
                                    className="h-4 w-4"
                                  />
                                </td>
                              </tr>
                            );
                          })}
                        </>
                      )}
                      {isTaxes && isExpanded && (
                        <>
                          {Object.keys(taxesPermissions).map((reportName) => (
                            <tr key={reportName} className="bg-gray-50 hover:bg-gray-100">
                              <td className="px-4 py-2 pl-12 text-sm text-gray-700">{reportName}</td>
                              <td className="px-4 py-2 text-center">
                                <input
                                  type="checkbox"
                                  checked={taxesPermissions[reportName].fullAccess}
                                  onChange={() => handleTaxesPermission(reportName, "fullAccess")}
                                  className="h-4 w-4"
                                />
                              </td>
                              <td className="px-4 py-2 text-center">
                                <input
                                  type="checkbox"
                                  checked={taxesPermissions[reportName].view}
                                  onChange={() => handleTaxesPermission(reportName, "view")}
                                  className="h-4 w-4"
                                />
                              </td>
                              <td className="px-4 py-2 text-center">
                                <input
                                  type="checkbox"
                                  checked={taxesPermissions[reportName].export}
                                  onChange={() => handleTaxesPermission(reportName, "export")}
                                  className="h-4 w-4"
                                />
                              </td>
                              <td className="px-4 py-2 text-center">
                                <input
                                  type="checkbox"
                                  checked={taxesPermissions[reportName].schedule}
                                  onChange={() => handleTaxesPermission(reportName, "schedule")}
                                  className="h-4 w-4"
                                />
                              </td>
                              <td className="px-4 py-2 text-center">
                                <input
                                  type="checkbox"
                                  checked={taxesPermissions[reportName].share}
                                  onChange={() => handleTaxesPermission(reportName, "share")}
                                  className="h-4 w-4"
                                />
                              </td>
                            </tr>
                          ))}
                        </>
                      )}
                      {isBanking && isExpanded && (
                        <>
                          {Object.keys(bankingReportsPermissions).map((reportName) => (
                            <tr key={reportName} className="bg-gray-50 hover:bg-gray-100">
                              <td className="px-4 py-2 pl-12 text-sm text-gray-700">{reportName}</td>
                              <td className="px-4 py-2 text-center">
                                <input
                                  type="checkbox"
                                  checked={bankingReportsPermissions[reportName].fullAccess}
                                  onChange={() => handleBankingReportsPermission(reportName, "fullAccess")}
                                  className="h-4 w-4"
                                />
                              </td>
                              <td className="px-4 py-2 text-center">
                                <input
                                  type="checkbox"
                                  checked={bankingReportsPermissions[reportName].view}
                                  onChange={() => handleBankingReportsPermission(reportName, "view")}
                                  className="h-4 w-4"
                                />
                              </td>
                              <td className="px-4 py-2 text-center">
                                <input
                                  type="checkbox"
                                  checked={bankingReportsPermissions[reportName].export}
                                  onChange={() => handleBankingReportsPermission(reportName, "export")}
                                  className="h-4 w-4"
                                />
                              </td>
                              <td className="px-4 py-2 text-center">
                                <input
                                  type="checkbox"
                                  checked={bankingReportsPermissions[reportName].schedule}
                                  onChange={() => handleBankingReportsPermission(reportName, "schedule")}
                                  className="h-4 w-4"
                                />
                              </td>
                              <td className="px-4 py-2 text-center">
                                <input
                                  type="checkbox"
                                  checked={bankingReportsPermissions[reportName].share}
                                  onChange={() => handleBankingReportsPermission(reportName, "share")}
                                  className="h-4 w-4"
                                />
                              </td>
                            </tr>
                          ))}
                        </>
                      )}
                      {isProjectsAndTimesheet && isExpanded && (
                        <>
                          {Object.keys(projectsAndTimesheetPermissions).map((reportName) => (
                            <tr key={reportName} className="bg-gray-50 hover:bg-gray-100">
                              <td className="px-4 py-2 pl-12 text-sm text-gray-700">{reportName}</td>
                              <td className="px-4 py-2 text-center">
                                <input
                                  type="checkbox"
                                  checked={projectsAndTimesheetPermissions[reportName].fullAccess}
                                  onChange={() => handleProjectsAndTimesheetPermission(reportName, "fullAccess")}
                                  className="h-4 w-4"
                                />
                              </td>
                              <td className="px-4 py-2 text-center">
                                <input
                                  type="checkbox"
                                  checked={projectsAndTimesheetPermissions[reportName].view}
                                  onChange={() => handleProjectsAndTimesheetPermission(reportName, "view")}
                                  className="h-4 w-4"
                                />
                              </td>
                              <td className="px-4 py-2 text-center">
                                <input
                                  type="checkbox"
                                  checked={projectsAndTimesheetPermissions[reportName].export}
                                  onChange={() => handleProjectsAndTimesheetPermission(reportName, "export")}
                                  className="h-4 w-4"
                                />
                              </td>
                              <td className="px-4 py-2 text-center">
                                <input
                                  type="checkbox"
                                  checked={projectsAndTimesheetPermissions[reportName].schedule}
                                  onChange={() => handleProjectsAndTimesheetPermission(reportName, "schedule")}
                                  className="h-4 w-4"
                                />
                              </td>
                              <td className="px-4 py-2 text-center">
                                <input
                                  type="checkbox"
                                  checked={projectsAndTimesheetPermissions[reportName].share}
                                  onChange={() => handleProjectsAndTimesheetPermission(reportName, "share")}
                                  className="h-4 w-4"
                                />
                              </td>
                            </tr>
                          ))}
                        </>
                      )}
                      {isAccountant && isExpanded && (
                        <>
                          {Object.keys(accountantReportsPermissions).map((reportName) => (
                            <tr key={reportName} className="bg-gray-50 hover:bg-gray-100">
                              <td className="px-4 py-2 pl-12 text-sm text-gray-700">{reportName}</td>
                              <td className="px-4 py-2 text-center">
                                <input
                                  type="checkbox"
                                  checked={accountantReportsPermissions[reportName].fullAccess}
                                  onChange={() => handleAccountantReportsPermission(reportName, "fullAccess")}
                                  className="h-4 w-4"
                                />
                              </td>
                              <td className="px-4 py-2 text-center">
                                <input
                                  type="checkbox"
                                  checked={accountantReportsPermissions[reportName].view}
                                  onChange={() => handleAccountantReportsPermission(reportName, "view")}
                                  className="h-4 w-4"
                                />
                              </td>
                              <td className="px-4 py-2 text-center">
                                <input
                                  type="checkbox"
                                  checked={accountantReportsPermissions[reportName].export}
                                  onChange={() => handleAccountantReportsPermission(reportName, "export")}
                                  className="h-4 w-4"
                                />
                              </td>
                              <td className="px-4 py-2 text-center">
                                <input
                                  type="checkbox"
                                  checked={accountantReportsPermissions[reportName].schedule}
                                  onChange={() => handleAccountantReportsPermission(reportName, "schedule")}
                                  className="h-4 w-4"
                                />
                              </td>
                              <td className="px-4 py-2 text-center">
                                <input
                                  type="checkbox"
                                  checked={accountantReportsPermissions[reportName].share}
                                  onChange={() => handleAccountantReportsPermission(reportName, "share")}
                                  className="h-4 w-4"
                                />
                              </td>
                            </tr>
                          ))}
                        </>
                      )}
                      {isBudgets && isExpanded && (
                        <>
                          {Object.keys(budgetsPermissions).map((reportName) => (
                            <tr key={reportName} className="bg-gray-50 hover:bg-gray-100">
                              <td className="px-4 py-2 pl-12 text-sm text-gray-700">{reportName}</td>
                              <td className="px-4 py-2 text-center">
                                <input
                                  type="checkbox"
                                  checked={budgetsPermissions[reportName].fullAccess}
                                  onChange={() => handleBudgetsPermission(reportName, "fullAccess")}
                                  className="h-4 w-4"
                                />
                              </td>
                              <td className="px-4 py-2 text-center">
                                <input
                                  type="checkbox"
                                  checked={budgetsPermissions[reportName].view}
                                  onChange={() => handleBudgetsPermission(reportName, "view")}
                                  className="h-4 w-4"
                                />
                              </td>
                              <td className="px-4 py-2 text-center">
                                <input
                                  type="checkbox"
                                  checked={budgetsPermissions[reportName].export}
                                  onChange={() => handleBudgetsPermission(reportName, "export")}
                                  className="h-4 w-4"
                                />
                              </td>
                              <td className="px-4 py-2 text-center">
                                <input
                                  type="checkbox"
                                  checked={budgetsPermissions[reportName].schedule}
                                  onChange={() => handleBudgetsPermission(reportName, "schedule")}
                                  className="h-4 w-4"
                                />
                              </td>
                              <td className="px-4 py-2 text-center">
                                <input
                                  type="checkbox"
                                  checked={budgetsPermissions[reportName].share}
                                  onChange={() => handleBudgetsPermission(reportName, "share")}
                                  className="h-4 w-4"
                                />
                              </td>
                            </tr>
                          ))}
                        </>
                      )}
                      {isCurrency && isExpanded && (
                        <>
                          {Object.keys(currencyPermissions).map((reportName) => (
                            <tr key={reportName} className="bg-gray-50 hover:bg-gray-100">
                              <td className="px-4 py-2 pl-12 text-sm text-gray-700">{reportName}</td>
                              <td className="px-4 py-2 text-center">
                                <input
                                  type="checkbox"
                                  checked={currencyPermissions[reportName].fullAccess}
                                  onChange={() => handleCurrencyPermission(reportName, "fullAccess")}
                                  className="h-4 w-4"
                                />
                              </td>
                              <td className="px-4 py-2 text-center">
                                <input
                                  type="checkbox"
                                  checked={currencyPermissions[reportName].view}
                                  onChange={() => handleCurrencyPermission(reportName, "view")}
                                  className="h-4 w-4"
                                />
                              </td>
                              <td className="px-4 py-2 text-center">
                                <input
                                  type="checkbox"
                                  checked={currencyPermissions[reportName].export}
                                  onChange={() => handleCurrencyPermission(reportName, "export")}
                                  className="h-4 w-4"
                                />
                              </td>
                              <td className="px-4 py-2 text-center">
                                <input
                                  type="checkbox"
                                  checked={currencyPermissions[reportName].schedule}
                                  onChange={() => handleCurrencyPermission(reportName, "schedule")}
                                  className="h-4 w-4"
                                />
                              </td>
                              <td className="px-4 py-2 text-center">
                                <input
                                  type="checkbox"
                                  checked={currencyPermissions[reportName].share}
                                  onChange={() => handleCurrencyPermission(reportName, "share")}
                                  className="h-4 w-4"
                                />
                              </td>
                            </tr>
                          ))}
                        </>
                      )}
                      {isActivity && isExpanded && (
                        <>
                          {Object.keys(activityPermissions).map((reportName) => (
                            <tr key={reportName} className="bg-gray-50 hover:bg-gray-100">
                              <td className="px-4 py-2 pl-12 text-sm text-gray-700">{reportName}</td>
                              <td className="px-4 py-2 text-center">
                                <input
                                  type="checkbox"
                                  checked={activityPermissions[reportName].fullAccess}
                                  onChange={() => handleActivityPermission(reportName, "fullAccess")}
                                  className="h-4 w-4"
                                />
                              </td>
                              <td className="px-4 py-2 text-center">
                                <input
                                  type="checkbox"
                                  checked={activityPermissions[reportName].view}
                                  onChange={() => handleActivityPermission(reportName, "view")}
                                  className="h-4 w-4"
                                />
                              </td>
                              <td className="px-4 py-2 text-center">
                                <input
                                  type="checkbox"
                                  checked={activityPermissions[reportName].export}
                                  onChange={() => handleActivityPermission(reportName, "export")}
                                  className="h-4 w-4"
                                />
                              </td>
                              <td className="px-4 py-2 text-center">
                                <input
                                  type="checkbox"
                                  checked={activityPermissions[reportName].schedule}
                                  onChange={() => handleActivityPermission(reportName, "schedule")}
                                  className="h-4 w-4"
                                />
                              </td>
                              <td className="px-4 py-2 text-center">
                                <input
                                  type="checkbox"
                                  checked={activityPermissions[reportName].share}
                                  onChange={() => handleActivityPermission(reportName, "share")}
                                  className="h-4 w-4"
                                />
                              </td>
                            </tr>
                          ))}
                        </>
                      )}
                      {isAutomation && isExpanded && (
                        <>
                          {Object.keys(automationPermissions).map((reportName) => (
                            <tr key={reportName} className="bg-gray-50 hover:bg-gray-100">
                              <td className="px-4 py-2 pl-12 text-sm text-gray-700">{reportName}</td>
                              <td className="px-4 py-2 text-center">
                                <input
                                  type="checkbox"
                                  checked={automationPermissions[reportName].fullAccess}
                                  onChange={() => handleAutomationPermission(reportName, "fullAccess")}
                                  className="h-4 w-4"
                                />
                              </td>
                              <td className="px-4 py-2 text-center">
                                <input
                                  type="checkbox"
                                  checked={automationPermissions[reportName].view}
                                  onChange={() => handleAutomationPermission(reportName, "view")}
                                  className="h-4 w-4"
                                />
                              </td>
                              <td className="px-4 py-2 text-center">
                                <input
                                  type="checkbox"
                                  checked={automationPermissions[reportName].export}
                                  onChange={() => handleAutomationPermission(reportName, "export")}
                                  className="h-4 w-4"
                                />
                              </td>
                              <td className="px-4 py-2 text-center">
                                <input
                                  type="checkbox"
                                  checked={automationPermissions[reportName].schedule}
                                  onChange={() => handleAutomationPermission(reportName, "schedule")}
                                  className="h-4 w-4"
                                />
                              </td>
                              <td className="px-4 py-2 text-center">
                                <input
                                  type="checkbox"
                                  checked={automationPermissions[reportName].share}
                                  onChange={() => handleAutomationPermission(reportName, "share")}
                                  className="h-4 w-4"
                                />
                              </td>
                            </tr>
                          ))}
                        </>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate("/settings/roles")}
          className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          onClick={async () => {
            if (!roleName.trim()) {
              setError("Role name is required");
              return;
            }

            setIsSaving(true);
            setError(null);

            try {
              // Build report groups object
              const reportGroups = {
                "Business Overview": businessOverviewPermissions,
                "Sales": salesReportsPermissions,
                "Inventory": inventoryPermissions,
                "Inventory Valuation": inventoryValuationPermissions,
                "Receivables": receivablesPermissions,
                "Payments Received": paymentsReceivedPermissions,
                "Recurring Invoices": recurringInvoicesPermissions,
                "Payables": payablesPermissions,
                "Purchases and Expenses": purchasesAndExpensesPermissions,
                "Taxes": taxesPermissions,
                "Banking": bankingReportsPermissions,
                "Projects and Timesheet": projectsAndTimesheetPermissions,
                "Accountant": accountantReportsPermissions,
                "Budgets": budgetsPermissions,
                "Currency": currencyPermissions,
                "Activity": activityPermissions,
                "Automation": automationPermissions,
              };

              // Build complete role object
              const roleData = {
                name: roleName.trim(),
                description: description.trim(),
                isAccountantRole,
                contacts: contactsPermissions,
                items: itemsPermissions,
                banking: bankingPermissions,
                sales: salesPermissions,
                purchases: purchasesPermissions,
                accountant: accountantPermissions,
                timesheets: timesheetsPermissions,
                locations: locationsPermissions,
                vatFiling: {
                  enabled: vatFilingEnabled,
                  ...vatFilingPermissions,
                },
                documents: {
                  enabled: documentsEnabled,
                  ...documentsPermissions,
                },
                settings: {
                  enabled: settingsEnabled,
                  ...settingsPermissions,
                },
                dashboard: {
                  enabled: dashboardEnabled,
                  ...dashboardPermissions,
                  allowDashboardManagement,
                },
                reports: {
                  fullReportsAccess,
                  reportGroups,
                },
              };

              const response = isEditMode && id
                ? await rolesAPI.update(id, roleData)
                : await rolesAPI.create(roleData);

              if (response.success) {
                navigate("/settings/roles");
              } else {
                setError(response.message || (isEditMode ? "Failed to update role" : "Failed to create role"));
              }
            } catch (err) {
              console.error("Error saving role:", err);
              setError(err.message || "Failed to save role. Please try again.");
            } finally {
              setIsSaving(false);
            }
          }}
          disabled={isSaving || isLoadingRole}
          className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoadingRole ? "Loading..." : isSaving ? "Saving..." : isEditMode ? "Update" : "Save"}
        </button>
      </div>
    </div>
  );
}






