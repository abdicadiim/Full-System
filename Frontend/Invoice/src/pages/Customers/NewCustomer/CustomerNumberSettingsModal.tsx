import React from "react";
import { createPortal } from "react-dom";
import { Loader2, X } from "lucide-react";

type Props = {
  isOpen: boolean;
  prefix: string;
  start: string;
  isSaving: boolean;
  onPrefixChange: (value: string) => void;
  onStartChange: (value: string) => void;
  onSave: () => void;
  onClose: () => void;
};

export default function CustomerNumberSettingsModal({
  isOpen,
  prefix,
  start,
  isSaving,
  onPrefixChange,
  onStartChange,
  onSave,
  onClose,
}: Props) {
  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[1000] flex items-start justify-center overflow-y-auto bg-black/25 px-3 pb-4 pt-10 sm:px-4 sm:pt-12">
      <div className="bg-white rounded-md shadow-xl w-full max-w-[720px] max-h-[90vh] overflow-y-auto">
        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-800">Configure Customer Numbers Preferences</h3>
          <button
            type="button"
            onClick={onClose}
            className="w-6 h-6 flex items-center justify-center rounded-sm text-red-500 hover:bg-red-50"
          >
            <X size={14} />
          </button>
        </div>

        <div className="px-5 py-4">
          <p className="text-sm text-gray-600 max-w-[620px] mb-6 leading-relaxed">
            Customer numbers will be auto-generated based on the preferences below. For each new customer that is
            created, the number after the prefix will be incremented by 1.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-5 max-w-[520px]">
            <div>
              <label className="block text-sm text-gray-700 mb-2">Prefix</label>
              <input
                type="text"
                value={prefix}
                onChange={(e) => onPrefixChange(e.target.value)}
                placeholder="CUS-"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-2">Next Number</label>
              <input
                type="text"
                value={start}
                onChange={(e) => onStartChange(e.target.value)}
                placeholder="00003"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div className="bg-[#fdf4ec] border border-[#f6e4d3] rounded-md p-4 mb-4">
            <p className="text-sm text-gray-700 leading-relaxed">
              Note: If you want to change only this customer's number without affecting the current series, you can
              edit it directly from the Customer Number field after closing this popup.
            </p>
          </div>
        </div>

        <div className="px-5 py-4 border-t border-gray-200 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onSave}
            disabled={isSaving}
            className="px-4 py-2 bg-[#156372] text-white text-sm rounded-md hover:bg-[#0f4f5a] disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
            Save
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 text-gray-700 text-sm border border-gray-300 rounded-md hover:bg-gray-200"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
