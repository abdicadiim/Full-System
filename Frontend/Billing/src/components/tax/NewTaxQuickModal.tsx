import React, { useEffect, useState } from "react";
import { taxesAPI } from "../../services/api";

type CreatedTax = {
  id?: string;
  _id?: string;
  name: string;
  rate: number;
  isActive?: boolean;
  type?: string;
};

type NewTaxQuickModalProps = {
  open: boolean;
  onClose: () => void;
  onCreated?: (tax: CreatedTax) => void;
};

const NewTaxQuickModal: React.FC<NewTaxQuickModalProps> = ({ open, onClose, onCreated }) => {
  const [name, setName] = useState("");
  const [rate, setRate] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setName("");
    setRate("");
    setError("");
    setIsSaving(false);
  }, [open]);

  if (!open) return null;

  const handleSave = async () => {
    const trimmedName = name.trim();
    const parsedRate = Number(rate);

    if (!trimmedName) {
      setError("Tax name is required.");
      return;
    }

    if (!Number.isFinite(parsedRate) || parsedRate < 0) {
      setError("Enter a valid tax rate.");
      return;
    }

    setError("");
    setIsSaving(true);

    try {
      const response: any = await taxesAPI.create({
        name: trimmedName,
        rate: parsedRate,
        type: "tax",
        isActive: true,
        status: "Active",
      });

      const created = response?.data || response?.tax || response;
      const normalized: CreatedTax = {
        id: String(created?._id || created?.id || ""),
        _id: String(created?._id || created?.id || ""),
        name: String(created?.name || trimmedName),
        rate: Number(created?.rate ?? parsedRate) || 0,
        isActive: created?.isActive !== false,
        type: "tax",
      };

      onCreated?.(normalized);
      onClose();
    } catch {
      setError("Failed to create tax.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h3 className="text-lg font-semibold text-gray-900">New Tax</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
            aria-label="Close"
          >
            x
          </button>
        </div>

        <div className="space-y-4 px-5 py-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Tax Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. VAT 16%"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#156372]"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Tax Rate (%)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              placeholder="e.g. 16"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#156372]"
            />
          </div>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}
        </div>

        <div className="flex items-center justify-end gap-2 border-t px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="rounded-md bg-[#156372] px-4 py-2 text-sm text-white hover:bg-[#0f4f5b] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSaving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default NewTaxQuickModal;
