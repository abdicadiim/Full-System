import React, { useState, useRef, useEffect } from "react";
import { ArrowLeft, Plus, Trash2, X, Info, ChevronDown, Search, Check } from "lucide-react";
import { transactionNumberSeriesAPI, locationsAPI } from "../../services/api";

// Transaction Number Series - New Series Page
interface Module {
  module: string;
  prefix: string;
  startingNumber: string;
  restartNumbering: string;
  preview: string;
}

interface NewTransactionNumberSeriesPageProps {
  onBack: () => void;
}

export default function NewTransactionNumberSeriesPage({ onBack }: NewTransactionNumberSeriesPageProps) {
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
    { module: "Journal", prefix: "", startingNumber: "1", restartNumbering: "None", preview: "1" },
    { module: "Customer Payment", prefix: "", startingNumber: "1", restartNumbering: "None", preview: "1" },
    { module: "Vendor Payment", prefix: "", startingNumber: "1", restartNumbering: "None", preview: "1" },
    { module: "Purchase Order", prefix: "MO-%FYE_YY%%YYYY%%DD%", startingNumber: "00001", restartNumbering: "Yearly", preview: "MO-2620261200001" },
    { module: "Sales Order", prefix: "SO-", startingNumber: "00001", restartNumbering: "None", preview: "SO-00001" },
    { module: "Retainer Invoice", prefix: "RET-", startingNumber: "00001", restartNumbering: "None", preview: "RET-00001" },
    { module: "Vendor Credits", prefix: "DN-", startingNumber: "00001", restartNumbering: "None", preview: "DN-00001" },
    { module: "Debit Note", prefix: "CDN-", startingNumber: "000001", restartNumbering: "None", preview: "CDN-000001" },
    { module: "Invoice", prefix: "INV-", startingNumber: "000001", restartNumbering: "None", preview: "INV-000001" },
    { module: "Quote", prefix: "QT-", startingNumber: "000001", restartNumbering: "None", preview: "QT-000001" },
    { module: "Sales Receipt", prefix: "SR-", startingNumber: "00001", restartNumbering: "None", preview: "SR-00001" },
    { module: "Sales Return", prefix: "RMA-", startingNumber: "00001", restartNumbering: "None", preview: "RMA-00001" },
  ];

  const [modules, setModules] = useState<Module[]>(defaultModules);

  useEffect(() => {
    fetchLocations();

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
        setLocations(response.data || []);
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
          currentNumber: parseInt(module.startingNumber) || 1,
          restartNumbering: module.restartNumbering.toLowerCase(),
          isDefault: false
        }))
      };

      await transactionNumberSeriesAPI.createMultiple(payload);
      onBack();
    } catch (error: any) {
      console.error("Error creating transaction number series:", error);
      alert(error.message || "Failed to create transaction number series");
    } finally {
      setIsLoading(false);
    }
  };

  const filteredLocations = locations.filter(loc =>
    loc.name.toLowerCase().includes(locationSearch.toLowerCase())
  );

  const getDisplayValue = () => {
    if (selectedLocations.length === 0) return 'Add Location';
    if (selectedLocations.length === 1) return selectedLocations[0].name;
    return `${selectedLocations[0].name} (+${selectedLocations.length - 1})`;
  };

  return (
    <div className="flex flex-col font-sans">
      {/* Title with Close icon */}
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-[17px] font-semibold text-gray-800">New Series</h2>
        <button
          onClick={onBack}
          className="p-1 hover:bg-gray-100 rounded-md text-red-500 transition-colors"
        >
          <X size={18} />
        </button>
      </div>

      {/* Main Content */}
      <div className="space-y-6 mb-10">
        <div className="flex items-start">
          <label className="w-[180px] text-[13px] font-medium text-red-400 mt-2">
            Series Name*
          </label>
          <div className="flex-1 max-w-[420px]">
            <input
              type="text"
              value={seriesName}
              onChange={(e) => setSeriesName(e.target.value)}
              className="w-full h-[36px] bg-white border border-[#e2e8f0] rounded px-3 text-[14px] text-gray-700 focus:outline-none focus:border-blue-400 transition-all"
            />
          </div>
        </div>

        <div className="flex items-start">
          <label className="w-[180px] text-[13px] font-medium text-gray-500 mt-2">
            Location
          </label>
          <div className="flex-1 max-w-[420px] relative" ref={dropdownRef}>
            <div
              onClick={() => setShowLocationDropdown(!showLocationDropdown)}
              className={`w-full h-[36px] bg-white border ${showLocationDropdown ? 'border-blue-400 ring-2 ring-blue-50' : 'border-[#e2e8f0]'} rounded px-3 flex items-center justify-between text-[14px] text-gray-600 cursor-pointer transition-all`}
            >
              <span className={selectedLocations.length > 0 ? 'text-gray-900' : 'text-gray-400'}>
                {getDisplayValue()}
              </span>
              <ChevronDown size={14} className={`text-gray-400 transition-transform ${showLocationDropdown ? 'rotate-180' : ''}`} />
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
                      className="w-full h-[36px] pl-9 pr-3 bg-white border border-gray-200 rounded-md text-[13px] focus:outline-none focus:border-blue-400"
                    />
                  </div>
                </div>
                <div className="max-h-[220px] overflow-y-auto custom-scrollbar p-1">
                  {fetchingLocations ? (
                    <div className="p-3 text-center text-gray-400 text-[13px]">Loading locations...</div>
                  ) : filteredLocations.length > 0 ? (
                    filteredLocations.map((loc) => {
                      const isSelected = selectedLocations.some(item => item._id === loc._id);
                      return (
                        <div
                          key={loc._id}
                          onClick={() => toggleLocation(loc)}
                          className={`flex items-center justify-between px-3 py-2.5 text-[14px] rounded cursor-pointer transition-colors ${isSelected
                            ? 'bg-blue-50 text-blue-700 font-medium'
                            : 'text-gray-700 hover:bg-gray-50'
                            }`}
                        >
                          <span>{loc.name}</span>
                          {isSelected && <Check size={16} className="text-blue-600" />}
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
      <div className="bg-white rounded border border-[#edf2f7] shadow-sm overflow-hidden mb-12">
        <table className="w-full text-left border-collapse">
          <thead className="bg-[#f8fafc] border-b border-[#edf2f7]">
            <tr>
              <th className="px-5 py-3.5 text-[11px] font-bold text-gray-400 uppercase tracking-wider w-[22%]">MODULE</th>
              <th className="px-5 py-3.5 text-[11px] font-bold text-gray-400 uppercase tracking-wider w-[22%]">PREFIX</th>
              <th className="px-5 py-3.5 text-[11px] font-bold text-gray-400 uppercase tracking-wider w-[18%]">
                <div className="flex items-center gap-1.5">
                  STARTING NUMBER
                  <Info size={13} className="text-gray-400" />
                </div>
              </th>
              <th className="px-5 py-3.5 text-[11px] font-bold text-gray-400 uppercase tracking-wider w-[18%]">
                <div className="flex items-center gap-1.5">
                  RESTART NUMBERING
                  <Info size={13} className="text-gray-400" />
                </div>
              </th>
              <th className="px-5 py-3.5 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                <div className="flex items-center gap-1.5">
                  PREVIEW
                  <Info size={13} className="text-gray-400" />
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#f1f5f9]">
            {modules.map((item, index) => (
              <tr key={index} className="hover:bg-[#fcfdff] transition-colors group">
                <td className="px-5 py-4">
                  <span className="text-[14px] font-medium text-gray-700">{item.module}</span>
                </td>
                <td className="px-5 py-4">
                  <div className="relative flex items-center">
                    <input
                      type="text"
                      value={item.prefix}
                      onChange={(e) => handleModuleChange(index, 'prefix', e.target.value)}
                      className="w-full h-[32px] bg-white border border-[#e2e8f0] rounded px-2 pr-8 text-[13px] text-gray-600 focus:outline-none focus:border-blue-400 transition-all"
                    />
                    <button className="absolute right-2 text-blue-500 hover:text-blue-600 p-0.5 rounded">
                      <Plus size={14} strokeWidth={3} />
                    </button>
                  </div>
                </td>
                <td className="px-5 py-4">
                  <input
                    type="text"
                    value={item.startingNumber}
                    onChange={(e) => handleModuleChange(index, 'startingNumber', e.target.value)}
                    className="w-full h-[32px] bg-white border border-[#e2e8f0] rounded px-2 text-[13px] text-gray-600 focus:outline-none focus:border-blue-400 transition-all"
                  />
                </td>
                <td className="px-5 py-4">
                  <div className="relative">
                    <select
                      value={item.restartNumbering}
                      onChange={(e) => handleModuleChange(index, 'restartNumbering', e.target.value)}
                      className="w-full h-[32px] bg-white border border-[#e2e8f0] rounded px-2 pr-8 text-[13px] text-gray-600 focus:outline-none focus:border-blue-400 transition-all appearance-none"
                    >
                      <option value="None">None</option>
                      <option value="Yearly">Yearly</option>
                      <option value="Monthly">Monthly</option>
                    </select>
                    <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>
                </td>
                <td className="px-5 py-4">
                  <span className="text-[13px] text-gray-500">{item.preview}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer Actions */}
      <div className="flex items-center gap-3 pt-6 border-t border-gray-100">
        <button
          onClick={handleSave}
          disabled={isLoading}
          className="px-6 h-[34px] bg-[#3b82f6] text-white text-[13px] font-medium rounded hover:bg-blue-600 transition-colors shadow-sm disabled:bg-gray-300 min-w-[80px]"
        >
          {isLoading ? "Saving..." : "Save"}
        </button>
        <button
          onClick={onBack}
          className="px-5 h-[34px] bg-white border border-[#e2e8f0] text-[13px] font-medium text-gray-700 rounded hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
