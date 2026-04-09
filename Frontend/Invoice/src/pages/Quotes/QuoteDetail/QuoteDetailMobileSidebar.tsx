import React from "react";
import { ChevronDown, ChevronUp, X } from "lucide-react";
import { formatCurrency, formatDate } from "./QuoteDetail.utils";

type Props = {
  quoteId?: string;
  filteredQuotesList?: any[];
  selectedQuotes?: any[];
  selectedFilter?: string;
  isFilterDropdownOpen?: boolean;
  filterOptions?: string[];
  showMobileSidebar?: boolean;
  setShowMobileSidebar: (value: boolean) => void;
  setIsFilterDropdownOpen: (value: boolean) => void;
  setSelectedFilter: (value: string) => void;
  handleQuoteClick: (id: any) => void;
  handleSelectQuote: (id: any) => void;
};

const QuoteDetailMobileSidebar = ({
  quoteId,
  filteredQuotesList = [],
  selectedQuotes = [],
  selectedFilter = "All Quotes",
  isFilterDropdownOpen = false,
  filterOptions = [],
  showMobileSidebar = false,
  setShowMobileSidebar,
  setIsFilterDropdownOpen,
  setSelectedFilter,
  handleQuoteClick,
  handleSelectQuote,
}: Props) => {
  if (!showMobileSidebar) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden" onClick={() => setShowMobileSidebar(false)} />
      <div className="fixed top-0 left-0 w-80 h-full bg-white shadow-xl z-50 md:hidden overflow-hidden">
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Quotes</h2>
            <button
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-md cursor-pointer"
              onClick={() => setShowMobileSidebar(false)}
            >
              <X size={20} />
            </button>
          </div>

          <div className="p-4 border-b border-gray-200">
            <div className="relative">
              <div
                className="flex items-center justify-between px-4 py-2 border border-gray-300 rounded-md bg-white cursor-pointer hover:bg-gray-50"
                onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)}
              >
                <span className="text-sm text-gray-700">{selectedFilter}</span>
                {isFilterDropdownOpen ? <ChevronUp size={16} className="text-gray-500" /> : <ChevronDown size={16} className="text-gray-500" />}
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
          </div>

          <div className="flex-1 overflow-y-auto">
            {filteredQuotesList.map((q) => (
              <div
                key={q.id}
                className={`flex items-center gap-3 p-3 cursor-pointer border-b border-gray-100 hover:bg-gray-50 ${q.id === quoteId ? "bg-slate-100" : ""} ${selectedQuotes.includes(q.id) ? "bg-gray-100" : ""}`}
                onClick={() => {
                  handleQuoteClick(q.id);
                  setShowMobileSidebar(false);
                }}
              >
                <input
                  type="checkbox"
                  className="w-4 h-4 cursor-pointer"
                  checked={selectedQuotes.includes(q.id)}
                  style={{ accentColor: "#1b5e6a" }}
                  onChange={() => handleSelectQuote(q.id)}
                  onClick={(e) => e.stopPropagation()}
                />
                <div className="flex-1 min-w-0">
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
      </div>
    </>
  );
};

export default QuoteDetailMobileSidebar;
