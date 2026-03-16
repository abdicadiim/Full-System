import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronDown,
  Plus,
  MoreHorizontal,
  Download,
  Upload,
  RotateCcw,
  Star,
  Search,
  SlidersHorizontal
} from "lucide-react";
import { useOrganizationBranding } from "../../../hooks/useOrganizationBranding";
import CouponsPage from "./CouponsPage";

type ViewType = "Addons" | "Coupons" | "Plans";

export default function CatalogListView({ type = "Addons" }: { type?: ViewType }) {
  const { accentColor } = useOrganizationBranding();
  const navigate = useNavigate();
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isActionOpen, setIsActionOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState("All");

  const handleNew = () => {
    if (type === "Addons") navigate("/products/addons/new");
    else if (type === "Coupons") navigate("/products/coupons/new");
    else navigate("/products/plans/new");
  };

  const filters = type === "Coupons"
    ? ["All", "Active", "Inactive", "Expired"]
    : ["All", "Active", "Inactive", "Recurring", "One Time"];

  if (type === "Coupons") {
    return <CouponsPage />;
  }

  return (
    <div className="flex flex-col h-screen bg-white font-sans overflow-hidden">

      {/* TOP NAVIGATION BAR */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-4">
          <div className="relative">
            <button
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className="flex items-center gap-2 text-[18px] font-semibold text-gray-800 hover:bg-gray-50 px-2 py-1 rounded transition-colors"
            >
              All {type}
              <ChevronDown size={18} className={`text-blue-600 transition-transform ${isFilterOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* FILTER DROPDOWN (Matches image_ab673a.png) */}
            {isFilterOpen && (
              <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-xl z-[100] py-2">
                {filters.map((filter) => (
                  <div
                    key={filter}
                    onClick={() => { setActiveFilter(filter); setIsFilterOpen(false); }}
                    className="flex items-center justify-between px-4 py-2 hover:bg-blue-50 cursor-pointer group"
                  >
                    <span className={`text-[14px] ${activeFilter === filter ? 'text-blue-600 font-medium' : 'text-gray-700'}`}>
                      {filter}
                    </span>
                    <Star size={16} className="text-gray-300 group-hover:text-gray-400" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* NEW BUTTON */}
          <button
            onClick={handleNew}
            className="flex items-center gap-1 text-white px-3 py-1.5 rounded text-[13px] font-medium transition-all shadow-sm hover:opacity-90"
            style={{ backgroundColor: accentColor }}
          >
            <Plus size={16} /> New
          </button>

          {/* ACTION BUTTON (Matches image_ab6a1c.png) */}
          <div className="relative">
            <button
              onClick={() => setIsActionOpen(!isActionOpen)}
              className="p-1.5 border border-gray-300 rounded hover:bg-gray-50 text-gray-600 bg-white"
            >
              <MoreHorizontal size={18} />
            </button>

            {isActionOpen && (
              <div className="absolute top-full right-0 mt-1 w-56 bg-white border border-gray-200 rounded shadow-xl z-[100] overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2.5 bg-blue-600 text-white text-[14px] font-medium cursor-pointer">
                  <div className="flex items-center gap-3">
                    <RotateCcw size={16} className="rotate-90" /> Sort by
                  </div>
                  <ChevronDown size={14} className="-rotate-90" />
                </div>
                <div className="py-1">
                  <button className="w-full flex items-center gap-3 px-4 py-2 text-[13px] text-gray-700 hover:bg-gray-50">
                    <Download size={16} className="text-blue-500" /> Import {type}
                  </button>
                  <button className="w-full flex items-center gap-3 px-4 py-2 text-[13px] text-gray-700 hover:bg-gray-50">
                    <Upload size={16} className="text-blue-500" /> Export {type}
                  </button>
                  <hr className="my-1 border-gray-100" />
                  <button className="w-full flex items-center gap-3 px-4 py-2 text-[13px] text-gray-700 hover:bg-gray-50">
                    <RotateCcw size={16} className="text-blue-500" /> Reset Column Width
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* TABLE HEADER (Matches image_ab71bd.png) */}
      <div className="bg-gray-50 border-b border-gray-200 px-4 py-2 flex items-center text-[11px] font-bold text-gray-500 uppercase tracking-wider">
        <div className="w-10 flex items-center justify-center">
          <SlidersHorizontal size={14} className="text-blue-500 cursor-pointer" />
        </div>
        <div className="w-6">
          <input type="checkbox" className="rounded border-gray-300" />
        </div>
        <div className="flex-1 px-4">Name</div>
        <>
          <div className="w-32">{type === "Addons" ? "Addon Code" : "Plan Code"}</div>
          <div className="w-24">Status</div>
          <div className="w-32">Price</div>
          <div className="w-32 text-right"><Search size={14} className="inline" /></div>
        </>
      </div>

      {/* EMPTY STATE CONTENT (Matches image_aa7dc1.png / image_ab6736.png) */}
      <div className="flex-1 flex flex-col items-center justify-center bg-white px-6 text-center">
        <h2 className="text-[28px] font-medium text-gray-900 mb-4">
          {type === "Addons" ? "Pack extra value into subscriptions" : "Create tailor-made plans for any pricing model"}
        </h2>
        <p className="text-[14px] text-gray-500 max-w-2xl mb-8 leading-relaxed">
          {type === "Addons"
            ? "Addons can be either one-time or recurring, and can be configured for various pricing models."
            : "You can create multiple plans for each of your subscription items. Leverage the extensive pricing models and customizations available to experiment with ease."}
        </p>

        {/* CENTER ACTION BUTTON */}
        <div className="flex items-center gap-0 mb-12 group">
          <button
            onClick={handleNew}
            className="text-white px-5 py-2 rounded-l text-[14px] font-medium transition-all hover:opacity-90"
            style={{ backgroundColor: accentColor }}
          >
            + New {type.slice(0, -1)}
          </button>
          <button className="text-white border-l border-white/20 px-2 py-2 rounded-r transition-all hover:opacity-90" style={{ backgroundColor: accentColor }}>
            <ChevronDown size={18} />
          </button>
        </div>

        {/* HELP LINKS */}
        <div className="space-y-4">
          <button className="flex items-center gap-2 text-[13px] text-blue-600 hover:underline mx-auto">
            <span className="w-5 h-5 rounded-full border border-blue-200 flex items-center justify-center text-[10px]">?</span>
            How to create a Product
          </button>
          <button className="flex items-center gap-2 text-[13px] text-blue-600 hover:underline mx-auto">
            <span className="w-5 h-5 rounded-full border border-blue-200 flex items-center justify-center text-[10px]">?</span>
            Is there any limit to the number of plans, add-ons or coupons that I can create?
          </button>
          <button className="flex items-center gap-2 text-[13px] text-blue-600 hover:underline mx-auto">
            <span className="w-5 h-5 rounded-full border border-blue-200 flex items-center justify-center text-[10px]">?</span>
            What happens when a plan, add-on, or coupon has been made inactive?
          </button>
        </div>
      </div>
    </div>
  );
}
