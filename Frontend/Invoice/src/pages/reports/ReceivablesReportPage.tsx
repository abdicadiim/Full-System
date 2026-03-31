import React, { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { CalendarDays, Check, ChevronDown, Columns3, Filter, Plus, RefreshCw, Search, SlidersHorizontal, X } from "lucide-react";
import { getReportById } from "./reportsCatalog";
import { useSettings } from "../../lib/settings/SettingsContext";
import { reportsAPI } from "../../services/api";

type ReceivablesReportId = "ar-aging-summary" | "ar-aging-details" | "invoice-details";

type ReportRow = { values: Record<string, any> };

type ColumnKind = "text" | "number" | "currency" | "date";
type ColumnOption = { key: string; label: string; kind: ColumnKind; locked?: boolean };
type ColumnGroup = { label: string; options: ColumnOption[] };
type FilterOption = { key: string; label: string; values?: FilterOption[] };
type FilterGroup = { label: string; options: FilterOption[] };
type FilterRow = { id: string; field: string; comparator: string; value: string };
type DateRangeKey =
  | "today"
  | "this-week"
  | "this-month"
  | "this-quarter"
  | "this-year"
  | "yesterday"
  | "previous-week"
  | "previous-month"
  | "previous-quarter"
  | "previous-year"
  | "custom";
type ReportPayload = { rows: ReportRow[]; totals?: Record<string, any>; currency?: string };

type ReportConfig = {
  fetcher: (params?: Record<string, any>) => Promise<any>;
  title: string;
  subtitleMode: "as-of" | "from-to";
  defaultRange: "today" | "this-month";
  showEntities: boolean;
  showReportBy: boolean;
  showAgingBy: boolean;
  rightControls: Array<{ label: string; state: "groupBy" | "showBy" | "agingIntervals"; options: FilterOption[] }>;
  moreFilterGroups: FilterGroup[];
  moreFilterValues: Record<string, FilterOption[]>;
  columns: ColumnGroup[];
  defaultColumns: string[];
};

const DATE_RANGE_OPTIONS = [
  { key: "today", label: "Today" },
  { key: "this-week", label: "This Week" },
  { key: "this-month", label: "This Month" },
  { key: "this-quarter", label: "This Quarter" },
  { key: "this-year", label: "This Year" },
  { key: "yesterday", label: "Yesterday" },
  { key: "previous-week", label: "Previous Week" },
  { key: "previous-month", label: "Previous Month" },
  { key: "previous-quarter", label: "Previous Quarter" },
  { key: "previous-year", label: "Previous Year" },
  { key: "custom", label: "Custom" },
] as const;

const COMPARATORS = [
  { key: "is-empty", label: "is empty" },
  { key: "is-not-empty", label: "is not empty" },
  { key: "is-in", label: "is in" },
  { key: "is-not-in", label: "is not in" },
  { key: "starts-with", label: "starts with" },
  { key: "ends-with", label: "ends with" },
  { key: "contains", label: "contains" },
  { key: "does-not-contain", label: "doesn't contain" },
] as const;

const NO_VALUE = new Set(["is-empty", "is-not-empty"]);
const CURRENCY_CODES = ["SOS", "USD", "EUR", "GBP", "KES"];
const ENTITY_OPTIONS = [{ key: "invoice", label: "Invoice" }];

const formatDate = (d: Date) => d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
const toInputDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const inputDate = toInputDate;
const parseInputDate = (value: string) => {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d);
};
const currencyValue = (value: any, currency = "SOS") => {
  const num = Number(value ?? 0);
  return Number.isNaN(num) ? String(value ?? "") : `${num < 0 ? `${currency}-` : currency}${Math.abs(num).toFixed(2)}`;
};
const numberValue = (value: any) => {
  const num = Number(value ?? 0);
  return Number.isNaN(num) ? String(value ?? "") : num.toLocaleString("en-US");
};
const dateValue = (value: any) => {
  const date = new Date(String(value ?? ""));
  return Number.isNaN(date.getTime()) ? String(value ?? "") : formatDate(date);
};

const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const endOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

