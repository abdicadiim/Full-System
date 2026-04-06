import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { X, Download, ChevronDown, ChevronUp, HelpCircle, Search, Check, Lightbulb, LayoutGrid, HardDrive, Box, Square, Cloud, ChevronUp as ChevronUpIcon, Users, FileText, Folder, Building2, Edit, ChevronLeft, Info, Loader2 } from "lucide-react";
import { getAllDocuments, addDocument } from "../../../../utils/documentStorage";
import { saveCustomer } from "../../customersDbModel";
import { parseImportFile } from "../../utils/importFileParser";
import { toast } from "react-toastify";
export default function ImportCustomersMapFieldsStep({ controller }: { controller: any }) {
  const {
    navigate,
    selectedFile,
    setSelectedFile,
    duplicateHandling,
    setDuplicateHandling,
    characterEncoding,
    setCharacterEncoding,
    isEncodingDropdownOpen,
    setIsEncodingDropdownOpen,
    encodingSearch,
    setEncodingSearch,
    isFileSourceDropdownOpen,
    setIsFileSourceDropdownOpen,
    isCloudPickerOpen,
    setIsCloudPickerOpen,
    isDocumentsModalOpen,
    setIsDocumentsModalOpen,
    selectedDocumentCategory,
    setSelectedDocumentCategory,
    documentSearch,
    setDocumentSearch,
    documents,
    setDocuments,
    selectedDocuments,
    setSelectedDocuments,
    selectedCloudProvider,
    setSelectedCloudProvider,
    currentStep,
    setCurrentStep,
    isLoading,
    setIsLoading,
    fieldMappings,
    setFieldMappings,
    previewData,
    setPreviewData,
    showReadyDetails,
    setShowReadyDetails,
    showSkippedDetails,
    setShowSkippedDetails,
    showUnmappedDetails,
    setShowUnmappedDetails,
    decimalFormat,
    setDecimalFormat,
    saveSelections,
    setSaveSelections,
    isDecimalFormatModalOpen,
    setIsDecimalFormatModalOpen,
    selectFormatAtFieldLevel,
    setSelectFormatAtFieldLevel,
    importedFileHeaders,
    setImportedFileHeaders,
    fileInputRef,
    encodingDropdownRef,
    fileSourceDropdownRef,
    dropAreaRef,
    encodingOptions,
    filteredEncodingOptions,
    filteredDocuments,
    handleFileSelect,
    handleChooseFileClick,
    handleAttachFromDesktop,
    handleAttachFromCloud,
    handleAttachFromDocuments,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleClose,
    handleCancel,
    handleNext,
    handlePrevious,
    handleImport,
    downloadSampleFile,
  } = controller as any;
  return (
          <>
            {/* Selected File Info */}
            <div className="mb-4">
              <p className="text-sm text-gray-700">
                Your Selected File: <span className="font-semibold">{selectedFile?.name || "file.csv"}</span>
              </p>
            </div>

            {/* Info Banner */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 flex items-start gap-3">
              <Info size={20} className="text-blue-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-blue-800">
                The best match to each field on the selected file have been auto-selected.
              </p>
            </div>

            {/* Default Data Formats */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Default Data Formats</h2>
                <button
                  onClick={() => setIsDecimalFormatModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
                >
                  <Edit size={16} />
                  Edit
                </button>
              </div>
              <div>
                <div className="text-sm text-gray-700">
                  <span className="font-medium">Decimal Format:</span> {decimalFormat}
                </div>
              </div>
            </div>

            {/* Contact Details Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Contact Details</h2>
              <div className="space-y-4">
                {/* Field Mapping Row Component */}
                {[
                  { field: "Salutation", required: false },
                  { field: "First Name", required: false },
                  { field: "Last Name", required: false },
                  { field: "Display Name", required: true },
                  { field: "Company Name", required: false },
                  { field: "Email", required: false },
                  { field: "Work Phone", required: false },
                  { field: "Mobile", required: false },
                  { field: "Website", required: false },
                  { field: "Currency", required: false },
                  { field: "Customer Type", required: false },
                  { field: "Payment Terms", required: false },
                  { field: "Notes", required: false },
                ].map((item) => (
                  <div key={item.field} className="grid grid-cols-2 gap-4 items-center">
                    <div className="text-sm font-medium text-gray-700">
                      {item.field}
                      {item.required && <span className="text-red-500 ml-1">*</span>}
                    </div>
                    <div className="relative">
                      <select
                        value={fieldMappings[item.field] || ""}
                        onChange={(e) => setFieldMappings({ ...fieldMappings, [item.field]: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white"
                      >
                        <option value="">Select</option>
                        {importedFileHeaders.map((header) => (
                          <option key={header} value={header}>
                            {header}
                          </option>
                        ))}
                      </select>
                      <ChevronDown size={16} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Billing Address Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Billing Address</h2>
              <div className="space-y-4">
                {[
                  "Billing Attention",
                  "Billing Address",
                  "Billing Street2",
                  "Billing City",
                  "Billing State",
                  "Billing Zip Code",
                  "Billing Country",
                  "Billing Phone",
                  "Billing Fax",
                ].map((field) => (
                  <div key={field} className="grid grid-cols-2 gap-4 items-center">
                    <div className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      {field}
                      {field === "Billing Phone" && <HelpCircle size={14} className="text-gray-400" />}
                    </div>
                    <div className="relative">
                      <select
                        value={fieldMappings[field] || ""}
                        onChange={(e) => setFieldMappings({ ...fieldMappings, [field]: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white"
                      >
                        <option value="">Select</option>
                        {importedFileHeaders.map((header) => (
                          <option key={header} value={header}>
                            {header}
                          </option>
                        ))}
                      </select>
                      <ChevronDown size={16} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Shipping Address Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Shipping Address</h2>
              <div className="space-y-4">
                {[
                  "Shipping Attention",
                  "Shipping Address",
                  "Shipping Street2",
                  "Shipping City",
                  "Shipping State",
                  "Shipping Zip Code",
                  "Shipping Country",
                  "Shipping Phone",
                  "Shipping Fax",
                ].map((field) => (
                  <div key={field} className="grid grid-cols-2 gap-4 items-center">
                    <div className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      {field}
                      {field === "Shipping Phone" && <HelpCircle size={14} className="text-gray-400" />}
                    </div>
                    <div className="relative">
                      <select
                        value={fieldMappings[field] || ""}
                        onChange={(e) => setFieldMappings({ ...fieldMappings, [field]: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white"
                      >
                        <option value="">Select</option>
                        {importedFileHeaders.map((header) => (
                          <option key={header} value={header}>
                            {header}
                          </option>
                        ))}
                      </select>
                      <ChevronDown size={16} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Additional Fields Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Additional Fields</h2>
              <div className="space-y-4">
                {[
                  "Owner Name",
                  "Opening Balance",
                  "Opening Balance Exchange Rate",
                  "Accounts Receivable",
                  "Status",
                ].map((field) => (
                  <div key={field} className="grid grid-cols-2 gap-4 items-center">
                    <div className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      {field}
                      {(field === "Accounts Receivable" || field === "Opening Balance Exchange Rate") && (
                        <HelpCircle size={14} className="text-gray-400" />
                      )}
                    </div>
                    <div className="relative">
                      <select
                        value={fieldMappings[field] || ""}
                        onChange={(e) => setFieldMappings({ ...fieldMappings, [field]: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white"
                      >
                        <option value="">Select</option>
                        {importedFileHeaders.map((header) => (
                          <option key={header} value={header}>
                            {header}
                          </option>
                        ))}
                      </select>
                      <ChevronDown size={16} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* General Fields Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">General Fields</h2>
              <div className="space-y-4">
                {["SIRET", "Company ID"].map((field) => (
                  <div key={field} className="grid grid-cols-2 gap-4 items-center">
                    <div className="text-sm font-medium text-gray-700">{field}</div>
                    <div className="relative">
                      <select
                        value={fieldMappings[field] || ""}
                        onChange={(e) => setFieldMappings({ ...fieldMappings, [field]: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white"
                      >
                        <option value="">Select</option>
                        {importedFileHeaders.map((header) => (
                          <option key={header} value={header}>
                            {header}
                          </option>
                        ))}
                      </select>
                      <ChevronDown size={16} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Item Details Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Item Details</h2>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="text-sm font-semibold text-gray-700">ZOHO BOOKS FIELD</div>
                <div className="text-sm font-semibold text-gray-700">IMPORTED FILE HEADERS</div>
              </div>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 items-center">
                  <div className="text-sm font-medium text-gray-700">Price List</div>
                  <div className="relative">
                    <select
                      value={fieldMappings["Price List"] || ""}
                      onChange={(e) => setFieldMappings({ ...fieldMappings, "Price List": e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white"
                    >
                      <option value="">Select</option>
                      {importedFileHeaders.map((header) => (
                        <option key={header} value={header}>
                          {header}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={16} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>
                </div>
              </div>
            </div>

            {/* Tax Details Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Tax Details</h2>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="text-sm font-semibold text-gray-700">ZOHO BOOKS FIELD</div>
                <div className="text-sm font-semibold text-gray-700">IMPORTED FILE HEADERS</div>
              </div>
              <div className="space-y-4">
                {["Tax Name", "Tax Percentage", "Tax Type"].map((field) => (
                  <div key={field} className="grid grid-cols-2 gap-4 items-center">
                    <div className="text-sm font-medium text-gray-700">{field}</div>
                    <div className="relative">
                      <select
                        value={fieldMappings[field] || ""}
                        onChange={(e) => setFieldMappings({ ...fieldMappings, [field]: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white"
                      >
                        <option value="">Select</option>
                        {importedFileHeaders.map((header) => (
                          <option key={header} value={header}>
                            {header}
                          </option>
                        ))}
                      </select>
                      <ChevronDown size={16} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Save Option */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={saveSelections}
                  onChange={(e) => setSaveSelections(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Save these selections for use during future imports.</span>
              </label>
            </div>

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between">
              <button
                className="flex items-center gap-2 px-8 py-3 bg-white border-2 border-gray-200 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors"
                onClick={handlePrevious}
              >
                <ChevronLeft size={16} />
                Previous
              </button>
              <div className="flex items-center gap-3">
                <button
                  className="px-8 py-3 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm"
                  onClick={handleNext}
                >
                  Next &gt;
                </button>
                <button
                  className="px-8 py-3 bg-white border-2 border-gray-200 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors"
                  onClick={handleCancel}
                >
                  Cancel
                </button>
              </div>
            </div>
          </>
  );
}