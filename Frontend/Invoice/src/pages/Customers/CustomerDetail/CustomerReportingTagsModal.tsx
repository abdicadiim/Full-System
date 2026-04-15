import React from "react";
import { X } from "lucide-react";
import SearchableDropdown from "../../../components/ui/SearchableDropdown";

type CustomerReportingTagsModalProps = {
  isOpen: boolean;
  availableReportingTags: any[];
  associateTagsValues: Record<string, string>;
  setAssociateTagsValues: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  isSavingAssociateTags: boolean;
  onClose: () => void;
  onSave: () => void | Promise<void>;
};

export default function CustomerReportingTagsModal({
  isOpen,
  availableReportingTags,
  associateTagsValues,
  setAssociateTagsValues,
  isSavingAssociateTags,
  onClose,
  onSave,
}: CustomerReportingTagsModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 z-[2000] flex items-start justify-center pt-10 pb-10 overflow-y-auto"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full mx-6 overflow-visible">
        <div className="sticky top-0 bg-white z-10 flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Associate Tags</h2>
          <button
            type="button"
            className="flex items-center justify-center w-10 h-10 bg-white border-2 border-blue-600 rounded text-gray-800 cursor-pointer hover:bg-gray-50 transition-colors"
            onClick={onClose}
            aria-label="Close"
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6">
          {availableReportingTags.length === 0 ? (
            <div className="text-sm text-gray-600">Loading tags...</div>
          ) : (
            <div className="space-y-4">
              {availableReportingTags.map((tag) => {
                const tagId = String(tag?._id || tag?.id || "").trim();
                if (!tagId) return null;
                const isRequired = Boolean(tag?.isRequired || tag?.required);
                const selectedValue = String(associateTagsValues?.[tagId] || "");
                const normalizedOptions = Array.isArray(tag?.options) ? tag.options : [];
                const options = [
                  { value: "", label: "None" },
                  ...normalizedOptions.map((option: string) => ({ value: option, label: option })),
                ];

                return (
                  <div key={tagId} className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-3 items-start">
                    <label className={`text-sm font-medium ${isRequired ? "text-red-600" : "text-gray-700"} pt-2`}>
                      {tag?.name || "Tag"}
                      {isRequired ? " *" : ""}
                    </label>
                    <div className="max-w-md">
                      <SearchableDropdown
                        value={selectedValue}
                        options={options}
                        placeholder="None"
                        accentColor="#2563eb"
                        showClear={true}
                        onClear={() => {
                          setAssociateTagsValues((prev) => {
                            const next = { ...(prev || {}) };
                            delete next[tagId];
                            return next;
                          });
                        }}
                        onChange={(value) => {
                          setAssociateTagsValues((prev) => {
                            const next = { ...(prev || {}) };
                            if (!value) {
                              delete next[tagId];
                            } else {
                              next[tagId] = value;
                            }
                            return next;
                          });
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="sticky bottom-0 bg-white z-10 flex items-center justify-start gap-3 p-6 border-t border-gray-200">
          <button
            type="button"
            className={`px-6 py-2 rounded-md text-sm font-medium transition-colors ${
              isSavingAssociateTags ? "bg-blue-400 text-white cursor-not-allowed" : "bg-blue-600 text-white cursor-pointer hover:bg-blue-700"
            }`}
            onClick={onSave}
            disabled={isSavingAssociateTags}
          >
            Save
          </button>
          <button
            type="button"
            className="px-6 py-2 bg-white border border-gray-300 text-gray-700 rounded-md text-sm font-medium cursor-pointer hover:bg-gray-50 transition-colors"
            onClick={onClose}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
