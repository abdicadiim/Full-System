import React, { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { reportingTagsAPI } from "../../../../../services/api";
import Skeleton from "../../../../../components/ui/Skeleton";

type PrimaryModule = "sales" | "purchases";
type Level = "transaction" | "lineItem";

const primaryLabels: Record<PrimaryModule, string> = {
  sales: "Sales",
  purchases: "Purchases",
};

export default function NewReportingTagPage({ tagId, mode }: { tagId?: string; mode?: "edit" }) {
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2>(1);
  const [tagName, setTagName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedPrimary, setSelectedPrimary] = useState<Record<PrimaryModule, boolean>>({
    sales: false,
    purchases: false,
  });
  const [activePrimary, setActivePrimary] = useState<PrimaryModule>("sales");
  const [moduleLevel, setModuleLevel] = useState<Record<PrimaryModule, Level>>({
    sales: "transaction",
    purchases: "transaction",
  });
  const [selectedOther, setSelectedOther] = useState({
    customers: false,
    items: false,
  });
  const [mandatory, setMandatory] = useState(false);
  const [options, setOptions] = useState<string[]>([""]);
  const [isSaving, setIsSaving] = useState(false);
  const isEditMode = mode === "edit" && Boolean(tagId);
  const [loadingEdit, setLoadingEdit] = useState(false);

  const itemsEnabled = useMemo(
    () =>
      (Object.keys(selectedPrimary) as PrimaryModule[]).some(
        (key) => selectedPrimary[key] && moduleLevel[key] === "lineItem"
      ),
    [selectedPrimary, moduleLevel]
  );

  useEffect(() => {
    if (!itemsEnabled && selectedOther.items) {
      setSelectedOther((prev) => ({ ...prev, items: false }));
    }
  }, [itemsEnabled, selectedOther.items]);

  useEffect(() => {
    if (!isEditMode || !tagId) return;
    const load = async () => {
      setLoadingEdit(true);
      try {
        const res = await reportingTagsAPI.getById(tagId);
        if (res?.success && res?.data) {
          const t = res.data;
          setTagName(String(t.name || ""));
          setDescription(String(t.description || ""));
          const appliesTo = Array.isArray(t.appliesTo) ? t.appliesTo : [];
          setSelectedPrimary({
            sales: appliesTo.includes("sales"),
            purchases: appliesTo.includes("purchases"),
          });
          setSelectedOther({
            customers: appliesTo.includes("customers"),
            items: appliesTo.includes("items"),
          });
          const levels = t.moduleLevel || {};
          setModuleLevel({
            sales: levels.sales || "transaction",
            purchases: levels.purchases || "transaction",
          });
          setMandatory(Boolean(t.isMandatory));
          setOptions(Array.isArray(t.options) && t.options.length > 0 ? t.options : [""]);
        }
      } catch {
        // no-op
      } finally {
        setLoadingEdit(false);
      }
    };
    load();
  }, [isEditMode, tagId]);

  const togglePrimary = (key: PrimaryModule) => {
    setActivePrimary(key);
    setSelectedPrimary((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleOther = (key: keyof typeof selectedOther) => {
    if (key === "items" && !itemsEnabled) return;
    setSelectedOther((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const saveAndContinue = () => {
    if (!tagName.trim()) {
      toast.error("Please enter reporting tag name");
      return;
    }
    if (isEditMode) {
      updateTag();
    } else {
      setStep(2);
    }
  };

  const updateOption = (index: number, value: string) => {
    setOptions((prev) => prev.map((item, idx) => (idx === index ? value : item)));
  };

  const addOption = () => setOptions((prev) => [...prev, ""]);
  const removeOption = (index: number) => setOptions((prev) => (prev.length > 1 ? prev.filter((_, idx) => idx !== index) : prev));

  const saveTag = async () => {
    if (isSaving) return;

    const appliesTo: string[] = [];
    (Object.keys(selectedPrimary) as PrimaryModule[]).forEach((key) => {
      if (selectedPrimary[key]) appliesTo.push(key);
    });
    (Object.keys(selectedOther) as Array<keyof typeof selectedOther>).forEach((key) => {
      if (selectedOther[key]) appliesTo.push(key);
    });

    setIsSaving(true);
    try {
      const response = await reportingTagsAPI.create({
        name: tagName.trim(),
        description: description.trim(),
        appliesTo,
        moduleLevel,
        isMandatory: mandatory,
        options: options.map((o) => o.trim()).filter(Boolean),
        // Create as "Not Ready" by default so user can review configuration before activating.
        isActive: false,
      });

      if (response?.success) {
        toast.success("Reporting tag created");
        let id = response?.data?._id || response?.data?.id;
        if (!id) {
          const latest = await reportingTagsAPI.getAll({ page: 1, limit: 1 });
          id = latest?.data?.[0]?._id || latest?.data?.[0]?.id;
        }
        navigate(id ? `/settings/customization/reporting-tags/${id}` : "/settings/customization/reporting-tags");
        return;
      }
      toast.error(response?.message || "Failed to create reporting tag");
    } catch (error: any) {
      toast.error(error?.message || "Failed to create reporting tag");
    } finally {
      setIsSaving(false);
    }
  };

  const updateTag = async () => {
    if (!tagId || isSaving) return;

    const appliesTo: string[] = [];
    (Object.keys(selectedPrimary) as PrimaryModule[]).forEach((key) => {
      if (selectedPrimary[key]) appliesTo.push(key);
    });
    (Object.keys(selectedOther) as Array<keyof typeof selectedOther>).forEach((key) => {
      if (selectedOther[key]) appliesTo.push(key);
    });

    setIsSaving(true);
    try {
      const payload: any = {
        name: tagName.trim(),
        description: description.trim(),
        appliesTo,
        moduleLevel,
        isMandatory: mandatory,
      };
      const res = await reportingTagsAPI.update(tagId, payload);
      if (res?.success) {
        toast.success("Reporting tag updated");
        setStep(2);
        return;
      }
      toast.error(res?.message || "Failed to update reporting tag");
    } catch (error: any) {
      toast.error(error?.message || "Failed to update reporting tag");
    } finally {
      setIsSaving(false);
    }
  };

  const saveOptionsOnly = async () => {
    if (!tagId || isSaving) return;
    setIsSaving(true);
    try {
      const res = await reportingTagsAPI.update(tagId, {
        options: options.map((o) => o.trim()).filter(Boolean),
      });
      if (res?.success) {
        toast.success("Options updated");
        navigate(`/settings/customization/reporting-tags/${tagId}`);
        return;
      }
      toast.error(res?.message || "Failed to update options");
    } catch (error: any) {
      toast.error(error?.message || "Failed to update options");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f3f4f8] flex flex-col">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-center gap-5 text-sm">
          <button
            type="button"
            onClick={() => setStep(1)}
            className="flex items-center gap-2"
          >
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step === 1 ? "bg-blue-600 text-white" : "border border-gray-300 text-gray-400"}`}>
              1
            </span>
            <span className={`${step === 1 ? "text-gray-900" : "text-gray-400"} font-medium`}>
              {isEditMode ? "Edit Reporting Tag" : "Create Reporting Tag"}
            </span>
          </button>
          <div className="w-8 border-t border-gray-300" />
          <button
            type="button"
            onClick={() => setStep(2)}
            className="flex items-center gap-2"
          >
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step === 2 ? "bg-blue-600 text-white" : "border border-gray-300 text-gray-300"}`}>
              2
            </span>
            <span className={`${step === 2 ? "text-gray-900" : "text-gray-300"} font-medium`}>Configure Options</span>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          {loadingEdit ? (
            <div className="space-y-4 max-w-3xl">
              <div className="grid grid-cols-[200px_1fr] gap-6 items-center">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-10 w-full max-w-[380px]" />
              </div>
              <div className="grid grid-cols-[200px_1fr] gap-6 items-start">
                <Skeleton className="h-4 w-28 mt-2" />
                <Skeleton className="h-24 w-full max-w-[520px]" />
              </div>
              <div className="pt-5 border-t border-gray-200">
                <Skeleton className="h-4 w-60 mb-3" />
                <div className="grid grid-cols-2 gap-4">
                  <Skeleton className="h-24 w-full" />
                  <Skeleton className="h-24 w-full" />
                </div>
              </div>
              <Skeleton className="h-10 w-40" />
            </div>
          ) : step === 1 ? (
            <>
              <div className="space-y-4 max-w-3xl">
                <div className="grid grid-cols-[200px_1fr] gap-6 items-center">
                  <label className="text-red-500 text-sm font-medium">Reporting Tag Name*</label>
                  <input
                    value={tagName}
                    onChange={(e) => setTagName(e.target.value)}
                    className="h-10 max-w-[380px] rounded-md border border-gray-300 bg-white px-3 text-sm outline-none focus:border-blue-500"
                  />
                </div>
                <div className="grid grid-cols-[200px_1fr] gap-6 items-start">
                  <label className="text-gray-800 text-sm pt-2">Description</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="h-[60px] max-w-[380px] rounded-md border border-gray-300 bg-white px-3 py-2 text-sm resize-none outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="mt-6 pt-5 border-t border-gray-200">
                <h2 className="text-sm font-semibold text-gray-900">Associate This Reporting Tag To</h2>
                <p className="text-sm text-gray-500 mt-1">You can select the modules for which you want to associate reporting tags.</p>

                <div className="mt-4 max-w-[900px] border border-gray-200 rounded-lg overflow-hidden grid grid-cols-[220px_1fr] bg-white">
                  <div className="px-4 py-4 border-r border-gray-200 space-y-2">
                    {(Object.keys(primaryLabels) as PrimaryModule[]).map((key) => (
                      <label key={key} className="flex items-center gap-2 cursor-pointer text-sm">
                        <input type="checkbox" checked={selectedPrimary[key]} onChange={() => togglePrimary(key)} className="w-4 h-4" />
                        <span>{primaryLabels[key]}</span>
                      </label>
                    ))}
                  </div>
                  <div className={`px-4 py-4 bg-gray-50 space-y-4 ${selectedPrimary[activePrimary] ? "" : "opacity-45 pointer-events-none"}`}>
                    <label className="flex items-start gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="module-level"
                        checked={moduleLevel[activePrimary] === "transaction"}
                        onChange={() => {
                          setModuleLevel((prev) => ({ ...prev, [activePrimary]: "transaction" }));
                          setSelectedOther((prev) => ({ ...prev, items: false }));
                        }}
                        className="mt-1"
                      />
                      <div>
                        <div className="text-sm font-medium text-gray-900">At Transaction Level</div>
                        <div className="text-xs text-gray-500">The reporting tag is applied to the entire transaction.</div>
                      </div>
                    </label>
                    <label className="flex items-start gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="module-level"
                        checked={moduleLevel[activePrimary] === "lineItem"}
                        onChange={() => setModuleLevel((prev) => ({ ...prev, [activePrimary]: "lineItem" }))}
                        className="mt-1"
                      />
                      <div>
                        <div className="text-sm font-medium text-gray-900">At Line Item Level</div>
                        <div className="text-xs text-gray-500">The reporting tag is applied to individual line items within a transaction.</div>
                      </div>
                    </label>
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer text-sm">
                    <input type="checkbox" checked={selectedOther.customers} onChange={() => toggleOther("customers")} className="w-4 h-4" />
                    <span>Customers</span>
                  </label>
                  <label
                    className={`flex items-center gap-2 text-sm ${
                      itemsEnabled ? "cursor-pointer" : "cursor-not-allowed opacity-50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedOther.items}
                      onChange={() => toggleOther("items")}
                      className="w-4 h-4"
                      disabled={!itemsEnabled}
                    />
                    <span>Items</span>
                  </label>
                </div>
              </div>

              <div className="mt-6 pt-5 border-t border-gray-200">
                <h3 className="text-sm font-semibold text-gray-900">Configurations</h3>
                <label className="mt-2 flex items-start gap-2 cursor-pointer text-sm">
                  <input type="checkbox" checked={mandatory} onChange={(e) => setMandatory(e.target.checked)} className="w-4 h-4 mt-1" />
                  <div>
                    <div className="font-medium text-gray-900">Make this reporting tag as mandatory</div>
                    <div className="text-xs text-gray-500">
                      Requires you to provide input for the reporting tag field. However, it will be skipped for auto-created transactions and in certain apps where this field is not present.
                    </div>
                  </div>
                </label>
              </div>
            </>
          ) : (
            <div className="max-w-3xl">
              <h3 className="text-sm font-semibold text-gray-900">Configure Options</h3>
              <p className="text-sm text-gray-500 mt-1 mb-4">Add options for the reporting tag: {tagName}</p>
              <div className="space-y-3">
                {options.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      value={item}
                      onChange={(e) => updateOption(idx, e.target.value)}
                      className="h-10 flex-1 rounded-md border border-gray-300 bg-white px-3 text-sm outline-none focus:border-blue-500"
                      placeholder="Enter option"
                    />
                    {options.length > 1 && (
                      <button onClick={() => removeOption(idx)} className="px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-600">
                        Remove
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button onClick={addOption} className="mt-3 text-blue-600 text-sm">
                + Add Option
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white border-t border-gray-200 px-5 py-3 sticky bottom-0">
        {step === 1 ? (
          <div className="flex items-center gap-2">
            <button onClick={saveAndContinue} className="px-4 py-2 rounded-md bg-blue-600 text-white text-sm" disabled={isSaving || loadingEdit}>
              {isEditMode ? (isSaving ? "Saving..." : "Save and Continue") : "Save and Continue"}
            </button>
            <button onClick={() => navigate("/settings/customization/reporting-tags")} className="px-4 py-2 rounded-md bg-gray-100 border border-gray-300 text-gray-600 text-sm">
              Cancel
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={isEditMode ? saveOptionsOnly : saveTag}
              disabled={isSaving}
              className="px-4 py-2 rounded-md bg-blue-600 text-white text-sm disabled:opacity-60"
            >
              {isSaving ? "Saving..." : "Save"}
            </button>
            <button onClick={() => setStep(1)} className="px-4 py-2 rounded-md bg-gray-100 border border-gray-300 text-gray-600 text-sm">
              Back
            </button>
            <button onClick={() => navigate("/settings/customization/reporting-tags")} className="px-4 py-2 rounded-md bg-gray-100 border border-gray-300 text-gray-600 text-sm">
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}



