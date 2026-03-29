import type express from "express";
import mongoose from "mongoose";
import { Customer } from "../models/Customer.js";
import { Expense } from "../models/Expense.js";
import { Invoice } from "../models/Invoice.js";
import { PaymentReceived } from "../models/PaymentReceived.js";
import { Project } from "../models/Project.js";
import { Subscription } from "../models/Subscription.js";
import { TimeEntry } from "../models/TimeEntry.js";

const normalizeText = (value: unknown) => String(value ?? "").trim().toLowerCase();
const asNumber = (value: unknown, fallback = 0) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const raw = String(value ?? "").trim();
  if (!raw) return fallback;
  const parsed = Number(raw.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : fallback;
};
const asDate = (value: unknown) => {
  if (!value) return null;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
};
const startOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1);
const addMonths = (date: Date, amount: number) => new Date(date.getFullYear(), date.getMonth() + amount, 1);
const monthKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
const monthLabel = (date: Date) =>
  new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric" }).format(date);
const monthLabelLine = (date: Date) => {
  const [month, year] = monthLabel(date).split(" ");
  return `${month}\n${year}`;
};

const isOpenInvoice = (row: any) => !["draft", "void", "cancelled", "canceled"].includes(normalizeText(row?.status));
const isActiveSubscription = (row: any) => !["cancelled", "canceled", "inactive", "expired", "draft"].includes(normalizeText(row?.status));
const isCancelledSubscription = (row: any) => ["cancelled", "canceled", "inactive", "expired"].includes(normalizeText(row?.status));
const isBilledTimeEntry = (row: any) => ["billed", "invoiced"].includes(normalizeText(row?.billingStatus));
const isUnbilledExpense = (row: any) => !["billed", "invoiced", "paid"].includes(normalizeText(row?.status));

const subscriptionValue = (row: any) =>
  asNumber(
    row?.monthlyAmount ??
      row?.mrr ??
      row?.amount ??
      row?.total ??
      row?.price ??
      row?.billingAmount ??
      row?.recurringAmount ??
      row?.chargeAmount ??
      row?.rate,
    0
  );

const formatMinutes = (minutes: number) => {
  const total = Math.max(0, Math.round(minutes || 0));
  const hours = Math.floor(total / 60);
  const mins = total % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
};

const buildMonthBuckets = (months = 12) => {
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
};

const toMonthlySeries = (
  rows: any[],
  buckets: Array<{ start: Date; end: Date }>,
  getDate: (row: any) => Date | null,
  getValue: (row: any) => number
) => {
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
};

const toMonthlyCounts = (rows: any[], buckets: Array<{ start: Date; end: Date }>, getDate: (row: any) => Date | null) =>
  toMonthlySeries(rows, buckets, getDate, () => 1);

const normalizeDashboardRow = (row: any) => (row ? { ...row, id: String(row._id) } : row);

