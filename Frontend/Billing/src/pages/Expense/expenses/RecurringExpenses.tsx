import React, { useState, useRef, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import {
  ChevronDown,
  ChevronUp,
  Plus,
  PlusCircle,
  MoreVertical,
  SlidersHorizontal,
  Filter,
  Search,
  Check,
  X,
  ArrowUpDown,
  Download,
  Upload,
  RefreshCw,
  ChevronRight,
  Star,
  Trash2,
  GripVertical,
  Lock,
  User,
  Folder,
  CheckCircle,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  FileText,
} from "lucide-react";
import BulkUpdateModal from "../shared/BulkUpdateModal";
import DeleteConfirmationModal from "../shared/DeleteConfirmationModal";
import ExportRecurringExpenses from "./ExportRecurringExpenses";

import { recurringExpensesAPI, currenciesAPI } from "../../../services/api";
import { useCurrency } from "../../../hooks/useCurrency";

export default function RecurringExpenses() {
  const RECURRING_VISIBLE_COLUMNS_KEY = "recurring_expenses_visible_columns_v1";
  const defaultVisibleColumnKeys = [
    "profileName",
    "location",
    "expenseAccount",
    "customerName",
    "frequency",
    "lastExpenseDate",
    "nextExpenseDate",
    "status",
    "amount",
  ];
  const allTableColumns = [
    { key: "profileName", label: "Profile Name" },
    { key: "location", label: "Location" },
    { key: "expenseAccount", label: "Category Name" },
    { key: "customerName", label: "Customer Name" },
    { key: "frequency", label: "Frequency" },
    { key: "lastExpenseDate", label: "Last Expense Date" },
    { key: "nextExpenseDate", label: "Next Expense Date" },
    { key: "status", label: "Status" },
    { key: "amount", label: "Amount" },
    { key: "vendor", label: "Vendor Name" },
    { key: "wsq", label: "wsq" },
  ];
  const navigate = useNavigate();
  const { code: baseCurrencyCode, symbol: baseCurrencySymbol } = useCurrency();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [sortSubmenuOpen, setSortSubmenuOpen] = useState(false);
  const [exportSubmenuOpen, setExportSubmenuOpen] = useState(false);
  const [selectedView, setSelectedView] = useState("All");
  const [selectedSort, setSelectedSort] = useState("Created Time");
  const [sortDirection, setSortDirection] = useState("desc"); // "asc" or "desc"
  const [recurringExpenses, setRecurringExpenses] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [showBulkUpdateModal, setShowBulkUpdateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showCustomViewModal, setShowCustomViewModal] = useState(false);
  const [showCustomizeColumnsModal, setShowCustomizeColumnsModal] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showExportRecurringExpensesModal, setShowExportRecurringExpensesModal] = useState(false);
  const [showExportCurrentViewModal, setShowExportCurrentViewModal] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [customizeColumnsSearch, setCustomizeColumnsSearch] = useState("");
  const [currencies, setCurrencies] = useState<any[]>([]);
  const [searchModalData, setSearchModalData] = useState({
    expenseAccount: "",
    vendorName: "",
    frequency: "",
    lastExpenseDateFrom: "",
    lastExpenseDateTo: "",
    nextExpenseDateFrom: "",
    nextExpenseDateTo: "",
    status: "",
    amountFrom: "",
    amountTo: "",
    notes: "",
    customerName: "",
    projectName: "",
  });
  const [notification, setNotification] = useState(null);
  const [visibleColumnKeys, setVisibleColumnKeys] = useState<string[]>(() => {
    const validKeys = new Set(allTableColumns.map((col) => col.key));
    if (typeof window === "undefined") return [...defaultVisibleColumnKeys];
    try {
      const raw = localStorage.getItem(RECURRING_VISIBLE_COLUMNS_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      if (Array.isArray(parsed) && parsed.length) {
        const sanitized = parsed.filter((key: string) => validKeys.has(key));
        return sanitized.length ? sanitized : [...defaultVisibleColumnKeys];
      }
      return [...defaultVisibleColumnKeys];
    } catch {
      return [...defaultVisibleColumnKeys];
    }
  });
  const dropdownRef = useRef(null);
  const moreMenuRef = useRef(null);
  const sortSubmenuRef = useRef(null);
  const exportSubmenuRef = useRef(null);
  const exportSubmenuTimeoutRef = useRef(null);
  const [hoveredMenuItem, setHoveredMenuItem] = useState(null);
  const filteredCustomizeColumns = allTableColumns.filter((col) =>
    col.label.toLowerCase().includes(customizeColumnsSearch.trim().toLowerCase())
  );

  useEffect(() => {
    try {
      localStorage.setItem(RECURRING_VISIBLE_COLUMNS_KEY, JSON.stringify(visibleColumnKeys));
    } catch {
      // ignore localStorage write failures
    }
  }, [visibleColumnKeys]);

  const isColumnVisible = (key: string) => visibleColumnKeys.includes(key);
  const toggleVisibleColumn = (key: string) => {
    setVisibleColumnKeys((prev) =>
      prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key]
    );
  };

  // Load recurring expenses from API
  const loadExpenses = async () => {
    try {
      setIsRefreshing(true);
      const response = await recurringExpensesAPI.getAll({ limit: 1000 });
      if (response && response.code === 0 && response.recurring_expenses) {
        // Map API response to match component state structure
        const mappedExpenses = response.recurring_expenses.map((expense: any) => ({
          id: expense._id || expense.recurring_expense_id,
          recurringExpenseId: expense.recurring_expense_id || expense._id,
          profileName: expense.profile_name,
          location: expense.location || expense.location_name || "",
          expenseAccount: expense.account_name,
          vendor: expense.vendor_name || "",
          repeatEvery: expense.repeat_every,
          startDate: expense.start_date,
          amount: expense.amount,
          currency: baseCurrencyCode || expense.currency_code || "USD",
          status: (expense.status || "active").toUpperCase(),
          active: expense.status !== 'stopped' && expense.status !== 'expired',
          createdTime: expense.created_time || expense.createdAt,
          description: expense.description,
          customerName: expense.customer_name,
          nextExpenseDate: expense.next_expense_date,
          wsq: (() => {
            const tags = Array.isArray(expense.reporting_tags) ? expense.reporting_tags : [];
            const wsqTag = tags.find((tag: any) =>
              String(tag?.name || tag?.tagName || "").trim().toLowerCase() === "wsq"
            );
            return wsqTag?.value || expense?.wsq || "";
          })(),
        }));
        setRecurringExpenses(mappedExpenses);
      } else {
        setRecurringExpenses([]);
      }

      // Fetch currencies
      const cursResp = await currenciesAPI.getAll();
      const cursList = Array.isArray(cursResp) ? cursResp : (cursResp?.data || []);
      setCurrencies(cursList);
    } catch (error) {
      console.error("Error loading recurring expenses:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadExpenses();
  }, [baseCurrencyCode]);

  useEffect(() => {
    const handleRecurringExpensesUpdated = () => {
      loadExpenses();
    };

    window.addEventListener("recurringExpensesUpdated", handleRecurringExpensesUpdated);
    window.addEventListener("focus", handleRecurringExpensesUpdated);
    return () => {
      window.removeEventListener("recurringExpensesUpdated", handleRecurringExpensesUpdated);
      window.removeEventListener("focus", handleRecurringExpensesUpdated);
    };
  }, [baseCurrencyCode]);

  // Automation Engine - Check for due recurring expenses on load
  useEffect(() => {
    const runAutomation = async () => {
      if (recurringExpenses.length > 0 && !isRefreshing) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const dueExpenses = recurringExpenses.filter(expense => {
          if (!expense.active || !expense.nextExpenseDate) return false;
          const nextDate = new Date(expense.nextExpenseDate);
          nextDate.setHours(0, 0, 0, 0);
          return nextDate <= today;
        });

        if (dueExpenses.length > 0) {
          console.log(`[Automation] Found ${dueExpenses.length} due recurring expenses. Generating...`);
          let successCount = 0;

          for (const expense of dueExpenses) {
            try {
              const res = await recurringExpensesAPI.generateExpense(expense.id);
              if (res && (res.code === 0 || res.success)) {
                successCount++;
              }
            } catch (err) {
              console.error(`[Automation] Failed to generate expense for profile ${expense.profileName}:`, err);
            }
          }

          if (successCount > 0) {
            setNotification(`Successfully generated ${successCount} due expense(s) automatically.`);
            setTimeout(() => setNotification(null), 5000);
            loadExpenses(); // Refresh the list to update next run dates
          }
        }
      }
    };

    // Run automation after a short delay to ensure initial load is stable
    const timer = setTimeout(runAutomation, 2000);
    return () => clearTimeout(timer);
  }, [recurringExpenses.length]);

  const handleRefresh = () => {
    loadExpenses();
    setSelectedItems([]);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target)) {
        setMoreMenuOpen(false);
        setSortSubmenuOpen(false);
        setExportSubmenuOpen(false);
      }
    };

    if (dropdownOpen || moreMenuOpen || sortSubmenuOpen || exportSubmenuOpen) {
      // Use setTimeout to delay adding the listener, allowing the onClick to execute first
      const timeoutId = setTimeout(() => {
        document.addEventListener("click", handleClickOutside);
      }, 0);

      return () => {
        clearTimeout(timeoutId);
        document.removeEventListener("click", handleClickOutside);
      };
    }
  }, [dropdownOpen, moreMenuOpen, sortSubmenuOpen, exportSubmenuOpen]);

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedItems(displayExpenses.map((expense) => expense.id));
    } else {
      setSelectedItems([]);
    }
  };

  const handleSelectItem = (id) => {
    setSelectedItems((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleResume = async () => {
    if (selectedItems.length === 0) {
      alert("Please select at least one recurring expense to resume.");
      return;
    }

    try {
      // Process all selected items
      await Promise.all(selectedItems.map(id =>
        recurringExpensesAPI.updateStatus(id, 'active')
      ));

      setNotification("Selected recurring expenses have been activated.");
      setTimeout(() => setNotification(null), 3000);

      setSelectedItems([]);
      loadExpenses(); // Refresh list
    } catch (error) {
      console.error("Error resuming expenses:", error);
      alert("Failed to resume some expenses. Please try again.");
    }
  };

  const handleStop = async () => {
    if (selectedItems.length === 0) {
      alert("Please select at least one recurring expense to stop.");
      return;
    }

    try {
      // Process all selected items
      await Promise.all(selectedItems.map(id =>
        recurringExpensesAPI.updateStatus(id, 'stopped')
      ));

      setNotification("Selected recurring expenses have been stopped.");
      setTimeout(() => setNotification(null), 3000);

      setSelectedItems([]);
      loadExpenses(); // Refresh list
    } catch (error) {
      console.error("Error stopping expenses:", error);
      alert("Failed to stop some expenses. Please try again.");
    }
  };

  const handleBulkUpdate = () => {
    if (selectedItems.length === 0) {
      alert("Please select at least one recurring expense to update.");
      return;
    }
    setShowBulkUpdateModal(true);
  };

  const normalizeText = (value: any) => String(value || "").trim().toLowerCase();
  const normalizeStatus = (value: any) => {
    const normalized = normalizeText(value);
    if (["active", "resume", "resumed"].includes(normalized)) return "active";
    if (["stopped", "stop", "inactive"].includes(normalized)) return "stopped";
    if (["expired"].includes(normalized)) return "expired";
    return "";
  };

  const handleBulkUpdateSubmit = async (field, value) => {
    try {
      const statusValue = field === "status" ? normalizeStatus(value) : "";
      await Promise.all(
        selectedItems.map(async (id) => {
          if (field === "status" && ["active", "stopped"].includes(statusValue)) {
            return recurringExpensesAPI.updateStatus(id, statusValue);
          }

          const updateData: any = {};
          switch (field) {
            case "profileName":
              updateData.profile_name = String(value || "").trim();
              break;
            case "expenseAccount":
              updateData.account_name = String(value || "").trim();
              break;
            case "vendor":
              updateData.vendor_name = String(value || "").trim();
              break;
            case "repeatEvery":
              updateData.repeat_every = String(value || "").trim();
              break;
            case "currency":
              updateData.currency_code = String(value || "").trim().toUpperCase();
              break;
            case "amount": {
              const amount = Number.parseFloat(String(value || ""));
              if (!Number.isFinite(amount) || amount < 0) {
                throw new Error("Invalid amount.");
              }
              updateData.amount = amount;
              updateData.total = amount;
              updateData.sub_total = amount;
              break;
            }
            case "startDate":
              updateData.start_date = String(value || "");
              updateData.next_expense_date = String(value || "");
              break;
            case "description":
              updateData.description = String(value || "");
              break;
            case "status":
              if (statusValue) {
                updateData.status = statusValue;
              }
              break;
            default:
              updateData[field] = value;
              break;
          }
          return recurringExpensesAPI.update(id, updateData);
        })
      );

      setNotification("Selected recurring expenses have been updated.");
      setTimeout(() => setNotification(null), 3000);

      setSelectedItems([]);
      loadExpenses(); // Refresh list
      window.dispatchEvent(new Event("recurringExpensesUpdated"));
      window.dispatchEvent(new Event("storage"));
    } catch (error) {
      console.error("Error updating expenses:", error);
      alert("Failed to update some expenses. Please try again.");
    }
  };

  const recurringExpenseFieldOptions = useMemo(() => {
    const uniqueExpenseAccounts = Array.from(
      new Set(recurringExpenses.map((expense: any) => expense?.expenseAccount).filter(Boolean))
    );
    const uniqueVendors = Array.from(
      new Set(recurringExpenses.map((expense: any) => expense?.vendor).filter(Boolean))
    );
    const uniqueCurrencies = Array.from(
      new Set(
        [
          ...currencies.map((currency: any) => currency?.code).filter(Boolean),
          baseCurrencyCode,
        ].filter(Boolean)
      )
    );

    return [
      { value: "profileName", label: "Profile Name", type: "text", placeholder: "Enter profile name" },
      {
        value: "expenseAccount",
        label: "Expense Account",
        type: "select",
        options: uniqueExpenseAccounts.map((name) => ({ label: name, value: name })),
      },
      {
        value: "vendor",
        label: "Vendor",
        type: "select",
        options: uniqueVendors.map((name) => ({ label: name, value: name })),
      },
      {
        value: "repeatEvery",
        label: "Frequency",
        type: "select",
        options: [
          { label: "Week", value: "Week" },
          { label: "2 Weeks", value: "2 Weeks" },
          { label: "Month", value: "Month" },
          { label: "2 Months", value: "2 Months" },
          { label: "3 Months", value: "3 Months" },
          { label: "6 Months", value: "6 Months" },
          { label: "Year", value: "Year" },
          { label: "2 Years", value: "2 Years" },
          { label: "3 Years", value: "3 Years" },
        ],
      },
      { value: "startDate", label: "Start Date", type: "date" },
      {
        value: "status",
        label: "Status",
        type: "select",
        options: [
          { label: "Active", value: "active" },
          { label: "Stopped", value: "stopped" },
          { label: "Expired", value: "expired" },
        ],
      },
      {
        value: "currency",
        label: "Currency",
        type: "select",
        options: uniqueCurrencies.map((code) => ({ label: code, value: code })),
      },
      { value: "amount", label: "Amount", type: "number", min: 0, step: "0.01", placeholder: "0.00" },
      { value: "description", label: "Notes", type: "text", placeholder: "Enter notes" },
    ];
  }, [recurringExpenses, currencies, baseCurrencyCode]);

  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${date.getDate().toString().padStart(2, "0")} ${months[date.getMonth()]} ${date.getFullYear()}`;
  };

  const calculateNextDate = (startDate, frequency) => {
    if (!startDate) return "";
    const date = new Date(startDate);
    const frequencyMap = {
      "Week": 7,
      "2 Weeks": 14,
      "Month": 30,
      "2 Months": 60,
      "3 Months": 90,
      "6 Months": 180,
      "Year": 365,
      "2 Years": 730,
      "3 Years": 1095,
    };
    const days = frequencyMap[frequency] || 7;
    date.setDate(date.getDate() + days);
    return formatDate(date.toISOString().split("T")[0]);
  };

  const getCurrencySymbol = () => {
    if (baseCurrencySymbol) return baseCurrencySymbol;
    const code = baseCurrencyCode || "";
    if (!code) return "";
    const match = currencies.find(c => c.code === code);
    return match ? match.symbol : code;
  };

  // Sort options
  const sortOptions = [
    "Created Time",
    "Profile Name",
    "Expense Account",
    "Vendor Name",
    "Last Expense Date",
    "Next Expense Date",
    "Amount",
  ];

  // Sort expenses based on selected sort option
  const getSortedExpenses = (expenses) => {
    const sorted = [...expenses];

    sorted.sort((a, b) => {
      let aValue, bValue;

      switch (selectedSort) {
        case "Created Time":
          aValue = a.createdTime ? new Date(a.createdTime).getTime() : 0;
          bValue = b.createdTime ? new Date(b.createdTime).getTime() : 0;
          break;
        case "Profile Name":
          aValue = (a.profileName || "").toLowerCase();
          bValue = (b.profileName || "").toLowerCase();
          break;
        case "Expense Account":
          aValue = (a.expenseAccount || "").toLowerCase();
          bValue = (b.expenseAccount || "").toLowerCase();
          break;
        case "Vendor Name":
          aValue = (a.vendor || "").toLowerCase();
          bValue = (b.vendor || "").toLowerCase();
          break;
        case "Last Expense Date":
          aValue = a.startDate ? new Date(a.startDate).getTime() : 0;
          bValue = b.startDate ? new Date(b.startDate).getTime() : 0;
          break;
        case "Next Expense Date":
          const aNextDate = a.startDate ? new Date(a.startDate) : new Date(0);
          const bNextDate = b.startDate ? new Date(b.startDate) : new Date(0);
          const aFreq = a.repeatEvery || "Week";
          const bFreq = b.repeatEvery || "Week";
          const frequencyMap = {
            "Week": 7,
            "2 Weeks": 14,
            "Month": 30,
            "2 Months": 60,
            "3 Months": 90,
            "6 Months": 180,
            "Year": 365,
            "2 Years": 730,
            "3 Years": 1095,
          };
          aNextDate.setDate(aNextDate.getDate() + (frequencyMap[aFreq] || 7));
          bNextDate.setDate(bNextDate.getDate() + (frequencyMap[bFreq] || 7));
          aValue = aNextDate.getTime();
          bValue = bNextDate.getTime();
          break;
        case "Amount":
          aValue = parseFloat(a.amount || 0);
          bValue = parseFloat(b.amount || 0);
          break;
        default:
          return 0;
      }

      if (typeof aValue === "string") {
        return sortDirection === "asc"
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      } else {
        return sortDirection === "asc"
          ? aValue - bValue
          : bValue - aValue;
      }
    });

    return sorted;
  };

  // Handle sort selection
  const handleSortSelect = (sortOption) => {
    if (selectedSort === sortOption) {
      // Toggle sort direction if same option is selected
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSelectedSort(sortOption);
      setSortDirection("desc"); // Default to descending
    }
    setSortSubmenuOpen(false);
    setMoreMenuOpen(false);
  };

  // Export function
  const exportRecurringExpenses = (format, expensesToExport) => {
    const exportData = expensesToExport.slice(0, 25000);

    if (format === "csv") {
      const headers = [
        "Profile Name",
        "Expense Account",
        "Vendor Name",
        "Frequency",
        "Start Date",
        "Last Expense Date",
        "Next Expense Date",
        "Amount",
        "Currency",
        "Status",
        "Created Time",
      ];

      let csvContent = headers.join(",") + "\n";

      exportData.forEach((expense) => {
        const row = [
          `"${(expense.profileName || "").replace(/"/g, '""')}"`,
          `"${(expense.expenseAccount || "").replace(/"/g, '""')}"`,
          `"${(expense.vendor || "").replace(/"/g, '""')}"`,
          `"${(expense.repeatEvery || "").replace(/"/g, '""')}"`,
          `"${(expense.startDate || "").replace(/"/g, '""')}"`,
          `"${(expense.startDate ? formatDate(expense.startDate) : "").replace(/"/g, '""')}"`,
          `"${calculateNextDate(expense.startDate, expense.repeatEvery).replace(/"/g, '""')}"`,
          expense.amount || "0.00",
          `"${(baseCurrencyCode || expense.currency || "").replace(/"/g, '""')}"`,
          `"${(expense.status || "ACTIVE").replace(/"/g, '""')}"`,
          `"${(expense.createdTime || "").replace(/"/g, '""')}"`,
        ];
        csvContent += row.join(",") + "\n";
      });

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.href = url;
      link.download = `recurring_expenses_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } else if (format === "json") {
      const dataStr = JSON.stringify(exportData, null, 2);
      const dataBlob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `recurring_expenses_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  // Get filtered expenses based on selected view (memoized)
  const getFilteredExpenses = useMemo(() => {
    let filtered = recurringExpenses;

    if (selectedView !== "All") {
      filtered = recurringExpenses.filter((expense) => {
        const status = (expense.status || "").toUpperCase();
        const isActive = expense.active !== false && status !== "STOPPED";

        switch (selectedView) {
          case "Active":
            return isActive;
          case "Stopped":
            return status === "STOPPED" || expense.active === false;
          case "Expired":
            if (!expense.startDate) return false;
            const nextDate = new Date(expense.startDate);
            const frequencyMap = {
              "Week": 7,
              "2 Weeks": 14,
              "Month": 30,
              "2 Months": 60,
              "3 Months": 90,
              "6 Months": 180,
              "Year": 365,
              "2 Years": 730,
              "3 Years": 1095,
            };
            const days = frequencyMap[expense.repeatEvery] || 7;
            nextDate.setDate(nextDate.getDate() + days);
            return nextDate < new Date();
          default:
            return true;
        }
      });
    }

    return filtered;
  }, [recurringExpenses, selectedView]);

  // Get sorted and filtered expenses (memoized for performance)
  const displayExpenses = useMemo(() => {
    const sorted = [...getFilteredExpenses];

    sorted.sort((a, b) => {
      let aValue, bValue;

      switch (selectedSort) {
        case "Created Time":
          aValue = a.createdTime ? new Date(a.createdTime).getTime() : 0;
          bValue = b.createdTime ? new Date(b.createdTime).getTime() : 0;
          break;
        case "Profile Name":
          aValue = (a.profileName || "").toLowerCase();
          bValue = (b.profileName || "").toLowerCase();
          break;
        case "Expense Account":
          aValue = (a.expenseAccount || "").toLowerCase();
          bValue = (b.expenseAccount || "").toLowerCase();
          break;
        case "Vendor Name":
          aValue = (a.vendor || "").toLowerCase();
          bValue = (b.vendor || "").toLowerCase();
          break;
        case "Last Expense Date":
          aValue = a.startDate ? new Date(a.startDate).getTime() : 0;
          bValue = b.startDate ? new Date(b.startDate).getTime() : 0;
          break;
        case "Next Expense Date":
          const aNextDate = a.startDate ? new Date(a.startDate) : new Date(0);
          const bNextDate = b.startDate ? new Date(b.startDate) : new Date(0);
          const aFreq = a.repeatEvery || "Week";
          const bFreq = b.repeatEvery || "Week";
          const frequencyMap = {
            "Week": 7,
            "2 Weeks": 14,
            "Month": 30,
            "2 Months": 60,
            "3 Months": 90,
            "6 Months": 180,
            "Year": 365,
            "2 Years": 730,
            "3 Years": 1095,
          };
          aNextDate.setDate(aNextDate.getDate() + (frequencyMap[aFreq] || 7));
          bNextDate.setDate(bNextDate.getDate() + (frequencyMap[bFreq] || 7));
          aValue = aNextDate.getTime();
          bValue = bNextDate.getTime();
          break;
        case "Amount":
          aValue = parseFloat(a.amount || 0);
          bValue = parseFloat(b.amount || 0);
          break;
        default:
          return 0;
      }

      if (typeof aValue === "string") {
        return sortDirection === "asc"
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      } else {
        return sortDirection === "asc"
          ? aValue - bValue
          : bValue - aValue;
      }
    });

    return sorted;
  }, [getFilteredExpenses, selectedSort, sortDirection]);

  const styles = {
    container: {
      width: "100%",
      backgroundColor: "#ffffff",
      display: "flex",
      flexDirection: "column" as const as const,
    },
    listCard: {
      width: "100%",
      border: "1px solid #e5e7eb",
      backgroundColor: "#ffffff",
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
      gap: "8px",
      flex: 1,
    },
    dropdownWrapper: {
      position: "relative",
      display: "inline-block",
    },
    headerTitle: {
      fontSize: "36px",
      fontWeight: "700",
      color: "#111827",
      background: "none",
      border: "none",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      gap: "4px",
      padding: 0,
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
      minWidth: "180px",
      zIndex: 100,
      padding: "4px 0",
    },
    dropdownItem: {
      display: "block",
      width: "100%",
      padding: "8px 16px",
      fontSize: "14px",
      color: "#374151",
      cursor: "pointer",
      border: "none",
      background: "none",
      textAlign: "left" as const,
    },
    headerRight: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
    },
    newButton: {
      padding: "8px 16px",
      backgroundColor: "#22c55e",
      color: "#ffffff",
      fontSize: "14px",
      fontWeight: "500",
      borderRadius: "6px",
      border: "none",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      gap: "4px",
      transition: "background-color 0.2s",
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
    moreMenu: {
      position: "absolute",
      top: "100%",
      right: 0,
      marginTop: "8px",
      backgroundColor: "#ffffff",
      borderRadius: "8px",
      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
      border: "1px solid #e5e7eb",
      minWidth: "240px",
      zIndex: 100,
      padding: "4px 0",
    },
    moreMenuItem: {
      display: "block",
      width: "100%",
      padding: "12px 16px",
      fontSize: "14px",
      color: "#111827",
      cursor: "pointer",
      border: "none",
      background: "none",
      textAlign: "left" as const,
      transition: "background-color 0.2s",
    },
    moreDropdownItemLeft: {
      display: "flex",
      alignItems: "center",
      gap: "12px",
    },
    moreDropdownItemRight: {
      display: "flex",
      alignItems: "center",
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
      maxHeight: "400px",
      overflowY: "auto",
      overflowX: "hidden",
      zIndex: 101,
      padding: "4px 0",
    },
    submenuItem: {
      display: "block",
      width: "100%",
      padding: "10px 16px",
      fontSize: "14px",
      color: "#111827",
      cursor: "pointer",
      border: "none",
      background: "none",
      textAlign: "left" as const,
      transition: "background-color 0.2s",
    },
    table: {
      width: "100%",
      borderCollapse: "collapse",
    },
    tableWrap: {
      overflowX: "auto" as const,
      borderTop: "1px solid #e5e7eb",
    },
    tableHeader: {
      backgroundColor: "#f9fafb",
      borderBottom: "1px solid #e5e7eb",
    },
    tableHeaderCell: {
      padding: "12px 16px",
      textAlign: "left" as const,
      fontSize: "12px",
      fontWeight: "600",
      color: "#6b7280",
      textTransform: "uppercase",
      borderBottom: "1px solid #e5e7eb",
    },
    tableBody: {
      backgroundColor: "#ffffff",
    },
    tableRow: {
      borderBottom: "1px solid #e5e7eb",
    },
    tableCell: {
      padding: "12px 16px",
      fontSize: "14px",
      color: "#111827",
    },
    checkbox: {
      width: "16px",
      height: "16px",
      cursor: "pointer",
    },
    statusActive: {
      color: "#10b981",
      fontWeight: "500",
      fontSize: "14px",
    },
    emptyState: {
      padding: "48px 24px",
      textAlign: "center",
      color: "#6b7280",
      fontSize: "14px",
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
    <div style={styles.container}>
      {/* CSS Animations */}
      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}} />
      {/* Notification */}
      {notification && (
        <div
          style={{
            position: "fixed",
            top: "20px",
            right: "20px",
            backgroundColor: "#d1fae5",
            border: "1px solid #10b981",
            borderRadius: "8px",
            padding: "12px 16px",
            display: "flex",
            alignItems: "center",
            gap: "12px",
            zIndex: 10001,
            boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
          }}
        >
          <div
            style={{
              width: "24px",
              height: "24px",
              borderRadius: "4px",
              backgroundColor: "#10b981",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Check size={16} style={{ color: "#ffffff" }} />
          </div>
          <span
            style={{
              fontSize: "14px",
              color: "#065f46",
              fontWeight: "500",
            }}
          >
            {notification}
          </span>
        </div>
      )}
      <div style={styles.listCard}>
      {selectedItems.length > 0 && (
        <div style={{
          padding: "12px 16px",
          borderBottom: "1px solid #e5e7eb",
          backgroundColor: "#f9fafb",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between"
        }}>
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "12px"
          }}>
            <button
              onClick={handleBulkUpdate}
              style={{
                padding: "6px 12px",
                fontSize: "14px",
                fontWeight: "500",
                color: "#374151",
                backgroundColor: "#ffffff",
                border: "1px solid #d1d5db",
                borderRadius: "6px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px"
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = "#f9fafb";
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = "#ffffff";
              }}
            >
              Bulk Update
            </button>
            <div style={{
              width: "1px",
              height: "20px",
              backgroundColor: "#e5e7eb"
            }}></div>
            <button
              onClick={handleResume}
              style={{
                padding: "6px 12px",
                fontSize: "14px",
                fontWeight: "500",
                color: "#374151",
                backgroundColor: "#ffffff",
                border: "1px solid #d1d5db",
                borderRadius: "6px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px"
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = "#f9fafb";
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = "#ffffff";
              }}
            >
              Resume
            </button>
            <button
              onClick={handleStop}
              style={{
                padding: "6px 12px",
                fontSize: "14px",
                fontWeight: "500",
                color: "#374151",
                backgroundColor: "#ffffff",
                border: "1px solid #d1d5db",
                borderRadius: "6px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px"
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = "#f9fafb";
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = "#ffffff";
              }}
            >
              Stop
            </button>
            <button
              onClick={() => {
                if (selectedItems.length === 0) {
                  alert("Please select at least one recurring expense to delete.");
                  return;
                }
                setShowDeleteModal(true);
              }}
              style={{
                padding: "6px 12px",
                fontSize: "14px",
                fontWeight: "500",
                color: "#374151",
                backgroundColor: "#ffffff",
                border: "1px solid #d1d5db",
                borderRadius: "6px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px"
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = "#f9fafb";
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = "#ffffff";
              }}
            >
              Delete
            </button>
            <div style={{
              width: "1px",
              height: "20px",
              backgroundColor: "#e5e7eb",
              marginLeft: "4px"
            }}></div>
            <span style={{
              fontSize: "14px",
              color: "#374151",
              fontWeight: "500",
              marginLeft: "8px"
            }}>
              {selectedItems.length} Selected
            </span>
          </div>
          <button
            onClick={() => setSelectedItems([])}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "4px 8px",
              fontSize: "14px",
              color: "#374151",
              backgroundColor: "transparent",
              border: "none",
              cursor: "pointer"
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = "#e5e7eb";
              e.target.style.borderRadius = "4px";
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = "transparent";
            }}
          >
            <span>Esc</span>
            <X size={16} style={{ color: "#156372" }} />
          </button>
        </div>
      )}
      {/* Header */}
      {selectedItems.length === 0 && (
        <div style={styles.header}>
          <div style={styles.headerContent}>
            <div style={styles.headerLeft}>
              <div style={styles.dropdownWrapper} ref={dropdownRef}>
                <button
                  style={styles.headerTitle}
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                >
                  All Profiles
                  {dropdownOpen ? <ChevronUp size={16} style={{ color: "#156372" }} /> : <ChevronDown size={16} style={{ color: "#156372" }} />}
                </button>
                {dropdownOpen && (
                  <div style={styles.dropdown}>
                    {["All", "Active", "Stopped", "Expired"].map((option) => {
                      const isSelected = selectedView === option;
                      return (
                        <button
                          key={option}
                          style={{
                            ...styles.dropdownItem,
                            backgroundColor: isSelected ? "#156372" : "transparent",
                            color: isSelected ? "#ffffff" : "#374151",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                          }}
                          onClick={() => {
                            setSelectedView(option);
                            setDropdownOpen(false);
                          }}
                          onMouseEnter={(e) => {
                            if (!isSelected) {
                              e.target.style.backgroundColor = "#f9fafb";
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!isSelected) {
                              e.target.style.backgroundColor = "transparent";
                            }
                          }}
                        >
                          <span>{option}</span>
                          <Star
                            size={16}
                            style={{
                              color: isSelected ? "#ffffff" : "#9ca3af",
                            }}
                            fill={isSelected ? "currentColor" : "none"}
                            strokeWidth={1.5}
                          />
                        </button>
                      );
                    })}
                    <div style={{
                      height: "1px",
                      backgroundColor: "#e5e7eb",
                      margin: "4px 0",
                    }} />
                    <button
                      style={{
                        ...styles.dropdownItem,
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                      onClick={() => {
                        setShowCustomViewModal(true);
                        setDropdownOpen(false);
                      }}
                      onMouseEnter={(e) => (e.target.style.backgroundColor = "#f9fafb")}
                      onMouseLeave={(e) => (e.target.style.backgroundColor = "transparent")}
                    >
                      <Plus size={16} style={{ color: "#156372" }} />
                      New Custom View
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div style={styles.headerRight}>
              <button
                style={styles.newButton}
                onClick={() => navigate("/expenses/recurring-expenses/new")}
              onMouseEnter={(e) => (e.target.style.backgroundColor = "#0D4A52")}
              onMouseLeave={(e) => (e.target.style.backgroundColor = "#22c55e")}
            >
              <Plus size={16} />
              New
              </button>
              <div style={{ position: "relative" }} ref={moreMenuRef}>
                <button
                  style={styles.moreButton}
                  onClick={(e) => {
                    e.stopPropagation();
                    setMoreMenuOpen(!moreMenuOpen);
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = "#f9fafb";
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = "#ffffff";
                  }}
                >
                  <MoreVertical size={18} />
                </button>
                {moreMenuOpen && (
                  <div
                    style={styles.moreMenu}
                    onClick={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                  >
                    {/* Sort by */}
                    <div
                      style={{ position: "relative" }}
                      ref={sortSubmenuRef}
                      onMouseEnter={() => setSortSubmenuOpen(true)}
                      onMouseLeave={() => setSortSubmenuOpen(false)}
                    >
                      <button
                        style={{
                          ...styles.moreMenuItem,
                          backgroundColor: sortSubmenuOpen ? "#e3f2fd" : "transparent",
                          color: sortSubmenuOpen ? "#1976d2" : "#111827",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: "8px",
                        }}
                        onMouseEnter={(e) => {
                          if (!sortSubmenuOpen) {
                            e.target.style.backgroundColor = "#f9fafb";
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!sortSubmenuOpen) {
                            e.target.style.backgroundColor = "transparent";
                          }
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                          <ArrowUpDown size={16} style={{ color: sortSubmenuOpen ? "#1976d2" : "#6b7280" }} />
                          <span>Sort by</span>
                        </div>
                        <ChevronRight size={16} style={{ color: sortSubmenuOpen ? "#1976d2" : "#6b7280" }} />
                      </button>
                      {sortSubmenuOpen && (
                        <div style={styles.submenu}>
                          {sortOptions.map((option) => (
                            <button
                              key={option}
                              type="button"
                              style={{
                                ...styles.submenuItem,
                                backgroundColor: selectedSort === option ? "#e3f2fd" : "transparent",
                                color: selectedSort === option ? "#1976d2" : "#111827",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                              }}
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleSortSelect(option);
                              }}
                              onMouseEnter={(e) => {
                                if (selectedSort !== option) {
                                  e.target.style.backgroundColor = "#f3f4f6";
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (selectedSort !== option) {
                                  e.target.style.backgroundColor = "transparent";
                                }
                              }}
                            >
                              <span>{option}</span>
                              {selectedSort === option && (
                                <span style={{ fontSize: "12px", color: "#1976d2" }}>
                                  {sortDirection === "asc" ? "↑" : "↓"}
                                </span>
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Import Recurring Expenses */}
                    <button
                      style={{
                        ...styles.moreMenuItem,
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                      }}
                      onClick={() => {
                        setMoreMenuOpen(false);
                        navigate("/expenses/recurring-expenses/import");
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.backgroundColor = "#f9fafb";
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.backgroundColor = "transparent";
                      }}
                    >
                      <Download size={16} style={{ color: "#6b7280" }} />
                      <span>Import Recurring Expenses</span>
                    </button>

                    {/* Export */}
                    <div
                      style={styles.submenuWrapper}
                      onMouseEnter={() => {
                        if (exportSubmenuTimeoutRef.current) {
                          clearTimeout(exportSubmenuTimeoutRef.current);
                          exportSubmenuTimeoutRef.current = null;
                        }
                        setExportSubmenuOpen(true);
                        setHoveredMenuItem('export');
                      }}
                      onMouseLeave={() => {
                        exportSubmenuTimeoutRef.current = setTimeout(() => {
                          setExportSubmenuOpen(false);
                          setHoveredMenuItem(null);
                        }, 200);
                      }}
                    >
                      <button
                        style={{
                          ...styles.moreMenuItem,
                          backgroundColor: (hoveredMenuItem === 'export' || exportSubmenuOpen) ? "#156372" : "transparent",
                          color: (hoveredMenuItem === 'export' || exportSubmenuOpen) ? "#ffffff" : "#111827",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                        }}
                      >
                        <div style={styles.moreDropdownItemLeft}>
                          <Upload size={16} style={{ color: (hoveredMenuItem === 'export' || exportSubmenuOpen) ? "#ffffff" : "#6b7280" }} />
                          <span>Export</span>
                        </div>
                        <div style={styles.moreDropdownItemRight}>
                          <ChevronRight size={16} style={{ color: (hoveredMenuItem === 'export' || exportSubmenuOpen) ? "#ffffff" : "#6b7280" }} />
                        </div>
                      </button>
                      {exportSubmenuOpen && (
                        <div
                          style={styles.submenu}
                          onMouseEnter={() => {
                            if (exportSubmenuTimeoutRef.current) {
                              clearTimeout(exportSubmenuTimeoutRef.current);
                              exportSubmenuTimeoutRef.current = null;
                            }
                            setExportSubmenuOpen(true);
                          }}
                          onMouseLeave={() => {
                            exportSubmenuTimeoutRef.current = setTimeout(() => {
                              setExportSubmenuOpen(false);
                            }, 200);
                          }}
                        >
                          <button
                            type="button"
                            style={styles.submenuItem}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = "#156372";
                              e.currentTarget.style.color = "#ffffff";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = "transparent";
                              e.currentTarget.style.color = "#111827";
                            }}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              if (exportSubmenuTimeoutRef.current) {
                                clearTimeout(exportSubmenuTimeoutRef.current);
                                exportSubmenuTimeoutRef.current = null;
                              }
                              setExportSubmenuOpen(false);
                              setMoreMenuOpen(false);
                              setShowExportRecurringExpensesModal(true);
                            }}
                          >
                            <span>Export Recurring Expenses</span>
                          </button>
                          <button
                            type="button"
                            style={styles.submenuItem}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = "#156372";
                              e.currentTarget.style.color = "#ffffff";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = "transparent";
                              e.currentTarget.style.color = "#111827";
                            }}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              if (exportSubmenuTimeoutRef.current) {
                                clearTimeout(exportSubmenuTimeoutRef.current);
                                exportSubmenuTimeoutRef.current = null;
                              }
                              setExportSubmenuOpen(false);
                              setMoreMenuOpen(false);
                              setShowExportCurrentViewModal(true);
                            }}
                          >
                            <span>Export Current View</span>
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Refresh List */}
                    <button
                      style={{
                        ...styles.moreMenuItem,
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                      }}
                      onClick={() => {
                        setMoreMenuOpen(false);
                        handleRefresh();
                      }}
                      disabled={isRefreshing}
                      onMouseEnter={(e) => {
                        e.target.style.backgroundColor = "#f9fafb";
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.backgroundColor = "transparent";
                      }}
                    >
                      <RefreshCw
                        size={16}
                        style={{
                          color: "#6b7280",
                          animation: isRefreshing ? "spin 1s linear infinite" : "none"
                        }}
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

      {/* Table */}
      {isRefreshing || recurringExpenses.length > 0 ? (
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead style={styles.tableHeader}>
              <tr>
                <th style={styles.tableHeaderCell}>
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px"
                  }}>
                    <button
                      type="button"
                      style={{ border: "none", background: "transparent", padding: 0, cursor: "pointer", color: "#156372" }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setCustomizeColumnsSearch("");
                        setShowCustomizeColumnsModal(true);
                      }}
                    >
                      <SlidersHorizontal size={14} />
                    </button>
                    <input
                      type="checkbox"
                      checked={selectedItems.length === displayExpenses.length && displayExpenses.length > 0}
                      onChange={handleSelectAll}
                      style={{ ...styles.checkbox, accentColor: "#156372" }}
                    />
                    {isColumnVisible("profileName") ? "PROFILE NAME" : null}
                  </div>
                </th>
                {isColumnVisible("location") && <th style={styles.tableHeaderCell}>LOCATION</th>}
                {isColumnVisible("expenseAccount") && <th style={styles.tableHeaderCell}>EXPENSE ACCOUNT</th>}
                {isColumnVisible("customerName") && <th style={styles.tableHeaderCell}>CUSTOMER NAME</th>}
                {isColumnVisible("vendor") && <th style={styles.tableHeaderCell}>VENDOR NAME</th>}
                {isColumnVisible("frequency") && <th style={styles.tableHeaderCell}>FREQUENCY</th>}
                {isColumnVisible("lastExpenseDate") && <th style={styles.tableHeaderCell}>LAST EXPENSE DATE</th>}
                {isColumnVisible("nextExpenseDate") && <th style={styles.tableHeaderCell}>NEXT EXPENSE DATE</th>}
                {isColumnVisible("status") && <th style={styles.tableHeaderCell}>STATUS</th>}
                {isColumnVisible("amount") && <th style={styles.tableHeaderCell}>AMOUNT</th>}
                {isColumnVisible("wsq") && <th style={styles.tableHeaderCell}>WSQ</th>}
              </tr>
            </thead>
            <tbody style={styles.tableBody}>
              {isRefreshing ? (
                // Skeleton loading rows
                Array.from({ length: 5 }).map((_, index) => (
                  <tr key={`skeleton-${index}`} style={styles.tableRow}>
                    <td style={styles.tableCell}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ display: "inline-block", width: "14px", flexShrink: 0 }} />
                        <div style={styles.skeletonCheckbox}></div>
                        <div style={{ ...styles.skeletonCell, width: "100px" }}></div>
                      </div>
                    </td>
                    {isColumnVisible("location") && <td style={styles.tableCell}>
                      <div style={{ ...styles.skeletonCell, width: "100px" }}></div>
                    </td>}
                    {isColumnVisible("expenseAccount") && <td style={styles.tableCell}>
                      <div style={{ ...styles.skeletonCell, width: "120px" }}></div>
                    </td>}
                    {isColumnVisible("customerName") && <td style={styles.tableCell}>
                      <div style={{ ...styles.skeletonCell, width: "100px" }}></div>
                    </td>}
                    {isColumnVisible("vendor") && <td style={styles.tableCell}>
                      <div style={{ ...styles.skeletonCell, width: "80px" }}></div>
                    </td>}
                    {isColumnVisible("frequency") && <td style={styles.tableCell}>
                      <div style={{ ...styles.skeletonCell, width: "60px" }}></div>
                    </td>}
                    {isColumnVisible("lastExpenseDate") && <td style={styles.tableCell}>
                      <div style={{ ...styles.skeletonCell, width: "80px" }}></div>
                    </td>}
                    {isColumnVisible("nextExpenseDate") && <td style={styles.tableCell}>
                      <div style={{ ...styles.skeletonCell, width: "80px" }}></div>
                    </td>}
                    {isColumnVisible("status") && <td style={styles.tableCell}>
                      <div style={{ ...styles.skeletonCell, width: "60px" }}></div>
                    </td>}
                    {isColumnVisible("amount") && <td style={styles.tableCell}>
                      <div style={{ ...styles.skeletonCell, width: "70px" }}></div>
                    </td>}
                    {isColumnVisible("wsq") && <td style={styles.tableCell}>
                      <div style={{ ...styles.skeletonCell, width: "70px" }}></div>
                    </td>}
                  </tr>
                ))
              ) : (
                displayExpenses.map((expense) => (
                  <tr
                    key={expense.id}
                    style={{ ...styles.tableRow, cursor: "pointer" }}
                    onClick={(e) => {
                      // Don't navigate if clicking on checkbox or its container
                      if (e.target.type === "checkbox" || e.target.closest('input[type="checkbox"]') || e.target.closest('td')?.querySelector('input[type="checkbox"]')) {
                        return;
                      }
                      navigate(`/expenses/recurring-expenses/${expense.id}`);
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f9fafb")}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#ffffff")}
                  >
                    <td
                      style={styles.tableCell}
                      onClick={(e) => {
                        const target = e.target as HTMLElement;
                        if (target.closest('input[type="checkbox"]')) {
                          return;
                        }
                        e.stopPropagation();
                        handleSelectItem(expense.id);
                      }}
                    >
                      <div style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px"
                      }}>
                        <span style={{ display: "inline-block", width: "14px", flexShrink: 0 }} />
                        <input
                          type="checkbox"
                          checked={selectedItems.includes(expense.id)}
                          onChange={(e) => {
                            e.stopPropagation();
                            handleSelectItem(expense.id);
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                          }}
                          style={{ ...styles.checkbox, accentColor: "#156372" }}
                        />
                        {isColumnVisible("profileName") ? (expense.profileName || "") : null}
                      </div>
                    </td>
                    {isColumnVisible("location") && <td style={styles.tableCell}>{expense.location || ""}</td>}
                    {isColumnVisible("expenseAccount") && <td style={styles.tableCell}>{expense.expenseAccount || ""}</td>}
                    {isColumnVisible("customerName") && <td style={styles.tableCell}>{expense.customerName || ""}</td>}
                    {isColumnVisible("vendor") && <td style={styles.tableCell}>{expense.vendor || ""}</td>}
                    {isColumnVisible("frequency") && <td style={styles.tableCell}>{expense.repeatEvery || ""}</td>}
                    {isColumnVisible("lastExpenseDate") && <td style={styles.tableCell}>
                      {expense.startDate ? formatDate(expense.startDate) : ""}
                    </td>}
                    {isColumnVisible("nextExpenseDate") && <td style={styles.tableCell}>
                      {calculateNextDate(expense.startDate, expense.repeatEvery)}
                    </td>}
                    {isColumnVisible("status") && <td style={styles.tableCell}>
                      <span style={styles.statusActive}>
                        {expense.status === "ACTIVE" || expense.active !== false ? "ACTIVE" : expense.status || "ACTIVE"}
                      </span>
                    </td>}
                    {isColumnVisible("amount") && <td style={styles.tableCell}>
                      {getCurrencySymbol()} {expense.amount ? parseFloat(expense.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "0.00"}
                    </td>}
                    {isColumnVisible("wsq") && <td style={styles.tableCell}>{expense.wsq || ""}</td>}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{
          padding: "60px 40px",
          display: "flex",
          flexDirection: "column" as const as const,
          alignItems: "center",
          justifyContent: "center",
          minHeight: "60vh",
          backgroundColor: "#ffffff"
        }}>
          {/* Create. Set. Repeat. Section */}
          <div style={{
            textAlign: "center",
            marginBottom: "60px",
            maxWidth: "600px"
          }}>
            <h1 style={{
              fontSize: "48px",
              fontWeight: "700",
              color: "#111827",
              margin: "0 0 16px 0",
              lineHeight: "1.2"
            }}>
              Create. Set. Repeat.
            </h1>
            <p style={{
              fontSize: "16px",
              color: "#6b7280",
              margin: "0 0 32px 0",
              lineHeight: "1.5"
            }}>
              Create recurring expenses to handle and pay for stuff you spend on periodically.
            </p>
            <div style={{
              display: "flex",
              flexDirection: "column" as const as const,
              alignItems: "center",
              gap: "16px"
            }}>
              <button
                onClick={() => navigate("/expenses/recurring-expenses/new")}
                style={{
                  padding: "12px 24px",
                  fontSize: "16px",
                  fontWeight: "600",
                  color: "#ffffff",
                  backgroundColor: "#156372",
                  border: "none",
                  borderRadius: "8px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px"
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = "#0D4A52";
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = "#156372";
                }}
              >
                <Plus size={20} />
                NEW RECURRING EXPENSE
              </button>
              <button
                onClick={() => navigate("/expenses/recurring-expenses/import")}
                style={{
                  background: "none",
                  border: "none",
                  color: "#156372",
                  fontSize: "14px",
                  fontWeight: "500",
                  cursor: "pointer",
                  textDecoration: "underline",
                  padding: "8px"
                }}
                onMouseEnter={(e) => {
                  e.target.style.color = "#0D4A52";
                }}
                onMouseLeave={(e) => {
                  e.target.style.color = "#156372";
                }}
              >
                Import Recurring Expenses
              </button>
            </div>
          </div>

          {/* Life cycle of a Recurring Expense Diagram */}
          <div style={{
            marginBottom: "60px",
            width: "100%",
            maxWidth: "800px"
          }}>
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "24px",
              flexWrap: "wrap"
            }}>
              {/* CREATE RECURRING EXPENSE */}
              <div style={{
                padding: "20px 24px",
                backgroundColor: "#ffffff",
                border: "2px solid #e5e7eb",
                borderRadius: "8px",
                textAlign: "center",
                minWidth: "200px"
              }}>
                <div style={{
                  fontSize: "14px",
                  fontWeight: "600",
                  color: "#111827",
                  marginBottom: "8px"
                }}>
                  CREATE RECURRING EXPENSE
                </div>
                <FileText size={24} style={{ color: "#6b7280" }} />
              </div>

              {/* Arrow */}
              <ChevronRight size={24} style={{ color: "#9ca3af" }} />

              {/* BILLABLE / NON-BILLABLE Split */}
              <div style={{
                display: "flex",
                flexDirection: "column" as const as const,
                gap: "16px"
              }}>
                {/* BILLABLE Path */}
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "16px"
                }}>
                  <div style={{
                    padding: "16px 20px",
                    backgroundColor: "#ffffff",
                    border: "2px solid #10b981",
                    borderRadius: "8px",
                    textAlign: "center",
                    minWidth: "150px"
                  }}>
                    <div style={{
                      fontSize: "12px",
                      fontWeight: "600",
                      color: "#10b981",
                      marginBottom: "8px"
                    }}>
                      BILLABLE
                    </div>
                    <FileText size={20} style={{ color: "#10b981" }} />
                  </div>
                  <ChevronRight size={20} style={{ color: "#9ca3af" }} />
                  <div style={{
                    padding: "16px 20px",
                    backgroundColor: "#ffffff",
                    border: "2px solid #156372",
                    borderRadius: "8px",
                    textAlign: "center",
                    minWidth: "180px"
                  }}>
                    <div style={{
                      fontSize: "12px",
                      fontWeight: "600",
                      color: "#156372",
                      marginBottom: "8px"
                    }}>
                      CONVERT TO INVOICE
                    </div>
                    <FileText size={20} style={{ color: "#156372" }} />
                  </div>
                  <ChevronRight size={20} style={{ color: "#9ca3af" }} />
                  <div style={{
                    padding: "16px 20px",
                    backgroundColor: "#ffffff",
                    border: "2px solid #10b981",
                    borderRadius: "8px",
                    textAlign: "center",
                    minWidth: "150px"
                  }}>
                    <div style={{
                      fontSize: "12px",
                      fontWeight: "600",
                      color: "#10b981",
                      marginBottom: "8px"
                    }}>
                      GET REIMBURSED
                    </div>
                    <div style={{
                      fontSize: "20px",
                      color: "#10b981"
                    }}>$</div>
                  </div>
                </div>

                {/* NON-BILLABLE Path */}
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "16px"
                }}>
                  <div style={{
                    padding: "16px 20px",
                    backgroundColor: "#ffffff",
                    border: "2px solid #156372",
                    borderRadius: "8px",
                    textAlign: "center",
                    minWidth: "150px"
                  }}>
                    <div style={{
                      fontSize: "12px",
                      fontWeight: "600",
                      color: "#156372",
                      marginBottom: "8px"
                    }}>
                      NON-BILLABLE
                    </div>
                    <FileText size={20} style={{ color: "#156372" }} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* In the Recurring Expenses module, you can: Section */}
          <div style={{
            width: "100%",
            maxWidth: "800px",
            textAlign: "left"
          }}>
            <h2 style={{
              fontSize: "20px",
              fontWeight: "600",
              color: "#111827",
              margin: "0 0 24px 0"
            }}>
              In the Recurring Expenses module, you can:
            </h2>
            <ul style={{
              listStyle: "none",
              padding: 0,
              margin: 0,
              display: "flex",
              flexDirection: "column" as const as const,
              gap: "16px"
            }}>
              <li style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "12px"
              }}>
                <CheckCircle size={20} style={{ color: "#10b981", flexShrink: 0, marginTop: "2px" }} />
                <span style={{
                  fontSize: "16px",
                  color: "#374151",
                  lineHeight: "1.5"
                }}>
                  Create a recurring profile to routinely auto-generate expenses.
                </span>
              </li>
              <li style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "12px"
              }}>
                <CheckCircle size={20} style={{ color: "#10b981", flexShrink: 0, marginTop: "2px" }} />
                <span style={{
                  fontSize: "16px",
                  color: "#374151",
                  lineHeight: "1.5"
                }}>
                  View when each expense was auto-generated.
                </span>
              </li>
              <li style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "12px"
              }}>
                <CheckCircle size={20} style={{ color: "#10b981", flexShrink: 0, marginTop: "2px" }} />
                <span style={{
                  fontSize: "16px",
                  color: "#374151",
                  lineHeight: "1.5"
                }}>
                  Create individual expenses within the recurring profile.
                </span>
              </li>
            </ul>
          </div>
        </div>
      )
      }

      {/* Bulk Update Modal */}
      <BulkUpdateModal
        isOpen={showBulkUpdateModal}
        onClose={() => setShowBulkUpdateModal(false)}
        title="Bulk Update Recurring Expenses"
        fieldOptions={recurringExpenseFieldOptions}
        onUpdate={handleBulkUpdateSubmit}
        entityName="recurring expenses"
      />

      {showCustomizeColumnsModal && (
        <div
          className="fixed inset-0 z-[2200] bg-black/45"
          onClick={() => {
            setShowCustomizeColumnsModal(false);
            setCustomizeColumnsSearch("");
          }}
        >
          <div
            className="mx-auto mt-6 w-full max-w-[560px] rounded-md border border-gray-300 bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
              <div className="flex items-center gap-2 text-base text-gray-700">
                <SlidersHorizontal size={14} className="text-gray-600" />
                <span className="text-xl font-medium text-gray-700">Customize Columns</span>
              </div>
            </div>
            <div className="px-4 py-3">
              <input
                type="text"
                value={customizeColumnsSearch}
                onChange={(e) => setCustomizeColumnsSearch(e.target.value)}
                placeholder="Search"
                className="mb-3 w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 outline-none focus:border-blue-500"
              />
              <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
                {filteredCustomizeColumns.map((col: any) => (
                  <div key={col.key} className="flex items-center justify-between rounded bg-gray-50 px-3 py-2.5">
                    <label className="flex items-center gap-3 text-sm text-gray-700">
                      <span className="text-gray-400">⋮⋮</span>
                      <input
                        type="checkbox"
                        checked={visibleColumnKeys.includes(col.key)}
                        onChange={() => toggleVisibleColumn(col.key)}
                        className="h-4 w-4"
                      />
                      <span>{col.label}</span>
                    </label>
                  </div>
                ))}
                {filteredCustomizeColumns.length === 0 && (
                  <div className="rounded border border-dashed border-gray-300 px-3 py-4 text-sm text-gray-500">
                    No columns found.
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3 border-t border-gray-200 px-4 py-3">
              <button
                className="rounded bg-emerald-500 px-4 py-2 text-sm text-white hover:bg-emerald-600"
                onClick={() => {
                  setShowCustomizeColumnsModal(false);
                  setCustomizeColumnsSearch("");
                }}
              >
                Save
              </button>
              <button
                className="rounded border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                onClick={() => {
                  setShowCustomizeColumnsModal(false);
                  setCustomizeColumnsSearch("");
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={async () => {
          try {
            await Promise.all(selectedItems.map(id => recurringExpensesAPI.delete(id)));

            setNotification("Selected recurring expenses have been deleted.");
            setTimeout(() => setNotification(null), 3000);

            setSelectedItems([]);
            setShowDeleteModal(false);
            loadExpenses(); // Refresh list
            window.dispatchEvent(new Event("recurringExpensesUpdated"));
            window.dispatchEvent(new Event("storage"));
          } catch (error) {
            console.error("Error deleting recurring expenses:", error);
            alert("Failed to delete some expenses. Please try again.");
          }
        }}
        entityName="recurring expense(s)"
        count={selectedItems.length}
      />

      {/* Export Recurring Expenses Modal */}
      {
        showExportRecurringExpensesModal && typeof document !== 'undefined' && document.body
          ? createPortal(
            <ExportRecurringExpenses
              onClose={() => setShowExportRecurringExpensesModal(false)}
              exportType="recurring-expenses"
              data={recurringExpenses}
            />,
            document.body
          )
          : null
      }

      {/* Export Current View Modal */}
      {
        showExportCurrentViewModal && typeof document !== 'undefined' && document.body
          ? createPortal(
            <ExportRecurringExpenses
              onClose={() => setShowExportCurrentViewModal(false)}
              exportType="current-view"
              data={displayExpenses}
            />,
            document.body
          )
          : null
      }

      {/* New Custom View Modal */}
      {
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
      }

      {/* Search Modal */}
      {
        showSearchModal && typeof document !== 'undefined' && document.body
          ? createPortal(
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
                zIndex: 10000,
              }}
              onClick={(e) => {
                if (e.target === e.currentTarget) {
                  setShowSearchModal(false);
                }
              }}
            >              <div
              style={{
                backgroundColor: "#ffffff",
                borderRadius: "8px",
                width: "90%",
                maxWidth: "700px",
                boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
                display: "flex",
                flexDirection: "column" as const as const,
              }}
              onClick={(e) => e.stopPropagation()}
            >
                {/* Modal Header */}
                <div
                  style={{
                    padding: "16px 20px",
                    borderBottom: "1px solid #e5e7eb",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <label style={{ fontSize: "14px", fontWeight: "500", color: "#374151" }}>
                        Search
                      </label>
                      <select
                        style={{
                          padding: "6px 28px 6px 10px",
                          border: "1px solid #d1d5db",
                          borderRadius: "6px",
                          fontSize: "14px",
                          outline: "none",
                          appearance: "none",
                          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23374151' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
                          backgroundRepeat: "no-repeat",
                          backgroundPosition: "right 10px center",
                        }}
                      >
                        <option value="recurring-expenses">Recurring Expenses</option>
                      </select>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <label style={{ fontSize: "14px", fontWeight: "500", color: "#374151" }}>
                        Filter
                      </label>
                      <select
                        style={{
                          padding: "6px 28px 6px 10px",
                          border: "1px solid #d1d5db",
                          borderRadius: "6px",
                          fontSize: "14px",
                          outline: "none",
                          appearance: "none",
                          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23374151' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
                          backgroundRepeat: "no-repeat",
                          backgroundPosition: "right 10px center",
                        }}
                      >
                        <option value="all">All</option>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowSearchModal(false)}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      padding: "4px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <X size={20} style={{ color: "#156372" }} strokeWidth={2} />
                  </button>
                </div>

                {/* Modal Body */}
                <div style={{ padding: "24px" }}>
                  <div style={{ display: "flex", gap: "24px" }}>
                    {/* Left Column */}
                    <div style={{ flex: 1, display: "flex", flexDirection: "column" as const as const, gap: "16px" }}>
                      {/* Expense Account */}
                      <div>
                        <label style={{ display: "block", fontSize: "13px", fontWeight: "500", color: "#374151", marginBottom: "6px" }}>
                          Expense Account
                        </label>
                        <select
                          value={searchModalData.expenseAccount}
                          onChange={(e) => setSearchModalData(prev => ({ ...prev, expenseAccount: e.target.value }))}
                          style={{
                            width: "100%",
                            padding: "8px 28px 8px 10px",
                            border: "1px solid #d1d5db",
                            borderRadius: "6px",
                            fontSize: "14px",
                            outline: "none",
                            boxSizing: "border-box",
                            appearance: "none",
                            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23374151' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
                            backgroundRepeat: "no-repeat",
                            backgroundPosition: "right 10px center",
                          }}
                        >
                          <option value="">Select expense account</option>
                          <option value="Cost of Goods Sold">Cost of Goods Sold</option>
                          <option value="Office Supplies">Office Supplies</option>
                        </select>
                      </div>

                      {/* Vendor Name */}
                      <div>
                        <label style={{ display: "block", fontSize: "13px", fontWeight: "500", color: "#374151", marginBottom: "6px" }}>
                          Vendor Name
                        </label>
                        <input
                          type="text"
                          value={searchModalData.vendorName}
                          onChange={(e) => setSearchModalData(prev => ({ ...prev, vendorName: e.target.value }))}
                          style={{
                            width: "100%",
                            padding: "8px 12px",
                            border: "1px solid #d1d5db",
                            borderRadius: "6px",
                            fontSize: "14px",
                            outline: "none",
                            boxSizing: "border-box",
                          }}
                        />
                      </div>

                      {/* Frequency */}
                      <div>
                        <label style={{ display: "block", fontSize: "13px", fontWeight: "500", color: "#374151", marginBottom: "6px" }}>
                          Frequency
                        </label>
                        <select
                          value={searchModalData.frequency}
                          onChange={(e) => setSearchModalData(prev => ({ ...prev, frequency: e.target.value }))}
                          style={{
                            width: "100%",
                            padding: "8px 28px 8px 10px",
                            border: "1px solid #d1d5db",
                            borderRadius: "6px",
                            fontSize: "14px",
                            outline: "none",
                            boxSizing: "border-box",
                            appearance: "none",
                            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23374151' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
                            backgroundRepeat: "no-repeat",
                            backgroundPosition: "right 10px center",
                          }}
                        >
                          <option value="">Select frequency</option>
                          <option value="Daily">Daily</option>
                          <option value="Weekly">Weekly</option>
                          <option value="Monthly">Monthly</option>
                          <option value="Yearly">Yearly</option>
                        </select>
                      </div>

                      {/* Last Expense Date Range */}
                      <div>
                        <label style={{ display: "block", fontSize: "13px", fontWeight: "500", color: "#374151", marginBottom: "6px" }}>
                          Last Expense Date
                        </label>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <input
                            type="text"
                            placeholder="dd/MM/yyyy"
                            value={searchModalData.lastExpenseDateFrom}
                            onChange={(e) => setSearchModalData(prev => ({ ...prev, lastExpenseDateFrom: e.target.value }))}
                            style={{
                              flex: 1,
                              padding: "8px 12px",
                              border: "1px solid #d1d5db",
                              borderRadius: "6px",
                              fontSize: "14px",
                              outline: "none",
                              boxSizing: "border-box",
                            }}
                          />
                          <span style={{ color: "#6b7280" }}>-</span>
                          <input
                            type="text"
                            placeholder="dd/MM/yyyy"
                            value={searchModalData.lastExpenseDateTo}
                            onChange={(e) => setSearchModalData(prev => ({ ...prev, lastExpenseDateTo: e.target.value }))}
                            style={{
                              flex: 1,
                              padding: "8px 12px",
                              border: "1px solid #d1d5db",
                              borderRadius: "6px",
                              fontSize: "14px",
                              outline: "none",
                              boxSizing: "border-box",
                            }}
                          />
                        </div>
                      </div>

                      {/* Amount Range */}
                      <div>
                        <label style={{ display: "block", fontSize: "13px", fontWeight: "500", color: "#374151", marginBottom: "6px" }}>
                          Amount Range
                        </label>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <input
                            type="text"
                            value={searchModalData.amountFrom}
                            onChange={(e) => setSearchModalData(prev => ({ ...prev, amountFrom: e.target.value }))}
                            style={{
                              flex: 1,
                              padding: "8px 12px",
                              border: "1px solid #d1d5db",
                              borderRadius: "6px",
                              fontSize: "14px",
                              outline: "none",
                              boxSizing: "border-box",
                            }}
                          />
                          <span style={{ color: "#6b7280" }}>-</span>
                          <input
                            type="text"
                            value={searchModalData.amountTo}
                            onChange={(e) => setSearchModalData(prev => ({ ...prev, amountTo: e.target.value }))}
                            style={{
                              flex: 1,
                              padding: "8px 12px",
                              border: "1px solid #d1d5db",
                              borderRadius: "6px",
                              fontSize: "14px",
                              outline: "none",
                              boxSizing: "border-box",
                            }}
                          />
                        </div>
                      </div>

                      {/* Notes */}
                      <div>
                        <label style={{ display: "block", fontSize: "13px", fontWeight: "500", color: "#374151", marginBottom: "6px" }}>
                          Notes
                        </label>
                        <input
                          type="text"
                          value={searchModalData.notes}
                          onChange={(e) => setSearchModalData(prev => ({ ...prev, notes: e.target.value }))}
                          style={{
                            width: "100%",
                            padding: "8px 12px",
                            border: "1px solid #d1d5db",
                            borderRadius: "6px",
                            fontSize: "14px",
                            outline: "none",
                            boxSizing: "border-box",
                          }}
                        />
                      </div>
                    </div>

                    {/* Right Column */}
                    <div style={{ flex: 1, display: "flex", flexDirection: "column" as const as const, gap: "16px" }}>
                      {/* Next Expense Date Range */}
                      <div>
                        <label style={{ display: "block", fontSize: "13px", fontWeight: "500", color: "#374151", marginBottom: "6px" }}>
                          Next Expense Date
                        </label>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <input
                            type="text"
                            placeholder="dd/MM/yyyy"
                            value={searchModalData.nextExpenseDateFrom}
                            onChange={(e) => setSearchModalData(prev => ({ ...prev, nextExpenseDateFrom: e.target.value }))}
                            style={{
                              flex: 1,
                              padding: "8px 12px",
                              border: "1px solid #d1d5db",
                              borderRadius: "6px",
                              fontSize: "14px",
                              outline: "none",
                              boxSizing: "border-box",
                            }}
                          />
                          <span style={{ color: "#6b7280" }}>-</span>
                          <input
                            type="text"
                            placeholder="dd/MM/yyyy"
                            value={searchModalData.nextExpenseDateTo}
                            onChange={(e) => setSearchModalData(prev => ({ ...prev, nextExpenseDateTo: e.target.value }))}
                            style={{
                              flex: 1,
                              padding: "8px 12px",
                              border: "1px solid #d1d5db",
                              borderRadius: "6px",
                              fontSize: "14px",
                              outline: "none",
                              boxSizing: "border-box",
                            }}
                          />
                        </div>
                      </div>

                      {/* Status */}
                      <div>
                        <label style={{ display: "block", fontSize: "13px", fontWeight: "500", color: "#374151", marginBottom: "6px" }}>
                          Status
                        </label>
                        <select
                          value={searchModalData.status}
                          onChange={(e) => setSearchModalData(prev => ({ ...prev, status: e.target.value }))}
                          style={{
                            width: "100%",
                            padding: "8px 28px 8px 10px",
                            border: "1px solid #d1d5db",
                            borderRadius: "6px",
                            fontSize: "14px",
                            outline: "none",
                            boxSizing: "border-box",
                            appearance: "none",
                            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23374151' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
                            backgroundRepeat: "no-repeat",
                            backgroundPosition: "right 10px center",
                          }}
                        >
                          <option value="">All</option>
                          <option value="Active">Active</option>
                          <option value="Inactive">Inactive</option>
                        </select>
                      </div>

                      {/* Customer Name */}
                      <div>
                        <label style={{ display: "block", fontSize: "13px", fontWeight: "500", color: "#374151", marginBottom: "6px" }}>
                          Customer Name
                        </label>
                        <select
                          value={searchModalData.customerName}
                          onChange={(e) => setSearchModalData(prev => ({ ...prev, customerName: e.target.value }))}
                          style={{
                            width: "100%",
                            padding: "8px 28px 8px 10px",
                            border: "1px solid #d1d5db",
                            borderRadius: "6px",
                            fontSize: "14px",
                            outline: "none",
                            boxSizing: "border-box",
                            appearance: "none",
                            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23374151' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
                            backgroundRepeat: "no-repeat",
                            backgroundPosition: "right 10px center",
                          }}
                        >
                          <option value="">Select customer</option>
                        </select>
                      </div>

                      {/* Project Name */}
                      <div>
                        <label style={{ display: "block", fontSize: "13px", fontWeight: "500", color: "#374151", marginBottom: "6px" }}>
                          Project Name
                        </label>
                        <select
                          value={searchModalData.projectName}
                          onChange={(e) => setSearchModalData(prev => ({ ...prev, projectName: e.target.value }))}
                          style={{
                            width: "100%",
                            padding: "8px 28px 8px 10px",
                            border: "1px solid #d1d5db",
                            borderRadius: "6px",
                            fontSize: "14px",
                            outline: "none",
                            boxSizing: "border-box",
                            appearance: "none",
                            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23374151' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
                            backgroundRepeat: "no-repeat",
                            backgroundPosition: "right 10px center",
                          }}
                        >
                          <option value="">Select a project</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Modal Footer */}
                <div
                  style={{
                    padding: "16px 20px",
                    borderTop: "1px solid #e5e7eb",
                    backgroundColor: "#ffffff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "flex-end",
                    gap: "12px",
                  }}
                >
                  <button
                    onClick={() => {
                      setShowSearchModal(false);
                      setSearchModalData({
                        expenseAccount: "",
                        vendorName: "",
                        frequency: "",
                        lastExpenseDateFrom: "",
                        lastExpenseDateTo: "",
                        nextExpenseDateFrom: "",
                        nextExpenseDateTo: "",
                        status: "",
                        amountFrom: "",
                        amountTo: "",
                        notes: "",
                        customerName: "",
                        projectName: "",
                      });
                    }}
                    style={{
                      padding: "8px 16px",
                      fontSize: "14px",
                      fontWeight: "500",
                      backgroundColor: "#ffffff",
                      color: "#374151",
                      borderRadius: "6px",
                      border: "1px solid #d1d5db",
                      cursor: "pointer",
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.backgroundColor = "#f9fafb";
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.backgroundColor = "#ffffff";
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      console.log("Search with:", searchModalData);
                      setShowSearchModal(false);
                    }}
                    style={{
                      padding: "8px 16px",
                      fontSize: "14px",
                      fontWeight: "500",
                      backgroundColor: "#156372",
                      color: "#ffffff",
                      borderRadius: "6px",
                      border: "none",
                      cursor: "pointer",
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.backgroundColor = "#0D4A52";
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.backgroundColor = "#156372";
                    }}
                  >
                    Search
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )
          : null
      }
    </div >
  );
}

