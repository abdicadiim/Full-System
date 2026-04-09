import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { jsPDF } from "jspdf";
import { CalendarDays, Check, ChevronDown, ChevronRight, Columns3, Filter, Folder, Menu, Plus, RefreshCw, Search, X } from "lucide-react";
import ReportDetailHeader from "./ReportDetailHeader";
import SalesByItemReportView from "./SalesByItemReportPage";
import { getCategoryById, getReportById, REPORT_FUNCTION_LABELS, REPORTS_BY_CATEGORY } from "./reportsCatalog";
import { useSettings } from "../../lib/settings/SettingsContext";
import { reportsAPI } from "../../services/api";
const formatDate = (value) => value.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
const toInputDateValue = (value) => {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};
const fromInputDateValue = (value) => {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
};
const formatPickerDate = (value) => value.toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" });
const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const CALENDAR_YEAR_OPTIONS = Array.from({ length: 120 }, (_, index) => 2007 + index);
const getStartOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1);
const addMonths = (date, amount) => new Date(date.getFullYear(), date.getMonth() + amount, 1);
const isSameDay = (left, right) => left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth() && left.getDate() === right.getDate();
const isSameMonth = (left, right) => left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth();
const buildCalendarGrid = (month) => {
  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1);
  const startDay = firstDay.getDay();
  const startCell = new Date(firstDay);
  startCell.setDate(firstDay.getDate() - startDay);
  const weeks = [];
  let cursor = new Date(startCell);
  for (let week = 0; week < 6; week += 1) {
    const row = [];
    for (let day = 0; day < 7; day += 1) {
      row.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(row);
  }
  return weeks;
};
const MORE_FILTER_TEXT_COMPARATORS = ["starts-with", "ends-with", "contains", "does-not-contain"];
const MORE_FILTER_NO_VALUE_COMPARATORS = ["is-empty", "is-not-empty"];
const MORE_FILTER_FIELD_OPTIONS = [
  { key: "salesperson-name", label: "Sales Person Name" },
  { key: "currency", label: "Currency" },
  { key: "location", label: "Location" }
];
const MORE_FILTER_FIELD_GROUPS = [
  {
    label: "Reports",
    options: [
      { key: "salesperson-name", label: "Sales Person Name" },
      { key: "currency", label: "Currency" }
    ]
  },
  {
    label: "Locations",
    options: [{ key: "location", label: "Location" }]
  }
];
const MORE_FILTER_COMPARATOR_OPTIONS = [
  { key: "is-empty", label: "is empty" },
  { key: "is-not-empty", label: "is not empty" },
  { key: "is-in", label: "is in" },
  { key: "is-not-in", label: "is not in" },
  { key: "starts-with", label: "starts with" },
  { key: "ends-with", label: "ends with" },
  { key: "contains", label: "contains" },
  { key: "does-not-contain", label: "doesn't contain" }
];
const MORE_FILTER_VALUE_OPTIONS = {
  "salesperson-name": [
    { key: "select-sales-person", label: "Select Sales Person" },
    { key: "others", label: "Others" }
  ],
  currency: [
    { key: "select-currency", label: "Select Currency" },
    { key: "SOS", label: "SOS" },
    { key: "USD", label: "USD" }
  ],
  location: [
    { key: "select-location", label: "Select Location" },
    { key: "mogadishu", label: "Mogadishu" },
    { key: "hargeisa", label: "Hargeisa" }
  ]
};
const getMoreFilterFieldLabel = (field) => MORE_FILTER_FIELD_OPTIONS.find((option) => option.key === field)?.label ?? "Select a field";
const getMoreFilterComparatorLabel = (comparator) => MORE_FILTER_COMPARATOR_OPTIONS.find((option) => option.key === comparator)?.label ?? "Select a comparator";
const getMoreFilterValuePlaceholder = (field) => {
  if (!field) return "Select a value";
  return MORE_FILTER_VALUE_OPTIONS[field]?.[0]?.label ?? "Select a value";
};
const getMoreFilterValueLabel = (field, value) => {
  if (!field) return "Select a value";
  return MORE_FILTER_VALUE_OPTIONS[field].find((option) => option.key === value)?.label ?? getMoreFilterValuePlaceholder(field);
};
const getCompareWithLabel = (key) => COMPARE_WITH_OPTIONS.find((option) => option.key === key)?.label ?? "None";
const getReportColumnOption = (key) => REPORT_COLUMN_GROUPS.flatMap((group) => group.options).find((option) => option.key === key);
const getReportColumnLabel = (key) => getReportColumnOption(key).label;
const getReportColumnGroupLabel = (key) => {
  const group = REPORT_COLUMN_GROUPS.find((section) => section.options.some((option) => option.key === key));
  return group?.label ?? "Reports";
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
  { key: "custom", label: "Custom" }
];
const ENTITY_OPTIONS = [
  { key: "invoice", label: "Invoice" },
  { key: "credit-note", label: "Credit Note" }
];
const COMPARE_WITH_OPTIONS = [
  { key: "none", label: "None" },
  { key: "previous-years", label: "Previous Year(s)" },
  { key: "previous-periods", label: "Previous Period(s)" }
];
const COMPARE_WITH_NUMBER_OPTIONS = Array.from({ length: 35 }, (_, index) => String(index + 1));
const REPORT_COLUMN_GROUPS = [
  {
    label: "Reports",
    options: [
      { key: "name", label: "Name", kind: "text", locked: true },
      { key: "balance-due", label: "Balance Due", kind: "currency" },
      { key: "credits", label: "Credits", kind: "currency" },
      { key: "email", label: "Email", kind: "text" },
      { key: "status", label: "Status", kind: "text" },
      { key: "invoice-count", label: "Invoice Count", kind: "number" },
      { key: "invoice-sales", label: "Invoice Sales", kind: "currency" },
      { key: "invoice-sales-with-tax", label: "Invoice Sales With Tax", kind: "currency" },
      { key: "credit-note-count", label: "Credit Note Count", kind: "number" },
      { key: "credit-note-sales", label: "Credit Note Sales", kind: "currency" },
      { key: "credit-note-sales-with-tax", label: "Credit Note Sales With Tax", kind: "currency" },
      { key: "total-sales", label: "Total Sales", kind: "currency" },
      { key: "total-sales-with-tax", label: "Total Sales With Tax", kind: "currency" }
    ]
  }
];
const getStartOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
const getEndOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
const getStartOfWeek = (date) => {
  const start = getStartOfDay(date);
  const day = start.getDay();
  start.setDate(start.getDate() - day);
  return start;
};
const getEndOfWeek = (date) => {
  const end = getStartOfWeek(date);
  end.setDate(end.getDate() + 6);
  return end;
};
const getQuarterBounds = (year, quarterIndex) => {
  const startMonth = quarterIndex * 3;
  return {
    start: new Date(year, startMonth, 1),
    end: new Date(year, startMonth + 3, 0)
  };
};
const getDateRangeValue = (key, referenceDate = /* @__PURE__ */ new Date()) => {
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
const formatCurrency = (value, currency = "SOS") => `${currency}${value.toFixed(2)}`;
const escapeCsvValue = (value) => {
  const textValue = String(value ?? "");
  if (/[",\n]/.test(textValue)) {
    return `"${textValue.replace(/"/g, '""')}"`;
  }
  return textValue;
};
const escapeHtml = (value) => String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
const REPORTS_DRAWER_SECTIONS = [
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
      "receivable-details"
    ]
  },
  {
    id: "payments-received",
    label: "Payments Received",
    reportIds: [
      "payments-received",
      "time-to-get-paid",
      "credit-note-details",
      "refund-history",
      "withholding-tax"
    ]
  },
  { id: "subscriptions", label: "Recurring Invoices", reportIds: ["subscription-details"] },
  {
    id: "purchases-expenses",
    label: "Purchases and Expenses",
    reportIds: ["expense-details", "expenses-by-category", "expenses-by-customer", "expenses-by-project", "billable-expense-details"]
  },
  { id: "taxes", label: "Taxes", reportIds: ["tax-summary", "tds-receivables"] },
  {
    id: "projects-timesheets",
    label: "Projects and Timesheet",
    reportIds: ["timesheet-details", "project-summary", "project-details", "projects-revenue-summary"]
  },
  {
    id: "activity",
    label: "Activity",
    reportIds: ["system-mails", "activity-logs-audit-trail", "exception-report", "portal-activities", "customer-reviews"]
  }
];
function ReportsDrawer({
  open,
  currentCategoryId,
  currentReportId,
  triggerRef,
  onClose
}) {
  const drawerRef = useRef(null);
  const [search, setSearch] = useState("");
  const [expandedSections, setExpandedSections] = useState([currentCategoryId]);
  useEffect(() => {
    setExpandedSections((prev) => prev.includes(currentCategoryId) ? prev : [currentCategoryId]);
  }, [currentCategoryId]);
  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event) => {
      const target = event.target;
      if (!drawerRef.current?.contains(target) && !triggerRef.current?.contains(target)) {
        onClose();
      }
    };
    const handleKeyDown = (event) => {
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
      const reports = section.reportIds.map((reportId) => available.find((report) => report.id === reportId)).filter(Boolean);
      const filteredReports = query ? reports.filter((report) => report.name.toLowerCase().includes(query) || section.label.toLowerCase().includes(query)) : reports;
      return { ...section, reports: filteredReports };
    }).filter((section) => section.reports.length > 0);
  }, [search]);
  if (!open) return null;
  const isSearching = search.trim().length > 0;
  return /* @__PURE__ */ jsx("div", { ref: drawerRef, className: "absolute left-0 top-0 z-30 h-full w-[260px] overflow-hidden border-r border-[#e5e7eb] bg-white shadow-[8px_0_20px_rgba(15,23,42,0.08)]", children: /* @__PURE__ */ jsxs("div", { className: "flex h-full flex-col", children: [
    /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between border-b border-[#eef2f7] px-4 py-3", children: [
      /* @__PURE__ */ jsx("div", { className: "text-[18px] font-semibold text-[#0f172a]", children: "Reports" }),
      /* @__PURE__ */ jsx("button", { type: "button", onClick: onClose, className: "inline-flex h-7 w-7 items-center justify-center text-[#ef4444] hover:bg-[#fef2f2]", "aria-label": "Close reports drawer", children: /* @__PURE__ */ jsx(X, { size: 16 }) })
    ] }),
    /* @__PURE__ */ jsx("div", { className: "border-b border-[#eef2f7] px-3 py-3", children: /* @__PURE__ */ jsx("div", { className: "relative", children: /* @__PURE__ */ jsx(
      "input",
      {
        value: search,
        onChange: (event) => setSearch(event.target.value),
        placeholder: "Search reports",
        className: "h-9 w-full rounded-lg border border-[#d8dfea] bg-white pl-3 pr-3 text-sm text-[#334155] outline-none placeholder:text-[#94a3b8] focus:border-[#7da0ff]"
      }
    ) }) }),
    /* @__PURE__ */ jsxs("div", { className: "flex-1 overflow-y-auto px-2 py-2", children: [
      /* @__PURE__ */ jsx("div", { className: "px-2 pb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#64748b]", children: "All Reports" }),
      sections.length > 0 ? /* @__PURE__ */ jsx("div", { className: "space-y-1", children: sections.map((section) => {
        const expanded = isSearching || expandedSections.includes(section.id);
        return /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsxs(
            "button",
            {
              type: "button",
              onClick: () => {
                if (isSearching) return;
                setExpandedSections((prev) => prev.includes(section.id) ? [] : [section.id]);
              },
              className: "flex w-full items-center justify-between gap-2 rounded px-2 py-1.5 text-left text-sm text-[#111827] hover:bg-[#f8fafc]",
              children: [
                /* @__PURE__ */ jsxs("span", { className: "flex min-w-0 items-center gap-2", children: [
                  /* @__PURE__ */ jsx(Folder, { size: 14, className: "text-[#9aa3b2]" }),
                  /* @__PURE__ */ jsx("span", { className: "truncate", children: section.label })
                ] }),
                expanded ? /* @__PURE__ */ jsx(ChevronDown, { size: 12, className: "text-[#9aa3b2]" }) : /* @__PURE__ */ jsx(ChevronRight, { size: 12, className: "text-[#9aa3b2]" })
              ]
            }
          ),
          expanded ? /* @__PURE__ */ jsx("div", { className: "ml-5 mt-1 space-y-0.5", children: section.reports.map((report) => {
            const isActive = report.id === currentReportId;
            return /* @__PURE__ */ jsx(
              Link,
              {
                to: `/reports/${report.categoryId}/${report.id}`,
                onClick: onClose,
                className: `block rounded px-2 py-1.5 text-sm hover:bg-[#eef4ff] ${isActive ? "bg-[#eef4ff] font-medium text-[#111827]" : "text-[#111827] hover:text-black"}`,
                children: report.name
              },
              report.id
            );
          }) }) : null
        ] }, section.id);
      }) }) : /* @__PURE__ */ jsx("div", { className: "px-2 py-4 text-sm text-[#64748b]", children: "No reports found." })
    ] })
  ] }) });
}
function ReportActivityDrawer({
  open,
  onClose
}) {
  const drawerRef = useRef(null);
  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event) => {
      const target = event.target;
      if (!drawerRef.current?.contains(target)) {
        onClose();
      }
    };
    const handleKeyDown = (event) => {
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
  return /* @__PURE__ */ jsx(
    "div",
    {
      ref: drawerRef,
      className: "absolute right-0 top-0 z-30 h-full w-[300px] overflow-hidden border-l border-[#e5e7eb] bg-white shadow-[-8px_0_20px_rgba(15,23,42,0.08)]",
      children: /* @__PURE__ */ jsxs("div", { className: "flex h-full flex-col", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between border-b border-[#eef2f7] px-4 py-3", children: [
          /* @__PURE__ */ jsx("div", { className: "text-[18px] font-semibold text-[#0f172a]", children: "Report Activity" }),
          /* @__PURE__ */ jsx(
            "button",
            {
              type: "button",
              onClick: onClose,
              className: "inline-flex h-7 w-7 items-center justify-center text-[#ef4444] hover:bg-[#fef2f2]",
              "aria-label": "Close report activity",
              children: /* @__PURE__ */ jsx(X, { size: 16 })
            }
          )
        ] }),
        /* @__PURE__ */ jsx("div", { className: "flex flex-1 items-start justify-center px-6 pt-8", children: /* @__PURE__ */ jsx("p", { className: "text-sm text-[#64748b]", children: "No comments yet." }) })
      ] })
    }
  );
}
function SalesBySalesPersonReportView({
  categoryName,
  reportName,
  menuButtonRef,
  onMenuClick,
  onRunReport,
  onActivityClick,
  onClosePage
}) {
  const dateRangeRef = useRef(null);
  const entityRef = useRef(null);
  const compareWithRef = useRef(null);
  const compareWithCountRef = useRef(null);
  const moreFiltersRef = useRef(null);
  const exportRef = useRef(null);
  const [dateRangeKey, setDateRangeKey] = useState("this-week");
  const [dateRangeDraftKey, setDateRangeDraftKey] = useState("this-week");
  const [isDateRangeOpen, setIsDateRangeOpen] = useState(false);
  const [isCustomDateRangeOpen, setIsCustomDateRangeOpen] = useState(false);
  const [customDateRange, setCustomDateRange] = useState(() => getDateRangeValue("this-week"));
  const [customDateRangeDraft, setCustomDateRangeDraft] = useState(() => getDateRangeValue("this-week"));
  const [customDateRangeMonth, setCustomDateRangeMonth] = useState(() => getStartOfMonth(getDateRangeValue("this-week").start));
  const [entityKeys, setEntityKeys] = useState([]);
  const [isEntityOpen, setIsEntityOpen] = useState(false);
  const [entitySearch, setEntitySearch] = useState("");
  const [compareWithKey, setCompareWithKey] = useState("none");
  const [compareWithDraftKey, setCompareWithDraftKey] = useState("none");
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
  const [customizeReportTab, setCustomizeReportTab] = useState("general");
  const customizeDateRangeRef = useRef(null);
  const [customizeDateRangeDraftKey, setCustomizeDateRangeDraftKey] = useState("this-week");
  const [isCustomizeDateRangeOpen, setIsCustomizeDateRangeOpen] = useState(false);
  const [isCustomizeCustomDateRangeOpen, setIsCustomizeCustomDateRangeOpen] = useState(false);
  const [customizeCustomDateRangeDraft, setCustomizeCustomDateRangeDraft] = useState(
    () => getDateRangeValue("this-week")
  );
  const [customizeCustomDateRangeMonth, setCustomizeCustomDateRangeMonth] = useState(
    () => getStartOfMonth(getDateRangeValue("this-week").start)
  );
  const [customizeColumnsSearch, setCustomizeColumnsSearch] = useState("");
  const customizeCompareRef = useRef(null);
  const customizeCompareCountRef = useRef(null);
  const customizeEntityRef = useRef(null);
  const customizeMoreFiltersRef = useRef(null);
  const [isCustomizeCompareOpen, setIsCustomizeCompareOpen] = useState(false);
  const [isCustomizeCompareCountOpen, setIsCustomizeCompareCountOpen] = useState(false);
  const [isCustomizeEntityOpen, setIsCustomizeEntityOpen] = useState(false);
  const [customizeMoreFilterDropdown, setCustomizeMoreFilterDropdown] = useState(null);
  const [customizeCompareSearch, setCustomizeCompareSearch] = useState("");
  const [customizeCompareCountSearch, setCustomizeCompareCountSearch] = useState("");
  const [customizeEntitySearch, setCustomizeEntitySearch] = useState("");
  const [customizeEntityDraftKeys, setCustomizeEntityDraftKeys] = useState(ENTITY_OPTIONS.map((option) => option.key));
  const [customizeMoreFilterRows, setCustomizeMoreFilterRows] = useState([]);
  const [selectedReportColumns, setSelectedReportColumns] = useState([
    "name",
    "invoice-count",
    "invoice-sales",
    "invoice-sales-with-tax",
    "credit-note-count",
    "credit-note-sales",
    "credit-note-sales-with-tax",
    "total-sales",
    "total-sales-with-tax"
  ]);
  const [customizeDraftSelectedColumns, setCustomizeDraftSelectedColumns] = useState([
    "name",
    "invoice-count",
    "invoice-sales",
    "invoice-sales-with-tax",
    "credit-note-count",
    "credit-note-sales",
    "credit-note-sales-with-tax",
    "total-sales",
    "total-sales-with-tax"
  ]);
  const { settings } = useSettings();
  const organizationName = String(settings?.general?.companyDisplayName || settings?.general?.schoolDisplayName || "").trim();
  const [customizeActiveAvailableColumn, setCustomizeActiveAvailableColumn] = useState("");
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isMoreFiltersOpen, setIsMoreFiltersOpen] = useState(false);
  const [moreFilterDropdown, setMoreFilterDropdown] = useState(null);
  const [moreFilterRows, setMoreFilterRows] = useState([
    { id: "more-filter-1", field: "", comparator: "", value: "" }
  ]);
  const [reportRows, setReportRows] = useState([]);
  const [reportCurrency, setReportCurrency] = useState("SOS");
  const [isReportLoading, setIsReportLoading] = useState(true);
  const [reportError, setReportError] = useState("");
  const [reportRefreshTick, setReportRefreshTick] = useState(0);
  const shouldToastRunRef = useRef(false);
  const selectedDateRange = dateRangeKey === "custom" ? customDateRange : getDateRangeValue(dateRangeKey);
  const dateRangeLabel = DATE_RANGE_OPTIONS.find((option) => option.key === dateRangeKey)?.label ?? "Today";
  const customizeDateRangeLabel = DATE_RANGE_OPTIONS.find((option) => option.key === customizeDateRangeDraftKey)?.label ?? "Today";
  const customizeSelectedDateRange = customizeDateRangeDraftKey === "custom" ? customizeCustomDateRangeDraft : getDateRangeValue(customizeDateRangeDraftKey);
  const getEntitySelectionLabel = (keys) => {
    if (keys.length === 0) return "None";
    if (keys.length === ENTITY_OPTIONS.length) return "All";
    return ENTITY_OPTIONS.filter((option) => keys.includes(option.key)).map((option) => option.label).join(", ");
  };
  const entityLabel = getEntitySelectionLabel(entityKeys);
  const handleCustomizeCustomStartDateClick = (date) => {
    setCustomizeCustomDateRangeDraft((prev) => ({
      start: date,
      end: prev.end < date ? date : prev.end
    }));
  };
  const handleCustomizeCustomEndDateClick = (date) => {
    setCustomizeCustomDateRangeDraft((prev) => ({
      start: prev.start > date ? date : prev.start,
      end: date < prev.start ? prev.start : date
    }));
  };
  const setCustomizeLeftCalendarMonth = (monthIndex, year) => {
    setCustomizeCustomDateRangeMonth(new Date(year, monthIndex, 1));
  };
  const setCustomizeRightCalendarMonth = (monthIndex, year) => {
    setCustomizeCustomDateRangeMonth(addMonths(new Date(year, monthIndex, 1), -1));
  };
  const openCustomizeMoreFilterDropdown = (rowId, kind) => {
    setCustomizeMoreFilterDropdown((prev) => prev?.rowId === rowId && prev.kind === kind ? null : { rowId, kind, search: "" });
  };
  const closeCustomizeMoreFilterDropdown = () => setCustomizeMoreFilterDropdown(null);
  const addCustomizeMoreFilterRow = () => {
    const newRowId = `customize-more-filter-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    setCustomizeMoreFilterRows((prev) => [...prev, { id: newRowId, field: "", comparator: "", value: "" }]);
    openCustomizeMoreFilterDropdown(newRowId, "field");
  };
  useEffect(() => {
    if (!isDateRangeOpen) return;
    const handlePointerDown = (event) => {
      const target = event.target;
      if (!dateRangeRef.current?.contains(target)) {
        cancelDateRangeSelection();
      }
    };
    const handleKeyDown = (event) => {
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
    const currentRange = dateRangeKey === "custom" ? customDateRange : getDateRangeValue(dateRangeKey);
    setDateRangeDraftKey(dateRangeKey);
    setCustomDateRangeDraft(currentRange);
    setCustomDateRangeMonth(getStartOfMonth(currentRange.start));
    setIsCustomDateRangeOpen(dateRangeKey === "custom");
    setIsDateRangeOpen(true);
  }
  function cancelDateRangeSelection() {
    setDateRangeDraftKey(dateRangeKey);
    setCustomDateRangeDraft(customDateRange);
    setCustomDateRangeMonth(getStartOfMonth(dateRangeKey === "custom" ? customDateRange.start : getDateRangeValue(dateRangeKey).start));
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
  const handleCustomStartDateClick = (date) => {
    setCustomDateRangeDraft((prev) => ({
      start: date,
      end: prev.end < date ? date : prev.end
    }));
  };
  const handleCustomEndDateClick = (date) => {
    setCustomDateRangeDraft((prev) => ({
      start: prev.start > date ? date : prev.start,
      end: date < prev.start ? prev.start : date
    }));
  };
  const setLeftCalendarMonth = (monthIndex, year) => {
    setCustomDateRangeMonth(new Date(year, monthIndex, 1));
  };
  const setRightCalendarMonth = (monthIndex, year) => {
    setCustomDateRangeMonth(addMonths(new Date(year, monthIndex, 1), -1));
  };
  useEffect(() => {
    if (!isEntityOpen) return;
    const handlePointerDown = (event) => {
      const target = event.target;
      if (!entityRef.current?.contains(target)) {
        setIsEntityOpen(false);
      }
    };
    const handleKeyDown = (event) => {
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
    const handlePointerDown = (event) => {
      const target = event.target;
      if (!compareWithRef.current?.contains(target)) {
        setIsCompareWithOpen(false);
        setIsCompareWithSelectOpen(false);
      }
    };
    const handleKeyDown = (event) => {
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
    const handlePointerDown = (event) => {
      const target = event.target;
      if (!compareWithCountRef.current?.contains(target)) {
        setIsCompareWithCountOpen(false);
      }
    };
    const handleKeyDown = (event) => {
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
    const handlePointerDown = (event) => {
      const target = event.target;
      if (!exportRef.current?.contains(target)) {
        setIsExportOpen(false);
      }
    };
    const handleKeyDown = (event) => {
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
    const handleKeyDown = (event) => {
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
    const handlePointerDown = (event) => {
      const target = event.target;
      if (!customizeDateRangeRef.current?.contains(target)) {
        setIsCustomizeDateRangeOpen(false);
        setIsCustomizeCustomDateRangeOpen(false);
      }
    };
    const handleKeyDown = (event) => {
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
    const handlePointerDown = (event) => {
      const target = event.target;
      if (!customizeCompareRef.current?.contains(target)) {
        setIsCustomizeCompareOpen(false);
      }
    };
    const handleKeyDown = (event) => {
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
    const handlePointerDown = (event) => {
      const target = event.target;
      if (!customizeCompareCountRef.current?.contains(target)) {
        setIsCustomizeCompareCountOpen(false);
      }
    };
    const handleKeyDown = (event) => {
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
    const handlePointerDown = (event) => {
      const target = event.target;
      if (!customizeEntityRef.current?.contains(target)) {
        setIsCustomizeEntityOpen(false);
      }
    };
    const handleKeyDown = (event) => {
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
    const handlePointerDown = (event) => {
      const target = event.target;
      if (!customizeMoreFiltersRef.current?.contains(target)) {
        closeCustomizeMoreFilterDropdown();
      }
    };
    const handleKeyDown = (event) => {
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
    const handlePointerDown = (event) => {
      const target = event.target;
      if (!moreFiltersRef.current?.contains(target)) {
        closeMoreFilterDropdown();
        setIsMoreFiltersOpen(false);
      }
    };
    const handleKeyDown = (event) => {
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
      })
    })).filter((group) => group.options.length > 0);
  }, [customizeColumnsSearch, customizeDraftSelectedColumns]);
  const visibleReportColumns = useMemo(() => selectedReportColumns.map((key) => getReportColumnOption(key)), [selectedReportColumns]);
  const formatReportColumnValue = (key, value) => {
    if (value === void 0 || value === null || value === "") return "\u2014";
    const option = getReportColumnOption(key);
    if (option.kind === "currency" && typeof value === "number") return formatCurrency(value, reportCurrency || "SOS");
    return String(value);
  };
  const reportColumnTotals = useMemo(
    () => visibleReportColumns.map((option) => {
      if (option.key === "name") return "Total";
      const total = reportRows.reduce((sum, row) => {
        const value = row.values[option.key];
        return typeof value === "number" ? sum + value : sum;
      }, 0);
      if (option.kind === "number") return total;
      if (option.kind === "currency") return formatCurrency(total, reportCurrency || "SOS");
      return "";
    }),
    [reportCurrency, reportRows, visibleReportColumns]
  );
  const buildSalesBySalesPersonQuery = () => {
    const query = {
      filter_by: dateRangeKey,
      compare_with: compareWithKey,
      compare_count: String(compareWithCount)
    };
    if (dateRangeKey === "custom") {
      query.from_date = selectedDateRange.start.toISOString();
      query.to_date = selectedDateRange.end.toISOString();
    }
    if (entityKeys.length > 0) {
      query.entities = entityKeys.join(",");
    }
    const activeMoreFilters = moreFilterRows.filter((row) => row.field || row.comparator || row.value.trim()).map((row) => ({
      field: row.field,
      comparator: row.comparator,
      value: row.value
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
        const response = await reportsAPI.getSalesBySalesPerson(buildSalesBySalesPersonQuery());
        if (cancelled) return;
        const data = response?.data || {};
        setReportRows(Array.isArray(data.rows) ? data.rows : []);
        setReportCurrency(String(data.currency || "SOS"));
        if (shouldToastRunRef.current) {
          onRunReport();
        }
      } catch (error) {
        if (!cancelled) {
          const message = error instanceof Error ? error.message : "Failed to load report";
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
  }, [reportRefreshTick]);
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
  const hasMoreFilters = moreFilterRows.some((row) => row.field || row.comparator || row.value.trim());
  const getFilteredFieldGroups = (query) => {
    const normalizedQuery = query.trim().toLowerCase();
    return MORE_FILTER_FIELD_GROUPS.map((group) => {
      const options = group.options.filter((option) => option.label.toLowerCase().includes(normalizedQuery));
      return { ...group, options };
    }).filter((group) => group.options.length > 0);
  };
  const getFilteredComparatorOptions = (query, field) => {
    const normalizedQuery = query.trim().toLowerCase();
    const fieldSpecificOptions = field === "currency" ? MORE_FILTER_COMPARATOR_OPTIONS.filter((option) => ["is-empty", "is-not-empty", "is-in", "is-not-in"].includes(option.key)) : field === "location" ? MORE_FILTER_COMPARATOR_OPTIONS.filter((option) => ["is-in", "is-not-in"].includes(option.key)) : MORE_FILTER_COMPARATOR_OPTIONS;
    return fieldSpecificOptions.filter((option) => option.label.toLowerCase().includes(normalizedQuery));
  };
  const filteredCompareWithNumberOptions = useMemo(() => {
    const query = compareWithCountSearch.trim().toLowerCase();
    return COMPARE_WITH_NUMBER_OPTIONS.filter((option) => option.includes(query));
  }, [compareWithCountSearch]);
  const filteredCustomizeCompareOptions = useMemo(() => {
    const query = customizeCompareSearch.trim().toLowerCase();
    return COMPARE_WITH_OPTIONS.filter((option) => option.key !== "none" && option.label.toLowerCase().includes(query));
  }, [customizeCompareSearch]);
  const filteredCustomizeCompareNumberOptions = useMemo(() => {
    const query = customizeCompareCountSearch.trim().toLowerCase();
    return COMPARE_WITH_NUMBER_OPTIONS.filter((option) => option.includes(query));
  }, [customizeCompareCountSearch]);
  const handleExportAction = (label) => {
    setIsExportOpen(false);
    const normalizedLabel = label.toLowerCase();
    const fileBase = `sales-by-sales-person-${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}`;
    const exportHeaders = visibleReportColumns.map((column) => column.label);
    const exportRows = reportRows.map(
      (row) => visibleReportColumns.map((column) => formatReportColumnValue(column.key, row.values[column.key]))
    );
    const exportTotals = reportColumnTotals.map((value) => String(value ?? ""));
    const downloadText = (content, fileName, mimeType) => {
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
      const colWidth = (pageWidth - margin * 2) / Math.max(visibleReportColumns.length, 1);
      let y = 18;
      doc.setFontSize(16);
      doc.text(reportName, pageWidth / 2, y, { align: "center" });
      y += 8;
      doc.setFontSize(10);
      doc.text(`From ${formatDate(selectedDateRange.start)} To ${formatDate(selectedDateRange.end)}`, pageWidth / 2, y, { align: "center" });
      y += 10;
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, y, pageWidth - margin * 2, 8, "F");
      doc.setFontSize(9);
      visibleReportColumns.forEach((column, index) => {
        doc.text(column.label, margin + index * colWidth + 2, y + 5);
      });
      y += 8;
      const rowsForPdf = [...exportRows, exportTotals];
      rowsForPdf.forEach((rowValues, rowIndex) => {
        const wrapped = rowValues.map((value) => doc.splitTextToSize(String(value ?? ""), colWidth - 4));
        const rowHeight = Math.max(...wrapped.map((lines) => Math.max(lines.length, 1))) * 5 + 2;
        if (y + rowHeight > pageHeight - margin) {
          doc.addPage();
          y = margin;
          doc.setFillColor(248, 250, 252);
          doc.rect(margin, y, pageWidth - margin * 2, 8, "F");
          visibleReportColumns.forEach((column, index) => {
            doc.text(column.label, margin + index * colWidth + 2, y + 5);
          });
          y += 8;
        }
        if (rowIndex === rowsForPdf.length - 1) {
          doc.setFillColor(250, 251, 255);
          doc.rect(margin, y, pageWidth - margin * 2, rowHeight, "F");
        }
        rowValues.forEach((value, index) => {
          const lines = wrapped[index];
          doc.text(lines[0] || "", margin + index * colWidth + 2, y + 5);
        });
        y += rowHeight;
      });
      doc.save(`${fileBase}.pdf`);
    };
    const exportSpreadsheet = async (bookType, suffix) => {
      const XLSX = await import("xlsx");
      const worksheet = XLSX.utils.aoa_to_sheet([
        exportHeaders,
        ...exportRows,
        exportTotals
      ]);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Sales by Sales Person");
      XLSX.writeFile(workbook, `${fileBase}.${suffix}`, {
        bookType,
        compression: true
      });
    };
    const openPrintWindow = () => {
      const printWindow = window.open("", "_blank", "noopener,noreferrer,width=1200,height=800");
      if (!printWindow) {
        throw new Error("Unable to open the print dialog.");
      }
      const styles = `
        <style>
          body { font-family: Arial, sans-serif; margin: 24px; color: #0f172a; }
          h1 { font-size: 20px; margin: 0 0 6px; text-align: center; }
          p { margin: 0 0 16px; text-align: center; color: #475569; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border-bottom: 1px solid #e5e7eb; padding: 8px 10px; font-size: 12px; }
          th { text-align: left; background: #f8fafc; text-transform: uppercase; font-size: 10px; letter-spacing: .08em; color: #64748b; }
          td.num { text-align: center; }
          tr.total td { font-weight: 600; background: #fafbff; }
        </style>
      `;
      const headerCells = exportHeaders.map((header) => `<th>${escapeHtml(header)}</th>`).join("");
      const bodyRows = exportRows.map(
        (row) => `<tr>${row.map((cell, index) => `<td class="${index === 0 ? "" : "num"}">${escapeHtml(cell)}</td>`).join("")}</tr>`
      ).join("");
      const totalRow = `<tr class="total">${exportTotals.map((cell, index) => `<td class="${index === 0 ? "" : "num"}">${escapeHtml(cell)}</td>`).join("")}</tr>`;
      printWindow.document.open();
      printWindow.document.write(`
        <!doctype html>
        <html>
          <head>
            <title>${escapeHtml(reportName)}</title>
            ${styles}
          </head>
          <body>
            <h1>${escapeHtml(reportName)}</h1>
            <p>From ${escapeHtml(formatDate(selectedDateRange.start))} To ${escapeHtml(formatDate(selectedDateRange.end))}</p>
            <table>
              <thead><tr>${headerCells}</tr></thead>
              <tbody>${bodyRows}${totalRow}</tbody>
            </table>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      printWindow.onafterprint = () => {
        printWindow.close();
      };
      setTimeout(() => {
        printWindow.print();
      }, 250);
    };
    void (async () => {
      try {
        if (normalizedLabel === "pdf") {
          exportPdf();
        } else if (normalizedLabel === "xlsx (microsoft excel)") {
          await exportSpreadsheet("xlsx", "xlsx");
        } else if (normalizedLabel === "xls (microsoft excel 1997-2004 compatible)") {
          await exportSpreadsheet("xls", "xls");
        } else if (normalizedLabel === "csv (comma separated value)") {
          const csv = [
            exportHeaders.map(escapeCsvValue).join(","),
            ...exportRows.map((row) => row.map(escapeCsvValue).join(",")),
            exportTotals.map(escapeCsvValue).join(",")
          ].join("\n");
          downloadText(csv, `${fileBase}.csv`, "text/csv;charset=utf-8;");
        } else if (normalizedLabel === "export to zoho sheet") {
          await exportSpreadsheet("xlsx", "xlsx");
        } else if (normalizedLabel === "print" || normalizedLabel === "print preference") {
          openPrintWindow();
        }
        toast.success(`Export option selected: ${label}`);
      } catch (error) {
        console.error("Failed to export Sales by Sales Person report:", error);
        toast.error(`Unable to export ${label}`);
      }
    })();
  };
  const openCustomizeReportColumnsModal = () => {
    if (typeof window !== "undefined" && /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname)) {
      console.debug("[reports] openCustomizeReportColumnsModal");
    }
    setCustomizeDraftSelectedColumns(selectedReportColumns);
    setCustomizeColumnsSearch("");
    setCustomizeActiveAvailableColumn("");
    const currentCustomizeRange = dateRangeKey === "custom" ? customDateRange : selectedDateRange;
    setCustomizeDateRangeDraftKey(dateRangeKey);
    setCustomizeCustomDateRangeDraft(currentCustomizeRange);
    setCustomizeCustomDateRangeMonth(getStartOfMonth(currentCustomizeRange.start));
    setIsCustomizeDateRangeOpen(false);
    setIsCustomizeCustomDateRangeOpen(dateRangeKey === "custom");
    setCompareWithDraftKey(compareWithKey === "none" ? "previous-years" : compareWithKey);
    setCompareWithDraftCount(compareWithKey === "none" ? 1 : compareWithCount);
    setCompareWithDraftArrangeLatest(compareWithArrangeLatest);
    setCustomizeEntityDraftKeys(entityKeys.length > 0 ? entityKeys : ENTITY_OPTIONS.map((option) => option.key));
    setCustomizeEntitySearch("");
    setCustomizeMoreFilterRows(
      moreFilterRows.filter((row) => row.field || row.comparator || row.value.trim()).map((row) => ({ ...row }))
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
    const nextColumns = customizeDraftSelectedColumns.includes("name") ? customizeDraftSelectedColumns : ["name", ...customizeDraftSelectedColumns];
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
    setCustomizeCustomDateRangeDraft(dateRangeKey === "custom" ? customDateRange : getDateRangeValue(dateRangeKey));
    setCustomizeCustomDateRangeMonth(getStartOfMonth((dateRangeKey === "custom" ? customDateRange : getDateRangeValue(dateRangeKey)).start));
    setIsCustomizeCustomDateRangeOpen(false);
    setCustomizeEntityDraftKeys(entityKeys.length > 0 ? entityKeys : ENTITY_OPTIONS.map((option) => option.key));
    setCustomizeEntitySearch("");
    setIsCustomizeEntityOpen(false);
    setCustomizeMoreFilterRows(moreFilterRows.filter((row) => row.field || row.comparator || row.value.trim()).map((row) => ({ ...row })));
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
  const addCustomizeColumn = (key) => {
    setCustomizeDraftSelectedColumns((prev) => prev.includes(key) ? prev : [...prev, key]);
    setCustomizeActiveAvailableColumn("");
  };
  const removeCustomizeColumn = (key) => {
    if (key === "name") return;
    setCustomizeDraftSelectedColumns((prev) => prev.filter((item) => item !== key));
    setCustomizeActiveAvailableColumn((prev) => prev === key ? "" : prev);
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
  const openMoreFilterDropdown = (rowId, kind) => {
    setMoreFilterDropdown((prev) => prev?.rowId === rowId && prev.kind === kind ? null : { rowId, kind, search: "" });
  };
  const closeMoreFilterDropdown = () => setMoreFilterDropdown(null);
  const addMoreFilterRow = () => {
    const newRowId = `more-filter-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    setMoreFilterRows((prev) => [...prev, { id: newRowId, field: "", comparator: "", value: "" }]);
    openMoreFilterDropdown(newRowId, "field");
  };
  return /* @__PURE__ */ jsxs("div", { className: "space-y-4", children: [
    /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap items-start justify-between gap-4 border-b border-[#e5e7eb] pb-3", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex min-w-0 items-start gap-3", children: [
        /* @__PURE__ */ jsx(
          "button",
          {
            ref: menuButtonRef,
            type: "button",
            onClick: onMenuClick,
            className: "inline-flex h-8 w-8 items-center justify-center rounded border border-[#d4d9e4] bg-white text-[#334155] hover:bg-[#f8fafc]",
            "aria-label": "Toggle reports menu",
            children: /* @__PURE__ */ jsx(Menu, { size: 15 })
          }
        ),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("p", { className: "text-sm font-medium text-[#1b6f7b]", children: categoryName }),
          /* @__PURE__ */ jsxs("h1", { className: "mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-1 text-[24px] font-semibold leading-tight text-[#0f172a]", children: [
            /* @__PURE__ */ jsx("span", { children: reportName }),
            /* @__PURE__ */ jsxs("span", { className: "text-sm font-normal text-[#475569]", children: [
              "- From ",
              formatDate(selectedDateRange.start),
              " To ",
              formatDate(selectedDateRange.end)
            ] })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
        /* @__PURE__ */ jsxs("div", { ref: exportRef, className: "relative", children: [
          /* @__PURE__ */ jsxs(
            "button",
            {
              type: "button",
              onClick: () => setIsExportOpen((prev) => !prev),
              className: `inline-flex h-9 items-center gap-1 rounded border bg-white px-3 text-sm font-medium text-[#1e293b] hover:bg-[#f8fafc] ${isExportOpen ? "border-[#1b6f7b]" : "border-[#d4d9e4]"}`,
              "aria-haspopup": "menu",
              "aria-expanded": isExportOpen,
              children: [
                "Export ",
                /* @__PURE__ */ jsx(ChevronDown, { size: 14, className: `transition-transform duration-150 ${isExportOpen ? "rotate-180" : ""}` })
              ]
            }
          ),
          isExportOpen ? /* @__PURE__ */ jsxs("div", { className: "absolute right-0 top-[calc(100%+6px)] z-50 w-[252px] overflow-visible rounded-lg border border-[#d7dce7] bg-white shadow-[0_10px_24px_rgba(15,23,42,0.12)]", children: [
            /* @__PURE__ */ jsx("div", { className: "border-b border-[#eef2f7] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#64748b]", children: "Export As" }),
            /* @__PURE__ */ jsx("div", { className: "py-1", children: [
              "PDF",
              "XLSX (Microsoft Excel)",
              "XLS (Microsoft Excel 1997-2004 Compatible)",
              "CSV (Comma Separated Value)",
              "Export to Zoho Sheet"
            ].map((label) => /* @__PURE__ */ jsx(
              "button",
              {
                type: "button",
                onClick: () => handleExportAction(label),
                className: "flex w-full items-center px-4 py-2 text-left text-sm text-[#334155] hover:bg-[#f8fafc]",
                children: label
              },
              label
            )) }),
            /* @__PURE__ */ jsx("div", { className: "border-t border-[#eef2f7] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#64748b]", children: "Print" }),
            /* @__PURE__ */ jsx("div", { className: "py-1", children: ["Print", "Print Preference"].map((label) => /* @__PURE__ */ jsx(
              "button",
              {
                type: "button",
                onClick: () => handleExportAction(label),
                className: "flex w-full items-center px-4 py-2 text-left text-sm text-[#334155] hover:bg-[#f8fafc]",
                children: label
              },
              label
            )) })
          ] }) : null
        ] }),
        /* @__PURE__ */ jsx(
          "button",
          {
            type: "button",
            onClick: onActivityClick,
            className: "inline-flex h-9 w-9 items-center justify-center rounded border border-[#d4d9e4] text-[#334155] hover:bg-[#f8fafc]",
            "aria-label": "Open report activity",
            children: /* @__PURE__ */ jsx(RefreshCw, { size: 15 })
          }
        ),
        /* @__PURE__ */ jsx(
          "button",
          {
            type: "button",
            onClick: onClosePage,
            className: "inline-flex h-9 w-9 items-center justify-center rounded border border-[#d4d9e4] text-[#ef4444] hover:bg-[#fef2f2]",
            "aria-label": "Close report page",
            children: /* @__PURE__ */ jsx(X, { size: 15 })
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { ref: moreFiltersRef, className: "relative flex flex-wrap items-center gap-2 border-b border-[#e6e9f0] pb-3 text-sm", children: [
      /* @__PURE__ */ jsxs("span", { className: "inline-flex items-center gap-1 text-[#334155]", children: [
        /* @__PURE__ */ jsx(Filter, { size: 14, className: "text-[#64748b]" }),
        /* @__PURE__ */ jsx("span", { children: "Filters :" })
      ] }),
      /* @__PURE__ */ jsxs("div", { ref: dateRangeRef, className: "relative", children: [
        /* @__PURE__ */ jsxs(
          "button",
          {
            type: "button",
            onClick: openDateRangeDropdown,
            className: `inline-flex h-8 items-center gap-1 rounded border px-3 text-sm text-[#334155] hover:bg-white ${isDateRangeOpen ? "border-[#1b6f7b] bg-white" : "border-[#cfd6e4] bg-[#f8fafc]"}`,
            "aria-haspopup": "menu",
            "aria-expanded": isDateRangeOpen,
            children: [
              /* @__PURE__ */ jsx(CalendarDays, { size: 14, className: "text-[#64748b]" }),
              "Date Range : ",
              /* @__PURE__ */ jsx("span", { className: "font-medium", children: dateRangeLabel }),
              " ",
              /* @__PURE__ */ jsx(ChevronDown, { size: 14 })
            ]
          }
        ),
        isDateRangeOpen ? /* @__PURE__ */ jsx(
          "div",
          {
            className: `absolute left-0 top-[calc(100%+6px)] z-40 overflow-visible rounded-lg border border-[#d7dce7] bg-white shadow-[0_10px_24px_rgba(15,23,42,0.12)] ${isCustomDateRangeOpen ? "w-[680px]" : "w-[165px]"}`,
            children: /* @__PURE__ */ jsxs("div", { className: "flex", children: [
              /* @__PURE__ */ jsx("div", { className: "w-[165px] border-r border-[#eef2f7]", children: /* @__PURE__ */ jsx("div", { className: "max-h-[280px] overflow-y-auto py-1", children: DATE_RANGE_OPTIONS.map((option) => {
                const isSelected = option.key === dateRangeDraftKey;
                return /* @__PURE__ */ jsxs(
                  "button",
                  {
                    type: "button",
                    onClick: () => {
                      if (option.key === "custom") {
                        const currentRange = dateRangeKey === "custom" ? customDateRange : selectedDateRange;
                        setDateRangeDraftKey("custom");
                        setCustomDateRangeDraft(currentRange);
                        setIsCustomDateRangeOpen(true);
                        return;
                      }
                      setDateRangeKey(option.key);
                      setDateRangeDraftKey(option.key);
                      setIsCustomDateRangeOpen(false);
                      setIsDateRangeOpen(false);
                    },
                    className: `flex w-full items-center justify-between px-4 py-2 text-left text-sm ${isSelected ? "font-medium text-[#0f172a]" : "text-[#334155] hover:bg-[#f8fafc]"}`,
                    children: [
                      /* @__PURE__ */ jsx("span", { children: option.label }),
                      isSelected ? /* @__PURE__ */ jsx(Check, { size: 14, className: "text-[#0f172a]" }) : null
                    ]
                  },
                  option.key
                );
              }) }) }),
              isCustomDateRangeOpen ? /* @__PURE__ */ jsxs("div", { className: "flex-1 p-3", children: [
                /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-2 gap-3", children: [
                  /* @__PURE__ */ jsxs("div", { children: [
                    /* @__PURE__ */ jsx("div", { className: "mb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#64748b]", children: "Start Date" }),
                    /* @__PURE__ */ jsxs("div", { className: "relative", children: [
                      /* @__PURE__ */ jsx(CalendarDays, { size: 14, className: "pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#64748b]" }),
                      /* @__PURE__ */ jsx(
                        "input",
                        {
                          type: "text",
                          readOnly: true,
                          value: formatPickerDate(customDateRangeDraft.start),
                          className: "h-10 w-full rounded border border-[#1b6f7b] bg-white pl-9 pr-3 text-sm text-[#334155] outline-none"
                        }
                      )
                    ] })
                  ] }),
                  /* @__PURE__ */ jsxs("div", { children: [
                    /* @__PURE__ */ jsx("div", { className: "mb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#64748b]", children: "End Date" }),
                    /* @__PURE__ */ jsxs("div", { className: "relative", children: [
                      /* @__PURE__ */ jsx(CalendarDays, { size: 14, className: "pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#64748b]" }),
                      /* @__PURE__ */ jsx(
                        "input",
                        {
                          type: "text",
                          readOnly: true,
                          value: formatPickerDate(customDateRangeDraft.end),
                          className: "h-10 w-full rounded border border-[#1b6f7b] bg-white pl-9 pr-3 text-sm text-[#334155] outline-none"
                        }
                      )
                    ] })
                  ] })
                ] }),
                /* @__PURE__ */ jsx("div", { className: "mt-3 grid grid-cols-[1fr_1fr] gap-3", children: [
                  { month: customDateRangeMonth, side: "start" },
                  { month: addMonths(customDateRangeMonth, 1), side: "end" }
                ].map(({ month, side }) => {
                  const monthLabel = month.toLocaleDateString("en-US", { month: "short", year: "numeric" });
                  const weeks = buildCalendarGrid(month);
                  return /* @__PURE__ */ jsxs("div", { className: "rounded-lg border border-[#eef2f7] bg-white p-2", children: [
                    /* @__PURE__ */ jsxs("div", { className: "mb-2 flex items-center justify-between gap-2 px-1", children: [
                      /* @__PURE__ */ jsx(
                        "button",
                        {
                          type: "button",
                          onClick: () => setCustomDateRangeMonth((prev) => addMonths(prev, -1)),
                          className: "inline-flex h-6 w-6 items-center justify-center rounded hover:bg-[#f8fafc]",
                          "aria-label": "Previous month",
                          children: /* @__PURE__ */ jsx(ChevronRight, { size: 14, className: "rotate-180 text-[#64748b]" })
                        }
                      ),
                      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-1", children: [
                        /* @__PURE__ */ jsx(
                          "select",
                          {
                            value: month.getMonth(),
                            onChange: (event) => side === "start" ? setLeftCalendarMonth(Number(event.target.value), month.getFullYear()) : setRightCalendarMonth(Number(event.target.value), month.getFullYear()),
                            className: "h-6 rounded border border-[#cfd6e4] bg-white px-1 text-[11px] text-[#334155] outline-none",
                            children: MONTH_NAMES.map((monthName, index) => /* @__PURE__ */ jsx("option", { value: index, children: monthName }, monthName))
                          }
                        ),
                        /* @__PURE__ */ jsx(
                          "select",
                          {
                            value: month.getFullYear(),
                            onChange: (event) => side === "start" ? setLeftCalendarMonth(month.getMonth(), Number(event.target.value)) : setRightCalendarMonth(month.getMonth(), Number(event.target.value)),
                            className: "h-6 rounded border border-[#cfd6e4] bg-white px-1 text-[11px] text-[#334155] outline-none",
                            children: CALENDAR_YEAR_OPTIONS.map((year) => /* @__PURE__ */ jsx("option", { value: year, children: year }, year))
                          }
                        )
                      ] }),
                      /* @__PURE__ */ jsx(
                        "button",
                        {
                          type: "button",
                          onClick: () => setCustomDateRangeMonth((prev) => addMonths(prev, 1)),
                          className: "inline-flex h-6 w-6 items-center justify-center rounded hover:bg-[#f8fafc]",
                          "aria-label": "Next month",
                          children: /* @__PURE__ */ jsx(ChevronRight, { size: 14, className: "text-[#64748b]" })
                        }
                      )
                    ] }),
                    /* @__PURE__ */ jsxs("table", { className: "w-full table-fixed border-collapse text-center text-[11px]", children: [
                      /* @__PURE__ */ jsx("thead", { children: /* @__PURE__ */ jsx("tr", { className: "text-[#1b6f7b]", children: ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => /* @__PURE__ */ jsx("th", { className: "pb-1 font-semibold", children: day }, day)) }) }),
                      /* @__PURE__ */ jsx("tbody", { children: weeks.map((week, weekIndex) => /* @__PURE__ */ jsx("tr", { children: week.map((day) => {
                        const inCurrentMonth = isSameMonth(day, month);
                        const isStart = isSameDay(day, customDateRangeDraft.start);
                        const isEnd = isSameDay(day, customDateRangeDraft.end);
                        const inRange = day >= customDateRangeDraft.start && day <= customDateRangeDraft.end;
                        const isToday = isSameDay(day, /* @__PURE__ */ new Date());
                        return /* @__PURE__ */ jsx("td", { className: "p-0", children: /* @__PURE__ */ jsx(
                          "button",
                          {
                            type: "button",
                            onClick: () => side === "start" ? handleCustomStartDateClick(day) : handleCustomEndDateClick(day),
                            className: `m-[1px] flex h-7 w-full items-center justify-center rounded text-[11px] ${!inCurrentMonth ? "text-[#cbd5e1]" : isStart || isEnd ? "bg-[#1b6f7b] font-semibold text-white" : inRange ? "bg-[#d9eff1] text-[#0f172a]" : "text-[#334155] hover:bg-[#f8fafc]"} ${isToday && !isStart && !isEnd ? "ring-1 ring-inset ring-[#1b6f7b]/30" : ""}`,
                            children: day.getDate()
                          }
                        ) }, day.toISOString());
                      }) }, `${side}-week-${weekIndex}`)) })
                    ] })
                  ] }, `${side}-${monthLabel}`);
                }) }),
                /* @__PURE__ */ jsxs("div", { className: "mt-3 flex items-center justify-between gap-2", children: [
                  /* @__PURE__ */ jsxs("div", { className: "text-xs text-[#64748b]", children: [
                    formatPickerDate(customDateRangeDraft.start),
                    " - ",
                    formatPickerDate(customDateRangeDraft.end)
                  ] }),
                  /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
                    /* @__PURE__ */ jsx(
                      "button",
                      {
                        type: "button",
                        onClick: cancelDateRangeSelection,
                        className: "inline-flex h-8 items-center rounded border border-[#d4d9e4] bg-white px-3 text-sm text-[#334155] hover:bg-[#f8fafc]",
                        children: "Cancel"
                      }
                    ),
                    /* @__PURE__ */ jsx(
                      "button",
                      {
                        type: "button",
                        onClick: applyCustomDateRange,
                        className: "inline-flex h-8 items-center rounded bg-[#1b6f7b] px-3 text-sm font-semibold text-white hover:bg-[#155963]",
                        children: "Apply"
                      }
                    )
                  ] })
                ] })
              ] }) : null
            ] })
          }
        ) : null
      ] }),
      /* @__PURE__ */ jsxs(
        "button",
        {
          type: "button",
          onClick: () => {
            closeAllOpenPanels();
            refreshReport();
          },
          className: "inline-flex h-8 items-center gap-1 rounded bg-[#1b6f7b] px-4 text-sm font-semibold text-white hover:bg-[#155963]",
          children: [
            /* @__PURE__ */ jsx(CalendarDays, { size: 14 }),
            " Run Report"
          ]
        }
      )
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "rounded-lg border border-[#e5e7eb] bg-white", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap items-center justify-end gap-4 border-b border-[#eef2f7] px-4 py-3 text-sm text-[#475569]", children: [
        /* @__PURE__ */ jsxs("div", { ref: compareWithRef, className: "relative", children: [
          /* @__PURE__ */ jsxs(
            "button",
            {
              type: "button",
              onClick: openCompareWithDropdown,
              className: `inline-flex items-center gap-1 hover:text-[#0f172a] ${isCompareWithOpen ? "text-[#0f172a]" : ""}`,
              "aria-haspopup": "menu",
              "aria-expanded": isCompareWithOpen,
              children: [
                "Compare With : ",
                /* @__PURE__ */ jsx("span", { className: "font-semibold text-[#0f172a]", children: getCompareWithLabel(compareWithKey) }),
                /* @__PURE__ */ jsx(ChevronDown, { size: 14, className: `transition-transform duration-150 ${isCompareWithOpen ? "rotate-180" : ""}` })
              ]
            }
          ),
          isCompareWithOpen ? /* @__PURE__ */ jsxs("div", { className: "absolute right-0 top-[calc(100%+6px)] z-50 w-[252px] overflow-visible rounded-lg border border-[#d7dce7] bg-white shadow-[0_10px_24px_rgba(15,23,42,0.12)]", children: [
            /* @__PURE__ */ jsx("div", { className: "border-b border-[#eef2f7] px-4 py-3 text-sm font-medium text-[#0f172a]", children: "Compare With" }),
            /* @__PURE__ */ jsxs("div", { className: "p-3", children: [
              /* @__PURE__ */ jsxs(
                "button",
                {
                  type: "button",
                  onClick: () => setIsCompareWithSelectOpen((prev) => !prev),
                  className: "relative flex h-10 w-full items-center justify-between rounded border border-[#1b6f7b] bg-white px-3 pr-9 text-sm text-[#334155] outline-none hover:bg-[#f8fafc]",
                  "aria-haspopup": "menu",
                  "aria-expanded": isCompareWithSelectOpen,
                  children: [
                    /* @__PURE__ */ jsx("span", { className: "min-w-0 truncate", children: getCompareWithLabel(compareWithDraftKey) }),
                    /* @__PURE__ */ jsx(
                      ChevronDown,
                      {
                        size: 14,
                        className: `pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 transition-transform duration-150 ${isCompareWithSelectOpen ? "rotate-180 text-[#1b6f7b]" : "text-[#64748b]"}`
                      }
                    )
                  ]
                }
              ),
              isCompareWithSelectOpen ? /* @__PURE__ */ jsxs("div", { className: "mt-2 overflow-hidden rounded-lg border border-[#d7dce7] bg-white shadow-[0_10px_24px_rgba(15,23,42,0.12)]", children: [
                /* @__PURE__ */ jsx("div", { className: "border-b border-[#eef2f7] p-2", children: /* @__PURE__ */ jsxs("div", { className: "relative", children: [
                  /* @__PURE__ */ jsx(
                    "input",
                    {
                      value: compareWithSearch,
                      onChange: (event) => setCompareWithSearch(event.target.value),
                      placeholder: "Search",
                      className: "h-9 w-full rounded-md border border-[#1b6f7b] bg-white pl-8 pr-3 text-sm text-[#334155] outline-none placeholder:text-[#94a3b8]"
                    }
                  ),
                  /* @__PURE__ */ jsx(Search, { size: 14, className: "pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[#94a3b8]" })
                ] }) }),
                /* @__PURE__ */ jsx("div", { className: "max-h-[180px] overflow-y-auto py-1", children: filteredCompareWithOptions.length > 0 ? filteredCompareWithOptions.map((option) => {
                  const isSelected = compareWithDraftKey === option.key;
                  return /* @__PURE__ */ jsxs(
                    "button",
                    {
                      type: "button",
                      onClick: () => {
                        setCompareWithDraftKey(option.key);
                        setIsCompareWithSelectOpen(false);
                      },
                      className: `flex w-full items-center justify-between px-3 py-2 text-left text-sm ${isSelected ? "font-medium text-[#0f172a]" : "text-[#334155] hover:bg-[#f8fafc]"}`,
                      children: [
                        /* @__PURE__ */ jsx("span", { children: option.label }),
                        isSelected ? /* @__PURE__ */ jsx(Check, { size: 14, className: "text-[#64748b]" }) : null
                      ]
                    },
                    option.key
                  );
                }) : /* @__PURE__ */ jsx("div", { className: "px-3 py-3 text-sm uppercase tracking-[0.04em] text-[#64748b]", children: "No results found" }) })
              ] }) : null,
              compareWithDraftKey !== "none" ? /* @__PURE__ */ jsxs("div", { className: "mt-3", children: [
                /* @__PURE__ */ jsx("div", { className: "mb-2 text-sm text-[#334155]", children: compareWithDraftKey === "previous-years" ? "Number of Year(s)" : "Number of Period(s)" }),
                /* @__PURE__ */ jsxs("div", { ref: compareWithCountRef, className: "relative", children: [
                  /* @__PURE__ */ jsxs(
                    "button",
                    {
                      type: "button",
                      onClick: () => setIsCompareWithCountOpen((prev) => !prev),
                      className: "relative flex h-10 w-full items-center justify-between rounded border border-[#1b6f7b] bg-white px-3 pr-9 text-sm text-[#334155] outline-none hover:bg-[#f8fafc]",
                      "aria-haspopup": "menu",
                      "aria-expanded": isCompareWithCountOpen,
                      children: [
                        /* @__PURE__ */ jsx("span", { className: "min-w-0 truncate", children: compareWithDraftCount }),
                        /* @__PURE__ */ jsx(
                          ChevronDown,
                          {
                            size: 14,
                            className: `pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 transition-transform duration-150 ${isCompareWithCountOpen ? "rotate-180 text-[#1b6f7b]" : "text-[#64748b]"}`
                          }
                        )
                      ]
                    }
                  ),
                  isCompareWithCountOpen ? /* @__PURE__ */ jsxs("div", { className: "absolute left-0 top-[calc(100%+6px)] z-[80] w-[168px] overflow-hidden rounded-lg border border-[#d7dce7] bg-white shadow-[0_10px_24px_rgba(15,23,42,0.12)]", children: [
                    /* @__PURE__ */ jsx("div", { className: "border-b border-[#eef2f7] p-2", children: /* @__PURE__ */ jsxs("div", { className: "relative", children: [
                      /* @__PURE__ */ jsx(
                        "input",
                        {
                          value: compareWithCountSearch,
                          onChange: (event) => setCompareWithCountSearch(event.target.value),
                          placeholder: "Search",
                          className: "h-9 w-full rounded-md border border-[#1b6f7b] bg-white pl-8 pr-3 text-sm text-[#334155] outline-none placeholder:text-[#94a3b8]"
                        }
                      ),
                      /* @__PURE__ */ jsx(Search, { size: 14, className: "pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[#94a3b8]" })
                    ] }) }),
                    /* @__PURE__ */ jsx("div", { className: "max-h-[220px] overflow-y-auto py-1", children: filteredCompareWithNumberOptions.length > 0 ? filteredCompareWithNumberOptions.map((option) => {
                      const isSelected = String(compareWithDraftCount) === option;
                      return /* @__PURE__ */ jsxs(
                        "button",
                        {
                          type: "button",
                          onClick: () => {
                            setCompareWithDraftCount(Number(option));
                            setIsCompareWithCountOpen(false);
                          },
                          className: `flex w-full items-center justify-between px-3 py-2 text-left text-sm ${isSelected ? "font-medium text-[#0f172a]" : "text-[#334155] hover:bg-[#f8fafc]"}`,
                          children: [
                            /* @__PURE__ */ jsx("span", { children: option }),
                            isSelected ? /* @__PURE__ */ jsx(Check, { size: 14, className: "text-[#64748b]" }) : null
                          ]
                        },
                        option
                      );
                    }) : /* @__PURE__ */ jsx("div", { className: "px-3 py-3 text-sm uppercase tracking-[0.04em] text-[#64748b]", children: "No results found" }) })
                  ] }) : null
                ] }),
                /* @__PURE__ */ jsxs("label", { className: "mt-3 flex items-start gap-2 text-sm text-[#334155]", children: [
                  /* @__PURE__ */ jsx(
                    "input",
                    {
                      type: "checkbox",
                      checked: compareWithDraftArrangeLatest,
                      onChange: (event) => setCompareWithDraftArrangeLatest(event.target.checked),
                      className: "mt-1 h-4 w-4 rounded border-[#cfd6e4] text-[#1b6f7b] focus:ring-[#1b6f7b]"
                    }
                  ),
                  /* @__PURE__ */ jsx("span", { children: "Arrange period/year from latest to oldest" })
                ] })
              ] }) : null
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 border-t border-[#eef2f7] px-4 py-3", children: [
              /* @__PURE__ */ jsx(
                "button",
                {
                  type: "button",
                  onClick: applyCompareWith,
                  className: "inline-flex h-8 items-center rounded bg-[#1b6f7b] px-3 text-sm font-semibold text-white hover:bg-[#155963]",
                  children: "Apply"
                }
              ),
              /* @__PURE__ */ jsx(
                "button",
                {
                  type: "button",
                  onClick: cancelCompareWith,
                  className: "inline-flex h-8 items-center rounded border border-[#d4d9e4] bg-white px-3 text-sm text-[#334155] hover:bg-[#f8fafc]",
                  children: "Cancel"
                }
              )
            ] })
          ] }) : null
        ] }),
        /* @__PURE__ */ jsxs(
          "button",
          {
            type: "button",
            onClick: (event) => {
              event.stopPropagation();
              openCustomizeReportColumnsModal();
            },
            className: "inline-flex items-center gap-1 hover:text-[#0f172a]",
            children: [
              /* @__PURE__ */ jsx(Columns3, { size: 14 }),
              "Customize Report Columns",
              /* @__PURE__ */ jsx("span", { className: "inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#d9eff1] px-1 text-[11px] font-semibold text-[#1b6f7b]", children: selectedReportColumns.length })
            ]
          }
        )
      ] }),
      isCustomizeColumnsOpen ? /* @__PURE__ */ jsx(
        "div",
        {
          className: customizeReportTab === "general" ? "absolute inset-0 z-[90] bg-white" : "fixed inset-0 z-[90] flex items-start justify-center overflow-y-auto bg-[#111827]/55 px-4 py-8",
          onMouseDown: customizeReportTab === "columns" ? (event) => {
            if (event.target === event.currentTarget) {
              cancelCustomizeColumns();
            }
          } : void 0,
          children: /* @__PURE__ */ jsxs(
            "div",
            {
              className: customizeReportTab === "general" ? "flex h-full w-full flex-col bg-white" : `flex w-full flex-col overflow-hidden rounded-md bg-white shadow-[0_24px_80px_rgba(15,23,42,0.28)] max-w-[760px]`,
              onMouseDown: (event) => event.stopPropagation(),
              children: [
                /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between border-b border-[#eef2f7] px-4 py-3", children: [
                  /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3", children: [
                    customizeReportTab === "general" ? /* @__PURE__ */ jsx(
                      "button",
                      {
                        type: "button",
                        className: "inline-flex h-8 w-8 items-center justify-center rounded border border-[#d4d9e4] bg-white text-[#334155]",
                        "aria-label": "Customize report menu",
                        children: /* @__PURE__ */ jsx(Menu, { size: 16 })
                      }
                    ) : null,
                    /* @__PURE__ */ jsx("div", { className: "text-[20px] font-medium text-[#111827]", children: customizeReportTab === "columns" ? "Customize Report Columns" : "Customize Report" })
                  ] }),
                  /* @__PURE__ */ jsx(
                    "button",
                    {
                      type: "button",
                      onClick: cancelCustomizeColumns,
                      className: "inline-flex h-8 w-8 items-center justify-center rounded text-[#ef4444] hover:bg-[#fef2f2]",
                      "aria-label": "Close customize report",
                      children: /* @__PURE__ */ jsx(X, { size: 16 })
                    }
                  )
                ] }),
                /* @__PURE__ */ jsxs("div", { className: `flex min-h-[640px] flex-1 overflow-hidden ${customizeReportTab === "columns" ? "flex-col" : ""}`, children: [
                  customizeReportTab === "general" ? /* @__PURE__ */ jsxs("aside", { className: "w-[150px] shrink-0 border-r border-[#eef2f7] bg-[#fbfcfe] px-0 py-2", children: [
                    /* @__PURE__ */ jsx(
                      "button",
                      {
                        type: "button",
                        onClick: () => setCustomizeReportTab("general"),
                        className: "flex w-full items-center border-l-4 border-[#1b6f7b] bg-white px-4 py-3 text-left text-sm font-medium text-[#0f172a]",
                        children: "General"
                      }
                    ),
                    /* @__PURE__ */ jsx(
                      "button",
                      {
                        type: "button",
                        onClick: () => setCustomizeReportTab("columns"),
                        className: "flex w-full items-center px-4 py-3 text-left text-sm text-[#2563eb] hover:bg-[#f8fafc]",
                        children: "Show / Hide Columns"
                      }
                    )
                  ] }) : null,
                  /* @__PURE__ */ jsx("main", { className: `min-w-0 flex-1 overflow-auto ${customizeReportTab === "columns" ? "px-5 py-6" : "px-6 py-6"}`, children: customizeReportTab === "general" ? /* @__PURE__ */ jsxs("div", { className: "space-y-6", children: [
                    /* @__PURE__ */ jsxs("section", { children: [
                      /* @__PURE__ */ jsx("div", { className: "text-sm font-medium text-[#111827]", children: "Date Range" }),
                      /* @__PURE__ */ jsxs("div", { ref: customizeDateRangeRef, className: "relative mt-2 inline-block", children: [
                        /* @__PURE__ */ jsxs(
                          "button",
                          {
                            type: "button",
                            onClick: () => {
                              setIsCustomizeCompareOpen(false);
                              setIsCustomizeCompareCountOpen(false);
                              setIsCustomizeEntityOpen(false);
                              setIsCustomizeDateRangeOpen((prev) => {
                                const next = !prev;
                                if (!next) {
                                  setIsCustomizeCustomDateRangeOpen(false);
                                } else {
                                  setIsCustomizeCustomDateRangeOpen(customizeDateRangeDraftKey === "custom");
                                }
                                return next;
                              });
                            },
                            className: "inline-flex h-9 min-w-[250px] items-center justify-between rounded border border-[#cfd6e4] bg-white px-3 pr-10 text-sm text-[#334155] hover:bg-[#f8fafc]",
                            "aria-haspopup": "menu",
                            "aria-expanded": isCustomizeDateRangeOpen,
                            children: [
                              /* @__PURE__ */ jsxs("span", { className: "inline-flex items-center gap-2 truncate", children: [
                                /* @__PURE__ */ jsx(CalendarDays, { size: 14, className: "text-[#64748b]" }),
                                /* @__PURE__ */ jsx("span", { children: customizeDateRangeLabel })
                              ] }),
                              /* @__PURE__ */ jsx(
                                ChevronDown,
                                {
                                  size: 14,
                                  className: `pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 transition-transform duration-150 ${isCustomizeDateRangeOpen ? "rotate-180 text-[#1b6f7b]" : "text-[#64748b]"}`
                                }
                              )
                            ]
                          }
                        ),
                        isCustomizeDateRangeOpen ? /* @__PURE__ */ jsx(
                          "div",
                          {
                            className: `absolute left-0 top-[calc(100%+6px)] z-50 overflow-visible rounded-lg border border-[#d7dce7] bg-white shadow-[0_10px_24px_rgba(15,23,42,0.12)] ${isCustomizeCustomDateRangeOpen ? "w-[680px]" : "w-[165px]"}`,
                            children: /* @__PURE__ */ jsxs("div", { className: "flex", children: [
                              /* @__PURE__ */ jsx("div", { className: "w-[165px] border-r border-[#eef2f7]", children: /* @__PURE__ */ jsx("div", { className: "max-h-[280px] overflow-y-auto py-1", children: DATE_RANGE_OPTIONS.map((option) => {
                                const isSelected = option.key === customizeDateRangeDraftKey;
                                return /* @__PURE__ */ jsxs(
                                  "button",
                                  {
                                    type: "button",
                                    onClick: () => {
                                      if (option.key === "custom") {
                                        const currentRange = customizeDateRangeDraftKey === "custom" ? customizeCustomDateRangeDraft : getDateRangeValue(customizeDateRangeDraftKey);
                                        setCustomizeDateRangeDraftKey("custom");
                                        setCustomizeCustomDateRangeDraft(currentRange);
                                        setCustomizeCustomDateRangeMonth(getStartOfMonth(currentRange.start));
                                        setIsCustomizeCustomDateRangeOpen(true);
                                        return;
                                      }
                                      setCustomizeDateRangeDraftKey(option.key);
                                      setIsCustomizeCustomDateRangeOpen(false);
                                      setIsCustomizeDateRangeOpen(false);
                                    },
                                    className: `flex w-full items-center justify-between px-4 py-2 text-left text-sm ${isSelected ? "font-medium text-[#0f172a]" : "text-[#334155] hover:bg-[#f8fafc]"}`,
                                    children: [
                                      /* @__PURE__ */ jsx("span", { children: option.label }),
                                      isSelected ? /* @__PURE__ */ jsx(Check, { size: 14, className: "text-[#0f172a]" }) : null
                                    ]
                                  },
                                  option.key
                                );
                              }) }) }),
                              isCustomizeCustomDateRangeOpen ? /* @__PURE__ */ jsxs("div", { className: "flex-1 p-3", children: [
                                /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-2 gap-3", children: [
                                  /* @__PURE__ */ jsxs("div", { children: [
                                    /* @__PURE__ */ jsx("div", { className: "mb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#64748b]", children: "Start Date" }),
                                    /* @__PURE__ */ jsxs("div", { className: "relative", children: [
                                      /* @__PURE__ */ jsx(
                                        CalendarDays,
                                        {
                                          size: 14,
                                          className: "pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#64748b]"
                                        }
                                      ),
                                      /* @__PURE__ */ jsx(
                                        "input",
                                        {
                                          type: "text",
                                          readOnly: true,
                                          value: formatPickerDate(customizeCustomDateRangeDraft.start),
                                          className: "h-10 w-full rounded border border-[#1b6f7b] bg-white pl-9 pr-3 text-sm text-[#334155] outline-none"
                                        }
                                      )
                                    ] })
                                  ] }),
                                  /* @__PURE__ */ jsxs("div", { children: [
                                    /* @__PURE__ */ jsx("div", { className: "mb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#64748b]", children: "End Date" }),
                                    /* @__PURE__ */ jsxs("div", { className: "relative", children: [
                                      /* @__PURE__ */ jsx(
                                        CalendarDays,
                                        {
                                          size: 14,
                                          className: "pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#64748b]"
                                        }
                                      ),
                                      /* @__PURE__ */ jsx(
                                        "input",
                                        {
                                          type: "text",
                                          readOnly: true,
                                          value: formatPickerDate(customizeCustomDateRangeDraft.end),
                                          className: "h-10 w-full rounded border border-[#1b6f7b] bg-white pl-9 pr-3 text-sm text-[#334155] outline-none"
                                        }
                                      )
                                    ] })
                                  ] })
                                ] }),
                                /* @__PURE__ */ jsx("div", { className: "mt-3 grid grid-cols-[1fr_1fr] gap-3", children: [
                                  { month: customizeCustomDateRangeMonth, side: "start" },
                                  { month: addMonths(customizeCustomDateRangeMonth, 1), side: "end" }
                                ].map(({ month, side }) => {
                                  const weeks = buildCalendarGrid(month);
                                  return /* @__PURE__ */ jsxs("div", { className: "rounded-lg border border-[#eef2f7] bg-white p-2", children: [
                                    /* @__PURE__ */ jsxs("div", { className: "mb-2 flex items-center justify-between gap-2 px-1", children: [
                                      /* @__PURE__ */ jsx(
                                        "button",
                                        {
                                          type: "button",
                                          onClick: () => setCustomizeCustomDateRangeMonth((prev) => addMonths(prev, -1)),
                                          className: "inline-flex h-6 w-6 items-center justify-center rounded hover:bg-[#f8fafc]",
                                          "aria-label": "Previous month",
                                          children: /* @__PURE__ */ jsx(ChevronRight, { size: 14, className: "rotate-180 text-[#64748b]" })
                                        }
                                      ),
                                      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-1", children: [
                                        /* @__PURE__ */ jsx(
                                          "select",
                                          {
                                            value: month.getMonth(),
                                            onChange: (event) => side === "start" ? setCustomizeLeftCalendarMonth(Number(event.target.value), month.getFullYear()) : setCustomizeRightCalendarMonth(Number(event.target.value), month.getFullYear()),
                                            className: "h-6 rounded border border-[#cfd6e4] bg-white px-1 text-[11px] text-[#334155] outline-none",
                                            children: MONTH_NAMES.map((monthName, index) => /* @__PURE__ */ jsx("option", { value: index, children: monthName }, monthName))
                                          }
                                        ),
                                        /* @__PURE__ */ jsx(
                                          "select",
                                          {
                                            value: month.getFullYear(),
                                            onChange: (event) => side === "start" ? setCustomizeLeftCalendarMonth(month.getMonth(), Number(event.target.value)) : setCustomizeRightCalendarMonth(month.getMonth(), Number(event.target.value)),
                                            className: "h-6 rounded border border-[#cfd6e4] bg-white px-1 text-[11px] text-[#334155] outline-none",
                                            children: CALENDAR_YEAR_OPTIONS.map((year) => /* @__PURE__ */ jsx("option", { value: year, children: year }, year))
                                          }
                                        )
                                      ] }),
                                      /* @__PURE__ */ jsx(
                                        "button",
                                        {
                                          type: "button",
                                          onClick: () => setCustomizeCustomDateRangeMonth((prev) => addMonths(prev, 1)),
                                          className: "inline-flex h-6 w-6 items-center justify-center rounded hover:bg-[#f8fafc]",
                                          "aria-label": "Next month",
                                          children: /* @__PURE__ */ jsx(ChevronRight, { size: 14, className: "text-[#64748b]" })
                                        }
                                      )
                                    ] }),
                                    /* @__PURE__ */ jsxs("table", { className: "w-full table-fixed border-collapse text-center text-[11px]", children: [
                                      /* @__PURE__ */ jsx("thead", { children: /* @__PURE__ */ jsx("tr", { className: "text-[#1b6f7b]", children: ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => /* @__PURE__ */ jsx("th", { className: "pb-1 font-semibold", children: day }, day)) }) }),
                                      /* @__PURE__ */ jsx("tbody", { children: weeks.map((week, weekIndex) => /* @__PURE__ */ jsx("tr", { children: week.map((day) => {
                                        const inCurrentMonth = isSameMonth(day, month);
                                        const isStart = isSameDay(day, customizeCustomDateRangeDraft.start);
                                        const isEnd = isSameDay(day, customizeCustomDateRangeDraft.end);
                                        const inRange = day >= customizeCustomDateRangeDraft.start && day <= customizeCustomDateRangeDraft.end;
                                        const isToday = isSameDay(day, /* @__PURE__ */ new Date());
                                        return /* @__PURE__ */ jsx("td", { className: "p-0", children: /* @__PURE__ */ jsx(
                                          "button",
                                          {
                                            type: "button",
                                            onClick: () => side === "start" ? handleCustomizeCustomStartDateClick(day) : handleCustomizeCustomEndDateClick(day),
                                            className: `m-[1px] flex h-7 w-full items-center justify-center rounded text-[11px] ${!inCurrentMonth ? "text-[#cbd5e1]" : isStart || isEnd ? "bg-[#1b6f7b] font-semibold text-white" : inRange ? "bg-[#d9eff1] text-[#0f172a]" : "text-[#334155] hover:bg-[#f8fafc]"} ${isToday && !isStart && !isEnd ? "ring-1 ring-inset ring-[#1b6f7b]/30" : ""}`,
                                            children: day.getDate()
                                          }
                                        ) }, day.toISOString());
                                      }) }, `${side}-week-${weekIndex}`)) })
                                    ] })
                                  ] }, `${side}-${month.toISOString()}`);
                                }) }),
                                /* @__PURE__ */ jsxs("div", { className: "mt-3 flex items-center justify-between gap-2", children: [
                                  /* @__PURE__ */ jsxs("div", { className: "text-xs text-[#64748b]", children: [
                                    formatPickerDate(customizeCustomDateRangeDraft.start),
                                    " - ",
                                    formatPickerDate(customizeCustomDateRangeDraft.end)
                                  ] }),
                                  /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
                                    /* @__PURE__ */ jsx(
                                      "button",
                                      {
                                        type: "button",
                                        onClick: () => {
                                          setIsCustomizeCustomDateRangeOpen(false);
                                          setIsCustomizeDateRangeOpen(false);
                                        },
                                        className: "inline-flex h-8 items-center rounded border border-[#d4d9e4] bg-white px-3 text-sm text-[#334155] hover:bg-[#f8fafc]",
                                        children: "Cancel"
                                      }
                                    ),
                                    /* @__PURE__ */ jsx(
                                      "button",
                                      {
                                        type: "button",
                                        onClick: () => {
                                          setIsCustomizeCustomDateRangeOpen(false);
                                          setIsCustomizeDateRangeOpen(false);
                                        },
                                        className: "inline-flex h-8 items-center rounded bg-[#1b6f7b] px-3 text-sm font-semibold text-white hover:bg-[#155963]",
                                        children: "Apply"
                                      }
                                    )
                                  ] })
                                ] })
                              ] }) : null
                            ] })
                          }
                        ) : null
                      ] })
                    ] }),
                    /* @__PURE__ */ jsx("hr", { className: "border-[#e5e7eb]" }),
                    /* @__PURE__ */ jsxs("section", { className: "space-y-6", children: [
                      /* @__PURE__ */ jsxs("div", { className: "grid gap-6 md:grid-cols-2", children: [
                        /* @__PURE__ */ jsxs("div", { ref: customizeCompareRef, className: "relative", children: [
                          /* @__PURE__ */ jsx("div", { className: "text-sm font-medium text-[#111827]", children: "Compare With" }),
                          /* @__PURE__ */ jsxs("div", { className: "relative mt-2 w-full max-w-[260px]", children: [
                            /* @__PURE__ */ jsxs(
                              "button",
                              {
                                type: "button",
                                onClick: () => {
                                  setIsCustomizeCompareCountOpen(false);
                                  setIsCustomizeCompareOpen((prev) => !prev);
                                },
                                className: "inline-flex h-9 w-full items-center justify-between rounded border border-[#cfd6e4] bg-white px-3 pr-12 text-sm text-[#334155] hover:bg-[#f8fafc]",
                                "aria-haspopup": "menu",
                                "aria-expanded": isCustomizeCompareOpen,
                                children: [
                                  /* @__PURE__ */ jsx("span", { className: "truncate", children: getCompareWithLabel(compareWithDraftKey) }),
                                  /* @__PURE__ */ jsx(
                                    ChevronDown,
                                    {
                                      size: 14,
                                      className: `pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 transition-transform duration-150 ${isCustomizeCompareOpen ? "rotate-180 text-[#1b6f7b]" : "text-[#64748b]"}`
                                    }
                                  )
                                ]
                              }
                            ),
                            compareWithDraftKey !== "none" ? /* @__PURE__ */ jsx(
                              "button",
                              {
                                type: "button",
                                onClick: () => {
                                  setCompareWithDraftKey("none");
                                  setCompareWithDraftCount(1);
                                  setCompareWithDraftArrangeLatest(false);
                                  setIsCustomizeCompareOpen(false);
                                  setIsCustomizeCompareCountOpen(false);
                                },
                                className: "absolute right-8 top-1/2 inline-flex h-4 w-4 -translate-y-1/2 items-center justify-center text-[#ef4444]",
                                "aria-label": "Clear compare selection",
                                children: /* @__PURE__ */ jsx(X, { size: 12 })
                              }
                            ) : null
                          ] }),
                          isCustomizeCompareOpen ? /* @__PURE__ */ jsxs("div", { className: "absolute left-0 top-[calc(100%+6px)] z-50 w-[260px] overflow-hidden rounded-lg border border-[#d7dce7] bg-white shadow-[0_10px_24px_rgba(15,23,42,0.12)]", children: [
                            /* @__PURE__ */ jsx("div", { className: "border-b border-[#eef2f7] p-2", children: /* @__PURE__ */ jsxs("div", { className: "relative", children: [
                              /* @__PURE__ */ jsx(
                                "input",
                                {
                                  value: customizeCompareSearch,
                                  onChange: (event) => setCustomizeCompareSearch(event.target.value),
                                  placeholder: "Search",
                                  className: "h-9 w-full rounded-md border border-[#1b6f7b] bg-white pl-8 pr-3 text-sm text-[#334155] outline-none placeholder:text-[#94a3b8]"
                                }
                              ),
                              /* @__PURE__ */ jsx(
                                Search,
                                {
                                  size: 14,
                                  className: "pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[#94a3b8]"
                                }
                              )
                            ] }) }),
                            /* @__PURE__ */ jsx("div", { className: "max-h-[170px] overflow-y-auto py-1", children: filteredCustomizeCompareOptions.length > 0 ? filteredCustomizeCompareOptions.map((option) => {
                              const isSelected = compareWithDraftKey === option.key;
                              return /* @__PURE__ */ jsxs(
                                "button",
                                {
                                  type: "button",
                                  onClick: () => {
                                    setCompareWithDraftKey(option.key);
                                    setIsCustomizeCompareOpen(false);
                                    setIsCustomizeCompareCountOpen(true);
                                    setCustomizeCompareCountSearch("");
                                    if (compareWithDraftCount < 1) {
                                      setCompareWithDraftCount(1);
                                    }
                                  },
                                  className: `flex w-full items-center justify-between px-3 py-2 text-left text-sm ${isSelected ? "bg-[#eef4ff] font-medium text-[#0f172a]" : "text-[#334155] hover:bg-[#f8fafc]"}`,
                                  children: [
                                    /* @__PURE__ */ jsx("span", { children: option.label }),
                                    isSelected ? /* @__PURE__ */ jsx(Check, { size: 14, className: "text-[#64748b]" }) : null
                                  ]
                                },
                                option.key
                              );
                            }) : /* @__PURE__ */ jsx("div", { className: "px-3 py-3 text-sm uppercase tracking-[0.04em] text-[#64748b]", children: "No results found" }) })
                          ] }) : null
                        ] }),
                        /* @__PURE__ */ jsx("div", { ref: customizeCompareCountRef, className: "relative", children: compareWithDraftKey !== "none" ? /* @__PURE__ */ jsxs(Fragment, { children: [
                          /* @__PURE__ */ jsx("div", { className: "text-sm font-medium text-[#111827]", children: compareWithDraftKey === "previous-years" ? "Number of Year(s)" : "Number of Period(s)" }),
                          /* @__PURE__ */ jsxs(
                            "button",
                            {
                              type: "button",
                              onClick: () => {
                                setIsCustomizeCompareOpen(false);
                                setIsCustomizeCompareCountOpen((prev) => !prev);
                              },
                              className: "mt-2 inline-flex h-9 w-full max-w-[260px] items-center justify-between rounded border border-[#cfd6e4] bg-white px-3 text-sm text-[#334155] hover:bg-[#f8fafc]",
                              "aria-haspopup": "menu",
                              "aria-expanded": isCustomizeCompareCountOpen,
                              children: [
                                /* @__PURE__ */ jsx("span", { children: compareWithDraftCount }),
                                /* @__PURE__ */ jsx(
                                  ChevronDown,
                                  {
                                    size: 14,
                                    className: `transition-transform duration-150 ${isCustomizeCompareCountOpen ? "rotate-180 text-[#1b6f7b]" : "text-[#64748b]"}`
                                  }
                                )
                              ]
                            }
                          ),
                          isCustomizeCompareCountOpen ? /* @__PURE__ */ jsxs("div", { className: "absolute left-0 top-[calc(100%+6px)] z-50 w-[168px] overflow-hidden rounded-lg border border-[#d7dce7] bg-white shadow-[0_10px_24px_rgba(15,23,42,0.12)]", children: [
                            /* @__PURE__ */ jsx("div", { className: "border-b border-[#eef2f7] p-2", children: /* @__PURE__ */ jsxs("div", { className: "relative", children: [
                              /* @__PURE__ */ jsx(
                                "input",
                                {
                                  value: customizeCompareCountSearch,
                                  onChange: (event) => setCustomizeCompareCountSearch(event.target.value),
                                  placeholder: "Search",
                                  className: "h-9 w-full rounded-md border border-[#1b6f7b] bg-white pl-8 pr-3 text-sm text-[#334155] outline-none placeholder:text-[#94a3b8]"
                                }
                              ),
                              /* @__PURE__ */ jsx(
                                Search,
                                {
                                  size: 14,
                                  className: "pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[#94a3b8]"
                                }
                              )
                            ] }) }),
                            /* @__PURE__ */ jsx("div", { className: "max-h-[220px] overflow-y-auto py-1", children: filteredCustomizeCompareNumberOptions.length > 0 ? filteredCustomizeCompareNumberOptions.map((option) => {
                              const isSelected = String(compareWithDraftCount) === option;
                              return /* @__PURE__ */ jsxs(
                                "button",
                                {
                                  type: "button",
                                  onClick: () => {
                                    setCompareWithDraftCount(Number(option));
                                    setIsCustomizeCompareCountOpen(false);
                                  },
                                  className: `flex w-full items-center justify-between px-3 py-2 text-left text-sm ${isSelected ? "font-medium text-[#0f172a]" : "text-[#334155] hover:bg-[#f8fafc]"}`,
                                  children: [
                                    /* @__PURE__ */ jsx("span", { children: option }),
                                    isSelected ? /* @__PURE__ */ jsx(Check, { size: 14, className: "text-[#64748b]" }) : null
                                  ]
                                },
                                option
                              );
                            }) : /* @__PURE__ */ jsx("div", { className: "px-3 py-3 text-sm uppercase tracking-[0.04em] text-[#64748b]", children: "No results found" }) })
                          ] }) : null
                        ] }) : null })
                      ] }),
                      compareWithDraftKey !== "none" ? /* @__PURE__ */ jsxs("label", { className: "flex items-start gap-2 text-sm text-[#334155]", children: [
                        /* @__PURE__ */ jsx(
                          "input",
                          {
                            type: "checkbox",
                            checked: compareWithDraftArrangeLatest,
                            onChange: (event) => setCompareWithDraftArrangeLatest(event.target.checked),
                            className: "mt-1 h-4 w-4 rounded border-[#cfd6e4] text-[#1b6f7b] focus:ring-[#1b6f7b]"
                          }
                        ),
                        /* @__PURE__ */ jsx("span", { children: "Arrange period/year from latest to oldest" })
                      ] }) : null,
                      /* @__PURE__ */ jsxs("div", { ref: customizeEntityRef, className: "relative", children: [
                        /* @__PURE__ */ jsx("div", { className: "text-sm font-medium text-[#111827]", children: "Entities :" }),
                        /* @__PURE__ */ jsxs(
                          "button",
                          {
                            type: "button",
                            onClick: () => {
                              setIsCustomizeCompareOpen(false);
                              setIsCustomizeCompareCountOpen(false);
                              setIsCustomizeEntityOpen((prev) => !prev);
                            },
                            className: "mt-2 inline-flex h-9 w-full max-w-[260px] items-center justify-between rounded border border-[#cfd6e4] bg-white px-3 text-sm text-[#334155] hover:bg-[#f8fafc]",
                            "aria-haspopup": "menu",
                            "aria-expanded": isCustomizeEntityOpen,
                            children: [
                              /* @__PURE__ */ jsx("span", { className: "truncate", children: getEntitySelectionLabel(customizeEntityDraftKeys) }),
                              /* @__PURE__ */ jsx(
                                ChevronDown,
                                {
                                  size: 14,
                                  className: `transition-transform duration-150 ${isCustomizeEntityOpen ? "rotate-180 text-[#1b6f7b]" : "text-[#64748b]"}`
                                }
                              )
                            ]
                          }
                        ),
                        isCustomizeEntityOpen ? /* @__PURE__ */ jsxs("div", { className: "absolute left-0 top-[calc(100%+6px)] z-50 w-[260px] overflow-hidden rounded-lg border border-[#d7dce7] bg-white shadow-[0_10px_24px_rgba(15,23,42,0.12)]", children: [
                          /* @__PURE__ */ jsx("div", { className: "border-b border-[#eef2f7] p-2", children: /* @__PURE__ */ jsxs("div", { className: "relative", children: [
                            /* @__PURE__ */ jsx(
                              "input",
                              {
                                value: customizeEntitySearch,
                                onChange: (event) => setCustomizeEntitySearch(event.target.value),
                                placeholder: "Search",
                                className: "h-9 w-full rounded-md border border-[#1b6f7b] bg-white pl-8 pr-3 text-sm text-[#334155] outline-none placeholder:text-[#94a3b8]"
                              }
                            ),
                            /* @__PURE__ */ jsx(Search, { size: 14, className: "pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[#94a3b8]" })
                          ] }) }),
                          /* @__PURE__ */ jsx("div", { className: "max-h-[220px] overflow-y-auto py-1", children: ENTITY_OPTIONS.filter((option) => option.label.toLowerCase().includes(customizeEntitySearch.trim().toLowerCase())).length > 0 ? ENTITY_OPTIONS.filter((option) => option.label.toLowerCase().includes(customizeEntitySearch.trim().toLowerCase())).map((option) => {
                            const isSelected = customizeEntityDraftKeys.includes(option.key);
                            return /* @__PURE__ */ jsxs(
                              "button",
                              {
                                type: "button",
                                onClick: () => {
                                  setCustomizeEntityDraftKeys(
                                    (prev) => prev.includes(option.key) ? prev.filter((key) => key !== option.key) : [...prev, option.key]
                                  );
                                },
                                className: `flex w-full items-center gap-2 px-4 py-2 text-left text-sm ${isSelected ? "bg-[#f1f5f9] font-medium text-[#0f172a]" : "text-[#334155] hover:bg-[#f8fafc]"}`,
                                children: [
                                  /* @__PURE__ */ jsx("span", { className: "inline-flex h-4 w-4 items-center justify-center rounded border border-[#c7d0de] bg-white", children: isSelected ? /* @__PURE__ */ jsx(Check, { size: 12, className: "text-[#0f172a]" }) : null }),
                                  /* @__PURE__ */ jsx("span", { children: option.label })
                                ]
                              },
                              option.key
                            );
                          }) : /* @__PURE__ */ jsx("div", { className: "px-4 py-3 text-sm text-[#64748b]", children: "No results." }) })
                        ] }) : null
                      ] })
                    ] }),
                    /* @__PURE__ */ jsx("hr", { className: "border-[#e5e7eb]" }),
                    /* @__PURE__ */ jsxs("section", { ref: customizeMoreFiltersRef, children: [
                      /* @__PURE__ */ jsx("div", { className: "text-base font-semibold text-[#111827]", children: "Advanced Filters" }),
                      /* @__PURE__ */ jsx("p", { className: "mt-1 text-sm text-[#64748b]", children: "Use advanced filters to filter the report based on the fields of Reports, Locations." }),
                      customizeMoreFilterRows.length > 0 ? /* @__PURE__ */ jsx("div", { className: "mt-4 space-y-3", children: customizeMoreFilterRows.map((row, index) => {
                        const activeDropdown = customizeMoreFilterDropdown?.rowId === row.id ? customizeMoreFilterDropdown : null;
                        const fieldMenuOpen = activeDropdown?.kind === "field";
                        const comparatorMenuOpen = activeDropdown?.kind === "comparator";
                        const valueMenuOpen = activeDropdown?.kind === "value";
                        const fieldMenuSearch = fieldMenuOpen ? activeDropdown.search : "";
                        const comparatorMenuSearch = comparatorMenuOpen ? activeDropdown.search : "";
                        const filteredFieldGroups = getFilteredFieldGroups(fieldMenuSearch);
                        const filteredComparatorOptions = getFilteredComparatorOptions(comparatorMenuSearch, row.field);
                        const valueOptions = row.field ? MORE_FILTER_VALUE_OPTIONS[row.field] : [];
                        const valueMode = row.comparator && MORE_FILTER_NO_VALUE_COMPARATORS.includes(row.comparator) ? "none" : row.comparator && MORE_FILTER_TEXT_COMPARATORS.includes(row.comparator) ? "text" : "dropdown";
                        const fieldLabel = getMoreFilterFieldLabel(row.field);
                        const comparatorLabel = getMoreFilterComparatorLabel(row.comparator);
                        const valueLabel = valueMode === "text" ? row.value || "Enter a value" : row.value ? getMoreFilterValueLabel(row.field, row.value) : getMoreFilterValuePlaceholder(row.field);
                        return /* @__PURE__ */ jsxs(
                          "div",
                          {
                            className: "grid w-fit grid-cols-[34px_minmax(0,240px)_minmax(0,170px)_minmax(0,300px)_auto_auto] items-center gap-2",
                            children: [
                              /* @__PURE__ */ jsx("div", { className: "flex h-8 items-center justify-center rounded border border-[#d7dce7] bg-white text-xs text-[#475569]", children: index + 1 }),
                              /* @__PURE__ */ jsxs("div", { className: "relative", children: [
                                /* @__PURE__ */ jsxs(
                                  "button",
                                  {
                                    type: "button",
                                    onClick: () => openCustomizeMoreFilterDropdown(row.id, "field"),
                                    className: `relative flex h-8 w-full items-center overflow-hidden rounded border px-3 pr-10 text-sm text-[#334155] outline-none ${fieldMenuOpen ? "border-[#1b6f7b] bg-white" : "border-[#cfd6e4] bg-white hover:bg-[#f8fafc]"}`,
                                    "aria-haspopup": "menu",
                                    "aria-expanded": fieldMenuOpen,
                                    children: [
                                      /* @__PURE__ */ jsx("span", { className: `min-w-0 flex-1 truncate text-left ${row.field ? "font-medium" : "text-[#94a3b8]"}`, children: fieldLabel }),
                                      /* @__PURE__ */ jsx(
                                        ChevronDown,
                                        {
                                          size: 14,
                                          className: `pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 transition-transform duration-150 ${fieldMenuOpen ? "rotate-180 text-[#1b6f7b]" : "text-[#64748b]"}`
                                        }
                                      )
                                    ]
                                  }
                                ),
                                row.field ? /* @__PURE__ */ jsx(
                                  "button",
                                  {
                                    type: "button",
                                    onClick: (event) => {
                                      event.stopPropagation();
                                      setCustomizeMoreFilterRows(
                                        (prev) => prev.map((item) => item.id === row.id ? { ...item, field: "", comparator: "", value: "" } : item)
                                      );
                                      closeCustomizeMoreFilterDropdown();
                                    },
                                    className: "absolute right-7 top-1/2 inline-flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded text-[#ef4444] hover:bg-[#fef2f2]",
                                    "aria-label": "Clear field",
                                    children: /* @__PURE__ */ jsx(X, { size: 12 })
                                  }
                                ) : null,
                                fieldMenuOpen ? /* @__PURE__ */ jsxs("div", { className: "absolute left-0 top-[calc(100%+6px)] z-50 w-[240px] overflow-hidden rounded-lg border border-[#d7dce7] bg-white shadow-[0_10px_24px_rgba(15,23,42,0.12)]", children: [
                                  /* @__PURE__ */ jsx("div", { className: "border-b border-[#eef2f7] p-2", children: /* @__PURE__ */ jsxs("div", { className: "relative", children: [
                                    /* @__PURE__ */ jsx(
                                      "input",
                                      {
                                        value: fieldMenuSearch,
                                        onChange: (event) => setCustomizeMoreFilterDropdown((prev) => prev ? { ...prev, search: event.target.value } : prev),
                                        placeholder: "Search",
                                        className: "h-9 w-full rounded-md border border-[#1b6f7b] bg-white pl-8 pr-3 text-sm text-[#334155] outline-none placeholder:text-[#94a3b8]"
                                      }
                                    ),
                                    /* @__PURE__ */ jsx(
                                      Search,
                                      {
                                        size: 14,
                                        className: "pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[#94a3b8]"
                                      }
                                    )
                                  ] }) }),
                                  /* @__PURE__ */ jsx("div", { className: "max-h-[220px] overflow-y-auto py-1", children: filteredFieldGroups.length > 0 ? filteredFieldGroups.map((group) => /* @__PURE__ */ jsxs("div", { children: [
                                    /* @__PURE__ */ jsx("div", { className: "px-3 py-2 text-sm font-semibold text-[#475569]", children: group.label }),
                                    /* @__PURE__ */ jsx("div", { className: "pb-1", children: group.options.map((option) => {
                                      const isSelected = row.field === option.key;
                                      return /* @__PURE__ */ jsxs(
                                        "button",
                                        {
                                          type: "button",
                                          onClick: () => {
                                            setCustomizeMoreFilterRows(
                                              (prev) => prev.map(
                                                (item) => item.id === row.id ? { ...item, field: option.key, comparator: "", value: "" } : item
                                              )
                                            );
                                            closeCustomizeMoreFilterDropdown();
                                          },
                                          className: `flex w-full items-center justify-between px-3 py-2 text-left text-sm ${isSelected ? "bg-white font-medium text-[#0f172a]" : "text-[#334155] hover:bg-[#f8fafc]"}`,
                                          children: [
                                            /* @__PURE__ */ jsx("span", { children: option.label }),
                                            isSelected ? /* @__PURE__ */ jsx(Check, { size: 14, className: "text-[#64748b]" }) : null
                                          ]
                                        },
                                        option.key
                                      );
                                    }) })
                                  ] }, group.label)) : /* @__PURE__ */ jsx("div", { className: "px-3 py-3 text-sm uppercase tracking-[0.04em] text-[#64748b]", children: "No results found" }) })
                                ] }) : null
                              ] }),
                              /* @__PURE__ */ jsxs("div", { className: "relative", children: [
                                /* @__PURE__ */ jsxs(
                                  "button",
                                  {
                                    type: "button",
                                    onClick: () => {
                                      if (!row.field) return;
                                      openCustomizeMoreFilterDropdown(row.id, "comparator");
                                    },
                                    disabled: !row.field,
                                    className: `relative flex h-8 w-full items-center overflow-hidden rounded border px-3 pr-9 text-sm text-[#334155] outline-none ${row.field ? comparatorMenuOpen ? "border-[#1b6f7b] bg-white" : "border-[#cfd6e4] bg-white hover:bg-[#f8fafc]" : "cursor-not-allowed border-[#e2e8f0] bg-[#f8fafc] text-[#94a3b8]"}`,
                                    "aria-haspopup": "menu",
                                    "aria-expanded": comparatorMenuOpen,
                                    children: [
                                      /* @__PURE__ */ jsx("span", { className: `min-w-0 flex-1 truncate text-left ${row.field && row.comparator ? "font-medium" : "text-[#94a3b8]"}`, children: comparatorLabel }),
                                      /* @__PURE__ */ jsx(
                                        ChevronDown,
                                        {
                                          size: 14,
                                          className: `pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 transition-transform duration-150 ${comparatorMenuOpen ? "rotate-180 text-[#1b6f7b]" : row.field ? "text-[#64748b]" : "text-[#cbd5e1]"}`
                                        }
                                      )
                                    ]
                                  }
                                ),
                                comparatorMenuOpen ? /* @__PURE__ */ jsxs("div", { className: "absolute left-0 top-[calc(100%+6px)] z-50 w-[168px] overflow-hidden rounded-lg border border-[#d7dce7] bg-white shadow-[0_10px_24px_rgba(15,23,42,0.12)]", children: [
                                  /* @__PURE__ */ jsx("div", { className: "border-b border-[#eef2f7] p-2", children: /* @__PURE__ */ jsxs("div", { className: "relative", children: [
                                    /* @__PURE__ */ jsx(
                                      "input",
                                      {
                                        value: comparatorMenuSearch,
                                        onChange: (event) => setCustomizeMoreFilterDropdown((prev) => prev ? { ...prev, search: event.target.value } : prev),
                                        placeholder: "Search",
                                        className: "h-9 w-full rounded-md border border-[#1b6f7b] bg-white pl-8 pr-3 text-sm text-[#334155] outline-none placeholder:text-[#94a3b8]"
                                      }
                                    ),
                                    /* @__PURE__ */ jsx(
                                      Search,
                                      {
                                        size: 14,
                                        className: "pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[#94a3b8]"
                                      }
                                    )
                                  ] }) }),
                                  /* @__PURE__ */ jsx("div", { className: "max-h-[220px] overflow-y-auto py-1", children: filteredComparatorOptions.length > 0 ? filteredComparatorOptions.map((option) => {
                                    const isSelected = row.comparator === option.key;
                                    return /* @__PURE__ */ jsxs(
                                      "button",
                                      {
                                        type: "button",
                                        onClick: () => {
                                          setCustomizeMoreFilterRows(
                                            (prev) => prev.map((item) => item.id === row.id ? { ...item, comparator: option.key } : item)
                                          );
                                          closeCustomizeMoreFilterDropdown();
                                        },
                                        className: `flex w-full items-center justify-between px-3 py-2 text-left text-sm ${isSelected ? "font-medium text-[#0f172a]" : "text-[#334155] hover:bg-[#f8fafc]"}`,
                                        children: [
                                          /* @__PURE__ */ jsx("span", { children: option.label }),
                                          isSelected ? /* @__PURE__ */ jsx(Check, { size: 14, className: "text-[#64748b]" }) : null
                                        ]
                                      },
                                      option.key
                                    );
                                  }) : /* @__PURE__ */ jsx("div", { className: "px-3 py-3 text-sm uppercase tracking-[0.04em] text-[#64748b]", children: "No results found" }) })
                                ] }) : null
                              ] }),
                              /* @__PURE__ */ jsx("div", { className: "relative", children: valueMode === "none" ? /* @__PURE__ */ jsx("div", { className: "flex h-8 items-center rounded border border-[#e2e8f0] bg-[#f8fafc] px-3 text-sm text-[#94a3b8]", children: "No value needed" }) : valueMode === "text" ? /* @__PURE__ */ jsx(
                                "input",
                                {
                                  type: "text",
                                  value: row.value,
                                  onChange: (event) => {
                                    setCustomizeMoreFilterRows(
                                      (prev) => prev.map((item) => item.id === row.id ? { ...item, value: event.target.value } : item)
                                    );
                                  },
                                  placeholder: "Enter a value",
                                  className: "h-8 w-full rounded border border-[#cfd6e4] bg-white px-3 text-sm text-[#334155] outline-none placeholder:text-[#94a3b8] focus:border-[#1b6f7b]"
                                }
                              ) : /* @__PURE__ */ jsxs(Fragment, { children: [
                                /* @__PURE__ */ jsxs(
                                  "button",
                                  {
                                    type: "button",
                                    onClick: () => {
                                      if (!row.field) return;
                                      openCustomizeMoreFilterDropdown(row.id, "value");
                                    },
                                    disabled: !row.field,
                                    className: `relative flex h-8 w-full items-center overflow-hidden rounded border px-3 pr-9 text-sm outline-none ${row.field ? valueMenuOpen ? "border-[#1b6f7b] bg-white text-[#334155]" : "border-[#cfd6e4] bg-white text-[#334155] hover:bg-[#f8fafc]" : "cursor-not-allowed border-[#e2e8f0] bg-[#f8fafc] text-[#94a3b8]"}`,
                                    "aria-haspopup": "menu",
                                    "aria-expanded": valueMenuOpen,
                                    children: [
                                      /* @__PURE__ */ jsx("span", { className: `min-w-0 flex-1 truncate text-left ${row.value ? "font-medium" : "text-[#94a3b8]"}`, children: valueLabel }),
                                      /* @__PURE__ */ jsx(
                                        ChevronDown,
                                        {
                                          size: 14,
                                          className: `pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 transition-transform duration-150 ${valueMenuOpen ? "rotate-180 text-[#1b6f7b]" : row.field ? "text-[#64748b]" : "text-[#cbd5e1]"}`
                                        }
                                      )
                                    ]
                                  }
                                ),
                                valueMenuOpen && row.field ? /* @__PURE__ */ jsx("div", { className: "absolute left-0 top-[calc(100%+6px)] z-50 w-[220px] overflow-hidden rounded-lg border border-[#d7dce7] bg-white shadow-[0_10px_24px_rgba(15,23,42,0.12)]", children: /* @__PURE__ */ jsx("div", { className: "max-h-[220px] overflow-y-auto py-1", children: valueOptions.length > 0 ? valueOptions.map((option) => {
                                  const isSelected = row.value === option.key;
                                  return /* @__PURE__ */ jsxs(
                                    "button",
                                    {
                                      type: "button",
                                      onClick: () => {
                                        setCustomizeMoreFilterRows(
                                          (prev) => prev.map(
                                            (item) => item.id === row.id ? { ...item, value: option.key.startsWith("select-") ? "" : option.key } : item
                                          )
                                        );
                                        closeCustomizeMoreFilterDropdown();
                                      },
                                      className: `flex w-full items-center justify-between px-3 py-2 text-left text-sm ${isSelected ? "bg-[#f1f5f9] font-medium text-[#0f172a]" : "text-[#334155] hover:bg-[#f8fafc]"}`,
                                      children: [
                                        /* @__PURE__ */ jsx("span", { children: option.label }),
                                        isSelected ? /* @__PURE__ */ jsx(Check, { size: 14, className: "text-[#64748b]" }) : null
                                      ]
                                    },
                                    option.key
                                  );
                                }) : /* @__PURE__ */ jsx("div", { className: "px-3 py-3 text-sm uppercase tracking-[0.04em] text-[#64748b]", children: "No results found" }) }) }) : null
                              ] }) }),
                              /* @__PURE__ */ jsx(
                                "button",
                                {
                                  type: "button",
                                  onClick: addCustomizeMoreFilterRow,
                                  className: "inline-flex h-8 w-8 items-center justify-center rounded border border-[#cfd6e4] text-[#334155] hover:bg-[#f8fafc]",
                                  "aria-label": "Add filter row",
                                  children: /* @__PURE__ */ jsx(Plus, { size: 14 })
                                }
                              ),
                              /* @__PURE__ */ jsx(
                                "button",
                                {
                                  type: "button",
                                  onClick: () => {
                                    setCustomizeMoreFilterRows((prev) => prev.length > 1 ? prev.filter((item) => item.id !== row.id) : prev);
                                    if (customizeMoreFilterDropdown?.rowId === row.id) {
                                      closeCustomizeMoreFilterDropdown();
                                    }
                                  },
                                  className: "inline-flex h-8 w-8 items-center justify-center rounded border border-[#cfd6e4] text-[#334155] hover:bg-[#fef2f2]",
                                  "aria-label": "Remove filter row",
                                  children: /* @__PURE__ */ jsx(X, { size: 14, className: "text-[#ef4444]" })
                                }
                              )
                            ]
                          },
                          row.id
                        );
                      }) }) : null,
                      /* @__PURE__ */ jsxs(
                        "button",
                        {
                          type: "button",
                          onClick: addCustomizeMoreFilterRow,
                          className: "mt-4 inline-flex items-center gap-1 text-sm font-medium text-[#1b6f7b] hover:underline",
                          children: [
                            /* @__PURE__ */ jsx(Plus, { size: 14 }),
                            "Add More"
                          ]
                        }
                      )
                    ] })
                  ] }) : /* @__PURE__ */ jsx("div", { className: "flex min-h-0 flex-col gap-5", children: /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-[minmax(0,1fr)_56px_minmax(0,1fr)] gap-4", children: [
                    /* @__PURE__ */ jsxs("div", { children: [
                      /* @__PURE__ */ jsx("div", { className: "mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-[#64748b]", children: "Available Columns" }),
                      /* @__PURE__ */ jsxs("div", { className: "rounded-lg border border-[#d7dce7] bg-white", children: [
                        /* @__PURE__ */ jsx("div", { className: "border-b border-[#eef2f7] p-2", children: /* @__PURE__ */ jsxs("div", { className: "relative", children: [
                          /* @__PURE__ */ jsx(
                            "input",
                            {
                              value: customizeColumnsSearch,
                              onChange: (event) => setCustomizeColumnsSearch(event.target.value),
                              placeholder: "Search",
                              className: "h-9 w-full rounded-md border border-[#d7dce7] bg-white pl-8 pr-3 text-sm text-[#334155] outline-none placeholder:text-[#94a3b8] focus:border-[#1b6f7b]"
                            }
                          ),
                          /* @__PURE__ */ jsx(Search, { size: 14, className: "pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[#94a3b8]" })
                        ] }) }),
                        /* @__PURE__ */ jsx("div", { className: "max-h-[440px] overflow-y-auto py-1", children: filteredCustomizeGroups.length > 0 ? filteredCustomizeGroups.map((group) => /* @__PURE__ */ jsxs("div", { children: [
                          /* @__PURE__ */ jsx("div", { className: "px-4 py-2 text-sm font-medium text-[#9aa3b2]", children: group.label }),
                          /* @__PURE__ */ jsx("div", { className: "pb-1", children: group.options.map((option) => {
                            const isActive = customizeActiveAvailableColumn === option.key;
                            return /* @__PURE__ */ jsx(
                              "button",
                              {
                                type: "button",
                                onClick: () => setCustomizeActiveAvailableColumn(option.key),
                                className: `flex w-full items-center px-4 py-2 text-left text-sm ${isActive ? "bg-[#eef4ff] font-medium text-[#0f172a]" : "text-[#334155] hover:bg-[#f8fafc]"}`,
                                children: option.label
                              },
                              option.key
                            );
                          }) })
                        ] }, group.label)) : /* @__PURE__ */ jsx("div", { className: "px-4 py-3 text-sm text-[#64748b]", children: "No results found" }) })
                      ] })
                    ] }),
                    /* @__PURE__ */ jsx("div", { className: "flex items-center justify-center", children: /* @__PURE__ */ jsx(
                      "button",
                      {
                        type: "button",
                        onClick: () => {
                          if (customizeActiveAvailableColumn) {
                            addCustomizeColumn(customizeActiveAvailableColumn);
                          }
                        },
                        disabled: !customizeActiveAvailableColumn,
                        className: "inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#8a94c9] bg-white text-[#475569] hover:bg-[#f8fafc] disabled:cursor-not-allowed disabled:opacity-50",
                        "aria-label": "Add selected column",
                        children: /* @__PURE__ */ jsx(ChevronRight, { size: 18 })
                      }
                    ) }),
                    /* @__PURE__ */ jsxs("div", { children: [
                      /* @__PURE__ */ jsx("div", { className: "mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-[#64748b]", children: "Selected Columns" }),
                      /* @__PURE__ */ jsx("div", { className: "rounded-lg border border-[#d7dce7] bg-white", children: /* @__PURE__ */ jsx("div", { className: "max-h-[440px] overflow-y-auto p-3", children: /* @__PURE__ */ jsx("div", { className: "space-y-1", children: selectedCustomizeColumns.map((option) => /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between rounded px-3 py-2 text-sm text-[#334155] hover:bg-[#f8fafc]", children: [
                        /* @__PURE__ */ jsxs("div", { className: "min-w-0", children: [
                          /* @__PURE__ */ jsx("div", { className: "truncate", children: option.label }),
                          /* @__PURE__ */ jsxs("div", { className: "text-xs text-[#94a3b8]", children: [
                            "(",
                            getReportColumnGroupLabel(option.key),
                            ")"
                          ] })
                        ] }),
                        option.locked ? null : /* @__PURE__ */ jsx(
                          "button",
                          {
                            type: "button",
                            onClick: () => removeCustomizeColumn(option.key),
                            className: "ml-2 inline-flex h-6 w-6 items-center justify-center rounded text-[#ef4444] hover:bg-[#fef2f2]",
                            "aria-label": `Remove ${option.label}`,
                            children: /* @__PURE__ */ jsx(X, { size: 13 })
                          }
                        )
                      ] }, option.key)) }) }) })
                    ] })
                  ] }) }) })
                ] }),
                /* @__PURE__ */ jsx("div", { className: "border-t border-[#eef2f7] px-6 py-4", children: /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
                  /* @__PURE__ */ jsx(
                    "button",
                    {
                      type: "button",
                      onClick: () => {
                        applyCustomizeColumns();
                        refreshReport();
                      },
                      className: "inline-flex h-9 items-center rounded bg-[#1b6f7b] px-4 text-sm font-semibold text-white hover:bg-[#155963]",
                      children: "Run Report"
                    }
                  ),
                  /* @__PURE__ */ jsx(
                    "button",
                    {
                      type: "button",
                      onClick: cancelCustomizeColumns,
                      className: "inline-flex h-9 items-center rounded border border-[#d4d9e4] bg-white px-4 text-sm text-[#334155] hover:bg-[#f8fafc]",
                      children: "Cancel"
                    }
                  )
                ] }) })
              ]
            }
          )
        }
      ) : null,
      /* @__PURE__ */ jsxs("div", { className: "border-b border-[#eef2f7] px-4 py-10 text-center", children: [
        organizationName ? /* @__PURE__ */ jsx("p", { className: "text-sm text-[#6b7280]", children: organizationName }) : null,
        /* @__PURE__ */ jsx("h2", { className: "mt-2 text-[22px] font-semibold text-[#111827]", children: reportName }),
        /* @__PURE__ */ jsxs("p", { className: "mt-1 text-sm text-[#475569]", children: [
          "From ",
          formatDate(selectedDateRange.start),
          " To ",
          formatDate(selectedDateRange.end)
        ] })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "overflow-x-auto", children: /* @__PURE__ */ jsxs("table", { className: "w-full min-w-[720px] border-collapse", children: [
        /* @__PURE__ */ jsx("thead", { children: /* @__PURE__ */ jsx("tr", { className: "border-b border-[#e5e7eb] text-left text-[11px] uppercase tracking-[0.08em] text-[#64748b]", children: visibleReportColumns.map((column) => /* @__PURE__ */ jsx(
          "th",
          {
            className: `px-4 py-3 font-semibold ${column.kind === "text" ? "text-left" : "text-center"}`,
            children: column.label
          },
          column.key
        )) }) }),
        /* @__PURE__ */ jsx("tbody", { children: isReportLoading ? /* @__PURE__ */ jsx("tr", { className: "border-b border-[#eef2f7]", children: /* @__PURE__ */ jsx("td", { className: "px-4 py-8 text-center text-sm text-[#64748b]", colSpan: visibleReportColumns.length, children: "Loading report data..." }) }) : reportError ? /* @__PURE__ */ jsx("tr", { className: "border-b border-[#eef2f7]", children: /* @__PURE__ */ jsx("td", { className: "px-4 py-8 text-center text-sm text-[#b91c1c]", colSpan: visibleReportColumns.length, children: reportError }) }) : reportRows.length === 0 ? /* @__PURE__ */ jsx("tr", { className: "border-b border-[#eef2f7]", children: /* @__PURE__ */ jsx("td", { className: "px-4 py-8 text-center text-sm text-[#64748b]", colSpan: visibleReportColumns.length, children: "No report rows found for the selected filters." }) }) : /* @__PURE__ */ jsxs(Fragment, { children: [
          reportRows.map((row, index) => /* @__PURE__ */ jsx("tr", { className: "border-b border-[#eef2f7]", children: visibleReportColumns.map((column) => /* @__PURE__ */ jsx(
            "td",
            {
              className: `px-4 py-3 text-sm ${column.kind === "text" ? "text-left" : "text-center"} ${column.key === "name" ? "font-medium text-[#2563eb]" : "text-[#2563eb]"}`,
              children: formatReportColumnValue(column.key, row.values[column.key])
            },
            column.key
          )) }, `${index}-${row.values.name ?? index}`)),
          /* @__PURE__ */ jsx("tr", { className: "border-b border-[#e5e7eb]", children: reportColumnTotals.map((value, index) => {
            const column = visibleReportColumns[index];
            return /* @__PURE__ */ jsx(
              "td",
              {
                className: `px-4 py-3 text-sm ${column.kind === "text" ? "text-left" : "text-center"} ${column.key === "name" ? "font-semibold text-[#111827]" : "text-[#111827]"}`,
                children: value
              },
              column.key
            );
          }) })
        ] }) })
      ] }) })
    ] })
  ] });
}
const SalesByCustomerReportView = SalesBySalesPersonReportView;
function ReportDetailPage() {
  const navigate = useNavigate();
  const { categoryId, reportId } = useParams();
  const category = getCategoryById(categoryId || "");
  const report = getReportById(categoryId || "", reportId || "");
  const [isReportsDrawerOpen, setIsReportsDrawerOpen] = useState(false);
  const [isReportActivityOpen, setIsReportActivityOpen] = useState(false);
  const reportsMenuButtonRef = useRef(null);
  const dateLabel = useMemo(() => {
    const now = /* @__PURE__ */ new Date();
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return `From ${formatDate(from)} To ${formatDate(to)}`;
  }, []);
  const [calculatorInputs, setCalculatorInputs] = useState(() => {
    if (!report?.calculator) return {};
    return report.calculator.fields.reduce((acc, field) => {
      acc[field.key] = field.defaultValue;
      return acc;
    }, {});
  });
  if (!categoryId || !reportId || !category || !report) {
    return /* @__PURE__ */ jsx(Navigate, { to: "/reports", replace: true });
  }
  const calculatorResult = report.calculator ? report.calculator.calculate(calculatorInputs) : null;
  const calculatorPrecision = report.calculator?.precision ?? 2;
  if (report.id === "sales-by-customer") {
    return /* @__PURE__ */ jsxs("div", { className: "relative min-h-[calc(100vh-64px)] pt-3", children: [
      /* @__PURE__ */ jsx(
        ReportsDrawer,
        {
          open: isReportsDrawerOpen,
          currentCategoryId: category.id,
          currentReportId: report.id,
          triggerRef: reportsMenuButtonRef,
          onClose: () => setIsReportsDrawerOpen(false)
        }
      ),
      /* @__PURE__ */ jsx(ReportActivityDrawer, { open: isReportActivityOpen, onClose: () => setIsReportActivityOpen(false) }),
      /* @__PURE__ */ jsx(
        "div",
        {
          className: `pr-3 transition-[padding-left,padding-right] duration-200 ${isReportsDrawerOpen ? "lg:pl-[260px]" : ""} ${isReportActivityOpen ? "lg:pr-[300px]" : ""}`,
          children: /* @__PURE__ */ jsx(
            SalesByCustomerReportView,
            {
              categoryName: category.name,
              reportName: report.name,
              menuButtonRef: reportsMenuButtonRef,
              onMenuClick: () => setIsReportsDrawerOpen((prev) => !prev),
              onActivityClick: () => setIsReportActivityOpen((prev) => !prev),
              onClosePage: () => navigate("/reports"),
              onRunReport: () => toast.success(`Report refreshed: ${report.name}`)
            }
          )
        }
      )
    ] });
  }
  if (report.id === "sales-by-item") {
    return /* @__PURE__ */ jsxs("div", { className: "relative min-h-[calc(100vh-64px)] pt-3", children: [
      /* @__PURE__ */ jsx(
        ReportsDrawer,
        {
          open: isReportsDrawerOpen,
          currentCategoryId: category.id,
          currentReportId: report.id,
          triggerRef: reportsMenuButtonRef,
          onClose: () => setIsReportsDrawerOpen(false)
        }
      ),
      /* @__PURE__ */ jsx(ReportActivityDrawer, { open: isReportActivityOpen, onClose: () => setIsReportActivityOpen(false) }),
      /* @__PURE__ */ jsx(
        "div",
        {
          className: `pr-3 transition-[padding-left,padding-right] duration-200 ${isReportsDrawerOpen ? "lg:pl-[260px]" : ""} ${isReportActivityOpen ? "lg:pr-[300px]" : ""}`,
          children: /* @__PURE__ */ jsx(
            SalesByItemReportView,
            {
              categoryName: category.name,
              reportName: report.name,
              menuButtonRef: reportsMenuButtonRef,
              onMenuClick: () => setIsReportsDrawerOpen((prev) => !prev),
              onActivityClick: () => setIsReportActivityOpen((prev) => !prev),
              onClosePage: () => navigate("/reports"),
              onRunReport: () => toast.success(`Report refreshed: ${report.name}`)
            }
          )
        }
      )
    ] });
  }
  return /* @__PURE__ */ jsxs("div", { className: "relative min-h-[calc(100vh-64px)] pt-3", children: [
    /* @__PURE__ */ jsx(
      ReportsDrawer,
      {
        open: isReportsDrawerOpen,
        currentCategoryId: category.id,
        currentReportId: report.id,
        triggerRef: reportsMenuButtonRef,
        onClose: () => setIsReportsDrawerOpen(false)
      }
    ),
    /* @__PURE__ */ jsx("div", { className: `pr-3 transition-[padding-left] duration-200 ${isReportsDrawerOpen ? "lg:pl-[260px]" : ""}`, children: /* @__PURE__ */ jsxs("div", { className: "space-y-4", children: [
      /* @__PURE__ */ jsx(
        ReportDetailHeader,
        {
          categoryName: category.name,
          reportName: report.name,
          dateLabel,
          menuButtonRef: reportsMenuButtonRef,
          onMenuClick: () => setIsReportsDrawerOpen((prev) => !prev),
          onRunReport: () => toast.success(`Report refreshed: ${report.name}`),
          onClosePage: () => navigate("/reports")
        }
      ),
      /* @__PURE__ */ jsxs("section", { className: "grid grid-cols-1 gap-4 xl:grid-cols-3", children: [
        /* @__PURE__ */ jsxs("div", { className: "rounded-lg border border-[#d7dce7] bg-white p-4 xl:col-span-2", children: [
          /* @__PURE__ */ jsx("h2", { className: "text-base font-semibold text-[#0f172a]", children: "Report Overview" }),
          /* @__PURE__ */ jsx("p", { className: "mt-2 text-sm text-[#475569]", children: report.summary }),
          /* @__PURE__ */ jsx("h3", { className: "mt-4 text-sm font-semibold text-[#0f172a]", children: "How It Helps" }),
          /* @__PURE__ */ jsx("p", { className: "mt-1 text-sm text-[#475569]", children: report.howItHelps }),
          report.formula ? /* @__PURE__ */ jsxs(Fragment, { children: [
            /* @__PURE__ */ jsx("h3", { className: "mt-4 text-sm font-semibold text-[#0f172a]", children: "Logic / Formula" }),
            /* @__PURE__ */ jsx("p", { className: "mt-1 rounded border border-[#e2e8f0] bg-[#f8fafc] px-3 py-2 text-sm text-[#1e293b]", children: report.formula })
          ] }) : null,
          report.logicNotes?.length ? /* @__PURE__ */ jsxs(Fragment, { children: [
            /* @__PURE__ */ jsx("h3", { className: "mt-4 text-sm font-semibold text-[#0f172a]", children: "Logic Notes" }),
            /* @__PURE__ */ jsx("ul", { className: "mt-1 space-y-1 text-sm text-[#475569]", children: report.logicNotes.map((note) => /* @__PURE__ */ jsxs("li", { children: [
              "- ",
              note
            ] }, note)) })
          ] }) : null
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "rounded-lg border border-[#d7dce7] bg-white p-4", children: [
          /* @__PURE__ */ jsx("h2", { className: "text-base font-semibold text-[#0f172a]", children: "Source and Basis" }),
          /* @__PURE__ */ jsxs("div", { className: "mt-3 space-y-2 text-sm", children: [
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("p", { className: "font-medium text-[#334155]", children: "Category" }),
              /* @__PURE__ */ jsx("p", { className: "text-[#64748b]", children: category.name })
            ] }),
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("p", { className: "font-medium text-[#334155]", children: "Accounting Basis" }),
              /* @__PURE__ */ jsx("p", { className: "text-[#64748b]", children: report.basis || "As configured in report settings" })
            ] }),
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("p", { className: "font-medium text-[#334155]", children: "Source" }),
              /* @__PURE__ */ jsx("p", { className: "text-[#64748b]", children: report.source || "Entity-specific source based on applied filters" })
            ] })
          ] })
        ] })
      ] }),
      report.calculator ? /* @__PURE__ */ jsxs("section", { className: "rounded-lg border border-[#d7dce7] bg-white p-4", children: [
        /* @__PURE__ */ jsx("h2", { className: "text-base font-semibold text-[#0f172a]", children: "Logic Check" }),
        /* @__PURE__ */ jsx("p", { className: "mt-1 text-sm text-[#64748b]", children: "Use this calculator to validate the reporting formula with your own values." }),
        /* @__PURE__ */ jsx("div", { className: "mt-3 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4", children: report.calculator.fields.map((field) => /* @__PURE__ */ jsxs("label", { className: "block", children: [
          /* @__PURE__ */ jsx("span", { className: "mb-1 block text-xs font-medium uppercase tracking-wide text-[#64748b]", children: field.label }),
          /* @__PURE__ */ jsx(
            "input",
            {
              type: "number",
              value: calculatorInputs[field.key] ?? 0,
              onChange: (event) => {
                const value = Number(event.target.value);
                setCalculatorInputs((prev) => ({ ...prev, [field.key]: Number.isFinite(value) ? value : 0 }));
              },
              className: "h-9 w-full rounded border border-[#cfd6e4] px-3 text-sm text-[#0f172a] outline-none focus:border-[#1b6f7b]"
            }
          )
        ] }, field.key)) }),
        /* @__PURE__ */ jsxs("div", { className: "mt-4 rounded border border-[#bfdbfe] bg-[#eff6ff] px-4 py-3", children: [
          /* @__PURE__ */ jsx("p", { className: "text-xs uppercase tracking-wide text-[#1d4ed8]", children: report.calculator.resultLabel }),
          /* @__PURE__ */ jsx("p", { className: "text-2xl font-semibold text-[#1e40af]", children: (calculatorResult || 0).toFixed(calculatorPrecision) }),
          report.calculator.helpText ? /* @__PURE__ */ jsx("p", { className: "mt-1 text-xs text-[#1e3a8a]", children: report.calculator.helpText }) : null
        ] })
      ] }) : null,
      /* @__PURE__ */ jsxs("section", { className: "rounded-lg border border-[#d7dce7] bg-white p-4", children: [
        /* @__PURE__ */ jsx("h2", { className: "text-base font-semibold text-[#0f172a]", children: "Supported Functions" }),
        /* @__PURE__ */ jsx("div", { className: "mt-3 overflow-x-auto", children: /* @__PURE__ */ jsxs("table", { className: "w-full min-w-[720px] border-collapse", children: [
          /* @__PURE__ */ jsx("thead", { children: /* @__PURE__ */ jsxs("tr", { className: "border-b border-[#e2e8f0] bg-[#f8fafc]", children: [
            /* @__PURE__ */ jsx("th", { className: "px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-[#64748b]", children: "Function" }),
            /* @__PURE__ */ jsx("th", { className: "px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-[#64748b]", children: "Support" })
          ] }) }),
          /* @__PURE__ */ jsx("tbody", { children: REPORT_FUNCTION_LABELS.map((item) => {
            const supported = Boolean(report.functionSupport[item.key]);
            return /* @__PURE__ */ jsxs("tr", { className: "border-b border-[#eef2f7]", children: [
              /* @__PURE__ */ jsx("td", { className: "px-3 py-2 text-sm text-[#334155]", children: item.label }),
              /* @__PURE__ */ jsx("td", { className: "px-3 py-2 text-sm", children: /* @__PURE__ */ jsx("span", { className: supported ? "rounded bg-[#dcfce7] px-2 py-1 text-xs font-semibold text-[#166534]" : "rounded bg-[#f1f5f9] px-2 py-1 text-xs font-semibold text-[#475569]", children: supported ? "Supported" : "Not Supported" }) })
            ] }, item.key);
          }) })
        ] }) })
      ] })
    ] }) })
  ] });
}
export {
  SalesBySalesPersonReportView,
  ReportDetailPage as default
};
