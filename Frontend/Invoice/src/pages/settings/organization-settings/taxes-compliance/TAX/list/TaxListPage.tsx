import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, MoreVertical, ChevronDown, ChevronRight, Download, Upload, X, Search, Eye, Pencil, Trash2, CircleOff, CheckCircle2, RotateCw, ReceiptText } from "lucide-react";
import ExportTaxModal from "../../../../ExportTaxModal"; // Assuming we might move this too but for now point to old or siblings
import { deleteTaxesLocal, getAssociatedRecordsLocal, isTaxGroupRecord, markDefaultTaxLocal, readTaxesLocal, updateTaxLocal } from "../storage";

export default function TaxListPage() {
    const navigate = useNavigate();
    const [taxes, setTaxes] = useState<any[]>([]);
    const [taxGroups, setTaxGroups] = useState<any[]>([]);
    const [filterType, setFilterType] = useState("All");
    const [showNewTaxDropdown, setShowNewTaxDropdown] = useState(false);
    const [showMoreMenu, setShowMoreMenu] = useState(false);
    const [selectedIds, setSelectedIds] = useState<any[]>([]);
    const [showSearchModal, setShowSearchModal] = useState(false);
    const [searchTaxName, setSearchTaxName] = useState("");
    const [searchTaxRate, setSearchTaxRate] = useState("");
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [showExportModal, setShowExportModal] = useState(false);
    const [exportType, setExportType] = useState("tax");
    const [rowMenuOpenId, setRowMenuOpenId] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [rowActionLoadingId, setRowActionLoadingId] = useState<string | null>(null);
    const [showAssociatedPanel, setShowAssociatedPanel] = useState(false);
    const [associatedExpanded, setAssociatedExpanded] = useState(true);
    const [associatedTax, setAssociatedTax] = useState<any | null>(null);
    const [associatedLoading, setAssociatedLoading] = useState(false);
    const [associatedError, setAssociatedError] = useState<string | null>(null);
    const [associatedData, setAssociatedData] = useState<any | null>(null);

    const newTaxDropdownRef = useRef<HTMLDivElement>(null);
    const moreMenuRef = useRef<HTMLDivElement>(null);

    // Click outside handlers
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (newTaxDropdownRef.current && !newTaxDropdownRef.current.contains(event.target as Node)) {
                setShowNewTaxDropdown(false);
            }
            if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
                setShowMoreMenu(false);
            }
            const target = event.target as HTMLElement;
            if (!target.closest(".tax-row-actions")) {
                setRowMenuOpenId(null);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Load taxes
    useEffect(() => {
        const loadTaxes = () => {
            try {
                const normalized = readTaxesLocal().map((tax: any) => ({
                    id: tax._id,
                    name: tax.name,
                    rate: tax.rate,
                    type: isTaxGroupRecord(tax) ? "tax-group" : "tax",
                    active: tax.isActive !== false,
                    isDefault: !!tax.isDefault,
                    isCompound: !!tax.isCompound,
                    country: tax.digitalServiceCountry || "",
                }));
                setTaxes(normalized.filter((item: any) => item.type !== "tax-group"));
                setTaxGroups(normalized.filter((item: any) => item.type === "tax-group"));
                setError(null);
            } catch {
                setError("Failed to load taxes from local storage.");
            } finally {
                setLoading(false);
            }
        };

        loadTaxes();
        const onStorageUpdated = () => loadTaxes();
        window.addEventListener("taban:taxes-storage-updated", onStorageUpdated);
        return () => window.removeEventListener("taban:taxes-storage-updated", onStorageUpdated);
    }, []);

    const filteredItems = () => {
        let items: any[] = [];
        if (filterType === "All") items = [...taxes, ...taxGroups];
        else if (filterType === "Tax") items = taxes;
        else if (filterType === "Tax Group") items = taxGroups;
        else if (filterType === "Active") items = [...taxes, ...taxGroups].filter(item => item.active !== false);
        else if (filterType === "Inactive") items = [...taxes, ...taxGroups].filter(item => item.active === false);
        else items = [...taxes, ...taxGroups];

        if (searchResults.length > 0) {
            return items.filter(item => searchResults.includes(item.id));
        }
        return items;
    };

    const handleSelectAll = (checked: boolean) => {
        if (checked) setSelectedIds(filteredItems().map(item => item.id));
        else setSelectedIds([]);
    };

    const handleSelectItem = (id: any, checked: boolean) => {
        if (checked) setSelectedIds([...selectedIds, id]);
        else setSelectedIds(selectedIds.filter(selectedId => selectedId !== id));
    };

    const handleDelete = (idsToDelete?: any[]) => {
        const targetIds = idsToDelete && idsToDelete.length > 0 ? idsToDelete : selectedIds;
        if (targetIds.length === 0) return;
        const deletedCount = deleteTaxesLocal(targetIds);

        setTaxes(prev => prev.filter(tax => !targetIds.includes(tax.id)));
        setTaxGroups(prev => prev.filter(group => !targetIds.includes(group.id)));
        setSelectedIds([]);
        setRowMenuOpenId(null);
        if (deletedCount < targetIds.length) {
            setError(`Deleted ${deletedCount} of ${targetIds.length} selected tax record(s).`);
        }
    };

    const handleToggleActive = (item: any) => {
        setRowActionLoadingId(item.id);
        updateTaxLocal(item.id, { isActive: !item.active });
        setTaxes(prev => prev.map(tax => tax.id === item.id ? { ...tax, active: !item.active } : tax));
        setTaxGroups(prev => prev.map(group => group.id === item.id ? { ...group, active: !item.active } : group));
        setRowActionLoadingId(null);
        setRowMenuOpenId(null);
    };

    const handleMarkDefault = (item: any) => {
        if (item.type === "tax-group") return;

        setRowActionLoadingId(item.id);
        markDefaultTaxLocal(item.id);
        setTaxes(prev => prev.map(tax => ({ ...tax, isDefault: tax.id === item.id })));
        setRowActionLoadingId(null);
        setRowMenuOpenId(null);
    };

    const handleSearch = () => {
        const items = [...taxes, ...taxGroups];
        const results = items.filter(item => {
            const nameMatch = !searchTaxName || item.name.toLowerCase().includes(searchTaxName.toLowerCase());
            const rateMatch = !searchTaxRate || (item.rate && item.rate.toString().includes(searchTaxRate));
            return nameMatch && rateMatch;
        });
        setSearchResults(results.map(item => item.id));
        setShowSearchModal(false);
    };

    const handleClearSearch = () => {
        setSearchTaxName("");
        setSearchTaxRate("");
        setSearchResults([]);
    };

    const loadAssociatedRecords = (item: any) => {
        setAssociatedTax(item);
        setShowAssociatedPanel(true);
        setAssociatedExpanded(true);
        setAssociatedLoading(true);
        setAssociatedError(null);
        setAssociatedData(getAssociatedRecordsLocal(item.id));
        setAssociatedLoading(false);
    };

    const getVisibleAssociatedRows = () => {
        if (!associatedData) return [];
        const exact = Array.isArray(associatedData.exactMatches) ? associatedData.exactMatches : [];
        const byRate = Array.isArray(associatedData.rateMatches) ? associatedData.rateMatches : [];

        return [
            ...exact.map((entry: any) => ({ ...entry, matchType: "Exact Tax Match" })),
            ...byRate.map((entry: any) => ({ ...entry, matchType: "Tax Rate Match" })),
        ].filter((entry: any) => Number(entry.count) > 0);
    };

    return (
        <div className="space-y-4">
            {/* Search Modal */}
            {showSearchModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[11000]">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold">Search Taxes</h3>
                            <button onClick={() => setShowSearchModal(false)}><X size={20} /></button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Tax Name</label>
                                <input
                                    type="text"
                                    value={searchTaxName}
                                    onChange={(e) => setSearchTaxName(e.target.value)}
                                    className="w-full h-10 px-3 rounded-lg border border-gray-300"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Rate (%)</label>
                                <input
                                    type="text"
                                    value={searchTaxRate}
                                    onChange={(e) => setSearchTaxRate(e.target.value)}
                                    className="w-full h-10 px-3 rounded-lg border border-gray-300"
                                />
                            </div>
                            <div className="flex justify-end gap-3 mt-6">
                                <button onClick={() => setShowSearchModal(false)} className="px-4 py-2 text-sm border rounded-lg">Cancel</button>
                                <button onClick={handleSearch} className="px-4 py-2 text-sm text-white bg-[#156372] rounded-lg">Search</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Header Actions */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <select
                            value={filterType}
                            onChange={(e) => {
                                setFilterType(e.target.value);
                                handleClearSearch();
                                setSelectedIds([]);
                            }}
                            className="h-9 px-3 pr-8 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white min-w-[140px]"
                        >
                            <option value="All">All taxes</option>
                            <option value="Active">Active</option>
                            <option value="Inactive">Inactive</option>
                            <option value="Tax">Tax</option>
                            <option value="Tax Group">Tax Group</option>
                        </select>
                        <ChevronDown size={16} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <div className="relative" ref={newTaxDropdownRef}>
                        <div className="flex">
                            <button
                                onClick={() => navigate("/settings/taxes/new")}
                                className="px-4 py-2 text-sm font-medium text-white bg-[#156372] rounded-l-lg hover:bg-[#0f4e5a] flex items-center gap-2"
                            >
                                <Plus size={16} />
                                New Tax
                            </button>
                            <button
                                onClick={() => setShowNewTaxDropdown(!showNewTaxDropdown)}
                                className="px-2 py-2 text-sm font-medium text-white bg-[#156372] rounded-r-lg hover:bg-[#0f4e5a] border-l border-[#0f4e5a]"
                            >
                                <ChevronDown size={16} />
                            </button>
                        </div>
                        {showNewTaxDropdown && (
                            <div className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 z-50 min-w-[200px]">
                                <button
                                    onClick={() => navigate("/settings/taxes/new-group")}
                                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600"
                                >
                                    New Tax Group
                                </button>
                                <button
                                    onClick={() => navigate("/settings/taxes/create-bulk")}
                                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600"
                                >
                                    Create Taxes in Bulk
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="relative" ref={moreMenuRef}>
                        <button
                            onClick={() => setShowMoreMenu(!showMoreMenu)}
                            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg border border-gray-300"
                        >
                            <MoreVertical size={18} />
                        </button>
                        {showMoreMenu && (
                            <div className="absolute top-full right-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 z-50 min-w-[200px]">
                                <button
                                    onClick={() => navigate("/settings/taxes/import", { state: { type: "taxes", autoDownload: true } })}
                                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 flex items-center gap-2"
                                >
                                    <Download size={16} /> Import Taxes
                                </button>
                                <button
                                    onClick={() => navigate("/settings/taxes/import", { state: { type: "tax-group", autoDownload: true } })}
                                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 flex items-center gap-2"
                                >
                                    <Download size={16} /> Import Tax Group
                                </button>
                                <button
                                    onClick={() => { setExportType("tax"); setShowExportModal(true); setShowMoreMenu(false); }}
                                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 flex items-center gap-2"
                                >
                                    <Upload size={16} /> Export Taxes
                                </button>
                                <button
                                    onClick={() => { setExportType("tax-group"); setShowExportModal(true); setShowMoreMenu(false); }}
                                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 flex items-center gap-2"
                                >
                                    <Upload size={16} /> Export Tax Group
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {error && (
                <div className="px-4 py-3 rounded-lg border border-red-200 bg-red-50 text-sm text-red-700">
                    {error}
                </div>
            )}

            {/* Table */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-visible">
                <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                        <tr>
                            <th className="px-4 py-3 text-left w-10">
                                <input
                                    type="checkbox"
                                    checked={filteredItems().length > 0 && selectedIds.length === filteredItems().length}
                                    onChange={(e) => handleSelectAll(e.target.checked)}
                                    className="h-4 w-4 text-[#156372] border-gray-300 rounded"
                                />
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Tax Name</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Country/Region</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Rate (%)</th>
                            <th className="px-4 py-3 text-right">
                                <button onClick={() => setShowSearchModal(true)} className="text-gray-400"><Search size={14} /></button>
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {loading ? (
                            <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-500">Loading taxes...</td></tr>
                        ) : filteredItems().length === 0 ? (
                            <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-500">No taxes found.</td></tr>
                        ) : (
                            filteredItems().map(item => (
                                <tr key={item.id} className="hover:bg-gray-50 group">
                                    <td className="px-4 py-3">
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.includes(item.id)}
                                            onChange={(e) => handleSelectItem(item.id, e.target.checked)}
                                            className="h-4 w-4 text-[#156372] border-gray-300 rounded"
                                        />
                                    </td>
                                    <td className="px-4 py-3 text-sm">
                                        {item.type === "tax-group" ? (
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-blue-500 hover:underline cursor-pointer">{item.name}</span>
                                                <span className="text-gray-400 text-xs italic">(Tax Group)</span>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-blue-500 hover:underline cursor-pointer">{item.name}</span>
                                                {item.isCompound && <span className="text-gray-400 text-xs italic">(Compound tax)</span>}
                                                {item.isDefault && <span className="text-gray-400 text-xs italic">- Default Tax</span>}
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-500">{item.country}</td>
                                    <td className="px-4 py-3 text-sm text-gray-900">{item.rate}</td>
                                    <td className="px-4 py-3 text-right">
                                        <div className="relative inline-block tax-row-actions">
                                            <button
                                                onClick={() => setRowMenuOpenId(rowMenuOpenId === item.id ? null : item.id)}
                                                className={`h-6 w-6 rounded-full bg-[#3b82f6] text-white items-center justify-center transition ${rowMenuOpenId === item.id ? "inline-flex" : "hidden group-hover:inline-flex"}`}
                                            >
                                                <ChevronDown size={14} />
                                            </button>
                                            {rowMenuOpenId === item.id && (
                                                <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-[9999] py-1">
                                                    <button
                                                        onClick={() => {
                                                            setRowMenuOpenId(null);
                                                            loadAssociatedRecords(item);
                                                        }}
                                                        className="w-full text-left px-4 py-2 text-sm hover:bg-blue-50 text-blue-600 flex items-center gap-2"
                                                    >
                                                        <Eye size={16} />
                                                        View Associated Records
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setRowMenuOpenId(null);
                                                            if (item.type === "tax-group") {
                                                                navigate(`/settings/taxes/new-group/${item.id}`);
                                                            } else {
                                                                navigate(`/settings/taxes/detail/${item.id}`);
                                                            }
                                                        }}
                                                        className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 text-gray-700 flex items-center gap-2"
                                                    >
                                                        <Pencil size={16} />
                                                        Edit
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete([item.id])}
                                                        className="w-full text-left px-4 py-2 text-sm hover:bg-red-50 text-gray-700 flex items-center gap-2"
                                                    >
                                                        <Trash2 size={16} />
                                                        Delete
                                                    </button>
                                                    <button
                                                        disabled={rowActionLoadingId === item.id}
                                                        onClick={() => handleToggleActive(item)}
                                                        className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 text-gray-700 flex items-center gap-2 disabled:opacity-60"
                                                    >
                                                        <CircleOff size={16} />
                                                        {item.active ? "Mark as Inactive" : "Mark as Active"}
                                                    </button>
                                                    <button
                                                        disabled={item.type === "tax-group" || item.isDefault || rowActionLoadingId === item.id}
                                                        onClick={() => handleMarkDefault(item)}
                                                        className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 text-gray-700 flex items-center gap-2 disabled:opacity-60"
                                                    >
                                                        <CheckCircle2 size={16} />
                                                        Mark as Default
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {showExportModal && <ExportTaxModal isOpen={showExportModal} onClose={() => setShowExportModal(false)} type={exportType} />}

            {showAssociatedPanel && (
                <div className="fixed inset-0 z-[12000]">
                    <div className="absolute inset-0 bg-black/30" onClick={() => setShowAssociatedPanel(false)} />
                    <div className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl flex flex-col">
                        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
                            <h3 className="text-2xl font-medium text-gray-900">Associated Records</h3>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => associatedTax && loadAssociatedRecords(associatedTax)}
                                    className="text-blue-500 hover:text-blue-600"
                                    disabled={associatedLoading}
                                >
                                    <RotateCw size={18} className={associatedLoading ? "animate-spin" : ""} />
                                </button>
                                <button onClick={() => setShowAssociatedPanel(false)} className="text-red-500 hover:text-red-600">
                                    <X size={18} />
                                </button>
                            </div>
                        </div>

                        <div className="p-5 space-y-5 overflow-y-auto">
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center">
                                    <ReceiptText size={22} className="text-gray-500" />
                                </div>
                                <div>
                                    <div className="text-sm text-gray-700">Tax Name</div>
                                    <div className="text-2xl text-gray-900">
                                        {associatedTax?.name}: {associatedTax?.rate}%
                                    </div>
                                    {associatedTax?.type === "tax-group" && (
                                        <div className="text-xs text-[#156372] mt-1">(Tax Group)</div>
                                    )}
                                </div>
                            </div>

                            <div className="border border-blue-500 rounded-lg overflow-hidden">
                                <button
                                    onClick={() => setAssociatedExpanded(prev => !prev)}
                                    className="w-full px-3 py-2 text-left flex items-center gap-2 bg-white"
                                >
                                    <ChevronRight size={16} className={`transition ${associatedExpanded ? "rotate-90" : ""}`} />
                                    <span className="text-2xl text-gray-900">Taxes</span>
                                </button>

                                {associatedExpanded && (
                                    <div className="px-3 pb-3 pt-1 border-t border-gray-100">
                                        {associatedLoading ? (
                                            <div className="text-sm text-gray-500 py-2">Loading associated records...</div>
                                        ) : associatedError ? (
                                            <div className="text-sm text-red-600 py-2">{associatedError}</div>
                                        ) : getVisibleAssociatedRows().length === 0 ? (
                                            <div className="text-sm text-gray-500 py-2">No associated transactions found.</div>
                                        ) : (
                                            <div className="space-y-2">
                                                {getVisibleAssociatedRows().map((row: any) => (
                                                    <div key={`${row.matchType}-${row.module}`} className="flex items-center justify-between text-sm text-gray-700 bg-gray-50 rounded px-2 py-2">
                                                        <div>
                                                            <div className="font-medium text-gray-900">{row.module}</div>
                                                            <div className="text-xs text-gray-500">{row.matchType}</div>
                                                        </div>
                                                        <div className="text-sm font-semibold text-gray-900">{row.count}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

