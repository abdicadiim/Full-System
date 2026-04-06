import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { X, Download, ChevronDown, ChevronUp, HelpCircle, Search, Check, Lightbulb, LayoutGrid, HardDrive, Box, Square, Cloud, ChevronUp as ChevronUpIcon, Users, FileText, Folder, Building2, Edit, ChevronLeft, Info, Loader2 } from "lucide-react";
import { getAllDocuments, addDocument } from "../../../../utils/documentStorage";
import { saveCustomer } from "../../customersDbModel";
import { parseImportFile } from "../../utils/importFileParser";
import { toast } from "react-toastify";
export default function ImportCustomersDecimalFormatModal({ controller }: { controller: any }) {
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000]" onClick={() => setIsDecimalFormatModalOpen(false)}>
          <div className="bg-white rounded-lg shadow-xl w-[700px] max-w-[90vw] flex flex-col" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Default Data Formats</h2>
              <button
                onClick={() => setIsDecimalFormatModalOpen(false)}
                className="text-red-500 hover:text-red-600 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">DATA TYPE</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">SELECT FORMAT AT FIELD LEVEL</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">DEFAULT FORMAT</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-gray-100">
                      <td className="py-4 px-4 text-sm text-gray-700">Decimal Format</td>
                      <td className="py-4 px-4">
                        <input
                          type="checkbox"
                          checked={selectFormatAtFieldLevel}
                          onChange={(e) => setSelectFormatAtFieldLevel(e.target.checked)}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                      </td>
                      <td className="py-4 px-4">
                        <div className="relative">
                          <input
                            type="text"
                            value={decimalFormat}
                            onChange={(e) => setDecimalFormat(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
                            placeholder="1234567.89"
                          />
                          <ChevronDown size={16} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" />
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
              <button
                onClick={() => setIsDecimalFormatModalOpen(false)}
                className="px-6 py-2 bg-white border border-gray-200 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setIsDecimalFormatModalOpen(false);
                }}
                className="px-6 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </div>
  );
}