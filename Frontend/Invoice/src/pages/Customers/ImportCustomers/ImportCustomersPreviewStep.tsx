import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { X, Download, ChevronDown, ChevronUp, HelpCircle, Search, Check, Lightbulb, LayoutGrid, HardDrive, Box, Square, Cloud, ChevronUp as ChevronUpIcon, Users, FileText, Folder, Building2, Edit, ChevronLeft, Info, Loader2 } from "lucide-react";
import { getAllDocuments, addDocument } from "../../../../utils/documentStorage";
import { saveCustomer } from "../../customersDbModel";
import { parseImportFile } from "../../utils/importFileParser";
import { toast } from "react-toastify";
export default function ImportCustomersPreviewStep({ controller }: { controller: any }) {
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
            {/* Information Banner */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 flex items-start gap-3">
              <Info size={20} className="text-blue-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-blue-900">
                All Customers in your file are ready to be imported
              </p>
            </div>

            {/* Preview Summary */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
              {/* Ready to Import */}
              <div className="flex items-center justify-between py-4 border-b border-gray-200">
                <div className="flex items-center gap-3">
                  <Check size={20} className="text-green-600" />
                  <span className="text-sm font-medium text-gray-700">
                    Customers that are ready to be imported - {previewData.readyToImport}
                  </span>
                </div>
                <button
                  onClick={() => setShowReadyDetails(!showReadyDetails)}
                  className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  View Details
                  <ChevronDown size={16} className={showReadyDetails ? "rotate-180" : ""} />
                </button>
              </div>

              {/* Skipped Records */}
              <div className="flex items-center justify-between py-4 border-b border-gray-200">
                <div className="flex items-center gap-3">
                  <HelpCircle size={20} className="text-orange-500" />
                  <span className="text-sm font-medium text-gray-700">
                    No. of Records skipped - {previewData.skippedRecords}
                  </span>
                </div>
                <button
                  onClick={() => setShowSkippedDetails(!showSkippedDetails)}
                  className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  View Details
                  <ChevronDown size={16} className={showSkippedDetails ? "rotate-180" : ""} />
                </button>
              </div>

              {/* Unmapped Fields */}
              <div className="flex items-center justify-between py-4">
                <div className="flex items-center gap-3">
                  <HelpCircle size={20} className="text-orange-500" />
                  <span className="text-sm font-medium text-gray-700">
                    Unmapped Fields - {previewData.unmappedFields}
                  </span>
                </div>
                <button
                  onClick={() => setShowUnmappedDetails(!showUnmappedDetails)}
                  className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  View Details
                  <ChevronDown size={16} className={showUnmappedDetails ? "rotate-180" : ""} />
                </button>
              </div>
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
                  className={`px-8 py-3 bg-blue-600 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm flex items-center gap-2 ${isLoading ? 'opacity-70 cursor-not-allowed' : 'hover:bg-blue-700'}`}
                  onClick={handleImport}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Importing...
                    </>
                  ) : (
                    "Import"
                  )}
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
