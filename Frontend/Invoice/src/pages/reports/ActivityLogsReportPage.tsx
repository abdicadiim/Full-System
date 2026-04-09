import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import {
  ArrowUpDown,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  Columns3,
  Filter,
  Folder,
  Menu,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
} from "lucide-react";
import ReportCustomizeColumnsModal, {
  type ColumnGroup,
} from "./ReportCustomizeColumnsModal";
import { REPORTS_BY_CATEGORY } from "./reportsCatalog";
import { useSettings } from "../../lib/settings/SettingsContext";

type ActivityLogRow = {
  id: string;
  dateTime: string;
  detailsPrimary: string;
  detailsSecondary?: string;
  descriptionPrimary: string;
  descriptionSecondary?: string;
  actor: string;
};

type ActivityColumn = "Date" | "Activity Details" | "Description";
type DateRangeKey = "this-month" | "last-month" | "this-quarter" | "this-year";
type MoreFilterFieldKey = "activity-details" | "description" | "actor";
type MoreFilterComparatorKey =
  | "is-equal-to"
  | "is-in"
  | "is-not-in"
  | "contains"
  | "starts-with"
  | "ends-with"
  | "is-empty"
  | "is-not-empty";
type MoreFilterRow = {
  id: string;
  field: MoreFilterFieldKey | "";
  comparator: MoreFilterComparatorKey | "";
  value: string;
};

const ACTIVITY_LOG_ROWS: ActivityLogRow[] = [
  {
    id: "activity-1",
    dateTime: "2026-04-06T11:36:00",
    detailsPrimary: "23e3e",
    descriptionPrimary:
      'The status of the variant "23e3e" has been changed to inactive.',
    actor: "cxffhzfg",
  },
  {
    id: "activity-2",
    dateTime: "2026-04-06T11:36:00",
    detailsPrimary: "23e3e",
    descriptionPrimary:
      'The status of the variant "23e3e" has been changed to active.',
    actor: "cxffhzfg",
  },
  {
    id: "activity-3",
    dateTime: "2026-04-06T06:18:00",
    detailsPrimary: "INV-000010",
    detailsSecondary: "Customer: ss",
    descriptionPrimary: 'Invoice "INV-000010" Updated',
    descriptionSecondary: "by System",
    actor: "System",
  },
  {
    id: "activity-4",
    dateTime: "2026-04-06T06:18:00",
    detailsPrimary: "rfsf",
    detailsSecondary: "Customer: ss",
    descriptionPrimary: 'Recurring Invoice "rfsf" Updated',
    descriptionSecondary: "by System",
    actor: "System",
  },
  {
    id: "activity-5",
    dateTime: "2026-04-06T06:18:00",
    detailsPrimary: "INV-000010",
    detailsSecondary: "Customer: ss",
    descriptionPrimary: 'Invoice "INV-000010" Added',
    descriptionSecondary: "by System",
    actor: "System",
  },
  {
    id: "activity-6",
    dateTime: "2026-04-04T16:48:00",
    detailsPrimary: "Exchange Rates",
    descriptionPrimary:
      "Exchange rate of 1 is added for currency USD is effective from 04 Apr 2026",
    descriptionSecondary: "by cxffhzfg",
    actor: "cxffhzfg",
  },
  {
    id: "activity-7",
    dateTime: "2026-04-04T16:48:00",
    detailsPrimary: "INV-000009",
    detailsSecondary: "Customer: Jack Wilson",
    descriptionPrimary: 'Invoice "INV-000009" Added',
    descriptionSecondary: "by cxffhzfg",
    actor: "cxffhzfg",
  },
];

const ACTIVITY_LOG_COLUMNS: ColumnGroup[] = [
  { label: "Activity Columns", items: ["Date", "Activity Details", "Description"] },
];

const DATE_RANGE_OPTIONS: Array<{ key: DateRangeKey; label: string }> = [
  { key: "this-month", label: "This Month" },
  { key: "last-month", label: "Last Month" },
  { key: "this-quarter", label: "This Quarter" },
  { key: "this-year", label: "This Year" },
];

