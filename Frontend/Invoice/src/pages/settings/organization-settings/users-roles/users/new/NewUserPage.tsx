import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { X, User, Check, Minus, Search, ArrowLeft, Info } from "lucide-react";
import { usersAPI, locationsAPI } from "../../../../../../services/api";

export default function NewUserPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const inviteData = location.state?.inviteData || {};

  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  // Location access state
  const [accessibleLocationIds, setAccessibleLocationIds] = useState([]);
  const [locationSearch, setLocationSearch] = useState("");
  const [defaultBusinessLocation, setDefaultBusinessLocation] = useState("");
  const [defaultWarehouseLocation, setDefaultWarehouseLocation] = useState("");

  // Fetch locations
  useEffect(() => {
    const fetchLocations = async () => {
      try {
        setLoading(true);
        const response = await locationsAPI.getAll();
        if (response && response.success) {
          setLocations(response.data || []);
        }
      } catch (err) {
        console.error("Error fetching locations:", err);
        setError("Failed to load locations");
      } finally {
        setLoading(false);
      }
    };

    fetchLocations();
  }, []);

  // Filter locations based on search
  const availableLocations = locations.filter(
    (loc) => !accessibleLocationIds.includes(loc._id || loc.id)
  );
  const filteredAvailableLocations = availableLocations.filter((loc) =>
    loc.name.toLowerCase().includes(locationSearch.toLowerCase())
  );

  const accessibleLocations = locations.filter((loc) =>
    accessibleLocationIds.includes(loc._id || loc.id)
  );

  // Handle location selection
  const handleSelectLocation = (locationId) => {
    if (accessibleLocationIds.includes(locationId)) {
      // Remove if already selected
      setAccessibleLocationIds(accessibleLocationIds.filter(id => id !== locationId));
      if (defaultBusinessLocation === locationId) {
        setDefaultBusinessLocation("");
      }
      if (defaultWarehouseLocation === locationId) {
        setDefaultWarehouseLocation("");
      }
    } else {
      // Add if not selected
      setAccessibleLocationIds([...accessibleLocationIds, locationId]);
    }
  };

  // Handle location removal
  const handleRemoveLocation = (locationId) => {
    setAccessibleLocationIds(accessibleLocationIds.filter((id) => id !== locationId));
    if (defaultBusinessLocation === locationId) {
      setDefaultBusinessLocation("");
    }
    if (defaultWarehouseLocation === locationId) {
      setDefaultWarehouseLocation("");
    }
  };

  // Handle select all
  const handleSelectAll = () => {
    setAccessibleLocationIds(availableLocations.map((loc) => loc._id || loc.id));
  };

  // Handle remove all
  const handleRemoveAll = () => {
    setAccessibleLocationIds([]);
    setDefaultBusinessLocation("");
    setDefaultWarehouseLocation("");
  };

  // Handle send invite
  const handleSendInvite = async () => {
    try {
      if (!defaultBusinessLocation) {
        setError("User's Default Business Location is required");
        return;
      }

      setError(null);
      setSaving(true);

      // Generate password if not provided
      const password =
        inviteData.password ||
        Math.random().toString(36).slice(-12) + Math.random().toString(36).slice(-12) + "A1!";

      // Create user with skipEmail flag
      const createResponse = await usersAPI.create({
        name: inviteData.name,
        email: inviteData.email,
        role: inviteData.role,
        password: password,
        skipEmail: true,
        accessibleLocations: accessibleLocationIds,
        defaultBusinessLocation: defaultBusinessLocation || null,
        defaultWarehouseLocation: defaultWarehouseLocation || null,
      });

      if (createResponse.success) {
        const userId = createResponse.data.id;

        // Send invitation email with location access update
        const inviteResponse = await usersAPI.sendInvitation(userId, {
          accessibleLocations: accessibleLocationIds,
          defaultBusinessLocation: defaultBusinessLocation || null,
          defaultWarehouseLocation: defaultWarehouseLocation || null,
          tempPassword: password,
        });

        if (inviteResponse.success) {
          navigate("/settings/users");
        } else {
          setError(inviteResponse.message || "Failed to send invitation email");
        }
      } else {
        setError(createResponse.message || "Failed to create user");
      }
    } catch (err) {
      console.error("Error sending invite:", err);
      setError(err.message || "Failed to send invitation");
    } finally {
      setSaving(false);
    }
  };

  // Handle cancel
  const handleCancel = () => {
    navigate("/settings/users");
  };

  if (!inviteData.name || !inviteData.email) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          Missing user information. Please go back and try again.
        </div>
        <button
          onClick={handleCancel}
          className="mt-4 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Configure Location Access</h1>
        <button
          onClick={handleCancel}
          className="p-2 hover:bg-gray-100 rounded-lg transition"
        >
          <X size={24} className="text-gray-500" />
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* User Details */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">User Details</h2>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
            <User size={24} className="text-gray-500" />
          </div>
          <div>
            <div className="text-base font-medium text-gray-900">{inviteData.name}</div>
            <div className="text-sm text-gray-600">{inviteData.email}</div>
          </div>
        </div>
      </div>

      {/* Locations Section */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <h2 className="text-sm font-semibold text-gray-900 mb-2">Locations</h2>
        <p className="text-sm text-gray-600 mb-4">
          Select the locations for which this user can create and access transactions.
        </p>

        <div className="grid grid-cols-2 gap-4">
          {/* Left Column - Available Locations */}
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="relative mb-4">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={locationSearch}
                onChange={(e) => setLocationSearch(e.target.value)}
                placeholder="Type to search Locations"
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
            <div className="mb-4 border-b border-gray-200 pb-2">
              <div className="flex items-center gap-2 cursor-pointer" onClick={handleSelectAll}>
                <Check size={16} className="text-green-600" />
                <span className="text-sm text-gray-700">Select All</span>
              </div>
            </div>
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {loading ? (
                <div className="text-sm text-gray-500 text-center py-4">Loading locations...</div>
              ) : filteredAvailableLocations.length === 0 ? (
                <div className="text-sm text-gray-500 text-center py-4">
                  {locationSearch ? "No locations found" : "No available locations"}
                </div>
              ) : (
                filteredAvailableLocations.map((location) => {
                  const locId = location._id || location.id;
                  const isSelected = accessibleLocationIds.includes(locId);
                  return (
                    <div
                      key={locId}
                      className={`flex items-center gap-2 p-2 rounded cursor-pointer ${
                        isSelected ? "bg-gray-50" : "hover:bg-gray-50"
                      }`}
                      onClick={() => handleSelectLocation(locId)}
                    >
                      {isSelected && <Check size={16} className="text-green-600" />}
                      {!isSelected && <div className="w-4 h-4" />}
                      <span className="text-sm text-gray-700">{location.name}</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column - Accessible Locations */}
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-semibold text-gray-600 uppercase">ACCESSIBLE LOCATIONS</h3>
              <button
                onClick={handleRemoveAll}
                disabled={accessibleLocationIds.length === 0}
                className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Minus size={16} />
                <span>Remove All</span>
              </button>
            </div>
            <div className="max-h-64 overflow-y-auto space-y-2">
              {accessibleLocations.length === 0 ? (
                <div className="text-sm text-gray-500 text-center py-4">No accessible locations</div>
              ) : (
                accessibleLocations.map((location) => (
                  <div
                    key={location._id || location.id}
                    className="flex items-center justify-between p-2 hover:bg-gray-50 rounded group"
                  >
                    <span className="text-sm text-gray-700">{location.name}</span>
                    <button
                      onClick={() => handleRemoveLocation(location._id || location.id)}
                      className="text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Minus size={16} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Default Location Settings */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <div className="grid grid-cols-2 gap-4">
          {/* Default Business Location */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-red-600 mb-2">
              User's Default Business Location <span className="text-red-500">*</span>
              <Info size={14} className="text-gray-400" />
            </label>
            <select
              value={defaultBusinessLocation}
              onChange={(e) => {
                const selectedLocation = e.target.value;
                setDefaultBusinessLocation(selectedLocation);
                // Automatically set warehouse location to the same as business location
                if (selectedLocation && accessibleLocationIds.includes(selectedLocation)) {
                  setDefaultWarehouseLocation(selectedLocation);
                }
              }}
              className="w-full h-10 px-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="">Select Location</option>
              {accessibleLocations
                .filter((loc) => loc.type === "Business" || !loc.type)
                .map((location) => (
                  <option key={location._id || location.id} value={location._id || location.id}>
                    {location.name}
                  </option>
                ))}
            </select>
          </div>

          {/* Default Warehouse Location */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              User's Default Warehouse Location
              <Info size={14} className="text-gray-400" />
            </label>
            <select
              value={defaultWarehouseLocation}
              onChange={(e) => setDefaultWarehouseLocation(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="">Select Location</option>
              {accessibleLocations
                .filter((loc) => loc.type === "Warehouse")
                .map((location) => (
                  <option key={location._id || location.id} value={location._id || location.id}>
                    {location.name}
                  </option>
                ))}
            </select>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleCancel}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
        >
          <ArrowLeft size={16} />
          <span>Back</span>
        </button>
        <button
          onClick={handleSendInvite}
          disabled={saving || !defaultBusinessLocation}
          className="flex-1 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? "Sending..." : "Send Invite"}
        </button>
        <button
          onClick={handleCancel}
          className="px-4 py-2 border border-gray-300 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}


