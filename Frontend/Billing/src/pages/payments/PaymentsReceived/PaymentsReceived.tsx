import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import LoadingSpinner from "../../../components/LoadingSpinner";
import { getPayments, getPaymentById, getCustomViews, deleteCustomView, CustomView } from "../../sales/salesModel";
import { useCurrency } from "../../../hooks/useCurrency";
import { settingsAPI, paymentsReceivedAPI, bankAccountsAPI, paymentModesAPI } from "../../../services/api";
import { toast } from "react-toastify";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import {
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Plus,
  MoreVertical,
  ArrowUpDown,
  Settings,
  RefreshCw,
  ChevronRight as ChevronRightIcon,
  Search,
  Star,
  Filter,
  Square,
  CheckSquare,
  Paperclip,
  Download,
  Upload,
  Monitor,
  Trash2,
  X,
  Layers,
  Eye,
  Check,
  SlidersHorizontal,
  Columns3,
  AlignLeft,
  GripVertical,
  Lock
} from "lucide-react";

const statusFilterOptions = [
  "All Payments",
  "Draft",
  "Paid",
  "Void"
];

const bulkUpdateFieldOptions = [
  "Payment Mode",
  "Deposit To",
  "Payment Date"
];

const defaultBulkPaymentModeOptions = [
  "Cash",
  "Check",
  "Credit Card",
  "Bank Transfer",
  "Bank Remittance",
  "Other"
];

const sortByOptions = [
  "Created Time",
  "Last Modified Time",
  "Customer Name",
  "Profile Name",
  "Last Invoice Date",
  "Next Invoice Date",
  "Amount"
];

const paymentFields = [
  "Created Time",
  "Last Modified Time",
  "Date",
  "Payment #",
  "Customer Name",
  "Mode",
  "Amount",
  "Unused Amount"
];

const PAYMENTS_RECEIVED_VISIBLE_COLUMNS_KEY = "payments_received_visible_columns";
const paymentListColumnOptions = [
  { key: "date", label: "Date", locked: true },
  { key: "location", label: "Location" },
  { key: "paymentNumber", label: "Payment #" },
  { key: "referenceNumber", label: "Reference number" },
  { key: "customerName", label: "Customer Name" },
  { key: "invoiceNumber", label: "Invoice#" },
  { key: "paymentMode", label: "Mode" },
  { key: "amountReceived", label: "Amount" },
  { key: "unusedAmount", label: "Unused Amount" },
];

interface Payment {
  id: string | number;
  paymentNumber?: string;
  paymentDate?: string;
  location?: string;
  customerName?: string;
  customer?: any;
  paymentMode?: string;
  amountReceived?: number;
  unusedAmount?: number;
  status?: string;
  referenceNumber?: string;
  invoiceNumber?: string;
  createdTime?: string;
  lastModifiedTime?: string;
  profileName?: string;
  lastInvoiceDate?: string;
  nextInvoiceDate?: string;
  [key: string]: any;
}

// Local CustomView interface removed in favor of imported one

