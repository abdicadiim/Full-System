import React, { useState, useEffect, useRef } from "react";
import { Plus, ExternalLink, ChevronDown } from "lucide-react";
import NewWebTabModal from "./NewWebTabModal";
import { getToken, API_BASE_URL } from "../../services/auth";

export default function WebTabsPage() {
  const [showNewModal, setShowNewModal] = useState(false);
  const [webTabs, setWebTabs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredRowId, setHoveredRowId] = useState<string | null>(null);
  const [openMenuRowId, setOpenMenuRowId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Fetch web tabs from API
  const fetchWebTabs = async () => {
    try {
      const token = getToken();
      if (!token) {
        console.error('No authentication token found');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/settings/web-tabs`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setWebTabs(data.data || []);
      } else {
        console.error('Failed to fetch web tabs');
      }
    } catch (error) {
      console.error('Error fetching web tabs:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch web tabs on component mount
  useEffect(() => {
    fetchWebTabs();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (target.closest("[data-menu-trigger='true']")) {
        return;
      }
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenuRowId(null);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpenMenuRowId(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const handleOpenMenu = (rowId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    setOpenMenuRowId((prev) => (prev === rowId ? null : rowId));
  };

  const handleMarkInactive = async (tab: any) => {
    try {
      const token = getToken();
      if (!token) {
        alert("Authentication required");
        return;
      }

      const response = await fetch(`${API_BASE_URL}/settings/web-tabs/${tab._id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        alert(errorData.message || "Failed to mark tab as inactive");
        return;
      }

      setWebTabs((prev) => prev.filter((item) => item._id !== tab._id));
      setOpenMenuRowId(null);
    } catch (error) {
      console.error("Error marking web tab inactive:", error);
      alert("Failed to mark tab as inactive");
    }
  };

  const handleDelete = async (tab: any) => {
    const confirmed = window.confirm("Delete this web tab?");
    if (!confirmed) return;
    await handleMarkInactive(tab);
  };

  const handleAccessWebTab = (url: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
    setOpenMenuRowId(null);
  };

  const handleEdit = () => {
    alert("Edit action will be added in the next update.");
    setOpenMenuRowId(null);
  };

  const handleSaveWebTab = async (tabData: any) => {
    try {
      const token = getToken();
      if (!token) {
        alert('Authentication required');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/settings/web-tabs`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(tabData),
      });

      if (response.ok) {
        const newTab = await response.json();
        setWebTabs([...webTabs, newTab.data]);
        setShowNewModal(false);
      } else {
        const errorData = await response.json();
        alert(errorData.message || 'Failed to create web tab');
      }
    } catch (error) {
      console.error('Error creating web tab:', error);
      alert('Failed to create web tab');
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#f8f9fb] font-sans">
      <div className="m-4 md:m-6 bg-white border border-[#eaedf3] rounded-sm overflow-visible shadow-sm">
        {/* Header Section */}
        <div className="px-4 md:px-6 py-4 flex items-center justify-between border-b border-[#eff2f7]">
          <h1 className="text-[17px] font-semibold text-[#1a202c]">Web Tabs</h1>
          <button
            onClick={() => setShowNewModal(true)}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 flex items-center gap-2 transition-colors shadow-sm active:scale-95"
          >
            <Plus size={16} />
            New Web Tab
          </button>
        </div>

        {/* Content Section */}
        <div className="p-4 md:p-6">
          {loading ? (
            <div className="bg-white rounded-lg border border-gray-100 p-16 text-center shadow-sm">
              <div className="text-[14px] text-gray-400">Loading web tabs...</div>
            </div>
          ) : webTabs.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-100 p-16 text-center shadow-sm">
              <p className="text-[14px] text-gray-500 mb-6">You haven't created any web tabs yet.</p>
              <button
                onClick={() => setShowNewModal(true)}
                className="px-6 py-3 text-sm font-bold text-white bg-red-600 rounded-lg hover:bg-red-700 mb-6 transition-all shadow-md active:scale-95"
              >
                CREATE WEB TAB
              </button>
              <p className="text-[13px] text-gray-400">
                Learn more about <a href="#" className="text-blue-600 hover:underline font-medium">Web Tabs</a>
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-[#eff2f7] overflow-visible">
              <table className="w-full text-left">
                <thead className="bg-[#fcfdff] border-b border-[#eff2f7]">
                  <tr>
                    <th className="px-6 py-4 text-[11px] font-bold text-[#718096] uppercase tracking-wider">NAME</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-[#718096] uppercase tracking-wider">URL</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-[#718096] uppercase tracking-wider">LAST UPDATED</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-[#718096] uppercase tracking-wider">STATUS</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-[#718096] uppercase tracking-wider w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#eff2f7]">
                  {webTabs.map((tab, index) => (
                    <tr
                      key={tab._id || index}
                      className="hover:bg-[#f8f9fb] transition-colors group"
                      onMouseEnter={() => setHoveredRowId(tab._id || String(index))}
                      onMouseLeave={() => setHoveredRowId(null)}
                    >
                      <td className="px-6 py-4">
                        <span className="text-[14px] font-medium text-[#1a202c]">{tab.name}</span>
                      </td>
                      <td className="px-6 py-4">
                        <a href={tab.url} target="_blank" rel="noopener noreferrer" className="text-[14px] text-blue-600 hover:text-blue-700 flex items-center gap-1.5 font-medium transition-colors">
                          {tab.url}
                          <ExternalLink size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                        </a>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-[14px] text-[#4a5568]">{new Date(tab.lastUpdated).toLocaleDateString()}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-[13px] px-2.5 py-1 bg-green-50 text-green-600 rounded-full font-medium border border-green-100">
                          {tab.status || 'Active'}
                        </span>
                      </td>
                      <td className="px-6 py-4 relative">
                        <button
                          type="button"
                          onClick={(e) => handleOpenMenu(tab._id || String(index), e)}
                          data-menu-trigger="true"
                          className={`w-5 h-5 rounded-full bg-[#3b82f6] text-white flex items-center justify-center shadow-sm transition-opacity ${
                            hoveredRowId === (tab._id || String(index)) || openMenuRowId === (tab._id || String(index))
                              ? "opacity-100"
                              : "opacity-0 group-hover:opacity-100"
                          }`}
                          aria-label="Open web tab actions"
                        >
                          <ChevronDown size={12} />
                        </button>

                        {openMenuRowId === (tab._id || String(index)) && (
                          <div
                            ref={menuRef}
                            className="absolute right-6 top-10 w-44 bg-white border border-[#e5e7eb] rounded-lg shadow-xl z-50 py-2"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              onClick={handleEdit}
                              className="w-full text-left px-4 py-2 text-[14px] text-[#111827] hover:bg-[#3b82f6] hover:text-white transition-colors"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMarkInactive(tab)}
                              className="w-full text-left px-4 py-2 text-[14px] text-[#4b5563] hover:bg-[#f3f4f6] transition-colors"
                            >
                              Mark as Inactive
                            </button>
                            <button
                              type="button"
                              onClick={() => handleAccessWebTab(tab.url)}
                              className="w-full text-left px-4 py-2 text-[14px] text-[#4b5563] hover:bg-[#f3f4f6] transition-colors"
                            >
                              Access Web Tab
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(tab)}
                              className="w-full text-left px-4 py-2 text-[14px] text-[#4b5563] hover:bg-[#f3f4f6] transition-colors"
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* New Web Tab Modal */}
      {showNewModal && (
        <NewWebTabModal
          onClose={() => setShowNewModal(false)}
          onSave={handleSaveWebTab}
        />
      )}
    </div>
  );
}

