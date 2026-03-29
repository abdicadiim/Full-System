import React, { useEffect, useState } from "react";
import { FileText } from "lucide-react";
import Card from "../../../components/ui/Card";
import { RangeSelect } from "../../../components/dashboard/parts/SectionBits";
import AccessDenied from "../../../components/AccessDenied";
import { dashboardAPI } from "../../../services/api";
import { useUser } from "../../../lib/auth/UserContext";
import { useSettings } from "../../../lib/settings/SettingsContext";
import { useCurrency } from "../../../hooks/useCurrency";
import { usePermissions } from "../../../hooks/usePermissions";

type MetricLegendItem = {
  label: string;
  value: string;
  color: string;
};

type DashboardSummary = {
  metrics: {
    netRevenue: { total: number; labels: string[]; values: number[] };
    receivables: { total: number; current: number; overdue: number; currentCount: number; overdueCount: number; labels: string[]; values: number[] };
    mrr: { total: number; labels: string[]; values: number[] };
    activeSubscriptions: { total: number; labels: string[]; values: number[] };
    churnRate: { total: number; asOf: string; labels: string[]; values: number[] };
    arpu: { total: number; labels: string[]; values: number[] };
    ltv: { total: number; asOf: string; labels: string[]; values: number[] };
  };
  subscriptionSummary: {
    signups: number;
    activations: number;
    cancellations: number;
    reactivations: number;
    series: {
      labels: string[];
      signups: number[];
      activations: number[];
      cancellations: number[];
      reactivations: number[];
    };
  };
  incomeExpense: {
    totalIncome: number;
    totalReceipts: number;
    totalExpenses: number;
    labels: string[];
    income: number[];
    receipts: number[];
    expenses: number[];
  };
  topExpenses: {
    total: number;
    items: MetricLegendItem[];
  };
  projects: {
    totalCount: number;
    totalUnbilledMinutes: number;
    totalUnbilledHours: string;
    totalUnbilledExpenses: number;
    topProject: null | {
      id: string;
      name: string;
      customerName: string;
      unbilledHours: string;
      unbilledExpenses: number;
      progress: number;
      budgetLabel: string;
    };
  };
  organization: {
    name: string;
    baseCurrency: string;
  };
};

const EMPTY_SUMMARY: DashboardSummary = {
  metrics: {
    netRevenue: { total: 0, labels: ["", "", "", ""], values: [0, 0, 0, 0] },
    receivables: {
      total: 0,
      current: 0,
      overdue: 0,
      currentCount: 0,
      overdueCount: 0,
      labels: ["Current", "1-15", "15-30", "31-45", ">45"],
      values: [0, 0, 0, 0, 0],
    },
    mrr: { total: 0, labels: ["", "", "", ""], values: [0, 0, 0, 0] },
    activeSubscriptions: { total: 0, labels: ["", "", "", ""], values: [0, 0, 0, 0] },
    churnRate: { total: 0, asOf: "", labels: ["", "", "", ""], values: [0, 0, 0, 0] },
    arpu: { total: 0, labels: ["", "", "", ""], values: [0, 0, 0, 0] },
    ltv: { total: 0, asOf: "", labels: ["", "", "", ""], values: [0, 0, 0, 0] },
  },
  subscriptionSummary: {
    signups: 0,
    activations: 0,
    cancellations: 0,
    reactivations: 0,
    series: {
      labels: ["", "", "", ""],
      signups: [0, 0, 0, 0],
      activations: [0, 0, 0, 0],
      cancellations: [0, 0, 0, 0],
      reactivations: [0, 0, 0, 0],
    },
  },
  incomeExpense: {
    totalIncome: 0,
    totalReceipts: 0,
    totalExpenses: 0,
    labels: ["", "", "", ""],
    income: [0, 0, 0, 0],
    receipts: [0, 0, 0, 0],
    expenses: [0, 0, 0, 0],
  },
  topExpenses: {
    total: 0,
    items: [],
  },
  projects: {
    totalCount: 0,
    totalUnbilledMinutes: 0,
    totalUnbilledHours: "00:00",
    totalUnbilledExpenses: 0,
    topProject: null,
  },
  organization: {
    name: "",
    baseCurrency: "",
  },
};

const formatMoney = (value: number, currencyCode = "AMD") =>
  `${currencyCode}${new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(
    Number.isFinite(value) ? value : 0
  )}`;

