import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import LoadingSpinner from "../../../components/LoadingSpinner";
import { getCreditNotes, getCustomViews, deleteCustomView, getCreditNoteById, updateCreditNote } from "../salesModel";
import FieldCustomization from "../../shared/FieldCustomization";
import { settingsAPI, currenciesAPI } from "../../../services/api";
import { downloadCreditNotesPdf } from "./creditNotePdf";
import {
  ChevronDown,
  ChevronRight,
  Plus,
  MoreVertical,
  ArrowUpDown,
  Settings,
  RefreshCw,
  Search,
  Star,
  Grid3x3,
  X,
  FileText,
  Square,
  CheckSquare,
  Pencil,
  Upload,
  Download,
  RotateCcw,
  Trash2,
  Eye,
  Check
} from "lucide-react";

const defaultCreditNoteViews = [
  "All",
  "Draft",
  "Locked",
  "Pending Approval",
  "Approved",
  "Open",
  "Closed",
  "Void"
];

interface CreditNote {
  id: string;
  _id?: string;
  creditNoteDate?: string;
  date?: string | Date;
  creditNoteNumber?: string;
  referenceNumber?: string;
  customerName?: string;
  customer?: string;
  invoiceNumber?: string;
  status: string;
  total?: number;
  amount?: number;
  balance?: number;
  currency?: string;
  refunded?: boolean;
  createdTime?: string | number | Date;
  lastModifiedTime?: string | number | Date;
}

type BulkFieldType = "select" | "date" | "text" | "textarea";

interface BulkFieldOption {
  label: string;
  value: "status" | "date" | "referenceNumber" | "currency" | "reason";
  type: BulkFieldType;
  placeholder?: string;
  options?: Array<{ label: string; value: string }>;
}

interface CurrencyListItem {
  code: string;
  name?: string;
  symbol?: string;
  isBaseCurrency?: boolean;
}

