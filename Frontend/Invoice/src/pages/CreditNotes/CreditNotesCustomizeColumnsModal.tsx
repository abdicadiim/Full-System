import React, { useEffect, useMemo, useState } from "react";
import { GripVertical, Lock, Search, SlidersHorizontal, X } from "lucide-react";

export type CreditNotesColumnOption = {
  key: string;
  label: string;
  locked?: boolean;
};

type Props = {
  open: boolean;
  columns: CreditNotesColumnOption[];
  value: string[];
  onClose: () => void;
  onSave: (nextVisibleColumns: string[]) => void;
};

const ensureLocked = (keys: string[], columns: CreditNotesColumnOption[]) => {
  const lockedKeys = columns.filter((col) => col.locked).map((col) => col.key);
  const next = Array.from(new Set(keys));
  lockedKeys.forEach((key) => {
    if (!next.includes(key)) next.push(key);
  });
  return next;
};

export default function CreditNotesCustomizeColumnsModal({
  open,
  columns,
  value,
  onClose,
  onSave
}: Props) {
  const [search, setSearch] = useState("");
  const [tempVisible, setTempVisible] = useState<string[]>(() => ensureLocked(value, columns));

  useEffect(() => {
    if (!open) return;
    setSearch("");
    setTempVisible(ensureLocked(value, columns));
  }, [open, value, columns]);

  const filteredColumns = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return columns;
    return columns.filter((col) => col.label.toLowerCase().includes(q));
  }, [columns, search]);

  const selectedCount = tempVisible.length;

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-xl rounded-2xl bg-white shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-3">
            <SlidersHorizontal size={18} className="text-slate-600" />
            <h3 className="text-[18px] font-semibold text-slate-900">Customize Columns</h3>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-600 font-medium">
              {selectedCount} of {columns.length} Selected
            </span>
            <button
              type="button"
              className="h-9 w-9 rounded-lg border border-[#1d5cff] text-[#1d5cff] hover:bg-[#1d5cff]/10 transition-colors flex items-center justify-center"
              onClick={onClose}
              aria-label="Close"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="px-6 py-4">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search"
              className="w-full h-11 rounded-lg border border-gray-200 pl-10 pr-3 text-sm outline-none focus:border-[#1d5cff]"
            />
          </div>
        </div>

        <div className="px-6 pb-4">
          <div className="max-h-[420px] overflow-y-auto pr-2">
            <div className="flex flex-col gap-2">
              {filteredColumns.map((col) => {
                const checked = tempVisible.includes(col.key);
                const locked = Boolean(col.locked);

                return (
                  <label
                    key={col.key}
                    className="flex items-center gap-3 rounded-lg bg-gray-50 px-3 py-3 hover:bg-gray-100 transition-colors cursor-pointer"
                  >
                    <GripVertical size={16} className="text-slate-400 shrink-0" />
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={locked}
                      onChange={() => {
                        if (locked) return;
                        setTempVisible((prev) =>
                          prev.includes(col.key) ? prev.filter((k) => k !== col.key) : [...prev, col.key]
                        );
                      }}
                      className="h-4 w-4 rounded border-gray-300 text-[#1d5cff] focus:ring-0 disabled:opacity-60"
                    />
                    <span className="text-sm text-slate-700 flex-1">{col.label}</span>
                    {locked ? <Lock size={14} className="text-slate-400 shrink-0" /> : null}
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-start gap-3 px-6 py-4 border-t border-gray-200 bg-white">
          <button
            type="button"
            className="px-5 py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition-colors"
            onClick={() => onSave(ensureLocked(tempVisible, columns))}
          >
            Save
          </button>
          <button
            type="button"
            className="px-5 py-2.5 rounded-lg border border-gray-300 bg-white text-slate-700 text-sm font-medium hover:bg-gray-50 transition-colors"
            onClick={onClose}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