const getRange = (key: string) => {
  const today = new Date();
  if (key === "yesterday") {
    const d = new Date(today);
    d.setDate(d.getDate() - 1);
    return { start: startOf(d), end: endOf(d) };
  }
  if (key === "this-week") {
    const s = startOf(today);
    s.setDate(s.getDate() - s.getDay());
    const e = endOf(s);
    e.setDate(e.getDate() + 6);
    return { start: s, end: e };
  }
  if (key === "this-month") return { start: new Date(today.getFullYear(), today.getMonth(), 1), end: new Date(today.getFullYear(), today.getMonth() + 1, 0) };
  if (key === "this-quarter") {
    const q = Math.floor(today.getMonth() / 3) * 3;
    return { start: new Date(today.getFullYear(), q, 1), end: new Date(today.getFullYear(), q + 3, 0) };
  }
  if (key === "this-year") return { start: new Date(today.getFullYear(), 0, 1), end: new Date(today.getFullYear(), 11, 31) };
  if (key === "previous-week") {
    const d = new Date(today);
    d.setDate(d.getDate() - 7);
    const s = startOf(d);
    s.setDate(s.getDate() - s.getDay());
    const e = endOf(s);
    e.setDate(e.getDate() + 6);
    return { start: s, end: e };
  }
  if (key === "previous-month") return { start: new Date(today.getFullYear(), today.getMonth() - 1, 1), end: new Date(today.getFullYear(), today.getMonth(), 0) };
  if (key === "previous-quarter") {
    const q = Math.floor((today.getMonth() - 3) / 3) * 3;
    return { start: new Date(today.getFullYear(), q, 1), end: new Date(today.getFullYear(), q + 3, 0) };
  }
  if (key === "previous-year") return { start: new Date(today.getFullYear() - 1, 0, 1), end: new Date(today.getFullYear() - 1, 11, 31) };
  return { start: startOf(today), end: endOf(today) };
};

