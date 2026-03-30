import React from "react";
import { ChevronDown, Plus, Search } from "lucide-react";

type SalespersonOption = {
  id?: string;
  _id?: string;
  name?: string;
  email?: string;
};

type SalespersonDropdownProps = {
  value: string;
  isOpen: boolean;
  search: string;
  salespersons: SalespersonOption[];
  dropdownRef: React.RefObject<HTMLDivElement>;
  onToggle: () => void;
  onSearchChange: (value: string) => void;
  onSelect: (salesperson: SalespersonOption) => void;
  onManage: () => void;
  placeholder?: string;
};

export default function SalespersonDropdown({
  value,
  isOpen,
  search,
  salespersons,
  dropdownRef,
  onToggle,
  onSearchChange,
  onSelect,
  onManage,
  placeholder = "Select or Add Salesperson",
}: SalespersonDropdownProps) {
  return (
    <div className="flex-1 max-w-xs relative" ref={dropdownRef}>
      <div
        className="w-full px-3 py-2 border border-gray-300 rounded text-sm text-gray-700 flex justify-between items-center bg-white cursor-pointer"
        onClick={onToggle}
      >
        <span className={value ? "text-gray-900" : "text-gray-400"}>
          {value || placeholder}
        </span>
        <ChevronDown size={14} className="text-gray-400" />
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded shadow-lg z-50 flex flex-col">
          <div className="flex items-center gap-2 p-2 border-b border-gray-200 sticky top-0 bg-white">
            <Search size={14} className="text-gray-400" />
            <input
              type="text"
              placeholder="Search"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              className="flex-1 text-sm focus:outline-none"
              autoFocus
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          <div className="max-h-60 overflow-y-auto">
            {salespersons.length > 0 ? (
              salespersons.map((salesperson) => {
                const key = salesperson.id || salesperson._id || salesperson.name;
                return (
                  <div
                    key={key}
                    className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 cursor-pointer truncate"
                    onClick={() => onSelect(salesperson)}
                  >
                    {salesperson.name}
                  </div>
                );
              })
            ) : (
              <div className="px-4 py-2 text-sm text-gray-500 italic">No salespersons found</div>
            )}
          </div>

          <div
            className="p-3 border-t border-gray-100 flex items-center gap-2 text-[#156372] hover:bg-gray-50 cursor-pointer text-sm font-medium"
            onClick={onManage}
          >
            <Plus size={16} />
            <span>Manage Salespersons</span>
          </div>
        </div>
      )}
    </div>
  );
}
