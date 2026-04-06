import React, { useState } from "react";
import { MoreVertical, Plus, X, ChevronDown } from "lucide-react";
import { createDefaultContactPerson, CustomerFormData } from "./NewCustomer.constants";
import PhonePrefixDropdown from "./PhonePrefixDropdown";

type Props = {
  formData: CustomerFormData;
  setFormData: React.Dispatch<React.SetStateAction<CustomerFormData>>;
  setErrors?: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  errors?: Record<string, string>;
};

type OpenDropdown = { id: number; type: "work" | "mobile" } | null;

const updateContact = (
  setFormData: React.Dispatch<React.SetStateAction<CustomerFormData>>,
  id: number,
  patch: Record<string, any>,
) => {
  setFormData((prev) => ({
    ...prev,
    contactPersons: prev.contactPersons.map((cp: any) => (cp.id === id ? { ...cp, ...patch } : cp)),
  }));
};

const handleNumericContactPhoneChange =
  (
    setFormData: React.Dispatch<React.SetStateAction<CustomerFormData>>,
    id: number,
    field: "workPhone" | "mobile",
  ) =>
  (e: React.ChangeEvent<HTMLInputElement>) => {
    const digitsOnly = e.target.value.replace(/\D/g, "");
    updateContact(setFormData, id, { [field]: digitsOnly });
  };

const phoneFieldWrapper = "flex h-8 w-full items-center overflow-hidden rounded border border-gray-300 bg-white focus-within:border-[#156372] focus-within:ring-1 focus-within:ring-[#156372]";

// Flexible widths so the row can use the available page space cleanly
const compactGridTemplate = "110px 140px 140px 260px 180px 180px 72px";
const extendedGridTemplate =
  "110px 140px 140px 260px 180px 180px 190px 170px 170px 72px";

