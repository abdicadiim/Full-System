import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import {
  CalendarDays,
  Check,
  ChevronDown,
  ChevronRight,
  Filter,
  Folder,
  Menu,
  RefreshCw,
  X,
} from "lucide-react";
import { getCategoryById, getReportById } from "./reportsCatalog";
import { useSettings } from "../../lib/settings/SettingsContext";
import { REPORTS_BY_CATEGORY } from "./reportsCatalog";

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

const CALENDAR_YEAR_OPTIONS = Array.from({ length: 120 }, (_, index) => 2007 + index);

const getStartOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1);

const addMonths = (date: Date, amount: number) =>
  new Date(date.getFullYear(), date.getMonth() + amount, 1);

const isSameDay = (left: Date, right: Date) =>
  left.getFullYear() === right.getFullYear() &&
  left.getMonth() === right.getMonth() &&
  left.getDate() === right.getDate();

const isSameMonth = (left: Date, right: Date) =>
  left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth();

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
  | "all-time"
  | "custom";

type DateRangeOption = {
  key: DateRangeKey;
  label: string;
};

type DateRangeValue = {
  start: Date;
  end: Date;
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
  { key: "all-time", label: "All Time" },
  { key: "custom", label: "Custom" },
];

const getDateRangeValue = (key: DateRangeKey, customRange?: DateRangeValue): DateRangeValue => {
  const now = new Date();
  const startOfDay = (value: Date) => new Date(value.getFullYear(), value.getMonth(), value.getDate());
  const endOfDay = (value: Date) =>
    new Date(value.getFullYear(), value.getMonth(), value.getDate(), 23, 59, 59, 999);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  switch (key) {
    case "today":
      return { start: startOfDay(now), end: endOfDay(now) };
    case "yesterday": {
      const d = new Date(now);
      d.setDate(d.getDate() - 1);
      return { start: startOfDay(d), end: endOfDay(d) };
    }
    case "this-week": {
      const start = startOfDay(now);
      start.setDate(start.getDate() - start.getDay());
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      return { start, end: endOfDay(end) };
    }
    case "previous-week": {
      const start = startOfDay(now);
      start.setDate(start.getDate() - start.getDay() - 7);
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      return { start, end: endOfDay(end) };
    }
    case "this-month":
      return { start: monthStart, end: monthEnd };
    case "previous-month":
      return {
        start: new Date(now.getFullYear(), now.getMonth() - 1, 1),
        end: new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999),
      };
    case "this-quarter": {
      const quarter = Math.floor(now.getMonth() / 3) * 3;
      return {
        start: new Date(now.getFullYear(), quarter, 1),
        end: new Date(now.getFullYear(), quarter + 3, 0, 23, 59, 59, 999),
      };
    }
    case "previous-quarter": {
      const quarter = Math.floor(now.getMonth() / 3) * 3 - 3;
      return {
        start: new Date(now.getFullYear(), quarter, 1),
        end: new Date(now.getFullYear(), quarter + 3, 0, 23, 59, 59, 999),
      };
    }
    case "this-year":
      return {
        start: new Date(now.getFullYear(), 0, 1),
        end: new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999),
      };
    case "previous-year":
      return {
        start: new Date(now.getFullYear() - 1, 0, 1),
        end: new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999),
      };
    case "all-time":
      return {
        start: new Date(1970, 0, 1),
        end: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999),
      };
    case "custom":
      return customRange || { start: monthStart, end: monthEnd };
    default:
      return { start: monthStart, end: monthEnd };
  }
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
    reportIds: ["tax-summary"],
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
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search reports"
            className="h-9 w-full rounded-lg border border-[#d8dfea] bg-white pl-3 pr-3 text-sm text-[#334155] outline-none placeholder:text-[#94a3b8] focus:border-[#7da0ff]"
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

