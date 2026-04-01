import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import {
  CalendarDays,
  Clock3,
  Check,
  ChevronDown,
  ChevronRight,
  Filter,
  Folder,
  History,
  Menu,
  Plus,
  Search,
  Share2,
  Table2,
  Trash2,
  X,
} from "lucide-react";
import ScheduleReportModal from "./ScheduleReportModal";
import ReportCustomizeColumnsModal from "./ReportCustomizeColumnsModal";
import ReportCompareWithPopover from "./ReportCompareWithPopover";
import { getReportColumnGroups } from "./reportColumnSetup";
import { getCategoryById, getReportById, REPORTS, REPORT_CATEGORIES } from "./reportsCatalog";
import { API_BASE_URL, getToken } from "../../services/auth";

type CellValue = string | number;

type PreviewTableConfig = {
  title: string;
  subtitle: string;
  columns: string[];
  rows: CellValue[][];
  totals?: CellValue[];
};

type FilterDropdown = "date-range" | "entities" | null;

type DateRangePreset = "Today" | "This Week" | "This Month" | "This Quarter" | "This Year" | "Yesterday" | "Previous Week" | "Previous Month" | "Previous Quarter" | "Previous Year" | "Custom";

type CompareMode = "None" | "Previous Year(s)" | "Previous Period(s)";

type RangeDate = {
  start: string;
  end: string;
};

type AgingByOption = "invoice-due-date" | "invoice-date";

type MoreFilterRow = {
  id: number;
  field: string;
  comparator: string;
  value: string;
};

type MoreFilterFieldGroup = {
  label: string;
  items: string[];
};

type MoreFilterComparatorGroup = {
  label: string;
  items: string[];
};

type MoreFilterValueKind = "text" | "number" | "date" | "time" | "textarea";
type DataSourceRow = Record<string, any>;

type SavedCustomReport = {
  id: string;
  categoryId: string;
  sourceReportId: string;
  sourceReportName: string;
  name: string;
  selectedColumns?: string[];
};

type ReportMenuItem = {
  id: string;
  categoryId: string;
  name: string;
  sourceReportId?: string;
  sourceReportName?: string;
  isCustom?: boolean;
};

const CUSTOM_REPORTS_KEY = "reports_center_custom_reports_v1";

const loadJson = <T,>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};

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

const ENTITY_OPTIONS_BY_CATEGORY: Record<string, string[]> = {
  sales: ["Invoice", "Credit Note", "Sales Receipt"],
  receivables: ["Invoice", "Credit Note", "Retainer Invoice", "Quote", "Bad Debts"],
  subscriptions: ["Subscription", "Customer", "Plan", "Addon"],
  revenue: ["Invoice", "Credit Note", "Sales Receipt"],
  retention: ["Customer", "Subscription"],
  "mrr-arr": ["Subscription", "MRR", "ARR"],
  churn: ["Customer", "Subscription", "Cancellation"],
  "churn-insights": ["Customer", "Churn Event", "Revenue"],
  "payments-received": ["Invoice", "Credit Note", "Payment", "Refund", "Failed Payment"],
  "purchases-expenses": ["Purchase", "Expense", "Bill", "Vendor", "Project"],
  taxes: ["Invoice", "Credit Note", "Payment", "Expense", "Purchase", "Tax"],
  "projects-timesheets": ["Project", "Timesheet", "Task", "Customer", "User"],
  activity: ["Mail", "User Action", "Portal Activity", "Review"],
};

const getEntityOptionsForCategory = (categoryId: string) => ENTITY_OPTIONS_BY_CATEGORY[categoryId] || ["All"];

const AGING_BY_OPTIONS: Array<{ key: AgingByOption; label: string }> = [
  { key: "invoice-due-date", label: "Invoice Due Date" },
  { key: "invoice-date", label: "Invoice Date" },
];

const getAgingByLabel = (value: AgingByOption) => AGING_BY_OPTIONS.find((option) => option.key === value)?.label || AGING_BY_OPTIONS[0].label;