export default function ContactPersonsSection({ formData, setFormData, setErrors, errors = {} }: Props) {
  const [expandedContactRowId, setExpandedContactRowId] = useState<number | null>(null);
  const [openContactDropdown, setOpenContactDropdown] = useState<OpenDropdown>(null);
  const showExtendedContactColumns = expandedContactRowId !== null;

  const addContact = () => {
    setFormData((prev) => ({
      ...prev,
      contactPersons: [...prev.contactPersons, createDefaultContactPerson()],
    }));
  };

  const removeContact = (id: number) => {
    setFormData((prev) => ({
      ...prev,
      contactPersons: prev.contactPersons.filter((cp: any) => cp.id !== id),
    }));
  };

  const getContactEmailError = (contact: any, index: number) =>
    errors[`contactPersons.${contact?.id ?? index}.email`] || "";

  const clearContactEmailError = (contact: any, index: number) => {
    if (!setErrors) return;
    const key = `contactPersons.${contact?.id ?? index}.email`;
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const renderPrefixPicker = (contact: any, type: "work" | "mobile", prefixField: "workPhonePrefix" | "mobilePrefix") => {
    const isOpen = openContactDropdown?.id === contact.id && openContactDropdown?.type === type;
    return (
      <PhonePrefixDropdown
        value={contact[prefixField] || "+252"}
        isOpen={isOpen}
        onToggle={() => setOpenContactDropdown(isOpen ? null : { id: contact.id, type })}
        onClose={() => setOpenContactDropdown(null)}
        onChange={(value) => updateContact(setFormData, contact.id, { [prefixField]: value })}
        buttonWidthClassName="w-[60px] border-r border-gray-200"
        menuWidthClassName="w-[220px]"
      />
    );
  };

  return (
    <div className="mt-6 flex w-full flex-col pr-4">
      <div
        className={
          showExtendedContactColumns
            ? "min-w-[1280px] w-full bg-white"
            : "min-w-[980px] w-max bg-white"
        }
      >
        {/* Header */}
        <div
          className="grid border-b border-gray-200 bg-white divide-x divide-gray-200"
          style={{ gridTemplateColumns: showExtendedContactColumns ? extendedGridTemplate : compactGridTemplate }}
        >
          {["Salutation", "First Name", "Last Name", "Email Address", "Work Phone", "Mobile"].map((h) => (
            <div key={h} className="px-2 py-2 text-[11px] font-semibold text-gray-600 uppercase tracking-tight whitespace-nowrap">
              {h}
            </div>
          ))}
          {showExtendedContactColumns && (
            <>
              <div className="px-2 py-2 text-[11px] font-semibold text-gray-600 uppercase tracking-tight whitespace-nowrap">
                Skype Name/Number
              </div>
              <div className="px-2 py-2 text-[11px] font-semibold text-gray-600 uppercase tracking-tight whitespace-nowrap">
                Designation
              </div>
              <div className="px-2 py-2 text-[11px] font-semibold text-gray-600 uppercase tracking-tight whitespace-nowrap">
                Department
              </div>
            </>
          )}
          <div className="px-0 py-2" />
        </div>

        {/* Rows */}
        {formData.contactPersons.map((contact: any, index: number) => (
          (() => {
            const isExpanded = expandedContactRowId === contact.id;
            const contactEmailError = getContactEmailError(contact, index);
            return (
          <div
            key={contact.id}
            className="grid border-b border-gray-200 last:border-b-0 divide-x divide-gray-200 group hover:bg-gray-50/50"
            style={{ gridTemplateColumns: showExtendedContactColumns ? extendedGridTemplate : compactGridTemplate }}
          >
            <div className="p-0.5 flex items-center">
              <div className="relative w-full">
                <select
                  value={contact.salutation}
                  onChange={(e) => updateContact(setFormData, contact.id, { salutation: e.target.value })}
                  className="w-full h-8 pl-2 pr-6 border border-gray-300 rounded text-[12px] appearance-none focus:outline-none focus:ring-1 focus:ring-[#156372]"
                >
                  <option value=""></option>
                  <option value="Mr.">Mr.</option>
                  <option value="Mrs.">Mrs.</option>
                </select>
                <ChevronDown className="absolute right-1.5 top-2 text-gray-400 pointer-events-none" size={14} />
              </div>
            </div>

            <div className="p-0.5 flex items-center">
              <input
                type="text"
                value={contact.firstName}
                onChange={(e) => updateContact(setFormData, contact.id, { firstName: e.target.value })}
                className="w-full h-8 px-2 border border-gray-300 rounded text-[12px] focus:ring-1 focus:ring-[#156372] outline-none"
              />
            </div>

            <div className="p-0.5 flex items-center">
              <input
                type="text"
                value={contact.lastName}
                onChange={(e) => updateContact(setFormData, contact.id, { lastName: e.target.value })}
                className="w-full h-8 px-2 border border-gray-300 rounded text-[12px] focus:ring-1 focus:ring-[#156372] outline-none"
              />
            </div>

            <div className="p-0.5 flex items-center">
                <input
                  type="email"
                  value={contact.email}
                  onChange={(e) => {
                    updateContact(setFormData, contact.id, { email: e.target.value });
                    clearContactEmailError(contact, index);
                  }}
                  aria-invalid={Boolean(contactEmailError)}
                  title={contactEmailError || ""}
                className={`w-full h-8 px-2 border rounded text-[12px] outline-none focus:ring-1 ${
                  contactEmailError
                    ? "border-red-500 bg-red-50 focus:ring-red-500"
                    : "border-gray-300 focus:ring-[#156372]"
                }`}
              />
            </div>

            <div className="p-0.5 flex items-center">
              <div className={phoneFieldWrapper}>
                {renderPrefixPicker(contact, "work", "workPhonePrefix")}
                <input
                  type="tel"
                  value={contact.workPhone}
                  onChange={handleNumericContactPhoneChange(setFormData, contact.id, "workPhone")}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  className="flex-1 px-2 h-full text-[12px] outline-none bg-transparent"
                />
              </div>
            </div>

            <div className="p-0.5 flex items-center">
              <div className={phoneFieldWrapper}>
                {renderPrefixPicker(contact, "mobile", "mobilePrefix")}
                <input
                  type="tel"
                  value={contact.mobile}
                  onChange={handleNumericContactPhoneChange(setFormData, contact.id, "mobile")}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  className="flex-1 px-2 h-full text-[12px] outline-none bg-transparent"
                />
              </div>
            </div>

            {showExtendedContactColumns && (
              <>
                <div className="p-0.5 flex items-center">
                  <input type="text" className="w-full h-8 px-2 border border-gray-300 rounded text-[12px] focus:ring-1 focus:ring-[#156372] outline-none" />
                </div>
                <div className="p-0.5 flex items-center">
                  <input type="text" className="w-full h-8 px-2 border border-gray-300 rounded text-[12px] focus:ring-1 focus:ring-[#156372] outline-none" />
                </div>
                <div className="p-0.5 flex items-center">
                  <input type="text" className="w-full h-8 px-2 border border-gray-300 rounded text-[12px] focus:ring-1 focus:ring-[#156372] outline-none" />
                </div>
              </>
            )}

            <div className="p-0.5 flex items-center justify-end gap-1.5 pr-1">
              <button
                type="button"
                onClick={() => setExpandedContactRowId((prev) => (prev === contact.id ? null : contact.id))}
                className="flex h-5 w-5 items-center justify-center rounded-md border border-transparent text-gray-500 hover:bg-gray-100"
                aria-label={isExpanded ? "Hide contact row details" : "Show more fields"}
                title={isExpanded ? "Hide details" : "Show more fields"}
              >
                <MoreVertical size={16} />
              </button>
              <button
                type="button"
                onClick={() => removeContact(contact.id)}
                className="flex h-5 w-5 items-center justify-center rounded-full border border-red-200 bg-white text-red-500 shadow-sm hover:bg-red-50"
                aria-label="Remove contact row"
                title="Remove"
              >
                <X size={12} strokeWidth={3} />
              </button>
            </div>
          </div>
            );
          })()
        ))}
      </div>

      <div className="pt-4">
        <button
          type="button"
          onClick={addContact}
          className="inline-flex items-center gap-1.5 rounded-md border border-transparent bg-[#f5f7fb] px-3 py-1.5 text-[13px] font-medium text-[#156372] shadow-sm transition-colors hover:bg-[#edf2f7]"
        >
          <Plus size={14} className="text-[#4f83ff]" />
          Add Contact Person
        </button>
      </div>
    </div>
  );
}
