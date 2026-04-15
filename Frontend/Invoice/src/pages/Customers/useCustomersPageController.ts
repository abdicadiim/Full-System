import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate, useLocation } from "react-router-dom";
import { getCustomViews, getCustomers } from "../salesModel";
import { customersAPI, taxesAPI, currenciesAPI } from "../../services/api";
import { usePaymentTermsDropdown } from "../../../hooks/usePaymentTermsDropdown";
import { toast } from "react-toastify";
import { useSettings } from "../../lib/settings/SettingsContext";
import {
  customerQueryKeys,
  fetchCustomersList,
  type CustomersListQueryResult,
  useCustomersListQuery,
} from "./customerQueries";
import { loadCustomerReportingTags } from "./customerReportingTags";

const defaultCustomerViews = [
  "All Customers",
  "Active Customers",
  "CRM Customers",
  "Duplicate Customers",
  "Inactive Customers",
  "Customer Portal Enabled",
  "Customer Portal Disabled",
  "Overdue Customers",
  "Unpaid Customers"
];


export default function useCustomersPageController() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { settings } = useSettings();
  const organizationName = String(settings?.general?.companyDisplayName || settings?.general?.schoolDisplayName || "").trim() || "Organization";
  const organizationNameHtml = organizationName.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const AUTH_URL = (import.meta as any).env?.VITE_AUTH_URL || "http://localhost:5172";
  const LOCAL_COLUMNS_LAYOUT_KEY = "taban_customers_columns";
  const [customers, setCustomers] = useState<any[]>([]);
  const [statusOverrides, setStatusOverrides] = useState<Record<string, "active" | "inactive">>({});
  const [selectedCustomers, setSelectedCustomers] = useState(new Set<string>());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const currentPageRef = useRef(1);
  const itemsPerPageRef = useRef(50);
  const loadCustomersRef = useRef<any>(null);
  const lastAutoRefreshAtRef = useRef(0);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedView, setSelectedView] = useState("All Customers");
  const [favoriteViews, setFavoriteViews] = useState(new Set<string>());
  const [viewSearchQuery, setViewSearchQuery] = useState("");
  const [customViews, setCustomViews] = useState(() => getCustomViews().filter(v => v.type === "customers" || !v.type));
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newViewName, setNewViewName] = useState("");
  const [isFavorite, setIsFavorite] = useState(false);
  const [criteria, setCriteria] = useState([{ id: 1, field: "", comparator: "", value: "" }]);
  const [selectedColumns, setSelectedColumns] = useState(["Name"]);
  const [fieldSearch, setFieldSearch] = useState({});
  const [isFieldDropdownOpen, setIsFieldDropdownOpen] = useState({});
  const [comparatorSearch, setComparatorSearch] = useState({});
  const [isComparatorDropdownOpen, setIsComparatorDropdownOpen] = useState({});


  interface Column {
    key: string;
    label: string;
    visible: boolean;
    pinned: boolean;
    width: number;
  }

  const DEFAULT_COLUMNS: Column[] = [
    { key: "name", label: "Name", visible: true, pinned: true, width: 200 },
    { key: "companyName", label: "Company Name", visible: true, pinned: false, width: 200 },
    { key: "email", label: "Email", visible: false, pinned: false, width: 250 },
    { key: "workPhone", label: "Phone", visible: true, pinned: false, width: 150 },
    { key: "receivables_bcy", label: "Receivables (BCY)", visible: true, pinned: false, width: 180 },
    { key: "unused_credits_bcy", label: "Unused Credits (BCY)", visible: true, pinned: false, width: 150 },
    { key: "receivables", label: "Receivables", visible: false, pinned: false, width: 150 },
    { key: "unusedCredits", label: "Unused Credits", visible: false, pinned: false, width: 150 },
    { key: "source", label: "Source", visible: false, pinned: false, width: 120 },
    { key: "customerNumber", label: "Customer Number", visible: false, pinned: false, width: 150 },
    { key: "first_name", label: "First Name", visible: false, pinned: false, width: 120 },
    { key: "last_name", label: "Last Name", visible: false, pinned: false, width: 120 },
    { key: "mobile", label: "Mobile Phone", visible: false, pinned: false, width: 150 },
    { key: "payment_terms", label: "Payment Terms", visible: false, pinned: false, width: 150 },
    { key: "status", label: "Status", visible: false, pinned: false, width: 100 },
    { key: "website", label: "Website", visible: false, pinned: false, width: 180 },
  ];

  const [columns, setColumns] = useState<Column[]>(() => {
    const saved = localStorage.getItem(LOCAL_COLUMNS_LAYOUT_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return DEFAULT_COLUMNS.map(def => {
          const found = parsed.find((p: any) => p.key === def.key);
          return found ? { ...def, ...found } : def;
        });
      } catch (e) {
        return DEFAULT_COLUMNS;
      }
    }
    return DEFAULT_COLUMNS;
  });

  const [hasResized, setHasResized] = useState(false);
  const [originalColumns, setOriginalColumns] = useState<Column[] | null>(null);

  const handleSaveLayout = () => {
    localStorage.setItem(LOCAL_COLUMNS_LAYOUT_KEY, JSON.stringify(columns));
    setHasResized(false);
    setOriginalColumns(null);
  };

  const handleCancelLayout = () => {
    if (originalColumns) {
      setColumns(originalColumns);
    }
    setHasResized(false);
    setOriginalColumns(null);
  };

  const handleResetColumnWidths = () => {
    setColumns(prev => {
      const updated = prev.map((col) => {
        const defaults = DEFAULT_COLUMNS.find((def) => def.key === col.key);
        return defaults ? { ...col, width: defaults.width } : col;
      });
      localStorage.setItem(LOCAL_COLUMNS_LAYOUT_KEY, JSON.stringify(updated));
      return updated;
    });
    setHasResized(false);
    setOriginalColumns(null);
    toast.success("Column widths reset to default");
  };

  const [isCustomizeModalOpen, setIsCustomizeModalOpen] = useState(false);
  const resizingRef = useRef<{ col: string; startX: number; startWidth: number } | null>(null);

  const visibleColumns = useMemo(() => columns.filter(c => c.visible), [columns]);

  const handleToggleColumn = (key: string) => {
    setColumns(prev => prev.map(c => c.key === key ? { ...c, visible: !c.visible } : c));
  };

  const handleTogglePin = (key: string) => {
    setColumns(prev => {
      const updated = prev.map(c => c.key === key ? { ...c, pinned: !c.pinned } : c);
      const pinned = updated.filter(c => c.pinned);
      const unpinned = updated.filter(c => !c.pinned);
      return [...pinned, ...unpinned];
    });
  };

  const handleReorder = (dragIndex: number, hoverIndex: number) => {
    setColumns(prev => {
      const updated = [...prev];
      const [draggedItem] = updated.splice(dragIndex, 1);
      updated.splice(hoverIndex, 0, draggedItem);
      return updated;
    });
  };

  const startResizing = (key: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const col = columns.find(c => c.key === key);
    if (!col) return;
    if (!originalColumns) {
      setOriginalColumns([...columns]);
    }
    resizingRef.current = {
      col: key,
      startX: e.clientX,
      startWidth: col.width
    };
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  const setColumnWidth = (key: string, width: number) => {
    setColumns(prev => prev.map(c => c.key === key ? { ...c, width } : c));
    setHasResized(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!resizingRef.current) return;
      const { col, startX, startWidth } = resizingRef.current;
      const delta = e.clientX - startX;
      setColumnWidth(col, Math.max(80, startWidth + delta));
    };

    const handleMouseUp = () => {
      resizingRef.current = null;
      document.body.style.cursor = 'default';
      document.body.style.userSelect = 'auto';
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);
  const hasValue = (value: any) =>
    value !== undefined && value !== null && !(typeof value === "string" && value.trim() === "");

  const pickFirstValue = (...values: any[]) => {
    const found = values.find(hasValue);
    return found ?? "";
  };

  const getCustomerFieldValue = (customer: any, key: string) => {
    switch (key) {
      case "name":
        return pickFirstValue(customer.name, customer.displayName);
      case "companyName":
        return pickFirstValue(customer.companyName, customer.company_name);
      case "email":
        return pickFirstValue(customer.email, customer.emailAddress, customer.contactEmail);
      case "workPhone":
        return pickFirstValue(customer.workPhone, customer.phone, customer.phoneNumber);
      case "receivables":
        return Number(customer.receivables ?? customer.accountsReceivable ?? 0);
      case "unusedCredits":
        return Number(customer.unusedCredits ?? customer.unused_credits ?? 0);
      case "first_name":
        return pickFirstValue(customer.firstName, customer.first_name);
      case "last_name":
        return pickFirstValue(customer.lastName, customer.last_name);
      case "mobile":
        return pickFirstValue(customer.mobilePhone, customer.mobile, customer.mobileNumber);
      case "payment_terms":
        return pickFirstValue(customer.paymentTerms, customer.payment_terms);
      case "status":
        return pickFirstValue(customer.status, "Active");
      case "website":
        return pickFirstValue(customer.website, customer.webSite);
      case "source":
        return pickFirstValue(customer.source, customer.customerSource, customer.origin);
      case "customerNumber":
        return pickFirstValue(
          customer.customerNumber,
          customer.customer_number,
          customer.customerNo,
          customer.customer_no
        );
      case "receivables_bcy":
        return Number(customer.receivables ?? customer.accountsReceivable ?? 0);
      case "unused_credits_bcy":
        return Number(customer.unusedCredits ?? customer.unused_credits ?? 0);
      default:
        return pickFirstValue(customer[key], customer[key?.toLowerCase?.() || key]);
    }
  };

  const [columnSearch, setColumnSearch] = useState("");
  const [visibilityPreference, setVisibilityPreference] = useState("only-me");
  const [hoveredView, setHoveredView] = useState(null);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [isBulkMoreMenuOpen, setIsBulkMoreMenuOpen] = useState(false);
  const [isSortBySubmenuOpen, setIsSortBySubmenuOpen] = useState(false);
  const [isBulkUpdateModalOpen, setIsBulkUpdateModalOpen] = useState(false);
  const [bulkConsolidatedAction, setBulkConsolidatedAction] = useState<null | "enable" | "disable">(null);
  const [isBulkConsolidatedUpdating, setIsBulkConsolidatedUpdating] = useState(false);
  const [bulkUpdateData, setBulkUpdateData] = useState({
    customerType: "",
    creditLimit: "",
    currency: "",
    taxRate: "",
    paymentTerms: "",
    customerLanguage: "",
    accountsReceivable: "",
    priceListId: "",
    reportingTags: {} as Record<string, string>
  });
  const [isCurrencyDropdownOpen, setIsCurrencyDropdownOpen] = useState(false);
  const [currencySearch, setCurrencySearch] = useState("");
  const currencyDropdownRef = useRef(null);
  const [priceLists, setPriceLists] = useState<Array<{ id: string; name: string; currency: string; pricingScheme: string }>>([]);
  const [availableReportingTags, setAvailableReportingTags] = useState<any[]>([]);

  const loadPriceLists = useCallback(() => {
    try {
      const raw = localStorage.getItem('inv_price_lists_v1');
      const parsed = raw ? JSON.parse(raw) : [];
      if (Array.isArray(parsed)) {
        setPriceLists(parsed.map((p: any) => ({
          id: String(p.id || p._id || ""),
          name: String(p.name || ""),
          currency: String(p.currency || ""),
          pricingScheme: String(p.pricingScheme || "")
        })).filter((p: any) => p.id));
      } else {
        setPriceLists([]);
      }
    } catch {
      setPriceLists([]);
    }
  }, []);

  useEffect(() => {
    loadPriceLists();
  }, [loadPriceLists]);

  const loadReportingTags = useCallback(async () => {
    try {
      const tags = await loadCustomerReportingTags();
      setAvailableReportingTags(tags);
    } catch (error) {
      setAvailableReportingTags([]);
    }
  }, []);

  useEffect(() => {
    loadReportingTags();
  }, [loadReportingTags]);

  // Use payment terms hook
  const paymentTermsHook = usePaymentTermsDropdown({
    initialValue: bulkUpdateData.paymentTerms,
    onSelect: (term) => {
      setBulkUpdateData(prev => ({ ...prev, paymentTerms: term.value }));
    }
  });
  const [isCustomerLanguageDropdownOpen, setIsCustomerLanguageDropdownOpen] = useState(false);
  const [customerLanguageSearch, setCustomerLanguageSearch] = useState("");
  const customerLanguageDropdownRef = useRef(null);
  const [isTaxRateDropdownOpen, setIsTaxRateDropdownOpen] = useState(false);
  const [taxRateSearch, setTaxRateSearch] = useState("");
  const taxRateDropdownRef = useRef(null);
  const [isAccountsReceivableDropdownOpen, setIsAccountsReceivableDropdownOpen] = useState(false);
  const [accountsReceivableSearch, setAccountsReceivableSearch] = useState("");
  const accountsReceivableDropdownRef = useRef(null);

  const closeBulkUpdateDropdowns = () => {
    setIsCurrencyDropdownOpen(false);
    setIsTaxRateDropdownOpen(false);
    paymentTermsHook.close();
    setIsCustomerLanguageDropdownOpen(false);
    setIsAccountsReceivableDropdownOpen(false);
  };
  const dropdownRef = useRef(null);
  const modalRef = useRef(null);
  const moreMenuRef = useRef(null);
  const bulkMoreMenuRef = useRef(null);
  const [isExportCurrentViewModalOpen, setIsExportCurrentViewModalOpen] = useState(false);
  const [isExportCustomersModalOpen, setIsExportCustomersModalOpen] = useState(false);
  const [exportData, setExportData] = useState({
    module: "Customers",
    moduleType: "Customers", // For radio buttons: Customers, Customer's Contact Persons, Customer's Addresses
    dataScope: "All Customers", // All Customers or Specific Period
    decimalFormat: "1234567.89",
    fileFormat: "csv",
    includePII: false,
    password: "",
    showPassword: false
  });
  useEffect(() => {
    const state =
      (location.state as
        | {
          openExportModal?: boolean;
          openBulkUpdateModal?: boolean;
          openBulkDeleteModal?: boolean;
          preselectedCustomerIds?: string[];
        }
        | null) || null;

    if (!state) return;

    const preselectedIds = Array.isArray(state.preselectedCustomerIds) ? state.preselectedCustomerIds : [];

    if (state.openExportModal) {
      setIsExportCustomersModalOpen(true);
    }

    if (state.openBulkUpdateModal) {
      if (preselectedIds.length) {
        setSelectedCustomers(new Set(preselectedIds));
      }
      setBulkUpdateData({
        customerType: "",
        creditLimit: "",
        currency: "",
        taxRate: "",
        paymentTerms: "",
        customerLanguage: "",
        accountsReceivable: "",
        priceListId: "",
        reportingTags: {},
      });
      setIsBulkUpdateModalOpen(true);
    }

    if (state.openBulkDeleteModal) {
      if (preselectedIds.length) {
        setSelectedCustomers(new Set(preselectedIds));
        setDeleteCustomerIds(preselectedIds);
      } else {
        setDeleteCustomerIds([]);
      }
      setIsBulkDeleteModalOpen(true);
    }

    if (state.openExportModal || state.openBulkUpdateModal || state.openBulkDeleteModal) {
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location.pathname, location.state, navigate]);

  const [isDecimalFormatDropdownOpen, setIsDecimalFormatDropdownOpen] = useState(false);
  const [isModuleDropdownOpen, setIsModuleDropdownOpen] = useState(false);
  const decimalFormatDropdownRef = useRef(null);
  const moduleDropdownRef = useRef(null);
  const [isMergeModalOpen, setIsMergeModalOpen] = useState(false);
  const [mergeTargetCustomer, setMergeTargetCustomer] = useState<any>(null);
  const [isMergeCustomerDropdownOpen, setIsMergeCustomerDropdownOpen] = useState(false);
  const [mergeCustomerSearch, setMergeCustomerSearch] = useState("");
  const [isFieldCustomizationOpen, setIsFieldCustomizationOpen] = useState(false);
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);
  const [activePreferencesTab, setActivePreferencesTab] = useState("preferences");
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteCustomerId, setDeleteCustomerId] = useState(null);
  const [deleteCustomerIds, setDeleteCustomerIds] = useState<string[]>([]);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [isDeletingCustomer, setIsDeletingCustomer] = useState(false);
  const [isBulkDeletingCustomers, setIsBulkDeletingCustomers] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printDateRange, setPrintDateRange] = useState({
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [isPrintPreviewOpen, setIsPrintPreviewOpen] = useState(false);
  const [printPreviewContent, setPrintPreviewContent] = useState("");
  const [customFields, setCustomFields] = useState([
    { id: 1, name: "Sales person", dataType: "Text Box (Single Line)", mandatory: false, showInPDF: true, status: "Active", isLocked: true },
    { id: 2, name: "Description", dataType: "Text Box (Single Line)", mandatory: false, showInPDF: true, status: "Active", isLocked: true },
    { id: 3, name: "Reference", dataType: "Text Box (Single Line)", mandatory: false, showInPDF: true, status: "Active", isLocked: false }
  ]);
  const [preferences, setPreferences] = useState({
    allowEditingSentInvoice: true,
    associateExpenseReceipts: false,
    notifyOnOnlinePayment: true,
    includePaymentReceipt: true,
    automateThankYouNote: false,
    invoiceQRCodeEnabled: false,
    hideZeroValueLineItems: false,
    termsAndConditions: "",
    customerNotes: "Thank you for the payment. You just made our day."
  });
  const mergeCustomerDropdownRef = useRef(null);
  const [isMoreOptionsDropdownOpen, setIsMoreOptionsDropdownOpen] = useState(false);
  const moreOptionsDropdownRef = useRef(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importType, setImportType] = useState("customers"); // "customers" or "contactPersons"
  const [isImportContinueLoading, setIsImportContinueLoading] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [searchModalData, setSearchModalData] = useState({
    // Customers
    displayName: "",
    companyName: "",
    lastName: "",
    status: "All",
    address: "",
    customerType: "",
    firstName: "",
    email: "",
    phone: "",
    notes: "",
    // Items
    itemName: "",
    description: "",
    purchaseRate: "",
    salesAccount: "",
    sku: "",
    rate: "",
    purchaseAccount: "",
    // Inventory Adjustments
    referenceNumber: "",
    reason: "",
    itemDescription: "",
    adjustmentType: "All",
    dateFrom: "",
    dateTo: "",
    // Banking
    totalRangeFrom: "",
    totalRangeTo: "",
    dateRangeFrom: "",
    dateRangeTo: "",
    transactionType: "",
    // Quotes
    quoteNumber: "",
    referenceNumberQuote: "",
    itemNameQuote: "",
    itemDescriptionQuote: "",
    totalRangeFromQuote: "",
    totalRangeToQuote: "",
    customerName: "",
    salesperson: "",
    projectName: "",
    taxExemptions: "",
    addressType: "Billing and Shipping",
    attention: "",
    // Invoices
    invoiceNumber: "",
    orderNumber: "",
    createdBetweenFrom: "",
    createdBetweenTo: "",
    itemNameInvoice: "",
    itemDescriptionInvoice: "",
    account: "",
    totalRangeFromInvoice: "",
    totalRangeToInvoice: "",
    customerNameInvoice: "",
    salespersonInvoice: "",
    projectNameInvoice: "",
    taxExemptionsInvoice: "",
    addressTypeInvoice: "Billing and Shipping",
    attentionInvoice: "",
    // Payments Received
    paymentNumber: "",
    referenceNumberPayment: "",
    dateRangeFromPayment: "",
    dateRangeToPayment: "",
    totalRangeFromPayment: "",
    totalRangeToPayment: "",
    statusPayment: "",
    paymentMethod: "",
    notesPayment: "",
    // Expenses
    expenseNumber: "",
    vendorName: "",
    // Vendors
    displayNameVendor: "",
    firstNameVendor: "",
    emailVendor: "",
    phoneVendor: "",
    companyNameVendor: "",
    lastNameVendor: "",
    statusVendor: "All",
    addressVendor: "",
    notesVendor: ""
  });
  const [searchType, setSearchType] = useState("Customers");
  const [searchModalFilter, setSearchModalFilter] = useState("All Customers");
  const searchTypeOptions = [
    "Customers",
    "Items",
    "Inventory Adjustments",
    "Banking",
    "Quotes",
    "Invoices",
    "Payments Received",
    "Recurring Invoices",
    "Credit Notes",
    "Vendors",
    "Expenses",
    "Recurring Expenses",
    "Purchase Orders",
    "Bills",
    "Payments Made",
    "Recurring Bills",
    "Vendor Credits",
    "Projects",
    "Timesheet",
    "Journals",
    "Chart of Accounts",
    "Documents",
    "Task"
  ];
  const [isSearchTypeDropdownOpen, setIsSearchTypeDropdownOpen] = useState(false);
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  const [isCustomerTypeDropdownOpen, setIsCustomerTypeDropdownOpen] = useState(false);
  const [isSalesAccountDropdownOpen, setIsSalesAccountDropdownOpen] = useState(false);
  const [isPurchaseAccountDropdownOpen, setIsPurchaseAccountDropdownOpen] = useState(false);
  const [isAdjustmentTypeDropdownOpen, setIsAdjustmentTypeDropdownOpen] = useState(false);
  const [isTransactionTypeDropdownOpen, setIsTransactionTypeDropdownOpen] = useState(false);
  const [isItemNameDropdownOpen, setIsItemNameDropdownOpen] = useState(false);
  const [isCustomerNameDropdownOpen, setIsCustomerNameDropdownOpen] = useState(false);
  const [isSalespersonDropdownOpen, setIsSalespersonDropdownOpen] = useState(false);
  const [isProjectNameDropdownOpen, setIsProjectNameDropdownOpen] = useState(false);
  const [isTaxExemptionsDropdownOpen, setIsTaxExemptionsDropdownOpen] = useState(false);
  const [isAccountDropdownOpen, setIsAccountDropdownOpen] = useState(false);
  const [isPaymentMethodDropdownOpen, setIsPaymentMethodDropdownOpen] = useState(false);
  const searchTypeDropdownRef = useRef(null);
  const filterDropdownRef = useRef(null);
  const statusDropdownRef = useRef(null);
  const customerTypeDropdownRef = useRef(null);
  const salesAccountDropdownRef = useRef(null);
  const purchaseAccountDropdownRef = useRef(null);
  const adjustmentTypeDropdownRef = useRef(null);
  const transactionTypeDropdownRef = useRef(null);
  const itemNameDropdownRef = useRef(null);
  const customerNameDropdownRef = useRef(null);
  const salespersonDropdownRef = useRef(null);
  const projectNameDropdownRef = useRef(null);
  const taxExemptionsDropdownRef = useRef(null);
  const accountDropdownRef = useRef(null);
  const paymentMethodDropdownRef = useRef(null);
  const [openReceivablesDropdownId, setOpenReceivablesDropdownId] = useState(null);
  const receivablesDropdownRefs = useRef({});
  const [hoveredRowId, setHoveredRowId] = useState(null);
  const [isSearchHeaderDropdownOpen, setIsSearchHeaderDropdownOpen] = useState(false);
  const searchHeaderDropdownRef = useRef(null);
  const [receivablesDropdownPosition, setReceivablesDropdownPosition] = useState({ top: 0, left: 0 });
  const receivablesDropdownRef = useRef(null);
  const getSearchFilterOptions = (type: string) => {
    const map: Record<string, string[]> = {
      "Customers": allViews,
      "Items": ["All Items", "Active Items", "Inactive Items", "Low Stock", "Inventory Items"],
      "Inventory Adjustments": ["All", "By Quantity", "By Value"],
      "Banking": ["All Transactions", "Uncategorized", "Matched", "Excluded"],
      "Quotes": ["All Quotes", "Draft", "Sent", "Accepted", "Declined", "Expired", "Invoiced"],
      "Invoices": ["All Invoices", "Draft", "Sent", "Paid", "Overdue", "Partially Paid"],
      "Payments Received": ["All", "Uncleared", "Cleared"],
      "Recurring Invoices": ["All", "Active", "Draft", "Stopped"],
      "Credit Notes": ["All Credit Notes", "Draft", "Open", "Closed"],
      "Vendors": ["All Vendors", "Active Vendors", "CRM Vendors", "Duplicate Vendors", "Inactive Vendors"],
      "Expenses": ["All Expenses", "Billable", "Non-Billable", "Reimbursed", "Non-Reimbursed"],
      "Recurring Expenses": ["All", "Active", "Draft", "Stopped"],
      "Purchase Orders": ["All Purchase Orders", "Draft", "Issued", "Billed", "Closed"],
      "Bills": ["All Bills", "Open", "Overdue", "Paid", "Draft"],
      "Payments Made": ["All", "Bill Payments", "Vendor Advances"],
      "Recurring Bills": ["All", "Active", "Draft", "Stopped"],
      "Vendor Credits": ["All Vendor Credits", "Open", "Applied", "Closed"],
      "Projects": ["All Projects", "Active Projects", "Inactive Projects"],
      "Timesheet": ["All", "Billable", "Non-Billable", "Billed", "Unbilled"],
      "Journals": ["All Journals", "Draft", "Published"],
      "Chart of Accounts": ["All Accounts", "Active Accounts", "Inactive Accounts"],
      "Documents": ["All Documents", "Files", "Bank Statements"],
      "Task": ["All Tasks", "Open", "Completed", "Overdue"],
    };
    return map[type] || ["All"];
  };

  const openSearchModalForCurrentContext = () => {
    setSearchType("Customers");
    setSearchModalFilter(selectedView || "All Customers");
    resetSearchModalData();
    setIsSearchModalOpen(true);
  };

  // Helper function to reset all search modal data
  const resetSearchModalData = () => {
    setSearchModalData({
      displayName: "",
      companyName: "",
      lastName: "",
      status: "All",
      address: "",
      customerType: "",
      firstName: "",
      email: "",
      phone: "",
      notes: "",
      itemName: "",
      description: "",
      purchaseRate: "",
      salesAccount: "",
      sku: "",
      rate: "",
      purchaseAccount: "",
      referenceNumber: "",
      reason: "",
      itemDescription: "",
      adjustmentType: "All",
      dateFrom: "",
      dateTo: "",
      totalRangeFrom: "",
      totalRangeTo: "",
      dateRangeFrom: "",
      dateRangeTo: "",
      transactionType: "",
      quoteNumber: "",
      referenceNumberQuote: "",
      itemNameQuote: "",
      itemDescriptionQuote: "",
      totalRangeFromQuote: "",
      totalRangeToQuote: "",
      customerName: "",
      salesperson: "",
      projectName: "",
      taxExemptions: "",
      addressType: "Billing and Shipping",
      attention: "",
      invoiceNumber: "",
      orderNumber: "",
      createdBetweenFrom: "",
      createdBetweenTo: "",
      itemNameInvoice: "",
      itemDescriptionInvoice: "",
      account: "",
      totalRangeFromInvoice: "",
      totalRangeToInvoice: "",
      customerNameInvoice: "",
      salespersonInvoice: "",
      projectNameInvoice: "",
      taxExemptionsInvoice: "",
      addressTypeInvoice: "Billing and Shipping",
      attentionInvoice: "",
      paymentNumber: "",
      referenceNumberPayment: "",
      dateRangeFromPayment: "",
      dateRangeToPayment: "",
      totalRangeFromPayment: "",
      totalRangeToPayment: "",
      statusPayment: "",
      paymentMethod: "",
      notesPayment: "",
      expenseNumber: "",
      vendorName: "",
      // Vendors
      displayNameVendor: "",
      firstNameVendor: "",
      emailVendor: "",
      phoneVendor: "",
      companyNameVendor: "",
      lastNameVendor: "",
      statusVendor: "All",
      addressVendor: "",
      notesVendor: ""
    });
  };

  const [currencyOptions, setCurrencyOptions] = useState<Array<{ code: string; name: string }>>([]);

  // Fetch currencies from settings (used across the app)
  useEffect(() => {
    const fetchCurrencies = async () => {
      try {
        const response: any = await currenciesAPI.getAll({ limit: 2000 });
        const rows = Array.isArray(response?.data) ? response.data : (Array.isArray(response) ? response : []);
        const formatted = rows
          .map((curr: any) => {
            const code = String(curr?.code || curr?.currencyCode || curr?.isoCode || "").toUpperCase().trim();
            const title = String(curr?.currencyName || curr?.name || curr?.currency || "").trim();
            if (!code) return null;
            return { code, name: title ? `${code} - ${title}` : code };
          })
          .filter(Boolean) as Array<{ code: string; name: string }>;
        setCurrencyOptions(formatted);
      } catch {
        setCurrencyOptions([]);
      }
    };
    fetchCurrencies();
  }, []);
  const [taxRateOptions, setTaxRateOptions] = useState<any[]>([{ label: "No Tax", value: "No Tax" }]);

  useEffect(() => {
    const fetchTaxes = async () => {
      try {
        const response = await taxesAPI.getAll();
        const allTaxes = response?.data || response || [];

        if (Array.isArray(allTaxes)) {
          const taxes = allTaxes.filter((t: any) => !t.isGroup && t.type !== 'group');
          const taxGroups = allTaxes.filter((t: any) => t.isGroup || t.type === 'group');

          const options: any[] = [{ label: "No Tax", value: "No Tax" }];

          if (taxes.length > 0) {
            options.push({ label: "Taxes", isHeader: true });
            options.push(...taxes.map((t: any) => ({ label: `${t.name} (${t.rate}%)`, value: `${t.name} (${t.rate}%)` })));
          }

          if (taxGroups.length > 0) {
            options.push({ label: "Tax Groups", isHeader: true });
            options.push(...taxGroups.map((t: any) => ({ label: `${t.name} (${t.rate}%)`, value: `${t.name} (${t.rate}%)` })));
          }

          setTaxRateOptions(options);
        }
      } catch (error) {
        setTaxRateOptions([
          { label: "No Tax", value: "No Tax" },
          { label: "Standard Rate (20%)", value: "Standard Rate (20%)" }
        ]);
      }
    };
    fetchTaxes();
  }, []);
  const portalLanguageOptions = ["English", "Spanish", "French", "German", "Arabic", "Chinese", "Japanese", "Somali", "Hindi", "Portuguese", "Russian", "Italian", "Dutch", "Korean", "Turkish", "Polish", "Swedish", "Norwegian", "Danish", "Finnish", "Greek", "Czech", "Hungarian", "Romanian", "Bulgarian", "Croatian", "Serbian", "Ukrainian", "Estonian", "Latvian", "Lithuanian", "Slovak", "Slovenian", "Irish", "Scottish Gaelic", "Welsh", "Basque", "Catalan", "Galician", "Icelandic", "Maltese", "Albanian", "Macedonian", "Bosnian", "Montenegrin", "Belarusian", "Moldovan", "Armenian", "Georgian", "Azerbaijani", "Kazakh", "Kyrgyz", "Tajik", "Turkmen", "Uzbek", "Mongolian", "Nepali", "Bengali", "Tamil", "Telugu", "Marathi", "Gujarati", "Kannada", "Malayalam", "Punjabi", "Sinhala", "Burmese", "Khmer", "Lao", "Thai", "Vietnamese", "Indonesian", "Malay", "Filipino", "Javanese", "Sundanese", "Malagasy", "Swahili", "Zulu", "Afrikaans", "Amharic", "Oromo", "Tigrinya", "Yoruba", "Igbo", "Hausa", "Wolof", "Berber", "Hebrew", "Pashto", "Urdu", "Persian", "Dari", "Uyghur", "Tibetan", "Mandarin", "Cantonese", "Taiwanese", "Hakka"];
  const accountsReceivableOptions = ["Accounts Receivable"];

  const filteredCurrencies = currencyOptions.filter(c =>
    c.name.toLowerCase().includes(currencySearch.toLowerCase()) ||
    c.code.toLowerCase().includes(currencySearch.toLowerCase())
  );

  const filteredCustomerLanguages = portalLanguageOptions.filter(opt =>
    opt.toLowerCase().includes(customerLanguageSearch.toLowerCase())
  );



  // Evaluate a single criterion
  const evaluateCriterion = (fieldValue: any, comparator: string, value: any) => {
    const fieldStr = String(fieldValue || "").toLowerCase();
    const valueStr = String(value || "").toLowerCase();

    switch (comparator) {
      case "is":
        return fieldStr === valueStr;
      case "is not":
        return fieldStr !== valueStr;
      case "starts with":
        return fieldStr.startsWith(valueStr);
      case "contains":
        return fieldStr.includes(valueStr);
      case "doesn't contain":
        return !fieldStr.includes(valueStr);
      case "is in":
        return valueStr.split(",").map(v => v.trim()).includes(fieldStr);
      case "is not in":
        return !valueStr.split(",").map(v => v.trim()).includes(fieldStr);
      case "is empty":
        return !fieldValue || fieldStr === "";
      case "is not empty":
        return fieldValue && fieldStr !== "";
      case "greater than":
        return parseFloat(fieldValue) > parseFloat(value);
      case "less than":
        return parseFloat(fieldValue) < parseFloat(value);
      case "greater than or equal":
        return parseFloat(fieldValue) >= parseFloat(value);
      case "less than or equal":
        return parseFloat(fieldValue) <= parseFloat(value);
      default:
        return true;
    }
  };

  // Evaluate custom view criteria
  const evaluateCustomViewCriteria = (customersList: any[], criteria: any[]) => {
    if (!criteria || criteria.length === 0) {
      return customersList;
    }

    return customersList.filter((customer: any) => {
      return criteria.every((criterion: any) => {
        if (!criterion.field || !criterion.comparator) {
          return true; // Skip incomplete criteria
        }

        const fieldValue = getCustomerFieldValue(customer, criterion.field);
        return evaluateCriterion(fieldValue, criterion.comparator, criterion.value);
      });
    });
  };

  // Filter customers based on selected view
  const filterCustomersByView = (customersList, viewName) => {
    if (viewName === "All Customers") {
      return customersList;
    }

    // Check if it's a custom view
    const customView = customViews.find(v => v.name === viewName);
    if (customView && customView.criteria) {
      return evaluateCustomViewCriteria(customersList, customView.criteria);
    }

    // Default view filters
    switch (viewName) {
      case "Active Customers":
        return customersList.filter(c =>
          (c.status?.toLowerCase() === "active") || c.isActive === true || (!c.status && !c.isInactive)
        );

      case "Inactive Customers":
        return customersList.filter(c =>
          (c.status?.toLowerCase() === "inactive") || c.isInactive === true
        );

      case "CRM Customers":
        return customersList.filter(c =>
          c.customerType === "CRM" || c.source === "CRM"
        );

      case "Duplicate Customers":
        // Find duplicates by name or email
        const nameMap = {};
        const emailMap = {};
        customersList.forEach(c => {
          if (c.name) {
            nameMap[c.name] = (nameMap[c.name] || 0) + 1;
          }
          if (c.email) {
            emailMap[c.email] = (emailMap[c.email] || 0) + 1;
          }
        });
        return customersList.filter(c =>
          (c.name && nameMap[c.name] > 1) || (c.email && emailMap[c.email] > 1)
        );

      case "Customer Portal Enabled":
        return customersList.filter(c =>
          c.enablePortal === true || c.portalStatus === "Enabled"
        );

      case "Customer Portal Disabled":
        return customersList.filter(c =>
          c.enablePortal === false || c.portalStatus === "Disabled" || !c.enablePortal
        );

      case "Overdue Customers":
        return customersList.filter(c => {
          const receivables = parseFloat(c.receivables || 0);
          return receivables > 0;
        });

      case "Unpaid Customers":
        return customersList.filter(c => {
          const receivables = parseFloat(c.receivables || 0);
          return receivables > 0;
        });

      default:
        return customersList;
    }
  };

  // Get filtered and sorted customers
  const getFilteredAndSortedCustomers = () => {
    let filtered = filterCustomersByView(customers, selectedView);

    // Apply sorting
    if (sortConfig.key) {
      filtered = [...filtered].sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];

        // Handle nested properties
        if (sortConfig.key === "name") {
          aValue = a.name || "";
          bValue = b.name || "";
        } else if (sortConfig.key === "companyName") {
          aValue = a.companyName || "";
          bValue = b.companyName || "";
        } else if (sortConfig.key === "receivables") {
          aValue = parseFloat(a.receivables || 0);
          bValue = parseFloat(b.receivables || 0);
        } else if (sortConfig.key === "createdTime") {
          aValue = new Date(a.createdAt || 0);
          bValue = new Date(b.createdAt || 0);
        } else if (sortConfig.key === "lastModifiedTime") {
          aValue = new Date(a.updatedAt || a.createdAt || 0);
          bValue = new Date(b.updatedAt || b.createdAt || 0);
        }

        if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  };

  const displayedCustomers = getFilteredAndSortedCustomers();
  const hasPositiveReceivables = useMemo(
    () =>
      displayedCustomers.some((customer) =>
        Number(customer.receivables ?? customer.receivables_bcy ?? customer.accountsReceivable ?? 0) > 0
      ),
    [displayedCustomers]
  );
  const hasPositiveUnusedCredits = useMemo(
    () =>
      displayedCustomers.some((customer) =>
        Number(customer.unusedCredits ?? customer.unused_credits ?? customer.unused_credits_bcy ?? 0) > 0
      ),
    [displayedCustomers]
  );
  const tableVisibleColumns = useMemo(
    () =>
      visibleColumns.filter((col) => {
        if (col.key === "receivables" || col.key === "receivables_bcy") {
          return hasPositiveReceivables;
        }
        if (col.key === "unusedCredits" || col.key === "unused_credits_bcy") {
          return hasPositiveUnusedCredits;
        }
        return true;
      }),
    [visibleColumns, hasPositiveReceivables, hasPositiveUnusedCredits]
  );
  const tableMinWidth = useMemo(
    () => tableVisibleColumns.reduce((total, col) => total + col.width, 0) + 112,
    [tableVisibleColumns]
  );
  const showCustomerSkeletons = isLoading && customers.length === 0;

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedCustomers(new Set(displayedCustomers.map(c => c.id)));
    } else {
      setSelectedCustomers(new Set());
    }
  };

  const handleSelectCustomer = (customerId) => {
    const newSelected = new Set(selectedCustomers);
    if (newSelected.has(customerId)) {
      newSelected.delete(customerId);
    } else {
      newSelected.add(customerId);
    }
    setSelectedCustomers(newSelected);
  };

  const handleSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const formatCurrency = (amount) => {
    return (amount || 0).toFixed(2);
  };

  const getCustomerIdForNavigation = (customer: any) => {
    const rawId = customer?._id ?? customer?.id;
    if (rawId === undefined || rawId === null) return "";
    return String(rawId).trim();
  };

  const mapCustomerForList = useCallback((customer: any) => {
    const customerId = customer?.id ? String(customer.id) : (customer?._id ? String(customer._id) : "");
    if (!customerId) return null;
    const statusOverride = statusOverrides[customerId];

    let customerName = customer.displayName || customer.name;
    if (!customerName || customerName.trim() === "") {
      const firstName = customer.firstName || "";
      const lastName = customer.lastName || "";
      const companyName = customer.companyName || "";
      if (firstName || lastName) {
        customerName = `${firstName} ${lastName}`.trim();
      } else if (companyName) {
        customerName = companyName.trim();
      } else {
        customerName = "Customer";
      }
    }

    customerName = customerName.trim() || "Customer";
    const normalizedStatusOverride = statusOverride ? statusOverride.toLowerCase() : "";
    const statusFromFlags =
      customer?.isInactive === true
        ? "inactive"
        : customer?.isActive === true
          ? "active"
          : "";
    const resolvedStatus = normalizedStatusOverride || String(customer.status || statusFromFlags || "active").toLowerCase();
    const resolvedIsActive = resolvedStatus === "active";
    const resolvedIsInactive = resolvedStatus === "inactive";

    return {
      ...customer,
      id: customerId,
      _id: customer._id || customerId,
      name: customerName,
      displayName: customer.displayName || customerName || "Customer",
      companyName: pickFirstValue(customer.companyName, customer.company_name),
      email: pickFirstValue(customer.email, customer.emailAddress, customer.contactEmail),
      workPhone: pickFirstValue(customer.workPhone, customer.phone, customer.phoneNumber),
      mobilePhone: pickFirstValue(customer.mobilePhone, customer.mobile, customer.mobileNumber),
      firstName: pickFirstValue(customer.firstName, customer.first_name),
      lastName: pickFirstValue(customer.lastName, customer.last_name),
      source: pickFirstValue(customer.source, customer.customerSource, customer.origin),
      customerNumber: pickFirstValue(
        customer.customerNumber,
        customer.customer_number,
        customer.customerNo,
        customer.customer_no
      ),
      paymentTerms: pickFirstValue(customer.paymentTerms, customer.payment_terms),
      status: resolvedStatus,
      isActive: resolvedIsActive,
      isInactive: resolvedIsInactive,
      website: pickFirstValue(customer.website, customer.webSite),
      receivables: Number(customer.receivables ?? customer.accountsReceivable ?? 0),
      unusedCredits: Number(customer.unusedCredits ?? customer.unused_credits ?? 0),
      currency: pickFirstValue(customer.currency, customer.currencyCode, "KES")
    };
  }, [statusOverrides]);

  const applyCustomerListResult = useCallback((result?: CustomersListQueryResult | null) => {
    if (!result) return;

    const customersArray = Array.isArray(result.data) ? result.data : [];
    setTotalItems(result.total || result.pagination?.total || customersArray.length || 0);
    setTotalPages(result.totalPages || result.pagination?.pages || 0);
    setCustomers(customersArray.map(mapCustomerForList).filter(Boolean));
    setStatusOverrides((prev) => {
      const next = { ...prev };
      customersArray.forEach((row: any) => {
        const rowId = String(row?._id || row?.id || "").trim();
        if (!rowId || !next[rowId]) return;
        const rowStatus =
          row?.isInactive === true
            ? "inactive"
            : row?.isActive === true
              ? "active"
              : String(row?.status || "").toLowerCase();
        if (rowStatus && rowStatus === next[rowId]) {
          delete next[rowId];
        }
      });
      return next;
    });
  }, [mapCustomerForList]);

  const customersListQuery = useCustomersListQuery({
    page: currentPage,
    limit: itemsPerPage,
    search: "",
  });

  useEffect(() => {
    if (customersListQuery.data) {
      applyCustomerListResult(customersListQuery.data);
    }
  }, [applyCustomerListResult, customersListQuery.data]);

  useEffect(() => {
    const hasLoadedRows =
      Array.isArray(customersListQuery.data?.data) && customersListQuery.data.data.length > 0;
    setIsRefreshing(customersListQuery.isFetching);
    setIsLoading(customersListQuery.isPending && !hasLoadedRows && customers.length === 0);
  }, [
    customers.length,
    customersListQuery.data?.data,
    customersListQuery.isFetching,
    customersListQuery.isPending,
  ]);

  currentPageRef.current = currentPage;
  itemsPerPageRef.current = itemsPerPage;

  const refreshCustomViews = useCallback(() => {
    setCustomViews(getCustomViews().filter(v => v.type === "customers" || !v.type));
  }, []);

  const triggerAutomaticCustomerReload = useCallback((
    options: {
      minIntervalMs?: number;
      rowRefreshOnly?: boolean;
      useCache?: boolean;
    } = {}
  ) => {
    const {
      minIntervalMs = 0,
      rowRefreshOnly = false,
      useCache = false,
    } = options;
    const now = Date.now();
    if (minIntervalMs > 0 && now - lastAutoRefreshAtRef.current < minIntervalMs) {
      return;
    }
    lastAutoRefreshAtRef.current = now;
    void loadCustomersRef.current?.(
      currentPageRef.current,
      itemsPerPageRef.current,
      { rowRefreshOnly, useCache }
    );
  }, []);

  // Load customers once on mount and keep the list fresh on focus/visibility/customer updates.
  useEffect(() => {
    try {
      localStorage.removeItem("taban_customers_cache");
    } catch { }

    refreshCustomViews();

    const handleVisibilityChange = () => {
      if (document.hidden) return;
      refreshCustomViews();
      triggerAutomaticCustomerReload({ minIntervalMs: 750, rowRefreshOnly: true, useCache: false });
    };

    const handleCustomersUpdated = () => {
      refreshCustomViews();
      triggerAutomaticCustomerReload({ minIntervalMs: 150, rowRefreshOnly: true, useCache: false });
    };

    const handleFocus = () => {
      triggerAutomaticCustomerReload({ minIntervalMs: 750, rowRefreshOnly: true, useCache: false });
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("customersUpdated", handleCustomersUpdated);
    window.addEventListener("focus", handleFocus);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("customersUpdated", handleCustomersUpdated);
      window.removeEventListener("focus", handleFocus);
    };
  }, [refreshCustomViews, triggerAutomaticCustomerReload]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target)) {
        setIsMoreMenuOpen(false);
      }
      if (bulkMoreMenuRef.current && !bulkMoreMenuRef.current.contains(event.target)) {
        setIsBulkMoreMenuOpen(false);
      }
      if (decimalFormatDropdownRef.current && !decimalFormatDropdownRef.current.contains(event.target)) {
        setIsDecimalFormatDropdownOpen(false);
      }
      if (moduleDropdownRef.current && !moduleDropdownRef.current.contains(event.target)) {
        setIsModuleDropdownOpen(false);
      }
      // Close field and comparator dropdowns when clicking outside
      const isFieldDropdown = event.target.closest('[data-field-dropdown]') ||
        event.target.closest('[data-field-button]');
      if (!isFieldDropdown && Object.keys(isFieldDropdownOpen).length > 0) {
        setIsFieldDropdownOpen({});
      }
      if (!isFieldDropdown && Object.keys(isComparatorDropdownOpen).length > 0) {
        setIsComparatorDropdownOpen({});
      }
      // Close merge customer dropdown when clicking outside
      if (mergeCustomerDropdownRef.current && !mergeCustomerDropdownRef.current.contains(event.target)) {
        setIsMergeCustomerDropdownOpen(false);
      }
      // Close more options dropdown when clicking outside
      if (moreOptionsDropdownRef.current && !moreOptionsDropdownRef.current.contains(event.target)) {
        setIsMoreOptionsDropdownOpen(false);
      }
      // Close search header dropdown when clicking outside
      if (searchHeaderDropdownRef.current && !searchHeaderDropdownRef.current.contains(event.target)) {
        setIsSearchHeaderDropdownOpen(false);
      }
      // Close search modal dropdowns when clicking outside
      if (searchTypeDropdownRef.current && !searchTypeDropdownRef.current.contains(event.target)) {
        setIsSearchTypeDropdownOpen(false);
      }
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(event.target)) {
        setIsFilterDropdownOpen(false);
      }
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(event.target)) {
        setIsStatusDropdownOpen(false);
      }
      if (customerTypeDropdownRef.current && !customerTypeDropdownRef.current.contains(event.target)) {
        setIsCustomerTypeDropdownOpen(false);
      }
      // Close receivables dropdown when clicking outside
      if (openReceivablesDropdownId !== null) {
        const dropdownRef = receivablesDropdownRef.current;
        // Check if click is on the button that opens the dropdown
        const clickedElement = event.target.closest('[data-receivables-button]');
        if (dropdownRef && !dropdownRef.contains(event.target) && (!clickedElement || clickedElement.getAttribute('data-customer-id') !== openReceivablesDropdownId)) {
          setOpenReceivablesDropdownId(null);
          setHoveredRowId(null);
        }
      }
    };

    if (isDropdownOpen || isMoreMenuOpen || isBulkMoreMenuOpen || isDecimalFormatDropdownOpen || isModuleDropdownOpen || Object.keys(isFieldDropdownOpen).length > 0 || Object.keys(isComparatorDropdownOpen).length > 0 || isMergeCustomerDropdownOpen || isMoreOptionsDropdownOpen || isSearchTypeDropdownOpen || isFilterDropdownOpen || isStatusDropdownOpen || isCustomerTypeDropdownOpen || openReceivablesDropdownId !== null || isSearchHeaderDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isDropdownOpen, isMoreMenuOpen, isBulkMoreMenuOpen, isDecimalFormatDropdownOpen, isModuleDropdownOpen, isFieldDropdownOpen, isComparatorDropdownOpen, isMergeCustomerDropdownOpen, isMoreOptionsDropdownOpen, isSearchTypeDropdownOpen, isFilterDropdownOpen, isStatusDropdownOpen, isCustomerTypeDropdownOpen, openReceivablesDropdownId, isSearchHeaderDropdownOpen]);

  const handleViewSelect = (view) => {
    setSelectedView(view);
    setIsDropdownOpen(false);
  };

  const handleToggleFavorite = (view, e) => {
    e.stopPropagation();
    const newFavorites = new Set(favoriteViews);
    if (newFavorites.has(view)) {
      newFavorites.delete(view);
    } else {
      newFavorites.add(view);
    }
    setFavoriteViews(newFavorites);
  };

  const handleSaveCustomView = () => {
    if (newViewName.trim()) {
      const newView = {
        id: Date.now().toString(),
        name: newViewName.trim(),
        isFavorite: isFavorite,
        criteria: criteria,
        columns: selectedColumns,
        visibility: visibilityPreference
      };
      setCustomViews([...customViews, newView]);
      setNewViewName("");
      setIsFavorite(false);
      setCriteria([{ id: 1, field: "", comparator: "", value: "" }]);
      setSelectedColumns(["Name"]);
      setVisibilityPreference("only-me");
      setIsModalOpen(false);
      setSelectedView(newView.name);
      if (isFavorite) {
        setFavoriteViews(prev => new Set([...prev, newView.name]));
      }
    }
  };

  const handleAddCriterion = () => {
    setCriteria([...criteria, { id: Date.now(), field: "", comparator: "", value: "" }]);
  };

  const handleRemoveCriterion = (id) => {
    if (criteria.length > 1) {
      setCriteria(criteria.filter(c => c.id !== id));
    }
  };

  const handleCriterionChange = (id, field, value) => {
    setCriteria(criteria.map(c =>
      c.id === id ? { ...c, [field]: value } : c
    ));
  };

  const handleAddColumn = (column) => {
    if (!selectedColumns.includes(column)) {
      setSelectedColumns([...selectedColumns, column]);
    }
  };

  const handleRemoveColumn = (column) => {
    if (selectedColumns.length > 1 && column !== "Name") {
      setSelectedColumns(selectedColumns.filter(c => c !== column));
    }
  };

  const customerFields = [
    "Name", "Company Name", "Email", "Work Phone", "Mobile Phone", "Phone",
    "Receivables", "Receivables (BCY)", "Unused Credits", "Unused Credits (BCY)",
    "Currency", "Status", "Payment Terms", "Customer Type", "Source", "Website",
    "Notes", "Billing Country", "Shipping Country", "Portal Status",
    "Portal Invitation Accepted Date", "Tax", "First Name", "Last Name"
  ];

  const comparators = [
    "is", "is not", "starts with", "contains", "doesn't contain",
    "is in", "is not in", "is empty", "is not empty"
  ];

  const handleDeleteCustomView = (viewId, e) => {
    e.stopPropagation();
    const updatedViews = customViews.filter(v => v.id !== viewId);
    setCustomViews(updatedViews);
    if (selectedView === customViews.find(v => v.id === viewId)?.name) {
      setSelectedView("All Customers");
    }
  };

  const handleDeleteCustomer = async (customerId, e) => {
    e.stopPropagation();
    setDeleteCustomerId(customerId);
    setIsDeleteModalOpen(true);
  };

  const confirmDeleteCustomer = async () => {
    if (!deleteCustomerId) return;

    try {
      setIsDeletingCustomer(true);
      await customersAPI.delete(deleteCustomerId);
      await loadCustomers();
      notifyCustomersUpdated({ action: "deleted", customerId: deleteCustomerId });
      setSelectedCustomers(prev => {
        const newSet = new Set(prev);
        newSet.delete(deleteCustomerId);
        return newSet;
      });
      setIsDeleteModalOpen(false);
      setDeleteCustomerId(null);
      toast.success("Customer deleted successfully.");
    } catch (error) {
      toast.error("Failed to delete customer: " + (error?.message || "Unknown error."));
    } finally {
      setIsDeletingCustomer(false);
    }
  };

  const handleBulkDelete = () => {
    if (selectedCustomers.size === 0) return;
    setDeleteCustomerIds(Array.from(selectedCustomers));
    setIsBulkDeleteModalOpen(true);
  };

  const confirmBulkDelete = async () => {
    if (deleteCustomerIds.length === 0) return;

    try {
      setIsBulkDeletingCustomers(true);
      await customersAPI.bulkDelete(deleteCustomerIds);
      await loadCustomers();
      notifyCustomersUpdated({ action: "bulk-deleted", customerIds: deleteCustomerIds });
      setSelectedCustomers(new Set());
      setIsBulkDeleteModalOpen(false);
      setDeleteCustomerIds([]);
      toast.success("Customers deleted successfully.");
    } catch (error) {
      toast.error("Failed to delete customers: " + (error?.message || "Unknown error."));
    } finally {
      setIsBulkDeletingCustomers(false);
    }
  };

  // Load customers from API
  const loadCustomers = async (
    page = currentPage,
    limit = itemsPerPage,
    options: { rowRefreshOnly?: boolean; useCache?: boolean } = {}
  ) => {
    const { rowRefreshOnly = false, useCache = false } = options;
    const queryParams = {
      page,
      limit,
      search: "",
    };
    const queryKey = customerQueryKeys.list(queryParams);
    const cachedResult = queryClient.getQueryData<CustomersListQueryResult>(queryKey);
    const shouldShowBlockingLoader = !rowRefreshOnly && customers.length === 0 && !cachedResult;

    try {
      if (shouldShowBlockingLoader) {
        setIsLoading(true);
      }
      setIsRefreshing(true);

      if (useCache && cachedResult) {
        applyCustomerListResult(cachedResult);
      }

      const response = await queryClient.fetchQuery({
        queryKey,
        queryFn: () => fetchCustomersList(queryParams),
      });

      applyCustomerListResult(response);
    } catch (error: any) {

      if (error.status === 401 || error.message?.includes('authorized') || error.message?.includes('Unauthorized')) {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user');
        localStorage.removeItem('organization');
        window.location.replace(`${AUTH_URL}/login?app=billing`);
        return;
      }

      toast.error("Error loading customers: " + (error?.message || "Unknown error."));
      setCustomers([]);
    } finally {
      if (shouldShowBlockingLoader) {
        setIsLoading(false);
      }
      setIsRefreshing(false);
    }
  };
  loadCustomersRef.current = loadCustomers;

  const [isNewDropdownOpen, setIsNewDropdownOpen] = useState(false);
  const newDropdownRef = useRef<HTMLDivElement>(null);

  // Close new dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (newDropdownRef.current && !newDropdownRef.current.contains(event.target as Node)) {
        setIsNewDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  // Close modal when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        setIsModalOpen(false);
        setNewViewName("");
      }
    };

    if (isModalOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isModalOpen]);

  // Close currency dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (currencyDropdownRef.current && !currencyDropdownRef.current.contains(event.target)) {
        setIsCurrencyDropdownOpen(false);
      }
    };

    if (isCurrencyDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isCurrencyDropdownOpen]);

  // Close customer language dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (customerLanguageDropdownRef.current && !customerLanguageDropdownRef.current.contains(event.target)) {
        setIsCustomerLanguageDropdownOpen(false);
      }
    };

    if (isCustomerLanguageDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isCustomerLanguageDropdownOpen]);

  const allViews = [...defaultCustomerViews, ...customViews.map(v => v.name)];
  const singleSelectionMergeTargets = useMemo(
    () => customers.filter((customer: any) => !selectedCustomers.has(customer.id)),
    [customers, selectedCustomers]
  );
  const dropdownMergeTargets = useMemo(() => {
    const search = mergeCustomerSearch.toLowerCase();
    return customers.filter((customer: any) =>
      (customer.name || customer.displayName || "").toLowerCase().includes(search)
    );
  }, [customers, mergeCustomerSearch]);

  const handleClearSelection = () => {
    setSelectedCustomers(new Set());
  };

  const notifyCustomersUpdated = (detail: Record<string, any> = {}) => {
    if (typeof window === "undefined") return;
    window.dispatchEvent(
      new CustomEvent("customersUpdated", {
        detail: {
          ...detail,
          timestamp: Date.now(),
        },
      })
    );
  };

  const handleBulkMarkActive = async () => {
    if (selectedCustomers.size === 0) {
      toast.error("Please select at least one customer.");
      return;
    }

    const ids = Array.from(selectedCustomers).map((value) => String(value));
    const statusPatch = { status: "active", isActive: true, isInactive: false };
    const idsSet = new Set(ids);
    const applyStatusPatchToCache = () => {
      setCustomers((prev) =>
        (Array.isArray(prev) ? prev : []).map((row: any) => {
          const rowId = String(row?.id || row?._id || "").trim();
          if (!rowId || !idsSet.has(rowId)) return row;
          return { ...row, ...statusPatch };
        })
      );
      setStatusOverrides((prev) => {
        const next = { ...prev };
        idsSet.forEach((rowId) => {
          next[rowId] = "active";
        });
        return next;
      });
      const cachedListQueries = queryClient.getQueryCache().findAll({
        queryKey: customerQueryKeys.lists(),
      });
      cachedListQueries.forEach((query) => {
        queryClient.setQueryData(query.queryKey, (existing: CustomersListQueryResult | undefined) => {
          if (!existing || !Array.isArray(existing.data)) return existing;
          const nextData = existing.data.map((row: any) => {
            const rowId = String(row?._id || row?.id || "").trim();
            if (!rowId || !idsSet.has(rowId)) return row;
            return { ...row, ...statusPatch };
          });
          return { ...existing, data: nextData };
        });
      });
    };

    try {
      applyStatusPatchToCache();
      await customersAPI.bulkUpdate(ids, statusPatch);
      await loadCustomers();
      notifyCustomersUpdated({ action: "bulk-updated", customerIds: ids, status: "active" });
      toast.success(`Marked ${selectedCustomers.size} customer(s) as active`);
      setSelectedCustomers(new Set());
    } catch (error) {
      setStatusOverrides((prev) => {
        const next = { ...prev };
        idsSet.forEach((rowId) => {
          delete next[rowId];
        });
        return next;
      });
      await loadCustomers();
      toast.error("Failed to mark customers as active. Please try again.");
    }
  };

  const handleBulkMarkInactive = async () => {
    if (selectedCustomers.size === 0) {
      toast.error("Please select at least one customer.");
      return;
    }

    const ids = Array.from(selectedCustomers).map((value) => String(value));
    const statusPatch = { status: "inactive", isActive: false, isInactive: true };
    const idsSet = new Set(ids);
    const applyStatusPatchToCache = () => {
      setCustomers((prev) =>
        (Array.isArray(prev) ? prev : []).map((row: any) => {
          const rowId = String(row?.id || row?._id || "").trim();
          if (!rowId || !idsSet.has(rowId)) return row;
          return { ...row, ...statusPatch };
        })
      );
      setStatusOverrides((prev) => {
        const next = { ...prev };
        idsSet.forEach((rowId) => {
          next[rowId] = "inactive";
        });
        return next;
      });
      const cachedListQueries = queryClient.getQueryCache().findAll({
        queryKey: customerQueryKeys.lists(),
      });
      cachedListQueries.forEach((query) => {
        queryClient.setQueryData(query.queryKey, (existing: CustomersListQueryResult | undefined) => {
          if (!existing || !Array.isArray(existing.data)) return existing;
          const nextData = existing.data.map((row: any) => {
            const rowId = String(row?._id || row?.id || "").trim();
            if (!rowId || !idsSet.has(rowId)) return row;
            return { ...row, ...statusPatch };
          });
          return { ...existing, data: nextData };
        });
      });
    };

    try {
      applyStatusPatchToCache();
      await customersAPI.bulkUpdate(ids, statusPatch);
      await loadCustomers();
      notifyCustomersUpdated({ action: "bulk-updated", customerIds: ids, status: "inactive" });
      toast.success(`Marked ${selectedCustomers.size} customer(s) as inactive`);
      setSelectedCustomers(new Set());
    } catch (error) {
      setStatusOverrides((prev) => {
        const next = { ...prev };
        idsSet.forEach((rowId) => {
          delete next[rowId];
        });
        return next;
      });
      await loadCustomers();
      toast.error("Failed to mark customers as inactive. Please try again.");
    }
  };

  const handleBulkMerge = () => {
    if (selectedCustomers.size === 0) {
      toast.error("Please select at least one customer to merge.");
      return;
    }
    // Do not preselect a merge target (Zoho-style: user chooses master profile)
    setMergeTargetCustomer(null);
    setIsMergeCustomerDropdownOpen(false);
    setMergeCustomerSearch("");
    setIsMergeModalOpen(true);
  };

  const handleMergeContinue = async () => {
    if (!mergeTargetCustomer) {
      toast.error("Please select a customer to merge with.");
      return;
    }

    const selectedCustomerIds = Array.from(selectedCustomers);
    const sourceCustomerIds = selectedCustomerIds.filter(id => id !== mergeTargetCustomer.id);

    if (sourceCustomerIds.length === 0) {
      toast.error("Please select different customers to merge.");
      return;
    }

    try {
      await customersAPI.merge(mergeTargetCustomer.id, sourceCustomerIds);
      await loadCustomers();
      notifyCustomersUpdated({
        action: "merged",
        customerId: mergeTargetCustomer.id,
        customerIds: sourceCustomerIds,
      });
      const sourceNames = customers
        .filter(c => sourceCustomerIds.includes(c.id))
        .map(c => c.name)
        .join(", ");
      toast.success(`Successfully merged "${sourceNames}" into "${mergeTargetCustomer.name}". The merged customer(s) have been marked as inactive.`);
      setSelectedCustomers(new Set());
      setIsMergeModalOpen(false);
      setMergeTargetCustomer(null);
      setMergeCustomerSearch("");
    } catch (error) {
      const message = (error as any)?.message || "Failed to merge customers. Please try again.";
      toast.error(message);
    }
  };

  const handleBulkEnableConsolidatedBilling = async () => {
    if (selectedCustomers.size === 0) {
      toast.error("Please select at least one customer.");
      return;
    }
    setBulkConsolidatedAction("enable");
  };

  const handleBulkDisableConsolidatedBilling = async () => {
    if (selectedCustomers.size === 0) {
      toast.error("Please select at least one customer.");
      return;
    }
    setBulkConsolidatedAction("disable");
  };

  const confirmBulkConsolidatedBilling = async () => {
    if (!bulkConsolidatedAction) return;
    if (selectedCustomers.size === 0) {
      toast.error("Please select at least one customer.");
      setBulkConsolidatedAction(null);
      return;
    }

    const ids = Array.from(selectedCustomers);
    const count = ids.length;
    const enabled = bulkConsolidatedAction === "enable";

    setIsBulkConsolidatedUpdating(true);
    try {
      await customersAPI.bulkUpdate(ids, {
        consolidatedBilling: enabled,
        enableConsolidatedBilling: enabled,
        isConsolidatedBillingEnabled: enabled,
      });
      await loadCustomers();
      notifyCustomersUpdated({
        action: enabled ? "consolidated-billing-enabled" : "consolidated-billing-disabled",
        customerIds: ids,
      });
      toast.success(`${enabled ? "Enabled" : "Disabled"} consolidated billing for ${count} customer(s).`);
      setSelectedCustomers(new Set());
      setBulkConsolidatedAction(null);
    } catch {
      toast.error(`Failed to ${enabled ? "enable" : "disable"} consolidated billing. Please try again.`);
    } finally {
      setIsBulkConsolidatedUpdating(false);
    }
  };


  const handlePrintStatements = async () => {
    if (selectedCustomers.size === 0) {
      toast.error("Please select at least one customer.");
      return;
    }

    // Show loading state on download button
    setIsDownloading(true);

    const selectedCustomerData = Array.from(selectedCustomers).map(id =>
      customers.find(c => c.id === id)
    ).filter(Boolean);

    const today = new Date();
    const dateStr = today.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

    // Create a hidden container for PDF generation
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.width = '210mm';
    document.body.appendChild(container);

    try {
      const [{ jsPDF }, html2canvasModule] = await Promise.all([
        import("jspdf"),
        import("html2canvas"),
      ]);
      const html2canvas = html2canvasModule.default;
      const pdf = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4',
        compress: true
      });

      for (let i = 0; i < selectedCustomerData.length; i++) {
        const customer = selectedCustomerData[i];
        if (i > 0) pdf.addPage();

        // Render customer statement HTML
        container.innerHTML = `
          <div style="padding: 15mm; background: white; font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1a202c; line-height: 1.6; min-height: 297mm; box-sizing: border-box;">
            <!-- Header section -->
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px;">
              <div>
                <h1 style="margin: 0; font-size: 28px; font-weight: 800; color: #156372; text-transform: uppercase; letter-spacing: -0.5px;">${organizationNameHtml}</h1>
                <div style="margin-top: 8px; font-size: 13px; color: #4a5568;">
                  <p style="margin: 2px 0;">Aland Islands</p>
                  <p style="margin: 2px 0;">asowrs685@gmail.com</p>
                </div>
              </div>
              <div style="text-align: right;">
                <h2 style="margin: 0; font-size: 32px; font-weight: 900; color: #2d3748; text-transform: uppercase; line-height: 1;">Statement</h2>
                <div style="margin-top: 10px; font-size: 14px; font-weight: 600; color: #718096; background: #f7fafc; padding: 6px 12px; border-radius: 6px; display: inline-block;">
                  ${dateStr} – ${dateStr}
                </div>
              </div>
            </div>

            <div style="height: 1px; background: #e2e8f0; margin-bottom: 40px;"></div>

            <!-- Addresses Section -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 50px;">
              <div>
                <h3 style="margin: 0 0 12px 0; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #a0aec0; font-weight: 700;">Statement Of Accounts To</h3>
                <div style="font-size: 16px; font-weight: 700; color: #1a202c;">${customer.name || 'N/A'}</div>
                ${customer.companyName ? `<div style="font-size: 14px; color: #4a5568; margin-top: 4px;">${customer.companyName}</div>` : ''}
                <div style="font-size: 14px; color: #4a5568; margin-top: 2px;">${customer.email || ''}</div>
              </div>
              <div style="background: #f8fafc; padding: 25px; border-radius: 12px; border: 1px solid #edf2f7;">
                <h3 style="margin: 0 0 15px 0; font-size: 13px; text-transform: uppercase; color: #2d3748; font-weight: 700; border-bottom: 2px solid #156372; display: inline-block; padding-bottom: 4px;">Account Summary</h3>
                <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                  <tr>
                    <td style="padding: 8px 0; color: #718096;">Opening Balance</td>
                    <td style="text-align: right; padding: 8px 0; font-weight: 600;">${customer.currency || 'AED'} 0.00</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #718096;">Invoiced Amount</td>
                    <td style="text-align: right; padding: 8px 0; font-weight: 600;">${customer.currency || 'AED'} ${parseFloat(customer.receivables || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #718096;">Amount Received</td>
                    <td style="text-align: right; padding: 8px 0; font-weight: 600; color: #48bb78;">${customer.currency || 'AED'} 0.00</td>
                  </tr>
                  <tr style="border-top: 1px solid #e2e8f0;">
                    <td style="padding: 12px 0 0 0; font-weight: 800; color: #1a202c; font-size: 16px;">Balance Due</td>
                    <td style="text-align: right; padding: 12px 0 0 0; font-weight: 800; color: #156372; font-size: 18px;">${customer.currency || 'AED'} ${parseFloat(customer.receivables || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                  </tr>
                </table>
              </div>
            </div>

            <!-- Transactions Table -->
            <div style="margin-bottom: 60px;">
              <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                <thead>
                  <tr style="background: #156372; color: white;">
                    <th style="padding: 12px 15px; text-align: left; font-weight: 700; border-radius: 8px 0 0 8px;">DATE</th>
                    <th style="padding: 12px 15px; text-align: left; font-weight: 700;">TRANSACTIONS</th>
                    <th style="padding: 12px 15px; text-align: left; font-weight: 700;">DETAILS</th>
                    <th style="padding: 12px 15px; text-align: right; font-weight: 700;">AMOUNT</th>
                    <th style="padding: 12px 15px; text-align: right; font-weight: 700;">PAYMENTS</th>
                    <th style="padding: 12px 15px; text-align: right; font-weight: 700; border-radius: 0 8px 8px 0;">BALANCE</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style="border-bottom: 1px solid #edf2f7;">
                    <td style="padding: 15px;">${dateStr}</td>
                    <td style="padding: 15px; font-weight: 600;">Opening Balance</td>
                    <td style="padding: 15px; color: #718096;">Initial balance</td>
                    <td style="padding: 15px; text-align: right;">0.00</td>
                    <td style="padding: 15px; text-align: right; color: #48bb78;">0.00</td>
                    <td style="padding: 15px; text-align: right; font-weight: 600;">0.00</td>
                  </tr>
                  <tr style="background: #fcfcfc; border-bottom: 1px solid #edf2f7;">
                    <td style="padding: 15px;">${dateStr}</td>
                    <td style="padding: 15px; font-weight: 600; color: #156372;">Invoice</td>
                    <td style="padding: 15px; color: #718096;">Account Balance Adjustment</td>
                    <td style="padding: 15px; text-align: right;">${parseFloat(customer.receivables || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                    <td style="padding: 15px; text-align: right;">0.00</td>
                    <td style="padding: 15px; text-align: right; font-weight: 600;">${parseFloat(customer.receivables || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr style="background: #f8fafc; border-top: 2px solid #156372;">
                    <td colspan="4" style="padding: 20px 15px; text-align: right; font-weight: 800; font-size: 14px; color: #2d3748;">NET BALANCE DUE</td>
                    <td style="padding: 20px 15px; text-align: right;"></td>
                    <td style="padding: 20px 15px; text-align: right; font-weight: 900; font-size: 15px; color: #156372;">${customer.currency || 'AED'} ${parseFloat(customer.receivables || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <!-- Footer -->
            <div style="position: absolute; bottom: 15mm; left: 15mm; right: 15mm; text-align: center; color: #a0aec0; border-top: 1px solid #edf2f7; padding-top: 20px; font-size: 10px;">
              <p style="margin: 0; font-weight: 600;">Generated professionally by ${organizationNameHtml}</p>
              <p style="margin: 4px 0 0 0;">Report Date: ${new Date().toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
            </div>
          </div>
        `;

        const canvas = await html2canvas(container, {
          scale: 3, // High quality
          useCORS: true,
          backgroundColor: '#ffffff'
        });

        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
      }

      pdf.save(`Statements_${today.toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      toast.error("Error generating PDF. Please try again.");
    } finally {
      try {
        document.body.removeChild(container);
      } catch (e) {
        // ignore
      }
      setIsDownloading(false);
    }
  };
  const handleOpenBulkUpdate = () => {
    setBulkUpdateData({
      customerType: "",
      creditLimit: "",
      currency: "",
      taxRate: "",
      paymentTerms: "",
      customerLanguage: "",
      accountsReceivable: "",
      priceListId: "",
      reportingTags: {}
    });
    setIsBulkUpdateModalOpen(true);
  };

  const getSelectedCustomerDbIds = () => {
    const resolved = Array.from(selectedCustomers).map((selectedId) => {
      const matched = customers.find(
        (c: any) => String(c.id) === String(selectedId) || String(c._id) === String(selectedId)
      );
      return matched?.id ? String(matched.id) : String(selectedId);
    });
    return Array.from(new Set(resolved));
  };

  const handleBulkUpdateSubmit = async () => {
    if (selectedCustomers.size === 0) {
      toast.error("Please select at least one customer.");
      return;
    }

    // Check if at least one field has a value
    const hasAtLeastOneField =
      bulkUpdateData.customerType ||
      String(bulkUpdateData.creditLimit || "").trim() ||
      bulkUpdateData.currency ||
      bulkUpdateData.taxRate ||
      bulkUpdateData.paymentTerms ||
      bulkUpdateData.customerLanguage ||
      bulkUpdateData.accountsReceivable ||
      bulkUpdateData.priceListId ||
      Object.values(bulkUpdateData.reportingTags || {}).some((v) => String(v || "").trim() !== "");

    if (!hasAtLeastOneField) {
      toast.error("Please fill in at least one field to update.");
      return;
    }

    try {
      const updateData: Record<string, any> = {};

      // Only include fields that have values
      if (bulkUpdateData.customerType) {
        updateData.customerType = bulkUpdateData.customerType;
      }
      const parsedCreditLimit = parseFloat(String(bulkUpdateData.creditLimit || "").trim());
      if (!Number.isNaN(parsedCreditLimit)) {
        updateData.creditLimit = parsedCreditLimit;
        updateData.credit_limit = parsedCreditLimit;
      }
      if (bulkUpdateData.currency) {
        updateData.currency = bulkUpdateData.currency;
      }
      if (bulkUpdateData.paymentTerms) {
        updateData.paymentTerms = bulkUpdateData.paymentTerms;
      }
      if (bulkUpdateData.customerLanguage) {
        updateData.portalLanguage = bulkUpdateData.customerLanguage;
      }
      if (bulkUpdateData.taxRate) {
        updateData.taxRate = bulkUpdateData.taxRate;
      }
      if (bulkUpdateData.accountsReceivable) {
        updateData.accountsReceivable = bulkUpdateData.accountsReceivable;
      }
      if (bulkUpdateData.priceListId) {
        updateData.priceListId = bulkUpdateData.priceListId;
      }

      const reportingTagEntries = Object.entries(bulkUpdateData.reportingTags || {})
        .map(([tagId, value]) => {
          const matchedTag = availableReportingTags.find((t: any) => String(t?._id || t?.id) === String(tagId));
          return {
            tagId,
            id: tagId,
            name: matchedTag?.name || "",
            value: String(value ?? "")
          };
        })
        .filter((entry) => entry.value !== "");

      if (reportingTagEntries.length > 0) {
        updateData.reportingTags = reportingTagEntries;
      }

      // Keep both naming variants for compatibility with existing customer schemas
      if (bulkUpdateData.customerLanguage) {
        updateData.customerLanguage = bulkUpdateData.customerLanguage;
      }

      const selectedCustomerIds = getSelectedCustomerDbIds();

      // Update each selected customer
      await customersAPI.bulkUpdate(selectedCustomerIds, updateData);

      // Refresh customers list
      await loadCustomers();
      notifyCustomersUpdated({
        action: "bulk-updated",
        customerIds: selectedCustomerIds,
        fields: Object.keys(updateData),
      });
      setIsBulkUpdateModalOpen(false);
      toast.success(`Updated ${selectedCustomers.size} customer(s) successfully.`);
      setSelectedCustomers(new Set());

      // Reset bulk update data
      setBulkUpdateData({
        customerType: "",
        creditLimit: "",
        currency: "",
        taxRate: "",
        paymentTerms: "",
        customerLanguage: "",
        accountsReceivable: "",
        priceListId: "",
        reportingTags: {}
      });
    } catch (error) {
      toast.error("Failed to update customers. Please try again.");
    }
  };

  const decimalFormatOptions = [
    "1234567.89",
    "1,234,567.89",
    "1234567,89",
    "1.234.567,89"
  ];

  const moduleOptions = [
    "Quotes",
    "Invoices",
    "Invoice Payments",
    "Recurring Invoices",
    "Credit Notes",
    "Credit Notes Applied to Invoices",
    "Refunds",
    "Purchase",
    "Expenses",
    "Recurring Expenses",
    "Purchase Orders",
    "Bills",
    "Bill Payments",
    "Recurring Bills",
    "Vendor Credits",
    "Applied Vendor Credits",
    "Vendor Credit Refunds",
    "Timesheet",
    "Projects",
    "Project Tasks",
    "Others",
    "Customers",
    "Vendors",
    "Tasks",
    "Items",
    "Inventory Adjustments",
    "Exchange Rates",
    "Users",
    "Chart of Accounts",
    "Manual Journals",
    "Documents",
    "Export Template"
  ];

  const handleManageCustomFields = () => {
    setIsMoreMenuOpen(false);
    navigate("/settings/customers-vendors");
  };

  const handleExportCurrentView = () => {
    setIsExportCurrentViewModalOpen(true);
    setIsMoreMenuOpen(false);
  };

  const handleTogglePasswordVisibility = () => {
    setExportData(prev => ({ ...prev, showPassword: !prev.showPassword }));
  };

  const handleExportCustomers = async () => {
    try {
      // Get customers data
      const allCustomers = await getCustomers();
      let dataToExport = allCustomers;

      // Apply data scope filter if needed
      if (exportData.dataScope === "Specific Period") {
        // For now, export all customers. In a real app, you'd filter by date range
        // dataToExport = allCustomers.filter(...);
      }

      // Limit to 25,000 rows as per note
      const limitedData = dataToExport.slice(0, 25000);

      // Prepare All Fields Mapping
      const allFields = [
        { label: "Display Name", key: "displayName", getValue: (c: any) => c.displayName || c.name || "" },
        { label: "Company Name", key: "companyName", getValue: (c: any) => c.companyName || "" },
        { label: "Salutation", key: "salutation", getValue: (c: any) => c.salutation || "" },
        { label: "First Name", key: "firstName", getValue: (c: any) => c.firstName || "" },
        { label: "Last Name", key: "lastName", getValue: (c: any) => c.lastName || "" },
        { label: "Email ID", key: "email", getValue: (c: any) => c.email || "" },
        { label: "Work Phone", key: "workPhone", getValue: (c: any) => c.workPhone || "" },
        { label: "Mobile", key: "mobile", getValue: (c: any) => c.mobile || c.mobilePhone || "" },
        { label: "Payment Terms", key: "paymentTerms", getValue: (c: any) => c.paymentTerms || "" },
        { label: "Currency", key: "currency", getValue: (c: any) => c.currency || "" },
        { label: "Notes", key: "notes", getValue: (c: any) => c.notes || c.remarks || "" },
        { label: "Website", key: "website", getValue: (c: any) => c.websiteUrl || c.website || "" },
        { label: "Billing Attention", key: "billingAttention", getValue: (c: any) => c.billingAddress?.attention || "" },
        { label: "Billing Street", key: "billingStreet", getValue: (c: any) => c.billingAddress?.street1 || "" },
        { label: "Billing Street 2", key: "billingStreet2", getValue: (c: any) => c.billingAddress?.street2 || "" },
        { label: "Billing City", key: "billingCity", getValue: (c: any) => c.billingAddress?.city || "" },
        { label: "Billing State", key: "billingState", getValue: (c: any) => c.billingAddress?.state || "" },
        { label: "Billing Zip Code", key: "billingZipCode", getValue: (c: any) => c.billingAddress?.zipCode || "" },
        { label: "Billing Country", key: "billingCountry", getValue: (c: any) => c.billingAddress?.country || "" },
        { label: "Billing Fax", key: "billingFax", getValue: (c: any) => c.billingAddress?.fax || "" },
        { label: "Shipping Attention", key: "shippingAttention", getValue: (c: any) => c.shippingAddress?.attention || "" },
        { label: "Shipping Street", key: "shippingStreet", getValue: (c: any) => c.shippingAddress?.street1 || "" },
        { label: "Shipping Street 2", key: "shippingStreet2", getValue: (c: any) => c.shippingAddress?.street2 || "" },
        { label: "Shipping City", key: "shippingCity", getValue: (c: any) => c.shippingAddress?.city || "" },
        { label: "Shipping State", key: "shippingState", getValue: (c: any) => c.shippingAddress?.state || "" },
        { label: "Shipping Zip Code", key: "shippingZipCode", getValue: (c: any) => c.shippingAddress?.zipCode || "" },
        { label: "Shipping Country", key: "shippingCountry", getValue: (c: any) => c.shippingAddress?.country || "" },
        { label: "Shipping Fax", key: "shippingFax", getValue: (c: any) => c.shippingAddress?.fax || "" },
        { label: "Customer Type", key: "customerType", getValue: (c: any) => c.customerType || "" },
        { label: "Opening Balance", key: "openingBalance", getValue: (c: any) => formatNumberForExport(c.openingBalance || c.receivables || 0, exportData.decimalFormat) },
        { label: "Status", key: "status", getValue: (c: any) => (c.status || "active").toLowerCase() },
      ];

      // Convert data to CSV/Format
      const headers = allFields.map(f => f.label);
      const csvRows = [headers.join(",")];

      limitedData.forEach(customer => {
        const rowData = allFields.map(field => {
          const val = field.getValue(customer);
          const stringVal = (val === null || val === undefined) ? "" : String(val);
          return `"${stringVal.replace(/"/g, '""')}"`;
        });
        csvRows.push(rowData.join(","));
      });

      downloadExportFile(csvRows.join("\n"), `All_Customers`);

      setIsExportCustomersModalOpen(false);
      toast.success(`Export completed successfully! ${limitedData.length} records exported.`);
    } catch (error) {
      toast.error("Failed to export data. Please try again.");
    }
  };

  const handleExportSubmit = () => {
    // This is for Export Current View
    try {
      // Get currently displayed customers
      const dataToExport = displayedCustomers.slice(0, 10000); // Current view limit is usually smaller or just displayed

      // Get visible columns
      const cols = visibleColumns;
      const headers = cols.map(c => c.label);
      const csvRows = [headers.join(",")];

      dataToExport.forEach(customer => {
        const rowData = cols.map(col => {
          let val = getCustomerFieldValue(customer, col.key);

          // Special formatting for numbers in current view
          if (col.key === 'receivables' || col.key === 'unusedCredits') {
            val = formatNumberForExport(val, exportData.decimalFormat);
          }

          const stringVal = (val === null || val === undefined) ? "" : String(val);
          return `"${stringVal.replace(/"/g, '""')}"`;
        });
        csvRows.push(rowData.join(","));
      });

      downloadExportFile(csvRows.join("\n"), `Customers_Current_View`);

      setIsExportCurrentViewModalOpen(false);
      toast.success(`Export completed successfully! ${dataToExport.length} records exported.`);
      setExportData(prev => ({
        ...prev,
        decimalFormat: "1234567.89",
        fileFormat: "csv",
        password: "",
        showPassword: false
      }));
    } catch (error) {
      toast.error("Failed to export current view. Please try again.");
    }
  };

  const downloadExportFile = (content, defaultFileName) => {
    // Determine file extension and MIME type
    let fileExtension = "csv";
    let mimeType = "text/csv";

    if (exportData.fileFormat === "xls") {
      fileExtension = "xls";
      mimeType = "application/vnd.ms-excel";
    } else if (exportData.fileFormat === "xlsx") {
      fileExtension = "xlsx";
      mimeType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    }

    // Create blob and download
    const blob = new Blob([content], { type: mimeType });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;

    // Generate filename based on module and date
    const dateStr = new Date().toISOString().split('T')[0];
    const moduleName = (exportData.module || defaultFileName).replace(/\s+/g, "_");
    link.download = `${moduleName}_${dateStr}.${fileExtension}`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const formatNumberForExport = (number, format) => {
    const num = parseFloat(number) || 0;

    switch (format) {
      case "1,234,567.89":
        return num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      case "1234567,89":
        return num.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      case "1.234.567,89":
        return num.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      case "1234567.89":
      default:
        return num.toFixed(2);
    }
  };

  return {
    accountsReceivableDropdownRef,
    accountsReceivableOptions,
    activePreferencesTab,
    accountDropdownRef,
    adjustmentTypeDropdownRef,
    availableReportingTags,
    bulkConsolidatedAction,
    bulkMoreMenuRef,
    bulkUpdateData,
    closeBulkUpdateDropdowns,
    columnSearch,
    columns,
    confirmBulkConsolidatedBilling,
    confirmBulkDelete,
    confirmDeleteCustomer,
    customFields,
    customViews,
    customerLanguageDropdownRef,
    customerLanguageSearch,
    customerNameDropdownRef,
    customerTypeDropdownRef,
    customers,
    currencyDropdownRef,
    currencyOptions,
    currencySearch,
    decimalFormatDropdownRef,
    decimalFormatOptions,
    defaultCustomerViews,
    deleteCustomerId,
    deleteCustomerIds,
    displayedCustomers,
    dropdownMergeTargets,
    dropdownRef,
    exportData,
    filterDropdownRef,
    filteredCurrencies,
    filteredCustomerLanguages,
    formatCurrency,
    getCustomerFieldValue,
    getCustomerIdForNavigation,
    getSearchFilterOptions,
    handleBulkDelete,
    handleBulkDisableConsolidatedBilling,
    handleBulkEnableConsolidatedBilling,
    handleBulkMarkActive,
    handleBulkMarkInactive,
    handleBulkMerge,
    handleBulkUpdateSubmit,
    handleCancelLayout,
    handleClearSelection,
    handleDeleteCustomView,
    handleExportCurrentView,
    handleExportCustomers,
    handleExportSubmit,
    handleManageCustomFields,
    handleMergeContinue,
    handleOpenBulkUpdate,
    handlePrintStatements,
    handleReorder,
    handleSaveLayout,
    handleSelectAll,
    handleSelectCustomer,
    handleSort,
    handleToggleColumn,
    handleTogglePasswordVisibility,
    handleViewSelect,
    hasResized,
    hoveredRowId,
    importType,
    isAccountDropdownOpen,
    isAccountsReceivableDropdownOpen,
    isAdjustmentTypeDropdownOpen,
    isBulkConsolidatedUpdating,
    isBulkDeleteModalOpen,
    isBulkDeletingCustomers,
    isBulkMoreMenuOpen,
    isBulkUpdateModalOpen,
    isCurrencyDropdownOpen,
    isCustomizeModalOpen,
    isCustomerLanguageDropdownOpen,
    isCustomerNameDropdownOpen,
    isCustomerTypeDropdownOpen,
    isDecimalFormatDropdownOpen,
    isDeleteModalOpen,
    isDeletingCustomer,
    isDownloading,
    isDropdownOpen,
    isExportCurrentViewModalOpen,
    isExportCustomersModalOpen,
    isFieldCustomizationOpen,
    isFilterDropdownOpen,
    isImportContinueLoading,
    isImportModalOpen,
    isItemNameDropdownOpen,
    isMergeCustomerDropdownOpen,
    isMergeModalOpen,
    isModuleDropdownOpen,
    isMoreMenuOpen,
    isPaymentMethodDropdownOpen,
    isPreferencesOpen,
    isProjectNameDropdownOpen,
    isSalesAccountDropdownOpen,
    isSalespersonDropdownOpen,
    isSearchModalOpen,
    isSearchTypeDropdownOpen,
    isStatusDropdownOpen,
    isTaxExemptionsDropdownOpen,
    isTaxRateDropdownOpen,
    isTransactionTypeDropdownOpen,
    itemNameDropdownRef,
    mergeCustomerDropdownRef,
    mergeCustomerSearch,
    mergeTargetCustomer,
    modalRef,
    moduleDropdownRef,
    moduleOptions,
    moreMenuRef,
    navigate,
    openReceivablesDropdownId,
    openSearchModalForCurrentContext,
    paymentMethodDropdownRef,
    paymentTermsHook,
    preferences,
    priceLists,
    projectNameDropdownRef,
    purchaseAccountDropdownRef,
    receivablesDropdownPosition,
    receivablesDropdownRef,
    resetSearchModalData,
    salesAccountDropdownRef,
    salespersonDropdownRef,
    searchModalData,
    searchModalFilter,
    searchType,
    searchTypeDropdownRef,
    searchTypeOptions,
    selectedCustomers,
    selectedView,
    setActivePreferencesTab,
    setBulkConsolidatedAction,
    setBulkUpdateData,
    setColumnSearch,
    setCurrencySearch,
    setCustomerLanguageSearch,
    setDeleteCustomerId,
    setDeleteCustomerIds,
    setExportData,
    setHoveredRowId,
    setImportType,
    setIsAccountDropdownOpen,
    setIsAccountsReceivableDropdownOpen,
    setIsAdjustmentTypeDropdownOpen,
    setIsBulkDeleteModalOpen,
    setIsBulkMoreMenuOpen,
    setIsBulkUpdateModalOpen,
    setIsCurrencyDropdownOpen,
    setIsCustomizeModalOpen,
    setIsCustomerLanguageDropdownOpen,
    setIsCustomerNameDropdownOpen,
    setIsCustomerTypeDropdownOpen,
    setIsDecimalFormatDropdownOpen,
    setIsDeleteModalOpen,
    setIsDropdownOpen,
    setIsExportCurrentViewModalOpen,
    setIsExportCustomersModalOpen,
    setIsFieldCustomizationOpen,
    setIsFilterDropdownOpen,
    setIsImportContinueLoading,
    setIsImportModalOpen,
    setIsItemNameDropdownOpen,
    setIsMergeCustomerDropdownOpen,
    setIsMergeModalOpen,
    setIsModuleDropdownOpen,
    setIsMoreMenuOpen,
    setIsPaymentMethodDropdownOpen,
    setIsPreferencesOpen,
    setIsProjectNameDropdownOpen,
    setIsPurchaseAccountDropdownOpen,
    setIsSalesAccountDropdownOpen,
    setIsSalespersonDropdownOpen,
    setIsSearchModalOpen,
    setIsSearchTypeDropdownOpen,
    setIsStatusDropdownOpen,
    setIsTaxExemptionsDropdownOpen,
    setIsTaxRateDropdownOpen,
    setIsTransactionTypeDropdownOpen,
    setMergeCustomerSearch,
    setMergeTargetCustomer,
    setOpenReceivablesDropdownId,
    setPreferences,
    setReceivablesDropdownPosition,
    setSearchModalData,
    setSearchModalFilter,
    setSearchType,
    setViewSearchQuery,
    showCustomerSkeletons,
    sortConfig,
    startResizing,
    statusDropdownRef,
    tableMinWidth,
    taxExemptionsDropdownRef,
    taxRateDropdownRef,
    taxRateOptions,
    transactionTypeDropdownRef,
    viewSearchQuery,
    tableVisibleColumns,
    visibleColumns,
  };
}

