import React from "react";
import Card from "../../ui/Card";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import { YoY } from "./SectionBits";

export default function Stat({ label, value, delta, up = true, icon: Icon }) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <div className="text-[12px] text-slate-500">{label}</div>
        {Icon ? <Icon size={16} className="text-slate-400" /> : null}
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <div className="text-2xl font-semibold">{value}</div>
        <div className={`flex items-center gap-1 text-[12px] ${up ? "text-emerald-600" : "text-rose-600"}`}>
          {up ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
          <span>{delta}</span>
        </div>
      </div>
      <div className="mt-3"><YoY /></div>
    </Card>
  );
}
