import React, { useState, useRef, useEffect } from "react";
import { ArrowLeft, Plus, Trash2, X, Info, ChevronDown, Search, Check } from "lucide-react";
import { transactionNumberSeriesAPI, locationsAPI } from "../../services/api";
import { toast } from "react-toastify";

// Transaction Number Series - New Series Page
interface Module {
  module: string;
  prefix: string;
  startingNumber: string;
  nextNumber?: string;
  restartNumbering: string;
  preview: string;
}

interface NewTransactionNumberSeriesPageProps {
  onBack: () => void;
  editSeriesItems?: any[];
}

export default function NewTransactionNumberSeriesPage({ onBack, editSeriesItems }: NewTransactionNumberSeriesPageProps) {
  const isEditMode = !!editSeriesItems && editSeriesItems.length > 0;
  const [seriesName, setSeriesName] = useState("");
  const [selectedLocations, setSelectedLocations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [locations, setLocations] = useState<any[]>([]);
  const [fetchingLocations, setFetchingLocations] = useState(true);
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const [locationSearch, setLocationSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Default list based on the image
  const defaultModules: Module[] = [
    { module: "Credit Note", prefix: "CN-", startingNumber: "00001", restartNumbering: "None", preview: "CN-00001" },
    { module: "Customer Payment", prefix: "", startingNumber: "1", restartNumbering: "None", preview: "1" },
    { module: "Sales Order", prefix: "SO-", startingNumber: "00001", restartNumbering: "None", preview: "SO-00001" },
    { module: "Retainer Invoice", prefix: "RET-", startingNumber: "00001", restartNumbering: "None", preview: "RET-00001" },
    { module: "Debit Note", prefix: "CDN-", startingNumber: "000001", restartNumbering: "None", preview: "CDN-000001" },
    { module: "Invoice", prefix: "INV-", startingNumber: "000001", restartNumbering: "None", preview: "INV-000001" },
    { module: "Quote", prefix: "QT-", startingNumber: "000001", restartNumbering: "None", preview: "QT-000001" },
    { module: "Sales Receipt", prefix: "SR-", startingNumber: "00001", restartNumbering: "None", preview: "SR-00001" },
    { module: "Subscriptions", prefix: "SUB-", startingNumber: "00001", restartNumbering: "None", preview: "SUB-00001" },
  ];

  const [modules, setModules] = useState<Module[]>(defaultModules);

  useEffect(() => {
    fetchLocations();

    if (isEditMode && editSeriesItems) {
      const firstItem = editSeriesItems[0];
      setSeriesName(firstItem.seriesName || "");
      
      // Initialize modules with existing data
      const updatedModules = defaultModules.map(dm => {
        const existing = editSeriesItems.find(item => 
          String(item.module || "").toLowerCase().replace(/s$/, "") === dm.module.toLowerCase().replace(/s$/, "")
        );
        if (existing) {
          return {
            ...dm,
            prefix: existing.prefix || "",
            startingNumber: String(existing.startingNumber || existing.nextNumber || "1"),
            nextNumber: String(existing.nextNumber || existing.startingNumber || "1"),
            preview: (existing.prefix || "") + (existing.startingNumber || existing.nextNumber || "1")
          };
        }
        return dm;
      });
      setModules(updatedModules);
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowLocationDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchLocations = async () => {
    try {
      setFetchingLocations(true);
      const response = await locationsAPI.getAll();
      if (response && response.success) {
        const locs = response.data || [];
        setLocations(locs);
        
        // If editing, set selected locations based on locationIds
        if (isEditMode && editSeriesItems?.[0]?.locationIds) {
          const ids = editSeriesItems[0].locationIds;
          const selected = locs.filter((l: any) => ids.includes(l._id || l.id));
          setSelectedLocations(selected);
        }
      }
    } catch (error) {
      console.error("Error fetching locations:", error);
    } finally {
      setFetchingLocations(false);
    }
  };

  const handleModuleChange = (index: number, field: keyof Module, value: string) => {
    const newModules = [...modules];
    (newModules[index] as any)[field] = value;

    if (field === 'prefix' || field === 'startingNumber') {
      newModules[index].preview = newModules[index].prefix + newModules[index].startingNumber;
    }

    setModules(newModules);
  };

  const toggleLocation = (loc: any) => {
    const isSelected = selectedLocations.some(item => item._id === loc._id);
    if (isSelected) {
      setSelectedLocations(selectedLocations.filter(item => item._id !== loc._id));
    } else {
      setSelectedLocations([...selectedLocations, loc]);
    }
  };

  const handleSave = async () => {
    if (!seriesName.trim()) {
      alert("Please enter a series name");
      return;
    }

    setIsLoading(true);
    try {
      const payload = {
        seriesName: seriesName.trim(),
        locationIds: selectedLocations.map(loc => loc._id), // Changed to plural locationIds
        modules: modules.map(module => ({
          module: module.module,
          prefix: module.prefix,
          startingNumber: module.startingNumber,
          nextNumber: module.nextNumber || module.startingNumber,
          currentNumber: parseInt(String(module.nextNumber || module.startingNumber), 10) || 1,
          restartNumbering: module.restartNumbering.toLowerCase(),
          isDefault: false
        }))
      };

      if (isEditMode) {
        await transactionNumberSeriesAPI.updateMultiple({
          ...payload,
          originalName: editSeriesItems?.[0]?.seriesName
        });
        toast.success(`Transaction series "${seriesName}" updated.`);
      } else {
        await transactionNumberSeriesAPI.createMultiple(payload);
        toast.success(`Transaction series "${seriesName}" created.`);
      }
      onBack();
    } catch (error: any) {
      console.error("Error creating transaction number series:", error);
      alert(error.message || "Failed to create transaction number series");
    } finally {
      setIsLoading(false);
    }
  };

  const removeLocation = (e: React.MouseEvent, locId: string) => {
    e.stopPropagation();
    setSelectedLocations(selectedLocations.filter(loc => (loc._id || loc.id) !== locId));
  };

  const filteredLocations = locations.filter(loc =>
    String(loc.name || "").toLowerCase().includes(locationSearch.toLowerCase())
  );

  return (
    <div className="flex flex-col font-sans">
      {/* Title with Close icon */}
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-[17px] font-semibold text-gray-800">
          {isEditMode ? "Edit Series" : "New Series"}
        </h2>
        <button
          onClick={onBack}
          className="p-1 hover:bg-gray-100 rounded-md text-red-500 transition-colors"
        >
          <X size={18} />
        </button>
      </div>

      {/* Main Content */}
      <div className="space-y-6 mb-10">
        <div className="flex items-center">
          <label className="w-[180px] text-[13px] font-medium text-red-500">
            Series Name*
          </label>
          <div className="flex-1 max-w-[420px]">
            <input
              type="text"
              value={seriesName}
              onChange={(e) => setSeriesName(e.target.value)}
              className="w-full h-[36px] bg-white border border-gray-200 rounded px-3 text-[14px] text-gray-700 focus:outline-none focus:border-[#1e5e6e] transition-all shadow-sm"
            />
          </div>
        </div>

        <div className="flex items-center">
          <label className="w-[180px] text-[13px] font-medium text-gray-700">
            Location
          </label>
          <div className="flex-1 max-w-[420px] relative" ref={dropdownRef}>
            <div
              onClick={() => setShowLocationDropdown(!showLocationDropdown)}
              className={`w-full min-h-[36px] bg-white border ${showLocationDropdown ? 'border-[#1e5e6e] ring-2 ring-blue-50' : 'border-gray-200'} rounded px-2 py-1 flex flex-wrap gap-1.5 items-center justify-between text-[14px] cursor-pointer transition-all shadow-sm`}
            >
              <div className="flex flex-wrap gap-1.5 items-center">
                {selectedLocations.length > 0 ? (
                  selectedLocations.map((loc) => (
                    <span 
                      key={loc._id || loc.id} 
                      className="inline-flex items-center gap-1.5 bg-[#f0f9fa] text-[#1e5e6e] text-[12px] px-2 py-0.5 rounded border border-[#c9e1e6]"
                    >
                      {loc.name}
                      <X 
                        size={12} 
                        className="hover:text-red-500 transition-colors" 
                        onClick={(e) => removeLocation(e, loc._id || loc.id)}
                      />
                    </span>
                  ))
                ) : (
                  <span className="text-gray-400 ml-1">Add Location</span>
                )}
              </div>
              <ChevronDown size={14} className={`text-gray-400 mr-1 transition-transform ${showLocationDropdown ? 'rotate-180' : ''}`} />
            </div>

            {showLocationDropdown && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl z-[100] animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="p-2 border-b border-gray-50">
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      autoFocus
                      placeholder="Search"
                      value={locationSearch}
                      onChange={(e) => setLocationSearch(e.target.value)}
                      className={`w-full h-[36px] pl-9 pr-3 bg-white border border-gray-200 rounded-md text-[13px] focus:outline-none focus:border-[#1e5e6e]`}
                    />
                  </div>
                </div>
                <div className="max-h-[220px] overflow-y-auto custom-scrollbar p-1">
                  {fetchingLocations ? (
                    <div className="p-3 text-center text-gray-400 text-[13px]">Loading locations...</div>
                  ) : filteredLocations.length > 0 ? (
                    filteredLocations.map((loc) => {
                      const isSelected = selectedLocations.some(item => (item._id || item.id) === (loc._id || loc.id));
                      return (
                        <div
                          key={loc._id || loc.id}
                          onClick={() => toggleLocation(loc)}
                          className={`flex items-center justify-between px-3 py-2.5 text-[14px] rounded cursor-pointer transition-colors ${isSelected
                            ? 'bg-[#f0f9fa] text-[#1e5e6e] font-medium'
                            : 'text-gray-700 hover:bg-gray-50'
                            }`}
                        >
                          <span>{loc.name}</span>
                          {isSelected && <Check size={16} className="text-[#1e5e6e]" />}
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-3 text-center text-gray-400 text-[13px]">No locations found</div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded border-l border-t border-[#eff2f7] overflow-hidden mb-12">
        <table className="w-full text-left border-collapse whitespace-nowrap">
          <thead className="bg-[#fcfdff] border-b border-[#eff2f7]">
            <tr>
              <th className="px-5 py-2.5 text-[10.5px] font-bold text-[#718096] uppercase tracking-wider border-r border-[#eff2f7] w-[250px]">MODULE</th>
              <th className="px-5 py-2.5 text-[10.5px] font-bold text-[#718096] uppercase tracking-wider border-r border-[#eff2f7] w-[180px]">PREFIX</th>
              <th className="px-5 py-2.5 text-[10.5px] font-bold text-[#718096] uppercase tracking-wider border-r border-[#eff2f7] w-[200px]">
                <div className="flex items-center gap-1">
                  STARTING NUMBER
                  <Info size={12} className="text-gray-400" />
                </div>
              </th>
              <th className="px-5 py-2.5 text-[10.5px] font-bold text-[#718096] uppercase tracking-wider border-r border-[#eff2f7]">
                <div className="flex items-center gap-1">
                  PREVIEW
                  <Info size={12} className="text-gray-400" />
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#eff2f7]">
            {modules.map((item, index) => (
              <tr key={index} className="hover:bg-[#fcfdff] transition-colors border-b border-[#eff2f7] last:border-b-0">
                <td className="px-5 py-3 border-r border-[#eff2f7]">
                  <span className="text-[13px] font-medium text-gray-700">{item.module}</span>
                </td>
                <td className="px-5 py-3 border-r border-[#eff2f7]">
                  <div className="max-w-[150px]">
                    <input
                      type="text"
                      value={item.prefix}
                      onChange={(e) => handleModuleChange(index, 'prefix', e.target.value)}
                      className="w-full h-[28px] border border-transparent hover:border-gray-200 focus:border-[#1e5e6e] focus:bg-white rounded px-1.5 transition-all text-[13px] text-[#4a5568] outline-none"
                    />
                  </div>
                </td>
                <td className="px-5 py-3 border-r border-[#eff2f7]">
                  <div className="max-w-[120px]">
                    <input
                      type="text"
                      value={item.startingNumber}
                      onChange={(e) => handleModuleChange(index, 'startingNumber', e.target.value)}
                      className="w-full h-[28px] border border-transparent hover:border-gray-200 focus:border-[#1e5e6e] focus:bg-white rounded px-1.5 transition-all text-[13px] text-[#4a5568] outline-none"
                    />
                  </div>
                </td>
                <td className="px-5 py-3 border-r border-[#eff2f7]">
                  <span className="text-[13px] text-[#4a5568]">{item.preview}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer Actions */}
      <div className="flex items-center gap-3 pt-4">
        <button
          onClick={handleSave}
          disabled={isLoading}
          className="px-6 h-[32px] bg-[#1e5e6e] text-white text-[13px] font-bold rounded hover:bg-[#164a58] transition-colors shadow-sm disabled:bg-gray-300 min-w-[70px]"
        >
          {isLoading ? "Saving..." : "Save"}
        </button>
        <button
          onClick={onBack}
          className="px-6 h-[32px] bg-white border border-gray-300 text-[13px] font-medium text-gray-700 rounded hover:bg-gray-50 transition-colors shadow-sm"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
