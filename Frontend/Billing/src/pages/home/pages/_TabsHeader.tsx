import React from "react";

export default function TabsHeader({ active = "Dashboard" }) {
  const items = ["Dashboard", "Recent Updates"];
  return (
    <div className="mb-4 flex items-center gap-6 border-b border-slate-200">
      {items.map((t) => (
        <button
          key={t}
          className={`-mb-px border-b-2 px-1 pb-2 text-[13px] ${
            t === active ? "border-indigo-600 font-semibold text-slate-900"
                          : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          {t}
        </button>
      ))}
    </div>
  );
}
