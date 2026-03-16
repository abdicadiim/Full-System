import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Users, Shield, ChevronDown } from "lucide-react";
import { getToken, API_BASE_URL } from "../../services/auth";

export default function NewWebTabModal({ onClose, onSave }) {
  const [tabName, setTabName] = useState("");
  const [url, setUrl] = useState("");
  const [isZohoApp, setIsZohoApp] = useState(false);
  const [visibility, setVisibility] = useState("everyone");
  const [users, setUsers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [selectedUsersAndRoles, setSelectedUsersAndRoles] = useState<UserOrRole[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Type definitions
  type UserOrRole = {
    id: string;
    name: string;
    type: 'user' | 'role';
  };

  // URL validation function
  const isValidUrl = (url: string): boolean => {
    if (!url || url.trim() === '') return false;

    // Add protocol if missing for validation
    let testUrl = url.trim();
    if (!testUrl.startsWith('http://') && !testUrl.startsWith('https://')) {
      testUrl = 'https://' + testUrl;
    }

    try {
      const urlPattern = /^(https?:\/\/)?((([a-zA-Z0-9\-]+\.)+[a-zA-Z]{2,})|localhost|(\d{1,3}\.){3}\d{1,3})(:\d+)?(\/[^\s]*)?$/;
      return urlPattern.test(testUrl);
    } catch (error) {
      return false;
    }
  };

  // Format URL to ensure it has a protocol
  const formatUrl = (url: string): string => {
    const trimmedUrl = url.trim();
    if (!trimmedUrl.startsWith('http://') && !trimmedUrl.startsWith('https://')) {
      return 'https://' + trimmedUrl;
    }
    return trimmedUrl;
  };

  // Fetch users and roles when visibility changes to 'selected'
  useEffect(() => {
    if (visibility === "selected") {
      fetchUsersAndRoles();
    }
  }, [visibility]);

  const fetchUsersAndRoles = async () => {
    setLoading(true);
    try {
      const token = getToken();
      if (!token) {
        console.error('No authentication token found');
        return;
      }

      // Fetch users
      const usersResponse = await fetch(`${API_BASE_URL}/users`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      // Fetch roles
      const rolesResponse = await fetch(`${API_BASE_URL}/roles`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (usersResponse.ok && rolesResponse.ok) {
        const usersData = await usersResponse.json();
        const rolesData = await rolesResponse.json();

        setUsers(usersData.data || []);
        setRoles(rolesData.data || []);
      } else {
        console.error('Failed to fetch users or roles');
      }
    } catch (error) {
      console.error('Error fetching users and roles:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    // Clear previous errors
    setError("");

    // Validate tab name
    if (!tabName.trim()) {
      setError("Please enter a tab name");
      return;
    }

    // Validate URL
    if (!url.trim()) {
      setError("Please enter a URL");
      return;
    }

    // Validate URL format
    if (!isValidUrl(url)) {
      setError("Please enter a valid URL (e.g., https://example.com or http://localhost:3000)");
      return;
    }

    // Validate selected users and roles if visibility is 'selected'
    if (visibility === "selected" && selectedUsersAndRoles.length === 0) {
      setError("Please select at least one user or role");
      return;
    }

    // Prepare data for saving
    const tabData = {
      name: tabName.trim(),
      url: formatUrl(url),
      isZohoApp,
      visibility,
      selectedUsersAndRoles: visibility === "selected" ? selectedUsersAndRoles : [],
    };

    // Call onSave function
    try {
      await onSave(tabData);
      // Reset form on successful save
      setTabName("");
      setUrl("");
      setIsZohoApp(false);
      setVisibility("everyone");
      setSelectedUsersAndRoles([]);
      setError("");
    } catch (error: any) {
      setError(error.message || "Failed to save web tab");
    }
  };

  const toggleUserOrRoleSelection = (item: any, type: 'user' | 'role') => {
    const itemId = `${type}_${item.id}`;
    setSelectedUsersAndRoles(prev => {
      const exists = prev.find(selected => selected.id === itemId);
      if (exists) {
        return prev.filter(selected => selected.id !== itemId);
      } else {
        return [...prev, { id: itemId, name: item.name || item.username, type }];
      }
    });
  };

  const removeSelectedItem = (itemId: string) => {
    setSelectedUsersAndRoles(prev => prev.filter(item => item.id !== itemId));
  };

  const clearError = () => {
    setError("");
  };

  // Real-time URL validation
  const handleUrlChange = (value: string) => {
    setUrl(value);
    if (error && error.includes("URL")) {
      setError("");
    }
  };

  const handleTabNameChange = (value: string) => {
    setTabName(value);
    if (error && error.includes("tab name")) {
      setError("");
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000]"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">New Web Tab</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded transition"
          >
            <X size={20} className="text-red-500" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                  <X size={12} className="text-white" />
                </div>
                <span className="text-sm text-red-700">{error}</span>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tab Name <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              value={tabName}
              onChange={(e) => handleTabNameChange(e.target.value)}
              onFocus={clearError}
              className="w-full h-10 px-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter tab name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              URL <span className="text-red-600">*</span>
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => handleUrlChange(e.target.value)}
              onFocus={clearError}
              className="w-full h-10 px-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter URL (e.g., https://example.com)"
            />
          </div>

          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isZohoApp}
                onChange={(e) => setIsZohoApp(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="text-sm text-gray-700">This URL belongs to a Zoho app or website.</span>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">Visibility</label>
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="visibility"
                  value="only-me"
                  checked={visibility === "only-me"}
                  onChange={(e) => setVisibility(e.target.value)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Only Me</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="visibility"
                  value="selected"
                  checked={visibility === "selected"}
                  onChange={(e) => setVisibility(e.target.value)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Only Selected Users & Roles</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="visibility"
                  value="everyone"
                  checked={visibility === "everyone"}
                  onChange={(e) => setVisibility(e.target.value)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Everyone</span>
              </label>
            </div>
          </div>

          {/* Users and Roles Dropdown - Only show when "Only Selected Users & Roles" is selected */}
          {visibility === "selected" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Users & Roles <span className="text-red-600">*</span>
              </label>

              {/* Selected Items Display */}
              {selectedUsersAndRoles.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {selectedUsersAndRoles.map((item) => (
                    <div
                      key={item.id}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm"
                    >
                      {item.type === 'user' ? <Users size={14} /> : <Shield size={14} />}
                      {item.name}
                      <button
                        onClick={() => removeSelectedItem(item.id)}
                        className="ml-1 text-blue-500 hover:text-blue-700"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="w-full h-10 px-3 rounded-lg border border-gray-300 bg-white text-left flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <span className="text-sm text-gray-500">
                    {loading ? "Loading..." : "Select users and roles..."}
                  </span>
                  <ChevronDown size={16} className={`transform transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown Content */}
                {isDropdownOpen && !loading && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {/* Users Section */}
                    {users.length > 0 && (
                      <div>
                        <div className="px-3 py-2 bg-gray-50 border-b border-gray-200">
                          <div className="flex items-center gap-2 text-xs font-semibold text-gray-600">
                            <Users size={14} />
                            USERS
                          </div>
                        </div>
                        {users.map((user, idx) => {
                          const isSelected = selectedUsersAndRoles.find(item => item.id === `user_${user._id || user.id}`);
                          return (
                            <label
                              key={user._id || user.id || idx}
                              className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={!!isSelected}
                                onChange={() => toggleUserOrRoleSelection(user, 'user')}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                              />
                              <div className="flex-1">
                                <div className="text-sm font-medium text-gray-900">
                                  {user.name || user.username || 'Unknown User'}
                                </div>
                                {user.email && (
                                  <div className="text-xs text-gray-500">{user.email}</div>
                                )}
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    )}

                    {/* Roles Section */}
                    {roles.length > 0 && (
                      <div>
                        <div className="px-3 py-2 bg-gray-50 border-b border-gray-200">
                          <div className="flex items-center gap-2 text-xs font-semibold text-gray-600">
                            <Shield size={14} />
                            ROLES
                          </div>
                        </div>
                        {roles.map((role, idx) => {
                          const isSelected = selectedUsersAndRoles.find(item => item.id === `role_${role._id || role.id}`);
                          return (
                            <label
                              key={role._id || role.id || idx}
                              className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={!!isSelected}
                                onChange={() => toggleUserOrRoleSelection(role, 'role')}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                              />
                              <div className="flex-1">
                                <div className="text-sm font-medium text-gray-900">
                                  {role.name || 'Unknown Role'}
                                </div>
                                {role.description && (
                                  <div className="text-xs text-gray-500">{role.description}</div>
                                )}
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    )}

                    {users.length === 0 && roles.length === 0 && (
                      <div className="px-3 py-4 text-center text-sm text-gray-500">
                        No users or roles found
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-start gap-3 p-6 border-t border-gray-200">
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
          >
            Save
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

