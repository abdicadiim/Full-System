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
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import ReportCustomizeColumnsModal, {
  type ColumnGroup,
} from "./ReportCustomizeColumnsModal";
import { REPORTS_BY_CATEGORY } from "./reportsCatalog";
import { useSettings } from "../../lib/settings/SettingsContext";

type CustomerReviewColumn =
  | "Customer Name"
  | "5 Stars"
  | "4 Stars"
  | "Less Than 4 Stars"
  | "Average Rating"
  | "Total Rating";

type DateRangeKey = "this-month" | "last-month" | "this-quarter" | "this-year";

const CUSTOMER_REVIEW_COLUMNS: ColumnGroup[] = [
  {
    label: "Customer Review Columns",
    items: [
      "Customer Name",
      "5 Stars",
      "4 Stars",
      "Less Than 4 Stars",
      "Average Rating",
      "Total Rating",
    ],
  },
];

const DATE_RANGE_OPTIONS: Array<{ key: DateRangeKey; label: string }> = [
  { key: "this-month", label: "This Month" },
  { key: "last-month", label: "Last Month" },
  { key: "this-quarter", label: "This Quarter" },
  { key: "this-year", label: "This Year" },
];

const formatDate = (date: Date) =>
  date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

const getStartOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1);
const getEndOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0);
const getStartOfQuarter = (date: Date) =>
  new Date(date.getFullYear(), Math.floor(date.getMonth() / 3) * 3, 1);
const getStartOfYear = (date: Date) => new Date(date.getFullYear(), 0, 1);

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

export default function CustomerReviewsReportPage() {
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
  const [isReportLoading, setIsReportLoading] = useState(false);
  const [reportRefreshTick, setReportRefreshTick] = useState(0);
  const [selectedColumns, setSelectedColumns] = useState<CustomerReviewColumn[]>([
    "Customer Name",
    "5 Stars",
    "4 Stars",
    "Less Than 4 Stars",
    "Average Rating",
    "Total Rating",
  ]);
  const [dateRangeKey, setDateRangeKey] = useState<DateRangeKey>("this-month");
  const exportMenuRef = useRef<HTMLDivElement | null>(null);
  const dateRangeMenuRef = useRef<HTMLDivElement | null>(null);

  const dateBounds = useMemo(() => getDateRangeBounds(dateRangeKey), [dateRangeKey]);
  const dateRangeLabel = getDateRangeLabel(dateRangeKey);
  const dateRangeText = `From ${formatDate(dateBounds.start)} To ${formatDate(dateBounds.end)}`;

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (isExportOpen && !exportMenuRef.current?.contains(target)) setIsExportOpen(false);
      if (isDateRangeOpen && !dateRangeMenuRef.current?.contains(target)) setIsDateRangeOpen(false);
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsExportOpen(false);
        setIsDateRangeOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isDateRangeOpen, isExportOpen]);

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
    toast.success("Report refreshed: Customer Reviews");
  };

  const runReport = () => {
    setIsDateRangeOpen(false);
    refreshReport();
  };

  const handleExport = (format: string) => {
    setIsExportOpen(false);
    toast.info(`Exporting Customer Reviews as ${format}`);
  };

  return (
    <div className="relative min-h-[calc(100vh-64px)] bg-[#f5f7fc] pt-3">
      <ReportsDrawer
        open={isDrawerOpen}
        activeReportId="customer-reviews"
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
                <span>Customer Reviews</span>
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
              onClick={runReport}
              className="inline-flex h-8 items-center gap-1 rounded bg-[#156372] px-4 text-[14px] font-semibold text-white hover:bg-[#0f4f5b]"
            >
              Run Report
            </button>
          </div>
        </div>

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
              <h2 className="mt-2 text-[22px] font-semibold text-[#0f172a]">Customer Reviews</h2>
              <div className="mt-1 text-[13px] text-[#475569]">{dateRangeText}</div>

              <div className="mx-auto mt-8 grid max-w-[760px] grid-cols-3 overflow-hidden rounded-[12px] border border-[#e6eaf1] bg-white">
                <div className="border-r border-[#e6eaf1] px-6 py-6">
                  <div className="text-[24px] font-medium text-[#10b981]">0</div>
                  <div className="mt-2 text-[14px] text-[#0f172a]">5 Stars</div>
                </div>
                <div className="border-r border-[#e6eaf1] px-6 py-6">
                  <div className="text-[24px] font-medium text-[#156372]">0</div>
                  <div className="mt-2 text-[14px] text-[#0f172a]">4 Stars</div>
                </div>
                <div className="px-6 py-6">
                  <div className="text-[24px] font-medium text-[#f97316]">0</div>
                  <div className="mt-2 text-[14px] text-[#0f172a]">Less Than 4 Stars</div>
                </div>
              </div>
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
                          {column === "Customer Name" ? <ArrowUpDown size={12} /> : null}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {isReportLoading ? (
                    <tr>
                      <td
                        colSpan={selectedColumns.length}
                        className="px-4 py-10 text-center text-[14px] text-[#64748b]"
                      >
                        Loading report data...
                      </td>
                    </tr>
                  ) : (
                    <tr>
                      <td
                        colSpan={selectedColumns.length}
                        className="px-4 py-20 text-center text-[14px] text-[#64748b]"
                      >
                        There are no activities recorded during this date range
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
        reportName="Customer Reviews"
        availableGroups={CUSTOMER_REVIEW_COLUMNS}
        selectedColumns={selectedColumns}
        onClose={() => setIsCustomizeOpen(false)}
        onSave={(nextVisibleColumns) => {
          setSelectedColumns(nextVisibleColumns as CustomerReviewColumn[]);
          setIsCustomizeOpen(false);
          toast.success("Report columns updated");
        }}
      />
    </div>
  );
}
