import React from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

export default function ShowMailContentModal({ emailType, template, signature = "", onClose }) {
  const subject = template?.subject || (
    emailType === "Customer Statement"
      ? "Account Statement from %StartDate% to %EndDate%"
      : emailType || "Customer Notification"
  );
  const baseContent = template?.emailBody || template?.body || (
    emailType === "Customer Statement"
      ? `Dear Customer,

Please find your account statement attached.

Account Statement from %StartDate% to %EndDate%

Regards`
      : `Dear Customer,

Welcome Customer

Regards`
  );
  const normalizedSignature = String(signature || "").trim();
  const content = normalizedSignature && !String(baseContent || "").includes(normalizedSignature)
    ? `${baseContent}\n\n${normalizedSignature}`
    : baseContent;

  return createPortal(
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000]"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-3xl mx-4 max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
          <h3 className="text-lg font-semibold text-gray-900">Mail Content</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded transition"
          >
            <X size={20} className="text-red-500" />
          </button>
        </div>

        <div className="p-6">
          <div className="space-y-4">
            <div>
              <div className="text-sm font-semibold text-gray-700 mb-2">Subject:</div>
              <div className="text-sm text-gray-900">{subject}</div>
            </div>
            <div>
              <div className="text-sm font-semibold text-gray-700 mb-2">Content:</div>
              <div className="text-sm text-gray-900 whitespace-pre-wrap border border-gray-200 rounded-lg p-4 bg-gray-50">
                {content}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

