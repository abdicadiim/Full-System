import React, { useEffect, useMemo, useRef, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import {
  CalendarDays,
  ChevronDown,
  Filter,
  RefreshCw,
  Table2,
  X,
} from "lucide-react";
import ReportCustomizeColumnsModal, {
  type ColumnGroup,
} from "./ReportCustomizeColumnsModal";
import { getCategoryById, getReportById } from "./reportsCatalog";
import {
  getInvoices,
  getPayments,
  type Invoice,
  type Payment,
} from "../salesModel";

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
  | "Custom";

type RangeDate = {
  start: string;
  end: string;
};

type BucketSummary = {
  bucket0to15: number;
  bucket16to30: number;
  bucket31to45: number;
  bucketAbove45: number;
  total: number;
};

type PreviewTableConfig = {
  title: string;
  subtitle: string;
  columns: string[];
  rows: string[][];
  totals?: string[];
};

const REPORT_COLUMNS = [
  "Customer Name",
  "0 - 15 Days",
  "16 - 30 Days",
  "31 - 45 Days",
  "Above 45 Days",
];

const REPORT_COLUMN_GROUPS: ColumnGroup[] = [
  { label: "Reports", items: REPORT_COLUMNS },
];

const DATE_RANGE_PRESETS: DateRangePreset[] = [
  "Today",
  "This Week",
  "This Month",
  "This Quarter",
  "This Year",
  "Yesterday",
  "Previous Week",
  "Previous Month",
  "Previous Quarter",
  "Previous Year",
  "Custom",
];

const formatDate = (value: Date) =>
  value.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

const toIsoDate = (value: Date) => value.toISOString().slice(0, 10);

const parseDate = (value: string) => {
  if (!value) return null;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
};

const startOfDay = (value: Date) => new Date(value.getFullYear(), value.getMonth(), value.getDate());
const endOfDay = (value: Date) => new Date(value.getFullYear(), value.getMonth(), value.getDate(), 23, 59, 59, 999);

const getWeekStart = (value: Date) => {
  const start = startOfDay(value);
  const offset = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - offset);
  return start;
};

const getWeekEnd = (value: Date) => {
  const end = getWeekStart(value);
  end.setDate(end.getDate() + 6);
  return endOfDay(end);
};

const getMonthStart = (value: Date) => new Date(value.getFullYear(), value.getMonth(), 1);
const getMonthEnd = (value: Date) => new Date(value.getFullYear(), value.getMonth() + 1, 0, 23, 59, 59, 999);
const getQuarterStart = (value: Date) => new Date(value.getFullYear(), Math.floor(value.getMonth() / 3) * 3, 1);
const getQuarterEnd = (value: Date) => new Date(value.getFullYear(), Math.floor(value.getMonth() / 3) * 3 + 3, 0, 23, 59, 59, 999);
const getYearStart = (value: Date) => new Date(value.getFullYear(), 0, 1);
const getYearEnd = (value: Date) => new Date(value.getFullYear(), 11, 31, 23, 59, 59, 999);

const getDateRangeBounds = (preset: DateRangePreset, customRange: RangeDate) => {
  const now = new Date();

  switch (preset) {
    case "Today":
      return { start: startOfDay(now), end: endOfDay(now) };
    case "Yesterday": {
      const day = new Date(now);
      day.setDate(day.getDate() - 1);
      return { start: startOfDay(day), end: endOfDay(day) };
    }
    case "This Week":
      return { start: getWeekStart(now), end: getWeekEnd(now) };
    case "Previous Week": {
      const start = getWeekStart(now);
      start.setDate(start.getDate() - 7);
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      return { start, end: endOfDay(end) };
    }
    case "This Month":
      return { start: getMonthStart(now), end: getMonthEnd(now) };
    case "Previous Month": {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0);
      return { start, end: endOfDay(end) };
    }
    case "This Quarter":
      return { start: getQuarterStart(now), end: getQuarterEnd(now) };
    case "Previous Quarter": {
      const currentQuarterStart = getQuarterStart(now);
      const start = new Date(currentQuarterStart);
      start.setMonth(start.getMonth() - 3);
      const end = new Date(currentQuarterStart);
      end.setDate(end.getDate() - 1);
      return { start, end: endOfDay(end) };
    }
    case "This Year":
      return { start: getYearStart(now), end: getYearEnd(now) };
    case "Previous Year": {
      const start = new Date(now.getFullYear() - 1, 0, 1);
      const end = new Date(now.getFullYear() - 1, 11, 31);
      return { start, end: endOfDay(end) };
    }
    case "Custom": {
      const start = parseDate(customRange.start) || getMonthStart(now);
      const end = parseDate(customRange.end) || getMonthEnd(now);
      return { start: startOfDay(start), end: endOfDay(end) };
    }
    default:
      return { start: getMonthStart(now), end: getMonthEnd(now) };
  }
};

