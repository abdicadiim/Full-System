import React, { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { Play, MoreVertical, ChevronDown, X, Eye, EyeOff, Plus, Check, Search, Minus, ArrowLeft, Info, User as UserIcon, Pencil, Star } from "lucide-react";
import { usersAPI, rolesAPI, locationsAPI } from "../../../../../services/api";
import { getCurrentUser } from "../../../../../services/auth";

const STANDARD_ROLE_OPTIONS = [
  { value: "admin", label: "Admin" },
  { value: "staff", label: "Staff" },
  { value: "timesheet_staff", label: "Timesheet Staff" },
  { value: "staff_assigned", label: "Staff (Assigned Customers Only)" },
];
const formatRoleLabel = (roleValue: string) => {
  const normalized = String(roleValue || "").trim().toLowerCase();
  const predefined = STANDARD_ROLE_OPTIONS.find((option) => option.value === normalized);
  if (predefined) return predefined.label;
  if (!normalized) return "";
  return String(roleValue || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (ch) => ch.toUpperCase());
};
const getRoleHelpText = (roleValue: string) => {
  const normalized = String(roleValue || "").trim().toLowerCase();
  if (normalized === "admin") return "Complete access to all modules, transactions, and settings.";
  if (normalized === "staff") return "Access to all modules except reports, settings and accountant.";
  if (normalized === "timesheet_staff") return "Can access and log time entries within the Timesheet module.";
  if (normalized === "staff_assigned") return "Can access transactions and data related to assigned customers only.";
  return "Access is based on selected role permissions.";
};
export default function UsersPage() {
  const currentUser = getCurrentUser();
  const canManageUsers = ["owner", "admin"].includes(String(currentUser?.role || "").toLowerCase());
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState("All");
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [locationAccessModalOpen, setLocationAccessModalOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [detailMenuOpen, setDetailMenuOpen] = useState(false);
  const [inviteDropdownOpen, setInviteDropdownOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [locations, setLocations] = useState([]);
  const [accessibleLocations, setAccessibleLocations] = useState([]);
  const [defaultBusinessLocation, setDefaultBusinessLocation] = useState("");
  const [defaultWarehouseLocation, setDefaultWarehouseLocation] = useState("");
  const [locationSearch, setLocationSearch] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [activeTab, setActiveTab] = useState("more-details");
  const [userDetails, setUserDetails] = useState(null);
  const [userLocations, setUserLocations] = useState([]);
  const [exportData, setExportData] = useState({
    module: "Users",
    template: "",
    decimalFormat: "1234567.89",
    fileFormat: "CSV",
    includePII: false,
    password: ""
  });
  const [inviteData, setInviteData] = useState({
    name: "",
    email: "",
    role: "",
    password: "",
  });
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editLocationAccessModalOpen, setEditLocationAccessModalOpen] = useState(false);
  const [editData, setEditData] = useState({
    name: "",
    email: "",
    role: "",
  });

  const statusRef = useRef(null);
  const statusDropdownRef = useRef(null);
  const menuRef = useRef(null);
  const menuDropdownRef = useRef(null);
  const menuButtonRef = useRef(null);
  const detailMenuRef = useRef(null);
  const detailMenuButtonRef = useRef(null);
  const inviteDropdownRef = useRef(null);
  const inviteDropdownButtonRef = useRef(null);

  const statusOptions = ["All", "Inactive", "Active"];

  const hasFetchedRef = useRef(false);

  // Fetch roles from backend
  const fetchRoles = useCallback(async () => {
    try {
      const response = await rolesAPI.getAll();
      if (response && response.success) {
        setRoles(response.data || []);
      }
    } catch (err) {
      console.error("Error fetching roles:", err);
    }
  }, []);

  // Fetch users from backend
  const fetchUsers = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) {
        setLoading(true);
      }
      setError(null);

      // Determine status filter for API
      let statusParam = null;
      if (statusFilter === "Active") {
        statusParam = "active";
      } else if (statusFilter === "Inactive") {
        statusParam = "inactive";
      }
      // "All" doesn't need a status param - fetch all users

      const params = statusParam ? { status: statusParam } : {};
      const response = await usersAPI.getAll(params);

      if (response.success) {
        setUsers(response.data || []);
        setError(null);
      } else {
        setError(response.message || "Failed to fetch users");
      }
    } catch (err) {
      console.error("Error fetching users:", err);
      setError(err.message || "Failed to fetch users");
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  }, [statusFilter]);

  // Fetch locations
  const fetchLocations = useCallback(async () => {
    try {
      const response = await locationsAPI.getAll();
      if (response && response.success) {
        setLocations(response.data || []);
      }
    } catch (err) {
      console.error("Error fetching locations:", err);
    }
  }, []);

  // Fetch locations when location access modal opens
  useEffect(() => {
    if (locationAccessModalOpen || editLocationAccessModalOpen) {
      fetchLocations();
    }
  }, [locationAccessModalOpen, editLocationAccessModalOpen, fetchLocations]);

  // Fetch users and roles on component mount (parallel, only once)
  useEffect(() => {
    if (!hasFetchedRef.current) {
      hasFetchedRef.current = true;
      // Fetch both in parallel - don't show loading spinner on initial load
      Promise.all([
        fetchUsers(false),
        fetchRoles()
      ]).catch(err => {
        console.error("Error fetching initial data:", err);
      });
    }
  }, []);

  // Fetch users when status filter changes (but not on initial mount)
  useEffect(() => {
    if (hasFetchedRef.current) {
      fetchUsers(true);
    }
  }, [statusFilter]);

  // Fetch user details when a user is selected
  useEffect(() => {
    const fetchUserDetails = async () => {
      if (!selectedUser) {
        setUserDetails(null);
        setUserLocations([]);
        return;
      }

      try {
        const userId = selectedUser.id || selectedUser._id;
        const response = await usersAPI.getById(userId);
        if (response && response.success) {
          setUserDetails(response.data);
          // Fetch accessible locations
          if (response.data.accessibleLocations && response.data.accessibleLocations.length > 0) {
            const locationIds = response.data.accessibleLocations;
            const locationsResponse = await locationsAPI.getAll();
            if (locationsResponse && locationsResponse.success) {
              const allLocations = locationsResponse.data || [];
              const userAccessibleLocations = allLocations.filter(loc =>
                locationIds.some(id => (loc._id || loc.id) === (id._id || id))
              );
              setUserLocations(userAccessibleLocations);
            }
          } else {
            setUserLocations([]);
          }
        }
      } catch (err) {
        console.error("Error fetching user details:", err);
      }
    };

    fetchUserDetails();
  }, [selectedUser]);

  // Click away handlers
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (statusRef.current && !statusRef.current.contains(event.target) &&
        statusDropdownRef.current && !statusDropdownRef.current.contains(event.target)) {
        setStatusDropdownOpen(false);
      }
      if (menuButtonRef.current && !menuButtonRef.current.contains(event.target) &&
        menuDropdownRef.current && !menuDropdownRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
      if (detailMenuButtonRef.current && !detailMenuButtonRef.current.contains(event.target) &&
        detailMenuRef.current && !detailMenuRef.current.contains(event.target)) {
        setDetailMenuOpen(false);
      }
      if (inviteDropdownButtonRef.current && !inviteDropdownButtonRef.current.contains(event.target) &&
        inviteDropdownRef.current && !inviteDropdownRef.current.contains(event.target)) {
        setInviteDropdownOpen(false);
      }
    };
    if (statusDropdownOpen || menuOpen || detailMenuOpen || inviteDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [statusDropdownOpen, menuOpen, detailMenuOpen, inviteDropdownOpen]);

  // Handle edit user
  const handleEditUser = async () => {
    if (!canManageUsers) {
      setError("Only Admin users can manage users.");
      return;
    }

    if (!editData.name || !editData.email || !editData.role) {
      setError("Name, email, and role are required");
      return;
    }

    if (!selectedUser) {
      setError("No user selected");
      return;
    }

    try {
      setIsSaving(true);
      setError(null);

      const roleValue = editData.role;

      const userId = selectedUser.id || selectedUser._id;
      const response = await usersAPI.update(userId, {
        name: editData.name,
        email: editData.email,
        role: roleValue,
        // Keep existing location data (will be updated in location access modal)
        accessibleLocations: userDetails?.accessibleLocations || [],
        defaultBusinessLocation: userDetails?.defaultBusinessLocation || null,
        defaultWarehouseLocation: userDetails?.defaultWarehouseLocation || null,
      });

      if (response.success) {
        setEditModalOpen(false);
        setError(null);

        // Update selected user immediately with new data
        if (userId) {
          // Use existing userDetails or update with response data
          const updatedUser = {
            ...selectedUser,
            name: editData.name,
            email: editData.email,
            role: roleValue,
          };
          setSelectedUser(updatedUser);

          // Load existing location access from userDetails (immediate, no API call)
          const userData = userDetails || {};

          // Set accessible locations immediately
          if (userData.accessibleLocations && Array.isArray(userData.accessibleLocations) && userData.accessibleLocations.length > 0) {
            const locationIds = userData.accessibleLocations.map(loc => {
              if (typeof loc === 'string') return loc;
              if (typeof loc === 'object' && loc !== null) {
                return loc._id || loc.id || loc;
              }
              return loc;
            }).filter(id => id !== null && id !== undefined);
            setAccessibleLocations(locationIds);
          } else {
            setAccessibleLocations([]);
          }

          // Set default business location immediately
          if (userData.defaultBusinessLocation) {
            const defaultBusinessId = typeof userData.defaultBusinessLocation === 'string'
              ? userData.defaultBusinessLocation
              : (typeof userData.defaultBusinessLocation === 'object' && userData.defaultBusinessLocation !== null
                ? (userData.defaultBusinessLocation._id || userData.defaultBusinessLocation.id || userData.defaultBusinessLocation)
                : userData.defaultBusinessLocation);
            setDefaultBusinessLocation(String(defaultBusinessId));
          } else {
            setDefaultBusinessLocation("");
          }

          // Set default warehouse location immediately
          if (userData.defaultWarehouseLocation) {
            const defaultWarehouseId = typeof userData.defaultWarehouseLocation === 'string'
              ? userData.defaultWarehouseLocation
              : (typeof userData.defaultWarehouseLocation === 'object' && userData.defaultWarehouseLocation !== null
                ? (userData.defaultWarehouseLocation._id || userData.defaultWarehouseLocation.id || userData.defaultWarehouseLocation)
                : userData.defaultWarehouseLocation);
            setDefaultWarehouseLocation(String(defaultWarehouseId));
          } else {
            setDefaultWarehouseLocation("");
          }

          // Open location access modal immediately
          setEditLocationAccessModalOpen(true);

          // Fetch locations in background (non-blocking)
          fetchLocations().catch(err => console.error("Error fetching locations:", err));

          // Refresh user details and users list in background (non-blocking)
          Promise.all([
            usersAPI.getById(userId).then(userResponse => {
              if (userResponse && userResponse.success) {
                setUserDetails(userResponse.data);
                setSelectedUser(prev => ({ ...prev, ...userResponse.data }));
              }
            }).catch(err => console.error("Error fetching user details:", err)),
            fetchUsers()
          ]).catch(err => console.error("Error refreshing data:", err));
        }
      } else {
        setError(response.message || "Failed to update user");
      }
    } catch (err) {
      console.error("Error updating user:", err);
      setError(err.message || "Failed to update user");
    } finally {
      setIsSaving(false);
    }
  };

  // Handle invite user - show location access modal instead of saving
  const handleInviteUser = () => {
    if (!canManageUsers) {
      setError("Only Admin users can manage users.");
      return;
    }

    if (!inviteData.name || !inviteData.email || !inviteData.role) {
      setError("Name, email, and role are required");
      return;
    }

    setError(null);
    // Close invite modal and open location access modal
    setInviteModalOpen(false);
    setLocationAccessModalOpen(true);
    // Reset location selections
    setAccessibleLocations([]);
    setDefaultBusinessLocation("");
    setDefaultWarehouseLocation("");
    setLocationSearch("");
  };

  // Handle location selection (toggle)
  const handleLocationSelect = (locationId) => {
    if (accessibleLocations.includes(locationId)) {
      // Remove if already selected
      setAccessibleLocations(accessibleLocations.filter(id => id !== locationId));
      if (defaultBusinessLocation === locationId) {
        setDefaultBusinessLocation("");
      }
      if (defaultWarehouseLocation === locationId) {
        setDefaultWarehouseLocation("");
      }
    } else {
      // Add if not selected
      setAccessibleLocations([...accessibleLocations, locationId]);
    }
  };

  // Handle location removal
  const handleLocationRemove = (locationId) => {
    setAccessibleLocations(accessibleLocations.filter(id => id !== locationId));
    if (defaultBusinessLocation === locationId) {
      setDefaultBusinessLocation("");
    }
    if (defaultWarehouseLocation === locationId) {
      setDefaultWarehouseLocation("");
    }
  };

  // Handle select all locations
  const handleSelectAllLocations = () => {
    const allLocationIds = filteredLocations.map(loc => loc._id || loc.id);
    // Toggle: if all filtered locations are selected, deselect them; otherwise select all
    const allSelected = filteredLocations.length > 0 && filteredLocations.every(loc => accessibleLocations.includes(loc._id || loc.id));
    if (allSelected) {
      // Remove all filtered locations from accessible locations
      const filteredIds = new Set(allLocationIds);
      setAccessibleLocations(accessibleLocations.filter(id => !filteredIds.has(id)));
      // Also clear defaults if they're in the filtered list
      if (filteredIds.has(defaultBusinessLocation)) {
        setDefaultBusinessLocation("");
      }
      if (filteredIds.has(defaultWarehouseLocation)) {
        setDefaultWarehouseLocation("");
      }
    } else {
      // Add all filtered locations (merge with existing)
      const newIds = [...new Set([...accessibleLocations, ...allLocationIds])];
      setAccessibleLocations(newIds);
    }
  };

  // Handle remove all locations
  const handleRemoveAllLocations = () => {
    setAccessibleLocations([]);
    setDefaultBusinessLocation("");
    setDefaultWarehouseLocation("");
  };

  // Filter locations based on search
  const filteredLocations = locations.filter(location =>
    location.name.toLowerCase().includes(locationSearch.toLowerCase())
  );

  // Get accessible location objects
  const accessibleLocationObjects = locations.filter(location =>
    accessibleLocations.includes(location._id || location.id)
  );

  // Business locations (type: "Business" or "General")
  const businessLocations = accessibleLocationObjects.filter(loc =>
    loc.type === "Business" || loc.type === "General"
  );

  // Warehouse locations (type: "Warehouse")
  const warehouseLocations = accessibleLocationObjects.filter(loc =>
    loc.type === "Warehouse"
  );
  const customRoleOptions = roles.map((role) => ({
    value: role.name,
    label: role.name,
  }));
  const roleOptions = [...STANDARD_ROLE_OPTIONS, ...customRoleOptions];

  // Handle invite again
  const handleInviteAgain = async () => {
    if (!canManageUsers) {
      setError("Only Admin users can manage users.");
      return;
    }

    if (!selectedUser) return;

    try {
      setIsSaving(true);
      setError(null);
      setDetailMenuOpen(false);

      // Generate a new temporary password
      const tempPassword = Math.random().toString(36).slice(-12) + Math.random().toString(36).slice(-12) + "A1!";

      const userId = selectedUser.id || selectedUser._id;
      const response = await usersAPI.sendInvitation(userId, {
        tempPassword,
        accessibleLocations: userDetails?.accessibleLocations || [],
        defaultBusinessLocation: userDetails?.defaultBusinessLocation || null,
        defaultWarehouseLocation: userDetails?.defaultWarehouseLocation || null,
      });

      if (response.success) {
        // Show success message
        setError(null);
        setSuccessMessage("Invitation email sent successfully!");
        setTimeout(() => setSuccessMessage(null), 3000);
        // Refresh users list and selected user details
        await fetchUsers(false);
        const userResponse = await usersAPI.getById(userId);
        if (userResponse && userResponse.success) {
          setUserDetails(userResponse.data);
          setSelectedUser({ ...selectedUser, ...userResponse.data, status: userResponse.data.status });
        }
      } else {
        setError(response.message || "Failed to send invitation");
      }
    } catch (err) {
      console.error("Error sending invitation:", err);
      setError(err.message || "Failed to send invitation");
    } finally {
      setIsSaving(false);
    }
  };

  // Handle mark as inactive
  const handleMarkInactive = async () => {
    if (!canManageUsers) {
      setError("Only Admin users can manage users.");
      return;
    }

    if (!selectedUser) return;

    try {
      setIsSaving(true);
      setError(null);
      setDetailMenuOpen(false);

      const userId = selectedUser.id || selectedUser._id;
      const response = await usersAPI.update(userId, {
        isActive: false,
      });

      if (response.success) {
        setError(null);
        setSuccessMessage("User marked as inactive successfully!");
        setTimeout(() => setSuccessMessage(null), 3000);
        // Refresh users list and selected user details
        await fetchUsers(false);
        const userResponse = await usersAPI.getById(userId);
        if (userResponse && userResponse.success) {
          setUserDetails(userResponse.data);
          setSelectedUser({ ...selectedUser, ...userResponse.data, status: userResponse.data.status });
        }
      } else {
        setError(response.message || "Failed to update user");
      }
    } catch (err) {
      console.error("Error updating user:", err);
      setError(err.message || "Failed to update user");
    } finally {
      setIsSaving(false);
    }
  };

  // Handle mark as active
  const handleMarkActive = async () => {
    if (!canManageUsers) {
      setError("Only Admin users can manage users.");
      return;
    }

    if (!selectedUser) return;

    try {
      setIsSaving(true);
      setError(null);
      setDetailMenuOpen(false);

      const userId = selectedUser.id || selectedUser._id;
      const response = await usersAPI.update(userId, {
        isActive: true,
      });

      if (response.success) {
        setError(null);
        setSuccessMessage("User marked as active successfully!");
        setTimeout(() => setSuccessMessage(null), 3000);
        // Refresh users list and selected user details
        await fetchUsers(false);
        const userResponse = await usersAPI.getById(userId);
        if (userResponse && userResponse.success) {
          setUserDetails(userResponse.data);
          setSelectedUser({ ...selectedUser, ...userResponse.data, status: userResponse.data.status });
        }
      } else {
        setError(response.message || "Failed to update user");
      }
    } catch (err) {
      console.error("Error updating user:", err);
      setError(err.message || "Failed to update user");
    } finally {
      setIsSaving(false);
    }
  };

  // Handle delete user
  const handleDeleteUser = async () => {
    if (!canManageUsers) {
      setError("Only Admin users can manage users.");
      return;
    }

    if (!selectedUser) return;

    if (!window.confirm(`Are you sure you want to delete ${selectedUser.name}? This will permanently delete their account.`)) {
      return;
    }

    try {
      setIsSaving(true);
      setError(null);
      setDetailMenuOpen(false);

      const userId = selectedUser.id || selectedUser._id;
      const response = await usersAPI.delete(userId);

      if (response.success) {
        setError(null);
        setSuccessMessage("User deleted successfully!");
        setTimeout(() => setSuccessMessage(null), 3000);
        setSelectedUser(null); // Close detail panel
        await fetchUsers(false); // Refresh users list
      } else {
        setError(response.message || "Failed to delete user");
      }
    } catch (err) {
      console.error("Error deleting user:", err);
      setError(err.message || "Failed to delete user");
    } finally {
      setIsSaving(false);
    }
  };

  // Handle send invite (create user with location access)
  const handleSendInvite = async () => {
    if (!canManageUsers) {
      setError("Only Admin users can manage users.");
      return;
    }

    if (!defaultBusinessLocation) {
      setError("Default Business Location is required");
      return;
    }

    try {
      setIsSaving(true);
      setError(null);

      // Generate password if not provided
      const userPassword = inviteData.password || Math.random().toString(36).slice(-12) + Math.random().toString(36).slice(-12) + "A1!";

      // Create user with skipEmail flag
      const createResponse = await usersAPI.create({
        name: inviteData.name,
        email: inviteData.email,
        role: inviteData.role,
        password: userPassword,
        accessibleLocations,
        defaultBusinessLocation: defaultBusinessLocation || null,
        defaultWarehouseLocation: defaultWarehouseLocation || null,
        skipEmail: true, // Don't send email yet
      });

      if (createResponse.success && createResponse.data.id) {
        // Now send invitation email with location access
        const sendInviteResponse = await usersAPI.sendInvitation(createResponse.data.id, {
          tempPassword: userPassword,
          accessibleLocations,
          defaultBusinessLocation: defaultBusinessLocation || null,
          defaultWarehouseLocation: defaultWarehouseLocation || null,
        });

        if (sendInviteResponse.success) {
          // Close modals and reset
          setLocationAccessModalOpen(false);
          setInviteModalOpen(false);
          setInviteData({ name: "", email: "", role: "", password: "" });
          setAccessibleLocations([]);
          setDefaultBusinessLocation("");
          setDefaultWarehouseLocation("");
          setError(null);
          fetchUsers(); // Refresh users list
        } else {
          setError(sendInviteResponse.message || "User created but failed to send invitation email");
        }
      } else {
        setError(createResponse.message || "Failed to create user");
      }
    } catch (err) {
      console.error("Error sending invite:", err);
      setError(err.message || "Failed to send invite");
    } finally {
      setIsSaving(false);
    }
  };

  // Handle update user location access (for edit flow)
  const handleUpdateUserLocationAccess = async () => {
    if (!canManageUsers) {
      setError("Only Admin users can manage users.");
      return;
    }

    if (!defaultBusinessLocation) {
      setError("Default Business Location is required");
      return;
    }

    if (!selectedUser) {
      setError("No user selected");
      return;
    }

    try {
      setIsSaving(true);
      setError(null);

      const userId = selectedUser.id || selectedUser._id;

      // Update user with location access
      const updateResponse = await usersAPI.update(userId, {
        accessibleLocations,
        defaultBusinessLocation: defaultBusinessLocation || null,
        defaultWarehouseLocation: defaultWarehouseLocation || null,
      });

      if (updateResponse.success) {
        // Generate a temporary password for the invitation
        const tempPassword = Math.random().toString(36).slice(-12) + Math.random().toString(36).slice(-12) + "A1!";

        // Send invitation email with updated location access
        const sendInviteResponse = await usersAPI.sendInvitation(userId, {
          tempPassword,
          accessibleLocations,
          defaultBusinessLocation: defaultBusinessLocation || null,
          defaultWarehouseLocation: defaultWarehouseLocation || null,
        });

        if (sendInviteResponse.success) {
          // Close modals and reset
          setEditLocationAccessModalOpen(false);
          setAccessibleLocations([]);
          setDefaultBusinessLocation("");
          setDefaultWarehouseLocation("");
          setLocationSearch("");
          setEditData({ name: "", email: "", role: "" });
          setError(null);
          fetchUsers(); // Refresh users list
          // Refresh selected user details
          if (userId) {
            const userResponse = await usersAPI.getById(userId);
            if (userResponse.success) {
              setSelectedUser(userResponse.data);
              setUserDetails(userResponse.data);
            }
          }
        } else {
          setError(sendInviteResponse.message || "Location access updated but failed to send email");
        }
      } else {
        setError(updateResponse.message || "Failed to update user location access");
      }
    } catch (err) {
      console.error("Error updating user location access:", err);
      setError(err.message || "Failed to update user location access");
    } finally {
      setIsSaving(false);
    }
  };

  // Handle export download
  const handleExport = () => {
    // Convert users to CSV format
    const headers = ["User ID", "Name", "Email", "Role", "Status"];
    const rows = users.map(user => [
      user.id || user._id || "",
      user.name || "",
      user.email || "",
      user.role || "",
      user.status || (user.isActive ? "Active" : "Inactive")
    ]);

    // Create CSV content
    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    ].join("\n");

    // Create blob and download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `users_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setExportModalOpen(false);
  };

  // Helper function to get avatar color based on first letter
  const getAvatarColor = (letter) => {
    const upperLetter = letter?.toUpperCase() || 'U';
    // A should be light blue (sky blue)
    if (upperLetter === 'A') return 'bg-sky-400';
    // d should be dark blue
    if (upperLetter === 'D') return 'bg-blue-700';
    // Default colors for other letters
    const colors = [
      'bg-blue-500', 'bg-blue-600', 'bg-indigo-500', 'bg-purple-500',
      'bg-pink-500', 'bg-red-500', 'bg-orange-500', 'bg-yellow-500',
      'bg-green-500', 'bg-teal-500', 'bg-cyan-500', 'bg-sky-500'
    ];
    const index = (upperLetter.charCodeAt(0) - 65) % colors.length;
    return colors[index >= 0 ? index : 0];
  };

  return (
    <div className="flex gap-0 h-full">
      {/* Error Message */}
      {error && (
        <div className="absolute top-20 left-6 right-6 z-50 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
          {error}
        </div>
      )}

      {/* Success Message */}
      {successMessage && (
        <div className="absolute top-20 left-6 right-6 z-50 p-3 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm">
          {successMessage}
        </div>
      )}

      {/* User List */}
      <div className={`${selectedUser ? 'w-[35%]' : 'w-full'} bg-white border border-gray-200 overflow-hidden flex flex-col h-full`}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0 overflow-hidden">
          <div className="flex items-center gap-2">
            <div ref={statusRef} className="relative">
              <button
                onClick={() => setStatusDropdownOpen(!statusDropdownOpen)}
                className="flex items-center gap-2 text-2xl font-semibold text-gray-900 hover:text-gray-700"
              >
                <span>All Users</span>
                <ChevronDown size={20} className={`text-blue-600 transition-transform ${statusDropdownOpen ? "rotate-180" : ""}`} />
              </button>
              {statusDropdownOpen && createPortal(
                <div
                  ref={statusDropdownRef}
                  className="fixed bg-white border border-gray-200 rounded-lg shadow-lg z-[10000] min-w-[150px]"
                  style={{
                    top: `${statusRef.current?.getBoundingClientRect().bottom + 8}px`,
                    left: `${statusRef.current?.getBoundingClientRect().left}px`
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {statusOptions.map((option) => {
                    const isSelected = statusFilter === option;
                    return (
                      <button
                        key={option}
                        onClick={() => {
                          setStatusFilter(option);
                          setStatusDropdownOpen(false);
                        }}
                        className={`w-full px-4 py-2 text-left text-sm flex items-center justify-between transition ${isSelected
                          ? "text-gray-900 border-l-2 border-blue-600 bg-blue-50"
                          : "text-gray-700 hover:bg-gray-50"
                          }`}
                      >
                        <span>{option}</span>
                      </button>
                    );
                  })}
                </div>,
                document.body
              )}
            </div>
          </div>
          <div className="flex items-center gap-4">



            <div className="flex items-center rounded-lg overflow-hidden">
              <button
                onClick={() => canManageUsers && setInviteModalOpen(true)}
                disabled={!canManageUsers}
                className="px-3 py-2 bg-[#156372] text-white hover:bg-[#0f4e5a] flex items-center justify-center gap-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus size={16} />
                Invite User
              </button>
            </div>
            <div ref={menuButtonRef} className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="w-9 h-9 border border-gray-200 rounded hover:bg-gray-50 flex items-center justify-center"
              >
                <MoreVertical size={16} className="text-gray-600" />
              </button>
              {menuOpen && createPortal(
                <div
                  ref={menuDropdownRef}
                  className="fixed bg-white border border-gray-200 rounded-lg shadow-lg z-[10000] min-w-[150px]"
                  style={{
                    top: `${menuButtonRef.current?.getBoundingClientRect().bottom + 8}px`,
                    right: `${window.innerWidth - (menuButtonRef.current?.getBoundingClientRect().right || 0)}px`
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() => {
                      setExportModalOpen(true);
                      setMenuOpen(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                  >
                    <div className="w-4 h-4 text-blue-600 flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" x2="12" y1="3" y2="15" /></svg>
                    </div>
                    Export
                  </button>
                </div>,
                document.body
              )}
            </div>
          </div>
        </div>
        {!canManageUsers && (
          <div className="px-6 py-3 border-b border-gray-200 bg-amber-50 text-amber-800 text-sm">
            Only Admin users can invite, edit, activate/inactivate, or delete users.
          </div>
        )}
        {loading ? (
          <div className="p-8 text-center">
            <div className="w-6 h-6 border-2 border-[#156372] border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-gray-500 text-sm">Loading users...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-500 text-sm">No users found</p>
          </div>
        ) : (
          <div className="overflow-y-auto flex-1">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    <div className="flex items-center gap-2">
                      USER DETAILS
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path d="M6 2v8M2 6l4-4 4 4" stroke="#6b7280" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    ROLE
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    STATUS
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((user) => (
                  <tr
                    key={user.id}
                    className={`cursor-pointer hover:bg-gray-50 ${selectedUser && (selectedUser.id === user.id || selectedUser._id === user.id)
                      ? 'bg-blue-50'
                      : ''
                      }`}
                    onClick={() => setSelectedUser(user)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0 ${getAvatarColor(user.avatar || user.name?.charAt(0))}`}>
                          {user.avatar || user.name?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-gray-900 mb-0.5">{user.name}</div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900">{formatRoleLabel(user.roleKey || user.role)}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${user.status === "Active"
                        ? "bg-green-100 text-green-800"
                        : user.status === "Invited"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-gray-100 text-gray-800"
                        }`}>
                        {user.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* User Detail Panel */}
      {selectedUser && (
        <div className="w-[65%] bg-white border-l border-gray-200 flex flex-col h-full overflow-hidden">
          {/* Top Action Buttons */}
          <div className="flex items-center justify-end gap-2 p-4 border-b border-gray-200">
            <button
              disabled={!canManageUsers}
              onClick={() => {
                if (selectedUser) {
                  setEditData({
                    name: selectedUser.name || "",
                    email: selectedUser.email || "",
                    role: selectedUser.roleKey || selectedUser.role || "",
                  });
                  setEditModalOpen(true);
                }
              }}
              className="px-3 py-1.5 bg-red-600 text-white text-sm font-medium hover:bg-red-700 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Pencil size={14} />
              Edit
            </button>
            <div ref={detailMenuButtonRef} className="relative">
              <button
                disabled={!canManageUsers}
                onClick={() => setDetailMenuOpen(!detailMenuOpen)}
                className="w-8 h-8 hover:bg-gray-100 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <MoreVertical size={18} className="text-gray-600" />
              </button>
              {detailMenuOpen && createPortal(
                <div
                  ref={detailMenuRef}
                  className="fixed bg-white border border-gray-200 rounded-lg shadow-lg z-[10000] min-w-[150px]"
                  style={{
                    top: `${detailMenuButtonRef.current?.getBoundingClientRect().bottom + 8}px`,
                    right: `${window.innerWidth - (detailMenuButtonRef.current?.getBoundingClientRect().right || 0)}px`
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={handleInviteAgain}
                    disabled={isSaving}
                    className="w-full px-4 py-2 text-left text-sm text-white bg-blue-600 hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed rounded-t-lg"
                  >
                    Invite again
                  </button>
                  {selectedUser?.status === "Active" || selectedUser?.status === "Invited" ? (
                    <button
                      onClick={handleMarkInactive}
                      disabled={isSaving}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Mark as Inactive
                    </button>
                  ) : (
                    <button
                      onClick={handleMarkActive}
                      disabled={isSaving}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Mark as Active
                    </button>
                  )}
                  <button
                    onClick={handleDeleteUser}
                    disabled={isSaving}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed rounded-b-lg"
                  >
                    Delete
                  </button>
                </div>,
                document.body
              )}
            </div>
            <button
              onClick={() => setSelectedUser(null)}
              className="w-8 h-8 hover:bg-gray-100 flex items-center justify-center"
            >
              <X size={18} className="text-gray-600" />
            </button>
          </div>

          {/* User Info Header */}
          <div className="border-b border-gray-200 p-6 flex-shrink-0">
            <div className="flex items-center gap-4 mb-4">
              <div className={`w-14 h-14 rounded-full flex items-center justify-center text-white font-semibold text-xl ${getAvatarColor(selectedUser.avatar || selectedUser.name?.charAt(0))}`}>
                {selectedUser.avatar || selectedUser.name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-lg font-semibold text-gray-900">{selectedUser.name}</h2>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${selectedUser.status === "Active"
                    ? "bg-green-100 text-green-800"
                    : selectedUser.status === "Invited"
                      ? "bg-blue-100 text-blue-800"
                      : "bg-gray-100 text-gray-800"
                    }`}>
                    {selectedUser.status || "Active"}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-1">{selectedUser.email}</p>
                <p className="text-sm text-gray-600">Role: {formatRoleLabel(selectedUser.roleKey || selectedUser.role)}</p>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-1 border-b border-gray-200 -mb-6">
              <button
                onClick={() => setActiveTab("more-details")}
                className={`px-4 py-2 text-sm font-medium transition ${activeTab === "more-details"
                  ? "text-blue-600 border-b-2 border-blue-600"
                  : "text-gray-600 hover:text-gray-900"
                  }`}
              >
                More Details
              </button>
              <button
                onClick={() => setActiveTab("recent-activities")}
                className={`px-4 py-2 text-sm font-medium transition ${activeTab === "recent-activities"
                  ? "text-blue-600 border-b-2 border-blue-600"
                  : "text-gray-600 hover:text-gray-900"
                  }`}
              >
                Recent Activities
              </button>
            </div>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {activeTab === "more-details" && (
              <div className="space-y-6">
                {/* Custom Fields */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-4 uppercase">CUSTOM FIELDS</h3>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <p className="text-sm text-gray-600">You haven't added any custom field information.</p>
                  </div>
                </div>

                {/* Accessible Locations */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-gray-900 uppercase">Accessible Locations</h3>
                    <button className="p-1 hover:bg-gray-100 rounded">
                      <Pencil size={14} className="text-blue-600" />
                    </button>
                  </div>
                  {userLocations.length > 0 ? (
                    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                      <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">LOCATION</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">TYPE</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {userLocations.map((location) => {
                            const isDefaultBusiness = userDetails?.defaultBusinessLocation === (location._id || location.id) || userDetails?.defaultBusinessLocation?._id === (location._id || location.id);
                            const isDefaultWarehouse = userDetails?.defaultWarehouseLocation === (location._id || location.id) || userDetails?.defaultWarehouseLocation?._id === (location._id || location.id);
                            const isDefault = isDefaultBusiness || isDefaultWarehouse;
                            return (
                              <tr key={location._id || location.id}>
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm text-gray-900">{location.name}</span>
                                    {isDefault && (
                                      <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs font-medium rounded-full flex items-center gap-1">
                                        <Star size={10} className="fill-current" />
                                        Business & Warehouse Default
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  <span className="text-sm text-gray-700">{location.type || "Business"}</span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <p className="text-sm text-gray-600">No accessible locations assigned.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === "recent-activities" && (
              <div>
                <p className="text-sm text-gray-600">No recent activities to display.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Invite User Modal */}
      {inviteModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10001]">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Invite User</h3>
                <button
                  onClick={() => {
                    setInviteModalOpen(false);
                    setInviteData({ name: "", email: "", role: "", password: "" });
                    setError(null);
                  }}
                  className="p-1 hover:bg-gray-100 rounded transition"
                >
                  <X size={20} className="text-gray-500" />
                </button>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
                  {error}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={inviteData.name}
                    onChange={(e) => setInviteData({ ...inviteData, name: e.target.value })}
                    className="w-full h-10 px-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter user's name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={inviteData.email}
                    onChange={(e) => setInviteData({ ...inviteData, email: e.target.value })}
                    className="w-full h-10 px-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter user's email"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Role <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={inviteData.role}
                    onChange={(e) => setInviteData({ ...inviteData, role: e.target.value })}
                    className="w-full h-10 px-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select a role</option>
                    {roleOptions.map((role) => (
                      <option key={role.value} value={role.value}>
                        {role.label}
                      </option>
                    ))}
                  </select>
                </div>


              </div>

              <div className="flex items-center justify-end gap-3 mt-6">
                <button
                  onClick={() => {
                    setInviteModalOpen(false);
                    setInviteData({ name: "", email: "", role: "", password: "" });
                    setError(null);
                  }}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleInviteUser}
                  className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700"
                >
                  Invite User
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editModalOpen && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10001]">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Edit User</h3>
                <button
                  onClick={() => {
                    setEditModalOpen(false);
                    setEditData({ name: "", email: "", role: "" });
                    setError(null);
                  }}
                  className="p-1 hover:bg-gray-100 rounded transition"
                >
                  <X size={20} className="text-red-500" />
                </button>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
                  {error}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-red-500 mb-2">
                    Name*
                  </label>
                  <input
                    type="text"
                    value={editData.name}
                    onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                    className="w-full h-10 px-3 rounded-lg border border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter user's name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-red-500 mb-2">
                    Email Address*
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      value={editData.email}
                      onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                      className="w-full h-10 px-3 pr-10 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter user's email"
                    />
                    <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-red-500 mb-2">
                    Role*
                  </label>
                  <div className="relative">
                    <select
                      value={editData.role}
                      onChange={(e) => setEditData({ ...editData, role: e.target.value })}
                      className="w-full h-10 px-3 pr-10 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                    >
                      <option value="">Select a role</option>
                      {roleOptions.map((role) => (
                        <option key={role.value} value={role.value}>
                          {role.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>
                  {editData.role && (
                    <p className="mt-1 text-sm text-gray-500">
                      {getRoleHelpText(editData.role)}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 mt-6">
                <button
                  onClick={() => {
                    setEditModalOpen(false);
                    setEditData({ name: "", email: "", role: "" });
                    setError(null);
                  }}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleEditUser}
                  disabled={isSaving}
                  className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Save & Continue
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Export Modal */}
      {exportModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10001]">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Export Users</h3>
                <button
                  onClick={() => setExportModalOpen(false)}
                  className="p-1 hover:bg-gray-100 rounded transition"
                >
                  <X size={20} className="text-gray-500" />
                </button>
              </div>

              {/* Info Banner */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-6">
                <p className="text-sm text-blue-800">
                  You can export your data from Zoho Books in CSV, XLS or XLSX format.
                </p>
              </div>

              {/* Form */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Module <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={exportData.module}
                    onChange={(e) => setExportData({ ...exportData, module: e.target.value })}
                    className="w-full h-10 px-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option>Users</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Export Template <span className="text-gray-400">?</span>
                  </label>
                  <select
                    value={exportData.template}
                    onChange={(e) => setExportData({ ...exportData, template: e.target.value })}
                    className="w-full h-10 px-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select an Export Template</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Decimal Format <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={exportData.decimalFormat}
                    onChange={(e) => setExportData({ ...exportData, decimalFormat: e.target.value })}
                    className="w-full h-10 px-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option>1234567.89</option>
                    <option>1,234,567.89</option>
                    <option>1234567,89</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Export File Format <span className="text-red-500">*</span>
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="radio"
                        name="fileFormat"
                        value="CSV"
                        checked={exportData.fileFormat === "CSV"}
                        onChange={(e) => setExportData({ ...exportData, fileFormat: e.target.value })}
                        className="h-4 w-4"
                      />
                      <span className="text-sm text-gray-700">CSV (Comma Separated Value)</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="radio"
                        name="fileFormat"
                        value="XLS"
                        checked={exportData.fileFormat === "XLS"}
                        onChange={(e) => setExportData({ ...exportData, fileFormat: e.target.value })}
                        className="h-4 w-4"
                      />
                      <span className="text-sm text-gray-700">XLS (Microsoft Excel 1997-2004 Compatible)</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="radio"
                        name="fileFormat"
                        value="XLSX"
                        checked={exportData.fileFormat === "XLSX"}
                        onChange={(e) => setExportData({ ...exportData, fileFormat: e.target.value })}
                        className="h-4 w-4"
                      />
                      <span className="text-sm text-gray-700">XLSX (Microsoft Excel)</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={exportData.includePII}
                      onChange={(e) => setExportData({ ...exportData, includePII: e.target.checked })}
                      className="h-4 w-4"
                    />
                    <span className="text-sm text-gray-700">
                      Include Sensitive Personally Identifiable Information (PII) while exporting.
                    </span>
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    File Protection Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={exportData.password}
                      onChange={(e) => setExportData({ ...exportData, password: e.target.value })}
                      className="w-full h-10 px-3 pr-10 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    Your password must be at least 12 characters and include one uppercase letter, lowercase letter, number, and special character.
                  </p>
                </div>
              </div>

              {/* Note */}
              <div className="mt-6 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                <p className="text-sm text-gray-600">
                  <strong>Note:</strong> You can export only the first 25,000 rows. If you have more rows, please initiate a backup for the data in your Taban Books organization, and download it.{" "}
                  <button className="text-blue-600 hover:underline">Backup Your Data</button>
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 mt-6">
                <button
                  onClick={() => setExportModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleExport}
                  className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700"
                >
                  Export
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Configure Location Access Modal */}
      {locationAccessModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10002]">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Configure Location Access</h3>
                <button
                  onClick={() => {
                    setLocationAccessModalOpen(false);
                    setInviteModalOpen(true);
                  }}
                  className="p-1 hover:bg-gray-100 rounded transition"
                >
                  <X size={20} className="text-gray-500" />
                </button>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
                  {error}
                </div>
              )}

              {/* User Details */}
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">User Details</h4>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                    <UserIcon size={20} className="text-gray-500" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">{inviteData.name}</div>
                    <div className="text-sm text-gray-500">{inviteData.email}</div>
                  </div>
                </div>
              </div>

              {/* Locations Section */}
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-gray-900 mb-2">Locations</h4>
                <p className="text-sm text-gray-600 mb-4">
                  Select the locations for which this user can create and access transactions.
                </p>

                <div className="grid grid-cols-2 gap-4">
                  {/* Left Column - Available Locations */}
                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="relative mb-3">
                      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        value={locationSearch}
                        onChange={(e) => setLocationSearch(e.target.value)}
                        className="w-full h-9 pl-9 pr-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        placeholder="Type to search Locations"
                      />
                    </div>
                    <div className="mb-3 border-b border-gray-200 pb-2">
                      <div className="flex items-center gap-2 cursor-pointer" onClick={handleSelectAllLocations}>
                        <Check size={16} className="text-green-600" />
                        <span className="text-sm text-gray-700">Select All</span>
                      </div>
                    </div>
                    <div className="space-y-1 max-h-64 overflow-y-auto">
                      {filteredLocations.map((location) => {
                        const locId = location._id || location.id;
                        const isSelected = accessibleLocations.includes(locId);
                        return (
                          <div
                            key={locId}
                            className={`flex items-center gap-2 p-2 rounded cursor-pointer ${isSelected ? "bg-gray-50" : "hover:bg-gray-50"
                              }`}
                            onClick={() => handleLocationSelect(locId)}
                          >
                            {isSelected && <Check size={16} className="text-green-600" />}
                            {!isSelected && <div className="w-4 h-4" />}
                            <span className="text-sm text-gray-700">{location.name}</span>
                          </div>
                        );
                      })}
                      {filteredLocations.length === 0 && (
                        <div className="text-sm text-gray-500 text-center py-4">No locations found</div>
                      )}
                    </div>
                  </div>

                  {/* Right Column - Accessible Locations */}
                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h5 className="text-xs font-semibold text-gray-700 uppercase">Accessible Locations</h5>
                      <button
                        onClick={handleRemoveAllLocations}
                        disabled={accessibleLocations.length === 0}
                        className="flex items-center gap-1 text-xs text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Minus size={14} />
                        <span>Remove All</span>
                      </button>
                    </div>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {accessibleLocationObjects.map((location) => {
                        const locId = location._id || location.id;
                        return (
                          <div
                            key={locId}
                            className="flex items-center justify-between p-2 rounded hover:bg-gray-50"
                          >
                            <span className="text-sm text-gray-700">{location.name}</span>
                            <button
                              onClick={() => handleLocationRemove(locId)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        );
                      })}
                      {accessibleLocations.length === 0 && (
                        <div className="text-sm text-gray-500 text-center py-4">No locations selected</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Default Location Settings */}
              <div className="grid grid-cols-2 gap-4 mb-6">
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
                      if (selectedLocation && accessibleLocations.includes(selectedLocation)) {
                        setDefaultWarehouseLocation(selectedLocation);
                      } else {
                        setDefaultWarehouseLocation("");
                      }
                    }}
                    className="w-full h-10 px-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  >
                    <option value="">Select Location</option>
                    {businessLocations.map((location) => (
                      <option key={location._id || location.id} value={location._id || location.id}>
                        {location.name}
                      </option>
                    ))}
                  </select>
                </div>

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
                    {warehouseLocations.map((location) => (
                      <option key={location._id || location.id} value={location._id || location.id}>
                        {location.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                <button
                  onClick={() => {
                    setLocationAccessModalOpen(false);
                    setInviteModalOpen(true);
                  }}
                  className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
                >
                  <ArrowLeft size={16} />
                  <span>Back</span>
                </button>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      setLocationAccessModalOpen(false);
                      setInviteModalOpen(true);
                    }}
                    className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSendInvite}
                    disabled={isSaving || !defaultBusinessLocation}
                    className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSaving ? "Sending..." : "Send Invite"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Location Access Modal */}
      {editLocationAccessModalOpen && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10002]">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Configure Location Access</h3>
                <button
                  onClick={() => {
                    setEditLocationAccessModalOpen(false);
                    setAccessibleLocations([]);
                    setDefaultBusinessLocation("");
                    setDefaultWarehouseLocation("");
                    setLocationSearch("");
                    setEditData({ name: "", email: "", role: "" });
                  }}
                  className="p-1 hover:bg-gray-100 rounded transition"
                >
                  <X size={20} className="text-gray-500" />
                </button>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
                  {error}
                </div>
              )}

              {/* User Details */}
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">User Details</h4>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                    <UserIcon size={20} className="text-gray-500" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">{editData.name || selectedUser.name}</div>
                    <div className="text-sm text-gray-500">{editData.email || selectedUser.email}</div>
                  </div>
                </div>
              </div>

              {/* Locations Section - Reuse same structure as invite modal */}
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-gray-900 mb-2">Locations</h4>
                <p className="text-sm text-gray-600 mb-4">
                  Select the locations for which this user can create and access transactions.
                </p>

                <div className="grid grid-cols-2 gap-4">
                  {/* Left Column - Available Locations */}
                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="relative mb-3">
                      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        value={locationSearch}
                        onChange={(e) => setLocationSearch(e.target.value)}
                        className="w-full h-9 pl-9 pr-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        placeholder="Type to search Locations"
                      />
                    </div>
                    <div className="mb-3 border-b border-gray-200 pb-2">
                      <div className="flex items-center gap-2 cursor-pointer" onClick={handleSelectAllLocations}>
                        <Check size={16} className="text-green-600" />
                        <span className="text-sm text-gray-700">Select All</span>
                      </div>
                    </div>
                    <div className="space-y-1 max-h-64 overflow-y-auto">
                      {filteredLocations.map((location) => {
                        const locId = location._id || location.id;
                        const isSelected = accessibleLocations.includes(locId);
                        return (
                          <div
                            key={locId}
                            className={`flex items-center gap-2 p-2 rounded cursor-pointer ${isSelected ? "bg-gray-50" : "hover:bg-gray-50"
                              }`}
                            onClick={() => handleLocationSelect(locId)}
                          >
                            {isSelected && <Check size={16} className="text-green-600" />}
                            {!isSelected && <div className="w-4 h-4" />}
                            <span className="text-sm text-gray-700">{location.name}</span>
                          </div>
                        );
                      })}
                      {filteredLocations.length === 0 && (
                        <div className="text-sm text-gray-500 text-center py-4">No locations found</div>
                      )}
                    </div>
                  </div>

                  {/* Right Column - Accessible Locations */}
                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h5 className="text-xs font-semibold text-gray-700 uppercase">Accessible Locations</h5>
                      <button
                        onClick={handleRemoveAllLocations}
                        disabled={accessibleLocations.length === 0}
                        className="flex items-center gap-1 text-xs text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Minus size={14} />
                        <span>Remove All</span>
                      </button>
                    </div>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {accessibleLocationObjects.map((location) => {
                        const locId = location._id || location.id;
                        return (
                          <div
                            key={locId}
                            className="flex items-center justify-between p-2 rounded hover:bg-gray-50"
                          >
                            <span className="text-sm text-gray-700">{location.name}</span>
                            <button
                              onClick={() => handleLocationRemove(locId)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        );
                      })}
                      {accessibleLocations.length === 0 && (
                        <div className="text-sm text-gray-500 text-center py-4">No locations selected</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Default Location Settings */}
              <div className="grid grid-cols-2 gap-4 mb-6">
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
                      if (selectedLocation && accessibleLocations.includes(selectedLocation)) {
                        setDefaultWarehouseLocation(selectedLocation);
                      } else {
                        setDefaultWarehouseLocation("");
                      }
                    }}
                    className="w-full h-10 px-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  >
                    <option value="">Select Location</option>
                    {businessLocations.map((location) => (
                      <option key={location._id || location.id} value={location._id || location.id}>
                        {location.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                    User's Default Warehouse Location <span className="text-red-500">*</span>
                    <Info size={14} className="text-gray-400" />
                  </label>
                  <select
                    value={defaultWarehouseLocation}
                    onChange={(e) => setDefaultWarehouseLocation(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  >
                    <option value="">Select Location</option>
                    {warehouseLocations.map((location) => (
                      <option key={location._id || location.id} value={location._id || location.id}>
                        {location.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                <button
                  onClick={() => {
                    setEditLocationAccessModalOpen(false);
                    setAccessibleLocations([]);
                    setDefaultBusinessLocation("");
                    setDefaultWarehouseLocation("");
                    setLocationSearch("");
                    setEditData({ name: "", email: "", role: "" });
                  }}
                  className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
                >
                  <ArrowLeft size={16} />
                  <span>Back</span>
                </button>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      setEditLocationAccessModalOpen(false);
                      setAccessibleLocations([]);
                      setDefaultBusinessLocation("");
                      setDefaultWarehouseLocation("");
                      setLocationSearch("");
                      setEditData({ name: "", email: "", role: "" });
                    }}
                    className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleUpdateUserLocationAccess}
                    disabled={isSaving || !defaultBusinessLocation}
                    className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSaving ? "Saving..." : "Save & Send Email"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}












