import React from "react";
import {
  contactStatusOptions,
  gstTreatmentOptions,
  taxRegimeOptions,
  taxTreatmentOptions,
  vatTreatmentOptions,
  CustomerFormData,
} from "./NewCustomer.constants";

type Props = {
  formData: CustomerFormData;
  errors: Record<string, string>;
  setFormData: React.Dispatch<React.SetStateAction<CustomerFormData>>;
  setErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
};

const rowClass = "grid grid-cols-1 md:grid-cols-[200px_1fr] gap-4 items-start";
const labelClass = "text-[13px] font-medium text-gray-700 pt-1";

const fieldClass = (error?: string) =>
  `w-full px-3 py-1.5 border rounded text-[13px] text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#156372] focus:border-[#156372] ${
    error ? "border-red-500 bg-red-50" : "border-gray-300"
  }`;

const selectClass = (error?: string) =>
  `w-full appearance-none px-3 py-1.5 pr-10 border rounded text-[13px] text-gray-700 bg-white focus:outline-none focus:ring-1 focus:ring-[#156372] focus:border-[#156372] ${
    error ? "border-red-500 bg-red-50" : "border-gray-300"
  }`;

const CheckboxRow = ({
  name,
  checked,
  label,
  helper,
  onChange,
  disabled,
}: {
  name: string;
  checked: boolean;
  label: string;
  helper?: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
}) => (
  <label className={`flex items-center gap-2 ${disabled ? "cursor-not-allowed opacity-70" : "cursor-pointer"}`}>
    <input
      name={name}
      type="checkbox"
      checked={checked}
      onChange={onChange}
      disabled={disabled}
      className="w-4 h-4 text-[#156372] border-gray-300 rounded focus:ring-[#156372] disabled:cursor-not-allowed"
    />
    <div className="min-w-0">
      <span className="text-[13px] text-gray-700">{label}</span>
      {helper && <div className="text-[12px] text-gray-500 leading-snug">{helper}</div>}
    </div>
  </label>
);

const FieldRow = ({
  label,
  error,
  help,
  children,
  required = false,
}: {
  label: string;
  error?: string;
  help?: string;
  children: React.ReactNode;
  required?: boolean;
}) => {
  void help;

  return (
    <div className={rowClass}>
      <label className={labelClass}>
        <span className="inline-flex items-center gap-1">
          <span>{label}</span>
          {required && <span className="text-red-500">*</span>}
        </span>
      </label>
      <div className="w-full max-w-md">
        {children}
        {error && <p className="mt-1 text-xs font-medium text-red-500">{error}</p>}
      </div>
    </div>
  );
};

