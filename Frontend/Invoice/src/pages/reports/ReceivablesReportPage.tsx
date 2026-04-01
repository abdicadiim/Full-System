import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
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
  SlidersHorizontal,
  X,
} from "lucide-react";
import { getReportById, REPORTS_BY_CATEGORY } from "./reportsCatalog";
import { useSettings } from "../../lib/settings/SettingsContext";
import { reportsAPI } from "../../services/api";

type ReceivablesReportId =
  | "ar-aging-summary"
  | "ar-aging-details"
  | "invoice-details";

type ReportRow = { values: Record<string, any> };

type ColumnKind = "text" | "number" | "currency" | "date";
type ColumnOption = {
  key: string;
  label: string;
  kind: ColumnKind;
  locked?: boolean;
};
type ColumnGroup = { label: string; options: ColumnOption[] };
type FilterOption = { key: string; label: string; values?: FilterOption[] };
type FilterGroup = { label: string; options: FilterOption[] };
type FilterRow = {
  id: string;
  field: string;
  comparator: string;
  value: string;
};
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
type CompareWithKey = "none" | "previous-years" | "previous-periods";
type ReportPayload = {
  rows: ReportRow[];
  totals?: Record<string, any>;
  currency?: string;
};

type ReportConfig = {
  fetcher: (params?: Record<string, any>) => Promise<any>;
  title: string;
  subtitleMode: "as-of" | "from-to";
  defaultRange: "today" | "this-month";
  showEntities: boolean;
  showReportBy: boolean;
  showAgingBy: boolean;
  defaultReportBy?: string;
  reportByOptions?: Array<{ key: string; label: string }>;
  rightControls: Array<{
    label: string;
    state: "groupBy" | "showBy" | "agingIntervals";
    options: FilterOption[];
  }>;
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

const COMPARE_WITH_OPTIONS: Array<{ key: CompareWithKey; label: string }> = [
  { key: "none", label: "None" },
  { key: "previous-years", label: "Previous Year(s)" },
  { key: "previous-periods", label: "Previous Period(s)" },
];

const COMPARE_WITH_NUMBER_OPTIONS = Array.from({ length: 35 }, (_, index) =>
  String(index + 1),
);

const getCompareWithLabel = (key: CompareWithKey) =>
  COMPARE_WITH_OPTIONS.find((option) => option.key === key)?.label ?? "None";

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

const formatDate = (d: Date) =>
  d.toLocaleDateString("en-GB", {
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
const CALENDAR_YEAR_OPTIONS = Array.from(
  { length: 120 },
  (_, index) => 2007 + index,
);
const getStartOfMonth = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), 1);
const addMonths = (date: Date, amount: number) =>
  new Date(date.getFullYear(), date.getMonth() + amount, 1);
const isSameDay = (left: Date, right: Date) =>
  left.getFullYear() === right.getFullYear() &&
  left.getMonth() === right.getMonth() &&
  left.getDate() === right.getDate();
const isSameMonth = (left: Date, right: Date) =>
  left.getFullYear() === right.getFullYear() &&
  left.getMonth() === right.getMonth();
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
const currencyValue = (value: any, currency = "SOS") => {
  const num = Number(value ?? 0);
  return Number.isNaN(num)
    ? String(value ?? "")
    : `${num < 0 ? `${currency}-` : currency}${Math.abs(num).toFixed(2)}`;
};
const numberValue = (value: any) => {
  const num = Number(value ?? 0);
  return Number.isNaN(num) ? String(value ?? "") : num.toLocaleString("en-US");
};
const dateValue = (value: any) => {
  const date = new Date(String(value ?? ""));
  return Number.isNaN(date.getTime()) ? String(value ?? "") : formatDate(date);
};

const startOf = (d: Date) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate());
const endOf = (d: Date) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

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
  if (key === "this-month")
    return {
      start: new Date(today.getFullYear(), today.getMonth(), 1),
      end: new Date(today.getFullYear(), today.getMonth() + 1, 0),
    };
  if (key === "this-quarter") {
    const q = Math.floor(today.getMonth() / 3) * 3;
    return {
      start: new Date(today.getFullYear(), q, 1),
      end: new Date(today.getFullYear(), q + 3, 0),
    };
  }
  if (key === "this-year")
    return {
      start: new Date(today.getFullYear(), 0, 1),
      end: new Date(today.getFullYear(), 11, 31),
    };
  if (key === "previous-week") {
    const d = new Date(today);
    d.setDate(d.getDate() - 7);
    const s = startOf(d);
    s.setDate(s.getDate() - s.getDay());
    const e = endOf(s);
    e.setDate(e.getDate() + 6);
    return { start: s, end: e };
  }
  if (key === "previous-month")
    return {
      start: new Date(today.getFullYear(), today.getMonth() - 1, 1),
      end: new Date(today.getFullYear(), today.getMonth(), 0),
    };
  if (key === "previous-quarter") {
    const q = Math.floor((today.getMonth() - 3) / 3) * 3;
    return {
      start: new Date(today.getFullYear(), q, 1),
      end: new Date(today.getFullYear(), q + 3, 0),
    };
  }
  if (key === "previous-year")
    return {
      start: new Date(today.getFullYear() - 1, 0, 1),
      end: new Date(today.getFullYear() - 1, 11, 31),
    };
  return { start: startOf(today), end: endOf(today) };
};

const makeId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

type ReportsDrawerSection = {
  id: string;
  label: string;
  reportIds: string[];
};

const REPORTS_DRAWER_SECTIONS: ReportsDrawerSection[] = [
  {
    id: "sales",
    label: "Sales",
    reportIds: ["sales-by-customer", "sales-by-item", "sales-by-sales-person"],
  },
  {
    id: "receivables",
    label: "Receivables",
    reportIds: [
      "ar-aging-summary",
      "ar-aging-details",
      "invoice-details",
      "quote-details",
      "bad-debts",
      "bank-charges",
      "customer-balance-summary",
      "receivable-summary",
      "receivable-details",
    ],
  },
  {
    id: "payments-received",
    label: "Payments Received",
    reportIds: [
      "payments-received",
      "time-to-get-paid",
      "credit-note-details",
      "refund-history",
      "withholding-tax",
    ],
  },
  {
    id: "subscriptions",
    label: "Recurring Invoices",
    reportIds: ["subscription-details"],
  },
  {
    id: "purchases-expenses",
    label: "Purchases and Expenses",
    reportIds: [
      "expense-details",
      "expenses-by-category",
      "expenses-by-customer",
      "expenses-by-project",
      "billable-expense-details",
    ],
  },
  {
    id: "taxes",
    label: "Taxes",
    reportIds: ["tax-summary", "tds-receivables"],
  },
  {
    id: "projects-timesheets",
    label: "Projects and Timesheet",
    reportIds: [
      "timesheet-details",
      "project-summary",
      "project-details",
      "projects-revenue-summary",
    ],
  },
  {
    id: "activity",
    label: "Activity",
    reportIds: [
      "system-mails",
      "activity-logs-audit-trail",
      "exception-report",
      "portal-activities",
      "customer-reviews",
    ],
  },
];