const MORE_FILTER_FIELD_OPTIONS: Array<{ key: MoreFilterFieldKey; label: string }> = [
  { key: "activity-details", label: "Activity Details" },
  { key: "description", label: "Description" },
  { key: "actor", label: "Actor" },
];

const MORE_FILTER_COMPARATOR_OPTIONS: Array<{
  key: MoreFilterComparatorKey;
  label: string;
}> = [
  { key: "is-equal-to", label: "is equal to" },
  { key: "is-in", label: "is in" },
  { key: "is-not-in", label: "is not in" },
  { key: "contains", label: "contains" },
  { key: "starts-with", label: "starts with" },
  { key: "ends-with", label: "ends with" },
  { key: "is-empty", label: "is empty" },
  { key: "is-not-empty", label: "is not empty" },
];

const ACTIVITY_DETAILS_VALUE_OPTIONS = [
  "All Activity Logs",
  "23e3e",
  "INV-000010",
  "rfsf",
  "Exchange Rates",
  "INV-000009",
];

const getStartOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1);
const getEndOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0);
const getStartOfQuarter = (date: Date) =>
  new Date(date.getFullYear(), Math.floor(date.getMonth() / 3) * 3, 1);
const getStartOfYear = (date: Date) => new Date(date.getFullYear(), 0, 1);

const formatDate = (date: Date) =>
  date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

const formatDateTime = (value: string) => {
  const date = new Date(value);
  return `${date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })} ${date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  })}`;
};

const getDateRangeBounds = (key: DateRangeKey) => {
  const now = new Date("2026-04-07T12:00:00");
  if (key === "last-month") {
    const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return { start: getStartOfMonth(previousMonth), end: getEndOfMonth(previousMonth) };
  }
  if (key === "this-quarter") {
    const start = getStartOfQuarter(now);
    return { start, end: new Date(start.getFullYear(), start.getMonth() + 3, 0) };
  }
  if (key === "this-year") {
    return { start: getStartOfYear(now), end: new Date(now.getFullYear(), 11, 31) };
  }
  return { start: getStartOfMonth(now), end: getEndOfMonth(now) };
};

const getDateRangeLabel = (key: DateRangeKey) =>
  DATE_RANGE_OPTIONS.find((option) => option.key === key)?.label ?? "This Month";

const getMoreFilterValuePlaceholder = (field: MoreFilterFieldKey | "") => {
  if (field === "activity-details") return "Select a value";
  if (field === "description") return "Type a description";
  if (field === "actor") return "Type a user";
  return "Select a value";
};

const getFilterRowDefaults = (field: MoreFilterFieldKey | ""): Partial<MoreFilterRow> => {
  if (field === "activity-details") {
    return { comparator: "is-in", value: "All Activity Logs" };
  }
  if (field) {
    return { comparator: "contains", value: "" };
  }
  return {};
};

const getActivityMatchSource = (row: ActivityLogRow) =>
  [row.detailsPrimary, row.detailsSecondary].filter(Boolean).join(" ").trim();

const getDescriptionMatchSource = (row: ActivityLogRow) =>
  [row.descriptionPrimary, row.descriptionSecondary, row.actor].filter(Boolean).join(" ").trim();

const matchesComparator = (
  source: string,
  comparator: MoreFilterComparatorKey | "",
  value: string,
) => {
  const left = source.toLowerCase();
  const right = value.trim().toLowerCase();
  if (!comparator) return true;
  if (comparator === "is-empty") return left.length === 0;
  if (comparator === "is-not-empty") return left.length > 0;
  if (!right) return true;
  if (comparator === "is-equal-to" || comparator === "is-in") return left === right;
  if (comparator === "is-not-in") return left !== right;
  if (comparator === "contains") return left.includes(right);
  if (comparator === "starts-with") return left.startsWith(right);
  if (comparator === "ends-with") return left.endsWith(right);
  return true;
};