export default function TaxComplianceSection({
  formData,
  errors,
  setFormData,
  setErrors,
  handleChange,
}: Props) {
  const clearError = (key: string) => {
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const setFieldValue = (name: keyof CustomerFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    clearError(String(name));
  };

  return (
    <div className="space-y-8">
      <div className="pt-6 border-t border-gray-100 space-y-4">
        <div className="space-y-1">
          <h3 className="text-[15px] font-semibold text-gray-800">Tax and Compliance</h3>
          <p className="text-[12px] text-gray-500 leading-relaxed max-w-2xl">
            These fields match the regional contact fields exposed by the Zoho Contacts API and stay optional unless
            you are operating in that region or integration.
          </p>
        </div>

        <FieldRow
          label="Status"
          error={errors.status}
          help="Use active or inactive to match the contact record status."
        >
          <select
            name="status"
            value={formData.status}
            onChange={handleChange}
            className={selectClass(errors.status)}
          >
            {contactStatusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </FieldRow>

        <FieldRow
          label="Payment Reminders"
          help="Enable or disable automated payment reminder handling for this contact."
        >
          <CheckboxRow
            name="paymentReminderEnabled"
            checked={Boolean(formData.paymentReminderEnabled)}
            label="Enable payment reminders"
            helper="This mirrors the payment reminder toggle in the contacts API."
            onChange={handleChange}
          />
        </FieldRow>

        <FieldRow
          label="Linked to Zoho CRM"
          help="This value is usually synced from CRM and is shown here for completeness."
        >
          <CheckboxRow
            name="isLinkedWithZohoCrm"
            checked={Boolean(formData.isLinkedWithZohoCrm)}
            label="Contact is linked with Zoho CRM"
            helper="Read-only in this form."
            onChange={handleChange}
            disabled
          />
        </FieldRow>
      </div>

      <div className="space-y-4">
        <h4 className="text-[14px] font-semibold text-gray-800">Regional Tax Fields</h4>

        <FieldRow
          label="VAT Treatment"
          error={errors.vatTreatment}
          help="Used for UK and Avalara-style VAT setups."
        >
          <select
            name="vatTreatment"
            value={formData.vatTreatment}
            onChange={handleChange}
            className={selectClass(errors.vatTreatment)}
          >
            {vatTreatmentOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </FieldRow>

        <FieldRow
          label="VAT Reg No"
          error={errors.vatRegNo}
          help="For UK and Avalara contacts. The API expects a 2 to 12 character registration number."
        >
          <input
            type="text"
            name="vatRegNo"
            value={formData.vatRegNo}
            onChange={handleChange}
            maxLength={12}
            className={fieldClass(errors.vatRegNo)}
            placeholder="VAT registration number"
          />
        </FieldRow>

        <FieldRow
          label="Country Code"
          error={errors.countryCode}
          help="Use a 2-letter country code for UK or Avalara integrations."
        >
          <input
            type="text"
            name="countryCode"
            value={formData.countryCode}
            onChange={(e) => setFieldValue("countryCode", e.target.value.toUpperCase())}
            maxLength={2}
            className={fieldClass(errors.countryCode)}
            placeholder="US"
          />
        </FieldRow>

        <FieldRow
          label="Mexico Tax Treatment"
          error={errors.taxTreatment}
          help="Use this when the contact belongs to a Mexico tax treatment category."
        >
          <select
            name="taxTreatment"
            value={formData.taxTreatment}
            onChange={handleChange}
            className={selectClass(errors.taxTreatment)}
          >
            {taxTreatmentOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </FieldRow>

        <FieldRow
          label="Tax Reg No"
          error={errors.taxRegNo}
          help="Mexico contacts can use their tax registration number or generic RFC."
        >
          <input
            type="text"
            name="taxRegNo"
            value={formData.taxRegNo}
            onChange={handleChange}
            className={fieldClass(errors.taxRegNo)}
            placeholder="Tax registration number"
          />
        </FieldRow>

        <FieldRow
          label="Tax Regime"
          error={errors.taxRegime}
          help="Mexico tax regime from the Zoho API list."
        >
          <select
            name="taxRegime"
            value={formData.taxRegime}
            onChange={handleChange}
            className={selectClass(errors.taxRegime)}
          >
            {taxRegimeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </FieldRow>

        <FieldRow
          label="Legal Name"
          error={errors.legalName}
          help="Use the legal business name for Mexico contacts."
        >
          <input
            type="text"
            name="legalName"
            value={formData.legalName}
            onChange={handleChange}
            maxLength={200}
            className={fieldClass(errors.legalName)}
            placeholder="Legal name"
          />
        </FieldRow>

        <FieldRow
          label="Is TDS Registered"
          help="Mexico-specific flag used by the API."
        >
          <CheckboxRow
            name="isTdsRegistered"
            checked={Boolean(formData.isTdsRegistered)}
            label="Customer is TDS registered"
            helper="If enabled, a TDS tax ID becomes required."
            onChange={handleChange}
          />
        </FieldRow>

        <FieldRow
          label="Place of Contact"
          error={errors.placeOfContact}
          help="India-specific place of contact / supply."
        >
          <input
            type="text"
            name="placeOfContact"
            value={formData.placeOfContact}
            onChange={handleChange}
            className={fieldClass(errors.placeOfContact)}
            placeholder="TN"
          />
        </FieldRow>

        <FieldRow
          label="GST Treatment"
          error={errors.gstTreatment}
          help="Choose the GST status that matches the contact."
        >
          <select
            name="gstTreatment"
            value={formData.gstTreatment}
            onChange={handleChange}
            className={selectClass(errors.gstTreatment)}
          >
            {gstTreatmentOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </FieldRow>

        <FieldRow
          label="GST No"
          error={errors.gstNo}
          help="India GST identification number. The API expects 15 characters."
        >
          <input
            type="text"
            name="gstNo"
            value={formData.gstNo}
            onChange={(e) => setFieldValue("gstNo", e.target.value.toUpperCase())}
            maxLength={15}
            className={fieldClass(errors.gstNo)}
            placeholder="22AAAAA0000A1Z5"
          />
        </FieldRow>

        <FieldRow
          label="TDS Tax ID"
          error={errors.tdsTaxId}
          help="Required when the contact is marked as TDS registered."
        >
          <input
            type="text"
            name="tdsTaxId"
            value={formData.tdsTaxId}
            onChange={handleChange}
            className={fieldClass(errors.tdsTaxId)}
            placeholder="TDS tax ID"
          />
        </FieldRow>

        <FieldRow
          label="Tax Authority Name"
          error={errors.taxAuthorityName}
          help="Used for US and Canada style tax authority setups."
        >
          <input
            type="text"
            name="taxAuthorityName"
            value={formData.taxAuthorityName}
            onChange={handleChange}
            maxLength={200}
            className={fieldClass(errors.taxAuthorityName)}
            placeholder="Tax authority name"
          />
        </FieldRow>

        <FieldRow
          label="Tax Authority ID"
          error={errors.taxAuthorityId}
          help="Used when the tax authority is selected by identifier."
        >
          <input
            type="text"
            name="taxAuthorityId"
            value={formData.taxAuthorityId}
            onChange={handleChange}
            className={fieldClass(errors.taxAuthorityId)}
            placeholder="Tax authority ID"
          />
        </FieldRow>

        <FieldRow
          label="Tax Exemption Code"
          error={errors.taxExemptionCode}
          help="Used by Zoho for exemption tracking."
        >
          <input
            type="text"
            name="taxExemptionCode"
            value={formData.taxExemptionCode}
            onChange={handleChange}
            maxLength={200}
            className={fieldClass(errors.taxExemptionCode)}
            placeholder="Tax exemption code"
          />
        </FieldRow>

        <FieldRow
          label="Tax Exemption ID"
          error={errors.taxExemptionId}
          help="Optional exemption identifier from the tax authority."
        >
          <input
            type="text"
            name="taxExemptionId"
            value={formData.taxExemptionId}
            onChange={handleChange}
            className={fieldClass(errors.taxExemptionId)}
            placeholder="Tax exemption ID"
          />
        </FieldRow>

        <FieldRow
          label="Avalara Exempt No"
          error={errors.avataxExemptNo}
          help="Avalara exemption certificate number."
        >
          <input
            type="text"
            name="avataxExemptNo"
            value={formData.avataxExemptNo}
            onChange={handleChange}
            maxLength={200}
            className={fieldClass(errors.avataxExemptNo)}
            placeholder="Avalara exempt number"
          />
        </FieldRow>

        <FieldRow
          label="Avalara Use Code"
          error={errors.avataxUseCode}
          help="Avalara use code that links customers to a tax rule."
        >
          <input
            type="text"
            name="avataxUseCode"
            value={formData.avataxUseCode}
            onChange={handleChange}
            maxLength={200}
            className={fieldClass(errors.avataxUseCode)}
            placeholder="Avalara use code"
          />
        </FieldRow>
      </div>
    </div>
  );
}
