import React from "react";
import Card from "../../../components/ui/Card";
import { SectionTitle, RangeSelect, cx } from "../../../components/dashboard/parts/SectionBits";
import { Donut } from "../../../components/dashboard/parts/Charts";
import { BarChart3, PieChart } from "lucide-react";

export default function FinancePage() {
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <Card className="p-5">
        <SectionTitle icon={BarChart3} right={<RangeSelect />}>Income and Expense</SectionTitle>

        <div className="mb-3 flex flex-wrap items-center gap-6 text-[12px]">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span className="text-slate-600">Total Income</span>
            <span className="font-semibold text-slate-800">$185.00</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-blue-500" />
            <span className="text-slate-600">Total Receipts</span>
            <span className="font-semibold text-slate-800">$1,099.00</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-amber-400" />
            <span className="text-slate-600">Total Expenses</span>
            <span className="font-semibold text-slate-800">$3,634,361.00</span>
          </div>
        </div>

        <div className="relative h-64 w-full rounded-md border border-slate-200 bg-white">
          <div className="absolute inset-0 grid grid-rows-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className={cx("border-b", i === 5 ? "border-transparent" : "border-slate-100")} />
            ))}
          </div>
          <div className="absolute bottom-6 right-10 h-48 w-6 rounded bg-amber-400" />
        </div>
      </Card>

      <Card className="p-5">
        <SectionTitle icon={PieChart} right={<RangeSelect />}>Top Expenses</SectionTitle>
        <div className="flex flex-col items-center gap-6 lg:flex-row">
          <div className="flex items-center justify-center lg:w-1/2">
            <Donut percent={93.89} />
          </div>
          <div className="lg:w-1/2">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <div className="flex-1 text-[13px] text-slate-700">Travel Expense</div>
                <div className="text-[13px] font-semibold text-slate-800">$3,412,139.70</div>
              </div>
              <div className="flex items-center gap-3">
                <span className="h-2 w-2 rounded-full bg-rose-500" />
                <div className="flex-1 text-[13px] text-slate-700">Fuel/Mileage Expense</div>
                <div className="text-[13px] font-semibold text-slate-800">$222,222.00</div>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