const getRangeLabel = (preset: DateRangePreset, bounds: { start: Date; end: Date }) => {
  if (preset === "Today" || preset === "Yesterday") {
    return `As of ${formatDate(bounds.end)}`;
  }

  return `From ${formatDate(bounds.start)} To ${formatDate(bounds.end)}`;
};

const getTimeToGetPaidBucketLabel = (days: number) => {
  if (days <= 15) return "0 - 15 Days";
  if (days <= 30) return "16 - 30 Days";
  if (days <= 45) return "31 - 45 Days";
  return "Above 45 Days";
};

const formatPercent = (value: number) => `${Math.round(value)}%`;

const parseReportDate = (value: unknown) => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
};

const buildPreview = (
  payments: Payment[],
  invoices: Invoice[],
  bounds: { start: Date; end: Date },
  selectedDateRange: DateRangePreset,
): PreviewTableConfig | null => {
  const invoiceById = new Map<string, Invoice>();
  const invoiceByNumber = new Map<string, Invoice>();

  invoices.forEach((invoice) => {
    const invoiceId = String(invoice._id || invoice.id || "").trim();
    const invoiceNumber = String(invoice.invoiceNumber || "").trim().toLowerCase();
    if (invoiceId) invoiceById.set(invoiceId, invoice);
    if (invoiceNumber) invoiceByNumber.set(invoiceNumber, invoice);
  });

  const resolveInvoice = (allocation: any, payment: Payment) => {
    const invoiceId = String(
      allocation?.invoiceId ||
        allocation?.invoice?._id ||
        allocation?.invoice?.id ||
        allocation?.invoice ||
        payment.invoiceId ||
        "",
    ).trim();
    const invoiceNumber = String(
      allocation?.invoiceNumber ||
        allocation?.invoice?.invoiceNumber ||
        payment.invoiceNumber ||
        "",
    )
      .trim()
      .toLowerCase();

    return invoiceById.get(invoiceId) || invoiceByNumber.get(invoiceNumber) || allocation?.invoice || null;
  };

  const grouped = new Map<string, BucketSummary>();

  payments.forEach((payment) => {
    const paymentDate = parseReportDate(payment.paymentDate || payment.date);
    if (!paymentDate || paymentDate < bounds.start || paymentDate > bounds.end) return;

    const allocations =
      Array.isArray(payment.allocations) && payment.allocations.length > 0
        ? payment.allocations
        : payment.invoiceId || payment.invoiceNumber
          ? [
              {
                invoiceId: payment.invoiceId || "",
                invoiceNumber: payment.invoiceNumber || "",
                amount: payment.amountReceived ?? payment.amount ?? 0,
              },
            ]
          : [];

    allocations.forEach((allocation: any) => {
      const invoice = resolveInvoice(allocation, payment);
      const invoiceDate = parseReportDate(
        allocation?.invoiceDate ||
          allocation?.date ||
          allocation?.appliedAt ||
          invoice?.invoiceDate ||
          invoice?.date ||
          invoice?.dueDate,
      );
      if (!invoiceDate) return;

      const amount = Number(
        allocation?.amount ??
          allocation?.appliedAmount ??
          allocation?.amountReceived ??
          payment.amountReceived ??
          payment.amount ??
          0,
      );
      if (!Number.isFinite(amount) || amount <= 0) return;

      const customerName =
        String(
          invoice?.customerName ||
            invoice?.customer?.displayName ||
            invoice?.customer?.companyName ||
            invoice?.customer?.name ||
            payment.customerName ||
            "Unknown Customer",
        ).trim() || "Unknown Customer";

      const days = Math.max(0, Math.round((paymentDate.getTime() - invoiceDate.getTime()) / (1000 * 60 * 60 * 24)));
      const bucket = getTimeToGetPaidBucketLabel(days);
      const current = grouped.get(customerName) || {
        bucket0to15: 0,
        bucket16to30: 0,
        bucket31to45: 0,
        bucketAbove45: 0,
        total: 0,
      };

      current.total += amount;

      if (bucket === "0 - 15 Days") current.bucket0to15 += amount;
      else if (bucket === "16 - 30 Days") current.bucket16to30 += amount;
      else if (bucket === "31 - 45 Days") current.bucket31to45 += amount;
      else current.bucketAbove45 += amount;

      grouped.set(customerName, current);
    });
  });

  const entries = [...grouped.entries()]
    .filter(([, item]) => item.total > 0)
    .sort((a, b) => b[1].total - a[1].total || a[0].localeCompare(b[0]));

  if (entries.length === 0) return null;

  const grandTotal = entries.reduce((sum, [, item]) => sum + item.total, 0);
  if (grandTotal <= 0) return null;

  const total0to15 = entries.reduce((sum, [, item]) => sum + item.bucket0to15, 0);
  const total16to30 = entries.reduce((sum, [, item]) => sum + item.bucket16to30, 0);
  const total31to45 = entries.reduce((sum, [, item]) => sum + item.bucket31to45, 0);
  const totalAbove45 = entries.reduce((sum, [, item]) => sum + item.bucketAbove45, 0);

  return {
    title: "Time to Get Paid",
    subtitle: getRangeLabel(selectedDateRange, bounds),
    columns: REPORT_COLUMNS,
    rows: entries.map(([customerName, item]) => {
      const customerTotal = item.total || 0;
      return [
        customerName,
        formatPercent(customerTotal ? (item.bucket0to15 / customerTotal) * 100 : 0),
        formatPercent(customerTotal ? (item.bucket16to30 / customerTotal) * 100 : 0),
        formatPercent(customerTotal ? (item.bucket31to45 / customerTotal) * 100 : 0),
        formatPercent(customerTotal ? (item.bucketAbove45 / customerTotal) * 100 : 0),
      ];
    }),
    totals: [
      "Total",
      formatPercent((total0to15 / grandTotal) * 100),
      formatPercent((total16to30 / grandTotal) * 100),
      formatPercent((total31to45 / grandTotal) * 100),
      formatPercent((totalAbove45 / grandTotal) * 100),
    ],
  };
};

