// @ts-nocheck
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  X,
  Download as DownloadIcon,
  HelpCircle,
  Search,
  AlertTriangle,
  Info,
  Check,
  ChevronDown,
  Upload,
  FileText,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";
import { parseImportFile } from "../../utils/importFileParser";
import {
  expensesAPI,
  vendorsAPI,
  customersAPI,
  chartOfAccountsAPI,
  bankAccountsAPI,
} from "../../../services/api";

const EXPENSE_MAP_SECTIONS = [
  {
    title: "Expense Details",
    fields: [
      "Expense Date",
      "Expense Account",
      "Amount",
      "Paid Through",
      "Vendor Name",
      "Customer Name",
      "Reference#",
      "Description",
      "Currency Code",
      "Is Billable",
      "Status",
    ],
  },
];

const REQUIRED_FIELDS = ["Expense Date", "Expense Account", "Amount", "Paid Through"];
const ALL_EXPENSE_MAP_FIELDS = EXPENSE_MAP_SECTIONS.flatMap((section) => section.fields);

const FIELD_ALIASES: Record<string, string[]> = {
  "Expense Date": ["Date", "ExpenseDate", "Expense_Date"],
  "Expense Account": ["Account", "Expense Category", "Category", "Account Name"],
  Amount: ["Total", "Expense Amount", "Amount Spent"],
  "Paid Through": ["PaidThrough", "Paid Through Account", "Paid Through Account Name", "Payment Account"],
  "Vendor Name": ["Vendor", "VendorName", "Vendor Name"],
  "Customer Name": ["Customer", "CustomerName", "Customer Name"],
  "Reference#": ["Reference", "Reference Number", "Reference #", "Ref#", "Ref No"],
  Description: ["Notes", "Memo", "Expense Notes"],
  "Currency Code": ["Currency", "CurrencyCode", "Currency Code"],
  "Is Billable": ["Billable", "Billable?", "Is Billable"],
  Status: ["Expense Status", "Bill Status"],
};

const SUPPORTED_STATUSES = new Set(["unbilled", "invoiced", "reimbursed", "non-billable", "billable"]);
const CURRENCY_CODE_REGEX = /^[A-Z]{3}$/;

const normalizeFieldText = (value: string) =>
  String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

const normalizeText = (value: any) => String(value || "").trim().toLowerCase();
const normalizeMatchKey = (value: any) =>
  String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

const toResponseArray = (response: any) => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.data?.data)) return response.data.data;
  if (Array.isArray(response?.data?.accounts)) return response.data.accounts;
  if (Array.isArray(response?.data?.contacts)) return response.data.contacts;
  if (Array.isArray(response?.vendors)) return response.vendors;
  if (Array.isArray(response?.customers)) return response.customers;
  if (Array.isArray(response?.contacts)) return response.contacts;
  if (Array.isArray(response?.accounts)) return response.accounts;
  return [];
};

const toBoolean = (value: any): boolean | undefined => {
  const normalized = normalizeText(value);
  if (!normalized) return undefined;
  if (["true", "yes", "1", "y", "billable"].includes(normalized)) return true;
  if (["false", "no", "0", "n", "non-billable", "nonbillable"].includes(normalized)) return false;
  return undefined;
};

const parseAmount = (value: any): number => {
  const cleaned = String(value || "")
    .trim()
    .replace(/,/g, "")
    .replace(/[^0-9.\-]/g, "");
  const parsed = Number.parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
};

const formatDateForApi = (rawValue: any): string => {
  const raw = String(rawValue || "").trim();
  if (!raw) return "";

  if (/^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/.test(raw)) {
    const [y, m, d] = raw.split(/[-/]/);
    const month = Number.parseInt(m, 10);
    const day = Number.parseInt(d, 10);
    if (!Number.isFinite(month) || !Number.isFinite(day) || month < 1 || month > 12 || day < 1 || day > 31) {
      return "";
    }
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }

  if (/^\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}$/.test(raw)) {
    const [first, second, third] = raw.split(/[-/.]/);
    const year = third.length === 2 ? `20${third}` : third;
    const firstNum = Number.parseInt(first, 10);
    const secondNum = Number.parseInt(second, 10);
    if (!Number.isFinite(firstNum) || !Number.isFinite(secondNum)) return "";

    let dayNum = firstNum;
    let monthNum = secondNum;
    if (firstNum <= 12 && secondNum > 12) {
      dayNum = secondNum;
      monthNum = firstNum;
    }

    if (monthNum < 1 || monthNum > 12 || dayNum < 1 || dayNum > 31) return "";
    const day = String(dayNum).padStart(2, "0");
    const month = String(monthNum).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  if (/^\d+(\.\d+)?$/.test(raw)) {
    const serial = Number.parseFloat(raw);
    if (Number.isFinite(serial) && serial > 0) {
      const excelEpoch = new Date(Date.UTC(1899, 11, 30));
      excelEpoch.setUTCDate(excelEpoch.getUTCDate() + Math.floor(serial));
      return excelEpoch.toISOString().slice(0, 10);
    }
  }

  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
};

