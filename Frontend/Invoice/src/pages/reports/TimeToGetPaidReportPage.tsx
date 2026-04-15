import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import {
  Check,
  ChevronDown,
  ChevronRight,
  Columns3,
  Filter,
  Folder,
  Menu,
  RefreshCw,
  X,
} from "lucide-react";
import ReportCustomizeColumnsModal, {
  type ColumnGroup,
} from "./ReportCustomizeColumnsModal";
import { REPORTS_BY_CATEGORY, getCategoryById, getReportById } from "./reportsCatalog";
import { reportsAPI } from "../../services/api";
import { useSettings } from "../../lib/settings/SettingsContext";
import {
  getInvoices,
  getPayments,
  type Invoice,
  type Payment,
} from "../salesModel";

type DateRangePreset =
  | "Today"
  | "This Week"
  | "This Month"
  | "This Quarter"
  | "This Year"
  | "Yesterday"
  | "Previous Week"
  | "Previous Month"
  | "Previous Quarter"
  | "Previous Year"
  | "Custom";

type RangeDate = {
  start: string;
  end: string;
};

type BucketSummary = {
  bucket0to15: number;
  bucket16to30: number;
  bucket31to45: number;
  bucketAbove45: number;
  total: number;
};

type PreviewTableConfig = {
  title: string;
  subtitle: string;
  columns: string[];
  rows: string[][];
  totals?: string[];
};

type PaymentWithInvoicePayments = Payment & {
  invoicePayments?: Record<string, unknown>;
};

const REPORT_COLUMNS = [
  "Customer Name",
  "0 - 15 Days",
  "16 - 30 Days",
  "31 - 45 Days",
  "Above 45 Days",
];

const REPORT_COLUMN_GROUPS: ColumnGroup[] = [
  { label: "Reports", items: REPORT_COLUMNS },
  {
    label: "Contacts",
    items: [
      "Customer ID",
      "Company Name",
      "First Name",
      "Last Name",
      "Website",
      "Customer Email",
      "Customer Type",
      "Mobile Phone",
      "Work Phone",
      "Department",
      "Designation",
      "Facebook",
      "Twitter",
      "Skype",
      "Status",
      "Created By",
      "Created Time",
      "Last Modified Time",
      "Credit Limit",
      "Payment Terms",
      "Remarks",
      "Receivables",
      "Receivables (FCY)",
      "Unused Credits",
      "Unused Credits (FCY)",
      "Billing Name",
      "Billing Street 1",
      "Billing Street 2",
      "Billing City",
      "Billing State",
      "Billing Code",
      "Billing Country",
      "Billing Phone",
      "Billing Fax",
      "Shipping Name",
      "Shipping Street 1",
      "Shipping Street 2",
      "Shipping City",
      "Shipping State",
      "Shipping Code",
      "Shipping Country",
      "Shipping Phone",
      "Shipping Fax",
    ],
  },
];

const DATE_RANGE_PRESETS: DateRangePreset[] = [
  "Today",
  "This Week",
  "This Month",
  "This Quarter",
  "This Year",
  "Yesterday",
  "Previous Week",
  "Previous Month",
  "Previous Quarter",
  "Previous Year",
  "Custom",
];

const formatDate = (value: Date) =>
  value.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

const toIsoDate = (value: Date) => value.toISOString().slice(0, 10);

const parseDate = (value: string) => {
  if (!value) return null;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
};

const startOfDay = (value: Date) => new Date(value.getFullYear(), value.getMonth(), value.getDate());
const endOfDay = (value: Date) => new Date(value.getFullYear(), value.getMonth(), value.getDate(), 23, 59, 59, 999);

const getWeekStart = (value: Date) => {
  const start = startOfDay(value);
  const offset = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - offset);
  return start;
};

const getWeekEnd = (value: Date) => {
  const end = getWeekStart(value);
  end.setDate(end.getDate() + 6);
  return endOfDay(end);
};

