import React, { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { CalendarDays, ChevronDown, Columns3, Filter, Plus, RefreshCw, Search, SlidersHorizontal, X } from "lucide-react";
import { useSettings } from "../../lib/settings/SettingsContext";
import { reportsAPI } from "../../services/api";
import { getCategoryById, getReportById } from "./reportsCatalog";

type ReportId = "ar-aging-summary" | "ar-aging-details" | "invoice-details";
type DateRangeKey = "today" | "this-week" | "this-month" | "this-quarter" | "this-year" | "yesterday" | "previous-week" | "previous-month" | "previous-quarter" | "previous-year" | "custom";
type CompareWithKey = "none" | "previous-years" | "previous-periods";
type EntityKey = "invoice" | "credit-note";
type FilterComparator = "is-empty" | "is-not-empty" | "is-in" | "is-not-in" | "starts-with" | "ends-with" | "contains" | "does-not-contain";

type Column = { key: string; label: string; locked?: boolean };
type Row = { values: Record<string, unknown> };
type FilterRow = { id: string; field: string; comparator: FilterComparator | ""; value: string };

type Config = {
  category: string;
  title: string;
  subtitlePrefix: string;
  defaultRange: DateRangeKey;
  showEntities: boolean;
  showCompare: boolean;
  showAgingBy: boolean;
  showReportBy: boolean;
  showGroupBy: boolean;
  showShowBy: boolean;
  showAgingIntervals: boolean;
  api: (params?: Record<string, any>) => Promise<any>;
  columns: Column[];
  fieldOptions: { group: string; options: { key: string; label: string }[] }[];
};

const REPORT_CONFIGS: Record<ReportId, Config> = {
  "ar-aging-summary": {
    category: "Receivables",
    title: "AR Aging Summary By Invoice Due Date",
    subtitlePrefix: "As of",
    defaultRange: "today",
    showEntities: true,
    showCompare: true,
    showAgingBy: true,
    showReportBy: false,
    showGroupBy: true,
    showShowBy: true,
    showAgingIntervals: true,
    api: reportsAPI.getARAgingSummary,
    columns: [
      { key: "name", label: "Customer Name", locked: true },
      { key: "current", label: "Current" },
      { key: "1-15-days", label: "1-15 Days" },
      { key: "16-30-days", label: "16-30 Days" },
      { key: "31-45-days", label: "31-45 Days" },
      { key: "gt-45-days", label: "> 45 Days" },
      { key: "total", label: "Total" },
      { key: "total-fcy", label: "Total (FCY)" },
    ],
    fieldOptions: [
      { group: "Reports", options: [{ key: "customer-name", label: "Customer Name" }, { key: "currency", label: "Currency" }, { key: "balance-due", label: "Balance Due" }, { key: "total", label: "Total" }] },
    ],
  },
  "ar-aging-details": {
    category: "Receivables",
    title: "AR Aging Details By Invoice Due Date",
    subtitlePrefix: "As of",
    defaultRange: "today",
    showEntities: true,
    showCompare: true,
    showAgingBy: true,
    showReportBy: false,
    showGroupBy: true,
    showShowBy: false,
    showAgingIntervals: true,
    api: reportsAPI.getARAgingDetails,
    columns: [
      { key: "date", label: "Date", locked: true },
      { key: "due-date", label: "Due Date" },
      { key: "transaction", label: "Transaction" },
      { key: "type", label: "Type" },
      { key: "status", label: "Status" },
      { key: "customer-name", label: "Customer Name" },
      { key: "age", label: "Age" },
      { key: "amount", label: "Amount" },
      { key: "balance-due", label: "Balance Due" },
      { key: "currency", label: "Currency" },
    ],
    fieldOptions: [
      { group: "Reports", options: [{ key: "customer-name", label: "Customer Name" }, { key: "status", label: "Status" }, { key: "transaction", label: "Transaction" }, { key: "invoice-number", label: "Invoice #" }] },
      { group: "Details", options: [{ key: "invoice-date", label: "Invoice Date" }, { key: "due-date", label: "Due Date" }, { key: "age", label: "Age" }, { key: "amount", label: "Amount" }, { key: "balance-due", label: "Balance Due" }, { key: "currency", label: "Currency" }] },
    ],
  },
  "invoice-details": {
    category: "Receivables",
    title: "Invoice Details",
    subtitlePrefix: "From",
    defaultRange: "this-month",
    showEntities: false,
    showCompare: false,
    showAgingBy: false,
    showReportBy: true,
    showGroupBy: true,
    showShowBy: false,
    showAgingIntervals: false,
    api: reportsAPI.getInvoiceDetails,
    columns: [
      { key: "status", label: "Status", locked: true },
      { key: "invoice-date", label: "Invoice Date" },
      { key: "due-date", label: "Due Date" },
      { key: "invoice-number", label: "Invoice #" },
      { key: "order-number", label: "Order Number" },
      { key: "customer-name", label: "Customer Name" },
      { key: "total", label: "Total" },
      { key: "balance", label: "Balance" },
      { key: "currency", label: "Currency" },
    ],
    fieldOptions: [
      { group: "Reports", options: [{ key: "customer-name", label: "Customer Name" }, { key: "status", label: "Status" }, { key: "invoice-number", label: "Invoice #" }, { key: "order-number", label: "Order Number" }] },
      { group: "Details", options: [{ key: "invoice-date", label: "Invoice Date" }, { key: "due-date", label: "Due Date" }, { key: "total", label: "Total" }, { key: "balance", label: "Balance" }, { key: "currency", label: "Currency" }] },
    ],
  },
};

const DATE_RANGE_OPTIONS: Array<{ key: DateRangeKey; label: string }> = [
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
];

const COMPARE_OPTIONS: Array<{ key: CompareWithKey; label: string }> = [
  { key: "none", label: "None" },
  { key: "previous-years", label: "Previous Year(s)" },
  { key: "previous-periods", label: "Previous Period(s)" },
];

const ENTITY_OPTIONS: Array<{ key: EntityKey; label: string }> = [
  { key: "invoice", label: "Invoice" },
  { key: "credit-note", label: "Credit Note" },
];

const COMPARISON_COUNTS = Array.from({ length: 35 }, (_, index) => String(index + 1));

const formatDate = (date: Date) => date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
const toDateInput = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const fromDateInput = (value: string) => {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d);
};
const getStartOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
const getDateRangeValue = (key: DateRangeKey, ref = new Date()) => {
  const today = getStartOfDay(ref);
  switch (key) {
    case "today": return { start: today, end: today };
    case "this-week": { const start = getStartOfDay(ref); start.setDate(start.getDate() - start.getDay()); const end = new Date(start); end.setDate(end.getDate() + 6); return { start, end }; }
    case "this-month": return { start: new Date(ref.getFullYear(), ref.getMonth(), 1), end: new Date(ref.getFullYear(), ref.getMonth() + 1, 0) };
    case "this-quarter": { const q = Math.floor(ref.getMonth() / 3); const sm = q * 3; return { start: new Date(ref.getFullYear(), sm, 1), end: new Date(ref.getFullYear(), sm + 3, 0) }; }
    case "this-year": return { start: new Date(ref.getFullYear(), 0, 1), end: new Date(ref.getFullYear(), 11, 31) };
    case "yesterday": { const d = getStartOfDay(ref); d.setDate(d.getDate() - 1); return { start: d, end: d }; }
    case "previous-week": { const s = getDateRangeValue("this-week", ref).start; const start = new Date(s); start.setDate(start.getDate() - 7); const end = new Date(start); end.setDate(end.getDate() + 6); return { start, end }; }
    case "previous-month": { const end = new Date(ref.getFullYear(), ref.getMonth(), 0); return { start: new Date(end.getFullYear(), end.getMonth(), 1), end }; }
    case "previous-quarter": { const q = Math.floor(ref.getMonth() / 3); const prevQ = (q + 3) % 4; const year = q === 0 ? ref.getFullYear() - 1 : ref.getFullYear(); const sm = prevQ * 3; return { start: new Date(year, sm, 1), end: new Date(year, sm + 3, 0) }; }
    case "previous-year": return { start: new Date(ref.getFullYear() - 1, 0, 1), end: new Date(ref.getFullYear() - 1, 11, 31) };
    case "custom": default: return { start: today, end: today };
  }
};
const formatValue = (key: string, value: unknown, currency = "SOS") => {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "number") return /count|age/i.test(key) ? String(value) : `${currency}${value.toFixed(2)}`;
  if (typeof value === "string" && /date/i.test(key)) {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? value : formatDate(parsed);
  }
  return String(value);
};

function SelectField({ label, value, onChange, options, width = "w-[180px]" }: { label: string; value: string; onChange: (value: string) => void; options: Array<{ key: string; label: string }>; width?: string; }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium text-[#334155]">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className={`h-9 rounded border border-[#cfd6e4] bg-white px-3 text-sm text-[#334155] outline-none focus:border-[#2a7b8a] ${width}`}>
        {options.map((option) => <option key={option.key} value={option.key}>{option.label}</option>)}
      </select>
    </label>
  );
}

function CountSelect({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium text-[#334155]">Count</span>
      <select value={String(value)} onChange={(event) => onChange(Number(event.target.value) || 1)} className="h-9 w-[120px] rounded border border-[#cfd6e4] bg-white px-3 text-sm outline-none focus:border-[#2a7b8a]">
        {COMPARISON_COUNTS.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  );
}
