import React from "react";

export const cx = (...xs) => xs.filter(Boolean).join(" ");

export const YoY = () => (
  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-[2px] text-[11px] font-medium text-slate-600">
    0% <span className="hidden sm:inline">Year On Year</span>
  </span>
);

export const RangeSelect = ({ label = "Last 12 months" }) => (
  <button className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-[12px] text-slate-600 hover:bg-slate-50">
    {label}
    <svg width="14" height="14" viewBox="0 0 20 20" className="text-slate-500">
      <path fill="currentColor" d="M5 7l5 6 5-6z" />
    </svg>
  </button>
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
