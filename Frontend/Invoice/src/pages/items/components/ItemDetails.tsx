import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
    MoreHorizontal,
    MoreVertical,
    Plus,
    ChevronDown,
    X,
    Check,
    Star,
    RefreshCw,
    Clock,
    Lock,
    Unlock,
    Pencil,
    Trash2,
    Copy,
    Info,
    Image as ImageIcon,
    Filter,
    ArrowUpDown,
    FileDown,
    Trash
} from "lucide-react";
import { toast } from "react-toastify";
import { apiRequest, itemsAPI, tagAssignmentsAPI, invoicesAPI, billsAPI, inventoryAdjustmentsAPI } from "../../../services/api";
import { Item, Z, fmtMoney } from "../itemsModel";
import LockItemModal from "./modals/LockItemModal";
import OpeningStockModal from "./modals/OpeningStockModal";
import AdjustStock from "./modals/AdjustStock";
import ReorderPointModal from "./modals/ReorderPointModal";
import { useCurrency } from "../../../hooks/useCurrency";

interface ItemDetailsProps {
    item: Item;
    onBack: () => void;
    onEdit: () => void;
    items: Item[];
    setItems: React.Dispatch<React.SetStateAction<Item[]>>;
    onUpdate: (data: any) => Promise<void>;
    setSelectedId: (id: string | null) => void;
    setView: (view: string) => void;
    onDelete: (id: string) => Promise<void>;
    onClone: (data: any) => void;
    baseCurrency?: any;
    canCreate?: boolean;
    canEdit?: boolean;
    canDelete?: boolean;
}

const PRICE_LISTS_STORAGE_KEY = "inv_price_lists_v1";
const ITEM_PRICE_LIST_LINKS_KEY = "inv_item_price_list_links_v1";

