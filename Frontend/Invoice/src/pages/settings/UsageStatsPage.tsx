import React from "react";
import { FileText, User, BookOpen } from "lucide-react";

// ------------------------------------------------------------------
// Progress bar component
// ------------------------------------------------------------------
function UsageBar({ used, max }: { used: number; max: number }) {
  const pct = max > 0 ? Math.min((used / max) * 100, 100) : 0;
  const color =
    pct >= 90 ? "#ef4444" : pct >= 70 ? "#f97316" : "#408dfb";
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-xs text-gray-400 whitespace-nowrap">
        {used} / {max}
      </span>
    </div>
  );
}

const usageItems = [
  { label: "Invoice", used: 6, max: 500, icon: FileText },
  { label: "Users", used: 2, max: 2, icon: User },
  { label: "Project", used: 2, max: 3, icon: BookOpen },
];

// ------------------------------------------------------------------
// Main Page
// ------------------------------------------------------------------
export default function UsageStatsPage() {
  return (
    <div className="p-6 max-w-4xl">
      {/* Page title */}
      <div className="mb-2 pb-4 border-b border-gray-200">
        <h1 className="text-2xl font-semibold text-gray-900">Usage Stats</h1>
      </div>

      {/* ── PLAN DETAILS ─────────────────────────────────────────── */}
      <section className="py-8">
        <p className="text-xs font-semibold tracking-widest uppercase text-gray-400 mb-5">
          Plan Details
        </p>

        <div className="flex items-center gap-4 px-5 py-4 rounded-xl border border-gray-200 bg-white w-fit min-w-[260px]">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" className="w-10 h-10 flex-shrink-0">
            <g fill="none">
              <path fill="#EFF3FF" d="M32.375 2H7.625A5.625 5.625 0 002 7.625v24.75A5.625 5.625 0 007.625 38h12.791l-9.332-9.335a2.344 2.344 0 01-1.172-2.027V13.362a2.344 2.344 0 012.344-2.344h2.237v-.895a2.11 2.11 0 012.11-2.11h6.792a2.11 2.11 0 012.109 2.11v.895h2.236c.697 0 1.358.31 1.803.846L38 20.32V7.625A5.625 5.625 0 0032.375 2z"/>
              <path fill="#B6BEDB" d="M30.085 13.362v13.276a2.344 2.344 0 01-2.344 2.344h-2.236v.9a2.11 2.11 0 01-2.109 2.109h-6.792a2.11 2.11 0 01-2.11-2.11v-.899h-2.238a2.33 2.33 0 01-1.172-.317L20.416 38h11.959A5.625 5.625 0 0038 32.375V20.32l-8.455-8.456c.35.42.541.95.54 1.498z"/>
              <path fill="#2E3F68" d="M14.495 11.018h-2.239a2.344 2.344 0 00-2.344 2.344v1.67h4.581l.002-4.014zm11.01 4.013h4.58v1.094h-4.58v12.857h2.236a2.344 2.344 0 002.344-2.344V13.362a2.344 2.344 0 00-2.344-2.344h-2.236v4.013zm-11.01 13.951V16.125H9.913v10.513a2.344 2.344 0 002.343 2.344h2.239z"/>
              <path fill="#5C86F7" d="M15.588 12.531h8.824v-2.408c0-.561-.455-1.016-1.016-1.016h-6.792c-.561 0-1.016.455-1.016 1.016v2.408zm8.824 1.094h-8.824v16.256c0 .561.455 1.016 1.016 1.016h6.792c.561 0 1.016-.455 1.016-1.016V13.625z"/>
            </g>
          </svg>
          <div>
            <p className="text-xs uppercase font-semibold text-gray-500 mb-0.5">Plan Name</p>
            <p className="text-2xl font-bold uppercase text-gray-900 leading-none">Free</p>
          </div>
        </div>
      </section>

      {/* ── USAGE STATS TABLE ────────────────────────────────────── */}
      <section className="py-8 border-t border-gray-200">
        <p className="text-xs font-semibold tracking-widest uppercase text-gray-400 mb-5">
          Usage Stats
        </p>

        {/* Column headers */}
        <div className="grid grid-cols-12 px-4 pb-2 border-b border-gray-200">
          <div className="col-span-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Module
          </div>
          <div className="col-span-5 text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Usage
          </div>
          <div className="col-span-3 text-xs font-semibold text-gray-400 uppercase tracking-wider text-right">
            Status
          </div>
        </div>

        {/* Rows */}
        <div className="divide-y divide-gray-100">
          {usageItems.map(({ label, used, max, icon: Icon }) => {
            const pct = max > 0 ? Math.round((used / max) * 100) : 0;
            const isFull = used >= max;
            return (
              <div
                key={label}
                className="grid grid-cols-12 items-center px-4 py-4 hover:bg-gray-50 transition"
              >
                {/* Module */}
                <div className="col-span-4 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                    <Icon size={16} className="text-blue-500" />
                  </div>
                  <span className="text-sm font-medium text-gray-800">{label}</span>
                </div>

                {/* Progress bar */}
                <div className="col-span-5 pr-6">
                  <UsageBar used={used} max={max} />
                </div>

                {/* Status badge */}
                <div className="col-span-3 flex justify-end">
                  {isFull ? (
                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-600 border border-red-100">
                      Limit Reached
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-100">
                      {pct}% used
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
