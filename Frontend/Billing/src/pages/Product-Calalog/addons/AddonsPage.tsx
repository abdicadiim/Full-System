import React, { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, MoreHorizontal, Plus, Search, SlidersHorizontal, ArrowDownUp, Download, Upload, RotateCcw, ChevronRight, Star, X, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import PlansCustomizeColumnsModal, { ColumnConfig } from "../plans/components/PlansCustomizeColumnsModal";
import { readAddons, writeAddons } from "./storage";
import type { AddonRecord } from "./types";

const ADDONS_COLUMNS_STORAGE_KEY = "taban_addons_columns_v1";
const MIN_ADDON_COLUMN_WIDTH = 110;
const MAX_ADDON_COLUMN_WIDTH = 560;

const clampAddonColumnWidth = (width: unknown, fallback = 160) => {
  const numeric = Number(width);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(MAX_ADDON_COLUMN_WIDTH, Math.max(MIN_ADDON_COLUMN_WIDTH, Math.round(numeric)));
};

const DEFAULT_ADDON_COLUMNS: ColumnConfig[] = [
  { key: "name", label: "Name", visible: true, locked: true, width: 220 },
  { key: "product", label: "Product", visible: true, width: 170 },
  { key: "addonCode", label: "Addon Code", visible: true, locked: true, width: 170 },
  { key: "description", label: "Description", visible: true, width: 230 },
  { key: "status", label: "Status", visible: true, width: 130 },
  { key: "addonType", label: "Addon Type", visible: true, width: 170 },
  { key: "pricingModel", label: "Pricing Model", visible: true, width: 170 },
  { key: "billingFrequency", label: "Billing Frequency", visible: false, width: 170 },
  { key: "plan", label: "Plan", visible: false, width: 140 },
  { key: "price", label: "Price", visible: false, width: 130 },
  { key: "creationDate", label: "Creation Date", visible: false, width: 170 },
  { key: "unit", label: "Unit", visible: false, width: 130 },
];

const FALLBACK_ADDON: AddonRecord = {
  id: "sample-addon-1",
  addonName: "ASC",
  product: "asddc",
  addonCode: "AS",
  description: "ASC",
  status: "Active",
  addonType: "Recurring",
  pricingModel: "Unit",
  price: 0,
  account: "Sales",
  taxName: "",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const BULK_ACCOUNT_OPTIONS = [
  "Advance Tax",
  "Employee Advance",
  "Goods In Transit",
  "Prepaid Expenses",
  "Furniture and Equipment",
  "Employee Reimbursements",
  "Opening Balance Adjustments",
  "Sales",
];

const loadAddonColumns = () => {
  try {
    const raw = localStorage.getItem(ADDONS_COLUMNS_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) {
      return DEFAULT_ADDON_COLUMNS.map((col) => ({
        ...col,
        width: clampAddonColumnWidth(col.width, 160),
        visible: col.locked ? true : col.visible,
      }));
    }

    return DEFAULT_ADDON_COLUMNS.map((defaultCol) => {
      const found = parsed.find((col: any) => col?.key === defaultCol.key);
      if (!found) {
        return {
          ...defaultCol,
          width: clampAddonColumnWidth(defaultCol.width, 160),
          visible: defaultCol.locked ? true : defaultCol.visible,
        };
      }
      return {
        ...defaultCol,
        ...found,
        width: clampAddonColumnWidth(found.width, clampAddonColumnWidth(defaultCol.width, 160)),
        locked: defaultCol.locked,
        visible: defaultCol.locked ? true : (typeof found.visible === "boolean" ? found.visible : defaultCol.visible),
      };
    });
  } catch {
    return DEFAULT_ADDON_COLUMNS.map((col) => ({
      ...col,
      width: clampAddonColumnWidth(col.width, 160),
      visible: col.locked ? true : col.visible,
    }));
  }
};

export default function AddonsPage() {
  const navigate = useNavigate();
  const [addons, setAddons] = useState<AddonRecord[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [columns, setColumns] = useState<ColumnConfig[]>(() => loadAddonColumns());
  const [allAddonsOpen, setAllAddonsOpen] = useState(false);
  const [moreOptionsOpen, setMoreOptionsOpen] = useState(false);
  const [sortSubMenuOpen, setSortSubMenuOpen] = useState(false);

  const [bulkUpdateOpen, setBulkUpdateOpen] = useState(false);
  const [bulkUpdateField, setBulkUpdateField] = useState("");
  const [bulkTextValue, setBulkTextValue] = useState("");
  const [bulkBooleanValue, setBulkBooleanValue] = useState<"check" | "uncheck">("check");
  const [bulkAccountValue, setBulkAccountValue] = useState("");
  const [bulkAccountSearch, setBulkAccountSearch] = useState("");
  const [bulkAccountOpen, setBulkAccountOpen] = useState(false);

  const allAddonsRef = useRef<HTMLDivElement>(null);
  const moreRef = useRef<HTMLDivElement>(null);
  const bulkAccountRef = useRef<HTMLDivElement>(null);
  const resizingRef = useRef<{ key: string; startX: number; startWidth: number } | null>(null);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (allAddonsRef.current && !allAddonsRef.current.contains(e.target as Node)) {
        setAllAddonsOpen(false);
      }
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setMoreOptionsOpen(false);
        setSortSubMenuOpen(false);
      }
      if (bulkAccountRef.current && !bulkAccountRef.current.contains(e.target as Node)) {
        setBulkAccountOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  useEffect(() => {
    const load = () => setAddons(readAddons());
    load();
    window.addEventListener("storage", load);
    return () => window.removeEventListener("storage", load);
  }, []);

  useEffect(() => {
    localStorage.setItem(ADDONS_COLUMNS_STORAGE_KEY, JSON.stringify(columns));
  }, [columns]);

  const rows = useMemo(() => (addons.length > 0 ? addons : [FALLBACK_ADDON]), [addons]);
  const visibleColumns = useMemo(() => columns.filter((col) => col.visible), [columns]);
  const tableWidth = useMemo(() => {
    const dynamicColumnsWidth = visibleColumns.reduce(
      (sum, col) => sum + clampAddonColumnWidth(col.width, 160),
      0
    );
    return dynamicColumnsWidth + 160;
  }, [visibleColumns]);
  const filteredBulkAccounts = useMemo(
    () =>
      BULK_ACCOUNT_OPTIONS.filter((account) =>
        account.toLowerCase().includes(bulkAccountSearch.toLowerCase())
      ),
    [bulkAccountSearch]
  );
  const allSelected = rows.length > 0 && selectedIds.length === rows.length;

  const setColumnWidth = (columnKey: string, width: number) => {
    const safeWidth = clampAddonColumnWidth(width, 160);
    setColumns((prev) => prev.map((col) => (col.key === columnKey ? { ...col, width: safeWidth } : col)));
  };

  const resetColumnWidths = () => {
    const defaultWidthMap = new Map(
      DEFAULT_ADDON_COLUMNS.map((col) => [col.key, clampAddonColumnWidth(col.width, 160)])
    );

    setColumns((prev) =>
      prev.map((col) => ({
        ...col,
        width: defaultWidthMap.get(col.key) ?? clampAddonColumnWidth(col.width, 160),
      }))
    );

    setMoreOptionsOpen(false);
    setSortSubMenuOpen(false);
    toast.success("Column widths reset");
  };

  const startResizing = (columnKey: string, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    const col = columns.find((item) => item.key === columnKey);
    if (!col) return;

    resizingRef.current = {
      key: columnKey,
      startX: event.clientX,
      startWidth: clampAddonColumnWidth(col.width, 160),
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
  }, []);

  useEffect(() => {
    setBulkTextValue("");
    setBulkBooleanValue("check");
    setBulkAccountValue("");
    setBulkAccountSearch("");
    setBulkAccountOpen(false);
  }, [bulkUpdateField]);

  const toggleAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(rows.map((row) => row.id));
      return;
    }
    setSelectedIds([]);
  };

  const handleExport = () => {
    if (addons.length === 0) return;
    const headers = [
      "Product", "Addon Name", "Addon Code", "Description", "Status",
      "Pricing Model", "Addon Type", "Price", "Account", "Tax Name"
    ];
    const csvContent = addons.map((row) => {
      return [
        row.product || "",
        row.addonName || "",
        row.addonCode || "",
        row.description || "",
        row.status || "",
        row.pricingModel || "",
        row.addonType || "",
        row.price || 0,
        row.account || "",
        row.taxName || ""
      ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(",");
    });

    const csv = [headers.join(","), ...csvContent].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `addons_export_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setMoreOptionsOpen(false);
  };

  const handleMarkStatus = (status: "Active" | "Inactive") => {
    if (selectedIds.length === 0) return;
    const current = readAddons();
    const updated = current.map(a => selectedIds.includes(a.id) ? { ...a, status } : a);
    writeAddons(updated);
    setAddons(updated);
    setSelectedIds([]);
    toast.success(`Marked ${selectedIds.length} addons as ${status}`);
  };

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    const current = readAddons();
    const updated = current.filter(a => !selectedIds.includes(a.id));
    writeAddons(updated);
    setAddons(updated);
    setSelectedIds([]);
    toast.success(`Deleted ${selectedIds.length} addons`);
  };

  const handleApplyBulkUpdate = () => {
    if (!bulkUpdateField) {
      toast.error("Please select a field to update");
      return;
    }
    if (selectedIds.length === 0) return;
    if (bulkUpdateField === "account" && !bulkAccountValue) {
      toast.error("Please select a sales account.");
      return;
    }

    const boolValue = bulkBooleanValue === "check";
    const now = new Date().toISOString();

    const current = readAddons();
    const updated = current.map((a) => {
      if (selectedIds.includes(a.id)) {
        if (bulkUpdateField === "description") return { ...a, description: bulkTextValue, updatedAt: now };
        if (bulkUpdateField === "account") return { ...a, account: bulkAccountValue, updatedAt: now };
        if (bulkUpdateField === "showInWidget") return { ...(a as any), showInWidget: boolValue, includeInWidget: boolValue, updatedAt: now };
        if (bulkUpdateField === "showInPortal") return { ...(a as any), showInPortal: boolValue, updatedAt: now };
      }
      return a;
    });

    writeAddons(updated);
    setAddons(updated);
    setBulkUpdateOpen(false);
    setBulkUpdateField("");
    setBulkTextValue("");
    setBulkBooleanValue("check");
    setBulkAccountValue("");
    setBulkAccountSearch("");
    setBulkAccountOpen(false);
    setSelectedIds([]);
    toast.success(`Updated ${selectedIds.length} addons successfully.`);
  };

  const renderCell = (row: AddonRecord, key: string) => {
    const data = row as any;

    if (key === "name") return row.addonName || "-";
    if (key === "status") {
      const status = String(row?.status || "active").toLowerCase();
      const statusColor = status === "active" ? "#1b5e6a" : "#64748b";
      return <span style={{ color: statusColor }}>{row.status || "-"}</span>;
    }
    if (key === "price") return `AMD${Number(row.price || 0).toFixed(2)}`;
    if (key === "creationDate") return row.createdAt || "-";

    return data?.[key] || "-";
  };

  return (
    <div className="flex w-full min-h-[calc(100vh-100px)] flex-col overflow-hidden rounded-lg border border-gray-100 bg-white shadow-sm">
      {selectedIds.length > 0 ? (
        <div className="flex items-center justify-between px-6 py-6 border-b border-gray-100 bg-white relative overflow-visible z-[100]">
          <div className="flex min-w-0 flex-1 items-center gap-3 pl-4 pr-2 overflow-visible">
            <div className="flex min-w-0 flex-wrap items-center gap-2 sm:gap-3">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={(e) => toggleAll(e.target.checked)}
              style={{ accentColor: "#1b5e6a" }}
              className="h-4 w-4 rounded border-gray-300 transition-all focus:ring-0"
            />
            <button onClick={() => setBulkUpdateOpen(true)} className="h-9 px-3 rounded-md border border-gray-200 bg-white text-sm text-gray-700 hover:bg-gray-50 transition-colors shadow-sm">Bulk Update</button>
            <button onClick={() => handleMarkStatus("Active")} className="h-9 px-3 rounded-md border border-gray-200 bg-white text-sm text-gray-700 hover:bg-gray-50 transition-colors shadow-sm">Mark as Active</button>
            <button onClick={() => handleMarkStatus("Inactive")} className="h-9 px-3 rounded-md border border-gray-200 bg-white text-sm text-gray-700 hover:bg-gray-50 transition-colors shadow-sm">Mark as Inactive</button>
            <button onClick={handleBulkDelete} className="h-9 px-3 rounded-md border border-gray-200 bg-white text-sm text-gray-700 hover:bg-gray-50 transition-colors shadow-sm">Delete</button>

            <div className="h-6 w-px bg-gray-200 mx-1" aria-hidden />

            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="flex items-center justify-center min-w-[28px] h-7 px-2 bg-[#156372] rounded-full text-[13px] font-semibold text-white">
                {selectedIds.length}
              </span>
              <span className="text-sm text-gray-700">Selected</span>
            </div>
          </div>
          </div>
          <button
            onClick={() => {
              setSelectedIds([]);
            }}
            className="flex items-center gap-1.5 text-[13px] text-gray-500 hover:text-gray-700"
          >
            Esc <X size={16} className="text-red-500" />
          </button>
        </div>
      ) : (
        <div className="flex-none flex items-center justify-between px-6 py-6 border-b border-gray-100 bg-white relative overflow-visible z-30">
          <div className="flex items-center gap-6 pl-4">
            <div className="relative" ref={allAddonsRef}>
              <button
                onClick={() => setAllAddonsOpen((prev) => !prev)}
                className="inline-flex items-center gap-1.5 border-b-2 border-slate-900 py-4 text-[15px] font-bold text-slate-900 -mb-[1px]"
              >
                All Addons
                <ChevronDown size={14} className="text-[#1b5e6a]" />
              </button>
              {allAddonsOpen && (
                <div className="absolute left-0 top-full z-[130] mt-1 w-48 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                  <button
                    onClick={() => setAllAddonsOpen(false)}
                    className="flex w-full items-center justify-between px-4 py-2 text-left text-[14px] text-slate-700 hover:bg-slate-50"
                  >
                    <span>All</span>
                    <Star size={14} className="text-slate-300 hover:text-yellow-400" />
                  </button>
                  <button
                    onClick={() => setAllAddonsOpen(false)}
                    className="flex w-full items-center justify-between px-4 py-2 text-left text-[14px] text-slate-700 hover:bg-slate-50"
                  >
                    Active
                    <Star size={14} className="text-slate-300 hover:text-yellow-400" />
                  </button>
                  <button
                    onClick={() => setAllAddonsOpen(false)}
                    className="flex w-full items-center justify-between px-4 py-2 text-left text-[14px] text-slate-700 hover:bg-slate-50"
                  >
                    Inactive
                    <Star size={14} className="text-slate-300 hover:text-yellow-400" />
                  </button>
                  <button
                    onClick={() => setAllAddonsOpen(false)}
                    className="flex w-full items-center justify-between px-4 py-2 text-left text-[14px] text-slate-700 hover:bg-slate-50"
                  >
                    Recurring
                    <Star size={14} className="text-slate-300 hover:text-yellow-400" />
                  </button>
                  <button
                    onClick={() => setAllAddonsOpen(false)}
                    className="flex w-full items-center justify-between px-4 py-2 text-left text-[14px] text-slate-700 hover:bg-slate-50"
                  >
                    One Time
                    <Star size={14} className="text-slate-300 hover:text-yellow-400" />
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 sm:gap-2 mr-4">
            <button
              onClick={() => navigate("/products/addons/new")}
              className="h-[38px] min-w-[100px] cursor-pointer transition-all text-white px-5 rounded-lg border-[#0D4A52] border-b-[4px] hover:brightness-110 hover:-translate-y-[1px] hover:border-b-[6px] active:border-b-[2px] active:translate-y-[1px] text-sm font-semibold shadow-sm flex items-center justify-center gap-2"
              style={{ background: "linear-gradient(180deg, #156372 0%, #0D4A52 100%)" }}
            >
              <Plus size={16} />
              <span className="hidden sm:inline">New</span>
            </button>

            <div className="relative" ref={moreRef}>
              <button
                onClick={() => setMoreOptionsOpen((prev) => !prev)}
                className="h-[38px] flex items-center justify-center p-2 bg-white border border-gray-300 border-b-[4px] rounded-lg hover:bg-gray-50 transition-all hover:-translate-y-[1px] hover:border-b-[6px] active:border-b-[2px] active:translate-y-[1px] shadow-sm"
              >
                <MoreHorizontal size={18} className="text-gray-500" />
              </button>
              {moreOptionsOpen && (
                <div className="absolute top-full right-0 mt-2 w-60 bg-white border border-gray-100 rounded-lg shadow-xl z-[110] py-2 animate-in fade-in slide-in-from-top-1 duration-200">
                  <div className="relative">
                    <button
                      onClick={() => setSortSubMenuOpen((prev) => !prev)}
                      className={`w-full flex items-center justify-between px-3 py-2 text-sm transition-colors ${sortSubMenuOpen ? 'text-white rounded-md mx-2 w-[calc(100%-16px)] shadow-sm' : 'text-slate-600 hover:bg-[#1b5e6a] hover:text-white'}`}
                      style={sortSubMenuOpen ? { backgroundColor: '#1b5e6a' } : {}}
                    >
                      <span className="flex items-center gap-3">
                        <ArrowDownUp size={16} className={sortSubMenuOpen ? "text-white" : ""} style={!sortSubMenuOpen ? { color: "#1b5e6a" } : {}} />
                        Sort by
                      </span>
                      <ChevronRight size={14} className={sortSubMenuOpen ? "text-white" : "text-slate-400"} />
                    </button>
                    {sortSubMenuOpen && (
                      <div className="md:absolute md:top-0 md:right-full md:mr-2 md:w-52 relative w-full bg-white md:border border-gray-100 rounded-lg md:shadow-xl py-2 z-[115] md:animate-in md:fade-in md:slide-in-from-right-1 duration-200">
                        {["Addon Name", "Product Name", "Creation Date"].map((option) => (
                          <button
                            key={option}
                            className="w-full text-left px-4 py-2 text-sm text-slate-600 hover:bg-teal-50/50 transition-colors"
                            onClick={() => setSortSubMenuOpen(false)}
                          >
                            {option}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="h-px bg-gray-50 my-1 mx-2" />
                  <button
                    onClick={() => navigate("/products/addons/import")}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-600 hover:bg-[#1b5e6a] hover:text-white transition-colors group"
                  >
                    <Upload size={16} className="text-teal-600 group-hover:text-white" />
                    Import Addons
                  </button>
                  <button
                    onClick={handleExport}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-600 hover:bg-[#1b5e6a] hover:text-white transition-colors group"
                  >
                    <Download size={16} className="text-teal-600 group-hover:text-white" />
                    Export Addons
                  </button>
                  <div className="h-px bg-gray-50 my-1 mx-2" />
                  <button
                    onClick={resetColumnWidths}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-600 hover:bg-[#1b5e6a] hover:text-white transition-colors group"
                  >
                    <RotateCcw size={16} className="text-teal-600 group-hover:text-white" />
                    Reset Column Width
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-x-auto bg-white min-h-0">
        <table
          className="w-full table-fixed border-collapse text-left"
          style={{ minWidth: tableWidth }}
        >
          <thead className="bg-[#f6f7fb] sticky top-0 z-10 border-b border-[#e6e9f2]">
            <tr className="text-[10px] font-semibold text-[#7b8494] uppercase tracking-wider">
              <th className="w-12 px-4 py-3 bg-[#f6f7fb]">
                <div className="flex items-center justify-center">
                  <button
                    onClick={() => setCustomizeOpen(true)}
                    className="text-[#3b82f6] hover:text-[#2563eb]"
                    title="Customize Columns"
                  >
                    <SlidersHorizontal size={15} />
                  </button>
                </div>
              </th>
              <th className="w-10 px-2 py-3 bg-[#f6f7fb]">
                <div className="flex items-center gap-2">
                  <div className="h-5 w-px bg-gray-300" />
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={(e) => toggleAll(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </div>
              </th>
              {visibleColumns.map((col) => (
                <th
                  key={col.key}
                  className="group relative px-4 py-3 font-semibold text-[#7b8494]"
                  style={{
                    width: clampAddonColumnWidth(col.width, 160),
                    minWidth: clampAddonColumnWidth(col.width, 160),
                    maxWidth: clampAddonColumnWidth(col.width, 160),
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
              <th className="sticky right-0 w-10 bg-[#f6f7fb] px-4 py-3 z-20">
                <Search size={14} className="text-gray-300 cursor-pointer transition-colors hover:opacity-80" />
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100">
            {rows.map((row) => (
              <tr
                key={row.id}
                onClick={() => navigate(`/products/addons/${row.id}`)}
                className="cursor-pointer hover:bg-slate-50/50"
              >
                <td className="px-4 py-3" />
                <td className="px-2 py-3">
                  <div className="flex items-center gap-2">
                    <div className="h-5 w-px bg-transparent" />
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(row.id)}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => {
                        setSelectedIds((prev) =>
                          e.target.checked ? [...prev, row.id] : prev.filter((id) => id !== row.id)
                        );
                      }}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </div>
                </td>
                {visibleColumns.map((col) => (
                  <td
                    key={col.key}
                    className={`px-4 py-3 text-[13px] ${col.key === "name" ? "font-medium text-[#1b5e6a]" : "text-slate-600"}`}
                    style={{
                      width: clampAddonColumnWidth(col.width, 160),
                      minWidth: clampAddonColumnWidth(col.width, 160),
                      maxWidth: clampAddonColumnWidth(col.width, 160),
                    }}
                  >
                    {renderCell(row, col.key)}
                  </td>
                ))}
                <td className="sticky right-0 bg-white/95 px-4 py-3 backdrop-blur-sm shadow-[-4px_0_4px_-2px_rgba(0,0,0,0.05)]" />
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <PlansCustomizeColumnsModal
        isOpen={customizeOpen}
        title="Customize Columns"
        columns={columns}
        onClose={() => setCustomizeOpen(false)}
        onSave={(updated) => {
          setColumns(updated);
          setCustomizeOpen(false);
        }}
      />

      {bulkUpdateOpen && (
        <div className="fixed inset-0 bg-black/60 z-[10000] flex items-start justify-center pt-4 px-6 pb-6 overflow-y-auto">
          <div className="w-full max-w-[600px] rounded-lg bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <h2 className="text-xl font-medium text-[#111827]">Bulk Update Addons</h2>
              <button onClick={() => setBulkUpdateOpen(false)} className="text-red-500 hover:text-red-600 transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-6">
              <p className="mb-4 text-sm text-gray-700">Choose a field from the dropdown and update with new information.</p>

              <div className="flex items-start gap-4">
                <div className="w-[240px]">
                  <div className="relative">
                    <select
                      value={bulkUpdateField}
                      onChange={(e) => setBulkUpdateField(e.target.value)}
                      className="w-full appearance-none rounded-md border border-gray-300 bg-white px-4 py-2 pr-8 text-sm text-gray-700 outline-none focus:border-[#1b5e6a] transition-colors"
                    >
                      <option value="" disabled>Select a field</option>
                      <option value="description">Addon Description</option>
                      <option value="account">Sales Account</option>
                      <option value="showInWidget">Show in Widget</option>
                      <option value="showInPortal">Show in Portal</option>
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-[50%] -translate-y-[50%] text-[#1b5e6a]" />
                  </div>
                </div>

                <div className="flex-1">
                  {bulkUpdateField === "description" && (
                    <textarea
                      value={bulkTextValue}
                      onChange={(e) => setBulkTextValue(e.target.value)}
                      className="h-[84px] w-full resize-none rounded-md border border-gray-300 px-4 py-2 text-sm outline-none focus:border-[#1b5e6a] transition-colors"
                    />
                  )}

                  {bulkUpdateField === "account" && (
                    <div className="relative" ref={bulkAccountRef}>
                      <button
                        type="button"
                        onClick={() => setBulkAccountOpen((prev) => !prev)}
                        className="flex w-full items-center justify-between rounded-md border border-gray-300 bg-white px-4 py-2 text-left text-sm text-gray-700 outline-none focus:border-[#1b5e6a] transition-colors"
                      >
                        <span>{bulkAccountValue || "Select account"}</span>
                        <ChevronDown size={14} className={`text-[#1b5e6a] transition-transform ${bulkAccountOpen ? "rotate-180" : ""}`} />
                      </button>

                      {bulkAccountOpen && (
                        <div className="absolute left-0 top-full z-[220] mt-2 w-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xl">
                          <div className="border-b border-gray-100 p-2">
                            <div className="relative">
                              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                              <input
                                type="text"
                                value={bulkAccountSearch}
                                onChange={(e) => setBulkAccountSearch(e.target.value)}
                                placeholder="Search"
                                className="w-full rounded-md border border-gray-300 py-2 pl-8 pr-3 text-sm outline-none focus:border-[#1b5e6a] transition-colors"
                              />
                            </div>
                          </div>
                          <div className="max-h-[250px] overflow-auto py-1">
                            {filteredBulkAccounts.length === 0 ? (
                              <p className="px-4 py-2 text-sm text-slate-500">No accounts found.</p>
                            ) : (
                              filteredBulkAccounts.map((account) => (
                                <button
                                  key={account}
                                  type="button"
                                  onClick={() => {
                                    setBulkAccountValue(account);
                                    setBulkAccountOpen(false);
                                  }}
                                  className={`w-full px-4 py-2 text-left text-sm transition-colors hover:bg-slate-50 ${bulkAccountValue === account ? "font-medium text-slate-900" : "text-slate-700"}`}
                                >
                                  <span className="flex items-center justify-between gap-3">
                                    <span>{account}</span>
                                    {bulkAccountValue === account ? <Check size={14} style={{ color: "#1b5e6a" }} /> : null}
                                  </span>
                                </button>
                              ))
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {(bulkUpdateField === "showInWidget" || bulkUpdateField === "showInPortal") && (
                    <div className="pt-1">
                      <label className="mb-2 flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                        <input
                          type="radio"
                          name="bulk-boolean-option"
                          checked={bulkBooleanValue === "check"}
                          onChange={() => setBulkBooleanValue("check")}
                          className="h-4 w-4"
                          style={{ accentColor: "#1b5e6a" }}
                        />
                        <span className="text-sm text-slate-700">Check this option</span>
                      </label>
                      <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                        <input
                          type="radio"
                          name="bulk-boolean-option"
                          checked={bulkBooleanValue === "uncheck"}
                          onChange={() => setBulkBooleanValue("uncheck")}
                          className="h-4 w-4"
                          style={{ accentColor: "#1b5e6a" }}
                        />
                        <span className="text-sm text-slate-700">Uncheck this option</span>
                      </label>
                    </div>
                  )}

                  {!bulkUpdateField && (
                    <input
                      type="text"
                      disabled
                      placeholder="Select a field"
                      className="w-full rounded-md border border-gray-200 bg-gray-50 px-4 py-2 text-sm text-gray-400 outline-none"
                    />
                  )}
                </div>
              </div>

              <p className="mt-6 text-sm text-gray-500">
                <strong className="font-semibold text-gray-700">Note:</strong> All the selected addons will be updated with the new information and you cannot undo this action.
              </p>
            </div>

            <div className="flex items-center gap-3 px-6 pb-6 pt-2">
              <button
                onClick={handleApplyBulkUpdate}
                className="rounded-md bg-[#1b5e6a] px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#0f4e5a] transition-colors"
              >
                Update
              </button>
              <button
                onClick={() => setBulkUpdateOpen(false)}
                className="rounded-md border border-gray-200 bg-white px-5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
