import React, { useState, useMemo, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import {
  ChevronDown,
  Search,
  Filter,
  ArrowUpDown,
  Plus,
  RefreshCw,
  Columns,
  MoreHorizontal,
  Download,
  Upload,
  ImageIcon,
  X,
  Star,
  ChevronRight,
  FileDown,
  SlidersHorizontal,
  AlignLeft,
  Layout,
  GripVertical,
  Lock,
  Settings,
  RotateCcw
} from "lucide-react";
import ExportItemsModal from "./components/modals/ExportItemsModal";
import ExportCurrentViewModal from "./components/modals/ExportCurrentViewModal";
import AdvancedSearchModal from "../../../components/modals/AdvancedSearchModal";
import { useCurrency } from "../../../hooks/useCurrency";
import { useOrganizationBranding } from "../../../hooks/useOrganizationBranding";

const TableRowSkeleton = ({ columns }: { columns: any[] }) => (
  <>
    {[...Array(8)].map((_, i) => (
      <tr key={i} className="animate-pulse border-b border-[#eef1f6] h-[50px]">
        <td className="px-4 py-3 w-16">
          <div className="h-4 w-4 bg-gray-100 rounded mx-auto" />
        </td>
        {columns.map((col, idx) => (
          <td
            key={idx}
            className="px-4 py-3"
            style={{ width: col.width }}
          >
            <div className={`h-4 bg-gray-100 rounded ${idx === 0 ? 'w-3/4' : 'w-1/2'}`} />
          </td>
        ))}
        <td className="px-4 py-3 w-12 sticky right-0 bg-white/95 backdrop-blur-sm" />
      </tr>
    ))}
  </>
);

const ItemsList = ({
  items,
  onSelect,
  onNew,
  onBulkMarkActive,
  onBulkMarkInactive,
  onBulkDelete,
  onBulkUpdate,
  onRefresh,
  baseCurrency,
  isLoading,
  canCreate = true,
  canEdit = true,
  canDelete = true
}: any) => {
  const COLUMNS_STORAGE_KEY = "taban_items_columns_v4";
  const navigate = useNavigate();
  const { symbol: currencySymbol } = useCurrency();
  const { accentColor } = useOrganizationBranding();

  const fmtMoney = (amount: number) => {
    const val = typeof amount === "number" ? amount : Number(amount || 0);
    return `${currencySymbol || 'AED'}${val.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("Active Items");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [newTransactionOpen, setNewTransactionOpen] = useState(false);
  const [moreDropdownOpen, setMoreDropdownOpen] = useState(false);
  const [sortSubMenuOpen, setSortSubMenuOpen] = useState(false);
  const [exportSubMenuOpen, setExportSubMenuOpen] = useState(false);
  const [filterDropdownOpen, setFilterDropdownOpen] = useState(false);
  const [filterSearch, setFilterSearch] = useState("");
  const [sortKey, setSortKey] = useState("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const filterDropdownRef = useRef<HTMLDivElement>(null);
  const moreDropdownRef = useRef<HTMLDivElement>(null);

  const [isAdvancedSearchOpen, setIsAdvancedSearchOpen] = useState(false);
  const [settingsDropdownOpen, setSettingsDropdownOpen] = useState(false);
  const [isCustomizeModalOpen, setIsCustomizeModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isExportCurrentViewModalOpen, setIsExportCurrentViewModalOpen] = useState(false);
  const [isBulkActiveLoading, setIsBulkActiveLoading] = useState(false);
  const [isBulkInactiveLoading, setIsBulkInactiveLoading] = useState(false);
  const [isBulkDeleteLoading, setIsBulkDeleteLoading] = useState(false);

  interface Column {
    key: string;
    label: string;
    visible: boolean;
    width: number;
  }

  const DEFAULT_COLUMNS: Column[] = [
    { key: "name", label: "NAME", visible: true, width: 260 },
    { key: "sku", label: "SKU", visible: true, width: 140 },
    { key: "description", label: "DESCRIPTION", visible: true, width: 360 },
    { key: "rate", label: "RATE", visible: true, width: 140 },
    { key: "unit", label: "USAGE UNIT", visible: true, width: 140 },
    { key: "accountName", label: "ACCOUNT NAME", visible: false, width: 180 },
    { key: "type", label: "TYPE", visible: false, width: 110 },
  ];

  const [columns, setColumns] = useState<Column[]>(() => {
    const saved = localStorage.getItem(COLUMNS_STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return DEFAULT_COLUMNS.map(def => {
          const found = parsed.find((p: any) => p.key === def.key);
          return found ? { ...def, ...found } : def;
        });
      } catch (e) {
        return DEFAULT_COLUMNS;
      }
    }
    return DEFAULT_COLUMNS;
  });

  useEffect(() => {
    localStorage.setItem(COLUMNS_STORAGE_KEY, JSON.stringify(columns));
  }, [columns]);

  const dbAccounts: any[] = [];
  const dbTaxes: any[] = [];
  const dbVendors: any[] = [];
  const settingsDropdownRef = useRef<HTMLDivElement>(null);
  const resizingRef = useRef<{ col: string; startX: number; startWidth: number } | null>(null);

  const visibleColumns = useMemo(() => columns.filter(c => c.visible), [columns]);

  const handleToggleColumn = (key: string) => {
    setColumns(prev => prev.map(c => c.key === key ? { ...c, visible: !c.visible } : c));
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setNewTransactionOpen(false);
      }
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(e.target as Node)) {
        setFilterDropdownOpen(false);
      }
      if (moreDropdownRef.current && !moreDropdownRef.current.contains(e.target as Node)) {
        setMoreDropdownOpen(false);
        setExportSubMenuOpen(false);
        setSortSubMenuOpen(false);
      }
      if (settingsDropdownRef.current && !settingsDropdownRef.current.contains(e.target as Node)) {
        setSettingsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleMouseUp = () => {
    resizingRef.current = null;
    document.body.style.cursor = 'default';
    document.body.style.userSelect = 'auto';
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!resizingRef.current) return;
      const { col, startX, startWidth } = resizingRef.current;
      const delta = e.clientX - startX;
      setColumnWidth(col, Math.max(80, startWidth + delta));
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  const startResizing = (key: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const col = columns.find(c => c.key === key);
    if (!col) return;
    resizingRef.current = {
      col: key,
      startX: e.clientX,
      startWidth: col.width
    };
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  const setColumnWidth = (key: string, width: number) => {
    setColumns(prev => prev.map(c => c.key === key ? { ...c, width } : c));
  };

  const filteredItems = useMemo(() => {
    let result = [...items];
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(item =>
        (item.name || "").toLowerCase().includes(term) ||
        (item.sku || "").toLowerCase().includes(term)
      );
    }

    switch (filterType) {
      case "All":
        break;
      case "Active Items":
      case "Active":
        result = result.filter(item => item.active !== false && item.status !== "Inactive" && (item.active === undefined || item.active === true));
        break;
      case "Inactive Items":
      case "Inactive":
        result = result.filter(item => item.active === false || item.status === "Inactive");
        break;
      case "Low Stock":
        result = result.filter(item => item.trackInventory && (parseFloat(item.stockOnHand || item.stockQuantity || 0) <= parseFloat(item.reorderPoint || 0)));
        break;
      case "Sales":
        result = result.filter(item => item.sellable);
        break;
      case "Purchases":
        result = result.filter(item => item.purchasable);
        break;
      case "Services":
        result = result.filter(item => item.type === "Service");
        break;
      case "Inventory Items":
        result = result.filter(item => item.trackInventory);
        break;
      default:
        break;
    }

    result.sort((a, b) => {
      let valA = a[sortKey] || "";
      let valB = b[sortKey] || "";
      if (typeof valA === "string") valA = valA.toLowerCase();
      if (typeof valB === "string") valB = valB.toLowerCase();

      if (valA < valB) return sortOrder === "asc" ? -1 : 1;
      if (valA > valB) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    return result;
  }, [items, searchTerm, filterType, sortKey, sortOrder]);

  const getActiveSortColumn = () => {
    if (sortKey === "sellingPrice") return "rate";
    return sortKey;
  };

  const isSortableColumn = (key: string) => ["name", "sku", "rate"].includes(key);

  const getListDescription = (item: any) => {
    const value = item?.salesDescription ?? item?.description;
    if (value === null || value === undefined || String(value).trim() === "") return "-";
    return String(value);
  };

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortOrder("asc");
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredItems.length && filteredItems.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredItems.map(item => item.id || item._id));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  return (
    <div className="flex flex-col h-full bg-white relative overflow-hidden">
      {/* Header - Match Subscriptions list page */}
      {selectedIds.length > 0 ? (
        <div className="flex items-center justify-between px-6 py-6 border-b border-gray-100 bg-white relative overflow-visible z-[100]">
          <div className="flex min-w-0 flex-1 items-center gap-3 pl-4 pr-2 overflow-visible">
            <div className="flex min-w-0 flex-wrap items-center gap-2 sm:gap-3">
              {canEdit && (
                <button
                  type="button"
                  onClick={() => onBulkUpdate(selectedIds)}
                  className="h-9 px-3 rounded-md border border-gray-200 bg-white text-sm text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
                  title="Bulk Update"
                >
                  Bulk Update
                </button>
              )}

              {canCreate && (
                <div className="relative flex-shrink-0" ref={dropdownRef}>
                  <button
                    type="button"
                    onClick={() => setNewTransactionOpen(!newTransactionOpen)}
                    className="h-9 px-3 rounded-md border border-gray-200 bg-white text-sm text-gray-700 hover:bg-gray-50 transition-colors shadow-sm flex items-center gap-2"
                  >
                    <span className="hidden sm:inline">New Transaction</span>
                    <span className="sm:hidden">New</span>
                    <ChevronDown size={14} className="text-gray-500" />
                  </button>

                  {newTransactionOpen && (
                    <div className="absolute top-full left-0 mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-2xl z-[200] py-1 overflow-hidden">
                      <button
                        type="button"
                        onClick={() => {
                          navigate("/sales/quotes/new");
                          setNewTransactionOpen(false);
                        }}
                        className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-slate-50 hover:text-slate-900 transition-colors font-medium border-b border-gray-50 last:border-0"
                      >
                        Quote
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          navigate("/sales/invoices/new");
                          setNewTransactionOpen(false);
                        }}
                        className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-slate-50 hover:text-slate-900 transition-colors font-medium border-b border-gray-50 last:border-0"
                      >
                        Invoice
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          navigate("/sales/sales-receipts/new");
                          setNewTransactionOpen(false);
                        }}
                        className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-slate-50 hover:text-slate-900 transition-colors font-medium last:border-0"
                      >
                        Sales Receipt
                      </button>
                    </div>
                  )}
                </div>
              )}

              {canEdit && (
                <button
                  type="button"
                  onClick={async () => {
                    setIsBulkActiveLoading(true);
                    try {
                      await onBulkMarkActive(selectedIds);
                    } finally {
                      setIsBulkActiveLoading(false);
                    }
                  }}
                  disabled={isBulkActiveLoading}
                  className="h-9 px-3 rounded-md border border-gray-200 bg-white text-sm text-gray-700 hover:bg-gray-50 transition-colors shadow-sm flex items-center gap-2 disabled:opacity-60"
                  title="Mark as Active"
                >
                  {isBulkActiveLoading && <RefreshCw size={14} className="animate-spin" />}
                  Mark as Active
                </button>
              )}

              {canEdit && (
                <button
                  type="button"
                  onClick={async () => {
                    setIsBulkInactiveLoading(true);
                    try {
                      await onBulkMarkInactive(selectedIds);
                    } finally {
                      setIsBulkInactiveLoading(false);
                    }
                  }}
                  disabled={isBulkInactiveLoading}
                  className="h-9 px-3 rounded-md border border-gray-200 bg-white text-sm text-gray-700 hover:bg-gray-50 transition-colors shadow-sm flex items-center gap-2 disabled:opacity-60"
                  title="Mark as Inactive"
                >
                  {isBulkInactiveLoading && <RefreshCw size={14} className="animate-spin" />}
                  Mark as Inactive
                </button>
              )}

              {canDelete && (
                <button
                  type="button"
                  onClick={async () => {
                    setIsBulkDeleteLoading(true);
                    try {
                      await onBulkDelete(selectedIds);
                      setSelectedIds([]);
                    } finally {
                      setIsBulkDeleteLoading(false);
                    }
                  }}
                  disabled={isBulkDeleteLoading}
                  className="h-9 px-3 rounded-md border border-gray-200 bg-white text-sm text-gray-700 hover:bg-gray-50 transition-colors shadow-sm flex items-center gap-2 disabled:opacity-60"
                >
                  {isBulkDeleteLoading && <RefreshCw size={14} className="animate-spin" />}
                  Delete
                </button>
              )}
            </div>

            <div className="h-6 w-px bg-gray-200 mx-1 flex-shrink-0" />

            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="flex items-center justify-center min-w-[28px] h-7 px-2 bg-[#156372] rounded-full text-[13px] font-semibold text-white">
                {selectedIds.length}
              </span>
              <span className="text-sm text-gray-700">Selected</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setSelectedIds([])}
            className="flex items-center gap-1 px-3 py-2 text-sm text-gray-700 hover:text-gray-900"
            aria-label="Clear selection"
          >
            <span className="text-gray-500">Esc</span>
            <X size={16} className="text-red-500" />
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between px-6 py-6 border-b border-gray-100 bg-white relative overflow-visible">
          <div className="flex items-center gap-6 pl-4">
            <div className="relative" ref={filterDropdownRef}>
              <div
                className="flex items-center gap-1.5 py-4 cursor-pointer group border-b-2 border-slate-900 -mb-[px]"
                onClick={() => setFilterDropdownOpen(!filterDropdownOpen)}
              >
                <h1 className="text-[15px] font-bold text-slate-900 transition-colors">
                  {filterType === "All" ? "All Items" : filterType === "Active Items" ? "Active Items" : filterType}
                </h1>
                <ChevronDown size={14} className={`transition-transform duration-200 ${filterDropdownOpen ? 'rotate-180' : ''}`} style={{ color: accentColor }} />
              </div>

              {filterDropdownOpen && (
                <div className="absolute top-full left-0 mt-1 w-72 bg-white border border-gray-200 rounded-lg shadow-2xl z-[100] py-2 animate-in fade-in zoom-in-95 duration-200">
                  <div className="px-3 pb-2 border-b border-gray-100">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-md border border-gray-200 focus-within:border-teal-400 focus-within:ring-1 focus-within:ring-teal-100 transition-all">
                      <Search size={14} className="text-gray-400" />
                      <input
                        autoFocus
                        placeholder="Search Views"
                        className="bg-transparent border-none outline-none text-sm w-full"
                        value={filterSearch}
                        onChange={(e) => setFilterSearch(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="max-h-80 overflow-y-auto py-1">
                    {[
                      "All", "Active", "Low Stock", "Inactive", "Sales", "Purchases", "Services", "Taban CRM", "Inventory Items"
                    ].filter(v => v.toLowerCase().includes(filterSearch.toLowerCase())).map(view => (
                      <button
                        key={view}
                        onClick={() => { setFilterType(view === "Active" ? "Active Items" : view === "Inactive" ? "Inactive Items" : view); setFilterDropdownOpen(false); }}
                        className="flex items-center justify-between px-4 py-2 hover:bg-teal-50 cursor-pointer group/item transition-colors w-full"
                      >
                        <span className={`text-sm ${filterType.includes(view) ? 'text-teal-700 font-medium' : 'text-gray-700'}`}>{view}</span>
                        <Star size={14} className="text-gray-300 hover:text-yellow-400 transition-colors" />
                      </button>))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 sm:gap-2 mr-4">
            {canCreate && (
              <button
                onClick={onNew}
                className="cursor-pointer transition-all text-white px-3 sm:px-4 py-1.5 rounded-lg border-[#0D4A52] border-b-[4px] hover:brightness-110 hover:-translate-y-[1px] hover:border-b-[6px] active:border-b-[2px] active:brightness-90 active:translate-y-[2px] flex items-center gap-1 text-sm font-semibold"
                style={{ background: 'linear-gradient(90deg, #156372 0%, #0D4A52 100%)' }}
              >
                <Plus size={16} strokeWidth={3} /> <span className="hidden sm:inline">New</span>
              </button>
            )}

            <div className="relative" ref={moreDropdownRef}>
              <button
                onClick={() => setMoreDropdownOpen(!moreDropdownOpen)}
                className="p-1.5 border border-gray-200 rounded hover:bg-gray-50 transition-colors bg-white shadow-sm"
              >
                <MoreHorizontal size={18} className="text-gray-500" />
              </button>

              {moreDropdownOpen && (
                <div className="absolute top-full right-0 mt-2 w-60 bg-white border border-gray-100 rounded-lg shadow-xl z-[110] py-2 animate-in fade-in slide-in-from-top-1 duration-200">
                  {/* Sort by */}
                  <div className="relative">
                    <button
                      onClick={() => { setSortSubMenuOpen(!sortSubMenuOpen); setExportSubMenuOpen(false); }}
                      className={`w-full flex items-center justify-between px-3 py-2 text-sm transition-colors ${sortSubMenuOpen ? 'text-white rounded-md mx-2 w-[calc(100%-16px)] shadow-sm' : 'text-slate-600 hover:bg-[#1b5e6a] hover:text-white'}`}
                      style={sortSubMenuOpen ? { backgroundColor: '#1b5e6a' } : {}}
                    >
                      <div className="flex items-center gap-3">
                        <ArrowUpDown size={16} className={sortSubMenuOpen ? 'text-white' : ''} style={!sortSubMenuOpen ? { color: '#1b5e6a' } : {}} />
                        <span className="font-medium">Sort by</span>
                      </div>
                      <ChevronRight size={14} className={sortSubMenuOpen ? 'text-white' : 'text-slate-400'} />
                    </button>

                    {sortSubMenuOpen && (
                      <div className="md:absolute md:top-0 md:right-full md:mr-2 md:w-52 relative w-full bg-white md:border border-gray-100 rounded-lg md:shadow-xl py-2 z-[115] md:animate-in md:fade-in md:slide-in-from-right-1 duration-200">
                        {['Name', 'SKU', 'Rate', 'Last Modified Time', 'Created Time'].map((option) => {
                          const keyMap: any = { 'Name': 'name', 'SKU': 'sku', 'Rate': 'sellingPrice', 'Last Modified Time': 'updatedAt', 'Created Time': 'createdAt' };
                          const isActive = sortKey === keyMap[option];
                          return (
                            <button
                              key={option}
                              onClick={() => { setSortKey(keyMap[option]); setSortSubMenuOpen(false); }}
                              className={`w-full flex items-center justify-between px-4 py-2 text-sm transition-colors ${isActive ? 'bg-[#1b5e6a] text-white font-bold' : 'text-slate-600 hover:bg-teal-50/50'}`}
                            >
                              <span style={isActive ? { color: 'white', fontWeight: 'bold' } : {}}>{option}</span>
                              {isActive && <Plus size={14} className="rotate-45" style={{ color: 'white' }} />}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="h-px bg-gray-50 my-1 mx-2" />

                  {/* Import Items */}
                  <button
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-600 hover:bg-[#1b5e6a] hover:text-white transition-colors group"
                    onClick={() => { navigate('/products/items/import'); setMoreDropdownOpen(false); }}
                  >
                    <Upload size={16} className="text-teal-600 group-hover:text-white" />
                    <span className="font-medium">Import Items</span>
                  </button>

                  {/* Export */}
                  <div className="relative">
                    <button
                      onClick={() => { setExportSubMenuOpen(!exportSubMenuOpen); setSortSubMenuOpen(false); }}
                      className={`w-full flex items-center justify-between px-3 py-2 text-sm transition-colors ${exportSubMenuOpen ? 'text-white rounded-md mx-2 w-[calc(100%-16px)] shadow-sm' : 'text-slate-600 hover:bg-[#1b5e6a] hover:text-white'}`}
                      style={exportSubMenuOpen ? { backgroundColor: '#1b5e6a' } : {}}
                    >
                      <div className="flex items-center gap-3">
                        <Download size={16} className={exportSubMenuOpen ? 'text-white' : ''} style={!exportSubMenuOpen ? { color: '#1b5e6a' } : {}} />
                        <span className="font-medium">Export</span>
                      </div>
                      <ChevronRight size={14} className={exportSubMenuOpen ? 'text-white' : 'text-slate-400'} />
                    </button>

                    {exportSubMenuOpen && (
                      <div className="md:absolute md:top-0 md:right-full md:mr-2 md:w-52 relative w-full bg-white md:border border-gray-100 rounded-lg md:shadow-xl py-2 z-[115] md:animate-in md:fade-in md:slide-in-from-right-1 duration-200">
                        <button
                          className="w-full text-left px-4 py-2 text-sm text-slate-600 hover:bg-[#1b5e6a] hover:text-white font-medium transition-colors"
                          onClick={() => { setIsExportModalOpen(true); setExportSubMenuOpen(false); setMoreDropdownOpen(false); }}
                        >
                          Export Items
                        </button>
                        <button
                          className="w-full text-left px-4 py-2 text-sm text-slate-600 hover:bg-[#1b5e6a] hover:text-white font-medium transition-colors"
                          onClick={() => { setIsExportCurrentViewModalOpen(true); setExportSubMenuOpen(false); setMoreDropdownOpen(false); }}
                        >
                          Export Current View
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="h-px bg-gray-50 my-1 mx-2" />

                  {/* Preferences */}
                  <button
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-600 hover:bg-[#1b5e6a] hover:text-white transition-colors group"
                    onClick={() => navigate('/settings/items')}
                  >
                    <SlidersHorizontal size={16} className="text-teal-600 group-hover:text-white" />
                    <span className="font-medium">Preferences</span>
                  </button>

                  {/* Refresh List */}
                  <button
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-600 hover:bg-[#1b5e6a] hover:text-white transition-colors group"
                    onClick={() => { onRefresh(); setMoreDropdownOpen(false); }}
                  >
                    <RefreshCw size={16} className="text-teal-600 group-hover:text-white" />
                    <span className="font-medium">Refresh List</span>
                  </button>

                  {/* Reset Column Width */}
                  <button
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-600 hover:bg-[#1b5e6a] hover:text-white transition-colors group"
                    onClick={() => {
                      setColumns(DEFAULT_COLUMNS);
                      setMoreDropdownOpen(false);
                    }}
                  >
                    <RotateCcw size={16} className="group-hover:text-white" style={{ color: accentColor }} />
                    <span className="font-medium">Reset Column Width</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div >
      )}

      {/* Table Content */}
      <div className="flex-1 overflow-auto bg-white min-h-0 custom-scrollbar">
        <table className="w-full text-left border-collapse min-w-[1200px]">
          <thead className="bg-[#f6f7fb] sticky top-0 z-10 border-b border-[#e6e9f2]">
            <tr className="text-[10px] font-semibold text-[#7b8494] uppercase tracking-wider">
              <th className="px-4 py-3 w-16 min-w-[64px] bg-[#f6f7fb]">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsCustomizeModalOpen(true);
                    }}
                    className="h-6 w-6 flex items-center justify-center rounded border border-gray-200 bg-white hover:bg-gray-50 transition-colors"
                    title="Manage columns"
                    aria-label="Manage columns"
                  >
                    <SlidersHorizontal size={13} style={{ color: accentColor }} />
                  </button>
                  <div className="h-5 w-px bg-gray-200" />
                  <input
                    type="checkbox"
                    checked={selectedIds.length === filteredItems.length && filteredItems.length > 0}
                    onChange={toggleSelectAll}
                    style={{ accentColor: accentColor }}
                    className="cursor-pointer h-4 w-4 rounded border-gray-300 transition-all focus:ring-0"
                  />
                </div>
              </th>
              {visibleColumns.map((col) => (
                <th
                  key={col.key}
                  className={`px-4 py-3 relative group/header cursor-pointer select-none ${col.key !== 'name' && col.key !== 'rate' ? 'hidden md:table-cell' : ''}`}
                  style={{ width: col.width }}
                  onClick={() => col.key === 'name' ? handleSort('name') : undefined}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <span className={`truncate font-semibold ${/tax/i.test(col.key) ? 'text-black' : 'text-[#7b8494]'}`}>{col.label}</span>
                      {isSortableColumn(col.key) && getActiveSortColumn() === col.key && (
                        <ArrowUpDown
                          size={10}
                          className="flex-shrink-0 transition-colors"
                          style={{ color: accentColor }}
                        />
                      )}
                    </div>
                  </div>
                  <div
                    className="absolute right-0 top-0 bottom-0 w-[2px] cursor-col-resize hover:bg-teal-400/50 group-hover/header:border-r border-gray-100"
                    onMouseDown={(e) => startResizing(col.key, e)}
                    onClick={(e) => e.stopPropagation()}
                  />
                </th>
              ))}
              <th className="px-4 py-3 w-12 sticky right-0 bg-[#f6f7fb] z-20">
                <div className="flex items-center justify-center">
                  <Search
                    size={14}
                    className="text-gray-300 cursor-pointer transition-colors hover:opacity-80"
                    style={{ color: isAdvancedSearchOpen ? accentColor : undefined }}
                    onClick={(e) => { e.stopPropagation(); setIsAdvancedSearchOpen(true); }}
                  />
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading ? (
              <TableRowSkeleton columns={visibleColumns} />
            ) : (
              filteredItems.map(item => {
                const id = item.id || item._id;
                const isSelected = selectedIds.includes(id);
                return (
                  <tr
                    key={id}
                    className="text-[13px] group transition-all hover:bg-[#f8fafc] cursor-pointer h-[50px] border-b border-[#eef1f6]"
                    style={isSelected ? { backgroundColor: `#1b5e6a1A` } : {}}
                    onClick={() => onSelect(id)}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="h-6 w-6 shrink-0" aria-hidden />
                        <span className="h-5 w-px shrink-0 bg-transparent" aria-hidden />
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectOne(id)}
                          onClick={(e) => e.stopPropagation()}
                          style={{ accentColor: '#1b5e6a' }}
                          className="cursor-pointer h-4 w-4 rounded border-gray-300 transition-all focus:ring-0"
                        />
                      </div>
                    </td>
                    {visibleColumns.map(col => (
                      <td
                        key={col.key}
                        className={`px-4 py-3 truncate ${col.key !== 'name' && col.key !== 'rate' ? 'hidden md:table-cell' : ''}`}
                        style={{ maxWidth: col.width }}
                      >
                        {col.key === 'name' ? (
                          <div className="flex items-center gap-2">
                            {item.images && item.images.length > 0 ? (
                              <img
                                src={item.images[0]}
                                alt={item.name}
                                className="w-8 h-8 rounded object-cover flex-shrink-0"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center flex-shrink-0">
                                <ImageIcon size={16} className="text-gray-400" />
                              </div>
                            )}
                            <span className="text-[13px] font-medium text-[#1b5e6a] no-underline cursor-pointer truncate">{item.name}</span>
                          </div>
                        ) : col.key === 'rate' ? (
                          <span className="text-[13px] text-slate-600">{fmtMoney(item.sellingPrice || 0)}</span>
                        ) : col.key === 'accountName' ? (
                          <span className="text-[13px] text-slate-600">
                            {item.salesAccount
                              || item.accountName
                              || "-"}
                          </span>
                        ) : col.key === 'description' ? (
                          <span className="text-[13px] text-slate-600">
                            {getListDescription(item)}
                          </span>
                        ) : (
                          <span className={`text-[13px] ${/tax/i.test(col.key) ? 'text-black' : 'text-slate-600'}`}>
                            {(item as any)[col.key] || "-"}
                          </span>
                        )}
                      </td>
                    ))}
                    <td className="px-4 py-3 w-12 sticky right-0 bg-white/95 backdrop-blur-sm group-hover:bg-[#f8fafc] transition-colors" />
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {
        isCustomizeModalOpen && (
          <div className="fixed inset-0 bg-black/60 z-[10000] flex items-start justify-center pt-4 px-6 pb-6 overflow-y-auto">
            <div className="bg-white rounded-xl shadow-2xl w-[500px] max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal size={18} className="text-slate-600" />
                  <h3 className="text-lg font-semibold text-slate-800">Customize Columns</h3>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-xs text-slate-500 font-medium">
                    {columns.filter(c => c.visible).length} of {columns.length} Selected
                  </span>
                  <button
                    onClick={() => setIsCustomizeModalOpen(false)}
                    className="p-1 hover:bg-slate-100 rounded-full transition-colors"
                  >
                    <X size={20} className="text-slate-400" />
                  </button>
                </div>
              </div>

              <div className="p-4 border-b border-gray-50">
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search Columns"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
                    value={filterSearch}
                    onChange={(e) => setFilterSearch(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {columns
                  .filter(c => c.label.toLowerCase().includes(filterSearch.toLowerCase()))
                  .map((col) => (
                    <div
                      key={col.key}
                      className="flex items-center justify-between p-2 rounded-lg group transition-colors hover:bg-slate-50"
                    >
                      <div className="flex items-center gap-3">
                        <div className="text-slate-300">
                          <GripVertical size={16} />
                        </div>
                        <input
                          type="checkbox"
                          checked={col.visible}
                          disabled={col.key === 'name'}
                          onChange={() => handleToggleColumn(col.key)}
                          className="cursor-pointer h-4 w-4 rounded border-gray-300 text-teal-700 focus:ring-teal-700 disabled:opacity-50"
                        />
                        <div className="flex items-center gap-2">
                          {col.key === 'name' && <Lock size={12} className="text-slate-400" />}
                          <span className={`text-sm font-medium ${col.visible ? 'text-slate-700' : 'text-slate-400'}`}>
                            {col.label}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>

              <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 bg-slate-50/50">
                <button
                  onClick={() => setIsCustomizeModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => setIsCustomizeModalOpen(false)}
                  className="min-w-[88px] px-6 py-2 text-white rounded-lg text-sm font-semibold hover:opacity-90 shadow-md transition-all active:scale-95"
                  style={{ backgroundColor: accentColor }}
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )
      }

      <AdvancedSearchModal
        isOpen={isAdvancedSearchOpen}
        onClose={() => setIsAdvancedSearchOpen(false)}
        initialSearchIn="Items"
        initialFilter={filterType === "All" ? "All Items" : filterType}
        searchOptions={["Items", "Inventory Adjustments", "Units"]}
        filterOptionsBySearch={{
          Items: ["All Items", "Active Items", "Inactive Items", "Low Stock", "Inventory Items"],
          "Inventory Adjustments": ["All", "By Quantity", "By Value"],
          Units: ["All"],
        }}
        onSearch={(criteria) => {
          console.log("Advanced Search Criteria:", criteria);
          if (criteria.name) setSearchTerm(criteria.name);
          toast.success("Advanced search applied");
        }}
      />
      <ExportItemsModal isOpen={isExportModalOpen} onClose={() => setIsExportModalOpen(false)} data={items} accounts={dbAccounts} />
      <ExportCurrentViewModal isOpen={isExportCurrentViewModalOpen} onClose={() => setIsExportCurrentViewModalOpen(false)} data={filteredItems} columns={visibleColumns} accounts={dbAccounts} />
    </div >
  );
};

export default ItemsList;
