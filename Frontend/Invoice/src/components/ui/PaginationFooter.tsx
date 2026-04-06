import React, { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, Settings } from "lucide-react";

export interface PaginationFooterProps {
  currentPage: number;
  totalItems: number;
  pageSize: number;
  totalPages?: number;
  pageSizeOptions?: number[];
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  className?: string;
  itemLabel?: string;
}

export default function PaginationFooter({
  currentPage,
  totalItems,
  pageSize,
  totalPages,
  pageSizeOptions = [10, 25, 50, 100],
  onPageChange,
  onPageSizeChange,
  className = "",
  itemLabel: _itemLabel,
}: PaginationFooterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const pageCount = useMemo(
    () => Math.max(1, totalPages ?? Math.ceil(Math.max(totalItems, 1) / Math.max(pageSize, 1))),
    [pageSize, totalItems, totalPages]
  );

  const safePage = Math.min(Math.max(currentPage || 1, 1), pageCount);
  const startItem = totalItems === 0 ? 0 : ((safePage - 1) * pageSize) + 1;
  const endItem = totalItems === 0 ? 0 : Math.min(safePage * pageSize, totalItems);
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (totalItems <= 0) {
    return null;
  }

  return (
    <div
      ref={rootRef}
      className={`flex flex-col gap-3 border-t border-gray-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between ${className}`}
    >
      <div className="relative inline-flex items-center" data-pagination-size>
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-gray-50"
        >
          <Settings size={14} className="text-slate-500" />
          <span>{pageSize} per page</span>
          <ChevronDown size={14} className={`text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
        </button>

        {isOpen ? (
          <div className="absolute left-0 top-full z-20 mt-2 min-w-36 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xl">
            {pageSizeOptions.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  if (option !== pageSize) {
                    onPageSizeChange(option);
                  }
                }}
                className={`flex w-full items-center justify-between px-4 py-2.5 text-left text-sm transition-colors hover:bg-gray-50 ${
                  option === pageSize ? "bg-teal-50 font-semibold text-[#156372]" : "text-slate-700"
                }`}
              >
                <span>{option} per page</span>
                {option === pageSize ? <span className="text-xs font-semibold">Current</span> : null}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div className="flex items-center gap-2 self-start sm:self-auto">
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, safePage - 1))}
          disabled={safePage <= 1}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-slate-700 shadow-sm transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:text-gray-300 disabled:hover:bg-white"
          aria-label="Previous page"
        >
          <ChevronLeft size={16} />
        </button>

        <div className="inline-flex min-w-[110px] items-center justify-center rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm">
          {startItem} - {endItem}
        </div>

        <button
          type="button"
          onClick={() => onPageChange(Math.min(pageCount, safePage + 1))}
          disabled={safePage >= pageCount}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-slate-700 shadow-sm transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:text-gray-300 disabled:hover:bg-white"
          aria-label="Next page"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
