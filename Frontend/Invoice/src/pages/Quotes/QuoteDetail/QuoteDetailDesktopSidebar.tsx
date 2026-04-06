import React from "react";
import { ChevronDown, ChevronUp, Download, FileUp, MoreHorizontal, Plus, X } from "lucide-react";
import { formatCurrency, formatDate } from "./QuoteDetail.utils";

type Props = {
  quoteId?: string;
  allQuotes?: any[];
  filteredQuotesList?: any[];
  selectedQuotes?: any[];
  selectedFilter?: string;
  isFilterDropdownOpen?: boolean;
  isBulkActionsOpen?: boolean;
  showSidebarMoreDropdown?: boolean;
  filterOptions?: string[];
  setIsFilterDropdownOpen: (value: boolean) => void;
  setSelectedFilter: (value: string) => void;
  setIsBulkActionsOpen: (value: boolean) => void;
  setShowSidebarMoreDropdown: (value: boolean) => void;
  handleSelectAll: () => void;
  handleClearSelection: () => void;
  handleBulkUpdate: () => void;
  handleExportPDF: () => void;
  handleBulkMarkAsSent: () => void;
  handleBulkDelete: () => void;
  handleQuoteClick: (id: any) => void;
  handleCreateNewQuote: () => void;
  handleImportQuotes: () => void;
  handleExportQuotes: () => void;
  handleSelectQuote: (id: any) => void;
};

