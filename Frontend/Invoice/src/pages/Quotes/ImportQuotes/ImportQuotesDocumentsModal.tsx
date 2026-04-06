import React from "react";
import { Building2, FileText, Folder, Search, X } from "lucide-react";
import type { ImportQuotesController } from "./useImportQuotesController";

type Props = {
  controller: ImportQuotesController;
};

export default function ImportQuotesDocumentsModal({ controller }: Props) {
  if (!controller.isDocumentsModalOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000]" onClick={() => controller.setIsDocumentsModalOpen(false)}>
      <div className="bg-white rounded-lg shadow-xl w-[900px] h-[640px] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Documents</h2>
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search Files"
                value={controller.documentSearch}
                onChange={(e) => controller.setDocumentSearch(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={() => controller.setIsDocumentsModalOpen(false)}
              className="text-red-500 hover:text-red-600 transition-colors"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <div className="w-[200px] bg-gray-50 border-r border-gray-200 p-4">
            <h3 className="text-xs font-semibold text-gray-500 uppercase mb-4">INBOXES</h3>
            <div className="space-y-1">
              <button
                onClick={() => controller.setSelectedDocumentCategory("files")}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-md transition-colors ${controller.selectedDocumentCategory === "files"
                  ? "bg-blue-50 text-blue-600"
                  : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                <Folder size={18} className={controller.selectedDocumentCategory === "files" ? "text-blue-600" : "text-gray-500"} />
                Files
              </button>
              <button
                onClick={() => controller.setSelectedDocumentCategory("bankStatements")}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-md transition-colors ${controller.selectedDocumentCategory === "bankStatements"
                  ? "bg-blue-50 text-blue-600"
                  : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                <Building2 size={18} className={controller.selectedDocumentCategory === "bankStatements" ? "text-blue-600" : "text-gray-500"} />
                Bank Statements
              </button>
              <button
                onClick={() => controller.setSelectedDocumentCategory("allDocuments")}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-md transition-colors ${controller.selectedDocumentCategory === "allDocuments"
                  ? "bg-blue-50 text-blue-600"
                  : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                <FileText size={18} className={controller.selectedDocumentCategory === "allDocuments" ? "text-blue-600" : "text-gray-500"} />
                All Documents
              </button>
            </div>
          </div>

          <div className="flex-1 flex flex-col bg-white overflow-hidden">
            <div className="grid grid-cols-3 gap-4 px-6 py-4 border-b border-gray-200 bg-gray-50">
              <div className="text-sm font-semibold text-gray-700">FILE NAME</div>
              <div className="text-sm font-semibold text-gray-700">DETAILS</div>
              <div className="text-sm font-semibold text-gray-700">UPLOADED BY</div>
            </div>

            {controller.filteredDocuments.length > 0 ? (
              <div className="flex-1 overflow-y-auto">
                {controller.filteredDocuments.map((doc) => (
                  <div
                    key={doc.id}
                    onClick={() => {
                      if (controller.selectedDocuments.includes(doc.id)) {
                        controller.setSelectedDocuments(controller.selectedDocuments.filter((id) => id !== doc.id));
                      } else {
                        controller.setSelectedDocuments([...controller.selectedDocuments, doc.id]);
                      }
                    }}
                    className={`grid grid-cols-3 gap-4 px-6 py-3 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${controller.selectedDocuments.includes(doc.id) ? "bg-blue-50" : ""
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={controller.selectedDocuments.includes(doc.id)}
                        onChange={() => {}}
                        onClick={(e) => e.stopPropagation()}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <div className="flex items-center gap-2">
                        <FileText size={18} className="text-gray-400" />
                        <span className="text-sm text-gray-900 font-medium">{doc.name}</span>
                      </div>
                    </div>
                    <div className="text-sm text-gray-600">
                      {doc.size} • {doc.type?.toUpperCase() || "FILE"}
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
              <div className="flex-1 flex flex-col items-center justify-center p-8">
                <p className="text-sm text-gray-600 mb-4">
                  {controller.documentSearch ? "No documents found matching your search." : "No documents available."}
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
          <button
            onClick={() => controller.setIsDocumentsModalOpen(false)}
            className="px-6 py-2 bg-white border border-gray-200 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              if (controller.selectedDocuments.length > 0) {
                const selectedDocs = controller.documents.filter((doc) => controller.selectedDocuments.includes(doc.id));
                console.log("Selected documents:", selectedDocs);
                controller.setIsDocumentsModalOpen(false);
                controller.setSelectedDocuments([]);
              } else {
                alert("Please select at least one document to attach.");
              }
            }}
            className="px-6 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={controller.selectedDocuments.length === 0}
          >
            Attachments {controller.selectedDocuments.length > 0 && `(${controller.selectedDocuments.length})`}
          </button>
        </div>
      </div>
    </div>
  );
}