export const getDashboardSummary: express.RequestHandler = async (req, res) => {
  const orgId = req.user?.organizationId;
  if (!orgId) {
    return res.status(401).json({ success: false, message: "Unauthenticated", data: null });
  }
  if (!mongoose.isValidObjectId(orgId)) {
    return res.status(400).json({ success: false, message: "Invalid organization", data: null });
  }
  if (mongoose.connection.readyState !== 1) {
    return res.status(500).json({ success: false, message: "Database not connected", data: null });
  }

  const months = buildMonthBuckets(12);
  const rangeStart = months[0]?.start || startOfMonth(new Date());

  const [customers, projects, invoices, payments, expenses, subscriptions, timeEntries] = await Promise.all([
    Customer.find({ organizationId: orgId }).lean(),
    Project.find({ organizationId: orgId }).lean(),
    Invoice.find({ organizationId: orgId }).lean(),
    PaymentReceived.find({ organizationId: orgId }).lean(),
    Expense.find({ organizationId: orgId }).lean(),
    Subscription.find({ organizationId: orgId }).lean(),
    TimeEntry.find({ organizationId: orgId }).lean(),
  ]);

  const invoicePayments = new Map<string, number>();
  for (const payment of payments || []) {
    const amount = asNumber((payment as any)?.amount, 0);
    const keys = [payment?._id, payment?.invoiceId, payment?.invoiceNumber]
      .map((entry) => String(entry || "").trim())
      .filter(Boolean);
    for (const key of keys) {
      invoicePayments.set(key, (invoicePayments.get(key) || 0) + amount);
    }
  }

  const openInvoices = (invoices || []).filter(isOpenInvoice);
  const totalIncome = (invoices || []).reduce((sum, row) => sum + asNumber((row as any)?.total, 0), 0);
  const totalReceipts = (payments || []).reduce((sum, row) => sum + asNumber((row as any)?.amount, 0), 0);
  const totalExpenses = (expenses || []).reduce((sum, row) => sum + asNumber((row as any)?.amount, 0), 0);
  const netRevenue = totalIncome - totalExpenses;

  let receivableTotal = 0;
  let receivableCurrent = 0;
  let receivableOverdue = 0;
  let receivableCurrentCount = 0;
  let receivableOverdueCount = 0;

  for (const invoice of openInvoices) {
    const invoiceId = String((invoice as any)?._id || "").trim();
    const invoiceNumber = String((invoice as any)?.invoiceNumber || "").trim();
    const total = asNumber((invoice as any)?.total, 0);
    const paid = (invoicePayments.get(invoiceId) || 0) + (invoicePayments.get(invoiceNumber) || 0);
    const outstanding = Math.max(0, total - paid);
    if (!outstanding) continue;

    receivableTotal += outstanding;
    const dueDate = asDate((invoice as any)?.dueDate);
    if (dueDate && dueDate.getTime() < Date.now()) {
      receivableOverdue += outstanding;
      receivableOverdueCount += 1;
    } else {
      receivableCurrent += outstanding;
      receivableCurrentCount += 1;
    }
  }

  const activeSubscriptions = (subscriptions || []).filter(isActiveSubscription);
  const cancelledSubscriptions = (subscriptions || []).filter(isCancelledSubscription);
  const activeCustomersCount = await Customer.countDocuments({ organizationId: orgId });

  const netRevenueSeries = toMonthlySeries(
    invoices || [],
    months,
    (row) => asDate((row as any)?.date || (row as any)?.createdAt),
    (row) => asNumber((row as any)?.total, 0)
  );
  const receiptSeries = toMonthlySeries(
    payments || [],
    months,
    (row) => asDate((row as any)?.date || (row as any)?.createdAt),
    (row) => asNumber((row as any)?.amount, 0)
  );
  const expenseSeries = toMonthlySeries(
    expenses || [],
    months,
    (row) => asDate((row as any)?.date || (row as any)?.createdAt),
    (row) => asNumber((row as any)?.amount, 0)
  );
  const subscriptionSignupSeries = toMonthlyCounts(
    subscriptions || [],
    months,
    (row) => asDate((row as any)?.createdAt || (row as any)?.startDate)
  );
  const subscriptionActivationSeries = toMonthlyCounts(
    activeSubscriptions,
    months,
    (row) => asDate((row as any)?.createdAt || (row as any)?.startDate)
  );
  const subscriptionCancellationSeries = toMonthlyCounts(
    cancelledSubscriptions,
    months,
    (row) => asDate((row as any)?.updatedAt || (row as any)?.createdAt || (row as any)?.endDate)
  );

  const activeSubscriptionSeries = months.map((bucket) =>
    (subscriptions || []).filter((row) => {
      const createdAt = asDate((row as any)?.createdAt || (row as any)?.startDate);
      if (!createdAt || createdAt >= bucket.end) return false;
      return isActiveSubscription(row);
    }).length
  );

  const mrrSeries = months.map((bucket) =>
    (subscriptions || []).reduce((sum, row) => {
      const createdAt = asDate((row as any)?.createdAt || (row as any)?.startDate);
      if (!createdAt || createdAt >= bucket.end) return sum;
      if (!isActiveSubscription(row)) return sum;
      return sum + subscriptionValue(row);
    }, 0)
  );

  const arpuSeries = months.map((_, index) => {
    const subs = activeSubscriptionSeries[index] || 0;
    return subs > 0 ? receiptSeries.slice(0, index + 1).reduce((sum, value) => sum + value, 0) / subs : 0;
  });

  const ltvSeries = months.map((_, index) => {
    const customerDenominator = Math.max(activeCustomersCount, 1);
    return netRevenueSeries.slice(0, index + 1).reduce((sum, value) => sum + value, 0) / customerDenominator;
  });

  const churnSeries = months.map((_, index) => {
    const active = Math.max(activeSubscriptionSeries[index] || 0, 1);
    return ((subscriptionCancellationSeries[index] || 0) / active) * 100;
  });

  const totalSubscriptions = subscriptions.length;
  const activeCount = activeSubscriptions.length;
  const cancelledCount = cancelledSubscriptions.length;
  const churnRate = totalSubscriptions > 0 ? (cancelledCount / totalSubscriptions) * 100 : 0;
  const arpu = activeCount > 0 ? totalIncome / activeCount : 0;
  const ltv = activeCustomersCount > 0 ? totalIncome / activeCustomersCount : 0;
  const mrr = activeSubscriptions.reduce((sum, row) => sum + subscriptionValue(row), 0);

  const expenseGroups = new Map<string, number>();
  for (const row of expenses || []) {
    const label =
      String((row as any)?.accountName || (row as any)?.vendorName || (row as any)?.customerName || "Uncategorized").trim() ||
      "Uncategorized";
    expenseGroups.set(label, (expenseGroups.get(label) || 0) + asNumber((row as any)?.amount, 0));
  }
  const topExpenseItems = [...expenseGroups.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  const projectStats = (projects || []).map((project) => {
    const id = String((project as any)?._id || (project as any)?.id || "").trim();
    const name = String((project as any)?.name || (project as any)?.projectName || "Project").trim();
    const customerName = String((project as any)?.customerName || "").trim();
    const projectNameTarget = normalizeText(name);

    const projectTimeEntries = (timeEntries || []).filter((entry) => String((entry as any)?.projectId || "").trim() === id);
    const unbilledMinutes = projectTimeEntries.reduce((sum, entry) => {
      if (isBilledTimeEntry(entry)) return sum;
      return sum + asNumber((entry as any)?.duration, 0);
    }, 0);

    const projectExpenses = (expenses || []).filter((expense) => {
      const refId = String((expense as any)?.projectId || (expense as any)?.project_id || "").trim();
      const refName = normalizeText(
        (expense as any)?.projectName || (expense as any)?.project_name || (expense as any)?.project || ""
      );
      return refId === id || (projectNameTarget && refName === projectNameTarget);
    });
    const unbilledExpenses = projectExpenses.reduce((sum, expense) => {
      if (!isUnbilledExpense(expense)) return sum;
      return sum + asNumber((expense as any)?.amount, 0);
    }, 0);

    const budgetHours = asNumber(
      (project as any)?.budgetHours ??
        (project as any)?.budget_hours ??
        (project as any)?.estimatedHours ??
        (project as any)?.estimated_hours,
      0
    );
    const progress = budgetHours > 0 ? Math.min(100, Math.round((unbilledMinutes / (budgetHours * 60)) * 100)) : 0;

    return {
      id,
      name,
      customerName,
      unbilledMinutes,
      unbilledExpenses,
      progress,
      budgetLabel: budgetHours > 0 ? `${budgetHours}h budget` : "No budget hours",
      totalActivity: unbilledMinutes + unbilledExpenses,
    };
  });

  projectStats.sort((a, b) => b.totalActivity - a.totalActivity);
  const topProject = projectStats[0] || null;
  const totalProjectUnbilledMinutes = projectStats.reduce((sum, row) => sum + row.unbilledMinutes, 0);
  const totalProjectUnbilledExpenses = projectStats.reduce((sum, row) => sum + row.unbilledExpenses, 0);

  const responseData = {
    metrics: {
      netRevenue: {
        total: netRevenue,
        labels: months.map((bucket) => bucket.label),
        values: netRevenueSeries,
      },
      receivables: {
        total: receivableTotal,
        current: receivableCurrent,
        overdue: receivableOverdue,
        currentCount: receivableCurrentCount,
        overdueCount: receivableOverdueCount,
        labels: ["Current", "1-15", "15-30", "31-45", ">45"],
        values: [
          receivableCurrent,
          receivableOverdue,
          0,
          0,
          0,
        ],
      },
      mrr: {
        total: mrr,
        labels: months.map((bucket) => bucket.label),
        values: mrrSeries,
      },
      activeSubscriptions: {
        total: activeCount,
        labels: months.map((bucket) => bucket.label),
        values: activeSubscriptionSeries,
      },
      churnRate: {
        total: churnRate,
        asOf: monthLabel(new Date()),
        labels: months.map((bucket) => bucket.label),
        values: churnSeries,
      },
      arpu: {
        total: arpu,
        labels: months.map((bucket) => bucket.label),
        values: arpuSeries,
      },
      ltv: {
        total: ltv,
        asOf: monthLabel(new Date()),
        labels: months.map((bucket) => bucket.label),
        values: ltvSeries,
      },
    },
    subscriptionSummary: {
      signups: subscriptions.length,
      activations: activeCount,
      cancellations: cancelledCount,
      reactivations: 0,
      series: {
        labels: months.map((bucket) => bucket.label),
        signups: subscriptionSignupSeries,
        activations: subscriptionActivationSeries,
        cancellations: subscriptionCancellationSeries,
        reactivations: months.map(() => 0),
      },
    },
    incomeExpense: {
      totalIncome,
      totalReceipts,
      totalExpenses,
      labels: months.map((bucket) => bucket.label),
      income: netRevenueSeries.map((value, index) => value + expenseSeries[index]),
      receipts: receiptSeries,
      expenses: expenseSeries,
    },
    topExpenses: {
      total: totalExpenses,
      items: topExpenseItems,
    },
    projects: {
      totalCount: projectStats.length,
      totalUnbilledMinutes: totalProjectUnbilledMinutes,
      totalUnbilledHours: formatMinutes(totalProjectUnbilledMinutes),
      totalUnbilledExpenses: totalProjectUnbilledExpenses,
      topProject: topProject
        ? {
            id: topProject.id,
            name: topProject.name,
            customerName: topProject.customerName,
            unbilledHours: formatMinutes(topProject.unbilledMinutes),
            unbilledExpenses: topProject.unbilledExpenses,
            progress: topProject.progress,
            budgetLabel: topProject.budgetLabel,
          }
        : null,
      rows: projectStats.slice(0, 10).map((row) => ({
        ...row,
        unbilledHours: formatMinutes(row.unbilledMinutes),
      })),
    },
    generatedAt: new Date().toISOString(),
  };

  return res.json({ success: true, data: responseData });
};

