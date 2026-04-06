import React, { useState, useEffect, useRef, useMemo } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { toast } from "react-toastify";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Plus,
  ArrowDownLeft,
  ArrowUpDown,
  Search,
  Play,
  MoreHorizontal,
  MoreVertical,
  Calendar,
  Upload,
  Filter,
  CheckSquare,
  Square,
  Pencil,
  Download,
  Trash2,
  Send,
  X,
  AlertTriangle,
  Settings,
  RefreshCw,
  Eye,
  EyeOff,
  Info,
  Lock,
  CheckCircle,
  FileText,
  Mail,
  Link,
  CreditCard,
  Share2,
  HelpCircle,
  SlidersHorizontal,
  GripVertical,
  RotateCcw
} from "lucide-react";
import { getInvoicesPaginated, getInvoiceById, updateInvoice, deleteInvoice, Invoice } from "../salesModel";
import { getInvoiceStatusDisplay } from "../../utils/invoiceUtils";
import { useCurrency } from "../../hooks/useCurrency";
import { useSettings } from "../../lib/settings/SettingsContext";
import PaginationFooter from "../../components/ui/PaginationFooter";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import * as XLSX from "xlsx";

const ALL_INVOICE_VIEWS = [
  "All Invoices",
  "Draft",
  "Locked",
  "Pending Approval",
  "Approved",
  "Customer Viewed",
  "Partially Paid",
  "Unpaid",
  "Overdue",
  "Payment Initiated",
  "Paid",
  "Void",
  "Debit Note",
  "Write Off"
];

const statusOptions = [
  "All",
  "Unpaid",
  "Paid",
  "Overdue",
  "Draft"
];

const bulkUpdateFieldOptions = [
  "Order Number",
  "Invoice Date",
  "Due Date",
  "Expected Payment Date",
  "Payment Terms",
  "Customer Notes",
  "Terms & Conditions",
  "Status"
];

const sortByOptions = [
  "Created Time",
  "Last Modified Time",
  "Date",
  "Invoice#",
  "Order Number",
  "Customer Name",
  "Due Date",
  "Amount",
  "Balance Due"
];

const decimalFormatOptions = [
  "1234567.89",
  "1,234,567.89",
  "1234567,89",
  "1.234.567,89"
];