export default function ItemDetails({
    item,
    onBack,
    onEdit,
    items,
    setItems,
    onUpdate,
    setSelectedId,
    setView,
    onDelete,
    onClone,
    baseCurrency,
    canCreate = true,
    canEdit = true,
    canDelete = true,
}: ItemDetailsProps) {
    const navigate = useNavigate();
    const { symbol: currencySymbol } = useCurrency();
    const transactionTypeOptions = ["Quotes", "Invoices", "Credit Notes", "Sales Receipts"] as const;
    const [activeTab, setActiveTab] = useState("overview");
    const [moreDropdownOpen, setMoreDropdownOpen] = useState(false);
    const [showAdjustStock, setShowAdjustStock] = useState(false);
    const [showLockModal, setShowLockModal] = useState(false);
    const [showOpeningStockModal, setShowOpeningStockModal] = useState(false);
    const [showReorderPointModal, setShowReorderPointModal] = useState(false);
    const [transactions, setTransactions] = useState<any[]>([]);
    const [historyEvents, setHistoryEvents] = useState<any[]>([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);
    const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);
    const [txTypeFilter, setTxTypeFilter] = useState<"Quotes" | "Invoices" | "Credit Notes" | "Sales Receipts">("Quotes");
    const [statusFilter, setStatusFilter] = useState("All");
    const [showTypeDropdown, setShowTypeDropdown] = useState(false);
    const [showStatusDropdown, setShowStatusDropdown] = useState(false);
    const [txCountsByType, setTxCountsByType] = useState<Partial<Record<(typeof transactionTypeOptions)[number], number>>>({});
    const [isLoadingTxCounts, setIsLoadingTxCounts] = useState(false);
    const [showAssociatedPriceLists, setShowAssociatedPriceLists] = useState(false);
    const [isActionLoading, setIsActionLoading] = useState(false);
    const [showAssociatePriceListModal, setShowAssociatePriceListModal] = useState(false);
    const [priceListOptions, setPriceListOptions] = useState<{ id: string; name: string }[]>([]);
    const [selectedPriceListId, setSelectedPriceListId] = useState("");
    const [associatedPriceLists, setAssociatedPriceLists] = useState<{ id: string; name: string; rate: number | null; discount: number | null }[]>([]);
    const [editingAssociatedPriceListId, setEditingAssociatedPriceListId] = useState<string | null>(null);
    const [editingRate, setEditingRate] = useState("");
    const [editingDiscount, setEditingDiscount] = useState("");

    const moreDropdownRef = useRef<HTMLDivElement>(null);
    const typeDropdownRef = useRef<HTMLDivElement>(null);
    const statusDropdownRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const txCountsReqRef = useRef(0);
    const txTypeFilterRef = useRef(txTypeFilter);
    const itemId = String(item.id || item._id || "");

    const readStoredRows = (key: string) => {
        try {
            const raw = localStorage.getItem(key);
            const parsed = raw ? JSON.parse(raw) : [];
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    };

    const readItemPriceListLinks = (): Record<string, string[]> => {
        try {
            const raw = localStorage.getItem(ITEM_PRICE_LIST_LINKS_KEY);
            const parsed = raw ? JSON.parse(raw) : {};
            return parsed && typeof parsed === "object" ? parsed : {};
        } catch {
            return {};
        }
    };

    const writeItemPriceListLinks = (links: Record<string, string[]>) => {
        localStorage.setItem(ITEM_PRICE_LIST_LINKS_KEY, JSON.stringify(links));
    };

    const loadAssociatedPriceLists = () => {
        const allPriceLists = readStoredRows(PRICE_LISTS_STORAGE_KEY).map((row: any) => {
            const id = String(row?.id || row?._id || "");
            const name = String(row?.name || "");
            const itemRates = Array.isArray(row?.itemRates) ? row.itemRates : [];
            return { id, name, itemRates, raw: row };
        }).filter((row: any) => row.id && row.name);

        const byId = new Map(allPriceLists.map((r: any) => [r.id, r]));
        const links = readItemPriceListLinks();
        const linked = Array.isArray(links[itemId]) ? links[itemId] : [];
        const resolved = linked.map((id) => {
            const record = byId.get(String(id));
            if (!record) return null;
            const match = (record.itemRates || []).find((r: any) => String(r?.itemId || r?.id || "") === itemId);
            const rate = match?.rate ?? match?.customRate ?? null;
            const discount = match?.discount ?? null;
            return {
                id: record.id,
                name: record.name,
                rate: rate === null || rate === undefined ? null : Number(rate),
                discount: discount === null || discount === undefined ? null : Number(discount),
            };
        }).filter(Boolean) as { id: string; name: string; rate: number | null; discount: number | null }[];

        setAssociatedPriceLists(resolved);
    };

    useEffect(() => {
        if (!showAssociatePriceListModal) return;
        const rows = readStoredRows(PRICE_LISTS_STORAGE_KEY);
        const normalized = rows.map((row: any) => ({
            id: String(row?.id || row?._id || ""),
            name: String(row?.name || ""),
        })).filter((r: any) => r.id && r.name);
        setPriceListOptions(normalized);
        setSelectedPriceListId("");
        loadAssociatedPriceLists();
    }, [showAssociatePriceListModal]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            if (moreDropdownRef.current && !moreDropdownRef.current.contains(target)) setMoreDropdownOpen(false);
            if (typeDropdownRef.current && !typeDropdownRef.current.contains(target)) setShowTypeDropdown(false);
            if (statusDropdownRef.current && !statusDropdownRef.current.contains(target)) setShowStatusDropdown(false);
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        if (activeTab === "transactions") {
            fetchTransactions();
        }
    }, [activeTab, item.id, item._id, txTypeFilter, statusFilter]);

    useEffect(() => {
        if (activeTab === "history") {
            fetchHistory();
        }
    }, [
        activeTab,
        item.id,
        item._id,
        item.updatedAt,
        item.createdAt,
        item.status,
        (item as any).active,
        (item as any).isActive,
        Array.isArray((item as any).history) ? (item as any).history.length : 0,
    ]);

    const transactionNumberHeading: Record<(typeof transactionTypeOptions)[number], string> = {
        Quotes: "QUOTE NUMBER",
        Invoices: "INVOICE NUMBER",
        "Credit Notes": "CREDIT NOTE NUMBER",
        "Sales Receipts": "SALES RECEIPT NUMBER",
    };
    const statusOptionsByType: Record<(typeof transactionTypeOptions)[number], { label: string; separator?: boolean }[]> = {
        Quotes: [
            { label: "All" },
            { label: "Draft" },
            { label: "Sent" },
            { label: "Client Viewed" },
            { label: "Accepted" },
            { label: "Invoiced" },
            { label: "Declined", separator: true },
            { label: "Expired" },
        ],
        Invoices: [
            { label: "All" },
            { label: "Draft" },
            { label: "Sent" },
            { label: "Viewed" },
            { label: "Partially Paid" },
            { label: "Paid" },
            { label: "Overdue", separator: true },
            { label: "Void" },
        ],
        "Credit Notes": [
            { label: "All" },
            { label: "Draft" },
            { label: "Open" },
            { label: "Partially Applied" },
            { label: "Applied" },
            { label: "Void" },
        ],
        "Sales Receipts": [
            { label: "All" },
            { label: "Draft" },
            { label: "Sent" },
            { label: "Deposited" },
            { label: "Undeposited" },
            { label: "Void" },
        ],
    };

    useEffect(() => {
        txTypeFilterRef.current = txTypeFilter;
    }, [txTypeFilter]);

    const getTxApiMeta = (type: (typeof transactionTypeOptions)[number]) => {
        switch (type) {
            case "Quotes":
                return { endpoint: "/quotes?limit=1000", typeLabel: "Quote", refField: "quoteNumber", entityField: "customer" };
            case "Invoices":
                return { endpoint: "/sales-invoices?limit=1000", typeLabel: "Invoice", refField: "invoiceNumber", entityField: "customer" };
            case "Credit Notes":
                return { endpoint: "/credit-notes?limit=1000", typeLabel: "Credit Note", refField: "creditNoteNumber", entityField: "customer" };
            case "Sales Receipts":
                return { endpoint: "/sales-receipts?limit=1000", typeLabel: "Sales Receipt", refField: "receiptNumber", entityField: "customer" };
            default:
                return { endpoint: "", typeLabel: "", refField: "", entityField: "" };
        }
    };

    const hasItemLine = (tx: any, targetItemId: string) => {
        return Boolean(
            tx?.items?.find?.((li: any) => (
                li?.item === targetItemId ||
                (li?.item && typeof li.item === "object" && (li.item._id === targetItemId || li.item.id === targetItemId))
            ))
        );
    };

    const prefetchTxCounts = async () => {
        if (!itemId) return;
        const reqId = ++txCountsReqRef.current;
        setIsLoadingTxCounts(true);
        try {
            const countsEntries = await Promise.all(
                transactionTypeOptions.map(async (type) => {
                    const { endpoint } = getTxApiMeta(type);
                    if (!endpoint) return [type, 0] as const;

                    let resp: any = null;
                    try {
                        resp = await apiRequest(endpoint);
                    } catch {
                        resp = { success: true, data: [] };
                    }

                    const rows = resp?.success && Array.isArray(resp.data) ? resp.data : [];
                    const count = rows.reduce((acc: number, tx: any) => acc + (hasItemLine(tx, itemId) ? 1 : 0), 0);
                    return [type, count] as const;
                })
            );

            if (reqId !== txCountsReqRef.current) return;
            const counts = Object.fromEntries(countsEntries) as Partial<Record<(typeof transactionTypeOptions)[number], number>>;
            setTxCountsByType(counts);

            const currentType = txTypeFilterRef.current;
            const currentCount = counts[currentType] ?? 0;
            if (currentCount > 0) return;

            const firstWithData = transactionTypeOptions.find((t) => (counts[t] ?? 0) > 0);
            if (firstWithData) {
                setTxTypeFilter(firstWithData);
                setStatusFilter("All");
            }
        } finally {
            if (reqId === txCountsReqRef.current) setIsLoadingTxCounts(false);
        }
    };

    useEffect(() => {
        if (activeTab !== "transactions") return;
        prefetchTxCounts();
    }, [activeTab, itemId]);

    const txTypeMenuOptions = React.useMemo(() => {
        const withData = transactionTypeOptions.filter((t) => (txCountsByType[t] ?? 0) > 0);
        return withData.length > 0 ? withData : transactionTypeOptions;
    }, [txCountsByType, transactionTypeOptions]);

    const fetchTransactions = async () => {
        setIsLoadingTransactions(true);
        try {
            const { endpoint, typeLabel, refField, entityField } = getTxApiMeta(txTypeFilter);
            const dateField = "date";

            let resp: any = null;
            try {
                resp = endpoint ? await apiRequest(endpoint) : { success: true, data: [] };
            } catch (error) {
                resp = { success: true, data: [] };
            }

            const allTransactions: any[] = [];
            if (resp?.success && Array.isArray(resp.data)) {
                resp.data.forEach((tx: any) => {
                    const lineItem = tx.items?.find((li: any) => (
                        li?.item === itemId ||
                        (li?.item && typeof li.item === 'object' && (li.item._id === itemId || li.item.id === itemId))
                    ));
                    if (lineItem) {
                        if (statusFilter !== "All" && tx.status?.toLowerCase() !== statusFilter.toLowerCase()) {
                            return;
                        }
                        allTransactions.push({
                            id: tx._id || tx.id,
                            date: tx[dateField] || tx.createdAt,
                            type: typeLabel,
                            reference: tx[refField] || "N/A",
                            entity: tx[entityField]?.displayName || tx[entityField + "Name"] || "N/A",
                            quantity: lineItem.quantity || lineItem.quantityAdjusted || 0,
                            price: lineItem.unitPrice || lineItem.rate || 0,
                            amount: tx.total || (lineItem.quantity * (lineItem.unitPrice || 0)) || 0,
                            status: tx.status
                        });
                    }
                });
            }
            setTransactions(allTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
        } catch (error) {
            toast.error("Failed to load transactions");
        } finally {
            setIsLoadingTransactions(false);
        }
    };

    const fetchHistory = async () => {
        setIsLoadingHistory(true);
        try {
            const rows = Array.isArray((item as any).history) ? (item as any).history : [];
            const fallback = rows.length > 0 ? rows : [
                {
                    action: "created",
                    by: (item as any).createdBy || (item as any).updatedBy || { name: "Unknown" },
                    at: item.createdAt || new Date().toISOString(),
                    details: "created",
                },
            ];

            const normalized = fallback.map((row: any) => ({
                action: String(row?.action || row?.details || "updated"),
                byName: String(row?.by?.name || row?.byName || row?.userName || "Unknown"),
                at: String(row?.at || row?.timestamp || item.updatedAt || item.createdAt || new Date().toISOString()),
                details: String(row?.details || ""),
            }));

            setHistoryEvents(normalized.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()));
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoadingHistory(false);
        }
    };

    const formatHistoryDate = (value: string) => {
        const d = new Date(value);
        if (Number.isNaN(d.getTime())) return value;
        return d.toLocaleString("en-US", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
        }).replace(",", "");
    };

    const formatHistoryDetails = (row: any) => {
        const action = String(row?.action || "").toLowerCase();
        const details = String(row?.details || "").toLowerCase();
        if (action.includes("created") || details.includes("created")) return "created by";
        if (action.includes("marked_active") || details.includes("marked as active")) return "marked as active";
        if (action.includes("marked_inactive") || details.includes("marked as inactive")) return "marked as inactive";
        if (details) return details;
        return action ? action.replace(/_/g, " ") : "updated";
    };

    const getStatusesForType = () => statusOptionsByType[txTypeFilter];

    const handleClone = () => {
        const clonedData = {
            ...item,
            name: item.name,
            sku: item.sku
        };
        const fieldsToRemove = ['_id', 'id', '__v', 'createdAt', 'updatedAt'];
        fieldsToRemove.forEach(field => delete (clonedData as any)[field]);
        onClone(clonedData);
        setMoreDropdownOpen(false);
    };

    const handleToggleActive = async () => {
        setIsActionLoading(true);
        try {
            const isCurrentlyInactive = item.active === false || item.isActive === false || item.status === "Inactive";
            const targetState = isCurrentlyInactive;
            const newStatus = isCurrentlyInactive ? "Active" : "Inactive";
            await onUpdate({
                active: targetState,
                isActive: targetState,
                status: newStatus
            });
            setMoreDropdownOpen(false);
        } catch (error) {
            console.error(error);
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = async () => {
                const base64 = reader.result as string;
                const newImages = [base64, ...(item.images || [])];
                await onUpdate({ images: newImages });
            };
            reader.readAsDataURL(file);
        }
        if (e.target) {
            e.target.value = "";
        }
    };

    const handleRemoveImage = async () => {
        if (!canEdit) return;
        if (!item.images || item.images.length === 0) return;
        const remaining = item.images.slice(1);
        await onUpdate({ images: remaining });
    };

    const handleCreatePriceList = () => {
        setShowAssociatePriceListModal(false);
        navigate("/products/price-lists?new=1");
    };

    const handleSaveAssociation = () => {
        if (!itemId) {
            toast.error("Item id is missing.");
            return;
        }
        if (!selectedPriceListId) {
            toast.error("Select a price list.");
            return;
        }
        const links = readItemPriceListLinks();
        const current = new Set(Array.isArray(links[itemId]) ? links[itemId].map(String) : []);
        current.add(String(selectedPriceListId));
        links[itemId] = Array.from(current);
        writeItemPriceListLinks(links);
        loadAssociatedPriceLists();
        setShowAssociatePriceListModal(false);
        toast.success("Price list associated.");
    };

    const startEditAssociatedPriceList = (row: { id: string; name: string; rate: number | null; discount: number | null }) => {
        setEditingAssociatedPriceListId(row.id);
        const fallbackRate = Number(item.sellingPrice || item.rate || 0) || 0;
        setEditingRate(String(row.rate ?? fallbackRate));
        setEditingDiscount(row.discount === null || row.discount === undefined ? "" : String(row.discount));
    };

    const cancelEditAssociatedPriceList = () => {
        setEditingAssociatedPriceListId(null);
        setEditingRate("");
        setEditingDiscount("");
    };

    const saveEditAssociatedPriceList = () => {
        if (!itemId) return;
        if (!editingAssociatedPriceListId) return;
        const rate = editingRate.trim() === "" ? null : Number(editingRate);
        const discount = editingDiscount.trim() === "" ? null : Number(editingDiscount);
        if (rate !== null && (!Number.isFinite(rate) || rate < 0)) return;
        const rows = readStoredRows(PRICE_LISTS_STORAGE_KEY);
        const updated = rows.map((pl: any) => {
            const plId = String(pl?.id || pl?._id || "");
            if (plId !== String(editingAssociatedPriceListId)) return pl;
            const existingRates = Array.isArray(pl?.itemRates) ? pl.itemRates : [];
            const nextRates = [...existingRates];
            const idx = nextRates.findIndex((r: any) => String(r?.itemId || r?.id || "") === itemId);
            const nextEntry = {
                ...(idx >= 0 ? nextRates[idx] : {}),
                itemId,
                itemName: String(item.name || "").trim(),
                sku: String(item.sku || "").trim(),
                rate,
                discount,
            };
            if (idx >= 0) nextRates[idx] = nextEntry;
            else nextRates.push(nextEntry);
            return { ...pl, itemRates: nextRates, updatedAt: new Date().toISOString() };
        });
        localStorage.setItem(PRICE_LISTS_STORAGE_KEY, JSON.stringify(updated));
        loadAssociatedPriceLists();
        cancelEditAssociatedPriceList();
        toast.success("Updated price list rate.");
    };

    return (
        <div className="flex flex-col h-full bg-white relative">
            <div className="flex items-center justify-between px-6 py-6 border-b border-gray-100 bg-white shadow-sm">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                    <h1 className="text-[22px] font-medium text-slate-700 truncate capitalize tracking-tight">{item.name}</h1>
                    {(item.active === false || item.isActive === false || item.status === "Inactive") ? (
                        <span className="shrink-0 px-2 py-0.5 rounded bg-[#b1b1b1] text-white text-[10px] font-bold uppercase tracking-wider">
                            INACTIVE
                        </span>
                    ) : null}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    {canEdit && (
                        <button onClick={onEdit} className="p-1.5 border border-gray-200 rounded-md hover:bg-gray-50 text-gray-500 transition-colors">
                            <Pencil size={18} />
                        </button>
                    )}
                    {(canCreate || canEdit || canDelete) && (
                        <div className="relative" ref={moreDropdownRef}>
                            <button
                                onClick={() => setMoreDropdownOpen(!moreDropdownOpen)}
                                className="px-3 py-1.5 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors bg-white shadow-sm text-[13px] font-medium text-gray-700 inline-flex items-center gap-2"
                            >
                                More
                                <ChevronDown size={16} className="text-gray-500" />
                            </button>
                            {moreDropdownOpen && (
                                <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-xl z-50 py-1 overflow-hidden">
                                    <div className="p-2 flex flex-col gap-1">
                                        <button onClick={handleClone} className="w-full px-3 py-2 text-sm text-left text-gray-700 hover:bg-gray-50 rounded-md transition-colors font-medium">Clone Item</button>
                                        <button onClick={handleToggleActive} disabled={isActionLoading} className="w-full px-3 py-2 text-sm text-left text-gray-700 hover:bg-gray-50 rounded-md transition-colors font-medium">
                                            {(item.active === false || item.isActive === false || item.status === "Inactive") ? "Mark as Active" : "Mark as Inactive"}
                                        </button>
                                        <button onClick={() => { onDelete(item.id || item._id || ""); setMoreDropdownOpen(false); }} className="w-full px-3 py-2 text-sm text-left text-gray-700 hover:bg-gray-50 rounded-md transition-colors font-medium text-red-600">Delete</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                    <button onClick={onBack} className="p-1 text-gray-400 hover:text-gray-600 ml-1 transition-colors">
                        <X size={24} strokeWidth={1} />
                    </button>
                </div>
            </div>

            <div className="flex items-center gap-7 px-6 border-b border-gray-200 overflow-x-auto no-scrollbar">
                {["Overview", "Transactions", "History"].map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab.toLowerCase())}
                        className={`py-2.5 text-[13px] font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === tab.toLowerCase() ? "border-[#3b82f6] text-gray-900" : "border-transparent text-gray-600 hover:text-gray-900"}`}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            <div className="flex-1 overflow-y-auto p-6 scroll-smooth">
                {activeTab === "overview" && (
                    <div className="w-full">
                        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-12">
                            <div className="space-y-6 pt-2">
                                <div className="grid grid-cols-[150px_1fr] items-center gap-4">
                                    <div className="text-[13px] text-gray-400">Item Type</div>
                                    <div className="text-[13px] text-gray-800 font-medium">
                                        {item.type === "Service" ? "Sales Items (Service)" : item.trackInventory ? "Inventory Items" : "Sales Items"}
                                    </div>
                                </div>
                                <div className="grid grid-cols-[150px_1fr] items-center gap-4">
                                    <div className="text-[13px] text-gray-400">SKU</div>
                                    <div className="text-[13px] text-gray-800">{item.sku || "-"}</div>
                                </div>
                                <div className="grid grid-cols-[150px_1fr] items-center gap-4">
                                    <div className="text-[13px] text-gray-400">Unit</div>
                                    <div className="text-[13px] text-gray-800">{item.unit || "-"}</div>
                                </div>
                                <div className="grid grid-cols-[150px_1fr] items-center gap-4">
                                    <div className="text-[13px] text-gray-400">Created Source</div>
                                    <div className="text-[13px] text-gray-800">User</div>
                                </div>
                                <div className="grid grid-cols-[150px_1fr] items-center gap-4">
                                    <div className="text-[13px] text-gray-400">Sales Tax</div>
                                    <div className="text-[13px] text-gray-800">
                                        {item.salesTax || (item.taxInfo ? `${item.taxInfo.taxName} [${item.taxInfo.taxRate}%]` : "-")}
                                    </div>
                                </div>

                                <div className="pt-8">
                                    <h3 className="text-sm font-semibold text-gray-800 mb-6">Sales Information</h3>
                                    <div className="space-y-6">
                                        <div className="grid grid-cols-[150px_1fr] items-center gap-4">
                                            <div className="text-[13px] text-gray-400">Selling Price</div>
                                            <div className="text-[13px] text-gray-800 font-medium">{fmtMoney(item.sellingPrice || 0, currencySymbol)}</div>
                                        </div>
                                        <div className="grid grid-cols-[150px_1fr] items-start gap-4">
                                            <div className="text-[13px] text-gray-400">Description</div>
                                            <div className="text-[13px] text-gray-800">{item.salesDescription || "-"}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-start pt-2">
                                <div className="w-full">
                                    <div
                                        className="border-2 border-dashed border-gray-100 rounded-xl h-[220px] flex flex-col items-center justify-center bg-white text-center cursor-pointer transition-all hover:border-gray-200 hover:bg-gray-50/50 group relative overflow-hidden"
                                        onClick={() => canEdit && fileInputRef.current?.click()}
                                    >
                                        {item.images && item.images.length > 0 ? (
                                            <img src={item.images[0]} alt={item.name} className="absolute inset-0 h-full w-full object-contain p-4" />
                                        ) : (
                                            <div className="flex flex-col items-center">
                                                <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-4 group-hover:bg-white transition-colors">
                                                    <ImageIcon className="h-6 w-6 text-gray-400" />
                                                </div>
                                                <p className="text-[13px] text-gray-400 leading-tight">Drag image(s) here or</p>
                                                <span className="text-[13px] text-blue-500 font-medium mt-1">Browse images</span>
                                            </div>
                                        )}
                                    </div>
                                    {item.images && item.images.length > 0 && (
                                        <div className="mt-4 flex items-center gap-3">
                                            <button
                                                type="button"
                                                onClick={() => canEdit && fileInputRef.current?.click()}
                                                className="text-[13px] font-medium text-blue-600 hover:text-blue-700 underline underline-offset-4"
                                            >
                                                Change Image
                                            </button>
                                            <button
                                                type="button"
                                                onClick={handleRemoveImage}
                                                className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>


                    </div>
                )}

                {activeTab === "transactions" && (
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="relative" ref={typeDropdownRef}>
                                <button onClick={() => setShowTypeDropdown(!showTypeDropdown)} className="px-3 py-2 border rounded-md text-sm font-medium text-gray-700 bg-gray-50 hover:bg-white flex items-center gap-2">
                                    Filter By: {txTypeFilter} <ChevronDown size={14} />
                                </button>
                                {showTypeDropdown && (
                                    <div className="absolute left-0 mt-1 w-52 bg-white border rounded-lg shadow-xl z-50 py-1">
                                        {txTypeMenuOptions.map(t => <button key={t} onClick={() => { setTxTypeFilter(t); setShowTypeDropdown(false); }} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50">{t}</button>)}
                                    </div>
                                )}
                            </div>
                            <div className="relative" ref={statusDropdownRef}>
                                <button onClick={() => setShowStatusDropdown(!showStatusDropdown)} className="px-3 py-2 border rounded-md text-sm font-medium text-gray-700 bg-gray-50 hover:bg-white flex items-center gap-2">
                                    Status: {statusFilter} <ChevronDown size={14} />
                                </button>
                                {showStatusDropdown && (
                                    <div className="absolute left-0 mt-1 w-52 bg-white border rounded-lg shadow-xl z-50 py-1">
                                        {getStatusesForType().map(s => <button key={s.label} onClick={() => { setStatusFilter(s.label); setShowStatusDropdown(false); }} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50">{s.label}</button>)}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="bg-white rounded-lg border overflow-hidden min-h-[400px]">
                            {isLoadingTransactions ? <div className="flex items-center justify-center h-64"><RefreshCw className="animate-spin text-blue-500" /></div> : transactions.length > 0 ? (
                                <table className="w-full text-left">
                                    <thead className="bg-gray-50 border-b">
                                        <tr>
                                            <th className="px-6 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-left">Date</th>
                                            <th className="px-6 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-left">{transactionNumberHeading[txTypeFilter]}</th>
                                            <th className="px-6 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-left">Customer</th>
                                            <th className="px-6 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-right">Quantity</th>
                                            <th className="px-6 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-right">Total</th>
                                            <th className="px-6 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-center">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {transactions.map(tx => (
                                            <tr key={tx.id} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 text-sm text-gray-600">{new Date(tx.date).toLocaleDateString()}</td>
                                                <td className="px-6 py-4 text-sm font-medium text-blue-600">{tx.reference}</td>
                                                <td className="px-6 py-4 text-sm text-gray-900">{tx.entity}</td>
                                                <td className="px-6 py-4 text-sm text-gray-600 text-right">{tx.quantity}</td>
                                                <td className="px-6 py-4 text-sm font-bold text-gray-900 text-right">{fmtMoney(tx.amount, currencySymbol)}</td>
                                                <td className="px-6 py-4 text-center"><span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{tx.status}</span></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : <div className="flex flex-col items-center justify-center h-64 text-gray-400">No transactions found</div>}
                        </div>
                    </div>
                )}

                {activeTab === "history" && (
                    <div className="bg-white rounded-lg border border-gray-100 shadow-sm overflow-hidden">
                        {isLoadingHistory ? (
                            <div className="flex items-center justify-center py-20">
                                <RefreshCw className="animate-spin text-blue-500" size={32} />
                            </div>
                        ) : historyEvents.length > 0 ? (
                            <div className="w-full">
                                <div className="grid grid-cols-[280px_1fr] border-b border-gray-200 bg-white px-6 py-3 text-[12px] tracking-widest text-gray-400 uppercase">
                                    <div>DATE</div>
                                    <div>DETAILS</div>
                                </div>
                                <div>
                                    {historyEvents.map((row: any, idx: number) => (
                                        <div key={idx} className="grid grid-cols-[280px_1fr] border-b border-gray-100 px-6 py-3 text-[13px]">
                                            <div className="text-gray-500">{formatHistoryDate(row.at)}</div>
                                            <div className="text-gray-900">
                                                {formatHistoryDetails(row)}{" "}
                                                <span className="text-[#2563eb] italic">- {row.byName}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-20 text-center text-gray-400">
                                No history found
                            </div>
                        )}
                    </div>
                )}
            </div>

            {showLockModal && <LockItemModal onClose={() => setShowLockModal(false)} onLock={async (c, r) => { await onUpdate({ ...item, locked: true, lockConfig: c, lockReason: r }); setShowLockModal(false); }} />}
            {showOpeningStockModal && <OpeningStockModal item={item} onClose={() => setShowOpeningStockModal(false)} onSave={async (d) => { await onUpdate({ ...item, ...d }); setShowOpeningStockModal(false); }} />}
            {showReorderPointModal && <ReorderPointModal currentValue={parseFloat(String(item.reorderPoint || 0))} onClose={() => setShowReorderPointModal(false)} onSave={async (v) => { await onUpdate({ ...item, reorderPoint: v }); setShowReorderPointModal(false); }} />}

            {showAssociatePriceListModal && (
                <div className="fixed inset-0 z-[10020] bg-black/40 flex items-start justify-center pt-10 px-4">
                    <div className="w-full max-w-xl bg-white rounded-lg shadow-2xl overflow-hidden">
                        <div className="flex items-center justify-between border-b px-6 py-4">
                            <h2 className="text-lg font-medium">Associate Price List</h2>
                            <button onClick={() => setShowAssociatePriceListModal(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
                        </div>
                        <div className="p-6 bg-gray-50 space-y-4">
                            <div className="grid grid-cols-[150px_1fr] items-center gap-4">
                                <span className="text-sm font-medium text-gray-700">Select Price List*</span>
                                <select value={selectedPriceListId} onChange={(e) => setSelectedPriceListId(e.target.value)} className="w-full h-10 border rounded px-3 text-sm focus:border-blue-500 outline-none">
                                    <option value="">Select a Price List</option>
                                    {priceListOptions.map(pl => <option key={pl.id} value={pl.id}>{pl.name}</option>)}
                                </select>
                            </div>
                        </div>
                        <div className="p-6 border-t flex gap-3">
                            <button onClick={handleSaveAssociation} className="px-6 py-2 bg-[#156372] text-white rounded font-medium hover:bg-[#0D4A52]">Save</button>
                            <button onClick={() => setShowAssociatePriceListModal(false)} className="px-6 py-2 border rounded font-medium hover:bg-gray-50">Cancel</button>
                        </div>
                    </div>
                </div>
            )}
            <input ref={fileInputRef} type="file" hidden accept="image/*" onChange={handleImageUpload} />
        </div>
    );
}
