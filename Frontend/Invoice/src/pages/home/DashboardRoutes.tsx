import React, { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Navigate, Route, Routes, Link } from "react-router-dom";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Banknote,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  FileText,
  LayoutDashboard,
  ChevronRight,
  ShieldAlert,
  TrendingUp,
} from "lucide-react";
import Card from "../../components/ui/Card";
import AccessDenied from "../../components/AccessDenied";
import { useUser } from "../../lib/auth/UserContext";
import { usePermissions } from "../../hooks/usePermissions";
import { useCurrency } from "../../hooks/useCurrency";
import { useSettings } from "../../lib/settings/SettingsContext";
import { dashboardAPI, expensesAPI, invoicesAPI, paymentsReceivedAPI, subscriptionsAPI } from "../../services/api";

function asRows(res: any) {
  if (!res) return [];
  if (Array.isArray(res.data)) return res.data;
  if (Array.isArray(res.invoices)) return res.invoices;
  if (Array.isArray(res.payments_received)) return res.payments_received;
  if (Array.isArray(res.expenses)) return res.expenses;
  if (res.data && Array.isArray(res.data.data)) return res.data.data;
  return [];
}

function n(value: any, fallback = 0) {
  const parsed = Number(String(value ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function d(value: any) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function money(value: any, currency = "", symbol = "") {
  const amount = n(value);
  const displaySymbol = String(symbol || "").trim();
  const isCodeLikeSymbol = /^[A-Za-z]{3}$/.test(displaySymbol);
  const code = String(currency || "").trim().toUpperCase();
  if (displaySymbol && !isCodeLikeSymbol) {
    return `${displaySymbol}${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  if (code.length === 3) {
    try {
      return new Intl.NumberFormat("en-US", { style: "currency", currency: code, maximumFractionDigits: 2 }).format(amount);
    } catch {
      return `${(displaySymbol || code)} ${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
  }
  if (displaySymbol) {
    return `${displaySymbol} ${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function compactMoney(value: any, currency = "", symbol = "") {
  const amount = n(value);
  const displaySymbol = String(symbol || "").trim();
  const isCodeLikeSymbol = /^[A-Za-z]{3}$/.test(displaySymbol);
  const code = String(currency || "").trim().toUpperCase();
  if (displaySymbol && !isCodeLikeSymbol) {
    return `${displaySymbol}${amount.toLocaleString("en-US", { notation: "compact", maximumFractionDigits: 1 })}`;
  }
  if (code.length === 3) {
    try {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: code,
        notation: "compact",
        maximumFractionDigits: 1,
      }).format(amount);
    } catch {
      return money(amount, code, displaySymbol);
    }
  }
  if (displaySymbol) {
    return `${displaySymbol} ${amount.toLocaleString("en-US", { notation: "compact", maximumFractionDigits: 1 })}`;
  }
  return amount.toLocaleString("en-US", { notation: "compact", maximumFractionDigits: 1 });
}

const DASHBOARD_SUMMARY_CACHE_KEY = "taban_invoice_dashboard_summary";
const DASHBOARD_INVOICES_CACHE_KEY = "taban_invoice_dashboard_invoices";
const DASHBOARD_PAYMENTS_CACHE_KEY = "taban_invoice_dashboard_payments";
const DASHBOARD_EXPENSES_CACHE_KEY = "taban_invoice_dashboard_expenses";
const DASHBOARD_SUBSCRIPTIONS_CACHE_KEY = "taban_invoice_dashboard_subscriptions";

const dashboardCacheKey = (baseKey: string, organizationId: string) =>
  `${baseKey}:${String(organizationId || "global").trim() || "global"}`;

type SummaryCacheEnvelope = {
  version_id: string;
  last_updated: string;
  payload: any;
};

function readCachedSummaryEnvelope(organizationId = "") {
  try {
    const raw = localStorage.getItem(dashboardCacheKey(DASHBOARD_SUMMARY_CACHE_KEY, organizationId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && "payload" in parsed) {
      return {
        version_id: String((parsed as any).version_id || ""),
        last_updated: String((parsed as any).last_updated || ""),
        payload: (parsed as any).payload,
      } as SummaryCacheEnvelope;
    }
    return parsed && typeof parsed === "object"
      ? ({
          version_id: String((parsed as any).version_id || ""),
          last_updated: String((parsed as any).last_updated || ""),
          payload: parsed,
        } as SummaryCacheEnvelope)
      : null;
  } catch {
    return null;
  }
}

function readCachedSummary(organizationId = "") {
  return readCachedSummaryEnvelope(organizationId)?.payload || null;
}

function writeCachedSummary(summary: any, organizationId = "", meta?: { version_id?: string; last_updated?: string }) {
  try {
    const envelope: SummaryCacheEnvelope = {
      version_id: String(meta?.version_id || summary?.version_id || ""),
      last_updated: String(meta?.last_updated || summary?.last_updated || new Date().toISOString()),
      payload: summary,
    };
    localStorage.setItem(dashboardCacheKey(DASHBOARD_SUMMARY_CACHE_KEY, organizationId), JSON.stringify(envelope));
  } catch {
    // Ignore non-critical cache failures.
  }
}

function readCachedRows(cacheKey: string, organizationId = "") {
  try {
    const raw = localStorage.getItem(dashboardCacheKey(cacheKey, organizationId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeCachedRows(cacheKey: string, rows: any[], organizationId = "") {
  try {
    localStorage.setItem(dashboardCacheKey(cacheKey, organizationId), JSON.stringify(Array.isArray(rows) ? rows : []));
  } catch {
    // Ignore non-critical cache failures.
  }
}

function readStoredOrganizationProfile() {
  try {
    const raw = localStorage.getItem("organization_profile");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabelLine(date: Date) {
  const label = new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric" }).format(date);
  const [month, year] = label.split(" ");
  return `${month}\n${year}`;
}

function buildMonthBuckets(months = 12) {
  const currentMonth = startOfMonth(new Date());
  const start = addMonths(currentMonth, -(months - 1));
  return Array.from({ length: months }, (_, index) => {
    const monthStart = addMonths(start, index);
    return {
      key: monthKey(monthStart),
      label: monthLabelLine(monthStart),
      start: monthStart,
      end: addMonths(monthStart, 1),
    };
  });
}

function toMonthlySeries(
  rows: any[],
  buckets: Array<{ start: Date; end: Date }>,
  getDate: (row: any) => Date | null,
  getValue: (row: any) => number,
) {
  const values = new Array(buckets.length).fill(0);
  const bucketStart = buckets[0]?.start;
  const bucketEnd = buckets[buckets.length - 1]?.end;
  if (!bucketStart || !bucketEnd) return values;

  for (const row of rows || []) {
    const date = getDate(row);
    if (!date || date < bucketStart || date >= bucketEnd) continue;
    const index = (date.getFullYear() - bucketStart.getFullYear()) * 12 + (date.getMonth() - bucketStart.getMonth());
    if (index < 0 || index >= values.length) continue;
    values[index] += getValue(row);
  }

  return values;
}

function buildDashboardSummaryFromRows({
  invoices,
  payments,
  expenses,
  subscriptions,
  organizationName,
  baseCurrency,
}: {
  invoices: any[];
  payments: any[];
  expenses: any[];
  subscriptions: any[];
  organizationName: string;
  baseCurrency: string;
}) {
  const months = buildMonthBuckets(12);
  const invoicePayments = new Map<string, number>();
  for (const payment of payments || []) {
    const amount = paymentTotal(payment);
    const key = String(payment?.invoiceId || payment?.invoiceNumber || "").trim();
    if (!key) continue;
    invoicePayments.set(key, (invoicePayments.get(key) || 0) + amount);
  }

  const openInvoices = (invoices || []).filter((row) => !isDraftInvoice(row) && !isVoidInvoice(row));
  const totalIncome = (invoices || []).reduce((sum, row) => sum + invoiceTotal(row), 0);
  const totalReceipts = (payments || []).reduce((sum, row) => sum + paymentTotal(row), 0);
  const totalExpenses = (expenses || []).reduce((sum, row) => sum + expenseTotal(row), 0);
  const netRevenue = totalIncome - totalExpenses;

  let receivableTotal = 0;
  let receivableCurrent = 0;
  let receivableOverdue = 0;
  let receivableCurrentCount = 0;
  let receivableOverdueCount = 0;

  for (const invoice of openInvoices) {
    const invoiceId = String(invoice?._id || invoice?.id || "").trim();
    const invoiceNumber = String(invoice?.invoiceNumber || "").trim();
    const total = invoiceTotal(invoice);
    const paid = (invoicePayments.get(invoiceId) || 0) + (invoicePayments.get(invoiceNumber) || 0);
    const outstanding = Math.max(0, total - paid);
    if (!outstanding) continue;

    receivableTotal += outstanding;
    const due = d(invoice?.dueDate);
    if (due && due.getTime() < Date.now()) {
      receivableOverdue += outstanding;
      receivableOverdueCount += 1;
    } else {
      receivableCurrent += outstanding;
      receivableCurrentCount += 1;
    }
  }

  const activeSubscriptions = (subscriptions || []).filter((row) => !["cancelled", "canceled", "inactive", "expired", "draft"].includes(String(row?.status || "").trim().toLowerCase()));
  const cancelledSubscriptions = (subscriptions || []).filter((row) => ["cancelled", "canceled", "inactive", "expired"].includes(String(row?.status || "").trim().toLowerCase()));
  const activeCustomersCount = Math.max(1, new Set((invoices || []).map((row) => String(row?.customerId || row?.customer || "").trim()).filter(Boolean)).size);

  const netRevenueSeries = toMonthlySeries(invoices || [], months, (row) => d(row?.date || row?.createdAt), (row) => invoiceTotal(row));
  const receiptSeries = toMonthlySeries(payments || [], months, (row) => d(row?.date || row?.createdAt), (row) => paymentTotal(row));
  const expenseSeries = toMonthlySeries(expenses || [], months, (row) => d(row?.date || row?.createdAt), (row) => expenseTotal(row));
  const activeSubscriptionSeries = months.map((bucket) =>
    (subscriptions || []).filter((row) => {
      const createdAt = d(row?.createdAt || row?.startDate);
      if (!createdAt || createdAt >= bucket.end) return false;
      return !["cancelled", "canceled", "inactive", "expired", "draft"].includes(String(row?.status || "").trim().toLowerCase());
    }).length
  );
  const mrrSeries = months.map((bucket) =>
    (subscriptions || []).reduce((sum, row) => {
      const createdAt = d(row?.createdAt || row?.startDate);
      if (!createdAt || createdAt >= bucket.end) return sum;
      if (["cancelled", "canceled", "inactive", "expired", "draft"].includes(String(row?.status || "").trim().toLowerCase())) return sum;
      return sum + n(row?.monthlyAmount ?? row?.mrr ?? row?.amount ?? row?.total ?? row?.price ?? row?.billingAmount ?? row?.recurringAmount ?? row?.chargeAmount ?? row?.rate, 0);
    }, 0)
  );
  const arpuSeries = months.map((_, index) => {
    const subs = activeSubscriptionSeries[index] || 0;
    return subs > 0 ? receiptSeries.slice(0, index + 1).reduce((sum, value) => sum + value, 0) / subs : 0;
  });
  const ltvSeries = months.map((_, index) => {
    return netRevenueSeries.slice(0, index + 1).reduce((sum, value) => sum + value, 0) / activeCustomersCount;
  });
  const churnSeries = months.map((_, index) => {
    const active = Math.max(activeSubscriptionSeries[index] || 0, 1);
    return ((cancelledSubscriptions.length || 0) / active) * 100;
  });
  const mrr = activeSubscriptions.reduce((sum, row) => sum + n(row?.monthlyAmount ?? row?.mrr ?? row?.amount ?? row?.total ?? row?.price ?? row?.billingAmount ?? row?.recurringAmount ?? row?.chargeAmount ?? row?.rate, 0), 0);
  const totalSubscriptions = subscriptions.length;
  const activeCount = activeSubscriptions.length;
  const cancelledCount = cancelledSubscriptions.length;
  const churnRate = totalSubscriptions > 0 ? (cancelledCount / totalSubscriptions) * 100 : 0;
  const arpu = activeCount > 0 ? totalIncome / activeCount : 0;
  const ltv = activeCustomersCount > 0 ? totalIncome / activeCustomersCount : 0;

  const expenseGroups = new Map<string, number>();
  for (const row of expenses || []) {
    const label = String(row?.accountName || row?.vendorName || row?.customerName || "Uncategorized").trim() || "Uncategorized";
    expenseGroups.set(label, (expenseGroups.get(label) || 0) + expenseTotal(row));
  }
  const topExpenseItems = [...expenseGroups.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  return {
    metrics: {
      netRevenue: { total: netRevenue, labels: months.map((bucket) => bucket.label), values: netRevenueSeries },
      receivables: {
        total: receivableTotal,
        current: receivableCurrent,
        overdue: receivableOverdue,
        currentCount: receivableCurrentCount,
        overdueCount: receivableOverdueCount,
        labels: ["Current", "1-15", "15-30", "31-45", ">45"],
        values: [receivableCurrent, receivableOverdue, 0, 0, 0],
      },
      mrr: { total: mrr, labels: months.map((bucket) => bucket.label), values: mrrSeries },
      activeSubscriptions: { total: activeCount, labels: months.map((bucket) => bucket.label), values: activeSubscriptionSeries },
      churnRate: { total: churnRate, asOf: new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric" }).format(new Date()), labels: months.map((bucket) => bucket.label), values: churnSeries },
      arpu: { total: arpu, labels: months.map((bucket) => bucket.label), values: arpuSeries },
      ltv: { total: ltv, asOf: new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric" }).format(new Date()), labels: months.map((bucket) => bucket.label), values: ltvSeries },
    },
    incomeExpense: {
      totalIncome,
      totalReceipts,
      totalExpenses,
      labels: months.map((bucket) => bucket.label),
      income: netRevenueSeries,
      receipts: receiptSeries,
      expenses: expenseSeries,
    },
    topExpenses: {
      total: totalExpenses,
      items: topExpenseItems,
    },
    organization: {
      name: organizationName,
      baseCurrency,
    },
    version_id: "",
    last_updated: new Date().toISOString(),
    generatedAt: new Date().toISOString(),
  };
}

function AnimatedMoney({ value, currency, symbol }: { value: number; currency: string; symbol?: string }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const target = Number.isFinite(value) ? value : 0;
    const duration = 1600;
    let frame = 0;
    const startedAt = performance.now();

    setDisplayValue(0);

    const animate = (now: number) => {
      const progress = Math.min((now - startedAt) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(target * eased);
      if (progress < 1) {
        frame = requestAnimationFrame(animate);
      }
    };

    frame = requestAnimationFrame(animate);
    return () => window.cancelAnimationFrame(frame);
  }, [value]);

  return <>{money(displayValue, currency, symbol)}</>;
}

function shortDate(value: any) {
  const date = d(value);
  if (!date) return "Today";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "2-digit" }).format(date);
}

function pctChange(values: number[]) {
  if (!values || values.length < 2) return 0;
  const last = n(values[values.length - 1]);
  const prev = n(values[values.length - 2]);
  if (!prev) return last > 0 ? 100 : 0;
  return ((last - prev) / Math.abs(prev)) * 100;
}

function customerLabel(row: any) {
  return String(row?.customerName || row?.customer?.name || row?.customer?.displayName || row?.customer?.companyName || "Customer").trim();
}

function invoiceTotal(row: any) {
  return n(row?.total ?? row?.amount ?? row?.balanceDue ?? 0);
}

function paymentTotal(row: any) {
  return n(row?.amount ?? 0);
}

function expenseTotal(row: any) {
  return n(row?.amount ?? 0);
}

function isDraftInvoice(row: any) {
  return String(row?.status || "").trim().toLowerCase().includes("draft");
}

function isVoidInvoice(row: any) {
  return ["void", "cancelled", "canceled"].includes(String(row?.status || "").trim().toLowerCase());
}

function isOverdueInvoice(row: any) {
  const due = d(row?.dueDate);
  return !isDraftInvoice(row) && !isVoidInvoice(row) && Boolean(due && due.getTime() < Date.now());
}

function PeriodPill({ active, children, onClick }: { active?: boolean; children: React.ReactNode; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl px-4 py-2 text-[13px] font-semibold transition ${active ? "bg-slate-900 text-white shadow-sm" : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"}`}
    >
      {children}
    </button>
  );
}

function Badge({ tone = "slate", children }: { tone?: "slate" | "blue" | "emerald" | "amber" | "rose"; children: React.ReactNode }) {
  const map = {
    slate: "bg-slate-100 text-slate-600",
    blue: "bg-blue-100 text-blue-700",
    emerald: "bg-emerald-100 text-emerald-700",
    amber: "bg-amber-100 text-amber-700",
    rose: "bg-rose-100 text-rose-700",
  } as const;
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${map[tone]}`}>{children}</span>;
}

function StatCard({
  title,
  amount,
  currency,
  currencySymbol,
  subtitle,
  icon: Icon,
  delta,
  up = true,
  ready = false,
  tone = "slate",
}: {
  title: string;
  amount: number;
  currency: string;
  currencySymbol?: string;
  subtitle: string;
  icon?: React.ElementType;
  delta?: string;
  up?: boolean;
  ready?: boolean;
  tone?: "blue" | "slate" | "emerald" | "violet" | "rose";
}) {
  const toneMap = {
    blue: "border-blue-100 bg-gradient-to-br from-blue-50 to-white",
    slate: "border-slate-200 bg-gradient-to-br from-slate-50 to-white",
    emerald: "border-emerald-100 bg-gradient-to-br from-emerald-50 to-white",
    violet: "border-violet-100 bg-gradient-to-br from-violet-50 to-white",
    rose: "border-rose-100 bg-gradient-to-br from-rose-50 to-white",
  } as const;

  return (
    <Card className={`${toneMap[tone]} border p-0 shadow-sm`}>
      <div className="flex h-full flex-col justify-between p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{title}</div>
          {Icon ? (
            <div className={`rounded-full p-2 ${tone === "rose" ? "bg-rose-100 text-rose-600" : tone === "emerald" ? "bg-emerald-100 text-emerald-600" : tone === "violet" ? "bg-violet-100 text-violet-600" : tone === "blue" ? "bg-blue-100 text-blue-600" : "bg-slate-100 text-slate-600"}`}>
              <Icon size={14} />
            </div>
          ) : null}
        </div>
        <div className="mt-4">
          <div className="text-[26px] font-semibold tracking-tight text-slate-900 sm:text-[30px]">
            {ready ? <AnimatedMoney value={amount} currency={currency} symbol={currencySymbol} /> : <span className="text-slate-300">--</span>}
          </div>
          <div className="mt-1 text-[12px] text-slate-500">{subtitle}</div>
        </div>
        <div className="mt-4">
          {delta ? (
            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-semibold ${up ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
              {up ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
              {delta}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[12px] font-semibold text-slate-600">
              <CheckCircle2 size={14} />
              Live from database
            </span>
          )}
        </div>
      </div>
    </Card>
  );
}

function SectionCard({ title, subtitle, action, children }: { title: string; subtitle?: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <Card className="overflow-hidden border-slate-200 shadow-sm">
      <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
        <div>
          <h3 className="text-[15px] font-semibold text-slate-900">{title}</h3>
          {subtitle ? <p className="mt-1 text-[12px] text-slate-500">{subtitle}</p> : null}
        </div>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </Card>
  );
}

function RevenueChart({ labels, invoiced, collected, currency, currencySymbol }: { labels: string[]; invoiced: number[]; collected: number[]; currency: string; currencySymbol?: string }) {
  const [ready, setReady] = useState(false);
  const signature = `${labels.join("|")}::${invoiced.join(",")}::${collected.join(",")}`;
  const invoicedColor = "#2563eb";
  const collectedColor = "#cbd5e1";

  useEffect(() => {
    setReady(false);
    const frame = window.requestAnimationFrame(() => setReady(true));
    return () => window.cancelAnimationFrame(frame);
  }, [signature]);

  const max = Math.max(...invoiced, ...collected, 1);
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-4 text-[12px] text-slate-500">
        <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: invoicedColor }} />Invoiced</span>
        <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: collectedColor }} />Collected</span>
      </div>
      <div className="grid grid-cols-12 gap-2 sm:gap-3">
        {labels.map((label, index) => {
          const inv = Math.max((invoiced[index] || 0) / max, 0.05) * 210;
          const col = Math.max((collected[index] || 0) / max, 0.05) * 210;
          const invDelay = `${index * 70}ms`;
          const colDelay = `${index * 70 + 90}ms`;
          return (
            <div key={`${label}-${index}`} className="flex flex-col items-center gap-2">
              <div className="flex h-[230px] items-end gap-1.5">
                <div
                  className="w-4 origin-bottom rounded-full shadow-sm transition-transform duration-700 ease-out sm:w-6"
                  style={{
                    height: `${inv}px`,
                    backgroundColor: invoicedColor,
                    transform: `scaleY(${ready ? 1 : 0})`,
                    transitionDelay: invDelay,
                  }}
                  title={money(invoiced[index] || 0, currency, currencySymbol)}
                />
                <div
                  className="w-4 origin-bottom rounded-full shadow-sm transition-transform duration-700 ease-out sm:w-6"
                  style={{
                    height: `${col}px`,
                    backgroundColor: collectedColor,
                    transform: `scaleY(${ready ? 1 : 0})`,
                    transitionDelay: colDelay,
                  }}
                  title={money(collected[index] || 0, currency, currencySymbol)}
                />
              </div>
              <div className="text-[10px] uppercase tracking-[0.14em] text-slate-400">{label}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ExpenseDonut({ items, total, currency, currencySymbol }: { items: Array<{ label: string; value: number }>; total: number; currency: string; currencySymbol?: string }) {
  const [ready, setReady] = useState(false);
  const colors = ["#2563eb", "#22c55e", "#f59e0b", "#7c3aed", "#ef4444"];
  const top = items.slice(0, 5).filter((item) => n(item.value) > 0);
  const sum = Math.max(total, 0);
  const parts = top.map((item, index) => ({
    ...item,
    color: colors[index % colors.length],
    value: n(item.value),
  }));
  const signature = `${sum}::${parts.map((part) => `${part.label}:${part.value}`).join("|")}`;

  useEffect(() => {
    setReady(false);
    const frame = window.requestAnimationFrame(() => setReady(true));
    return () => window.cancelAnimationFrame(frame);
  }, [signature]);

  const gradient =
    parts.length > 0
      ? `conic-gradient(from 270deg, ${parts
          .map((part, index) => {
            const start = parts.slice(0, index).reduce((acc, cur) => acc + (sum > 0 ? (cur.value / sum) * 100 : 0), 0);
            const end = start + (sum > 0 ? (part.value / sum) * 100 : 0);
            return `${part.color} ${start}% ${end}%`;
          })
          .join(", ")})`
      : "conic-gradient(#e2e8f0 0% 100%)";

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-center">
      <div className="relative flex h-48 w-48 shrink-0 items-center justify-center">
        <div className="absolute inset-0 rounded-full" style={{ background: gradient }} />
        <div className="absolute inset-[18px] rounded-full bg-white shadow-[inset_0_0_0_1px_rgba(226,232,240,0.8)]" />
        <div className="relative text-center">
          <div className="text-[11px] uppercase tracking-[0.16em] text-slate-400">Total expense</div>
          <div className="mt-2 text-[22px] font-semibold text-slate-900">{money(sum, currency, currencySymbol)}</div>
        </div>
      </div>
      <div className="hidden h-px w-14 shrink-0 bg-gradient-to-r from-slate-200 via-blue-200 to-transparent lg:block" />
      <div className="min-w-0 flex-1 space-y-3">
        {parts.length > 0 ? (
          parts.map((part, index) => {
            const share = sum > 0 ? (part.value / sum) * 100 : 0;
            const width = Math.max(share, 4);
            return (
              <div key={part.label} className="rounded-2xl border border-slate-100 bg-slate-50/70 px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: part.color }} />
                  <span className="min-w-0 flex-1 truncate text-[13px] text-slate-700">{part.label}</span>
                  <span className="text-[13px] font-semibold text-slate-900">{money(part.value, currency, currencySymbol)}</span>
                </div>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/80">
                  <div
                    className="h-full origin-left rounded-full transition-transform duration-700 ease-out"
                    style={{
                      width: `${width}%`,
                      backgroundColor: part.color,
                      transform: `scaleX(${ready ? 1 : 0})`,
                      transitionDelay: `${index * 85}ms`,
                    }}
                  />
                </div>
              </div>
            );
          })
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">No expense categories found yet.</div>
        )}
      </div>
    </div>
  );
}

function AgingBars({ labels, values, currency, currencySymbol }: { labels: string[]; values: number[]; currency: string; currencySymbol?: string }) {
  const [ready, setReady] = useState(false);
  const signature = `${labels.join("|")}::${values.join(",")}`;

  useEffect(() => {
    setReady(false);
    const frame = window.requestAnimationFrame(() => setReady(true));
    return () => window.cancelAnimationFrame(frame);
  }, [signature]);

  const max = Math.max(...values, 1);
  return (
    <div className="space-y-3">
      {labels.map((label, index) => {
        const value = n(values[index]);
        const width = Math.max((value / max) * 100, value > 0 ? 8 : 3);
        const palette = index === 0 ? "bg-blue-600" : index === 1 ? "bg-amber-500" : index === 2 ? "bg-orange-400" : index === 3 ? "bg-rose-400" : "bg-slate-300";
        return (
          <div key={label} className="grid grid-cols-[88px_minmax(0,1fr)_88px] items-center gap-3">
            <div className="text-[12px] font-medium text-slate-500">{label}</div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-2 rounded-full ${palette} origin-left transition-transform duration-700 ease-out`}
                style={{ transform: `scaleX(${ready ? width / 100 : 0})`, transitionDelay: `${index * 70}ms` }}
              />
            </div>
            <div className="text-right text-[12px] font-semibold text-slate-900">{money(value, currency, currencySymbol)}</div>
          </div>
        );
      })}
    </div>
  );
}