const getMonthStart = (value: Date) => new Date(value.getFullYear(), value.getMonth(), 1);
const getMonthEnd = (value: Date) => new Date(value.getFullYear(), value.getMonth() + 1, 0, 23, 59, 59, 999);
const getQuarterStart = (value: Date) => new Date(value.getFullYear(), Math.floor(value.getMonth() / 3) * 3, 1);
const getQuarterEnd = (value: Date) => new Date(value.getFullYear(), Math.floor(value.getMonth() / 3) * 3 + 3, 0, 23, 59, 59, 999);
const getYearStart = (value: Date) => new Date(value.getFullYear(), 0, 1);
const getYearEnd = (value: Date) => new Date(value.getFullYear(), 11, 31, 23, 59, 59, 999);

const getDateRangeBounds = (preset: DateRangePreset, customRange: RangeDate) => {
  const now = new Date();

  switch (preset) {
    case "Today":
      return { start: startOfDay(now), end: endOfDay(now) };
    case "Yesterday": {
      const day = new Date(now);
      day.setDate(day.getDate() - 1);
      return { start: startOfDay(day), end: endOfDay(day) };
    }
    case "This Week":
      return { start: getWeekStart(now), end: getWeekEnd(now) };
    case "Previous Week": {
      const start = getWeekStart(now);
      start.setDate(start.getDate() - 7);
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      return { start, end: endOfDay(end) };
    }
    case "This Month":
      return { start: getMonthStart(now), end: getMonthEnd(now) };
    case "Previous Month": {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0);
      return { start, end: endOfDay(end) };
    }
    case "This Quarter":
      return { start: getQuarterStart(now), end: getQuarterEnd(now) };
    case "Previous Quarter": {
      const currentQuarterStart = getQuarterStart(now);
      const start = new Date(currentQuarterStart);
      start.setMonth(start.getMonth() - 3);
      const end = new Date(currentQuarterStart);
      end.setDate(end.getDate() - 1);
      return { start, end: endOfDay(end) };
    }
    case "This Year":
      return { start: getYearStart(now), end: getYearEnd(now) };
    case "Previous Year": {
      const start = new Date(now.getFullYear() - 1, 0, 1);
      const end = new Date(now.getFullYear() - 1, 11, 31);
      return { start, end: endOfDay(end) };
    }
    case "Custom": {
      const start = parseDate(customRange.start) || getMonthStart(now);
      const end = parseDate(customRange.end) || getMonthEnd(now);
      return { start: startOfDay(start), end: endOfDay(end) };
    }
    default:
      return { start: getMonthStart(now), end: getMonthEnd(now) };
  }
};

const getRangeLabel = (preset: DateRangePreset, bounds: { start: Date; end: Date }) => {
  if (preset === "Today" || preset === "Yesterday") {
    return `As of ${formatDate(bounds.end)}`;
  }

  return `From ${formatDate(bounds.start)} To ${formatDate(bounds.end)}`;
};

const getTimeToGetPaidBucketLabel = (days: number) => {
  if (days <= 15) return "0 - 15 Days";
  if (days <= 30) return "16 - 30 Days";
  if (days <= 45) return "31 - 45 Days";
  return "Above 45 Days";
};

const formatPercent = (value: number) => `${Math.round(value)}%`;

const parseReportDate = (value: unknown) => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
};

const getPaymentAllocations = (payment: PaymentWithInvoicePayments) => {
  const invoicePayments = payment.invoicePayments;
  if (invoicePayments && typeof invoicePayments === "object" && !Array.isArray(invoicePayments)) {
    const normalized = Object.entries(invoicePayments)
      .map(([invoiceId, amount]) => ({
        invoiceId: String(invoiceId || "").trim(),
        amount: Number(amount || 0),
      }))
      .filter((allocation) => allocation.invoiceId && Number.isFinite(allocation.amount) && allocation.amount > 0);

    if (normalized.length > 0) return normalized;
  }

  if (Array.isArray(payment.allocations) && payment.allocations.length > 0) {
    return payment.allocations
      .map((allocation: any) => ({
        invoiceId: String(
          allocation?.invoiceId ||
            allocation?.invoice?._id ||
            allocation?.invoice?.id ||
            allocation?.invoice ||
            "",
        ).trim(),
        invoiceNumber: String(
          allocation?.invoiceNumber ||
            allocation?.invoice?.invoiceNumber ||
            "",
        ).trim(),
        amount: Number(
          allocation?.amount ??
            allocation?.appliedAmount ??
            allocation?.amountReceived ??
            payment.amountReceived ??
            payment.amount ??
            0,
        ),
        invoice: allocation?.invoice || null,
      }))
      .filter((allocation) => allocation.invoiceId || allocation.invoiceNumber);
  }

  if (payment.invoiceId || payment.invoiceNumber) {
    return [
      {
        invoiceId: String(payment.invoiceId || "").trim(),
        invoiceNumber: String(payment.invoiceNumber || "").trim(),
        amount: Number(payment.amountReceived ?? payment.amount ?? 0),
      },
    ];
  }

  return [];
};