export default function CreditNotes() {
  const navigate = useNavigate();
  const [isViewDropdownOpen, setIsViewDropdownOpen] = useState(false);
  const [selectedView, setSelectedView] = useState("All Credit Notes");
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [viewSearchQuery, setViewSearchQuery] = useState("");
  const [customViews, setCustomViews] = useState(() => getCustomViews().filter(v => v.type === "credit-notes"));

  // Initialize with empty array, fetch in useEffect
  const [creditNotes, setCreditNotes] = useState<CreditNote[]>([]);
  const [filteredCreditNotes, setFilteredCreditNotes] = useState<CreditNote[]>([]);
  const [selectedCreditNotes, setSelectedCreditNotes] = useState<string[]>([]);
  const [isBulkUpdateModalOpen, setIsBulkUpdateModalOpen] = useState(false);
  const [bulkUpdateField, setBulkUpdateField] = useState("");
  const [bulkUpdateValue, setBulkUpdateValue] = useState("");
  const [isBulkUpdateFieldDropdownOpen, setIsBulkUpdateFieldDropdownOpen] = useState(false);
  const [isPdfButtonActive, setIsPdfButtonActive] = useState(false);
  const [activeSortField, setActiveSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [isFieldCustomizationOpen, setIsFieldCustomizationOpen] = useState(false);
  const [availableCurrencies, setAvailableCurrencies] = useState<CurrencyListItem[]>([]);
  const [organizationProfile, setOrganizationProfile] = useState<any>(null);
  const [baseCurrency, setBaseCurrency] = useState("USD");
  const [isPreferencesModalOpen, setIsPreferencesModalOpen] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchType, setSearchType] = useState("Credit Notes");
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
  const searchTypeDropdownRef = useRef<HTMLDivElement>(null);
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const filterDropdownRef = useRef<HTMLDivElement>(null);
  const [searchModalData, setSearchModalData] = useState({
    // Credit Notes
    creditNoteNumber: "",
    dateRangeFromCreditNote: "",
    dateRangeToCreditNote: "",
    itemNameCreditNote: "",
    accountCreditNote: "",
    notesCreditNote: "",
    projectNameCreditNote: "",
    addressTypeCreditNote: "Billing and Shipping",
    attentionCreditNote: "",
    referenceNumberCreditNote: "",
    statusCreditNote: "",
    itemDescriptionCreditNote: "",
    totalRangeFromCreditNote: "",
    totalRangeToCreditNote: "",
    customerNameCreditNote: "",
    taxExemptionsCreditNote: ""
  });
  const viewDropdownRef = useRef<HTMLDivElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const bulkUpdateFieldDropdownRef = useRef<HTMLDivElement>(null);

  // Credit Notes search dropdowns
  const [isItemNameCreditNoteDropdownOpen, setIsItemNameCreditNoteDropdownOpen] = useState(false);
  const itemNameCreditNoteDropdownRef = useRef<HTMLDivElement>(null);
  const [isAccountCreditNoteDropdownOpen, setIsAccountCreditNoteDropdownOpen] = useState(false);
  const accountCreditNoteDropdownRef = useRef<HTMLDivElement>(null);
  const [isProjectNameCreditNoteDropdownOpen, setIsProjectNameCreditNoteDropdownOpen] = useState(false);
  const projectNameCreditNoteDropdownRef = useRef<HTMLDivElement>(null);
  const [isStatusCreditNoteDropdownOpen, setIsStatusCreditNoteDropdownOpen] = useState(false);
  const statusCreditNoteDropdownRef = useRef<HTMLDivElement>(null);
  const [isCustomerNameCreditNoteDropdownOpen, setIsCustomerNameCreditNoteDropdownOpen] = useState(false);
  const customerNameCreditNoteDropdownRef = useRef<HTMLDivElement>(null);
  const [isTaxExemptionsCreditNoteDropdownOpen, setIsTaxExemptionsCreditNoteDropdownOpen] = useState(false);
  const taxExemptionsCreditNoteDropdownRef = useRef<HTMLDivElement>(null);

  const sortOptions = [
    "Created Time",
    "Last Modified Time",
    "Date",
    "Credit Note#",
    "Customer Name",
    "Amount",
    "Balance"
  ];

  const importOptions = [
    "Import Credit Notes",
    "Import Applied Credit Notes",
    "Import Refunds"
  ];

  const exportOptions = [
    "Export Credit Notes",
    "Export Applied Credit Notes",
    "Export Refunds",
    "Export Current View"
  ];

  const currencyDropdownOptions: Array<{ label: string; value: string }> = (() => {
    const normalized = (Array.isArray(availableCurrencies) ? availableCurrencies : [])
      .map((currency) => {
        const code = String(currency?.code || "").trim().toUpperCase();
        if (!code) return null;
        return {
          label: currency?.name ? `${code} - ${currency.name}` : code,
          value: code,
          isBaseCurrency: Boolean(currency?.isBaseCurrency)
        };
      })
      .filter(Boolean) as Array<{ label: string; value: string; isBaseCurrency: boolean }>;

    const unique = Array.from(
      new Map(normalized.map((option) => [option.value, option])).values()
    );

    unique.sort((a, b) => {
      if (a.isBaseCurrency && !b.isBaseCurrency) return -1;
      if (!a.isBaseCurrency && b.isBaseCurrency) return 1;
      return a.value.localeCompare(b.value);
    });

    if (unique.length === 0) {
      return Array.from(new Set([String(baseCurrency || "USD").toUpperCase(), "USD", "EUR", "GBP"])).map((code) => ({
        label: code,
        value: code
      }));
    }

    return unique.map((option) => ({
      label: option.isBaseCurrency ? `${option.label} (Base Currency)` : option.label,
      value: option.value
    }));
  })();

  const bulkUpdateFieldOptions: BulkFieldOption[] = [
    {
      label: "Status",
      value: "status",
      type: "select",
      options: [
        { label: "Draft", value: "draft" },
        { label: "Open", value: "open" },
        { label: "Closed", value: "closed" },
        { label: "Void", value: "void" }
      ]
    },
    { label: "Credit Date", value: "date", type: "date" },
    { label: "Reference Number", value: "referenceNumber", type: "text", placeholder: "Enter reference number" },
    { label: "Currency", value: "currency", type: "select", options: currencyDropdownOptions },
    { label: "Reason", value: "reason", type: "textarea", placeholder: "Enter reason" }
  ];
  const selectedBulkFieldConfig = bulkUpdateFieldOptions.find((option) => option.value === bulkUpdateField) || null;

  const validateAndNormalizeBulkValue = (field: BulkFieldOption, rawValue: string) => {
    const trimmed = rawValue.trim();
    if (!trimmed) {
      return { valid: false, message: "Please enter a value.", normalizedValue: "" };
    }

    if (field.value === "currency") {
      const normalizedCurrency = trimmed.toUpperCase();
      if (!/^[A-Z]{3}$/.test(normalizedCurrency)) {
        return { valid: false, message: "Currency must be a 3-letter code (example: USD).", normalizedValue: "" };
      }
      return { valid: true, message: "", normalizedValue: normalizedCurrency };
    }

    if (field.value === "status") {
      return { valid: true, message: "", normalizedValue: trimmed.toLowerCase() };
    }

    if (field.value === "date") {
      const isValidDate = /^\d{4}-\d{2}-\d{2}$/.test(trimmed) && !Number.isNaN(new Date(trimmed).getTime());
      if (!isValidDate) {
        return { valid: false, message: "Please select a valid date.", normalizedValue: "" };
      }
      return { valid: true, message: "", normalizedValue: trimmed };
    }

    return { valid: true, message: "", normalizedValue: trimmed };
  };

  const refreshData = async () => {
    setIsRefreshing(true);
    try {
      const allCreditNotes = await getCreditNotes();
      const allCustomViews = getCustomViews().filter(v => v.type === "credit-notes");
      setCreditNotes(allCreditNotes);
      setCustomViews(allCustomViews);
      applyFilters(allCreditNotes, selectedStatus, allCustomViews);
    } catch (error) {
      console.error("Error refreshing data:", error);
    } finally {
      setIsRefreshing(false);
      setHasLoadedOnce(true);
    }
  };

  useEffect(() => {
    const initialLoad = async () => {
      try {
        const allCreditNotes = await getCreditNotes();
        const allCustomViews = getCustomViews().filter(v => v.type === "credit-notes");
        if (Array.isArray(allCreditNotes)) {
          setCreditNotes(allCreditNotes);
          // Only apply filters if we have data
          applyFilters(allCreditNotes, selectedStatus, allCustomViews);
        } else {
          setCreditNotes([]);
          setFilteredCreditNotes([]);
        }
        setCustomViews(allCustomViews);

      } catch (error) {
        console.error("Error loading credit notes:", error);
        setCreditNotes([]);
        setFilteredCreditNotes([]);
      } finally {
        setHasLoadedOnce(true);
      }
    };

    initialLoad();

    window.addEventListener('focus', initialLoad);
    window.addEventListener('storage', initialLoad);
    return () => {
      window.removeEventListener('focus', initialLoad);
      window.removeEventListener('storage', initialLoad);
    };
  }, [selectedStatus]);

  useEffect(() => {
    const loadOrganizationProfile = async () => {
      try {
        const response = await settingsAPI.getOrganizationProfile();
        if (response?.success && response.data) {
          setOrganizationProfile(response.data);
          if (response.data.baseCurrency) {
            setBaseCurrency(String(response.data.baseCurrency).toUpperCase());
          }
        }
      } catch (error) {
        console.error("Error loading organization profile for credit note PDF:", error);
      }
    };
    loadOrganizationProfile();
  }, []);

  useEffect(() => {
    const loadCurrencies = async () => {
      try {
        const response: any = await currenciesAPI.getAll({ isActive: true });
        const rawCurrencies = Array.isArray(response?.data) ? response.data : [];

        const parsedCurrencies = rawCurrencies
          .map((currency: any) => ({
            code: String(currency?.code || "").trim().toUpperCase(),
            name: String(currency?.name || "").trim(),
            symbol: String(currency?.symbol || "").trim(),
            isBaseCurrency: Boolean(currency?.isBaseCurrency)
          }))
          .filter((currency: CurrencyListItem) => /^[A-Z]{3}$/.test(currency.code));

        setAvailableCurrencies(parsedCurrencies);
      } catch (error) {
        console.error("Error loading currencies for credit note bulk update:", error);
      }
    };

    loadCurrencies();
  }, []);

  useEffect(() => {
    // Re-apply filters when status changes
    applyFilters(creditNotes, selectedStatus);
  }, [selectedStatus]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (viewDropdownRef.current && !viewDropdownRef.current.contains(target)) {
        setIsViewDropdownOpen(false);
      }
      if (moreMenuRef.current && !moreMenuRef.current.contains(target)) {
        setIsMoreMenuOpen(false);
      }
      if (bulkUpdateFieldDropdownRef.current && !bulkUpdateFieldDropdownRef.current.contains(target)) {
        setIsBulkUpdateFieldDropdownOpen(false);
      }
    };

    if (isViewDropdownOpen || isMoreMenuOpen || isBulkUpdateFieldDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isViewDropdownOpen, isMoreMenuOpen, isBulkUpdateFieldDropdownOpen]);

  // Separate useEffect for search modal dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (searchTypeDropdownRef.current && !searchTypeDropdownRef.current.contains(target)) {
        setIsSearchTypeDropdownOpen(false);
      }
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(target)) {
        setIsFilterDropdownOpen(false);
      }
      if (itemNameCreditNoteDropdownRef.current && !itemNameCreditNoteDropdownRef.current.contains(target)) {
        setIsItemNameCreditNoteDropdownOpen(false);
      }
      if (accountCreditNoteDropdownRef.current && !accountCreditNoteDropdownRef.current.contains(target)) {
        setIsAccountCreditNoteDropdownOpen(false);
      }
      if (projectNameCreditNoteDropdownRef.current && !projectNameCreditNoteDropdownRef.current.contains(target)) {
        setIsProjectNameCreditNoteDropdownOpen(false);
      }
      if (statusCreditNoteDropdownRef.current && !statusCreditNoteDropdownRef.current.contains(target)) {
        setIsStatusCreditNoteDropdownOpen(false);
      }
      if (customerNameCreditNoteDropdownRef.current && !customerNameCreditNoteDropdownRef.current.contains(target)) {
        setIsCustomerNameCreditNoteDropdownOpen(false);
      }
      if (taxExemptionsCreditNoteDropdownRef.current && !taxExemptionsCreditNoteDropdownRef.current.contains(target)) {
        setIsTaxExemptionsCreditNoteDropdownOpen(false);
      }
    };

    if (isSearchTypeDropdownOpen || isFilterDropdownOpen || isItemNameCreditNoteDropdownOpen || isAccountCreditNoteDropdownOpen || isProjectNameCreditNoteDropdownOpen || isStatusCreditNoteDropdownOpen || isCustomerNameCreditNoteDropdownOpen || isTaxExemptionsCreditNoteDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isSearchTypeDropdownOpen, isFilterDropdownOpen, isItemNameCreditNoteDropdownOpen, isAccountCreditNoteDropdownOpen, isProjectNameCreditNoteDropdownOpen, isStatusCreditNoteDropdownOpen, isCustomerNameCreditNoteDropdownOpen, isTaxExemptionsCreditNoteDropdownOpen]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && selectedCreditNotes.length > 0) {
        setSelectedCreditNotes([]);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectedCreditNotes]);

  const getCreditNoteFieldValue = (note: CreditNote, fieldName: string) => {
    const fieldMap: Record<string, any> = {
      "Date": note.creditNoteDate || note.date || "",
      "Credit Note#": note.creditNoteNumber || note.id || "",
      "Reference Number": note.referenceNumber || "",
      "Customer Name": note.customerName || note.customer || "",
      "Invoice#": note.invoiceNumber || "",
      "Status": note.status || "open",
      "Amount": note.total || note.amount || 0,
      "Balance": note.balance || note.total || note.amount || 0
    };
    return fieldMap[fieldName] !== undefined ? fieldMap[fieldName] : "";
  };

  const evaluateCriterion = (fieldValue: any, comparator: string, value: any) => {
    const fieldStr = String(fieldValue || "").toLowerCase();
    const valueStr = String(value || "").toLowerCase();

    switch (comparator) {
      case "is": return fieldStr === valueStr;
      case "is not": return fieldStr !== valueStr;
      case "starts with": return fieldStr.startsWith(valueStr);
      case "contains": return fieldStr.includes(valueStr);
      case "doesn't contain": return !fieldStr.includes(valueStr);
      case "is in": return valueStr.split(",").map(v => v.trim()).includes(fieldStr);
      case "is not in": return !valueStr.split(",").map(v => v.trim()).includes(fieldStr);
      case "is empty": return !fieldValue || fieldStr === "";
      case "is not empty": return fieldValue && fieldStr !== "";
      default: return true;
    }
  };

  const applyFilters = (allCreditNotes: CreditNote[], status: string, views: any[] = customViews) => {
    let filtered = allCreditNotes;

    // Check if it's a custom view
    const customView = views.find(v => v.name === status);
    if (customView && customView.criteria) {
      filtered = filtered.filter(note => {
        return customView.criteria.every((criterion: any) => {
          if (!criterion.field || !criterion.comparator) return true;
          const fieldValue = getCreditNoteFieldValue(note, criterion.field);
          return evaluateCriterion(fieldValue, criterion.comparator, criterion.value);
        });
      });
      setFilteredCreditNotes(filtered);
      return;
    }

    if (status !== "All") {
      filtered = filtered.filter(note => {
        const noteStatus = (note.status || "open").toLowerCase();
        return noteStatus === status.toLowerCase();
      });
    }
    setFilteredCreditNotes(filtered);
  };

  const formatDate = (dateString: any) => {
    if (!dateString) return "-";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        // Try parsing as formatted date string (e.g., "11 Dec 2025")
        return dateString;
      }
      const day = String(date.getDate()).padStart(2, "0");
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const month = months[date.getMonth()];
      const year = date.getFullYear();
      return `${day} ${month} ${year}`;
    } catch (error) {
      return dateString;
    }
  };

  const formatCurrency = (amount: any, currency = "AMD") => {
    const numAmount = parseFloat(amount) || 0;
    return `${currency}${numAmount.toFixed(2)}`;
  };

  const handleRefreshList = () => {
    if (!isRefreshing) {
      refreshData();
      setIsMoreMenuOpen(false);
    }
  };

  const handleSort = (sortOption: string) => {
    setIsMoreMenuOpen(false);

    // Toggle direction if clicking the same field
    let newDirection = "desc";
    if (activeSortField === sortOption) {
      newDirection = sortDirection === "desc" ? "asc" : "desc";
    }

    setActiveSortField(sortOption);
    setSortDirection(newDirection);

    // Sort the filtered credit notes
    const sorted = [...filteredCreditNotes].sort((a, b) => {
      let aValue, bValue;

      switch (sortOption) {
        case "Created Time":
          aValue = new Date(a.createdTime || a.creditNoteDate || a.date || 0);
          bValue = new Date(b.createdTime || b.creditNoteDate || b.date || 0);
          break;
        case "Last Modified Time":
          aValue = new Date(a.lastModifiedTime || a.creditNoteDate || a.date || 0);
          bValue = new Date(b.lastModifiedTime || b.creditNoteDate || b.date || 0);
          break;
        case "Date":
          aValue = new Date(a.creditNoteDate || a.date || 0);
          bValue = new Date(b.creditNoteDate || b.date || 0);
          break;
        case "Credit Note#":
          aValue = (a.creditNoteNumber || a.id || "").toString();
          bValue = (b.creditNoteNumber || b.id || "").toString();
          break;
        case "Customer Name":
          aValue = (a.customerName || a.customer || "").toLowerCase();
          bValue = (b.customerName || b.customer || "").toLowerCase();
          break;
        case "Amount":
          aValue = parseFloat(a.total || a.amount || 0);
          bValue = parseFloat(b.total || b.amount || 0);
          break;
        case "Balance":
          aValue = parseFloat(a.balance || a.total || a.amount || 0);
          bValue = parseFloat(b.balance || b.total || b.amount || 0);
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return newDirection === "asc" ? -1 : 1;
      if (aValue > bValue) return newDirection === "asc" ? 1 : -1;
      return 0;
    });

    setFilteredCreditNotes(sorted);
  };

  const handleImport = (importOption) => {
    setIsMoreMenuOpen(false);
    if (importOption === "Import Credit Notes") {
      navigate("/sales/credit-notes/import");
    } else if (importOption === "Import Applied Credit Notes") {
      navigate("/sales/credit-notes/import-applied");
    } else if (importOption === "Import Refunds") {
      navigate("/sales/credit-notes/import-refunds");
    }
  };

  const handleExport = (exportOption) => {
    setIsMoreMenuOpen(false);

    let dataToExport = [];
    let filename = "";

    if (exportOption === "Export Credit Notes") {
      dataToExport = creditNotes; // Export all
      filename = `credit-notes-export-${new Date().toISOString().split('T')[0]}.csv`;
    } else if (exportOption === "Export Applied Credit Notes") {
      // Filter only applied credit notes
      dataToExport = creditNotes.filter(note =>
        (note.status || "").toLowerCase() === "closed" ||
        (note.status || "").toLowerCase() === "applied"
      );
      filename = `applied-credit-notes-export-${new Date().toISOString().split('T')[0]}.csv`;
    } else if (exportOption === "Export Refunds") {
      // Filter only refunded credit notes
      dataToExport = creditNotes.filter(note =>
        note.refunded === true ||
        (note.status || "").toLowerCase() === "refunded"
      );
      filename = `refunds-export-${new Date().toISOString().split('T')[0]}.csv`;
    } else if (exportOption === "Export Current View") {
      dataToExport = filteredCreditNotes;
      filename = `credit-notes-current-view-${new Date().toISOString().split('T')[0]}.csv`;
    }

    if (dataToExport.length === 0) {
      alert("No data to export.");
      return;
    }

    // Export to CSV
    const csvContent = [
      ["Date", "Credit Note#", "Reference Number", "Customer Name", "Invoice#", "Status", "Amount", "Balance"],
      ...dataToExport.map(note => [
        formatDate(note.creditNoteDate || note.date),
        note.creditNoteNumber || note.id,
        note.referenceNumber || "",
        note.customerName || note.customer || "",
        note.invoiceNumber || "",
        (note.status || "open").toUpperCase(),
        formatCurrency(note.total || note.amount || 0, note.currency),
        formatCurrency(note.balance || note.total || note.amount || 0, note.currency)
      ])
    ].map(row => row.map(cell => `"${cell}"`).join(",")).join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // const handleRefreshList = () => {
  //   setIsMoreMenuOpen(false);
  //   // Reload credit notes from model
  //   const allCreditNotes = getCreditNotes();
  //   setCreditNotes(allCreditNotes);
  //   applyFilters(allCreditNotes, selectedStatus);
  //   // Visual feedback
  //   alert("List refreshed successfully.");
  // };

  const handlePreferences = () => {
    setIsMoreMenuOpen(false);
    navigate("/settings/credit-notes");
  };

  const handleResetColumnWidth = () => {
    setIsMoreMenuOpen(false);
    // Reset any stored column widths in localStorage if they exist
    localStorage.removeItem("creditNoteColumnWidths");
    alert("Column widths have been reset to default.");
  };

  const handleSelectAll = () => {
    if (selectedCreditNotes.length === filteredCreditNotes.length) {
      setSelectedCreditNotes([]);
    } else {
      setSelectedCreditNotes(filteredCreditNotes.map(note => note.id));
    }
  };

  const handleClearSelection = () => {
    setSelectedCreditNotes([]);
  };

  const handleBulkUpdate = () => {
    setIsBulkUpdateModalOpen(true);
    setBulkUpdateField("");
    setBulkUpdateValue("");
  };

  const handleBulkUpdateFieldSelect = (fieldValue: string) => {
    setBulkUpdateField(fieldValue);
    setBulkUpdateValue("");
    setIsBulkUpdateFieldDropdownOpen(false);
  };

  const handleBulkUpdateSubmit = async () => {
    if (!selectedBulkFieldConfig) {
      alert("Please select a field to update.");
      return;
    }

    if (selectedCreditNotes.length === 0) {
      alert("Please select at least one credit note to update.");
      return;
    }

    const normalized = validateAndNormalizeBulkValue(selectedBulkFieldConfig, String(bulkUpdateValue ?? ""));
    if (!normalized.valid) {
      alert(normalized.message);
      return;
    }

    const updatePayload = { [selectedBulkFieldConfig.value]: normalized.normalizedValue };

    try {
      const results = await Promise.allSettled(
        selectedCreditNotes.map((creditNoteId) => updateCreditNote(creditNoteId, updatePayload))
      );

      const successCount = results.filter((result) => result.status === "fulfilled").length;
      const failedCount = results.length - successCount;

      if (successCount === 0) {
        throw new Error("None of the selected credit notes could be updated.");
      }

      const refreshed = await getCreditNotes();
      setCreditNotes(refreshed);
      applyFilters(refreshed, selectedStatus);

      setSelectedCreditNotes([]);
      setIsBulkUpdateModalOpen(false);
      setBulkUpdateField("");
      setBulkUpdateValue("");

      if (failedCount > 0) {
        alert(`Updated ${successCount} credit note(s). ${failedCount} could not be updated.`);
      } else {
        alert(`Successfully updated ${successCount} credit note(s).`);
      }
    } catch (error: any) {
      console.error("Error bulk updating credit notes:", error);
      alert(error?.message || "Failed to bulk update credit notes.");
    }
  };

  const handleBulkUpdateCancel = () => {
    setIsBulkUpdateModalOpen(false);
    setBulkUpdateField("");
    setBulkUpdateValue("");
  };

  const handleDownloadPDF = async () => {
    const selectedNotes = creditNotes.filter(note => selectedCreditNotes.includes(note.id));
    if (selectedNotes.length === 0) {
      alert("Please select at least one credit note to download as PDF.");
      return;
    }

    // Show active state
    setIsPdfButtonActive(true);
    setTimeout(() => setIsPdfButtonActive(false), 300);

    try {
      const fullNotes = (
        await Promise.all(selectedNotes.map((note) => getCreditNoteById(note.id)))
      ).filter(Boolean) as CreditNote[];

      await downloadCreditNotesPdf({
        notes: fullNotes,
        organizationProfile,
        baseCurrency,
        fileName: `credit-notes-${new Date().toISOString().split("T")[0]}.pdf`
      });
    } catch (error) {
      console.error("Error downloading credit notes PDF:", error);
      alert("Failed to generate PDF. Please try again.");
    }
  };

  const handleDelete = () => {
    if (selectedCreditNotes.length === 0) {
      alert("Please select at least one credit note to delete.");
      return;
    }

    if (window.confirm(`Are you sure you want to delete ${selectedCreditNotes.length} credit note(s)?`)) {
      // TODO: Implement actual deletion logic
      const remainingNotes = creditNotes.filter(note => !selectedCreditNotes.includes(note.id));
      setCreditNotes(remainingNotes);
      setFilteredCreditNotes(remainingNotes);
      setSelectedCreditNotes([]);
      alert("Credit notes deleted successfully.");
    }
  };

  const handleViewSelect = (view: string) => {
    setSelectedView(view === "All" ? "All Credit Notes" : view);
    setSelectedStatus(view);
    setIsViewDropdownOpen(false);
    applyFilters(creditNotes, view);
  };

  const handleCreateNewCreditNote = () => {
    navigate("/sales/credit-notes/new");
  };

  const handleImportCreditNotes = () => {
    navigate("/sales/credit-notes/import");
  };

  const handleDeleteCustomView = (viewId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const viewToDelete = customViews.find(v => v.id === viewId);
    if (viewToDelete && window.confirm(`Are you sure you want to delete the custom view "${viewToDelete.name}"?`)) {
      deleteCustomView(viewId);
      const updatedCustomViews = customViews.filter(v => v.id !== viewId);
      setCustomViews(updatedCustomViews);
      if (selectedStatus === viewToDelete.name) {
        handleViewSelect("All");
      }
    }
  };

  const filteredDefaultViews = defaultCreditNoteViews.filter(view =>
    view.toLowerCase().includes(viewSearchQuery.toLowerCase())
  );

  const filteredCustomViews = customViews.filter(view =>
    view.name.toLowerCase().includes(viewSearchQuery.toLowerCase())
  );

  const isViewSelected = (view: string) => {
    if (view === "All") {
      return selectedStatus === "All";
    }
    return selectedStatus === view;
  };

  return (
    <div className="w-full min-h-screen bg-gray-50">
      {/* Header - Show Bulk Actions Bar when items are selected, otherwise show normal header */}
      {selectedCreditNotes.length > 0 ? (
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-white">
          <div className="flex items-center gap-2">
            <button
              className="flex items-center gap-1.5 py-2 px-4 bg-gradient-to-r from-[#156372] to-[#0D4A52] rounded-md text-sm font-medium text-white cursor-pointer transition-all hover:opacity-90 shadow-sm"
              onClick={handleBulkUpdate}
            >
              Bulk Update
            </button>
            <button
              className="p-2 bg-white border border-gray-200 text-gray-700 rounded-md cursor-pointer hover:bg-gray-50 hover:border-gray-300"
              onClick={handleDownloadPDF}
              title="Read PDF"
            >
              <FileText size={16} />
            </button>
            <button
              className="px-4 py-2 bg-white border border-red-300 text-red-600 rounded-md text-sm font-medium cursor-pointer hover:bg-red-50 hover:border-red-300 flex items-center gap-2"
              onClick={handleDelete}
            >
              <Trash2 size={16} />
              Delete
            </button>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center min-w-[24px] h-6 px-2 bg-gradient-to-r from-[#156372] to-[#0D4A52] rounded text-[13px] font-semibold text-white">
              {selectedCreditNotes.length}
            </span>
            <span className="text-sm text-gray-700">Selected</span>
            <button
              className="flex items-center gap-1 py-1.5 px-3 bg-transparent border-none text-sm text-red-500 cursor-pointer transition-colors hover:text-red-600"
              onClick={handleClearSelection}
            >
              Esc <X size={14} className="text-red-500" />
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="relative" ref={viewDropdownRef}>
              <button
                onClick={() => setIsViewDropdownOpen(!isViewDropdownOpen)}
                className="flex items-center gap-2 text-lg font-bold text-gray-900 hover:text-gray-700 transition-colors"
              >
                <span>{selectedView}</span>
                <ChevronDown size={18} className="text-gray-600" />
              </button>

              {/* Dropdown Menu */}
              {isViewDropdownOpen && (
                <div className="absolute top-full left-0 mt-2 bg-white border-2 border-gray-200 rounded-xl shadow-xl z-50 min-w-[300px] overflow-hidden flex flex-col max-h-[500px]">
                  {/* Search Bar */}
                  <div className="flex items-center gap-2 p-3 border-b border-gray-100 bg-gray-50/50">
                    <Search size={16} className="text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search views..."
                      value={viewSearchQuery}
                      onChange={(e) => setViewSearchQuery(e.target.value)}
                      onMouseEnter={(e) => (e.target as HTMLElement).style.backgroundColor = "#F9FAFB"}
                      onMouseLeave={(e) => (e.target as HTMLElement).style.backgroundColor = "white"}
                      className="flex-1 text-sm bg-transparent focus:outline-none placeholder-gray-400 font-medium"
                    />
                  </div>

                  {/* View Options Scroll Area */}
                  <div className="flex-1 overflow-y-auto custom-scrollbar pt-2">
                    {/* Default Views */}
                    <div className="px-3 pb-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-white">
                      System Views
                    </div>
                    {filteredDefaultViews.map((view) => (
                      <div
                        key={view}
                        onClick={() => handleViewSelect(view)}
                        className={`group px-4 py-2.5 cursor-pointer hover:bg-blue-50 flex items-center justify-between transition-all ${isViewSelected(view) ? "bg-blue-50/50 text-blue-600" : "text-gray-700 font-medium"
                          }`}
                      >
                        <div className="flex items-center gap-3">
                          <Eye size={16} className={isViewSelected(view) ? "text-blue-500" : "text-gray-400 opacity-40"} />
                          <span className="text-sm">{view}</span>
                        </div>
                        {isViewSelected(view) && <Check size={14} className="text-blue-600" />}
                      </div>
                    ))}

                    {/* Custom Views */}
                    {filteredCustomViews.length > 0 && (
                      <div className="mt-4">
                        <div className="px-3 pb-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-white">
                          Custom Views
                        </div>
                        {filteredCustomViews.map((view) => (
                          <div
                            key={view.id}
                            onClick={() => handleViewSelect(view.name)}
                            className={`group px-4 py-2.5 cursor-pointer hover:bg-blue-50 flex items-center justify-between transition-all ${isViewSelected(view.name) ? "bg-blue-50/50 text-blue-600" : "text-gray-700 font-medium"
                              }`}
                          >
                            <div className="flex items-center gap-3">
                              <Star
                                size={14}
                                className={view.isFavorite ? "text-yellow-400 fill-yellow-400" : "text-gray-300"}
                              />
                              <span className="text-sm truncate max-w-[160px]">{view.name}</span>
                            </div>
                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={(e) => handleDeleteCustomView(view.id, e)}
                                className="p-1.5 hover:bg-red-50 text-gray-300 hover:text-red-500 rounded"
                              >
                                <Trash2 size={12} />
                              </button>
                              {isViewSelected(view.name) && <Check size={14} className="text-blue-600" />}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Footer Actions */}
                  <div
                    onClick={() => {
                      setIsViewDropdownOpen(false);
                      navigate("/sales/credit-notes/custom-view/new");
                    }}
                    className="mt-2 flex items-center justify-center gap-2 p-4 border-t border-gray-100 bg-white text-blue-600 text-sm font-bold cursor-pointer hover:bg-gray-50 transition-all active:scale-[0.98]"
                  >
                    <Plus size={18} strokeWidth={3} />
                    New Custom View
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3">
              <button
                className="cursor-pointer transition-all bg-gradient-to-r from-[#156372] to-[#0D4A52] text-white px-6 py-2 rounded-lg border-[#0D4A52] border-b-[4px] hover:brightness-110 hover:-translate-y-[1px] hover:border-b-[6px] active:border-b-[2px] active:brightness-90 active:translate-y-[2px] flex items-center gap-2 text-sm font-bold shadow-md"
                onClick={handleCreateNewCreditNote}
              >
                <Plus size={16} strokeWidth={3} />
                New
              </button>
              <div className="relative" ref={moreMenuRef}>
                <button
                  className="p-2 hover:bg-gray-100 rounded-lg text-gray-600 transition-colors"
                  onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
                >
                  <MoreVertical size={18} />
                </button>

                {isMoreMenuOpen && (
                  <div className="absolute top-full right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg min-w-[220px] z-[1000] overflow-visible py-1">
                    {/* Sort by */}
                    <div className="relative flex items-center gap-3 py-2.5 px-4 cursor-pointer transition-all text-sm text-gray-700 group hover:bg-[#3b82f6] hover:text-white">
                      <ArrowUpDown size={16} className="text-[#156372] flex-shrink-0 group-hover:text-white" />
                      <span className="flex-1 font-medium text-[13px]">Sort by</span>
                      <ChevronRight size={16} className="text-gray-400 flex-shrink-0 group-hover:text-white" />

                      {/* Sort by Submenu */}
                      <div className="absolute top-0 right-full mr-1.5 w-[220px] bg-white border border-gray-200 rounded-lg shadow-lg py-2 z-[99999] pointer-events-none opacity-0 translate-x-2.5 transition-all group-hover:pointer-events-auto group-hover:opacity-100 group-hover:translate-x-0">
                        {sortOptions.map((option) => {
                          const isActive = activeSortField === option;
                          return (
                            <div
                              key={option}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSort(option);
                                setIsMoreMenuOpen(false);
                              }}
                              className={`flex items-center justify-between py-2.5 px-3.5 mx-2 text-sm transition-all rounded-md ${isActive ? "bg-[#3b82f6] text-white" : "text-gray-700 hover:bg-gray-100"
                                }`}
                            >
                              <span>{option}</span>
                              {isActive && (
                                <ChevronDown
                                  size={14}
                                  className={`text-white ${sortDirection === 'asc' ? 'rotate-180' : ''}`}
                                />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Import */}
                    <div className="relative flex items-center gap-3 py-2.5 px-4 cursor-pointer transition-all text-sm text-gray-700 group hover:bg-gray-50">
                      <Download size={16} className="text-[#156372] flex-shrink-0" />
                      <span className="flex-1 font-medium text-[13px]">Import</span>
                      <ChevronRight size={16} className="text-gray-400 flex-shrink-0" />

                      {/* Import Submenu */}
                      <div className="absolute top-0 right-full mr-1.5 min-w-[220px] bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-[99999] pointer-events-none opacity-0 translate-x-2.5 transition-all group-hover:pointer-events-auto group-hover:opacity-100 group-hover:translate-x-0">
                        {importOptions.map((option) => (
                          <div
                            key={option}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleImport(option);
                              setIsMoreMenuOpen(false);
                            }}
                            className="flex items-center py-2.5 px-4 text-sm text-gray-700 cursor-pointer transition-all whitespace-nowrap hover:bg-gray-50"
                          >
                            <span className="text-[13px]">{option}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Export */}
                    <div className="relative flex items-center gap-3 py-2.5 px-4 cursor-pointer transition-all text-sm text-gray-700 group hover:bg-gray-50">
                      <Upload size={16} className="text-[#156372] flex-shrink-0" />
                      <span className="flex-1 font-medium text-[13px]">Export</span>
                      <ChevronRight size={16} className="text-gray-400 flex-shrink-0" />

                      {/* Export Submenu */}
                      <div className="absolute top-0 right-full mr-1.5 min-w-[200px] bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-[99999] pointer-events-none opacity-0 translate-x-2.5 transition-all group-hover:pointer-events-auto group-hover:opacity-100 group-hover:translate-x-0">
                        {exportOptions.map((option) => (
                          <div
                            key={option}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleExport(option);
                              setIsMoreMenuOpen(false);
                            }}
                            className="flex items-center py-2.5 px-4 text-sm text-gray-700 cursor-pointer transition-all whitespace-nowrap hover:bg-gray-50"
                          >
                            <span className="text-[13px]">{option}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="h-px bg-gray-100 my-1"></div>

                    {/* Preferences */}
                    <div
                      className="flex items-center gap-3 py-2.5 px-4 cursor-pointer transition-colors text-sm text-gray-700 hover:bg-gray-50"
                      onClick={() => {
                        handlePreferences();
                        setIsMoreMenuOpen(false);
                      }}
                    >
                      <Settings size={16} className="text-[#156372] flex-shrink-0" />
                      <span className="flex-1 font-medium text-[13px]">Preferences</span>
                    </div>

                    <div
                      className="flex items-center gap-3 py-2.5 px-4 cursor-pointer transition-colors text-sm text-gray-700 hover:bg-gray-50"
                      onClick={() => {
                        setIsFieldCustomizationOpen(true);
                        setIsMoreMenuOpen(false);
                      }}
                    >
                      <Grid3x3 size={16} className="text-[#156372] flex-shrink-0" />
                      <span className="flex-1 font-medium text-[13px]">Manage Custom Fields</span>
                    </div>

                    <div className="h-px bg-gray-100 my-1"></div>

                    <div
                      className={`flex items-center gap-3 py-2.5 px-4 cursor-pointer transition-colors text-sm text-gray-700 hover:bg-gray-50 ${isRefreshing ? "opacity-50 cursor-not-allowed" : ""}`}
                      onClick={() => handleRefreshList()}
                    >
                      <RefreshCw size={16} className={`text-[#156372] flex-shrink-0 ${isRefreshing ? "animate-spin" : ""}`} />
                      <span className="flex-1 font-medium text-[13px]">Refresh List</span>
                    </div>

                    {/* Reset Column Width */}
                    <div
                      className="flex items-center gap-3 py-2.5 px-4 cursor-pointer transition-colors text-sm text-gray-700 hover:bg-gray-50"
                      onClick={() => {
                        handleResetColumnWidth();
                        setIsMoreMenuOpen(false);
                      }}
                    >
                      <RotateCcw size={16} className="text-[#156372] flex-shrink-0" />
                      <span className="flex-1 font-medium text-[13px]">Reset Column Width</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Update Modal */}
      {isBulkUpdateModalOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              handleBulkUpdateCancel();
            }
          }}
        >
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Bulk Update Credit Notes</h2>
              <button
                className="p-2 hover:bg-gray-100 rounded-lg text-gray-600 transition-colors"
                onClick={handleBulkUpdateCancel}
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6">
              <p className="text-sm text-gray-600 mb-4">
                Choose a field from the dropdown and update with new information.
              </p>
              <div className="space-y-4">
                <div className="relative" ref={bulkUpdateFieldDropdownRef}>
                  <button
                    className="w-full flex items-center justify-between px-4 py-3 border-2 border-gray-200 rounded-lg bg-white text-gray-700 hover:border-blue-500 transition-colors"
                    onClick={() => setIsBulkUpdateFieldDropdownOpen(!isBulkUpdateFieldDropdownOpen)}
                  >
                    <span className="text-sm font-medium">{selectedBulkFieldConfig?.label || "Select a field"}</span>
                    <ChevronDown size={16} />
                  </button>
                  {isBulkUpdateFieldDropdownOpen && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white border-2 border-gray-200 rounded-xl shadow-xl z-50 max-h-60 overflow-y-auto">
                      {bulkUpdateFieldOptions.map((option) => (
                        <div
                          key={option.value}
                          className="p-3 cursor-pointer hover:bg-blue-50 text-sm text-gray-700 transition-colors"
                          onClick={() => handleBulkUpdateFieldSelect(option.value)}
                        >
                          {option.label}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {selectedBulkFieldConfig?.type === "select" ? (
                  <select
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    value={bulkUpdateValue}
                    onChange={(e) => setBulkUpdateValue(e.target.value)}
                  >
                    <option value="">Select a value</option>
                    {(selectedBulkFieldConfig.options || []).map((option: any) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                ) : selectedBulkFieldConfig?.type === "textarea" ? (
                  <textarea
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all resize-none"
                    placeholder={selectedBulkFieldConfig?.placeholder || "Enter new value"}
                    value={bulkUpdateValue}
                    onChange={(e) => setBulkUpdateValue(e.target.value)}
                    rows={4}
                  />
                ) : (
                  <input
                    type={selectedBulkFieldConfig?.type === "date" ? "date" : "text"}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    placeholder={selectedBulkFieldConfig?.placeholder || "Enter new value"}
                    value={bulkUpdateValue}
                    onChange={(e) => setBulkUpdateValue(e.target.value)}
                    onMouseEnter={(e) => (e.target as HTMLElement).style.backgroundColor = "#E5E7EB"}
                    onMouseLeave={(e) => (e.target as HTMLElement).style.backgroundColor = "#F3F4F6"}
                  />
                )}
              </div>
              <p className="mt-4 text-xs text-gray-500">
                <strong className="text-gray-700">Note:</strong> All the selected credit notes will be updated with the new information and you cannot undo this action.
              </p>
            </div>
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
              <button
                className="px-6 py-2 bg-gradient-to-r from-[#156372] to-[#0D4A52] text-white rounded-lg text-sm font-semibold hover:opacity-90 transition-all shadow-sm"
                onClick={handleBulkUpdateSubmit}
              >
                Update
              </button>
              <button
                className="px-6 py-2 bg-white border-2 border-gray-200 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors"
                onClick={handleBulkUpdateCancel}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="p-6 relative">

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-white sticky top-0 z-10 border-b border-gray-200 shadow-sm">
                <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="px-4 py-3 w-16 min-w-[64px]">
                    <div className="flex items-center gap-2">
                      <button
                        className="p-1 hover:bg-gray-200 rounded transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectAll();
                        }}
                      >
                        {selectedCreditNotes.length === filteredCreditNotes.length && filteredCreditNotes.length > 0 ? (
                          <CheckSquare size={16} fill="#6b7280" color="#6b7280" />
                        ) : (
                          <Square size={16} className="text-gray-400" />
                        )}
                      </button>
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left">
                    <button className="flex items-center gap-2 hover:text-blue-600 transition-colors">
                        DATE
                      </button>
                  </th>
                  <th className="px-4 py-3 text-left">
                    <button className="flex items-center gap-2 hover:text-blue-600 transition-colors">
                        CREDIT NOTE#
                        <ArrowUpDown size={14} className="text-gray-400" />
                      </button>
                  </th>
                  <th className="px-4 py-3 text-left">REFERENCE NUMBER</th>
                  <th className="px-4 py-3 text-left">CUSTOMER NAME</th>
                  <th className="px-4 py-3 text-left">INVOICE#</th>
                  <th className="px-4 py-3 text-left">STATUS</th>
                  <th className="px-4 py-3 text-left">AMOUNT</th>
                  <th className="px-4 py-3 text-left">BALANCE</th>
                  <th className="px-4 py-3 text-left">
                      <button
                        onClick={() => setShowSearchModal(true)}
                        className="cursor-pointer hover:text-gray-700"
                      >
                        <Search size={16} className="text-gray-500" />
                      </button>
                  </th>
                  <th className="px-4 py-3 text-left"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {isRefreshing || !hasLoadedOnce ? (
                  Array(5).fill(0).map((_, index) => (
                    <tr key={`skeleton-${index}`} className="animate-pulse border-b border-gray-50">
                      <td className="px-4 py-3">
                        <div className="w-4 h-4 bg-gray-100 rounded"></div>
                      </td>
                      <td className="px-4 py-3"><div className="h-4 bg-gray-100 rounded w-24"></div></td>
                      <td className="px-4 py-3"><div className="h-4 bg-gray-100 rounded w-32"></div></td>
                      <td className="px-4 py-3"><div className="h-4 bg-gray-100 rounded w-24"></div></td>
                      <td className="px-4 py-3"><div className="h-4 bg-gray-100 rounded w-32"></div></td>
                      <td className="px-4 py-3"><div className="h-4 bg-gray-100 rounded w-24"></div></td>
                      <td className="px-4 py-3"><div className="h-6 bg-gray-100 rounded w-20"></div></td>
                      <td className="px-4 py-3"><div className="h-4 bg-gray-100 rounded w-20"></div></td>
                      <td className="px-4 py-3"><div className="h-4 bg-gray-100 rounded w-20"></div></td>
                      <td className="px-4 py-3"></td>
                      <td className="px-4 py-3"></td>
                    </tr>
                  ))
                ) : filteredCreditNotes.length === 0 ? (
                  <tr>
                    <td colSpan="11" className="px-4 py-8 text-center text-gray-500 text-sm">
                      No credit notes found matching the selected filter.
                    </td>
                  </tr>
                ) : (
                  filteredCreditNotes.map((note) => {
                    const isSelected = selectedCreditNotes.includes(note.id);
                    return (
                      <tr
                        key={note.id}
                        onClick={(e) => {
                          const target = e.target as HTMLElement;
                          if (!target.closest('button') && !target.closest('svg')) {
                            navigate(`/sales/credit-notes/${note.id}`);
                          }
                        }}
                        className="group transition-all hover:bg-slate-50/50 cursor-pointer"
                        style={isSelected ? { backgroundColor: "#1b5e6a1A" } : {}}
                      >
                        <td className="px-4 py-3">
                          <button
                            className="p-1 hover:bg-gray-200 rounded transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedCreditNotes(prev =>
                                prev.includes(note.id)
                                  ? prev.filter(id => id !== note.id)
                                  : [...prev, note.id]
                              );
                            }}
                          >
                            {selectedCreditNotes.includes(note.id) ? (
                              <CheckSquare size={16} fill="#6b7280" color="#6b7280" />
                            ) : (
                              <Square size={16} className="text-gray-400" />
                            )}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-[13px] text-slate-600">{formatDate(note.creditNoteDate || note.date)}</td>
                        <td className="px-4 py-3">
                          <span
                            className="text-[13px] font-medium text-[#156372] hover:underline cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/sales/credit-notes/${note.id}`);
                            }}
                          >
                            {note.creditNoteNumber || note.id}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-[13px] text-slate-600">{note.referenceNumber || ""}</td>
                        <td className="px-4 py-3 text-[13px] text-slate-600">{note.customerName || note.customer?.displayName || note.customer?.companyName || (typeof note.customer === 'string' ? note.customer : "")}</td>
                        <td className="px-4 py-3 text-[13px] text-slate-600">{note.invoiceNumber || ""}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`text-[11px] font-semibold ${(note.status || "open").toLowerCase() === "open"
                              ? "text-green-700"
                              : (note.status || "open").toLowerCase() === "closed"
                                ? "text-gray-700"
                                : (note.status || "open").toLowerCase() === "draft"
                                  ? "text-yellow-700"
                                  : "text-red-700"
                              }`}
                          >
                            {(note.status || "open").toUpperCase()}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-[13px] text-slate-600 font-semibold">{formatCurrency(note.total || note.amount || 0, note.currency)}</td>
                        <td className="px-4 py-3 text-[13px] text-slate-600">{formatCurrency(note.balance || note.total || note.amount || 0, note.currency)}</td>
                        <td className="px-4 py-3"></td>
                        <td className="px-4 py-3">
                          <button
                            className="p-2 hover:bg-blue-50 rounded-lg text-gray-600 hover:text-blue-600 transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/sales/credit-notes/${note.id}/edit`);
                            }}
                            title="Edit Credit Note"
                          >
                            <Pencil size={16} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Search Modal */}
      {showSearchModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-[1001] flex items-center justify-center"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowSearchModal(false);
            }
          }}
        >
          <div className="bg-white rounded-lg shadow-lg w-full max-w-[800px] mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between py-4 px-6 border-b border-gray-200">
              <div className="flex items-center gap-6">
                {/* Search Type Dropdown */}
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-700">Search</label>
                  <div className="relative" ref={searchTypeDropdownRef}>
                    <div
                      className={`flex items-center justify-between w-[180px] py-2 px-3 text-sm text-gray-700 bg-white border rounded-md cursor-pointer transition-colors ${isSearchTypeDropdownOpen ? "border-blue-600" : "border-gray-300 hover:border-gray-400"}`}
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
                      className={`flex items-center justify-between w-[200px] py-2 px-3 text-sm text-gray-700 bg-white border rounded-md cursor-pointer transition-colors ${isFilterDropdownOpen ? "border-blue-600" : "border-gray-300 hover:border-gray-400"}`}
                      onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)}
                    >
                      <span>All</span>
                      <ChevronDown size={16} className={`text-gray-500 transition-transform ${isFilterDropdownOpen ? "rotate-180" : ""}`} />
                    </div>
                    {isFilterDropdownOpen && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-blue-600 border-t-0 rounded-b-md shadow-lg z-[1002] max-h-[200px] overflow-y-auto">
                        <div
                          className="py-2.5 px-3.5 text-sm text-gray-700 cursor-pointer transition-colors hover:bg-gray-100"
                          onClick={() => {
                            setIsFilterDropdownOpen(false);
                          }}
                        >
                          All
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <button
                className="flex items-center justify-center w-7 h-7 bg-transparent border-none cursor-pointer text-gray-500 hover:text-gray-700 transition-colors"
                onClick={() => setShowSearchModal(false)}
              >
                <X size={20} />
              </button>
            </div>

            {/* Search Criteria Body */}
            <div className="p-6">
              {searchType === "Credit Notes" && (
                <div className="grid grid-cols-2 gap-6">
                  {/* Left Column */}
                  <div className="space-y-4">
                    {/* Credit Note# */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Credit Note#</label>
                      <input
                        type="text"
                        value={searchModalData.creditNoteNumber}
                        onChange={(e) => setSearchModalData(prev => ({ ...prev, creditNoteNumber: e.target.value }))}
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
                          value={searchModalData.dateRangeFromCreditNote}
                          onChange={(e) => setSearchModalData(prev => ({ ...prev, dateRangeFromCreditNote: e.target.value }))}
                          className="flex-1 py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                        />
                        <span className="text-gray-500">-</span>
                        <input
                          type="text"
                          placeholder="dd/MM/yyyy"
                          value={searchModalData.dateRangeToCreditNote}
                          onChange={(e) => setSearchModalData(prev => ({ ...prev, dateRangeToCreditNote: e.target.value }))}
                          className="flex-1 py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                        />
                      </div>
                    </div>

                    {/* Item Name */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Item Name</label>
                      <div className="relative" ref={itemNameCreditNoteDropdownRef}>
                        <div
                          className={`flex items-center justify-between w-full py-2 px-3 text-sm text-gray-700 bg-white border rounded-md cursor-pointer transition-colors ${isItemNameCreditNoteDropdownOpen ? "border-blue-600" : "border-gray-300 hover:border-gray-400"}`}
                          onClick={() => setIsItemNameCreditNoteDropdownOpen(!isItemNameCreditNoteDropdownOpen)}
                        >
                          <span className={searchModalData.itemNameCreditNote ? "text-gray-700" : "text-gray-400"}>
                            {searchModalData.itemNameCreditNote || "Select an item"}
                          </span>
                          <ChevronDown size={16} className={`text-gray-500 transition-transform ${isItemNameCreditNoteDropdownOpen ? "rotate-180" : ""}`} />
                        </div>
                        {isItemNameCreditNoteDropdownOpen && (
                          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-blue-600 border-t-0 rounded-b-md shadow-lg z-[1002]">
                            <div className="py-2.5 px-3.5 text-sm text-gray-500">No options available</div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Account */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Account</label>
                      <div className="relative" ref={accountCreditNoteDropdownRef}>
                        <div
                          className={`flex items-center justify-between w-full py-2 px-3 text-sm text-gray-700 bg-white border rounded-md cursor-pointer transition-colors ${isAccountCreditNoteDropdownOpen ? "border-blue-600" : "border-gray-300 hover:border-gray-400"}`}
                          onClick={() => setIsAccountCreditNoteDropdownOpen(!isAccountCreditNoteDropdownOpen)}
                        >
                          <span className={searchModalData.accountCreditNote ? "text-gray-700" : "text-gray-400"}>
                            {searchModalData.accountCreditNote || "Select an account"}
                          </span>
                          <ChevronDown size={16} className={`text-gray-500 transition-transform ${isAccountCreditNoteDropdownOpen ? "rotate-180" : ""}`} />
                        </div>
                        {isAccountCreditNoteDropdownOpen && (
                          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-blue-600 border-t-0 rounded-b-md shadow-lg z-[1002]">
                            <div className="py-2.5 px-3.5 text-sm text-gray-500">No options available</div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Notes */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Notes</label>
                      <input
                        type="text"
                        value={searchModalData.notesCreditNote}
                        onChange={(e) => setSearchModalData(prev => ({ ...prev, notesCreditNote: e.target.value }))}
                        className="w-full py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                      />
                    </div>

                    {/* Project Name */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Project Name</label>
                      <div className="relative" ref={projectNameCreditNoteDropdownRef}>
                        <div
                          className={`flex items-center justify-between w-full py-2 px-3 text-sm text-gray-700 bg-white border rounded-md cursor-pointer transition-colors ${isProjectNameCreditNoteDropdownOpen ? "border-blue-600" : "border-gray-300 hover:border-gray-400"}`}
                          onClick={() => setIsProjectNameCreditNoteDropdownOpen(!isProjectNameCreditNoteDropdownOpen)}
                        >
                          <span className={searchModalData.projectNameCreditNote ? "text-gray-700" : "text-gray-400"}>
                            {searchModalData.projectNameCreditNote || "Select a project"}
                          </span>
                          <ChevronDown size={16} className={`text-gray-500 transition-transform ${isProjectNameCreditNoteDropdownOpen ? "rotate-180" : ""}`} />
                        </div>
                        {isProjectNameCreditNoteDropdownOpen && (
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
                            name="addressTypeCreditNote"
                            value="Billing and Shipping"
                            checked={searchModalData.addressTypeCreditNote === "Billing and Shipping"}
                            onChange={(e) => setSearchModalData(prev => ({ ...prev, addressTypeCreditNote: e.target.value }))}
                            className="cursor-pointer"
                          />
                          <span className="text-sm text-gray-700">Billing and Shipping</span>
                        </label>
                        <label className="flex items-center gap-1.5">
                          <input
                            type="radio"
                            name="addressTypeCreditNote"
                            value="Billing"
                            checked={searchModalData.addressTypeCreditNote === "Billing"}
                            onChange={(e) => setSearchModalData(prev => ({ ...prev, addressTypeCreditNote: e.target.value }))}
                            className="cursor-pointer"
                          />
                          <span className="text-sm text-gray-700">Billing</span>
                        </label>
                        <label className="flex items-center gap-1.5">
                          <input
                            type="radio"
                            name="addressTypeCreditNote"
                            value="Shipping"
                            checked={searchModalData.addressTypeCreditNote === "Shipping"}
                            onChange={(e) => setSearchModalData(prev => ({ ...prev, addressTypeCreditNote: e.target.value }))}
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
                        value={searchModalData.referenceNumberCreditNote}
                        onChange={(e) => setSearchModalData(prev => ({ ...prev, referenceNumberCreditNote: e.target.value }))}
                        className="w-full py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                      />
                    </div>

                    {/* Status */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Status</label>
                      <div className="relative" ref={statusCreditNoteDropdownRef}>
                        <div
                          className={`flex items-center justify-between w-full py-2 px-3 text-sm text-gray-700 bg-white border rounded-md cursor-pointer transition-colors ${isStatusCreditNoteDropdownOpen ? "border-blue-600" : "border-gray-300 hover:border-gray-400"}`}
                          onClick={() => setIsStatusCreditNoteDropdownOpen(!isStatusCreditNoteDropdownOpen)}
                        >
                          <span className={searchModalData.statusCreditNote ? "text-gray-700" : "text-gray-400"}>
                            {searchModalData.statusCreditNote || "Select"}
                          </span>
                          <ChevronDown size={16} className={`text-gray-500 transition-transform ${isStatusCreditNoteDropdownOpen ? "rotate-180" : ""}`} />
                        </div>
                        {isStatusCreditNoteDropdownOpen && (
                          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-blue-600 border-t-0 rounded-b-md shadow-lg z-[1002]">
                            <div className="py-2.5 px-3.5 text-sm text-gray-500">No options available</div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Item Description */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Item Description</label>
                      <input
                        type="text"
                        value={searchModalData.itemDescriptionCreditNote}
                        onChange={(e) => setSearchModalData(prev => ({ ...prev, itemDescriptionCreditNote: e.target.value }))}
                        className="w-full py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                      />
                    </div>

                    {/* Total Range */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Total Range</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={searchModalData.totalRangeFromCreditNote}
                          onChange={(e) => setSearchModalData(prev => ({ ...prev, totalRangeFromCreditNote: e.target.value }))}
                          className="flex-1 py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                        />
                        <span className="text-gray-500">-</span>
                        <input
                          type="text"
                          value={searchModalData.totalRangeToCreditNote}
                          onChange={(e) => setSearchModalData(prev => ({ ...prev, totalRangeToCreditNote: e.target.value }))}
                          className="flex-1 py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                        />
                      </div>
                    </div>

                    {/* Customer Name */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Customer Name</label>
                      <div className="relative" ref={customerNameCreditNoteDropdownRef}>
                        <div
                          className={`flex items-center justify-between w-full py-2 px-3 text-sm text-gray-700 bg-white border rounded-md cursor-pointer transition-colors ${isCustomerNameCreditNoteDropdownOpen ? "border-blue-600" : "border-gray-300 hover:border-gray-400"}`}
                          onClick={() => setIsCustomerNameCreditNoteDropdownOpen(!isCustomerNameCreditNoteDropdownOpen)}
                        >
                          <span className={searchModalData.customerNameCreditNote ? "text-gray-700" : "text-gray-400"}>
                            {searchModalData.customerNameCreditNote || "Select customer"}
                          </span>
                          <ChevronDown size={16} className={`text-gray-500 transition-transform ${isCustomerNameCreditNoteDropdownOpen ? "rotate-180" : ""}`} />
                        </div>
                        {isCustomerNameCreditNoteDropdownOpen && (
                          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-blue-600 border-t-0 rounded-b-md shadow-lg z-[1002]">
                            <div className="py-2.5 px-3.5 text-sm text-gray-500">No options available</div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Tax Exemptions */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Tax Exemptions</label>
                      <div className="relative" ref={taxExemptionsCreditNoteDropdownRef}>
                        <div
                          className={`flex items-center justify-between w-full py-2 px-3 text-sm text-gray-700 bg-white border rounded-md cursor-pointer transition-colors ${isTaxExemptionsCreditNoteDropdownOpen ? "border-blue-600" : "border-gray-300 hover:border-gray-400"}`}
                          onClick={() => setIsTaxExemptionsCreditNoteDropdownOpen(!isTaxExemptionsCreditNoteDropdownOpen)}
                        >
                          <span className={searchModalData.taxExemptionsCreditNote ? "text-gray-700" : "text-gray-400"}>
                            {searchModalData.taxExemptionsCreditNote || "Select a Tax Exemption"}
                          </span>
                          <ChevronDown size={16} className={`text-gray-500 transition-transform ${isTaxExemptionsCreditNoteDropdownOpen ? "rotate-180" : ""}`} />
                        </div>
                        {isTaxExemptionsCreditNoteDropdownOpen && (
                          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-blue-600 border-t-0 rounded-b-md shadow-lg z-[1002]">
                            <div className="py-2.5 px-3.5 text-sm text-gray-500">No options available</div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => setShowSearchModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  console.log("Search with:", searchType, searchModalData);
                  setShowSearchModal(false);
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 cursor-pointer"
              >
                Search
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Field Customization Modal */}
      {isFieldCustomizationOpen && (
        <FieldCustomization
          featureType="credit-notes"
          onClose={() => setIsFieldCustomizationOpen(false)}
        />
      )}

      {/* Preferences Modal */}
      {isPreferencesModalOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsPreferencesModalOpen(false);
            }
          }}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
              <h2 className="text-xl font-semibold text-gray-900">Credit Note Preferences</h2>
              <button
                onClick={() => setIsPreferencesModalOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-lg text-gray-600 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              {/* Credit Note Editing Options */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-900 mb-4">Credit Note Options</h3>
                <div className="space-y-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      defaultChecked={false}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                    />
                    <span className="text-sm text-gray-700">Allow editing of Sent Credit Note?</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      defaultChecked={false}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                    />
                    <span className="text-sm text-gray-700">Automatically apply credit notes to invoices</span>
                  </label>
                </div>
              </div>

              {/* Default Terms & Conditions */}
              <div className="mb-6 pb-6 border-b border-gray-200">
                <h3 className="text-sm font-semibold text-gray-900 mb-2">Default Terms & Conditions</h3>
                <textarea
                  className="w-full px-4 py-3 border border-gray-300 rounded-md text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y min-h-[150px]"
                  placeholder="Enter default terms and conditions for credit notes..."
                />
              </div>

              {/* Default Customer Notes */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-900 mb-2">Default Customer Notes</h3>
                <textarea
                  className="w-full px-4 py-3 border border-gray-300 rounded-md text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y min-h-[150px]"
                  placeholder="Enter default customer notes for credit notes..."
                />
              </div>

              {/* Save Button */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={() => setIsPreferencesModalOpen(false)}
                  className="px-6 py-2 bg-white border border-gray-300 text-gray-700 rounded-md text-sm font-medium cursor-pointer hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    // TODO: Save preferences to localStorage or backend
                    alert("Preferences saved successfully!");
                    setIsPreferencesModalOpen(false);
                  }}
                  className="px-6 py-2 bg-red-600 text-white rounded-md text-sm font-medium cursor-pointer hover:bg-red-700"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

