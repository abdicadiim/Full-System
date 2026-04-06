import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { X, Download, ChevronDown, ChevronUp, HelpCircle, Search, Check, Lightbulb, LayoutGrid, HardDrive, Box, Square, Cloud, ChevronUp as ChevronUpIcon, Users, FileText, Folder, Building2, Edit, ChevronLeft, Info, Loader2 } from "lucide-react";
import { getAllDocuments, addDocument } from "../../../../utils/documentStorage";
import { saveCustomer } from "../../customersDbModel";
import { parseImportFile } from "../../utils/importFileParser";
import { toast } from "react-toastify";
export default function ImportCustomersConfigureStep({ controller }: { controller: any }) {
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
            {/* File Upload Area */}
            <div
              className="bg-white rounded-xl shadow-sm border-2 border-dashed border-gray-300 p-12 text-center mb-6 hover:border-blue-500 transition-colors"
              ref={dropAreaRef}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <Download size={48} className="text-gray-400 mx-auto mb-4" />
              <p className="text-lg font-semibold text-gray-700 mb-4">Drag and drop file to import</p>
              <div className="relative inline-block" ref={fileSourceDropdownRef}>
                <button
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm flex items-center gap-2 mx-auto"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsFileSourceDropdownOpen(!isFileSourceDropdownOpen);
                  }}
                >
                  Choose File
                  <ChevronDown size={16} />
                </button>
                {isFileSourceDropdownOpen && (
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[200px]">
                    <div
                      className="px-4 py-3 text-sm text-gray-700 cursor-pointer hover:bg-blue-600 hover:text-white transition-colors"
                      onClick={handleAttachFromDesktop}
                    >
                      Attach From Desktop
                    </div>
                    <div
                      className="px-4 py-3 text-sm text-gray-700 cursor-pointer hover:bg-blue-600 hover:text-white transition-colors"
                      onClick={handleAttachFromCloud}
                    >
                      Attach From Cloud
                    </div>
                    <div
                      className="px-4 py-3 text-sm text-gray-700 cursor-pointer hover:bg-blue-600 hover:text-white transition-colors"
                      onClick={handleAttachFromDocuments}
                    >
                      Attach From Documents
                    </div>
                  </div>
                )}
              </div>
              {selectedFile && (
                <p className="mt-4 text-sm font-medium text-green-600">
                  Selected: {selectedFile.name}
                </p>
              )}
              <p className="mt-4 text-xs text-gray-500">
                Maximum File Size: 25 MB � File Format: CSV or TSV or XLS
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.tsv,.xls,.xlsx"
                onChange={handleFileSelect}
                style={{ display: "none" }}
              />
            </div>

            {/* Sample File Links */}
            <div className="bg-blue-50 rounded-lg border border-blue-200 p-4 mb-6">
              <p className="text-sm text-gray-700">
                Download a{" "}
                <button
                  onClick={() => downloadSampleFile('csv')}
                  className="text-blue-600 hover:text-blue-700 hover:underline font-semibold bg-transparent border-none p-0 cursor-pointer"
                >
                  sample csv file
                </button>
                {" "}or{" "}
                <button
                  onClick={() => downloadSampleFile('xls')}
                  className="text-blue-600 hover:text-blue-700 hover:underline font-semibold bg-transparent border-none p-0 cursor-pointer"
                >
                  sample xls file
                </button>
                {" "}and compare it to your import file to ensure you have the file perfect for the import.
              </p>
            </div>

            {/* Duplicate Handling Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
              <div className="flex items-center gap-2 mb-4">
                <label className="text-sm font-semibold text-gray-700">Duplicate Handling:</label>
                <span className="text-red-500">*</span>
                <HelpCircle size={16} className="text-gray-400 cursor-help" />
              </div>
              <div className="space-y-4">
                <label className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="radio"
                    name="duplicateHandling"
                    value="skip"
                    checked={duplicateHandling === "skip"}
                    onChange={(e) => setDuplicateHandling(e.target.value)}
                    className="mt-1 w-4 h-4 text-red-600 border-gray-300 focus:ring-red-500"
                  />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900">Skip Duplicates</div>
                    <div className="text-xs text-gray-600 mt-1">
                      Retains the customers in Zoho Books and does not import the duplicates in the import file.
                    </div>
                  </div>
                </label>
                <label className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="radio"
                    name="duplicateHandling"
                    value="overwrite"
                    checked={duplicateHandling === "overwrite"}
                    onChange={(e) => setDuplicateHandling(e.target.value)}
                    className="mt-1 w-4 h-4 text-red-600 border-gray-300 focus:ring-red-500"
                  />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900">Overwrite customers</div>
                    <div className="text-xs text-gray-600 mt-1">
                      Imports the duplicates in the import file and overwrites the existing customers in Zoho Books.
                    </div>
                  </div>
                </label>
                <label className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="radio"
                    name="duplicateHandling"
                    value="add"
                    checked={duplicateHandling === "add"}
                    onChange={(e) => setDuplicateHandling(e.target.value)}
                    className="mt-1 w-4 h-4 text-red-600 border-gray-300 focus:ring-red-500"
                  />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900">Add duplicates as new customers</div>
                    <div className="text-xs text-gray-600 mt-1">
                      Imports the duplicates in the import file and adds them as new customers in Zoho Books.
                    </div>
                  </div>
                </label>
              </div>
            </div>

            {/* Character Encoding */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-sm font-semibold text-gray-700">Character Encoding</span>
                <HelpCircle size={16} className="text-gray-400 cursor-help" />
              </div>
              <div
                className="relative"
                ref={encodingDropdownRef}
              >
                <button
                  className="w-full flex items-center justify-between px-4 py-3 border-2 border-gray-200 rounded-lg bg-white text-gray-700 hover:border-blue-500 transition-colors"
                  onClick={() => setIsEncodingDropdownOpen(!isEncodingDropdownOpen)}
                >
                  <span className="text-sm font-medium">{characterEncoding}</span>
                  {isEncodingDropdownOpen ? (
                    <ChevronUp size={16} className="text-gray-400" />
                  ) : (
                    <ChevronDown size={16} className="text-gray-400" />
                  )}
                </button>
                {isEncodingDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white border-2 border-gray-200 rounded-xl shadow-xl z-50 max-h-80 overflow-hidden">
                    <div className="flex items-center gap-2 p-3 border-b border-gray-200 bg-gray-50">
                      <Search size={16} className="text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search encoding..."
                        value={encodingSearch}
                        onChange={(e) => setEncodingSearch(e.target.value)}
                        className="flex-1 text-sm bg-transparent focus:outline-none"
                      />
                    </div>
                    <div className="max-h-60 overflow-y-auto">
                      {filteredEncodingOptions.map((option) => (
                        <div
                          key={option}
                          className={`p-3 cursor-pointer hover:bg-blue-50 flex items-center justify-between transition-colors ${option === characterEncoding ? "bg-blue-50 border-l-4 border-blue-600" : ""
                            }`}
                          onClick={() => {
                            setCharacterEncoding(option);
                            setIsEncodingDropdownOpen(false);
                            setEncodingSearch("");
                          }}
                        >
                          <span className="text-sm font-medium text-gray-900">{option}</span>
                          {option === characterEncoding && (
                            <Check size={16} className="text-blue-600" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Page Tips */}
            <div className="bg-yellow-50 rounded-xl border border-yellow-200 p-6 mb-6">
              <div className="flex items-center gap-2 mb-4">
                <Lightbulb size={20} className="text-yellow-600" />
                <h3 className="text-base font-semibold text-gray-900">Page Tips</h3>
              </div>
              <ul className="space-y-2 text-sm text-gray-700 list-disc list-inside">
                <li>
                  You can download the{" "}
                  <button
                    onClick={() => downloadSampleFile('xls')}
                    className="text-blue-600 hover:text-blue-700 hover:underline font-semibold bg-transparent border-none p-0 cursor-pointer"
                  >
                    sample xls file
                  </button>
                  {" "}to get detailed information about the data fields used while importing.
                </li>
                <li>
                  If you have files in other formats, you can convert it to an accepted file format using any online/offline converter.
                </li>
                <li>
                  You can configure your import settings and save them for future too!
                </li>
              </ul>
            </div>

            {/* Navigation Buttons */}
            <div className="flex items-center justify-end gap-3">
              <button
                className="px-8 py-3 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 transition-colors shadow-sm"
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
          </>
  );
}