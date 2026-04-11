import React from "react";
import Card from "../../components/ui/Card";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { formatCurrencyValue, type DashboardSummary } from "./summary";
import { useDashboardSummarySync } from "../../hooks/useDashboardSummarySync";

function Stat({ label, value, delta, up = true }) {
  return (
    <Card className="p-5">
      <div className="text-[12px] text-slate-500">{label}</div>
      <div className="mt-2 flex items-baseline gap-2">
        <div className="text-2xl font-semibold">{value}</div>
        <div className={`flex items-center gap-1 text-[12px] ${up ? "text-emerald-600" : "text-rose-600"}`}>
          {up ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
          <span>{delta}</span>
        </div>
      </div>
    </Card>
  );
}

const getDeltaInfo = (values: number[] = []) => {
  const safeValues = Array.isArray(values) ? values : [];
  const length = safeValues.length;
  const current = length ? safeValues[length - 1] : 0;
  const previous = length > 1 ? safeValues[length - 2] : 0;
  const change = current - previous;
  let percent = 0;
  if (previous) {
    percent = (change / previous) * 100;
  } else if (current) {
    percent = 100;
  }
  const label = `${change >= 0 ? "+" : ""}${percent.toFixed(1)}%`;
  return { label, up: change >= 0, change };
};

export default function Dashboard() {
  const summarySync = useDashboardSummarySync();
  const dashboardData = summarySync.data;
  const errorMessage = summarySync.error;

  if (summarySync.loading && !dashboardData) {
    return (
      <div className="space-y-6">
        <Card className="border-slate-200 p-8 text-sm text-slate-500 shadow-sm">Loading dashboard data...</Card>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="space-y-6">
        <Card className="border border-rose-100 bg-rose-50 p-8 text-sm text-rose-700 shadow-sm">
          {errorMessage || "Failed to load dashboard data."}
        </Card>
      </div>
    );
  }

  const currencyCode = String(dashboardData.organization?.baseCurrency || "").trim().toUpperCase();
  const mrrValue = dashboardData.metrics.mrr.total ?? 0;
  const arrValue = mrrValue * 12;
  const overdueValue = dashboardData.metrics.receivables.overdue ?? 0;
  const activeSubscriptions = dashboardData.metrics.activeSubscriptions.total ?? 0;

  const mrrDelta = getDeltaInfo(dashboardData.metrics.mrr.values);
  const receivablesDelta = getDeltaInfo(dashboardData.metrics.receivables.values);
  const activeDelta = getDeltaInfo(dashboardData.metrics.activeSubscriptions.values);

  const stats = [
    {
      label: "MRR",
      value: formatCurrencyValue(mrrValue, currencyCode),
      delta: mrrDelta.label,
      up: mrrDelta.up,
    },
    {
      label: "ARR",
      value: formatCurrencyValue(arrValue, currencyCode),
      delta: mrrDelta.label,
      up: mrrDelta.up,
    },
    {
      label: "Overdues",
      value: formatCurrencyValue(overdueValue, currencyCode),
      delta: receivablesDelta.label,
      up: receivablesDelta.change <= 0,
    },
    {
      label: "Active Customers",
      value: `${Math.round(activeSubscriptions)}`,
      delta: activeDelta.label,
      up: activeDelta.up,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Billing Dashboard</h1>
          <p className="text-[13px] text-slate-500">Quick snapshot of revenue, invoices and customers</p>
        </div>
      </div>

      {errorMessage ? (
        <div className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {errorMessage}
        </div>
      ) : null}

      {summarySync.refreshing && (
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500 shadow-sm">
          Updating dashboard numbers...
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Stat key={stat.label} label={stat.label} value={stat.value} delta={stat.delta} up={stat.up} />
        ))}
      </div>
    </div>
  );
}
