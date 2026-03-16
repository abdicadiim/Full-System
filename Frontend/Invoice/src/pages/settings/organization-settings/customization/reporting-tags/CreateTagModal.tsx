import React, { useState } from "react";
import { createPortal } from "react-dom";
import { X, Check } from "lucide-react";
import { reportingTagsAPI } from "../../../../../services/api";

export default function CreateTagModal({ onClose, onSave }) {
  const [step, setStep] = useState(1);
  const [tagName, setTagName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedModules, setSelectedModules] = useState({
    sales: false,
    purchases: false,
    journals: false,
    inventoryAdjustments: false,
  });
  const [moduleLevel, setModuleLevel] = useState({
    sales: "transaction",
    purchases: "transaction",
    journals: "transaction",
    inventoryAdjustments: "transaction",
  });
  const [otherModules, setOtherModules] = useState({
    customers: false,
    vendors: false,
    items: false,
    banking: false,
  });
  const [isMandatory, setIsMandatory] = useState(false);

  const handleModuleToggle = (module) => {
    setSelectedModules({ ...selectedModules, [module]: !selectedModules[module] });
  };

  const handleOtherModuleToggle = (module) => {
    setOtherModules({ ...otherModules, [module]: !otherModules[module] });
  };

  const handleLevelChange = (module, level) => {
    setModuleLevel({ ...moduleLevel, [module]: level });
  };

  const handleSave = async () => {
    if (!tagName.trim()) {
      alert("Please enter a reporting tag name");
      return;
    }

    const appliesTo = [];
    Object.keys(selectedModules).forEach((key) => {
      if (selectedModules[key]) {
        appliesTo.push(key);
      }
    });
    Object.keys(otherModules).forEach((key) => {
      if (otherModules[key]) {
        appliesTo.push(key);
      }
    });

    try {
      const response = await reportingTagsAPI.create({
        name: tagName.trim(),
        description: description.trim(),
        appliesTo,
        moduleLevel,
        isMandatory,
        isActive: true,
      });

      if (response.success) {
        onSave(response.data);
      }
    } catch (error) {
      console.error("Error creating tag:", error);
      alert("Failed to create reporting tag");
    }
  };

  return createPortal(
    <div className="fixed inset-0 bg-white z-[10000] overflow-y-auto">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white sticky top-0 z-10">
        <div className="px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-8">
            {/* Step 1 */}
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-[#2563eb] text-white text-xs font-bold">
                1
              </div>
              <span className="text-[13px] font-medium text-gray-900">Create Reporting Tag</span>
            </div>
            {/* Step 2 */}
            <div className="flex items-center gap-3 opacity-40">
              <div className="flex items-center justify-center w-6 h-6 rounded-full border-2 border-gray-300 text-gray-400 text-xs font-bold">
                2
              </div>
              <span className="text-[13px] font-medium text-gray-400">Configure Options</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 rounded transition"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-8 py-8">
        <div className="space-y-8">
          {/* Reporting Tag Name */}
          <div className="grid grid-cols-[200px_1fr] gap-6 items-start">
            <label className="text-[13px] font-medium text-red-600 pt-2">
              Reporting Tag Name<span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              value={tagName}
              onChange={(e) => setTagName(e.target.value)}
              className="w-full max-w-md h-9 px-3 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-[13px]"
              placeholder=""
            />
          </div>

          {/* Description */}
          <div className="grid grid-cols-[200px_1fr] gap-6 items-start">
            <label className="text-[13px] font-medium text-gray-700 pt-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full max-w-md h-20 px-3 py-2 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-[13px] resize-none"
              placeholder=""
            />
          </div>

          {/* Associate This Reporting Tag To */}
          <div className="border-t border-gray-200 pt-8">
            <h3 className="text-[14px] font-semibold text-gray-900 mb-2">
              Associate This Reporting Tag To
            </h3>
            <p className="text-[12px] text-gray-500 mb-6">
              You can select the modules for which you want to associate reporting tags.
            </p>

            <div className="grid grid-cols-2 gap-8">
              {/* Left Column */}
              <div className="space-y-6">
                {/* Sales */}
                <div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedModules.sales}
                      onChange={() => handleModuleToggle("sales")}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-[13px] text-gray-900">Sales</span>
                  </label>
                  {selectedModules.sales && (
                    <div className="ml-6 mt-3 space-y-2">
                      <label className="flex items-start gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="sales-level"
                          checked={moduleLevel.sales === "transaction"}
                          onChange={() => handleLevelChange("sales", "transaction")}
                          className="w-4 h-4 mt-0.5 text-blue-600 border-gray-300 focus:ring-blue-500"
                        />
                        <div>
                          <div className="text-[13px] text-gray-900">At Transaction Level</div>
                          <div className="text-[11px] text-blue-600">
                            The reporting tag is applied to the entire transaction.
                          </div>
                        </div>
                      </label>
                      <label className="flex items-start gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="sales-level"
                          checked={moduleLevel.sales === "lineItem"}
                          onChange={() => handleLevelChange("sales", "lineItem")}
                          className="w-4 h-4 mt-0.5 text-blue-600 border-gray-300 focus:ring-blue-500"
                        />
                        <div>
                          <div className="text-[13px] text-gray-900">At Line Item Level</div>
                          <div className="text-[11px] text-blue-600">
                            The reporting tag is applied to individual line items within a transaction.
                          </div>
                        </div>
                      </label>
                    </div>
                  )}
                </div>

                {/* Purchases */}
                <div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedModules.purchases}
                      onChange={() => handleModuleToggle("purchases")}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-[13px] text-gray-900">Purchases</span>
                  </label>
                  {selectedModules.purchases && (
                    <div className="ml-6 mt-3 space-y-2">
                      <label className="flex items-start gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="purchases-level"
                          checked={moduleLevel.purchases === "transaction"}
                          onChange={() => handleLevelChange("purchases", "transaction")}
                          className="w-4 h-4 mt-0.5 text-blue-600 border-gray-300 focus:ring-blue-500"
                        />
                        <div>
                          <div className="text-[13px] text-gray-900">At Transaction Level</div>
                          <div className="text-[11px] text-blue-600">
                            The reporting tag is applied to the entire transaction.
                          </div>
                        </div>
                      </label>
                      <label className="flex items-start gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="purchases-level"
                          checked={moduleLevel.purchases === "lineItem"}
                          onChange={() => handleLevelChange("purchases", "lineItem")}
                          className="w-4 h-4 mt-0.5 text-blue-600 border-gray-300 focus:ring-blue-500"
                        />
                        <div>
                          <div className="text-[13px] text-gray-900">At Line Item Level</div>
                          <div className="text-[11px] text-blue-600">
                            The reporting tag is applied to individual line items within a transaction.
                          </div>
                        </div>
                      </label>
                    </div>
                  )}
                </div>

                {/* Journals */}
                <div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedModules.journals}
                      onChange={() => handleModuleToggle("journals")}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-[13px] text-gray-900">Journals</span>
                  </label>
                </div>

                {/* Inventory Adjustments */}
                <div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedModules.inventoryAdjustments}
                      onChange={() => handleModuleToggle("inventoryAdjustments")}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-[13px] text-gray-900">Inventory Adjustments</span>
                  </label>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={otherModules.customers}
                    onChange={() => handleOtherModuleToggle("customers")}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-[13px] text-gray-900">Customers</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={otherModules.vendors}
                    onChange={() => handleOtherModuleToggle("vendors")}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-[13px] text-gray-900">Vendors</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={otherModules.items}
                    onChange={() => handleOtherModuleToggle("items")}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-[13px] text-gray-900">Items</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={otherModules.banking}
                    onChange={() => handleOtherModuleToggle("banking")}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-[13px] text-gray-900">Banking</span>
                </label>
              </div>
            </div>
          </div>

          {/* Configurations */}
          <div className="border-t border-gray-200 pt-8">
            <h3 className="text-[14px] font-semibold text-gray-900 mb-4">
              Configurations
            </h3>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={isMandatory}
                onChange={(e) => setIsMandatory(e.target.checked)}
                className="w-4 h-4 mt-0.5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <div>
                <div className="text-[13px] text-gray-900 font-medium">
                  Make this reporting tag as mandatory
                </div>
                <div className="text-[12px] text-gray-500 mt-1">
                  Requires you to provide input for the reporting tag field. However, it will be skipped for auto-created transactions and in certain apps where this field is not present.
                </div>
              </div>
            </label>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-gray-200 bg-white sticky bottom-0 px-8 py-4">
        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            className="px-5 py-2 text-[13px] font-medium text-white bg-[#2563eb] rounded hover:bg-[#1d4ed8] transition-colors"
          >
            Save and Continue
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2 text-[13px] font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}