const formatPercent = (value: number) =>
  `${new Intl.NumberFormat("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(
    Number.isFinite(value) ? value : 0
  )}%`;

const isMeaningfulSeries = (values: number[]) => values.some((value) => Number(value) > 0);

function SectionCard({
  title,
  range = "Last 3 months",
  children,
  className = "",
}: {
  title: string;
  range?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={`overflow-hidden border-slate-200 ${className}`}>
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
        <h3 className="text-[13px] font-medium text-slate-700">{title}</h3>
        {range ? (
          <RangeSelect value={range} className="[&_button]:border-none [&_button]:bg-transparent [&_button]:px-0 [&_button]:py-0 [&_button]:text-[12px] [&_button]:text-slate-500 hover:[&_button]:bg-transparent" />
        ) : null}
      </div>
      <div className="p-4">{children}</div>
    </Card>
  );
}

function MetricHeader({
  value,
  sublabel = "Month On Month",
  badge = "0%",
  right,
}: {
  value: string;
  sublabel?: string;
  badge?: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex items-start justify-between gap-4">
      <div>
        <div className="text-[15px] font-semibold text-slate-900 sm:text-[17px]">{value}</div>
        <div className="mt-2 flex items-center gap-2 text-[11px] text-slate-500">
          <span className="rounded-full bg-slate-100 px-1.5 py-0.5 font-semibold text-slate-500">{badge}</span>
          <span>{sublabel}</span>
        </div>
      </div>
      {right}
    </div>
  );
}

