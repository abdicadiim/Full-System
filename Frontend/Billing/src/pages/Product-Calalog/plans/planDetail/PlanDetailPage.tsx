import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  BarChart3,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Circle,
  CirclePlus,
  Copy,
  Download,
  Globe,
  MessageSquare,
  MoreHorizontal,
  Pencil,
  Plus,
  RotateCcw,
  Share2,
  Settings,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import CommentsDrawer from "../components/CommentsDrawer";
import PlansBulkUpdateModal from "../components/PlansBulkUpdateModal";
import { buildCloneName } from "../../utils/cloneName";

const PLANS_STORAGE_KEY = "inv_plans_v1";
const ADDONS_STORAGE_KEY = "inv_addons_v1";
const PRICE_LISTS_STORAGE_KEY = "inv_price_lists_v1";

const getPlanId = (row: any) => String(row?.id || row?._id || "");
const isPlanActive = (row: any) => String(row?.status || "Active").toLowerCase() === "active";

const formatDate = (value: string) => {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};

const formatFrequency = (row: any) => {
  if (row?.billingFrequency) return String(row.billingFrequency);
  const value = String(row?.billingFrequencyValue || "1").trim();
  const period = String(row?.billingFrequencyPeriod || "Month(s)").toLowerCase();
  return `${value} ${period}`;
};

const planNameOf = (row: any) => String(row?.planName || row?.plan || row?.name || "Plan").trim();
const planCodeOf = (row: any) => String(row?.planCode || row?.code || "-").trim() || "-";
const hostedUrlOf = (row: any) => String(row?.hostedUrl || "");

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