// Skeleton Loader Component - logic inline in table body
export default function Invoices() {
  const navigate = useNavigate();
  const { formatMoney } = useCurrency();
  const { settings } = useSettings();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isInvoiceDropdownOpen, setIsInvoiceDropdownOpen] = useState(false);
  const [selectedView, setSelectedView] = useState("All Invoices");
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [isNewDropdownOpen, setIsNewDropdownOpen] = useState(false);
  const [isDownloadDropdownOpen, setIsDownloadDropdownOpen] = useState(false);
  const [sortSubMenuOpen, setSortSubMenuOpen] = useState(false);
  const [exportSubMenuOpen, setExportSubMenuOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewSearchQuery, setViewSearchQuery] = useState("");
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [activeSortField, setActiveSortField] = useState("Invoice#");
  const [sortConfig, setSortConfig] = useState({ key: "Date", direction: "desc" });
  const isRetainerInvoiceRecord = (invoice: any) => {
    const rawType = String(
      invoice?.invoiceType ||
      invoice?.type ||
      invoice?.documentType ||
      invoice?.module ||
      invoice?.source ||
      ""
    ).toLowerCase();
    const rawNumber = String(invoice?.invoiceNumber || invoice?.number || "").toUpperCase();
    return Boolean(
      invoice?.isRetainerInvoice ||
      invoice?.isRetainer ||
      invoice?.is_retainer ||
      invoice?.retainer ||
      rawType.includes("retainer") ||
      /^RET[-\d]/.test(rawNumber)
    );
  };
  const isDebitNoteRecord = (invoice: any) => {
    const rawType = String(
      invoice?.invoiceType ||
      invoice?.type ||
      invoice?.documentType ||
      invoice?.module ||
      invoice?.source ||
      ""
    ).toLowerCase();
    const rawNumber = String(invoice?.invoiceNumber || invoice?.number || "").toUpperCase();
    return Boolean(
      invoice?.debitNote ||
      invoice?.isDebitNote ||
      invoice?.is_debit_note ||
      rawType.includes("debit") ||
      /^CDN[-\d]/.test(rawNumber)
    );
  };
  const isInvoiceEmailSent = (invoice: any) => {
    const rawStatus = String(invoice?.status || invoice?.emailStatus || "").trim().toLowerCase();
    return Boolean(
      invoice?.emailSent ||
      invoice?.emailSentAt ||
      invoice?.lastEmailSentAt ||
      invoice?.emailedAt ||
      invoice?.sentAt ||
      rawStatus === "sent" ||
      rawStatus === "viewed"
    );
  };
  const stripRetainerInvoices = (records: any[] = []) =>
    (Array.isArray(records) ? records : []).filter((invoice) => !isRetainerInvoiceRecord(invoice));
  const [selectedInvoices, setSelectedInvoices] = useState<Set<string>>(new Set());
  const [hoveredView, setHoveredView] = useState(null);
  const [isFieldCustomizationOpen, setIsFieldCustomizationOpen] = useState(false);
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);
  const [activePreferencesTab, setActivePreferencesTab] = useState("preferences");
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
  const modulePreferences =
    settings?.general?.modules &&
    typeof settings.general.modules === "object" &&
    !Array.isArray(settings.general.modules)
      ? settings.general.modules
      : {};
  const showDebitNoteModule =
    typeof modulePreferences.debitNote === "boolean" ? modulePreferences.debitNote : true;
  const invoiceViews = useMemo(
    () =>
      ALL_INVOICE_VIEWS.filter(
        (view) => view !== "Debit Note" || showDebitNoteModule
      ),
    [showDebitNoteModule]
  );
  const syncPageToUrl = (page: number) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("page", String(page));
    setSearchParams(nextParams, { replace: true });
  };

  const resolveInvoiceStatusParam = (view: string, status: string) => {
    const effectiveStatus = status && status !== "All" ? status.toLowerCase() : undefined;

    if (!view || view === "All Invoices") {
      return effectiveStatus;
    }

    switch (view) {
      case "Draft":
      case "Locked":
      case "Approved":
      case "Void":
      case "Write Off":
        return view.toLowerCase().replace(" ", "_");
      case "Pending Approval":
        return "pending_approval";
      case "Customer Viewed":
        return "customer_viewed";
      case "Partially Paid":
        return "partially paid";
      case "Payment Initiated":
        return "payment_initiated";
      case "Paid":
        return "paid";
      case "Overdue":
        return "overdue";
      case "Unpaid":
      case "Unpaid Invoices":
        return "unpaid";
      case "Debit Note":
        return undefined;
      default:
        return effectiveStatus;
    }
  };

  const invoiceQuery = useQuery({
    queryKey: [
      "invoices",
      currentPage,
      itemsPerPage,
      searchQuery,
      selectedStatus,
      selectedView,
      sortConfig.key,
      sortConfig.direction
    ],
    placeholderData: keepPreviousData,
    staleTime: 30_000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const statusParam = resolveInvoiceStatusParam(selectedView, selectedStatus);
      const response = await getInvoicesPaginated({
        page: currentPage,
        limit: itemsPerPage,
        search: searchQuery,
        sort: sortConfig.key,
        order: sortConfig.direction,
        ...(statusParam ? { status: statusParam } : {})
      });

      return {
        data: stripRetainerInvoices(response.data || []),
        total: response.pagination?.total ?? 0,
        pages: response.pagination?.pages ?? 0
      };
    }
  });

  useEffect(() => {
    if (!invoiceQuery.data) return;
    setInvoices(invoiceQuery.data.data);
    setTotalItems(invoiceQuery.data.total);
    setTotalPages(invoiceQuery.data.pages);
  }, [invoiceQuery.data]);

  useEffect(() => {
    setIsRefreshing(invoiceQuery.isFetching);
  }, [invoiceQuery.isFetching]);

  const refreshData = async () => {
    await invoiceQuery.refetch();
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    syncPageToUrl(page);
  };

  const handlePageSizeChange = (pageSize: number) => {
    setItemsPerPage(pageSize);
    setCurrentPage(1);
    syncPageToUrl(1);
  };

  const [isBulkUpdateModalOpen, setIsBulkUpdateModalOpen] = useState(false);
  const [bulkUpdateField, setBulkUpdateField] = useState("");
  const [bulkUpdateValue, setBulkUpdateValue] = useState("");
  const [bulkUpdateReason, setBulkUpdateReason] = useState("");
  const [isBulkUpdateFieldDropdownOpen, setIsBulkUpdateFieldDropdownOpen] = useState(false);
  const [isBulkUpdateValueDropdownOpen, setIsBulkUpdateValueDropdownOpen] = useState(false);
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const bulkUpdateValueDropdownRef = useRef(null);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showInvoiceInsights, setShowInvoiceInsights] = useState(false);
  const [showSummaryRefresh, setShowSummaryRefresh] = useState(false);
  const [isSummaryRefreshing, setIsSummaryRefreshing] = useState(false);
  const [searchType, setSearchType] = useState("Invoices");
  const invoiceColumnOptions = [
    { key: "date", label: "Date", locked: true, defaultVisible: true },
    { key: "invoiceNumber", label: "Invoice#", locked: true, defaultVisible: true },
    { key: "customerName", label: "Customer Name", locked: true, defaultVisible: true },
    { key: "email", label: "Email", locked: false, defaultVisible: true },
    { key: "status", label: "Status", locked: true, defaultVisible: true },
    { key: "dueDate", label: "Due Date", locked: false, defaultVisible: true },
    { key: "amount", label: "Amount", locked: true, defaultVisible: true },
    { key: "balance", label: "Balance Due", locked: false, defaultVisible: true },
    { key: "location", label: "Location", locked: false, defaultVisible: true },
    { key: "billingAddress", label: "Billing Address", locked: false, defaultVisible: false },
    { key: "billingCity", label: "Billing City", locked: false, defaultVisible: false },
    { key: "billingCode", label: "Billing Code", locked: false, defaultVisible: false },
    { key: "billingCountry", label: "Billing Country", locked: false, defaultVisible: false },
    { key: "billingPhone", label: "Billing Phone", locked: false, defaultVisible: false },
    { key: "billingState", label: "Billing State", locked: false, defaultVisible: false },
    { key: "billingStreet", label: "Billing Street", locked: false, defaultVisible: false },
    { key: "billingStreet2", label: "Billing Street2", locked: false, defaultVisible: false },
    { key: "country", label: "Country", locked: false, defaultVisible: false },
    { key: "createdBy", label: "Created By", locked: false, defaultVisible: false },
    { key: "orderNumber", label: "Order Number", locked: false, defaultVisible: false },
    { key: "phone", label: "Phone", locked: false, defaultVisible: false },
    { key: "projectName", label: "Project Name", locked: false, defaultVisible: false },
    { key: "salesperson", label: "Sales Person", locked: false, defaultVisible: false },
    { key: "shippingAddress", label: "Shipping Address", locked: false, defaultVisible: false },
    { key: "shippingCity", label: "Shipping City", locked: false, defaultVisible: false },
    { key: "shippingCode", label: "Shipping Code", locked: false, defaultVisible: false },
    { key: "shippingCountry", label: "Shipping Country", locked: false, defaultVisible: false },
    { key: "shippingPhone", label: "Shipping Phone", locked: false, defaultVisible: false },
    { key: "shippingState", label: "Shipping State", locked: false, defaultVisible: false },
    { key: "shippingStreet", label: "Shipping Street", locked: false, defaultVisible: false },
    { key: "shippingStreet2", label: "Shipping Street2", locked: false, defaultVisible: false }
  ];
  const lockedInvoiceColumns = invoiceColumnOptions.filter(c => c.locked).map(c => c.key);
  const defaultInvoiceColumns = invoiceColumnOptions.filter(c => c.defaultVisible).map(c => c.key);
  const defaultInvoiceColumnOrder = invoiceColumnOptions.map(c => c.key);
  const normalizeInvoiceColumns = (keys: string[]) => {
    const allKeys = invoiceColumnOptions.map(c => c.key);
    const uniqueKeys = keys.filter((key, index) => allKeys.includes(key) && keys.indexOf(key) === index);
    const lockedKeys = lockedInvoiceColumns.filter(key => !uniqueKeys.includes(key));
    return [...lockedKeys, ...uniqueKeys];
  };
  const normalizeInvoiceColumnOrder = (keys: string[]) => {
    const allKeys = invoiceColumnOptions.map(c => c.key);
    const uniqueKeys = keys.filter((key, index) => allKeys.includes(key) && keys.indexOf(key) === index);
    const missingKeys = allKeys.filter(key => !uniqueKeys.includes(key));
    return [...uniqueKeys, ...missingKeys];
  };
  const [visibleColumns, setVisibleColumns] = useState<string[]>(() => {
    const saved = localStorage.getItem("taban_invoices_columns_v3");
    if (saved) {
      try {
        return normalizeInvoiceColumns(JSON.parse(saved));
      } catch (e) {
        return normalizeInvoiceColumns(defaultInvoiceColumns);
      }
    }
    return normalizeInvoiceColumns(defaultInvoiceColumns);
  });
  const [columnOrder, setColumnOrder] = useState<string[]>(() => {
    const saved = localStorage.getItem("taban_invoices_column_order_v1");
    if (saved) {
      try {
        return normalizeInvoiceColumnOrder(JSON.parse(saved));
      } catch (e) {
        return normalizeInvoiceColumnOrder(defaultInvoiceColumnOrder);
      }
    }
    return normalizeInvoiceColumnOrder(defaultInvoiceColumnOrder);
  });
  const [tempVisibleColumns, setTempVisibleColumns] = useState<string[]>([...visibleColumns]);
  const [tempColumnOrder, setTempColumnOrder] = useState<string[]>([...columnOrder]);
  const [isCustomizeColumnsModalOpen, setIsCustomizeColumnsModalOpen] = useState(false);
  const [columnSearchTerm, setColumnSearchTerm] = useState("");
  const [isHeaderMenuOpen, setIsHeaderMenuOpen] = useState(false);
  const [headerMenuPosition, setHeaderMenuPosition] = useState({ top: 0, left: 0 });
  const [draggedColumnKey, setDraggedColumnKey] = useState<string | null>(null);
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
  const searchTypeDropdownRef = useRef(null);
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const filterDropdownRef = useRef(null);
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
    vendorName: ""
  });
  const [isMarkAsSentModalOpen, setIsMarkAsSentModalOpen] = useState(false);
  const [isDissociateModalOpen, setIsDissociateModalOpen] = useState(false);
  const [isDeleteConfirmModalOpen, setIsDeleteConfirmModalOpen] = useState(false);
  const [isDeletingInvoices, setIsDeletingInvoices] = useState(false);
  const [isExportCurrentViewModalOpen, setIsExportCurrentViewModalOpen] = useState(false);
  const [exportData, setExportData] = useState({
    decimalFormat: "1234567.89",
    fileFormat: "csv",
    password: "",
    showPassword: false
  });
  const [isDecimalFormatDropdownOpen, setIsDecimalFormatDropdownOpen] = useState(false);
  const [activeActionInvoiceId, setActiveActionInvoiceId] = useState(null);
  const [hoveredRowId, setHoveredRowId] = useState<string | null>(null);

  // Share Modal States
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareVisibility, setShareVisibility] = useState("Public");
  const [isVisibilityDropdownOpen, setIsVisibilityDropdownOpen] = useState(false);
  const [linkExpirationDate, setLinkExpirationDate] = useState("");
  const [generatedLink, setGeneratedLink] = useState("");
  const [isLinkGenerated, setIsLinkGenerated] = useState(false);
  const [selectedInvoiceForShare, setSelectedInvoiceForShare] = useState(null);

  const shareModalRef = useRef(null);
  const visibilityDropdownRef = useRef(null);
  const invoiceDropdownRef = useRef(null);
  const decimalFormatDropdownRef = useRef(null);
  const bulkUpdateFieldDropdownRef = useRef(null);
  const statusDropdownRef = useRef(null);
  const moreMenuRef = useRef(null);
  const newDropdownRef = useRef(null);
  const downloadDropdownRef = useRef(null);
  const actionDropdownRef = useRef(null);

  useEffect(() => {
    const statusFromUrl = searchParams.get("status");
    const pageFromUrl = parseInt(searchParams.get("page") || "1", 10) || 1;

    setCurrentPage(pageFromUrl);

    if (statusFromUrl) {
      const statusMap: Record<string, string> = {
        all: "All",
        draft: "Draft",
        unpaid: "Unpaid",
        overdue: "Overdue",
        partially_paid: "Partially Paid",
        customer_viewed: "Customer Viewed",
        approved: "Approved",
        pending_approval: "Pending Approval",
        locked: "Locked",
        paid: "Paid",
        "write_off": "Write Off",
        "payment_initiated": "Payment Initiated",
        "debit_note": "Debit Note"
      };
      setSelectedStatus(statusMap[statusFromUrl] || statusFromUrl);
    }
  }, [searchParams]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (invoiceDropdownRef.current && !invoiceDropdownRef.current.contains(event.target as Node)) {
        setIsInvoiceDropdownOpen(false);
      }
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(event.target as Node)) {
        setIsStatusDropdownOpen(false);
      }
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
        setIsMoreMenuOpen(false);
      }
      if (newDropdownRef.current && !newDropdownRef.current.contains(event.target as Node)) {
        setIsNewDropdownOpen(false);
      }
      if (downloadDropdownRef.current && !downloadDropdownRef.current.contains(event.target as Node)) {
        setIsDownloadDropdownOpen(false);
      }
      if (bulkUpdateFieldDropdownRef.current && !bulkUpdateFieldDropdownRef.current.contains(event.target as Node)) {
        setIsBulkUpdateFieldDropdownOpen(false);
      }
      if (bulkUpdateValueDropdownRef.current && !bulkUpdateValueDropdownRef.current.contains(event.target as Node)) {
        setIsBulkUpdateValueDropdownOpen(false);
      }
      if (decimalFormatDropdownRef.current && !decimalFormatDropdownRef.current.contains(event.target as Node)) {
        setIsDecimalFormatDropdownOpen(false);
      }
      if (actionDropdownRef.current && !actionDropdownRef.current.contains(event.target as Node)) {
        setActiveActionInvoiceId(null);
      }
      if (visibilityDropdownRef.current && !visibilityDropdownRef.current.contains(event.target as Node)) {
        setIsVisibilityDropdownOpen(false);
      }
    };

    if (isInvoiceDropdownOpen || isStatusDropdownOpen || isMoreMenuOpen || isNewDropdownOpen || isDownloadDropdownOpen || isBulkUpdateFieldDropdownOpen || isBulkUpdateValueDropdownOpen || isDecimalFormatDropdownOpen || activeActionInvoiceId || isVisibilityDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isInvoiceDropdownOpen, isStatusDropdownOpen, isMoreMenuOpen, isNewDropdownOpen, isDownloadDropdownOpen, isBulkUpdateFieldDropdownOpen, isBulkUpdateValueDropdownOpen, isDecimalFormatDropdownOpen, activeActionInvoiceId, isVisibilityDropdownOpen]);

  const handleViewSelect = async (view: string) => {
    setIsInvoiceDropdownOpen(false);
    await applyFilters(view, selectedStatus);
  };

  const filteredDefaultViews = invoiceViews.filter(view =>
    view.toLowerCase().includes(viewSearchQuery.toLowerCase())
  );

  const isViewSelected = (view) => {
    return selectedView === view;
  };

  const getInvoiceFieldValue = (inv: Invoice, fieldName: string) => {
    const fieldMap: { [key: string]: any } = {
      "Date": inv.invoiceDate || inv.date || "",
      "Invoice#": (inv as any).invoiceNumber || inv.id || "",
      "Order Number": (inv as any).orderNumber || "",
      "Customer Name": inv.customerName || (inv as any).customer || "",
      "Status": inv.status || "draft",
      "Total Amount": getInvoiceDisplayTotal(inv),
      "Balance Due": (inv as any).balance !== undefined ? (inv as any).balance : ((inv as any).balanceDue !== undefined ? (inv as any).balanceDue : (getInvoiceDisplayTotal(inv) - ((inv as any).amountPaid || 0))),
      "Due Date": (inv as any).dueDate || "",
      "Salesperson": (inv as any).salesperson || ""
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

  const applyFilters = async (view: string, status: string) => {
    const nextStatus = status || "All";
    setSelectedView(view);
    setSelectedStatus(nextStatus);
    setCurrentPage(1);
    syncPageToUrl(1);
  };

  const handleStatusSelect = (status: string) => {
    setIsStatusDropdownOpen(false);
    void applyFilters(selectedView, status);
  };

  const handleCreateNewInvoice = () => {
    navigate("/sales/invoices/new");
  };

  const handleCreateNewRecurringInvoice = () => {
    navigate("/sales/recurring-invoices/new");
  };

  const handleCreateNewCreditNote = () => {
    navigate("/sales/credit-notes/new");
  };

  const handleCreateRetailInvoice = () => {
    navigate("/sales/invoices/new-retail");
  };

  const handleCreateDebitNote = () => {
    navigate("/sales/debit-notes/new");
  };
  const showRetailAndDebitInNewDropdown = false;

  useEffect(() => {
    if (showDebitNoteModule || selectedView !== "Debit Note") return;
    setSelectedView("All Invoices");
    void applyFilters("All Invoices", selectedStatus);
  }, [showDebitNoteModule, selectedStatus, selectedView]);

  const formatCurrency = (amount) => {
    return formatMoney(amount);
  };

  const toNumber = (value: unknown) => {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : 0;
  };

  const getInvoiceDisplayTotal = (invoice: Invoice) => {
    if (invoice?.total !== undefined && invoice?.total !== null) {
      return Number(invoice.total) || 0;
    }
    if (invoice?.amount !== undefined && invoice?.amount !== null) {
      return Number(invoice.amount) || 0;
    }
    const subTotal = Number((invoice as any).subTotal ?? (invoice as any).subtotal ?? 0) || 0;
    const tax = Number((invoice as any).taxAmount ?? (invoice as any).tax ?? 0) || 0;
    const discount = Number((invoice as any).discountAmount ?? (invoice as any).discount ?? 0) || 0;
    const shipping = Number((invoice as any).shippingCharges ?? (invoice as any).shipping ?? 0) || 0;
    const adjustment = Number((invoice as any).adjustment ?? 0) || 0;
    const roundOff = Number((invoice as any).roundOff ?? 0) || 0;
    return subTotal + tax - discount + shipping + adjustment + roundOff;
  };

  const getInvoiceTotalsMeta = (invoiceData: Invoice) => {
    const items = Array.isArray((invoiceData as any)?.items) ? (invoiceData as any).items : [];
    const computedSubTotalFromItems = items.reduce((sum: number, item: any) => {
      if (!item || item.itemType === "header") return sum;
      const qty = toNumber(item.quantity);
      const rate = toNumber(item.rate ?? item.unitPrice ?? item.price);
      const lineAmount = toNumber(item.amount ?? item.total);
      return sum + (lineAmount || qty * rate);
    }, 0);

    const subTotal = toNumber((invoiceData as any)?.subTotal ?? (invoiceData as any)?.subtotal ?? computedSubTotalFromItems);
    let taxAmount = toNumber((invoiceData as any)?.taxAmount ?? (invoiceData as any)?.tax);
    if (!taxAmount && items.length > 0) {
      taxAmount = items.reduce((sum: number, item: any) => {
        if (!item || item.itemType === "header") return sum;
        const qty = toNumber(item.quantity);
        const rate = toNumber(item.rate ?? item.unitPrice ?? item.price);
        const lineAmount = toNumber(item.amount ?? item.total ?? qty * rate);
        const explicitTax = toNumber(item.taxAmount);
        if (explicitTax) return sum + explicitTax;
        const itemTaxRate = toNumber(item.taxRate ?? item.taxPercentage ?? item.salesTaxRate ?? item.tax);
        return sum + (itemTaxRate > 0 ? (lineAmount * itemTaxRate) / 100 : 0);
      }, 0);
    }

    const taxModeLabel = String((invoiceData as any)?.taxExclusive || "Tax Exclusive");
    const isTaxInclusive = taxModeLabel.toLowerCase().includes("inclusive");
    const discountValue = toNumber((invoiceData as any)?.discountAmount ?? (invoiceData as any)?.discount);
    const discountType = String((invoiceData as any)?.discountType || "%").toLowerCase();
    const discountBase = Math.max(0, isTaxInclusive ? (subTotal - taxAmount) : subTotal);
    const discountAmount = discountValue > 0
      ? ((discountType.includes("%") || discountType.includes("percent"))
        ? (discountBase * discountValue) / 100
        : discountValue)
      : 0;

    const shippingCharges = toNumber((invoiceData as any)?.shippingCharges ?? (invoiceData as any)?.shipping);
    const adjustment = toNumber((invoiceData as any)?.adjustment);
    const roundOff = toNumber((invoiceData as any)?.roundOff);
    const total = getInvoiceDisplayTotal(invoiceData);
    const paidAmount = toNumber((invoiceData as any)?.amountPaid ?? (invoiceData as any)?.paidAmount);
    const balance = (invoiceData as any)?.balance !== undefined
      ? toNumber((invoiceData as any)?.balance)
      : (invoiceData as any)?.balanceDue !== undefined
        ? toNumber((invoiceData as any)?.balanceDue)
        : Math.max(0, total - paidAmount);
    const discountRate = discountAmount > 0 && discountBase > 0 ? (discountAmount / discountBase) * 100 : 0;
    const discountLabel = discountAmount > 0 ? `Discount(${discountRate.toFixed(2)}%)` : "Discount";
    const taxLabel = (invoiceData as any)?.taxName || (invoiceData as any)?.taxLabel || "Tax";

    return {
      subTotal,
      taxAmount,
      taxLabel,
      taxModeLabel,
      discountAmount,
      discountBase,
      discountLabel,
      shippingCharges,
      adjustment,
      roundOff,
      total,
      paidAmount,
      balance,
    };
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const formatDateShort = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const formatAddressValue = (address: any) => {
    if (!address) return "-";
    if (typeof address === "string") return address.trim() || "-";
    const parts = [
      address.attention,
      address.street1 || address.addressLine1,
      address.street2 || address.addressLine2,
      address.city,
      address.state,
      address.country,
      address.zipCode || address.postalCode
    ]
      .filter(Boolean)
      .map((part) => String(part).trim())
      .filter((part) => part.length > 0);
    return parts.length ? parts.join(", ") : "-";
  };

  const getDueDays = (invoice: Invoice) => {
    if (!invoice?.dueDate) return "-";
    const dueDate = new Date(invoice.dueDate);
    if (Number.isNaN(dueDate.getTime())) return "-";
    const issuedRaw = invoice.invoiceDate || invoice.date;
    const issuedDate = issuedRaw ? new Date(issuedRaw) : null;
    const start = issuedDate && !Number.isNaN(issuedDate.getTime()) ? issuedDate : new Date();
    const diffMs = dueDate.getTime() - start.getTime();
    return String(Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  };

  const formatSalesperson = (salesperson: any) => {
    if (!salesperson) return "-";
    if (typeof salesperson === "string") return salesperson || "-";
    return salesperson.name || salesperson.displayName || salesperson.fullName || "-";
  };

  const getInvoiceStatusTextDisplay = (invoice: Invoice) => {
    let rawStatus = String(invoice?.status || "").trim().toLowerCase();
    const dueDateValue = invoice?.dueDate ? new Date(invoice.dueDate) : null;
    const hasValidDueDate = dueDateValue instanceof Date && !Number.isNaN(dueDateValue.getTime());
    const diffDays = hasValidDueDate
      ? Math.ceil((dueDateValue!.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : null;
    
    // Dynamically adjust status based on payments/balance if not draft/void
    const balanceDue = Number(invoice.balance !== undefined ? invoice.balance : (invoice.balanceDue || 0));
    const totalAmount = Number(invoice.total !== undefined ? invoice.total : (getInvoiceDisplayTotal ? getInvoiceDisplayTotal(invoice) : 0));
    
    if (rawStatus !== "draft" && rawStatus !== "void") {
      if (balanceDue <= 0 && totalAmount > 0) {
        rawStatus = "paid";
      } else if (balanceDue < totalAmount && balanceDue > 0 && totalAmount > 0) {
        rawStatus = "partially_paid";
      }
    }

    const isOverdueByDate = Boolean(
      hasValidDueDate &&
      dueDateValue!.getTime() < Date.now() &&
      balanceDue > 0 &&
      rawStatus !== "paid" &&
      rawStatus !== "draft" &&
      rawStatus !== "void"
    );

    if (rawStatus === "paid") {
      return { text: "PAID", className: "text-green-600" };
    }
    if (rawStatus === "partially_paid" || rawStatus === "partially paid") {
      return { text: "PARTIALLY PAID", className: "text-blue-600" };
    }
    if (rawStatus === "draft") {
      return { text: "DRAFT", className: "text-slate-400" };
    }
    if (rawStatus === "pending" || rawStatus === "pending approval") {
      return { text: "PENDING", className: "text-amber-500" };
    }
    if (rawStatus === "sent" || rawStatus === "unpaid" || rawStatus === "viewed") {
      if (hasValidDueDate && diffDays !== null) {
        if (diffDays < 0) {
          return {
            text: `OVERDUE BY ${Math.max(1, Math.abs(diffDays))} DAYS`,
            className: "text-orange-500",
          };
        }
        if (diffDays === 0) {
          return { text: "DUE TODAY", className: "text-blue-500" };
        }
        return { text: `DUE IN ${diffDays} DAYS`, className: "text-blue-500" };
      }
      return { text: "PENDING", className: "text-amber-500" };
    }
    if (rawStatus === "void") {
      return { text: "VOID", className: "text-slate-400" };
    }
    if (rawStatus === "overdue" || isOverdueByDate) {
      const overdueDays = hasValidDueDate
        ? Math.max(1, Math.ceil((Date.now() - dueDateValue!.getTime()) / (1000 * 60 * 60 * 24)))
        : 0;
      return {
        text: overdueDays > 0 ? `OVERDUE BY ${overdueDays} DAYS` : "OVERDUE",
        className: "text-orange-500",
      };
    }

    const fallback = getInvoiceStatusDisplay(invoice).text || "DRAFT";
    return { text: fallback.toUpperCase(), className: "text-slate-400" };
  };

  const renderInvoiceCell = (invoice: Invoice, colKey: string) => {
    switch (colKey) {
      case "date":
        return <span className="text-gray-900">{formatDate(invoice.invoiceDate || invoice.date)}</span>;
      case "invoiceNumber":
        return (
          <div className="flex items-center gap-1.5">
            <span
              className="text-blue-600 hover:text-blue-800 font-medium cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/sales/invoices/${invoice.id}`);
              }}
            >
              {invoice.invoiceNumber || invoice.id}
            </span>
            {isInvoiceEmailSent(invoice) && (
              <div title="Sent by Email" className="p-0.5 rounded text-slate-500">
                <Mail size={12} />
              </div>
            )}
            {isDebitNoteRecord(invoice) && (
              <div title="Debit Note" className="p-0.5 rounded text-slate-400">
                <FileText size={12} />
              </div>
            )}
            {((invoice as any).isRecurringInvoice || (invoice as any).recurringProfileId) && (
              <div title="Generated from Recurring Profile" className="p-0.5 bg-blue-50 text-blue-600 rounded">
                <RefreshCw size={12} />
              </div>
            )}
          </div>
        );
      case "orderNumber":
        return <span className="text-gray-900">{invoice.orderNumber || "-"}</span>;
      case "customerName":
        return (
          <span className="text-gray-900">
            {invoice.customerName || invoice.customer?.displayName || invoice.customer?.companyName || (typeof invoice.customer === 'string' ? invoice.customer : "-")}
          </span>
        );
      case "status":
        const statusDisplay = getInvoiceStatusTextDisplay(invoice);
        return <span className={`text-[13px] font-medium ${statusDisplay.className}`}>{statusDisplay.text}</span>;
      case "dueDate":
        return <span className="text-gray-900">{formatDate(invoice.dueDate)}</span>;
      case "amount":
        return <span className="text-gray-900">{formatMoney(getInvoiceDisplayTotal(invoice))}</span>;
      case "balance":
        return <span className="text-gray-900">{formatMoney(invoice.balance !== undefined ? invoice.balance : (invoice.balanceDue || 0))}</span>;
      case "location":
        return <span className="text-gray-900">{(invoice as any).location || (invoice as any).selectedLocation || "Head Office"}</span>;
      case "adjustment":
        return <span className="text-gray-900">{formatMoney((invoice as any).adjustment || 0)}</span>;
      case "billingAddress":
        return (
          <span className="text-gray-900">
            {formatAddressValue((invoice as any).billingAddress || (invoice as any).customer?.billingAddress)}
          </span>
        );
      case "billingCity":
        return <span className="text-gray-900">{(invoice as any).billingAddress?.city || (invoice as any).customer?.billingAddress?.city || "-"}</span>;
      case "billingCode":
        return <span className="text-gray-900">{(invoice as any).billingAddress?.zip || (invoice as any).billingAddress?.postalCode || (invoice as any).customer?.billingAddress?.zip || (invoice as any).customer?.billingAddress?.postalCode || "-"}</span>;
      case "billingCountry":
        return <span className="text-gray-900">{(invoice as any).billingAddress?.country || (invoice as any).customer?.billingAddress?.country || "-"}</span>;
      case "billingPhone":
        return <span className="text-gray-900">{(invoice as any).billingPhone || (invoice as any).customer?.billingPhone || (invoice as any).customer?.workPhone || "-"}</span>;
      case "billingState":
        return <span className="text-gray-900">{(invoice as any).billingAddress?.state || (invoice as any).customer?.billingAddress?.state || "-"}</span>;
      case "billingStreet":
        return <span className="text-gray-900">{(invoice as any).billingAddress?.street || (invoice as any).billingAddress?.address || (invoice as any).customer?.billingAddress?.street || (invoice as any).customer?.billingAddress?.address || "-"}</span>;
      case "billingStreet2":
        return <span className="text-gray-900">{(invoice as any).billingAddress?.street2 || (invoice as any).addressStreet2 || (invoice as any).customer?.billingAddress?.street2 || "-"}</span>;
      case "crmPotentialName":
        return <span className="text-gray-900">{(invoice as any).crmPotentialName || (invoice as any).customer?.crmPotentialName || "-"}</span>;
      case "companyName":
        return <span className="text-gray-900">{(invoice as any).customer?.companyName || (invoice as any).companyName || "-"}</span>;
      case "country":
        return (
          <span className="text-gray-900">
            {(invoice as any).country ||
              (invoice as any).customer?.billingAddress?.country ||
              (invoice as any).customer?.shippingAddress?.country ||
              "-"}
          </span>
        );
      case "createdBy":
        return (
          <span className="text-gray-900">
            {(invoice as any).createdByName ||
              (invoice as any).createdBy?.name ||
              (invoice as any).createdBy?.displayName ||
              (typeof (invoice as any).createdBy === "string" ? (invoice as any).createdBy : "-")}
          </span>
        );
      case "dueDays":
        return <span className="text-gray-900">{getDueDays(invoice)}</span>;
      case "email":
        return <span className="text-gray-900">{invoice.customerEmail || (invoice as any).customer?.email || "-"}</span>;
      case "expectedPaymentDate":
        return <span className="text-gray-900">{formatDate((invoice as any).expectedPaymentDate) || "-"}</span>;
      case "invoiceType":
        return <span className="text-gray-900">{(invoice as any).type || "Standard"}</span>;
      case "issuedDate":
        return <span className="text-gray-900">{formatDate((invoice as any).invoiceDate || (invoice as any).date) || "-"}</span>;
      case "phone":
        return <span className="text-gray-900">{(invoice as any).phone || (invoice as any).customer?.workPhone || (invoice as any).customer?.mobile || "-"}</span>;
      case "projectName":
        return <span className="text-gray-900">{(invoice as any).projectName || "-"}</span>;
      case "salesperson":
        return <span className="text-gray-900">{formatSalesperson((invoice as any).salesperson)}</span>;
      case "shippingAddress":
        return (
          <span className="text-gray-900">
            {formatAddressValue((invoice as any).shippingAddress || (invoice as any).customer?.shippingAddress)}
          </span>
        );
      case "shippingCity":
        return <span className="text-gray-900">{(invoice as any).shippingAddress?.city || (invoice as any).customer?.shippingAddress?.city || "-"}</span>;
      case "shippingCode":
        return <span className="text-gray-900">{(invoice as any).shippingAddress?.zip || (invoice as any).shippingAddress?.postalCode || (invoice as any).customer?.shippingAddress?.zip || (invoice as any).customer?.shippingAddress?.postalCode || "-"}</span>;
      case "shippingCountry":
        return <span className="text-gray-900">{(invoice as any).shippingAddress?.country || (invoice as any).customer?.shippingAddress?.country || "-"}</span>;
      case "shippingPhone":
        return <span className="text-gray-900">{(invoice as any).shippingPhone || (invoice as any).customer?.shippingPhone || (invoice as any).customer?.mobile || "-"}</span>;
      case "shippingState":
        return <span className="text-gray-900">{(invoice as any).shippingAddress?.state || (invoice as any).customer?.shippingAddress?.state || "-"}</span>;
      case "shippingStreet":
        return <span className="text-gray-900">{(invoice as any).shippingAddress?.street || (invoice as any).shippingAddress?.address || (invoice as any).customer?.shippingAddress?.street || (invoice as any).customer?.shippingAddress?.address || "-"}</span>;
      case "shippingStreet2":
        return <span className="text-gray-900">{(invoice as any).shippingAddress?.street2 || (invoice as any).customer?.shippingAddress?.street2 || "-"}</span>;
      default:
        return null;
    }
  };

  const handleSelectInvoice = (invoiceId: string) => {
    setSelectedInvoices(prev => {
      const newSet = new Set(prev);
      if (newSet.has(invoiceId)) {
        newSet.delete(invoiceId);
      } else {
        newSet.add(invoiceId);
      }
      return newSet;
    });
  };

  const handleSelectAllInvoices = () => {
    if (selectedInvoices.size === sortedInvoices.length) {
      setSelectedInvoices(new Set());
    } else {
      setSelectedInvoices(new Set(sortedInvoices.map(inv => inv.id)));
    }
  };

  const handleBulkUpdate = () => {
    setIsBulkUpdateModalOpen(true);
  };

  const buildBulkUpdatePayload = (field: string, value: string) => {
    const trimmedValue = String(value ?? "").trim();
    switch (field) {
      case "Order Number":
        return { orderNumber: trimmedValue };
      case "Invoice Date":
        return { date: trimmedValue, invoiceDate: trimmedValue };
      case "Due Date":
        return { dueDate: trimmedValue };
      case "Expected Payment Date":
        return { expectedPaymentDate: trimmedValue };
      case "Payment Terms":
        return { paymentTerms: trimmedValue };
      case "Customer Notes":
        return { notes: trimmedValue, customerNotes: trimmedValue };
      case "Terms & Conditions":
        return { terms: trimmedValue, termsAndConditions: trimmedValue };
      case "Status": {
        const normalized = trimmedValue.toLowerCase().replace(/\s+/g, " ").trim();
        const statusMap: Record<string, string> = {
          "draft": "draft",
          "sent": "sent",
          "viewed": "viewed",
          "customer viewed": "customer_viewed",
          "partially paid": "partially paid",
          "paid": "paid",
          "overdue": "overdue",
          "void": "void",
          "pending approval": "pending_approval",
          "approved": "approved",
          "locked": "locked"
        };
        return { status: statusMap[normalized] || normalized };
      }
      default:
        return {};
    }
  };

  const handleBulkUpdateSubmit = async () => {
    if (!bulkUpdateField || !bulkUpdateValue.trim()) {
      toast("Please select a field and enter new information");
      return;
    }
    if (!bulkUpdateReason.trim()) {
      toast("Please enter a reason for bulk updating invoices");
      return;
    }
    if (selectedInvoices.size === 0) {
      toast("Please select at least one invoice");
      return;
    }

    const basePayload = buildBulkUpdatePayload(bulkUpdateField, bulkUpdateValue);
    if (Object.keys(basePayload).length === 0) {
      toast("Selected field is not supported for bulk update.");
      return;
    }

    const selectedIds = Array.from(selectedInvoices);
    setIsBulkUpdating(true);
    try {
      const results = await Promise.allSettled(
        selectedIds.map((invoiceId) =>
          updateInvoice(invoiceId, basePayload as any)
        )
      );

      const successCount = results.filter((r) => r.status === "fulfilled").length;
      const failedCount = results.length - successCount;

      if (failedCount > 0) {
        results.forEach((result, index) => {
          if (result.status === "rejected") {
            // console.error(`[Bulk Update] Failed for invoice ${selectedIds[index]}:`, result.reason);
          }
        });
      }

      await applyFilters(selectedView, selectedStatus);
      setIsBulkUpdateModalOpen(false);
      setBulkUpdateField("");
      setBulkUpdateValue("");
      setBulkUpdateReason("");
      setSelectedInvoices(new Set());

      if (failedCount === 0) {
        toast(`Updated ${successCount} invoice(s) successfully.`);
      } else {
        toast(`Updated ${successCount} invoice(s). ${failedCount} invoice(s) failed to update.`);
      }
    } catch (error) {
      // console.error("Error during bulk update:", error);
      toast("Failed to bulk update invoices. Please try again.");
    } finally {
      setIsBulkUpdating(false);
    }
  };

  // Function to get options for dropdown fields
  const getFieldOptions = (field) => {
    switch (field) {
      case "Payment Terms":
        return ["Due on Receipt", "Net 15", "Net 30", "Net 45", "Net 60", "Net 90"];
      case "Status":
        return ["Draft", "Sent", "Viewed", "Partially Paid", "Paid", "Overdue", "Void"];
      default:
        return [];
    }
  };

  // Function to render the appropriate input based on selected field
  const renderBulkUpdateValueInput = () => {
    const fieldOptions = getFieldOptions(bulkUpdateField);

    if (fieldOptions.length > 0) {
      // Render dropdown for fields with options
      return (
        <div className="flex flex-col relative" ref={bulkUpdateValueDropdownRef}>
          <div
            className="flex items-center justify-between px-4 py-2 border border-gray-300 rounded-md bg-white text-gray-700 cursor-pointer hover:bg-gray-50 transition-colors"
            onClick={() => setIsBulkUpdateValueDropdownOpen(!isBulkUpdateValueDropdownOpen)}
          >
            <span>{bulkUpdateValue || "Select an option"}</span>
            <ChevronDown size={16} />
          </div>
          {isBulkUpdateValueDropdownOpen && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-[300px] overflow-y-auto">
              {fieldOptions.map((option) => (
                <div
                  key={option}
                  className="px-4 py-2.5 text-sm text-gray-700 cursor-pointer hover:bg-blue-600 hover:text-white transition-colors"
                  onClick={() => {
                    setBulkUpdateValue(option);
                    setIsBulkUpdateValueDropdownOpen(false);
                  }}
                >
                  {option}
                </div>
              ))}
            </div>
          )}
        </div>
      );
    } else if (bulkUpdateField === "Invoice Date" || bulkUpdateField === "Due Date" || bulkUpdateField === "Expected Payment Date") {
      // Render date input
      return (
        <input
          type="date"
          className="w-full px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#156372]"
          value={bulkUpdateValue}
          onChange={(e) => setBulkUpdateValue(e.target.value)}
        />
      );
    } else if (bulkUpdateField === "Customer Notes" || bulkUpdateField === "Terms & Conditions") {
      // Render textarea for addresses and notes
      return (
        <textarea
          className="w-full px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#156372] resize-y min-h-[80px]"
          value={bulkUpdateValue}
          onChange={(e) => setBulkUpdateValue(e.target.value)}
          placeholder="Enter information"
        />
      );
    } else {
      // Render text input for other fields
      return (
        <input
          type="text"
          className="w-full px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#156372]"
          value={bulkUpdateValue}
          onChange={(e) => setBulkUpdateValue(e.target.value)}
          placeholder="Enter information"
        />
      );
    }
  };

  const formatCurrencyNumber = (amount) => {
    return formatMoney(amount).replace(/[^0-9.,]/g, '');
  };

  const escapeHtml = (value: unknown) =>
    String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");

  const generateInvoicePaperHTML = (invoice: Invoice) => {
    const invoiceDate = invoice.invoiceDate || invoice.date || new Date().toISOString();
    const formattedDate = formatDateShort(invoiceDate);
    const dueDate = invoice.dueDate ? formatDateShort(invoice.dueDate) : formattedDate;
    const customerName =
      invoice.customerName ||
      (typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.displayName || invoice.customer?.companyName) ||
      "N/A";
    const totalsMeta = getInvoiceTotalsMeta(invoice);
    const notes = invoice.customerNotes || (invoice as any).notes || "";
    const items = Array.isArray(invoice.items) ? invoice.items : [];

    const itemsHTML = items.length
      ? items
        .map((item: any, index: number) => {
          const quantity = Number(item.quantity ?? 0);
          const rate = Number(item.rate ?? item.unitPrice ?? item.price ?? 0);
          const amount = Number(item.amount ?? item.total ?? (quantity * rate));
          const unit = item.unit || item.unitName || "pcs";
          const itemName =
            item.itemDetails ||
            item.name ||
            item.description ||
            item.item?.name ||
            item.itemName ||
            "N/A";

          return `
            <tr>
              <td class="col-number">${index + 1}</td>
              <td class="col-item">${escapeHtml(itemName)}</td>
              <td class="col-qty">${quantity.toFixed(2)} ${escapeHtml(unit)}</td>
              <td class="col-rate">${rate.toFixed(2)}</td>
              <td class="col-amount">${amount.toFixed(2)}</td>
            </tr>
          `;
        })
        .join("")
      : '<tr><td colspan="5" style="text-align:center;color:#6b7280;">No items</td></tr>';

    const paymentMadeRow = totalsMeta.paidAmount > 0
      ? `
        <tr>
          <td>Payment Made</td>
          <td>(-) ${escapeHtml(formatCurrency(totalsMeta.paidAmount))}</td>
        </tr>
      `
      : "";

    return `
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        .invoice-container {
          width: 794px;
          min-height: 1123px;
          background: #fff;
          padding: 38px 46px;
          font-family: Arial, sans-serif;
          color: #1f2937;
        }
        .header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 24px;
        }
        .company-info h1 {
          font-size: 24px;
          letter-spacing: 0.4px;
          margin-bottom: 10px;
        }
        .company-info p {
          font-size: 13px;
          line-height: 1.5;
          color: #4b5563;
        }
        .invoice-info {
          text-align: right;
        }
        .invoice-info h2 {
          font-size: 46px;
          font-weight: 500;
          letter-spacing: 1px;
          margin-bottom: 4px;
          color: #111827;
        }
        .invoice-number {
          font-size: 20px;
          margin-bottom: 14px;
        }
        .balance-due-label {
          font-size: 14px;
          color: #6b7280;
          margin-bottom: 3px;
        }
        .balance-due {
          font-size: 30px;
          font-weight: 700;
          color: #111827;
        }
        .details {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 28px;
          margin: 8px 0 26px;
        }
        .bill-to h3 {
          font-size: 14px;
          text-transform: uppercase;
          color: #6b7280;
          margin-bottom: 8px;
        }
        .bill-to p {
          font-size: 16px;
          font-weight: 600;
        }
        .invoice-details p {
          display: flex;
          justify-content: space-between;
          gap: 14px;
          font-size: 14px;
          margin-bottom: 7px;
        }
        .invoice-details p span {
          color: #6b7280;
        }
        table.items-table {
          width: 100%;
          border-collapse: collapse;
          margin: 14px 0 20px;
        }
        .items-table thead {
          background-color: #2f3640;
          color: #fff;
        }
        .items-table th {
          padding: 11px;
          text-align: left;
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
        }
        .items-table td {
          padding: 11px;
          border-bottom: 1px solid #e5e7eb;
          font-size: 13px;
        }
        .col-number { width: 7%; }
        .col-item { width: 48%; }
        .col-qty { width: 15%; }
        .col-rate { width: 15%; }
        .col-amount { width: 15%; text-align: right; }
        .summary {
          display: flex;
          justify-content: flex-end;
          margin-top: 6px;
        }
        .summary-table {
          width: 340px;
          border-collapse: collapse;
        }
        .summary-table td {
          padding: 8px 0;
          font-size: 14px;
          border-bottom: 1px solid #e5e7eb;
        }
        .summary-table tr.note td {
          border-bottom: none;
          padding-top: 0;
          color: #6b7280;
          font-size: 12px;
        }
        .summary-table tr.total-line td {
          font-weight: 700;
        }
        .summary-table td:last-child {
          text-align: right;
        }
        .summary-table tr.total td {
          font-size: 20px;
          font-weight: 700;
          border-bottom: none;
          padding-top: 14px;
        }
        .notes {
          margin-top: 30px;
          border-top: 1px solid #e5e7eb;
          padding-top: 14px;
        }
        .notes h3 {
          font-size: 14px;
          margin-bottom: 8px;
        }
        .notes p {
          font-size: 13px;
          color: #4b5563;
          line-height: 1.6;
        }
      </style>
      <div class="invoice-container">
        <div class="header">
          <div class="company-info">
            <h1>TABAN ENTERPRISES</h1>
            <p>mogadishu 00252</p>
          </div>
          <div class="invoice-info">
            <h2>INVOICE</h2>
            <div class="invoice-number"># ${escapeHtml(invoice.invoiceNumber || invoice.id)}</div>
            <div class="balance-due-label">Balance Due</div>
            <div class="balance-due">${escapeHtml(formatCurrency(totalsMeta.balance))}</div>
          </div>
        </div>

        <div class="details">
          <div class="bill-to">
            <h3>Bill To</h3>
            <p>${escapeHtml(customerName)}</p>
          </div>
          <div class="invoice-details">
            <p><span>Invoice Date :</span> <strong>${escapeHtml(formattedDate)}</strong></p>
            <p><span>Terms :</span> <strong>${escapeHtml((invoice as any).paymentTerms || "Due on Receipt")}</strong></p>
            <p><span>Due Date :</span> <strong>${escapeHtml(dueDate)}</strong></p>
            ${invoice.orderNumber ? `<p><span>P.O.# :</span> <strong>${escapeHtml(invoice.orderNumber)}</strong></p>` : ""}
          </div>
        </div>

        <table class="items-table">
          <thead>
            <tr>
              <th class="col-number">#</th>
              <th class="col-item">Item & Description</th>
              <th class="col-qty">Qty</th>
              <th class="col-rate">Rate</th>
              <th class="col-amount">Amount</th>
            </tr>
          </thead>
          <tbody>${itemsHTML}</tbody>
        </table>

        <div class="summary">
          <table class="summary-table">
            <tr>
              <td>Sub Total</td>
              <td>${escapeHtml(formatCurrency(totalsMeta.subTotal))}</td>
            </tr>
            <tr class="note">
              <td colspan="2">(${escapeHtml(totalsMeta.taxModeLabel)})</td>
            </tr>
            ${totalsMeta.discountAmount > 0 ? `
            <tr>
              <td>${escapeHtml(totalsMeta.discountLabel)}</td>
              <td>(-) ${escapeHtml(formatCurrency(totalsMeta.discountAmount))}</td>
            </tr>
            <tr class="note">
              <td colspan="2">(Applied on ${escapeHtml(formatCurrency(totalsMeta.discountBase))})</td>
            </tr>
            ` : ""}
            ${totalsMeta.taxAmount > 0 ? `
            <tr>
              <td>${escapeHtml(totalsMeta.taxLabel)}</td>
              <td>${escapeHtml(formatCurrency(totalsMeta.taxAmount))}</td>
            </tr>
            ` : ""}
            ${totalsMeta.shippingCharges !== 0 ? `
            <tr>
              <td>Shipping charge</td>
              <td>${escapeHtml(formatCurrency(totalsMeta.shippingCharges))}</td>
            </tr>
            ` : ""}
            ${totalsMeta.adjustment !== 0 ? `
            <tr>
              <td>Adjustment</td>
              <td>${escapeHtml(formatCurrency(totalsMeta.adjustment))}</td>
            </tr>
            ` : ""}
            ${totalsMeta.roundOff !== 0 ? `
            <tr>
              <td>Round Off</td>
              <td>${escapeHtml(formatCurrency(totalsMeta.roundOff))}</td>
            </tr>
            ` : ""}
            <tr class="total-line">
              <td>Total</td>
              <td>${escapeHtml(formatCurrency(totalsMeta.total))}</td>
            </tr>
            ${paymentMadeRow}
            <tr class="total">
              <td>BALANCE DUE</td>
              <td>${escapeHtml(formatCurrency(totalsMeta.balance))}</td>
            </tr>
          </table>
        </div>

        ${notes ? `
          <div class="notes">
            <h3>Notes</h3>
            <p>${escapeHtml(notes)}</p>
          </div>
        ` : ""}
      </div>
    `;
  };

  const exportInvoicesToPdf = async (invoiceList: Invoice[], fileName: string) => {
    const pdf = new jsPDF("p", "mm", "a4");
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 10;
    const printableWidth = pageWidth - (margin * 2);
    const printableHeight = pageHeight - (margin * 2);

    for (let i = 0; i < invoiceList.length; i++) {
      const invoice = invoiceList[i];
      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = generateInvoicePaperHTML(invoice);
      tempDiv.style.position = "absolute";
      tempDiv.style.left = "-9999px";
      tempDiv.style.top = "0";
      tempDiv.style.background = "#ffffff";
      tempDiv.style.width = "794px";
      document.body.appendChild(tempDiv);

      try {
        await new Promise((resolve) => setTimeout(resolve, 250));

        const canvas = await html2canvas(tempDiv, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: "#ffffff",
          scrollX: 0,
          scrollY: 0,
          width: tempDiv.scrollWidth,
          height: tempDiv.scrollHeight,
          windowWidth: tempDiv.scrollWidth,
          windowHeight: tempDiv.scrollHeight,
        });

        if (i > 0) {
          pdf.addPage();
        }

        const imgData = canvas.toDataURL("image/png");
        const imgHeight = (canvas.height * printableWidth) / canvas.width;
        let heightLeft = imgHeight;
        let yPosition = margin;

        pdf.addImage(imgData, "PNG", margin, yPosition, printableWidth, imgHeight);
        heightLeft -= printableHeight;

        while (heightLeft > 0.01) {
          pdf.addPage();
          yPosition = margin - (imgHeight - heightLeft);
          pdf.addImage(imgData, "PNG", margin, yPosition, printableWidth, imgHeight);
          heightLeft -= printableHeight;
        }
      } finally {
        document.body.removeChild(tempDiv);
      }
    }

    pdf.save(fileName);
  };

  const handleDownloadPDF = async (singleInvoice = null) => {
    if (!singleInvoice && selectedInvoices.size === 0) return;
    if (isGeneratingPdf) return;

    setIsDownloadDropdownOpen(false);
    setIsGeneratingPdf(true);

    try {
      const invoiceIds = singleInvoice ? [singleInvoice.id] : Array.from(selectedInvoices);
      const detailedInvoices = await Promise.all(
        invoiceIds.map(async (invoiceId) => {
          try {
            return await getInvoiceById(invoiceId);
          } catch (error) {
            // console.error(`Error fetching invoice ${invoiceId} for PDF:`, error);
            return invoices.find((inv) => inv.id === invoiceId) || null;
          }
        })
      );

      const validInvoices = detailedInvoices.filter((inv): inv is Invoice => Boolean(inv));
      if (validInvoices.length === 0) {
        toast("No invoices found to download.");
        return;
      }

      const today = new Date().toISOString().split("T")[0];
      const fileName = validInvoices.length === 1
        ? `${String(validInvoices[0].invoiceNumber || validInvoices[0].id || "Invoice").replace(/[\\/:*?\"<>|]/g, "_")}.pdf`
        : `Invoices-${today}.pdf`;

      await exportInvoicesToPdf(validInvoices, fileName);
    } catch (error) {
      // console.error("Error generating invoice PDF:", error);
      toast("Failed to download PDF. Please try again.");
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleExportAllInvoices = () => {
    setIsMoreMenuOpen(false);

    // Export all invoices as CSV
    const allInvoiceData = invoices;

    if (allInvoiceData.length === 0) {
      toast("No invoices to export");
      return;
    }

    // Create CSV content
    const headers = ['Date', 'Invoice #', 'Order Number', 'Customer', 'Status', 'Due Date', 'Amount', 'Balance Due'];
    const csvRows = [
      headers.join(','),
      ...allInvoiceData.map(inv => [
        formatDate(inv.invoiceDate || inv.date),
        inv.invoiceNumber || inv.id,
        inv.orderNumber || "-",
        `"${(inv.customer || "-").replace(/"/g, '""')}"`,
        inv.status ? inv.status.charAt(0).toUpperCase() + inv.status.slice(1) : "Draft",
        formatDate(inv.dueDate),
        formatMoney(getInvoiceDisplayTotal(inv)),
        formatMoney(inv.balanceDue || inv.balance || 0)
      ].join(','))
    ];

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `all_invoices_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportCurrentView = () => {
    setIsMoreMenuOpen(false);
    setIsExportCurrentViewModalOpen(true);
  };

  const getExportInvoiceRows = (invoiceList: Invoice[]) => {
    return invoiceList.map((inv) => ({
      Date: formatDate(inv.invoiceDate || inv.date),
      "Invoice #": inv.invoiceNumber || inv.id,
      "Order Number": inv.orderNumber || "-",
      Customer: inv.customerName || (inv as any).customer || "-",
      Status: inv.status ? inv.status.charAt(0).toUpperCase() + inv.status.slice(1) : "Draft",
      "Due Date": formatDate(inv.dueDate),
      Amount: formatMoney(getInvoiceDisplayTotal(inv)),
      "Balance Due": formatMoney(inv.balanceDue || inv.balance || 0),
    }));
  };

  const downloadCurrentViewAsCSV = (rows: Array<Record<string, string>>, filename: string) => {
    if (!rows.length) return;

    const headers = Object.keys(rows[0]);
    const csvRows = [
      headers.join(","),
      ...rows.map((row) =>
        headers
          .map((key) => {
            const value = String(row[key] ?? "").replace(/"/g, '""');
            return `"${value}"`;
          })
          .join(",")
      ),
    ];

    const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
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

  const downloadCurrentViewAsExcel = (
    rows: Array<Record<string, string>>,
    filename: string,
    format: "xls" | "xlsx"
  ) => {
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Invoices");
    XLSX.writeFile(workbook, filename, { bookType: format });
  };

  const handleExportSubmit = () => {
    const rows = getExportInvoiceRows(invoices);
    if (rows.length === 0) {
      toast("No invoices available in the current view.");
      return;
    }

    const datePart = new Date().toISOString().split("T")[0];
    const baseName = `invoices-current-view-${datePart}`;
    const selectedFormat = (exportData.fileFormat || "csv").toLowerCase();

    if (selectedFormat === "csv") {
      downloadCurrentViewAsCSV(rows, `${baseName}.csv`);
    } else if (selectedFormat === "xls") {
      downloadCurrentViewAsExcel(rows, `${baseName}.xls`, "xls");
    } else {
      downloadCurrentViewAsExcel(rows, `${baseName}.xlsx`, "xlsx");
    }

    if (exportData.password?.trim()) {
      toast("File password protection is not supported for this export in the current build.");
    }

    setIsExportCurrentViewModalOpen(false);
    setExportData({
      decimalFormat: "1234567.89",
      fileFormat: "csv",
      password: "",
      showPassword: false
    });
  };

  const handleTogglePasswordVisibility = () => {
    setExportData(prev => ({ ...prev, showPassword: !prev.showPassword }));
  };

  const handleMarkAsPaid = () => {
    setIsMarkAsSentModalOpen(true);
  };

  const handleShare = async (invoice) => {
    if (!invoice) return;

    // Get full invoice details
    const invoiceDataResult = getInvoiceById(invoice.id);
    const invoiceData = invoiceDataResult instanceof Promise ? await invoiceDataResult : invoiceDataResult;
    if (!invoiceData) return;

    setSelectedInvoiceForShare(invoiceData);

    // Calculate default expiration date (90 days from invoice due date or 90 days from today)
    let defaultExpiryDate;
    if ((invoiceData as any).dueDate) {
      defaultExpiryDate = new Date((invoiceData as any).dueDate);
      defaultExpiryDate.setDate(defaultExpiryDate.getDate() + 90);
    } else {
      defaultExpiryDate = new Date();
      defaultExpiryDate.setDate(defaultExpiryDate.getDate() + 90);
    }

    // Format as DD/MM/YYYY
    const day = String(defaultExpiryDate.getDate()).padStart(2, '0');
    const month = String(defaultExpiryDate.getMonth() + 1).padStart(2, '0');
    const year = defaultExpiryDate.getFullYear();
    const formattedDate = `${day}/${month}/${year}`;

    setLinkExpirationDate(formattedDate);
    setGeneratedLink("");
    setIsLinkGenerated(false);
    setShowShareModal(true);
  };

  const handleGenerateLink = () => {
    if (!linkExpirationDate) {
      toast("Please select an expiration date");
      return;
    }

    // Generate a secure link similar to the invoice share link
    const baseUrl = "https://zohosecurepay.com/books/tabanenterprises/secure";
    const invoiceId = selectedInvoiceForShare?.id || selectedInvoiceForShare?.invoiceNumber || Date.now();
    // Generate a long secure token (128 characters like in the example)
    const token = Array.from(crypto.getRandomValues(new Uint8Array(64)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    // Format: CInvoiceID=invoiceId-token (matching the example format)
    const secureLink = `${baseUrl}?CInvoiceID=${invoiceId}-${token}`;
    setGeneratedLink(secureLink);
    setIsLinkGenerated(true);
  };

  const handleCopyLink = () => {
    if (generatedLink) {
      navigator.clipboard.writeText(generatedLink).then(() => {
        toast("Invoice link copied to clipboard");
        setShowShareModal(false);
      }).catch(() => {
        toast("Unable to copy link. Please copy manually: " + generatedLink);
      });
    }
  };

  const handleDisableAllActiveLinks = () => {
    if (window.confirm("Are you sure you want to disable all active links for this invoice?")) {
      setGeneratedLink("");
      setIsLinkGenerated(false);
      toast("All active links have been disabled.");
    }
  };

  const handleConfirmMarkAsPaid = async () => {
    try {
      let updatedCount = 0;
      let skippedCount = 0;
      let failedCount = 0;
      const selectedInvoiceIds = Array.from(selectedInvoices);

      const normalizeStatus = (status: any): string => {
        const normalized = String(status || "draft").toLowerCase().trim();
        if (normalized === "unpaid") return "sent";
        if (normalized === "customer viewed" || normalized === "customer_viewed") return "viewed";
        if (normalized === "partially_paid") return "partially paid";
        return normalized;
      };

      // Process sequentially so status transitions happen in a predictable order.
      for (const invoiceId of selectedInvoiceIds) {
        const invoice = invoices.find((inv) => inv.id === invoiceId);
        if (!invoice) {
          failedCount++;
          continue;
        }

        const currentStatus = normalizeStatus(invoice.status);

        if (currentStatus === "paid" || currentStatus === "void") {
          skippedCount++;
          continue;
        }

        try {
          // Backend requires draft -> sent -> paid (draft -> paid is invalid).
          if (currentStatus === "draft") {
            await updateInvoice(invoiceId, { status: "sent" } as any);
          }

          await updateInvoice(invoiceId, { status: "paid" } as any);
          updatedCount++;
        } catch (error) {
          console.error(`[MarkAsPaid] Failed to update invoice ${invoiceId}:`, error);
          failedCount++;
        }
      }

      // Refresh the invoices list
      await invoiceQuery.refetch();

      setIsMarkAsSentModalOpen(false);
      setSelectedInvoices(new Set());

      if (failedCount === 0 && skippedCount === 0 && updatedCount > 0) {
        toast(`Marked ${updatedCount} invoice(s) as paid successfully`);
      } else if (updatedCount > 0) {
        toast(`Marked ${updatedCount} invoice(s) as paid. Skipped: ${skippedCount}. Failed: ${failedCount}.`);
      } else {
        toast("No invoices were updated. Selected invoices may already be marked as paid.");
      }
    } catch (error) {
      toast("Failed to mark invoices as paid. Please try again.");
    }
  };

  const handleDissociateSalesOrders = () => {
    setIsDissociateModalOpen(true);
  };

  const handleDissociateConfirm = () => {
    // TODO: Implement dissociate sales orders
    // console.log("Dissociate sales orders:", Array.from(selectedInvoices));
    setIsDissociateModalOpen(false);
    // Show the warning modal after attempting to dissociate
    // In a real implementation, this would check if some invoices couldn't be dissociated
    setSelectedInvoices(new Set());
  };

  const handleLearnMore = () => {
    // TODO: Navigate to help/documentation page
    window.open('https://help.zohobooks.com', '_blank');
  };

  // Sort invoices
  const sortedInvoices = useMemo(() => {
    const liveInvoices = invoiceQuery.data ? invoiceQuery.data.data : invoices;
    if (!Array.isArray(liveInvoices)) return [];

    const uniqueInvoices = Array.from(new Map(liveInvoices.map(invoice => [invoice.id, invoice])).values());
    return uniqueInvoices.sort((a, b) => {
      let aValue, bValue;

      switch (sortConfig.key) {
        case "Created Time":
          aValue = new Date((a as any).createdTime || a.createdAt || 0);
          bValue = new Date((b as any).createdTime || b.createdAt || 0);
          break;
        case "Last Modified Time":
          aValue = new Date(a.lastModifiedTime || a.updatedAt || 0);
          bValue = new Date(b.lastModifiedTime || b.updatedAt || 0);
          break;
        case "Date":
          aValue = new Date(a.invoiceDate || a.date || 0);
          bValue = new Date(b.invoiceDate || b.date || 0);
          break;
        case "Invoice#":
          aValue = (a.invoiceNumber || a.id || "").toLowerCase();
          bValue = (b.invoiceNumber || b.id || "").toLowerCase();
          break;
        case "Order Number":
          aValue = (a.orderNumber || "").toLowerCase();
          bValue = (b.orderNumber || "").toLowerCase();
          break;
        case "Customer Name":
          aValue = (a.customerName || a.customer || "").toLowerCase();
          bValue = (b.customerName || b.customer || "").toLowerCase();
          break;
        case "Due Date":
          aValue = new Date(a.dueDate || 0);
          bValue = new Date(b.dueDate || 0);
          break;
        case "Amount":
          aValue = getInvoiceDisplayTotal(a);
          bValue = getInvoiceDisplayTotal(b);
          break;
        case "Balance Due":
          aValue = parseFloat(String(a.balanceDue || (getInvoiceDisplayTotal(a) - (a.amountPaid || 0)) || 0));
          bValue = parseFloat(String(b.balanceDue || (getInvoiceDisplayTotal(b) - (b.amountPaid || 0)) || 0));
          break;
        default:
          aValue = (a.invoiceNumber || a.id || "").toLowerCase();
          bValue = (b.invoiceNumber || b.id || "").toLowerCase();
          break;
      }

      if (typeof aValue === "string") {
        return sortConfig.direction === "asc"
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      } else {
        return sortConfig.direction === "asc"
          ? aValue - bValue
          : bValue - aValue;
      }
    });
  }, [invoiceQuery.data?.data, invoices, sortConfig]);
  const hasInvoices = sortedInvoices.length > 0;

  const paymentSummary = useMemo(() => {
    const safeInvoices = Array.isArray(sortedInvoices) ? sortedInvoices : [];
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date(startOfToday);
    endOfToday.setDate(endOfToday.getDate() + 1);
    const withinThirtyDays = new Date(startOfToday);
    withinThirtyDays.setDate(withinThirtyDays.getDate() + 30);

    let totalOutstandingReceivables = 0;
    let dueToday = 0;
    let dueWithin30Days = 0;
    let overdueInvoice = 0;
    let paidDiffDaysTotal = 0;
    let paidDiffDaysCount = 0;

    safeInvoices.forEach((invoice) => {
      const totalAmount = Number(getInvoiceDisplayTotal(invoice)) || 0;
      const paidAmount = Number((invoice as any)?.amountPaid || 0) || 0;
      const balanceDueRaw = (invoice as any)?.balance !== undefined
        ? Number((invoice as any)?.balance)
        : (invoice as any)?.balanceDue !== undefined
          ? Number((invoice as any)?.balanceDue)
          : totalAmount - paidAmount;
      const balanceDue = Number.isFinite(balanceDueRaw) ? Math.max(0, balanceDueRaw) : 0;
      const dueDate = (invoice as any)?.dueDate ? new Date((invoice as any).dueDate) : null;
      const hasValidDueDate = dueDate instanceof Date && !Number.isNaN(dueDate.getTime());

      if (balanceDue > 0) {
        totalOutstandingReceivables += balanceDue;
        if (hasValidDueDate) {
          if (dueDate! >= startOfToday && dueDate! < endOfToday) dueToday += balanceDue;
          if (dueDate! > endOfToday && dueDate! <= withinThirtyDays) dueWithin30Days += balanceDue;
          if (dueDate! < startOfToday) overdueInvoice += balanceDue;
        }
      }

      const isPaid = String((invoice as any)?.status || "").toLowerCase() === "paid" || (totalAmount > 0 && balanceDue <= 0);
      if (!isPaid) return;
      const invoiceDateRaw = (invoice as any)?.invoiceDate || (invoice as any)?.date || (invoice as any)?.createdAt;
      const paidDateRaw = (invoice as any)?.paymentDate || (invoice as any)?.paidDate || (invoice as any)?.lastPaymentDate || (invoice as any)?.updatedAt;
      if (!invoiceDateRaw || !paidDateRaw) return;
      const invoiceDate = new Date(invoiceDateRaw);
      const paidDate = new Date(paidDateRaw);
      if (Number.isNaN(invoiceDate.getTime()) || Number.isNaN(paidDate.getTime())) return;
      const diffDays = Math.max(0, Math.round((paidDate.getTime() - invoiceDate.getTime()) / (1000 * 60 * 60 * 24)));
      paidDiffDaysTotal += diffDays;
      paidDiffDaysCount += 1;
    });

    return {
      totalOutstandingReceivables,
      dueToday,
      dueWithin30Days,
      overdueInvoice,
      averageDaysForGettingPaid: paidDiffDaysCount > 0 ? paidDiffDaysTotal / paidDiffDaysCount : 0,
    };
  }, [sortedInvoices]);

  const outstandingPercent = paymentSummary.totalOutstandingReceivables > 0
    ? Math.round((paymentSummary.overdueInvoice / paymentSummary.totalOutstandingReceivables) * 100)
    : 0;
  const analyzedOnLabel = new Date().toLocaleString("en-GB", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  const handleSort = (field) => {
    setActiveSortField(field);
    setSortConfig(prev => ({
      key: field,
      direction: prev.key === field && prev.direction === "asc" ? "desc" : "asc"
    }));
  };

  const handleRefreshList = async () => {
    await invoiceQuery.refetch();
    setIsMoreMenuOpen(false);
  };

  const handleSummaryRefresh = async () => {
    setIsSummaryRefreshing(true);
    try {
      await invoiceQuery.refetch();
    } catch (error) {
      console.error("Error refreshing payment summary:", error);
    } finally {
      setIsSummaryRefreshing(false);
    }
  };

  const handleResetColumnWidth = () => {
    // TODO: Implement reset column width
    // console.log("Reset column width");
    setIsMoreMenuOpen(false);
  };

  const handleDelete = async () => {
    if (selectedInvoices.size === 0) {
      toast("Please select at least one invoice.");
      return;
    }
    setIsDeleteConfirmModalOpen(true);
  };

  const confirmDeleteInvoices = async () => {
    if (selectedInvoices.size === 0) {
      setIsDeleteConfirmModalOpen(false);
      return;
    }

    const invoiceIds = Array.from(selectedInvoices);
    setIsDeletingInvoices(true);
    try {
      await Promise.all(invoiceIds.map((invoiceId) => deleteInvoice(invoiceId)));
      await applyFilters(selectedView, selectedStatus);
      setSelectedInvoices(new Set());
      setIsDeleteConfirmModalOpen(false);
      toast(`${invoiceIds.length} invoice(s) deleted successfully.`);
    } catch (error) {
      console.error("Failed to delete invoices:", error);
      toast.error("Failed to delete invoices. Please try again.");
    } finally {
      setIsDeletingInvoices(false);
    }
  };

  const handleMarkAsPaidAction = () => {
    if (selectedInvoices.size === 0) {
      toast("Please select at least one invoice.");
      return;
    }
    setIsMarkAsSentModalOpen(true);
  };

  // const handleDissociateSalesOrders = () => {
  //   // Placeholder
  //   toast("Dissociate Sales Orders functionality is not yet implemented.");
  // };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-white">
      {isGeneratingPdf && (
        <div className="fixed top-5 right-5 z-[1200] flex items-center gap-2 px-4 py-2 rounded-md bg-white border border-gray-200 shadow-lg text-sm text-gray-700">
          <RefreshCw size={16} className="animate-spin text-[#156372]" />
          Generating PDF...
        </div>
      )}

        {selectedInvoices.size > 0 ? (
          /* Bulk Action Header */
          <div className="flex-none flex items-center justify-between px-6 py-6 border-b border-gray-100 bg-white relative overflow-visible z-[100]">
            <div className="flex min-w-0 flex-1 items-center gap-3 pl-4 pr-2 overflow-visible">
              <div className="flex min-w-0 flex-wrap items-center gap-2 sm:gap-3">
              <button
                type="button"
                onClick={handleBulkUpdate}
                className="h-9 px-3 rounded-md border border-gray-200 bg-white text-sm text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
                title="Bulk Update"
              >
                Bulk Update
              </button>

              <div className="relative" ref={downloadDropdownRef}>
                <button
                  type="button"
                  onClick={() => {
                    if (!isGeneratingPdf) setIsDownloadDropdownOpen(!isDownloadDropdownOpen);
                  }}
                  className={`h-9 px-3 rounded-md border border-gray-200 bg-white text-sm text-gray-700 hover:bg-gray-50 transition-colors shadow-sm flex items-center gap-2 ${isGeneratingPdf ? "opacity-60 cursor-not-allowed" : ""}`}
                  title="Export Options"
                  disabled={isGeneratingPdf}
                >
                  {isGeneratingPdf ? <RefreshCw size={14} className="animate-spin" /> : <Download size={16} className="text-gray-500" />}
                  <span>Export PDF</span>
                  <ChevronDown size={14} className="text-gray-400" />
                </button>
                {isDownloadDropdownOpen && (
                  <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 min-w-[180px] py-1">
                    <button
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      onClick={() => {
                        handleDownloadPDF();
                        setIsDownloadDropdownOpen(false);
                      }}
                    >
                      Download as PDF
                    </button>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={handleMarkAsPaidAction}
                className="h-9 px-3 rounded-md border border-gray-200 bg-white text-sm text-gray-700 hover:bg-gray-50 transition-colors shadow-sm flex items-center gap-2"
              >
                Mark As Paid
              </button>

              <button
                type="button"
                onClick={handleDelete}
                className="h-9 px-3 rounded-md border border-gray-200 bg-white text-sm text-red-600 hover:bg-red-50 transition-colors shadow-sm flex items-center gap-2"
              >
                <Trash2 size={16} className="text-red-500" />
                <span>Delete</span>
              </button>

              </div>

              <div className="h-6 w-px bg-gray-200 mx-1 flex-shrink-0" />

              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="flex items-center justify-center min-w-[28px] h-7 px-2 bg-[#156372] rounded-full text-[13px] font-semibold text-white">
                  {selectedInvoices.size}
                </span>
                <span className="text-sm text-gray-700">Selected</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSelectedInvoices(new Set())}
              className="p-2 text-gray-400 hover:text-gray-600 cursor-pointer"
              title="Clear Selection"
            >
              <X size={20} />
            </button>
          </div>
        ) : (
          /* Normal Header */
          <div className="flex-none flex items-center justify-between px-6 py-6 border-b border-gray-100 bg-white relative overflow-visible">
            <div className="flex items-center gap-8 pl-4">
              <div className="relative" ref={invoiceDropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsInvoiceDropdownOpen((prev) => !prev)}
                  className="flex items-center gap-1.5 py-4 cursor-pointer group border-b-2 border-slate-900 -mb-[1px] bg-transparent outline-none"
                >
                  <span className="text-[15px] font-bold text-slate-900 transition-colors">{selectedView}</span>
                  <ChevronDown
                    size={14}
                    className={`transition-transform duration-200 text-[#156372] ${isInvoiceDropdownOpen ? "rotate-180" : ""}`}
                  />
                </button>

                {isInvoiceDropdownOpen && (
                  <div className="absolute top-full left-0 mt-1 w-72 bg-white border border-gray-200 rounded-lg shadow-2xl z-[100] py-2">
                    <div className="px-3 pb-2 border-b border-gray-100">
                      <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-md border border-gray-200">
                        <Search size={14} className="text-gray-400" />
                        <input
                          placeholder="Search Views"
                          className="bg-transparent border-none outline-none text-sm w-full"
                          value={viewSearchQuery}
                          onChange={(e) => setViewSearchQuery(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="max-h-80 overflow-y-auto py-1">
                      {filteredDefaultViews.map((view) => (
                        <button
                          key={view}
                          type="button"
                          onClick={() => handleViewSelect(view)}
                          className="w-full flex items-center justify-between px-4 py-2 text-sm hover:bg-teal-50 transition-colors"
                        >
                          <span className={isViewSelected(view) ? "font-semibold text-teal-700" : "text-slate-700"}>
                            {view}
                          </span>
                          {isViewSelected(view) && <CheckCircle size={14} className="text-[#156372]" />}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 sm:gap-2 mr-4">
              <button
                onClick={handleCreateNewInvoice}
                className="cursor-pointer transition-all text-white px-3 sm:px-4 py-1.5 rounded-lg border-[#0D4A52] border-b-[4px] hover:brightness-110 hover:-translate-y-[1px] hover:border-b-[6px] active:border-b-[2px] active:brightness-90 active:translate-y-[2px] flex items-center gap-1 text-sm font-semibold"
                style={{ background: "linear-gradient(90deg, #156372 0%, #0D4A52 100%)" }}
                type="button"
              >
                <Plus size={16} strokeWidth={3} />
                <span className="hidden sm:inline">New</span>
              </button>

              <div className="relative" ref={moreMenuRef}>
                <button
                  type="button"
                  onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
                  className="p-1.5 border border-gray-200 rounded hover:bg-gray-50 transition-colors bg-white shadow-sm"
                  title="More Actions"
                >
                  <MoreHorizontal size={18} className="text-gray-500" />
                </button>
                {isMoreMenuOpen && (
                  <div className="absolute top-full right-0 mt-1 w-64 bg-white border border-gray-100 rounded-lg shadow-xl py-2 z-[110]">
                    <div className="relative">
                      <button
                        onClick={() => {
                          setSortSubMenuOpen((prev) => !prev);
                          setExportSubMenuOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 text-sm transition-colors ${sortSubMenuOpen ? "text-white rounded-md mx-2 w-[calc(100%-16px)] shadow-sm" : "text-slate-600 hover:bg-[#1b5e6a] hover:text-white"
                          }`}
                        style={sortSubMenuOpen ? { backgroundColor: "#1b5e6a" } : {}}
                        type="button"
                      >
                        <div className="flex items-center gap-3">
                          <ArrowUpDown size={15} className={sortSubMenuOpen ? "text-white" : ""} />
                          <span className="font-medium">Sort by</span>
                        </div>
                        <ChevronRight size={14} className={sortSubMenuOpen ? "text-white" : "text-slate-400"} />
                      </button>
                      {sortSubMenuOpen && (
                        <div className="absolute top-0 right-full mr-2 w-64 bg-white border border-gray-100 rounded-lg shadow-xl py-2 z-[120]">
                          {sortByOptions.map((option) => (
                            <button
                              key={option}
                              onClick={() => {
                                handleSort(option);
                                setSortSubMenuOpen(false);
                                setIsMoreMenuOpen(false);
                              }}
                              className={`w-full text-left px-4 py-2 text-sm transition-colors ${activeSortField === option
                                ? "bg-[#1b5e6a] text-white font-semibold"
                                : "text-slate-600 hover:bg-teal-50"
                                }`}
                              type="button"
                            >
                              {option}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => {
                        navigate("/sales/invoices/import");
                        setIsMoreMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-600 hover:bg-[#1b5e6a] hover:text-white transition-colors"
                      type="button"
                    >
                      <Download size={15} />
                      <span className="font-medium">Import Invoices</span>
                    </button>

                    <div className="relative">
                      <button
                        onClick={() => {
                          setExportSubMenuOpen((prev) => !prev);
                          setSortSubMenuOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 text-sm transition-colors ${exportSubMenuOpen ? "text-white rounded-md mx-2 w-[calc(100%-16px)] shadow-sm" : "text-slate-600 hover:bg-[#1b5e6a] hover:text-white"
                          }`}
                        style={exportSubMenuOpen ? { backgroundColor: "#1b5e6a" } : {}}
                        type="button"
                      >
                        <div className="flex items-center gap-3">
                          <Upload size={15} className={exportSubMenuOpen ? "text-white" : ""} />
                          <span className="font-medium">Export</span>
                        </div>
                        <ChevronRight size={14} className={exportSubMenuOpen ? "text-white" : "text-slate-400"} />
                      </button>
                      {exportSubMenuOpen && (
                        <div className="absolute top-0 right-full mr-2 w-56 bg-white border border-gray-100 rounded-lg shadow-xl py-2 z-[120]">
                          <button
                            className="w-full text-left px-4 py-2 text-sm text-slate-600 hover:bg-[#1b5e6a] hover:text-white transition-colors"
                            onClick={() => {
                              handleExportAllInvoices();
                              setExportSubMenuOpen(false);
                              setIsMoreMenuOpen(false);
                            }}
                            type="button"
                          >
                            Export Invoices
                          </button>
                          <button
                            className="w-full text-left px-4 py-2 text-sm text-slate-600 hover:bg-[#1b5e6a] hover:text-white transition-colors"
                            onClick={() => {
                              handleExportCurrentView();
                              setExportSubMenuOpen(false);
                              setIsMoreMenuOpen(false);
                            }}
                            type="button"
                          >
                            Export Current View
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="h-px bg-gray-100 my-1 mx-2" />

                    <button
                      onClick={() => {
                        navigate("/settings/invoices");
                        setIsMoreMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-600 hover:bg-[#1b5e6a] hover:text-white transition-colors"
                      type="button"
                    >
                      <Settings size={15} />
                      <span className="font-medium">Preferences</span>
                    </button>

                    <button
                      onClick={() => {
                        refreshData();
                        setIsMoreMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-600 hover:bg-[#1b5e6a] hover:text-white transition-colors"
                      type="button"
                    >
                      <RefreshCw size={15} />
                      <span className="font-medium">Refresh List</span>
                    </button>

                    <button
                      onClick={() => {
                        handleResetColumnWidth();
                        setIsMoreMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-600 hover:bg-[#1b5e6a] hover:text-white transition-colors"
                      type="button"
                    >
                      <RotateCcw size={15} />
                      <span className="font-medium">Reset Column Width</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

      {/* Content Area */}
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-white">
        <div className="flex-none px-6 pt-0 pb-4">
          {!showInvoiceInsights ? (
            <div className="rounded-md border border-[#e6e9f2] bg-[#f1f4fa] px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[12px] font-semibold uppercase tracking-wide text-[#7b8494]">Payment Summary</p>
                <button
                  type="button"
                  onClick={() => setShowInvoiceInsights(true)}
                  className="text-[12px] font-medium text-[#156372] hover:text-[#0d4a52]"
                >
                  View Insights
                </button>
              </div>
              <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <div
                  className="flex items-center gap-3"
                  onMouseEnter={() => setShowSummaryRefresh(true)}
                  onMouseLeave={() => setShowSummaryRefresh(false)}
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f5c77f] text-[#7b4d00]">
                    <ArrowDownLeft size={14} />
                  </span>
                  <div>
                    <p className="text-[12px] text-[#5f6b7b]">Total Outstanding Receivables</p>
                    {isSummaryRefreshing ? (
                      <div className="mt-1 h-6 w-24 rounded bg-[#e9edf5] animate-pulse" />
                    ) : (
                      <div className="flex items-center gap-2">
                        <p className="text-[20px] leading-[1] font-medium text-[#111827]">{formatMoney(paymentSummary.totalOutstandingReceivables)}</p>
                        {showSummaryRefresh && (
                          <button
                            type="button"
                            onClick={handleSummaryRefresh}
                            className="inline-flex items-center gap-1 text-[12px] text-[#2f6fed]"
                          >
                            <RefreshCw size={12} className={isSummaryRefreshing ? "animate-spin" : ""} />
                            Refresh
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-[12px] text-[#5f6b7b]">Due Today</p>
                  {isSummaryRefreshing ? (
                    <div className="mt-1 h-6 w-20 rounded bg-[#e9edf5] animate-pulse" />
                  ) : (
                    <p className="text-[20px] leading-[1] font-medium text-[#111827]">{formatMoney(paymentSummary.dueToday)}</p>
                  )}
                </div>
                <div>
                  <p className="text-[12px] text-[#5f6b7b]">Due Within 30 Days</p>
                  {isSummaryRefreshing ? (
                    <div className="mt-1 h-6 w-24 rounded bg-[#e9edf5] animate-pulse" />
                  ) : (
                    <p className="text-[20px] leading-[1] font-medium text-[#111827]">{formatMoney(paymentSummary.dueWithin30Days)}</p>
                  )}
                </div>
                <div>
                  <p className="text-[12px] text-[#5f6b7b]">Overdue Invoice</p>
                  {isSummaryRefreshing ? (
                    <div className="mt-1 h-6 w-24 rounded bg-[#e9edf5] animate-pulse" />
                  ) : (
                    <p className="text-[20px] leading-[1] font-medium text-[#111827]">{formatMoney(paymentSummary.overdueInvoice)}</p>
                  )}
                </div>
                <div>
                  <p className="text-[12px] text-[#5f6b7b]">Average No. of Days for Getting Paid</p>
                  {isSummaryRefreshing ? (
                    <div className="mt-1 h-6 w-20 rounded bg-[#e9edf5] animate-pulse" />
                  ) : (
                    <p className="text-[20px] leading-[1] font-medium text-[#111827]">{Math.round(paymentSummary.averageDaysForGettingPaid)} Days</p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-md border border-[#e6e9f2] bg-[#f1f4fa] px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-[12px] font-semibold text-[#111827]">I've analyzed your invoices and here are a few actionable insights for you.</p>
                <div className="flex items-center gap-3 text-[12px] text-[#111827]">
                  <span>Last Analyzed On: {analyzedOnLabel}</span>
                  <span className="h-4 w-px bg-[#d8dce6]" />
                  <button
                    type="button"
                    onClick={() => setShowInvoiceInsights(false)}
                    className="text-[12px] text-[#3467f6] hover:underline"
                  >
                    Hide Invoicing Insights
                  </button>
                </div>
              </div>
              <ul className="mt-2 space-y-1.5 text-[12px] text-[#111827]">
                <li>- <span className="text-[#f97316] font-semibold">{formatMoney(paymentSummary.overdueInvoice)}</span> is overdue, which is <span className="font-semibold">{outstandingPercent}%</span> of your total unpaid invoices.</li>
                <li>- <span className="text-[#f97316] font-semibold">{formatMoney(paymentSummary.totalOutstandingReceivables)}</span> worth of invoices remain unpaid from customers who've made <span className="font-semibold">{Math.max(0, 100 - outstandingPercent)}%</span> of their past invoice payments after the due date.</li>
                <li>- <span className="text-[#f97316] font-semibold">{formatMoney(paymentSummary.overdueInvoice)}</span> worth of overdue invoices have exceeded your average late payment duration of <span className="font-semibold">{Math.round(paymentSummary.averageDaysForGettingPaid)} days</span>.</li>
              </ul>
            </div>
          )}
        </div>

        <div className="flex-1 min-h-0 overflow-hidden">
        {!hasInvoices && !isRefreshing ? (
          <div className="flex h-full flex-col items-center justify-center overflow-auto py-16 text-center">
            {/* Video Thumbnail */}
            <div className="relative w-full max-w-md mb-8">
              <div className="relative w-full aspect-video bg-gradient-to-br from-[#156372] to-purple-600 rounded-lg overflow-hidden">
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <button className="flex items-center justify-center w-16 h-16 bg-white bg-opacity-20 rounded-full cursor-pointer hover:bg-opacity-30 transition-all">
                    <Play size={24} fill="#ffffff" />
                  </button>
                  <div className="mt-6 flex flex-col items-center">
                    <div className="flex items-center justify-center w-12 h-12 bg-white rounded-full mb-2">
                      <span className="text-[#156372] font-bold text-lg">TB</span>
                    </div>
                    <div className="text-white font-semibold">Taban Books</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Headline */}
            <h2 className="text-3xl font-bold text-gray-900 mb-4">It's time to get paid!</h2>

            {/* Description */}
            <p className="text-gray-600 mb-8 max-w-md">
              We don't want to boast too much, but sending amazing invoices and getting paid is easier than ever. Go ahead! Try it yourself.
            </p>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 mb-6">
              <button
                className="px-6 py-3 bg-gradient-to-r from-[#156372] to-[#0D4A52] text-white rounded-md font-semibold cursor-pointer hover:opacity-90 transition-all shadow-md"
                onClick={handleCreateNewInvoice}
              >
                NEW INVOICE
              </button>
              <button
                className="px-6 py-3 bg-gradient-to-r from-[#156372] to-[#0D4A52] text-white rounded-md font-semibold cursor-pointer hover:opacity-90 transition-all shadow-md"
                onClick={handleCreateNewRecurringInvoice}
              >
                NEW RECURRING INVOICE
              </button>
            </div>

            {/* Import Link */}
            <button className="text-[#156372] hover:text-blue-700 text-sm font-medium cursor-pointer mb-12">
              Import Invoices
            </button>

            {/* Life Cycle Section */}
            <div className="w-full max-w-2xl">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Life cycle of an Invoice</h3>
              <div className="bg-gray-100 rounded-lg p-8 min-h-[200px]">
                {/* Lifecycle steps will be displayed here */}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex h-full min-h-0 flex-col bg-white">
            <div className="flex-1 min-h-0 overflow-auto">
              <table className="w-full text-left border-collapse">
              <thead className="bg-[#f6f7fb] sticky top-0 z-[110] border-b border-[#e6e9f2]">
            <tr className="text-[10px] font-semibold text-[#7b8494] uppercase tracking-wider">
              <th className="px-4 py-3 w-16 min-w-[64px] bg-[#f6f7fb]">
                <div className="flex items-center gap-2 relative">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setTempVisibleColumns([...visibleColumns]);
                      setTempColumnOrder([...columnOrder]);
                      setIsCustomizeColumnsModalOpen(true);
                    }}
                    className="h-6 w-6 flex items-center justify-center rounded border border-gray-200 bg-white hover:bg-gray-50 transition-colors"
                    title="Manage columns"
                    aria-label="Manage columns"
                  >
                    <SlidersHorizontal size={13} style={{ color: "#156372" }} />
                  </button>
                  <div className="h-5 w-px bg-gray-200" />
                  <input
                    type="checkbox"
                    checked={selectedInvoices.size === sortedInvoices.length && sortedInvoices.length > 0}
                    onChange={handleSelectAllInvoices}
                    style={{ accentColor: "#1b5e6a" }}
                    className="w-4 h-4 rounded border-gray-300 cursor-pointer transition-all focus:ring-0"
                  />
                </div>
              </th>
              {visibleColumns.map((colKey) => {
                const col = invoiceColumnOptions.find(c => c.key === colKey);
                if (!col) return null;
                const isSortable = colKey === "invoiceNumber" || colKey === "date" || colKey === "amount" || colKey === "balanceDue" || colKey === "dueDate";

                return (
                  <th
                    key={colKey}
                    className="px-4 py-3 text-left relative group/header cursor-pointer select-none"
                    onClick={() => isSortable ? handleSort(col.label) : undefined}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <span className={`truncate font-semibold ${/tax/i.test(colKey) ? 'text-black' : 'text-[#7b8494]'}`}>{col.label}</span>
                        {isSortable && activeSortField === col.label && (
                          <ArrowUpDown
                            size={10}
                            className="flex-shrink-0 transition-colors text-[#156372]"
                          />
                        )}
                      </div>
                    </div>
                  </th>
                );
              })}
              <th className="px-4 py-3 w-12 sticky right-0 bg-[#f6f7fb] z-20">
                <div className="flex items-center justify-center">
                  <Search
                    size={14}
                    className="text-gray-300 cursor-pointer transition-colors hover:opacity-80"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsSearchModalOpen(true);
                    }}
                  />
                </div>
              </th>
            </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {isRefreshing ? (
                  Array(5).fill(0).map((_, index) => (
                    <tr key={`skeleton-${index}`} className="animate-pulse border-b border-[#eef1f6] h-[50px]">
                      <td className="px-4 py-3 w-16">
                        <div className="h-4 w-4 bg-gray-100 rounded mx-auto" />
                      </td>
                      {visibleColumns.map((colKey) => (
                        <td key={`${index}-${colKey}`} className="px-4 py-3">
                          <div className="h-4 bg-gray-100 rounded w-24" />
                        </td>
                      ))}
                      <td className="px-4 py-3 w-12 sticky right-0 bg-white/95 backdrop-blur-sm" />
                    </tr>
                  ))
                ) : (
                  sortedInvoices.map((invoice) => {
                    const isSelected = selectedInvoices.has(invoice.id);
                    return (
                      <tr
                        key={invoice.id}
                        onMouseEnter={() => setHoveredRowId(invoice.id)}
                        onMouseLeave={() => {
                          if (activeActionInvoiceId !== invoice.id) {
                            setHoveredRowId(null);
                          }
                        }}
                        onClick={(e) => {
                          const target = e.target as HTMLElement;
                          if (target.closest('.invoice-checkbox') || target.closest('.invoice-action-button') || target.closest('.invoice-edit-button')) {
                            return;
                          }
                          navigate(`/sales/invoices/${invoice.id}`);
                        }}
                        className="text-[13px] h-[50px] group transition-all border-b border-[#eef1f6] cursor-pointer hover:bg-[#f8fafc]"
                        style={isSelected ? { backgroundColor: "#1b5e6a1A" } : {}}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="h-6 w-6 shrink-0" aria-hidden />
                            <span className="h-5 w-px shrink-0 bg-transparent" aria-hidden />
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleSelectInvoice(invoice.id)}
                              onClick={(e) => e.stopPropagation()}
                              className="invoice-checkbox w-4 h-4 rounded border-gray-300 cursor-pointer focus:ring-0"
                              style={{ accentColor: "#1b5e6a" }}
                            />
                          </div>
                        </td>
                        {visibleColumns.map((colKey) => (
                          <td key={`${invoice.id}-${colKey}`} className="px-4 py-3">
                            {renderInvoiceCell(invoice, colKey)}
                          </td>
                        ))}
                      <td className="px-4 py-3 sticky right-0 bg-white/95 backdrop-blur-sm group-hover:bg-[#f8fafc] transition-colors w-12">
                        <div className="flex items-center justify-center relative">
                          {(hoveredRowId === invoice.id || activeActionInvoiceId === invoice.id) && (
                            <button
                              className="invoice-action-button flex items-center justify-center w-6 h-6 bg-white border border-gray-200 rounded-full cursor-pointer transition-all hover:bg-gray-50 shadow-sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveActionInvoiceId(activeActionInvoiceId === invoice.id ? null : invoice.id);
                              }}
                              title="Actions"
                            >
                              <ChevronDown size={14} className="text-slate-500" />
                            </button>
                          )}

                          {activeActionInvoiceId === invoice.id && (
                            <div
                              ref={actionDropdownRef}
                              className="absolute right-0 top-9 w-56 bg-white border border-gray-200 rounded-lg shadow-xl z-[200] overflow-hidden"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="flex flex-col py-1">
                                <button
                                  className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-slate-700 text-left transition-colors hover:bg-slate-50"
                                  onClick={() => {
                                    setActiveActionInvoiceId(null);
                                    navigate(`/sales/invoices/${invoice.id}/edit`);
                                  }}
                                >
                                  <Pencil size={16} className="text-slate-500" />
                                  Edit
                                </button>

                                <button
                                  className={`flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-colors ${isGeneratingPdf ? "text-gray-400 cursor-not-allowed" : "text-slate-700 hover:bg-slate-50"}`}
                                  onClick={() => {
                                    if (isGeneratingPdf) return;
                                    setActiveActionInvoiceId(null);
                                    handleDownloadPDF(invoice);
                                  }}
                                  disabled={isGeneratingPdf}
                                >
                                  {isGeneratingPdf ? (
                                    <RefreshCw size={16} className="animate-spin" />
                                  ) : (
                                    <FileText size={16} className="text-slate-500" />
                                  )}
                                  {isGeneratingPdf ? "Generating PDF..." : "Download PDF"}
                                </button>

                                <button
                                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-left text-slate-700 transition-colors hover:bg-slate-50"
                                  onClick={() => {
                                    setActiveActionInvoiceId(null);
                                    navigate(`/sales/invoices/${invoice.id}/email`);
                                  }}
                                >
                                  <Mail size={16} className="text-slate-500" />
                                  Send Email
                                </button>

                                <button
                                  className="flex items-center gap-3 px-4 py-2.5 my-1 mx-2 rounded border border-slate-200 bg-white text-sm font-medium text-slate-700 text-left transition-colors hover:bg-slate-50"
                                  onClick={() => {
                                    setActiveActionInvoiceId(null);
                                    navigate(`/payments/payments-received/new`, { state: { invoiceId: invoice.id } });
                                  }}
                                >
                                  <CreditCard size={16} className="text-slate-500" />
                                  Record Payment
                                </button>

                                <button
                                  className="flex items-center gap-3 px-4 py-2.5 my-1 mx-2 rounded border border-slate-200 bg-white text-sm font-medium text-slate-700 text-left transition-colors hover:bg-slate-50"
                                  onClick={() => {
                                    setActiveActionInvoiceId(null);
                                    handleShare(invoice);
                                  }}
                                >
                                  <Link size={16} className="text-slate-500" />
                                  Share Invoice Link
                                </button>
                              </div>
                            </div>
                          )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              </table>
            </div>
          </div>
        )}
        </div>
      </div>

      {/* Pagination Controls */}
      <PaginationFooter
        currentPage={currentPage}
        totalItems={totalItems}
        totalPages={totalPages}
        pageSize={itemsPerPage}
        itemLabel="invoices"
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
      />

      {/* Bulk Update Modal */}
      {isBulkUpdateModalOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-[300] flex items-start justify-center pt-6 overflow-y-auto px-4 py-6"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsBulkUpdateModalOpen(false);
            }
          }}
        >
          <div className="bg-white rounded-lg shadow-xl max-w-xl w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-gray-200">
              <h2>Bulk Update Invoices</h2>
              <button
                className="p-1 text-gray-500 hover:text-gray-700 cursor-pointer"
                onClick={() => setIsBulkUpdateModalOpen(false)}
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-5">
              <p className="text-sm text-gray-600 mb-5">
                Choose a field from the dropdown and update with new information.
              </p>

              <div className="grid grid-cols-2 gap-4 mb-5">
                <div className="flex flex-col relative" ref={bulkUpdateFieldDropdownRef}>
                  <label className="text-sm font-medium text-gray-700 mb-2">Field</label>
                  <div
                    className="flex items-center justify-between px-4 py-2 border border-gray-300 rounded-md bg-white text-gray-700 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => setIsBulkUpdateFieldDropdownOpen(!isBulkUpdateFieldDropdownOpen)}
                  >
                    <span>{bulkUpdateField || "Select a field"}</span>
                    <ChevronDown size={16} />
                  </div>
                  {isBulkUpdateFieldDropdownOpen && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-[300px] overflow-y-auto">
                      {bulkUpdateFieldOptions.map((field) => (
                        <div
                          key={field}
                          className="px-4 py-2.5 text-sm text-gray-700 cursor-pointer hover:bg-[#156372] hover:text-white transition-colors"
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

                <div className="flex flex-col relative">
                  <label className="text-sm font-medium text-gray-700 mb-2">Value</label>
                  {renderBulkUpdateValueInput()}
                </div>
              </div>

              <div className="mb-5">
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Reason for bulk updating invoices<span className="text-red-500">*</span>
                </label>
                <textarea
                  className="w-full px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#156372] resize-y min-h-[80px]"
                  value={bulkUpdateReason}
                  onChange={(e) => setBulkUpdateReason(e.target.value)}
                  placeholder="Enter the reason"
                />
              </div>

              <div className="text-sm text-gray-600 mb-6">
                <strong>Note:</strong> All the selected invoices will be updated with the new information and you cannot undo this action.
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 p-5 border-t border-gray-200 bg-gray-50">
              <button
                className={`px-4 py-2 bg-[#156372] text-white rounded-md text-sm font-medium cursor-pointer hover:bg-[#0D4A52] shadow-sm ${isBulkUpdating ? "opacity-60 cursor-not-allowed" : ""}`}
                onClick={handleBulkUpdateSubmit}
                disabled={isBulkUpdating}
              >
                {isBulkUpdating ? "Updating..." : "Update"}
              </button>
              <button
                className={`px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md text-sm font-medium cursor-pointer hover:bg-gray-50 ${isBulkUpdating ? "opacity-60 cursor-not-allowed" : ""}`}
                onClick={() => {
                  setIsBulkUpdateModalOpen(false);
                  setBulkUpdateField("");
                  setBulkUpdateValue("");
                  setBulkUpdateReason("");
                }}
                disabled={isBulkUpdating}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {isDeleteConfirmModalOpen && (
        <div className="fixed inset-0 z-[2100] flex items-start justify-center bg-black/40 pt-16">
          <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-3">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-100 text-amber-600 text-[12px] font-bold">
                !
              </div>
              <h3 className="flex-1 text-[15px] font-semibold text-slate-800">
                Delete {selectedInvoices.size} invoice{selectedInvoices.size === 1 ? "" : "s"}?
              </h3>
              <button
                type="button"
                className="h-7 w-7 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                onClick={() => setIsDeleteConfirmModalOpen(false)}
                aria-label="Close"
              >
                <X size={14} />
              </button>
            </div>
            <div className="px-5 py-3 text-[13px] text-slate-600">
              You cannot retrieve the selected invoice{selectedInvoices.size === 1 ? "" : "s"} once they have been deleted. This action cannot be undone.
            </div>
            <div className="flex items-center justify-start gap-2 border-t border-slate-100 px-5 py-3">
              <button
                type="button"
                className={`rounded-md bg-[#156372] px-4 py-1.5 text-[12px] text-white hover:bg-[#0D4A52] ${isDeletingInvoices ? "cursor-not-allowed opacity-70" : ""}`}
                onClick={confirmDeleteInvoices}
                disabled={isDeletingInvoices}
              >
                {isDeletingInvoices ? "Deleting..." : "Delete"}
              </button>
              <button
                type="button"
                className={`rounded-md border border-slate-300 px-4 py-1.5 text-[12px] text-slate-700 hover:bg-slate-50 ${isDeletingInvoices ? "cursor-not-allowed opacity-70" : ""}`}
                onClick={() => setIsDeleteConfirmModalOpen(false)}
                disabled={isDeletingInvoices}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mark As Sent Confirmation Modal */}
      {isMarkAsSentModalOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-[300] flex items-start justify-center pt-[10vh] overflow-y-auto px-4 py-6"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsMarkAsSentModalOpen(false);
            }
          }}
        >
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <AlertTriangle size={24} className="text-yellow-600 flex-shrink-0" />
                <h2>Are you sure about marking the selected invoices as paid?</h2>
              </div>
            </div>
            <div className="p-6">
              <p>The Invoice(s) that are marked as paid will be displayed as paid in the system and customer portal.</p>
            </div>
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
              <button
                className="px-4 py-2 bg-gradient-to-r from-[#156372] to-[#0D4A52] text-white rounded-md text-sm font-medium cursor-pointer hover:opacity-90 shadow-sm"
                onClick={handleConfirmMarkAsPaid}
              >
                Yes, Mark as Paid
              </button>
              <button
                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md text-sm font-medium cursor-pointer hover:bg-gray-50"
                onClick={() => setIsMarkAsSentModalOpen(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dissociate Sales Orders Modal */}
      {isDissociateModalOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-[300] flex items-start justify-center pt-[10vh] overflow-y-auto px-4 py-6"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsDissociateModalOpen(false);
            }
          }}
        >
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Hey, heads up!</h2>
              <p className="text-sm text-gray-600 mb-4">
                We could not dissociate some of the invoices from salesorders
              </p>
              <button
                className="text-[#156372] hover:text-blue-700 text-sm font-medium cursor-pointer"
                onClick={handleLearnMore}
              >
                Learn More
              </button>
            </div>
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
              <button
                className="px-4 py-2 bg-gradient-to-r from-[#156372] to-[#0D4A52] text-white rounded-md text-sm font-medium cursor-pointer hover:opacity-90 shadow-sm"
                onClick={handleDissociateConfirm}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Export Current View Modal */}
      {isExportCurrentViewModalOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-[300] flex items-start justify-center pt-[10vh] overflow-y-auto px-4 py-6"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsExportCurrentViewModalOpen(false);
            }
          }}
        >
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2>Export Current View</h2>
              <button
                className="p-1 text-gray-500 hover:text-gray-700 cursor-pointer"
                onClick={() => setIsExportCurrentViewModalOpen(false)}
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6">
              {/* Info Box */}
              <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-md mb-6">
                <Info size={16} />
                <span>Only the current view with its visible columns will be exported from Taban Books in CSV, XLS or XLSX format.</span>
              </div>

              {/* Decimal Format */}
              <div className="flex flex-col mb-6">
                <label className="text-sm font-medium text-gray-700 mb-2">
                  Decimal Format<span className="text-red-500 ml-1">*</span>
                </label>
                <div className="relative" ref={decimalFormatDropdownRef}>
                  <div
                    className="flex items-center justify-between px-4 py-2 border border-gray-300 rounded-md bg-white text-gray-700 cursor-pointer hover:bg-gray-50"
                    onClick={() => setIsDecimalFormatDropdownOpen(!isDecimalFormatDropdownOpen)}
                  >
                    <span>{exportData.decimalFormat}</span>
                    <ChevronDown size={16} />
                  </div>
                  {isDecimalFormatDropdownOpen && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50">
                      {decimalFormatOptions.map((format) => (
                        <div
                          key={format}
                          className="px-4 py-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-50"
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
              <div className="flex flex-col mb-6">
                <label className="text-sm font-medium text-gray-700 mb-2">
                  Export File Format<span className="text-red-500 ml-1">*</span>
                </label>
                <div className="flex flex-col gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="fileFormat"
                      value="csv"
                      checked={exportData.fileFormat === "csv"}
                      onChange={(e) => setExportData(prev => ({ ...prev, fileFormat: e.target.value }))}
                    />
                    <span>CSV (Comma Separated Value)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="fileFormat"
                      value="xls"
                      checked={exportData.fileFormat === "xls"}
                      onChange={(e) => setExportData(prev => ({ ...prev, fileFormat: e.target.value }))}
                    />
                    <span>XLS (Microsoft Excel 1997-2004 Compatible)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="fileFormat"
                      value="xlsx"
                      checked={exportData.fileFormat === "xlsx"}
                      onChange={(e) => setExportData(prev => ({ ...prev, fileFormat: e.target.value }))}
                    />
                    <span>XLSX (Microsoft Excel)</span>
                  </label>
                </div>
              </div>

              {/* File Protection Password */}
              <div className="flex flex-col mb-6">
                <label className="text-sm font-medium text-gray-700 mb-2">
                  File Protection Password
                </label>
                <div className="relative flex items-center">
                  <input
                    type={exportData.showPassword ? "text" : "password"}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#156372] pr-10"
                    value={exportData.password}
                    onChange={(e) => setExportData(prev => ({ ...prev, password: e.target.value }))}
                    placeholder="Enter password"
                  />
                  <button
                    type="button"
                    className="absolute right-2 p-1 text-gray-500 hover:text-gray-700 cursor-pointer"
                    onClick={handleTogglePasswordVisibility}
                  >
                    {exportData.showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Your password must be at least 12 characters and include one uppercase letter, lowercase letter, number, and special character.
                </p>
              </div>

              {/* Note */}
              <div className="text-sm text-gray-600 mb-6">
                <strong>Note:</strong> You can export only the first 10,000 rows. If you have more rows, initiate a backup for your Taban Books organization and download it.{" "}
                <a href="#" className="text-[#156372] hover:text-blue-700 no-underline">Backup Your Data</a>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
              <button
                className="px-4 py-2 bg-gradient-to-r from-[#156372] to-[#0D4A52] text-white rounded-md text-sm font-medium cursor-pointer hover:opacity-90 shadow-sm"
                onClick={handleExportSubmit}
              >
                Export
              </button>
              <button
                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md text-sm font-medium cursor-pointer hover:bg-gray-50"
                onClick={() => {
                  setIsExportCurrentViewModalOpen(false);
                  setExportData({
                    decimalFormat: "1234567.89",
                    fileFormat: "csv",
                    password: "",
                    showPassword: false
                  });
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preferences Sidebar */}
      {(isPreferencesOpen || isFieldCustomizationOpen) && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-[300] flex items-start justify-center pt-[10vh] overflow-y-auto px-4 py-6"
          onClick={() => {
            setIsPreferencesOpen(false);
            setIsFieldCustomizationOpen(false);
          }}
        >
          <div
            className="w-full max-w-2xl bg-white rounded-lg shadow-xl flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-white sticky top-0 z-10">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setActivePreferencesTab("preferences")}
                  className={`px-4 py-2 text-sm font-medium ${activePreferencesTab === "preferences"
                    ? "text-[#156372] border-b-2 border-[#156372]"
                    : "text-gray-600 hover:text-gray-900"
                    }`}
                >
                  Preferences
                </button>
                <button
                  onClick={() => setActivePreferencesTab("field-customization")}
                  className={`px-4 py-2 text-sm font-medium ${activePreferencesTab === "field-customization"
                    ? "text-[#156372] border-b-2 border-[#156372]"
                    : "text-gray-600 hover:text-gray-900"
                    }`}
                >
                  Field Customization
                </button>
              </div>
              <div className="flex items-center gap-2">
                <button className="text-sm text-[#156372] hover:text-blue-700">All Preferences</button>
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
                {/* Invoice Editing Options */}
                <div className="mb-6">
                  <div className="mb-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={preferences.allowEditingSentInvoice}
                        onChange={(e) => setPreferences(prev => ({ ...prev, allowEditingSentInvoice: e.target.checked }))}
                        className="w-4 h-4 text-[#156372] border-gray-300 rounded focus:ring-[#156372] cursor-pointer"
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
                        className="w-4 h-4 text-[#156372] border-gray-300 rounded focus:ring-[#156372] cursor-pointer"
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
                        className="w-4 h-4 text-[#156372] border-gray-300 rounded focus:ring-[#156372] cursor-pointer"
                      />
                      <span className="text-sm text-gray-700">Get notified when customers pay online</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={preferences.includePaymentReceipt}
                        onChange={(e) => setPreferences(prev => ({ ...prev, includePaymentReceipt: e.target.checked }))}
                        className="w-4 h-4 text-[#156372] border-gray-300 rounded focus:ring-[#156372] cursor-pointer"
                      />
                      <span className="text-sm text-gray-700">Do you want to include the payment receipt along with the Thank You note?</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={preferences.automateThankYouNote}
                        onChange={(e) => setPreferences(prev => ({ ...prev, automateThankYouNote: e.target.checked }))}
                        className="w-4 h-4 text-[#156372] border-gray-300 rounded focus:ring-[#156372] cursor-pointer"
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
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${preferences.invoiceQRCodeEnabled ? "bg-[#156372]" : "bg-gray-300"
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
                      className="w-4 h-4 text-[#156372] border-gray-300 rounded focus:ring-[#156372] cursor-pointer mt-0.5"
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
                    className="w-full px-4 py-3 border border-blue-200 rounded-md text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#156372] resize-y min-h-[200px]"
                    placeholder="Enter terms and conditions..."
                  />
                </div>

                {/* Customer Notes Section */}
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">Customer Notes</h3>
                  <textarea
                    value={preferences.customerNotes}
                    onChange={(e) => setPreferences(prev => ({ ...prev, customerNotes: e.target.value }))}
                    className="w-full px-4 py-3 border border-blue-200 rounded-md text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#156372] resize-y min-h-[200px]"
                    placeholder="Enter customer notes..."
                  />
                </div>

                {/* Save Button */}
                <div className="flex items-center justify-start pt-4 border-t border-gray-200">
                  <button
                    onClick={() => {
                      // TODO: Save preferences to localStorage or backend
                      console.log("Saving preferences:", preferences);
                      toast("Preferences saved successfully!");
                      setIsPreferencesOpen(false);
                    }}
                    className="px-6 py-2 bg-gradient-to-r from-[#156372] to-[#0D4A52] text-white rounded-md text-sm font-medium cursor-pointer hover:opacity-90 shadow-sm"
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
                  <button className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#156372] to-[#0D4A52] text-white rounded-md text-sm font-medium cursor-pointer hover:opacity-90 shadow-sm">
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
      )}

      {/* Search Modal */}
      {isSearchModalOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-[300] flex items-start justify-center pt-[10vh] overflow-y-auto px-4 py-6"
          onClick={() => setIsSearchModalOpen(false)}
        >
          <div
            className="bg-white rounded-lg shadow-xl w-full max-w-4xl mx-4 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between py-4 px-6 border-b border-gray-200">
              <div className="flex items-center gap-6">
                {/* Search Type Dropdown */}
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-700">Search</label>
                  <div className="relative" ref={searchTypeDropdownRef}>
                    <div
                      className={`flex items-center justify-between w-[140px] py-2 px-3 text-sm text-gray-700 bg-white border rounded-md cursor-pointer transition-colors ${isSearchTypeDropdownOpen ? "border-[#156372]" : "border-gray-300 hover:border-gray-400"}`}
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
                        className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#156372] border-t-0 rounded-b-md shadow-lg z-[1002] max-h-[300px] overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {searchTypeOptions.map((option) => (
                          <div
                            key={option}
                            className={`py-2.5 px-3.5 text-sm cursor-pointer transition-colors ${searchType === option
                              ? "bg-[#156372] text-white hover:bg-blue-700"
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
                      className={`flex items-center justify-between w-[160px] py-2 px-3 text-sm text-gray-700 bg-white border rounded-md cursor-pointer transition-colors ${isFilterDropdownOpen ? "border-[#156372]" : "border-gray-300 hover:border-gray-400"}`}
                      onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)}
                    >
                      <span>{selectedView}</span>
                      <ChevronDown size={16} className={`text-gray-500 transition-transform ${isFilterDropdownOpen ? "rotate-180" : ""}`} />
                    </div>
                    {isFilterDropdownOpen && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#156372] border-t-0 rounded-b-md shadow-lg z-[1002] max-h-[200px] overflow-y-auto">
                        {invoiceViews.map((view) => (
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
                  setIsSearchModalOpen(false);
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
                    vendorName: ""
                  });
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Search Criteria Body */}
            <div className="p-6">
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
                        className="w-full py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-[#156372] focus:ring-1 focus:ring-[#156372]"
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
                          className="flex-1 py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-[#156372] focus:ring-1 focus:ring-[#156372]"
                        />
                        <span className="text-gray-500">-</span>
                        <input
                          type="text"
                          placeholder="dd/MM/yyyy"
                          value={searchModalData.dateRangeTo}
                          onChange={(e) => setSearchModalData(prev => ({ ...prev, dateRangeTo: e.target.value }))}
                          className="flex-1 py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-[#156372] focus:ring-1 focus:ring-[#156372]"
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
                        className="w-full py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-[#156372] focus:ring-1 focus:ring-[#156372]"
                      />
                    </div>

                    {/* Status */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Status</label>
                      <select
                        value={searchModalData.status}
                        onChange={(e) => setSearchModalData(prev => ({ ...prev, status: e.target.value }))}
                        className="w-full py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-[#156372] focus:ring-1 focus:ring-[#156372]"
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
                        className="w-full py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-[#156372] focus:ring-1 focus:ring-[#156372]"
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
                          className="flex-1 py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-[#156372] focus:ring-1 focus:ring-[#156372]"
                        />
                        <span className="text-gray-500">-</span>
                        <input
                          type="text"
                          placeholder="dd/MM/yyyy"
                          value={searchModalData.createdBetweenTo}
                          onChange={(e) => setSearchModalData(prev => ({ ...prev, createdBetweenTo: e.target.value }))}
                          className="flex-1 py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-[#156372] focus:ring-1 focus:ring-[#156372]"
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
                          className="flex-1 py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-[#156372] focus:ring-1 focus:ring-[#156372]"
                        />
                        <span className="text-gray-500">-</span>
                        <input
                          type="text"
                          value={searchModalData.totalRangeToInvoice}
                          onChange={(e) => setSearchModalData(prev => ({ ...prev, totalRangeToInvoice: e.target.value }))}
                          className="flex-1 py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-[#156372] focus:ring-1 focus:ring-[#156372]"
                        />
                      </div>
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
                        className="w-full py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-[#156372] focus:ring-1 focus:ring-[#156372]"
                      />
                    </div>

                    {/* Company Name */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Company Name</label>
                      <input
                        type="text"
                        value={searchModalData.companyName}
                        onChange={(e) => setSearchModalData(prev => ({ ...prev, companyName: e.target.value }))}
                        className="w-full py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-[#156372] focus:ring-1 focus:ring-[#156372]"
                      />
                    </div>

                    {/* Last Name */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Last Name</label>
                      <input
                        type="text"
                        value={searchModalData.lastName}
                        onChange={(e) => setSearchModalData(prev => ({ ...prev, lastName: e.target.value }))}
                        className="w-full py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-[#156372] focus:ring-1 focus:ring-[#156372]"
                      />
                    </div>

                    {/* Status */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Status</label>
                      <select
                        value={searchModalData.status}
                        onChange={(e) => setSearchModalData(prev => ({ ...prev, status: e.target.value }))}
                        className="w-full py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-[#156372] focus:ring-1 focus:ring-[#156372]"
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
                        className="w-full py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-[#156372] focus:ring-1 focus:ring-[#156372]"
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
                        className="w-full py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-[#156372] focus:ring-1 focus:ring-[#156372]"
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
                        className="w-full py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-[#156372] focus:ring-1 focus:ring-[#156372]"
                      />
                    </div>

                    {/* Email */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                      <input
                        type="email"
                        value={searchModalData.email}
                        onChange={(e) => setSearchModalData(prev => ({ ...prev, email: e.target.value }))}
                        className="w-full py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-[#156372] focus:ring-1 focus:ring-[#156372]"
                      />
                    </div>

                    {/* Phone */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone</label>
                      <input
                        type="tel"
                        value={searchModalData.phone}
                        onChange={(e) => setSearchModalData(prev => ({ ...prev, phone: e.target.value }))}
                        className="w-full py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-[#156372] focus:ring-1 focus:ring-[#156372]"
                      />
                    </div>

                    {/* Notes */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Notes</label>
                      <input
                        type="text"
                        value={searchModalData.notes}
                        onChange={(e) => setSearchModalData(prev => ({ ...prev, notes: e.target.value }))}
                        className="w-full py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-[#156372] focus:ring-1 focus:ring-[#156372]"
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
                        className="w-full py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-[#156372] focus:ring-1 focus:ring-[#156372]"
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
                          className="flex-1 py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-[#156372] focus:ring-1 focus:ring-[#156372]"
                        />
                        <span className="text-gray-500">-</span>
                        <input
                          type="text"
                          placeholder="dd/MM/yyyy"
                          value={searchModalData.dateRangeTo}
                          onChange={(e) => setSearchModalData(prev => ({ ...prev, dateRangeTo: e.target.value }))}
                          className="flex-1 py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-[#156372] focus:ring-1 focus:ring-[#156372]"
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
                        className="w-full py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-[#156372] focus:ring-1 focus:ring-[#156372]"
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
                        className="w-full py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-[#156372] focus:ring-1 focus:ring-[#156372]"
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
                          className="flex-1 py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-[#156372] focus:ring-1 focus:ring-[#156372]"
                        />
                        <span className="text-gray-500">-</span>
                        <input
                          type="text"
                          value={searchModalData.totalRangeToQuote}
                          onChange={(e) => setSearchModalData(prev => ({ ...prev, totalRangeToQuote: e.target.value }))}
                          className="flex-1 py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-[#156372] focus:ring-1 focus:ring-[#156372]"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 mt-6 pt-6 border-t border-gray-200">
                <button
                  onClick={() => {
                    setIsSearchModalOpen(false);
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
                      vendorName: ""
                    });
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    // TODO: Implement search functionality
                    console.log("Search with:", searchType, searchModalData);
                    setIsSearchModalOpen(false);
                  }}
                  className="px-6 py-2 bg-gradient-to-r from-[#156372] to-[#0D4A52] text-white rounded-md text-sm font-medium cursor-pointer hover:opacity-90 shadow-sm transition-all"
                >
                  Search
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Share Modal */}
      {showShareModal && selectedInvoiceForShare && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-[300] flex items-start justify-center pt-[10vh] overflow-y-auto px-4 py-6"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowShareModal(false);
            }
          }}
        >
          <div
            className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 flex flex-col"
            ref={shareModalRef}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                Share Invoice Link
              </h2>
              <button
                className="p-1 hover:bg-gray-100 rounded text-gray-500 hover:text-gray-700 cursor-pointer"
                onClick={() => setShowShareModal(false)}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              {/* Visibility Dropdown */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Visibility:
                </label>
                <div className="relative" ref={visibilityDropdownRef}>
                  <button
                    className="w-full flex items-center justify-between px-4 py-2 border border-gray-300 rounded-md bg-white text-red-600 hover:bg-gray-50 cursor-pointer"
                    onClick={() => setIsVisibilityDropdownOpen(!isVisibilityDropdownOpen)}
                  >
                    <span className="font-medium">{shareVisibility}</span>
                    <ChevronDown size={16} className="text-red-600" />
                  </button>
                  {isVisibilityDropdownOpen && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50">
                      <div
                        className="px-4 py-2 text-sm text-red-600 cursor-pointer hover:bg-gray-50"
                        onClick={() => {
                          setShareVisibility("Public");
                          setIsVisibilityDropdownOpen(false);
                        }}
                      >
                        Public
                      </div>
                      <div
                        className="px-4 py-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-50"
                        onClick={() => {
                          setShareVisibility("Private");
                          setIsVisibilityDropdownOpen(false);
                        }}
                      >
                        Private
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Description Text */}
              <p className="text-sm text-gray-600 mb-6">
                Select an expiration date and generate the link to share it with your customer. Remember that anyone who has access to this link can view, print or download it.
              </p>

              {/* Link Expiration Date */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-red-600 mb-2">
                  Link Expiration Date<span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  value={linkExpirationDate}
                  onChange={(e) => setLinkExpirationDate(e.target.value)}
                  placeholder="DD/MM/YYYY"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#156372]"
                />
                <div className="flex items-center gap-2 mt-2 text-xs text-gray-600">
                  <HelpCircle size={14} className="text-gray-500" />
                  <span>By default, the link is set to expire 90 days from the invoice due date.</span>
                </div>
              </div>

              {/* Generated Link Display */}
              {isLinkGenerated && generatedLink && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Generated Link:
                  </label>
                  <textarea
                    readOnly
                    value={generatedLink}
                    className="w-full px-4 py-3 border border-gray-300 rounded-md text-sm bg-gray-50 font-mono resize-none"
                    rows={3}
                  />
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between gap-3 p-6 border-t border-gray-200">
              {!isLinkGenerated ? (
                <>
                  <button
                    className="px-6 py-2 bg-gradient-to-r from-[#156372] to-[#0D4A52] text-white rounded-md text-sm font-medium cursor-pointer hover:opacity-90 shadow-sm transition-all"
                    onClick={handleGenerateLink}
                  >
                    Generate Link
                  </button>
                  <button
                    className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md text-sm font-medium cursor-pointer hover:bg-gray-50"
                    onClick={() => setShowShareModal(false)}
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <button
                    className="px-6 py-2 bg-gradient-to-r from-[#156372] to-[#0D4A52] text-white rounded-md text-sm font-medium cursor-pointer hover:opacity-90 shadow-sm transition-all"
                    onClick={handleCopyLink}
                  >
                    Copy Link
                  </button>
                  <div className="flex items-center gap-3">
                    <button
                      className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md text-sm font-medium cursor-pointer hover:bg-gray-50"
                      onClick={handleDisableAllActiveLinks}
                    >
                      Disable All Active Links
                    </button>
                    <button
                      className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md text-sm font-medium cursor-pointer hover:bg-gray-50"
                      onClick={() => setShowShareModal(false)}
                    >
                      Cancel
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Customize Columns Modal */}
      {isCustomizeColumnsModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] flex items-start justify-center z-[3000] overflow-y-auto pt-6 pb-6 px-4">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-[500px] overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-[#f9fafb]">
              <div className="flex items-center gap-3">
                <SlidersHorizontal size={18} className="text-gray-500" />
                <h3 className="text-[15px] font-semibold text-gray-800">Customize Columns</h3>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-xs text-gray-500 font-medium">{tempVisibleColumns.length} of {invoiceColumnOptions.length} Selected</span>
                <button
                  onClick={() => setIsCustomizeColumnsModalOpen(false)}
                  className="w-7 h-7 flex items-center justify-center border border-blue-200 rounded shadow-sm hover:bg-gray-50 transition-colors group"
                >
                  <X size={16} className="text-red-500 group-hover:text-red-600" />
                </button>
              </div>
            </div>
            <div className="px-6 py-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="text"
                  placeholder="Search"
                  value={columnSearchTerm}
                  onChange={(e) => setColumnSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            <div className="px-2 pb-6 max-h-[400px] overflow-y-auto">
              {tempColumnOrder
                .map((key) => invoiceColumnOptions.find(col => col.key === key))
                .filter((col): col is typeof invoiceColumnOptions[number] => Boolean(col))
                .filter(col => col.label.toLowerCase().includes(columnSearchTerm.toLowerCase()))
                .map((col) => {
                  const isChecked = tempVisibleColumns.includes(col.key);
                  return (
                    <div
                      key={col.key}
                      draggable
                      onDragStart={() => setDraggedColumnKey(col.key)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => {
                        if (!draggedColumnKey || draggedColumnKey === col.key) return;
                        setTempColumnOrder((prev) => {
                          const next = [...prev];
                          const from = next.indexOf(draggedColumnKey);
                          const to = next.indexOf(col.key);
                          if (from === -1 || to === -1) return prev;
                          const [moved] = next.splice(from, 1);
                          next.splice(to, 0, moved);
                          return next;
                        });
                        setDraggedColumnKey(null);
                      }}
                      onDragEnd={() => setDraggedColumnKey(null)}
                      className={`flex items-center gap-3 px-4 py-2 rounded-md group cursor-pointer transition-colors ${draggedColumnKey === col.key ? "bg-blue-50" : "hover:bg-gray-50"
                        }`}
                      onClick={() => {
                        if (col.locked) return;
                        if (isChecked) {
                          setTempVisibleColumns(prev => prev.filter(k => k !== col.key));
                        } else {
                          setTempVisibleColumns(prev => [...prev, col.key]);
                        }
                      }}
                    >
                      <div className="w-4 h-4 flex items-center justify-center text-gray-400 cursor-grab active:cursor-grabbing">
                        <GripVertical size={14} />
                      </div>
                      <div className="flex-1 flex items-center gap-3">
                        {col.locked ? (
                          <div className="w-4 h-4 flex items-center justify-center">
                            <Lock size={12} className="text-gray-500" />
                          </div>
                        ) : (
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => { }}
                            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 pointer-events-none"
                          />
                        )}
                        <span className={`text-[13.5px] ${isChecked ? 'text-gray-900 font-medium' : 'text-gray-600'}`}>{col.label}</span>
                      </div>
                    </div>
                  );
                })}
            </div>
            <div className="flex items-center justify-start gap-3 px-6 py-4 border-t border-gray-100 bg-[#f9fafb]">
              <button
                onClick={() => {
                  const normalizedOrder = normalizeInvoiceColumnOrder(tempColumnOrder);
                  const selectedSet = new Set(normalizeInvoiceColumns(tempVisibleColumns));
                  const normalized = normalizedOrder.filter((key) => selectedSet.has(key));
                  setColumnOrder(normalizedOrder);
                  setVisibleColumns(normalized);
                  localStorage.setItem("taban_invoices_columns_v3", JSON.stringify(normalized));
                  localStorage.setItem("taban_invoices_column_order_v1", JSON.stringify(normalizedOrder));
                  setIsCustomizeColumnsModalOpen(false);
                }}
                className="px-6 py-2 bg-[#156372] text-white rounded text-[13px] font-medium hover:bg-[#0D4A52] transition-colors shadow-sm"
              >
                Save
              </button>
              <button
                onClick={() => setIsCustomizeColumnsModalOpen(false)}
                className="px-6 py-2 bg-white border border-gray-200 text-gray-700 rounded text-[13px] font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}