const makeId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const RECEIVABLES_CONFIG: Record<ReceivablesReportId, ReportConfig> = {
  "ar-aging-summary": {
    fetcher: reportsAPI.getARAgingSummary,
    title: "AR Aging Summary By Invoice Due Date",
    subtitleMode: "as-of",
    defaultRange: "today",
    showEntities: true,
    showReportBy: false,
    showAgingBy: true,
    rightControls: [
      {
        label: "Group By",
        state: "groupBy",
        options: [
          { key: "none", label: "None" },
          { key: "customer-name", label: "Customer Name" },
          { key: "currency", label: "Currency" },
        ],
      },
      {
        label: "Show By",
        state: "showBy",
        options: [
          { key: "outstanding-invoice-amount", label: "Outstanding Invoice Amount" },
          { key: "balance-due", label: "Balance Due" },
        ],
      },
      {
        label: "Aging Intervals",
        state: "agingIntervals",
        options: [
          { key: "4x15", label: "4 X 15 Days" },
          { key: "5x30", label: "5 X 30 Days" },
        ],
      },
    ],
    moreFilterGroups: [
      {
        label: "Reports",
        options: [
          { key: "customer-name", label: "Customer Name" },
          { key: "currency", label: "Currency", values: CURRENCY_CODES.map((value) => ({ key: value, label: value })) },
          { key: "current", label: "Current" },
          { key: "1-15-days", label: "1-15 Days" },
          { key: "16-30-days", label: "16-30 Days" },
          { key: "31-45-days", label: "31-45 Days" },
          { key: "gt-45-days", label: "> 45 Days" },
          { key: "total", label: "Total" },
          { key: "total-fcy", label: "Total (FCY)" },
        ],
      },
      {
        label: "Locations",
        options: [{ key: "location", label: "Location", values: [{ key: "mogadishu", label: "Mogadishu" }, { key: "hargeisa", label: "Hargeisa" }] }],
      },
    ],
    moreFilterValues: {
      currency: CURRENCY_CODES.map((value) => ({ key: value, label: value })),
      location: [{ key: "mogadishu", label: "Mogadishu" }, { key: "hargeisa", label: "Hargeisa" }],
    },
    columns: [
      {
        label: "Reports",
        options: [
          { key: "name", label: "Customer Name", kind: "text", locked: true },
          { key: "current", label: "Current", kind: "currency" },
          { key: "1-15-days", label: "1-15 Days", kind: "currency" },
          { key: "16-30-days", label: "16-30 Days", kind: "currency" },
          { key: "31-45-days", label: "31-45 Days", kind: "currency" },
          { key: "gt-45-days", label: "> 45 Days", kind: "currency" },
          { key: "total", label: "Total", kind: "currency" },
          { key: "total-fcy", label: "Total (FCY)", kind: "currency" },
        ],
      },
    ],
    defaultColumns: ["name", "current", "1-15-days", "16-30-days", "31-45-days", "gt-45-days", "total", "total-fcy"],
  },
  "ar-aging-details": {
    fetcher: reportsAPI.getARAgingDetails,
    title: "AR Aging Details By Invoice Due Date",
    subtitleMode: "as-of",
    defaultRange: "today",
    showEntities: true,
    showReportBy: false,
    showAgingBy: true,
    rightControls: [
      {
        label: "Group By",
        state: "groupBy",
        options: [
          { key: "none", label: "None" },
          { key: "customer-name", label: "Customer Name" },
          { key: "status", label: "Status" },
        ],
      },
      {
        label: "Aging Intervals",
        state: "agingIntervals",
        options: [
          { key: "4x15", label: "4 X 15 Days" },
          { key: "5x30", label: "5 X 30 Days" },
        ],
      },
    ],
    moreFilterGroups: [
      {
        label: "Reports",
        options: [
          { key: "date", label: "Date" },
          { key: "due-date", label: "Due Date" },
          { key: "transaction", label: "Transaction" },
          { key: "type", label: "Type", values: [{ key: "invoice", label: "Invoice" }, { key: "debit-note", label: "Debit Note" }, { key: "credit-note", label: "Credit Note" }] },
          { key: "status", label: "Status", values: [{ key: "paid", label: "Paid" }, { key: "overdue", label: "Overdue" }, { key: "draft", label: "Draft" }] },
          { key: "customer-name", label: "Customer Name" },
          { key: "age", label: "Age" },
          { key: "amount", label: "Amount" },
          { key: "balance-due", label: "Balance Due" },
          { key: "currency", label: "Currency", values: CURRENCY_CODES.map((value) => ({ key: value, label: value })) },
        ],
      },
      {
        label: "Locations",
        options: [{ key: "location", label: "Location", values: [{ key: "mogadishu", label: "Mogadishu" }, { key: "hargeisa", label: "Hargeisa" }] }],
      },
    ],
    moreFilterValues: {
      type: [{ key: "invoice", label: "Invoice" }, { key: "debit-note", label: "Debit Note" }, { key: "credit-note", label: "Credit Note" }],
      status: [{ key: "paid", label: "Paid" }, { key: "overdue", label: "Overdue" }, { key: "draft", label: "Draft" }],
      currency: CURRENCY_CODES.map((value) => ({ key: value, label: value })),
      location: [{ key: "mogadishu", label: "Mogadishu" }, { key: "hargeisa", label: "Hargeisa" }],
    },
    columns: [
      {
        label: "Reports",
        options: [
          { key: "date", label: "Date", kind: "date", locked: true },
          { key: "due-date", label: "Due Date", kind: "date" },
          { key: "transaction", label: "Transaction", kind: "text" },
          { key: "type", label: "Type", kind: "text" },
          { key: "status", label: "Status", kind: "text" },
          { key: "customer-name", label: "Customer Name", kind: "text" },
          { key: "age", label: "Age", kind: "text" },
          { key: "amount", label: "Amount", kind: "currency" },
          { key: "balance-due", label: "Balance Due", kind: "currency" },
        ],
      },
    ],
    defaultColumns: ["date", "due-date", "transaction", "type", "status", "customer-name", "age", "amount", "balance-due"],
  },
  "invoice-details": {
    fetcher: reportsAPI.getInvoiceDetails,
    title: "Invoice Details",
    subtitleMode: "from-to",
    defaultRange: "this-month",
    showEntities: false,
    showReportBy: true,
    showAgingBy: false,
    rightControls: [
      {
        label: "Group By",
        state: "groupBy",
        options: [
          { key: "none", label: "None" },
          { key: "customer-name", label: "Customer Name" },
          { key: "status", label: "Status" },
        ],
      },
    ],
    moreFilterGroups: [
      {
        label: "Reports",
        options: [
          { key: "status", label: "Status", values: [{ key: "paid", label: "Paid" }, { key: "overdue", label: "Overdue" }, { key: "draft", label: "Draft" }] },
          { key: "invoice-date", label: "Invoice Date" },
          { key: "due-date", label: "Due Date" },
          { key: "invoice-number", label: "Invoice#" },
          { key: "order-number", label: "Order Number" },
          { key: "customer-name", label: "Customer Name" },
          { key: "total", label: "Total" },
          { key: "balance", label: "Balance" },
          { key: "currency", label: "Currency", values: CURRENCY_CODES.map((value) => ({ key: value, label: value })) },
        ],
      },
      {
        label: "Locations",
        options: [{ key: "location", label: "Location", values: [{ key: "mogadishu", label: "Mogadishu" }, { key: "hargeisa", label: "Hargeisa" }] }],
      },
    ],
    moreFilterValues: {
      status: [{ key: "paid", label: "Paid" }, { key: "overdue", label: "Overdue" }, { key: "draft", label: "Draft" }],
      currency: CURRENCY_CODES.map((value) => ({ key: value, label: value })),
      location: [{ key: "mogadishu", label: "Mogadishu" }, { key: "hargeisa", label: "Hargeisa" }],
    },
    columns: [
      {
        label: "Reports",
        options: [
          { key: "status", label: "Status", kind: "text", locked: true },
          { key: "invoice-date", label: "Invoice Date", kind: "date" },
          { key: "due-date", label: "Due Date", kind: "date" },
          { key: "invoice-number", label: "Invoice#", kind: "text" },
          { key: "order-number", label: "Order Number", kind: "text" },
          { key: "customer-name", label: "Customer Name", kind: "text" },
          { key: "total", label: "Total", kind: "currency" },
          { key: "balance", label: "Balance", kind: "currency" },
        ],
      },
    ],
    defaultColumns: ["status", "invoice-date", "due-date", "invoice-number", "order-number", "customer-name", "total", "balance"],
  },
};

