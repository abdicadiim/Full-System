import React, { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { Loader2, MoreVertical, Eye, Copy, Trash2 } from "lucide-react";
import { rolesAPI } from "../../../../../services/api";
import { getCurrentUser } from "../../../../../services/auth";

const STANDARD_ROLES = [
  {
    id: "standard-admin",
    name: "Admin",
    description: "Complete access to all modules, transactions, and settings.",
    isSystem: true,
  },
  {
    id: "standard-staff",
    name: "Staff",
    description: "Access to all modules except reports, settings, and accountant.",
    isSystem: true,
  },
  {
    id: "standard-timesheet-staff",
    name: "Timesheet Staff",
    description: "Can access and log time entries in the Timesheet module.",
    isSystem: true,
  },
  {
    id: "standard-staff-assigned",
    name: "Staff (Assigned Customers Only)",
    description: "Can access transactions and data for assigned customers only.",
    isSystem: true,
  },
];
export default function RolesPage() {
  const navigate = useNavigate();
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, right: 0 });
  const buttonRefs = useRef({});
  const hasFetchedRef = useRef(false);
  const currentUser = getCurrentUser();
  const canManageRoles = ["owner", "admin"].includes(String(currentUser?.role || "").toLowerCase());

  // Fetch roles from backend
  const fetchRoles = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) {
        setLoading(true);
      }
      setError(null);

      const response = await rolesAPI.getAll();

      if (response && response.success) {
        const customRoles = (response.data || []).map((role: any) => ({ ...role, isSystem: false }));
        setRoles([...STANDARD_ROLES, ...customRoles]);
        setError(null);
      } else if (response && !response.success) {
        setError(response.message || "Failed to fetch roles");
      } else {
        // Response might be direct array or different structure
        if (Array.isArray(response)) {
          setRoles([...STANDARD_ROLES, ...response.map((role: any) => ({ ...role, isSystem: false }))]);
        } else {
          setError("Unexpected response format from server");
        }
      }
    } catch (err) {
      console.error("Error fetching roles:", err);
      setError(err.message || "Failed to fetch roles");
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  }, []);

  // Fetch roles on component mount (only once)
  useEffect(() => {
    if (!hasFetchedRef.current) {
      hasFetchedRef.current = true;
      // Don't show loading spinner on initial load - fetch in background
      fetchRoles(false);
    }
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (openMenuId) {
        const button = buttonRefs.current[openMenuId];
        const menu = document.querySelector('[data-role-menu]');

        if (
          button &&
          !button.contains(event.target) &&
          menu &&
          !menu.contains(event.target)
        ) {
          setOpenMenuId(null);
        }
      }
    };

    if (openMenuId) {
      // Use a slight delay to avoid closing immediately when opening
      setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside);
      }, 0);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openMenuId]);

  // Handle view role
  const handleView = (roleId) => {
    setOpenMenuId(null);
    navigate(`/settings/roles/edit/${roleId}`);
  };

  // Handle clone role (save directly to DB, then open cloned role in edit mode)
  const handleClone = async (roleId) => {
    try {
      setOpenMenuId(null);
      setError(null);

      const response = await rolesAPI.getById(roleId);
      if (!response?.success || !response?.data) {
        setError(response?.message || "Failed to fetch role for cloning");
        return;
      }

      const roleToClone = response.data;
      const buildPayload = (name) => ({
        name,
        description: roleToClone.description || "",
        isAccountantRole: !!roleToClone.isAccountantRole,
        contacts: roleToClone.contacts || {},
        items: roleToClone.items || {},
        banking: roleToClone.banking || {},
        sales: roleToClone.sales || {},
        purchases: roleToClone.purchases || {},
        accountant: roleToClone.accountant || {},
        timesheets: roleToClone.timesheets || {},
        locations: roleToClone.locations || {},
        vatFiling: roleToClone.vatFiling || {},
        documents: roleToClone.documents || {},
        settings: roleToClone.settings || {},
        dashboard: roleToClone.dashboard || {},
        reports: roleToClone.reports || {},
      });

      let cloneResponse: any = null;
      let cloneNameBase = `${roleToClone.name} (Copy)`;
      for (let attempt = 0; attempt < 20; attempt += 1) {
        const candidateName = attempt === 0 ? cloneNameBase : `${cloneNameBase} ${attempt + 1}`;
        try {
          cloneResponse = await rolesAPI.create(buildPayload(candidateName));
          if (cloneResponse?.success) {
            break;
          }
        } catch (createError: any) {
          const message = String(createError?.message || "").toLowerCase();
          const isDuplicate = message.includes("already exists");
          if (!isDuplicate) {
            throw createError;
          }
        }
      }

      if (!cloneResponse?.success || !cloneResponse?.data) {
        setError(cloneResponse?.message || "Failed to clone role");
        return;
      }

      await fetchRoles(false);
      const clonedId = cloneResponse.data?._id || cloneResponse.data?.id;
      if (clonedId) {
        navigate(`/settings/roles/edit/${clonedId}`);
      }
    } catch (err) {
      console.error("Error cloning role:", err);
      setError(err.message || "Failed to clone role");
    }
  };

  // Handle delete role
  const handleDelete = async (roleId) => {
    if (!canManageRoles) {
      setError("Only Admin users can delete roles.");
      return;
    }

    setOpenMenuId(null);

    if (!window.confirm("Are you sure you want to delete this role?")) {
      return;
    }

    try {
      setDeletingId(roleId);
      setError(null);

      const response = await rolesAPI.delete(roleId);

      if (response.success) {
        // Refresh roles list
        await fetchRoles();
      } else {
        setError(response.message || "Failed to delete role");
      }
    } catch (err) {
      console.error("Error deleting role:", err);
      setError(err.message || "Failed to delete role");
    } finally {
      setDeletingId(null);
    }
  };

  const toggleMenu = (roleId, event) => {
    if (openMenuId === roleId) {
      setOpenMenuId(null);
    } else {
      const button = event.currentTarget;
      const rect = button.getBoundingClientRect();
      setMenuPosition({
        top: rect.bottom + 4,
        right: window.innerWidth - rect.right,
      });
      setOpenMenuId(roleId);
    }
  };


  return (
    <div className="p-6 w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Roles</h1>
        <button
          onClick={() => canManageRoles && navigate("/settings/roles/new")}
          disabled={!canManageRoles}
          className="px-4 py-2 bg-[#156372] text-white text-sm font-medium rounded-lg hover:bg-[#0f4e5a] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          New Role
        </button>
      </div>
      {!canManageRoles && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm">
          Only Admin users can create, edit, or delete roles.
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="animate-spin h-8 w-8 text-gray-400" />
        </div>
      ) : (
        /* Table */
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    ROLE NAME
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    DESCRIPTION
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider w-12">

                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {roles.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-8 text-center text-sm text-gray-500">
                      No roles found. Create a new role to get started.
                    </td>
                  </tr>
                ) : (
                  roles.map((role) => {
                    const roleId = role._id || role.id;
                    const isSystemRole = Boolean(role.isSystem);
                    const isMenuOpen = openMenuId === roleId;
                    const isDeleting = deletingId === roleId;

                    return (
                      <tr key={roleId} className="hover:bg-gray-50 group relative">
                        <td className="px-6 py-4 whitespace-nowrap">
                          {isSystemRole ? (
                            <div className="inline-flex items-center gap-2 text-sm font-medium text-gray-900">
                              <span>{role.name}</span>
                              <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] uppercase">Default</span>
                            </div>
                          ) : (
                            <button
                              onClick={() => navigate(`/settings/roles/edit/${roleId}`)}
                              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                            >
                              {role.name}
                            </button>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-gray-700">{role.description || "No description"}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right relative">
                          <div className="relative inline-block">
                            {!isSystemRole && canManageRoles && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleMenu(roleId, e);
                                }}
                                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-gray-200 text-gray-600 hover:text-gray-900"
                                ref={(el) => {
                                  if (el) buttonRefs.current[roleId] = el;
                                }}
                              >
                                <MoreVertical size={20} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Dropdown Menu Portal */}
      {openMenuId && roles.find((r) => (r._id || r.id) === openMenuId) && (
        createPortal(
          <div
            data-role-menu
            className="fixed w-48 bg-white rounded-lg shadow-xl border border-gray-200 z-[9999]"
            style={{
              top: `${menuPosition.top}px`,
              right: `${menuPosition.right}px`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => handleView(openMenuId)}
              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-blue-600 hover:text-white flex items-center gap-2 rounded-t-lg transition-colors"
            >
              <Eye size={16} />
              <span>Edit</span>
            </button>
            <button
              onClick={() => handleClone(openMenuId)}
              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-blue-600 hover:text-white flex items-center gap-2 transition-colors"
              disabled={deletingId === openMenuId}
            >
              <Copy size={16} />
              <span>Clone</span>
            </button>
            <button
              onClick={() => handleDelete(openMenuId)}
              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-red-600 hover:text-white flex items-center gap-2 rounded-b-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={deletingId === openMenuId}
            >
              {deletingId === openMenuId ? (
                <Loader2 className="animate-spin" size={16} />
              ) : (
                <Trash2 size={16} />
              )}
              <span>Delete</span>
            </button>
          </div>,
          document.body
        )
      )}
    </div>
  );
}







