import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { GripVertical, X } from "lucide-react";
import { TAX_GROUP_MARKER, createTaxLocal, getTaxByIdLocal, isTaxGroupRecord, readTaxesLocal, updateTaxLocal } from "../storage";

type TaxOption = {
  id: string;
  name: string;
  rate: number;
};

export default function NewTaxGroupPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = Boolean(id);

  const [groupName, setGroupName] = useState("");
  const [taxes, setTaxes] = useState<TaxOption[]>([]);
  const [selectedTaxIds, setSelectedTaxIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = () => {
      try {
        const allTaxes = readTaxesLocal();
        const normalTaxes = allTaxes
          .filter((tax) => !isTaxGroupRecord(tax))
          .map((tax) => ({
            id: tax._id,
            name: tax.name,
            rate: Number(tax.rate) || 0,
          }));

        setTaxes(normalTaxes);

        if (isEditMode && id) {
          const group = getTaxByIdLocal(id);
          if (!group || !isTaxGroupRecord(group)) {
            throw new Error("Selected tax is not a tax group.");
          }

          setGroupName(group.name || "");
          setSelectedTaxIds(
            Array.isArray(group.groupTaxes)
              ? group.groupTaxes.map((taxId: any) => String(taxId))
              : []
          );
        }
      } catch (err: any) {
        setError(err.message || "Failed to load taxes");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [id, isEditMode]);

  const toggleTaxSelection = (taxId: string) => {
    setSelectedTaxIds((prev) =>
      prev.includes(taxId) ? prev.filter((existingId) => existingId !== taxId) : [...prev, taxId]
    );
  };

  const groupRate = selectedTaxIds.reduce((sum, taxId) => {
    const tax = taxes.find((row) => row.id === taxId);
    return sum + (tax?.rate || 0);
  }, 0);

  const handleSave = () => {
    if (!groupName.trim()) {
      setError("Tax Group Name is required.");
      return;
    }
    if (selectedTaxIds.length === 0) {
      setError("Select at least one tax for this group.");
      return;
    }

    try {
      setSaving(true);
      setError(null);
      const payload = {
        name: groupName.trim(),
        rate: Number(groupRate.toFixed(2)),
        type: "both",
        description: TAX_GROUP_MARKER,
        groupTaxes: selectedTaxIds,
      };

      if (isEditMode && id) {
        const updated = updateTaxLocal(id, payload);
        if (!updated) throw new Error("Failed to update tax group");
      } else {
        createTaxLocal(payload);
      }

      navigate("/settings/taxes");
    } catch (saveError: any) {
      alert(saveError.message || (isEditMode ? "Failed to update tax group" : "Failed to create tax group"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[12000] flex items-start justify-center p-8">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-gray-900">{isEditMode ? "Edit Tax Group" : "New Tax Group"}</h2>
          <button
            onClick={() => navigate("/settings/taxes")}
            className="text-red-500 hover:text-red-600"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          <div className="mb-6">
            <label className="block text-base font-medium text-red-500 mb-3">
              Tax Group Name*
            </label>
            <input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="w-full max-w-md h-11 px-3 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#156372]"
            />
          </div>

          <div className="mb-3 flex items-center justify-between">
            <label className="text-base font-medium text-red-500">Associate Taxes*</label>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <GripVertical size={16} />
              <span>Drag taxes to reorder</span>
            </div>
          </div>

          <div className="border border-gray-300 rounded overflow-hidden">
            <div className="max-h-72 overflow-y-auto">
              {loading ? (
                <div className="px-4 py-6 text-sm text-gray-500">Loading taxes...</div>
              ) : taxes.length === 0 ? (
                <div className="px-4 py-6 text-sm text-gray-500">
                  No taxes available. Create taxes first.
                </div>
              ) : (
                taxes.map((tax) => (
                  <div
                    key={tax.id}
                    className="grid grid-cols-[36px_1fr_100px_24px] items-center border-b border-gray-200 last:border-b-0"
                  >
                    <div className="px-3 py-3">
                      <input
                        type="checkbox"
                        checked={selectedTaxIds.includes(tax.id)}
                        onChange={() => toggleTaxSelection(tax.id)}
                        className="h-4 w-4 rounded border-gray-300 text-[#156372]"
                      />
                    </div>
                    <div className="py-3 text-sm text-gray-800">{tax.name}</div>
                    <div className="py-3 pr-3 text-right text-sm text-gray-700">{tax.rate} %</div>
                    <div className="text-gray-300">
                      <GripVertical size={14} />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mt-4 text-sm text-gray-600">
            Group Rate: <span className="font-semibold text-gray-900">{groupRate.toFixed(2)}%</span>
          </div>

          {error && (
            <div className="mt-4 text-sm text-red-600">
              {error}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="px-6 py-2 text-white text-sm bg-[#3b82f6] rounded disabled:bg-gray-300"
          >
            {saving ? "Saving..." : isEditMode ? "Update" : "Save"}
          </button>
          <button
            onClick={() => navigate("/settings/taxes")}
            className="px-6 py-2 text-sm text-gray-700 bg-gray-100 rounded border border-gray-300"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
