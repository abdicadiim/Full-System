import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { jsPDF } from "jspdf";
import {
  CalendarDays,
  Check,
  ChevronDown,
  ChevronRight,
  Columns3,
  Filter,
  Folder,
  Menu,
  Plus,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import { getCategoryById, getReportById, REPORT_CATEGORIES, REPORTS_BY_CATEGORY } from "./reportsCatalog";
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
  | "All Time"
  | "Custom";

type DateRangeValue = {
  start: Date;
  end: Date;
};

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

const formatPickerDate = (value: Date) =>
  value.toLocaleDateString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  });

const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const CALENDAR_YEAR_OPTIONS = Array.from({ length: 120 }, (_, index) => 2007 + index);

const getStartOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1);
const addMonths = (date: Date, amount: number) => new Date(date.getFullYear(), date.getMonth() + amount, 1);
const isSameDay = (left: Date, right: Date) =>
  left.getFullYear() === right.getFullYear() &&
  left.getMonth() === right.getMonth() &&
  left.getDate() === right.getDate();
const isSameMonth = (left: Date, right: Date) =>
  left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth();
const buildCalendarGrid = (month: Date) => {
  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1);
  const startDay = firstDay.getDay();
  const startCell = new Date(firstDay);
  startCell.setDate(firstDay.getDate() - startDay);

  const weeks: Date[][] = [];
  let cursor = new Date(startCell);
  for (let week = 0; week < 6; week += 1) {
    const row: Date[] = [];
    for (let day = 0; day < 7; day += 1) {
      row.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(row);
  }
  return weeks;
};

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
    case "Custom":
      return { start: monthStart, end: monthEnd };
    default:
      return { start: monthStart, end: monthEnd };
  }
};

const DATE_RANGE_OPTIONS: Array<{ key: DateRangePreset; label: string }> = [
  { key: "Today", label: "Today" },
  { key: "This Week", label: "This Week" },
  { key: "This Month", label: "This Month" },
  { key: "This Quarter", label: "This Quarter" },
  { key: "This Year", label: "This Year" },
  { key: "Yesterday", label: "Yesterday" },
  { key: "Previous Week", label: "Previous Week" },
  { key: "Previous Month", label: "Previous Month" },
  { key: "Previous Quarter", label: "Previous Quarter" },
  { key: "Previous Year", label: "Previous Year" },
  { key: "All Time", label: "All Time" },
  { key: "Custom", label: "Custom" },
];

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

type ReportsDrawerProps = {
  open: boolean;
  currentCategoryId: string;
  currentReportId: string;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  onClose: () => void;
};

