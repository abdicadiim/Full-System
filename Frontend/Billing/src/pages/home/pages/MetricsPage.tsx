import React from "react";
import Card from "../../../components/ui/Card";
import { SectionTitle, RangeSelect, YoY } from "../../../components/dashboard/parts/SectionBits";
import { ZeroLine } from "../../../components/dashboard/parts/Charts";
import { BarChart3, Users, CreditCard, TrendingDown, TrendingUp } from "lucide-react";

export default function MetricsPage() {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-4">
      <Card className="p-5">
        <SectionTitle icon={BarChart3} right={<RangeSelect />}>MRR</SectionTitle>
        <div className="text-3xl font-semibold">$0.00</div>
        <div className="mt-2"><YoY /></div>
        <div className="mt-4"><ZeroLine /></div>
      </Card>

      <Card className="p-5">
        <SectionTitle icon={Users} right={<RangeSelect />}>Active Subscriptions</SectionTitle>
        <div className="text-3xl font-semibold">0</div>
        <div className="mt-2"><YoY /></div>
        <div className="mt-4"><ZeroLine /></div>
      </Card>

      <Card className="p-5">
        <SectionTitle icon={CreditCard} right={<RangeSelect />}>ARPU</SectionTitle>
        <div className="text-3xl font-semibold">$0.00</div>
        <div className="mt-2"><YoY /></div>
        <div className="mt-4"><ZeroLine /></div>
      </Card>

      <Card className="p-5">
        <SectionTitle icon={TrendingDown} right={<RangeSelect />}>Churn Rate</SectionTitle>
        <div className="flex items-baseline gap-2"><div className="text-3xl font-semibold">0.00%</div><div className="text-[12px] text-slate-500">On Nov 2025</div></div>
        <div className="mt-2"><YoY /></div>
        <div className="mt-4"><ZeroLine /></div>
      </Card>

      <Card className="p-5 lg:col-span-2 xl:col-span-4">
        <SectionTitle icon={TrendingUp} right={<RangeSelect />}>LTV</SectionTitle>
        <div className="flex items-baseline gap-2"><div className="text-3xl font-semibold">$0.00</div><div className="text-[12px] text-slate-500">On Nov 2025</div></div>
        <div className="mt-2"><YoY /></div>
        <div className="mt-4"><ZeroLine /></div>
      </Card>
    </div>
  );
}