const normalizeStatus = (value: any): string | undefined => {
  const normalized = normalizeText(value).replace(/\s+/g, "-");
  if (!normalized) return undefined;
  if (SUPPORTED_STATUSES.has(normalized)) return normalized;
  if (normalized === "nonbillable") return "non-billable";
  return undefined;
};

const getEntityId = (entity: any) => entity?._id || entity?.id || null;
const getAccountName = (account: any) =>
  account?.accountName || account?.account_name || account?.name || account?.displayName || "";
const getPersonName = (person: any) => person?.displayName || person?.name || person?.companyName || "";

export default function ImportExpenses() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importedFileHeaders, setImportedFileHeaders] = useState<string[]>([]);
  const [parsedRows, setParsedRows] = useState<Record<string, string>[]>([]);
  const [fieldMappings, setFieldMappings] = useState<Record<string, string>>({});
  const [isImporting, setIsImporting] = useState(false);
  const [saveSelections, setSaveSelections] = useState(false);
  const [showReadyDetails, setShowReadyDetails] = useState(false);
  const [showSkippedDetails, setShowSkippedDetails] = useState(false);
  const [showUnmappedDetails, setShowUnmappedDetails] = useState(false);
  const [characterEncoding, setCharacterEncoding] = useState("UTF-8 (Unicode)");
  const [isDragging, setIsDragging] = useState(false);
  const [isEncodingDropdownOpen, setIsEncodingDropdownOpen] = useState(false);
  const [encodingSearch, setEncodingSearch] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const encodingDropdownRef = useRef<HTMLDivElement>(null);

  const encodings = [
    "UTF-8 (Unicode)",
    "UTF-16 (Unicode)",
    "ISO-8859-1",
    "ISO-8859-2",
    "ISO-8859-9 (Turkish)",
    "GB2312 (Simplified Chinese)",
    "Big5 (Traditional Chinese)",
  ];

  const buildAutoMappings = (headers: string[]) => {
    const normalizedHeaders = headers.map((header) => ({
      original: header,
      normalized: normalizeFieldText(header),
    }));

    const nextMappings: Record<string, string> = {};

    ALL_EXPENSE_MAP_FIELDS.forEach((field) => {
      const normalizedField = normalizeFieldText(field);
      const directMatch = normalizedHeaders.find((entry) => entry.normalized === normalizedField);
      if (directMatch) {
        nextMappings[field] = directMatch.original;
        return;
      }

      const aliases = FIELD_ALIASES[field] || [];
      for (const alias of aliases) {
        const normalizedAlias = normalizeFieldText(alias);
        const aliasMatch = normalizedHeaders.find((entry) => entry.normalized === normalizedAlias);
        if (aliasMatch) {
          nextMappings[field] = aliasMatch.original;
          return;
        }
      }
    });

    return nextMappings;
  };

  const getRowValue = (row: Record<string, any>, field: string) => {
    const mappedHeader = fieldMappings[field];
    if (mappedHeader && row[mappedHeader] != null) {
      return String(row[mappedHeader]).trim();
    }

    const candidateNames = [field, ...(FIELD_ALIASES[field] || [])];
    const rowKeys = Object.keys(row || {});

    for (const candidate of candidateNames) {
      const normalizedCandidate = normalizeFieldText(candidate);
      const matchedKey = rowKeys.find((key) => normalizeFieldText(key) === normalizedCandidate);
      if (matchedKey && row[matchedKey] != null) {
        return String(row[matchedKey]).trim();
      }
    }

    return "";
  };

  const findByName = (items: any[], value: string, getName: (item: any) => string) => {
    const normalized = normalizeText(value);
    const normalizedKey = normalizeMatchKey(value);
    if (!normalized) return null;

    return (
      items.find((item) => {
        const itemName = getName(item);
        const itemNameNormalized = normalizeText(itemName);
        const itemNameKey = normalizeMatchKey(itemName);
        return (itemNameNormalized && itemNameNormalized === normalized) || (itemNameKey && itemNameKey === normalizedKey);
      }) || null
    );
  };

  const previewSkippedRecords = useMemo(() => {
    return parsedRows.reduce((acc: { rowNumber: number; reason: string }[], row, index) => {
      const rowNumber = index + 2;
      const expenseDate = getRowValue(row, "Expense Date");
      const expenseAccount = getRowValue(row, "Expense Account");
      const amountRaw = getRowValue(row, "Amount");
      const paidThrough = getRowValue(row, "Paid Through");

      if (!expenseDate || !expenseAccount || !amountRaw || !paidThrough) {
        acc.push({ rowNumber, reason: "Missing required value(s)" });
        return acc;
      }

      if (!formatDateForApi(expenseDate)) {
        acc.push({ rowNumber, reason: "Invalid date format" });
        return acc;
      }

      if (!Number.isFinite(parseAmount(amountRaw))) {
        acc.push({ rowNumber, reason: "Invalid amount" });
        return acc;
      }

      return acc;
    }, []);
  }, [parsedRows, fieldMappings]);

  const missingRequired = useMemo(
    () => REQUIRED_FIELDS.filter((field) => !fieldMappings[field]),
    [fieldMappings]
  );
  const unmappedFields = useMemo(
    () => ALL_EXPENSE_MAP_FIELDS.filter((field) => !fieldMappings[field]),
    [fieldMappings]
  );
  const parsedRowsCount = parsedRows.length;
  const skippedRecordsCount = previewSkippedRecords.length;
  const readyToImportCount = Math.max(parsedRowsCount - skippedRecordsCount, 0);
  const isPreviewReady = missingRequired.length === 0 && readyToImportCount > 0;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (encodingDropdownRef.current && !encodingDropdownRef.current.contains(event.target as Node)) {
        setIsEncodingDropdownOpen(false);
        setEncodingSearch("");
      }
    };
    if (isEncodingDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isEncodingDropdownOpen]);

  const resetParsedData = () => {
    setImportedFileHeaders([]);
    setParsedRows([]);
    setFieldMappings({});
    setShowReadyDetails(false);
    setShowSkippedDetails(false);
    setShowUnmappedDetails(false);
    setCurrentStep(1);
  };

  const handleValidFile = (file: File) => {
    if (file.size > 25 * 1024 * 1024) {
      alert("File size exceeds 25 MB limit.");
      return;
    }
    const validExtensions = [".csv", ".tsv", ".xls", ".xlsx"];
    const fileExtension = `.${String(file.name.split(".").pop() || "").toLowerCase()}`;
    if (!validExtensions.includes(fileExtension)) {
      alert("Invalid file format. Please select a CSV, TSV, or XLS file.");
      return;
    }
    setSelectedFile(file);
    resetParsedData();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleValidFile(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleValidFile(file);
  };

  const handleNext = async () => {
    if (!selectedFile) return;
    if (currentStep === 1) {
      try {
        const { headers, rows } = await parseImportFile(selectedFile);
        const safeHeaders = Array.isArray(headers) ? headers.filter(Boolean) : [];
        const safeRows = Array.isArray(rows) ? rows : [];
        setImportedFileHeaders(safeHeaders);
        setParsedRows(safeRows);
        setFieldMappings((prev) => ({ ...buildAutoMappings(safeHeaders), ...prev }));
        setCurrentStep(2);
      } catch (error) {
        alert("Unable to parse file. Please verify the format and try again.");
      }
      return;
    }
    if (currentStep === 2) {
      setCurrentStep(3);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) setCurrentStep((step) => step - 1);
  };

  const handleImport = async () => {
    if (!selectedFile || missingRequired.length > 0) return;
    setIsImporting(true);
    try {
      const rowsToImport = parsedRows;
      const [vendorsResponse, customersResponse, accountsResponse, bankAccountsResponse] = await Promise.all([
        vendorsAPI.getAll({ limit: 1000 }).catch(() => []),
        customersAPI.getAll({ limit: 1000 }).catch(() => []),
        chartOfAccountsAPI.getAccounts({ limit: 1000 }).catch(() => []),
        bankAccountsAPI.getAll({ limit: 1000 }).catch(() => []),
      ]);

      const vendors = toResponseArray(vendorsResponse);
      const customers = toResponseArray(customersResponse);
      const chartAccounts = toResponseArray(accountsResponse);
      const bankAccounts = toResponseArray(bankAccountsResponse);
      const paidThroughCandidates = [...bankAccounts, ...chartAccounts];

      let createdCount = 0;
      let skippedCount = 0;
      let failedCount = 0;
      const rowErrors: string[] = [];

      for (let index = 0; index < rowsToImport.length; index++) {
        const row = rowsToImport[index];
        const rowNumber = index + 2;
        try {
          const expenseDateRaw = getRowValue(row, "Expense Date");
          const expenseAccountName = getRowValue(row, "Expense Account");
          const amountRaw = getRowValue(row, "Amount");
          const paidThroughName = getRowValue(row, "Paid Through");

          if (!expenseDateRaw || !expenseAccountName || !amountRaw || !paidThroughName) {
            skippedCount++;
            continue;
          }

          const parsedDate = formatDateForApi(expenseDateRaw);
          const amount = parseAmount(amountRaw);
          if (!parsedDate || !Number.isFinite(amount)) {
            skippedCount++;
            continue;
          }

          const expenseAccount = findByName(chartAccounts, expenseAccountName, getAccountName);
          const paidThroughAccount = findByName(paidThroughCandidates, paidThroughName, getAccountName);
          const vendorName = getRowValue(row, "Vendor Name");
          const customerName = getRowValue(row, "Customer Name");
          const vendor = findByName(vendors, vendorName, getPersonName);
          const customer = findByName(customers, customerName, getPersonName);
          const isBillable = toBoolean(getRowValue(row, "Is Billable"));
          const explicitStatus = normalizeStatus(getRowValue(row, "Status"));
          const currencyCode = String(getRowValue(row, "Currency Code") || "").trim().toUpperCase();

          const payload: any = {
            date: parsedDate,
            amount: amount,
            total: amount,
            sub_total: amount,
            account_name: expenseAccountName,
            paid_through_account_name: paidThroughName,
            reference_number: getRowValue(row, "Reference#"),
            description: getRowValue(row, "Description"),
          };

          const accountId = getEntityId(expenseAccount);
          const paidThroughId = getEntityId(paidThroughAccount);
          if (accountId) payload.account_id = accountId;
          if (paidThroughId) payload.paid_through_account_id = paidThroughId;
          if (expenseAccount) payload.account_name = getAccountName(expenseAccount);
          if (paidThroughAccount) payload.paid_through_account_name = getAccountName(paidThroughAccount);

          if (getEntityId(vendor)) payload.vendor_id = getEntityId(vendor);
          else if (vendorName) payload.vendor_name = vendorName;
          if (getEntityId(customer)) payload.customer_id = getEntityId(customer);
          else if (customerName) payload.customer_name = customerName;

          if (isBillable !== undefined) payload.is_billable = isBillable;
          if (explicitStatus) payload.status = explicitStatus;
          else if (isBillable === true && (payload.customer_id || payload.customer_name)) payload.status = "unbilled";
          else if (isBillable === false) payload.status = "non-billable";

          if (CURRENCY_CODE_REGEX.test(currencyCode)) payload.currency_code = currencyCode;

          const response = await expensesAPI.create(payload);
          if (response?.code === 0 || response?.success) createdCount++;
          else { failedCount++; rowErrors.push(`Row ${rowNumber}: ${response?.message || "Error"}`); }
        } catch (e) { failedCount++; rowErrors.push(`Row ${rowNumber}: Error`); }
      }

      window.dispatchEvent(new Event("expensesUpdated"));
      alert(`Import complete.\nCreated: ${createdCount}\nSkipped: ${skippedCount}\nFailed: ${failedCount}`);
      if (createdCount > 0) navigate("/expenses");
    } catch (error) {
      alert("Import failed. Please try again.");
    } finally {
      setIsImporting(false);
    }
  };

  const downloadSampleFile = (type: "csv" | "xls") => {
    const headers = ["Expense Date", "Expense Account", "Amount", "Paid Through", "Vendor Name", "Customer Name", "Reference#", "Description", "Currency Code", "Is Billable", "Status"];
    const row = ["2026-02-20", "Office Supplies", "125.00", "Cash", "Sample Vendor", "Sample Customer", "EXP-0001", "Printer paper", "USD", "Yes", "unbilled"];
    const content = type === "csv"
      ? [headers, row].map(r => r.map(c => `"${c}"`).join(",")).join("\n")
      : [headers, row].map(r => r.join("\t")).join("\n");
    const blob = new Blob([content], { type: type === "csv" ? "text/csv" : "application/vnd.ms-excel" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sample_expenses.${type}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const stepTitle = currentStep === 1 ? "Select File" : currentStep === 2 ? "Map Fields" : "Preview";

  return (
    <div className="flex flex-col h-screen bg-[#f8fafc] overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-8 py-5 flex items-center justify-between shadow-sm z-10">
        <div className="flex items-center gap-10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#156372]/10 flex items-center justify-center">
              <Upload size={18} className="text-[#156372]" />
            </div>
            <h1 className="text-xl font-bold text-gray-800 tracking-tight">Import Expenses</h1>
          </div>

          <div className="flex items-center">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-all ${currentStep === 1 ? "bg-[#156372] text-white" : "bg-emerald-500/10 text-emerald-600"}`}>
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold ${currentStep === 1 ? "bg-white text-[#156372]" : "bg-emerald-500 text-white"}`}>
                {currentStep > 1 ? <Check size={12} /> : "1"}
              </div>
              <span className="text-xs font-bold uppercase tracking-wider">Configure</span>
            </div>
            <div className="w-8 h-px bg-gray-200 mx-2" />
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-all ${currentStep === 2 ? "bg-[#156372] text-white" : currentStep > 2 ? "bg-emerald-500/10 text-emerald-600" : "bg-gray-100 text-gray-400"}`}>
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold ${currentStep === 2 ? "bg-white text-[#156372]" : currentStep > 2 ? "bg-emerald-500 text-white" : "bg-gray-300 text-white"}`}>
                {currentStep > 2 ? <Check size={12} /> : "2"}
              </div>
              <span className="text-xs font-bold uppercase tracking-wider">Map Fields</span>
            </div>
            <div className="w-8 h-px bg-gray-200 mx-2" />
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-all ${currentStep === 3 ? "bg-[#156372] text-white" : "bg-gray-100 text-gray-400"}`}>
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold ${currentStep === 3 ? "bg-white text-[#156372]" : "bg-gray-300 text-white"}`}>3</div>
              <span className="text-xs font-bold uppercase tracking-wider">Preview</span>
            </div>
          </div>
        </div>

        <button onClick={() => navigate("/expenses")} className="w-9 h-9 flex items-center justify-center rounded-xl bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-all duration-200 group">
          <X size={20} className="group-hover:rotate-90 transition-transform duration-300" />
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
        <div className={`mx-auto w-full transition-all duration-500 ${currentStep === 1 ? "max-w-2xl" : "max-w-5xl"}`}>

          {currentStep === 1 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {/* Dropzone */}
              <div
                onDrop={handleDrop}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onClick={() => fileInputRef.current?.click()}
                className={`group relative border-2 border-dashed rounded-3xl p-16 text-center transition-all duration-300 ${isDragging
                    ? "border-[#156372] bg-[#156372]/5 shadow-inner"
                    : "border-gray-200 bg-white hover:border-[#156372]/50 hover:bg-gray-50/50 shadow-sm"
                  }`}
              >
                <div className="w-20 h-20 rounded-2xl bg-gray-50 flex items-center justify-center mx-auto mb-6 group-hover:scale-110 group-hover:bg-[#156372]/10 transition-all duration-300">
                  <DownloadIcon size={32} className="text-gray-400 group-hover:text-[#156372]" />
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">Select Import File</h3>
                <p className="text-sm text-gray-500 mb-8 max-w-xs mx-auto leading-relaxed">
                  Drag and drop your file here, or click to browse from your computer.
                </p>

                <div className="flex flex-col items-center gap-4">
                  <button type="button" className="px-8 py-3 bg-[#156372] text-white font-bold rounded-xl shadow-lg shadow-[#156372]/20 hover:shadow-[#156372]/30 hover:bg-[#0f4f5b] transition-all transform active:scale-95">
                    Choose File
                  </button>
                  <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                    CSV, TSV, or XLS (Max 25MB)
                  </span>
                </div>

                {selectedFile && (
                  <div className="mt-8 p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-center justify-between animate-in zoom-in duration-300 px-6">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-emerald-600">
                        <FileText size={20} />
                      </div>
                      <div className="text-left">
                        <div className="text-sm font-bold text-gray-800">{selectedFile.name}</div>
                        <div className="text-[11px] font-medium text-emerald-600">File attached successfully</div>
                      </div>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); setSelectedFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-white rounded-lg transition-all"
                    >
                      <X size={18} />
                    </button>
                  </div>
                )}
              </div>

              <input ref={fileInputRef} type="file" accept=".csv,.tsv,.xls,.xlsx" onChange={handleFileSelect} className="hidden" />

              {/* Sample Downloads */}
              <div className="bg-[#156372]/5 rounded-3xl p-6 border border-[#156372]/10">
                <div className="flex items-center gap-3 mb-4">
                  <Info size={16} className="text-[#156372]" />
                  <span className="text-sm font-bold text-[#156372]">Need a template?</span>
                </div>
                <div className="flex gap-4">
                  <button onClick={() => downloadSampleFile("csv")} className="flex-1 bg-white p-3 rounded-2xl border border-gray-100 flex items-center justify-center gap-2 hover:shadow-md transition-all group">
                    <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400 group-hover:text-[#156372] transition-colors">
                      <FileText size={16} />
                    </div>
                    <span className="text-xs font-bold text-gray-700">Sample CSV</span>
                  </button>
                  <button onClick={() => downloadSampleFile("xls")} className="flex-1 bg-white p-3 rounded-2xl border border-gray-100 flex items-center justify-center gap-2 hover:shadow-md transition-all group">
                    <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400 group-hover:text-[#156372] transition-colors">
                      <FileText size={16} />
                    </div>
                    <span className="text-xs font-bold text-gray-700">Sample XLS</span>
                  </button>
                </div>
              </div>

              {/* Encoding */}
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-[13px] font-bold text-[#156372] uppercase tracking-[1px] ml-1">
                  Character Encoding
                  <HelpCircle size={14} className="text-gray-300" />
                </label>
                <div ref={encodingDropdownRef} className="relative group">
                  <div
                    onClick={() => setIsEncodingDropdownOpen(!isEncodingDropdownOpen)}
                    className={`w-full p-3.5 px-5 bg-white border rounded-2xl text-sm font-semibold text-gray-700 cursor-pointer flex items-center justify-between transition-all duration-300 ${isEncodingDropdownOpen ? "border-[#156372] ring-4 ring-[#156372]/5 shadow-sm" : "border-gray-200 hover:border-[#156372]/30"}`}
                  >
                    <span>{characterEncoding}</span>
                    <ChevronDown size={18} className={`text-gray-400 transition-transform ${isEncodingDropdownOpen ? "rotate-180" : ""}`} />
                  </div>
                  {isEncodingDropdownOpen && (
                    <div className="absolute bottom-[calc(100%+12px)] left-0 w-full bg-white border border-gray-100 rounded-3xl shadow-2xl overflow-hidden py-2 animate-in slide-in-from-bottom-4 duration-300 z-50">
                      <div className="p-3">
                        <div className="relative">
                          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                          <input
                            type="text"
                            placeholder="Filter encodings..."
                            value={encodingSearch}
                            onChange={(e) => setEncodingSearch(e.target.value)}
                            className="w-full pl-10 pr-3 py-2.5 bg-gray-50 border-none rounded-xl text-sm outline-none focus:bg-white focus:ring-2 focus:ring-[#156372]/10 transition-all font-medium"
                          />
                        </div>
                      </div>
                      <div className="max-h-48 overflow-y-auto custom-scrollbar">
                        {encodings.filter(e => e.toLowerCase().includes(encodingSearch.toLowerCase())).map(e => (
                          <div
                            key={e}
                            onClick={() => { setCharacterEncoding(e); setIsEncodingDropdownOpen(false); }}
                            className={`px-6 py-2.5 text-sm font-semibold transition-colors cursor-pointer ${characterEncoding === e ? "bg-[#156372] text-white" : "text-gray-700 hover:bg-[#156372]/5"}`}
                          >
                            {e}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-8 animate-in fade-in duration-500">
              <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h2 className="text-xl font-bold text-gray-800">Map Fields</h2>
                    <p className="text-sm text-gray-500 font-medium">Connect your file headers to our expense fields</p>
                  </div>
                  <div className="flex items-center gap-3 px-4 py-2 bg-[#156372]/5 rounded-xl border border-[#156372]/10">
                    <FileText size={16} className="text-[#156372]" />
                    <span className="text-xs font-bold text-[#156372]">{selectedFile?.name}</span>
                  </div>
                </div>

                <div className="space-y-4">
                  {EXPENSE_MAP_SECTIONS[0].fields.map((field) => (
                    <div key={field} className="flex flex-col md:grid md:grid-cols-[240px_1fr] md:items-center gap-4 bg-gray-50/50 p-4 rounded-2xl border border-transparent hover:border-gray-100 hover:bg-white transition-all group">
                      <label className="text-sm font-bold text-gray-600 flex items-center gap-2 group-hover:text-[#156372]">
                        {field}
                        {REQUIRED_FIELDS.includes(field) && <span className="text-red-500 text-lg leading-none mt-1">*</span>}
                      </label>

                      <div className="flex items-center gap-3">
                        <div className="relative flex-1">
                          <select
                            value={fieldMappings[field] || ""}
                            onChange={(e) => setFieldMappings(prev => ({ ...prev, [field]: e.target.value }))}
                            className={`w-full pl-5 pr-10 py-3 bg-white border rounded-xl text-sm font-semibold appearance-none outline-none transition-all ${fieldMappings[field] ? "border-[#156372] ring-4 ring-[#156372]/5" : "border-gray-200 focus:border-[#156372]/50"}`}
                          >
                            <option value="">- Unmapped -</option>
                            {importedFileHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                          </select>
                          <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                        </div>
                        {fieldMappings[field] && (
                          <button onClick={() => setFieldMappings(prev => { const n = { ...prev }; delete n[field]; return n; })} className="w-11 h-11 flex items-center justify-center rounded-xl bg-gray-100 text-gray-400 hover:bg-red-50 hover:text-red-500 transition-all">
                            <X size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-6 animate-in zoom-in-95 duration-500">
              <div className="bg-[#156372] rounded-[40px] p-10 text-white shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10">
                  <DownloadIcon size={80} />
                </div>
                <h2 className="text-3xl font-black mb-6 tracking-tight">Import Preview</h2>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div onClick={() => setShowReadyDetails(!showReadyDetails)} className={`p-6 bg-white/10 rounded-3xl border border-white/10 cursor-pointer transition-all hover:bg-white/15 ${showReadyDetails ? "ring-2 ring-white/30 bg-white/20" : ""}`}>
                    <div className="text-[11px] font-bold uppercase tracking-widest text-white/60 mb-1">Ready</div>
                    <div className="text-4xl font-black">{readyToImportCount}</div>
                    <div className="text-xs font-medium text-white/50 mt-1">Expenses found</div>
                  </div>
                  <div onClick={() => setShowSkippedDetails(!showSkippedDetails)} className={`p-6 bg-white/10 rounded-3xl border border-white/10 cursor-pointer transition-all hover:bg-white/15 ${showSkippedDetails ? "ring-2 ring-white/30 bg-white/20" : ""}`}>
                    <div className="text-[11px] font-bold uppercase tracking-widest text-white/60 mb-1">Skipped</div>
                    <div className="text-4xl font-black">{skippedRecordsCount}</div>
                    <div className="text-xs font-medium text-white/50 mt-1">Validation errors</div>
                  </div>
                  <div onClick={() => setShowUnmappedDetails(!showUnmappedDetails)} className={`p-6 bg-white/10 rounded-3xl border border-white/10 cursor-pointer transition-all hover:bg-white/15 ${showUnmappedDetails ? "ring-2 ring-white/30 bg-white/20" : ""}`}>
                    <div className="text-[11px] font-bold uppercase tracking-widest text-white/60 mb-1">Unmapped</div>
                    <div className="text-4xl font-black">{unmappedFields.length}</div>
                    <div className="text-xs font-medium text-white/50 mt-1">Optional fields</div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {showReadyDetails && (
                  <div className="bg-white rounded-3xl p-6 border border-emerald-100 shadow-sm animate-in slide-in-from-top-4 duration-300">
                    <div className="flex items-center gap-3 mb-4 text-emerald-600 font-bold uppercase tracking-widest text-xs">
                      <Check size={16} /> Verified Records
                    </div>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      These {readyToImportCount} rows have passed all validation checks including required field mappings and data formatting.
                    </p>
                  </div>
                )}

                {showSkippedDetails && skippedRecordsCount > 0 && (
                  <div className="bg-white rounded-3xl p-8 border border-red-100 shadow-sm animate-in slide-in-from-top-4 duration-300">
                    <div className="flex items-center gap-3 mb-6 text-red-500 font-bold uppercase tracking-widest text-xs">
                      <AlertTriangle size={16} /> Critical Errors
                    </div>
                    <div className="max-h-60 overflow-y-auto custom-scrollbar pr-4">
                      <table className="w-full">
                        <thead className="sticky top-0 bg-white border-b border-gray-100">
                          <tr>
                            <th className="text-left py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">Row</th>
                            <th className="text-left py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">Issue</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {previewSkippedRecords.map(e => (
                            <tr key={e.rowNumber}>
                              <td className="py-2.5 text-xs font-bold text-gray-800">#{e.rowNumber}</td>
                              <td className="py-2.5 text-xs font-medium text-red-500">{e.reason}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {showUnmappedDetails && unmappedFields.length > 0 && (
                  <div className="bg-white rounded-3xl p-6 border border-amber-100 shadow-sm animate-in slide-in-from-top-4 duration-300">
                    <div className="flex items-center gap-3 mb-4 text-amber-500 font-bold uppercase tracking-widest text-xs">
                      <Search size={16} /> Unmapped Columns
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {unmappedFields.map(f => (
                        <span key={f} className="px-3 py-1.5 bg-amber-50 text-amber-700 text-[11px] font-bold rounded-full border border-amber-100 uppercase tracking-wide">
                          {f}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-white rounded-3xl p-6 border border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-[#156372]/10 rounded-xl flex items-center justify-center text-[#156372]">
                    <Check size={20} />
                  </div>
                  <span className="text-sm font-semibold text-gray-700">Ready to proceed with import?</span>
                </div>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={saveSelections}
                      onChange={e => setSaveSelections(e.target.checked)}
                      className="peer sr-only"
                    />
                    <div className="w-12 h-6 bg-gray-200 rounded-full transition-all peer-checked:bg-[#156372]" />
                    <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-all peer-checked:translate-x-6" />
                  </div>
                  <span className="text-sm font-bold text-gray-600 group-hover:text-gray-900 transition-colors uppercase tracking-tight">Save Mappings</span>
                </label>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Footer Nav */}
      <div className="bg-white border-t border-gray-100 px-10 py-6 flex items-center justify-between shadow-[0_-10px_30px_rgba(0,0,0,0.02)]">
        <div className="flex items-center gap-4">
          {currentStep > 1 && (
            <button onClick={handlePrevious} className="h-12 px-6 bg-white border-2 border-gray-100 text-gray-600 font-bold rounded-2xl flex items-center justify-center gap-2 hover:bg-gray-50 hover:border-gray-200 transition-all active:scale-95">
              <ArrowLeft size={18} /> Back
            </button>
          )}
        </div>

        <div className="flex items-center gap-4">
          <button onClick={() => navigate("/expenses")} className="h-12 px-6 text-gray-400 font-bold hover:text-gray-600 transition-colors uppercase tracking-widest text-xs">
            Cancel
          </button>

          {currentStep < 3 ? (
            <button
              onClick={handleNext}
              disabled={!selectedFile}
              className={`h-12 px-10 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-xl active:scale-95 ${selectedFile
                  ? "bg-[#156372] text-white shadow-[#156372]/20 hover:bg-[#0f4f5b] hover:shadow-[#156372]/40"
                  : "bg-gray-50 text-gray-300 border border-gray-100 cursor-not-allowed shadow-none"
                }`}
            >
              Continue <ArrowRight size={18} />
            </button>
          ) : (
            <button
              onClick={handleImport}
              disabled={isImporting || !isPreviewReady}
              className={`h-12 px-12 rounded-2xl font-bold text-white transition-all shadow-xl active:scale-95 ${isImporting || !isPreviewReady
                  ? "bg-gray-300 shadow-none cursor-not-allowed"
                  : "bg-[#156372] shadow-[#156372]/30 hover:bg-[#0f4f5b] hover:shadow-[#156372]/50"
                }`}
            >
              {isImporting ? "Processing..." : "Finish Import"}
            </button>
          )}
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
      `}</style>
    </div>
  );
}
