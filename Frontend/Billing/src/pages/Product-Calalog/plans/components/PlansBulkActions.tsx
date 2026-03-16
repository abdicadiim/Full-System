import React from "react";
import { X } from "lucide-react";

interface PlansBulkActionsProps {
    selectedCount: number;
    onClear: () => void;
    onMarkActive: () => void;
    onMarkInactive: () => void;
    onDelete: () => void;
    onBulkUpdate: () => void;
}

export default function PlansBulkActions({
    selectedCount,
    onClear,
    onMarkActive,
    onMarkInactive,
    onDelete,
    onBulkUpdate,
}: PlansBulkActionsProps) {
    return (
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
                <button
                    onClick={onBulkUpdate}
                    className="px-3 py-1.5 border border-gray-300 rounded text-xs font-medium text-slate-700 hover:bg-[#1b5e6a] hover:text-white bg-white shadow-sm transition-colors"
                >
                    Bulk Update
                </button>
                <button
                    onClick={onMarkActive}
                    className="px-3 py-1.5 border border-gray-300 rounded text-xs font-medium text-slate-700 hover:bg-[#1b5e6a] hover:text-white bg-white shadow-sm transition-colors"
                >
                    Mark as Active
                </button>
                <button
                    onClick={onMarkInactive}
                    className="px-3 py-1.5 border border-gray-300 rounded text-xs font-medium text-slate-700 hover:bg-[#1b5e6a] hover:text-white bg-white shadow-sm transition-colors"
                >
                    Mark as Inactive
                </button>
                <button
                    onClick={onDelete}
                    className="px-3 py-1.5 border border-gray-300 rounded text-xs font-medium text-slate-700 hover:bg-red-600 hover:text-white bg-white shadow-sm transition-colors"
                >
                    Delete
                </button>

                <div className="hidden sm:block w-px h-6 bg-gray-300 mx-2" />

                <div className="flex items-center gap-1">
                    <span className="text-sm font-medium text-slate-600 bg-slate-200 px-2 py-0.5 rounded-full">
                        {selectedCount}
                    </span>
                    <span className="text-sm text-slate-600 hidden sm:inline">Selected</span>
                </div>
            </div>

            <button
                onClick={onClear}
                className="flex items-center gap-1 text-slate-500 hover:text-slate-700 text-sm font-medium transition-colors"
            >
                Esc <X size={16} />
            </button>
        </div>
    );
}
