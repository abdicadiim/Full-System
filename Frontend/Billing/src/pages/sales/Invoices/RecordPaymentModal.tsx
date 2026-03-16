import React, { useState } from "react";
import { X } from "lucide-react";

type RecordPaymentModalProps = {
  invoice?: any;
  onClose: () => void;
  onRecord: (paymentData: any) => Promise<void> | void;
};

export default function RecordPaymentModal({
  invoice,
  onClose,
  onRecord,
}: RecordPaymentModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    paymentDate: new Date().toISOString().slice(0, 10),
    amount: String(
      Number(invoice?.balanceDue ?? invoice?.balance ?? invoice?.total ?? 0) || 0
    ),
    paymentMode: "Cash",
    reference: "",
    notes: "",
  });

  const updateField =
    (key: keyof typeof form) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      setForm((prev) => ({ ...prev, [key]: event.target.value }));
    };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting) return;

    const amount = Number(form.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return;
    }

    setSubmitting(true);
    try {
      await onRecord({
        invoice: invoice?._id || invoice?.id || undefined,
        paymentDate: form.paymentDate,
        amount,
        paymentMode: form.paymentMode,
        reference: form.reference,
        notes: form.notes,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <h2 className="text-base font-semibold text-gray-900">Record Payment</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-5 py-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="space-y-1">
              <span className="text-xs font-medium text-gray-600">Payment Date</span>
              <input
                type="date"
                value={form.paymentDate}
                onChange={updateField("paymentDate")}
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-[#156372] focus:outline-none"
                required
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs font-medium text-gray-600">Amount</span>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={form.amount}
                onChange={updateField("amount")}
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-[#156372] focus:outline-none"
                required
              />
            </label>
          </div>

          <label className="block space-y-1">
            <span className="text-xs font-medium text-gray-600">Payment Mode</span>
            <select
              value={form.paymentMode}
              onChange={updateField("paymentMode")}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-[#156372] focus:outline-none"
            >
              <option>Cash</option>
              <option>Check</option>
              <option>Credit Card</option>
              <option>Bank Transfer</option>
              <option>Bank Remittance</option>
              <option>Other</option>
            </select>
          </label>

          <label className="block space-y-1">
            <span className="text-xs font-medium text-gray-600">Reference</span>
            <input
              type="text"
              value={form.reference}
              onChange={updateField("reference")}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-[#156372] focus:outline-none"
            />
          </label>

          <label className="block space-y-1">
            <span className="text-xs font-medium text-gray-600">Notes</span>
            <textarea
              value={form.notes}
              onChange={updateField("notes")}
              rows={3}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-[#156372] focus:outline-none"
            />
          </label>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded bg-[#156372] px-4 py-2 text-sm font-medium text-white hover:bg-[#0d4a52] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {submitting ? "Recording..." : "Record Payment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
