import React, { useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

interface PreventDuplicatesModalProps {
  onClose: () => void;
  onSave: (selection: "this_fiscal_year" | "all_fiscal_years") => void;
  currentValue?: string;
}

export default function PreventDuplicatesModal({ 
  onClose, 
  onSave,
  currentValue = "all_fiscal_years" 
}: PreventDuplicatesModalProps) {
  const [selection, setSelection] = useState(currentValue);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    await onSave(selection as any);
    setIsSaving(false);
  };

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-start justify-center p-4 pt-20">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" 
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div className="relative bg-white w-full max-w-[500px] rounded-lg shadow-2xl animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 flex items-center justify-between border-b border-gray-100">
          <h2 className="text-[16px] font-bold text-gray-800">
            Prevent Duplicate Transaction Numbers
          </h2>
          <button 
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-md text-red-500 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-8">
          <p className="text-[13px] text-gray-600 font-medium">
            Prevent duplicate transaction numbers for
          </p>

          <div className="space-y-6">
            {/* Option 1 */}
            <div 
              className="flex items-start gap-3 cursor-pointer group"
              onClick={() => setSelection("this_fiscal_year")}
            >
              <div className="mt-1">
                <div className={`w-[16px] h-[16px] rounded-full border-2 flex items-center justify-center transition-all ${
                  selection === "this_fiscal_year" 
                    ? "border-[#1e5e6e]" 
                    : "border-gray-300 group-hover:border-gray-400"
                }`}>
                  {selection === "this_fiscal_year" && (
                    <div className="w-[8px] h-[8px] rounded-full bg-[#1e5e6e]" />
                  )}
                </div>
              </div>
              <div>
                <span className={`text-[13.5px] font-medium transition-colors ${
                  selection === "this_fiscal_year" ? "text-gray-900" : "text-gray-700"
                }`}>
                  This Fiscal Year
                </span>
                <p className="text-[11.5px] text-gray-500 mt-1 leading-relaxed">
                  You cannot save the transactions with duplicate transaction numbers during this fiscal year.
                </p>
              </div>
            </div>

            {/* Option 2 */}
            <div 
              className="flex items-start gap-3 cursor-pointer group"
              onClick={() => setSelection("all_fiscal_years")}
            >
              <div className="mt-1">
                <div className={`w-[16px] h-[16px] rounded-full border-2 flex items-center justify-center transition-all ${
                  selection === "all_fiscal_years" 
                    ? "border-[#1e5e6e]" 
                    : "border-gray-300 group-hover:border-gray-400"
                }`}>
                  {selection === "all_fiscal_years" && (
                    <div className="w-[8px] h-[8px] rounded-full bg-[#1e5e6e]" />
                  )}
                </div>
              </div>
              <div>
                <span className={`text-[13.5px] font-medium transition-colors ${
                  selection === "all_fiscal_years" ? "text-gray-900" : "text-gray-700"
                }`}>
                  All Fiscal Years
                </span>
                <p className="text-[11.5px] text-gray-500 mt-1 leading-relaxed">
                  You cannot save the transactions with duplicate transaction numbers in the current or any future fiscal year.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50/50 flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-5 h-[32px] bg-[#1e5e6e] text-white text-[12px] font-bold rounded hover:bg-[#164a58] transition-colors shadow-sm disabled:opacity-50 active:scale-95 transition-all"
          >
            {isSaving ? "Saving..." : "Save"}
          </button>
          <button
            onClick={onClose}
            className="px-5 h-[32px] bg-white border border-gray-300 text-[12px] font-medium text-gray-700 rounded hover:bg-gray-50 transition-colors shadow-sm active:scale-95 transition-all"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