export default function PlanDetailPage() {
  const navigate = useNavigate();
  const { planId } = useParams();
  const actionsRef = useRef<HTMLDivElement>(null);
  const planFilterRef = useRef<HTMLDivElement>(null);
  const bulkActionsRef = useRef<HTMLDivElement>(null);

  const sidebarMenuRef = useRef<HTMLDivElement>(null);

  const [plans, setPlans] = useState<any[]>([]);
  const [addons, setAddons] = useState<any[]>([]);
  const [priceLists, setPriceLists] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"details" | "addons" | "price-lists" | "activity">("details");
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [isActionsOpen, setIsActionsOpen] = useState(false);
  const [showAddonCount, setShowAddonCount] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [planStatusFilter, setPlanStatusFilter] = useState<"All Plans" | "Active Plans" | "Inactive Plans">("All Plans");
  const [isPlanFilterOpen, setIsPlanFilterOpen] = useState(false);
  const [isBulkActionsOpen, setIsBulkActionsOpen] = useState(false);
  const [bulkUpdateOpen, setBulkUpdateOpen] = useState(false);
  const [showPriceListCount, setShowPriceListCount] = useState(false);
  const [isSidebarMenuOpen, setIsSidebarMenuOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadPlans = () => {
    try {
      const raw = localStorage.getItem(PLANS_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      setPlans(Array.isArray(parsed) ? parsed : []);
    } catch {
      setPlans([]);
    }
  };

  const loadAddons = () => {
    try {
      const raw = localStorage.getItem(ADDONS_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      setAddons(Array.isArray(parsed) ? parsed : []);
    } catch {
      setAddons([]);
    }
  };

  const loadPriceLists = () => {
    try {
      const raw = localStorage.getItem(PRICE_LISTS_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      setPriceLists(Array.isArray(parsed) ? parsed : []);
    } catch {
      setPriceLists([]);
    }
  };

  useEffect(() => {
    loadPlans();
    loadAddons();
    loadPriceLists();
    const onStorage = () => {
      loadPlans();
      loadAddons();
      loadPriceLists();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    const onOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (actionsRef.current && !actionsRef.current.contains(target)) {
        setIsActionsOpen(false);
      }
      if (planFilterRef.current && !planFilterRef.current.contains(target)) {
        setIsPlanFilterOpen(false);
      }
      if (bulkActionsRef.current && !bulkActionsRef.current.contains(target)) {
        setIsBulkActionsOpen(false);
      }
      if (sidebarMenuRef.current && !sidebarMenuRef.current.contains(target)) {
        setIsSidebarMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onOutsideClick);
    return () => document.removeEventListener("mousedown", onOutsideClick);
  }, []);

  useEffect(() => {
    setSelectedIds((prev) => prev.filter((id) => plans.some((plan) => getPlanId(plan) === id)));
  }, [plans]);

  useEffect(() => {
    if (selectedIds.length === 0) {
      setIsBulkActionsOpen(false);
    }
  }, [selectedIds.length]);

  const sidebarPlans = useMemo(() => {
    return plans.filter((plan) => {
      const status = String(plan?.status || "Active").toLowerCase();
      if (planStatusFilter === "Active Plans") return status === "active";
      if (planStatusFilter === "Inactive Plans") return status === "inactive";
      return true;
    });
  }, [plans, planStatusFilter]);

  const visiblePlanIds = useMemo(
    () => sidebarPlans.map((plan) => getPlanId(plan)).filter(Boolean),
    [sidebarPlans]
  );

  const allVisibleSelected =
    visiblePlanIds.length > 0 && visiblePlanIds.every((id) => selectedIds.includes(id));

  const selectedPlan = useMemo(() => plans.find((p) => getPlanId(p) === planId) || plans[0] || null, [plans, planId]);
  const selectedPlanName = useMemo(() => planNameOf(selectedPlan).toLowerCase(), [selectedPlan]);
  const selectedPlanProduct = useMemo(
    () => String(selectedPlan?.product || "").trim().toLowerCase(),
    [selectedPlan]
  );

  const planAddons = useMemo(() => {
    return addons.filter((addon) => {
      const addonProduct = String(addon?.product || "").trim().toLowerCase();
      const productMatches = !selectedPlanProduct || !addonProduct || addonProduct === selectedPlanProduct;

      const associatedPlans = String(addon?.associatedPlans || "").trim().toLowerCase();
      const selectedPlans = Array.isArray(addon?.selectedPlans)
        ? addon.selectedPlans.map((name: any) => String(name || "").trim().toLowerCase())
        : [];
      const planSummary = String(addon?.plan || "").trim().toLowerCase();
      const summaryPlans = planSummary
        .split(",")
        .map((name) => name.trim())
        .filter(Boolean);

      const planMatches =
        associatedPlans === "all plans" ||
        planSummary === "all plans" ||
        selectedPlans.includes(selectedPlanName) ||
        summaryPlans.includes(selectedPlanName);

      return productMatches && (planMatches || (!selectedPlans.length && !summaryPlans.length));
    });
  }, [addons, selectedPlanName, selectedPlanProduct]);

  const planPriceLists = useMemo(() => {
    return priceLists.filter((priceList) => {
      const relatedProduct = String(priceList?.product || priceList?.productName || "").trim().toLowerCase();
      if (!relatedProduct || !selectedPlanProduct) return true;
      return relatedProduct === selectedPlanProduct;
    });
  }, [priceLists, selectedPlanProduct]);

  useEffect(() => {
    setShowAddonCount(false);
    setShowPriceListCount(false);
  }, [planId]);

  const savePlans = (nextPlans: any[]) => {
    localStorage.setItem(PLANS_STORAGE_KEY, JSON.stringify(nextPlans));
    setPlans(nextPlans);
  };

  const toggleRowSelection = (id: string) => {
    if (!id) return;
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const toggleSelectAllVisible = () => {
    if (visiblePlanIds.length === 0) {
      setSelectedIds([]);
      return;
    }
    setSelectedIds((prev) => {
      if (allVisibleSelected) {
        const visibleSet = new Set(visiblePlanIds);
        return prev.filter((id) => !visibleSet.has(id));
      }
      const next = new Set(prev);
      visiblePlanIds.forEach((id) => next.add(id));
      return Array.from(next);
    });
  };

  const clearSelection = () => {
    setSelectedIds([]);
    setIsBulkActionsOpen(false);
  };

  const handleEdit = () => {
    if (!selectedPlan) return;
    navigate(`/products/plans/new?edit=${getPlanId(selectedPlan)}`);
  };

  const handleToggleStatus = () => {
    if (!selectedPlan) return;
    const nextStatus = isPlanActive(selectedPlan) ? "Inactive" : "Active";
    const targetId = getPlanId(selectedPlan);
    const nextPlans = plans.map((plan) =>
      getPlanId(plan) === targetId
        ? {
          ...plan,
          status: nextStatus,
          updatedAt: new Date().toISOString(),
        }
        : plan
    );
    savePlans(nextPlans);
    toast.success(`Plan marked as ${nextStatus.toLowerCase()}`);
    setIsActionsOpen(false);
  };

  const handleClone = () => {
    if (!selectedPlan) return;
    const now = new Date().toISOString();
    const cloneId = `plan-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const clone = {
      ...selectedPlan,
      id: cloneId,
      planName: buildCloneName(
        planNameOf(selectedPlan),
        plans.map((plan) => planNameOf(plan)),
        "Plan"
      ),
      planCode: `${planCodeOf(selectedPlan)}-clone`,
      createdAt: now,
      updatedAt: now,
    };
    const nextPlans = [clone, ...plans];
    savePlans(nextPlans);
    toast.success("Plan cloned successfully");
    setIsActionsOpen(false);
    navigate(`/products/plans/${cloneId}`);
  };

  const handleDelete = () => {
    if (!selectedPlan) return;
    if (!window.confirm("Are you sure you want to delete this plan?")) return;
    const targetId = getPlanId(selectedPlan);
    const nextPlans = plans.filter((plan) => getPlanId(plan) !== targetId);
    savePlans(nextPlans);
    toast.success("Plan deleted");
    setIsActionsOpen(false);
    if (nextPlans.length > 0) navigate(`/products/plans/${getPlanId(nextPlans[0])}`);
    else navigate("/products/plans");
  };

  const handleBulkMarkStatus = (status: "Active" | "Inactive") => {
    if (selectedIds.length === 0) return;
    const selectedSet = new Set(selectedIds);
    const nextPlans = plans.map((plan) =>
      selectedSet.has(getPlanId(plan))
        ? {
          ...plan,
          status,
          updatedAt: new Date().toISOString(),
        }
        : plan
    );
    savePlans(nextPlans);
    clearSelection();
    toast.success(`Selected plans marked as ${status.toLowerCase()}`);
  };

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Are you sure you want to delete ${selectedIds.length} selected plans?`)) return;

    const selectedSet = new Set(selectedIds);
    const currentSelectedPlanId = getPlanId(selectedPlan);
    const deletingCurrentPlan = selectedSet.has(currentSelectedPlanId);
    const nextPlans = plans.filter((plan) => !selectedSet.has(getPlanId(plan)));

    savePlans(nextPlans);
    clearSelection();
    toast.success("Selected plans deleted");

    if (nextPlans.length === 0) {
      navigate("/products/plans");
      return;
    }

    if (deletingCurrentPlan) {
      navigate(`/products/plans/${getPlanId(nextPlans[0])}`);
    }
  };

  const handleBulkUpdate = (field: string, newValue: string) => {
    if (selectedIds.length === 0) return;
    const selectedSet = new Set(selectedIds);
    const now = new Date().toISOString();

    const nextPlans = plans.map((plan) => {
      if (!selectedSet.has(getPlanId(plan))) return plan;

      if (field === "description") {
        return { ...plan, planDescription: newValue, description: newValue, updatedAt: now };
      }
      if (field === "salesAccount") {
        return { ...plan, account: newValue, salesAccount: newValue, planAccount: newValue, updatedAt: now };
      }
      if (field === "showInWidget") {
        const boolValue = String(newValue).toLowerCase() === "true";
        return { ...plan, showInWidget: boolValue, includeInWidget: boolValue, widgetsPreference: boolValue, updatedAt: now };
      }
      if (field === "showInPortal") {
        const boolValue = String(newValue).toLowerCase() === "true";
        return { ...plan, showInPortal: boolValue, updatedAt: now };
      }
      if (field === "price") {
        const parsedPrice = Number(newValue);
        return { ...plan, price: Number.isFinite(parsedPrice) ? parsedPrice : Number(plan?.price || 0), updatedAt: now };
      }

      return { ...plan, [field]: newValue, updatedAt: now };
    });

    savePlans(nextPlans);
    setBulkUpdateOpen(false);
    clearSelection();
    toast.success("Selected plans updated successfully");
  };

  const setSelectedPlanImage = (image: string) => {
    if (!selectedPlan) return;
    const selectedId = getPlanId(selectedPlan);
    const now = new Date().toISOString();
    const nextPlans = plans.map((plan) =>
      getPlanId(plan) === selectedId
        ? {
          ...plan,
          image,
          updatedAt: now,
        }
        : plan
    );
    savePlans(nextPlans);
  };

  const handleShareHostedPaymentPage = async () => {
    if (!selectedPlan || !isPlanActive(selectedPlan)) return;
    const url = hostedUrlOf(selectedPlan);
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Hosted payment page link copied");
    } catch {
      toast.error("Unable to copy link");
    }
  };

  const handleExport = () => {
    const headers = ["Plan Name", "Product Name", "Plan Code", "Status", "Price", "Billing Frequency"];
    const rows = plans.map((plan: any) => [
      planNameOf(plan),
      String(plan?.product || "-"),
      planCodeOf(plan),
      isPlanActive(plan) ? "Active" : "Inactive",
      String(plan?.price || 0),
      formatFrequency(plan),
    ]);
    const csv = toCsv(headers, rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "plans-export.csv";
    a.click();
    URL.revokeObjectURL(url);
    setIsSidebarMenuOpen(false);
    toast.success("Plans exported");
  };


  if (!selectedPlan) {
    return <div className="rounded-lg border border-[#d8deea] bg-white p-8 text-sm text-slate-600">No plans found.</div>;
  }

  const hostedUrl = hostedUrlOf(selectedPlan);
  const planImage = String(selectedPlan?.image || "");
  const includeWidget = Boolean(selectedPlan?.widgetsPreference);
  const showPortal = Boolean(selectedPlan?.showInPortal);

  return (
    <div className="relative flex h-[calc(100vh-100px)] overflow-hidden rounded-lg border border-[#d8deea] bg-[#f3f5fa]">
      <aside className="flex w-[360px] min-h-0 flex-col border-r border-[#d8deea] bg-white">
        {selectedIds.length > 0 ? (
          <div className="border-b border-[#e5e7eb] bg-[#f8fafc] px-2 py-2">
            <div className="flex items-center justify-between rounded-lg border border-[#e5e7eb] bg-white px-2 py-1.5">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  onChange={toggleSelectAllVisible}
                  className="h-4 w-4 rounded border-gray-300 accent-[#3b82f6]"
                />
                <div className="relative" ref={bulkActionsRef}>
                  <button
                    type="button"
                    onClick={() => setIsBulkActionsOpen((prev) => !prev)}
                    className="inline-flex items-center gap-1 rounded border border-gray-200 bg-white px-2.5 py-1.5 text-sm text-[#111827] hover:bg-gray-50"
                  >
                    Bulk Actions
                    <ChevronDown size={14} />
                  </button>
                  {isBulkActionsOpen ? (
                    <div className="absolute left-0 top-full z-[200] mt-1 w-52 rounded-lg border border-[#d7dce8] bg-white py-1 shadow-xl">
                      <button
                        type="button"
                        onClick={() => {
                          setIsBulkActionsOpen(false);
                          setBulkUpdateOpen(true);
                        }}
                        className="mx-1 block w-[calc(100%-8px)] rounded-md px-3 py-2 text-left text-sm text-[#334155] hover:bg-[#3b82f6] hover:text-white"
                      >
                        Bulk Update
                      </button>
                      <button
                        type="button"
                        onClick={() => handleBulkMarkStatus("Active")}
                        className="w-full px-4 py-2 text-left text-sm text-[#334155] hover:bg-[#f8fafc]"
                      >
                        Mark as Active
                      </button>
                      <button
                        type="button"
                        onClick={() => handleBulkMarkStatus("Inactive")}
                        className="w-full px-4 py-2 text-left text-sm text-[#334155] hover:bg-[#f8fafc]"
                      >
                        Mark as Inactive
                      </button>
                      <button
                        type="button"
                        onClick={handleBulkDelete}
                        className="w-full px-4 py-2 text-left text-sm text-[#334155] hover:bg-[#f8fafc]"
                      >
                        Delete
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-5 w-px bg-gray-200" />
                <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-[#eff6ff] px-2 text-[12px] font-semibold text-[#2563eb]">
                  {selectedIds.length}
                </span>
                <span className="text-sm text-[#334155]">Selected</span>
                <button type="button" onClick={clearSelection} className="text-[#ef4444] hover:text-[#dc2626]">
                  <X size={18} />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between border-b border-[#e5e7eb] px-4 py-3">
            <div className="relative" ref={planFilterRef}>
              <button
                type="button"
                onClick={() => setIsPlanFilterOpen((prev) => !prev)}
                className="inline-flex items-center gap-1 text-sm font-semibold text-[#111827]"
              >
                {planStatusFilter}
                <ChevronDown size={14} className="text-[#2563eb]" />
              </button>
              {isPlanFilterOpen ? (
                <div className="absolute left-0 top-full z-[180] mt-1 w-48 rounded-md border border-gray-200 bg-white py-1 shadow-xl">
                  {(["All Plans", "Active Plans", "Inactive Plans"] as const).map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => {
                        setPlanStatusFilter(option);
                        setIsPlanFilterOpen(false);
                      }}
                      className={`w-full px-4 py-2 text-left text-sm ${planStatusFilter === option ? "bg-[#eff6ff] text-[#2563eb]" : "text-[#334155] hover:bg-gray-50"}`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => navigate("/products/plans/new")}
                className="inline-flex h-7 w-7 items-center justify-center rounded bg-[#22b573] text-white hover:opacity-90"
              >
                <Plus size={14} />
              </button>
              <div className="relative" ref={sidebarMenuRef}>
                <button
                  type="button"
                  onClick={() => setIsSidebarMenuOpen((prev) => !prev)}
                  className="inline-flex h-7 w-7 items-center justify-center rounded border border-gray-300 text-slate-500 hover:bg-gray-50"
                >
                  <MoreHorizontal size={14} />
                </button>
                {isSidebarMenuOpen && (
                  <div className="absolute right-0 top-full z-[180] mt-1 w-44 rounded-lg border border-[#d7dce8] bg-white py-1 shadow-xl">
                    <button
                      type="button"
                      onClick={() => {
                        setIsSidebarMenuOpen(false);
                        navigate("/products/plans/import");
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-sm text-[#475569] hover:bg-[#f8fafc]"
                    >
                      <Upload size={14} className="text-[#1b5e6a]" />
                      Import Plans
                    </button>
                    <button
                      type="button"
                      onClick={handleExport}
                      className="flex w-full items-center gap-2 px-3 py-2 text-sm text-[#475569] hover:bg-[#f8fafc]"
                    >
                      <Download size={14} className="text-[#1b5e6a]" />
                      Export Plans
                    </button>
                    <div className="my-1 h-px bg-gray-100" />
                    <button
                      type="button"
                      onClick={() => {
                        setIsSidebarMenuOpen(false);
                        loadPlans();
                        toast.success("Page refreshed");
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-sm text-[#475569] hover:bg-[#f8fafc]"
                    >
                      <RotateCcw size={14} className="text-[#1b5e6a]" />
                      Refresh
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          {sidebarPlans.map((plan) => {
            const planRowId = getPlanId(plan);
            const active = planRowId === getPlanId(selectedPlan);
            const checked = selectedIds.includes(planRowId);
            return (
              <button
                key={planRowId}
                type="button"
                onClick={() => navigate(`/products/plans/${planRowId}`)}
                className={`w-full border-b border-gray-100 px-4 py-3 text-left transition-colors ${active ? "bg-[#f0f4ff]" : "bg-white hover:bg-gray-50"}`}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleRowSelection(planRowId)}
                    onClick={(event) => event.stopPropagation()}
                    className="mt-1 h-4 w-4 rounded border-gray-300 accent-[#3b82f6]"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="truncate text-sm font-medium text-[#111827]">{planNameOf(plan)}</div>
                      <div className="text-right text-sm text-[#111827]">{String(plan?.unitName || "Unit")}</div>
                    </div>
                    <div className="mt-1 flex items-start justify-between gap-2">
                      <div className={`text-[11px] font-medium uppercase ${isPlanActive(plan) ? "text-[#16a34a]" : "text-[#8b949e]"}`}>
                        {isPlanActive(plan) ? "ACTIVE" : "INACTIVE"}
                      </div>
                      <div className="text-right text-[11px] text-[#334155]">{formatFrequency(plan)}</div>
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </aside>

      <main className="flex min-h-0 flex-1 flex-col">
        <div className="flex items-center justify-between border-b border-[#d8deea] bg-white px-4 py-3">
          <h1 className="text-[18px] font-semibold text-[#111827]">{planNameOf(selectedPlan)}</h1>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCommentsOpen(true)}
              className="inline-flex h-7 w-7 items-center justify-center rounded border border-gray-300 text-[#64748b] hover:bg-gray-50"
            >
              <MessageSquare size={14} />
            </button>
            <button type="button" onClick={() => navigate("/products/plans")} className="text-[#ef4444] hover:text-[#dc2626]">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-4 border-b border-[#d8deea] bg-white px-4 py-2">
          <button type="button" onClick={handleEdit} className="inline-flex items-center gap-1 text-[12px] text-[#334155] hover:text-[#1b5e6a]">
            <Pencil size={13} />
            Edit
          </button>
          <button type="button" onClick={handleToggleStatus} className="inline-flex items-center gap-1 text-[12px] text-[#334155] hover:text-[#1b5e6a]">
            <Circle size={12} />
            {isPlanActive(selectedPlan) ? "Mark as Inactive" : "Mark as Active"}
          </button>
          {isPlanActive(selectedPlan) ? (
            <>
              <div className="h-4 w-px bg-[#d1d5db]" />
              <button type="button" onClick={handleShareHostedPaymentPage} className="inline-flex items-center gap-1 text-[12px] text-[#334155] hover:text-[#1b5e6a]">
                <Share2 size={13} />
                Share Hosted Payment Page
              </button>
            </>
          ) : null}
          <div className="h-4 w-px bg-[#d1d5db]" />

          <div className="relative" ref={actionsRef}>
            <button
              type="button"
              onClick={() => setIsActionsOpen((prev) => !prev)}
              className="inline-flex h-7 w-7 items-center justify-center rounded border border-[#d1d5db] text-[#64748b] hover:bg-[#f8fafc]"
            >
              <MoreHorizontal size={14} />
            </button>
            {isActionsOpen ? (
              <div className="absolute left-0 top-full z-[140] mt-1 w-44 rounded-lg border border-[#d7dce8] bg-white py-1 shadow-xl">
                <button type="button" onClick={handleClone} className="flex w-full items-center gap-2 px-3 py-2 text-sm text-[#475569] hover:bg-[#f8fafc]">
                  <Copy size={14} className="text-[#1b5e6a]" />
                  Clone
                </button>
                <button type="button" onClick={handleDelete} className="flex w-full items-center gap-2 px-3 py-2 text-sm text-[#475569] hover:bg-[#f8fafc]">
                  <Trash2 size={14} className="text-[#1b5e6a]" />
                  Delete
                </button>
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-4">
          <div className="rounded-xl border border-[#d8deea] bg-white p-5 shadow-[0_8px_18px_rgba(15,23,42,0.05)]">
            <span className={`inline-block rounded px-3 py-1 text-xs font-semibold text-white ${isPlanActive(selectedPlan) ? "bg-[#22b573]" : "bg-[#8b949e]"}`}>
              {isPlanActive(selectedPlan) ? "Active" : "Inactive"}
            </span>

            <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_200px_1.4fr]">
              <div>
                <h2 className="text-[20px] font-medium text-[#111827]">{planNameOf(selectedPlan)}</h2>
                <p className="mt-2 text-[16px] text-[#64748b]">
                  Plan Code: <span className="rounded bg-[#eef1f6] px-2 py-0.5 text-[#1e293b]">{planCodeOf(selectedPlan)}</span>
                </p>
              </div>

              <div className="border-l-2 border-[#22b573] pl-3">
                <div className="text-[22px] font-medium text-[#111827]">AMD{Number(selectedPlan?.price || 0).toFixed(2)}</div>
                <div className="text-[14px] text-[#64748b]">Bill Every {formatFrequency(selectedPlan)}</div>
              </div>

              <div>
                <div className="text-[14px] text-[#334155]">Hosted Payment Page URL</div>
                <div className="mt-2 flex items-center gap-2 rounded bg-[#f1f3f9] px-3 py-2">
                  <Globe size={15} className="text-[#64748b]" />
                  <span className="flex-1 truncate text-[12px] text-[#334155]">{hostedUrl}</span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(hostedUrl);
                      toast.success("Link copied");
                    }}
                    className="text-[#64748b] hover:text-[#1b5e6a]"
                  >
                    <Copy size={14} />
                  </button>
                  <button type="button" className="inline-flex items-center gap-1 text-[13px] text-[#3b82f6] hover:underline">
                    <Settings size={13} />
                    Customize
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-5 border-t border-dashed border-[#d8deea] pt-3 text-[14px] text-[#334155]">
              <span className="inline-flex items-center gap-1 text-[#22b573]">
                <BarChart3 size={15} />
              </span>{" "}
              MRR : <span className="font-medium">AMD0.00</span>
              <span className="mx-3 text-[#94a3b8]">•</span>
              ARR : <span className="font-medium">AMD0.00</span>
            </div>
          </div>

          <div className="mt-3 rounded-xl border border-[#d8deea] bg-white shadow-[0_8px_18px_rgba(15,23,42,0.05)]">
            <div className="border-b border-[#e5e7eb] px-4 pt-2">
              <div className="flex items-center gap-7">
                {[
                  { key: "details", label: "Plan Details" },
                  { key: "addons", label: "Addons" },
                  { key: "price-lists", label: "Price Lists" },
                  { key: "activity", label: "Activity Logs" },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveTab(tab.key as typeof activeTab)}
                    className={`border-b-2 pb-3 text-[13px] ${activeTab === tab.key ? "border-[#3b82f6] text-[#111827]" : "border-transparent text-[#334155]"}`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-5">
              {activeTab === "details" ? (
                <>
                  <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[1fr_280px]">
                    <div className="grid grid-cols-[180px_1fr] gap-y-3 text-[13px]">
                      <span className="text-[#64748b]">Plan Name</span>
                      <span className="text-[#111827]">{planNameOf(selectedPlan)}</span>
                      <span className="text-[#64748b]">Plan Code</span>
                      <span className="text-[#111827]">{planCodeOf(selectedPlan)}</span>
                      <span className="text-[#64748b]">Product Name</span>
                      <span className="text-[#2563eb]">{String(selectedPlan?.product || "-")}</span>
                      <span className="text-[#64748b]">Creation Date</span>
                      <span className="text-[#111827]">{formatDate(String(selectedPlan?.createdAt || selectedPlan?.createdOn || ""))}</span>
                      <span className="text-[#64748b]">Billing Cycles</span>
                      <span className="text-[#111827]">{String(selectedPlan?.billingCycle || "Auto-renews until canceled")}</span>
                      <span className="text-[#64748b]">Billing Frequency</span>
                      <span className="text-[#111827]">{formatFrequency(selectedPlan)}</span>
                    </div>

                    <div className="justify-self-end self-start w-full max-w-[280px]">
                      <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              setSelectedPlanImage(String(reader.result || ""));
                            };
                            reader.readAsDataURL(file);
                          }
                          e.target.value = "";
                        }}
                      />

                      {planImage ? (
                        <div className="group relative h-[140px] w-full rounded-xl border border-[#d8deea] bg-white p-2">
                          <img
                            src={planImage}
                            alt="Plan"
                            className="h-full w-full rounded-lg object-cover"
                          />
                          <div className="mt-2 flex items-center justify-between px-1">
                            <button
                              type="button"
                              onClick={() => fileInputRef.current?.click()}
                              className="text-[12px] text-[#3b82f6] hover:underline"
                            >
                              Change Image
                            </button>
                            <button
                              type="button"
                              onClick={() => setSelectedPlanImage("")}
                              className="text-[#64748b] hover:text-red-500"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div
                          onClick={() => fileInputRef.current?.click()}
                          className="flex h-[140px] w-full cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#d8deea] bg-white transition-colors hover:bg-gray-50"
                        >
                          <svg className="h-10 w-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <p className="mt-2 text-[13px] text-[#64748b]">Drag image(s) here or</p>
                          <p className="text-[13px] text-[#3b82f6]">Browse images</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-5 border-t border-[#e5e7eb] pt-4">
                    <h3 className="text-[15px] font-medium text-[#111827]">Hosted Payment Pages & Portal Preferences</h3>
                    <div className="mt-3 grid grid-cols-2 gap-y-3 text-[13px]">
                      <span className="text-[#64748b]">Include in Widget</span>
                      <span className="text-[#111827]">{String(includeWidget)}</span>
                      <span className="text-[#64748b]">Show in Portal</span>
                      <span className="text-[#111827]">{String(showPortal)}</span>
                    </div>
                  </div>

                  <div className="mt-5">
                    <h3 className="text-[15px] font-medium text-[#111827]">Pricing Details</h3>
                    <div className="mt-3 grid grid-cols-2 gap-y-3 text-[13px]">
                      <span className="text-[#64748b]">Pricing Model</span>
                      <span className="text-[#111827]">{String(selectedPlan?.pricingModel || "Unit")}</span>
                      <span className="text-[#64748b]">Price</span>
                      <span className="text-[#111827]">AMD{Number(selectedPlan?.price || 0).toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="mt-5">
                    <h3 className="text-[15px] font-medium text-[#111827]">Other Details</h3>
                    <div className="mt-3 grid grid-cols-2 gap-y-3 text-[13px]">
                      <span className="text-[#64748b]">Account Name</span>
                      <span className="text-[#111827]">{String(selectedPlan?.planAccount || "Sales")}</span>
                      <span className="text-[#64748b]">Type</span>
                      <span className="text-[#111827]">{String(selectedPlan?.type || "Service")}</span>
                    </div>
                  </div>
                </>
              ) : null}

              {activeTab === "addons" ? (
                <div>
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-[16px] font-medium text-[#111827]">Addons</h3>
                    <button
                      type="button"
                      onClick={() => navigate(`/products/addons/new?product=${encodeURIComponent(String(selectedPlan?.product || ""))}`)}
                      className="inline-flex items-center gap-1 text-sm text-[#2563eb] hover:text-[#1d4ed8]"
                    >
                      <CirclePlus size={13} />
                      New
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-gray-50/50 border-b border-gray-100">
                          <th className="px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Name</th>
                          <th className="px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Addon Code</th>
                          <th className="px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                          <th className="px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Addon Type</th>
                          <th className="px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Pricing Scheme</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50 text-[13px]">
                        {planAddons.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="px-4 py-8 text-center text-[#64748b]">
                              No addons associated with this plan.
                            </td>
                          </tr>
                        ) : (
                          planAddons.map((addon) => {
                            const addonId = String(addon?.id || addon?._id || "");
                            const status = String(addon?.status || "Active");
                            const isActiveStatus = status.toLowerCase() === "active";
                            return (
                              <tr key={addonId || `${addon?.addonCode}-${addon?.addonName}`} className="hover:bg-gray-50/50">
                                <td className="px-4 py-4 text-[#111827]">
                                  {addonId ? (
                                    <button
                                      type="button"
                                      onClick={() => navigate(`/products/addons/${addonId}`)}
                                      className="text-[#111827] hover:text-[#2563eb]"
                                    >
                                      {String(addon?.addonName || "-")}
                                    </button>
                                  ) : (
                                    String(addon?.addonName || "-")
                                  )}
                                </td>
                                <td className="px-4 py-4 text-[#64748b]">{String(addon?.addonCode || "-")}</td>
                                <td className={`px-4 py-4 ${isActiveStatus ? "text-[#16a34a]" : "text-[#8b949e]"}`}>{status}</td>
                                <td className="px-4 py-4 text-[#111827]">{String(addon?.addonType || "-")}</td>
                                <td className="px-4 py-4 text-[#111827]">{String(addon?.pricingModel || "Unit")}</td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-6 flex items-center justify-between border-t border-gray-100 pt-4">
                    <div className="text-[13px] text-[#64748b]">
                      Total Count:{" "}
                      {showAddonCount ? (
                        <span className="text-[#111827]">{planAddons.length}</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setShowAddonCount(true)}
                          className="text-[#3b82f6] hover:underline"
                        >
                          View
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-4 rounded border border-gray-200 px-2 py-1 text-[12px] text-gray-500">
                        <span className="cursor-pointer hover:text-gray-900 border-r border-gray-200 pr-2">{"<"}</span>
                        <span className="text-gray-900 font-medium">{planAddons.length === 0 ? "0 - 0" : `1 - ${planAddons.length}`}</span>
                        <span className="cursor-pointer hover:text-gray-900 border-l border-gray-200 pl-2">{">"}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}

              {activeTab === "price-lists" ? (
                <div>
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-[16px] font-medium text-[#111827]">Price Lists</h3>
                    <button
                      type="button"
                      onClick={() => navigate("/products/price-lists?new=1")}
                      className="inline-flex items-center gap-1 text-sm text-[#2563eb] hover:text-[#1d4ed8]"
                    >
                      <CirclePlus size={13} />
                      New
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-gray-50/50 border-b border-gray-100">
                          <th className="px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Name</th>
                          <th className="px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Currency</th>
                          <th className="px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Description</th>
                          <th className="px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50 text-[13px]">
                        {planPriceLists.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="px-4 py-8 text-center text-[#64748b]">
                              No price lists available for this plan.
                            </td>
                          </tr>
                        ) : (
                          planPriceLists.map((priceList) => {
                            const status = String(priceList?.status || "Active");
                            const isActiveStatus = status.toLowerCase() === "active";
                            const rowKey = String(priceList?.id || priceList?._id || `${priceList?.name || "price-list"}-${priceList?.currency || ""}`);
                            return (
                              <tr key={rowKey} className="hover:bg-gray-50/50">
                                <td className="px-4 py-4 text-[#111827]">{String(priceList?.name || "-")}</td>
                                <td className="px-4 py-4 text-[#64748b]">{String(priceList?.currency || "-")}</td>
                                <td className="px-4 py-4 text-[#64748b]">{String(priceList?.description || "-")}</td>
                                <td className={`px-4 py-4 ${isActiveStatus ? "text-[#16a34a]" : "text-[#8b949e]"}`}>{status}</td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-6 flex items-center justify-between border-t border-gray-100 pt-4">
                    <div className="text-[13px] text-[#64748b]">
                      Total Count:{" "}
                      {showPriceListCount ? (
                        <span className="text-[#111827]">{planPriceLists.length}</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setShowPriceListCount(true)}
                          className="text-[#3b82f6] hover:underline"
                        >
                          View
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-4 rounded border border-gray-200 px-2 py-1 text-[12px] text-gray-500">
                        <ChevronLeft size={12} className="cursor-pointer hover:text-gray-900 border-r border-gray-200 pr-2" />
                        <span className="text-gray-900 font-medium">{planPriceLists.length === 0 ? "0 - 0" : `1 - ${planPriceLists.length}`}</span>
                        <ChevronRight size={12} className="cursor-pointer hover:text-gray-900 border-l border-gray-200 pl-2" />
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}

              {activeTab === "activity" ? (
                <div className="space-y-6">
                  <div className="relative pl-6 before:absolute before:left-0 before:top-2 before:h-full before:w-px before:bg-gray-100">
                    <div className="relative mb-8">
                      <div className="absolute -left-[27.5px] top-1.5 h-3 w-3 rounded-full border-2 border-white bg-blue-500 ring-4 ring-blue-50" />
                      <div className="flex items-center gap-2 text-[14px] font-medium text-[#111827]">
                        Plan Updated
                        <span className="text-[12px] font-normal text-[#64748b]">
                          at {formatDate(selectedPlan?.updatedAt || selectedPlan?.createdAt || "")}
                        </span>
                      </div>
                      <p className="mt-1 text-[13px] text-[#64748b]">
                        Status was changed to {isPlanActive(selectedPlan) ? "Active" : "Inactive"}.
                      </p>
                    </div>

                    <div className="relative">
                      <div className="absolute -left-[27.5px] top-1.5 h-3 w-3 rounded-full border-2 border-white bg-emerald-500 ring-4 ring-emerald-50" />
                      <div className="flex items-center gap-2 text-[14px] font-medium text-[#111827]">
                        Plan Created
                        <span className="text-[12px] font-normal text-[#64748b]">
                          at {formatDate(selectedPlan?.createdAt || "")}
                        </span>
                      </div>
                      <p className="mt-1 text-[13px] text-[#64748b]">
                        Plan {planNameOf(selectedPlan)} was created with code {planCodeOf(selectedPlan)}.
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </main>

      <CommentsDrawer
        isOpen={commentsOpen}
        onClose={() => setCommentsOpen(false)}
        storageKey={`taban_plan_comments_${String(selectedPlan.id || "default")}`}
      />

      <PlansBulkUpdateModal
        isOpen={bulkUpdateOpen}
        entityType="plans"
        onClose={() => setBulkUpdateOpen(false)}
        onUpdate={handleBulkUpdate}
      />
    </div>
  );
}
