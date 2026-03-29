import React, { useState, useEffect } from "react";
import { Loader2, Plus, Settings } from "lucide-react";
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
      <div className="flex min-h-screen flex-col bg-[#f8f9fb] font-sans">
        <div className="mx-auto w-full max-w-[1800px] p-4 md:p-6 lg:px-8">
          <div className="overflow-hidden rounded-2xl border border-[#eaedf3] bg-white shadow-sm">
            <div className="p-6 md:p-8">
          <NewTransactionNumberSeriesPage onBack={handleBackFromNewSeries} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#f8f9fb] font-sans">
      <div className="mx-auto w-full max-w-[1800px] p-4 md:p-6 lg:px-8">
      <div className="overflow-hidden rounded-2xl border border-[#eaedf3] bg-white shadow-sm">
        {/* Top Header */}
        <div className="flex flex-col gap-4 border-b border-[#eff2f7] px-4 py-4 md:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <h1 className="truncate text-[17px] font-semibold text-[#1a202c]">
              Transaction Number Series
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-3 md:gap-4 lg:justify-end">
            <button className="flex items-center gap-1.5 whitespace-nowrap text-[12px] font-medium text-[#3b82f6] hover:underline">
              <Settings size={14} className="text-[#3b82f6]" />
              Prevent Duplicate Transaction Numbers
            </button>
            <button
              onClick={handleNewSeries}
              className="flex h-9 items-center gap-2 whitespace-nowrap rounded-md bg-[#3b82f6] px-4 text-[12px] font-medium text-white shadow-sm transition-colors hover:bg-blue-600 active:scale-95"
            >
              <Plus size={16} />
              New Series
            </button>
          </div>
        </div>

        {/* Sub Header */}
        <div className="flex items-center gap-2 border-b border-[#eff2f7] bg-[#fcfdff] px-4 py-3 md:px-6">
          <span className="text-[13px] font-semibold text-[#1a202c]">All Series</span>
          <span className="rounded-[3px] bg-[#edf2f7] px-1.5 py-0.5 text-[11px] font-bold leading-none text-[#4a5568]">
            {seriesNames.length}
          </span>
        </div>

        {/* Horizontal Table */}
        <div className="w-full overflow-x-auto overflow-y-hidden custom-scrollbar">
          <table className="min-w-max w-full border-collapse whitespace-nowrap border-l border-t border-[#eff2f7] text-left">
            <thead>
              <tr className="border-b border-[#eff2f7] bg-[#fcfdff]">
                <th className="min-w-[180px] border-r border-[#eff2f7] px-4 py-3 text-[10.5px] font-bold uppercase tracking-wider text-[#718096] md:px-5">
                  SERIES NAME
                </th>
                {allModules.map(moduleName => (
                  <th
                    key={moduleName}
                    className="min-w-[120px] border-r border-[#eff2f7] px-4 py-3 text-[10.5px] font-bold uppercase tracking-wider text-[#718096] md:min-w-[130px] md:px-5"
                  >
                    {moduleName}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#eff2f7]">
              {seriesNames.map((name) => (
                <tr key={name} className="hover:bg-[#f8f9fb] transition-colors">
                  <td className="border-r border-[#eff2f7] px-4 py-4 md:px-5">
                    <button className="text-left text-[13.5px] font-medium text-[#3b82f6] hover:underline">
                      {name}
                    </button>
                  </td>
                  {allModules.map(moduleName => {
                    const moduleSeries = groupedSeries[name].find(s => s.module === moduleName);
                    return (
                      <td key={moduleName} className="border-r border-[#eff2f7] px-4 py-4 md:px-5">
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
  );
}
