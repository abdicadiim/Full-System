import React, { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUpDown, ChevronDown, Copy, Pencil, Plus, Trash2, MoreHorizontal, Download, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import NewPricingWidgetModal from "./components/NewPricingWidgetModal";
import { createPricingWidget, deletePricingWidget, readPricingWidgets } from "./storage";
import type { PricingWidgetRecord } from "./types";
import { buildCloneName } from "../utils/cloneName";

type SortOrder = "asc" | "desc";

const formatDate = (value: string) => {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};

const getCreatedBy = (row: PricingWidgetRecord) => String(row.createdBy || "").trim() || "-";

export default function PricingWidgetsPage() {
  const navigate = useNavigate();
  const [isNewOpen, setIsNewOpen] = useState(false);
  const [rows, setRows] = useState<PricingWidgetRecord[]>([]);
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [openRowMenuId, setOpenRowMenuId] = useState<string | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const load = () => setRows(readPricingWidgets());
    load();
    window.addEventListener("storage", load);
    return () => window.removeEventListener("storage", load);
  }, []);

  useEffect(() => {
    const onClickOutside = (event: MouseEvent) => {
      const target = event.target;
      if (moreRef.current && target instanceof Node && !moreRef.current.contains(target)) {
        setMoreOpen(false);
      }
      if (!(target instanceof Element) || !target.closest('[data-row-menu-root="true"]')) {
        setOpenRowMenuId(null);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const sortedRows = useMemo(() => {
    const sorted = [...rows].sort((a, b) => {
      const left = new Date(a.updatedAt || "").getTime();
      const right = new Date(b.updatedAt || "").getTime();
      const safeLeft = Number.isFinite(left) ? left : 0;
      const safeRight = Number.isFinite(right) ? right : 0;
      return sortOrder === "asc" ? safeLeft - safeRight : safeRight - safeLeft;
    });
    return sorted;
  }, [rows, sortOrder]);

  const openEditor = (row: PricingWidgetRecord) => {
    setOpenRowMenuId(null);
    navigate(
      `/products/pricing-widgets/new?widgetId=${encodeURIComponent(row.id)}&name=${encodeURIComponent(row.name)}&product=${encodeURIComponent(
        row.product
      )}&template=${encodeURIComponent(row.template || "Modern")}`
    );
  };

  const onCopyCode = async (row: PricingWidgetRecord) => {
    const snippet = `<div id="pricing-widget-${row.id}"></div>\n<script src="https://app.example.com/embed/pricing-widget.js" data-widget-id="${row.id}"></script>`;
    try {
      await navigator.clipboard.writeText(snippet);
      toast.success("Embed code copied");
    } catch {
      toast.error("Unable to copy code");
    }
  };

  const onClone = (row: PricingWidgetRecord) => {
    const cloned = createPricingWidget({
      name: buildCloneName(
        row.name,
        rows.map((currentRow) => currentRow.name),
        "Pricing Widget"
      ),
      product: row.product,
      createdBy: row.createdBy,
      template: row.template,
      status: row.status,
      selectedPlans: row.selectedPlans,
      caption: row.caption,
      buttonLabel: row.buttonLabel,
      buttonColor: row.buttonColor,
    });
    setRows((prev) => [cloned, ...prev]);
    setOpenRowMenuId(null);
    toast.success("Pricing widget cloned");
  };

  const onDelete = (id: string) => {
    if (!window.confirm("Delete this pricing widget?")) return;
    const updated = deletePricingWidget(id);
    setRows(updated);
    setOpenRowMenuId(null);
    toast.success("Pricing widget deleted");
  };

  const refreshList = () => setRows(readPricingWidgets());

  return (
    <div className="flex flex-col min-h-screen w-full bg-white font-sans text-gray-800 antialiased relative overflow-visible">
      <div className="flex items-center justify-between px-6 border-b border-gray-100 bg-white relative overflow-visible mt-1">
        <div className="flex items-center gap-8 pl-4">
          <div className="flex items-center gap-1.5 py-3 border-b-2 border-slate-900 -mb-[px]">
            <h1 className="text-[15px] font-bold text-slate-900 transition-colors">Pricing Widgets</h1>
          </div>
        </div>

        <div className="flex items-center gap-3 mr-4 py-3">
          <button
            type="button"
            onClick={() => setIsNewOpen(true)}
            className="cursor-pointer transition-all text-white px-3 sm:px-4 py-1.5 rounded-lg border-[#0D4A52] border-b-[4px] hover:brightness-110 hover:-translate-y-[1px] hover:border-b-[6px] active:border-b-[2px] active:brightness-90 active:translate-y-[2px] text-sm font-semibold shadow-sm flex items-center gap-1"
            style={{ background: "linear-gradient(90deg, #156372 0%, #0D4A52 100%)" }}
          >
            <Plus size={16} /> <span>New</span>
          </button>

          <div className="relative" ref={moreRef}>
            <button
              type="button"
              onClick={() => setMoreOpen((prev) => !prev)}
              className="p-1.5 border border-gray-200 rounded hover:bg-gray-50 transition-colors bg-white shadow-sm"
              aria-label="More"
            >
              <MoreHorizontal size={18} className="text-gray-500" />
            </button>

            {moreOpen && (
              <div className="absolute top-full right-0 mt-2 w-60 bg-white border border-gray-100 rounded-lg shadow-xl z-[110] py-2 animate-in fade-in slide-in-from-top-1 duration-200">
                <button
                  type="button"
                  onClick={() => {
                    setMoreOpen(false);
                    navigate("/products/pricing-widgets/import");
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-600 hover:bg-[#1b5e6a] hover:text-white transition-colors group"
                >
                  <Download size={16} className="text-teal-600 group-hover:text-white" />
                  <span className="font-medium">Import Pricing Widgets</span>
                </button>

                <div className="h-px bg-gray-50 my-1 mx-2" />

                <button
                  type="button"
                  onClick={() => {
                    refreshList();
                    setMoreOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-600 hover:bg-[#1b5e6a] hover:text-white transition-colors group"
                >
                  <RefreshCw size={16} className="text-teal-600 group-hover:text-white" />
                  <span className="font-medium">Refresh List</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-x-auto bg-white min-h-0">
        <table className="w-full border-collapse text-left min-w-[1200px]">
          <thead className="bg-[#f6f7fb] sticky top-0 z-10 border-b border-[#e6e9f2]">
            <tr className="text-[10px] font-semibold text-[#7b8494] uppercase tracking-wider">
              <th className="px-4 py-3 bg-[#f6f7fb]">Name</th>
              <th className="px-4 py-3 bg-[#f6f7fb]">Product</th>
              <th className="px-4 py-3 bg-[#f6f7fb]">Created By</th>
              <th className="px-4 py-3 bg-[#f6f7fb]">
                <button
                  type="button"
                  onClick={() => setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"))}
                  className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-[#7b8494]"
                >
                  Last Modified Date
                  <ArrowUpDown size={12} className="text-[#2563eb]" />
                </button>
              </th>
              <th className="w-[260px] px-4 py-3 sticky right-0 bg-[#f6f7fb] z-20" />
            </tr>
          </thead>
          <tbody className="bg-white">
            {sortedRows.map((row) => (
              <tr
                key={row.id}
                className="text-[13px] group transition-all hover:bg-[#f8fafc] cursor-pointer h-[50px] border-b border-[#eef1f6]"
              >
                <td className="px-4 py-3">
                  <button type="button" onClick={() => openEditor(row)} className="text-[#2563eb] hover:underline">
                    {row.name || "-"}
                  </button>
                </td>
                <td className="px-4 py-3 text-gray-700">{row.product || "-"}</td>
                <td className="px-4 py-3 text-gray-700">{getCreatedBy(row)}</td>
                <td className="px-4 py-3 text-gray-700">{formatDate(row.updatedAt)}</td>
                <td className="px-4 py-3 text-right sticky right-0 bg-white/95 backdrop-blur-sm group-hover:bg-[#f8fafc] transition-colors">
                  <div
                    data-row-menu-root="true"
                    className={`relative inline-flex items-center gap-4 transition-opacity ${
                      openRowMenuId === row.id ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => onCopyCode(row)}
                      className="inline-flex items-center gap-1 text-[14px] text-[#2563eb] hover:underline"
                    >
                      Copy Code
                      <Copy size={14} />
                    </button>

                    <button
                      type="button"
                      onClick={() => setOpenRowMenuId((prev) => (prev === row.id ? null : row.id))}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#23b26d] text-white"
                    >
                      <ChevronDown size={14} />
                    </button>

                    {openRowMenuId === row.id ? (
                      <div className="absolute right-0 top-9 z-20 w-[132px] overflow-hidden rounded-lg border border-[#d8deea] bg-white py-1 shadow-lg">
                        <button
                          type="button"
                          onClick={() => openEditor(row)}
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-[14px] text-[#2563eb] hover:bg-[#3b82f6] hover:text-white"
                        >
                          <Pencil size={14} />
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => onClone(row)}
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-[14px] text-[#1e293b] hover:bg-[#f1f5f9]"
                        >
                          <Copy size={14} />
                          Clone
                        </button>
                        <button
                          type="button"
                          onClick={() => onDelete(row.id)}
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-[14px] text-[#2563eb] hover:bg-[#f1f5f9]"
                        >
                          <Trash2 size={14} />
                          Delete
                        </button>
                      </div>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <NewPricingWidgetModal open={isNewOpen} onClose={() => setIsNewOpen(false)} />
    </div>
  );
}
