import React, { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import LoadingSpinner from "../../../components/LoadingSpinner";
import {
  ChevronDown,
  ChevronRight,
  Plus,
  MoreVertical,
  Play,
  Upload,
  Download,
  ArrowUpDown,
  Settings,
  RefreshCw,
  ChevronRight as ChevronRightIcon,
  Search,
  Star,
  Filter,
  CheckSquare,
  Square,
  Pencil,
  X,
  FileUp,
  Trash2,
  Mail,
  SlidersHorizontal,
  Lock
} from "lucide-react";
import { getRecurringInvoices, updateRecurringInvoice, deleteRecurringInvoice, getCustomViews, deleteCustomView, generateInvoiceFromRecurring, RecurringInvoice, getCustomers, getSalespersonsFromAPI } from "../salesModel";
import { exportToCSV, exportToExcel, exportToPDF } from "./exportUtils";
import FieldCustomization from "../shared/FieldCustomization";
import { Eye, Check } from "lucide-react";

const statusFilterOptions = [
  "All",
  "Active",
  "Stopped",
  "Expired"
];

export default function RecurringInvoices() {
  const navigate = useNavigate();
  const [isViewDropdownOpen, setIsViewDropdownOpen] = useState(false);
  const [selectedView, setSelectedView] = useState("All Recurring Invoices");
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [customViews, setCustomViews] = useState<any[]>(() => getCustomViews().filter(v => v.type === "recurring-invoices"));
  const [recurringInvoices, setRecurringInvoices] = useState<RecurringInvoice[]>([]);
  const [bulkCustomers, setBulkCustomers] = useState<any[]>([]);
  const [bulkSalespersons, setBulkSalespersons] = useState<any[]>([]);
  const [filteredRecurringInvoices, setFilteredRecurringInvoices] = useState<RecurringInvoice[]>([]);
  const [selectedInvoices, setSelectedInvoices] = useState<string[]>([]);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);
  const [isExportDropdownOpen, setIsExportDropdownOpen] = useState(false);
  const [selectedSortBy, setSelectedSortBy] = useState("Created Time");
  const [sortOrder, setSortOrder] = useState("desc"); // "asc" or "desc"
  const [isBulkUpdateModalOpen, setIsBulkUpdateModalOpen] = useState(false);
  const [bulkUpdateField, setBulkUpdateField] = useState("");
  const [bulkUpdateValue, setBulkUpdateValue] = useState("");
  const [isFieldDropdownOpen, setIsFieldDropdownOpen] = useState(false);
  const [showSuccessNotification, setShowSuccessNotification] = useState(false);
  const [isFieldCustomizationOpen, setIsFieldCustomizationOpen] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchType, setSearchType] = useState("Recurring Invoices");
  const recurringColumnOptions = [
    { key: "customerName", label: "CUSTOMER NAME", locked: true, defaultVisible: true },
    { key: "profileName", label: "PROFILE NAME", locked: true, defaultVisible: true },
    { key: "frequency", label: "FREQUENCY", locked: false, defaultVisible: true },
    { key: "lastInvoiceDate", label: "LAST INVOICE DATE", locked: false, defaultVisible: true },
    { key: "nextInvoiceDate", label: "NEXT INVOICE DATE", locked: false, defaultVisible: true },
    { key: "status", label: "STATUS", locked: true, defaultVisible: true },
    { key: "amount", label: "AMOUNT", locked: true, defaultVisible: true }
  ];
  const lockedRecurringColumns = recurringColumnOptions.filter(c => c.locked).map(c => c.key);
  const defaultRecurringColumns = recurringColumnOptions.filter(c => c.defaultVisible).map(c => c.key);
  const normalizeRecurringColumns = (keys: string[]) => {
    const allKeys = recurringColumnOptions.map(c => c.key);
    const keySet = new Set([...lockedRecurringColumns, ...keys]);
    return allKeys.filter(k => keySet.has(k));
  };
  const [visibleColumns, setVisibleColumns] = useState<string[]>(() => {
    const saved = localStorage.getItem("taban_recurring_invoices_columns");
    if (saved) {
      try {
        return normalizeRecurringColumns(JSON.parse(saved));
      } catch (e) {
        return normalizeRecurringColumns(defaultRecurringColumns);
      }
    }
    return normalizeRecurringColumns(defaultRecurringColumns);
  });
  const [tempVisibleColumns, setTempVisibleColumns] = useState<string[]>([...visibleColumns]);
  const [isCustomizeColumnsModalOpen, setIsCustomizeColumnsModalOpen] = useState(false);
  const [columnSearchTerm, setColumnSearchTerm] = useState("");
  const [isHeaderMenuOpen, setIsHeaderMenuOpen] = useState(false);
  const [headerMenuPosition, setHeaderMenuPosition] = useState({ top: 0, left: 0 });
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
  const searchTypeDropdownRef = useRef<HTMLDivElement | null>(null);
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const filterDropdownRef = useRef<HTMLDivElement | null>(null);

  const formatCurrency = (amount: any, currencyStr: string = "AMD") => {
    const code = currencyStr?.split(' - ')[0] || "AMD";
    const symbols: { [key: string]: string } = {
      'USD': '$',
      'EUR': '€',
      'GBP': '£',
      'AMD': '֏',
      'INR': '₹',
      'JPY': '¥',
      'KES': 'KSh',
      'AUD': '$',
      'CAD': '$',
      'ZAR': 'R',
      'NGN': '₦'
    };
    const symbol = symbols[code] || code;
    return `${symbol}${parseFloat(amount || 0).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  };

  const formatDate = (dateString: any) => {
    if (!dateString) return "--";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString || "--";
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const formatFrequency = (frequency?: string): string => {
    const frequencyMap: Record<string, string> = {
      'daily': 'Daily',
      'weekly': 'Weekly',
      'biweekly': 'Bi-weekly',
      'monthly': 'Monthly',
      'quarterly': 'Quarterly',
      'yearly': 'Yearly'
    };
    return frequencyMap[String(frequency)] || String(frequency) || '--';
  };
  const renderRecurringCell = (recurringInvoice: RecurringInvoice, colKey: string) => {
    switch (colKey) {
      case "customerName":
        return (
          <span className="text-gray-900">
            {recurringInvoice.customerName || recurringInvoice.customer?.displayName || recurringInvoice.customer?.companyName || (typeof recurringInvoice.customer === 'string' ? recurringInvoice.customer : "--")}
          </span>
        );
      case "profileName":
        return (
          <span
            className="text-blue-600 hover:text-blue-800 font-medium cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/sales/recurring-invoices/${String(recurringInvoice.id)}`);
            }}
          >
            {recurringInvoice.profileName || "--"}
          </span>
        );
      case "frequency":
        return <span className="text-gray-900">{formatFrequency(recurringInvoice.frequency || recurringInvoice.repeatEvery)}</span>;
      case "lastInvoiceDate":
        return <span className="text-gray-900">{formatDate(recurringInvoice.lastInvoiceDate)}</span>;
      case "nextInvoiceDate":
        return <span className="text-gray-900">{formatDate(recurringInvoice.nextInvoiceDate || recurringInvoice.startOn)}</span>;
      case "status":
        return (
          <span className={`text-xs font-medium ${(recurringInvoice.status || "active").toLowerCase() === "active" ? "text-green-800" :
            (recurringInvoice.status || "active").toLowerCase() === "stopped" ? "text-red-800" :
              (recurringInvoice.status || "active").toLowerCase() === "expired" ? "text-gray-800" :
                "text-green-800"
            }`}>
            {(recurringInvoice.status || "active").toUpperCase()}
          </span>
        );
      case "amount":
        return <span className="text-gray-900 font-medium">{formatCurrency(recurringInvoice.total || recurringInvoice.amount, recurringInvoice.currency)}</span>;
      default:
        return null;
    }
  };
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
    // Recurring Invoices
    recurringInvoiceNumber: "",
    profileName: "",
    name: "", // For Recurring Invoices search
    startDateRangeFrom: "",
    startDateRangeTo: "",
    endDateRangeFrom: "",
    endDateRangeTo: "",
    itemNameRecurring: "",
    itemDescriptionRecurring: "",
    notesRecurring: "",
    statusRecurring: "",
    customerNameRecurring: "",
    taxExemptionsRecurring: "",
    addressTypeRecurring: "Billing and Shipping",
    attentionRecurring: "",
    // Expenses
    expenseNumber: "",
    vendorName: ""
  });
  const viewDropdownRef = useRef<HTMLDivElement | null>(null);
  const moreMenuRef = useRef<HTMLDivElement | null>(null);
  const sortDropdownRef = useRef<HTMLDivElement | null>(null);
  const exportDropdownRef = useRef<HTMLDivElement | null>(null);
  const fieldDropdownRef = useRef<HTMLDivElement | null>(null);
  const itemNameRecurringDropdownRef = useRef<HTMLDivElement | null>(null);
  const customerNameRecurringDropdownRef = useRef<HTMLDivElement | null>(null);
  const statusRecurringDropdownRef = useRef<HTMLDivElement | null>(null);
  const taxExemptionsRecurringDropdownRef = useRef<HTMLDivElement | null>(null);
  const [isTaxExemptionsRecurringDropdownOpen, setIsTaxExemptionsRecurringDropdownOpen] = useState(false);
  const [isItemNameRecurringDropdownOpen, setIsItemNameRecurringDropdownOpen] = useState(false);
  const [isCustomerNameRecurringDropdownOpen, setIsCustomerNameRecurringDropdownOpen] = useState(false);
  const [isStatusRecurringDropdownOpen, setIsStatusRecurringDropdownOpen] = useState(false);

  const sortOptions = [
    "Created Time",
    "Last Modified Time",
    "Customer Name",
    "Profile Name",
    "Last Invoice Date",
    "Next Invoice Date",
    "Amount"
  ];

  const exportOptions = [
    "Export to PDF",
    "Export to Excel",
    "Export to CSV"
  ];

  type BulkFieldType = "text" | "number" | "date" | "select";
  type BulkFieldOption = { label: string; value: string };
  type BulkFieldConfig = {
    label: string;
    payloadKey: string;
    type: BulkFieldType;
    placeholder?: string;
    options?: BulkFieldOption[];
    transform?: (value: string) => any;
  };

  const customerBulkOptions = useMemo(() => {
    const optionsMap = new Map<string, string>();
    for (const customer of bulkCustomers) {
      const customerId = String(customer?.id || customer?._id || "").trim();
      const customerLabel = String(
        customer?.displayName ||
        customer?.companyName ||
        customer?.name ||
        `${customer?.firstName || ""} ${customer?.lastName || ""}`.trim() ||
        ""
      ).trim();
      if (customerId && customerLabel && !optionsMap.has(customerId)) {
        optionsMap.set(customerId, customerLabel);
      }
    }
    for (const invoice of recurringInvoices) {
      const customerId = String(
        (invoice as any)?.customer?._id ||
        (invoice as any)?.customer?.id ||
        (invoice as any)?.customerId ||
        ""
      ).trim();
      const customerLabel = String(
        invoice.customerName ||
        (invoice as any)?.customer?.displayName ||
        (invoice as any)?.customer?.companyName ||
        (invoice as any)?.customer?.name ||
        ""
      ).trim();
      if (customerId && customerLabel && !optionsMap.has(customerId)) {
        optionsMap.set(customerId, customerLabel);
      }
    }
    return Array.from(optionsMap.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [bulkCustomers, recurringInvoices]);

  const salespersonBulkOptions = useMemo(() => {
    const fromDatabase = bulkSalespersons
      .map((salesperson: any) => String(salesperson?.name || "").trim())
      .filter(Boolean);
    const values = Array.from(
      new Set(
        [...fromDatabase, ...recurringInvoices
          .map((invoice: any) =>
            String(invoice?.salesperson?.name || invoice?.salesperson || "").trim()
          )
          .filter(Boolean)]
      )
    );
    return values
      .map((value) => ({ value, label: value }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [bulkSalespersons, recurringInvoices]);

  const currencyBulkOptions = useMemo(() => {
    const defaults = ["USD", "EUR", "GBP", "KES", "BGN", "INR", "JPY"];
    const dynamicCurrencies = recurringInvoices
      .map((invoice: any) => String(invoice?.currency || "").trim().toUpperCase())
      .filter(Boolean);
    const values = Array.from(new Set([...defaults, ...dynamicCurrencies]));
    return values
      .map((value) => ({ value, label: value }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [recurringInvoices]);

  const paymentTermsBulkOptions = useMemo(() => {
    const defaults = ["Due on Receipt", "Net 15", "Net 30", "Net 45", "Net 60"];
    const dynamicTerms = recurringInvoices
      .map((invoice: any) => String(invoice?.paymentTerms || "").trim())
      .filter(Boolean);
    const values = Array.from(new Set([...defaults, ...dynamicTerms]));
    return values
      .map((value) => ({ value, label: value }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [recurringInvoices]);

  const bulkFieldConfigs: BulkFieldConfig[] = useMemo(() => ([
    { label: "Profile Name", payloadKey: "profileName", type: "text", placeholder: "Enter profile name" },
    { label: "Customer Name", payloadKey: "customer", type: "select", options: customerBulkOptions },
    { label: "Order Number", payloadKey: "orderNumber", type: "text", placeholder: "Enter order number" },
    {
      label: "Frequency",
      payloadKey: "frequency",
      type: "select",
      options: [
        { label: "Daily", value: "daily" },
        { label: "Weekly", value: "weekly" },
        { label: "Bi-weekly", value: "biweekly" },
        { label: "Monthly", value: "monthly" },
        { label: "Quarterly", value: "quarterly" },
        { label: "Yearly", value: "yearly" }
      ]
    },
    { label: "Start Date", payloadKey: "startDate", type: "date" },
    { label: "End Date", payloadKey: "endDate", type: "date" },
    { label: "Payment Terms", payloadKey: "paymentTerms", type: "select", options: paymentTermsBulkOptions },
    { label: "Salesperson", payloadKey: "salesperson", type: "select", options: salespersonBulkOptions },
    {
      label: "Currency",
      payloadKey: "currency",
      type: "select",
      options: currencyBulkOptions,
      transform: (value: string) => String(value || "").trim().toUpperCase()
    },
    { label: "Discount", payloadKey: "discount", type: "number", placeholder: "0.00" },
    { label: "Shipping Charges", payloadKey: "shippingCharges", type: "number", placeholder: "0.00" },
    { label: "Adjustment", payloadKey: "adjustment", type: "number", placeholder: "0.00" },
    { label: "Total", payloadKey: "total", type: "number", placeholder: "0.00" },
    { label: "Customer Notes", payloadKey: "notes", type: "text", placeholder: "Enter customer notes" },
    { label: "Terms and Conditions", payloadKey: "terms", type: "text", placeholder: "Enter terms and conditions" },
    {
      label: "Status",
      payloadKey: "status",
      type: "select",
      options: [
        { label: "Active", value: "active" },
        { label: "Paused", value: "paused" },
        { label: "Stopped", value: "stopped" },
        { label: "Expired", value: "expired" }
      ]
    }
  ]), [currencyBulkOptions, customerBulkOptions, paymentTermsBulkOptions, salespersonBulkOptions]);

  const bulkUpdateFieldOptions = bulkFieldConfigs.map((config) => config.label);
  const selectedBulkFieldConfig = bulkFieldConfigs.find((config) => config.label === bulkUpdateField) || null;

  // Sort function
  const sortRecurringInvoices = (invoices: any[], sortBy: string, order: string) => {
    const sorted = [...invoices];

    sorted.sort((a, b) => {
      let aValue, bValue;

      switch (sortBy) {
        case "Created Time":
          aValue = new Date(a.createdAt || 0);
          bValue = new Date(b.createdAt || 0);
          break;
        case "Last Modified Time":
          aValue = new Date(a.updatedAt || a.createdAt || 0);
          bValue = new Date(b.updatedAt || b.createdAt || 0);
          break;
        case "Customer Name":
          aValue = (a.customerName || a.customer || "").toLowerCase();
          bValue = (b.customerName || b.customer || "").toLowerCase();
          break;
        case "Profile Name":
          aValue = (a.profileName || "").toLowerCase();
          bValue = (b.profileName || "").toLowerCase();
          break;
        case "Last Invoice Date":
          aValue = new Date(a.lastInvoiceDate || 0);
          bValue = new Date(b.lastInvoiceDate || 0);
          break;
        case "Next Invoice Date":
          aValue = new Date(a.nextInvoiceDate || a.startOn || 0);
          bValue = new Date(b.nextInvoiceDate || b.startOn || 0);
          break;
        case "Amount":
          aValue = parseFloat(a.total || a.amount || 0);
          bValue = parseFloat(b.total || b.amount || 0);
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return order === "asc" ? -1 : 1;
      if (aValue > bValue) return order === "asc" ? 1 : -1;
      return 0;
    });

    return sorted;
  };

  // Refresh data when returning to page
  const refreshData = () => {
    setIsRefreshing(true);
    setTimeout(async () => {
      try {
        const allRecurringInvoices = await getRecurringInvoices();
        const allCustomViews = getCustomViews().filter(v => v.type === "recurring-invoices");
        setRecurringInvoices(allRecurringInvoices);
        setCustomViews(allCustomViews);
        applyFilters(allRecurringInvoices, selectedStatus, allCustomViews);
      } catch (error) {
        console.error("Error refreshing recurring invoices:", error);
      } finally {
        setIsRefreshing(false);
        setHasLoadedOnce(true);
      }
    }, 1000);
  };

  useEffect(() => {
    const initialLoad = async () => {
      try {
        const [allRecurringInvoices, allCustomers, allSalespersons] = await Promise.all([
          getRecurringInvoices(),
          getCustomers({ limit: 1000 }),
          getSalespersonsFromAPI()
        ]);
        const allCustomViews = getCustomViews().filter(v => v.type === "recurring-invoices");
        setRecurringInvoices(allRecurringInvoices);
        setBulkCustomers(allCustomers || []);
        setBulkSalespersons(allSalespersons || []);
        setCustomViews(allCustomViews);
        applyFilters(allRecurringInvoices, selectedStatus, allCustomViews);
      } catch (error) {
        console.error("Error loading recurring invoices:", error);
        setRecurringInvoices([]);
        setFilteredRecurringInvoices([]);
      } finally {
        setHasLoadedOnce(true);
      }
    };

    initialLoad();

    // Automate Invoice Generation: Check for due invoices
    const automateInvoices = async () => {
      const allRecurringInvoices = await getRecurringInvoices();
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const activeAndDueInvoices = allRecurringInvoices.filter((inv: any) => {
        if ((inv.status || 'active').toLowerCase() !== 'active') return false;

        const nextDateStr = inv.nextInvoiceDate || inv.startOn;
        if (!nextDateStr) return false;

        const nextDate = new Date(nextDateStr);
        nextDate.setHours(0, 0, 0, 0);

        return nextDate <= today;
      });

      if (activeAndDueInvoices.length > 0) {
        console.log(`[AUTOMATION] Found ${activeAndDueInvoices.length} recurring invoices due for generation.`);
        let generatedCount = 0;

        for (const inv of activeAndDueInvoices) {
          try {
            const profileId = inv._id || inv.id;
            await generateInvoiceFromRecurring(profileId);
            generatedCount++;
          } catch (error) {
            console.error(`[AUTOMATION] Failed to generate invoice for profile ${inv.profileName}:`, error);
          }
        }

        if (generatedCount > 0) {
          setShowSuccessNotification(true);
          // Update message for the notification
          const notificationMsg = document.querySelector('.text-green-800');
          if (notificationMsg) {
            notificationMsg.textContent = `${generatedCount} invoice(s) have been automatically generated based on recurring schedules.`;
          }

          // Refresh lists to reflect new state (like nextInvoiceDate changes)
          const refreshed = await getRecurringInvoices();
          setRecurringInvoices(refreshed);
          applyFilters(refreshed, selectedStatus);

          setTimeout(() => setShowSuccessNotification(false), 5000);
        }
      }
    };

    automateInvoices();

    window.addEventListener("storage", initialLoad);
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) initialLoad();
    });

    return () => {
      window.removeEventListener("storage", initialLoad);
      document.removeEventListener("visibilitychange", initialLoad);
    };
  }, [selectedStatus, selectedSortBy, sortOrder]);

  useEffect(() => {
    const handleClickOutside = (event: { target: any; }) => {
      if (viewDropdownRef.current && !viewDropdownRef.current.contains(event.target)) {
        setIsViewDropdownOpen(false);
      }
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target)) {
        setIsMoreMenuOpen(false);
        setIsSortDropdownOpen(false);
        setIsExportDropdownOpen(false);
      }
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(event.target)) {
        setIsSortDropdownOpen(false);
      }
      if (exportDropdownRef.current && !exportDropdownRef.current.contains(event.target)) {
        setIsExportDropdownOpen(false);
      }
      if (fieldDropdownRef.current && !fieldDropdownRef.current.contains(event.target)) {
        setIsFieldDropdownOpen(false);
      }
      if (searchTypeDropdownRef.current && !searchTypeDropdownRef.current.contains(event.target)) {
        setIsSearchTypeDropdownOpen(false);
      }
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(event.target)) {
        setIsFilterDropdownOpen(false);
      }
    };

    if (isViewDropdownOpen || isMoreMenuOpen || isSortDropdownOpen || isExportDropdownOpen || isFieldDropdownOpen || isSearchTypeDropdownOpen || isFilterDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isViewDropdownOpen, isMoreMenuOpen, isSortDropdownOpen, isExportDropdownOpen, isFieldDropdownOpen]);

  // Keyboard support for Esc key
  useEffect(() => {
    const handleKeyDown = (event: { key: string; }) => {
      if (event.key === "Escape" && selectedInvoices.length > 0) {
        setSelectedInvoices([]);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectedInvoices]);

  const getRecurringInvoiceFieldValue = (inv: RecurringInvoice, fieldName: string): any => {
    const fieldMap: Record<string, any> = {
      "Profile Name": inv.profileName || "",
      "Customer Name": inv.customerName || inv.customer || "",
      "Repeat Every": inv.repeatEvery || "",
      "Amount": inv.total || inv.amount || 0,
      "Status": inv.status || "active",
      "Next Invoice Date": inv.nextInvoiceDate || inv.startOn || "",
      "Start On": inv.startOn || "",
      "Ends On": inv.endsOn || "",
      "Payment Terms": inv.paymentTerms || "",
      "Order Number": inv.orderNumber || ""
    };
    const key = String(fieldName);
    return fieldMap[key] !== undefined ? fieldMap[key] : "";
  };

  const evaluateCriterion = (fieldValue: any, comparator: any, value: any) => {
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

  const applyFilters = (invoices: RecurringInvoice[], status: string, views = customViews) => {
    let filtered = [...invoices];

    // Check if it's a custom view
    const customView = views.find(v => v.name === status);
    if (customView && customView.criteria) {
      filtered = filtered.filter(inv => {
        return customView.criteria.every((criterion: any) => {
          if (!criterion.field || !criterion.comparator) return true;
          const fieldValue = getRecurringInvoiceFieldValue(inv, criterion.field);
          return evaluateCriterion(fieldValue, criterion.comparator, criterion.value);
        });
      });
      const sorted = sortRecurringInvoices(filtered, selectedSortBy, sortOrder);
      setFilteredRecurringInvoices(sorted);
      return;
    }

    // Apply status filter
    if (status !== "All") {
      const statusMap: Record<string, string> = {
        "Active": "active",
        "Stopped": "stopped",
        "Expired": "expired"
      };
      filtered = filtered.filter(inv => inv.status === (statusMap[String(status)] || String(status).toLowerCase()));
    }

    // Apply sorting
    const sorted = sortRecurringInvoices(filtered, selectedSortBy, sortOrder);
    setFilteredRecurringInvoices(sorted);
  };

  const handleStatusFilter = (status: React.SetStateAction<string>) => {
    setSelectedStatus(status);
    setIsViewDropdownOpen(false);
    if (status === "All") {
      setSelectedView("All Recurring Invoices");
    } else {
      setSelectedView(status);
    }
  };

  const handleNewCustomView = () => {
    setIsViewDropdownOpen(false);
    navigate("/sales/recurring-invoices/custom-view/new");
  };

  const handleDeleteCustomView = (viewId: string, e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
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

  const filteredDefaultViews = statusFilterOptions.filter(view =>
    view.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredCustomViews = customViews.filter(view =>
    view.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isViewSelected = (view: string) => {
    return selectedStatus === view;
  };

  const handleCreateNewRecurringInvoice = () => {
    navigate("/sales/recurring-invoices/new");
  };

  const handleSortSelect = (sortOption: React.SetStateAction<string>) => {
    // If clicking the same option, toggle sort order
    if (selectedSortBy === sortOption) {
      setSortOrder(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSelectedSortBy(sortOption);
      setSortOrder("desc"); // Default to descending
    }
    setIsSortDropdownOpen(false);
    // Keep the main menu open so user can perform other actions
  };

  const handleSortByClick = (e: { stopPropagation: () => void; }) => {
    e.stopPropagation();
    setIsSortDropdownOpen(!isSortDropdownOpen);
  };

  const handleImport = () => {
    setIsMoreMenuOpen(false);
    setIsSortDropdownOpen(false);
    setIsExportDropdownOpen(false);
    navigate("/sales/recurring-invoices/import");
  };

  const handleExport = (exportType: string) => {
    setIsExportDropdownOpen(false);
    setIsMoreMenuOpen(false);

    // Use filtered invoices for export
    const invoicesToExport = filteredRecurringInvoices.length > 0
      ? filteredRecurringInvoices
      : recurringInvoices;

    if (invoicesToExport.length === 0) {
      alert("No recurring invoices to export.");
      return;
    }

    try {
      if (exportType === "Export to PDF") {
        exportToPDF(invoicesToExport);
      } else if (exportType === "Export to Excel") {
        exportToExcel(invoicesToExport);
      } else if (exportType === "Export to CSV") {
        exportToCSV(invoicesToExport);
      }
    } catch (error) {
      console.error("Export error:", error);
      alert(`Error exporting ${exportType.toLowerCase()}. Please try again.`);
    }
  };

  const handlePreferences = () => {
    setIsMoreMenuOpen(false);
    setIsSortDropdownOpen(false);
    setIsExportDropdownOpen(false);
    navigate("/settings/recurring-invoices");
  };

  const handleRefresh = () => {
    if (!isRefreshing) {
      refreshData();
      setIsMoreMenuOpen(false);
      setIsSortDropdownOpen(false);
      setIsExportDropdownOpen(false);
    }
  };

  // Selection handlers
  const handleSelectAll = (e: { target: { checked: any; }; }) => {
    if (e.target.checked) {
      setSelectedInvoices(filteredRecurringInvoices.map(inv => String(inv.id)));
    } else {
      setSelectedInvoices([]);
    }
  };

  const handleSelectInvoice = (invoiceId: string, e: React.ChangeEvent<HTMLInputElement> | React.MouseEvent<HTMLTableDataCellElement, MouseEvent>) => {
    e.stopPropagation();
    setSelectedInvoices(prev => {
      if (prev.includes(invoiceId)) {
        return prev.filter(id => id !== invoiceId);
      } else {
        return [...prev, invoiceId];
      }
    });
  };

  const handleClearSelection = () => {
    setSelectedInvoices([]);
  };

  // Bulk action handlers
  const handleBulkUpdate = () => {
    setIsBulkUpdateModalOpen(true);
    setBulkUpdateField("");
    setBulkUpdateValue("");
  };

  const handleCloseBulkUpdateModal = () => {
    setIsBulkUpdateModalOpen(false);
    setBulkUpdateField("");
    setBulkUpdateValue("");
    setIsFieldDropdownOpen(false);
  };

  const handleBulkUpdateSubmit = async () => {
    if (!bulkUpdateField || !selectedBulkFieldConfig) {
      alert("Please select a field.");
      return;
    }

    const rawValue = String(bulkUpdateValue || "").trim();
    if (!rawValue) {
      alert("Please enter a value.");
      return;
    }

    if (selectedInvoices.length === 0) {
      alert("Please select at least one recurring invoice.");
      return;
    }

    let parsedValue: any = rawValue;

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
      parsedValue = parsedDate.toISOString();
    }

    if (selectedBulkFieldConfig.transform) {
      parsedValue = selectedBulkFieldConfig.transform(rawValue);
    }

    const updatePayload: Record<string, any> = {
      [selectedBulkFieldConfig.payloadKey]: parsedValue
    };

    if (selectedBulkFieldConfig.payloadKey === "customer") {
      updatePayload.customerId = parsedValue;
    }

    // Update selected invoices via API
    const count = selectedInvoices.length;
    try {
      await Promise.all(selectedInvoices.map(async (invoiceId) => {
        await updateRecurringInvoice(String(invoiceId), updatePayload);
      }));

      // Reload data
      const allRecurringInvoices = await getRecurringInvoices();
      setRecurringInvoices(allRecurringInvoices);
      applyFilters(allRecurringInvoices, selectedStatus);
      setSelectedInvoices([]);
      handleCloseBulkUpdateModal();
      alert(`${count} recurring invoice(s) updated successfully.`);
    } catch (error) {
      console.error("Error updating invoices:", error);
      alert("Failed to update some invoices.");
    }
  };

  const renderBulkValueInput = () => {
    if (!selectedBulkFieldConfig) {
      return (
        <input
          type="text"
          value={bulkUpdateValue}
          onChange={(e) => setBulkUpdateValue(e.target.value)}
          placeholder="Select a field first"
          disabled
          style={{
            flex: 1,
            padding: "10px 12px",
            border: "1px solid #d1d5db",
            borderRadius: "6px",
            fontSize: "14px",
            color: "#9ca3af",
            backgroundColor: "#f9fafb",
            outline: "none"
          }}
        />
      );
    }

    if (selectedBulkFieldConfig.type === "select") {
      return (
        <select
          value={bulkUpdateValue}
          onChange={(e) => setBulkUpdateValue(e.target.value)}
          style={{
            flex: 1,
            padding: "10px 12px",
            border: "1px solid #3b82f6",
            borderRadius: "6px",
            fontSize: "14px",
            color: "#111827",
            backgroundColor: "#ffffff",
            outline: "none"
          }}
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
        value={bulkUpdateValue}
        onChange={(e) => setBulkUpdateValue(e.target.value)}
        placeholder={selectedBulkFieldConfig.placeholder || "Enter new value"}
        style={{
          flex: 1,
          padding: "10px 12px",
          border: "1px solid #3b82f6",
          borderRadius: "6px",
          fontSize: "14px",
          color: "#111827",
          outline: "none"
        }}
        onFocus={(e: React.FocusEvent<HTMLInputElement>) => (e.currentTarget as HTMLInputElement).style.borderColor = "#2563eb"}
        onBlur={(e: React.FocusEvent<HTMLInputElement>) => (e.currentTarget as HTMLInputElement).style.borderColor = "#3b82f6"}
      />
    );
  };

  const handleBulkResume = async () => {
    if (selectedInvoices.length === 0) {
      alert("Please select at least one recurring invoice.");
      return;
    }
    try {
      await Promise.all(selectedInvoices.map(invoiceId =>
        updateRecurringInvoice(String(invoiceId), { status: 'active' })
      ));

      const allRecurringInvoices = await getRecurringInvoices();
      setRecurringInvoices(allRecurringInvoices);
      applyFilters(allRecurringInvoices, selectedStatus);
      setSelectedInvoices([]);
      alert(`${selectedInvoices.length} recurring invoice(s) resumed successfully.`);
    } catch (error) {
      console.error("Error resuming invoices:", error);
      alert("Failed to resume some invoices.");
    }
  };

  const handleBulkStop = async () => {
    if (selectedInvoices.length === 0) {
      alert("Please select at least one recurring invoice.");
      return;
    }

    try {
      await Promise.all(selectedInvoices.map(invoiceId =>
        updateRecurringInvoice(String(invoiceId), { status: 'stopped' })
      ));

      const allRecurringInvoices = await getRecurringInvoices();
      setRecurringInvoices(allRecurringInvoices);
      applyFilters(allRecurringInvoices, selectedStatus);
      setSelectedInvoices([]);
      alert(`${selectedInvoices.length} recurring invoice(s) stopped successfully.`);
    } catch (error) {
      console.error("Error stopping invoices:", error);
      alert("Failed to stop some invoices.");
    }
  };

  const handleBulkDelete = async () => {
    if (selectedInvoices.length === 0) {
      alert("Please select at least one recurring invoice.");
      return;
    }

    const count = selectedInvoices.length;
    const confirmMessage = `Are you sure you want to delete ${count} recurring invoice(s)? This action cannot be undone.`;

    if (window.confirm(confirmMessage)) {
      try {
        // Delete selected invoices
        await Promise.all(selectedInvoices.map(invoiceId =>
          deleteRecurringInvoice(invoiceId)
        ));

        // Reload data
        const allRecurringInvoices = await getRecurringInvoices();
        setRecurringInvoices(allRecurringInvoices);
        applyFilters(allRecurringInvoices, selectedStatus);
        setSelectedInvoices([]);
        alert(`${count} recurring invoice(s) deleted successfully.`);
      } catch (error) {
        console.error("Error deleting invoices:", error);
        alert("Failed to delete some invoices.");
      }
    }
  };

  return (
    <div className="w-full min-h-screen bg-gray-50">
      {/* Success Notification */}
      {showSuccessNotification && (
        <div className="fixed top-4 right-4 flex items-center gap-3 px-4 py-3 bg-green-50 border border-green-200 rounded-lg shadow-lg z-50">
          <div className="flex-shrink-0">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <rect width="20" height="20" rx="4" fill="#10b981" />
              <path d="M6 10l3 3 5-6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <span className="text-sm text-green-800">
            The recurring invoice has been activated.
          </span>
        </div>
      )}

      {/* Header - Show Bulk Actions Bar when items are selected, otherwise show normal header */}
      {selectedInvoices.length > 0 ? (
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-white">
          <div className="flex items-center gap-2">
            <button
              className="flex items-center gap-1.5 py-2 px-4 bg-gradient-to-r from-[#156372] to-[#0D4A52] rounded-md text-sm font-medium text-white cursor-pointer transition-all hover:opacity-90 shadow-sm"
              onClick={handleBulkUpdate}
            >
              Bulk Update
            </button>
            <button
              className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-md text-sm font-medium cursor-pointer hover:bg-gray-50 hover:border-gray-300"
              onClick={handleBulkResume}
            >
              Resume
            </button>
            <button
              className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-md text-sm font-medium cursor-pointer hover:bg-gray-50 hover:border-gray-300"
              onClick={handleBulkStop}
            >
              Stop
            </button>
            <button
              className="px-4 py-2 bg-white border border-red-300 text-red-600 rounded-md text-sm font-medium cursor-pointer hover:bg-red-50 hover:border-red-300 flex items-center gap-2"
              onClick={handleBulkDelete}
            >
              <Trash2 size={16} />
              Delete
            </button>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center min-w-[24px] h-6 px-2 bg-gradient-to-r from-[#156372] to-[#0D4A52] rounded text-[13px] font-semibold text-white">
              {selectedInvoices.length}
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
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white">
          <div className="flex items-center gap-3">
            <div className="relative" ref={viewDropdownRef}>
              <button
                onClick={() => setIsViewDropdownOpen(!isViewDropdownOpen)}
                className="p-1 text-gray-600 hover:text-gray-900 cursor-pointer"
              >
                <ChevronRight size={20} className="text-gray-600" />
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
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="flex-1 outline-none text-sm text-gray-700 bg-transparent"
                    />
                  </div>

                  {/* View Options Scroll Area */}
                  <div className="flex-1 overflow-y-auto custom-scrollbar pt-2">
                    {/* Default Views */}
                    <div className="px-3 pb-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-white">
                      System Views
                    </div>
                    {filteredDefaultViews.map((option) => (
                      <div
                        key={option}
                        className={`group flex items-center justify-between px-4 py-2.5 text-sm cursor-pointer transition-all ${isViewSelected(option) ? "bg-[#15637210] text-[#156372]" : "text-gray-900 hover:bg-gray-50"
                          }`}
                        onClick={() => handleStatusFilter(option)}
                      >
                        <div className="flex items-center gap-3">
                          <Eye size={16} className={isViewSelected(option) ? "text-blue-500" : "text-gray-400 opacity-40"} />
                          <span>{option}</span>
                        </div>
                        {isViewSelected(option) && <Check size={14} className="text-[#156372]" />}
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
                            className={`group flex items-center justify-between px-4 py-2.5 text-sm cursor-pointer transition-all ${isViewSelected(view.name) ? "bg-[#15637210] text-[#156372]" : "text-gray-900 hover:bg-gray-50"
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
                              {isViewSelected(view.name) && <Check size={14} className="text-[#156372]" />}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* New Custom View */}
                  <button
                    className="flex items-center justify-center gap-2 p-4 border-t border-gray-100 bg-white text-[#156372] text-sm font-bold cursor-pointer hover:bg-gray-50 transition-all active:scale-[0.98] w-full"
                    onClick={handleNewCustomView}
                  >
                    <Plus size={18} strokeWidth={3} />
                    New Custom View
                  </button>
                </div>
              )}
            </div>
            <h1 className="text-3xl font-bold text-gray-800">{selectedView}</h1>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              className="cursor-pointer transition-all bg-gradient-to-r from-[#156372] to-[#0D4A52] text-white px-6 py-2 rounded-lg hover:opacity-90 active:scale-95 flex items-center gap-2 text-sm font-bold shadow-md"
              onClick={handleCreateNewRecurringInvoice}
            >
              <Plus size={16} strokeWidth={3} />
              New
            </button>
            <div className="relative" ref={moreMenuRef}>
              <button
                className="w-10 h-10 flex items-center justify-center bg-white border border-gray-300 text-gray-700 rounded-md cursor-pointer hover:bg-gray-50"
                onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
              >
                <MoreVertical size={18} className="text-gray-600" />
              </button>

              {isMoreMenuOpen && (
                <>
                  <div className="absolute top-full right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 min-w-[200px]">
                    <div
                      className={`flex items-center gap-2 px-4 py-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-50 relative ${isSortDropdownOpen ? "bg-[#15637210] text-[#156372]" : ""
                        }`}
                      onClick={handleSortByClick}
                    >
                      <ArrowUpDown size={16} className="text-gray-500" />
                      <span>Sort by</span>
                      <ChevronRight size={16} className="text-gray-400 ml-auto" />
                      {/* Sort By Dropdown */}
                      {isSortDropdownOpen && (
                        <div
                          className="absolute right-full mr-3 top-0 bg-white border border-gray-200 rounded-md shadow-lg z-50 min-w-[180px]"
                          ref={sortDropdownRef}
                        >
                          {sortOptions.map((option) => (
                            <div
                              key={option}
                              className={`flex items-center justify-between px-4 py-2 text-sm cursor-pointer hover:bg-gray-50 ${selectedSortBy === option ? "bg-[#15637210] text-[#156372]" : "text-gray-700"
                                }`}
                              onClick={() => handleSortSelect(option)}
                            >
                              <span>{option}</span>
                              {selectedSortBy === option && (
                                <ChevronDown
                                  size={16}
                                  className={`text-[#156372] transition-transform ${sortOrder === "asc" ? "rotate-180" : ""
                                    }`}
                                />
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="relative flex items-center gap-2 px-4 py-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-50 group">
                      <Download size={16} className="text-gray-500" />
                      <span className="flex-1">Import</span>
                      <ChevronRightIcon size={16} className="text-gray-400 group-hover:text-gray-600" />
                      {/* Import Submenu */}
                      <div className="absolute top-0 right-full mr-1 min-w-[180px] bg-white border border-gray-200 rounded-lg shadow-lg py-2 z-[99999] pointer-events-none opacity-0 translate-x-2 transition-all group-hover:pointer-events-auto group-hover:opacity-100 group-hover:translate-x-0">
                        <div
                          className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-50"
                          onClick={handleImport}
                        >
                          <span>Import Recurring Invoices</span>
                        </div>
                      </div>
                    </div>
                    <div
                      className={`flex items-center gap-2 px-4 py-2 text-sm cursor-pointer hover:bg-gray-50 relative ${isExportDropdownOpen ? "bg-[#15637210] text-[#156372]" : "text-gray-700"
                        }`}
                      onClick={() => setIsExportDropdownOpen(!isExportDropdownOpen)}
                    >
                      <FileUp size={16} className="text-gray-500" />
                      <span>Export</span>
                      <ChevronRight size={16} className="text-gray-400 ml-auto" />
                    </div>
                    <div
                      className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-50"
                      onClick={handlePreferences}
                    >
                      <Settings size={16} className="text-gray-500" />
                      <span>Preferences</span>
                    </div>
                    <div
                      className={`flex items-center gap-2 px-4 py-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-50 ${isRefreshing ? "opacity-50 cursor-not-allowed" : ""}`}
                      onClick={handleRefresh}
                    >
                      <RefreshCw size={16} className={`text-[#156372] flex-shrink-0 ${isRefreshing ? "animate-spin" : ""}`} />
                      <span className="flex-1">Refresh List</span>
                    </div>
                  </div>


                  {/* Export Dropdown */}
                  {isExportDropdownOpen && (
                    <div
                      className="absolute top-[80px] right-0 bg-white border border-gray-200 rounded-md shadow-lg z-50 min-w-[150px]"
                      ref={exportDropdownRef}
                    >
                      {exportOptions.map((option) => (
                        <div
                          key={option}
                          className="px-4 py-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-50"
                          onClick={() => handleExport(option)}
                        >
                          {option}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="p-6 relative">

        {!hasLoadedOnce ? (
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="p-3 text-left"></th>
                  {visibleColumns.map((colKey) => {
                    const col = recurringColumnOptions.find(c => c.key === colKey);
                    if (!col) return null;
                    return (
                      <th key={colKey} className="p-3 text-left text-xs font-semibold text-gray-700 uppercase">
                        {col.label}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {Array(5).fill(0).map((_, index) => (
                  <tr key={`initial-skeleton-${index}`} className="border-b border-gray-200">
                    <td className="p-3">
                      <div className="w-4 h-4 bg-gray-200 rounded animate-pulse"></div>
                    </td>
                    {visibleColumns.map((colKey) => (
                      <td key={`initial-${index}-${colKey}`} className="p-3">
                        <div className="h-4 bg-gray-200 rounded animate-pulse w-24"></div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : filteredRecurringInvoices.length === 0 && !isRefreshing ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            {/* Video Thumbnail */}
            <div className="mb-8">
              <div className="relative w-64 h-40 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg overflow-hidden">
                <div className="absolute inset-0 flex items-center justify-center">
                  <button className="flex items-center justify-center w-16 h-16 bg-white bg-opacity-20 rounded-full hover:bg-opacity-30 transition-all cursor-pointer">
                    <Play size={24} fill="#ffffff" />
                  </button>
                  <div className="absolute bottom-4 left-4 flex items-center gap-2">
                    <div className="flex items-center justify-center w-8 h-8 bg-white bg-opacity-20 rounded text-white text-xs font-bold">
                      TB
                    </div>
                    <div className="text-white text-sm font-semibold">Taban Books</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Headline */}
            <h2 className="text-3xl font-bold text-gray-900 mb-3">Create. Set. Repeat.</h2>

            {/* Description */}
            <p className="text-gray-600 mb-6 max-w-md">
              Set up a profile to periodically create and send invoices to your customers.
            </p>

            {/* Action Button */}
            <div className="mb-4">
              <button
                className="px-6 py-3 bg-gradient-to-r from-[#156372] to-[#0D4A52] text-white rounded-md text-sm font-semibold uppercase cursor-pointer hover:opacity-90 transition-all shadow-md"
                onClick={handleCreateNewRecurringInvoice}
              >
                CREATE NEW RECURRING INVOICE
              </button>
            </div>

            {/* Import Link */}
            <button
              className="text-sm text-[#156372] hover:text-blue-700 underline cursor-pointer"
              onClick={handleImport}
            >
              Import Recurring Invoices
            </button>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">

                  <th className="p-3 text-left">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        className="w-4 h-4 cursor-pointer"
                        checked={selectedInvoices.length === filteredRecurringInvoices.length && filteredRecurringInvoices.length > 0}
                        onChange={handleSelectAll}
                      />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                          setHeaderMenuPosition({ top: rect.bottom + window.scrollY, left: rect.left + window.scrollX });
                          setIsHeaderMenuOpen(true);
                        }}
                        className="p-1 text-gray-500 hover:text-gray-700 cursor-pointer"
                        title="Customize Columns"
                      >
                        <SlidersHorizontal size={14} />
                      </button>
                    </div>
                  </th>
                  {visibleColumns.map((colKey) => {
                    const col = recurringColumnOptions.find(c => c.key === colKey);
                    if (!col) return null;
                    if (colKey === "amount") {
                      return (
                        <th key={colKey} className="p-3 text-left text-xs font-semibold text-gray-700 uppercase">
                          <div className="flex items-center gap-2">
                            {col.label}
                            <button
                              onClick={() => setShowSearchModal(true)}
                              className="cursor-pointer hover:text-gray-600"
                            >
                              <Search size={14} className="text-gray-400" />
                            </button>
                          </div>
                        </th>
                      );
                    }
                    return (
                      <th key={colKey} className="p-3 text-left text-xs font-semibold text-gray-700 uppercase">{col.label}</th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {isRefreshing ? (
                  Array(5).fill(0).map((_, index) => (
                    <tr key={`skeleton-${index}`} className="border-b border-gray-200">

                      <td className="p-3">
                        <div className="w-4 h-4 bg-gray-200 rounded animate-pulse"></div>
                      </td>
                      {visibleColumns.map((colKey) => (
                        <td key={`${index}-${colKey}`} className="p-3">
                          <div className="h-4 bg-gray-200 rounded animate-pulse w-24"></div>
                        </td>
                      ))}
                    </tr>
                  ))
                ) : (
                  filteredRecurringInvoices.map((recurringInvoice) => (
                    <tr
                      key={recurringInvoice.id}
                      className="border-b border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => navigate(`/sales/recurring-invoices/${String(recurringInvoice.id)}`)}
                    >

                      <td className="p-3" onClick={(e) => handleSelectInvoice(String(recurringInvoice.id), e)}>
                        <input
                          type="checkbox"
                          className="w-4 h-4 cursor-pointer"
                          checked={selectedInvoices.includes(String(recurringInvoice.id))}
                          onChange={(e) => handleSelectInvoice(String(recurringInvoice.id), e)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </td>
                      {visibleColumns.map((colKey) => (
                        <td key={`${recurringInvoice.id}-${colKey}`} className="p-3">
                          {renderRecurringCell(recurringInvoice, colKey)}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Bulk Update Modal */}
      {
        isBulkUpdateModalOpen && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0, 0, 0, 0.5)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 10000
            }}
            onClick={handleCloseBulkUpdateModal}
          >
            <div
              style={{
                backgroundColor: "white",
                borderRadius: "12px",
                width: "90%",
                maxWidth: "600px",
                display: "flex",
                flexDirection: "column",
                boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
                padding: "32px"
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: "24px"
              }}>
                <h2 style={{
                  fontSize: "24px",
                  fontWeight: "700",
                  color: "#111827",
                  margin: 0
                }}>
                  Bulk Update Recurring Invoices
                </h2>
                <button
                  onClick={handleCloseBulkUpdateModal}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: "4px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: "4px",
                    color: "#ef4444"
                  }}
                  onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => e.currentTarget.style.backgroundColor = "#fef2f2"}
                  onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => e.currentTarget.style.backgroundColor = "transparent"}
                >
                  <X size={24} />
                </button>
              </div>

              {/* Instructions */}
              <p style={{
                fontSize: "14px",
                color: "#6b7280",
                marginBottom: "24px",
                lineHeight: "1.5"
              }}>
                Choose a field from the dropdown and update with new information.
              </p>

              {/* Input Fields */}
              <div style={{
                display: "flex",
                gap: "12px",
                marginBottom: "24px"
              }}>
                {/* Field Dropdown */}
                <div style={{ flex: 1, position: "relative" }} ref={fieldDropdownRef}>
                  <div
                    style={{
                      position: "relative",
                      width: "100%"
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setIsFieldDropdownOpen(!isFieldDropdownOpen)}
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        border: "1px solid #3b82f6",
                        borderRadius: "6px",
                        backgroundColor: "#ffffff",
                        fontSize: "14px",
                        color: bulkUpdateField ? "#111827" : "#9ca3af",
                        textAlign: "left",
                        cursor: "pointer",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center"
                      }}
                    >
                      <span>{bulkUpdateField || "Select a field"}</span>
                      <ChevronDown size={20} style={{ color: "#6b7280" }} />
                    </button>

                    {isFieldDropdownOpen && (
                      <div style={{
                        position: "absolute",
                        top: "100%",
                        left: 0,
                        right: 0,
                        marginTop: "4px",
                        backgroundColor: "white",
                        border: "1px solid #e5e7eb",
                        borderRadius: "6px",
                        boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
                        zIndex: 1001,
                        maxHeight: "200px",
                        overflowY: "auto"
                      }}>
                        {bulkUpdateFieldOptions.map((option) => (
                          <div
                            key={option}
                            onClick={() => {
                              setBulkUpdateField(option);
                              setBulkUpdateValue("");
                              setIsFieldDropdownOpen(false);
                            }}
                            style={{
                              padding: "10px 12px",
                              cursor: "pointer",
                              fontSize: "14px",
                              color: "#374151",
                              transition: "background-color 0.2s",
                              backgroundColor: bulkUpdateField === option ? "#eff6ff" : "transparent"
                            }}
                            onMouseEnter={(e) => {
                              if (bulkUpdateField !== option) {
                                (e as React.MouseEvent<HTMLDivElement>).currentTarget.style.backgroundColor = "#f9fafb";
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (bulkUpdateField !== option) {
                                (e as React.MouseEvent<HTMLDivElement>).currentTarget.style.backgroundColor = "transparent";
                              }
                            }}
                          >
                            {option}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Value Input */}
                {renderBulkValueInput()}
              </div>

              {/* Warning Note */}
              <div style={{
                marginBottom: "24px",
                padding: "12px",
                backgroundColor: "#fef3c7",
                borderRadius: "6px",
                border: "1px solid #fde68a"
              }}>
                <p style={{
                  fontSize: "14px",
                  color: "#92400e",
                  margin: 0,
                  lineHeight: "1.5"
                }}>
                  <strong>Note:</strong> All the selected recurring invoices will be updated with the new information and you cannot undo this action.
                </p>
              </div>

              {/* Action Buttons */}
              <div style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "12px"
              }}>
                <button
                  onClick={handleCloseBulkUpdateModal}
                  style={{
                    padding: "10px 20px",
                    backgroundColor: "white",
                    border: "1px solid #d1d5db",
                    borderRadius: "6px",
                    fontSize: "14px",
                    fontWeight: "500",
                    color: "#374151",
                    cursor: "pointer",
                    transition: "all 0.2s"
                  }}
                  onMouseEnter={(e) => {
                    (e as React.MouseEvent<HTMLButtonElement>).currentTarget.style.backgroundColor = "#f9fafb";
                    (e as React.MouseEvent<HTMLButtonElement>).currentTarget.style.borderColor = "#9ca3af";
                  }}
                  onMouseLeave={(e) => {
                    (e as React.MouseEvent<HTMLButtonElement>).currentTarget.style.backgroundColor = "white";
                    (e as React.MouseEvent<HTMLButtonElement>).currentTarget.style.borderColor = "#d1d5db";
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleBulkUpdateSubmit}
                  className="px-6 py-2 bg-gradient-to-r from-[#156372] to-[#0D4A52] text-white rounded-md text-sm font-medium cursor-pointer hover:opacity-90 shadow-sm transition-all"
                >
                  Update
                </button>
              </div>
            </div>
          </div>
        )
      }

      {/* Search Modal */}
      {
        showSearchModal && (
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
                        className={`flex items-center justify-between w-[180px] py-2 px-3 text-sm text-gray-700 bg-white border rounded-md cursor-pointer transition-colors ${isSearchTypeDropdownOpen ? "border-[#156372]" : "border-gray-300 hover:border-gray-400"}`}
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
                                  recurringInvoiceNumber: "",
                                  profileName: "",
                                  name: "",
                                  startDateRangeFrom: "",
                                  startDateRangeTo: "",
                                  endDateRangeFrom: "",
                                  endDateRangeTo: "",
                                  itemNameRecurring: "",
                                  itemDescriptionRecurring: "",
                                  notesRecurring: "",
                                  statusRecurring: "",
                                  customerNameRecurring: "",
                                  taxExemptionsRecurring: "",
                                  addressTypeRecurring: "Billing and Shipping",
                                  attentionRecurring: "",
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
                        className={`flex items-center justify-between w-[200px] py-2 px-3 text-sm text-gray-700 bg-white border rounded-md cursor-pointer transition-colors ${isFilterDropdownOpen ? "border-[#156372]" : "border-gray-300 hover:border-gray-400"}`}
                        onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)}
                      >
                        <span>{selectedView}</span>
                        <ChevronDown size={16} className={`text-gray-500 transition-transform ${isFilterDropdownOpen ? "rotate-180" : ""}`} />
                      </div>
                      {isFilterDropdownOpen && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#156372] border-t-0 rounded-b-md shadow-lg z-[1002] max-h-[200px] overflow-y-auto">
                          {statusFilterOptions.map((view) => (
                            <div
                              key={view}
                              className="py-2.5 px-3.5 text-sm text-gray-700 cursor-pointer transition-colors hover:bg-gray-100"
                              onClick={() => {
                                setSelectedStatus(view);
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
                      recurringInvoiceNumber: "",
                      profileName: "",
                      name: "",
                      startDateRangeFrom: "",
                      startDateRangeTo: "",
                      endDateRangeFrom: "",
                      endDateRangeTo: "",
                      itemNameRecurring: "",
                      itemDescriptionRecurring: "",
                      notesRecurring: "",
                      statusRecurring: "",
                      customerNameRecurring: "",
                      taxExemptionsRecurring: "",
                      addressTypeRecurring: "Billing and Shipping",
                      attentionRecurring: "",
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
                {searchType === "Recurring Invoices" && (
                  <div className="grid grid-cols-2 gap-6">
                    {/* Left Column */}
                    <div className="space-y-4">
                      {/* Name */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Name</label>
                        <input
                          type="text"
                          value={searchModalData.name}
                          onChange={(e) => setSearchModalData(prev => ({ ...prev, name: e.target.value }))}
                          className="w-full py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-[#156372] focus:ring-1 focus:ring-blue-600"
                        />
                      </div>

                      {/* End Date Range */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">End Date Range</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            placeholder="dd/MM/yyyy"
                            value={searchModalData.endDateRangeFrom}
                            onChange={(e) => setSearchModalData(prev => ({ ...prev, endDateRangeFrom: e.target.value }))}
                            className="flex-1 py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-[#156372] focus:ring-1 focus:ring-blue-600"
                          />
                          <span className="text-gray-500">-</span>
                          <input
                            type="text"
                            placeholder="dd/MM/yyyy"
                            value={searchModalData.endDateRangeTo}
                            onChange={(e) => setSearchModalData(prev => ({ ...prev, endDateRangeTo: e.target.value }))}
                            className="flex-1 py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-[#156372] focus:ring-1 focus:ring-blue-600"
                          />
                        </div>
                      </div>

                      {/* Item Name */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Item Name</label>
                        <div className="relative" ref={itemNameRecurringDropdownRef}>
                          <div
                            className={`flex items-center justify-between w-full py-2 px-3 text-sm text-gray-700 bg-white border rounded-md cursor-pointer transition-colors ${isItemNameRecurringDropdownOpen ? "border-[#156372]" : "border-gray-300 hover:border-gray-400"}`}
                            onClick={() => setIsItemNameRecurringDropdownOpen(!isItemNameRecurringDropdownOpen)}
                          >
                            <span className={searchModalData.itemNameRecurring ? "text-gray-700" : "text-gray-400"}>
                              {searchModalData.itemNameRecurring || "Select an item"}
                            </span>
                            <ChevronDown size={16} className={`text-gray-500 transition-transform ${isItemNameRecurringDropdownOpen ? "rotate-180" : ""}`} />
                          </div>
                          {isItemNameRecurringDropdownOpen && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#156372] border-t-0 rounded-b-md shadow-lg z-[1002]">
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
                          value={searchModalData.notesRecurring}
                          onChange={(e) => setSearchModalData(prev => ({ ...prev, notesRecurring: e.target.value }))}
                          className="w-full py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-[#156372] focus:ring-1 focus:ring-blue-600"
                        />
                      </div>

                      {/* Customer Name */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Customer Name</label>
                        <div className="relative" ref={customerNameRecurringDropdownRef}>
                          <div
                            className={`flex items-center justify-between w-full py-2 px-3 text-sm text-gray-700 bg-white border rounded-md cursor-pointer transition-colors ${isCustomerNameRecurringDropdownOpen ? "border-[#156372]" : "border-gray-300 hover:border-gray-400"}`}
                            onClick={() => setIsCustomerNameRecurringDropdownOpen(!isCustomerNameRecurringDropdownOpen)}
                          >
                            <span className={searchModalData.customerNameRecurring ? "text-gray-700" : "text-gray-400"}>
                              {searchModalData.customerNameRecurring || "Select customer"}
                            </span>
                            <ChevronDown size={16} className={`text-gray-500 transition-transform ${isCustomerNameRecurringDropdownOpen ? "rotate-180" : ""}`} />
                          </div>
                          {isCustomerNameRecurringDropdownOpen && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#156372] border-t-0 rounded-b-md shadow-lg z-[1002]">
                              <div className="py-2.5 px-3.5 text-sm text-gray-500">No options available</div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right Column */}
                    <div className="space-y-4">
                      {/* Start Date Range */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Start Date Range</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            placeholder="dd/MM/yyyy"
                            value={searchModalData.startDateRangeFrom}
                            onChange={(e) => setSearchModalData(prev => ({ ...prev, startDateRangeFrom: e.target.value }))}
                            className="flex-1 py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-[#156372] focus:ring-1 focus:ring-blue-600"
                          />
                          <span className="text-gray-500">-</span>
                          <input
                            type="text"
                            placeholder="dd/MM/yyyy"
                            value={searchModalData.startDateRangeTo}
                            onChange={(e) => setSearchModalData(prev => ({ ...prev, startDateRangeTo: e.target.value }))}
                            className="flex-1 py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-[#156372] focus:ring-1 focus:ring-blue-600"
                          />
                        </div>
                      </div>

                      {/* Status */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Status</label>
                        <div className="relative" ref={statusRecurringDropdownRef}>
                          <div
                            className={`flex items-center justify-between w-full py-2 px-3 text-sm text-gray-700 bg-white border rounded-md cursor-pointer transition-colors ${isStatusRecurringDropdownOpen ? "border-[#156372]" : "border-gray-300 hover:border-gray-400"}`}
                            onClick={() => setIsStatusRecurringDropdownOpen(!isStatusRecurringDropdownOpen)}
                          >
                            <span className={searchModalData.statusRecurring ? "text-gray-700" : "text-gray-400"}>
                              {searchModalData.statusRecurring || "Select"}
                            </span>
                            <ChevronDown size={16} className={`text-gray-500 transition-transform ${isStatusRecurringDropdownOpen ? "rotate-180" : ""}`} />
                          </div>
                          {isStatusRecurringDropdownOpen && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#156372] border-t-0 rounded-b-md shadow-lg z-[1002]">
                              {["All", "Active", "Stopped", "Expired"].map((status) => (
                                <div
                                  key={status}
                                  className="py-2.5 px-3.5 text-sm text-gray-700 cursor-pointer transition-colors hover:bg-gray-100"
                                  onClick={() => {
                                    setSearchModalData(prev => ({ ...prev, statusRecurring: status }));
                                    setIsStatusRecurringDropdownOpen(false);
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
                          value={searchModalData.itemDescriptionRecurring}
                          onChange={(e) => setSearchModalData(prev => ({ ...prev, itemDescriptionRecurring: e.target.value }))}
                          className="w-full py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-[#156372] focus:ring-1 focus:ring-blue-600"
                        />
                      </div>

                      {/* Tax Exemptions */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Tax Exemptions</label>
                        <div className="relative" ref={taxExemptionsRecurringDropdownRef}>
                          <div
                            className={`flex items-center justify-between w-full py-2 px-3 text-sm text-gray-700 bg-white border rounded-md cursor-pointer transition-colors ${isTaxExemptionsRecurringDropdownOpen ? "border-[#156372]" : "border-gray-300 hover:border-gray-400"}`}
                            onClick={() => setIsTaxExemptionsRecurringDropdownOpen(!isTaxExemptionsRecurringDropdownOpen)}
                          >
                            <span className={searchModalData.taxExemptionsRecurring ? "text-gray-700" : "text-gray-400"}>
                              {searchModalData.taxExemptionsRecurring || "Select a Tax Exemption"}
                            </span>
                            <ChevronDown size={16} className={`text-gray-500 transition-transform ${isTaxExemptionsRecurringDropdownOpen ? "rotate-180" : ""}`} />
                          </div>
                          {isTaxExemptionsRecurringDropdownOpen && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#156372] border-t-0 rounded-b-md shadow-lg z-[1002]">
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
                              name="addressTypeRecurring"
                              value="Billing and Shipping"
                              checked={searchModalData.addressTypeRecurring === "Billing and Shipping"}
                              onChange={(e) => setSearchModalData(prev => ({ ...prev, addressTypeRecurring: e.target.value }))}
                              className="cursor-pointer"
                            />
                            <span className="text-sm text-gray-700">Billing and Shipping</span>
                          </label>
                          <label className="flex items-center gap-1.5">
                            <input
                              type="radio"
                              name="addressTypeRecurring"
                              value="Billing"
                              checked={searchModalData.addressTypeRecurring === "Billing"}
                              onChange={(e) => setSearchModalData(prev => ({ ...prev, addressTypeRecurring: e.target.value }))}
                              className="cursor-pointer"
                            />
                            <span className="text-sm text-gray-700">Billing</span>
                          </label>
                          <label className="flex items-center gap-1.5">
                            <input
                              type="radio"
                              name="addressTypeRecurring"
                              value="Shipping"
                              checked={searchModalData.addressTypeRecurring === "Shipping"}
                              onChange={(e) => setSearchModalData(prev => ({ ...prev, addressTypeRecurring: e.target.value }))}
                              className="cursor-pointer"
                            />
                            <span className="text-sm text-gray-700">Shipping</span>
                          </label>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="relative flex-1">
                            <div
                              className={`flex items-center justify-between w-full py-2 px-3 text-sm text-gray-700 bg-white border rounded-md cursor-pointer transition-colors ${false ? "border-[#156372]" : "border-gray-300 hover:border-gray-400"}`}
                            >
                              <span className="text-gray-400">Attention</span>
                              <ChevronDown size={16} className="text-gray-500" />
                            </div>
                          </div>
                          <button className="text-[#156372] text-sm hover:underline">+ Address Line</button>
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
                          className="w-full py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-[#156372] focus:ring-1 focus:ring-blue-600"
                        />
                      </div>

                      {/* Company Name */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Company Name</label>
                        <input
                          type="text"
                          value={searchModalData.companyName}
                          onChange={(e) => setSearchModalData(prev => ({ ...prev, companyName: e.target.value }))}
                          className="w-full py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-[#156372] focus:ring-1 focus:ring-blue-600"
                        />
                      </div>

                      {/* Last Name */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Last Name</label>
                        <input
                          type="text"
                          value={searchModalData.lastName}
                          onChange={(e) => setSearchModalData(prev => ({ ...prev, lastName: e.target.value }))}
                          className="w-full py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-[#156372] focus:ring-1 focus:ring-blue-600"
                        />
                      </div>

                      {/* Status */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Status</label>
                        <select
                          value={searchModalData.status}
                          onChange={(e) => setSearchModalData(prev => ({ ...prev, status: e.target.value }))}
                          className="w-full py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-[#156372] focus:ring-1 focus:ring-blue-600"
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
                          className="w-full py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-[#156372] focus:ring-1 focus:ring-blue-600"
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
                          className="w-full py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-[#156372] focus:ring-1 focus:ring-blue-600"
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
                          className="w-full py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-[#156372] focus:ring-1 focus:ring-blue-600"
                        />
                      </div>

                      {/* Email */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                        <input
                          type="email"
                          value={searchModalData.email}
                          onChange={(e) => setSearchModalData(prev => ({ ...prev, email: e.target.value }))}
                          className="w-full py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-[#156372] focus:ring-1 focus:ring-blue-600"
                        />
                      </div>

                      {/* Phone */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone</label>
                        <input
                          type="tel"
                          value={searchModalData.phone}
                          onChange={(e) => setSearchModalData(prev => ({ ...prev, phone: e.target.value }))}
                          className="w-full py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-[#156372] focus:ring-1 focus:ring-blue-600"
                        />
                      </div>

                      {/* Notes */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Notes</label>
                        <input
                          type="text"
                          value={searchModalData.notes}
                          onChange={(e) => setSearchModalData(prev => ({ ...prev, notes: e.target.value }))}
                          className="w-full py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-[#156372] focus:ring-1 focus:ring-blue-600"
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
                          className="w-full py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-[#156372] focus:ring-1 focus:ring-blue-600"
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
                            className="flex-1 py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-[#156372] focus:ring-1 focus:ring-blue-600"
                          />
                          <span className="text-gray-500">-</span>
                          <input
                            type="text"
                            placeholder="dd/MM/yyyy"
                            value={searchModalData.dateRangeTo}
                            onChange={(e) => setSearchModalData(prev => ({ ...prev, dateRangeTo: e.target.value }))}
                            className="flex-1 py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-[#156372] focus:ring-1 focus:ring-blue-600"
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
                          className="w-full py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-[#156372] focus:ring-1 focus:ring-blue-600"
                        />
                      </div>

                      {/* Customer Name */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Customer Name</label>
                        <input
                          type="text"
                          value={searchModalData.customerName}
                          onChange={(e) => setSearchModalData(prev => ({ ...prev, customerName: e.target.value }))}
                          className="w-full py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-[#156372] focus:ring-1 focus:ring-blue-600"
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
                          className="w-full py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-[#156372] focus:ring-1 focus:ring-blue-600"
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
                          className="w-full py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-[#156372] focus:ring-1 focus:ring-blue-600"
                        />
                      </div>

                      {/* Item Name */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Item Name</label>
                        <input
                          type="text"
                          value={searchModalData.itemNameQuote}
                          onChange={(e) => setSearchModalData(prev => ({ ...prev, itemNameQuote: e.target.value }))}
                          className="w-full py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-[#156372] focus:ring-1 focus:ring-blue-600"
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
                            className="flex-1 py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-[#156372] focus:ring-1 focus:ring-blue-600"
                            placeholder="From"
                          />
                          <span className="text-gray-500">-</span>
                          <input
                            type="text"
                            value={searchModalData.totalRangeToQuote}
                            onChange={(e) => setSearchModalData(prev => ({ ...prev, totalRangeToQuote: e.target.value }))}
                            className="flex-1 py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-[#156372] focus:ring-1 focus:ring-blue-600"
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
                          className="w-full py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-[#156372] focus:ring-1 focus:ring-blue-600"
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
                          className="w-full py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-[#156372] focus:ring-1 focus:ring-blue-600"
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
                            className="flex-1 py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-[#156372] focus:ring-1 focus:ring-blue-600"
                          />
                          <span className="text-gray-500">-</span>
                          <input
                            type="text"
                            placeholder="dd/MM/yyyy"
                            value={searchModalData.dateRangeTo}
                            onChange={(e) => setSearchModalData(prev => ({ ...prev, dateRangeTo: e.target.value }))}
                            className="flex-1 py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-[#156372] focus:ring-1 focus:ring-blue-600"
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
                          className="w-full py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-[#156372] focus:ring-1 focus:ring-blue-600"
                          placeholder="Enter customer name"
                        />
                      </div>

                      {/* Status */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Status</label>
                        <select
                          value={searchModalData.status}
                          onChange={(e) => setSearchModalData(prev => ({ ...prev, status: e.target.value }))}
                          className="w-full py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-[#156372] focus:ring-1 focus:ring-blue-600"
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
                          className="w-full py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-[#156372] focus:ring-1 focus:ring-blue-600"
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
                            className="flex-1 py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-[#156372] focus:ring-1 focus:ring-blue-600"
                          />
                          <span className="text-gray-500">-</span>
                          <input
                            type="text"
                            placeholder="dd/MM/yyyy"
                            value={searchModalData.createdBetweenTo}
                            onChange={(e) => setSearchModalData(prev => ({ ...prev, createdBetweenTo: e.target.value }))}
                            className="flex-1 py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-[#156372] focus:ring-1 focus:ring-blue-600"
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
                            className="flex-1 py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-[#156372] focus:ring-1 focus:ring-blue-600"
                            placeholder="From"
                          />
                          <span className="text-gray-500">-</span>
                          <input
                            type="text"
                            value={searchModalData.totalRangeToInvoice}
                            onChange={(e) => setSearchModalData(prev => ({ ...prev, totalRangeToInvoice: e.target.value }))}
                            className="flex-1 py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-[#156372] focus:ring-1 focus:ring-blue-600"
                            placeholder="To"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

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
                          className="w-full py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-[#156372] focus:ring-1 focus:ring-blue-600"
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
                            className="flex-1 py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-[#156372] focus:ring-1 focus:ring-blue-600"
                          />
                          <span className="text-gray-500">-</span>
                          <input
                            type="text"
                            placeholder="dd/MM/yyyy"
                            value={searchModalData.dateRangeToPayment}
                            onChange={(e) => setSearchModalData(prev => ({ ...prev, dateRangeToPayment: e.target.value }))}
                            className="flex-1 py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-[#156372] focus:ring-1 focus:ring-blue-600"
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
                          className="w-full py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-[#156372] focus:ring-1 focus:ring-blue-600"
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
                            className="flex-1 py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-[#156372] focus:ring-1 focus:ring-blue-600"
                            placeholder="From"
                          />
                          <span className="text-gray-500">-</span>
                          <input
                            type="text"
                            value={searchModalData.totalRangeToPayment}
                            onChange={(e) => setSearchModalData(prev => ({ ...prev, totalRangeToPayment: e.target.value }))}
                            className="flex-1 py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-[#156372] focus:ring-1 focus:ring-blue-600"
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
                          className="w-full py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-[#156372] focus:ring-1 focus:ring-blue-600"
                        />
                      </div>

                      {/* Status */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Status</label>
                        <select
                          value={searchModalData.statusPayment}
                          onChange={(e) => setSearchModalData(prev => ({ ...prev, statusPayment: e.target.value }))}
                          className="w-full py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-[#156372] focus:ring-1 focus:ring-blue-600"
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
                          className="w-full py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-[#156372] focus:ring-1 focus:ring-blue-600"
                        />
                      </div>

                      {/* Notes */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Notes</label>
                        <input
                          type="text"
                          value={searchModalData.notesPayment}
                          onChange={(e) => setSearchModalData(prev => ({ ...prev, notesPayment: e.target.value }))}
                          className="w-full py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-[#156372] focus:ring-1 focus:ring-blue-600"
                        />
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
                          className="w-full py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-[#156372] focus:ring-1 focus:ring-blue-600"
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
                            className="flex-1 py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-[#156372] focus:ring-1 focus:ring-blue-600"
                          />
                          <span className="text-gray-500">-</span>
                          <input
                            type="text"
                            placeholder="dd/MM/yyyy"
                            value={searchModalData.dateRangeTo}
                            onChange={(e) => setSearchModalData(prev => ({ ...prev, dateRangeTo: e.target.value }))}
                            className="flex-1 py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-[#156372] focus:ring-1 focus:ring-blue-600"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Vendor Name</label>
                        <input
                          type="text"
                          value={searchModalData.vendorName}
                          onChange={(e) => setSearchModalData(prev => ({ ...prev, vendorName: e.target.value }))}
                          className="w-full py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-[#156372] focus:ring-1 focus:ring-blue-600"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Total Range</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={searchModalData.totalRangeFrom}
                            onChange={(e) => setSearchModalData(prev => ({ ...prev, totalRangeFrom: e.target.value }))}
                            className="flex-1 py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-[#156372] focus:ring-1 focus:ring-blue-600"
                          />
                          <span className="text-gray-500">-</span>
                          <input
                            type="text"
                            value={searchModalData.totalRangeTo}
                            onChange={(e) => setSearchModalData(prev => ({ ...prev, totalRangeTo: e.target.value }))}
                            className="flex-1 py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-[#156372] focus:ring-1 focus:ring-blue-600"
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
                          className="w-full py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-[#156372] focus:ring-1 focus:ring-blue-600"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Status</label>
                        <select
                          value={searchModalData.status}
                          onChange={(e) => setSearchModalData(prev => ({ ...prev, status: e.target.value }))}
                          className="w-full py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-[#156372] focus:ring-1 focus:ring-blue-600"
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
                          className="w-full py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-[#156372] focus:ring-1 focus:ring-blue-600"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Notes</label>
                        <input
                          type="text"
                          value={searchModalData.notes}
                          onChange={(e) => setSearchModalData(prev => ({ ...prev, notes: e.target.value }))}
                          className="w-full py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-[#156372] focus:ring-1 focus:ring-blue-600"
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
                        recurringInvoiceNumber: "",
                        profileName: "",
                        name: "",
                        startDateRangeFrom: "",
                        startDateRangeTo: "",
                        endDateRangeFrom: "",
                        endDateRangeTo: "",
                        itemNameRecurring: "",
                        itemDescriptionRecurring: "",
                        notesRecurring: "",
                        statusRecurring: "",
                        customerNameRecurring: "",
                        taxExemptionsRecurring: "",
                        addressTypeRecurring: "Billing and Shipping",
                        attentionRecurring: "",
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
        )
      }

      {/* Field Customization Modal */}
      {
        isFieldCustomizationOpen && (
          <FieldCustomization
            featureType="recurring-invoices"
            onClose={() => setIsFieldCustomizationOpen(false)}
          />
        )
      }
      {/* Header Menu Overlay - Rendered outside table to avoid clipping */}
      {isHeaderMenuOpen && (
        <>
          <div className="fixed inset-0 z-[1000]" onClick={() => setIsHeaderMenuOpen(false)}></div>
          <div
            className="fixed bg-white border border-gray-200 rounded-md shadow-xl z-[1001] py-1 w-48 animate-in fade-in zoom-in-95 duration-100"
            style={{ top: `${headerMenuPosition.top}px`, left: `${headerMenuPosition.left}px` }}
          >
            <div
              className="px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer flex items-center gap-2"
              onClick={() => {
                setTempVisibleColumns([...visibleColumns]);
                setIsCustomizeColumnsModalOpen(true);
                setIsHeaderMenuOpen(false);
              }}
            >
              <SlidersHorizontal size={14} />
              <span>Customize Columns</span>
            </div>
          </div>
        </>
      )}
      {/* Customize Columns Modal */}
      {isCustomizeColumnsModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[3000]">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-[500px] overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-[#f9fafb]">
              <div className="flex items-center gap-3">
                <SlidersHorizontal size={18} className="text-gray-500" />
                <h3 className="text-[15px] font-semibold text-gray-800">Customize Columns</h3>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-xs text-gray-500 font-medium">{tempVisibleColumns.length} of {recurringColumnOptions.length} Selected</span>
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
              {recurringColumnOptions
                .filter(col => col.label.toLowerCase().includes(columnSearchTerm.toLowerCase()))
                .map((col) => {
                  const isChecked = tempVisibleColumns.includes(col.key);
                  return (
                    <div
                      key={col.key}
                      className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 group cursor-pointer transition-colors"
                      onClick={() => {
                        if (col.locked) return;
                        if (isChecked) {
                          setTempVisibleColumns(prev => prev.filter(k => k !== col.key));
                        } else {
                          setTempVisibleColumns(prev => [...prev, col.key]);
                        }
                      }}
                    >
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
                  const normalized = normalizeRecurringColumns(tempVisibleColumns);
                  setVisibleColumns(normalized);
                  localStorage.setItem("taban_recurring_invoices_columns", JSON.stringify(normalized));
                  setIsCustomizeColumnsModalOpen(false);
                }}
                className="px-6 py-2 bg-blue-500 text-white rounded text-[13px] font-medium hover:bg-blue-600 transition-colors shadow-sm"
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
    </div >
  );
}