const QuoteDetailDesktopSidebar = ({
  quoteId,
  filteredQuotesList = [],
  selectedQuotes = [],
  selectedFilter = "All Quotes",
  isFilterDropdownOpen = false,
  isBulkActionsOpen = false,
  showSidebarMoreDropdown = false,
  filterOptions = [],
  setIsFilterDropdownOpen,
  setSelectedFilter,
  setIsBulkActionsOpen,
  setShowSidebarMoreDropdown,
  handleSelectAll,
  handleClearSelection,
  handleBulkUpdate,
  handleExportPDF,
  handleBulkMarkAsSent,
  handleBulkDelete,
  handleQuoteClick,
  handleCreateNewQuote,
  handleImportQuotes,
  handleExportQuotes,
  handleSelectQuote,
}: Props) => {
  return (
    <div className="w-[320px] lg:w-[320px] md:w-[270px] border-r border-gray-200 bg-white flex flex-col h-full min-h-0 overflow-hidden hidden md:flex">
      {selectedQuotes.length > 0 ? (
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-3 flex-1">
            <input
              type="checkbox"
              className="w-4 h-4 cursor-pointer"
              checked={selectedQuotes.length === filteredQuotesList.length && filteredQuotesList.length > 0}
              onChange={handleSelectAll}
            />
            <div className="relative">
              <button
                className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-300 rounded-md text-sm text-gray-700 cursor-pointer hover:bg-gray-50"
                onClick={() => setIsBulkActionsOpen(!isBulkActionsOpen)}
              >
                <span>Bulk Actions</span>
                <ChevronDown size={14} />
              </button>

              {isBulkActionsOpen && (
                <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 min-w-[180px]">
                  <div className="px-4 py-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-50" onClick={handleBulkUpdate}>
                    Bulk Update
                  </div>
                  <div className="px-4 py-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-50" onClick={handleExportPDF}>
                    Export as PDF
                  </div>
                  <div className="px-4 py-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-50" onClick={handleBulkMarkAsSent}>
                    Mark As Sent
                  </div>
                  <div className="px-4 py-2 text-sm text-red-600 cursor-pointer hover:bg-red-50" onClick={handleBulkDelete}>
                    Delete
                  </div>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 px-3 py-1 rounded text-sm font-semibold text-white" style={{ background: "linear-gradient(90deg, #156372 0%, #0D4A52 100%)" }}>
              <span>{selectedQuotes.length}</span>
              <span>Selected</span>
            </div>
            <button className="p-1 text-gray-500 hover:text-gray-700 cursor-pointer" onClick={handleClearSelection}>
              <X size={16} />
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between px-4 h-[74px] border-b border-gray-200">
          <div className="relative flex-1">
            <div
              className="inline-flex items-center gap-1 text-[18px] font-semibold text-gray-900 cursor-pointer"
              onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)}
            >
              <span>{selectedFilter}</span>
              {isFilterDropdownOpen ? <ChevronUp size={16} className="text-[#156372]" /> : <ChevronDown size={16} className="text-[#156372]" />}
            </div>

            {isFilterDropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50">
                {filterOptions.map((option) => (
                  <div
                    key={option}
                    className={`px-4 py-2 text-sm cursor-pointer hover:bg-gray-50 ${selectedFilter === option ? "bg-[#156372]/10 text-[#156372]" : "text-gray-700"}`}
                    onClick={() => {
                      setSelectedFilter(option);
                      setIsFilterDropdownOpen(false);
                    }}
                  >
                    {option}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 ml-2">
            <button
              className="p-2 rounded-md cursor-pointer bg-[#0D4A52] hover:bg-[#0B3F46] text-white border border-[#156372] shadow-sm"
              onClick={handleCreateNewQuote}
              title="New Quote"
            >
              <Plus size={16} />
            </button>
            <div className="relative">
              <button
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-md cursor-pointer border border-gray-200"
                onClick={() => {
                  setShowSidebarMoreDropdown(!showSidebarMoreDropdown);
                  setIsFilterDropdownOpen(false);
                }}
              >
                <MoreHorizontal size={16} />
              </button>
              {showSidebarMoreDropdown && (
                <div className="absolute top-full right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 min-w-[180px]">
                  <div className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-50" onClick={handleImportQuotes}>
                    <Download size={16} />
                    <span>Import Quotes</span>
                  </div>
                  <div className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-50" onClick={handleExportQuotes}>
                    <FileUp size={16} />
                    <span>Export</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {filteredQuotesList.map((q) => (
          <div
            key={q.id}
            className={`flex items-center gap-3 p-3 cursor-pointer border-b border-gray-100 hover:bg-gray-50 ${q.id === quoteId ? "bg-slate-100" : ""} ${selectedQuotes.includes(q.id) ? "bg-gray-100" : ""}`}
          >
            <input
              type="checkbox"
              className="w-4 h-4 cursor-pointer"
              checked={selectedQuotes.includes(q.id)}
              onChange={() => handleSelectQuote(q.id)}
              onClick={(e) => e.stopPropagation()}
            />
            <div className="flex-1 min-w-0" onClick={() => handleQuoteClick(q.id)}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-gray-900 truncate">{q.customerName || "Unknown Customer"}</span>
                <span className="text-sm font-medium text-gray-900">{formatCurrency(q.total, q.currency)}</span>
              </div>
              <div className="flex items-center gap-1 text-xs text-gray-600 mb-1">
                <span>{q.quoteNumber || q.id}</span>
                <span>•</span>
                <span>{formatDate(q.quoteDate)}</span>
              </div>
              <div>
                <span className={`text-xs font-medium ${(q.status || "draft").toLowerCase() === "draft" ? "text-slate-600" :
                  (q.status || "draft").toLowerCase() === "sent" ? "text-blue-800" :
                    (q.status || "draft").toLowerCase() === "open" ? "text-[#0D4A52]" :
                      (q.status || "draft").toLowerCase() === "accepted" ? "text-[#0D4A52]" :
                        ["declined", "rejected"].includes((q.status || "draft").toLowerCase()) ? "text-red-800" :
                          (q.status || "draft").toLowerCase() === "expired" ? "text-gray-800" :
                            "text-slate-600"
                  }`}>
                  {(q.status || "DRAFT").toUpperCase()}
                </span>
              </div>
            </div>
          </div>
        ))}

        {filteredQuotesList.length === 0 && (
          <div className="flex items-center justify-center py-12 text-center text-gray-500">
            <p>No quotes found</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuoteDetailDesktopSidebar;
