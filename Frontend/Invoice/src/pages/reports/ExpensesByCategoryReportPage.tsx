import React, { useEffect, useMemo, useRef, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { jsPDF } from "jspdf";
import {
  CalendarDays,
  ChevronDown,
  Columns3,
  Filter,
  Menu,
  Plus,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import { getCategoryById, getReportById } from "./reportsCatalog";
import { useSettings } from "../../lib/settings/SettingsContext";
import { chartOfAccountsAPI, expensesAPI } from "../../services/api";

type DateRangePreset =
  | "Today"
  | "This Week"
  | "This Month"
  | "This Quarter"
  | "This Year"
  | "Yesterday"
  | "Previous Week"
  | "Previous Month"
  | "Previous Quarter"
  | "Previous Year"
  | "All Time";

type ExpenseItem = {
  id: string;
  dateValue: Date | null;
  category: string;
  amount: number;
  amountWithTax: number;
};

type ExpenseCategoryRow = {
  id: string;
  name: string;
  expenseCount: number;
  amount: number;
  amountWithTax: number;
};

const COLUMN_LABELS = ["Category Name", "Expense Count", "Amount", "Amount With Tax"];

const formatDate = (value: Date) =>
  value.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

const toDate = (value: unknown) => {
  if (!value) return null;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
};

const text = (value: unknown) => String(value ?? "").trim();

const number = (value: unknown, fallback = 0) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const parsed = Number(String(value ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeCurrency = (value: unknown) => {
  const raw = text(value);
  return raw.split(" - ")[0].split(" ")[0].trim().toUpperCase() || "SOS";
};

const getBounds = (preset: DateRangePreset) => {
  const now = new Date();
  const startOfDay = (value: Date) => new Date(value.getFullYear(), value.getMonth(), value.getDate());
  const endOfDay = (value: Date) => new Date(value.getFullYear(), value.getMonth(), value.getDate(), 23, 59, 59, 999);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  switch (preset) {
    case "Today":
      return { start: startOfDay(now), end: endOfDay(now) };
    case "Yesterday": {
      const d = new Date(now);
      d.setDate(d.getDate() - 1);
      return { start: startOfDay(d), end: endOfDay(d) };
    }
    case "This Week": {
      const start = startOfDay(now);
      start.setDate(start.getDate() - start.getDay());
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      return { start, end: endOfDay(end) };
    }
    case "Previous Week": {
      const start = startOfDay(now);
      start.setDate(start.getDate() - start.getDay() - 7);
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      return { start, end: endOfDay(end) };
    }
    case "This Month":
      return { start: monthStart, end: monthEnd };
    case "Previous Month":
      return {
        start: new Date(now.getFullYear(), now.getMonth() - 1, 1),
        end: new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999),
      };
    case "This Quarter": {
      const quarter = Math.floor(now.getMonth() / 3) * 3;
      return {
        start: new Date(now.getFullYear(), quarter, 1),
        end: new Date(now.getFullYear(), quarter + 3, 0, 23, 59, 59, 999),
      };
    }
    case "Previous Quarter": {
      const quarter = Math.floor(now.getMonth() / 3) * 3;
      return {
        start: new Date(now.getFullYear(), quarter - 3, 1),
        end: new Date(now.getFullYear(), quarter, 0, 23, 59, 59, 999),
      };
    }
    case "This Year":
      return {
        start: new Date(now.getFullYear(), 0, 1),
        end: new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999),
      };
    case "Previous Year":
      return {
        start: new Date(now.getFullYear() - 1, 0, 1),
        end: new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999),
      };
    case "All Time":
      return { start: new Date(1970, 0, 1), end: endOfDay(now) };
    default:
      return { start: monthStart, end: monthEnd };
  }
};

const extractArray = (payload: any) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.rows)) return payload.rows;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.expenses)) return payload.expenses;
  return [];
};

const buildLookups = (accounts: any[]) => {
  const byId = new Map<string, any>();
  const byName = new Map<string, any>();

  for (const account of accounts) {
    const id = text(account?._id || account?.id);
    const name = text(account?.accountName || account?.name || account?.account_name || account?.displayName || account?.label);
    if (id) byId.set(id.toLowerCase(), account);
    if (name) byName.set(name.toLowerCase(), account);
  }

  return { byId, byName };
};

const resolveAccountName = (candidate: any, lookups: ReturnType<typeof buildLookups>) => {
  if (!candidate) return "";
  if (typeof candidate === "object") {
    return text(candidate.accountName || candidate.name || candidate.account_name || candidate.displayName || candidate.label);
  }

  const value = text(candidate);
  if (!value) return "";
  const byId = lookups.byId.get(value.toLowerCase());
  if (byId) return text(byId.accountName || byId.name || byId.account_name || byId.displayName || byId.label || value);
  const byName = lookups.byName.get(value.toLowerCase());
  if (byName) return text(byName.accountName || byName.name || byName.account_name || byName.displayName || byName.label || value);
  return value;
};

const normalizeExpense = (expense: any, lookups: ReturnType<typeof buildLookups>): ExpenseItem => {
  const dateValue = toDate(expense?.date || expense?.expense_date || expense?.createdAt || expense?.created_at);
  const category =
    text(expense?.category_name) ||
    text(expense?.categoryName) ||
    resolveAccountName(
      expense?.account_name || expense?.account_id || expense?.account || expense?.expenseAccount || expense?.accountId || expense?.category,
      lookups,
    ) ||
    "Unassigned";

  const amount = number(expense?.amount ?? expense?.sub_total ?? expense?.subTotal ?? expense?.total ?? 0, 0);
  const taxAmount = number(expense?.tax_amount ?? expense?.taxAmount ?? expense?.total_tax ?? 0, 0);

  return {
    id: text(expense?._id || expense?.id || expense?.expense_id || `${category}-${expense?.date || ""}`),
    dateValue,
    category,
    amount,
    amountWithTax: amount + taxAmount,
  };
};

const buildRows = (items: ExpenseItem[], range: { start: Date; end: Date }, search: string) => {
  const query = search.trim().toLowerCase();
  const map = new Map<string, ExpenseCategoryRow>();

  for (const item of items) {
    if (!item.dateValue || item.dateValue < range.start || item.dateValue > range.end) continue;
    if (query && !item.category.toLowerCase().includes(query)) continue;

    const key = item.category.toLowerCase();
    if (!map.has(key)) {
      map.set(key, {
        id: key,
        name: item.category,
        expenseCount: 0,
        amount: 0,
        amountWithTax: 0,
      });
    }

    const current = map.get(key)!;
    current.expenseCount += 1;
    current.amount += item.amount;
    current.amountWithTax += item.amountWithTax;
  }

  return [...map.values()].sort((left, right) => right.amount - left.amount || left.name.localeCompare(right.name));
};

const money = (value: number, currency: string) => `${currency}${Math.abs(Number.isFinite(value) ? value : 0).toFixed(2)}`;

