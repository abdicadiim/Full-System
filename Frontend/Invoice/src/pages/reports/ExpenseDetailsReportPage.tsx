import React, { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { useQuery } from "@tanstack/react-query";
import {
  CalendarDays,
  ChevronDown,
  Columns3,
  Filter,
  Folder,
  Menu,
  Plus,
  RefreshCw,
  X,
} from "lucide-react";
import ReportCustomizeColumnsModal, {
  type ColumnGroup,
} from "./ReportCustomizeColumnsModal";
import { getCategoryById, getReportById } from "./reportsCatalog";
import { useSettings } from "../../lib/settings/SettingsContext";
import { expensesAPI } from "../../services/api";

type DateRangeKey = "today" | "this-month" | "this-quarter" | "this-year" | "all-time" | "custom";
type GroupByKey = "none" | "status" | "category" | "customer-name";
type ColumnKey =
  | "Status"
  | "Date"
  | "Reference#"
  | "Category"
  | "Customer Name"
  | "Amount"
  | "Amount With Tax";
type DateRangeValue = { start: Date; end: Date };
type ExpenseRow = {
  id: string;
  status: string;
  dateValue: Date | null;
  dateLabel: string;
  reference: string;
  category: string;
  customerName: string;
  amount: number;
  amountWithTax: number;
  currency: string;
};

const COLUMNS: ColumnKey[] = [
  "Status",
  "Date",
  "Reference#",
  "Category",
  "Customer Name",
  "Amount",
  "Amount With Tax",
];

const COLUMN_GROUPS: ColumnGroup[] = [{ label: "Reports", items: COLUMNS }];

const DATE_OPTIONS: Array<{ key: DateRangeKey; label: string }> = [
  { key: "today", label: "Today" },
  { key: "this-month", label: "This Month" },
  { key: "this-quarter", label: "This Quarter" },
  { key: "this-year", label: "This Year" },
  { key: "all-time", label: "All Time" },
  { key: "custom", label: "Custom" },
];

const GROUP_OPTIONS: Array<{ key: GroupByKey; label: string }> = [
  { key: "none", label: "None" },
  { key: "status", label: "Status" },
  { key: "category", label: "Category" },
  { key: "customer-name", label: "Customer Name" },
];

const fmtDate = (value: Date) =>
  value.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

const toInputDate = (value: Date) =>
  `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(
    value.getDate(),
  ).padStart(2, "0")}`;

const fromInputDate = (value: string) => {
  const [year, month, day] = value.split("-").map(Number);
  return year && month && day ? new Date(year, month - 1, day) : null;
};

const startOfDay = (value: Date) => new Date(value.getFullYear(), value.getMonth(), value.getDate());
const endOfDay = (value: Date) =>
  new Date(value.getFullYear(), value.getMonth(), value.getDate(), 23, 59, 59, 999);
const startOfMonth = (value: Date) => new Date(value.getFullYear(), value.getMonth(), 1);
const endOfMonth = (value: Date) =>
  new Date(value.getFullYear(), value.getMonth() + 1, 0, 23, 59, 59, 999);
const startOfQuarter = (value: Date) => {
  const month = Math.floor(value.getMonth() / 3) * 3;
  return new Date(value.getFullYear(), month, 1);
};
const endOfQuarter = (value: Date) => {
  const month = Math.floor(value.getMonth() / 3) * 3;
  return new Date(value.getFullYear(), month + 3, 0, 23, 59, 59, 999);
};
const startOfYear = (value: Date) => new Date(value.getFullYear(), 0, 1);
const endOfYear = (value: Date) => new Date(value.getFullYear(), 11, 31, 23, 59, 59, 999);

const toText = (value: unknown) => String(value ?? "").trim();
const toNumber = (value: unknown) => {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};
const normalizeCurrency = (value: unknown) => {
  const raw = toText(value);
  return (raw.split(" - ")[0].split(" ")[0].trim().toUpperCase() || "SOS");
};
const parseDate = (value: unknown) => {
  if (!value) return null;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
};
const extractRows = (response: any) => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.expenses)) return response.expenses;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.data?.data)) return response.data.data;
  return [];
};
const getRange = (key: DateRangeKey, custom: DateRangeValue) => {
  const now = new Date();
  if (key === "today") return { start: startOfDay(now), end: endOfDay(now) };
  if (key === "this-quarter") return { start: startOfQuarter(now), end: endOfQuarter(now) };
  if (key === "this-year") return { start: startOfYear(now), end: endOfYear(now) };
  if (key === "all-time") return { start: new Date(1970, 0, 1), end: endOfYear(new Date(now.getFullYear() + 1, 11, 31)) };
  if (key === "custom") return custom;
  return { start: startOfMonth(now), end: endOfMonth(now) };
};
const inRange = (value: Date, range: DateRangeValue) =>
  value >= startOfDay(range.start) && value <= endOfDay(range.end);