function ReportsDrawer({
  open,
  currentCategoryId,
  currentReportId,
  triggerRef,
  onClose,
}: ReportsDrawerProps) {
  const drawerRef = useRef<HTMLDivElement | null>(null);
  const [search, setSearch] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<string[]>(() => [currentCategoryId]);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (drawerRef.current?.contains(target)) return;
      if (triggerRef.current?.contains(target)) return;
      onClose();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, open, triggerRef]);

  useEffect(() => {
    if (!open) return;
    setExpandedCategories((current) =>
      current.includes(currentCategoryId) ? current : [...current, currentCategoryId],
    );
  }, [currentCategoryId, open]);

  const normalizedQuery = search.trim().toLowerCase();
  const categoryEntries = REPORT_CATEGORIES.map((category) => ({
    category,
    reports: REPORTS_BY_CATEGORY[category.id] || [],
  })).filter(({ category, reports }) => {
    if (!normalizedQuery) return reports.length > 0;
    return (
      category.name.toLowerCase().includes(normalizedQuery) ||
      reports.some((report) => report.name.toLowerCase().includes(normalizedQuery))
    );
  });

  if (!open) return null;

  return (
    <aside
      ref={drawerRef}
      className="absolute left-0 top-0 z-30 h-full w-[260px] overflow-hidden border-r border-[#e5e7eb] bg-white shadow-[8px_0_20px_rgba(15,23,42,0.08)]"
    >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-4">
            <div>
              <h2 className="text-[15px] font-semibold text-slate-900">Reports</h2>
              <div className="mt-0.5 text-[12px] text-slate-500">Browse report categories</div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              aria-label="Close reports drawer"
            >
              <X size={15} />
            </button>
          </div>

          <div className="px-4 py-3">
            <div className="relative">
              <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search reports"
                className="h-9 w-full rounded-md border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-700 outline-none focus:border-[#156372]"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-2 pb-4">
            {categoryEntries.map(({ category, reports }) => {
              const isExpanded = expandedCategories.includes(category.id) || normalizedQuery.length > 0;
              return (
                <div key={category.id} className="mb-1">
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedCategories((current) =>
                        current.includes(category.id)
                          ? current.filter((id) => id !== category.id)
                          : [...current, category.id],
                      )
                    }
                    className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm ${
                      category.id === currentCategoryId ? "bg-slate-100 text-slate-900" : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <Folder size={14} className="text-slate-400" />
                    <span className="font-medium">{category.name}</span>
                  </button>

                  {isExpanded ? (
                    <div className="ml-4 border-l border-slate-200 pl-3">
                      {reports
                        .filter((report) =>
                          !normalizedQuery || report.name.toLowerCase().includes(normalizedQuery),
                        )
                        .map((report) => {
                          const isActive =
                            category.id === currentCategoryId && report.id === currentReportId;
                          return (
                            <Link
                              key={report.id}
                              to={`/reports/${category.id}/${report.id}`}
                              onClick={onClose}
                              className={`mt-1 block rounded-md px-3 py-2 text-sm transition-colors ${
                                isActive
                                  ? "bg-[#156372]/10 font-medium text-[#156372]"
                                  : "text-slate-600 hover:bg-slate-50"
                              }`}
                            >
                              {report.name}
                            </Link>
                          );
                        })}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
    </aside>
  );
}

export default function ExpensesByCategoryReportPage() {
  const navigate = useNavigate();
  const { categoryId, reportId } = useParams();
  const menuButtonRef = useRef<HTMLButtonElement | null>(null);
  const category = getCategoryById(categoryId || "");
  const report = getReportById(categoryId || "", reportId || "");
  const { settings } = useSettings();

  const [isReportsDrawerOpen, setIsReportsDrawerOpen] = useState(false);
  const [selectedRange, setSelectedRange] = useState<DateRangePreset>("This Month");
  const [isDateOpen, setIsDateOpen] = useState(false);
  const [isCustomDateRangeOpen, setIsCustomDateRangeOpen] = useState(false);
  const [dateRangeDraft, setDateRangeDraft] = useState<DateRangePreset>("This Month");
  const [customDateRange, setCustomDateRange] = useState<DateRangeValue>(() => getBounds("This Month"));
  const [customDateRangeDraft, setCustomDateRangeDraft] = useState<DateRangeValue>(() => getBounds("This Month"));
  const [customDateRangeMonth, setCustomDateRangeMonth] = useState<Date>(() => getStartOfMonth(new Date()));
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
  const bounds = useMemo(
    () => (selectedRange === "Custom" ? customDateRange : getBounds(selectedRange)),
    [customDateRange, selectedRange],
  );
  const dateLabel = useMemo(() => `From ${formatDate(bounds.start)} To ${formatDate(bounds.end)}`, [bounds.end, bounds.start]);
  const dateRangeLabel = selectedRange;

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
      if (!dateRef.current?.contains(target)) {
        setIsDateOpen(false);
        setIsCustomDateRangeOpen(false);
      }
      if (!exportRef.current?.contains(target)) setIsExportOpen(false);
      if (!moreFiltersRef.current?.contains(target)) setIsMoreFiltersOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsDateOpen(false);
        setIsCustomDateRangeOpen(false);
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

  function openDateRangeDropdown() {
    if (isDateOpen) {
      setIsDateOpen(false);
      setIsCustomDateRangeOpen(false);
      return;
    }

    const currentRange =
      selectedRange === "Custom" ? customDateRange : getBounds(selectedRange);
    setDateRangeDraft(selectedRange);
    setCustomDateRangeDraft(currentRange);
    setCustomDateRangeMonth(getStartOfMonth(currentRange.start));
    setIsCustomDateRangeOpen(selectedRange === "Custom");
    setIsDateOpen(true);
  }

  function cancelDateRangeSelection() {
    setDateRangeDraft(selectedRange);
    setCustomDateRangeDraft(customDateRange);
    setCustomDateRangeMonth(
      getStartOfMonth(
        selectedRange === "Custom" ? customDateRange.start : getBounds(selectedRange).start,
      ),
    );
    setIsCustomDateRangeOpen(false);
    setIsDateOpen(false);
  }

  function applyCustomDateRange() {
    setCustomDateRange(customDateRangeDraft);
    setSelectedRange("Custom");
    setDateRangeDraft("Custom");
    setIsCustomDateRangeOpen(false);
    setIsDateOpen(false);
  }

  const handleCustomStartDateClick = (date: Date) => {
    setCustomDateRangeDraft((prev) => ({
      start: date,
      end: prev.end < date ? date : prev.end,
    }));
  };

  const handleCustomEndDateClick = (date: Date) => {
    setCustomDateRangeDraft((prev) => ({
      start: prev.start > date ? date : prev.start,
      end: date < prev.start ? prev.start : date,
    }));
  };

  const setLeftCalendarMonth = (monthIndex: number, year: number) => {
    setCustomDateRangeMonth(new Date(year, monthIndex, 1));
  };

  const setRightCalendarMonth = (monthIndex: number, year: number) => {
    setCustomDateRangeMonth(addMonths(new Date(year, monthIndex, 1), -1));
  };

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
      <ReportsDrawer
        open={isReportsDrawerOpen}
        currentCategoryId={category.id}
        currentReportId={report.id}
        triggerRef={menuButtonRef}
        onClose={() => setIsReportsDrawerOpen(false)}
      />
      <div
        className={`pr-3 transition-[padding-left] duration-200 ${
          isReportsDrawerOpen ? "lg:pl-[260px]" : ""
        }`}
      >
        <div className="rounded-lg border border-[#d7dce7] bg-white">
          <div className="flex flex-wrap items-start justify-between gap-4 px-4 py-3">
            <div className="flex min-w-0 items-start gap-3">
              <button
                type="button"
                ref={menuButtonRef}
                onClick={() => setIsReportsDrawerOpen((current) => !current)}
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded border border-[#d4d9e4] bg-white text-[#334155] hover:bg-[#f8fafc]"
                aria-label="Open reports menu"
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
                  <div className="absolute right-0 top-[calc(100%+6px)] z-50 w-[220px] overflow-hidden rounded-lg border border-[#d7dce7] bg-white shadow-[0_10px_24px_rgba(15,23,42,0.12)]">
                    <div className="py-1">
                      {[
                        "PDF",
                        "XLSX (Microsoft Excel)",
                        "Print",
                      ].map((label) => (
                        <button
                          key={label}
                          type="button"
                          onClick={() => handleExport(label)}
                          className="flex w-full items-center px-3 py-2 text-left text-sm text-[#334155] hover:bg-[#f8fafc]"
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
                  onClick={openDateRangeDropdown}
                  className={`inline-flex h-8 items-center gap-1 rounded border px-3 text-sm text-[#334155] hover:bg-white ${
                    isDateOpen ? "border-[#1b6f7b] bg-white" : "border-[#cfd6e4] bg-[#f8fafc]"
                  }`}
                  aria-haspopup="menu"
                  aria-expanded={isDateOpen}
                >
                  <CalendarDays size={14} className="text-[#64748b]" />
                  Date Range : <span className="font-medium">{dateRangeLabel}</span>
                  <ChevronDown size={14} />
                </button>

                {isDateOpen ? (
                  <div
                    className={`absolute left-0 top-[calc(100%+6px)] z-40 overflow-visible rounded-lg border border-[#d7dce7] bg-white shadow-[0_10px_24px_rgba(15,23,42,0.12)] ${
                      isCustomDateRangeOpen ? "w-[680px]" : "w-[165px]"
                    }`}
                  >
                    <div className="flex">
                      <div className="w-[165px] border-r border-[#eef2f7]">
                        <div className="max-h-[280px] overflow-y-auto py-1">
                          {DATE_RANGE_OPTIONS.map((option) => {
                            const isSelected = option.key === dateRangeDraft;
                            return (
                              <button
                                key={option.key}
                                type="button"
                                onClick={() => {
                                  if (option.key === "Custom") {
                                    const currentRange =
                                      selectedRange === "Custom" ? customDateRange : getBounds(selectedRange);
                                    setDateRangeDraft("Custom");
                                    setCustomDateRangeDraft(currentRange);
                                    setCustomDateRangeMonth(getStartOfMonth(currentRange.start));
                                    setIsCustomDateRangeOpen(true);
                                    return;
                                  }

                                  setSelectedRange(option.key);
                                  setDateRangeDraft(option.key);
                                  setIsCustomDateRangeOpen(false);
                                  setIsDateOpen(false);
                                }}
                                className={`flex w-full items-center justify-between px-4 py-2 text-left text-sm ${
                                  isSelected
                                    ? "font-medium text-[#0f172a]"
                                    : "text-[#334155] hover:bg-[#f8fafc]"
                                }`}
                              >
                                <span>{option.label}</span>
                                {isSelected ? <Check size={14} className="text-[#0f172a]" /> : null}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {isCustomDateRangeOpen ? (
                        <div className="flex-1 p-3">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#64748b]">
                                Start Date
                              </div>
                              <div className="relative">
                                <CalendarDays
                                  size={14}
                                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#64748b]"
                                />
                                <input
                                  type="text"
                                  readOnly
                                  value={formatPickerDate(customDateRangeDraft.start)}
                                  className="h-10 w-full rounded border border-[#156372] bg-white pl-9 pr-3 text-sm text-[#334155] outline-none"
                                />
                              </div>
                            </div>
                            <div>
                              <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#64748b]">
                                End Date
                              </div>
                              <div className="relative">
                                <CalendarDays
                                  size={14}
                                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#64748b]"
                                />
                                <input
                                  type="text"
                                  readOnly
                                  value={formatPickerDate(customDateRangeDraft.end)}
                                  className="h-10 w-full rounded border border-[#156372] bg-white pl-9 pr-3 text-sm text-[#334155] outline-none"
                                />
                              </div>
                            </div>
                          </div>

                          <div className="mt-3 grid grid-cols-[1fr_1fr] gap-3">
                            {[
                              { month: customDateRangeMonth, side: "start" as const },
                              { month: addMonths(customDateRangeMonth, 1), side: "end" as const },
                            ].map(({ month, side }) => {
                              const monthLabel = month.toLocaleDateString("en-US", {
                                month: "short",
                                year: "numeric",
                              });
                              const weeks = buildCalendarGrid(month);

                              return (
                                <div
                                  key={`${side}-${monthLabel}`}
                                  className="rounded-lg border border-[#eef2f7] bg-white p-2"
                                >
                                  <div className="mb-2 flex items-center justify-between gap-2 px-1">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setCustomDateRangeMonth((prev) => addMonths(prev, -1))
                                      }
                                      className="inline-flex h-6 w-6 items-center justify-center rounded hover:bg-[#f8fafc]"
                                      aria-label="Previous month"
                                    >
                                      <ChevronRight size={14} className="rotate-180 text-[#64748b]" />
                                    </button>

                                    <div className="flex items-center gap-1">
                                      <select
                                        value={month.getMonth()}
                                        onChange={(event) =>
                                          side === "start"
                                            ? setLeftCalendarMonth(
                                                Number(event.target.value),
                                                month.getFullYear(),
                                              )
                                            : setRightCalendarMonth(
                                                Number(event.target.value),
                                                month.getFullYear(),
                                              )
                                        }
                                        className="h-6 rounded border border-[#cfd6e4] bg-white px-1 text-[11px] text-[#334155] outline-none"
                                      >
                                        {MONTH_NAMES.map((monthName, index) => (
                                          <option key={monthName} value={index}>
                                            {monthName}
                                          </option>
                                        ))}
                                      </select>
                                      <select
                                        value={month.getFullYear()}
                                        onChange={(event) =>
                                          side === "start"
                                            ? setLeftCalendarMonth(
                                                month.getMonth(),
                                                Number(event.target.value),
                                              )
                                            : setRightCalendarMonth(
                                                month.getMonth(),
                                                Number(event.target.value),
                                              )
                                        }
                                        className="h-6 rounded border border-[#cfd6e4] bg-white px-1 text-[11px] text-[#334155] outline-none"
                                      >
                                        {CALENDAR_YEAR_OPTIONS.map((year) => (
                                          <option key={year} value={year}>
                                            {year}
                                          </option>
                                        ))}
                                      </select>
                                    </div>

                                    <button
                                      type="button"
                                      onClick={() =>
                                        setCustomDateRangeMonth((prev) => addMonths(prev, 1))
                                      }
                                      className="inline-flex h-6 w-6 items-center justify-center rounded hover:bg-[#f8fafc]"
                                      aria-label="Next month"
                                    >
                                      <ChevronRight size={14} className="text-[#64748b]" />
                                    </button>
                                  </div>

                                  <table className="w-full table-fixed border-collapse text-center text-[11px]">
                                    <thead>
                                      <tr className="text-[#156372]">
                                        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
                                          <th key={day} className="pb-1 font-semibold">
                                            {day}
                                          </th>
                                        ))}
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {weeks.map((week, weekIndex) => (
                                        <tr key={`${side}-week-${weekIndex}`}>
                                          {week.map((day) => {
                                            const inCurrentMonth = isSameMonth(day, month);
                                            const isStart = isSameDay(day, customDateRangeDraft.start);
                                            const isEnd = isSameDay(day, customDateRangeDraft.end);
                                            const inRange =
                                              day >= customDateRangeDraft.start &&
                                              day <= customDateRangeDraft.end;
                                            const isToday = isSameDay(day, new Date());

                                            return (
                                              <td key={day.toISOString()} className="p-0">
                                                <button
                                                  type="button"
                                                  onClick={() =>
                                                    side === "start"
                                                      ? handleCustomStartDateClick(day)
                                                      : handleCustomEndDateClick(day)
                                                  }
                                                  className={`m-[1px] flex h-7 w-full items-center justify-center rounded text-[11px] ${
                                                    !inCurrentMonth
                                                      ? "text-[#cbd5e1]"
                                                      : isStart || isEnd
                                                        ? "bg-[#156372] font-semibold text-white"
                                                        : inRange
                                                          ? "bg-[#d9eff1] text-[#0f172a]"
                                                          : "text-[#334155] hover:bg-[#f8fafc]"
                                                  } ${
                                                    isToday && !isStart && !isEnd
                                                      ? "ring-1 ring-inset ring-[#156372]/30"
                                                      : ""
                                                  }`}
                                                >
                                                  {day.getDate()}
                                                </button>
                                              </td>
                                            );
                                          })}
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              );
                            })}
                          </div>

                          <div className="mt-3 flex items-center justify-between gap-2">
                            <div className="text-xs text-[#64748b]">
                              {formatPickerDate(customDateRangeDraft.start)} -{" "}
                              {formatPickerDate(customDateRangeDraft.end)}
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={cancelDateRangeSelection}
                                className="inline-flex h-8 items-center rounded border border-[#d4d9e4] bg-white px-3 text-sm text-[#334155] hover:bg-[#f8fafc]"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={applyCustomDateRange}
                                className="inline-flex h-8 items-center rounded bg-[#156372] px-3 text-sm font-semibold text-white hover:bg-[#0f4a52]"
                              >
                                Apply
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : null}
                    </div>
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
                  <Plus size={14} className="text-[#156372]" />
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
                      <button type="button" onClick={() => setCategorySearch("")} className="text-sm text-[#156372] hover:underline">
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
                className="inline-flex h-8 items-center gap-1 rounded bg-[#156372] px-4 text-sm font-semibold text-white hover:bg-[#0f4f5b]"
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
                <div className="mt-1 text-sm text-[#156372]">{dateLabel}</div>
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
                                    cellIndex === 0 ? "font-medium text-[#156372]" : "text-center text-[#334155]"
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
