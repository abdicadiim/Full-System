import React, { useState } from "react";
import { FileText } from "lucide-react";
import Card from "../../../components/ui/Card";
import { RangeSelect } from "../../../components/dashboard/parts/SectionBits";

type MetricLegendItem = {
  label: string;
  value: string;
  color: string;
};

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
            {leftLabels.map((label) => (
              <span key={label}>{label}</span>
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
          {labels.map((label) => (
            <div key={label} className="text-center leading-tight">
              {label.split("\n").map((part) => (
                <div key={part}>{part}</div>
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

function ReceivableChart() {
  const bars = [
    { label: "Current", value: 12, color: "#2563eb" },
    { label: "1-15", value: 122, color: "#f2c96b" },
    { label: "15-30", value: 0, color: "#cbd5e1" },
    { label: "31-45", value: 0, color: "#cbd5e1" },
    { label: ">45", value: 0, color: "#cbd5e1" },
  ];
  const max = Math.max(...bars.map((item) => item.value), 1);

  return (
    <ChartShell labels={bars.map((item) => item.label)} leftLabels={["120", "100", "80", "60", "40", "20", "0"]}>
      <div className="flex h-full items-end justify-between gap-5 px-6 pb-4 pt-3">
        {bars.map((item) => (
          <div key={item.label} className="flex h-full flex-1 items-end justify-center">
            <div
              className="w-5 rounded-[4px]"
              style={{
                height: `${Math.max((item.value / max) * 86, item.value > 0 ? 8 : 2)}%`,
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

function SubscriptionSummaryChart() {
  return (
    <ChartShell
      labels={["Dec\n2025", "Jan\n2026", "Feb\n2026", "Mar\n2026"]}
      leftLabels={["1", ""]}
      height={150}
    >
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full">
        <polyline
          points="0,88 33,88 50,58 67,20 100,20"
          fill="none"
          stroke="#2b7fff"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <polyline
          points="0,89 33,89 67,89 100,89"
          fill="none"
          stroke="#7c3aed"
          strokeWidth="1"
          strokeLinecap="round"
        />
        <polyline
          points="0,89 33,89 67,89 100,89"
          fill="none"
          stroke="#f97316"
          strokeWidth="1"
          strokeLinecap="round"
        />
        <polyline
          points="0,89 33,89 67,89 100,89"
          fill="none"
          stroke="#22c55e"
          strokeWidth="1"
          strokeLinecap="round"
        />
      </svg>
    </ChartShell>
  );
}

function IncomeExpenseChart() {
  const groups = [
    { label: "Mar\n2025", bars: [] },
    { label: "May\n2025", bars: [] },
    { label: "Jul\n2025", bars: [] },
    { label: "Sep\n2025", bars: [] },
    { label: "Nov\n2025", bars: [] },
    {
      label: "Jan\n2026",
      bars: [
        { value: 10, color: "#22c55e" },
        { value: 12, color: "#2563eb" },
        { value: 4, color: "#f2c96b" },
      ],
    },
    {
      label: "Mar\n2026",
      bars: [
        { value: 124, color: "#22c55e" },
        { value: 106, color: "#2563eb" },
        { value: 80, color: "#f2c96b" },
      ],
    },
  ];
  const max = 130;

  return (
    <ChartShell labels={groups.map((item) => item.label)} leftLabels={["100", "", "", "", "", "0"]} height={150}>
      <div className="flex h-full items-end justify-between px-4 pb-4 pt-3">
        {groups.map((group) => (
          <div key={group.label} className="flex h-full flex-1 items-end justify-center gap-1">
            {group.bars.map((bar, index) => (
              <div
                key={`${group.label}-${index}`}
                className="w-1.5 rounded-[2px]"
                style={{ height: `${(bar.value / max) * 82}%`, backgroundColor: bar.color }}
              />
            ))}
          </div>
        ))}
      </div>
    </ChartShell>
  );
}

function ExpenseDonut() {
  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row sm:justify-center">
      <div className="relative flex h-28 w-28 items-center justify-center rounded-full bg-[conic-gradient(#29c178_0_320deg,#e5e7eb_320deg_360deg)]">
        <div className="absolute inset-[9px] rounded-full bg-white" />
        <div className="relative text-center">
          <div className="text-[10px] text-slate-400">All Expenses</div>
          <div className="text-[14px] font-semibold text-slate-800">AMD13.32</div>
        </div>
      </div>

      <div className="flex min-w-[150px] items-center gap-3 text-[12px] text-slate-600">
        <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500" />
        <span className="flex-1">Automobile Expense</span>
        <span className="font-medium text-slate-700">AMD13.32</span>
      </div>
    </div>
  );
}

function ProjectsCard() {
  return (
    <div className="overflow-hidden rounded-md border border-slate-200">
      <div className="grid grid-cols-2 border-b border-slate-200">
        <div className="border-r border-slate-200 px-4 py-3 text-center">
          <div className="text-[11px] text-slate-500">Unbilled Hours</div>
          <div className="mt-1 text-[22px] font-semibold text-slate-800">04:00</div>
        </div>
        <div className="px-4 py-3 text-center">
          <div className="text-[11px] text-slate-500">Unbilled Expenses</div>
          <div className="mt-1 text-[22px] font-semibold text-slate-800">AMD12.21</div>
        </div>
      </div>

      <div className="flex items-center gap-6 px-4 py-5">
        <div className="relative flex h-10 w-10 items-center justify-center rounded-full border-4 border-slate-200 text-[10px] font-semibold text-slate-500">
          0%
        </div>
        <div>
          <div className="text-[12px] text-slate-700">sdf</div>
          <div className="text-[11px] text-slate-500">Taban Enterprise</div>
        </div>
        <div className="ml-auto h-3 w-28 rounded-full bg-slate-100 text-center text-[9px] leading-3 text-slate-400">
          No budget hours
        </div>
      </div>

      <div className="border-t border-slate-200 px-4 py-3 text-[11px] text-slate-500">Show All Projects &gt;</div>
    </div>
  );
}

function DashboardHero() {
  const [activeTab, setActiveTab] = useState<"dashboard" | "getting-started" | "recent-updates">("dashboard");
  const [pageRange, setPageRange] = useState("Last 12 months");

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
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm">
              <FileText size={22} />
            </div>
            <div>
              <h1 className="text-[18px] font-medium text-slate-900">Hello, Zouhair Yare</h1>
              <div className="mt-1 text-[14px] text-slate-500">asddc</div>
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
  return (
    <div className="mr-auto w-full max-w-[1500px] space-y-4 px-4 py-4 pr-7 md:px-5 md:pr-10 xl:pr-16 2xl:pr-20">
      <DashboardHero />

      <div className="grid gap-4 xl:grid-cols-2">
        <SectionCard title="Net Revenue">
          <MetricHeader value="AMD10.00" />
          <LineAreaChart
            points={[0, 0, 10, 0]}
            stroke="#16c47f"
            fill="#16c47f"
            labels={["Dec\n2025", "Jan\n2026", "Feb\n2026", "Mar\n2026"]}
            leftLabels={["10", "8", "6", "4", "2", "0"]}
          />
        </SectionCard>

        <SectionCard title="Receivable Summary">
          <div className="mb-4 flex flex-col gap-4 md:flex-row md:justify-between">
            <div>
              <div className="text-[12px] text-slate-500">Total Receivables</div>
              <div className="mt-1 text-[17px] font-semibold text-slate-900">AMD135.01</div>
            </div>
            <SummaryLegend
              items={[
                { label: "Current", value: "AMD12.21", color: "#2563eb" },
                { label: "Overdue", value: "AMD122.80", color: "#f97316" },
              ]}
            />
          </div>
          <ReceivableChart />
        </SectionCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-[2fr_1fr_1fr]">
        <SectionCard title="MRR">
          <MetricHeader value="AMD23.00" />
          <LineAreaChart
            points={[0, 0, 12, 23]}
            stroke="#16c47f"
            fill="#16c47f"
            labels={["Dec\n2025", "Jan\n2026", "Feb\n2026", "Mar\n2026"]}
            leftLabels={["20", "15", "10", "5", "0"]}
          />
        </SectionCard>

        <div className="grid gap-4">
          <SectionCard title="Active Subscriptions">
            <MetricHeader value="2" />
            <LineAreaChart
              points={[0, 0, 1, 2]}
              stroke="#2b7fff"
              fill="#2b7fff"
              labels={["", "", "", ""]}
              height={92}
            />
          </SectionCard>

          <SectionCard title="Churn Rate">
            <MetricHeader value="0.00%" sublabel="Month On Month" right={<div className="pt-1 text-[11px] text-slate-500">On Mar 2026</div>} />
            <NoDataPanel />
          </SectionCard>
        </div>

        <div className="grid gap-4">
          <SectionCard title="ARPU">
            <MetricHeader value="AMD11.50" />
            <LineAreaChart
              points={[0, 0, 1, 1]}
              stroke="#16c47f"
              fill="#16c47f"
              labels={["", "", "", ""]}
              height={92}
            />
          </SectionCard>

          <SectionCard title="LTV">
            <MetricHeader value="AMD0.00" sublabel="Month On Month" right={<div className="pt-1 text-[11px] text-slate-500">On Mar 2026</div>} />
            <NoDataPanel />
          </SectionCard>
        </div>
      </div>

      <SectionCard title="Subscription Summary" className="xl:col-span-1">
        <div className="mb-4 grid gap-4 text-[12px] text-slate-600 sm:grid-cols-4">
          {[
            { label: "Signups", value: "2", color: "#22c55e" },
            { label: "Activations", value: "2", color: "#2563eb" },
            { label: "Cancellations", value: "0", color: "#f97316" },
            { label: "Reactivations", value: "0", color: "#7c3aed" },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: item.color }} />
              <span>{item.label}</span>
              <span className="ml-auto text-[16px] font-semibold text-slate-800">{item.value}</span>
            </div>
          ))}
        </div>
        <SubscriptionSummaryChart />
      </SectionCard>

      <div className="grid gap-4 xl:grid-cols-2">
        <SectionCard title="Income and Expense" range="Last 12 Months">
          <div className="mb-4 flex flex-wrap items-center gap-5 text-[12px]">
            {[
              { label: "Total Income", value: "AMD145.01", color: "#22c55e" },
              { label: "Total Receipts", value: "AMD120.69", color: "#2563eb" },
              { label: "Total Expenses", value: "AMD80.53", color: "#f2c96b" },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: item.color }} />
                <span className="text-slate-500">{item.label}</span>
                <span className="font-medium text-slate-800">{item.value}</span>
              </div>
            ))}
          </div>
          <IncomeExpenseChart />
        </SectionCard>

        <SectionCard title="Top Expenses" range="Last 12 Months">
          <ExpenseDonut />
        </SectionCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <SectionCard title="Projects" range="">
          <ProjectsCard />
        </SectionCard>
        <div />
      </div>
    </div>
  );
}
