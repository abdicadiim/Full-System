import React from "react";
import { AlertTriangle, Loader2, X } from "lucide-react";

type CustomerConsolidatedBillingModalProps = {
  bulkConsolidatedAction: null | "enable" | "disable";
  isBulkConsolidatedUpdating: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
};

export default function CustomerConsolidatedBillingModal({
  bulkConsolidatedAction,
  isBulkConsolidatedUpdating,
  onClose,
  onConfirm,
}: CustomerConsolidatedBillingModalProps) {
  if (!bulkConsolidatedAction) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 z-[2000] flex items-start justify-center pt-16 pb-10 overflow-y-auto"
      onClick={(event) => {
        if (event.target === event.currentTarget && !isBulkConsolidatedUpdating) {
          onClose();
        }
      }}
    >
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-6 overflow-hidden">
        <div className="flex items-start justify-between gap-4 p-6 border-b border-gray-200">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-full bg-orange-50 text-orange-600">
              <AlertTriangle size={18} />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {bulkConsolidatedAction === "enable"
                  ? "Enable Consolidated Billing?"
                  : "Disable Consolidated Billing?"}
              </h2>
              <p className="mt-2 text-sm text-gray-700 leading-relaxed max-w-[640px]">
                Invoices will be {bulkConsolidatedAction === "enable" ? "consolidated" : "separated"} for the
                selected customers. Any invoices that were generated already will not be affected.
              </p>
            </div>
          </div>
          <button
            type="button"
            className="p-2 text-gray-500 hover:text-gray-700 cursor-pointer"
            onClick={onClose}
            disabled={isBulkConsolidatedUpdating}
            aria-label="Close"
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6">
          <div className="flex items-center justify-start gap-3">
            <button
              type="button"
              onClick={onConfirm}
              disabled={isBulkConsolidatedUpdating}
              className={`px-5 py-2.5 bg-blue-600 text-white rounded-md text-sm font-medium cursor-pointer transition-colors hover:bg-blue-700 flex items-center gap-2 ${
                isBulkConsolidatedUpdating ? "opacity-70 cursor-not-allowed" : ""
              }`}
            >
              {isBulkConsolidatedUpdating && <Loader2 size={14} className="animate-spin" />}
              {bulkConsolidatedAction === "enable" ? "Enable Now" : "Disable Now"}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={isBulkConsolidatedUpdating}
              className={`px-5 py-2.5 bg-gray-100 text-gray-700 rounded-md text-sm font-medium cursor-pointer transition-colors hover:bg-gray-200 ${
                isBulkConsolidatedUpdating ? "opacity-70 cursor-not-allowed" : ""
              }`}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
