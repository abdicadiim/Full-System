
import React, { useState, useRef, useEffect, useMemo } from "react";
import { getExpenseCustomViews } from "../shared/purchasesModel";
import { useNavigate, useLocation } from "react-router-dom";
import BulkUpdateModal from "../shared/BulkUpdateModal";
import DeleteConfirmationModal from "../shared/DeleteConfirmationModal";
import ExportExpenses from "./ExportExpenses";
import JSZip from "jszip";
import {
  expensesAPI,
  vendorsAPI,
  customersAPI,
  chartOfAccountsAPI,
  bankAccountsAPI,
  currenciesAPI
} from "../../../services/api";
import { useCurrency } from "../../../hooks/useCurrency";
import {
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Plus,
  MoreVertical,
  Play,
  Star,
  ArrowUpDown,
  Download,
  Upload,
  Settings,
  FileText,
  RotateCw,
  Search,
  X,
  GripVertical,
  Trash2,
  Check,
  Lock,
  Users,
  ChevronDown as ChevronDownIcon,
  Filter,
  SlidersHorizontal,
  Info,
  Paperclip,
} from "lucide-react";

const EXPENSES_KEY = "expenses_v1";
const EXPENSE_COLUMNS_KEY = "taban_expenses_column_widths_v1";
const EXPENSE_VISIBLE_COLUMNS_KEY = "taban_expenses_visible_columns_v1";

const getLS = (k: string) => {
  if (typeof window !== "undefined" && window.localStorage) {
    return window.localStorage.getItem(k);
  }
  return null;
};

const hasAnyAttachment = (expense: any) => {
  const listKeys = ["receipts", "uploads", "documents", "attachments", "files"];
  const valueKeys = ["receipt", "receiptFile", "receiptUrl", "document", "documentFile", "documentUrl"];

  const hasList = listKeys.some((key) => Array.isArray(expense?.[key]) && expense[key].length > 0);
  const hasValue = valueKeys.some((key) => Boolean(expense?.[key]));
  return expense?.hasReceipt === true || hasList || hasValue;
};

