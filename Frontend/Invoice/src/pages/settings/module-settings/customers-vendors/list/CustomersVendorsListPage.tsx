import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Info, ChevronDown, HelpCircle, Loader2 } from "lucide-react";
import { getToken, API_BASE_URL } from "../../../../../services/auth";
import toast from "react-hot-toast";

export default function CustomersVendorsPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("general");
  const [customFields, setCustomFields] = useState([]);
  const customFieldsUsage = customFields.length;
  const maxCustomFields = 59;
  const [customButtons, setCustomButtons] = useState([]);
  const [showNewButtonDropdown, setShowNewButtonDropdown] = useState(false);
  const [contactTypeFilter, setContactTypeFilter] = useState("All");
  const [locationFilter, setLocationFilter] = useState("All");
  const newButtonDropdownRef = useRef(null);
  const [relatedLists, setRelatedLists] = useState([]);
  const [showNewRelatedListDropdown, setShowNewRelatedListDropdown] = useState(false);
  const newRelatedListDropdownRef = useRef(null);
  const [allowDuplicates, setAllowDuplicates] = useState(true);
  const [enableCustomerNumbers, setEnableCustomerNumbers] = useState(false);
  const [customerNumberPrefix, setCustomerNumberPrefix] = useState("CUS-");
  const [customerNumberStart, setCustomerNumberStart] = useState("0001");
  const [enableVendorNumbers, setEnableVendorNumbers] = useState(false);
  const [vendorNumberPrefix, setVendorNumberPrefix] = useState("VEN-");
  const [vendorNumberStart, setVendorNumberStart] = useState("0001");
  const [defaultCustomerType, setDefaultCustomerType] = useState("business");
  const [enableCreditLimit, setEnableCreditLimit] = useState(false);
  const [creditLimitAction, setCreditLimitAction] = useState("warn"); // "restrict" or "warn"
  const [includeSalesOrders, setIncludeSalesOrders] = useState(false);
  const [billingAddressFormat, setBillingAddressFormat] = useState(
    "${CONTACT.CONTACT_DISPLAYNAME}\n${CONTACT.CONTACT_ADDRESS}\n${CONTACT.CONTACT_CITY}\n${CONTACT.CONTACT_CODE} ${CONTACT.CONTACT_STATE}\n${CONTACT.CONTACT_COUNTRY}"
  );
  const [shippingAddressFormat, setShippingAddressFormat] = useState(
    "${CONTACT.CONTACT_ADDRESS}\n${CONTACT.CONTACT_CITY}\n${CONTACT.CONTACT_CODE} ${CONTACT.CONTACT_STATE}\n${CONTACT.CONTACT_COUNTRY}"
  );
  
  const billingTextareaRef = useRef(null);
  const shippingTextareaRef = useRef(null);

  const billingPlaceholders = [
    "${CONTACT.CONTACT_DISPLAYNAME}",
    "${CONTACT.CONTACT_ADDRESS}",
    "${CONTACT.CONTACT_CITY}",
    "${CONTACT.CONTACT_CODE}",
    "${CONTACT.CONTACT_STATE}",
    "${CONTACT.CONTACT_COUNTRY}",
  ];

  const handlePlaceholderInsert = (placeholder, textareaRef, setFormat) => {
    const textarea = textareaRef.current;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const currentValue = textarea.value;
      const newValue = currentValue.substring(0, start) + placeholder + currentValue.substring(end);
      setFormat(newValue);
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + placeholder.length, start + placeholder.length);
      }, 0);
    } else {
      setFormat((prev) => prev + "\n" + placeholder);
    }
  };

  // Load settings from API
  useEffect(() => {
    const loadSettings = async () => {
      try {
        setLoading(true);
        const token = getToken();
        if (!token) {
          toast.error("Please login to access settings");
          return;
        }

        const response = await fetch(`${API_BASE_URL}/settings/customers-vendors`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data) {
            const settings = data.data;
            setAllowDuplicates(settings.allowDuplicates !== undefined ? settings.allowDuplicates : true);
            setEnableCustomerNumbers(settings.enableCustomerNumbers || false);
            setCustomerNumberPrefix(settings.customerNumberPrefix || "CUS-");
            setCustomerNumberStart(settings.customerNumberStart || "0001");
            setEnableVendorNumbers(settings.enableVendorNumbers || false);
            setVendorNumberPrefix(settings.vendorNumberPrefix || "VEN-");
            setVendorNumberStart(settings.vendorNumberStart || "0001");
            setDefaultCustomerType(settings.defaultCustomerType || "business");
            setEnableCreditLimit(settings.enableCreditLimit || false);
            setCreditLimitAction(settings.creditLimitAction || "warn");
            setIncludeSalesOrders(settings.includeSalesOrders || false);
            setBillingAddressFormat(settings.billingAddressFormat || "${CONTACT.CONTACT_DISPLAYNAME}\n${CONTACT.CONTACT_ADDRESS}\n${CONTACT.CONTACT_CITY}\n${CONTACT.CONTACT_CODE} ${CONTACT.CONTACT_STATE}\n${CONTACT.CONTACT_COUNTRY}");
            setShippingAddressFormat(settings.shippingAddressFormat || "${CONTACT.CONTACT_ADDRESS}\n${CONTACT.CONTACT_CITY}\n${CONTACT.CONTACT_CODE} ${CONTACT.CONTACT_STATE}\n${CONTACT.CONTACT_COUNTRY}");
            setCustomFields(settings.customFields || []);
            setCustomButtons(settings.customButtons || []);
            setRelatedLists(settings.relatedLists || []);
          }
        } else {
          console.error('Failed to load settings');
        }
      } catch (error) {
        console.error('Error loading customers & vendors settings:', error);
        toast.error("Failed to load settings");
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, []);

  // Save settings to API
  const handleSave = async () => {
    setSaving(true);
    try {
      const token = getToken();
      if (!token) {
        toast.error("Please login to save settings");
        return;
      }

      const payload = {
        allowDuplicates,
        enableCustomerNumbers,
        customerNumberPrefix,
        customerNumberStart,
        enableVendorNumbers,
        vendorNumberPrefix,
        vendorNumberStart,
        defaultCustomerType,
        enableCreditLimit,
        creditLimitAction,
        includeSalesOrders,
        billingAddressFormat,
        shippingAddressFormat,
        customFields,
        customButtons,
        relatedLists,
      };

      const response = await fetch(`${API_BASE_URL}/settings/customers-vendors`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          toast.success("Settings saved successfully");
        } else {
          toast.error(data.message || "Failed to save settings");
        }
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || "Failed to save settings");
      }
    } catch (error) {
      console.error('Error saving customers & vendors settings:', error);
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  // Click outside handler for dropdowns
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (newButtonDropdownRef.current && !newButtonDropdownRef.current.contains(event.target)) {
        setShowNewButtonDropdown(false);
      }
      if (newRelatedListDropdownRef.current && !newRelatedListDropdownRef.current.contains(event.target)) {
        setShowNewRelatedListDropdown(false);
      }
    };
    if (showNewButtonDropdown || showNewRelatedListDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showNewButtonDropdown, showNewRelatedListDropdown]);

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl">
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Customers and Vendors</h1>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-gray-200 mb-6">
        <button
          onClick={() => setActiveTab("general")}
          className={`px-4 py-2 text-sm font-medium transition ${
            activeTab === "general"
              ? "text-blue-600 border-b-2 border-blue-600"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          General
        </button>
        <button
          onClick={() => setActiveTab("field-customization")}
          className={`px-4 py-2 text-sm font-medium transition ${
            activeTab === "field-customization"
              ? "text-blue-600 border-b-2 border-blue-600"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Field Customization
        </button>
        <button
          onClick={() => setActiveTab("custom-buttons")}
          className={`px-4 py-2 text-sm font-medium transition ${
            activeTab === "custom-buttons"
              ? "text-blue-600 border-b-2 border-blue-600"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Custom Buttons
        </button>
        <button
          onClick={() => setActiveTab("related-lists")}
          className={`px-4 py-2 text-sm font-medium transition ${
            activeTab === "related-lists"
              ? "text-blue-600 border-b-2 border-blue-600"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Related Lists
        </button>
      </div>

      {/* General Tab Content */}
      {activeTab === "general" && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-8">
          {/* Allow duplicates */}
          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={allowDuplicates}
                onChange={(e) => setAllowDuplicates(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="text-sm text-gray-700">
                Allow duplicates for customer and vendor display name.
              </span>
            </label>
          </div>

          {/* Customer & Vendor Numbers */}
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">
              Customer & Vendor Numbers
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Generate customer and vendor numbers automatically. You can configure the series in which numbers are generated while creating new records.
            </p>
            <div className="space-y-4 mb-4">
              {/* Enable Customer Numbers */}
              <div>
                <label className="flex items-center gap-2 cursor-pointer mb-3">
                  <input
                    type="checkbox"
                    checked={enableCustomerNumbers}
                    onChange={(e) => setEnableCustomerNumbers(e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="text-sm font-semibold text-gray-900">Enable Customer Numbers</span>
                </label>
                {enableCustomerNumbers && (
                  <div className="ml-6 mt-2 space-y-3 bg-white border border-gray-200 rounded-lg p-4">
                    <p className="text-xs text-gray-600 mb-3">
                      You can configure a series to generate customer numbers automatically for all your existing customers. A new Customer Number field will be available, which will be mandatory when creating customers.
                    </p>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Prefix
                        </label>
                        <input
                          type="text"
                          value={customerNumberPrefix}
                          onChange={(e) => setCustomerNumberPrefix(e.target.value)}
                          placeholder="CUS-"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Unique No. Starts
                        </label>
                        <input
                          type="text"
                          value={customerNumberStart}
                          onChange={(e) => setCustomerNumberStart(e.target.value)}
                          placeholder="0001"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Enable Vendor Numbers */}
              <div>
                <label className="flex items-center gap-2 cursor-pointer mb-3">
                  <input
                    type="checkbox"
                    checked={enableVendorNumbers}
                    onChange={(e) => setEnableVendorNumbers(e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="text-sm font-semibold text-gray-900">Enable Vendor Numbers</span>
                </label>
                {enableVendorNumbers && (
                  <div className="ml-6 mt-2 space-y-3 bg-white border border-gray-200 rounded-lg p-4">
                    <p className="text-xs text-gray-600 mb-3">
                      You can configure a series to generate vendor numbers automatically for all your existing vendors. A new Vendor Number field will be available, which will be mandatory when creating vendors.
                    </p>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Prefix
                        </label>
                        <input
                          type="text"
                          value={vendorNumberPrefix}
                          onChange={(e) => setVendorNumberPrefix(e.target.value)}
                          placeholder="VEN-"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Unique No. Starts
                        </label>
                        <input
                          type="text"
                          value={vendorNumberStart}
                          onChange={(e) => setVendorNumberStart(e.target.value)}
                          placeholder="0001"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Info size={16} className="text-orange-600 flex-shrink-0 mt-0.5" />
                <div className="space-y-1 text-sm text-gray-700">
                  <p>• Generating these numbers may take a few minutes to a few hours, depending on the number of records that you have. The Customer and Vendor Number field will be available once this process is done.</p>
                  <p>• Once you've enabled this feature, you cannot disable it.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Default Customer Type */}
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">
              Default Customer Type
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Select the default customer type based on the kind of customers you usually sell your products or services to. The default customer type will be pre-selected in the customer creation form.
            </p>
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="customerType"
                  value="business"
                  checked={defaultCustomerType === "business"}
                  onChange={(e) => setDefaultCustomerType(e.target.value)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                />
                <span className="text-sm text-gray-700">Business</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="customerType"
                  value="individual"
                  checked={defaultCustomerType === "individual"}
                  onChange={(e) => setDefaultCustomerType(e.target.value)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                />
                <span className="text-sm text-gray-700">Individual</span>
              </label>
            </div>
          </div>

          {/* Customer Credit Limit */}
          <div className="border-t border-gray-200 pt-6">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="text-sm font-semibold text-gray-900">
                  Customer Credit Limit
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  Credit Limit enables you to set limit on the outstanding receivable amount of the customers.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-sm font-medium ${enableCreditLimit ? 'text-blue-600' : 'text-gray-500'}`}>
                  {enableCreditLimit ? 'Enabled' : 'Disabled'}
                </span>
                <button
                  type="button"
                  onClick={() => setEnableCreditLimit(!enableCreditLimit)}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                    enableCreditLimit ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      enableCreditLimit ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            {enableCreditLimit && (
              <div className="mt-6 space-y-4 bg-white border border-gray-200 rounded-lg p-4">
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">
                    What do you want to do when credit limit is exceeded?
                  </h4>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="creditLimitAction"
                        value="restrict"
                        checked={creditLimitAction === "restrict"}
                        onChange={(e) => setCreditLimitAction(e.target.value)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                      />
                      <span className="text-sm text-gray-700">Restrict creating or updating invoices</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="creditLimitAction"
                        value="warn"
                        checked={creditLimitAction === "warn"}
                        onChange={(e) => setCreditLimitAction(e.target.value)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                      />
                      <span className="text-sm text-gray-700">Show a warning and allow users to proceed</span>
                    </label>
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeSalesOrders}
                      onChange={(e) => setIncludeSalesOrders(e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="text-sm text-gray-700">
                      Include sales orders' amount in limiting the credit given to customers
                    </span>
                  </label>
                </div>

                <div className="border-t border-gray-200 pt-4">
                  <p className="text-sm font-semibold text-gray-900 mb-2">Note:</p>
                  <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                    <li>Go to the respective customer's contact details to set the credit limit.</li>
                    <li>Credit Limit will not affect recurring invoices.</li>
                  </ul>
                </div>
              </div>
            )}
          </div>

          {/* Customer and Vendor Billing Address Format */}
          <div className="border-t border-gray-200 pt-6">
            <div className="flex items-center gap-2 mb-3">
              <h3 className="text-sm font-semibold text-gray-900">
                Customer and Vendor Billing Address Format
              </h3>
              <span className="text-xs text-gray-500">(Displayed in PDF only)</span>
              <Info size={14} className="text-gray-400" />
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Insert Placeholders
                </label>
                <select
                  className="w-full h-10 px-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onChange={(e) => {
                    if (e.target.value) {
                      handlePlaceholderInsert(e.target.value, billingTextareaRef, setBillingAddressFormat);
                      e.target.value = "";
                    }
                  }}
                >
                  <option value="">Select placeholder</option>
                  {billingPlaceholders.map((placeholder) => (
                    <option key={placeholder} value={placeholder}>
                      {placeholder}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <textarea
                  ref={billingTextareaRef}
                  value={billingAddressFormat}
                  onChange={(e) => setBillingAddressFormat(e.target.value)}
                  rows={6}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm resize-none"
                />
              </div>
            </div>
          </div>

          {/* Customer and Vendor Shipping Address Format */}
          <div className="border-t border-gray-200 pt-6">
            <div className="flex items-center gap-2 mb-3">
              <h3 className="text-sm font-semibold text-gray-900">
                Customer and Vendor Shipping Address Format
              </h3>
              <span className="text-xs text-gray-500">(Displayed in PDF only)</span>
              <Info size={14} className="text-gray-400" />
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Insert Placeholders
                </label>
                <select
                  className="w-full h-10 px-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onChange={(e) => {
                    if (e.target.value) {
                      handlePlaceholderInsert(e.target.value, shippingTextareaRef, setShippingAddressFormat);
                      e.target.value = "";
                    }
                  }}
                >
                  <option value="">Select placeholder</option>
                  {billingPlaceholders.map((placeholder) => (
                    <option key={placeholder} value={placeholder}>
                      {placeholder}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <textarea
                  ref={shippingTextareaRef}
                  value={shippingAddressFormat}
                  onChange={(e) => setShippingAddressFormat(e.target.value)}
                  rows={6}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm resize-none"
                />
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex items-center justify-start pt-6 border-t border-gray-200">
            <button 
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      )}

      {/* Field Customization Tab Content */}
      {activeTab === "field-customization" && (
        <div>
          {/* Header with button */}
          <div className="flex items-center justify-between mb-6">
            <div className="text-sm text-gray-600">
              Custom Fields Usage: {customFieldsUsage}/{maxCustomFields}
            </div>
            <button
              onClick={() => navigate("/settings/customers-vendors/new-field")}
              className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 flex items-center gap-2"
            >
              <span className="text-lg">+</span>
              New Custom Field
            </button>
          </div>

          {/* Table */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    FIELD NAME
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    DATA TYPE
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    MANDATORY
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    STATUS
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {customFields.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center">
                      <p className="text-gray-500 text-sm">
                        Do you have information that doesn't go under any existing field? Go ahead and create a custom field.
                      </p>
                    </td>
                  </tr>
                ) : (
                  customFields.map((field, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-900">{field.name}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{field.dataType}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{field.mandatory ? "Yes" : "No"}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{field.status || "Active"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Custom Buttons Tab Content */}
      {activeTab === "custom-buttons" && (
        <div>
          {/* Header with actions */}
          <div className="flex items-center justify-between mb-6">
            <div></div>
            <div className="flex items-center gap-3">
              <button className="text-sm text-blue-600 hover:text-blue-700 hover:underline">
                What's this?
              </button>
              <button className="text-sm text-blue-600 hover:text-blue-700 hover:underline">
                View Logs
              </button>
              {/* Split Button: New Button */}
              <div className="relative" ref={newButtonDropdownRef}>
                <div className="flex">
                  <button
                    onClick={() => {
                      // Handle new button creation - can navigate to a form or open modal
                      setShowNewButtonDropdown(false);
                    }}
                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-l-lg hover:bg-red-700 flex items-center gap-2"
                  >
                    <span className="text-lg">+</span>
                    New
                  </button>
                  <button
                    onClick={() => setShowNewButtonDropdown(!showNewButtonDropdown)}
                    className="px-2 py-2 text-sm font-medium text-white bg-red-600 rounded-r-lg hover:bg-red-700 border-l border-red-500"
                  >
                    <ChevronDown size={16} />
                  </button>
                </div>
                {showNewButtonDropdown && (
                  <div className="absolute top-full right-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 z-50 min-w-[200px]">
                    <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase border-b border-gray-200">
                      CUSTOMER
                    </div>
                    <button
                      onClick={() => {
                        // Handle new customer button
                        setShowNewButtonDropdown(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600"
                    >
                      New Button
                    </button>
                    <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase border-t border-gray-200 border-b border-gray-200">
                      VENDOR
                    </div>
                    <button
                      onClick={() => {
                        // Handle new vendor button
                        setShowNewButtonDropdown(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600"
                    >
                      New Button
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-4 mb-6">
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-700">Contact Type :</label>
              <div className="relative">
                <select
                  value={contactTypeFilter}
                  onChange={(e) => setContactTypeFilter(e.target.value)}
                  className="h-9 px-3 pr-8 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white"
                >
                  <option value="All">All</option>
                  <option value="Customer">Customer</option>
                  <option value="Vendor">Vendor</option>
                </select>
                <ChevronDown size={16} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-700">Location :</label>
              <div className="relative">
                <select
                  value={locationFilter}
                  onChange={(e) => setLocationFilter(e.target.value)}
                  className="h-9 px-3 pr-8 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white"
                >
                  <option value="All">All</option>
                  {/* Add location options here if needed */}
                </select>
                <ChevronDown size={16} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    BUTTON NAME
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    ACCESS PERMISSION
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    CONTACT TYPE
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    LOCATION
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {customButtons.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center">
                      <p className="text-gray-500 text-sm">
                        Create buttons which perform actions set by you. What are you waiting for!
                      </p>
                    </td>
                  </tr>
                ) : (
                  customButtons.map((button, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-900">{button.name}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{button.accessPermission}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{button.contactType}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{button.location}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Related Lists Tab Content */}
      {activeTab === "related-lists" && (
        <div>
          {/* Header with dropdown button */}
          <div className="flex items-center justify-end mb-6">
            {/* Split Button: New Related List */}
            <div className="relative" ref={newRelatedListDropdownRef}>
              <div className="flex">
                <button
                  onClick={() => {
                    // Handle new related list creation
                    setShowNewRelatedListDropdown(false);
                  }}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-l-lg hover:bg-red-700 flex items-center gap-2"
                >
                  <span className="text-lg">+</span>
                  New
                </button>
                <button
                  onClick={() => setShowNewRelatedListDropdown(!showNewRelatedListDropdown)}
                  className="px-2 py-2 text-sm font-medium text-white bg-red-600 rounded-r-lg hover:bg-red-700 border-l border-red-500"
                >
                  <ChevronDown size={16} />
                </button>
              </div>
              {showNewRelatedListDropdown && (
                <div className="absolute top-full right-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 z-50 min-w-[200px]">
                  <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase border-b border-gray-200">
                    CUSTOMER
                  </div>
                  <button
                    onClick={() => {
                      // Handle new customer related list
                      setShowNewRelatedListDropdown(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600"
                  >
                    New Related List
                  </button>
                  <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase border-t border-gray-200 border-b border-gray-200">
                    VENDOR
                  </div>
                  <button
                    onClick={() => {
                      // Handle new vendor related list
                      setShowNewRelatedListDropdown(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600"
                  >
                    New Related List
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Empty State with Illustration */}
          <div className="bg-white rounded-lg border border-gray-200 p-12">
            <div className="flex flex-col items-center justify-center py-12">
              {/* Illustration */}
              <div className="relative mb-8 flex items-center justify-center" style={{ width: "200px", height: "200px" }}>
                {/* Window/Frame element (background) */}
                <div 
                  className="absolute rounded-lg border-2 border-gray-300 bg-gray-50"
                  style={{
                    width: "120px",
                    height: "100px",
                    transform: "rotate(-2deg)",
                    left: "60px",
                    top: "30px",
                    boxShadow: "0 4px 8px rgba(0,0,0,0.1)"
                  }}
                >
                  {/* Window grid lines */}
                  <div className="absolute inset-0 flex flex-col justify-center items-center p-2">
                    <div className="w-full h-px bg-gray-300 mb-2"></div>
                    <div className="w-full h-px bg-gray-300"></div>
                  </div>
                  <div className="absolute inset-0 flex justify-center items-center">
                    <div className="h-full w-px bg-gray-300"></div>
                  </div>
                </div>
                
                {/* Person figure */}
                <div className="relative z-10" style={{ left: "-20px", top: "10px" }}>
                  {/* Head */}
                  <div 
                    className="absolute rounded-full"
                    style={{
                      width: "50px",
                      height: "50px",
                      backgroundColor: "#fbbf24", // Pink-ish for hair
                      top: "0px",
                      left: "15px",
                      boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
                    }}
                  >
                    {/* Face */}
                    <div 
                      className="absolute rounded-full bg-white"
                      style={{
                        width: "35px",
                        height: "35px",
                        top: "8px",
                        left: "7.5px"
                      }}
                    >
                      {/* Eyes */}
                      <div className="absolute top-2 left-2 w-1.5 h-1.5 bg-gray-700 rounded-full"></div>
                      <div className="absolute top-2 right-2 w-1.5 h-1.5 bg-gray-700 rounded-full"></div>
                      {/* Mouth */}
                      <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 w-2 h-1 border-b-2 border-gray-700 rounded-full"></div>
                    </div>
                  </div>
                  
                  {/* Body (red shirt) */}
                  <div 
                    className="absolute rounded-lg"
                    style={{
                      width: "60px",
                      height: "70px",
                      backgroundColor: "#ef4444", // Red
                      top: "45px",
                      left: "10px",
                      boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
                    }}
                  ></div>
                  
                  {/* Arms holding circle */}
                  <div 
                    className="absolute rounded-full border-4 border-blue-500 bg-blue-100"
                    style={{
                      width: "50px",
                      height: "50px",
                      top: "60px",
                      left: "50px",
                      boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
                    }}
                  >
                    {/* Plus sign */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-6 h-0.5 bg-white"></div>
                      <div className="absolute w-0.5 h-6 bg-white"></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Description Text */}
              <p className="text-sm text-gray-600 text-center mb-8 max-w-md">
                Create custom related lists to access relevant information available from inside or outside the application.
              </p>

              {/* New Related List Button */}
              <button
                onClick={() => {
                  // Handle new related list creation
                }}
                className="px-6 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700"
              >
                New Related List
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

