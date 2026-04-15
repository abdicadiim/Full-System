import React, { useEffect, useMemo, useRef, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import {
  CalendarDays,
  Check,
  ChevronDown,
  Columns3,
  Filter,
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
import { getCreditNotes, getInvoices, getTaxes } from "../salesModel";

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

type DateRangeValue = { start: string; end: string };
type TaxSummaryRow = {
  taxName: string;
  taxPercentage: number | null;
  taxableAmount: number;
  taxAmount: number;
};

const TAX_REPORT_COLUMNS = [
  "Tax Name",
  "Tax Percentage",
  "Taxable Amount",
  "Tax Amount",
];

const TAX_REPORT_COLUMN_GROUPS: ColumnGroup[] = [
  {
    label: "Reports",
    items: TAX_REPORT_COLUMNS,
  },
];

const RANGE_OPTIONS: DateRangePreset[] = [
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
  "All Time",
  "Custom",
];

const fmtDate = (value: Date) =>
  value.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
const toInput = (value: Date) =>
  `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
const parseInput = (value: string) => {
  if (!value) return null;
  const [y, m, d] = value.split("-").map(Number);
  return y && m && d ? new Date(y, m - 1, d) : null;
};
const startDay = (value: Date) => new Date(value.getFullYear(), value.getMonth(), value.getDate());
const endDay = (value: Date) => new Date(value.getFullYear(), value.getMonth(), value.getDate(), 23, 59, 59, 999);
const monthStart = (value: Date) => new Date(value.getFullYear(), value.getMonth(), 1);
const monthEnd = (value: Date) => new Date(value.getFullYear(), value.getMonth() + 1, 0, 23, 59, 59, 999);
const weekStart = (value: Date) => {
  const start = startDay(value);
  start.setDate(start.getDate() - start.getDay());
  return start;
};
const weekEnd = (value: Date) => {
  const end = weekStart(value);
  end.setDate(end.getDate() + 6);
  return endDay(end);
};
const quarterBounds = (value: Date) => {
  const startMonth = Math.floor(value.getMonth() / 3) * 3;
  return {
    start: new Date(value.getFullYear(), startMonth, 1),
    end: new Date(value.getFullYear(), startMonth + 3, 0, 23, 59, 59, 999),
  };
};
const yearBounds = (value: Date) => ({
  start: new Date(value.getFullYear(), 0, 1),
  end: new Date(value.getFullYear(), 11, 31, 23, 59, 59, 999),
});
const toText = (value: unknown) => String(value ?? "").trim();
const toNumber = (value: unknown) => {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};
const isInclusive = (value: unknown) =>
  toText(value).toLowerCase().includes("inclusive");
const isReportableStatus = (status: unknown) => {
  const value = toText(status).toLowerCase();
  return !["draft", "void", "voided", "cancelled", "canceled", "deleted"].includes(value);
};
const rangeBounds = (preset: DateRangePreset, custom: DateRangeValue) => {
  const now = new Date();
  switch (preset) {
    case "Today":
      return { start: startDay(now), end: endDay(now) };
    case "Yesterday": {
      const day = new Date(now);
      day.setDate(day.getDate() - 1);
      return { start: startDay(day), end: endDay(day) };
    }
    case "This Week":
      return { start: weekStart(now), end: weekEnd(now) };
    case "Previous Week": {
      const start = weekStart(now);
      start.setDate(start.getDate() - 7);
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      return { start, end: endDay(end) };
    }
    case "This Month":
      return { start: monthStart(now), end: monthEnd(now) };
    case "Previous Month":
      return { start: new Date(now.getFullYear(), now.getMonth() - 1, 1), end: new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999) };
    case "This Quarter":
      return quarterBounds(now);
    case "Previous Quarter": {
      const current = quarterBounds(now).start;
      const start = new Date(current);
      start.setMonth(start.getMonth() - 3);
      const end = new Date(current);
      end.setDate(end.getDate() - 1);
      return { start, end: endDay(end) };
    }
    case "This Year":
      return yearBounds(now);
    case "Previous Year":
      return { start: new Date(now.getFullYear() - 1, 0, 1), end: new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999) };
    case "All Time":
      return { start: new Date(1970, 0, 1), end: endDay(now) };
    case "Custom": {
      const start = parseInput(custom.start) || monthStart(now);
      const end = parseInput(custom.end) || monthEnd(now);
      return { start: startDay(start), end: endDay(end) };
    }
    default:
      return { start: monthStart(now), end: monthEnd(now) };
  }
};
const rangeLabel = (bounds: { start: Date; end: Date }) =>
  `From ${fmtDate(bounds.start)} To ${fmtDate(bounds.end)}`;
const fmtCurrency = (value: number, currency = "SOS") =>
  `${value < 0 ? "-" : ""}${currency}${Math.abs(value).toFixed(2)}`;
const fmtPercent = (value: number | null) =>
  value === null ? "-" : `${value.toFixed(2)}%`;
const taxLookup = (taxes: any[]) => {
  const map = new Map<string, { name: string; rate: number | null }>();
  taxes.forEach((tax) => {
    const name = toText(tax?.name || tax?.taxName || tax?.displayName || tax?.title || tax?._id || tax?.id) || "Tax";
    const rate = Number(tax?.rate ?? tax?.taxPercentage ?? tax?.percentage ?? tax?.tax_rate ?? 0);
    [tax?._id, tax?.id, tax?.tax_id, tax?.taxId, name]
      .map((value) => toText(value).toLowerCase())
      .filter(Boolean)
      .forEach((key) => {
        if (!map.has(key)) map.set(key, { name, rate: Number.isFinite(rate) ? rate : null });
      });
  });
  return map;
};
const docDate = (doc: any, kind: "invoice" | "credit-note") => {
  const raw = kind === "invoice" ? doc?.invoiceDate || doc?.date || doc?.createdAt : doc?.creditNoteDate || doc?.date || doc?.createdAt;
  if (!raw) return null;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};
const subtotalValue = (doc: any, items: any[]) => {
  if (doc?.subtotal !== undefined || doc?.subTotal !== undefined) return toNumber(doc.subtotal ?? doc.subTotal);
  return items.reduce((sum, item) => {
    if (!item || item.itemType === "header") return sum;
    const qty = toNumber(item.quantity);
    const rate = toNumber(item.rate ?? item.unitPrice ?? item.price);
    const amount = toNumber(item.amount ?? item.total);
    return sum + (amount || qty * rate);
  }, 0);
};
const taxRateValue = (doc: any, firstItem: any, lookup: Map<string, { name: string; rate: number | null }>) => {
  const explicit = toNumber(doc?.taxRate ?? doc?.taxPercentage ?? doc?.tax?.rate ?? doc?.tax?.taxPercentage ?? firstItem?.taxRate ?? firstItem?.taxPercentage ?? firstItem?.salesTaxRate ?? firstItem?.tax?.rate ?? firstItem?.tax?.taxPercentage);
  if (explicit > 0) return explicit;
  const candidates = [doc?.taxId, doc?.tax_id, doc?.tax, doc?.tax?.id, doc?.tax?._id, firstItem?.taxId, firstItem?.tax_id, firstItem?.tax, firstItem?.tax?.id, firstItem?.tax?._id, doc?.taxName, firstItem?.taxName];
  for (const candidate of candidates) {
    const entry = lookup.get(toText(candidate).toLowerCase());
    if (entry?.rate && entry.rate > 0) return entry.rate;
  }
  return null;
};
const taxNameValue = (doc: any, firstItem: any, lookup: Map<string, { name: string; rate: number | null }>, rate: number | null) => {
  const explicit = toText(doc?.taxName || doc?.taxLabel || doc?.tax?.name || doc?.tax?.taxName || firstItem?.taxName || firstItem?.taxLabel || firstItem?.tax?.name || firstItem?.tax?.taxName);
  if (explicit) return explicit;
  const candidates = [doc?.taxId, doc?.tax_id, doc?.tax, doc?.tax?.id, doc?.tax?._id, firstItem?.taxId, firstItem?.tax_id, firstItem?.tax, firstItem?.tax?.id, firstItem?.tax?._id];
  for (const candidate of candidates) {
    const entry = lookup.get(toText(candidate).toLowerCase());
    if (entry?.name) return entry.name;
  }
  return rate && rate > 0 ? `Tax ${rate.toFixed(2)}%` : "Tax";
};
const taxAmountValue = (doc: any, items: any[], inclusive: boolean) => {
  if (doc?.taxAmount !== undefined || doc?.totalTax !== undefined || typeof doc?.tax === "number") {
    return toNumber(doc.taxAmount ?? doc.totalTax ?? doc.tax);
  }
  return items.reduce((sum, item) => {
    if (!item || item.itemType === "header") return sum;
    const qty = toNumber(item.quantity);
    const rateValue = toNumber(item.rate ?? item.unitPrice ?? item.price);
    const line = toNumber(item.amount ?? item.total ?? qty * rateValue);
    const explicit = toNumber(item.taxAmount ?? item.tax?.amount ?? item.tax?.taxAmount);
    if (explicit !== 0) return sum + explicit;
    const rate = toNumber(item.taxRate ?? item.taxPercentage ?? item.salesTaxRate ?? item.tax?.rate ?? item.tax?.taxPercentage ?? item.tax?.percentage);
    if (rate <= 0) return sum;
    return sum + (inclusive ? Math.max(line - line / (1 + rate / 100), 0) : (line * rate) / 100);
  }, 0);
};
const signValue = (value: number, sign: number) => (value < 0 ? value : value * sign);
const buildRows = ({
  invoices,
  creditNotes,
  taxes,
  bounds,
}: {
  invoices: any[];
  creditNotes: any[];
  taxes: any[];
  bounds: { start: Date; end: Date };
}) => {
  const lookup = taxLookup(taxes);
  const rows = new Map<string, TaxSummaryRow>();
  const add = (taxName: string, taxPercentage: number | null, taxableAmount: number, taxAmount: number) => {
    const name = toText(taxName) || "Tax";
    const key = `${name.toLowerCase()}|${taxPercentage ?? ""}`;
    const current = rows.get(key) || { taxName: name, taxPercentage, taxableAmount: 0, taxAmount: 0 };
    current.taxableAmount += taxableAmount;
    current.taxAmount += taxAmount;
    rows.set(key, current);
  };
  const process = (doc: any, kind: "invoice" | "credit-note", sign: number) => {
    if (!doc || !isReportableStatus(doc.status)) return;
    const date = docDate(doc, kind);
    if (!date || date < bounds.start || date > bounds.end) return;
    const items = Array.isArray(doc.items) ? doc.items : [];
    const firstItem = items.find((item: any) => item && item.itemType !== "header") || null;
    const inclusive = isInclusive(doc?.taxExclusive);
    const subtotal = subtotalValue(doc, items);
    const taxAmount = taxAmountValue(doc, items, inclusive);
    if (!taxAmount) return;
    const rate = taxRateValue(doc, firstItem, lookup);
    const name = taxNameValue(doc, firstItem, lookup, rate);
    const taxableAmount = inclusive ? Math.max(subtotal - taxAmount, 0) : subtotal;
    add(name, rate, signValue(taxableAmount, sign), signValue(taxAmount, sign));
  };
  invoices.forEach((doc) => process(doc, "invoice", 1));
  creditNotes.forEach((doc) => process(doc, "credit-note", -1));
  return [...rows.values()].sort(
    (left, right) =>
      Math.abs(right.taxAmount) - Math.abs(left.taxAmount) ||
      left.taxName.localeCompare(right.taxName),
  );
};

export default function TaxSummaryReportPage() {
  const navigate = useNavigate();
  const { categoryId } = useParams();
  const resolvedCategoryId = categoryId || "taxes";
  const category = getCategoryById(resolvedCategoryId);
  const report = getReportById(resolvedCategoryId, "tax-summary");
  const { settings } = useSettings();

  const [selectedRange, setSelectedRange] = useState<DateRangePreset>("This Month");
  const [draftRange, setDraftRange] = useState<DateRangePreset>("This Month");
  const [customRange, setCustomRange] = useState<DateRangeValue>(() => {
    const now = new Date();
    return { start: toInput(monthStart(now)), end: toInput(monthEnd(now)) };
  });
  const [customDraft, setCustomDraft] = useState<DateRangeValue>(() => {
    const now = new Date();
    return { start: toInput(monthStart(now)), end: toInput(monthEnd(now)) };
  });
  const [isRangeOpen, setIsRangeOpen] = useState(false);
  const [isMoreFiltersOpen, setIsMoreFiltersOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isCustomizeColumnsOpen, setIsCustomizeColumnsOpen] = useState(false);
  const [selectedColumns, setSelectedColumns] = useState<string[]>(
    TAX_REPORT_COLUMNS,
  );
  const [rows, setRows] = useState<TaxSummaryRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshTick, setRefreshTick] = useState(0);
  const filterRef = useRef<HTMLDivElement>(null);
  const moreFiltersRef = useRef<HTMLDivElement>(null);
  const exportRef = useRef<HTMLDivElement>(null);

  const organizationName = String(settings?.general?.companyDisplayName || settings?.general?.schoolDisplayName || "").trim();
  const currencyCode = String(settings?.general?.currencyCode || settings?.general?.baseCurrency || settings?.general?.currency || "SOS").trim() || "SOS";
  const reportName = report?.name || "Tax Summary";
  const closeTarget = `/reports/${resolvedCategoryId}`;
  const bounds = useMemo(() => rangeBounds(selectedRange, customRange), [customRange.end, customRange.start, selectedRange]);
  const label = useMemo(() => rangeLabel(bounds), [bounds]);
  const visibleColumns = selectedColumns.length > 0 ? selectedColumns : TAX_REPORT_COLUMNS;

  if (!category || !report) return <Navigate to="/reports" replace />;

  const closeMenus = () => {
    setIsRangeOpen(false);
    setIsMoreFiltersOpen(false);
    setIsExportOpen(false);
    setIsCustomizeColumnsOpen(false);
    setDraftRange(selectedRange);
    setCustomDraft(customRange);
  };

  const openRange = () => {
    setIsMoreFiltersOpen(false);
    setIsExportOpen(false);
    setIsCustomizeColumnsOpen(false);
    setDraftRange(selectedRange);
    setCustomDraft(customRange);
    setIsRangeOpen((current) => !current);
  };

  const applyPreset = (preset: DateRangePreset) => {
    if (preset === "Custom") {
      setDraftRange("Custom");
      setCustomDraft(customRange);
      setIsRangeOpen(true);
      return;
    }
    setSelectedRange(preset);
    setDraftRange(preset);
    setIsRangeOpen(false);
  };

  const applyCustom = () => {
    setSelectedRange("Custom");
    setDraftRange("Custom");
    setCustomRange(customDraft);
    setIsRangeOpen(false);
  };

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (
        (filterRef.current && target && filterRef.current.contains(target)) ||
        (moreFiltersRef.current && target && moreFiltersRef.current.contains(target)) ||
        (exportRef.current && target && exportRef.current.contains(target))
      ) return;
      closeMenus();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [customRange, selectedRange]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setIsLoading(true);
      setError("");
      try {
        const [taxes, invoiceRows, creditNoteRows] = await Promise.all([
          getTaxes().catch(() => []),
          getInvoices({ limit: 10000, fromDate: bounds.start.toISOString(), toDate: bounds.end.toISOString() }).catch(() => []),
          getCreditNotes().catch(() => []),
        ]);
        if (cancelled) return;
        const invoices = (Array.isArray(invoiceRows) ? invoiceRows : []).filter((row: any) => {
          const date = docDate(row, "invoice");
          return Boolean(date && date >= bounds.start && date <= bounds.end);
        });
        const creditNotes = (Array.isArray(creditNoteRows) ? creditNoteRows : []).filter((row: any) => {
          const date = docDate(row, "credit-note");
          return Boolean(date && date >= bounds.start && date <= bounds.end);
        });
        setRows(buildRows({ invoices, creditNotes, taxes: Array.isArray(taxes) ? taxes : [], bounds }));
      } catch (loadError) {
        if (cancelled) return;
        setRows([]);
        setError(loadError instanceof Error ? loadError.message : "Failed to load Tax Summary report");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [bounds.end.getTime(), bounds.start.getTime(), refreshTick]);

  const getCellValue = (row: TaxSummaryRow, column: string) => {
    switch (column) {
      case "Tax Name":
        return row.taxName;
      case "Tax Percentage":
        return fmtPercent(row.taxPercentage);
      case "Taxable Amount":
        return fmtCurrency(row.taxableAmount, currencyCode);
      case "Tax Amount":
        return fmtCurrency(row.taxAmount, currencyCode);
      default:
        return "-";
    }
  };

  return (
    <>
      <div className="relative min-h-[calc(100vh-64px)] overflow-visible bg-[#f8fafc] px-4 py-3">
      <div className="mx-auto w-full max-w-[1500px]">
        <section className="rounded-lg border border-[#d7dce7] bg-white">
          <div className="flex flex-wrap items-center justify-between gap-4 px-4 py-3">
            <div className="min-w-0">
              <div className="mb-1 text-[14px] font-medium leading-none text-[#1d6d79]">
                Taxes
              </div>
              <div className="flex min-w-0 items-baseline gap-2">
                <button
                  type="button"
                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded border border-[#d4d9e4] bg-white text-[#334155] hover:bg-[#f8fafc]"
                  aria-label="Open reports menu"
                >
                  <Menu size={15} />
                </button>
                <div className="flex min-w-0 items-baseline gap-2">
                  <h1 className="truncate text-[24px] font-semibold leading-tight text-[#0f172a]">
                    {reportName}
                  </h1>
                  <span className="truncate text-[14px] font-normal text-[#475569]">
                    - {label}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <div ref={exportRef} className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setIsRangeOpen(false);
                    setIsExportOpen((current) => !current);
                  }}
                  className="inline-flex h-8 items-center gap-1 rounded border border-[#d4d9e4] bg-white px-3 text-sm font-medium text-[#1e293b] hover:bg-[#f8fafc]"
                  aria-haspopup="menu"
                  aria-expanded={isExportOpen}
                >
                  Export <ChevronDown size={14} />
                </button>

                {isExportOpen ? (
                  <div className="absolute right-0 top-[calc(100%+6px)] z-40 w-[220px] overflow-hidden rounded-lg border border-[#d7dce7] bg-white shadow-[0_10px_24px_rgba(15,23,42,0.12)]">
                    {["PDF", "XLSX (Microsoft Excel)", "Print"].map(
                      (exportLabel) => (
                        <button
                          key={exportLabel}
                          type="button"
                          onClick={() => {
                            setIsExportOpen(false);
                            toast.success(`Export ${exportLabel} started`);
                          }}
                          className="flex w-full items-center px-3 py-2 text-left text-sm text-[#334155] hover:bg-[#f8fafc]"
                        >
                          {exportLabel}
                        </button>
                      ),
                    )}
                  </div>
                ) : null}
              </div>

              <button
                type="button"
                onClick={() => {
                  setRefreshTick((current) => current + 1);
                  toast.success("Tax Summary refreshed");
                }}
                className="inline-flex h-8 w-8 items-center justify-center rounded border border-[#d4d9e4] text-[#334155] hover:bg-[#f8fafc]"
                aria-label="Refresh report"
                title="Refresh report"
              >
                <RefreshCw size={15} />
              </button>

              <button
                type="button"
                onClick={() => navigate(closeTarget)}
                className="inline-flex h-8 w-8 items-center justify-center rounded border border-[#d4d9e4] text-[#ef4444] hover:bg-[#fef2f2]"
                aria-label="Close report"
                title="Close report"
              >
                <X size={15} />
              </button>
            </div>
          </div>

          <div
            ref={moreFiltersRef}
            className="relative flex flex-wrap items-center gap-2 border-t border-[#e6e9f0] px-4 py-2 text-sm"
          >
            <span className="inline-flex items-center gap-1 text-[#334155]">
              <Filter size={14} className="text-[#64748b]" />
              <span>Filters :</span>
            </span>

            <div ref={filterRef} className="relative">
              <button
                type="button"
                onClick={openRange}
                className={`inline-flex h-8 items-center gap-1 rounded border px-3 text-sm text-[#334155] hover:bg-white ${
                  isRangeOpen
                    ? "border-[#1b6f7b] bg-white"
                    : "border-[#cfd6e4] bg-[#f8fafc]"
                }`}
                aria-haspopup="menu"
                aria-expanded={isRangeOpen}
              >
                <CalendarDays size={14} className="text-[#64748b]" />
                Date Range : <span className="font-medium">{selectedRange}</span>
                <ChevronDown size={14} />
              </button>

              {isRangeOpen ? (
                <div className="absolute left-0 top-[calc(100%+6px)] z-40 w-[280px] overflow-hidden rounded-lg border border-[#d7dce7] bg-white shadow-[0_10px_24px_rgba(15,23,42,0.12)]">
                  <div className="max-h-[260px] overflow-y-auto p-1">
                    {RANGE_OPTIONS.map((option) => {
                      const selected = draftRange === option;
                      return (
                        <button
                          key={option}
                          type="button"
                          onClick={() => applyPreset(option)}
                          className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm ${
                            selected
                              ? "font-medium text-[#0f172a]"
                              : "text-[#334155] hover:bg-[#f8fafc]"
                          }`}
                        >
                          <span>{option}</span>
                          {selected ? <Check size={14} className="text-[#1b6f7b]" /> : null}
                        </button>
                      );
                    })}
                  </div>

                  {draftRange === "Custom" ? (
                    <div className="border-t border-[#eef2f7] p-3">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#64748b]">
                            Start Date
                          </div>
                          <input
                            type="date"
                            value={customDraft.start}
                            onChange={(event) =>
                              setCustomDraft((current) => ({
                                ...current,
                                start: event.target.value,
                              }))
                            }
                            className="h-9 w-full rounded border border-[#d4d9e4] px-2 text-sm outline-none focus:border-[#1b6f7b]"
                          />
                        </div>
                        <div>
                          <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#64748b]">
                            End Date
                          </div>
                          <input
                            type="date"
                            value={customDraft.end}
                            onChange={(event) =>
                              setCustomDraft((current) => ({
                                ...current,
                                end: event.target.value,
                              }))
                            }
                            className="h-9 w-full rounded border border-[#d4d9e4] px-2 text-sm outline-none focus:border-[#1b6f7b]"
                          />
                        </div>
                      </div>

                      <div className="mt-3 flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setIsRangeOpen(false);
                            setDraftRange(selectedRange);
                            setCustomDraft(customRange);
                          }}
                          className="inline-flex h-8 items-center rounded border border-[#d4d9e4] bg-white px-3 text-sm text-[#334155] hover:bg-[#f8fafc]"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={applyCustom}
                          className="inline-flex h-8 items-center rounded bg-[#1b6f7b] px-3 text-sm font-semibold text-white hover:bg-[#155963]"
                        >
                          Apply
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>

            <button
              type="button"
              onClick={() => setIsMoreFiltersOpen((current) => !current)}
              className={`inline-flex h-8 items-center gap-1 rounded border px-3 text-sm ${
                isMoreFiltersOpen
                  ? "border-[#1b6f7b] bg-white text-[#334155]"
                  : "border-[#cfd6e4] bg-white text-[#334155]"
              } hover:bg-[#f8fafc]`}
            >
              <Plus size={14} className="text-[#1b6f7b]" />
              More Filters
            </button>

            <button
              type="button"
              onClick={() => {
                setRefreshTick((current) => current + 1);
                toast.success("Tax Summary refreshed");
              }}
              className="inline-flex h-8 items-center gap-1 rounded bg-[#1b6f7b] px-4 text-sm font-semibold text-white hover:bg-[#155963]"
            >
              <CalendarDays size={14} /> Run Report
            </button>

            {isMoreFiltersOpen ? (
              <div className="absolute left-4 top-[calc(100%+6px)] z-40 w-[260px] rounded-lg border border-[#d7dce7] bg-white shadow-[0_10px_24px_rgba(15,23,42,0.12)]">
                <div className="border-b border-[#eef2f7] px-4 py-3 text-sm font-medium text-[#0f172a]">
                  More Filters
                </div>
                <div className="px-4 py-3 text-sm text-[#334155]">
                  <div className="font-medium text-[#0f172a]">Basis</div>
                  <div className="mt-1">Accrual</div>
                  <div className="mt-3 text-xs text-[#64748b]">
                    Tax Summary is calculated from invoice and credit note tax totals.
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center justify-end gap-4 border-t border-[#eef2f7] px-4 py-3 text-sm text-[#475569]">
            <button
              type="button"
              onClick={() => setIsCustomizeColumnsOpen(true)}
              className="inline-flex items-center gap-1 hover:text-[#0f172a]"
            >
              <Columns3 size={14} />
              Customize Report Columns
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#d9eff1] px-1 text-[11px] font-semibold text-[#1b6f7b]">
                {visibleColumns.length}
              </span>
            </button>
          </div>

          <div className="border-t border-[#eef2f7] px-4 py-10 text-center">
            {organizationName ? (
              <p className="text-sm text-[#6b7280]">{organizationName}</p>
            ) : null}
            <h2 className="mt-2 text-[22px] font-semibold text-[#111827]">
              {reportName}
            </h2>
            <p className="mt-1 text-sm text-[#475569]">{label}</p>
            <p className="mt-3 text-sm text-[#475569]">
              Basis : <span className="font-semibold text-[#111827]">Accrual</span>
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-[#eef2f7]">
                  {visibleColumns.map((column, index) => (
                    <th
                      key={column}
                      className={`px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#475569] ${
                        index === 0 ? "text-left" : index === 1 ? "text-center" : "text-right"
                      }`}
                    >
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td
                      className="px-4 py-10 text-center text-sm text-[#64748b]"
                      colSpan={visibleColumns.length}
                    >
                      Loading report data...
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td
                      className="px-4 py-10 text-center text-sm text-[#b91c1c]"
                      colSpan={visibleColumns.length}
                    >
                      {error}
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td
                      className="px-4 py-10 text-center text-sm text-[#64748b]"
                      colSpan={visibleColumns.length}
                    >
                      There are no transactions during the selected date range.
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr
                      key={`${row.taxName}-${row.taxPercentage ?? "na"}`}
                      className="border-t border-[#edf1f7] hover:bg-[#fcfdff]"
                    >
                      {visibleColumns.map((column, index) => (
                        <td
                          key={`${row.taxName}-${column}`}
                          className={`px-4 py-3 text-sm ${
                            index === 0
                              ? "font-medium text-[#156372]"
                              : index === 1
                                ? "text-center text-[#334155]"
                                : "text-right text-[#334155]"
                          }`}
                        >
                          {getCellValue(row, column)}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
      {isCustomizeColumnsOpen ? (
        <ReportCustomizeColumnsModal
          open={isCustomizeColumnsOpen}
          reportName={reportName}
          availableGroups={TAX_REPORT_COLUMN_GROUPS}
          selectedColumns={selectedColumns}
          onClose={() => setIsCustomizeColumnsOpen(false)}
          onSave={(nextVisibleColumns) => {
            setSelectedColumns(nextVisibleColumns);
            setIsCustomizeColumnsOpen(false);
          }}
        />
      ) : null}
    </>
  );
}
