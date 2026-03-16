import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { reportingTagsAPI } from "../../../../../services/api";

type PrimaryModule = "sales" | "purchases" | "journals" | "inventoryAdjustments";
type Level = "transaction" | "lineItem";

const primaryLabels: Record<PrimaryModule, string> = {
  sales: "Sales",
  purchases: "Purchases",
  journals: "Journals",
  inventoryAdjustments: "Inventory Adjustments",
};

export default function NewReportingTagPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2>(1);
  const [tagName, setTagName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedPrimary, setSelectedPrimary] = useState<Record<PrimaryModule, boolean>>({
    sales: false,
    purchases: false,
    journals: false,
    inventoryAdjustments: false,
  });
  const [activePrimary, setActivePrimary] = useState<PrimaryModule>("sales");
  const [moduleLevel, setModuleLevel] = useState<Record<PrimaryModule, Level>>({
    sales: "transaction",
    purchases: "transaction",
    journals: "transaction",
    inventoryAdjustments: "transaction",
  });
  const [selectedOther, setSelectedOther] = useState({
    customers: false,
    vendors: false,
    items: false,
    banking: false,
  });
  const [mandatory, setMandatory] = useState(false);
  const [options, setOptions] = useState<string[]>([""]);
  const [isSaving, setIsSaving] = useState(false);

  const togglePrimary = (key: PrimaryModule) => {
    setActivePrimary(key);
    setSelectedPrimary((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleOther = (key: keyof typeof selectedOther) => {
    setSelectedOther((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const saveAndContinue = () => {
    if (!tagName.trim()) {
      alert("Please enter reporting tag name");
      return;
    }
    setStep(2);
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
        const id = response?.data?._id;
        navigate(id ? `/settings/customization/reporting-tags/${id}` : "/settings/customization/reporting-tags");
      }
    } catch (error: any) {
      alert(error?.message || "Failed to create reporting tag");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f3f4f8] flex flex-col">
      <div className="bg-white border-b border-[#e4e7ef] px-6 py-5">
        <div className="flex items-center justify-center gap-5">
          <div className="flex items-center gap-3">
            <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs ${step === 1 ? "bg-[#3b82f6] text-white" : "border border-[#d4d8e2] text-[#9aa1af]"}`}>
              1
            </span>
            <span className={`${step === 1 ? "text-[#111827]" : "text-[#9aa1af]"} text-[24px] font-medium`}>Create Reporting Tag</span>
          </div>
          <div className="w-8 border-t border-[#d6dae5]" />
          <div className="flex items-center gap-3">
            <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs ${step === 2 ? "bg-[#3b82f6] text-white" : "border border-[#d4d8e2] text-[#c5cad5]"}`}>
              2
            </span>
            <span className={`${step === 2 ? "text-[#111827]" : "text-[#c5cad5]"} text-[24px] font-medium`}>Configure Options</span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4">
        <div className="bg-[#f7f8fb] border border-[#e3e6ef] rounded-xl p-7">
          {step === 1 ? (
            <>
              <div className="space-y-4 max-w-3xl">
                <div className="grid grid-cols-[210px_1fr] gap-7 items-center">
                  <label className="text-[#ef4444] text-[24px]">Reporting Tag Name*</label>
                  <input
                    value={tagName}
                    onChange={(e) => setTagName(e.target.value)}
                    className="h-10 max-w-[410px] rounded-md border border-[#cdd3df] bg-white px-3 text-[24px] outline-none focus:border-[#4f8df8]"
                  />
                </div>
                <div className="grid grid-cols-[210px_1fr] gap-7 items-start">
                  <label className="text-[#111827] text-[24px] pt-2">Description</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="h-[58px] max-w-[410px] rounded-md border border-[#cdd3df] bg-white px-3 py-2 text-[24px] resize-none outline-none focus:border-[#4f8df8]"
                  />
                </div>
              </div>

              <div className="mt-7 pt-5 border-t border-[#dce0ea]">
                <h2 className="text-[24px] text-[#111827]">Associate This Reporting Tag To</h2>
                <p className="text-[22px] text-[#64748b] mt-1">You can select the modules for which you want to associate reporting tags.</p>

                <div className="mt-4 max-w-[1000px] border border-[#d6dbe7] rounded-xl overflow-hidden grid grid-cols-[250px_1fr] bg-white">
                  <div className="px-5 py-4 border-r border-[#dde2ec] space-y-2">
                    {(Object.keys(primaryLabels) as PrimaryModule[]).map((key) => (
                      <label key={key} className="flex items-center gap-2 cursor-pointer text-[24px]">
                        <input type="checkbox" checked={selectedPrimary[key]} onChange={() => togglePrimary(key)} className="w-4 h-4" />
                        <span>{primaryLabels[key]}</span>
                      </label>
                    ))}
                  </div>
                  <div className={`px-5 py-4 bg-[#fbfcff] space-y-4 ${selectedPrimary[activePrimary] ? "" : "opacity-45 pointer-events-none"}`}>
                    <label className="flex items-start gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="module-level"
                        checked={moduleLevel[activePrimary] === "transaction"}
                        onChange={() => setModuleLevel((prev) => ({ ...prev, [activePrimary]: "transaction" }))}
                        className="mt-1"
                      />
                      <div>
                        <div className="text-[24px] text-[#111827]">At Transaction Level</div>
                        <div className="text-[22px] text-[#64748b]">The reporting tag is applied to the entire transaction.</div>
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
                        <div className="text-[24px] text-[#111827]">At Line Item Level</div>
                        <div className="text-[22px] text-[#64748b]">The reporting tag is applied to individual line items within a transaction.</div>
                      </div>
                    </label>
                  </div>
                </div>

                <div className="mt-5 space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer text-[24px]">
                    <input type="checkbox" checked={selectedOther.customers} onChange={() => toggleOther("customers")} className="w-4 h-4" />
                    <span>Customers</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-[24px]">
                    <input type="checkbox" checked={selectedOther.vendors} onChange={() => toggleOther("vendors")} className="w-4 h-4" />
                    <span>Vendors</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-[24px]">
                    <input type="checkbox" checked={selectedOther.items} onChange={() => toggleOther("items")} className="w-4 h-4" />
                    <span>Items</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-[24px]">
                    <input type="checkbox" checked={selectedOther.banking} onChange={() => toggleOther("banking")} className="w-4 h-4" />
                    <span>Banking</span>
                  </label>
                </div>
              </div>

              <div className="mt-7 pt-5 border-t border-[#dce0ea]">
                <h3 className="text-[24px] text-[#111827]">Configurations</h3>
                <label className="mt-2 flex items-start gap-2 cursor-pointer">
                  <input type="checkbox" checked={mandatory} onChange={(e) => setMandatory(e.target.checked)} className="w-4 h-4 mt-1" />
                  <div>
                    <div className="text-[24px]">Make this reporting tag as mandatory</div>
                    <div className="text-[22px] text-[#64748b]">
                      Requires you to provide input for the reporting tag field. However, it will be skipped for auto-created transactions and in certain apps where this field is not present.
                    </div>
                  </div>
                </label>
              </div>
            </>
          ) : (
            <div className="max-w-3xl">
              <h3 className="text-[24px] text-[#111827]">Configure Options</h3>
              <p className="text-[22px] text-[#64748b] mt-1 mb-4">Add options for the reporting tag: {tagName}</p>
              <div className="space-y-3">
                {options.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      value={item}
                      onChange={(e) => updateOption(idx, e.target.value)}
                      className="h-10 flex-1 rounded-md border border-[#cdd3df] bg-white px-3 text-[22px] outline-none focus:border-[#4f8df8]"
                      placeholder="Enter option"
                    />
                    {options.length > 1 && (
                      <button onClick={() => removeOption(idx)} className="px-3 py-2 border border-[#cfd4df] rounded-md text-[22px] text-[#4b5563]">
                        Remove
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button onClick={addOption} className="mt-3 text-[#2563eb] text-[22px]">
                + Add Option
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white border-t border-[#e4e7ef] px-5 py-3 sticky bottom-0">
        {step === 1 ? (
          <div className="flex items-center gap-2">
            <button onClick={saveAndContinue} className="px-4 py-2 rounded-md bg-[#3b82f6] text-white text-[22px]">
              Save and Continue
            </button>
            <button onClick={() => navigate("/settings/customization/reporting-tags")} className="px-4 py-2 rounded-md bg-[#f3f4f6] border border-[#d1d5db] text-[#4b5563] text-[22px]">
              Cancel
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={saveTag}
              disabled={isSaving}
              className="px-4 py-2 rounded-md bg-[#3b82f6] text-white text-[22px] disabled:opacity-60"
            >
              {isSaving ? "Saving..." : "Save"}
            </button>
            <button onClick={() => setStep(1)} className="px-4 py-2 rounded-md bg-[#f3f4f6] border border-[#d1d5db] text-[#4b5563] text-[22px]">
              Back
            </button>
            <button onClick={() => navigate("/settings/customization/reporting-tags")} className="px-4 py-2 rounded-md bg-[#f3f4f6] border border-[#d1d5db] text-[#4b5563] text-[22px]">
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}


