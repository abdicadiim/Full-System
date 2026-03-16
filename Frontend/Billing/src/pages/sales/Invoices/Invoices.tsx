import React, { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ChevronDown,
  ChevronUp,
  ChevronRight,
  ChevronLeft,
  Plus,
  ArrowUpDown,
  Search,
  Play,
  MoreHorizontal,
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
  FileDown,
  RotateCcw
} from "lucide-react";
import { getInvoices, getInvoicesPaginated, getInvoiceById, updateInvoice, deleteInvoice, Invoice } from "../salesModel";
import { getInvoiceStatusDisplay } from "../../../utils/invoiceUtils";
import { useCurrency } from "../../../hooks/useCurrency";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import * as XLSX from "xlsx";

const invoiceViews = [
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
  const [searchParams] = useSearchParams();
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
  // Refresh data when returning to page
  const refreshData = async (page = currentPage, limit = itemsPerPage) => {
    setIsRefreshing(true);
    try {
      const response = await getInvoicesPaginated({
        page,
        limit,
        status: selectedStatus !== "All" ? selectedStatus.toLowerCase() : undefined,
        search: searchQuery
      });
      setInvoices(response.data);
      setTotalItems(response.pagination.total);
      setTotalPages(response.pagination.pages);
    } catch (error) {
      console.error("Error refreshing invoices:", error);
    } finally {
      setIsRefreshing(false);
    }
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
  const [activeSortField, setActiveSortField] = useState("Invoice#");
  const [sortConfig, setSortConfig] = useState({ key: "Date", direction: "desc" });
  const [isExportCurrentViewModalOpen, setIsExportCurrentViewModalOpen] = useState(false);
  const [exportData, setExportData] = useState({
    decimalFormat: "1234567.89",
    fileFormat: "csv",
    password: "",
    showPassword: false
  });
  const [isDecimalFormatDropdownOpen, setIsDecimalFormatDropdownOpen] = useState(false);
  const [activeActionInvoiceId, setActiveActionInvoiceId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

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
    const loadData = async () => {
      setIsRefreshing(true);
      const statusFromUrl = searchParams.get('status');
      const pageFromUrl = parseInt(searchParams.get('page')) || 1;

      setCurrentPage(pageFromUrl);

      let currentStatus = selectedStatus;
      if (statusFromUrl) {
        const statusMap: { [key: string]: string } = {
          "all": "All",
          "draft": "Draft",
          "unpaid": "Unpaid",
          "overdue": "Overdue",
          "partially_paid": "Partially Paid",
          "customer_viewed": "Customer Viewed",
          "approved": "Approved",
          "pending_approval": "Pending Approval",
          "locked": "Locked"
        };
        currentStatus = statusMap[statusFromUrl] || statusFromUrl;
        setSelectedStatus(currentStatus);
      }

      const params: any = {
        page: pageFromUrl,
        limit: itemsPerPage,
        search: searchQuery,
        sort: sortConfig.key,
        order: sortConfig.direction
      };

      if (currentStatus !== "All") {
        params.status = currentStatus.toLowerCase();
      }

      const response = await getInvoicesPaginated(params);

      setInvoices(response.data);
      setTotalItems(response.pagination.total);
      setTotalPages(response.pagination.pages);
      setIsRefreshing(false);
    };

    loadData();

    const handleVisibilityChange = () => {
      if (!document.hidden) loadData();
    };

    window.addEventListener("storage", loadData);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("storage", loadData);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, itemsPerPage, searchQuery, selectedStatus]);

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
    setSelectedView(view);
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
    setIsRefreshing(true);
    try {
      const params: any = {
        page: 1, // Always reset to page 1 when filtering
        limit: itemsPerPage,
        search: searchQuery,
        sort: sortConfig.key,
        order: sortConfig.direction
      };

      // Handle Status Dropdown
      if (status && status !== "All") {
        params.status = status.toLowerCase();
      }

      // Handle View Selection (Overwrites status if specific view)
      if (view !== "All Invoices") {
        switch (view) {
          case "Draft":
          case "Locked":
          case "Pending Approval":
          case "Approved":
          case "Partially Paid":
          case "Paid":
          case "Void":
          case "Overdue":
            params.status = view.toLowerCase().replace(" ", "_"); // e.g. "Pending Approval" -> "pending_approval"
            if (view === "Overdue") params.status = "overdue";
            if (view === "Partially Paid") params.status = "partially paid"; // Backend expects space? Let's check. 
            // Model says 'partially paid'. 
            // Wait, 'Pending Approval' -> 'pending_approval' usually.
            if (view === "Pending Approval") params.status = "pending_approval";
            if ((view as string) === "Payment Initiated") params.status = "payment_initiated";
            break;
          case "Unpaid":
          case "Unpaid Invoices":
            params.status_ne = "paid";
            break;
          case "Customer Viewed":
            // Not supported server-side yet, might return all. 
            // Ideally we add backend support.
            break;
          case "Debit Note":
            // Filter by type? Backend has no type filter in query yet.
            break;
          case "Write Off":
            params.status = "write_off";
            break;
          case "Sent":
            params.status = "sent";
            break;
          default:
            // Custom view? 
            break;
        }
      }

      const response = await getInvoicesPaginated(params);
      setInvoices(response.data);
      setTotalItems(response.pagination.total);
      setTotalPages(response.pagination.pages);
      setCurrentPage(1); // Update current page state

    } catch (error) {
      console.error("Error applying filters:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleStatusSelect = (status: string) => {
    setSelectedStatus(status);
    setIsStatusDropdownOpen(false);
    applyFilters(selectedView, status);
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
    const rawStatus = String(invoice?.status || "").trim().toLowerCase();
    const dueDateValue = invoice?.dueDate ? new Date(invoice.dueDate) : null;
    const hasValidDueDate = dueDateValue instanceof Date && !Number.isNaN(dueDateValue.getTime());
    const diffDays = hasValidDueDate
      ? Math.ceil((dueDateValue!.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : null;
    const balanceDue = Number(invoice.balance !== undefined ? invoice.balance : (invoice.balanceDue || 0));
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
    if (rawStatus === "draft") {
      return { text: "DRAFT", className: "text-slate-400" };
    }
    if (rawStatus === "pending" || rawStatus === "pending approval") {
      return { text: "PENDING", className: "text-amber-500" };
    }
    if (rawStatus === "sent") {
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
      alert("Please select a field and enter new information");
      return;
    }
    if (!bulkUpdateReason.trim()) {
      alert("Please enter a reason for bulk updating invoices");
      return;
    }
    if (selectedInvoices.size === 0) {
      alert("Please select at least one invoice");
      return;
    }

    const basePayload = buildBulkUpdatePayload(bulkUpdateField, bulkUpdateValue);
    if (Object.keys(basePayload).length === 0) {
      alert("Selected field is not supported for bulk update.");
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
        alert(`Updated ${successCount} invoice(s) successfully.`);
      } else {
        alert(`Updated ${successCount} invoice(s). ${failedCount} invoice(s) failed to update.`);
      }
    } catch (error) {
      // console.error("Error during bulk update:", error);
      alert("Failed to bulk update invoices. Please try again.");
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
        alert("No invoices found to download.");
        return;
      }

      const today = new Date().toISOString().split("T")[0];
      const fileName = validInvoices.length === 1
        ? `${String(validInvoices[0].invoiceNumber || validInvoices[0].id || "Invoice").replace(/[\\/:*?\"<>|]/g, "_")}.pdf`
        : `Invoices-${today}.pdf`;

      await exportInvoicesToPdf(validInvoices, fileName);
    } catch (error) {
      // console.error("Error generating invoice PDF:", error);
      alert("Failed to download PDF. Please try again.");
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleExportAllInvoices = () => {
    setIsMoreMenuOpen(false);

    // Export all invoices as CSV
    const allInvoiceData = invoices;

    if (allInvoiceData.length === 0) {
      alert("No invoices to export");
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
      alert("No invoices available in the current view.");
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
      alert("File password protection is not supported for this export in the current build.");
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
      alert("Please select an expiration date");
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
        alert("Invoice link copied to clipboard");
        setShowShareModal(false);
      }).catch(() => {
        alert("Unable to copy link. Please copy manually: " + generatedLink);
      });
    }
  };

  const handleDisableAllActiveLinks = () => {
    if (window.confirm("Are you sure you want to disable all active links for this invoice?")) {
      setGeneratedLink("");
      setIsLinkGenerated(false);
      alert("All active links have been disabled.");
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
      const allInvoices = await getInvoices();
      setInvoices(allInvoices);

      setIsMarkAsSentModalOpen(false);
      setSelectedInvoices(new Set());

      if (failedCount === 0 && skippedCount === 0 && updatedCount > 0) {
        alert(`Marked ${updatedCount} invoice(s) as paid successfully`);
      } else if (updatedCount > 0) {
        alert(`Marked ${updatedCount} invoice(s) as paid. Skipped: ${skippedCount}. Failed: ${failedCount}.`);
      } else {
        alert("No invoices were updated. Selected invoices may already be marked as paid.");
      }
    } catch (error) {
      alert("Failed to mark invoices as paid. Please try again.");
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
    if (!Array.isArray(invoices)) return [];

    const uniqueInvoices = Array.from(new Map(invoices.map(invoice => [invoice.id, invoice])).values());
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
  }, [invoices, sortConfig]);

  const handleSort = (field) => {
    setActiveSortField(field);
    setSortConfig(prev => ({
      key: field,
      direction: prev.key === field && prev.direction === "asc" ? "desc" : "asc"
    }));
  };

  const handleRefreshList = async () => {
    // Reload invoices
    const allInvoices = await getInvoices();
    setInvoices(allInvoices);
    setIsMoreMenuOpen(false);
  };

  const handleResetColumnWidth = () => {
    // TODO: Implement reset column width
    // console.log("Reset column width");
    setIsMoreMenuOpen(false);
  };

  const handleDelete = async () => {
    if (selectedInvoices.size === 0) {
      alert("Please select at least one invoice.");
      return;
    }

    const confirmMessage = `Are you sure you want to delete ${selectedInvoices.size} invoice(s)? This action cannot be undone.`;

    if (window.confirm(confirmMessage)) {
      const invoiceIds = Array.from(selectedInvoices);

      // Delete each invoice
      await Promise.all(invoiceIds.map(invoiceId => deleteInvoice(invoiceId)));

      // Reapply filters to update the table with the current view
      await applyFilters(selectedView, selectedStatus);

      // Clear selection
      setSelectedInvoices(new Set());

      alert(`${invoiceIds.length} invoice(s) deleted successfully.`);
    }
  };

  const handleMarkAsPaidAction = () => {
    if (selectedInvoices.size === 0) {
      alert("Please select at least one invoice.");
      return;
    }
    setIsMarkAsSentModalOpen(true);
  };

  // const handleDissociateSalesOrders = () => {
  //   // Placeholder
  //   alert("Dissociate Sales Orders functionality is not yet implemented.");
  // };

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-white">
      {isGeneratingPdf && (
        <div className="fixed top-5 right-5 z-[1200] flex items-center gap-2 px-4 py-2 rounded-md bg-white border border-gray-200 shadow-lg text-sm text-gray-700">
          <RefreshCw size={16} className="animate-spin text-[#156372]" />
          Generating PDF...
        </div>
      )}

      <div className="border-b border-gray-100 bg-white sticky top-0 z-[100]">
        {selectedInvoices.size > 0 ? (
          /* Bulk Action Header */
          <div className="flex items-center justify-between px-4 h-[60px]">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleBulkUpdate}
                className="h-9 px-4 rounded-md text-white text-sm font-medium inline-flex items-center gap-1.5 shadow-sm transition-all bg-gradient-to-r from-[#176a79] to-[#1b5e6a] hover:from-[#1b5e6a] hover:to-[#176a79]"
              >
                Bulk Update
              </button>

              <div className="relative" ref={downloadDropdownRef}>
                <button
                  type="button"
                  onClick={() => {
                    if (!isGeneratingPdf) setIsDownloadDropdownOpen(!isDownloadDropdownOpen);
                  }}
                  className={`px-4 py-2 border border-gray-200 bg-white text-sm font-medium text-gray-700 rounded-md hover:bg-gray-50 transition-all shadow-sm flex items-center gap-2 ${isGeneratingPdf ? "opacity-60 cursor-not-allowed" : ""}`}
                  title="Export Options"
                  disabled={isGeneratingPdf}
                >
                  {isGeneratingPdf ? <RefreshCw size={16} className="animate-spin" /> : <FileDown size={16} className="text-gray-500" />}
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
                className="px-4 py-2 border border-gray-200 bg-white text-sm font-medium text-gray-700 rounded-md hover:bg-gray-50 transition-all shadow-sm flex items-center gap-2"
              >
                Mark As Paid
              </button>

              <button
                type="button"
                onClick={handleDelete}
                className="px-4 py-2 border border-gray-200 bg-white text-sm font-medium text-red-600 rounded-md hover:bg-red-50 transition-all shadow-sm flex items-center gap-2"
              >
                <Trash2 size={16} className="text-red-500" />
                <span>Delete</span>
              </button>

              <div className="mx-2 h-5 w-px bg-gray-200" />

              <div className="inline-flex items-center gap-2 text-sm text-slate-500">
                <span
                  className="flex h-6 min-w-[24px] items-center justify-center rounded px-2 text-[13px] font-semibold text-white"
                  style={{ background: 'linear-gradient(90deg, #156372 0%, #0D4A52 100%)' }}
                >
                  {selectedInvoices.size}
                </span>
                <span className="text-sm text-gray-700">Selected</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSelectedInvoices(new Set())}
              className="inline-flex items-center gap-1 text-sm text-red-500 hover:text-red-700"
            >
              <span>Esc</span>
              <X size={18} />
            </button>
          </div>
        ) : (
          /* Normal Header */
          <div className="flex items-center justify-between px-4 h-[60px]">
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
                className="h-9 px-4 rounded-md text-white text-sm font-medium inline-flex items-center gap-1.5 shadow-sm transition-all bg-gradient-to-r from-[#176a79] to-[#1b5e6a] hover:from-[#1b5e6a] hover:to-[#176a79]"
                type="button"
              >
                <Plus size={18} className="stroke-[3px]" />
                <span>New</span>
              </button>

              <div className="relative" ref={moreMenuRef}>
                <button
                  onClick={() => setIsMoreMenuOpen((prev) => !prev)}
                  className="h-9 w-9 rounded-md border border-gray-200 bg-white text-slate-600 inline-flex items-center justify-center shadow-sm hover:bg-slate-50"
                  type="button"
                  aria-label="More options"
                >
                  <MoreHorizontal size={16} />
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
      </div>

      {/* Content Area */}
      <div className="relative min-h-0 flex-1 overflow-auto bg-white">

        {sortedInvoices.length === 0 && !isRefreshing ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
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
          <div className="bg-white">
            <table className="w-full text-left border-collapse">
              <thead className="bg-[#f6f7fb] sticky top-0 z-[110]">
                <tr>
                  <th className="px-4 py-3 text-left w-10">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setTempVisibleColumns([...visibleColumns]);
                          setTempColumnOrder([...columnOrder]);
                          setIsCustomizeColumnsModalOpen(true);
                        }}
                        className="p-1 text-gray-500 hover:text-gray-700 cursor-pointer"
                        title="Customize Columns"
                      >
                        <SlidersHorizontal size={14} />
                      </button>
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left w-10">
                    <button
                      className="cursor-pointer flex items-center"
                      onClick={handleSelectAllInvoices}
                    >
                      {selectedInvoices.size === sortedInvoices.length && sortedInvoices.length > 0 ? (
                        <CheckSquare size={16} fill="#156372" color="#156372" />
                      ) : (
                        <Square size={16} className="text-gray-400" />
                      )}
                    </button>
                  </th>
                  {visibleColumns.map((colKey) => {
                    const col = invoiceColumnOptions.find(c => c.key === colKey);
                    if (!col) return null;
                    const isSortable = colKey === "invoiceNumber" || colKey === "date" || colKey === "amount" || colKey === "balanceDue" || colKey === "dueDate";

                    return (
                      <th
                        key={colKey}
                        className="px-4 py-3 text-left text-[11px] font-semibold text-[#7b8494] uppercase tracking-wider select-none"
                      >
                        {isSortable ? (
                          <button
                            className="flex items-center gap-1 hover:text-gray-900 transition-colors uppercase"
                            onClick={() => handleSort(col.label)}
                          >
                            {col.label}
                            <ArrowUpDown size={12} className="text-gray-400" />
                          </button>
                        ) : (
                          col.label
                        )}
                      </th>
                    );
                  })}
                  <th className="w-10 px-4 py-3 text-right sticky right-0 z-20 bg-[#f6f7fb]">
                    <button
                      onClick={() => setIsSearchModalOpen(true)}
                      className="p-1 text-gray-400 hover:text-gray-600 cursor-pointer"
                    >
                      <Search size={14} />
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {isRefreshing ? (
                  Array(5).fill(0).map((_, index) => (
                    <tr key={`skeleton-${index}`}>
                      <td className="px-4 py-3"></td>
                      <td className="px-4 py-3">
                        <div className="w-4 h-4 bg-gray-200 rounded animate-pulse"></div>
                      </td>
                      {visibleColumns.map((colKey) => (
                        <td key={`${index}-${colKey}`} className="px-4 py-3">
                          <div className="h-4 bg-gray-200 rounded animate-pulse w-24"></div>
                        </td>
                      ))}
                      <td className="px-4 py-3"></td>
                      <td className="px-4 py-3"></td>
                    </tr>
                  ))
                ) : (
                  sortedInvoices.map((invoice) => (
                    <tr
                      key={invoice.id}
                      onClick={(e) => {
                        // Don't navigate if clicking checkbox or edit button
                        if (!(e.target as Element).closest('.invoice-checkbox') && !(e.target as Element).closest('.invoice-edit-button')) {
                          navigate(`/sales/invoices/${invoice.id}`);
                        }
                      }}
                      className="group transition-all cursor-pointer hover:bg-slate-50/50"
                    >
                      {/* Empty first col under the sliders icon */}
                      <td className="px-4 py-3 w-10"></td>
                      {/* Checkbox column */}
                      <td className="px-4 py-3">
                        <button
                          className="invoice-checkbox cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectInvoice(invoice.id);
                          }}
                        >
                          {selectedInvoices.has(invoice.id) ? (
                            <CheckSquare size={16} fill="#156372" color="#156372" />
                          ) : (
                            <Square size={16} />
                          )}
                        </button>
                      </td>
                      {visibleColumns.map((colKey) => (
                        <td key={`${invoice.id}-${colKey}`} className="px-4 py-3">
                          {renderInvoiceCell(invoice, colKey)}
                        </td>
                      ))}
                      {/* Last col: action button on hover (right side) */}
                      <td className="px-4 py-3 relative overflow-visible w-10">
                        <div className="flex items-center justify-center relative">
                          <button
                            className={`hidden group-hover:flex items-center justify-center w-7 h-7 rounded-full bg-gradient-to-r from-[#156372] to-[#0D4A52] cursor-pointer transition-all shadow-md ${activeActionInvoiceId === invoice.id ? '!flex' : ''}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveActionInvoiceId(activeActionInvoiceId === invoice.id ? null : invoice.id);
                            }}
                            title="Actions"
                          >
                            <ChevronDown size={15} className="text-white" />
                          </button>

                          {activeActionInvoiceId === invoice.id && (
                            <div
                              ref={actionDropdownRef}
                              className="absolute right-0 top-9 w-56 bg-white border border-gray-200 rounded-lg shadow-xl z-[200] overflow-hidden"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="flex flex-col py-1">
                                <button
                                  className="flex items-center gap-3 px-4 py-2.5 bg-gradient-to-r from-[#156372] to-[#0D4A52] text-white hover:opacity-90 text-sm font-medium text-left"
                                  onClick={() => {
                                    setActiveActionInvoiceId(null);
                                    navigate(`/sales/invoices/${invoice.id}/edit`);
                                  }}
                                >
                                  <Pencil size={16} />
                                  Edit
                                </button>

                                <button
                                  className={`flex items-center gap-3 px-4 py-2.5 text-sm text-left ${isGeneratingPdf ? "text-gray-400 cursor-not-allowed" : "text-gray-700 hover:bg-gray-50"}`}
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
                                    <FileText size={16} className="text-[#156372]" />
                                  )}
                                  {isGeneratingPdf ? "Generating PDF..." : "Download PDF"}
                                </button>

                                <button
                                  className="flex items-center gap-3 px-4 py-2.5 text-gray-700 hover:bg-gray-50 text-sm text-left"
                                  onClick={() => {
                                    setActiveActionInvoiceId(null);
                                    navigate(`/sales/invoices/${invoice.id}/email`);
                                  }}
                                >
                                  <Mail size={16} className="text-[#156372]" />
                                  Send Email
                                </button>

                                <button
                                  className="flex items-center gap-3 px-4 py-2.5 bg-gradient-to-r from-[#156372] to-[#0D4A52] text-white hover:opacity-90 text-sm font-medium text-left my-1 mx-2 rounded shadow-sm"
                                  onClick={() => {
                                    setActiveActionInvoiceId(null);
                                    navigate(`/sales/payments-received/new`, { state: { invoiceId: invoice.id } });
                                  }}
                                >
                                  <CreditCard size={16} />
                                  Record Payment
                                </button>

                                <button
                                  className="flex items-center gap-3 px-4 py-2.5 bg-gradient-to-r from-[#156372] to-[#0D4A52] text-white hover:opacity-90 text-sm font-medium text-left my-1 mx-2 rounded shadow-sm"
                                  onClick={() => {
                                    setActiveActionInvoiceId(null);
                                    handleShare(invoice);
                                  }}
                                >
                                  <Link size={16} />
                                  Share Invoice Link
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      {sortedInvoices.length > 0 && (
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-white">
          <div className="flex items-center text-sm text-gray-500">
            Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} invoices
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (currentPage > 1) {
                  refreshData(currentPage - 1);
                }
              }}
              disabled={currentPage === 1}
              className={`p-2 rounded-md ${currentPage === 1 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              <ChevronLeft size={20} />
            </button>

            <span className="text-sm font-medium text-gray-700">
              Page {currentPage} of {totalPages}
            </span>

            <button
              onClick={() => {
                if (currentPage < totalPages) {
                  refreshData(currentPage + 1);
                }
              }}
              disabled={currentPage === totalPages}
              className={`p-2 rounded-md ${currentPage === totalPages ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      )}

      {/* Bulk Update Modal */}
      {isBulkUpdateModalOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-[300] flex items-start justify-center pt-[10vh] overflow-y-auto px-4 py-6"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsBulkUpdateModalOpen(false);
            }
          }}
        >
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2>Bulk Update Invoices</h2>
              <button
                className="p-1 text-gray-500 hover:text-gray-700 cursor-pointer"
                onClick={() => setIsBulkUpdateModalOpen(false)}
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6">
              <p className="text-sm text-gray-600 mb-6">
                Choose a field from the dropdown and update with new information.
              </p>

              <div className="grid grid-cols-2 gap-4 mb-6">
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
                          className="px-4 py-2.5 text-sm text-gray-700 cursor-pointer hover:bg-blue-600 hover:text-white transition-colors"
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

              <div className="mb-6">
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
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
              <button
                className={`px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium cursor-pointer hover:bg-red-700 shadow-sm ${isBulkUpdating ? "opacity-60 cursor-not-allowed" : ""}`}
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
                      alert("Preferences saved successfully!");
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
        <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] flex items-start justify-center z-[3000] overflow-y-auto pt-[10vh] pb-6 px-4">
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
                className="px-6 py-2 bg-[#22a06b] text-white rounded text-[13px] font-medium hover:bg-[#1c8b5d] transition-colors shadow-sm"
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


