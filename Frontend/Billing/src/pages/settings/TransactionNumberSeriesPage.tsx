import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Loader2, Plus, Settings, Trash2 } from "lucide-react";
import { transactionNumberSeriesAPI, locationsAPI } from "../../services/api";
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
  const [locations, setLocations] = useState<any[]>([]);
  const [activePopoverSeries, setActivePopoverSeries] = useState<string | null>(null);
  const [popoverCoords, setPopoverCoords] = useState<{ top: number; left: number; width: number } | null>(null);

  useEffect(() => {
    fetchSeries();
    fetchSettings();
    fetchLocations();
  }, []);

  // Handle outside click to close popover
  useEffect(() => {
    const handleClickOutside = () => setActivePopoverSeries(null);
    if (activePopoverSeries) {
      window.addEventListener("click", handleClickOutside);
    }
    return () => window.removeEventListener("click", handleClickOutside);
  }, [activePopoverSeries]);

  const fetchLocations = async () => {
    try {
      const response = await locationsAPI.getAll();
      if (response && response.success) {
        setLocations(response.data || []);
      }
    } catch (e) {
      console.error("Error fetching locations:", e);
    }
  };

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
      <div className="flex min-h-screen flex-col bg-[#f8f9fb] font-sans">
        <div className="mx-auto w-full max-w-[1800px] p-4 md:p-6 lg:px-8">
          <div className="overflow-hidden rounded-2xl border border-[#eaedf3] bg-white shadow-sm">
            <div className="p-6 md:p-8">
              <NewTransactionNumberSeriesPage
                onBack={handleBackFromNewSeries}
                editSeriesItems={selectedSeriesToEdit || undefined}
              />
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
              <button
                onClick={() => setShowSettingsModal(true)}
                className="flex items-center gap-1.5 whitespace-nowrap text-[12px] font-medium text-[#1e5e6e] hover:underline"
              >
                <Settings size={14} className="text-[#1e5e6e]" />
                Prevent Duplicate Transaction Numbers
              </button>
              <button
                onClick={handleNewSeries}
                className="flex h-9 items-center gap-2 whitespace-nowrap rounded-md bg-[#1e5e6e] px-4 text-[12px] font-bold text-white shadow-sm transition-colors hover:bg-[#164a58] active:scale-95"
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
                  {displayModules.map((moduleName) => (
                    <th
                      key={moduleName}
                      className="min-w-[120px] border-r border-[#eff2f7] px-4 py-3 text-[10.5px] font-bold uppercase tracking-wider text-[#718096] md:min-w-[130px] md:px-5"
                    >
                      {moduleName}
                    </th>
                  ))}
                  <th className="min-w-[150px] whitespace-normal border-r border-[#eff2f7] px-4 py-3 text-[10.5px] font-bold uppercase tracking-wider leading-tight text-[#718096] md:px-5">
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
                    <tr
                      key={name}
                      className="group cursor-pointer transition-colors hover:bg-[#fcfdff]"
                      onClick={() => handleEditSeries(name)}
                    >
                      <td className="relative border-r border-[#eff2f7] px-4 py-4 md:px-5">
                        <div className="flex items-center justify-between group/name">
                          <button className="text-left text-[13.5px] font-medium text-[#1e5e6e] hover:underline">
                            {name}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteSeries(name);
                            }}
                            className="ml-2 rounded p-1 text-red-400 opacity-0 transition-all hover:bg-red-50 hover:text-red-600 group-hover:opacity-100"
                            title="Delete Series"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                      {displayModules.map((moduleName) => {
                        // Robust matching for module names (singular vs plural, case insensitive)
                        const moduleSeries = items.find((s) => {
                          const m = String(s.module || "").toLowerCase().replace(/s$/, "");
                          const target = moduleName.toLowerCase().replace(/s$/, "");
                          return m === target || m.replace(/\s/g, "-") === target.replace(/\s/g, "-");
                        });

                        return (
                          <td key={moduleName} className="border-r border-[#eff2f7] px-4 py-4 md:px-5">
                            {moduleSeries ? (
                              <span className="text-[13px] text-[#4a5568]">
                                {moduleSeries.prefix || ""}
                                {moduleSeries.startingNumber || moduleSeries.nextNumber || "1"}
                              </span>
                            ) : (
                              <span className="text-[13px] text-gray-200">-</span>
                            )}
                          </td>
                        );
                      })}
                      <td className="relative border-r border-[#eff2f7] px-4 py-4 md:px-5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const rect = e.currentTarget.getBoundingClientRect();
                            setPopoverCoords({
                              top: rect.bottom + window.scrollY,
                              left: rect.left + rect.width / 2 + window.scrollX,
                              width: rect.width,
                            });
                            setActivePopoverSeries(activePopoverSeries === name ? null : name);
                          }}
                          className="ml-1 block w-full text-center text-[13px] font-medium text-[#3b82f6] hover:underline"
                        >
                          {locationCount}
                        </button>

                        {/* Associated Locations Popover - Rendered via Portal */}
                        {activePopoverSeries === name &&
                          popoverCoords &&
                          createPortal(
                            <div
                              className="fixed z-[9999] w-[200px] rounded border border-[#3b82f6] bg-white shadow-xl animate-in fade-in slide-in-from-top-2 duration-200"
                              style={{
                                top: `${popoverCoords.top + 8}px`,
                                left: `${popoverCoords.left}px`,
                                transform: "translateX(-50%)",
                              }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              {/* Triangle Pointer (Top) */}
                              <div className="absolute bottom-[100%] left-1/2 h-0 w-0 -translate-x-1/2 border-l-[7px] border-r-[7px] border-b-[7px] border-l-transparent border-r-transparent border-b-[#3b82f6]">
                                {/* Inner triangle to hide the blue border inside */}
                                <div className="absolute left-[-7px] top-[1px] h-0 w-0 border-l-[7px] border-r-[7px] border-b-[7px] border-l-transparent border-r-transparent border-b-white"></div>
                              </div>

                              <div className="p-4 text-left">
                                <h3 className="mb-3 text-[12px] font-bold uppercase tracking-wide text-[#4a5568]">
                                  ASSOCIATED LOCATIONS
                                </h3>
                                <div className="space-y-2">
                                  {firstItem.locationIds?.length > 0 ? (
                                    firstItem.locationIds.map((locId: string) => {
                                      const loc = locations.find((l) => (l._id || l.id) === locId);
                                      return (
                                        <div key={locId} className="text-[13.5px] font-medium text-gray-700">
                                          {loc ? (loc.locationName || loc.name) : "Head Office"}
                                        </div>
                                      );
                                    })
                                  ) : (
                                    <div className="whitespace-nowrap text-[13.5px] font-medium text-gray-700">
                                      Head Office
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>,
                            document.body
                          )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
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
