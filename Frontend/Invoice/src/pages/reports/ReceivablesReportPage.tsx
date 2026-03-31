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
const parseInputDate = (value: string) => {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d);
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
  return <div />;
}