function ReportsDrawer({
  open,
  activeReportId,
  onClose,
}: {
  open: boolean;
  activeReportId: string;
  onClose: () => void;
}) {
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!open) setSearch("");
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const query = search.trim().toLowerCase();
  const sections = Object.entries(REPORTS_BY_CATEGORY)
    .map(([categoryId, reports]) => {
      const label = String(categoryId)
        .split("-")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
      return {
        id: categoryId,
        label,
        reports: reports.filter((report) => {
          if (!query) return true;
          return report.name.toLowerCase().includes(query) || label.toLowerCase().includes(query);
        }),
      };
    })
    .filter((section) => section.reports.length > 0);

  return (
    <>
      <button
        type="button"
        className="absolute inset-0 z-20 bg-black/10"
        onClick={onClose}
        aria-label="Close reports drawer"
      />
      <aside className="absolute left-0 top-0 z-30 h-full w-[280px] overflow-hidden border-r border-[#e5e7eb] bg-white shadow-[8px_0_20px_rgba(15,23,42,0.08)]">
        <div className="flex items-center justify-between border-b border-[#e5e7eb] px-4 py-3">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#64748b]">
              Reports
            </div>
            <div className="text-[14px] font-semibold text-[#0f172a]">Activity</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded border border-[#d4d9e4] text-[#334155] hover:bg-[#f8fafc]"
            aria-label="Close drawer"
          >
            <X size={15} />
          </button>
        </div>

        <div className="border-b border-[#eef2f7] p-3">
          <div className="relative">
            <Search
              size={14}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8]"
            />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search reports"
              className="h-9 w-full rounded border border-[#d4d9e4] bg-white pl-9 pr-3 text-sm text-[#334155] outline-none focus:border-[#156372]"
            />
          </div>
        </div>

        <div className="h-[calc(100%-118px)] overflow-y-auto p-2">
          {sections.map((section) => (
            <div key={section.id} className="mb-2">
              <div className="flex items-center gap-2 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#64748b]">
                <Folder size={14} />
                {section.label}
              </div>
              <div className="space-y-1">
                {section.reports.map((report) => {
                  const isActive = report.id === activeReportId;
                  return (
                    <Link
                      key={report.id}
                      to={`/reports/${report.categoryId}/${report.id}`}
                      onClick={onClose}
                      className={`flex items-center justify-between rounded-[8px] px-3 py-2 text-[13px] transition-colors ${
                        isActive ? "bg-[#e8f2f4] text-[#156372]" : "text-[#334155] hover:bg-[#f8fafc]"
                      }`}
                    >
                      <span className="truncate">{report.name}</span>
                      <ChevronRight
                        size={13}
                        className={isActive ? "text-[#156372]" : "text-[#94a3b8]"}
                      />
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </aside>
    </>
  );
}

export default function ActivityLogsReportPage() {
  const navigate = useNavigate();
  const { settings } = useSettings() as any;
  const organizationName =
    String(
      settings?.general?.companyDisplayName ||
        settings?.general?.schoolDisplayName ||
        settings?.general?.shortName ||
        "fdfv",
    ).trim() || "fdfv";

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isCustomizeOpen, setIsCustomizeOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isDateRangeOpen, setIsDateRangeOpen] = useState(false);
  const [isMoreFiltersOpen, setIsMoreFiltersOpen] = useState(false);
  const [isReportLoading, setIsReportLoading] = useState(false);
  const [reportRefreshTick, setReportRefreshTick] = useState(0);
  const [selectedColumns, setSelectedColumns] = useState<ActivityColumn[]>([
    "Date",
    "Activity Details",
    "Description",
  ]);
  const [dateRangeKey, setDateRangeKey] = useState<DateRangeKey>("this-month");
  const [filterRows, setFilterRows] = useState<MoreFilterRow[]>([
    {
      id: "activity-filter-1",
      field: "activity-details",
      comparator: "is-in",
      value: "All Activity Logs",
    },
  ]);
  const exportMenuRef = useRef<HTMLDivElement | null>(null);
  const dateRangeMenuRef = useRef<HTMLDivElement | null>(null);
  const moreFiltersRef = useRef<HTMLDivElement | null>(null);

  const dateBounds = useMemo(() => getDateRangeBounds(dateRangeKey), [dateRangeKey]);
  const dateRangeLabel = getDateRangeLabel(dateRangeKey);
  const dateRangeText = `From ${formatDate(dateBounds.start)} To ${formatDate(dateBounds.end)}`;

  const visibleRows = useMemo(() => {
    const filteredByDate = ACTIVITY_LOG_ROWS.filter((row) => {
      const rowDate = new Date(row.dateTime);
      return rowDate >= dateBounds.start && rowDate <= dateBounds.end;
    });

    return filteredByDate.filter((row) =>
      filterRows.every((filter) => {
        if (!filter.field || !filter.comparator) return true;
        if (filter.field === "activity-details" && filter.value === "All Activity Logs") return true;

        const fieldSource =
          filter.field === "activity-details"
            ? getActivityMatchSource(row)
            : filter.field === "description"
              ? getDescriptionMatchSource(row)
              : row.actor;

        return matchesComparator(fieldSource, filter.comparator, filter.value);
      }),
    );
  }, [dateBounds.end, dateBounds.start, filterRows]);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (isExportOpen && !exportMenuRef.current?.contains(target)) setIsExportOpen(false);
      if (isDateRangeOpen && !dateRangeMenuRef.current?.contains(target)) setIsDateRangeOpen(false);
      if (isMoreFiltersOpen && !moreFiltersRef.current?.contains(target)) setIsMoreFiltersOpen(false);
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsExportOpen(false);
        setIsDateRangeOpen(false);
        setIsMoreFiltersOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isDateRangeOpen, isExportOpen, isMoreFiltersOpen]);

  useEffect(() => {
    let timer: number | undefined;
    if (isReportLoading) {
      timer = window.setTimeout(() => setIsReportLoading(false), 150);
    }
    return () => {
      if (timer) window.clearTimeout(timer);
    };
  }, [isReportLoading, reportRefreshTick]);

  const refreshReport = () => {
    setIsReportLoading(true);
    setReportRefreshTick((value) => value + 1);
    toast.success("Report refreshed: Activity Logs");
  };

  const runReport = () => {
    setIsDateRangeOpen(false);
    setIsMoreFiltersOpen(false);
    refreshReport();
  };

  const addFilterRow = () => {
    setFilterRows((current) => [
      ...current,
      {
        id: `activity-filter-${Date.now()}`,
        field: "",
        comparator: "",
        value: "",
      },
    ]);
  };

  const updateFilterRow = (
    rowId: string,
    patch: Partial<MoreFilterRow> & { field?: MoreFilterFieldKey | "" },
  ) => {
    setFilterRows((current) =>
      current.map((row) => {
        if (row.id !== rowId) return row;
        const nextField = patch.field ?? row.field;
        const defaults = patch.field ? getFilterRowDefaults(nextField) : {};
        return { ...row, ...defaults, ...patch, field: nextField };
      }),
    );
  };

  const removeFilterRow = (rowId: string) => {
    setFilterRows((current) => (current.length > 1 ? current.filter((row) => row.id !== rowId) : current));
  };

  const handleExport = (format: string) => {
    setIsExportOpen(false);
    toast.info(`Exporting Activity Logs as ${format}`);
  };

  return (
    <div className="relative min-h-[calc(100vh-64px)] bg-[#f5f7fc] pt-3">
      <ReportsDrawer
        open={isDrawerOpen}
        activeReportId="activity-logs-audit-trail"
        onClose={() => setIsDrawerOpen(false)}
      />

      <div className="mx-3 overflow-hidden rounded-[12px] border border-[#e2e8f0] bg-white">
        <div className="flex items-start justify-between gap-4 border-b border-[#e6eaf1] px-4 py-3">
          <div className="flex items-start gap-3">
            <button
              type="button"
              onClick={() => setIsDrawerOpen((current) => !current)}
              className="inline-flex h-9 w-9 items-center justify-center rounded border border-[#d4d9e4] bg-white text-[#334155] hover:bg-[#f8fafc]"
              aria-label="Toggle reports drawer"
            >
              <Menu size={16} />
            </button>
            <div className="min-w-0">
              <div className="text-[13px] text-[#475569]">Activity</div>
              <h1 className="flex flex-wrap items-baseline gap-2 text-[17px] font-semibold leading-tight text-[#0f172a]">
                <span>Activity Logs</span>
                <span className="text-[13px] font-normal text-[#475569]">- {dateRangeText}</span>
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div ref={exportMenuRef} className="relative">
              <button
                type="button"
                onClick={() => setIsExportOpen((current) => !current)}
                className="inline-flex h-9 items-center gap-1 rounded border border-[#d4d9e4] bg-white px-3 text-[14px] font-medium text-[#1e293b] hover:bg-[#f8fafc]"
              >
                Export <ChevronDown size={14} />
              </button>
              {isExportOpen ? (
                <div className="absolute right-0 top-[calc(100%+6px)] z-20 w-40 overflow-hidden rounded-md border border-[#d4d9e4] bg-white shadow-[0_10px_24px_rgba(15,23,42,0.14)]">
                  {["PDF", "Excel", "CSV"].map((format) => (
                    <button
                      key={format}
                      type="button"
                      onClick={() => handleExport(format)}
                      className="block w-full px-4 py-2 text-left text-[13px] text-[#334155] hover:bg-[#f8fafc]"
                    >
                      Export as {format}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            <button
              type="button"
              onClick={refreshReport}
              className={`inline-flex h-9 w-9 items-center justify-center rounded border border-[#d4d9e4] text-[#334155] hover:bg-[#f8fafc] ${
                isReportLoading ? "animate-spin" : ""
              }`}
              aria-label="Refresh report"
              title="Refresh report"
            >
              <RefreshCw size={15} />
            </button>

            <button
              type="button"
              onClick={() => navigate("/reports/activity")}
              className="inline-flex h-9 w-9 items-center justify-center rounded border border-[#d4d9e4] text-[#ef4444] hover:bg-[#fef2f2]"
              aria-label="Close report"
              title="Close report"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        <div className="border-b border-[#e6eaf1] px-4 py-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[14px] text-[#334155]">
              <Filter size={14} className="mr-1 inline-block text-[#64748b]" />
              Filters :
            </span>

            <div ref={dateRangeMenuRef} className="relative">
              <button
                type="button"
                onClick={() => setIsDateRangeOpen((current) => !current)}
                className="inline-flex h-8 items-center gap-1 rounded border border-[#cfd6e4] bg-[#f8fafc] px-3 text-[14px] text-[#334155] hover:bg-white"
              >
                <CalendarDays size={14} className="text-[#64748b]" />
                Date Range : <span className="font-medium">{dateRangeLabel}</span>
                <ChevronDown size={14} />
              </button>

              {isDateRangeOpen ? (
                <div className="absolute left-0 top-[calc(100%+6px)] z-20 w-56 overflow-hidden rounded-md border border-[#d4d9e4] bg-white shadow-[0_10px_24px_rgba(15,23,42,0.14)]">
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
                        className={`flex w-full items-center justify-between px-4 py-2 text-left text-[13px] ${
                          isSelected ? "bg-[#156372] text-white" : "text-[#334155] hover:bg-[#f8fafc]"
                        }`}
                      >
                        <span>{option.label}</span>
                        {isSelected ? <span className="text-[11px]">Selected</span> : null}
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>

            <button
              type="button"
              onClick={() => setIsMoreFiltersOpen((current) => !current)}
              className="inline-flex h-8 items-center gap-1 rounded border border-[#cfd6e4] bg-white px-3 text-[14px] text-[#334155] hover:bg-[#f8fafc]"
            >
              <Plus size={14} className="text-[#156372]" />
              More Filters
            </button>

            <button
              type="button"
              onClick={runReport}
              className="inline-flex h-8 items-center gap-1 rounded bg-[#156372] px-4 text-[14px] font-semibold text-white hover:bg-[#0f4f5b]"
            >
              Run Report
            </button>
          </div>
        </div>

        {isMoreFiltersOpen ? (
          <div className="border-b border-[#e6eaf1] px-4 py-4">
            <div ref={moreFiltersRef} className="rounded-[12px] border border-[#e6eaf1] bg-white">
              <div className="p-4">
                <div className="space-y-3">
                  {filterRows.map((row, index) => {
                    const isActivityDetails = row.field === "activity-details";
                    return (
                      <div
                        key={row.id}
                        className="grid grid-cols-[36px_minmax(0,220px)_minmax(0,150px)_minmax(0,1fr)_auto_auto] items-center gap-2"
                      >
                        <div className="flex h-8 items-center justify-center rounded border border-[#d4d9e4] bg-[#f8fafc] text-[13px] text-[#334155]">
                          {index + 1}
                        </div>

                        <select
                          value={row.field}
                          onChange={(event) =>
                            updateFilterRow(row.id, {
                              field: event.target.value as MoreFilterFieldKey | "",
                            })
                          }
                          className="h-8 w-full rounded border border-[#d4d9e4] bg-white px-3 text-[14px] text-[#334155] outline-none focus:border-[#156372]"
                        >
                          <option value="">Select a field</option>
                          {MORE_FILTER_FIELD_OPTIONS.map((option) => (
                            <option key={option.key} value={option.key}>
                              {option.label}
                            </option>
                          ))}
                        </select>

                        <select
                          value={row.comparator}
                          onChange={(event) =>
                            updateFilterRow(row.id, {
                              comparator: event.target.value as MoreFilterComparatorKey | "",
                            })
                          }
                          className="h-8 w-full rounded border border-[#d4d9e4] bg-white px-3 text-[14px] text-[#334155] outline-none focus:border-[#156372]"
                        >
                          <option value="">Select a comparator</option>
                          {MORE_FILTER_COMPARATOR_OPTIONS.map((option) => (
                            <option key={option.key} value={option.key}>
                              {option.label}
                            </option>
                          ))}
                        </select>

                        {isActivityDetails ? (
                          <select
                            value={row.value}
                            onChange={(event) =>
                              updateFilterRow(row.id, {
                                value: event.target.value,
                              })
                            }
                            className="h-8 w-full rounded border border-[#d4d9e4] bg-white px-3 text-[14px] text-[#334155] outline-none focus:border-[#156372]"
                          >
                            <option value="">Select a value</option>
                            {ACTIVITY_DETAILS_VALUE_OPTIONS.map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input
                            value={row.value}
                            onChange={(event) =>
                              updateFilterRow(row.id, {
                                value: event.target.value,
                              })
                            }
                            placeholder={getMoreFilterValuePlaceholder(row.field)}
                            className="h-8 w-full rounded border border-[#d4d9e4] bg-white px-3 text-[14px] text-[#334155] outline-none focus:border-[#156372]"
                          />
                        )}

                        <button
                          type="button"
                          onClick={addFilterRow}
                          className="inline-flex h-8 w-8 items-center justify-center text-[#64748b] hover:text-[#156372]"
                          aria-label="Add filter row"
                          title="Add filter row"
                        >
                          <Plus size={18} />
                        </button>

                        <button
                          type="button"
                          onClick={() => removeFilterRow(row.id)}
                          className="inline-flex h-8 w-8 items-center justify-center text-[#64748b] hover:text-[#ef4444]"
                          aria-label="Remove filter row"
                          title="Remove filter row"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={addFilterRow}
                  className="mt-3 inline-flex items-center gap-1 text-[14px] font-medium text-[#156372]"
                >
                  <Plus size={14} />
                  Add More
                </button>
              </div>

              <div className="flex items-center gap-3 border-t border-[#eef2f7] px-4 py-3">
                <button
                  type="button"
                  onClick={runReport}
                  className="inline-flex h-9 items-center rounded bg-[#156372] px-4 text-[14px] font-semibold text-white hover:bg-[#0f4f5b]"
                >
                  Run Report
                </button>
                <button
                  type="button"
                  onClick={() => setIsMoreFiltersOpen(false)}
                  className="inline-flex h-9 items-center rounded border border-[#d4d9e4] bg-white px-4 text-[14px] text-[#334155] hover:bg-[#f8fafc]"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        ) : null}

        <div className="p-3">
          <div className="overflow-hidden rounded-xl border border-[#d7dce7] bg-white">
            <div className="flex justify-end border-b border-[#e6eaf1] px-4 py-3">
              <button
                type="button"
                onClick={() => setIsCustomizeOpen(true)}
                className="inline-flex items-center gap-2 text-[14px] text-[#111827]"
              >
                <Columns3 size={15} className="text-[#4f5f79]" />
                Customize Report Columns
                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#dff1ef] px-1.5 text-[11px] font-semibold text-[#156372]">
                  {selectedColumns.length}
                </span>
              </button>
            </div>

            <div className="border-b border-[#eef2f7] px-4 py-10 text-center">
              <div className="text-[13px] text-[#64748b]">{organizationName}</div>
              <h2 className="mt-2 text-[22px] font-semibold text-[#0f172a]">Activity Logs</h2>
              <div className="mt-1 text-[13px] text-[#475569]">{dateRangeText}</div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse">
                <thead>
                  <tr className="border-b border-[#e6eaf1] bg-[#fafbff]">
                    {selectedColumns.map((column) => (
                      <th
                        key={column}
                        className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-[#475569]"
                      >
                        <span className="inline-flex items-center gap-1">
                          {column}
                          {column === "Date" ? <ArrowUpDown size={12} /> : null}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {isReportLoading ? (
                    <tr>
                      <td colSpan={selectedColumns.length} className="px-4 py-10 text-center text-[14px] text-[#64748b]">
                        Loading report data...
                      </td>
                    </tr>
                  ) : visibleRows.length > 0 ? (
                    visibleRows.map((row) => (
                      <tr key={row.id} className="border-b border-[#eef2f7] hover:bg-[#f8fafc]">
                        {selectedColumns.map((column) => {
                          if (column === "Date") {
                            return (
                              <td key={`${row.id}-${column}`} className="whitespace-nowrap px-4 py-3 text-[14px] text-[#0f172a]">
                                {formatDateTime(row.dateTime)}
                              </td>
                            );
                          }
                          if (column === "Activity Details") {
                            return (
                              <td key={`${row.id}-${column}`} className="px-4 py-3 text-[14px] text-[#0f172a]">
                                <div className="font-medium text-[#156372]">{row.detailsPrimary}</div>
                                {row.detailsSecondary ? (
                                  <div className="mt-1 text-[13px] text-[#0f172a]">{row.detailsSecondary}</div>
                                ) : null}
                              </td>
                            );
                          }
                          return (
                            <td key={`${row.id}-${column}`} className="px-4 py-3 text-[14px] text-[#0f172a]">
                              <div>{row.descriptionPrimary}</div>
                              {row.descriptionSecondary ? (
                                <div className="mt-1 text-[12px] text-[#64748b]">{row.descriptionSecondary}</div>
                              ) : null}
                            </td>
                          );
                        })}
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={selectedColumns.length} className="px-4 py-12 text-center text-[14px] text-[#64748b]">
                        No activity logs found for the current filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <ReportCustomizeColumnsModal
        open={isCustomizeOpen}
        reportName="Activity Logs"
        availableGroups={ACTIVITY_LOG_COLUMNS}
        selectedColumns={selectedColumns}
        onClose={() => setIsCustomizeOpen(false)}
        onSave={(nextVisibleColumns) => {
          setSelectedColumns(nextVisibleColumns as ActivityColumn[]);
          setIsCustomizeOpen(false);
          toast.success("Report columns updated");
        }}
      />
    </div>
  );
}