const buildPreview = (
  payments: Payment[],
  invoices: Invoice[],
  bounds: { start: Date; end: Date },
  selectedDateRange: DateRangePreset,
  debugEnabled = false,
): PreviewTableConfig | null => {
  const invoiceById = new Map<string, Invoice>();
  const invoiceByNumber = new Map<string, Invoice>();
  const stats = {
    paymentsInRange: 0,
    allocationsExpanded: 0,
    invoiceMatches: 0,
    skippedMissingInvoiceDate: 0,
    skippedMissingAmount: 0,
  };

  invoices.forEach((invoice) => {
    const invoiceId = String(invoice._id || invoice.id || "").trim();
    const invoiceNumber = String(invoice.invoiceNumber || "").trim().toLowerCase();
    if (invoiceId) invoiceById.set(invoiceId, invoice);
    if (invoiceNumber) invoiceByNumber.set(invoiceNumber, invoice);
  });

  const resolveInvoice = (allocation: any, payment: Payment) => {
    const invoiceId = String(
      allocation?.invoiceId ||
        allocation?.invoice?._id ||
        allocation?.invoice?.id ||
        allocation?.invoice ||
        payment.invoiceId ||
        "",
    ).trim();
    const invoiceNumber = String(
      allocation?.invoiceNumber ||
        allocation?.invoice?.invoiceNumber ||
        payment.invoiceNumber ||
        "",
    )
      .trim()
      .toLowerCase();

    return invoiceById.get(invoiceId) || invoiceByNumber.get(invoiceNumber) || allocation?.invoice || null;
  };

  const grouped = new Map<string, BucketSummary>();

  payments.forEach((payment) => {
    const paymentDate = parseReportDate(payment.paymentDate || payment.date);
    if (!paymentDate || paymentDate < bounds.start || paymentDate > bounds.end) return;

    stats.paymentsInRange += 1;

    const allocations = getPaymentAllocations(payment as PaymentWithInvoicePayments);
    stats.allocationsExpanded += allocations.length;

    allocations.forEach((allocation: any) => {
      const invoice = resolveInvoice(allocation, payment);
      const invoiceDate = parseReportDate(
        allocation?.invoiceDate ||
          allocation?.date ||
          allocation?.appliedAt ||
          invoice?.invoiceDate ||
          invoice?.date ||
          invoice?.dueDate,
      );
      if (!invoiceDate) {
        stats.skippedMissingInvoiceDate += 1;
        return;
      }

      const amount = Number(
        allocation?.amount ??
          allocation?.appliedAmount ??
          allocation?.amountReceived ??
          payment.amountReceived ??
          payment.amount ??
          0,
      );
      if (!Number.isFinite(amount) || amount <= 0) {
        stats.skippedMissingAmount += 1;
        return;
      }

      const customerName =
        String(
          invoice?.customerName ||
            invoice?.customer?.displayName ||
            invoice?.customer?.companyName ||
            invoice?.customer?.name ||
            payment.customerName ||
            "Unknown Customer",
        ).trim() || "Unknown Customer";

      const days = Math.max(0, Math.round((paymentDate.getTime() - invoiceDate.getTime()) / (1000 * 60 * 60 * 24)));
      const bucket = getTimeToGetPaidBucketLabel(days);
      stats.invoiceMatches += 1;
      const current = grouped.get(customerName) || {
        bucket0to15: 0,
        bucket16to30: 0,
        bucket31to45: 0,
        bucketAbove45: 0,
        total: 0,
      };

      current.total += amount;

      if (bucket === "0 - 15 Days") current.bucket0to15 += amount;
      else if (bucket === "16 - 30 Days") current.bucket16to30 += amount;
      else if (bucket === "31 - 45 Days") current.bucket31to45 += amount;
      else current.bucketAbove45 += amount;

      grouped.set(customerName, current);
    });
  });

  const entries = [...grouped.entries()]
    .filter(([, item]) => item.total > 0)
    .sort((a, b) => b[1].total - a[1].total || a[0].localeCompare(b[0]));

  if (entries.length === 0) return null;

  const grandTotal = entries.reduce((sum, [, item]) => sum + item.total, 0);
  if (grandTotal <= 0) return null;

  if (debugEnabled) {
    console.debug("[reports][time-to-get-paid] preview built", {
      stats,
      groupedCustomers: entries.length,
      grandTotal,
      bounds: {
        start: bounds.start.toISOString(),
        end: bounds.end.toISOString(),
      },
    });
  }

  const total0to15 = entries.reduce((sum, [, item]) => sum + item.bucket0to15, 0);
  const total16to30 = entries.reduce((sum, [, item]) => sum + item.bucket16to30, 0);
  const total31to45 = entries.reduce((sum, [, item]) => sum + item.bucket31to45, 0);
  const totalAbove45 = entries.reduce((sum, [, item]) => sum + item.bucketAbove45, 0);

  return {
    title: "Time to Get Paid",
    subtitle: getRangeLabel(selectedDateRange, bounds),
    columns: REPORT_COLUMNS,
    rows: entries.map(([customerName, item]) => {
      const customerTotal = item.total || 0;
      return [
        customerName,
        formatPercent(customerTotal ? (item.bucket0to15 / customerTotal) * 100 : 0),
        formatPercent(customerTotal ? (item.bucket16to30 / customerTotal) * 100 : 0),
        formatPercent(customerTotal ? (item.bucket31to45 / customerTotal) * 100 : 0),
        formatPercent(customerTotal ? (item.bucketAbove45 / customerTotal) * 100 : 0),
      ];
    }),
    totals: [
      "Total",
      formatPercent((total0to15 / grandTotal) * 100),
      formatPercent((total16to30 / grandTotal) * 100),
      formatPercent((total31to45 / grandTotal) * 100),
      formatPercent((totalAbove45 / grandTotal) * 100),
    ],
  };
};

