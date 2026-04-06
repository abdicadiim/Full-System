import React, { useMemo, useState } from "react";
import { Check, ChevronDown, RefreshCw, Search } from "lucide-react";
import { Country } from "country-state-city";
import { CustomerFormData } from "./NewCustomer.constants";
import { countryData } from "./countriesData";
import { getStatesByCountryName } from "./NewCustomer.utils";
import PhonePrefixDropdown from "./PhonePrefixDropdown";

type Props = {
  formData: CustomerFormData;
  setFormData: React.Dispatch<React.SetStateAction<CustomerFormData>>;
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
};

type DropdownKey = "billingCountry" | "shippingCountry" | "billingState" | "shippingState" | null;
const labelClass = "text-[13px] font-medium text-gray-700";

type PhonePrefixField = "billingPhonePrefix" | "shippingPhonePrefix";
const countryPlaceholder = "Select or type to add";

export default function AddressSection({ formData, setFormData, handleChange }: Props) {
  const [openDropdown, setOpenDropdown] = useState<DropdownKey>(null);
  const [openPhoneDropdown, setOpenPhoneDropdown] = useState<PhonePrefixField | null>(null);
  const [billingCountrySearch, setBillingCountrySearch] = useState("");
  const [shippingCountrySearch, setShippingCountrySearch] = useState("");
  const [billingStateSearch, setBillingStateSearch] = useState("");
  const [shippingStateSearch, setShippingStateSearch] = useState("");

  const allCountryNames = useMemo(() => {
    const libraryNames = Country.getAllCountries().map((country) => country.name);
    return Array.from(new Set([...libraryNames, ...Object.keys(countryData)])).sort((a, b) => a.localeCompare(b));
  }, []);

  const getCountryStates = (countryName: string) => getStatesByCountryName(countryName, countryData);

  const filteredCountries = (query: string) => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return allCountryNames;
    return allCountryNames.filter((country) => country.toLowerCase().includes(normalized));
  };

  const handlePhoneNumberChange =
    (field: "billingPhone" | "shippingPhone") =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const digitsOnly = e.target.value.replace(/\D/g, "");
      setFormData((prev) => ({
        ...prev,
        [field]: digitsOnly,
      }));
    };

  const handleNumericOnlyChange =
    (field: "billingFax" | "shippingFax") =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const digitsOnly = e.target.value.replace(/\D/g, "");
      setFormData((prev) => ({
        ...prev,
        [field]: digitsOnly,
      }));
    };

  const handleCopyBillingAddress = () => {
    setFormData((prev) => ({
      ...prev,
      shippingAttention: prev.billingAttention,
      shippingCountry: prev.billingCountry,
      shippingStreet1: prev.billingStreet1,
      shippingStreet2: prev.billingStreet2,
      shippingCity: prev.billingCity,
      shippingState: prev.billingState,
      shippingZipCode: prev.billingZipCode,
      shippingPhonePrefix: prev.billingPhonePrefix || "+252",
      shippingPhone: prev.billingPhone,
      shippingFax: prev.billingFax,
    }));
  };

  const openCountryDropdown = (field: "billingCountry" | "shippingCountry") => {
    if (field === "billingCountry") {
      setBillingCountrySearch("");
      setOpenDropdown((prev) => (prev === field ? null : field));
      return;
    }
    setShippingCountrySearch("");
    setOpenDropdown((prev) => (prev === field ? null : field));
  };

  const openStateDropdown = (field: "billingState" | "shippingState") => {
    if (field === "billingState") {
      setBillingStateSearch("");
      setOpenDropdown((prev) => (prev === field ? null : field));
      return;
    }
    setShippingStateSearch("");
    setOpenDropdown((prev) => (prev === field ? null : field));
  };

  const clearAddressSearches = () => {
    setBillingCountrySearch("");
    setShippingCountrySearch("");
    setBillingStateSearch("");
    setShippingStateSearch("");
  };

  const closeAddressDropdowns = () => {
    setOpenDropdown(null);
    clearAddressSearches();
  };

  const renderPhoneField = (prefixField: PhonePrefixField, phoneField: "billingPhone" | "shippingPhone") => (
    <div className="flex w-full max-w-sm items-center border border-gray-300 rounded bg-white">
      <PhonePrefixDropdown
        value={formData[prefixField] || "+252"}
        onChange={(nextValue) => {
          setFormData((prev) => ({
            ...prev,
            [prefixField]: nextValue,
          }));
        }}
        isOpen={openPhoneDropdown === prefixField}
        onToggle={() => {
          setOpenPhoneDropdown((prev) => (prev === prefixField ? null : prefixField));
        }}
        onClose={() => setOpenPhoneDropdown(null)}
      />
      <input
        type="text"
        name={phoneField}
        value={formData[phoneField]}
        onChange={handlePhoneNumberChange(phoneField)}
        inputMode="numeric"
        pattern="[0-9]*"
        placeholder="Enter phone"
        className="flex-1 px-3 py-1.5 text-[13px] text-gray-700 outline-none bg-transparent"
      />
    </div>
  );

  const renderCountryDropdown = (
    field: "billingCountry" | "shippingCountry",
    value: string,
    onSelect: (country: string) => void,
  ) => {
    const isOpen = openDropdown === field;
    const searchValue = field === "billingCountry" ? billingCountrySearch : shippingCountrySearch;
    const setSearchValue = field === "billingCountry" ? setBillingCountrySearch : setShippingCountrySearch;
    return (
      <div className="relative">
        <button
          type="button"
          onClick={() => {
            openCountryDropdown(field);
          }}
          className="w-full px-3 py-1.5 border border-gray-300 rounded text-[13px] text-gray-700 bg-white flex items-center justify-between hover:border-gray-400 focus:outline-none focus:ring-1 focus:ring-[#156372] focus:border-[#156372]"
        >
          <span>{value || countryPlaceholder}</span>
          <ChevronDown size={14} className={`text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
        </button>

        {isOpen && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-md shadow-lg z-50 max-h-60 overflow-hidden">
            <div className="flex items-center gap-2 p-2 border-b border-gray-200">
              <Search size={16} className="text-gray-400 flex-shrink-0" />
              <input
                type="text"
                placeholder="Search"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                className="flex-1 border-none outline-none text-sm text-gray-700"
                autoFocus
              />
            </div>
            <div className="max-h-48 overflow-y-auto">
              {filteredCountries(searchValue).length > 0 ? (
                filteredCountries(searchValue).map((country) => (
                  <div
                    key={country}
                    onClick={() => {
                      onSelect(country);
                      clearAddressSearches();
                      const states = getCountryStates(country);
                      setOpenDropdown(null);
                      if (states.length > 0) {
                        if (field === "billingCountry") {
                          setBillingStateSearch("");
                        } else {
                          setShippingStateSearch("");
                        }
                      }
                    }}
                    className={`px-3 py-2 text-sm cursor-pointer flex items-center justify-between hover:bg-gray-100 ${
                      value === country ? "bg-blue-50 text-blue-600" : "text-gray-700"
                    }`}
                  >
                    <span>{country}</span>
                    {value === country && <Check size={16} className="text-blue-600" />}
                  </div>
                ))
              ) : (
                <div className="px-3 py-2 text-sm text-gray-500">No countries found</div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderStateField = (
    countryName: string,
    value: string,
    onSelect: (state: string) => void,
    field: "billingState" | "shippingState",
  ) => {
    const states = getCountryStates(countryName);
    const isOpen = openDropdown === field;
    const searchValue = field === "billingState" ? billingStateSearch : shippingStateSearch;
    const setSearchValue = field === "billingState" ? setBillingStateSearch : setShippingStateSearch;

    if (states.length === 0) {
      return (
        <input
          type="text"
          value={value}
          onChange={(e) => onSelect(e.target.value)}
          placeholder="Enter state"
          className="w-full px-3 py-1.5 border border-gray-300 rounded text-[13px] text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#156372] focus:border-[#156372]"
        />
      );
    }

    return (
      <div className="relative">
        <button
          type="button"
          onClick={() => {
            openStateDropdown(field);
          }}
          className="w-full px-3 py-1.5 border border-gray-300 rounded text-[13px] text-gray-700 bg-white flex items-center justify-between hover:border-gray-400 focus:outline-none focus:ring-1 focus:ring-[#156372] focus:border-[#156372]"
        >
          <span>{value || "Select state"}</span>
          <ChevronDown size={14} className={`text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
        </button>

        {isOpen && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-md shadow-lg z-50 max-h-60 overflow-hidden">
            <div className="flex items-center gap-2 p-2 border-b border-gray-200">
              <Search size={16} className="text-gray-400 flex-shrink-0" />
              <input
                type="text"
                placeholder="Search"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                className="flex-1 border-none outline-none text-sm text-gray-700"
                autoFocus
              />
            </div>
            <div className="max-h-48 overflow-y-auto">
              {states
                .filter((state) => state.toLowerCase().includes(searchValue.trim().toLowerCase()))
                .map((state) => (
                  <div
                    key={state}
                    onClick={() => {
                      onSelect(state);
                      closeAddressDropdowns();
                    }}
                    className={`px-3 py-2 text-sm cursor-pointer flex items-center justify-between hover:bg-gray-100 ${
                      value === state ? "bg-blue-50 text-blue-600" : "text-gray-700"
                    }`}
                  >
                    <span>{state}</span>
                    {value === state && <Check size={16} className="text-blue-600" />}
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="mt-6 pb-16 pl-0 sm:pl-2">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <h3 className="text-[15px] font-semibold text-gray-800 mb-6">Billing Address</h3>

          <div className="grid grid-cols-1 md:grid-cols-[128px_1fr] gap-2 items-center">
            <label className={labelClass}>Attention</label>
            <div className="w-full max-w-sm">
              <input
                type="text"
                name="billingAttention"
                value={formData.billingAttention}
                onChange={handleChange}
                placeholder="Enter attention"
                className="w-full px-3 py-1.5 border border-gray-300 rounded text-[13px] text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#156372] focus:border-[#156372]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[128px_1fr] gap-2 items-center">
            <label className={labelClass}>Country/Region</label>
            <div className="w-full max-w-sm">
              {renderCountryDropdown("billingCountry", formData.billingCountry, (country) => {
                const states = getCountryStates(country);
                setFormData((prev) => ({ ...prev, billingCountry: country, billingState: states[0] || "" }));
                clearAddressSearches();
                setOpenDropdown(null);
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[128px_1fr] gap-2 items-start">
            <label className={labelClass}>Address</label>
            <div className="w-full max-w-sm space-y-2">
              <input
                type="text"
                name="billingStreet1"
                value={formData.billingStreet1}
                onChange={handleChange}
                placeholder="Street 1"
                className="w-full px-3 py-1.5 border border-gray-300 rounded text-[13px] text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#156372] focus:border-[#156372]"
              />
              <input
                type="text"
                name="billingStreet2"
                value={formData.billingStreet2}
                onChange={handleChange}
                placeholder="Street 2"
                className="w-full px-3 py-1.5 border border-gray-300 rounded text-[13px] text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#156372] focus:border-[#156372]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[128px_1fr] gap-2 items-center">
            <label className={labelClass}>City</label>
            <div className="w-full max-w-sm">
              <input
                type="text"
                name="billingCity"
                value={formData.billingCity}
                onChange={handleChange}
                placeholder="Enter city"
                className="w-full px-3 py-1.5 border border-gray-300 rounded text-[13px] text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#156372] focus:border-[#156372]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[128px_1fr] gap-2 items-center">
            <label className={labelClass}>State</label>
            <div className="w-full max-w-sm">
              {renderStateField(formData.billingCountry, formData.billingState, (state) => {
                setFormData((prev) => ({ ...prev, billingState: state }));
              }, "billingState")}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[128px_1fr] gap-2 items-center">
            <label className={labelClass}>ZIP Code</label>
            <div className="w-full max-w-sm">
              <input
                type="text"
                name="billingZipCode"
                value={formData.billingZipCode}
                onChange={handleChange}
                placeholder="Enter ZIP code"
                className="w-full px-3 py-1.5 border border-gray-300 rounded text-[13px] text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#156372] focus:border-[#156372]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[128px_1fr] gap-2 items-center">
            <label className={labelClass}>Phone</label>
            {renderPhoneField("billingPhonePrefix", "billingPhone")}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[128px_1fr] gap-2 items-center">
            <label className={labelClass}>Fax Number</label>
            <div className="w-full max-w-sm">
              <input
                type="text"
                name="billingFax"
                value={formData.billingFax}
                onChange={handleNumericOnlyChange("billingFax")}
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="Enter fax number"
                className="w-full px-3 py-1.5 border border-gray-300 rounded text-[13px] text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#156372] focus:border-[#156372]"
              />
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-[15px] font-semibold text-gray-800">Shipping Address</h3>
            <button
              type="button"
              onClick={handleCopyBillingAddress}
              className="text-[12px] text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
            >
              <span className="opacity-70">(</span>
              <RefreshCw size={10} className="mr-0.5" />
              Copy billing address
              <span className="opacity-70">)</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[128px_1fr] gap-2 items-center">
            <label className={labelClass}>Attention</label>
            <div className="w-full max-w-sm">
              <input
                type="text"
                name="shippingAttention"
                value={formData.shippingAttention}
                onChange={handleChange}
                placeholder="Enter attention"
                className="w-full px-3 py-1.5 border border-gray-300 rounded text-[13px] text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#156372] focus:border-[#156372]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[128px_1fr] gap-2 items-center">
            <label className={labelClass}>Country/Region</label>
            <div className="w-full max-w-sm">
              {renderCountryDropdown("shippingCountry", formData.shippingCountry, (country) => {
                const states = getCountryStates(country);
                setFormData((prev) => ({ ...prev, shippingCountry: country, shippingState: states[0] || "" }));
                clearAddressSearches();
                setOpenDropdown(null);
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[128px_1fr] gap-2 items-start">
            <label className={labelClass}>Address</label>
            <div className="w-full max-w-sm space-y-2">
              <input
                type="text"
                name="shippingStreet1"
                value={formData.shippingStreet1}
                onChange={handleChange}
                placeholder="Street 1"
                className="w-full px-3 py-1.5 border border-gray-300 rounded text-[13px] text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#156372] focus:border-[#156372]"
              />
              <input
                type="text"
                name="shippingStreet2"
                value={formData.shippingStreet2}
                onChange={handleChange}
                placeholder="Street 2"
                className="w-full px-3 py-1.5 border border-gray-300 rounded text-[13px] text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#156372] focus:border-[#156372]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[128px_1fr] gap-2 items-center">
            <label className={labelClass}>City</label>
            <div className="w-full max-w-sm">
              <input
                type="text"
                name="shippingCity"
                value={formData.shippingCity}
                onChange={handleChange}
                placeholder="Enter city"
                className="w-full px-3 py-1.5 border border-gray-300 rounded text-[13px] text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#156372] focus:border-[#156372]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[128px_1fr] gap-2 items-center">
            <label className={labelClass}>State</label>
            <div className="w-full max-w-sm">
              {renderStateField(formData.shippingCountry, formData.shippingState, (state) => {
                setFormData((prev) => ({ ...prev, shippingState: state }));
              }, "shippingState")}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[128px_1fr] gap-2 items-center">
            <label className={labelClass}>ZIP Code</label>
            <div className="w-full max-w-sm">
              <input
                type="text"
                name="shippingZipCode"
                value={formData.shippingZipCode}
                onChange={handleChange}
                placeholder="Enter ZIP code"
                className="w-full px-3 py-1.5 border border-gray-300 rounded text-[13px] text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#156372] focus:border-[#156372]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[128px_1fr] gap-2 items-center">
            <label className={labelClass}>Phone</label>
            {renderPhoneField("shippingPhonePrefix", "shippingPhone")}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[128px_1fr] gap-2 items-center">
            <label className={labelClass}>Fax Number</label>
            <div className="w-full max-w-sm">
              <input
                type="text"
                name="shippingFax"
                value={formData.shippingFax}
                onChange={handleNumericOnlyChange("shippingFax")}
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="Enter fax number"
                className="w-full px-3 py-1.5 border border-gray-300 rounded text-[13px] text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#156372] focus:border-[#156372]"
              />
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}

