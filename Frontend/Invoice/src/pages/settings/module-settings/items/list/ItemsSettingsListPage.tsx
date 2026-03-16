import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Info, ChevronDown, HelpCircle, Lock, Loader2 } from "lucide-react";
import { getToken, API_BASE_URL } from "../../../../../services/auth";
import toast from "react-hot-toast";

export default function ItemsPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("general");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // General tab states
  const [decimalPlaces, setDecimalPlaces] = useState("2");
  const [allowDuplicateNames, setAllowDuplicateNames] = useState(false);
  const [enableEnhancedSearch, setEnableEnhancedSearch] = useState(false);
  const [enablePriceLists, setEnablePriceLists] = useState(false);
  const [enableInventoryTracking, setEnableInventoryTracking] = useState(true);
  const [inventoryStartDate, setInventoryStartDate] = useState("");
  const [preventNegativeStock, setPreventNegativeStock] = useState(true);
  const [showOutOfStockWarning, setShowOutOfStockWarning] = useState(false);
  const [notifyReorderPoint, setNotifyReorderPoint] = useState(false);
  const [trackLandedCost, setTrackLandedCost] = useState(false);
  
  // Field Customization tab states
  const [customFields, setCustomFields] = useState([]);
  const customFieldsUsage = customFields.length;
  const maxCustomFields = 59;
  
  // Default fields for Items
  const defaultFields = [
    { name: "Selling Price", dataType: "Decimal", mandatory: "No", showInAllPDFs: "Yes", status: "Active", locked: true },
    { name: "Purchase Price", dataType: "Decimal", mandatory: "No", showInAllPDFs: "Yes", status: "Active", locked: true },
    { name: "SKU", dataType: "Text Box (Single Line)", mandatory: "No", showInAllPDFs: "No", status: "Active", locked: true },
    { name: "Image", dataType: "Text Box (Single Line)", mandatory: "No", showInAllPDFs: "No", status: "Active", locked: true },
    { name: "MRP", dataType: "Decimal", mandatory: "No", showInAllPDFs: "No", status: "Inactive", locked: true },
  ];
  
  // Custom Buttons tab states
  const [customButtons, setCustomButtons] = useState([]);
  const [showNewButtonDropdown, setShowNewButtonDropdown] = useState(false);
  const [locationFilter, setLocationFilter] = useState("All");
  const newButtonDropdownRef = useRef(null);
  
  // Related Lists tab states
  const [relatedLists, setRelatedLists] = useState([]);
  const [showNewRelatedListDropdown, setShowNewRelatedListDropdown] = useState(false);
  const newRelatedListDropdownRef = useRef(null);

  // Load settings on mount
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoading(true);
        const token = getToken();
        if (!token) {
          toast.error("Please login to access settings");
          return;
        }

        const response = await fetch(`${API_BASE_URL}/settings/items`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data) {
            const settings = data.data;
            setDecimalPlaces(settings.decimalPlaces || "2");
            setAllowDuplicateNames(settings.allowDuplicateNames !== undefined ? settings.allowDuplicateNames : false);
            setEnableEnhancedSearch(settings.enableEnhancedSearch || false);
            setEnablePriceLists(settings.enablePriceLists || false);
            setEnableInventoryTracking(settings.enableInventoryTracking !== undefined ? settings.enableInventoryTracking : true);
            setInventoryStartDate(settings.inventoryStartDate || "");
            setPreventNegativeStock(settings.preventNegativeStock !== undefined ? settings.preventNegativeStock : true);
            setShowOutOfStockWarning(settings.showOutOfStockWarning || false);
            setNotifyReorderPoint(settings.notifyReorderPoint || false);
            setTrackLandedCost(settings.trackLandedCost || false);
            setCustomFields(settings.customFields || []);
            setCustomButtons(settings.customButtons || []);
            setRelatedLists(settings.relatedLists || []);
          }
        } else {
          toast.error("Failed to load items settings");
        }
      } catch (error) {
        console.error("Error fetching items settings:", error);
        toast.error("Error loading items settings");
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  // Save settings
  const handleSave = async () => {
    try {
      setSaving(true);
      const token = getToken();
      if (!token) {
        toast.error("Please login to save settings");
        return;
      }

      const payload = {
        decimalPlaces,
        allowDuplicateNames,
        enableEnhancedSearch,
        enablePriceLists,
        enableInventoryTracking,
        inventoryStartDate,
        preventNegativeStock,
        showOutOfStockWarning,
        notifyReorderPoint,
        trackLandedCost,
        customFields,
        customButtons,
        relatedLists,
      };

      const response = await fetch(`${API_BASE_URL}/settings/items`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          toast.success("Items settings saved successfully!");
        } else {
          toast.error(data.message || "Failed to save settings");
        }
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || "Failed to save settings");
      }
    } catch (error) {
      console.error("Error saving items settings:", error);
      toast.error("Error saving items settings");
    } finally {
      setSaving(false);
    }
  };

  // Click outside handler for dropdowns
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (newButtonDropdownRef.current && !newButtonDropdownRef.current.contains(event.target)) {
        setShowNewButtonDropdown(false);
      }
      if (newRelatedListDropdownRef.current && !newRelatedListDropdownRef.current.contains(event.target)) {
        setShowNewRelatedListDropdown(false);
      }
    };
    if (showNewButtonDropdown || showNewRelatedListDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showNewButtonDropdown, showNewRelatedListDropdown]);

  if (loading) {
    return (
      <div className="p-6 max-w-4xl flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="animate-spin text-blue-600" size={32} />
          <p className="text-gray-600">Loading items settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl">
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Items</h1>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-gray-200 mb-6">
        <button
          onClick={() => setActiveTab("general")}
          className={`px-4 py-2 text-sm font-medium transition ${
            activeTab === "general"
              ? "text-blue-600 border-b-2 border-blue-600"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          General
        </button>
        <button
          onClick={() => setActiveTab("field-customization")}
          className={`px-4 py-2 text-sm font-medium transition ${
            activeTab === "field-customization"
              ? "text-blue-600 border-b-2 border-blue-600"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Field Customization
        </button>
        <button
          onClick={() => setActiveTab("record-locking")}
          className={`px-4 py-2 text-sm font-medium transition ${
            activeTab === "record-locking"
              ? "text-blue-600 border-b-2 border-blue-600"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Record Locking
        </button>
        <button
          onClick={() => setActiveTab("custom-buttons")}
          className={`px-4 py-2 text-sm font-medium transition ${
            activeTab === "custom-buttons"
              ? "text-blue-600 border-b-2 border-blue-600"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Custom Buttons
        </button>
        <button
          onClick={() => setActiveTab("related-lists")}
          className={`px-4 py-2 text-sm font-medium transition ${
            activeTab === "related-lists"
              ? "text-blue-600 border-b-2 border-blue-600"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Related Lists
        </button>
      </div>

      {/* General Tab Content */}
      {activeTab === "general" && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-8">
          {/* Set decimal rate for item quantity */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Set a decimal rate for your item quantity:
            </label>
            <div className="relative w-32">
              <select
                value={decimalPlaces}
                onChange={(e) => setDecimalPlaces(e.target.value)}
                className="w-full h-10 px-3 pr-8 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white"
              >
                <option value="0">0</option>
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="3">3</option>
                <option value="4">4</option>
              </select>
              <ChevronDown size={16} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Duplicate Item Name */}
          <div className="border-t border-gray-200 pt-6">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={allowDuplicateNames}
                onChange={(e) => setAllowDuplicateNames(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-1"
              />
              <div>
                <span className="text-sm font-medium text-gray-900">
                  Allow duplicate item names
                </span>
                <p className="text-sm text-gray-600 mt-1">
                  If you allow duplicate item names, all imports involving items will use SKU as the primary field for mapping.
                </p>
                {allowDuplicateNames && (
                  <div className="mt-3 bg-orange-50 border border-orange-200 rounded-lg p-3">
                    <p className="text-xs text-gray-700">
                      Before you enable this option, make the{" "}
                      <a href="#" className="text-blue-600 hover:underline">SKU field active and mandatory</a>.
                    </p>
                  </div>
                )}
              </div>
            </label>
          </div>

          {/* Enhanced Item Search */}
          <div className="border-t border-gray-200 pt-6">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={enableEnhancedSearch}
                onChange={(e) => setEnableEnhancedSearch(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-1"
              />
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900">
                    Enable Enhanced Item Search
                  </span>
                  <span className="text-xs bg-yellow-500 text-white px-2 py-0.5 rounded">NEW</span>
                </div>
                {enableEnhancedSearch && (
                  <div className="mt-3 bg-orange-50 border border-orange-200 rounded-lg p-3">
                    <p className="text-xs text-gray-700">
                      Enabling this option makes it easier to find any item using relevant keywords in any order.
                    </p>
                  </div>
                )}
              </div>
            </label>
          </div>

          {/* Price Lists */}
          <div className="border-t border-gray-200 pt-6">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={enablePriceLists}
                onChange={(e) => setEnablePriceLists(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-1"
              />
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900">
                    Enable Price Lists
                  </span>
                  <Info size={14} className="text-gray-400" />
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  Price Lists enables you to customise the rates of the items in your sales and purchase transactions.
                </p>
              </div>
            </label>
          </div>

          {/* Inventory */}
          <div className="border-t border-gray-200 pt-6">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={enableInventoryTracking}
                onChange={(e) => setEnableInventoryTracking(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-1"
              />
              <div className="flex-1">
                <span className="text-sm font-medium text-gray-900">
                  Enable Inventory Tracking
                </span>
                {enableInventoryTracking && (
                  <div className="mt-4 space-y-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <label className="block text-sm font-medium text-gray-700">
                          Inventory Start Date <span className="text-red-500">*</span>
                        </label>
                        <Info size={14} className="text-gray-400" />
                      </div>
                      <div className="flex items-center gap-3">
                        <input
                          type="date"
                          value={inventoryStartDate}
                          onChange={(e) => setInventoryStartDate(e.target.value)}
                          className="h-10 px-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        {inventoryStartDate && (
                          <button
                            type="button"
                            onClick={() => setInventoryStartDate("")}
                            className="text-sm text-blue-600 hover:text-blue-700 hover:underline"
                          >
                            Change
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Additional Inventory Options */}
                    <div className="space-y-3 pt-4 border-t border-gray-200">
                      <label className="flex items-start gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={preventNegativeStock}
                          onChange={(e) => setPreventNegativeStock(e.target.checked)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-1"
                        />
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-900">
                            Prevent stock from going below zero
                          </span>
                          <Info size={14} className="text-gray-400" />
                        </div>
                      </label>

                      <label className="flex items-start gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={showOutOfStockWarning}
                          onChange={(e) => setShowOutOfStockWarning(e.target.checked)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-1"
                        />
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-900">
                            Show an Out of Stock warning when an item's stock drops below zero
                          </span>
                          <Info size={14} className="text-gray-400" />
                        </div>
                      </label>

                      <label className="flex items-start gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={notifyReorderPoint}
                          onChange={(e) => setNotifyReorderPoint(e.target.checked)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-1"
                        />
                        <span className="text-sm text-gray-900">
                          Notify me if an item's quantity reaches the reorder point
                        </span>
                      </label>

                      <label className="flex items-start gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={trackLandedCost}
                          onChange={(e) => setTrackLandedCost(e.target.checked)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-1"
                        />
                        <span className="text-sm text-gray-900">
                          Track landed cost on items
                        </span>
                      </label>
                    </div>
                  </div>
                )}
              </div>
            </label>
          </div>

          {/* Save Button */}
          <div className="flex items-center justify-start pt-6 border-t border-gray-200">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {saving && <Loader2 className="animate-spin" size={16} />}
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      )}

      {/* Record Locking Tab Content */}
      {activeTab === "record-locking" && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-2">
                Record Locking
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Lock records to prevent unauthorized modifications. Locked records can only be edited by users with appropriate permissions.
              </p>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <p className="text-sm text-gray-600">
                Record locking functionality will be available in a future update.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Field Customization Tab Content */}
      {activeTab === "field-customization" && (
        <div>
          {/* Header with button */}
          <div className="flex items-center justify-between mb-6">
            <div className="text-sm text-gray-600">
              Custom Fields Usage: {customFieldsUsage}/{maxCustomFields}
            </div>
            <button
              onClick={() => navigate("/settings/items/new-field")}
              className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 flex items-center gap-2"
            >
              <span className="text-lg">+</span>
              New Custom Field
            </button>
          </div>

          {/* Table */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    FIELD NAME
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    DATA TYPE
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    MANDATORY
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    SHOW IN ALL PDFS
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    STATUS
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {defaultFields.map((field, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900 flex items-center gap-2">
                      {field.locked && <Lock size={14} className="text-gray-400" />}
                      {field.name}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{field.dataType}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{field.mandatory}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{field.showInAllPDFs}</td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`px-2 py-1 rounded text-xs ${
                        field.status === "Active" 
                          ? "bg-green-100 text-green-800" 
                          : "bg-gray-100 text-gray-800"
                      }`}>
                        {field.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {customFields.length > 0 && customFields.map((field, index) => (
                  <tr key={`custom-${index}`} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900">{field.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{field.dataType}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{field.mandatory ? "Yes" : "No"}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{field.showInAllPDFs ? "Yes" : "No"}</td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`px-2 py-1 rounded text-xs ${
                        field.status === "Active" 
                          ? "bg-green-100 text-green-800" 
                          : "bg-gray-100 text-gray-800"
                      }`}>
                        {field.status || "Active"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Custom Buttons Tab Content */}
      {activeTab === "custom-buttons" && (
        <div>
          {/* Header with actions */}
          <div className="flex items-center justify-between mb-6">
            <div></div>
            <div className="flex items-center gap-3">
              <button className="text-sm text-blue-600 hover:text-blue-700 hover:underline">
                What's this?
              </button>
              <button className="text-sm text-blue-600 hover:text-blue-700 hover:underline">
                View Logs
              </button>
              {/* Split Button: New Button */}
              <div className="relative" ref={newButtonDropdownRef}>
                <div className="flex">
                  <button
                    onClick={() => {
                      // Handle new button creation
                      setShowNewButtonDropdown(false);
                    }}
                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-l-lg hover:bg-red-700 flex items-center gap-2"
                  >
                    <span className="text-lg">+</span>
                    New
                  </button>
                  <button
                    onClick={() => setShowNewButtonDropdown(!showNewButtonDropdown)}
                    className="px-2 py-2 text-sm font-medium text-white bg-red-600 rounded-r-lg hover:bg-red-700 border-l border-red-500"
                  >
                    <ChevronDown size={16} />
                  </button>
                </div>
                {showNewButtonDropdown && (
                  <div className="absolute top-full right-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 z-50 min-w-[200px]">
                    <button
                      onClick={() => {
                        // Handle new button
                        setShowNewButtonDropdown(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600"
                    >
                      New Button
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-4 mb-6">
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-700">Location :</label>
              <div className="relative">
                <select
                  value={locationFilter}
                  onChange={(e) => setLocationFilter(e.target.value)}
                  className="h-9 px-3 pr-8 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white"
                >
                  <option value="All">All</option>
                  <option value="Details Page Menu">Details Page Menu</option>
                  <option value="List Page">List Page</option>
                </select>
                <ChevronDown size={16} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    BUTTON NAME
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    ACCESS PERMISSION
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    LOCATION
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {customButtons.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-12 text-center">
                      <p className="text-gray-500 text-sm">
                        Create buttons which perform actions set by you. What are you waiting for!
                      </p>
                    </td>
                  </tr>
                ) : (
                  customButtons.map((button, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-900">{button.name}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{button.accessPermission}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{button.location}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Related Lists Tab Content */}
      {activeTab === "related-lists" && (
        <div>
          {/* Header with dropdown button */}
          <div className="flex items-center justify-end mb-6">
            <button
              onClick={() => {
                // Handle new related list creation
              }}
              className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 flex items-center gap-2"
            >
              <span className="text-lg">+</span>
              New Related List
            </button>
          </div>

          {/* Empty State with Illustration */}
          <div className="bg-white rounded-lg border border-gray-200 p-12">
            <div className="flex flex-col items-center justify-center py-12">
              {/* Illustration */}
              <div className="relative mb-8 flex items-center justify-center" style={{ width: "200px", height: "200px" }}>
                {/* Window/Frame element (background) */}
                <div 
                  className="absolute rounded-lg border-2 border-gray-300 bg-gray-50"
                  style={{
                    width: "120px",
                    height: "100px",
                    transform: "rotate(-2deg)",
                    left: "60px",
                    top: "30px",
                    boxShadow: "0 4px 8px rgba(0,0,0,0.1)"
                  }}
                >
                  {/* Window grid lines */}
                  <div className="absolute inset-0 flex flex-col justify-center items-center p-2">
                    <div className="w-full h-px bg-gray-300 mb-2"></div>
                    <div className="w-full h-px bg-gray-300"></div>
                  </div>
                  <div className="absolute inset-0 flex justify-center items-center">
                    <div className="h-full w-px bg-gray-300"></div>
                  </div>
                </div>
                
                {/* Person figure */}
                <div className="relative z-10" style={{ left: "-20px", top: "10px" }}>
                  {/* Head */}
                  <div 
                    className="absolute rounded-full"
                    style={{
                      width: "50px",
                      height: "50px",
                      backgroundColor: "#fbbf24", // Pink-ish for hair
                      top: "0px",
                      left: "15px",
                      boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
                    }}
                  >
                    {/* Face */}
                    <div 
                      className="absolute rounded-full bg-white"
                      style={{
                        width: "35px",
                        height: "35px",
                        top: "8px",
                        left: "7.5px"
                      }}
                    >
                      {/* Eyes */}
                      <div className="absolute top-2 left-2 w-1.5 h-1.5 bg-gray-700 rounded-full"></div>
                      <div className="absolute top-2 right-2 w-1.5 h-1.5 bg-gray-700 rounded-full"></div>
                      {/* Mouth */}
                      <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 w-2 h-1 border-b-2 border-gray-700 rounded-full"></div>
                    </div>
                  </div>
                  
                  {/* Body (red shirt) */}
                  <div 
                    className="absolute rounded-lg"
                    style={{
                      width: "60px",
                      height: "70px",
                      backgroundColor: "#ef4444", // Red
                      top: "45px",
                      left: "10px",
                      boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
                    }}
                  ></div>
                  
                  {/* Arms holding circle */}
                  <div 
                    className="absolute rounded-full border-4 border-blue-500 bg-blue-100"
                    style={{
                      width: "50px",
                      height: "50px",
                      top: "60px",
                      left: "50px",
                      boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
                    }}
                  >
                    {/* Plus sign */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-6 h-0.5 bg-white"></div>
                      <div className="absolute w-0.5 h-6 bg-white"></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Description Text */}
              <p className="text-sm text-gray-600 text-center mb-8 max-w-md">
                Create custom related lists to access relevant information available from inside or outside the application.
              </p>

              {/* New Related List Button */}
              <button
                onClick={() => {
                  // Handle new related list creation
                }}
                className="px-6 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700"
              >
                New Related List
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}