const escapeCsvValue = (value: unknown) => {
  const textValue = String(value ?? "");
  if (/[",\n]/.test(textValue)) {
    return `"${textValue.replace(/"/g, '""')}"`;
  }
  return textValue;
};

export default function ExpensesByCategoryReportPage() {
  const navigate = useNavigate();
  const { categoryId, reportId } = useParams();
  const category = getCategoryById(categoryId || "");
  const report = getReportById(categoryId || "", reportId || "");
  const { settings } = useSettings();

  const [selectedRange, setSelectedRange] = useState<DateRangePreset>("This Month");
  const [isDateOpen, setIsDateOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isMoreFiltersOpen, setIsMoreFiltersOpen] = useState(false);
  const [isCustomizeOpen, setIsCustomizeOpen] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);
  const [categorySearch, setCategorySearch] = useState("");
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedColumns, setSelectedColumns] = useState([...COLUMN_LABELS]);

  const dateRef = useRef<HTMLDivElement | null>(null);
  const exportRef = useRef<HTMLDivElement | null>(null);
  const moreFiltersRef = useRef<HTMLDivElement | null>(null);

  const currencyCode = String(settings?.general?.currencyCode || settings?.general?.baseCurrency || settings?.general?.currency || "SOS").trim() || "SOS";
  const organizationName = String(settings?.general?.companyDisplayName || settings?.general?.schoolDisplayName || "").trim();
  const bounds = useMemo(() => getBounds(selectedRange), [selectedRange]);
  const dateLabel = useMemo(() => `From ${formatDate(bounds.start)} To ${formatDate(bounds.end)}`, [bounds.end, bounds.start]);

  const rows = useMemo(() => buildRows(expenses, bounds, categorySearch), [bounds.end, bounds.start, categorySearch, expenses]);
  const totals = useMemo(
    () => ({
      expenseCount: rows.reduce((sum, row) => sum + row.expenseCount, 0),
      amount: rows.reduce((sum, row) => sum + row.amount, 0),
      amountWithTax: rows.reduce((sum, row) => sum + row.amountWithTax, 0),
    }),
    [rows],
  );

  if (!categoryId || !reportId || !category || !report) return <Navigate to="/reports" replace />;
  if (category.id !== "purchases-expenses" || report.id !== "expenses-by-category") {
    return <Navigate to="/reports" replace />;
  }

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const [expensesRes, accountsRes] = await Promise.all([
          expensesAPI.getAll({ limit: 10000 }).catch(() => ({ data: [] })),
          chartOfAccountsAPI.getAccounts({ limit: 1000 }).catch(() => ({ data: [] })),
        ]);

        if (cancelled) return;

        const lookups = buildLookups(extractArray(accountsRes));
        const normalized = extractArray(expensesRes).map((expense: any) => normalizeExpense(expense, lookups));
        setExpenses(normalized);
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to load expenses by category report:", error);
          setExpenses([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [refreshTick]);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!dateRef.current?.contains(target)) setIsDateOpen(false);
      if (!exportRef.current?.contains(target)) setIsExportOpen(false);
      if (!moreFiltersRef.current?.contains(target)) setIsMoreFiltersOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsDateOpen(false);
        setIsExportOpen(false);
        setIsMoreFiltersOpen(false);
        setIsCustomizeOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem("expenses_by_category_visible_columns_v1", JSON.stringify(selectedColumns));
    } catch {
      // ignore
    }
  }, [selectedColumns]);

  const openReport = () => {
    setRefreshTick((value) => value + 1);
    toast.success(`Report refreshed: ${report.name}`);
  };

  const handleExport = (label: string) => {
    const normalized = label.toLowerCase();
    const selectedHeaders = selectedColumns;
    const exportData = rows.map((row) =>
      selectedHeaders.map((column) => {
        if (column === "Category Name") return row.name;
        if (column === "Expense Count") return row.expenseCount;
        if (column === "Amount") return money(row.amount, currencyCode);
        if (column === "Amount With Tax") return money(row.amountWithTax, currencyCode);
        return "";
      }),
    );
    const exportTotals = selectedHeaders.map((column, index) => {
      if (index === 0) return "Total";
      if (column === "Expense Count") return totals.expenseCount;
      if (column === "Amount") return money(totals.amount, currencyCode);
      if (column === "Amount With Tax") return money(totals.amountWithTax, currencyCode);
      return "";
    });
    const fileBase = `expense-summary-by-category-${new Date().toISOString().split("T")[0]}`;

    const downloadText = (content: string, fileName: string, mimeType: string) => {
      const blob = new Blob([content], { type: mimeType });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    };

    const exportPdf = () => {
      const doc = new jsPDF("landscape", "mm", "a4");
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 10;
      const columns = selectedHeaders.length || 1;
      const colWidth = (pageWidth - margin * 2) / columns;
      let y = 18;

      doc.setFontSize(16);
      doc.text(report.name, pageWidth / 2, y, { align: "center" });
      y += 8;
      doc.setFontSize(10);
      doc.text(dateLabel, pageWidth / 2, y, { align: "center" });
      y += 10;

      doc.setFillColor(248, 250, 252);
      doc.rect(margin, y, pageWidth - margin * 2, 8, "F");
      doc.setFontSize(9);
      selectedHeaders.forEach((column, index) => {
        doc.text(column, margin + index * colWidth + 2, y + 5);
      });
      y += 8;

      const rowsForPdf = [...exportData, exportTotals];
      rowsForPdf.forEach((rowValues, rowIndex) => {
        const cellLines = rowValues.map((value) =>
          doc.splitTextToSize(String(value ?? ""), colWidth - 4),
        );
        const rowHeight = Math.max(...cellLines.map((lines) => Math.max(lines.length, 1))) * 5 + 2;
        if (y + rowHeight > pageHeight - margin) {
          doc.addPage();
          y = margin;
          doc.setFillColor(248, 250, 252);
          doc.rect(margin, y, pageWidth - margin * 2, 8, "F");
          selectedHeaders.forEach((column, index) => {
            doc.text(column, margin + index * colWidth + 2, y + 5);
          });
          y += 8;
        }

        if (rowIndex === rowsForPdf.length - 1) {
          doc.setFillColor(250, 251, 255);
          doc.rect(margin, y, pageWidth - margin * 2, rowHeight, "F");
        }

        rowValues.forEach((value, index) => {
          const lines = cellLines[index];
          const firstLine = lines[0] || "";
          doc.text(firstLine, margin + index * colWidth + 2, y + 5);
        });
        y += rowHeight;
      });

      doc.save(`${fileBase}.pdf`);
    };

    const exportSpreadsheet = async (bookType: "xlsx" | "xls", suffix: string) => {
      const XLSX = await import("xlsx");
      const worksheet = XLSX.utils.aoa_to_sheet([
        selectedHeaders,
        ...exportData,
        exportTotals,
      ]);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Expense Summary");
      XLSX.writeFile(workbook, `${fileBase}.${suffix}`, { bookType });
    };

    void (async () => {
      try {
        if (normalized === "pdf") {
          exportPdf();
        } else if (normalized === "xlsx (microsoft excel)") {
          await exportSpreadsheet("xlsx", "xlsx");
        } else if (normalized === "xls (microsoft excel 1997-2004 compatible)") {
          await exportSpreadsheet("xls", "xls");
        } else if (normalized === "csv (comma separated value)") {
          const csv = [
            selectedHeaders.join(","),
            ...exportData.map((row) => row.map(escapeCsvValue).join(",")),
            exportTotals.map(escapeCsvValue).join(","),
          ].join("\n");
          downloadText(csv, `${fileBase}.csv`, "text/csv;charset=utf-8;");
        } else if (normalized === "export to zoho sheet") {
          await exportSpreadsheet("xlsx", "xlsx");
        } else if (normalized === "print" || normalized === "print preference") {
          window.print();
        }
        toast.success(`Export option selected: ${label}`);
      } catch (error) {
        console.error("Failed to export expense summary by category:", error);
        toast.error(`Unable to export ${label}`);
      } finally {
        setIsExportOpen(false);
      }
    })();
  };

  return (
    <div className="relative min-h-[calc(100vh-64px)] pt-3">
      <div className="pr-3">
        <div className="rounded-lg border border-[#d7dce7] bg-white">
          <div className="flex flex-wrap items-start justify-between gap-4 px-4 py-3">
            <div className="flex min-w-0 items-start gap-3">
              <button
                type="button"
                onClick={() => navigate("/reports")}
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded border border-[#d4d9e4] bg-white text-[#334155] hover:bg-[#f8fafc]"
                aria-label="Open reports"
              >
                <Menu size={15} />
              </button>
              <div className="min-w-0">
                <p className="text-sm font-medium text-[#4f5f79]">{category.name}</p>
                <h1 className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-[24px] font-semibold leading-tight text-[#0f172a]">
                  <span>{report.name}</span>
                  <span className="text-sm font-normal text-[#475569]">- {dateLabel}</span>
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsCustomizeOpen(true)}
                className="inline-flex h-9 w-9 items-center justify-center rounded border border-[#d4d9e4] text-[#334155] hover:bg-[#f8fafc]"
                aria-label="Customize report columns"
                title="Customize report columns"
              >
                <Columns3 size={15} />
              </button>

              <div ref={exportRef} className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setIsExportOpen((value) => !value);
                    setIsDateOpen(false);
                    setIsMoreFiltersOpen(false);
                  }}
                  className={`inline-flex h-9 items-center gap-1 rounded border bg-white px-3 text-sm font-medium text-[#1e293b] hover:bg-[#f8fafc] ${
                    isExportOpen ? "border-[#1b6f7b]" : "border-[#d4d9e4]"
                  }`}
                >
                  Export{" "}
                  <ChevronDown
                    size={14}
                    className={`transition-transform duration-150 ${
                      isExportOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {isExportOpen ? (
                  <div className="absolute right-0 top-[calc(100%+6px)] z-50 w-[252px] overflow-visible rounded-lg border border-[#d7dce7] bg-white shadow-[0_10px_24px_rgba(15,23,42,0.12)]">
                    <div className="border-b border-[#eef2f7] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#64748b]">
                      Export As
                    </div>
                    <div className="py-1">
                      {[
                        "PDF",
                        "XLSX (Microsoft Excel)",
                        "XLS (Microsoft Excel 1997-2004 Compatible)",
                        "CSV (Comma Separated Value)",
                        "Export to Zoho Sheet",
                      ].map((label) => (
                        <button
                          key={label}
                          type="button"
                          onClick={() => handleExport(label)}
                          className="flex w-full items-center px-4 py-2 text-left text-sm text-[#334155] hover:bg-[#f8fafc]"
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    <div className="border-t border-[#eef2f7] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#64748b]">
                      Print
                    </div>
                    <div className="py-1">
                      {["Print", "Print Preference"].map((label) => (
                        <button
                          key={label}
                          type="button"
                          onClick={() => handleExport(label)}
                          className="flex w-full items-center px-4 py-2 text-left text-sm text-[#334155] hover:bg-[#f8fafc]"
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>

              <button
                type="button"
                onClick={openReport}
                className="inline-flex h-9 w-9 items-center justify-center rounded border border-[#d4d9e4] text-[#334155] hover:bg-[#f8fafc]"
                aria-label="Refresh report"
                title="Refresh report"
              >
                <RefreshCw size={15} />
              </button>

              <button
                type="button"
                onClick={() => navigate("/reports")}
                className="inline-flex h-9 w-9 items-center justify-center rounded border border-[#d4d9e4] text-[#ef4444] hover:bg-[#fef2f2]"
                aria-label="Close report"
                title="Close report"
              >
                <X size={15} />
              </button>
            </div>
          </div>

          <div className="border-t border-[#e6eaf1] px-4 py-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 text-sm text-[#334155]">
                <Filter size={14} className="text-[#64748b]" />
                <span>Filters :</span>
              </span>

              <div ref={dateRef} className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setIsDateOpen((value) => !value);
                    setIsExportOpen(false);
                    setIsMoreFiltersOpen(false);
                  }}
                  className={`inline-flex h-8 items-center gap-1 rounded border px-3 text-sm text-[#334155] hover:bg-white ${
                    isDateOpen ? "border-[#1b6f7b] bg-white" : "border-[#cfd6e4] bg-[#f8fafc]"
                  }`}
                >
                  <CalendarDays size={14} className="text-[#64748b]" />
                  Date Range : <span className="font-medium">{selectedRange}</span>
                  <ChevronDown size={14} />
                </button>

                {isDateOpen ? (
                  <div className="absolute left-0 top-[calc(100%+6px)] z-30 w-52 rounded-lg border border-[#d7dce7] bg-white p-2 shadow-[0_10px_24px_rgba(15,23,42,0.12)]">
                    {[
                      "Today",
                      "This Week",
                      "This Month",
                      "This Quarter",
                      "This Year",
                      "All Time",
                    ].map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => {
                          setSelectedRange(option as DateRangePreset);
                          setIsDateOpen(false);
                        }}
                        className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm hover:bg-[#f8fafc]"
                      >
                        <span>{option}</span>
                        {selectedRange === option ? <span className="text-[#64748b]">Selected</span> : null}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>

              <div ref={moreFiltersRef} className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setIsMoreFiltersOpen((value) => !value);
                    setIsDateOpen(false);
                    setIsExportOpen(false);
                  }}
                  className={`inline-flex h-8 items-center gap-1 rounded border px-3 text-sm text-[#334155] hover:bg-white ${
                    isMoreFiltersOpen ? "border-[#1b6f7b] bg-white" : "border-[#cfd6e4] bg-[#f8fafc]"
                  }`}
                >
                  <Plus size={14} className="text-[#2563eb]" />
                  More Filters
                </button>

                {isMoreFiltersOpen ? (
                  <div className="absolute left-0 top-[calc(100%+6px)] z-30 w-[340px] rounded-lg border border-[#d7dce7] bg-white p-3 shadow-[0_10px_24px_rgba(15,23,42,0.12)]">
                    <p className="text-sm font-medium text-[#0f172a]">More Filters</p>
                    <p className="mt-1 text-sm text-[#64748b]">
                      Search the grouped category names shown in this report.
                    </p>
                    <label className="mt-3 block">
                      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.08em] text-[#64748b]">
                        Category Contains
                      </span>
                      <div className="relative">
                        <Search size={14} className="pointer-events-none absolute left-3 top-3 text-[#94a3b8]" />
                        <input
                          value={categorySearch}
                          onChange={(event) => setCategorySearch(event.target.value)}
                          placeholder="Type a category name"
                          className="h-9 w-full rounded border border-[#cfd6e4] bg-white pl-9 pr-3 text-sm text-[#334155] outline-none focus:border-[#1b6f7b]"
                        />
                      </div>
                    </label>
                    <div className="mt-3 flex items-center justify-between">
                      <button type="button" onClick={() => setCategorySearch("")} className="text-sm text-[#2563eb] hover:underline">
                        Clear
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsMoreFiltersOpen(false)}
                        className="inline-flex h-8 items-center rounded bg-[#156372] px-4 text-sm font-semibold text-white hover:bg-[#0f4f5b]"
                      >
                        Apply
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>

              <button
                type="button"
                onClick={openReport}
                className="inline-flex h-8 items-center gap-1 rounded bg-[#74a8ff] px-4 text-sm font-semibold text-white hover:bg-[#5d96f5]"
              >
                <CalendarDays size={14} /> Run Report
              </button>
            </div>
          </div>

          <div className="px-3 pb-3">
            <div className="overflow-hidden rounded-xl border border-[#d7dce7] bg-white">
              <div className="border-b border-[#eef2f7] px-4 py-10 text-center">
                {organizationName ? <div className="mb-1 text-sm text-[#64748b]">{organizationName}</div> : null}
                <h2 className="text-[20px] font-semibold text-[#0f172a]">{report.name}</h2>
                <div className="mt-1 text-sm text-[#2563eb]">{dateLabel}</div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-[#eef2f7] bg-[#fafbff]">
                      {selectedColumns.map((column, index) => (
                        <th
                          key={column}
                          className={`px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#475569] ${
                            index === 0 ? "text-left" : "text-center"
                          }`}
                        >
                          {index === 0 ? (
                            <span className="inline-flex items-center gap-1">
                              {column}
                              <ChevronDown size={10} className="text-[#94a3b8]" />
                            </span>
                          ) : (
                            column
                          )}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td className="px-4 py-10 text-center text-sm text-[#64748b]" colSpan={selectedColumns.length}>
                          Loading report data...
                        </td>
                      </tr>
                    ) : rows.length === 0 ? (
                      <tr>
                        <td className="px-4 py-10 text-center text-sm text-[#64748b]" colSpan={selectedColumns.length}>
                          There are no transactions during the selected date range.
                        </td>
                      </tr>
                    ) : (
                      <>
                        {rows.map((row) => (
                          <tr key={row.id} className="border-b border-[#edf1f7] hover:bg-[#fcfdff]">
                            {selectedColumns.map((column, cellIndex) => {
                              const value =
                                column === "Category Name"
                                  ? row.name
                                  : column === "Expense Count"
                                    ? row.expenseCount
                                    : column === "Amount"
                                      ? money(row.amount, currencyCode)
                                      : column === "Amount With Tax"
                                        ? money(row.amountWithTax, currencyCode)
                                        : "";
                              return (
                                <td
                                  key={`${row.id}-${cellIndex}`}
                                  className={`px-4 py-3 text-[14px] ${
                                    cellIndex === 0 ? "font-medium text-[#2563eb]" : "text-center text-[#334155]"
                                  }`}
                                >
                                  {value}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                        <tr className="border-b border-[#e5e7eb] bg-[#fafbff]">
                          {selectedColumns.map((column, index) => {
                            const value =
                              column === "Category Name"
                                ? "Total"
                                : column === "Expense Count"
                                  ? totals.expenseCount
                                  : column === "Amount"
                                    ? money(totals.amount, currencyCode)
                                    : column === "Amount With Tax"
                                      ? money(totals.amountWithTax, currencyCode)
                                      : "";
                            return (
                              <td
                                key={`total-${column}`}
                                className={`px-4 py-3 text-[14px] ${
                                  index === 0 ? "font-semibold text-[#111827]" : "text-center text-[#111827]"
                                }`}
                              >
                                {value}
                              </td>
                            );
                          })}
                        </tr>
                      </>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      {isCustomizeOpen ? (
        <div className="fixed inset-0 z-40 flex items-start justify-center bg-black/35 px-4 pt-10">
          <div className="w-full max-w-[640px] rounded-xl border border-[#d7dce7] bg-white shadow-[0_24px_60px_rgba(15,23,42,0.28)]">
            <div className="flex items-center justify-between border-b border-[#e6eaf1] px-5 py-4">
              <div className="flex items-center gap-2">
                <Columns3 size={17} className="text-[#334155]" />
                <h3 className="text-[16px] font-semibold text-[#0f172a]">Customize Report Columns</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCustomizeOpen(false)}
                className="inline-flex h-7 w-7 items-center justify-center rounded-md text-[#ef4444] hover:bg-[#fef2f2]"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>
            <div className="px-5 py-4">
              <p className="text-sm text-[#64748b]">Hide or show columns in this expense summary report.</p>
              <div className="mt-4 grid gap-3">
                {COLUMN_LABELS.map((column) => (
                  <button
                    key={column}
                    type="button"
                    onClick={() => {
                      setSelectedColumns((current) => {
                        if (current.includes(column)) {
                          if (current.length === 1) return current;
                          return current.filter((item) => item !== column);
                        }
                        return [...current, column];
                      });
                    }}
                    className="flex items-center justify-between rounded-md border border-[#e6eaf1] px-3 py-2 text-left text-sm text-[#334155] hover:bg-[#f8fafc]"
                  >
                    <span>{column}</span>
                    <span className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] font-semibold ${selectedColumns.includes(column) ? "bg-[#d9eff1] text-[#1b6f7b]" : "bg-[#eef2f7] text-[#64748b]"}`}>
                      {selectedColumns.includes(column) ? "On" : "Off"}
                    </span>
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-3 border-t border-[#e6eaf1] px-5 py-4">
              <button
                type="button"
                onClick={() => {
                  setIsCustomizeOpen(false);
                  toast.success("Report columns updated");
                }}
                className="inline-flex h-9 items-center rounded bg-[#156372] px-4 text-sm font-semibold text-white hover:bg-[#0f4f5b]"
              >
                Apply
              </button>
              <button
                type="button"
                onClick={() => setIsCustomizeOpen(false)}
                className="inline-flex h-9 items-center rounded border border-[#d4d9e4] bg-white px-4 text-sm text-[#334155] hover:bg-[#f8fafc]"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