function RowInvoice({ row, currency, currencySymbol, to }: { row: any; currency: string; currencySymbol?: string; to?: string }) {
  const overdue = isOverdueInvoice(row);
  const draft = isDraftInvoice(row);
  const status = draft ? "Draft" : overdue ? "Overdue" : "Open";
  const tone = draft ? "amber" : overdue ? "rose" : "emerald";
  const content = (
    <>
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${overdue ? "bg-rose-50 text-rose-600" : draft ? "bg-amber-50 text-amber-600" : "bg-blue-50 text-blue-600"}`}>
        <FileText size={18} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[14px] font-semibold text-slate-900">{customerLabel(row)}</div>
        <div className="mt-1 text-[12px] text-slate-500">
          {String(row?.invoiceNumber || "INV").trim()} <span className="mx-1">-</span> Due {shortDate(row?.dueDate || row?.date || row?.createdAt)}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="text-right">
          <div className={`text-[14px] font-semibold ${overdue ? "text-rose-600" : draft ? "text-amber-600" : "text-slate-900"}`}>{money(invoiceTotal(row), currency, currencySymbol)}</div>
          <div className="mt-1 text-right"><Badge tone={tone as any}>{status}</Badge></div>
        </div>
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${overdue ? "border-rose-100 bg-rose-50 text-rose-500" : draft ? "border-amber-100 bg-amber-50 text-amber-500" : "border-slate-200 bg-slate-50 text-slate-400"} transition group-hover:text-slate-700`}>
          <ChevronRight size={16} />
        </div>
      </div>
    </>
  );

  if (to) {
    return (
      <Link to={to} className="group flex items-center gap-3 rounded-2xl border border-slate-100 bg-white px-4 py-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition hover:-translate-y-0.5 hover:border-slate-200 hover:shadow-md">
        {content}
      </Link>
    );
  }

  return <div className="group flex items-center gap-3 rounded-2xl border border-slate-100 bg-white px-4 py-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition hover:-translate-y-0.5 hover:border-slate-200 hover:shadow-md">{content}</div>;
}

