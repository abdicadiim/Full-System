import React, { useState, useEffect, useRef } from "react";
import { Check, AlertCircle, Building2, User, Star, Plus, ChevronDown, Edit } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  ensureDemoLocations,
  readLocations,
  readLocationsEnabled,
  writeLocationsEnabled,
} from "./storage";

export default function LocationsPage() {
  const navigate = useNavigate();
  const [isEnabled, setIsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [locations, setLocations] = useState([]);
  const [isLoadingLocations, setIsLoadingLocations] = useState(false);
  const [hoveredRowId, setHoveredRowId] = useState(null);
  const [openDropdownId, setOpenDropdownId] = useState(null);
  const tableBodyRef = useRef(null);

  useEffect(() => {
    const enabled = readLocationsEnabled();
    setIsEnabled(enabled);
    if (enabled) {
      setLocations(readLocations());
    }
    setIsLoading(false);
  }, []);

  const loadLocations = () => {
    setIsLoadingLocations(true);
    const nextRows = readLocations();
    setLocations(nextRows);
    setIsLoadingLocations(false);
  };

  const handleEnableLocations = () => {
    ensureDemoLocations();
    setIsEnabled(true);
    writeLocationsEnabled(true);
    loadLocations();
  };

  // Handle location click (for editing)
  const handleLocationClick = (locationId) => {
    // Navigate to edit location page
    navigate(`/settings/locations/edit/${locationId}`);
  };

  // Handle edit button click
  const handleEdit = (locationId, e) => {
    e.stopPropagation();
    // Navigate to edit location page
    navigate(`/settings/locations/edit/${locationId}`);
  };

  // Handle dropdown menu click
  const handleDropdownClick = (locationId, e) => {
    e.stopPropagation();
    // Toggle dropdown - if already open, close it; otherwise open it
    setOpenDropdownId(openDropdownId === locationId ? null : locationId);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!openDropdownId) return;

    const handleClickOutside = (event) => {
      // Get the row that has the open dropdown
      const openRow = document.querySelector(`tr[data-location-id="${openDropdownId}"]`);
      const target = event.target;
      
      // Check if click is inside the row with the open dropdown
      const isClickInsideOpenRow = openRow && openRow.contains(target);
      
      // Also check if it's a click on the dropdown or edit button (to allow toggling)
      const isClickOnActionButton = target.closest('button[aria-label="More options"]') || 
                                     target.closest('button[aria-label="Edit"]');
      
      // Close if clicking outside the open row (unless it's on the action buttons themselves)
      if (!isClickInsideOpenRow && !isClickOnActionButton) {
        setOpenDropdownId(null);
      }
    };

    // Use a small delay to avoid closing immediately when clicking the icon
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openDropdownId]);

  // Format address for display - show only country if available, otherwise show full address
  const formatAddress = (address) => {
    if (!address) return "—";
    // If country is set, show only country (matching the design)
    if (address.country && address.country.trim()) {
      return address.country;
    }
    // Otherwise show full address
    const parts = [
      address.street1,
      address.street2,
      address.city,
      address.state,
      address.zipCode,
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(", ") : "—";
  };

  if (isLoading) {
    return (
      <div className="w-full h-full p-6">
        <div className="text-center py-8">
          <div className="text-gray-500">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full">
      {!isEnabled ? (
        <div className="p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-semibold text-gray-900 mb-2">Locations</h1>
            <p className="text-gray-600">
              Create locations for each branch and warehouse in your organisation and manage them all in one place.
            </p>
          </div>

          {/* Enable Locations Button */}
          <div className="mb-8">
            <button
              onClick={handleEnableLocations}
              className="px-6 py-3 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition"
            >
              Enable Locations
            </button>
          </div>

          {/* Key Benefits */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">KEY BENEFITS</h2>
            <div className="space-y-3">
              {[
                "Monitor Item Stocks",
                "Separate Billing and Storage",
                "Unique Transaction Numbers",
                "Location-specific Accounting"
              ].map((benefit, index) => (
                <div key={index} className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                    <Check size={14} className="text-white" />
                  </div>
                  <span className="text-sm text-gray-700">{benefit}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Points to Note */}
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center flex-shrink-0">
                <AlertCircle size={16} className="text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-gray-900 mb-2">Points to Note</h3>
                <ul className="space-y-1 text-sm text-gray-700">
                  <li>• Once you enable Locations, you won't be able to disable it.</li>
                  <li>• You can delete a location if it hasn't been used in transactions or mark it as inactive.</li>
                  <li>• You can manage multiple warehouses under a single location.</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Diagram */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex flex-col items-center">
              {/* Your Organisation */}
              <div className="bg-blue-50 border-2 border-blue-300 rounded-lg px-6 py-4 mb-4 flex items-center gap-3">
                <Building2 size={24} className="text-blue-600" />
                <span className="text-base font-semibold text-gray-900">YOUR ORGANISATION</span>
              </div>

              {/* Level 1 - Location A and B */}
              <div className="flex items-start gap-8 mb-4">
                {/* Location A */}
                <div className="flex flex-col items-center">
                  <div className="w-0.5 h-8 bg-gray-300 mb-2"></div>
                  <div className="bg-white border-2 border-dashed border-gray-300 rounded-lg px-4 py-3 flex items-center gap-2">
                    <User size={20} className="text-gray-600" />
                    <span className="text-sm font-medium text-gray-700">LOCATION A</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">GENERAL LOCATION</div>
                  
                  {/* Level 2 - Location C and D */}
                  <div className="mt-4 flex items-start gap-4">
                    <div className="flex flex-col items-center">
                      <div className="w-0.5 h-8 bg-gray-300 mb-2"></div>
                      <div className="bg-white border-2 border-dashed border-gray-300 rounded-lg px-4 py-3 flex items-center gap-2">
                        <User size={20} className="text-gray-600" />
                        <span className="text-sm font-medium text-gray-700">LOCATION C</span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">GENERAL LOCATION</div>
                    </div>
                    <div className="flex flex-col items-center">
                      <div className="w-0.5 h-8 bg-gray-300 mb-2"></div>
                      <div className="bg-white border-2 border-dashed border-gray-300 rounded-lg px-4 py-3 flex items-center gap-2">
                        <User size={20} className="text-gray-600" />
                        <span className="text-sm font-medium text-gray-700">LOCATION D</span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">GENERAL LOCATION</div>
                    </div>
                  </div>
                </div>

                {/* Location B */}
                <div className="flex flex-col items-center">
                  <div className="w-0.5 h-8 bg-gray-300 mb-2"></div>
                  <div className="bg-white border-2 border-dashed border-gray-300 rounded-lg px-4 py-3 flex items-center gap-2">
                    <User size={20} className="text-gray-600" />
                    <span className="text-sm font-medium text-gray-700">LOCATION B</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">GENERAL LOCATION</div>
                  
                  {/* Level 2 - Location E */}
                  <div className="mt-4 flex flex-col items-center">
                    <div className="w-0.5 h-8 bg-gray-300 mb-2"></div>
                    <div className="bg-white border-2 border-dashed border-gray-300 rounded-lg px-4 py-3 flex items-center gap-2">
                      <Building2 size={20} className="text-gray-600" />
                      <span className="text-sm font-medium text-gray-700">LOCATION E</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">ITEM LEVEL LOCATION</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="w-full h-full flex flex-col">
          {/* Header with Title and Action Buttons */}
          <div className="px-6 pt-6 pb-4 bg-white border-b border-gray-200 flex-shrink-0">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-semibold text-gray-900">Locations</h1>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => navigate('/settings/customization/transaction-number-series')}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  Transaction Series Preferences
                </button>
                <button
                  onClick={() => navigate('/settings/locations/new')}
                  className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition"
                >
                  Add Location
                </button>
              </div>
            </div>
          </div>

          {/* Locations Table - Full width scrollable content */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-6">
              <div className="bg-white rounded-lg border border-gray-200 overflow-visible">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        LOCATION
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        DEFAULT TRANSACTION NUMBER SERIES
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        TYPE
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        ADDRESS DETAILS
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-24">
                        {/* Empty header for actions column */}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200" ref={tableBodyRef}>
                    {isLoadingLocations ? (
                      <tr>
                        <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                          Loading locations...
                        </td>
                      </tr>
                    ) : locations.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                          No locations found. Click "Add Location" to create your first location.
                        </td>
                      </tr>
                    ) : (
                      locations.map((location) => (
                        <tr
                          key={location._id}
                          data-location-id={location._id}
                          className="group relative"
                          onMouseEnter={() => setHoveredRowId(location._id)}
                          onMouseLeave={() => setHoveredRowId(null)}
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleLocationClick(location._id)}
                                className="text-sm font-medium text-blue-600 hover:text-blue-700 cursor-pointer"
                              >
                                {location.name}
                              </button>
                              {location.isDefault && (
                                <Star size={16} className="text-yellow-500 fill-yellow-500 flex-shrink-0" />
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                            {location.defaultTransactionSeries || "Default Transaction Series"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                            {location.type || "Business"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                            {formatAddress(location.address)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap relative">
                            {(hoveredRowId === location._id || openDropdownId === location._id) && (
                              <div className="flex flex-col items-end gap-1.5">
                                {/* Red Dropdown Icon - always visible on hover */}
                                <button
                                  onClick={(e) => handleDropdownClick(location._id, e)}
                                  className="w-6 h-6 rounded-full bg-red-600 flex items-center justify-center hover:bg-red-700 transition text-white shadow-sm"
                                  aria-label="More options"
                                >
                                  <ChevronDown size={14} className="text-white" />
                                </button>
                                {/* Edit Button - only visible when dropdown is clicked */}
                                {openDropdownId === location._id && (
                                  <div className="absolute right-0 top-8 z-30 w-44 bg-white border border-gray-200 rounded-lg shadow-lg py-1">
                                    <button
                                      onClick={(e) => handleEdit(location._id, e)}
                                      aria-label="Edit"
                                      className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                    >
                                      <Edit size={14} />
                                      <span>Edit</span>
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
