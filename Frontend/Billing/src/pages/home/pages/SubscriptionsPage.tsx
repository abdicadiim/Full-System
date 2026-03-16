import React from "react";
import Card from "../../../components/ui/Card";
import { SectionTitle, RangeSelect } from "../../../components/dashboard/parts/SectionBits";
import { ZeroLine } from "../../../components/dashboard/parts/Charts";
import { LineChart } from "lucide-react";

export default function SubscriptionsPage() {
  return (
    <Card className="p-5">
      <SectionTitle icon={LineChart} right={<RangeSelect />}>Subscription Summary</SectionTitle>

      <div className="mb-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { k: "Signups", c: "bg-emerald-500" },
          { k: "Activations", c: "bg-blue-500" },
          { k: "Cancellations", c: "bg-rose-500" },
          { k: "Reactivations", c: "bg-indigo-500" },
        ].map(({ k, c }) => (
          <div key={k} className="flex items-center gap-2">
            <span className={`h-3 w-1.5 rounded-sm ${c}`} />
            <div className="text-[13px] text-slate-600">{k}</div>
            <div className="ml-auto text-[13px] font-semibold text-slate-800">0</div>
          </div>
        ))}
      </div>

      <ZeroLine />
    </Card>
  );
}