export default function PaymentsReceived() {
  const navigate = useNavigate();
  const [isViewDropdownOpen, setIsViewDropdownOpen] = useState(false);
  const [selectedView, setSelectedView] = useState("All Received Payments");
  const [selectedStatus, setSelectedStatus] = useState("All Payments");
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [viewSearchQuery, setViewSearchQuery] = useState("");
  const [customViews, setCustomViews] = useState(() => getCustomViews().filter(v => v.type === "payments-received"));
  const [payments, setPayments] = useState<Payment[]>([]);
  const [filteredPayments, setFilteredPayments] = useState<Payment[]>([]);
  const [selectedPayments, setSelectedPayments] = useState<Set<string | number>>(new Set());
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: string }>({ key: "paymentDate", direction: "asc" });
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);
  const [isImportMenuOpen, setIsImportMenuOpen] = useState(false);
  const [isExportSubmenuOpen, setIsExportSubmenuOpen] = useState(false);
  const [activeSortField, setActiveSortField] = useState("Date");
  const [isBulkUpdateModalOpen, setIsBulkUpdateModalOpen] = useState(false);
  const [bulkUpdateField, setBulkUpdateField] = useState("");
  const [bulkUpdateValue, setBulkUpdateValue] = useState("");
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);
  const [bulkPaymentModeOptions, setBulkPaymentModeOptions] = useState<string[]>(defaultBulkPaymentModeOptions);
  const [bulkDepositToOptions, setBulkDepositToOptions] = useState<string[]>([]);
  const [isBulkUpdateFieldDropdownOpen, setIsBulkUpdateFieldDropdownOpen] = useState(false);
  const [isSortBySubmenuOpen, setIsSortBySubmenuOpen] = useState(false);
  const [selectedSortField, setSelectedSortField] = useState("Date");
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchType, setSearchType] = useState("Payments Received");
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
  const { symbol } = useCurrency();
  const baseCurrency = symbol || "USD";
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
    customerNamePayment: "",
    // Recurring Invoices
    recurringInvoiceNumber: "",
    profileName: "",
    // Expenses
    expenseNumber: "",
    vendorName: ""
  });
  const viewDropdownRef = useRef<HTMLDivElement>(null);
  const bulkUpdateFieldDropdownRef = useRef<HTMLDivElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const sortMenuRef = useRef<HTMLDivElement>(null);
  const importMenuRef = useRef<HTMLDivElement>(null);

  // Payments Received search dropdowns
  const [isCustomerNamePaymentDropdownOpen, setIsCustomerNamePaymentDropdownOpen] = useState(false);
  const customerNamePaymentDropdownRef = useRef<HTMLDivElement>(null);
  const [isStatusPaymentDropdownOpen, setIsStatusPaymentDropdownOpen] = useState(false);
  const statusPaymentDropdownRef = useRef<HTMLDivElement>(null);
  const [isPaymentMethodDropdownOpen, setIsPaymentMethodDropdownOpen] = useState(false);
  const paymentMethodDropdownRef = useRef<HTMLDivElement>(null);
  const [isTableToolsOpen, setIsTableToolsOpen] = useState(false);
  const tableToolsRef = useRef<HTMLDivElement>(null);
  const tableToolsButtonRef = useRef<HTMLButtonElement>(null);
  const tableToolsMenuRef = useRef<HTMLDivElement>(null);
  const [tableToolsMenuPosition, setTableToolsMenuPosition] = useState({ top: 0, left: 0 });
  const [isClipTextEnabled, setIsClipTextEnabled] = useState(false);
  const [isCustomizeColumnsModalOpen, setIsCustomizeColumnsModalOpen] = useState(false);
  const [columnSearchQuery, setColumnSearchQuery] = useState("");
  const [visibleColumns, setVisibleColumns] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(PAYMENTS_RECEIVED_VISIBLE_COLUMNS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore malformed local storage
    }
    return paymentListColumnOptions.map((col) => col.key);
  });
  const [tempVisibleColumns, setTempVisibleColumns] = useState<string[]>([]);
  const isColumnVisible = (key: string) => visibleColumns.includes(key);

  useEffect(() => {
    const loadBulkFieldOptions = async () => {
      try {
        const [paymentModesResponse, bankAccountsResponse] = await Promise.all([
          paymentModesAPI.getAll({ limit: 1000 }),
          bankAccountsAPI.getAll({ limit: 1000 }),
        ]);

        const modeNames = Array.isArray(paymentModesResponse?.data)
          ? paymentModesResponse.data
            .map((mode: any) => String(mode?.name || mode?.paymentMode || mode?.label || "").trim())
            .filter((name: string) => Boolean(name))
          : [];
        if (modeNames.length > 0) {
          setBulkPaymentModeOptions(Array.from(new Set(modeNames)));
        }

        const accountNames = Array.isArray(bankAccountsResponse?.data)
          ? bankAccountsResponse.data
            .map((account: any) => String(account?.accountName || account?.name || "").trim())
            .filter((name: string) => Boolean(name))
          : [];
        if (accountNames.length > 0) {
          setBulkDepositToOptions(Array.from(new Set(accountNames)));
        }
      } catch (error) {
        console.error("Failed to load bulk update options:", error);
      }
    };

    loadBulkFieldOptions();
  }, []);

  const refreshData = () => {
    setIsRefreshing(true);
    setTimeout(async () => {
      const allPayments = await getPayments();
      const allCustomViews = getCustomViews().filter(v => v.type === "payments-received");
      setPayments(allPayments);
      setCustomViews(allCustomViews);
      applyFilters(allPayments, selectedStatus, allCustomViews);
      setIsRefreshing(false);
    }, 1000);
  };

  useEffect(() => {
    const initialLoad = async () => {
      const allPayments = await getPayments();
      // Ensure we have CustomView[] from imported module
      const allCustomViews = getCustomViews().filter(v => v.type === "payments-received");
      setPayments(allPayments);
      setCustomViews(allCustomViews);
      applyFilters(allPayments, selectedStatus, allCustomViews);
    };

    initialLoad();

    window.addEventListener("storage", initialLoad);
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) initialLoad();
    });

    return () => {
      window.removeEventListener("storage", initialLoad);
      document.removeEventListener("visibilitychange", initialLoad);
    };
  }, [selectedStatus, sortConfig]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (viewDropdownRef.current && !viewDropdownRef.current.contains(event.target as Node)) {
        setIsViewDropdownOpen(false);
      }
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
        setIsMoreMenuOpen(false);
      }
      if (sortMenuRef.current && !sortMenuRef.current.contains(event.target as Node)) {
        setIsSortMenuOpen(false);
      }
      if (importMenuRef.current && !importMenuRef.current.contains(event.target as Node)) {
        setIsImportMenuOpen(false);
      }
      if (bulkUpdateFieldDropdownRef.current && !bulkUpdateFieldDropdownRef.current.contains(event.target as Node)) {
        setIsBulkUpdateFieldDropdownOpen(false);
      }
      if (
        tableToolsRef.current &&
        !tableToolsRef.current.contains(event.target as Node) &&
        !tableToolsMenuRef.current?.contains(event.target as Node)
      ) {
        setIsTableToolsOpen(false);
      }
      // Close sort by submenu when clicking outside
      if (isSortBySubmenuOpen && !sortMenuRef.current?.contains(event.target as Node)) {
        setIsSortBySubmenuOpen(false);
      }
    };

    if (isViewDropdownOpen || isMoreMenuOpen || isSortMenuOpen || isImportMenuOpen || isBulkUpdateFieldDropdownOpen || isExportSubmenuOpen || isSortBySubmenuOpen || isTableToolsOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isViewDropdownOpen, isMoreMenuOpen, isSortMenuOpen, isImportMenuOpen, isBulkUpdateFieldDropdownOpen, isExportSubmenuOpen, isSortBySubmenuOpen, isTableToolsOpen]);

  useEffect(() => {
    if (!isTableToolsOpen) return;

    const updateTableToolsMenuPosition = () => {
      const buttonRect = tableToolsButtonRef.current?.getBoundingClientRect();
      if (!buttonRect) return;
      setTableToolsMenuPosition({
        top: buttonRect.bottom + 8,
        left: buttonRect.left
      });
    };

    updateTableToolsMenuPosition();
    window.addEventListener("resize", updateTableToolsMenuPosition);
    window.addEventListener("scroll", updateTableToolsMenuPosition, true);

    return () => {
      window.removeEventListener("resize", updateTableToolsMenuPosition);
      window.removeEventListener("scroll", updateTableToolsMenuPosition, true);
    };
  }, [isTableToolsOpen]);

  // Separate useEffect for search modal dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchTypeDropdownRef.current && !searchTypeDropdownRef.current.contains(event.target as Node)) {
        setIsSearchTypeDropdownOpen(false);
      }
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(event.target as Node)) {
        setIsFilterDropdownOpen(false);
      }
      if (customerNamePaymentDropdownRef.current && !customerNamePaymentDropdownRef.current.contains(event.target as Node)) {
        setIsCustomerNamePaymentDropdownOpen(false);
      }
      if (statusPaymentDropdownRef.current && !statusPaymentDropdownRef.current.contains(event.target as Node)) {
        setIsStatusPaymentDropdownOpen(false);
      }
      if (paymentMethodDropdownRef.current && !paymentMethodDropdownRef.current.contains(event.target as Node)) {
        setIsPaymentMethodDropdownOpen(false);
      }
    };

    if (isSearchTypeDropdownOpen || isFilterDropdownOpen || isCustomerNamePaymentDropdownOpen || isStatusPaymentDropdownOpen || isPaymentMethodDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isSearchTypeDropdownOpen, isFilterDropdownOpen, isCustomerNamePaymentDropdownOpen, isStatusPaymentDropdownOpen, isPaymentMethodDropdownOpen]);

  const getPaymentFieldValue = (payment: Payment, fieldName: string): any => {
    const fieldMap: Record<string, any> = {
      "Date": payment.paymentDate || "",
      "Payment #": payment.paymentNumber || payment.id || "",
      "Reference Number": payment.referenceNumber || "",
      "Customer Name": payment.customerName || "",
      "Status": payment.status || "draft",
      "Amount": payment.amountReceived || 0,
      "Mode": payment.paymentMode || "",
      "Unused Amount": payment.unusedAmount || payment.amountReceived || 0
    };
    return fieldMap[fieldName] !== undefined ? fieldMap[fieldName] : "";
  };

  const evaluateCriterion = (fieldValue: any, comparator: string, value: string): boolean => {
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

  const applyFilters = (allPayments: Payment[], status: string, views: CustomView[] = customViews) => {
    let filtered = Array.isArray(allPayments) ? allPayments : [];

    // Check if it's a custom view
    const customView = views.find(v => v.name === status);
    if (customView && customView.criteria) {
      const criteria = customView.criteria;
      filtered = filtered.filter(payment => {
        return criteria.every((criterion: any) => {
          if (!criterion.field || !criterion.comparator) return true;
          const fieldValue = getPaymentFieldValue(payment, criterion.field);
          return evaluateCriterion(fieldValue, criterion.comparator, criterion.value);
        });
      });
    } else if (status !== "All Payments") {
      filtered = filtered.filter(payment => (payment.status || "draft").toLowerCase() === status.toLowerCase());
    }

    // Apply sorting
    if (sortConfig.key) {
      filtered = [...filtered].sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];

        if (sortConfig.key === "customerName") {
          aValue = a.customerName || "";
          bValue = b.customerName || "";
        } else if (sortConfig.key === "amountReceived") {
          aValue = Number(a.amountReceived || 0);
          bValue = Number(b.amountReceived || 0);
        } else if (sortConfig.key === "unusedAmount") {
          aValue = Number(a.unusedAmount || a.amountReceived || 0);
          bValue = Number(b.unusedAmount || b.amountReceived || 0);
        } else if (sortConfig.key === "paymentDate") {
          aValue = new Date(a.paymentDate || 0).getTime();
          bValue = new Date(b.paymentDate || 0).getTime();
        } else if (sortConfig.key === "paymentNumber") {
          aValue = a.paymentNumber || a.id || "";
          bValue = b.paymentNumber || b.id || "";
        } else if (sortConfig.key === "paymentMode") {
          aValue = a.paymentMode || "";
          bValue = b.paymentMode || "";
        } else if (sortConfig.key === "createdTime") {
          aValue = new Date(a.createdTime || a.paymentDate || 0).getTime();
          bValue = new Date(b.createdTime || b.paymentDate || 0).getTime();
        } else if (sortConfig.key === "lastModifiedTime") {
          aValue = new Date(a.lastModifiedTime || a.paymentDate || 0).getTime();
          bValue = new Date(b.lastModifiedTime || b.paymentDate || 0).getTime();
        } else if (sortConfig.key === "profileName") {
          aValue = a.profileName || "";
          bValue = b.profileName || "";
        } else if (sortConfig.key === "lastInvoiceDate") {
          aValue = new Date(a.lastInvoiceDate || 0).getTime();
          bValue = new Date(b.lastInvoiceDate || 0).getTime();
        } else if (sortConfig.key === "nextInvoiceDate") {
          aValue = new Date(a.nextInvoiceDate || 0).getTime();
          bValue = new Date(b.nextInvoiceDate || 0).getTime();
        }

        if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }

    setFilteredPayments(filtered);
  };

  const handleSort = (sortField: string) => {
    // Map sort field names to actual keys
    const sortKeyMap = {
      "Created Time": "createdTime",
      "Last Modified Time": "lastModifiedTime",
      "Date": "paymentDate",
      "Payment #": "paymentNumber",
      "Customer Name": "customerName",
      "Mode": "paymentMode",
      "Amount": "amountReceived",
      "Unused Amount": "unusedAmount",
      "Profile Name": "profileName",
      "Last Invoice Date": "lastInvoiceDate",
      "Next Invoice Date": "nextInvoiceDate"
    };

    const key = (sortKeyMap as any)[sortField] || sortField;
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
    setActiveSortField(sortField);
    setSelectedSortField(sortField);
    setIsSortMenuOpen(false);
    setIsSortBySubmenuOpen(false);
    setIsMoreMenuOpen(false);
    applyFilters(payments, selectedStatus);
  };

  const handleImportPayments = () => {
    setIsMoreMenuOpen(false);
    setIsImportMenuOpen(false);
    navigate("/payments/payments-received/import");
  };

  const handleImportRetainerPayments = () => {
    setIsMoreMenuOpen(false);
    setIsImportMenuOpen(false);
    navigate("/payments/payments-received/import-retainer");
  };

  const handleImportAppliedExcessPayments = () => {
    setIsMoreMenuOpen(false);
    setIsImportMenuOpen(false);
    navigate("/payments/payments-received/import-applied-excess");
  };

  const handleExport = () => {
    setIsMoreMenuOpen(false);
    setIsExportSubmenuOpen(false);
    const sourceRows = Array.isArray(payments) ? payments : [];
    if (sourceRows.length === 0) {
      toast.error("No payments available to export.");
      return;
    }

    const excelRows = sourceRows.map((p: any) => ({
      "Payment ID": p.id || p._id || "",
      "Payment #": p.paymentNumber || p.id || "",
      "Payment Date": p.paymentDate || p.date || "",
      "Location": p.location || "",
      "Customer Name": p.customerName || p.customer?.displayName || p.customer?.name || "",
      "Customer ID": p.customerId || p.customer?._id || p.customer?.id || "",
      "Amount Received": p.amountReceived ?? p.amount ?? 0,
      "Currency": p.currency || "",
      "Payment Mode": p.paymentMode || "",
      "Payment Method (raw)": p.paymentMethod || "",
      "Deposit To": p.depositTo || "",
      "Deposit To Account ID": p.depositToAccountId || "",
      "Reference Number": p.referenceNumber || p.paymentReference || "",
      "Invoice #": p.invoiceNumber || "",
      "Unused Amount": p.unusedAmount ?? "",
      "Bank Charges": p.bankCharges ?? "",
      "Tax Deducted": p.taxDeducted || "",
      "Notes": p.notes || "",
      "Status": p.status || "",
      "Invoice Payments": JSON.stringify(p.invoicePayments || {}),
      "Reporting Tags": JSON.stringify(p.reportingTags || []),
      "Created At": p.createdAt || "",
      "Updated At": p.updatedAt || "",
    }));

    import("xlsx")
      .then((XLSX) => {
        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.json_to_sheet(excelRows);
        XLSX.utils.book_append_sheet(workbook, worksheet, "Payments");
        XLSX.writeFile(workbook, `payments-export-${new Date().toISOString().split("T")[0]}.xlsx`);
        toast.success(`Exported ${excelRows.length} payment(s) to Excel.`);
      })
      .catch((error) => {
        console.error("Excel export failed:", error);
        toast.error("Failed to export payments to Excel.");
      });
  };

  const handleExportCurrentView = () => {
    setIsMoreMenuOpen(false);
    setIsExportSubmenuOpen(false);
    const sourceRows = Array.isArray(filteredPayments) ? filteredPayments : [];
    if (sourceRows.length === 0) {
      toast.error("No payments in current view to export.");
      return;
    }

    const excelRows = sourceRows.map((p: any) => ({
      "Payment ID": p.id || p._id || "",
      "Payment #": p.paymentNumber || p.id || "",
      "Payment Date": p.paymentDate || p.date || "",
      "Location": p.location || "",
      "Customer Name": p.customerName || p.customer?.displayName || p.customer?.name || "",
      "Customer ID": p.customerId || p.customer?._id || p.customer?.id || "",
      "Amount Received": p.amountReceived ?? p.amount ?? 0,
      "Currency": p.currency || "",
      "Payment Mode": p.paymentMode || "",
      "Payment Method (raw)": p.paymentMethod || "",
      "Deposit To": p.depositTo || "",
      "Deposit To Account ID": p.depositToAccountId || "",
      "Reference Number": p.referenceNumber || p.paymentReference || "",
      "Invoice #": p.invoiceNumber || "",
      "Unused Amount": p.unusedAmount ?? "",
      "Bank Charges": p.bankCharges ?? "",
      "Tax Deducted": p.taxDeducted || "",
      "Notes": p.notes || "",
      "Status": p.status || "",
      "Invoice Payments": JSON.stringify(p.invoicePayments || {}),
      "Reporting Tags": JSON.stringify(p.reportingTags || []),
      "Created At": p.createdAt || "",
      "Updated At": p.updatedAt || "",
    }));

    import("xlsx")
      .then((XLSX) => {
        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.json_to_sheet(excelRows);
        XLSX.utils.book_append_sheet(workbook, worksheet, "Payments Current View");
        XLSX.writeFile(workbook, `payments-current-view-${new Date().toISOString().split("T")[0]}.xlsx`);
        toast.success(`Exported ${excelRows.length} payment(s) from current view.`);
      })
      .catch((error) => {
        console.error("Excel export failed:", error);
        toast.error("Failed to export current view to Excel.");
      });
  };

  const handlePreferences = () => {
    setIsMoreMenuOpen(false);
    navigate("/settings/payments-received");
  };

  const handleOnlinePayments = () => {
    setIsMoreMenuOpen(false);
    // TODO: Navigate to online payments configuration
    alert("Online Payments configuration will be implemented here");
  };

  const handleManageCustomFields = () => {
    setIsMoreMenuOpen(false);
    navigate("/settings/payments-received");
  };


  const handleResetColumnWidth = () => {
    setIsMoreMenuOpen(false);
    // Reset column widths (stored in localStorage if needed)
    localStorage.removeItem("payments_received_column_widths");
    alert("Column widths have been reset");
  };

  const handleRefreshList = async () => {
    setIsMoreMenuOpen(false);
    // Force reload payments from storage
    const allPayments = await getPayments();
    setPayments(allPayments);
    // Reset filters and reapply
    applyFilters(allPayments, selectedStatus);
    // Clear selected payments
    setSelectedPayments(new Set());
    // Show feedback
    console.log("Payments list refreshed. Total payments:", allPayments.length);
  };

  const handleStatusFilter = (status: string) => {
    setSelectedStatus(status);
    setIsViewDropdownOpen(false);
    setSelectedView(status);
    // applyFilters will be called via useEffect when selectedStatus changes
  };

  const formatCurrency = (amount: number | string, currency = baseCurrency) => {
    const baseSymbol = symbol || "";
    const value = Number(amount || 0).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });

    if (baseSymbol) {
      return `${baseSymbol}${value}`;
    }

    // Fallback: try to extract a short currency code from the provided currency string
    const fallbackCode = String(currency || "").split(/\s|-|_/)[0] || String(currency || "");
    return `${fallbackCode} ${value}`;
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    const parsed = new Date(dateString);
    if (Number.isNaN(parsed.getTime())) return dateString;
    const day = String(parsed.getDate()).padStart(2, "0");
    const month = parsed.toLocaleString("en-US", { month: "short" });
    const year = parsed.getFullYear();
    return `${day} ${month} ${year}`;
  };

  const handlePaymentSelect = (paymentId: string | number) => {
    navigate(`/payments/payments-received/${paymentId}`);
  };

  const handleSelectPayment = (paymentId: string | number) => {
    setSelectedPayments(prev => {
      const newSet = new Set(prev);
      if (newSet.has(paymentId)) {
        newSet.delete(paymentId);
      } else {
        newSet.add(paymentId);
      }
      return newSet;
    });
  };

  const handleSelectAllPayments = () => {
    if (selectedPayments.size === filteredPayments.length) {
      setSelectedPayments(new Set());
    } else {
      setSelectedPayments(new Set(filteredPayments.map(p => p.id)));
    }
  };

  const handleBulkUpdate = () => {
    setIsBulkUpdateModalOpen(true);
  };

  const normalizePaymentMethod = (mode: string) => {
    const normalized = String(mode || "").trim().toLowerCase();
    if (!normalized) return "other";
    if (normalized.includes("cash")) return "cash";
    if (normalized.includes("check")) return "check";
    if (normalized.includes("card") || normalized.includes("credit") || normalized.includes("debit")) return "card";
    if (normalized.includes("bank") || normalized.includes("transfer") || normalized.includes("wire") || normalized.includes("ach")) return "bank_transfer";
    return "other";
  };

  const getBulkFieldType = (field: string) => {
    if (field === "Payment Date") return "date";
    if (field === "Payment Mode" || field === "Deposit To") return "select";
    return "text";
  };

  const getBulkFieldOptions = (field: string) => {
    if (field === "Payment Mode") return bulkPaymentModeOptions;
    if (field === "Deposit To") return bulkDepositToOptions;
    return [];
  };

  const handleBulkUpdateSubmit = async () => {
    if (!bulkUpdateField || !bulkUpdateValue.trim()) {
      toast.error("Please select a field and enter new information.");
      return;
    }

    if (selectedPayments.size === 0) {
      toast.error("Please select at least one payment.");
      return;
    }

    const updatePayload: Record<string, any> = {};
    if (bulkUpdateField === "Payment Date") {
      updatePayload.date = bulkUpdateValue;
      updatePayload.paymentDate = bulkUpdateValue;
    } else if (bulkUpdateField === "Payment Mode") {
      updatePayload.paymentMode = bulkUpdateValue;
      updatePayload.paymentMethod = normalizePaymentMethod(bulkUpdateValue);
    } else if (bulkUpdateField === "Deposit To") {
      updatePayload.depositTo = bulkUpdateValue;
    }

    const selectedIds = filteredPayments
      .filter((payment) => selectedPayments.has(payment.id))
      .map((payment) => String(payment.id));

    if (selectedIds.length === 0) {
      toast.error("Please select at least one payment.");
      return;
    }

    try {
      setIsBulkUpdating(true);
      const results = await Promise.allSettled(
        selectedIds.map((id) => paymentsReceivedAPI.update(id, updatePayload))
      );
      const successCount = results.filter(
        (result) => result.status === "fulfilled" && result.value?.success
      ).length;
      const failedCount = selectedIds.length - successCount;

      if (successCount === 0) {
        toast.error("Failed to update selected payments.");
        return;
      }

      const allPayments = await getPayments();
      setPayments(allPayments);
      applyFilters(allPayments, selectedStatus);
      setIsBulkUpdateModalOpen(false);
      setBulkUpdateField("");
      setBulkUpdateValue("");
      setSelectedPayments(new Set());
      if (failedCount > 0) {
        toast.warn(`Updated ${successCount} payment(s). ${failedCount} payment(s) could not be updated.`);
      } else {
        toast.success(`Updated ${successCount} payment(s) successfully.`);
      }
    } catch (error: any) {
      console.error("Bulk update failed:", error);
      toast.error(error?.message || "Failed to update selected payments.");
    } finally {
      setIsBulkUpdating(false);
    }
  };

  const formatDateForPdf = (dateInput: string) => {
    if (!dateInput) return "-";
    const parsedDate = new Date(dateInput);
    if (Number.isNaN(parsedDate.getTime())) return dateInput;
    const day = String(parsedDate.getDate()).padStart(2, "0");
    const month = parsedDate.toLocaleString("en-US", { month: "short" });
    const year = parsedDate.getFullYear();
    return `${day} ${month} ${year}`;
  };

  const openCustomizeColumnsModal = () => {
    setTempVisibleColumns([...visibleColumns]);
    setColumnSearchQuery("");
    setIsCustomizeColumnsModalOpen(true);
  };

  const toggleTempColumn = (key: string) => {
    const option = paymentListColumnOptions.find((c) => c.key === key);
    if (option?.locked) return;
    setTempVisibleColumns((prev) => {
      if (prev.includes(key)) return prev.filter((k) => k !== key);
      return [...prev, key];
    });
  };

  const saveVisibleColumns = () => {
    const ordered = paymentListColumnOptions.map((c) => c.key).filter((k) => tempVisibleColumns.includes(k));
    const next = ordered.length > 0 ? ordered : ["date"];
    setVisibleColumns(next);
    localStorage.setItem(PAYMENTS_RECEIVED_VISIBLE_COLUMNS_KEY, JSON.stringify(next));
    setIsCustomizeColumnsModalOpen(false);
  };

  const formatCurrencyForPdf = (amount: number | string, currencyCode = "USD") => {
    const value = Number(amount || 0);
    const normalizedCode = String(currencyCode || "USD").split(/\s|-|_/)[0] || "USD";
    return `${normalizedCode} ${value.toFixed(2)}`;
  };

  const getPaymentReceiptPdfTemplate = (payment: Payment, organizationData: any, logoPreview: string) => {
    const allocations = Array.isArray((payment as any).allocations) ? (payment as any).allocations : [];
    const allocationRows = allocations.length > 0
      ? allocations.map((alloc: any) => `
          <tr>
            <td>${alloc?.invoice?.invoiceNumber || alloc?.invoice?.id || alloc?.invoice || "-"}</td>
            <td>${formatDateForPdf(alloc?.invoice?.date || payment.paymentDate || "")}</td>
            <td>${formatCurrencyForPdf(alloc?.invoice?.total || alloc?.amount || 0, (payment as any).currency || "USD")}</td>
            <td>${formatCurrencyForPdf(alloc?.amount || 0, (payment as any).currency || "USD")}</td>
          </tr>
        `).join("")
      : (payment.invoiceNumber || (payment as any).invoiceAmount || (payment as any).invoiceDate)
        ? `
          <tr>
            <td>${payment.invoiceNumber || "-"}</td>
            <td>${formatDateForPdf((payment as any).invoiceDate || payment.paymentDate || "")}</td>
            <td>${formatCurrencyForPdf((payment as any).invoiceAmount || payment.amountReceived || 0, (payment as any).currency || "USD")}</td>
            <td>${formatCurrencyForPdf(payment.amountReceived || 0, (payment as any).currency || "USD")}</td>
          </tr>
        `
        : `
          <tr>
            <td colspan="4" style="text-align:center; color:#6b7280;">No invoices linked</td>
          </tr>
        `;

    const statusLabel = String(payment.status || "paid").toUpperCase();
    const companyName = organizationData?.name || "TABAN ENTERPRISES";

    return `
      <div style="font-family: Arial, sans-serif; width:794px; min-height:1123px; background:#ffffff; color:#111827; padding:28px;">
        <div style="position: relative; border:1px solid #e5e7eb; min-height:1000px; padding:38px 56px;">
          <div style="position:absolute; top:0; left:0; width:0; height:0; border-top:80px solid #22c55e; border-right:80px solid transparent;"></div>
          <div style="position:absolute; top:12px; left:10px; color:#ffffff; font-size:16px; font-weight:700; transform:rotate(-45deg); transform-origin: 0 0;">${statusLabel}</div>

          <div style="margin-top:12px;">
            ${logoPreview ? `<img src="${logoPreview}" alt="Logo" style="height:70px; object-fit:contain; margin-bottom:16px;" />` : ""}
            <div style="font-size:34px; font-weight:700; letter-spacing:0.04em; text-transform:uppercase; margin-bottom:10px;">${companyName}</div>
            <div style="font-size:22px; color:#4b5563;">${organizationData?.street1 || ""}${organizationData?.street2 ? `, ${organizationData.street2}` : ""}</div>
            <div style="font-size:22px; color:#4b5563;">${organizationData?.city || ""}${organizationData?.zipCode ? ` ${organizationData.zipCode}` : ""}${organizationData?.stateProvince ? `, ${organizationData.stateProvince}` : ""}</div>
            <div style="font-size:22px; color:#4b5563;">${organizationData?.country || ""}</div>
            <div style="font-size:22px; color:#4b5563;">${organizationData?.email || ""}</div>
          </div>

          <div style="text-align:center; margin-top:46px; margin-bottom:40px;">
            <div style="font-size:42px; font-weight:700; letter-spacing:0.22em;">PAYMENT RECEIPT</div>
            <div style="height:1px; background:#d1d5db; width:260px; margin:10px auto 0;"></div>
          </div>

          <div style="display:flex; align-items:flex-start; gap:34px; margin-bottom:26px;">
            <div style="flex:1;">
              <div style="display:flex; justify-content:space-between; padding:13px 0; border-bottom:1px solid #e5e7eb; font-size:23px;">
                <span style="color:#4b5563;">Payment Date</span>
                <span style="font-weight:600;">${formatDateForPdf(payment.paymentDate || "")}</span>
              </div>
              <div style="display:flex; justify-content:space-between; padding:13px 0; border-bottom:1px solid #e5e7eb; font-size:23px;">
                <span style="color:#4b5563;">Reference Number</span>
                <span style="font-weight:600;">${payment.referenceNumber || "-"}</span>
              </div>
              <div style="display:flex; justify-content:space-between; padding:13px 0; border-bottom:1px solid #e5e7eb; font-size:23px;">
                <span style="color:#4b5563;">Payment Mode</span>
                <span style="font-weight:600;">${payment.paymentMode || "-"}</span>
              </div>
            </div>
            <div style="width:250px; background:#7cb342; color:#ffffff; border-radius:3px; text-align:center; padding:22px 14px;">
              <div style="font-size:24px; margin-bottom:8px;">Amount Received</div>
              <div style="font-size:46px; font-weight:700;">${formatCurrencyForPdf(payment.amountReceived || 0, (payment as any).currency || "USD")}</div>
            </div>
          </div>

          <div style="margin-top:36px; margin-bottom:18px;">
            <div style="font-size:22px; color:#4b5563; margin-bottom:8px;">Received From</div>
            <div style="font-size:30px; color:#2563eb; font-weight:700;">${payment.customerName || "-"}</div>
          </div>

          <div style="margin-top:44px;">
            <div style="font-size:26px; font-weight:700; margin-bottom:12px;">Payment for</div>
            <table style="width:100%; border-collapse:collapse; font-size:20px;">
              <thead>
                <tr style="background:#f3f4f6;">
                  <th style="text-align:left; padding:12px; border-bottom:1px solid #e5e7eb;">INVOICE NUMBER</th>
                  <th style="text-align:left; padding:12px; border-bottom:1px solid #e5e7eb;">INVOICE DATE</th>
                  <th style="text-align:left; padding:12px; border-bottom:1px solid #e5e7eb;">INVOICE AMOUNT</th>
                  <th style="text-align:left; padding:12px; border-bottom:1px solid #e5e7eb;">PAYMENT AMOUNT</th>
                </tr>
              </thead>
              <tbody>
                ${allocationRows}
              </tbody>
            </table>
          </div>

          <div style="margin-top:22px; text-align:center; color:#9ca3af; font-size:18px;">PDF Template: 'Elite Template'</div>
        </div>
      </div>
    `;
  };

  const handleDownloadPdf = async () => {
    if (selectedPayments.size === 0) return;

    const paymentIds = Array.from(selectedPayments);
    const paymentListSnapshot = [...filteredPayments];

    let organizationData: any = {
      name: "TABAN ENTERPRISES",
      street1: "",
      street2: "",
      city: "",
      stateProvince: "",
      country: "",
      zipCode: "",
      email: ""
    };
    let logoPreview = "";

    try {
      const response = await settingsAPI.getOrganizationProfile();
      if (response?.success && response?.data) {
        const org = response.data;
        organizationData = {
          ...organizationData,
          name: org.name || organizationData.name,
          street1: org.address?.street1 || "",
          street2: org.address?.street2 || "",
          city: org.address?.city || "",
          stateProvince: org.address?.state || "",
          country: org.address?.country || "",
          zipCode: org.address?.zipCode || "",
          email: org.email || ""
        };
        logoPreview = org.logo || "";
      }
    } catch (error) {
      console.warn("Failed to load organization profile for PDF template. Falling back to defaults.", error);
    }

    const pdf = new jsPDF("p", "mm", "a4");
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 10;
    const printableWidth = pageWidth - (margin * 2);
    const printableHeight = pageHeight - (margin * 2);
    let hasAnyPage = false;

    for (const paymentId of paymentIds) {
      const listPayment = paymentListSnapshot.find((p) => String(p.id) === String(paymentId));
      let detailedPayment: Payment | null = listPayment || null;

      try {
        const loadedPayment = await getPaymentById(String(paymentId));
        if (loadedPayment) {
          detailedPayment = { ...(listPayment || {}), ...loadedPayment };
        }
      } catch (error) {
        console.warn("Failed to load detailed payment for PDF. Using list data.", error);
      }

      if (!detailedPayment) continue;

      const wrapper = document.createElement("div");
      wrapper.style.position = "fixed";
      wrapper.style.left = "-10000px";
      wrapper.style.top = "0";
      wrapper.style.width = "794px";
      wrapper.style.background = "#ffffff";
      wrapper.style.zIndex = "-1";
      wrapper.innerHTML = getPaymentReceiptPdfTemplate(detailedPayment, organizationData, logoPreview);
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

        if (hasAnyPage) {
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

        hasAnyPage = true;
      } finally {
        if (wrapper.parentNode) {
          wrapper.parentNode.removeChild(wrapper);
        }
      }
    }

    if (!hasAnyPage) {
      alert("No payments available for PDF download.");
      return;
    }

    const suffix = new Date().toISOString().split("T")[0];
    pdf.save(`payments-received-${suffix}.pdf`);
  };

  const handleDelete = () => {
    if (selectedPayments.size === 0) return;

    const count = selectedPayments.size;
    if (window.confirm(`Are you sure you want to delete ${count} payment(s)?`)) {
      (async () => {
        try {
          const selectedIds = filteredPayments
            .filter((payment) => selectedPayments.has(payment.id))
            .map((payment) => String(payment.id));

          const results = await Promise.allSettled(
            selectedIds.map((id) => paymentsReceivedAPI.delete(id))
          );
          const successCount = results.filter(
            (result) => result.status === "fulfilled" && result.value?.success
          ).length;
          const failedCount = selectedIds.length - successCount;

          const allPayments = await getPayments();
          setPayments(allPayments);
          applyFilters(allPayments, selectedStatus);
          setSelectedPayments(new Set());

          if (successCount > 0 && failedCount === 0) {
            toast.success(`Deleted ${successCount} payment(s) successfully.`);
          } else if (successCount > 0) {
            toast.warn(`Deleted ${successCount} payment(s). ${failedCount} payment(s) could not be deleted.`);
          } else {
            toast.error("Failed to delete selected payments.");
          }
        } catch (error: any) {
          console.error("Error deleting payments:", error);
          toast.error(error?.message || "Failed to delete selected payments.");
        }
      })();
    }
  };

  const handleClearSelection = () => {
    setSelectedPayments(new Set());
  };

  const handleNewCustomView = () => {
    setIsViewDropdownOpen(false);
    navigate("/payments/payments-received/custom-view/new");
  };

  const handleDeleteCustomView = (viewId: string | number, e: React.MouseEvent) => {
    e.stopPropagation();
    const viewToDelete = customViews.find(v => v.id === viewId);
    if (viewToDelete && window.confirm(`Are you sure you want to delete the custom view "${viewToDelete.name}"?`)) {
      deleteCustomView(String(viewId));
      const updatedCustomViews = customViews.filter(v => v.id !== viewId);
      setCustomViews(updatedCustomViews);
      if (selectedStatus === viewToDelete.name) {
        handleStatusFilter("All Payments");
      }
    }
  };

  const filteredDefaultViews = statusFilterOptions.filter(view =>
    view.toLowerCase().includes(viewSearchQuery.toLowerCase())
  );

  const filteredCustomViews = customViews.filter(view =>
    view.name.toLowerCase().includes(viewSearchQuery.toLowerCase())
  );

  const isViewSelected = (view: string) => {
    return selectedStatus === view;
  };

  return (
    <div className="w-full min-h-screen bg-gray-50">
      {/* Header - Show Bulk Actions Bar when items are selected, otherwise show normal header */}
      {selectedPayments.size > 0 ? (
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-white">
          <div className="flex items-center gap-2">
            <button
              className="px-4 py-2 bg-gradient-to-r from-[#156372] to-[#0D4A52] border-none text-white rounded-md text-sm font-medium cursor-pointer hover:opacity-90 transition-all shadow-sm"
              onClick={handleBulkUpdate}
            >
              Bulk Update
            </button>
            <button
              className="p-2 bg-white border border-gray-200 text-gray-700 rounded-md cursor-pointer hover:bg-gray-50 hover:border-gray-300"
              onClick={handleDownloadPdf}
              title="Download PDF"
            >
              <Download size={16} />
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
              {selectedPayments.size}
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
            <div className="flex items-center gap-2">
              <div className="relative" ref={viewDropdownRef}>
                <button
                  onClick={() => setIsViewDropdownOpen(!isViewDropdownOpen)}
                  className={`flex items-center gap-2 bg-transparent border-none rounded-md py-1.5 px-3 cursor-pointer transition-colors ${isViewDropdownOpen ? "bg-blue-50" : "hover:bg-gray-100"}`}
                >
                  <h1 className="m-0 text-2xl font-semibold text-gray-900">{selectedView}</h1>
                  {isViewDropdownOpen ? (
                    <ChevronUp size={20} className="transition-transform text-gray-500" />
                  ) : (
                    <ChevronDown size={20} className="transition-transform text-gray-500" />
                  )}
                </button>

                {/* Dropdown Menu */}
                {isViewDropdownOpen && (
                  <div className="absolute top-full left-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-xl z-50 min-w-[300px] flex flex-col max-h-[500px] overflow-hidden">
                    {/* Search Bar */}
                    <div className="bg-gray-50 flex items-center gap-2 p-3 border-b border-gray-200">
                      <Search size={16} className="text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search views..."
                        value={viewSearchQuery}
                        onChange={(e) => setViewSearchQuery(e.target.value)}
                        className="flex-1 outline-none text-sm text-gray-700 bg-transparent"
                      />
                    </div>

                    {/* View Options Scroll Area */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar pt-2">
                      {/* Default Views */}
                      <div className="px-3 pb-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-white">
                        System Views
                      </div>
                      {filteredDefaultViews.map((status) => (
                        <div
                          key={status}
                          onClick={() => handleStatusFilter(status)}
                          className={`group flex items-center justify-between px-4 py-2.5 text-sm cursor-pointer transition-all ${isViewSelected(status) ? "bg-blue-50 text-blue-600" : "text-gray-900 hover:bg-gray-50"
                            }`}
                        >
                          <div className="flex items-center gap-3">
                            <Eye size={16} className={isViewSelected(status) ? "text-blue-500" : "text-gray-400 opacity-40"} />
                            <span>{status}</span>
                          </div>
                          {isViewSelected(status) && <Check size={14} className="text-blue-600" />}
                        </div>
                      ))}

                      {/* Custom Views */}
                      {filteredCustomViews.length > 0 && (
                        <div className="mt-4">
                          {/* <div className="px-3 pb-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-white">
                            Custom Views
                          </div> */}
                          {filteredCustomViews.map((view) => (
                            <div
                              key={view.id}
                              className={`group flex items-center justify-between px-4 py-2.5 text-sm cursor-pointer transition-all ${isViewSelected(view.name) ? "bg-blue-50 text-blue-600" : "text-gray-900 hover:bg-gray-50"
                                }`}
                              onClick={() => handleStatusFilter(view.name)}
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
                                {isViewSelected(view.name) && <Check size={14} className="text-blue-600" />}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* New Custom View */}
                    {/* <button
                      className="flex items-center justify-center gap-2 p-4 border-t border-gray-100 bg-white text-blue-600 text-sm font-bold cursor-pointer hover:bg-gray-50 transition-all active:scale-[0.98] w-full"
                      onClick={handleNewCustomView}
                    >
                      <Plus size={18} strokeWidth={3} />
                      New Custom View
                    </button> */}
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3">
              <button
                className="cursor-pointer transition-all bg-gradient-to-r from-[#156372] to-[#0D4A52] text-white px-6 py-2 rounded-lg hover:opacity-90 active:scale-95 flex items-center gap-2 text-sm font-bold shadow-md"
                onClick={() => navigate("/payments/payments-received/new")}
              >
                <Plus size={16} strokeWidth={3} />
                New
              </button>
              <div className="relative" ref={moreMenuRef}>
                <button
                  className="flex items-center justify-center w-9 h-9 bg-gray-50 border border-gray-200 rounded-md cursor-pointer text-gray-500 transition-colors hover:bg-gray-100"
                  onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
                >
                  <MoreVertical size={18} />
                </button>

                {isMoreMenuOpen && (
                  <div className="absolute top-full right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg min-w-[200px] z-[1000] overflow-visible divide-y divide-gray-100">
                    {/* Sort by - with left popover for fields */}
                    <div
                      className={`relative flex items-center gap-3 py-2.5 px-4 cursor-pointer transition-all text-sm group ${isSortBySubmenuOpen ? "bg-[#156372] text-white" : "text-gray-700 hover:bg-[#156372]/10 hover:text-[#156372]"}`}
                      ref={sortMenuRef}
                      onClick={() => {
                        setIsSortBySubmenuOpen((prev) => !prev);
                        setIsImportMenuOpen(false);
                      }}
                    >
                      <ArrowUpDown size={16} className={`flex-shrink-0 ${isSortBySubmenuOpen ? "text-white" : "text-[#156372]"}`} />
                      <span className="flex-1">Sort by</span>
                      <ChevronRight size={16} className={`flex-shrink-0 ${isSortBySubmenuOpen ? "text-white" : "text-[#156372]"}`} />

                      {/* Left Popover - Data Fields */}
                      {isSortBySubmenuOpen && (
                        <div className="absolute top-0 right-full mr-1.5 w-[180px] bg-white border border-gray-200 rounded-lg shadow-lg py-2 z-[99999]">
                          {paymentFields.map((field) => (
                            <div
                              key={field}
                              className={`flex items-center justify-between py-2.5 px-3.5 mx-2 text-sm text-gray-700 cursor-pointer transition-all bg-white rounded-md ${selectedSortField === field ? "!bg-[#156372] !text-white" : "hover:bg-[#156372]/10 hover:text-[#156372]"
                                }`}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSort(field);
                                setIsSortBySubmenuOpen(false);
                                setIsMoreMenuOpen(false);
                              }}
                            >
                              {field}
                              {selectedSortField === field && (
                                sortConfig.direction === "asc" ?
                                  <ChevronUp size={14} className="text-white" /> :
                                  <ChevronDown size={14} className="text-white" />
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Import - with submenu */}
                    <div
                      className={`relative flex items-center gap-3 py-2.5 px-4 cursor-pointer transition-all text-sm group ${isImportMenuOpen ? "bg-[#156372] text-white" : "text-gray-700 hover:bg-[#156372]/10 hover:text-[#156372]"}`}
                      ref={importMenuRef}
                      onClick={() => {
                        setIsImportMenuOpen((prev) => !prev);
                        setIsSortBySubmenuOpen(false);
                      }}
                    >
                      <Download size={16} className={`flex-shrink-0 ${isImportMenuOpen ? "text-white" : "text-[#156372]"}`} />
                      <span className="flex-1">Import</span>
                      <ChevronRight size={16} className={`flex-shrink-0 ${isImportMenuOpen ? "text-white" : "text-[#156372]"}`} />

                      {/* Import Submenu */}
                      {isImportMenuOpen && (
                        <div className="absolute top-0 right-full mr-1.5 min-w-[220px] bg-white border border-gray-200 rounded-lg shadow-lg py-2 z-[99999]">
                          <div
                            className="flex items-center py-2.5 px-4 text-sm text-gray-700 cursor-pointer transition-all whitespace-nowrap hover:bg-[#156372]/10 hover:text-[#156372]"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleImportPayments();
                            }}
                          >
                            Import Payments
                          </div>
                          <div
                            className="flex items-center py-2.5 px-4 text-sm text-gray-700 cursor-pointer transition-all whitespace-nowrap hover:bg-[#156372]/10 hover:text-[#156372]"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleImportAppliedExcessPayments();
                            }}
                          >
                            Import Applied Excess Payments
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Export Payments */}
                    <div
                      className="flex items-center gap-3 py-2.5 px-4 cursor-pointer transition-colors text-sm text-gray-700 hover:bg-[#156372]/10 hover:text-[#156372]"
                      onClick={handleExport}
                    >
                      <Upload size={16} className="text-[#156372] flex-shrink-0" />
                      <span className="flex-1">Export Payments</span>
                    </div>

                    {/* Manage Custom Fields */}
                    <div
                      className="flex items-center gap-3 py-2.5 px-4 cursor-pointer transition-colors text-sm text-gray-700 hover:bg-[#156372]/10 hover:text-[#156372]"
                      onClick={handleManageCustomFields}
                    >
                      <Layers size={16} className="text-[#156372] flex-shrink-0" />
                      <span className="flex-1">Manage Custom Fields</span>
                    </div>

                    {/* Online Payments */}
                    <div
                      className="flex items-center gap-3 py-2.5 px-4 cursor-pointer transition-colors text-sm text-gray-700 hover:bg-[#156372]/10 hover:text-[#156372]"
                      onClick={handleOnlinePayments}
                    >
                      <Monitor size={16} className="text-[#156372] flex-shrink-0" />
                      <span className="flex-1">Online Payments</span>
                    </div>

                    {/* Reset Column Width */}
                    <div
                      className="flex items-center gap-3 py-2.5 px-4 cursor-pointer transition-colors text-sm text-gray-700 hover:bg-[#156372]/10 hover:text-[#156372]"
                      onClick={handleResetColumnWidth}
                    >
                      <RefreshCw size={16} className="text-[#156372] flex-shrink-0" />
                      <span className="flex-1">Reset Column Width</span>
                    </div>

                    {/* Refresh List */}
                    <div
                      className={`flex items-center gap-3 py-2.5 px-4 cursor-pointer transition-colors text-sm text-gray-700 hover:bg-[#156372]/10 hover:text-[#156372] ${isRefreshing ? "opacity-50 cursor-not-allowed" : ""}`}
                      onClick={() => {
                        if (!isRefreshing) {
                          refreshData();
                          setIsMoreMenuOpen(false);
                        }
                      }}
                    >
                      <RefreshCw size={16} className={`text-[#156372] flex-shrink-0 ${isRefreshing ? "animate-spin" : ""}`} />
                      <span className="flex-1">Refresh List</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}



      <div className="p-6 relative">

        {filteredPayments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-3">No payments received, yet</h2>
            <p className="text-gray-600 mb-6 max-w-md">
              Payments will be added once your customers pay for their invoices.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-visible">
            <div className="overflow-x-auto overflow-y-visible">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-[#f8f9fc] border-b border-[#e5e7eb]">
                    <th className="p-4 text-left relative z-[120]">
                      <div className="relative" ref={tableToolsRef}>
                        <button
                          ref={tableToolsButtonRef}
                          className="p-1.5 rounded hover:bg-gray-200 transition-colors text-blue-600"
                          onClick={() => setIsTableToolsOpen((prev) => !prev)}
                          title="Table options"
                        >
                          <SlidersHorizontal size={16} />
                        </button>
                        {isTableToolsOpen && typeof document !== "undefined" && createPortal(
                          <div
                            ref={tableToolsMenuRef}
                            className="fixed w-48 bg-white border border-gray-200 rounded-xl shadow-xl z-[3000] overflow-hidden"
                            style={{ top: tableToolsMenuPosition.top, left: tableToolsMenuPosition.left }}
                          >
                            <button
                              className="w-full flex items-center gap-2 px-4 py-3 text-sm text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                              onClick={() => {
                                setIsTableToolsOpen(false);
                                openCustomizeColumnsModal();
                              }}
                            >
                              <Columns3 size={16} />
                              Customize Columns
                            </button>
                            <button
                              className="w-full flex items-center gap-2 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                              onClick={() => {
                                setIsTableToolsOpen(false);
                                setIsClipTextEnabled((prev) => !prev);
                              }}
                            >
                              <AlignLeft size={16} className="text-blue-600" />
                              Clip Text
                            </button>
                          </div>,
                          document.body
                        )}
                      </div>
                    </th>
                    <th className="p-4 text-left">
                      <button
                        className="p-1 hover:bg-gray-200 rounded transition-colors"
                        onClick={handleSelectAllPayments}
                      >
                        {selectedPayments.size === filteredPayments.length && filteredPayments.length > 0 ? (
                          <CheckSquare size={16} fill="#6b7280" color="#6b7280" />
                        ) : (
                          <Square size={16} className="text-gray-400" />
                        )}
                      </button>
                    </th>
                    {isColumnVisible("date") && (
                      <th className="p-4 text-left text-xs font-semibold text-[#667085] uppercase tracking-wide">
                        <button className="flex items-center gap-2 hover:text-blue-600 transition-colors">
                          DATE
                          <ArrowUpDown size={14} className="text-gray-400" />
                        </button>
                      </th>
                    )}
                    {isColumnVisible("location") && <th className="p-4 text-left text-xs font-semibold text-[#667085] uppercase tracking-wide">LOCATION</th>}
                    {isColumnVisible("paymentNumber") && (
                      <th className="p-4 text-left text-xs font-semibold text-[#667085] uppercase tracking-wide">
                        <button className="flex items-center gap-2 hover:text-blue-600 transition-colors">
                          PAYMENT #
                        </button>
                      </th>
                    )}
                    {isColumnVisible("referenceNumber") && <th className="p-4 text-left text-xs font-semibold text-[#667085] uppercase tracking-wide">REFERENCE NUMBER</th>}
                    {isColumnVisible("customerName") && <th className="p-4 text-left text-xs font-semibold text-[#667085] uppercase tracking-wide">CUSTOMER NAME</th>}
                    {isColumnVisible("invoiceNumber") && <th className="p-4 text-left text-xs font-semibold text-[#667085] uppercase tracking-wide">INVOICE#</th>}
                    {isColumnVisible("paymentMode") && <th className="p-4 text-left text-xs font-semibold text-[#667085] uppercase tracking-wide">MODE</th>}
                    {isColumnVisible("amountReceived") && <th className="p-4 text-left text-xs font-semibold text-[#667085] uppercase tracking-wide">AMOUNT</th>}
                    {isColumnVisible("unusedAmount") && <th className="p-4 text-left text-xs font-semibold text-[#667085] uppercase tracking-wide">UNUSED AMOUNT</th>}
                    <th className="p-4 text-left">
                      <button
                        onClick={() => setShowSearchModal(true)}
                        className="cursor-pointer hover:text-gray-700"
                      >
                        <Search size={16} className="text-gray-500" />
                      </button>
                    </th>
                    <th className="p-4 text-left"></th>
                  </tr>
                </thead>
                <tbody>
                  {isRefreshing ? (
                    Array(5).fill(0).map((_, index) => (
                    <tr key={`skeleton-${index}`} className="border-b border-[#e5e7eb]">
                      <td className="p-4"></td>
                      <td className="p-4">
                        <div className="w-4 h-4 bg-gray-200 rounded animate-pulse"></div>
                      </td>
                      <td className="p-4"><div className="h-4 bg-gray-200 rounded animate-pulse w-24"></div></td>
                      <td className="p-4"><div className="h-4 bg-gray-200 rounded animate-pulse w-28"></div></td>
                      <td className="p-4"><div className="h-4 bg-gray-200 rounded animate-pulse w-32"></div></td>
                      <td className="p-4"><div className="h-4 bg-gray-200 rounded animate-pulse w-24"></div></td>
                      <td className="p-4"><div className="h-4 bg-gray-200 rounded animate-pulse w-40"></div></td>
                      <td className="p-4"><div className="h-4 bg-gray-200 rounded animate-pulse w-32"></div></td>
                      <td className="p-4"><div className="h-4 bg-gray-200 rounded animate-pulse w-24"></div></td>
                      <td className="p-4"><div className="h-4 bg-gray-200 rounded animate-pulse w-24"></div></td>
                      <td className="p-4"><div className="h-4 bg-gray-200 rounded animate-pulse w-24"></div></td>
                      <td className="p-4"></td>
                    </tr>
                  ))
                ) : (
                    filteredPayments.map((payment, index) => (
                      <tr
                        key={payment.id}
                        onClick={(e) => {
                          const target = e.target as HTMLElement;
                          if (!target.closest('button') && !target.closest('svg')) {
                            handlePaymentSelect(payment.id);
                          }
                        }}
                        className={`border-b border-[#e5e7eb] hover:bg-[#eef2f7] transition-colors cursor-pointer ${index % 2 === 0 ? "bg-[#f7f8fb]" : "bg-white"}`}
                      >
                        <td className="p-4"></td>
                        <td className="p-4">
                          <button
                            className="p-1 hover:bg-gray-200 rounded transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectPayment(payment.id);
                            }}
                          >
                            {selectedPayments.has(payment.id) ? (
                              <CheckSquare size={16} fill="#6b7280" color="#6b7280" />
                            ) : (
                              <Square size={16} className="text-gray-400" />
                            )}
                          </button>
                        </td>
                        {isColumnVisible("date") && <td className="p-4 text-gray-900">{formatDate(payment.paymentDate || "")}</td>}
                        {isColumnVisible("location") && <td className="p-4 text-gray-900">{payment.location || "Head Office"}</td>}
                        {isColumnVisible("paymentNumber") && (
                          <td className="p-4">
                            <span className="text-blue-600 hover:text-blue-700 hover:underline font-medium cursor-pointer">
                              {payment.paymentNumber || payment.id}
                            </span>
                          </td>
                        )}
                        {isColumnVisible("referenceNumber") && <td className="p-4 text-gray-900">
                          <div
                            className={isClipTextEnabled ? "max-w-[180px] truncate" : ""}
                            title={payment.referenceNumber || "-"}
                          >
                            {payment.referenceNumber || "-"}
                          </div>
                        </td>}
                        {isColumnVisible("customerName") && <td className="p-4 text-gray-900">
                          <div
                            className={isClipTextEnabled ? "max-w-[200px] truncate" : ""}
                            title={
                              payment.customerName ||
                              payment.customer?.displayName ||
                              payment.customer?.name ||
                              payment.customer?.companyName ||
                              payment.allocations?.[0]?.invoice?.customerName ||
                              payment.allocations?.[0]?.invoice?.customer?.displayName ||
                              payment.allocations?.[0]?.invoice?.customer?.name ||
                              (typeof payment.customer === 'string' ? payment.customer : "-")
                            }
                          >
                            {payment.customerName ||
                              payment.customer?.displayName ||
                              payment.customer?.name ||
                              payment.customer?.companyName ||
                              payment.allocations?.[0]?.invoice?.customerName ||
                              payment.allocations?.[0]?.invoice?.customer?.displayName ||
                              payment.allocations?.[0]?.invoice?.customer?.name ||
                              (typeof payment.customer === 'string' ? payment.customer : "-")}
                          </div>
                        </td>}
                        {isColumnVisible("invoiceNumber") && <td className="p-4 text-gray-900">
                          <div
                            className={isClipTextEnabled ? "max-w-[140px] truncate" : ""}
                            title={
                              payment.invoiceNumber ||
                              payment.allocations?.[0]?.invoice?.invoiceNumber ||
                              payment.allocations?.[0]?.invoice?.id ||
                              payment.allocations?.[0]?.invoice ||
                              "-"
                            }
                          >
                            {payment.invoiceNumber ||
                              payment.allocations?.[0]?.invoice?.invoiceNumber ||
                              payment.allocations?.[0]?.invoice?.id ||
                              payment.allocations?.[0]?.invoice ||
                              "-"}
                          </div>
                        </td>}
                        {isColumnVisible("paymentMode") && <td className="p-4 text-gray-900">{payment.paymentMode || "-"}</td>}
                        {isColumnVisible("amountReceived") && <td className="p-4 text-gray-900">{formatCurrency(payment.amountReceived || 0, payment.currency)}</td>}
                        {isColumnVisible("unusedAmount") && <td className="p-4 text-gray-900">{formatCurrency(payment.unusedAmount || payment.amountReceived || 0, payment.currency)}</td>}
                        <td className="p-4"></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Bulk Update Modal */}
      {isBulkUpdateModalOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsBulkUpdateModalOpen(false);
            }
          }}
        >
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Bulk Update Payments Received</h2>
              <button
                className="p-2 hover:bg-gray-100 rounded-lg text-gray-600 transition-colors"
                onClick={() => setIsBulkUpdateModalOpen(false)}
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
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Field</label>
                  <div
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-sm text-gray-700 bg-white flex items-center justify-between hover:border-blue-500 transition-colors cursor-pointer"
                    onClick={() => setIsBulkUpdateFieldDropdownOpen(!isBulkUpdateFieldDropdownOpen)}
                  >
                    <span>{bulkUpdateField || "Select a field"}</span>
                    <ChevronDown size={16} />
                  </div>
                  {isBulkUpdateFieldDropdownOpen && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white border-2 border-gray-200 rounded-xl shadow-xl z-50 max-h-60 overflow-y-auto">
                      {bulkUpdateFieldOptions.map((field) => (
                        <div
                          key={field}
                          className="p-3 cursor-pointer hover:bg-blue-50 text-sm text-gray-700 transition-colors"
                          onClick={() => {
                            setBulkUpdateField(field);
                            setBulkUpdateValue("");
                            setIsBulkUpdateFieldDropdownOpen(false);
                          }}
                        >
                          {field}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">New Information</label>
                  {getBulkFieldType(bulkUpdateField) === "date" ? (
                    <input
                      type="date"
                      className="w-full px-4 py-3 border-2 border-blue-300 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                      value={bulkUpdateValue}
                      onChange={(e) => setBulkUpdateValue(e.target.value)}
                    />
                  ) : getBulkFieldType(bulkUpdateField) === "select" ? (
                    <select
                      className="w-full px-4 py-3 border-2 border-blue-300 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white"
                      value={bulkUpdateValue}
                      onChange={(e) => setBulkUpdateValue(e.target.value)}
                      disabled={!bulkUpdateField}
                    >
                      <option value="">Select {bulkUpdateField || "value"}</option>
                      {getBulkFieldOptions(bulkUpdateField).map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      className="w-full px-4 py-3 border-2 border-blue-300 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                      value={bulkUpdateValue}
                      onChange={(e) => setBulkUpdateValue(e.target.value)}
                      placeholder="Enter new information"
                    />
                  )}
                </div>
              </div>

              <div className="mt-4 text-xs text-gray-500">
                <strong className="text-gray-700">Note:</strong> All the selected customer payments will be updated with the new information and you cannot undo this action.
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
              <button
                className="px-6 py-2 bg-gradient-to-r from-[#156372] to-[#0D4A52] text-white rounded-lg text-sm font-semibold hover:opacity-90 shadow-sm transition-all"
                onClick={handleBulkUpdateSubmit}
                disabled={isBulkUpdating}
              >
                {isBulkUpdating ? "Updating..." : "Update"}
              </button>
              <button
                className="px-6 py-2 bg-white border-2 border-gray-200 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors"
                onClick={() => {
                  setIsBulkUpdateModalOpen(false);
                  setBulkUpdateField("");
                  setBulkUpdateValue("");
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {isCustomizeColumnsModalOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-[2100] flex items-start justify-center pt-10 px-4"
          onClick={() => setIsCustomizeColumnsModalOpen(false)}
        >
          <div
            className="w-full max-w-[760px] bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <SlidersHorizontal size={16} className="text-gray-600" />
                <h3 className="text-[15px] font-medium text-[#313131]">Customize Columns</h3>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-700">{tempVisibleColumns.length} of {paymentListColumnOptions.length} Selected</span>
                <button
                  onClick={() => setIsCustomizeColumnsModalOpen(false)}
                  className="w-8 h-8 rounded-md border border-blue-500 text-red-500 hover:bg-red-50 transition-colors flex items-center justify-center"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className="p-5 border-b border-gray-100">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search"
                  value={columnSearchQuery}
                  onChange={(e) => setColumnSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="max-h-[430px] overflow-y-auto p-5 space-y-2">
              {paymentListColumnOptions
                .filter((col) => col.label.toLowerCase().includes(columnSearchQuery.toLowerCase()))
                .map((col) => {
                  const checked = tempVisibleColumns.includes(col.key);
                  return (
                    <div key={col.key} className="flex items-center justify-between px-3 py-2.5 rounded-md bg-[#f9fafb] border border-gray-100">
                      <div className="flex items-center gap-3">
                        <GripVertical size={14} className="text-gray-400" />
                        {col.locked ? (
                          <Lock size={14} className="text-gray-500" />
                        ) : (
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleTempColumn(col.key)}
                            className="w-4 h-4 accent-blue-600"
                          />
                        )}
                        <span className="text-sm text-gray-700">{col.label}</span>
                      </div>
                    </div>
                  );
                })}
            </div>

            <div className="px-5 py-4 border-t border-gray-200 flex items-center gap-3">
              <button
                className="px-5 py-2 rounded-md bg-green-500 text-white font-semibold hover:bg-green-600 transition-colors"
                onClick={saveVisibleColumns}
              >
                Save
              </button>
              <button
                className="px-5 py-2 rounded-md bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200 transition-colors"
                onClick={() => setIsCustomizeColumnsModalOpen(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Search Modal */}
      {showSearchModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-[2000]"
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
                              // Reset search form data when changing search type
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
                                customerNamePayment: "",
                                recurringInvoiceNumber: "",
                                profileName: "",
                                expenseNumber: "",
                                vendorName: ""
                              });
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
                      <span>{selectedView}</span>
                      <ChevronDown size={16} className={`text-gray-500 transition-transform ${isFilterDropdownOpen ? "rotate-180" : ""}`} />
                    </div>
                    {isFilterDropdownOpen && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-blue-600 border-t-0 rounded-b-md shadow-lg z-[1002] max-h-[200px] overflow-y-auto">
                        {statusFilterOptions.map((view) => (
                          <div
                            key={view}
                            className="py-2.5 px-3.5 text-sm text-gray-700 cursor-pointer transition-colors hover:bg-gray-100"
                            onClick={() => {
                              setSelectedView(view);
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
                  setShowSearchModal(false);
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
                    customerNamePayment: "",
                    recurringInvoiceNumber: "",
                    profileName: "",
                    expenseNumber: "",
                    vendorName: ""
                  });
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Search Criteria Body */}
            <div className="p-6">
              {searchType === "Payments Received" && (
                <div className="grid grid-cols-2 gap-6">
                  {/* Left Column */}
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

                    {/* Customer Name */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Customer Name</label>
                      <input
                        type="text"
                        value={searchModalData.customerName}
                        onChange={(e) => setSearchModalData(prev => ({ ...prev, customerName: e.target.value }))}
                        className="w-full py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                        placeholder="Enter customer name"
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
                          placeholder="From"
                        />
                        <span className="text-gray-500">-</span>
                        <input
                          type="text"
                          value={searchModalData.totalRangeToPayment}
                          onChange={(e) => setSearchModalData(prev => ({ ...prev, totalRangeToPayment: e.target.value }))}
                          className="flex-1 py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                          placeholder="To"
                        />
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
                        value={searchModalData.referenceNumberPayment}
                        onChange={(e) => setSearchModalData(prev => ({ ...prev, referenceNumberPayment: e.target.value }))}
                        className="w-full py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                      />
                    </div>

                    {/* Status */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Status</label>
                      <select
                        value={searchModalData.statusPayment}
                        onChange={(e) => setSearchModalData(prev => ({ ...prev, statusPayment: e.target.value }))}
                        className="w-full py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                      >
                        <option value="">Select</option>
                        <option value="All">All</option>
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                      </select>
                    </div>

                    {/* Payment Method */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Payment Method</label>
                      <input
                        type="text"
                        value={searchModalData.paymentMethod}
                        onChange={(e) => setSearchModalData(prev => ({ ...prev, paymentMethod: e.target.value }))}
                        className="w-full py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                      />
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
                      <select
                        value={searchModalData.status}
                        onChange={(e) => setSearchModalData(prev => ({ ...prev, status: e.target.value }))}
                        className="w-full py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                      >
                        <option value="All">All</option>
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                      </select>
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
                      <select
                        value={searchModalData.customerType}
                        onChange={(e) => setSearchModalData(prev => ({ ...prev, customerType: e.target.value }))}
                        className="w-full py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                      >
                        <option value="">Select</option>
                        <option value="Business">Business</option>
                        <option value="Individual">Individual</option>
                      </select>
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
                      <input
                        type="text"
                        value={searchModalData.customerName}
                        onChange={(e) => setSearchModalData(prev => ({ ...prev, customerName: e.target.value }))}
                        className="w-full py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                        placeholder="Enter customer name"
                      />
                    </div>

                    {/* Salesperson */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Salesperson</label>
                      <input
                        type="text"
                        value={searchModalData.salesperson}
                        onChange={(e) => setSearchModalData(prev => ({ ...prev, salesperson: e.target.value }))}
                        className="w-full py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                        placeholder="Enter salesperson"
                      />
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
                      <input
                        type="text"
                        value={searchModalData.itemNameQuote}
                        onChange={(e) => setSearchModalData(prev => ({ ...prev, itemNameQuote: e.target.value }))}
                        className="w-full py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                        placeholder="Enter item name"
                      />
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
                          placeholder="From"
                        />
                        <span className="text-gray-500">-</span>
                        <input
                          type="text"
                          value={searchModalData.totalRangeToQuote}
                          onChange={(e) => setSearchModalData(prev => ({ ...prev, totalRangeToQuote: e.target.value }))}
                          className="flex-1 py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                          placeholder="To"
                        />
                      </div>
                    </div>

                    {/* Project Name */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Project Name</label>
                      <input
                        type="text"
                        value={searchModalData.projectName}
                        onChange={(e) => setSearchModalData(prev => ({ ...prev, projectName: e.target.value }))}
                        className="w-full py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                        placeholder="Enter project name"
                      />
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

                    {/* Customer Name */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Customer Name</label>
                      <input
                        type="text"
                        value={searchModalData.customerNameInvoice}
                        onChange={(e) => setSearchModalData(prev => ({ ...prev, customerNameInvoice: e.target.value }))}
                        className="w-full py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                        placeholder="Enter customer name"
                      />
                    </div>

                    {/* Status */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Status</label>
                      <select
                        value={searchModalData.status}
                        onChange={(e) => setSearchModalData(prev => ({ ...prev, status: e.target.value }))}
                        className="w-full py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                      >
                        <option value="All">All</option>
                        <option value="Draft">Draft</option>
                        <option value="Sent">Sent</option>
                        <option value="Paid">Paid</option>
                        <option value="Overdue">Overdue</option>
                        <option value="Unpaid">Unpaid</option>
                      </select>
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

                    {/* Total Range */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Total Range</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={searchModalData.totalRangeFromInvoice}
                          onChange={(e) => setSearchModalData(prev => ({ ...prev, totalRangeFromInvoice: e.target.value }))}
                          className="flex-1 py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                          placeholder="From"
                        />
                        <span className="text-gray-500">-</span>
                        <input
                          type="text"
                          value={searchModalData.totalRangeToInvoice}
                          onChange={(e) => setSearchModalData(prev => ({ ...prev, totalRangeToInvoice: e.target.value }))}
                          className="flex-1 py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                          placeholder="To"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {searchType === "Expenses" && (
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Expense#</label>
                      <input
                        type="text"
                        value={searchModalData.expenseNumber}
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
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Vendor Name</label>
                      <input
                        type="text"
                        value={searchModalData.vendorName}
                        onChange={(e) => setSearchModalData(prev => ({ ...prev, vendorName: e.target.value }))}
                        className="w-full py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                      />
                    </div>
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
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Reference#</label>
                      <input
                        type="text"
                        value={searchModalData.referenceNumber}
                        onChange={(e) => setSearchModalData(prev => ({ ...prev, referenceNumber: e.target.value }))}
                        className="w-full py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Status</label>
                      <select
                        value={searchModalData.status}
                        onChange={(e) => setSearchModalData(prev => ({ ...prev, status: e.target.value }))}
                        className="w-full py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                      >
                        <option value="All">All</option>
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Account</label>
                      <input
                        type="text"
                        value={searchModalData.account}
                        onChange={(e) => setSearchModalData(prev => ({ ...prev, account: e.target.value }))}
                        className="w-full py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                      />
                    </div>
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

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
                <button
                  onClick={() => {
                    setShowSearchModal(false);
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
                      customerNamePayment: "",
                      recurringInvoiceNumber: "",
                      profileName: "",
                      expenseNumber: "",
                      vendorName: ""
                    });
                  }}
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
        </div>
      )}

    </div>
  );
}
