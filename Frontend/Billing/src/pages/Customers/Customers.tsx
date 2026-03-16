import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { getCustomViews, getCustomersPaginated, getCustomers } from "../salesModel";
import { customersAPI, taxesAPI, reportingTagsAPI, currenciesAPI } from "../../services/api";
import FieldCustomization from "../shared/FieldCustomization";
import { usePaymentTermsDropdown } from "../../../hooks/usePaymentTermsDropdown";
import { toast } from "react-toastify";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { ChevronDown, ChevronUp, Plus, MoreVertical, Search, ArrowUpDown, Filter, Star, X, Trash2, Download, Upload, Settings, RefreshCw, ChevronRight, ChevronLeft, GripVertical, Lock, Users, FileText, Check, Eye, EyeOff, Info, Layers, Edit, ClipboardList, SlidersHorizontal, Layout, AlignLeft, RotateCcw, Pin, PinOff, Loader2, AlertTriangle } from "lucide-react";
import SearchableDropdown from "../../components/ui/SearchableDropdown";

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


export default function Customers() {
  const navigate = useNavigate();
  const location = useLocation();
  const LOCAL_CUSTOMERS_CACHE_KEY = "taban_customers_cache";
  const LOCAL_COLUMNS_LAYOUT_KEY = "taban_customers_columns";
  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedCustomers, setSelectedCustomers] = useState(new Set<string>());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
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
    const cachedWithCurrentColumns = customers.map(mapCustomerForList).filter(Boolean);
    localStorage.setItem(LOCAL_CUSTOMERS_CACHE_KEY, JSON.stringify(cachedWithCurrentColumns));
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
  const tableMinWidth = useMemo(
    () => visibleColumns.reduce((total, col) => total + col.width, 0) + 112,
    [visibleColumns]
  );

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

  const normalizeReportingTagOptions = (tag: any): string[] => {
    const candidates = Array.isArray(tag?.options)
      ? tag.options
      : Array.isArray(tag?.values)
        ? tag.values
        : [];

    return candidates
      .map((option: any) => {
        if (typeof option === "string") return option.trim();
        if (option && typeof option === "object") {
          return String(
            option.value ??
            option.label ??
            option.name ??
            option.option ??
            option.title ??
            ""
          ).trim();
        }
        return "";
      })
      .filter((value: string) => Boolean(value));
  };

  const normalizeReportingTagAppliesTo = (tag: any): string[] => {
    const direct = Array.isArray(tag?.appliesTo) ? tag.appliesTo : [];
    const fromModulesObject = tag?.modules && typeof tag.modules === "object"
      ? Object.keys(tag.modules).filter((key) => Boolean(tag.modules[key]))
      : [];
    const fromModuleSettings = tag?.moduleSettings && typeof tag.moduleSettings === "object"
      ? Object.keys(tag.moduleSettings).filter((key) => Boolean(tag.moduleSettings[key]))
      : [];
    const fromAssociations = Array.isArray(tag?.associations) ? tag.associations : [];
    const fromModulesList = Array.isArray(tag?.modulesList) ? tag.modulesList : [];

    return [...direct, ...fromModulesObject, ...fromModuleSettings, ...fromAssociations, ...fromModulesList]
      .map((value: any) => String(value || "").toLowerCase().trim())
      .filter(Boolean);
  };

  const loadReportingTags = useCallback(async () => {
    try {
      const response = await reportingTagsAPI.getAll();
      const rows = Array.isArray(response) ? response : (response?.data || []);
      if (!Array.isArray(rows)) {
        setAvailableReportingTags([]);
        return;
      }

      const filtered = rows
        .filter((tag: any) => {
          const appliesTo = normalizeReportingTagAppliesTo(tag);
          const hasCustomersAssociation = appliesTo.some((entry) => entry.includes("customer"));
          return hasCustomersAssociation;
        })
        .map((tag: any) => ({
          ...tag,
          options: normalizeReportingTagOptions(tag),
        }));

      const tagsToUse = filtered.length > 0
        ? filtered
        : rows.map((tag: any) => ({
          ...tag,
          options: normalizeReportingTagOptions(tag),
        }));

      setAvailableReportingTags(tagsToUse);
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
  const [isAssociateTemplatesModalOpen, setIsAssociateTemplatesModalOpen] = useState(false);
  const [templateData, setTemplateData] = useState({
    pdfTemplates: {
      customerStatement: "Standard Template",
      quotes: "Standard Template",
      invoices: "Standard Template",
      creditNotes: "Standard Template",
      paymentThankYou: "Elite Template"
    },
    emailNotifications: {
      quotes: "Default",
      invoices: "Default",
      creditNotes: "Default",
      paymentThankYou: "Default"
    },
    pdfAndEmailBothGo: false
  });
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

  const mapCustomerForList = (customer: any) => {
    const customerId = customer?.id ? String(customer.id) : (customer?._id ? String(customer._id) : "");
    if (!customerId) return null;

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
      status: pickFirstValue(customer.status, "Active"),
      website: pickFirstValue(customer.website, customer.webSite),
      receivables: Number(customer.receivables ?? customer.accountsReceivable ?? 0),
      unusedCredits: Number(customer.unusedCredits ?? customer.unused_credits ?? 0),
      currency: pickFirstValue(customer.currency, customer.currencyCode, "KES")
    };
  };

  const getCachedCustomers = () => {
    try {
      const raw = localStorage.getItem(LOCAL_CUSTOMERS_CACHE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.map(mapCustomerForList).filter(Boolean);
    } catch {
      return [];
    }
  };

  // Load customers from API when component mounts or when navigating back
  useEffect(() => {
    loadCustomers();
    const refreshCustomViews = () => {
      setCustomViews(getCustomViews());
    };
    refreshCustomViews();

    // Also refresh when the page becomes visible (user navigates back)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        loadCustomers();
        refreshCustomViews();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Listen for customer updates from other components
    const handleCustomersUpdated = (event) => {
      // Force immediate refresh
      loadCustomers();
      // Also refresh after a short delay to ensure backend has processed
      setTimeout(() => {
        loadCustomers();
      }, 800);
    };

    // Listen for the custom event
    window.addEventListener("customersUpdated", handleCustomersUpdated);

    // Listen for focus events (when user returns to tab)
    const handleFocus = () => {
      loadCustomers();
    };

    window.addEventListener('focus', handleFocus);

    // Cleanup event listener
    return () => {
      window.removeEventListener("customersUpdated", handleCustomersUpdated);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [location.pathname]); // Refresh when pathname changes (navigating back from new customer page)

  // Also refresh when component becomes visible or pathname changes
  useEffect(() => {
    if (location.pathname === '/sales/customers') {
      loadCustomers();
    }
  }, [location.pathname]);

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

    if (isDropdownOpen || isMoreMenuOpen || isDecimalFormatDropdownOpen || isModuleDropdownOpen || Object.keys(isFieldDropdownOpen).length > 0 || Object.keys(isComparatorDropdownOpen).length > 0 || isMergeCustomerDropdownOpen || isMoreOptionsDropdownOpen || isSearchTypeDropdownOpen || isFilterDropdownOpen || isStatusDropdownOpen || isCustomerTypeDropdownOpen || openReceivablesDropdownId !== null || isSearchHeaderDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isDropdownOpen, isMoreMenuOpen, isDecimalFormatDropdownOpen, isModuleDropdownOpen, isFieldDropdownOpen, isComparatorDropdownOpen, openReceivablesDropdownId, isSearchHeaderDropdownOpen]);

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
    options: { rowRefreshOnly?: boolean } = {}
  ) => {
    const { rowRefreshOnly = false } = options;
    try {
      if (!rowRefreshOnly) {
        setIsLoading(true);
      }
      setIsRefreshing(true);

      if (customers.length === 0) {
        const cachedCustomers = getCachedCustomers();
        if (cachedCustomers.length > 0) {
          setCustomers(cachedCustomers as any);
        }
      }

      const response = await getCustomersPaginated({
        page,
        limit,
        search: viewSearchQuery
      });

      const customersArray = response.data || [];
      setTotalItems(response.total || 0);
      setTotalPages(response.totalPages || 0);

      const mappedCustomers = customersArray.map(mapCustomerForList).filter(Boolean);

      setCustomers(mappedCustomers);
      localStorage.setItem(LOCAL_CUSTOMERS_CACHE_KEY, JSON.stringify(mappedCustomers));
    } catch (error) {

      if (error.status === 401 || error.message?.includes('authorized') || error.message?.includes('Unauthorized')) {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user');
        localStorage.removeItem('organization');
        window.location.href = '/login';
        return;
      }

      toast.error("Error loading customers: " + (error?.message || "Unknown error."));
      const cachedCustomers = getCachedCustomers();
      setCustomers(cachedCustomers.length > 0 ? (cachedCustomers as any) : []);
    } finally {
      if (!rowRefreshOnly) {
        setIsLoading(false);
      }
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, [currentPage, itemsPerPage, selectedView]);

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

  const handleBulkMarkActive = async () => {
    if (selectedCustomers.size === 0) {
      toast.error("Please select at least one customer.");
      return;
    }

    try {
      await customersAPI.bulkUpdate(Array.from(selectedCustomers), { status: "active" });
      await loadCustomers();
      toast.success(`Marked ${selectedCustomers.size} customer(s) as active`);
      setSelectedCustomers(new Set());
    } catch (error) {
      toast.error("Failed to mark customers as active. Please try again.");
    }
  };

  const handleBulkMarkInactive = async () => {
    if (selectedCustomers.size === 0) {
      toast.error("Please select at least one customer.");
      return;
    }

    try {
      await customersAPI.bulkUpdate(Array.from(selectedCustomers), { status: "inactive" });
      await loadCustomers();
      toast.success(`Marked ${selectedCustomers.size} customer(s) as inactive`);
      setSelectedCustomers(new Set());
    } catch (error) {
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

  const handleBulkAssociateTemplates = async () => {
    if (selectedCustomers.size === 0) {
      toast.error("Please select at least one customer.");
      return;
    }

    setIsAssociateTemplatesModalOpen(true);
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
      toast.success(`${enabled ? "Enabled" : "Disabled"} consolidated billing for ${count} customer(s).`);
      setSelectedCustomers(new Set());
      setBulkConsolidatedAction(null);
    } catch {
      toast.error(`Failed to ${enabled ? "enable" : "disable"} consolidated billing. Please try again.`);
    } finally {
      setIsBulkConsolidatedUpdating(false);
    }
  };

  const handleSaveTemplates = async () => {
    // Save template associations for selected customers
    try {
      await customersAPI.bulkUpdate(Array.from(selectedCustomers), {
        pdfTemplates: templateData.pdfTemplates,
        emailTemplates: templateData.emailNotifications,
        pdfAndEmailBothGo: templateData.pdfAndEmailBothGo
      });
      await loadCustomers();
      toast.success(`Template associations saved for ${selectedCustomers.size} customer(s).${templateData.pdfAndEmailBothGo ? ' PDF and Email both go option enabled.' : ''}`);
      setIsAssociateTemplatesModalOpen(false);
      setSelectedCustomers(new Set());
    } catch (error) {
      toast.error("Failed to save template associations. Please try again.");
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
                <h1 style="margin: 0; font-size: 28px; font-weight: 800; color: #156372; text-transform: uppercase; letter-spacing: -0.5px;">TABAN BOOKS</h1>
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
              <p style="margin: 0; font-weight: 600;">Generated professionally by TABAN BOOKS Management System</p>
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

  return (
    <div className="flex flex-col h-[calc(100vh-72px)] w-full bg-white font-sans text-gray-800 antialiased relative overflow-hidden">
      {/* Header - Show Bulk Actions Bar when items are selected, otherwise show normal header */}
      {selectedCustomers.size > 0 ? (
        <div className="flex-none flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-white z-30">
          <div className="flex items-center gap-2">
            <button
              className="flex items-center gap-1.5 py-1.5 px-4 bg-white border border-gray-200 rounded-md text-sm font-medium text-gray-700 cursor-pointer transition-all hover:bg-gray-50"
              onClick={handleOpenBulkUpdate}
            >
              Bulk Update
            </button>

            <button
              className={`h-[34px] w-[34px] flex items-center justify-center bg-white border border-gray-200 rounded-md transition-all hover:bg-gray-50 ${isDownloading ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
              onClick={handlePrintStatements}
              title="Download PDF"
              aria-label="Download PDF"
              disabled={isDownloading}
            >
              {isDownloading ? (
                <Loader2 size={16} className="text-gray-600 animate-spin" />
              ) : (
                <FileText size={16} className="text-gray-600" />
              )}
            </button>

            <div className="mx-2 h-6 w-px bg-gray-200" aria-hidden />

            <button
              className="flex items-center gap-1.5 py-1.5 px-4 bg-white border border-gray-200 rounded-md text-sm font-medium text-gray-700 cursor-pointer transition-all hover:bg-gray-50"
              onClick={handleBulkMarkActive}
            >
              Mark as Active
            </button>
            <button
              className="flex items-center gap-1.5 py-1.5 px-4 bg-white border border-gray-200 rounded-md text-sm font-medium text-gray-700 cursor-pointer transition-all hover:bg-gray-50"
              onClick={handleBulkMarkInactive}
            >
              Mark as Inactive
            </button>
            <button
              className="flex items-center gap-1.5 py-1.5 px-4 bg-white border border-gray-200 rounded-md text-sm font-medium text-gray-700 cursor-pointer transition-all hover:bg-gray-50"
              onClick={handleBulkMerge}
            >
              Merge
            </button>
            <button
              className="flex items-center gap-1.5 py-1.5 px-4 bg-white border border-gray-200 rounded-md text-sm font-medium text-gray-700 cursor-pointer transition-all hover:bg-gray-50"
              onClick={() => toast.info("Associate Templates is not set up yet.")}
            >
              Associate Templates
            </button>

            <div className="relative" ref={bulkMoreMenuRef}>
              <button
                className="h-[34px] w-[34px] flex items-center justify-center bg-white border border-gray-200 rounded-md cursor-pointer transition-all hover:bg-gray-50"
                onClick={() => setIsBulkMoreMenuOpen(!isBulkMoreMenuOpen)}
                aria-label="More"
                title="More"
              >
                <MoreVertical size={16} className="text-gray-600" />
              </button>

              {isBulkMoreMenuOpen && (
                <div className="absolute top-full left-0 mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-xl z-[110] py-2">
                  <button
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => {
                      setIsBulkMoreMenuOpen(false);
                      handleBulkEnableConsolidatedBilling();
                    }}
                  >
                    Enable Consolidated Billing
                  </button>
                  <button
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => {
                      setIsBulkMoreMenuOpen(false);
                      handleBulkDisableConsolidatedBilling();
                    }}
                  >
                    Disable Consolidated Billing
                  </button>
                  <div className="my-2 h-px bg-gray-200" />
                  <button
                    className="w-full text-left px-4 py-2 text-sm text-red-600 cursor-pointer hover:bg-red-50 transition-colors"
                    onClick={() => {
                      setIsBulkMoreMenuOpen(false);
                      handleBulkDelete();
                    }}
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center min-w-[24px] h-6 px-2 bg-[#156372] rounded text-[13px] font-semibold text-white">{selectedCustomers.size}</span>
              <span className="text-sm text-gray-700">Selected</span>
            </div>
            <span className="text-xs text-gray-400">Esc</span>
            <button
              onClick={handleClearSelection}
              className="text-red-500 hover:text-red-600"
              aria-label="Clear selection"
              title="Clear selection"
            >
              <X size={20} />
            </button>
          </div>
        </div>
      ) : (
        /* Normal Page Header */
        <div className="flex-none flex items-center justify-between px-6 py-6 border-b border-gray-100 bg-white z-30">
          <div className="flex items-center gap-6 pl-4">
            {/* Title with Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center gap-1.5 py-4 cursor-pointer group border-b-2 border-slate-900 -mb-[px]"
              >
                <h1 className="text-[15px] font-bold text-slate-900 transition-colors">
                  {selectedView}
                </h1>
                <ChevronDown
                  size={14}
                  className={`transition-transform duration-200 ${isDropdownOpen ? "rotate-180" : ""}`}
                  style={{ color: "#1b5e6a" }}
                />
              </button>

              {isDropdownOpen && (
                <div className="absolute top-full left-0 mt-2 bg-white border-2 border-gray-200 rounded-xl shadow-xl z-50 min-w-[300px] flex flex-col max-h-[500px] overflow-hidden">
                  {/* Search Bar */}
                  <div className="flex items-center gap-2 p-3 border-b border-gray-200 bg-gray-50">
                    <Search size={16} className="text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search views..."
                      value={viewSearchQuery}
                      onChange={(e) => setViewSearchQuery(e.target.value)}
                      className="flex-1 text-sm bg-transparent focus:outline-none"
                    />
                  </div>

                  {/* View Options Scroll Area */}
                  <div className="flex-1 overflow-y-auto custom-scrollbar pt-2">
                    {/* System Views */}
                    <div className="px-3 pb-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-white">
                      System Views
                    </div>
                    {defaultCustomerViews
                      .filter(view => view.toLowerCase().includes(viewSearchQuery.toLowerCase()))
                      .map((view) => (
                        <div
                          key={view}
                          onClick={() => handleViewSelect(view)}
                          className={`group flex items-center justify-between px-4 py-2.5 text-sm cursor-pointer transition-all ${selectedView === view ? "bg-[#15637210] text-[#156372] font-bold" : "text-gray-900 hover:bg-gray-50"
                            }`}
                        >
                          <div className="flex items-center gap-3">
                            <Eye size={16} className={selectedView === view ? "text-[#156372]" : "text-gray-400 opacity-40"} />
                            <span>{view}</span>
                          </div>
                          {selectedView === view && <Check size={14} className="text-[#156372]" />}
                        </div>
                      ))}

                    {/* Custom Views */}
                    {customViews
                      .filter(view => view.name.toLowerCase().includes(viewSearchQuery.toLowerCase()))
                      .length > 0 && (
                        <div className="mt-4">
                          <div className="px-3 pb-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-white">
                            Custom Views
                          </div>
                          {customViews
                            .filter(view => view.name.toLowerCase().includes(viewSearchQuery.toLowerCase()))
                            .map((view) => (
                              <div
                                key={view.id}
                                className={`group flex items-center justify-between px-4 py-2.5 text-sm cursor-pointer transition-all ${selectedView === view.name ? "bg-[#15637210] text-[#156372] font-bold" : "text-gray-900 hover:bg-gray-50"
                                  }`}
                                onClick={() => handleViewSelect(view.name)}
                              >
                                <div className="flex items-center gap-3">
                                  <Star
                                    size={14}
                                    className={view.isFavorite ? "text-yellow-400 fill-yellow-400" : "text-gray-300"}
                                  />
                                  <span className="truncate max-w-[160px]">{view.name}</span>
                                </div>
                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button
                                    onClick={(e) => handleDeleteCustomView(view.id, e)}
                                    className="p-1.5 hover:bg-red-50 text-gray-300 hover:text-red-500 rounded"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                  {selectedView === view.name && <Check size={14} className="text-[#156372]" />}
                                </div>
                              </div>
                            ))}
                        </div>
                      )}
                  </div>

                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 sm:gap-2 mr-4">
            <button
              className="h-[38px] min-w-[100px] cursor-pointer transition-all text-white px-5 rounded-lg border-[#0D4A52] border-b-[4px] hover:brightness-110 hover:-translate-y-[1px] hover:border-b-[6px] active:border-b-[2px] active:translate-y-[1px] text-sm font-semibold shadow-sm flex items-center justify-center gap-2"
              style={{ background: "linear-gradient(180deg, #156372 0%, #0D4A52 100%)" }}
              onClick={() => navigate("/sales/customers/new")}
            >
              <Plus size={16} /> <span className="hidden sm:inline">New</span>
            </button>


            <div className="relative" ref={moreMenuRef}>
              <button
                className="h-[38px] flex items-center justify-center p-2 bg-white border border-gray-300 border-b-[4px] rounded-lg hover:bg-gray-50 transition-all hover:-translate-y-[1px] hover:border-b-[6px] active:border-b-[2px] active:translate-y-[1px] shadow-sm"
                onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
              >
                <MoreVertical size={18} className="text-gray-500" />
              </button>


              {isMoreMenuOpen && (
                <div className="absolute top-full right-0 mt-2 w-60 bg-white border border-gray-100 rounded-lg shadow-xl z-[110] py-2 animate-in fade-in slide-in-from-top-1 duration-200">
                  <div className="relative flex items-center gap-3 py-2.5 px-4 cursor-pointer transition-all text-sm text-gray-700 group hover:bg-[#156372] hover:text-white">
                    <ArrowUpDown size={16} className="text-[#156372] flex-shrink-0 group-hover:text-white" />
                    <span className="flex-1">Sort by</span>
                    <ChevronRight size={16} className="text-gray-400 flex-shrink-0 group-hover:text-white" />

                    {/* Sort by Submenu - shown via CSS hover */}
                    <div className="absolute top-0 right-full mr-1.5 w-[180px] bg-white border border-gray-200 rounded-lg shadow-lg py-2 z-[99999] pointer-events-none opacity-0 translate-x-2.5 transition-all group-hover:pointer-events-auto group-hover:opacity-100 group-hover:translate-x-0">
                      <div
                        className={`flex items-center justify-between py-2.5 px-3.5 mx-2 text-sm text-gray-700 cursor-pointer transition-all bg-white rounded-md ${sortConfig.key === "name" ? "!bg-[#156372] !text-white" : "hover:bg-gray-100"}`}
                        onClick={() => {
                          handleSort("name");
                          setIsMoreMenuOpen(false);
                        }}
                      >
                        Name
                        {sortConfig.key === "name" && (
                          sortConfig.direction === "asc" ?
                            <ChevronUp size={14} className="text-white" /> :
                            <ChevronDown size={14} className="text-white" />
                        )}
                      </div>
                      <div
                        className={`flex items-center justify-between py-2.5 px-3.5 mx-2 text-sm text-gray-700 cursor-pointer transition-all bg-white rounded-md ${sortConfig.key === "customerNumber" ? "!bg-[#156372] !text-white" : "hover:bg-gray-100"}`}
                        onClick={() => {
                          handleSort("customerNumber");
                          setIsMoreMenuOpen(false);
                        }}
                      >
                        Customer Number
                        {sortConfig.key === "customerNumber" && (
                          sortConfig.direction === "asc" ?
                            <ChevronUp size={14} className="text-white" /> :
                            <ChevronDown size={14} className="text-white" />
                        )}
                      </div>
                      <div
                        className={`flex items-center justify-between py-2.5 px-3.5 mx-2 text-sm text-gray-700 cursor-pointer transition-all bg-white rounded-md ${sortConfig.key === "companyName" ? "!bg-[#156372] !text-white" : "hover:bg-gray-100"}`}
                        onClick={() => {
                          handleSort("companyName");
                          setIsMoreMenuOpen(false);
                        }}
                      >
                        Company Name
                        {sortConfig.key === "companyName" && (
                          sortConfig.direction === "asc" ?
                            <ChevronUp size={14} className="text-white" /> :
                            <ChevronDown size={14} className="text-white" />
                        )}
                      </div>
                      <div
                        className={`flex items-center justify-between py-2.5 px-3.5 mx-2 text-sm text-gray-700 cursor-pointer transition-all bg-white rounded-md ${sortConfig.key === "receivables" ? "!bg-[#156372] !text-white" : "hover:bg-gray-100"}`}
                        onClick={() => {
                          handleSort("receivables");
                          setIsMoreMenuOpen(false);
                        }}
                      >
                        Receivables (BCY)
                        {sortConfig.key === "receivables" && (
                          sortConfig.direction === "asc" ?
                            <ChevronUp size={14} className="text-white" /> :
                            <ChevronDown size={14} className="text-white" />
                        )}
                      </div>
                      <div
                        className={`flex items-center justify-between py-2.5 px-3.5 mx-2 text-sm text-gray-700 cursor-pointer transition-all bg-white rounded-md ${sortConfig.key === "createdTime" ? "!bg-[#156372] !text-white" : "hover:bg-gray-100"}`}
                        onClick={() => {
                          handleSort("createdTime");
                          setIsMoreMenuOpen(false);
                        }}
                      >
                        Created Time
                        {sortConfig.key === "createdTime" && (
                          sortConfig.direction === "asc" ?
                            <ChevronUp size={14} className="text-white" /> :
                            <ChevronDown size={14} className="text-white" />
                        )}
                      </div>
                      <div
                        className={`flex items-center justify-between py-2.5 px-3.5 mx-2 text-sm text-gray-700 cursor-pointer transition-all bg-white rounded-md ${sortConfig.key === "lastModifiedTime" ? "!bg-[#156372] !text-white" : "hover:bg-gray-100"}`}
                        onClick={() => {
                          handleSort("lastModifiedTime");
                          setIsMoreMenuOpen(false);
                        }}
                      >
                        Last Modified Time
                        {sortConfig.key === "lastModifiedTime" && (
                          sortConfig.direction === "asc" ?
                            <ChevronUp size={14} className="text-white" /> :
                            <ChevronDown size={14} className="text-white" />
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="relative flex items-center gap-3 py-2.5 px-4 cursor-pointer transition-all text-sm text-gray-700 group hover:bg-[#156372] hover:text-white">
                    <Download size={16} className="text-[#156372] flex-shrink-0 group-hover:text-white" />
                    <span className="flex-1">Import</span>
                    <ChevronRight size={16} className="text-gray-400 flex-shrink-0 group-hover:text-white" />

                    {/* Import Submenu */}
                    <div className="absolute top-0 right-full mr-1.5 min-w-[160px] bg-white border border-gray-200 rounded-lg shadow-lg py-2 z-[99999] pointer-events-none opacity-0 translate-x-2.5 transition-all group-hover:pointer-events-auto group-hover:opacity-100 group-hover:translate-x-0">
                      <div
                        className="flex items-center py-2.5 px-4 text-sm text-gray-700 cursor-pointer transition-all whitespace-nowrap hover:bg-[#156372] hover:text-white"
                        onClick={() => {
                          setIsImportContinueLoading(false);
                          setIsImportModalOpen(true);
                          setIsMoreMenuOpen(false);
                        }}
                      >
                        Import Customers
                      </div>
                    </div>
                  </div>
                  <div className="relative flex items-center gap-3 py-2.5 px-4 cursor-pointer transition-all text-sm text-gray-700 group hover:bg-[#156372] hover:text-white">
                    <Upload size={16} className="text-[#156372] flex-shrink-0 group-hover:text-white" />
                    <span className="flex-1">Export</span>
                    <ChevronRight size={16} className="text-gray-400 flex-shrink-0 group-hover:text-white" />

                    {/* Export Submenu */}
                    <div className="absolute top-0 right-full mr-1.5 min-w-[160px] bg-white border border-gray-200 rounded-lg shadow-lg py-2 z-[99999] pointer-events-none opacity-0 translate-x-2.5 transition-all group-hover:pointer-events-auto group-hover:opacity-100 group-hover:translate-x-0">
                      <div
                        className="flex items-center py-2.5 px-4 text-sm text-gray-700 cursor-pointer transition-all whitespace-nowrap hover:bg-[#156372] hover:text-white"
                        onClick={() => {
                          setIsExportCustomersModalOpen(true);
                          setIsMoreMenuOpen(false);
                        }}
                      >
                        Export Customers
                      </div>
                      <div
                        className="flex items-center py-2.5 px-4 text-sm text-gray-700 cursor-pointer transition-all whitespace-nowrap hover:bg-[#156372] hover:text-white"
                        onClick={handleExportCurrentView}
                      >
                        Export Current View
                      </div>
                    </div>
                  </div>
                  <div
                    className="group flex items-center gap-3 py-2.5 px-4 cursor-pointer transition-colors text-sm text-gray-700 hover:bg-[#156372] hover:text-white"
                    onClick={() => {
                      setIsMoreMenuOpen(false);
                      navigate("/settings/customers-vendors");
                    }}
                  >
                    <Settings size={16} className="text-[#156372] group-hover:text-white flex-shrink-0" />
                    <span className="flex-1">Preferences</span>
                  </div>
                  <div
                    className="group flex items-center gap-3 py-2.5 px-4 cursor-pointer transition-colors text-sm text-gray-700 hover:bg-[#156372] hover:text-white"
                    onClick={async () => {
                      setIsMoreMenuOpen(false);
                      try {
                        await loadCustomers(currentPage, itemsPerPage, { rowRefreshOnly: true });
                      } catch (error) {
                      }
                    }}
                  >
                    <RefreshCw size={16} className={`text-[#156372] group-hover:text-white flex-shrink-0 ${isRefreshing ? "animate-spin" : ""}`} />
                    <span className="flex-1">Refresh List</span>
                  </div>
                  <div
                    className="group flex items-center gap-3 py-2.5 px-4 cursor-pointer transition-colors text-sm text-gray-700 hover:bg-[#156372] hover:text-white"
                    onClick={() => {
                      handleResetColumnWidths();
                      setIsMoreMenuOpen(false);
                    }}
                  >
                    <RefreshCw size={16} className="text-[#156372] group-hover:text-white flex-shrink-0" />
                    <span className="flex-1">Reset Column Width</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}




      {/* Resizing Save Banner */}
      {
        hasResized && (
          <div className="mb-4 flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-md animate-in slide-in-from-top-1 duration-300">
            <div className="flex items-center gap-3">
              <Info size={16} className="text-[#156372]" />
              <span className="text-sm text-[#156372]">You have resized the columns. Would you like to save the changes?</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleSaveLayout}
                className="px-3 py-1.5 bg-[#10b981] text-white text-xs font-medium rounded hover:bg-[#059669] transition-colors"
              >
                Save
              </button>
              <button
                onClick={handleCancelLayout}
                className="px-3 py-1.5 bg-white border border-gray-300 text-gray-700 text-xs font-medium rounded hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )
      }

      {/* Table Container */}
      {/* Mobile Card View (Mockup Style) */}
      <div className="block sm:hidden bg-white overflow-hidden mb-8">
        <div className="divide-y divide-gray-100">
          {(isLoading || isRefreshing) ? Array(6).fill(0).map((_, index) => (
            <div key={`mobile-skeleton-${index}`} className="flex items-center gap-3 p-4 animate-pulse">
              <div className="w-12 h-12 rounded-full bg-gray-200 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="h-4 bg-gray-200 rounded w-3/5 mb-2" />
                <div className="h-3 bg-gray-100 rounded w-2/5" />
              </div>
              <div className="flex flex-col items-end gap-1">
                <div className="h-3 bg-gray-200 rounded w-16" />
                <div className="h-2 bg-gray-100 rounded w-12" />
              </div>
            </div>
          )) : displayedCustomers.map((customer, index) => {
            const customerId = getCustomerIdForNavigation(customer);
            const receivables = parseFloat(customer.receivables || 0);
            const unusedCredits = parseFloat(customer.unusedCredits || 0);
            const initials = (customer.name || customer.displayName || 'C')
              .split(' ')
              .map(n => n[0])
              .join('')
              .substring(0, 2)
              .toUpperCase();

            return (
              <div
                key={`${customer.id}-${index}`}
                onClick={() => {
                  if (customerId) {
                    navigate(`/sales/customers/${String(customerId)}`, { state: { customer } });
                  }
                }}
                className="flex items-center gap-3 p-4 active:bg-slate-50 transition-colors"
              >
                {/* Avatar with Status */}
                <div className="relative flex-shrink-0">
                  {customer.imageUrl ? (
                    <img src={customer.imageUrl} alt="" className="w-12 h-12 rounded-full object-cover border border-gray-100 shadow-sm" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-[#156372] flex items-center justify-center text-white text-sm font-bold shadow-sm">
                      {initials}
                    </div>
                  )}
                  <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${customer.status?.toLowerCase() === 'active' || !customer.status ? 'bg-green-500' : 'bg-gray-400'}`} />
                </div>

                {/* Name and Company Section */}
                <div className="flex-1 min-w-0">
                  <div className="text-slate-900 font-bold truncate text-[15px]">
                    {customer.name || customer.displayName || 'Customer'}
                  </div>
                  <div className="text-slate-400 text-xs truncate">
                    {customer.companyName || 'No Company'}
                  </div>
                </div>

                {/* Financial Metric Section */}
                <div className="flex items-center gap-3">
                  {unusedCredits > 0 ? (
                    <div className="flex items-center gap-3">
                      <div className="flex flex-col items-end">
                        <div className="text-gray-400 font-medium text-[12px] leading-tight">{formatCurrency(receivables)}</div>
                        <div className="text-gray-400 font-bold text-[8px] uppercase tracking-wider">RECEIVABLES</div>
                      </div>
                      <div className="flex flex-col items-end">
                        <div className="text-[#10b981] font-bold text-[14px] leading-tight">{formatCurrency(unusedCredits)}</div>
                        <div className="text-[#10b981] font-bold text-[8px] uppercase tracking-wider whitespace-nowrap">UNUSED CREDITS</div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-end">
                      <div className="text-slate-900 font-bold text-[14px] leading-tight">{formatCurrency(receivables)}</div>
                      <div className="text-[#156372] font-bold text-[8px] uppercase tracking-wider">RECEIVABLES</div>
                    </div>
                  )}
                </div>

                {/* Right Arrow */}
                <ChevronRight size={18} className="text-slate-300 ml-1 flex-shrink-0" />
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-white min-h-0 custom-scrollbar">
        {/* Table */}
        <table
          className="w-full text-left border-collapse text-[13px] table-fixed"
          style={{ minWidth: `${tableMinWidth}px` }}
        >
          <thead className="bg-[#f6f7fb] sticky top-0 z-20 border-b border-[#e6e9f2]">
            <tr className="text-[10px] font-semibold text-[#7b8494] uppercase tracking-wider">
              {/* Settings Dropdown Column */}
              <th className="px-4 py-3 w-16 min-w-[64px]">
                <div className="flex items-center gap-2 relative">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsCustomizeModalOpen(true);
                    }}
                    className="h-6 w-6 flex items-center justify-center rounded border border-gray-200 bg-white hover:bg-gray-50 transition-colors"
                    title="Manage columns"
                    aria-label="Manage columns"
                  >
                    <SlidersHorizontal size={13} style={{ color: "#1b5e6a" }} />
                  </button>
                  <div className="h-5 w-px bg-gray-200" />
                  <input
                    type="checkbox"
                    checked={selectedCustomers.size === displayedCustomers.length && displayedCustomers.length > 0}
                    onChange={handleSelectAll}
                    style={{ accentColor: "#1b5e6a" }}
                    className="w-4 h-4 rounded border-gray-300 cursor-pointer focus:ring-0"
                  />
                </div>
              </th>

              {visibleColumns.map((col) => (
                <th
                  key={col.key}
                  className={`px-4 py-3 relative group/header cursor-pointer select-none ${col.key !== 'name' && col.key !== 'receivables_bcy' && col.key !== 'companyName' ? 'hidden md:table-cell' : ''}`}
                  style={{ width: col.width }}
                  onClick={() => col.key === 'name' ? handleSort('name') : undefined}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <span className="truncate">{col.label}</span>
                      {col.key === 'name' && (
                        sortConfig.key === "name" ? (
                          sortConfig.direction === "asc" ?
                            <ChevronUp size={12} className="text-[#156372]" /> :
                            <ChevronDown size={12} className="text-[#156372]" />
                        ) : (
                          <ArrowUpDown size={10} className="text-gray-400 opacity-0 group-hover/header:opacity-100 transition-opacity" />
                        )
                      )}
                    </div>
                  </div>

                  {/* Column resize handle */}
                  <div
                    role="separator"
                    aria-orientation="vertical"
                    onMouseDown={(e) => startResizing(col.key, e)}
                    onClick={(e) => e.stopPropagation()}
                    className="absolute right-0 top-0 h-full w-3 cursor-col-resize opacity-0 group-hover/header:opacity-100 transition-opacity"
                    title="Drag to resize"
                  >
                    <div className="absolute left-1/2 top-0 -translate-x-1/2 h-full w-px bg-[#7b8494]/60" />
                  </div>
                </th>
              ))}

              <th className="px-4 py-3 w-12 sticky right-0 bg-[#f6f7fb]">
                <div className="flex items-center justify-center">
                  <Search
                    size={14}
                    className="text-gray-300 cursor-pointer transition-colors hover:opacity-80"
                    onClick={(e) => {
                      e.stopPropagation();
                      openSearchModalForCurrentContext();
                    }}
                  />
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {(isLoading || isRefreshing) ? (
              Array(8).fill(0).map((_, i) => (
                <tr key={i} className="animate-pulse border-b border-gray-50">
                  <td className="px-4 py-3 w-16">
                    <div className="h-4 w-4 bg-gray-100 rounded mx-auto" />
                  </td>
                  {visibleColumns.map((col, idx) => (
                    <td key={idx} className="px-4 py-3" style={{ width: col.width }}>
                      <div className={`h-4 bg-gray-100 rounded ${idx === 0 ? 'w-3/4' : 'w-1/2'}`} />
                    </td>
                  ))}
                  <td className="px-4 py-3 w-12 sticky right-0 bg-white" />
                </tr>
              ))
            ) : (
              displayedCustomers.map((customer, index) => {
                const isSelected = selectedCustomers.has(customer.id);
                return (
                  <tr
                    key={`${customer.id}-${index}`}
                    onMouseEnter={() => setHoveredRowId(customer.id)}
                    onMouseLeave={() => {
                      if (openReceivablesDropdownId !== customer.id) {
                        setHoveredRowId(null);
                      }
                    }}
                    onClick={(e) => {
                      const target = e.target as HTMLElement;
                      if (target.closest('input[type="checkbox"]') ||
                        target.closest('button') ||
                        target.closest('[data-receivables-button]')) {
                        return;
                      }
                      const customerId = getCustomerIdForNavigation(customer);
                      if (customerId) {
                        navigate(`/sales/customers/${String(customerId)}`, { state: { customer } });
                      }
                    }}
                    className="text-[13px] group transition-all hover:bg-[#f8fafc] cursor-pointer h-[50px] border-b border-[#eef1f6]"
                    style={isSelected ? { backgroundColor: "#1b5e6a1A" } : {}}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="h-6 w-6 shrink-0" aria-hidden />
                        <span className="h-5 w-px shrink-0 bg-transparent" aria-hidden />
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleSelectCustomer(customer.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="w-4 h-4 rounded border-gray-300 cursor-pointer focus:ring-0"
                          style={{ accentColor: "#1b5e6a" }}
                        />
                      </div>
                    </td>

                    {visibleColumns.map(col => (
                      <td
                        key={col.key}
                        className={`px-4 py-3 truncate ${col.key !== 'name' && col.key !== 'receivables_bcy' && col.key !== 'companyName' ? 'hidden sm:table-cell' : ''}`}
                        style={{ width: col.width, maxWidth: col.width }}
                      >
                        {col.key === 'name' ? (
                          <div className="flex items-center gap-2">
                            <div className="flex flex-col min-w-0">
                              <span className="text-[#1b5e6a] font-medium truncate">
                                {customer.name || customer.displayName || 'Customer'}
                              </span>
                              <span className="text-[11px] text-gray-400 truncate md:hidden">{customer.email || 'No email provided'}</span>
                            </div>
                          </div>
                        ) : col.key === 'receivables' || col.key === 'receivables_bcy' ? (
                          <span className="text-[13px] text-gray-700 font-medium">{formatCurrency(customer.receivables || customer.receivables_bcy)}</span>
                        ) : col.key === 'unusedCredits' || col.key === 'unused_credits_bcy' ? (
                          <span className="text-[13px] text-gray-700">{formatCurrency(customer.unusedCredits || customer.unused_credits_bcy)}</span>
                        ) : (
                          <span className="text-[13px] text-gray-700">{getCustomerFieldValue(customer, col.key)}</span>
                        )}
                      </td>
                    ))}

                    <td className="px-4 py-3 sticky right-0 bg-white/95 backdrop-blur-sm group-hover:bg-[#f8fafc] transition-colors">
                      {(hoveredRowId === customer.id || openReceivablesDropdownId === customer.id) && (
                        <div className="flex justify-center">
                          <button
                            data-receivables-button
                            data-customer-id={customer.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              const button = e.currentTarget;
                              const rect = button.getBoundingClientRect();
                              setReceivablesDropdownPosition({
                                top: rect.bottom + 4,
                                left: rect.right - 120
                              });
                              setOpenReceivablesDropdownId(openReceivablesDropdownId === customer.id ? null : customer.id);
                            }}
                            className="flex items-center justify-center w-6 h-6 bg-white border border-gray-200 rounded-full cursor-pointer transition-all hover:bg-gray-50"
                          >
                            <ChevronDown size={14} className="text-slate-500" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>


      {/* Bulk Update Modal */}
      {
        isBulkUpdateModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-[1000] overflow-y-auto pt-10 pb-10">
            <div className="bg-white rounded-lg shadow-lg w-full max-w-[560px] mt-2 mb-2 flex flex-col overflow-visible">
              <div className="flex items-center justify-between py-4 px-5 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900 m-0">Bulk Update - Customers</h2>
                <button
                  className="flex items-center justify-center w-7 h-7 bg-[#156372] border-2 border-white rounded text-white cursor-pointer hover:bg-[#0f4f5a] transition-colors"
                  onClick={() => setIsBulkUpdateModalOpen(false)}
                >
                  <X size={18} />
                </button>
              </div>
              <div className="p-6 overflow-visible">
                {/* Customer Type */}
                <div className="flex items-center mb-5 last:mb-0">
                  <label className="w-40 flex-shrink-0 text-sm text-gray-700">Customer Type</label>
                  <div className="flex items-center gap-6">
                    <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                      <input
                        type="radio"
                        name="customerType"
                        value="business"
                        checked={bulkUpdateData.customerType === "business"}
                        onChange={(e) => setBulkUpdateData(prev => ({ ...prev, customerType: e.target.value }))}
                        className="hidden"
                      />
                      <span className={`w-[18px] h-[18px] border-2 rounded-full flex items-center justify-center transition-all ${bulkUpdateData.customerType === "business" ? "border-[#156372]" : "border-gray-300"}`}>
                        {bulkUpdateData.customerType === "business" && <span className="w-2.5 h-2.5 bg-[#156372] rounded-full"></span>}
                      </span>
                      Business
                    </label>
                    <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                      <input
                        type="radio"
                        name="customerType"
                        value="individual"
                        checked={bulkUpdateData.customerType === "individual"}
                        onChange={(e) => setBulkUpdateData(prev => ({ ...prev, customerType: e.target.value }))}
                        className="hidden"
                      />
                      <span className={`w-[18px] h-[18px] border-2 rounded-full flex items-center justify-center transition-all ${bulkUpdateData.customerType === "individual" ? "border-[#156372]" : "border-gray-300"}`}>
                        {bulkUpdateData.customerType === "individual" && <span className="w-2.5 h-2.5 bg-[#156372] rounded-full"></span>}
                      </span>
                      Individual
                    </label>
                  </div>
                </div>

                {/* Credit Limit */}
                <div className="flex items-center mb-5 last:mb-0">
                  <label className="w-40 flex-shrink-0 text-sm text-gray-700">Credit Limit</label>
                  <div className="flex-1 flex items-center">
                    <div className="h-[38px] min-w-[52px] px-3 flex items-center justify-center rounded-l-md border border-gray-300 bg-gray-50 text-sm text-gray-700">
                      {bulkUpdateData.currency || "USD"}
                    </div>
                    <input
                      type="number"
                      step="0.01"
                      value={bulkUpdateData.creditLimit}
                      onChange={(e) => setBulkUpdateData(prev => ({ ...prev, creditLimit: e.target.value }))}
                      onFocus={closeBulkUpdateDropdowns}
                      placeholder="0.00"
                      className="h-[38px] w-full rounded-r-md border border-l-0 border-gray-300 bg-white px-3 text-sm text-gray-700 outline-none focus:border-[#156372] focus:ring-1 focus:ring-[#156372]"
                    />
                  </div>
                </div>

                {/* Currency */}
                <div className="flex items-center mb-5 last:mb-0">
                  <label className="w-40 flex-shrink-0 text-sm text-gray-700">Currency</label>
                  <div className="flex-1 relative" ref={currencyDropdownRef}>
                    <div
                      className={`flex items-center justify-between w-full py-2.5 px-3.5 text-sm text-gray-700 bg-white border rounded-md cursor-pointer transition-colors ${isCurrencyDropdownOpen ? "border-[#156372] rounded-b-none" : "border-gray-300 hover:border-gray-400"}`}
                      onClick={() => {
                        const nextOpen = !isCurrencyDropdownOpen;
                        closeBulkUpdateDropdowns();
                        setIsCurrencyDropdownOpen(nextOpen);
                        setCurrencySearch("");
                      }}
                    >
                      <span className={bulkUpdateData.currency ? "text-gray-700" : "text-gray-400"}>
                        {bulkUpdateData.currency
                          ? (currencyOptions.find(c => c.code === bulkUpdateData.currency)?.name || bulkUpdateData.currency)
                          : "Select"}
                      </span>
                      <ChevronDown size={16} className={`text-gray-500 transition-transform ${isCurrencyDropdownOpen ? "rotate-180" : ""}`} />
                    </div>
                    {isCurrencyDropdownOpen && (
                      <div className="absolute top-full left-0 right-0 bg-white border border-[#156372] border-t-0 rounded-b-md shadow-lg z-[1002] overflow-hidden">
                        <div className="flex items-center gap-2 py-2.5 px-3.5 border-b border-gray-200">
                          <Search size={16} className="text-gray-400 flex-shrink-0" />
                          <input
                            type="text"
                            placeholder="Search"
                            value={currencySearch}
                            onChange={(e) => setCurrencySearch(e.target.value)}
                            autoFocus
                            className="flex-1 border-none outline-none text-sm text-gray-900 placeholder:text-gray-400"
                          />
                        </div>
                        <div className="max-h-[200px] overflow-y-auto">
                          {filteredCurrencies.map(currency => (
                            <div
                              key={currency.code}
                              className={`py-2.5 px-3.5 text-sm cursor-pointer transition-colors ${bulkUpdateData.currency === currency.code ? "bg-[#156372] text-white hover:bg-[#0f4f5a]" : "text-gray-700 hover:bg-gray-100"}`}
                              onClick={() => {
                                setBulkUpdateData(prev => ({ ...prev, currency: currency.code }));
                                setIsCurrencyDropdownOpen(false);
                                setCurrencySearch("");
                              }}
                            >
                              {currency.name}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Tax Rate */}
                <div className="flex items-center mb-5 last:mb-0">
                  <label className="w-40 flex-shrink-0 text-sm text-gray-700">Tax Rate</label>
                  <div className="flex-1 relative" ref={taxRateDropdownRef}>
                    <div
                      className={`flex items-center justify-between w-full py-2.5 px-3.5 text-sm text-gray-700 bg-white border rounded-md cursor-pointer transition-colors ${isTaxRateDropdownOpen ? "border-[#156372] rounded-b-none" : "border-gray-300 hover:border-gray-400"}`}
                      onClick={() => {
                        const nextOpen = !isTaxRateDropdownOpen;
                        closeBulkUpdateDropdowns();
                        setIsTaxRateDropdownOpen(nextOpen);
                      }}
                    >
                      <span className={bulkUpdateData.taxRate ? "text-gray-700" : "text-gray-400"}>
                        {bulkUpdateData.taxRate || "Select a Tax"}
                      </span>
                      <ChevronDown size={16} className={`text-gray-500 transition-transform ${isTaxRateDropdownOpen ? "rotate-180" : ""}`} />
                    </div>
                    {isTaxRateDropdownOpen && (
                      <div className="absolute top-full left-0 right-0 bg-white border border-[#156372] border-t-0 rounded-b-md shadow-lg z-[1002] overflow-hidden">
                        <div className="max-h-[200px] overflow-y-auto">
                          {taxRateOptions.map((option, index) => (
                            option.isHeader ? (
                              <div key={`header-${index}`} className="px-3.5 py-1.5 text-xs font-semibold text-gray-500 bg-gray-50 uppercase tracking-wider sticky top-0 border-y border-gray-100 first:border-t-0">
                                {option.label}
                              </div>
                            ) : (
                              <div
                                key={option.value}
                                className={`py-2.5 px-3.5 text-sm cursor-pointer transition-colors ${bulkUpdateData.taxRate === option.value ? "bg-[#156372] text-white hover:bg-[#0f4f5a]" : "text-gray-700 hover:bg-gray-100"}`}
                                onClick={() => {
                                  setBulkUpdateData(prev => ({ ...prev, taxRate: option.value }));
                                  setIsTaxRateDropdownOpen(false);
                                }}
                              >
                                {option.label}
                              </div>
                            )
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Payment Terms */}
                <div className="flex items-center mb-5 last:mb-0">
                  <label className="w-40 flex-shrink-0 text-sm text-gray-700">Payment Terms</label>
                  <div className="flex-1 relative" ref={paymentTermsHook.dropdownRef}>
                    <div
                      className={`flex items-center justify-between w-full py-2.5 px-3.5 text-sm text-gray-700 bg-white border rounded-md cursor-pointer transition-colors ${paymentTermsHook.isOpen ? "border-[#156372] rounded-b-none" : "border-gray-300 hover:border-gray-400"}`}
                      onClick={() => {
                        if (paymentTermsHook.isOpen) {
                          paymentTermsHook.close();
                          return;
                        }
                        closeBulkUpdateDropdowns();
                        paymentTermsHook.open();
                      }}
                    >
                      <span className={paymentTermsHook.selectedTerm ? "text-gray-700" : "text-gray-400"}>
                        {paymentTermsHook.selectedTerm || ""}
                      </span>
                      <ChevronDown size={16} className={`text-gray-500 transition-transform ${paymentTermsHook.isOpen ? "rotate-180" : ""}`} />
                    </div>
                    {paymentTermsHook.isOpen && (
                      <div className="absolute top-full left-0 right-0 bg-white border border-[#156372] border-t-0 rounded-b-md shadow-lg z-[1002] overflow-hidden">
                        <div className="flex items-center gap-2 py-2.5 px-3.5 border-b border-gray-200">
                          <Search size={16} className="text-gray-400 flex-shrink-0" />
                          <input
                            type="text"
                            placeholder="Search"
                            value={paymentTermsHook.searchQuery}
                            onChange={(e) => paymentTermsHook.setSearchQuery(e.target.value)}
                            autoFocus
                            className="flex-1 border-none outline-none text-sm text-gray-900 placeholder:text-gray-400"
                          />
                        </div>
                        <div className="max-h-[200px] overflow-y-auto">
                          {paymentTermsHook.filteredTerms.map(term => (
                            <div
                              key={term.value}
                              className={`py-2.5 px-3.5 text-sm cursor-pointer transition-colors ${paymentTermsHook.selectedTerm === term.value ? "bg-[#156372] text-white hover:bg-[#0f4f5a]" : "text-gray-700 hover:bg-gray-100"}`}
                              onClick={() => paymentTermsHook.handleSelect(term)}
                            >
                              {term.label}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Customer Language */}
                <div className="flex items-center mb-5 last:mb-0">
                  <label className="w-40 flex-shrink-0 text-sm text-gray-700 flex items-center gap-1.5">
                    Customer Language
                    <Info size={14} className="text-gray-400" />
                  </label>
                  <div className="flex-1 relative" ref={customerLanguageDropdownRef}>
                    <div
                      className={`flex items-center justify-between w-full py-2.5 px-3.5 text-sm text-gray-700 bg-white border rounded-md cursor-pointer transition-colors ${isCustomerLanguageDropdownOpen ? "border-[#156372] rounded-b-none" : "border-gray-300 hover:border-gray-400"}`}
                      onClick={() => {
                        const nextOpen = !isCustomerLanguageDropdownOpen;
                        closeBulkUpdateDropdowns();
                        setIsCustomerLanguageDropdownOpen(nextOpen);
                        setCustomerLanguageSearch("");
                      }}
                    >
                      <span className={bulkUpdateData.customerLanguage ? "text-gray-700" : "text-gray-400"}>
                        {bulkUpdateData.customerLanguage || ""}
                      </span>
                      <ChevronDown size={16} className={`text-gray-500 transition-transform ${isCustomerLanguageDropdownOpen ? "rotate-180" : ""}`} />
                    </div>
                    {isCustomerLanguageDropdownOpen && (
                      <div className="absolute top-full left-0 right-0 bg-white border border-[#156372] border-t-0 rounded-b-md shadow-lg z-[1002] overflow-hidden">
                        <div className="flex items-center gap-2 py-2.5 px-3.5 border-b border-gray-200">
                          <Search size={16} className="text-gray-400 flex-shrink-0" />
                          <input
                            type="text"
                            placeholder="Search"
                            value={customerLanguageSearch}
                            onChange={(e) => setCustomerLanguageSearch(e.target.value)}
                            autoFocus
                            className="flex-1 border-none outline-none text-sm text-gray-900 placeholder:text-gray-400"
                          />
                        </div>
                        <div className="max-h-[200px] overflow-y-auto">
                          {filteredCustomerLanguages.map(lang => (
                            <div
                              key={lang}
                              className={`py-2.5 px-3.5 text-sm cursor-pointer transition-colors ${bulkUpdateData.customerLanguage === lang ? "bg-[#156372] text-white hover:bg-[#0f4f5a]" : "text-gray-700 hover:bg-gray-100"}`}
                              onClick={() => {
                                setBulkUpdateData(prev => ({ ...prev, customerLanguage: lang }));
                                setIsCustomerLanguageDropdownOpen(false);
                                setCustomerLanguageSearch("");
                              }}
                            >
                              {lang}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Price List */}
                <div className="flex items-center mb-5 last:mb-0">
                  <label className="w-40 flex-shrink-0 text-sm text-gray-700">Price List</label>
                  <div className="flex-1 max-w-md">
                    <SearchableDropdown
                      value={bulkUpdateData.priceListId}
                      options={[
                        { value: "", label: "None" },
                        ...priceLists.map((p) => ({ value: p.id, label: p.name || p.id })),
                      ]}
                      placeholder="None"
                      accentColor="#156372"
                      onOpenChange={(open) => {
                        if (open) closeBulkUpdateDropdowns();
                      }}
                      onChange={(value) => setBulkUpdateData(prev => ({ ...prev, priceListId: value }))}
                    />
                  </div>
                </div>

                {/* Accounts Receivable */}
                <div className="flex items-center mb-5 last:mb-0">
                  <label className="w-40 flex-shrink-0 text-sm text-gray-700">Accounts Receivable</label>
                  <div className="flex-1 relative" ref={accountsReceivableDropdownRef}>
                    <div
                      className={`flex items-center justify-between w-full py-2.5 px-3.5 text-sm text-gray-700 bg-white border rounded-md cursor-pointer transition-colors ${isAccountsReceivableDropdownOpen ? "border-[#156372] rounded-b-none" : "border-gray-300 hover:border-gray-400"}`}
                      onClick={() => {
                        const nextOpen = !isAccountsReceivableDropdownOpen;
                        closeBulkUpdateDropdowns();
                        setIsAccountsReceivableDropdownOpen(nextOpen);
                      }}
                    >
                      <span className={bulkUpdateData.accountsReceivable ? "text-gray-700" : "text-gray-400"}>
                        {bulkUpdateData.accountsReceivable || "Select an account"}
                      </span>
                      <ChevronDown size={16} className={`text-gray-500 transition-transform ${isAccountsReceivableDropdownOpen ? "rotate-180" : ""}`} />
                    </div>
                    {isAccountsReceivableDropdownOpen && (
                      <div className="absolute top-full left-0 right-0 bg-white border border-[#156372] border-t-0 rounded-b-md shadow-lg z-[1002] overflow-hidden">
                        <div className="max-h-[200px] overflow-y-auto">
                          {accountsReceivableOptions.map(account => (
                            <div
                              key={account}
                              className={`py-2.5 px-3.5 text-sm cursor-pointer transition-colors ${bulkUpdateData.accountsReceivable === account ? "bg-[#156372] text-white hover:bg-[#0f4f5a]" : "text-gray-700 hover:bg-gray-100"}`}
                              onClick={() => {
                                setBulkUpdateData(prev => ({ ...prev, accountsReceivable: account }));
                                setIsAccountsReceivableDropdownOpen(false);
                              }}
                            >
                              {account}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Reporting Tags */}
                {availableReportingTags.map((tag: any) => {
                  const tagId = String(tag?._id || tag?.id || "");
                  if (!tagId) return null;
                  const selectedVal = bulkUpdateData.reportingTags?.[tagId] ?? "";
                  const normalizedOptions = Array.isArray(tag?.options) ? tag.options : [];
                  const options = [
                    { value: "", label: "None" },
                    ...normalizedOptions.map((opt: string) => ({ value: opt, label: opt })),
                  ];

                  return (
                    <div key={tagId} className="flex items-center mb-5 last:mb-0">
                      <label className="w-40 flex-shrink-0 text-sm text-gray-700">
                        {tag.name || "Reporting Tag"}
                      </label>
                      <div className="flex-1 max-w-md">
                        <SearchableDropdown
                          value={selectedVal}
                          options={options}
                          placeholder="None"
                          accentColor="#156372"
                          onOpenChange={(open) => {
                            if (open) closeBulkUpdateDropdowns();
                          }}
                          onChange={(value) => {
                            setBulkUpdateData((prev: any) => {
                              const existing = prev?.reportingTags || {};
                              const next = { ...existing };
                              if (!value) {
                                delete next[tagId];
                              } else {
                                next[tagId] = value;
                              }
                              return { ...prev, reportingTags: next };
                            });
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center gap-3 py-4 px-6 bg-gray-50 border-t border-gray-200 rounded-b-lg">
                <button
                  className="py-2.5 px-5 text-sm font-medium text-white bg-[#156372] border-none rounded-md cursor-pointer transition-colors hover:bg-[#0f4f5a]"
                  onClick={handleBulkUpdateSubmit}
                >
                  Update Fields
                </button>
                <button
                  className="py-2.5 px-5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md cursor-pointer transition-all hover:bg-gray-50 hover:border-gray-400"
                  onClick={() => setIsBulkUpdateModalOpen(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )
      }

      {/* Modal containers removed as download is now automatic */}

      {/* Export Current View Modal */}
      {
        isExportCurrentViewModalOpen && (
          <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-[2000]"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setIsExportCurrentViewModalOpen(false);
              }
            }}
          >
            <div className="bg-white rounded-lg w-[90%] max-w-[600px] max-h-[90vh] flex flex-col shadow-xl">
              <div className="flex items-center justify-between py-5 px-6 border-b border-gray-200">
                <h2 className="m-0 text-xl font-semibold text-gray-900">Export Current View</h2>
                <button
                  className="bg-transparent border-none cursor-pointer p-1 flex items-center justify-center text-gray-500 transition-colors hover:text-red-500"
                  onClick={() => setIsExportCurrentViewModalOpen(false)}
                >
                  <X size={20} />
                </button>
              </div>
              <div className="p-6 overflow-y-auto flex-1">
                {/* Info Box */}
                <div className="flex items-start gap-3 py-3 px-4 bg-[#15637210] rounded-md mb-6 text-sm text-blue-900">
                  <Info size={16} className="flex-shrink-0 mt-0.5" />
                  <span>Only the current view with its visible columns will be exported from Zoho Books in CSV or XLS format.</span>
                </div>

                {/* Decimal Format */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Decimal Format<span className="text-red-500 ml-1">*</span>
                  </label>
                  <div className="relative" ref={decimalFormatDropdownRef}>
                    <div
                      className="flex items-center justify-between py-2.5 px-3 border border-gray-300 rounded-md bg-white cursor-pointer text-sm text-gray-700 transition-colors hover:border-gray-400"
                      onClick={() => setIsDecimalFormatDropdownOpen(!isDecimalFormatDropdownOpen)}
                    >
                      <span>{exportData.decimalFormat}</span>
                      <ChevronDown size={16} />
                    </div>
                    {isDecimalFormatDropdownOpen && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-[1000] max-h-[200px] overflow-y-auto">
                        {decimalFormatOptions.map((format) => (
                          <div
                            key={format}
                            className="py-2.5 px-3 text-sm text-gray-700 cursor-pointer transition-colors hover:bg-gray-100"
                            onClick={() => {
                              setExportData(prev => ({ ...prev, decimalFormat: format }));
                              setIsDecimalFormatDropdownOpen(false);
                            }}
                          >
                            {format}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Export File Format */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Export File Format<span className="text-red-500 ml-1">*</span>
                  </label>
                  <div className="flex flex-col gap-3">
                    <label className="flex items-center gap-2.5 py-3 px-3 border border-gray-200 rounded-md cursor-pointer transition-all text-sm text-gray-700 hover:bg-gray-50 hover:border-gray-300">
                      <input
                        type="radio"
                        name="fileFormat"
                        value="csv"
                        checked={exportData.fileFormat === "csv"}
                        onChange={(e) => setExportData(prev => ({ ...prev, fileFormat: e.target.value }))}
                        className="m-0 cursor-pointer accent-blue-600"
                      />
                      <span>CSV (Comma Separated Value)</span>
                    </label>
                    <label className="flex items-center gap-2.5 py-3 px-3 border border-gray-200 rounded-md cursor-pointer transition-all text-sm text-gray-700 hover:bg-gray-50 hover:border-gray-300">
                      <input
                        type="radio"
                        name="fileFormat"
                        value="xls"
                        checked={exportData.fileFormat === "xls"}
                        onChange={(e) => setExportData(prev => ({ ...prev, fileFormat: e.target.value }))}
                        className="m-0 cursor-pointer accent-blue-600"
                      />
                      <span>XLS (Microsoft Excel 1997-2004 Compatible)</span>
                    </label>
                    <label className="flex items-center gap-2.5 py-3 px-3 border border-gray-200 rounded-md cursor-pointer transition-all text-sm text-gray-700 hover:bg-gray-50 hover:border-gray-300">
                      <input
                        type="radio"
                        name="fileFormat"
                        value="xlsx"
                        checked={exportData.fileFormat === "xlsx"}
                        onChange={(e) => setExportData(prev => ({ ...prev, fileFormat: e.target.value }))}
                        className="m-0 cursor-pointer accent-blue-600"
                      />
                      <span>XLSX (Microsoft Excel)</span>
                    </label>
                  </div>
                </div>

                {/* File Protection Password */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    File Protection Password
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type={exportData.showPassword ? "text" : "password"}
                      className="w-full py-2.5 px-3 pr-10 border border-gray-300 rounded-md text-sm text-gray-700 transition-colors focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                      value={exportData.password}
                      onChange={(e) => setExportData(prev => ({ ...prev, password: e.target.value }))}
                      placeholder="Enter password"
                    />
                    <button
                      type="button"
                      className="absolute right-3 bg-transparent border-none cursor-pointer p-1 flex items-center justify-center text-gray-500 transition-colors hover:text-gray-700"
                      onClick={handleTogglePasswordVisibility}
                    >
                      {exportData.showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  <p className="mt-2 text-xs text-gray-600 leading-relaxed">
                    Your password must be at least 12 characters and include one uppercase letter, lowercase letter, number, and special character.
                  </p>
                </div>

                {/* Note */}
                <div className="mt-6 p-4 bg-gray-50 rounded-md text-sm text-gray-700 leading-relaxed">
                  <strong>Note:</strong> You can export only the first 10,000 rows. If you have more rows, please initiate a backup for the data in your Zoho Books organization, and download it.{" "}
                  <a href="#" className="text-[#156372] no-underline font-medium hover:underline">Backup Your Data</a>
                </div>
              </div>
              <div className="flex items-center justify-start gap-3 py-5 px-6 border-t border-gray-200">
                <button
                  className="py-2.5 px-5 bg-[#156372] text-white border-none rounded-md text-sm font-medium cursor-pointer transition-colors hover:bg-blue-700"
                  onClick={handleExportSubmit}
                >
                  Export
                </button>
                <button
                  className="py-2.5 px-5 bg-white text-gray-700 border border-gray-300 rounded-md text-sm font-medium cursor-pointer transition-all hover:bg-gray-50 hover:border-gray-400"
                  onClick={() => setIsExportCurrentViewModalOpen(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )
      }

      {/* Merge Customers Modal */}
      {
        isMergeModalOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-[2000] flex items-start justify-center pt-16 pb-10 overflow-y-auto"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setIsMergeModalOpen(false);
                setMergeTargetCustomer(null);
                setMergeCustomerSearch("");
                setIsMergeCustomerDropdownOpen(false);
              }
            }}
          >
            <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl mx-4 overflow-hidden">
              <div className="flex items-center justify-between py-4 px-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900 m-0">Merge Customers</h2>
                <button
                  className="flex items-center justify-center w-7 h-7 bg-white border-2 border-blue-600 rounded text-red-500 cursor-pointer hover:bg-red-50"
                  onClick={() => {
                    setIsMergeModalOpen(false);
                    setMergeTargetCustomer(null);
                    setMergeCustomerSearch("");
                  }}
                >
                  <X size={18} />
                </button>
              </div>
              <div className="p-6">
                <p className="text-sm text-gray-700 mb-4">
                  {(() => {
                    const selectedArr = Array.from(selectedCustomers);
                    if (selectedArr.length === 1) {
                      const source = customers.find((c) => c.id === selectedArr[0]);
                      const sourceName = source?.name || "";
                      return (
                        <>
                          Select a customer profile with whom you'd like to merge <strong>{sourceName}</strong>. Once merged,
                          the transactions of <strong>{sourceName}</strong> will be transferred, and this customer record will be marked as inactive.
                        </>
                      );
                    }

                    return (
                      <>
                        Kindly select the master customer to whom the customer(s) should be merged. Once merged, all the transactions will be listed under the master customer and the other customers will be marked as inactive.
                      </>
                    );
                  })()}
                </p>

                {selectedCustomers.size >= 2 ? (
                  <div className="space-y-3 pt-1">
                    {Array.from(selectedCustomers).map((selectedId) => {
                      const row = customers.find((c) => c.id === selectedId);
                      if (!row) return null;
                      return (
                        <label
                          key={row.id}
                          className="flex items-center gap-3 text-sm text-gray-800 cursor-pointer select-none"
                        >
                          <input
                            type="radio"
                            name="mergeTarget"
                            checked={mergeTargetCustomer?.id === row.id}
                            onChange={() => setMergeTargetCustomer(row)}
                            className="w-4 h-4"
                          />
                          <span>{row.name}</span>
                        </label>
                      );
                    })}
                  </div>
                ) : (
                  <div className="relative" ref={mergeCustomerDropdownRef}>
                    <div
                      className="flex items-center justify-between w-full py-2.5 px-3.5 text-sm text-gray-700 bg-white border border-gray-300 rounded-md cursor-pointer transition-colors hover:border-gray-400"
                      onClick={() => {
                        setIsMergeCustomerDropdownOpen(!isMergeCustomerDropdownOpen);
                        setMergeCustomerSearch("");
                      }}
                    >
                      <span className={mergeTargetCustomer ? "text-gray-700" : "text-gray-400"}>
                        {mergeTargetCustomer ? mergeTargetCustomer.name : "Select Customer"}
                      </span>
                      <ChevronDown size={16} className={`text-gray-500 transition-transform ${isMergeCustomerDropdownOpen ? "rotate-180" : ""}`} />
                    </div>
                    {isMergeCustomerDropdownOpen && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-[1002] overflow-hidden">
                        <div className="flex items-center gap-2 py-2.5 px-3.5 border-b border-gray-200">
                          <Search size={16} className="text-gray-400 flex-shrink-0" />
                          <input
                            type="text"
                            placeholder="Search"
                            value={mergeCustomerSearch}
                            onChange={(e) => setMergeCustomerSearch(e.target.value)}
                            autoFocus
                            className="flex-1 border-none outline-none text-sm text-gray-900 placeholder:text-gray-400"
                          />
                        </div>
                        <div className="max-h-[200px] overflow-y-auto">
                          {(() => {
                            const selectedArr = Array.from(selectedCustomers);
                            const sourceId = selectedArr.length === 1 ? selectedArr[0] : null;
                            const options = dropdownMergeTargets.filter((c: any) => (sourceId ? c.id !== sourceId : true));

                            if (options.length === 0) {
                              return (
                                <div className="py-2.5 px-3.5 text-sm text-gray-500">
                                  No customers found.
                                </div>
                              );
                            }

                            return options.map((customer, index) => (
                              <div
                                key={`${customer.id}-${index}`}
                                className={`py-2.5 px-3.5 text-sm cursor-pointer transition-colors ${mergeTargetCustomer?.id === customer.id ? "bg-[#156372] text-white" : "text-gray-700 hover:bg-gray-100"}`}
                                onClick={() => {
                                  setMergeTargetCustomer(customer);
                                  setIsMergeCustomerDropdownOpen(false);
                                  setMergeCustomerSearch("");
                                }}
                              >
                                {customer.name} {customer.companyName && `(${customer.companyName})`}
                              </div>
                            ));
                          })()}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="flex items-center justify-start gap-3 py-4 px-6 bg-white border-t border-gray-200 rounded-b-lg">
                <button
                  className={`py-2.5 px-5 text-sm font-medium text-white bg-blue-600 border-none rounded-md transition-colors hover:bg-blue-700 ${mergeTargetCustomer ? "cursor-pointer" : "opacity-60 cursor-not-allowed"}`}
                  onClick={handleMergeContinue}
                  disabled={!mergeTargetCustomer}
                >
                  Continue
                </button>
                <button
                  className="py-2.5 px-5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md cursor-pointer transition-all hover:bg-gray-50 hover:border-gray-400"
                  onClick={() => {
                    setIsMergeModalOpen(false);
                    setMergeTargetCustomer(null);
                    setMergeCustomerSearch("");
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )
      }

      {/* Associate Templates Modal */}
      {
        isAssociateTemplatesModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[2000] overflow-y-auto py-10">
            <div className="bg-white rounded-lg shadow-lg w-full max-w-[700px] mx-4 my-10">
              <div className="flex items-center justify-between py-4 px-6 border-b border-gray-200">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 m-0">Associate Templates</h2>
                  <p className="text-sm text-gray-600 mt-1">Associate PDF and notification templates to this customer.</p>
                </div>
                <button
                  className="flex items-center justify-center w-7 h-7 bg-white border-2 border-blue-600 rounded text-red-500 cursor-pointer hover:bg-red-50"
                  onClick={() => setIsAssociateTemplatesModalOpen(false)}
                >
                  <X size={18} />
                </button>
              </div>
              <div className="p-6 max-h-[60vh] overflow-y-auto">
                {/* PDF and Email Both Go Option */}
                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="pdfAndEmailBothGo"
                      checked={templateData.pdfAndEmailBothGo}
                      onChange={(e) => setTemplateData(prev => ({
                        ...prev,
                        pdfAndEmailBothGo: e.target.checked
                      }))}
                      className="w-4 h-4 text-blue-600 bg-white border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                    />
                    <label htmlFor="pdfAndEmailBothGo" className="text-sm font-medium text-gray-900 cursor-pointer">
                      PDF and Email both go
                    </label>
                  </div>
                  <p className="text-xs text-gray-600 mt-2 ml-7">
                    When enabled, both PDF and email will be sent together for all transactions associated with this customer.
                  </p>
                </div>

                {/* PDF Templates Section */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-semibold text-gray-900">PDF Templates</h3>
                    <button
                      className="flex items-center gap-1.5 py-1.5 px-3 text-white rounded-md text-sm font-medium cursor-pointer transition-colors"
                      style={{ background: "linear-gradient(90deg, #156372 0%, #0D4A52 100%)" }}
                      onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.9")}
                      onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
                      onClick={() => navigate("/settings/customization/pdf-templates")}
                    >
                      <Plus size={14} />
                      New PDF Template
                    </button>
                  </div>
                  <div className="space-y-3">
                    {Object.entries(templateData.pdfTemplates).map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between">
                        <label className="text-sm text-gray-700 capitalize">
                          {key.replace(/([A-Z])/g, ' $1').trim()}
                        </label>
                        <div className="flex-1 max-w-[300px] ml-4 relative">
                          <select
                            className="w-full py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md appearance-none cursor-pointer transition-colors hover:border-gray-400 focus:outline-none focus:border-blue-600"
                            value={value}
                            onChange={(e) => setTemplateData(prev => ({
                              ...prev,
                              pdfTemplates: { ...prev.pdfTemplates, [key]: e.target.value }
                            }))}
                          >
                            <option value="Standard Template">Standard Template</option>
                            <option value="Elite Template">Elite Template</option>
                            <option value="Professional Template">Professional Template</option>
                            <option value="Modern Template">Modern Template</option>
                            <option value="New PDF Template">New PDF Template</option>
                          </select>
                          <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Email Notifications Section */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-semibold text-gray-900">Email Notifications</h3>
                    <button
                      className="flex items-center gap-1.5 py-1.5 px-3 text-white rounded-md text-sm font-medium cursor-pointer transition-colors"
                      style={{ background: "linear-gradient(90deg, #156372 0%, #0D4A52 100%)" }}
                      onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.9")}
                      onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
                      onClick={() => navigate("/settings/customization/email-notifications")}
                    >
                      <Plus size={14} />
                      New Email Template
                    </button>
                  </div>
                  <div className="space-y-3">
                    {Object.entries(templateData.emailNotifications).map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between">
                        <label className="text-sm text-gray-700 capitalize">
                          {key.replace(/([A-Z])/g, ' $1').trim()}
                        </label>
                        <div className="flex-1 max-w-[300px] ml-4 relative">
                          <select
                            className="w-full py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md appearance-none cursor-pointer transition-colors hover:border-gray-400 focus:outline-none focus:border-blue-600"
                            value={value}
                            onChange={(e) => {
                              setTemplateData(prev => ({
                                ...prev,
                                emailNotifications: { ...prev.emailNotifications, [key]: e.target.value }
                              }));
                            }}
                          >
                            <option value="Default">Default</option>
                            <option value="Standard">Standard</option>
                            <option value="Professional">Professional</option>
                            <option value="Custom">Custom</option>
                            <option value="New Email Template">New Email Template</option>
                          </select>
                          <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-start gap-3 py-4 px-6 bg-gray-50 border-t border-gray-200 rounded-b-lg">
                <button
                  className="py-2.5 px-5 text-sm font-medium text-white border-none rounded-md cursor-pointer transition-colors"
                  style={{ background: "linear-gradient(90deg, #156372 0%, #0D4A52 100%)" }}
                  onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.9")}
                  onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
                  onClick={handleSaveTemplates}
                >
                  Save
                </button>
                <button
                  className="py-2.5 px-5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md cursor-pointer transition-all hover:bg-gray-50 hover:border-gray-400"
                  onClick={() => setIsAssociateTemplatesModalOpen(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )
      }

      {/* Search Modal */}
      {
        isSearchModalOpen && (
          <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-[2000]"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setIsSearchModalOpen(false);
                // Reset search data when closing
                resetSearchModalData();
              }
            }}
          >
            <div className="bg-white rounded-lg shadow-lg w-full max-w-[800px] mx-4">
              {/* Header */}
              <div className="flex items-center justify-between py-4 px-6 border-b border-gray-200">
                <div className="flex items-center gap-6">
                  {/* Search Type Dropdown */}
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-gray-700">Search</label>
                    <div className="relative" ref={searchTypeDropdownRef}>
                      <div
                        className={`flex items-center justify-between w-[140px] py-2 px-3 text-sm text-gray-700 bg-white border rounded-md cursor-pointer transition-colors ${isSearchTypeDropdownOpen ? "border-blue-600" : "border-gray-300 hover:border-gray-400"}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsSearchTypeDropdownOpen(!isSearchTypeDropdownOpen);
                        }}
                      >
                        <span>{searchType}</span>
                        <ChevronDown size={16} className={`text-gray-500 transition-transform ${isSearchTypeDropdownOpen ? "rotate-180" : ""}`} />
                      </div>
                      {isSearchTypeDropdownOpen && (
                        <div
                          className="absolute top-full left-0 right-0 mt-1 bg-white border border-blue-600 border-t-0 rounded-b-md shadow-lg z-[1002] max-h-[300px] overflow-y-auto"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {searchTypeOptions.map((option) => (
                            <div
                              key={option}
                              className={`py-2.5 px-3.5 text-sm cursor-pointer transition-colors ${searchType === option
                                ? "bg-blue-600 text-white hover:bg-blue-700"
                                : "text-gray-700 hover:bg-gray-100"
                                }`}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSearchType(option);
                                setIsSearchTypeDropdownOpen(false);
                                const options = getSearchFilterOptions(option);
                                setSearchModalFilter((prev) => options.includes(prev) ? prev : options[0]);
                                // Reset search form data when changing search type
                                resetSearchModalData();
                              }}
                            >
                              {option}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Filter Dropdown */}
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-gray-700">Filter</label>
                    <div className="relative" ref={filterDropdownRef}>
                      <div
                        className={`flex items-center justify-between w-[160px] py-2 px-3 text-sm text-gray-700 bg-white border rounded-md cursor-pointer transition-colors ${isFilterDropdownOpen ? "border-blue-600" : "border-gray-300 hover:border-gray-400"}`}
                        onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)}
                      >
                        <span>{searchModalFilter}</span>
                        <ChevronDown size={16} className={`text-gray-500 transition-transform ${isFilterDropdownOpen ? "rotate-180" : ""}`} />
                      </div>
                      {isFilterDropdownOpen && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-blue-600 border-t-0 rounded-b-md shadow-lg z-[1002] max-h-[200px] overflow-y-auto">
                          {getSearchFilterOptions(searchType).map((view) => (
                            <div
                              key={view}
                              className="py-2.5 px-3.5 text-sm text-gray-700 cursor-pointer transition-colors hover:bg-gray-100"
                              onClick={() => {
                                setSearchModalFilter(view);
                                setIsFilterDropdownOpen(false);
                              }}
                            >
                              {view}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  className="flex items-center justify-center w-7 h-7 bg-transparent border-none cursor-pointer text-gray-500 hover:text-gray-700 transition-colors"
                  onClick={() => {
                    setIsSearchModalOpen(false);
                    // Reset search data when closing
                    resetSearchModalData();
                  }}
                >
                  <X size={20} />
                </button>
              </div>

              {/* Search Criteria Body */}
              <div className="p-6">
                {searchType === "Customers" && (
                  <div className="grid grid-cols-2 gap-6">
                    {/* Left Column */}
                    <div className="space-y-4">
                      {/* Display Name */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Display Name</label>
                        <input
                          type="text"
                          value={searchModalData.displayName}
                          onChange={(e) => setSearchModalData(prev => ({ ...prev, displayName: e.target.value }))}
                          className="w-full py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                        />
                      </div>

                      {/* Company Name */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Company Name</label>
                        <input
                          type="text"
                          value={searchModalData.companyName}
                          onChange={(e) => setSearchModalData(prev => ({ ...prev, companyName: e.target.value }))}
                          className="w-full py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                        />
                      </div>

                      {/* Last Name */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Last Name</label>
                        <input
                          type="text"
                          value={searchModalData.lastName}
                          onChange={(e) => setSearchModalData(prev => ({ ...prev, lastName: e.target.value }))}
                          className="w-full py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                        />
                      </div>

                      {/* Status */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Status</label>
                        <div className="relative" ref={statusDropdownRef}>
                          <div
                            className={`flex items-center justify-between w-full py-2 px-3 text-sm text-gray-700 bg-white border rounded-md cursor-pointer transition-colors ${isStatusDropdownOpen ? "border-blue-600" : "border-gray-300 hover:border-gray-400"}`}
                            onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
                          >
                            <span>{searchModalData.status}</span>
                            <ChevronDown size={16} className={`text-gray-500 transition-transform ${isStatusDropdownOpen ? "rotate-180" : ""}`} />
                          </div>
                          {isStatusDropdownOpen && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-blue-600 border-t-0 rounded-b-md shadow-lg z-[1002]">
                              {["All", "Active", "Inactive"].map((status) => (
                                <div
                                  key={status}
                                  className="py-2.5 px-3.5 text-sm text-gray-700 cursor-pointer transition-colors hover:bg-gray-100"
                                  onClick={() => {
                                    setSearchModalData(prev => ({ ...prev, status }));
                                    setIsStatusDropdownOpen(false);
                                  }}
                                >
                                  {status}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Address */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Address</label>
                        <input
                          type="text"
                          value={searchModalData.address}
                          onChange={(e) => setSearchModalData(prev => ({ ...prev, address: e.target.value }))}
                          className="w-full py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                        />
                      </div>
                    </div>

                    {/* Right Column */}
                    <div className="space-y-4">
                      {/* Customer Type */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Customer Type</label>
                        <div className="relative" ref={customerTypeDropdownRef}>
                          <div
                            className={`flex items-center justify-between w-full py-2 px-3 text-sm text-gray-700 bg-white border rounded-md cursor-pointer transition-colors ${isCustomerTypeDropdownOpen ? "border-blue-600" : "border-gray-300 hover:border-gray-400"}`}
                            onClick={() => setIsCustomerTypeDropdownOpen(!isCustomerTypeDropdownOpen)}
                          >
                            <span className={searchModalData.customerType ? "text-gray-700" : "text-gray-400"}>
                              {searchModalData.customerType || "Select"}
                            </span>
                            <ChevronDown size={16} className={`text-gray-500 transition-transform ${isCustomerTypeDropdownOpen ? "rotate-180" : ""}`} />
                          </div>
                          {isCustomerTypeDropdownOpen && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-blue-600 border-t-0 rounded-b-md shadow-lg z-[1002]">
                              {["Business", "Individual"].map((type) => (
                                <div
                                  key={type}
                                  className="py-2.5 px-3.5 text-sm text-gray-700 cursor-pointer transition-colors hover:bg-gray-100"
                                  onClick={() => {
                                    setSearchModalData(prev => ({ ...prev, customerType: type }));
                                    setIsCustomerTypeDropdownOpen(false);
                                  }}
                                >
                                  {type}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* First Name */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">First Name</label>
                        <input
                          type="text"
                          value={searchModalData.firstName}
                          onChange={(e) => setSearchModalData(prev => ({ ...prev, firstName: e.target.value }))}
                          className="w-full py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                        />
                      </div>

                      {/* Email */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                        <input
                          type="email"
                          value={searchModalData.email}
                          onChange={(e) => setSearchModalData(prev => ({ ...prev, email: e.target.value }))}
                          className="w-full py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                        />
                      </div>

                      {/* Phone */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone</label>
                        <input
                          type="tel"
                          value={searchModalData.phone}
                          onChange={(e) => setSearchModalData(prev => ({ ...prev, phone: e.target.value }))}
                          className="w-full py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                        />
                      </div>

                      {/* Notes */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Notes</label>
                        <input
                          type="text"
                          value={searchModalData.notes}
                          onChange={(e) => setSearchModalData(prev => ({ ...prev, notes: e.target.value }))}
                          className="w-full py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {searchType === "Items" && (
                  <div className="grid grid-cols-2 gap-6">
                    {/* Left Column */}
                    <div className="space-y-4">
                      {/* Item Name */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Item Name</label>
                        <input
                          type="text"
                          value={searchModalData.itemName}
                          onChange={(e) => setSearchModalData(prev => ({ ...prev, itemName: e.target.value }))}
                          className="w-full py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                        />
                      </div>

                      {/* Description */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
                        <input
                          type="text"
                          value={searchModalData.description}
                          onChange={(e) => setSearchModalData(prev => ({ ...prev, description: e.target.value }))}
                          className="w-full py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                        />
                      </div>

                      {/* Purchase Rate */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Purchase Rate</label>
                        <input
                          type="text"
                          value={searchModalData.purchaseRate}
                          onChange={(e) => setSearchModalData(prev => ({ ...prev, purchaseRate: e.target.value }))}
                          className="w-full py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                        />
                      </div>

                      {/* Sales Account */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Sales Account</label>
                        <div className="relative" ref={salesAccountDropdownRef}>
                          <div
                            className={`flex items-center justify-between w-full py-2 px-3 text-sm text-gray-700 bg-white border rounded-md cursor-pointer transition-colors ${isSalesAccountDropdownOpen ? "border-blue-600" : "border-gray-300 hover:border-gray-400"}`}
                            onClick={() => setIsSalesAccountDropdownOpen(!isSalesAccountDropdownOpen)}
                          >
                            <span className={searchModalData.salesAccount ? "text-gray-700" : "text-gray-400"}>
                              {searchModalData.salesAccount || "Select"}
                            </span>
                            <ChevronDown size={16} className={`text-gray-500 transition-transform ${isSalesAccountDropdownOpen ? "rotate-180" : ""}`} />
                          </div>
                          {isSalesAccountDropdownOpen && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-blue-600 border-t-0 rounded-b-md shadow-lg z-[1002]">
                              <div className="py-2.5 px-3.5 text-sm text-gray-500">No options available</div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right Column */}
                    <div className="space-y-4">
                      {/* SKU */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">SKU</label>
                        <input
                          type="text"
                          value={searchModalData.sku}
                          onChange={(e) => setSearchModalData(prev => ({ ...prev, sku: e.target.value }))}
                          className="w-full py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                        />
                      </div>

                      {/* Rate */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Rate</label>
                        <input
                          type="text"
                          value={searchModalData.rate}
                          onChange={(e) => setSearchModalData(prev => ({ ...prev, rate: e.target.value }))}
                          className="w-full py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                        />
                      </div>

                      {/* Status */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Status</label>
                        <div className="relative" ref={statusDropdownRef}>
                          <div
                            className={`flex items-center justify-between w-full py-2 px-3 text-sm text-gray-700 bg-white border rounded-md cursor-pointer transition-colors ${isStatusDropdownOpen ? "border-blue-600" : "border-gray-300 hover:border-gray-400"}`}
                            onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
                          >
                            <span>{searchModalData.status || "All"}</span>
                            <ChevronDown size={16} className={`text-gray-500 transition-transform ${isStatusDropdownOpen ? "rotate-180" : ""}`} />
                          </div>
                          {isStatusDropdownOpen && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-blue-600 border-t-0 rounded-b-md shadow-lg z-[1002]">
                              {["All", "Active", "Inactive"].map((status) => (
                                <div
                                  key={status}
                                  className="py-2.5 px-3.5 text-sm text-gray-700 cursor-pointer transition-colors hover:bg-gray-100"
                                  onClick={() => {
                                    setSearchModalData(prev => ({ ...prev, status }));
                                    setIsStatusDropdownOpen(false);
                                  }}
                                >
                                  {status}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Purchase Account */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Purchase Account</label>
                        <div className="relative" ref={purchaseAccountDropdownRef}>
                          <div
                            className={`flex items-center justify-between w-full py-2 px-3 text-sm text-gray-700 bg-white border rounded-md cursor-pointer transition-colors ${isPurchaseAccountDropdownOpen ? "border-blue-600" : "border-gray-300 hover:border-gray-400"}`}
                            onClick={() => setIsPurchaseAccountDropdownOpen(!isPurchaseAccountDropdownOpen)}
                          >
                            <span className={searchModalData.purchaseAccount ? "text-gray-700" : "text-gray-400"}>
                              {searchModalData.purchaseAccount || "Select"}
                            </span>
                            <ChevronDown size={16} className={`text-gray-500 transition-transform ${isPurchaseAccountDropdownOpen ? "rotate-180" : ""}`} />
                          </div>
                          {isPurchaseAccountDropdownOpen && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-blue-600 border-t-0 rounded-b-md shadow-lg z-[1002]">
                              <div className="py-2.5 px-3.5 text-sm text-gray-500">No options available</div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {searchType === "Inventory Adjustments" && (
                  <div className="grid grid-cols-2 gap-6">
                    {/* Left Column */}
                    <div className="space-y-4">
                      {/* Item Name */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Item Name</label>
                        <input
                          type="text"
                          value={searchModalData.itemName}
                          onChange={(e) => setSearchModalData(prev => ({ ...prev, itemName: e.target.value }))}
                          className="w-full py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                        />
                      </div>

                      {/* Reference# */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Reference#</label>
                        <input
                          type="text"
                          value={searchModalData.referenceNumber}
                          onChange={(e) => setSearchModalData(prev => ({ ...prev, referenceNumber: e.target.value }))}
                          className="w-full py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                        />
                      </div>

                      {/* Reason */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Reason</label>
                        <input
                          type="text"
                          value={searchModalData.reason}
                          onChange={(e) => setSearchModalData(prev => ({ ...prev, reason: e.target.value }))}
                          className="w-full py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                        />
                      </div>
                    </div>

                    {/* Right Column */}
                    <div className="space-y-4">
                      {/* Item Description */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Item Description</label>
                        <input
                          type="text"
                          value={searchModalData.itemDescription}
                          onChange={(e) => setSearchModalData(prev => ({ ...prev, itemDescription: e.target.value }))}
                          className="w-full py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                        />
                      </div>

                      {/* Adjustment Type */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Adjustment Type</label>
                        <div className="relative" ref={adjustmentTypeDropdownRef}>
                          <div
                            className={`flex items-center justify-between w-full py-2 px-3 text-sm text-gray-700 bg-white border rounded-md cursor-pointer transition-colors ${isAdjustmentTypeDropdownOpen ? "border-blue-600" : "border-gray-300 hover:border-gray-400"}`}
                            onClick={() => setIsAdjustmentTypeDropdownOpen(!isAdjustmentTypeDropdownOpen)}
                          >
                            <span>{searchModalData.adjustmentType || "All"}</span>
                            <ChevronDown size={16} className={`text-gray-500 transition-transform ${isAdjustmentTypeDropdownOpen ? "rotate-180" : ""}`} />
                          </div>
                          {isAdjustmentTypeDropdownOpen && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-blue-600 border-t-0 rounded-b-md shadow-lg z-[1002]">
                              {["All", "Quantity", "Value"].map((type) => (
                                <div
                                  key={type}
                                  className="py-2.5 px-3.5 text-sm text-gray-700 cursor-pointer transition-colors hover:bg-gray-100"
                                  onClick={() => {
                                    setSearchModalData(prev => ({ ...prev, adjustmentType: type }));
                                    setIsAdjustmentTypeDropdownOpen(false);
                                  }}
                                >
                                  {type}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Date Range */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Date Range</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            placeholder="dd/MM/yyyy"
                            value={searchModalData.dateFrom}
                            onChange={(e) => setSearchModalData(prev => ({ ...prev, dateFrom: e.target.value }))}
                            className="flex-1 py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                          />
                          <span className="text-gray-500">-</span>
                          <input
                            type="text"
                            placeholder="dd/MM/yyyy"
                            value={searchModalData.dateTo}
                            onChange={(e) => setSearchModalData(prev => ({ ...prev, dateTo: e.target.value }))}
                            className="flex-1 py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {searchType === "Banking" && (
                  <div className="grid grid-cols-2 gap-6">
                    {/* Left Column */}
                    <div className="space-y-4">
                      {/* Total Range */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Total Range</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={searchModalData.totalRangeFrom}
                            onChange={(e) => setSearchModalData(prev => ({ ...prev, totalRangeFrom: e.target.value }))}
                            className="flex-1 py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                          />
                          <span className="text-gray-500">-</span>
                          <input
                            type="text"
                            value={searchModalData.totalRangeTo}
                            onChange={(e) => setSearchModalData(prev => ({ ...prev, totalRangeTo: e.target.value }))}
                            className="flex-1 py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                          />
                        </div>
                      </div>

                      {/* Status */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Status</label>
                        <div className="relative" ref={statusDropdownRef}>
                          <div
                            className={`flex items-center justify-between w-full py-2 px-3 text-sm text-gray-700 bg-white border rounded-md cursor-pointer transition-colors ${isStatusDropdownOpen ? "border-blue-600" : "border-gray-300 hover:border-gray-400"}`}
                            onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
                          >
                            <span>{searchModalData.status || "All"}</span>
                            <ChevronDown size={16} className={`text-gray-500 transition-transform ${isStatusDropdownOpen ? "rotate-180" : ""}`} />
                          </div>
                          {isStatusDropdownOpen && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-blue-600 border-t-0 rounded-b-md shadow-lg z-[1002]">
                              {["All", "Active", "Inactive"].map((status) => (
                                <div
                                  key={status}
                                  className="py-2.5 px-3.5 text-sm text-gray-700 cursor-pointer transition-colors hover:bg-gray-100"
                                  onClick={() => {
                                    setSearchModalData(prev => ({ ...prev, status }));
                                    setIsStatusDropdownOpen(false);
                                  }}
                                >
                                  {status}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Transaction Type */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Transaction Type</label>
                        <div className="relative" ref={transactionTypeDropdownRef}>
                          <div
                            className={`flex items-center justify-between w-full py-2 px-3 text-sm text-gray-700 bg-white border rounded-md cursor-pointer transition-colors ${isTransactionTypeDropdownOpen ? "border-blue-600" : "border-gray-300 hover:border-gray-400"}`}
                            onClick={() => setIsTransactionTypeDropdownOpen(!isTransactionTypeDropdownOpen)}
                          >
                            <span className={searchModalData.transactionType ? "text-gray-700" : "text-gray-400"}>
                              {searchModalData.transactionType || "Select"}
                            </span>
                            <ChevronDown size={16} className={`text-gray-500 transition-transform ${isTransactionTypeDropdownOpen ? "rotate-180" : ""}`} />
                          </div>
                          {isTransactionTypeDropdownOpen && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-blue-600 border-t-0 rounded-b-md shadow-lg z-[1002]">
                              <div className="py-2.5 px-3.5 text-sm text-gray-500">No options available</div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right Column */}
                    <div className="space-y-4">
                      {/* Date Range */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Date Range</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            placeholder="dd/MM/yyyy"
                            value={searchModalData.dateRangeFrom}
                            onChange={(e) => setSearchModalData(prev => ({ ...prev, dateRangeFrom: e.target.value }))}
                            className="flex-1 py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                          />
                          <span className="text-gray-500">-</span>
                          <input
                            type="text"
                            placeholder="dd/MM/yyyy"
                            value={searchModalData.dateRangeTo}
                            onChange={(e) => setSearchModalData(prev => ({ ...prev, dateRangeTo: e.target.value }))}
                            className="flex-1 py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                          />
                        </div>
                      </div>

                      {/* Reference# */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Reference#</label>
                        <input
                          type="text"
                          value={searchModalData.referenceNumber}
                          onChange={(e) => setSearchModalData(prev => ({ ...prev, referenceNumber: e.target.value }))}
                          className="w-full py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {searchType === "Quotes" && (
                  <div className="grid grid-cols-2 gap-6">
                    {/* Left Column */}
                    <div className="space-y-4">
                      {/* Quote# */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Quote#</label>
                        <input
                          type="text"
                          value={searchModalData.quoteNumber}
                          onChange={(e) => setSearchModalData(prev => ({ ...prev, quoteNumber: e.target.value }))}
                          className="w-full py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                        />
                      </div>

                      {/* Date Range */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Date Range</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            placeholder="dd/MM/yyyy"
                            value={searchModalData.dateRangeFrom}
                            onChange={(e) => setSearchModalData(prev => ({ ...prev, dateRangeFrom: e.target.value }))}
                            className="flex-1 py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                          />
                          <span className="text-gray-500">-</span>
                          <input
                            type="text"
                            placeholder="dd/MM/yyyy"
                            value={searchModalData.dateRangeTo}
                            onChange={(e) => setSearchModalData(prev => ({ ...prev, dateRangeTo: e.target.value }))}
                            className="flex-1 py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                          />
                        </div>
                      </div>

                      {/* Item Description */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Item Description</label>
                        <input
                          type="text"
                          value={searchModalData.itemDescriptionQuote}
                          onChange={(e) => setSearchModalData(prev => ({ ...prev, itemDescriptionQuote: e.target.value }))}
                          className="w-full py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                        />
                      </div>

                      {/* Customer Name */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Customer Name</label>
                        <div className="relative" ref={customerNameDropdownRef}>
                          <div
                            className={`flex items-center justify-between w-full py-2 px-3 text-sm text-gray-700 bg-white border rounded-md cursor-pointer transition-colors ${isCustomerNameDropdownOpen ? "border-blue-600" : "border-gray-300 hover:border-gray-400"}`}
                            onClick={() => setIsCustomerNameDropdownOpen(!isCustomerNameDropdownOpen)}
                          >
                            <span className={searchModalData.customerName ? "text-gray-700" : "text-gray-400"}>
                              {searchModalData.customerName || "Select customer"}
                            </span>
                            <ChevronDown size={16} className={`text-gray-500 transition-transform ${isCustomerNameDropdownOpen ? "rotate-180" : ""}`} />
                          </div>
                          {isCustomerNameDropdownOpen && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-blue-600 border-t-0 rounded-b-md shadow-lg z-[1002]">
                              <div className="py-2.5 px-3.5 text-sm text-gray-500">No options available</div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Salesperson */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Salesperson</label>
                        <div className="relative" ref={salespersonDropdownRef}>
                          <div
                            className={`flex items-center justify-between w-full py-2 px-3 text-sm text-gray-700 bg-white border rounded-md cursor-pointer transition-colors ${isSalespersonDropdownOpen ? "border-blue-600" : "border-gray-300 hover:border-gray-400"}`}
                            onClick={() => setIsSalespersonDropdownOpen(!isSalespersonDropdownOpen)}
                          >
                            <span className={searchModalData.salesperson ? "text-gray-700" : "text-gray-400"}>
                              {searchModalData.salesperson || "Select a salesperson"}
                            </span>
                            <ChevronDown size={16} className={`text-gray-500 transition-transform ${isSalespersonDropdownOpen ? "rotate-180" : ""}`} />
                          </div>
                          {isSalespersonDropdownOpen && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-blue-600 border-t-0 rounded-b-md shadow-lg z-[1002]">
                              <div className="py-2.5 px-3.5 text-sm text-gray-500">No options available</div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Address */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Address</label>
                        <div className="flex items-center gap-3 mb-2">
                          <label className="flex items-center gap-1.5">
                            <input
                              type="radio"
                              name="addressType"
                              value="Billing and Shipping"
                              checked={searchModalData.addressType === "Billing and Shipping"}
                              onChange={(e) => setSearchModalData(prev => ({ ...prev, addressType: e.target.value }))}
                              className="cursor-pointer"
                            />
                            <span className="text-sm text-gray-700">Billing and Shipping</span>
                          </label>
                          <label className="flex items-center gap-1.5">
                            <input
                              type="radio"
                              name="addressType"
                              value="Billing"
                              checked={searchModalData.addressType === "Billing"}
                              onChange={(e) => setSearchModalData(prev => ({ ...prev, addressType: e.target.value }))}
                              className="cursor-pointer"
                            />
                            <span className="text-sm text-gray-700">Billing</span>
                          </label>
                          <label className="flex items-center gap-1.5">
                            <input
                              type="radio"
                              name="addressType"
                              value="Shipping"
                              checked={searchModalData.addressType === "Shipping"}
                              onChange={(e) => setSearchModalData(prev => ({ ...prev, addressType: e.target.value }))}
                              className="cursor-pointer"
                            />
                            <span className="text-sm text-gray-700">Shipping</span>
                          </label>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="relative flex-1">
                            <div
                              className={`flex items-center justify-between w-full py-2 px-3 text-sm text-gray-700 bg-white border rounded-md cursor-pointer transition-colors ${false ? "border-blue-600" : "border-gray-300 hover:border-gray-400"}`}
                            >
                              <span className="text-gray-400">Attention</span>
                              <ChevronDown size={16} className="text-gray-500" />
                            </div>
                          </div>
                          <button className="text-blue-600 text-sm hover:underline">+ Address Line</button>
                        </div>
                      </div>
                    </div>

                    {/* Right Column */}
                    <div className="space-y-4">
                      {/* Reference# */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Reference#</label>
                        <input
                          type="text"
                          value={searchModalData.referenceNumberQuote}
                          onChange={(e) => setSearchModalData(prev => ({ ...prev, referenceNumberQuote: e.target.value }))}
                          className="w-full py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                        />
                      </div>

                      {/* Item Name */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Item Name</label>
                        <div className="relative" ref={itemNameDropdownRef}>
                          <div
                            className={`flex items-center justify-between w-full py-2 px-3 text-sm text-gray-700 bg-white border rounded-md cursor-pointer transition-colors ${isItemNameDropdownOpen ? "border-blue-600" : "border-gray-300 hover:border-gray-400"}`}
                            onClick={() => setIsItemNameDropdownOpen(!isItemNameDropdownOpen)}
                          >
                            <span className={searchModalData.itemNameQuote ? "text-gray-700" : "text-gray-400"}>
                              {searchModalData.itemNameQuote || "Select an item"}
                            </span>
                            <ChevronDown size={16} className={`text-gray-500 transition-transform ${isItemNameDropdownOpen ? "rotate-180" : ""}`} />
                          </div>
                          {isItemNameDropdownOpen && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-blue-600 border-t-0 rounded-b-md shadow-lg z-[1002]">
                              <div className="py-2.5 px-3.5 text-sm text-gray-500">No options available</div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Total Range */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Total Range</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={searchModalData.totalRangeFromQuote}
                            onChange={(e) => setSearchModalData(prev => ({ ...prev, totalRangeFromQuote: e.target.value }))}
                            className="flex-1 py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                          />
                          <span className="text-gray-500">-</span>
                          <input
                            type="text"
                            value={searchModalData.totalRangeToQuote}
                            onChange={(e) => setSearchModalData(prev => ({ ...prev, totalRangeToQuote: e.target.value }))}
                            className="flex-1 py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                          />
                        </div>
                      </div>

                      {/* Project Name */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Project Name</label>
                        <div className="relative" ref={projectNameDropdownRef}>
                          <div
                            className={`flex items-center justify-between w-full py-2 px-3 text-sm text-gray-700 bg-white border rounded-md cursor-pointer transition-colors ${isProjectNameDropdownOpen ? "border-blue-600" : "border-gray-300 hover:border-gray-400"}`}
                            onClick={() => setIsProjectNameDropdownOpen(!isProjectNameDropdownOpen)}
                          >
                            <span className={searchModalData.projectName ? "text-gray-700" : "text-gray-400"}>
                              {searchModalData.projectName || "Select a project"}
                            </span>
                            <ChevronDown size={16} className={`text-gray-500 transition-transform ${isProjectNameDropdownOpen ? "rotate-180" : ""}`} />
                          </div>
                          {isProjectNameDropdownOpen && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-blue-600 border-t-0 rounded-b-md shadow-lg z-[1002]">
                              <div className="py-2.5 px-3.5 text-sm text-gray-500">No options available</div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Tax Exemptions */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Tax Exemptions</label>
                        <div className="relative" ref={taxExemptionsDropdownRef}>
                          <div
                            className={`flex items-center justify-between w-full py-2 px-3 text-sm text-gray-700 bg-white border rounded-md cursor-pointer transition-colors ${isTaxExemptionsDropdownOpen ? "border-blue-600" : "border-gray-300 hover:border-gray-400"}`}
                            onClick={() => setIsTaxExemptionsDropdownOpen(!isTaxExemptionsDropdownOpen)}
                          >
                            <span className={searchModalData.taxExemptions ? "text-gray-700" : "text-gray-400"}>
                              {searchModalData.taxExemptions || "Select a Tax Exemption"}
                            </span>
                            <ChevronDown size={16} className={`text-gray-500 transition-transform ${isTaxExemptionsDropdownOpen ? "rotate-180" : ""}`} />
                          </div>
                          {isTaxExemptionsDropdownOpen && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-blue-600 border-t-0 rounded-b-md shadow-lg z-[1002]">
                              <div className="py-2.5 px-3.5 text-sm text-gray-500">No options available</div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {searchType === "Invoices" && (
                  <div className="grid grid-cols-2 gap-6">
                    {/* Left Column */}
                    <div className="space-y-4">
                      {/* Invoice# */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Invoice#</label>
                        <input
                          type="text"
                          value={searchModalData.invoiceNumber}
                          onChange={(e) => setSearchModalData(prev => ({ ...prev, invoiceNumber: e.target.value }))}
                          className="w-full py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                        />
                      </div>

                      {/* Date Range */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Date Range</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            placeholder="dd/MM/yyyy"
                            value={searchModalData.dateRangeFrom}
                            onChange={(e) => setSearchModalData(prev => ({ ...prev, dateRangeFrom: e.target.value }))}
                            className="flex-1 py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                          />
                          <span className="text-gray-500">-</span>
                          <input
                            type="text"
                            placeholder="dd/MM/yyyy"
                            value={searchModalData.dateRangeTo}
                            onChange={(e) => setSearchModalData(prev => ({ ...prev, dateRangeTo: e.target.value }))}
                            className="flex-1 py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                          />
                        </div>
                      </div>

                      {/* Status */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Status</label>
                        <div className="relative" ref={statusDropdownRef}>
                          <div
                            className={`flex items-center justify-between w-full py-2 px-3 text-sm text-gray-700 bg-white border rounded-md cursor-pointer transition-colors ${isStatusDropdownOpen ? "border-blue-600" : "border-gray-300 hover:border-gray-400"}`}
                            onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
                          >
                            <span className={searchModalData.status ? "text-gray-700" : "text-gray-400"}>
                              {searchModalData.status || "Select"}
                            </span>
                            <ChevronDown size={16} className={`text-gray-500 transition-transform ${isStatusDropdownOpen ? "rotate-180" : ""}`} />
                          </div>
                          {isStatusDropdownOpen && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-blue-600 border-t-0 rounded-b-md shadow-lg z-[1002]">
                              {["All", "Active", "Inactive"].map((status) => (
                                <div
                                  key={status}
                                  className="py-2.5 px-3.5 text-sm text-gray-700 cursor-pointer transition-colors hover:bg-gray-100"
                                  onClick={() => {
                                    setSearchModalData(prev => ({ ...prev, status }));
                                    setIsStatusDropdownOpen(false);
                                  }}
                                >
                                  {status}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Item Description */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Item Description</label>
                        <input
                          type="text"
                          value={searchModalData.itemDescriptionInvoice}
                          onChange={(e) => setSearchModalData(prev => ({ ...prev, itemDescriptionInvoice: e.target.value }))}
                          className="w-full py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                        />
                      </div>

                      {/* Total Range */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Total Range</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={searchModalData.totalRangeFromInvoice}
                            onChange={(e) => setSearchModalData(prev => ({ ...prev, totalRangeFromInvoice: e.target.value }))}
                            className="flex-1 py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                          />
                          <span className="text-gray-500">-</span>
                          <input
                            type="text"
                            value={searchModalData.totalRangeToInvoice}
                            onChange={(e) => setSearchModalData(prev => ({ ...prev, totalRangeToInvoice: e.target.value }))}
                            className="flex-1 py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                          />
                        </div>
                      </div>

                      {/* Project Name */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Project Name</label>
                        <div className="relative" ref={projectNameDropdownRef}>
                          <div
                            className={`flex items-center justify-between w-full py-2 px-3 text-sm text-gray-700 bg-white border rounded-md cursor-pointer transition-colors ${isProjectNameDropdownOpen ? "border-blue-600" : "border-gray-300 hover:border-gray-400"}`}
                            onClick={() => setIsProjectNameDropdownOpen(!isProjectNameDropdownOpen)}
                          >
                            <span className={searchModalData.projectNameInvoice ? "text-gray-700" : "text-gray-400"}>
                              {searchModalData.projectNameInvoice || "Select a project"}
                            </span>
                            <ChevronDown size={16} className={`text-gray-500 transition-transform ${isProjectNameDropdownOpen ? "rotate-180" : ""}`} />
                          </div>
                          {isProjectNameDropdownOpen && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-blue-600 border-t-0 rounded-b-md shadow-lg z-[1002]">
                              <div className="py-2.5 px-3.5 text-sm text-gray-500">No options available</div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Tax Exemptions */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Tax Exemptions</label>
                        <div className="relative" ref={taxExemptionsDropdownRef}>
                          <div
                            className={`flex items-center justify-between w-full py-2 px-3 text-sm text-gray-700 bg-white border rounded-md cursor-pointer transition-colors ${isTaxExemptionsDropdownOpen ? "border-blue-600" : "border-gray-300 hover:border-gray-400"}`}
                            onClick={() => setIsTaxExemptionsDropdownOpen(!isTaxExemptionsDropdownOpen)}
                          >
                            <span className={searchModalData.taxExemptionsInvoice ? "text-gray-700" : "text-gray-400"}>
                              {searchModalData.taxExemptionsInvoice || "Select a Tax Exemption"}
                            </span>
                            <ChevronDown size={16} className={`text-gray-500 transition-transform ${isTaxExemptionsDropdownOpen ? "rotate-180" : ""}`} />
                          </div>
                          {isTaxExemptionsDropdownOpen && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-blue-600 border-t-0 rounded-b-md shadow-lg z-[1002]">
                              <div className="py-2.5 px-3.5 text-sm text-gray-500">No options available</div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right Column */}
                    <div className="space-y-4">
                      {/* Order Number */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Order Number</label>
                        <input
                          type="text"
                          value={searchModalData.orderNumber}
                          onChange={(e) => setSearchModalData(prev => ({ ...prev, orderNumber: e.target.value }))}
                          className="w-full py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                        />
                      </div>

                      {/* Created Between */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Created Between</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            placeholder="dd/MM/yyyy"
                            value={searchModalData.createdBetweenFrom}
                            onChange={(e) => setSearchModalData(prev => ({ ...prev, createdBetweenFrom: e.target.value }))}
                            className="flex-1 py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                          />
                          <span className="text-gray-500">-</span>
                          <input
                            type="text"
                            placeholder="dd/MM/yyyy"
                            value={searchModalData.createdBetweenTo}
                            onChange={(e) => setSearchModalData(prev => ({ ...prev, createdBetweenTo: e.target.value }))}
                            className="flex-1 py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                          />
                        </div>
                      </div>

                      {/* Item Name */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Item Name</label>
                        <div className="relative" ref={itemNameDropdownRef}>
                          <div
                            className={`flex items-center justify-between w-full py-2 px-3 text-sm text-gray-700 bg-white border rounded-md cursor-pointer transition-colors ${isItemNameDropdownOpen ? "border-blue-600" : "border-gray-300 hover:border-gray-400"}`}
                            onClick={() => setIsItemNameDropdownOpen(!isItemNameDropdownOpen)}
                          >
                            <span className={searchModalData.itemNameInvoice ? "text-gray-700" : "text-gray-400"}>
                              {searchModalData.itemNameInvoice || "Select an item"}
                            </span>
                            <ChevronDown size={16} className={`text-gray-500 transition-transform ${isItemNameDropdownOpen ? "rotate-180" : ""}`} />
                          </div>
                          {isItemNameDropdownOpen && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-blue-600 border-t-0 rounded-b-md shadow-lg z-[1002]">
                              <div className="py-2.5 px-3.5 text-sm text-gray-500">No options available</div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Account */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Account</label>
                        <div className="relative" ref={accountDropdownRef}>
                          <div
                            className={`flex items-center justify-between w-full py-2 px-3 text-sm text-gray-700 bg-white border rounded-md cursor-pointer transition-colors ${isAccountDropdownOpen ? "border-blue-600" : "border-gray-300 hover:border-gray-400"}`}
                            onClick={() => setIsAccountDropdownOpen(!isAccountDropdownOpen)}
                          >
                            <span className={searchModalData.account ? "text-gray-700" : "text-gray-400"}>
                              {searchModalData.account || "Select an account"}
                            </span>
                            <ChevronDown size={16} className={`text-gray-500 transition-transform ${isAccountDropdownOpen ? "rotate-180" : ""}`} />
                          </div>
                          {isAccountDropdownOpen && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-blue-600 border-t-0 rounded-b-md shadow-lg z-[1002]">
                              <div className="py-2.5 px-3.5 text-sm text-gray-500">No options available</div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Customer Name */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Customer Name</label>
                        <div className="relative" ref={customerNameDropdownRef}>
                          <div
                            className={`flex items-center justify-between w-full py-2 px-3 text-sm text-gray-700 bg-white border rounded-md cursor-pointer transition-colors ${isCustomerNameDropdownOpen ? "border-blue-600" : "border-gray-300 hover:border-gray-400"}`}
                            onClick={() => setIsCustomerNameDropdownOpen(!isCustomerNameDropdownOpen)}
                          >
                            <span className={searchModalData.customerNameInvoice ? "text-gray-700" : "text-gray-400"}>
                              {searchModalData.customerNameInvoice || "Select customer"}
                            </span>
                            <ChevronDown size={16} className={`text-gray-500 transition-transform ${isCustomerNameDropdownOpen ? "rotate-180" : ""}`} />
                          </div>
                          {isCustomerNameDropdownOpen && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-blue-600 border-t-0 rounded-b-md shadow-lg z-[1002]">
                              <div className="py-2.5 px-3.5 text-sm text-gray-500">No options available</div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Salesperson */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Salesperson</label>
                        <div className="relative" ref={salespersonDropdownRef}>
                          <div
                            className={`flex items-center justify-between w-full py-2 px-3 text-sm text-gray-700 bg-white border rounded-md cursor-pointer transition-colors ${isSalespersonDropdownOpen ? "border-blue-600" : "border-gray-300 hover:border-gray-400"}`}
                            onClick={() => setIsSalespersonDropdownOpen(!isSalespersonDropdownOpen)}
                          >
                            <span className={searchModalData.salespersonInvoice ? "text-gray-700" : "text-gray-400"}>
                              {searchModalData.salespersonInvoice || "Select a salesperson"}
                            </span>
                            <ChevronDown size={16} className={`text-gray-500 transition-transform ${isSalespersonDropdownOpen ? "rotate-180" : ""}`} />
                          </div>
                          {isSalespersonDropdownOpen && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-blue-600 border-t-0 rounded-b-md shadow-lg z-[1002]">
                              <div className="py-2.5 px-3.5 text-sm text-gray-500">No options available</div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Address */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Address</label>
                        <div className="flex items-center gap-3 mb-2">
                          <label className="flex items-center gap-1.5">
                            <input
                              type="radio"
                              name="addressTypeInvoice"
                              value="Billing and Shipping"
                              checked={searchModalData.addressTypeInvoice === "Billing and Shipping"}
                              onChange={(e) => setSearchModalData(prev => ({ ...prev, addressTypeInvoice: e.target.value }))}
                              className="cursor-pointer"
                            />
                            <span className="text-sm text-gray-700">Billing and Shipping</span>
                          </label>
                          <label className="flex items-center gap-1.5">
                            <input
                              type="radio"
                              name="addressTypeInvoice"
                              value="Billing"
                              checked={searchModalData.addressTypeInvoice === "Billing"}
                              onChange={(e) => setSearchModalData(prev => ({ ...prev, addressTypeInvoice: e.target.value }))}
                              className="cursor-pointer"
                            />
                            <span className="text-sm text-gray-700">Billing</span>
                          </label>
                          <label className="flex items-center gap-1.5">
                            <input
                              type="radio"
                              name="addressTypeInvoice"
                              value="Shipping"
                              checked={searchModalData.addressTypeInvoice === "Shipping"}
                              onChange={(e) => setSearchModalData(prev => ({ ...prev, addressTypeInvoice: e.target.value }))}
                              className="cursor-pointer"
                            />
                            <span className="text-sm text-gray-700">Shipping</span>
                          </label>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="relative flex-1">
                            <div
                              className={`flex items-center justify-between w-full py-2 px-3 text-sm text-gray-700 bg-white border rounded-md cursor-pointer transition-colors ${false ? "border-blue-600" : "border-gray-300 hover:border-gray-400"}`}
                            >
                              <span className="text-gray-400">Attention</span>
                              <ChevronDown size={16} className="text-gray-500" />
                            </div>
                          </div>
                          <button className="text-blue-600 text-sm hover:underline">+ Address Line</button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {searchType === "Payments Received" && (
                  <div className="grid grid-cols-2 gap-6">
                    {/* Left Column */}
                    <div className="space-y-4">
                      {/* Customer Name */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Customer Name</label>
                        <div className="relative" ref={customerNameDropdownRef}>
                          <div
                            className={`flex items-center justify-between w-full py-2 px-3 text-sm text-gray-700 bg-white border rounded-md cursor-pointer transition-colors ${isCustomerNameDropdownOpen ? "border-blue-600" : "border-gray-300 hover:border-gray-400"}`}
                            onClick={() => setIsCustomerNameDropdownOpen(!isCustomerNameDropdownOpen)}
                          >
                            <span className={searchModalData.customerName ? "text-gray-700" : "text-gray-400"}>
                              {searchModalData.customerName || "Select customer"}
                            </span>
                            <ChevronDown size={16} className={`text-gray-500 transition-transform ${isCustomerNameDropdownOpen ? "rotate-180" : ""}`} />
                          </div>
                          {isCustomerNameDropdownOpen && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-blue-600 border-t-0 rounded-b-md shadow-lg z-[1002]">
                              <div className="py-2.5 px-3.5 text-sm text-gray-500">No options available</div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Reference# */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Reference#</label>
                        <input
                          type="text"
                          value={searchModalData.referenceNumberPayment}
                          onChange={(e) => setSearchModalData(prev => ({ ...prev, referenceNumberPayment: e.target.value }))}
                          className="w-full py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                        />
                      </div>

                      {/* Total Range */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Total Range</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={searchModalData.totalRangeFromPayment}
                            onChange={(e) => setSearchModalData(prev => ({ ...prev, totalRangeFromPayment: e.target.value }))}
                            className="flex-1 py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                          />
                          <span className="text-gray-500">-</span>
                          <input
                            type="text"
                            value={searchModalData.totalRangeToPayment}
                            onChange={(e) => setSearchModalData(prev => ({ ...prev, totalRangeToPayment: e.target.value }))}
                            className="flex-1 py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                          />
                        </div>
                      </div>

                      {/* Payment Method */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Payment Method</label>
                        <div className="relative" ref={paymentMethodDropdownRef}>
                          <div
                            className={`flex items-center justify-between w-full py-2 px-3 text-sm text-gray-700 bg-white border rounded-md cursor-pointer transition-colors ${isPaymentMethodDropdownOpen ? "border-blue-600" : "border-gray-300 hover:border-gray-400"}`}
                            onClick={() => setIsPaymentMethodDropdownOpen(!isPaymentMethodDropdownOpen)}
                          >
                            <span className={searchModalData.paymentMethod ? "text-gray-700" : "text-gray-400"}>
                              {searchModalData.paymentMethod || "Select"}
                            </span>
                            <ChevronDown size={16} className={`text-gray-500 transition-transform ${isPaymentMethodDropdownOpen ? "rotate-180" : ""}`} />
                          </div>
                          {isPaymentMethodDropdownOpen && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-blue-600 border-t-0 rounded-b-md shadow-lg z-[1002]">
                              <div className="py-2.5 px-3.5 text-sm text-gray-500">No options available</div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right Column */}
                    <div className="space-y-4">
                      {/* Payment # */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Payment #</label>
                        <input
                          type="text"
                          value={searchModalData.paymentNumber}
                          onChange={(e) => setSearchModalData(prev => ({ ...prev, paymentNumber: e.target.value }))}
                          className="w-full py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                        />
                      </div>

                      {/* Date Range */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Date Range</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            placeholder="dd/MM/yyyy"
                            value={searchModalData.dateRangeFromPayment}
                            onChange={(e) => setSearchModalData(prev => ({ ...prev, dateRangeFromPayment: e.target.value }))}
                            className="flex-1 py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                          />
                          <span className="text-gray-500">-</span>
                          <input
                            type="text"
                            placeholder="dd/MM/yyyy"
                            value={searchModalData.dateRangeToPayment}
                            onChange={(e) => setSearchModalData(prev => ({ ...prev, dateRangeToPayment: e.target.value }))}
                            className="flex-1 py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                          />
                        </div>
                      </div>

                      {/* Status */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Status</label>
                        <div className="relative" ref={statusDropdownRef}>
                          <div
                            className={`flex items-center justify-between w-full py-2 px-3 text-sm text-gray-700 bg-white border rounded-md cursor-pointer transition-colors ${isStatusDropdownOpen ? "border-blue-600" : "border-gray-300 hover:border-gray-400"}`}
                            onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
                          >
                            <span className={searchModalData.statusPayment ? "text-gray-700" : "text-gray-400"}>
                              {searchModalData.statusPayment || "Select"}
                            </span>
                            <ChevronDown size={16} className={`text-gray-500 transition-transform ${isStatusDropdownOpen ? "rotate-180" : ""}`} />
                          </div>
                          {isStatusDropdownOpen && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-blue-600 border-t-0 rounded-b-md shadow-lg z-[1002]">
                              {["All", "Active", "Inactive"].map((status) => (
                                <div
                                  key={status}
                                  className="py-2.5 px-3.5 text-sm text-gray-700 cursor-pointer transition-colors hover:bg-gray-100"
                                  onClick={() => {
                                    setSearchModalData(prev => ({ ...prev, statusPayment: status }));
                                    setIsStatusDropdownOpen(false);
                                  }}
                                >
                                  {status}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Notes */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Notes</label>
                        <input
                          type="text"
                          value={searchModalData.notesPayment}
                          onChange={(e) => setSearchModalData(prev => ({ ...prev, notesPayment: e.target.value }))}
                          className="w-full py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Expenses Form */}
                {searchType === "Expenses" && (
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Expense#</label>
                        <input
                          type="text"
                          value={searchModalData.expenseNumber || ""}
                          onChange={(e) => setSearchModalData(prev => ({ ...prev, expenseNumber: e.target.value }))}
                          className="w-full py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Date Range</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            placeholder="dd/MM/yyyy"
                            value={searchModalData.dateRangeFrom || ""}
                            onChange={(e) => setSearchModalData(prev => ({ ...prev, dateRangeFrom: e.target.value }))}
                            className="flex-1 py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                          />
                          <span className="text-gray-500">-</span>
                          <input
                            type="text"
                            placeholder="dd/MM/yyyy"
                            value={searchModalData.dateRangeTo || ""}
                            onChange={(e) => setSearchModalData(prev => ({ ...prev, dateRangeTo: e.target.value }))}
                            className="flex-1 py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Vendor Name</label>
                        <div className="relative" ref={customerNameDropdownRef}>
                          <div
                            className={`flex items-center justify-between w-full py-2 px-3 text-sm text-gray-700 bg-white border rounded-md cursor-pointer transition-colors ${isCustomerNameDropdownOpen ? "border-blue-600" : "border-gray-300 hover:border-gray-400"}`}
                            onClick={() => setIsCustomerNameDropdownOpen(!isCustomerNameDropdownOpen)}
                          >
                            <span className={searchModalData.vendorName ? "text-gray-700" : "text-gray-400"}>
                              {searchModalData.vendorName || "Select vendor"}
                            </span>
                            <ChevronDown size={16} className={`text-gray-500 transition-transform ${isCustomerNameDropdownOpen ? "rotate-180" : ""}`} />
                          </div>
                          {isCustomerNameDropdownOpen && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-blue-600 border-t-0 rounded-b-md shadow-lg z-[1002]">
                              <div className="py-2.5 px-3.5 text-sm text-gray-500">No options available</div>
                            </div>
                          )}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Total Range</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={searchModalData.totalRangeFrom || ""}
                            onChange={(e) => setSearchModalData(prev => ({ ...prev, totalRangeFrom: e.target.value }))}
                            className="flex-1 py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                          />
                          <span className="text-gray-500">-</span>
                          <input
                            type="text"
                            value={searchModalData.totalRangeTo || ""}
                            onChange={(e) => setSearchModalData(prev => ({ ...prev, totalRangeTo: e.target.value }))}
                            className="flex-1 py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                          />
                        </div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Reference#</label>
                        <input
                          type="text"
                          value={searchModalData.referenceNumber || ""}
                          onChange={(e) => setSearchModalData(prev => ({ ...prev, referenceNumber: e.target.value }))}
                          className="w-full py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Status</label>
                        <div className="relative" ref={statusDropdownRef}>
                          <div
                            className={`flex items-center justify-between w-full py-2 px-3 text-sm text-gray-700 bg-white border rounded-md cursor-pointer transition-colors ${isStatusDropdownOpen ? "border-blue-600" : "border-gray-300 hover:border-gray-400"}`}
                            onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
                          >
                            <span>{searchModalData.status || "All"}</span>
                            <ChevronDown size={16} className={`text-gray-500 transition-transform ${isStatusDropdownOpen ? "rotate-180" : ""}`} />
                          </div>
                          {isStatusDropdownOpen && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-blue-600 border-t-0 rounded-b-md shadow-lg z-[1002]">
                              {["All", "Active", "Inactive"].map((status) => (
                                <div
                                  key={status}
                                  className="py-2.5 px-3.5 text-sm text-gray-700 cursor-pointer transition-colors hover:bg-gray-100"
                                  onClick={() => {
                                    setSearchModalData(prev => ({ ...prev, status }));
                                    setIsStatusDropdownOpen(false);
                                  }}
                                >
                                  {status}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Account</label>
                        <div className="relative" ref={accountDropdownRef}>
                          <div
                            className={`flex items-center justify-between w-full py-2 px-3 text-sm text-gray-700 bg-white border rounded-md cursor-pointer transition-colors ${isAccountDropdownOpen ? "border-blue-600" : "border-gray-300 hover:border-gray-400"}`}
                            onClick={() => setIsAccountDropdownOpen(!isAccountDropdownOpen)}
                          >
                            <span className={searchModalData.account ? "text-gray-700" : "text-gray-400"}>
                              {searchModalData.account || "Select an account"}
                            </span>
                            <ChevronDown size={16} className={`text-gray-500 transition-transform ${isAccountDropdownOpen ? "rotate-180" : ""}`} />
                          </div>
                          {isAccountDropdownOpen && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-blue-600 border-t-0 rounded-b-md shadow-lg z-[1002]">
                              <div className="py-2.5 px-3.5 text-sm text-gray-500">No options available</div>
                            </div>
                          )}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Notes</label>
                        <input
                          type="text"
                          value={searchModalData.notes || ""}
                          onChange={(e) => setSearchModalData(prev => ({ ...prev, notes: e.target.value }))}
                          className="w-full py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Recurring Invoices, Credit Notes, Vendors, Recurring Expenses, Purchase Orders, Bills, Payments Made, Recurring Bills, Vendor Credits, Projects, Timesheet, Journals, Chart of Accounts, Documents, Task - Using similar structure */}
                {["Recurring Invoices", "Credit Notes", "Vendors", "Recurring Expenses", "Purchase Orders", "Bills", "Payments Made", "Recurring Bills", "Vendor Credits", "Projects", "Timesheet", "Journals", "Chart of Accounts", "Documents", "Task"].includes(searchType) && (
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">{searchType === "Vendors" ? "Vendor Name" : searchType === "Projects" ? "Project Name" : searchType === "Chart of Accounts" ? "Account Name" : searchType === "Documents" ? "Document Name" : searchType === "Task" ? "Task Name" : `${searchType} Number`}</label>
                        <input
                          type="text"
                          value={searchModalData.referenceNumber || ""}
                          onChange={(e) => setSearchModalData(prev => ({ ...prev, referenceNumber: e.target.value }))}
                          className="w-full py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Date Range</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            placeholder="dd/MM/yyyy"
                            value={searchModalData.dateRangeFrom || ""}
                            onChange={(e) => setSearchModalData(prev => ({ ...prev, dateRangeFrom: e.target.value }))}
                            className="flex-1 py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                          />
                          <span className="text-gray-500">-</span>
                          <input
                            type="text"
                            placeholder="dd/MM/yyyy"
                            value={searchModalData.dateRangeTo || ""}
                            onChange={(e) => setSearchModalData(prev => ({ ...prev, dateRangeTo: e.target.value }))}
                            className="flex-1 py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                          />
                        </div>
                      </div>
                      {searchType !== "Vendors" && searchType !== "Chart of Accounts" && searchType !== "Documents" && searchType !== "Task" && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1.5">{searchType.includes("Payment") ? "Customer Name" : searchType.includes("Bill") || searchType.includes("Expense") || searchType === "Purchase Orders" ? "Vendor Name" : "Customer Name"}</label>
                          <div className="relative" ref={customerNameDropdownRef}>
                            <div
                              className={`flex items-center justify-between w-full py-2 px-3 text-sm text-gray-700 bg-white border rounded-md cursor-pointer transition-colors ${isCustomerNameDropdownOpen ? "border-blue-600" : "border-gray-300 hover:border-gray-400"}`}
                              onClick={() => setIsCustomerNameDropdownOpen(!isCustomerNameDropdownOpen)}
                            >
                              <span className={searchModalData.customerName ? "text-gray-700" : "text-gray-400"}>
                                {searchModalData.customerName || `Select ${searchType.includes("Payment") ? "customer" : searchType.includes("Bill") || searchType.includes("Expense") || searchType === "Purchase Orders" ? "vendor" : "customer"}`}
                              </span>
                              <ChevronDown size={16} className={`text-gray-500 transition-transform ${isCustomerNameDropdownOpen ? "rotate-180" : ""}`} />
                            </div>
                            {isCustomerNameDropdownOpen && (
                              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-blue-600 border-t-0 rounded-b-md shadow-lg z-[1002]">
                                <div className="py-2.5 px-3.5 text-sm text-gray-500">No options available</div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Total Range</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={searchModalData.totalRangeFrom || ""}
                            onChange={(e) => setSearchModalData(prev => ({ ...prev, totalRangeFrom: e.target.value }))}
                            className="flex-1 py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                          />
                          <span className="text-gray-500">-</span>
                          <input
                            type="text"
                            value={searchModalData.totalRangeTo || ""}
                            onChange={(e) => setSearchModalData(prev => ({ ...prev, totalRangeTo: e.target.value }))}
                            className="flex-1 py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                          />
                        </div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Reference#</label>
                        <input
                          type="text"
                          value={searchModalData.referenceNumber || ""}
                          onChange={(e) => setSearchModalData(prev => ({ ...prev, referenceNumber: e.target.value }))}
                          className="w-full py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Status</label>
                        <div className="relative" ref={statusDropdownRef}>
                          <div
                            className={`flex items-center justify-between w-full py-2 px-3 text-sm text-gray-700 bg-white border rounded-md cursor-pointer transition-colors ${isStatusDropdownOpen ? "border-blue-600" : "border-gray-300 hover:border-gray-400"}`}
                            onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
                          >
                            <span>{searchModalData.status || "All"}</span>
                            <ChevronDown size={16} className={`text-gray-500 transition-transform ${isStatusDropdownOpen ? "rotate-180" : ""}`} />
                          </div>
                          {isStatusDropdownOpen && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-blue-600 border-t-0 rounded-b-md shadow-lg z-[1002]">
                              {["All", "Active", "Inactive"].map((status) => (
                                <div
                                  key={status}
                                  className="py-2.5 px-3.5 text-sm text-gray-700 cursor-pointer transition-colors hover:bg-gray-100"
                                  onClick={() => {
                                    setSearchModalData(prev => ({ ...prev, status }));
                                    setIsStatusDropdownOpen(false);
                                  }}
                                >
                                  {status}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      {searchType !== "Vendors" && searchType !== "Chart of Accounts" && searchType !== "Documents" && searchType !== "Task" && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1.5">Account</label>
                          <div className="relative" ref={accountDropdownRef}>
                            <div
                              className={`flex items-center justify-between w-full py-2 px-3 text-sm text-gray-700 bg-white border rounded-md cursor-pointer transition-colors ${isAccountDropdownOpen ? "border-blue-600" : "border-gray-300 hover:border-gray-400"}`}
                              onClick={() => setIsAccountDropdownOpen(!isAccountDropdownOpen)}
                            >
                              <span className={searchModalData.account ? "text-gray-700" : "text-gray-400"}>
                                {searchModalData.account || "Select an account"}
                              </span>
                              <ChevronDown size={16} className={`text-gray-500 transition-transform ${isAccountDropdownOpen ? "rotate-180" : ""}`} />
                            </div>
                            {isAccountDropdownOpen && (
                              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-blue-600 border-t-0 rounded-b-md shadow-lg z-[1002]">
                                <div className="py-2.5 px-3.5 text-sm text-gray-500">No options available</div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Notes</label>
                        <input
                          type="text"
                          value={searchModalData.notes || ""}
                          onChange={(e) => setSearchModalData(prev => ({ ...prev, notes: e.target.value }))}
                          className="w-full py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer Actions */}
              <div className="flex items-center justify-center gap-3 py-4 px-6 border-t border-gray-200 bg-gray-50 rounded-b-lg">
                <button
                  className="py-2.5 px-6 bg-red-600 text-white border-none rounded-md text-sm font-medium cursor-pointer transition-colors hover:bg-red-700"
                  onClick={() => {
                    // TODO: Implement search functionality
                    setIsSearchModalOpen(false);
                  }}
                >
                  Search
                </button>
                <button
                  className="py-2.5 px-6 bg-gray-200 text-gray-700 border-none rounded-md text-sm font-medium cursor-pointer transition-colors hover:bg-gray-300"
                  onClick={() => {
                    setIsSearchModalOpen(false);
                    // Reset search data when canceling
                    resetSearchModalData();
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )
      }

      {/* Export Customers Modal */}
      {
        isExportCustomersModalOpen && (
          <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-[2000]"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setIsExportCustomersModalOpen(false);
              }
            }}
          >
            <div className="bg-white rounded-lg w-[90%] max-w-[600px] max-h-[90vh] flex flex-col shadow-xl">
              <div className="flex items-center justify-between py-5 px-6 border-b border-gray-200">
                <h2 className="m-0 text-xl font-semibold text-gray-900">Export Customers</h2>
                <button
                  className="bg-transparent border-none cursor-pointer p-1 flex items-center justify-center text-blue-600 transition-colors hover:text-red-500"
                  onClick={() => setIsExportCustomersModalOpen(false)}
                >
                  <X size={20} />
                </button>
              </div>
              <div className="p-6 overflow-y-auto flex-1">
                {/* Info Box */}
                <div className="flex items-start gap-3 py-3 px-4 bg-blue-50 rounded-md mb-6 text-sm text-blue-900">
                  <Info size={16} className="flex-shrink-0 mt-0.5" />
                  <span>You can export your data from Zoho Books in CSV, XLS or XLSX format.</span>
                </div>

                {/* Module */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Module<span className="text-red-500 ml-1">*</span>
                  </label>
                  <div className="relative mb-3" ref={moduleDropdownRef}>
                    <div
                      className="flex items-center justify-between py-2.5 px-3 border border-gray-300 rounded-md bg-white cursor-pointer text-sm text-gray-700 transition-colors hover:border-gray-400"
                      onClick={() => setIsModuleDropdownOpen(!isModuleDropdownOpen)}
                    >
                      <span>{exportData.module}</span>
                      <ChevronDown size={16} />
                    </div>
                    {isModuleDropdownOpen && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-[1000] max-h-[300px] overflow-y-auto">
                        {moduleOptions.map((option) => (
                          <div
                            key={option}
                            className="py-2.5 px-3 text-sm text-gray-700 cursor-pointer transition-colors hover:bg-gray-100"
                            onClick={() => {
                              setExportData(prev => ({
                                ...prev,
                                module: option,
                                dataScope: `All ${option}`, // Update data scope when module changes
                                moduleType: option === "Customers" ? "Customers" : prev.moduleType // Reset module type if not Customers
                              }));
                              setIsModuleDropdownOpen(false);
                            }}
                          >
                            {option}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {/* Module Type Radio Buttons - Only show for Customers module */}
                  {exportData.module === "Customers" && (
                    <div className="flex flex-col gap-2 mt-2">
                      <label className="flex items-center gap-2.5 py-2 px-3 border border-gray-200 rounded-md cursor-pointer transition-all text-sm text-gray-700 hover:bg-gray-50 hover:border-gray-300">
                        <input
                          type="radio"
                          name="moduleType"
                          value="Customers"
                          checked={exportData.moduleType === "Customers"}
                          onChange={(e) => setExportData(prev => ({ ...prev, moduleType: e.target.value }))}
                          className="m-0 cursor-pointer accent-blue-600"
                        />
                        <span>Customers</span>
                      </label>
                      <label className="flex items-center gap-2.5 py-2 px-3 border border-gray-200 rounded-md cursor-pointer transition-all text-sm text-gray-700 hover:bg-gray-50 hover:border-gray-300">
                        <input
                          type="radio"
                          name="moduleType"
                          value="Customer's Contact Persons"
                          checked={exportData.moduleType === "Customer's Contact Persons"}
                          onChange={(e) => setExportData(prev => ({ ...prev, moduleType: e.target.value }))}
                          className="m-0 cursor-pointer accent-blue-600"
                        />
                        <span>Customer's Contact Persons</span>
                      </label>
                      <label className="flex items-center gap-2.5 py-2 px-3 border border-gray-200 rounded-md cursor-pointer transition-all text-sm text-gray-700 hover:bg-gray-50 hover:border-gray-300">
                        <input
                          type="radio"
                          name="moduleType"
                          value="Customer's Addresses"
                          checked={exportData.moduleType === "Customer's Addresses"}
                          onChange={(e) => setExportData(prev => ({ ...prev, moduleType: e.target.value }))}
                          className="m-0 cursor-pointer accent-blue-600"
                        />
                        <span>Customer's Addresses</span>
                      </label>
                    </div>
                  )}
                </div>

                {/* Data Scope */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Data Scope
                  </label>
                  <div className="flex flex-col gap-2">
                    <label className="flex items-center gap-2.5 py-2 px-3 border border-gray-200 rounded-md cursor-pointer transition-all text-sm text-gray-700 hover:bg-gray-50 hover:border-gray-300">
                      <input
                        type="radio"
                        name="dataScope"
                        value={`All ${exportData.module}`}
                        checked={exportData.dataScope === `All ${exportData.module}`}
                        onChange={(e) => setExportData(prev => ({ ...prev, dataScope: e.target.value }))}
                        className="m-0 cursor-pointer accent-blue-600"
                      />
                      <span>All {exportData.module}</span>
                    </label>
                    <label className="flex items-center gap-2.5 py-2 px-3 border border-gray-200 rounded-md cursor-pointer transition-all text-sm text-gray-700 hover:bg-gray-50 hover:border-gray-300">
                      <input
                        type="radio"
                        name="dataScope"
                        value="Specific Period"
                        checked={exportData.dataScope === "Specific Period"}
                        onChange={(e) => setExportData(prev => ({ ...prev, dataScope: e.target.value }))}
                        className="m-0 cursor-pointer accent-blue-600"
                      />
                      <span>Specific Period</span>
                    </label>
                  </div>
                </div>

                {/* Decimal Format */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Decimal Format<span className="text-red-500 ml-1">*</span>
                  </label>
                  <div className="relative" ref={decimalFormatDropdownRef}>
                    <div
                      className="flex items-center justify-between py-2.5 px-3 border border-gray-300 rounded-md bg-white cursor-pointer text-sm text-gray-700 transition-colors hover:border-gray-400"
                      onClick={() => setIsDecimalFormatDropdownOpen(!isDecimalFormatDropdownOpen)}
                    >
                      <span>{exportData.decimalFormat}</span>
                      <ChevronDown size={16} />
                    </div>
                    {isDecimalFormatDropdownOpen && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-[1000] max-h-[200px] overflow-y-auto">
                        {decimalFormatOptions.map((format) => (
                          <div
                            key={format}
                            className="py-2.5 px-3 text-sm text-gray-700 cursor-pointer transition-colors hover:bg-gray-100"
                            onClick={() => {
                              setExportData(prev => ({ ...prev, decimalFormat: format }));
                              setIsDecimalFormatDropdownOpen(false);
                            }}
                          >
                            {format}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Export File Format */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Export File Format<span className="text-red-500 ml-1">*</span>
                  </label>
                  <div className="flex flex-col gap-3">
                    <label className="flex items-center gap-2.5 py-3 px-3 border border-gray-200 rounded-md cursor-pointer transition-all text-sm text-gray-700 hover:bg-gray-50 hover:border-gray-300">
                      <input
                        type="radio"
                        name="fileFormat"
                        value="csv"
                        checked={exportData.fileFormat === "csv"}
                        onChange={(e) => setExportData(prev => ({ ...prev, fileFormat: e.target.value }))}
                        className="m-0 cursor-pointer accent-blue-600"
                      />
                      <span>CSV (Comma Separated Value)</span>
                    </label>
                    <label className="flex items-center gap-2.5 py-3 px-3 border border-gray-200 rounded-md cursor-pointer transition-all text-sm text-gray-700 hover:bg-gray-50 hover:border-gray-300">
                      <input
                        type="radio"
                        name="fileFormat"
                        value="xls"
                        checked={exportData.fileFormat === "xls"}
                        onChange={(e) => setExportData(prev => ({ ...prev, fileFormat: e.target.value }))}
                        className="m-0 cursor-pointer accent-blue-600"
                      />
                      <span>XLS (Microsoft Excel 1997-2004 Compatible)</span>
                    </label>
                    <label className="flex items-center gap-2.5 py-3 px-3 border border-gray-200 rounded-md cursor-pointer transition-all text-sm text-gray-700 hover:bg-gray-50 hover:border-gray-300">
                      <input
                        type="radio"
                        name="fileFormat"
                        value="xlsx"
                        checked={exportData.fileFormat === "xlsx"}
                        onChange={(e) => setExportData(prev => ({ ...prev, fileFormat: e.target.value }))}
                        className="m-0 cursor-pointer accent-blue-600"
                      />
                      <span>XLSX (Microsoft Excel)</span>
                    </label>
                  </div>
                  {/* Include PII Checkbox */}
                  <div className="mt-3">
                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={exportData.includePII}
                        onChange={(e) => setExportData(prev => ({ ...prev, includePII: e.target.checked }))}
                        className="m-0 cursor-pointer accent-blue-600"
                      />
                      <span className="text-sm text-gray-700">Include Sensitive Personally Identifiable Information (PII) while exporting.</span>
                    </label>
                  </div>
                </div>

                {/* File Protection Password */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    File Protection Password
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type={exportData.showPassword ? "text" : "password"}
                      className="w-full py-2.5 px-3 pr-10 border border-gray-300 rounded-md text-sm text-gray-700 transition-colors focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                      value={exportData.password}
                      onChange={(e) => setExportData(prev => ({ ...prev, password: e.target.value }))}
                      placeholder="Enter password"
                    />
                    <button
                      type="button"
                      className="absolute right-3 bg-transparent border-none cursor-pointer p-1 flex items-center justify-center text-gray-500 transition-colors hover:text-gray-700"
                      onClick={handleTogglePasswordVisibility}
                    >
                      {exportData.showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  <p className="mt-2 text-xs text-gray-600 leading-relaxed">
                    Your password must be at least 12 characters and include one uppercase letter, lowercase letter, number, and special character.
                  </p>
                </div>

                {/* Note */}
                <div className="mt-6 p-4 bg-gray-50 rounded-md text-sm text-gray-700 leading-relaxed">
                  <strong>Note:</strong> You can export only the first 25,000 rows. If you have more rows, please initiate a backup for the data in your Zoho Books organization, and download it.{" "}
                  <a href="#" className="text-blue-600 no-underline font-medium hover:underline">Backup Your Data</a>
                </div>
              </div>
              <div className="flex items-center justify-start gap-3 py-5 px-6 border-t border-gray-200">
                <button
                  className="py-2.5 px-5 bg-[#156372] text-white border-none rounded-md text-sm font-medium cursor-pointer transition-colors hover:bg-[#0f4f5a]"
                  onClick={handleExportCustomers}
                >
                  Export
                </button>
                <button
                  className="py-2.5 px-5 bg-white text-gray-700 border border-gray-300 rounded-md text-sm font-medium cursor-pointer transition-all hover:bg-gray-50 hover:border-gray-400"
                  onClick={() => setIsExportCustomersModalOpen(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )
      }

      {/* Receivables Dropdown Overlay - Rendered outside table to avoid clipping */}
      {
        openReceivablesDropdownId && displayedCustomers.find(c => c.id === openReceivablesDropdownId) && (
          <div
            ref={receivablesDropdownRef}
            className="fixed bg-transparent z-[10000]"
            style={{
              top: `${receivablesDropdownPosition.top}px`,
              left: `${receivablesDropdownPosition.left}px`
            }}
            onMouseEnter={() => {
              const customer = displayedCustomers.find(c => c.id === openReceivablesDropdownId);
              if (customer) setHoveredRowId(customer.id);
            }}
            onMouseLeave={() => {
              setOpenReceivablesDropdownId(null);
              setHoveredRowId(null);
            }}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (openReceivablesDropdownId) {
                  navigate(`/sales/customers/${openReceivablesDropdownId}/edit`);
                }
                setOpenReceivablesDropdownId(null);
                setHoveredRowId(null);
              }}
              className="flex items-center gap-2 py-2 px-4 bg-[#156372] text-white border border-white rounded-md text-sm font-medium cursor-pointer transition-all hover:bg-[#0f4f5a] shadow-lg"
            >
              <Edit size={16} className="text-white" />
              Edit
            </button>
          </div>
        )
      }

      {/* Delete Customer Confirmation Modal */}
      {
        isDeleteModalOpen && (
          <div
            className="fixed inset-0 bg-transparent flex items-center justify-center z-[2000]"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setIsDeleteModalOpen(false);
                setDeleteCustomerId(null);
              }
            }}
          >
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
              <div className="p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Delete Customer</h2>
                <p className="text-gray-700 mb-6">
                  Are you sure you want to delete this customer? This action cannot be undone.
                </p>
                <div className="flex items-center justify-end gap-3">
                  <button
                    onClick={() => {
                      setIsDeleteModalOpen(false);
                      setDeleteCustomerId(null);
                    }}
                    disabled={isDeletingCustomer}
                    className={`px-6 py-2.5 bg-gray-200 text-gray-700 rounded-md text-sm font-medium cursor-pointer transition-colors hover:bg-gray-300 ${isDeletingCustomer ? "opacity-70 cursor-not-allowed" : ""}`}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmDeleteCustomer}
                    disabled={isDeletingCustomer}
                    className={`px-6 py-2.5 bg-red-600 text-white rounded-md text-sm font-medium cursor-pointer transition-colors hover:bg-red-700 flex items-center gap-2 ${isDeletingCustomer ? "opacity-70 cursor-not-allowed" : ""}`}
                  >
                    {isDeletingCustomer && <Loader2 size={14} className="animate-spin" />}
                    {isDeletingCustomer ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      }

      {/* Bulk Delete Confirmation Modal */}
      {
        isBulkDeleteModalOpen && (
          <div
            className="fixed inset-0 bg-transparent flex items-center justify-center z-[2000]"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setIsBulkDeleteModalOpen(false);
                setDeleteCustomerIds([]);
              }
            }}
          >
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
              <div className="p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Delete Customers</h2>
                <p className="text-gray-700 mb-6">
                  Are you sure you want to delete {deleteCustomerIds.length} customer(s)? This action cannot be undone.
                </p>
                <div className="flex items-center justify-end gap-3">
                  <button
                    onClick={() => {
                      setIsBulkDeleteModalOpen(false);
                      setDeleteCustomerIds([]);
                    }}
                    disabled={isBulkDeletingCustomers}
                    className={`px-6 py-2.5 bg-gray-200 text-gray-700 rounded-md text-sm font-medium cursor-pointer transition-colors hover:bg-gray-300 ${isBulkDeletingCustomers ? "opacity-70 cursor-not-allowed" : ""}`}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmBulkDelete}
                    disabled={isBulkDeletingCustomers}
                    className={`px-6 py-2.5 bg-red-600 text-white rounded-md text-sm font-medium cursor-pointer transition-colors hover:bg-red-700 flex items-center gap-2 ${isBulkDeletingCustomers ? "opacity-70 cursor-not-allowed" : ""}`}
                  >
                    {isBulkDeletingCustomers && <Loader2 size={14} className="animate-spin" />}
                    {isBulkDeletingCustomers ? "Deleting..." : `Delete ${deleteCustomerIds.length} Customer(s)`}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      }

      {/* Bulk Consolidated Billing Confirmation Modal */}
      {
        bulkConsolidatedAction && (
          <div
            className="fixed inset-0 bg-black/50 z-[2000] flex items-start justify-center pt-16 pb-10 overflow-y-auto"
            onClick={(e) => {
              if (e.target === e.currentTarget && !isBulkConsolidatedUpdating) {
                setBulkConsolidatedAction(null);
              }
            }}
          >
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 overflow-hidden">
              <div className="flex items-start justify-between gap-4 p-6 border-b border-gray-200">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-full bg-orange-50 text-orange-600">
                    <AlertTriangle size={18} />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">
                      {bulkConsolidatedAction === "enable" ? "Enable Consolidated Billing?" : "Disable Consolidated Billing?"}
                    </h2>
                  </div>
                </div>
                <button
                  className="p-2 text-gray-500 hover:text-gray-700 cursor-pointer"
                  onClick={() => setBulkConsolidatedAction(null)}
                  disabled={isBulkConsolidatedUpdating}
                  aria-label="Close"
                  title="Close"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-6">
                <p className="text-sm text-gray-700 leading-relaxed">
                  Invoices will be {bulkConsolidatedAction === "enable" ? "consolidated" : "separated"} for the selected customers. Any invoices that were generated already will not be affected.
                </p>

                <div className="mt-8 flex items-center justify-start gap-3">
                  <button
                    onClick={confirmBulkConsolidatedBilling}
                    disabled={isBulkConsolidatedUpdating}
                    className={`px-5 py-2.5 bg-blue-600 text-white rounded-md text-sm font-medium cursor-pointer transition-colors hover:bg-blue-700 flex items-center gap-2 ${isBulkConsolidatedUpdating ? "opacity-70 cursor-not-allowed" : ""}`}
                  >
                    {isBulkConsolidatedUpdating && <Loader2 size={14} className="animate-spin" />}
                    {bulkConsolidatedAction === "enable" ? "Enable Now" : "Disable Now"}
                  </button>
                  <button
                    onClick={() => setBulkConsolidatedAction(null)}
                    disabled={isBulkConsolidatedUpdating}
                    className={`px-5 py-2.5 bg-gray-100 text-gray-700 rounded-md text-sm font-medium cursor-pointer transition-colors hover:bg-gray-200 ${isBulkConsolidatedUpdating ? "opacity-70 cursor-not-allowed" : ""}`}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      }

      {/* Preferences Sidebar */}
      {
        (isPreferencesOpen || isFieldCustomizationOpen) && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-end">
            <div className="w-full max-w-2xl bg-white h-full overflow-y-auto shadow-xl">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-white sticky top-0 z-10">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setActivePreferencesTab("preferences")}
                    className={`px-4 py-2 text-sm font-medium ${activePreferencesTab === "preferences"
                      ? "text-blue-600 border-b-2 border-blue-600"
                      : "text-gray-600 hover:text-gray-900"
                      }`}
                  >
                    Preferences
                  </button>
                  <button
                    onClick={() => setActivePreferencesTab("field-customization")}
                    className={`px-4 py-2 text-sm font-medium ${activePreferencesTab === "field-customization"
                      ? "text-blue-600 border-b-2 border-blue-600"
                      : "text-gray-600 hover:text-gray-900"
                      }`}
                  >
                    Field Customization
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <button className="text-sm text-blue-600 hover:text-blue-700">All Preferences</button>
                  <button
                    onClick={() => {
                      setIsPreferencesOpen(false);
                      setIsFieldCustomizationOpen(false);
                    }}
                    className="p-2 text-gray-500 hover:text-gray-700 cursor-pointer"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* Preferences Tab Content */}
              {activePreferencesTab === "preferences" && (
                <div className="p-6">
                  {/* General Settings */}
                  <div className="mb-6">
                    <div className="mb-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={preferences.allowEditingSentInvoice}
                          onChange={(e) => setPreferences(prev => ({ ...prev, allowEditingSentInvoice: e.target.checked }))}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                        />
                        <span className="text-sm text-gray-700">Allow editing of Sent Invoice?</span>
                      </label>
                    </div>
                    <div className="mb-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={preferences.associateExpenseReceipts}
                          onChange={(e) => setPreferences(prev => ({ ...prev, associateExpenseReceipts: e.target.checked }))}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                        />
                        <span className="text-sm text-gray-700">Associate and display expense receipts in Invoice PDF</span>
                      </label>
                    </div>
                  </div>

                  {/* Payments Section */}
                  <div className="mb-6 pb-6 border-b border-gray-200">
                    <h3 className="text-sm font-semibold text-gray-900 mb-4">Payments</h3>
                    <div className="space-y-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={preferences.notifyOnOnlinePayment}
                          onChange={(e) => setPreferences(prev => ({ ...prev, notifyOnOnlinePayment: e.target.checked }))}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                        />
                        <span className="text-sm text-gray-700">Get notified when customers pay online</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={preferences.includePaymentReceipt}
                          onChange={(e) => setPreferences(prev => ({ ...prev, includePaymentReceipt: e.target.checked }))}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                        />
                        <span className="text-sm text-gray-700">Do you want to include the payment receipt along with the Thank You note?</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={preferences.automateThankYouNote}
                          onChange={(e) => setPreferences(prev => ({ ...prev, automateThankYouNote: e.target.checked }))}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                        />
                        <span className="text-sm text-gray-700">Automate thank you note to customer on receipt of online payment</span>
                      </label>
                    </div>
                  </div>

                  {/* Invoice QR Code Section */}
                  <div className="mb-6 pb-6 border-b border-gray-200">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-semibold text-gray-900">Invoice QR Code</h3>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">{preferences.invoiceQRCodeEnabled ? "Enabled" : "Disabled"}</span>
                        <button
                          onClick={() => setPreferences(prev => ({ ...prev, invoiceQRCodeEnabled: !prev.invoiceQRCodeEnabled }))}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${preferences.invoiceQRCodeEnabled ? "bg-blue-600" : "bg-gray-300"
                            }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${preferences.invoiceQRCodeEnabled ? "translate-x-6" : "translate-x-1"
                              }`}
                          />
                        </button>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600">
                      Enable and configure the QR code you want to display on the PDF copy of an Invoice. Your customers can scan the QR code using their device to access the URL or other information that you configure.
                    </p>
                  </div>

                  {/* Zero-Value Line Items Section */}
                  <div className="mb-6 pb-6 border-b border-gray-200">
                    <h3 className="text-sm font-semibold text-gray-900 mb-4">Zero-Value Line Items</h3>
                    <label className="flex items-start gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={preferences.hideZeroValueLineItems}
                        onChange={(e) => setPreferences(prev => ({ ...prev, hideZeroValueLineItems: e.target.checked }))}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer mt-0.5"
                      />
                      <div className="flex-1">
                        <span className="text-sm text-gray-700">Hide zero-value line items</span>
                        <p className="text-sm text-gray-600 mt-1">
                          Choose whether you want to hide zero-value line items in an invoice's PDF and the Customer Portal. They will still be visible while editing an invoice. This setting will not apply to invoices whose total is zero.
                        </p>
                      </div>
                    </label>
                  </div>

                  {/* Terms & Conditions Section */}
                  <div className="mb-6">
                    <h3 className="text-sm font-semibold text-gray-900 mb-2">Terms & Conditions</h3>
                    <textarea
                      value={preferences.termsAndConditions}
                      onChange={(e) => setPreferences(prev => ({ ...prev, termsAndConditions: e.target.value }))}
                      className="w-full px-4 py-3 border border-blue-200 rounded-md text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y min-h-[200px]"
                      placeholder="Enter terms and conditions..."
                    />
                  </div>

                  {/* Customer Notes Section */}
                  <div className="mb-6">
                    <h3 className="text-sm font-semibold text-gray-900 mb-2">Customer Notes</h3>
                    <textarea
                      value={preferences.customerNotes}
                      onChange={(e) => setPreferences(prev => ({ ...prev, customerNotes: e.target.value }))}
                      className="w-full px-4 py-3 border border-blue-200 rounded-md text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y min-h-[200px]"
                      placeholder="Enter customer notes..."
                    />
                  </div>

                  {/* Save Button */}
                  <div className="flex items-center justify-start pt-4 border-t border-gray-200">
                    <button
                      onClick={() => {
                        // TODO: Save preferences to localStorage or backend
                        toast.success("Preferences saved successfully!");
                        setIsPreferencesOpen(false);
                      }}
                      className="px-6 py-2 bg-[#156372] text-white rounded-md text-sm font-medium cursor-pointer hover:bg-[#0f4f5a]"
                    >
                      Save
                    </button>
                  </div>
                </div>
              )}

              {/* Field Customization Tab Content */}
              {activePreferencesTab === "field-customization" && (
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-semibold text-gray-900">Custom Fields</h2>
                    <button className="flex items-center gap-2 px-4 py-2 bg-[#156372] text-white rounded-md text-sm font-medium cursor-pointer hover:bg-[#0f4f5a]">
                      <Plus size={16} />
                      New
                    </button>
                  </div>

                  {/* Table */}
                  <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                    <table className="w-full border-collapse text-sm">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">FIELD NAME</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">DATA TYPE</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">MANDATORY</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">SHOW IN ALL PDFS</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">STATUS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {customFields.map((field) => (
                          <tr
                            key={field.id}
                            className={`border-b border-gray-200 hover:bg-gray-50 ${field.name === "Reference" ? "cursor-pointer" : ""
                              }`}
                            onClick={() => {
                              if (field.name === "Reference") {
                                setIsPreferencesOpen(true);
                                setActivePreferencesTab("preferences");
                              }
                            }}
                          >
                            <td className="px-4 py-3 text-gray-900">
                              <div className="flex items-center gap-2">
                                {field.isLocked && <Lock size={14} className="text-gray-400" />}
                                <span>{field.name}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-gray-700">{field.dataType}</td>
                            <td className="px-4 py-3 text-gray-700">{field.mandatory ? "Yes" : "No"}</td>
                            <td className="px-4 py-3 text-gray-700">{field.showInPDF ? "Yes" : "No"}</td>
                            <td className="px-4 py-3">
                              <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">
                                {field.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        )
      }

      {/* Import Customers Modal */}
      {
        isImportModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000]" onClick={() => {
            setIsImportContinueLoading(false);
            setIsImportModalOpen(false);
          }}>
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">Import Customers</h2>
                <button
                  onClick={() => {
                    setIsImportContinueLoading(false);
                    setIsImportModalOpen(false);
                  }}
                  disabled={isImportContinueLoading}
                  className={`text-red-500 hover:text-red-600 transition-colors ${isImportContinueLoading ? "opacity-70 cursor-not-allowed" : ""}`}
                >
                  <X size={24} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6">
                <p className="text-sm text-gray-700 mb-6">
                  You can import contacts into Zoho Books from a .CSV or .TSV or .XLS file.
                </p>

                {/* Radio Buttons */}
                <div className="space-y-4">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="importType"
                      value="customers"
                      checked={importType === "customers"}
                      onChange={(e) => setImportType(e.target.value)}
                      className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-900">Customers</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="importType"
                      value="contactPersons"
                      checked={importType === "contactPersons"}
                      onChange={(e) => setImportType(e.target.value)}
                      className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-900">Customer's Contact Persons</span>
                  </label>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
                <button
                  onClick={() => {
                    setIsImportContinueLoading(false);
                    setIsImportModalOpen(false);
                  }}
                  disabled={isImportContinueLoading}
                  className={`px-6 py-2 bg-white border border-gray-200 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-50 transition-colors ${isImportContinueLoading ? "opacity-70 cursor-not-allowed" : ""}`}
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setIsImportContinueLoading(true);
                    setIsImportModalOpen(false);
                    navigate("/sales/customers/import");
                  }}
                  disabled={isImportContinueLoading}
                  className={`px-6 py-2 bg-[#156372] text-white rounded-md text-sm font-medium hover:bg-[#0f4f5a] transition-colors flex items-center gap-2 ${isImportContinueLoading ? "opacity-70 cursor-not-allowed" : ""}`}
                >
                  {isImportContinueLoading && <Loader2 size={14} className="animate-spin" />}
                  {isImportContinueLoading ? "Loading..." : "Continue"}
                </button>
              </div>
            </div>
          </div>
        )
      }
      {
        isCustomizeModalOpen && (
          <div className="fixed inset-0 bg-black/50 z-[2000] flex items-center justify-center p-4">
              <div className="bg-white rounded shadow-2xl w-[500px] max-h-[85vh] flex flex-col overflow-hidden">
                {/* Modal Header */}
                <div className="flex items-center justify-between px-5 py-3 bg-[#f6f7fb] border-b border-[#e6e9f2]">
                  <div className="flex items-center gap-2">
                    <SlidersHorizontal size={16} className="text-[#1b5e6a]" />
                    <h3 className="text-[15px] font-medium text-[#313131]">Customize Columns</h3>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[13px] text-gray-600">
                      {columns.filter((c) => c.visible).length} of {columns.length} Selected
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsCustomizeModalOpen(false)}
                      className="h-6 w-6 flex items-center justify-center text-red-500 hover:bg-red-50 rounded transition-colors"
                      aria-label="Close"
                      title="Close"
                    >
                      <X size={16} className="text-red-500" strokeWidth={2.5} />
                    </button>
                  </div>
                </div>

              {/* Search */}
              <div className="p-4 border-b border-gray-50">
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search"
                    className="w-full bg-white border border-gray-200 rounded py-2 pl-9 pr-4 text-sm focus:outline-none focus:border-blue-400 transition-all placeholder:text-gray-400 text-gray-700"
                    value={columnSearch}
                    onChange={(e) => setColumnSearch(e.target.value)}
                  />
                </div>
              </div>

              {/* Columns List */}
              <div className="flex-1 overflow-y-auto px-4 py-2 bg-[#fcfcfc] scrollbar-thin scrollbar-thumb-gray-200">
                <div className="space-y-1.5">
                  {columns
                    .filter(c => c.label.toLowerCase().includes(columnSearch.toLowerCase()))
                    .map((col, index) => (
                      <div
                        key={col.key}
                        draggable={col.key !== 'name'}
                        onDragStart={(e) => e.dataTransfer.setData('text/plain', index.toString())}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          const dragIndex = parseInt(e.dataTransfer.getData('text/plain'));
                          handleReorder(dragIndex, index);
                        }}
                        className={`flex items-center gap-3 p-2 rounded transition-all ${col.key === 'name' ? 'bg-[#f4f4f4] border-transparent cursor-default py-3' : 'bg-[#fff] border border-transparent hover:border-gray-200 hover:bg-gray-50/50'}`}
                      >
                        <div className="flex items-center gap-4 flex-1">
                          <div className={`cursor-grab active:cursor-grabbing text-gray-400 flex-shrink-0 ${col.key === 'name' ? 'invisible' : ''}`}>
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <circle cx="2" cy="2" r="1" fill="currentColor" />
                              <circle cx="2" cy="6" r="1" fill="currentColor" />
                              <circle cx="2" cy="10" r="1" fill="currentColor" />
                              <circle cx="6" cy="2" r="1" fill="currentColor" />
                              <circle cx="6" cy="6" r="1" fill="currentColor" />
                              <circle cx="6" cy="10" r="1" fill="currentColor" />
                            </svg>
                          </div>

                          <div className="flex items-center gap-3">
                            {col.key === 'name' ? (
                              <Lock size={14} className="text-gray-400" />
                            ) : (
                              <input
                                type="checkbox"
                                checked={col.visible}
                                onChange={() => handleToggleColumn(col.key)}
                                className="cursor-pointer h-4 w-4 rounded border-gray-300 text-blue-500 focus:ring-blue-500"
                              />
                            )}
                            <span className={`text-sm ${col.key === 'name' ? 'text-gray-500' : 'text-gray-700'}`}>
                              {col.label}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-gray-100 flex items-center justify-start gap-2 bg-white sticky bottom-0">
                <button
                  onClick={() => {
                    handleSaveLayout();
                    setIsCustomizeModalOpen(false);
                  }}
                  className="px-5 py-2 bg-[#156372] text-white rounded text-sm font-medium hover:bg-[#0f4f5a] transition-colors"
                >
                  Save
                </button>
                <button
                  onClick={() => setIsCustomizeModalOpen(false)}
                  className="px-5 py-2 bg-white border border-gray-300 text-gray-700 rounded text-sm font-medium hover:bg-gray-50 transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )
      }
    </div >
  );
}
