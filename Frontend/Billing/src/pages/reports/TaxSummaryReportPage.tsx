import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { useQuery } from "@tanstack/react-query";
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
  X,
} from "lucide-react";
import ReportCustomizeColumnsModal, {
  type ColumnGroup,
} from "./ReportCustomizeColumnsModal";
import { getCategoryById, getReportById, REPORTS_BY_CATEGORY } from "./reportsCatalog";
import { useSettings } from "../../lib/settings/SettingsContext";
import { API_BASE_URL, getToken } from "../../services/auth";

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
type GroupByKey = "none";
type ColumnKey =
  | "Tax Name"
  | "Tax Percentage"
  | "Taxable Amount"
  | "Tax Amount";
type DateRangeValue = { start: Date; end: Date };
type TaxSummaryRow = {
  id: string;
  dateValue: Date | null;
  taxName: string;
  taxPercent: number;
  taxableAmount: number;
  taxAmount: number;
  currency: string;
};

const COLUMNS: ColumnKey[] = [
  "Tax Name",
  "Tax Percentage",
  "Taxable Amount",
  "Tax Amount",
];

const COLUMN_GROUPS: ColumnGroup[] = [{ label: "Reports", items: COLUMNS }];

const DATE_OPTIONS: Array<{ key: DateRangeKey; label: string }> = [
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

const GROUP_OPTIONS: Array<{ key: GroupByKey; label: string }> = [{ key: "none", label: "None" }];

const fmtDate = (value: Date) =>
  value.toLocaleDateString("en-GB", {
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

const startOfDay = (value: Date) => new Date(value.getFullYear(), value.getMonth(), value.getDate());
const endOfDay = (value: Date) =>
  new Date(value.getFullYear(), value.getMonth(), value.getDate(), 23, 59, 59, 999);
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
const startOfWeek = (value: Date) => {
  const date = startOfDay(value);
  date.setDate(date.getDate() - date.getDay());
  return date;
};
const endOfWeek = (value: Date) => {
  const date = startOfWeek(value);
  date.setDate(date.getDate() + 6);
  return endOfDay(date);
};
const startOfMonth = (value: Date) => new Date(value.getFullYear(), value.getMonth(), 1);
const endOfMonth = (value: Date) =>
  new Date(value.getFullYear(), value.getMonth() + 1, 0, 23, 59, 59, 999);
const startOfQuarter = (value: Date) => {
  const month = Math.floor(value.getMonth() / 3) * 3;
  return new Date(value.getFullYear(), month, 1);
};
const endOfQuarter = (value: Date) => {
  const month = Math.floor(value.getMonth() / 3) * 3;
  return new Date(value.getFullYear(), month + 3, 0, 23, 59, 59, 999);
};
const startOfYear = (value: Date) => new Date(value.getFullYear(), 0, 1);
const endOfYear = (value: Date) => new Date(value.getFullYear(), 11, 31, 23, 59, 59, 999);

const toText = (value: unknown) => String(value ?? "").trim();
const toNumber = (value: unknown) => {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};
const normalizeCurrency = (value: unknown) => {
  const raw = toText(value);
  return (raw.split(" - ")[0].split(" ")[0].trim().toUpperCase() || "SOS");
};
const getAuthHeaders = () => {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};
const fetchCollectionRows = async (path: string) => {
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      credentials: "include",
      headers: {
        Accept: "application/json",
        ...getAuthHeaders(),
      },
    });

    if (!response.ok) return [];
    const payload = await response.json().catch(() => null);
    return Array.isArray(payload?.data) ? payload.data : [];
  } catch {
    return [];
  }
};
const parseDate = (value: unknown) => {
  if (!value) return null;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
};
const getRange = (key: DateRangeKey, custom: DateRangeValue) => {
  const now = new Date();
  if (key === "today") return { start: startOfDay(now), end: endOfDay(now) };
  if (key === "this-week") return { start: startOfWeek(now), end: endOfWeek(now) };
  if (key === "this-quarter") return { start: startOfQuarter(now), end: endOfQuarter(now) };
  if (key === "this-year") return { start: startOfYear(now), end: endOfYear(now) };
  if (key === "yesterday") {
    const day = startOfDay(now);
    day.setDate(day.getDate() - 1);
    return { start: day, end: endOfDay(day) };
  }
  if (key === "previous-week") {
    const start = startOfWeek(now);
    start.setDate(start.getDate() - 7);
    return { start, end: endOfWeek(start) };
  }
  if (key === "previous-month") {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return { start, end: endOfMonth(start) };
  }
  if (key === "previous-quarter") {
    const quarterMonth = Math.floor(now.getMonth() / 3) * 3 - 3;
    const start = new Date(now.getFullYear(), quarterMonth, 1);
    return { start, end: endOfQuarter(start) };
  }
  if (key === "previous-year") {
    const start = new Date(now.getFullYear() - 1, 0, 1);
    return { start, end: endOfYear(start) };
  }
  if (key === "all-time") return { start: new Date(1970, 0, 1), end: endOfYear(new Date(now.getFullYear() + 1, 11, 31)) };
  if (key === "custom") return custom;
  return { start: startOfMonth(now), end: endOfMonth(now) };
};
const inRange = (value: Date, range: DateRangeValue) =>
  value >= startOfDay(range.start) && value <= endOfDay(range.end);
