import React from "react";
import { Check, ChevronDown, ChevronLeft, Edit, Info, Search, X } from "lucide-react";
import type { ImportQuotesController } from "./useImportQuotesController";

type Props = {
  controller: ImportQuotesController;
};

export default function ImportQuotesMapFieldsStep({ controller }: Props) {
  const renderMappingSection = (title: string, fields: string[]) => (
    <div className="mb-8" key={title}>
      <h3 className="text-xl font-semibold text-gray-900 mb-4">{title}</h3>
      <div className="grid grid-cols-2 bg-gray-50 border-y border-gray-200">
        <div className="px-4 py-2 text-[11px] tracking-wide font-semibold text-gray-600">ZOHO BILLING FIELD</div>
        <div className="px-4 py-2 text-[11px] tracking-wide font-semibold text-gray-600">IMPORTED FILE HEADERS</div>
      </div>
      <div className="space-y-3 pt-4">
        {fields.map((field) => {
          const selectedValue = controller.fieldMappings[field] || controller.findBestHeaderMatch(field, controller.importedFileHeaders) || "";
          const filteredOptions = controller.mappingDropdownOptions.filter((option) =>
            option.toLowerCase().includes(controller.mappingSearch.toLowerCase())
          );
          const isRequired = controller.requiredMapFields.includes(field) || controller.requiredTagFieldNames.includes(field);

          return (
            <div key={field} className="grid grid-cols-2 gap-6 items-start">
              <div className="text-sm font-medium text-gray-700 pt-2.5">
                {field}
                {isRequired && <span className="text-red-500 ml-1">*</span>}
              </div>
              <div className="relative" data-mapping-dropdown="true">
                <button
                  type="button"
                  onClick={() => {
                    if (controller.openMappingDropdownField === field) {
                      controller.setOpenMappingDropdownField(null);
                      controller.setMappingSearch("");
                    } else {
                      controller.setOpenMappingDropdownField(field);
                      controller.setMappingSearch("");
                    }
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 border border-gray-300 rounded-md bg-white text-sm text-gray-700 hover:border-[#156372]"
                >
                  <span>{selectedValue || "Select"}</span>
                  <div className="flex items-center gap-2">
                    {selectedValue && (
                      <X
                        size={14}
                        className="text-red-500 hover:text-red-700"
                        onClick={(event) => {
                          event.stopPropagation();
                          controller.setFieldMappings((prev) => ({ ...prev, [field]: "" }));
                        }}
                      />
                    )}
                    <ChevronDown size={14} className="text-gray-500" />
                  </div>
                </button>
                {controller.openMappingDropdownField === field && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-md shadow-xl z-40 overflow-hidden">
                    <div className="p-2 border-b border-gray-200">
                      <div className="flex items-center gap-2 border border-[#156372] rounded-md px-2 py-1.5">
                        <Search size={14} className="text-gray-400" />
                        <input
                          type="text"
                          value={controller.mappingSearch}
                          onChange={(e) => controller.setMappingSearch(e.target.value)}
                          placeholder="Search"
                          className="w-full text-sm bg-transparent focus:outline-none"
                        />
                      </div>
                    </div>
                    <div className="max-h-52 overflow-y-auto">
                      <button
                        type="button"
                        onClick={() => {
                          controller.setFieldMappings((prev) => ({ ...prev, [field]: "" }));
                          controller.setOpenMappingDropdownField(null);
                          controller.setMappingSearch("");
                        }}
                        className={`w-full px-3 py-2 text-left text-sm flex items-center justify-between transition-colors ${
                          !selectedValue ? "bg-[#156372] text-white" : "text-gray-700 hover:bg-[#156372] hover:text-white"
                        }`}
                      >
                        <span>Select</span>
                        {!selectedValue ? <Check size={14} /> : null}
                      </button>
                      {filteredOptions.map((option) => (
                        <button
                          key={option}
                          type="button"
                          onClick={() => {
                            controller.setFieldMappings((prev) => ({ ...prev, [field]: option }));
                            controller.setOpenMappingDropdownField(null);
                            controller.setMappingSearch("");
                          }}
                          className={`w-full px-3 py-2 text-left text-sm flex items-center justify-between transition-colors ${
                            selectedValue === option ? "bg-[#156372] text-white" : "text-gray-700 hover:bg-[#156372] hover:text-white"
                          }`}
                        >
                          <span>{option}</span>
                          {selectedValue === option ? <Check size={14} /> : null}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div>
      <div className="mb-4">
        <p className="text-sm text-gray-700">
          Your Selected File: <span className="font-semibold">{controller.selectedFile?.name || "file.csv"}</span>
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 flex items-start gap-3">
        <Info size={20} className="text-blue-600 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-blue-800">
          The best match to each field on the selected file have been auto-selected.
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Default Data Formats</h2>
          <button
            type="button"
            onClick={controller.openDataFormatsModal}
            className="inline-flex items-center gap-1.5 text-sm text-[#156372] hover:text-[#0f4f5b]"
          >
            <Edit size={14} />
            Edit
          </button>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm text-gray-700">
          <div>
            <span className="font-medium">Date:</span> {controller.dateFormat}
          </div>
          <div>
            <span className="font-medium">Decimal Format:</span> {controller.decimalFormat}
          </div>
        </div>
      </div>

      {controller.isDataFormatsModalOpen && (
        <div className="fixed inset-0 z-[170] bg-black/40 flex items-start justify-center pt-16 px-4">
          <div className="w-full max-w-3xl bg-white rounded-md border border-gray-200 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800">Default Data Formats</h3>
              <button
                type="button"
                onClick={() => controller.setIsDataFormatsModalOpen(false)}
                className="w-7 h-7 flex items-center justify-center border border-blue-300 rounded-sm text-red-500 hover:bg-gray-50"
              >
                <X size={14} />
              </button>
            </div>
            <div className="p-5">
              <div className="border border-gray-200 rounded-sm overflow-hidden">
                <div className="grid grid-cols-[1.1fr_1.6fr_2fr] bg-gray-50 border-b border-gray-200">
                  <div className="px-3 py-2 text-xs font-semibold text-gray-700">DATA TYPE</div>
                  <div className="px-3 py-2 text-xs font-semibold text-gray-700">SELECT FORMAT AT FIELD LEVEL</div>
                  <div className="px-3 py-2 text-xs font-semibold text-gray-700">DEFAULT FORMAT</div>
                </div>
                <div className="grid grid-cols-[1.1fr_1.6fr_2fr] border-b border-gray-200">
                  <div className="px-3 py-2.5 text-sm text-gray-700">Date</div>
                  <div className="px-3 py-2.5 flex items-center justify-center">
                    <input
                      type="checkbox"
                      checked={controller.isDateFormatAtFieldLevel}
                      onChange={(e) => controller.setIsDateFormatAtFieldLevel(e.target.checked)}
                      className="w-4 h-4 text-[#156372] border-gray-300 rounded focus:ring-[#156372]"
                    />
                  </div>
                  <div className="px-3 py-2.5">
                    <select
                      value={controller.tempDateFormat}
                      onChange={(e) => controller.setTempDateFormat(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#156372]"
                    >
                      <option value="yyyy-MM-dd">yyyy-MM-dd</option>
                      <option value="MM/dd/yyyy">MM/dd/yyyy</option>
                      <option value="dd/MM/yyyy">dd/MM/yyyy</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-[1.1fr_1.6fr_2fr]">
                  <div className="px-3 py-2.5 text-sm text-gray-700">Decimal Format</div>
                  <div className="px-3 py-2.5 flex items-center justify-center">
                    <input
                      type="checkbox"
                      checked={controller.isDecimalFormatAtFieldLevel}
                      onChange={(e) => controller.setIsDecimalFormatAtFieldLevel(e.target.checked)}
                      className="w-4 h-4 text-[#156372] border-gray-300 rounded focus:ring-[#156372]"
                    />
                  </div>
                  <div className="px-3 py-2.5">
                    <select
                      value={controller.tempDecimalFormat}
                      onChange={(e) => controller.setTempDecimalFormat(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#156372]"
                    >
                      <option value="1234567.89">1234567.89</option>
                      <option value="1,234,567.89">1,234,567.89</option>
                      <option value="1234567,89">1234567,89</option>
                      <option value="1.234.567,89">1.234.567,89</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
            <div className="px-5 py-4 border-t border-gray-200 flex items-center gap-3">
              <button
                type="button"
                onClick={controller.handleSaveDataFormats}
                className="px-5 py-2 bg-[#156372] text-white rounded-md text-sm font-semibold hover:bg-[#0f4f5b]"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => controller.setIsDataFormatsModalOpen(false)}
                className="px-5 py-2 bg-white border border-gray-300 text-gray-700 rounded-md text-sm hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        {controller.mapFieldSections.map((section) => renderMappingSection(section.title, section.fields))}
      </div>

      <div className="flex items-center justify-between">
        <button
          className="flex items-center gap-2 px-8 py-3 bg-white border-2 border-gray-200 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors"
          onClick={controller.handlePrevious}
        >
          <ChevronLeft size={16} />
          Previous
        </button>
        <div className="flex items-center gap-3">
          <button
            className="px-8 py-3 bg-[#156372] text-white rounded-lg text-sm font-semibold hover:bg-[#0f4f5b] transition-colors shadow-sm"
            onClick={controller.handleNext}
          >
            Next &gt;
          </button>
          <button
            className="px-8 py-3 bg-white border-2 border-gray-200 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors"
            onClick={controller.handleCancel}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
