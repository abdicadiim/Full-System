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
    ArrowUpDown
} from "lucide-react";
import { toast } from "react-toastify";
import { apiRequest, itemsAPI, tagAssignmentsAPI, invoicesAPI, billsAPI, inventoryAdjustmentsAPI } from "../../../../services/api";
import { Item, Z, fmtMoney } from "../itemsModel";
import LockItemModal from "./modals/LockItemModal";
import OpeningStockModal from "./modals/OpeningStockModal";
import AdjustStock from "./modals/AdjustStock";
import ReorderPointModal from "./modals/ReorderPointModal";

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

const FieldLabel = ({ children }: { children: React.ReactNode }) => (
    <div className="text-[11px] text-gray-400 font-medium uppercase tracking-wider">{children}</div>
);

const FieldValue = ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={`text-sm text-gray-900 font-medium ${className || ""}`}>{children || "-"}</div>
);

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
    <h3 className="text-sm font-semibold text-gray-900 mt-8 mb-4">{children}</h3>
);

const StatusCard = ({ label, value, onEdit, icon }: any) => (
    <div className="p-4 border-b border-gray-100 last:border-0 relative">
        <div className="flex justify-between items-start mb-1">
            <span className="text-[11px] font-bold text-gray-900 uppercase tracking-widest leading-none">{label}</span>
            {onEdit && (
                <button onClick={onEdit} className="text-blue-500 hover:text-blue-600 transition-colors">
                    {icon || <span className="text-xs font-medium lowercase flex items-center gap-1"><Pencil size={12} /> edit</span>}
                </button>
            )}
        </div>
        <div className="text-[15px] font-semibold text-gray-900">{value}</div>
    </div>
);