function RowPayment({ row, currency, currencySymbol, to }: { row: any; currency: string; currencySymbol?: string; to?: string }) {
  const content = (
    <>
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
        <Banknote size={18} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[14px] font-semibold text-slate-900">{customerLabel(row)}</div>
        <div className="mt-1 text-[12px] text-slate-500">
          {String(row?.paymentMode || "Payment").trim()} <span className="mx-1">-</span> {shortDate(row?.date || row?.createdAt)}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="text-right">
          <div className="text-[14px] font-semibold text-emerald-600">{money(paymentTotal(row), currency, currencySymbol)}</div>
          <div className="mt-1 text-right"><Badge tone="emerald">Received</Badge></div>
        </div>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-blue-100 bg-blue-50 text-blue-500 transition group-hover:text-blue-700">
          <ChevronRight size={16} />
        </div>
      </div>
    </>
  );

  if (to) {
    return (
      <Link to={to} className="group flex items-center gap-3 rounded-2xl border border-slate-100 bg-white px-4 py-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition hover:-translate-y-0.5 hover:border-slate-200 hover:shadow-md">
        {content}
      </Link>
    );
  }

  return <div className="group flex items-center gap-3 rounded-2xl border border-slate-100 bg-white px-4 py-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition hover:-translate-y-0.5 hover:border-slate-200 hover:shadow-md">{content}</div>;
}