const getDefaultCustomRange = (): RangeDate => {
  const now = new Date();
  return {
    start: toIsoDate(getMonthStart(now)),
    end: toIsoDate(getMonthEnd(now)),
  };
};

export default function TimeToGetPaidReportPage() {
  const navigate = useNavigate();
  const { categoryId, reportId } = useParams();
  const resolvedCategoryId = categoryId || "payments-received";
  const category = getCategoryById(resolvedCategoryId);
  const report = getReportById(resolvedCategoryId, "time-to-get-paid");
  const filtersRef = useRef<HTMLDivElement>(null);

  const [selectedDateRange, setSelectedDateRange] = useState<DateRangePreset>("This Month");
  const [isDateRangeOpen, setIsDateRangeOpen] = useState(false);
  const [dateRangeDraftKey, setDateRangeDraftKey] = useState<DateRangePreset>("This Month");
  const [customDateRange, setCustomDateRange] = useState<RangeDate>(() => getDefaultCustomRange());
  const [customDateRangeDraft, setCustomDateRangeDraft] = useState<RangeDate>(() => getDefaultCustomRange());
  const [selectedColumns, setSelectedColumns] = useState<string[]>(REPORT_COLUMNS);
  const [customizeColumnsOpen, setCustomizeColumnsOpen] = useState(false);
  const [preview, setPreview] = useState<PreviewTableConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshTick, setRefreshTick] = useState(0);

  const selectedRangeBounds = useMemo(
    () => getDateRangeBounds(selectedDateRange, customDateRange),
    [customDateRange.end, customDateRange.start, selectedDateRange],
  );
  const dateLabel = useMemo(
    () => getRangeLabel(selectedDateRange, selectedRangeBounds),
    [selectedRangeBounds, selectedDateRange],
  );
  const closeTarget = `/reports/${resolvedCategoryId}`;
  const reportDisplayName = report?.name || "Time to Get Paid";
  const categoryDisplayName = category?.name.replace(" Reports", "") || "Payments Received";

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (filtersRef.current && target && !filtersRef.current.contains(target)) {
        setIsDateRangeOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      try {
        const [payments, invoices] = await Promise.all([getPayments(), getInvoices()]);
        if (cancelled) return;
        setPreview(buildPreview(payments, invoices, selectedRangeBounds, selectedDateRange));
      } catch (error) {
        if (cancelled) return;
        setPreview(null);
        console.error("Failed to load Time to Get Paid report", error);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    setPreview(null);
    void load();

    return () => {
      cancelled = true;
    };
  }, [refreshTick, selectedRangeBounds.end.getTime(), selectedRangeBounds.start.getTime(), selectedDateRange]);

  if (!category || !report || reportId !== "time-to-get-paid") {
    return <Navigate to="/reports" replace />;
  }

  const previewColumns = preview?.columns ?? REPORT_COLUMNS;
  const previewRows = preview?.rows ?? [];
  const previewTotals = preview?.totals;
  const visiblePreviewColumns = selectedColumns.length > 0 ? selectedColumns : previewColumns;
  const previewColumnIndexMap = useMemo(() => {
    const map = new Map<string, number>();
    previewColumns.forEach((column, index) => {
      map.set(column, index);
    });
    return map;
  }, [previewColumns]);

  const getPreviewCell = (row: string[] | undefined, column: string) => {
    const index = previewColumnIndexMap.get(column);
    if (index === undefined) return "-";
    return row?.[index] ?? "-";
  };

  return (
    <div className="relative min-h-[calc(100vh-64px)] pt-3">
      <div className="mx-auto w-full px-3 pb-6">
        <section className="rounded-[16px] border border-[#d7dce7] bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4 px-4 py-3">
            <div className="min-w-0">
              <p className="text-[14px] font-medium leading-none text-[#5a6781]">{categoryDisplayName}</p>
              <h1 className="mt-1 flex flex-wrap items-center gap-2 text-[18px] font-semibold leading-tight text-[#0f172a]">
                <span>{reportDisplayName}</span>
                <span className="text-[14px] font-normal text-[#0f172a]">{dateLabel}</span>
              </h1>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => setCustomizeColumnsOpen(true)}
                className="inline-flex h-8 items-center gap-1 rounded border border-[#d4d9e4] bg-white px-3 text-sm font-medium text-[#156372] hover:bg-[#156372]/10"
              >
                <Table2 size={14} />
                Customize Report Columns
                <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#dff1ef] px-1.5 text-[11px] font-semibold text-[#156372]">
                  {visiblePreviewColumns.length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setRefreshTick((current) => current + 1);
                  toast.success(`Report refreshed: ${reportDisplayName}`);
                }}
                className="inline-flex h-8 w-8 items-center justify-center rounded border border-[#d4d9e4] text-[#156372] hover:bg-[#156372]/10"
                aria-label="Refresh report"
              >
                <RefreshCw size={15} />
              </button>
              <button
                type="button"
                onClick={() => navigate(closeTarget)}
                className="inline-flex h-8 w-8 items-center justify-center rounded border border-[#d4d9e4] text-[#ef4444] hover:bg-[#fef2f2]"
                aria-label="Close report"
              >
                <X size={15} />
              </button>
            </div>
          </div>

          <div
            ref={filtersRef}
            className="relative flex flex-wrap items-center gap-2 border-t border-[#e6e9f0] px-4 py-2"
          >
            <span className="inline-flex items-center gap-1 text-sm text-[#334155]">
              <Filter size={14} />
              Filters :
            </span>

            <button
              type="button"
              onClick={() => setIsDateRangeOpen((current) => !current)}
              className={`inline-flex h-8 items-center gap-1 rounded border px-3 text-sm transition-colors ${
                isDateRangeOpen
                  ? "border-[#156372] bg-white text-[#156372] shadow-sm"
                  : "border-[#cfd6e4] bg-white text-[#334155] hover:border-[#156372] hover:text-[#156372]"
              }`}
            >
              Date Range : <span className="font-medium">{selectedDateRange === "Custom" ? "Custom" : selectedDateRange}</span>
              <ChevronDown size={14} />
            </button>

            <button
              type="button"
              onClick={() => {
                setRefreshTick((current) => current + 1);
                toast.success(`Report refreshed: ${reportDisplayName}`);
              }}
              className="inline-flex h-8 items-center gap-1 rounded bg-[#156372] px-4 text-sm font-semibold text-white hover:bg-[#0f4f5b]"
            >
              <CalendarDays size={14} /> Run Report
            </button>

            {isDateRangeOpen ? (
              <div className="absolute left-12 top-[calc(100%+8px)] z-30 w-[280px] overflow-hidden rounded-[10px] border border-[#d7dce7] bg-white shadow-[0_10px_30px_rgba(15,23,42,0.18)]">
                <div className="max-h-[300px] overflow-auto p-1">
                  {DATE_RANGE_PRESETS.map((preset) => {
                    const isActive = selectedDateRange === preset;
                    return (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => {
                          setDateRangeDraftKey(preset);
                          if (preset === "Custom") {
                            setCustomDateRangeDraft(customDateRange);
                          } else {
                            setSelectedDateRange(preset);
                            setIsDateRangeOpen(false);
                          }
                        }}
                        className={`flex w-full items-center rounded-[8px] px-3 py-2 text-left text-[14px] transition-colors ${
                          isActive ? "bg-[#f3f7f9] text-[#0f172a]" : "text-[#334155] hover:bg-[#f8fafc]"
                        }`}
                      >
                        {preset}
                      </button>
                    );
                  })}
                </div>

                {dateRangeDraftKey === "Custom" ? (
                  <div className="border-t border-[#edf1f7] p-3">
                    <div className="flex gap-2">
                      <input
                        type="date"
                        value={customDateRangeDraft.start}
                        onChange={(event) => {
                          setCustomDateRangeDraft((prev) => ({ ...prev, start: event.target.value }));
                        }}
                        className="h-9 w-full rounded-[8px] border border-[#d8deea] px-3 text-sm outline-none focus:border-[#156372]"
                      />
                      <input
                        type="date"
                        value={customDateRangeDraft.end}
                        onChange={(event) => {
                          setCustomDateRangeDraft((prev) => ({ ...prev, end: event.target.value }));
                        }}
                        className="h-9 w-full rounded-[8px] border border-[#d8deea] px-3 text-sm outline-none focus:border-[#156372]"
                      />
                    </div>

                    <div className="mt-3 flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setIsDateRangeOpen(false)}
                        className="rounded-[8px] px-3 py-1.5 text-[#334155] hover:bg-[#f3f7f9]"
                      >
                        Close
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setCustomDateRange(customDateRangeDraft);
                          setSelectedDateRange("Custom");
                          setIsDateRangeOpen(false);
                        }}
                        className="rounded-[8px] bg-[#156372] px-4 py-1.5 font-semibold text-white hover:bg-[#0f4f5b]"
                      >
                        Apply
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="border-t border-[#edf1f7] px-3 py-2">
                    <div className="flex items-center justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedDateRange(dateRangeDraftKey);
                          setIsDateRangeOpen(false);
                        }}
                        className="rounded-[8px] bg-[#156372] px-4 py-1.5 font-semibold text-white hover:bg-[#0f4f5b]"
                      >
                        Apply
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </section>

        <section className="mt-3 flex min-h-0 flex-1 flex-col overflow-hidden rounded-[16px] border border-[#d7dce7] bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-[#e8edf5] px-4 py-3">
            <h2 className="text-[16px] font-semibold text-[#0f172a]">Report Data</h2>
            <span className="text-sm text-[#64748b]">{visiblePreviewColumns.length} columns</span>
          </div>

          <div className="min-h-0 flex-1 overflow-auto">
            {isLoading ? (
              <div className="mx-auto max-w-5xl p-4">
                <div className="animate-pulse text-center">
                  <div className="mx-auto h-6 w-56 rounded bg-slate-200" />
                  <div className="mx-auto mt-3 h-4 w-40 rounded bg-slate-100" />
                </div>

                <div className="mt-6 overflow-hidden rounded-[12px] border border-[#e8edf5] bg-white">
                  <div className="border-b border-[#e8edf5] bg-[#fafbfe] px-4 py-3">
                    <div className="grid grid-cols-5 gap-3">
                      {Array.from({ length: 5 }).map((_, index) => (
                        <div key={`skeleton-head-${index}`} className="h-3 rounded bg-slate-200/80" />
                      ))}
                    </div>
                  </div>
                  <div className="space-y-0">
                    {Array.from({ length: 8 }).map((_, rowIndex) => (
                      <div key={`skeleton-row-${rowIndex}`} className="grid grid-cols-5 gap-3 border-b border-[#edf1f7] px-4 py-4">
                        {Array.from({ length: 5 }).map((__, cellIndex) => (
                          <div
                            key={`skeleton-cell-${rowIndex}-${cellIndex}`}
                            className={`h-3 rounded bg-slate-100 ${cellIndex === 0 ? "w-3/4" : "w-11/12"}`}
                          />
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : preview ? (
              <>
                <div className="mx-auto max-w-5xl px-4 pt-6 text-center">
                  <h2 className="text-[22px] font-semibold text-[#0f172a]">{preview.title}</h2>
                  <p className="mt-1 text-sm text-[#475569]">{preview.subtitle}</p>
                </div>

                <div className="mt-6 overflow-hidden border-t border-[#e8edf5]">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b border-[#e8edf5] bg-[#fafbfe]">
                        {visiblePreviewColumns.map((column) => (
                          <th
                            key={column}
                            className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-[#64748b]"
                          >
                            {column}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewRows.map((row, rowIndex) => (
                        <tr key={`${preview.title}-${rowIndex}`} className="border-b border-[#edf1f7] hover:bg-[#fcfdff]">
                          {visiblePreviewColumns.map((column, cellIndex) => {
                            const cell = getPreviewCell(row, column);
                            return (
                              <td
                                key={`${rowIndex}-${cellIndex}`}
                                className={`px-4 py-3 text-[14px] ${
                                  cellIndex === 0 ? "text-[#2563eb]" : "text-[#334155]"
                                }`}
                              >
                                {cell}
                              </td>
                            );
                          })}
                        </tr>
                      ))}

                      {previewTotals ? (
                        <tr className="border-b border-[#edf1f7] bg-white">
                          {visiblePreviewColumns.map((column, cellIndex) => {
                            const cell = getPreviewCell(previewTotals, column);
                            return (
                              <td
                                key={`total-${cellIndex}`}
                                className={`px-4 py-3 text-[14px] ${
                                  cellIndex === 0 ? "font-medium text-[#0f172a]" : "text-[#0f172a]"
                                }`}
                              >
                                {cell}
                              </td>
                            );
                          })}
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className="mx-auto max-w-5xl px-4 py-10">
                <div className="rounded-[12px] border border-dashed border-[#dbe3ef] bg-[#fbfcfe] px-6 py-10 text-center">
                  <h2 className="text-[20px] font-semibold text-[#0f172a]">No live data available yet</h2>
                  <p className="mt-2 text-sm text-[#64748b]">
                    The selected period does not contain any payments that can be matched to invoices.
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>

      <ReportCustomizeColumnsModal
        open={customizeColumnsOpen}
        reportName={reportDisplayName}
        availableGroups={REPORT_COLUMN_GROUPS}
        selectedColumns={selectedColumns}
        onClose={() => setCustomizeColumnsOpen(false)}
        onSave={(nextVisibleColumns) => {
          setSelectedColumns(nextVisibleColumns);
          setCustomizeColumnsOpen(false);
        }}
      />
    </div>
  );
}
