import React from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";

type CustomerLinkVendorModalProps = {
  isOpen: boolean;
  customerName: string;
  selectedVendor: any;
  vendorSearch: string;
  vendors: any[];
  isVendorDropdownOpen: boolean;
  vendorDropdownRef: React.RefObject<HTMLDivElement>;
  onClose: () => void;
  onToggleDropdown: () => void;
  onVendorSearchChange: (value: string) => void;
  onSelectVendor: (vendor: any) => void;
  onConfirm: () => void | Promise<void>;
};

const getVendorName = (vendor: any) =>
  vendor?.name ||
  vendor?.formData?.displayName ||
  vendor?.formData?.companyName ||
  vendor?.formData?.vendorName ||
  "";

export default function CustomerLinkVendorModal({
  isOpen,
  customerName,
  selectedVendor,
  vendorSearch,
  vendors,
  isVendorDropdownOpen,
  vendorDropdownRef,
  onClose,
  onToggleDropdown,
  onVendorSearchChange,
  onSelectVendor,
  onConfirm,
}: CustomerLinkVendorModalProps) {
  if (!isOpen) return null;

  const filteredVendors = vendors.filter((vendor) =>
    getVendorName(vendor).toLowerCase().includes(vendorSearch.toLowerCase()),
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Link {customerName || "Customer"} to Vendor</h2>
          <button
            type="button"
            className="flex items-center justify-center w-7 h-7 bg-white border-2 border-blue-600 rounded text-red-500 cursor-pointer hover:bg-red-50 transition-colors"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6">
          <p className="text-sm text-gray-700 mb-6 leading-relaxed">
            You&apos;re about to link this customer to a vendor. As a result the customer profile of the
            contact will be linked to the vendor profile of the other contact. This lets you view
            receivables and payables from the overview section.
          </p>

          <div className="relative" ref={vendorDropdownRef}>
            <label className="block text-sm font-medium text-gray-700 mb-2">Choose a vendor to link</label>
            <button
              type="button"
              className="w-full flex items-center justify-between px-4 py-3 border-2 border-gray-200 rounded-lg bg-white text-gray-700 hover:border-blue-500 transition-colors text-left"
              onClick={onToggleDropdown}
            >
              <span className={selectedVendor ? "text-gray-900" : "text-gray-400"}>
                {selectedVendor ? getVendorName(selectedVendor) : "Choose a vendor to link"}
              </span>
              <ChevronDown
                size={16}
                className={`text-gray-400 transition-transform ${isVendorDropdownOpen ? "rotate-180" : ""}`}
              />
            </button>
            {isVendorDropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white border-2 border-gray-200 rounded-xl shadow-xl z-50 max-h-60 overflow-hidden">
                <div className="flex items-center gap-2 p-3 border-b border-gray-200 bg-gray-50">
                  <Search size={16} className="text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search vendors..."
                    value={vendorSearch}
                    onChange={(event) => onVendorSearchChange(event.target.value)}
                    className="flex-1 text-sm bg-transparent focus:outline-none"
                    autoFocus
                  />
                </div>
                <div className="max-h-48 overflow-y-auto">
                  {filteredVendors.map((vendor) => {
                    const vendorName = getVendorName(vendor);
                    const isSelected = selectedVendor?.id === vendor.id;
                    return (
                      <button
                        key={vendor.id}
                        type="button"
                        className={`w-full p-3 cursor-pointer hover:bg-blue-50 flex items-center justify-between transition-colors ${
                          isSelected ? "bg-blue-50 border-l-4 border-blue-600" : ""
                        }`}
                        onClick={() => onSelectVendor(vendor)}
                      >
                        <span className="text-sm font-medium text-gray-900">{vendorName}</span>
                        {isSelected && <Check size={16} className="text-blue-600" />}
                      </button>
                    );
                  })}
                  {filteredVendors.length === 0 && (
                    <div className="p-3 text-sm text-gray-500 text-center">No vendors found</div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-start gap-3 p-6 border-t border-gray-200">
          <button
            type="button"
            className="px-6 py-2 bg-red-600 text-white rounded-md text-sm font-medium cursor-pointer hover:bg-red-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
            onClick={onConfirm}
            disabled={!selectedVendor}
          >
            Link
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