function ChartShell({
  labels,
  leftLabels,
  children,
  height = 176,
}: {
  labels: string[];
  leftLabels?: string[];
  children: React.ReactNode;
  height?: number;
}) {
  return (
    <div className="grid grid-cols-[30px_minmax(0,1fr)] gap-3">
      <div className="relative" style={{ height }}>
        {leftLabels ? (
          <div className="absolute inset-0 flex flex-col justify-between py-2 text-[10px] text-slate-400">
            {leftLabels.map((label, index) => (
              <span key={`${label || "left"}-${index}`}>{label}</span>
            ))}
          </div>
        ) : null}
      </div>

      <div>
        <div className="relative overflow-hidden rounded-md" style={{ height }}>
          <div className="absolute inset-0 flex flex-col justify-between py-2">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="border-b border-dashed border-slate-200 last:border-b-0" />
            ))}
          </div>
          <div className="absolute inset-0">{children}</div>
        </div>

        <div className="mt-2 grid text-[10px] text-slate-400" style={{ gridTemplateColumns: `repeat(${labels.length}, minmax(0, 1fr))` }}>
          {labels.map((label, labelIndex) => (
            <div key={`${label || "label"}-${labelIndex}`} className="text-center leading-tight">
              {label.split("\n").map((part, partIndex) => (
                <div key={`${part || "part"}-${labelIndex}-${partIndex}`}>{part}</div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function LineAreaChart({
  points,
  stroke,
  fill,
  labels,
  leftLabels,
  height = 176,
}: {
  points: number[];
  stroke: string;
  fill: string;
  labels: string[];
  leftLabels?: string[];
  height?: number;
}) {
  const width = 100;
  const baseY = 90;
  const topY = 10;
  const max = Math.max(...points, 1);
  const step = points.length > 1 ? width / (points.length - 1) : width;

  const coords = points.map((point, index) => {
    const x = index * step;
    const y = baseY - (point / max) * (baseY - topY);
    return `${x},${y}`;
  });

  const line = coords.join(" ");
  const area = `0,${baseY} ${line} ${width},${baseY}`;

  return (
    <ChartShell labels={labels} leftLabels={leftLabels} height={height}>
      <svg viewBox={`0 0 ${width} 100`} preserveAspectRatio="none" className="h-full w-full">
        <defs>
          <linearGradient id={`fill-${stroke.replace("#", "")}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={fill} stopOpacity="0.22" />
            <stop offset="100%" stopColor={fill} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <polygon points={area} fill={`url(#fill-${stroke.replace("#", "")})`} />
        <polyline
          points={line}
          fill="none"
          stroke={stroke}
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </ChartShell>
  );
}

function ReceivableChart({
  bars,
}: {
  bars: MetricLegendItem[];
}) {
  const max = Math.max(...bars.map((item) => Number(item.value) || 0), 1);

  return (
    <ChartShell labels={bars.map((item) => item.label)} leftLabels={["120", "100", "80", "60", "40", "20", "0"]}>
      <div className="flex h-full items-end justify-between gap-5 px-6 pb-4 pt-3">
        {bars.map((item) => (
          <div key={item.label} className="flex h-full flex-1 items-end justify-center">
            <div
              className="w-5 rounded-[4px]"
              style={{
                height: `${Math.max((((Number(item.value) || 0) / max) * 86), Number(item.value) > 0 ? 8 : 2)}%`,
                backgroundColor: item.color,
              }}
            />
          </div>
        ))}
      </div>
    </ChartShell>
  );
}

function SummaryLegend({ items }: { items: MetricLegendItem[] }) {
  return (
    <div className="space-y-3 text-[12px]">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-2 text-slate-600">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: item.color }} />
          <span>{item.label}</span>
          <span className="text-slate-400">:</span>
          <span className="font-medium text-slate-700">{item.value}</span>
        </div>
      ))}
    </div>
  );
}

function NoDataPanel({ text = "No data found." }: { text?: string }) {
  return (
    <div className="flex h-[132px] items-center justify-center text-[11px] text-slate-400">
      {text}
    </div>
  );
}

function SubscriptionSummaryChart({
  labels,
  signups,
  activations,
  cancellations,
  reactivations,
}: {
  labels: string[];
  signups: number[];
  activations: number[];
  cancellations: number[];
  reactivations: number[];
}) {
  return (
    <ChartShell
      labels={labels}
      leftLabels={["1", ""]}
      height={150}
    >
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full">
        {[
          { points: signups, stroke: "#22c55e" },
          { points: activations, stroke: "#2b7fff" },
          { points: cancellations, stroke: "#f97316" },
          { points: reactivations, stroke: "#7c3aed" },
        ].map((series) => {
          const max = Math.max(...series.points, 1);
          const width = 100;
          const baseY = 90;
          const topY = 10;
          const step = series.points.length > 1 ? width / (series.points.length - 1) : width;
          const coords = series.points.map((point, index) => {
            const x = index * step;
            const y = baseY - (point / max) * (baseY - topY);
            return `${x},${y}`;
          });

          return (
            <polyline
              key={series.stroke}
              points={coords.join(" ")}
              fill="none"
              stroke={series.stroke}
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          );
        })}
      </svg>
    </ChartShell>
  );
}

function IncomeExpenseChart({
  labels,
  income,
  receipts,
  expenses,
}: {
  labels: string[];
  income: number[];
  receipts: number[];
  expenses: number[];
}) {
  const groups = labels.map((label, index) => ({
    label,
    bars: [
      { value: income[index] || 0, color: "#22c55e" },
      { value: receipts[index] || 0, color: "#2563eb" },
      { value: expenses[index] || 0, color: "#f2c96b" },
    ],
  }));
  const max = Math.max(...groups.flatMap((group) => group.bars.map((bar) => bar.value)), 1);

  return (
    <ChartShell labels={groups.map((item) => item.label)} leftLabels={["100", "", "", "", "", "0"]} height={150}>
      <div className="flex h-full items-end justify-between px-4 pb-4 pt-3">
        {groups.map((group) => (
          <div key={group.label} className="flex h-full flex-1 items-end justify-center gap-1">
            {group.bars.map((bar, index) => (
              <div
                key={`${group.label}-${index}`}
                className="w-1.5 rounded-[2px]"
                style={{ height: `${((bar.value / max) * 82) || 0}%`, backgroundColor: bar.color }}
              />
            ))}
          </div>
        ))}
      </div>
    </ChartShell>
  );
}

function ExpenseDonut({ items, total }: { items: MetricLegendItem[]; total: number }) {
  const { baseCurrency } = useCurrency();
  const currencyCode = baseCurrency?.code || "USD";
  const active = items[0];
  const totalValue = Math.max(total, 0);
  const activeValue = Number(active?.value) || 0;
  const pct = totalValue > 0 ? Math.round((activeValue / totalValue) * 100) : 0;
  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row sm:justify-center">
      <div
        className="relative flex h-28 w-28 items-center justify-center rounded-full"
        style={{
          background: totalValue > 0 ? `conic-gradient(#29c178 0 ${Math.max(12, pct * 3.6)}deg, #e5e7eb ${Math.max(12, pct * 3.6)}deg 360deg)` : "#f1f5f9",
        }}
      >
        <div className="absolute inset-[9px] rounded-full bg-white" />
        <div className="relative text-center">
          <div className="text-[10px] text-slate-400">All Expenses</div>
          <div className="text-[14px] font-semibold text-slate-800">{formatMoney(activeValue, currencyCode)}</div>
        </div>
      </div>

      <div className="space-y-2 text-[12px] text-slate-600">
        {items.length > 0 ? (
          items.map((item) => (
            <div key={item.label} className="flex min-w-[150px] items-center gap-3">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: item.color }} />
              <span className="flex-1">{item.label}</span>
              <span className="font-medium text-slate-700">{formatMoney(Number(item.value) || 0, currencyCode)}</span>
            </div>
          ))
        ) : (
          <div className="text-slate-400">No expense data found.</div>
        )}
      </div>
    </div>
  );
}

function ProjectsCard({
  project,
  totalUnbilledHours,
  totalUnbilledExpenses,
  currencyCode,
}: {
  project: DashboardSummary["projects"]["topProject"];
  totalUnbilledHours: string;
  totalUnbilledExpenses: number;
  currencyCode: string;
}) {
  const label = project?.budgetLabel || "No budget hours";
  const progress = project?.progress ?? 0;
  const customerName = project?.customerName || "No customer";
  const projectName = project?.name || "No projects found";
  return (
    <div className="overflow-hidden rounded-md border border-slate-200">
      <div className="grid grid-cols-2 border-b border-slate-200">
        <div className="border-r border-slate-200 px-4 py-3 text-center">
          <div className="text-[11px] text-slate-500">Unbilled Hours</div>
          <div className="mt-1 text-[22px] font-semibold text-slate-800">{totalUnbilledHours}</div>
        </div>
        <div className="px-4 py-3 text-center">
          <div className="text-[11px] text-slate-500">Unbilled Expenses</div>
          <div className="mt-1 text-[22px] font-semibold text-slate-800">{formatMoney(totalUnbilledExpenses, currencyCode)}</div>
        </div>
      </div>

      <div className="flex items-center gap-6 px-4 py-5">
        <div className="relative flex h-10 w-10 items-center justify-center rounded-full border-4 border-slate-200 text-[10px] font-semibold text-slate-500">
          {formatPercent(progress)}
        </div>
        <div>
          <div className="text-[12px] text-slate-700">{projectName}</div>
          <div className="text-[11px] text-slate-500">{customerName}</div>
        </div>
        <div className="ml-auto h-3 w-28 rounded-full bg-slate-100 text-center text-[9px] leading-3 text-slate-400">
          {label}
        </div>
      </div>

      <div className="border-t border-slate-200 px-4 py-3 text-[11px] text-slate-500">Show All Projects &gt;</div>
    </div>
  );
}

function DashboardHero({ baseCurrencyCode }: { baseCurrencyCode?: string } = {}) {
  const [activeTab, setActiveTab] = useState<"dashboard" | "getting-started" | "recent-updates">("dashboard");
  const [pageRange, setPageRange] = useState("Last 12 months");
  const { user } = useUser();
  const { settings } = useSettings();
  const { baseCurrency } = useCurrency();

  const displayName = user?.name || "User";
  const displayEmail = user?.email || "";
  const avatarSrc = String(user?.photoUrl || "").trim();
  const organizationName =
    settings?.general?.companyDisplayName || settings?.general?.schoolDisplayName || "Organization";
  const resolvedCurrencyCode = String(baseCurrencyCode || baseCurrency?.code || "").trim().toUpperCase();

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div
        className="border-b border-slate-200 px-5 pt-5"
        style={{
          backgroundColor: "#fbfbfe",
          backgroundImage: `
            radial-gradient(circle at 18px 18px, rgba(99,102,241,0.08) 1px, transparent 1.5px),
            linear-gradient(30deg, transparent 0 46%, rgba(99,102,241,0.05) 46% 54%, transparent 54% 100%)
          `,
          backgroundSize: "40px 40px, 72px 72px",
        }}
      >
        <div className="flex flex-col gap-4 pb-4 md:flex-row md:items-start md:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm">
              {avatarSrc ? (
                <img src={avatarSrc} alt={`${displayName} avatar`} className="h-full w-full object-cover" />
              ) : (
                <FileText size={22} />
              )}
            </div>
            <div>
              <h1 className="text-[18px] font-medium text-slate-900">{`Hello, ${displayName}`}</h1>
              {displayEmail ? <div className="mt-1 text-[13px] text-slate-500">{displayEmail}</div> : null}
              <div className="mt-1 text-[14px] text-slate-500">{organizationName}</div>
              {resolvedCurrencyCode ? (
                <div className="mt-2 inline-flex items-center rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 shadow-sm">
                  Base currency: {resolvedCurrencyCode}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6 text-[15px]">
          <button
            type="button"
            onClick={() => setActiveTab("dashboard")}
            className={`relative pb-4 transition-colors ${activeTab === "dashboard" ? "text-slate-900" : "text-slate-600 hover:text-slate-800"}`}
          >
            Dashboard
            {activeTab === "dashboard" ? <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-[#4f8df7]" /> : null}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("getting-started")}
            className={`relative pb-4 transition-colors ${activeTab === "getting-started" ? "text-slate-900" : "text-slate-600 hover:text-slate-800"}`}
          >
            Getting Started
            {activeTab === "getting-started" ? <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-[#4f8df7]" /> : null}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("recent-updates")}
            className={`relative pb-4 transition-colors ${activeTab === "recent-updates" ? "text-slate-900" : "text-slate-600 hover:text-slate-800"}`}
          >
            Recent Updates
            {activeTab === "recent-updates" ? <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-[#4f8df7]" /> : null}
          </button>
        </div>
      </div>

      <div className="px-5 py-6">
        <div className="inline-flex overflow-hidden rounded-md border border-slate-300 bg-white shadow-sm">
          <div className="border-r border-slate-300 px-4 py-2 text-[14px] text-slate-700">Date Range</div>
          <RangeSelect
            value={pageRange}
            onChange={setPageRange}
            className="[&_button]:h-full [&_button]:rounded-none [&_button]:border-none [&_button]:bg-white [&_button]:px-4 [&_button]:py-2 [&_button]:text-[14px] [&_button]:text-slate-700 hover:[&_button]:bg-slate-50"
          />
        </div>
      </div>
    </div>
  );
}

export default function OverviewPage() {
  const { loading: permissionsLoading, canView } = usePermissions();
  const { baseCurrency } = useCurrency();
  const canViewDashboard = canView("dashboard", "View Dashboard");
  const canViewProjects = canView("dashboard", "Projects");
  const canViewSalesAndExpenses = canView("dashboard", "Sales and Expenses");
  const canViewTopExpense = canView("dashboard", "Your Top Expense");
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  useEffect(() => {
    if (permissionsLoading) return;
    if (!canViewDashboard) {
      setSummaryLoading(false);
      return;
    }

    let cancelled = false;
    const loadSummary = async () => {
      setSummaryLoading(true);
      setSummaryError(null);
      try {
        const response = await dashboardAPI.getSummary();
        if (cancelled) return;
        if (response?.success && response.data) {
          setSummary(response.data as DashboardSummary);
        } else {
          setSummary(EMPTY_SUMMARY);
          setSummaryError(response?.message || "Failed to load dashboard data.");
        }
      } catch (error: any) {
        if (cancelled) return;
        setSummary(EMPTY_SUMMARY);
        setSummaryError(error?.message || "Failed to load dashboard data.");
      } finally {
        if (!cancelled) setSummaryLoading(false);
      }
    };

    void loadSummary();

    return () => {
      cancelled = true;
    };
  }, [permissionsLoading, canViewDashboard]);

  if (permissionsLoading) {
    return (
      <div className="mr-auto w-full max-w-[1500px] space-y-4 px-4 py-4 pr-7 md:px-5 md:pr-10 xl:pr-16 2xl:pr-20">
        <DashboardHero baseCurrencyCode={baseCurrency?.code} />
        <Card className="border-slate-200 p-8 text-sm text-slate-500">Checking dashboard permissions...</Card>
      </div>
    );
  }

  if (!canViewDashboard) {
    return (
      <div className="mr-auto w-full max-w-[1500px] px-4 py-4 pr-7 md:px-5 md:pr-10 xl:pr-16 2xl:pr-20">
        <AccessDenied
          title="Dashboard access required"
          message="Your role does not include permission to view the dashboard."
        />
      </div>
    );
  }

  const dashboardData = summary || EMPTY_SUMMARY;
  const dashboardCurrencyCode =
    String(dashboardData.organization?.baseCurrency || baseCurrency?.code || "USD").trim().toUpperCase() || "USD";
  const receivableBars = dashboardData.metrics.receivables.labels.map((label, index) => ({
    label,
    value: String(dashboardData.metrics.receivables.values[index] || 0),
    color: index === 0 ? "#2563eb" : index === 1 ? "#f2c96b" : "#cbd5e1",
  }));

  return (
    <div className="mr-auto w-full max-w-[1500px] space-y-4 px-4 py-4 pr-7 md:px-5 md:pr-10 xl:pr-16 2xl:pr-20">
      <DashboardHero baseCurrencyCode={dashboardCurrencyCode} />

      {summaryError ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {summaryError}
        </div>
      ) : null}

      {summaryLoading ? (
        <Card className="border-slate-200 p-8 text-sm text-slate-500">Loading dashboard data from the database...</Card>
      ) : (
        <>
          <div className="grid gap-4 xl:grid-cols-2">
            <SectionCard title="Net Revenue">
              <MetricHeader value={formatMoney(dashboardData.metrics.netRevenue.total, dashboardCurrencyCode)} />
              <LineAreaChart
                points={dashboardData.metrics.netRevenue.values}
                stroke="#16c47f"
                fill="#16c47f"
                labels={dashboardData.metrics.netRevenue.labels}
                leftLabels={["10", "8", "6", "4", "2", "0"]}
              />
            </SectionCard>

            <SectionCard title="Receivable Summary">
              <div className="mb-4 flex flex-col gap-4 md:flex-row md:justify-between">
                <div>
                  <div className="text-[12px] text-slate-500">Total Receivables</div>
                  <div className="mt-1 text-[17px] font-semibold text-slate-900">
                    {formatMoney(dashboardData.metrics.receivables.total, dashboardCurrencyCode)}
                  </div>
                </div>
                <SummaryLegend
                  items={[
                    { label: "Current", value: formatMoney(dashboardData.metrics.receivables.current, dashboardCurrencyCode), color: "#2563eb" },
                    { label: "Overdue", value: formatMoney(dashboardData.metrics.receivables.overdue, dashboardCurrencyCode), color: "#f97316" },
                  ]}
                />
              </div>
              <ReceivableChart bars={receivableBars} />
            </SectionCard>
          </div>

          <div className="grid gap-4 xl:grid-cols-[2fr_1fr_1fr]">
            <SectionCard title="MRR">
              <MetricHeader value={formatMoney(dashboardData.metrics.mrr.total, dashboardCurrencyCode)} />
              <LineAreaChart
                points={dashboardData.metrics.mrr.values}
                stroke="#16c47f"
                fill="#16c47f"
                labels={dashboardData.metrics.mrr.labels}
                leftLabels={["20", "15", "10", "5", "0"]}
              />
            </SectionCard>

            <div className="grid gap-4">
              <SectionCard title="Active Subscriptions">
                <MetricHeader value={String(dashboardData.metrics.activeSubscriptions.total)} />
                <LineAreaChart
                  points={dashboardData.metrics.activeSubscriptions.values}
                  stroke="#2b7fff"
                  fill="#2b7fff"
                  labels={dashboardData.metrics.activeSubscriptions.labels}
                  height={92}
                />
              </SectionCard>

              <SectionCard title="Churn Rate">
                <MetricHeader
                  value={formatPercent(dashboardData.metrics.churnRate.total)}
                  sublabel="Month On Month"
                  right={<div className="pt-1 text-[11px] text-slate-500">On {dashboardData.metrics.churnRate.asOf || "today"}</div>}
                />
                {isMeaningfulSeries(dashboardData.metrics.churnRate.values) ? (
                  <LineAreaChart
                    points={dashboardData.metrics.churnRate.values}
                    stroke="#f97316"
                    fill="#f97316"
                    labels={dashboardData.metrics.churnRate.labels}
                    height={92}
                  />
                ) : (
                  <NoDataPanel />
                )}
              </SectionCard>
            </div>

            <div className="grid gap-4">
              <SectionCard title="ARPU">
                <MetricHeader value={formatMoney(dashboardData.metrics.arpu.total, dashboardCurrencyCode)} />
                <LineAreaChart
                  points={dashboardData.metrics.arpu.values}
                  stroke="#16c47f"
                  fill="#16c47f"
                  labels={dashboardData.metrics.arpu.labels}
                  height={92}
                />
              </SectionCard>

              <SectionCard title="LTV">
                <MetricHeader
                  value={formatMoney(dashboardData.metrics.ltv.total, dashboardCurrencyCode)}
                  sublabel="Month On Month"
                  right={<div className="pt-1 text-[11px] text-slate-500">On {dashboardData.metrics.ltv.asOf || "today"}</div>}
                />
                {isMeaningfulSeries(dashboardData.metrics.ltv.values) ? (
                  <LineAreaChart
                    points={dashboardData.metrics.ltv.values}
                    stroke="#16c47f"
                    fill="#16c47f"
                    labels={dashboardData.metrics.ltv.labels}
                    height={92}
                  />
                ) : (
                  <NoDataPanel />
                )}
              </SectionCard>
            </div>
          </div>

          <SectionCard title="Subscription Summary" className="xl:col-span-1">
            <div className="mb-4 grid gap-4 text-[12px] text-slate-600 sm:grid-cols-4">
              {[
                { label: "Signups", value: String(dashboardData.subscriptionSummary.signups), color: "#22c55e" },
                { label: "Activations", value: String(dashboardData.subscriptionSummary.activations), color: "#2563eb" },
                { label: "Cancellations", value: String(dashboardData.subscriptionSummary.cancellations), color: "#f97316" },
                { label: "Reactivations", value: String(dashboardData.subscriptionSummary.reactivations), color: "#7c3aed" },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: item.color }} />
                  <span>{item.label}</span>
                  <span className="ml-auto text-[16px] font-semibold text-slate-800">{item.value}</span>
                </div>
              ))}
            </div>
            <SubscriptionSummaryChart
              labels={dashboardData.subscriptionSummary.series.labels}
              signups={dashboardData.subscriptionSummary.series.signups}
              activations={dashboardData.subscriptionSummary.series.activations}
              cancellations={dashboardData.subscriptionSummary.series.cancellations}
              reactivations={dashboardData.subscriptionSummary.series.reactivations}
            />
          </SectionCard>

          {canViewSalesAndExpenses || canViewTopExpense ? (
            <div className="grid gap-4 xl:grid-cols-2">
              {canViewSalesAndExpenses ? (
                <SectionCard title="Income and Expense" range="Last 12 Months">
                  <div className="mb-4 flex flex-wrap items-center gap-5 text-[12px]">
                    {[
                      { label: "Total Income", value: formatMoney(dashboardData.incomeExpense.totalIncome, dashboardCurrencyCode), color: "#22c55e" },
                      { label: "Total Receipts", value: formatMoney(dashboardData.incomeExpense.totalReceipts, dashboardCurrencyCode), color: "#2563eb" },
                      { label: "Total Expenses", value: formatMoney(dashboardData.incomeExpense.totalExpenses, dashboardCurrencyCode), color: "#f2c96b" },
                    ].map((item) => (
                      <div key={item.label} className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: item.color }} />
                        <span className="text-slate-500">{item.label}</span>
                        <span className="font-medium text-slate-800">{item.value}</span>
                      </div>
                    ))}
                  </div>
                  <IncomeExpenseChart
                    labels={dashboardData.incomeExpense.labels}
                    income={dashboardData.incomeExpense.income}
                    receipts={dashboardData.incomeExpense.receipts}
                    expenses={dashboardData.incomeExpense.expenses}
                  />
                </SectionCard>
              ) : (
                <div />
              )}

              {canViewTopExpense ? (
                <SectionCard title="Top Expenses" range="Last 12 Months">
                  <ExpenseDonut items={dashboardData.topExpenses.items} total={dashboardData.topExpenses.total} />
                </SectionCard>
              ) : (
                <div />
              )}
            </div>
          ) : null}

          {canViewProjects ? (
            <div className="grid gap-4 xl:grid-cols-2">
              <SectionCard title="Projects" range="">
                <ProjectsCard
                  project={dashboardData.projects.topProject}
                  totalUnbilledHours={dashboardData.projects.totalUnbilledHours}
                  totalUnbilledExpenses={dashboardData.projects.totalUnbilledExpenses}
                  currencyCode={dashboardCurrencyCode}
                />
              </SectionCard>
              <div />
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
