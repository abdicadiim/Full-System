import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { getCachedCustomersPage, getCustomViews } from "../customersDbModel";
import { customersAPI, taxesAPI, reportingTagsAPI, currenciesAPI } from "../../services/api";
import FieldCustomization from "../shared/FieldCustomization";
import { usePaymentTermsDropdown } from "../../../hooks/usePaymentTermsDropdown";
import { toast } from "react-toastify";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { ChevronDown, ChevronUp, Plus, MoreVertical, Search, ArrowUpDown, Filter, Star, X, Trash2, Download, Upload, Settings, RefreshCw, ChevronRight, ChevronLeft, GripVertical, Lock, Users, FileText, Check, Eye, EyeOff, Info, Layers, Edit, ClipboardList, SlidersHorizontal, Layout, AlignLeft, RotateCcw, Pin, PinOff, Loader2, AlertTriangle } from "lucide-react";
import SearchableDropdown from "../../components/ui/SearchableDropdown";
import { useSettings } from "../../lib/settings/SettingsContext";


export function useCustomersState(controller: any = {}) {
  const navigate = useNavigate();
  const location = useLocation();
  const { settings } = useSettings();
  const organizationName = String(settings?.general?.companyDisplayName || settings?.general?.schoolDisplayName || "").trim() || "Organization";
  const organizationNameHtml = organizationName.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const AUTH_URL = (import.meta as any).env?.VITE_AUTH_URL || "http://localhost:5172";
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
  return {
    AUTH_URL, DEFAULT_COLUMNS, LOCAL_COLUMNS_LAYOUT_KEY, accountDropdownRef, accountsReceivableDropdownRef, accountsReceivableOptions,
    accountsReceivableSearch, activePreferencesTab, adjustmentTypeDropdownRef, availableReportingTags, bulkConsolidatedAction, bulkMoreMenuRef,
    bulkUpdateData, closeBulkUpdateDropdowns, columnSearch, columns, comparatorSearch, criteria,
    currencyDropdownRef, currencyOptions, currencySearch, currentPage, customFields, customViews,
    customerLanguageDropdownRef, customerLanguageSearch, customerNameDropdownRef, customerTypeDropdownRef, customers, decimalFormatDropdownRef,
    deleteCustomerId, deleteCustomerIds, dropdownRef, exportData, favoriteViews, fieldSearch,
    filterDropdownRef, getCustomerFieldValue, getSearchFilterOptions, handleCancelLayout, handleReorder, handleResetColumnWidths,
    handleSaveLayout, handleToggleColumn, handleTogglePin, hasResized, hasValue, hoveredRowId,
    hoveredView, importType, isAccountDropdownOpen, isAccountsReceivableDropdownOpen, isAdjustmentTypeDropdownOpen, isBulkConsolidatedUpdating,
    isBulkDeleteModalOpen, isBulkDeletingCustomers, isBulkMoreMenuOpen, isBulkUpdateModalOpen, isComparatorDropdownOpen, isCurrencyDropdownOpen,
    isCustomerLanguageDropdownOpen, isCustomerNameDropdownOpen, isCustomerTypeDropdownOpen, isCustomizeModalOpen, isDecimalFormatDropdownOpen, isDeleteModalOpen,
    isDeletingCustomer, isDownloading, isDropdownOpen, isExportCurrentViewModalOpen, isExportCustomersModalOpen, isFavorite,
    isFieldCustomizationOpen, isFieldDropdownOpen, isFilterDropdownOpen, isImportContinueLoading, isImportModalOpen, isItemNameDropdownOpen,
    isLoading, isMergeCustomerDropdownOpen, isMergeModalOpen, isModalOpen, isModuleDropdownOpen, isMoreMenuOpen,
    isMoreOptionsDropdownOpen, isPaymentMethodDropdownOpen, isPreferencesOpen, isPrintModalOpen, isPrintPreviewOpen, isProjectNameDropdownOpen,
    isPurchaseAccountDropdownOpen, isRefreshing, isSalesAccountDropdownOpen, isSalespersonDropdownOpen, isSearchHeaderDropdownOpen, isSearchModalOpen,
    isSearchTypeDropdownOpen, isSortBySubmenuOpen, isStatusDropdownOpen, isTaxExemptionsDropdownOpen, isTaxRateDropdownOpen, isTransactionTypeDropdownOpen,
    itemNameDropdownRef, itemsPerPage, loadPriceLists, loadReportingTags, location, mergeCustomerDropdownRef,
    mergeCustomerSearch, mergeTargetCustomer, modalRef, moduleDropdownRef, moreMenuRef, moreOptionsDropdownRef,
    navigate, newViewName, normalizeReportingTagAppliesTo, normalizeReportingTagOptions, openReceivablesDropdownId, openSearchModalForCurrentContext,
    organizationName, organizationNameHtml, originalColumns, paymentMethodDropdownRef, paymentTermsHook, pickFirstValue,
    portalLanguageOptions, preferences, priceLists, printDateRange, printPreviewContent, projectNameDropdownRef,
    purchaseAccountDropdownRef, receivablesDropdownPosition, receivablesDropdownRef, receivablesDropdownRefs, resetSearchModalData, resizingRef,
    salesAccountDropdownRef, salespersonDropdownRef, searchHeaderDropdownRef, searchModalData, searchModalFilter, searchType,
    searchTypeDropdownRef, searchTypeOptions, selectedColumns, selectedCustomers, selectedView, setAccountsReceivableSearch,
    setActivePreferencesTab, setAvailableReportingTags, setBulkConsolidatedAction, setBulkUpdateData, setColumnSearch, setColumnWidth,
    setColumns, setComparatorSearch, setCriteria, setCurrencyOptions, setCurrencySearch, setCurrentPage,
    setCustomFields, setCustomViews, setCustomerLanguageSearch, setCustomers, setDeleteCustomerId, setDeleteCustomerIds,
    setExportData, setFavoriteViews, setFieldSearch, setHasResized, setHoveredRowId, setHoveredView,
    setImportType, setIsAccountDropdownOpen, setIsAccountsReceivableDropdownOpen, setIsAdjustmentTypeDropdownOpen, setIsBulkConsolidatedUpdating, setIsBulkDeleteModalOpen,
    setIsBulkDeletingCustomers, setIsBulkMoreMenuOpen, setIsBulkUpdateModalOpen, setIsComparatorDropdownOpen, setIsCurrencyDropdownOpen, setIsCustomerLanguageDropdownOpen,
    setIsCustomerNameDropdownOpen, setIsCustomerTypeDropdownOpen, setIsCustomizeModalOpen, setIsDecimalFormatDropdownOpen, setIsDeleteModalOpen, setIsDeletingCustomer,
    setIsDownloading, setIsDropdownOpen, setIsExportCurrentViewModalOpen, setIsExportCustomersModalOpen, setIsFavorite, setIsFieldCustomizationOpen,
    setIsFieldDropdownOpen, setIsFilterDropdownOpen, setIsImportContinueLoading, setIsImportModalOpen, setIsItemNameDropdownOpen, setIsLoading,
    setIsMergeCustomerDropdownOpen, setIsMergeModalOpen, setIsModalOpen, setIsModuleDropdownOpen, setIsMoreMenuOpen, setIsMoreOptionsDropdownOpen,
    setIsPaymentMethodDropdownOpen, setIsPreferencesOpen, setIsPrintModalOpen, setIsPrintPreviewOpen, setIsProjectNameDropdownOpen, setIsPurchaseAccountDropdownOpen,
    setIsRefreshing, setIsSalesAccountDropdownOpen, setIsSalespersonDropdownOpen, setIsSearchHeaderDropdownOpen, setIsSearchModalOpen, setIsSearchTypeDropdownOpen,
    setIsSortBySubmenuOpen, setIsStatusDropdownOpen, setIsTaxExemptionsDropdownOpen, setIsTaxRateDropdownOpen, setIsTransactionTypeDropdownOpen, setItemsPerPage,
    setMergeCustomerSearch, setMergeTargetCustomer, setNewViewName, setOpenReceivablesDropdownId, setOriginalColumns, setPreferences,
    setPriceLists, setPrintDateRange, setPrintPreviewContent, setReceivablesDropdownPosition, setSearchModalData, setSearchModalFilter,
    setSearchType, setSelectedColumns, setSelectedCustomers, setSelectedView, setSortConfig, setTaxRateOptions,
    setTaxRateSearch, setTotalItems, setTotalPages, setViewSearchQuery, setVisibilityPreference, settings,
    sortConfig, startResizing, statusDropdownRef, tableMinWidth, taxExemptionsDropdownRef, taxRateDropdownRef,
    taxRateOptions, taxRateSearch, totalItems, totalPages, transactionTypeDropdownRef, viewSearchQuery,
    visibilityPreference, visibleColumns
  };
}
