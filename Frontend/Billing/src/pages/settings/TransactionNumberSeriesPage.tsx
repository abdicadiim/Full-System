import React, { useState, useEffect } from "react";
import { Loader2, Plus, Settings, ChevronRight, Trash2 } from "lucide-react";
import { transactionNumberSeriesAPI } from "../../services/api";
import { toast } from "react-toastify";
import NewTransactionNumberSeriesPage from "./NewTransactionNumberSeriesPage";
import PreventDuplicatesModal from "./PreventDuplicatesModal";

export default function TransactionNumberSeriesPage() {
  const [showNewSeriesPage, setShowNewSeriesPage] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [series, setSeries] = useState<any[]>([]);
  const [selectedSeriesToEdit, setSelectedSeriesToEdit] = useState<any[] | null>(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [currentSetting, setCurrentSetting] = useState("all_fiscal_years");

  useEffect(() => {
    fetchSeries();
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await transactionNumberSeriesAPI.getSettings();
      if (response && response.success) {
        setCurrentSetting(response.data.preventDuplicates);
      }
    } catch (e) {
      console.error("Error fetching settings:", e);
    }
  };

  const handleSaveSettings = async (selection: string) => {
    try {
      await transactionNumberSeriesAPI.updateSettings({ preventDuplicates: selection });
      setCurrentSetting(selection);
      setShowSettingsModal(false);
      toast.success("Settings saved successfully.");
    } catch (e) {
      console.error("Error saving settings:", e);
      alert("Failed to save settings");
    }
  };

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
    setSelectedSeriesToEdit(null);
    setShowNewSeriesPage(true);
  };

  const handleEditSeries = (name: string) => {
    const items = groupedSeries[name];
    setSelectedSeriesToEdit(items);
    setShowNewSeriesPage(true);
  };

  const handleBackFromNewSeries = () => {
    setShowNewSeriesPage(false);
    setSelectedSeriesToEdit(null);
    fetchSeries();
  };

  const handleDeleteSeries = async (name: string) => {
    if (!window.confirm(`Are you sure you want to delete the "${name}" series?`)) return;
    
    try {
      const items = groupedSeries[name];
      for (const item of items) {
        await transactionNumberSeriesAPI.delete(item._id || item.id);
      }
      toast.success(`Transaction series "${name}" deleted.`);
      fetchSeries();
    } catch (e) {
      console.error("Error deleting series:", e);
      alert("Failed to delete series");
    }
  };

  // Group series by name
  const groupedSeries: Record<string, any[]> = series.reduce((acc, item) => {
    const name = item.seriesName || "Standard";
    if (!acc[name]) acc[name] = [];
    acc[name].push(item);
    return acc;
  }, {} as Record<string, any[]>);

  const seriesNames = Object.keys(groupedSeries);

  // Fixed list of modules in the order shown in the image
  const displayModules = [
    "Retainer Invoice",
    "Credit Note",
    "Customer Payment",
    "Subscriptions",
    "Debit Note",
    "Invoice",
    "Sales Order",
    "Quote",
    "Sales Receipt"
  ];

  if (isLoading && series.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-[#1e5e6e]" />
      </div>
    );
  }

  if (showNewSeriesPage) {
    return (
      <div className="flex flex-col min-h-screen bg-[#f8f9fb] font-sans">
        <div className="m-4 md:m-6 bg-white border border-[#eaedf3] rounded-sm overflow-hidden shadow-sm p-6 md:p-8">
          <NewTransactionNumberSeriesPage 
            onBack={handleBackFromNewSeries} 
            editSeriesItems={selectedSeriesToEdit || undefined}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#f8f9fb] font-sans">
      <div className="m-4 md:m-6 bg-white border border-[#eaedf3] rounded-sm shadow-sm overflow-hidden">
        {/* Top Header */}
        <div className="px-4 md:px-6 py-4 flex flex-wrap items-center justify-between border-b border-[#eff2f7] gap-y-4">
          <h1 className="text-[17px] font-semibold text-[#1a202c] mr-4 whitespace-nowrap">
            Transaction Number Series
          </h1>
          <div className="flex flex-wrap items-center gap-3 md:gap-6">
            <button 
              onClick={() => setShowSettingsModal(true)}
              className="flex items-center gap-1.5 text-[#1e5e6e] text-[12px] font-medium hover:underline whitespace-nowrap"
            >
              <Settings size={14} className="text-[#1e5e6e]" />
              Prevent Duplicate Transaction Numbers
            </button>
            <button
              onClick={handleNewSeries}
              className="px-4 h-[32px] bg-[#1e5e6e] text-white text-[12px] font-bold rounded-[4px] hover:bg-[#164a58] transition-colors flex items-center gap-2 whitespace-nowrap shadow-sm active:scale-95 transition-all"
            >
              <Plus size={16} />
              New Series
            </button>
          </div>
        </div>

        {/* Sub Header */}
        <div className="px-5 py-3 flex items-center gap-2 border-b border-[#eff2f7] bg-[#fcfdff]">
          <span className="text-[13px] font-semibold text-[#1a202c]">All Series</span>
          <span className="bg-[#edf2f7] text-[#4a5568] text-[11px] font-bold px-1.5 py-0.5 rounded-[3px] leading-none">
            {seriesNames.length}
          </span>
        </div>

        {/* Horizontal Table */}
        <div className="w-full overflow-x-auto overflow-y-hidden custom-scrollbar">
          <table className="w-full text-left border-collapse whitespace-nowrap border-l border-t border-[#eff2f7]">
            <thead>
              <tr className="bg-[#fcfdff] border-b border-[#eff2f7]">
                <th className="px-5 py-3 text-[10.5px] font-bold text-[#718096] uppercase tracking-wider border-r border-[#eff2f7] min-w-[200px]">
                  SERIES NAME
                </th>
                {displayModules.map(moduleName => (
                  <th
                    key={moduleName}
                    className="px-5 py-3 text-[10.5px] font-bold text-[#718096] uppercase tracking-wider border-r border-[#eff2f7] min-w-[150px]"
                  >
                    {moduleName}
                  </th>
                ))}
                <th className="px-5 py-3 text-[10.5px] font-bold text-[#718096] uppercase tracking-wider border-r border-[#eff2f7] min-w-[130px] whitespace-normal leading-tight">
                  ASSOCIATED LOCATIONS
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#eff2f7]">
              {seriesNames.map((name) => {
                const items = groupedSeries[name];
                const firstItem = items[0] || {};
                const locationCount = Array.isArray(firstItem.locationIds) ? firstItem.locationIds.length : 1;
                
                return (
                  <tr key={name} className="hover:bg-[#fcfdff] transition-colors group">
                    <td className="px-5 py-4 border-r border-[#eff2f7] relative">
                      <div className="flex items-center justify-between group/name">
                        <button 
                          onClick={() => handleEditSeries(name)}
                          className="text-[13.5px] font-medium text-[#1e5e6e] hover:underline text-left"
                        >
                          {name}
                        </button>
                        <button 
                          onClick={() => handleDeleteSeries(name)}
                          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-50 text-red-400 hover:text-red-600 rounded transition-all ml-2"
                          title="Delete Series"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                    {displayModules.map(moduleName => {
                      // Robust matching for module names (singular vs plural, case insensitive)
                      const moduleSeries = items.find(s => {
                        const m = String(s.module || "").toLowerCase().replace(/s$/, "");
                        const target = moduleName.toLowerCase().replace(/s$/, "");
                        return m === target || m.replace(/\s/g, "-") === target.replace(/\s/g, "-");
                      });

                      return (
                        <td key={moduleName} className="px-5 py-4 border-r border-[#eff2f7]">
                          {moduleSeries ? (
                            <span className="text-[13px] text-[#4a5568]">
                              {moduleSeries.prefix || ""}{moduleSeries.startingNumber || moduleSeries.nextNumber || "1"}
                            </span>
                          ) : (
                            <span className="text-[13px] text-gray-200">-</span>
                          )}
                        </td>
                      );
                    })}
                    <td className="px-5 py-4 border-r border-[#eff2f7]">
                      <button className="text-[13px] text-[#1e5e6e] font-medium ml-1 text-center block w-full">
                        {locationCount}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {showSettingsModal && (
        <PreventDuplicatesModal 
          onClose={() => setShowSettingsModal(false)}
          onSave={handleSaveSettings}
          currentValue={currentSetting}
        />
      )}
    </div>
  );
}
