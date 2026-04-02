import React from "react";
import { ChevronDown } from "lucide-react";

type CustomerDetailMoreMenuProps = {
  moreDropdownRef: React.RefObject<HTMLDivElement>;
  isMoreDropdownOpen: boolean;
  areRemindersStopped: boolean;
  isCustomerActive: boolean;
  onToggle: () => void;
  onAssociateTemplates: () => void;
  onConfigurePortal: () => void;
  onToggleReminders: () => void;
  onClone: () => void;
  onMergeCustomers: () => void | Promise<void>;
  onToggleActive: () => void | Promise<void>;
  onDelete: () => void;
};

export default function CustomerDetailMoreMenu({
  moreDropdownRef,
  isMoreDropdownOpen,
  areRemindersStopped,
  isCustomerActive,
  onToggle,
  onAssociateTemplates,
  onConfigurePortal,
  onToggleReminders,
  onClone,
  onMergeCustomers,
  onToggleActive,
  onDelete,
}: CustomerDetailMoreMenuProps) {
  return (
    <div className="relative" ref={moreDropdownRef}>
      <button
        type="button"
        className="h-[38px] flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 border-b-[4px] text-gray-700 rounded-lg text-sm font-semibold cursor-pointer transition-all hover:bg-gray-50 hover:-translate-y-[1px] hover:border-b-[6px] active:border-b-[2px] active:translate-y-[1px] shadow-sm"
        onClick={onToggle}
      >
        More
        <ChevronDown size={14} />
      </button>
      {isMoreDropdownOpen && (
        <div className="absolute top-full right-0 mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
          <button
            type="button"
            className="w-full text-left px-4 py-2 text-sm text-gray-700 font-medium cursor-pointer hover:bg-gray-50 transition-colors"
            onClick={onAssociateTemplates}
          >
            Associate Templates
          </button>
          <button
            type="button"
            className="w-full text-left px-4 py-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-50 transition-colors"
            onClick={onConfigurePortal}
          >
            Configure Customer Portal
          </button>
          <button
            type="button"
            className={`w-full text-left px-4 py-2 text-sm cursor-pointer transition-colors ${
              areRemindersStopped
                ? "text-gray-700 hover:bg-gray-50"
                : "text-blue-600 font-medium hover:bg-blue-50"
            }`}
            onClick={onToggleReminders}
          >
            {areRemindersStopped ? "Enable All Reminders" : "Stop All Reminders"}
          </button>
          <button
            type="button"
            className="w-full text-left px-4 py-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-50 transition-colors"
            onClick={onClone}
          >
            Clone
          </button>
          <button
            type="button"
            className="w-full text-left px-4 py-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-50 transition-colors"
            onClick={onMergeCustomers}
          >
            Merge Customers
          </button>
          <button
            type="button"
            className="w-full text-left px-4 py-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-50 transition-colors"
            onClick={onToggleActive}
          >
            {isCustomerActive ? "Mark as Inactive" : "Mark as Active"}
          </button>
          <div className="my-1 h-px bg-gray-200" />
          <button
            type="button"
            className="w-full text-left px-4 py-2 text-sm text-red-600 cursor-pointer hover:bg-red-50 transition-colors"
            onClick={onDelete}
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
}
