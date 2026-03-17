import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, MoreVertical, ChevronDown, ChevronRight, Download, Upload, X, Search, Eye, Pencil, Trash2, CircleOff, CheckCircle2, RotateCw, ReceiptText } from "lucide-react";
import ExportTaxModal from "../../../../ExportTaxModal"; 
import TaxesAdvancedSearchModal from "../../../../../../components/modals/TaxesAdvancedSearchModal";
import { deleteTaxesLocal, getAssociatedRecordsLocal, isTaxGroupRecord, markDefaultTaxLocal, readTaxesLocal, updateTaxLocal } from "../storage";

export default function TaxListPage() {
    const navigate = useNavigate();
    const [taxes, setTaxes] = useState<any[]>([]);
    const [taxGroups, setTaxGroups] = useState<any[]>([]);
    const [filterType, setFilterType] = useState("Active");
    const [showNewTaxDropdown, setShowNewTaxDropdown] = useState(false);
    const [showMoreMenu, setShowMoreMenu] = useState(false);
    const [selectedIds, setSelectedIds] = useState<any[]>([]);
    const [showSearchModal, setShowSearchModal] = useState(false);
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

    const handleSearch = (criteria: any) => {
        const { taxName, taxRate, status } = criteria;
        const items = [...taxes, ...taxGroups];
        const results = items.filter(item => {
            const nameMatch = !taxName || item.name.toLowerCase().includes(taxName.toLowerCase());
            const rateMatch = !taxRate || (item.rate && item.rate.toString().includes(taxRate));
            const statusMatch = status === "All" || (status === "Active" ? item.active : !item.active);
            return nameMatch && rateMatch && statusMatch;
        });
        setSearchResults(results.map(item => item.id));
    };

    const handleClearSearch = () => {
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
            <TaxesAdvancedSearchModal 
                isOpen={showSearchModal}
                onClose={() => setShowSearchModal(false)}
                onSearch={handleSearch}
            />

            {/* Header Actions */}
            <div className="flex items-center justify-between mb-3 min-h-[40px]">
                {selectedIds.length === 0 ? (
                    <>
                        <div className="flex items-center gap-1.5 cursor-pointer group">
                            <select
                                value={filterType}
                                onChange={(e) => {
                                    setFilterType(e.target.value);
                                    handleClearSearch();
                                    setSelectedIds([]);
                                }}
                                className="text-lg font-medium text-[#1e5e6e] hover:text-[#164a58] bg-transparent outline-none appearance-none cursor-pointer pr-1"
                            >
                                <option value="All">All taxes</option>
                                <option value="Active">Active taxes</option>
                                <option value="Inactive">Inactive taxes</option>
                                <option value="Tax">Taxes</option>
                                <option value="Tax Group">Tax groups</option>
                            </select>
                            <ChevronDown size={14} className="text-[#1e5e6e] group-hover:text-[#164a58] mt-0.5" />
                        </div>

                        <div className="flex items-center gap-2">
                            <div className="relative flex" ref={newTaxDropdownRef}>
                                <button
                                    onClick={() => navigate("/settings/taxes/new")}
                                    className="px-4 py-1.5 text-sm font-medium text-white bg-[#1e5e6e] rounded-l-md hover:bg-[#164a58] flex items-center gap-1.5"
                                >
                                    <Plus size={16} />
                                    New Tax
                                </button>
                                <button
                                    onClick={() => setShowNewTaxDropdown(!showNewTaxDropdown)}
                                    className="px-2 py-1.5 text-sm font-medium text-white bg-[#1e5e6e] rounded-r-md hover:bg-[#164a58] border-l border-white/20"
                                >
                                    <ChevronDown size={16} />
                                </button>
                                {showNewTaxDropdown && (
                                    <div className="absolute top-full right-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 z-50 min-w-[200px]">
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
                                    className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-md border border-gray-200"
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
                    </>
                ) : (
                    <>
                        <div className="flex items-center gap-6">
                            <button
                                onClick={() => handleDelete()}
                                className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-50 border border-gray-200 rounded-md hover:bg-gray-100 transition-colors shadow-sm"
                            >
                                <Trash2 size={16} className="text-gray-500" />
                                Delete
                            </button>
                            <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                                <div className="w-2 h-2 rounded-full bg-[#1e5e6e]" />
                                <span>{selectedIds.length} Taxes Selected</span>
                            </div>
                        </div>
                        <button
                            onClick={() => setSelectedIds([])}
                            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </>
                )}
            </div>

            <div className="h-px bg-gray-100 w-full mb-1" />

            {error && (
                <div className="px-4 py-3 rounded-lg border border-red-200 bg-red-50 text-sm text-red-700 mb-4">
                    {error}
                </div>
            )}

            {/* Table */}
            <div className="overflow-visible">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-gray-100">
                            <th className="px-4 py-4 w-10">
                                <input
                                    type="checkbox"
                                    checked={filteredItems().length > 0 && selectedIds.length === filteredItems().length}
                                    onChange={(e) => handleSelectAll(e.target.checked)}
                                    className="h-4 w-4 border-gray-300 rounded"
                                />
                            </th>
                            <th className="px-4 py-4 text-[11px] font-semibold text-gray-500 uppercase tracking-[1px]">TAX NAME</th>
                            <th className="px-4 py-4 text-[11px] font-semibold text-gray-500 uppercase tracking-[1px] text-center">COUNTRY/REGION</th>
                            <th className="px-4 py-4 text-[11px] font-semibold text-gray-500 uppercase tracking-[1px] text-right">RATE (%)</th>
                            <th className="px-4 py-4 text-right w-10">
                                <button onClick={() => setShowSearchModal(true)} className="text-[#1e5e6e] p-1 hover:text-[#164a58]">
                                    <Search size={15} strokeWidth={2.5} />
                                </button>
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {loading ? (
                            <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">Loading taxes...</td></tr>
                        ) : filteredItems().length === 0 ? (
                            <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">No taxes found.</td></tr>
                        ) : (
                            filteredItems().map(item => (
                                <tr key={item.id} className="group hover:bg-gray-50/50">
                                    <td className="px-4 py-4">
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.includes(item.id)}
                                            onChange={(e) => handleSelectItem(item.id, e.target.checked)}
                                            className="h-4 w-4 border-gray-300 rounded"
                                        />
                                    </td>
                                    <td className="px-4 py-4">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm text-[#3b82f6] hover:underline cursor-pointer font-medium">{item.name}</span>
                                            {item.type === "tax-group" ? (
                                                <span className="text-[12px] text-green-600">(Tax Group)</span>
                                            ) : (
                                                <>
                                                    {item.isCompound && <span className="text-[12px] text-green-600">(Compound tax)</span>}
                                                    {item.isDefault && <span className="text-[12px] text-gray-400 italic font-light">- Default Tax</span>}
                                                </>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-4 py-4 text-center text-sm text-gray-500">{item.country || '—'}</td>
                                    <td className="px-4 py-4 text-right text-sm text-gray-700">{item.rate}</td>
                                    <td className="px-4 py-4 text-right">
                                        <div className="relative inline-block tax-row-actions">
                                            <button
                                                onClick={() => setRowMenuOpenId(rowMenuOpenId === item.id ? null : item.id)}
                                                className={`h-7 w-7 rounded-full flex items-center justify-center shadow-sm transition-all ${rowMenuOpenId === item.id ? "bg-gray-300 text-gray-700 opacity-100" : "bg-gray-200 text-gray-600 opacity-0 group-hover:opacity-100 hover:bg-gray-300 hover:text-gray-700"}`}
                                            >
                                                <ChevronDown size={14} />
                                            </button>
                                            {rowMenuOpenId === item.id && (
                                                <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-gray-200 z-[9999] py-1">
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
                                                        className="w-full text-left px-4 py-2 text-sm hover:bg-red-50 text-red-600 flex items-center gap-2"
                                                    >
                                                        <Trash2 size={16} />
                                                        Delete
                                                    </button>
                                                    <div className="h-px bg-gray-100 my-1" />
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