function ReportsDrawer({
  open,
  currentCategoryId,
  currentReportId,
  triggerRef,
  onClose,
}: {
  open: boolean;
  currentCategoryId: string;
  currentReportId: string;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  onClose: () => void;
}) {
  const drawerRef = React.useRef<HTMLDivElement | null>(null);
  const [search, setSearch] = useState("");
  const [expandedSections, setExpandedSections] = useState<string[]>([
    currentCategoryId,
  ]);

  useEffect(() => {
    setExpandedSections((prev) =>
      prev.includes(currentCategoryId) ? prev : [currentCategoryId],
    );
  }, [currentCategoryId]);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        !drawerRef.current?.contains(target) &&
        !triggerRef.current?.contains(target)
      ) {
        onClose();
      }
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
  }, [open, onClose, triggerRef]);

  const sections = useMemo(() => {
    const query = search.trim().toLowerCase();
    return REPORTS_DRAWER_SECTIONS.map((section) => {
      const available = REPORTS_BY_CATEGORY[section.id] || [];
      const reports = section.reportIds
        .map((reportId) => available.find((report) => report.id === reportId))
        .filter(Boolean) as typeof available;

      const filteredReports = query
        ? reports.filter(
            (report) =>
              report.name.toLowerCase().includes(query) ||
              section.label.toLowerCase().includes(query),
          )
        : reports;

      return { ...section, reports: filteredReports };
    }).filter((section) => section.reports.length > 0);
  }, [search]);

  if (!open) return null;

  const isSearching = search.trim().length > 0;

  return (
    <div
      ref={drawerRef}
      className="absolute left-0 top-0 z-30 h-full w-[260px] overflow-hidden border-r border-[#e5e7eb] bg-white shadow-[8px_0_20px_rgba(15,23,42,0.08)]"
    >
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b border-[#eef2f7] px-4 py-3">
          <div className="text-[18px] font-semibold text-[#0f172a]">
            Reports
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-7 w-7 items-center justify-center text-[#ef4444] hover:bg-[#fef2f2]"
            aria-label="Close reports drawer"
          >
            <X size={16} />
          </button>
        </div>
        <div className="border-b border-[#eef2f7] px-3 py-3">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search reports"
            className="h-9 w-full rounded-lg border border-[#d8dfea] bg-white px-3 text-sm text-[#334155] outline-none placeholder:text-[#94a3b8] focus:border-[#7da0ff]"
          />
        </div>
        <div className="flex-1 overflow-y-auto px-2 py-2">
          <div className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#64748b]">
            All Reports
          </div>
          {sections.length > 0 ? (
            <div className="space-y-1">
              {sections.map((section) => {
                const expanded =
                  isSearching || expandedSections.includes(section.id);
                return (
                  <div key={section.id}>
                    <button
                      type="button"
                      onClick={() => {
                        if (isSearching) return;
                        setExpandedSections((prev) =>
                          prev.includes(section.id) ? [] : [section.id],
                        );
                      }}
                      className="flex w-full items-center justify-between gap-2 rounded px-2 py-1.5 text-left text-sm text-[#111827] hover:bg-[#f8fafc]"
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <Folder size={14} className="text-[#9aa3b2]" />
                        <span className="truncate">{section.label}</span>
                      </span>
                      {expanded ? (
                        <ChevronDown size={12} className="text-[#9aa3b2]" />
                      ) : (
                        <ChevronRight size={12} className="text-[#9aa3b2]" />
                      )}
                    </button>

                    {expanded ? (
                      <div className="ml-5 mt-1 space-y-0.5">
                        {section.reports.map((report) => {
                          const isActive = report.id === currentReportId;
                          return (
                            <Link
                              key={report.id}
                              to={`/reports/${report.categoryId}/${report.id}`}
                              onClick={onClose}
                              className={`block rounded px-2 py-1.5 text-sm hover:bg-[#eef4ff] ${
                                isActive
                                  ? "bg-[#eef4ff] font-medium text-[#111827]"
                                  : "text-[#111827] hover:text-black"
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
          ) : (
            <div className="px-2 py-4 text-sm text-[#64748b]">
              No reports found.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

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
          {
            key: "outstanding-invoice-amount",
            label: "Outstanding Invoice Amount",
          },
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
          {
            key: "currency",
            label: "Currency",
            values: CURRENCY_CODES.map((value) => ({
              key: value,
              label: value,
            })),
          },
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
        options: [
          {
            key: "location",
            label: "Location",
            values: [
              { key: "mogadishu", label: "Mogadishu" },
              { key: "hargeisa", label: "Hargeisa" },
            ],
          },
        ],
      },
    ],
    moreFilterValues: {
      currency: CURRENCY_CODES.map((value) => ({ key: value, label: value })),
      location: [
        { key: "mogadishu", label: "Mogadishu" },
        { key: "hargeisa", label: "Hargeisa" },
      ],
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
    defaultColumns: [
      "name",
      "current",
      "1-15-days",
      "16-30-days",
      "31-45-days",
      "gt-45-days",
      "total",
      "total-fcy",
    ],
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
          {
            key: "type",
            label: "Type",
            values: [
              { key: "invoice", label: "Invoice" },
              { key: "debit-note", label: "Debit Note" },
              { key: "credit-note", label: "Credit Note" },
            ],
          },
          {
            key: "status",
            label: "Status",
            values: [
              { key: "paid", label: "Paid" },
              { key: "overdue", label: "Overdue" },
              { key: "draft", label: "Draft" },
            ],
          },
          { key: "customer-name", label: "Customer Name" },
          { key: "age", label: "Age" },
          { key: "amount", label: "Amount" },
          { key: "balance-due", label: "Balance Due" },
          {
            key: "currency",
            label: "Currency",
            values: CURRENCY_CODES.map((value) => ({
              key: value,
              label: value,
            })),
          },
        ],
      },
      {
        label: "Locations",
        options: [
          {
            key: "location",
            label: "Location",
            values: [
              { key: "mogadishu", label: "Mogadishu" },
              { key: "hargeisa", label: "Hargeisa" },
            ],
          },
        ],
      },
    ],
    moreFilterValues: {
      type: [
        { key: "invoice", label: "Invoice" },
        { key: "debit-note", label: "Debit Note" },
        { key: "credit-note", label: "Credit Note" },
      ],
      status: [
        { key: "paid", label: "Paid" },
        { key: "overdue", label: "Overdue" },
        { key: "draft", label: "Draft" },
      ],
      currency: CURRENCY_CODES.map((value) => ({ key: value, label: value })),
      location: [
        { key: "mogadishu", label: "Mogadishu" },
        { key: "hargeisa", label: "Hargeisa" },
      ],
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
    defaultColumns: [
      "date",
      "due-date",
      "transaction",
      "type",
      "status",
      "customer-name",
      "age",
      "amount",
      "balance-due",
    ],
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
          {
            key: "status",
            label: "Status",
            values: [
              { key: "paid", label: "Paid" },
              { key: "overdue", label: "Overdue" },
              { key: "draft", label: "Draft" },
            ],
          },
          { key: "invoice-date", label: "Invoice Date" },
          { key: "due-date", label: "Due Date" },
          { key: "invoice-number", label: "Invoice#" },
          { key: "order-number", label: "Order Number" },
          { key: "customer-name", label: "Customer Name" },
          { key: "total", label: "Total" },
          { key: "balance", label: "Balance" },
          {
            key: "currency",
            label: "Currency",
            values: CURRENCY_CODES.map((value) => ({
              key: value,
              label: value,
            })),
          },
        ],
      },
      {
        label: "Locations",
        options: [
          {
            key: "location",
            label: "Location",
            values: [
              { key: "mogadishu", label: "Mogadishu" },
              { key: "hargeisa", label: "Hargeisa" },
            ],
          },
        ],
      },
    ],
    moreFilterValues: {
      status: [
        { key: "paid", label: "Paid" },
        { key: "overdue", label: "Overdue" },
        { key: "draft", label: "Draft" },
      ],
      currency: CURRENCY_CODES.map((value) => ({ key: value, label: value })),
      location: [
        { key: "mogadishu", label: "Mogadishu" },
        { key: "hargeisa", label: "Hargeisa" },
      ],
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
    defaultColumns: [
      "status",
      "invoice-date",
      "due-date",
      "invoice-number",
      "order-number",
      "customer-name",
      "total",
      "balance",
    ],
  },
};

const columnLookup = (reportId: ReceivablesReportId, key: string) =>
  RECEIVABLES_CONFIG[reportId].columns
    .flatMap((group) => group.options)
    .find((option) => option.key === key);

const fieldLookup = (config: ReportConfig, key: string) =>
  config.moreFilterGroups
    .flatMap((group) => group.options)
    .find((option) => option.key === key);

const makeFilterRow = (): FilterRow => ({
  id: makeId(),
  field: "",
  comparator: "",
  value: "",
});

export default function ReceivablesReportPage({
  reportId,
}: {
  reportId: ReceivablesReportId;
}) {
  if (!getReportById("receivables", reportId))
    return <Navigate to="/reports" replace />;
  return <ReceivablesReportShell reportId={reportId} />;
}

function ReceivablesReportShell({
  reportId,
}: {
  reportId: ReceivablesReportId;
}) {
  const config = RECEIVABLES_CONFIG[reportId];
  const navigate = useNavigate();
  const { settings } = useSettings();
  const organizationName = String(
    settings?.general?.companyDisplayName ||
      settings?.general?.schoolDisplayName ||
      "",
  ).trim();
  const debugReceivables =
    typeof window !== "undefined" &&
    (window.localStorage.getItem("reports_debug") === "1" ||
      window.location.search.includes("debug=1"));

  const dateRangeRef = useRef<HTMLDivElement | null>(null);
  const [dateRangeKey, setDateRangeKey] = useState<DateRangeKey>(
    config.defaultRange,
  );
  const [dateRangeDraftKey, setDateRangeDraftKey] = useState<DateRangeKey>(
    config.defaultRange,
  );
  const [dateRangeOpen, setDateRangeOpen] = useState(false);
  const [isCustomDateRangeOpen, setIsCustomDateRangeOpen] = useState(false);
  const [customDateRange, setCustomDateRange] = useState<DateRangeValue>(() =>
    getRange(config.defaultRange),
  );
  const [customDateRangeDraft, setCustomDateRangeDraft] =
    useState<DateRangeValue>(() => getRange(config.defaultRange));
  const [customDateRangeMonth, setCustomDateRangeMonth] = useState<Date>(() =>
    getStartOfMonth(getRange(config.defaultRange).start),
  );
  const [entities, setEntities] = useState("invoice");
  const [agingBy, setAgingBy] = useState("invoice-due-date");
  const [reportBy, setReportBy] = useState("invoice-date");
  const [groupBy, setGroupBy] = useState(
    config.rightControls[0]?.options[0]?.key || "none",
  );
  const [showBy, setShowBy] = useState(
    config.rightControls.find((item) => item.state === "showBy")?.options[0]
      ?.key || "outstanding-invoice-amount",
  );
  const [agingIntervals, setAgingIntervals] = useState(
    config.rightControls.find((item) => item.state === "agingIntervals")
      ?.options[0]?.key || "4x15",
  );
  const [moreFiltersOpen, setMoreFiltersOpen] = useState(false);
  const [moreFilters, setMoreFilters] = useState<FilterRow[]>([]);
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [selectedColumns, setSelectedColumns] = useState<string[]>(
    config.defaultColumns,
  );
  const [columnDraft, setColumnDraft] = useState<string[]>(
    config.defaultColumns,
  );
  const [columnSearch, setColumnSearch] = useState("");
  const [activeAvailableColumn, setActiveAvailableColumn] = useState(
    config.defaultColumns[0] || "",
  );
  const [payload, setPayload] = useState<ReportPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [refreshTick, setRefreshTick] = useState(0);
  const [compareWithOpen, setCompareWithOpen] = useState(false);
  const [compareWithCountOpen, setCompareWithCountOpen] = useState(false);
  const [compareWithKey, setCompareWithKey] = useState<CompareWithKey>("none");
  const [compareWithDraftKey, setCompareWithDraftKey] =
    useState<CompareWithKey>("none");
  const [compareWithCount, setCompareWithCount] = useState(1);
  const [compareWithDraftCount, setCompareWithDraftCount] = useState(1);
  const [compareWithArrangeLatest, setCompareWithArrangeLatest] =
    useState(false);
  const [compareWithDraftArrangeLatest, setCompareWithDraftArrangeLatest] =
    useState(false);
  const [isReportsDrawerOpen, setIsReportsDrawerOpen] = useState(false);
  const reportsMenuButtonRef = React.useRef<HTMLButtonElement | null>(null);
  const compareWithRef = React.useRef<HTMLDivElement | null>(null);
  const compareWithCountRef = React.useRef<HTMLDivElement | null>(null);

  const selectedDateRange = useMemo(() => {
    return dateRangeKey === "custom" ? customDateRange : getRange(dateRangeKey);
  }, [customDateRange, dateRangeKey]);
  const dateRangeLabel =
    DATE_RANGE_OPTIONS.find((option) => option.key === dateRangeKey)?.label ??
    "Today";
  const dateLabel = useMemo(
    () =>
      config.subtitleMode === "as-of"
        ? `As of ${formatDate(selectedDateRange.end)}`
        : `From ${formatDate(selectedDateRange.start)} To ${formatDate(selectedDateRange.end)}`,
    [config.subtitleMode, selectedDateRange.end, selectedDateRange.start],
  );
  const visibleColumns = useMemo(
    () =>
      selectedColumns
        .map((key) => columnLookup(reportId, key))
        .filter(Boolean) as ColumnOption[],
    [reportId, selectedColumns],
  );
  const rows = (payload?.rows ?? []) as ReportRow[];
  const totals = payload?.totals ?? null;

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const params: Record<string, any> = {
          fromDate: selectedDateRange.start.toISOString(),
          toDate: selectedDateRange.end.toISOString(),
          compareWith: compareWithKey,
          compareCount: String(compareWithCount),
          moreFilters: JSON.stringify(
            moreFilters.filter((row) => row.field && row.comparator),
          ),
          groupBy,
          showBy,
          agingIntervals,
        };
        if (config.showEntities) params.entities = entities;
        if (config.showAgingBy) params.agingBy = agingBy;
        if (config.showReportBy) params.reportBy = reportBy;
        if (debugReceivables) {
          console.debug(`[receivables:${reportId}] request`, params);
        }
        const response = await config.fetcher(params);
        if (debugReceivables) {
          console.debug(`[receivables:${reportId}] response`, response?.data);
        }
        setPayload(response?.data ?? null);
      } catch (err: any) {
        if (debugReceivables) {
          console.debug(`[receivables:${reportId}] error`, err);
        }
        setError(String(err?.message || "Failed to load report"));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [
    agingBy,
    agingIntervals,
    config,
    entities,
    groupBy,
    moreFilters,
    selectedDateRange.end.getTime(),
    selectedDateRange.start.getTime(),
    refreshTick,
    reportBy,
    showBy,
    compareWithCount,
    compareWithKey,
  ]);

  useEffect(() => {
    if (!compareWithOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        !compareWithRef.current?.contains(target) &&
        !compareWithCountRef.current?.contains(target)
      ) {
        setCompareWithOpen(false);
        setCompareWithCountOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setCompareWithOpen(false);
        setCompareWithCountOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [compareWithOpen]);

  const formatCell = (column: ColumnOption, value: any) => {
    if (value === null || value === undefined || value === "") return "—";
    if (column.kind === "currency")
      return currencyValue(value, String(payload?.currency || "SOS"));
    if (column.kind === "number") return numberValue(value);
    if (column.kind === "date") return dateValue(value);
    return String(value);
  };

  const addFilterRow = () =>
    setMoreFilters((rows) => [...rows, makeFilterRow()]);
  const updateFilterRow = (id: string, patch: Partial<FilterRow>) =>
    setMoreFilters((rows) =>
      rows.map((row) => (row.id === id ? { ...row, ...patch } : row)),
    );
  const removeFilterRow = (id: string) =>
    setMoreFilters((rows) => rows.filter((row) => row.id !== id));
  const openColumns = () => {
    setColumnDraft(selectedColumns);
    setColumnsOpen(true);
    setDateRangeOpen(false);
    setIsCustomDateRangeOpen(false);
    setCompareWithOpen(false);
    setCompareWithCountOpen(false);
  };
  const applyColumns = () => {
    const next = columnDraft.filter((key) => columnLookup(reportId, key));
    setSelectedColumns(next.length ? next : config.defaultColumns);
    setColumnsOpen(false);
  };

  const openCompareWithDropdown = () => {
    setCompareWithDraftKey(compareWithKey);
    setCompareWithDraftCount(compareWithKey === "none" ? 1 : compareWithCount);
    setCompareWithDraftArrangeLatest(compareWithArrangeLatest);
    setDateRangeOpen(false);
    setIsCustomDateRangeOpen(false);
    setCompareWithCountOpen(false);
    setCompareWithOpen((prev) => !prev);
  };

  const applyCompareWith = () => {
    setCompareWithKey(compareWithDraftKey);
    setCompareWithCount(
      compareWithDraftKey === "none" ? 1 : compareWithDraftCount,
    );
    setCompareWithArrangeLatest(compareWithDraftArrangeLatest);
    setCompareWithOpen(false);
    setCompareWithCountOpen(false);
  };

  const cancelCompareWith = () => {
    setCompareWithDraftKey(compareWithKey);
    setCompareWithDraftCount(compareWithCount);
    setCompareWithDraftArrangeLatest(compareWithArrangeLatest);
    setCompareWithOpen(false);
    setCompareWithCountOpen(false);
  };

  const openDateRangeDropdown = () => {
    if (dateRangeOpen) {
      setDateRangeOpen(false);
      setIsCustomDateRangeOpen(false);
      return;
    }

    const currentRange =
      dateRangeKey === "custom" ? customDateRange : getRange(dateRangeKey);
    setDateRangeDraftKey(dateRangeKey);
    setCustomDateRangeDraft(currentRange);
    setCustomDateRangeMonth(getStartOfMonth(currentRange.start));
    setIsCustomDateRangeOpen(dateRangeKey === "custom");
    setDateRangeOpen(true);
  };

  const cancelDateRangeSelection = () => {
    setDateRangeDraftKey(dateRangeKey);
    setCustomDateRangeDraft(customDateRange);
    setCustomDateRangeMonth(
      getStartOfMonth(
        dateRangeKey === "custom"
          ? customDateRange.start
          : getRange(dateRangeKey).start,
      ),
    );
    setIsCustomDateRangeOpen(false);
    setDateRangeOpen(false);
  };

  const applyDateRange = () => {
    if (dateRangeDraftKey === "custom") {
      setCustomDateRange(customDateRangeDraft);
    }
    setDateRangeKey(dateRangeDraftKey);
    setDateRangeOpen(false);
    setIsCustomDateRangeOpen(false);
  };

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

  useEffect(() => {
    if (!dateRangeOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!dateRangeRef.current?.contains(target)) {
        cancelDateRangeSelection();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        cancelDateRangeSelection();
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [dateRangeOpen, cancelDateRangeSelection]);
  const setRightCalendarMonth = (monthIndex: number, year: number) => {
    setCustomDateRangeMonth(addMonths(new Date(year, monthIndex, 1), -1));
  };

  return (
    <div className="relative min-h-[calc(100vh-64px)] pt-3">
      <ReportsDrawer
        open={isReportsDrawerOpen}
        currentCategoryId="receivables"
        currentReportId={reportId}
        triggerRef={reportsMenuButtonRef}
        onClose={() => setIsReportsDrawerOpen(false)}
      />

      <div
        className={`pr-3 transition-[padding-left] duration-200 ${isReportsDrawerOpen ? "lg:pl-[260px]" : ""}`}
      >
        <div className="min-h-[calc(100vh-64px)] bg-white">
          <div className="px-4 pt-3">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#e6e9f0] pb-3">
              <div className="flex min-w-0 items-start gap-3">
                <button
                  ref={reportsMenuButtonRef}
                  type="button"
                  onClick={() => setIsReportsDrawerOpen((prev) => !prev)}
                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded border border-[#d4d9e4] bg-white text-[#334155] hover:bg-[#f8fafc]"
                  aria-label="Toggle reports menu"
                >
                  <Menu size={15} />
                </button>
                <div className="min-w-0">
                  <div className="mb-1 text-sm font-medium text-[#2563eb]">
                    Receivables
                  </div>
                  <div className="flex min-w-0 items-baseline gap-2">
                    <h1 className="truncate text-[24px] font-semibold leading-tight text-[#0f172a]">
                      {config.title}
                    </h1>
                    <span className="whitespace-nowrap text-sm text-[#475569]">
                      - {dateLabel}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={openColumns}
                  className="inline-flex h-8 w-8 items-center justify-center rounded border border-[#d4d9e4] text-[#334155] hover:bg-[#f8fafc]"
                  title="Customize report columns"
                >
                  <SlidersHorizontal size={15} />
                </button>
                <button
                  type="button"
                  className="inline-flex h-8 items-center gap-1 rounded border border-[#d4d9e4] bg-white px-3 text-sm font-medium text-[#1e293b] hover:bg-[#f8fafc]"
                >
                  Export <ChevronDown size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => setRefreshTick((value) => value + 1)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded border border-[#d4d9e4] text-[#334155] hover:bg-[#f8fafc]"
                >
                  <RefreshCw size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/reports")}
                  className="inline-flex h-8 w-8 items-center justify-center rounded border border-[#d4d9e4] text-[#ef4444] hover:bg-[#fef2f2]"
                >
                  <X size={15} />
                </button>
              </div>
            </div>
          </div>

          <div className="relative z-20 mt-4 flex flex-wrap items-center gap-2 overflow-visible border-t border-b border-[#e5e7eb] bg-white py-3">
            <div className="flex items-center gap-2 text-sm text-[#334155]">
              <Filter size={14} />
              <span>Filters :</span>
            </div>

            <div ref={dateRangeRef} className="relative z-50">
              <button
                type="button"
                onClick={openDateRangeDropdown}
                className={`inline-flex h-8 min-w-[170px] items-center justify-between gap-3 rounded border px-3 text-sm text-[#334155] hover:bg-white ${
                  dateRangeOpen
                    ? "border-[#1b6f7b] bg-white"
                    : "border-[#cfd6e4] bg-[#f8fafc]"
                }`}
                aria-haspopup="menu"
                aria-expanded={dateRangeOpen}
              >
                <span className="inline-flex items-center gap-2">
                  <CalendarDays size={14} className="text-[#64748b]" />
                  <span>
                    {config.subtitleMode === "as-of" ? "As of" : "Date Range"} :
                  </span>
                  <strong>{dateRangeLabel}</strong>
                </span>
                <ChevronDown size={14} />
              </button>

              {dateRangeOpen ? (
                <div
                  className={`absolute left-0 top-[calc(100%+6px)] z-40 overflow-visible rounded-lg border border-[#d7dce7] bg-white shadow-[0_10px_24px_rgba(15,23,42,0.12)] ${
                    isCustomDateRangeOpen ? "w-[680px]" : "w-[165px]"
                  }`}
                >
                  <div className="flex">
                    <div className="w-[165px] border-r border-[#eef2f7]">
                      <div className="max-h-[280px] overflow-y-auto py-1">
                        {DATE_RANGE_OPTIONS.map((option) => {
                          const isSelected = option.key === dateRangeDraftKey;
                          return (
                            <button
                              key={option.key}
                              type="button"
                              onClick={() => {
                                if (option.key === "custom") {
                                  const currentRange =
                                    dateRangeKey === "custom"
                                      ? customDateRange
                                      : selectedDateRange;
                                  setDateRangeDraftKey("custom");
                                  setCustomDateRangeDraft(currentRange);
                                  setCustomDateRangeMonth(
                                    getStartOfMonth(currentRange.start),
                                  );
                                  setIsCustomDateRangeOpen(true);
                                  return;
                                }

                                setDateRangeKey(option.key);
                                setDateRangeDraftKey(option.key);
                                setIsCustomDateRangeOpen(false);
                                setDateRangeOpen(false);
                              }}
                              className={`flex w-full items-center justify-between px-4 py-2 text-left text-sm ${
                                isSelected
                                  ? "font-medium text-[#0f172a]"
                                  : "text-[#334155] hover:bg-[#f8fafc]"
                              }`}
                            >
                              <span>{option.label}</span>
                              {isSelected ? (
                                <Check size={14} className="text-[#0f172a]" />
                              ) : null}
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
                                value={formatPickerDate(
                                  customDateRangeDraft.start,
                                )}
                                className="h-10 w-full rounded border border-[#1b6f7b] bg-white pl-9 pr-3 text-sm text-[#334155] outline-none"
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
                                value={formatPickerDate(
                                  customDateRangeDraft.end,
                                )}
                                className="h-10 w-full rounded border border-[#1b6f7b] bg-white pl-9 pr-3 text-sm text-[#334155] outline-none"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="mt-3 grid grid-cols-[1fr_1fr] gap-3">
                          {[
                            {
                              month: customDateRangeMonth,
                              side: "start" as const,
                            },
                            {
                              month: addMonths(customDateRangeMonth, 1),
                              side: "end" as const,
                            },
                          ].map(({ month, side }) => {
                            const monthLabel = month.toLocaleDateString(
                              "en-US",
                              { month: "short", year: "numeric" },
                            );
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
                                      setCustomDateRangeMonth((prev) =>
                                        addMonths(prev, -1),
                                      )
                                    }
                                    className="inline-flex h-6 w-6 items-center justify-center rounded hover:bg-[#f8fafc]"
                                    aria-label="Previous month"
                                  >
                                    <ChevronRight
                                      size={14}
                                      className="rotate-180 text-[#64748b]"
                                    />
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
                                      setCustomDateRangeMonth((prev) =>
                                        addMonths(prev, 1),
                                      )
                                    }
                                    className="inline-flex h-6 w-6 items-center justify-center rounded hover:bg-[#f8fafc]"
                                    aria-label="Next month"
                                  >
                                    <ChevronRight
                                      size={14}
                                      className="text-[#64748b]"
                                    />
                                  </button>
                                </div>

                                <table className="w-full table-fixed border-collapse text-center text-[11px]">
                                  <thead>
                                    <tr className="text-[#1b6f7b]">
                                      {[
                                        "Su",
                                        "Mo",
                                        "Tu",
                                        "We",
                                        "Th",
                                        "Fr",
                                        "Sa",
                                      ].map((day) => (
                                        <th
                                          key={day}
                                          className="pb-1 font-semibold"
                                        >
                                          {day}
                                        </th>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {weeks.map((week, weekIndex) => (
                                      <tr key={`${side}-week-${weekIndex}`}>
                                        {week.map((day) => {
                                          const inCurrentMonth = isSameMonth(
                                            day,
                                            month,
                                          );
                                          const isStart = isSameDay(
                                            day,
                                            customDateRangeDraft.start,
                                          );
                                          const isEnd = isSameDay(
                                            day,
                                            customDateRangeDraft.end,
                                          );
                                          const inRange =
                                            day >= customDateRangeDraft.start &&
                                            day <= customDateRangeDraft.end;
                                          const isToday = isSameDay(
                                            day,
                                            new Date(),
                                          );

                                          return (
                                            <td
                                              key={day.toISOString()}
                                              className="p-0"
                                            >
                                              <button
                                                type="button"
                                                onClick={() =>
                                                  side === "start"
                                                    ? handleCustomStartDateClick(
                                                        day,
                                                      )
                                                    : handleCustomEndDateClick(
                                                        day,
                                                      )
                                                }
                                                className={`m-[1px] flex h-7 w-full items-center justify-center rounded text-[11px] ${
                                                  !inCurrentMonth
                                                    ? "text-[#cbd5e1]"
                                                    : isStart || isEnd
                                                      ? "bg-[#1b6f7b] font-semibold text-white"
                                                      : inRange
                                                        ? "bg-[#d9eff1] text-[#0f172a]"
                                                        : "text-[#334155] hover:bg-[#f8fafc]"
                                                } ${isToday && !isStart && !isEnd ? "ring-1 ring-inset ring-[#1b6f7b]/30" : ""}`}
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
                              onClick={applyDateRange}
                              className="inline-flex h-8 items-center rounded bg-[#1b6f7b] px-3 text-sm font-semibold text-white hover:bg-[#155963]"
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

            {config.showReportBy ? (
              <label className="inline-flex h-8 items-center gap-2 rounded border border-[#cfd6e4] bg-[#f8fafc] px-3 text-sm text-[#334155]">
                <span>Report By :</span>
                <select
                  value={reportBy}
                  onChange={(event) => setReportBy(event.target.value)}
                  className="bg-transparent outline-none"
                >
                  <option value="invoice-date">Invoice Date</option>
                  <option value="due-date">Due Date</option>
                </select>
              </label>
            ) : null}

            {config.showAgingBy ? (
              <label className="inline-flex h-8 items-center gap-2 rounded border border-[#cfd6e4] bg-[#f8fafc] px-3 text-sm text-[#334155]">
                <span>Aging By :</span>
                <select
                  value={agingBy}
                  onChange={(event) => setAgingBy(event.target.value)}
                  className="bg-transparent outline-none"
                >
                  <option value="invoice-due-date">Invoice Due Date</option>
                  <option value="invoice-date">Invoice Date</option>
                </select>
              </label>
            ) : null}

            {config.showEntities ? (
              <label className="inline-flex h-8 items-center gap-2 rounded border border-[#cfd6e4] bg-[#f8fafc] px-3 text-sm text-[#334155]">
                <span>Entities :</span>
                <select
                  value={entities}
                  onChange={(event) => setEntities(event.target.value)}
                  className="bg-transparent outline-none"
                >
                  {ENTITY_OPTIONS.map((option) => (
                    <option key={option.key} value={option.key}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            <button
              type="button"
              onClick={() => setMoreFiltersOpen((value) => !value)}
              className="inline-flex h-8 items-center gap-1 rounded border border-[#cfd6e4] bg-white px-3 text-sm text-[#334155] hover:bg-[#f8fafc]"
            >
              <Plus size={14} className="text-[#1b6f7b]" /> More Filters
            </button>

            <button
              type="button"
              onClick={() => setRefreshTick((value) => value + 1)}
              className="inline-flex h-8 items-center gap-1 rounded bg-[#1b6f7b] px-4 text-sm font-semibold text-white hover:bg-[#155963]"
            >
              <CalendarDays size={14} /> Run Report
            </button>
          </div>

          {moreFiltersOpen ? (
            <div className="mt-3 rounded-xl border border-[#d7dce7] bg-white p-4 shadow-sm">
              <div className="space-y-3">
                {moreFilters.map((row, index) => {
                  const fieldDef = fieldLookup(config, row.field);
                  const values =
                    fieldDef?.values ||
                    config.moreFilterValues[row.field] ||
                    [];
                  const mode = NO_VALUE.has(row.comparator)
                    ? "none"
                    : values.length
                      ? "select"
                      : "text";
                  return (
                    <div
                      key={row.id}
                      className="flex flex-wrap items-center gap-2"
                    >
                      <div className="inline-flex h-9 w-10 items-center justify-center rounded border border-[#cfd6e4] bg-[#f8fafc] text-sm text-[#334155]">
                        {index + 1}
                      </div>
                      <select
                        value={row.field}
                        onChange={(event) =>
                          updateFilterRow(row.id, {
                            field: event.target.value,
                            comparator: "",
                            value: "",
                          })
                        }
                        className="h-9 min-w-[220px] rounded border border-[#cfd6e4] px-3 text-sm outline-none"
                      >
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
                      <select
                        value={row.comparator}
                        onChange={(event) =>
                          updateFilterRow(row.id, {
                            comparator: event.target.value,
                            value: "",
                          })
                        }
                        className="h-9 min-w-[170px] rounded border border-[#cfd6e4] px-3 text-sm outline-none"
                      >
                        <option value="">Select a comparator</option>
                        {COMPARATORS.map((option) => (
                          <option key={option.key} value={option.key}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      {mode === "select" ? (
                        <select
                          value={row.value}
                          onChange={(event) =>
                            updateFilterRow(row.id, {
                              value: event.target.value,
                            })
                          }
                          className="h-9 min-w-[220px] rounded border border-[#cfd6e4] px-3 text-sm outline-none"
                        >
                          <option value="">
                            {values[0]?.label || "Select a value"}
                          </option>
                          {values.map((option) => (
                            <option key={option.key} value={option.key}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      ) : mode === "text" ? (
                        <input
                          value={row.value}
                          onChange={(event) =>
                            updateFilterRow(row.id, {
                              value: event.target.value,
                            })
                          }
                          placeholder="Enter a value"
                          className="h-9 min-w-[220px] rounded border border-[#cfd6e4] px-3 text-sm outline-none"
                        />
                      ) : (
                        <div className="inline-flex h-9 min-w-[220px] items-center rounded border border-[#cfd6e4] bg-[#f8fafc] px-3 text-sm text-[#64748b]">
                          No value needed
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={addFilterRow}
                        className="inline-flex h-9 w-9 items-center justify-center rounded border border-[#cfd6e4] text-[#64748b]"
                      >
                        <Plus size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeFilterRow(row.id)}
                        className="inline-flex h-9 w-9 items-center justify-center rounded border border-[#cfd6e4] text-[#ef4444]"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={addFilterRow}
                className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-[#0f9aa7]"
              >
                <Plus size={14} /> Add More
              </button>

              <div className="mt-5 flex items-center gap-2 border-t border-[#e6e9f0] pt-4">
                <button
                  type="button"
                  onClick={() => setRefreshTick((value) => value + 1)}
                  className="inline-flex h-9 items-center rounded bg-[var(--button-primary)] px-4 text-sm font-semibold text-white hover:opacity-95"
                >
                  Run Report
                </button>
                <button
                  type="button"
                  onClick={() => setMoreFiltersOpen(false)}
                  className="inline-flex h-9 items-center rounded border border-[#d4d9e4] bg-white px-4 text-sm text-[#334155]"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : null}

          <div className="mt-3 flex flex-wrap items-center justify-end gap-2 text-sm text-[#475569]">
            {config.rightControls.map((control) => {
              const value =
                control.state === "groupBy"
                  ? groupBy
                  : control.state === "showBy"
                    ? showBy
                    : agingIntervals;
              const setValue =
                control.state === "groupBy"
                  ? setGroupBy
                  : control.state === "showBy"
                    ? setShowBy
                    : setAgingIntervals;
              return (
                <label
                  key={control.label}
                  className="inline-flex h-8 items-center gap-2 rounded border border-[#cfd6e4] bg-white px-3"
                >
                  <span>{control.label} :</span>
                  <select
                    value={value}
                    onChange={(event) => setValue(event.target.value)}
                    className="bg-transparent outline-none"
                  >
                    {control.options.map((option) => (
                      <option key={option.key} value={option.key}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              );
            })}

            <div ref={compareWithRef} className="relative">
              <button
                type="button"
                onClick={openCompareWithDropdown}
                className="inline-flex h-8 items-center gap-1 rounded border border-[#cfd6e4] bg-white px-3 text-sm text-[#334155] hover:bg-[#f8fafc]"
                aria-haspopup="menu"
                aria-expanded={compareWithOpen}
              >
                Compare With :{" "}
                <span className="font-medium text-[#0f172a]">
                  {getCompareWithLabel(compareWithKey)}
                </span>
                <ChevronDown
                  size={14}
                  className={`transition-transform duration-150 ${compareWithOpen ? "rotate-180 text-[#1f6f7a]" : "text-[#64748b]"}`}
                />
              </button>

              {compareWithOpen ? (
                <div className="absolute right-0 top-[calc(100%+6px)] z-40 w-[300px] overflow-hidden rounded-lg border border-[#d7dce7] bg-white shadow-[0_10px_24px_rgba(15,23,42,0.12)]">
                  <div className="border-b border-[#eef2f7] px-4 py-3 text-sm font-medium text-[#0f172a]">
                    Compare With
                  </div>
                  <div className="p-3">
                    <div className="max-h-[180px] overflow-y-auto rounded-lg border border-[#d7dce7] bg-white">
                      {COMPARE_WITH_OPTIONS.map((option) => {
                        const isSelected = compareWithDraftKey === option.key;
                        return (
                          <button
                            key={option.key}
                            type="button"
                            onClick={() => {
                              setCompareWithDraftKey(option.key);
                              if (option.key === "none") {
                                setCompareWithDraftCount(1);
                                setCompareWithDraftArrangeLatest(false);
                                setCompareWithCountOpen(false);
                              } else {
                                setCompareWithDraftCount((current) =>
                                  current < 1 ? 1 : current,
                                );
                                setCompareWithCountOpen(true);
                              }
                            }}
                            className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm ${
                              isSelected
                                ? "font-medium text-[#0f172a]"
                                : "text-[#334155] hover:bg-[#f8fafc]"
                            }`}
                          >
                            <span>{option.label}</span>
                            {isSelected ? (
                              <Check size={14} className="text-[#64748b]" />
                            ) : null}
                          </button>
                        );
                      })}
                    </div>

                    {compareWithDraftKey !== "none" ? (
                      <div className="mt-3">
                        <div className="mb-2 text-sm text-[#334155]">
                          {compareWithDraftKey === "previous-years"
                            ? "Number of Year(s)"
                            : "Number of Period(s)"}
                        </div>
                        <div ref={compareWithCountRef} className="relative">
                          <button
                            type="button"
                            onClick={() =>
                              setCompareWithCountOpen((prev) => !prev)
                            }
                            className="relative flex h-10 w-full items-center justify-between rounded border border-[#1f6f7a] bg-white px-3 pr-9 text-sm text-[#334155] outline-none hover:bg-[#f8fafc]"
                            aria-haspopup="menu"
                            aria-expanded={compareWithCountOpen}
                          >
                            <span className="min-w-0 truncate">
                              {compareWithDraftCount}
                            </span>
                            <ChevronDown
                              size={14}
                              className={`pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 transition-transform duration-150 ${
                                compareWithCountOpen
                                  ? "rotate-180 text-[#1f6f7a]"
                                  : "text-[#64748b]"
                              }`}
                            />
                          </button>

                          {compareWithCountOpen ? (
                            <div className="absolute left-0 top-[calc(100%+6px)] z-50 w-[168px] overflow-hidden rounded-lg border border-[#d7dce7] bg-white shadow-[0_10px_24px_rgba(15,23,42,0.12)]">
                              <div className="max-h-[220px] overflow-y-auto py-1">
                                {COMPARE_WITH_NUMBER_OPTIONS.map((option) => {
                                  const isSelected =
                                    String(compareWithDraftCount) === option;
                                  return (
                                    <button
                                      key={option}
                                      type="button"
                                      onClick={() => {
                                        setCompareWithDraftCount(
                                          Number(option),
                                        );
                                        setCompareWithCountOpen(false);
                                      }}
                                      className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm ${
                                        isSelected
                                          ? "font-medium text-[#0f172a]"
                                          : "text-[#334155] hover:bg-[#f8fafc]"
                                      }`}
                                    >
                                      <span>{option}</span>
                                      {isSelected ? (
                                        <Check
                                          size={14}
                                          className="text-[#64748b]"
                                        />
                                      ) : null}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          ) : null}
                        </div>

                        <label className="mt-3 flex items-start gap-2 text-sm text-[#334155]">
                          <input
                            type="checkbox"
                            checked={compareWithDraftArrangeLatest}
                            onChange={(event) =>
                              setCompareWithDraftArrangeLatest(
                                event.target.checked,
                              )
                            }
                            className="mt-1 h-4 w-4 rounded border-[#cfd6e4] text-[#1f6f7a] focus:ring-[#1f6f7a]"
                          />
                          <span>Arrange period/year from latest to oldest</span>
                        </label>
                      </div>
                    ) : null}
                  </div>

                  <div className="flex items-center gap-2 border-t border-[#eef2f7] px-4 py-3">
                    <button
                      type="button"
                      onClick={applyCompareWith}
                      className="inline-flex h-8 items-center rounded bg-[#1f6f7a] px-3 text-sm font-semibold text-white hover:bg-[#185a63]"
                    >
                      Apply
                    </button>
                    <button
                      type="button"
                      onClick={cancelCompareWith}
                      className="inline-flex h-8 items-center rounded border border-[#d4d9e4] bg-white px-3 text-sm text-[#334155] hover:bg-[#f8fafc]"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : null}
            </div>

            <button
              type="button"
              onClick={openColumns}
              className="inline-flex h-8 items-center gap-1 rounded border border-[#cfd6e4] bg-white px-3 text-sm text-[#334155] hover:bg-[#f8fafc]"
            >
              <Columns3 size={14} />
              Customize Report Columns
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#e6f3fb] px-1 text-[11px] font-semibold text-[#5b8def]">
                {selectedColumns.length}
              </span>
            </button>
          </div>

          <div className="mt-3 rounded-xl border border-[#d7dce7] bg-white">
            <div className="border-b border-[#e6e9f0] px-4 py-10 text-center">
              {organizationName ? (
                <div className="mb-1 text-sm text-[#64748b]">
                  {organizationName}
                </div>
              ) : null}
              <div className="text-[20px] font-semibold text-[#0f172a]">
                {config.title}
              </div>
              <div className="mt-1 text-sm text-[#2563eb]">{dateLabel}</div>
            </div>

            {loading ? (
              <div className="px-4 py-10 text-center text-sm text-[#64748b]">
                Loading report...
              </div>
            ) : null}
            {error ? (
              <div className="px-4 py-10 text-center text-sm text-[#ef4444]">
                {error}
              </div>
            ) : null}

            {!loading && !error ? (
              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-[#e6e9f0]">
                      {visibleColumns.map((column) => (
                        <th
                          key={column.key}
                          className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#475569]"
                        >
                          {column.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.length > 0 ? (
                      rows.map((row, index) => (
                        <tr
                          key={`${index}-${String(row.values.name || row.values.transaction || row.values["invoice-number"] || index)}`}
                          className="border-b border-[#edf1f6]"
                        >
                          {visibleColumns.map((column, columnIndex) => (
                            <td
                              key={column.key}
                              className={`px-4 py-3 text-sm ${columnIndex === 0 ? "font-medium text-[#0f172a]" : "text-[#2563eb]"}`}
                            >
                              {formatCell(column, row.values[column.key])}
                            </td>
                          ))}
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={visibleColumns.length}
                          className="px-4 py-10 text-center text-sm text-[#64748b]"
                        >
                          No records found.
                        </td>
                      </tr>
                    )}

                    {totals && Object.keys(totals).length > 0 ? (
                      <tr className="border-t border-[#dbe2ee]">
                        {visibleColumns.map((column, index) => (
                          <td
                            key={column.key}
                            className={`px-4 py-3 text-sm ${index === 0 ? "font-semibold text-[#0f172a]" : "text-[#0f172a]"}`}
                          >
                            {index === 0
                              ? "Total"
                              : formatCell(column, totals[column.key])}
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
                <div className="text-[16px] font-medium text-[#0f172a]">
                  Customize Report Columns
                </div>
                <button
                  type="button"
                  className="text-[#ef4444]"
                  onClick={() => setColumnsOpen(false)}
                >
                  <X size={18} />
                </button>
              </div>

              <div className="grid grid-cols-1 gap-6 px-5 py-5 md:grid-cols-[1fr_56px_1fr]">
                <div>
                  <div className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-[#64748b]">
                    Available Columns
                  </div>
                  <div className="flex items-center gap-2 rounded-t border border-[#cfd6e4] bg-white px-2 py-1">
                    <Search size={14} className="text-[#94a3b8]" />
                    <input
                      value={columnSearch}
                      onChange={(event) => setColumnSearch(event.target.value)}
                      placeholder="Search"
                      className="w-full bg-transparent text-sm outline-none"
                    />
                  </div>
                  <div className="max-h-[420px] overflow-y-auto rounded-b border border-t-0 border-[#cfd6e4] bg-white">
                    {config.columns.map((group) => (
                      <div key={group.label} className="py-1">
                        <div className="px-3 py-2 text-xs font-semibold uppercase tracking-[0.06em] text-[#94a3b8]">
                          {group.label}
                        </div>
                        {group.options
                          .filter((option) => !columnDraft.includes(option.key))
                          .filter(
                            (option) =>
                              !columnSearch.trim() ||
                              option.label
                                .toLowerCase()
                                .includes(columnSearch.trim().toLowerCase()),
                          )
                          .map((option) => {
                            const active = activeAvailableColumn === option.key;
                            return (
                              <button
                                key={option.key}
                                type="button"
                                onClick={() =>
                                  setActiveAvailableColumn(option.key)
                                }
                                className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm ${active ? "bg-[#f8fafc] text-[#0f172a]" : "text-[#334155] hover:bg-[#f8fafc]"}`}
                              >
                                <span>{option.label}</span>
                                {active ? (
                                  <Check size={14} className="text-[#64748b]" />
                                ) : null}
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
                      setColumnDraft((prev) =>
                        prev.includes(activeAvailableColumn)
                          ? prev
                          : [...prev, activeAvailableColumn],
                      );
                    }}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#9ca3af] text-[#4b5563]"
                  >
                    <ChevronDown size={18} className="rotate-[-90deg]" />
                  </button>
                </div>

                <div>
                  <div className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-[#64748b]">
                    Selected Columns
                  </div>
                  <div className="min-h-[420px] rounded border border-[#cfd6e4] bg-white p-2">
                    {columnDraft.map((key) => {
                      const option = columnLookup(reportId, key);
                      if (!option) return null;
                      return (
                        <div
                          key={key}
                          className="flex items-center justify-between rounded px-3 py-2 text-sm hover:bg-[#f8fafc]"
                        >
                          <div>
                            <span className="text-[#0f172a]">
                              {option.label}
                            </span>
                            <span className="ml-1 text-xs text-[#94a3b8]">
                              (
                              {RECEIVABLES_CONFIG[reportId].columns.find(
                                (group) =>
                                  group.options.some(
                                    (item) => item.key === key,
                                  ),
                              )?.label || "Reports"}
                              )
                            </span>
                          </div>
                          {option.locked ? null : (
                            <button
                              type="button"
                              className="text-[#ef4444]"
                              onClick={() =>
                                setColumnDraft((prev) =>
                                  prev.filter((item) => item !== key),
                                )
                              }
                            >
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
                <button
                  type="button"
                  onClick={() => setSelectedColumns(columnDraft)}
                  className="inline-flex h-9 items-center rounded bg-[#4f8cff] px-4 text-sm font-semibold text-white"
                >
                  Apply
                </button>
                <button
                  type="button"
                  onClick={() => setColumnsOpen(false)}
                  className="inline-flex h-9 items-center rounded border border-[#d4d9e4] bg-white px-4 text-sm text-[#334155]"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
