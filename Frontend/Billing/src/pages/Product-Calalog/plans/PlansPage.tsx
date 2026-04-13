import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useQueryClient } from "@tanstack/react-query";
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
    X,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import PlansCustomizeColumnsModal, { ColumnConfig } from "./components/PlansCustomizeColumnsModal";
import PlansBulkActions from "./components/PlansBulkActions";
import PlansBulkUpdateModal from "./components/PlansBulkUpdateModal";
import NewProductModal from "./newProduct/NewProductModal";
import { addonsAPI, couponsAPI, plansAPI, productsAPI } from "../../../services/api";
import { useCurrency } from "../../../hooks/useCurrency";
import { usePermissions } from "../../../hooks/usePermissions";
import {
    fetchProductsList,
    invalidateProductQueries,
    productQueryKeys,
    useProductsListQuery,
} from "./productQueries";
import {
    invalidatePlanQueries,
    usePlansListQuery,
} from "./planQueries";

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

const PLAN_COLUMNS_STORAGE_KEY = "taban_plan_columns_v1";
const PRODUCT_COLUMNS_STORAGE_KEY = "taban_product_columns_v1";
const MIN_COLUMN_WIDTH = 100;
const MAX_COLUMN_WIDTH = 900;

const DEFAULT_PLAN_COLUMNS: ColumnConfig[] = [
    { key: "plan", label: "PLAN", visible: true, pinned: true, locked: true, width: 220 },
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
        id: String(row?.id || row?._id || row?.product_id || fallbackId),
        name: String(row?.name || row?.product || "").trim(),
        description: String(row?.description || "").trim(),
        status: String(row?.status || "Active"),
        plans: Number(row?.plans || 0),
        addons: Number(row?.addons || 0),
        coupons: Number(row?.coupons || 0),
        creationDate: String(row?.creationDate || row?.createdAt || row?.created_time || ""),
        emailRecipients: String(row?.emailRecipients || row?.email_ids || ""),
        redirectionUrl: String(row?.redirectionUrl || row?.redirect_url || ""),
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
    const queryClient = useQueryClient();
    const { formatMoney, baseCurrencyCode } = useCurrency();
    const { canCreate, canEdit, canDelete } = usePermissions();

    const ensureProductApiSuccess = (response: any, fallbackMessage: string) => {
        if (response && typeof response === "object" && "success" in response && response.success === false) {
            throw new Error((response as any).message || fallbackMessage);
        }
        return response;
    };

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
    const [deleteModal, setDeleteModal] = useState<{ entityType: TabType; ids: string[] } | null>(null);
    const [moreDropdownStyle, setMoreDropdownStyle] = useState<{ top: number; left: number; minWidth: number } | null>(null);

    const [products, setProducts] = useState<ProductRow[]>([]);
    const [addons, setAddons] = useState<any[]>([]);
    const [coupons, setCoupons] = useState<any[]>([]);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    const [sortKey, setSortKey] = useState("planCode");
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

    const plansListQuery = usePlansListQuery();
    const plans = useMemo(
        () =>
            (Array.isArray(plansListQuery.data) ? plansListQuery.data : [])
                .map((row: any) => normalizePlan(row))
                .filter((row: PlanRow) => Boolean(row.plan)),
        [plansListQuery.data]
    );
    const plansLoading = (plansListQuery.isPending || plansListQuery.isFetching) && plans.length === 0;
    const refreshPlans = useCallback(async () => {
        await invalidatePlanQueries(queryClient);
    }, [queryClient]);

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
    const moreMenuRef = useRef<HTMLDivElement>(null);
    const tableToolsRef = useRef<HTMLDivElement>(null);
    const resizingRef = useRef<{ key: string; startX: number; startWidth: number } | null>(null);

    const canCreateCurrent = tab === "products"
        ? canCreate("products", "Products")
        : canCreate("products", "Plan");
    const canEditCurrent = tab === "products"
        ? canEdit("products", "Products")
        : canEdit("products", "Plan");
    const canDeleteCurrent = tab === "products"
        ? canDelete("products", "Products")
        : canDelete("products", "Plan");

    const productsListQuery = useProductsListQuery({ limit: 1000 });

    const refreshProductsFromQuery = useCallback(async () => {
        await invalidateProductQueries(queryClient);
        await queryClient.fetchQuery({
            queryKey: productQueryKeys.list({ limit: 1000 }),
            queryFn: () => fetchProductsList({ limit: 1000 }),
        });
    }, [queryClient]);

    useEffect(() => {
        const rows = Array.isArray(productsListQuery.data) ? productsListQuery.data : [];
        setProducts(rows.map(normalizeProduct).filter((row: ProductRow) => row.name));
    }, [productsListQuery.data]);

    const productsLoading =
        (productsListQuery.isPending || productsListQuery.isFetching) && products.length === 0;

    useEffect(() => {
        const loadMetadata = async () => {
            try {
                const res: any = await addonsAPI.getAll({ limit: 1000 });
                const rows = Array.isArray(res?.data) ? res.data : [];
                setAddons(rows);
            } catch {
                setAddons([]);
            }

            try {
                const res: any = await couponsAPI.getAll({ limit: 1000 });
                const rows = Array.isArray(res?.data) ? res.data : [];
                setCoupons(rows);
            } catch {
                setCoupons([]);
            }
        };

        void loadMetadata();
    }, []);

    useEffect(() => {
        localStorage.setItem(PLAN_COLUMNS_STORAGE_KEY, JSON.stringify(planColumns));
    }, [planColumns]);

    useEffect(() => {
        localStorage.setItem(PRODUCT_COLUMNS_STORAGE_KEY, JSON.stringify(productColumns));
    }, [productColumns]);

    useEffect(() => {
        const isProductRoute = location.pathname.startsWith("/products/products");
        const qNew = new URLSearchParams(location.search).get("new");
        setTab(isProductRoute ? "products" : "plans");
        if (isProductRoute && qNew === "1") {
            setNewProductModalOpen(true);
        }
    }, [location.pathname, location.search]);

    useEffect(() => {
        setSortKey(tab === "products" ? "name" : "plan");
        setSortOrder("asc");
    }, [tab]);

    useEffect(() => {
        const onClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            if (allPlansRef.current && !allPlansRef.current.contains(target)) setAllPlansDropdownOpen(false);
            if (allProductsRef.current && !allProductsRef.current.contains(target)) setAllProductsDropdownOpen(false);
            if (newRef.current && !newRef.current.contains(target)) setNewDropdownOpen(false);
            if (
                moreRef.current &&
                !moreRef.current.contains(target) &&
                moreMenuRef.current &&
                !moreMenuRef.current.contains(target)
            ) {
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

    const updateMoreDropdownPosition = useCallback(() => {
        if (typeof window === "undefined") return;
        const anchor = moreRef.current?.getBoundingClientRect?.();
        if (!anchor) return;
        const menuWidth = 240;
        const left = Math.max(12, Math.min(anchor.right - menuWidth, window.innerWidth - menuWidth - 12));
        const top = Math.min(anchor.bottom + 8, window.innerHeight - 12);
        setMoreDropdownStyle({ top, left, minWidth: menuWidth });
    }, []);

    useEffect(() => {
        if (!moreDropdownOpen) return;
        updateMoreDropdownPosition();
        const handleReposition = () => updateMoreDropdownPosition();
        window.addEventListener("resize", handleReposition);
        window.addEventListener("scroll", handleReposition, true);
        return () => {
            window.removeEventListener("resize", handleReposition);
            window.removeEventListener("scroll", handleReposition, true);
        };
    }, [moreDropdownOpen, updateMoreDropdownPosition]);

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
        if (!canCreateCurrent) {
            toast.error("You do not have permission to create this item.");
            return;
        }
        if (tab === "products") {
            setNewProductModalOpen(true);
            return;
        }
        navigate("/products/plans/new");
    };

    const handleCloseNewProductModal = useCallback(() => {
        setNewProductModalOpen(false);

        const params = new URLSearchParams(location.search);
        if (params.get("new") === "1") {
            params.delete("new");
            const nextSearch = params.toString();
            navigate(
                {
                    pathname: location.pathname,
                    search: nextSearch ? `?${nextSearch}` : "",
                },
                { replace: true }
            );
        }
    }, [location.pathname, location.search, navigate]);

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
        if (!canCreateCurrent) {
            toast.error("You do not have permission to create this item.");
            setImportEntity(null);
            setMoreDropdownOpen(false);
            setSortSubMenuOpen(false);
            return;
        }
        if (entity === "plans") {
            void (async () => {
                try {
                    const prepared = rows.map((row) => {
                        const billingRaw = String(row.billingFrequency || "1 month(s)");
                        const matched = billingRaw.match(/^(\d+)\s*(.*)$/);
                        const billingFrequencyValue = matched?.[1] || "1";
                        const billingFrequencyPeriod = (matched?.[2] || "Month(s)").trim() || "Month(s)";
                        const price = Number(row.price || 0);
                        return {
                            product: row.product || "",
                            planName: row.planName || "",
                            planCode: row.planCode || "",
                            planDescription: row.planDescription || "",
                            status: row.status || "Active",
                            pricingModel: row.pricingModel || "Per Unit",
                            billingFrequencyValue,
                            billingFrequencyPeriod,
                            unitName: row.unitName || "",
                            price: Number.isFinite(price) ? price : 0,
                        };
                    });

                    await plansAPI.bulkCreate(prepared);
                    await refreshPlans();
                    toast.success(`${prepared.length} plan(s) imported`);
                } catch (e: any) {
                    console.error("Failed to import plans", e);
                    toast.error(e?.message || "Failed to import plans");
                } finally {
                    setImportEntity(null);
                    setMoreDropdownOpen(false);
                    setSortSubMenuOpen(false);
                }
            })();
        } else {
            void (async () => {
                try {
                    for (const row of rows) {
                        const payload = {
                            name: row.name || "",
                            description: row.description || "",
                            status: row.status || "Active",
                        };
                        // eslint-disable-next-line no-await-in-loop
                        ensureProductApiSuccess(await productsAPI.create(payload), "Failed to create product");
                    }
                    await refreshProductsFromQuery();
                    toast.success(`${rows.length} product(s) imported`);
                } catch (e) {
                    toast.error("Failed to import products");
                } finally {
                    setImportEntity(null);
                    setMoreDropdownOpen(false);
                    setSortSubMenuOpen(false);
                }
            })();
            return;
        }
        if (entity !== "plans") {
            setImportEntity(null);
            setMoreDropdownOpen(false);
            setSortSubMenuOpen(false);
        }
    };

    const handleBulkMarkStatus = (status: string) => {
        if (!canEditCurrent) {
            toast.error("You do not have permission to update this item.");
            return;
        }
        if (tab === "products") {
            void (async () => {
                try {
                    const shouldActivate = String(status || "").toLowerCase() === "active";
                    await Promise.all(
                        selectedIds.map(async (id) =>
                            ensureProductApiSuccess(
                                shouldActivate ? await productsAPI.markActive(id) : await productsAPI.markInactive(id),
                                `Failed to mark product as ${status.toLowerCase()}`
                            )
                        )
                    );
                    await refreshProductsFromQuery();
                    setSelectedIds([]);
                    toast.success(`Selected products marked as ${status}`);
                } catch (e: any) {
                    toast.error(e?.message || "Failed to update products");
                }
            })();
            return;
        }

        void (async () => {
            try {
                await Promise.all(selectedIds.map((id) => plansAPI.update(id, { status })));
                await refreshPlans();
                setSelectedIds([]);
                toast.success(`Selected plans marked as ${status}`);
            } catch (e: any) {
                toast.error(e?.message || "Failed to update plans");
            }
        })();
    };

    const handleBulkDelete = () => {
        if (!canDeleteCurrent) {
            toast.error("You do not have permission to delete this item.");
            return;
        }
        if (!selectedIds.length) return;
        setDeleteModal({ entityType: tab, ids: [...selectedIds] });
    };

    const confirmBulkDelete = async () => {
        if (!deleteModal) return;
        if (!canDeleteCurrent) {
            toast.error("You do not have permission to delete this item.");
            setDeleteModal(null);
            return;
        }

        try {
            if (deleteModal.entityType === "products") {
                await Promise.all(
                    deleteModal.ids.map(async (id) =>
                        ensureProductApiSuccess(await productsAPI.delete(id), "Failed to delete product")
                    )
                );
                await refreshProductsFromQuery();
                toast.success("Selected products deleted");
            } else {
                await Promise.all(deleteModal.ids.map((id) => plansAPI.delete(id)));
                await refreshPlans();
                toast.success("Selected plans deleted");
            }
            setSelectedIds([]);
            setDeleteModal(null);
        } catch (e: any) {
            toast.error(e?.message || `Failed to delete ${deleteModal.entityType}`);
        }
    };

    const handleBulkUpdate = (field: string, newValue: string) => {
        if (tab === "products") {
            void (async () => {
                try {
                    await Promise.all(
                        selectedIds.map(async (id) =>
                            ensureProductApiSuccess(
                                await productsAPI.update(id, { [field]: newValue }),
                                "Bulk update failed"
                            )
                        )
                    );
                    await refreshProductsFromQuery();
                    setBulkUpdateOpen(false);
                    setSelectedIds([]);
                    toast.success("Selected products updated successfully");
                } catch (e: any) {
                    toast.error(e?.message || "Bulk update failed");
                }
            })();
            return;
        }

        void (async () => {
            try {
                const patch: any = {};
                if (field === "description") patch.planDescription = newValue;
                else if (field === "salesAccount") patch.planAccount = newValue;
                else if (field === "showInWidget") patch.widgetsPreference = String(newValue).toLowerCase() === "true";
                else if (field === "showInPortal") patch.showInPortal = String(newValue).toLowerCase() === "true";
                else if (field === "price") {
                    const parsed = Number(newValue);
                    if (!Number.isFinite(parsed) || parsed <= 0) {
                        toast.error("Invalid price");
                        return;
                    }
                    patch.price = parsed;
                } else patch[field] = newValue;

                await Promise.all(selectedIds.map((id) => plansAPI.update(id, patch)));
                await refreshPlans();
                setBulkUpdateOpen(false);
                setSelectedIds([]);
                toast.success("Selected plans updated successfully");
            } catch (e: any) {
                toast.error(e?.message || "Bulk update failed");
            }
        })();
    };

    const sortFields =
        tab === "plans"
            ? [
                { key: "planCode", label: "Plan Code" },
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
            return <span style={{ color: PLAN_ROW_TEXT_COLOR }}>{formatMoney(Number(raw || 0), baseCurrencyCode)}</span>;
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
                        canBulkUpdate={canEditCurrent}
                        canMarkStatus={canEditCurrent}
                        canDelete={canDeleteCurrent}
                    />
                </div>
            ) : (
                <div className="flex-none flex items-center justify-between px-6 py-6 border-b border-gray-100 bg-white relative overflow-visible z-30">
                    <div className="flex items-center gap-6 pl-4">
                        {tab === "plans" ? (
                            <div className="relative" ref={allPlansRef}>
                                <button
                                    onClick={() => setAllPlansDropdownOpen((prev) => !prev)}
                                    className="flex items-center gap-1.5 py-4 text-[15px] font-bold border-b-2 -mb-[1px] text-slate-900 border-slate-900"
                                >
                                    All Plans
                                    <ChevronDown size={14} className="text-[#2563eb]" />
                                </button>
                                {allPlansDropdownOpen && (
                                    <div className="absolute left-0 top-full z-[120] mt-1 w-48 rounded-md border border-gray-200 bg-white py-1 shadow-xl">
                                        {(["All Plans", "Active Plans", "Inactive Plans"] as const).map((option) => (
                                            <button
                                                key={option}
                                                onClick={() => {
                                                    setPlanStatusFilter(option);
                                                    setAllPlansDropdownOpen(false);
                                                }}
                                                className={`w-full px-4 py-2 text-left text-sm ${planStatusFilter === option ? "bg-[#1b5e6a] text-white" : "text-slate-700 hover:bg-[#1b5e6a] hover:text-white"
                                                }`}
                                            >
                                                {option}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="relative" ref={allProductsRef}>
                                <button
                                    onClick={() => setAllProductsDropdownOpen((prev) => !prev)}
                                    className="flex items-center gap-1.5 py-4 text-[15px] font-bold border-b-2 -mb-[1px] text-slate-900 border-slate-900"
                                >
                                    All Products
                                    <ChevronDown size={14} className="text-[#2563eb]" />
                                </button>
                                {allProductsDropdownOpen && (
                                    <div className="absolute left-0 top-full z-[120] mt-1 w-48 rounded-md border border-gray-200 bg-white py-1 shadow-xl">
                                        {(["All Products", "Active Products", "Inactive Products"] as const).map((option) => (
                                            <button
                                                key={option}
                                                onClick={() => {
                                                    setProductStatusFilter(option);
                                                    setAllProductsDropdownOpen(false);
                                                }}
                                                className={`w-full px-4 py-2 text-left text-sm ${productStatusFilter === option ? "bg-[#1b5e6a] text-white" : "text-slate-700 hover:bg-[#1b5e6a] hover:text-white"
                                                }`}
                                            >
                                                {option}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                    </div>

                    <div className="flex flex-wrap items-center gap-3 sm:gap-2 mr-4">
                        <div className="relative" ref={newRef}>
                            {canCreateCurrent ? (
                                <button
                                    onClick={handleNew}
                                    className="h-[38px] min-w-[100px] cursor-pointer transition-all text-white px-5 rounded-lg border-[#0D4A52] border-b-[4px] hover:brightness-110 hover:-translate-y-[1px] hover:border-b-[6px] active:border-b-[2px] active:translate-y-[1px] text-sm font-semibold shadow-sm flex items-center justify-center gap-2"
                                    style={{ background: "linear-gradient(180deg, #156372 0%, #0D4A52 100%)" }}
                                >
                                    <Plus size={16} /> <span className="hidden sm:inline">New</span>
                                </button>
                            ) : null}
                        </div>
                        <div className="relative z-[200]" ref={moreRef}>
                            <button
                                onClick={() => {
                                    setSortSubMenuOpen(false);
                                    setMoreDropdownOpen((prev) => {
                                        const next = !prev;
                                        if (next) updateMoreDropdownPosition();
                                        return next;
                                    });
                                }}
                                className="h-[38px] flex items-center justify-center p-2 bg-white border border-gray-300 border-b-[4px] rounded-lg hover:bg-gray-50 transition-all hover:-translate-y-[1px] hover:border-b-[6px] active:border-b-[2px] active:translate-y-[1px] shadow-sm"
                            >
                                <MoreHorizontal size={18} className="text-gray-500" />
                            </button>
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
                                        navigate(`/products/plans/${row.id}`, { state: { initialPlan: row } });
                                      } else {
                                        navigate(`/products/products/${row.id}`, { state: { initialProduct: row } });
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
                        {currentRows.length === 0 && tab === "products" && productsLoading ? (
                            Array.from({ length: 6 }).map((_, idx) => (
                                <tr key={`prod-skel-${idx}`} className="h-[50px] border-b border-[#eef1f6]">
                                    <td className="px-4 py-3">
                                        <div className="h-4 w-4 rounded bg-slate-200 animate-pulse" />
                                    </td>
                                    {visibleColumns.map((col) => (
                                        <td key={col.key} className="px-4 py-3">
                                            <div className="h-4 w-[80%] rounded bg-slate-200 animate-pulse" />
                                        </td>
                                    ))}
                                    <td className="px-4 py-3 sticky right-0 bg-white/95" />
                                </tr>
                            ))
                        ) : currentRows.length === 0 && tab === "plans" && plansLoading ? (
                            Array.from({ length: 6 }).map((_, idx) => (
                                <tr key={`plan-skel-${idx}`} className="h-[50px] border-b border-[#eef1f6]">
                                    <td className="px-4 py-3">
                                        <div className="h-4 w-4 rounded bg-slate-200 animate-pulse" />
                                    </td>
                                    {visibleColumns.map((col) => (
                                        <td key={col.key} className="px-4 py-3">
                                            <div className="h-4 w-[80%] rounded bg-slate-200 animate-pulse" />
                                        </td>
                                    ))}
                                    <td className="px-4 py-3 sticky right-0 bg-white/95" />
                                </tr>
                            ))
                        ) : currentRows.length === 0 ? (
                            <tr>
                                <td colSpan={visibleColumns.length + (tab === "plans" ? 3 : 2)} className="px-6 py-10 text-center text-sm text-slate-500">
                                    No {tab === "plans" ? "plans" : "products"} found.
                                </td>
                            </tr>
                        ) : null}
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
                onClose={handleCloseNewProductModal}
                onSaveSuccess={() => {
                    void refreshProductsFromQuery();
                }}
            />

            {moreDropdownOpen && moreDropdownStyle
                ? createPortal(
                    <div
                        ref={moreMenuRef}
                        className="fixed z-[99999] rounded-lg border border-gray-100 bg-white py-2 shadow-2xl animate-in fade-in slide-in-from-top-1 duration-200"
                        style={{
                            top: moreDropdownStyle.top,
                            left: moreDropdownStyle.left,
                            minWidth: moreDropdownStyle.minWidth,
                        }}
                    >
                        {tab === "products" ? (
                            <>
                                {canCreateCurrent ? (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setMoreDropdownOpen(false);
                                            navigate("/products/products/import?tab=products");
                                        }}
                                        className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm text-slate-600 hover:bg-gray-100 hover:text-slate-900 transition-colors group"
                                    >
                                        <Upload size={16} className="text-slate-500 group-hover:text-slate-700" />
                                        Import Products
                                    </button>
                                ) : null}
                                <button
                                    type="button"
                                    onClick={handleExport}
                                    className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm text-slate-600 hover:bg-gray-100 hover:text-slate-900 transition-colors group"
                                >
                                    <Download size={16} className="text-slate-500 group-hover:text-slate-700" />
                                    Export Products
                                </button>
                            </>
                        ) : (
                            <>
                                <div className="relative">
                                    <button
                                        type="button"
                                        onClick={() => setSortSubMenuOpen((prev) => !prev)}
                                        className={`w-full flex items-center justify-between px-3 py-2 text-sm transition-colors ${sortSubMenuOpen ? 'bg-gray-100 text-slate-900 rounded-md mx-2 w-[calc(100%-16px)] shadow-sm' : 'text-slate-600 hover:bg-gray-100 hover:text-slate-900'}`}
                                    >
                                        <span className="inline-flex items-center gap-3">
                                            <ArrowDownUp size={16} className={sortSubMenuOpen ? "text-slate-700" : "text-slate-500"} />
                                            Sort by
                                        </span>
                                        <ChevronRight size={14} className={sortSubMenuOpen ? "text-slate-700" : "text-slate-400"} />
                                    </button>
                                    {sortSubMenuOpen && (
                                        <div className="absolute right-full top-0 mr-2 w-52 rounded-lg border border-gray-100 bg-white py-2 shadow-xl z-[100000] animate-in fade-in slide-in-from-right-1 duration-200">
                                            {sortFields.map((field) => (
                                                <button
                                                    key={field.key}
                                                    type="button"
                                                    onClick={() => {
                                                        if (sortKey === field.key) {
                                                            setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
                                                        } else {
                                                            setSortKey(field.key);
                                                            setSortOrder("asc");
                                                        }
                                                    }}
                                                className={`w-full flex items-center justify-between px-4 py-2 text-sm transition-colors ${sortKey === field.key ? 'bg-gray-100 text-slate-900 font-semibold' : 'text-slate-600 hover:bg-gray-100 hover:text-slate-900'}`}
                                            >
                                                    <span style={sortKey === field.key ? { color: '#0f172a', fontWeight: 600 } : {}}>
                                                        {field.label} {sortKey === field.key ? (sortOrder === "asc" ? "(Asc)" : "(Desc)") : ""}
                                                    </span>
                                                    {sortKey === field.key && <Plus size={14} className="rotate-45 text-slate-700" />}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <div className="h-px bg-gray-50 my-1 mx-2" />
                                {canCreateCurrent ? (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setMoreDropdownOpen(false);
                                            setSortSubMenuOpen(false);
                                            navigate("/products/plans/import");
                                        }}
                                        className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm text-slate-600 hover:bg-gray-100 hover:text-slate-900 transition-colors group"
                                    >
                                        <Upload size={16} className="text-slate-500 group-hover:text-slate-700" />
                                        Import Plans
                                    </button>
                                ) : null}
                                <button
                                    type="button"
                                    onClick={handleExport}
                                    className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm text-slate-600 hover:bg-gray-100 hover:text-slate-900 transition-colors group"
                                >
                                    <Download size={16} className="text-slate-500 group-hover:text-slate-700" />
                                    Export Plans
                                </button>
                                <button
                                    type="button"
                                    onClick={resetColumnWidths}
                                    className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm text-slate-600 hover:bg-gray-100 hover:text-slate-900 transition-colors group"
                                >
                                    <RotateCcw size={16} className="text-slate-500 group-hover:text-slate-700" />
                                    Reset Column Width
                                </button>
                            </>
                        )}
                    </div>,
                    document.body
                )
                : null}

            {deleteModal ? (
                <div className="fixed inset-0 z-[2100] flex items-start justify-center bg-black/40 pt-16">
                    <div className="w-full max-w-md rounded-lg bg-white shadow-2xl border border-slate-200">
                        <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-3">
                            <div className="h-7 w-7 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center text-[12px] font-bold">
                                !
                            </div>
                            <h3 className="text-[15px] font-semibold text-slate-800 flex-1">
                                {deleteModal.entityType === "products"
                                    ? `Delete ${deleteModal.ids.length} selected product${deleteModal.ids.length === 1 ? "" : "s"}?`
                                    : `Delete ${deleteModal.ids.length} selected plan${deleteModal.ids.length === 1 ? "" : "s"}?`}
                            </h3>
                            <button
                                type="button"
                                className="h-7 w-7 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                                onClick={() => setDeleteModal(null)}
                                aria-label="Close"
                            >
                                <X size={14} />
                            </button>
                        </div>
                        <div className="px-5 py-3 text-[13px] text-slate-600">
                            You cannot retrieve these {deleteModal.entityType} once they have been deleted.
                        </div>
                        <div className="flex items-center justify-start gap-2 border-t border-slate-100 px-5 py-3">
                            <button
                                type="button"
                                className="px-4 py-1.5 rounded-md bg-blue-600 text-white text-[12px] hover:bg-blue-700"
                                onClick={() => void confirmBulkDelete()}
                            >
                                Delete
                            </button>
                            <button
                                type="button"
                                className="px-4 py-1.5 rounded-md border border-slate-200 bg-white text-slate-700 text-[12px] hover:bg-slate-50"
                                onClick={() => setDeleteModal(null)}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}

        </div>
    );
}
