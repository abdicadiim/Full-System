import React, { useState, useMemo } from "react";
import { Plus, Search, HelpCircle, ChevronDown, MoreHorizontal, RefreshCw, ArrowUpDown, Download, SlidersHorizontal, RotateCcw, X, Upload, ChevronRight, Star } from "lucide-react";
import { Item, fmtMoney } from "../itemsModel";
import { useCurrency } from "../../../../hooks/useCurrency";
import { useOrganizationBranding } from "../../../../hooks/useOrganizationBranding";
import { useNavigate } from "react-router-dom";

interface ItemSidebarProps {
    items: Item[];
    selectedId: string | null;
    onSelect: (id: string) => void;
    onNew: () => void;
    baseCurrency?: any;
    onBulkMarkActive: (ids: string[]) => Promise<void>;
    onBulkMarkInactive: (ids: string[]) => Promise<void>;
    onBulkDelete: (ids: string[]) => Promise<void>;
    onBulkUpdate: (ids: string[]) => void;
    canCreate?: boolean;
    canEdit?: boolean;
    canDelete?: boolean;
}

export default function ItemSidebar({
    items,
    selectedId,
    onSelect,
    onNew,
    onBulkMarkActive,
    onBulkMarkInactive,
    onBulkDelete,
    onBulkUpdate,
    canCreate = true,
    canEdit = true,
    canDelete = true,
}: ItemSidebarProps) {
    const navigate = useNavigate();
    const { symbol: currencySymbol } = useCurrency();
    const { accentColor } = useOrganizationBranding();
    const [sidebarSearch, setSidebarSearch] = useState("");
    const [filterType, setFilterType] = useState("Active Items");
    const [moreDropdownOpen, setMoreDropdownOpen] = useState(false);
    const [viewDropdownOpen, setViewDropdownOpen] = useState(false);
    const [bulkDropdownOpen, setBulkDropdownOpen] = useState(false);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    const [sortSubMenuOpen, setSortSubMenuOpen] = useState(false);
    const [exportSubMenuOpen, setExportSubMenuOpen] = useState(false);
    const [isBulkActiveLoading, setIsBulkActiveLoading] = useState(false);
    const [isBulkInactiveLoading, setIsBulkInactiveLoading] = useState(false);
    const [isBulkDeleteLoading, setIsBulkDeleteLoading] = useState(false);

    const moreDropdownRef = React.useRef<HTMLDivElement>(null);
    const viewDropdownRef = React.useRef<HTMLDivElement>(null);
    const bulkDropdownRef = React.useRef<HTMLDivElement>(null);

    // Click outside handler
    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (moreDropdownRef.current && !moreDropdownRef.current.contains(event.target as Node)) {
                setMoreDropdownOpen(false);
                setSortSubMenuOpen(false);
                setExportSubMenuOpen(false);
            }
            if (viewDropdownRef.current && !viewDropdownRef.current.contains(event.target as Node)) {
                setViewDropdownOpen(false);
            }
            if (bulkDropdownRef.current && !bulkDropdownRef.current.contains(event.target as Node)) {
                setBulkDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const filteredItems = useMemo(() => {
        let result = [...items];
        if (sidebarSearch) {
            result = result.filter(
                (it) =>
                    (it.name || "").toLowerCase().includes(sidebarSearch.toLowerCase()) ||
                    (it.sku && it.sku.toLowerCase().includes(sidebarSearch.toLowerCase()))
            );
        }
        if (filterType === "Active Items") {
            result = result.filter((it) => it.active !== false && it.status !== "Inactive");
        } else if (filterType === "Inactive Items") {
            result = result.filter((it) => it.active === false || it.status === "Inactive");
        }
        return result;
    }, [items, sidebarSearch, filterType]);

    return (
        <div className="flex flex-col h-full bg-white border-r">
            {/* Sidebar Header */}
            {selectedIds.length > 0 ? (
                <div className="px-4 py-2 border-b border-gray-100 bg-gray-50 flex items-center justify-between h-[57px]">
                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            checked={selectedIds.length === filteredItems.length}
                            onChange={() => {
                                if (selectedIds.length === filteredItems.length) setSelectedIds([]);
                                else setSelectedIds(filteredItems.map(it => it.id || it._id || ""));
                            }}
                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        {(canCreate || canEdit || canDelete) && (
                            <div className="relative" ref={bulkDropdownRef}>
                                <button
                                    onClick={() => setBulkDropdownOpen(!bulkDropdownOpen)}
                                    className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white border border-gray-200 rounded text-sm font-medium text-slate-700 hover:bg-gray-50 transition-colors shadow-sm"
                                >
                                    Bulk Actions <ChevronDown size={14} />
                                </button>
                                {bulkDropdownOpen && (
                                    <div className="absolute top-full left-0 mt-1 w-56 bg-white border border-gray-200 rounded-lg shadow-xl z-[200] py-1 animate-in fade-in zoom-in-95 duration-100">
                                    {canEdit && (
                                        <button
                                            onClick={() => onBulkUpdate(selectedIds)}
                                            className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-[#1b5e6a] hover:text-white transition-colors font-medium"
                                        >
                                            Bulk Update
                                        </button>
                                    )}
                                    {canCreate && (
                                        <>
                                            <div className="h-px bg-gray-100 my-1" />
                                            <button onClick={() => navigate('/sales/quotes/new')} className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-[#1b5e6a] hover:text-white transition-colors">New Quote</button>
                                            <button onClick={() => navigate('/sales/invoices/new')} className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-[#1b5e6a] hover:text-white transition-colors">New Invoice</button>
                                            <button onClick={() => navigate('/sales/sales-receipts/new')} className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-[#1b5e6a] hover:text-white transition-colors">New Sales Receipt</button>
                                            <button onClick={() => navigate('/purchases/purchase-orders/new')} className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-[#1b5e6a] hover:text-white transition-colors">New Purchase Order</button>
                                            <button onClick={() => navigate('/purchases/bills/new')} className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-[#1b5e6a] hover:text-white transition-colors">New Bill</button>
                                            <div className="h-px bg-gray-100 my-1" />
                                        </>
                                    )}
                                    {canEdit && (
                                        <>
                                            <button
                                                onClick={async () => {
                                                    setIsBulkActiveLoading(true);
                                                    try { await onBulkMarkActive(selectedIds); } finally { setIsBulkActiveLoading(false); setBulkDropdownOpen(false); }
                                                }}
                                                disabled={isBulkActiveLoading}
                                                className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-[#1b5e6a] hover:text-white transition-colors font-medium flex items-center justify-between"
                                            >
                                                Mark as Active
                                                {isBulkActiveLoading && <RefreshCw size={14} className="animate-spin" />}
                                            </button>
                                            <button
                                                onClick={async () => {
                                                    setIsBulkInactiveLoading(true);
                                                    try { await onBulkMarkInactive(selectedIds); } finally { setIsBulkInactiveLoading(false); setBulkDropdownOpen(false); }
                                                }}
                                                disabled={isBulkInactiveLoading}
                                                className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-[#1b5e6a] hover:text-white transition-colors font-medium flex items-center justify-between"
                                            >
                                                Mark as Inactive
                                                {isBulkInactiveLoading && <RefreshCw size={14} className="animate-spin" />}
                                            </button>
                                        </>
                                    )}
                                    {canDelete && (
                                        <button
                                            onClick={async () => {
                                                setIsBulkDeleteLoading(true);
                                                try { await onBulkDelete(selectedIds); setSelectedIds([]); } finally { setIsBulkDeleteLoading(false); setBulkDropdownOpen(false); }
                                            }}
                                            disabled={isBulkDeleteLoading}
                                            className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-600 hover:text-white transition-colors font-medium flex items-center justify-between"
                                        >
                                            Delete
                                            {isBulkDeleteLoading && <RefreshCw size={14} className="animate-spin" />}
                                        </button>
                                    )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="h-6 w-px bg-gray-200" />
                        <div className="flex items-center gap-1">
                            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-50 text-blue-600 text-[11px] font-bold">
                                {selectedIds.length}
                            </span>
                            <span className="text-xs text-slate-500 font-medium">Selected</span>
                        </div>
                        <button onClick={() => setSelectedIds([])} className="p-1 text-slate-400 hover:text-slate-600 transition-colors">
                            <X size={18} />
                        </button>
                    </div>
                </div>
            ) : (
                <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                    <div className="relative" ref={viewDropdownRef}>
                        <div
                            className="flex items-center gap-1 cursor-pointer group"
                            onClick={() => setViewDropdownOpen(!viewDropdownOpen)}
                        >
                            <h2 className="text-sm font-semibold text-slate-900 group-hover:text-teal-600 transition-colors">
                                {filterType === "All" ? "All Items" : filterType === "Active Items" ? "Active Items" : filterType}
                            </h2>
                            <ChevronDown
                                size={14}
                                className={`text-[#1b5e6a] transition-transform duration-200 ${viewDropdownOpen ? 'rotate-180' : ''}`}
                            />
                        </div>
                        {viewDropdownOpen && (
                            <div className="absolute top-full left-0 mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-xl z-[150] py-1 animate-in fade-in zoom-in-95 duration-200">
                                {["All", "Active Items", "Inactive Items"].map((view) => (
                                    <button
                                        key={view}
                                        onClick={() => { setFilterType(view); setViewDropdownOpen(false); }}
                                        className={`w-full text-left px-4 py-2 text-sm transition-colors ${filterType === view ? 'bg-teal-50 text-teal-700 font-medium' : 'text-slate-600 hover:bg-teal-50/50'}`}
                                    >
                                        {view}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        {canCreate && (
                            <button
                                onClick={onNew}
                                className="cursor-pointer transition-all bg-[#1b5e6a] text-white p-1.5 rounded border-[#0f4e5a] border-b-[2px] hover:brightness-110 hover:-translate-y-[1px] hover:border-b-[3px] active:border-b-[1px] active:brightness-90 active:translate-y-[1px] flex items-center justify-center shadow-sm"
                            >
                                <Plus size={16} strokeWidth={3} />
                            </button>
                        )}
                        <div className="relative" ref={moreDropdownRef}>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setMoreDropdownOpen(!moreDropdownOpen);
                                }}
                                className={`p-1.5 border rounded transition-colors ${moreDropdownOpen ? 'bg-gray-100' : 'hover:bg-gray-50'} text-gray-500`}
                            >
                                <MoreHorizontal size={14} />
                            </button>
                            {moreDropdownOpen && (
                                <div className="absolute top-full right-0 mt-2 w-60 bg-white border border-gray-200 rounded-lg shadow-xl z-[150] py-2 animate-in fade-in slide-in-from-top-1 duration-200">
                                    <div className="relative">
                                        <button
                                            onClick={() => { setSortSubMenuOpen(!sortSubMenuOpen); setExportSubMenuOpen(false); }}
                                            className={`w-full flex items-center justify-between px-3 py-2 text-sm transition-colors ${sortSubMenuOpen ? 'bg-[#1b5e6a] text-white rounded mx-2 w-[calc(100%-16px)]' : 'text-slate-600 hover:bg-teal-50/50'}`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <ArrowUpDown size={16} className={sortSubMenuOpen ? 'text-white' : 'text-[#1b5e6a]'} />
                                                <span className="font-medium">Sort by</span>
                                            </div>
                                            <ChevronRight size={14} />
                                        </button>
                                        {sortSubMenuOpen && (
                                            <div className="absolute top-0 left-full ml-2 w-52 bg-white border border-gray-200 rounded-lg shadow-xl py-2 z-[160] animate-in fade-in slide-in-from-left-1 duration-200">
                                                {['Name', 'SKU', 'Rate', 'Last Modified', 'Created Time'].map(opt => (
                                                    <button key={opt} className="w-full text-left px-4 py-2 text-sm text-slate-600 hover:bg-teal-50/50">{opt}</button>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    <button
                                        className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-600 hover:bg-teal-50/50 transition-colors"
                                        onClick={() => { navigate('/products/items/import'); setMoreDropdownOpen(false); }}
                                    >
                                        <Upload size={16} className="text-[#1b5e6a]" />
                                        <span className="font-medium">Import Items</span>
                                    </button>

                                    <div className="relative">
                                        <button
                                            onClick={() => { setExportSubMenuOpen(!exportSubMenuOpen); setSortSubMenuOpen(false); }}
                                            className={`w-full flex items-center justify-between px-3 py-2 text-sm transition-colors ${exportSubMenuOpen ? 'bg-[#1b5e6a] text-white rounded mx-2 w-[calc(100%-16px)]' : 'text-slate-600 hover:bg-teal-50/50'}`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <Download size={16} className={exportSubMenuOpen ? 'text-white' : 'text-[#1b5e6a]'} />
                                                <span className="font-medium">Export</span>
                                            </div>
                                            <ChevronRight size={14} />
                                        </button>
                                        {exportSubMenuOpen && (
                                            <div className="absolute top-0 left-full ml-2 w-52 bg-white border border-gray-200 rounded-lg shadow-xl py-2 z-[160] animate-in fade-in slide-in-from-left-1 duration-200">
                                                <button className="w-full text-left px-4 py-2 text-sm text-slate-600 hover:bg-teal-50/50">Export Items</button>
                                                <button className="w-full text-left px-4 py-2 text-sm text-slate-600 hover:bg-teal-50/50">Export View</button>
                                            </div>
                                        )}
                                    </div>

                                    <div className="h-px bg-gray-100 my-1 mx-2" />

                                    <button className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-600 hover:bg-teal-50/50 transition-colors">
                                        <SlidersHorizontal size={16} className="text-[#1b5e6a]" />
                                        <span className="font-medium">Preferences</span>
                                    </button>

                                    <button
                                        className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-700 hover:bg-teal-50/50 transition-colors"
                                        onClick={() => { window.location.reload(); setMoreDropdownOpen(false); }}
                                    >
                                        <RefreshCw size={16} className="text-[#1b5e6a]" />
                                        <span className="font-medium">Refresh List</span>
                                    </button>

                                    <button className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-600 hover:bg-teal-50/50 transition-colors">
                                        <RotateCcw size={16} className="text-[#1b5e6a]" />
                                        <span className="font-medium">Reset Column Width</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Items List */}
            <div className="flex-1 overflow-y-auto">
                {filteredItems.map((it) => {
                    const id = it.id || it._id;
                    const isSelected = selectedId === id;
                    const isChecked = selectedIds.includes(id || "");
                    return (
                        <div
                            key={id}
                            onClick={() => onSelect(id || "")}
                            className={`px-4 py-3 cursor-pointer border-b border-gray-50 transition-colors ${isSelected ? "bg-[#f0f4ff]" : "hover:bg-gray-50"}`}
                        >
                            <div className="flex items-start gap-3">
                                <input
                                    type="checkbox"
                                    className="h-4 w-4 rounded border-gray-300 pointer-events-auto mt-1 accent-blue-600"
                                    checked={isChecked}
                                    onChange={(e) => {
                                        e.stopPropagation();
                                        setSelectedIds(prev => isChecked ? prev.filter(p => p !== id) : [...prev, id || ""]);
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                />
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start">
                                        <h3 className={`text-sm font-medium truncate ${isSelected ? "text-slate-900" : "text-slate-700"}`}>
                                            {it.name}
                                        </h3>
                                        <span className="text-xs font-semibold text-slate-900 ml-2">
                                            {fmtMoney(it.sellingPrice || 0, currencySymbol)}
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-slate-500 mt-0.5">
                                        SKU: {it.sku || "N/A"}
                                    </p>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

