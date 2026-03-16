import React, { useMemo, useState, useRef, useEffect } from "react";

export const DATE_OPTIONS = [
  "This Week","Previous Week","Last 30 days","This Month","Previous Month",
  "Last 3 months","Last 12 months","This Quarter","Previous Quarter",
  "This Year","Previous Year"
];

export default function DateRangePicker({
  value = "Last 12 months",
  onChange,
  label = "Last 12 months",
  className = "",
  options = DATE_OPTIONS,
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef(null);

  // close on outside click
  useEffect(() => {
    const onDoc = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  // close on ESC
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const list = useMemo(
    () => (options || DATE_OPTIONS).filter(o =>
      o.toLowerCase().includes(search.toLowerCase())
    ),
    [options, search]
  );

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-[12px] text-slate-700 hover:bg-slate-50"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {value || label}
        <svg width="14" height="14" viewBox="0 0 20 20" className="text-slate-500">
          <path fill="currentColor" d="M5 7l5 6 5-6z" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 z-30 mt-2 w-56 rounded-md border border-slate-200 bg-white p-2 shadow-lg">
          <input
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search"
            className="mb-2 w-full rounded-md border border-slate-200 px-2 py-1.5 text-[12px] outline-none focus:border-slate-400"
          />
          <div className="max-h-64 overflow-auto" role="listbox">
            {list.map(opt => (
              <div
                key={opt}
                role="option"
                aria-selected={opt === value}
                onClick={() => { onChange?.(opt); setOpen(false); }}
                className={`flex cursor-pointer items-center justify-between rounded-md px-2 py-2 text-[13px] hover:bg-slate-50 ${
                  opt === value ? "bg-slate-100" : ""
                }`}
              >
                <span className="text-slate-700">{opt}</span>
                {opt === value && (
                  <svg width="16" height="16" viewBox="0 0 20 20" className="text-indigo-600">
                    <path fill="currentColor" d="M8 13.2L4.8 10l-1.4 1.4L8 16 18 6l-1.4-1.4z"/>
                  </svg>
                )}
              </div>
            ))}
            {list.length === 0 && (
              <div className="px-2 py-2 text-[12px] text-slate-500">No matches</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
