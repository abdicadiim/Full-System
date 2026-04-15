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

type ProjectSummaryColumn =
  | "Project"
  | "Customer Name"
  | "Logged Hours"
  | "Budgeted Hours"
  | "Logged Amount"
  | "Budget Amount"
  | "Billable Hours"
  | "Non-Billable Hours"
  | "Billable Amount"
  | "Non-Billable Amount";

type DateRangeKey = "this-month" | "last-month" | "this-quarter" | "this-year";

const PROJECT_SUMMARY_COLUMNS: ColumnGroup[] = [
  {
    label: "Project Summary Columns",
    items: [
      "Project",
      "Customer Name",
      "Logged Hours",
      "Budgeted Hours",
      "Logged Amount",
      "Budget Amount",
      "Billable Hours",
      "Non-Billable Hours",
      "Billable Amount",
      "Non-Billable Amount",
    ],
  },
];

const PROJECT_SUMMARY_ROWS = [
  {
    project: "Brochure Designing",
    customerName: "US Grand Stores",
    loggedHours: "00:10",
    budgetedHours: "40:00",
    loggedAmount: "$2,000.00",
    budgetAmount: "$0.00",
    billableHours: "-",
    nonBillableHours: "-",
    billableAmount: "-",
    nonBillableAmount: "-",
  },
  {
    project: "Cleaning",
    customerName: "Jack Wilson",
    loggedHours: "-",
    budgetedHours: "-",
    loggedAmount: "$0.00",
    budgetAmount: "$0.00",
    billableHours: "00:00",
    nonBillableHours: "00:00",
    billableAmount: "$0.00",
    nonBillableAmount: "$0.00",
  },
  {
    project: "dd",
    customerName: "ss",
    loggedHours: "26:50",
    budgetedHours: "-",
    loggedAmount: "SOS80.50",
    budgetAmount: "SOS20.00",
    billableHours: "26:50",
    nonBillableHours: "00:00",
    billableAmount: "SOS80.50",
    nonBillableAmount: "SOS0.00",
  },
  {
    project: "Event Organizing",
    customerName: "US Grand Stores",
    loggedHours: "00:00",
    budgetedHours: "-",
    loggedAmount: "$0.00",
    budgetAmount: "$0.00",
    billableHours: "00:00",
    nonBillableHours: "00:00",
    billableAmount: "$0.00",
    nonBillableAmount: "$0.00",
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
            <div className="text-[14px] font-semibold text-[#0f172a]">Projects and Timesheet</div>
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

export default function ProjectSummaryReportPage() {
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
  const [refreshTick, setRefreshTick] = useState(0);
  const [selectedColumns, setSelectedColumns] = useState<ProjectSummaryColumn[]>([
    "Project",
    "Customer Name",
    "Logged Hours",
    "Budgeted Hours",
    "Logged Amount",
    "Budget Amount",
    "Billable Hours",
    "Non-Billable Hours",
    "Billable Amount",
    "Non-Billable Amount",
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
  }, [isReportLoading, refreshTick]);

  const refreshReport = () => {
    setIsReportLoading(true);
    setRefreshTick((value) => value + 1);
    toast.success("Report refreshed: Project Summary");
  };

  const runReport = () => {
    setIsDateRangeOpen(false);
    refreshReport();
  };

  const handleExport = (format: string) => {
    setIsExportOpen(false);
    toast.info(`Exporting Project Summary as ${format}`);
  };

  return (
    <div className="relative min-h-[calc(100vh-64px)] bg-[#f5f7fc] pt-3">
      <ReportsDrawer
        open={isDrawerOpen}
        activeReportId="project-summary"
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
              <div className="text-[13px] text-[#475569]">Projects and Timesheet</div>
              <h1 className="flex flex-wrap items-baseline gap-2 text-[17px] font-semibold leading-tight text-[#0f172a]">
                <span>Project Summary</span>
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
              onClick={() => navigate("/reports/projects-timesheets")}
              className="inline-flex h-9 w-9 items-center justify-center rounded border border-[#d4d9e4] text-[#ef4444] hover:bg-[#fef2f2]"
              aria-label="Close report"
              title="Close report"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        <div className="border-b border-[#e6eaf1] px-4 py-2">
          <button
            type="button"
            onClick={() => setIsDateRangeOpen((current) => !current)}
            className="inline-flex items-center gap-1 text-[14px] font-medium text-[#156372]"
          >
            <Filter size={14} />
            Apply Filter
          </button>

          {isDateRangeOpen ? (
            <div ref={dateRangeMenuRef} className="mt-2 flex flex-wrap items-center gap-2">
              <span className="text-[14px] text-[#334155]">
                <CalendarDays size={14} className="mr-1 inline-block text-[#64748b]" />
                Date Range :
              </span>

              <button
                type="button"
                onClick={() => setIsDateRangeOpen((current) => !current)}
                className="inline-flex h-8 items-center gap-1 rounded border border-[#cfd6e4] bg-[#f8fafc] px-3 text-[14px] text-[#334155] hover:bg-white"
              >
                <span className="font-medium">{dateRangeLabel}</span>
                <ChevronDown size={14} />
              </button>

              <button
                type="button"
                onClick={runReport}
                className="inline-flex h-8 items-center gap-1 rounded bg-[#156372] px-4 text-[14px] font-semibold text-white hover:bg-[#0f4f5b]"
              >
                Run Report
              </button>
            </div>
          ) : null}
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
              <h2 className="mt-2 text-[22px] font-semibold text-[#0f172a]">Project Summary</h2>
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
                          {column === "Project" ? <ArrowUpDown size={12} /> : null}
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
                    <>
                  {PROJECT_SUMMARY_ROWS.map((row) => (
                    <tr key={row.project} className="border-b border-[#eef2f7] hover:bg-[#f8fafc]">
                      {selectedColumns.map((column) => {
                        const value =
                          column === "Project"
                            ? row.project
                            : column === "Customer Name"
                              ? row.customerName
                              : column === "Logged Hours"
                                ? row.loggedHours
                                : column === "Budgeted Hours"
                                  ? row.budgetedHours
                                  : column === "Logged Amount"
                                    ? row.loggedAmount
                                    : column === "Budget Amount"
                                      ? row.budgetAmount
                                      : column === "Billable Hours"
                                        ? row.billableHours
                                        : column === "Non-Billable Hours"
                                          ? row.nonBillableHours
                                          : column === "Billable Amount"
                                            ? row.billableAmount
                                            : row.nonBillableAmount;

                        const isLink = column === "Project" || column === "Customer Name";
                        const isAmount = column.includes("Amount");
                        const isHours = column.includes("Hours");

                        return (
                          <td
                            key={`${row.project}-${column}`}
                            className={`px-4 py-3 text-[14px] ${
                              isHours ? "text-center" : "text-left"
                            } ${isAmount && value !== "-" ? "text-[#0f172a]" : ""}`}
                          >
                            {isLink ? <span className="text-[#156372]">{value}</span> : value}
                          </td>
                        );
                      })}
                    </tr>
                  ))}

                  <tr className="border-b border-[#e5e7eb] bg-[#fcfcfd]">
                    {selectedColumns.map((column, index) => {
                      if (index === 0) {
                        return (
                          <td key="project-summary-total" className="px-4 py-3 text-[14px] font-semibold text-[#0f172a]">
                            Total
                          </td>
                        );
                      }
                      if (column === "Logged Hours") {
                        return (
                          <td key={column} className="px-4 py-3 text-[14px] font-medium text-center text-[#0f172a]">
                            27:00
                          </td>
                        );
                      }
                      if (column === "Budgeted Hours") {
                        return (
                          <td key={column} className="px-4 py-3 text-[14px] font-medium text-center text-[#0f172a]">
                            40:00
                          </td>
                        );
                      }
                      if (column === "Billable Hours") {
                        return (
                          <td key={column} className="px-4 py-3 text-[14px] font-medium text-center text-[#0f172a]">
                            26:50
                          </td>
                        );
                      }
                      if (column === "Non-Billable Hours") {
                        return (
                          <td key={column} className="px-4 py-3 text-[14px] font-medium text-center text-[#0f172a]">
                            00:00
                          </td>
                        );
                      }
                      return <td key={column} className="px-4 py-3 text-[14px] text-[#0f172a]" />;
                    })}
                  </tr>
                    </>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <ReportCustomizeColumnsModal
        open={isCustomizeOpen}
        reportName="Project Summary"
        availableGroups={PROJECT_SUMMARY_COLUMNS}
        selectedColumns={selectedColumns}
        onClose={() => setIsCustomizeOpen(false)}
        onSave={(nextVisibleColumns) => {
          setSelectedColumns(nextVisibleColumns as ProjectSummaryColumn[]);
          setIsCustomizeOpen(false);
          toast.success("Report columns updated");
        }}
      />
    </div>
  );
}