const getAgingReferenceDate = (row: any, agingBy: AgingByOption) => {
  const rawDate =
    agingBy === "invoice-date"
      ? row.invoiceDate || row.date || row.createdAt
      : row.dueDate || row.invoiceDate || row.date || row.createdAt;

  if (!rawDate) {
    return null;
  }

  const parsed = new Date(rawDate);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const getAgingBucketLabel = (days: number) => {
  if (days <= 0) return "Current";
  if (days <= 15) return "1-15 Days";
  if (days <= 30) return "16-30 Days";
  if (days <= 45) return "31-45 Days";
  return "> 45 Days";
};

const MORE_FILTER_FIELDS_BY_CATEGORY: Record<string, string[]> = {
  sales: ["Invoice", "Credit Note", "Sales Receipt", "Customer", "Item", "Plan", "Addon", "Coupon", "Sales Person", "Date", "Amount"],
  receivables: ["Invoice", "Credit Note", "Retainer Invoice", "Quote", "Customer", "Due Date", "Status", "Amount"],
  subscriptions: ["Subscription", "Customer", "Plan", "Addon", "Status", "Date"],
  revenue: ["Invoice", "Credit Note", "Sales Receipt", "Customer", "Date", "Amount"],
  retention: ["Customer", "Subscription", "Date", "Status"],
  "mrr-arr": ["Subscription", "MRR", "ARR", "Date"],
  churn: ["Customer", "Subscription", "Cancellation", "Date"],
  "churn-insights": ["Customer", "Churn Event", "Revenue", "Date"],
  "payments-received": ["Payment", "Invoice", "Credit Note", "Refund", "Customer", "Date", "Amount"],
  "purchases-expenses": ["Purchase", "Expense", "Bill", "Vendor", "Project", "Date", "Amount"],
  taxes: ["Invoice", "Credit Note", "Payment", "Expense", "Purchase", "Tax", "Date", "Amount"],
  "projects-timesheets": ["Project", "Timesheet", "Task", "Customer", "User", "Date", "Hours"],
  activity: ["Mail", "User Action", "Portal Activity", "Review", "Date"],
};

const MORE_FILTER_COMPARATORS = [
  "Equals",
  "Not Equals",
  "Contains",
  "Does Not Contain",
  "Starts With",
  "Ends With",
  "Greater Than",
  "Less Than",
];

const getMoreFilterFieldsForCategory = (categoryId: string) => MORE_FILTER_FIELDS_BY_CATEGORY[categoryId] || ["Name", "Date", "Status", "Amount"];

const MORE_FILTER_FIELDS_BY_REPORT: Record<string, string[]> = {
  "sales-by-customer": ["Customer", "Invoice", "Credit Note", "Sales Receipt", "Date", "Amount"],
  "sales-by-item": ["Item", "Quantity Sold", "Invoice", "Credit Note", "Date", "Amount"],
  "sales-by-plan": ["Plan", "Subscription", "Invoice", "Credit Note", "Date", "Amount"],
  "sales-by-addon": ["Addon", "Customer", "Invoice", "Credit Note", "Date", "Amount"],
  "sales-by-coupon": ["Coupon", "Invoice", "Quantity Sold", "Discount Amount", "Date"],
  "sales-by-sales-person": ["Sales Person", "Invoice", "Credit Note", "Date", "Amount"],
  "sales-summary": ["Invoice", "Credit Note", "Sales Receipt", "Date", "Amount"],
  "ar-aging-summary": ["Customer Name", "Current", "1-15 Days", "16-30 Days", "31-45 Days", "> 45 Days", "Total"],
  "ar-aging-details": ["Invoice", "Customer", "Due Date", "Aging Bucket", "Amount", "Status"],
  "invoice-details": ["Invoice", "Customer", "Invoice Date", "Due Date", "Amount", "Balance", "Status"],
  "retainer-invoice-details": ["Retainer Invoice", "Customer", "Advance Received", "Applied", "Balance", "Status"],
  "quote-details": ["Quote", "Customer", "Quote Date", "Expiry", "Amount", "Status"],
  "bad-debts": ["Invoice", "Customer", "Written Off Date", "Amount", "Reason"],
  "customer-balance-summary": ["Customer Name", "Opening", "Invoiced", "Receipts", "Closing Balance"],
  "receivable-summary": ["Document", "Customer", "Type", "Amount", "Status"],
  "receivable-details": ["Item", "Customer", "Qty", "Amount", "Balance"],
  "progress-invoice-summary": ["Project", "Milestone", "Invoiced", "Pending", "Status"],
};

const getMoreFilterFieldsForReport = (reportId: string, categoryId: string) =>
  MORE_FILTER_FIELDS_BY_REPORT[reportId] || getMoreFilterFieldsForCategory(categoryId);

const MORE_FILTER_FIELD_GROUPS_BY_REPORT: Record<string, MoreFilterFieldGroup[]> = {
  "sales-by-item": [
    { label: "Reports", items: ["Item Name", "Item", "SKU", "Usage unit"] },
    { label: "Locations", items: ["Customer Name", "Warehouse Location Name", "Location"] },
    { label: "Reporting Tag", items: ["dffg", "dedfe"] },
  ],
  "sales-by-customer": [
    { label: "Reports", items: ["Customer Name", "Invoice", "Credit Note", "Sales Receipt"] },
    { label: "Locations", items: ["Location"] },
    { label: "Reporting Tag", items: ["dffg", "dedfe"] },
  ],
  "sales-by-plan": [
    { label: "Reports", items: ["Plan", "Subscription", "Invoice", "Credit Note"] },
    { label: "Locations", items: ["Location"] },
    { label: "Reporting Tag", items: ["dffg", "dedfe"] },
  ],
  "sales-by-addon": [
    { label: "Reports", items: ["Addon", "Customer", "Invoice", "Credit Note"] },
    { label: "Locations", items: ["Location"] },
    { label: "Reporting Tag", items: ["dffg", "dedfe"] },
  ],
  "sales-by-coupon": [
    { label: "Reports", items: ["Coupon", "Invoice", "Quantity Sold", "Discount Amount"] },
    { label: "Locations", items: ["Location"] },
    { label: "Reporting Tag", items: ["dffg", "dedfe"] },
  ],
  "sales-by-sales-person": [
    { label: "Reports", items: ["Sales Person", "Invoice", "Credit Note"] },
    { label: "Locations", items: ["Location"] },
    { label: "Reporting Tag", items: ["dffg", "dedfe"] },
  ],
  "sales-summary": [
    { label: "Reports", items: ["Invoice", "Credit Note", "Sales Receipt", "Date", "Amount"] },
    { label: "Locations", items: ["Location"] },
    { label: "Reporting Tag", items: ["dffg", "dedfe"] },
  ],
};

const getMoreFilterFieldGroupsForReport = (reportId: string, categoryId: string): MoreFilterFieldGroup[] => {
  if (MORE_FILTER_FIELD_GROUPS_BY_REPORT[reportId]) {
    return MORE_FILTER_FIELD_GROUPS_BY_REPORT[reportId];
  }

  return [
    {
      label: "Reports",
      items: getMoreFilterFieldsForReport(reportId, categoryId),
    },
  ];
};

const getMoreFilterComparatorsForField = (field: string): string[] => {
  const lower = field.toLowerCase();

  if (lower.includes("location") || lower.includes("customer") || lower.includes("invoice") || lower.includes("coupon") || lower.includes("person") || lower.includes("reporting tag")) {
    return ["is in", "is not in"];
  }

  if (lower.includes("date") || lower.includes("due") || lower.includes("expiry")) {
    return ["is on", "is not on", "is after", "is before", "is between"];
  }

  if (
    lower.includes("amount") ||
    lower.includes("qty") ||
    lower.includes("quantity") ||
    lower.includes("count") ||
    lower.includes("balance") ||
    lower.includes("current") ||
    lower.includes("days") ||
    lower.includes("rate") ||
    lower.includes("hours")
  ) {
    return ["equals", "not equals", "greater than", "less than", "between"];
  }

  return ["is", "is not", "contains", "does not contain", "starts with", "ends with", "is in", "is not in"];
};

const getMoreFilterValueKindForField = (field: string): MoreFilterValueKind => {
  const lower = field.toLowerCase();

  if (
    lower.includes("description") ||
    lower.includes("details") ||
    lower.includes("reason") ||
    lower.includes("remarks") ||
    lower.includes("memo") ||
    lower.includes("summary")
  ) {
    return "textarea";
  }

  if (lower.includes("date") || lower.includes("due") || lower.includes("expiry")) {
    return "date";
  }

  if (lower.includes("time")) {
    return "time";
  }

  if (
    lower.includes("amount") ||
    lower.includes("qty") ||
    lower.includes("quantity") ||
    lower.includes("count") ||
    lower.includes("balance") ||
    lower.includes("current") ||
    lower.includes("days") ||
    lower.includes("rate") ||
    lower.includes("hours") ||
    lower.includes("year")
  ) {
    return "number";
  }

  return "text";
};

const formatDate = (value: Date) => value.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

const toIsoDate = (value: Date) => value.toISOString().slice(0, 10);

const parseDate = (value: string) => {
  if (!value) return null;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
};

const clampDate = (value: Date, min: Date, max: Date) => new Date(Math.min(max.getTime(), Math.max(min.getTime(), value.getTime())));

const buildMonthGrid = (year: number, monthIndex: number) => {
  const firstDay = new Date(year, monthIndex, 1);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const cells: Array<number | null> = [];

  for (let i = 0; i < startOffset; i += 1) cells.push(null);
  for (let day = 1; day <= daysInMonth; day += 1) cells.push(day);
  while (cells.length % 7 !== 0) cells.push(null);

  return cells;
};

const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DEFAULT_CUSTOM_RANGE: RangeDate = { start: "2026-02-28", end: "2026-03-27" };

const getDefaultPreview = (reportName: string, categoryName: string): PreviewTableConfig => ({
  title: reportName,
  subtitle: categoryName,
  columns: ["Name", "Value", "Status"],
  rows: [["Sample Row", "0", "Pending"]],
  totals: ["Total", "0", "-"],
});

const getPreviewTable = (reportId: string, reportName: string, categoryName: string): PreviewTableConfig => {
  switch (reportId) {
    case "sales-by-customer":
      return {
        title: "Sales by Customer",
        subtitle: "From 01 Mar 2026 To 31 Mar 2026",
        columns: ["Name", "Invoice Count", "Sales", "Sales With Tax"],
        rows: [
          ["ss", 7, "SOS-43.00", "SOS-43.00"],
          ["Northwind", 4, "SOS-28.00", "SOS-28.00"],
        ],
        totals: ["Total", 11, "SOS-71.00", "SOS-71.00"],
      };
    case "sales-by-item":
      return {
        title: "Sales by Item",
        subtitle: "From 01 Mar 2026 To 31 Mar 2026",
        columns: ["Item", "Quantity Sold", "Invoices", "Sales", "Sales With Tax"],
        rows: [
          ["Starter Plan", 9, 4, "SOS-21.00", "SOS-21.00"],
          ["Pro Addon", 6, 3, "SOS-18.00", "SOS-18.00"],
        ],
        totals: ["Total", 15, 7, "SOS-39.00", "SOS-39.00"],
      };
    case "sales-by-plan":
      return {
        title: "Sales by Plan",
        subtitle: "From 01 Mar 2026 To 31 Mar 2026",
        columns: ["Plan", "Subscriptions", "Invoices", "Sales", "Sales With Tax"],
        rows: [
          ["Starter", 12, 8, "SOS-32.00", "SOS-32.00"],
          ["Growth", 7, 5, "SOS-26.00", "SOS-26.00"],
        ],
        totals: ["Total", 19, 13, "SOS-58.00", "SOS-58.00"],
      };
    case "sales-by-addon":
      return {
        title: "Sales by Addon",
        subtitle: "From 01 Mar 2026 To 31 Mar 2026",
        columns: ["Addon", "Quantity", "Customers", "Sales", "Sales With Tax"],
        rows: [
          ["Priority Support", 8, 5, "SOS-14.00", "SOS-14.00"],
          ["Extra Storage", 11, 6, "SOS-17.00", "SOS-17.00"],
        ],
        totals: ["Total", 19, 11, "SOS-31.00", "SOS-31.00"],
      };
    case "sales-by-coupon":
      return {
        title: "Sales by Coupons",
        subtitle: "From 01 Mar 2026 To 31 Mar 2026",
        columns: ["Coupon", "Uses", "Discount", "Sales", "Net Sales"],
        rows: [
          ["WELCOME10", 6, "SOS-6.00", "SOS-60.00", "SOS-54.00"],
          ["SPRING20", 3, "SOS-9.00", "SOS-45.00", "SOS-36.00"],
        ],
        totals: ["Total", 9, "SOS-15.00", "SOS-105.00", "SOS-90.00"],
      };
    case "sales-by-sales-person":
      return {
        title: "Sales by Sales Person",
        subtitle: "From 01 Mar 2026 To 31 Mar 2026",
        columns: ["Sales Person", "Invoices", "Sales", "Sales With Tax"],
        rows: [
          ["Amina", 6, "SOS-31.00", "SOS-31.00"],
          ["Brian", 5, "SOS-24.00", "SOS-24.00"],
        ],
        totals: ["Total", 11, "SOS-55.00", "SOS-55.00"],
      };
    case "sales-summary":
      return {
        title: "Sales Summary",
        subtitle: "From 01 Mar 2026 To 31 Mar 2026",
        columns: ["Date", "Invoices", "Credit Notes", "Receipts", "Sales", "Sales With Tax"],
        rows: [
          ["31 Mar 2026", 7, 1, 4, "SOS-43.00", "SOS-43.00"],
          ["30 Mar 2026", 5, 0, 3, "SOS-28.00", "SOS-28.00"],
        ],
        totals: ["Total", 12, 1, 7, "SOS-71.00", "SOS-71.00"],
      };
    case "ar-aging-summary":
      return {
        title: "AR Aging Summary By Invoice Due Date",
        subtitle: "As of 31 Mar 2026",
        columns: ["Customer Name", "Current", "1-15 Days", "16-30 Days", "31-45 Days", "> 45 Days", "Total", "Total (FCY)"],
        rows: [
          ["ss", "SOS0.00", "SOS17.00", "SOS0.00", "SOS0.00", "SOS0.00", "SOS17.00", "SOS17.00"],
        ],
        totals: ["Total", "SOS0.00", "SOS17.00", "SOS0.00", "SOS0.00", "SOS0.00", "SOS17.00", "SOS17.00"],
      };
    case "ar-aging-details":
      return {
        title: "AR Aging Details",
        subtitle: "As of 31 Mar 2026",
        columns: ["Invoice", "Customer", "Due Date", "Current", "1-15 Days", "16-30 Days", "31-45 Days", "> 45 Days", "Total"],
        rows: [
          ["INV-001", "ss", "31 Mar 2026", "SOS0.00", "SOS17.00", "SOS0.00", "SOS0.00", "SOS0.00", "SOS17.00"],
          ["INV-002", "Northwind", "15 Mar 2026", "SOS0.00", "SOS0.00", "SOS14.00", "SOS0.00", "SOS0.00", "SOS14.00"],
        ],
        totals: ["Total", "-", "-", "SOS0.00", "SOS17.00", "SOS14.00", "SOS0.00", "SOS0.00", "SOS31.00"],
      };
    case "invoice-details":
      return {
        title: "Invoice Details",
        subtitle: "From 01 Mar 2026 To 31 Mar 2026",
        columns: ["Invoice", "Customer", "Invoice Date", "Due Date", "Amount", "Balance", "Status"],
        rows: [
          ["INV-001", "ss", "01 Mar 2026", "31 Mar 2026", "SOS17.00", "SOS17.00", "Open"],
          ["INV-002", "Northwind", "12 Mar 2026", "26 Mar 2026", "SOS14.00", "SOS14.00", "Open"],
        ],
        totals: ["Total", "-", "-", "-", "SOS31.00", "SOS31.00", "-"],
      };
    case "retainer-invoice-details":
      return {
        title: "Retainer Invoice Details",
        subtitle: "From 01 Mar 2026 To 31 Mar 2026",
        columns: ["Retainer Invoice", "Customer", "Advance Received", "Applied", "Balance", "Status"],
        rows: [
          ["RINV-001", "ss", "SOS10.00", "SOS7.00", "SOS3.00", "Open"],
          ["RINV-002", "Northwind", "SOS20.00", "SOS12.00", "SOS8.00", "Open"],
        ],
        totals: ["Total", "-", "SOS30.00", "SOS19.00", "SOS11.00", "-"],
      };
    case "quote-details":
      return {
        title: "Quote Details",
        subtitle: "From 01 Mar 2026 To 31 Mar 2026",
        columns: ["Quote", "Customer", "Quote Date", "Amount", "Expiry", "Status"],
        rows: [
          ["Q-001", "ss", "05 Mar 2026", "SOS17.00", "19 Mar 2026", "Sent"],
          ["Q-002", "Northwind", "10 Mar 2026", "SOS14.00", "24 Mar 2026", "Viewed"],
        ],
        totals: ["Total", "-", "-", "SOS31.00", "-", "-"],
      };
    case "bad-debts":
      return {
        title: "Bad Debts",
        subtitle: "From 01 Mar 2026 To 31 Mar 2026",
        columns: ["Invoice", "Customer", "Written Off Date", "Amount", "Reason"],
        rows: [
          ["INV-009", "ss", "28 Mar 2026", "SOS5.00", "Uncollectible"],
          ["INV-010", "Northwind", "29 Mar 2026", "SOS7.00", "Disputed"],
        ],
        totals: ["Total", "-", "-", "SOS12.00", "-"],
      };
    case "customer-balance-summary":
      return {
        title: "Customer Balance Summary",
        subtitle: "As of 31 Mar 2026",
        columns: ["Customer Name", "Opening", "Invoiced", "Receipts", "Closing Balance"],
        rows: [
          ["ss", "SOS0.00", "SOS17.00", "SOS0.00", "SOS17.00"],
          ["Northwind", "SOS3.00", "SOS14.00", "SOS4.00", "SOS13.00"],
        ],
        totals: ["Total", "SOS3.00", "SOS31.00", "SOS4.00", "SOS30.00"],
      };
    case "receivable-summary":
      return {
        title: "Receivable Summary",
        subtitle: "From 01 Mar 2026 To 31 Mar 2026",
        columns: ["Document", "Customer", "Type", "Amount", "Status"],
        rows: [
          ["INV-001", "ss", "Invoice", "SOS17.00", "Open"],
          ["CN-002", "Northwind", "Credit Note", "SOS4.00", "Applied"],
        ],
        totals: ["Total", "-", "-", "SOS21.00", "-"],
      };
    case "receivable-details":
      return {
        title: "Receivable Details",
        subtitle: "From 01 Mar 2026 To 31 Mar 2026",
        columns: ["Item", "Customer", "Qty", "Amount", "Balance"],
        rows: [
          ["Starter Plan", "ss", 1, "SOS17.00", "SOS17.00"],
          ["Pro Addon", "Northwind", 2, "SOS14.00", "SOS14.00"],
        ],
        totals: ["Total", "-", 3, "SOS31.00", "SOS31.00"],
      };
    case "progress-invoice-summary":
      return {
        title: "Progress Invoice Summary",
        subtitle: "From 01 Mar 2026 To 31 Mar 2026",
        columns: ["Project", "Milestone", "Invoiced", "Pending", "Status"],
        rows: [
          ["Project A", "Milestone 1", "SOS10.00", "SOS5.00", "Partial"],
          ["Project B", "Milestone 2", "SOS8.00", "SOS6.00", "Pending"],
        ],
        totals: ["Total", "-", "SOS18.00", "SOS11.00", "-"],
      };
    default:
      if (reportId.startsWith("sales-")) {
        return {
          title: reportName,
          subtitle: "From 01 Mar 2026 To 31 Mar 2026",
          columns: ["Name", "Count", "Sales", "Sales With Tax"],
          rows: [
            ["Sample", 1, "SOS-0.00", "SOS-0.00"],
            ["Total Sample", 2, "SOS-0.00", "SOS-0.00"],
          ],
          totals: ["Total", 3, "SOS-0.00", "SOS-0.00"],
        };
      }

      if (reportId.includes("invoice") || reportId.includes("receivable") || reportId.includes("balance") || reportId.includes("aging")) {
        return {
          title: reportName,
          subtitle: "From 01 Mar 2026 To 31 Mar 2026",
          columns: ["Name", "Open Amount", "Overdue", "Status"],
          rows: [["Sample Customer", "SOS-0.00", "0 Days", "Open"]],
          totals: ["Total", "SOS-0.00", "-", "-"],
        };
      }

      if (categoryName === "Subscriptions Reports") {
        return {
          title: reportName,
          subtitle: "From 01 Mar 2026 To 31 Mar 2026",
          columns: ["Name", "Subscriptions", "Net Customers", "ARPU"],
          rows: [["Sample Account", 7, 2, "SOS-12.00"]],
          totals: ["Total", 7, 2, "SOS-12.00"],
        };
      }

      return getDefaultPreview(reportName, categoryName);
  }
};

const formatMoney = (value: any, currency = "SOS") => {
  const number = Number(value ?? 0);
  const safe = Number.isFinite(number) ? number : 0;
  return `${currency}${safe.toFixed(2)}`;
};

const formatHours = (minutes: any) => {
  const value = Number(minutes ?? 0);
  const safe = Number.isFinite(value) ? value : 0;
  return `${(safe / 60).toFixed(2)}h`;
};

const normalizeText = (value: unknown) => String(value ?? "").trim().toLowerCase();

const isActiveSubscriptionStatus = (status: unknown) => {
  const text = normalizeText(status);
  return ["active", "trial", "paid", "running", "open"].some((part) => text.includes(part));
};

const isCancelledSubscriptionStatus = (status: unknown) => {
  const text = normalizeText(status);
  return ["cancel", "inactive", "expire", "churn", "failed"].some((part) => text.includes(part));
};

const getCustomerCountry = (customer: any) =>
  String(
    customer?.billingAddress?.country ||
      customer?.shippingAddress?.country ||
      customer?.country ||
      customer?.location ||
      customer?.address?.country ||
      "Unknown"
  ).trim() || "Unknown";

const getSubscriptionValue = (row: any) =>
  Number(
    row?.monthlyAmount ??
      row?.mrr ??
      row?.amount ??
      row?.total ??
      row?.price ??
      row?.billingAmount ??
      row?.recurringAmount ??
      row?.chargeAmount ??
      row?.rate ??
      0
  ) || 0;

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

const buildDatabasePreview = async (
  reportId: string,
  reportName: string,
  categoryName: string,
  agingBy: AgingByOption = "invoice-due-date",
): Promise<PreviewTableConfig | null> => {
  const liveSubtitle = `Live data from ${categoryName}`;

  if (reportId === "sales-by-customer") {
    const invoices = await fetchCollectionRows("/invoices");
    const grouped = new Map<string, { count: number; sales: number; tax: number; currency: string }>();

    invoices.forEach((invoice: any) => {
      const key = String(invoice.customerName || "Unknown Customer");
      const current = grouped.get(key) || { count: 0, sales: 0, tax: 0, currency: String(invoice.currency || "SOS") };
      current.count += 1;
      current.sales += Number(invoice.total ?? 0);
      current.tax += Number(invoice.totalTax ?? 0);
      current.currency = String(invoice.currency || current.currency || "SOS");
      grouped.set(key, current);
    });

    const entries = [...grouped.entries()].sort((a, b) => b[1].sales - a[1].sales);
    if (entries.length === 0) return null;

    return {
      title: "Sales by Customer",
      subtitle: liveSubtitle,
      columns: ["Name", "Invoice Count", "Sales", "Sales With Tax"],
      rows: entries.map(([name, item]) => [name, item.count, formatMoney(item.sales, item.currency), formatMoney(item.sales + item.tax, item.currency)]),
      totals: [
        "Total",
        entries.reduce((sum, [, item]) => sum + item.count, 0),
        formatMoney(entries.reduce((sum, [, item]) => sum + item.sales, 0), entries[0][1].currency),
        formatMoney(entries.reduce((sum, [, item]) => sum + item.sales + item.tax, 0), entries[0][1].currency),
      ],
    };
  }

  if (reportId === "sales-by-item") {
    const invoices = await fetchCollectionRows("/invoices");
    const grouped = new Map<string, { qty: number; invoices: number; sales: number; tax: number; currency: string }>();
    invoices.forEach((invoice: any) => {
      const currency = String(invoice.currency || "SOS");
      const seenItems = new Set<string>();
      (Array.isArray(invoice.items) ? invoice.items : []).forEach((item: any) => {
        const name = String(item?.name || item?.itemDetails || item?.description || "Item");
        const current = grouped.get(name) || { qty: 0, invoices: 0, sales: 0, tax: 0, currency };
        const quantity = Number(item?.quantity ?? 0);
        const amount = Number(item?.amount ?? item?.total ?? 0);
        const tax = Number(item?.taxAmount ?? 0);
        current.qty += quantity;
        current.sales += amount;
        current.tax += tax;
        current.currency = currency;
        if (!seenItems.has(name)) {
          current.invoices += 1;
          seenItems.add(name);
        }
        grouped.set(name, current);
      });
    });

    const entries = [...grouped.entries()].sort((a, b) => b[1].sales - a[1].sales);
    if (entries.length === 0) return null;

    return {
      title: "Sales by Item",
      subtitle: liveSubtitle,
      columns: ["Item", "Quantity Sold", "Invoices", "Sales", "Sales With Tax"],
      rows: entries.map(([name, item]) => [name, item.qty, item.invoices, formatMoney(item.sales, item.currency), formatMoney(item.sales + item.tax, item.currency)]),
      totals: [
        "Total",
        entries.reduce((sum, [, item]) => sum + item.qty, 0),
        entries.reduce((sum, [, item]) => sum + item.invoices, 0),
        formatMoney(entries.reduce((sum, [, item]) => sum + item.sales, 0), entries[0][1].currency),
        formatMoney(entries.reduce((sum, [, item]) => sum + item.sales + item.tax, 0), entries[0][1].currency),
      ],
    };
  }

  if (reportId === "sales-summary") {
    const [invoices, creditNotes, receipts] = await Promise.all([
      fetchCollectionRows("/invoices"),
      fetchCollectionRows("/credit-notes"),
      fetchCollectionRows("/sales-receipts"),
    ]);
    const grouped = new Map<string, { invoices: number; creditNotes: number; receipts: number; sales: number; tax: number; currency: string }>();
    const addRow = (kind: "invoice" | "credit" | "receipt", row: any) => {
      const date = row.date || row.invoiceDate || row.quoteDate || row.createdAt;
      const key = date ? formatDate(new Date(date)) : "Unknown";
      const current = grouped.get(key) || { invoices: 0, creditNotes: 0, receipts: 0, sales: 0, tax: 0, currency: String(row.currency || "SOS") };
      if (kind === "invoice") current.invoices += 1;
      if (kind === "credit") current.creditNotes += 1;
      if (kind === "receipt") current.receipts += 1;
      current.sales += Number(row.total ?? 0);
      current.tax += Number(row.totalTax ?? row.taxAmount ?? 0);
      current.currency = String(row.currency || current.currency || "SOS");
      grouped.set(key, current);
    };
    invoices.forEach((row: any) => addRow("invoice", row));
    creditNotes.forEach((row: any) => addRow("credit", row));
    receipts.forEach((row: any) => addRow("receipt", row));
    const entries = [...grouped.entries()].sort((a, b) => a[0].localeCompare(b[0]));
    if (entries.length === 0) return null;
    return {
      title: "Sales Summary",
      subtitle: liveSubtitle,
      columns: ["Date", "Invoices", "Credit Notes", "Receipts", "Sales", "Sales With Tax"],
      rows: entries.map(([date, item]) => [date, item.invoices, item.creditNotes, item.receipts, formatMoney(item.sales, item.currency), formatMoney(item.sales + item.tax, item.currency)]),
      totals: [
        "Total",
        entries.reduce((sum, [, item]) => sum + item.invoices, 0),
        entries.reduce((sum, [, item]) => sum + item.creditNotes, 0),
        entries.reduce((sum, [, item]) => sum + item.receipts, 0),
        formatMoney(entries.reduce((sum, [, item]) => sum + item.sales, 0), entries[0][1].currency),
        formatMoney(entries.reduce((sum, [, item]) => sum + item.sales + item.tax, 0), entries[0][1].currency),
      ],
    };
  }

  if (reportId === "ar-aging-summary") {
    const invoices = await fetchCollectionRows("/invoices");
    const today = new Date();
    const grouped = new Map<
      string,
      {
        current: number;
        days1to15: number;
        days16to30: number;
        days31to45: number;
        over45: number;
        total: number;
        currency: string;
      }
    >();

    invoices.forEach((row: any) => {
      const key = String(row.customerName || row.customer?.displayName || row.customer?.companyName || row.customer?.name || "Unknown Customer");
      const amount = Number(row.balance ?? row.balanceDue ?? row.total ?? 0);
      const currency = String(row.currency || "SOS");
      const referenceDate = getAgingReferenceDate(row, agingBy);
      const days = referenceDate ? Math.max(0, Math.floor((today.getTime() - referenceDate.getTime()) / (1000 * 60 * 60 * 24))) : 0;
      const bucket = getAgingBucketLabel(days);
      const current =
        grouped.get(key) || {
          current: 0,
          days1to15: 0,
          days16to30: 0,
          days31to45: 0,
          over45: 0,
          total: 0,
          currency,
        };

      current.total += amount;
      current.currency = currency;

      if (bucket === "Current") current.current += amount;
      else if (bucket === "1-15 Days") current.days1to15 += amount;
      else if (bucket === "16-30 Days") current.days16to30 += amount;
      else if (bucket === "31-45 Days") current.days31to45 += amount;
      else current.over45 += amount;

      grouped.set(key, current);
    });

    const entries = [...grouped.entries()].sort((a, b) => b[1].total - a[1].total);
    if (entries.length === 0) return null;

    const currency = entries[0][1].currency;
    const totalCurrent = entries.reduce((sum, [, item]) => sum + item.current, 0);
    const total1to15 = entries.reduce((sum, [, item]) => sum + item.days1to15, 0);
    const total16to30 = entries.reduce((sum, [, item]) => sum + item.days16to30, 0);
    const total31to45 = entries.reduce((sum, [, item]) => sum + item.days31to45, 0);
    const totalOver45 = entries.reduce((sum, [, item]) => sum + item.over45, 0);
    const totalAmount = entries.reduce((sum, [, item]) => sum + item.total, 0);

    return {
      title: reportName,
      subtitle: "",
      columns: ["Customer Name", "Current", "1-15 Days", "16-30 Days", "31-45 Days", "> 45 Days", "Total", "Total (FCY)"],
      rows: entries.map(([name, item]) => [
        name,
        formatMoney(item.current, item.currency),
        formatMoney(item.days1to15, item.currency),
        formatMoney(item.days16to30, item.currency),
        formatMoney(item.days31to45, item.currency),
        formatMoney(item.over45, item.currency),
        formatMoney(item.total, item.currency),
        formatMoney(item.total, item.currency),
      ]),
      totals: [
        "Total",
        formatMoney(totalCurrent, currency),
        formatMoney(total1to15, currency),
        formatMoney(total16to30, currency),
        formatMoney(total31to45, currency),
        formatMoney(totalOver45, currency),
        formatMoney(totalAmount, currency),
        formatMoney(totalAmount, currency),
      ],
    };
  }

  if (reportId === "invoice-details" || reportId === "ar-aging-details" || reportId === "customer-balance-summary" || reportId === "receivable-summary" || reportId === "receivable-details") {
    const [invoices, creditNotes, receipts] = await Promise.all([
      fetchCollectionRows("/invoices"),
      fetchCollectionRows("/credit-notes"),
      fetchCollectionRows("/sales-receipts"),
    ]);
    if (reportId === "receivable-summary") {
      const rows = [
        ...invoices.slice(0, 8).map((row: any) => [row.invoiceNumber || "-", row.customerName || "-", "Invoice", formatMoney(row.total, row.currency), row.status || "-"]),
        ...creditNotes.slice(0, 8).map((row: any) => [row.creditNoteNumber || "-", row.customerName || "-", "Credit Note", formatMoney(row.total, row.currency), row.status || "-"]),
        ...receipts.slice(0, 8).map((row: any) => [row.receiptNumber || "-", row.customerName || "-", "Sales Receipt", formatMoney(row.total, row.currency), row.status || "-"]),
      ];
      if (rows.length === 0) return null;
      return { title: "Receivable Summary", subtitle: liveSubtitle, columns: ["Document", "Customer", "Type", "Amount", "Status"], rows, totals: ["Total", "-", "-", "-", "-"] };
    }

    if (reportId === "customer-balance-summary") {
      const grouped = new Map<string, { invoiced: number; receipts: number; opening: number; currency: string }>();
      invoices.forEach((row: any) => {
        const key = String(row.customerName || "Unknown Customer");
        const current = grouped.get(key) || { invoiced: 0, receipts: 0, opening: 0, currency: String(row.currency || "SOS") };
        current.invoiced += Number(row.total ?? 0);
        current.currency = String(row.currency || current.currency || "SOS");
        grouped.set(key, current);
      });
      receipts.forEach((row: any) => {
        const key = String(row.customerName || "Unknown Customer");
        const current = grouped.get(key) || { invoiced: 0, receipts: 0, opening: 0, currency: String(row.currency || "SOS") };
        current.receipts += Number(row.total ?? 0);
        current.currency = String(row.currency || current.currency || "SOS");
        grouped.set(key, current);
      });
      if (grouped.size === 0) return null;
      const entries = [...grouped.entries()].sort((a, b) => b[1].invoiced - a[1].invoiced);
      return {
        title: "Customer Balance Summary",
        subtitle: liveSubtitle,
        columns: ["Customer Name", "Opening", "Invoiced", "Receipts", "Closing Balance"],
        rows: entries.map(([name, item]) => {
          const closing = item.opening + item.invoiced - item.receipts;
          return [name, formatMoney(item.opening, item.currency), formatMoney(item.invoiced, item.currency), formatMoney(item.receipts, item.currency), formatMoney(closing, item.currency)];
        }),
        totals: [
          "Total",
          formatMoney(entries.reduce((sum, [, item]) => sum + item.opening, 0), entries[0][1].currency),
          formatMoney(entries.reduce((sum, [, item]) => sum + item.invoiced, 0), entries[0][1].currency),
          formatMoney(entries.reduce((sum, [, item]) => sum + item.receipts, 0), entries[0][1].currency),
          formatMoney(entries.reduce((sum, [, item]) => sum + item.opening + item.invoiced - item.receipts, 0), entries[0][1].currency),
        ],
      };
    }

    if (reportId === "ar-aging-details") {
      const today = new Date();
      const basisColumnLabel = agingBy === "invoice-date" ? "Invoice Date" : "Due Date";
      const rows = invoices
        .map((row: any) => {
          const basisDate = getAgingReferenceDate(row, agingBy);
          const days = basisDate ? Math.max(0, Math.floor((today.getTime() - basisDate.getTime()) / (1000 * 60 * 60 * 24))) : 0;
          const bucket = getAgingBucketLabel(days);
          return {
            invoice: row.invoiceNumber || "-",
            customer: row.customerName || row.customer?.displayName || row.customer?.companyName || row.customer?.name || "-",
            basisDate: basisDate ? formatDate(basisDate) : "-",
            bucket,
            amount: formatMoney(row.balance ?? row.balanceDue ?? row.total ?? 0, row.currency),
            status: row.status || "-",
            days,
          };
        })
        .sort((a, b) => b.days - a.days)
        .slice(0, 20)
        .map((row) => [row.invoice, row.customer, row.basisDate, row.bucket, row.amount, row.status]);
      if (rows.length === 0) return null;
      return { title: reportName, subtitle: "", columns: ["Invoice", "Customer", basisColumnLabel, "Aging Bucket", "Amount", "Status"], rows, totals: ["Total", "-", "-", "-", "-", "-"] };
    }

    if (reportId === "invoice-details") {
      const rows = invoices.slice(0, 20).map((row: any) => [
        row.invoiceNumber || "-",
        row.customerName || "-",
        row.date ? formatDate(new Date(row.date)) : "-",
        row.dueDate ? formatDate(new Date(row.dueDate)) : "-",
        formatMoney(row.total ?? 0, row.currency),
        formatMoney(row.balance ?? row.balanceDue ?? 0, row.currency),
        row.status || "-",
      ]);
      if (rows.length === 0) return null;
      return { title: "Invoice Details", subtitle: liveSubtitle, columns: ["Invoice", "Customer", "Invoice Date", "Due Date", "Amount", "Balance", "Status"], rows, totals: ["Total", "-", "-", "-", formatMoney(invoices.reduce((sum: number, row: any) => sum + Number(row.total ?? 0), 0), invoices[0]?.currency || "SOS"), formatMoney(invoices.reduce((sum: number, row: any) => sum + Number(row.balance ?? row.balanceDue ?? 0), 0), invoices[0]?.currency || "SOS"), "-"] };
    }

    if (reportId === "receivable-details") {
      const rows = invoices.slice(0, 20).map((row: any) => [row.invoiceNumber || "-", row.customerName || "-", 1, formatMoney(row.total ?? 0, row.currency), formatMoney(row.balance ?? row.balanceDue ?? 0, row.currency)]);
      if (rows.length === 0) return null;
      return { title: "Receivable Details", subtitle: liveSubtitle, columns: ["Item", "Customer", "Qty", "Amount", "Balance"], rows, totals: ["Total", "-", rows.length, formatMoney(invoices.reduce((sum: number, row: any) => sum + Number(row.total ?? 0), 0), invoices[0]?.currency || "SOS"), formatMoney(invoices.reduce((sum: number, row: any) => sum + Number(row.balance ?? row.balanceDue ?? 0), 0), invoices[0]?.currency || "SOS")] };
    }
  }

  if (reportId === "quote-details") {
    const quotes = await fetchCollectionRows("/quotes");
    const rows = quotes.slice(0, 20).map((row: any) => [row.quoteNumber || "-", row.customerName || "-", row.quoteDate ? formatDate(new Date(row.quoteDate)) : "-", formatMoney(row.total ?? row.subTotal ?? row.subtotal ?? 0, row.currency), row.expiryDate ? formatDate(new Date(row.expiryDate)) : "-", row.status || "-"]);
    if (rows.length === 0) return null;
    return { title: "Quote Details", subtitle: liveSubtitle, columns: ["Quote", "Customer", "Quote Date", "Amount", "Expiry", "Status"], rows, totals: ["Total", "-", "-", formatMoney(quotes.reduce((sum: number, row: any) => sum + Number(row.total ?? row.subTotal ?? row.subtotal ?? 0), 0), quotes[0]?.currency || "SOS"), "-", "-"] };
  }

  if (
    reportId === "active-trials" ||
    reportId === "inactive-trials" ||
    reportId === "trial-to-live-conversions" ||
    reportId === "average-sales-cycle-length" ||
    reportId === "lost-opportunities" ||
    reportId === "signups" ||
    reportId === "activations" ||
    reportId === "activations-by-country" ||
    reportId === "net-customers" ||
    reportId === "active-subscriptions" ||
    reportId === "subscription-summary" ||
    reportId === "upgrades" ||
    reportId === "downgrades" ||
    reportId === "mrr" ||
    reportId === "arr" ||
    reportId === "mrr-quick-ratio" ||
    reportId === "renewal-summary" ||
    reportId === "net-revenue" ||
    reportId === "revenue-by-country"
  ) {
    const [customers, subscriptions, quotes, invoices, expenses] = await Promise.all([
      fetchCollectionRows("/customers"),
      fetchCollectionRows("/subscriptions"),
      fetchCollectionRows("/quotes"),
      fetchCollectionRows("/invoices"),
      fetchCollectionRows("/expenses"),
    ]);

    const customerByKey = new Map<string, any>();
    customers.forEach((customer: any) => {
      const keys = [
        String(customer.id || customer._id || "").trim(),
        String(customer.customerId || "").trim(),
        String(customer.name || "").trim(),
        String(customer.displayName || "").trim(),
        String(customer.companyName || "").trim(),
      ].filter(Boolean);
      keys.forEach((key) => customerByKey.set(key.toLowerCase(), customer));
    });

    const subscriptionRows = subscriptions.map((row: any) => ({
      id: String(row.id || row._id || ""),
      subscriptionNumber: String(row.subscriptionNumber || row.profileName || row.name || "-"),
      customerName: String(row.customerName || "-"),
      status: String(row.status || "-"),
      createdAt: row.createdAt ? formatDate(new Date(row.createdAt)) : "-",
      startDate: row.startDate ? formatDate(new Date(row.startDate)) : "-",
      value: getSubscriptionValue(row),
      customerCountry: getCustomerCountry(customerByKey.get(String(row.customerId || row.customer || row.customerName || "").trim().toLowerCase())),
    }));

    if (reportId === "active-trials" || reportId === "inactive-trials" || reportId === "trial-to-live-conversions") {
      const trialLike = subscriptionRows.filter((row) => normalizeText(row.status).includes("trial"));
      const activeLike = subscriptionRows.filter((row) => isActiveSubscriptionStatus(row.status));
      const inactiveLike = subscriptionRows.filter((row) => isCancelledSubscriptionStatus(row.status) || normalizeText(row.status).includes("draft"));
      const rows =
        reportId === "active-trials"
          ? (trialLike.length > 0 ? trialLike : activeLike).slice(0, 20).map((row) => [row.subscriptionNumber, row.customerName, row.status, row.createdAt])
          : reportId === "inactive-trials"
            ? (inactiveLike.length > 0 ? inactiveLike : subscriptionRows.filter((row) => !isActiveSubscriptionStatus(row.status))).slice(0, 20).map((row) => [row.subscriptionNumber, row.customerName, row.status, row.createdAt])
            : [
                ["Trial subscriptions", trialLike.length, "-", "-"],
                ["Live subscriptions", activeLike.length, "-", "-"],
                [
                  "Conversion rate",
                  `${trialLike.length > 0 ? ((activeLike.length / trialLike.length) * 100).toFixed(1) : "0.0"}%`,
                  "-",
                  "-",
                ],
              ];

      return {
        title: reportName,
        subtitle: liveSubtitle,
        columns: reportId === "trial-to-live-conversions" ? ["Metric", "Value", "Count", "Notes"] : ["Subscription", "Customer", "Status", "Created"],
        rows,
        totals:
          reportId === "trial-to-live-conversions"
            ? ["Total", "-", trialLike.length + activeLike.length, "-"]
            : ["Total", "-", "-", String(rows.length)],
      };
    }

    if (reportId === "average-sales-cycle-length") {
      const invoiceByCustomer = new Map<string, any[]>();
      invoices.forEach((row: any) => {
        const key = String(row.customerName || "").trim().toLowerCase();
        if (!key) return;
        const bucket = invoiceByCustomer.get(key) || [];
        bucket.push(row);
        invoiceByCustomer.set(key, bucket);
      });
      const quoteRows = quotes
        .map((quote: any) => {
          const key = String(quote.customerName || "").trim().toLowerCase();
          const quoteDate = quote.quoteDate ? new Date(quote.quoteDate) : null;
          if (!key || !quoteDate || Number.isNaN(quoteDate.getTime())) return null;
          const matchingInvoice = (invoiceByCustomer.get(key) || [])
            .map((invoice: any) => ({ invoice, invoiceDate: invoice.date ? new Date(invoice.date) : null }))
            .filter((entry) => entry.invoiceDate && !Number.isNaN(entry.invoiceDate.getTime()) && entry.invoiceDate! >= quoteDate)
            .sort((a, b) => (a.invoiceDate!.getTime() - b.invoiceDate!.getTime()))[0];
          if (!matchingInvoice) return null;
          const days = Math.max(0, Math.round((matchingInvoice.invoiceDate!.getTime() - quoteDate.getTime()) / (1000 * 60 * 60 * 24)));
          return {
            customer: quote.customerName || "-",
            quoteDate: formatDate(quoteDate),
            invoiceDate: formatDate(matchingInvoice.invoiceDate!),
            days,
            quoteAmount: formatMoney(quote.total ?? quote.subTotal ?? quote.subtotal ?? 0, quote.currency),
            invoiceAmount: formatMoney(matchingInvoice.invoice.total ?? 0, matchingInvoice.invoice.currency || quote.currency),
          };
        })
        .filter(Boolean) as Array<{ customer: string; quoteDate: string; invoiceDate: string; days: number; quoteAmount: string; invoiceAmount: string }>;

      if (quoteRows.length === 0) return null;
      const avgDays = quoteRows.reduce((sum, row) => sum + row.days, 0) / quoteRows.length;
      return {
        title: "Average Sales Cycle Length",
        subtitle: liveSubtitle,
        columns: ["Customer", "Quote Date", "Invoice Date", "Cycle Days", "Quote Amount", "Invoice Amount"],
        rows: quoteRows.slice(0, 20).map((row) => [row.customer, row.quoteDate, row.invoiceDate, row.days, row.quoteAmount, row.invoiceAmount]),
        totals: ["Average", "-", "-", avgDays.toFixed(1), "-", "-"],
      };
    }

    if (reportId === "lost-opportunities") {
      const rows = quotes
        .filter((row: any) => /declined|rejected|expired|lost|cancelled|canceled/i.test(String(row.status || "")))
        .slice(0, 20)
        .map((row: any) => [
          row.quoteNumber || "-",
          row.customerName || "-",
          row.quoteDate ? formatDate(new Date(row.quoteDate)) : "-",
          row.expiryDate ? formatDate(new Date(row.expiryDate)) : "-",
          row.status || "-",
          formatMoney(row.total ?? row.subTotal ?? row.subtotal ?? 0, row.currency),
        ]);
      if (rows.length === 0) return null;
      return {
        title: "Lost Opportunities",
        subtitle: liveSubtitle,
        columns: ["Quote", "Customer", "Quote Date", "Expiry", "Status", "Amount"],
        rows,
        totals: ["Total", "-", "-", "-", "-", formatMoney(quotes.reduce((sum: number, row: any) => sum + Number(row.total ?? row.subTotal ?? row.subtotal ?? 0), 0), quotes[0]?.currency || "SOS")],
      };
    }

    if (reportId === "signups") {
      const grouped = new Map<string, { count: number; active: number; inactive: number }>();
      customers.forEach((customer: any) => {
        const date = customer.createdAt || customer.updatedAt;
        if (!date) return;
        const key = new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric" }).format(new Date(date));
        const current = grouped.get(key) || { count: 0, active: 0, inactive: 0 };
        current.count += 1;
        if (normalizeText(customer.status).includes("active")) current.active += 1;
        if (!normalizeText(customer.status).includes("active")) current.inactive += 1;
        grouped.set(key, current);
      });
      const entries = [...grouped.entries()];
      if (entries.length === 0) return null;
      return {
        title: "Signups",
        subtitle: liveSubtitle,
        columns: ["Month", "Signups", "Active", "Inactive"],
        rows: entries.map(([month, item]) => [month, item.count, item.active, item.inactive]),
        totals: ["Total", customers.length, customers.filter((customer: any) => normalizeText(customer.status).includes("active")).length, customers.filter((customer: any) => !normalizeText(customer.status).includes("active")).length],
      };
    }

    if (reportId === "activations") {
      const activeSubs = subscriptionRows.filter((row) => isActiveSubscriptionStatus(row.status));
      const grouped = new Map<string, number>();
      subscriptions.forEach((row: any) => {
        if (!isActiveSubscriptionStatus(row.status)) return;
        if (!row.createdAt) return;
        const key = new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric" }).format(new Date(row.createdAt));
        grouped.set(key, (grouped.get(key) || 0) + 1);
      });
      const entries = [...grouped.entries()];
      if (entries.length === 0 && activeSubs.length === 0) return null;
      return {
        title: "Activations",
        subtitle: liveSubtitle,
        columns: ["Month", "Activations", "Active Subscriptions", "Notes"],
        rows: (entries.length > 0 ? entries : [["Current", activeSubs.length, activeSubs.length, "Live records only"]]).map(([month, count]) => [month, count, activeSubs.length, ""]),
        totals: ["Total", activeSubs.length, activeSubs.length, "-"],
      };
    }

    if (reportId === "activations-by-country") {
      const grouped = new Map<string, { count: number; value: number }>();
      subscriptions.forEach((row: any) => {
        if (!isActiveSubscriptionStatus(row.status)) return;
        const customer = customerByKey.get(String(row.customerId || row.customerName || "").trim().toLowerCase());
        const country = getCustomerCountry(customer);
        const current = grouped.get(country) || { count: 0, value: 0 };
        current.count += 1;
        current.value += getSubscriptionValue(row);
        grouped.set(country, current);
      });
      const entries = [...grouped.entries()].sort((a, b) => b[1].count - a[1].count);
      if (entries.length === 0) return null;
      return {
        title: "Activations by Country",
        subtitle: liveSubtitle,
        columns: ["Country", "Activations", "MRR"],
        rows: entries.map(([country, item]) => [country, item.count, formatMoney(item.value, subscriptions[0]?.currency || "SOS")]),
        totals: ["Total", entries.reduce((sum, [, item]) => sum + item.count, 0), formatMoney(entries.reduce((sum, [, item]) => sum + item.value, 0), subscriptions[0]?.currency || "SOS")],
      };
    }

    if (reportId === "net-customers") {
      const activeCustomers = customers.filter((customer: any) => normalizeText(customer.status).includes("active"));
      const inactiveCustomers = customers.filter((customer: any) => !normalizeText(customer.status).includes("active"));
      return {
        title: "Net Customers",
        subtitle: liveSubtitle,
        columns: ["Metric", "Count", "Notes"],
        rows: [
          ["Active customers", activeCustomers.length, "Customers with active status"],
          ["Inactive customers", inactiveCustomers.length, "Customers not marked active"],
          ["Net customers", activeCustomers.length - inactiveCustomers.length, "Active minus inactive"],
        ],
        totals: ["Total", customers.length, "-"],
      };
    }

    if (reportId === "active-subscriptions" || reportId === "subscription-summary" || reportId === "renewal-summary" || reportId === "upgrades" || reportId === "downgrades") {
      const grouped = new Map<string, { count: number; value: number }>();
      subscriptions.forEach((row: any) => {
        const key = normalizeText(row.status) || "unknown";
        const current = grouped.get(key) || { count: 0, value: 0 };
        current.count += 1;
        current.value += getSubscriptionValue(row);
        grouped.set(key, current);
      });
      const entries = [...grouped.entries()].sort((a, b) => b[1].count - a[1].count);
      if (entries.length === 0) return null;
      return {
        title: reportName,
        subtitle: liveSubtitle,
        columns: ["Status", "Subscriptions", "Value"],
        rows: entries.map(([status, item]) => [status || "unknown", item.count, formatMoney(item.value, subscriptions[0]?.currency || "SOS")]),
        totals: ["Total", subscriptions.length, formatMoney(subscriptions.reduce((sum: number, row: any) => sum + getSubscriptionValue(row), 0), subscriptions[0]?.currency || "SOS")],
      };
    }

    if (reportId === "mrr" || reportId === "arr" || reportId === "mrr-quick-ratio") {
      const active = subscriptions.filter((row: any) => isActiveSubscriptionStatus(row.status));
      const currency = subscriptions[0]?.currency || "SOS";
      const currentMrr = active.reduce((sum: number, row: any) => sum + getSubscriptionValue(row), 0);
      const currentArr = currentMrr * 12;
      const currentMonth = new Date();
      const thisMonthKey = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, "0")}`;
      const newThisMonth = subscriptions.filter((row: any) => row.createdAt && String(row.createdAt).startsWith(thisMonthKey) && isActiveSubscriptionStatus(row.status));
      const churnedThisMonth = subscriptions.filter((row: any) => row.updatedAt && String(row.updatedAt).startsWith(thisMonthKey) && isCancelledSubscriptionStatus(row.status));
      const newMrr = newThisMonth.reduce((sum: number, row: any) => sum + getSubscriptionValue(row), 0);
      const churnMrr = churnedThisMonth.reduce((sum: number, row: any) => sum + getSubscriptionValue(row), 0);
      if (reportId === "mrr-quick-ratio") {
        const ratio = churnMrr > 0 ? newMrr / churnMrr : newMrr > 0 ? newMrr : 0;
        return {
          title: "MRR Quick Ratio",
          subtitle: liveSubtitle,
          columns: ["Metric", "Value", "Amount", "Notes"],
          rows: [
            ["New MRR", newThisMonth.length, formatMoney(newMrr, currency), "Live subscriptions created this month"],
            ["Churn MRR", churnedThisMonth.length, formatMoney(churnMrr, currency), "Cancelled subscriptions updated this month"],
            ["Quick Ratio", "-", ratio ? ratio.toFixed(2) : "0.00", "New / Churn"],
          ],
          totals: ["Total", active.length, formatMoney(currentMrr, currency), "-"],
        };
      }

      const topRows = active
        .slice()
        .sort((a, b) => getSubscriptionValue(b) - getSubscriptionValue(a))
        .slice(0, 20)
        .map((row: any) => [row.subscriptionNumber, row.customerName, formatMoney(getSubscriptionValue(row), currency), row.status, row.createdAt || "-"]);

      return {
        title: reportId === "arr" ? "ARR" : "MRR",
        subtitle: liveSubtitle,
        columns: ["Subscription", "Customer", reportId === "arr" ? "ARR" : "MRR", "Status", "Created"],
        rows: topRows.map((row) => [row[0], row[1], reportId === "arr" ? formatMoney(Number(String(row[2]).replace(/[^0-9.-]/g, "")) * 12, currency) : row[2], row[3], row[4]]),
        totals: ["Total", "-", reportId === "arr" ? formatMoney(currentArr, currency) : formatMoney(currentMrr, currency), "-", "-"],
      };
    }

    if (reportId === "net-revenue") {
      const grouped = new Map<string, { revenue: number; expenses: number }>();
      invoices.forEach((row: any) => {
        const date = row.date || row.invoiceDate || row.createdAt;
        if (!date) return;
        const key = new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric" }).format(new Date(date));
        const current = grouped.get(key) || { revenue: 0, expenses: 0 };
        current.revenue += Number(row.total ?? 0);
        grouped.set(key, current);
      });
      expenses.forEach((row: any) => {
        const date = row.date || row.createdAt;
        if (!date) return;
        const key = new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric" }).format(new Date(date));
        const current = grouped.get(key) || { revenue: 0, expenses: 0 };
        current.expenses += Number(row.amount ?? 0);
        grouped.set(key, current);
      });
      const entries = [...grouped.entries()];
      if (entries.length === 0) return null;
      return {
        title: "Net Revenue",
        subtitle: liveSubtitle,
        columns: ["Month", "Revenue", "Expenses", "Net"],
        rows: entries.map(([month, item]) => [month, formatMoney(item.revenue, invoices[0]?.currency || "SOS"), formatMoney(item.expenses, expenses[0]?.currency || "SOS"), formatMoney(item.revenue - item.expenses, invoices[0]?.currency || "SOS")]),
        totals: [
          "Total",
          formatMoney(invoices.reduce((sum: number, row: any) => sum + Number(row.total ?? 0), 0), invoices[0]?.currency || "SOS"),
          formatMoney(expenses.reduce((sum: number, row: any) => sum + Number(row.amount ?? 0), 0), expenses[0]?.currency || "SOS"),
          formatMoney(
            invoices.reduce((sum: number, row: any) => sum + Number(row.total ?? 0), 0) -
              expenses.reduce((sum: number, row: any) => sum + Number(row.amount ?? 0), 0),
            invoices[0]?.currency || "SOS"
          ),
        ],
      };
    }

    if (reportId === "revenue-by-country") {
      const grouped = new Map<string, { count: number; revenue: number }>();
      invoices.forEach((invoice: any) => {
        const customer = customerByKey.get(String(invoice.customerId || invoice.customerName || "").trim().toLowerCase());
        const country = getCustomerCountry(customer);
        const current = grouped.get(country) || { count: 0, revenue: 0 };
        current.count += 1;
        current.revenue += Number(invoice.total ?? 0);
        grouped.set(country, current);
      });
      const entries = [...grouped.entries()].sort((a, b) => b[1].revenue - a[1].revenue);
      if (entries.length === 0) return null;
      return {
        title: "Revenue by Country",
        subtitle: liveSubtitle,
        columns: ["Country", "Invoices", "Revenue"],
        rows: entries.map(([country, item]) => [country, item.count, formatMoney(item.revenue, invoices[0]?.currency || "SOS")]),
        totals: ["Total", invoices.length, formatMoney(invoices.reduce((sum: number, row: any) => sum + Number(row.total ?? 0), 0), invoices[0]?.currency || "SOS")],
      };
    }
  }

  if (reportId === "tax-summary") {
    const taxes = await fetchCollectionRows("/taxes");
    if (taxes.length === 0) return null;
    const rows = taxes.map((row: any) => [
      row.name || "-",
      row.kind || "tax",
      row.type || "-",
      `${Number(row.rate ?? 0).toFixed(2)}%`,
      row.isActive ? "Active" : "Inactive",
    ]);
    return {
      title: "Tax Summary",
      subtitle: liveSubtitle,
      columns: ["Tax Name", "Kind", "Type", "Rate", "Status"],
      rows,
      totals: ["Total", taxes.length, "-", "-", "-"],
    };
  }

  if (reportId === "sales-by-sales-person") {
    const invoices = await fetchCollectionRows("/invoices");
    const grouped = new Map<string, { count: number; sales: number; tax: number; currency: string }>();
    invoices.forEach((row: any) => {
      const key = String(row.salespersonName || row.salesperson || "Unknown");
      const current = grouped.get(key) || { count: 0, sales: 0, tax: 0, currency: String(row.currency || "SOS") };
      current.count += 1;
      current.sales += Number(row.total ?? 0);
      current.tax += Number(row.totalTax ?? 0);
      current.currency = String(row.currency || current.currency || "SOS");
      grouped.set(key, current);
    });
    if (grouped.size === 0) return null;
    const entries = [...grouped.entries()].sort((a, b) => b[1].sales - a[1].sales);
    return {
      title: "Sales by Sales Person",
      subtitle: liveSubtitle,
      columns: ["Sales Person", "Invoices", "Sales", "Sales With Tax"],
      rows: entries.map(([name, item]) => [name, item.count, formatMoney(item.sales, item.currency), formatMoney(item.sales + item.tax, item.currency)]),
      totals: ["Total", entries.reduce((sum, [, item]) => sum + item.count, 0), formatMoney(entries.reduce((sum, [, item]) => sum + item.sales, 0), entries[0][1].currency), formatMoney(entries.reduce((sum, [, item]) => sum + item.sales + item.tax, 0), entries[0][1].currency)],
    };
  }

  if (reportId === "sales-by-coupon") {
    const invoices = await fetchCollectionRows("/invoices");
    const grouped = new Map<string, { uses: number; discount: number; sales: number; currency: string }>();
    invoices.forEach((row: any) => {
      const key = String(row.couponCode || row.couponName || row.discountCode || "No Coupon");
      const current = grouped.get(key) || { uses: 0, discount: 0, sales: 0, currency: String(row.currency || "SOS") };
      current.uses += 1;
      current.discount += Number(row.discountAmount ?? row.discount ?? 0);
      current.sales += Number(row.total ?? 0);
      current.currency = String(row.currency || current.currency || "SOS");
      grouped.set(key, current);
    });
    if (grouped.size === 0) return null;
    const entries = [...grouped.entries()].sort((a, b) => b[1].sales - a[1].sales);
    return {
      title: "Sales by Coupons",
      subtitle: liveSubtitle,
      columns: ["Coupon", "Uses", "Discount", "Sales", "Net Sales"],
      rows: entries.map(([name, item]) => [name, item.uses, formatMoney(item.discount, item.currency), formatMoney(item.sales, item.currency), formatMoney(item.sales - item.discount, item.currency)]),
      totals: ["Total", entries.reduce((sum, [, item]) => sum + item.uses, 0), formatMoney(entries.reduce((sum, [, item]) => sum + item.discount, 0), entries[0][1].currency), formatMoney(entries.reduce((sum, [, item]) => sum + item.sales, 0), entries[0][1].currency), formatMoney(entries.reduce((sum, [, item]) => sum + item.sales - item.discount, 0), entries[0][1].currency)],
    };
  }

  if (reportId === "sales-by-plan" || reportId === "sales-by-addon") {
    const subscriptions = await fetchCollectionRows("/subscriptions");
    const keyField = reportId === "sales-by-plan" ? "planName" : "addonName";
    const label = reportId === "sales-by-plan" ? "Plan" : "Addon";
    const grouped = new Map<string, { count: number; sales: number; tax: number; currency: string }>();
    subscriptions.forEach((row: any) => {
      const key = String(row[keyField] || row.subscriptionNumber || row.customerName || label);
      const current = grouped.get(key) || { count: 0, sales: 0, tax: 0, currency: String(row.currency || "SOS") };
      current.count += 1;
      current.sales += Number(row.total ?? row.amount ?? 0);
      current.currency = String(row.currency || current.currency || "SOS");
      grouped.set(key, current);
    });
    if (grouped.size === 0) return null;
    const entries = [...grouped.entries()].sort((a, b) => b[1].sales - a[1].sales);
    return {
      title: reportId === "sales-by-plan" ? "Sales by Plan" : "Sales by Addon",
      subtitle: liveSubtitle,
      columns: [label, reportId === "sales-by-plan" ? "Subscriptions" : "Quantity", "Customers", "Sales", "Sales With Tax"],
      rows: entries.map(([name, item]) => [name, item.count, item.count, formatMoney(item.sales, item.currency), formatMoney(item.sales + item.tax, item.currency)]),
      totals: ["Total", entries.reduce((sum, [, item]) => sum + item.count, 0), entries.reduce((sum, [, item]) => sum + item.count, 0), formatMoney(entries.reduce((sum, [, item]) => sum + item.sales, 0), entries[0][1].currency), formatMoney(entries.reduce((sum, [, item]) => sum + item.sales + item.tax, 0), entries[0][1].currency)],
    };
  }

  if (reportId === "subscriptions" || reportId === "subscription-details" || reportId === "renewal-failures" || reportId === "under-risk" || reportId === "non-renewing-profiles" || reportId === "churned-after-retries" || reportId === "churned-subscriptions" || reportId === "subscription-expiry") {
    const subscriptions = await fetchCollectionRows("/subscriptions");
    const normalized = subscriptions.map((row: any) => ({
      subscriptionNumber: row.subscriptionNumber || row.name || "-",
      customerName: row.customerName || "-",
      planName: row.planName || row.plan || row.priceListName || "-",
      status: row.status || "-",
      createdAt: row.createdAt ? formatDate(new Date(row.createdAt)) : "-",
    }));
    if (normalized.length === 0) return null;

    const detailFiltered =
      reportId === "renewal-failures" ||
      reportId === "churned-after-retries" ||
      reportId === "churned-subscriptions" ||
      reportId === "subscription-expiry" ||
      reportId === "under-risk" ||
      reportId === "non-renewing-profiles"
        ? normalized.filter((row) => /fail|retry|churn|cancel|inactive|expire|due|risk|non-renew/i.test(String(row.status).toLowerCase()))
        : normalized;

    const rowsSource = detailFiltered.length > 0 ? detailFiltered : normalized;

    if (reportId === "subscription-details" || reportId === "renewal-failures" || reportId === "under-risk" || reportId === "non-renewing-profiles" || reportId === "churned-after-retries" || reportId === "churned-subscriptions" || reportId === "subscription-expiry") {
      return {
        title: reportName,
        subtitle: liveSubtitle,
        columns: ["Subscription", "Customer", "Plan", "Status", "Created"],
        rows: rowsSource.slice(0, 20).map((row: any) => [row.subscriptionNumber, row.customerName, row.planName, row.status, row.createdAt]),
        totals: ["Total", "-", "-", rowsSource.length, "-"],
      };
    }

    const grouped = new Map<string, { count: number; latest: string; customers: Set<string> }>();
    normalized.forEach((row: any) => {
      const key = String(row.status || "Unknown");
      const current = grouped.get(key) || { count: 0, latest: "-", customers: new Set<string>() };
      current.count += 1;
      current.customers.add(String(row.customerName || "Unknown"));
      if (row.createdAt && row.createdAt !== "-" && current.latest === "-") current.latest = row.createdAt;
      grouped.set(key, current);
    });

    const entries = [...grouped.entries()].sort((a, b) => b[1].count - a[1].count);
    return {
      title: reportName,
      subtitle: liveSubtitle,
      columns: ["Status", "Subscriptions", "Customers", "Latest Created"],
      rows: entries.map(([status, item]) => [status, item.count, item.customers.size, item.latest]),
      totals: ["Total", normalized.length, new Set(normalized.map((row: any) => row.customerName)).size, "-"],
    };
  }

  if (reportId === "payments-received" || reportId === "time-to-get-paid" || reportId === "credit-note-details" || reportId === "refund-history" || reportId === "card-expiry" || reportId === "payment-failures") {
    const payments = await fetchCollectionRows("/payments-received");
    const liveRows =
      reportId === "payment-failures"
        ? payments.filter((row: any) => !/received|paid|success/i.test(String(row.status || "")))
        : payments;
    const rows = liveRows.slice(0, 20).map((row: any) => [
      row.paymentNumber || "-",
      row.customerName || "-",
      row.date ? formatDate(new Date(row.date)) : "-",
      formatMoney(row.amount ?? 0, row.currency),
      row.paymentMode || row.status || "-",
    ]);
    if (rows.length === 0) return null;
    return {
      title: reportName,
      subtitle: liveSubtitle,
      columns: ["Payment", "Customer", "Date", "Amount", reportId === "payment-failures" ? "Failure Status" : "Status"],
      rows,
      totals: ["Total", "-", "-", formatMoney(liveRows.reduce((sum: number, row: any) => sum + Number(row.amount ?? 0), 0), payments[0]?.currency || "SOS"), "-"],
    };
  }

  if (reportId === "expense-details" || reportId === "expenses-by-category" || reportId === "expenses-by-customer" || reportId === "expenses-by-project" || reportId === "billable-expense-details") {
    const expenses = await fetchCollectionRows("/expenses");
    if (reportId === "expenses-by-category") {
      const grouped = new Map<string, { count: number; amount: number }>();
      expenses.forEach((row: any) => {
        const key = String(row.accountName || row.vendorName || "Uncategorized").trim() || "Uncategorized";
        const current = grouped.get(key) || { count: 0, amount: 0 };
        current.count += 1;
        current.amount += Number(row.amount ?? 0);
        grouped.set(key, current);
      });
      const entries = [...grouped.entries()].sort((a, b) => b[1].amount - a[1].amount);
      if (entries.length === 0) return null;
      return {
        title: "Expenses by Category",
        subtitle: liveSubtitle,
        columns: ["Category", "Expenses", "Amount"],
        rows: entries.map(([name, item]) => [name, item.count, formatMoney(item.amount, expenses[0]?.currency || "SOS")]),
        totals: ["Total", expenses.length, formatMoney(expenses.reduce((sum: number, row: any) => sum + Number(row.amount ?? 0), 0), expenses[0]?.currency || "SOS")],
      };
    }

    const rows = expenses.slice(0, 20).map((row: any) => [row.date ? formatDate(new Date(row.date)) : "-", row.vendorName || "-", row.customerName || "-", row.amount ?? 0, row.status || "-"]);
    if (rows.length === 0) return null;
    return { title: reportName, subtitle: liveSubtitle, columns: ["Date", "Vendor", "Customer", "Amount", "Status"], rows, totals: ["Total", "-", "-", formatMoney(expenses.reduce((sum: number, row: any) => sum + Number(row.amount ?? 0), 0), expenses[0]?.currency || "SOS"), "-"] };
  }

  if (reportId === "project-summary" || reportId === "projects-revenue-summary" || reportId === "timesheet-details") {
    const [projects, timeEntries] = await Promise.all([fetchCollectionRows("/projects"), fetchCollectionRows("/projects/time-entries")]);
    if (reportId === "timesheet-details") {
      const rows = timeEntries.slice(0, 20).map((row: any) => [
        row.date ? formatDate(new Date(row.date)) : "-",
        row.projectName || "-",
        row.customerName || "-",
        row.userName || "-",
        row.taskName || "-",
        formatHours(row.duration ?? 0),
        row.billingStatus || "-",
      ]);
      if (rows.length === 0) return null;
      return {
        title: "Timesheet Details",
        subtitle: liveSubtitle,
        columns: ["Date", "Project", "Customer", "User", "Task", "Duration", "Billing Status"],
        rows,
        totals: ["Total", "-", "-", "-", "-", formatHours(timeEntries.reduce((sum: number, row: any) => sum + Number(row.duration ?? 0), 0)), "-"],
      };
    }

    const timeEntryByProject = new Map<string, { count: number; minutes: number }>();
    timeEntries.forEach((entry: any) => {
      const key = String(entry.projectId || entry.projectName || "").trim() || "Unknown";
      const current = timeEntryByProject.get(key) || { count: 0, minutes: 0 };
      current.count += 1;
      current.minutes += Number(entry.duration ?? 0);
      timeEntryByProject.set(key, current);
    });

    const rows = projects.slice(0, 20).map((row: any) => {
      const projectKey = String(row.id || row._id || row.name || "").trim() || "Unknown";
      const entryStats = timeEntryByProject.get(projectKey) || timeEntryByProject.get(String(row.name || "").trim()) || { count: 0, minutes: 0 };
      return [
        row.name || "-",
        row.customerName || "-",
        row.status || "-",
        formatHours(entryStats.minutes),
        formatHours(Math.max(0, entryStats.minutes - Number(row.billedMinutes ?? 0))),
      ];
    });
    if (rows.length === 0 && timeEntries.length === 0) return null;
    return {
      title: reportName,
      subtitle: liveSubtitle,
      columns: ["Project", "Customer", "Status", "Time Logged", "Unbilled Time"],
      rows,
      totals: ["Total", "-", "-", formatHours(timeEntries.reduce((sum: number, row: any) => sum + Number(row.duration ?? 0), 0)), "-"],
    };
  }

  if (reportId === "revenue-retention-cohort" || reportId === "revenue-retention-rate" || reportId === "subscription-retention-rate" || reportId === "churn-rate" || reportId === "revenue-churn") {
    const subscriptions = await fetchCollectionRows("/subscriptions");
    if (subscriptions.length === 0) return null;

    if (reportId === "revenue-retention-cohort") {
      const grouped = new Map<string, { total: number; active: number; cancelled: number }>();
      subscriptions.forEach((row: any) => {
        const date = row.createdAt || row.updatedAt || row.startDate;
        const key = date ? new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric" }).format(new Date(date)) : "Unknown";
        const current = grouped.get(key) || { total: 0, active: 0, cancelled: 0 };
        const status = String(row.status || "").toLowerCase();
        current.total += 1;
        if (/active|trial|paid|running/.test(status)) current.active += 1;
        if (/cancel|inactive|expire|churn/.test(status)) current.cancelled += 1;
        grouped.set(key, current);
      });
      const entries = [...grouped.entries()];
      return {
        title: reportName,
        subtitle: liveSubtitle,
        columns: ["Cohort", "Subscriptions", "Active", "Cancelled"],
        rows: entries.map(([label, item]) => [label, item.total, item.active, item.cancelled]),
        totals: [
          "Total",
          subscriptions.length,
          subscriptions.filter((row: any) => /active|trial|paid|running/i.test(String(row.status || ""))).length,
          subscriptions.filter((row: any) => /cancel|inactive|expire|churn/i.test(String(row.status || ""))).length,
        ],
      };
    }

    const active = subscriptions.filter((row: any) => /active|trial|paid|running/i.test(String(row.status || ""))).length;
    const cancelled = subscriptions.filter((row: any) => /cancel|inactive|expire|churn/i.test(String(row.status || ""))).length;
    const total = subscriptions.length || 1;

    return {
      title: reportName,
      subtitle: liveSubtitle,
      columns: ["Metric", "Value", "Count", "Share"],
      rows: [
        ["Active subscriptions", "Active", active, `${((active / total) * 100).toFixed(1)}%`],
        ["Churned subscriptions", "Cancelled", cancelled, `${((cancelled / total) * 100).toFixed(1)}%`],
        ["Total subscriptions", "All", subscriptions.length, "100%"],
      ],
      totals: ["Total", "-", subscriptions.length, "100%"],
    };
  }

  if (reportId === "activity-logs-audit-trail" || reportId === "system-mails" || reportId === "portal-activities" || reportId === "exception-report" || reportId === "customer-reviews") {
    const activityLogs = await fetchCollectionRows("/activity-logs");
    const filtered =
      reportId === "system-mails"
        ? activityLogs.filter((row: any) => /mail|email|send/i.test(String(row.resource || row.action || row.summary || "")))
        : reportId === "portal-activities"
          ? activityLogs.filter((row: any) => /portal/i.test(String(row.resource || row.action || row.path || "")))
          : reportId === "exception-report"
            ? activityLogs.filter((row: any) => Number(row.statusCode ?? 0) >= 400)
            : reportId === "customer-reviews"
              ? activityLogs.filter((row: any) => /review/i.test(String(row.resource || row.action || row.summary || "")))
              : activityLogs;
    const rows = filtered.slice(0, 20).map((row: any) => [
      row.occurredAt ? formatDate(new Date(row.occurredAt)) : "-",
      row.actorName || row.actorEmail || row.actorId || "-",
      row.action || "-",
      row.resource || row.entityType || "-",
      row.entityName || row.summary || "-",
      row.statusCode || "-",
    ]);
    if (rows.length === 0) return null;
    return {
      title: reportName,
      subtitle: liveSubtitle,
      columns: ["Date", "Actor", "Action", "Resource", "Details", "Status"],
      rows,
      totals: ["Total", "-", "-", "-", "-", String(filtered.length)],
    };
  }

  return null;
};

const renderCell = (value: CellValue) => (
  <span className={typeof value === "number" ? "font-medium text-[#0f172a]" : "text-[#2563eb]"}>
    {value}
  </span>
);

export default function ReportDetailPage() {
  const navigate = useNavigate();
  const { categoryId, reportId } = useParams();
  const savedCustomReports = useMemo(() => loadJson<SavedCustomReport[]>(CUSTOM_REPORTS_KEY, []), []);
  const customReport = useMemo(() => savedCustomReports.find((item) => item.id === reportId), [savedCustomReports, reportId]);
  const resolvedCategoryId = customReport?.categoryId || categoryId || "";
  const resolvedReportId = customReport?.sourceReportId || reportId || "";
  const isAgingReport = resolvedReportId === "ar-aging-summary" || resolvedReportId === "ar-aging-details";
  const category = getCategoryById(resolvedCategoryId);
  const report = getReportById(resolvedCategoryId, resolvedReportId);
  const filterDropdownRef = useRef<HTMLDivElement>(null);
  const compareButtonRef = useRef<HTMLButtonElement>(null);
  const nextMoreFilterRowId = useRef(2);
  const [reportsMenuOpen, setReportsMenuOpen] = useState(false);
  const [reportsMenuSearch, setReportsMenuSearch] = useState("");
  const [expandedCategoryId, setExpandedCategoryId] = useState<string | null>(resolvedCategoryId || "sales");
  const [activeFilterDropdown, setActiveFilterDropdown] = useState<FilterDropdown>(null);
  const [dateRangeView, setDateRangeView] = useState<"menu" | "custom">("menu");
  const [moreFiltersOpen, setMoreFiltersOpen] = useState(false);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [customizeColumnsOpen, setCustomizeColumnsOpen] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<string[]>([]);
  const [comparePopoverOpen, setComparePopoverOpen] = useState(false);
  const [compareWith, setCompareWith] = useState<CompareMode>("None");
  const [compareCount, setCompareCount] = useState("1");
  const [compareLatestToOldest, setCompareLatestToOldest] = useState(false);
  const [moreFilterRows, setMoreFilterRows] = useState<MoreFilterRow[]>([{ id: 1, field: "", comparator: "", value: "" }]);
  const [openMoreFilterFieldRowId, setOpenMoreFilterFieldRowId] = useState<number | null>(null);
  const [openMoreFilterComparatorRowId, setOpenMoreFilterComparatorRowId] = useState<number | null>(null);
  const [selectedDateRange, setSelectedDateRange] = useState<DateRangePreset>(isAgingReport ? "Today" : "This Month");
  const [agingBy, setAgingBy] = useState<AgingByOption>("invoice-due-date");
  const [selectedEntities, setSelectedEntities] = useState<string[]>([]);
  const [entitySearch, setEntitySearch] = useState("");
  const [customRange, setCustomRange] = useState<RangeDate>(() => DEFAULT_CUSTOM_RANGE);
  const [livePreview, setLivePreview] = useState<PreviewTableConfig | null>(null);
  const [livePreviewLoading, setLivePreviewLoading] = useState(false);
  const agingByLabel = getAgingByLabel(agingBy);
  const reportDisplayName = customReport?.name || (isAgingReport ? `${report?.name || (resolvedReportId === "ar-aging-details" ? "AR Aging Details" : "AR Aging Summary")} By ${agingByLabel}` : report?.name || "Report");

  const dateLabel = useMemo(() => {
    if (selectedDateRange === "Custom") {
      const from = parseDate(customRange.start);
      const to = parseDate(customRange.end);
      if (from && to) {
        return `From ${formatDate(from)} To ${formatDate(to)}`;
      }
      return "Custom Range";
    }

    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    switch (selectedDateRange) {
      case "Today":
        return `As of ${formatDate(now)}`;
      case "Yesterday": {
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        return `As of ${formatDate(yesterday)}`;
      }
      case "This Week":
        return `This Week`;
      case "This Month":
        return `From ${formatDate(from)} To ${formatDate(to)}`;
      case "This Quarter":
      case "This Year":
      case "Previous Week":
      case "Previous Month":
      case "Previous Quarter":
      case "Previous Year":
        return selectedDateRange;
      default:
        return selectedDateRange;
    }
  }, [customRange.end, customRange.start, selectedDateRange]);

  const entityOptions = useMemo(() => getEntityOptionsForCategory(resolvedCategoryId), [resolvedCategoryId]);
  const moreFilterFieldGroups = useMemo(() => getMoreFilterFieldGroupsForReport(resolvedReportId, resolvedCategoryId), [resolvedReportId, resolvedCategoryId]);
  const reportColumnGroups = useMemo(() => getReportColumnGroups(resolvedReportId, resolvedCategoryId), [resolvedReportId, resolvedCategoryId]);
  const customStart = parseDate(customRange.start) || new Date();
  const customEnd = parseDate(customRange.end) || new Date();
  const currentMonthStart = new Date(customStart.getFullYear(), customStart.getMonth(), 1);
  const nextMonthStart = new Date(currentMonthStart.getFullYear(), currentMonthStart.getMonth() + 1, 1);
  const currentMonthGrid = useMemo(() => buildMonthGrid(currentMonthStart.getFullYear(), currentMonthStart.getMonth()), [currentMonthStart.getFullYear(), currentMonthStart.getMonth()]);
  const nextMonthGrid = useMemo(() => buildMonthGrid(nextMonthStart.getFullYear(), nextMonthStart.getMonth()), [nextMonthStart.getFullYear(), nextMonthStart.getMonth()]);

  useEffect(() => {
    setSelectedEntities(entityOptions);
    setEntitySearch("");
  }, [entityOptions, resolvedCategoryId]);

  useEffect(() => {
    setExpandedCategoryId(resolvedCategoryId || "sales");
  }, [resolvedCategoryId]);

  useEffect(() => {
    setSelectedDateRange(isAgingReport ? "Today" : "This Month");
  }, [isAgingReport]);

  useEffect(() => {
    setMoreFilterRows([{ id: 1, field: "", comparator: "", value: "" }]);
    setOpenMoreFilterFieldRowId(null);
    setOpenMoreFilterComparatorRowId(null);
    nextMoreFilterRowId.current = 2;
  }, [resolvedCategoryId]);

  useEffect(() => {
    setComparePopoverOpen(false);
    setCompareWith("None");
    setCompareCount("1");
    setCompareLatestToOldest(false);
  }, [resolvedReportId]);

  useEffect(() => {
    let cancelled = false;

    const loadPreview = async () => {
      setLivePreviewLoading(true);
      try {
        const nextPreview = await buildDatabasePreview(resolvedReportId, reportDisplayName, category.name, agingBy);
        if (!cancelled) {
          const useCustomSubtitle = Boolean(customReport) && !isAgingReport;
          setLivePreview(
            nextPreview && customReport
              ? {
                  ...nextPreview,
                  title: reportDisplayName,
                  subtitle: nextPreview.subtitle || (useCustomSubtitle ? `Custom report based on ${customReport.sourceReportName}` : ""),
                }
              : nextPreview
          );
          setVisibleColumns(customReport?.selectedColumns?.length ? customReport.selectedColumns : nextPreview?.columns ?? []);
        }
      } finally {
        if (!cancelled) {
          setLivePreviewLoading(false);
        }
      }
    };

    setLivePreview(null);
    setVisibleColumns(customReport?.selectedColumns?.length ? customReport.selectedColumns : []);
    void loadPreview();

      return () => {
        cancelled = true;
      };
  }, [agingBy, category.name, customReport, reportDisplayName, resolvedReportId]);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(event.target as Node)) {
        setActiveFilterDropdown(null);
        setMoreFiltersOpen(false);
        setOpenMoreFilterFieldRowId(null);
        setOpenMoreFilterComparatorRowId(null);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setActiveFilterDropdown(null);
        setMoreFiltersOpen(false);
        setScheduleModalOpen(false);
        setComparePopoverOpen(false);
        setOpenMoreFilterFieldRowId(null);
        setOpenMoreFilterComparatorRowId(null);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const filteredCategories = useMemo(() => {
    const q = reportsMenuSearch.trim().toLowerCase();
    if (!q) return REPORT_CATEGORIES;
    return REPORT_CATEGORIES.filter((item) => {
      const categoryMatches = item.name.toLowerCase().includes(q);
      const reportMatches = REPORTS.some(
        (report) => report.categoryId === item.id && report.name.toLowerCase().includes(q)
      );
      const customMatches = savedCustomReports.some(
        (report) => report.categoryId === item.id && report.name.toLowerCase().includes(q)
      );
      return categoryMatches || reportMatches || customMatches;
    });
  }, [reportsMenuSearch, savedCustomReports]);

  const reportsByCategory = useMemo(() => {
    return REPORT_CATEGORIES.reduce((acc, categoryItem) => {
      const customRows: ReportMenuItem[] = savedCustomReports
        .filter((item) => item.categoryId === categoryItem.id)
        .map((item) => ({
          id: item.id,
          categoryId: item.categoryId,
          name: item.name,
          sourceReportId: item.sourceReportId,
          sourceReportName: item.sourceReportName,
          isCustom: true,
        }));

      acc[categoryItem.id] = [
        ...REPORTS.filter((report) => report.categoryId === categoryItem.id),
        ...customRows,
      ];
      return acc;
    }, {} as Record<string, ReportMenuItem[]>);
  }, [savedCustomReports]);

  if (!resolvedCategoryId || !reportId || !category || (!report && !customReport)) {
    return <Navigate to="/reports" replace />;
  }

  const preview = livePreview;
  const closeTarget = resolvedCategoryId ? `/reports/${resolvedCategoryId}` : "/reports";
  const isDateRangeOpen = activeFilterDropdown === "date-range";
  const isEntitiesOpen = activeFilterDropdown === "entities";
  const isMoreFiltersOpen = moreFiltersOpen;
  const filteredEntityOptions = entityOptions.filter((entity) => entity.toLowerCase().includes(entitySearch.trim().toLowerCase()));
  const selectedEntityLabel = useMemo(() => {
    if (selectedEntities.length === 0) return "None";
    if (selectedEntities.length === entityOptions.length) return "All";
    if (selectedEntities.length <= 2) return selectedEntities.join(", ");
    return `${selectedEntities.slice(0, 2).join(", ")} +${selectedEntities.length - 2}`;
  }, [entityOptions.length, selectedEntities]);

  useEffect(() => {
    if (preview && visibleColumns.length === 0) {
      setVisibleColumns(preview.columns);
    }
  }, [preview, visibleColumns.length]);

  const previewColumns = preview?.columns ?? [];
  const previewRows = preview?.rows ?? [];
  const previewTotals = preview?.totals;
  const effectiveVisibleColumns = visibleColumns.length > 0 ? visibleColumns : previewColumns;
  const previewColumnIndexMap = useMemo(() => {
    const map = new Map<string, number>();
    previewColumns.forEach((column, index) => {
      map.set(column, index);
    });
    return map;
  }, [previewColumns]);

  const getPreviewCell = (row: CellValue[] | undefined, column: string) => {
    const index = previewColumnIndexMap.get(column);
    if (index === undefined) {
      return "-";
    }
    return row?.[index] ?? "-";
  };

  const visiblePreviewColumns = effectiveVisibleColumns;
  const visiblePreviewRows = previewRows;
  const visiblePreviewTotals = previewTotals;

  return (
    <div className="relative flex h-full min-h-0 flex-col gap-3 overflow-hidden">
      {reportsMenuOpen ? (
        <div className="absolute inset-0 z-40">
          <button
            type="button"
            className="absolute inset-0 bg-black/10"
            aria-label="Close reports menu backdrop"
            onClick={() => setReportsMenuOpen(false)}
          />

          <aside className="absolute left-0 top-0 h-full w-[280px] max-w-[88vw] overflow-hidden border-r border-[#e4e8f0] bg-white shadow-[0_24px_60px_rgba(15,23,42,0.16)]">
            <div className="flex items-center justify-between border-b border-[#edf1f7] px-4 py-4">
              <h2 className="text-[22px] font-semibold text-[#0f172a]">Reports</h2>
              <button
                type="button"
                onClick={() => setReportsMenuOpen(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[#ef4444] hover:bg-[#fef2f2]"
                aria-label="Close reports menu"
              >
                <X size={17} />
              </button>
            </div>

            <div className="px-4 py-4">
              <div className="relative">
                <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#9aa5b7]" />
                <input
                  value={reportsMenuSearch}
                  onChange={(event) => setReportsMenuSearch(event.target.value)}
                  placeholder="Search reports"
                  className="h-10 w-full rounded-[10px] border border-[#d8deea] bg-white pl-9 pr-3 text-sm text-[#334155] outline-none focus:border-[#b9c7e8]"
                />
              </div>

              <p className="mt-6 text-[12px] font-semibold uppercase tracking-[0.14em] text-[#64748b]">All Reports</p>

              <div className="mt-3 max-h-[calc(100vh-170px)] overflow-auto pr-1">
                <div className="space-y-1">
                  {filteredCategories.map((reportCategory) => {
                    const isExpanded = expandedCategoryId === reportCategory.id;
                    const categoryReports = reportsByCategory[reportCategory.id] || [];
                    return (
                      <div key={reportCategory.id} className="space-y-1">
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedCategoryId((prev) => (prev === reportCategory.id ? null : reportCategory.id))
                          }
                          className="flex w-full items-center justify-between rounded-[10px] px-2 py-2 text-[14px] text-[#334155] transition hover:bg-[#f8fafc]"
                        >
                          <span className="flex min-w-0 items-center gap-2">
                            <Folder size={16} className="shrink-0 text-[#a3afc1]" />
                            <span className="truncate">{reportCategory.name.replace(" Reports", "").replace(" and ", " & ")}</span>
                          </span>
                          <ChevronRight
                            size={15}
                            className={`shrink-0 text-[#b0bac9] transition-transform ${isExpanded ? "rotate-90" : ""}`}
                          />
                        </button>

                        {isExpanded ? (
                          <div className="space-y-1 pl-7">
                            {categoryReports
                              .filter((reportItem) => {
                                const q = reportsMenuSearch.trim().toLowerCase();
                                return !q || reportItem.name.toLowerCase().includes(q);
                              })
                              .map((reportItem) => (
                                <Link
                                  key={reportItem.id}
                                  to={`/reports/${reportItem.categoryId}/${reportItem.id}`}
                                  onClick={() => setReportsMenuOpen(false)}
                                  className="block rounded-[8px] px-2 py-1.5 text-[14px] text-[#334155] transition hover:bg-[#f8fafc] hover:text-[#2563eb]"
                                >
                                  {reportItem.name}
                                </Link>
                              ))}

                            {categoryReports.filter((reportItem) => {
                              const q = reportsMenuSearch.trim().toLowerCase();
                              return !q || reportItem.name.toLowerCase().includes(q);
                            }).length === 0 ? (
                              <p className="px-2 py-2 text-sm text-[#64748b]">No reports.</p>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}

                  {filteredCategories.length === 0 ? (
                    <p className="px-2 py-6 text-sm text-[#64748b]">No reports found.</p>
                  ) : null}
                </div>
              </div>
            </div>
          </aside>
        </div>
      ) : null}

      <section className="rounded-[16px] border border-[#d7dce7] bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 px-4 py-3">
          <div className="flex min-w-0 items-start gap-3">
            <button
              type="button"
              onClick={() => setReportsMenuOpen(true)}
              className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-[8px] border border-[#d4d9e4] bg-white text-[#334155] hover:bg-[#f8fafc]"
              aria-label="Toggle report menu"
            >
              <Menu size={17} />
            </button>

            <div className="min-w-0">
              <p className="text-[14px] font-medium leading-none text-[#5a6781]">{category.name.replace(" Reports", "")}</p>
              <h1 className="mt-1 flex flex-wrap items-center gap-2 text-[18px] font-semibold leading-tight text-[#0f172a]">
                <span>{reportDisplayName}</span>
                <span className="text-[#0f172a]">•</span>
                <span className="text-[14px] font-normal text-[#0f172a]">{dateLabel}</span>
              </h1>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setScheduleModalOpen(true)}
              className="inline-flex h-8 w-8 items-center justify-center rounded border border-[#d4d9e4] text-[#156372] hover:bg-[#156372]/10"
              aria-label="Schedule report"
            >
              <Clock3 size={15} />
            </button>
            <button type="button" className="inline-flex h-8 w-8 items-center justify-center rounded border border-[#d4d9e4] text-[#156372] hover:bg-[#156372]/10" aria-label="History">
              <History size={15} />
            </button>
            <button type="button" className="inline-flex h-8 w-8 items-center justify-center rounded border border-[#d4d9e4] text-[#156372] hover:bg-[#156372]/10" aria-label="Share">
              <Share2 size={15} />
            </button>
            <button
              type="button"
              onClick={() => setCustomizeColumnsOpen(true)}
              className="inline-flex h-8 items-center gap-1 rounded border border-[#d4d9e4] bg-white px-3 text-sm font-medium text-[#156372] hover:bg-[#156372]/10"
            >
              <Table2 size={14} />
              Customize Report Columns
              <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#dff1ef] px-1.5 text-[11px] font-semibold text-[#156372]">
                {visiblePreviewColumns.length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => navigate(closeTarget)}
              className="inline-flex h-8 w-8 items-center justify-center rounded border border-[#d4d9e4] text-[#ef4444] hover:bg-[#fef2f2]"
              aria-label="Close report"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        <div ref={filterDropdownRef} className="relative flex flex-wrap items-center gap-2 border-t border-[#e6e9f0] px-4 py-2">
          <span className="inline-flex items-center gap-1 text-sm text-[#334155]">
            <Filter size={14} />
            Filters :
          </span>
          <button
            type="button"
            onClick={() => {
              setDateRangeView("menu");
              setOpenMoreFilterFieldRowId(null);
              setOpenMoreFilterComparatorRowId(null);
              setActiveFilterDropdown((prev) => (prev === "date-range" ? null : "date-range"));
            }}
            className={`inline-flex h-8 items-center gap-1 rounded border px-3 text-sm transition-colors ${
              isDateRangeOpen ? "border-[#156372] bg-white text-[#156372] shadow-sm" : "border-[#cfd6e4] bg-white text-[#334155] hover:border-[#156372] hover:text-[#156372]"
            }`}
          >
            Date Range : <span className="font-medium">{selectedDateRange === "Custom" ? "Custom" : selectedDateRange}</span> <ChevronDown size={14} />
          </button>
          <button
            type="button"
            onClick={() => {
              setOpenMoreFilterFieldRowId(null);
              setOpenMoreFilterComparatorRowId(null);
              setActiveFilterDropdown((prev) => (prev === "entities" ? null : "entities"));
            }}
            className={`inline-flex h-8 items-center gap-1 rounded border px-3 text-sm transition-colors ${
              isEntitiesOpen ? "border-[#156372] bg-[#156372] text-white" : "border-[#cfd6e4] bg-white text-[#334155] hover:border-[#156372] hover:text-[#156372]"
            }`}
          >
            Entities : <span className="font-medium">{selectedEntityLabel}</span> <ChevronDown size={14} />
          </button>
          {isAgingReport ? (
            <label className="inline-flex h-8 items-center gap-2 rounded border border-[#cfd6e4] bg-[#f8fafc] px-3 text-sm text-[#334155]">
              <span>Aging By :</span>
              <select
                value={agingBy}
                onChange={(event) => setAgingBy(event.target.value as AgingByOption)}
                className="bg-transparent outline-none"
              >
                {AGING_BY_OPTIONS.map((option) => (
                  <option key={option.key} value={option.key}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <button
            type="button"
            onClick={() => {
              setMoreFiltersOpen((prev) => !prev);
              setActiveFilterDropdown(null);
              setOpenMoreFilterFieldRowId(null);
              setOpenMoreFilterComparatorRowId(null);
            }}
            className={`inline-flex h-8 items-center gap-1 rounded border px-3 text-sm transition-colors ${
              isMoreFiltersOpen ? "border-[#156372] bg-[#156372] text-white" : "border-[#cfd6e4] bg-white text-[#334155] hover:border-[#156372] hover:text-[#156372]"
            }`}
          >
            <Plus size={14} className={isMoreFiltersOpen ? "text-white" : "text-[#156372]"} /> More Filters
          </button>
          <button
            type="button"
            onClick={() => toast.success(`Report refreshed: ${reportDisplayName}`)}
            className="inline-flex h-8 items-center gap-1 rounded bg-[#156372] px-4 text-sm font-semibold text-white hover:bg-[#0f4f5b]"
          >
            <CalendarDays size={14} /> Run Report <ChevronDown size={14} />
          </button>

          {isDateRangeOpen ? (
            <div
              className={`absolute left-12 top-[calc(100%+8px)] z-30 overflow-hidden rounded-[10px] border border-[#d7dce7] bg-white shadow-[0_10px_30px_rgba(15,23,42,0.18)] ${
                dateRangeView === "custom" ? "flex w-[640px] max-w-[calc(100vw-48px)]" : "w-[150px]"
              }`}
            >
              <div className={`shrink-0 overflow-auto bg-white p-1 ${dateRangeView === "custom" ? "h-[320px] w-[150px] border-r border-[#edf1f7]" : "max-h-[320px] w-full"}`}>
                {DATE_RANGE_PRESETS.map((preset) => {
                  return (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => {
                        setSelectedDateRange(preset);
                        if (preset !== "Custom") {
                          setDateRangeView("menu");
                          setActiveFilterDropdown(null);
                        } else {
                          setDateRangeView("custom");
                        }
                      }}
                      className="flex w-full items-center rounded-[8px] px-3 py-2 text-left text-[14px] text-[#334155] transition-colors hover:bg-[#f3f7f9]"
                    >
                      {preset}
                    </button>
                  );
                })}
              </div>

              {dateRangeView === "custom" ? (
                <div className="flex-1 bg-white p-4">
                  <div className="space-y-4">
                    <div className="flex gap-3">
                      <input
                        type="date"
                        value={customRange.start}
                        onChange={(event) => setCustomRange((prev) => ({ ...prev, start: event.target.value }))}
                        className="h-10 w-full rounded-[8px] border border-[#d8deea] px-3 text-sm outline-none focus:border-[#156372]"
                      />
                      <input
                        type="date"
                        value={customRange.end}
                        onChange={(event) => setCustomRange((prev) => ({ ...prev, end: event.target.value }))}
                        className="h-10 w-full rounded-[8px] border border-[#d8deea] px-3 text-sm outline-none focus:border-[#156372]"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      {[currentMonthStart, nextMonthStart].map((monthDate) => {
                        const monthGrid = monthDate.getMonth() === currentMonthStart.getMonth() ? currentMonthGrid : nextMonthGrid;
                        const monthTitle = `${monthNames[monthDate.getMonth()]} ${monthDate.getFullYear()}`;
                        return (
                          <div key={monthTitle} className="rounded-[10px] border border-[#edf1f7] p-3">
                            <div className="mb-3 flex items-center justify-between text-sm font-medium text-[#334155]">
                              <span>{monthTitle}</span>
                              <span className="text-[#94a3b8]">•</span>
                            </div>
                            <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-[#3b82f6]">
                              {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
                                <span key={`${monthTitle}-${day}`}>{day}</span>
                              ))}
                            </div>
                            <div className="mt-2 grid grid-cols-7 gap-1 text-center text-[12px]">
                              {monthGrid.map((day, index) => {
                                if (!day) {
                                  return <span key={`${monthTitle}-blank-${index}`} className="h-8" />;
                                }

                                const current = new Date(monthDate.getFullYear(), monthDate.getMonth(), day);
                                const isInRange = current >= clampDate(customStart, customStart, customEnd) && current <= clampDate(customEnd, customStart, customEnd);
                                const isStart = toIsoDate(current) === toIsoDate(customStart);
                                const isEnd = toIsoDate(current) === toIsoDate(customEnd);

                                return (
                                  <span
                                    key={`${monthTitle}-${day}`}
                                    className={`flex h-8 items-center justify-center rounded-[6px] ${
                                      isStart || isEnd
                                        ? "bg-[#156372] text-white shadow-sm"
                                        : isInRange
                                          ? "bg-[#d8ece8] text-[#156372]"
                                          : "text-[#334155]"
                                    }`}
                                  >
                                    {day}
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="flex items-center justify-between pt-2 text-sm">
                      <span className="text-[#475569]">
                        {customRange.start || customRange.end ? `${customRange.start} - ${customRange.end}` : ""}
                      </span>
                      <div className="flex items-center gap-2">
                        <button type="button" onClick={() => setActiveFilterDropdown(null)} className="rounded-[8px] px-3 py-1.5 text-[#334155] hover:bg-[#f3f7f9]">
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveFilterDropdown(null)}
                          className="rounded-[8px] bg-[#156372] px-4 py-1.5 font-semibold text-white hover:bg-[#0f4f5b]"
                        >
                          Apply
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          {isEntitiesOpen ? (
            <div className="absolute left-[238px] top-[calc(100%+8px)] z-30 w-[200px] rounded-[10px] border border-[#d7dce7] bg-white p-2 shadow-[0_10px_30px_rgba(15,23,42,0.18)]">
              <div className="relative">
                <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#9aa5b7]" />
                <input
                  value={entitySearch}
                  onChange={(event) => setEntitySearch(event.target.value)}
                  placeholder="Search"
                  className="h-8 w-full rounded-[8px] border border-[#4f8ef7] bg-white pl-8 pr-2 text-[13px] text-[#334155] outline-none ring-1 ring-[#4f8ef7]/20 focus:border-[#4f8ef7]"
                />
              </div>

              <div className="mt-2 max-h-[180px] overflow-auto pr-1">
                {filteredEntityOptions.map((entity) => {
                  const isActive = selectedEntities.includes(entity);
                  return (
                    <button
                      key={entity}
                      type="button"
                      onClick={() => {
                        setSelectedEntities((prev) =>
                          prev.includes(entity) ? prev.filter((item) => item !== entity) : [...prev, entity]
                        );
                      }}
                      className={`flex w-full items-center gap-2 rounded-[6px] px-2 py-2 text-left text-[13px] transition-colors ${
                        isActive ? "bg-[#f3f7f9] text-[#334155]" : "text-[#334155] hover:bg-[#f8fafc]"
                      }`}
                    >
                      <span
                        className={`flex h-4 w-4 items-center justify-center rounded-[4px] border ${
                          isActive ? "border-[#4f8ef7] bg-[#4f8ef7]" : "border-[#cbd5e1] bg-white"
                        }`}
                      >
                        {isActive ? <Check size={11} className="text-white" strokeWidth={3} /> : null}
                      </span>
                      <span className="truncate">{entity}</span>
                    </button>
                  );
                })}
                {filteredEntityOptions.length === 0 ? <p className="px-2 py-2 text-sm text-[#64748b]">No results.</p> : null}
              </div>
            </div>
          ) : null}

          {isMoreFiltersOpen ? (
            <div className="absolute left-0 top-[calc(100%+8px)] z-20 w-full rounded-[10px] border border-[#d7dce7] bg-white shadow-[0_10px_30px_rgba(15,23,42,0.12)]">
              <div className="px-4 py-4">
                <div className="space-y-3">
                  {moreFilterRows.map((row, index) => (
                    <div key={row.id} className="relative flex flex-wrap items-center gap-2">
                      <span className="inline-flex h-8 w-7 items-center justify-center rounded-[8px] border border-[#e1e6f0] bg-[#fafbfe] text-[13px] text-[#64748b]">
                        {index + 1}
                      </span>

                      <div className="relative">
                        <button
                          type="button"
                          onClick={() =>
                            setOpenMoreFilterFieldRowId((prev) => (prev === row.id ? null : row.id))
                          }
                          className={`flex h-9 w-[180px] items-center justify-between rounded-[8px] border px-3 text-left text-[13px] outline-none transition-colors ${
                            openMoreFilterFieldRowId === row.id
                              ? "border-[#156372] bg-white text-[#334155] shadow-[0_0_0_1px_rgba(21,99,114,0.18)]"
                              : "border-[#cfd6e4] bg-white text-[#334155] hover:border-[#156372]"
                          }`}
                        >
                          <span className={`truncate ${row.field ? "text-[#334155]" : "text-[#94a3b8]"}`}>
                            {row.field || "Select a field"}
                          </span>
                          <ChevronDown size={14} className="shrink-0 text-[#94a3b8]" />
                        </button>

                        {openMoreFilterFieldRowId === row.id ? (
                          <div className="absolute left-0 top-[calc(100%+8px)] z-40 w-[290px] overflow-hidden rounded-[10px] border border-[#d7dce7] bg-white shadow-[0_14px_36px_rgba(15,23,42,0.2)]">
                            <div className="max-h-[260px] overflow-auto p-1">
                              {moreFilterFieldGroups.map((group) => (
                                <div key={`${row.id}-${group.label}`} className="mb-1">
                                  <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-[0.12em] text-[#475569]">
                                    {group.label}
                                  </div>
                                  <div className="space-y-1">
                                    {group.items.map((item) => {
                                        const isActive = row.field === item;
                                      return (
                                        <button
                                          key={`${row.id}-${group.label}-${item}`}
                                          type="button"
                                          onClick={() => {
                                            setMoreFilterRows((prev) =>
                                              prev.map((entry) => (entry.id === row.id ? { ...entry, field: item } : entry))
                                            );
                                            setOpenMoreFilterFieldRowId(null);
                                            setOpenMoreFilterComparatorRowId(null);
                                          }}
                                          className={`flex w-full items-center rounded-[6px] px-3 py-2 text-left text-sm transition-colors ${
                                            isActive ? "bg-[#156372] text-white" : "text-[#334155] hover:bg-[#f3f7f9]"
                                          }`}
                                        >
                                          {item}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : null}
                      </div>

                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setOpenMoreFilterComparatorRowId((prev) => (prev === row.id ? null : row.id))}
                          disabled={!row.field}
                          className={`flex h-9 w-[145px] items-center justify-between rounded-[8px] border px-3 text-left text-[13px] outline-none transition-colors ${
                            !row.field
                              ? "cursor-not-allowed border-[#e2e8f0] bg-[#f8fafc] text-[#94a3b8]"
                              : openMoreFilterComparatorRowId === row.id
                                ? "border-[#4f8ef7] bg-white text-[#334155] shadow-[0_0_0_1px_rgba(79,142,247,0.2)]"
                                : row.comparator
                                  ? "border-[#4f8ef7] bg-white text-[#334155]"
                                  : "border-[#cfd6e4] bg-white text-[#334155] hover:border-[#4f8ef7]"
                          }`}
                        >
                          <span className={`truncate ${row.comparator ? "text-[#334155]" : "text-[#94a3b8]"}`}>
                            {row.comparator || "Select a comparator"}
                          </span>
                          <ChevronDown
                            size={14}
                            className={`shrink-0 transition-transform ${
                              openMoreFilterComparatorRowId === row.id ? "rotate-180 text-[#4f8ef7]" : "text-[#94a3b8]"
                            }`}
                          />
                        </button>

                        {openMoreFilterComparatorRowId === row.id && row.field ? (
                          <div className="absolute left-0 top-[calc(100%+8px)] z-40 w-[190px] overflow-hidden rounded-[10px] border border-[#d7dce7] bg-white shadow-[0_14px_36px_rgba(15,23,42,0.2)]">
                            <div className="relative border-b border-[#edf1f7] p-2">
                              <Search size={14} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#9aa5b7]" />
                              <input
                                type="text"
                                placeholder="Search"
                                className="h-9 w-full rounded-[8px] border border-[#4f8ef7] bg-white pl-8 pr-3 text-sm text-[#334155] outline-none ring-1 ring-[#4f8ef7]/20 focus:border-[#4f8ef7]"
                              />
                            </div>
                            <div className="max-h-[180px] overflow-auto p-1">
                              {getMoreFilterComparatorsForField(row.field).map((comparator) => {
                                const isActive = row.comparator === comparator;
                                return (
                                  <button
                                    key={`${row.id}-${comparator}`}
                                    type="button"
                                    onClick={() => {
                                      setMoreFilterRows((prev) =>
                                        prev.map((item) => (item.id === row.id ? { ...item, comparator } : item))
                                      );
                                      setOpenMoreFilterComparatorRowId(null);
                                    }}
                                    className={`flex w-full items-center rounded-[6px] px-3 py-2 text-left text-sm transition-colors ${
                                      isActive ? "bg-[#4f8ef7] text-white" : "text-[#334155] hover:bg-[#f3f7f9]"
                                    }`}
                                  >
                                    {comparator}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ) : null}
                      </div>

                      {getMoreFilterValueKindForField(row.field) === "textarea" ? (
                        <textarea
                          value={row.value}
                          onChange={(event) =>
                            setMoreFilterRows((prev) =>
                              prev.map((item) => (item.id === row.id ? { ...item, value: event.target.value } : item))
                            )
                          }
                          rows={2}
                          placeholder="Enter value"
                          className="min-w-[220px] flex-1 rounded-[8px] border border-[#cfd6e4] bg-white px-3 py-2 text-[13px] text-[#334155] outline-none focus:border-[#156372]"
                        />
                      ) : (
                        <input
                          type={
                            getMoreFilterValueKindForField(row.field) === "number"
                              ? "number"
                              : getMoreFilterValueKindForField(row.field) === "date"
                                ? "date"
                                : getMoreFilterValueKindForField(row.field) === "time"
                                  ? "time"
                                  : "text"
                          }
                          value={row.value}
                          onChange={(event) =>
                            setMoreFilterRows((prev) =>
                              prev.map((item) => (item.id === row.id ? { ...item, value: event.target.value } : item))
                            )
                          }
                          placeholder="Enter value"
                          className="h-9 min-w-[220px] flex-1 rounded-[8px] border border-[#cfd6e4] bg-white px-3 text-[13px] text-[#334155] outline-none focus:border-[#156372]"
                        />
                      )}

                      <button
                        type="button"
                        onClick={() =>
                          setMoreFilterRows((prev) => [
                            ...prev,
                            { id: nextMoreFilterRowId.current++, field: "", comparator: "", value: "" },
                          ])
                        }
                        className="inline-flex h-9 w-9 items-center justify-center rounded-[8px] text-[#64748b] hover:bg-[#f3f7f9] hover:text-[#156372]"
                        aria-label="Add filter row"
                      >
                        <Plus size={16} />
                      </button>

                      <button
                        type="button"
                        onClick={() => setMoreFilterRows((prev) => prev.filter((item) => item.id !== row.id))}
                        disabled={moreFilterRows.length === 1}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-[8px] text-[#64748b] hover:bg-[#f3f7f9] hover:text-[#ef4444] disabled:cursor-not-allowed disabled:opacity-40"
                        aria-label="Remove filter row"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setMoreFilterRows((prev) => [
                      ...prev,
                      { id: nextMoreFilterRowId.current++, field: "", comparator: "", value: "" },
                    ])
                  }
                  className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-[#156372] hover:text-[#0f4f5b]"
                >
                  <Plus size={14} /> Add More
                </button>
              </div>

              <div className="flex items-center gap-3 border-t border-[#edf1f7] px-4 py-3">
                <button
                  type="button"
                  onClick={() => {
                    toast.success(`Report refreshed: ${reportDisplayName}`);
                    setMoreFiltersOpen(false);
                  }}
                  className="inline-flex h-8 items-center rounded bg-[#156372] px-4 text-sm font-semibold text-white hover:bg-[#0f4f5b]"
                >
                  Run Report
                </button>
                <button
                  type="button"
                  onClick={() => setMoreFiltersOpen(false)}
                  className="inline-flex h-8 items-center rounded border border-[#d4d9e4] bg-white px-4 text-sm text-[#334155] hover:bg-[#f8fafc]"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </section>

      <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[16px] border border-[#d7dce7] bg-white shadow-sm">
        <div className="flex items-center justify-end gap-3 border-b border-[#e6e9f0] px-4 py-2 text-sm text-[#334155]">
          <button
            ref={compareButtonRef}
            type="button"
            onClick={() => {
              setActiveFilterDropdown(null);
              setMoreFiltersOpen(false);
              setComparePopoverOpen((current) => !current);
            }}
            className={`inline-flex items-center gap-1 rounded px-2 py-1 text-[#156372] hover:bg-[#156372]/10 ${comparePopoverOpen ? "bg-[#f2fbfa]" : ""}`}
          >
            Compare With : <span className="font-medium">{compareWith}</span>{" "}
            <ChevronDown size={14} className={`transition-transform ${comparePopoverOpen ? "rotate-180" : ""}`} />
          </button>
          <span className="h-5 w-px bg-[#d8deea]" />
          <button
            type="button"
            onClick={() => setCustomizeColumnsOpen(true)}
            className="inline-flex items-center gap-1 rounded px-2 py-1 text-[#156372] hover:bg-[#156372]/10"
          >
            <Table2 size={14} />
            Customize Report Columns{" "}
            <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#dff1ef] px-1.5 text-[11px] font-semibold text-[#156372]">
              {visiblePreviewColumns.length}
            </span>
          </button>
        </div>

        <div className="flex-1 overflow-auto px-4 py-4">
          {livePreviewLoading ? (
            <div className="mx-auto max-w-5xl">
              <div className="animate-pulse text-center">
                <div className="mx-auto h-6 w-56 rounded bg-slate-200" />
                <div className="mx-auto mt-3 h-4 w-40 rounded bg-slate-100" />
              </div>

              <div className="mt-6 overflow-hidden rounded-[12px] border border-[#e8edf5] bg-white">
                <div className="border-b border-[#e8edf5] bg-[#fafbfe] px-4 py-3">
                  <div className="grid grid-cols-4 gap-3">
                    {Array.from({ length: 4 }).map((_, index) => (
                      <div key={`skeleton-head-${index}`} className="h-3 rounded bg-slate-200/80" />
                    ))}
                  </div>
                </div>
                <div className="space-y-0">
                  {Array.from({ length: 8 }).map((_, rowIndex) => (
                    <div key={`skeleton-row-${rowIndex}`} className="grid grid-cols-4 gap-3 border-b border-[#edf1f7] px-4 py-4">
                      {Array.from({ length: 4 }).map((__, cellIndex) => (
                        <div
                          key={`skeleton-cell-${rowIndex}-${cellIndex}`}
                          className={`h-3 rounded bg-slate-100 ${cellIndex === 0 ? "w-3/4" : "w-11/12"}`}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : preview ? (
            <>
              <div className="mx-auto max-w-5xl text-center">
                <h2 className="mt-1 text-[22px] font-semibold text-[#0f172a]">{preview.title}</h2>
                <p className="mt-1 text-sm text-[#475569]">{preview.subtitle || dateLabel}</p>
              </div>

              <div className="mt-6 overflow-hidden rounded-[12px] border border-[#e8edf5]">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-[#e8edf5] bg-[#fafbfe]">
                      {visiblePreviewColumns.map((column) => (
                        <th key={column} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-[#64748b]">
                          {column}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {visiblePreviewRows.map((row, rowIndex) => (
                      <tr key={`${preview.title}-${rowIndex}`} className="border-b border-[#edf1f7] hover:bg-[#fcfdff]">
                        {visiblePreviewColumns.map((column, cellIndex) => {
                          const cell = getPreviewCell(row, column);
                          return (
                            <td
                              key={`${rowIndex}-${cellIndex}`}
                              className={`px-4 py-3 text-[14px] ${cellIndex === 0 ? "text-[#2563eb]" : "text-[#334155]"}`}
                            >
                              {cell === "-" ? "-" : renderCell(cell)}
                            </td>
                          );
                        })}
                      </tr>
                    ))}

                    {visiblePreviewTotals ? (
                      <tr className="border-b border-[#edf1f7] bg-white">
                        {visiblePreviewColumns.map((column, cellIndex) => {
                          const cell = getPreviewCell(visiblePreviewTotals, column);
                          return (
                            <td
                              key={`total-${cellIndex}`}
                              className={`px-4 py-3 text-[14px] ${cellIndex === 0 ? "font-medium text-[#0f172a]" : "text-[#0f172a]"}`}
                            >
                              {cellIndex === 0 || cell === "-" ? cell : renderCell(cell)}
                            </td>
                          );
                        })}
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="mx-auto max-w-5xl">
              <div className="rounded-[12px] border border-dashed border-[#dbe3ef] bg-[#fbfcfe] px-6 py-10 text-center">
                <h2 className="text-[20px] font-semibold text-[#0f172a]">No live data available yet</h2>
                <p className="mt-2 text-sm text-[#64748b]">
                  This report will show real database data once the query returns rows for the selected report.
                </p>
              </div>
            </div>
          )}
        </div>
      </section>

      <ScheduleReportModal open={scheduleModalOpen} reportName={reportDisplayName} onClose={() => setScheduleModalOpen(false)} />
      <ReportCustomizeColumnsModal
        open={customizeColumnsOpen}
        reportName={reportDisplayName}
        availableGroups={reportColumnGroups}
        selectedColumns={effectiveVisibleColumns}
        onClose={() => setCustomizeColumnsOpen(false)}
        onSave={(nextVisibleColumns) => {
          setVisibleColumns(nextVisibleColumns);
          setCustomizeColumnsOpen(false);
        }}
      />
      <ReportCompareWithPopover
        open={comparePopoverOpen}
        anchorRef={compareButtonRef}
        value={compareWith}
        count={compareCount}
        latestToOldest={compareLatestToOldest}
        onClose={() => setComparePopoverOpen(false)}
        onApply={({ compareWith: nextCompareWith, compareCount: nextCompareCount, compareLatestToOldest: nextLatestToOldest }) => {
          setCompareWith(nextCompareWith);
          setCompareCount(nextCompareCount);
          setCompareLatestToOldest(nextLatestToOldest);
          setComparePopoverOpen(false);
        }}
      />
    </div>
  );
}
