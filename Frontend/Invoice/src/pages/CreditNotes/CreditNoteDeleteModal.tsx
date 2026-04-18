import React from "react";
import { X } from "lucide-react";

type CreditNoteDeleteModalProps = {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  confirmTone?: "danger" | "primary";
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  confirmDisabled?: boolean;
};

export default function CreditNoteDeleteModal({
  isOpen,
  title,
  message,
  confirmText = "Delete",
  confirmTone = "danger",
  onClose,
  onConfirm,
  confirmDisabled = false,
}: CreditNoteDeleteModalProps) {
  if (!isOpen) return null;

  const confirmClasses =
    confirmTone === "primary"
      ? "bg-[#156372] hover:bg-[#0f4f59]"
      : "bg-blue-600 hover:bg-blue-700";

  return (
    <div className="fixed inset-0 z-[2100] flex items-start justify-center bg-black/40 pt-16">
      <div className="w-full max-w-md rounded-lg bg-white shadow-2xl border border-slate-200">
        <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-3">
          <div className="h-7 w-7 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center text-[12px] font-bold">
            !
          </div>
          <h3 className="text-[15px] font-semibold text-slate-800 flex-1">{title}</h3>
          <button
            type="button"
            className="h-7 w-7 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            onClick={onClose}
            aria-label="Close"
            disabled={confirmDisabled}
          >
            <X size={14} />
          </button>
        </div>
        <div className="px-5 py-3 text-[13px] text-slate-600">{message}</div>
        <div className="flex items-center justify-start gap-2 border-t border-slate-100 px-5 py-3">
          <button
            type="button"
            className={`px-4 py-1.5 rounded-md text-white text-[12px] ${confirmClasses} disabled:cursor-not-allowed disabled:opacity-60`}
            onClick={onConfirm}
            disabled={confirmDisabled}
          >
            {confirmText}
          </button>
          <button
            type="button"
            className="px-4 py-1.5 rounded-md border border-slate-300 text-[12px] text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            onClick={onClose}
            disabled={confirmDisabled}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
