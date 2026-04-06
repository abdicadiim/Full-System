import React, { useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, CirclePlus, Download, MoreVertical, Pencil, Trash2, Upload, X } from "lucide-react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import NewProductModal from "../newProduct/NewProductModal";
import { addonsAPI, couponsAPI, plansAPI, productsAPI } from "../../../../services/api";
import { usePermissions } from "../../../../hooks/usePermissions";
import {
  invalidateProductQueries,
  removeProductFromProductQueries,
  syncProductIntoProductQueries,
  useProductDetailQuery,
  useProductsListQuery,
} from "../productQueries";

const EMAIL_TEMPLATE_EVENTS = [
  "Update Subscription",
  "Cancel Subscription",
  "Subscription Expired",
  "Reactivate Subscription",
  "Invoice Notification",
  "Payment Thank-You",
  "Payment Initiated",
  "Payment Failure",
  "Payment Refund",
  "Trial Expired",
  "Credit Note Notification",
  "Quote Notification",
] as const;

const safeArray = (value: any) => (Array.isArray(value) ? value : []);

const getId = (row: any) => String(row?.id || row?._id || "");
const isActive = (row: any) => String(row?.status || "Active").toLowerCase() === "active";
const isInactive = (row: any) => String(row?.status || "Active").toLowerCase() === "inactive";

const formatDate = (value: string) => {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};

const toExternalUrl = (value: string) => {
  const raw = String(value || "").trim();
  if (!raw) return "";
  return /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
};

const normalizeProduct = (value: unknown) => String(value || "").trim().toLowerCase();

const buildCountMap = (rows: any[]) => {
  const counts = new Map<string, number>();
  rows.forEach((row) => {
    const key = normalizeProduct(row?.product);
    if (!key) return;
    counts.set(key, (counts.get(key) || 0) + 1);
  });
  return counts;
};

const toCsv = (headers: string[], rows: string[][]) => {
  const escape = (value: string) => {
    const safe = String(value ?? "");
    if (safe.includes(",") || safe.includes('"') || safe.includes("\n")) {
      return `"${safe.replace(/"/g, '""')}"`;
    }
    return safe;
  };
  return [headers.map(escape).join(","), ...rows.map((row) => row.map(escape).join(","))].join("\n");
};

