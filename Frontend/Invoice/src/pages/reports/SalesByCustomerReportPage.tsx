import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
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
import ReportDetailHeader from "./ReportDetailHeader";
import ARAgingSummaryReportPage from "./ARAgingSummaryReportPage";
import ARAgingDetailsReportPage from "./ARAgingDetailsReportPage";
import InvoiceDetailsReportPage from "./InvoiceDetailsReportPage";
import QuoteDetailsReportPage from "./QuoteDetailsReportPage";
import PaymentsReceivedReportView from "./PaymentsReceivedReportPage";
import SalesByItemReportView from "./SalesByItemReportPage";
import { SalesBySalesPersonReportView } from "./SalesBySalesPersonReportPage";
import {
  getCategoryById,
  getReportById,
  REPORT_FUNCTION_LABELS,
  REPORTS_BY_CATEGORY,
} from "./reportsCatalog";
import { useSettings } from "../../lib/settings/SettingsContext";
import { reportsAPI } from "../../services/api";

const formatDate = (value: Date) =>
  value.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

const toInputDateValue = (value: Date) => {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const fromInputDateValue = (value: string) => {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
};

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

type DateRangeOption = {
  key: DateRangeKey;
  label: string;
};

type DateRangeValue = {
  start: Date;
  end: Date;
};

type EntityKey = "invoice" | "credit-note" | "sales-receipt";

type EntityOption = {
  key: EntityKey;
  label: string;
};

type CompareWithKey = "none" | "previous-years" | "previous-periods";

type MoreFilterFieldKey = "customer-name" | "currency" | "location";

type MoreFilterComparatorKey =
  | "is-empty"
  | "is-not-empty"
  | "is-in"
  | "is-not-in"
  | "starts-with"
  | "ends-with"
  | "contains"
  | "does-not-contain";

const MORE_FILTER_TEXT_COMPARATORS: MoreFilterComparatorKey[] = [
  "starts-with",
  "ends-with",
  "contains",
  "does-not-contain",
];
const MORE_FILTER_NO_VALUE_COMPARATORS: MoreFilterComparatorKey[] = [
  "is-empty",
  "is-not-empty",
];

type MoreFilterRow = {
  id: string;
  field: MoreFilterFieldKey | "";
  comparator: MoreFilterComparatorKey | "";
  value: string;
};

type MoreFilterDropdownState = {
  rowId: string;
  kind: "field" | "comparator" | "value";
  search: string;
} | null;

type MoreFilterValueMode = "dropdown" | "text" | "none";

const MORE_FILTER_FIELD_OPTIONS: Array<{
  key: MoreFilterFieldKey;
  label: string;
}> = [
  { key: "customer-name", label: "Customer Name" },
  { key: "currency", label: "Currency" },
  { key: "location", label: "Location" },
];

const MORE_FILTER_FIELD_GROUPS: Array<{
  label: string;
  options: Array<{ key: MoreFilterFieldKey; label: string }>;
}> = [
  {
    label: "Reports",
    options: [
      { key: "customer-name", label: "Customer Name" },
      { key: "currency", label: "Currency" },
    ],
  },
  {
    label: "Locations",
    options: [{ key: "location", label: "Location" }],
  },
];

const MORE_FILTER_COMPARATOR_OPTIONS: Array<{
  key: MoreFilterComparatorKey;
  label: string;
}> = [
  { key: "is-empty", label: "is empty" },
  { key: "is-not-empty", label: "is not empty" },
  { key: "is-in", label: "is in" },
  { key: "is-not-in", label: "is not in" },
  { key: "starts-with", label: "starts with" },
  { key: "ends-with", label: "ends with" },
  { key: "contains", label: "contains" },
  { key: "does-not-contain", label: "doesn't contain" },
];

const MORE_FILTER_VALUE_OPTIONS: Record<
  MoreFilterFieldKey,
  Array<{ key: string; label: string }>
> = {
  "customer-name": [
    { key: "select-customer", label: "Select Customer" },
    { key: "ss", label: "ss" },
  ],
  currency: [
    { key: "select-currency", label: "Select Currency" },
    { key: "SOS", label: "SOS" },
    { key: "USD", label: "USD" },
  ],
  location: [
    { key: "select-location", label: "Select Location" },
    { key: "mogadishu", label: "Mogadishu" },
    { key: "hargeisa", label: "Hargeisa" },
  ],
};

const getMoreFilterFieldLabel = (field: MoreFilterFieldKey | "") =>
  MORE_FILTER_FIELD_OPTIONS.find((option) => option.key === field)?.label ??
  "Select a field";

const getMoreFilterComparatorLabel = (
  comparator: MoreFilterComparatorKey | "",
) =>
  MORE_FILTER_COMPARATOR_OPTIONS.find((option) => option.key === comparator)
    ?.label ?? "Select a comparator";

const getMoreFilterValuePlaceholder = (field: MoreFilterFieldKey | "") => {
  if (!field) return "Select a value";
  return MORE_FILTER_VALUE_OPTIONS[field]?.[0]?.label ?? "Select a value";
};

const getMoreFilterValueLabel = (
  field: MoreFilterFieldKey | "",
  value: string,
) => {
  if (!field) return "Select a value";
  return (
    MORE_FILTER_VALUE_OPTIONS[field].find((option) => option.key === value)
      ?.label ?? getMoreFilterValuePlaceholder(field)
  );
};

const getCompareWithLabel = (key: CompareWithKey) =>
  COMPARE_WITH_OPTIONS.find((option) => option.key === key)?.label ?? "None";

const getReportColumnOption = (key: ReportColumnKey) =>
  REPORT_COLUMN_GROUPS.flatMap((group) => group.options).find(
    (option) => option.key === key,
  )!;

const getReportColumnLabel = (key: ReportColumnKey) =>
  getReportColumnOption(key).label;

const getReportColumnGroupLabel = (key: ReportColumnKey) => {
  const group = REPORT_COLUMN_GROUPS.find((section) =>
    section.options.some((option) => option.key === key),
  );
  return group?.label ?? "Reports";
};

const getReportColumnOptionForReport = (
  key: ReportColumnKey,
  reportId: SalesReportId,
) => {
  const option = getReportColumnOption(key);
  const labelOverride =
    REPORT_MODE_COLUMN_LABEL_OVERRIDES[reportId]?.[key] ?? option.label;
  return {
    ...option,
    label: labelOverride,
  };
};

const DATE_RANGE_OPTIONS: DateRangeOption[] = [
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

const ENTITY_OPTIONS: EntityOption[] = [
  { key: "invoice", label: "Invoice" },
  { key: "credit-note", label: "Credit Note" },
  { key: "sales-receipt", label: "Sales Receipt" },
];

const COMPARE_WITH_OPTIONS: Array<{ key: CompareWithKey; label: string }> = [
  { key: "none", label: "None" },
  { key: "previous-years", label: "Previous Year(s)" },
  { key: "previous-periods", label: "Previous Period(s)" },
];

const COMPARE_WITH_NUMBER_OPTIONS = Array.from({ length: 35 }, (_, index) =>
  String(index + 1),
);

type ReportColumnKey = string;
type SalesReportId =
  | "sales-by-customer"
  | "customer-balance-summary"
  | "bad-debts"
  | "bank-charges";
type ReportColumnKind = "text" | "number" | "currency";

type ReportColumnOption = {
  key: ReportColumnKey;
  label: string;
  kind: ReportColumnKind;
  locked?: boolean;
};

type ReportColumnGroup = {
  label: string;
  options: ReportColumnOption[];
};

const REPORT_MODE_COLUMN_LABEL_OVERRIDES: Record<
  SalesReportId,
  Partial<Record<ReportColumnKey, string>>
> = {
  "sales-by-customer": {},
  "customer-balance-summary": {
    "invoice-amount": "Invoiced Amount",
    "invoice-amount-fcy": "Invoiced Amount (FCY)",
    "amount-received": "Amount Received",
    "amount-received-fcy": "Amount Received (FCY)",
    "closing-balance": "Closing Balance",
    "closing-balance-fcy": "Closing Balance (FCY)",
  },
  "bad-debts": {
    sales: "Write Off Amount (FCY)",
    "sales-with-tax": "Write Off Amount (BCY)",
  },
  "bank-charges": {
    sales: "Bank Charges (FCY)",
    "sales-with-tax": "Bank Charges (BCY)",
    "invoice-count": "Payment Count",
  },
};

const REPORT_COLUMN_GROUPS: ReportColumnGroup[] = [
  {
    label: "Reports",
    options: [
      { key: "name", label: "Name", kind: "text", locked: true },
      { key: "invoice-count", label: "Invoice Count", kind: "number" },
      { key: "sales", label: "Sales", kind: "currency" },
      { key: "sales-with-tax", label: "Sales With Tax", kind: "currency" },
      {
        key: "sales-without-discount",
        label: "Sales Without Discount",
        kind: "currency",
      },
      { key: "sales-fcy", label: "Sales(FCY)", kind: "currency" },
      {
        key: "sales-with-tax-fcy",
        label: "Sales With Tax(FCY)",
        kind: "currency",
      },
      {
        key: "sales-without-discount-fcy",
        label: "Sales Without Discount (FCY)",
        kind: "currency",
      },
      { key: "invoice-amount", label: "Invoice Amount", kind: "currency" },
      {
        key: "invoice-amount-fcy",
        label: "Invoice Amount (FCY)",
        kind: "currency",
      },
      {
        key: "amount-received",
        label: "Amount Received",
        kind: "currency",
      },
      {
        key: "amount-received-fcy",
        label: "Amount Received (FCY)",
        kind: "currency",
      },
      {
        key: "closing-balance",
        label: "Closing Balance",
        kind: "currency",
      },
      {
        key: "closing-balance-fcy",
        label: "Closing Balance (FCY)",
        kind: "currency",
      },
      {
        key: "credit-note-amount",
        label: "Credit Note Amount",
        kind: "currency",
      },
      {
        key: "credit-note-amount-fcy",
        label: "Credit Note Amount (FCY)",
        kind: "currency",
      },
      { key: "currency", label: "Currency", kind: "text" },
    ],
  },
  {
    label: "Locations",
    options: [{ key: "location", label: "Location", kind: "text" }],
  },
  {
    label: "Contacts",
    options: [
      { key: "customer-id", label: "Customer ID", kind: "text" },
      { key: "company-name", label: "Company Name", kind: "text" },
      { key: "customer-number", label: "Customer Number", kind: "text" },
      { key: "first-name", label: "First Name", kind: "text" },
      { key: "last-name", label: "Last Name", kind: "text" },
      { key: "website", label: "Website", kind: "text" },
      { key: "customer-email", label: "Customer Email", kind: "text" },
      { key: "customer-type", label: "Customer Type", kind: "text" },
      { key: "mobile-phone", label: "Mobile Phone", kind: "text" },
      { key: "work-phone", label: "Work Phone", kind: "text" },
      { key: "department", label: "Department", kind: "text" },
      { key: "designation", label: "Designation", kind: "text" },
      { key: "facebook", label: "Facebook", kind: "text" },
      { key: "twitter", label: "Twitter", kind: "text" },
      { key: "skype", label: "Skype", kind: "text" },
      { key: "status", label: "Status", kind: "text" },
      { key: "created-by", label: "Created By", kind: "text" },
      { key: "created-time", label: "Created Time", kind: "text" },
      { key: "last-modified-time", label: "Last Modified Time", kind: "text" },
      { key: "credit-limit", label: "Credit Limit", kind: "currency" },
      { key: "payment-terms", label: "Payment Terms", kind: "text" },
      { key: "remarks", label: "Remarks", kind: "text" },
      { key: "receivables", label: "Receivables", kind: "currency" },
      { key: "receivables-fcy", label: "Receivables (FCY)", kind: "currency" },
      { key: "unused-credits", label: "Unused Credits", kind: "currency" },
      {
        key: "unused-credits-fcy",
        label: "Unused Credits (FCY)",
        kind: "currency",
      },
      { key: "billing-name", label: "Billing Name", kind: "text" },
      { key: "billing-street-1", label: "Billing Street 1", kind: "text" },
      { key: "billing-street-2", label: "Billing Street 2", kind: "text" },
      { key: "billing-city", label: "Billing City", kind: "text" },
      { key: "billing-state", label: "Billing State", kind: "text" },
      { key: "billing-code", label: "Billing Code", kind: "text" },
      { key: "billing-country", label: "Billing Country", kind: "text" },
      { key: "billing-phone", label: "Billing Phone", kind: "text" },
      { key: "billing-fax", label: "Billing Fax", kind: "text" },
      { key: "shipping-name", label: "Shipping Name", kind: "text" },
      { key: "shipping-street-1", label: "Shipping Street 1", kind: "text" },
      { key: "shipping-street-2", label: "Shipping Street 2", kind: "text" },
      { key: "shipping-city", label: "Shipping City", kind: "text" },
      { key: "shipping-state", label: "Shipping State", kind: "text" },
      { key: "shipping-code", label: "Shipping Code", kind: "text" },
      { key: "shipping-country", label: "Shipping Country", kind: "text" },
      { key: "shipping-phone", label: "Shipping Phone", kind: "text" },
      { key: "shipping-fax", label: "Shipping Fax", kind: "text" },
    ],
  },
];

const getStartOfDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

const getEndOfDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

const getStartOfWeek = (date: Date) => {
  const start = getStartOfDay(date);
  const day = start.getDay();
  start.setDate(start.getDate() - day);
  return start;
};

const getEndOfWeek = (date: Date) => {
  const end = getStartOfWeek(date);
  end.setDate(end.getDate() + 6);
  return end;
};

const getQuarterBounds = (year: number, quarterIndex: number) => {
  const startMonth = quarterIndex * 3;
  return {
    start: new Date(year, startMonth, 1),
    end: new Date(year, startMonth + 3, 0),
  };
};

const getDateRangeValue = (
  key: DateRangeKey,
  referenceDate = new Date(),
): DateRangeValue => {
  const today = getStartOfDay(referenceDate);

  switch (key) {
    case "today":
      return { start: today, end: getEndOfDay(referenceDate) };
    case "this-week":
      return {
        start: getStartOfWeek(referenceDate),
        end: getEndOfWeek(referenceDate),
      };
    case "this-month":
      return {
        start: new Date(
          referenceDate.getFullYear(),
          referenceDate.getMonth(),
          1,
        ),
        end: new Date(
          referenceDate.getFullYear(),
          referenceDate.getMonth() + 1,
          0,
        ),
      };
    case "this-quarter": {
      const quarterIndex = Math.floor(referenceDate.getMonth() / 3);
      return getQuarterBounds(referenceDate.getFullYear(), quarterIndex);
    }
    case "this-year":
      return {
        start: new Date(referenceDate.getFullYear(), 0, 1),
        end: new Date(referenceDate.getFullYear(), 11, 31),
      };
    case "yesterday": {
      const yesterday = getStartOfDay(referenceDate);
      yesterday.setDate(yesterday.getDate() - 1);
      return { start: yesterday, end: yesterday };
    }
    case "previous-week": {
      const currentWeekStart = getStartOfWeek(referenceDate);
      const previousWeekStart = new Date(currentWeekStart);
      previousWeekStart.setDate(previousWeekStart.getDate() - 7);
      const previousWeekEnd = new Date(previousWeekStart);
      previousWeekEnd.setDate(previousWeekEnd.getDate() + 6);
      return { start: previousWeekStart, end: previousWeekEnd };
    }
    case "previous-month": {
      const previousMonthEnd = new Date(
        referenceDate.getFullYear(),
        referenceDate.getMonth(),
        0,
      );
      const previousMonthStart = new Date(
        previousMonthEnd.getFullYear(),
        previousMonthEnd.getMonth(),
        1,
      );
      return { start: previousMonthStart, end: previousMonthEnd };
    }
    case "previous-quarter": {
      const currentQuarterIndex = Math.floor(referenceDate.getMonth() / 3);
      const previousQuarterIndex = (currentQuarterIndex + 3) % 4;
      const previousQuarterYear =
        currentQuarterIndex === 0
          ? referenceDate.getFullYear() - 1
          : referenceDate.getFullYear();
      return getQuarterBounds(previousQuarterYear, previousQuarterIndex);
    }
    case "previous-year":
      return {
        start: new Date(referenceDate.getFullYear() - 1, 0, 1),
        end: new Date(referenceDate.getFullYear() - 1, 11, 31),
      };
    case "custom":
      return { start: today, end: today };
    default:
      return { start: today, end: today };
  }
};

type SalesByCustomerRow = {
  values: Partial<Record<ReportColumnKey, string | number>>;
};

const formatCurrency = (value: number, currency = "SOS") =>
  `${currency}${value.toFixed(2)}`;

const formatBalanceCurrency = (value: number, currency = "SOS") => {
  const absolute = Math.abs(value).toFixed(2);
  if (value === 0) return `${currency}${absolute}`;
  return `${currency}${absolute} ${value < 0 ? "Cr" : "Dr"}`;
};

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
  const drawerRef = useRef<HTMLDivElement | null>(null);
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
  }, [onClose, open, triggerRef]);

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
          <div className="relative">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search reports"
              className="h-9 w-full rounded-lg border border-[#d8dfea] bg-white pl-3 pr-3 text-sm text-[#334155] outline-none placeholder:text-[#94a3b8] focus:border-[#7da0ff]"
            />
          </div>
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

function ReportActivityDrawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const drawerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!drawerRef.current?.contains(target)) {
        onClose();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={drawerRef}
      className="absolute right-0 top-0 z-30 h-full w-[300px] overflow-hidden border-l border-[#e5e7eb] bg-white shadow-[-8px_0_20px_rgba(15,23,42,0.08)]"
    >
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b border-[#eef2f7] px-4 py-3">
          <div className="text-[18px] font-semibold text-[#0f172a]">
            Report Activity
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-7 w-7 items-center justify-center text-[#ef4444] hover:bg-[#fef2f2]"
            aria-label="Close report activity"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex flex-1 items-start justify-center px-6 pt-8">
          <p className="text-sm text-[#64748b]">No comments yet.</p>
        </div>
      </div>
    </div>
  );
}

function SalesByCustomerReportView({
  categoryName,
  reportName,
  reportId,
  menuButtonRef,
  onMenuClick,
  onRunReport,
  onActivityClick,
  onClosePage,
}: {
  categoryName: string;
  reportName: string;
  reportId: SalesReportId;
  menuButtonRef: React.RefObject<HTMLButtonElement | null>;
  onMenuClick: () => void;
  onRunReport: () => void;
  onActivityClick: () => void;
  onClosePage: () => void;
}) {
  const dateRangeRef = useRef<HTMLDivElement | null>(null);
  const entityRef = useRef<HTMLDivElement | null>(null);
  const compareWithRef = useRef<HTMLDivElement | null>(null);
  const compareWithCountRef = useRef<HTMLDivElement | null>(null);
  const moreFiltersRef = useRef<HTMLDivElement | null>(null);
  const exportRef = useRef<HTMLDivElement | null>(null);
  const isSalesByCustomerReport = reportId === "sales-by-customer";
  const isCustomerBalanceSummaryReport =
    reportId === "customer-balance-summary";
  const isBadDebtsReport = reportId === "bad-debts";
  const isBankChargesReport = reportId === "bank-charges";
  const defaultDateRangeKey: DateRangeKey = isSalesByCustomerReport
    ? "this-week"
    : "this-month";
  const [dateRangeKey, setDateRangeKey] =
    useState<DateRangeKey>(defaultDateRangeKey);
  const [dateRangeDraftKey, setDateRangeDraftKey] =
    useState<DateRangeKey>(defaultDateRangeKey);
  const [isDateRangeOpen, setIsDateRangeOpen] = useState(false);
  const [isCustomDateRangeOpen, setIsCustomDateRangeOpen] = useState(false);
  const [customDateRange, setCustomDateRange] = useState<DateRangeValue>(() =>
    getDateRangeValue(defaultDateRangeKey),
  );
  const [customDateRangeDraft, setCustomDateRangeDraft] =
    useState<DateRangeValue>(() => getDateRangeValue(defaultDateRangeKey));
  const [customDateRangeMonth, setCustomDateRangeMonth] = useState<Date>(() =>
    getStartOfMonth(getDateRangeValue(defaultDateRangeKey).start),
  );
  const [entityKeys, setEntityKeys] = useState<EntityKey[]>(
    isCustomerBalanceSummaryReport
      ? ENTITY_OPTIONS.map((option) => option.key)
      : [],
  );
  const [isEntityOpen, setIsEntityOpen] = useState(false);
  const [entitySearch, setEntitySearch] = useState("");
  const [compareWithKey, setCompareWithKey] = useState<CompareWithKey>("none");
  const [compareWithDraftKey, setCompareWithDraftKey] =
    useState<CompareWithKey>("none");
  const [isCompareWithOpen, setIsCompareWithOpen] = useState(false);
  const [isCompareWithSelectOpen, setIsCompareWithSelectOpen] = useState(false);
  const [compareWithSearch, setCompareWithSearch] = useState("");
  const [compareWithCount, setCompareWithCount] = useState(1);
  const [compareWithDraftCount, setCompareWithDraftCount] = useState(1);
  const [compareWithArrangeLatest, setCompareWithArrangeLatest] =
    useState(false);
  const [compareWithDraftArrangeLatest, setCompareWithDraftArrangeLatest] =
    useState(false);
  const [isCompareWithCountOpen, setIsCompareWithCountOpen] = useState(false);
  const [compareWithCountSearch, setCompareWithCountSearch] = useState("");
  const [isCustomizeColumnsOpen, setIsCustomizeColumnsOpen] = useState(false);
  const [customizeReportTab, setCustomizeReportTab] = useState<
    "general" | "columns"
  >("general");
  const customizeDateRangeRef = useRef<HTMLDivElement | null>(null);
  const [customizeDateRangeDraftKey, setCustomizeDateRangeDraftKey] =
    useState<DateRangeKey>(defaultDateRangeKey);
  const [isCustomizeDateRangeOpen, setIsCustomizeDateRangeOpen] =
    useState(false);
  const [isCustomizeCustomDateRangeOpen, setIsCustomizeCustomDateRangeOpen] =
    useState(false);
  const [customizeCustomDateRangeDraft, setCustomizeCustomDateRangeDraft] =
    useState<DateRangeValue>(() => getDateRangeValue(defaultDateRangeKey));
  const [customizeCustomDateRangeMonth, setCustomizeCustomDateRangeMonth] =
    useState<Date>(() =>
      getStartOfMonth(getDateRangeValue(defaultDateRangeKey).start),
    );
  const [customizeColumnsSearch, setCustomizeColumnsSearch] = useState("");
  const customizeCompareRef = useRef<HTMLDivElement | null>(null);
  const customizeCompareCountRef = useRef<HTMLDivElement | null>(null);
  const customizeEntityRef = useRef<HTMLDivElement | null>(null);
  const customizeMoreFiltersRef = useRef<HTMLDivElement | null>(null);
  const [isCustomizeCompareOpen, setIsCustomizeCompareOpen] = useState(false);
  const [isCustomizeCompareCountOpen, setIsCustomizeCompareCountOpen] =
    useState(false);
  const [isCustomizeEntityOpen, setIsCustomizeEntityOpen] = useState(false);
  const [customizeMoreFilterDropdown, setCustomizeMoreFilterDropdown] =
    useState<MoreFilterDropdownState>(null);
  const [customizeCompareSearch, setCustomizeCompareSearch] = useState("");
  const [customizeCompareCountSearch, setCustomizeCompareCountSearch] =
    useState("");
  const [customizeEntitySearch, setCustomizeEntitySearch] = useState("");
  const [customizeEntityDraftKeys, setCustomizeEntityDraftKeys] = useState<
    EntityKey[]
  >(ENTITY_OPTIONS.map((option) => option.key));
  const [customizeMoreFilterRows, setCustomizeMoreFilterRows] = useState<
    MoreFilterRow[]
  >([]);
  const [selectedReportColumns, setSelectedReportColumns] = useState<
    ReportColumnKey[]
  >(isSalesByCustomerReport
    ? ["name", "invoice-count", "sales", "sales-with-tax"]
    : isCustomerBalanceSummaryReport
      ? ["name", "invoice-amount", "amount-received", "closing-balance"]
      : ["name", "sales", "sales-with-tax"]);
  const [customizeDraftSelectedColumns, setCustomizeDraftSelectedColumns] =
    useState<ReportColumnKey[]>(
      isSalesByCustomerReport
        ? ["name", "invoice-count", "sales", "sales-with-tax"]
        : isCustomerBalanceSummaryReport
          ? ["name", "invoice-amount", "amount-received", "closing-balance"]
          : ["name", "sales", "sales-with-tax"],
    );
  const { settings } = useSettings();
  const organizationName = String(
    settings?.general?.companyDisplayName ||
      settings?.general?.schoolDisplayName ||
      "",
  ).trim();
  const [customizeActiveAvailableColumn, setCustomizeActiveAvailableColumn] =
    useState<ReportColumnKey | "">("");
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isMoreFiltersOpen, setIsMoreFiltersOpen] = useState(false);
  const [moreFilterDropdown, setMoreFilterDropdown] =
    useState<MoreFilterDropdownState>(null);
  const [moreFilterRows, setMoreFilterRows] = useState<MoreFilterRow[]>([
    { id: "more-filter-1", field: "", comparator: "", value: "" },
  ]);
  const [reportRows, setReportRows] = useState<SalesByCustomerRow[]>([]);
  const [reportCurrency, setReportCurrency] = useState("SOS");
  const [isReportLoading, setIsReportLoading] = useState(true);
  const [reportError, setReportError] = useState("");
  const [reportRefreshTick, setReportRefreshTick] = useState(0);
  const shouldToastRunRef = useRef(false);
  const selectedDateRange =
    dateRangeKey === "custom"
      ? customDateRange
      : getDateRangeValue(dateRangeKey);
  const dateRangeLabel =
    DATE_RANGE_OPTIONS.find((option) => option.key === dateRangeKey)?.label ??
    "Today";
  const customizeDateRangeLabel =
    DATE_RANGE_OPTIONS.find(
      (option) => option.key === customizeDateRangeDraftKey,
    )?.label ?? "Today";
  const customizeSelectedDateRange =
    customizeDateRangeDraftKey === "custom"
      ? customizeCustomDateRangeDraft
      : getDateRangeValue(customizeDateRangeDraftKey);
  const getEntitySelectionLabel = (keys: EntityKey[]) => {
    if (keys.length === 0) return "None";
    if (keys.length === ENTITY_OPTIONS.length) return "All";
    return ENTITY_OPTIONS.filter((option) => keys.includes(option.key))
      .map((option) => option.label)
      .join(", ");
  };
  const entityLabel = getEntitySelectionLabel(entityKeys);

  const handleCustomizeCustomStartDateClick = (date: Date) => {
    setCustomizeCustomDateRangeDraft((prev) => ({
      start: date,
      end: prev.end < date ? date : prev.end,
    }));
  };

  const handleCustomizeCustomEndDateClick = (date: Date) => {
    setCustomizeCustomDateRangeDraft((prev) => ({
      start: prev.start > date ? date : prev.start,
      end: date < prev.start ? prev.start : date,
    }));
  };

  const setCustomizeLeftCalendarMonth = (monthIndex: number, year: number) => {
    setCustomizeCustomDateRangeMonth(new Date(year, monthIndex, 1));
  };

  const setCustomizeRightCalendarMonth = (monthIndex: number, year: number) => {
    setCustomizeCustomDateRangeMonth(
      addMonths(new Date(year, monthIndex, 1), -1),
    );
  };

  const openCustomizeMoreFilterDropdown = (
    rowId: string,
    kind: "field" | "comparator" | "value",
  ) => {
    setCustomizeMoreFilterDropdown((prev) =>
      prev?.rowId === rowId && prev.kind === kind
        ? null
        : { rowId, kind, search: "" },
    );
  };

  const closeCustomizeMoreFilterDropdown = () =>
    setCustomizeMoreFilterDropdown(null);

  const addCustomizeMoreFilterRow = () => {
    const newRowId = `customize-more-filter-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    setCustomizeMoreFilterRows((prev) => [
      ...prev,
      { id: newRowId, field: "", comparator: "", value: "" },
    ]);
    openCustomizeMoreFilterDropdown(newRowId, "field");
  };
  useEffect(() => {
    if (!isDateRangeOpen) return;

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
  }, [isDateRangeOpen, cancelDateRangeSelection]);

  function openDateRangeDropdown() {
    if (isDateRangeOpen) {
      setIsDateRangeOpen(false);
      setIsCustomDateRangeOpen(false);
      return;
    }

    const currentRange =
      dateRangeKey === "custom"
        ? customDateRange
        : getDateRangeValue(dateRangeKey);
    setDateRangeDraftKey(dateRangeKey);
    setCustomDateRangeDraft(currentRange);
    setCustomDateRangeMonth(getStartOfMonth(currentRange.start));
    setIsCustomDateRangeOpen(dateRangeKey === "custom");
    setIsDateRangeOpen(true);
  }

  function cancelDateRangeSelection() {
    setDateRangeDraftKey(dateRangeKey);
    setCustomDateRangeDraft(customDateRange);
    setCustomDateRangeMonth(
      getStartOfMonth(
        dateRangeKey === "custom"
          ? customDateRange.start
          : getDateRangeValue(dateRangeKey).start,
      ),
    );
    setIsCustomDateRangeOpen(false);
    setIsDateRangeOpen(false);
  }

  function applyCustomDateRange() {
    setCustomDateRange(customDateRangeDraft);
    setDateRangeKey("custom");
    setDateRangeDraftKey("custom");
    setIsCustomDateRangeOpen(false);
    setIsDateRangeOpen(false);
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
    if (!isEntityOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!entityRef.current?.contains(target)) {
        setIsEntityOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsEntityOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isEntityOpen]);

  useEffect(() => {
    if (!isCompareWithOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!compareWithRef.current?.contains(target)) {
        setIsCompareWithOpen(false);
        setIsCompareWithSelectOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsCompareWithOpen(false);
        setIsCompareWithSelectOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isCompareWithOpen]);

  useEffect(() => {
    if (!isCompareWithCountOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!compareWithCountRef.current?.contains(target)) {
        setIsCompareWithCountOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsCompareWithCountOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isCompareWithCountOpen]);

  useEffect(() => {
    if (!isExportOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!exportRef.current?.contains(target)) {
        setIsExportOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsExportOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isExportOpen]);

  useEffect(() => {
    if (!isCustomizeColumnsOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        cancelCustomizeColumns();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isCustomizeColumnsOpen]);

  useEffect(() => {
    if (!isCustomizeDateRangeOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!customizeDateRangeRef.current?.contains(target)) {
        setIsCustomizeDateRangeOpen(false);
        setIsCustomizeCustomDateRangeOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsCustomizeDateRangeOpen(false);
        setIsCustomizeCustomDateRangeOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isCustomizeDateRangeOpen]);

  useEffect(() => {
    if (!isCustomizeCompareOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!customizeCompareRef.current?.contains(target)) {
        setIsCustomizeCompareOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsCustomizeCompareOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isCustomizeCompareOpen]);

  useEffect(() => {
    if (!isCustomizeCompareCountOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!customizeCompareCountRef.current?.contains(target)) {
        setIsCustomizeCompareCountOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsCustomizeCompareCountOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isCustomizeCompareCountOpen]);

  useEffect(() => {
    if (!isCustomizeEntityOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!customizeEntityRef.current?.contains(target)) {
        setIsCustomizeEntityOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsCustomizeEntityOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isCustomizeEntityOpen]);

  useEffect(() => {
    if (!customizeMoreFilterDropdown) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!customizeMoreFiltersRef.current?.contains(target)) {
        closeCustomizeMoreFilterDropdown();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeCustomizeMoreFilterDropdown();
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [customizeMoreFilterDropdown]);

  useEffect(() => {
    if (!isMoreFiltersOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!moreFiltersRef.current?.contains(target)) {
        closeMoreFilterDropdown();
        setIsMoreFiltersOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeMoreFilterDropdown();
        setIsMoreFiltersOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMoreFiltersOpen]);

  const filteredEntityOptions = useMemo(() => {
    const query = entitySearch.trim().toLowerCase();
    return ENTITY_OPTIONS.filter((option) =>
      option.label.toLowerCase().includes(query),
    );
  }, [entitySearch]);

  const filteredCompareWithOptions = useMemo(() => {
    const query = compareWithSearch.trim().toLowerCase();
    return COMPARE_WITH_OPTIONS.filter(
      (option) =>
        option.key !== "none" && option.label.toLowerCase().includes(query),
    );
  }, [compareWithSearch]);

  const selectedCustomizeColumns = useMemo(
    () =>
      customizeDraftSelectedColumns.map((key) =>
        getReportColumnOptionForReport(key, reportId),
      ),
    [customizeDraftSelectedColumns, reportId],
  );

  const filteredCustomizeGroups = useMemo(() => {
    const query = customizeColumnsSearch.trim().toLowerCase();
    return REPORT_COLUMN_GROUPS.map((group) => {
      const options = group.options
        .map((option) => getReportColumnOptionForReport(option.key, reportId))
        .filter((option) => {
          if (customizeDraftSelectedColumns.includes(option.key)) return false;
          if (!query) return true;
          return (
            option.label.toLowerCase().includes(query) ||
            group.label.toLowerCase().includes(query)
          );
        });
      return { label: group.label, options };
    }).filter((group) => group.options.length > 0);
  }, [customizeColumnsSearch, customizeDraftSelectedColumns, reportId]);

  const visibleReportColumns = useMemo(
    () =>
      selectedReportColumns.map((key) =>
        getReportColumnOptionForReport(key, reportId),
      ),
    [selectedReportColumns, reportId],
  );

  const formatReportColumnValue = (
    key: ReportColumnKey,
    value: string | number | undefined,
  ) => {
    if (value === undefined || value === null || value === "") return "—";
    const option = getReportColumnOption(key);
    if (
      (key === "closing-balance" || key === "closing-balance-fcy") &&
      typeof value === "number"
    )
      return formatBalanceCurrency(value, reportCurrency || "SOS");
    if (option.kind === "currency" && typeof value === "number")
      return formatCurrency(value, reportCurrency || "SOS");
    return String(value);
  };

  const reportColumnTotals = useMemo(
    () =>
      visibleReportColumns.map((option) => {
        if (option.key === "name") return "Total";
        const total = reportRows.reduce((sum, row) => {
          const value = row.values[option.key];
          return typeof value === "number" ? sum + value : sum;
        }, 0);
        if (option.kind === "number") return total;
        if (
          option.key === "closing-balance" ||
          option.key === "closing-balance-fcy"
        )
          return formatBalanceCurrency(total, reportCurrency || "SOS");
        if (option.kind === "currency")
          return formatCurrency(total, reportCurrency || "SOS");
        return "";
      }),
    [reportCurrency, reportRows, visibleReportColumns],
  );

  const buildSalesByCustomerQuery = () => {
    const query: Record<string, string> = {
      filter_by: dateRangeKey,
      compare_with: compareWithKey,
      compare_count: String(compareWithCount),
    };

    if (dateRangeKey === "custom") {
      query.from_date = selectedDateRange.start.toISOString();
      query.to_date = selectedDateRange.end.toISOString();
    }

    if (entityKeys.length > 0) {
      query.entities = entityKeys.join(",");
    }

    const activeMoreFilters = moreFilterRows
      .filter((row) => row.field || row.comparator || row.value.trim())
      .map((row) => ({
        field: row.field,
        comparator: row.comparator,
        value: row.value,
      }));

    if (activeMoreFilters.length > 0) {
      query.more_filters = JSON.stringify(activeMoreFilters);
    }

    return query;
  };

  const refreshReport = (notify = true) => {
    shouldToastRunRef.current = notify;
    setReportRefreshTick((value) => value + 1);
  };

  useEffect(() => {
    let cancelled = false;

    const loadReport = async () => {
      setIsReportLoading(true);
      setReportError("");

      try {
        const query = buildSalesByCustomerQuery();
        const response = isCustomerBalanceSummaryReport
          ? await reportsAPI.getCustomerBalanceSummary(query)
          : isBankChargesReport
            ? await reportsAPI.getBankCharges(query)
            : isBadDebtsReport
              ? await reportsAPI.getBadDebts(query)
              : await reportsAPI.getSalesByCustomer(query);
        if (cancelled) return;

        const data = response?.data || {};
        setReportRows(Array.isArray(data.rows) ? data.rows : []);
        setReportCurrency(String(data.currency || "SOS"));
        if (shouldToastRunRef.current) {
          onRunReport();
        }
      } catch (error) {
        if (!cancelled) {
          const message =
            error instanceof Error ? error.message : "Failed to load report";
          setReportError(message);
          setReportRows([]);
          setReportCurrency("SOS");
        }
      } finally {
        if (!cancelled) {
          shouldToastRunRef.current = false;
          setIsReportLoading(false);
        }
      }
    };

    void loadReport();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isBadDebtsReport,
    isBankChargesReport,
    isCustomerBalanceSummaryReport,
    reportRefreshTick,
  ]);

  const closeAllOpenPanels = () => {
    setIsCompareWithOpen(false);
    setIsCompareWithSelectOpen(false);
    setIsCompareWithCountOpen(false);
    setIsExportOpen(false);
    setIsCustomizeColumnsOpen(false);
    setIsMoreFiltersOpen(false);
    setIsEntityOpen(false);
    setIsDateRangeOpen(false);
    setIsCustomDateRangeOpen(false);
    closeMoreFilterDropdown();
  };

  const hasMoreFilters = moreFilterRows.some(
    (row) => row.field || row.comparator || row.value.trim(),
  );
  const getFilteredFieldGroups = (query: string) => {
    const normalizedQuery = query.trim().toLowerCase();
    return MORE_FILTER_FIELD_GROUPS.map((group) => {
      const options = group.options.filter((option) =>
        option.label.toLowerCase().includes(normalizedQuery),
      );
      return { ...group, options };
    }).filter((group) => group.options.length > 0);
  };

  const getFilteredComparatorOptions = (
    query: string,
    field?: MoreFilterFieldKey | "",
  ) => {
    const normalizedQuery = query.trim().toLowerCase();
    const fieldSpecificOptions =
      field === "currency"
        ? MORE_FILTER_COMPARATOR_OPTIONS.filter((option) =>
            ["is-empty", "is-not-empty", "is-in", "is-not-in"].includes(
              option.key,
            ),
          )
        : field === "location"
          ? MORE_FILTER_COMPARATOR_OPTIONS.filter((option) =>
              ["is-in", "is-not-in"].includes(option.key),
            )
          : MORE_FILTER_COMPARATOR_OPTIONS;
    return fieldSpecificOptions.filter((option) =>
      option.label.toLowerCase().includes(normalizedQuery),
    );
  };

  const filteredCompareWithNumberOptions = useMemo(() => {
    const query = compareWithCountSearch.trim().toLowerCase();
    return COMPARE_WITH_NUMBER_OPTIONS.filter((option) =>
      option.includes(query),
    );
  }, [compareWithCountSearch]);

  const filteredCustomizeCompareOptions = useMemo(() => {
    const query = customizeCompareSearch.trim().toLowerCase();
    return COMPARE_WITH_OPTIONS.filter(
      (option) =>
        option.key !== "none" && option.label.toLowerCase().includes(query),
    );
  }, [customizeCompareSearch]);

  const filteredCustomizeCompareNumberOptions = useMemo(() => {
    const query = customizeCompareCountSearch.trim().toLowerCase();
    return COMPARE_WITH_NUMBER_OPTIONS.filter((option) =>
      option.includes(query),
    );
  }, [customizeCompareCountSearch]);

  const handleExportAction = (label: string) => {
    setIsExportOpen(false);
    toast.success(`Export option selected: ${label}`);
  };

  const openCustomizeColumnsModal = () => {
    if (
      typeof window !== "undefined" &&
      /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname)
    ) {
      console.debug("[reports] openCustomizeColumnsModal");
    }
    setCustomizeReportTab("general");
    setCustomizeDraftSelectedColumns(selectedReportColumns);
    setCustomizeColumnsSearch("");
    setCustomizeActiveAvailableColumn("");
    const currentCustomizeRange =
      dateRangeKey === "custom" ? customDateRange : selectedDateRange;
    setCustomizeDateRangeDraftKey(dateRangeKey);
    setCustomizeCustomDateRangeDraft(currentCustomizeRange);
    setCustomizeCustomDateRangeMonth(
      getStartOfMonth(currentCustomizeRange.start),
    );
    setIsCustomizeDateRangeOpen(false);
    setIsCustomizeCustomDateRangeOpen(dateRangeKey === "custom");
    setCompareWithDraftKey(
      compareWithKey === "none" ? "previous-years" : compareWithKey,
    );
    setCompareWithDraftCount(compareWithKey === "none" ? 1 : compareWithCount);
    setCompareWithDraftArrangeLatest(compareWithArrangeLatest);
    setCustomizeEntityDraftKeys(
      entityKeys.length > 0
        ? entityKeys
        : ENTITY_OPTIONS.map((option) => option.key),
    );
    setCustomizeEntitySearch("");
    setCustomizeMoreFilterRows(
      moreFilterRows
        .filter((row) => row.field || row.comparator || row.value.trim())
        .map((row) => ({ ...row })),
    );
    setCustomizeMoreFilterDropdown(null);
    setCustomizeCompareSearch("");
    setCustomizeCompareCountSearch("");
    setIsCustomizeCompareOpen(false);
    setIsCustomizeCompareCountOpen(false);
    setIsCustomizeEntityOpen(false);
    setIsCompareWithOpen(false);
    setIsCompareWithSelectOpen(false);
    setIsCompareWithCountOpen(false);
    setIsExportOpen(false);
    setIsMoreFiltersOpen(false);
    setIsEntityOpen(false);
    setIsDateRangeOpen(false);
    setIsCustomDateRangeOpen(false);
    closeMoreFilterDropdown();
    setIsCustomizeColumnsOpen(true);
  };

  const openCustomizeReportColumnsModal = () => {
    if (
      typeof window !== "undefined" &&
      /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname)
    ) {
      console.debug("[reports] openCustomizeReportColumnsModal");
    }
    setCustomizeDraftSelectedColumns(selectedReportColumns);
    setCustomizeColumnsSearch("");
    setCustomizeActiveAvailableColumn("");
    const currentCustomizeRange =
      dateRangeKey === "custom" ? customDateRange : selectedDateRange;
    setCustomizeDateRangeDraftKey(dateRangeKey);
    setCustomizeCustomDateRangeDraft(currentCustomizeRange);
    setCustomizeCustomDateRangeMonth(
      getStartOfMonth(currentCustomizeRange.start),
    );
    setIsCustomizeDateRangeOpen(false);
    setIsCustomizeCustomDateRangeOpen(dateRangeKey === "custom");
    setCompareWithDraftKey(
      compareWithKey === "none" ? "previous-years" : compareWithKey,
    );
    setCompareWithDraftCount(compareWithKey === "none" ? 1 : compareWithCount);
    setCompareWithDraftArrangeLatest(compareWithArrangeLatest);
    setCustomizeEntityDraftKeys(
      entityKeys.length > 0
        ? entityKeys
        : ENTITY_OPTIONS.map((option) => option.key),
    );
    setCustomizeEntitySearch("");
    setCustomizeMoreFilterRows(
      moreFilterRows
        .filter((row) => row.field || row.comparator || row.value.trim())
        .map((row) => ({ ...row })),
    );
    setCustomizeMoreFilterDropdown(null);
    setCustomizeCompareSearch("");
    setCustomizeCompareCountSearch("");
    setIsCustomizeCompareOpen(false);
    setIsCustomizeCompareCountOpen(false);
    setIsCustomizeEntityOpen(false);
    setIsCompareWithOpen(false);
    setIsCompareWithSelectOpen(false);
    setIsCompareWithCountOpen(false);
    setIsExportOpen(false);
    setIsMoreFiltersOpen(false);
    setIsEntityOpen(false);
    setIsDateRangeOpen(false);
    setIsCustomDateRangeOpen(false);
    closeMoreFilterDropdown();
    setCustomizeReportTab("columns");
    setIsCustomizeColumnsOpen(true);
  };

  const applyCustomizeColumns = () => {
    const nextColumns = customizeDraftSelectedColumns.includes("name")
      ? customizeDraftSelectedColumns
      : ["name", ...customizeDraftSelectedColumns];
    setSelectedReportColumns(nextColumns);
    if (customizeDateRangeDraftKey === "custom") {
      setCustomDateRange(customizeCustomDateRangeDraft);
    }
    setDateRangeKey(customizeDateRangeDraftKey);
    setEntityKeys(customizeEntityDraftKeys);
    setMoreFilterRows(customizeMoreFilterRows.map((row) => ({ ...row })));
    setCompareWithKey(compareWithDraftKey);
    setCompareWithCount(compareWithDraftCount);
    setCompareWithArrangeLatest(compareWithDraftArrangeLatest);
    if (compareWithDraftKey === "none") {
      setIsCompareWithOpen(false);
      setIsCompareWithSelectOpen(false);
      setIsCompareWithCountOpen(false);
    }
    setIsCustomizeColumnsOpen(false);
  };

  const cancelCustomizeColumns = () => {
    setCustomizeDraftSelectedColumns(selectedReportColumns);
    setCustomizeColumnsSearch("");
    setCustomizeActiveAvailableColumn("");
    setCustomizeReportTab("general");
    setCustomizeDateRangeDraftKey(dateRangeKey);
    setIsCustomizeDateRangeOpen(false);
    setCustomizeCustomDateRangeDraft(
      dateRangeKey === "custom"
        ? customDateRange
        : getDateRangeValue(dateRangeKey),
    );
    setCustomizeCustomDateRangeMonth(
      getStartOfMonth(
        (dateRangeKey === "custom"
          ? customDateRange
          : getDateRangeValue(dateRangeKey)
        ).start,
      ),
    );
    setIsCustomizeCustomDateRangeOpen(false);
    setCustomizeEntityDraftKeys(
      entityKeys.length > 0
        ? entityKeys
        : ENTITY_OPTIONS.map((option) => option.key),
    );
    setCustomizeEntitySearch("");
    setIsCustomizeEntityOpen(false);
    setCustomizeMoreFilterRows(
      moreFilterRows
        .filter((row) => row.field || row.comparator || row.value.trim())
        .map((row) => ({ ...row })),
    );
    setCustomizeMoreFilterDropdown(null);
    setCustomizeCompareSearch("");
    setCustomizeCompareCountSearch("");
    setIsCustomizeCompareOpen(false);
    setIsCustomizeCompareCountOpen(false);
    setIsCompareWithOpen(false);
    setIsCompareWithSelectOpen(false);
    setIsCompareWithCountOpen(false);
    setIsExportOpen(false);
    setIsMoreFiltersOpen(false);
    setIsEntityOpen(false);
    setIsDateRangeOpen(false);
    setIsCustomDateRangeOpen(false);
    closeMoreFilterDropdown();
    setIsCustomizeColumnsOpen(false);
  };

  const addCustomizeColumn = (key: ReportColumnKey) => {
    setCustomizeDraftSelectedColumns((prev) =>
      prev.includes(key) ? prev : [...prev, key],
    );
    setCustomizeActiveAvailableColumn("");
  };

  const removeCustomizeColumn = (key: ReportColumnKey) => {
    if (key === "name") return;
    setCustomizeDraftSelectedColumns((prev) =>
      prev.filter((item) => item !== key),
    );
    setCustomizeActiveAvailableColumn((prev) => (prev === key ? "" : prev));
  };

  const openCompareWithDropdown = () => {
    setCompareWithDraftKey(compareWithKey);
    setCompareWithDraftCount(compareWithCount);
    setCompareWithDraftArrangeLatest(compareWithArrangeLatest);
    setCompareWithSearch("");
    setCompareWithCountSearch("");
    setIsCompareWithCountOpen(false);
    setIsCompareWithSelectOpen(false);
    setIsCompareWithOpen((prev) => !prev);
  };

  const applyCompareWith = () => {
    setCompareWithKey(compareWithDraftKey);
    setCompareWithCount(compareWithDraftCount);
    setCompareWithArrangeLatest(compareWithDraftArrangeLatest);
    setIsCompareWithOpen(false);
    setIsCompareWithSelectOpen(false);
    setIsCompareWithCountOpen(false);
  };

  const cancelCompareWith = () => {
    setCompareWithDraftKey(compareWithKey);
    setCompareWithDraftCount(compareWithCount);
    setCompareWithDraftArrangeLatest(compareWithArrangeLatest);
    setCompareWithSearch("");
    setCompareWithCountSearch("");
    setIsCompareWithOpen(false);
    setIsCompareWithSelectOpen(false);
    setIsCompareWithCountOpen(false);
  };

  const openMoreFilterDropdown = (
    rowId: string,
    kind: "field" | "comparator" | "value",
  ) => {
    setMoreFilterDropdown((prev) =>
      prev?.rowId === rowId && prev.kind === kind
        ? null
        : { rowId, kind, search: "" },
    );
  };

  const closeMoreFilterDropdown = () => setMoreFilterDropdown(null);

  const addMoreFilterRow = () => {
    const newRowId = `more-filter-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    setMoreFilterRows((prev) => [
      ...prev,
      { id: newRowId, field: "", comparator: "", value: "" },
    ]);
    openMoreFilterDropdown(newRowId, "field");
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#e5e7eb] pb-3">
        <div className="flex min-w-0 items-start gap-3">
          <button
            ref={menuButtonRef}
            type="button"
            onClick={onMenuClick}
            className="inline-flex h-8 w-8 items-center justify-center rounded border border-[#d4d9e4] bg-white text-[#334155] hover:bg-[#f8fafc]"
            aria-label="Toggle reports menu"
          >
            <Menu size={15} />
          </button>
          <div>
            <p className="text-sm font-medium text-[#1b6f7b]">{categoryName}</p>
            <h1 className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-1 text-[24px] font-semibold leading-tight text-[#0f172a]">
              <span>{reportName}</span>
              <span className="text-sm font-normal text-[#475569]">
                - From {formatDate(selectedDateRange.start)} To{" "}
                {formatDate(selectedDateRange.end)}
              </span>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              openCustomizeColumnsModal();
            }}
            className="inline-flex h-9 w-9 items-center justify-center rounded border border-[#d4d9e4] text-[#334155] hover:bg-[#f8fafc]"
            aria-label="Customize report columns"
            title="Customize report columns"
          >
            <SlidersHorizontal size={15} />
          </button>
          <div ref={exportRef} className="relative">
            <button
              type="button"
              onClick={() => setIsExportOpen((prev) => !prev)}
              className={`inline-flex h-9 items-center gap-1 rounded border bg-white px-3 text-sm font-medium text-[#1e293b] hover:bg-[#f8fafc] ${
                isExportOpen ? "border-[#1b6f7b]" : "border-[#d4d9e4]"
              }`}
              aria-haspopup="menu"
              aria-expanded={isExportOpen}
            >
              Export{" "}
              <ChevronDown
                size={14}
                className={`transition-transform duration-150 ${isExportOpen ? "rotate-180" : ""}`}
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
                      onClick={() => handleExportAction(label)}
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
                      onClick={() => handleExportAction(label)}
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
            onClick={onActivityClick}
            className="inline-flex h-9 w-9 items-center justify-center rounded border border-[#d4d9e4] text-[#334155] hover:bg-[#f8fafc]"
            aria-label="Open report activity"
          >
            <RefreshCw size={15} />
          </button>
          <button
            type="button"
            onClick={onClosePage}
            className="inline-flex h-9 w-9 items-center justify-center rounded border border-[#d4d9e4] text-[#ef4444] hover:bg-[#fef2f2]"
            aria-label="Close report page"
          >
            <X size={15} />
          </button>
        </div>
      </div>

      <div
        ref={moreFiltersRef}
        className="relative flex flex-wrap items-center gap-2 border-b border-[#e6e9f0] pb-3 text-sm"
      >
        <span className="inline-flex items-center gap-1 text-[#334155]">
          <Filter size={14} className="text-[#64748b]" />
          <span>Filters :</span>
        </span>
        <div ref={dateRangeRef} className="relative">
          <button
            type="button"
            onClick={openDateRangeDropdown}
            className={`inline-flex h-8 items-center gap-1 rounded border px-3 text-sm text-[#334155] hover:bg-white ${
              isDateRangeOpen
                ? "border-[#1b6f7b] bg-white"
                : "border-[#cfd6e4] bg-[#f8fafc]"
            }`}
            aria-haspopup="menu"
            aria-expanded={isDateRangeOpen}
          >
            <CalendarDays size={14} className="text-[#64748b]" />
            Date Range : <span className="font-medium">
              {dateRangeLabel}
            </span>{" "}
            <ChevronDown size={14} />
          </button>

          {isDateRangeOpen ? (
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
                              setIsCustomDateRangeOpen(true);
                              return;
                            }

                            setDateRangeKey(option.key);
                            setDateRangeDraftKey(option.key);
                            setIsCustomDateRangeOpen(false);
                            setIsDateRangeOpen(false);
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
                            value={formatPickerDate(customDateRangeDraft.start)}
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
                            value={formatPickerDate(customDateRangeDraft.end)}
                            className="h-10 w-full rounded border border-[#1b6f7b] bg-white pl-9 pr-3 text-sm text-[#334155] outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-[1fr_1fr] gap-3">
                      {[
                        { month: customDateRangeMonth, side: "start" as const },
                        {
                          month: addMonths(customDateRangeMonth, 1),
                          side: "end" as const,
                        },
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
                                                : handleCustomEndDateClick(day)
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
                          onClick={applyCustomDateRange}
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
        <div ref={entityRef} className="relative inline-flex">
          <button
            type="button"
            onClick={() => setIsEntityOpen((prev) => !prev)}
            className={`relative inline-flex h-8 w-[184px] items-center overflow-hidden rounded border px-3 pr-12 text-sm text-[#334155] hover:bg-white ${
              isEntityOpen
                ? "border-[#1b6f7b] bg-white"
                : "border-[#cfd6e4] bg-[#f8fafc]"
            }`}
            aria-haspopup="menu"
            aria-expanded={isEntityOpen}
          >
            <span className="shrink-0 whitespace-nowrap">Entities :</span>
            <span className="min-w-0 flex-1 truncate text-left font-medium whitespace-nowrap">
              {entityLabel}
            </span>
            <ChevronDown
              size={14}
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#334155]"
            />
          </button>

          {entityKeys.length > 0 ? (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setEntityKeys([]);
              }}
              className="absolute right-6 top-1/2 inline-flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded text-[#ef4444] hover:bg-[#fef2f2]"
              aria-label="Clear selected entities"
            >
              <X size={12} />
            </button>
          ) : null}

          {isEntityOpen ? (
            <div className="absolute left-0 top-[calc(100%+6px)] z-40 w-[168px] overflow-hidden rounded-lg border border-[#d7dce7] bg-white shadow-[0_10px_24px_rgba(15,23,42,0.12)]">
              <div className="border-b border-[#eef2f7] p-2">
                <div className="relative">
                  <input
                    value={entitySearch}
                    onChange={(event) => setEntitySearch(event.target.value)}
                    placeholder="Search"
                    className="h-9 w-full rounded-md border border-[#1b6f7b] bg-white pl-8 pr-3 text-sm text-[#334155] outline-none placeholder:text-[#94a3b8]"
                  />
                  <Search
                    size={14}
                    className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[#94a3b8]"
                  />
                </div>
              </div>

              <div className="max-h-[220px] overflow-y-auto py-1">
                {filteredEntityOptions.length > 0 ? (
                  filteredEntityOptions.map((option) => {
                    const isSelected = entityKeys.includes(option.key);
                    return (
                      <button
                        key={option.key}
                        type="button"
                        onClick={() => {
                          setEntityKeys((prev) =>
                            prev.includes(option.key)
                              ? prev.filter((key) => key !== option.key)
                              : [...prev, option.key],
                          );
                        }}
                        className={`flex w-full items-center gap-2 px-4 py-2 text-left text-sm ${
                          isSelected
                            ? "bg-[#f1f5f9] font-medium text-[#0f172a]"
                            : "text-[#334155] hover:bg-[#f8fafc]"
                        }`}
                      >
                        <span className="inline-flex h-4 w-4 items-center justify-center rounded border border-[#c7d0de] bg-white">
                          {isSelected ? (
                            <Check size={12} className="text-[#0f172a]" />
                          ) : null}
                        </span>
                        <span>{option.label}</span>
                      </button>
                    );
                  })
                ) : (
                  <div className="px-4 py-3 text-sm text-[#64748b]">
                    No results.
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => {
            setIsMoreFiltersOpen((prev) => !prev);
            closeMoreFilterDropdown();
          }}
          className={`inline-flex h-8 items-center gap-1 rounded border px-3 text-sm text-[#334155] hover:bg-[#f8fafc] ${
            isMoreFiltersOpen || hasMoreFilters
              ? "border-[#1b6f7b] bg-white"
              : "border-[#cfd6e4] bg-white"
          }`}
        >
          <Plus size={14} className="text-[#1b6f7b]" /> More Filters
        </button>

        {isMoreFiltersOpen ? (
          <div
            className="fixed inset-0 z-30 bg-transparent"
            onMouseDown={() => {
              closeMoreFilterDropdown();
              setIsMoreFiltersOpen(false);
            }}
            aria-hidden="true"
          />
        ) : null}

        {isMoreFiltersOpen ? (
          <div className="absolute left-0 top-[calc(100%+10px)] z-40 w-[720px] rounded-lg border border-[#d7dce7] bg-white shadow-[0_10px_24px_rgba(15,23,42,0.12)]">
            <div className="px-4 py-4">
              <div className="space-y-3">
                {moreFilterRows.map((row, index) => {
                  const activeDropdown =
                    moreFilterDropdown?.rowId === row.id
                      ? moreFilterDropdown
                      : null;
                  const fieldMenuOpen = activeDropdown?.kind === "field";
                  const comparatorMenuOpen =
                    activeDropdown?.kind === "comparator";
                  const valueMenuOpen = activeDropdown?.kind === "value";
                  const fieldMenuSearch = fieldMenuOpen
                    ? activeDropdown.search
                    : "";
                  const comparatorMenuSearch = comparatorMenuOpen
                    ? activeDropdown.search
                    : "";
                  const filteredFieldGroups =
                    getFilteredFieldGroups(fieldMenuSearch);
                  const filteredComparatorOptions =
                    getFilteredComparatorOptions(
                      comparatorMenuSearch,
                      row.field,
                    );
                  const valueOptions = row.field
                    ? MORE_FILTER_VALUE_OPTIONS[row.field]
                    : [];
                  const valueMode: MoreFilterValueMode =
                    row.comparator &&
                    MORE_FILTER_NO_VALUE_COMPARATORS.includes(row.comparator)
                      ? "none"
                      : row.comparator &&
                          MORE_FILTER_TEXT_COMPARATORS.includes(row.comparator)
                        ? "text"
                        : "dropdown";
                  const fieldLabel = getMoreFilterFieldLabel(row.field);
                  const comparatorLabel = getMoreFilterComparatorLabel(
                    row.comparator,
                  );
                  const valueLabel =
                    valueMode === "text"
                      ? row.value || "Enter a value"
                      : row.value
                        ? getMoreFilterValueLabel(row.field, row.value)
                        : getMoreFilterValuePlaceholder(row.field);

                  return (
                    <div
                      key={row.id}
                      className="grid grid-cols-[34px_minmax(0,240px)_minmax(0,170px)_minmax(0,1fr)_auto_auto] items-center gap-3"
                    >
                      <div className="flex h-8 items-center justify-center rounded border border-[#d7dce7] bg-white text-xs text-[#475569]">
                        {index + 1}
                      </div>

                      <div className="relative">
                        <button
                          type="button"
                          onClick={() =>
                            openMoreFilterDropdown(row.id, "field")
                          }
                          className={`relative flex h-8 w-full items-center overflow-hidden rounded border px-3 pr-10 text-sm text-[#334155] outline-none ${
                            fieldMenuOpen
                              ? "border-[#1b6f7b] bg-white"
                              : "border-[#cfd6e4] bg-white hover:bg-[#f8fafc]"
                          }`}
                          aria-haspopup="menu"
                          aria-expanded={fieldMenuOpen}
                        >
                          <span
                            className={`min-w-0 flex-1 truncate text-left ${row.field ? "font-medium" : "text-[#94a3b8]"}`}
                          >
                            {fieldLabel}
                          </span>
                          <ChevronDown
                            size={14}
                            className={`pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 transition-transform duration-150 ${
                              fieldMenuOpen
                                ? "rotate-180 text-[#1b6f7b]"
                                : "text-[#64748b]"
                            }`}
                          />
                        </button>

                        {row.field ? (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              setMoreFilterRows((prev) =>
                                prev.map((item) =>
                                  item.id === row.id
                                    ? {
                                        ...item,
                                        field: "",
                                        comparator: "",
                                        value: "",
                                      }
                                    : item,
                                ),
                              );
                              closeMoreFilterDropdown();
                            }}
                            className="absolute right-7 top-1/2 inline-flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded text-[#ef4444] hover:bg-[#fef2f2]"
                            aria-label="Clear field"
                          >
                            <X size={12} />
                          </button>
                        ) : null}

                        {fieldMenuOpen ? (
                          <div className="absolute left-0 top-[calc(100%+6px)] z-50 w-[240px] overflow-hidden rounded-lg border border-[#d7dce7] bg-white shadow-[0_10px_24px_rgba(15,23,42,0.12)]">
                            <div className="border-b border-[#eef2f7] p-2">
                              <div className="relative">
                                <input
                                  value={fieldMenuSearch}
                                  onChange={(event) =>
                                    setMoreFilterDropdown((prev) =>
                                      prev
                                        ? {
                                            ...prev,
                                            search: event.target.value,
                                          }
                                        : prev,
                                    )
                                  }
                                  placeholder="Search"
                                  className="h-9 w-full rounded-md border border-[#1b6f7b] bg-white pl-8 pr-3 text-sm text-[#334155] outline-none placeholder:text-[#94a3b8]"
                                />
                                <Search
                                  size={14}
                                  className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[#94a3b8]"
                                />
                              </div>
                            </div>

                            <div className="max-h-[220px] overflow-y-auto py-1">
                              {filteredFieldGroups.length > 0 ? (
                                filteredFieldGroups.map((group) => (
                                  <div key={group.label}>
                                    <div className="px-3 py-2 text-sm font-semibold text-[#475569]">
                                      {group.label}
                                    </div>
                                    <div className="pb-1">
                                      {group.options.map((option) => {
                                        const isSelected =
                                          row.field === option.key;
                                        return (
                                          <button
                                            key={option.key}
                                            type="button"
                                            onClick={() => {
                                              setMoreFilterRows((prev) =>
                                                prev.map((item) =>
                                                  item.id === row.id
                                                    ? {
                                                        ...item,
                                                        field: option.key,
                                                        comparator: "",
                                                        value: "",
                                                      }
                                                    : item,
                                                ),
                                              );
                                              closeMoreFilterDropdown();
                                            }}
                                            className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm ${
                                              isSelected
                                                ? "bg-white font-medium text-[#0f172a]"
                                                : "text-[#334155] hover:bg-[#f8fafc]"
                                            }`}
                                          >
                                            <span>{option.label}</span>
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
                                ))
                              ) : (
                                <div className="px-3 py-3 text-sm uppercase tracking-[0.04em] text-[#64748b]">
                                  No results found
                                </div>
                              )}
                            </div>
                          </div>
                        ) : null}
                      </div>

                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => {
                            if (!row.field) return;
                            openMoreFilterDropdown(row.id, "comparator");
                          }}
                          disabled={!row.field}
                          className={`relative flex h-8 w-full items-center overflow-hidden rounded border px-3 pr-9 text-sm text-[#334155] outline-none ${
                            row.field
                              ? comparatorMenuOpen
                                ? "border-[#1b6f7b] bg-white"
                                : "border-[#cfd6e4] bg-white hover:bg-[#f8fafc]"
                              : "cursor-not-allowed border-[#e2e8f0] bg-[#f8fafc] text-[#94a3b8]"
                          }`}
                          aria-haspopup="menu"
                          aria-expanded={comparatorMenuOpen}
                        >
                          <span
                            className={`min-w-0 flex-1 truncate text-left ${row.field && row.comparator ? "font-medium" : "text-[#94a3b8]"}`}
                          >
                            {comparatorLabel}
                          </span>
                          <ChevronDown
                            size={14}
                            className={`pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 transition-transform duration-150 ${
                              comparatorMenuOpen
                                ? "rotate-180 text-[#1b6f7b]"
                                : row.field
                                  ? "text-[#64748b]"
                                  : "text-[#cbd5e1]"
                            }`}
                          />
                        </button>

                        {comparatorMenuOpen ? (
                          <div className="absolute left-0 top-[calc(100%+6px)] z-50 w-[168px] overflow-hidden rounded-lg border border-[#d7dce7] bg-white shadow-[0_10px_24px_rgba(15,23,42,0.12)]">
                            <div className="border-b border-[#eef2f7] p-2">
                              <div className="relative">
                                <input
                                  value={comparatorMenuSearch}
                                  onChange={(event) =>
                                    setMoreFilterDropdown((prev) =>
                                      prev
                                        ? {
                                            ...prev,
                                            search: event.target.value,
                                          }
                                        : prev,
                                    )
                                  }
                                  placeholder="Search"
                                  className="h-9 w-full rounded-md border border-[#1b6f7b] bg-white pl-8 pr-3 text-sm text-[#334155] outline-none placeholder:text-[#94a3b8]"
                                />
                                <Search
                                  size={14}
                                  className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[#94a3b8]"
                                />
                              </div>
                            </div>

                            <div className="max-h-[220px] overflow-y-auto py-1">
                              {filteredComparatorOptions.length > 0 ? (
                                filteredComparatorOptions.map((option) => {
                                  const isSelected =
                                    row.comparator === option.key;
                                  return (
                                    <button
                                      key={option.key}
                                      type="button"
                                      onClick={() => {
                                        setMoreFilterRows((prev) =>
                                          prev.map((item) =>
                                            item.id === row.id
                                              ? {
                                                  ...item,
                                                  comparator: option.key,
                                                }
                                              : item,
                                          ),
                                        );
                                        closeMoreFilterDropdown();
                                      }}
                                      className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm ${
                                        isSelected
                                          ? "bg-white font-medium text-[#0f172a]"
                                          : "text-[#334155] hover:bg-[#f8fafc]"
                                      }`}
                                    >
                                      <span>{option.label}</span>
                                      {isSelected ? (
                                        <Check
                                          size={14}
                                          className="text-[#64748b]"
                                        />
                                      ) : null}
                                    </button>
                                  );
                                })
                              ) : (
                                <div className="px-3 py-3 text-sm uppercase tracking-[0.04em] text-[#64748b]">
                                  No results found
                                </div>
                              )}
                            </div>
                          </div>
                        ) : null}
                      </div>

                      <div className="relative">
                        {valueMode === "none" ? (
                          <div className="flex h-8 items-center rounded border border-[#e2e8f0] bg-[#f8fafc] px-3 text-sm text-[#94a3b8]">
                            No value needed
                          </div>
                        ) : valueMode === "text" ? (
                          <input
                            type="text"
                            value={row.value}
                            onChange={(event) => {
                              setMoreFilterRows((prev) =>
                                prev.map((item) =>
                                  item.id === row.id
                                    ? { ...item, value: event.target.value }
                                    : item,
                                ),
                              );
                            }}
                            placeholder="Enter a value"
                            className="h-8 w-full rounded border border-[#cfd6e4] bg-white px-3 text-sm text-[#334155] outline-none placeholder:text-[#94a3b8] focus:border-[#1b6f7b]"
                          />
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                if (!row.field) return;
                                openMoreFilterDropdown(row.id, "value");
                              }}
                              disabled={!row.field}
                              className={`relative flex h-8 w-full items-center overflow-hidden rounded border px-3 pr-9 text-sm outline-none ${
                                row.field
                                  ? valueMenuOpen
                                    ? "border-[#1b6f7b] bg-white text-[#334155]"
                                    : "border-[#cfd6e4] bg-white text-[#334155] hover:bg-[#f8fafc]"
                                  : "cursor-not-allowed border-[#e2e8f0] bg-[#f8fafc] text-[#94a3b8]"
                              }`}
                              aria-haspopup="menu"
                              aria-expanded={valueMenuOpen}
                            >
                              <span
                                className={`min-w-0 flex-1 truncate text-left ${row.value ? "font-medium" : "text-[#94a3b8]"}`}
                              >
                                {valueLabel}
                              </span>
                              <ChevronDown
                                size={14}
                                className={`pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 transition-transform duration-150 ${
                                  valueMenuOpen
                                    ? "rotate-180 text-[#1b6f7b]"
                                    : row.field
                                      ? "text-[#64748b]"
                                      : "text-[#cbd5e1]"
                                }`}
                              />
                            </button>

                            {valueMenuOpen && row.field ? (
                              <div className="absolute left-0 top-[calc(100%+6px)] z-50 w-[220px] overflow-hidden rounded-lg border border-[#d7dce7] bg-white shadow-[0_10px_24px_rgba(15,23,42,0.12)]">
                                <div className="max-h-[220px] overflow-y-auto py-1">
                                  {valueOptions.length > 0 ? (
                                    valueOptions.map((option) => {
                                      const isSelected =
                                        row.value === option.key;
                                      return (
                                        <button
                                          key={option.key}
                                          type="button"
                                          onClick={() => {
                                            setMoreFilterRows((prev) =>
                                              prev.map((item) =>
                                                item.id === row.id
                                                  ? {
                                                      ...item,
                                                      value:
                                                        option.key.startsWith(
                                                          "select-",
                                                        )
                                                          ? ""
                                                          : option.key,
                                                    }
                                                  : item,
                                              ),
                                            );
                                            closeMoreFilterDropdown();
                                          }}
                                          className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm ${
                                            isSelected
                                              ? "bg-white font-medium text-[#0f172a]"
                                              : "text-[#334155] hover:bg-[#f8fafc]"
                                          }`}
                                        >
                                          <span>{option.label}</span>
                                          {isSelected ? (
                                            <Check
                                              size={14}
                                              className="text-[#64748b]"
                                            />
                                          ) : null}
                                        </button>
                                      );
                                    })
                                  ) : (
                                    <div className="px-3 py-3 text-sm uppercase tracking-[0.04em] text-[#64748b]">
                                      No results found
                                    </div>
                                  )}
                                </div>
                              </div>
                            ) : null}
                          </>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={addMoreFilterRow}
                        className="inline-flex h-8 w-8 items-center justify-center rounded border border-[#cfd6e4] text-[#334155] hover:bg-[#f8fafc]"
                        aria-label="Add filter row"
                      >
                        <Plus size={14} />
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setMoreFilterRows((prev) =>
                            prev.length > 1
                              ? prev.filter((item) => item.id !== row.id)
                              : prev,
                          );
                          if (moreFilterDropdown?.rowId === row.id) {
                            closeMoreFilterDropdown();
                          }
                        }}
                        className="inline-flex h-8 w-8 items-center justify-center rounded border border-[#cfd6e4] text-[#334155] hover:bg-[#fef2f2]"
                        aria-label="Remove filter row"
                      >
                        <X size={14} className="text-[#ef4444]" />
                      </button>
                    </div>
                  );
                })}
              </div>

              <div className="mt-3">
                <button
                  type="button"
                  onClick={addMoreFilterRow}
                  className="inline-flex items-center gap-1 text-sm font-medium text-[#1b6f7b] hover:underline"
                >
                  <Plus size={14} /> Add More
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 border-t border-[#eef2f7] px-4 py-3">
              <button
                type="button"
                onClick={() => {
                  closeMoreFilterDropdown();
                  setIsMoreFiltersOpen(false);
                  refreshReport();
                }}
                className="inline-flex h-9 items-center rounded bg-[#1b6f7b] px-4 text-sm font-semibold text-white hover:bg-[#155963]"
              >
                Run Report
              </button>
              <button
                type="button"
                onClick={() => {
                  setMoreFilterRows([
                    {
                      id: "more-filter-1",
                      field: "",
                      comparator: "",
                      value: "",
                    },
                  ]);
                  closeMoreFilterDropdown();
                  setIsMoreFiltersOpen(false);
                }}
                className="inline-flex h-9 items-center rounded border border-[#d4d9e4] bg-white px-4 text-sm text-[#334155] hover:bg-[#f8fafc]"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : null}
        <button
          type="button"
          onClick={() => {
            closeAllOpenPanels();
            refreshReport();
          }}
          className="inline-flex h-8 items-center gap-1 rounded bg-[#1b6f7b] px-4 text-sm font-semibold text-white hover:bg-[#155963]"
        >
          <CalendarDays size={14} /> Run Report
        </button>
      </div>

      <div className="rounded-lg border border-[#e5e7eb] bg-white">
        <div className="flex flex-wrap items-center justify-end gap-4 border-b border-[#eef2f7] px-4 py-3 text-sm text-[#475569]">
          <div ref={compareWithRef} className="relative">
            <button
              type="button"
              onClick={openCompareWithDropdown}
              className={`inline-flex items-center gap-1 hover:text-[#0f172a] ${
                isCompareWithOpen ? "text-[#0f172a]" : ""
              }`}
              aria-haspopup="menu"
              aria-expanded={isCompareWithOpen}
            >
              Compare With :{" "}
              <span className="font-semibold text-[#0f172a]">
                {getCompareWithLabel(compareWithKey)}
              </span>
              <ChevronDown
                size={14}
                className={`transition-transform duration-150 ${isCompareWithOpen ? "rotate-180" : ""}`}
              />
            </button>

            {isCompareWithOpen ? (
              <div className="absolute right-0 top-[calc(100%+6px)] z-50 w-[252px] overflow-visible rounded-lg border border-[#d7dce7] bg-white shadow-[0_10px_24px_rgba(15,23,42,0.12)]">
                <div className="border-b border-[#eef2f7] px-4 py-3 text-sm font-medium text-[#0f172a]">
                  Compare With
                </div>
                <div className="p-3">
                  <button
                    type="button"
                    onClick={() => setIsCompareWithSelectOpen((prev) => !prev)}
                    className="relative flex h-10 w-full items-center justify-between rounded border border-[#1b6f7b] bg-white px-3 pr-9 text-sm text-[#334155] outline-none hover:bg-[#f8fafc]"
                    aria-haspopup="menu"
                    aria-expanded={isCompareWithSelectOpen}
                  >
                    <span className="min-w-0 truncate">
                      {getCompareWithLabel(compareWithDraftKey)}
                    </span>
                    <ChevronDown
                      size={14}
                      className={`pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 transition-transform duration-150 ${
                        isCompareWithSelectOpen
                          ? "rotate-180 text-[#1b6f7b]"
                          : "text-[#64748b]"
                      }`}
                    />
                  </button>

                  {isCompareWithSelectOpen ? (
                    <div className="mt-2 overflow-hidden rounded-lg border border-[#d7dce7] bg-white shadow-[0_10px_24px_rgba(15,23,42,0.12)]">
                      <div className="border-b border-[#eef2f7] p-2">
                        <div className="relative">
                          <input
                            value={compareWithSearch}
                            onChange={(event) =>
                              setCompareWithSearch(event.target.value)
                            }
                            placeholder="Search"
                            className="h-9 w-full rounded-md border border-[#1b6f7b] bg-white pl-8 pr-3 text-sm text-[#334155] outline-none placeholder:text-[#94a3b8]"
                          />
                          <Search
                            size={14}
                            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[#94a3b8]"
                          />
                        </div>
                      </div>

                      <div className="max-h-[180px] overflow-y-auto py-1">
                        {filteredCompareWithOptions.length > 0 ? (
                          filteredCompareWithOptions.map((option) => {
                            const isSelected =
                              compareWithDraftKey === option.key;
                            return (
                              <button
                                key={option.key}
                                type="button"
                                onClick={() => {
                                  setCompareWithDraftKey(option.key);
                                  setIsCompareWithSelectOpen(false);
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
                          })
                        ) : (
                          <div className="px-3 py-3 text-sm uppercase tracking-[0.04em] text-[#64748b]">
                            No results found
                          </div>
                        )}
                      </div>
                    </div>
                  ) : null}

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
                            setIsCompareWithCountOpen((prev) => !prev)
                          }
                          className="relative flex h-10 w-full items-center justify-between rounded border border-[#1b6f7b] bg-white px-3 pr-9 text-sm text-[#334155] outline-none hover:bg-[#f8fafc]"
                          aria-haspopup="menu"
                          aria-expanded={isCompareWithCountOpen}
                        >
                          <span className="min-w-0 truncate">
                            {compareWithDraftCount}
                          </span>
                          <ChevronDown
                            size={14}
                            className={`pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 transition-transform duration-150 ${
                              isCompareWithCountOpen
                                ? "rotate-180 text-[#1b6f7b]"
                                : "text-[#64748b]"
                            }`}
                          />
                        </button>

                        {isCompareWithCountOpen ? (
                          <div className="absolute left-0 top-[calc(100%+6px)] z-[80] w-[168px] overflow-hidden rounded-lg border border-[#d7dce7] bg-white shadow-[0_10px_24px_rgba(15,23,42,0.12)]">
                            <div className="border-b border-[#eef2f7] p-2">
                              <div className="relative">
                                <input
                                  value={compareWithCountSearch}
                                  onChange={(event) =>
                                    setCompareWithCountSearch(
                                      event.target.value,
                                    )
                                  }
                                  placeholder="Search"
                                  className="h-9 w-full rounded-md border border-[#1b6f7b] bg-white pl-8 pr-3 text-sm text-[#334155] outline-none placeholder:text-[#94a3b8]"
                                />
                                <Search
                                  size={14}
                                  className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[#94a3b8]"
                                />
                              </div>
                            </div>

                            <div className="max-h-[220px] overflow-y-auto py-1">
                              {filteredCompareWithNumberOptions.length > 0 ? (
                                filteredCompareWithNumberOptions.map(
                                  (option) => {
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
                                          setIsCompareWithCountOpen(false);
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
                                  },
                                )
                              ) : (
                                <div className="px-3 py-3 text-sm uppercase tracking-[0.04em] text-[#64748b]">
                                  No results found
                                </div>
                              )}
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
                          className="mt-1 h-4 w-4 rounded border-[#cfd6e4] text-[#1b6f7b] focus:ring-[#1b6f7b]"
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
                    className="inline-flex h-8 items-center rounded bg-[#1b6f7b] px-3 text-sm font-semibold text-white hover:bg-[#155963]"
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
            onClick={(event) => {
              event.stopPropagation();
              openCustomizeReportColumnsModal();
            }}
            className="inline-flex items-center gap-1 hover:text-[#0f172a]"
          >
            <Columns3 size={14} />
            Customize Report Columns
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#d9eff1] px-1 text-[11px] font-semibold text-[#1b6f7b]">
              {selectedReportColumns.length}
            </span>
          </button>
        </div>

        {isCustomizeColumnsOpen ? (
          <div
            className={
              customizeReportTab === "general"
                ? "absolute inset-0 z-[90] bg-white"
                : "fixed inset-0 z-[90] flex items-start justify-center overflow-y-auto bg-[#111827]/55 px-4 py-8"
            }
            onMouseDown={
              customizeReportTab === "columns"
                ? (event) => {
                    if (event.target === event.currentTarget) {
                      cancelCustomizeColumns();
                    }
                  }
                : undefined
            }
          >
            <div
              className={
                customizeReportTab === "general"
                  ? "flex h-full w-full flex-col bg-white"
                  : `flex w-full flex-col overflow-hidden rounded-md bg-white shadow-[0_24px_80px_rgba(15,23,42,0.28)] max-w-[760px]`
              }
              onMouseDown={(event) => event.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-[#eef2f7] px-4 py-3">
                <div className="flex items-center gap-3">
                  {customizeReportTab === "general" ? (
                    <button
                      type="button"
                      className="inline-flex h-8 w-8 items-center justify-center rounded border border-[#d4d9e4] bg-white text-[#334155]"
                      aria-label="Customize report menu"
                    >
                      <Menu size={16} />
                    </button>
                  ) : null}
                  <div className="text-[20px] font-medium text-[#111827]">
                    {customizeReportTab === "columns"
                      ? "Customize Report Columns"
                      : "Customize Report"}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={cancelCustomizeColumns}
                  className="inline-flex h-8 w-8 items-center justify-center rounded text-[#ef4444] hover:bg-[#fef2f2]"
                  aria-label="Close customize report"
                >
                  <X size={16} />
                </button>
              </div>

              <div
                className={`flex min-h-[640px] flex-1 overflow-hidden ${customizeReportTab === "columns" ? "flex-col" : ""}`}
              >
                {customizeReportTab === "general" ? (
                  <aside className="w-[150px] shrink-0 border-r border-[#eef2f7] bg-[#fbfcfe] px-0 py-2">
                    <button
                      type="button"
                      onClick={() => setCustomizeReportTab("general")}
                      className="flex w-full items-center border-l-4 border-[#1b6f7b] bg-white px-4 py-3 text-left text-sm font-medium text-[#0f172a]"
                    >
                      General
                    </button>
                    <button
                      type="button"
                      onClick={() => setCustomizeReportTab("columns")}
                      className="flex w-full items-center px-4 py-3 text-left text-sm text-[#2563eb] hover:bg-[#f8fafc]"
                    >
                      Show / Hide Columns
                    </button>
                  </aside>
                ) : null}

                <main
                  className={`min-w-0 flex-1 overflow-auto ${customizeReportTab === "columns" ? "px-5 py-6" : "px-6 py-6"}`}
                >
                  {customizeReportTab === "general" ? (
                    <div className="space-y-6">
                      <section>
                        <div className="text-sm font-medium text-[#111827]">
                          Date Range
                        </div>
                        <div
                          ref={customizeDateRangeRef}
                          className="relative mt-2 inline-block"
                        >
                          <button
                            type="button"
                            onClick={() => {
                              setIsCustomizeCompareOpen(false);
                              setIsCustomizeCompareCountOpen(false);
                              setIsCustomizeEntityOpen(false);
                              setIsCustomizeDateRangeOpen((prev) => {
                                const next = !prev;
                                if (!next) {
                                  setIsCustomizeCustomDateRangeOpen(false);
                                } else {
                                  setIsCustomizeCustomDateRangeOpen(
                                    customizeDateRangeDraftKey === "custom",
                                  );
                                }
                                return next;
                              });
                            }}
                            className="inline-flex h-9 min-w-[250px] items-center justify-between rounded border border-[#cfd6e4] bg-white px-3 pr-10 text-sm text-[#334155] hover:bg-[#f8fafc]"
                            aria-haspopup="menu"
                            aria-expanded={isCustomizeDateRangeOpen}
                          >
                            <span className="inline-flex items-center gap-2 truncate">
                              <CalendarDays
                                size={14}
                                className="text-[#64748b]"
                              />
                              <span>{customizeDateRangeLabel}</span>
                            </span>
                            <ChevronDown
                              size={14}
                              className={`pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 transition-transform duration-150 ${
                                isCustomizeDateRangeOpen
                                  ? "rotate-180 text-[#1b6f7b]"
                                  : "text-[#64748b]"
                              }`}
                            />
                          </button>

                          {isCustomizeDateRangeOpen ? (
                            <div
                              className={`absolute left-0 top-[calc(100%+6px)] z-50 overflow-visible rounded-lg border border-[#d7dce7] bg-white shadow-[0_10px_24px_rgba(15,23,42,0.12)] ${
                                isCustomizeCustomDateRangeOpen
                                  ? "w-[680px]"
                                  : "w-[165px]"
                              }`}
                            >
                              <div className="flex">
                                <div className="w-[165px] border-r border-[#eef2f7]">
                                  <div className="max-h-[280px] overflow-y-auto py-1">
                                    {DATE_RANGE_OPTIONS.map((option) => {
                                      const isSelected =
                                        option.key ===
                                        customizeDateRangeDraftKey;
                                      return (
                                        <button
                                          key={option.key}
                                          type="button"
                                          onClick={() => {
                                            if (option.key === "custom") {
                                              const currentRange =
                                                customizeDateRangeDraftKey ===
                                                "custom"
                                                  ? customizeCustomDateRangeDraft
                                                  : getDateRangeValue(
                                                      customizeDateRangeDraftKey,
                                                    );
                                              setCustomizeDateRangeDraftKey(
                                                "custom",
                                              );
                                              setCustomizeCustomDateRangeDraft(
                                                currentRange,
                                              );
                                              setCustomizeCustomDateRangeMonth(
                                                getStartOfMonth(
                                                  currentRange.start,
                                                ),
                                              );
                                              setIsCustomizeCustomDateRangeOpen(
                                                true,
                                              );
                                              return;
                                            }

                                            setCustomizeDateRangeDraftKey(
                                              option.key,
                                            );
                                            setIsCustomizeCustomDateRangeOpen(
                                              false,
                                            );
                                            setIsCustomizeDateRangeOpen(false);
                                          }}
                                          className={`flex w-full items-center justify-between px-4 py-2 text-left text-sm ${
                                            isSelected
                                              ? "font-medium text-[#0f172a]"
                                              : "text-[#334155] hover:bg-[#f8fafc]"
                                          }`}
                                        >
                                          <span>{option.label}</span>
                                          {isSelected ? (
                                            <Check
                                              size={14}
                                              className="text-[#0f172a]"
                                            />
                                          ) : null}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>

                                {isCustomizeCustomDateRangeOpen ? (
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
                                              customizeCustomDateRangeDraft.start,
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
                                              customizeCustomDateRangeDraft.end,
                                            )}
                                            className="h-10 w-full rounded border border-[#1b6f7b] bg-white pl-9 pr-3 text-sm text-[#334155] outline-none"
                                          />
                                        </div>
                                      </div>
                                    </div>

                                    <div className="mt-3 grid grid-cols-[1fr_1fr] gap-3">
                                      {[
                                        {
                                          month: customizeCustomDateRangeMonth,
                                          side: "start" as const,
                                        },
                                        {
                                          month: addMonths(
                                            customizeCustomDateRangeMonth,
                                            1,
                                          ),
                                          side: "end" as const,
                                        },
                                      ].map(({ month, side }) => {
                                        const weeks = buildCalendarGrid(month);

                                        return (
                                          <div
                                            key={`${side}-${month.toISOString()}`}
                                            className="rounded-lg border border-[#eef2f7] bg-white p-2"
                                          >
                                            <div className="mb-2 flex items-center justify-between gap-2 px-1">
                                              <button
                                                type="button"
                                                onClick={() =>
                                                  setCustomizeCustomDateRangeMonth(
                                                    (prev) =>
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
                                                      ? setCustomizeLeftCalendarMonth(
                                                          Number(
                                                            event.target.value,
                                                          ),
                                                          month.getFullYear(),
                                                        )
                                                      : setCustomizeRightCalendarMonth(
                                                          Number(
                                                            event.target.value,
                                                          ),
                                                          month.getFullYear(),
                                                        )
                                                  }
                                                  className="h-6 rounded border border-[#cfd6e4] bg-white px-1 text-[11px] text-[#334155] outline-none"
                                                >
                                                  {MONTH_NAMES.map(
                                                    (monthName, index) => (
                                                      <option
                                                        key={monthName}
                                                        value={index}
                                                      >
                                                        {monthName}
                                                      </option>
                                                    ),
                                                  )}
                                                </select>
                                                <select
                                                  value={month.getFullYear()}
                                                  onChange={(event) =>
                                                    side === "start"
                                                      ? setCustomizeLeftCalendarMonth(
                                                          month.getMonth(),
                                                          Number(
                                                            event.target.value,
                                                          ),
                                                        )
                                                      : setCustomizeRightCalendarMonth(
                                                          month.getMonth(),
                                                          Number(
                                                            event.target.value,
                                                          ),
                                                        )
                                                  }
                                                  className="h-6 rounded border border-[#cfd6e4] bg-white px-1 text-[11px] text-[#334155] outline-none"
                                                >
                                                  {CALENDAR_YEAR_OPTIONS.map(
                                                    (year) => (
                                                      <option
                                                        key={year}
                                                        value={year}
                                                      >
                                                        {year}
                                                      </option>
                                                    ),
                                                  )}
                                                </select>
                                              </div>

                                              <button
                                                type="button"
                                                onClick={() =>
                                                  setCustomizeCustomDateRangeMonth(
                                                    (prev) =>
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
                                                {weeks.map(
                                                  (week, weekIndex) => (
                                                    <tr
                                                      key={`${side}-week-${weekIndex}`}
                                                    >
                                                      {week.map((day) => {
                                                        const inCurrentMonth =
                                                          isSameMonth(
                                                            day,
                                                            month,
                                                          );
                                                        const isStart =
                                                          isSameDay(
                                                            day,
                                                            customizeCustomDateRangeDraft.start,
                                                          );
                                                        const isEnd = isSameDay(
                                                          day,
                                                          customizeCustomDateRangeDraft.end,
                                                        );
                                                        const inRange =
                                                          day >=
                                                            customizeCustomDateRangeDraft.start &&
                                                          day <=
                                                            customizeCustomDateRangeDraft.end;
                                                        const isToday =
                                                          isSameDay(
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
                                                                  ? handleCustomizeCustomStartDateClick(
                                                                      day,
                                                                    )
                                                                  : handleCustomizeCustomEndDateClick(
                                                                      day,
                                                                    )
                                                              }
                                                              className={`m-[1px] flex h-7 w-full items-center justify-center rounded text-[11px] ${
                                                                !inCurrentMonth
                                                                  ? "text-[#cbd5e1]"
                                                                  : isStart ||
                                                                      isEnd
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
                                                  ),
                                                )}
                                              </tbody>
                                            </table>
                                          </div>
                                        );
                                      })}
                                    </div>

                                    <div className="mt-3 flex items-center justify-between gap-2">
                                      <div className="text-xs text-[#64748b]">
                                        {formatPickerDate(
                                          customizeCustomDateRangeDraft.start,
                                        )}{" "}
                                        -{" "}
                                        {formatPickerDate(
                                          customizeCustomDateRangeDraft.end,
                                        )}
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setIsCustomizeCustomDateRangeOpen(
                                              false,
                                            );
                                            setIsCustomizeDateRangeOpen(false);
                                          }}
                                          className="inline-flex h-8 items-center rounded border border-[#d4d9e4] bg-white px-3 text-sm text-[#334155] hover:bg-[#f8fafc]"
                                        >
                                          Cancel
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setIsCustomizeCustomDateRangeOpen(
                                              false,
                                            );
                                            setIsCustomizeDateRangeOpen(false);
                                          }}
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
                      </section>

                      <hr className="border-[#e5e7eb]" />

                      <section className="space-y-6">
                        <div className="grid gap-6 md:grid-cols-2">
                          <div ref={customizeCompareRef} className="relative">
                            <div className="text-sm font-medium text-[#111827]">
                              Compare With
                            </div>
                            <div className="relative mt-2 w-full max-w-[260px]">
                              <button
                                type="button"
                                onClick={() => {
                                  setIsCustomizeCompareCountOpen(false);
                                  setIsCustomizeCompareOpen((prev) => !prev);
                                }}
                                className="inline-flex h-9 w-full items-center justify-between rounded border border-[#cfd6e4] bg-white px-3 pr-12 text-sm text-[#334155] hover:bg-[#f8fafc]"
                                aria-haspopup="menu"
                                aria-expanded={isCustomizeCompareOpen}
                              >
                                <span className="truncate">
                                  {getCompareWithLabel(compareWithDraftKey)}
                                </span>
                                <ChevronDown
                                  size={14}
                                  className={`pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 transition-transform duration-150 ${
                                    isCustomizeCompareOpen
                                      ? "rotate-180 text-[#1b6f7b]"
                                      : "text-[#64748b]"
                                  }`}
                                />
                              </button>
                              {compareWithDraftKey !== "none" ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setCompareWithDraftKey("none");
                                    setCompareWithDraftCount(1);
                                    setCompareWithDraftArrangeLatest(false);
                                    setIsCustomizeCompareOpen(false);
                                    setIsCustomizeCompareCountOpen(false);
                                  }}
                                  className="absolute right-8 top-1/2 inline-flex h-4 w-4 -translate-y-1/2 items-center justify-center text-[#ef4444]"
                                  aria-label="Clear compare selection"
                                >
                                  <X size={12} />
                                </button>
                              ) : null}
                            </div>

                            {isCustomizeCompareOpen ? (
                              <div className="absolute left-0 top-[calc(100%+6px)] z-50 w-[260px] overflow-hidden rounded-lg border border-[#d7dce7] bg-white shadow-[0_10px_24px_rgba(15,23,42,0.12)]">
                                <div className="border-b border-[#eef2f7] p-2">
                                  <div className="relative">
                                    <input
                                      value={customizeCompareSearch}
                                      onChange={(event) =>
                                        setCustomizeCompareSearch(
                                          event.target.value,
                                        )
                                      }
                                      placeholder="Search"
                                      className="h-9 w-full rounded-md border border-[#1b6f7b] bg-white pl-8 pr-3 text-sm text-[#334155] outline-none placeholder:text-[#94a3b8]"
                                    />
                                    <Search
                                      size={14}
                                      className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[#94a3b8]"
                                    />
                                  </div>
                                </div>

                                <div className="max-h-[170px] overflow-y-auto py-1">
                                  {filteredCustomizeCompareOptions.length >
                                  0 ? (
                                    filteredCustomizeCompareOptions.map(
                                      (option) => {
                                        const isSelected =
                                          compareWithDraftKey === option.key;
                                        return (
                                          <button
                                            key={option.key}
                                            type="button"
                                            onClick={() => {
                                              setCompareWithDraftKey(
                                                option.key,
                                              );
                                              setIsCustomizeCompareOpen(false);
                                              setIsCustomizeCompareCountOpen(
                                                true,
                                              );
                                              setCustomizeCompareCountSearch(
                                                "",
                                              );
                                              if (compareWithDraftCount < 1) {
                                                setCompareWithDraftCount(1);
                                              }
                                            }}
                                            className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm ${
                                              isSelected
                                                ? "bg-[#eef4ff] font-medium text-[#0f172a]"
                                                : "text-[#334155] hover:bg-[#f8fafc]"
                                            }`}
                                          >
                                            <span>{option.label}</span>
                                            {isSelected ? (
                                              <Check
                                                size={14}
                                                className="text-[#64748b]"
                                              />
                                            ) : null}
                                          </button>
                                        );
                                      },
                                    )
                                  ) : (
                                    <div className="px-3 py-3 text-sm uppercase tracking-[0.04em] text-[#64748b]">
                                      No results found
                                    </div>
                                  )}
                                </div>
                              </div>
                            ) : null}
                          </div>

                          <div
                            ref={customizeCompareCountRef}
                            className="relative"
                          >
                            {compareWithDraftKey !== "none" ? (
                              <>
                                <div className="text-sm font-medium text-[#111827]">
                                  {compareWithDraftKey === "previous-years"
                                    ? "Number of Year(s)"
                                    : "Number of Period(s)"}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setIsCustomizeCompareOpen(false);
                                    setIsCustomizeCompareCountOpen(
                                      (prev) => !prev,
                                    );
                                  }}
                                  className="mt-2 inline-flex h-9 w-full max-w-[260px] items-center justify-between rounded border border-[#cfd6e4] bg-white px-3 text-sm text-[#334155] hover:bg-[#f8fafc]"
                                  aria-haspopup="menu"
                                  aria-expanded={isCustomizeCompareCountOpen}
                                >
                                  <span>{compareWithDraftCount}</span>
                                  <ChevronDown
                                    size={14}
                                    className={`transition-transform duration-150 ${
                                      isCustomizeCompareCountOpen
                                        ? "rotate-180 text-[#1b6f7b]"
                                        : "text-[#64748b]"
                                    }`}
                                  />
                                </button>

                                {isCustomizeCompareCountOpen ? (
                                  <div className="absolute left-0 top-[calc(100%+6px)] z-50 w-[168px] overflow-hidden rounded-lg border border-[#d7dce7] bg-white shadow-[0_10px_24px_rgba(15,23,42,0.12)]">
                                    <div className="border-b border-[#eef2f7] p-2">
                                      <div className="relative">
                                        <input
                                          value={customizeCompareCountSearch}
                                          onChange={(event) =>
                                            setCustomizeCompareCountSearch(
                                              event.target.value,
                                            )
                                          }
                                          placeholder="Search"
                                          className="h-9 w-full rounded-md border border-[#1b6f7b] bg-white pl-8 pr-3 text-sm text-[#334155] outline-none placeholder:text-[#94a3b8]"
                                        />
                                        <Search
                                          size={14}
                                          className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[#94a3b8]"
                                        />
                                      </div>
                                    </div>

                                    <div className="max-h-[220px] overflow-y-auto py-1">
                                      {filteredCustomizeCompareNumberOptions.length >
                                      0 ? (
                                        filteredCustomizeCompareNumberOptions.map(
                                          (option) => {
                                            const isSelected =
                                              String(compareWithDraftCount) ===
                                              option;
                                            return (
                                              <button
                                                key={option}
                                                type="button"
                                                onClick={() => {
                                                  setCompareWithDraftCount(
                                                    Number(option),
                                                  );
                                                  setIsCustomizeCompareCountOpen(
                                                    false,
                                                  );
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
                                          },
                                        )
                                      ) : (
                                        <div className="px-3 py-3 text-sm uppercase tracking-[0.04em] text-[#64748b]">
                                          No results found
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ) : null}
                              </>
                            ) : null}
                          </div>
                        </div>

                        {compareWithDraftKey !== "none" ? (
                          <label className="flex items-start gap-2 text-sm text-[#334155]">
                            <input
                              type="checkbox"
                              checked={compareWithDraftArrangeLatest}
                              onChange={(event) =>
                                setCompareWithDraftArrangeLatest(
                                  event.target.checked,
                                )
                              }
                              className="mt-1 h-4 w-4 rounded border-[#cfd6e4] text-[#1b6f7b] focus:ring-[#1b6f7b]"
                            />
                            <span>
                              Arrange period/year from latest to oldest
                            </span>
                          </label>
                        ) : null}

                        <div ref={customizeEntityRef} className="relative">
                          <div className="text-sm font-medium text-[#111827]">
                            Entities :
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setIsCustomizeCompareOpen(false);
                              setIsCustomizeCompareCountOpen(false);
                              setIsCustomizeEntityOpen((prev) => !prev);
                            }}
                            className="mt-2 inline-flex h-9 w-full max-w-[260px] items-center justify-between rounded border border-[#cfd6e4] bg-white px-3 text-sm text-[#334155] hover:bg-[#f8fafc]"
                            aria-haspopup="menu"
                            aria-expanded={isCustomizeEntityOpen}
                          >
                            <span className="truncate">
                              {getEntitySelectionLabel(
                                customizeEntityDraftKeys,
                              )}
                            </span>
                            <ChevronDown
                              size={14}
                              className={`transition-transform duration-150 ${
                                isCustomizeEntityOpen
                                  ? "rotate-180 text-[#1b6f7b]"
                                  : "text-[#64748b]"
                              }`}
                            />
                          </button>

                          {isCustomizeEntityOpen ? (
                            <div className="absolute left-0 top-[calc(100%+6px)] z-50 w-[260px] overflow-hidden rounded-lg border border-[#d7dce7] bg-white shadow-[0_10px_24px_rgba(15,23,42,0.12)]">
                              <div className="border-b border-[#eef2f7] p-2">
                                <div className="relative">
                                  <input
                                    value={customizeEntitySearch}
                                    onChange={(event) =>
                                      setCustomizeEntitySearch(
                                        event.target.value,
                                      )
                                    }
                                    placeholder="Search"
                                    className="h-9 w-full rounded-md border border-[#1b6f7b] bg-white pl-8 pr-3 text-sm text-[#334155] outline-none placeholder:text-[#94a3b8]"
                                  />
                                  <Search
                                    size={14}
                                    className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[#94a3b8]"
                                  />
                                </div>
                              </div>

                              <div className="max-h-[220px] overflow-y-auto py-1">
                                {ENTITY_OPTIONS.filter((option) =>
                                  option.label
                                    .toLowerCase()
                                    .includes(
                                      customizeEntitySearch
                                        .trim()
                                        .toLowerCase(),
                                    ),
                                ).length > 0 ? (
                                  ENTITY_OPTIONS.filter((option) =>
                                    option.label
                                      .toLowerCase()
                                      .includes(
                                        customizeEntitySearch
                                          .trim()
                                          .toLowerCase(),
                                      ),
                                  ).map((option) => {
                                    const isSelected =
                                      customizeEntityDraftKeys.includes(
                                        option.key,
                                      );
                                    return (
                                      <button
                                        key={option.key}
                                        type="button"
                                        onClick={() => {
                                          setCustomizeEntityDraftKeys((prev) =>
                                            prev.includes(option.key)
                                              ? prev.filter(
                                                  (key) => key !== option.key,
                                                )
                                              : [...prev, option.key],
                                          );
                                        }}
                                        className={`flex w-full items-center gap-2 px-4 py-2 text-left text-sm ${
                                          isSelected
                                            ? "bg-[#f1f5f9] font-medium text-[#0f172a]"
                                            : "text-[#334155] hover:bg-[#f8fafc]"
                                        }`}
                                      >
                                        <span className="inline-flex h-4 w-4 items-center justify-center rounded border border-[#c7d0de] bg-white">
                                          {isSelected ? (
                                            <Check
                                              size={12}
                                              className="text-[#0f172a]"
                                            />
                                          ) : null}
                                        </span>
                                        <span>{option.label}</span>
                                      </button>
                                    );
                                  })
                                ) : (
                                  <div className="px-4 py-3 text-sm text-[#64748b]">
                                    No results.
                                  </div>
                                )}
                              </div>
                            </div>
                          ) : null}
                        </div>
                      </section>

                      <hr className="border-[#e5e7eb]" />

                      <section ref={customizeMoreFiltersRef}>
                        <div className="text-base font-semibold text-[#111827]">
                          Advanced Filters
                        </div>
                        <p className="mt-1 text-sm text-[#64748b]">
                          Use advanced filters to filter the report based on the
                          fields of Reports, Locations.
                        </p>

                        {customizeMoreFilterRows.length > 0 ? (
                          <div className="mt-4 space-y-3">
                            {customizeMoreFilterRows.map((row, index) => {
                              const activeDropdown =
                                customizeMoreFilterDropdown?.rowId === row.id
                                  ? customizeMoreFilterDropdown
                                  : null;
                              const fieldMenuOpen =
                                activeDropdown?.kind === "field";
                              const comparatorMenuOpen =
                                activeDropdown?.kind === "comparator";
                              const valueMenuOpen =
                                activeDropdown?.kind === "value";
                              const fieldMenuSearch = fieldMenuOpen
                                ? activeDropdown.search
                                : "";
                              const comparatorMenuSearch = comparatorMenuOpen
                                ? activeDropdown.search
                                : "";
                              const filteredFieldGroups =
                                getFilteredFieldGroups(fieldMenuSearch);
                              const filteredComparatorOptions =
                                getFilteredComparatorOptions(
                                  comparatorMenuSearch,
                                  row.field,
                                );
                              const valueOptions = row.field
                                ? MORE_FILTER_VALUE_OPTIONS[row.field]
                                : [];
                              const valueMode: MoreFilterValueMode =
                                row.comparator &&
                                MORE_FILTER_NO_VALUE_COMPARATORS.includes(
                                  row.comparator,
                                )
                                  ? "none"
                                  : row.comparator &&
                                      MORE_FILTER_TEXT_COMPARATORS.includes(
                                        row.comparator,
                                      )
                                    ? "text"
                                    : "dropdown";
                              const fieldLabel = getMoreFilterFieldLabel(
                                row.field,
                              );
                              const comparatorLabel =
                                getMoreFilterComparatorLabel(row.comparator);
                              const valueLabel =
                                valueMode === "text"
                                  ? row.value || "Enter a value"
                                  : row.value
                                    ? getMoreFilterValueLabel(
                                        row.field,
                                        row.value,
                                      )
                                    : getMoreFilterValuePlaceholder(row.field);

                              return (
                                <div
                                  key={row.id}
                                  className="grid w-fit grid-cols-[34px_minmax(0,240px)_minmax(0,170px)_minmax(0,300px)_auto_auto] items-center gap-2"
                                >
                                  <div className="flex h-8 items-center justify-center rounded border border-[#d7dce7] bg-white text-xs text-[#475569]">
                                    {index + 1}
                                  </div>

                                  <div className="relative">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        openCustomizeMoreFilterDropdown(
                                          row.id,
                                          "field",
                                        )
                                      }
                                      className={`relative flex h-8 w-full items-center overflow-hidden rounded border px-3 pr-10 text-sm text-[#334155] outline-none ${
                                        fieldMenuOpen
                                          ? "border-[#1b6f7b] bg-white"
                                          : "border-[#cfd6e4] bg-white hover:bg-[#f8fafc]"
                                      }`}
                                      aria-haspopup="menu"
                                      aria-expanded={fieldMenuOpen}
                                    >
                                      <span
                                        className={`min-w-0 flex-1 truncate text-left ${row.field ? "font-medium" : "text-[#94a3b8]"}`}
                                      >
                                        {fieldLabel}
                                      </span>
                                      <ChevronDown
                                        size={14}
                                        className={`pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 transition-transform duration-150 ${
                                          fieldMenuOpen
                                            ? "rotate-180 text-[#1b6f7b]"
                                            : "text-[#64748b]"
                                        }`}
                                      />
                                    </button>

                                    {row.field ? (
                                      <button
                                        type="button"
                                        onClick={(event) => {
                                          event.stopPropagation();
                                          setCustomizeMoreFilterRows((prev) =>
                                            prev.map((item) =>
                                              item.id === row.id
                                                ? {
                                                    ...item,
                                                    field: "",
                                                    comparator: "",
                                                    value: "",
                                                  }
                                                : item,
                                            ),
                                          );
                                          closeCustomizeMoreFilterDropdown();
                                        }}
                                        className="absolute right-7 top-1/2 inline-flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded text-[#ef4444] hover:bg-[#fef2f2]"
                                        aria-label="Clear field"
                                      >
                                        <X size={12} />
                                      </button>
                                    ) : null}

                                    {fieldMenuOpen ? (
                                      <div className="absolute left-0 top-[calc(100%+6px)] z-50 w-[240px] overflow-hidden rounded-lg border border-[#d7dce7] bg-white shadow-[0_10px_24px_rgba(15,23,42,0.12)]">
                                        <div className="border-b border-[#eef2f7] p-2">
                                          <div className="relative">
                                            <input
                                              value={fieldMenuSearch}
                                              onChange={(event) =>
                                                setCustomizeMoreFilterDropdown(
                                                  (prev) =>
                                                    prev
                                                      ? {
                                                          ...prev,
                                                          search:
                                                            event.target.value,
                                                        }
                                                      : prev,
                                                )
                                              }
                                              placeholder="Search"
                                              className="h-9 w-full rounded-md border border-[#1b6f7b] bg-white pl-8 pr-3 text-sm text-[#334155] outline-none placeholder:text-[#94a3b8]"
                                            />
                                            <Search
                                              size={14}
                                              className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[#94a3b8]"
                                            />
                                          </div>
                                        </div>

                                        <div className="max-h-[220px] overflow-y-auto py-1">
                                          {filteredFieldGroups.length > 0 ? (
                                            filteredFieldGroups.map((group) => (
                                              <div key={group.label}>
                                                <div className="px-3 py-2 text-sm font-semibold text-[#475569]">
                                                  {group.label}
                                                </div>
                                                <div className="pb-1">
                                                  {group.options.map(
                                                    (option) => {
                                                      const isSelected =
                                                        row.field ===
                                                        option.key;
                                                      return (
                                                        <button
                                                          key={option.key}
                                                          type="button"
                                                          onClick={() => {
                                                            setCustomizeMoreFilterRows(
                                                              (prev) =>
                                                                prev.map(
                                                                  (item) =>
                                                                    item.id ===
                                                                    row.id
                                                                      ? {
                                                                          ...item,
                                                                          field:
                                                                            option.key,
                                                                          comparator:
                                                                            "",
                                                                          value:
                                                                            "",
                                                                        }
                                                                      : item,
                                                                ),
                                                            );
                                                            closeCustomizeMoreFilterDropdown();
                                                          }}
                                                          className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm ${
                                                            isSelected
                                                              ? "bg-white font-medium text-[#0f172a]"
                                                              : "text-[#334155] hover:bg-[#f8fafc]"
                                                          }`}
                                                        >
                                                          <span>
                                                            {option.label}
                                                          </span>
                                                          {isSelected ? (
                                                            <Check
                                                              size={14}
                                                              className="text-[#64748b]"
                                                            />
                                                          ) : null}
                                                        </button>
                                                      );
                                                    },
                                                  )}
                                                </div>
                                              </div>
                                            ))
                                          ) : (
                                            <div className="px-3 py-3 text-sm uppercase tracking-[0.04em] text-[#64748b]">
                                              No results found
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    ) : null}
                                  </div>

                                  <div className="relative">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (!row.field) return;
                                        openCustomizeMoreFilterDropdown(
                                          row.id,
                                          "comparator",
                                        );
                                      }}
                                      disabled={!row.field}
                                      className={`relative flex h-8 w-full items-center overflow-hidden rounded border px-3 pr-9 text-sm text-[#334155] outline-none ${
                                        row.field
                                          ? comparatorMenuOpen
                                            ? "border-[#1b6f7b] bg-white"
                                            : "border-[#cfd6e4] bg-white hover:bg-[#f8fafc]"
                                          : "cursor-not-allowed border-[#e2e8f0] bg-[#f8fafc] text-[#94a3b8]"
                                      }`}
                                      aria-haspopup="menu"
                                      aria-expanded={comparatorMenuOpen}
                                    >
                                      <span
                                        className={`min-w-0 flex-1 truncate text-left ${row.field && row.comparator ? "font-medium" : "text-[#94a3b8]"}`}
                                      >
                                        {comparatorLabel}
                                      </span>
                                      <ChevronDown
                                        size={14}
                                        className={`pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 transition-transform duration-150 ${
                                          comparatorMenuOpen
                                            ? "rotate-180 text-[#1b6f7b]"
                                            : row.field
                                              ? "text-[#64748b]"
                                              : "text-[#cbd5e1]"
                                        }`}
                                      />
                                    </button>

                                    {comparatorMenuOpen ? (
                                      <div className="absolute left-0 top-[calc(100%+6px)] z-50 w-[168px] overflow-hidden rounded-lg border border-[#d7dce7] bg-white shadow-[0_10px_24px_rgba(15,23,42,0.12)]">
                                        <div className="border-b border-[#eef2f7] p-2">
                                          <div className="relative">
                                            <input
                                              value={comparatorMenuSearch}
                                              onChange={(event) =>
                                                setCustomizeMoreFilterDropdown(
                                                  (prev) =>
                                                    prev
                                                      ? {
                                                          ...prev,
                                                          search:
                                                            event.target.value,
                                                        }
                                                      : prev,
                                                )
                                              }
                                              placeholder="Search"
                                              className="h-9 w-full rounded-md border border-[#1b6f7b] bg-white pl-8 pr-3 text-sm text-[#334155] outline-none placeholder:text-[#94a3b8]"
                                            />
                                            <Search
                                              size={14}
                                              className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[#94a3b8]"
                                            />
                                          </div>
                                        </div>

                                        <div className="max-h-[220px] overflow-y-auto py-1">
                                          {filteredComparatorOptions.length >
                                          0 ? (
                                            filteredComparatorOptions.map(
                                              (option) => {
                                                const isSelected =
                                                  row.comparator === option.key;
                                                return (
                                                  <button
                                                    key={option.key}
                                                    type="button"
                                                    onClick={() => {
                                                      setCustomizeMoreFilterRows(
                                                        (prev) =>
                                                          prev.map((item) =>
                                                            item.id === row.id
                                                              ? {
                                                                  ...item,
                                                                  comparator:
                                                                    option.key,
                                                                }
                                                              : item,
                                                          ),
                                                      );
                                                      closeCustomizeMoreFilterDropdown();
                                                    }}
                                                    className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm ${
                                                      isSelected
                                                        ? "font-medium text-[#0f172a]"
                                                        : "text-[#334155] hover:bg-[#f8fafc]"
                                                    }`}
                                                  >
                                                    <span>{option.label}</span>
                                                    {isSelected ? (
                                                      <Check
                                                        size={14}
                                                        className="text-[#64748b]"
                                                      />
                                                    ) : null}
                                                  </button>
                                                );
                                              },
                                            )
                                          ) : (
                                            <div className="px-3 py-3 text-sm uppercase tracking-[0.04em] text-[#64748b]">
                                              No results found
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    ) : null}
                                  </div>

                                  <div className="relative">
                                    {valueMode === "none" ? (
                                      <div className="flex h-8 items-center rounded border border-[#e2e8f0] bg-[#f8fafc] px-3 text-sm text-[#94a3b8]">
                                        No value needed
                                      </div>
                                    ) : valueMode === "text" ? (
                                      <input
                                        type="text"
                                        value={row.value}
                                        onChange={(event) => {
                                          setCustomizeMoreFilterRows((prev) =>
                                            prev.map((item) =>
                                              item.id === row.id
                                                ? {
                                                    ...item,
                                                    value: event.target.value,
                                                  }
                                                : item,
                                            ),
                                          );
                                        }}
                                        placeholder="Enter a value"
                                        className="h-8 w-full rounded border border-[#cfd6e4] bg-white px-3 text-sm text-[#334155] outline-none placeholder:text-[#94a3b8] focus:border-[#1b6f7b]"
                                      />
                                    ) : (
                                      <>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            if (!row.field) return;
                                            openCustomizeMoreFilterDropdown(
                                              row.id,
                                              "value",
                                            );
                                          }}
                                          disabled={!row.field}
                                          className={`relative flex h-8 w-full items-center overflow-hidden rounded border px-3 pr-9 text-sm outline-none ${
                                            row.field
                                              ? valueMenuOpen
                                                ? "border-[#1b6f7b] bg-white text-[#334155]"
                                                : "border-[#cfd6e4] bg-white text-[#334155] hover:bg-[#f8fafc]"
                                              : "cursor-not-allowed border-[#e2e8f0] bg-[#f8fafc] text-[#94a3b8]"
                                          }`}
                                          aria-haspopup="menu"
                                          aria-expanded={valueMenuOpen}
                                        >
                                          <span
                                            className={`min-w-0 flex-1 truncate text-left ${row.value ? "font-medium" : "text-[#94a3b8]"}`}
                                          >
                                            {valueLabel}
                                          </span>
                                          <ChevronDown
                                            size={14}
                                            className={`pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 transition-transform duration-150 ${
                                              valueMenuOpen
                                                ? "rotate-180 text-[#1b6f7b]"
                                                : row.field
                                                  ? "text-[#64748b]"
                                                  : "text-[#cbd5e1]"
                                            }`}
                                          />
                                        </button>

                                        {valueMenuOpen && row.field ? (
                                          <div className="absolute left-0 top-[calc(100%+6px)] z-50 w-[220px] overflow-hidden rounded-lg border border-[#d7dce7] bg-white shadow-[0_10px_24px_rgba(15,23,42,0.12)]">
                                            <div className="max-h-[220px] overflow-y-auto py-1">
                                              {valueOptions.length > 0 ? (
                                                valueOptions.map((option) => {
                                                  const isSelected =
                                                    row.value === option.key;
                                                  return (
                                                    <button
                                                      key={option.key}
                                                      type="button"
                                                      onClick={() => {
                                                        setCustomizeMoreFilterRows(
                                                          (prev) =>
                                                            prev.map((item) =>
                                                              item.id === row.id
                                                                ? {
                                                                    ...item,
                                                                    value:
                                                                      option.key.startsWith(
                                                                        "select-",
                                                                      )
                                                                        ? ""
                                                                        : option.key,
                                                                  }
                                                                : item,
                                                            ),
                                                        );
                                                        closeCustomizeMoreFilterDropdown();
                                                      }}
                                                      className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm ${
                                                        isSelected
                                                          ? "bg-[#f1f5f9] font-medium text-[#0f172a]"
                                                          : "text-[#334155] hover:bg-[#f8fafc]"
                                                      }`}
                                                    >
                                                      <span>
                                                        {option.label}
                                                      </span>
                                                      {isSelected ? (
                                                        <Check
                                                          size={14}
                                                          className="text-[#64748b]"
                                                        />
                                                      ) : null}
                                                    </button>
                                                  );
                                                })
                                              ) : (
                                                <div className="px-3 py-3 text-sm uppercase tracking-[0.04em] text-[#64748b]">
                                                  No results found
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        ) : null}
                                      </>
                                    )}
                                  </div>

                                  <button
                                    type="button"
                                    onClick={addCustomizeMoreFilterRow}
                                    className="inline-flex h-8 w-8 items-center justify-center rounded border border-[#cfd6e4] text-[#334155] hover:bg-[#f8fafc]"
                                    aria-label="Add filter row"
                                  >
                                    <Plus size={14} />
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setCustomizeMoreFilterRows((prev) =>
                                        prev.length > 1
                                          ? prev.filter(
                                              (item) => item.id !== row.id,
                                            )
                                          : prev,
                                      );
                                      if (
                                        customizeMoreFilterDropdown?.rowId ===
                                        row.id
                                      ) {
                                        closeCustomizeMoreFilterDropdown();
                                      }
                                    }}
                                    className="inline-flex h-8 w-8 items-center justify-center rounded border border-[#cfd6e4] text-[#334155] hover:bg-[#fef2f2]"
                                    aria-label="Remove filter row"
                                  >
                                    <X size={14} className="text-[#ef4444]" />
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        ) : null}

                        <button
                          type="button"
                          onClick={addCustomizeMoreFilterRow}
                          className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-[#1b6f7b] hover:underline"
                        >
                          <Plus size={14} />
                          Add More
                        </button>
                      </section>
                    </div>
                  ) : (
                    <div className="flex min-h-0 flex-col gap-5">
                      <div className="grid grid-cols-[minmax(0,1fr)_56px_minmax(0,1fr)] gap-4">
                        <div>
                          <div className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-[#64748b]">
                            Available Columns
                          </div>
                          <div className="rounded-lg border border-[#d7dce7] bg-white">
                            <div className="border-b border-[#eef2f7] p-2">
                              <div className="relative">
                                <input
                                  value={customizeColumnsSearch}
                                  onChange={(event) =>
                                    setCustomizeColumnsSearch(
                                      event.target.value,
                                    )
                                  }
                                  placeholder="Search"
                                  className="h-9 w-full rounded-md border border-[#d7dce7] bg-white pl-8 pr-3 text-sm text-[#334155] outline-none placeholder:text-[#94a3b8] focus:border-[#1b6f7b]"
                                />
                                <Search
                                  size={14}
                                  className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[#94a3b8]"
                                />
                              </div>
                            </div>

                            <div className="max-h-[440px] overflow-y-auto py-1">
                              {filteredCustomizeGroups.length > 0 ? (
                                filteredCustomizeGroups.map((group) => (
                                  <div key={group.label}>
                                    <div className="px-4 py-2 text-sm font-medium text-[#9aa3b2]">
                                      {group.label}
                                    </div>
                                    <div className="pb-1">
                                      {group.options.map((option) => {
                                        const isActive =
                                          customizeActiveAvailableColumn ===
                                          option.key;
                                        return (
                                          <button
                                            key={option.key}
                                            type="button"
                                            onClick={() =>
                                              setCustomizeActiveAvailableColumn(
                                                option.key,
                                              )
                                            }
                                            className={`flex w-full items-center px-4 py-2 text-left text-sm ${
                                              isActive
                                                ? "bg-[#eef4ff] font-medium text-[#0f172a]"
                                                : "text-[#334155] hover:bg-[#f8fafc]"
                                            }`}
                                          >
                                            {option.label}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <div className="px-4 py-3 text-sm text-[#64748b]">
                                  No results found
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-center">
                          <button
                            type="button"
                            onClick={() => {
                              if (customizeActiveAvailableColumn) {
                                addCustomizeColumn(
                                  customizeActiveAvailableColumn,
                                );
                              }
                            }}
                            disabled={!customizeActiveAvailableColumn}
                            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#8a94c9] bg-white text-[#475569] hover:bg-[#f8fafc] disabled:cursor-not-allowed disabled:opacity-50"
                            aria-label="Add selected column"
                          >
                            <ChevronRight size={18} />
                          </button>
                        </div>

                        <div>
                          <div className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-[#64748b]">
                            Selected Columns
                          </div>
                          <div className="rounded-lg border border-[#d7dce7] bg-white">
                            <div className="max-h-[440px] overflow-y-auto p-3">
                              <div className="space-y-1">
                                {selectedCustomizeColumns.map((option) => (
                                  <div
                                    key={option.key}
                                    className="flex items-center justify-between rounded px-3 py-2 text-sm text-[#334155] hover:bg-[#f8fafc]"
                                  >
                                    <div className="min-w-0">
                                      <div className="truncate">
                                        {option.label}
                                      </div>
                                      <div className="text-xs text-[#94a3b8]">
                                        ({getReportColumnGroupLabel(option.key)}
                                        )
                                      </div>
                                    </div>
                                    {option.locked ? null : (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          removeCustomizeColumn(option.key)
                                        }
                                        className="ml-2 inline-flex h-6 w-6 items-center justify-center rounded text-[#ef4444] hover:bg-[#fef2f2]"
                                        aria-label={`Remove ${option.label}`}
                                      >
                                        <X size={13} />
                                      </button>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </main>
              </div>

              <div className="border-t border-[#eef2f7] px-6 py-4">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      applyCustomizeColumns();
                      refreshReport();
                    }}
                    className="inline-flex h-9 items-center rounded bg-[#1b6f7b] px-4 text-sm font-semibold text-white hover:bg-[#155963]"
                  >
                    Run Report
                  </button>
                  <button
                    type="button"
                    onClick={cancelCustomizeColumns}
                    className="inline-flex h-9 items-center rounded border border-[#d4d9e4] bg-white px-4 text-sm text-[#334155] hover:bg-[#f8fafc]"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <div className="border-b border-[#eef2f7] px-4 py-10 text-center">
          {organizationName ? (
            <p className="text-sm text-[#6b7280]">{organizationName}</p>
          ) : null}
          <h2 className="mt-2 text-[22px] font-semibold text-[#111827]">
            {reportName}
          </h2>
          <p className="mt-1 text-sm text-[#475569]">
            From {formatDate(selectedDateRange.start)} To{" "}
            {formatDate(selectedDateRange.end)}
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse">
            <thead>
              <tr className="border-b border-[#e5e7eb] text-left text-[11px] uppercase tracking-[0.08em] text-[#64748b]">
                {visibleReportColumns.map((column) => (
                  <th
                    key={column.key}
                    className={`px-4 py-3 font-semibold ${
                      column.kind === "text" ? "text-left" : "text-center"
                    }`}
                  >
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isReportLoading ? (
                <tr className="border-b border-[#eef2f7]">
                  <td
                    className="px-4 py-8 text-center text-sm text-[#64748b]"
                    colSpan={visibleReportColumns.length}
                  >
                    Loading report data...
                  </td>
                </tr>
              ) : reportError ? (
                <tr className="border-b border-[#eef2f7]">
                  <td
                    className="px-4 py-8 text-center text-sm text-[#b91c1c]"
                    colSpan={visibleReportColumns.length}
                  >
                    {reportError}
                  </td>
                </tr>
              ) : reportRows.length === 0 ? (
                <tr className="border-b border-[#eef2f7]">
                  <td
                    className="px-4 py-8 text-center text-sm text-[#64748b]"
                    colSpan={visibleReportColumns.length}
                  >
                    No report rows found for the selected filters.
                  </td>
                </tr>
              ) : (
                <>
                  {reportRows.map((row, index) => (
                    <tr
                      key={`${index}-${row.values.name ?? index}`}
                      className="border-b border-[#eef2f7]"
                    >
                      {visibleReportColumns.map((column) => (
                        <td
                          key={column.key}
                          className={`px-4 py-3 text-sm ${
                            column.kind === "text" ? "text-left" : "text-center"
                          } ${column.key === "name" ? "font-medium text-[#2563eb]" : "text-[#2563eb]"}`}
                        >
                          {formatReportColumnValue(
                            column.key,
                            row.values[column.key],
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                  <tr className="border-b border-[#e5e7eb]">
                    {reportColumnTotals.map((value, index) => {
                      const column = visibleReportColumns[index];
                      return (
                        <td
                          key={column.key}
                          className={`px-4 py-3 text-sm ${column.kind === "text" ? "text-left" : "text-center"} ${
                            column.key === "name"
                              ? "font-semibold text-[#111827]"
                              : "text-[#111827]"
                          }`}
                        >
                          {value as React.ReactNode}
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
  );
}

export default function ReportDetailPage() {
  const navigate = useNavigate();
  const { categoryId, reportId } = useParams();
  const category = getCategoryById(categoryId || "");
  const report = getReportById(categoryId || "", reportId || "");
  const [isReportsDrawerOpen, setIsReportsDrawerOpen] = useState(false);
  const [isReportActivityOpen, setIsReportActivityOpen] = useState(false);
  const reportsMenuButtonRef = useRef<HTMLButtonElement | null>(null);

  const dateLabel = useMemo(() => {
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return `From ${formatDate(from)} To ${formatDate(to)}`;
  }, []);

  const [calculatorInputs, setCalculatorInputs] = useState<
    Record<string, number>
  >(() => {
    if (!report?.calculator) return {};
    return report.calculator.fields.reduce(
      (acc, field) => {
        acc[field.key] = field.defaultValue;
        return acc;
      },
      {} as Record<string, number>,
    );
  });

  if (!categoryId || !reportId || !category || !report) {
    return <Navigate to="/reports" replace />;
  }

  const calculatorResult = report.calculator
    ? report.calculator.calculate(calculatorInputs)
    : null;
  const calculatorPrecision = report.calculator?.precision ?? 2;

  if (
    report.id === "sales-by-customer" ||
    report.id === "customer-balance-summary" ||
    report.id === "bad-debts" ||
    report.id === "bank-charges"
  ) {
    return (
      <div className="relative min-h-[calc(100vh-64px)] pt-3">
        <ReportsDrawer
          open={isReportsDrawerOpen}
          currentCategoryId={category.id}
          currentReportId={report.id}
          triggerRef={reportsMenuButtonRef}
          onClose={() => setIsReportsDrawerOpen(false)}
        />
        <ReportActivityDrawer
          open={isReportActivityOpen}
          onClose={() => setIsReportActivityOpen(false)}
        />
        <div
          className={`pr-3 transition-[padding-left,padding-right] duration-200 ${
            isReportsDrawerOpen ? "lg:pl-[260px]" : ""
          } ${isReportActivityOpen ? "lg:pr-[300px]" : ""}`}
        >
          <SalesByCustomerReportView
            key={report.id}
            categoryName={category.name}
            reportName={report.name}
            reportId={report.id as SalesReportId}
            menuButtonRef={reportsMenuButtonRef}
            onMenuClick={() => setIsReportsDrawerOpen((prev) => !prev)}
            onActivityClick={() => setIsReportActivityOpen((prev) => !prev)}
            onClosePage={() => navigate("/reports")}
            onRunReport={() =>
              toast.success(`Report refreshed: ${report.name}`)
            }
          />
        </div>
      </div>
    );
  }

  if (report.id === "sales-by-item") {
    return (
      <div className="relative min-h-[calc(100vh-64px)] pt-3">
        <ReportsDrawer
          open={isReportsDrawerOpen}
          currentCategoryId={category.id}
          currentReportId={report.id}
          triggerRef={reportsMenuButtonRef}
          onClose={() => setIsReportsDrawerOpen(false)}
        />
        <ReportActivityDrawer
          open={isReportActivityOpen}
          onClose={() => setIsReportActivityOpen(false)}
        />
        <div
          className={`pr-3 transition-[padding-left,padding-right] duration-200 ${
            isReportsDrawerOpen ? "lg:pl-[260px]" : ""
          } ${isReportActivityOpen ? "lg:pr-[300px]" : ""}`}
        >
          <SalesByItemReportView
            categoryName={category.name}
            reportName={report.name}
            menuButtonRef={reportsMenuButtonRef}
            onMenuClick={() => setIsReportsDrawerOpen((prev) => !prev)}
            onActivityClick={() => setIsReportActivityOpen((prev) => !prev)}
            onClosePage={() => navigate("/reports")}
            onRunReport={() =>
              toast.success(`Report refreshed: ${report.name}`)
            }
          />
        </div>
      </div>
    );
  }

  if (report.id === "sales-by-sales-person") {
    return (
      <div className="relative min-h-[calc(100vh-64px)] pt-3">
        <ReportsDrawer
          open={isReportsDrawerOpen}
          currentCategoryId={category.id}
          currentReportId={report.id}
          triggerRef={reportsMenuButtonRef}
          onClose={() => setIsReportsDrawerOpen(false)}
        />
        <ReportActivityDrawer
          open={isReportActivityOpen}
          onClose={() => setIsReportActivityOpen(false)}
        />
        <div
          className={`pr-3 transition-[padding-left,padding-right] duration-200 ${
            isReportsDrawerOpen ? "lg:pl-[260px]" : ""
          } ${isReportActivityOpen ? "lg:pr-[300px]" : ""}`}
        >
          <SalesBySalesPersonReportView
            categoryName={category.name}
            reportName={report.name}
            menuButtonRef={reportsMenuButtonRef}
            onMenuClick={() => setIsReportsDrawerOpen((prev) => !prev)}
            onActivityClick={() => setIsReportActivityOpen((prev) => !prev)}
            onClosePage={() => navigate("/reports")}
            onRunReport={() =>
              toast.success(`Report refreshed: ${report.name}`)
            }
          />
        </div>
      </div>
    );
  }

  if (report.id === "payments-received") {
    return (
      <div className="relative min-h-[calc(100vh-64px)] pt-3">
        <ReportsDrawer
          open={isReportsDrawerOpen}
          currentCategoryId={category.id}
          currentReportId={report.id}
          triggerRef={reportsMenuButtonRef}
          onClose={() => setIsReportsDrawerOpen(false)}
        />
        <ReportActivityDrawer
          open={isReportActivityOpen}
          onClose={() => setIsReportActivityOpen(false)}
        />
        <div
          className={`pr-3 transition-[padding-left,padding-right] duration-200 ${
            isReportsDrawerOpen ? "lg:pl-[260px]" : ""
          } ${isReportActivityOpen ? "lg:pr-[300px]" : ""}`}
        >
          <PaymentsReceivedReportView
            categoryName={category.name}
            reportName={report.name}
            menuButtonRef={reportsMenuButtonRef}
            onMenuClick={() => setIsReportsDrawerOpen((prev) => !prev)}
            onActivityClick={() => setIsReportActivityOpen((prev) => !prev)}
            onClosePage={() => navigate("/reports")}
            onRunReport={() =>
              toast.success(`Report refreshed: ${report.name}`)
            }
          />
        </div>
      </div>
    );
  }

  if (report.id === "ar-aging-summary") {
    return <ARAgingSummaryReportPage />;
  }

  if (report.id === "ar-aging-details") {
    return <ARAgingDetailsReportPage />;
  }

  if (report.id === "invoice-details") {
    return <InvoiceDetailsReportPage />;
  }

  if (report.id === "quote-details") {
    return <QuoteDetailsReportPage />;
  }

  return (
    <div className="relative min-h-[calc(100vh-64px)] pt-3">
      <ReportsDrawer
        open={isReportsDrawerOpen}
        currentCategoryId={category.id}
        currentReportId={report.id}
        triggerRef={reportsMenuButtonRef}
        onClose={() => setIsReportsDrawerOpen(false)}
      />

      <div
        className={`pr-3 transition-[padding-left] duration-200 ${isReportsDrawerOpen ? "lg:pl-[260px]" : ""}`}
      >
        <div className="space-y-4">
          <ReportDetailHeader
            categoryName={category.name}
            reportName={report.name}
            dateLabel={dateLabel}
            menuButtonRef={reportsMenuButtonRef}
            onMenuClick={() => setIsReportsDrawerOpen((prev) => !prev)}
            onCustomizeClick={() =>
              toast.info(
                "Customize report columns is available on the detailed report pages.",
              )
            }
            onRunReport={() =>
              toast.success(`Report refreshed: ${report.name}`)
            }
            onClosePage={() => navigate("/reports")}
          />

          <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <div className="rounded-lg border border-[#d7dce7] bg-white p-4 xl:col-span-2">
              <h2 className="text-base font-semibold text-[#0f172a]">
                Report Overview
              </h2>
              <p className="mt-2 text-sm text-[#475569]">{report.summary}</p>

              <h3 className="mt-4 text-sm font-semibold text-[#0f172a]">
                How It Helps
              </h3>
              <p className="mt-1 text-sm text-[#475569]">{report.howItHelps}</p>

              {report.formula ? (
                <>
                  <h3 className="mt-4 text-sm font-semibold text-[#0f172a]">
                    Logic / Formula
                  </h3>
                  <p className="mt-1 rounded border border-[#e2e8f0] bg-[#f8fafc] px-3 py-2 text-sm text-[#1e293b]">
                    {report.formula}
                  </p>
                </>
              ) : null}

              {report.logicNotes?.length ? (
                <>
                  <h3 className="mt-4 text-sm font-semibold text-[#0f172a]">
                    Logic Notes
                  </h3>
                  <ul className="mt-1 space-y-1 text-sm text-[#475569]">
                    {report.logicNotes.map((note) => (
                      <li key={note}>- {note}</li>
                    ))}
                  </ul>
                </>
              ) : null}
            </div>

            <div className="rounded-lg border border-[#d7dce7] bg-white p-4">
              <h2 className="text-base font-semibold text-[#0f172a]">
                Source and Basis
              </h2>
              <div className="mt-3 space-y-2 text-sm">
                <div>
                  <p className="font-medium text-[#334155]">Category</p>
                  <p className="text-[#64748b]">{category.name}</p>
                </div>
                <div>
                  <p className="font-medium text-[#334155]">Accounting Basis</p>
                  <p className="text-[#64748b]">
                    {report.basis || "As configured in report settings"}
                  </p>
                </div>
                <div>
                  <p className="font-medium text-[#334155]">Source</p>
                  <p className="text-[#64748b]">
                    {report.source ||
                      "Entity-specific source based on applied filters"}
                  </p>
                </div>
              </div>
            </div>
          </section>

          {report.calculator ? (
            <section className="rounded-lg border border-[#d7dce7] bg-white p-4">
              <h2 className="text-base font-semibold text-[#0f172a]">
                Logic Check
              </h2>
              <p className="mt-1 text-sm text-[#64748b]">
                Use this calculator to validate the reporting formula with your
                own values.
              </p>
              <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                {report.calculator.fields.map((field) => (
                  <label key={field.key} className="block">
                    <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-[#64748b]">
                      {field.label}
                    </span>
                    <input
                      type="number"
                      value={calculatorInputs[field.key] ?? 0}
                      onChange={(event) => {
                        const value = Number(event.target.value);
                        setCalculatorInputs((prev) => ({
                          ...prev,
                          [field.key]: Number.isFinite(value) ? value : 0,
                        }));
                      }}
                      className="h-9 w-full rounded border border-[#cfd6e4] px-3 text-sm text-[#0f172a] outline-none focus:border-[#1b6f7b]"
                    />
                  </label>
                ))}
              </div>
              <div className="mt-4 rounded border border-[#bfdbfe] bg-[#eff6ff] px-4 py-3">
                <p className="text-xs uppercase tracking-wide text-[#1d4ed8]">
                  {report.calculator.resultLabel}
                </p>
                <p className="text-2xl font-semibold text-[#1e40af]">
                  {(calculatorResult || 0).toFixed(calculatorPrecision)}
                </p>
                {report.calculator.helpText ? (
                  <p className="mt-1 text-xs text-[#1e3a8a]">
                    {report.calculator.helpText}
                  </p>
                ) : null}
              </div>
            </section>
          ) : null}

          <section className="rounded-lg border border-[#d7dce7] bg-white p-4">
            <h2 className="text-base font-semibold text-[#0f172a]">
              Supported Functions
            </h2>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse">
                <thead>
                  <tr className="border-b border-[#e2e8f0] bg-[#f8fafc]">
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-[#64748b]">
                      Function
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-[#64748b]">
                      Support
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {REPORT_FUNCTION_LABELS.map((item) => {
                    const supported = Boolean(report.functionSupport[item.key]);
                    return (
                      <tr key={item.key} className="border-b border-[#eef2f7]">
                        <td className="px-3 py-2 text-sm text-[#334155]">
                          {item.label}
                        </td>
                        <td className="px-3 py-2 text-sm">
                          <span
                            className={
                              supported
                                ? "rounded bg-[#dcfce7] px-2 py-1 text-xs font-semibold text-[#166534]"
                                : "rounded bg-[#f1f5f9] px-2 py-1 text-xs font-semibold text-[#475569]"
                            }
                          >
                            {supported ? "Supported" : "Not Supported"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