/**
 * Design tokens for Custom View components
 */
const Z = {
  primaryColor: "#156372",
  danger: "#156372",
  line: "#e5e7eb",
  textHeader: "#111827",
  textMuted: "#6b7280",
  bgLight: "#f9fafb",
  bgMain: "#f3f4f6",
};

const MOCK_USERS = [
  { id: 1, name: "Jirde Hussein Khalif", email: "jirde@taban.com", role: "Admin" },
  { id: 2, name: "Ibrahim Ahmed", email: "ibrahim@taban.com", role: "Editor" },
  { id: 3, name: "Sarah Smith", email: "sarah@taban.com", role: "Viewer" },
  { id: 4, name: "Tech Support", email: "support@taban.com", role: "Support" },
];

const MOCK_ROLES = [
  { id: "admin", name: "Admin" },
  { id: "staff", name: "Staff" },
  { id: "timesheet", name: "TimesheetStaff" },
  { id: "assigned", name: "Staff (Assigned Customers Only)" },
];

function UserRoleSelector() {
  const [selectorMode, setSelectorMode] = useState("Users"); // "Users" | "Roles"
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [selectedItems, setSelectedItems] = useState([]);
  const inputRef = useRef(null);

  const toggleDropdown = () => setIsDropdownOpen(!isDropdownOpen);
  const selectMode = (mode) => {
    setSelectorMode(mode);
    setIsDropdownOpen(false);
    setInputValue("");
  };

  const handleSelect = (item) => {
    if (!selectedItems.find(i => i.id === item.id)) {
      setSelectedItems([...selectedItems, { ...item, type: selectorMode }]);
    }
    setInputValue("");
    setIsInputFocused(false);
  };

  const handleRemove = (id) => {
    setSelectedItems(selectedItems.filter(i => i.id !== id));
  };

  const handleAddClick = () => {
    setIsInputFocused(true);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const filteredItems = (selectorMode === "Users" ? MOCK_USERS : MOCK_ROLES)
    .filter(item =>
      !selectedItems.find(i => i.id === item.id) &&
      item.name.toLowerCase().includes(inputValue.toLowerCase())
    );

  const highlightBorder = (focused) => focused ? `1px solid ${Z.primaryColor}` : `1px solid ${Z.line}`;

  return (
    <div style={{
      marginTop: "24px", padding: "32px", border: `1px solid ${Z.line}`,
      borderRadius: "8px", backgroundColor: "#ffffff"
    }}>
      <div style={{ position: "relative", display: "flex", gap: "0", borderRadius: "6px", border: highlightBorder(isInputFocused), overflow: "visible", maxWidth: "800px", flexWrap: "wrap", alignItems: "stretch" }}>

        {/* Dropdown Trigger */}
        <div
          onClick={toggleDropdown}
          style={{
            padding: "10px 16px", backgroundColor: "#ffffff", borderRight: `1px solid ${Z.line}`,
            display: "flex", alignItems: "center", gap: "8px", minWidth: "120px", cursor: "pointer",
            position: "relative", height: "auto"
          }}
        >
          <span style={{ fontSize: "14px", color: "#374151" }}>{selectorMode}</span>
          <ChevronDown size={14} color="#6b7280" />

          {/* Dropdown Menu */}
          {isDropdownOpen && (
            <div style={{
              position: "absolute", top: "100%", left: 0, marginTop: "4px", width: "200px",
              backgroundColor: "#ffffff", border: "1px solid #e5e7eb", borderRadius: "6px",
              boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)", zIndex: 20
            }}>
              {["Users", "Roles"].map(mode => (
                <div
                  key={mode}
                  onClick={(e) => { e.stopPropagation(); selectMode(mode); }}
                  style={{
                    padding: "8px 12px", fontSize: "14px", cursor: "pointer",
                    backgroundColor: selectorMode === mode ? Z.primaryColor : "transparent",
                    color: selectorMode === mode ? "#ffffff" : "#374151"
                  }}
                  onMouseEnter={(e) => { if (selectorMode !== mode) e.currentTarget.style.backgroundColor = Z.bgLight; }}
                  onMouseLeave={(e) => { if (selectorMode !== mode) e.currentTarget.style.backgroundColor = "transparent"; }}
                >
                  {mode}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Input Area + Chips */}
        <div style={{ flex: 1, position: "relative", display: "flex", flexWrap: "wrap", alignItems: "center", padding: "4px", gap: "4px" }}>
          {selectedItems.map(item => (
            <div key={item.id} style={{
              display: "flex", alignItems: "center", gap: "6px", padding: "2px 8px",
              backgroundColor: "#e0f2fe", borderRadius: "12px", fontSize: "12px", color: "#0369a1", border: "1px solid #7dd3fc"
            }}>
              {item.name}
              <X size={12} style={{ cursor: "pointer" }} onClick={() => handleRemove(item.id)} />
            </div>
          ))}

          <input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onFocus={() => setIsInputFocused(true)}
            onBlur={() => setTimeout(() => setIsInputFocused(false), 200)}
            placeholder={selectedItems.length === 0 ? (selectorMode === "Users" ? "Select Users" : "Add Roles") : ""}
            style={{
              flex: 1, minWidth: "100px", border: "none", padding: "6px 12px",
              fontSize: "14px", outline: "none", height: "30px"
            }}
          />

          {/* Search Results Dropdown */}
          {isInputFocused && (
            <div style={{
              position: "absolute", top: "100%", left: 0, right: 0, marginTop: "8px",
              backgroundColor: "#ffffff", border: "1px solid #e5e7eb", borderRadius: "6px",
              boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)", zIndex: 20, maxHeight: "250px", overflowY: "auto"
            }}>
              <div style={{ padding: "8px", borderBottom: "1px solid #e5e7eb" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "4px 8px", border: "1px solid #e5e7eb", borderRadius: "4px" }}>
                  <Search size={14} color="#9ca3af" />
                  <input readOnly value={inputValue} placeholder="Search" style={{ border: "none", outline: "none", fontSize: "13px", width: "100%" }} />
                </div>
              </div>
              {filteredItems.map(item => (
                <div
                  key={item.id}
                  onClick={() => handleSelect(item)}
                  style={{
                    padding: "8px 12px", cursor: "pointer", margin: "4px", borderRadius: "4px",
                    display: "flex", flexDirection: "column" as const
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = Z.primaryColor;
                    e.currentTarget.style.color = "#ffffff";
                    const emailDiv = e.currentTarget.querySelector('.email-sub');
                    if (emailDiv) emailDiv.style.opacity = "0.9";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "transparent";
                    e.currentTarget.style.color = "#374151";
                    const emailDiv = e.currentTarget.querySelector('.email-sub');
                    if (emailDiv) emailDiv.style.opacity = "1";
                  }}
                >
                  <div style={{ fontSize: "13px", fontWeight: "600", textTransform: "uppercase" }}>{item.name}</div>
                  {item.email && <div className="email-sub" style={{ fontSize: "12px", color: "inherit", opacity: 1 }}>{item.email}</div>}
                </div>
              ))}
              {filteredItems.length === 0 && <div style={{ padding: "12px", textAlign: "center", color: "#6b7280", fontSize: "13px" }}>No results found</div>}
            </div>
          )}
        </div>

        {/* Action Button */}
        <button
          type="button"
          onClick={handleAddClick}
          style={{
            padding: "10px 20px", backgroundColor: "#f3f4f6", borderLeft: `1px solid ${Z.line}`,
            display: "flex", alignItems: "center", gap: "8px", fontWeight: "500", fontSize: "14px",
            cursor: "pointer", border: "none", color: Z.primaryColor, alignSelf: "stretch"
          }}
        >
          <PlusCircle size={16} color={Z.primaryColor} /> Add {selectorMode}
        </button>
      </div>

      <div style={{ marginTop: "40px", textAlign: "center" }}>
        <p style={{ fontSize: "14px", color: Z.textMuted, maxWidth: "500px", margin: "0 auto", lineHeight: "1.5" }}>
          You haven't shared this Custom View with any {selectedItems.length > 0 ? "users/roles" : selectorMode.toLowerCase()} yet. Select the {selectorMode.toLowerCase()} to share it with and provide their access permissions.
        </p>
      </div>
    </div>
  );
}

function NewCustomViewModal({ onClose, onSave }) {
  const [formData, setFormData] = useState({
    name: "",
    markAsFavorite: false,
    criteria: [{ id: 1, field: "", comparator: "", value: "" }],
    availableColumns: [
      "Vendor Name",
      "Last Expense Date",
      "Customer Name",
      "Start Date",
      "Created Time",
      "Created By",
      "Last Modified Time",
      "Last Modified By",
      "Currency",
      "Notes",
    ],
    selectedColumns: ["Profile Name", "Expense Account", "Frequency", "Next Expense Date", "Status", "Amount"],
    visibility: "Only Me",
    selectedUsers: [],
    userType: "Users",
    selectUsers: "",
  });
  const [searchQuery, setSearchQuery] = useState("");

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleCriterionChange = (id, field, value) => {
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

  const removeCriterion = (id) => {
    setFormData((prev) => ({
      ...prev,
      criteria: prev.criteria.filter((c) => c.id !== id),
    }));
  };

  const moveColumnToSelected = (column) => {
    setFormData((prev) => ({
      ...prev,
      availableColumns: prev.availableColumns.filter((c) => c !== column),
      selectedColumns: [...prev.selectedColumns, column],
    }));
  };

  const moveColumnToAvailable = (column) => {
    // Don't allow removing required columns
    const requiredColumns = ["Profile Name", "Expense Account", "Frequency", "Next Expense Date", "Status", "Amount"];
    if (requiredColumns.includes(column)) {
      return;
    }
    setFormData((prev) => ({
      ...prev,
      selectedColumns: prev.selectedColumns.filter((c) => c !== column),
      availableColumns: [...prev.availableColumns, column],
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  const fieldOptions = [
    "Profile Name",
    "Expense Account",
    "Vendor Name",
    "Frequency",
    "Start Date",
    "Last Expense Date",
    "Next Expense Date",
    "Amount",
    "Currency",
    "Status",
    "Created Time",
    "Created By",
    "Last Modified Time",
    "Last Modified By",
    "Notes",
  ];

  const comparatorOptions = [
    "equals",
    "not equals",
    "contains",
    "does not contain",
    "starts with",
    "ends with",
    "is empty",
    "is not empty",
  ];

  const filteredAvailableColumns = formData.availableColumns.filter((col) =>
    col.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const modalStyles = {
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
    },
    modal: {
      backgroundColor: "#ffffff",
      borderRadius: "8px",
      width: "90%",
      maxWidth: "900px",
      maxHeight: "90vh",
      overflow: "auto",
      boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
    },
    header: {
      padding: "20px 24px",
      borderBottom: "1px solid #e5e7eb",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
    },
    title: {
      fontSize: "18px",
      fontWeight: "600",
      color: "#111827",
      margin: 0,
    },
    close: {
      background: "none",
      border: "none",
      cursor: "pointer",
      padding: "4px",
      color: "#6b7280",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    },
    body: {
      padding: "24px",
    },
    section: {
      marginBottom: "24px",
    },
    nameRow: {
      display: "flex",
      gap: "16px",
      alignItems: "flex-end",
    },
    formGroup: {
      display: "flex",
      flexDirection: "column" as const as const,
      gap: "8px",
      flex: 1,
    },
    nameInput: {
      flex: 1,
    },
    label: {
      fontSize: "14px",
      fontWeight: "500",
      color: "#374151",
    },
    input: {
      padding: "8px 12px",
      fontSize: "14px",
      border: "1px solid #d1d5db",
      borderRadius: "6px",
      width: "100%",
      boxSizing: "border-box",
    },
    favoriteCheckbox: {
      display: "flex",
      alignItems: "center",
      gap: "4px",
    },
    sectionTitle: {
      fontSize: "14px",
      fontWeight: "600",
      color: "#111827",
      marginBottom: "12px",
    },
    criteriaContainer: {
      display: "flex",
      flexDirection: "column" as const as const,
      gap: "12px",
    },
    criterionRow: {
      display: "flex",
      gap: "8px",
      alignItems: "center",
    },
    criterionSelect: {
      padding: "6px 8px",
      fontSize: "14px",
      border: "1px solid #d1d5db",
      borderRadius: "4px",
      flex: 1,
    },
    removeButton: {
      padding: "6px",
      color: "#156372",
      background: "none",
      border: "none",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    },
    addButton: {
      padding: "8px 16px",
      fontSize: "14px",
      color: "#156372",
      background: "none",
      border: "1px solid #156372",
      borderRadius: "6px",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      gap: "4px",
      marginTop: "8px",
    },
    columnsContainer: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: "16px",
    },
    columnSection: {
      border: "1px solid #e5e7eb",
      borderRadius: "6px",
      padding: "12px",
    },
    searchInput: {
      padding: "6px 8px",
      fontSize: "14px",
      border: "1px solid #d1d5db",
      borderRadius: "4px",
      width: "100%",
      marginBottom: "8px",
      boxSizing: "border-box",
    },
    columnList: {
      display: "flex",
      flexDirection: "column" as const as const,
      gap: "4px",
      maxHeight: "200px",
      overflowY: "auto",
    },
    columnItem: {
      padding: "6px 8px",
      fontSize: "14px",
      color: "#111827",
      cursor: "pointer",
      borderRadius: "4px",
      border: "none",
      background: "none",
      textAlign: "left" as const,
    },
    footer: {
      padding: "20px 24px",
      borderTop: "1px solid #e5e7eb",
      display: "flex",
      justifyContent: "flex-end",
      gap: "12px",
    },
    footerButton: {
      padding: "8px 16px",
      fontSize: "14px",
      fontWeight: "500",
      borderRadius: "6px",
      border: "none",
      cursor: "pointer",
    },
    cancelButton: {
      backgroundColor: "#f3f4f6",
      color: "#111827",
    },
    saveButton: {
      backgroundColor: "#156372",
      color: "#ffffff",
    },
  };

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
                  style={{ ...modalStyles.input, borderColor: "#156372", borderWidth: "2px" }}
                />
              </div>
              <div style={{ ...modalStyles.favoriteCheckbox, marginTop: "24px" }}>
                <Star size={16} style={{ color: formData.markAsFavorite ? "#fbbf24" : "#9ca3af", flexShrink: 0 }} />
                <label htmlFor="favorite" style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: "4px", fontSize: "14px", color: "#374151" }}>
                  <input
                    type="checkbox"
                    name="markAsFavorite"
                    checked={formData.markAsFavorite}
                    onChange={handleChange}
                    id="favorite"
                    style={{ cursor: "pointer" }}
                  />
                  Mark as Favorite
                </label>
              </div>
            </div>
          </div>

          {/* Define the criteria Section */}
          <div style={modalStyles.section}>
            <h3 style={modalStyles.sectionTitle}>Define the criteria (if any)</h3>
            <div style={modalStyles.criteriaContainer}>
              {formData.criteria.map((criterion, index) => (
                <div key={criterion.id} style={{ ...modalStyles.criterionRow, alignItems: "center" }}>
                  <span style={{ fontSize: "14px", color: "#374151", minWidth: "20px" }}>{index + 1}</span>
                  <select
                    value={criterion.field}
                    onChange={(e) => handleCriterionChange(criterion.id, "field", e.target.value)}
                    style={modalStyles.criterionSelect}
                  >
                    <option value="">Select a field</option>
                    {fieldOptions.map((field) => (
                      <option key={field} value={field}>
                        {field}
                      </option>
                    ))}
                  </select>
                  <select
                    value={criterion.comparator}
                    onChange={(e) => handleCriterionChange(criterion.id, "comparator", e.target.value)}
                    style={modalStyles.criterionSelect}
                    disabled={!criterion.field}
                  >
                    <option value="">Select a comparator</option>
                    {comparatorOptions.map((comp) => (
                      <option key={comp} value={comp}>
                        {comp}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={criterion.value}
                    onChange={(e) => handleCriterionChange(criterion.id, "value", e.target.value)}
                    style={modalStyles.criterionSelect}
                    placeholder="Value"
                    disabled={!criterion.comparator || ["is empty", "is not empty"].includes(criterion.comparator)}
                  />
                  <button
                    type="button"
                    onClick={() => removeCriterion(criterion.id)}
                    style={modalStyles.removeButton}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              <button type="button" onClick={addCriterion} style={modalStyles.addButton}>
                <Plus size={16} />
                Add Criterion
              </button>
            </div>
          </div>

          {/* Columns Preference Section */}
          <div style={modalStyles.section}>
            <h3 style={modalStyles.sectionTitle}>Columns Preference</h3>
            <div style={modalStyles.columnsContainer}>
              <div style={modalStyles.columnSection}>
                <div style={{ ...modalStyles.label, marginBottom: "8px" }}>AVAILABLE COLUMNS</div>
                <div style={{ position: "relative", marginBottom: "8px" }}>
                  <Search size={16} style={{ position: "absolute", left: "8px", top: "50%", transform: "translateY(-50%)", color: "#9ca3af" }} />
                  <input
                    type="text"
                    placeholder="Search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{ ...modalStyles.searchInput, paddingLeft: "32px" }}
                  />
                </div>
                <div style={modalStyles.columnList}>
                  {filteredAvailableColumns.map((column) => (
                    <button
                      key={column}
                      type="button"
                      onClick={() => moveColumnToSelected(column)}
                      style={{ ...modalStyles.columnItem, display: "flex", alignItems: "center", gap: "8px" }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "#f9fafb";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "transparent";
                      }}
                    >
                      <GripVertical size={16} style={{ color: "#9ca3af", flexShrink: 0 }} />
                      <span>{column}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div style={modalStyles.columnSection}>
                <div style={{ ...modalStyles.label, marginBottom: "8px", display: "flex", alignItems: "center", gap: "6px" }}>
                  <CheckCircle size={16} style={{ color: "#10b981" }} />
                  SELECTED COLUMNS
                </div>
                <div style={modalStyles.columnList}>
                  {formData.selectedColumns.map((column) => {
                    const isRequired = ["Profile Name", "Expense Account", "Frequency", "Next Expense Date", "Status", "Amount"].includes(column);
                    return (
                      <button
                        key={column}
                        type="button"
                        onClick={() => {
                          if (!isRequired) {
                            moveColumnToAvailable(column);
                          }
                        }}
                        style={{
                          ...modalStyles.columnItem,
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          cursor: isRequired ? "default" : "pointer"
                        }}
                        onMouseEnter={(e) => {
                          if (!isRequired) {
                            e.currentTarget.style.backgroundColor = "#f9fafb";
                          }
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = "transparent";
                        }}
                      >
                        <GripVertical size={16} style={{ color: "#9ca3af", flexShrink: 0 }} />
                        <span>{column}{isRequired ? "*" : ""}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Visibility Preference Section */}
          <div style={modalStyles.section}>
            <div style={modalStyles.formGroup}>
              <label style={{ ...modalStyles.label, marginBottom: "4px" }}>Visibility Preference</label>

              <div style={{ display: "flex", gap: "16px", marginTop: "8px" }}>
                {[
                  { id: "Only Me", label: "Only Me", icon: <Lock size={16} /> },
                  { id: "Only Selected Users & Roles", label: "Only Selected Users & Roles", icon: <User size={16} /> },
                  { id: "Everyone", label: "Everyone", icon: <Folder size={16} /> }
                ].map((opt) => {
                  const isSelected = formData.visibility === opt.id;
                  return (
                    <div
                      key={opt.id}
                      onClick={() => setFormData(p => ({ ...p, visibility: opt.id }))}
                      style={{
                        display: "flex", alignItems: "center", gap: "10px", padding: "10px 16px",
                        border: isSelected ? `1px solid ${Z.primaryColor}` : `1px solid ${Z.line}`,
                        borderRadius: "6px", cursor: "pointer", backgroundColor: isSelected ? "#15637210" : "#ffffff",
                        minWidth: "150px"
                      }}
                    >
                      <div style={{
                        width: "16px", height: "16px", borderRadius: "50%", border: isSelected ? `5px solid ${Z.primaryColor}` : `1px solid #d1d5db`,
                        display: "flex", alignItems: "center", justifyContent: "center", boxSizing: "border-box"
                      }} />
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "14px", color: isSelected ? Z.primaryColor : "#374151" }}>
                        <span style={{ color: "#9ca3af" }}>{opt.icon}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* User/Role Selector Component */}
              {formData.visibility === "Only Selected Users & Roles" && <UserRoleSelector />}
            </div>
          </div>

          <div style={modalStyles.footer}>
            <button
              type="button"
              onClick={onClose}
              style={{ ...modalStyles.footerButton, ...modalStyles.cancelButton }}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{ ...modalStyles.footerButton, ...modalStyles.saveButton }}
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