const formatMoney = (value: number, currency: string) =>
  `${normalizeCurrency(currency)}${Number(value || 0).toFixed(2)}`;

export default function ExpenseDetailsReportPage() {
  const navigate = useNavigate();
  const { categoryId, reportId } = useParams();
  const { settings } = useSettings() as any;
  const category = getCategoryById(categoryId || "purchases-expenses");
  const report = getReportById(categoryId || "purchases-expenses", reportId || "expense-details");
  const organizationName = String(
    settings?.general?.companyDisplayName || settings?.general?.schoolDisplayName || "",
  ).trim();

  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isDateOpen, setIsDateOpen] = useState(false);
  const [isMoreFiltersOpen, setIsMoreFiltersOpen] = useState(false);
  const [isGroupByOpen, setIsGroupByOpen] = useState(false);
  const [isCustomizeOpen, setIsCustomizeOpen] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);
  const [dateRangeKey, setDateRangeKey] = useState<DateRangeKey>("this-month");
  const [customDateRange, setCustomDateRange] = useState<DateRangeValue>(() => {
    const now = new Date();
    return { start: startOfMonth(now), end: endOfMonth(now) };
  });
  const [groupBy, setGroupBy] = useState<GroupByKey>("none");
  const [statusFilter, setStatusFilter] = useState("All");
  const [customerFilter, setCustomerFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [referenceFilter, setReferenceFilter] = useState("");
  const [visibleColumns, setVisibleColumns] = useState<ColumnKey[]>(() => {
    try {
      if (typeof window === "undefined") return COLUMNS;
      const raw = window.localStorage.getItem("expense_details_visible_columns_v1");
      const parsed = raw ? JSON.parse(raw) : null;
      if (Array.isArray(parsed) && parsed.every((item) => COLUMNS.includes(item))) {
        return parsed;
      }
    } catch {
      // ignore
    }
    return COLUMNS;
  });

  const range = useMemo(() => getRange(dateRangeKey, customDateRange), [customDateRange, dateRangeKey]);
  const rangeLabel = DATE_OPTIONS.find((option) => option.key === dateRangeKey)?.label ?? "This Month";

  const query = useQuery({
    queryKey: ["reports", "expense-details", refreshTick],
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const response = await expensesAPI.getAll({ limit: 1000 });
      const items = extractRows(response);
      return {
        rows: items.map((expense: any): ExpenseRow => {
          const dateValue = parseDate(expense.date || expense.expense_date || expense.createdAt || expense.created_at);
          const amount = toNumber(expense.sub_total ?? expense.subTotal ?? expense.amount ?? expense.total ?? 0);
          const taxAmount = toNumber(expense.tax_amount ?? expense.taxAmount ?? expense.total_tax ?? expense.tax ?? 0);
          const amountWithTax = toNumber(expense.total ?? expense.amount_with_tax ?? expense.amountWithTax ?? amount + taxAmount);

          return {
            id: String(expense._id || expense.id || expense.expense_id || `${expense.reference_number || ""}-${expense.date || ""}`),
            status: toText(expense.status || expense.expense_status || expense.state || "—").toUpperCase() || "—",
            dateValue,
            dateLabel: dateValue ? fmtDate(dateValue) : "—",
            reference: toText(expense.reference_number || expense.reference || expense.reference_no || expense.ref_no || "—") || "—",
            category: toText(expense.category_name || expense.categoryName || expense.account_name || expense.expenseAccount || expense.expense_account_name || expense.category || "—") || "—",
            customerName: toText(expense.customer_name || expense.customerName || expense.customer?.name || expense.customer?.displayName || "—") || "—",
            amount,
            amountWithTax,
            currency: normalizeCurrency(expense.currency_code || expense.currencyCode || expense.currency || "SOS"),
          };
        }),
      };
    },
  });

  const filteredRows = useMemo(() => {
    const rows = query.data?.rows || [];
    return rows
      .filter((row) => row.dateValue && inRange(row.dateValue, range))
      .filter((row) => (statusFilter === "All" ? true : row.status.toLowerCase().includes(statusFilter.toLowerCase())))
      .filter((row) => (customerFilter.trim() ? row.customerName.toLowerCase().includes(customerFilter.trim().toLowerCase()) : true))
      .filter((row) => (categoryFilter.trim() ? row.category.toLowerCase().includes(categoryFilter.trim().toLowerCase()) : true))
      .filter((row) => (referenceFilter.trim() ? row.reference.toLowerCase().includes(referenceFilter.trim().toLowerCase()) : true))
      .sort((a, b) => (b.dateValue?.getTime() || 0) - (a.dateValue?.getTime() || 0));
  }, [categoryFilter, customerFilter, query.data?.rows, range, referenceFilter, statusFilter]);

  const groupedRows = useMemo(() => {
    if (groupBy === "none") return [{ label: "All Expenses", rows: filteredRows }];
    const map = new Map<string, ExpenseRow[]>();
    filteredRows.forEach((row) => {
      const key =
        groupBy === "status" ? row.status :
        groupBy === "category" ? row.category :
        row.customerName;
      const next = map.get(key || "Unassigned") || [];
      next.push(row);
      map.set(key || "Unassigned", next);
    });
    return Array.from(map.entries()).sort(([left], [right]) => left.localeCompare(right)).map(([label, rows]) => ({ label, rows }));
  }, [filteredRows, groupBy]);

  useEffect(() => {
    try {
      if (typeof window === "undefined") return;
      window.localStorage.setItem("expense_details_visible_columns_v1", JSON.stringify(visibleColumns));
    } catch {
      // ignore
    }
  }, [visibleColumns]);

  if (!report || !category) {
    return <Navigate to="/reports" replace />;
  }

  const runReport = () => {
    setRefreshTick((value) => value + 1);
    setIsMoreFiltersOpen(false);
    toast.success("Report refreshed");
  };

  const handleExport = (label: string) => {
    setIsExportOpen(false);
    toast.info(`${label} export started`);
  };

  const toggleDate = () => {
    setIsDateOpen((prev) => !prev);
    setIsMoreFiltersOpen(false);
    setIsGroupByOpen(false);
    setIsExportOpen(false);
  };

  const toggleGroupBy = () => {
    setIsGroupByOpen((prev) => !prev);
    setIsDateOpen(false);
    setIsMoreFiltersOpen(false);
    setIsExportOpen(false);
  };

  const dateRangeText = `${fmtDate(range.start)} To ${fmtDate(range.end)}`;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#e5e7eb] pb-3">
        <div className="flex min-w-0 items-start gap-3">
          <button
            type="button"
            onClick={() => navigate("/reports")}
            className="inline-flex h-8 w-8 items-center justify-center rounded border border-[#d4d9e4] bg-white text-[#334155] hover:bg-[#f8fafc]"
            aria-label="Toggle reports menu"
          >
            <Menu size={15} />
          </button>
          <div>
            <p className="text-sm font-medium text-[#1b6f7b]">{category.name}</p>
            <h1 className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-1 text-[24px] font-semibold leading-tight text-[#0f172a]">
              <span>{report.name}</span>
              <span className="text-sm font-normal text-[#475569]">- From {dateRangeText}</span>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsExportOpen((prev) => !prev)}
              className={`inline-flex h-9 items-center gap-1 rounded border bg-white px-3 text-sm font-medium text-[#1e293b] hover:bg-[#f8fafc] ${
                isExportOpen ? "border-[#1b6f7b]" : "border-[#d4d9e4]"
              }`}
            >
              Export <ChevronDown size={14} className={isExportOpen ? "rotate-180" : ""} />
            </button>
            {isExportOpen ? (
              <div className="absolute right-0 top-[calc(100%+6px)] z-50 w-[220px] overflow-hidden rounded-lg border border-[#d7dce7] bg-white shadow-[0_10px_24px_rgba(15,23,42,0.12)]">
                {["PDF", "XLSX", "CSV", "Print"].map((label) => (
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
            ) : null}
          </div>

          <button
            type="button"
            onClick={runReport}
            className="inline-flex h-9 w-9 items-center justify-center rounded border border-[#d4d9e4] text-[#334155] hover:bg-[#f8fafc]"
            aria-label="Refresh report"
          >
            <RefreshCw size={15} />
          </button>

          <button
            type="button"
            onClick={() => navigate("/reports")}
            className="inline-flex h-9 w-9 items-center justify-center rounded border border-[#d4d9e4] text-[#ef4444] hover:bg-[#fef2f2]"
            aria-label="Close report page"
          >
            <X size={15} />
          </button>
        </div>
      </div>

      <div className="relative flex flex-wrap items-center gap-2 border-b border-[#e6e9f0] pb-3 text-sm">
        <span className="inline-flex items-center gap-1 text-[#334155]">
          <Filter size={14} className="text-[#64748b]" />
          <span>Filters :</span>
        </span>

        <div className="relative">
          <button
            type="button"
            onClick={toggleDate}
            className={`inline-flex h-8 items-center gap-1 rounded border px-3 text-sm text-[#334155] hover:bg-white ${
              isDateOpen ? "border-[#1b6f7b] bg-white" : "border-[#cfd6e4] bg-[#f8fafc]"
            }`}
          >
            <CalendarDays size={14} className="text-[#64748b]" />
            Date Range : <span className="font-medium">{rangeLabel}</span>
            <ChevronDown size={14} />
          </button>
          {isDateOpen ? (
            <div className="absolute left-0 top-[calc(100%+6px)] z-40 w-[280px] overflow-hidden rounded-lg border border-[#d7dce7] bg-white shadow-[0_10px_24px_rgba(15,23,42,0.12)]">
              <div className="max-h-[210px] overflow-y-auto py-1">
                {DATE_OPTIONS.map((option) => (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => {
                      setDateRangeKey(option.key);
                      if (option.key !== "custom") setIsDateOpen(false);
                    }}
                    className={`flex w-full items-center justify-between px-4 py-2 text-left text-sm ${
                      option.key === dateRangeKey ? "font-medium text-[#0f172a]" : "text-[#334155] hover:bg-[#f8fafc]"
                    }`}
                  >
                    <span>{option.label}</span>
                    {option.key === dateRangeKey ? <span className="text-[#1b6f7b]">●</span> : null}
                  </button>
                ))}
              </div>

              {dateRangeKey === "custom" ? (
                <div className="border-t border-[#eef2f7] p-3">
                  <div className="grid gap-3">
                    <label className="block">
                      <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#64748b]">
                        Start Date
                      </div>
                      <input
                        type="date"
                        value={toInputDate(customDateRange.start)}
                        onChange={(event) => {
                          const next = fromInputDate(event.target.value);
                          if (next) setCustomDateRange((prev) => ({ start: next, end: prev.end < next ? next : prev.end }));
                        }}
                        className="h-9 w-full rounded border border-[#cfd6e4] bg-white px-3 text-sm text-[#334155] outline-none focus:border-[#1b6f7b]"
                      />
                    </label>
                    <label className="block">
                      <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#64748b]">
                        End Date
                      </div>
                      <input
                        type="date"
                        value={toInputDate(customDateRange.end)}
                        onChange={(event) => {
                          const next = fromInputDate(event.target.value);
                          if (next) setCustomDateRange((prev) => ({ start: prev.start > next ? next : prev.start, end: next }));
                        }}
                        className="h-9 w-full rounded border border-[#cfd6e4] bg-white px-3 text-sm text-[#334155] outline-none focus:border-[#1b6f7b]"
                      />
                    </label>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        <button
          type="button"
          onClick={() => {
            setIsMoreFiltersOpen((prev) => !prev);
            setIsDateOpen(false);
            setIsGroupByOpen(false);
            setIsExportOpen(false);
          }}
          className={`inline-flex h-8 items-center gap-1 rounded border px-3 text-sm text-[#334155] hover:bg-white ${
            isMoreFiltersOpen ? "border-[#1b6f7b] bg-white" : "border-[#cfd6e4] bg-[#f8fafc]"
          }`}
        >
          <Plus size={14} className="text-[#1b6f7b]" />
          More Filters
        </button>

        <button
          type="button"
          onClick={runReport}
          className="inline-flex h-8 items-center gap-1 rounded bg-[#1b6f7b] px-4 text-sm font-semibold text-white hover:bg-[#155963]"
        >
          <CalendarDays size={14} /> Run Report
        </button>

        {isMoreFiltersOpen ? (
          <div className="absolute left-0 top-[calc(100%+6px)] z-40 w-[360px] rounded-lg border border-[#d7dce7] bg-white p-4 shadow-[0_10px_24px_rgba(15,23,42,0.12)]">
            <div className="grid gap-3">
              <label className="block">
                <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#64748b]">Status</div>
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  className="h-9 w-full rounded border border-[#cfd6e4] bg-white px-3 text-sm text-[#334155] outline-none focus:border-[#1b6f7b]"
                >
                  {["All", "Draft", "Pending", "Approved", "Paid", "Voided"].map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#64748b]">Customer Name</div>
                <input
                  value={customerFilter}
                  onChange={(event) => setCustomerFilter(event.target.value)}
                  className="h-9 w-full rounded border border-[#cfd6e4] bg-white px-3 text-sm text-[#334155] outline-none focus:border-[#1b6f7b]"
                />
              </label>
              <label className="block">
                <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#64748b]">Category</div>
                <input
                  value={categoryFilter}
                  onChange={(event) => setCategoryFilter(event.target.value)}
                  className="h-9 w-full rounded border border-[#cfd6e4] bg-white px-3 text-sm text-[#334155] outline-none focus:border-[#1b6f7b]"
                />
              </label>
              <label className="block">
                <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#64748b]">Reference#</div>
                <input
                  value={referenceFilter}
                  onChange={(event) => setReferenceFilter(event.target.value)}
                  className="h-9 w-full rounded border border-[#cfd6e4] bg-white px-3 text-sm text-[#334155] outline-none focus:border-[#1b6f7b]"
                />
              </label>
              <div className="flex items-center justify-between gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setStatusFilter("All");
                    setCustomerFilter("");
                    setCategoryFilter("");
                    setReferenceFilter("");
                  }}
                  className="text-sm font-medium text-[#1b6f7b] hover:underline"
                >
                  Clear Filters
                </button>
                <button
                  type="button"
                  onClick={runReport}
                  className="inline-flex h-8 items-center rounded bg-[#1b6f7b] px-4 text-sm font-semibold text-white hover:bg-[#155963]"
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <div className="rounded-lg border border-[#e5e7eb] bg-white">
        <div className="flex items-center justify-end gap-3 border-b border-[#eef2f7] px-4 py-3">
          <div className="relative">
            <button
              type="button"
              onClick={toggleGroupBy}
              className="inline-flex h-8 items-center gap-1 rounded border border-[#d4d9e4] bg-white px-3 text-sm text-[#334155] hover:bg-[#f8fafc]"
            >
              <Folder size={14} className="text-[#64748b]" />
              Group By : <span className="font-medium text-[#0f172a]">{GROUP_OPTIONS.find((option) => option.key === groupBy)?.label ?? "None"}</span>
              <ChevronDown size={14} />
            </button>
            {isGroupByOpen ? (
              <div className="absolute right-0 top-[calc(100%+6px)] z-40 w-[220px] overflow-hidden rounded-lg border border-[#d7dce7] bg-white shadow-[0_10px_24px_rgba(15,23,42,0.12)]">
                {GROUP_OPTIONS.map((option) => (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => {
                      setGroupBy(option.key);
                      setIsGroupByOpen(false);
                    }}
                    className={`flex w-full items-center justify-between px-4 py-2 text-left text-sm ${
                      groupBy === option.key ? "font-medium text-[#0f172a]" : "text-[#334155] hover:bg-[#f8fafc]"
                    }`}
                  >
                    <span>{option.label}</span>
                    {groupBy === option.key ? <span className="text-[#1b6f7b]">●</span> : null}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <button
            type="button"
            onClick={() => setIsCustomizeOpen(true)}
            className="inline-flex h-8 items-center gap-1 rounded border border-[#d4d9e4] bg-white px-3 text-sm text-[#334155] hover:bg-[#f8fafc]"
          >
            <Columns3 size={14} />
            Customize Report Columns
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#d9eff1] px-1 text-[11px] font-semibold text-[#1b6f7b]">
              {visibleColumns.length}
            </span>
          </button>
        </div>

        <div className="px-4 py-8 text-center">
          <div className="text-[14px] text-[#64748b]">{organizationName || "Organization"}</div>
          <div className="mt-1 text-[20px] font-medium text-[#111827]">{report.name}</div>
          <div className="mt-1 text-[14px] text-[#2563eb]">{dateRangeText}</div>
        </div>

        <div className="overflow-x-auto border-t border-[#eef2f7]">
          <table className="min-w-full border-collapse">
            <thead>
              <tr className="border-b border-[#e5e7eb] text-left text-[11px] uppercase tracking-[0.08em] text-[#64748b]">
                {visibleColumns.map((column) => (
                  <th
                    key={column}
                    className={`px-4 py-3 font-semibold ${
                      column === "Amount" || column === "Amount With Tax" ? "text-right" : "text-left"
                    }`}
                  >
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {query.isLoading ? (
                <tr className="border-b border-[#eef2f7]">
                  <td className="px-4 py-8 text-center text-sm text-[#64748b]" colSpan={visibleColumns.length}>
                    Loading report data...
                  </td>
                </tr>
              ) : query.isError ? (
                <tr className="border-b border-[#eef2f7]">
                  <td className="px-4 py-8 text-center text-sm text-[#b91c1c]" colSpan={visibleColumns.length}>
                    {query.error instanceof Error ? query.error.message : "Failed to load expense details"}
                  </td>
                </tr>
              ) : filteredRows.length === 0 ? (
                <tr className="border-b border-[#eef2f7]">
                  <td className="px-4 py-8 text-center text-sm text-[#64748b]" colSpan={visibleColumns.length}>
                    There are no transactions during the selected date range.
                  </td>
                </tr>
              ) : (
                groupedRows.map((group) => (
                  <React.Fragment key={group.label}>
                    {groupBy !== "none" ? (
                      <tr className="bg-[#f8fafc]">
                        <td className="px-4 py-2 text-[12px] font-semibold text-[#334155]" colSpan={visibleColumns.length}>
                          {group.label}
                          <span className="ml-2 font-normal text-[#64748b]">({group.rows.length})</span>
                        </td>
                      </tr>
                    ) : null}
                    {group.rows.map((row) => (
                      <tr key={row.id} className="border-b border-[#eef2f7]">
                        {visibleColumns.map((column) => (
                          <td
                            key={`${row.id}-${column}`}
                            className={`px-4 py-3 text-sm text-[#334155] ${
                              column === "Amount" || column === "Amount With Tax" ? "text-right" : "text-left"
                            }`}
                          >
                            {column === "Status"
                              ? row.status
                              : column === "Date"
                                ? row.dateLabel
                                : column === "Reference#"
                                  ? row.reference
                                  : column === "Category"
                                    ? row.category
                                    : column === "Customer Name"
                                      ? row.customerName
                                      : column === "Amount"
                                        ? formatMoney(row.amount, row.currency)
                                        : formatMoney(row.amountWithTax, row.currency)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ReportCustomizeColumnsModal
        open={isCustomizeOpen}
        reportName={report.name}
        availableGroups={COLUMN_GROUPS}
        selectedColumns={visibleColumns}
        onClose={() => setIsCustomizeOpen(false)}
        onSave={(nextVisibleColumns) => {
          const next = nextVisibleColumns.filter((item): item is ColumnKey => COLUMNS.includes(item as ColumnKey));
          if (next.length > 0) setVisibleColumns(next);
          setIsCustomizeOpen(false);
        }}
      />
    </div>
  );
}
