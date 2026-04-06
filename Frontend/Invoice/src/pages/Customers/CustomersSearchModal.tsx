import React from "react";
import { ChevronDown, X } from "lucide-react";
import CustomersSearchModalCore from "./CustomersSearchModalCore";
import CustomersSearchModalSales from "./CustomersSearchModalSales";
import CustomersSearchModalMisc from "./CustomersSearchModalMisc";

type Props = {
  controller: any;
};

export default function CustomersSearchModal({ controller }: Props) {
  const d = controller as any;

  if (!d.isSearchModalOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[2000]"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          d.setIsSearchModalOpen(false);
          d.resetSearchModalData();
        }
      }}
    >
      <div className="bg-white rounded-lg shadow-lg w-full max-w-[800px] mx-4">
        <div className="flex items-center justify-between py-4 px-6 border-b border-gray-200">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Search</label>
              <div className="relative" ref={d.searchTypeDropdownRef}>
                <div
                  className={`flex items-center justify-between w-[140px] py-2 px-3 text-sm text-gray-700 bg-white border rounded-md cursor-pointer transition-colors ${d.isSearchTypeDropdownOpen ? "border-blue-600" : "border-gray-300 hover:border-gray-400"}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    d.setIsSearchTypeDropdownOpen(!d.isSearchTypeDropdownOpen);
                  }}
                >
                  <span>{d.searchType}</span>
                  <ChevronDown
                    size={16}
                    className={`text-gray-500 transition-transform ${d.isSearchTypeDropdownOpen ? "rotate-180" : ""}`}
                  />
                </div>
                {d.isSearchTypeDropdownOpen && (
                  <div
                    className="absolute top-full left-0 right-0 mt-1 bg-white border border-blue-600 border-t-0 rounded-b-md shadow-lg z-[1002] max-h-[300px] overflow-y-auto"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {d.searchTypeOptions.map((option: string) => (
                      <div
                        key={option}
                        className={`py-2.5 px-3.5 text-sm cursor-pointer transition-colors ${d.searchType === option ? "bg-blue-600 text-white hover:bg-blue-700" : "text-gray-700 hover:bg-gray-100"}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          d.setSearchType(option);
                          d.setIsSearchTypeDropdownOpen(false);
                          const options = d.getSearchFilterOptions(option);
                          d.setSearchModalFilter((prev: string) => (options.includes(prev) ? prev : options[0]));
                          d.resetSearchModalData();
                        }}
                      >
                        {option}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Filter</label>
              <div className="relative" ref={d.filterDropdownRef}>
                <div
                  className={`flex items-center justify-between w-[160px] py-2 px-3 text-sm text-gray-700 bg-white border rounded-md cursor-pointer transition-colors ${d.isFilterDropdownOpen ? "border-blue-600" : "border-gray-300 hover:border-gray-400"}`}
                  onClick={() => d.setIsFilterDropdownOpen(!d.isFilterDropdownOpen)}
                >
                  <span>{d.searchModalFilter}</span>
                  <ChevronDown
                    size={16}
                    className={`text-gray-500 transition-transform ${d.isFilterDropdownOpen ? "rotate-180" : ""}`}
                  />
                </div>
                {d.isFilterDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-blue-600 border-t-0 rounded-b-md shadow-lg z-[1002] max-h-[200px] overflow-y-auto">
                    {d.getSearchFilterOptions(d.searchType).map((view: string) => (
                      <div
                        key={view}
                        className="py-2.5 px-3.5 text-sm text-gray-700 cursor-pointer transition-colors hover:bg-gray-100"
                        onClick={() => {
                          d.setSearchModalFilter(view);
                          d.setIsFilterDropdownOpen(false);
                        }}
                      >
                        {view}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
          <button
            className="flex items-center justify-center w-7 h-7 bg-transparent border-none cursor-pointer text-gray-500 hover:text-gray-700 transition-colors"
            onClick={() => {
              d.setIsSearchModalOpen(false);
              d.resetSearchModalData();
            }}
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          <CustomersSearchModalCore controller={controller} />
          <CustomersSearchModalSales controller={controller} />
          <CustomersSearchModalMisc controller={controller} />
        </div>

        <div className="flex items-center justify-center gap-3 py-4 px-6 border-t border-gray-200 bg-gray-50 rounded-b-lg">
          <button
            className="py-2.5 px-6 bg-red-600 text-white border-none rounded-md text-sm font-medium cursor-pointer transition-colors hover:bg-red-700"
            onClick={() => {
              d.setIsSearchModalOpen(false);
            }}
          >
            Search
          </button>
          <button
            className="py-2.5 px-6 bg-gray-200 text-gray-700 border-none rounded-md text-sm font-medium cursor-pointer transition-colors hover:bg-gray-300"
            onClick={() => {
              d.setIsSearchModalOpen(false);
              d.resetSearchModalData();
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