const getDefaultCustomRange = (): RangeDate => {
  const now = new Date();
  return {
    start: toIsoDate(getMonthStart(now)),
    end: toIsoDate(getMonthEnd(now)),
  };
};

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
    return Object.entries(REPORTS_BY_CATEGORY)
      .map(([categoryId, reports]) => {
        const category = getCategoryById(categoryId);
        if (!category) return null;

        const filteredReports = query
          ? reports.filter(
              (report) =>
                report.name.toLowerCase().includes(query) ||
                category.name.toLowerCase().includes(query),
            )
          : reports;

        return {
          id: categoryId,
          label: category.name,
          reports: filteredReports,
        };
      })
      .filter(Boolean)
      .filter((section) => section.reports.length > 0) as Array<{
        id: string;
        label: string;
        reports: Array<{ id: string; categoryId: string; name: string }>;
      }>;
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
          <div className="text-[18px] font-semibold text-[#0f172a]">Reports</div>
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
            <div className="px-2 py-4 text-sm text-[#64748b]">No reports found.</div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function TimeToGetPaidReportPage() {
  const navigate = useNavigate();
  const { categoryId } = useParams();
  const resolvedCategoryId = categoryId || "payments-received";
  const category = getCategoryById(resolvedCategoryId);
  const report = getReportById(resolvedCategoryId, "time-to-get-paid");
  const filtersRef = useRef<HTMLDivElement>(null);
  const reportsMenuButtonRef = useRef<HTMLButtonElement | null>(null);
  const debugEnabled = useMemo(() => {
    if (typeof window === "undefined") return false;
    try {
      return new URLSearchParams(window.location.search).has("debug") || localStorage.getItem("reports_debug") === "1";
    } catch {
      return false;
    }
  }, []);

  const [selectedDateRange, setSelectedDateRange] = useState<DateRangePreset>("Today");
  const [isDateRangeOpen, setIsDateRangeOpen] = useState(false);
  const [dateRangeDraftKey, setDateRangeDraftKey] = useState<DateRangePreset>("Today");
  const [customDateRange, setCustomDateRange] = useState<RangeDate>(() => getDefaultCustomRange());
  const [customDateRangeDraft, setCustomDateRangeDraft] = useState<RangeDate>(() => getDefaultCustomRange());
  const [selectedColumns, setSelectedColumns] = useState<string[]>(REPORT_COLUMNS);
  const [customizeColumnsOpen, setCustomizeColumnsOpen] = useState(false);
  const [preview, setPreview] = useState<PreviewTableConfig | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [refreshTick, setRefreshTick] = useState(0);
  const [exportOpen, setExportOpen] = useState(false);
  const [groupByKey, setGroupByKey] = useState<"none">("none");
  const [groupByOpen, setGroupByOpen] = useState(false);
  const [isReportsDrawerOpen, setIsReportsDrawerOpen] = useState(false);
  const { settings } = useSettings();
  const organizationName = String(
    settings?.general?.companyDisplayName || settings?.general?.schoolDisplayName || "",
  ).trim();

  const selectedRangeBounds = useMemo(
    () => getDateRangeBounds(selectedDateRange, customDateRange),
    [customDateRange.end, customDateRange.start, selectedDateRange],
  );
  const dateLabel = useMemo(
    () => getRangeLabel(selectedDateRange, selectedRangeBounds),
    [selectedRangeBounds, selectedDateRange],
  );
  const closeTarget = "/reports";
  const reportDisplayName = report?.name || "Time to Get Paid";
  const categoryDisplayName = category?.name.replace(" Reports", "") || "Payments Received";
  const closeReportPage = () => {
    setExportOpen(false);
    setGroupByOpen(false);
    setCustomizeColumnsOpen(false);
    setIsDateRangeOpen(false);
    setIsReportsDrawerOpen(false);
    navigate(closeTarget);
  };

  const syncDateRangeDraft = () => {
    setDateRangeDraftKey(selectedDateRange);
    setCustomDateRangeDraft(customDateRange);
  };

  const openDateRangePicker = () => {
    syncDateRangeDraft();
    setIsDateRangeOpen((current) => !current);
  };

  const closeDateRangePicker = () => {
    syncDateRangeDraft();
    setIsDateRangeOpen(false);
  };

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (filtersRef.current && target && !filtersRef.current.contains(target)) {
        setIsDateRangeOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      setError("");
      try {
        const response = await reportsAPI.getTimeToGetPaid({
          fromDate: selectedRangeBounds.start.toISOString(),
          toDate: selectedRangeBounds.end.toISOString(),
        });
        if (cancelled) return;
        if (debugEnabled) {
          console.debug("[reports][time-to-get-paid] load", {
            range: selectedDateRange,
            bounds: {
              start: selectedRangeBounds.start.toISOString(),
              end: selectedRangeBounds.end.toISOString(),
            },
            rows: Array.isArray(response?.data?.rows) ? response.data.rows.length : 0,
            columns: Array.isArray(response?.data?.columns) ? response.data.columns.length : 0,
          });
        }
        setPreview(
          response?.data
            ? {
                title: String(response.data.title || "Time to Get Paid"),
                subtitle: String(response.data.subtitle || dateLabel),
                columns: Array.isArray(response.data.columns) ? response.data.columns : REPORT_COLUMNS,
                rows: Array.isArray(response.data.rows) ? response.data.rows : [],
                totals: Array.isArray(response.data.totals) ? response.data.totals : undefined,
              }
            : null,
        );
        if (debugEnabled) {
          console.debug("[reports][time-to-get-paid] load result", {
            hasPreview: Boolean(response?.data),
            range: selectedDateRange,
          });
        }
      } catch (error) {
        if (cancelled) return;
        setPreview(null);
        setError(error instanceof Error ? error.message : "Failed to load Time to Get Paid report");
        console.error("Failed to load Time to Get Paid report", error);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    setPreview(null);
    void load();

    return () => {
      cancelled = true;
    };
  }, [dateLabel, debugEnabled, refreshTick, selectedRangeBounds.end.getTime(), selectedRangeBounds.start.getTime(), selectedDateRange]);

  if (!category || !report) {
    return <Navigate to="/reports" replace />;
  }

  const previewColumns = preview?.columns ?? REPORT_COLUMNS;
  const previewRows = preview?.rows ?? [];
  const previewTotals = preview?.totals;
  const visiblePreviewColumns = selectedColumns.length > 0 ? selectedColumns : previewColumns;
  const previewColumnIndexMap = useMemo(() => {
    const map = new Map<string, number>();
    previewColumns.forEach((column, index) => {
      map.set(column, index);
    });
    return map;
  }, [previewColumns]);

  const getPreviewCell = (row: string[] | undefined, column: string) => {
    const index = previewColumnIndexMap.get(column);
    if (index === undefined) return "-";
    return row?.[index] ?? "-";
  };

  return (
    <div className="relative min-h-[calc(100vh-64px)] pt-3">
      <ReportsDrawer
        open={isReportsDrawerOpen}
        currentCategoryId={resolvedCategoryId}
        currentReportId="time-to-get-paid"
        triggerRef={reportsMenuButtonRef}
        onClose={() => setIsReportsDrawerOpen(false)}
      />
      <div
        className={`pr-3 transition-[padding-left,padding-right] duration-200 ${
          isReportsDrawerOpen ? "lg:pl-[260px]" : ""
        }`}
      >
        <div className="w-full px-3 pb-6">
          <section className="relative w-full overflow-visible rounded-[18px] border border-[#d7dce7] bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4 px-4 py-3">
            <div className="min-w-0">
              <div className="mb-1 text-[14px] font-medium leading-none text-[#1d6d79]">
                {categoryDisplayName}
              </div>
              <div className="flex min-w-0 items-baseline gap-2">
                <button
                  type="button"
                  ref={reportsMenuButtonRef}
                  onClick={() => setIsReportsDrawerOpen((current) => !current)}
                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded border border-[#d4d9e4] bg-white text-[#334155] hover:bg-[#f8fafc]"
                  aria-label="Open reports menu"
                >
                  <Menu size={15} />
                </button>
                <div className="flex min-w-0 items-baseline gap-2">
                  <h1 className="truncate text-[24px] font-semibold leading-tight text-[#0f172a]">
                    {reportDisplayName}
                  </h1>
                  <span className="truncate text-[14px] font-normal text-[#475569]">
                    {dateLabel}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => setExportOpen((current) => !current)}
                className="inline-flex h-8 items-center gap-1 rounded border border-[#d4d9e4] bg-white px-3 text-sm font-medium text-[#1e293b] hover:bg-[#f8fafc]"
              >
                Export <ChevronDown size={14} />
              </button>
              <button
                type="button"
                onClick={() => {
                  setRefreshTick((current) => current + 1);
                  toast.success(`Report refreshed: ${reportDisplayName}`);
                }}
                className="inline-flex h-8 w-8 items-center justify-center rounded border border-[#d4d9e4] text-[#334155] hover:bg-[#f8fafc]"
                aria-label="Refresh report"
              >
                <RefreshCw size={15} />
              </button>
              <button
                type="button"
                onClick={closeReportPage}
                className="inline-flex h-8 w-8 items-center justify-center rounded border border-[#d4d9e4] text-[#ef4444] hover:bg-[#fef2f2]"
                aria-label="Close report"
              >
                <X size={15} />
              </button>
            </div>
          </div>

          <div
            ref={filtersRef}
            className="relative border-t border-[#e6e9f0] px-4 py-2"
          >
            <button
              type="button"
              onClick={openDateRangePicker}
              className="inline-flex items-center gap-1 text-sm font-medium text-[#156372] hover:underline"
            >
              <Filter size={14} />
              Apply Filter
            </button>

            {isDateRangeOpen ? (
              <div className="absolute left-4 top-[calc(100%+8px)] z-30 w-[280px] overflow-hidden rounded-[10px] border border-[#d7dce7] bg-white shadow-[0_10px_30px_rgba(15,23,42,0.18)]">
                <div className="max-h-[300px] overflow-auto p-1">
                  {DATE_RANGE_PRESETS.map((preset) => {
                    const isActive = selectedDateRange === preset;
                    return (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => {
                          setDateRangeDraftKey(preset);
                          if (preset === "Custom") {
                            setCustomDateRangeDraft(customDateRange);
                          } else {
                            setSelectedDateRange(preset);
                            setIsDateRangeOpen(false);
                          }
                        }}
                        className={`flex w-full items-center rounded-[8px] px-3 py-2 text-left text-[14px] transition-colors ${
                          isActive ? "bg-[#f3f7f9] text-[#0f172a]" : "text-[#334155] hover:bg-[#f8fafc]"
                        }`}
                      >
                        {preset}
                      </button>
                    );
                  })}
                </div>

                {dateRangeDraftKey === "Custom" ? (
                  <div className="border-t border-[#edf1f7] p-3">
                    <div className="flex gap-2">
                      <input
                        type="date"
                        value={customDateRangeDraft.start}
                        onChange={(event) => {
                          setCustomDateRangeDraft((prev) => ({ ...prev, start: event.target.value }));
                        }}
                        className="h-9 w-full rounded-[8px] border border-[#d8deea] px-3 text-sm outline-none focus:border-[#156372]"
                      />
                      <input
                        type="date"
                        value={customDateRangeDraft.end}
                        onChange={(event) => {
                          setCustomDateRangeDraft((prev) => ({ ...prev, end: event.target.value }));
                        }}
                        className="h-9 w-full rounded-[8px] border border-[#d8deea] px-3 text-sm outline-none focus:border-[#156372]"
                      />
                    </div>

                    <div className="mt-3 flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={closeDateRangePicker}
                        className="rounded-[8px] px-3 py-1.5 text-[#334155] hover:bg-[#f3f7f9]"
                      >
                        Close
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setCustomDateRange(customDateRangeDraft);
                          setSelectedDateRange("Custom");
                          setDateRangeDraftKey("Custom");
                          setIsDateRangeOpen(false);
                          if (debugEnabled) {
                            console.debug("[reports][time-to-get-paid] apply custom range", customDateRangeDraft);
                          }
                        }}
                        className="rounded-[8px] bg-[#156372] px-4 py-1.5 font-semibold text-white hover:bg-[#0f4f5b]"
                      >
                        Apply
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="border-t border-[#edf1f7] px-3 py-2">
                    <div className="flex items-center justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedDateRange(dateRangeDraftKey);
                          setDateRangeDraftKey(dateRangeDraftKey);
                          setCustomDateRangeDraft(customDateRange);
                          setIsDateRangeOpen(false);
                          if (debugEnabled) {
                            console.debug("[reports][time-to-get-paid] apply preset range", dateRangeDraftKey);
                          }
                        }}
                        className="rounded-[8px] bg-[#156372] px-4 py-1.5 font-semibold text-white hover:bg-[#0f4f5b]"
                      >
                        Apply
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </div>

          <div className="border-t border-[#eef2f7] px-4 py-2">
            <div className="flex flex-wrap items-center justify-end gap-2">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setGroupByOpen((current) => !current)}
                  className="inline-flex h-8 items-center gap-1 rounded border border-[#cfd6e4] bg-white px-3 text-sm text-[#334155] hover:bg-[#f8fafc]"
                >
                  <span className="inline-flex items-center gap-2">
                    <Columns3 size={14} className="text-[#64748b]" />
                    Group By :
                    <strong className="text-[#0f172a]">{groupByKey === "none" ? "None" : "None"}</strong>
                  </span>
                  <ChevronDown size={14} />
                </button>
                {groupByOpen ? (
                  <div className="absolute right-0 top-[calc(100%+6px)] z-30 w-[220px] rounded-lg border border-[#d7dce7] bg-white p-2 shadow-[0_10px_24px_rgba(15,23,42,0.12)]">
                    <button
                      type="button"
                      onClick={() => {
                        setGroupByKey("none");
                        setGroupByOpen(false);
                      }}
                      className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm hover:bg-[#f8fafc]"
                    >
                      <span>None</span>
                      {groupByKey === "none" ? <Check size={14} className="text-[#64748b]" /> : null}
                    </button>
                  </div>
                ) : null}
              </div>

              <button
                type="button"
                onClick={() => setCustomizeColumnsOpen(true)}
                className="inline-flex h-8 items-center gap-1 rounded border border-[#cfd6e4] bg-white px-3 text-sm text-[#334155] hover:bg-[#f8fafc]"
              >
                <Columns3 size={14} className="text-[#64748b]" />
                Customize Report Columns
                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#d9eff1] px-1 text-[11px] font-semibold text-[#1b6f7b]">
                  {selectedColumns.length}
                </span>
              </button>
            </div>

            <div className="border-t border-[#eef2f7] px-4 py-10 text-center">
              {organizationName ? (
                <div className="mb-1 text-sm text-[#64748b]">{organizationName}</div>
              ) : null}
              <div className="text-[20px] font-semibold text-[#0f172a]">{reportDisplayName}</div>
              <div className="mt-1 text-sm text-[#156372]">{dateLabel}</div>
            </div>

            <div className="overflow-x-auto border-t border-[#eef2f7]">
              <table className="min-w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-[#eef2f7]">
                    {visiblePreviewColumns.map((column, index) => (
                      <th
                        key={column}
                        className={`px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#475569] ${
                          index === 0 ? "text-left" : "text-center"
                        }`}
                      >
                        {index === 0 ? (
                          <span className="inline-flex items-center gap-1">
                            {column}
                            <ChevronDown size={10} className="text-[#94a3b8]" />
                          </span>
                        ) : (
                          column
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td className="px-4 py-10 text-center text-sm text-[#64748b]" colSpan={visiblePreviewColumns.length}>
                        Loading report data...
                      </td>
                    </tr>
                  ) : error ? (
                    <tr>
                      <td className="px-4 py-10 text-center text-sm text-[#b91c1c]" colSpan={visiblePreviewColumns.length}>
                        {error}
                      </td>
                    </tr>
                  ) : previewRows.length === 0 ? (
                    <tr>
                      <td className="px-4 py-10 text-center text-sm text-[#64748b]" colSpan={visiblePreviewColumns.length}>
                        No report rows found for the selected filters.
                      </td>
                    </tr>
                  ) : (
                    <>
                      {previewRows.map((row, rowIndex) => (
                        <tr key={`${preview?.title || "time-to-get-paid"}-${rowIndex}`} className="border-b border-[#edf1f7] hover:bg-[#fcfdff]">
                          {visiblePreviewColumns.map((column, cellIndex) => {
                            const cell = getPreviewCell(row, column);
                            return (
                              <td
                                key={`${rowIndex}-${cellIndex}`}
                                className={`px-4 py-3 text-[14px] ${
                                  cellIndex === 0 ? "font-medium text-[#156372]" : "text-center text-[#334155]"
                                }`}
                              >
                                {cell}
                              </td>
                            );
                          })}
                        </tr>
                      ))}

                      {previewTotals ? (
                        <tr className="border-b border-[#edf1f7] bg-white">
                          {visiblePreviewColumns.map((column, cellIndex) => {
                            const cell = getPreviewCell(previewTotals, column);
                            return (
                              <td
                                key={`total-${cellIndex}`}
                                className={`px-4 py-3 text-[14px] ${
                                  cellIndex === 0 ? "font-semibold text-[#0f172a]" : "text-center text-[#0f172a]"
                                }`}
                              >
                                {cell}
                              </td>
                            );
                          })}
                        </tr>
                      ) : null}
                    </>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          </section>
        </div>
      </div>

      {exportOpen ? (
        <div className="absolute right-6 top-16 z-40 w-[220px] overflow-hidden rounded-lg border border-[#d7dce7] bg-white shadow-[0_10px_24px_rgba(15,23,42,0.12)]">
          {["PDF", "XLSX (Microsoft Excel)", "Print"].map((label) => (
            <button
              key={label}
              type="button"
              onClick={() => {
                setExportOpen(false);
                toast.success(`Export ${label} started`);
              }}
              className="flex w-full items-center px-3 py-2 text-left text-sm text-[#334155] hover:bg-[#f8fafc]"
            >
              {label}
            </button>
          ))}
        </div>
      ) : null}

      <ReportCustomizeColumnsModal
        open={customizeColumnsOpen}
        reportName={reportDisplayName}
        availableGroups={REPORT_COLUMN_GROUPS}
        selectedColumns={selectedColumns}
        onClose={() => setCustomizeColumnsOpen(false)}
        onSave={(nextVisibleColumns) => {
          setSelectedColumns(nextVisibleColumns);
          setCustomizeColumnsOpen(false);
        }}
      />
    </div>
  );
}
