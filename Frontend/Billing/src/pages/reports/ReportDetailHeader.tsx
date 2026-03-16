import React from "react";
import { CalendarDays, ChevronDown, History, Plus, RefreshCw, Share2, SlidersHorizontal, X } from "lucide-react";

interface ReportFilterChip {
  key: string;
  label: string;
  value: string;
}

interface ReportDetailHeaderProps {
  categoryName: string;
  reportName: string;
  dateLabel: string;
  filters?: ReportFilterChip[];
  onRunReport?: () => void;
}

const defaultFilters: ReportFilterChip[] = [
  { key: "date-range", label: "Date Range", value: "This Month" },
  { key: "products", label: "Products", value: "All Products" },
  { key: "plans", label: "Plans", value: "All Plans of Selected Products" },
];

export default function ReportDetailHeader({ categoryName, reportName, dateLabel, filters = defaultFilters, onRunReport }: ReportDetailHeaderProps) {
  return (
    <div className="rounded-lg border border-[#d7dce7] bg-white">
      <div className="flex flex-wrap items-start justify-between gap-4 px-4 py-3">
        <div>
          <p className="text-sm font-medium text-[#4f5f79]">{categoryName}</p>
          <h1 className="text-[24px] font-semibold leading-tight text-[#0f172a]">
            {reportName}
            <span className="ml-2 text-sm font-normal text-[#475569]">- {dateLabel}</span>
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <button type="button" className="inline-flex h-8 w-8 items-center justify-center rounded border border-[#d4d9e4] text-[#334155] hover:bg-[#f8fafc]">
            <SlidersHorizontal size={15} />
          </button>
          <button type="button" className="inline-flex h-8 w-8 items-center justify-center rounded border border-[#d4d9e4] text-[#334155] hover:bg-[#f8fafc]">
            <History size={15} />
          </button>
          <button type="button" className="inline-flex h-8 w-8 items-center justify-center rounded border border-[#d4d9e4] text-[#334155] hover:bg-[#f8fafc]">
            <Share2 size={15} />
          </button>
          <button
            type="button"
            className="inline-flex h-8 items-center gap-1 rounded border border-[#d4d9e4] bg-white px-3 text-sm font-medium text-[#1e293b] hover:bg-[#f8fafc]"
          >
            Export <ChevronDown size={14} />
          </button>
          <button type="button" className="inline-flex h-8 w-8 items-center justify-center rounded border border-[#d4d9e4] text-[#334155] hover:bg-[#f8fafc]">
            <RefreshCw size={15} />
          </button>
          <button type="button" className="inline-flex h-8 w-8 items-center justify-center rounded border border-[#d4d9e4] text-[#ef4444] hover:bg-[#fef2f2]">
            <X size={15} />
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-[#e6e9f0] px-4 py-2">
        <span className="text-sm text-[#334155]">Filters :</span>
        {filters.map((filter) => (
          <button
            key={filter.key}
            type="button"
            className="inline-flex h-8 items-center gap-1 rounded border border-[#cfd6e4] bg-[#f8fafc] px-3 text-sm text-[#334155] hover:bg-white"
          >
            {filter.label} : <span className="font-medium">{filter.value}</span> <ChevronDown size={14} />
          </button>
        ))}
        <button type="button" className="inline-flex h-8 items-center gap-1 rounded border border-[#cfd6e4] bg-white px-3 text-sm text-[#334155] hover:bg-[#f8fafc]">
          <Plus size={14} className="text-[#2563eb]" /> More Filters
        </button>
        <button
          type="button"
          onClick={onRunReport}
          className="inline-flex h-8 items-center gap-1 rounded bg-[#22a06b] px-4 text-sm font-semibold text-white hover:bg-[#1b8b5d]"
        >
          <CalendarDays size={14} /> Run Report
        </button>
      </div>
    </div>
  );
}

