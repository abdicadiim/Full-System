import React from "react";
import { cx } from "./SectionBits";

/* zero-state line area */
export const ZeroLine = () => (
  <div className="relative h-56 w-full rounded-md border border-slate-200 bg-white">
    <div className="absolute inset-0 grid grid-rows-5">
      {[...Array(5)].map((_, i) => (
        <div key={i} className={cx("border-b", i === 4 ? "border-transparent" : "border-slate-100")} />
      ))}
    </div>
    <div className="absolute inset-0 flex items-center justify-center text-[12px] text-slate-400">
      No data found.
    </div>
  </div>
);

/* receivables aging — one tall bar in 1–15 */
export const SingleBar = () => (
  <div className="relative h-56 w-full rounded-md border border-slate-200 bg-white px-8 pb-6 pt-8">
    <div className="absolute inset-0 grid grid-rows-5">
      {[...Array(5)].map((_, i) => (
        <div key={i} className={cx("border-b", i === 4 ? "border-transparent" : "border-slate-100")} />
      ))}
    </div>
    <div className="relative flex h-full items-end justify-between">
      {["Current", "1-15", "16-30", "31-45", ">45"].map((lab, i) => (
        <div key={lab} className="flex w-[18%] flex-col items-center gap-2">
          <div className={cx("w-10 rounded-sm", i === 1 ? "h-44 bg-amber-400" : "h-8 bg-slate-200")} />
          <div className="text-[11px] text-slate-500">{lab}</div>
        </div>
      ))}
    </div>
  </div>
);

/* donut for top expenses */
export const Donut = ({ percent = 93.89 }) => {
  const angle = Math.round((percent / 100) * 360);
  return (
    <div className="relative h-52 w-52">
      <div className="absolute inset-0 rounded-full" style={{ background: `conic-gradient(#10b981 ${angle}deg, #f97316 0)` }} />
      <div className="absolute inset-4 rounded-full bg-white" />
      <div className="absolute inset-0 flex items-center justify-center text-[12px] font-semibold text-slate-600">
        TOP EXPENSES
      </div>
    </div>
  );
};