const withTimeout = <T,>(promise: Promise<T>, timeoutMs = 8000) =>
  Promise.race<T>([
    promise,
    new Promise<T>((_, reject) => {
      window.setTimeout(() => reject(new Error("Request timed out.")), timeoutMs);
    }),
  ]);

function DashboardHome() {
  const { user } = useUser();
  const { settings } = useSettings();
  const { loading: permissionsLoading, canView } = usePermissions();
  const { baseCurrency, code: baseCurrencyCode } = useCurrency();
  const canViewDashboard = canView("dashboard", "View Dashboard");
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState("ytd");
  const organizationId = String((user as any)?.organizationId || "").trim();
  const dashboardQuery = useQuery({
    queryKey: ["dashboard", "summary", organizationId || "global", String(baseCurrencyCode || "").trim().toUpperCase()],
    staleTime: 30_000,
    enabled: !permissionsLoading && canViewDashboard,
    queryFn: async () => {
      setError(null);
      const cachedSummaryEnvelope = readCachedSummaryEnvelope(organizationId);
      const summaryHeaders: Record<string, string> = {};
      if (cachedSummaryEnvelope?.last_updated) {
        summaryHeaders["If-Modified-Since"] = cachedSummaryEnvelope.last_updated;
      }
      if (cachedSummaryEnvelope?.version_id) {
        summaryHeaders["X-Client-Version-Id"] = cachedSummaryEnvelope.version_id;
      }
      const results = await Promise.allSettled([
        withTimeout(
          dashboardAPI.getSummary({
            params: { organizationId },
            headers: summaryHeaders,
            skipCache: true,
          }),
          8000
        ),
        withTimeout(invoicesAPI.getAll({ limit: 1000, organizationId }), 8000),
        withTimeout(paymentsReceivedAPI.getAll({ limit: 1000, organizationId }), 8000),
        withTimeout(expensesAPI.getAll({ limit: 1000, organizationId }), 8000),
        withTimeout(subscriptionsAPI.getAll({ limit: 1000, organizationId }), 8000),
      ]);
      const [summaryRes, invoiceRes, paymentRes, expenseRes, subscriptionRes] = results;
      const summaryResponse = summaryRes.status === "fulfilled" ? summaryRes.value : null;
      const summary =
        summaryResponse?.notModified && cachedSummaryEnvelope
          ? cachedSummaryEnvelope.payload
          : summaryResponse?.success !== false
            ? summaryResponse?.data
            : null;
      const invoices = invoiceRes.status === "fulfilled" ? asRows(invoiceRes.value) : [];
      const payments = paymentRes.status === "fulfilled" ? asRows(paymentRes.value) : [];
      const expenses = expenseRes.status === "fulfilled" ? asRows(expenseRes.value) : [];
      const subscriptions = subscriptionRes.status === "fulfilled" ? asRows(subscriptionRes.value) : [];
      writeCachedRows(DASHBOARD_INVOICES_CACHE_KEY, invoices, organizationId);
      writeCachedRows(DASHBOARD_PAYMENTS_CACHE_KEY, payments, organizationId);
      writeCachedRows(DASHBOARD_EXPENSES_CACHE_KEY, expenses, organizationId);
      writeCachedRows(DASHBOARD_SUBSCRIPTIONS_CACHE_KEY, subscriptions, organizationId);
      const storedOrganization = readStoredOrganizationProfile();
      const organizationName = String(
        storedOrganization?.name ||
          storedOrganization?.organizationName ||
          settings?.general?.companyDisplayName ||
          settings?.general?.schoolDisplayName ||
          "Organization"
      ).trim();
      const nextSummary =
        summary && typeof summary === "object"
          ? summary
          : buildDashboardSummaryFromRows({
              invoices,
              payments,
              expenses,
              subscriptions,
              organizationName,
              baseCurrency: String(baseCurrencyCode || "").trim().toUpperCase(),
            });
      writeCachedSummary(nextSummary, organizationId, {
        version_id: String(summary?.version_id || nextSummary?.version_id || ""),
        last_updated: String(summary?.last_updated || nextSummary?.last_updated || new Date().toISOString()),
      });
      return { summary: nextSummary, invoices, payments, expenses, subscriptions };
    },
  });

  if (!permissionsLoading && !canViewDashboard) {
    return <AccessDenied title="Dashboard access required" message="Your role does not include permission to view the dashboard." />;
  }

  const dashboardData = (dashboardQuery.data || {}) as any;
  const currentSummary = dashboardData.summary || readCachedSummary(organizationId) || {
    metrics: {
      netRevenue: { total: 0, labels: [], values: [] },
      receivables: { total: 0, current: 0, overdue: 0, currentCount: 0, overdueCount: 0, labels: [], values: [] },
      mrr: { total: 0, labels: [], values: [] },
      activeSubscriptions: { total: 0, labels: [], values: [] },
    },
    incomeExpense: { totalIncome: 0, totalReceipts: 0, totalExpenses: 0, labels: [], income: [], receipts: [], expenses: [] },
    topExpenses: { total: 0, items: [] },
    organization: { name: "", baseCurrency: "" },
    version_id: "",
    last_updated: "",
    generatedAt: "",
  };

  const currency = String(currentSummary.organization?.baseCurrency || baseCurrencyCode || "").trim().toUpperCase();
  const currencySymbol = String(baseCurrency?.symbol || "").trim();
  const userName = String(user?.name || "Guest").trim() || "Guest";
  const organizationName = String(
    currentSummary.organization?.name ||
      settings?.general?.companyDisplayName ||
      settings?.general?.schoolDisplayName ||
      "Organization"
  ).trim();
  const summaryReady = Boolean(dashboardData.summary || readCachedSummary(organizationId));
  const invoices = dashboardData.invoices || readCachedRows(DASHBOARD_INVOICES_CACHE_KEY, organizationId);
  const payments = dashboardData.payments || readCachedRows(DASHBOARD_PAYMENTS_CACHE_KEY, organizationId);
  const expenses = dashboardData.expenses || readCachedRows(DASHBOARD_EXPENSES_CACHE_KEY, organizationId);
  const subscriptions = dashboardData.subscriptions || readCachedRows(DASHBOARD_SUBSCRIPTIONS_CACHE_KEY, organizationId);

  const openInvoices = invoices.filter((row) => !isDraftInvoice(row) && !isVoidInvoice(row));
  const overdueInvoices = openInvoices.filter(isOverdueInvoice);
  const draftInvoices = invoices.filter(isDraftInvoice);
  const recentPayments = [...payments]
    .sort((a, b) => (d(b?.date || b?.createdAt)?.getTime() || 0) - (d(a?.date || a?.createdAt)?.getTime() || 0))
    .slice(0, 4);
  const overdueAmount = overdueInvoices.reduce((sum, row) => sum + invoiceTotal(row), 0);
  const draftCount = draftInvoices.length;
  const currentMonth = new Date().toISOString().slice(0, 7);
  const currentMonthPayments = payments.filter((row) => String(d(row?.date || row?.createdAt)?.toISOString().slice(0, 7) || "") === currentMonth).reduce((sum, row) => sum + paymentTotal(row), 0);
  const currentMonthExpenses = expenses.filter((row) => String(d(row?.date || row?.createdAt)?.toISOString().slice(0, 7) || "") === currentMonth).reduce((sum, row) => sum + expenseTotal(row), 0);
  const currentMonthInvoices = invoices.filter((row) => String(d(row?.date || row?.createdAt)?.toISOString().slice(0, 7) || "") === currentMonth).reduce((sum, row) => sum + invoiceTotal(row), 0);
  const revenueDelta = pctChange(currentSummary.incomeExpense.income || []);
  const receiptDelta = pctChange(currentSummary.incomeExpense.receipts || []);
  const mrrDelta = pctChange(currentSummary.metrics.mrr?.values || []);
  const cashFlowGap = currentSummary.incomeExpense.totalIncome - currentSummary.incomeExpense.totalExpenses;
  const cashFlowWarning = cashFlowGap < 0 || overdueAmount > 0;

  const revenueLabels = currentSummary.incomeExpense.labels?.length ? currentSummary.incomeExpense.labels : currentSummary.metrics.netRevenue.labels || [];
  const invoicedSeries = currentSummary.incomeExpense.income?.length ? currentSummary.incomeExpense.income : currentSummary.metrics.netRevenue.values || [];
  const collectedSeries = currentSummary.incomeExpense.receipts?.length ? currentSummary.incomeExpense.receipts : currentSummary.metrics.netRevenue.values || [];
  const receivableLabels = currentSummary.metrics.receivables.labels?.length ? currentSummary.metrics.receivables.labels : ["Current", "1-15", "15-30", "31-45", ">45"];
  const receivableValues = currentSummary.metrics.receivables.values?.length ? currentSummary.metrics.receivables.values : [currentSummary.metrics.receivables.current, currentSummary.metrics.receivables.overdue, 0, 0, 0];
  const overdueInvoicesReportTo = "/reports/receivables/ar-aging-details";
  const recentPaymentsReportTo = "/reports/payments-received/payments-received";
  const draftInvoicesReportTo = "/reports/receivables/invoice-details";
  const receivablesAgingReportTo = "/reports/receivables/ar-aging-summary";
  const revenueReportTo = "/reports/sales/sales-summary";
  const expenseReportTo = "/reports/purchases-expenses/expenses-by-category";

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-5 p-4 md:p-6">
      <div
        className="relative overflow-hidden rounded-[28px] border border-slate-200 bg-white px-5 py-5 shadow-sm"
        style={{
          backgroundImage: `
            radial-gradient(circle at 20px 20px, rgba(37,99,235,0.08) 1px, transparent 1.5px),
            linear-gradient(135deg, rgba(248,250,252,0.96) 0%, rgba(255,255,255,1) 52%, rgba(241,245,249,0.95) 100%)
          `,
          backgroundSize: "42px 42px, 100% 100%",
        }}
      >
        <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-blue-100/40 blur-3xl" />
        <div className="relative flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-500 shadow-sm">
              <LayoutDashboard size={24} />
            </div>
            <div>
              <div className="text-[26px] font-semibold tracking-tight text-slate-900 sm:text-[32px]">Hello, {userName}</div>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-[14px] font-medium text-slate-500">
                <span>{organizationName}</span>
                <span className="text-slate-300">-</span>
              </div>
            </div>
          </div>
          <div className="inline-flex overflow-hidden rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
            <PeriodPill active={period === "ytd"} onClick={() => setPeriod("ytd")}>Year to Date</PeriodPill>
            <PeriodPill active={period === "quarterly"} onClick={() => setPeriod("quarterly")}>Quarterly</PeriodPill>
            <PeriodPill active={period === "custom"} onClick={() => setPeriod("custom")}>Custom Range</PeriodPill>
            <button type="button" className="ml-1 inline-flex items-center justify-center rounded-xl px-3 text-slate-500 transition hover:bg-slate-50 hover:text-slate-800" aria-label="Range">
              <CalendarDays size={16} />
            </button>
          </div>
        </div>
      </div>

      {error ? <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{error}</div> : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard ready={summaryReady} title="Net Revenue" amount={currentSummary.metrics.netRevenue.total} currency={currency} currencySymbol={currencySymbol} subtitle={`Live trend across ${currentSummary.metrics.netRevenue.labels.length || 0} periods`} delta={`${Math.abs(revenueDelta).toFixed(1)}%`} up={revenueDelta >= 0} icon={TrendingUp} tone="blue" />
        <StatCard ready={summaryReady} title="Receivables" amount={currentSummary.metrics.receivables.total} currency={currency} currencySymbol={currencySymbol} subtitle={`${currentSummary.metrics.receivables.currentCount} current / ${currentSummary.metrics.receivables.overdueCount} overdue`} icon={Banknote} tone="slate" />
        <StatCard ready={summaryReady} title="Paid This Month" amount={currentMonthPayments} currency={currency} currencySymbol={currencySymbol} subtitle={`Current month receipts: ${money(currentSummary.incomeExpense.totalReceipts, currency, currencySymbol)}`} delta={`${Math.abs(receiptDelta).toFixed(1)}%`} up={receiptDelta >= 0} icon={CheckCircle2} tone="emerald" />
        <StatCard ready={summaryReady} title="MRR" amount={currentSummary.metrics.mrr.total} currency={currency} currencySymbol={currencySymbol} subtitle={`${currentSummary.metrics.activeSubscriptions.total} active subscriptions`} delta={`${Math.abs(mrrDelta).toFixed(1)}%`} up={mrrDelta >= 0} icon={CircleDollarSign} tone="violet" />
        <StatCard ready={summaryReady} title="Total Overdue" amount={overdueAmount} currency={currency} currencySymbol={currencySymbol} subtitle={`${overdueInvoices.length} invoices need follow-up`} icon={ShieldAlert} tone="rose" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(360px,1fr)]">
        <SectionCard title="Revenue Performance" subtitle={`Invoiced versus collected activity for ${period === "ytd" ? "Year to Date" : period === "quarterly" ? "Quarterly" : "Custom Range"}`} action={<Link to={revenueReportTo} className="text-[12px] font-semibold text-blue-600 hover:text-blue-700">Open report</Link>}>
          <RevenueChart labels={revenueLabels} invoiced={invoicedSeries} collected={collectedSeries} currency={currency} currencySymbol={currencySymbol} />
        </SectionCard>
        <SectionCard title="Expense Analysis" subtitle="Top categories by spend" action={<Link to={expenseReportTo} className="text-[12px] font-semibold text-blue-600 hover:text-blue-700">{compactMoney(currentSummary.topExpenses.total, currency, currencySymbol)} total</Link>}>
          <ExpenseDonut items={currentSummary.topExpenses.items || []} total={currentSummary.topExpenses.total || 0} currency={currency} currencySymbol={currencySymbol} />
        </SectionCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)_minmax(0,0.95fr)]">
        <SectionCard title="Overdue Invoices" subtitle="Invoices that need collection follow-up" action={<Link to={overdueInvoicesReportTo} className="text-[12px] font-semibold text-blue-600 hover:text-blue-700">View report</Link>}>
          <div className="space-y-3">
            {overdueInvoices.slice(0, 4).map((row) => <RowInvoice key={String(row?._id || row?.id || row?.invoiceNumber || Math.random())} row={row} currency={currency} currencySymbol={currencySymbol} to={overdueInvoicesReportTo} />)}
            {overdueInvoices.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-sm text-slate-500">No overdue invoices right now. That is a good sign.</div> : null}
            {overdueInvoices.length > 4 ? <div className="text-[12px] text-slate-500">+ {overdueInvoices.length - 4} more overdue invoices.</div> : null}
          </div>
        </SectionCard>

        <SectionCard title="Recent Payments" subtitle="Latest receipts recorded in the system" action={<Link to={recentPaymentsReportTo} className="text-[12px] font-semibold text-blue-600 hover:text-blue-700">View report</Link>}>
          <div className="space-y-3">
            {recentPayments.map((row) => <RowPayment key={String(row?._id || row?.id || row?.paymentNumber || Math.random())} row={row} currency={currency} currencySymbol={currencySymbol} to={recentPaymentsReportTo} />)}
            {recentPayments.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-sm text-slate-500">No payments recorded yet.</div> : null}
          </div>
        </SectionCard>

        <div className="space-y-4">
          <SectionCard title="Draft Invoices" subtitle="Action required before sending" action={<Link to={draftInvoicesReportTo} className="text-[12px] font-semibold text-blue-600 hover:text-blue-700">View report</Link>}>
            <div className="mt-4 space-y-3">
              {draftInvoices.slice(0, 2).map((row) => <RowInvoice key={String(row?._id || row?.id || row?.invoiceNumber || Math.random())} row={row} currency={currency} currencySymbol={currencySymbol} to={draftInvoicesReportTo} />)}
              {draftCount === 0 ? <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-sm text-slate-500">No draft invoices waiting right now.</div> : null}
              {draftCount > 2 ? <div className="text-[12px] text-slate-500">+ {draftCount - 2} more draft invoices.</div> : null}
            </div>
          </SectionCard>

          <Card className="border-rose-200 bg-gradient-to-br from-white to-rose-50/80 p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-rose-100 p-2 text-rose-600"><AlertTriangle size={18} /></div>
              <div className="min-w-0 flex-1">
                <div className="text-[12px] font-semibold uppercase tracking-[0.16em] text-rose-500">Low cash flow</div>
                <div className="mt-2 text-[14px] font-semibold text-slate-900">{money(currentMonthInvoices - currentMonthExpenses, currency, currencySymbol)} net this month</div>
                <p className="mt-2 text-[13px] leading-6 text-slate-600">
                  {cashFlowGap < 0 || overdueAmount > 0 ? "Operating cash flow is under pressure based on current receipts and expense volume." : "Cash flow is stable, but overdue items still need close follow-up."}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Badge tone={cashFlowGap < 0 || overdueAmount > 0 ? "rose" : "emerald"}>{cashFlowGap < 0 || overdueAmount > 0 ? "Attention needed" : "Healthy"}</Badge>
                  <Badge tone="slate">{money(currentMonthExpenses, currency, currencySymbol)} expenses</Badge>
                </div>
              </div>
            </div>
          </Card>

          <SectionCard title="Receivables Aging" subtitle="Outstanding balances by age bucket" action={<Link to={receivablesAgingReportTo} className="text-[12px] font-semibold text-blue-600 hover:text-blue-700">AR report</Link>}>
            <AgingBars labels={currentSummary.metrics.receivables.labels?.length ? currentSummary.metrics.receivables.labels : receivableLabels} values={currentSummary.metrics.receivables.values?.length ? currentSummary.metrics.receivables.values : receivableValues} currency={currency} currencySymbol={currencySymbol} />
          </SectionCard>
        </div>
      </div>
    </div>
  );
}

export default function DashboardRoutes() {
  return (
    <Routes>
      <Route index element={<DashboardHome />} />
      <Route path="*" element={<Navigate to="." replace />} />
    </Routes>
  );
}