export default function Expenses() {
  const navigate = useNavigate();
  const location = useLocation();
  const { baseCurrency, symbol } = useCurrency();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [sortSubmenuOpen, setSortSubmenuOpen] = useState(false);
  const [exportSubmenuOpen, setExportSubmenuOpen] = useState(false);
  const [uploadMenuOpen, setUploadMenuOpen] = useState(false);
  const [importSubmenuOpen, setImportSubmenuOpen] = useState(false);
  const [selectedView, setSelectedView] = useState("All");
  const [selectedSort, setSelectedSort] = useState("Created Time");
  const [expenses, setExpenses] = useState<any[]>([]);
  const [vendorsList, setVendorsList] = useState<any[]>([]);
  const [customersList, setCustomersList] = useState<any[]>([]);
  const [accountsList, setAccountsList] = useState<any[]>([]);
  const [selectedExpenses, setSelectedExpenses] = useState<any[]>([]);
  const [showCustomViewModal, setShowCustomViewModal] = useState(false);
  const [showBulkUpdateModal, setShowBulkUpdateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showCustomizeColumnsModal, setShowCustomizeColumnsModal] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currencies, setCurrencies] = useState<any[]>([]);
  const [searchType, setSearchType] = useState("Expenses");
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
    // Expenses
    expenseAccount: "",
    expenseNotes: "",
    dateRangeFromExpense: "",
    dateRangeToExpense: "",
    totalRangeFromExpense: "",
    totalRangeToExpense: "",
    customerName: "",
    vendorName: "",
    taxExemptions: "",
    paidThrough: "",
    referenceNumber: "",
    statusExpense: "",
    source: "",
    employee: "",
    projectName: "",
    // Bills
    billNumber: "",
    vendorNameBill: "",
    referenceNumberBill: "",
    dateRangeFromBill: "",
    dateRangeToBill: "",
    totalRangeFromBill: "",
    totalRangeToBill: "",
    statusBill: "",
    // Quotes
    quoteNumber: "",
    referenceNumberQuote: "",
    // Invoices
    invoiceNumber: "",
    orderNumber: ""
  });

  const [notification, setNotification] = useState(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportType, setExportType] = useState("expenses");
  const dropdownRef = useRef(null);
  const moreMenuRef = useRef(null);
  const sortSubmenuRef = useRef(null);
  const exportSubmenuRef = useRef(null);
  const importSubmenuRef = useRef(null);
  const uploadMenuRef = useRef(null);
  const fileInputRef = useRef(null);
  const [hoveredMenuItem, setHoveredMenuItem] = useState(null);
  const resizingRef = useRef<{ key: string; startX: number; startWidth: number } | null>(null);
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(() => {
    const defaults = {
      select: 60,
      date: 140,
      location: 160,
      expenseAccount: 220,
      reference: 140,
      customerName: 180,
      status: 140,
      amount: 140,
      actions: 44,
    };
    try {
      const raw = localStorage.getItem(EXPENSE_COLUMNS_KEY);
      const parsed = raw ? JSON.parse(raw) : null;
      if (!parsed || typeof parsed !== "object") return defaults;
      return { ...defaults, ...parsed };
    } catch {
      return defaults;
    }
  });
  const allTableColumns = useMemo(
    () => [
      { key: "date", label: "Date", required: true },
      { key: "location", label: "Location", required: false },
      { key: "expenseAccount", label: "Expense Account", required: true },
      { key: "reference", label: "Reference#", required: false },
      { key: "customerName", label: "Customer Name", required: false },
      { key: "status", label: "Status", required: false },
      { key: "amount", label: "Amount", required: true },
    ],
    []
  );
  const [visibleColumnKeys, setVisibleColumnKeys] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(EXPENSE_VISIBLE_COLUMNS_KEY);
      const parsed = raw ? JSON.parse(raw) : null;
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch {
      // ignore
    }
    return ["date", "location", "expenseAccount", "reference", "customerName", "status", "amount"];
  });
  const isColumnVisible = (key: string) => visibleColumnKeys.includes(key);

  const tableMinWidth = useMemo(
    () => {
      const visibleWidths = allTableColumns.reduce((sum, col) => {
        if (!visibleColumnKeys.includes(col.key)) return sum;
        return sum + Number(columnWidths[col.key] || 0);
      }, 0);
      return Number(columnWidths.select || 60) + Number(columnWidths.actions || 44) + visibleWidths;
    },
    [allTableColumns, columnWidths, visibleColumnKeys]
  );

  const startResizing = (key: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    resizingRef.current = {
      key,
      startX: e.clientX,
      startWidth: Number(columnWidths[key] || 120),
    };
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  };

  const renderResizeHandle = (key: string) => (
    <div
      className="absolute -right-[4px] top-0 bottom-0 z-20 w-[10px] cursor-col-resize bg-transparent"
      onMouseDown={(e) => startResizing(key, e)}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="pointer-events-none absolute left-1/2 top-[5px] bottom-[5px] w-[2px] -translate-x-1/2 rounded bg-transparent group-hover/header:bg-slate-300 group-hover/header:opacity-100 hover:bg-[#156372]" />
    </div>
  );

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!resizingRef.current) return;
      const { key, startX, startWidth } = resizingRef.current;
      const nextWidth = Math.max(60, startWidth + (e.clientX - startX));
      setColumnWidths((prev) => ({ ...prev, [key]: nextWidth }));
    };

    const handleMouseUp = () => {
      if (!resizingRef.current) return;
      resizingRef.current = null;
      document.body.style.cursor = "default";
      document.body.style.userSelect = "auto";
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem(EXPENSE_COLUMNS_KEY, JSON.stringify(columnWidths));
  }, [columnWidths]);

  useEffect(() => {
    localStorage.setItem(EXPENSE_VISIBLE_COLUMNS_KEY, JSON.stringify(visibleColumnKeys));
  }, [visibleColumnKeys]);

  const toggleVisibleColumn = (key: string) => {
    const column = allTableColumns.find((col) => col.key === key);
    if (!column) return;
    if (column.required) return;
    setVisibleColumnKeys((prev) => {
      if (prev.includes(key)) return prev.filter((k) => k !== key);
      return [...prev, key];
    });
  };

  // Load expenses from API
  const loadExpenses = async () => {
    try {
      setIsRefreshing(true);
      const extractCollection = (response: any): any[] => {
        if (Array.isArray(response)) return response;
        if (Array.isArray(response?.data)) return response.data;
        if (Array.isArray(response?.data?.data)) return response.data.data;
        if (Array.isArray(response?.vendors)) return response.vendors;
        if (Array.isArray(response?.customers)) return response.customers;
        if (Array.isArray(response?.accounts)) return response.accounts;
        return [];
      };
      // Fetch expenses, contacts and accounts in parallel to ensure we can display names
      const [response, vendorsResponse, customersResponse, accountsResponse, bankAccountsResponse, cursResp] = await Promise.all([
        expensesAPI.getAll({ limit: 1000 }),
        vendorsAPI.getAll({ limit: 1000 }),
        customersAPI.getAll({ limit: 1000 }),
        chartOfAccountsAPI.getAccounts({ limit: 1000 }),
        bankAccountsAPI.getAll({ limit: 1000 }),
        currenciesAPI.getAll(),
      ]);

      const vendors = extractCollection(vendorsResponse);
      const customers = extractCollection(customersResponse);
      const chartAccounts = extractCollection(accountsResponse);
      const bankAccounts = extractCollection(bankAccountsResponse);
      const cursList = Array.isArray(cursResp) ? cursResp : (cursResp?.data || []);

      const mergedAccountsMap = new Map<string, any>();
      [...chartAccounts, ...bankAccounts].forEach((account: any) => {
        const id = String(account?._id || account?.id || "");
        const name = String(account?.accountName || account?.name || "").trim();
        const mapKey = id || name.toLowerCase();
        if (!mapKey) return;
        if (!mergedAccountsMap.has(mapKey)) {
          mergedAccountsMap.set(mapKey, account);
        }
      });
      const accounts = Array.from(mergedAccountsMap.values());

      setVendorsList(vendors);
      setCustomersList(customers);
      setAccountsList(accounts);
      setCurrencies(cursList);

      if (response && (response.code === 0 || response.success) && (response.expenses || response.data)) {
        const apiExpenses = response.expenses || response.data || [];

        // Create quick lookup maps
        const vendorById = new Map<string, any>(
          vendors
            .map((v: any) => [String(v?._id || v?.id || ""), v] as [string, any])
            .filter(([id]) => Boolean(id))
        );
        const customerById = new Map<string, any>(
          customers
            .map((c: any) => [String(c?._id || c?.id || ""), c] as [string, any])
            .filter(([id]) => Boolean(id))
        );
        const accountById = new Map<string, any>(
          accounts
            .map((a: any) => [String(a?._id || a?.id || ""), a] as [string, any])
            .filter(([id]) => Boolean(id))
        );

        const mapped = apiExpenses.map((expense: any) => {
          const vendor = vendorById.get(String(expense.vendor_id || ""));
          const customer = customerById.get(String(expense.customer_id || ""));
          const paidThroughAccount = accountById.get(String(expense.paid_through_account_id || ""));
          const expenseAccount = accountById.get(String(expense.account_id || ""));
          const vendorName = expense.vendor_name || expense.vendorName || expense.vendor?.name || vendor?.displayName || vendor?.name || "";
          const customerName = expense.customer_name || expense.customerName || expense.customer?.name || customer?.displayName || customer?.name || "";
          const paidThroughName = expense.paid_through_account_name || expense.paidThrough || paidThroughAccount?.accountName || "";

          return {
            ...expense,
            id: expense.expense_id || expense._id || expense.id,
            date: expense.date ? new Date(expense.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : "",
            expenseAccount: expense.account_name || expenseAccount?.accountName || "",
            amount: expense.total ?? expense.amount ?? expense.sub_total ?? 0,
            currency: baseCurrency?.code || expense.currency_code || "USD",
            currencySymbol: (() => {
              const currencyStr = baseCurrency?.code || expense.currency_code || "USD";
              const code = currencyStr.split(" - ")[0];
              const match = cursList.find((c: any) => c.code === code || c.code === currencyStr);
              return match ? match.symbol : code || currencyStr;
            })(),
            paidThrough: paidThroughName || "",
            vendor: vendorName || "",
            reference: expense.reference_number,
            location: expense.location_name || expense.location || "Head Office",
            customerName: customerName || "",
            status: (expense.status || "").toUpperCase(),
            notes: expense.description,
            hasAttachment: hasAnyAttachment(expense),
          };
        });

        setExpenses(mapped);

        // Backfill missing vendor_name / paid_through_account_name on the server if we could resolve them locally
        const updates: Array<Promise<any>> = [];
        mapped.forEach((m) => {
          const raw = m; // includes raw fields
          const apiId = raw.expense_id || raw.id;
          const payload: any = {};
          let needsUpdate = false;
          if (!raw.vendor_name && raw.vendor && (raw.vendor_id || vendors.length > 0)) {
            // try to find vendor id
            const v = vendors.find((x: any) => (x.displayName || x.name) === raw.vendor || x._id === raw.vendor_id || x.id === raw.vendor_id);
            if (v) {
              payload.vendor_id = v._id || v.id;
              payload.vendor_name = v.displayName || v.name;
              needsUpdate = true;
            } else if (raw.vendor) {
              payload.vendor_name = raw.vendor;
              needsUpdate = true;
            }
          }
          if (!raw.paid_through_account_name && raw.paidThrough && (raw.paid_through_account_id || accounts.length > 0)) {
            const a = accounts.find((x: any) => x.accountName === raw.paidThrough || x._id === raw.paid_through_account_id || x.id === raw.paid_through_account_id);
            if (a) {
              payload.paid_through_account_id = a._id || a.id;
              payload.paid_through_account_name = a.accountName;
              needsUpdate = true;
            } else if (raw.paidThrough) {
              payload.paid_through_account_name = raw.paidThrough;
              needsUpdate = true;
            }
          }
          if (needsUpdate && apiId) {
            updates.push(expensesAPI.update(apiId, payload).catch((err) => { console.error('Backfill update failed for expense', apiId, err); }));
          }
        });

        if (updates.length > 0) {
          // fire and forget; continue after they settle
          Promise.allSettled(updates).then(() => {
            // refresh to reflect server changes
            loadExpenses();
          });
        }
      } else {
        setExpenses([]);
      }
    } catch (e) {
      console.error("Error loading expenses:", e);
      setExpenses([]);
      setVendorsList([]);
      setCustomersList([]);
      setAccountsList([]);
    } finally {
      setIsRefreshing(false);
    }
  };

  const downloadSampleFile = (type) => {
    const headers = ["Expense Date", "Expense Account", "Amount", "Paid Through", "Vendor Name", "Customer Name", "Reference#", "Description"];
    const sampleData = [
      ["2023-11-01", "Office Supplies", "50.00", "Cash", "Sample Vendor", "Sample Customer", "REF-001", "Pens and notebooks"],
      ["2023-11-02", "Travel Expense", "120.00", "Bank", "Airline", "Sample Customer", "REF-002", "Flight to Nairobi"]
    ];

    let content = "";
    let mimeType = "";
    let extension = "";

    if (type === 'csv') {
      content = [headers.join(","), ...sampleData.map(row => row.join(","))].join("\n");
      mimeType = "text/csv;charset=utf-8;";
      extension = "csv";
    } else {
      content = [headers.join("\t"), ...sampleData.map(row => row.join("\t"))].join("\n");
      mimeType = "application/vnd.ms-excel;charset=utf-8;";
      extension = "xls";
    }

    const blob = new Blob([content], { type: mimeType });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `sample_expenses.${extension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const handleRefresh = () => {
    loadExpenses();
  };

  const handleAttachFromDesktop = () => {
    if (fileInputRef.current) {
      (fileInputRef.current as any).click();
    }
    setUploadMenuOpen(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const fileArray = Array.from(files).map((f: File) => ({
        id: Math.random().toString(36).substr(2, 9),
        name: f.name,
        size: f.size,
        type: f.type,
        uploadDate: new Date(),
        uploadedBy: "Abdi Ladilf",
        uploadedFrom: "Documents module",
        status: Math.random() > 0.3 ? "UNREADABLE" : "SUCCESS",
        originalFile: f
      }));
      navigate("/expenses/receipts", { state: { newFiles: fileArray } });
    }
  };

  useEffect(() => {
    loadExpenses();
  }, []);

  // Reload expenses when location changes (e.g., coming back from new expense page)
  useEffect(() => {
    loadExpenses();
  }, [location.pathname]);

  // Handle Esc key to clear selection
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && selectedExpenses.length > 0) {
        setSelectedExpenses([]);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [selectedExpenses.length]);

  const handleDeleteSelected = () => {
    if (selectedExpenses.length === 0) {
      alert("Please select at least one expense to delete.");
      return;
    }
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    const count = selectedExpenses.length;
    if (count === 0) {
      return;
    }

    try {
      const selectedIdSet = new Set(selectedExpenses.map((id) => String(id)));
      const deleteTargets = expenses.filter((expense) =>
        selectedIdSet.has(String(expense.id || expense.expense_id || expense._id))
      );

      if (!deleteTargets.length) {
        setNotification("No valid expense IDs selected for delete." as any);
        setTimeout(() => setNotification(null), 3000);
        setShowDeleteModal(false);
        return;
      }

      // Delete each selected expense from the database
      const deletePromises = deleteTargets.map(async (expense: any) => {
        const expenseId = expense.expense_id || expense.id || expense._id;
        if (!expense) {
          return { success: false, id: "unknown", error: "Not found" };
        }

        try {
          await expensesAPI.delete(expenseId);
          return { success: true, id: expenseId };
        } catch (error) {
          console.error(`Error deleting expense ${expenseId}:`, error);
          return { success: false, id: expenseId, error };
        }
      });

      const results = await Promise.all(deletePromises);
      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;

      // Refresh expenses from database
      await loadExpenses();

      // Show success/error notification
      if (failed === 0) {
        setNotification(`The selected expense${count > 1 ? "s have" : " has"} been deleted successfully.` as any);
      } else if (successful > 0) {
        setNotification(`${successful} expense${successful > 1 ? "s" : ""} deleted successfully. ${failed} failed.` as any);
      } else {
        setNotification(`Failed to delete expenses. Please try again.` as any);
      }
      setTimeout(() => setNotification(null), 3000);

      setSelectedExpenses([]);
      window.dispatchEvent(new Event("expensesUpdated"));
      window.dispatchEvent(new Event("storage"));
      setShowDeleteModal(false);
    } catch (error) {
      console.error("Error deleting expenses:", error);
      setNotification("Failed to delete expenses. Please try again." as any);
      setTimeout(() => setNotification(null), 3000);
      setShowDeleteModal(false);
    }
  };

  const handleBulkUpdate = () => {
    if (selectedExpenses.length === 0) {
      alert("Please select at least one expense to update.");
      return;
    }
    setShowBulkUpdateModal(true);
  };

  const normalizeText = (input: any) => String(input || "").trim().toLowerCase();

  const formatDateToDisplay = (value: string) => {
    if (!value) return "";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return parsed.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  };

  const normalizeStatusForApi = (value: any) => {
    const normalized = normalizeText(value).replace(/\s+/g, "-");
    if (!normalized) return "";
    if (normalized === "nonbillable") return "non-billable";
    return normalized;
  };

  const resolveAccountByName = (name: string) => {
    const target = normalizeText(name);
    return (
      accountsList.find((a: any) => normalizeText(a.accountName || a.name) === target) || null
    );
  };

  const resolveVendorByName = (name: string) => {
    const target = normalizeText(name);
    return (
      vendorsList.find((v: any) => normalizeText(v.displayName || v.name) === target) || null
    );
  };

  const resolveCustomerByName = (name: string) => {
    const target = normalizeText(name);
    return (
      customersList.find((c: any) => normalizeText(c.displayName || c.name) === target) || null
    );
  };

  const handleBulkUpdateSubmit = async (field: string, value: any) => {
    const fieldKeyMap: Record<string, string> = {
      Date: "date",
      "Expense Account": "expenseAccount",
      "Paid Through": "paidThrough",
      Vendor: "vendor",
      "Customer Name": "customerName",
      Status: "status",
      Currency: "currency",
      Amount: "amount",
      Notes: "notes",
      Billable: "billable",
      "Reference#": "reference",
      Location: "location",
    };
    const fieldKey = fieldKeyMap[field] || field;

    if (!selectedExpenses.length) {
      alert("Please select at least one expense.");
      return;
    }

    if (value === "" || value === null || value === undefined) {
      alert("Please enter a new value.");
      return;
    }

    const selectedIdSet = new Set(selectedExpenses.map((id) => String(id)));
    const selectedRows = expenses.filter((expense) =>
      selectedIdSet.has(String(expense.id || expense.expense_id || expense._id))
    );

    if (!selectedRows.length) {
      alert("No valid expenses selected.");
      return;
    }

    let displayValue: any = value;
    if (fieldKey === "date") {
      displayValue = formatDateToDisplay(String(value));
    } else if (fieldKey === "currency") {
      displayValue = String(value || "").toUpperCase();
    } else if (fieldKey === "status") {
      displayValue = String(value || "").toUpperCase();
    } else if (fieldKey === "amount") {
      const numeric = Number.parseFloat(String(value));
      if (!Number.isFinite(numeric)) {
        alert("Please enter a valid amount.");
        return;
      }
      displayValue = numeric;
    } else if (fieldKey === "billable") {
      displayValue = Boolean(value);
    }

    // Optimistic UI update
    setExpenses((prev) =>
      prev.map((expense) => {
        if (!selectedIdSet.has(String(expense.id || expense.expense_id || expense._id))) {
          return expense;
        }
        return {
          ...expense,
          [fieldKey]: displayValue,
        };
      })
    );

    try {
      const updateResults = await Promise.all(
        selectedRows.map(async (expense: any) => {
          const apiId = expense.expense_id || expense.id || expense._id;
          if (!apiId) {
            return { success: false, id: "unknown" };
          }

          const payload: any = {};

          switch (fieldKey) {
            case "date": {
              payload.date = String(value);
              break;
            }
            case "expenseAccount": {
              const acc = resolveAccountByName(String(value));
              if (acc) {
                payload.account_id = acc._id || acc.id;
                payload.account_name = acc.accountName || acc.name;
              } else {
                payload.account_name = String(value);
              }
              break;
            }
            case "vendor": {
              const vendor = resolveVendorByName(String(value));
              if (vendor) {
                payload.vendor_id = vendor._id || vendor.id;
                payload.vendor_name = vendor.displayName || vendor.name;
              } else {
                payload.vendor_name = String(value);
              }
              break;
            }
            case "paidThrough": {
              const account = resolveAccountByName(String(value));
              if (account) {
                payload.paid_through_account_id = account._id || account.id;
                payload.paid_through_account_name = account.accountName || account.name;
              } else {
                payload.paid_through_account_name = String(value);
              }
              break;
            }
            case "customerName": {
              const customer = resolveCustomerByName(String(value));
              if (customer) {
                payload.customer_id = customer._id || customer.id;
                payload.customer_name = customer.displayName || customer.name;
              } else {
                payload.customer_name = String(value);
              }
              break;
            }
            case "currency": {
              payload.currency_code = String(value || "").toUpperCase();
              break;
            }
            case "status": {
              const statusValue = normalizeStatusForApi(value);
              payload.status = statusValue;
              if (statusValue === "non-billable") payload.is_billable = false;
              if (statusValue === "unbilled" || statusValue === "billable") payload.is_billable = true;
              break;
            }
            case "amount": {
              payload.amount = Number.parseFloat(String(value));
              payload.total = payload.amount;
              payload.sub_total = payload.amount;
              break;
            }
            case "notes": {
              payload.description = String(value);
              break;
            }
            case "billable": {
              const isBillable = value === true || String(value).toLowerCase() === "true";
              payload.is_billable = isBillable;
              payload.status = isBillable ? "billable" : "non-billable";
              break;
            }
            case "reference": {
              payload.reference_number = String(value);
              break;
            }
            case "location": {
              payload.location = String(value);
              payload.location_name = String(value);
              break;
            }
            default: {
              payload[fieldKey] = value;
            }
          }

          try {
            const response = await expensesAPI.update(apiId, payload);
            const success = response?.code === 0 || response?.success || !!response?.expense || !!response?.data;
            return { success, id: apiId };
          } catch (error) {
            console.error("Bulk update failed for expense", apiId, error);
            return { success: false, id: apiId };
          }
        })
      );

      const failed = updateResults.filter((result) => !result.success).length;
      if (failed === 0) {
        setNotification("Bulk update successful");
      } else {
        setNotification(`Bulk update completed with ${failed} failure${failed > 1 ? "s" : ""}`);
      }
      setTimeout(() => setNotification(null), 3000);

      setSelectedExpenses([]);
      window.dispatchEvent(new Event("expensesUpdated"));
      window.dispatchEvent(new Event("storage"));
      await loadExpenses();
    } catch (err) {
      console.error("Bulk update error", err);
      setNotification("Bulk update failed");
      setTimeout(() => setNotification(null), 3000);
      await loadExpenses();
    }
  };

  const expenseFieldOptions = useMemo(() => {
    const uniqueAccountNames = Array.from(
      new Set(accountsList.map((account: any) => account?.accountName || account?.name).filter(Boolean))
    );
    const uniqueVendorNames = Array.from(
      new Set(vendorsList.map((vendor: any) => vendor?.displayName || vendor?.name).filter(Boolean))
    );
    const uniqueCustomerNames = Array.from(
      new Set(customersList.map((customer: any) => customer?.displayName || customer?.name).filter(Boolean))
    );
    const uniqueCurrencyCodes = Array.from(
      new Set(currencies.map((currency: any) => currency?.code).filter(Boolean))
    );
    const uniqueLocations = Array.from(
      new Set(expenses.map((row: any) => row?.location).filter(Boolean))
    );

    return [
      { value: "Date", label: "Date", type: "date" as const },
      {
        value: "Expense Account",
        label: "Expense Account",
        type: "select" as const,
        options: uniqueAccountNames.map((name) => ({ label: String(name), value: String(name) })),
      },
      {
        value: "Paid Through",
        label: "Paid Through",
        type: "select" as const,
        options: uniqueAccountNames.map((name) => ({ label: String(name), value: String(name) })),
      },
      {
        value: "Vendor",
        label: "Vendor",
        type: "select" as const,
        options: uniqueVendorNames.map((name) => ({ label: String(name), value: String(name) })),
      },
      {
        value: "Customer Name",
        label: "Customer Name",
        type: "select" as const,
        options: uniqueCustomerNames.map((name) => ({ label: String(name), value: String(name) })),
      },
      {
        value: "Location",
        label: "Location",
        type: "select" as const,
        options: uniqueLocations.map((name) => ({ label: String(name), value: String(name) })),
      },
      {
        value: "Status",
        label: "Status",
        type: "select" as const,
        options: [
          { label: "Unbilled", value: "unbilled" },
          { label: "Invoiced", value: "invoiced" },
          { label: "Reimbursed", value: "reimbursed" },
          { label: "Non-Billable", value: "non-billable" },
          { label: "Billable", value: "billable" },
        ],
      },
      {
        value: "Billable",
        label: "Billable",
        type: "boolean" as const,
      },
      {
        value: "Currency",
        label: "Currency",
        type: "select" as const,
        options: uniqueCurrencyCodes.map((code) => ({ label: String(code), value: String(code) })),
      },
      { value: "Amount", label: "Amount", type: "number" as const, placeholder: "Enter amount" },
      { value: "Reference#", label: "Reference#", type: "text" as const, placeholder: "Enter reference" },
      { value: "Notes", label: "Notes", type: "text" as const, placeholder: "Enter notes" },
    ];
  }, [accountsList, vendorsList, customersList, currencies, expenses]);

  const handleDownloadReceipt = () => {
    // If expenses are selected, export only selected expenses
    // Otherwise, open export modal to choose what to export
    if (selectedExpenses.length > 0) {
      const selectedSet = new Set(selectedExpenses.map((id) => String(id)));
      const selectedExpenseData = expenses.filter((exp) =>
        selectedSet.has(String(exp.id || exp.expense_id || exp._id))
      );
      void downloadSelectedExpenseAttachmentsAsZip(selectedExpenseData);
    } else {
      // Open export modal to export all expenses or configure export
      setExportType("expenses");
      setShowExportModal(true);
    }
  };

  const sanitizeName = (value: any, fallback = "file") => {
    const cleaned = String(value || "")
      .trim()
      .replace(/[\\/:*?"<>|]/g, "_")
      .replace(/\s+/g, " ");
    return cleaned || fallback;
  };

  const toBase64Content = (value: string) => {
    const trimmed = String(value || "").trim();
    if (!trimmed) return "";
    if (trimmed.startsWith("data:")) {
      const parts = trimmed.split(",");
      return parts.length > 1 ? parts[1] : "";
    }
    return trimmed;
  };

  const isLikelyBase64 = (value: string) => /^[A-Za-z0-9+/=]+$/.test(value) && value.length > 100;

  const getAttachmentEntriesFromExpense = (expense: any) => {
    const allEntries: any[] = [];
    const candidateKeys = [
      "receipts",
      "uploads",
      "documents",
      "attachments",
      "receipt",
      "receiptFile",
      "receiptUrl",
      "document",
      "documentFile",
      "documentUrl",
      "file",
      "files",
    ];

    candidateKeys.forEach((key) => {
      const value = expense?.[key];
      if (Array.isArray(value)) {
        allEntries.push(...value);
      } else if (value !== undefined && value !== null && value !== "") {
        allEntries.push(value);
      }
    });

    return allEntries;
  };

  const resolveAttachmentPayload = async (entry: any, fallbackName: string) => {
    if (entry instanceof File || entry instanceof Blob) {
      return { blob: entry as Blob, name: sanitizeName((entry as any).name || fallbackName, fallbackName) };
    }

    if (typeof entry === "string") {
      const raw = entry.trim();
      if (!raw) return null;
      if (/^https?:\/\//i.test(raw) || raw.startsWith("blob:") || raw.startsWith("data:")) {
        try {
          const response = await fetch(raw);
          if (!response.ok) return null;
          const blob = await response.blob();
          const fromUrl = raw.split("?")[0].split("/").pop();
          return { blob, name: sanitizeName(fromUrl || fallbackName, fallbackName) };
        } catch {
          return null;
        }
      }
      if (isLikelyBase64(raw)) {
        try {
          const content = toBase64Content(raw);
          const bytes = Uint8Array.from(atob(content), (c) => c.charCodeAt(0));
          return { blob: new Blob([bytes]), name: sanitizeName(fallbackName, fallbackName) };
        } catch {
          return null;
        }
      }
      return null;
    }

    if (entry && typeof entry === "object") {
      const fileObj = entry.file || entry.originalFile;
      if (fileObj instanceof File || fileObj instanceof Blob) {
        return { blob: fileObj as Blob, name: sanitizeName(entry.name || (fileObj as any).name || fallbackName, fallbackName) };
      }

      const possibleUrl = String(entry.url || entry.previewUrl || entry.downloadUrl || entry.path || "").trim();
      if (possibleUrl) {
        try {
          const response = await fetch(possibleUrl);
          if (response.ok) {
            const blob = await response.blob();
            const fromUrl = possibleUrl.split("?")[0].split("/").pop();
            return { blob, name: sanitizeName(entry.name || fromUrl || fallbackName, fallbackName) };
          }
        } catch {
          // fall through
        }
      }

      const base64Raw = String(entry.base64 || entry.data || "").trim();
      if (base64Raw && isLikelyBase64(toBase64Content(base64Raw))) {
        try {
          const content = toBase64Content(base64Raw);
          const bytes = Uint8Array.from(atob(content), (c) => c.charCodeAt(0));
          return { blob: new Blob([bytes]), name: sanitizeName(entry.name || fallbackName, fallbackName) };
        } catch {
          return null;
        }
      }
    }

    return null;
  };

  const downloadSelectedExpenseAttachmentsAsZip = async (expensesToExport: any[]) => {
    if (!expensesToExport.length) {
      alert("No expenses selected.");
      return;
    }

    const zip = new JSZip();
    let addedCount = 0;
    let noAttachmentCount = 0;

    for (let i = 0; i < expensesToExport.length; i += 1) {
      const expense = expensesToExport[i];
      const expenseId = String(expense?.expense_id || expense?.id || expense?._id || i + 1);
      const reference = String(expense?.reference || expense?.reference_number || "").trim();
      const expenseFolder = sanitizeName(reference || `expense-${expenseId}`, `expense-${expenseId}`);
      const entries = getAttachmentEntriesFromExpense(expense);

      if (!entries.length) {
        noAttachmentCount += 1;
        continue;
      }

      let expenseAdded = 0;

      for (let j = 0; j < entries.length; j += 1) {
        const entry = entries[j];
        const fallbackName = `attachment-${j + 1}`;
        const resolved = await resolveAttachmentPayload(entry, fallbackName);

        if (resolved?.blob) {
          zip.file(`${expenseFolder}/${resolved.name}`, resolved.blob);
          expenseAdded += 1;
          addedCount += 1;
        }
      }

      if (expenseAdded === 0) {
        const attachmentNames = entries
          .map((entry: any, index: number) => {
            if (typeof entry === "string") return entry.trim();
            if (entry && typeof entry === "object") {
              return String(entry.name || entry.fileName || `attachment-${index + 1}`).trim();
            }
            return `attachment-${index + 1}`;
          })
          .filter(Boolean);

        if (attachmentNames.length > 0) {
          // Keep export useful even when only attachment names are stored in local data.
          zip.file(
            `${expenseFolder}/_attachment-list.txt`,
            `This expense has attachment records, but binary file content is not available in local storage.\n\nAttachments:\n${attachmentNames.map((name) => `- ${name}`).join("\n")}`
          );
          addedCount += 1;
        } else {
          noAttachmentCount += 1;
        }
      }
    }

    if (addedCount === 0) {
      alert("No downloadable receipt/document files found for the selected expenses.");
      return;
    }

    const content = await zip.generateAsync({ type: "blob" });
    const url = window.URL.createObjectURL(content);
    const link = document.createElement("a");
    link.href = url;
    link.download = `expense-attachments-${new Date().toISOString().slice(0, 10)}.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    const successMessage = noAttachmentCount > 0
      ? `ZIP downloaded. Added ${addedCount} file${addedCount > 1 ? "s" : ""}. ${noAttachmentCount} selected expense${noAttachmentCount > 1 ? "s had" : " had"} no downloadable attachments.`
      : `ZIP downloaded with ${addedCount} file${addedCount > 1 ? "s" : ""}.`;
    setNotification(successMessage as any);
    setTimeout(() => setNotification(null), 4000);
  };

  const handleClearSelection = () => {
    setSelectedExpenses([]);
  };

  /* Custom Views Integration */
  const [customViews, setCustomViews] = useState([]);

  useEffect(() => {
    setCustomViews(getExpenseCustomViews());
  }, [location.pathname]);

  const expenseViews = [
    "All",
    "Unbilled",
    "Invoiced",
    "Reimbursed",
    "Billable",
    "Non-Billable",
    "With Receipts",
    "Without Receipts",
    "From Zoho Expense",
    ...customViews.map(cv => cv.name)
  ];

  const sortOptions = [
    "Created Time",
    "Date",
    "Expense Account",
    "Vendor Name",
    "Paid Through",
    "Customer Name",
    "Amount",
  ];

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !(dropdownRef.current as any).contains(event.target)) {
        setDropdownOpen(false);
      }
      if (moreMenuRef.current && !(moreMenuRef.current as any).contains(event.target)) {
        setMoreMenuOpen(false);
      }
      if (uploadMenuRef.current && !(uploadMenuRef.current as any).contains(event.target)) {
        setUploadMenuOpen(false);
      }
      if (searchTypeDropdownRef.current && !(searchTypeDropdownRef.current as any).contains(event.target)) {
        setIsSearchTypeDropdownOpen(false);
      }
      if (filterDropdownRef.current && !(filterDropdownRef.current as any).contains(event.target)) {
        setIsFilterDropdownOpen(false);
      }
      if (importSubmenuRef.current && !(importSubmenuRef.current as any).contains(event.target)) {
        setImportSubmenuOpen(false);
      }
    };

    if (dropdownOpen || moreMenuOpen || uploadMenuOpen || isSearchTypeDropdownOpen || isFilterDropdownOpen || importSubmenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dropdownOpen, moreMenuOpen, uploadMenuOpen, importSubmenuOpen, isSearchTypeDropdownOpen, isFilterDropdownOpen]);

  const handleViewSelect = (view: string) => {
    setSelectedView(view);
    setDropdownOpen(false);
  };

  const getDisplayText = () => {
    return selectedView === "All" ? "All Expenses" : selectedView;
  };



  // Filter expenses based on selected view and selected expenses
  const filteredExpenses = useMemo(() => {
    let filtered = expenses;

    // First apply view filter
    if (selectedView !== "All") {
      const customView = customViews.find(cv => cv.name === selectedView);

      if (customView) {
        filtered = expenses.filter(expense => {
          return customView.criteria.every(criterion => {
            if (!criterion.field || !criterion.value) return true;

            let expenseValue = "";
            switch (criterion.field) {
              case "Date": expenseValue = expense.date; break;
              case "Expense Account": expenseValue = expense.expenseAccount; break;
              case "Vendor Name": expenseValue = expense.vendorName; break;
              case "Amount": expenseValue = expense.amount; break;
              case "Reference#": expenseValue = expense.referenceNumber; break;
              case "Status": expenseValue = expense.status; break;
              case "Customer Name": expenseValue = expense.customerName; break;
              case "Paid Through": expenseValue = expense.paidThrough; break;
              default: expenseValue = "";
            }

            const val = String(expenseValue || "").toLowerCase();
            const critVal = String(criterion.value).toLowerCase();

            switch (criterion.comparator) {
              case "is": return val === critVal;
              case "is not": return val !== critVal;
              case "contains": return val.includes(critVal);
              case "doesn't contain": return !val.includes(critVal);
              case "starts with": return val.startsWith(critVal);
              case "is empty": return val === "";
              case "is not empty": return val !== "";
              default: return true;
            }
          });
        });
      } else {
        filtered = expenses.filter((expense) => {
          const status = (expense.status || "").toUpperCase();

          switch (selectedView) {
            case "Unbilled":
              return status !== "INVOICED" && status !== "REIMBURSED" && !expense.invoiced && !expense.reimbursed;
            case "Invoiced":
              return status === "INVOICED" || expense.invoiced === true;
            case "Reimbursed":
              return status === "REIMBURSED" || expense.reimbursed === true;
            case "Billable":
              return expense.billable === true || (status !== "NON-BILLABLE" && expense.billable !== false);
            case "Non-Billable":
              return expense.billable === false || status === "NON-BILLABLE";
            case "With Receipts":
              return hasAnyAttachment(expense);
            case "Without Receipts":
              return !hasAnyAttachment(expense);
            case "From Zoho Expense":
              return expense.fromZohoExpense === true || expense.source === "Zoho Expense" || expense.importSource === "Zoho";
            default:
              return true;
          }
        });
      }
    }

    // Apply sorting
    if (selectedSort) {
      filtered = [...filtered].sort((a, b) => {
        let aValue, bValue;

        switch (selectedSort) {
          case "Created Time":
            aValue = new Date(a.createdAt || a.date || 0).getTime();
            bValue = new Date(b.createdAt || b.date || 0).getTime();
            return bValue - aValue; // Descending (newest first)
          case "Date":
            aValue = new Date(a.date || 0).getTime();
            bValue = new Date(b.date || 0).getTime();
            return bValue - aValue; // Descending (newest first)
          case "Expense Account":
            aValue = (a.expenseAccount || "").toLowerCase();
            bValue = (b.expenseAccount || "").toLowerCase();
            return aValue.localeCompare(bValue);
          case "Vendor Name":
            aValue = (a.vendorName || "").toLowerCase();
            bValue = (b.vendorName || "").toLowerCase();
            return aValue.localeCompare(bValue);
          case "Paid Through":
            aValue = (a.paidThrough || "").toLowerCase();
            bValue = (b.paidThrough || "").toLowerCase();
            return aValue.localeCompare(bValue);
          case "Customer Name":
            aValue = (a.customerName || "").toLowerCase();
            bValue = (b.customerName || "").toLowerCase();
            return aValue.localeCompare(bValue);
          case "Amount":
            aValue = parseFloat(a.amount || 0);
            bValue = parseFloat(b.amount || 0);
            return bValue - aValue; // Descending (highest first)
          default:
            return 0;
        }
      });
    }

    return filtered;
  }, [expenses, selectedView, customViews, selectedSort]);

  const styles = {
    container: {
      width: "100%",
      backgroundColor: "#ffffff",
      borderRadius: "8px",
      border: "1px solid #e5e7eb",
      boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)",
    },
    header: {
      padding: "16px 24px",
      borderBottom: "1px solid #e5e7eb",
      backgroundColor: "#ffffff",
    },
    headerContent: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: "16px",
    },
    headerLeft: {
      display: "flex",
      alignItems: "center",
      gap: "16px",
      flex: 1,
    },
    receiptsInboxLink: {
      padding: "8px 16px",
      fontSize: "14px",
      fontWeight: "500",
      color: "#6b7280",
      textDecoration: "none",
      borderRadius: "6px",
      border: "none",
      background: "none",
      cursor: "pointer",
    },
    receiptsInboxLinkActive: {
      color: "#156372",
      backgroundColor: "#15637210",
    },
    dropdownWrapper: {
      position: "relative",
      display: "inline-block",
    },
    title: {
      fontSize: "24px",
      fontWeight: "700",
      color: "#111827",
      margin: 0,
      display: "flex",
      alignItems: "center",
      gap: "4px",
      flexWrap: "wrap",
    },
    statusText: {
      display: "inline-flex",
      alignItems: "center",
      gap: "4px",
      color: "#111827",
      fontWeight: "700",
    },
    chevronButton: {
      background: "none",
      border: "none",
      padding: 0,
      margin: 0,
      cursor: "pointer",
      display: "inline-flex",
      alignItems: "center",
      color: "#156372",
    },
    headerRight: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
    },
    uploadButton: {
      padding: "8px 16px",
      backgroundColor: "#ffffff",
      color: "#374151",
      fontSize: "14px",
      fontWeight: "500",
      borderRadius: "6px",
      border: "1px solid #d1d5db",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      gap: "4px",
    },
    uploadMenu: {
      position: "absolute",
      top: "100%",
      left: 0,
      marginTop: "8px",
      backgroundColor: "#ffffff",
      borderRadius: "8px",
      boxShadow: "0 8px 18px rgba(0, 0, 0, 0.14)",
      border: "1px solid #e5e7eb",
      minWidth: "186px",
      zIndex: 100,
      padding: "6px",
    },
    uploadMenuItem: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "10px 14px",
      fontSize: "13px",
      fontWeight: "600",
      color: "#ffffff",
      cursor: "pointer",
      border: "none",
      backgroundColor: "#3b82f6",
      width: "100%",
      borderRadius: "10px",
      boxShadow: "inset 0 0 0 2px #bfdbfe, 0 0 0 1px #2563eb",
      textAlign: "left",
    },
    newButton: {
      padding: "8px 16px",
      background: "linear-gradient(to right, #156372, #0D4A52)",
      color: "#ffffff",
      fontSize: "14px",
      fontWeight: "500",
      borderRadius: "6px",
      border: "none",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      gap: "4px",
      transition: "opacity 0.2s",
      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
    },
    moreButton: {
      padding: "8px",
      color: "#111827",
      backgroundColor: "#ffffff",
      border: "1px solid #d1d5db",
      borderRadius: "6px",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      width: "36px",
      height: "36px",
    },
    dropdown: {
      position: "absolute",
      top: "100%",
      left: 0,
      marginTop: "8px",
      backgroundColor: "#ffffff",
      borderRadius: "8px",
      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
      border: "1px solid #e5e7eb",
      minWidth: "240px",
      zIndex: 100,
      padding: "4px 0",
    },
    dropdownItem: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "8px 16px",
      fontSize: "14px",
      color: "#374151",
      cursor: "pointer",
      border: "none",
      background: "none",
      width: "100%",
      textAlign: "left" as const,
    },
    dropdownItemSelected: {
      backgroundColor: "#15637210",
      borderLeft: "3px solid #156372",
    },
    dropdownItemText: {
      flex: 1,
    },
    dropdownStar: {
      color: "#9ca3af",
      width: "16px",
      height: "16px",
    },
    dropdownDivider: {
      height: "1px",
      backgroundColor: "#e5e7eb",
      margin: "4px 0",
    },
    dropdownNewView: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
      padding: "8px 16px",
      fontSize: "14px",
      color: "#156372",
      cursor: "pointer",
      border: "none",
      background: "none",
      width: "100%",
      textAlign: "left" as const,
    },
    moreDropdownWrapper: {
      position: "relative",
      display: "inline-block",
    },
    moreDropdown: {
      position: "absolute",
      top: "100%",
      right: 0,
      marginTop: "8px",
      backgroundColor: "#ffffff",
      borderRadius: "8px",
      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
      border: "1px solid #e5e7eb",
      minWidth: "200px",
      zIndex: 100,
      padding: "4px 0",
    },
    moreDropdownItem: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
      padding: "8px 16px",
      fontSize: "14px",
      color: "#111827",
      cursor: "pointer",
      border: "none",
      background: "none",
      width: "100%",
      textAlign: "left" as const,
    },
    submenuWrapper: {
      position: "relative",
    },
    submenu: {
      position: "absolute",
      right: "100%",
      top: 0,
      marginRight: "4px",
      backgroundColor: "#ffffff",
      borderRadius: "8px",
      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
      border: "1px solid #e5e7eb",
      minWidth: "200px",
      zIndex: 101,
      padding: "4px 0",
    },
    submenuItem: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "8px 16px",
      fontSize: "14px",
      color: "#111827",
      cursor: "pointer",
      border: "none",
      background: "none",
      width: "100%",
      textAlign: "left" as const,
    },
    submenuItemSelected: {
      backgroundColor: "#15637210",
      color: "#156372",
    },
    tableContainer: {
      padding: "24px",
    },
    tableWrapper: {
      overflowX: "auto",
      border: "1px solid #e5e7eb",
      borderRadius: "6px",
    },
    table: {
      width: "100%",
      borderCollapse: "collapse",
      backgroundColor: "#ffffff",
    },
    tableHeader: {
      backgroundColor: "#f9fafb",
      borderBottom: "1px solid #e5e7eb",
    },
    tableHeaderCell: {
      padding: "12px",
      textAlign: "left" as const,
      fontSize: "12px",
      fontWeight: "600",
      color: "#6b7280",
      textTransform: "uppercase",
      whiteSpace: "nowrap",
    },
    tableHeaderCellWithCheckbox: {
      padding: "12px",
      textAlign: "left",
      fontSize: "12px",
      fontWeight: "600",
      color: "#6b7280",
      textTransform: "uppercase",
      position: "relative",
    },
    tableHeaderCheckboxWrapper: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
    },
    tableHeaderAmount: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
    },
    tableRow: {
      borderBottom: "1px solid #e5e7eb",
      cursor: "pointer",
    },
    tableCell: {
      padding: "12px",
      fontSize: "14px",
      color: "#111827",
      whiteSpace: "nowrap",
    },
    tableCheckbox: {
      width: "16px",
      height: "16px",
      cursor: "pointer",
    },
    expenseAccountLink: {
      color: "#156372",
      textDecoration: "none",
      cursor: "pointer",
    },
    statusBadge: {
      padding: "4px 8px",
      fontSize: "12px",
      fontWeight: "500",
      backgroundColor: "#f3f4f6",
      color: "#374151",
      borderRadius: "4px",
      display: "inline-block",
    },
    tableAmount: {
      fontWeight: "500",
    },
    skeletonCell: {
      height: "16px",
      backgroundColor: "#e5e7eb",
      borderRadius: "4px",
      animation: "pulse 1.5s ease-in-out infinite",
    },
    skeletonCheckbox: {
      width: "16px",
      height: "16px",
      backgroundColor: "#e5e7eb",
      borderRadius: "4px",
      animation: "pulse 1.5s ease-in-out infinite",
    },
  };

  return (
    <div className="w-full border border-gray-200 bg-white">
      {/* Header */}
      {selectedExpenses.length === 0 && (
        <div className="border-b border-gray-200 bg-white px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-1 items-center gap-6">
              <button
                className="cursor-pointer border-none bg-transparent py-2 text-base font-medium text-gray-500"
                onClick={() => navigate("/expenses/receipts")}
              >
                Receipts Inbox
              </button>
              <div className="relative inline-block" ref={dropdownRef}>
                <button
                  className="flex cursor-pointer items-center gap-1.5 border-none border-b-2 border-b-blue-500 bg-transparent py-2 text-base font-bold text-gray-900"
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                >
                  {getDisplayText()}
                  {dropdownOpen ? (
                    <ChevronUp size={18} className="text-blue-500" />
                  ) : (
                    <ChevronDown size={18} className="text-blue-500" />
                  )}
                </button>
                {dropdownOpen && (
                  <div className="absolute left-0 top-full z-[100] mt-2 min-w-[240px] rounded-lg border border-gray-200 bg-white py-1 shadow-md">
                    {expenseViews.map((view) => (
                      <button
                        key={view}
                        className={`flex w-full items-center justify-between px-4 py-2 text-left text-sm ${selectedView === view ? "border-l-[3px] border-l-[#156372] bg-[#15637210] text-gray-700" : "bg-transparent text-gray-700 hover:bg-gray-50"}`}
                        onClick={() => handleViewSelect(view)}
                      >
                        <span className="flex-1">{view}</span>
                        <Star
                          size={16}
                          className="h-4 w-4 text-gray-400"
                          fill="none"
                          strokeWidth={1.5}
                        />
                      </button>
                    ))}
                    <div className="my-1 h-px bg-gray-200" />
                    <button
                      className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-[#156372] hover:bg-gray-50"
                      onClick={() => {
                        setDropdownOpen(false);
                        navigate("/expenses/custom-view/new");
                      }}
                    >
                      <Plus size={16} />
                      New Custom View
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative inline-block" ref={uploadMenuRef}>
                <button
                  className="flex cursor-pointer items-center gap-1 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700"
                  onClick={() => setUploadMenuOpen(!uploadMenuOpen)}
                >
                  Upload Expense
                  <ChevronDown size={16} className="text-gray-500" />
                </button>
                {uploadMenuOpen && (
                  <div className="absolute left-0 top-full z-[100] mt-2 min-w-[186px] rounded-lg border border-gray-200 bg-white p-1.5 shadow-[0_8px_18px_rgba(0,0,0,0.14)]">
                    <button className="w-full rounded-[10px] bg-blue-500 px-3.5 py-2.5 text-left text-[13px] font-semibold text-white shadow-[inset_0_0_0_2px_#bfdbfe,0_0_0_1px_#2563eb]" onClick={handleAttachFromDesktop}>
                      Attach From Desktop
                    </button>
                  </div>
                )}
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  onChange={handleFileSelect}
                  multiple
                  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv"
                />
              </div>
              <button
                className="flex cursor-pointer items-center gap-1 rounded-md border-none bg-emerald-500 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600"
                onClick={() => navigate("/expenses/new")}
              >
                <Plus size={16} />
                New
              </button>
              <div className="relative inline-block" ref={moreMenuRef}>
                <button
                  className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-md border border-gray-300 bg-white p-2 text-gray-900 hover:bg-gray-50"
                  onClick={() => setMoreMenuOpen(!moreMenuOpen)}
                >
                  <MoreVertical size={18} />
                </button>
                {moreMenuOpen && (
                  <div className="absolute right-0 top-full z-[100] mt-2 min-w-[200px] rounded-lg border border-gray-200 bg-white py-1 shadow-md">
                    <div
                      className="relative"
                      onMouseEnter={() => {
                        setSortSubmenuOpen(true);
                        setHoveredMenuItem('sort');
                      }}
                      onMouseLeave={() => {
                        setSortSubmenuOpen(false);
                        setHoveredMenuItem(null);
                      }}
                    >
                      <button
                        className={`flex w-full items-center gap-2 px-4 py-2 text-left text-sm ${(hoveredMenuItem === 'sort' || sortSubmenuOpen) ? "bg-[#156372] text-white" : "bg-transparent text-gray-900"}`}
                      >
                        <ArrowUpDown size={16} className={(hoveredMenuItem === 'sort' || sortSubmenuOpen) ? "text-white" : "text-gray-500"} />
                        <span>Sort by</span>
                        <ChevronRight size={16} className={`ml-auto ${(hoveredMenuItem === 'sort' || sortSubmenuOpen) ? "text-white" : "text-gray-500"}`} />
                      </button>
                      {sortSubmenuOpen && (
                        <div className="absolute right-full top-0 z-[101] mr-1 min-w-[200px] rounded-lg border border-gray-200 bg-white py-1 shadow-md">
                          {sortOptions.map((option) => (
                            <button
                              key={option}
                              className={`flex w-full items-center justify-between px-4 py-2 text-left text-sm ${selectedSort === option ? "bg-[#15637210] text-[#156372]" : "text-gray-900 hover:bg-gray-100"}`}
                              onClick={() => {
                                setSelectedSort(option);
                                setSortSubmenuOpen(false);
                                setMoreMenuOpen(false);
                              }}
                            >
                              <span>{option}</span>
                              {selectedSort === option && (
                                <ChevronDown size={16} className="text-[#156372]" />
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <div
                      className="relative"
                      ref={importSubmenuRef}
                      onMouseEnter={() => setImportSubmenuOpen(true)}
                      onMouseLeave={() => setImportSubmenuOpen(false)}
                    >
                      <button
                        className={`flex w-full items-center gap-2 px-4 py-2 text-left text-sm ${(hoveredMenuItem === 'import' || importSubmenuOpen) ? "bg-[#156372] text-white" : "bg-transparent text-gray-900"}`}
                        onMouseEnter={() => setHoveredMenuItem('import')}
                        onMouseLeave={() => setHoveredMenuItem(null)}
                      >
                        <Download size={16} className={(hoveredMenuItem === 'import' || importSubmenuOpen) ? "text-white" : "text-gray-500"} />
                        <span>Import</span>
                        <ChevronRight size={16} className={`ml-auto ${(hoveredMenuItem === 'import' || importSubmenuOpen) ? "text-white" : "text-gray-500"}`} />
                      </button>
                      {importSubmenuOpen && (
                        <div className="absolute right-full top-0 z-[101] mr-1 min-w-[200px] rounded-lg border border-gray-200 bg-white py-1 shadow-md">
                          <button
                            className="w-full px-4 py-2 text-left text-[13px] text-gray-900 hover:bg-gray-100"
                            onClick={() => {
                              setMoreMenuOpen(false);
                              navigate("/expenses/import");
                            }}
                          >
                            Import Expenses
                          </button>
                          <button
                            className="w-full px-4 py-2 text-left text-[13px] text-gray-900 hover:bg-gray-100"
                            onClick={() => downloadSampleFile('csv')}
                          >
                            Download Sample CSV
                          </button>
                          <button
                            className="w-full px-4 py-2 text-left text-[13px] text-gray-900 hover:bg-gray-100"
                            onClick={() => downloadSampleFile('xls')}
                          >
                            Download Sample XLS
                          </button>
                        </div>
                      )}
                    </div>

                    <div
                      className="relative"
                      onMouseEnter={() => {
                        setExportSubmenuOpen(true);
                        setHoveredMenuItem('export');
                      }}
                      onMouseLeave={() => {
                        setExportSubmenuOpen(false);
                        setHoveredMenuItem(null);
                      }}
                    >
                      <button
                        className={`flex w-full items-center gap-2 px-4 py-2 text-left text-sm ${(hoveredMenuItem === 'export' || exportSubmenuOpen) ? "bg-[#156372] text-white" : "bg-transparent text-gray-900"}`}
                      >
                        <Upload size={16} className={(hoveredMenuItem === 'export' || exportSubmenuOpen) ? "text-white" : "text-gray-500"} />
                        <span>Export</span>
                        <ChevronRight size={16} className={`ml-auto ${(hoveredMenuItem === 'export' || exportSubmenuOpen) ? "text-white" : "text-gray-500"}`} />
                      </button>
                      {exportSubmenuOpen && (
                        <div className="absolute right-full top-0 z-[101] mr-1 min-w-[200px] rounded-lg border border-gray-200 bg-white py-1 shadow-md">
                          <button
                            className="w-full px-4 py-2 text-left text-[13px] text-gray-900 hover:bg-gray-100"
                            onClick={() => {
                              setMoreMenuOpen(false);
                              setExportSubmenuOpen(false);
                              setExportType("expenses");
                              setShowExportModal(true);
                            }}
                          >
                            Export Expenses
                          </button>
                          <button
                            className="w-full px-4 py-2 text-left text-[13px] text-gray-900 hover:bg-gray-100"
                            onClick={() => {
                              setMoreMenuOpen(false);
                              setExportSubmenuOpen(false);
                              setExportType("current-view");
                              setShowExportModal(true);
                            }}
                          >
                            Export Current View
                          </button>
                        </div>
                      )}
                    </div>





                    <button
                      className={`flex w-full items-center gap-2 px-4 py-2 text-left text-sm ${hoveredMenuItem === 'preferences' ? "bg-[#156372] text-white" : "bg-transparent text-gray-900"}`}
                      onMouseEnter={() => setHoveredMenuItem('preferences')}
                      onMouseLeave={() => setHoveredMenuItem(null)}
                      onClick={() => {
                        setMoreMenuOpen(false);
                        navigate("/settings/expenses");
                      }}
                    >
                      <Settings size={16} className={hoveredMenuItem === 'preferences' ? "text-white" : "text-gray-500"} />
                      <span>Preferences</span>
                    </button>

                    <button
                      className={`flex w-full items-center gap-2 px-4 py-2 text-left text-sm ${hoveredMenuItem === 'refresh' ? "bg-[#156372] text-white" : "bg-transparent text-gray-900"}`}
                      onMouseEnter={() => setHoveredMenuItem('refresh')}
                      onMouseLeave={() => setHoveredMenuItem(null)}
                      onClick={() => {
                        setMoreMenuOpen(false);
                        handleRefresh();
                      }}
                      disabled={isRefreshing}
                    >
                      <RotateCw
                        size={16}
                        className={`${hoveredMenuItem === 'refresh' ? "text-white" : "text-gray-500"} ${isRefreshing ? "animate-spin" : ""}`}
                      />
                      <span>Refresh List</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main content area */}
      <div className="p-0">
        {/* Action Bar - Shows when items are selected */}
        {selectedExpenses.length > 0 && (
          <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-4 py-3">
            <div className="flex items-center gap-3">
              <button
                onClick={handleBulkUpdate}
                className="flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100"
              >
                Bulk Update
              </button>

              <button
                onClick={handleDownloadReceipt}
                className="flex items-center justify-center rounded-md border border-gray-300 bg-white p-1.5 text-sm text-gray-700 hover:bg-gray-100"
              >
                <FileText size={16} />
              </button>

              <button
                onClick={handleDeleteSelected}
                className="flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-[#0D4A52] hover:bg-red-50"
              >
                Delete
              </button>

              <span className="ml-1 flex h-6 min-w-6 items-center justify-center rounded bg-gradient-to-r from-[#156372] to-[#0D4A52] px-2 text-[13px] font-semibold text-white">
                {selectedExpenses.length}
              </span>
              <span className="ml-1 text-sm font-medium text-gray-700">
                Selected
              </span>
            </div>

            <button
              onClick={handleClearSelection}
              className="flex items-center gap-1 border-none bg-transparent px-2 py-1 text-xs text-gray-500 hover:text-gray-700"
              title="Press Esc to clear selection"
            >
              <span className="text-[11px]">Esc</span>
              <X size={14} />
            </button>
          </div>
        )}

        <div className="overflow-x-auto border-t border-gray-200">
          <table className="w-full min-w-0 border-collapse table-fixed bg-white" style={{ minWidth: `${tableMinWidth}px` }}>
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="group/header relative px-3 py-3 text-left text-xs font-semibold uppercase text-gray-500" style={{ width: columnWidths.select }}>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="cursor-pointer border-none bg-transparent p-0 text-[#156372] hover:text-[#0f4a56]"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowCustomizeColumnsModal(true);
                      }}
                    >
                      <SlidersHorizontal size={14} />
                    </button>
                    <input
                      type="checkbox"
                      checked={selectedExpenses.length === filteredExpenses.length && filteredExpenses.length > 0}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedExpenses(filteredExpenses.map((e) => e.id));
                        } else {
                          setSelectedExpenses([]);
                        }
                      }}
                      className="h-4 w-4 cursor-pointer"
                    />
                  </div>
                  {renderResizeHandle("select")}
                </th>
                {isColumnVisible("date") && (
                <th className="group/header relative whitespace-nowrap px-3 py-3 text-left text-xs font-semibold uppercase text-gray-500" style={{ width: columnWidths.date }}>
                  DATE
                  {renderResizeHandle("date")}
                </th>
                )}
                {isColumnVisible("location") && (
                <th className="group/header relative whitespace-nowrap px-3 py-3 text-left text-xs font-semibold uppercase text-gray-500" style={{ width: columnWidths.location }}>
                  LOCATION
                  {renderResizeHandle("location")}
                </th>
                )}
                {isColumnVisible("expenseAccount") && (
                <th className="group/header relative whitespace-nowrap px-3 py-3 text-left text-xs font-semibold uppercase text-gray-500" style={{ width: columnWidths.expenseAccount }}>
                  EXPENSE ACCOUNT
                  {renderResizeHandle("expenseAccount")}
                </th>
                )}
                {isColumnVisible("reference") && (
                <th className="group/header relative whitespace-nowrap px-3 py-3 text-left text-xs font-semibold uppercase text-gray-500" style={{ width: columnWidths.reference }}>
                  REFERENCE#
                  {renderResizeHandle("reference")}
                </th>
                )}
                {isColumnVisible("customerName") && (
                <th className="group/header relative whitespace-nowrap px-3 py-3 text-left text-xs font-semibold uppercase text-gray-500" style={{ width: columnWidths.customerName }}>
                  CUSTOMER NAME
                  {renderResizeHandle("customerName")}
                </th>
                )}
                {isColumnVisible("status") && (
                <th className="group/header relative whitespace-nowrap px-3 py-3 text-left text-xs font-semibold uppercase text-gray-500" style={{ width: columnWidths.status }}>
                  STATUS
                  {renderResizeHandle("status")}
                </th>
                )}
                {isColumnVisible("amount") && (
                <th className="group/header relative whitespace-nowrap px-3 py-3 text-right text-xs font-semibold uppercase text-gray-500" style={{ width: columnWidths.amount }}>
                  <div className="flex items-center justify-between">
                    AMOUNT
                  </div>
                  {renderResizeHandle("amount")}
                </th>
                )}
                <th className="whitespace-nowrap px-3 py-3 text-center text-xs font-semibold uppercase text-gray-500" style={{ width: columnWidths.actions }}>
                  <button
                    className="mx-auto flex cursor-pointer items-center border-none bg-transparent p-1 text-gray-500"
                    onClick={() => setShowSearchModal(true)}
                  >
                    <Search size={14} />
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {isRefreshing ? (
                // Skeleton loading rows
                Array.from({ length: 5 }).map((_, index) => (
                  <tr key={`skeleton-${index}`} className="cursor-pointer border-b border-gray-200">
                    <td className="whitespace-nowrap px-3 py-3 text-sm text-gray-900" style={{ width: columnWidths.select }}>
                      <div className="flex items-center gap-2">
                        <span className="inline-block w-[14px] shrink-0" aria-hidden="true"></span>
                        <div className="h-4 w-4 animate-pulse rounded bg-gray-200"></div>
                      </div>
                    </td>
                    {isColumnVisible("date") && <td className="whitespace-nowrap px-3 py-3 text-sm text-gray-900" style={{ width: columnWidths.date }}>
                      <div className="h-4 w-[80px] animate-pulse rounded bg-gray-200"></div>
                    </td>}
                    {isColumnVisible("location") && <td className="whitespace-nowrap px-3 py-3 text-sm text-gray-900" style={{ width: columnWidths.location }}>
                      <div className="h-4 w-[100px] animate-pulse rounded bg-gray-200"></div>
                    </td>}
                    {isColumnVisible("expenseAccount") && <td className="whitespace-nowrap px-3 py-3 text-sm text-gray-900" style={{ width: columnWidths.expenseAccount }}>
                      <div className="h-4 w-[150px] animate-pulse rounded bg-gray-200"></div>
                    </td>}
                    {isColumnVisible("reference") && <td className="whitespace-nowrap px-3 py-3 text-sm text-gray-900" style={{ width: columnWidths.reference }}>
                      <div className="h-4 w-[80px] animate-pulse rounded bg-gray-200"></div>
                    </td>}
                    {isColumnVisible("customerName") && <td className="whitespace-nowrap px-3 py-3 text-sm text-gray-900" style={{ width: columnWidths.customerName }}>
                      <div className="h-4 w-[100px] animate-pulse rounded bg-gray-200"></div>
                    </td>}
                    {isColumnVisible("status") && <td className="whitespace-nowrap px-3 py-3 text-sm text-gray-900" style={{ width: columnWidths.status }}>
                      <div className="h-4 w-[80px] animate-pulse rounded bg-gray-200"></div>
                    </td>}
                    {isColumnVisible("amount") && <td className="whitespace-nowrap px-3 py-3 text-sm text-gray-900" style={{ width: columnWidths.amount }}>
                      <div className="h-4 w-[70px] animate-pulse rounded bg-gray-200"></div>
                    </td>}
                    <td className="whitespace-nowrap px-3 py-3 text-sm text-gray-900" style={{ width: columnWidths.actions }}>
                      <div className="mx-auto h-4 w-4 animate-pulse rounded bg-gray-200"></div>
                    </td>
                  </tr>
                ))
              ) : filteredExpenses.length > 0 ? (
                filteredExpenses.map((expense) => (
                  <tr
                    key={expense.id}
                    className={`cursor-pointer border-b border-gray-200 ${selectedExpenses.includes(expense.id) ? "bg-[#15637210]" : "bg-transparent hover:bg-gray-50"}`}
                    onClick={(e) => {
                      // Don't navigate if clicking on checkbox
                      if ((e.target as HTMLInputElement).type !== "checkbox") {
                        navigate(`/expenses/${expense.id}`);
                      }
                    }}
                  >
                    <td className="whitespace-nowrap px-3 py-3 text-sm text-gray-900" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-2">
                        <span className="inline-block w-[14px] shrink-0" aria-hidden="true"></span>
                        <input
                          type="checkbox"
                          checked={selectedExpenses.includes(expense.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedExpenses([...selectedExpenses, expense.id]);
                            } else {
                              setSelectedExpenses(selectedExpenses.filter((id) => id !== expense.id));
                            }
                          }}
                          className="h-4 w-4 cursor-pointer"
                        />
                      </div>
                    </td>
                    {isColumnVisible("date") && <td className="whitespace-nowrap px-3 py-3 text-sm text-gray-900" style={{ width: columnWidths.date }}>{expense.date}</td>}
                    {isColumnVisible("location") && <td className="whitespace-nowrap px-3 py-3 text-sm text-gray-900" style={{ width: columnWidths.location }}>{expense.location}</td>}
                    {isColumnVisible("expenseAccount") && <td className="whitespace-nowrap px-3 py-3 text-sm text-gray-900" style={{ width: columnWidths.expenseAccount }}>
                      <span
                        className="cursor-pointer text-blue-500 no-underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {expense.expenseAccount}
                      </span>
                    </td>}
                    {isColumnVisible("reference") && <td className="whitespace-nowrap px-3 py-3 text-sm text-gray-900" style={{ width: columnWidths.reference }}>{expense.reference || ""}</td>}
                    {isColumnVisible("customerName") && <td className="whitespace-nowrap px-3 py-3 text-sm text-gray-900" style={{ width: columnWidths.customerName }}>{expense.customerName || ""}</td>}
                    {isColumnVisible("status") && <td className="whitespace-nowrap px-3 py-3 text-sm font-medium text-[#7b88a3]" style={{ width: columnWidths.status }}>
                      {(expense.status || "").toUpperCase()}
                    </td>}
                    {isColumnVisible("amount") && <td className="whitespace-nowrap px-3 py-3 text-right text-sm font-medium text-gray-900" style={{ width: columnWidths.amount }}>
                      {expense.currencySymbol || symbol || baseCurrency?.symbol || "KSh"} {parseFloat(expense.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>}
                    <td className="whitespace-nowrap px-3 py-3 text-center text-sm text-gray-700" style={{ width: columnWidths.actions }}>
                      {hasAnyAttachment(expense) ? <Paperclip size={14} className="mx-auto" /> : null}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={visibleColumnKeys.length + 2} className="px-4 py-12 text-center text-sm text-gray-500">
                    No expenses found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showCustomizeColumnsModal && (
        <div className="fixed inset-0 z-[2200] bg-black/45" onClick={() => setShowCustomizeColumnsModal(false)}>
          <div
            className="mx-auto mt-8 w-full max-w-[640px] rounded-md border border-gray-300 bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3">
              <div className="flex items-center gap-2 text-base text-gray-700">
                <SlidersHorizontal size={14} className="text-gray-600" />
                <span className="text-2xl font-medium text-gray-700">Customize Columns</span>
              </div>
              <div className="text-sm text-gray-500">{visibleColumnKeys.length} of {allTableColumns.length} Selected</div>
            </div>
            <div className="px-5 py-4">
              <div className="mb-3 rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-400">
                Search
              </div>
              <div className="space-y-2">
                {allTableColumns.map((col) => (
                  <div key={col.key} className="flex items-center justify-between rounded bg-gray-50 px-3 py-3">
                    <label className="flex items-center gap-3 text-sm text-gray-700">
                      <span className="text-gray-400">⋮⋮</span>
                      <input
                        type="checkbox"
                        checked={visibleColumnKeys.includes(col.key)}
                        disabled={col.required}
                        onChange={() => toggleVisibleColumn(col.key)}
                        className="h-4 w-4"
                      />
                      <span>{col.label}</span>
                    </label>
                    {col.required && <Lock size={14} className="text-gray-400" />}
                  </div>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-3 border-t border-gray-200 px-5 py-4">
              <button
                className="rounded bg-emerald-500 px-4 py-2 text-sm text-white hover:bg-emerald-600"
                onClick={() => setShowCustomizeColumnsModal(false)}
              >
                Save
              </button>
              <button
                className="rounded border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                onClick={() => setShowCustomizeColumnsModal(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Custom View Modal */}
      {/*
        showCustomViewModal && (
          <NewCustomViewModal
            onClose={() => setShowCustomViewModal(false)}
            onSave={(customView) => {
              // Handle saving custom view
              console.log("Custom view saved:", customView);
              setShowCustomViewModal(false);
            }}
          />
        )
      */}

      {/* Bulk Update Modal */}
      <BulkUpdateModal
        isOpen={showBulkUpdateModal}
        onClose={() => setShowBulkUpdateModal(false)}
        title="Bulk Update Expenses"
        fieldOptions={expenseFieldOptions}
        onUpdate={handleBulkUpdateSubmit}
        entityName="expenses"
      />

      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleConfirmDelete}
        entityName="expense(s)"
        count={selectedExpenses.length}
      />

      {/* Export Expenses Modal */}
      {showExportModal && (
        <ExportExpenses
          onClose={() => setShowExportModal(false)}
          exportType={exportType}
          data={exportType === "current-view" ? filteredExpenses : expenses}
        />
      )}

      {/* Search Modal */}
      {showSearchModal && (
        <div
          className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowSearchModal(false);
            }
          }}
        >
          <div
            className="mx-4 max-h-[90vh] w-full max-w-[800px] overflow-y-auto rounded-xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-5">
              <div className="flex items-center gap-8">
                {/* Search Type Dropdown */}
                <div className="flex items-center gap-3">
                  <label className="text-[13px] font-semibold text-gray-700">Search</label>
                  <div className="relative" ref={searchTypeDropdownRef}>
                    <div
                      className={`flex w-[160px] cursor-pointer items-center justify-between rounded-lg border px-4 py-2.5 text-sm transition-all duration-200 ${
                        isSearchTypeDropdownOpen
                          ? "border-[#156372] ring-2 ring-[#15637210]"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsSearchTypeDropdownOpen(!isSearchTypeDropdownOpen);
                      }}
                    >
                      <span className="font-medium text-gray-700">{searchType}</span>
                      <ChevronDown
                        size={16}
                        className={`text-gray-400 transition-transform duration-200 ${
                          isSearchTypeDropdownOpen ? "rotate-180" : ""
                        }`}
                      />
                    </div>
                    {isSearchTypeDropdownOpen && (
                      <div className="absolute left-0 right-0 top-full z-[1002] mt-2 max-h-[400px] overflow-y-auto rounded-xl border border-gray-100 bg-white p-1.5 shadow-xl">
                        {searchTypeOptions.map((option) => (
                          <div
                            key={option}
                            className={`cursor-pointer rounded-lg px-4 py-2.5 text-sm transition-all duration-200 ${
                              searchType === option
                                ? "bg-[#156372] font-semibold text-white shadow-md shadow-[#15637230]"
                                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
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
                <div className="flex items-center gap-3">
                  <label className="text-[13px] font-semibold text-gray-700">Filter</label>
                  <div className="relative" ref={filterDropdownRef}>
                    <div
                      className={`flex w-[160px] cursor-pointer items-center justify-between rounded-lg border px-4 py-2.5 text-sm transition-all duration-200 ${
                        isFilterDropdownOpen
                          ? "border-[#156372] ring-2 ring-[#15637210]"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                      onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)}
                    >
                      <span className="font-medium text-gray-700">{selectedView}</span>
                      <ChevronDown
                        size={16}
                        className={`text-gray-400 transition-transform duration-200 ${
                          isFilterDropdownOpen ? "rotate-180" : ""
                        }`}
                      />
                    </div>
                    {isFilterDropdownOpen && (
                      <div className="absolute left-0 right-0 top-full z-[1002] mt-2 rounded-xl border border-gray-100 bg-white p-1.5 shadow-xl">
                        {["All", "Open", "Paid", "Draft"].map((view) => (
                          <div
                            key={view}
                            className="cursor-pointer rounded-lg px-4 py-2.5 text-sm font-medium text-gray-600 transition-all duration-200 hover:bg-gray-50 hover:text-gray-900"
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
                className="flex h-10 w-10 items-center justify-center rounded-full text-gray-400 transition-all duration-200 hover:bg-gray-100 hover:text-gray-600 focus:outline-none"
                onClick={() => setShowSearchModal(false)}
              >
                <X size={20} />
              </button>
            </div>

            {/* Search Criteria Body */}
            <div className="p-8">
              {searchType === "Expenses" && (
                <div className="grid grid-cols-2 gap-8">
                  {/* Left Column */}
                  <div className="flex flex-col gap-5">
                    {/* Expense Account */}
                    <div>
                      <label className="mb-2 block text-[13px] font-semibold text-gray-700">
                        Expense Account
                      </label>
                      <div className="relative">
                        <select
                          value={searchModalData.expenseAccount}
                          onChange={(e) =>
                            setSearchModalData((prev) => ({ ...prev, expenseAccount: e.target.value }))
                          }
                          className="w-full appearance-none rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 transition-all duration-200 focus:border-[#156372] focus:outline-none focus:ring-2 focus:ring-[#15637210]"
                        >
                          <option value="">Select expense account</option>
                          <option value="Cost of Goods Sold">Cost of Goods Sold</option>
                          <option value="Advertising And Marketing">Advertising And Marketing</option>
                          <option value="Office Supplies">Office Supplies</option>
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      </div>
                    </div>

                    {/* Notes */}
                    <div>
                      <label className="mb-2 block text-[13px] font-semibold text-gray-700">
                        Notes
                      </label>
                      <input
                        type="text"
                        placeholder="Search by notes..."
                        value={searchModalData.notes}
                        onChange={(e) => setSearchModalData((prev) => ({ ...prev, notes: e.target.value }))}
                        className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 transition-all duration-200 focus:border-[#156372] focus:outline-none focus:ring-2 focus:ring-[#15637210]"
                      />
                    </div>

                    {/* Date Range */}
                    <div>
                      <label className="mb-2 block text-[13px] font-semibold text-gray-700">
                        Date Range
                      </label>
                      <div className="flex items-center gap-3">
                        <input
                          type="text"
                          placeholder="DD/MM/YYYY"
                          value={searchModalData.dateRangeFromExpense}
                          onChange={(e) =>
                            setSearchModalData((prev) => ({ ...prev, dateRangeFromExpense: e.target.value }))
                          }
                          className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 transition-all duration-200 focus:border-[#156372] focus:outline-none focus:ring-2 focus:ring-[#15637210]"
                        />
                        <span className="text-gray-400">—</span>
                        <input
                          type="text"
                          placeholder="DD/MM/YYYY"
                          value={searchModalData.dateRangeToExpense}
                          onChange={(e) =>
                            setSearchModalData((prev) => ({ ...prev, dateRangeToExpense: e.target.value }))
                          }
                          className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 transition-all duration-200 focus:border-[#156372] focus:outline-none focus:ring-2 focus:ring-[#15637210]"
                        />
                      </div>
                    </div>

                    {/* Total Range */}
                    <div>
                      <label className="mb-2 block text-[13px] font-semibold text-gray-700">
                        Total Range
                      </label>
                      <div className="flex items-center gap-3">
                        <div className="relative w-full">
                          <input
                            type="text"
                            placeholder="Min"
                            value={searchModalData.totalRangeFromExpense}
                            onChange={(e) =>
                              setSearchModalData((prev) => ({
                                ...prev,
                                totalRangeFromExpense: e.target.value,
                              }))
                            }
                            className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 transition-all duration-200 focus:border-[#156372] focus:outline-none focus:ring-2 focus:ring-[#15637210]"
                          />
                        </div>
                        <span className="text-gray-400">—</span>
                        <div className="relative w-full">
                          <input
                            type="text"
                            placeholder="Max"
                            value={searchModalData.totalRangeToExpense}
                            onChange={(e) =>
                              setSearchModalData((prev) => ({
                                ...prev,
                                totalRangeToExpense: e.target.value,
                              }))
                            }
                            className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 transition-all duration-200 focus:border-[#156372] focus:outline-none focus:ring-2 focus:ring-[#15637210]"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Customer Name */}
                    <div>
                      <label className="mb-2 block text-[13px] font-semibold text-gray-700">
                        Customer Name
                      </label>
                      <div className="relative">
                        <select
                          value={searchModalData.customerName}
                          onChange={(e) =>
                            setSearchModalData((prev) => ({ ...prev, customerName: e.target.value }))
                          }
                          className="w-full appearance-none rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 transition-all duration-200 focus:border-[#156372] focus:outline-none focus:ring-2 focus:ring-[#15637210]"
                        >
                          <option value="">Select customer</option>
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      </div>
                    </div>

                    {/* Vendor */}
                    <div>
                      <label className="mb-2 block text-[13px] font-semibold text-gray-700">
                        Vendor
                      </label>
                      <div className="relative">
                        <select
                          value={searchModalData.vendorName}
                          onChange={(e) => setSearchModalData((prev) => ({ ...prev, vendorName: e.target.value }))}
                          className="w-full appearance-none rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 transition-all duration-200 focus:border-[#156372] focus:outline-none focus:ring-2 focus:ring-[#15637210]"
                        >
                          <option value="">Select vendor</option>
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      </div>
                    </div>

                    {/* Tax Exemptions */}
                    <div>
                      <label className="mb-2 block text-[13px] font-semibold text-gray-700">
                        Tax Exemptions
                      </label>
                      <div className="relative">
                        <select
                          value={searchModalData.taxExemptions}
                          onChange={(e) =>
                            setSearchModalData((prev) => ({ ...prev, taxExemptions: e.target.value }))
                          }
                          className="w-full appearance-none rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 transition-all duration-200 focus:border-[#156372] focus:outline-none focus:ring-2 focus:ring-[#15637210]"
                        >
                          <option value="">Select a Tax Exemption</option>
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      </div>
                    </div>
                  </div>

                  {/* Right Column */}
                  <div className="flex flex-col gap-5">
                    {/* Paid Through */}
                    <div>
                      <label className="mb-2 block text-[13px] font-semibold text-gray-700">
                        Paid Through
                      </label>
                      <div className="relative">
                        <select
                          value={searchModalData.paidThrough}
                          onChange={(e) => setSearchModalData((prev) => ({ ...prev, paidThrough: e.target.value }))}
                          className="w-full appearance-none rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 transition-all duration-200 focus:border-[#156372] focus:outline-none focus:ring-2 focus:ring-[#15637210]"
                        >
                          <option value="">Select paid through</option>
                          <option value="Cash">Cash</option>
                          <option value="Bank">Bank</option>
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      </div>
                    </div>

                    {/* Reference# */}
                    <div>
                      <label className="mb-2 block text-[13px] font-semibold text-gray-700">
                        Reference#
                      </label>
                      <input
                        type="text"
                        placeholder="Enter reference number..."
                        value={searchModalData.referenceNumber}
                        onChange={(e) =>
                          setSearchModalData((prev) => ({ ...prev, referenceNumber: e.target.value }))
                        }
                        className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 transition-all duration-200 focus:border-[#156372] focus:outline-none focus:ring-2 focus:ring-[#15637210]"
                      />
                    </div>

                    {/* Status */}
                    <div>
                      <label className="mb-2 block text-[13px] font-semibold text-gray-700">
                        Status
                      </label>
                      <div className="relative">
                        <select
                          value={searchModalData.statusExpense}
                          onChange={(e) =>
                            setSearchModalData((prev) => ({ ...prev, statusExpense: e.target.value }))
                          }
                          className="w-full appearance-none rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 transition-all duration-200 focus:border-[#156372] focus:outline-none focus:ring-2 focus:ring-[#15637210]"
                        >
                          <option value="">All</option>
                          <option value="Draft">Draft</option>
                          <option value="Paid">Paid</option>
                          <option value="Unpaid">Unpaid</option>
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      </div>
                    </div>

                    {/* Source */}
                    <div>
                      <label className="mb-2 block text-[13px] font-semibold text-gray-700">
                        Source
                      </label>
                      <div className="relative">
                        <select
                          value={searchModalData.source}
                          onChange={(e) => setSearchModalData((prev) => ({ ...prev, source: e.target.value }))}
                          className="w-full appearance-none rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 transition-all duration-200 focus:border-[#156372] focus:outline-none focus:ring-2 focus:ring-[#15637210]"
                        >
                          <option value="">Select source</option>
                          <option value="Manual">Manual</option>
                          <option value="Import">Import</option>
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      </div>
                    </div>

                    {/* Employee */}
                    <div>
                      <label className="mb-2 block text-[13px] font-semibold text-gray-700">
                        Employee
                      </label>
                      <div className="relative">
                        <select
                          value={searchModalData.employee}
                          onChange={(e) => setSearchModalData((prev) => ({ ...prev, employee: e.target.value }))}
                          className="w-full appearance-none rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 transition-all duration-200 focus:border-[#156372] focus:outline-none focus:ring-2 focus:ring-[#15637210]"
                        >
                          <option value="">Select employee</option>
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      </div>
                    </div>

                    {/* Project Name */}
                    <div>
                      <label className="mb-2 block text-[13px] font-semibold text-gray-700">
                        Project Name
                      </label>
                      <div className="relative">
                        <select
                          value={searchModalData.projectName}
                          onChange={(e) => setSearchModalData((prev) => ({ ...prev, projectName: e.target.value }))}
                          className="w-full appearance-none rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 transition-all duration-200 focus:border-[#156372] focus:outline-none focus:ring-2 focus:ring-[#15637210]"
                        >
                          <option value="">Select a project</option>
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {searchType === "Customers" && (
                <div className="grid grid-cols-2 gap-8">
                  <div className="flex flex-col gap-5">
                    <div>
                      <label className="mb-2 block text-[13px] font-semibold text-gray-700">Display Name</label>
                      <input
                        type="text"
                        placeholder="John Doe"
                        value={searchModalData.displayName}
                        onChange={(e) => setSearchModalData((prev) => ({ ...prev, displayName: e.target.value }))}
                        className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 transition-all duration-200 focus:border-[#156372] focus:outline-none focus:ring-2 focus:ring-[#15637210]"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-[13px] font-semibold text-gray-700">Email Address</label>
                      <input
                        type="email"
                        placeholder="example@mail.com"
                        value={searchModalData.email}
                        onChange={(e) => setSearchModalData((prev) => ({ ...prev, email: e.target.value }))}
                        className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 transition-all duration-200 focus:border-[#156372] focus:outline-none focus:ring-2 focus:ring-[#15637210]"
                      />
                    </div>
                  </div>
                  <div className="flex flex-col gap-5">
                    <div>
                      <label className="mb-2 block text-[13px] font-semibold text-gray-700">Phone Number</label>
                      <input
                        type="tel"
                        placeholder="+1 234 567 890"
                        value={searchModalData.phone}
                        onChange={(e) => setSearchModalData((prev) => ({ ...prev, phone: e.target.value }))}
                        className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 transition-all duration-200 focus:border-[#156372] focus:outline-none focus:ring-2 focus:ring-[#15637210]"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="mt-10 flex items-center justify-end gap-3 border-t border-gray-100 pt-6">
                <button
                  onClick={() => {
                    setShowSearchModal(false);
                    setSearchModalData({
                      ...searchModalData,
                      expenseAccount: "",
                      notes: "",
                      dateRangeFromExpense: "",
                      dateRangeToExpense: "",
                      totalRangeFromExpense: "",
                      totalRangeToExpense: "",
                      customerName: "",
                      vendorName: "",
                      taxExemptions: "",
                      paidThrough: "",
                      referenceNumber: "",
                      statusExpense: "",
                      source: "",
                      employee: "",
                      projectName: "",
                    });
                  }}
                  className="rounded-lg border border-gray-200 bg-white px-6 py-2.5 text-sm font-semibold text-gray-600 transition-all duration-200 hover:bg-gray-50 hover:text-gray-900 focus:outline-none"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    console.log("Search with:", searchType, searchModalData);
                    setShowSearchModal(false);
                  }}
                  className="rounded-lg bg-[#156372] px-8 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[#15637230] transition-all duration-200 hover:bg-[#0D4A52] hover:shadow-xl hover:shadow-[#15637240] focus:outline-none"
                >
                  Search
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Success Notification */}
      {notification && (
        <div className="fixed right-6 top-6 z-[10001] flex items-center gap-3 overflow-hidden rounded-xl border border-emerald-100 bg-white p-1 pr-6 shadow-2xl animate-in fade-in slide-in-from-top-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500 text-white shadow-lg shadow-emerald-200">
            <Check size={20} strokeWidth={3} />
          </div>
          <div className="flex flex-col">
            <span className="text-[13px] font-bold text-gray-900">Success</span>
            <span className="text-[12px] font-medium text-emerald-600">{notification}</span>
          </div>
        </div>
      )}
    </div>
  );
}


function NewCustomViewModal({ onClose, onSave }: { onClose: () => void; onSave: (data: any) => void }) {
  const [formData, setFormData] = useState({
    name: "",
    markAsFavorite: false,
    criteria: [{ id: 1, field: "", comparator: "", value: "" }],
    availableColumns: [
      "Vendor Name",
      "Last Expense Date",
      "Customer Name",
      "Paid Through",
      "Reference#",
      "Status",
      "Currency",
      "Created Time",
      "Last Modified Time",
    ],
    selectedColumns: ["Date", "Expense Account", "Amount"],
    visibility: "Only Me",
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [expenseAccountDropdowns, setExpenseAccountDropdowns] = useState<Record<string, boolean>>({});
  const [expenseAccountSearch, setExpenseAccountSearch] = useState<Record<string, string>>({});
  const [paidThroughDropdowns, setPaidThroughDropdowns] = useState<Record<string, boolean>>({});
  const [paidThroughSearch, setPaidThroughSearch] = useState<Record<string, string>>({});

  // Expense Account data with grouped categories
  const expenseAccounts: Record<string, string[]> = {
    "Cost Of Goods Sold": [
      "Cost of Goods Sold",
    ],
    "Expense": [
      "Advertising And Marketing",
      "Air Travel Expense",
      "Automobile Expense",
      "Bad Debt",
      "Bank Charges",
      "Consultant Expense",
      "Depreciation Expense",
      "Entertainment Expense",
      "Freight And Delivery",
      "Insurance Expense",
      "Interest Expense",
      "Legal And Professional Fees",
      "Meals And Entertainment",
      "Office Supplies",
      "Other Expenses",
      "Postage And Delivery",
      "Printing And Stationery",
      "Rent Expense",
      "Repairs And Maintenance",
      "Salaries And Wages",
      "Telephone Expense",
      "Travel Expense",
      "Utilities",
    ],
  };

  // Paid Through account data with grouped categories
  const paidThroughAccounts: Record<string, string[]> = {
    "Cash": [
      "Cash",
      "Petty Cash",
      "Undeposited Funds",
    ],
    "Other Current Asset": [
      "Advance Tax",
      "Employee Advance",
      "Prepaid Expenses",
    ],
    "Fixed Asset": [
      "Furniture and Equipment",
    ],
    "Other Current Liability": [
      "Employee Reimbursements",
    ],
    "Equity": [
      "Drawings",
      "Opening Balance Offset",
      "Owner's Equity",
    ],
  };

  const getAllAccounts = () => {
    return Object.values(expenseAccounts).flat();
  };

  const getFilteredAccounts = (criterionId: number) => {
    const searchTerm = (expenseAccountSearch[criterionId] || "").toLowerCase();
    if (!searchTerm) return expenseAccounts;

    const filtered: Record<string, string[]> = {};
    Object.keys(expenseAccounts).forEach(category => {
      const matching = expenseAccounts[category].filter(account =>
        account.toLowerCase().includes(searchTerm)
      );
      if (matching.length > 0) {
        filtered[category] = matching;
      }
    });
    return filtered;
  };

  const toggleExpenseAccountDropdown = (criterionId: number) => {
    setExpenseAccountDropdowns(prev => ({
      ...prev,
      [criterionId]: !prev[criterionId]
    }));
  };

  const handleExpenseAccountSelect = (criterionId: number, account: string) => {
    handleCriterionChange(criterionId, "value", account);
    setExpenseAccountDropdowns(prev => ({
      ...prev,
      [criterionId]: false
    }));
    setExpenseAccountSearch(prev => ({
      ...prev,
      [criterionId]: ""
    }));
  };

  const getFilteredPaidThroughAccounts = (criterionId: number) => {
    const searchTerm = (paidThroughSearch[criterionId] || "").toLowerCase();
    if (!searchTerm) return paidThroughAccounts;

    const filtered: Record<string, string[]> = {};
    Object.keys(paidThroughAccounts).forEach(category => {
      const matching = paidThroughAccounts[category].filter(account =>
        account.toLowerCase().includes(searchTerm)
      );
      if (matching.length > 0) {
        filtered[category] = matching;
      }
    });
    return filtered;
  };

  const togglePaidThroughDropdown = (criterionId: number) => {
    setPaidThroughDropdowns(prev => ({
      ...prev,
      [criterionId]: !prev[criterionId]
    }));
  };

  const handlePaidThroughSelect = (criterionId: number, account: string) => {
    handleCriterionChange(criterionId, "value", account);
    setPaidThroughDropdowns(prev => ({
      ...prev,
      [criterionId]: false
    }));
    setPaidThroughSearch(prev => ({
      ...prev,
      [criterionId]: ""
    }));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleCriterionChange = (id: number, field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      criteria: prev.criteria.map((c) =>
        c.id === id ? { ...c, [field]: value } : c
      ),
    }));
  };

  const addCriterion = () => {
    setFormData((prev) => ({
      ...prev,
      criteria: [
        ...prev.criteria,
        {
          id: Date.now(),
          field: "",
          comparator: "",
          value: "",
        },
      ],
    }));
  };

  const removeCriterion = (id: number) => {
    setFormData((prev) => ({
      ...prev,
      criteria: prev.criteria.filter((c) => c.id !== id),
    }));
  };

  const moveColumnToSelected = (column: string) => {
    setFormData((prev) => ({
      ...prev,
      availableColumns: prev.availableColumns.filter((c) => c !== column),
      selectedColumns: [...prev.selectedColumns, column],
    }));
  };

  const moveColumnToAvailable = (column: string) => {
    // Don't allow removing required columns
    const requiredColumns = ["Date", "Expense Account", "Amount"];
    if (requiredColumns.includes(column)) return;
    setFormData((prev) => ({
      ...prev,
      selectedColumns: prev.selectedColumns.filter((c) => c !== column),
      availableColumns: [...prev.availableColumns, column],
    }));
  };

  const filteredColumns = formData.availableColumns.filter((col) =>
    col.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onSave(formData);
  };

  const modalStyles: Record<string, React.CSSProperties> = {
    overlay: {
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 1000,
      padding: "20px",
    },
    modal: {
      backgroundColor: "#ffffff",
      borderRadius: "8px",
      boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
      width: "100%",
      maxWidth: "900px",
      maxHeight: "90vh",
      overflowY: "auto",
      display: "flex",
      flexDirection: "column",
    },
    header: {
      padding: "20px 24px",
      borderBottom: "1px solid #e5e7eb",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      position: "sticky",
      top: 0,
      backgroundColor: "#ffffff",
      zIndex: 10,
    },
    title: {
      fontSize: "20px",
      fontWeight: "600",
      color: "#111827",
      margin: 0,
    },
    close: {
      color: "#6b7280",
      fontSize: "24px",
      background: "none",
      border: "none",
      cursor: "pointer",
      padding: 0,
      lineHeight: 1,
    },
    body: {
      padding: "24px",
      flex: 1,
    },
    section: {
      marginBottom: "24px",
    },
    sectionTitle: {
      fontSize: "16px",
      fontWeight: "600",
      color: "#111827",
      marginBottom: "12px",
    },
    formGroup: {
      marginBottom: "16px",
    },
    label: {
      display: "block",
      fontSize: "14px",
      fontWeight: "500",
      color: "#374151",
      marginBottom: "4px",
    },
    input: {
      width: "100%",
      padding: "8px 12px",
      border: "1px solid #d1d5db",
      borderRadius: "6px",
      fontSize: "14px",
      outline: "none",
      boxSizing: "border-box",
    },
    nameRow: {
      display: "flex",
      alignItems: "center",
      gap: "16px",
    },
    nameInput: {
      flex: 1,
    },
    favoriteCheckbox: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
      cursor: "pointer",
    },
    criterionRow: {
      display: "flex",
      alignItems: "center",
      gap: "12px",
      marginBottom: "12px",
    },
    criterionNumber: {
      fontSize: "14px",
      fontWeight: "500",
      color: "#6b7280",
      minWidth: "24px",
    },
    criterionField: {
      flex: 1,
    },
    criterionComparator: {
      flex: 1,
    },
    criterionValue: {
      flex: 1,
    },
    criterionActions: {
      display: "flex",
      gap: "8px",
    },
    iconButton: {
      background: "none",
      border: "none",
      cursor: "pointer",
      padding: "4px",
      color: "#6b7280",
      display: "flex",
      alignItems: "center",
    },
    addCriterionButton: {
      display: "flex",
      alignItems: "center",
      gap: "4px",
      color: "#156372",
      background: "none",
      border: "none",
      cursor: "pointer",
      fontSize: "14px",
      padding: "4px 0",
    },
    columnsContainer: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: "24px",
    },
    columnSection: {
      border: "1px solid #e5e7eb",
      borderRadius: "6px",
      padding: "16px",
    },
    columnSectionTitle: {
      fontSize: "14px",
      fontWeight: "600",
      color: "#111827",
      marginBottom: "12px",
      display: "flex",
      alignItems: "center",
      gap: "8px",
    },
    searchInput: {
      width: "100%",
      padding: "8px 12px",
      border: "1px solid #d1d5db",
      borderRadius: "6px",
      fontSize: "14px",
      marginBottom: "12px",
      outline: "none",
    },
    columnList: {
      maxHeight: "300px",
      overflowY: "auto",
    },
    columnItem: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
      padding: "8px",
      borderRadius: "4px",
      cursor: "pointer",
      marginBottom: "4px",
    },
    radioGroup: {
      display: "flex",
      flexDirection: "column",
      gap: "12px",
    },
    radioOption: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
      cursor: "pointer",
    },
    actions: {
      display: "flex",
      alignItems: "center",
      justifyContent: "flex-start",
      gap: "12px",
      paddingTop: "16px",
      borderTop: "1px solid #e5e7eb",
      marginTop: "16px",
      position: "sticky",
      bottom: 0,
      backgroundColor: "#ffffff",
    },
    cancelBtn: {
      padding: "8px 16px",
      fontSize: "14px",
      border: "1px solid #d1d5db",
      borderRadius: "6px",
      backgroundColor: "#ffffff",
      color: "#374151",
      cursor: "pointer",
    },
    saveBtn: {
      padding: "8px 16px",
      fontSize: "14px",
      backgroundColor: "#156372",
      color: "#ffffff",
      borderRadius: "6px",
      border: "none",
      cursor: "pointer",
    },
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      Object.keys(expenseAccountDropdowns).forEach(criterionId => {
        if (expenseAccountDropdowns[criterionId] && !target.closest(`[data-expense-account-dropdown="${criterionId}"]`)) {
          setExpenseAccountDropdowns(prev => ({
            ...prev,
            [criterionId]: false
          }));
        }
      });
      Object.keys(paidThroughDropdowns).forEach(criterionId => {
        if (paidThroughDropdowns[criterionId] && !target.closest(`[data-paid-through-dropdown="${criterionId}"]`)) {
          setPaidThroughDropdowns(prev => ({
            ...prev,
            [criterionId]: false
          }));
        }
      });
    };

    if (Object.values(expenseAccountDropdowns).some(open => open) || Object.values(paidThroughDropdowns).some(open => open)) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [expenseAccountDropdowns, paidThroughDropdowns]);

  return (
    <div style={modalStyles.overlay} onClick={onClose}>
      <div style={modalStyles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={modalStyles.header}>
          <h2 style={modalStyles.title}>New Custom View</h2>
          <button onClick={onClose} style={modalStyles.close}>
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={modalStyles.body}>
          {/* Name Section */}
          <div style={modalStyles.section}>
            <div style={modalStyles.nameRow}>
              <div style={{ ...modalStyles.formGroup, ...modalStyles.nameInput }}>
                <label style={modalStyles.label}>
                  Name <span style={{ color: "#156372" }}>*</span>
                </label>
                <input
                  required
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  style={modalStyles.input}
                />
              </div>
              <div style={modalStyles.favoriteCheckbox}>
                <input
                  type="checkbox"
                  name="markAsFavorite"
                  checked={formData.markAsFavorite}
                  onChange={handleChange}
                  id="favorite"
                  style={{ cursor: "pointer" }}
                />
                <label htmlFor="favorite" style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}>
                  <Star size={16} style={{ color: formData.markAsFavorite ? "#fbbf24" : "#9ca3af" }} />
                  Mark as Favorite
                </label>
              </div>
            </div>
          </div>

          {/* Define the criteria Section */}
          <div style={modalStyles.section}>
            <div style={modalStyles.sectionTitle}>Define the criteria (if any)</div>
            {formData.criteria.map((criterion, index) => (
              <div key={criterion.id} style={modalStyles.criterionRow}>
                <span style={modalStyles.criterionNumber}>{index + 1}</span>
                <select
                  style={{ ...modalStyles.input, ...modalStyles.criterionField }}
                  value={criterion.field}
                  onChange={(e) =>
                    handleCriterionChange(criterion.id, "field", e.target.value)
                  }
                >
                  <option>Select a field</option>
                  <option>Date</option>
                  <option>Expense Account</option>
                  <option>Paid Through</option>
                  <option>Vendor Name</option>
                  <option>Customer Name</option>
                  <option>Status</option>
                  <option>Amount</option>
                </select>
                <select
                  style={{ ...modalStyles.input, ...modalStyles.criterionComparator }}
                  value={criterion.comparator}
                  onChange={(e) =>
                    handleCriterionChange(criterion.id, "comparator", e.target.value)
                  }
                >
                  <option>Select a comparator</option>
                  <option>Equals</option>
                  <option>Contains</option>
                  <option>Starts with</option>
                  <option>Ends with</option>
                </select>
                {criterion.field === "Expense Account" ? (
                  <div style={{ ...modalStyles.criterionValue, position: "relative" }} data-expense-account-dropdown={criterion.id}>
                    <button
                      type="button"
                      style={{
                        ...modalStyles.input,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        cursor: "pointer",
                        backgroundColor: "#ffffff",
                      }}
                      onClick={() => toggleExpenseAccountDropdown(criterion.id)}
                    >
                      <span style={{ color: criterion.value ? "#111827" : "#9ca3af" }}>
                        {criterion.value || "Select an account"}
                      </span>
                      <ChevronDownIcon size={16} style={{ color: "#6b7280" }} />
                    </button>
                    {expenseAccountDropdowns[criterion.id] && (
                      <div style={{
                        position: "absolute",
                        top: "100%",
                        left: 0,
                        right: 0,
                        marginTop: "4px",
                        backgroundColor: "#ffffff",
                        border: "1px solid #e5e7eb",
                        borderRadius: "8px",
                        boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
                        zIndex: 1000,
                        maxHeight: "320px",
                        overflow: "hidden",
                        display: "flex",
                        flexDirection: "column",
                      }}>
                        <div style={{ padding: "8px", borderBottom: "1px solid #e5e7eb", backgroundColor: "#ffffff" }}>
                          <div style={{ position: "relative" }}>
                            <Search size={16} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#9ca3af", zIndex: 1 }} />
                            <input
                              type="text"
                              placeholder="Search"
                              value={expenseAccountSearch[criterion.id] || ""}
                              onChange={(e) => setExpenseAccountSearch(prev => ({
                                ...prev,
                                [criterion.id]: e.target.value
                              }))}
                              style={{
                                width: "100%",
                                padding: "8px 8px 8px 36px",
                                border: "1px solid #d1d5db",
                                borderRadius: "4px",
                                fontSize: "14px",
                                outline: "none",
                                backgroundColor: "#ffffff",
                              }}
                              onClick={(e) => e.stopPropagation()}
                              onFocus={(e) => {
                                e.currentTarget.style.borderColor = "#156372";
                                e.currentTarget.style.boxShadow = "0 0 0 3px rgba(37, 99, 235, 0.1)";
                              }}
                              onBlur={(e) => {
                                e.currentTarget.style.borderColor = "#d1d5db";
                                e.currentTarget.style.boxShadow = "none";
                              }}
                            />
                          </div>
                        </div>
                        <div style={{
                          maxHeight: "240px",
                          overflowY: "auto",
                          flex: 1,
                          WebkitOverflowScrolling: "touch",
                        }}>
                          {Object.entries(getFilteredAccounts(criterion.id)).map(([category, accounts]) => (
                            <div key={category}>
                              <div style={{
                                padding: "10px 12px",
                                fontSize: "12px",
                                fontWeight: "700",
                                color: "#374151",
                                backgroundColor: "#f9fafb",
                                borderBottom: "1px solid #e5e7eb",
                                textTransform: "none",
                              }}>
                                {category}
                              </div>
                              {accounts.map((account) => (
                                <button
                                  key={account}
                                  type="button"
                                  onClick={() => handleExpenseAccountSelect(criterion.id, account)}
                                  style={{
                                    width: "100%",
                                    padding: "10px 12px",
                                    textAlign: "left",
                                    border: "none",
                                    background: criterion.value === account ? "#15637210" : "transparent",
                                    color: criterion.value === account ? "#156372" : "#111827",
                                    cursor: "pointer",
                                    fontSize: "14px",
                                    display: "block",
                                    transition: "background-color 0.15s ease",
                                  }}
                                  onMouseEnter={(e) => {
                                    if (criterion.value !== account) {
                                      e.currentTarget.style.backgroundColor = "#f3f4f6";
                                    }
                                  }}
                                  onMouseLeave={(e) => {
                                    if (criterion.value !== account) {
                                      e.currentTarget.style.backgroundColor = "transparent";
                                    }
                                  }}
                                >
                                  {account}
                                </button>
                              ))}
                            </div>
                          ))}
                        </div>
                        <div style={{
                          padding: "8px 12px",
                          borderTop: "1px solid #e5e7eb",
                          backgroundColor: "#ffffff",
                        }}>
                          <button
                            type="button"
                            onClick={() => {
                              // Handle new account creation
                              console.log("Create new account");
                            }}
                            style={{
                              width: "100%",
                              padding: "8px",
                              textAlign: "left",
                              border: "none",
                              background: "transparent",
                              color: "#156372",
                              cursor: "pointer",
                              fontSize: "14px",
                              display: "flex",
                              alignItems: "center",
                              gap: "8px",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = "#f3f4f6";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = "transparent";
                            }}
                          >
                            <Plus size={16} />
                            New Account
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : criterion.field === "Paid Through" ? (
                  <div style={{ ...modalStyles.criterionValue, position: "relative" }} data-paid-through-dropdown={criterion.id}>
                    <button
                      type="button"
                      style={{
                        ...modalStyles.input,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        cursor: "pointer",
                        backgroundColor: "#ffffff",
                      }}
                      onClick={() => togglePaidThroughDropdown(criterion.id)}
                    >
                      <span style={{ color: criterion.value ? "#111827" : "#9ca3af" }}>
                        {criterion.value || "Select an account"}
                      </span>
                      <ChevronDownIcon size={16} style={{ color: "#6b7280" }} />
                    </button>
                    {paidThroughDropdowns[criterion.id] && (
                      <div style={{
                        position: "absolute",
                        top: "100%",
                        left: 0,
                        right: 0,
                        marginTop: "4px",
                        backgroundColor: "#ffffff",
                        border: "1px solid #e5e7eb",
                        borderRadius: "6px",
                        boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                        zIndex: 1000,
                        maxHeight: "300px",
                        overflowY: "auto",
                      }}>
                        <div style={{ padding: "8px", borderBottom: "1px solid #e5e7eb" }}>
                          <div style={{ position: "relative" }}>
                            <Search size={16} style={{ position: "absolute", left: "8px", top: "50%", transform: "translateY(-50%)", color: "#9ca3af" }} />
                            <input
                              type="text"
                              placeholder="Search"
                              value={paidThroughSearch[criterion.id] || ""}
                              onChange={(e) => setPaidThroughSearch(prev => ({
                                ...prev,
                                [criterion.id]: e.target.value
                              }))}
                              style={{
                                width: "100%",
                                padding: "8px 8px 8px 32px",
                                border: "1px solid #d1d5db",
                                borderRadius: "4px",
                                fontSize: "14px",
                                outline: "none",
                              }}
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>
                        </div>
                        <div style={{ maxHeight: "240px", overflowY: "auto" }}>
                          {Object.entries(getFilteredPaidThroughAccounts(criterion.id)).map(([category, accounts]) => (
                            <div key={category}>
                              <div style={{
                                padding: "8px 12px",
                                fontSize: "12px",
                                fontWeight: "600",
                                color: "#6b7280",
                                textTransform: "uppercase",
                                backgroundColor: "#f9fafb",
                                borderBottom: "1px solid #e5e7eb",
                              }}>
                                {category}
                              </div>
                              {accounts.map((account) => (
                                <button
                                  key={account}
                                  type="button"
                                  onClick={() => handlePaidThroughSelect(criterion.id, account)}
                                  style={{
                                    width: "100%",
                                    padding: "10px 12px",
                                    textAlign: "left",
                                    border: "none",
                                    background: criterion.value === account ? "#15637210" : "transparent",
                                    color: criterion.value === account ? "#156372" : "#111827",
                                    cursor: "pointer",
                                    fontSize: "14px",
                                    display: "block",
                                  }}
                                  onMouseEnter={(e) => {
                                    if (criterion.value !== account) {
                                      e.currentTarget.style.backgroundColor = "#f9fafb";
                                    }
                                  }}
                                  onMouseLeave={(e) => {
                                    if (criterion.value !== account) {
                                      e.currentTarget.style.backgroundColor = "transparent";
                                    }
                                  }}
                                >
                                  {account}
                                </button>
                              ))}
                            </div>
                          ))}
                        </div>
                        <div style={{
                          padding: "8px 12px",
                          borderTop: "1px solid #e5e7eb",
                          backgroundColor: "#f9fafb",
                        }}>
                          <button
                            type="button"
                            onClick={() => {
                              // Handle new account creation
                              console.log("Create new account");
                            }}
                            style={{
                              width: "100%",
                              padding: "8px",
                              textAlign: "left",
                              border: "none",
                              background: "transparent",
                              color: "#156372",
                              cursor: "pointer",
                              fontSize: "14px",
                              display: "flex",
                              alignItems: "center",
                              gap: "8px",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = "#f3f4f6";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = "transparent";
                            }}
                          >
                            <Plus size={16} />
                            New Account
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <input
                    type="text"
                    style={{ ...modalStyles.input, ...modalStyles.criterionValue }}
                    value={criterion.value}
                    onChange={(e) =>
                      handleCriterionChange(criterion.id, "value", e.target.value)
                    }
                    placeholder="Value"
                  />
                )}
                <div style={modalStyles.criterionActions}>
                  <button
                    type="button"
                    style={modalStyles.iconButton}
                    onClick={addCriterion}
                  >
                    <Plus size={16} />
                  </button>
                  {formData.criteria.length > 1 && (
                    <button
                      type="button"
                      style={modalStyles.iconButton}
                      onClick={() => removeCriterion(criterion.id)}
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            ))}
            <button
              type="button"
              style={modalStyles.addCriterionButton}
              onClick={addCriterion}
            >
              <Plus size={16} />
              Add Criterion
            </button>
          </div>

          {/* Columns Preference Section */}
          <div style={modalStyles.section}>
            <div style={modalStyles.sectionTitle}>Columns Preference</div>
            <div style={modalStyles.columnsContainer}>
              <div style={modalStyles.columnSection}>
                <div style={modalStyles.columnSectionTitle}>AVAILABLE COLUMNS</div>
                <input
                  type="text"
                  placeholder="Search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={modalStyles.searchInput}
                />
                <div style={modalStyles.columnList}>
                  {filteredColumns.map((column) => (
                    <div
                      key={column}
                      style={modalStyles.columnItem}
                      onClick={() => moveColumnToSelected(column)}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f3f4f6")}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                    >
                      <GripVertical size={16} style={{ color: "#9ca3af" }} />
                      <span style={{ fontSize: "14px" }}>{column}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div style={modalStyles.columnSection}>
                <div style={modalStyles.columnSectionTitle}>
                  <Check size={16} style={{ color: "#10b981" }} />
                  SELECTED COLUMNS
                </div>
                <div style={modalStyles.columnList}>
                  {formData.selectedColumns.map((column) => {
                    const requiredColumns = ["Date", "Expense Account", "Amount"];
                    const isRequired = requiredColumns.includes(column);
                    return (
                      <div
                        key={column}
                        style={modalStyles.columnItem}
                        onClick={() => moveColumnToAvailable(column)}
                        onMouseEnter={(e) => {
                          if (!isRequired) {
                            e.currentTarget.style.backgroundColor = "#f3f4f6";
                          }
                        }}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                      >
                        <GripVertical size={16} style={{ color: "#9ca3af" }} />
                        <span style={{ fontSize: "14px" }}>
                          {column}
                          {isRequired && <span style={{ color: "#156372" }}>*</span>}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Visibility Preference Section */}
          <div style={modalStyles.section}>
            <div style={modalStyles.sectionTitle}>Visibility Preference</div>
            <div style={modalStyles.radioGroup}>
              <label style={modalStyles.radioOption}>
                <input
                  type="radio"
                  name="visibility"
                  value="Only Me"
                  checked={formData.visibility === "Only Me"}
                  onChange={handleChange}
                />
                <Lock size={16} style={{ color: "#6b7280" }} />
                <span>Only Me</span>
              </label>
              <label style={modalStyles.radioOption}>
                <input
                  type="radio"
                  name="visibility"
                  value="Only Selected Users & Roles"
                  checked={formData.visibility === "Only Selected Users & Roles"}
                  onChange={handleChange}
                />
                <Users size={16} style={{ color: "#6b7280" }} />
                <span>Only Selected Users & Roles</span>
              </label>
              <label style={modalStyles.radioOption}>
                <input
                  type="radio"
                  name="visibility"
                  value="Everyone"
                  checked={formData.visibility === "Everyone"}
                  onChange={handleChange}
                />
                <FileText size={16} style={{ color: "#6b7280" }} />
                <span>Everyone</span>
              </label>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={modalStyles.actions}>
            <button
              type="button"
              onClick={onClose}
              style={modalStyles.cancelBtn}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f9fafb")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#ffffff")}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={modalStyles.saveBtn}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#0D4A52")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#156372")}
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


