import React, { useState, useEffect } from "react";
import { Loader2, Plus, Settings, ChevronRight } from "lucide-react";
import { transactionNumberSeriesAPI } from "../../services/api";
import NewTransactionNumberSeriesPage from "./NewTransactionNumberSeriesPage";

export default function TransactionNumberSeriesPage() {
  const [showNewSeriesPage, setShowNewSeriesPage] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [series, setSeries] = useState<any[]>([]);

  useEffect(() => {
    fetchSeries();
  }, []);

  const fetchSeries = async () => {
    setIsLoading(true);
    try {
      const response = await transactionNumberSeriesAPI.getAll();
      if (response && response.success) {
        setSeries(response.data);
      }
    } catch (error) {
      console.error("Error fetching series:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewSeries = () => {
    setShowNewSeriesPage(true);
  };

  const handleBackFromNewSeries = () => {
    setShowNewSeriesPage(false);
    fetchSeries();
  };

  // Group series by name
  const groupedSeries: Record<string, any[]> = series.reduce((acc, item) => {
    const name = item.seriesName || "Standard";
    if (!acc[name]) acc[name] = [];
    acc[name].push(item);
    return acc;
  }, {} as Record<string, any[]>);

  const seriesNames = Object.keys(groupedSeries);

  // Get all unique modules to form columns
  const allModules = Array.from(new Set(series.map(s => s.module))).sort();

  if (isLoading && series.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (showNewSeriesPage) {
    return (
      <div className="flex flex-col min-h-screen bg-[#f8f9fb] font-sans">
        <div className="m-4 md:m-6 bg-white border border-[#eaedf3] rounded-sm overflow-hidden shadow-sm p-6 md:p-8">
          <NewTransactionNumberSeriesPage onBack={handleBackFromNewSeries} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#f8f9fb] font-sans">
      <div className="m-4 md:m-6 bg-white border border-[#eaedf3] rounded-sm shadow-sm">
        {/* Top Header */}
        <div className="px-4 md:px-6 py-4 flex flex-wrap items-center justify-between border-b border-[#eff2f7] gap-y-4">
          <h1 className="text-[17px] font-semibold text-[#1a202c] mr-4 whitespace-nowrap">
            Transaction Number Series
          </h1>
          <div className="flex flex-wrap items-center gap-3 md:gap-6">
            <button className="flex items-center gap-1.5 text-[#3b82f6] text-[12.5px] font-medium hover:underline whitespace-nowrap">
              <Settings size={14} className="text-[#3b82f6]" />
              Prevent Duplicate Transaction Numbers
            </button>
            <button
              onClick={handleNewSeries}
              className="px-4 h-[34px] bg-[#3b82f6] text-white text-[12.5px] font-medium rounded-[4px] hover:bg-blue-600 transition-colors flex items-center gap-2 whitespace-nowrap shadow-sm active:scale-95 transition-all"
            >
              <Plus size={16} />
              New Series
            </button>
          </div>
        </div>

        {/* Sub Header */}
        <div className="px-4 md:px-6 py-4 flex items-center gap-2 border-b border-[#eff2f7]">
          <span className="text-[14px] font-semibold text-gray-700 font-sans">All Series</span>
          <span className="bg-[#eaedf3] text-[#718096] text-[10px] font-bold px-1.5 py-0.5 rounded leading-none">
            {seriesNames.length}
          </span>
        </div>

        {/* Horizontal Table */}
        <div className="w-full overflow-x-scroll overflow-y-hidden">
          <div className="min-w-max">
            <table className="text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="bg-[#fcfdff] border-b border-[#eff2f7]">
                <th className="px-6 py-3 text-[11px] font-bold text-[#718096] uppercase tracking-wider border-r border-[#eff2f7] min-w-[200px]">
                  SERIES NAME
                </th>
                {allModules.map(moduleName => (
                  <th
                    key={moduleName}
                    className="px-6 py-3 text-[11px] font-bold text-[#718096] uppercase tracking-wider border-r border-[#eff2f7] min-w-[180px]"
                  >
                    {moduleName}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#eff2f7]">
              {seriesNames.map((name) => (
                <tr key={name} className="hover:bg-[#f8f9fb] transition-colors">
                  <td className="px-6 py-4 border-r border-[#eff2f7]">
                    <button className="text-[14px] font-medium text-[#3b82f6] hover:underline text-left">
                      {name}
                    </button>
                  </td>
                  {allModules.map(moduleName => {
                    const moduleSeries = groupedSeries[name].find(s => s.module === moduleName);
                    return (
                      <td key={moduleName} className="px-6 py-4 border-r border-[#eff2f7]">
                        {moduleSeries ? (
                          <span className="text-[13px] text-[#4a5568]">
                            {moduleSeries.prefix}{moduleSeries.startingNumber}
                          </span>
                        ) : (
                          <span className="text-[13px] text-[#cbd5e0]">-</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
