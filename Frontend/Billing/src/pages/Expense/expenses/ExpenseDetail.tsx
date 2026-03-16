import React, { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { jsPDF } from "jspdf";
import {
  ChevronDown,
  Edit,
  RotateCw,
  MoreVertical,
  Upload as UploadIcon,
  X,
  MessageCircle,
  Trash2,
  FileText,
  ChevronRight,
  Paperclip,
  Plus,
  History,
} from "lucide-react";
import { expensesAPI, chartOfAccountsAPI, currenciesAPI, taxesAPI, customersAPI } from "../../../services/api";
import { useCurrency } from "../../../hooks/useCurrency";

const EXPENSES_KEY = "expenses_v1";

const getLS = (k) => {
  if (typeof window !== "undefined" && window.localStorage) {
    return window.localStorage.getItem(k);
  }
  return null;
};

export default function ExpenseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { code: baseCurrencyCode, symbol: baseCurrencySymbol } = useCurrency();
  const [expense, setExpense] = useState<any | null>(null);
  const [expenses, setExpenses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [exportSubmenuOpen, setExportSubmenuOpen] = useState(false);
  const [uploadMenuOpen, setUploadMenuOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [selectedExpenses, setSelectedExpenses] = useState([id]);
  const [showHistory, setShowHistory] = useState(false);
  const [showAssociatedTags, setShowAssociatedTags] = useState(true);
  const [currencies, setCurrencies] = useState<any[]>([]);
  const [commentText, setCommentText] = useState("");
  const [isSavingComment, setIsSavingComment] = useState(false);
  const moreMenuRef = useRef(null);
  const uploadMenuRef = useRef(null);
  const fileInputRef = useRef(null);

  const normalizeReportingTags = (source: any): Array<{ name: string; value: string }> => {
    const rows = Array.isArray(source)
      ? source
      : Array.isArray(source?.reportingTags)
        ? source.reportingTags
        : Array.isArray(source?.reporting_tags)
          ? source.reporting_tags
          : [];

    return rows
      .map((tag: any) => ({
        name: String(tag?.name || tag?.label || tag?.tagName || tag?.key || "").trim(),
        value: String(tag?.value || tag?.selectedValue || tag?.option || tag?.tagValue || "").trim(),
      }))
      .filter((tag: any) => tag.name && tag.value);
  };

  const loadExpense = async () => {
    setIsLoading(true);
    let hasLocalExpense = false;

    const extractAccountName = (field: any): string => {
      if (!field) return "";
      if (typeof field === "string") return field;
      if (typeof field === "object") {
        return field.accountName || field.name || field.account_name || field.displayName || "";
      }
      return "";
    };

    // Fetch currencies first or concurrently
    try {
      const cursResp = await currenciesAPI.getAll();
      const cursList = Array.isArray(cursResp) ? cursResp : (cursResp?.data || []);
      setCurrencies(cursList);
    } catch (err) {
      console.error('Error fetching currencies:', err);
    }

    // Always fetch sidebar expense list from API so the left panel is populated
    try {
      const listResp: any = await expensesAPI.getAll({ limit: 1000 });
      const apiList = Array.isArray(listResp)
        ? listResp
        : (listResp?.expenses || listResp?.data || []);

      const mappedList = (Array.isArray(apiList) ? apiList : []).map((row: any) => ({
        id: row?.expense_id || row?._id || row?.id,
        expense_id: row?.expense_id,
        _id: row?._id,
        date: row?.date
          ? new Date(row.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
          : "",
        expenseAccount: extractAccountName(row?.account_id) || row?.account_name || row?.account || "",
        amount: row?.total ?? row?.amount ?? row?.sub_total ?? 0,
        currency: row?.currency_code || row?.currency || baseCurrencyCode || "USD",
        status: String(row?.status || "").toUpperCase(),
        receipts: row?.receipts || row?.uploads || [],
      })).filter((row: any) => Boolean(row.id));

      if (mappedList.length > 0) {
        setExpenses(mappedList);
        localStorage.setItem(EXPENSES_KEY, JSON.stringify(mappedList));
      }
    } catch (err) {
      console.error("Error fetching expense list for sidebar:", err);
    }

    // Try localStorage first for faster UX
    try {
      const savedExpenses = getLS(EXPENSES_KEY);
      if (savedExpenses) {
        const parsed = JSON.parse(savedExpenses);
        const expensesList = Array.isArray(parsed) ? parsed : [];
        setExpenses(expensesList);
        const foundExpense = expensesList.find((e) => String(e.id) === String(id));
        if (foundExpense) {
          const normalizedFoundExpense: any = {
            ...foundExpense,
            comments: Array.isArray(foundExpense.comments) ? foundExpense.comments : [],
            reportingTags: normalizeReportingTags(foundExpense),
          };
          hasLocalExpense = true;
          setExpense(normalizedFoundExpense);
          if (normalizedFoundExpense.receipts && normalizedFoundExpense.receipts.length > 0) {
            const fileObjects = normalizedFoundExpense.receipts.map((name, index) => ({
              name,
              size: 0,
              lastModified: Date.now() - (normalizedFoundExpense.receipts.length - index) * 1000,
            }));
            setUploadedFiles(fileObjects);
          }
          // Show cached detail immediately; API fetch below refreshes canonical data.
          setIsLoading(false);
        }
      }
    } catch (err) {
      console.error('Error reading local expenses:', err);
    }

    // If not found locally, fetch from API
    try {
      const resp = await expensesAPI.getById(id);
      // Resp shape may vary; try common fields
      const apiExpense = (resp && (resp.expense || resp.data)) || resp;
      if (apiExpense) {
        let customersList: any[] = [];
        let taxesList: any[] = [];
        try {
          const [customersResult, taxesResult] = await Promise.allSettled([
            customersAPI.getAll({ limit: 1000 }),
            taxesAPI.getAll({ status: "active" }),
          ]);

        if (customersResult.status === "fulfilled") {
          const c: any = customersResult.value;
          customersList = Array.isArray(c) ? c : (c?.data || c?.customers || c?.data?.data || []);
        }
          if (taxesResult.status === "fulfilled") {
            const t: any = taxesResult.value;
            taxesList = Array.isArray(t)
              ? t
              : Array.isArray(t?.data)
                ? t.data
                : Array.isArray(t?.taxes)
                  ? t.taxes
                  : Array.isArray(t?.data?.taxes)
                    ? t.data.taxes
                    : [];
          }
        } catch {
          // optional lookup sources
        }

        try {
          const cachedCustomersRaw = localStorage.getItem("taban_books_customers")
            || localStorage.getItem("taban_customers")
            || localStorage.getItem("customers");
          const cachedCustomers = cachedCustomersRaw ? JSON.parse(cachedCustomersRaw) : [];
          if (Array.isArray(cachedCustomers) && cachedCustomers.length > 0) {
            customersList = [...customersList, ...cachedCustomers];
          }
        } catch {
          // ignore customer cache parse failure
        }

        try {
          const cachedTaxesRaw = localStorage.getItem("taban_books_taxes")
            || localStorage.getItem("taban_settings_taxes_v1");
          const cachedTaxes = cachedTaxesRaw ? JSON.parse(cachedTaxesRaw) : [];
          if (Array.isArray(cachedTaxes) && cachedTaxes.length > 0) {
            taxesList = [...taxesList, ...cachedTaxes];
          }
        } catch {
          // ignore tax cache parse failure
        }

        // Helper function to extract vendor/customer name
        const extractEntityName = (field: any): string => {
          if (!field) return '';
          if (typeof field === 'string') return field;
          if (typeof field === 'object') {
            return field.displayName || field.name || '';
          }
          return '';
        };

        const parseRateFromLabel = (text: string) => {
          const match = String(text || "").match(/(\d+(?:\.\d+)?)\s*%/);
          return match ? Number(match[1]) : 0;
        };

        const resolveCustomerName = () => {
          const direct =
            extractEntityName(apiExpense.customer_id) ||
            extractEntityName(apiExpense.customer) ||
            apiExpense.customer_name ||
            apiExpense.customerName ||
            "";
          if (!direct) return "";
          // if direct looks like an ID/code, resolve from customers list
          const normalized = String(direct).trim();
          const byId = customersList.find((c: any) =>
            String(c?._id || c?.id || c?.customer_id || c?.customerId || "").trim() === normalized
          );
          if (byId) return String(byId?.displayName || byId?.name || byId?.companyName || normalized);
          if (/^cus[-_]/i.test(normalized)) {
            const byNumber = customersList.find((c: any) =>
              String(c?.customerNumber || c?.customer_number || c?.contact_number || "").trim() === normalized
            );
            if (byNumber) return String(byNumber?.displayName || byNumber?.name || byNumber?.companyName || normalized);
          }
          return normalized;
        };

        const resolveTaxDetails = () => {
          const taxObj = typeof apiExpense.tax_id === "object" && apiExpense.tax_id ? apiExpense.tax_id : null;
          const directTaxId = String(
            taxObj?._id || taxObj?.id || taxObj?.tax_id || taxObj?.taxId || apiExpense.tax_id || ""
          ).trim();
          const directTaxName = String(
            taxObj?.name || taxObj?.taxName || taxObj?.tax_name || apiExpense.tax_name || apiExpense.taxName || apiExpense.tax || ""
          ).trim();
          const directRate = Number(
            taxObj?.rate ?? taxObj?.taxPercentage ?? taxObj?.percentage ?? apiExpense.tax_rate ?? apiExpense.taxPercentage ?? 0
          );

          let matchedTax: any = null;
          if (directTaxId) {
            matchedTax = taxesList.find((tax: any) =>
              String(tax?._id || tax?.id || tax?.tax_id || tax?.taxId || "").trim() === directTaxId
            );
          }
          if (!matchedTax && directTaxName) {
            const target = directTaxName.split("[")[0].trim().toLowerCase();
            matchedTax = taxesList.find((tax: any) =>
              String(tax?.name || tax?.taxName || tax?.tax_name || "").trim().toLowerCase() === target
            );
          }

          const resolvedName = String(
            matchedTax?.name || matchedTax?.taxName || matchedTax?.tax_name || directTaxName || ""
          ).trim();
          const rawResolvedRate = matchedTax?.rate ?? matchedTax?.taxPercentage ?? matchedTax?.percentage ?? directRate ?? 0;
          const resolvedRate = Number(rawResolvedRate || 0) || parseRateFromLabel(directTaxName);
          const resolvedId = String(
            matchedTax?._id || matchedTax?.id || matchedTax?.tax_id || matchedTax?.taxId || directTaxId || ""
          ).trim();
          return { resolvedName, resolvedRate, resolvedId };
        };

        const mapped: any = {
          id: apiExpense.expense_id || apiExpense._id || apiExpense.id || id,
          _id: apiExpense._id || undefined,
          expense_id: apiExpense.expense_id || undefined,
          date: apiExpense.date ? new Date(apiExpense.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : (apiExpense.dateString || ''),
          expenseAccount: extractAccountName(apiExpense.account_id) || apiExpense.account_name || apiExpense.account || '',
          amount: apiExpense.total || apiExpense.amount || 0,
          currency: baseCurrencyCode || apiExpense.currency_code || apiExpense.currency || '',
          currencySymbol: (apiExpense.currency && apiExpense.currency.symbol) || undefined,
          paidThrough: extractAccountName(apiExpense.paid_through_account_id) || apiExpense.paid_through_account_name || apiExpense.paidThrough || '',
          vendor: extractEntityName(apiExpense.vendor_id) || apiExpense.vendor_name || apiExpense.vendorName || '',
          reference: apiExpense.reference_number || apiExpense.reference || '',
          customerName: resolveCustomerName(),
          status: (apiExpense.status || '').toUpperCase(),
          notes: apiExpense.description || apiExpense.notes || '',
          receipts: apiExpense.receipts || apiExpense.uploads || [],
          comments: Array.isArray(apiExpense.comments) ? apiExpense.comments : [],
          reportingTags: normalizeReportingTags(apiExpense),
          // Store IDs separately for reference (with null checks)
          account_id: (apiExpense.account_id && typeof apiExpense.account_id === 'object') ? apiExpense.account_id._id : apiExpense.account_id,
          paid_through_account_id: (apiExpense.paid_through_account_id && typeof apiExpense.paid_through_account_id === 'object') ? apiExpense.paid_through_account_id._id : apiExpense.paid_through_account_id,
          vendor_id: (apiExpense.vendor_id && typeof apiExpense.vendor_id === 'object') ? apiExpense.vendor_id._id : apiExpense.vendor_id,
          customer_id: (apiExpense.customer_id && typeof apiExpense.customer_id === 'object') ? apiExpense.customer_id._id : apiExpense.customer_id,
          is_itemized_expense: apiExpense.is_itemized_expense || false,
          line_items: apiExpense.line_items || [],
          raw_date: apiExpense.date,
          is_inclusive_tax: apiExpense.is_inclusive_tax,
          is_billable: apiExpense.is_billable,
        };
        const { resolvedName, resolvedRate, resolvedId } = resolveTaxDetails();
        const amountNum = Number(mapped.amount || 0);
        let computedTaxAmount = Number(apiExpense.tax_amount ?? apiExpense.taxAmount);
        if (!Number.isFinite(computedTaxAmount)) {
          if (resolvedRate > 0) {
            computedTaxAmount = mapped.is_inclusive_tax === false
              ? (amountNum * resolvedRate) / 100
              : (amountNum * resolvedRate) / (100 + resolvedRate);
          } else {
            computedTaxAmount = 0;
          }
        }
        mapped.tax = resolvedId || "";
        mapped.tax_name = resolvedName
          ? (resolvedRate > 0 ? `${resolvedName} [ ${resolvedRate}% ]` : resolvedName)
          : "";
        mapped.tax_rate = resolvedRate || 0;
        mapped.tax_amount = Number.isFinite(computedTaxAmount) ? computedTaxAmount : 0;
        // Try to resolve account names using Chart of Accounts
        try {
          const accountsResp: any = await chartOfAccountsAPI.getAccounts({ limit: 1000 });
          const accountsList = Array.isArray(accountsResp) ? accountsResp : (accountsResp?.data || []);

          const findAccountName = (acctCandidate: any): string | null => {
            if (!acctCandidate) return null;

            // If it's already a populated object, extract the name directly
            if (typeof acctCandidate === 'object' && acctCandidate !== null) {
              return acctCandidate.accountName || acctCandidate.name || acctCandidate.account_name || acctCandidate.displayName || null;
            }

            // If it's a string, try to find it by ID or name
            const byId = accountsList.find((a: any) => String(a._id || a.id) === String(acctCandidate));
            if (byId) return byId.accountName || byId.name || byId.account_name || byId.displayName;
            const byName = accountsList.find((a: any) => (a.accountName || a.name || a.account_name || a.displayName) === acctCandidate);
            if (byName) return byName.accountName || byName.name || byName.account_name || byName.displayName;

            // If it's a string and not found, return the string itself
            if (typeof acctCandidate === 'string') return acctCandidate;

            return null;
          };

          // Resolve expense account - try the populated object first, then fall back to name fields
          const expenseAcctCandidate = apiExpense.account_id || apiExpense.account_name || apiExpense.account || apiExpense.expenseAccount || apiExpense.accountId;
          const resolvedExpenseAcct = findAccountName(expenseAcctCandidate) || '';
          mapped.expenseAccount = resolvedExpenseAcct;

          // Resolve paid through account
          const paidThroughCandidate = apiExpense.paid_through_account_id || apiExpense.paid_through_account_name || apiExpense.paidThrough || apiExpense.paid_through_account;
          const resolvedPaidThrough = findAccountName(paidThroughCandidate) || '';
          mapped.paidThrough = resolvedPaidThrough;
        } catch (acctErr) {
          // If account resolution fails, keep whatever values exist
          console.error('Error resolving accounts for expense:', acctErr);
        }

        setExpense(mapped);
        if (mapped.receipts && mapped.receipts.length > 0) {
          const fileObjects = mapped.receipts.map((name: string, index: number) => ({
            name,
            size: 0,
            lastModified: Date.now() - (mapped.receipts.length - index) * 1000,
          }));
          setUploadedFiles(fileObjects);
        }
      } else {
        if (!hasLocalExpense) {
          setExpense(null);
        }
      }
    } catch (err) {
      console.error('Error fetching expense from API:', err);
      if (!hasLocalExpense) {
        setExpense(null);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadExpense();
    // Initialize selected expenses with current expense
    setSelectedExpenses([id]);

    // Listen for updates
    const handleExpensesUpdate = () => {
      loadExpense();
    };

    window.addEventListener("expensesUpdated", handleExpensesUpdate);
    window.addEventListener("storage", handleExpensesUpdate);
    window.addEventListener("focus", handleExpensesUpdate);

    return () => {
      window.removeEventListener("expensesUpdated", handleExpensesUpdate);
      window.removeEventListener("storage", handleExpensesUpdate);
      window.removeEventListener("focus", handleExpensesUpdate);
    };
  }, [id, baseCurrencyCode]);

  // Handle Esc key to clear selection
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape" && selectedExpenses.length > 0) {
        setSelectedExpenses([]);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectedExpenses.length]);

  const exportSubmenuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target)) {
        setMoreMenuOpen(false);
        setExportSubmenuOpen(false);
      }
      if (uploadMenuRef.current && !uploadMenuRef.current.contains(event.target)) {
        setUploadMenuOpen(false);
      }
      if (exportSubmenuRef.current && !exportSubmenuRef.current.contains(event.target)) {
        setExportSubmenuOpen(false);
      }
    };

    if (moreMenuOpen || uploadMenuOpen || exportSubmenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [moreMenuOpen, uploadMenuOpen, exportSubmenuOpen]);

  const handleDragEnter = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      // Validate file size (10MB max)
      const validFiles = files.filter(file => file.size <= 10 * 1024 * 1024);
      if (validFiles.length !== files.length) {
        alert("Some files exceed the 10MB limit and were not uploaded.");
      }
      if (validFiles.length > 0) {
        setUploadedFiles(prev => {
          const newFiles = [...prev, ...validFiles];
          // Set current file index to the first newly uploaded file
          setCurrentFileIndex(prev.length);
          return newFiles;
        });
        // Update expense with uploaded files
        const updatedExpense = { ...expense, receipts: [...(expense.receipts || []), ...validFiles.map(f => f.name)] };
        setExpense(updatedExpense);
        // Save to localStorage
        const updatedExpenses = expenses.map(e => e.id === id ? updatedExpense : e);
        localStorage.setItem(EXPENSES_KEY, JSON.stringify(updatedExpenses));
      }
    }
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      // Validate file size (10MB max)
      const validFiles = files.filter(file => file.size <= 10 * 1024 * 1024);
      if (validFiles.length !== files.length) {
        alert("Some files exceed the 10MB limit and were not uploaded.");
      }
      if (validFiles.length > 0) {
        setUploadedFiles(prev => {
          const newFiles = [...prev, ...validFiles];
          // Set current file index to the first newly uploaded file
          setCurrentFileIndex(prev.length);
          return newFiles;
        });
        // Update expense with uploaded files
        const updatedExpense = { ...expense, receipts: [...(expense.receipts || []), ...validFiles.map(f => f.name)] };
        setExpense(updatedExpense);
        // Save to localStorage
        const updatedExpenses = expenses.map(e => e.id === id ? updatedExpense : e);
        localStorage.setItem(EXPENSES_KEY, JSON.stringify(updatedExpenses));
      }
    }
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleDeleteFile = (index) => {
    const updatedFiles = uploadedFiles.filter((_, i) => i !== index);
    setUploadedFiles(updatedFiles);
    // Update expense with remaining files
    const updatedExpense = {
      ...expense,
      receipts: updatedFiles.map(f => f.name)
    };
    setExpense(updatedExpense);
    // Save to localStorage
    const updatedExpenses = expenses.map(e => e.id === id ? updatedExpense : e);
    localStorage.setItem(EXPENSES_KEY, JSON.stringify(updatedExpenses));
    // Adjust current file index if needed
    if (currentFileIndex >= updatedFiles.length && updatedFiles.length > 0) {
      setCurrentFileIndex(updatedFiles.length - 1);
    } else if (updatedFiles.length === 0) {
      setCurrentFileIndex(0);
    }
  };

  const [currentFileIndex, setCurrentFileIndex] = useState(0);

  // Update current file index when files are added
  useEffect(() => {
    if (uploadedFiles.length > 0 && currentFileIndex === 0 && uploadedFiles.length > 1) {
      // Keep current index, but ensure it's valid
      if (currentFileIndex >= uploadedFiles.length) {
        setCurrentFileIndex(uploadedFiles.length - 1);
      }
    }
  }, [uploadedFiles.length]);

  const handleEdit = async () => {
    if (!expense) return;

    try {
      const expenseIdCandidates = getExpenseIdCandidates(expense);
      let sourceExpense: any = null;

      for (const candidateId of expenseIdCandidates) {
        try {
          const response = await expensesAPI.getById(candidateId);
          const fetched = response?.expense || response?.data || response;
          if (fetched) {
            sourceExpense = fetched;
            break;
          }
        } catch {
          // try next candidate
        }
      }

      const src = sourceExpense || expense;
      const isObjectId = (value: any) => /^[a-f\d]{24}$/i.test(String(value || "").trim());
      const getTaxId = (value: any) => {
        if (!value) return "";
        if (typeof value === "string") return value;
        if (typeof value === "object") return String(value._id || value.id || value.tax_id || value.taxId || "");
        return "";
      };

      let resolvedTaxId = "";
      const taxCandidate = src?.tax_id ?? src?.tax ?? expense?.tax;
      const directTaxId = getTaxId(taxCandidate);
      if (isObjectId(directTaxId)) {
        resolvedTaxId = directTaxId;
      } else {
        const taxNameCandidateRaw =
          src?.tax_name ||
          src?.taxName ||
          (typeof taxCandidate === "string" ? taxCandidate : "") ||
          expense?.tax_name ||
          "";
        const taxNameCandidate = String(taxNameCandidateRaw).split("[")[0].trim().toLowerCase();

        if (taxNameCandidate) {
          try {
            const taxesResponse: any = await taxesAPI.getAll({ status: "active" });
            const taxListRaw = Array.isArray(taxesResponse)
              ? taxesResponse
              : Array.isArray(taxesResponse?.data)
                ? taxesResponse.data
                : Array.isArray(taxesResponse?.taxes)
                  ? taxesResponse.taxes
                  : Array.isArray(taxesResponse?.data?.taxes)
                    ? taxesResponse.data.taxes
                    : [];

            const matchedTax = taxListRaw.find((tax: any) => {
              const name = String(tax?.name || tax?.taxName || tax?.tax_name || "").trim().toLowerCase();
              return name === taxNameCandidate;
            });
            if (matchedTax) {
              resolvedTaxId = String(matchedTax?._id || matchedTax?.id || matchedTax?.tax_id || matchedTax?.taxId || "");
            }
          } catch (taxError) {
            console.error("Failed to load taxes while preparing edit state:", taxError);
          }
        }
      }

      const editExpense = {
        ...src,
        id: src?.expense_id || src?._id || src?.id || expense?.id,
        _id: src?._id || expense?._id,
        expense_id: src?.expense_id || expense?.expense_id,
        raw_date: src?.date || expense?.raw_date || "",
        date: src?.date
          ? new Date(src.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
          : (expense?.date || ""),
        location: src?.location_name || src?.location || expense?.location || "Head Office",
        expenseAccount:
          src?.account_name ||
          (typeof src?.account_id === "object" ? (src?.account_id?.accountName || src?.account_id?.name) : "") ||
          expense?.expenseAccount ||
          "",
        amount: src?.total ?? src?.amount ?? expense?.amount ?? 0,
        currency: src?.currency_code || src?.currency || expense?.currency || baseCurrencyCode || "USD",
        is_inclusive_tax: src?.is_inclusive_tax ?? expense?.is_inclusive_tax ?? true,
        paidThrough:
          src?.paid_through_account_name ||
          (typeof src?.paid_through_account_id === "object" ? (src?.paid_through_account_id?.accountName || src?.paid_through_account_id?.name) : "") ||
          expense?.paidThrough ||
          "",
        tax: resolvedTaxId || "",
        tax_name: src?.tax_name || src?.taxName || (typeof taxCandidate === "string" ? taxCandidate : "") || expense?.tax_name || "",
        vendor:
          src?.vendor_name ||
          (typeof src?.vendor_id === "object" ? (src?.vendor_id?.displayName || src?.vendor_id?.name) : "") ||
          expense?.vendor ||
          "",
        vendor_id: toEntityId(src?.vendor_id) || expense?.vendor_id || "",
        reference: src?.reference_number || src?.reference || expense?.reference || "",
        notes: src?.description || src?.notes || expense?.notes || "",
        customerName:
          src?.customer_name ||
          (typeof src?.customer_id === "object" ? (src?.customer_id?.displayName || src?.customer_id?.name) : "") ||
          expense?.customerName ||
          "",
        customer_id: toEntityId(src?.customer_id) || expense?.customer_id || "",
        projectName:
          src?.project_name ||
          (typeof src?.project_id === "object" ? (src?.project_id?.name || src?.project_id?.projectName) : "") ||
          expense?.projectName ||
          "",
        project_id: toEntityId(src?.project_id) || expense?.project_id || "",
        is_billable: Boolean(src?.is_billable ?? expense?.is_billable),
        markupBy: src?.markupBy ?? src?.markup_by ?? expense?.markupBy ?? 1,
        markupType: src?.markupType ?? src?.markup_type ?? expense?.markupType ?? "%",
        reportingTags: Array.isArray(src?.reportingTags) ? src.reportingTags : (Array.isArray(expense?.reportingTags) ? expense.reportingTags : []),
        is_itemized_expense: Boolean(src?.is_itemized_expense ?? expense?.is_itemized_expense),
        line_items: Array.isArray(src?.line_items) ? src.line_items : (Array.isArray(expense?.line_items) ? expense.line_items : []),
        receipts: Array.isArray(src?.receipts) ? src.receipts : (Array.isArray(expense?.receipts) ? expense.receipts : []),
        comments: Array.isArray(src?.comments) ? src.comments : (Array.isArray(expense?.comments) ? expense.comments : []),
      };

      navigate("/expenses/new", { state: { editExpense, isEdit: true } });
    } catch (error) {
      console.error("Failed to load full expense for edit:", error);
      navigate("/expenses/new", { state: { editExpense: expense, isEdit: true } });
    }
  };

  const handleMakeRecurring = () => {
    if (!expense) return;

    // Navigate to create recurring expense with current expense data
    navigate("/expenses/recurring-expenses/new", {
      state: {
        fromExpense: expense,
        expenseAccount: expense.expenseAccount,
        amount: expense.amount,
        currency: expense.currency,
        vendor: expense.vendor,
        paidThrough: expense.paidThrough,
      }
    });
  };

  const handleConvertToInvoice = () => {
    if (!expense) return;

    const hasCustomer = Boolean(expense.customer_id || expense.customerName);
    const statusValue = String(expense.status || "").toLowerCase();
    const isBillable = Boolean(expense.is_billable) || statusValue === "billable" || statusValue === "unbilled";

    if (!hasCustomer || !isBillable) {
      alert("This expense must be billable and linked to a customer before you can convert it to an invoice.");
      return;
    }

    navigate("/sales/invoices/new", {
      state: {
        customerId: expense.customer_id || "",
        customerName: expense.customerName || "",
        fromExpenseId: expense.expense_id || expense.id || id || "",
        fromExpense: expense,
      },
    });
  };

  const getCurrentUserLabel = () => {
    try {
      const storedUser = localStorage.getItem("user");
      const parsedUser = storedUser ? JSON.parse(storedUser) : null;
      const fullName = String(parsedUser?.name || "").trim();
      if (fullName) return fullName;
      const emailName = String(parsedUser?.email || "").trim();
      if (emailName) return emailName;
    } catch (error) {
      console.error("Failed to parse current user:", error);
    }
    return "User";
  };

  const formatCommentDate = (value: any) => {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "";
    return parsed.toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const handleAddComment = async () => {
    const content = String(commentText || "").trim();
    if (!content || !expense) return;

    const expenseId = String(expense.expense_id || expense.id || id || "").trim();
    if (!expenseId) {
      alert("Unable to save comment because this expense has no ID.");
      return;
    }

    const newComment = {
      id: `comment-${Date.now()}`,
      text: content,
      author: getCurrentUserLabel(),
      createdAt: new Date().toISOString(),
    };

    const previousExpense = expense;
    const previousText = commentText;
    const previousComments = Array.isArray(expense.comments) ? expense.comments : [];
    const nextComments = [...previousComments, newComment];

    setIsSavingComment(true);
    setCommentText("");
    setExpense({ ...expense, comments: nextComments });

    try {
      const response = await expensesAPI.update(expenseId, { comments: nextComments });
      const persistedExpense = response?.expense || response?.data;
      const persistedComments = Array.isArray(persistedExpense?.comments)
        ? persistedExpense.comments
        : nextComments;

      setExpense((prev: any) => {
        if (!prev) return prev;
        return { ...prev, comments: persistedComments };
      });

      setExpenses((prev: any[]) => {
        const updated = (Array.isArray(prev) ? prev : []).map((item: any) => {
          const itemId = String(item?.id || item?.expense_id || item?._id || "");
          if (itemId !== expenseId) return item;
          return { ...item, comments: persistedComments };
        });
        localStorage.setItem(EXPENSES_KEY, JSON.stringify(updated));
        return updated;
      });

      window.dispatchEvent(new Event("expensesUpdated"));
      window.dispatchEvent(new Event("storage"));
    } catch (error: any) {
      console.error("Failed to save comment:", error);
      setExpense(previousExpense);
      setCommentText(previousText);
      alert(error?.message || "Failed to save comment.");
    } finally {
      setIsSavingComment(false);
    }
  };

  const handleDelete = () => {
    const deleteExpense = async () => {
      if (!window.confirm("Are you sure you want to delete this expense?")) {
        return;
      }

      try {
        const expenseIdCandidates = getExpenseIdCandidates(expense);
        let deleted = false;
        let lastError: any = null;

        for (const candidateId of expenseIdCandidates) {
          try {
            const deleteResponse = await expensesAPI.delete(candidateId);
            const success =
              deleteResponse === null ||
              deleteResponse?.success ||
              deleteResponse?.code === 0;

            if (success || typeof deleteResponse === "object") {
              deleted = true;
              break;
            }
          } catch (deleteError: any) {
            lastError = deleteError;
          }
        }

        if (!deleted) {
          throw lastError || new Error("Failed to delete expense.");
        }

        const idSet = new Set(expenseIdCandidates);
        const updatedExpenses = expenses.filter((item: any) => {
          const rowIds = [
            item?._id,
            item?.expense_id,
            item?.id,
          ]
            .map((value) => String(value || "").trim())
            .filter(Boolean);
          return !rowIds.some((rowId) => idSet.has(rowId));
        });
        setExpenses(updatedExpenses);
        localStorage.setItem(EXPENSES_KEY, JSON.stringify(updatedExpenses));
        window.dispatchEvent(new Event("expensesUpdated"));
        window.dispatchEvent(new Event("storage"));
        navigate("/expenses");
      } catch (error: any) {
        console.error("Failed to delete expense:", error);
        alert(error?.message || "Failed to delete expense.");
      }
    };

    deleteExpense();
    setMoreMenuOpen(false);
  };

  const toEntityId = (value: any): string => {
    if (!value) return "";
    if (typeof value === "string" || typeof value === "number") return String(value);
    if (typeof value === "object") return String(value._id || value.id || "");
    return "";
  };

  const toFiniteNumber = (value: any, fallback = 0) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  };

  const toISODate = (value: any) => {
    if (!value) return new Date().toISOString().split("T")[0];
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return new Date().toISOString().split("T")[0];
    return parsed.toISOString().split("T")[0];
  };

  const getExpenseIdCandidates = (record: any): string[] => {
    const values = [
      record?._id,
      record?.expense_id,
      record?.id,
      id,
    ]
      .map((value) => String(value || "").trim())
      .filter(Boolean);
    return Array.from(new Set(values));
  };

  const handleClone = async () => {
    setMoreMenuOpen(false);
    if (!expense) return;

    try {
      const sourceIdCandidates = getExpenseIdCandidates(expense);
      if (!sourceIdCandidates.length) {
        alert("Cannot clone this expense because it has no ID.");
        return;
      }

      let sourceExpense: any = null;
      for (const candidateId of sourceIdCandidates) {
        try {
          const sourceResponse = await expensesAPI.getById(candidateId);
          const fetched = sourceResponse?.expense || sourceResponse?.data || sourceResponse;
          if (fetched) {
            sourceExpense = fetched;
            break;
          }
        } catch {
          // Try next candidate ID
        }
      }

      if (!sourceExpense) {
        throw new Error("Could not load expense details for cloning.");
      }

      const accountId = toEntityId(sourceExpense.account_id) || toEntityId(expense.account_id);
      const paidThroughAccountId = toEntityId(sourceExpense.paid_through_account_id) || toEntityId(expense.paid_through_account_id);
      const accountName = sourceExpense.account_name || expense.expenseAccount || "";
      const paidThroughName = sourceExpense.paid_through_account_name || expense.paidThrough || "";

      if (!accountId && !accountName) {
        throw new Error("Cannot clone this expense because its expense account is missing.");
      }
      if (!paidThroughAccountId && !paidThroughName) {
        throw new Error("Cannot clone this expense because its paid through account is missing.");
      }

      const amount = toFiniteNumber(sourceExpense.amount ?? sourceExpense.total ?? expense.amount, 0);
      if (amount <= 0) {
        throw new Error("Cannot clone this expense because its amount is invalid.");
      }

      const vendorId = toEntityId(sourceExpense.vendor_id) || toEntityId(expense.vendor_id);
      const customerId = toEntityId(sourceExpense.customer_id) || toEntityId(expense.customer_id);

      const clonePayload: any = {
        date: toISODate(sourceExpense.date || expense.raw_date || new Date().toISOString()),
        account_name: accountName,
        account_id: accountId || undefined,
        amount,
        paid_through_account_name: paidThroughName,
        paid_through_account_id: paidThroughAccountId || undefined,
        reference_number: "",
        description: sourceExpense.description || sourceExpense.notes || expense.notes || "",
        currency_code: sourceExpense.currency_code || sourceExpense.currency || expense.currency || baseCurrencyCode || "USD",
        is_inclusive_tax: sourceExpense.is_inclusive_tax ?? expense.is_inclusive_tax ?? true,
      };

      const taxId = toEntityId(sourceExpense.tax_id);
      if (taxId) {
        clonePayload.tax_id = taxId;
      }

      if (vendorId) {
        clonePayload.vendor_id = vendorId;
      }
      if (customerId) {
        clonePayload.customer_id = customerId;
      }

      clonePayload.is_billable = Boolean(sourceExpense.is_billable ?? expense.is_billable);
      clonePayload.status = clonePayload.is_billable && clonePayload.customer_id ? "unbilled" : "non-billable";

      const sourceLineItems = Array.isArray(sourceExpense.line_items)
        ? sourceExpense.line_items
        : (Array.isArray(expense.line_items) ? expense.line_items : []);

      if ((sourceExpense.is_itemized_expense || expense.is_itemized_expense) && sourceLineItems.length > 0) {
        const clonedLineItems = sourceLineItems
          .map((line: any, index: number) => {
            const lineAccountId = toEntityId(line?.account_id) || accountId;
            const lineAmount = toFiniteNumber(line?.amount, 0);
            if (!lineAccountId || lineAmount <= 0) return null;

            return {
              account_id: lineAccountId,
              account_name: line?.account_name || accountName,
              description: line?.description || "",
              amount: lineAmount,
              item_order: line?.item_order || index + 1,
            };
          })
          .filter(Boolean);

        if (clonedLineItems.length > 0) {
          clonePayload.is_itemized_expense = true;
          clonePayload.line_items = clonedLineItems;
        }
      }

      const cloneResponse = await expensesAPI.create(clonePayload);
      if (!cloneResponse || (!cloneResponse.success && cloneResponse.code !== 0)) {
        throw new Error(cloneResponse?.message || "Failed to clone expense.");
      }

      const clonedExpenseId =
        cloneResponse?.data?.expense_id
        || cloneResponse?.expense?.expense_id
        || cloneResponse?.data?._id
        || cloneResponse?.data?.id
        || cloneResponse?.expense?._id
        || cloneResponse?.expense?.id;

      window.dispatchEvent(new Event("expensesUpdated"));

      if (clonedExpenseId) {
        navigate(`/expenses/${clonedExpenseId}`);
        return;
      }

      alert("Expense cloned successfully, but it could not be opened automatically.");
    } catch (error: any) {
      console.error("Error cloning expense:", error);
      alert(error?.message || "Failed to clone expense.");
    }
  };

  const handleExport = () => {
    if (!expense) return;

    const pdf = new jsPDF("p", "mm", "a4");
    let y = 16;
    const lineHeight = 7;
    const labelWidth = 45;

    const addField = (label: string, value: any) => {
      const safeValue = String(value || "-");
      const split = pdf.splitTextToSize(safeValue, 130);
      pdf.setFont("helvetica", "bold");
      pdf.text(`${label}:`, 14, y);
      pdf.setFont("helvetica", "normal");
      pdf.text(split, 14 + labelWidth, y);
      y += Math.max(lineHeight, split.length * 6);
      if (y > 275) {
        pdf.addPage();
        y = 16;
      }
    };

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(16);
    pdf.text("Expense Details", 14, y);
    y += 10;
    pdf.setFontSize(11);

    addField("Reference#", expense.reference || expense.id);
    addField("Date", expense.date);
    addField("Expense Account", expense.expenseAccount);
    addField("Paid Through", expense.paidThrough);
    addField("Vendor", expense.vendor);
    addField("Customer", expense.customerName);
    addField("Status", expense.status);
    addField("Currency", expense.currency || baseCurrencyCode || "USD");
    addField("Amount", `${Number.parseFloat(String(expense.amount || 0)).toFixed(2)}`);
    addField("Notes", expense.notes);

    pdf.save(`expense-${expense.id}.pdf`);
    setMoreMenuOpen(false);
  };

  const handleChat = () => {
    setShowHistory(!showHistory);
  };

  if (!isLoading && expense === null) {
    return (
      <div style={{ padding: "24px", minHeight: "100vh", backgroundColor: "#ffffff", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <p style={{ fontSize: "16px", color: "#6b7280", marginBottom: "16px" }}>Expense not found</p>
        <button
          onClick={() => navigate("/expenses")}
          style={{
            padding: "8px 16px",
            fontSize: "14px",
            backgroundColor: "#156372",
            color: "#ffffff",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
          }}
        >
          Back to Expenses
        </button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div style={{ padding: "24px", minHeight: "100vh", backgroundColor: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ fontSize: "16px", color: "#6b7280" }}>Loading...</p>
      </div>
    );
  }

  const getCurrencySymbol = () => {
    if (baseCurrencySymbol) return baseCurrencySymbol;
    const code = baseCurrencyCode || "";
    if (!code) return "";
    const match = currencies.find(c => c.code === code);
    return match ? match.symbol : code;
  };

  // Calculate journal entries
  // const debitAmount = parseFloat(expense.amount || 0);
  // const creditAmount = parseFloat(expense.amount || 0);

  // Journal entries are now handled with Tailwind classes
  const debitAmount = parseFloat(expense.amount || 0);
  const creditAmount = parseFloat(expense.amount || 0);

  const sidebarScrollHide = `
    .sidebar-list::-webkit-scrollbar {
        display: none;
    }
    .sidebar-list {
        -ms-overflow-style: none;
        scrollbar-width: none;
    }
  `;

  if (isLoading || !expense) {
    return (
      <div className="flex items-center justify-center h-screen">
        Loading...
      </div>
    );
  }

  const locationName = expense?.location || expense?.location_name || "Head Office";
  const amountValue = parseFloat(expense.amount || 0).toFixed(2);
  const taxName = expense?.tax_name || expense?.tax || "No tax";
  const taxRateValue = Number(expense?.tax_rate ?? 0);
  const amountNumber = Number(expense?.amount ?? 0);
  const fallbackTaxAmount = taxRateValue > 0
    ? (expense?.is_inclusive_tax === false
      ? (amountNumber * taxRateValue) / 100
      : (amountNumber * taxRateValue) / (100 + taxRateValue))
    : 0;
  const taxAmountValue = Number(
    Number.isFinite(Number(expense?.tax_amount))
      ? Number(expense?.tax_amount)
      : fallbackTaxAmount
  ).toFixed(2);
  const taxModeLabel = expense?.is_inclusive_tax === false ? "Exclusive" : "Inclusive";
  const projectName = expense?.project_name || expense?.project || "-";
  const expenseCreatedAtLabel =
    formatCommentDate(expense?.raw_date || expense?.created_time || expense?.createdAt)
    || formatCommentDate(new Date().toISOString());

  return (
    <div className="relative flex h-screen w-full overflow-hidden bg-white">
      <style>{sidebarScrollHide}</style>

      {/* Left Sidebar */}
      <div className="flex h-full w-[360px] flex-shrink-0 flex-col border-r border-gray-200 bg-white">
        <div className="flex items-center justify-between border-b border-gray-200 p-2">
          <div className="flex cursor-pointer items-center gap-1 rounded-md bg-[#f1f3f8] px-3 py-2" onClick={() => navigate("/expenses")}>
            <span className="text-lg font-semibold text-gray-800">All Expenses</span>
            <ChevronDown size={16} className="text-[#35518a]" />
          </div>
          <div className="flex items-center gap-2">
            <button
              className="flex h-8 w-8 items-center justify-center rounded-md border border-[#23b26b] bg-[#23b26b] text-white"
              onClick={() => navigate("/expenses/new")}
            >
              <Plus size={16} />
            </button>
            <button className="flex h-8 w-8 items-center justify-center rounded-md border border-gray-300 bg-[#f5f6fa] text-gray-700">
              <MoreVertical size={16} />
            </button>
          </div>
        </div>
        <div className="sidebar-list flex-1 overflow-y-auto">
          {expenses.map((exp) => (
            <div
              key={exp.id}
              className={`relative flex cursor-pointer items-start gap-3 border-b border-gray-100 px-4 py-3 ${String(exp.id) === String(id) ? "bg-[#f2f4fa]" : "bg-white"}`}
              onClick={() => navigate(`/expenses/${exp.id}`)}
            >
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 cursor-pointer"
                checked={selectedExpenses.includes(String(exp.id))}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedExpenses([...selectedExpenses, String(exp.id)]);
                  } else {
                    setSelectedExpenses(selectedExpenses.filter(id => id !== String(exp.id)));
                  }
                }}
                onClick={(e) => e.stopPropagation()}
              />
              <div className="flex-1">
                <div className="mb-1 flex items-start justify-between gap-2">
                  <div className="text-[13px] text-gray-900">{exp.expenseAccount || "No Account"}</div>
                  <div className="text-[13px] font-medium text-[#1f2a44]">{(exp.currency || baseCurrencyCode || "AMD")} {parseFloat(exp.amount || 0).toFixed(2)}</div>
                </div>
                <div className="text-[13px] text-[#4b5c7d]">{exp.date}</div>
                <div className="mt-2 flex items-center justify-between">
                  <div className="text-[12px] uppercase tracking-[0.3px] text-[#8190aa]">{(exp.status || "UNBILLED").toUpperCase()}</div>
                  {exp.receipts && exp.receipts.length > 0 && <Paperclip size={13} className="text-gray-400" />}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Area */}
      <div className="flex flex-1 flex-col overflow-hidden bg-white">
        <div className="flex flex-col border-b border-gray-200 flex-shrink-0">
          {/* Top Row */}
          <div className="flex items-center justify-between px-5 py-3">
            <div>
              <div className="text-[13px] text-[#4b5c7d]">Location: {locationName}</div>
              <h1 className="m-0 text-3xl font-semibold text-gray-900">Expense Details</h1>
            </div>
            <div className="flex items-center gap-3">
              <button className="flex h-8 w-8 items-center justify-center rounded-md border border-gray-300 bg-[#f5f6fa] text-gray-700" onClick={handleChat}>
                <MessageCircle size={18} />
              </button>
              <button className="text-red-500" onClick={() => navigate("/expenses")}>
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Toolbar */}
          <div className="flex items-center border-t border-gray-200 bg-[#f5f6fa] px-2 py-1">
            <button className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] text-gray-700 bg-transparent border-none cursor-pointer font-medium" onClick={handleEdit}>
              <Edit size={14} />
              Edit
            </button>
            <div className="w-px h-4 bg-gray-200 mx-0.5" />
            <button className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] text-gray-700 bg-transparent border-none cursor-pointer font-medium" onClick={handleConvertToInvoice}>
              <RotateCw size={14} />
              Convert to Invoice
            </button>
            <div className="w-px h-4 bg-gray-200 mx-0.5" />
            <button className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] text-gray-700 bg-transparent border-none cursor-pointer font-medium" onClick={handleMakeRecurring}>
              <RotateCw size={14} />
              Make Recurring
            </button>
            <div className="w-px h-4 bg-gray-200 mx-0.5" />
            <button className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] text-gray-700 bg-transparent border-none cursor-pointer font-medium" onClick={handleExport}>
              <FileText size={14} />
              Print
            </button>
            <div className="w-px h-4 bg-gray-200 mx-0.5" />
            <button
              className={`flex items-center gap-1.5 px-3 py-1.5 text-[13px] bg-transparent border-none cursor-pointer font-medium ${showHistory ? "text-[#156372]" : "text-gray-700"}`}
              onClick={() => setShowHistory(!showHistory)}
            >
              <History size={14} />
            </button>
            <div className="relative" ref={moreMenuRef}>
              <button className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] text-gray-700 bg-transparent border-none cursor-pointer font-medium" onClick={() => setMoreMenuOpen(!moreMenuOpen)}>
                <MoreVertical size={16} />
              </button>
              {moreMenuOpen && (
                <div className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded shadow-md z-[100] min-w-[160px] py-1">
                  <button className="px-4 py-2 text-[13px] text-gray-700 bg-transparent border-none w-full text-left cursor-pointer block" onClick={handleClone}>Clone</button>
                  <button className="px-4 py-2 text-[13px] text-gray-700 bg-transparent border-none w-full text-left cursor-pointer block" onClick={handleDelete}>Delete</button>
                </div>
              )}
            </div>
            <div className="w-px h-4 bg-gray-200 mx-0.5" />
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto">
            <div className="mx-auto w-full max-w-[1280px] p-5">
              <div className="grid grid-cols-[1fr_300px] gap-8">
                {/* Info Section */}
                <div className="flex flex-col gap-5">
                  <div>
                    <div className="mb-1 text-base text-[#596a8b]">Expense Amount</div>
                    <div className="flex items-baseline">
                      <span className="text-[37px] font-medium text-[#ff4e4e]">{(expense.currency || baseCurrencyCode || "AMD")}{amountValue}</span>
                      <span className="ml-2 text-[13px] text-[#55607a]">on {expense.date}</span>
                    </div>
                    <div className="mt-1 text-sm uppercase text-[#7f8ba3]">{(expense.status || "UNBILLED").toUpperCase()}</div>
                    <div className="mt-6 inline-flex bg-[#c8e1eb] px-3 py-1 text-[13px] text-[#245a6b]">{expense.expenseAccount}</div>
                  </div>

                  <div className="mt-4">
                    <div className="mb-1 text-base text-[#596a8b]">Tax</div>
                    <div className="text-[14px] text-gray-900">{taxName}</div>
                  </div>

                  <div className="mt-4">
                    <div className="mb-1 text-base text-[#596a8b]">Tax Amount</div>
                    <div className="text-[14px] text-gray-900">{(expense.currency || baseCurrencyCode || "AMD")}{taxAmountValue} ( {taxModeLabel} )</div>
                  </div>

                  <div className="mt-4">
                    <div className="mb-1 text-base text-[#596a8b]">Ref #</div>
                    <div className="text-[14px] text-gray-900">{expense.reference || "-"}</div>
                  </div>

                  <div className="mt-4">
                    <div className="mb-1 text-base text-[#596a8b]">Customer</div>
                    <div className="text-[14px] text-[#2f66d0]">{expense.customerName || "-"}</div>
                  </div>

                  <div className="mt-4">
                    <div className="mb-1 text-base text-[#596a8b]">Project Name</div>
                    <div className="text-[14px] text-[#2f66d0]">{projectName}</div>
                  </div>

                  <div className="mt-4 text-[14px] text-gray-900">{expense.notes || "-"}</div>

                  <div className="mt-8 border-t border-gray-200 pt-5">
                    <button
                      className="flex items-center gap-2 text-xl text-gray-900"
                      onClick={() => setShowAssociatedTags((prev) => !prev)}
                    >
                      {showAssociatedTags ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      Associated Tags
                    </button>
                    {showAssociatedTags && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {(Array.isArray(expense?.reportingTags) ? expense.reportingTags : []).length > 0 ? (
                          (expense.reportingTags as Array<{ name: string; value: string }>).map((tag, index) => (
                            <span
                              key={`assoc-tag-${tag.name}-${tag.value}-${index}`}
                              className="inline-flex items-center gap-1 rounded border border-[#dbe2f2] bg-[#f7f9ff] px-2.5 py-1 text-xs text-[#50638b]"
                            >
                              <span>{tag.name}:</span>
                              <span>{tag.value}</span>
                            </span>
                          ))
                        ) : (
                          <span className="text-sm text-gray-400">No associated tags</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Receipt Section */}
                <div>
                  <div className="overflow-hidden rounded-xl border border-[#d8dce7] bg-white">
                    <div className="relative flex cursor-pointer items-center justify-center gap-2 border-b border-[#d8dce7] px-4 py-3 text-[14px] font-medium text-[#3b4a68]" onClick={() => setUploadMenuOpen(!uploadMenuOpen)} ref={uploadMenuRef}>
                      <UploadIcon size={14} className="text-gray-500" />
                      <span>Upload your Files</span>
                      <ChevronDown size={14} className="text-gray-400" />

                      {uploadMenuOpen && (
                        <div className="absolute top-10 left-4 right-4 bg-white border border-gray-300 rounded shadow-md z-[100] py-1">
                          <button className="w-full px-4 py-2 text-sm text-gray-900 cursor-pointer border-none bg-none text-left" onClick={handleUploadClick}>
                            Attach From Desktop
                          </button>
                        </div>
                      )}
                    </div>
                    <div
                      className="flex min-h-[350px] items-center justify-center bg-white p-6"
                      onDragEnter={handleDragEnter}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                    >
                      {uploadedFiles.length > 0 ? (
                        <div className="w-full h-full flex items-center justify-center">
                          {uploadedFiles[currentFileIndex] && uploadedFiles[currentFileIndex] instanceof File && uploadedFiles[currentFileIndex].type?.startsWith("image/") ? (
                            <img
                              src={URL.createObjectURL(uploadedFiles[currentFileIndex])}
                              alt={uploadedFiles[currentFileIndex].name}
                              className="max-w-full max-h-[300px] object-contain rounded"
                            />
                          ) : (
                            <div className="text-center">
                              <div className="mx-auto mb-3 text-[52px] font-bold text-[#2f8a43]">
                                {String(uploadedFiles[currentFileIndex]?.name || "").split(".").pop()?.toUpperCase() || "FILE"}
                              </div>
                              <div className="max-w-[220px] truncate text-[14px] text-[#596a8b]">{uploadedFiles[currentFileIndex]?.name}</div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-center text-gray-400">
                          <UploadIcon size={48} className="mb-3 mx-auto" />
                          <div className="text-sm">No receipt uploaded</div>
                        </div>
                      )}
                    </div>
                    {uploadedFiles.length > 0 && (
                      <div className="flex items-center justify-between border-t border-dashed border-gray-200 px-4 py-2.5 text-[13px] text-[#596a8b]">
                        <span>{currentFileIndex + 1} of {uploadedFiles.length} Files</span>
                        <button onClick={() => handleDeleteFile(currentFileIndex)} className="border-none bg-transparent text-[#f15b55]">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* History Sidebar */}
          {showHistory && (
            <div className="w-[300px] border-l border-gray-200 bg-white flex flex-col flex-shrink-0">
              <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
                <span className="text-[15px] font-semibold text-gray-900">Comments & History</span>
                <button
                  onClick={() => setShowHistory(false)}
                  className="bg-transparent border border-[#156372] rounded p-0.5 cursor-pointer text-[#156372] flex items-center justify-center"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto py-4">
                <div className="px-5 py-3 flex gap-3 border-l-2 border-transparent">
                  <div className="w-7 h-7 rounded-full bg-white border border-gray-200 flex items-center justify-center flex-shrink-0">
                    <FileText size={14} className="text-amber-400" />
                  </div>
                  <div className="flex flex-col gap-2 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[13px] font-bold text-gray-900">{getCurrentUserLabel()}</span>
                      <span className="text-gray-400">|</span>
                      <span className="text-[11px] text-gray-400 uppercase">{expenseCreatedAtLabel}</span>
                    </div>
                    <div className="px-3.5 py-2.5 bg-gray-50 rounded-md text-[13px] text-gray-700 w-fit max-w-full">
                      Expense Created for {getCurrencySymbol()} {parseFloat(expense.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>

                <div className="px-5 py-1 pt-1 pb-4 border-t border-gray-50">
                  <div className="text-[11px] font-bold tracking-wider text-gray-500 mb-2">
                    COMMENTS
                  </div>
                  <textarea
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Add a comment..."
                    rows={3}
                    className="w-full border border-gray-300 rounded-md px-2.5 py-2 text-[13px] resize-y outline-none"
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        handleAddComment();
                      }
                    }}
                  />
                  <div className="mt-2 flex justify-end">
                    <button
                      onClick={handleAddComment}
                      disabled={isSavingComment || !String(commentText || "").trim()}
                      className={`px-2.5 py-1.5 text-xs font-semibold text-white border-none rounded-md cursor-pointer ${isSavingComment || !String(commentText || "").trim() ? "bg-gray-400 cursor-not-allowed" : "bg-[#156372]"}`}
                    >
                      {isSavingComment ? "Saving..." : "Add Comment"}
                    </button>
                  </div>
                </div>

                <div className="px-5 py-4 pt-0">
                  {(Array.isArray(expense.comments) ? expense.comments : []).length === 0 ? (
                    <div className="text-sm text-gray-400">No comments yet.</div>
                  ) : (
                    [...(Array.isArray(expense.comments) ? expense.comments : [])]
                      .reverse()
                      .map((comment: any, idx: number) => (
                        <div
                          key={String(comment?.id || comment?._id || idx)}
                          className="border border-gray-200 rounded-lg p-2.5 mb-2.5 bg-white"
                        >
                          <div className="text-xs font-semibold text-gray-900 mb-1">
                            {String(comment?.author || "User")}
                          </div>
                          <div className="text-xs text-gray-500 mb-1.5">
                            {formatCommentDate(comment?.createdAt || comment?.date)}
                          </div>
                          <div className="text-[13px] text-gray-800 whitespace-pre-wrap">
                            {String(comment?.text || "")}
                          </div>
                        </div>
                      ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,.pdf"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
}

