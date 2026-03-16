import React from "react";
import DateRangePicker from "./DateRangePicker";

export const cx = (...xs) => xs.filter(Boolean).join(" ");

export const YoY = () => (
  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-[2px] text-[11px] font-medium text-slate-600">
    0% <span className="hidden sm:inline">Year On Year</span>
  </span>
);

export const SectionTitle = ({ icon: Icon, children, right }) => (
  <div className="mb-3 flex items-center justify-between">
    <div className="flex items-center gap-2">
      {Icon ? <Icon size={18} className="text-slate-700" /> : null}
      <h3 className="text-[13px] font-semibold text-slate-800">{children}</h3>
    </div>
    {right}
  </div>
);

/* NEW: keep old name `RangeSelect` but render the real picker */
export const RangeSelect = ({ value = "Last 12 months", onChange, className }) => (
  <DateRangePicker value={value} onChange={onChange} className={className} />
);
