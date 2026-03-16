import React, { useState, useRef, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { useLocation } from "react-router-dom";
import { Info, Settings, ExternalLink, Search, ChevronUp, ChevronDown, Settings2, X, Loader2 } from "lucide-react";
import { getToken, API_BASE_URL } from "../../../../../services/auth";
import toast from "react-hot-toast";

export default function GeneralSettingsPage() {
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [organizationSettings, setOrganizationSettings] = useState<any>({});

  // Module selection states
  const [modules, setModules] = useState<Record<string, boolean>>({
    quotes: true,
    salesOrders: false,
    salesReceipts: true,
    purchaseOrders: false,
    timeTracking: true,
    retainerInvoices: false,
    recurringInvoice: true,
    recurringExpense: true,
    recurringBills: true,
    recurringJournals: false,
    creditNote: true
  });

  // Zoho Inventory Add-on
  const [enableInventory, setEnableInventory] = useState(false);
  const [enablePANValidation, setEnablePANValidation] = useState(false);

  // Work week
  const [workWeek, setWorkWeek] = useState("Sunday");

  // PDF Attachment
  const [attachPDFInvoice, setAttachPDFInvoice] = useState(true);
  const [attachPaymentReceipt, setAttachPaymentReceipt] = useState(false);
  const [encryptPDF, setEncryptPDF] = useState(false);

  // Discounts
  const [discountType, setDiscountType] = useState("transaction");
  const [discountBeforeTax, setDiscountBeforeTax] = useState("Discount Before Tax");

  // Additional charges
  const [adjustments, setAdjustments] = useState(true);
  const [shippingCharges, setShippingCharges] = useState(true);
  const [enableTaxAutomation, setEnableTaxAutomation] = useState(false);
  const [defaultTaxRate, setDefaultTaxRate] = useState("Apply Default Tax Rate");

  // Tax inclusive/exclusive
  const [taxInclusive, setTaxInclusive] = useState("inclusive");

  // Round Off Tax
  const [roundOffTax, setRoundOffTax] = useState("line-item");

  // Rounding off in Sales Transactions
  const [roundingOff, setRoundingOff] = useState("incremental");
  const [roundingIncrement, setRoundingIncrement] = useState("0.05");

  // Salesperson field
  const [addSalespersonField, setAddSalespersonField] = useState(true);

  // Billable Bills and Expenses
  const [billableAccount, setBillableAccount] = useState("");
  const [billableAccountDropdownOpen, setBillableAccountDropdownOpen] = useState(false);
  const [billableAccountSearch, setBillableAccountSearch] = useState("");
  const billableAccountRef = useRef<HTMLDivElement>(null);
  const billableAccountDropdownRef = useRef<HTMLDivElement>(null);
  const [defaultMarkup, setDefaultMarkup] = useState("3");

  // Document copy labels
  const [documentCopies, setDocumentCopies] = useState(2);
  const [copyLabels, setCopyLabels] = useState<Record<string, string>>({
    original: "ORIGINAL",
    duplicate: "DUPLICATE",
    triplicate: "TRIPLICATE",
    quadruplicate: "QUADRUPLICATE",
    quintuplicate: "QUINTUPLICATE"
  });

  // Default print preferences
  const [printPreferences, setPrintPreferences] = useState("choose-while-printing");
  const [printPreferencesDropdownOpen, setPrintPreferencesDropdownOpen] = useState(false);
  const [printPreferencesSearch, setPrintPreferencesSearch] = useState("");
  const printPreferencesRef = useRef<HTMLDivElement>(null);
  const printPreferencesDropdownRef = useRef<HTMLDivElement>(null);

  // Weekly Summary Report
  const [sendWeeklySummary, setSendWeeklySummary] = useState(false);

  // Payment Retention
  const [paymentRetention, setPaymentRetention] = useState(false);

  // Organization Address Format
  const [addressFormat, setAddressFormat] = useState('${ORGANIZATION.STREET_ADDRESS_1}\n${ORGANIZATION.STREET_ADDRESS_2}\n${ORGANIZATION.CITY} ${ORGANIZATION.STATE}\n${ORGANIZATION.POSTAL_CODE}\n${ORGANIZATION.COUNTRY}\n${ORGANIZATION.PHONE}\n${ORGANIZATION.EMAIL}\n${ORGANIZATION.WEBSITE}');
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const addressFormatTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Load settings from API
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const token = getToken();
        if (!token) return;

        const response = await fetch(`${API_BASE_URL}/settings/general`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data?.settings) {
            const s = data.data.settings;
            setOrganizationSettings(s);
            if (s.modules) {
              const {
                paymentLinks,
                tasks,
                selfBilledInvoice,
                debitNote,
                fixedAsset,
                ...visibleModules
              } = s.modules;
              setModules(visibleModules);
            }
            if (s.workWeek) setWorkWeek(s.workWeek);
            if (s.enableInventory !== undefined) setEnableInventory(s.enableInventory);
            if (s.enablePANValidation !== undefined) setEnablePANValidation(s.enablePANValidation);

            if (s.pdfSettings) {
              setAttachPDFInvoice(s.pdfSettings.attachPDFInvoice ?? true);
              setAttachPaymentReceipt(s.pdfSettings.attachPaymentReceipt ?? false);
              setEncryptPDF(s.pdfSettings.encryptPDF ?? false);
            }
            if (s.discountSettings) {
              setDiscountType(s.discountSettings.discountType ?? "transaction");
              setDiscountBeforeTax(s.discountSettings.discountBeforeTax ?? "Discount Before Tax");
            }
            if (s.chargeSettings) {
              setAdjustments(s.chargeSettings.adjustments ?? true);
              setShippingCharges(s.chargeSettings.shippingCharges ?? true);
              setEnableTaxAutomation(s.chargeSettings.enableTaxAutomation ?? false);
              setDefaultTaxRate(s.chargeSettings.defaultTaxRate ?? "Apply Default Tax Rate");
            }
            if (s.taxSettings) {
              setTaxInclusive(s.taxSettings.taxInclusive ?? "inclusive");
              setRoundOffTax(s.taxSettings.roundOffTax ?? "line-item");
            }
            if (s.roundingSettings) {
              setRoundingOff(s.roundingSettings.roundingOff ?? "incremental");
              setRoundingIncrement(s.roundingSettings.roundingIncrement ?? "0.05");
            }
            if (s.salesSettings) {
              setAddSalespersonField(s.salesSettings.addSalespersonField ?? true);
            }
            if (s.billingSettings) {
              setBillableAccount(s.billingSettings.billableAccount ?? "");
              setDefaultMarkup(s.billingSettings.defaultMarkup ?? "3");
            }
            if (s.documentSettings) {
              setDocumentCopies(s.documentSettings.documentCopies ?? 2);
              if (s.documentSettings.copyLabels) setCopyLabels(s.documentSettings.copyLabels);
            }
            if (s.printSettings) {
              setPrintPreferences(s.printSettings.printPreferences ?? "choose-while-printing");
            }
            if (s.reportSettings) {
              setSendWeeklySummary(s.reportSettings.sendWeeklySummary ?? false);
            }
            if (s.retentionSettings) {
              setPaymentRetention(s.retentionSettings.paymentRetention ?? false);
            }
            if (s.pdfFormatSettings) {
              setAddressFormat(s.pdfFormatSettings.addressFormat || addressFormat);
            }
          }
        }
      } catch (error) {
        console.error('Error loading general settings:', error);
      } finally {
        setLoading(false);
      }
    };
    loadSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = getToken();
      if (!token) return;

      const payload = {
        settings: {
          ...organizationSettings,
          modules,
          workWeek,
          enableInventory,
          enablePANValidation,
          pdfSettings: { attachPDFInvoice, attachPaymentReceipt, encryptPDF },
          discountSettings: { discountType, discountBeforeTax },
          chargeSettings: { adjustments, shippingCharges, enableTaxAutomation, defaultTaxRate },
          taxSettings: { taxInclusive, roundOffTax },
          roundingSettings: { roundingOff, roundingIncrement },
          salesSettings: { addSalespersonField },
          billingSettings: { billableAccount, defaultMarkup },
          documentSettings: { documentCopies, copyLabels },
          printSettings: { printPreferences },
          reportSettings: { sendWeeklySummary },
          retentionSettings: { paymentRetention },
          pdfFormatSettings: { addressFormat },
        }
      };

      const response = await fetch(`${API_BASE_URL}/settings/general`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        toast.success("Settings saved successfully");
        setOrganizationSettings(payload.settings);
        // Dispatch event for sidebar to update
        window.dispatchEvent(new CustomEvent('generalSettingsUpdated', { detail: payload.settings }));
      } else {
        const data = await response.json();
        toast.error(data.message || "Failed to save settings");
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error("An error occurred while saving settings");
    } finally {
      setSaving(false);
    }
  };

  // Sample organization data for preview
  const organizationData: Record<string, string> = {
    STREET_ADDRESS_1: "taleex",
    STREET_ADDRESS_2: "taleex",
    CITY: "mogadishu",
    STATE: "Nairobi",
    POSTAL_CODE: "22223",
    COUNTRY: "Kenya",
    PHONE: "",
    EMAIL: "jirdehusseinkhalif@gmail.com",
    WEBSITE: ""
  };

  // Function to replace placeholders with actual values
  const getPreviewText = () => {
    let preview = addressFormat;
    Object.keys(organizationData).forEach(key => {
      const placeholder = `\${ORGANIZATION.${key}}`;
      preview = preview.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), organizationData[key] || '');
    });
    return preview;
  };

  const handleModuleChange = (module: string) => {
    setModules(prev => ({ ...prev, [module]: !prev[module] }));
  };

  // Account options for Billable Bills
  const accountOptions = [
    "Discount",
    "General Income",
    "Interest Income",
    "Late Fee Income",
    "Other Charges",
    "Sales",
    "Shipping Charge"
  ];

  const filteredAccountOptions = useMemo(() => {
    if (!billableAccountSearch) return accountOptions;
    const s = billableAccountSearch.trim().toLowerCase();
    return s ? accountOptions.filter((o) => o.toLowerCase().includes(s)) : accountOptions;
  }, [billableAccountSearch]);

  // Print preferences options
  const printPreferencesOptions = [
    "One Copy",
    "Two Copies",
    "Three Copies",
    "Four Copies",
    "Five Copies",
    "I will choose while printing"
  ];

  const filteredPrintPreferencesOptions = useMemo(() => {
    const s = printPreferencesSearch.trim().toLowerCase();
    return s ? printPreferencesOptions.filter((o) => o.toLowerCase().includes(s)) : printPreferencesOptions;
  }, [printPreferencesSearch]);

  // Click away handlers
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (billableAccountRef.current && !billableAccountRef.current.contains(target) &&
        billableAccountDropdownRef.current && !billableAccountDropdownRef.current.contains(target)) {
        setBillableAccountDropdownOpen(false);
        setBillableAccountSearch("");
      }
      if (printPreferencesRef.current && !printPreferencesRef.current.contains(target) &&
        printPreferencesDropdownRef.current && !printPreferencesDropdownRef.current.contains(target)) {
        setPrintPreferencesDropdownOpen(false);
        setPrintPreferencesSearch("");
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Position calculation for dropdowns
  const [billableAccountPosition, setBillableAccountPosition] = useState({ top: 0, left: 0, width: 0 });
  const [printPreferencesPosition, setPrintPreferencesPosition] = useState({ top: 0, left: 0, width: 0 });

  useEffect(() => {
    if (billableAccountDropdownOpen && billableAccountRef.current) {
      const rect = billableAccountRef.current.getBoundingClientRect();
      setBillableAccountPosition({
        top: rect.bottom + 8,
        left: rect.left,
        width: rect.width
      });
    }
  }, [billableAccountDropdownOpen]);

  useEffect(() => {
    if (printPreferencesDropdownOpen && printPreferencesRef.current) {
      const rect = printPreferencesRef.current.getBoundingClientRect();
      setPrintPreferencesPosition({
        top: rect.bottom + 8,
        left: rect.left,
        width: rect.width
      });
    }
  }, [printPreferencesDropdownOpen]);

  useEffect(() => {
    if (loading) return;
    if (location.hash !== "#organization-address-format") return;

    const el = document.getElementById("organization-address-format");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [loading, location.hash]);

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl">
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">General</h1>

      <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-8">
        {/* Select Modules */}
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-4">
            Select the modules you would like to enable.
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(modules).map(([key, value]) => (
              <label key={key} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={value}
                  onChange={() => handleModuleChange(key)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="text-sm text-gray-700 capitalize">
                  {key.replace(/([A-Z])/g, ' $1').trim()}
                </span>
                {(key === "timeTracking" || key === "recurringInvoice") && (
                  <Info size={14} className="text-gray-400" />
                )}
              </label>
            ))}
          </div>
        </div>

        {/* Zoho Inventory Add-on */}
        <div className="border-t border-gray-200 pt-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">PAN Validation For Customers and Vendors</h3>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={enablePANValidation}
              onChange={(e) => setEnablePANValidation(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="text-sm text-gray-700">Enable PAN validation for customers and vendors.</span>
          </label>
        </div>

        {/* Zoho Inventory Add-on */}
        <div className="border-t border-gray-200 pt-6">
          <div className="flex items-center gap-2 mb-3">
            <h3 className="text-sm font-semibold text-gray-900">Zoho Inventory Add-on</h3>
            <Info size={14} className="text-gray-400" />
            <a href="#" className="text-sm text-blue-600 hover:underline">Learn More</a>
          </div>
          <label className="flex items-center gap-2 cursor-pointer mb-3">
            <input
              type="checkbox"
              checked={enableInventory}
              onChange={(e) => setEnableInventory(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="text-sm text-gray-700">Enable Zoho Inventory modules in Zoho Books.</span>
          </label>
          {enableInventory && (
            <div className="ml-6">
              <p className="text-sm text-gray-600 mb-2">
                Enabling Zoho Inventory Add-on will allow you to use the following modules of Zoho Inventory within Zoho Books:
              </p>
              <ul className="space-y-1 text-sm text-gray-700">
                {["Item Groups", "Composite Items", "Packages", "Picklists", "Shipments", "Purchase Receive", "Sales Returns", "Transfer Orders"].map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <span className="text-green-600">âœ“</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Work Week */}
        <div className="border-t border-gray-200 pt-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Set the first day of your work week:
          </label>
          <select
            value={workWeek}
            onChange={(e) => setWorkWeek(e.target.value)}
            className="w-full h-10 px-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map((day) => (
              <option key={day} value={day}>{day}</option>
            ))}
          </select>
        </div>

        {/* PDF Attachment */}
        <div className="border-t border-gray-200 pt-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">PDF Attachment</h3>
          <div className="space-y-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={attachPDFInvoice}
                onChange={(e) => setAttachPDFInvoice(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="text-sm text-gray-700">Attach PDF file with the link while emailing the invoice & quote?</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={attachPaymentReceipt}
                onChange={(e) => setAttachPaymentReceipt(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="text-sm text-gray-700">Attach payment receipt PDF to the online Payment Thank-You email notification.</span>
              <Info size={14} className="text-gray-400" />
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={encryptPDF}
                onChange={(e) => setEncryptPDF(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="text-sm text-gray-700">I would like to encrypt the PDF files that I send.</span>
            </label>
            {encryptPDF && (
              <p className="text-xs text-gray-600 ml-6">
                This will ensure that the PDF files cannot be edited or converted into another file format.
              </p>
            )}
          </div>
        </div>

        {/* Discounts */}
        <div className="border-t border-gray-200 pt-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Do you give discounts?</h3>
          <div className="space-y-2 mb-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="discountType"
                value="none"
                checked={discountType === "none"}
                onChange={(e) => setDiscountType(e.target.value)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
              />
              <span className="text-sm text-gray-700">I don't give discounts</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="discountType"
                value="line-item"
                checked={discountType === "line-item"}
                onChange={(e) => setDiscountType(e.target.value)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
              />
              <span className="text-sm text-gray-700">At Line Item Level</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="discountType"
                value="transaction"
                checked={discountType === "transaction"}
                onChange={(e) => setDiscountType(e.target.value)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
              />
              <span className="text-sm text-gray-700">At Transaction Level</span>
            </label>
          </div>
          {discountType !== "none" && (
            <select
              value={discountBeforeTax}
              onChange={(e) => setDiscountBeforeTax(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option>Discount Before Tax</option>
              <option>Discount After Tax</option>
            </select>
          )}
        </div>

        {/* Additional Charges */}
        <div className="border-t border-gray-200 pt-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">
            Select any additional charges you'll like to add:
          </h3>
          <div className="space-y-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={adjustments}
                onChange={(e) => setAdjustments(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="text-sm text-gray-700">Adjustments</span>
            </label>
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={shippingCharges}
                  onChange={(e) => setShippingCharges(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="text-sm text-gray-700">Shipping Charges</span>
              </label>
              {shippingCharges && (
                <div className="ml-6 mt-2 space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={enableTaxAutomation}
                      onChange={(e) => setEnableTaxAutomation(e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="text-sm text-gray-700">Enable tax automation for shipping charges</span>
                  </label>
                  {enableTaxAutomation && (
                    <>
                      <p className="text-xs text-gray-600">
                        Once enabled, the tax rate associated with a customer will be applied to the shipping charge in a transaction. If a tax rate is not associated to a customer, the tax rate will be applied to the shipping charge based on the option you select below:{" "}
                        <a href="#" className="text-blue-600 hover:underline">How does it work?</a>
                      </p>
                      <select
                        value={defaultTaxRate}
                        onChange={(e) => setDefaultTaxRate(e.target.value)}
                        className="w-full h-10 px-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option>Apply Default Tax Rate</option>
                        <option>No Tax</option>
                      </select>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tax Inclusive/Exclusive */}
        <div className="border-t border-gray-200 pt-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">
            Do you sell your items at rates inclusive of Tax?
          </h3>
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="taxInclusive"
                value="inclusive"
                checked={taxInclusive === "inclusive"}
                onChange={(e) => setTaxInclusive(e.target.value)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
              />
              <span className="text-sm text-gray-700">Tax Inclusive</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="taxInclusive"
                value="exclusive"
                checked={taxInclusive === "exclusive"}
                onChange={(e) => setTaxInclusive(e.target.value)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
              />
              <span className="text-sm text-gray-700">Tax Exclusive</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="taxInclusive"
                value="both"
                checked={taxInclusive === "both"}
                onChange={(e) => setTaxInclusive(e.target.value)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
              />
              <span className="text-sm text-gray-700">Tax Inclusive or Tax Exclusive</span>
            </label>
          </div>
        </div>

        {/* Round Off Tax */}
        <div className="border-t border-gray-200 pt-6">
          <div className="flex items-center gap-2 mb-2">
            <label className="block text-sm font-medium text-gray-700">Round Off Tax</label>
            <Info size={14} className="text-gray-400" />
          </div>
          <select
            value={roundOffTax}
            onChange={(e) => setRoundOffTax(e.target.value)}
            className="w-full h-10 px-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="transaction">At transaction level</option>
            <option value="line-item">At line item level</option>
          </select>
        </div>

        {/* Rounding off in Sales Transactions */}
        <div className="border-t border-gray-200 pt-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">
            Rounding off in Sales Transactions
          </h3>
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="roundingOff"
                value="no-rounding"
                checked={roundingOff === "no-rounding"}
                onChange={(e) => setRoundingOff(e.target.value)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
              />
              <span className="text-sm text-gray-700">No Rounding</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="roundingOff"
                value="whole-number"
                checked={roundingOff === "whole-number"}
                onChange={(e) => setRoundingOff(e.target.value)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
              />
              <span className="text-sm text-gray-700">Round off the total to the nearest whole number</span>
              <Info size={14} className="text-gray-400" />
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="roundingOff"
                value="incremental"
                checked={roundingOff === "incremental"}
                onChange={(e) => setRoundingOff(e.target.value)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
              />
              <span className="text-sm text-gray-700">Round off the total to the nearest incremental value</span>
            </label>
            {roundingOff === "incremental" && (
              <div className="ml-6 mt-2">
                <p className="text-sm text-gray-700">
                  The current rounding increment is set to: <span className="font-semibold">{roundingIncrement}</span>
                </p>
                <button
                  type="button"
                  onClick={() => {
                    const newValue = prompt("Enter rounding increment:", roundingIncrement);
                    if (newValue !== null) {
                      setRoundingIncrement(newValue);
                    }
                  }}
                  className="mt-1 flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
                >
                  <Settings2 size={14} />
                  Configure
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Salesperson Field */}
        <div className="border-t border-gray-200 pt-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={addSalespersonField}
              onChange={(e) => setAddSalespersonField(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="text-sm text-gray-700">I want to add a field for salesperson</span>
          </label>
        </div>

        {/* Billable Bills and Expenses */}
        <div className="border-t border-gray-200 pt-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">
            Billable Bills and Expenses
          </h3>
          <p className="text-sm text-gray-600 mb-3">
            Account for tracking billable bills and expenses while invoicing
          </p>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select an account
              </label>
              <div className="relative" ref={billableAccountRef}>
                <button
                  type="button"
                  onClick={() => setBillableAccountDropdownOpen(!billableAccountDropdownOpen)}
                  className="w-full h-10 px-3 rounded-lg border border-blue-300 bg-white text-left flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <span className={billableAccount ? "text-gray-900" : "text-gray-400"}>
                    {billableAccount || "Select an account"}
                  </span>
                  {billableAccountDropdownOpen ? (
                    <ChevronUp size={16} className="text-gray-400" />
                  ) : (
                    <ChevronDown size={16} className="text-gray-400" />
                  )}
                </button>
                {billableAccountDropdownOpen && createPortal(
                  <div
                    ref={billableAccountDropdownRef}
                    className="fixed overflow-hidden rounded-xl border-2 border-blue-300 bg-white shadow-[0_20px_40px_rgba(0,0,0,0.25)]"
                    style={{
                      top: `${billableAccountPosition.top}px`,
                      left: `${billableAccountPosition.left}px`,
                      width: `${billableAccountPosition.width}px`,
                      zIndex: 99999,
                      maxHeight: '320px',
                      display: 'flex',
                      flexDirection: 'column'
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center gap-2 border-b-2 border-gray-200 bg-gradient-to-r from-gray-50 to-blue-50/30 px-3 py-3 flex-shrink-0">
                      <Search size={16} className="text-gray-400" />
                      <input
                        autoFocus
                        className="w-full bg-transparent text-sm font-medium outline-none placeholder:text-gray-400"
                        placeholder="Search"
                        value={billableAccountSearch}
                        onChange={(e) => setBillableAccountSearch(e.target.value)}
                      />
                    </div>
                    <div className="overflow-auto flex-1" style={{ maxHeight: '280px' }}>
                      {filteredAccountOptions.map((opt) => {
                        const isSelected = opt === billableAccount;
                        return (
                          <button
                            key={opt}
                            type="button"
                            className={`w-full px-4 py-2.5 text-left text-sm font-medium transition
                              ${isSelected ? "bg-blue-500 text-white" : "text-gray-900 hover:bg-gray-50"}
                            `}
                            onClick={() => {
                              setBillableAccount(opt);
                              setBillableAccountDropdownOpen(false);
                              setBillableAccountSearch("");
                            }}
                          >
                            {opt}
                          </button>
                        );
                      })}
                      {filteredAccountOptions.length === 0 && (
                        <div className="px-4 py-3 text-sm text-gray-400 text-center">No matches found</div>
                      )}
                    </div>
                  </div>,
                  document.body
                )}
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Default Markup Percentage
                </label>
                <Info size={14} className="text-gray-400" />
              </div>
              <div className="relative">
                <input
                  type="number"
                  value={defaultMarkup}
                  onChange={(e) => setDefaultMarkup(e.target.value)}
                  className="w-full h-10 px-3 pr-8 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Document Copy Labels */}
        <div className="border-t border-gray-200 pt-6">
          <div className="flex items-center gap-2 mb-4">
            <h3 className="text-sm font-semibold text-gray-900">Document copy label</h3>
            <Info size={14} className="text-gray-400" />
          </div>
          <div className="space-y-4">
            {/* Header Row */}
            <div className="grid grid-cols-6 gap-2">
              <div></div>
              <div className="text-xs font-semibold text-gray-700 text-center">ORIGINAL</div>
              <div className="text-xs font-semibold text-gray-700 text-center">DUPLICATE</div>
              <div className="text-xs font-semibold text-gray-700 text-center">TRIPLICATE</div>
              <div className="text-xs font-semibold text-gray-700 text-center">QUADRUPLICATE</div>
              <div className="text-xs font-semibold text-gray-700 text-center">QUINTUPLICATE</div>
            </div>

            {/* Two Copies Row */}
            <div className="grid grid-cols-6 gap-2 items-center">
              <div className="text-sm text-gray-700 underline decoration-dotted">Two Copies</div>
              <button
                type="button"
                className="h-9 px-3 text-sm rounded-lg border border-gray-300 bg-gray-50 hover:bg-gray-100 text-gray-700 font-medium"
              >
                ORIGINAL
              </button>
              <button
                type="button"
                className="h-9 px-3 text-sm rounded-lg border border-gray-300 bg-gray-50 hover:bg-gray-100 text-gray-700 font-medium"
              >
                DUPLICATE
              </button>
              <div></div>
              <div></div>
              <div></div>
            </div>

            {/* Three Copies Row */}
            <div className="grid grid-cols-6 gap-2 items-center">
              <div className="text-sm text-gray-700 underline decoration-dotted">Three Copies</div>
              <button
                type="button"
                className="h-9 px-3 text-sm rounded-lg border border-gray-300 bg-gray-50 hover:bg-gray-100 text-gray-700 font-medium"
              >
                ORIGINAL
              </button>
              <button
                type="button"
                className="h-9 px-3 text-sm rounded-lg border border-gray-300 bg-gray-50 hover:bg-gray-100 text-gray-700 font-medium"
              >
                DUPLICATE
              </button>
              <button
                type="button"
                className="h-9 px-3 text-sm rounded-lg border border-gray-300 bg-gray-50 hover:bg-gray-100 text-gray-700 font-medium"
              >
                TRIPLICATE
              </button>
              <div></div>
              <div></div>
            </div>

            {/* Four/Five Copies Row */}
            <div className="grid grid-cols-6 gap-2 items-center">
              <div className="text-sm text-gray-700 underline decoration-dotted">Four/Five Copies</div>
              <button
                type="button"
                className="h-9 px-3 text-sm rounded-lg border border-gray-300 bg-gray-50 hover:bg-gray-100 text-gray-700 font-medium"
              >
                ORIGINAL
              </button>
              <button
                type="button"
                className="h-9 px-3 text-sm rounded-lg border border-gray-300 bg-gray-50 hover:bg-gray-100 text-gray-700 font-medium"
              >
                DUPLICATE
              </button>
              <button
                type="button"
                className="h-9 px-3 text-sm rounded-lg border border-gray-300 bg-gray-50 hover:bg-gray-100 text-gray-700 font-medium"
              >
                TRIPLICATE
              </button>
              <button
                type="button"
                className="h-9 px-3 text-sm rounded-lg border border-gray-300 bg-gray-50 hover:bg-gray-100 text-gray-700 font-medium"
              >
                QUADRUPLICA
              </button>
              <button
                type="button"
                className="h-9 px-3 text-sm rounded-lg border border-gray-300 bg-gray-50 hover:bg-gray-100 text-gray-700 font-medium"
              >
                QUINTUPLICAT
              </button>
            </div>
          </div>
        </div>

        {/* Default Print Preferences */}
        <div className="border-t border-gray-200 pt-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Default print preferences
          </label>
          <div className="relative" ref={printPreferencesRef}>
            <button
              type="button"
              onClick={() => setPrintPreferencesDropdownOpen(!printPreferencesDropdownOpen)}
              className="w-full h-10 px-3 rounded-lg border border-gray-300 bg-white text-left flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <span className="text-gray-900">
                {printPreferencesOptions.find(opt => opt.toLowerCase().replace(/\s+/g, '-') === printPreferences) || "I will choose while printing"}
              </span>
              {printPreferencesDropdownOpen ? (
                <ChevronUp size={16} className="text-gray-400" />
              ) : (
                <ChevronDown size={16} className="text-gray-400" />
              )}
            </button>
            {printPreferencesDropdownOpen && createPortal(
              <div
                ref={printPreferencesDropdownRef}
                className="fixed overflow-hidden rounded-xl border-2 border-blue-300 bg-white shadow-[0_20px_40px_rgba(0,0,0,0.25)]"
                style={{
                  top: `${printPreferencesPosition.top}px`,
                  left: `${printPreferencesPosition.left}px`,
                  width: `${printPreferencesPosition.width}px`,
                  zIndex: 99999,
                  maxHeight: '320px',
                  display: 'flex',
                  flexDirection: 'column'
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center gap-2 border-b-2 border-gray-200 bg-gradient-to-r from-gray-50 to-blue-50/30 px-3 py-3 flex-shrink-0">
                  <Search size={16} className="text-gray-400" />
                  <input
                    autoFocus
                    className="w-full bg-transparent text-sm font-medium outline-none placeholder:text-gray-400"
                    placeholder="Search"
                    value={printPreferencesSearch}
                    onChange={(e) => setPrintPreferencesSearch(e.target.value)}
                  />
                </div>
                <div className="overflow-auto flex-1" style={{ maxHeight: '280px' }}>
                  {filteredPrintPreferencesOptions.map((opt) => {
                    const optValue = opt.toLowerCase().replace(/\s+/g, '-');
                    const isSelected = optValue === printPreferences;
                    return (
                      <button
                        key={opt}
                        type="button"
                        className={`w-full px-4 py-2.5 text-left text-sm font-medium transition flex items-center justify-between
                          ${isSelected ? "bg-gray-100 text-gray-900" : "text-gray-900 hover:bg-gray-50"}
                        `}
                        onClick={() => {
                          setPrintPreferences(optValue);
                          setPrintPreferencesDropdownOpen(false);
                          setPrintPreferencesSearch("");
                        }}
                      >
                        <span>{opt}</span>
                        {isSelected && (
                          <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </button>
                    );
                  })}
                  {filteredPrintPreferencesOptions.length === 0 && (
                    <div className="px-4 py-3 text-sm text-gray-400 text-center">No matches found</div>
                  )}
                </div>
              </div>,
              document.body
            )}
          </div>
        </div>

        {/* Weekly Summary Report */}
        <div className="border-t border-gray-200 pt-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={sendWeeklySummary}
              onChange={(e) => setSendWeeklySummary(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="text-sm text-gray-700">Send Weekly Summary report</span>
          </label>
          {sendWeeklySummary && (
            <div className="ml-6 mt-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
              <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
                <li>
                  All users with Admin access will receive a summary of all the business transactions for each week.{" "}
                  <a href="#" className="text-blue-600 hover:underline">View Sample</a>
                </li>
                <li>If you've enabled Slack integration, weekly summary report will be pushed into your preferred Slack channel.</li>
              </ul>
            </div>
          )}
        </div>

        {/* Payment Retention */}
        <div className="border-t border-gray-200 pt-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-1">Payment Retention</h3>
              <p className="text-sm text-gray-600">
                Enable this option to allow your customers to retain a part of their total invoice amount.{" "}
                <a href="#" className="text-blue-600 hover:underline">How does it work?</a>
              </p>
            </div>
            <button
              onClick={() => setPaymentRetention(!paymentRetention)}
              className={`relative w-12 h-6 rounded-full transition-colors ${paymentRetention ? 'bg-blue-600' : 'bg-gray-300'
                }`}
            >
              <span
                className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${paymentRetention ? 'translate-x-6' : 'translate-x-0'
                  }`}
              />
            </button>
          </div>
        </div>

        {/* Organization Address Format */}
        <div id="organization-address-format" className="border-t border-gray-200 pt-6">
          <div className="flex items-center gap-2 mb-3">
            <h3 className="text-sm font-semibold text-gray-900">
              Organization Address Format (Displayed in PDF only)
            </h3>
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
                    const textarea = addressFormatTextareaRef.current;
                    if (textarea) {
                      const start = textarea.selectionStart;
                      const end = textarea.selectionEnd;
                      const newValue = addressFormat.substring(0, start) + e.target.value + addressFormat.substring(end);
                      setAddressFormat(newValue);
                      setTimeout(() => {
                        textarea.focus();
                        textarea.setSelectionRange(start + e.target.value.length, start + e.target.value.length);
                      }, 0);
                    } else {
                      setAddressFormat(addressFormat + '\n' + e.target.value);
                    }
                    e.target.value = '';
                  }
                }}
              >
                <option value="">Select placeholder</option>
                <option value={'${ORGANIZATION.STREET_ADDRESS_1}'}>{'${ORGANIZATION.STREET_ADDRESS_1}'}</option>
                <option value={'${ORGANIZATION.STREET_ADDRESS_2}'}>{'${ORGANIZATION.STREET_ADDRESS_2}'}</option>
                <option value={'${ORGANIZATION.CITY}'}>{'${ORGANIZATION.CITY}'}</option>
                <option value={'${ORGANIZATION.STATE}'}>{'${ORGANIZATION.STATE}'}</option>
                <option value={'${ORGANIZATION.POSTAL_CODE}'}>{'${ORGANIZATION.POSTAL_CODE}'}</option>
                <option value={'${ORGANIZATION.COUNTRY}'}>{'${ORGANIZATION.COUNTRY}'}</option>
                <option value={'${ORGANIZATION.PHONE}'}>{'${ORGANIZATION.PHONE}'}</option>
                <option value={'${ORGANIZATION.EMAIL}'}>{'${ORGANIZATION.EMAIL}'}</option>
                <option value={'${ORGANIZATION.WEBSITE}'}>{'${ORGANIZATION.WEBSITE}'}</option>
              </select>
            </div>
            <div>
              <textarea
                ref={addressFormatTextareaRef}
                value={addressFormat}
                onChange={(e) => setAddressFormat(e.target.value)}
                rows={6}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
              />
            </div>
            <button
              onClick={() => setShowPreviewModal(true)}
              className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100"
            >
              Preview
            </button>
          </div>
        </div>

        {/* Preview Modal */}
        {showPreviewModal && createPortal(
          <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000]"
            onClick={() => setShowPreviewModal(false)}
          >
            <div
              className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 relative"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button
                onClick={() => setShowPreviewModal(false)}
                className="absolute top-3 right-3 p-1 hover:bg-gray-100 rounded transition"
              >
                <X size={20} className="text-gray-500" />
              </button>

              {/* Preview Content */}
              <div className="p-6">
                <div className="whitespace-pre-line text-sm text-gray-900 font-normal">
                  {getPreviewText()}
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

        {/* Save Button */}
        <div className="flex items-center justify-end pt-6 border-t border-gray-200">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-200"
          >
            {saving ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Saving...
              </>
            ) : "Save Settings"}
          </button>
        </div>
      </div>
    </div>
  );
}




