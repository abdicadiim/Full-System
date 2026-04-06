import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { CreditCard, Folder, LayoutGrid, Search, Upload, X } from "lucide-react";
import { getAllDocuments } from "../../../../utils/documentStorage";
import { parseFileSize } from "./NewCustomer.utils";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onAttach: (documents: any[]) => void;
};

export default function DocumentsModal({ isOpen, onClose, onAttach }: Props) {
  const [selectedInbox, setSelectedInbox] = useState("files");
  const [documentSearch, setDocumentSearch] = useState("");
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);
  const [availableDocuments, setAvailableDocuments] = useState<any[]>([]);

  useEffect(() => {
    if (!isOpen) return;
    setAvailableDocuments(getAllDocuments());
    setSelectedInbox("files");
    setDocumentSearch("");
    setSelectedDocuments([]);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleDocumentUpdate = () => {
      setAvailableDocuments(getAllDocuments());
    };
    window.addEventListener("documentUpdated", handleDocumentUpdate);
    return () => window.removeEventListener("documentUpdated", handleDocumentUpdate);
  }, [isOpen]);

  const filteredDocs = useMemo(() => {
    let docs = availableDocuments;
    if (selectedInbox === "files") {
      docs = docs.filter((doc) => doc.folder === "Inbox" || doc.folder === "Files" || !doc.folder);
    } else if (selectedInbox === "bank-statements") {
      docs = docs.filter((doc) => doc.folder === "Bank Statements" || doc.module === "Banking");
    }
    if (documentSearch) {
      const query = documentSearch.toLowerCase();
      docs = docs.filter((doc) => doc.name.toLowerCase().includes(query) || (doc.associatedTo && doc.associatedTo.toLowerCase().includes(query)));
    }
    return docs;
  }, [availableDocuments, documentSearch, selectedInbox]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[2000]" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl w-[90%] max-w-4xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 m-0">Documents</h2>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search Files"
                value={documentSearch}
                onChange={(e) => setDocumentSearch(e.target.value)}
                className="pl-10 pr-8 py-2 border border-gray-300 rounded-md text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              {documentSearch && (
                <button onClick={() => setDocumentSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X size={16} />
                </button>
              )}
            </div>
            <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 transition-colors">
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <div className="w-64 border-r border-slate-100 bg-slate-50/50 flex flex-col h-full">
            <div className="p-4 space-y-1">
              <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest px-3 mb-2">INBOXES</div>
              {[
                { id: "all-documents", label: "All Documents", icon: LayoutGrid },
                { id: "files", label: "Inbox", icon: Folder },
                { id: "bank-statements", label: "Bank Statements", icon: CreditCard },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = selectedInbox === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setSelectedInbox(tab.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-bold transition-all ${isActive ? "bg-blue-600 text-white shadow-md shadow-blue-200" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"}`}
                  >
                    <Icon size={16} className={isActive ? "text-white" : "text-slate-400"} />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex-1 flex flex-col overflow-hidden bg-white">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between gap-4">
              <div className="relative flex-1 group">
                <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                <input
                  type="text"
                  placeholder="Search for documents..."
                  value={documentSearch}
                  onChange={(e) => setDocumentSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-[13px] font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-50/50 focus:border-blue-400 focus:bg-white transition-all placeholder:text-slate-400"
                />
              </div>
              <div className="text-[12px] font-bold text-slate-400 uppercase tracking-wider">{selectedDocuments.length} Selected</div>
            </div>

            <div className="flex-1 overflow-auto bg-white custom-scrollbar">
              {filteredDocs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 px-8 text-center space-y-4 h-full">
                  <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-300">
                    <Upload size={32} />
                  </div>
                  <div>
                    <p className="text-[14px] font-bold text-slate-600">No documents found</p>
                    <p className="text-[12px] text-slate-400 mt-1">Try changing your search or switching folders.</p>
                  </div>
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/30">
                      <th className="px-6 py-3 w-12">
                        <input
                          type="checkbox"
                          checked={filteredDocs.length > 0 && filteredDocs.every((d) => selectedDocuments.includes(d.id))}
                          onChange={(e) => setSelectedDocuments(e.target.checked ? filteredDocs.map((d) => d.id) : [])}
                          className="w-4 h-4 rounded border-slate-300 accent-blue-600 cursor-pointer"
                        />
                      </th>
                      <th className="px-6 py-3 text-[11px] font-extrabold text-slate-400 uppercase tracking-widest">Document Name</th>
                      <th className="px-6 py-3 text-[11px] font-extrabold text-slate-400 uppercase tracking-widest text-right">Details / Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDocs.map((doc) => {
                      const isSelected = selectedDocuments.includes(doc.id);
                      return (
                        <tr
                          key={doc.id}
                          onClick={() => setSelectedDocuments(isSelected ? selectedDocuments.filter((id) => id !== doc.id) : [...selectedDocuments, doc.id])}
                          className={`transition-all duration-200 cursor-pointer border-b border-slate-50 ${isSelected ? "bg-blue-50/30" : "hover:bg-slate-50/50"}`}
                        >
                          <td className="px-6 py-4">
                            <input type="checkbox" checked={isSelected} readOnly className="w-4 h-4 rounded border-slate-300 accent-blue-600 pointer-events-none" />
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className="text-[13px] font-bold text-slate-700">{doc.name}</span>
                              {doc.associatedTo && <span className="text-[11px] text-slate-400 font-medium">Associated to: {doc.associatedTo}</span>}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex flex-col text-right">
                              <span className="text-[12px] font-bold text-slate-600">{doc.size || "52 KB"}</span>
                              <span className="text-[11px] text-slate-400 font-medium">{doc.uploadedOn || "29 Dec 2025"}</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-100 bg-slate-50/10">
          <button onClick={onClose} className="px-6 py-2.5 text-[13px] font-bold text-slate-600 hover:text-slate-800 transition-colors">
            Cancel
          </button>
          <button
            onClick={() => {
              const selectedDocs = availableDocuments.filter((doc) => selectedDocuments.includes(doc.id));
              const newDocs = selectedDocs.map((doc) => ({
                id: doc.id,
                name: doc.name,
                size: parseFileSize(doc.size),
                file: null,
                documentId: doc.id,
              }));
              onAttach(newDocs);
              onClose();
            }}
            disabled={selectedDocuments.length === 0}
            className="px-8 py-2.5 bg-[#3b82f6] hover:bg-[#2563eb] disabled:bg-slate-200 disabled:cursor-not-allowed text-white rounded-lg text-[13px] font-extrabold shadow-lg shadow-blue-500/20 transition-all active:scale-95"
          >
            Attach {selectedDocuments.length > 0 ? `(${selectedDocuments.length})` : ""}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
