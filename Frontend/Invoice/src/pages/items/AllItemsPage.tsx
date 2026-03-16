import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, Plus, MoreVertical, Search, Filter, ArrowUpDown, Bell, X, Check, Settings, LogOut, User } from "lucide-react";

const ITEMS_KEY = "inv_items_v1";

interface Item {
  id: string;
  name: string;
  purchaseDescription?: string;
  salesDescription?: string;
  costPrice?: number;
  sellingPrice?: number;
  currency?: string;
  unit?: string;
}


const hasLS = () => typeof window !== "undefined" && !!window.localStorage;
const getLS = (k: string) => (hasLS() ? window.localStorage.getItem(k) : null);

export default function AllItemsPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<Item[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  // Dropdown states
  const [filterDropdownOpen, setFilterDropdownOpen] = useState(false);
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);
  const [moreDropdownOpen, setMoreDropdownOpen] = useState(false);
  const [notificationDropdownOpen, setNotificationDropdownOpen] = useState(false);

  // Refs for dropdown containers
  const filterDropdownRef = useRef(null);
  const sortDropdownRef = useRef(null);
  const moreDropdownRef = useRef(null);
  const notificationDropdownRef = useRef(null);

  useEffect(() => {
    const raw = getLS(ITEMS_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      setItems(Array.isArray(parsed) ? parsed : []);
    } catch {
      // ignore
    }
  }, []);

  // Handle click outside for dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (filterDropdownRef.current && !(filterDropdownRef.current as HTMLElement).contains(target)) {
        setFilterDropdownOpen(false);
      }
      if (sortDropdownRef.current && !(sortDropdownRef.current as HTMLElement).contains(target)) {
        setSortDropdownOpen(false);
      }
      if (moreDropdownRef.current && !(moreDropdownRef.current as HTMLElement).contains(target)) {
        setMoreDropdownOpen(false);
      }
      if (notificationDropdownRef.current && !(notificationDropdownRef.current as HTMLElement).contains(target)) {
        setNotificationDropdownOpen(false);
      }
    };

    if (filterDropdownOpen || sortDropdownOpen || moreDropdownOpen || notificationDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [filterDropdownOpen, sortDropdownOpen, moreDropdownOpen, notificationDropdownOpen]);

  const filteredItems = items.filter((item) =>
    item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.purchaseDescription?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.salesDescription?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatCurrency = (amount: number | string, currency = "AWG") => {
    return `${currency}${parseFloat(String(amount || 0)).toFixed(2)}`;
  };

  return (
    <div className="w-full bg-white h-full m-0 p-0 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-white shrink-0">
        <div className="flex items-center gap-2">
          <h1 className="text-base font-semibold text-gray-900 m-0 leading-6">
            All Items
          </h1>
          <ChevronDown
            size={16}
            className="text-blue-600 cursor-pointer ml-1"
          />
        </div>
        <div className="flex items-center gap-2">
          <div className="relative" ref={notificationDropdownRef}>
            <button
              className="p-1.5 bg-white border border-gray-300 rounded-md cursor-pointer flex items-center justify-center h-8 w-8 hover:bg-gray-50 relative"
              onClick={() => setNotificationDropdownOpen(!notificationDropdownOpen)}
            >
              <Bell size={16} className="text-gray-500" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>
            {notificationDropdownOpen && (
              <div className="absolute top-full right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 w-80">
                <div className="p-4 border-b border-gray-200">
                  <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  <div className="p-4 text-center text-gray-500 text-sm">
                    No new notifications
                  </div>
                </div>
                <div className="p-3 border-t border-gray-200">
                  <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                    View all notifications
                  </button>
                </div>
              </div>
            )}
          </div>
          <button
            onClick={() => navigate("/products/items/new")}
            className="px-3 py-1.5 text-sm font-medium text-white border-none rounded-md cursor-pointer flex items-center gap-1.5 h-8 shadow-sm"
            style={{ background: "linear-gradient(90deg, #156372 0%, #0D4A52 100%)" }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = "0.9"}
            onMouseLeave={(e) => e.currentTarget.style.opacity = "1"}
          >
            <Plus size={16} strokeWidth={2.5} />
            New
          </button>
          <div className="relative" ref={moreDropdownRef}>
            <button
              className="p-1.5 bg-white border border-gray-300 rounded-md cursor-pointer flex items-center justify-center h-8 w-8 hover:bg-gray-50"
              onClick={() => setMoreDropdownOpen(!moreDropdownOpen)}
            >
              <MoreVertical size={16} className="text-gray-500" />
            </button>
            {moreDropdownOpen && (
              <div className="absolute top-full right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 w-48">
                <div className="py-1">
                  <button className="w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left flex items-center gap-2">
                    <Settings size={16} />
                    Settings
                  </button>
                  <button className="w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left flex items-center gap-2">
                    <User size={16} />
                    Profile
                  </button>
                  <hr className="my-1 border-gray-200" />
                  <button className="w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left flex items-center gap-2">
                    <LogOut size={16} />
                    Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Table Header */}
      <div className="px-6 py-3 border-b border-gray-200 flex items-center justify-between shrink-0 bg-white z-10">
        <div className="flex items-center gap-6 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-500 uppercase">
              NAME
            </span>
            <div className="relative" ref={filterDropdownRef}>
              <button
                className="text-gray-400 cursor-pointer hover:text-gray-600"
                onClick={() => setFilterDropdownOpen(!filterDropdownOpen)}
              >
                <Filter size={14} />
              </button>
              {filterDropdownOpen && (
                <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 w-64">
                  <div className="p-4">
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">Filter by Name</h3>
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs font-medium text-gray-700 block mb-1">Contains</label>
                        <input
                          type="text"
                          placeholder="Enter text..."
                          className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <button
                          className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
                          onClick={() => setFilterDropdownOpen(false)}
                        >
                          Cancel
                        </button>
                        <button className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700">
                          Apply
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="relative" ref={sortDropdownRef}>
              <button
                className="text-gray-400 cursor-pointer hover:text-gray-600"
                onClick={() => setSortDropdownOpen(!sortDropdownOpen)}
              >
                <ArrowUpDown size={14} />
              </button>
              {sortDropdownOpen && (
                <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 w-48">
                  <div className="py-1">
                    <button className="w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left">
                      Sort A to Z
                    </button>
                    <button className="w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left">
                      Sort Z to A
                    </button>
                    <hr className="my-1 border-gray-200" />
                    <button className="w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left">
                      Clear Sort
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="text-xs font-semibold text-gray-500 uppercase">
            PURCHASE DESCRIPTION
          </div>
          <div className="text-xs font-semibold text-gray-500 uppercase">
            PURCHASE RATE
          </div>
          <div className="text-xs font-semibold text-gray-500 uppercase">
            DESCRIPTION
          </div>
          <div className="text-xs font-semibold text-gray-500 uppercase">
            RATE
          </div>
          <div className="text-xs font-semibold text-gray-500 uppercase">
            USAGE UNIT
          </div>
        </div>
        <div className="relative">
          <Search
            size={16}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
          />
          <input
            type="text"
            placeholder="Search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pr-8 pl-3 py-1.5 border border-gray-300 rounded text-sm w-[200px] outline-none"
          />
        </div>
      </div>

      {/* Table Content */}
      <div className="px-6 flex-1 overflow-auto w-full custom-scrollbar">
        <table className="w-full border-collapse min-w-[800px]">
          <thead className="sticky top-0 z-20 bg-gray-50">
            <tr className="border-b border-gray-200">
              <th className="p-2 px-6 text-left w-10">
                <input type="checkbox" className="cursor-pointer" />
              </th>
              <th className="p-2 px-6 text-left text-xs font-semibold text-gray-500 uppercase">
                NAME
              </th>
              <th className="p-2 px-6 text-left text-xs font-semibold text-gray-500 uppercase">
                PURCHASE DESCRIPTION
              </th>
              <th className="p-2 px-6 text-left text-xs font-semibold text-gray-500 uppercase">
                PURCHASE RATE
              </th>
              <th className="p-2 px-6 text-left text-xs font-semibold text-gray-500 uppercase">
                DESCRIPTION
              </th>
              <th className="p-2 px-6 text-left text-xs font-semibold text-gray-500 uppercase">
                RATE
              </th>
              <th className="p-2 px-6 text-left text-xs font-semibold text-gray-500 uppercase">
                USAGE UNIT
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-6 text-center text-gray-500 text-sm">
                  No items found
                </td>
              </tr>
            ) : (
              filteredItems.map((item) => (
                <tr
                  key={item.id}
                  className="border-b border-gray-200 cursor-pointer hover:bg-gray-50"
                  onClick={() => navigate(`/items/${item.id}`)}
                >
                  <td className="p-3 px-6">
                    <input type="checkbox" className="cursor-pointer" />
                  </td>
                  <td className="p-3 px-6 text-sm text-blue-600 font-medium">
                    {item.name}
                  </td>
                  <td className="p-3 px-6 text-sm text-gray-900">
                    {item.purchaseDescription || ""}
                  </td>
                  <td className="p-3 px-6 text-sm text-gray-900">
                    {formatCurrency(item.costPrice || 0, item.currency || "AWG")}
                  </td>
                  <td className="p-3 px-6 text-sm text-gray-900">
                    {item.salesDescription || ""}
                  </td>
                  <td className="p-3 px-6 text-sm text-gray-900">
                    {formatCurrency(item.sellingPrice || 0, item.currency || "AWG")}
                  </td>
                  <td className="p-3 px-6 text-sm text-gray-900">
                    {item.unit || "pcs"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}


