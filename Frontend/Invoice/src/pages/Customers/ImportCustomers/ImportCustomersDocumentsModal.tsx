import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { X, Download, ChevronDown, ChevronUp, HelpCircle, Search, Check, Lightbulb, LayoutGrid, HardDrive, Box, Square, Cloud, ChevronUp as ChevronUpIcon, Users, FileText, Folder, Building2, Edit, ChevronLeft, Info, Loader2 } from "lucide-react";
import { getAllDocuments, addDocument } from "../../../../utils/documentStorage";
import { saveCustomer } from "../../customersDbModel";
import { parseImportFile } from "../../utils/importFileParser";
import { toast } from "react-toastify";
export default function ImportCustomersDocumentsModal({ controller }: { controller: any }) {
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000]" onClick={() => setIsDocumentsModalOpen(false)}>
          <div className="bg-white rounded-lg shadow-xl w-[900px] h-[640px] flex flex-col" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Documents</h2>
              <div className="flex items-center gap-4">
                {/* Search Bar */}
                <div className="relative">
                  <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search Files"
                    value={documentSearch}
                    onChange={(e) => setDocumentSearch(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <button
                  onClick={() => setIsDocumentsModalOpen(false)}
                  className="text-red-500 hover:text-red-600 transition-colors"
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex flex-1 overflow-hidden">
              {/* Left Sidebar - INBOXES */}
              <div className="w-[200px] bg-gray-50 border-r border-gray-200 p-4">
                <h3 className="text-xs font-semibold text-gray-500 uppercase mb-4">INBOXES</h3>
                <div className="space-y-1">
                  <button
                    onClick={() => setSelectedDocumentCategory("files")}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-md transition-colors ${selectedDocumentCategory === "files"
                      ? "bg-blue-50 text-blue-600"
                      : "text-gray-700 hover:bg-gray-100"
                      }`}
                  >
                    <Folder size={18} className={selectedDocumentCategory === "files" ? "text-blue-600" : "text-gray-500"} />
                    Files
                  </button>
                  <button
                    onClick={() => setSelectedDocumentCategory("bankStatements")}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-md transition-colors ${selectedDocumentCategory === "bankStatements"
                      ? "bg-blue-50 text-blue-600"
                      : "text-gray-700 hover:bg-gray-100"
                      }`}
                  >
                    <Building2 size={18} className={selectedDocumentCategory === "bankStatements" ? "text-blue-600" : "text-gray-500"} />
                    Bank Statements
                  </button>
                  <button
                    onClick={() => setSelectedDocumentCategory("allDocuments")}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-md transition-colors ${selectedDocumentCategory === "allDocuments"
                      ? "bg-blue-50 text-blue-600"
                      : "text-gray-700 hover:bg-gray-100"
                      }`}
                  >
                    <FileText size={18} className={selectedDocumentCategory === "allDocuments" ? "text-blue-600" : "text-gray-500"} />
                    All Documents
                  </button>
                </div>
              </div>

              {/* Main Content Area */}
              <div className="flex-1 flex flex-col bg-white overflow-hidden">
                {/* Table Header */}
                <div className="grid grid-cols-3 gap-4 px-6 py-4 border-b border-gray-200 bg-gray-50">
                  <div className="text-sm font-semibold text-gray-700">FILE NAME</div>
                  <div className="text-sm font-semibold text-gray-700">DETAILS</div>
                  <div className="text-sm font-semibold text-gray-700">UPLOADED BY</div>
                </div>

                {/* Documents List */}
                {filteredDocuments.length > 0 ? (
                  <div className="flex-1 overflow-y-auto">
                    {filteredDocuments.map((doc) => (
                      <div
                        key={doc.id}
                        onClick={() => {
                          if (selectedDocuments.includes(doc.id)) {
                            setSelectedDocuments(selectedDocuments.filter(id => id !== doc.id));
                          } else {
                            setSelectedDocuments([...selectedDocuments, doc.id]);
                          }
                        }}
                        className={`grid grid-cols-3 gap-4 px-6 py-3 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${selectedDocuments.includes(doc.id) ? "bg-blue-50" : ""
                          }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={selectedDocuments.includes(doc.id)}
                            onChange={() => { }}
                            onClick={(e) => e.stopPropagation()}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <div className="flex items-center gap-2">
                            <FileText size={18} className="text-gray-400" />
                            <span className="text-sm text-gray-900 font-medium">{doc.name}</span>
                          </div>
                        </div>
                        <div className="text-sm text-gray-600">
                          {doc.size} � {doc.type?.toUpperCase() || "FILE"}
                          {doc.associatedTo && (
                            <div className="text-xs text-gray-500 mt-1">Associated: {doc.associatedTo}</div>
                          )}
                        </div>
                        <div className="text-sm text-gray-600">
                          {doc.uploadedBy || "Me"}
                          {doc.uploadedOn && (
                            <div className="text-xs text-gray-500 mt-1">{doc.uploadedOn}</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  /* Empty State */
                  <div className="flex-1 flex flex-col items-center justify-center p-8">
                    <p className="text-sm text-gray-600 mb-4">
                      {documentSearch ? "No documents found matching your search." : "Autoscan is disabled. Please enable it from the Inbox module."}
                    </p>
                    {!documentSearch && (
                      <button
                        onClick={() => {
                          setIsDocumentsModalOpen(false);
                          navigate("/documents");
                        }}
                        className="text-blue-600 hover:text-blue-700 underline text-sm font-medium"
                      >
                        Go to Inbox
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
              <button
                onClick={() => setIsDocumentsModalOpen(false)}
                className="px-6 py-2 bg-white border border-gray-200 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (selectedDocuments.length > 0) {
                    // For now, just close the modal
                    setIsDocumentsModalOpen(false);
                    setSelectedDocuments([]);
                  } else {
                    toast.error("Please select at least one document to attach.");
                  }
                }}
                className="px-6 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={selectedDocuments.length === 0}
              >
                Attachments {selectedDocuments.length > 0 && `(${selectedDocuments.length})`}
              </button>
            </div>
          </div>
        </div>
  );
}