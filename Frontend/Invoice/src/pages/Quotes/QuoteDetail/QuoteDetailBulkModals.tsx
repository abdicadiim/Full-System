import React from "react";
import { Send, X } from "lucide-react";

type Props = {
  isBulkUpdateModalOpen: boolean;
  setIsBulkUpdateModalOpen: (value: boolean) => void;
  isMarkAsSentModalOpen: boolean;
  setIsMarkAsSentModalOpen: (value: boolean) => void;
  isDeleteModalOpen: boolean;
  setIsDeleteModalOpen: (value: boolean) => void;
  bulkUpdateField: string;
  setBulkUpdateField: (value: string) => void;
  bulkUpdateValue: string;
  setBulkUpdateValue: (value: string) => void;
  isBulkFieldDropdownOpen: boolean;
  setIsBulkFieldDropdownOpen: (value: boolean) => void;
  bulkFieldSearch: string;
  setBulkFieldSearch: (value: string) => void;
  filteredBulkFields: { value: string; label: string }[];
  handleBulkUpdateSubmit: () => void;
  handleConfirmMarkAsSent: () => void;
  handleConfirmDelete: () => void;
};

const QuoteDetailBulkModals = (props: Props) => {
  const {
    isBulkUpdateModalOpen,
    setIsBulkUpdateModalOpen,
    isMarkAsSentModalOpen,
    setIsMarkAsSentModalOpen,
    isDeleteModalOpen,
    setIsDeleteModalOpen,
    bulkUpdateField,
    setBulkUpdateField,
    bulkUpdateValue,
    setBulkUpdateValue,
    isBulkFieldDropdownOpen,
    setIsBulkFieldDropdownOpen,
    bulkFieldSearch,
    setBulkFieldSearch,
    filteredBulkFields,
    handleBulkUpdateSubmit,
    handleConfirmMarkAsSent,
    handleConfirmDelete,
  } = props;

  return (
    <>
      {isBulkUpdateModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center" onClick={() => setIsBulkUpdateModalOpen(false)}>
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Bulk Update</h2>
              <button className="p-2 hover:bg-gray-100 rounded-md text-gray-600 hover:text-gray-900" onClick={() => setIsBulkUpdateModalOpen(false)}><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Field</label>
                <div className="relative bulk-update-field-dropdown-wrapper">
                  <button className="w-full flex items-center justify-between px-4 py-2 border border-gray-300 rounded-md bg-white text-gray-700 text-sm" onClick={() => setIsBulkFieldDropdownOpen(!isBulkFieldDropdownOpen)}>
                    <span>{bulkUpdateField || "Select field"}</span>
                    <span>▾</span>
                  </button>
                  {isBulkFieldDropdownOpen && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50">
                      <div className="p-2 border-b border-gray-200">
                        <input className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" value={bulkFieldSearch} onChange={(e) => setBulkFieldSearch(e.target.value)} placeholder="Search fields..." />
                      </div>
                      <div className="max-h-48 overflow-y-auto">
                        {filteredBulkFields.map((field) => (
                          <div key={field.value} className="px-4 py-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-50" onClick={() => { setBulkUpdateField(field.value); setIsBulkFieldDropdownOpen(false); }}>
                            {field.label}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Value</label>
                <input className="w-full px-4 py-2 border border-gray-300 rounded-md text-sm" value={bulkUpdateValue} onChange={(e) => setBulkUpdateValue(e.target.value)} />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
              <button className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md text-sm font-medium" onClick={() => setIsBulkUpdateModalOpen(false)}>Cancel</button>
              <button className="px-4 py-2 text-white rounded-md text-sm font-medium" style={{ background: "linear-gradient(90deg, #156372 0%, #0D4A52 100%)" }} onClick={handleBulkUpdateSubmit}>Update</button>
            </div>
          </div>
        </div>
      )}

      {isMarkAsSentModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" onClick={() => setIsMarkAsSentModalOpen(false)}>
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex flex-col items-center p-6">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-yellow-100 rounded-full flex items-center justify-center shadow-lg mb-4">
                <Send size={32} className="text-yellow-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Mark selected quotes as sent?</h3>
              <p className="text-sm text-gray-600 text-center">This will update the status of the selected quotes to sent.</p>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 p-4 sm:p-6 border-t border-gray-200 bg-gray-50">
              <button className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md text-sm font-medium" onClick={() => setIsMarkAsSentModalOpen(false)}>Cancel</button>
              <button className="px-4 py-2 text-white rounded-md text-sm font-medium" style={{ background: "linear-gradient(90deg, #156372 0%, #0D4A52 100%)" }} onClick={handleConfirmMarkAsSent}>Confirm</button>
            </div>
          </div>
        </div>
      )}

      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" onClick={() => setIsDeleteModalOpen(false)}>
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-3">
              <div className="h-7 w-7 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center text-[12px] font-bold">!</div>
              <h3 className="text-base font-semibold text-gray-900">Delete selected quotes?</h3>
            </div>
            <div className="px-5 py-4">
              <p className="text-sm text-gray-600">This action cannot be undone.</p>
            </div>
            <div className="flex items-center justify-start gap-2 border-t border-slate-100 px-5 py-3">
              <button className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md text-sm font-medium" onClick={() => setIsDeleteModalOpen(false)}>Cancel</button>
              <button className="px-4 py-2 text-white rounded-md text-sm font-medium" style={{ background: "linear-gradient(90deg, #156372 0%, #0D4A52 100%)" }} onClick={handleConfirmDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default QuoteDetailBulkModals;

