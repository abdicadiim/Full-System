import React, { useEffect, useMemo, useRef, useState } from "react";
import {
    AlignLeft,
    ArrowDownUp,
    ChevronDown,
    ChevronRight,
    Download,
    MoreHorizontal,
    Plus,
    RotateCcw,
    Search,
    SlidersHorizontal,
    Upload,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import PlansCustomizeColumnsModal, { ColumnConfig } from "./components/PlansCustomizeColumnsModal";
import PlansBulkActions from "./components/PlansBulkActions";
import PlansBulkUpdateModal from "./components/PlansBulkUpdateModal";
import NewProductModal from "./newProduct/NewProductModal";

type TabType = "plans" | "products";
type ImportEntity = "plans" | "products";

type PlanRow = {
    id: string;
    plan: string;
    product: string;
    planCode: string;
    description: string;
    status: string;
    pricingModel: string;
    billingFrequency: string;
    price: number;
    billingCycle: string;
    createdOn: string;
    internalName: string;
    planFamily: string;
    trialDays: number;
    unitName: string;
};

type ProductRow = {
    id: string;
    name: string;
    description: string;
    status: string;
    plans: number;
    addons: number;
    coupons: number;
    creationDate: string;
    emailRecipients: string;
    redirectionUrl: string;
};

const PLANS_STORAGE_KEY = "inv_plans_v1";
const PRODUCTS_STORAGE_KEY = "inv_products_v1";
const ADDONS_STORAGE_KEY = "inv_addons_v1";
const COUPONS_STORAGE_KEY = "inv_coupons_v1";
const PLAN_COLUMNS_STORAGE_KEY = "taban_plan_columns_v1";
const PRODUCT_COLUMNS_STORAGE_KEY = "taban_product_columns_v1";
const MIN_COLUMN_WIDTH = 100;
const MAX_COLUMN_WIDTH = 900;

const DEFAULT_PLAN_COLUMNS: ColumnConfig[] = [
    { key: "plan", label: "PLAN", visible: true, pinned: true, locked: true, width: 220 },
    { key: "product", label: "PRODUCT", visible: true, width: 160 },
    { key: "planCode", label: "PLAN CODE", visible: true, width: 170 },
    { key: "description", label: "DESCRIPTION", visible: true, width: 420 },
    { key: "status", label: "STATUS", visible: true, width: 120 },
    { key: "pricingModel", label: "PRICING MODEL", visible: true, width: 140 },
    { key: "billingFrequency", label: "BILLING FREQUENCY", visible: true, width: 160 },
    { key: "price", label: "PRICE", visible: true, width: 130 },
    { key: "billingCycle", label: "BILLING CYCLE", visible: false, width: 150 },
    { key: "createdOn", label: "CREATED ON", visible: false, width: 170 },
    { key: "internalName", label: "INTERNAL NAME", visible: false, width: 170 },
    { key: "planFamily", label: "PLAN FAMILY", visible: false, width: 160 },
    { key: "trialDays", label: "TRIAL DAYS", visible: false, width: 130 },
    { key: "unitName", label: "UNIT NAME", visible: false, width: 140 },
];

const DEFAULT_PRODUCT_COLUMNS: ColumnConfig[] = [
    { key: "name", label: "Name", visible: true, locked: true, width: 220 },
    { key: "description", label: "Description", visible: true, width: 420 },
    { key: "status", label: "Status", visible: true, width: 140 },
    { key: "plans", label: "Plans", visible: true, width: 120 },
    { key: "addons", label: "Addons", visible: true, width: 120 },
    { key: "coupons", label: "Coupons", visible: true, width: 120 },
    { key: "creationDate", label: "Creation Date", visible: false, width: 160 },
    { key: "emailRecipients", label: "Email Recipients", visible: false, width: 160 },
    { key: "redirectionUrl", label: "Redirection URL", visible: false, width: 160 },
];

const clampColumnWidth = (value: unknown, fallback = 160) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
        return fallback;
    }
    return Math.max(MIN_COLUMN_WIDTH, Math.min(MAX_COLUMN_WIDTH, parsed));
};

const orderVisibleColumns = (columns: ColumnConfig[]) => {
    const visible = columns.filter((c) => c.visible);
    const pinned = visible.filter((c) => c.pinned);
    const normal = visible.filter((c) => !c.pinned);
    return [...pinned, ...normal];
};