const columnLookup = (reportId: ReceivablesReportId, key: string) =>
  RECEIVABLES_CONFIG[reportId].columns.flatMap((group) => group.options).find((option) => option.key === key);

const fieldLookup = (config: ReportConfig, key: string) => config.moreFilterGroups.flatMap((group) => group.options).find((option) => option.key === key);

const makeFilterRow = (): FilterRow => ({ id: makeId(), field: "", comparator: "", value: "" });

export default function ReceivablesReportPage({ reportId }: { reportId: ReceivablesReportId }) {
  if (!getReportById(reportId)) return <Navigate to="/reports" replace />;
  return <ReceivablesReportShell reportId={reportId} />;
}

function ReceivablesReportShell({ reportId }: { reportId: ReceivablesReportId }) {
  const config = RECEIVABLES_CONFIG[reportId];
  const navigate = useNavigate();
  const { settings } = useSettings();
  const organizationName = String(settings?.general?.companyDisplayName || settings?.general?.schoolDisplayName || "").trim();

  const [rangeKey, setRangeKey] = useState<DateRangeKey>(config.defaultRange);
  const [customStart, setCustomStart] = useState(inputDate(getRange(config.defaultRange).start));
  const [customEnd, setCustomEnd] = useState(inputDate(getRange(config.defaultRange).end));
  const [entities, setEntities] = useState("invoice");
  const [agingBy, setAgingBy] = useState("invoice-due-date");
  const [reportBy, setReportBy] = useState("invoice-date");
  const [groupBy, setGroupBy] = useState(config.rightControls[0]?.options[0]?.key || "none");
  const [showBy, setShowBy] = useState(config.rightControls.find((item) => item.state === "showBy")?.options[0]?.key || "outstanding-invoice-amount");
  const [agingIntervals, setAgingIntervals] = useState(config.rightControls.find((item) => item.state === "agingIntervals")?.options[0]?.key || "4x15");
  const [moreFiltersOpen, setMoreFiltersOpen] = useState(false);
  const [moreFilters, setMoreFilters] = useState<FilterRow[]>([]);
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [selectedColumns, setSelectedColumns] = useState<string[]>(config.defaultColumns);
  const [columnDraft, setColumnDraft] = useState<string[]>(config.defaultColumns);
  const [columnSearch, setColumnSearch] = useState("");
  const [activeAvailableColumn, setActiveAvailableColumn] = useState(config.defaultColumns[0] || "");
  const [payload, setPayload] = useState<ReportPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [refreshTick, setRefreshTick] = useState(0);

  const range = rangeKey === "custom" ? { start: parseInputDate(customStart), end: parseInputDate(customEnd) } : getRange(rangeKey);
  const dateLabel = config.subtitleMode === "as-of" ? `As of ${formatDate(range.end)}` : `From ${formatDate(range.start)} To ${formatDate(range.end)}`;
  const visibleColumns = useMemo(
    () => selectedColumns.map((key) => columnLookup(reportId, key)).filter(Boolean) as ColumnOption[],
    [reportId, selectedColumns]
  );

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const params: Record<string, any> = {
          fromDate: range.start.toISOString(),
          toDate: range.end.toISOString(),
          compareWith: "none",
          compareCount: 1,
          moreFilters: JSON.stringify(moreFilters.filter((row) => row.field && row.comparator)),
          groupBy,
          showBy,
          agingIntervals,
        };
        if (config.showEntities) params.entities = entities;
        if (config.showAgingBy) params.agingBy = agingBy;
        if (config.showReportBy) params.reportBy = reportBy;
        const response = await config.fetcher(params);
        setPayload(response?.data ?? null);
      } catch (err: any) {
        setError(String(err?.message || "Failed to load report"));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [agingBy, agingIntervals, config, entities, groupBy, moreFilters, range.start, range.end, refreshTick, reportBy, showBy]);

  const formatCell = (column: ColumnOption, value: any) => {
    if (value === null || value === undefined || value === "") return "—";
    if (column.kind === "currency") return currencyValue(value, String(payload?.currency || "SOS"));
    if (column.kind === "number") return numberValue(value);
    if (column.kind === "date") return dateValue(value);
    return String(value);
  };

  const addFilterRow = () => setMoreFilters((rows) => [...rows, makeFilterRow()]);
  const updateFilterRow = (id: string, patch: Partial<FilterRow>) => setMoreFilters((rows) => rows.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  const removeFilterRow = (id: string) => setMoreFilters((rows) => rows.filter((row) => row.id !== id));
  const openColumns = () => {
    setColumnDraft(selectedColumns);
    setColumnsOpen(true);
  };
  const applyColumns = () => {
    const next = columnDraft.filter((key) => columnLookup(reportId, key));
    setSelectedColumns(next.length ? next : config.defaultColumns);
    setColumnsOpen(false);
  };

  if (!getReportById(reportId)) return <Navigate to="/reports" replace />;

  return (
    <div className="min-h-[calc(100vh-64px)] bg-white">
      <div className="px-4 pt-3">
        <div className="flex items-start justify-between gap-4 border-b border-[#e6e9f0] pb-3">
          <div>
            <div className="text-sm font-medium text-[#0f172a]">Receivables</div>
            <div className="mt-1 flex items-center gap-2">
              <h1 className="text-[24px] font-semibold leading-tight text-[#0f172a]">{config.title}</h1>
              <span className="text-sm text-[#475569]">- {dateLabel}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button type="button" onClick={openColumns} className="inline-flex h-8 w-8 items-center justify-center rounded border border-[#d4d9e4] text-[#334155] hover:bg-[#f8fafc]" title="Customize report columns">
              <SlidersHorizontal size={15} />
            </button>
            <button type="button" className="inline-flex h-8 items-center gap-1 rounded border border-[#d4d9e4] bg-white px-3 text-sm font-medium text-[#1e293b] hover:bg-[#f8fafc]">
              Export <ChevronDown size={14} />
            </button>
            <button type="button" onClick={() => setRefreshTick((value) => value + 1)} className="inline-flex h-8 w-8 items-center justify-center rounded border border-[#d4d9e4] text-[#334155] hover:bg-[#f8fafc]">
              <RefreshCw size={15} />
            </button>
            <button type="button" onClick={() => navigate("/reports")} className="inline-flex h-8 w-8 items-center justify-center rounded border border-[#d4d9e4] text-[#ef4444] hover:bg-[#fef2f2]">
              <X size={15} />
            </button>
          </div>
        </div>
      </div>

      <div className="px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 text-sm text-[#334155]">
            <Filter size={14} />
            Filters :
          </span>

          <label className="inline-flex h-9 items-center gap-2 rounded border border-[#cfd6e4] bg-[#f8fafc] px-3 text-sm text-[#334155]">
            <span>{config.subtitleMode === "as-of" ? "As of" : "Date Range"} :</span>
            <select value={rangeKey} onChange={(event) => setRangeKey(event.target.value as DateRangeKey)} className="bg-transparent outline-none">
              {DATE_RANGE_OPTIONS.map((option) => (
                <option key={option.key} value={option.key}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          {rangeKey === "custom" ? (
            <div className="flex items-center gap-2">
              <input value={customStart} onChange={(event) => setCustomStart(event.target.value)} type="date" className="h-9 rounded border border-[#cfd6e4] px-3 text-sm outline-none" />
              <input value={customEnd} onChange={(event) => setCustomEnd(event.target.value)} type="date" className="h-9 rounded border border-[#cfd6e4] px-3 text-sm outline-none" />
            </div>
          ) : null}

          {config.showReportBy ? (
            <label className="inline-flex h-9 items-center gap-2 rounded border border-[#cfd6e4] bg-[#f8fafc] px-3 text-sm text-[#334155]">
              <span>Report By :</span>
              <select value={reportBy} onChange={(event) => setReportBy(event.target.value)} className="bg-transparent outline-none">
                <option value="invoice-date">Invoice Date</option>
                <option value="due-date">Due Date</option>
              </select>
            </label>
          ) : null}

          {config.showAgingBy ? (
            <label className="inline-flex h-9 items-center gap-2 rounded border border-[#cfd6e4] bg-[#f8fafc] px-3 text-sm text-[#334155]">
              <span>Aging By :</span>
              <select value={agingBy} onChange={(event) => setAgingBy(event.target.value)} className="bg-transparent outline-none">
                <option value="invoice-due-date">Invoice Due Date</option>
                <option value="invoice-date">Invoice Date</option>
              </select>
            </label>
          ) : null}

          {config.showEntities ? (
            <label className="inline-flex h-9 items-center gap-2 rounded border border-[#cfd6e4] bg-[#f8fafc] px-3 text-sm text-[#334155]">
              <span>Entities :</span>
              <select value={entities} onChange={(event) => setEntities(event.target.value)} className="bg-transparent outline-none">
                {ENTITY_OPTIONS.map((option) => (
                  <option key={option.key} value={option.key}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          <button type="button" onClick={() => setMoreFiltersOpen((value) => !value)} className="inline-flex h-9 items-center gap-1 rounded border border-[#cfd6e4] bg-white px-3 text-sm text-[#334155] hover:bg-[#f8fafc]">
            <Plus size={14} className="text-[#0f9aa7]" /> More Filters
          </button>

          <button type="button" onClick={() => setRefreshTick((value) => value + 1)} className="inline-flex h-9 items-center gap-1 rounded bg-[var(--button-primary)] px-4 text-sm font-semibold text-white hover:opacity-95">
            <CalendarDays size={14} /> Run Report
          </button>
        </div>

        {moreFiltersOpen ? (
          <div className="mt-3 rounded-xl border border-[#d7dce7] bg-white p-4 shadow-sm">
            <div className="space-y-3">
              {moreFilters.map((row, index) => {
                const fieldDef = fieldLookup(config, row.field);
                const values = fieldDef?.values || config.moreFilterValues[row.field] || [];
                const mode = NO_VALUE.has(row.comparator) ? "none" : values.length ? "select" : "text";
                return (
                  <div key={row.id} className="flex flex-wrap items-center gap-2">
                    <div className="inline-flex h-9 w-10 items-center justify-center rounded border border-[#cfd6e4] bg-[#f8fafc] text-sm text-[#334155]">{index + 1}</div>
                    <select value={row.field} onChange={(event) => updateFilterRow(row.id, { field: event.target.value, comparator: "", value: "" })} className="h-9 min-w-[220px] rounded border border-[#cfd6e4] px-3 text-sm outline-none">
                      <option value="">Select a field</option>
                      {config.moreFilterGroups.map((group) => (
                        <optgroup key={group.label} label={group.label}>
                          {group.options.map((option) => (
                            <option key={option.key} value={option.key}>
                              {option.label}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                    <select value={row.comparator} onChange={(event) => updateFilterRow(row.id, { comparator: event.target.value, value: "" })} className="h-9 min-w-[170px] rounded border border-[#cfd6e4] px-3 text-sm outline-none">
                      <option value="">Select a comparator</option>
                      {COMPARATORS.map((option) => (
                        <option key={option.key} value={option.key}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    {mode === "select" ? (
                      <select value={row.value} onChange={(event) => updateFilterRow(row.id, { value: event.target.value })} className="h-9 min-w-[220px] rounded border border-[#cfd6e4] px-3 text-sm outline-none">
                        <option value="">{values[0]?.label || "Select a value"}</option>
                        {values.map((option) => (
                          <option key={option.key} value={option.key}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    ) : mode === "text" ? (
                      <input value={row.value} onChange={(event) => updateFilterRow(row.id, { value: event.target.value })} placeholder="Enter a value" className="h-9 min-w-[220px] rounded border border-[#cfd6e4] px-3 text-sm outline-none" />
                    ) : (
                      <div className="inline-flex h-9 min-w-[220px] items-center rounded border border-[#cfd6e4] bg-[#f8fafc] px-3 text-sm text-[#64748b]">No value needed</div>
                    )}
                    <button type="button" onClick={addFilterRow} className="inline-flex h-9 w-9 items-center justify-center rounded border border-[#cfd6e4] text-[#64748b]">
                      <Plus size={16} />
                    </button>
                    <button type="button" onClick={() => removeFilterRow(row.id)} className="inline-flex h-9 w-9 items-center justify-center rounded border border-[#cfd6e4] text-[#ef4444]">
                      <X size={16} />
                    </button>
                  </div>
                );
              })}
            </div>

            <button type="button" onClick={addFilterRow} className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-[#0f9aa7]">
              <Plus size={14} /> Add More
            </button>

            <div className="mt-5 flex items-center gap-2 border-t border-[#e6e9f0] pt-4">
              <button type="button" onClick={() => setRefreshTick((value) => value + 1)} className="inline-flex h-9 items-center rounded bg-[var(--button-primary)] px-4 text-sm font-semibold text-white hover:opacity-95">
                Run Report
              </button>
              <button type="button" onClick={() => setMoreFiltersOpen(false)} className="inline-flex h-9 items-center rounded border border-[#d4d9e4] bg-white px-4 text-sm text-[#334155]">
                Cancel
              </button>
            </div>
          </div>
        ) : null}

        <div className="mt-3 flex flex-wrap items-center justify-end gap-2 text-sm text-[#475569]">
          {config.rightControls.map((control) => {
            const value = control.state === "groupBy" ? groupBy : control.state === "showBy" ? showBy : agingIntervals;
            const setValue = control.state === "groupBy" ? setGroupBy : control.state === "showBy" ? setShowBy : setAgingIntervals;
            return (
              <label key={control.label} className="inline-flex h-8 items-center gap-2 rounded border border-[#cfd6e4] bg-white px-3">
                <span>{control.label} :</span>
                <select value={value} onChange={(event) => setValue(event.target.value)} className="bg-transparent outline-none">
                  {control.options.map((option) => (
                    <option key={option.key} value={option.key}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            );
          })}

          <button type="button" onClick={openColumns} className="inline-flex h-8 items-center gap-1 rounded border border-[#cfd6e4] bg-white px-3 text-sm text-[#334155] hover:bg-[#f8fafc]">
            <Columns3 size={14} />
            Customize Report Columns
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#e6f3fb] px-1 text-[11px] font-semibold text-[#5b8def]">{selectedColumns.length}</span>
          </button>
        </div>

        <div className="mt-3 rounded-xl border border-[#d7dce7] bg-white">
          <div className="border-b border-[#e6e9f0] px-4 py-10 text-center">
            {organizationName ? <div className="mb-1 text-sm text-[#64748b]">{organizationName}</div> : null}
            <div className="text-[20px] font-semibold text-[#0f172a]">{config.title}</div>
            <div className="mt-1 text-sm text-[#2563eb]">{dateLabel}</div>
          </div>

          {loading ? <div className="px-4 py-10 text-center text-sm text-[#64748b]">Loading report...</div> : null}
          {error ? <div className="px-4 py-10 text-center text-sm text-[#ef4444]">{error}</div> : null}

          {!loading && !error ? (
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-[#e6e9f0]">
                    {visibleColumns.map((column) => (
                      <th key={column.key} className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#475569]">
                        {column.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.length > 0 ? (
                    rows.map((row, index) => (
                      <tr key={`${index}-${String(row.values.name || row.values.transaction || row.values["invoice-number"] || index)}`} className="border-b border-[#edf1f6]">
                        {visibleColumns.map((column, columnIndex) => (
                          <td key={column.key} className={`px-4 py-3 text-sm ${columnIndex === 0 ? "font-medium text-[#0f172a]" : "text-[#2563eb]"}`}>
                            {formatCell(column, row.values[column.key])}
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={visibleColumns.length} className="px-4 py-10 text-center text-sm text-[#64748b]">
                        No records found.
                      </td>
                    </tr>
                  )}

                  {totals && Object.keys(totals).length > 0 ? (
                    <tr className="border-t border-[#dbe2ee]">
                      {visibleColumns.map((column, index) => (
                        <td key={column.key} className={`px-4 py-3 text-sm ${index === 0 ? "font-semibold text-[#0f172a]" : "text-[#0f172a]"}`}>
                          {index === 0 ? "Total" : formatCell(column, totals[column.key])}
                        </td>
                      ))}
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      </div>

      {columnsOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4">
          <div className="w-full max-w-[860px] rounded-xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#e6e9f0] px-5 py-3">
              <div className="text-[16px] font-medium text-[#0f172a]">Customize Report Columns</div>
              <button type="button" className="text-[#ef4444]" onClick={() => setColumnsOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-6 px-5 py-5 md:grid-cols-[1fr_56px_1fr]">
              <div>
                <div className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-[#64748b]">Available Columns</div>
                <div className="flex items-center gap-2 rounded-t border border-[#cfd6e4] bg-white px-2 py-1">
                  <Search size={14} className="text-[#94a3b8]" />
                  <input value={columnSearch} onChange={(event) => setColumnSearch(event.target.value)} placeholder="Search" className="w-full bg-transparent text-sm outline-none" />
                </div>
                <div className="max-h-[420px] overflow-y-auto rounded-b border border-t-0 border-[#cfd6e4] bg-white">
                  {config.columns.map((group) => (
                    <div key={group.label} className="py-1">
                      <div className="px-3 py-2 text-xs font-semibold uppercase tracking-[0.06em] text-[#94a3b8]">{group.label}</div>
                      {group.options
                        .filter((option) => !columnDraft.includes(option.key))
                        .filter((option) => !columnSearch.trim() || option.label.toLowerCase().includes(columnSearch.trim().toLowerCase()))
                        .map((option) => {
                          const active = activeAvailableColumn === option.key;
                          return (
                            <button
                              key={option.key}
                              type="button"
                              onClick={() => setActiveAvailableColumn(option.key)}
                              className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm ${active ? "bg-[#f8fafc] text-[#0f172a]" : "text-[#334155] hover:bg-[#f8fafc]"}`}
                            >
                              <span>{option.label}</span>
                              {active ? <Check size={14} className="text-[#64748b]" /> : null}
                            </button>
                          );
                        })}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-center">
                <button
                  type="button"
                  onClick={() => {
                    if (!activeAvailableColumn) return;
                    setColumnDraft((prev) => (prev.includes(activeAvailableColumn) ? prev : [...prev, activeAvailableColumn]));
                  }}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#9ca3af] text-[#4b5563]"
                >
                  <ChevronDown size={18} className="rotate-[-90deg]" />
                </button>
              </div>

              <div>
                <div className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-[#64748b]">Selected Columns</div>
                <div className="min-h-[420px] rounded border border-[#cfd6e4] bg-white p-2">
                  {columnDraft.map((key) => {
                    const option = columnLookup(reportId, key);
                    if (!option) return null;
                    return (
                      <div key={key} className="flex items-center justify-between rounded px-3 py-2 text-sm hover:bg-[#f8fafc]">
                        <div>
                          <span className="text-[#0f172a]">{option.label}</span>
                          <span className="ml-1 text-xs text-[#94a3b8]">({RECEIVABLES_CONFIG[reportId].columns.find((group) => group.options.some((item) => item.key === key))?.label || "Reports"})</span>
                        </div>
                        {option.locked ? null : (
                          <button type="button" className="text-[#ef4444]" onClick={() => setColumnDraft((prev) => prev.filter((item) => item !== key))}>
                            <X size={14} />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 border-t border-[#e6e9f0] px-5 py-4">
              <button type="button" onClick={() => setSelectedColumns(columnDraft)} className="inline-flex h-9 items-center rounded bg-[#4f8cff] px-4 text-sm font-semibold text-white">
                Apply
              </button>
              <button type="button" onClick={() => setColumnsOpen(false)} className="inline-flex h-9 items-center rounded border border-[#d4d9e4] bg-white px-4 text-sm text-[#334155]">
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