const formatMoney = (value: number, currency: string) =>
  `${normalizeCurrency(currency)}${Number(value || 0).toFixed(2)}`;

export default function TaxSummaryReportPage() {
  const navigate = useNavigate();
  const menuButtonRef = useRef<HTMLButtonElement | null>(null);
  const dateRangeRef = useRef<HTMLDivElement | null>(null);
  const { categoryId, reportId } = useParams();
  const { settings } = useSettings() as any;
  const category = getCategoryById(categoryId || "purchases-expenses");
  const report = getReportById(categoryId || "purchases-expenses", reportId || "billable-expense-details");
  const organizationName = String(
    settings?.general?.companyDisplayName || settings?.general?.schoolDisplayName || "",
  ).trim();

  const [isReportsDrawerOpen, setIsReportsDrawerOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [dateRangeKey, setDateRangeKey] = useState<DateRangeKey>("this-month");
  const [dateRangeDraftKey, setDateRangeDraftKey] =
    useState<DateRangeKey>("this-month");
  const [isDateRangeOpen, setIsDateRangeOpen] = useState(false);
  const [isCustomDateRangeOpen, setIsCustomDateRangeOpen] = useState(false);
  const [customDateRange, setCustomDateRange] = useState<DateRangeValue>(() => {
    const now = new Date();
    return { start: startOfMonth(now), end: endOfMonth(now) };
  });
  const [customDateRangeDraft, setCustomDateRangeDraft] =
    useState<DateRangeValue>(() => {
      const now = new Date();
      return { start: startOfMonth(now), end: endOfMonth(now) };
    });
  const [customDateRangeMonth, setCustomDateRangeMonth] = useState<Date>(() => {
    const now = new Date();
    return getStartOfMonth(now);
  });
  const [isMoreFiltersOpen, setIsMoreFiltersOpen] = useState(false);
  const [isGroupByOpen, setIsGroupByOpen] = useState(false);
  const [isCustomizeOpen, setIsCustomizeOpen] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);
  const [groupBy, setGroupBy] = useState<GroupByKey>("none");
  const [vendorFilter, setVendorFilter] = useState("");
  const [itemFilter, setItemFilter] = useState("");
  const [visibleColumns, setVisibleColumns] = useState<ColumnKey[]>(() => {
    try {
      if (typeof window === "undefined") return COLUMNS;
      const raw = window.localStorage.getItem("tax_summary_visible_columns_v1");
      const parsed = raw ? JSON.parse(raw) : null;
      if (Array.isArray(parsed) && parsed.every((item) => COLUMNS.includes(item))) {
        return parsed;
      }
    } catch {
      // ignore
    }
      return COLUMNS;
  });

  const range = useMemo(() => getRange(dateRangeKey, customDateRange), [customDateRange, dateRangeKey]);
  const rangeLabel = DATE_OPTIONS.find((option) => option.key === dateRangeKey)?.label ?? "This Month";

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

  const query = useQuery({
    queryKey: ["reports", "tax-summary", refreshTick],
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const [invoices, receipts] = await Promise.all([
        fetchCollectionRows("/invoices"),
        fetchCollectionRows("/sales-receipts"),
      ]);
      const items = [...invoices, ...receipts];
      const rows: TaxSummaryRow[] = items.flatMap((document: any) => {
        const dateValue = parseDate(
          document.date ||
            document.invoiceDate ||
            document.invoice_date ||
            document.receiptDate ||
            document.receipt_date ||
            document.createdAt ||
            document.created_at ||
            document.updatedAt ||
            document.updated_at,
        );
        if (!dateValue) return [];

        const currency = normalizeCurrency(document.currency_code || document.currencyCode || document.currency || "SOS");
        const baseItems = Array.isArray(document.items)
          ? document.items
          : Array.isArray(document.lines)
            ? document.lines
            : Array.isArray(document.lineItems)
              ? document.lineItems
              : [];
        const fallbackLabel = "Tax";

        const buildRow = (item: any, index: number): TaxSummaryRow => {
          const taxName =
            toText(
              item?.taxName ||
                item?.tax_name ||
                item?.tax?.name ||
                item?.tax?.taxName ||
                item?.tax_label ||
                item?.taxLabel ||
                document?.taxName ||
                document?.tax_name ||
                fallbackLabel,
            ) || fallbackLabel;
          const taxPercent = toNumber(
            item?.taxRate ??
              item?.tax_rate ??
              item?.taxPercentage ??
              item?.tax_percentage ??
              item?.tax?.rate ??
              item?.tax?.taxRate ??
              document?.taxRate ??
              document?.tax_rate ??
              document?.taxPercentage ??
              document?.tax_percentage ??
              0,
          );
          const taxableAmount = toNumber(
            item?.taxableAmount ??
              item?.taxable_amount ??
              item?.sub_total ??
              item?.subTotal ??
              item?.amount ??
              item?.total ??
              item?.price ??
              item?.lineTotal ??
              item?.netAmount ??
              document?.subtotal ??
              document?.sub_total ??
              document?.total ??
              0,
          );
          const taxAmount = toNumber(
            item?.taxAmount ??
              item?.tax_amount ??
              item?.tax ??
              item?.amountTax ??
              item?.vat ??
              item?.totalTax ??
              document?.taxAmount ??
              document?.tax_amount ??
              document?.totalTax ??
              (taxPercent > 0 ? (taxableAmount * taxPercent) / 100 : 0),
          );

          return {
            id: String(
              item?._id ||
                item?.id ||
                document?._id ||
                document?.id ||
                document?.invoiceNumber ||
                document?.receiptNumber ||
                `${taxName}-${taxPercent}-${dateValue.toISOString()}-${index}`,
            ),
            dateValue,
            taxName,
            taxPercent,
            taxableAmount,
            taxAmount,
            currency,
          };
        };

        if (baseItems.length === 0) {
          return [buildRow({}, 0)];
        }
        return baseItems.map((item: any, index: number) => buildRow(item, index));
      });
      return { rows };
    },
  });

  const filteredRows = useMemo(() => {
    const rows = query.data?.rows || [];
    return rows
      .filter((row) => row.dateValue && inRange(row.dateValue, range))
      .filter((row) => (vendorFilter.trim() ? row.taxName.toLowerCase().includes(vendorFilter.trim().toLowerCase()) : true))
      .filter((row) => (itemFilter.trim() ? String(row.taxPercent ?? 0).includes(itemFilter.trim()) : true))
      .sort((a, b) => (b.dateValue?.getTime() || 0) - (a.dateValue?.getTime() || 0));
  }, [itemFilter, query.data?.rows, range, vendorFilter]);

  const groupedRows = useMemo(() => {
    const grouped = new Map<string, { taxName: string; taxPercent: number; taxableAmount: number; taxAmount: number; currency: string }>();
    filteredRows.forEach((row) => {
      const key = `${row.taxName}-${row.taxPercent}-${row.currency}`;
      const current = grouped.get(key) || {
        taxName: row.taxName,
        taxPercent: row.taxPercent,
        taxableAmount: 0,
        taxAmount: 0,
        currency: row.currency,
      };
      current.taxableAmount += row.taxableAmount;
      current.taxAmount += row.taxAmount;
      grouped.set(key, current);
    });
    return [...grouped.values()]
      .sort((a, b) => b.taxAmount - a.taxAmount)
      .map((group) => ({
        label: `${group.taxName} (${group.taxPercent.toFixed(2)}%)`,
        rows: [
          {
            id: `${group.taxName}-${group.taxPercent}-${group.currency}`,
            dateValue: null,
            taxName: group.taxName,
            taxPercent: group.taxPercent,
            taxableAmount: group.taxableAmount,
            taxAmount: group.taxAmount,
            currency: group.currency,
          } as TaxSummaryRow,
        ],
      }));
  }, [filteredRows]);

  useEffect(() => {
    try {
      if (typeof window === "undefined") return;
      window.localStorage.setItem("tax_summary_visible_columns_v1", JSON.stringify(visibleColumns));
    } catch {
      // ignore
    }
  }, [visibleColumns]);

  if (!report || !category) {
    return <Navigate to="/reports" replace />;
  }

  const runReport = () => {
    setRefreshTick((value) => value + 1);
    setIsMoreFiltersOpen(false);
    toast.success("Report refreshed");
  };

  const handleExport = (label: string) => {
    setIsExportOpen(false);
    toast.info(`${label} export started`);
  };

  function openDateRangeDropdown() {
    if (isDateRangeOpen) {
      setIsDateRangeOpen(false);
      setIsCustomDateRangeOpen(false);
      return;
    }

    const currentRange =
      dateRangeKey === "custom" ? customDateRange : getRange(dateRangeKey, customDateRange);
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
        dateRangeKey === "custom" ? customDateRange.start : getRange(dateRangeKey, customDateRange).start,
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

  const toggleGroupBy = () => {
    setIsGroupByOpen((prev) => !prev);
    setIsDateRangeOpen(false);
    setIsMoreFiltersOpen(false);
    setIsExportOpen(false);
  };

  const dateRangeText = `${fmtDate(range.start)} To ${fmtDate(range.end)}`;

  return (
    <div className="relative min-h-[calc(100vh-64px)] pt-3">
      <ReportsDrawer
        open={isReportsDrawerOpen}
        currentCategoryId={category.id}
        currentReportId={report.id}
        triggerRef={menuButtonRef}
        onClose={() => setIsReportsDrawerOpen(false)}
      />
      <div className="w-full space-y-4">
      <div className="flex w-full flex-wrap items-start justify-between gap-4 border-b border-[#e5e7eb] pb-3">
        <div className="flex min-w-0 items-start gap-3">
          <button
            type="button"
            ref={menuButtonRef}
            onClick={() => setIsReportsDrawerOpen((prev) => !prev)}
            className="inline-flex h-8 w-8 items-center justify-center rounded border border-[#d4d9e4] bg-white text-[#334155] hover:bg-[#f8fafc]"
            aria-label="Open reports menu"
          >
            <Menu size={15} />
          </button>
          <div>
            <p className="text-sm font-medium text-[#1b6f7b]">{category.name}</p>
            <h1 className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-1 text-[24px] font-semibold leading-tight text-[#0f172a]">
              <span>{report.name}</span>
              <span className="text-sm font-normal text-[#475569]">- From {dateRangeText}</span>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsExportOpen((prev) => !prev)}
              className={`inline-flex h-9 items-center gap-1 rounded border bg-white px-3 text-sm font-medium text-[#1e293b] hover:bg-[#f8fafc] ${
                isExportOpen ? "border-[#1b6f7b]" : "border-[#d4d9e4]"
              }`}
            >
              Export <ChevronDown size={14} className={isExportOpen ? "rotate-180" : ""} />
            </button>
            {isExportOpen ? (
              <div className="absolute right-0 top-[calc(100%+6px)] z-50 w-[220px] overflow-hidden rounded-lg border border-[#d7dce7] bg-white shadow-[0_10px_24px_rgba(15,23,42,0.12)]">
                {["PDF", "XLSX (Microsoft Excel)", "Print"].map((label) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => handleExport(label)}
                    className="flex w-full items-center px-3 py-2 text-left text-sm text-[#334155] hover:bg-[#f8fafc]"
                  >
                    {label}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <button
            type="button"
            onClick={runReport}
            className="inline-flex h-9 w-9 items-center justify-center rounded border border-[#d4d9e4] text-[#334155] hover:bg-[#f8fafc]"
            aria-label="Refresh report"
          >
            <RefreshCw size={15} />
          </button>

          <button
            type="button"
            onClick={() => navigate("/reports")}
            className="inline-flex h-9 w-9 items-center justify-center rounded border border-[#d4d9e4] text-[#ef4444] hover:bg-[#fef2f2]"
            aria-label="Close report page"
          >
            <X size={15} />
          </button>
        </div>
      </div>

      <div className="relative flex flex-wrap items-center gap-2 border-b border-[#e6e9f0] pb-3 text-sm">
        <span className="inline-flex items-center gap-1 text-[#334155]">
          <Filter size={14} className="text-[#64748b]" />
          <span>Filters :</span>
        </span>

        <div ref={dateRangeRef} className="relative">
          <button
            type="button"
            onClick={openDateRangeDropdown}
            className={`inline-flex h-8 items-center gap-1 rounded border px-3 text-sm text-[#334155] hover:bg-white ${
              isDateRangeOpen ? "border-[#156372] bg-white" : "border-[#cfd6e4] bg-[#f8fafc]"
            }`}
            aria-haspopup="menu"
            aria-expanded={isDateRangeOpen}
          >
            <CalendarDays size={14} className="text-[#64748b]" />
            Date Range : <span className="font-medium">{rangeLabel}</span>
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
                    {DATE_OPTIONS.map((option) => {
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
                                  : getRange(dateRangeKey, customDateRange);
                              setDateRangeDraftKey("custom");
                              setCustomDateRangeDraft(currentRange);
                              setCustomDateRangeMonth(getStartOfMonth(currentRange.start));
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
                          {isSelected ? <Check size={14} className="text-[#0f172a]" /> : null}
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
                            type="text"
                            readOnly
                            value={formatPickerDate(customDateRangeDraft.end)}
                            className="h-10 w-full rounded border border-[#156372] bg-white pl-9 pr-3 text-sm text-[#334155] outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-[1fr_1fr] gap-3">
                      {[{
                        month: customDateRangeMonth, side: "start" as const
                      }, {
                        month: addMonths(customDateRangeMonth, 1), side: "end" as const
                      }].map(({ month, side }) => {
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
                                  setCustomDateRangeMonth((prev) => addMonths(prev, -1))
                                }
                                className="inline-flex h-6 w-6 items-center justify-center rounded hover:bg-[#f8fafc]"
                                aria-label="Previous month"
                              >
                                <ChevronRight size={14} className="rotate-180 text-[#64748b]" />
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
                                  setCustomDateRangeMonth((prev) => addMonths(prev, 1))
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
                        {formatPickerDate(customDateRangeDraft.start)} - {formatPickerDate(customDateRangeDraft.end)}
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
          onClick={() => {
            setIsMoreFiltersOpen((prev) => !prev);
            setIsDateRangeOpen(false);
            setIsGroupByOpen(false);
            setIsExportOpen(false);
          }}
          className={`inline-flex h-8 items-center gap-1 rounded border px-3 text-sm text-[#334155] hover:bg-white ${
            isMoreFiltersOpen ? "border-[#1b6f7b] bg-white" : "border-[#cfd6e4] bg-[#f8fafc]"
          }`}
        >
          <Plus size={14} className="text-[#1b6f7b]" />
          More Filters
        </button>

        <button
          type="button"
          onClick={runReport}
          className="inline-flex h-8 items-center gap-1 rounded bg-[#1b6f7b] px-4 text-sm font-semibold text-white hover:bg-[#155963]"
        >
          <CalendarDays size={14} /> Run Report
        </button>

        {isMoreFiltersOpen ? (
          <div className="absolute left-0 top-[calc(100%+6px)] z-40 w-[360px] rounded-lg border border-[#d7dce7] bg-white p-4 shadow-[0_10px_24px_rgba(15,23,42,0.12)]">
            <div className="grid gap-3">
              <label className="block">
                <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#64748b]">Tax Name</div>
                <input
                  value={vendorFilter}
                  onChange={(event) => setVendorFilter(event.target.value)}
                  className="h-9 w-full rounded border border-[#cfd6e4] bg-white px-3 text-sm text-[#334155] outline-none focus:border-[#1b6f7b]"
                />
              </label>
              <label className="block">
                <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#64748b]">Tax Percentage</div>
                <input
                  value={itemFilter}
                  onChange={(event) => setItemFilter(event.target.value)}
                  className="h-9 w-full rounded border border-[#cfd6e4] bg-white px-3 text-sm text-[#334155] outline-none focus:border-[#1b6f7b]"
                />
              </label>
              <div className="flex items-center justify-between gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setVendorFilter("");
                    setItemFilter("");
                  }}
                  className="text-sm font-medium text-[#1b6f7b] hover:underline"
                >
                  Clear Filters
                </button>
                <button
                  type="button"
                  onClick={runReport}
                  className="inline-flex h-8 items-center rounded bg-[#1b6f7b] px-4 text-sm font-semibold text-white hover:bg-[#155963]"
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <div className="w-full rounded-lg border border-[#e5e7eb] bg-white">
        <div className="flex items-center justify-end gap-3 border-b border-[#eef2f7] px-3 py-2">
          <div className="relative">
            <button
              type="button"
              onClick={toggleGroupBy}
              className="inline-flex h-8 items-center gap-1 rounded border border-[#d4d9e4] bg-white px-3 text-sm text-[#334155] hover:bg-[#f8fafc]"
            >
              <Folder size={14} className="text-[#64748b]" />
              Group By : <span className="font-medium text-[#0f172a]">{GROUP_OPTIONS.find((option) => option.key === groupBy)?.label ?? "None"}</span>
              <ChevronDown size={14} />
            </button>
            {isGroupByOpen ? (
              <div className="absolute right-0 top-[calc(100%+6px)] z-40 w-[220px] overflow-hidden rounded-lg border border-[#d7dce7] bg-white shadow-[0_10px_24px_rgba(15,23,42,0.12)]">
                {GROUP_OPTIONS.map((option) => (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => {
                      setGroupBy(option.key);
                      setIsGroupByOpen(false);
                    }}
                    className={`flex w-full items-center justify-between px-4 py-2 text-left text-sm ${
                      groupBy === option.key ? "font-medium text-[#0f172a]" : "text-[#334155] hover:bg-[#f8fafc]"
                    }`}
                  >
                    <span>{option.label}</span>
                    {groupBy === option.key ? <span className="text-[#1b6f7b]">●</span> : null}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <button
            type="button"
            onClick={() => setIsCustomizeOpen(true)}
            className="inline-flex h-8 items-center gap-1 rounded border border-[#d4d9e4] bg-white px-3 text-sm text-[#334155] hover:bg-[#f8fafc]"
          >
            <Columns3 size={14} />
            Customize Report Columns
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#d9eff1] px-1 text-[11px] font-semibold text-[#1b6f7b]">
              {visibleColumns.length}
            </span>
          </button>
        </div>

        <div className="px-3 py-4">
          <div className="rounded-[12px] border border-[#eef2f7] bg-[#fbfcfe] px-4 py-4 text-center">
            <div className="text-[13px] text-[#64748b]">{organizationName || "Organization"}</div>
            <div className="mt-1 text-[18px] font-semibold text-[#111827]">{report.name}</div>
            <div className="mt-1 text-[13px] text-[#156372]">{dateRangeText}</div>
            <div className="mt-2 text-[13px] text-[#334155]">Basis : <span className="font-semibold text-[#0f172a]">Accrual</span></div>
          </div>
        </div>

        <div className="overflow-x-auto border-t border-[#eef2f7]">
          <table className="w-full min-w-full border-collapse">
            <thead>
              <tr className="border-b border-[#e5e7eb] text-left text-[11px] uppercase tracking-[0.08em] text-[#64748b]">
                {visibleColumns.map((column) => (
                  <th
                    key={column}
                    className={`px-3 py-3 font-semibold ${
                      column === "Tax Percentage" ||
                      column === "Taxable Amount" ||
                      column === "Tax Amount"
                        ? "text-right"
                        : "text-left"
                    }`}
                  >
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {query.isLoading ? (
                <tr className="border-b border-[#eef2f7]">
                  <td className="px-3 py-8 text-center text-sm text-[#64748b]" colSpan={visibleColumns.length}>
                    Loading report data...
                  </td>
                </tr>
              ) : query.isError ? (
                <tr className="border-b border-[#eef2f7]">
                  <td className="px-3 py-8 text-center text-sm text-[#b91c1c]" colSpan={visibleColumns.length}>
                    {query.error instanceof Error ? query.error.message : "Failed to load tax summary"}
                  </td>
                </tr>
              ) : filteredRows.length === 0 ? (
                <tr className="border-b border-[#eef2f7]">
                  <td className="px-3 py-8 text-center text-sm text-[#64748b]" colSpan={visibleColumns.length}>
                    No data to display
                  </td>
                </tr>
              ) : (
                groupedRows.map((group) => (
                  <React.Fragment key={group.label}>
                    {groupBy !== "none" ? (
                      <tr className="bg-[#f8fafc]">
                        <td className="px-3 py-2 text-[12px] font-semibold text-[#334155]" colSpan={visibleColumns.length}>
                          {group.label}
                          <span className="ml-2 font-normal text-[#64748b]">({group.rows.length})</span>
                        </td>
                      </tr>
                    ) : null}
                    {group.rows.map((row) => (
                      <tr key={row.id} className="border-b border-[#eef2f7]">
                        {visibleColumns.map((column) => (
                          <td
                            key={`${row.id}-${column}`}
                            className={`px-3 py-3 text-sm text-[#334155] ${
                              column === "Tax Percentage" ||
                              column === "Taxable Amount" ||
                              column === "Tax Amount"
                                ? "text-right"
                                : "text-left"
                            }`}
                          >
                            {column === "Tax Name"
                              ? row.taxName
                              : column === "Tax Percentage"
                                ? `${Number(row.taxPercent || 0).toFixed(2)}%`
                                : column === "Taxable Amount"
                                  ? formatMoney(row.taxableAmount, row.currency)
                                  : formatMoney(row.taxAmount, row.currency)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ReportCustomizeColumnsModal
        open={isCustomizeOpen}
        reportName={report.name}
        availableGroups={COLUMN_GROUPS}
        selectedColumns={visibleColumns}
        onClose={() => setIsCustomizeOpen(false)}
        onSave={(nextVisibleColumns) => {
          const next = nextVisibleColumns.filter((item): item is ColumnKey => COLUMNS.includes(item as ColumnKey));
          if (next.length > 0) setVisibleColumns(next);
          setIsCustomizeOpen(false);
        }}
      />
      </div>
    </div>
  );
}





