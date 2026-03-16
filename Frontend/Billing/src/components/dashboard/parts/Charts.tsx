import React, { useState } from "react";
import { cx } from "./SectionBits";

/* Zero-state line */
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

/* Receivables bar with tooltip for the tall bar */
export const SingleBar = () => {
  const [tip, setTip] = useState(null); // {x,y,text}
  return (
    <div
      className="relative h-56 w-full rounded-md border border-slate-200 bg-white px-8 pb-6 pt-8"
      onMouseLeave={() => setTip(null)}
    >
      <div className="absolute inset-0 grid grid-rows-5">
        {[...Array(5)].map((_, i) => (
          <div key={i} className={cx("border-b", i === 4 ? "border-transparent" : "border-slate-100")} />
        ))}
      </div>

      <div className="relative flex h-full items-end justify-between">
        {["Current", "1-15", "16-30", "31-45", ">45"].map((lab, i) => (
          <div key={lab} className="flex w-[18%] flex-col items-center gap-2">
            <div
              className={cx("w-10 rounded-sm", i === 1 ? "h-44 bg-amber-400" : "h-8 bg-slate-200")}
              onMouseMove={(e) => {
                if (i !== 1) return setTip(null);
                const rect = e.currentTarget.getBoundingClientRect();
                setTip({
                  x: e.clientX - rect.left + rect.left,
                  y: rect.top - 8,
                  text: "$86.00 — 1–15 days",
                });
              }}
            />
            <div className="text-[11px] text-slate-500">{lab}</div>
          </div>
        ))}
      </div>

      {tip && (
        <div
          className="pointer-events-none absolute z-30 -translate-x-1/2 -translate-y-full rounded-md border border-slate-200 bg-white px-3 py-2 text-[12px] text-slate-700 shadow-lg"
          style={{ left: tip.x, top: tip.y }}
        >
          {tip.text}
        </div>
      )}
    </div>
  );
};

/* Donut with hover tooltip on the green ring */
export const Donut = ({ percent = 93.89, title = "Travel Expense", value = "$3,412,139.70" }) => {
  const [show, setShow] = useState(false);
  return (
    <div className="relative h-52 w-52">
      <div
        className="absolute inset-0 rounded-full"
        style={{ background: `conic-gradient(#10b981 ${Math.round((percent/100)*360)}deg, #f97316 0)` }}
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
      />
      <div className="absolute inset-4 rounded-full bg-white" />
      <div className="absolute inset-0 flex items-center justify-center text-[12px] font-semibold text-slate-600">
        TOP EXPENSES
      </div>

      {show && (
        <div className="absolute left-1/2 top-0 z-30 -translate-x-1/2 -translate-y-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-[12px] text-slate-700 shadow-lg">
          <div className="font-semibold">{value}</div>
          <div className="text-slate-500">{title} ({percent}%)</div>
        </div>
      )}
    </div>
  );
};
