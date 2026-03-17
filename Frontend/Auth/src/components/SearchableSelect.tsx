import React, { useEffect, useMemo, useRef, useState } from "react";

export type SelectOption = { value: string; label: string };

export default function SearchableSelect({
  label,
  required,
  value,
  options,
  placeholder,
  onChange,
  menuScrollable = true,
  invalid = false,
  openDirection = "down",
  renderLimit = 120,
}: {
  label?: string;
  required?: boolean;
  value: string;
  options: SelectOption[];
  placeholder: string;
  onChange: (next: string) => void;
  menuScrollable?: boolean;
  invalid?: boolean;
  openDirection?: "down" | "up";
  renderLimit?: number;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query]);

  const visible = useMemo(() => {
    const limit = Math.max(20, renderLimit);
    return filtered.slice(0, limit);
  }, [filtered, renderLimit]);

  const selectedLabel = useMemo(() => {
    return options.find((o) => o.value === value)?.label ?? "";
  }, [options, value]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setTimeout(() => inputRef.current?.focus(), 0);
  }, [open]);

  return (
    <div ref={containerRef} className="relative space-y-2">
      {label ? (
        <label className="text-xs font-semibold text-slate-700">
          {label}
          {required ? <span className="text-red-500">*</span> : null}
        </label>
      ) : null}

      <button
        type="button"
        onClick={() => setOpen((s) => !s)}
        className={[
          "flex w-full items-center justify-between rounded-lg border bg-white px-3 py-2.5 text-left text-sm outline-none transition-all focus:border-transparent focus:ring-2",
          invalid ? "border-red-300 focus:ring-red-200" : "border-slate-200 focus:ring-primary",
        ].join(" ")}
      >
        <span className={selectedLabel ? "text-slate-900" : "text-slate-400"}>{selectedLabel || placeholder}</span>
        <span className="material-symbols-outlined text-base text-slate-500">{open ? "expand_less" : "expand_more"}</span>
      </button>

      {open ? (
        <div
          className={[
            "absolute left-0 right-0 z-[9999] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg",
            openDirection === "up" ? "bottom-full mb-1" : "top-full mt-1",
          ].join(" ")}
        >
          <div className="border-b border-slate-100 p-2">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-base text-slate-400">
                search
              </span>
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search"
                className="w-full rounded-md border border-slate-200 bg-white py-2 pl-10 pr-3 text-sm outline-none focus:border-transparent focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div className={["p-1", menuScrollable ? "max-h-48 overflow-auto" : "overflow-visible"].join(" ")}>
            {filtered.length === 0 ? (
              <div className="px-3 py-2 text-sm text-slate-500">No results</div>
            ) : (
              visible.map((opt) => {
                const active = opt.value === value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      onChange(opt.value);
                      setOpen(false);
                    }}
                    className={[
                      "flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition-colors text-slate-900 hover:bg-slate-100",
                      active ? "font-semibold" : "",
                    ].join(" ")}
                  >
                    <span>{opt.label}</span>
                    {active ? <span className="material-symbols-outlined text-base text-slate-500">check</span> : null}
                  </button>
                );
              })
            )}

            {filtered.length > visible.length ? (
              <div className="px-3 py-2 text-[11px] text-slate-500">
                Showing {visible.length} of {filtered.length}. Type to search to narrow results.
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
