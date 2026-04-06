import React, { useMemo, useState } from "react";
import { Check, ChevronDown, Mail, Settings, X } from "lucide-react";
import SearchableDropdown from "../../../components/ui/SearchableDropdown";
import { customerLanguageOptions, CustomerFormData } from "./NewCustomer.constants";
import PhonePrefixDropdown from "./PhonePrefixDropdown";
import { MAX_COMPANY_NAME_LENGTH, MAX_CONTACT_NAME_LENGTH, isValidEmail } from "./NewCustomer.validation";

type Props = {
  formData: CustomerFormData;
  errors: Record<string, string>;
  availableCurrencies: any[];
  baseCurrency: any;
  isDisplayNameManuallyEdited: boolean;
  setFormData: React.Dispatch<React.SetStateAction<CustomerFormData>>;
  setErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  setIsDisplayNameManuallyEdited: React.Dispatch<React.SetStateAction<boolean>>;
  setIsCustomerNumberManuallyEdited: React.Dispatch<React.SetStateAction<boolean>>;
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  onOpenCustomerNumberSettings: () => void;
};

export default function CustomerPrimaryInfoSection({
  formData,
  errors,
  availableCurrencies,
  baseCurrency,
  isDisplayNameManuallyEdited,
  setFormData,
  setErrors,
  setIsDisplayNameManuallyEdited,
  setIsCustomerNumberManuallyEdited,
  handleChange,
  onOpenCustomerNumberSettings,
}: Props) {
  const rowClass = "grid grid-cols-1 md:grid-cols-[150px_minmax(0,1fr)] gap-2 items-center";
  const rowStartClass = "grid grid-cols-1 md:grid-cols-[150px_minmax(0,1fr)] gap-2 items-start";

  const currencyDisplay = useMemo(() => {
    const selected =
      availableCurrencies.find((c: any) => c.code === formData.currency) ||
      availableCurrencies.find((c: any) => c.isBaseCurrency) ||
      { code: formData.currency || "USD", name: "United States Dollar" };
    return !baseCurrency || !baseCurrency.code
      ? selected
      : formData.currency === baseCurrency.code
        ? baseCurrency
        : selected;
  }, [availableCurrencies, baseCurrency, formData.currency]);

  const displayNameOptions = useMemo(() => {
    const options = [
      formData.companyName.trim(),
      [formData.firstName.trim(), formData.lastName.trim()].filter(Boolean).join(" "),
      [formData.lastName.trim(), formData.firstName.trim()].filter(Boolean).join(" "),
    ];
    return Array.from(new Set(options.filter(Boolean)));
  }, [formData.companyName, formData.firstName, formData.lastName]);

  const clearError = (key: string) => {
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const handleEmailBlur = () => {
    const trimmedEmail = String(formData.email || "").trim();
    if (trimmedEmail !== formData.email) {
      setFormData((prev) => ({ ...prev, email: trimmedEmail }));
    }
    if (!trimmedEmail) {
      clearError("email");
      return;
    }

    if (!isValidEmail(trimmedEmail)) {
      setErrors((prev) => ({ ...prev, email: "Enter a valid email address." }));
      return;
    }

    clearError("email");
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextValue = e.target.value.replace(/\s/g, "");
    setFormData((prev) => ({ ...prev, email: nextValue }));
    clearError("email");
  };

  const handleNumericPhoneChange =
    (field: "workPhone" | "mobile") =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const rawValue = e.target.value;
      const numericValue = rawValue.replace(/\D/g, "");

      setFormData((prev) => ({
        ...prev,
        [field]: numericValue,
      }));
    };

  const handleNameChange =
    (field: "firstName" | "lastName") =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value.replace(/\d/g, "");
      setFormData((prev) => ({ ...prev, [field]: value }));
      clearError(field);
    };

  const [openPhoneDropdown, setOpenPhoneDropdown] = useState<"workPhonePrefix" | "mobilePrefix" | null>(null);

  return (
    <div className="space-y-6">
      <div className={rowClass}>
        <label className="text-[13px] font-medium text-gray-700 flex items-center gap-1">
          Customer Type
        </label>
        <div className="flex items-center gap-6">
          {["business", "individual"].map((type) => (
            <label key={type} className="flex items-center gap-2 cursor-pointer group">
              <input
                type="radio"
                name="customerType"
                value={type}
                checked={formData.customerType === type}
                onChange={handleChange}
                className="w-4 h-4 accent-[#156372] border-gray-300 focus:ring-[#156372] cursor-pointer"
              />
              <span className="text-[13px] text-gray-700">{type === "business" ? "Business" : "Individual"}</span>
            </label>
          ))}
        </div>
      </div>

      <div className={rowClass}>
        <label className="text-[13px] font-medium text-gray-700">Primary Contact</label>
        <div className="flex gap-2 max-w-xl min-w-0">
          <div className="w-32">
            <SearchableDropdown
              value={formData.salutation}
              onChange={(value) => setFormData((prev) => ({ ...prev, salutation: value }))}
              options={[
                { value: "mr", label: "Mr." },
                { value: "mrs", label: "Mrs." },
                { value: "ms", label: "Ms." },
                { value: "miss", label: "Miss" },
                { value: "dr", label: "Dr." },
              ]}
              placeholder="Salutation"
              accentColor="#156372"
              showSearch={false}
              className="w-full"
              inputClassName="!h-[38px]"
            />
          </div>
          <input
            type="text"
            name="firstName"
            value={formData.firstName}
            onChange={handleNameChange("firstName")}
            placeholder="First Name"
            className="flex-1 min-w-0 px-3 py-1.5 border border-gray-300 rounded text-[13px] text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#156372] focus:border-[#156372]"
          />
          <input
            type="text"
            name="lastName"
            value={formData.lastName}
            onChange={handleNameChange("lastName")}
            placeholder="Last Name"
            className="flex-1 min-w-0 px-3 py-1.5 border border-gray-300 rounded text-[13px] text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#156372] focus:border-[#156372]"
          />
        </div>
      </div>

      <div className={rowStartClass}>
        <label className="text-[13px] font-medium text-gray-700 pt-1">Company Name</label>
        <div className="max-w-md">
          <input
            type="text"
            name="companyName"
            value={formData.companyName}
            onChange={handleChange}
            maxLength={MAX_COMPANY_NAME_LENGTH}
            className={`w-full px-3 py-1.5 border rounded text-[13px] text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#156372] focus:border-[#156372] ${
              errors.companyName ? "border-red-500 bg-red-50" : "border-gray-300"
            }`}
          />
          {errors.companyName && <p className="mt-1 text-xs text-red-500 font-medium">{errors.companyName}</p>}
        </div>
      </div>

      <div className={rowStartClass}>
        <label className="text-[13px] font-medium text-red-600 pt-1">
          Display Name
          <span className="text-red-500">*</span>
        </label>
        <div className="max-w-md">
          <SearchableDropdown
            value={formData.displayName}
            onChange={(value) => {
              setFormData((prev) => ({ ...prev, displayName: value }));
              setIsDisplayNameManuallyEdited(true);
              clearError("displayName");
            }}
            options={displayNameOptions.map((option) => ({ value: option, label: option }))}
            placeholder="Type display name"
            accentColor="#156372"
            showSearch={false}
            className="w-full"
            inputClassName={errors.displayName ? "!border-red-500 !bg-red-50" : ""}
          />
          {errors.displayName && <p className="mt-1 text-xs text-red-500 font-medium">{errors.displayName}</p>}
        </div>
      </div>

      <div className={rowStartClass}>
        <label className="text-[13px] font-medium text-gray-700 flex items-center gap-1 pt-1">
          Currency
        </label>
        <div className="w-full max-w-md">
          <div className="relative">
            <select
              value={currencyDisplay.code}
              disabled
              className={`w-full appearance-none px-3 py-1.5 pr-10 border rounded text-[13px] text-gray-700 bg-white disabled:bg-white disabled:text-gray-700 disabled:cursor-not-allowed disabled:opacity-100 ${
                errors.currency ? "border-red-500 bg-red-50" : "border-gray-300"
              }`}
            >
              <option value={currencyDisplay.code}>
                {currencyDisplay.code}-{` ${currencyDisplay.name || ""}`}
              </option>
            </select>
            <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
          </div>
          <div className={`mt-2 flex items-center gap-1.5 text-[12px] leading-snug ${errors.currency ? "text-red-600" : "text-gray-500"}`}>
            <span>Currency cannot be edited as multi-currency handling is unavailable in Taban Invoice.</span>
          </div>
          {errors.currency && <p className="mt-1 text-xs text-red-500 font-medium">{errors.currency}</p>}
        </div>
      </div>

      {baseCurrency && formData.currency !== baseCurrency.code && (
        <div className={rowClass}>
          <label className="text-sm font-medium text-gray-700">Exchange Rate</label>
          <div className="w-full max-w-md flex items-center gap-2">
            <div className="flex-1">
              <input
                type="number"
                name="exchangeRate"
                value={formData.exchangeRate}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                step="0.0001"
              />
            </div>
            <div className="flex gap-1">
              <button type="button" className="p-2 bg-blue-600 text-white rounded shadow-sm hover:bg-blue-700">
                <Check size={16} />
              </button>
              <button type="button" className="p-2 bg-white border border-gray-300 text-gray-400 rounded shadow-sm hover:bg-gray-50">
                <X size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      <div className={rowStartClass}>
        <label className="text-[13px] font-medium text-gray-700 flex items-center gap-1 pt-1">
          Email Address
        </label>
        <div className="relative max-w-md">
          <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleEmailChange}
            onBlur={handleEmailBlur}
            inputMode="email"
            autoComplete="email"
            spellCheck={false}
            maxLength={254}
            aria-invalid={Boolean(errors.email)}
            className={`w-full pl-9 pr-3 py-1.5 border rounded text-[13px] text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#156372] focus:border-[#156372] ${
              errors.email ? "border-red-500 bg-red-50" : "border-gray-300"
            }`}
          />
          {errors.email && <p className="mt-1 text-xs text-red-500 font-medium">{errors.email}</p>}
        </div>
      </div>

      <div className={rowClass}>
        <label className="text-[13px] font-medium text-red-600">
          Customer Number
          <span className="text-red-500">*</span>
        </label>
        <div className="relative max-w-md">
          <input
            type="text"
            name="customerNumber"
            value={formData.customerNumber}
            onChange={(e) => {
              handleChange(e);
              setIsCustomerNumberManuallyEdited(true);
            }}
            className={`w-full pr-16 px-3 py-1.5 border rounded text-[13px] text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#156372] focus:border-[#156372] ${
              errors.customerNumber ? "border-red-500 bg-red-50" : "border-gray-300"
            }`}
            required
          />
          <Settings
            size={14}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-[#156372] cursor-pointer hover:opacity-80"
            onClick={onOpenCustomerNumberSettings}
          />
          {errors.customerNumber && <p className="mt-1 text-xs text-red-500 font-medium">{errors.customerNumber}</p>}
        </div>
      </div>

      <div className={rowClass}>
        <label className="text-[13px] font-medium text-gray-700">Phone</label>
        <div className="flex flex-wrap gap-4 max-w-xl">
          <div className="flex flex-col gap-1 w-64">
            <div className="flex items-center border border-gray-300 rounded bg-white">
              <PhonePrefixDropdown
                value={formData.workPhonePrefix}
                isOpen={openPhoneDropdown === "workPhonePrefix"}
                onToggle={() => {
                  setOpenPhoneDropdown((prev) => (prev === "workPhonePrefix" ? null : "workPhonePrefix"));
                }}
                onClose={() => setOpenPhoneDropdown(null)}
                onChange={(value) => {
                  setFormData((prev) => ({ ...prev, workPhonePrefix: value }));
                }}
              />
              <input
                type="text"
                name="workPhone"
                value={formData.workPhone}
                onChange={handleNumericPhoneChange("workPhone")}
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="Enter phone"
                className="flex-1 px-3 py-1.5 text-[13px] text-gray-700 outline-none bg-transparent"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1 w-64">
            <div className="flex items-center border border-gray-300 rounded bg-white">
              <PhonePrefixDropdown
                value={formData.mobilePrefix}
                isOpen={openPhoneDropdown === "mobilePrefix"}
                onToggle={() => {
                  setOpenPhoneDropdown((prev) => (prev === "mobilePrefix" ? null : "mobilePrefix"));
                }}
                onClose={() => setOpenPhoneDropdown(null)}
                onChange={(value) => {
                  setFormData((prev) => ({ ...prev, mobilePrefix: value }));
                }}
              />
              <input
                type="text"
                name="mobile"
                value={formData.mobile}
                onChange={handleNumericPhoneChange("mobile")}
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="Enter phone"
                className="flex-1 px-3 py-1.5 text-[13px] text-gray-700 outline-none bg-transparent"
              />
            </div>
          </div>
        </div>
      </div>

      <div className={rowStartClass + " mb-10"}>
        <label className="text-[13px] font-medium text-gray-700 flex items-center gap-1 pt-1.5">Customer Language</label>
        <div className="w-full max-w-md">
          <SearchableDropdown
            value={formData.customerLanguage}
            options={customerLanguageOptions}
            onChange={(value) => setFormData((prev) => ({ ...prev, customerLanguage: value }))}
            placeholder="English"
            accentColor="#156372"
            inputClassName="text-[13px]"
          />
        </div>
      </div>
    </div>
  );
}
