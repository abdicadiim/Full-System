import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import {
  CalendarDays,
  Check,
  ChevronDown,
  Columns3,
  Filter,
  Menu,
  Plus,
  RefreshCw,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { useCurrency } from "../../hooks/useCurrency";
import { useSettings } from "../../lib/settings/SettingsContext";
import { refundsAPI } from "../../services/api";
import { getPayments, type Payment } from "../salesModel";

type ReportMode = "payments" | "refund-history";

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

type DateRangeValue = {
  start: Date;
  end: Date;
};

type GroupByKey = "none" | "customer-name" | "payment-mode" | "status" | "deposit-to";

type MoreFilterFieldKey =
  | "payment-number"
  | "reference-number"
  | "customer-name"
  | "payment-mode"
  | "status"
  | "invoice-number"
  | "deposit-to"
  | "notes";

type MoreFilterComparatorKey = "is-empty" | "is-not-empty" | "is-in" | "is-not-in" | "starts-with" | "ends-with" | "contains" | "does-not-contain";

type MoreFilterRow = {
  id: string;
  field: MoreFilterFieldKey | "";
  comparator: MoreFilterComparatorKey | "";
  value: string;
};

type PaymentColumnKey =
  | "payment-number"
  | "date"
  | "status"
  | "reference-number"
  | "customer-name"
  | "payment-mode"
  | "notes"
  | "invoice-number"
  | "deposit-to"
  | "amount"
  | "unused-amount";

type ColumnOption = {
  key: PaymentColumnKey;
  label: string;
  kind: "text" | "number" | "currency";
  locked?: boolean;
};

type ColumnGroup = {
  label: string;
  options: ColumnOption[];
};

type Option = { key: string; label: string };

type RefundRecord = {
  id?: string;
  _id?: string;
  refundNumber?: string;
  refundDate?: string;
  createdAt?: string;
  referenceNumber?: string;
  customerName?: string;
  paymentMethod?: string;
  paymentMode?: string;
  description?: string;
  notes?: string;
  amount?: number;
  currency?: string;
  fromAccount?: string;
  status?: string;
  invoiceNumber?: string;
  paymentId?: string;
  creditNoteId?: string;
  exchangeRate?: number;
  exchange_rate?: number;
  fxRate?: number;
  rate?: number;
};

const DATE_RANGE_OPTIONS: Array<{ key: DateRangeKey; label: string }> = [
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

const GROUP_BY_OPTIONS: Array<{ key: GroupByKey; label: string }> = [
  { key: "none", label: "None" },
  { key: "customer-name", label: "Customer Name" },
  { key: "payment-mode", label: "Payment Mode" },
  { key: "status", label: "Status" },
  { key: "deposit-to", label: "Deposit To" },
];

const REFUND_GROUP_BY_OPTIONS: Array<{ key: GroupByKey; label: string }> = [
  { key: "none", label: "None" },
  { key: "customer-name", label: "Customer Name" },
  { key: "payment-mode", label: "Mode" },
  { key: "status", label: "Status" },
  { key: "deposit-to", label: "From Account" },
];

const MORE_FILTER_COMPARATORS: Array<{ key: MoreFilterComparatorKey; label: string }> = [
  { key: "is-empty", label: "is empty" },
  { key: "is-not-empty", label: "is not empty" },
  { key: "is-in", label: "is in" },
  { key: "is-not-in", label: "is not in" },
  { key: "starts-with", label: "starts with" },
  { key: "ends-with", label: "ends with" },
  { key: "contains", label: "contains" },
  { key: "does-not-contain", label: "doesn't contain" },
];

const MORE_FILTER_FIELD_OPTIONS: Array<{ key: MoreFilterFieldKey; label: string }> = [
  { key: "payment-number", label: "Payment Number" },
  { key: "reference-number", label: "Reference Number" },
  { key: "customer-name", label: "Customer Name" },
  { key: "payment-mode", label: "Payment Mode" },
  { key: "status", label: "Status" },
  { key: "invoice-number", label: "Invoice#" },
  { key: "deposit-to", label: "Deposit To" },
  { key: "notes", label: "Notes" },
];

const REFUND_MORE_FILTER_FIELD_OPTIONS: Array<{ key: MoreFilterFieldKey; label: string }> = [
  { key: "payment-number", label: "Transaction#" },
  { key: "reference-number", label: "Reference#" },
  { key: "customer-name", label: "Customer Name" },
  { key: "payment-mode", label: "Mode" },
  { key: "status", label: "Status" },
  { key: "invoice-number", label: "Invoice#" },
  { key: "deposit-to", label: "From Account" },
  { key: "notes", label: "Notes" },
];

const PAYMENT_COLUMN_GROUPS: ColumnGroup[] = [
  {
    label: "Payments",
    options: [
      { key: "payment-number", label: "Payment Number", kind: "text", locked: true },
      { key: "date", label: "Date", kind: "text", locked: true },
      { key: "status", label: "Status", kind: "text" },
      { key: "reference-number", label: "Reference Number", kind: "text" },
      { key: "customer-name", label: "Customer Name", kind: "text" },
      { key: "payment-mode", label: "Payment Mode", kind: "text" },
      { key: "notes", label: "Notes", kind: "text" },
      { key: "invoice-number", label: "Invoice#", kind: "text" },
      { key: "deposit-to", label: "Deposit To", kind: "text" },
      { key: "amount", label: "Amount (FCY)", kind: "currency" },
      { key: "unused-amount", label: "Unused Amount", kind: "currency" },
    ],
  },
];

const REFUND_COLUMN_GROUPS: ColumnGroup[] = [
  {
    label: "Refunds",
    options: [
      { key: "payment-number", label: "Transaction#", kind: "text", locked: true },
      { key: "date", label: "Date", kind: "text", locked: true },
      { key: "reference-number", label: "Reference#", kind: "text" },
      { key: "customer-name", label: "Customer Name", kind: "text" },
      { key: "payment-mode", label: "Mode", kind: "text" },
      { key: "notes", label: "Notes", kind: "text" },
      { key: "amount", label: "Amount (FCY)", kind: "currency" },
      { key: "unused-amount", label: "Amount (BCY)", kind: "currency" },
    ],
  },
];

const DEFAULT_SELECTED_COLUMNS: PaymentColumnKey[] = [
  "payment-number",
  "date",
  "status",
  "reference-number",
  "customer-name",
  "payment-mode",
  "invoice-number",
  "deposit-to",
  "amount",
  "unused-amount",
];

const REFUND_DEFAULT_SELECTED_COLUMNS: PaymentColumnKey[] = [
  "payment-number",
  "date",
  "reference-number",
  "customer-name",
  "payment-mode",
  "notes",
  "amount",
  "unused-amount",
];

const normalizeText = (value: unknown) => String(value ?? "").trim().toLowerCase();
const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
const endOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
const cloneDate = (date: Date) => new Date(date.getTime());

const formatDate = (value: string | Date | undefined) => {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};

const formatMoney = (value: unknown, currency = "SOS") => {
  const amount = Number(value || 0);
  const prefix = String(currency || "SOS").toUpperCase();
  const absolute = Math.abs(amount).toFixed(2);
  return `${prefix}${amount < 0 ? "-" : ""}${absolute}`;
};

const getDateRangeLabel = (key: DateRangeKey) => DATE_RANGE_OPTIONS.find((option) => option.key === key)?.label ?? "Today";
const getGroupByLabel = (key: GroupByKey) =>
  GROUP_BY_OPTIONS.find((option) => option.key === key)?.label ?? "None";

const getDateRangeValue = (key: DateRangeKey, customRange?: DateRangeValue): DateRangeValue => {
  const now = new Date();
  const startOfWeek = (date: Date) => {
    const start = startOfDay(date);
    start.setDate(start.getDate() - start.getDay());
    return start;
  };
  const quarterBounds = (year: number, quarterIndex: number) => {
    const startMonth = quarterIndex * 3;
    return { start: new Date(year, startMonth, 1), end: endOfDay(new Date(year, startMonth + 3, 0)) };
  };

  switch (key) {
    case "today":
      return { start: startOfDay(now), end: endOfDay(now) };
    case "this-week": {
      const start = startOfWeek(now);
      const end = cloneDate(start);
      end.setDate(end.getDate() + 6);
      return { start, end: endOfDay(end) };
    }
    case "this-month":
      return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: endOfDay(new Date(now.getFullYear(), now.getMonth() + 1, 0)) };
    case "this-quarter":
      return quarterBounds(now.getFullYear(), Math.floor(now.getMonth() / 3));
    case "this-year":
      return { start: new Date(now.getFullYear(), 0, 1), end: endOfDay(new Date(now.getFullYear(), 11, 31)) };
    case "yesterday": {
      const date = startOfDay(now);
      date.setDate(date.getDate() - 1);
      return { start: date, end: endOfDay(date) };
    }
    case "previous-week": {
      const currentWeekStart = startOfWeek(now);
      const previousWeekStart = cloneDate(currentWeekStart);
      previousWeekStart.setDate(previousWeekStart.getDate() - 7);
      const previousWeekEnd = cloneDate(previousWeekStart);
      previousWeekEnd.setDate(previousWeekEnd.getDate() + 6);
      return { start: previousWeekStart, end: endOfDay(previousWeekEnd) };
    }
    case "previous-month": {
      const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
      const previousMonthStart = new Date(previousMonthEnd.getFullYear(), previousMonthEnd.getMonth(), 1);
      return { start: previousMonthStart, end: endOfDay(previousMonthEnd) };
    }
    case "previous-quarter": {
      const currentQuarterIndex = Math.floor(now.getMonth() / 3);
      const previousQuarterIndex = (currentQuarterIndex + 3) % 4;
      const previousQuarterYear = currentQuarterIndex === 0 ? now.getFullYear() - 1 : now.getFullYear();
      return quarterBounds(previousQuarterYear, previousQuarterIndex);
    }
    case "previous-year":
      return { start: new Date(now.getFullYear() - 1, 0, 1), end: endOfDay(new Date(now.getFullYear() - 1, 11, 31)) };
    case "custom":
      return customRange || { start: startOfDay(now), end: endOfDay(now) };
    default:
      return { start: startOfDay(now), end: endOfDay(now) };
  }
};

const compareText = (left: string, comparator: MoreFilterComparatorKey | "", right: string) => {
  const lhs = normalizeText(left);
  const rhs = normalizeText(right);
  const tokens = rhs
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  switch (comparator) {
    case "is-empty":
      return lhs.length === 0;
    case "is-not-empty":
      return lhs.length > 0;
    case "is-in":
      return tokens.length > 0 ? tokens.includes(lhs) : lhs === rhs;
    case "is-not-in":
      return tokens.length > 0 ? !tokens.includes(lhs) : lhs !== rhs;
    case "starts-with":
      return lhs.startsWith(rhs);
    case "ends-with":
      return lhs.endsWith(rhs);
    case "contains":
      return lhs.includes(rhs);
    case "does-not-contain":
      return !lhs.includes(rhs);
    default:
      return true;
  }
};

const getPaymentFieldValue = (payment: Payment, field: MoreFilterFieldKey | "") => {
  if (!field) return "";
  switch (field) {
    case "payment-number":
      return payment.paymentNumber || payment.id || "";
    case "reference-number":
      return payment.referenceNumber || payment.reference || payment.paymentReference || "";
    case "customer-name":
      return payment.customerName || "";
    case "payment-mode":
      return payment.paymentMode || payment.paymentMethod || "";
    case "status":
      return payment.status || "";
    case "invoice-number":
      return payment.invoiceNumber || "";
    case "deposit-to":
      return payment.depositTo || "";
    case "notes":
      return payment.notes || "";
    default:
      return "";
  }
};

const getGroupValue = (payment: Payment, groupBy: GroupByKey) => {
  switch (groupBy) {
    case "customer-name":
      return payment.customerName || "Unassigned";
    case "payment-mode":
      return payment.paymentMode || "Other";
    case "status":
      return payment.status || "Unknown";
    case "deposit-to":
      return payment.depositTo || "Unassigned";
    default:
      return "All Payments";
  }
};

const getPaymentValueOptions = (field: MoreFilterFieldKey | "", payments: Payment[]): Option[] => {
  if (!field) return [];
  if (field === "payment-mode") {
    return [
      { key: "cash", label: "Cash" },
      { key: "check", label: "Check" },
      { key: "credit-card", label: "Credit Card" },
      { key: "debit-card", label: "Debit Card" },
      { key: "bank-transfer", label: "Bank Transfer" },
      { key: "bank-remittance", label: "Bank Remittance" },
      { key: "other", label: "Other" },
    ];
  }
  if (field === "status") {
    return [
      { key: "paid", label: "Paid" },
      { key: "draft", label: "Draft" },
      { key: "void", label: "Void" },
    ];
  }
  if (field === "customer-name") {
    return Array.from(new Set(payments.map((payment) => (payment.customerName || "").trim()).filter(Boolean))).map((label) => ({ key: label, label }));
  }
  if (field === "deposit-to") {
    return Array.from(new Set(payments.map((payment) => (payment.depositTo || "").trim()).filter(Boolean))).map((label) => ({ key: label, label }));
  }
  return [];
};

const getColumnGroup = (key: PaymentColumnKey) => {
  const group = PAYMENT_COLUMN_GROUPS.find((section) => section.options.some((option) => option.key === key));
  return group?.label ?? "Payments";
};

const getColumnByKey = (key: PaymentColumnKey) => PAYMENT_COLUMN_GROUPS.flatMap((group) => group.options).find((option) => option.key === key);

export default function PaymentsReceivedReportView({
  categoryName,
  reportName,
  menuButtonRef,
  onMenuClick,
  onRunReport,
  onActivityClick,
  onClosePage,
  mode = "payments",
  subtitleMode = "as-of",
}: {
  categoryName: string;
  reportName: string;
  menuButtonRef: React.RefObject<HTMLButtonElement | null>;
  onMenuClick: () => void;
  onRunReport: () => void;
  onActivityClick: () => void;
  onClosePage: () => void;
  mode?: ReportMode;
  subtitleMode?: "as-of" | "from-to";
}) {
  const { settings } = useSettings();
  const { baseCurrency } = useCurrency();
  const organizationName = String(settings?.general?.companyDisplayName || settings?.general?.schoolDisplayName || "").trim();
  const baseCurrencyCode = String(baseCurrency?.code || "USD").trim().toUpperCase();
  const isRefundMode = mode === "refund-history";
  const [payments, setPayments] = useState<Array<Payment | RefundRecord>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshTick, setRefreshTick] = useState(0);
  const [exportOpen, setExportOpen] = useState(false);
  const [groupByOpen, setGroupByOpen] = useState(false);
  const [groupByKey, setGroupByKey] = useState<GroupByKey>("none");
  const [dateRangeOpen, setDateRangeOpen] = useState(false);
  const [dateRangeKey, setDateRangeKey] = useState<DateRangeKey>("this-month");
  const [dateRangeDraftKey, setDateRangeDraftKey] = useState<DateRangeKey>("this-month");
  const [customDateRange, setCustomDateRange] = useState<DateRangeValue>(() => getDateRangeValue("this-month"));
  const [customDateRangeDraft, setCustomDateRangeDraft] = useState<DateRangeValue>(() => getDateRangeValue("this-month"));
  const [moreFiltersOpen, setMoreFiltersOpen] = useState(false);
  const [moreFilterRows, setMoreFilterRows] = useState<MoreFilterRow[]>([{ id: "payment-filter-1", field: "", comparator: "", value: "" }]);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [customizeSearch, setCustomizeSearch] = useState("");
  const defaultColumns = isRefundMode ? REFUND_DEFAULT_SELECTED_COLUMNS : DEFAULT_SELECTED_COLUMNS;
  const columnGroups = isRefundMode ? REFUND_COLUMN_GROUPS : PAYMENT_COLUMN_GROUPS;
  const groupByOptions = isRefundMode ? REFUND_GROUP_BY_OPTIONS : GROUP_BY_OPTIONS;
  const moreFilterFieldOptions = isRefundMode ? REFUND_MORE_FILTER_FIELD_OPTIONS : MORE_FILTER_FIELD_OPTIONS;
  const [selectedColumns, setSelectedColumns] = useState<PaymentColumnKey[]>(defaultColumns);
  const [draftColumns, setDraftColumns] = useState<PaymentColumnKey[]>(defaultColumns);
  const [activeAvailableColumn, setActiveAvailableColumn] = useState<PaymentColumnKey | "">("");
  const [activeSelectedColumn, setActiveSelectedColumn] = useState<PaymentColumnKey | "">("");

  const dateRange = useMemo(
    () => (dateRangeKey === "custom" ? customDateRange : getDateRangeValue(dateRangeKey)),
    [customDateRange, dateRangeKey]
  );
  const getColumnByKey = (key: PaymentColumnKey) =>
    columnGroups.flatMap((group) => group.options).find((option) => option.key === key);
  const getColumnGroup = (key: PaymentColumnKey) => {
    const group = columnGroups.find((section) => section.options.some((option) => option.key === key));
    return group?.label ?? (isRefundMode ? "Refunds" : "Payments");
  };
  const visibleColumns = useMemo(
    () => selectedColumns.map((key) => getColumnByKey(key)).filter(Boolean) as ColumnOption[],
    [selectedColumns, columnGroups]
  );
  const getRecordFieldValue = (payment: Payment | RefundRecord, field: MoreFilterFieldKey | "") => {
    if (!field) return "";
    if (isRefundMode) {
      const refund = payment as RefundRecord;
      switch (field) {
        case "payment-number":
          return refund.refundNumber || refund.id || refund._id || "";
        case "reference-number":
          return refund.referenceNumber || refund.invoiceNumber || refund.paymentId || refund.creditNoteId || "";
        case "customer-name":
          return refund.customerName || "";
        case "payment-mode":
          return refund.paymentMethod || refund.paymentMode || "";
        case "status":
          return refund.status || "";
        case "invoice-number":
          return refund.invoiceNumber || "";
        case "deposit-to":
          return refund.fromAccount || "";
        case "notes":
          return refund.description || refund.notes || "";
        default:
          return "";
      }
    }
    return getPaymentFieldValue(payment as Payment, field);
  };
  const getRecordGroupValue = (payment: Payment | RefundRecord, currentGroupBy: GroupByKey) => {
    if (isRefundMode) {
      const refund = payment as RefundRecord;
      switch (currentGroupBy) {
        case "customer-name":
          return refund.customerName || "Unassigned";
        case "payment-mode":
          return refund.paymentMethod || refund.paymentMode || "Other";
        case "status":
          return refund.status || "Unknown";
        case "deposit-to":
          return refund.fromAccount || "Unassigned";
        default:
          return "All Refunds";
      }
    }

    switch (currentGroupBy) {
      case "customer-name":
        return (payment as Payment).customerName || "Unassigned";
      case "payment-mode":
        return (payment as Payment).paymentMode || (payment as Payment).paymentMethod || "Other";
      case "status":
        return (payment as Payment).status || "Unknown";
      case "deposit-to":
        return (payment as Payment).depositTo || "Unassigned";
      default:
        return "All Payments";
    }
  };
  const getValueOptions = (field: MoreFilterFieldKey | "", records: Array<Payment | RefundRecord>): Option[] => {
    if (!field) return [];
    if (isRefundMode) {
      if (field === "payment-mode") {
        return [
          { key: "cash", label: "Cash" },
          { key: "check", label: "Check" },
          { key: "credit-card", label: "Credit Card" },
          { key: "debit-card", label: "Debit Card" },
          { key: "bank-transfer", label: "Bank Transfer" },
          { key: "bank-remittance", label: "Bank Remittance" },
          { key: "mobile-money", label: "Mobile Money" },
          { key: "other", label: "Other" },
        ];
      }
      if (field === "status") {
        return [
          { key: "processed", label: "Processed" },
          { key: "pending", label: "Pending" },
          { key: "failed", label: "Failed" },
          { key: "void", label: "Void" },
        ];
      }
      if (field === "customer-name") {
        return Array.from(new Set(records.map((payment) => String((payment as RefundRecord).customerName || "").trim()).filter(Boolean))).map((label) => ({ key: label, label }));
      }
      if (field === "deposit-to") {
        return Array.from(new Set(records.map((payment) => String((payment as RefundRecord).fromAccount || "").trim()).filter(Boolean))).map((label) => ({ key: label, label }));
      }
      return [];
    }

    return getPaymentValueOptions(field, records as Payment[]);
  };
  const filteredPayments = useMemo(() => {
    const start = dateRange.start.getTime();
    const end = dateRange.end.getTime();
    return payments.filter((payment) => {
      const rawDate = isRefundMode
        ? (payment as RefundRecord).refundDate || (payment as RefundRecord).createdAt
        : (payment as Payment).paymentDate || (payment as Payment).date;
      const timestamp = new Date(rawDate || "").getTime();
      if (Number.isNaN(timestamp) || timestamp < start || timestamp > end) return false;
      return moreFilterRows.every((row) => {
        if (!row.field || !row.comparator) return true;
        return compareText(getRecordFieldValue(payment, row.field), row.comparator, row.value);
      });
    });
  }, [dateRange.end, dateRange.start, moreFilterRows, payments, isRefundMode]);

  const groupedPayments = useMemo(() => {
    if (groupByKey === "none") return [{ label: isRefundMode ? "All Refunds" : "All Payments", items: filteredPayments }];
    const map = new Map<string, Array<Payment | RefundRecord>>();
    filteredPayments.forEach((payment) => {
      const key = getRecordGroupValue(payment, groupByKey);
      const existing = map.get(key) || [];
      existing.push(payment);
      map.set(key, existing);
    });
    return Array.from(map.entries()).map(([label, items]) => ({ label, items }));
  }, [filteredPayments, groupByKey, isRefundMode]);

  const totals = useMemo(
    () =>
      filteredPayments.reduce(
        (acc, payment) => {
          if (isRefundMode) {
            const refund = payment as RefundRecord;
            const amount = Number(refund.amount ?? 0) || 0;
            const currency = String(refund.currency || baseCurrencyCode || "USD").trim().toUpperCase();
            const exchangeRate = Number(
              refund.exchangeRate ??
                refund.exchange_rate ??
                refund.fxRate ??
                refund.rate ??
                0,
            );
            const baseAmount =
              currency === baseCurrencyCode || exchangeRate <= 0
                ? amount
                : amount * exchangeRate;
            acc.amount += amount;
            acc.unused += baseAmount;
            return acc;
          }

          acc.amount += Number((payment as Payment).amountReceived ?? (payment as Payment).amount ?? 0) || 0;
          acc.unused += Number((payment as Payment).unusedAmount ?? 0) || 0;
          return acc;
        },
        { amount: 0, unused: 0 }
      ),
    [filteredPayments, isRefundMode, baseCurrencyCode]
  );

  const debugEnabled = useMemo(() => {
    if (typeof window === "undefined") return false;
    try {
      return new URLSearchParams(window.location.search).has("debug") || localStorage.getItem("reports_debug") === "1";
    } catch {
      return false;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setIsLoading(true);
      setError("");
      try {
        const result = isRefundMode
          ? await refundsAPI.getAll({ limit: 10000 })
          : await getPayments();
        if (cancelled) return;
        const rows = isRefundMode
          ? Array.isArray(result?.data)
            ? result.data
            : []
          : Array.isArray(result)
            ? result
            : [];
        setPayments(rows);
        if (debugEnabled) {
          console.debug("[PaymentsReceivedReport] loaded", {
            mode,
            count: rows.length,
          });
        }
      } catch (err) {
        if (cancelled) return;
        setError(
          err instanceof Error
            ? err.message
            : isRefundMode
              ? "Failed to load refund report"
              : "Failed to load payment report",
        );
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [debugEnabled, isRefundMode, mode, refreshTick]);

  const applyDateRange = () => {
    if (dateRangeDraftKey === "custom") {
      setCustomDateRange(customDateRangeDraft);
    }
    setDateRangeKey(dateRangeDraftKey);
    setDateRangeOpen(false);
  };

  const cancelDateRange = () => {
    setDateRangeDraftKey(dateRangeKey);
    setCustomDateRangeDraft(customDateRange);
    setDateRangeOpen(false);
  };

  const addMoreFilterRow = () => {
    const newRow: MoreFilterRow = {
      id: `payment-filter-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      field: "",
      comparator: "",
      value: "",
    };
    setMoreFilterRows((current) => [...current, newRow]);
  };

  const removeMoreFilterRow = (rowId: string) => {
    setMoreFilterRows((current) => (current.length > 1 ? current.filter((row) => row.id !== rowId) : current));
  };

  const updateMoreFilterRow = (rowId: string, patch: Partial<MoreFilterRow>) => {
    setMoreFilterRows((current) =>
      current.map((row) => {
        if (row.id !== rowId) return row;
        const next = { ...row, ...patch };
        if (Object.prototype.hasOwnProperty.call(patch, "field")) {
          next.comparator = "";
          next.value = "";
        }
        if (Object.prototype.hasOwnProperty.call(patch, "comparator") && (patch.comparator === "is-empty" || patch.comparator === "is-not-empty")) {
          next.value = "";
        }
        return next;
      })
    );
  };

  const openCustomize = () => {
    setDraftColumns(selectedColumns);
    setCustomizeSearch("");
    setActiveAvailableColumn("");
    setActiveSelectedColumn("");
    setCustomizeOpen(true);
  };

  const availableColumns = columnGroups.flatMap((group) => group.options).filter((option) => !draftColumns.includes(option.key));
  const selectedDraftColumns = draftColumns.map((key) => getColumnByKey(key)).filter(Boolean) as ColumnOption[];
  const filteredAvailableColumns = availableColumns.filter((option) => {
    const query = customizeSearch.trim().toLowerCase();
    return !query || option.label.toLowerCase().includes(query) || getColumnGroup(option.key).toLowerCase().includes(query);
  });
  const filteredSelectedColumns = selectedDraftColumns.filter((option) => {
    const query = customizeSearch.trim().toLowerCase();
    return !query || option.label.toLowerCase().includes(query) || getColumnGroup(option.key).toLowerCase().includes(query);
  });

  const moveAvailableToSelected = () => {
    if (!activeAvailableColumn || draftColumns.includes(activeAvailableColumn)) return;
    setDraftColumns((current) => [...current, activeAvailableColumn]);
    setActiveAvailableColumn("");
  };

  const moveSelectedToAvailable = () => {
    if (!activeSelectedColumn) return;
    const column = getColumnByKey(activeSelectedColumn);
    if (!column || column.locked) return;
    setDraftColumns((current) => current.filter((key) => key !== activeSelectedColumn));
    setActiveSelectedColumn("");
  };

  const applyColumns = () => {
    setSelectedColumns(draftColumns);
    setCustomizeOpen(false);
    toast.success("Report columns updated");
  };

  const formatColumnValue = (column: ColumnOption, payment: Payment) => {
    if (isRefundMode) {
      const refund = payment as RefundRecord;
      const amount = Number(refund.amount ?? 0) || 0;
      const currency = String(refund.currency || baseCurrencyCode || "USD").trim().toUpperCase() || baseCurrencyCode;
      const exchangeRate = Number(
        refund.exchangeRate ?? refund.exchange_rate ?? refund.fxRate ?? refund.rate ?? 0,
      );
      const baseAmount =
        currency === baseCurrencyCode || exchangeRate <= 0
          ? amount
          : amount * exchangeRate;

      switch (column.key) {
        case "payment-number":
          return refund.refundNumber || refund.id || refund._id || "";
        case "date":
          return formatDate(refund.refundDate || refund.createdAt || "");
        case "status":
          return refund.status || "Processed";
        case "reference-number":
          return refund.referenceNumber || refund.invoiceNumber || refund.paymentId || refund.creditNoteId || "";
        case "customer-name":
          return refund.customerName || "";
        case "payment-mode":
          return refund.paymentMethod || refund.paymentMode || "";
        case "notes":
          return refund.description || refund.notes || "";
        case "invoice-number":
          return refund.invoiceNumber || "";
        case "deposit-to":
          return refund.fromAccount || "";
        case "amount":
          return formatMoney(amount, currency);
        case "unused-amount":
          return formatMoney(baseAmount, baseCurrencyCode);
        default:
          return "";
      }
    }

    switch (column.key) {
      case "payment-number":
        return payment.paymentNumber || payment.id || "";
      case "date":
        return formatDate(payment.paymentDate || payment.date || "");
      case "status":
        return payment.status || "";
      case "reference-number":
        return payment.referenceNumber || payment.reference || payment.paymentReference || "";
      case "customer-name":
        return payment.customerName || "";
      case "payment-mode":
        return payment.paymentMode || payment.paymentMethod || "";
      case "notes":
        return payment.notes || "";
      case "invoice-number":
        return payment.invoiceNumber || "";
      case "deposit-to":
        return payment.depositTo || "";
      case "amount":
        return formatMoney(payment.amountReceived ?? payment.amount ?? 0, payment.currency || "SOS");
      case "unused-amount":
        return formatMoney(payment.unusedAmount ?? 0, payment.currency || "SOS");
      default:
        return "";
    }
  };

  const getGroupByLabelLocal = (key: GroupByKey) =>
    groupByOptions.find((option) => option.key === key)?.label ?? "None";
  const groupBySelections = groupByOptions.filter((option) => option.key !== "none");
  const rangeLabel =
    subtitleMode === "as-of"
      ? `As of ${formatDate(dateRange.end)}`
      : `From ${formatDate(dateRange.start)} To ${formatDate(dateRange.end)}`;

  return (
    <div className="relative min-h-[calc(100vh-64px)] pt-3">
      <div className="mx-auto w-full px-3 pb-6">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#e6e9f0] pb-3">
          <div className="min-w-0">
            <div className="mb-1 text-sm font-medium text-[#2563eb]">{categoryName}</div>
            <div className="flex items-baseline gap-2">
              <button
                type="button"
                ref={menuButtonRef}
                onClick={onMenuClick}
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded border border-[#d4d9e4] bg-white text-[#334155] hover:bg-[#f8fafc]"
                aria-label="Open reports menu"
              >
                <Menu size={15} />
              </button>
              <div className="flex min-w-0 items-baseline gap-2">
                <h1 className="truncate text-[24px] font-semibold leading-tight text-[#0f172a]">{reportName}</h1>
                <span className="whitespace-nowrap text-sm text-[#475569]">- {rangeLabel}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onActivityClick}
              className="inline-flex h-8 w-8 items-center justify-center rounded border border-[#d4d9e4] text-[#334155] hover:bg-[#f8fafc]"
              aria-label="Open report activity"
            >
              <RefreshCw size={15} />
            </button>
            <button
              type="button"
              onClick={() => setExportOpen((prev) => !prev)}
              className="inline-flex h-8 items-center gap-1 rounded border border-[#d4d9e4] bg-white px-3 text-sm font-medium text-[#1e293b] hover:bg-[#f8fafc]"
            >
              Export <ChevronDown size={14} />
            </button>
            <button
              type="button"
              onClick={onClosePage}
              className="inline-flex h-8 w-8 items-center justify-center rounded border border-[#d4d9e4] text-[#ef4444] hover:bg-[#fef2f2]"
              aria-label="Close report"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 overflow-x-auto border-t border-b border-[#e5e7eb] bg-white py-3">
          <div className="flex items-center gap-2 text-sm text-[#334155]">
            <Filter size={14} />
            <span>Filters :</span>
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setDateRangeDraftKey(dateRangeKey);
                setCustomDateRangeDraft(customDateRange);
                setDateRangeOpen((prev) => !prev);
              }}
              className="inline-flex h-8 min-w-[170px] items-center justify-between gap-3 rounded border border-[#cfd6e4] bg-[#f8fafc] px-3 text-sm text-[#334155] hover:bg-white"
            >
              <span className="inline-flex items-center gap-2">
                <CalendarDays size={14} className="text-[#64748b]" />
                <span>Date Range :</span>
                <strong>{getDateRangeLabel(dateRangeKey)}</strong>
              </span>
              <ChevronDown size={14} />
            </button>
            {dateRangeOpen ? (
              <div className="absolute left-0 top-[calc(100%+6px)] z-30 w-[280px] rounded-lg border border-[#d7dce7] bg-white p-2 shadow-[0_10px_24px_rgba(15,23,42,0.12)]">
                <div className="max-h-[220px] overflow-y-auto">
                  {DATE_RANGE_OPTIONS.map((option) => (
                    <button
                      key={option.key}
                      type="button"
                      onClick={() => {
                        setDateRangeDraftKey(option.key);
                        if (option.key !== "custom") {
                          setDateRangeKey(option.key);
                          setDateRangeOpen(false);
                        }
                        if (option.key === "custom") {
                          setCustomDateRangeDraft(customDateRange);
                        }
                      }}
                      className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm hover:bg-[#f8fafc] ${
                        dateRangeDraftKey === option.key ? "font-medium text-[#0f172a]" : "text-[#334155]"
                      }`}
                    >
                      <span>{option.label}</span>
                      {dateRangeDraftKey === option.key ? <Check size={14} className="text-[#64748b]" /> : null}
                    </button>
                  ))}
                </div>
                {dateRangeDraftKey === "custom" ? (
                  <div className="mt-2 border-t border-[#eef2f7] pt-2">
                    <div className="grid grid-cols-2 gap-2">
                      <label className="block text-xs text-[#64748b]">
                        From
                        <input
                          type="date"
                          value={customDateRangeDraft.start.toISOString().slice(0, 10)}
                          onChange={(event) => {
                            const value = event.target.value ? new Date(event.target.value) : customDateRangeDraft.start;
                            setCustomDateRangeDraft((prev) => ({ start: value, end: prev.end < value ? value : prev.end }));
                          }}
                          className="mt-1 h-9 w-full rounded-md border border-[#cbd5e1] px-2 text-sm text-[#0f172a]"
                        />
                      </label>
                      <label className="block text-xs text-[#64748b]">
                        To
                        <input
                          type="date"
                          value={customDateRangeDraft.end.toISOString().slice(0, 10)}
                          onChange={(event) => {
                            const value = event.target.value ? new Date(event.target.value) : customDateRangeDraft.end;
                            setCustomDateRangeDraft((prev) => ({ start: prev.start > value ? value : prev.start, end: value }));
                          }}
                          className="mt-1 h-9 w-full rounded-md border border-[#cbd5e1] px-2 text-sm text-[#0f172a]"
                        />
                      </label>
                    </div>
                    <div className="mt-2 flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={cancelDateRange}
                        className="rounded-md border border-[#d7dce7] bg-white px-3 py-1.5 text-sm text-[#334155]"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={applyDateRange}
                        className="rounded-md bg-[#1f6f7a] px-3 py-1.5 text-sm font-medium text-white"
                      >
                        Apply
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>

          <button
            type="button"
            onClick={() => setMoreFiltersOpen((prev) => !prev)}
            className="inline-flex h-8 items-center gap-1 rounded border border-[#cfd6e4] bg-white px-3 text-sm text-[#334155] hover:bg-[#f8fafc]"
          >
            <Plus size={14} className="text-[#2563eb]" />
            More Filters
          </button>

          <button
            type="button"
            onClick={() => {
              setIsLoading(true);
              setRefreshTick((tick) => tick + 1);
              onRunReport();
            }}
            className="inline-flex h-8 items-center gap-1 rounded bg-[#1b6f7b] px-4 text-sm font-semibold text-white hover:bg-[#155963]"
          >
            <CalendarDays size={14} />
            Run Report
          </button>
        </div>

        {moreFiltersOpen ? (
          <div className="mt-2 rounded-lg border border-[#d7dce7] bg-white p-4 shadow-sm">
            <div className="space-y-3">
              {moreFilterRows.map((row, index) => {
                const valueOptions = getValueOptions(row.field, payments);
                const valueMode = row.comparator === "is-empty" || row.comparator === "is-not-empty" ? "none" : valueOptions.length > 0 ? "dropdown" : "text";
                return (
                  <div key={row.id} className="flex flex-wrap items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-md border border-[#d7dce7] bg-white text-sm text-[#0f172a]">
                      {index + 1}
                    </div>
                    <select
                      value={row.field}
                      onChange={(event) => updateMoreFilterRow(row.id, { field: event.target.value as MoreFilterFieldKey | "" })}
                      className="h-10 w-[230px] rounded-md border border-[#cbd5e1] bg-white px-3 text-sm text-[#0f172a]"
                    >
                      <option value="">Select a field</option>
                      {moreFilterFieldOptions.map((option) => (
                        <option key={option.key} value={option.key}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <select
                      value={row.comparator}
                      onChange={(event) => updateMoreFilterRow(row.id, { comparator: event.target.value as MoreFilterComparatorKey | "" })}
                      className="h-10 w-[180px] rounded-md border border-[#cbd5e1] bg-white px-3 text-sm text-[#0f172a]"
                    >
                      <option value="">Select a comparator</option>
                      {MORE_FILTER_COMPARATORS.map((option) => (
                        <option key={option.key} value={option.key}>
                          {option.label}
                        </option>
                      ))}
                    </select>

                    {valueMode === "dropdown" ? (
                      <select
                        value={row.value}
                        onChange={(event) => updateMoreFilterRow(row.id, { value: event.target.value })}
                        className="h-10 w-[260px] rounded-md border border-[#cbd5e1] bg-white px-3 text-sm text-[#0f172a]"
                      >
                        <option value="">Select a value</option>
                        {valueOptions.map((option) => (
                          <option key={option.key} value={option.label}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    ) : valueMode === "text" ? (
                      <input
                        value={row.value}
                        onChange={(event) => updateMoreFilterRow(row.id, { value: event.target.value })}
                        placeholder="Enter a value"
                        className="h-10 w-[360px] rounded-md border border-[#cbd5e1] px-3 text-sm text-[#0f172a]"
                      />
                    ) : (
                      <div className="flex h-10 w-[260px] items-center rounded-md border border-dashed border-[#cbd5e1] px-3 text-sm text-[#64748b]">
                        No value needed
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={addMoreFilterRow}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-[#cbd5e1] bg-white text-[#64748b] hover:bg-[#f8fafc]"
                      aria-label="Add more filter row"
                    >
                      <Plus size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeMoreFilterRow(row.id)}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-[#cbd5e1] bg-white text-[#ef4444] hover:bg-[#fef2f2]"
                      aria-label="Remove filter row"
                    >
                      <X size={16} />
                    </button>
                  </div>
                );
              })}

              <button
                type="button"
                onClick={addMoreFilterRow}
                className="inline-flex items-center gap-2 text-sm font-medium text-[#1f6f7a]"
              >
                <Plus size={14} />
                Add More
              </button>
            </div>
          </div>
        ) : null}

        <div className="mt-3 flex flex-wrap items-center justify-end gap-2 text-sm text-[#475569]">
          <div className="relative">
            <button
              type="button"
              onClick={() => setGroupByOpen((prev) => !prev)}
              className="inline-flex h-8 items-center gap-1 rounded border border-[#cfd6e4] bg-white px-3 text-sm text-[#334155] hover:bg-[#f8fafc]"
            >
              <span className="inline-flex items-center gap-2">
                <Columns3 size={14} className="text-[#64748b]" />
                Group By :
                <strong className="text-[#0f172a]">{getGroupByLabelLocal(groupByKey)}</strong>
              </span>
              <ChevronDown size={14} />
            </button>
            {groupByOpen ? (
              <div className="absolute right-0 top-[calc(100%+6px)] z-30 w-[220px] rounded-lg border border-[#d7dce7] bg-white p-2 shadow-[0_10px_24px_rgba(15,23,42,0.12)]">
                {groupBySelections.map((option) => (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => {
                      setGroupByKey(option.key);
                      setGroupByOpen(false);
                    }}
                    className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm hover:bg-[#f8fafc]"
                  >
                    <span>{option.label}</span>
                    {groupByKey === option.key ? <Check size={14} className="text-[#64748b]" /> : null}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <button
            type="button"
            onClick={openCustomize}
            className="inline-flex h-8 items-center gap-1 rounded border border-[#cfd6e4] bg-white px-3 text-sm text-[#334155] hover:bg-[#f8fafc]"
          >
            <SlidersHorizontal size={14} className="text-[#64748b]" />
            Customize Report Columns
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#d9eff1] px-1 text-[11px] font-semibold text-[#1b6f7b]">
              {selectedColumns.length}
            </span>
          </button>
        </div>

        <div className="mt-3 rounded-xl border border-[#d7dce7] bg-white">
          <div className="border-b border-[#eef2f7] px-4 py-10 text-center">
            <div className="mb-1 text-sm text-[#64748b]">{organizationName || " "}</div>
            <div className="text-[20px] font-semibold text-[#0f172a]">{reportName}</div>
            <div className="mt-1 text-sm text-[#2563eb]">
              From {formatDate(dateRange.start)} To {formatDate(dateRange.end)}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-[#eef2f7]">
                  {visibleColumns.map((column) => (
                    <th key={column.key} className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#475569]">
                      {column.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                    <tr>
                      <td className="px-4 py-10 text-center text-sm text-[#64748b]" colSpan={visibleColumns.length}>
                        Loading report data...
                      </td>
                    </tr>
                  ) : error ? (
                    <tr>
                      <td className="px-4 py-10 text-center text-sm text-[#b91c1c]" colSpan={visibleColumns.length}>
                        {error}
                      </td>
                    </tr>
                  ) : groupedPayments.length === 0 ? (
                    <tr>
                      <td className="px-4 py-10 text-center text-sm text-[#64748b]" colSpan={visibleColumns.length}>
                        {isRefundMode
                          ? "No refunds found for the selected filters."
                          : "No payments found for the selected filters."}
                      </td>
                    </tr>
                ) : (
                  <>
                    {groupedPayments.map((group) => {
                      const groupTotals = group.items.reduce(
                        (acc, payment) => {
                          acc.amount += Number(payment.amountReceived ?? payment.amount ?? 0) || 0;
                          acc.unused += Number(payment.unusedAmount ?? 0) || 0;
                          return acc;
                        },
                        { amount: 0, unused: 0 }
                      );
                      return (
                        <React.Fragment key={group.label}>
                          {groupByKey !== "none" ? (
                            <tr className="border-b border-[#eef2f7] bg-[#f8fafc]">
                              <td className="px-4 py-2 text-sm font-semibold text-[#0f172a]" colSpan={visibleColumns.length}>
                                {group.label}
                              </td>
                            </tr>
                          ) : null}
                          {group.items.map((payment) => (
                            <tr key={payment.id} className="border-b border-[#eef2f7]">
                              {visibleColumns.map((column) => (
                                <td
                                  key={column.key}
                                  className={`px-4 py-3 text-sm ${column.kind === "text" ? "text-left" : "text-center"} ${
                                    column.key === "payment-number" || column.key === "customer-name"
                                      ? "font-medium text-[#2563eb]"
                                      : "text-[#0f172a]"
                                  }`}
                                >
                                  {column.key === "payment-number" ? (
                                    <Link to={`/payments/payments-received/${payment.id}`} className="text-[#2563eb] hover:underline">
                                      {formatColumnValue(column, payment)}
                                    </Link>
                                  ) : (
                                    formatColumnValue(column, payment)
                                  )}
                                </td>
                              ))}
                            </tr>
                          ))}
                          {groupByKey !== "none" ? (
                            <tr className="border-b border-[#e5e7eb] bg-[#fcfcfd]">
                              {visibleColumns.map((column, index) => {
                                if (index === 0) {
                                  return (
                                    <td key={`${group.label}-total`} className="px-4 py-3 text-sm font-semibold text-[#0f172a]">
                                      Total
                                    </td>
                                  );
                                }
                                if (column.key === "amount") {
                                  return (
                                    <td key={`${group.label}-amount`} className="px-4 py-3 text-center text-sm font-semibold text-[#0f172a]">
                                      {formatMoney(groupTotals.amount, filteredPayments[0]?.currency || "SOS")}
                                    </td>
                                  );
                                }
                                if (column.key === "unused-amount") {
                                  return (
                                    <td key={`${group.label}-unused`} className="px-4 py-3 text-center text-sm font-semibold text-[#0f172a]">
                                      {formatMoney(groupTotals.unused, filteredPayments[0]?.currency || "SOS")}
                                    </td>
                                  );
                                }
                                return <td key={`${group.label}-${column.key}`} className="px-4 py-3 text-sm" />;
                              })}
                            </tr>
                          ) : null}
                        </React.Fragment>
                      );
                    })}
                    {groupByKey === "none" ? (
                      <tr className="border-b border-[#e5e7eb]">
                        {visibleColumns.map((column, index) => {
                          if (index === 0) {
                            return (
                              <td key="payments-total" className="px-4 py-3 text-sm font-semibold text-[#0f172a]">
                                Total
                              </td>
                            );
                          }
                          if (column.key === "amount") {
                            return (
                              <td key="payments-amount" className="px-4 py-3 text-center text-sm font-semibold text-[#0f172a]">
                                {formatMoney(totals.amount, filteredPayments[0]?.currency || "SOS")}
                              </td>
                            );
                          }
                          if (column.key === "unused-amount") {
                            return (
                              <td key="payments-unused" className="px-4 py-3 text-center text-sm font-semibold text-[#0f172a]">
                                {formatMoney(totals.unused, filteredPayments[0]?.currency || "SOS")}
                              </td>
                            );
                          }
                          return <td key={`payments-${column.key}`} className="px-4 py-3 text-sm" />;
                        })}
                      </tr>
                    ) : null}
                  </>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {exportOpen ? (
        <div className="absolute right-4 top-16 z-40 w-[240px] rounded-lg border border-[#d7dce7] bg-white p-2 shadow-[0_10px_24px_rgba(15,23,42,0.12)]">
          {["PDF", "XLSX (Microsoft Excel)", "CSV (Comma Separated Value)", "Print"].map((label) => (
            <button
              key={label}
              type="button"
              onClick={() => {
                setExportOpen(false);
                toast.success(`Export ${label} started`);
              }}
              className="flex w-full items-center rounded-md px-3 py-2 text-left text-sm text-[#0f172a] hover:bg-[#f8fafc]"
            >
              {label}
            </button>
          ))}
        </div>
      ) : null}

      {customizeOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4 py-8">
          <div className="w-full max-w-[980px] rounded-xl bg-white shadow-[0_24px_64px_rgba(15,23,42,0.24)]">
            <div className="flex items-center justify-between border-b border-[#eef2f7] px-5 py-3">
              <h3 className="text-base font-medium text-[#0f172a]">Customize Report Columns</h3>
              <button
                type="button"
                onClick={() => setCustomizeOpen(false)}
                className="inline-flex h-7 w-7 items-center justify-center rounded-md text-[#ef4444] hover:bg-[#fef2f2]"
                aria-label="Close customize columns"
              >
                <X size={16} />
              </button>
            </div>
            <div className="grid grid-cols-[1fr_64px_1fr] gap-6 px-6 py-6">
              <div>
                <div className="mb-2 text-xs font-medium uppercase tracking-[0.06em] text-[#64748b]">Available Columns</div>
                <div className="rounded-lg border border-[#d7dce7]">
                  <div className="border-b border-[#eef2f7] p-2">
                    <div className="flex h-10 items-center rounded-md border border-[#cbd5e1] px-2">
                      <Search size={14} className="text-[#94a3b8]" />
                      <input
                        value={customizeSearch}
                        onChange={(event) => setCustomizeSearch(event.target.value)}
                        placeholder="Search"
                        className="ml-2 w-full bg-transparent text-sm outline-none placeholder:text-[#94a3b8]"
                      />
                    </div>
                  </div>
                  <div className="max-h-[420px] overflow-y-auto p-2">
                    {columnGroups.map((group) => {
                      const items = filteredAvailableColumns.filter((option) => getColumnGroup(option.key) === group.label);
                      if (items.length === 0) return null;
                      return (
                        <div key={group.label} className="mb-3">
                          <div className="px-3 py-1 text-sm font-medium text-[#94a3b8]">{group.label}</div>
                          {items.map((option) => {
                            const active = activeAvailableColumn === option.key;
                            return (
                              <button
                                key={option.key}
                                type="button"
                                onClick={() => {
                                  setActiveAvailableColumn(option.key);
                                  setActiveSelectedColumn("");
                                }}
                                className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm ${
                                  active ? "bg-white text-[#0f172a]" : "text-[#0f172a] hover:bg-[#f8fafc]"
                                }`}
                              >
                                <span>{option.label}</span>
                                {active ? <Check size={14} className="text-[#64748b]" /> : null}
                              </button>
                            );
                          })}
                        </div>
                      );
                    })}
                    {filteredAvailableColumns.length === 0 ? <div className="px-3 py-4 text-sm text-[#64748b]">No columns found.</div> : null}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={moveAvailableToSelected}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#94a3b8] text-[#475569] hover:bg-[#f8fafc]"
                  aria-label="Move to selected"
                >
                  &gt;
                </button>
                <button
                  type="button"
                  onClick={moveSelectedToAvailable}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#94a3b8] text-[#475569] hover:bg-[#f8fafc]"
                  aria-label="Remove from selected"
                >
                  &lt;
                </button>
              </div>

              <div>
                <div className="mb-2 text-xs font-medium uppercase tracking-[0.06em] text-[#64748b]">Selected Columns</div>
                <div className="rounded-lg border border-[#d7dce7]">
                  <div className="max-h-[472px] overflow-y-auto p-3">
                    {filteredSelectedColumns.map((option) => {
                      const active = activeSelectedColumn === option.key;
                      return (
                        <button
                          key={option.key}
                          type="button"
                          onClick={() => {
                            setActiveSelectedColumn(option.key);
                            setActiveAvailableColumn("");
                          }}
                          className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm ${
                            active ? "bg-white text-[#0f172a]" : "text-[#0f172a] hover:bg-[#f8fafc]"
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            {option.locked ? <span className="text-[#94a3b8]">Locked</span> : null}
                            {option.label} <span className="text-[#94a3b8]">({getColumnGroup(option.key)})</span>
                          </span>
                          {active ? <Check size={14} className="text-[#64748b]" /> : null}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-start gap-2 border-t border-[#eef2f7] px-6 py-4">
              <button type="button" onClick={applyColumns} className="rounded-md bg-[#3b82f6] px-4 py-2 text-sm font-medium text-white">
                Apply
              </button>
              <button type="button" onClick={() => setCustomizeOpen(false)} className="rounded-md border border-[#d7dce7] bg-white px-4 py-2 text-sm text-[#0f172a]">
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