import { useCurrency } from "../../../../hooks/useCurrency";

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
    const [reorderNotificationEnabled, setReorderNotificationEnabled] = useState(false);
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

    // Fetch reorder notification setting
    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const response = await apiRequest('/organization/preferences');
                if (response?.data?.itemSettings?.notifyReorderPoint) {
                    setReorderNotificationEnabled(true);
                } else {
                    setReorderNotificationEnabled(false);
                }
            } catch (error) {
                console.error("Failed to fetch settings:", error);
            }
        };

        fetchSettings();

        // Re-fetch when page becomes visible (user returns from settings)
        const handleVisibilityChange = () => {
            if (!document.hidden) {
                fetchSettings();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, []);

    // Click Outside
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
    }, [activeTab, item.id, item._id]);

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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab, itemId]);

    const txTypeMenuOptions = React.useMemo(() => {
        const withData = transactionTypeOptions.filter((t) => (txCountsByType[t] ?? 0) > 0);
        return withData.length > 0 ? withData : transactionTypeOptions;
    }, [txCountsByType]);

    const fetchTransactions = async () => {
        setIsLoadingTransactions(true);
        try {
            const { endpoint, typeLabel, refField, entityField } = getTxApiMeta(txTypeFilter);
            const dateField = "date";

            let resp: any = null;
            try {
                resp = endpoint ? await apiRequest(endpoint) : { success: true, data: [] };
            } catch (error) {
                console.warn(`Failed to fetch ${txTypeFilter} transactions:`, error);
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
                        // Check status filter
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
            console.error("Error fetching transactions:", error);
            toast.error("Failed to load transactions");
        } finally {
            setIsLoadingTransactions(false);
        }
    };

    const fetchHistory = async () => {
        setIsLoadingHistory(true);
        try {
            const itemId = item.id || item._id;
            const history: any[] = [];

            // 1. Initial Milestones
            history.push({
                type: 'milestone',
                title: 'Item Created',
                description: 'Item was added to the inventory system.',
                timestamp: item.createdAt || new Date().toISOString(),
                color: 'bg-blue-600'
            });

            if (item.inventoryTracking) {
                history.push({
                    type: 'milestone',
                    title: 'Inventory Tracking Enabled',
                    description: `Tracking started with opening stock: ${item.openingStock || 0}${item.unit ? ' ' + item.unit : ''}`,
                    timestamp: item.createdAt || new Date().toISOString(),
                    color: 'bg-emerald-500'
                });
            }

            // 2. Fetch all transaction types concurrently to build the timeline
            const [quotes, invoices, creditNotes, receipts] = await Promise.all([
                apiRequest('/quotes?limit=1000').catch(() => ({ success: true, data: [] })),
                apiRequest('/sales-invoices?limit=1000').catch(() => ({ success: true, data: [] })),
                apiRequest('/credit-notes?limit=1000').catch(() => ({ success: true, data: [] })),
                apiRequest('/sales-receipts?limit=1000').catch(() => ({ success: true, data: [] }))
            ]);

            // Helper to extract matches for this item
            const processTransactions = (resp: any, type: string, numberField: string, entityField: string) => {
                if (resp?.success && Array.isArray(resp.data)) {
                    resp.data.forEach((tx: any) => {
                        const lineItem = tx.items?.find((li: any) =>
                            (li?.item === itemId || (li?.item && typeof li.item === 'object' && (li.item._id === itemId || li.item.id === itemId)))
                        );
                        if (lineItem) {
                            history.push({
                                type: 'transaction',
                                title: `${type} Created`,
                                description: `${type} ${tx[numberField] || 'N/A'} for ${tx[entityField]?.displayName || tx[entityField + "Name"] || 'N/A'}`,
                                quantity: lineItem.quantity || lineItem.quantityAdjusted || 0,
                                timestamp: tx.date || tx.createdAt,
                                status: tx.status,
                                color: 'bg-slate-400'
                            });
                        }
                    });
                }
            };

            processTransactions(quotes, 'Quote', 'quoteNumber', 'customer');
            processTransactions(invoices, 'Invoice', 'invoiceNumber', 'customer');
            processTransactions(creditNotes, 'Credit Note', 'creditNoteNumber', 'customer');
            processTransactions(receipts, 'Sales Receipt', 'receiptNumber', 'customer');

            // 3. System Update Milestone (if different from created)
            if (item.updatedAt && item.updatedAt !== item.createdAt) {
                history.push({
                    type: 'milestone',
                    title: 'Last System Update',
                    description: 'Detailed property modifications.',
                    timestamp: item.updatedAt,
                    color: 'bg-amber-400'
                });
            }

            // Sort by date descending
            setHistoryEvents(history.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
        } catch (error) {
            console.error("Error fetching history:", error);
        } finally {
            setIsLoadingHistory(false);
        }
    };

    const getStatusesForType = () => statusOptionsByType[txTypeFilter];


    const handleClone = () => {
        const clonedData = {
            ...item,
            name: item.name,
            sku: item.sku
        };

        // Remove sensitive/unique identifiers
        const fieldsToRemove = ['_id', 'id', '__v', 'createdAt', 'updatedAt'];
        fieldsToRemove.forEach(field => delete (clonedData as any)[field]);

        onClone(clonedData);
        setMoreDropdownOpen(false);
    };

    const handleToggleActive = async () => {
        setIsActionLoading(true);
        try {
            const isCurrentlyInactive = item.active === false || item.isActive === false || item.status === "Inactive";
            const targetState = isCurrentlyInactive; // If it was inactive, we want it to be active (true)
            const newStatus = isCurrentlyInactive ? "Active" : "Inactive";

            await onUpdate({
                active: targetState,
                isActive: targetState,
                status: newStatus
            });
            setMoreDropdownOpen(false);
        } catch (error) {
            console.error("Action failed:", error);
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
        if (!itemId) {
            toast.error("Item id is missing.");
            return;
        }
        if (!editingAssociatedPriceListId) return;

        const rate = editingRate.trim() === "" ? null : Number(editingRate);
        const discount = editingDiscount.trim() === "" ? null : Number(editingDiscount);

        if (rate !== null && (!Number.isFinite(rate) || rate < 0)) {
            toast.error("Enter a valid price.");
            return;
        }
        if (discount !== null && (!Number.isFinite(discount) || discount < 0 || discount > 100)) {
            toast.error("Enter a valid discount (0 - 100).");
            return;
        }

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
            {/* Top Navigation / Header */}
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
                        <button onClick={onEdit} className="p-1.5 border border-gray-200 rounded-md hover:bg-gray-50 text-gray-500 transition-colors" title="Edit">
                            <Pencil size={18} />
                        </button>
                    )}

                    {(canCreate || canEdit || canDelete) && (
                        <div className="relative" ref={moreDropdownRef}>
                            <button
                                onClick={() => setMoreDropdownOpen(!moreDropdownOpen)}
                                className="px-3 py-1.5 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors bg-white shadow-sm text-[13px] font-medium text-gray-700 inline-flex items-center gap-2"
                                title="More"
                            >
                                More
                                <ChevronDown size={16} className="text-gray-500" />
                            </button>
                            {moreDropdownOpen && (
                                <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-xl z-50 py-1 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                                    <div className="p-2 flex flex-col gap-1">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleClone();
                                            }}
                                            className="w-full px-3 py-2 text-sm text-left text-gray-700 bg-transparent rounded-md cursor-pointer hover:bg-gray-50 transition-colors font-medium"
                                        >
                                            Clone Item
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleToggleActive();
                                            }}
                                            disabled={isActionLoading}
                                            className="w-full px-3 py-2 text-sm text-left text-gray-700 bg-transparent rounded-md cursor-pointer hover:bg-gray-50 transition-colors font-medium"
                                        >
                                            {(item.active === false || item.isActive === false || item.status === "Inactive") ? "Mark as Active" : "Mark as Inactive"}
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onDelete(item.id || item._id || "");
                                                setMoreDropdownOpen(false);
                                            }}
                                            className="w-full px-3 py-2 text-sm text-left text-gray-700 bg-transparent rounded-md cursor-pointer hover:bg-gray-50 transition-colors font-medium"
                                        >
                                            Delete
                                        </button>
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

            {/* Tabs Bar */}
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

            {/* Main Content Area */}
            <div className="flex-1 overflow-y-auto p-6 scroll-smooth">
                {activeTab === "overview" && (
                    <div className="w-full">
                        <div className="grid grid-cols-1 lg:grid-cols-[540px_1fr] gap-8 border-b border-gray-200 pb-10">
                            <div className="space-y-5 pt-2">
                                <div className="grid grid-cols-[150px_1fr] items-center gap-4">
                                    <div className="text-[12px] text-gray-500">Item Type</div>
                                    <div className="text-[13px] text-gray-900">
                                        {item.type === "Service" ? "Services" : item.trackInventory ? "Inventory Items" : "Sales Items"}
                                    </div>
                                </div>
                                <div className="grid grid-cols-[150px_1fr] items-center gap-4">
                                    <div className="text-[12px] text-gray-500">SKU</div>
                                    <div className="text-[13px] text-gray-900">{item.sku || "-"}</div>
                                </div>
                                <div className="grid grid-cols-[150px_1fr] items-center gap-4">
                                    <div className="text-[12px] text-gray-500">Unit</div>
                                    <div className="text-[13px] text-gray-900">{item.unit || "-"}</div>
                                </div>
                                <div className="grid grid-cols-[150px_1fr] items-center gap-4">
                                    <div className="text-[12px] text-gray-500">Created Source</div>
                                    <div className="text-[13px] text-gray-900">User</div>
                                </div>
                                <div className="grid grid-cols-[150px_1fr] items-center gap-4">
                                    <div className="text-[12px] text-gray-500">Sales Tax</div>
                                    <div className="text-[13px] text-gray-900">
                                        {item.salesTax || (item.taxInfo ? `${item.taxInfo.taxName} [${item.taxInfo.taxRate}%]` : "-")}
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-start lg:justify-center">
                                <div className="w-full max-w-[280px]">
                                    <div
                                        className="border border-dashed border-gray-300 rounded-lg h-[230px] flex flex-col items-center justify-center bg-[#fafafa] text-center cursor-pointer transition-colors hover:bg-white relative overflow-hidden"
                                        onClick={() => canEdit && fileInputRef.current?.click()}
                                    >
                                        {item.images && item.images.length > 0 ? (
                                            <img src={item.images[0]} alt={item.name} className="absolute inset-0 h-full w-full object-cover" />
                                        ) : (
                                            <>
                                                <ImageIcon className="h-11 w-11 text-gray-400 mb-3" />
                                                <p className="text-[13px] text-gray-500 leading-tight">Drag image(s) here or</p>
                                                <span className="text-[13px] text-[#2563eb] font-medium mt-1">Browse images</span>
                                            </>
                                        )}
                                    </div>
                                    {item.images && item.images.length > 0 && (
                                        <div className="mt-2 flex items-center justify-between rounded-md border border-gray-200 px-3 py-2 text-[13px] text-gray-600">
                                            <button
                                                type="button"
                                                onClick={() => canEdit && fileInputRef.current?.click()}
                                                className="text-[#2563eb] hover:underline"
                                            >
                                                Change Image
                                            </button>
                                            <button
                                                type="button"
                                                onClick={handleRemoveImage}
                                                className="text-gray-500 hover:text-gray-700"
                                                title="Remove image"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="max-w-[760px] py-10 border-b border-gray-200">
                            <h3 className="text-[14px] font-semibold text-gray-900 mb-5">Sales Information</h3>
                            <div className="space-y-4">
                                <div className="grid grid-cols-[150px_1fr] items-center gap-4">
                                    <div className="text-[12px] text-gray-500">Selling Price</div>
                                    <div className="text-[13px] text-gray-900">{fmtMoney(item.sellingPrice || 0, currencySymbol)}</div>
                                </div>
                                <div className="grid grid-cols-[150px_1fr] items-center gap-4">
                                    <div className="text-[12px] text-gray-500">Sales Account</div>
                                    <div className="text-[13px] text-gray-900">{item.salesAccount || "-"}</div>
                                </div>
                                <div className="grid grid-cols-[150px_1fr] items-start gap-4">
                                    <div className="text-[12px] text-gray-500">Description</div>
                                    <div className="text-[13px] text-gray-900">{item.salesDescription || "-"}</div>
                                </div>
                            </div>
                        </div>

                        <div className="py-8">
                            <h3 className="text-[14px] font-semibold text-gray-900 mb-4">Reporting Tags</h3>
                            {item.tags && item.tags.length > 0 ? (
                                <div className="flex flex-wrap gap-2">
                                    {item.tags.map((tag: any, i: number) => (
                                        <span key={i} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-[10px] font-bold uppercase rounded border border-gray-200">
                                            {tag.groupName}: {tag.name}
                                        </span>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-[13px] text-gray-500">No reporting tag has been associated with this item.</p>
                            )}
                        </div>

                        <div className="pt-1">
                            <button
                                type="button"
                                onClick={() => setShowAssociatedPriceLists((prev) => {
                                    const next = !prev;
                                    if (next) loadAssociatedPriceLists();
                                    return next;
                                })}
                                className="text-[13px] text-[#2563eb] font-medium inline-flex items-center gap-2"
                            >
                                Associated Price Lists
                                <ChevronDown
                                    size={14}
                                    className={`transition-transform ${showAssociatedPriceLists ? "" : "-rotate-90"}`}
                                />
                            </button>

                            {showAssociatedPriceLists && (
                                <div className="mt-6 max-w-[760px] border-t border-gray-200 pt-5">
                                    <div className="grid grid-cols-[1fr_160px_160px_72px] text-[11px] font-semibold uppercase tracking-wide text-gray-500 px-2 py-2.5 bg-slate-50 border-y border-gray-200">
                                        <span>NAME</span>
                                        <span>PRICE</span>
                                        <span>DISCOUNT</span>
                                        <span />
                                    </div>

                                    {associatedPriceLists.length > 0 ? (
                                        <div className="border-b border-gray-200">
                                            {associatedPriceLists.map((pl) => {
                                                const isEditing = editingAssociatedPriceListId === pl.id;
                                                const displayRate = pl.rate ?? (Number(item.sellingPrice ?? item.rate ?? 0) || 0);
                                                const displayDiscount = pl.discount === null || pl.discount === undefined ? "-" : String(pl.discount);

                                                return (
                                                    <div
                                                        key={pl.id}
                                                        className="grid grid-cols-[1fr_160px_160px_72px] px-2 py-2.5 text-[13px] text-gray-700 group hover:bg-slate-50/60 transition-colors"
                                                    >
                                                        <span className="text-gray-900">{pl.name}</span>

                                                        {isEditing ? (
                                                            <div className="flex justify-end pr-3">
                                                                <input
                                                                    value={editingRate}
                                                                    onChange={(e) => setEditingRate(e.target.value)}
                                                                    className="h-9 w-[132px] rounded border border-gray-300 bg-white px-3 text-right text-[13px] outline-none focus:border-blue-400 transition-all"
                                                                    placeholder="0.00"
                                                                />
                                                            </div>
                                                        ) : (
                                                            <span className="text-gray-700 pr-3 text-right">{fmtMoney(displayRate, currencySymbol)}</span>
                                                        )}

                                                        {isEditing ? (
                                                            <div className="flex justify-end pr-3">
                                                                <input
                                                                    value={editingDiscount}
                                                                    onChange={(e) => setEditingDiscount(e.target.value)}
                                                                    className="h-9 w-[132px] rounded border border-gray-300 bg-white px-3 text-right text-[13px] outline-none focus:border-blue-400 transition-all"
                                                                    placeholder="-"
                                                                />
                                                            </div>
                                                        ) : (
                                                            <span className="text-gray-500 pr-3 text-right">{displayDiscount}</span>
                                                        )}

                                                        <div className="flex items-center justify-end gap-2 pr-1">
                                                            {isEditing ? (
                                                                <>
                                                                    <button
                                                                        type="button"
                                                                        onClick={saveEditAssociatedPriceList}
                                                                        className="w-8 h-8 rounded-full bg-emerald-500 text-white inline-flex items-center justify-center hover:bg-emerald-600 transition-colors"
                                                                        title="Save"
                                                                    >
                                                                        <Check size={16} />
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={cancelEditAssociatedPriceList}
                                                                        className="w-8 h-8 rounded-full bg-gray-200 text-gray-700 inline-flex items-center justify-center hover:bg-gray-300 transition-colors"
                                                                        title="Cancel"
                                                                    >
                                                                        <X size={16} />
                                                                    </button>
                                                                </>
                                                            ) : (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => startEditAssociatedPriceList(pl)}
                                                                    className="w-8 h-8 rounded-full border border-gray-200 bg-white text-gray-500 inline-flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-gray-50 transition-all"
                                                                    title="Edit"
                                                                >
                                                                    <Pencil size={16} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <div className="text-center py-9 px-4 text-[13px] text-gray-700 border-b border-gray-200">
                                            The sales price lists associated with this item will be displayed here.{" "}
                                            <button type="button" onClick={handleCreatePriceList} className="text-[#2563eb] hover:underline">
                                                Create Price List
                                            </button>
                                        </div>
                                    )}

                                    <button
                                        type="button"
                                        onClick={() => setShowAssociatePriceListModal(true)}
                                        className="mt-3 inline-flex items-center gap-2 text-[13px] text-gray-800 hover:text-gray-900"
                                    >
                                        <span className="w-5 h-5 rounded-full border border-[#2563eb] text-[#2563eb] inline-flex items-center justify-center">
                                            <Plus size={14} />
                                        </span>
                                        <span className="text-[#2563eb] font-medium">Associate Price List</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === "transactions" && (
                    <div className="flex flex-col gap-4">
                        {/* Filter Bar */}
                        <div className="flex flex-wrap items-center gap-3">
                            <div className="relative" ref={typeDropdownRef}>
                                <button
                                    onClick={() => setShowTypeDropdown(!showTypeDropdown)}
                                    className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-[#f5f5f5] hover:bg-white flex items-center gap-2 transition-colors"
                                >
                                    <span className="text-gray-500 font-normal">Filter By:</span> {txTypeFilter} <ChevronDown size={14} className="text-gray-600" />
                                </button>
                                {showTypeDropdown && (
                                    <div className="absolute left-0 mt-1 w-52 bg-white border border-gray-200 rounded-lg shadow-xl z-[300] py-1 antialiased">
                                        {txTypeMenuOptions.map(type => (
                                            <button
                                                key={type}
                                                onClick={() => { setTxTypeFilter(type); setStatusFilter("All"); setShowTypeDropdown(false); }}
                                                className={`mx-1 my-0.5 w-[calc(100%-8px)] text-left px-3 py-2 text-sm rounded-md border transition-colors ${txTypeFilter === type ? "bg-gray-100 text-gray-900 border-gray-200" : "text-gray-600 border-transparent hover:bg-gray-100"}`}
                                            >
                                                <span className="flex items-center justify-between gap-3">
                                                    <span>{type}</span>
                                                    {!isLoadingTxCounts ? (
                                                        <span className="text-[11px] text-gray-400">{txCountsByType[type] ?? 0}</span>
                                                    ) : null}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="relative" ref={statusDropdownRef}>
                                <button
                                    onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                                    className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-[#f5f5f5] hover:bg-white flex items-center gap-2 transition-colors"
                                >
                                    <span className="text-gray-500 font-normal">Status:</span> {statusFilter} <ChevronDown size={14} className="text-gray-600" />
                                </button>
                                {showStatusDropdown && (
                                    <div className="absolute left-0 mt-1 w-52 bg-white border border-gray-200 rounded-lg shadow-xl z-[300] py-1 antialiased">
                                        {getStatusesForType().map((status) => (
                                            <React.Fragment key={status.label}>
                                                {status.separator ? <div className="my-1 border-t border-gray-200" /> : null}
                                                <button
                                                    onClick={() => { setStatusFilter(status.label); setShowStatusDropdown(false); }}
                                                    className={`mx-1 my-0.5 w-[calc(100%-8px)] text-left px-3 py-2 text-sm rounded-md border transition-colors ${statusFilter === status.label ? "bg-gray-100 text-gray-900 border-gray-200" : "text-gray-600 border-transparent hover:bg-gray-100"}`}
                                                >
                                                    {status.label}
                                                </button>
                                            </React.Fragment>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Transactions Table */}
                        <div className="bg-white rounded-lg border border-gray-100 shadow-sm overflow-x-auto min-h-[400px]">
                            {isLoadingTransactions ? (
                                <div className="flex items-center justify-center h-64">
                                    <RefreshCw className="animate-spin text-blue-500" size={32} />
                                </div>
                            ) : transactions.length > 0 ? (
                                <table className="w-full text-left border-collapse min-w-[700px]">
                                    <thead className="bg-[#fcfdfe] border-b border-gray-100">
                                        <tr>
                                            <th className="px-6 py-2.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                                <div className="flex items-center gap-1 cursor-pointer hover:text-gray-600 uppercase">
                                                    Date <ArrowUpDown size={10} />
                                                </div>
                                            </th>
                                            <th className="px-6 py-2.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">{transactionNumberHeading[txTypeFilter]}</th>
                                            <th className="px-6 py-2.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">CUSTOMER NAME</th>
                                            <th className="px-6 py-2.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-right">QUANTITY SOLD</th>
                                            <th className="px-6 py-2.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-right">PRICE</th>
                                            <th className="px-6 py-2.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-right">TOTAL</th>
                                            <th className="px-6 py-2.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-center">STATUS</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {transactions.map((tx) => (
                                            <tr key={tx.id} className="hover:bg-blue-50/20 transition-colors group border-b border-gray-50 last:border-0">
                                                <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">
                                                    {new Date(tx.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                </td>
                                                <td className="px-6 py-4 text-sm font-medium text-blue-600 cursor-pointer hover:underline">{tx.reference}</td>
                                                <td className="px-6 py-4 text-sm text-gray-900">{tx.entity}</td>
                                                <td className="px-6 py-4 text-sm text-gray-600 text-right">{parseFloat(tx.quantity).toFixed(2)}</td>
                                                <td className="px-6 py-4 text-sm text-gray-600 text-right">{fmtMoney(tx.price, currencySymbol)}</td>
                                                <td className="px-6 py-4 text-sm font-bold text-gray-900 text-right">
                                                    {fmtMoney(tx.amount, currencySymbol)}
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className={`text-[13px] font-medium ${['paid', 'accepted', 'invoiced', 'adjusted'].includes(tx.status?.toLowerCase()) ? 'text-[#111827]' :
                                                        ['draft'].includes(tx.status?.toLowerCase()) ? 'text-gray-400' :
                                                            ['sent', 'open'].includes(tx.status?.toLowerCase()) ? 'text-blue-500' :
                                                                'text-orange-500'
                                                        }`}>
                                                        {tx.status?.charAt(0).toUpperCase() + tx.status?.slice(1)}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-64 text-center">
                                    <div className="bg-gray-50 p-4 rounded-full mb-4">
                                        <RefreshCw className="text-gray-200" size={32} />
                                    </div>
                                    <h4 className="text-sm font-semibold text-gray-900 mb-1">No transactions found</h4>
                                    <p className="text-xs text-gray-400">There are no {txTypeFilter.toLowerCase()} found matching your filter.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
                {activeTab === "history" && (
                    <div className="bg-white rounded-lg border border-gray-100 shadow-sm overflow-hidden p-8">
                        {isLoadingHistory ? (
                            <div className="flex items-center justify-center py-20">
                                <RefreshCw className="animate-spin text-blue-500" size={32} />
                            </div>
                        ) : historyEvents.length > 0 ? (
                            <div className="relative border-l-2 border-gray-100 pl-8 ml-4 space-y-12">
                                {historyEvents.map((event, idx) => (
                                    <div key={idx} className="relative">
                                        <div className={`absolute -left-[41px] top-1 rounded-full w-4 h-4 border-4 border-white shadow-sm ${event.color}`}></div>
                                        <div className="flex flex-col">
                                            <div className="flex items-center gap-3 mb-1">
                                                <span className="text-sm font-bold text-gray-900">{event.title}</span>
                                                {event.status && (
                                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 font-medium uppercase tracking-wider">
                                                        {event.status}
                                                    </span>
                                                )}
                                            </div>
                                            <span className="text-xs text-gray-500 mb-2">{event.description}</span>
                                            {event.quantity !== undefined && (
                                                <div className="mb-2">
                                                    <span className="text-[11px] font-medium text-slate-700 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                                                        Quantity: {event.quantity} {item.unit || 'units'}
                                                    </span>
                                                </div>
                                            )}
                                            <div className="bg-gray-50/80 rounded-md px-3 py-1.5 text-[11px] text-gray-600 font-mono inline-block w-fit border border-gray-100">
                                                {new Date(event.timestamp).toLocaleString('en-US', {
                                                    month: 'numeric',
                                                    day: 'numeric',
                                                    year: 'numeric',
                                                    hour: 'numeric',
                                                    minute: '2-digit',
                                                    second: '2-digit',
                                                    hour12: true
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                <div className="absolute -left-[2px] bottom-0 w-[2px] h-4 bg-white"></div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-20 text-center">
                                <div className="bg-gray-50 p-4 rounded-full mb-4">
                                    <Clock className="text-gray-200" size={32} />
                                </div>
                                <h4 className="text-sm font-semibold text-gray-900 mb-1">No history found</h4>
                                <p className="text-xs text-gray-400">There is no history recorded for this item yet.</p>
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
                    <div className="w-full max-w-xl bg-white rounded-lg shadow-2xl border border-gray-200 overflow-hidden">
                        <div className="flex items-center justify-between border-b px-6 py-3">
                            <h2 className="text-lg font-normal text-gray-800">Associate Price List</h2>
                            <button
                                type="button"
                                onClick={() => setShowAssociatePriceListModal(false)}
                                className="text-gray-400 hover:text-gray-600 transition-colors"
                                aria-label="Close"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="bg-gray-50">
                            <div className="px-6 py-6">
                                <div className="grid grid-cols-[180px_1fr] items-center gap-4">
                                    <div className="flex items-center gap-1 text-[13px]">
                                        <span className="text-[#ef4444]">Select Price List*</span>
                                    </div>
                                    <select
                                        value={selectedPriceListId}
                                        onChange={(e) => setSelectedPriceListId(e.target.value)}
                                        className="h-[34px] w-full appearance-none rounded border border-gray-300 bg-white px-3 pr-8 text-[13px] outline-none focus:border-blue-400 cursor-pointer transition-all"
                                    >
                                        <option value="">Select a Price List</option>
                                        {priceListOptions.map((pl) => (
                                            <option key={pl.id} value={pl.id}>
                                                {pl.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="border-t bg-gray-50 px-6 py-4">
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={handleSaveAssociation}
                                    className="cursor-pointer transition-all text-white px-8 py-1.5 rounded-lg border-[#0D4A52] border-b-[4px] hover:brightness-110 hover:-translate-y-[1px] hover:border-b-[6px] active:border-b-[2px] active:brightness-90 active:translate-y-[2px] flex items-center gap-2 text-[13px] font-semibold"
                                    style={{ background: "linear-gradient(90deg, #156372 0%, #0D4A52 100%)" }}
                                >
                                    Save
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowAssociatePriceListModal(false)}
                                    className="cursor-pointer transition-all bg-white text-slate-600 px-8 py-1.5 rounded-lg border-slate-200 border border-b-[4px] hover:bg-slate-50 active:border-b-[2px] active:translate-y-[2px] text-[13px] font-semibold"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <input
                ref={fileInputRef}
                type="file"
                hidden
                accept="image/*"
                onChange={handleImageUpload}
            />
        </div>
    );
}


