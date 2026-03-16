import React, { useEffect, useMemo, useState } from "react";
import { GripVertical, Search, X } from "lucide-react";

type ColumnOption = {
  key: string;
  label: string;
  locked?: boolean;
};

type ProjectsCustomizeColumnsModalProps = {
  isOpen: boolean;
  columns: ColumnOption[];
  selectedKeys: string[];
  onSave: (nextKeys: string[]) => void;
  onClose: () => void;
};

export default function ProjectsCustomizeColumnsModal({
  isOpen,
  columns,
  selectedKeys,
  onSave,
  onClose,
}: ProjectsCustomizeColumnsModalProps) {
  const [search, setSearch] = useState("");
  const [draftSelected, setDraftSelected] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen) {
      setDraftSelected([...selectedKeys]);
      setSearch("");
    }
  }, [isOpen, selectedKeys]);

  const filteredColumns = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return columns;
    return columns.filter((col) => col.label.toLowerCase().includes(q));
  }, [columns, search]);

  const selectedCount = draftSelected.length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[2200] bg-black/45">
      <div className="fixed left-1/2 top-[12%] w-full max-w-[520px] -translate-x-1/2 rounded-lg bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <div className="flex items-center gap-2 text-[15px] font-semibold text-gray-800">
            <GripVertical size={16} className="text-gray-400" />
            Customize Columns
          </div>
          <div className="flex items-center gap-3 text-xs font-medium text-gray-500">
            <span>
              {selectedCount} of {columns.length} Selected
            </span>
            <button
              type="button"
              onClick={onClose}
              className="flex h-7 w-7 items-center justify-center rounded border border-gray-300 text-gray-500 hover:bg-gray-50"
              aria-label="Close"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        <div className="px-5 py-4">
          <div className="relative mb-3">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search"
              className="w-full rounded-md border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-[#156372]"
            />
          </div>

          <div className="space-y-2">
            {filteredColumns.map((col) => {
              const isChecked = draftSelected.includes(col.key);
              return (
                <label
                  key={col.key}
                  className="flex items-center gap-2 rounded-md bg-gray-50 px-3 py-2 text-sm text-gray-700"
                >
                  <GripVertical size={14} className="text-gray-400" />
                  <input
                    type="checkbox"
                    checked={isChecked}
                    disabled={col.locked}
                    onChange={() => {
                      if (col.locked) return;
                      setDraftSelected((prev) =>
                        prev.includes(col.key)
                          ? prev.filter((k) => k !== col.key)
                          : [...prev, col.key]
                      );
                    }}
                    className="h-4 w-4 rounded border-gray-300 text-[#156372] focus:ring-0"
                  />
                  <span className={col.locked ? "text-gray-400" : ""}>{col.label}</span>
                </label>
              );
            })}
            {filteredColumns.length === 0 && (
              <div className="rounded-md border border-dashed border-gray-200 px-3 py-4 text-center text-sm text-gray-500">
                No matching columns.
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 border-t border-gray-200 px-5 py-4">
          <button
            type="button"
            onClick={() => {
              onSave(draftSelected);
              onClose();
            }}
            className="rounded-md bg-[#16a34a] px-4 py-2 text-sm font-semibold text-white hover:bg-[#15803d]"
          >
            Save
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
