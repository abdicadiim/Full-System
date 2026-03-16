import React, { useState } from "react";

type Props = {
  isOpen?: boolean;
  onClose?: () => void;
  onCreated?: (payload: any) => void;
};

export default function NewTaxModal({ isOpen = false, onClose, onCreated }: Props) {
  const [name, setName] = useState("");
  const [rate, setRate] = useState("");

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1300] flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-4 shadow-xl">
        <h3 className="mb-3 text-base font-semibold">New Tax</h3>
        <div className="space-y-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Tax name"
            className="w-full rounded border px-3 py-2 text-sm"
          />
          <input
            value={rate}
            onChange={(e) => setRate(e.target.value)}
            placeholder="Rate %"
            className="w-full rounded border px-3 py-2 text-sm"
          />
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded border px-3 py-2 text-sm">
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              const tax = {
                id: `tax_${Date.now()}`,
                _id: `tax_${Date.now()}`,
                name: name || "New Tax",
                rate: Number(rate || 0),
                active: true,
              };
              onCreated?.({ tax });
            }}
            className="rounded bg-blue-600 px-3 py-2 text-sm text-white"
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );
}
