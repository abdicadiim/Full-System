import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowRight, Search, Table2, X } from "lucide-react";

export type ColumnGroup = {
  label: string;
  items: string[];
};

type ReportColumnOption = {
  key: string;
  label: string;
  locked?: boolean;
  groupLabel?: string;
};

type ReportCustomizeColumnsModalProps = {
  open: boolean;
  reportName: string;
  availableGroups: ColumnGroup[];
  selectedColumns: string[];
  onClose: () => void;
  onSave: (nextVisibleColumns: string[]) => void;
};

const isBrowser = typeof document !== "undefined";

const ensureLockedColumns = (keys: string[], columns: ReportColumnOption[]) => {
  const lockedKeys = columns.filter((column) => column.locked).map((column) => column.key);
  const next = Array.from(new Set(keys));
  lockedKeys.forEach((key) => {
    if (!next.includes(key)) {
      next.push(key);
    }
  });
  return next;
};

export default function ReportCustomizeColumnsModal({
  open,
  reportName,
  availableGroups,
  selectedColumns,
  onClose,
  onSave,
}: ReportCustomizeColumnsModalProps) {
  const [search, setSearch] = useState("");
  const [draftSelected, setDraftSelected] = useState<string[]>(selectedColumns);

  useEffect(() => {
    if (!open) {
      return;
    }

    setSearch("");
    setDraftSelected(selectedColumns);
  }, [open, selectedColumns]);

  const optionGroups = useMemo(() => {
    const selectedSet = new Set(draftSelected);
    return availableGroups.map((group) => ({
      ...group,
      items: group.items.filter((item) => !selectedSet.has(item)),
    }));
  }, [availableGroups, draftSelected]);

  const selectedOptionMap = useMemo(() => {
    const map = new Map<string, ReportColumnOption>();
    availableGroups.forEach((group) => {
      group.items.forEach((item) => {
        map.set(item, {
          key: item,
          label: item,
          locked: false,
          groupLabel: group.label,
        });
      });
    });
    return map;
  }, [availableGroups]);

  const selectedOptions = useMemo(() => {
    return draftSelected.map((item, index) => {
      const source = selectedOptionMap.get(item);
      return {
        key: item,
        label: item,
        groupLabel: source?.groupLabel || "Reports",
        locked: index === 0,
      } as ReportColumnOption;
    });
  }, [draftSelected, selectedOptionMap]);

  const filteredGroups = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return optionGroups;
    return optionGroups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => item.toLowerCase().includes(q)),
      }))
      .filter((group) => group.items.length > 0);
  }, [optionGroups, search]);

  if (!open || !isBrowser) {
    return null;
  }

  const addColumn = (column: string) => {
    setDraftSelected((prev) => (prev.includes(column) ? prev : [...prev, column]));
  };

  const removeColumn = (column: string) => {
    setDraftSelected((prev) => {
      if (prev[0] === column) return prev;
      return prev.filter((item) => item !== column);
    });
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[10000] flex items-start justify-center overflow-y-auto bg-black/45 px-4 pt-8"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="w-full max-w-[760px] overflow-hidden rounded-[12px] border border-[#dbe1ea] bg-white shadow-[0_24px_60px_rgba(15,23,42,0.28)]"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`Customize ${reportName || "Report"} Columns`}
      >
        <div className="flex items-center justify-between border-b border-[#e6eaf1] px-5 py-4">
          <div className="flex items-center gap-2.5">
            <Table2 size={17} className="text-[#334155]" />
            <h3 className="text-[16px] font-semibold text-[#0f172a]">Customize Report Columns</h3>
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#dff1ef] px-1.5 text-[11px] font-semibold text-[#156372]">
              {draftSelected.length}
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-[#ef4444] hover:bg-[#fef2f2]"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-5 py-4">
          <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_52px_minmax(0,1fr)]">
            <div>
              <div className="mb-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-[#64748b]">Available Columns</div>
              <div className="relative">
                <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search"
                  className="h-9 w-full rounded-[8px] border border-[#d4d9e4] bg-white pl-9 pr-3 text-[13px] text-[#334155] outline-none focus:border-[#156372]"
                />
              </div>

              <div className="mt-2 max-h-[420px] overflow-y-auto rounded-[10px] border border-[#e6eaf1] bg-white p-1">
                {filteredGroups.map((group) => (
                  <div key={group.label} className="mb-2">
                    <div className="px-3 py-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-[#94a3b8]">
                      {group.label}
                    </div>
                    <div className="space-y-1">
                      {group.items.map((item) => (
                        <button
                          key={item}
                          type="button"
                          onClick={() => addColumn(item)}
                          className="flex w-full items-center justify-between rounded-[8px] px-3 py-2 text-left text-[13px] text-[#334155] transition-colors hover:bg-[#f3f7f9]"
                        >
                          <span className="truncate">{item}</span>
                          <ArrowRight size={14} className="shrink-0 text-[#94a3b8]" />
                        </button>
                      ))}
                    </div>
                  </div>
                ))}

                {filteredGroups.length === 0 ? (
                  <div className="px-3 py-8 text-center text-[13px] text-[#64748b]">No matching columns.</div>
                ) : null}
              </div>
            </div>

            <div className="flex items-center justify-center">
              <button
                type="button"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#d4d9e4] bg-white text-[#64748b] shadow-sm hover:bg-[#f8fafc] hover:text-[#156372]"
                onClick={() => {
                  const firstAvailable = filteredGroups.find((group) => group.items.length > 0)?.items[0];
                  if (firstAvailable) {
                    addColumn(firstAvailable);
                  }
                }}
                aria-label="Move selected column"
              >
                <ArrowRight size={18} />
              </button>
            </div>

            <div>
              <div className="mb-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-[#64748b]">Selected Columns</div>
              <div className="max-h-[460px] overflow-y-auto rounded-[10px] border border-[#e6eaf1] bg-white p-2">
                {selectedOptions.map((column, index) => (
                  <div
                    key={column.key}
                    className="mb-1 flex items-center justify-between rounded-[8px] px-3 py-2 text-[13px] text-[#334155] hover:bg-[#f8fafc]"
                  >
                    <div className="min-w-0">
                      <div className="truncate">{column.label}</div>
                      <div className="truncate text-[11px] text-[#94a3b8]">({column.groupLabel})</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeColumn(column.key)}
                      disabled={index === 0}
                      className={`inline-flex h-6 w-6 items-center justify-center rounded-full transition-colors ${
                        index === 0 ? "cursor-not-allowed text-[#cbd5e1]" : "text-[#94a3b8] hover:bg-[#fef2f2] hover:text-[#ef4444]"
                      }`}
                      aria-label={`Remove ${column.label}`}
                    >
                      <X size={13} />
                    </button>
                  </div>
                ))}

                {selectedOptions.length === 0 ? (
                  <div className="px-3 py-8 text-center text-[13px] text-[#64748b]">No columns selected.</div>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 border-t border-[#e6eaf1] px-5 py-4">
          <button
            type="button"
            onClick={() => onSave(ensureLockedColumns(draftSelected, selectedOptions))}
            className="inline-flex h-9 items-center rounded bg-[#156372] px-4 text-[14px] font-semibold text-white hover:bg-[#0f4f5b]"
          >
            Apply
          </button>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 items-center rounded border border-[#d4d9e4] bg-white px-4 text-[14px] text-[#334155] hover:bg-[#f8fafc]"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
