import React, { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import LoadingSpinner from "../../../components/LoadingSpinner";
import { getSalesReceipts, getSalesReceiptsPaginated, deleteSalesReceipt, updateSalesReceipt, getSalesReceiptById, getCustomers, getSalespersons, getTaxes, getProjects, getItemsFromAPI, getCustomViews, deleteCustomView } from "../salesModel";
// import { sampleItems } from "../../items/itemsModel";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import {
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Plus,
  MoreVertical,
  ArrowUpDown,
  Settings,
  RefreshCw,
  Search,
  Star,
  Filter,
  X,
  FileUp,
  CheckSquare,
  Square,
  FileText,
  Grid3x3,
  Trash2,
  Eye,
  Check,
  Download,
  RotateCcw
} from "lucide-react";

// import FieldCustomization from "../shared/FieldCustomization";

const sampleItems: any[] = [];
const FieldCustomization: React.FC<any> = () => null;

const salesReceiptViews = [
  "All",
  "Paid",
  "Void"
];

const viewStatusMap = {
  All: "All",
  Paid: "completed",
  Void: "void"
};

export default function SalesReceipts() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isViewDropdownOpen, setIsViewDropdownOpen] = useState(false);
  const [selectedView, setSelectedView] = useState("All Sales Receipts");
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [activeSort, setActiveSort] = useState("Date (Newest First)");
  const [viewSearchQuery, setViewSearchQuery] = useState("");
  const [customViews, setCustomViews] = useState(() => getCustomViews().filter(v => v.type === "sales-receipts"));
  const [isPeriodDropdownOpen, setIsPeriodDropdownOpen] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState("All");

  const [isAdvancedSearchOpen, setIsAdvancedSearchOpen] = useState(false);
  const [advancedSearchData, setAdvancedSearchData] = useState({
    searchType: "Sales Receipts",
    filterType: "All",
    receiptNumber: "",
    referenceNumber: "",
    dateRangeFrom: "",
    dateRangeTo: "",
    itemName: "",
    itemDescription: "",
    account: "",
    totalRangeFrom: "",
    totalRangeTo: "",
    customerName: "",
    paymentMethod: "",
    salesperson: "",
    tax: "",
    addressType: "Billing and Shipping",
    attention: "",
    addressLine: ""
  });

  // Dropdown states for advanced search
  const [isSearchTypeDropdownOpen, setIsSearchTypeDropdownOpen] = useState(false);
  const [isFilterTypeDropdownOpen, setIsFilterTypeDropdownOpen] = useState(false);
  const [isItemNameDropdownOpen, setIsItemNameDropdownOpen] = useState(false);
  const [isAccountDropdownOpen, setIsAccountDropdownOpen] = useState(false);
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);
  const [isPaymentMethodDropdownOpen, setIsPaymentMethodDropdownOpen] = useState(false);
  const [isSalespersonDropdownOpen, setIsSalespersonDropdownOpen] = useState(false);
  const [isTaxDropdownOpen, setIsTaxDropdownOpen] = useState(false);
  const [isAttentionDropdownOpen, setIsAttentionDropdownOpen] = useState(false);

  // Refs for advanced search dropdowns
  const searchTypeDropdownRef = useRef(null);
  const filterTypeDropdownRef = useRef(null);
  const itemNameDropdownRef = useRef(null);
  const accountDropdownRef = useRef(null);
  const customerDropdownRef = useRef(null);
  const paymentMethodDropdownRef = useRef(null);
  const salespersonDropdownRef = useRef(null);
  const taxDropdownRef = useRef(null);
  const attentionDropdownRef = useRef(null);

  const [isBulkUpdateModalOpen, setIsBulkUpdateModalOpen] = useState(false);
  const [bulkUpdateField, setBulkUpdateField] = useState("");
  const [bulkUpdateValue, setBulkUpdateValue] = useState("");
  const [isBulkUpdateFieldDropdownOpen, setIsBulkUpdateFieldDropdownOpen] = useState(false);
  const [isFieldCustomizationOpen, setIsFieldCustomizationOpen] = useState(false);

  const [salesReceipts, setSalesReceipts] = useState([]);
  const [filteredSalesReceipts, setFilteredSalesReceipts] = useState([]);
  const [selectedReceipts, setSelectedReceipts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [salespersons, setSalespersons] = useState([]);
  const [projects, setProjects] = useState([]);
  const [taxes, setTaxes] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 50, pages: 0 });
  const [currentPage, setCurrentPage] = useState(1);

  const viewDropdownRef = useRef(null);
  const moreMenuRef = useRef(null);
  const sortDropdownRef = useRef(null);
  const exportDropdownRef = useRef(null);
  const periodDropdownRef = useRef(null);
  const bulkUpdateFieldDropdownRef = useRef(null);

  const periodOptions = ["All", "Today", "This Week", "This Month", "This Quarter", "This Year", "Custom"];

  const sortOptions = [
    "Date (Newest First)",
    "Date (Oldest First)",
    "Receipt # (Ascending)",
    "Receipt # (Descending)",
    "Customer Name (A-Z)",
    "Customer Name (Z-A)",
    "Amount (High to Low)",
    "Amount (Low to High)"
  ];

  const sortMenuOptions = [
    { label: "Receipt Date", value: "Date (Newest First)" },
    { label: "Sales Receipt#", value: "Receipt # (Ascending)" },
    { label: "Customer Name", value: "Customer Name (A-Z)" },
    { label: "Amount", value: "Amount (High to Low)" },
    { label: "Created Time", value: "Date (Newest First)" }
  ];

  const exportOptions = [
    "Export to PDF",
    "Export to Excel",
    "Export to CSV"
  ];

  const titleCase = (value) => String(value || "")
    .replace(/_/g, " ")
    .trim()
    .replace(/\w\S*/g, (text) => text.charAt(0).toUpperCase() + text.slice(1).toLowerCase());

  const customerBulkOptions = useMemo<{ value: string; label: string; customerId: string; customerName: string }[]>(() => {
    const optionsMap = new Map();

    (customers || []).forEach((customer) => {
      const customerId = String(customer?.id || customer?._id || "").trim();
      const customerLabel = String(
        customer?.displayName ||
        customer?.companyName ||
        customer?.name ||
        `${customer?.firstName || ""} ${customer?.lastName || ""}`.trim() ||
        ""
      ).trim();
      if (!customerLabel) return;
      const value = customerId ? `id:${customerId}` : `name:${customerLabel.toLowerCase()}`;
      if (!optionsMap.has(value)) {
        optionsMap.set(value, {
          value,
          label: customerLabel,
          customerId: customerId || "",
          customerName: customerLabel
        });
      }
    });

    (salesReceipts || []).forEach((receipt) => {
      const customerObject = typeof receipt?.customer === "object" ? receipt.customer : null;
      const customerId = String(receipt?.customerId || customerObject?._id || customerObject?.id || "").trim();
      const customerName = String(
        receipt?.customerName ||
        customerObject?.displayName ||
        customerObject?.companyName ||
        customerObject?.name ||
        (typeof receipt?.customer === "string" ? receipt.customer : "") ||
        ""
      ).trim();
      if (!customerName) return;
      const value = customerId ? `id:${customerId}` : `name:${customerName.toLowerCase()}`;
      if (!optionsMap.has(value)) {
        optionsMap.set(value, {
          value,
          label: customerName,
          customerId: customerId || "",
          customerName
        });
      }
    });

    return Array.from(optionsMap.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [customers, salesReceipts]);

  const paymentModeBulkOptions = useMemo(() => {
    const defaults = ["Cash", "Check", "Credit Card", "Bank Transfer", "Bank Remittance", "Other"];
    const dynamicValues = (salesReceipts || [])
      .map((receipt) => String(receipt?.paymentMode || receipt?.paymentMethod || "").trim())
      .filter(Boolean)
      .map((value) => titleCase(value));
    const values = Array.from(new Set([...defaults, ...dynamicValues]));
    return values
      .map((value) => ({ value, label: value }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [salesReceipts]);

  const salespersonBulkOptions = useMemo(() => {
    const fromDB = (salespersons || [])
      .map((salesperson) => String(salesperson?.name || salesperson?.displayName || "").trim())
      .filter(Boolean);
    const fromReceipts = (salesReceipts || [])
      .map((receipt) => {
        if (typeof receipt?.salesperson === "object") {
          return String(receipt?.salesperson?.name || receipt?.salesperson?.displayName || "").trim();
        }
        return String(receipt?.salesperson || "").trim();
      })
      .filter(Boolean);
    const values = Array.from(new Set([...fromDB, ...fromReceipts]));
    return values
      .map((value) => ({ value, label: value }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [salespersons, salesReceipts]);

  const currencyBulkOptions = useMemo(() => {
    const defaults = ["USD", "EUR", "GBP", "KES", "BGN", "INR", "JPY", "AMD"];
    const dynamicValues = (salesReceipts || [])
      .map((receipt) => String(receipt?.currency || "").trim().toUpperCase())
      .filter(Boolean);
    const values = Array.from(new Set([...defaults, ...dynamicValues]));
    return values
      .map((value) => ({ value, label: value }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [salesReceipts]);

  const statusBulkOptions = useMemo(() => {
    const defaults = ["completed", "draft", "void", "paid"];
    const dynamicValues = (salesReceipts || [])
      .map((receipt) => String(receipt?.status || "").trim().toLowerCase())
      .filter(Boolean);
    const values = Array.from(new Set([...defaults, ...dynamicValues]));
    return values
      .map((value) => ({ value, label: titleCase(value) }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [salesReceipts]);

  const bulkFieldConfigs = useMemo(() => ([
    {
      label: "Receipt Date",
      type: "date",
      placeholder: "Select receipt date",
      buildPayload: (value) => {
        const parsedDate = new Date(value);
        if (Number.isNaN(parsedDate.getTime())) return null;
        const isoDate = parsedDate.toISOString();
        return { date: isoDate, receiptDate: isoDate };
      }
    },
    {
      label: "Reference Number",
      type: "text",
      placeholder: "Enter reference number",
      buildPayload: (value) => ({ referenceNumber: value, paymentReference: value })
    },
    {
      label: "Customer Name",
      type: "select",
      options: customerBulkOptions,
      buildPayload: (value) => {
        const selectedOption = customerBulkOptions.find((option) => option.value === value);
        if (!selectedOption) return null;
        const payload: any = { customerName: selectedOption.customerName };
        if (selectedOption.customerId) {
          payload.customer = selectedOption.customerId;
          payload.customerId = selectedOption.customerId;
        }
        return payload;
      }
    },
    {
      label: "Payment Mode",
      type: "select",
      options: paymentModeBulkOptions,
      buildPayload: (value) => ({
        paymentMode: value,
        paymentMethod: String(value || "").trim().toLowerCase().replace(/\s+/g, "_")
      })
    },
    {
      label: "Status",
      type: "select",
      options: statusBulkOptions,
      buildPayload: (value) => ({ status: String(value || "").trim().toLowerCase() })
    },
    {
      label: "Currency",
      type: "select",
      options: currencyBulkOptions,
      buildPayload: (value) => ({ currency: String(value || "").trim().toUpperCase() })
    },
    {
      label: "Salesperson",
      type: "select",
      options: salespersonBulkOptions,
      buildPayload: (value) => ({ salesperson: String(value || "").trim() })
    },
    {
      label: "Created By",
      type: "text",
      placeholder: "Enter creator name",
      buildPayload: (value) => ({ createdBy: value })
    },
    {
      label: "Tax",
      type: "number",
      placeholder: "0.00",
      buildPayload: (value) => ({ tax: value })
    },
    {
      label: "Discount",
      type: "number",
      placeholder: "0.00",
      buildPayload: (value) => ({ discount: value })
    },
    {
      label: "Shipping Charges",
      type: "number",
      placeholder: "0.00",
      buildPayload: (value) => ({ shippingCharges: value })
    },
    {
      label: "Adjustment",
      type: "number",
      placeholder: "0.00",
      buildPayload: (value) => ({ adjustment: value })
    },
    {
      label: "Amount",
      type: "number",
      placeholder: "0.00",
      buildPayload: (value) => ({ amount: value, total: value })
    }
  ]), [currencyBulkOptions, customerBulkOptions, paymentModeBulkOptions, salespersonBulkOptions, statusBulkOptions]);

  const bulkUpdateFieldOptions = bulkFieldConfigs.map((config) => config.label);
  const selectedBulkFieldConfig = bulkFieldConfigs.find((config) => config.label === bulkUpdateField) || null;

  const mapSortOptionToField = (option) => {
    switch (option) {
      case "Date (Newest First)":
      case "Date (Oldest First)": return "date";
      case "Receipt # (Ascending)":
      case "Receipt # (Descending)": return "receiptNumber";
      case "Amount (High to Low)":
      case "Amount (Low to High)": return "total";
      case "Customer Name (A-Z)":
      case "Customer Name (Z-A)": return "customerName";
      default: return "date";
    }
  };

  const refreshData = async (page = currentPage) => {
    setIsRefreshing(true);
    try {
      const isDesc = activeSort.includes("Descending") || activeSort.includes("Newest") || activeSort.includes("High to Low");
      const response = await getSalesReceiptsPaginated({
        page,
        limit: 50,
        status: selectedStatus === "All" ? "All" : selectedStatus,
        sortBy: mapSortOptionToField(activeSort),
        sortOrder: isDesc ? "desc" : "asc"
      });

      setSalesReceipts(response.data);
      setFilteredSalesReceipts(response.data);
      setPagination(response.pagination);

      const allCustomViews = getCustomViews().filter(v => v.type === "sales-receipts");
      setCustomViews(allCustomViews);
    } catch (error) {
      console.error("Error refreshing data:", error);
    } finally {
      setIsRefreshing(false);
      setHasLoadedOnce(true);
    }
  };

  useEffect(() => {
    refreshData(currentPage);
  }, [selectedStatus, activeSort, currentPage]);

  useEffect(() => {
    const initialLoad = async () => {
      try {
        setCustomers(await getCustomers());
        setSalespersons(await getSalespersons());
        setProjects(await getProjects());
        setTaxes(await getTaxes());
      } catch (error) {
        console.error("Error loading dropdown data:", error);
      }
    };

    initialLoad();

    window.addEventListener("storage", () => refreshData(currentPage));
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) refreshData(currentPage);
    });

    return () => {
      window.removeEventListener("storage", () => refreshData(currentPage));
      document.removeEventListener("visibilitychange", () => refreshData(currentPage));
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (viewDropdownRef.current && !viewDropdownRef.current.contains(event.target)) {
        setIsViewDropdownOpen(false);
      }
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target)) {
        setIsMoreMenuOpen(false);
        setIsSortMenuOpen(false);
      }
      if (periodDropdownRef.current && !periodDropdownRef.current.contains(event.target)) {
        setIsPeriodDropdownOpen(false);
      }
      if (bulkUpdateFieldDropdownRef.current && !bulkUpdateFieldDropdownRef.current.contains(event.target)) {
        setIsBulkUpdateFieldDropdownOpen(false);
      }
      if (searchTypeDropdownRef.current && !searchTypeDropdownRef.current.contains(event.target)) {
        setIsSearchTypeDropdownOpen(false);
      }
      if (filterTypeDropdownRef.current && !filterTypeDropdownRef.current.contains(event.target)) {
        setIsFilterTypeDropdownOpen(false);
      }
      if (itemNameDropdownRef.current && !itemNameDropdownRef.current.contains(event.target)) {
        setIsItemNameDropdownOpen(false);
      }
      if (accountDropdownRef.current && !accountDropdownRef.current.contains(event.target)) {
        setIsAccountDropdownOpen(false);
      }
      if (customerDropdownRef.current && !customerDropdownRef.current.contains(event.target)) {
        setIsCustomerDropdownOpen(false);
      }
      if (paymentMethodDropdownRef.current && !paymentMethodDropdownRef.current.contains(event.target)) {
        setIsPaymentMethodDropdownOpen(false);
      }
      if (salespersonDropdownRef.current && !salespersonDropdownRef.current.contains(event.target)) {
        setIsSalespersonDropdownOpen(false);
      }
      if (taxDropdownRef.current && !taxDropdownRef.current.contains(event.target)) {
        setIsTaxDropdownOpen(false);
      }
      if (attentionDropdownRef.current && !attentionDropdownRef.current.contains(event.target)) {
        setIsAttentionDropdownOpen(false);
      }
    };

    if (isViewDropdownOpen || isMoreMenuOpen || isSortMenuOpen || isPeriodDropdownOpen || isBulkUpdateFieldDropdownOpen || isSearchTypeDropdownOpen || isFilterTypeDropdownOpen || isItemNameDropdownOpen || isAccountDropdownOpen || isCustomerDropdownOpen || isPaymentMethodDropdownOpen || isSalespersonDropdownOpen || isTaxDropdownOpen || isAttentionDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isViewDropdownOpen, isMoreMenuOpen, isSortMenuOpen, isPeriodDropdownOpen, isBulkUpdateFieldDropdownOpen]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape" && selectedReceipts.length > 0) {
        setSelectedReceipts([]);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectedReceipts]);

  const getSalesReceiptFieldValue = (receipt, fieldName) => {
    const fieldMap = {
      "Date": receipt.receiptDate || receipt.date || "",
      "Receipt Number": receipt.receiptNumber || receipt.id || "",
      "Reference Number": receipt.referenceNumber || "",
      "Customer Name": receipt.customerName || receipt.customer || "",
      "Status": receipt.status || "completed",
      "Amount": receipt.total || receipt.amount || 0,
      "Payment Method": receipt.paymentMode || receipt.paymentMethod || "",
      "Salesperson": receipt.salesperson || ""
    };
    return fieldMap[fieldName] !== undefined ? fieldMap[fieldName] : "";
  };

  const evaluateCriterion = (fieldValue, comparator, value) => {
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

  const applyFilters = (allReceipts, status, views = customViews, sortOption = activeSort) => {
    let filtered = Array.isArray(allReceipts) ? allReceipts : [];

    // Check if it's a custom view
    const customView = views.find(v => v.name === status);
    if (customView && customView.criteria) {
      filtered = filtered.filter(receipt => {
        return customView.criteria.every(criterion => {
          if (!criterion.field || !criterion.comparator) return true;
          const fieldValue = getSalesReceiptFieldValue(receipt, criterion.field);
          return evaluateCriterion(fieldValue, criterion.comparator, criterion.value);
        });
      });
    } else if (status !== "All") {
      filtered = filtered.filter(receipt => {
        const receiptStatus = (receipt.status || "completed").toLowerCase();
        return receiptStatus === status.toLowerCase();
      });
    }

    // Apply Sorting
    const sorted = [...filtered];
    switch (sortOption) {
      case "Date (Newest First)":
        sorted.sort((a, b) => new Date(b.date || b.receiptDate).getTime() - new Date(a.date || a.receiptDate).getTime());
        break;
      case "Date (Oldest First)":
        sorted.sort((a, b) => new Date(a.date || a.receiptDate).getTime() - new Date(b.date || b.receiptDate).getTime());
        break;
      case "Receipt # (Ascending)":
        sorted.sort((a, b) => (a.receiptNumber || "").localeCompare(b.receiptNumber || ""));
        break;
      case "Receipt # (Descending)":
        sorted.sort((a, b) => (b.receiptNumber || "").localeCompare(a.receiptNumber || ""));
        break;
      case "Customer Name (A-Z)":
        sorted.sort((a, b) => (a.customerName || "").localeCompare(b.customerName || ""));
        break;
      case "Customer Name (Z-A)":
        sorted.sort((a, b) => (b.customerName || "").localeCompare(a.customerName || ""));
        break;
      case "Amount (High to Low)":
        sorted.sort((a, b) => (parseFloat(b.total || b.amount || 0)) - (parseFloat(a.total || a.amount || 0)));
        break;
      case "Amount (Low to High)":
        sorted.sort((a, b) => (parseFloat(a.total || a.amount || 0)) - (parseFloat(b.total || b.amount || 0)));
        break;
      default:
        break;
    }

    setFilteredSalesReceipts(sorted);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    try {
      // Handle both ISO date strings and formatted date strings (e.g., "13 Dec 2025")
      let date;
      if (typeof dateString === 'string' && dateString.includes(' ')) {
        // Already formatted, try to parse it
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const parts = dateString.split(' ');
        if (parts.length === 3) {
          const day = parseInt(parts[0]);
          const month = months.indexOf(parts[1]);
          const year = parseInt(parts[2]);
          if (month !== -1) {
            date = new Date(year, month, day);
          } else {
            date = new Date(dateString);
          }
        } else {
          date = new Date(dateString);
        }
      } else {
        date = new Date(dateString);
      }

      if (isNaN(date.getTime())) {
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

  const formatCurrency = (amount, currency = "AMD") => {
    const numAmount = parseFloat(amount) || 0;
    return `${currency}${numAmount.toFixed(2)}`;
  };

  const getCustomerDisplayName = (receipt) => {
    if (receipt?.customerName) return String(receipt.customerName);
    if (typeof receipt?.customer === "string") return receipt.customer;
    if (receipt?.customer && typeof receipt.customer === "object") {
      return receipt.customer.displayName || receipt.customer.companyName || receipt.customer.name || "Customer";
    }
    return "Customer";
  };

  const getCreatedByDisplayName = (receipt) => {
    if (!receipt?.createdBy) return "System";
    if (typeof receipt.createdBy === "string") return receipt.createdBy;
    if (typeof receipt.createdBy === "object") {
      return receipt.createdBy.name || receipt.createdBy.email || "System";
    }
    return String(receipt.createdBy);
  };

  const getReferenceDisplay = (receipt) => {
    return receipt?.paymentReference || receipt?.referenceNumber || receipt?.reference || "—";
  };

  const pickFirstNonEmpty = (...values) => {
    for (const value of values) {
      if (value === 0 || value === "0") return value;
      if (value !== undefined && value !== null && String(value).trim() !== "") return value;
    }
    return "";
  };

  const normalizeAccountRef = (value) => {
    if (!value) return "";
    if (typeof value === "string" || typeof value === "number") return value;
    if (typeof value === "object") {
      return pickFirstNonEmpty(
        value._id,
        value.id,
        value.accountId,
        value.value,
        value.accountName,
        value.displayName,
        value.name
      );
    }
    return "";
  };

  const toFiniteNumber = (value, fallback = 0) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  };

  const normalizeItemRef = (value) => {
    if (!value) return "";
    if (typeof value === "string" || typeof value === "number") return String(value);
    if (typeof value === "object") {
      return String(pickFirstNonEmpty(value._id, value.id, value.value, value.itemId) || "");
    }
    return "";
  };

  const normalizeReceiptItemsForUpdate = (items = [], itemCatalog = []) => {
    if (!Array.isArray(items)) return [];

    return items.map((line) => {
      const lineName = String(line?.name || line?.itemDetails || "").trim();
      const lineSku = String(line?.sku || line?.itemSku || "").trim().toLowerCase();
      let itemRef = normalizeItemRef(pickFirstNonEmpty(line?.item, line?.itemId));

      if (!itemRef && lineName) {
        const matchedCatalogItem = (itemCatalog || []).find((catalogItem) => {
          const catalogName = String(catalogItem?.name || "").trim().toLowerCase();
          const catalogSku = String(catalogItem?.sku || "").trim().toLowerCase();
          if (!catalogName) return false;
          if (catalogName === lineName.toLowerCase()) return true;
          return Boolean(lineSku) && catalogSku === lineSku;
        });

        if (matchedCatalogItem) {
          itemRef = String(pickFirstNonEmpty(matchedCatalogItem?.id, matchedCatalogItem?._id) || "");
        } else {
          const matchedSampleItem = (sampleItems || []).find((sampleItem) => {
            return String(sampleItem?.name || "").trim().toLowerCase() === lineName.toLowerCase();
          });
          if (matchedSampleItem) {
            itemRef = String(pickFirstNonEmpty(matchedSampleItem?.id, matchedSampleItem?._id) || "");
          }
        }
      }

      const quantity = toFiniteNumber(pickFirstNonEmpty(line?.quantity, 0), 0);
      const unitPrice = toFiniteNumber(pickFirstNonEmpty(line?.unitPrice, line?.rate, line?.price, 0), 0);
      const discount = toFiniteNumber(pickFirstNonEmpty(line?.discount, 0), 0);
      const discountType = String(line?.discountType || "percent").toLowerCase().includes("amount") ? "amount" : "percent";
      const taxRate = toFiniteNumber(pickFirstNonEmpty(line?.taxRate, line?.taxPercent, line?.tax_percentage, 0), 0);
      const taxAmount = toFiniteNumber(pickFirstNonEmpty(line?.taxAmount, line?.tax, 0), 0);
      const total = toFiniteNumber(
        pickFirstNonEmpty(line?.total, line?.amount),
        Math.max((quantity * unitPrice) - discount + taxAmount, 0)
      );

      return {
        item: itemRef || undefined,
        name: lineName || String(line?.description || "Item"),
        description: String(line?.description || ""),
        quantity,
        unitPrice,
        discount,
        discountType,
        taxRate,
        taxAmount,
        total
      };
    });
  };

  const buildBulkUpdatePayload = (baseReceipt, changes, itemCatalog = []) => {
    const nextPayload = ensureDepositToFields(baseReceipt, changes);
    const normalizedItems = normalizeReceiptItemsForUpdate(baseReceipt?.items || [], itemCatalog);

    if (!normalizedItems.length) {
      throw new Error(`Receipt "${baseReceipt?.receiptNumber || baseReceipt?.id || ""}" has no items.`);
    }

    const hasMissingItemReference = normalizedItems.some((line) => !line.item);
    if (hasMissingItemReference) {
      throw new Error(`Receipt "${baseReceipt?.receiptNumber || baseReceipt?.id || ""}" has item(s) without Item ID.`);
    }

    nextPayload.items = normalizedItems;
    nextPayload.date = pickFirstNonEmpty(
      nextPayload.date,
      nextPayload.receiptDate,
      baseReceipt?.date,
      baseReceipt?.receiptDate,
      new Date().toISOString()
    );
    nextPayload.discount = toFiniteNumber(pickFirstNonEmpty(baseReceipt?.discount, 0), 0);
    nextPayload.discountType = String(baseReceipt?.discountType || "percent").toLowerCase().includes("amount") ? "amount" : "percent";
    nextPayload.shippingCharges = toFiniteNumber(pickFirstNonEmpty(baseReceipt?.shippingCharges, 0), 0);
    nextPayload.shippingChargeTax = String(baseReceipt?.shippingChargeTax || "");
    nextPayload.adjustment = toFiniteNumber(pickFirstNonEmpty(baseReceipt?.adjustment, 0), 0);
    nextPayload.tax = toFiniteNumber(pickFirstNonEmpty(baseReceipt?.tax, 0), 0);
    nextPayload.paymentMethod = String(
      pickFirstNonEmpty(baseReceipt?.paymentMethod, nextPayload.paymentMethod, "")
    ).trim();
    nextPayload.paymentReference = String(
      pickFirstNonEmpty(baseReceipt?.paymentReference, baseReceipt?.referenceNumber, baseReceipt?.reference, "")
    ).trim();

    const customerId = String(
      pickFirstNonEmpty(
        baseReceipt?.customer?._id,
        baseReceipt?.customer?.id,
        baseReceipt?.customerId,
        baseReceipt?.customer,
        ""
      ) || ""
    ).trim();

    if (customerId) {
      nextPayload.customer = customerId;
      nextPayload.customerId = customerId;
    }

    if (!nextPayload.currency && baseReceipt?.currency) {
      nextPayload.currency = String(baseReceipt.currency).toUpperCase();
    }

    return nextPayload;
  };

  const ensureDepositToFields = (baseReceipt, payload) => {
    const nextPayload = { ...payload };

    const existingDepositToAccount = normalizeAccountRef(
      pickFirstNonEmpty(
        baseReceipt?.depositToAccount,
        baseReceipt?.depositToAccountId,
        baseReceipt?.depositAccount,
        baseReceipt?.paidThroughAccount
      )
    );

    const existingDepositTo = normalizeAccountRef(
      pickFirstNonEmpty(
        baseReceipt?.depositTo,
        baseReceipt?.paidThrough,
        baseReceipt?.depositAccountName
      )
    );

    if (!nextPayload.depositToAccount) {
      nextPayload.depositToAccount = existingDepositToAccount || existingDepositTo || "Petty Cash";
    }

    if (!nextPayload.depositTo) {
      nextPayload.depositTo = existingDepositTo || existingDepositToAccount || "Petty Cash";
    }

    return nextPayload;
  };

  // Advanced Search Handlers
  const handleOpenAdvancedSearch = () => {
    setIsAdvancedSearchOpen(true);
  };

  const handleCloseAdvancedSearch = () => {
    setIsAdvancedSearchOpen(false);
  };

  const handleAdvancedSearchSubmit = async () => {
    let allReceipts = await getSalesReceipts();
    let filtered = Array.isArray(allReceipts) ? allReceipts : [];

    if (advancedSearchData.receiptNumber) {
      filtered = filtered.filter(r =>
        (r.receiptNumber || r.id || "").toLowerCase().includes(advancedSearchData.receiptNumber.toLowerCase())
      );
    }

    if (advancedSearchData.referenceNumber) {
      filtered = filtered.filter(r =>
        (r.referenceNumber || "").toLowerCase().includes(advancedSearchData.referenceNumber.toLowerCase())
      );
    }

    if (advancedSearchData.customerName) {
      filtered = filtered.filter(r =>
        (r.customerName || r.customer || "").toLowerCase().includes(advancedSearchData.customerName.toLowerCase())
      );
    }

    if (advancedSearchData.dateRangeFrom) {
      const fromDate = new Date(advancedSearchData.dateRangeFrom);
      filtered = filtered.filter(r => new Date(r.date || r.receiptDate) >= fromDate);
    }

    if (advancedSearchData.dateRangeTo) {
      const toDate = new Date(advancedSearchData.dateRangeTo);
      filtered = filtered.filter(r => new Date(r.date || r.receiptDate) <= toDate);
    }

    if (advancedSearchData.totalRangeFrom) {
      filtered = filtered.filter(r => parseFloat(String(r.total || r.amount || 0)) >= parseFloat(String(advancedSearchData.totalRangeFrom)));
    }

    if (advancedSearchData.totalRangeTo) {
      filtered = filtered.filter(r => parseFloat(String(r.total || r.amount || 0)) <= parseFloat(String(advancedSearchData.totalRangeTo)));
    }

    if (advancedSearchData.filterType && advancedSearchData.filterType !== "All") {
      filtered = filtered.filter(r => (r.status || "completed").toLowerCase() === advancedSearchData.filterType.toLowerCase());
    }

    setFilteredSalesReceipts(filtered);
    setIsAdvancedSearchOpen(false);
  };

  const handleResetAdvancedSearch = async () => {
    setAdvancedSearchData({
      searchType: "Sales Receipts",
      filterType: "All",
      receiptNumber: "",
      referenceNumber: "",
      dateRangeFrom: "",
      dateRangeTo: "",
      itemName: "",
      itemDescription: "",
      account: "",
      totalRangeFrom: "",
      totalRangeTo: "",
      customerName: "",
      paymentMethod: "",
      salesperson: "",
      tax: "",
      addressType: "Billing and Shipping",
      attention: "",
      addressLine: ""
    });
    setFilteredSalesReceipts(await getSalesReceipts());
  };

  const handleStatusFilter = (status) => {
    const mappedStatus = viewStatusMap[status] || status;
    setSelectedStatus(mappedStatus);
    setIsViewDropdownOpen(false);
    if (status === "All") {
      setSelectedView("All Sales Receipts");
    } else {
      setSelectedView(status);
    }
  };

  const handleNewCustomView = () => {
    setIsViewDropdownOpen(false);
    navigate("/sales/sales-receipts/custom-view/new");
  };

  const handleDeleteCustomView = (viewId, e) => {
    e.stopPropagation();
    const viewToDelete = customViews.find(v => v.id === viewId);
    if (viewToDelete && window.confirm(`Are you sure you want to delete the custom view "${viewToDelete.name}"?`)) {
      deleteCustomView(viewId);
      const updatedCustomViews = customViews.filter(v => v.id !== viewId);
      setCustomViews(updatedCustomViews);
      if (selectedStatus === viewToDelete.name) {
        handleStatusFilter("All");
      }
    }
  };

  const filteredDefaultViews = salesReceiptViews.filter(view =>
    view.toLowerCase().includes(viewSearchQuery.toLowerCase())
  );

  const filteredCustomViews = customViews.filter(view =>
    view.name.toLowerCase().includes(viewSearchQuery.toLowerCase())
  );

  const isViewSelected = (view) => {
    if (view === "All") return selectedView === "All Sales Receipts";
    return selectedView === view;
  };

  const handleCreateNewReceipt = () => {
    navigate("/sales/sales-receipts/new");
  };

  const handleImportReceipts = () => {
    navigate("/sales/sales-receipts/import");
  };

  const handleSort = (option) => {
    setActiveSort(option);
    applyFilters(salesReceipts, selectedStatus, customViews, option);
  };

  const handleRefreshList = async () => {
    setIsMoreMenuOpen(false);
    setIsRefreshing(true);
    try {
      const allReceipts = await getSalesReceipts();
      setSalesReceipts(allReceipts);
      applyFilters(allReceipts, selectedStatus);
      alert("List refreshed successfully.");
    } catch (error) {
      console.error("Error refreshing list:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleResetColumnWidth = () => {
    setIsMoreMenuOpen(false);
    localStorage.removeItem("salesReceiptColumnWidths");
    alert("Column widths have been reset to default.");
  };

  const getSalesReceiptPdfTemplate = (receipt) => {
    const items = Array.isArray(receipt?.items) ? receipt.items : [];
    const itemsHtml = items.length > 0
      ? items.map((item, index) => `
          <tr>
            <td style="padding:10px 12px; border-bottom:1px solid #e5e7eb; font-size:13px;">${index + 1}</td>
            <td style="padding:10px 12px; border-bottom:1px solid #e5e7eb;">
              <div style="font-size:13px; color:#111827;">${item?.name || item?.itemDetails || "Item"}</div>
              ${item?.description ? `<div style="font-size:12px; color:#6b7280; margin-top:2px;">${item.description}</div>` : ""}
            </td>
            <td style="padding:10px 12px; border-bottom:1px solid #e5e7eb; font-size:13px;">${parseFloat(item?.quantity || 0) || 0}</td>
            <td style="padding:10px 12px; border-bottom:1px solid #e5e7eb; font-size:13px;">${formatCurrency(item?.rate || 0, receipt?.currency)}</td>
            <td style="padding:10px 12px; border-bottom:1px solid #e5e7eb; font-size:13px; text-align:right;">${formatCurrency(item?.amount || 0, receipt?.currency)}</td>
          </tr>
        `).join("")
      : `<tr><td colspan="5" style="padding:20px; text-align:center; color:#6b7280;">No items</td></tr>`;

    const subTotalValue = parseFloat(receipt?.subTotal || receipt?.subtotal || receipt?.total || receipt?.amount || 0) || 0;
    const taxValue = parseFloat(receipt?.tax || 0) || 0;
    const totalValue = parseFloat(receipt?.total || receipt?.amount || 0) || 0;

    return `
      <div style="width:794px; min-height:1123px; background:#ffffff; padding:40px; box-sizing:border-box; font-family:Arial, sans-serif; color:#111827;">
        <div style="margin-bottom:28px;">
          <div style="font-size:28px; font-weight:700; letter-spacing:0.02em;">SALES RECEIPT</div>
          <div style="margin-top:8px; color:#4b5563; font-size:14px;">Sales Receipt# ${receipt?.receiptNumber || receipt?.id || ""}</div>
        </div>

        <div style="display:flex; justify-content:space-between; margin-bottom:24px;">
          <div>
            <div style="font-size:12px; font-weight:700; color:#6b7280; margin-bottom:6px;">BILL TO</div>
            <div style="font-size:15px; font-weight:500; color:#2563eb;">${getCustomerDisplayName(receipt)}</div>
          </div>
          <div style="text-align:right;">
            <div style="font-size:13px; color:#6b7280; margin-bottom:4px;">Receipt Date <span style="color:#111827; font-weight:600; margin-left:16px;">${formatDate(receipt?.date || receipt?.receiptDate)}</span></div>
            <div style="font-size:13px; color:#6b7280;">Created By <span style="color:#111827; font-weight:600; margin-left:16px;">${getCreatedByDisplayName(receipt)}</span></div>
          </div>
        </div>

        <table style="width:100%; border-collapse:collapse; margin-bottom:28px;">
          <thead>
            <tr style="background:#f3f4f6; border-top:1px solid #e5e7eb; border-bottom:1px solid #e5e7eb;">
              <th style="padding:10px 12px; text-align:left; font-size:12px; color:#374151;">#</th>
              <th style="padding:10px 12px; text-align:left; font-size:12px; color:#374151;">ITEM & DESCRIPTION</th>
              <th style="padding:10px 12px; text-align:left; font-size:12px; color:#374151;">QTY</th>
              <th style="padding:10px 12px; text-align:left; font-size:12px; color:#374151;">RATE</th>
              <th style="padding:10px 12px; text-align:right; font-size:12px; color:#374151;">AMOUNT</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        <div style="display:flex; justify-content:space-between; gap:24px;">
          <div style="min-width:280px; border:1px solid #e5e7eb; border-radius:8px; padding:14px;">
            <div style="display:flex; justify-content:space-between; font-size:13px; margin-bottom:8px;">
              <span style="color:#6b7280;">Payment Mode</span>
              <span style="font-weight:600;">${receipt?.paymentMode || "—"}</span>
            </div>
            <div style="display:flex; justify-content:space-between; font-size:13px; padding-top:8px; border-top:1px solid #e5e7eb;">
              <span style="color:#6b7280;">Payment Made</span>
              <span style="font-weight:700; color:#047857;">${formatCurrency(totalValue, receipt?.currency)}</span>
            </div>
            <div style="display:flex; justify-content:space-between; font-size:13px; margin-top:8px;">
              <span style="color:#6b7280;">Reference</span>
              <span>${getReferenceDisplay(receipt)}</span>
            </div>
          </div>
          <div style="min-width:240px; margin-left:auto;">
            <div style="display:flex; justify-content:space-between; font-size:13px; margin-bottom:8px;">
              <span style="color:#6b7280;">Sub Total</span>
              <span>${formatCurrency(subTotalValue, receipt?.currency)}</span>
            </div>
            <div style="display:flex; justify-content:space-between; font-size:13px; margin-bottom:8px;">
              <span style="color:#6b7280;">Tax</span>
              <span>${formatCurrency(taxValue, receipt?.currency)}</span>
            </div>
            <div style="display:flex; justify-content:space-between; font-size:30px; border-top:1px solid #e5e7eb; padding-top:10px; font-weight:700;">
              <span style="font-size:16px;">Total</span>
              <span style="font-size:34px;">${formatCurrency(totalValue, receipt?.currency)}</span>
            </div>
          </div>
        </div>
      </div>
    `;
  };

  const downloadSalesReceiptsPdf = async (receipts, fileNamePrefix = "sales-receipts") => {
    const receiptsToDownload = Array.isArray(receipts) ? receipts.filter(Boolean) : [];
    if (receiptsToDownload.length === 0) {
      alert("No sales receipts available for PDF download.");
      return;
    }

    const pdf = new jsPDF("p", "mm", "a4");
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 10;
    const printableWidth = pageWidth - (margin * 2);
    const printableHeight = pageHeight - (margin * 2);
    let hasWrittenAnyPage = false;

    for (const receipt of receiptsToDownload) {
      let detailedReceipt = receipt;
      try {
        const loaded = await getSalesReceiptById(String(receipt.id || receipt._id || ""));
        if (loaded) detailedReceipt = loaded;
      } catch (error) {
        console.warn("Failed to load detailed sales receipt for PDF. Using list data.", error);
      }

      const wrapper = document.createElement("div");
      wrapper.style.position = "fixed";
      wrapper.style.left = "-10000px";
      wrapper.style.top = "0";
      wrapper.style.width = "794px";
      wrapper.style.background = "#ffffff";
      wrapper.style.zIndex = "-1";
      wrapper.innerHTML = getSalesReceiptPdfTemplate(detailedReceipt);
      document.body.appendChild(wrapper);

      try {
        await new Promise((resolve) => setTimeout(resolve, 120));
        const canvas = await html2canvas(wrapper, {
          scale: 2,
          useCORS: true,
          backgroundColor: "#ffffff"
        });

        const imgWidth = printableWidth;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        const imgData = canvas.toDataURL("image/png");
        let heightLeft = imgHeight;
        let position = margin;

        if (hasWrittenAnyPage) {
          pdf.addPage();
        }

        pdf.addImage(imgData, "PNG", margin, position, imgWidth, imgHeight);
        heightLeft -= printableHeight;

        while (heightLeft > 0.01) {
          position = margin - (imgHeight - heightLeft);
          pdf.addPage();
          pdf.addImage(imgData, "PNG", margin, position, imgWidth, imgHeight);
          heightLeft -= printableHeight;
        }

        hasWrittenAnyPage = true;
      } finally {
        if (wrapper.parentNode) {
          wrapper.parentNode.removeChild(wrapper);
        }
      }
    }

    const suffix = new Date().toISOString().split("T")[0];
    pdf.save(`${fileNamePrefix}-${suffix}.pdf`);
  };

  const handleExport = async (exportType) => {
    setIsMoreMenuOpen(false);

    if (exportType === "Export to PDF") {
      await downloadSalesReceiptsPdf(filteredSalesReceipts, "sales-receipts");
      return;
    }

    const dataToExport = filteredSalesReceipts;
    if (dataToExport.length === 0) {
      alert("No data to export.");
      return;
    }

    const filename = `sales-receipts-${new Date().toISOString().split('T')[0]}.${exportType === "Export to Excel" ? "csv" : "csv"}`;

    const csvContent = [
      ["Date", "Receipt Number", "Reference", "Customer Name", "Payment Mode", "Status", "Amount", "Created By"],
      ...dataToExport.map(r => [
        formatDate(r.date || r.receiptDate),
        r.receiptNumber || r.id || "",
        r.referenceNumber || "",
        r.customerName || r.customer || "",
        r.paymentMode || "",
        (r.status || "PAID").toUpperCase(),
        formatCurrency(r.total || r.amount || 0, r.currency),
        r.createdBy || ""
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

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedReceipts(filteredSalesReceipts.map(receipt => receipt.id));
    } else {
      setSelectedReceipts([]);
    }
  };

  const handleSelectReceipt = (receiptId, e) => {
    e.stopPropagation();
    setSelectedReceipts(prev => {
      if (prev.includes(receiptId)) {
        return prev.filter(id => id !== receiptId);
      } else {
        return [...prev, receiptId];
      }
    });
  };

  const handleClearSelection = () => {
    setSelectedReceipts([]);
  };

  const handleBulkDelete = async () => {
    if (selectedReceipts.length === 0) {
      alert("Please select at least one sales receipt.");
      return;
    }

    const count = selectedReceipts.length;
    const confirmMessage = `Are you sure you want to delete ${count} sales receipt(s)? This action cannot be undone.`;

    if (window.confirm(confirmMessage)) {
      try {
        for (const receiptId of selectedReceipts) {
          await deleteSalesReceipt(receiptId);
        }

        const allReceipts = await getSalesReceipts();
        setSalesReceipts(allReceipts);
        applyFilters(allReceipts, selectedStatus);
        setSelectedReceipts([]);
        alert(`${count} sales receipt(s) deleted successfully.`);
      } catch (error) {
        console.error("Error deleting sales receipts:", error);
        alert("An error occurred while deleting sales receipts.");
      }
    }
  };

  const handleBulkUpdate = () => {
    if (selectedReceipts.length === 0) {
      alert("Please select at least one sales receipt.");
      return;
    }
    setIsBulkUpdateModalOpen(true);
    setBulkUpdateField("");
    setBulkUpdateValue("");
  };

  const handleBulkUpdateFieldSelect = (field) => {
    setBulkUpdateField(field);
    setBulkUpdateValue("");
    setIsBulkUpdateFieldDropdownOpen(false);
  };

  const handleBulkUpdateSubmit = async () => {
    if (!bulkUpdateField || !selectedBulkFieldConfig) {
      alert("Please select a field.");
      return;
    }

    if (selectedReceipts.length === 0) {
      alert("Please select at least one sales receipt to update.");
      return;
    }

    const rawValue = String(bulkUpdateValue || "").trim();
    if (!rawValue) {
      alert("Please enter a value.");
      return;
    }

    let parsedValue: string | number = rawValue;
    if (selectedBulkFieldConfig.type === "number") {
      const normalizedNumber = Number(rawValue.replace(/,/g, ""));
      if (!Number.isFinite(normalizedNumber)) {
        alert("Please enter a valid number.");
        return;
      }
      parsedValue = normalizedNumber;
    }

    if (selectedBulkFieldConfig.type === "date") {
      const parsedDate = new Date(rawValue);
      if (Number.isNaN(parsedDate.getTime())) {
        alert("Please select a valid date.");
        return;
      }
      parsedValue = rawValue;
    }

    const updateData = selectedBulkFieldConfig.buildPayload(parsedValue);
    if (!updateData || Object.keys(updateData).length === 0) {
      alert("Invalid value for selected field.");
      return;
    }

    const count = selectedReceipts.length;

    try {
      const itemCatalog = await getItemsFromAPI();

      for (const receiptId of selectedReceipts) {
        const listReceipt = filteredSalesReceipts.find((receipt) => String(receipt.id) === String(receiptId));
        let detailedReceipt = null;
        try {
          detailedReceipt = await getSalesReceiptById(String(receiptId));
        } catch (error) {
          console.warn("Unable to fetch sales receipt details before update:", error);
        }

        const baseReceipt = detailedReceipt || listReceipt || {};
        const payload = buildBulkUpdatePayload(baseReceipt, updateData, itemCatalog);
        await updateSalesReceipt(receiptId, payload);
      }

      const allReceipts = await getSalesReceipts();
      setSalesReceipts(allReceipts);
      applyFilters(allReceipts, selectedStatus);
      setSelectedReceipts([]);
      setIsBulkUpdateModalOpen(false);
      setBulkUpdateField("");
      setBulkUpdateValue("");

      alert(`Successfully updated ${count} sales receipt(s).`);
    } catch (error) {
      console.error("Error updating sales receipts:", error);
      alert("An error occurred while updating sales receipts.");
    }
  };

  const handleBulkUpdateCancel = () => {
    setIsBulkUpdateModalOpen(false);
    setBulkUpdateField("");
    setBulkUpdateValue("");
    setIsBulkUpdateFieldDropdownOpen(false);
  };

  const renderBulkUpdateValueInput = () => {
    if (!selectedBulkFieldConfig) {
      return (
        <input
          type="text"
          disabled
          className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-sm text-gray-400 bg-gray-50 cursor-not-allowed"
          placeholder="Select a field first"
          value=""
          readOnly
        />
      );
    }

    if (selectedBulkFieldConfig.type === "select") {
      return (
        <select
          className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-[#156372] transition-all"
          value={bulkUpdateValue}
          onChange={(e) => setBulkUpdateValue(e.target.value)}
        >
          <option value="">Select value</option>
          {(selectedBulkFieldConfig.options || []).map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      );
    }

    return (
      <input
        type={selectedBulkFieldConfig.type === "date" ? "date" : selectedBulkFieldConfig.type === "number" ? "number" : "text"}
        step={selectedBulkFieldConfig.type === "number" ? "0.01" : undefined}
        className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-[#156372] transition-all"
        placeholder={selectedBulkFieldConfig.placeholder || "Enter new information"}
        value={bulkUpdateValue}
        onChange={(e) => setBulkUpdateValue(e.target.value)}
      />
    );
  };

  const handleBulkPDFDownload = async () => {
    if (selectedReceipts.length === 0) {
      alert("Please select at least one sales receipt.");
      return;
    }

    const selectedReceiptData = filteredSalesReceipts.filter(receipt => selectedReceipts.includes(receipt.id));
    await downloadSalesReceiptsPdf(selectedReceiptData, "sales-receipts-selected");
  };

  return (
    <div className="w-full min-h-screen bg-gray-50">
      {/* Header - Show Bulk Actions Bar when items are selected, otherwise show normal header */}
      {selectedReceipts.length > 0 ? (
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-white">
          <div className="flex items-center gap-2">
            <button
              className="px-4 py-2 text-white rounded-md text-sm font-medium cursor-pointer"
              style={{ background: "linear-gradient(90deg, #156372 0%, #0D4A52 100%)" }}
              onMouseEnter={(e) => (e.currentTarget as HTMLButtonElement).style.opacity = "0.9"}
              onMouseLeave={(e) => (e.currentTarget as HTMLButtonElement).style.opacity = "1"}
              onClick={handleBulkUpdate}
            >
              Bulk Update
            </button>
            <button
              className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 text-[#156372] rounded-lg cursor-pointer hover:bg-gray-50 hover:border-[#156372] transition-all font-semibold text-sm shadow-sm"
              onClick={handleBulkPDFDownload}
              title="PDF Download"
            >
              <Download size={16} />
              PDF Download
            </button>
            <button
              className="px-4 py-2 text-white border-none rounded-md text-sm font-medium cursor-pointer transition-all flex items-center gap-2"
              style={{ background: "linear-gradient(90deg, #156372 0%, #0D4A52 100%)" }}
              onMouseEnter={(e) => (e.currentTarget as HTMLButtonElement).style.opacity = "0.9"}
              onMouseLeave={(e) => (e.currentTarget as HTMLButtonElement).style.opacity = "1"}
              onClick={handleBulkDelete}
            >
              <Trash2 size={16} />
              Delete
            </button>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center min-w-[24px] h-6 px-2 rounded text-[13px] font-semibold text-white" style={{ background: "linear-gradient(90deg, #156372 0%, #0D4A52 100%)" }}>
              {selectedReceipts.length}
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
        /* Normal Page Header */
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative" ref={viewDropdownRef}>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsViewDropdownOpen(!isViewDropdownOpen)}
                    className="flex items-center gap-3 px-4 py-1.5 bg-[#F0F5FF] hover:bg-[#E1EBFF] rounded-lg transition-colors group"
                  >
                    <h1 className="text-xl font-bold text-[#111827]">{selectedView}</h1>
                    <ChevronDown
                      size={18}
                      className={`text-[#2563EB] transition-transform duration-200 ${isViewDropdownOpen ? "rotate-180" : ""}`}
                    />
                  </button>
                </div>

                {isViewDropdownOpen && (
                  <div className="absolute top-full left-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-xl z-50 min-w-[220px] overflow-hidden">
                    <div className="py-2">
                      {salesReceiptViews.map((option) => (
                        <div
                          key={option}
                          className={`flex items-center justify-between px-4 py-2 text-sm cursor-pointer ${isViewSelected(option)
                            ? "text-[#2563eb] border border-[#2563eb] mx-2 rounded-md"
                            : "text-[#374151] hover:bg-gray-50"
                            }`}
                          onClick={() => handleStatusFilter(option)}
                        >
                          <span>{option}</span>
                          <Star size={16} className="text-gray-300" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                className="cursor-pointer transition-all bg-gradient-to-r from-[#156372] to-[#0D4A52] text-white px-6 py-2 rounded-lg border-[#0D4A52] border-b-[4px] hover:brightness-110 hover:-translate-y-[1px] hover:border-b-[6px] active:border-b-[2px] active:brightness-90 active:translate-y-[2px] flex items-center gap-2 text-sm font-bold shadow-md"
                onClick={handleCreateNewReceipt}
              >
                <Plus size={16} strokeWidth={3} />
                New
              </button>
              <div className="relative" ref={moreMenuRef}>
                <button
                  className="p-2 hover:bg-gray-100 rounded-lg text-gray-600 transition-colors"
                  onClick={() => {
                    setIsMoreMenuOpen((prev) => {
                      const next = !prev;
                      if (!next) setIsSortMenuOpen(false);
                      return next;
                    });
                  }}
                >
                  <MoreVertical size={18} />
                </button>

                {isMoreMenuOpen && (
                  <div className="absolute top-full right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg min-w-[220px] z-[1000] overflow-visible py-1">
                    {/* Sort by */}
                    <div className="relative">
                      <button
                        className={`w-full flex items-center gap-3 py-2.5 px-4 cursor-pointer transition-all text-sm rounded-md ${isSortMenuOpen ? "bg-[#3b82f6] text-white" : "text-gray-700 hover:bg-gray-50"
                          }`}
                        onClick={() => setIsSortMenuOpen((prev) => !prev)}
                      >
                        <ArrowUpDown size={16} className={`flex-shrink-0 ${isSortMenuOpen ? "text-white" : "text-[#156372]"}`} />
                        <span className="flex-1 font-medium text-[13px] text-left">Sort by</span>
                        <ChevronRight size={16} className={`flex-shrink-0 ${isSortMenuOpen ? "text-white" : "text-gray-400"}`} />
                      </button>

                      {isSortMenuOpen && (
                        <div className="absolute top-0 right-full mr-1.5 w-[220px] bg-white border border-gray-200 rounded-lg shadow-lg py-2 z-[99999]">
                          {sortMenuOptions.map((option) => {
                            const isActive = activeSort === option.value;
                            return (
                              <div
                                key={option.label}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSort(option.value);
                                  setIsMoreMenuOpen(false);
                                  setIsSortMenuOpen(false);
                                }}
                                className={`flex items-center justify-between py-2.5 px-3.5 mx-2 text-sm transition-all rounded-md ${isActive ? "bg-[#3b82f6] text-white" : "text-gray-700 hover:bg-gray-100"
                                  }`}
                              >
                                <span>{option.label}</span>
                                {isActive && <Check size={14} className="text-white" />}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Import Sales Receipts */}
                    <div
                      className="flex items-center gap-3 py-2.5 px-4 cursor-pointer transition-all text-sm text-gray-700 hover:bg-gray-50"
                      onClick={() => {
                        handleImportReceipts();
                        setIsMoreMenuOpen(false);
                        setIsSortMenuOpen(false);
                      }}
                    >
                      <Download size={16} className="text-[#156372] flex-shrink-0" />
                      <span className="flex-1 font-medium text-[13px]">Import Sales Receipts</span>
                    </div>

                    {/* Export Sales Receipt */}
                    <div
                      className="flex items-center gap-3 py-2.5 px-4 cursor-pointer transition-all text-sm text-gray-700 hover:bg-gray-50"
                      onClick={() => {
                        handleExport("Export to PDF");
                        setIsMoreMenuOpen(false);
                        setIsSortMenuOpen(false);
                      }}
                    >
                      <FileUp size={16} className="text-[#156372] flex-shrink-0" />
                      <span className="flex-1 font-medium text-[13px]">Export Sales Receipt</span>
                    </div>

                    <div className="h-px bg-gray-100 my-1"></div>

                    {/* Preferences */}
                    <div
                      className="flex items-center gap-3 py-2.5 px-4 cursor-pointer transition-all text-sm text-gray-700 hover:bg-gray-50"
                      onClick={() => {
                        navigate("/settings/sales-receipts");
                        setIsMoreMenuOpen(false);
                        setIsSortMenuOpen(false);
                      }}
                    >
                      <Settings size={16} className="text-[#156372] flex-shrink-0" />
                      <span className="flex-1 font-medium text-[13px]">Preferences</span>
                    </div>

                    {/* Manage Custom Fields */}
                    <div
                      className="flex items-center gap-3 py-2.5 px-4 cursor-pointer transition-all text-sm text-gray-700 hover:bg-gray-50"
                      onClick={() => {
                        setIsFieldCustomizationOpen(true);
                        setIsMoreMenuOpen(false);
                        setIsSortMenuOpen(false);
                      }}
                    >
                      <Grid3x3 size={16} className="text-[#156372] flex-shrink-0" />
                      <span className="flex-1 font-medium text-[13px]">Manage Custom Fields</span>
                    </div>

                    <div className="h-px bg-gray-100 my-1"></div>

                    {/* Refresh List */}
                    <div
                      className={`flex items-center gap-3 py-2.5 px-4 cursor-pointer transition-colors text-sm text-gray-700 hover:bg-gray-50 ${isRefreshing ? "opacity-50 cursor-not-allowed" : ""}`}
                      onClick={() => {
                        if (!isRefreshing) {
                          refreshData();
                          setIsMoreMenuOpen(false);
                          setIsSortMenuOpen(false);
                        }
                      }}
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
                        setIsSortMenuOpen(false);
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
              <h2 className="text-xl font-semibold text-gray-900">Bulk Update Sales Receipts</h2>
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
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-sm text-gray-700 bg-white flex items-center justify-between hover:border-[#156372] transition-colors"
                    onClick={() => setIsBulkUpdateFieldDropdownOpen(!isBulkUpdateFieldDropdownOpen)}
                  >
                    <span>{bulkUpdateField || "Select a field"}</span>
                    <ChevronDown size={16} />
                  </button>
                  {isBulkUpdateFieldDropdownOpen && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white border-2 border-gray-200 rounded-xl shadow-xl z-50 max-h-60 overflow-y-auto">
                      {bulkUpdateFieldOptions.map((option) => (
                        <div
                          key={option}
                          className="p-3 cursor-pointer hover:bg-blue-50 text-sm text-gray-700 transition-colors"
                          onClick={() => handleBulkUpdateFieldSelect(option)}
                        >
                          {option}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {renderBulkUpdateValueInput()}
              </div>
              <p className="text-xs text-gray-500 mt-4">
                <strong className="text-gray-700">Note:</strong> All the selected sales receipts will be updated with the new information and you cannot undo this action.
              </p>
            </div>
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
              <button
                className="px-6 py-2 text-white border-none rounded-lg text-sm font-semibold cursor-pointer transition-all shadow-md active:transform active:scale-95"
                style={{ background: "linear-gradient(90deg, #156372 0%, #0D4A52 100%)" }}
              onMouseEnter={(e) => (e.currentTarget as HTMLButtonElement).style.opacity = "0.9"}
              onMouseLeave={(e) => (e.currentTarget as HTMLButtonElement).style.opacity = "1"}
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

      {/* Filter Bar */}
      <div className="bg-white border-b border-gray-200 px-6 py-3">
        <div className="flex items-center gap-4">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">VIEW BY:</span>
          <div className="relative flex items-center gap-2" ref={periodDropdownRef}>
            <span className="text-sm font-medium text-gray-700">Period:</span>
            <button
              className="flex items-center gap-2 px-3 py-1.5 border-2 border-gray-200 rounded-lg text-sm text-gray-700 hover:border-[#156372] transition-colors"
              onClick={() => setIsPeriodDropdownOpen(!isPeriodDropdownOpen)}
            >
              <span>{selectedPeriod}</span>
              <ChevronDown size={14} />
            </button>
            {isPeriodDropdownOpen && (
              <div className="absolute top-full left-0 mt-2 bg-white border-2 border-gray-200 rounded-xl shadow-xl z-50 min-w-[150px] overflow-hidden">
                {periodOptions.map((option) => (
                  <div
                    key={option}
                    className={`p-3 cursor-pointer hover:bg-blue-50 text-sm transition-colors ${selectedPeriod === option ? "bg-blue-50 text-[#156372] font-semibold" : "text-gray-700"
                      }`}
                    onClick={() => {
                      setSelectedPeriod(option);
                      setIsPeriodDropdownOpen(false);
                    }}
                  >
                    {option}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="p-6 relative">

        {hasLoadedOnce && !isRefreshing && filteredSalesReceipts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Send professional sales receipts instantly!</h2>
            <p className="text-gray-600 mb-6 max-w-md">
              Create sales receipts and send them to your customers as proof of payment you've received towards their purchase.
            </p>

            <div className="flex items-center gap-4">
              <button
                className="px-6 py-3 bg-gradient-to-r from-[#156372] to-[#0D4A52] text-white rounded-lg text-sm font-semibold uppercase hover:opacity-90 transition-all shadow-md"
                onClick={handleCreateNewReceipt}
              >
                NEW SALES RECEIPT
              </button>
              <button
                className="px-6 py-3 text-[#156372] hover:text-blue-700 text-sm font-semibold underline"
                onClick={handleImportReceipts}
              >
                Import Sales Receipt
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">

                    <th className="p-4 text-left">
                      <input
                        type="checkbox"
                        checked={selectedReceipts.length === filteredSalesReceipts.length && filteredSalesReceipts.length > 0}
                        onChange={handleSelectAll}
                        className="w-4 h-4 text-[#156372] border-gray-300 rounded focus:ring-blue-500"
                      />
                    </th>
                    <th className="p-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      <div className="flex items-center gap-2">
                        RECEIPT DATE
                        <ArrowUpDown size={14} className="text-gray-400" />
                      </div>
                    </th>
                    <th className="p-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">SALES RECEIPT#</th>
                    <th className="p-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">REFERENCE</th>
                    <th className="p-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">CUSTOMER NAME</th>
                    <th className="p-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">PAYMENT MODE</th>
                    <th className="p-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">STATUS</th>
                    <th className="p-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">AMOUNT</th>
                    <th className="p-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">CREATED BY</th>
                    <th className="p-4 text-left">
                      <button
                        onClick={handleOpenAdvancedSearch}
                        className="p-1 hover:bg-gray-200 rounded transition-colors"
                      >
                        <Search size={14} className="text-gray-500" />
                      </button>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {isRefreshing || !hasLoadedOnce ? (
                    Array(5).fill(0).map((_, index) => (
                      <tr key={`skeleton-${index}`} className="border-b border-gray-100">

                        <td className="p-4">
                          <div className="w-4 h-4 bg-gray-200 rounded animate-pulse"></div>
                        </td>
                        <td className="p-4"><div className="h-4 bg-gray-200 rounded animate-pulse w-24"></div></td>
                        <td className="p-4"><div className="h-4 bg-gray-200 rounded animate-pulse w-32"></div></td>
                        <td className="p-4"><div className="h-4 bg-gray-200 rounded animate-pulse w-20"></div></td>
                        <td className="p-4"><div className="h-4 bg-gray-200 rounded animate-pulse w-32"></div></td>
                        <td className="p-4"><div className="h-4 bg-gray-200 rounded animate-pulse w-24"></div></td>
                        <td className="p-4"><div className="h-4 bg-gray-200 rounded animate-pulse w-20"></div></td>
                        <td className="p-4"><div className="h-4 bg-gray-200 rounded animate-pulse w-24"></div></td>
                        <td className="p-4"><div className="h-4 bg-gray-200 rounded animate-pulse w-24"></div></td>
                        <td className="p-4"></td>
                      </tr>
                    ))
                  ) : (
                    (Array.isArray(filteredSalesReceipts) ? filteredSalesReceipts : []).map((receipt) => (
                      <tr
                        key={receipt.id}
                        className="border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer"
                        onClick={(e) => {
                          // Don't navigate if clicking checkbox or filter icon
                          const target = e.target as HTMLElement;
                          if (!target.closest('input[type="checkbox"]') && !target.closest('svg')) {
                            console.log("Navigating to receipt detail:", receipt.id, receipt);
                            navigate(`/sales/sales-receipts/${receipt.id}`);
                          }
                        }}
                      >

                        <td
                          className="p-4"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectReceipt(receipt.id, e);
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={selectedReceipts.includes(receipt.id)}
                            onChange={(e) => handleSelectReceipt(receipt.id, e)}
                            onClick={(e) => e.stopPropagation()}
                            className="w-4 h-4 text-[#156372] border-gray-300 rounded focus:ring-blue-500"
                          />
                        </td>
                        <td className="p-4 text-gray-900">{formatDate(receipt.date || receipt.receiptDate)}</td>
                        <td className="p-4">
                          <span
                            className="text-[#156372] hover:text-blue-700 hover:underline font-medium cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/sales/sales-receipts/${receipt.id}`);
                            }}
                          >
                            {receipt.receiptNumber || receipt.id || "—"}
                          </span>
                        </td>
                        <td className="p-4 text-gray-900">{receipt.paymentReference || receipt.referenceNumber || "—"}</td>
                        <td className="p-4 text-gray-900">{receipt.customerName || receipt.customer?.displayName || receipt.customer?.companyName || (typeof receipt.customer === 'string' ? receipt.customer : "—")}</td>
                        <td className="p-4 text-gray-900">{receipt.paymentMode || "—"}</td>
                        <td className="p-4">
                          <span className={`text-xs font-semibold ${(receipt.status || "paid").toLowerCase() === "paid"
                            ? "text-green-700"
                            : (receipt.status || "paid").toLowerCase() === "draft"
                              ? "text-yellow-700"
                              : "text-red-700"
                            }`}>
                            {(receipt.status || "paid").toUpperCase()}
                          </span>
                        </td>
                        <td className="p-4 text-gray-900 font-semibold">{formatCurrency(receipt.total || receipt.amount, receipt.currency)}</td>
                        <td className="p-4 text-gray-900">{receipt.createdBy?.name || (typeof receipt.createdBy === 'string' ? receipt.createdBy : "—")}</td>
                        <td className="p-4"></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-end">
              <div className="flex items-center gap-2">
                <button
                  className={`p-2 rounded-lg border border-gray-200 hover:bg-white transition-colors ${pagination.page === 1 ? "opacity-50 cursor-not-allowed" : ""}`}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={pagination.page === 1}
                >
                  <ChevronLeft size={16} />
                </button>
                {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                  let pageNum;
                  if (pagination.pages <= 5) pageNum = i + 1;
                  else if (pagination.page <= 3) pageNum = i + 1;
                  else if (pagination.page >= pagination.pages - 2) pageNum = pagination.pages - 4 + i;
                  else pageNum = pagination.page - 2 + i;

                  return (
                    <button
                      key={pageNum}
                      className={`w-8 h-8 rounded-lg border text-sm font-medium transition-colors ${
                        pagination.page === pageNum ? "bg-[#156372] text-white border-[#156372]" : "border-gray-200 hover:bg-white text-gray-600"
                      }`}
                      onClick={() => setCurrentPage(pageNum)}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                <button
                  className={`p-2 rounded-lg border border-gray-200 hover:bg-white transition-colors ${pagination.page === pagination.pages || pagination.pages === 0 ? "opacity-50 cursor-not-allowed" : ""}`}
                  onClick={() => setCurrentPage((p) => Math.min(pagination.pages, p + 1))}
                  disabled={pagination.page === pagination.pages || pagination.pages === 0}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Advanced Search Modal */}
      {isAdvancedSearchOpen && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-[2000] overflow-y-auto"
          onClick={handleCloseAdvancedSearch}
        >
          <div
            className="bg-white rounded-lg shadow-2xl w-full max-w-[900px] mx-4 my-8 max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between py-5 px-8 border-b border-gray-100 bg-gray-50/50 rounded-t-lg">
              <div className="flex items-center gap-10">
                {/* Search Type Dropdown */}
                <div className="flex items-center gap-3">
                  <label className="text-sm font-semibold text-gray-600">Search</label>
                  <div className="relative" ref={searchTypeDropdownRef}>
                    <div
                      className={`flex items-center justify-between min-w-[180px] py-2 px-4 text-sm text-gray-700 bg-white border-2 rounded-lg cursor-pointer transition-all ${isSearchTypeDropdownOpen ? "border-[#156372] shadow-sm" : "border-gray-200 hover:border-gray-300"}`}
                      onClick={() => setIsSearchTypeDropdownOpen(!isSearchTypeDropdownOpen)}
                    >
                      <span>Sales Receipts</span>
                      <ChevronDown size={16} className={`text-gray-400 transition-transform duration-200 ${isSearchTypeDropdownOpen ? "rotate-180" : ""}`} />
                    </div>
                    {isSearchTypeDropdownOpen && (
                      <div className="absolute top-full left-0 right-0 mt-2 bg-white border-2 border-gray-100 rounded-xl shadow-xl z-[2001] py-1">
                        <div className="px-4 py-2.5 text-sm text-gray-700 font-medium bg-blue-50 border-l-4 border-blue-600">Sales Receipts</div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Filter Dropdown */}
                <div className="flex items-center gap-3">
                  <label className="text-sm font-semibold text-gray-600">Filter</label>
                  <div className="relative" ref={filterTypeDropdownRef}>
                    <div
                      className={`flex items-center justify-between min-w-[180px] py-2 px-4 text-sm text-gray-700 bg-white border-2 rounded-lg cursor-pointer transition-all ${isFilterTypeDropdownOpen ? "border-[#156372] shadow-sm" : "border-gray-200 hover:border-gray-300"}`}
                      onClick={() => setIsFilterTypeDropdownOpen(!isFilterTypeDropdownOpen)}
                    >
                      <span>{advancedSearchData.filterType}</span>
                      <ChevronDown size={16} className={`text-gray-400 transition-transform duration-200 ${isFilterTypeDropdownOpen ? "rotate-180" : ""}`} />
                    </div>
                    {isFilterTypeDropdownOpen && (
                      <div className="absolute top-full left-0 right-0 mt-2 bg-white border-2 border-gray-100 rounded-xl shadow-xl z-[2001] py-1">
                        {["All", "Draft", "Completed", "Void"].map((view) => (
                          <div
                            key={view}
                            className="px-4 py-2.5 text-sm text-gray-700 cursor-pointer hover:bg-blue-50 transition-colors"
                            onClick={() => {
                              setAdvancedSearchData(prev => ({ ...prev, filterType: view }));
                              setIsFilterTypeDropdownOpen(false);
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
                className="p-2 hover:bg-gray-200 rounded-full text-gray-400 hover:text-gray-600 transition-colors"
                onClick={handleCloseAdvancedSearch}
              >
                <X size={20} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-8 bg-white">
              <div className="grid grid-cols-2 gap-x-12 gap-y-6">
                {/* Left Column */}
                <div className="space-y-6">
                  {/* Sales Receipt# */}
                  <div className="flex items-center gap-4">
                    <label className="w-32 text-sm font-medium text-gray-600 text-right">Sales Receipt#</label>
                    <input
                      type="text"
                      value={advancedSearchData.receiptNumber}
                      onChange={(e) => setAdvancedSearchData(prev => ({ ...prev, receiptNumber: e.target.value }))}
                      className="flex-1 py-2 px-4 text-sm text-gray-700 bg-white border-2 border-gray-100 rounded-lg focus:outline-none focus:border-[#156372] transition-colors"
                    />
                  </div>

                  {/* Date Range */}
                  <div className="flex items-center gap-4">
                    <label className="w-32 text-sm font-medium text-gray-600 text-right">Date Range</label>
                    <div className="flex-1 flex items-center gap-2">
                      <input
                        type="date"
                        value={advancedSearchData.dateRangeFrom}
                        onChange={(e) => setAdvancedSearchData(prev => ({ ...prev, dateRangeFrom: e.target.value }))}
                        className="flex-1 py-2 px-4 text-sm text-gray-700 bg-white border-2 border-gray-100 rounded-lg focus:outline-none focus:border-[#156372] transition-colors"
                      />
                      <span className="text-gray-400">-</span>
                      <input
                        type="date"
                        value={advancedSearchData.dateRangeTo}
                        onChange={(e) => setAdvancedSearchData(prev => ({ ...prev, dateRangeTo: e.target.value }))}
                        className="flex-1 py-2 px-4 text-sm text-gray-700 bg-white border-2 border-gray-100 rounded-lg focus:outline-none focus:border-[#156372] transition-colors"
                      />
                    </div>
                  </div>

                  {/* Item Description */}
                  <div className="flex items-center gap-4">
                    <label className="w-32 text-sm font-medium text-gray-600 text-right">Item Description</label>
                    <input
                      type="text"
                      value={advancedSearchData.itemDescription}
                      onChange={(e) => setAdvancedSearchData(prev => ({ ...prev, itemDescription: e.target.value }))}
                      className="flex-1 py-2 px-4 text-sm text-gray-700 bg-white border-2 border-gray-100 rounded-lg focus:outline-none focus:border-[#156372] transition-colors"
                    />
                  </div>

                  {/* Total Range */}
                  <div className="flex items-center gap-4">
                    <label className="w-32 text-sm font-medium text-gray-600 text-right">Total Range</label>
                    <div className="flex-1 flex items-center gap-2">
                      <input
                        type="number"
                        placeholder="Min"
                        value={advancedSearchData.totalRangeFrom}
                        onChange={(e) => setAdvancedSearchData(prev => ({ ...prev, totalRangeFrom: e.target.value }))}
                        className="flex-1 py-2 px-4 text-sm text-gray-700 bg-white border-2 border-gray-100 rounded-lg focus:outline-none focus:border-[#156372] transition-colors"
                      />
                      <span className="text-gray-400">-</span>
                      <input
                        type="number"
                        placeholder="Max"
                        value={advancedSearchData.totalRangeTo}
                        onChange={(e) => setAdvancedSearchData(prev => ({ ...prev, totalRangeTo: e.target.value }))}
                        className="flex-1 py-2 px-4 text-sm text-gray-700 bg-white border-2 border-gray-100 rounded-lg focus:outline-none focus:border-[#156372] transition-colors"
                      />
                    </div>
                  </div>

                  {/* Payment Method */}
                  <div className="flex items-center gap-4">
                    <label className="w-32 text-sm font-medium text-gray-600 text-right">Payment Method</label>
                    <div className="relative flex-1" ref={paymentMethodDropdownRef}>
                      <div
                        className={`flex items-center justify-between py-2 px-4 text-sm text-gray-700 bg-white border-2 rounded-lg cursor-pointer transition-all ${isPaymentMethodDropdownOpen ? "border-[#156372]" : "border-gray-100 hover:border-gray-300"}`}
                        onClick={() => setIsPaymentMethodDropdownOpen(!isPaymentMethodDropdownOpen)}
                      >
                        <span className={advancedSearchData.paymentMethod ? "text-gray-700" : "text-gray-400"}>
                          {advancedSearchData.paymentMethod || "Select payment method"}
                        </span>
                        <ChevronDown size={16} className="text-gray-400" />
                      </div>
                      {isPaymentMethodDropdownOpen && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white border-2 border-gray-100 rounded-xl shadow-xl z-[2001] py-1 max-h-48 overflow-y-auto">
                          {["Cash", "Bank Transfer", "Check", "Credit Card"].map((method) => (
                            <div
                              key={method}
                              className="px-4 py-2.5 text-sm text-gray-700 cursor-pointer hover:bg-blue-50"
                              onClick={() => {
                                setAdvancedSearchData(prev => ({ ...prev, paymentMethod: method }));
                                setIsPaymentMethodDropdownOpen(false);
                              }}
                            >
                              {method}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Tax */}
                  <div className="flex items-center gap-4">
                    <label className="w-32 text-sm font-medium text-gray-600 text-right">Tax</label>
                    <div className="relative flex-1" ref={taxDropdownRef}>
                      <div
                        className={`flex items-center justify-between py-2 px-4 text-sm text-gray-700 bg-white border-2 rounded-lg cursor-pointer transition-all ${isTaxDropdownOpen ? "border-[#156372]" : "border-gray-100 hover:border-gray-300"}`}
                        onClick={() => setIsTaxDropdownOpen(!isTaxDropdownOpen)}
                      >
                        <span className={advancedSearchData.tax ? "text-gray-700" : "text-gray-400"}>
                          {advancedSearchData.tax || "Select a Tax"}
                        </span>
                        <ChevronDown size={16} className="text-gray-400" />
                      </div>
                      {isTaxDropdownOpen && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white border-2 border-gray-100 rounded-xl shadow-xl z-[2001] py-1 max-h-48 overflow-y-auto">
                          {taxes.map((t) => (
                            <div
                              key={t.id}
                              className="px-4 py-2.5 text-sm text-gray-700 cursor-pointer hover:bg-blue-50"
                              onClick={() => {
                                setAdvancedSearchData(prev => ({ ...prev, tax: t.name }));
                                setIsTaxDropdownOpen(false);
                              }}
                            >
                              {t.name} ({t.rate}%)
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Column */}
                <div className="space-y-6">
                  {/* Reference# */}
                  <div className="flex items-center gap-4">
                    <label className="w-32 text-sm font-medium text-gray-600 text-right">Reference#</label>
                    <input
                      type="text"
                      value={advancedSearchData.referenceNumber}
                      onChange={(e) => setAdvancedSearchData(prev => ({ ...prev, referenceNumber: e.target.value }))}
                      className="flex-1 py-2 px-4 text-sm text-gray-700 bg-white border-2 border-gray-100 rounded-lg focus:outline-none focus:border-[#156372] transition-colors"
                    />
                  </div>

                  {/* Item Name */}
                  <div className="flex items-center gap-4">
                    <label className="w-32 text-sm font-medium text-gray-600 text-right">Item Name</label>
                    <div className="relative flex-1" ref={itemNameDropdownRef}>
                      <div
                        className={`flex items-center justify-between py-2 px-4 text-sm text-gray-700 bg-white border-2 rounded-lg cursor-pointer transition-all ${isItemNameDropdownOpen ? "border-[#156372]" : "border-gray-100 hover:border-gray-300"}`}
                        onClick={() => setIsItemNameDropdownOpen(!isItemNameDropdownOpen)}
                      >
                        <span className={advancedSearchData.itemName ? "text-gray-700" : "text-gray-400"}>
                          {advancedSearchData.itemName || "Select an item"}
                        </span>
                        <ChevronDown size={16} className="text-gray-400" />
                      </div>
                      {isItemNameDropdownOpen && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white border-2 border-gray-100 rounded-xl shadow-xl z-[2001] py-1 max-h-48 overflow-y-auto">
                          {sampleItems.map((item) => (
                            <div
                              key={item.id}
                              className="px-4 py-2.5 text-sm text-gray-700 cursor-pointer hover:bg-blue-50"
                              onClick={() => {
                                setAdvancedSearchData(prev => ({ ...prev, itemName: item.name }));
                                setIsItemNameDropdownOpen(false);
                              }}
                            >
                              {item.name}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Account */}
                  <div className="flex items-center gap-4">
                    <label className="w-32 text-sm font-medium text-gray-600 text-right">Account</label>
                    <div className="relative flex-1" ref={accountDropdownRef}>
                      <div
                        className={`flex items-center justify-between py-2 px-4 text-sm text-gray-700 bg-white border-2 rounded-lg cursor-pointer transition-all ${isAccountDropdownOpen ? "border-[#156372]" : "border-gray-100 hover:border-gray-300"}`}
                        onClick={() => setIsAccountDropdownOpen(!isAccountDropdownOpen)}
                      >
                        <span className={advancedSearchData.account ? "text-gray-700" : "text-gray-400"}>
                          {advancedSearchData.account || "Select an account"}
                        </span>
                        <ChevronDown size={16} className="text-gray-400" />
                      </div>
                      {isAccountDropdownOpen && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white border-2 border-gray-100 rounded-xl shadow-xl z-[2001] py-1 max-h-48 overflow-y-auto">
                          {["Sales", "Other Income", "Interest Income"].map((acc) => (
                            <div
                              key={acc}
                              className="px-4 py-2.5 text-sm text-gray-700 cursor-pointer hover:bg-blue-50"
                              onClick={() => {
                                setAdvancedSearchData(prev => ({ ...prev, account: acc }));
                                setIsAccountDropdownOpen(false);
                              }}
                            >
                              {acc}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Customer Name */}
                  <div className="flex items-center gap-4">
                    <label className="w-32 text-sm font-medium text-gray-600 text-right">Customer Name</label>
                    <div className="relative flex-1" ref={customerDropdownRef}>
                      <div
                        className={`flex items-center justify-between py-2 px-4 text-sm text-gray-700 bg-white border-2 rounded-lg cursor-pointer transition-all ${isCustomerDropdownOpen ? "border-[#156372]" : "border-gray-100 hover:border-gray-300"}`}
                        onClick={() => setIsCustomerDropdownOpen(!isCustomerDropdownOpen)}
                      >
                        <span className={advancedSearchData.customerName ? "text-gray-700" : "text-gray-400"}>
                          {advancedSearchData.customerName || "Select customer"}
                        </span>
                        <ChevronDown size={16} className="text-gray-400" />
                      </div>
                      {isCustomerDropdownOpen && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white border-2 border-gray-100 rounded-xl shadow-xl z-[2001] py-1 max-h-48 overflow-y-auto">
                          {customers.map((c) => (
                            <div
                              key={c.id}
                              className="px-4 py-2.5 text-sm text-gray-700 cursor-pointer hover:bg-blue-50"
                              onClick={() => {
                                setAdvancedSearchData(prev => ({ ...prev, customerName: c.name }));
                                setIsCustomerDropdownOpen(false);
                              }}
                            >
                              {c.name}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Salesperson */}
                  <div className="flex items-center gap-4">
                    <label className="w-32 text-sm font-medium text-gray-600 text-right">Salesperson</label>
                    <div className="relative flex-1" ref={salespersonDropdownRef}>
                      <div
                        className={`flex items-center justify-between py-2 px-4 text-sm text-gray-700 bg-white border-2 rounded-lg cursor-pointer transition-all ${isSalespersonDropdownOpen ? "border-[#156372]" : "border-gray-100 hover:border-gray-300"}`}
                        onClick={() => setIsSalespersonDropdownOpen(!isSalespersonDropdownOpen)}
                      >
                        <span className={advancedSearchData.salesperson ? "text-gray-700" : "text-gray-400"}>
                          {advancedSearchData.salesperson || "Select a salesperson"}
                        </span>
                        <ChevronDown size={16} className="text-gray-400" />
                      </div>
                      {isSalespersonDropdownOpen && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white border-2 border-gray-100 rounded-xl shadow-xl z-[2001] py-1 max-h-48 overflow-y-auto">
                          {salespersons.map((s) => (
                            <div
                              key={s.id}
                              className="px-4 py-2.5 text-sm text-gray-700 cursor-pointer hover:bg-blue-50"
                              onClick={() => {
                                setAdvancedSearchData(prev => ({ ...prev, salesperson: s.name }));
                                setIsSalespersonDropdownOpen(false);
                              }}
                            >
                              {s.name}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Address */}
                  <div className="flex items-start gap-4">
                    <label className="w-32 text-sm font-medium text-gray-600 text-right mt-2">Address</label>
                    <div className="flex-1 space-y-4">
                      <div className="flex items-center gap-6">
                        {["Billing and Shipping", "Billing", "Shipping"].map((type) => (
                          <label key={type} className="flex items-center gap-2 cursor-pointer group">
                            <input
                              type="radio"
                              name="addressType"
                              checked={advancedSearchData.addressType === type}
                              onChange={() => setAdvancedSearchData(prev => ({ ...prev, addressType: type }))}
                              className="w-4 h-4 text-[#156372] border-gray-300 focus:ring-blue-500 cursor-pointer"
                            />
                            <span className="text-sm text-gray-600 group-hover:text-gray-900 transition-colors">{type}</span>
                          </label>
                        ))}
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="relative flex-1" ref={attentionDropdownRef}>
                          <div
                            className={`flex items-center justify-between py-2 px-4 text-sm text-gray-700 bg-white border-2 rounded-lg cursor-pointer transition-all ${isAttentionDropdownOpen ? "border-[#156372]" : "border-gray-100 hover:border-gray-300"}`}
                            onClick={() => setIsAttentionDropdownOpen(!isAttentionDropdownOpen)}
                          >
                            <span>Attention</span>
                            <ChevronDown size={16} className="text-gray-400" />
                          </div>
                          {isAttentionDropdownOpen && (
                            <div className="absolute top-full left-0 right-0 mt-2 bg-white border-2 border-gray-100 rounded-xl shadow-xl z-[2001] py-1">
                              <div className="px-4 py-2 text-xs text-gray-400">No attention options</div>
                            </div>
                          )}
                        </div>
                        <input
                          type="text"
                          value={advancedSearchData.addressLine}
                          onChange={(e) => setAdvancedSearchData(prev => ({ ...prev, addressLine: e.target.value }))}
                          className="flex-[2] py-2 px-4 text-sm text-gray-700 bg-white border-2 border-gray-100 rounded-lg focus:outline-none focus:border-[#156372] transition-colors"
                        />
                      </div>
                      <button className="text-[#156372] text-sm font-semibold hover:text-blue-700 transition-colors flex items-center gap-1">
                        <Plus size={14} />
                        Address Line
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-8 border-t border-gray-100 bg-gray-50/50 rounded-b-lg flex items-center justify-center gap-4">
              <button
                className="px-8 py-2.5 text-white border-none text-sm font-bold rounded-lg cursor-pointer transition-all shadow-md active:transform active:scale-95"
                style={{ background: "linear-gradient(90deg, #156372 0%, #0D4A52 100%)" }}
                onMouseEnter={(e) => (e.currentTarget as HTMLButtonElement).style.opacity = "0.9"}
                onMouseLeave={(e) => (e.currentTarget as HTMLButtonElement).style.opacity = "1"}
                onClick={handleAdvancedSearchSubmit}
              >
                Search
              </button>
              <button
                className="px-8 py-2.5 bg-white border-2 border-gray-200 text-gray-700 text-sm font-bold rounded-lg hover:bg-gray-50 transition-all active:transform active:scale-95"
                onClick={handleResetAdvancedSearch}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Field Customization Modal */}
      {isFieldCustomizationOpen && (
        <FieldCustomization
          featureType="sales-receipts"
          onClose={() => setIsFieldCustomizationOpen(false)}
        />
      )}
    </div>
  );
}


