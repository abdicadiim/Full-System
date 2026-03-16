import React, { useEffect, useState } from "react";
import { GripVertical, Lock, Search, SlidersHorizontal, X, Pin } from "lucide-react";
import { useOrganizationBranding } from "../../../../hooks/useOrganizationBranding";

export interface ColumnConfig {
  key: string;
  label: string;
  visible: boolean;
  pinned?: boolean;
  locked?: boolean;
  width?: number;
}

interface PlansCustomizeColumnsModalProps {
  isOpen: boolean;
  title?: string;
  columns: ColumnConfig[];
  onClose: () => void;
  onSave: (columns: ColumnConfig[]) => void;
}

export default function PlansCustomizeColumnsModal({
  isOpen,
  title = "Customize Columns",
  columns,
  onClose,
  onSave,
}: PlansCustomizeColumnsModalProps) {
  const { accentColor } = useOrganizationBranding();
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState<ColumnConfig[]>(columns);

  useEffect(() => {
    if (isOpen) {
      setSearch("");
      setDraft(columns);
    }
  }, [isOpen, columns]);

  if (!isOpen) return null;

  const filtered = draft.filter((col) => col.label.toLowerCase().includes(search.toLowerCase()));
  const selectedCount = draft.filter((c) => c.visible).length;

  const toggle = (key: string) => {
    setDraft((prev) =>
      prev.map((col) => {
        if (col.key !== key || col.locked) return col;
        const nextVisible = !col.visible;
        return {
          ...col,
          visible: nextVisible,
          pinned: nextVisible ? Boolean(col.pinned) : false,
        };
      })
    );
  };

  const togglePinned = (key: string) => {
    setDraft((prev) =>
      prev.map((col) => {
        if (col.key !== key || !col.visible || col.locked) return col;
        return { ...col, pinned: !col.pinned };
      })
    );
  };

  return (
    <div className="fixed inset-0 z-[2200] flex items-start justify-center bg-[#444b58]/78 p-4 pt-8">
      <div className="w-full max-w-[500px] overflow-hidden rounded-[8px] border border-[#d8dde7] bg-white shadow-[0_22px_54px_rgba(15,23,42,0.34)]">
        <div className="flex items-center justify-between border-b border-[#e6eaf1] px-5 py-4">
          <div className="flex items-center gap-2.5">
            <SlidersHorizontal size={16} className="text-slate-600" />
            <h3 className="text-[16px] font-medium text-[#0f172a]">{title}</h3>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[13px] font-medium text-[#334155]">
              {selectedCount} of {draft.length} Selected
            </span>
            <div className="h-5 w-px bg-[#d5dbe6]" />
            <button
              onClick={onClose}
              className="inline-flex h-6 w-6 items-center justify-center text-[#ef4444] hover:text-[#dc2626]"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="border-b border-[#e6eaf1] px-5 py-3">
          <div className="relative">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search"
              className="h-9 w-full rounded-md border border-[#d1d5db] bg-white pl-9 pr-3 text-[13px] text-slate-700 outline-none focus:border-[#93c5fd]"
            />
          </div>
        </div>

        <div className="max-h-[365px] space-y-1.5 overflow-y-auto bg-[#f5f6fa] px-5 py-3">
          {filtered.map((col) => (
            <div key={col.key} className="group flex h-[38px] items-center gap-2 rounded-sm border border-[#edf1f6] bg-[#f7f8fc] px-2.5">
              <GripVertical size={13} className="text-slate-400" />
              <input
                type="checkbox"
                checked={col.visible}
                disabled={col.locked}
                onChange={() => toggle(col.key)}
                className="h-3.5 w-3.5 rounded border-slate-300 focus:ring-opacity-50"
                style={{ color: accentColor, accentColor: accentColor }}
              />
              {col.locked ? <Lock size={11} className="text-slate-400" /> : null}
              <span className={`flex-1 text-[13px] ${col.visible ? "text-slate-700" : "text-slate-500"}`}>{col.label}</span>
              {col.visible ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    togglePinned(col.key);
                  }}
                  disabled={col.locked}
                  className={`inline-flex h-5 w-5 items-center justify-center rounded transition-opacity ${col.pinned
                    ? "opacity-100 bg-[#eff6ff]"
                    : "opacity-0 text-slate-400 group-hover:opacity-100 hover:bg-slate-100"
                    }`}
                  style={col.pinned ? { color: accentColor } : {}}
                  title={col.pinned ? "Unpin column" : "Pin column"}
                >
                  <Pin size={13} />
                </button>
              ) : null}
            </div>
          ))}
        </div>

        <div className="flex justify-start gap-2 border-t border-[#e6eaf1] bg-white px-5 py-4">
          <button
            onClick={() => onSave(draft)}
            className="rounded-md px-3.5 py-1.5 text-[13px] font-semibold text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: accentColor }}
          >
            Save
          </button>
          <button
            onClick={onClose}
            className="rounded-md border border-[#cfd5de] bg-[#f4f5f7] px-3.5 py-1.5 text-[13px] font-medium text-slate-600 hover:bg-[#e8ecf2]"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
