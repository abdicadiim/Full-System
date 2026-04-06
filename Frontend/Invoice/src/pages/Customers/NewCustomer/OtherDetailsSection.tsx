import React, { useMemo, useRef } from "react";
import { ChevronUp, Facebook, File, Globe, Link2, Plus, Upload, X } from "lucide-react";
import { toast } from "react-toastify";
import SearchableDropdown from "../../../components/ui/SearchableDropdown";
import { PaymentTermsDropdown } from "../../../components/PaymentTermsDropdown";
import { MAX_CUSTOMER_DOCUMENTS, CustomerFormData } from "./NewCustomer.constants";
import { isTaxGroupRecord } from "../../settings/organization-settings/taxes-compliance/TAX/storage";

type Props = {
  formData: CustomerFormData;
  errors: Record<string, string>;
  availableTaxes: any[];
  paymentTermsList: any[];
  setFormData: React.Dispatch<React.SetStateAction<CustomerFormData>>;
  setErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  onConfigurePaymentTerms: () => void;
  onOpenTaxModal: () => void;
  showMoreDetails: boolean;
  onToggleMoreDetails: () => void;
};

export default function OtherDetailsSection({
  formData,
  errors,
  availableTaxes,
  paymentTermsList,
  setFormData,
  setErrors,
  handleChange,
  onConfigurePaymentTerms,
  onOpenTaxModal,
  showMoreDetails,
  onToggleMoreDetails,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const taxDropdownGroups = useMemo(() => {
    const rateById = new Map<string, number>();
    const uniqueByValue = (items: Array<{ value: string; label: string }>) =>
      Array.from(new Map(items.map((item) => [item.value, item])).values());

    availableTaxes.forEach((tax) => {
      if (!tax) return;
      const id = String(tax._id || tax.id || "");
      if (!id) return;
      const rate = Number(tax.rate ?? tax.taxRate ?? 0);
      rateById.set(id, Number.isFinite(rate) ? rate : 0);
    });

    const taxItems: Array<{ value: string; label: string }> = [];
    const compoundTaxItems: Array<{ value: string; label: string }> = [];
    const taxGroupItems: Array<{ value: string; label: string }> = [];

    availableTaxes.forEach((tax) => {
      if (!tax || tax.isActive === false) return;

      const id = String(tax._id || tax.id || "");
      if (!id) return;

      const name = String(tax.name || tax.taxName || "").trim();
      if (!name) return;

      const rate = Number(tax.rate ?? tax.taxRate ?? 0);
      const groupTaxIds = Array.isArray(tax.groupTaxes) ? tax.groupTaxes.map((value: any) => String(value)) : [];
      const isGroup =
        isTaxGroupRecord(tax) ||
        tax?.isGroup === true ||
        String(tax?.kind || "").toLowerCase() === "group" ||
        String(tax?.type || "").toLowerCase() === "group" ||
        groupTaxIds.length > 0;

      const computedRate = isGroup
        ? Number(groupTaxIds.reduce((sum: number, taxId: string) => sum + (rateById.get(taxId) || 0), 0).toFixed(2))
        : (Number.isFinite(rate) ? rate : 0);

      const label = `${name} [${computedRate}%]`;
      if (isGroup) {
        taxGroupItems.push({ value: id, label });
      } else if (tax.isCompound) {
        compoundTaxItems.push({ value: id, label });
      } else {
        taxItems.push({ value: id, label });
      }
    });

    return [
      { label: "Tax", options: uniqueByValue(taxItems) },
      { label: "Compound Tax", options: uniqueByValue(compoundTaxItems) },
      { label: "Tax Group", options: uniqueByValue(taxGroupItems) },
    ].filter((group) => group.options.length > 0);
  }, [availableTaxes]);

  const clearError = (key: string) => {
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    if (formData.documents.length + files.length > MAX_CUSTOMER_DOCUMENTS) {
      return void toast.error(`You can upload a maximum of ${MAX_CUSTOMER_DOCUMENTS} files`);
    }
    if (files.some((file) => file.size > 10 * 1024 * 1024)) {
      return void toast.error("Some files exceed 10MB limit. Maximum file size is 10MB.");
    }
    setFormData((prev) => ({
      ...prev,
      documents: [...prev.documents, ...files.map((file) => ({ id: Date.now() + Math.random(), name: file.name, size: file.size, file }))],
    }));
    e.target.value = "";
  };

  const handleRemoveFile = (fileId: any) =>
    setFormData((prev) => ({ ...prev, documents: prev.documents.filter((doc: any) => doc.id !== fileId) }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-4 items-start">
        <label className="text-[13px] font-medium text-gray-700 pt-1.5 flex items-center gap-1">
          Tax Rate
        </label>
        <div className="w-full max-w-md">
          <SearchableDropdown
            value={formData.taxRate}
            groupedOptions={taxDropdownGroups}
            onChange={(val) => {
              setFormData((prev) => ({ ...prev, taxRate: val }));
              clearError("taxRate");
            }}
            onClear={() => {
              setFormData((prev) => ({ ...prev, taxRate: "" }));
              clearError("taxRate");
            }}
            showClear={!!formData.taxRate}
            placeholder="Select a Tax"
            accentColor={errors.taxRate ? "#dc2626" : "#156372"}
            addNewLabel="New Tax"
            onAddNew={onOpenTaxModal}
            inputClassName={`text-[13px] ${errors.taxRate ? "!border-red-500 !bg-red-50" : ""}`}
          />
          {errors.taxRate && <p className="mt-1 text-xs text-red-500 font-medium">{errors.taxRate}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-4 items-start">
        <label className="text-[13px] font-medium text-gray-700 pt-1">TDS</label>
        <div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              name="isTdsRegistered"
              checked={!!formData.isTdsRegistered}
              onChange={handleChange}
              className="w-4 h-4 accent-[#156372] border-gray-300 rounded focus:ring-[#156372] cursor-pointer"
            />
            <span className="text-[13px] text-gray-700">Enable TDS for this Customer</span>
          </label>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-4 items-center">
        <label className="text-[13px] font-medium text-gray-700">Company ID</label>
        <div className="w-full max-w-md">
          <input
            type="text"
            name="companyId"
            value={formData.companyId}
            onChange={handleChange}
            className="w-full px-3 py-1.5 border border-gray-300 rounded text-[13px] text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#156372] focus:border-[#156372] hover:border-gray-400 transition-colors"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-4 items-center">
        <label className="text-[13px] font-medium text-gray-700">Payment Terms</label>
        <div className="w-full max-w-md">
          <PaymentTermsDropdown
            value={formData.paymentTerms}
            onChange={(value) => setFormData((prev) => ({ ...prev, paymentTerms: value }))}
            onConfigureTerms={onConfigurePaymentTerms}
            customTerms={paymentTermsList}
            openDirection="up"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-4 items-start">
        <label className="text-[13px] font-medium text-gray-700 flex items-center gap-1 pt-1">
          Enable Portal?
        </label>
        <div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              name="enablePortal"
              checked={formData.enablePortal}
              onChange={handleChange}
              className="w-4 h-4 accent-[#156372] border-gray-300 rounded focus:ring-[#156372] cursor-pointer"
            />
            <span className="text-[13px] text-gray-700">Allow portal access for this customer</span>
          </label>
          {errors.enablePortal && <p className="mt-1 text-xs text-red-500 font-medium">{errors.enablePortal}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-4 items-start">
        <label className="text-[13px] font-medium text-gray-700 pt-2">Documents</label>
        <div className="w-full max-w-md">
          <input ref={fileInputRef} type="file" onChange={handleFileUpload} multiple style={{ display: "none" }} accept="*/*" />
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-600 shadow-sm transition-colors hover:border-gray-400 hover:bg-gray-50"
            >
              <Upload size={16} className="text-gray-400" />
              Upload File
            </button>
            {formData.documents.length > 0 && (
              <div className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-2 py-1 text-[12px] font-semibold text-white shadow-sm">
                <Link2 size={14} className="text-white" />
                <span>{formData.documents.length}</span>
              </div>
            )}
          </div>
          <p className="mt-1.5 text-[11px] text-gray-500">You can upload a maximum of {MAX_CUSTOMER_DOCUMENTS} files, 10MB each</p>
          {formData.documents.length > 0 && (
            <div className="mt-4 space-y-2">
              {formData.documents.map((doc: any) => (
                <div key={doc.id} className="flex items-center gap-3 p-2 bg-gray-50 rounded-md border border-gray-200">
                  <File size={16} className="text-gray-400 flex-shrink-0" />
                  <span className="flex-1 text-xs text-gray-700 truncate">{doc.name}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveFile(doc.id)}
                    className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-4">
        <div className="md:col-span-2">
          <button
            type="button"
            onClick={onToggleMoreDetails}
            className="inline-flex items-center gap-1.5 text-blue-600 text-sm font-medium hover:underline transition-all"
          >
            {showMoreDetails ? (
              <>
                Hide more details <ChevronUp size={14} />
              </>
            ) : (
              <>
                Add more details <Plus size={14} />
              </>
            )}
          </button>
        </div>
      </div>

      {showMoreDetails && (
        <div className="space-y-6 pt-6 border-t border-gray-100 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-4 items-center">
            <label className="text-[13px] font-medium text-gray-700">Website URL</label>
            <div className="w-full max-w-md flex">
              <div className="flex items-center justify-center px-3 py-1.5 border border-r-0 border-gray-300 rounded-l bg-gray-50 text-gray-500 min-w-[44px]">
                <Globe size={16} className="text-gray-500" />
              </div>
              <input
                type="text"
                name="websiteUrl"
                value={formData.websiteUrl}
                onChange={handleChange}
                placeholder="ex: www.zylker.com"
                className="flex-1 px-3 py-1.5 border border-gray-300 rounded-r text-[13px] text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#156372] focus:border-[#156372] hover:border-gray-400 transition-colors"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-4 items-center">
            <label className="text-[13px] font-medium text-gray-700">Department</label>
            <div className="w-full max-w-md">
              <input
                type="text"
                name="department"
                value={formData.department}
                onChange={handleChange}
                className="w-full px-3 py-1.5 border border-gray-300 rounded text-[13px] text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#156372] focus:border-[#156372]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-4 items-center">
            <label className="text-[13px] font-medium text-gray-700">Designation</label>
            <div className="w-full max-w-md">
              <input
                type="text"
                name="designation"
                value={formData.designation}
                onChange={handleChange}
                className="w-full px-3 py-1.5 border border-gray-300 rounded text-[13px] text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#156372] focus:border-[#156372]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-4 items-center">
            <label className="text-[13px] font-medium text-gray-700">X</label>
            <div className="w-full max-w-md flex">
              <div className="flex items-center justify-center px-3 py-1.5 border border-r-0 border-gray-300 rounded-l bg-white text-gray-900 min-w-[44px]">
                <span className="text-[14px] font-semibold leading-none select-none">X</span>
              </div>
              <input
                type="text"
                name="xHandle"
                value={formData.xHandle}
                onChange={handleChange}
                maxLength={100}
                className="flex-1 px-3 py-1.5 border border-gray-300 rounded-r text-[13px] text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#156372] focus:border-[#156372]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-4 items-center">
            <label className="text-[13px] font-medium text-gray-700">Skype Name/Number</label>
            <div className="w-full max-w-md flex">
              <div className="flex items-center justify-center px-3 py-1.5 border border-r-0 border-gray-300 rounded-l bg-white min-w-[44px]">
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#00aff0] text-white text-[12px] font-bold leading-none select-none">S</span>
              </div>
              <input
                type="text"
                name="skypeName"
                value={formData.skypeName}
                onChange={handleChange}
                className="flex-1 px-3 py-1.5 border border-gray-300 rounded-r text-[13px] text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#156372] focus:border-[#156372]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-4 items-center">
            <label className="text-[13px] font-medium text-gray-700">Facebook</label>
            <div className="w-full max-w-md flex">
              <div className="flex items-center justify-center px-3 py-1.5 border border-r-0 border-gray-300 rounded-l bg-white min-w-[44px]">
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#1877F2] text-white">
                  <Facebook size={14} className="text-white" />
                </span>
              </div>
              <input
                type="text"
                name="facebook"
                value={formData.facebook}
                onChange={handleChange}
                maxLength={100}
                className="flex-1 px-3 py-1.5 border border-gray-300 rounded-r text-[13px] text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#156372] focus:border-[#156372]"
              />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
