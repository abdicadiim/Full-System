import React from "react";
import { CustomerFormData } from "./NewCustomer.constants";

type Props = {
  formData: CustomerFormData;
  setFormData: React.Dispatch<React.SetStateAction<CustomerFormData>>;
};

export default function CustomFieldsSection({ formData, setFormData }: Props) {
  return (
    <div className="mt-6">
      {Object.keys(formData.customFields || {}).length === 0 ? (
        <div className="min-h-[260px] flex items-center justify-center">
          <p className="max-w-2xl text-center text-[13px] text-gray-500 leading-relaxed">
            Start adding custom fields for your Customers by going to{" "}
            <span className="font-semibold text-gray-600">Settings</span>{" "}
            <span className="text-gray-400">➜</span>{" "}
            <span className="italic">Preferences</span>{" "}
            <span className="text-gray-400">➜</span>{" "}
            <span className="italic">Customers</span>.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {Object.entries(formData.customFields || {}).map(([fieldKey, fieldValue]) => (
            <div key={fieldKey} className="grid grid-cols-[220px_1fr_auto] gap-3 items-center">
              <div className="text-sm text-gray-700 font-medium truncate" title={fieldKey}>
                {fieldKey}
              </div>
              <input
                type="text"
                value={String(fieldValue ?? "")}
                onChange={(e) => {
                  const value = e.target.value;
                  setFormData((prev) => ({
                    ...prev,
                    customFields: {
                      ...(prev.customFields || {}),
                      [fieldKey]: value,
                    },
                  }));
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter value"
              />
              <button
                type="button"
                onClick={() => {
                  setFormData((prev) => {
                    const currentFields = { ...(prev.customFields || {}) } as Record<string, string>;
                    delete currentFields[fieldKey];
                    return { ...prev, customFields: currentFields };
                  });
                }}
                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                aria-label={`Remove ${fieldKey}`}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