export default function ProductDetailPage() {
  const navigate = useNavigate();
  const { productId } = useParams();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { canCreate, canEdit, canDelete } = usePermissions();
  const actionsRef = useRef<HTMLDivElement>(null);
  const sidebarFilterRef = useRef<HTMLDivElement>(null);
  const sidebarMoreRef = useRef<HTMLDivElement>(null);

  const [initialSelectedProduct, setInitialSelectedProduct] = useState<any | null>(() => {
    const state: any = (location as any)?.state;
    return state?.initialProduct ?? null;
  });
  const [plans, setPlans] = useState<any[]>([]);
  const [addons, setAddons] = useState<any[]>([]);
  const [coupons, setCoupons] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"details" | "plans" | "addons" | "coupons">("details");
  const [actionsOpen, setActionsOpen] = useState(false);
  const [productFilter, setProductFilter] = useState<"All Products" | "Active Products" | "Inactive Products">("All Products");
  const [sidebarFilterOpen, setSidebarFilterOpen] = useState(false);
  const [sidebarMoreOpen, setSidebarMoreOpen] = useState(false);
  const [emailTemplatesOpen, setEmailTemplatesOpen] = useState(false);
  const [editProductOpen, setEditProductOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [showTabCount, setShowTabCount] = useState<Record<"plans" | "addons" | "coupons", boolean>>({
    plans: false,
    addons: false,
    coupons: false,
  });
  const [emailTemplateMap, setEmailTemplateMap] = useState<Record<string, string>>(() =>
    EMAIL_TEMPLATE_EVENTS.reduce((acc, key) => ({ ...acc, [key]: "Default" }), {} as Record<string, string>)
  );

  const revealTabCount = (tab: "plans" | "addons" | "coupons") => {
    setShowTabCount((prev) => ({ ...prev, [tab]: true }));
  };

  const canCreateProduct = canCreate("products", "Products");
  const canEditProduct = canEdit("products", "Products");
  const canDeleteProduct = canDelete("products", "Products");
  const canCreatePlan = canCreate("products", "Plan") || canCreateProduct;
  const canCreateAddon = canCreate("products", "Addon") || canCreateProduct;
  const canCreateCoupon = canCreate("products", "Coupon") || canCreateProduct;
  const normalizedProductId = String(productId || "").trim();
  const productsListQuery = useProductsListQuery({ limit: 1000 });
  const products = useMemo(
    () => (Array.isArray(productsListQuery.data) ? productsListQuery.data : []),
    [productsListQuery.data]
  );
  const selectedProductQuery = useProductDetailQuery(normalizedProductId, {
    enabled: Boolean(normalizedProductId),
    initialProduct: initialSelectedProduct,
  });

  useEffect(() => {
    const state: any = (location as any)?.state;
    if (state?.initialProduct) {
      setInitialSelectedProduct(state.initialProduct);
    }
    const load = async () => {
      try {
        const plansRes: any = await plansAPI.getAll({ limit: 1000 });
        setPlans(safeArray(plansRes?.data));
      } catch {
        setPlans([]);
      }
      try {
        const addonsRes: any = await addonsAPI.getAll({ limit: 1000 });
        setAddons(safeArray(addonsRes?.data));
      } catch {
        setAddons([]);
      }
      try {
        const couponsRes: any = await couponsAPI.getAll({ limit: 1000 });
        setCoupons(safeArray(couponsRes?.data));
      } catch {
        setCoupons([]);
      }
    };
    void load();
  }, []);

  useEffect(() => {
    const state: any = (location as any)?.state;
    if (state?.initialProduct) {
      setInitialSelectedProduct(state.initialProduct);
    }
  }, [location.state]);

  useEffect(() => {
    const onOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (actionsRef.current && !actionsRef.current.contains(target)) {
        setActionsOpen(false);
      }
      if (sidebarFilterRef.current && !sidebarFilterRef.current.contains(target)) {
        setSidebarFilterOpen(false);
      }
      if (sidebarMoreRef.current && !sidebarMoreRef.current.contains(target)) {
        setSidebarMoreOpen(false);
      }
    };
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, []);

  const selectedProduct = useMemo(() => {
    if (selectedProductQuery.data) return selectedProductQuery.data;
    const fromList = products.find((row) => getId(row) === normalizedProductId);
    if (fromList) return fromList;
    const fromState =
      initialSelectedProduct && getId(initialSelectedProduct) === normalizedProductId
        ? initialSelectedProduct
        : null;
    if (fromState) return fromState;
    if (!normalizedProductId) return products[0] || null;
    return null;
  }, [initialSelectedProduct, normalizedProductId, products, selectedProductQuery.data]);

  const productsLoading =
    !selectedProduct &&
    (productsListQuery.isPending ||
      productsListQuery.isFetching ||
      selectedProductQuery.isPending ||
      selectedProductQuery.isFetching);

  const selectedProductName = String(selectedProduct?.name || "").trim();
  const emailTemplateStorageKey = selectedProduct ? `taban_product_email_templates_${getId(selectedProduct)}` : "";

  useEffect(() => {
    if (!selectedProduct || !emailTemplateStorageKey) return;
    try {
      const raw = localStorage.getItem(emailTemplateStorageKey);
      const parsed = raw ? JSON.parse(raw) : null;
      if (parsed && typeof parsed === "object") {
        setEmailTemplateMap(
          EMAIL_TEMPLATE_EVENTS.reduce(
            (acc, key) => ({ ...acc, [key]: String(parsed[key] || "Default") }),
            {} as Record<string, string>
          )
        );
        return;
      }
    } catch {
      // ignore parse errors and use defaults
    }
    setEmailTemplateMap(
      EMAIL_TEMPLATE_EVENTS.reduce((acc, key) => ({ ...acc, [key]: "Default" }), {} as Record<string, string>)
    );
  }, [emailTemplateStorageKey, selectedProduct]);

  const productPlans = useMemo(() => {
    if (!selectedProductName) return [];
    return plans.filter((row) => String(row?.product || "").trim().toLowerCase() === selectedProductName.toLowerCase());
  }, [plans, selectedProductName]);

  const productCoupons = useMemo(() => {
    if (!selectedProductName) return [];
    return coupons.filter((row) => String(row?.product || "").trim().toLowerCase() === selectedProductName.toLowerCase());
  }, [coupons, selectedProductName]);

  const productAddons = useMemo(() => {
    if (!selectedProductName) return [];
    return addons.filter((row) => String(row?.product || "").trim().toLowerCase() === selectedProductName.toLowerCase());
  }, [addons, selectedProductName]);

  const planCountByProduct = useMemo(() => buildCountMap(plans), [plans]);
  const addonCountByProduct = useMemo(() => buildCountMap(addons), [addons]);
  const couponCountByProduct = useMemo(() => buildCountMap(coupons), [coupons]);

  const sidebarProducts = useMemo(() => {
    return products.filter((row) => {
      if (productFilter === "Active Products") return isActive(row);
      if (productFilter === "Inactive Products") return !isActive(row);
      return true;
    });
  }, [products, productFilter]);

  const handleToggleStatus = async () => {
    if (!canEditProduct) {
      toast.error("You do not have permission to update this item.");
      return;
    }
    if (!selectedProduct) return;
    const currentlyActive = isActive(selectedProduct);
    const hasActiveAssociations =
      productPlans.some((row) => !isInactive(row)) ||
      productAddons.some((row) => !isInactive(row)) ||
      productCoupons.some((row) => !isInactive(row));
    if (currentlyActive && hasActiveAssociations) {
      toast.error("The product's status has not been changed. Please mark the plans, addons, or coupons associated with this product as inactive to proceed.");
      setActionsOpen(false);
      return;
    }
    const targetId = getId(selectedProduct);
    const nextStatus = currentlyActive ? "Inactive" : "Active";

    try {
      const res: any = currentlyActive
        ? await productsAPI.markInactive(targetId)
        : await productsAPI.markActive(targetId);
      if (res?.success === false) throw new Error(res?.message || "Failed to update product");
      syncProductIntoProductQueries(queryClient, {
        ...selectedProduct,
        status: nextStatus,
        active: !currentlyActive,
        isActive: !currentlyActive,
      });
      await invalidateProductQueries(queryClient, targetId);
      setActionsOpen(false);
      toast.success(`Product marked as ${nextStatus.toLowerCase()}`);
    } catch (e: any) {
      toast.error(e?.message || "Failed to update product");
    }
  };

  const handleDeleteProduct = () => {
    if (!canDeleteProduct) {
      toast.error("You do not have permission to delete this item.");
      return;
    }
    if (!selectedProduct) return;
    const hasTransactions = productPlans.length > 0 || productAddons.length > 0 || productCoupons.length > 0;
    if (hasTransactions) {
      toast.error("The products cannot be deleted since they are involved in transactions. You can mark them as inactive instead.");
      setActionsOpen(false);
      return;
    }
    setActionsOpen(false);
    setIsDeleteModalOpen(true);
  };

  const confirmDeleteProduct = async () => {
    if (!selectedProduct) return;
    const targetId = getId(selectedProduct);
    const remaining = products.filter((row) => getId(row) !== targetId);
    try {
      const res: any = await productsAPI.delete(targetId);
      if (res?.success === false) throw new Error(res?.message || "Failed to delete product");
      removeProductFromProductQueries(queryClient, targetId);
      await invalidateProductQueries(queryClient, targetId);
      setIsDeleteModalOpen(false);
      toast.success("Product deleted");

      if (remaining.length > 0) {
        navigate(`/products/products/${getId(remaining[0])}`);
      } else {
        navigate("/products/plans?tab=products");
      }
    } catch (e: any) {
      toast.error(e?.message || "Failed to delete product");
    }
  };

  const handleExportProducts = () => {
    const headers = ["Name", "Description", "Status", "Plans", "Addons", "Coupons"];
    const rows = sidebarProducts.map((row) => {
      const key = normalizeProduct(row?.name);
      return [
        String(row?.name || ""),
        String(row?.description || ""),
        String(row?.status || "Active"),
        String(planCountByProduct.get(key) || 0),
        String(addonCountByProduct.get(key) || 0),
        String(couponCountByProduct.get(key) || 0),
      ];
    });
    const csv = toCsv(headers, rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "products-export.csv";
    a.click();
    URL.revokeObjectURL(url);
    setSidebarMoreOpen(false);
    toast.success("Products exported");
  };

  if (!selectedProduct) {
    return (
      <div className="min-h-[calc(100vh-100px)] rounded-lg border border-[#d8deea] bg-white p-8">
        <h1 className="text-2xl font-semibold text-[#111827]">Products</h1>
        <p className="mt-2 text-sm text-[#64748b]">{productsLoading ? "Loading product..." : "No products found."}</p>
        {canCreateProduct ? (
          <button
            type="button"
            onClick={() => navigate("/products/products/new")}
            className="mt-4 rounded bg-[#1b5e6a] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
          >
            Create Product
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-100px)] w-full overflow-hidden bg-white">
      <aside className="flex w-[360px] flex-col border-r border-gray-200 bg-white">
        <div className="flex items-center justify-between border-b border-[#e5e7eb] px-4 py-3">
          <div className="relative" ref={sidebarFilterRef}>
            <button
              type="button"
              onClick={() => setSidebarFilterOpen((prev) => !prev)}
              className="inline-flex items-center gap-1 text-[15px] font-semibold text-[#111827]"
            >
              {productFilter === "All Products" ? "All Products" : productFilter}
              <ChevronDown size={16} className="text-[#2563eb]" />
            </button>
            {sidebarFilterOpen ? (
              <div className="absolute left-0 top-full z-[140] mt-1 w-48 rounded-md border border-gray-200 bg-white py-1 shadow-xl">
                {(["All Products", "Active Products", "Inactive Products"] as const).map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => {
                      setProductFilter(option);
                      setSidebarFilterOpen(false);
                    }}
                    className={`w-full px-4 py-2 text-left text-sm ${productFilter === option ? "bg-[#eff6ff] text-[#2563eb]" : "text-[#334155] hover:bg-gray-50"}`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div className="flex items-center gap-2">
            {canCreateProduct ? (
              <button
                type="button"
                onClick={() => navigate("/products/products/new")}
                className="inline-flex h-8 w-8 items-center justify-center rounded bg-[#1b5e6a] text-white hover:opacity-90"
              >
                +
              </button>
            ) : null}
            <div className="relative" ref={sidebarMoreRef}>
              <button
                type="button"
                onClick={() => setSidebarMoreOpen((prev) => !prev)}
                className="inline-flex h-8 w-8 items-center justify-center rounded border border-[#d1d5db] text-[#64748b] hover:bg-[#f8fafc]"
              >
                <MoreVertical size={14} />
              </button>
              {sidebarMoreOpen ? (
                <div className="absolute right-0 top-full z-[140] mt-1 w-56 rounded-lg border border-[#d7dce8] bg-white py-1 shadow-xl">
                  {canCreateProduct ? (
                    <button
                      type="button"
                      onClick={() => {
                        setSidebarMoreOpen(false);
                        navigate("/products/products/import");
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-[#475569] hover:bg-[#3b82f6] hover:text-white"
                    >
                      <Upload size={14} />
                      Import Products
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={handleExportProducts}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-[#475569] hover:bg-[#3b82f6] hover:text-white"
                  >
                    <Download size={14} />
                    Export Products
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {sidebarProducts.map((row) => {
            const active = getId(row) === getId(selectedProduct);
            const key = normalizeProduct(row?.name);
            const matchingPlans = planCountByProduct.get(key) || 0;
            const matchingAddons = addonCountByProduct.get(key) || 0;
            const matchingCoupons = couponCountByProduct.get(key) || 0;
            return (
              <button
                key={getId(row)}
                type="button"
                onClick={() => navigate(`/products/products/${getId(row)}`, { state: { initialProduct: row } })}
                className={`w-full border-b border-gray-100 px-4 py-3 text-left ${active ? "bg-gray-100" : "hover:bg-gray-50"}`}
              >
                <div className="text-[14px] font-medium text-[#1e293b]">{row?.name || "-"}</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <span className="rounded border border-[#e2e8f0] bg-white px-2 py-0.5 text-[13px] text-[#0f172a]">{matchingPlans} Plans</span>
                  <span className="rounded border border-[#e2e8f0] bg-white px-2 py-0.5 text-[13px] text-[#0f172a]">{matchingAddons} Addons</span>
                  <span className="rounded border border-[#e2e8f0] bg-white px-2 py-0.5 text-[13px] text-[#0f172a]">{matchingCoupons} Coupons</span>
                </div>
              </button>
            );
          })}
        </div>
      </aside>

      <main className="flex flex-1 flex-col bg-white overflow-auto">
        <div className="flex items-center justify-between border-b border-gray-100 bg-white px-6 py-6 shadow-sm">
          <h1 className="text-[20px] font-semibold text-[#111827]">{selectedProduct.name}</h1>
          <button type="button" onClick={() => navigate("/products/plans?tab=products")} className="text-[#ef4444] hover:text-[#dc2626]">
            <X size={18} />
          </button>
        </div>

        <div className="flex items-center gap-4 border-b border-gray-100 bg-white px-6 py-3">
          {canEditProduct ? (
            <button
              type="button"
              onClick={() => setEditProductOpen(true)}
              className="inline-flex items-center gap-1 text-[12px] text-[#334155] hover:text-[#111827]"
            >
              <Pencil size={13} />
              Edit
            </button>
          ) : null}
          {isActive(selectedProduct) ? (
            <>
              {canCreatePlan ? (
                <button
                  type="button"
                  onClick={() => navigate(`/products/plans/new?product=${encodeURIComponent(selectedProductName)}`)}
                  className="inline-flex items-center gap-1 text-[12px] text-[#334155] hover:text-[#111827]"
                >
                  <CirclePlus size={13} />
                  Add Plan
                </button>
              ) : null}
              {canCreateAddon ? (
                <button
                  type="button"
                  onClick={() => navigate(`/products/addons/new?product=${encodeURIComponent(selectedProductName)}`)}
                  className="inline-flex items-center gap-1 text-[12px] text-[#334155] hover:text-[#111827]"
                >
                  <CirclePlus size={13} />
                  Add Addon
                </button>
              ) : null}
              {canCreateCoupon ? (
                <button
                  type="button"
                  onClick={() => navigate(`/products/coupons/new?product=${encodeURIComponent(selectedProductName)}`)}
                  className="inline-flex items-center gap-1 text-[12px] text-[#334155] hover:text-[#111827]"
                >
                  <CirclePlus size={13} />
                  Add Coupon
                </button>
              ) : null}
              {canEditProduct || canDeleteProduct ? <div className="h-4 w-px bg-[#d1d5db]" /> : null}

              {(canEditProduct || canDeleteProduct) ? (
                <div className="relative" ref={actionsRef}>
                  <button
                    type="button"
                    onClick={() => setActionsOpen((prev) => !prev)}
                    className="inline-flex h-7 w-7 items-center justify-center rounded border border-[#d1d5db] text-[#64748b] hover:bg-[#f8fafc]"
                  >
                    <MoreVertical size={14} />
                  </button>
                  {actionsOpen ? (
                    <div className="absolute left-0 top-full z-[130] mt-1 w-56 rounded-lg border border-[#d7dce8] bg-white py-1 shadow-xl">
                      {canEditProduct ? (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setActionsOpen(false);
                              setEmailTemplatesOpen(true);
                            }}
                            className="mx-1 mb-1 w-[calc(100%-8px)] rounded-md px-3 py-2 text-left text-sm text-[#475569] hover:bg-[#3b82f6] hover:text-white"
                          >
                            Associate Email Templates
                          </button>
                          <button type="button" onClick={handleToggleStatus} className="w-full px-3 py-2 text-left text-sm text-[#475569] hover:bg-[#3b82f6] hover:text-white">
                            {isActive(selectedProduct) ? "Mark as Inactive" : "Mark as Active"}
                          </button>
                        </>
                      ) : null}
                      {canDeleteProduct ? (
                        <button type="button" onClick={handleDeleteProduct} className="w-full px-3 py-2 text-left text-sm text-[#475569] hover:bg-[#3b82f6] hover:text-white">
                          Delete
                        </button>
                      ) : null}
                      {canEditProduct ? (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setActionsOpen(false);
                              navigate("/products/pricing-widgets");
                            }}
                            className="w-full px-3 py-2 text-left text-sm text-[#475569] hover:bg-[#3b82f6] hover:text-white"
                          >
                            Configure Pricing Widget
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setActionsOpen(false);
                              navigate(`/products/checkout-button?productId=${encodeURIComponent(getId(selectedProduct))}`);
                            }}
                            className="w-full px-3 py-2 text-left text-sm text-[#475569] hover:bg-[#3b82f6] hover:text-white"
                          >
                            Configure Checkout Button
                          </button>
                        </>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </>
          ) : (
            <>
              {canEditProduct ? (
                <>
                  <button
                    type="button"
                    onClick={handleToggleStatus}
                    className="inline-flex items-center gap-1 text-[12px] text-[#334155] hover:text-[#111827]"
                  >
                    <CheckCircle2 size={13} />
                    Mark as Active
                  </button>
                  {canDeleteProduct ? <div className="h-4 w-px bg-[#d1d5db]" /> : null}
                </>
              ) : null}
              {canDeleteProduct ? (
                <button
                  type="button"
                  onClick={handleDeleteProduct}
                  className="inline-flex items-center gap-1 text-[12px] text-[#334155] hover:text-[#111827]"
                >
                  <Trash2 size={13} />
                  Delete
                </button>
              ) : null}
            </>
          )}
        </div>

        <div className="flex-1 p-6">
          <div className="rounded-lg border border-gray-100 bg-white p-6 shadow-sm">
            <span className={`inline-block rounded px-3 py-1 text-xs font-semibold ${isActive(selectedProduct) ? "bg-[#1b5e6a] text-white" : "bg-[#6b7280] text-white"}`}>
              {selectedProduct.status || "Active"}
            </span>
            <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div>
                <div className="text-[16px] text-[#64748b]">Product Name</div>
                <div className="mt-1 text-[24px] font-semibold text-[#111827]">{selectedProduct.name || "-"}</div>
              </div>
              <div className="border-l border-[#d7dce8] pl-3">
                <div className="text-[16px] text-[#64748b]">Subscription#</div>
                <div className="mt-1 text-[22px] text-[#111827]">-</div>
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-lg border border-gray-100 bg-white shadow-sm">
            <div className="border-b border-[#e5e7eb] px-5 pt-3">
              <div className="flex items-center gap-6">
                <button type="button" onClick={() => setActiveTab("details")} className={`border-b-2 pb-3 text-sm ${activeTab === "details" ? "border-[#3b82f6] font-semibold text-[#111827]" : "border-transparent text-[#475569]"}`}>
                  Product Details
                </button>
                <button type="button" onClick={() => setActiveTab("plans")} className={`border-b-2 pb-3 text-sm ${activeTab === "plans" ? "border-[#3b82f6] font-semibold text-[#111827]" : "border-transparent text-[#475569]"}`}>
                  Plans
                </button>
                <button type="button" onClick={() => setActiveTab("addons")} className={`border-b-2 pb-3 text-sm ${activeTab === "addons" ? "border-[#3b82f6] font-semibold text-[#111827]" : "border-transparent text-[#475569]"}`}>
                  Addons
                </button>
                <button type="button" onClick={() => setActiveTab("coupons")} className={`border-b-2 pb-3 text-sm ${activeTab === "coupons" ? "border-[#3b82f6] font-semibold text-[#111827]" : "border-transparent text-[#475569]"}`}>
                  Coupons
                </button>
              </div>
            </div>

            <div className="p-5">
              {activeTab === "details" ? (
                <div className="grid grid-cols-[180px_1fr] gap-y-3 text-sm">
                  <div className="text-[#64748b]">Created On</div>
                  <div className="text-[#111827]">{formatDate(String(selectedProduct.createdAt || ""))}</div>
                  <div className="text-[#64748b]">Description</div>
                  <div className="text-[#111827]">{selectedProduct.description || "-"}</div>
                  <div className="text-[#64748b]">Redirection URL</div>
                  <div className="text-[#111827]">
                    {selectedProduct.redirectionUrl ? (
                      <a
                        href={toExternalUrl(String(selectedProduct.redirectionUrl))}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#2563eb] hover:underline break-all"
                      >
                        {String(selectedProduct.redirectionUrl)}
                      </a>
                    ) : (
                      "-"
                    )}
                  </div>
                  <div className="text-[#64748b]">Email Recipients</div>
                  <div className="text-[#111827]">{selectedProduct.emailRecipients || "-"}</div>
                </div>
              ) : null}

              {activeTab === "plans" ? (
                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-[28px] font-medium text-[#111827] leading-none">Plans</h3>
                    {canCreatePlan ? (
                      <button
                        type="button"
                        onClick={() => navigate(`/products/plans/new?product=${encodeURIComponent(selectedProductName)}`)}
                        className="inline-flex items-center gap-1 text-sm font-normal text-[#2563eb] hover:text-[#1d4ed8]"
                      >
                        <CirclePlus size={13} />
                        New
                      </button>
                    ) : null}
                  </div>

                  <table className="w-full border-collapse text-left">
                    <thead>
                      <tr className="border-y border-[#e3e7f2] bg-[#f7f8fc] text-[11px] uppercase tracking-wider text-[#64748b]">
                        <th className="px-4 py-3 font-semibold">Name</th>
                        <th className="px-4 py-3 font-semibold">Plan Code</th>
                        <th className="px-4 py-3 font-semibold">Status</th>
                        <th className="px-4 py-3 font-semibold">Pricing Scheme</th>
                      </tr>
                    </thead>
                    <tbody>
                      {productPlans.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-4 py-10 text-center text-sm text-[#64748b]">
                            No plans for this product yet.
                          </td>
                        </tr>
                      ) : (
                        productPlans.map((row) => {
                          const rowId = getId(row);
                          const status = String(row.status || "Active");
                          const statusClass =
                            status.toLowerCase() === "active" ? "text-[#1b5e6a]" : "text-[#64748b]";
                          return (
                            <tr key={rowId} className="border-b border-[#e3e7f2] text-[14px] text-[#111827]">
                              <td className="px-4 py-3">
                                {rowId ? (
                                  <button
                                    type="button"
                                    onClick={() => navigate(`/products/plans/${rowId}`)}
                                    className="text-[#0f172a] hover:text-[#2563eb]"
                                  >
                                    {row.planName || row.plan || "-"}
                                  </button>
                                ) : (
                                  row.planName || row.plan || "-"
                                )}
                              </td>
                              <td className="px-4 py-3">{row.planCode || "-"}</td>
                              <td className={`px-4 py-3 ${statusClass}`}>{status}</td>
                              <td className="px-4 py-3">{row.pricingModel || row.pricingScheme || "Unit"}</td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>

                  <div className="mt-5 flex items-center justify-between border-t border-[#e3e7f2] px-3 pt-4">
                    <div className="text-[16px] text-[#111827]">
                      Total Count:{" "}
                      {showTabCount.plans ? (
                        <span className="font-medium">{productPlans.length}</span>
                      ) : (
                        <button type="button" onClick={() => revealTabCount("plans")} className="text-[#2563eb] hover:underline">
                          View
                        </button>
                      )}
                    </div>
                    <div className="inline-flex items-center gap-2 rounded-md border border-[#d1d5db] px-3 py-1 text-[14px] text-[#334155]">
                      <ChevronLeft size={13} className="text-[#94a3b8]" />
                      <span>{productPlans.length === 0 ? "0 - 0" : `1 - ${productPlans.length}`}</span>
                      <ChevronRight size={13} className="text-[#94a3b8]" />
                    </div>
                  </div>
                </div>
              ) : null}

              {activeTab === "addons" ? (
                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-[28px] font-medium text-[#111827] leading-none">Addons</h3>
                    {canCreateAddon ? (
                      <button
                        type="button"
                        onClick={() => navigate(`/products/addons/new?product=${encodeURIComponent(selectedProductName)}`)}
                        className="inline-flex items-center gap-1 text-sm font-normal text-[#2563eb] hover:text-[#1d4ed8]"
                      >
                        <CirclePlus size={13} />
                        New
                      </button>
                    ) : null}
                  </div>

                  <table className="w-full border-collapse text-left">
                    <thead>
                      <tr className="border-y border-[#e3e7f2] bg-[#f7f8fc] text-[11px] uppercase tracking-wider text-[#64748b]">
                        <th className="px-4 py-3 font-semibold">Name</th>
                        <th className="px-4 py-3 font-semibold">Addon Code</th>
                        <th className="px-4 py-3 font-semibold">Status</th>
                        <th className="px-4 py-3 font-semibold">Pricing Scheme</th>
                      </tr>
                    </thead>
                    <tbody>
                      {productAddons.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-4 py-10 text-center text-sm text-[#64748b]">
                            No addons for this product yet.
                          </td>
                        </tr>
                      ) : (
                        productAddons.map((row) => {
                          const rowId = getId(row);
                          const status = String(row.status || "Active");
                          const statusClass =
                            status.toLowerCase() === "active" ? "text-[#1b5e6a]" : "text-[#64748b]";
                          return (
                            <tr key={rowId} className="border-b border-[#e3e7f2] text-[14px] text-[#111827]">
                              <td className="px-4 py-3">
                                {rowId ? (
                                  <button
                                    type="button"
                                    onClick={() => navigate(`/products/addons/${rowId}`)}
                                    className="text-[#0f172a] hover:text-[#2563eb]"
                                  >
                                    {row.addonName || "-"}
                                  </button>
                                ) : (
                                  row.addonName || "-"
                                )}
                              </td>
                              <td className="px-4 py-3">{row.addonCode || "-"}</td>
                              <td className={`px-4 py-3 ${statusClass}`}>{status}</td>
                              <td className="px-4 py-3">{row.pricingModel || "Per Unit"}</td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>

                  <div className="mt-5 flex items-center justify-between border-t border-[#e3e7f2] px-3 pt-4">
                    <div className="text-[16px] text-[#111827]">
                      Total Count:{" "}
                      {showTabCount.addons ? (
                        <span className="font-medium">{productAddons.length}</span>
                      ) : (
                        <button type="button" onClick={() => revealTabCount("addons")} className="text-[#2563eb] hover:underline">
                          View
                        </button>
                      )}
                    </div>
                    <div className="inline-flex items-center gap-2 rounded-md border border-[#d1d5db] px-3 py-1 text-[14px] text-[#334155]">
                      <ChevronLeft size={13} className="text-[#94a3b8]" />
                      <span>{productAddons.length === 0 ? "0 - 0" : `1 - ${productAddons.length}`}</span>
                      <ChevronRight size={13} className="text-[#94a3b8]" />
                    </div>
                  </div>
                </div>
              ) : null}

              {activeTab === "coupons" ? (
                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-[28px] font-medium text-[#111827] leading-none">Coupons</h3>
                    {canCreateCoupon ? (
                      <button
                        type="button"
                        onClick={() => navigate(`/products/coupons/new?product=${encodeURIComponent(selectedProductName)}`)}
                        className="inline-flex items-center gap-1 text-sm font-normal text-[#2563eb] hover:text-[#1d4ed8]"
                      >
                        <CirclePlus size={13} />
                        New
                      </button>
                    ) : null}
                  </div>

                  <table className="w-full border-collapse text-left">
                    <thead>
                      <tr className="border-y border-[#e3e7f2] bg-[#f7f8fc] text-[11px] uppercase tracking-wider text-[#64748b]">
                        <th className="px-4 py-3 font-semibold">Name</th>
                        <th className="px-4 py-3 font-semibold">Coupon Code</th>
                        <th className="px-4 py-3 font-semibold">Status</th>
                        <th className="px-4 py-3 font-semibold">Discount Type</th>
                      </tr>
                    </thead>
                    <tbody>
                      {productCoupons.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-4 py-10 text-center text-sm text-[#64748b]">
                            No coupons for this product yet.
                          </td>
                        </tr>
                      ) : (
                        productCoupons.map((row) => {
                          const rowId = getId(row);
                          const status = String(row.status || "Active");
                          const statusClass =
                            status.toLowerCase() === "active" ? "text-[#1b5e6a]" : "text-[#64748b]";
                          return (
                            <tr key={rowId} className="border-b border-[#e3e7f2] text-[14px] text-[#111827]">
                              <td className="px-4 py-3">{row.couponName || "-"}</td>
                              <td className="px-4 py-3">{row.couponCode || "-"}</td>
                              <td className={`px-4 py-3 ${statusClass}`}>{status}</td>
                              <td className="px-4 py-3">{row.discountType || "-"}</td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>

                  <div className="mt-5 flex items-center justify-between border-t border-[#e3e7f2] px-3 pt-4">
                    <div className="text-[16px] text-[#111827]">
                      Total Count:{" "}
                      {showTabCount.coupons ? (
                        <span className="font-medium">{productCoupons.length}</span>
                      ) : (
                        <button type="button" onClick={() => revealTabCount("coupons")} className="text-[#2563eb] hover:underline">
                          View
                        </button>
                      )}
                    </div>
                    <div className="inline-flex items-center gap-2 rounded-md border border-[#d1d5db] px-3 py-1 text-[14px] text-[#334155]">
                      <ChevronLeft size={13} className="text-[#94a3b8]" />
                      <span>{productCoupons.length === 0 ? "0 - 0" : `1 - ${productCoupons.length}`}</span>
                      <ChevronRight size={13} className="text-[#94a3b8]" />
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </main>

      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-[2100] flex items-start justify-center bg-black/40 pt-16">
          <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-3">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-100 text-[12px] font-bold text-amber-600">
                !
              </div>
              <h3 className="flex-1 text-[15px] font-semibold text-slate-800">Delete product?</h3>
              <button
                type="button"
                className="h-7 w-7 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                onClick={() => setIsDeleteModalOpen(false)}
                aria-label="Close"
              >
                <X size={14} />
              </button>
            </div>
            <div className="px-5 py-3 text-[13px] text-slate-600">
              You cannot retrieve this product once it has been deleted.
            </div>
            <div className="flex items-center justify-start gap-2 border-t border-slate-100 px-5 py-3">
              <button
                type="button"
                className="rounded-md bg-blue-600 px-4 py-1.5 text-[12px] text-white hover:bg-blue-700"
                onClick={confirmDeleteProduct}
              >
                Delete
              </button>
              <button
                type="button"
                className="rounded-md border border-slate-300 px-4 py-1.5 text-[12px] text-slate-700 hover:bg-slate-50"
                onClick={() => setIsDeleteModalOpen(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <NewProductModal
        isOpen={editProductOpen}
        mode="edit"
        initialProduct={selectedProduct}
        onClose={() => setEditProductOpen(false)}
        onSaveSuccess={(savedProduct) => {
          if (savedProduct && getId(savedProduct) === normalizedProductId) {
            setInitialSelectedProduct(savedProduct);
          }
        }}
      />

      {emailTemplatesOpen ? (
        <div className="fixed inset-0 z-[260] bg-black/45 p-6">
          <div className="mx-auto mt-2 w-full max-w-[620px] overflow-hidden rounded-lg border border-[#d8deea] bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#e5e7eb] px-5 py-4">
              <h2 className="text-[32px] font-medium text-[#1f2937] leading-none">Associate Email Templates</h2>
              <button
                type="button"
                onClick={() => setEmailTemplatesOpen(false)}
                className="text-[#ef4444] hover:text-[#dc2626]"
              >
                <X size={20} />
              </button>
            </div>

            <div className="max-h-[calc(100vh-250px)] overflow-y-auto px-5 py-5">
              <div className="space-y-4">
                {EMAIL_TEMPLATE_EVENTS.map((eventLabel) => (
                  <div key={eventLabel} className="grid grid-cols-[190px_1fr] items-center gap-4">
                    <label className="text-[15px] text-[#4b5563]">{eventLabel}</label>
                    <select
                      value={emailTemplateMap[eventLabel] || "Default"}
                      onChange={(e) => setEmailTemplateMap((prev) => ({ ...prev, [eventLabel]: e.target.value }))}
                      className="h-10 w-full rounded border border-[#cfd5e3] bg-white px-3 text-[14px] text-[#4b5563] outline-none focus:border-[#3b82f6]"
                    >
                      <option value="Default">Default</option>
                    </select>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-[#e5e7eb] px-5 py-4">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    if (emailTemplateStorageKey) {
                      localStorage.setItem(emailTemplateStorageKey, JSON.stringify(emailTemplateMap));
                    }
                    setEmailTemplatesOpen(false);
                    toast.success("Email templates saved");
                  }}
                  className="rounded bg-[#1b5e6a] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setEmailTemplatesOpen(false)}
                  className="rounded border border-[#cfd5e3] bg-white px-4 py-2 text-sm text-[#111827] hover:bg-[#f8fafc]"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
