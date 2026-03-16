import React, { useEffect, useMemo, useState } from "react";
import { Check, ChevronLeft, Loader2, Pencil, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { reportingTagsAPI } from "../../../../../services/api";

type Level = "transaction" | "lineItem";

type Tag = {
  _id: string;
  name: string;
  description?: string;
  color?: string;
  appliesTo: string[];
  moduleLevel?: Record<string, Level>;
  isMandatory?: boolean;
  options?: string[];
  isActive: boolean;
};

const MODULE_LABELS: Record<string, string> = {
  sales: "Sales",
  purchases: "Purchases",
  journals: "Journals",
  inventoryAdjustments: "Inventory Adjustments",
  customers: "Customers",
  vendors: "Vendors",
  items: "Items",
  banking: "Banking",
};

function normalizeModuleLevel(input: any): Record<string, Level> {
  if (!input || typeof input !== "object") return {};
  // Mongoose Map comes back as a plain object in JSON.
  const out: Record<string, Level> = {};
  for (const [k, v] of Object.entries(input)) {
    if (v === "transaction" || v === "lineItem") out[k] = v;
  }
  return out;
}

export default function ReportingTagDetailPage({ tagId }: { tagId: string }) {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [markingReady, setMarkingReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tag, setTag] = useState<Tag | null>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [draftDescription, setDraftDescription] = useState("");
  const [draftAppliesTo, setDraftAppliesTo] = useState<string[]>([]);
  const [draftModuleLevel, setDraftModuleLevel] = useState<Record<string, Level>>({});
  const [draftMandatory, setDraftMandatory] = useState(false);
  const [draftOptions, setDraftOptions] = useState<string[]>([]);

  const appliesToModules = useMemo(() => {
    const list = (tag?.appliesTo || []).slice();
    list.sort((a, b) => (MODULE_LABELS[a] || a).localeCompare(MODULE_LABELS[b] || b));
    return list;
  }, [tag?.appliesTo]);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await reportingTagsAPI.getById(tagId);
      if (!res?.success) {
        throw new Error(res?.message || "Failed to load reporting tag");
      }
      const t: Tag = res.data;
      setTag(t);

      // Reset edit state from the latest server data
      setIsEditing(false);
      setDraftName(String(t.name || ""));
      setDraftDescription(String(t.description || ""));
      setDraftAppliesTo(Array.isArray(t.appliesTo) ? t.appliesTo : []);
      setDraftModuleLevel(normalizeModuleLevel(t.moduleLevel));
      setDraftMandatory(Boolean(t.isMandatory));
      setDraftOptions(Array.isArray(t.options) ? t.options : []);
    } catch (e: any) {
      setError(e?.message || "Failed to load reporting tag");
      setTag(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tagId]);

  const toggleAppliesTo = (key: string) => {
    setDraftAppliesTo((prev) => (prev.includes(key) ? prev.filter((x) => x !== key) : [...prev, key]));
  };

  const updateModuleLevel = (key: string, level: Level) => {
    setDraftModuleLevel((prev) => ({ ...prev, [key]: level }));
  };

  const updateOption = (idx: number, value: string) => {
    setDraftOptions((prev) => prev.map((o, i) => (i === idx ? value : o)));
  };

  const addOption = () => setDraftOptions((prev) => [...prev, ""]);

  const removeOption = (idx: number) => {
    setDraftOptions((prev) => prev.filter((_, i) => i !== idx));
  };

  const onSave = async () => {
    if (saving) return;
    const name = draftName.trim();
    if (!name) {
      toast.error("Please enter reporting tag name");
      return;
    }

    setSaving(true);
    try {
      const payload: any = {
        name,
        description: draftDescription.trim(),
        appliesTo: draftAppliesTo,
        moduleLevel: draftModuleLevel,
        isMandatory: draftMandatory,
        options: draftOptions.map((o) => String(o || "").trim()).filter(Boolean),
      };
      const res = await reportingTagsAPI.update(tagId, payload);
      if (!res?.success) {
        throw new Error(res?.message || "Failed to update reporting tag");
      }
      toast.success("Reporting tag updated");
      await load();
    } catch (e: any) {
      toast.error(e?.message || "Failed to update reporting tag");
    } finally {
      setSaving(false);
    }
  };

  const onMarkReady = async () => {
    if (markingReady) return;
    setMarkingReady(true);
    try {
      const res = await reportingTagsAPI.update(tagId, { isActive: true });
      if (!res?.success) {
        throw new Error(res?.message || "Failed to mark as ready");
      }
      toast.success("Marked as ready");
      await load();
    } catch (e: any) {
      toast.error(e?.message || "Failed to mark as ready");
    } finally {
      setMarkingReady(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white min-h-screen font-sans">
        <div className="px-8 py-5 border-b border-gray-200 flex items-center gap-3">
          <Loader2 className="animate-spin text-gray-400" size={18} />
          <span className="text-[13px] text-gray-600">Loading reporting tag...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white min-h-screen font-sans">
        <div className="px-8 py-5 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/settings/customization/reporting-tags")}
              className="p-1.5 rounded hover:bg-gray-100"
              title="Back"
            >
              <ChevronLeft size={18} className="text-gray-600" />
            </button>
            <h1 className="text-[15px] font-normal text-gray-900">Reporting Tags</h1>
          </div>
          <button
            onClick={() => navigate("/settings/customization/reporting-tags")}
            className="p-1.5 rounded hover:bg-gray-100"
            title="Close"
          >
            <X size={18} className="text-gray-600" />
          </button>
        </div>
        <div className="p-8">
          <div className="text-[13px] text-red-600">{error}</div>
        </div>
      </div>
    );
  }

  if (!tag) return null;

  const statusLabel = tag.isActive ? "Ready" : "Not Ready";
  const statusClasses = tag.isActive
    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
    : "bg-amber-50 text-amber-700 border-amber-200";

  const editingAppliesTo = isEditing ? draftAppliesTo : tag.appliesTo;
  const editingModuleLevel = isEditing ? draftModuleLevel : normalizeModuleLevel(tag.moduleLevel);
  const editingMandatory = isEditing ? draftMandatory : Boolean(tag.isMandatory);
  const editingOptions = isEditing ? draftOptions : (Array.isArray(tag.options) ? tag.options : []);

  return (
    <div className="flex flex-col min-h-screen bg-white font-sans">
      <div className="px-8 py-5 flex items-center justify-between border-b border-gray-200">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/settings/customization/reporting-tags")}
            className="p-1.5 rounded hover:bg-gray-100"
            title="Back"
          >
            <ChevronLeft size={18} className="text-gray-600" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-[15px] font-normal text-gray-900">{tag.name}</h1>
              <span className={`text-[11px] px-2 py-0.5 rounded border ${statusClasses}`}>{statusLabel}</span>
            </div>
            {tag.description ? (
              <div className="text-[12px] text-gray-500 mt-0.5">{tag.description}</div>
            ) : null}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!isEditing && !tag.isActive && (
            <button
              onClick={onMarkReady}
              disabled={markingReady}
              className="px-3 py-2 text-[13px] font-medium text-white bg-[#156372] rounded hover:bg-[#0f4d5a] disabled:opacity-60 flex items-center gap-2"
            >
              {markingReady ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              Mark as Ready
            </button>
          )}

          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="px-3 py-2 text-[13px] font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200 flex items-center gap-2"
            >
              <Pencil size={14} />
              Edit
            </button>
          ) : (
            <>
              <button
                onClick={onSave}
                disabled={saving}
                className="px-3 py-2 text-[13px] font-medium text-white bg-[#156372] rounded hover:bg-[#0f4d5a] disabled:opacity-60 flex items-center gap-2"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                Save
              </button>
              <button
                onClick={() => {
                  // Reset draft to server state without re-fetch
                  setIsEditing(false);
                  setDraftName(String(tag.name || ""));
                  setDraftDescription(String(tag.description || ""));
                  setDraftAppliesTo(Array.isArray(tag.appliesTo) ? tag.appliesTo : []);
                  setDraftModuleLevel(normalizeModuleLevel(tag.moduleLevel));
                  setDraftMandatory(Boolean(tag.isMandatory));
                  setDraftOptions(Array.isArray(tag.options) ? tag.options : []);
                }}
                className="px-3 py-2 text-[13px] font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200"
              >
                Cancel
              </button>
            </>
          )}

          <button
            onClick={() => navigate("/settings/customization/reporting-tags")}
            className="p-2 hover:bg-gray-100 rounded transition"
            title="Close"
          >
            <X size={18} className="text-gray-600" />
          </button>
        </div>
      </div>

      <div className="flex-1 p-8">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
          {/* Options */}
          <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
            <div className="px-5 py-4 border-b border-gray-200">
              <div className="text-[13px] font-medium text-gray-900">Options</div>
            </div>
            <div className="p-5">
              {editingOptions.length === 0 ? (
                <div className="text-[13px] text-gray-400">No options</div>
              ) : (
                <div className="space-y-2">
                  {editingOptions.map((opt, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      {!isEditing ? (
                        <div className="text-[13px] text-gray-800">{opt}</div>
                      ) : (
                        <>
                          <input
                            value={opt}
                            onChange={(e) => updateOption(idx, e.target.value)}
                            className="h-9 flex-1 rounded border border-gray-300 px-3 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#156372]/30 focus:border-[#156372]"
                            placeholder="Enter option"
                          />
                          <button
                            onClick={() => removeOption(idx)}
                            className="px-3 h-9 text-[13px] rounded border border-gray-300 text-gray-700 hover:bg-gray-50"
                          >
                            Remove
                          </button>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {isEditing ? (
                <button
                  onClick={addOption}
                  className="mt-3 text-[13px] text-[#156372] hover:underline"
                >
                  + Add option
                </button>
              ) : null}
            </div>
          </div>

          {/* Configurations */}
          <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
            <div className="px-5 py-4 border-b border-gray-200">
              <div className="text-[12px] font-semibold text-gray-500 tracking-wide">REPORTING TAG CONFIGURATIONS</div>
            </div>
            <div className="p-5 space-y-5">
              <div>
                <div className="text-[13px] font-medium text-gray-900 mb-2">
                  Modules where this tag can be associated at transaction level
                </div>
                <div className="space-y-2">
                  {(Object.keys(MODULE_LABELS) as Array<keyof typeof MODULE_LABELS>).map((key) => {
                    const checked = editingAppliesTo.includes(key);
                    return (
                      <label key={key} className="flex items-center gap-2 text-[13px] text-gray-700">
                        {isEditing ? (
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleAppliesTo(key)}
                            className="w-4 h-4"
                          />
                        ) : (
                          <span className={`w-4 h-4 inline-flex items-center justify-center rounded ${checked ? "text-[#156372]" : "text-gray-300"}`}>
                            <Check size={14} />
                          </span>
                        )}
                        <span>{MODULE_LABELS[key]}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div>
                <div className="text-[13px] font-medium text-gray-900 mb-2">Configurations</div>
                <div className="space-y-3">
                  <label className="flex items-start gap-2 text-[13px] text-gray-700">
                    {isEditing ? (
                      <input
                        type="checkbox"
                        checked={draftMandatory}
                        onChange={(e) => setDraftMandatory(e.target.checked)}
                        className="w-4 h-4 mt-0.5"
                      />
                    ) : (
                      <span className={`w-4 h-4 inline-flex items-center justify-center rounded ${editingMandatory ? "text-[#156372]" : "text-gray-300"}`}>
                        <Check size={14} />
                      </span>
                    )}
                    <div>
                      <div className="text-[13px] font-medium text-gray-900">{editingMandatory ? "Mandatory" : "Optional"}</div>
                      <div className="text-[12px] text-gray-500">
                        {editingMandatory
                          ? "Providing an input for this reporting tag in transactions or records is mandatory."
                          : "Providing an input for this reporting tag in transactions or records is optional."}
                      </div>
                    </div>
                  </label>

                  {/* Module Levels for primary modules */}
                  <div className="pt-2 border-t border-gray-100">
                    <div className="text-[13px] font-medium text-gray-900 mb-2">Level</div>
                    <div className="space-y-3">
                      {(["sales", "purchases", "journals", "inventoryAdjustments"] as const).map((k) => {
                        const show = editingAppliesTo.includes(k);
                        if (!show) return null;
                        const level = editingModuleLevel?.[k] || "transaction";
                        return (
                          <div key={k} className="rounded border border-gray-200 p-3">
                            <div className="text-[13px] font-medium text-gray-900 mb-2">{MODULE_LABELS[k]}</div>
                            {isEditing ? (
                              <div className="space-y-2">
                                <label className="flex items-start gap-2 text-[13px] text-gray-700 cursor-pointer">
                                  <input
                                    type="radio"
                                    name={`${k}-level`}
                                    checked={draftModuleLevel?.[k] === "transaction"}
                                    onChange={() => updateModuleLevel(k, "transaction")}
                                    className="w-4 h-4 mt-0.5"
                                  />
                                  <div>
                                    <div className="text-[13px] text-gray-900">At Transaction Level</div>
                                    <div className="text-[12px] text-gray-500">Applied to the entire transaction.</div>
                                  </div>
                                </label>
                                <label className="flex items-start gap-2 text-[13px] text-gray-700 cursor-pointer">
                                  <input
                                    type="radio"
                                    name={`${k}-level`}
                                    checked={draftModuleLevel?.[k] === "lineItem"}
                                    onChange={() => updateModuleLevel(k, "lineItem")}
                                    className="w-4 h-4 mt-0.5"
                                  />
                                  <div>
                                    <div className="text-[13px] text-gray-900">At Line Item Level</div>
                                    <div className="text-[12px] text-gray-500">Applied to individual line items.</div>
                                  </div>
                                </label>
                              </div>
                            ) : (
                              <div className="text-[13px] text-gray-700">{level === "transaction" ? "At Transaction Level" : "At Line Item Level"}</div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="bg-amber-50 border border-amber-100 rounded p-3 text-[12px] text-amber-800">
                    These configurations cannot be changed once a transaction is created with this reporting tag.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

