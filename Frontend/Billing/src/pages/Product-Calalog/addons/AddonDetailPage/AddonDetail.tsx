import React, { useEffect, useMemo, useRef, useState } from "react";
import { CircleDot, ChevronDown, ChevronLeft, ChevronRight, CirclePlus, Copy, Download, ImageIcon, MessageSquare, MoreHorizontal, Pencil, Plus, RotateCcw, Trash2, Upload, X } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { readAddons, writeAddons } from "../storage";
import type { AddonRecord } from "../types";
import { toast } from "react-toastify";
import { buildCloneName } from "../../utils/cloneName";
import CommentsDrawer from "../../plans/components/CommentsDrawer";

const PLANS_STORAGE_KEY = "inv_plans_v1";
const PRICE_LISTS_STORAGE_KEY = "inv_price_lists_v1";

const FALLBACK_ADDON: AddonRecord = {
  id: "sample-addon-1",
  addonName: "ASC",
  product: "asddc",
  addonCode: "AS",
  description: "ASC",
  status: "Active",
  addonType: "Recurring",
  pricingModel: "Unit",
  price: 12,
  account: "Sales",
  taxName: "",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const formatDate = (value: string) => {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatDateTime = (value: string) => {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

const DetailsRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="grid grid-cols-[170px_1fr] items-start gap-2 py-1.5">
    <span className="text-[14px] text-[#6b7280]">{label}</span>
    <span className="text-[14px] text-[#0f172a]">{value}</span>
  </div>
);

export default function AddonDetailPage() {
  const navigate = useNavigate();
  const { addonId } = useParams<{ addonId: string }>();
  const [addons, setAddons] = useState<AddonRecord[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [priceLists, setPriceLists] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [addonStatusFilter, setAddonStatusFilter] = useState<"All Addons" | "Active Addons" | "Inactive Addons">("All Addons");
  const [isAddonFilterOpen, setIsAddonFilterOpen] = useState(false);
  const [isSidebarMenuOpen, setIsSidebarMenuOpen] = useState(false);
  const [isBulkActionsOpen, setIsBulkActionsOpen] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [showPlanCount, setShowPlanCount] = useState(false);
  const [showPriceListCount, setShowPriceListCount] = useState(false);
  const [activeTab, setActiveTab] = useState<"details" | "plans" | "priceLists" | "activityLogs">("details");
  const actionsRef = useRef<HTMLDivElement>(null);
  const addonFilterRef = useRef<HTMLDivElement>(null);
  const sidebarMenuRef = useRef<HTMLDivElement>(null);
  const bulkActionsRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadAddons = () => setAddons(readAddons());

  const readRows = (storageKey: string): any[] => {
    try {
      const raw = localStorage.getItem(storageKey);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  const loadPlans = () => setPlans(readRows(PLANS_STORAGE_KEY));
  const loadPriceLists = () => setPriceLists(readRows(PRICE_LISTS_STORAGE_KEY));

  useEffect(() => {
    loadAddons();
    loadPlans();
    loadPriceLists();
    const onStorage = () => {
      loadAddons();
      loadPlans();
      loadPriceLists();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const resolvedAddons = useMemo(() => (addons.length > 0 ? addons : [FALLBACK_ADDON]), [addons]);

  const sidebarAddons = useMemo(
    () =>
      resolvedAddons.filter((row) => {
        const status = String(row?.status || "").toLowerCase();
        if (addonStatusFilter === "Active Addons") return status === "active";
        if (addonStatusFilter === "Inactive Addons") return status === "inactive";
        return true;
      }),
    [resolvedAddons, addonStatusFilter]
  );

  const visibleAddonIds = useMemo(
    () => sidebarAddons.map((row) => String(row.id)).filter(Boolean),
    [sidebarAddons]
  );
  const allVisibleSelected = visibleAddonIds.length > 0 && visibleAddonIds.every((id) => selectedIds.includes(id));

  const addon = useMemo(() => {
    const found = resolvedAddons.find((row) => String(row.id) === String(addonId));
    return found || (String(addonId) === FALLBACK_ADDON.id ? FALLBACK_ADDON : resolvedAddons[0] || FALLBACK_ADDON);
  }, [resolvedAddons, addonId]);

  const statusIsActive = String(addon.status || "").toLowerCase() === "active";
  const pricingInterval = String((addon as any)?.billingFrequency || (addon as any)?.pricingInterval || "Monthly");
  const unitName = String((addon as any)?.unit || "SAV");
  const associatedPlans = String((addon as any)?.plan || "All Plans");
  const includeInWidget = String((addon as any)?.includeInWidget ?? false);
  const showInPortal = String((addon as any)?.showInPortal ?? false);
  const type = String((addon as any)?.type || "Service");
  const price = Number((addon as any)?.price || 0).toFixed(2);
  const selectedAddonProduct = String(addon?.product || "").trim().toLowerCase();
  const associatedTypeRaw = String((addon as any)?.associatedPlans || (addon as any)?.plan || "")
    .trim()
    .toLowerCase();
  const addonSelectedPlanNames = useMemo(() => {
    if (Array.isArray((addon as any)?.selectedPlans)) {
      return (addon as any).selectedPlans
        .map((name: any) => String(name || "").trim().toLowerCase())
        .filter(Boolean);
    }
    const fromPlan = String((addon as any)?.plan || "")
      .split(",")
      .map((name) => name.trim().toLowerCase())
      .filter((name) => Boolean(name) && name !== "all plans");
    return fromPlan;
  }, [addon]);
  const planAssociationLabel = associatedTypeRaw === "all plans" ? "All Plans" : "Optional";
  const addonPlans = useMemo(() => {
    const productMatched = plans.filter((row) => {
      const planProduct = String(row?.product || "").trim().toLowerCase();
      if (!selectedAddonProduct || !planProduct) return true;
      return planProduct === selectedAddonProduct;
    });

    if (associatedTypeRaw === "all plans" || addonSelectedPlanNames.length === 0) {
      return productMatched;
    }

    return productMatched.filter((row) => {
      const rowName = String(row?.planName || row?.plan || row?.name || "").trim().toLowerCase();
      return addonSelectedPlanNames.includes(rowName);
    });
  }, [plans, selectedAddonProduct, associatedTypeRaw, addonSelectedPlanNames]);
  const addonPriceLists = useMemo(() => {
    return priceLists.filter((priceList) => {
      const relatedProduct = String(priceList?.product || priceList?.productName || "").trim().toLowerCase();
      if (!relatedProduct || !selectedAddonProduct) return true;
      return relatedProduct === selectedAddonProduct;
    });
  }, [priceLists, selectedAddonProduct]);
  const activityLogs = useMemo(
    () => [
      {
        id: "status-change",
        when: formatDateTime(addon.updatedAt),
        message: `Addon ${addon.addonCode || addon.addonName || "-"} has been marked as ${statusIsActive ? "active" : "inactive"}.`,
      },
      {
        id: "created",
        when: formatDateTime(addon.createdAt),
        message: `Addon ${addon.addonCode || addon.addonName || "-"} Added.`,
      },
    ],
    [addon]
  );

  useEffect(() => {
    setSelectedIds((prev) => prev.filter((id) => resolvedAddons.some((row) => String(row.id) === id)));
  }, [resolvedAddons]);

  useEffect(() => {
    if (selectedIds.length === 0) {
      setIsBulkActionsOpen(false);
    }
  }, [selectedIds.length]);

  useEffect(() => {
    setShowPlanCount(false);
    setShowPriceListCount(false);
  }, [addon.id]);

  useEffect(() => {
    const onClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (actionsRef.current && !actionsRef.current.contains(target)) {
        setActionsOpen(false);
      }
      if (addonFilterRef.current && !addonFilterRef.current.contains(target)) {
        setIsAddonFilterOpen(false);
      }
      if (sidebarMenuRef.current && !sidebarMenuRef.current.contains(target)) {
        setIsSidebarMenuOpen(false);
      }
      if (bulkActionsRef.current && !bulkActionsRef.current.contains(target)) {
        setIsBulkActionsOpen(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const handleClone = () => {
    const rows = readAddons();
    const source = rows.find((row) => String(row.id) === String(addon.id)) || addon;
    const now = new Date().toISOString();
    const cloneId = `addon-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const cloneName = buildCloneName(
      source.addonName || "",
      rows.map((row) => row.addonName),
      "Addon"
    );
    const cloneCode = source.addonCode ? `${source.addonCode}-clone` : `addon-${Date.now().toString(36).slice(-4)}`;

    const clonedAddon: AddonRecord = {
      ...source,
      id: cloneId,
      addonName: cloneName,
      addonCode: cloneCode,
      createdAt: now,
      updatedAt: now,
    };

    const updatedRows = [clonedAddon, ...rows];
    writeAddons(updatedRows);
    setAddons(updatedRows);
    setActionsOpen(false);
    navigate(`/products/addons/${clonedAddon.id}`);
  };

  const handleDelete = () => {
    const rows = readAddons();
    const exists = rows.some((row) => String(row.id) === String(addon.id));
    if (!exists) {
      setActionsOpen(false);
      navigate("/products/addons");
      return;
    }

    const updated = rows.filter((row) => String(row.id) !== String(addon.id));
    writeAddons(updated);
    setAddons(updated);
    setActionsOpen(false);
    navigate("/products/addons");
  };

  const handleEdit = () => {
    navigate(`/products/addons/${addon.id}/edit`);
  };

  const handleToggleStatus = () => {
    const nextStatus: AddonRecord["status"] = statusIsActive ? "Inactive" : "Active";
    const now = new Date().toISOString();
    const rows = readAddons();
    const existingIndex = rows.findIndex((row) => String(row.id) === String(addon.id));

    if (existingIndex === -1) {
      const created = { ...addon, status: nextStatus, updatedAt: now };
      writeAddons([created]);
      setAddons([created]);
      return;
    }

    const updatedRows = rows.map((row) => (String(row.id) === String(addon.id) ? { ...row, status: nextStatus, updatedAt: now } : row));
    writeAddons(updatedRows);
    setAddons(updatedRows);
  };

  const toggleRowSelection = (id: string) => {
    if (!id) return;
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const toggleSelectAllVisible = () => {
    if (visibleAddonIds.length === 0) {
      setSelectedIds([]);
      return;
    }
    setSelectedIds((prev) => {
      if (allVisibleSelected) {
        const visibleSet = new Set(visibleAddonIds);
        return prev.filter((id) => !visibleSet.has(id));
      }
      const next = new Set(prev);
      visibleAddonIds.forEach((id) => next.add(id));
      return Array.from(next);
    });
  };

  const clearSelection = () => {
    setSelectedIds([]);
    setIsBulkActionsOpen(false);
  };

  const handleBulkMarkStatus = (status: "Active" | "Inactive") => {
    if (selectedIds.length === 0) return;
    const selectedSet = new Set(selectedIds);
    const now = new Date().toISOString();
    const rows = readAddons();
    const updatedRows = rows.map((row) =>
      selectedSet.has(String(row.id)) ? { ...row, status, updatedAt: now } : row
    );
    writeAddons(updatedRows);
    setAddons(updatedRows);
    clearSelection();
    toast.success(`Selected addons marked as ${status.toLowerCase()}`);
  };

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Are you sure you want to delete ${selectedIds.length} selected addons?`)) return;
    const selectedSet = new Set(selectedIds);
    const currentAddonId = String(addon.id);
    const deletingCurrentAddon = selectedSet.has(currentAddonId);
    const rows = readAddons();
    const updatedRows = rows.filter((row) => !selectedSet.has(String(row.id)));
    writeAddons(updatedRows);
    setAddons(updatedRows);
    clearSelection();
    toast.success("Selected addons deleted");
    if (updatedRows.length === 0) {
      navigate("/products/addons");
      return;
    }
    if (deletingCurrentAddon) {
      navigate(`/products/addons/${updatedRows[0].id}`);
    }
  };

  const handleExport = () => {
    const rows = readAddons();
    if (!rows.length) return;
    const headers = [
      "Product",
      "Addon Name",
      "Addon Code",
      "Description",
      "Status",
      "Pricing Model",
      "Addon Type",
      "Price",
      "Account",
      "Tax Name",
    ];
    const csvRows = rows.map((row) =>
      [
        row.product || "",
        row.addonName || "",
        row.addonCode || "",
        row.description || "",
        row.status || "",
        row.pricingModel || "",
        row.addonType || "",
        String(row.price ?? ""),
        row.account || "",
        row.taxName || "",
      ]
        .map((value) => `"${String(value).replace(/"/g, '""')}"`)
        .join(",")
    );
    const csv = [headers.join(","), ...csvRows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `addons_export_${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setIsSidebarMenuOpen(false);
    toast.success("Addons exported");
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result;
      if (typeof result === "string") {
        const rows = readAddons();
        const updated = rows.map((r) => String(r.id) === String(addon.id) ? { ...r, imageUrl: result } : r);
        writeAddons(updated);
        setAddons(updated);
      }
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDeleteImage = () => {
    const rows = readAddons();
    const updated = rows.map((r) => String(r.id) === String(addon.id) ? { ...r, imageUrl: "" } : r);
    writeAddons(updated);
    setAddons(updated);
  };

  return (
    <div className="relative flex h-[calc(100vh-100px)] w-full flex-col overflow-hidden rounded-lg border border-gray-100 bg-[#f5f6fb] shadow-sm">
      <div className="flex min-h-0 flex-1">
        <aside className="flex w-[320px] shrink-0 flex-col overflow-hidden border-r border-gray-200 bg-white">
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
            <div className="shrink-0 flex items-center justify-between border-b border-gray-200 px-4 py-4">
              <div className="relative" ref={addonFilterRef}>
                <button
                  type="button"
                  onClick={() => setIsAddonFilterOpen((prev) => !prev)}
                  className="inline-flex items-center gap-1 text-[15px] font-semibold text-[#1f2937]"
                >
                  {addonStatusFilter}
                  <ChevronDown size={13} className="text-[#2563eb]" />
                </button>
                {isAddonFilterOpen ? (
                  <div className="absolute left-0 top-full z-[180] mt-1 w-48 rounded-md border border-gray-200 bg-white py-1 shadow-xl">
                    {(["All Addons", "Active Addons", "Inactive Addons"] as const).map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => {
                          setAddonStatusFilter(option);
                          setIsAddonFilterOpen(false);
                        }}
                        className={`w-full px-4 py-2 text-left text-sm ${addonStatusFilter === option ? "bg-[#eff6ff] text-[#2563eb]" : "text-[#334155] hover:bg-gray-50"
                          }`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigate("/products/addons/new")}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md text-white transition-all hover:brightness-110"
                  style={{ background: 'linear-gradient(90deg, #156372 0%, #0D4A52 100%)' }}
                  title="New"
                >
                  <Plus size={16} />
                </button>
                <div className="relative" ref={sidebarMenuRef}>
                  <button
                    type="button"
                    onClick={() => setIsSidebarMenuOpen((prev) => !prev)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-300 bg-white text-slate-600 hover:bg-slate-50"
                  >
                    <MoreHorizontal size={16} />
                  </button>
                  {isSidebarMenuOpen ? (
                    <div className="absolute right-0 top-full z-[180] mt-1 w-44 rounded-lg border border-[#d7dce8] bg-white py-1 shadow-xl">
                      <button
                        type="button"
                        onClick={() => {
                          setIsSidebarMenuOpen(false);
                          navigate("/products/addons/import");
                        }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-sm text-[#475569] hover:bg-[#f8fafc]"
                      >
                        <Upload size={14} className="text-[#1b5e6a]" />
                        Import Addons
                      </button>
                      <button
                        type="button"
                        onClick={handleExport}
                        className="flex w-full items-center gap-2 px-3 py-2 text-sm text-[#475569] hover:bg-[#f8fafc]"
                      >
                        <Download size={14} className="text-[#1b5e6a]" />
                        Export Addons
                      </button>
                      <div className="my-1 h-px bg-gray-100" />
                      <button
                        type="button"
                        onClick={() => {
                          setIsSidebarMenuOpen(false);
                          loadAddons();
                          toast.success("Page refreshed");
                        }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-sm text-[#475569] hover:bg-[#f8fafc]"
                      >
                        <RotateCcw size={14} className="text-[#1b5e6a]" />
                        Refresh
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          )}

          <div className="min-h-0 flex-1 overflow-hidden">
            {sidebarAddons.map((row) => {
              const active = String(row.id) === String(addon.id);
              const rowPricingInterval = String((row as any)?.billingFrequency || (row as any)?.pricingInterval || "Monthly");
              return (
                <button
                  key={row.id}
                  onClick={() => navigate(`/products/addons/${row.id}`)}
                  className={`w-full border-b border-gray-100 px-4 py-3 text-left ${active ? "bg-[#f8fbff]" : "bg-white hover:bg-slate-50"}`}
                >
                  <div className="grid grid-cols-[20px_1fr_auto] items-start gap-2">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(String(row.id))}
                      onClick={(e) => e.stopPropagation()}
                      onChange={() => toggleRowSelection(String(row.id))}
                      className="mt-1 h-4 w-4 rounded border-gray-300 accent-[#3b82f6]"
                    />
                    <div>
                      <p className="text-[13px] font-medium text-[#0f172a]">{row.addonName || "-"}</p>
                      <p className="text-[14px] text-[#64748b]">{row.addonCode || "-"}</p>
                      <p className="mt-1 text-[12px] font-bold uppercase tracking-wider text-[#1b5e6a]">{row.status || "-"}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[14px] text-[#0f172a]">{row.pricingModel || "-"}</p>
                      <p className="text-[14px] text-[#64748b]">{rowPricingInterval}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        <section className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <div className="shrink-0 flex items-center justify-between border-b border-gray-200 bg-white px-5 py-5">
            <h1 className="text-[34px] font-semibold leading-none text-[#0f172a]">{addon.addonName || "Addon"}</h1>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setCommentsOpen(true)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-gray-300 bg-white text-slate-600 hover:bg-slate-50"
                title="Comments"
              >
                <MessageSquare size={16} />
              </button>
              <span className="h-6 w-px bg-gray-300" />
              <button
                onClick={() => navigate("/products/addons")}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-red-500 hover:bg-red-50"
                title="Close"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          <div className="shrink-0 flex items-center gap-5 border-b border-gray-200 bg-white px-4 py-2 text-[13px] text-slate-700">
            <button onClick={handleEdit} className="inline-flex items-center gap-1.5 hover:text-slate-900">
              <Pencil size={13} /> Edit
            </button>
            <span className="h-4 w-px bg-gray-300" />
            <button onClick={handleToggleStatus} className="inline-flex items-center gap-1.5 hover:text-slate-900">
              <CircleDot size={13} /> {statusIsActive ? "Mark as Inactive" : "Mark as Active"}
            </button>
            <span className="h-4 w-px bg-gray-300" />
            <div className="relative" ref={actionsRef}>
              <button
                onClick={() => setActionsOpen((prev) => !prev)}
                className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-gray-300 bg-white text-slate-600 hover:bg-slate-50"
              >
                <MoreHorizontal size={14} />
              </button>
              {actionsOpen && (
                <div className="absolute left-0 top-full z-[60] mt-2 w-32 rounded-lg border border-gray-200 bg-white p-1.5 shadow-xl">
                  <button
                    onClick={handleClone}
                    className="mb-1 flex w-full items-center gap-2 rounded-lg border border-[#93c5fd] bg-[#3b82f6] px-3 py-2 text-sm font-medium text-white"
                  >
                    <Copy size={14} />
                    Clone
                  </button>
                  <button
                    onClick={handleDelete}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
                  >
                    <Trash2 size={14} className="text-[#3b82f6]" />
                    Delete
                  </button>
                </div>
              )}
            </div>
            <span className="h-4 w-px bg-gray-300" />
          </div>

          <div className="flex-1 overflow-auto p-6">
            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <div className="mb-4 inline-flex rounded-md bg-[#1b5e6a] px-3 py-1 text-[12px] font-bold text-white uppercase tracking-wide">
                {statusIsActive ? "Active" : "Inactive"}
              </div>

              <div className="grid grid-cols-1 gap-5 md:grid-cols-[1.2fr_1fr_1fr_1fr]">
                <div>
                  <p className="text-[32px] font-semibold text-[#0f172a]">{addon.addonName || "-"}</p>
                  <p className="mt-1 text-[14px] text-[#64748b]">
                    Addon Code: <span className="rounded bg-gray-100 px-2 py-0.5 text-[#0f172a]">{addon.addonCode || "-"}</span>
                  </p>
                </div>
                <div className="border-l border-gray-200 pl-4">
                  <p className="text-[14px] text-[#64748b]">Addon Type</p>
                  <p className="text-[16px] font-medium text-[#0f172a]">{addon.addonType || "-"}</p>
                </div>
                <div className="border-l border-gray-200 pl-4">
                  <p className="text-[14px] text-[#64748b]">Pricing Interval</p>
                  <p className="text-[16px] font-medium text-[#0f172a]">{pricingInterval}</p>
                </div>
                <div className="border-l border-gray-200 pl-4">
                  <p className="text-[14px] text-[#64748b]">Pricing Model</p>
                  <p className="text-[16px] font-medium text-[#0f172a]">{addon.pricingModel || "-"}</p>
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-gray-200 bg-white p-5">
              <div className="flex gap-6 border-b border-gray-200 pb-2 text-[15px]">
                <button
                  onClick={() => setActiveTab("details")}
                  className={`pb-2 ${activeTab === "details" ? "border-b-2 border-[#3b82f6] font-medium text-[#0f172a]" : "text-[#475569]"}`}
                >
                  Addon Details
                </button>
                <button
                  onClick={() => setActiveTab("plans")}
                  className={`pb-2 ${activeTab === "plans" ? "border-b-2 border-[#3b82f6] font-medium text-[#0f172a]" : "text-[#475569]"}`}
                >
                  Plans
                </button>
                <button
                  onClick={() => setActiveTab("priceLists")}
                  className={`pb-2 ${activeTab === "priceLists" ? "border-b-2 border-[#3b82f6] font-medium text-[#0f172a]" : "text-[#475569]"}`}
                >
                  Price Lists
                </button>
                <button
                  onClick={() => setActiveTab("activityLogs")}
                  className={`pb-2 ${activeTab === "activityLogs" ? "border-b-2 border-[#3b82f6] font-medium text-[#0f172a]" : "text-[#475569]"}`}
                >
                  Activity Logs
                </button>
              </div>

              {activeTab === "details" && (
                <>
                  <div className="mt-4 grid grid-cols-1 gap-8 lg:grid-cols-[1fr_280px]">
                    <div>
                      <DetailsRow label="Addon Name" value={addon.addonName || "-"} />
                      <DetailsRow label="Addon Code" value={addon.addonCode || "-"} />
                      <DetailsRow label="Addon Type" value={addon.addonType || "-"} />
                      <DetailsRow label="Created On" value={formatDate(addon.createdAt)} />
                      <DetailsRow label="Product Name" value={<span className="text-[#2563eb]">{addon.product || "-"}</span>} />
                      <DetailsRow label="Associated Plans" value={associatedPlans} />
                      <DetailsRow label="Pricing Interval" value={pricingInterval} />
                      <DetailsRow label="Unit name" value={unitName} />
                      <DetailsRow label="Addon Description" value={addon.description || "-"} />
                    </div>

                    <div className="flex items-start justify-center">
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleImageUpload}
                        accept="image/*"
                        className="hidden"
                      />
                      {addon.imageUrl ? (
                        <div className="mt-4 flex h-[140px] w-[240px] flex-col rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden group relative">
                          <div className="flex-1 flex items-center justify-center p-2 bg-white">
                            <img src={addon.imageUrl} alt="Addon" className="max-h-full max-w-full object-contain" />
                          </div>
                          <div className="flex min-h-[40px] items-center justify-between border-t border-gray-100 px-3 bg-white">
                            <button onClick={() => fileInputRef.current?.click()} className="text-[14px] text-[#3b82f6] hover:text-[#2563eb]">
                              Change Image
                            </button>
                            <button onClick={handleDeleteImage} className="text-gray-400 hover:text-red-500">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-4 flex h-[140px] w-[240px] flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 bg-white text-center text-[#64748b]">
                          <ImageIcon size={34} className="mb-2 text-[#94a3b8]" />
                          <p className="text-[14px]">Drag image(s) here or</p>
                          <button onClick={() => fileInputRef.current?.click()} className="text-[14px] text-[#3b82f6] hover:text-[#2563eb]">
                            Browse images
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-6 border-t border-gray-200 pt-6">
                    <h3 className="text-[16px] font-semibold text-[#0f172a]">Hosted Payment Pages & Portal Preferences</h3>
                    <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
                      <DetailsRow label="Include in Widget" value={includeInWidget} />
                      <DetailsRow label="Show in Portal" value={showInPortal} />
                    </div>
                  </div>

                  <div className="mt-6">
                    <h3 className="text-[16px] font-semibold text-[#0f172a]">Pricing Details</h3>
                    <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
                      <DetailsRow label="Pricing Model" value={addon.pricingModel || "-"} />
                      <DetailsRow label="Price" value={`AMD${price}`} />
                    </div>
                  </div>

                  <div className="mt-6">
                    <h3 className="text-[16px] font-semibold text-[#0f172a]">Other Details</h3>
                    <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
                      <DetailsRow label="Account Name" value={addon.account || "Sales"} />
                      <DetailsRow label="Type" value={type} />
                    </div>
                  </div>
                </>
              )}

              {activeTab === "plans" && (
                <div className="mt-4">
                  <div className="mb-4 flex items-center justify-between">
                    <p className="text-[28px] text-[#0f172a]">Plans</p>
                    <button
                      type="button"
                      onClick={() => navigate(`/products/plans/new?product=${encodeURIComponent(String(addon.product || ""))}`)}
                      className="inline-flex items-center gap-1 text-sm text-[#2563eb] hover:text-[#1d4ed8]"
                    >
                      <CirclePlus size={13} />
                      New
                    </button>
                  </div>
                  <div className="overflow-hidden rounded-lg border border-gray-200">
                    <table className="w-full border-collapse text-left">
                      <thead>
                        <tr className="bg-[#f7f8fc]">
                          <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-[#64748b]">Name</th>
                          <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-[#64748b]">Plan Code</th>
                          <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-[#64748b]">Association Type</th>
                          <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-[#64748b]">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {addonPlans.length === 0 ? (
                          <tr className="border-t border-gray-200">
                            <td colSpan={4} className="px-6 py-8 text-center text-[14px] text-[#64748b]">
                              No plans associated with this addon.
                            </td>
                          </tr>
                        ) : (
                          addonPlans.map((row) => {
                            const planId = String(row?.id || row?._id || "");
                            const planName = String(row?.planName || row?.plan || row?.name || "-");
                            const planCode = String(row?.planCode || row?.code || "-");
                            const status = String(row?.status || "Active");
                            const isActiveStatus = status.toLowerCase() === "active";
                            return (
                              <tr key={planId || `${planCode}-${planName}`} className="border-t border-gray-200">
                                <td className="px-6 py-4 text-[16px] text-[#0f172a]">
                                  {planId ? (
                                    <button
                                      type="button"
                                      onClick={() => navigate(`/products/plans/${planId}`)}
                                      className="hover:text-[#2563eb]"
                                    >
                                      {planName}
                                    </button>
                                  ) : (
                                    planName
                                  )}
                                </td>
                                <td className="px-6 py-4 text-[16px] text-[#0f172a]">{planCode}</td>
                                <td className="px-6 py-4 text-[16px] text-[#0f172a]">{planAssociationLabel}</td>
                                <td className={`px-6 py-4 text-[16px] ${isActiveStatus ? "text-[#16a34a]" : "text-[#8b949e]"}`}>{status}</td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-4 flex items-center justify-between border-t border-gray-200 pt-5">
                    <p className="text-[14px] text-[#0f172a]">
                      Total Count:{" "}
                      {showPlanCount ? (
                        <span className="text-[#111827]">{addonPlans.length}</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setShowPlanCount(true)}
                          className="text-[#2563eb] hover:underline"
                        >
                          View
                        </button>
                      )}
                    </p>
                    <div className="flex items-center gap-2 rounded-md border border-gray-300 px-3 py-1.5 text-[14px] text-[#0f172a]">
                      <ChevronLeft size={12} className="text-[#9ca3af]" />
                      <span>{addonPlans.length === 0 ? "0 - 0" : `1 - ${addonPlans.length}`}</span>
                      <ChevronRight size={12} className="text-[#9ca3af]" />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "priceLists" && (
                <div className="mt-4">
                  <div className="mb-4 flex items-center justify-between">
                    <p className="text-[28px] font-medium text-[#0f172a]">Price Lists</p>
                    <button
                      type="button"
                      onClick={() => navigate("/products/price-lists?new=1")}
                      className="inline-flex items-center gap-1 text-sm text-[#2563eb] hover:text-[#1d4ed8]"
                    >
                      <CirclePlus size={13} />
                      New
                    </button>
                  </div>
                  <div className="overflow-hidden rounded-lg border border-gray-200">
                    <table className="w-full border-collapse text-left">
                      <thead>
                        <tr className="bg-[#f7f8fc]">
                          <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-[#64748b]">Name</th>
                          <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-[#64748b]">Currency</th>
                          <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-[#64748b]">Description</th>
                          <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-[#64748b]">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {addonPriceLists.length === 0 ? (
                          <tr className="border-t border-gray-200">
                            <td colSpan={4} className="px-6 py-8 text-center text-[14px] text-[#64748b]">
                              No price lists available for this addon.
                            </td>
                          </tr>
                        ) : (
                          addonPriceLists.map((row) => {
                            const status = String(row?.status || "Active");
                            const isActiveStatus = status.toLowerCase() === "active";
                            const rowKey = String(row?.id || row?._id || `${row?.name || "price-list"}-${row?.currency || ""}`);
                            return (
                              <tr key={rowKey} className="border-t border-gray-200">
                                <td className="px-6 py-4 text-[16px] text-[#0f172a]">{String(row?.name || "-")}</td>
                                <td className="px-6 py-4 text-[16px] text-[#64748b]">{String(row?.currency || "-")}</td>
                                <td className="px-6 py-4 text-[16px] text-[#64748b]">{String(row?.description || "-")}</td>
                                <td className={`px-6 py-4 text-[16px] ${isActiveStatus ? "text-[#16a34a]" : "text-[#8b949e]"}`}>{status}</td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-4 flex items-center justify-between border-t border-gray-200 pt-5">
                    <p className="text-[14px] text-[#0f172a]">
                      Total Count:{" "}
                      {showPriceListCount ? (
                        <span className="text-[#111827]">{addonPriceLists.length}</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setShowPriceListCount(true)}
                          className="text-[#2563eb] hover:underline"
                        >
                          View
                        </button>
                      )}
                    </p>
                    <div className="flex items-center gap-2 rounded-md border border-gray-300 px-3 py-1.5 text-[14px] text-[#0f172a]">
                      <ChevronLeft size={12} className="text-[#9ca3af]" />
                      <span>{addonPriceLists.length === 0 ? "0 - 0" : `1 - ${addonPriceLists.length}`}</span>
                      <ChevronRight size={12} className="text-[#9ca3af]" />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "activityLogs" && (
                <div className="mt-4 overflow-hidden rounded-lg border border-gray-200">
                  {activityLogs.map((log, index) => (
                    <div key={log.id} className={`grid grid-cols-[260px_1fr] items-center gap-6 px-6 py-5 ${index !== activityLogs.length - 1 ? "border-b border-gray-200" : ""}`}>
                      <p className="text-[14px] text-[#64748b]">{log.when}</p>
                      <div className="flex items-center gap-4">
                        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#ef9a57] text-white">¤</span>
                        <p className="text-[15px] text-[#0f172a]">{log.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      </div>

      <CommentsDrawer
        isOpen={commentsOpen}
        onClose={() => setCommentsOpen(false)}
        storageKey={`taban_addon_comments_${String(addon.id || "default")}`}
      />
    </div>
  );
}
