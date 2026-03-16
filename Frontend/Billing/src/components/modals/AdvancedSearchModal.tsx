import React, { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";

type AdvancedSearchCriteria = {
  searchIn: string;
  filter: string;
  name: string;
};

type AdvancedSearchModalProps = {
  isOpen: boolean;
  onClose: () => void;
  initialSearchIn?: string;
  initialFilter?: string;
  searchOptions?: string[];
  filterOptionsBySearch?: Record<string, string[]>;
  onSearch?: (criteria: AdvancedSearchCriteria) => void;
};

export default function AdvancedSearchModal({
  isOpen,
  onClose,
  initialSearchIn = "Items",
  initialFilter = "All Items",
  searchOptions = ["Items"],
  filterOptionsBySearch = { Items: ["All Items"] },
  onSearch,
}: AdvancedSearchModalProps) {
  const [searchIn, setSearchIn] = useState(initialSearchIn);
  const [filter, setFilter] = useState(initialFilter);
  const [name, setName] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    setSearchIn(initialSearchIn);
    setFilter(initialFilter);
    setName("");
  }, [isOpen, initialSearchIn, initialFilter]);

  const filterOptions = useMemo(() => {
    return filterOptionsBySearch[searchIn] || ["All"];
  }, [filterOptionsBySearch, searchIn]);

  useEffect(() => {
    if (!filterOptions.includes(filter)) {
      setFilter(filterOptions[0] || "All");
    }
  }, [filterOptions, filter]);

  const handleApply = () => {
    onSearch?.({ searchIn, filter, name });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[220] flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-[620px] rounded-xl border border-[#dbe2ef] bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#e5eaf4] px-5 py-4">
          <h2 className="text-lg font-semibold text-[#0f172a]">Advanced Search</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-[#64748b] hover:bg-[#f1f5f9] hover:text-[#0f172a]"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4 px-5 py-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm text-[#334155]">Search In</label>
              <select
                value={searchIn}
                onChange={(e) => setSearchIn(e.target.value)}
                className="h-10 w-full rounded border border-[#cfd5e3] px-3 text-sm outline-none focus:border-[#3b82f6]"
              >
                {searchOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm text-[#334155]">Filter</label>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="h-10 w-full rounded border border-[#cfd5e3] px-3 text-sm outline-none focus:border-[#3b82f6]"
              >
                {filterOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm text-[#334155]">Name / Keyword</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Type a keyword"
              className="h-10 w-full rounded border border-[#cfd5e3] px-3 text-sm outline-none focus:border-[#3b82f6]"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-[#e5eaf4] px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-[#cfd5e3] bg-white px-4 py-2 text-sm text-[#334155] hover:bg-[#f8fafc]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="rounded bg-[#2563eb] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1d4ed8]"
          >
            Search
          </button>
        </div>
      </div>
    </div>
  );
}

