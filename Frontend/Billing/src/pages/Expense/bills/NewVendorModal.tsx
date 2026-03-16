import React, { useState } from "react";
import { vendorsAPI } from "../../../services/api";

type VendorRecord = {
  id?: string;
  _id?: string;
  name?: string;
  displayName?: string;
  companyName?: string;
  [key: string]: any;
};

type NewVendorModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onVendorCreated?: (vendor: VendorRecord) => void | Promise<void>;
};

export default function NewVendorModal({ isOpen, onClose, onVendorCreated }: NewVendorModalProps) {
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const handleSave = async () => {
    const trimmedName = displayName.trim();
    if (!trimmedName) return;

    setSaving(true);
    try {
      const payload = {
        displayName: trimmedName,
        companyName: trimmedName,
        name: trimmedName,
        email: email.trim(),
        phone: phone.trim(),
        status: "active",
      };

      const response = await vendorsAPI.create(payload as any);
      const createdVendor =
        response?.data ||
        response ||
        ({
          ...payload,
          id: `ven_${Date.now()}`,
          _id: `ven_${Date.now()}`,
        } as VendorRecord);

      if (onVendorCreated) {
        await onVendorCreated(createdVendor);
      } else {
        onClose();
      }
    } catch (error) {
      console.error("Failed to create vendor:", error);
      alert("Failed to create vendor. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[99999]" onClick={onClose}>
      <div className="w-full max-w-lg bg-white rounded-lg shadow-xl border border-gray-200" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">New Vendor</h2>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Display Name</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#156372] focus:ring-1 focus:ring-[#156372]"
              placeholder="Enter vendor name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#156372] focus:ring-1 focus:ring-[#156372]"
              placeholder="vendor@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#156372] focus:ring-1 focus:ring-[#156372]"
              placeholder="Phone number"
            />
          </div>
        </div>

        <div className="px-5 py-4 border-t border-gray-200 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-2 text-sm rounded-md bg-[#156372] text-white hover:bg-[#0f4f5a] disabled:opacity-60 disabled:cursor-not-allowed"
            disabled={saving || !displayName.trim()}
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