export default function WithholdingTaxReportPage() {
  const navigate = useNavigate();
  const menuButtonRef = useRef<HTMLButtonElement | null>(null);
  const exportButtonRef = useRef<HTMLButtonElement | null>(null);
  const { settings } = useSettings();
  const category = getCategoryById("payments-received");
  const report = getReportById("payments-received", "withholding-tax");
  const [isReportsDrawerOpen, setIsReportsDrawerOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [dateRangeKey, setDateRangeKey] = useState<DateRangeKey>("this-month");
  const [dateRangeDraftKey, setDateRangeDraftKey] = useState<DateRangeKey>("this-month");
  const [dateRangeOpen, setDateRangeOpen] = useState(false);
  const [isCustomDateRangeOpen, setIsCustomDateRangeOpen] = useState(false);
  const [customDateRange, setCustomDateRange] = useState<DateRangeValue>(() =>
    getDateRangeValue("this-month"),
  );
  const [customDateRangeDraft, setCustomDateRangeDraft] = useState<DateRangeValue>(() =>
    getDateRangeValue("this-month"),
  );
  const [customDateRangeMonth, setCustomDateRangeMonth] = useState<Date>(() =>
    getStartOfMonth(getDateRangeValue("this-month").start),
  );
  const organizationName = String(
    settings?.general?.companyDisplayName ||
      settings?.general?.schoolDisplayName ||
      "",
  ).trim();
  const selectedDateRange = dateRangeKey === "custom" ? customDateRange : getDateRangeValue(dateRangeKey);
  const dateRangeLabel =
    DATE_RANGE_OPTIONS.find((option) => option.key === dateRangeKey)?.label ??
    "This Month";

  if (!category || !report) {
    return <Navigate to="/reports" replace />;
  }

  const openDateRange = () => {
    const currentRange =
      dateRangeKey === "custom" ? customDateRange : selectedDateRange;
    setDateRangeDraftKey(dateRangeKey);
    setCustomDateRangeDraft(currentRange);
    setCustomDateRangeMonth(getStartOfMonth(currentRange.start));
    setIsCustomDateRangeOpen(dateRangeKey === "custom");
    setDateRangeOpen((prev) => !prev);
  };

  const applyDateRange = () => {
    if (dateRangeDraftKey === "custom") {
      setCustomDateRange(customDateRangeDraft);
    }
    setDateRangeKey(dateRangeDraftKey);
    setIsCustomDateRangeOpen(false);
    setDateRangeOpen(false);
  };

  const cancelDateRange = () => {
    setDateRangeDraftKey(dateRangeKey);
    setCustomDateRangeDraft(customDateRange);
    setCustomDateRangeMonth(
      getStartOfMonth(
        (dateRangeKey === "custom"
          ? customDateRange
          : getDateRangeValue(dateRangeKey)
        ).start,
      ),
    );
    setIsCustomDateRangeOpen(false);
    setDateRangeOpen(false);
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

  const handleExportAction = (label: string) => {
    setExportOpen(false);
    if (label === "Print") {
      window.print();
      return;
    }
    toast.success(`Export ${label} started`);
  };

  return (
    <div className="relative min-h-[calc(100vh-64px)] pt-3">
      <ReportsDrawer
        open={isReportsDrawerOpen}
        currentCategoryId={category.id}
        currentReportId={report.id}
        triggerRef={menuButtonRef}
        onClose={() => setIsReportsDrawerOpen(false)}
      />
      <div className="mx-auto w-full px-3 pb-6">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#e6e9f0] pb-3">
          <div className="min-w-0">
            <div className="mb-1 text-sm font-medium text-[#156372]">
              {category.name}
            </div>
            <div className="flex min-w-0 items-baseline gap-2">
              <button
                type="button"
                ref={menuButtonRef}
                onClick={() => setIsReportsDrawerOpen((prev) => !prev)}
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded border border-[#d4d9e4] bg-white text-[#334155] hover:bg-[#f8fafc]"
                aria-label="Open reports menu"
              >
                <Menu size={15} />
              </button>
              <div className="flex min-w-0 items-baseline gap-2">
                <h1 className="truncate text-[24px] font-semibold leading-tight text-[#0f172a]">
                  {report.name}
                </h1>
                <span className="whitespace-nowrap text-sm text-[#475569]">
                  - From {formatDate(selectedDateRange.start)} To{" "}
                  {formatDate(selectedDateRange.end)}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              ref={exportButtonRef}
              onClick={() => setExportOpen((prev) => !prev)}
              className="inline-flex h-8 items-center gap-1 rounded border border-[#d4d9e4] bg-white px-3 text-sm font-medium text-[#1e293b] hover:bg-[#f8fafc]"
              aria-label="Export report"
            >
              Export <ChevronDown size={14} />
            </button>
            <button
              type="button"
              className="inline-flex h-8 w-8 items-center justify-center rounded border border-[#d4d9e4] text-[#334155] hover:bg-[#f8fafc]"
              aria-label="Refresh report"
              title="Refresh report"
            >
              <RefreshCw size={15} />
            </button>
            <button
              type="button"
              onClick={() => navigate("/reports")}
              className="inline-flex h-8 w-8 items-center justify-center rounded border border-[#d4d9e4] text-[#ef4444] hover:bg-[#fef2f2]"
              aria-label="Close report"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-b border-[#e5e7eb] bg-white py-3">
          <div className="flex items-center gap-2 text-sm text-[#334155]">
            <Filter size={14} />
            <span>Filters :</span>
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={openDateRange}
              className="inline-flex h-8 min-w-[170px] items-center justify-between gap-3 rounded border border-[#cfd6e4] bg-[#f8fafc] px-3 text-sm text-[#334155] hover:bg-white"
            >
              <span className="inline-flex items-center gap-2">
                <CalendarDays size={14} className="text-[#64748b]" />
                <span>Date Range :</span>
                <strong>{dateRangeLabel}</strong>
              </span>
              <ChevronDown size={14} />
            </button>
            {dateRangeOpen ? (
              <div
                className={`absolute left-0 top-[calc(100%+6px)] z-50 overflow-visible rounded-lg border border-[#d7dce7] bg-white shadow-[0_10px_24px_rgba(15,23,42,0.12)] ${
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
                              type="date"
                              value={toInputDateValue(customDateRangeDraft.start)}
                              onChange={(event) =>
                                handleCustomStartDateClick(
                                  fromInputDateValue(event.target.value),
                                )
                              }
                              className="h-10 w-full rounded border border-[#156372] bg-white pl-9 pr-3 text-sm text-[#334155] outline-none"
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
                              type="date"
                              value={toInputDateValue(customDateRangeDraft.end)}
                              onChange={(event) =>
                                handleCustomEndDateClick(
                                  fromInputDateValue(event.target.value),
                                )
                              }
                              className="h-10 w-full rounded border border-[#156372] bg-white pl-9 pr-3 text-sm text-[#334155] outline-none"
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
                                      setCustomDateRangeMonth(
                                        new Date(
                                          month.getFullYear(),
                                          Number(event.target.value),
                                          1,
                                        ),
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
                                      setCustomDateRangeMonth(
                                        new Date(
                                          Number(event.target.value),
                                          month.getMonth(),
                                          1,
                                        ),
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
                                  <ChevronRight size={14} className="text-[#64748b]" />
                                </button>
                              </div>

                              <table className="w-full table-fixed border-collapse text-center text-[11px]">
                                <thead>
                                  <tr className="text-[#156372]">
                                    {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
                                      <th key={day} className="pb-1 font-semibold">
                                        {day}
                                      </th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {weeks.map((week, weekIndex) => (
                                    <tr key={`${side}-week-${weekIndex}`}>
                                      {week.map((day) => {
                                        const inCurrentMonth = isSameMonth(day, month);
                                        const isStart = isSameDay(day, customDateRangeDraft.start);
                                        const isEnd = isSameDay(day, customDateRangeDraft.end);
                                        const inRange =
                                          day >= customDateRangeDraft.start &&
                                          day <= customDateRangeDraft.end;
                                        const isToday = isSameDay(day, new Date());

                                        return (
                                          <td key={day.toISOString()} className="p-0">
                                            <button
                                              type="button"
                                              onClick={() =>
                                                side === "start"
                                                  ? handleCustomStartDateClick(day)
                                                  : handleCustomEndDateClick(day)
                                              }
                                              className={`m-[1px] flex h-7 w-full items-center justify-center rounded text-[11px] ${
                                                !inCurrentMonth
                                                  ? "text-[#cbd5e1]"
                                                  : isStart || isEnd
                                                    ? "bg-[#156372] font-semibold text-white"
                                                    : inRange
                                                      ? "bg-[#d9eff1] text-[#0f172a]"
                                                      : "text-[#334155] hover:bg-[#f8fafc]"
                                              } ${
                                                isToday && !isStart && !isEnd
                                                  ? "ring-1 ring-inset ring-[#156372]/30"
                                                  : ""
                                              }`}
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
                            onClick={cancelDateRange}
                            className="inline-flex h-8 items-center rounded border border-[#d4d9e4] bg-white px-3 text-sm text-[#334155] hover:bg-[#f8fafc]"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={applyDateRange}
                            className="inline-flex h-8 items-center rounded bg-[#156372] px-3 text-sm font-semibold text-white hover:bg-[#0f4a52]"
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

          <button
            type="button"
            className="inline-flex h-8 items-center gap-1 rounded bg-[#1b6f7b] px-4 text-sm font-semibold text-white hover:bg-[#155963]"
          >
            Run Report
          </button>
        </div>

        <section className="mt-3 overflow-hidden rounded-[16px] border border-[#d7dce7] bg-white shadow-sm">
          <div className="border-b border-[#eef2f7] px-4 py-10 text-center">
            <div className="mb-1 text-sm text-[#64748b]">
              {organizationName || " "}
            </div>
            <div className="text-[20px] font-semibold text-[#0f172a]">
              {report.name}
            </div>
            <div className="mt-1 text-sm text-[#156372]">
              From {formatDate(selectedDateRange.start)} To{" "}
              {formatDate(selectedDateRange.end)}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-[#eef2f7]">
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#475569]">
                    Name
                  </th>
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#475569]">
                    Withholding Tax (FCY)
                  </th>
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#475569]">
                    Withholding Tax (BCY)
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-[#eef2f7]">
                  <td
                    className="px-4 py-10 text-center text-sm text-[#64748b]"
                    colSpan={3}
                  >
                    There were no sales during the selected date range.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {exportOpen ? (
        <div className="absolute right-4 top-16 z-40 w-[220px] overflow-hidden rounded-lg border border-[#d7dce7] bg-white shadow-[0_10px_24px_rgba(15,23,42,0.12)]">
          {["PDF", "XLSX (Microsoft Excel)", "Print"].map((label) => (
            <button
              key={label}
              type="button"
              onClick={() => handleExportAction(label)}
              className="flex w-full items-center px-3 py-2 text-left text-sm text-[#334155] hover:bg-[#f8fafc]"
            >
              {label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