const readLocalRows = (key: string) => {
    try {
        const raw = localStorage.getItem(key);
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
};

const writeLocalRows = (key: string, rows: any[]) => {
    localStorage.setItem(key, JSON.stringify(rows));
};

const normalizePlan = (row: any): PlanRow => {
    const fallbackId = `plan-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const billingFrequency = row?.billingFrequency
        ? String(row.billingFrequency)
        : `${row?.billingFrequencyValue || "1"} ${String(row?.billingFrequencyPeriod || "Month(s)").toLowerCase()}`;
    return {
        id: String(row?.id || row?._id || fallbackId),
        plan: String(row?.plan || row?.planName || row?.name || "").trim(),
        product: String(row?.product || "").trim(),
        planCode: String(row?.planCode || row?.code || "").trim(),
        description: String(row?.planDescription || row?.description || "").trim(),
        status: String(row?.status || "Active"),
        pricingModel: String(row?.pricingModel || "Unit"),
        billingFrequency: String(billingFrequency || "1 month(s)"),
        price: Number(row?.price || 0),
        billingCycle: String(row?.billingCycle || row?.billing_cycle || "").trim(),
        createdOn: String(row?.createdOn || row?.createdAt || row?.created_at || "").trim(),
        internalName: String(row?.internalName || row?.internal_name || row?.name || "").trim(),
        planFamily: String(row?.planFamily || row?.plan_family || "").trim(),
        trialDays: Number(row?.trialDays ?? row?.trial_days ?? 0),
        unitName: String(row?.unitName || row?.unit_name || row?.unit || "").trim(),
    };
};

const normalizeProduct = (row: any): ProductRow => {
    const fallbackId = `prod-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    return {
        id: String(row?.id || row?._id || fallbackId),
        name: String(row?.name || row?.product || "").trim(),
        description: String(row?.description || "").trim(),
        status: String(row?.status || "Active"),
        plans: Number(row?.plans || 0),
        addons: Number(row?.addons || 0),
        coupons: Number(row?.coupons || 0),
        creationDate: String(row?.creationDate || row?.createdAt || ""),
        emailRecipients: String(row?.emailRecipients || ""),
        redirectionUrl: String(row?.redirectionUrl || ""),
    };
};

const loadColumns = (key: string, defaults: ColumnConfig[]) => {
    try {
        const raw = localStorage.getItem(key);
        const parsed = raw ? JSON.parse(raw) : [];
        if (!Array.isArray(parsed)) {
            return defaults.map((col) => ({
                ...col,
                visible: col.locked ? true : col.visible,
                pinned: col.locked ? true : Boolean(col.pinned),
                width: clampColumnWidth(col.width, 160),
            }));
        }
        return defaults.map((d) => {
            const match = parsed.find((p: any) => p?.key === d.key);
            if (!match) {
                return {
                    ...d,
                    visible: d.locked ? true : d.visible,
                    pinned: d.locked ? true : Boolean(d.pinned),
                    width: clampColumnWidth(d.width, 160),
                };
            }
            return {
                ...d,
                ...match,
                visible: d.locked ? true : (typeof match?.visible === "boolean" ? match.visible : d.visible),
                pinned: d.locked ? true : Boolean(match?.pinned ?? d.pinned),
                locked: d.locked,
                width: clampColumnWidth(match?.width, clampColumnWidth(d.width, 160)),
            };
        });
    } catch {
        return defaults.map((col) => ({
            ...col,
            visible: col.locked ? true : col.visible,
            pinned: col.locked ? true : Boolean(col.pinned),
            width: clampColumnWidth(col.width, 160),
        }));
    }
};

const toCsv = (headers: string[], rows: string[][]) => {
    const escape = (value: string) => {
        const safe = String(value ?? "");
        if (safe.includes(",") || safe.includes('"') || safe.includes("\n")) {
            return `"${safe.replace(/"/g, '""')}"`;
        }
        return safe;
    };
    return [headers.map(escape).join(","), ...rows.map((r) => r.map(escape).join(","))].join("\n");
};

const normalizeProductKey = (value: unknown) => String(value || "").trim().toLowerCase();

const buildProductCountMap = (rows: any[], productField: string) => {
    const counts = new Map<string, number>();
    rows.forEach((row) => {
        const key = normalizeProductKey(row?.[productField]);
        if (!key) return;
        counts.set(key, (counts.get(key) || 0) + 1);
    });
    return counts;
};

export default function PlansPage() {
    const navigate = useNavigate();
    const location = useLocation();

    const [tab, setTab] = useState<TabType>("plans");
    const [planStatusFilter, setPlanStatusFilter] = useState<"All Plans" | "Active Plans" | "Inactive Plans">("All Plans");
    const [productStatusFilter, setProductStatusFilter] = useState<"All Products" | "Active Products" | "Inactive Products">("All Products");
    const [allPlansDropdownOpen, setAllPlansDropdownOpen] = useState(false);
    const [allProductsDropdownOpen, setAllProductsDropdownOpen] = useState(false);
    const [newDropdownOpen, setNewDropdownOpen] = useState(false);
    const [moreDropdownOpen, setMoreDropdownOpen] = useState(false);
    const [sortSubMenuOpen, setSortSubMenuOpen] = useState(false);
    const [tableToolsOpen, setTableToolsOpen] = useState(false);
    const [clipText, setClipText] = useState(false);
    const [importEntity, setImportEntity] = useState<ImportEntity | null>(null);
    const [customizeOpen, setCustomizeOpen] = useState(false);
    const [bulkUpdateOpen, setBulkUpdateOpen] = useState(false);
    const [newProductModalOpen, setNewProductModalOpen] = useState(false);

    const [plans, setPlans] = useState<PlanRow[]>([]);
    const [products, setProducts] = useState<ProductRow[]>([]);
    const [addons, setAddons] = useState<any[]>([]);
    const [coupons, setCoupons] = useState<any[]>([]);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    const [sortKey, setSortKey] = useState("plan");
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

    const [planColumns, setPlanColumns] = useState<ColumnConfig[]>(() =>
        loadColumns(PLAN_COLUMNS_STORAGE_KEY, DEFAULT_PLAN_COLUMNS)
    );
    const [productColumns, setProductColumns] = useState<ColumnConfig[]>(() =>
        loadColumns(PRODUCT_COLUMNS_STORAGE_KEY, DEFAULT_PRODUCT_COLUMNS)
    );

    const allPlansRef = useRef<HTMLDivElement>(null);
    const allProductsRef = useRef<HTMLDivElement>(null);
    const newRef = useRef<HTMLDivElement>(null);
    const moreRef = useRef<HTMLDivElement>(null);
    const tableToolsRef = useRef<HTMLDivElement>(null);
    const resizingRef = useRef<{ key: string; startX: number; startWidth: number } | null>(null);

    useEffect(() => {
        const loadData = () => {
            const localPlans = readLocalRows(PLANS_STORAGE_KEY).map(normalizePlan).filter((row: PlanRow) => row.plan);
            const localProducts = readLocalRows(PRODUCTS_STORAGE_KEY).map(normalizeProduct).filter((row: ProductRow) => row.name);
            const localAddons = readLocalRows(ADDONS_STORAGE_KEY);
            const localCoupons = readLocalRows(COUPONS_STORAGE_KEY);
            setPlans(localPlans);
            setProducts(localProducts);
            setAddons(Array.isArray(localAddons) ? localAddons : []);
            setCoupons(Array.isArray(localCoupons) ? localCoupons : []);
        };

        loadData();

        const onStorage = () => loadData();
        window.addEventListener("storage", onStorage);
        return () => window.removeEventListener("storage", onStorage);
    }, []);

    useEffect(() => {
        localStorage.setItem(PLAN_COLUMNS_STORAGE_KEY, JSON.stringify(planColumns));
    }, [planColumns]);

    useEffect(() => {
        localStorage.setItem(PRODUCT_COLUMNS_STORAGE_KEY, JSON.stringify(productColumns));
    }, [productColumns]);

    useEffect(() => {
        const qTab = new URLSearchParams(location.search).get("tab");
        if (qTab === "products" || qTab === "plans") {
            setTab(qTab);
        }
    }, [location.search]);

    useEffect(() => {
        const onClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            if (allPlansRef.current && !allPlansRef.current.contains(target)) setAllPlansDropdownOpen(false);
            if (allProductsRef.current && !allProductsRef.current.contains(target)) setAllProductsDropdownOpen(false);
            if (newRef.current && !newRef.current.contains(target)) setNewDropdownOpen(false);
            if (moreRef.current && !moreRef.current.contains(target)) {
                setMoreDropdownOpen(false);
                setSortSubMenuOpen(false);
            }
            if (tableToolsRef.current && !tableToolsRef.current.contains(target)) setTableToolsOpen(false);
        };
        document.addEventListener("mousedown", onClickOutside);
        return () => document.removeEventListener("mousedown", onClickOutside);
    }, []);

    const setColumnWidth = (columnKey: string, width: number) => {
        const safeWidth = clampColumnWidth(width, 160);
        if (tab === "plans") {
            setPlanColumns((prev) =>
                prev.map((col) => (col.key === columnKey ? { ...col, width: safeWidth } : col))
            );
            return;
        }
        setProductColumns((prev) =>
            prev.map((col) => (col.key === columnKey ? { ...col, width: safeWidth } : col))
        );
    };

    const resetColumnWidths = () => {
        const defaults = tab === "plans" ? DEFAULT_PLAN_COLUMNS : DEFAULT_PRODUCT_COLUMNS;
        const defaultWidthMap = new Map(
            defaults.map((col) => [col.key, clampColumnWidth(col.width, 160)])
        );

        if (tab === "plans") {
            setPlanColumns((prev) =>
                prev.map((col) => ({
                    ...col,
                    width: defaultWidthMap.get(col.key) ?? clampColumnWidth(col.width, 160),
                }))
            );
        } else {
            setProductColumns((prev) =>
                prev.map((col) => ({
                    ...col,
                    width: defaultWidthMap.get(col.key) ?? clampColumnWidth(col.width, 160),
                }))
            );
        }

        toast.success("Column widths reset");
        setMoreDropdownOpen(false);
        setSortSubMenuOpen(false);
    };

    const startResizing = (columnKey: string, event: React.MouseEvent) => {
        event.preventDefault();
        event.stopPropagation();
        const sourceColumns = tab === "plans" ? planColumns : productColumns;
        const col = sourceColumns.find((item) => item.key === columnKey);
        if (!col) return;

        resizingRef.current = {
            key: columnKey,
            startX: event.clientX,
            startWidth: clampColumnWidth(col.width, 160),
        };
        document.body.style.cursor = "col-resize";
        document.body.style.userSelect = "none";
    };

    useEffect(() => {
        const onMouseMove = (event: MouseEvent) => {
            if (!resizingRef.current) return;
            const { key, startX, startWidth } = resizingRef.current;
            const delta = event.clientX - startX;
            setColumnWidth(key, startWidth + delta);
        };

        const onMouseUp = () => {
            resizingRef.current = null;
            document.body.style.cursor = "default";
            document.body.style.userSelect = "auto";
        };

        document.addEventListener("mousemove", onMouseMove);
        document.addEventListener("mouseup", onMouseUp);
        return () => {
            document.removeEventListener("mousemove", onMouseMove);
            document.removeEventListener("mouseup", onMouseUp);
        };
    }, [tab]);

    const visibleColumns = tab === "plans" ? orderVisibleColumns(planColumns) : orderVisibleColumns(productColumns);
    const getEffectiveColumnWidth = (col: ColumnConfig) => {
        const baseWidth = clampColumnWidth(col.width, 160);
        if (/tax/i.test(col.key)) {
            return Math.max(88, Math.min(baseWidth, 102));
        }
        return baseWidth;
    };

    const displayedPlans = useMemo(() => {
        const filtered = plans.filter((row) => {
            if (planStatusFilter === "Active Plans") return row.status.toLowerCase() === "active";
            if (planStatusFilter === "Inactive Plans") return row.status.toLowerCase() === "inactive";
            return true;
        });
        const sorted = [...filtered].sort((a: any, b: any) => {
            const aVal = a?.[sortKey];
            const bVal = b?.[sortKey];
            const cmp =
                typeof aVal === "number" && typeof bVal === "number"
                    ? aVal - bVal
                    : String(aVal || "").localeCompare(String(bVal || ""), undefined, { sensitivity: "base" });
            return sortOrder === "asc" ? cmp : -cmp;
        });
        return sorted;
    }, [plans, planStatusFilter, sortKey, sortOrder]);

    const displayedProducts = useMemo(() => {
        const filtered = products.filter((row) => {
            if (productStatusFilter === "Active Products") return row.status.toLowerCase() === "active";
            if (productStatusFilter === "Inactive Products") return row.status.toLowerCase() === "inactive";
            return true;
        });
        const sorted = [...filtered].sort((a: any, b: any) => {
            const aVal = a?.[sortKey];
            const bVal = b?.[sortKey];
            const cmp =
                typeof aVal === "number" && typeof bVal === "number"
                    ? aVal - bVal
                    : String(aVal || "").localeCompare(String(bVal || ""), undefined, { sensitivity: "base" });
            return sortOrder === "asc" ? cmp : -cmp;
        });
        return sorted;
    }, [products, productStatusFilter, sortKey, sortOrder]);

    const planCountByProduct = useMemo(
        () => buildProductCountMap(plans, "product"),
        [plans]
    );
    const addonCountByProduct = useMemo(
        () => buildProductCountMap(addons, "product"),
        [addons]
    );
    const couponCountByProduct = useMemo(
        () => buildProductCountMap(coupons, "product"),
        [coupons]
    );

    const currentRows = tab === "plans" ? displayedPlans : displayedProducts;

    const handleNew = () => {
        if (tab === "products") {
            setNewProductModalOpen(true);
            return;
        }
        navigate("/products/plans/new");
    };

    const handleExport = () => {
        const headers = visibleColumns.map((col) => col.label);
        const rows = currentRows.map((row: any) =>
            visibleColumns.map((col) => {
                if (col.key === "price") return String(row.price ?? 0);
                return String(row[col.key] ?? "");
            })
        );
        const csv = toCsv(headers, rows);
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const fileName = tab === "plans" ? "plans-export.csv" : "products-export.csv";
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
        setMoreDropdownOpen(false);
        setSortSubMenuOpen(false);
        toast.success(`${tab === "plans" ? "Plans" : "Products"} exported`);
    };

    const handleImport = (entity: ImportEntity, rows: Record<string, string>[]) => {
        if (entity === "plans") {
            const existing = readLocalRows(PLANS_STORAGE_KEY);
            const prepared = rows.map((row) => {
                const billingRaw = String(row.billingFrequency || "1 month(s)");
                const matched = billingRaw.match(/^(\d+)\s*(.*)$/);
                const billingFrequencyValue = matched?.[1] || "1";
                const billingFrequencyPeriod = matched?.[2] || "Month(s)";
                return {
                    id: `plan-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
                    planName: row.planName || "",
                    product: row.product || "",
                    planCode: row.planCode || "",
                    planDescription: row.planDescription || "",
                    status: row.status || "Active",
                    pricingModel: row.pricingModel || "Unit",
                    billingFrequency: billingRaw,
                    billingFrequencyValue,
                    billingFrequencyPeriod,
                    price: Number(row.price || 0),
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                };
            });
            writeLocalRows(PLANS_STORAGE_KEY, [...prepared, ...existing]);
            setPlans([...prepared, ...existing].map(normalizePlan).filter((r) => r.plan));
            toast.success(`${prepared.length} plan(s) imported`);
        } else {
            const existing = readLocalRows(PRODUCTS_STORAGE_KEY);
            const prepared = rows.map((row) => ({
                id: `prod-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
                name: row.name || "",
                description: row.description || "",
                status: row.status || "Active",
                plans: 0,
                addons: 0,
                coupons: 0,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            }));
            writeLocalRows(PRODUCTS_STORAGE_KEY, [...prepared, ...existing]);
            setProducts([...prepared, ...existing].map(normalizeProduct).filter((r) => r.name));
            toast.success(`${prepared.length} product(s) imported`);
        }
        setImportEntity(null);
        setMoreDropdownOpen(false);
        setSortSubMenuOpen(false);
    };

    const handleBulkMarkStatus = (status: string) => {
        const storageKey = tab === "plans" ? PLANS_STORAGE_KEY : PRODUCTS_STORAGE_KEY;
        const currentItems = readLocalRows(storageKey);
        const updated = currentItems.map((item: any) => {
            const id = String(item.id || item._id);
            if (selectedIds.includes(id)) {
                return { ...item, status };
            }
            return item;
        });
        writeLocalRows(storageKey, updated);
        if (tab === "plans") {
            setPlans(updated.map(normalizePlan).filter((r: PlanRow) => r.plan));
        } else {
            setProducts(updated.map(normalizeProduct).filter((r: ProductRow) => r.name));
        }
        setSelectedIds([]);
        toast.success(`Selected ${tab} marked as ${status}`);
    };

    const handleBulkDelete = () => {
        if (!window.confirm(`Are you sure you want to delete ${selectedIds.length} selected ${tab}?`)) return;
        const storageKey = tab === "plans" ? PLANS_STORAGE_KEY : PRODUCTS_STORAGE_KEY;
        const currentItems = readLocalRows(storageKey);
        const updated = currentItems.filter((item: any) => {
            const id = String(item.id || item._id);
            return !selectedIds.includes(id);
        });
        writeLocalRows(storageKey, updated);
        if (tab === "plans") {
            setPlans(updated.map(normalizePlan).filter((r: PlanRow) => r.plan));
        } else {
            setProducts(updated.map(normalizeProduct).filter((r: ProductRow) => r.name));
        }
        setSelectedIds([]);
        toast.success(`Selected ${tab} deleted`);
    };

    const handleBulkUpdate = (field: string, newValue: string) => {
        const storageKey = tab === "plans" ? PLANS_STORAGE_KEY : PRODUCTS_STORAGE_KEY;
        const currentItems = readLocalRows(storageKey);
        const now = new Date().toISOString();
        const updated = currentItems.map((item: any) => {
            const id = String(item.id || item._id);
            if (selectedIds.includes(id)) {
                if (tab === "plans") {
                    if (field === "description") {
                        return { ...item, planDescription: newValue, description: newValue, updatedAt: now };
                    }
                    if (field === "salesAccount") {
                        return { ...item, account: newValue, salesAccount: newValue, updatedAt: now };
                    }
                    if (field === "showInWidget") {
                        const boolValue = String(newValue).toLowerCase() === "true";
                        return { ...item, showInWidget: boolValue, includeInWidget: boolValue, updatedAt: now };
                    }
                    if (field === "showInPortal") {
                        const boolValue = String(newValue).toLowerCase() === "true";
                        return { ...item, showInPortal: boolValue, updatedAt: now };
                    }
                    if (field === "price") {
                        const parsedPrice = Number(newValue);
                        return { ...item, price: Number.isFinite(parsedPrice) ? parsedPrice : item?.price, updatedAt: now };
                    }
                }
                return { ...item, [field]: newValue, updatedAt: now };
            }
            return item;
        });
        writeLocalRows(storageKey, updated);
        if (tab === "plans") {
            setPlans(updated.map(normalizePlan).filter((r: PlanRow) => r.plan));
        } else {
            setProducts(updated.map(normalizeProduct).filter((r: ProductRow) => r.name));
        }
        setBulkUpdateOpen(false);
        setSelectedIds([]);
        toast.success(`Selected ${tab} updated successfully`);
    };

    const sortFields =
        tab === "plans"
            ? [
                { key: "plan", label: "Plan" },
                { key: "product", label: "Product" },
                { key: "planCode", label: "Plan Code" },
                { key: "price", label: "Price" },
            ]
            : [
                { key: "name", label: "Name" },
                { key: "status", label: "Status" },
            ];

    const PLAN_ROW_TEXT_COLOR = "#0f172a";
    const PLAN_ACTIVE_STATUS_COLOR = "#0f172a";
    const PLAN_INACTIVE_STATUS_COLOR = "#6b7f7a";

    const renderCell = (row: any, colKey: string) => {
        const raw = row?.[colKey];
        const isTaxColumn = /tax/i.test(colKey);
        if (tab === "products" && (colKey === "plans" || colKey === "addons" || colKey === "coupons")) {
            const key = normalizeProductKey(row?.name);
            const count =
                colKey === "plans"
                    ? planCountByProduct.get(key) || 0
                    : colKey === "addons"
                        ? addonCountByProduct.get(key) || 0
                        : couponCountByProduct.get(key) || 0;
            return count > 0 ? String(count) : "-";
        }
        if (tab === "plans" && colKey === "plan") {
            return (
                <span className="font-medium text-[#0f172a]">
                    {String(raw || "-")}
                </span>
            );
        }
        if (tab === "products" && colKey === "name") {
            return (
                <span className="font-medium text-[#0f172a]">
                    {String(raw || "-")}
                </span>
            );
        }
        if (colKey === "status") {
            const status = String(raw || "").toLowerCase();
            return (
                <span
                    style={{
                        color:
                            status === "active"
                                ? PLAN_ACTIVE_STATUS_COLOR
                                : status === "inactive"
                                    ? PLAN_INACTIVE_STATUS_COLOR
                                    : PLAN_ROW_TEXT_COLOR,
                    }}
                >
                    {raw || "-"}
                </span>
            );
        }
        if (isTaxColumn) {
            return <span className="text-[12px]" style={{ color: PLAN_ROW_TEXT_COLOR }}>{String(raw || "-")}</span>;
        }
        if (colKey === "trialDays") {
            const hasValue = raw !== null && raw !== undefined && raw !== "";
            return <span style={{ color: PLAN_ROW_TEXT_COLOR }}>{hasValue ? String(raw) : "-"}</span>;
        }
        if (colKey === "price") {
            return <span style={{ color: PLAN_ROW_TEXT_COLOR }}>AMD{Number(raw || 0).toFixed(2)}</span>;
        }
        return (
            <span className={clipText ? "block max-w-[220px] truncate" : ""} style={{ color: PLAN_ROW_TEXT_COLOR }}>
                {String(raw || "-")}
            </span>
        );
    };

    const allSelected = currentRows.length > 0 && selectedIds.length === currentRows.length;

    return (
        <div className="flex flex-col h-full min-h-0 w-full bg-white font-sans text-gray-800 antialiased relative overflow-hidden">
            {selectedIds.length > 0 ? (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between px-6 py-3 border-b border-gray-100 bg-white gap-2 sm:h-[57px]">
                    <PlansBulkActions
                        selectedCount={selectedIds.length}
                        onClear={() => setSelectedIds([])}
                        onMarkActive={() => handleBulkMarkStatus("Active")}
                        onMarkInactive={() => handleBulkMarkStatus("Inactive")}
                        onDelete={handleBulkDelete}
                        onBulkUpdate={() => setBulkUpdateOpen(true)}
                    />
                </div>
            ) : (
                <div className="flex-none flex items-center justify-between px-6 py-6 border-b border-gray-100 bg-white relative overflow-visible z-30">
                    <div className="flex items-center gap-6 pl-4">
                        <div className="relative" ref={allPlansRef}>
                            <button
                                onClick={() => {
                                    if (tab === "plans") {
                                        setAllPlansDropdownOpen((prev) => !prev);
                                    } else {
                                        setTab("plans");
                                        setAllProductsDropdownOpen(false);
                                    }
                                }}
                                className={`flex items-center gap-1.5 py-4 text-[15px] font-bold border-b-2 -mb-[1px] ${tab === "plans" ? "text-slate-900 border-slate-900" : "text-slate-500 border-transparent hover:text-slate-700"
                                    }`}
                            >
                                {tab === "plans" ? "All Plans" : "Plans"}
                                {tab === "plans" ? <ChevronDown size={14} className="text-[#2563eb]" /> : null}
                            </button>
                            {tab === "plans" && allPlansDropdownOpen && (
                                <div className="absolute left-0 top-full z-[120] mt-1 w-48 rounded-md border border-gray-200 bg-white py-1 shadow-xl">
                                    {(["All Plans", "Active Plans", "Inactive Plans"] as const).map((option) => (
                                        <button
                                            key={option}
                                            onClick={() => {
                                                setPlanStatusFilter(option);
                                                setAllPlansDropdownOpen(false);
                                            }}
                                            className={`w-full px-4 py-2 text-left text-sm ${planStatusFilter === option ? "bg-blue-50 text-blue-700" : "text-slate-700 hover:bg-gray-50"
                                                }`}
                                        >
                                            {option}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="relative" ref={allProductsRef}>
                            <button
                                onClick={() => {
                                    if (tab === "products") {
                                        setAllProductsDropdownOpen((prev) => !prev);
                                    } else {
                                        setTab("products");
                                        setAllPlansDropdownOpen(false);
                                    }
                                }}
                                className={`flex items-center gap-1.5 py-4 text-[15px] font-bold border-b-2 -mb-[1px] ${tab === "products" ? "text-slate-900 border-slate-900" : "text-slate-500 border-transparent hover:text-slate-700"
                                    }`}
                            >
                                {tab === "products" ? "All Products" : "Products"}
                                {tab === "products" ? <ChevronDown size={14} className="text-[#2563eb]" /> : null}
                            </button>
                            {tab === "products" && allProductsDropdownOpen && (
                                <div className="absolute left-0 top-full z-[120] mt-1 w-48 rounded-md border border-gray-200 bg-white py-1 shadow-xl">
                                    {(["All Products", "Active Products", "Inactive Products"] as const).map((option) => (
                                        <button
                                            key={option}
                                            onClick={() => {
                                                setProductStatusFilter(option);
                                                setAllProductsDropdownOpen(false);
                                            }}
                                            className={`w-full px-4 py-2 text-left text-sm ${productStatusFilter === option ? "bg-blue-50 text-blue-700" : "text-slate-700 hover:bg-gray-50"
                                                }`}
                                        >
                                            {option}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 sm:gap-2 mr-4">
                        <div className="relative" ref={newRef}>
                            <button
                                onClick={handleNew}
                                className="h-[38px] min-w-[100px] cursor-pointer transition-all text-white px-5 rounded-lg border-[#0D4A52] border-b-[4px] hover:brightness-110 hover:-translate-y-[1px] hover:border-b-[6px] active:border-b-[2px] active:translate-y-[1px] text-sm font-semibold shadow-sm flex items-center justify-center gap-2"
                                style={{ background: "linear-gradient(180deg, #156372 0%, #0D4A52 100%)" }}
                            >
                                <Plus size={16} /> <span className="hidden sm:inline">New</span>
                            </button>
                        </div>
                        <div className="relative" ref={moreRef}>
                            <button
                                onClick={() => setMoreDropdownOpen((prev) => !prev)}
                                className="h-[38px] flex items-center justify-center p-2 bg-white border border-gray-300 border-b-[4px] rounded-lg hover:bg-gray-50 transition-all hover:-translate-y-[1px] hover:border-b-[6px] active:border-b-[2px] active:translate-y-[1px] shadow-sm"
                            >
                                <MoreHorizontal size={18} className="text-gray-500" />
                            </button>
                            {moreDropdownOpen && (
                                tab === "products" ? (
                                    <div className="absolute top-full right-0 mt-2 w-60 bg-white border border-gray-100 rounded-lg shadow-xl z-[110] py-2 animate-in fade-in slide-in-from-top-1 duration-200">
                                        <button
                                            onClick={() => {
                                                setMoreDropdownOpen(false);
                                                navigate("/products/products/import?tab=products");
                                            }}
                                            className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-600 hover:bg-[#1b5e6a] hover:text-white transition-colors group"
                                        >
                                            <Upload size={16} className="text-teal-600 group-hover:text-white" />
                                            Import Products
                                        </button>
                                        <button
                                            onClick={handleExport}
                                            className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-600 hover:bg-[#1b5e6a] hover:text-white transition-colors group"
                                        >
                                            <Download size={16} className="text-teal-600 group-hover:text-white" />
                                            Export Products
                                        </button>
                                    </div>
                                ) : (
                                    <div className="absolute top-full right-0 mt-2 w-60 bg-white border border-gray-100 rounded-lg shadow-xl z-[110] py-2 animate-in fade-in slide-in-from-top-1 duration-200">
                                        <div className="relative">
                                            <button
                                                onClick={() => setSortSubMenuOpen((prev) => !prev)}
                                                className={`w-full flex items-center justify-between px-3 py-2 text-sm transition-colors ${sortSubMenuOpen ? 'text-white rounded-md mx-2 w-[calc(100%-16px)] shadow-sm' : 'text-slate-600 hover:bg-[#1b5e6a] hover:text-white'}`}
                                                style={sortSubMenuOpen ? { backgroundColor: '#1b5e6a' } : {}}
                                            >
                                                <span className="inline-flex items-center gap-3">
                                                    <ArrowDownUp size={16} className={sortSubMenuOpen ? 'text-white' : ''} style={!sortSubMenuOpen ? { color: '#1b5e6a' } : {}} />
                                                    Sort by
                                                </span>
                                                <ChevronRight size={14} className={sortSubMenuOpen ? 'text-white' : 'text-slate-400'} />
                                            </button>
                                            {sortSubMenuOpen && (
                                                <div className="md:absolute md:top-0 md:right-full md:mr-2 md:w-52 relative w-full bg-white md:border border-gray-100 rounded-lg md:shadow-xl py-2 z-[115] md:animate-in md:fade-in md:slide-in-from-right-1 duration-200">
                                                    {sortFields.map((field) => (
                                                        <button
                                                            key={field.key}
                                                            onClick={() => {
                                                                if (sortKey === field.key) {
                                                                    setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
                                                                } else {
                                                                    setSortKey(field.key);
                                                                    setSortOrder("asc");
                                                                }
                                                            }}
                                                            className={`w-full flex items-center justify-between px-4 py-2 text-sm transition-colors ${sortKey === field.key ? 'bg-[#1b5e6a] text-white font-bold' : 'text-slate-600 hover:bg-teal-50/50'}`}
                                                        >
                                                            <span style={sortKey === field.key ? { color: 'white', fontWeight: 'bold' } : {}}>
                                                                {field.label} {sortKey === field.key ? (sortOrder === "asc" ? "(Asc)" : "(Desc)") : ""}
                                                            </span>
                                                            {sortKey === field.key && <Plus size={14} className="rotate-45" style={{ color: 'white' }} />}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        <div className="h-px bg-gray-50 my-1 mx-2" />
                                        <button
                                            onClick={() => {
                                                setMoreDropdownOpen(false);
                                                setSortSubMenuOpen(false);
                                                navigate("/products/plans/import");
                                            }}
                                            className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-600 hover:bg-[#1b5e6a] hover:text-white transition-colors group"
                                        >
                                            <Upload size={16} className="text-teal-600 group-hover:text-white" />
                                            Import Plans
                                        </button>
                                        <button
                                            onClick={handleExport}
                                            className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-600 hover:bg-[#1b5e6a] hover:text-white transition-colors group"
                                        >
                                            <Download size={16} className="text-teal-600 group-hover:text-white" />
                                            Export Plans
                                        </button>
                                        <button
                                            onClick={resetColumnWidths}
                                            className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-600 hover:bg-[#1b5e6a] hover:text-white transition-colors group"
                                        >
                                            <RotateCcw size={16} className="text-teal-600 group-hover:text-white" />
                                            Reset Column Width
                                        </button>
                                    </div>
                                )
                            )}
                        </div>
                    </div>
                </div>
            )}

            <div className="flex-1 min-h-0 overflow-y-auto overflow-x-auto bg-white">
	                <table className="w-full text-left border-collapse min-w-[1200px]">
	                    <thead className="bg-[#f6f7fb] border-b border-[#e6e9f2]">
	                        <tr className="text-[10px] font-semibold text-[#7b8494] uppercase tracking-wider">
	                            <th className="px-4 py-3 w-16 min-w-[64px] sticky top-0 z-20 bg-[#f6f7fb]">
	                                <div className="flex items-center gap-2">
	                                    <button
	                                        type="button"
	                                        onClick={() => setCustomizeOpen(true)}
                                        className="h-6 w-6 flex items-center justify-center rounded border border-gray-200 bg-white hover:bg-gray-50 transition-colors"
                                        title="Manage Columns"
                                    >
                                        <SlidersHorizontal size={13} style={{ color: "#2563eb" }} />
                                    </button>
                                    <div className="h-5 w-px bg-gray-200" />
                                    <input
                                        type="checkbox"
                                        checked={allSelected}
                                        onChange={(e) => {
                                            if (e.target.checked) {
                                                setSelectedIds(currentRows.map((row: any) => row.id));
                                            } else {
                                                setSelectedIds([]);
                                            }
                                        }}
                                        className="h-4 w-4 rounded border-gray-300 text-[#3b82f6]"
                                    />
                                </div>
                            </th>
	                            {visibleColumns.map((col) => (
	                                <th
	                                    key={col.key}
	                                    className={`group relative px-4 py-3 font-semibold sticky top-0 z-20 bg-[#f6f7fb] ${/tax/i.test(col.key) ? "text-black" : "text-[#7b8494]"}`}
	                                    style={{
	                                        width: getEffectiveColumnWidth(col),
	                                    }}
	                                >
                                    <div className="pr-3 select-none">{col.label}</div>
                                    <div
                                        className="absolute right-0 top-0 bottom-0 w-3 cursor-col-resize"
                                        onMouseDown={(e) => startResizing(col.key, e)}
                                        onClick={(e) => e.stopPropagation()}
                                        title="Resize"
                                        role="separator"
                                        aria-orientation="vertical"
                                    >
                                        <div className="absolute right-1 top-1 bottom-1 w-[2px] bg-transparent opacity-0 transition-opacity group-hover:opacity-100 group-hover:bg-slate-900/70" />
	                                    </div>
	                                </th>
	                            ))}
	                            <th className="px-4 py-3 w-12 sticky top-0 right-0 z-30 bg-[#f6f7fb] border-l border-[#e6e9f2]">
	                                <div className="flex items-center justify-center">
	                                    <Search size={14} className="text-gray-300 cursor-pointer transition-colors hover:opacity-80" />
	                                </div>
	                            </th>
	                        </tr>
	                    </thead>
                    <tbody className="bg-white">
                        {currentRows.map((row: any) => (
                            <tr
                                key={row.id}
                                onClick={() => {
                                    if (tab === "plans") {
                                        navigate(`/products/plans/${row.id}`);
                                    } else {
                                        navigate(`/products/products/${row.id}`);
                                    }
                                }}
                                className={`text-[13px] group transition-all hover:bg-[#f8fafc] cursor-pointer h-[50px] border-b border-[#eef1f6] ${tab === "plans" ? "text-black" : ""}`}
                            >
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-2">
                                        <span className="h-6 w-6 shrink-0" aria-hidden />
                                        <span className="h-5 w-px shrink-0 bg-transparent" aria-hidden />
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.includes(row.id)}
                                            onClick={(e) => e.stopPropagation()}
                                            onChange={(e) => {
                                                setSelectedIds((prev) =>
                                                    e.target.checked ? [...prev, row.id] : prev.filter((id) => id !== row.id)
                                                );
                                            }}
                                            className="h-4 w-4 rounded border-gray-300 text-[#3b82f6]"
                                        />
                                    </div>
                                </td>
                                {visibleColumns.map((col) => (
                                    <td
                                        key={col.key}
                                        className={`px-4 py-3 ${/tax/i.test(col.key) ? "text-[12px]" : "text-[13px]"} ${tab === "plans" ? "text-black" : "text-slate-800"}`}
                                        style={{
                                            width: getEffectiveColumnWidth(col),
                                            color: tab === "plans" && col.key !== "plan" ? PLAN_ROW_TEXT_COLOR : undefined,
                                        }}
                                    >
                                        {renderCell(row, col.key)}
                                    </td>
                                ))}
                                <td className="px-4 py-3 sticky right-0 bg-white/95 backdrop-blur-sm group-hover:bg-[#f8fafc] transition-colors" />
                            </tr>
                        ))}
                        {currentRows.length === 0 && (
                            <tr>
                                <td colSpan={visibleColumns.length + (tab === "plans" ? 3 : 2)} className="px-6 py-10 text-center text-sm text-slate-500">
                                    No {tab === "plans" ? "plans" : "products"} found.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* <PlansImportWizard isOpen={Boolean(importEntity)} entity={importEntity} onClose={() => setImportEntity(null)} onImport={handleImport} /> */}

            <PlansCustomizeColumnsModal
                isOpen={customizeOpen}
                title="Customize Columns"
                columns={tab === "plans" ? planColumns : productColumns}
                onClose={() => setCustomizeOpen(false)}
                onSave={(updated) => {
                    if (tab === "plans") setPlanColumns(updated);
                    else setProductColumns(updated);
                    setCustomizeOpen(false);
                }}
            />

            <PlansBulkUpdateModal
                isOpen={bulkUpdateOpen}
                entityType={tab}
                onClose={() => setBulkUpdateOpen(false)}
                onUpdate={handleBulkUpdate}
            />

            <NewProductModal
                isOpen={newProductModalOpen}
                onClose={() => setNewProductModalOpen(false)}
                onSaveSuccess={() => {
                    const localProducts = readLocalRows(PRODUCTS_STORAGE_KEY).map(normalizeProduct).filter((row: ProductRow) => row.name);
                    setProducts(localProducts);
                    toast.success("Products list updated");
                }}
            />
        </div>
    );
}
