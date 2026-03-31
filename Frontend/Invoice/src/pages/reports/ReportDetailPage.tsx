import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { CalendarDays, Check, ChevronDown, ChevronRight, Columns3, Folder, Menu, Plus, RefreshCw, Search, SlidersHorizontal, X } from "lucide-react";
import ReportDetailHeader from "./ReportDetailHeader";
import { getCategoryById, getReportById, REPORT_FUNCTION_LABELS, REPORTS_BY_CATEGORY } from "./reportsCatalog";

const formatDate = (value: Date) => value.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

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

type MoreFilterComparatorKey = "is-in" | "is-not-in" | "starts-with" | "ends-with" | "contains" | "does-not-contain";

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

const MORE_FILTER_FIELD_OPTIONS: Array<{ key: MoreFilterFieldKey; label: string }> = [
  { key: "customer-name", label: "Customer Name" },
  { key: "currency", label: "Currency" },
  { key: "location", label: "Location" },
];

const MORE_FILTER_FIELD_GROUPS: Array<{ label: string; options: Array<{ key: MoreFilterFieldKey; label: string }> }> = [
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

const MORE_FILTER_COMPARATOR_OPTIONS: Array<{ key: MoreFilterComparatorKey; label: string }> = [
  { key: "is-in", label: "is in" },
  { key: "is-not-in", label: "is not in" },
  { key: "starts-with", label: "starts with" },
  { key: "ends-with", label: "ends with" },
  { key: "contains", label: "contains" },
  { key: "does-not-contain", label: "doesn't contain" },
];

const MORE_FILTER_VALUE_OPTIONS: Record<MoreFilterFieldKey, Array<{ key: string; label: string }>> = {
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

const getMoreFilterFieldLabel = (field: MoreFilterFieldKey | "") => MORE_FILTER_FIELD_OPTIONS.find((option) => option.key === field)?.label ?? "Select a field";

const getMoreFilterComparatorLabel = (comparator: MoreFilterComparatorKey | "") =>
  MORE_FILTER_COMPARATOR_OPTIONS.find((option) => option.key === comparator)?.label ?? "Select a comparator";

const getMoreFilterValuePlaceholder = (field: MoreFilterFieldKey | "") => {
  if (!field) return "Select a value";
  return MORE_FILTER_VALUE_OPTIONS[field]?.[0]?.label ?? "Select a value";
};

const getMoreFilterValueLabel = (field: MoreFilterFieldKey | "", value: string) => {
  if (!field) return "Select a value";
  return MORE_FILTER_VALUE_OPTIONS[field].find((option) => option.key === value)?.label ?? getMoreFilterValuePlaceholder(field);
};

const getCompareWithLabel = (key: CompareWithKey) => COMPARE_WITH_OPTIONS.find((option) => option.key === key)?.label ?? "None";

const getReportColumnOption = (key: ReportColumnKey) => REPORT_COLUMN_GROUPS.flatMap((group) => group.options).find((option) => option.key === key)!;

const getReportColumnLabel = (key: ReportColumnKey) => getReportColumnOption(key).label;

const getReportColumnGroupLabel = (key: ReportColumnKey) => {
  const group = REPORT_COLUMN_GROUPS.find((section) => section.options.some((option) => option.key === key));
  return group?.label ?? "Reports";
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

const COMPARE_WITH_NUMBER_OPTIONS = Array.from({ length: 35 }, (_, index) => String(index + 1));

type ReportColumnKey = string;
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

const REPORT_COLUMN_GROUPS: ReportColumnGroup[] = [
  {
    label: "Reports",
    options: [
      { key: "name", label: "Name", kind: "text", locked: true },
      { key: "invoice-count", label: "Invoice Count", kind: "number" },
      { key: "sales", label: "Sales", kind: "currency" },
      { key: "sales-with-tax", label: "Sales With Tax", kind: "currency" },
      { key: "sales-without-discount", label: "Sales Without Discount", kind: "currency" },
      { key: "sales-fcy", label: "Sales(FCY)", kind: "currency" },
      { key: "sales-with-tax-fcy", label: "Sales With Tax(FCY)", kind: "currency" },
      { key: "sales-without-discount-fcy", label: "Sales Without Discount (FCY)", kind: "currency" },
      { key: "invoice-amount", label: "Invoice Amount", kind: "currency" },
      { key: "invoice-amount-fcy", label: "Invoice Amount (FCY)", kind: "currency" },
      { key: "credit-note-amount", label: "Credit Note Amount", kind: "currency" },
      { key: "credit-note-amount-fcy", label: "Credit Note Amount (FCY)", kind: "currency" },
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
      { key: "unused-credits-fcy", label: "Unused Credits (FCY)", kind: "currency" },
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

const getStartOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

const getEndOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

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

const getDateRangeValue = (key: DateRangeKey, referenceDate = new Date()): DateRangeValue => {
  const today = getStartOfDay(referenceDate);

  switch (key) {
    case "today":
      return { start: today, end: getEndOfDay(referenceDate) };
    case "this-week":
      return { start: getStartOfWeek(referenceDate), end: getEndOfWeek(referenceDate) };
    case "this-month":
      return { start: new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1), end: new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 1, 0) };
    case "this-quarter": {
      const quarterIndex = Math.floor(referenceDate.getMonth() / 3);
      return getQuarterBounds(referenceDate.getFullYear(), quarterIndex);
    }
    case "this-year":
      return { start: new Date(referenceDate.getFullYear(), 0, 1), end: new Date(referenceDate.getFullYear(), 11, 31) };
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
      const previousMonthEnd = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 0);
      const previousMonthStart = new Date(previousMonthEnd.getFullYear(), previousMonthEnd.getMonth(), 1);
      return { start: previousMonthStart, end: previousMonthEnd };
    }
    case "previous-quarter": {
      const currentQuarterIndex = Math.floor(referenceDate.getMonth() / 3);
      const previousQuarterIndex = (currentQuarterIndex + 3) % 4;
      const previousQuarterYear = currentQuarterIndex === 0 ? referenceDate.getFullYear() - 1 : referenceDate.getFullYear();
      return getQuarterBounds(previousQuarterYear, previousQuarterIndex);
    }
    case "previous-year":
      return { start: new Date(referenceDate.getFullYear() - 1, 0, 1), end: new Date(referenceDate.getFullYear() - 1, 11, 31) };
    case "custom":
      return { start: today, end: today };
    default:
      return { start: today, end: today };
  }
};

type SalesByCustomerRow = {
  values: Partial<Record<ReportColumnKey, string | number>>;
};

const SALES_BY_CUSTOMER_ROWS: SalesByCustomerRow[] = [
  {
    values: {
      name: "ss",
      "invoice-count": 2,
      sales: 44,
      "sales-with-tax": 44,
      "sales-without-discount": 44,
      currency: "SOS",
      location: "Mogadishu",
      "customer-id": "CUST-001",
      "company-name": "ss Trading",
      "customer-number": "1001",
      "first-name": "Sam",
      "last-name": "Sheikh",
    },
  },
];

const formatCurrency = (value: number, currency = "SOS") => `${currency}${value.toFixed(2)}`;

type ReportsDrawerSection = {
  id: string;
  label: string;
  reportIds: string[];
};

const REPORTS_DRAWER_SECTIONS: ReportsDrawerSection[] = [
  { id: "sales", label: "Sales", reportIds: ["sales-by-customer", "sales-by-item", "sales-by-sales-person"] },
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
    reportIds: ["payments-received", "time-to-get-paid", "credit-note-details", "refund-history", "withholding-tax"],
  },
  { id: "subscriptions", label: "Recurring Invoices", reportIds: ["subscription-details"] },
  {
    id: "purchases-expenses",
    label: "Purchases and Expenses",
    reportIds: ["expense-details", "expenses-by-category", "expenses-by-customer", "expenses-by-project", "billable-expense-details"],
  },
  { id: "taxes", label: "Taxes", reportIds: ["tax-summary", "tds-receivables"] },
  {
    id: "projects-timesheets",
    label: "Projects and Timesheet",
    reportIds: ["timesheet-details", "project-summary", "project-details", "projects-revenue-summary"],
  },
  {
    id: "activity",
    label: "Activity",
    reportIds: ["system-mails", "activity-logs-audit-trail", "exception-report", "portal-activities", "customer-reviews"],
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
  const [expandedSections, setExpandedSections] = useState<string[]>([currentCategoryId]);

  useEffect(() => {
    setExpandedSections((prev) => (prev.includes(currentCategoryId) ? prev : [currentCategoryId]));
  }, [currentCategoryId]);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!drawerRef.current?.contains(target) && !triggerRef.current?.contains(target)) {
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
        ? reports.filter((report) => report.name.toLowerCase().includes(query) || section.label.toLowerCase().includes(query))
        : reports;

      return { ...section, reports: filteredReports };
    }).filter((section) => section.reports.length > 0);
  }, [search]);

  if (!open) return null;

  const isSearching = search.trim().length > 0;

  return (
    <div ref={drawerRef} className="absolute left-0 top-0 z-30 h-full w-[260px] overflow-hidden border-r border-[#e5e7eb] bg-white shadow-[8px_0_20px_rgba(15,23,42,0.08)]">
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b border-[#eef2f7] px-4 py-3">
          <div className="text-[18px] font-semibold text-[#0f172a]">Reports</div>
          <button type="button" onClick={onClose} className="inline-flex h-7 w-7 items-center justify-center text-[#ef4444] hover:bg-[#fef2f2]" aria-label="Close reports drawer">
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
          <div className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#64748b]">All Reports</div>

          {sections.length > 0 ? (
            <div className="space-y-1">
              {sections.map((section) => {
                const expanded = isSearching || expandedSections.includes(section.id);

                return (
                  <div key={section.id}>
                    <button
                      type="button"
                      onClick={() => {
                        if (isSearching) return;
                        setExpandedSections((prev) => (prev.includes(section.id) ? [] : [section.id]));
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
                                isActive ? "bg-[#eef4ff] font-medium text-[#111827]" : "text-[#111827] hover:text-black"
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
            <div className="px-2 py-4 text-sm text-[#64748b]">No reports found.</div>
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
          <div className="text-[18px] font-semibold text-[#0f172a]">Report Activity</div>
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
  menuButtonRef,
  onMenuClick,
  onRunReport,
  onActivityClick,
  onClosePage,
}: {
  categoryName: string;
  reportName: string;
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
  const [dateRangeKey, setDateRangeKey] = useState<DateRangeKey>("this-week");
  const [isDateRangeOpen, setIsDateRangeOpen] = useState(false);
  const [entityKeys, setEntityKeys] = useState<EntityKey[]>([]);
  const [isEntityOpen, setIsEntityOpen] = useState(false);
  const [entitySearch, setEntitySearch] = useState("");
  const [compareWithKey, setCompareWithKey] = useState<CompareWithKey>("none");
  const [compareWithDraftKey, setCompareWithDraftKey] = useState<CompareWithKey>("none");
  const [isCompareWithOpen, setIsCompareWithOpen] = useState(false);
  const [isCompareWithSelectOpen, setIsCompareWithSelectOpen] = useState(false);
  const [compareWithSearch, setCompareWithSearch] = useState("");
  const [compareWithCount, setCompareWithCount] = useState(1);
  const [compareWithDraftCount, setCompareWithDraftCount] = useState(1);
  const [compareWithArrangeLatest, setCompareWithArrangeLatest] = useState(false);
  const [compareWithDraftArrangeLatest, setCompareWithDraftArrangeLatest] = useState(false);
  const [isCompareWithCountOpen, setIsCompareWithCountOpen] = useState(false);
  const [compareWithCountSearch, setCompareWithCountSearch] = useState("");
  const [isCustomizeColumnsOpen, setIsCustomizeColumnsOpen] = useState(false);
  const [customizeColumnsSearch, setCustomizeColumnsSearch] = useState("");
  const [selectedReportColumns, setSelectedReportColumns] = useState<ReportColumnKey[]>([
    "name",
    "invoice-count",
    "sales",
    "sales-with-tax",
  ]);
  const [customizeDraftSelectedColumns, setCustomizeDraftSelectedColumns] = useState<ReportColumnKey[]>([
    "name",
    "invoice-count",
    "sales",
    "sales-with-tax",
  ]);
  const [customizeActiveAvailableColumn, setCustomizeActiveAvailableColumn] = useState<ReportColumnKey | "">("");
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isMoreFiltersOpen, setIsMoreFiltersOpen] = useState(false);
  const [moreFilterDropdown, setMoreFilterDropdown] = useState<MoreFilterDropdownState>(null);
  const [moreFilterRows, setMoreFilterRows] = useState<MoreFilterRow[]>([
    { id: "more-filter-1", field: "", comparator: "", value: "" },
  ]);
  const selectedDateRange = getDateRangeValue(dateRangeKey);
  const dateRangeLabel = DATE_RANGE_OPTIONS.find((option) => option.key === dateRangeKey)?.label ?? "Today";
  const selectedEntityLabels = ENTITY_OPTIONS.filter((option) => entityKeys.includes(option.key)).map((option) => option.label);
  const entityLabel = selectedEntityLabels.length > 0 ? selectedEntityLabels.join(", ") : "None";
  useEffect(() => {
    if (!isDateRangeOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!dateRangeRef.current?.contains(target)) {
        setIsDateRangeOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsDateRangeOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isDateRangeOpen]);

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
        setIsCustomizeColumnsOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isCustomizeColumnsOpen]);

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
    return ENTITY_OPTIONS.filter((option) => option.label.toLowerCase().includes(query));
  }, [entitySearch]);

  const filteredCompareWithOptions = useMemo(() => {
    const query = compareWithSearch.trim().toLowerCase();
    return COMPARE_WITH_OPTIONS.filter((option) => option.key !== "none" && option.label.toLowerCase().includes(query));
  }, [compareWithSearch]);

  const selectedCustomizeColumns = useMemo(
    () => customizeDraftSelectedColumns.map((key) => getReportColumnOption(key)),
    [customizeDraftSelectedColumns]
  );

  const filteredCustomizeGroups = useMemo(() => {
    const query = customizeColumnsSearch.trim().toLowerCase();
    return REPORT_COLUMN_GROUPS.map((group) => ({
      label: group.label,
      options: group.options.filter((option) => {
        if (customizeDraftSelectedColumns.includes(option.key)) return false;
        if (!query) return true;
        return option.label.toLowerCase().includes(query) || group.label.toLowerCase().includes(query);
      }),
    })).filter((group) => group.options.length > 0);
  }, [customizeColumnsSearch, customizeDraftSelectedColumns]);

  const visibleReportColumns = useMemo(() => selectedReportColumns.map((key) => getReportColumnOption(key)), [selectedReportColumns]);

  const reportCurrency = String(SALES_BY_CUSTOMER_ROWS[0]?.values.currency ?? "SOS");

  const formatReportColumnValue = (key: ReportColumnKey, value: string | number | undefined) => {
    if (value === undefined || value === null || value === "") return "—";
    const option = getReportColumnOption(key);
    if (option.kind === "currency" && typeof value === "number") return formatCurrency(value, reportCurrency);
    return String(value);
  };

  const reportColumnTotals = useMemo(
    () =>
      visibleReportColumns.map((option) => {
        if (option.key === "name") return "Total";
        const total = SALES_BY_CUSTOMER_ROWS.reduce((sum, row) => {
          const value = row.values[option.key];
          return typeof value === "number" ? sum + value : sum;
        }, 0);
        if (option.kind === "number") return total;
        if (option.kind === "currency") return formatCurrency(total, reportCurrency);
        return "";
      }),
    [reportCurrency, visibleReportColumns]
  );

  const closeAllOpenPanels = () => {
    setIsCompareWithOpen(false);
    setIsCompareWithSelectOpen(false);
    setIsCompareWithCountOpen(false);
    setIsExportOpen(false);
    setIsCustomizeColumnsOpen(false);
    setIsMoreFiltersOpen(false);
    setIsEntityOpen(false);
    setIsDateRangeOpen(false);
    closeMoreFilterDropdown();
  };

  const hasMoreFilters = moreFilterRows.some((row) => row.field || row.comparator || row.value.trim());
  const getFilteredFieldGroups = (query: string) => {
    const normalizedQuery = query.trim().toLowerCase();
    return MORE_FILTER_FIELD_GROUPS.map((group) => {
      const options = group.options.filter((option) => option.label.toLowerCase().includes(normalizedQuery));
      return { ...group, options };
    }).filter((group) => group.options.length > 0);
  };

  const getFilteredComparatorOptions = (query: string) => {
    const normalizedQuery = query.trim().toLowerCase();
    return MORE_FILTER_COMPARATOR_OPTIONS.filter((option) => option.label.toLowerCase().includes(normalizedQuery));
  };

  const filteredCompareWithNumberOptions = useMemo(() => {
    const query = compareWithCountSearch.trim().toLowerCase();
    return COMPARE_WITH_NUMBER_OPTIONS.filter((option) => option.includes(query));
  }, [compareWithCountSearch]);

  const handleExportAction = (label: string) => {
    setIsExportOpen(false);
    toast.success(`Export option selected: ${label}`);
  };

  const openCustomizeColumnsModal = () => {
    setCustomizeDraftSelectedColumns(selectedReportColumns);
    setCustomizeColumnsSearch("");
    setCustomizeActiveAvailableColumn("");
    setIsCompareWithOpen(false);
    setIsCompareWithSelectOpen(false);
    setIsExportOpen(false);
    setIsCustomizeColumnsOpen(true);
  };

  const applyCustomizeColumns = () => {
    const nextColumns = customizeDraftSelectedColumns.includes("name")
      ? customizeDraftSelectedColumns
      : ["name", ...customizeDraftSelectedColumns];
    setSelectedReportColumns(nextColumns);
    setIsCustomizeColumnsOpen(false);
  };

  const cancelCustomizeColumns = () => {
    setCustomizeDraftSelectedColumns(selectedReportColumns);
    setCustomizeColumnsSearch("");
    setCustomizeActiveAvailableColumn("");
    setIsCustomizeColumnsOpen(false);
  };

  const addCustomizeColumn = (key: ReportColumnKey) => {
    setCustomizeDraftSelectedColumns((prev) => (prev.includes(key) ? prev : [...prev, key]));
    setCustomizeActiveAvailableColumn("");
  };

  const removeCustomizeColumn = (key: ReportColumnKey) => {
    if (key === "name") return;
    setCustomizeDraftSelectedColumns((prev) => prev.filter((item) => item !== key));
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

  const openMoreFilterDropdown = (rowId: string, kind: "field" | "comparator" | "value") => {
    setMoreFilterDropdown((prev) => (prev?.rowId === rowId && prev.kind === kind ? null : { rowId, kind, search: "" }));
  };

  const closeMoreFilterDropdown = () => setMoreFilterDropdown(null);

  const addMoreFilterRow = () => {
    const newRowId = `more-filter-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    setMoreFilterRows((prev) => [...prev, { id: newRowId, field: "", comparator: "", value: "" }]);
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
            <p className="text-sm font-medium text-[#2563eb]">{categoryName}</p>
            <h1 className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-1 text-[24px] font-semibold leading-tight text-[#0f172a]">
              <span>{reportName}</span>
              <span className="text-sm font-normal text-[#475569]">
                - From {formatDate(selectedDateRange.start)} To {formatDate(selectedDateRange.end)}
              </span>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button type="button" className="inline-flex h-9 w-9 items-center justify-center rounded border border-[#d4d9e4] text-[#334155] hover:bg-[#f8fafc]">
            <SlidersHorizontal size={15} />
          </button>
          <div ref={exportRef} className="relative">
            <button
              type="button"
              onClick={() => setIsExportOpen((prev) => !prev)}
              className={`inline-flex h-9 items-center gap-1 rounded border bg-white px-3 text-sm font-medium text-[#1e293b] hover:bg-[#f8fafc] ${
                isExportOpen ? "border-[#7aa7ff]" : "border-[#d4d9e4]"
              }`}
              aria-haspopup="menu"
              aria-expanded={isExportOpen}
            >
              Export <ChevronDown size={14} className={`transition-transform duration-150 ${isExportOpen ? "rotate-180" : ""}`} />
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

      <div ref={moreFiltersRef} className="relative flex flex-wrap items-center gap-2 border-b border-[#e6e9f0] pb-3 text-sm">
        <span className="text-[#334155]">Filters :</span>
        <div ref={dateRangeRef} className="relative">
          <button
            type="button"
            onClick={() => setIsDateRangeOpen((prev) => !prev)}
            className={`inline-flex h-8 items-center gap-1 rounded border px-3 text-sm text-[#334155] hover:bg-white ${
              isDateRangeOpen ? "border-[#7aa7ff] bg-white" : "border-[#cfd6e4] bg-[#f8fafc]"
            }`}
            aria-haspopup="menu"
            aria-expanded={isDateRangeOpen}
          >
            <CalendarDays size={14} className="text-[#64748b]" />
            Date Range : <span className="font-medium">{dateRangeLabel}</span> <ChevronDown size={14} />
          </button>

          {isDateRangeOpen ? (
            <div className="absolute left-0 top-[calc(100%+6px)] z-40 w-[165px] overflow-hidden rounded-lg border border-[#d7dce7] bg-white shadow-[0_10px_24px_rgba(15,23,42,0.12)]">
              <div className="max-h-[280px] overflow-y-auto py-1">
                {DATE_RANGE_OPTIONS.map((option) => {
                  const isSelected = option.key === dateRangeKey;
                  return (
                    <button
                      key={option.key}
                      type="button"
                      onClick={() => {
                        setDateRangeKey(option.key);
                        setIsDateRangeOpen(false);
                      }}
                      className={`flex w-full items-center justify-between px-4 py-2 text-left text-sm ${
                        isSelected ? "font-medium text-[#0f172a]" : "text-[#334155] hover:bg-[#f8fafc]"
                      }`}
                    >
                      <span>{option.label}</span>
                      {isSelected ? <Check size={14} className="text-[#0f172a]" /> : null}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>
        <div ref={entityRef} className="relative inline-flex">
          <button
            type="button"
            onClick={() => setIsEntityOpen((prev) => !prev)}
            className={`relative inline-flex h-8 w-[184px] items-center overflow-hidden rounded border px-3 pr-12 text-sm text-[#334155] hover:bg-white ${
              isEntityOpen ? "border-[#7aa7ff] bg-white" : "border-[#cfd6e4] bg-[#f8fafc]"
            }`}
            aria-haspopup="menu"
            aria-expanded={isEntityOpen}
          >
            <span className="shrink-0 whitespace-nowrap">Entities :</span>
            <span className="min-w-0 flex-1 truncate text-left font-medium whitespace-nowrap">{entityLabel}</span>
            <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#334155]" />
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
                    className="h-9 w-full rounded-md border border-[#7aa7ff] bg-white pl-8 pr-3 text-sm text-[#334155] outline-none placeholder:text-[#94a3b8]"
                  />
                  <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
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
                            prev.includes(option.key) ? prev.filter((key) => key !== option.key) : [...prev, option.key]
                          );
                        }}
                        className={`flex w-full items-center gap-2 px-4 py-2 text-left text-sm ${
                          isSelected ? "bg-[#f1f5f9] font-medium text-[#0f172a]" : "text-[#334155] hover:bg-[#f8fafc]"
                        }`}
                      >
                        <span className="inline-flex h-4 w-4 items-center justify-center rounded border border-[#c7d0de] bg-white">
                          {isSelected ? <Check size={12} className="text-[#0f172a]" /> : null}
                        </span>
                        <span>{option.label}</span>
                      </button>
                    );
                  })
                ) : (
                  <div className="px-4 py-3 text-sm text-[#64748b]">No results.</div>
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
            isMoreFiltersOpen || hasMoreFilters ? "border-[#7aa7ff] bg-white" : "border-[#cfd6e4] bg-white"
          }`}
        >
          <Plus size={14} className="text-[#2563eb]" /> More Filters
        </button>

        {isMoreFiltersOpen ? (
          <div className="absolute left-0 top-[calc(100%+10px)] z-40 w-[720px] rounded-lg border border-[#d7dce7] bg-white shadow-[0_10px_24px_rgba(15,23,42,0.12)]">
            <div className="px-4 py-4">
              <div className="space-y-3">
                {moreFilterRows.map((row, index) => {
                  const activeDropdown = moreFilterDropdown?.rowId === row.id ? moreFilterDropdown : null;
                  const fieldMenuOpen = activeDropdown?.kind === "field";
                  const comparatorMenuOpen = activeDropdown?.kind === "comparator";
                  const valueMenuOpen = activeDropdown?.kind === "value";
                  const fieldMenuSearch = fieldMenuOpen ? activeDropdown.search : "";
                  const comparatorMenuSearch = comparatorMenuOpen ? activeDropdown.search : "";
                  const filteredFieldGroups = getFilteredFieldGroups(fieldMenuSearch);
                  const filteredComparatorOptions = getFilteredComparatorOptions(comparatorMenuSearch);
                  const valueOptions = row.field ? MORE_FILTER_VALUE_OPTIONS[row.field] : [];
                  const fieldLabel = getMoreFilterFieldLabel(row.field);
                  const comparatorLabel = getMoreFilterComparatorLabel(row.comparator);
                  const valueLabel = row.value ? getMoreFilterValueLabel(row.field, row.value) : getMoreFilterValuePlaceholder(row.field);

                  return (
                    <div key={row.id} className="grid grid-cols-[42px_1fr_1fr_1.4fr_auto_auto] items-start gap-3">
                      <div className="flex h-10 items-center justify-center rounded border border-[#d7dce7] bg-[#f8fafc] text-sm text-[#475569]">
                        {index + 1}
                      </div>

                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => openMoreFilterDropdown(row.id, "field")}
                          className={`relative flex h-10 w-full items-center overflow-hidden rounded border px-3 pr-10 text-sm text-[#334155] outline-none ${
                            fieldMenuOpen ? "border-[#7aa7ff] bg-white" : "border-[#cfd6e4] bg-white hover:bg-[#f8fafc]"
                          }`}
                          aria-haspopup="menu"
                          aria-expanded={fieldMenuOpen}
                        >
                          <span className={`min-w-0 flex-1 truncate text-left ${row.field ? "font-medium" : "text-[#94a3b8]"}`}>
                            {fieldLabel}
                          </span>
                          <ChevronDown
                            size={14}
                            className={`pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 transition-transform duration-150 ${
                              fieldMenuOpen ? "rotate-180 text-[#2563eb]" : "text-[#64748b]"
                            }`}
                          />
                        </button>

                        {row.field ? (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              setMoreFilterRows((prev) =>
                                prev.map((item) => (item.id === row.id ? { ...item, field: "", comparator: "", value: "" } : item))
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
                                    setMoreFilterDropdown((prev) => (prev ? { ...prev, search: event.target.value } : prev))
                                  }
                                  placeholder="Search"
                                  className="h-9 w-full rounded-md border border-[#7aa7ff] bg-white pl-8 pr-3 text-sm text-[#334155] outline-none placeholder:text-[#94a3b8]"
                                />
                                <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
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
                                        const isSelected = row.field === option.key;
                                        return (
                                          <button
                                            key={option.key}
                                            type="button"
                                            onClick={() => {
                                              setMoreFilterRows((prev) =>
                                                prev.map((item) =>
                                                  item.id === row.id
                                                    ? { ...item, field: option.key, comparator: "", value: "" }
                                                    : item
                                                )
                                              );
                                              closeMoreFilterDropdown();
                                            }}
                                            className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm ${
                                              isSelected ? "bg-[#2f80ed] font-medium text-white" : "text-[#334155] hover:bg-[#f8fafc]"
                                            }`}
                                          >
                                            <span>{option.label}</span>
                                            {isSelected ? <Check size={14} className="text-white" /> : null}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <div className="px-3 py-3 text-sm uppercase tracking-[0.04em] text-[#64748b]">No results found</div>
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
                          className={`relative flex h-10 w-full items-center overflow-hidden rounded border px-3 pr-9 text-sm text-[#334155] outline-none ${
                            row.field
                              ? comparatorMenuOpen
                                ? "border-[#7aa7ff] bg-white"
                                : "border-[#cfd6e4] bg-white hover:bg-[#f8fafc]"
                              : "cursor-not-allowed border-[#e2e8f0] bg-[#f8fafc] text-[#94a3b8]"
                          }`}
                          aria-haspopup="menu"
                          aria-expanded={comparatorMenuOpen}
                        >
                          <span className={`min-w-0 flex-1 truncate text-left ${row.field && row.comparator ? "font-medium" : "text-[#94a3b8]"}`}>
                            {comparatorLabel}
                          </span>
                          <ChevronDown
                            size={14}
                            className={`pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 transition-transform duration-150 ${
                              comparatorMenuOpen
                                ? "rotate-180 text-[#2563eb]"
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
                                    setMoreFilterDropdown((prev) => (prev ? { ...prev, search: event.target.value } : prev))
                                  }
                                  placeholder="Search"
                                  className="h-9 w-full rounded-md border border-[#7aa7ff] bg-white pl-8 pr-3 text-sm text-[#334155] outline-none placeholder:text-[#94a3b8]"
                                />
                                <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
                              </div>
                            </div>

                            <div className="max-h-[220px] overflow-y-auto py-1">
                              {filteredComparatorOptions.length > 0 ? (
                                filteredComparatorOptions.map((option) => {
                                  const isSelected = row.comparator === option.key;
                                  return (
                                    <button
                                      key={option.key}
                                      type="button"
                                      onClick={() => {
                                        setMoreFilterRows((prev) =>
                                          prev.map((item) => (item.id === row.id ? { ...item, comparator: option.key } : item))
                                        );
                                        closeMoreFilterDropdown();
                                      }}
                                      className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm ${
                                        isSelected ? "bg-[#2f80ed] font-medium text-white" : "text-[#334155] hover:bg-[#f8fafc]"
                                      }`}
                                    >
                                      <span>{option.label}</span>
                                      {isSelected ? <Check size={14} className="text-white" /> : null}
                                    </button>
                                  );
                                })
                              ) : (
                                <div className="px-3 py-3 text-sm uppercase tracking-[0.04em] text-[#64748b]">No results found</div>
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
                            openMoreFilterDropdown(row.id, "value");
                          }}
                          disabled={!row.field}
                          className={`relative flex h-10 w-full items-center overflow-hidden rounded border px-3 pr-9 text-sm outline-none ${
                            row.field
                              ? valueMenuOpen
                                ? "border-[#7aa7ff] bg-white text-[#334155]"
                                : "border-[#cfd6e4] bg-white text-[#334155] hover:bg-[#f8fafc]"
                              : "cursor-not-allowed border-[#e2e8f0] bg-[#f8fafc] text-[#94a3b8]"
                          }`}
                          aria-haspopup="menu"
                          aria-expanded={valueMenuOpen}
                        >
                          <span className={`min-w-0 flex-1 truncate text-left ${row.value ? "font-medium" : "text-[#94a3b8]"}`}>
                            {valueLabel}
                          </span>
                          <ChevronDown
                            size={14}
                            className={`pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 transition-transform duration-150 ${
                              valueMenuOpen ? "rotate-180 text-[#2563eb]" : row.field ? "text-[#64748b]" : "text-[#cbd5e1]"
                            }`}
                          />
                        </button>

                        {valueMenuOpen && row.field ? (
                          <div className="absolute left-0 top-[calc(100%+6px)] z-50 w-[220px] overflow-hidden rounded-lg border border-[#d7dce7] bg-white shadow-[0_10px_24px_rgba(15,23,42,0.12)]">
                            <div className="max-h-[220px] overflow-y-auto py-1">
                              {valueOptions.length > 0 ? (
                                valueOptions.map((option) => {
                                  const isSelected = row.value === option.key;
                                  return (
                                    <button
                                      key={option.key}
                                      type="button"
                                      onClick={() => {
                                        setMoreFilterRows((prev) =>
                                          prev.map((item) =>
                                            item.id === row.id
                                              ? { ...item, value: option.key.startsWith("select-") ? "" : option.key }
                                              : item
                                          )
                                        );
                                        closeMoreFilterDropdown();
                                      }}
                                      className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm ${
                                        isSelected ? "bg-[#2f80ed] font-medium text-white" : "text-[#334155] hover:bg-[#f8fafc]"
                                      }`}
                                    >
                                      <span>{option.label}</span>
                                      {isSelected ? <Check size={14} className="text-white" /> : null}
                                    </button>
                                  );
                                })
                              ) : (
                                <div className="px-3 py-3 text-sm uppercase tracking-[0.04em] text-[#64748b]">No results found</div>
                              )}
                            </div>
                          </div>
                        ) : null}
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
                          setMoreFilterRows((prev) => (prev.length > 1 ? prev.filter((item) => item.id !== row.id) : prev));
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
                  className="inline-flex items-center gap-1 text-sm font-medium text-[#2563eb] hover:underline"
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
                  onRunReport();
                }}
                className="inline-flex h-9 items-center rounded bg-[#7aa7ff] px-4 text-sm font-semibold text-white hover:bg-[#6498ff]"
              >
                Run Report
              </button>
              <button
                type="button"
                onClick={() => {
                  setMoreFilterRows([{ id: "more-filter-1", field: "", comparator: "", value: "" }]);
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
          onClick={onRunReport}
          className="inline-flex h-8 items-center gap-1 rounded bg-[#7aa7ff] px-4 text-sm font-semibold text-white hover:bg-[#6498ff]"
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
              Compare With : <span className="font-semibold text-[#0f172a]">{getCompareWithLabel(compareWithKey)}</span>
              <ChevronDown size={14} className={`transition-transform duration-150 ${isCompareWithOpen ? "rotate-180" : ""}`} />
            </button>

            {isCompareWithOpen ? (
              <div className="absolute right-0 top-[calc(100%+6px)] z-50 w-[252px] overflow-visible rounded-lg border border-[#d7dce7] bg-white shadow-[0_10px_24px_rgba(15,23,42,0.12)]">
                <div className="border-b border-[#eef2f7] px-4 py-3 text-sm font-medium text-[#0f172a]">Compare With</div>
                <div className="p-3">
                  <button
                    type="button"
                    onClick={() => setIsCompareWithSelectOpen((prev) => !prev)}
                    className="relative flex h-10 w-full items-center justify-between rounded border border-[#7aa7ff] bg-white px-3 pr-9 text-sm text-[#334155] outline-none hover:bg-[#f8fafc]"
                    aria-haspopup="menu"
                    aria-expanded={isCompareWithSelectOpen}
                  >
                    <span className="min-w-0 truncate">{getCompareWithLabel(compareWithDraftKey)}</span>
                    <ChevronDown
                      size={14}
                      className={`pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 transition-transform duration-150 ${
                        isCompareWithSelectOpen ? "rotate-180 text-[#2563eb]" : "text-[#64748b]"
                      }`}
                    />
                  </button>

                  {isCompareWithSelectOpen ? (
                    <div className="mt-2 overflow-hidden rounded-lg border border-[#d7dce7] bg-white shadow-[0_10px_24px_rgba(15,23,42,0.12)]">
                      <div className="border-b border-[#eef2f7] p-2">
                        <div className="relative">
                          <input
                            value={compareWithSearch}
                            onChange={(event) => setCompareWithSearch(event.target.value)}
                            placeholder="Search"
                            className="h-9 w-full rounded-md border border-[#7aa7ff] bg-white pl-8 pr-3 text-sm text-[#334155] outline-none placeholder:text-[#94a3b8]"
                          />
                          <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
                        </div>
                      </div>

                      <div className="max-h-[180px] overflow-y-auto py-1">
                        {filteredCompareWithOptions.length > 0 ? (
                          filteredCompareWithOptions.map((option) => {
                            const isSelected = compareWithDraftKey === option.key;
                            return (
                              <button
                                key={option.key}
                                type="button"
                                onClick={() => {
                                  setCompareWithDraftKey(option.key);
                                  setIsCompareWithSelectOpen(false);
                                }}
                                className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm ${
                                  isSelected ? "font-medium text-[#0f172a]" : "text-[#334155] hover:bg-[#f8fafc]"
                                }`}
                              >
                                <span>{option.label}</span>
                                {isSelected ? <Check size={14} className="text-[#64748b]" /> : null}
                              </button>
                            );
                          })
                        ) : (
                          <div className="px-3 py-3 text-sm uppercase tracking-[0.04em] text-[#64748b]">No results found</div>
                        )}
                      </div>
                    </div>
                  ) : null}

                  {compareWithDraftKey !== "none" ? (
                    <div className="mt-3">
                      <div className="mb-2 text-sm text-[#334155]">
                        {compareWithDraftKey === "previous-years" ? "Number of Year(s)" : "Number of Period(s)"}
                      </div>
                      <div ref={compareWithCountRef} className="relative">
                        <button
                          type="button"
                          onClick={() => setIsCompareWithCountOpen((prev) => !prev)}
                          className="relative flex h-10 w-full items-center justify-between rounded border border-[#7aa7ff] bg-white px-3 pr-9 text-sm text-[#334155] outline-none hover:bg-[#f8fafc]"
                          aria-haspopup="menu"
                          aria-expanded={isCompareWithCountOpen}
                        >
                          <span className="min-w-0 truncate">{compareWithDraftCount}</span>
                          <ChevronDown
                            size={14}
                            className={`pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 transition-transform duration-150 ${
                              isCompareWithCountOpen ? "rotate-180 text-[#2563eb]" : "text-[#64748b]"
                            }`}
                          />
                        </button>

                        {isCompareWithCountOpen ? (
                          <div className="absolute left-0 top-[calc(100%+6px)] z-[80] w-[168px] overflow-hidden rounded-lg border border-[#d7dce7] bg-white shadow-[0_10px_24px_rgba(15,23,42,0.12)]">
                            <div className="border-b border-[#eef2f7] p-2">
                              <div className="relative">
                                <input
                                  value={compareWithCountSearch}
                                  onChange={(event) => setCompareWithCountSearch(event.target.value)}
                                  placeholder="Search"
                                  className="h-9 w-full rounded-md border border-[#7aa7ff] bg-white pl-8 pr-3 text-sm text-[#334155] outline-none placeholder:text-[#94a3b8]"
                                />
                                <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
                              </div>
                            </div>

                            <div className="max-h-[220px] overflow-y-auto py-1">
                              {filteredCompareWithNumberOptions.length > 0 ? (
                                filteredCompareWithNumberOptions.map((option) => {
                                  const isSelected = String(compareWithDraftCount) === option;
                                  return (
                                    <button
                                      key={option}
                                      type="button"
                                      onClick={() => {
                                        setCompareWithDraftCount(Number(option));
                                        setIsCompareWithCountOpen(false);
                                      }}
                                      className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm ${
                                        isSelected ? "font-medium text-[#0f172a]" : "text-[#334155] hover:bg-[#f8fafc]"
                                      }`}
                                    >
                                      <span>{option}</span>
                                      {isSelected ? <Check size={14} className="text-[#64748b]" /> : null}
                                    </button>
                                  );
                                })
                              ) : (
                                <div className="px-3 py-3 text-sm uppercase tracking-[0.04em] text-[#64748b]">No results found</div>
                              )}
                            </div>
                          </div>
                        ) : null}
                      </div>

                      <label className="mt-3 flex items-start gap-2 text-sm text-[#334155]">
                        <input
                          type="checkbox"
                          checked={compareWithDraftArrangeLatest}
                          onChange={(event) => setCompareWithDraftArrangeLatest(event.target.checked)}
                          className="mt-1 h-4 w-4 rounded border-[#cfd6e4] text-[#2563eb] focus:ring-[#2563eb]"
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
                    className="inline-flex h-8 items-center rounded bg-[#7aa7ff] px-3 text-sm font-semibold text-white hover:bg-[#6498ff]"
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
          <button type="button" onClick={openCustomizeColumnsModal} className="inline-flex items-center gap-1 hover:text-[#0f172a]">
            <Columns3 size={14} />
            Customize Report Columns
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#dbeafe] px-1 text-[11px] font-semibold text-[#2563eb]">
              {selectedReportColumns.length}
            </span>
          </button>
        </div>

        {isCustomizeColumnsOpen ? (
          <div
            className="fixed inset-0 z-[90] bg-[#111827]/60 px-4 py-6"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) {
                cancelCustomizeColumns();
              }
            }}
          >
            <div className="mx-auto mt-0 w-full max-w-[720px] overflow-hidden rounded-lg bg-white shadow-[0_20px_60px_rgba(15,23,42,0.28)]">
              <div className="flex items-center justify-between border-b border-[#eef2f7] px-5 py-3">
                <div className="text-[18px] font-medium text-[#111827]">Customize Report Columns</div>
                <button
                  type="button"
                  onClick={cancelCustomizeColumns}
                  className="inline-flex h-7 w-7 items-center justify-center text-[#ef4444] hover:bg-[#fef2f2]"
                  aria-label="Close customize columns"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="grid grid-cols-[minmax(0,1fr)_56px_minmax(0,1fr)] gap-4 px-6 py-5">
                <div>
                  <div className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-[#64748b]">Available Columns</div>
                  <div className="rounded-lg border border-[#d7dce7] bg-white">
                    <div className="border-b border-[#eef2f7] p-2">
                      <div className="relative">
                        <input
                          value={customizeColumnsSearch}
                          onChange={(event) => setCustomizeColumnsSearch(event.target.value)}
                          placeholder="Search"
                          className="h-9 w-full rounded-md border border-[#d7dce7] bg-white pl-8 pr-3 text-sm text-[#334155] outline-none placeholder:text-[#94a3b8] focus:border-[#7aa7ff]"
                        />
                        <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
                      </div>
                    </div>

                    <div className="max-h-[330px] overflow-y-auto py-1">
                      {filteredCustomizeGroups.length > 0 ? (
                        filteredCustomizeGroups.map((group) => (
                          <div key={group.label}>
                            <div className="px-4 py-2 text-sm font-medium text-[#9aa3b2]">{group.label}</div>
                            <div className="pb-1">
                              {group.options.map((option) => {
                                const isActive = customizeActiveAvailableColumn === option.key;
                                return (
                                  <button
                                    key={option.key}
                                    type="button"
                                    onClick={() => setCustomizeActiveAvailableColumn(option.key)}
                                    className={`flex w-full items-center px-4 py-2 text-left text-sm ${
                                      isActive ? "bg-[#eef4ff] font-medium text-[#0f172a]" : "text-[#334155] hover:bg-[#f8fafc]"
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
                        <div className="px-4 py-3 text-sm text-[#64748b]">No results found</div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-center">
                  <button
                    type="button"
                    onClick={() => {
                      if (customizeActiveAvailableColumn) {
                        addCustomizeColumn(customizeActiveAvailableColumn);
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
                  <div className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-[#64748b]">Selected Columns</div>
                  <div className="rounded-lg border border-[#d7dce7] bg-white">
                    <div className="max-h-[382px] overflow-y-auto p-3">
                      <div className="space-y-1">
                        {selectedCustomizeColumns.map((option) => (
                          <div key={option.key} className="flex items-center justify-between rounded px-3 py-2 text-sm text-[#334155] hover:bg-[#f8fafc]">
                            <div className="min-w-0">
                              <div className="truncate">{option.label}</div>
                              <div className="text-xs text-[#94a3b8]">({getReportColumnGroupLabel(option.key)})</div>
                            </div>
                            {option.locked ? null : (
                              <button
                                type="button"
                                onClick={() => removeCustomizeColumn(option.key)}
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

              <div className="flex items-center gap-2 border-t border-[#eef2f7] px-5 py-3">
                <button
                  type="button"
                  onClick={applyCustomizeColumns}
                  className="inline-flex h-9 items-center rounded bg-[#7aa7ff] px-4 text-sm font-semibold text-white hover:bg-[#6498ff]"
                >
                  Apply
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
        ) : null}

        <div className="border-b border-[#eef2f7] px-4 py-10 text-center">
          <h2 className="mt-2 text-[22px] font-semibold text-[#111827]">{reportName}</h2>
          <p className="mt-1 text-sm text-[#475569]">
            From {formatDate(selectedDateRange.start)} To {formatDate(selectedDateRange.end)}
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
              {SALES_BY_CUSTOMER_ROWS.map((row, index) => (
                <tr key={`${index}-${row.values.name ?? index}`} className="border-b border-[#eef2f7]">
                  {visibleReportColumns.map((column) => (
                    <td
                      key={column.key}
                      className={`px-4 py-3 text-sm ${
                        column.kind === "text" ? "text-left" : "text-center"
                      } ${column.key === "name" ? "font-medium text-[#2563eb]" : "text-[#2563eb]"}`}
                    >
                      {formatReportColumnValue(column.key, row.values[column.key])}
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
                        column.key === "name" ? "font-semibold text-[#111827]" : "text-[#111827]"
                      }`}
                    >
                      {value as React.ReactNode}
                    </td>
                  );
                })}
              </tr>
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

  const [calculatorInputs, setCalculatorInputs] = useState<Record<string, number>>(() => {
    if (!report?.calculator) return {};
    return report.calculator.fields.reduce((acc, field) => {
      acc[field.key] = field.defaultValue;
      return acc;
    }, {} as Record<string, number>);
  });

  if (!categoryId || !reportId || !category || !report) {
    return <Navigate to="/reports" replace />;
  }

  const calculatorResult = report.calculator ? report.calculator.calculate(calculatorInputs) : null;
  const calculatorPrecision = report.calculator?.precision ?? 2;

  if (report.id === "sales-by-customer") {
    return (
      <div className="relative min-h-[calc(100vh-64px)] pt-3">
        <ReportsDrawer
          open={isReportsDrawerOpen}
          currentCategoryId={category.id}
          currentReportId={report.id}
          triggerRef={reportsMenuButtonRef}
          onClose={() => setIsReportsDrawerOpen(false)}
        />
        <ReportActivityDrawer open={isReportActivityOpen} onClose={() => setIsReportActivityOpen(false)} />
        <div
          className={`pr-3 transition-[padding-left,padding-right] duration-200 ${
            isReportsDrawerOpen ? "lg:pl-[260px]" : ""
          } ${isReportActivityOpen ? "lg:pr-[300px]" : ""}`}
        >
          <SalesByCustomerReportView
            categoryName={category.name}
            reportName={report.name}
            menuButtonRef={reportsMenuButtonRef}
            onMenuClick={() => setIsReportsDrawerOpen((prev) => !prev)}
            onActivityClick={() => setIsReportActivityOpen((prev) => !prev)}
            onClosePage={() => navigate("/reports")}
            onRunReport={() => toast.success(`Report refreshed: ${report.name}`)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ReportDetailHeader
        categoryName={category.name}
        reportName={report.name}
        dateLabel={dateLabel}
        onRunReport={() => toast.success(`Report refreshed: ${report.name}`)}
      />

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="rounded-lg border border-[#d7dce7] bg-white p-4 xl:col-span-2">
          <h2 className="text-base font-semibold text-[#0f172a]">Report Overview</h2>
          <p className="mt-2 text-sm text-[#475569]">{report.summary}</p>

          <h3 className="mt-4 text-sm font-semibold text-[#0f172a]">How It Helps</h3>
          <p className="mt-1 text-sm text-[#475569]">{report.howItHelps}</p>

          {report.formula ? (
            <>
              <h3 className="mt-4 text-sm font-semibold text-[#0f172a]">Logic / Formula</h3>
              <p className="mt-1 rounded border border-[#e2e8f0] bg-[#f8fafc] px-3 py-2 text-sm text-[#1e293b]">{report.formula}</p>
            </>
          ) : null}

          {report.logicNotes?.length ? (
            <>
              <h3 className="mt-4 text-sm font-semibold text-[#0f172a]">Logic Notes</h3>
              <ul className="mt-1 space-y-1 text-sm text-[#475569]">
                {report.logicNotes.map((note) => (
                  <li key={note}>- {note}</li>
                ))}
              </ul>
            </>
          ) : null}
        </div>

        <div className="rounded-lg border border-[#d7dce7] bg-white p-4">
          <h2 className="text-base font-semibold text-[#0f172a]">Source and Basis</h2>
          <div className="mt-3 space-y-2 text-sm">
            <div>
              <p className="font-medium text-[#334155]">Category</p>
              <p className="text-[#64748b]">{category.name}</p>
            </div>
            <div>
              <p className="font-medium text-[#334155]">Accounting Basis</p>
              <p className="text-[#64748b]">{report.basis || "As configured in report settings"}</p>
            </div>
            <div>
              <p className="font-medium text-[#334155]">Source</p>
              <p className="text-[#64748b]">{report.source || "Entity-specific source based on applied filters"}</p>
            </div>
          </div>
        </div>
      </section>

      {report.calculator ? (
        <section className="rounded-lg border border-[#d7dce7] bg-white p-4">
          <h2 className="text-base font-semibold text-[#0f172a]">Logic Check</h2>
          <p className="mt-1 text-sm text-[#64748b]">Use this calculator to validate the reporting formula with your own values.</p>
          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            {report.calculator.fields.map((field) => (
              <label key={field.key} className="block">
                <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-[#64748b]">{field.label}</span>
                <input
                  type="number"
                  value={calculatorInputs[field.key] ?? 0}
                  onChange={(event) => {
                    const value = Number(event.target.value);
                    setCalculatorInputs((prev) => ({ ...prev, [field.key]: Number.isFinite(value) ? value : 0 }));
                  }}
                  className="h-9 w-full rounded border border-[#cfd6e4] px-3 text-sm text-[#0f172a] outline-none focus:border-[#2563eb]"
                />
              </label>
            ))}
          </div>
          <div className="mt-4 rounded border border-[#bfdbfe] bg-[#eff6ff] px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-[#1d4ed8]">{report.calculator.resultLabel}</p>
            <p className="text-2xl font-semibold text-[#1e40af]">{(calculatorResult || 0).toFixed(calculatorPrecision)}</p>
            {report.calculator.helpText ? <p className="mt-1 text-xs text-[#1e3a8a]">{report.calculator.helpText}</p> : null}
          </div>
        </section>
      ) : null}

      <section className="rounded-lg border border-[#d7dce7] bg-white p-4">
        <h2 className="text-base font-semibold text-[#0f172a]">Supported Functions</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse">
            <thead>
              <tr className="border-b border-[#e2e8f0] bg-[#f8fafc]">
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-[#64748b]">Function</th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-[#64748b]">Support</th>
              </tr>
            </thead>
            <tbody>
              {REPORT_FUNCTION_LABELS.map((item) => {
                const supported = Boolean(report.functionSupport[item.key]);
                return (
                  <tr key={item.key} className="border-b border-[#eef2f7]">
                    <td className="px-3 py-2 text-sm text-[#334155]">{item.label}</td>
                    <td className="px-3 py-2 text-sm">
                      <span className={supported ? "rounded bg-[#dcfce7] px-2 py-1 text-xs font-semibold text-[#166534]" : "rounded bg-[#f1f5f9] px-2 py-1 text-xs font-semibold text-[#475569]"}>
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
  );
}

