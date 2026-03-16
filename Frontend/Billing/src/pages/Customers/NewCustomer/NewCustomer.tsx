import React, { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { Info, Phone, Smartphone, Upload, X, Search, ChevronDown, Check, Globe, File, Edit, CheckCircle, Plus, MoreVertical, Folder, Cloud, Box, Layers, HardDrive, Settings, Paperclip, FileText, CreditCard, ChevronUp, Square, Grid3x3, RefreshCw, LayoutGrid, Loader2 } from "lucide-react";
import { customersAPI, currenciesAPI, documentsAPI, taxesAPI, reportingTagsAPI } from "../../../services/api";

import { getAllDocuments } from "../../../../utils/documentStorage";
// import { getToken, API_BASE_URL } from "../../../../services/auth";
import { getToken, API_BASE_URL } from "../../../../services/auth";
import { PaymentTermsDropdown } from "../../../../components/PaymentTermsDropdown";
import { ConfigurePaymentTermsModal } from "../../../../components/ConfigurePaymentTermsModal";
import { defaultPaymentTerms, PaymentTerm } from "../../../../hooks/usePaymentTermsDropdown";
import NewCurrencyModal from "../../../settings/organization-settings/setup-configurations/currencies/NewCurrencyModal";
import NewTaxModal from "../../../../components/modals/NewTaxModal";
import { Country, State } from "country-state-city";
import { toast } from "react-toastify";
import SearchableDropdown from "../../../components/ui/SearchableDropdown";
import { countryData, countryPhoneCodes } from "./countriesData";
import { readTaxesLocal, isTaxGroupRecord } from "../../settings/organization-settings/taxes-compliance/TAX/storage";


const splitPhoneNumber = (phone: string, defaultPrefix: string) => {
  if (!phone) return { prefix: defaultPrefix, number: "" };
  const parts = phone.split(" ");
  if (parts.length > 1 && parts[0].startsWith("+")) {
    return { prefix: parts[0], number: parts.slice(1).join(" ") };
  }
  return { prefix: defaultPrefix, number: phone };
};

const accounts = [
  { id: "ar1", name: "Accounts Receivable" }
];



const customerLanguageOptions = [
  { value: "english", label: "English" },
  { value: "spanish", label: "Spanish" },
  { value: "french", label: "French" },
  { value: "german", label: "German" },
  { value: "italian", label: "Italian" },
  { value: "portuguese", label: "Portuguese" },
  { value: "russian", label: "Russian" },
  { value: "chinese", label: "Chinese" },
  { value: "japanese", label: "Japanese" },
  { value: "arabic", label: "Arabic" },
  { value: "hindi", label: "Hindi" },
  { value: "dutch", label: "Dutch" }
];

// Help Tooltip Component
function HelpTooltip({ text, children }: { text: React.ReactNode, children: React.ReactNode }) {
  const [show, setShow] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const targetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (show && targetRef.current) {
      const rect = targetRef.current.getBoundingClientRect();
      setPosition({
        top: rect.top - 10, // 10px spacing
        left: rect.left + rect.width / 2
      });
    }
  }, [show]);

  return (
    <div
      ref={targetRef}
      className="inline-block relative"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && createPortal(
        <div
          className="fixed z-[999999] pointer-events-none"
          style={{
            top: `${position.top}px`,
            left: `${position.left}px`,
            transform: 'translate(-50%, -100%)'
          }}
        >
          <div className="bg-[#1f2937] text-white text-[13px] leading-relaxed py-3 px-4 rounded-lg shadow-xl max-w-[320px] relative font-medium text-left">
            {text}
            {/* Arrow */}
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-[6px] border-transparent border-t-[#1f2937]" />
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

export default function NewCustomer() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const isEditMode = !!id;
  const saveAndSubscribeRef = useRef(false);
  const LOCAL_CUSTOMERS_CACHE_KEY = "taban_customers_cache";
  const [isLoading, setIsLoading] = useState(isEditMode);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("other-details");
  const [showMoreDetails, setShowMoreDetails] = useState(false);
  const [isCurrencyDropdownOpen, setIsCurrencyDropdownOpen] = useState(false);
  const [currencySearch, setCurrencySearch] = useState("");
  const currencyDropdownRef = useRef<HTMLDivElement>(null);
  const [isAccountsReceivableDropdownOpen, setIsAccountsReceivableDropdownOpen] = useState(false);
  const [accountsReceivableSearch, setAccountsReceivableSearch] = useState("");
  const accountsReceivableDropdownRef = useRef<HTMLDivElement>(null);
  const [isBillingCountryDropdownOpen, setIsBillingCountryDropdownOpen] = useState(false);
  const [billingCountrySearch, setBillingCountrySearch] = useState("");
  const billingCountryDropdownRef = useRef<HTMLDivElement>(null);
  const [isShippingCountryDropdownOpen, setIsShippingCountryDropdownOpen] = useState(false);
  const [shippingCountrySearch, setShippingCountrySearch] = useState("");
  const shippingCountryDropdownRef = useRef<HTMLDivElement>(null);
  const [isBillingStateDropdownOpen, setIsBillingStateDropdownOpen] = useState(false);
  const [billingStateSearch, setBillingStateSearch] = useState("");
  const billingStateDropdownRef = useRef<HTMLDivElement>(null);
  const [isShippingStateDropdownOpen, setIsShippingStateDropdownOpen] = useState(false);
  const [shippingStateSearch, setShippingStateSearch] = useState("");
  const shippingStateDropdownRef = useRef<HTMLDivElement>(null);
  const [isOpeningBalanceEditing, setIsOpeningBalanceEditing] = useState(false);
  const openingBalanceInputRef = useRef<HTMLInputElement>(null);
  const [isDisplayNameDropdownOpen, setIsDisplayNameDropdownOpen] = useState(false);
  const displayNameDropdownRef = useRef<HTMLDivElement>(null);
  const [isCustomerLanguageDropdownOpen, setIsCustomerLanguageDropdownOpen] = useState(false);
  const customerLanguageDropdownRef = useRef<HTMLDivElement>(null);
  const [isHelpSidebarOpen, setIsHelpSidebarOpen] = useState(false);
  const [existingCustomerData, setExistingCustomerData] = useState<any | null>(null);

  const [isWorkPhonePrefixDropdownOpen, setIsWorkPhonePrefixDropdownOpen] = useState(false);
  const [workPhonePrefixSearch, setWorkPhonePrefixSearch] = useState("");
  const workPhonePrefixRef = useRef<HTMLDivElement>(null);

  const [isMobilePrefixDropdownOpen, setIsMobilePrefixDropdownOpen] = useState(false);
  const [mobilePrefixSearch, setMobilePrefixSearch] = useState("");
  const mobilePrefixRef = useRef<HTMLDivElement>(null);

  const [isDisplayNameManuallyEdited, setIsDisplayNameManuallyEdited] = useState(false);
  const [isUploadDropdownOpen, setIsUploadDropdownOpen] = useState(false);
  const uploadDropdownRef = useRef<HTMLDivElement>(null);
  const [priceLists, setPriceLists] = useState<any[]>([]);
  const [isPriceListDropdownOpen, setIsPriceListDropdownOpen] = useState(false);
  const [priceListSearch, setPriceListSearch] = useState("");
  const priceListDropdownRef = useRef<HTMLDivElement>(null);
  const [showExtendedContactColumns, setShowExtendedContactColumns] = useState(false);
  const [isDocumentsModalOpen, setIsDocumentsModalOpen] = useState(false);
  const [selectedInbox, setSelectedInbox] = useState("files");
  const [documentSearch, setDocumentSearch] = useState("");
  const [selectedDocuments, setSelectedDocuments] = useState<any[]>([]);
  const [availableDocuments, setAvailableDocuments] = useState<any[]>([]);
  const [isCloudPickerOpen, setIsCloudPickerOpen] = useState(false);
  const [selectedCloudProvider, setSelectedCloudProvider] = useState("zoho");
  const [cloudSearchQuery, setCloudSearchQuery] = useState("");
  const [selectedCloudFiles, setSelectedCloudFiles] = useState<any[]>([]);
  const [isNewCurrencyModalOpen, setIsNewCurrencyModalOpen] = useState(false);
  const [newCurrencyForm, setNewCurrencyForm] = useState({
    code: "",
    symbol: "",
    name: "",
    decimalPlaces: "2",
    format: "1234567.89"
  });
  const [availableCurrencies, setAvailableCurrencies] = useState<any[]>([]);
  const [baseCurrency, setBaseCurrency] = useState<any>(null);

  const [configureTermsOpen, setConfigureTermsOpen] = useState(false);
  const [paymentTermsList, setPaymentTermsList] = useState<PaymentTerm[]>(defaultPaymentTerms);

  // Customer Number Settings State
  const [enableCustomerNumbers, setEnableCustomerNumbers] = useState(true);
  const [customerNumberPrefix, setCustomerNumberPrefix] = useState("CUS-");
  const [customerNumberStart, setCustomerNumberStart] = useState("00003");
  const [isCustomerNumberSettingsModalOpen, setIsCustomerNumberSettingsModalOpen] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isCustomerNumberManuallyEdited, setIsCustomerNumberManuallyEdited] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [availableTaxes, setAvailableTaxes] = useState<any[]>([]);
  const [isNewTaxModalOpen, setIsNewTaxModalOpen] = useState(false);

  const loadTaxes = useCallback(async () => {
    try {
      const response = readTaxesLocal();
      const normalized = (Array.isArray(response) ? response : [])
        .filter((t: any) => t.isActive !== false)
        .map((t: any) => ({
          ...t,
          id: String(t?._id || t?.id || ""),
        }))
        .filter((t: any) => t.id);
      setAvailableTaxes(normalized);

    } catch (error) {
      setAvailableTaxes([]);
    }
  }, []);

  useEffect(() => {
    loadTaxes();
  }, [loadTaxes]);

  const loadPriceLists = useCallback(() => {
    try {
      const raw = localStorage.getItem('inv_price_lists_v1');
      const parsed = raw ? JSON.parse(raw) : [];
      if (Array.isArray(parsed)) {
        setPriceLists(parsed.map((p: any) => ({
          id: String(p.id || p._id || ""),
          name: String(p.name || ""),
          currency: String(p.currency || ""),
          pricingScheme: String(p.pricingScheme || "")
        })));
      }
    } catch (error) {
      console.error("Error loading price lists:", error);
      setPriceLists([]);
    }
  }, []);

  const [availableReportingTags, setAvailableReportingTags] = useState<any[]>([]);

  const normalizeReportingTagOptions = (tag: any): string[] => {
    const candidates = Array.isArray(tag?.options)
      ? tag.options
      : Array.isArray(tag?.values)
        ? tag.values
        : [];

    return candidates
      .map((option: any) => {
        if (typeof option === "string") return option.trim();
        if (option && typeof option === "object") {
          return String(
            option.value ??
            option.label ??
            option.name ??
            option.option ??
            option.title ??
            ""
          ).trim();
        }
        return "";
      })
      .filter((value: string) => Boolean(value));
  };

  const normalizeReportingTagAppliesTo = (tag: any): string[] => {
    const direct = Array.isArray(tag?.appliesTo) ? tag.appliesTo : [];
    const fromModulesObject = tag?.modules && typeof tag.modules === "object"
      ? Object.keys(tag.modules).filter((key) => Boolean(tag.modules[key]))
      : [];
    const fromModuleSettings = tag?.moduleSettings && typeof tag.moduleSettings === "object"
      ? Object.keys(tag.moduleSettings).filter((key) => Boolean(tag.moduleSettings[key]))
      : [];
    const fromAssociations = Array.isArray(tag?.associations) ? tag.associations : [];
    const fromModulesList = Array.isArray(tag?.modulesList) ? tag.modulesList : [];

    return [...direct, ...fromModulesObject, ...fromModuleSettings, ...fromAssociations, ...fromModulesList]
      .map((value: any) => String(value || "").toLowerCase().trim())
      .filter(Boolean);
  };

  const loadReportingTags = useCallback(async () => {
    try {
      const response = await reportingTagsAPI.getAll();
      const rows = Array.isArray(response) ? response : (response?.data || []);
      if (!Array.isArray(rows)) {
        setAvailableReportingTags([]);
        return;
      }

      const filtered = rows
        .filter((tag: any) => {
          const appliesTo = normalizeReportingTagAppliesTo(tag);
          const hasCustomersAssociation = appliesTo.some((entry) => entry.includes("customer"));
          return hasCustomersAssociation;
        })
        .map((tag: any) => ({
          ...tag,
          options: normalizeReportingTagOptions(tag),
        }));

      const tagsToUse = filtered.length > 0
        ? filtered
        : rows.map((tag: any) => ({
          ...tag,
          options: normalizeReportingTagOptions(tag),
        }));

      setAvailableReportingTags(tagsToUse);
    } catch (error) {
      console.error("Error loading reporting tags:", error);
      setAvailableReportingTags([]);
    }
  }, []);

  useEffect(() => {
    loadReportingTags();
  }, [loadReportingTags]);

  useEffect(() => {
    if (activeTab === "reporting-tags") {
      loadReportingTags();
    }
  }, [activeTab, loadReportingTags]);



  // Contact person dropdown states
  const [openContactDropdown, setOpenContactDropdown] = useState<{ id: number, type: 'work' | 'mobile' } | null>(null);
  const [contactDropdownSearch, setContactDropdownSearch] = useState("");

  const closeAllDropdowns = () => {
    setOpenContactDropdown(null);
    setIsCurrencyDropdownOpen(false);
    setIsAccountsReceivableDropdownOpen(false);
    setIsBillingCountryDropdownOpen(false);
    setIsShippingCountryDropdownOpen(false);
    setIsBillingStateDropdownOpen(false);
    setIsShippingStateDropdownOpen(false);
    setIsDisplayNameDropdownOpen(false);
    setIsCustomerLanguageDropdownOpen(false);
    setIsWorkPhonePrefixDropdownOpen(false);
    setIsMobilePrefixDropdownOpen(false);
    setIsUploadDropdownOpen(false);
    setIsPriceListDropdownOpen(false);
  };



  const [formData, setFormData] = useState({
    customerType: "business",
    salutation: "",
    firstName: "",
    lastName: "",
    companyName: "",
    displayName: "",
    email: "",
    workPhonePrefix: "+358",
    workPhone: "",
    mobilePrefix: "+252",
    mobile: "",
    customerLanguage: "english",
    taxRate: "",
    companyId: "",
    locationCode: "",
    currency: "USD",
    exchangeRate: "1.00",
    accountsReceivable: "",
    openingBalance: "",
    paymentTerms: "due-on-receipt",
    priceListId: "",
    enablePortal: false,
    customerOwner: "",
    websiteUrl: "",
    department: "",
    designation: "",
    xHandle: "",
    skypeName: "",
    facebook: "",
    customerNumber: "CUS-00003",
    billingAttention: "",
    billingCountry: "",
    billingStreet1: "",
    billingStreet2: "",
    billingCity: "",
    billingState: "",
    billingZipCode: "",
    billingPhone: "",
    billingFax: "",
    shippingAttention: "",
    shippingCountry: "",
    shippingStreet1: "",
    shippingStreet2: "",
    shippingCity: "",
    shippingState: "",
    shippingZipCode: "",
    shippingPhone: "",
    shippingFax: "",
    documents: [] as any[], // Array to store uploaded files
    contactPersons: [] as any[], // Array for contact persons
    customFields: {}, // Object for custom fields
    reportingTags: [] as any[], // Array for reporting tags
    remarks: "" // Remarks text
  });

  // Handle cloned data from router state
  useEffect(() => {
    if (location.state?.clonedData && !isEditMode) {
      const cloned = location.state.clonedData;

      const workPhoneData = splitPhoneNumber(cloned.workPhone || "", "+358");
      const mobileData = cloned.mobile ? splitPhoneNumber(cloned.mobile, "+252") : { prefix: "+252", number: "" };

      setFormData(prev => ({
        ...prev,
        customerType: cloned.customerType || "business",
        salutation: cloned.salutation || "",
        firstName: cloned.firstName || "",
        lastName: cloned.lastName || "",
        companyName: cloned.companyName || "",
        displayName: cloned.displayName || cloned.name || "",
        email: cloned.email || "",
        workPhonePrefix: workPhoneData.prefix,
        workPhone: workPhoneData.number,
        mobilePrefix: mobileData.prefix,
        mobile: mobileData.number,
        customerLanguage: cloned.customerLanguage || "english",
        taxRate: cloned.taxRate || "",
        companyId: cloned.companyId || "",
        locationCode: cloned.locationCode || "",
        currency: cloned.currency || "USD",
        accountsReceivable: cloned.accountsReceivable || "",
        openingBalance: cloned.openingBalance || "",
        paymentTerms: cloned.paymentTerms || "due-on-receipt",
        priceListId: cloned.priceListId || "",
        enablePortal: cloned.enablePortal || false,
        customerOwner: cloned.customerOwner || "",
        websiteUrl: cloned.websiteUrl || "",
        department: cloned.department || "",
        designation: cloned.designation || "",
        xHandle: cloned.xHandle || "",
        skypeName: cloned.skypeName || "",
        facebook: cloned.facebook || "",
        billingAttention: cloned.billingAddress?.attention || cloned.billingAttention || "",
        billingCountry: cloned.billingAddress?.country || cloned.billingCountry || "",
        billingStreet1: cloned.billingAddress?.street1 || cloned.billingStreet1 || "",
        billingStreet2: cloned.billingAddress?.street2 || cloned.billingStreet2 || "",
        billingCity: cloned.billingAddress?.city || cloned.billingCity || "",
        billingState: cloned.billingAddress?.state || cloned.billingState || "",
        billingZipCode: cloned.billingAddress?.zipCode || cloned.billingZipCode || "",
        billingPhone: cloned.billingAddress?.phone || cloned.billingPhone || "",
        billingFax: cloned.billingAddress?.fax || cloned.billingFax || "",
        shippingAttention: cloned.shippingAddress?.attention || cloned.shippingAttention || "",
        shippingCountry: cloned.shippingAddress?.country || cloned.shippingCountry || "",
        shippingStreet1: cloned.shippingAddress?.street1 || cloned.shippingStreet1 || "",
        shippingStreet2: cloned.shippingAddress?.street2 || cloned.shippingStreet2 || "",
        shippingCity: cloned.shippingAddress?.city || cloned.shippingCity || "",
        shippingState: cloned.shippingAddress?.state || cloned.shippingState || "",
        shippingZipCode: cloned.shippingAddress?.zipCode || cloned.shippingZipCode || "",
        shippingPhone: cloned.shippingAddress?.phone || cloned.shippingPhone || "",
        shippingFax: cloned.shippingAddress?.fax || cloned.shippingFax || "",
        remarks: cloned.remarks || cloned.notes || "",
        exchangeRate: cloned.exchangeRate || "1.00",
        contactPersons: (cloned.contactPersons || []).map((cp) => {
          const cpWorkPhoneData = splitPhoneNumber(cp.workPhone || cp.phone || "", "+358");
          const cpMobileData = cp.mobile ? splitPhoneNumber(cp.mobile, "+252") : { prefix: "+252", number: "" };
          return {
            ...cp,
            workPhonePrefix: cpWorkPhoneData.prefix,
            workPhone: cpWorkPhoneData.number,
            mobilePrefix: cpMobileData.prefix,
            mobile: cpMobileData.number
          };
        }),
        customFields: cloned.customFields || {},
        reportingTags: cloned.reportingTags || []
      }));

      // Set manual edit flag to true so auto-update doesn't overwrite the cloned display name
      if (cloned.displayName || cloned.name) {
        setIsDisplayNameManuallyEdited(true);
      }
    }
  }, [location.state, isEditMode]);




  // Load default customer type from settings (only for new customers)
  useEffect(() => {
    if (!isEditMode) {
      const loadDefaultCustomerType = async () => {
        try {
          const token = getToken();
          if (!token) return;

          const response = await fetch(`${API_BASE_URL}/settings/customers-vendors`, {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });

          if (response.ok) {
            const data = await response.json();
            if (data.success && data.data) {
              // Set default customer type if available
              if (data.data.defaultCustomerType) {
                setFormData(prev => ({
                  ...prev,
                  customerType: data.data.defaultCustomerType
                }));
              }

              // Handle Customer Number settings
              if (data.data.enableCustomerNumbers !== undefined) {
                setEnableCustomerNumbers(data.data.enableCustomerNumbers);
              }
              const prefPrefix = data.data.customerNumberPrefix || "CUS-";
              const prefStart = data.data.customerNumberStart || "00003";
              setCustomerNumberPrefix(prefPrefix);
              setCustomerNumberStart(prefStart);
            }
          }
        } catch (error) {
          // Keep default "business" on any settings load failure
        }
      };

      loadDefaultCustomerType();
    }
  }, [isEditMode]);

  // Fetch currencies from backend
  useEffect(() => {
    const fetchCurrencies = async () => {
      try {
        const response = await currenciesAPI.getAll({ isActive: true });
        if (response && response.success) {
          setAvailableCurrencies(response.data);
          const base = response.data.find((c: any) => c.isBaseCurrency);
          if (base) setBaseCurrency(base);

          // Set default currency if not in edit mode
          if (!isEditMode && response.data.length > 0) {
            if (base) {
              setFormData(prev => ({ ...prev, currency: base.code, exchangeRate: "1.00" }));
            } else if (response.data.some(c => c.code === "USD")) {
              setFormData(prev => ({ ...prev, currency: "USD", exchangeRate: "1.00" }));
            } else {
              setFormData(prev => ({ ...prev, currency: response.data[0].code, exchangeRate: "1.00" }));
            }
          }
        }
      } catch (error) { }
    };
    fetchCurrencies();
  }, [isEditMode]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedCustomers, setSelectedCustomers] = useState<any[]>([]);

  const formatCurrency = (amount: any, currency = "USD") => {
    const numAmount = parseFloat(amount) || 0;
    return `${currency}${numAmount.toFixed(2)}`;
  };

  const handleCustomerCheckboxChange = (customerId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedCustomers.includes(customerId)) {
      setSelectedCustomers(selectedCustomers.filter(id => id !== customerId));
    } else {
      setSelectedCustomers([...selectedCustomers, customerId]);
    }
  };

  const handleSelectAllCustomers = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedCustomers(customers.map((c: { id: string | number }) => c.id));
    } else {
      setSelectedCustomers([]);
    }
  };

  const handleClearSelection = () => {
    setSelectedCustomers([]);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type, checked } = e.target as any;
    setFormData((prev: typeof formData) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }));
    if (name && errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
    // Track if display name is manually edited
    if (name === "displayName") {
      setIsDisplayNameManuallyEdited(true);
    } else if (name === "customerNumber") {
      setIsCustomerNumberManuallyEdited(true);
    } else if (name === "firstName" || name === "lastName" || name === "companyName") {
      // Reset manual edit flag when these fields change so display name can auto-update
      setIsDisplayNameManuallyEdited(false);
    }
  };

  const applyNextCustomerNumber = useCallback(
    async (force = false) => {
      if (isEditMode) return;
      if (!enableCustomerNumbers && !force) return;
      if (!force && isCustomerNumberManuallyEdited) return;
      try {
        const nextNumber = await customersAPI.getNextCustomerNumber({
          prefix: customerNumberPrefix,
          start: customerNumberStart,
        });
        setFormData((prev) => ({ ...prev, customerNumber: nextNumber }));
        if (force) setIsCustomerNumberManuallyEdited(false);
        setErrors((prev) => ({ ...prev, customerNumber: "" }));
      } catch {
        // Ignore auto-number failures; validation handles missing values.
      }
    },
    [
      isEditMode,
      enableCustomerNumbers,
      isCustomerNumberManuallyEdited,
      customerNumberPrefix,
      customerNumberStart,
    ]
  );

  useEffect(() => {
    applyNextCustomerNumber(false);
  }, [applyNextCustomerNumber]);

  // Auto-update display name when firstName, lastName, or companyName changes
  useEffect(() => {
    // Only auto-update if display name hasn't been manually edited
    if (!isDisplayNameManuallyEdited) {
      let generatedName = "";
      if (formData.companyName && formData.companyName.trim()) {
        generatedName = formData.companyName.trim();
      } else {
        const firstName = formData.firstName ? formData.firstName.trim() : "";
        const lastName = formData.lastName ? formData.lastName.trim() : "";
        if (firstName && lastName) {
          generatedName = `${firstName} ${lastName}`;
        } else if (firstName) {
          generatedName = firstName;
        } else if (lastName) {
          generatedName = lastName;
        }
      }
      if (generatedName) {
        setFormData(prev => ({ ...prev, displayName: generatedName }));
      } else if (!generatedName && !formData.displayName) {
        setFormData(prev => ({ ...prev, displayName: "" }));
      }
    }
  }, [formData.firstName, formData.lastName, formData.companyName]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);

    // Validate file count
    if (formData.documents.length + files.length > 10) {
      toast.error("You can upload a maximum of 10 files");
      return;
    }

    // Validate file sizes (10MB each)
    const invalidFiles = files.filter(file => file.size > 10 * 1024 * 1024);
    if (invalidFiles.length > 0) {
      toast.error("Some files exceed 10MB limit. Maximum file size is 10MB.");
      return;
    }

    // Add files to documents array
    const newFiles = files.map(file => ({
      id: Date.now() + Math.random(),
      name: file.name,
      size: file.size,
      file: file
    }));

    setFormData(prev => ({
      ...prev,
      documents: [...prev.documents, ...newFiles]
    }));

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRemoveFile = (fileId) => {
    setFormData(prev => ({
      ...prev,
      documents: prev.documents.filter(doc => doc.id !== fileId)
    }));
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  // Helper function to parse file size string to bytes
  const parseFileSize = (sizeStr) => {
    if (typeof sizeStr === 'number') return sizeStr;
    if (!sizeStr) return 0;

    const match = sizeStr.toString().match(/^([\d.]+)\s*(B|KB|MB|GB)$/i);
    if (!match) return 0;

    const value = parseFloat(match[1]);
    const unit = match[2].toUpperCase();

    const multipliers = { B: 1, KB: 1024, MB: 1024 * 1024, GB: 1024 * 1024 * 1024 };
    return Math.round(value * (multipliers[unit] || 1));
  };

  // Load documents when modal opens
  useEffect(() => {
    if (isDocumentsModalOpen) {
      const documents = getAllDocuments();
      setAvailableDocuments(documents);
    }
  }, [isDocumentsModalOpen]);

  // Listen for document updates
  useEffect(() => {
    const handleDocumentUpdate = () => {
      if (isDocumentsModalOpen) {
        const documents = getAllDocuments();
        setAvailableDocuments(documents);
      }
    };

    window.addEventListener('documentAdded', handleDocumentUpdate);
    window.addEventListener('documentDeleted', handleDocumentUpdate);
    window.addEventListener('documentUpdated', handleDocumentUpdate);

    return () => {
      window.removeEventListener('documentAdded', handleDocumentUpdate);
      window.removeEventListener('documentDeleted', handleDocumentUpdate);
      window.removeEventListener('documentUpdated', handleDocumentUpdate);
    };
  }, [isDocumentsModalOpen]);

  // Load customer data when in edit mode
  useEffect(() => {
    const loadCustomerData = async () => {
      if (isEditMode && id) {
        setIsLoading(true);
        try {
          const response = await customersAPI.getById(id);
          const customer = response?.data?.customer || response?.data || response;

          if (customer && (customer.id || customer._id || id)) {
            setExistingCustomerData(customer);
            const workPhoneData = splitPhoneNumber(customer.workPhone || customer.phone || customer.work_phone || "", "+358");
            const mobileData = splitPhoneNumber(customer.mobile || customer.mobilePhone || customer.mobile_phone || "", "+252");

            const contactPersons = (customer.contactPersons || []).map((cp: any) => {
              const cpWorkPhoneData = splitPhoneNumber(cp.workPhone || cp.phone || "", "+358");
              const cpMobileData = splitPhoneNumber(cp.mobile || "", "+252");
              return {
                ...cp,
                workPhonePrefix: cpWorkPhoneData.prefix,
                workPhone: cpWorkPhoneData.number,
                mobilePrefix: cpMobileData.prefix,
                mobile: cpMobileData.number
              };
            });

            setFormData({
              customerType: customer.customerType || "business",
              salutation: customer.salutation || "",
              firstName: customer.firstName || "",
              lastName: customer.lastName || "",
              companyName: customer.companyName || "",
              displayName: customer.displayName || customer.name || "",
              email: customer.email || "",
              workPhonePrefix: workPhoneData.prefix,
              workPhone: workPhoneData.number,
              mobilePrefix: mobileData.prefix,
              mobile: mobileData.number,
              customerLanguage: customer.customerLanguage || customer.portalLanguage || "english",
              taxRate: customer.taxRate || "",
              companyId: customer.companyId || "",
              locationCode: customer.locationCode || "",
              currency: customer.currency || "USD",
              accountsReceivable: customer.accountsReceivable || "",
              openingBalance: customer.receivables?.toString() || customer.openingBalance || "",
              paymentTerms: customer.paymentTerms || "due-on-receipt",
              priceListId: customer.priceListId || "",
              enablePortal: customer.enablePortal || false,
              customerOwner: customer.customerOwner || customer.salesperson || "",
              websiteUrl: customer.websiteUrl || customer.website || "",
              department: customer.department || "",
              designation: customer.designation || "",
              xHandle: customer.xHandle || "",
              skypeName: customer.skypeName || "",
              facebook: customer.facebook || "",
              billingAttention: customer.billingAddress?.attention || customer.billingAttention || "",
              billingCountry: customer.billingAddress?.country || customer.billingCountry || "",
              billingStreet1: customer.billingAddress?.street1 || customer.billingStreet1 || "",
              billingStreet2: customer.billingAddress?.street2 || customer.billingStreet2 || "",
              billingCity: customer.billingAddress?.city || customer.billingCity || "",
              billingState: customer.billingAddress?.state || customer.billingState || "",
              billingZipCode: customer.billingAddress?.zipCode || customer.billingZipCode || "",
              billingPhone: customer.billingAddress?.phone || customer.billingPhone || "",
              billingFax: customer.billingAddress?.fax || customer.billingFax || "",
              shippingAttention: customer.shippingAddress?.attention || customer.shippingAttention || "",
              shippingCountry: customer.shippingAddress?.country || customer.shippingCountry || "",
              shippingStreet1: customer.shippingAddress?.street1 || customer.shippingStreet1 || "",
              shippingStreet2: customer.shippingAddress?.street2 || customer.shippingStreet2 || "",
              shippingCity: customer.shippingAddress?.city || customer.shippingCity || "",
              shippingState: customer.shippingAddress?.state || customer.shippingState || "",
              shippingZipCode: customer.shippingAddress?.zipCode || customer.shippingZipCode || "",
              shippingPhone: customer.shippingAddress?.phone || customer.shippingPhone || "",
              shippingFax: customer.shippingAddress?.fax || customer.shippingFax || "",
              documents: customer.documents || [],
              contactPersons: contactPersons,
              customFields: customer.customFields || {},
              reportingTags: customer.reportingTags || [],
              remarks: customer.remarks || customer.notes || "",
              exchangeRate: customer.exchangeRate || "1.00",
              customerNumber: customer.customerNumber || customer.customer_number || ""
            });
            setIsLoading(false);
          } else {
            toast.error("Customer not found. You can still edit the form, but changes won't be saved to an existing customer.");
            setExistingCustomerData(null);
            setIsLoading(false);
          }
        } catch (error: any) {
          toast.error("Error loading customer: " + (error?.message || "Unknown error."));
          setExistingCustomerData(null);
          setIsLoading(false);
        }
      } else {
        setExistingCustomerData(null);
        setIsLoading(false);
      }
    };

    loadCustomerData();
  }, [isEditMode, id]);

  const handleSave = async () => {
    let resolvedCustomerNumber = String(formData.customerNumber || "").trim();
    if (!isEditMode && enableCustomerNumbers && !resolvedCustomerNumber) {
      try {
        resolvedCustomerNumber = await customersAPI.getNextCustomerNumber({
          prefix: customerNumberPrefix,
          start: customerNumberStart,
        });
        setFormData((prev) => ({ ...prev, customerNumber: resolvedCustomerNumber }));
        setIsCustomerNumberManuallyEdited(false);
      } catch {
        // Ignore; validation handles missing values.
      }
    }

    // Validation
    const errors: { [key: string]: string } = {};
    if (!formData.displayName?.trim()) {
      errors.displayName = "Display Name is required.";
    }
    if (enableCustomerNumbers && !resolvedCustomerNumber) {
      errors.customerNumber = "Customer Number is required.";
    }

    if (Object.keys(errors).length > 0) {
      setErrors(errors);
      // Scroll to the error
      const firstErrorField = Object.keys(errors)[0];
      const errorElement = document.querySelector(`[name="${firstErrorField}"]`);
      if (errorElement) {
        errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        (errorElement as HTMLElement).focus();
      }
      return;
    }

    setIsSaving(true);

    try {
      // Process file uploads
      const processedDocuments = [];
      if (formData.documents && formData.documents.length > 0) {
        for (const doc of formData.documents) {
          if (doc.file) {
            // New file upload
            try {
              const uploadResponse = await documentsAPI.upload(doc.file);
              if (uploadResponse.success && uploadResponse.data) {
                processedDocuments.push({
                  name: doc.name,
                  url: uploadResponse.data.url,
                  uploadedAt: new Date()
                });
              }
            } catch (error) {
              // Optimistically continue or alert? Continuing for now.
            }
          } else {
            // Existing file
            processedDocuments.push({
              name: doc.name,
              url: doc.url || doc.base64 || '',
              uploadedAt: doc.uploadedAt || new Date()
            });
          }
        }
      }

      // Prepare customer data for saving (matching API structure)
      const customerData = {
        displayName: formData.displayName || formData.companyName || `${formData.firstName} ${formData.lastName}`.trim(),
        name: formData.displayName || formData.companyName || `${formData.firstName} ${formData.lastName}`.trim(),
        customerType: formData.customerType || (formData.companyName ? 'business' : 'individual'),
        salutation: formData.salutation || '',
        firstName: formData.firstName || '',
        lastName: formData.lastName || '',
        companyName: formData.companyName || '',
        email: formData.email || '',
        workPhone: formData.workPhonePrefix ? `${formData.workPhonePrefix} ${formData.workPhone}`.trim() : formData.workPhone,
        mobile: formData.mobilePrefix ? `${formData.mobilePrefix} ${formData.mobile}`.trim() : formData.mobile,
        websiteUrl: formData.websiteUrl || '',
        xHandle: formData.xHandle || '',
        skypeName: formData.skypeName || '',
        facebook: formData.facebook || '',
        customerNumber: enableCustomerNumbers ? (resolvedCustomerNumber || "") : "",
        customerLanguage: formData.customerLanguage || 'english',
        taxRate: formData.taxRate || '',
        exchangeRate: parseFloat(formData.exchangeRate || "1"),
        companyId: formData.companyId || '',
        locationCode: formData.locationCode || '',
        currency: formData.currency || 'KES',
        paymentTerms: formData.paymentTerms || 'due-on-receipt',
        department: formData.department || '',
        designation: formData.designation || '',
        accountsReceivable: formData.accountsReceivable || '',
        openingBalance: formData.openingBalance || '0.00',
        receivables: parseFloat(formData.openingBalance || "0"),
        enablePortal: formData.enablePortal || false,
        customerOwner: formData.customerOwner || '',
        remarks: formData.remarks || '',
        notes: formData.remarks || '',
        billingAddress: {
          attention: formData.billingAttention || '',
          country: formData.billingCountry || '',
          street1: formData.billingStreet1 || '',
          street2: formData.billingStreet2 || '',
          city: formData.billingCity || '',
          state: formData.billingState || '',
          zipCode: formData.billingZipCode || '',
          phone: formData.billingPhone || '',
          fax: formData.billingFax || ''
        },
        shippingAddress: {
          attention: formData.shippingAttention || '',
          country: formData.shippingCountry || '',
          street1: formData.shippingStreet1 || '',
          street2: formData.shippingStreet2 || '',
          city: formData.shippingCity || '',
          state: formData.shippingState || '',
          zipCode: formData.shippingZipCode || '',
          phone: formData.shippingPhone || '',
          fax: formData.shippingFax || ''
        },
        contactPersons: (formData.contactPersons || []).filter(cp => cp.firstName || cp.lastName).map(cp => ({
          salutation: cp.salutation || '',
          firstName: cp.firstName,
          lastName: cp.lastName,
          email: cp.email || '',
          workPhone: cp.workPhonePrefix ? `${cp.workPhonePrefix} ${cp.workPhone}`.trim() : (cp.workPhone || ''),
          mobile: cp.mobilePrefix ? `${cp.mobilePrefix} ${cp.mobile}`.trim() : (cp.mobile || ''),
          designation: cp.designation || '',
          department: cp.department || '',
          skypeName: cp.skypeName || '',
          isPrimary: cp.isPrimary || false
        })),
        documents: processedDocuments,
        customFields: formData.customFields || {},
        reportingTags: formData.reportingTags || []
      };

      let response;

      if (isEditMode && id) {
        const mergedCustomerData = existingCustomerData
          ? {
            ...existingCustomerData,
            ...customerData,
            billingAddress: {
              ...(existingCustomerData.billingAddress || {}),
              ...(customerData.billingAddress || {}),
            },
            shippingAddress: {
              ...(existingCustomerData.shippingAddress || {}),
              ...(customerData.shippingAddress || {}),
            },
            contactPersons: customerData.contactPersons,
            documents: customerData.documents,
            customFields: customerData.customFields,
            reportingTags: customerData.reportingTags,
          }
          : customerData;
        response = await customersAPI.update(id, mergedCustomerData);
      } else {
        response = await customersAPI.create(customerData);
      }

      if (response && response.success) {
        // Ensure the customer data has name properly set
        const savedCustomer = response.data;
        upsertCustomerCache(savedCustomer);
        toast.success(isEditMode ? "Customer updated successfully." : "Customer created successfully.");

        const searchParams = new URLSearchParams(location.search);
        const isEmbeddedQuickAction =
          searchParams.get("embed") === "1" || searchParams.get("quickAction") === "1";
        if (!isEditMode && isEmbeddedQuickAction && window.parent && window.parent !== window) {
          window.parent.postMessage(
            {
              type: "quick-action-created",
              entity: "customer",
              data: savedCustomer
            },
            window.location.origin
          );
        }

        // Dispatch custom event to notify Customers component and CustomerDetail component
        const event = new CustomEvent("customersUpdated", {
          detail: {
            customer: savedCustomer,
            action: isEditMode ? 'updated' : 'created'
          }
        });
        window.dispatchEvent(event);

        if (saveAndSubscribeRef.current) {
          const customerId = savedCustomer?._id || savedCustomer?.id;
          const customerName = savedCustomer?.name || savedCustomer?.displayName || savedCustomer?.companyName || "Customer";
          saveAndSubscribeRef.current = false;
          navigate("/sales/subscriptions/new", { state: { customerId, customerName } });
          return;
        }

        // Navigate back
        setTimeout(() => {
          const returnTo = location.state?.returnTo;
          if (returnTo) {
            navigate(returnTo);
          } else if (isEditMode && id) {
            // If editing, navigate back to customer detail page
            navigate(`/sales/customers/${id}`);
          } else {
            navigate("/sales/customers");
          }
        }, 100);
      } else {
        throw new Error(response?.message || 'Failed to save customer');
      }
    } catch (error: any) {
      toast.error("Failed to save customer: " + (error.message || "Unknown error."));
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    const searchParams = new URLSearchParams(location.search);
    const isEmbeddedQuickAction =
      searchParams.get("embed") === "1" || searchParams.get("quickAction") === "1";

    if (isEmbeddedQuickAction && window.parent && window.parent !== window) {
      window.parent.postMessage(
        {
          type: "quick-action-cancel",
          entity: "customer"
        },
        window.location.origin
      );
      return;
    }

    navigate("/sales/customers");
  };

  const handleSaveCustomerNumberSettings = async () => {
    setIsSavingSettings(true);
    try {
      const token = getToken();
      if (token) {
        const currentRes = await fetch(`${API_BASE_URL}/settings/customers-vendors`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const currentData = currentRes.ok ? await currentRes.json() : { data: {} };

        const payload = {
          ...(currentData.data || {}),
          enableCustomerNumbers: true,
          customerNumberPrefix,
          customerNumberStart
        };

        await fetch(`${API_BASE_URL}/settings/customers-vendors`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        });
      }

      setEnableCustomerNumbers(true);
      await applyNextCustomerNumber(true);
      setIsCustomerNumberSettingsModalOpen(false);
    } catch (error: any) {
      toast.error("Error saving customer number settings: " + (error?.message || "Unknown error."));
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleSaveAndSubscribe = () => {
    saveAndSubscribeRef.current = true;
    handleSave();
  };

  const handleCopyBillingAddress = () => {
    setFormData(prev => ({
      ...prev,
      shippingAttention: prev.billingAttention,
      shippingCountry: prev.billingCountry,
      shippingStreet1: prev.billingStreet1,
      shippingStreet2: prev.billingStreet2,
      shippingCity: prev.billingCity,
      shippingState: prev.billingState,
      shippingZipCode: prev.billingZipCode,
      shippingPhone: prev.billingPhone,
      shippingFax: prev.billingFax
    }));
  };

  const filteredCurrencies = availableCurrencies.filter((currency: any) =>
    currency.code?.toLowerCase().includes(currencySearch.toLowerCase()) ||
    currency.name?.toLowerCase().includes(currencySearch.toLowerCase())
  );

  const handleCurrencySelect = (currency: any) => {
    const isBase = baseCurrency && currency.code === baseCurrency.code;
    setFormData(prev => ({
      ...prev,
      currency: currency.code,
      exchangeRate: isBase ? "1.00" : (currency.exchangeRate || "1.00")
    }));
    setIsCurrencyDropdownOpen(false);
    setCurrencySearch("");
  };

  const handleNewCurrencyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewCurrencyForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveNewCurrency = async (data: any) => {
    try {
      // Add new currency to the list
      const newCurrencyData = {
        code: (data.code.includes(" - ") ? data.code.split(" - ")[0] : data.code).toUpperCase(),
        name: data.name,
        symbol: data.symbol,
        decimalPlaces: parseInt(data.decimalPlaces) || 2,
        format: data.format,
        isBaseCurrency: data.isBaseCurrency || false
      };

      const response = await currenciesAPI.create(newCurrencyData);

      if (response && response.success) {
        const savedCurrency = response.data || newCurrencyData;

        setAvailableCurrencies(prev => [...prev, savedCurrency]);

        // Select the new currency
        setFormData(prev => ({ ...prev, currency: savedCurrency.code }));

        // Close modal
        setIsNewCurrencyModalOpen(false);
        setIsCurrencyDropdownOpen(false);
        setCurrencySearch("");

        if (data.isBaseCurrency) {
          setBaseCurrency(savedCurrency);
        }
      } else {
        toast.error((response as any)?.message || "Failed to save currency");
      }
    } catch (error: any) {
      toast.error("Error saving currency: " + (error.message || "Unknown error"));
    }
  };

  const selectedAccount = accounts.find(a => a.id === formData.accountsReceivable) || null;

  const filteredAccounts = (accounts || []).filter((account: { id: string; name: string }) =>
    account.name.toLowerCase().includes(accountsReceivableSearch.toLowerCase())
  );

  const handleAccountSelect = (accountId: string) => {
    setFormData(prev => ({ ...prev, accountsReceivable: accountId }));
    setIsAccountsReceivableDropdownOpen(false);
    setAccountsReceivableSearch("");
  };

  const countryOptions = Country.getAllCountries();
  const allCountryNames = Array.from(
    new Set([...countryOptions.map((country) => country.name), ...Object.keys(countryData)])
  ).sort((a, b) => a.localeCompare(b));
  const normalizeCountryName = (value: string) =>
    value.toLowerCase().replace(/[^a-z0-9]/g, "");
  const countryAliases: Record<string, string> = {
    usa: "us",
    unitedstatesofamerica: "us",
    uk: "gb",
    unitedkingdomofgreatbritainandnorthernireland: "gb",
    uae: "ae",
    vietnam: "vn",
    southkorea: "kr",
    northkorea: "kp",
    russia: "ru",
    bolivia: "bo",
    tanzania: "tz",
    venezuela: "ve",
    laos: "la",
    moldova: "md",
    iran: "ir",
    syria: "sy",
  };
  const getCountryIsoByName = (countryName: string) => {
    if (!countryName) return "";
    const normalized = normalizeCountryName(countryName.trim());
    const resolved = countryAliases[normalized] || normalized;
    const matchedCountry = countryOptions.find((country) => {
      const normalizedName = normalizeCountryName(country.name);
      const normalizedIso = normalizeCountryName(country.isoCode);
      return normalizedName === resolved || normalizedIso === resolved;
    });
    return matchedCountry?.isoCode || "";
  };
  const getFallbackStatesByCountryName = (countryName: string) => {
    if (!countryName) return [];
    const normalized = normalizeCountryName(countryName.trim());
    const fallbackKey = Object.keys(countryData).find(
      (key) => normalizeCountryName(key) === normalized
    );
    return fallbackKey ? countryData[fallbackKey] : [];
  };
  const getStatesByCountryName = (countryName: string) => {
    const countryIso = getCountryIsoByName(countryName);
    const libraryStates = countryIso
      ? State.getStatesOfCountry(countryIso).map((state) => state.name)
      : [];
    return libraryStates.length > 0 ? libraryStates : getFallbackStatesByCountryName(countryName);
  };

  const filteredCountries = (searchTerm: string) => {
    return allCountryNames.filter((country) =>
      country.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const handleBillingCountrySelect = (country: string) => {
    const states = getStatesByCountryName(country);
    setFormData(prev => ({
      ...prev,
      billingCountry: country,
      // If states are available, default to the first for convenience
      billingState: states.length > 0 ? states[0] : ""
    }));
    setIsBillingCountryDropdownOpen(false);
    setBillingCountrySearch("");
    setBillingStateSearch("");
    // Open state dropdown so user can adjust quickly
    setIsBillingStateDropdownOpen(true);
  };

  const handleShippingCountrySelect = (country: string) => {
    const states = getStatesByCountryName(country);
    setFormData(prev => ({
      ...prev,
      shippingCountry: country,
      // If states are available, default to the first for convenience
      shippingState: states.length > 0 ? states[0] : ""
    }));
    setIsShippingCountryDropdownOpen(false);
    setShippingCountrySearch("");
    setShippingStateSearch("");
    // Open state dropdown so user can adjust quickly
    setIsShippingStateDropdownOpen(true);
  };

  const filteredStates = (searchTerm: string, country: string) => {
    const countryStates = getStatesByCountryName(country);
    return countryStates.filter((state: string) =>
      state.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const handleBillingStateSelect = (state: string) => {
    setFormData(prev => ({ ...prev, billingState: state }));
    setIsBillingStateDropdownOpen(false);
    setBillingStateSearch("");
  };

  const handleShippingStateSelect = (state: string) => {
    setFormData(prev => ({ ...prev, shippingState: state }));
    setIsShippingStateDropdownOpen(false);
    setShippingStateSearch("");
  };

  const filteredWorkPhonePrefixes = countryPhoneCodes.filter(cp =>
    cp.code.includes(workPhonePrefixSearch) || cp.name.toLowerCase().includes(workPhonePrefixSearch.toLowerCase())
  );

  const filteredMobilePrefixes = countryPhoneCodes.filter(cp =>
    cp.code.includes(mobilePrefixSearch) || cp.name.toLowerCase().includes(mobilePrefixSearch.toLowerCase())
  );

  const upsertCustomerCache = (customer: any) => {
    try {
      const customerId = String(customer?._id || customer?.id || "").trim();
      if (!customerId) return;

      const raw = localStorage.getItem(LOCAL_CUSTOMERS_CACHE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      const existing = Array.isArray(parsed) ? parsed : [];

      const normalizedCustomer = {
        ...customer,
        id: customerId,
        _id: customer?._id || customerId,
        name:
          customer?.name ||
          customer?.displayName ||
          customer?.companyName ||
          `${customer?.firstName || ""} ${customer?.lastName || ""}`.trim() ||
          "Customer",
      };

      const existingIndex = existing.findIndex((item: any) => {
        const itemId = String(item?._id || item?.id || "").trim();
        return itemId === customerId;
      });

      if (existingIndex >= 0) {
        existing[existingIndex] = { ...existing[existingIndex], ...normalizedCustomer };
      } else {
        existing.unshift(normalizedCustomer);
      }

      localStorage.setItem(LOCAL_CUSTOMERS_CACHE_KEY, JSON.stringify(existing));
    } catch (error) { }
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (currencyDropdownRef.current && !currencyDropdownRef.current.contains(target)) {
        setIsCurrencyDropdownOpen(false);
        setCurrencySearch("");
      }
      if (accountsReceivableDropdownRef.current && !accountsReceivableDropdownRef.current.contains(target)) {
        setIsAccountsReceivableDropdownOpen(false);
        setAccountsReceivableSearch("");
      }
      if (billingCountryDropdownRef.current && !billingCountryDropdownRef.current.contains(target)) {
        setIsBillingCountryDropdownOpen(false);
        setBillingCountrySearch("");
      }
      if (shippingCountryDropdownRef.current && !shippingCountryDropdownRef.current.contains(target)) {
        setIsShippingCountryDropdownOpen(false);
        setShippingCountrySearch("");
      }
      if (billingStateDropdownRef.current && !billingStateDropdownRef.current.contains(target)) {
        setIsBillingStateDropdownOpen(false);
        setBillingStateSearch("");
      }
      if (shippingStateDropdownRef.current && !shippingStateDropdownRef.current.contains(target)) {
        setIsShippingStateDropdownOpen(false);
        setShippingStateSearch("");
      }
      if (displayNameDropdownRef.current && !displayNameDropdownRef.current.contains(target)) {
        setIsDisplayNameDropdownOpen(false);
      }
      if (customerLanguageDropdownRef.current && !customerLanguageDropdownRef.current.contains(target)) {
        setIsCustomerLanguageDropdownOpen(false);
      }

      if (uploadDropdownRef.current && !uploadDropdownRef.current.contains(target)) {
        setIsUploadDropdownOpen(false);
      }
    };

    if (isCurrencyDropdownOpen || isAccountsReceivableDropdownOpen || isBillingCountryDropdownOpen || isShippingCountryDropdownOpen || isBillingStateDropdownOpen || isShippingStateDropdownOpen || isDisplayNameDropdownOpen || isCustomerLanguageDropdownOpen || isUploadDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isCurrencyDropdownOpen, isAccountsReceivableDropdownOpen, isBillingCountryDropdownOpen, isShippingCountryDropdownOpen, isBillingStateDropdownOpen, isShippingStateDropdownOpen, isDisplayNameDropdownOpen, isCustomerLanguageDropdownOpen, isUploadDropdownOpen]);

  const selectedCustomerLanguage = customerLanguageOptions.find(l => l.value === formData.customerLanguage) || customerLanguageOptions[0];
  const selectedCurrency = availableCurrencies.find(c => c.code === formData.currency) ||
    availableCurrencies.find(c => c.isBaseCurrency) ||
    (availableCurrencies.length > 0 ? availableCurrencies[0] : { code: formData.currency || "USD", name: "United States Dollar" });
  const embeddedSearchParams = new URLSearchParams(location.search);
  const isEmbeddedQuickAction =
    embeddedSearchParams.get("embed") === "1" || embeddedSearchParams.get("quickAction") === "1";





  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-xl p-8">
          <h1 className="text-2xl font-semibold text-gray-900">Loading...</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen flex flex-col bg-gray-50 overflow-x-hidden">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
        <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 m-0">{isEditMode ? "Edit Customer" : "New Customer"}</h1>
        {isEmbeddedQuickAction && (
          <button
            type="button"
            onClick={handleCancel}
            className="w-8 h-8 flex items-center justify-center text-red-500 hover:text-red-600 rounded"
            aria-label="Close customer form"
          >
            <X size={18} />
          </button>
        )}
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 overflow-y-auto overflow-x-hidden relative bg-gray-50">
          <div className="w-full max-w-4xl px-4 sm:px-6 py-5 sm:py-8 overflow-x-hidden">

            <div>
              <div className="space-y-6">
                {/* Customer Type */}
                <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-4 items-center">
                  <label className="text-[13px] font-medium text-gray-700 flex items-center gap-1">
                    Customer Type
                    <HelpTooltip text="Customers can be of two types: Business and Individual. Use Business if the customer is a company or organization, and Individual if they are a private person.">
                      <Info size={14} className="text-gray-400 cursor-help" />
                    </HelpTooltip>
                  </label>
                  <div className="flex items-center gap-6">
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <input
                        type="radio"
                        name="customerType"
                        value="business"
                        checked={formData.customerType === "business"}
                        onChange={handleChange}
                        className="w-4 h-4 text-[#156372] border-gray-300 focus:ring-[#156372] cursor-pointer"
                      />
                      <span className="text-[13px] text-gray-700 group-hover:text-gray-900 transition-colors">Business</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <input
                        type="radio"
                        name="customerType"
                        value="individual"
                        checked={formData.customerType === "individual"}
                        onChange={handleChange}
                        className="w-4 h-4 text-[#156372] border-gray-300 focus:ring-[#156372] cursor-pointer"
                      />
                      <span className="text-[13px] text-gray-700 group-hover:text-gray-900 transition-colors">Individual</span>
                    </label>
                  </div>
                </div>

                {/* Primary Contact */}
                <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-4 items-center">
                  <label className="text-[13px] font-medium text-gray-700 flex items-center gap-1">
                    Primary Contact
                    <HelpTooltip text="The primary contact will receive all emails related to transactions. You can add multiple contact persons below or from this customer's details page.">
                      <Info size={14} className="text-gray-400 cursor-help" />
                    </HelpTooltip>
                  </label>
                  <div className="flex gap-2 max-w-xl min-w-0">
                    <select
                      name="salutation"
                      value={formData.salutation}
                      onChange={handleChange}
                      className="w-32 px-3 py-1.5 border border-gray-300 rounded text-[13px] text-gray-700 bg-white focus:outline-none focus:ring-1 focus:ring-[#156372] focus:border-[#156372]"
                    >
                      <option value="">Salutation</option>
                      <option value="mr">Mr.</option>
                      <option value="mrs">Mrs.</option>
                      <option value="ms">Ms.</option>
                      <option value="dr">Dr.</option>
                    </select>
                    <input
                      type="text"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleChange}
                      placeholder="First Name"
                      className="flex-1 min-w-0 px-3 py-1.5 border border-gray-300 rounded text-[13px] text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#156372] focus:border-[#156372]"
                    />
                    <input
                      type="text"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleChange}
                      placeholder="Last Name"
                      className="flex-1 min-w-0 px-3 py-1.5 border border-gray-300 rounded text-[13px] text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#156372] focus:border-[#156372]"
                    />
                  </div>
                </div>

                {/* Company Name */}
                <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-4 items-center">
                  <label className="text-[13px] font-medium text-gray-700">Company Name</label>
                  <div className="max-w-md">
                    <input
                      type="text"
                      name="companyName"
                      value={formData.companyName}
                      onChange={handleChange}
                      className="w-full px-3 py-1.5 border border-gray-300 rounded text-[13px] text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#156372] focus:border-[#156372]"
                    />
                  </div>
                </div>

                {/* Display Name */}
                <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-4 items-center" ref={displayNameDropdownRef}>
                  <label className="text-[13px] font-medium text-red-600 flex items-center gap-1">
                    Display Name<span className="text-red-500">*</span>
                    <HelpTooltip text="This name will be displayed on all the transactions (invoices, quotes, etc.) you create for this customer.">
                      <Info size={14} className="text-gray-400 cursor-help" />
                    </HelpTooltip>
                  </label>
                  <div className="relative max-w-md">
                    <input
                      type="text"
                      name="displayName"
                      value={formData.displayName}
                      onChange={handleChange}
                      placeholder="Select or type to add"
                      className={`w-full px-3 py-1.5 pr-8 border rounded text-[13px] text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#156372] focus:border-[#156372] bg-white ${errors.displayName ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
                      required
                      onFocus={(e) => {
                        if (errors.displayName) {
                          setErrors(prev => {
                            const newErrors = { ...prev };
                            delete newErrors.displayName;
                            return newErrors;
                          });
                        }
                        closeAllDropdowns();
                        setIsDisplayNameDropdownOpen(true);
                        if (!formData.displayName || !isDisplayNameManuallyEdited) {
                          let generatedName = "";
                          if (formData.companyName && formData.companyName.trim()) {
                            generatedName = formData.companyName.trim();
                          } else {
                            const firstName = formData.firstName ? formData.firstName.trim() : "";
                            const lastName = formData.lastName ? formData.lastName.trim() : "";
                            if (firstName && lastName) {
                              generatedName = `${firstName} ${lastName}`;
                            } else if (firstName) {
                              generatedName = firstName;
                            } else if (lastName) {
                              generatedName = lastName;
                            }
                          }
                          if (generatedName) {
                            setFormData(prev => ({ ...prev, displayName: generatedName }));
                          }
                        }
                      }}
                    />
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    {isDisplayNameDropdownOpen && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded shadow-lg z-50">
                        {(() => {
                          const firstName = formData.firstName ? formData.firstName.trim() : "";
                          const lastName = formData.lastName ? formData.lastName.trim() : "";
                          const companyName = formData.companyName ? formData.companyName.trim() : "";
                          const options = [];
                          if (firstName && lastName) options.push(`${firstName} ${lastName}`);
                          if (lastName && firstName) options.push(`${lastName} ${firstName}`);
                          if (companyName) options.push(companyName);

                          return options.length > 0 ? (
                            options.map((option, index) => (
                              <div
                                key={index}
                                onClick={() => {
                                  setFormData(prev => ({ ...prev, displayName: option }));
                                  setIsDisplayNameManuallyEdited(true);
                                  setIsDisplayNameDropdownOpen(false);
                                }}
                                className="px-3 py-1.5 text-[13px] cursor-pointer hover:bg-gray-100 text-gray-700"
                              >
                                {option}
                              </div>
                            ))
                          ) : (
                            <div className="px-3 py-1.5 text-[13px] text-gray-500">
                              Enter First Name, Last Name, or Company Name to see options
                            </div>
                          );
                        })()}
                      </div>
                    )}
                    {errors.displayName && (
                      <p className="mt-1 text-xs text-red-500 font-medium">{errors.displayName}</p>
                    )}
                  </div>
                </div>

                {/* Email Address */}
                <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-4 items-center">
                  <label className="text-[13px] font-medium text-gray-700 flex items-center gap-1">
                    Email Address
                    <HelpTooltip text={<span><span className="font-bold">Privacy Info:</span> This data will be stored without encryption and will be visible only to your organisation users who have the required permission.</span>}>
                      <Info size={14} className="text-gray-400 cursor-help" />
                    </HelpTooltip>
                  </label>
                  <div className="relative max-w-md">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                      <Edit size={12} />
                    </div>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      className="w-full pl-9 pr-3 py-1.5 border border-gray-300 rounded text-[13px] text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#156372] focus:border-[#156372]"
                    />
                  </div>
                </div>

                {/* Customer Number */}
                <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-4 items-center">
                  <label className="text-[13px] font-medium text-red-600">
                    Customer Number<span className="text-red-500">*</span>
                  </label>
                  <div className="relative max-w-md">
                    <input
                      type="text"
                      name="customerNumber"
                      value={formData.customerNumber}
                      onChange={handleChange}
                      className={`w-full pr-16 px-3 py-1.5 border rounded text-[13px] text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#156372] focus:border-[#156372] bg-white ${errors.customerNumber ? "border-red-500 bg-red-50" : "border-gray-300"}`}
                      required
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                      <Settings
                        size={14}
                        className="text-[#156372] cursor-pointer hover:opacity-80"
                        onClick={() => setIsCustomerNumberSettingsModalOpen(true)}
                      />
                      <RefreshCw
                        size={14}
                        className="text-[#156372] cursor-pointer hover:opacity-80"
                        onClick={() => applyNextCustomerNumber(true)}
                      />
                    </div>
                    {errors.customerNumber && (
                      <p className="mt-1 text-xs text-red-500 font-medium">{errors.customerNumber}</p>
                    )}
                  </div>
                </div>

                {/* Phone */}
                <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-4 items-center">
                  <label className="text-[13px] font-medium text-gray-700 flex items-center gap-1">
                    Phone
                    <HelpTooltip text={<span><span className="font-bold">Privacy Info:</span> This data will be stored without encryption and will be visible only to your organisation users who have the required permission.</span>}>
                      <Info size={14} className="text-gray-400 cursor-help" />
                    </HelpTooltip>
                  </label>
                  <div className="flex flex-wrap gap-4 max-w-xl">
                    {/* Work Phone */}
                    <div className="flex items-center border border-gray-300 rounded bg-white w-64">
                      <div className="relative" ref={workPhonePrefixRef}>
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            const wasOpen = isWorkPhonePrefixDropdownOpen;
                            closeAllDropdowns();
                            setIsWorkPhonePrefixDropdownOpen(!wasOpen);
                          }}
                          className="flex items-center gap-1 px-2 py-1.5 border-r border-gray-300 text-[13px] cursor-pointer bg-gray-50 text-gray-600 hover:bg-gray-100 min-w-[70px] justify-between"
                        >
                          <span className="font-medium text-gray-700">{formData.workPhonePrefix}</span>
                          <ChevronDown size={12} className={`text-gray-400 transition-transform ${isWorkPhonePrefixDropdownOpen ? "rotate-180" : ""}`} />
                        </div>
                        {isWorkPhonePrefixDropdownOpen && (
                          <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-gray-200 rounded shadow-xl z-[1000] flex flex-col overflow-hidden">
                            <div className="p-2 border-b border-gray-100">
                              <input
                                type="text"
                                value={workPhonePrefixSearch}
                                onChange={(e) => setWorkPhonePrefixSearch(e.target.value)}
                                placeholder="Search"
                                className="w-full px-2 py-1 text-xs border border-gray-200 rounded focus:border-[#156372] outline-none"
                                autoFocus
                              />
                            </div>
                            <div className="max-h-48 overflow-y-auto">
                              {filteredWorkPhonePrefixes.map((cp, idx) => (
                                <div
                                  key={idx}
                                  onClick={() => {
                                    setFormData((prev: typeof formData) => ({ ...prev, workPhonePrefix: cp.code }));
                                    setIsWorkPhonePrefixDropdownOpen(false);
                                    setWorkPhonePrefixSearch("");
                                  }}
                                  className={`px-3 py-1.5 text-[12px] flex items-center gap-2 cursor-pointer hover:bg-gray-50 ${formData.workPhonePrefix === cp.code ? "bg-blue-50 text-[#156372]" : "text-gray-700"}`}
                                >
                                  <span className="font-medium">{cp.code}</span>
                                  <span className="truncate opacity-70">{cp.name}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                      <input
                        type="text"
                        name="workPhone"
                        value={formData.workPhone}
                        onChange={handleChange}
                        placeholder="Work Phone"
                        className="flex-1 px-3 py-1.5 text-[13px] text-gray-700 outline-none bg-transparent"
                      />
                    </div>

                    {/* Mobile Phone */}
                    <div className="flex items-center border border-gray-300 rounded bg-white w-64">
                      <div className="relative" ref={mobilePrefixRef}>
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            const wasOpen = isMobilePrefixDropdownOpen;
                            closeAllDropdowns();
                            setIsMobilePrefixDropdownOpen(!wasOpen);
                          }}
                          className="flex items-center gap-1 px-2 py-1.5 border-r border-gray-300 text-[13px] cursor-pointer bg-gray-50 text-gray-600 hover:bg-gray-100 min-w-[70px] justify-between"
                        >
                          <span className="font-medium text-gray-700">{formData.mobilePrefix}</span>
                          <ChevronDown size={12} className={`text-gray-400 transition-transform ${isMobilePrefixDropdownOpen ? "rotate-180" : ""}`} />
                        </div>
                        {isMobilePrefixDropdownOpen && (
                          <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-gray-200 rounded shadow-xl z-[1000] flex flex-col overflow-hidden">
                            <div className="p-2 border-b border-gray-100">
                              <input
                                type="text"
                                value={mobilePrefixSearch}
                                onChange={(e) => setMobilePrefixSearch(e.target.value)}
                                placeholder="Search"
                                className="w-full px-2 py-1 text-xs border border-gray-200 rounded focus:border-[#156372] outline-none"
                                autoFocus
                              />
                            </div>
                            <div className="max-h-48 overflow-y-auto">
                              {filteredMobilePrefixes.map((cp, idx) => (
                                <div
                                  key={idx}
                                  onClick={() => {
                                    setFormData((prev: typeof formData) => ({ ...prev, mobilePrefix: cp.code }));
                                    setIsMobilePrefixDropdownOpen(false);
                                    setMobilePrefixSearch("");
                                  }}
                                  className={`px-3 py-1.5 text-[12px] flex items-center gap-2 cursor-pointer hover:bg-gray-50 ${formData.mobilePrefix === cp.code ? "bg-blue-50 text-[#156372]" : "text-gray-700"}`}
                                >
                                  <span className="font-medium">{cp.code}</span>
                                  <span className="truncate opacity-70">{cp.name}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                      <input
                        type="text"
                        name="mobile"
                        value={formData.mobile}
                        onChange={handleChange}
                        placeholder="Mobile"
                        className="flex-1 px-3 py-1.5 text-[13px] text-gray-700 outline-none bg-transparent"
                      />
                    </div>
                  </div>
                </div>

                {/* Customer Language */}
                <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-4 items-center mb-10" ref={customerLanguageDropdownRef}>
                  <label className="text-[13px] font-medium text-gray-700 flex items-center gap-1">
                    Customer Language
                    <HelpTooltip text="The selected language will be used for the customer portal and all email communications.">
                      <Info size={14} className="text-gray-400 cursor-help" />
                    </HelpTooltip>
                  </label>
                  <div className="relative max-w-md">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        const wasOpen = isCustomerLanguageDropdownOpen;
                        closeAllDropdowns();
                        setIsCustomerLanguageDropdownOpen(!wasOpen);
                      }}
                      className="w-full px-3 py-1.5 border border-gray-300 rounded text-[13px] text-gray-700 bg-white flex items-center justify-between hover:border-gray-400 focus:outline-none focus:ring-1 focus:ring-[#156372] focus:border-[#156372]"
                    >
                      <span>{selectedCustomerLanguage.label}</span>
                      <ChevronDown size={14} className={`text-gray-400 transition-transform ${isCustomerLanguageDropdownOpen ? "rotate-180" : ""}`} />
                    </button>
                    {isCustomerLanguageDropdownOpen && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded shadow-lg z-50 max-h-60 overflow-y-auto">
                        {customerLanguageOptions.map((lang) => (
                          <div
                            key={lang.value}
                            onClick={() => {
                              setFormData(prev => ({ ...prev, customerLanguage: lang.value }));
                              setIsCustomerLanguageDropdownOpen(false);
                            }}
                            className={`px-3 py-1.5 text-[13px] cursor-pointer hover:bg-gray-100 ${formData.customerLanguage === lang.value ? "bg-blue-50 text-blue-600" : "text-gray-700"}`}
                          >
                            {lang.label}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Reporting Tags */}
                {availableReportingTags.length > 0 && (
                  <div className="space-y-4 mb-10">
                    {availableReportingTags.map((tag) => {
                      const tagId = tag._id || tag.id;
                      const currentTag = Array.isArray(formData.reportingTags)
                        ? formData.reportingTags.find((rt: any) => rt.tagId === tagId || rt.id === tagId)
                        : null;
                      const selectedVal = currentTag?.value || "";

                      const normalizedTagOptions = Array.isArray(tag.options) ? tag.options : [];
                      const selectedOptionMissing = selectedVal && !normalizedTagOptions.includes(selectedVal);
                      const options = [
                        { value: "", label: "None" },
                        ...normalizedTagOptions.map((opt: string) => ({ value: opt, label: opt })),
                        ...(selectedOptionMissing ? [{ value: selectedVal, label: selectedVal }] : []),
                      ];

                      return (
                        <div key={tagId} className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-4 items-center">
                          <label className={`text-[13px] font-medium flex items-center gap-1 ${tag.isMandatory ? 'text-red-500' : 'text-gray-700'}`}>
                            {tag.name} {tag.isMandatory && <span className="ml-0.5">*</span>}
                            {tag.description && (
                              <HelpTooltip text={tag.description}>
                                <Info size={14} className="text-gray-400 cursor-help" />
                              </HelpTooltip>
                            )}
                          </label>
                          <div className="w-full max-w-md">
                            <SearchableDropdown
                              value={selectedVal}
                              options={options}
                              onChange={(value) => {
                                setFormData(prev => {
                                  const existing = Array.isArray(prev.reportingTags) ? prev.reportingTags : [];
                                  const filtered = existing.filter((rt: any) => rt.tagId !== tagId && rt.id !== tagId);
                                  const updated = value
                                    ? [...filtered, { tagId, id: tagId, name: tag.name, value }]
                                    : filtered;
                                  return { ...prev, reportingTags: updated };
                                });
                              }}
                              placeholder="None"
                              accentColor="#156372"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>


              {/* Tabs */}
              <div className="flex gap-2 mb-6 border-b border-gray-200 overflow-x-auto whitespace-nowrap">
                {[
                  { id: "other-details", label: "Other Details" },
                  { id: "address", label: "Address" },
                  { id: "contact-persons", label: "Contact Persons" },
                  { id: "custom-fields", label: "Custom Fields" },
                  { id: "remarks", label: "Remarks" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    className={`shrink-0 px-4 py-2.5 text-[13px] transition-all border-b-2 font-medium ${activeTab === tab.id ? "text-[#156372] border-[#156372]" : "text-gray-500 hover:text-gray-700 border-transparent"}`}
                    onClick={() => {
                      if (tab.id === "contact-persons") {
                        setActiveTab("contact-persons");
                        if (formData.contactPersons.length === 0) {
                          const newContact = {
                            id: Date.now(),
                            salutation: "",
                            firstName: "",
                            lastName: "",
                            email: "",
                            workPhonePrefix: "+358",
                            workPhone: "",
                            mobilePrefix: "+252",
                            mobile: "",
                            skypeName: "",
                            designation: "",
                            department: ""
                          };
                          setFormData(prev => ({
                            ...prev,
                            contactPersons: [newContact]
                          }));
                        }
                      } else {
                        setActiveTab(tab.id);
                      }
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              <div className="mt-6">
                {activeTab === "other-details" && (
                  <div className="space-y-6">
                    {/* Tax Rate */}
                    <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-4 items-start">
                      <label className="text-[13px] font-medium text-gray-700 pt-1.5 flex items-center gap-1">
                        Tax Rate
                        <HelpTooltip text="To associate more than one tax, you need to create a tax group in Settings.">
                          <Info size={14} className="text-gray-400 cursor-help" />
                        </HelpTooltip>
                      </label>
                      <div className="w-full max-w-md">
                        <SearchableDropdown
                          value={formData.taxRate}
                          options={[
                            { value: "", label: "None" },
                            ...availableTaxes.map(tax => ({
                              value: tax.id,
                              label: `${tax.name} (${tax.rate}%)`,
                              customLabel: (
                                <span className="flex items-center gap-1.5 opacity-70">
                                  {isTaxGroupRecord(tax) ? "[Tax Group]" : tax.isCompound ? "[Compound Tax]" : "[Tax]"}
                                </span>
                              )
                            }))
                          ]}
                          onChange={(val) => setFormData(prev => ({ ...prev, taxRate: val }))}
                          onClear={() => setFormData(prev => ({ ...prev, taxRate: "" }))}
                          showClear={!!formData.taxRate}
                          placeholder="Select a Tax"
                          accentColor="#156372"
                          addNewLabel="New Tax"
                          onAddNew={() => setIsNewTaxModalOpen(true)}
                        />
                        <p className="mt-2 text-[11px] text-gray-500 leading-relaxed font-medium">
                          To associate more than one tax, you need to create a tax group in Settings.
                        </p>
                      </div>

                    </div>

                    {/* Company ID */}
                    <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-4 items-center">
                      <label className="text-[13px] font-medium text-gray-700 flex items-center gap-1">
                        Company ID
                        <HelpTooltip text="The unique identification number of the company.">
                          <Info size={14} className="text-gray-400 cursor-help" />
                        </HelpTooltip>
                      </label>
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

                    {/* Currency */}
                    <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-4 items-center" ref={currencyDropdownRef}>
                      <label className="text-[13px] font-medium text-gray-700 flex items-center gap-1">
                        Currency
                        <HelpTooltip text="The currency in which you want to track transactions for this customer.">
                          <Info size={14} className="text-gray-400 cursor-help" />
                        </HelpTooltip>
                      </label>
                      <div className="w-full max-w-md relative">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            const wasOpen = isCurrencyDropdownOpen;
                            closeAllDropdowns();
                            setIsCurrencyDropdownOpen(!wasOpen);
                          }}
                          className="w-full px-3 py-1.5 border border-gray-300 rounded text-[13px] text-gray-700 bg-white flex items-center justify-between hover:border-gray-400 focus:outline-none focus:ring-1 focus:ring-[#156372] focus:border-[#156372] transition-colors"
                        >
                          <span className="text-gray-700">{selectedCurrency.code} - {selectedCurrency.name}</span>
                          <ChevronDown size={14} className={`text-gray-400 transition-transform ${isCurrencyDropdownOpen ? "rotate-180" : ""}`} />
                        </button>

                        {isCurrencyDropdownOpen && (
                          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-md shadow-lg z-50 max-h-80 overflow-hidden flex flex-col">
                            <div className="flex items-center gap-2 p-3 bg-white border-b border-gray-100">
                              <Search size={18} className="text-gray-400 flex-shrink-0" />
                              <input
                                type="text"
                                placeholder="Search"
                                value={currencySearch}
                                onChange={(e) => setCurrencySearch(e.target.value)}
                                className="flex-1 border-none outline-none text-[13px] text-gray-700 bg-transparent placeholder-gray-400"
                                autoFocus
                              />
                            </div>
                            <div className="max-h-60 overflow-y-auto custom-scrollbar">
                              {filteredCurrencies.map((currency) => (
                                <div
                                  key={currency.code}
                                  onClick={() => handleCurrencySelect(currency)}
                                  className={`px-4 py-2.5 text-[13px] cursor-pointer flex items-center justify-between hover:bg-gray-50 transition-colors ${formData.currency === currency.code ? "bg-blue-50 text-blue-600 font-medium" : "text-gray-700"}`}
                                >
                                  <span>{currency.code} - {currency.name}</span>
                                  {formData.currency === currency.code && (
                                    <Check size={16} className="text-blue-500" />
                                  )}
                                </div>
                              ))}
                              {filteredCurrencies.length === 0 && (
                                <div className="px-4 py-3 text-sm text-gray-500 text-center italic">
                                  No currencies found matching "{currencySearch}"
                                </div>
                              )}
                            </div>
                            {/* Add new currency option */}
                            <div
                              onClick={() => {
                                setIsCurrencyDropdownOpen(false);
                                setCurrencySearch("");
                                setIsNewCurrencyModalOpen(true);
                              }}
                              className="px-4 py-3 text-[13px] text-blue-600 font-medium cursor-pointer hover:bg-blue-50 border-t border-gray-100 flex items-center gap-2 transition-colors"
                            >
                              <Plus size={16} />
                              Add new currency
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Accounts Receivable */}
                    <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-4 items-center">
                      <label className="text-[13px] font-medium text-gray-700 flex items-center gap-1">
                        Accounts Receivable
                        <HelpTooltip text="The asset account where the money owed by this customer will be tracked.">
                          <Info size={14} className="text-gray-400 cursor-help" />
                        </HelpTooltip>
                      </label>
                      <div className="w-full max-w-md relative" ref={accountsReceivableDropdownRef}>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            const wasOpen = isAccountsReceivableDropdownOpen;
                            closeAllDropdowns();
                            setIsAccountsReceivableDropdownOpen(!wasOpen);
                          }}
                          className="w-full px-3 py-1.5 border border-gray-300 rounded text-[13px] text-gray-700 bg-white flex items-center justify-between hover:border-[#156372]/30 focus:outline-none focus:ring-1 focus:ring-[#156372] focus:border-[#156372] transition-colors"
                        >
                          <span className={selectedAccount ? "text-gray-900" : "text-gray-400"}>
                            {selectedAccount ? selectedAccount.name : "Select an account"}
                          </span>
                          <ChevronDown size={14} className={`text-gray-400 transition-transform ${isAccountsReceivableDropdownOpen ? "rotate-180" : ""}`} />
                        </button>

                        {isAccountsReceivableDropdownOpen && (
                          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 max-h-80 overflow-hidden flex flex-col animate-in fade-in slide-in-from-top-2 duration-200">
                            <div className="flex items-center gap-2 p-3 bg-white border-b border-gray-100">
                              <Search size={18} className="text-gray-400 flex-shrink-0" />
                              <input
                                type="text"
                                placeholder="Search"
                                value={accountsReceivableSearch}
                                onChange={(e) => setAccountsReceivableSearch(e.target.value)}
                                className="flex-1 border-none outline-none text-[13px] text-gray-700 bg-transparent placeholder-gray-400"
                                autoFocus
                              />
                            </div>
                            <div className="max-h-60 overflow-y-auto custom-scrollbar">
                              <div className="px-4 py-2 text-[11px] font-bold text-gray-500 uppercase tracking-wider bg-gray-50/50">
                                Accounts Receivable
                              </div>
                              {filteredAccounts.map((acc) => (
                                <div
                                  key={acc.id}
                                  onClick={() => handleAccountSelect(acc.id)}
                                  className={`px-4 py-2.5 text-[13px] cursor-pointer flex items-center justify-between hover:bg-blue-50 transition-colors ${formData.accountsReceivable === acc.id ? "bg-blue-50 text-blue-600 font-medium" : "text-gray-700"}`}
                                >
                                  <span>{acc.name}</span>
                                  {formData.accountsReceivable === acc.id && (
                                    <Check size={16} className="text-blue-500" />
                                  )}
                                </div>
                              ))}
                              {filteredAccounts.length === 0 && (
                                <div className="px-4 py-3 text-sm text-gray-500 text-center italic">
                                  No accounts found matching "{accountsReceivableSearch}"
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Opening Balance */}
                    <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-4 items-center">
                      <label className="text-[13px] font-medium text-gray-700">Opening Balance</label>
                      <div className="w-full max-w-md flex">
                        <div className="flex items-center justify-center px-3 py-1.5 border border-r-0 border-gray-300 rounded-l bg-gray-50 text-[13px] text-gray-500 min-w-[50px] font-medium transition-colors">
                          {(formData.currency || "USD").substring(0, 3)}
                        </div>
                        <input
                          type="number"
                          name="openingBalance"
                          value={formData.openingBalance}
                          onChange={handleChange}
                          className="flex-1 px-3 py-1.5 border border-gray-300 rounded-r text-[13px] text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#156372] focus:border-[#156372] hover:border-gray-400 transition-colors"
                          step="0.01"
                        />
                      </div>
                    </div>

                    {/* Exchange Rate - Only shown if currency is NOT base currency */}
                    {baseCurrency && formData.currency !== baseCurrency.code && (
                      <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-4 items-center">
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

                    {/* Price List */}
                    <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-4 items-center">
                      <label className="text-[13px] font-medium text-gray-700 flex items-center gap-1">
                        Price List
                        <HelpTooltip text="Select a price list to associate with this customer. This will be used to determine item rates in transactions.">
                          <Info size={14} className="text-gray-400 cursor-help" />
                        </HelpTooltip>
                      </label>
                      <div className="w-full max-w-md relative" ref={priceListDropdownRef}>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            const wasOpen = isPriceListDropdownOpen;
                            closeAllDropdowns();
                            setIsPriceListDropdownOpen(!wasOpen);
                          }}
                          className="w-full px-3 py-1.5 border border-gray-300 rounded text-[13px] text-gray-700 bg-white flex items-center justify-between hover:border-gray-400 focus:outline-none focus:ring-1 focus:ring-[#156372] focus:border-[#156372] transition-colors"
                        >
                          <span className={formData.priceListId ? "text-gray-900" : "text-gray-400"}>
                            {formData.priceListId ? (priceLists.find(p => p.id === formData.priceListId)?.name || "Select a Price List") : "Select a Price List"}
                          </span>
                          <ChevronDown size={14} className={`text-gray-400 transition-transform ${isPriceListDropdownOpen ? "rotate-180" : ""}`} />
                        </button>

                        {isPriceListDropdownOpen && (
                          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 max-h-80 overflow-hidden flex flex-col">
                            <div className="flex items-center gap-2 p-3 bg-white border-b border-gray-100">
                              <Search size={18} className="text-gray-400 flex-shrink-0" />
                              <input
                                type="text"
                                placeholder="Search"
                                value={priceListSearch}
                                onChange={(e) => setPriceListSearch(e.target.value)}
                                className="flex-1 border-none outline-none text-[13px] text-gray-700 bg-transparent placeholder-gray-400"
                                autoFocus
                              />
                            </div>
                            <div className="max-h-60 overflow-y-auto custom-scrollbar">
                              <div
                                onClick={() => {
                                  setFormData(prev => ({ ...prev, priceListId: "" }));
                                  setIsPriceListDropdownOpen(false);
                                }}
                                className={`px-4 py-2.5 text-[13px] cursor-pointer flex items-center hover:bg-gray-50 transition-colors ${!formData.priceListId ? "bg-blue-50 text-blue-600 font-medium" : "text-gray-700"}`}
                              >
                                None
                              </div>
                              {priceLists
                                .filter(p => p.name.toLowerCase().includes(priceListSearch.toLowerCase()))
                                .map((p) => (
                                  <div
                                    key={p.id}
                                    onClick={() => {
                                      setFormData(prev => ({ ...prev, priceListId: p.id }));
                                      setIsPriceListDropdownOpen(false);
                                    }}
                                    className={`px-4 py-2.5 text-[13px] cursor-pointer flex items-center justify-between hover:bg-gray-50 transition-colors ${formData.priceListId === p.id ? "bg-blue-50 text-blue-600 font-medium" : "text-gray-700"}`}
                                  >
                                    <div className="flex flex-col">
                                      <span>{p.name}</span>
                                      <span className="text-[11px] text-gray-400">{p.pricingScheme} {p.currency !== "-" ? `(${p.currency})` : ""}</span>
                                    </div>
                                    {formData.priceListId === p.id && (
                                      <Check size={16} className="text-blue-500" />
                                    )}
                                  </div>
                                ))}
                              {priceLists.filter(p => p.name.toLowerCase().includes(priceListSearch.toLowerCase())).length === 0 && (
                                <div className="px-4 py-3 text-sm text-gray-500 text-center italic">
                                  No price lists found
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Payment Terms */}
                    <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-4 items-center">
                      <label className="text-[13px] font-medium text-gray-700">Payment Terms</label>
                      <div className="w-full max-w-md">
                        <PaymentTermsDropdown
                          value={formData.paymentTerms}
                          onChange={(value) => setFormData(prev => ({ ...prev, paymentTerms: value }))}
                          onConfigureTerms={() => setConfigureTermsOpen(true)}
                          customTerms={paymentTermsList}
                        />
                      </div>
                    </div>

                    {/* Enable Portal */}
                    <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-4 items-center">
                      <label className="text-[13px] font-medium text-gray-700 flex items-center gap-1">
                        Enable Portal?
                        <HelpTooltip text="Allow this customer to access your client portal to view their transactions and make payments.">
                          <Info size={14} className="text-gray-400 cursor-help" />
                        </HelpTooltip>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          name="enablePortal"
                          checked={formData.enablePortal}
                          onChange={handleChange}
                          className="w-4 h-4 text-[#156372] border-gray-300 rounded focus:ring-[#156372]"
                        />
                        <span className="text-[13px] text-gray-700">Allow portal access for this customer</span>
                      </label>
                    </div>

                    {/* Documents */}
                    <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-4 items-start" ref={uploadDropdownRef}>
                      <label className="text-[13px] font-medium text-gray-700 pt-2">Documents</label>
                      <div className="w-full max-w-md">
                        <input
                          type="file"
                          ref={fileInputRef}
                          onChange={handleFileUpload}
                          multiple
                          style={{ display: "none" }}
                          accept="*/*"
                        />
                        <div className="relative inline-flex items-center">
                          <div className="flex items-center border border-gray-300 rounded-md overflow-hidden bg-white hover:border-gray-400 transition-colors shadow-sm">
                            <button
                              type="button"
                              onClick={handleUploadClick}
                              className="flex items-center gap-2 px-4 py-2 border-r border-gray-300 bg-white text-sm text-gray-600 font-medium hover:bg-gray-50 transition-colors"
                            >
                              <Upload size={16} className="text-gray-400" />
                              Upload File
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                const wasOpen = isUploadDropdownOpen;
                                closeAllDropdowns();
                                setIsUploadDropdownOpen(!wasOpen);
                              }}
                              className="px-2 py-2 bg-white hover:bg-gray-50 transition-colors text-gray-400"
                            >
                              <ChevronDown size={14} className={`transition-transform duration-200 ${isUploadDropdownOpen ? 'rotate-180' : ''}`} />
                            </button>
                          </div>
                          {isUploadDropdownOpen && (
                            <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-[100] py-1">
                              <button
                                type="button"
                                onClick={() => {
                                  handleUploadClick();
                                  setIsUploadDropdownOpen(false);
                                }}
                                className="w-full text-left px-4 py-2 text-[13px] text-gray-700 hover:bg-gray-50 font-medium transition-colors"
                              >
                                Attach From Desktop
                              </button>
                              <button
                                type="button"
                                className="w-full text-left px-4 py-2 text-[13px] text-gray-700 hover:bg-gray-50 font-medium transition-colors"
                                onClick={() => {
                                  setIsDocumentsModalOpen(true);
                                  setIsUploadDropdownOpen(false);
                                }}
                              >
                                Attach From Documents
                              </button>
                            </div>
                          )}
                        </div>
                        <p className="mt-1.5 text-[11px] text-gray-500">
                          You can upload a maximum of 10 files, 10MB each
                        </p>

                        {/* Documents List */}
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

                    {/* Add more details link */}
                    <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-4">
                      <div />
                      <div>
                        <button
                          type="button"
                          onClick={() => setShowMoreDetails(!showMoreDetails)}
                          className="text-blue-600 text-sm font-medium hover:underline flex items-center gap-1.5 transition-all"
                        >
                          {showMoreDetails ? (
                            <>Hide more details <ChevronUp size={14} /></>
                          ) : (
                            <>Add more details <Plus size={14} /></>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* More Details Fields */}
                    {showMoreDetails && (
                      <div className="space-y-6 pt-6 border-t border-gray-100 mt-6 animate-in fade-in slide-in-from-top-2 duration-300">
                        {/* Website URL */}
                        <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-4 items-center">
                          <label className="text-[13px] font-medium text-gray-700">Website URL</label>
                          <div className="w-full max-w-md relative">
                            <Globe size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                              type="text"
                              name="websiteUrl"
                              value={formData.websiteUrl}
                              onChange={handleChange}
                              placeholder="ex: www.zylker.com"
                              className="w-full pl-9 pr-3 py-1.5 border border-gray-300 rounded text-[13px] text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#156372] focus:border-[#156372] hover:border-gray-400 transition-colors"
                            />
                          </div>
                        </div>

                        {/* Department */}
                        <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-4 items-center">
                          <label className="text-[13px] font-medium text-gray-700">Department</label>
                          <div className="w-full max-w-md">
                            <input
                              type="text"
                              name="department"
                              value={formData.department}
                              onChange={handleChange}
                              className="w-full px-3 py-1.5 border border-gray-300 rounded text-[13px] text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#156372] focus:border-[#156372] hover:border-gray-400 transition-colors"
                            />
                          </div>
                        </div>

                        {/* Designation */}
                        <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-4 items-center">
                          <label className="text-[13px] font-medium text-gray-700">Designation</label>
                          <div className="w-full max-w-md">
                            <input
                              type="text"
                              name="designation"
                              value={formData.designation}
                              onChange={handleChange}
                              className="w-full px-3 py-1.5 border border-gray-300 rounded text-[13px] text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#156372] focus:border-[#156372] hover:border-gray-400 transition-colors"
                            />
                          </div>
                        </div>

                        {/* X (Twitter) */}
                        <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-4 items-center">
                          <label className="text-[13px] font-medium text-gray-700">X (Twitter)</label>
                          <div className="w-full max-w-md relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-900 font-bold text-base select-none">ð•</span>
                            <input
                              type="text"
                              name="xHandle"
                              value={formData.xHandle}
                              onChange={handleChange}
                              placeholder="twitter.com/"
                              className="w-full pl-10 pr-3 py-1.5 border border-gray-300 rounded text-[13px] text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#156372] focus:border-[#156372] hover:border-gray-400 transition-colors"
                            />
                          </div>
                        </div>

                        {/* Skype Name/Number */}
                        <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-4 items-center">
                          <label className="text-[13px] font-medium text-gray-700">Skype Name/Number</label>
                          <div className="w-full max-w-md relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-500 font-bold text-base select-none">S</span>
                            <input
                              type="text"
                              name="skypeName"
                              value={formData.skypeName}
                              onChange={handleChange}
                              className="w-full pl-10 pr-3 py-1.5 border border-gray-300 rounded text-[13px] text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#156372] focus:border-[#156372] hover:border-gray-400 transition-colors"
                            />
                          </div>
                        </div>

                        {/* Facebook */}
                        <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-4 items-center">
                          <label className="text-[13px] font-medium text-gray-700">Facebook</label>
                          <div className="w-full max-w-md relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-600 font-bold text-base select-none">f</span>
                            <input
                              type="text"
                              name="facebook"
                              value={formData.facebook}
                              onChange={handleChange}
                              placeholder="facebook.com/"
                              className="w-full pl-10 pr-3 py-1.5 border border-gray-300 rounded text-[13px] text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#156372] focus:border-[#156372] hover:border-gray-400 transition-colors"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Footer Info */}
                    <div className="mt-12 pt-8 border-t border-gray-100">
                      <p className="text-sm text-gray-500 leading-relaxed max-w-2xl">
                        <span className="font-medium text-gray-700">Customer Owner:</span> Assign a user as the customer owner to provide access only to the data of this customer. <button type="button" onClick={() => setIsHelpSidebarOpen(true)} className="text-blue-600 hover:underline font-medium ml-1">Learn More</button>
                      </p>
                    </div>
                  </div>
                )}

                {activeTab === "address" && (
                  <div className="mt-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      {/* Billing Address */}
                      <div className="space-y-6">
                        <h3 className="text-[15px] font-semibold text-gray-800 mb-6">Billing Address</h3>

                        <div className="grid grid-cols-1 md:grid-cols-[140px_1fr] gap-4 items-center mb-5">
                          <label className="text-[13px] font-medium text-gray-700">Attention</label>
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

                        <div className="grid grid-cols-1 md:grid-cols-[140px_1fr] gap-4 items-center mb-5" ref={billingCountryDropdownRef}>
                          <label className="text-[13px] font-medium text-gray-700">Country/Region</label>
                          <div className="w-full max-w-sm relative">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                const wasOpen = isBillingCountryDropdownOpen;
                                closeAllDropdowns();
                                setIsBillingCountryDropdownOpen(!wasOpen);
                              }}
                              className="w-full px-3 py-1.5 border border-gray-300 rounded text-[13px] text-gray-700 bg-white flex items-center justify-between hover:border-gray-400 focus:outline-none focus:ring-1 focus:ring-[#156372] focus:border-[#156372]"
                            >
                              <span>{formData.billingCountry || "Select or type to add"}</span>
                              <ChevronDown size={14} className={`text-gray-400 transition-transform ${isBillingCountryDropdownOpen ? "rotate-180" : ""}`} />
                            </button>

                            {isBillingCountryDropdownOpen && (
                              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-md shadow-lg z-50 max-h-60 overflow-hidden">
                                <div className="flex items-center gap-2 p-2 border-b border-gray-200">
                                  <Search size={16} className="text-gray-400 flex-shrink-0" />
                                  <input
                                    type="text"
                                    placeholder="Search"
                                    value={billingCountrySearch}
                                    onChange={(e) => setBillingCountrySearch(e.target.value)}
                                    className="flex-1 border-none outline-none text-sm text-gray-700"
                                    autoFocus
                                  />
                                </div>
                                <div className="max-h-48 overflow-y-auto">
                                  {filteredCountries(billingCountrySearch).map((country) => (
                                    <div
                                      key={country}
                                      onClick={() => handleBillingCountrySelect(country)}
                                      className={`px-3 py-2 text-sm cursor-pointer flex items-center justify-between hover:bg-gray-100 ${formData.billingCountry === country ? "bg-blue-50 text-blue-600" : "text-gray-700"}`}
                                    >
                                      <span>{country}</span>
                                      {formData.billingCountry === country && (
                                        <Check size={16} className="text-blue-600" />
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-[140px_1fr] gap-4 items-start mb-5">
                          <label className="text-[13px] font-medium text-gray-700 pt-1.5">Address</label>
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

                        <div className="grid grid-cols-1 md:grid-cols-[140px_1fr] gap-4 items-center mb-5">
                          <label className="text-[13px] font-medium text-gray-700">City</label>
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

                        <div className="grid grid-cols-1 md:grid-cols-[140px_1fr] gap-4 items-center mb-5" ref={billingStateDropdownRef}>
                          <label className="text-[13px] font-medium text-gray-700">State</label>
                          <div className="w-full max-w-sm relative">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                const wasOpen = isBillingStateDropdownOpen;
                                closeAllDropdowns();
                                setIsBillingStateDropdownOpen(!wasOpen);
                              }}
                              className="w-full px-3 py-1.5 border border-gray-300 rounded text-[13px] text-gray-700 bg-white flex items-center justify-between hover:border-gray-400 focus:outline-none focus:ring-1 focus:ring-[#156372] focus:border-[#156372]"
                            >
                              <span>{formData.billingState || "Select or type to add"}</span>
                              <ChevronDown size={14} className={`text-gray-400 transition-transform ${isBillingStateDropdownOpen ? "rotate-180" : ""}`} />
                            </button>

                            {isBillingStateDropdownOpen && (
                              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-md shadow-lg z-50 max-h-60 overflow-hidden">
                                <div className="flex items-center gap-2 p-2 border-b border-gray-200">
                                  <Search size={16} className="text-gray-400 flex-shrink-0" />
                                  <input
                                    type="text"
                                    placeholder="Search or type to add"
                                    value={billingStateSearch}
                                    onChange={(e) => setBillingStateSearch(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter' && billingStateSearch) {
                                        handleBillingStateSelect(billingStateSearch);
                                      }
                                    }}
                                    className="flex-1 border-none outline-none text-sm text-gray-700"
                                    autoFocus
                                  />
                                </div>
                                <div className="max-h-48 overflow-y-auto">
                                  {filteredStates(billingStateSearch, formData.billingCountry).map((state: string) => (
                                    <div
                                      key={state}
                                      onClick={() => handleBillingStateSelect(state)}
                                      className={`px-3 py-2 text-sm cursor-pointer flex items-center justify-between hover:bg-gray-100 ${formData.billingState === state ? "bg-blue-50 text-blue-600" : "text-gray-700"}`}
                                    >
                                      <span>{state}</span>
                                      {formData.billingState === state && (
                                        <Check size={16} className="text-blue-600" />
                                      )}
                                    </div>
                                  ))}
                                  {formData.billingCountry && filteredStates("", formData.billingCountry).length === 0 && (
                                    <div className="px-3 py-4 text-center text-sm text-gray-400">
                                      No states found for {formData.billingCountry}
                                    </div>
                                  )}
                                  {!formData.billingCountry && (
                                    <div className="px-3 py-4 text-center text-sm text-gray-400">
                                      Please select a country first
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-[140px_1fr] gap-4 items-center mb-5">
                          <label className="text-[13px] font-medium text-gray-700">ZIP Code</label>
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

                        <div className="grid grid-cols-1 md:grid-cols-[140px_1fr] gap-4 items-center mb-5">
                          <label className="text-[13px] font-medium text-gray-700">Phone</label>
                          <div className="w-full max-w-sm">
                            <input
                              type="text"
                              name="billingPhone"
                              value={formData.billingPhone}
                              onChange={handleChange}
                              placeholder="Enter phone"
                              className="w-full px-3 py-1.5 border border-gray-300 rounded text-[13px] text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#156372] focus:border-[#156372]"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-[140px_1fr] gap-4 items-center">
                          <label className="text-[13px] font-medium text-gray-700">Fax Number</label>
                          <div className="w-full max-w-sm">
                            <input
                              type="text"
                              name="billingFax"
                              value={formData.billingFax}
                              onChange={handleChange}
                              placeholder="Enter fax number"
                              className="w-full px-3 py-1.5 border border-gray-300 rounded text-[13px] text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#156372] focus:border-[#156372]"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Shipping Address */}
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

                        <div className="grid grid-cols-1 md:grid-cols-[140px_1fr] gap-4 items-center mb-5">
                          <label className="text-[13px] font-medium text-gray-700">Attention</label>
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

                        <div className="grid grid-cols-1 md:grid-cols-[140px_1fr] gap-4 items-center mb-5" ref={shippingCountryDropdownRef}>
                          <label className="text-[13px] font-medium text-gray-700">Country/Region</label>
                          <div className="w-full max-w-sm relative">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                const wasOpen = isShippingCountryDropdownOpen;
                                closeAllDropdowns();
                                setIsShippingCountryDropdownOpen(!wasOpen);
                              }}
                              className="w-full px-3 py-1.5 border border-gray-300 rounded text-[13px] text-gray-700 bg-white flex items-center justify-between hover:border-gray-400 focus:outline-none focus:ring-1 focus:ring-[#156372] focus:border-[#156372]"
                            >
                              <span>{formData.shippingCountry || "Select or type to add"}</span>
                              <ChevronDown size={14} className={`text-gray-400 transition-transform ${isShippingCountryDropdownOpen ? "rotate-180" : ""}`} />
                            </button>

                            {isShippingCountryDropdownOpen && (
                              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded shadow-lg z-50 max-h-60 overflow-hidden">
                                <div className="flex items-center gap-2 p-2 border-b border-gray-200">
                                  <Search size={14} className="text-gray-400 flex-shrink-0" />
                                  <input
                                    type="text"
                                    placeholder="Search"
                                    value={shippingCountrySearch}
                                    onChange={(e) => setShippingCountrySearch(e.target.value)}
                                    className="flex-1 border-none outline-none text-[13px] text-gray-700"
                                    autoFocus
                                  />
                                </div>
                                <div className="max-h-48 overflow-y-auto">
                                  {filteredCountries(shippingCountrySearch).map((country) => (
                                    <div
                                      key={country}
                                      onClick={() => handleShippingCountrySelect(country)}
                                      className={`px-3 py-1.5 text-[13px] cursor-pointer flex items-center justify-between hover:bg-gray-100 ${formData.shippingCountry === country ? "bg-blue-50 text-blue-600" : "text-gray-700"}`}
                                    >
                                      <span>{country}</span>
                                      {formData.shippingCountry === country && <Check size={14} className="text-blue-600" />}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-[140px_1fr] gap-4 items-start mb-5">
                          <label className="text-[13px] font-medium text-gray-700 pt-1.5">Address</label>
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

                        <div className="grid grid-cols-1 md:grid-cols-[140px_1fr] gap-4 items-center mb-5">
                          <label className="text-[13px] font-medium text-gray-700">City</label>
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

                        <div className="grid grid-cols-1 md:grid-cols-[140px_1fr] gap-4 items-center mb-5" ref={shippingStateDropdownRef}>
                          <label className="text-[13px] font-medium text-gray-700">State</label>
                          <div className="w-full max-w-sm relative">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                const wasOpen = isShippingStateDropdownOpen;
                                closeAllDropdowns();
                                setIsShippingStateDropdownOpen(!wasOpen);
                              }}
                              className="w-full px-3 py-1.5 border border-gray-300 rounded text-[13px] text-gray-700 bg-white flex items-center justify-between hover:border-gray-400 focus:outline-none focus:ring-1 focus:ring-[#156372] focus:border-[#156372]"
                            >
                              <span>{formData.shippingState || "Select or type to add"}</span>
                              <ChevronDown size={14} className={`text-gray-400 transition-transform ${isShippingStateDropdownOpen ? "rotate-180" : ""}`} />
                            </button>

                            {isShippingStateDropdownOpen && (
                              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded shadow-lg z-50 max-h-60 overflow-hidden">
                                <div className="flex items-center gap-2 p-2 border-b border-gray-200">
                                  <Search size={14} className="text-gray-400 flex-shrink-0" />
                                  <input
                                    type="text"
                                    placeholder="Search"
                                    value={shippingStateSearch}
                                    onChange={(e) => setShippingStateSearch(e.target.value)}
                                    className="flex-1 border-none outline-none text-[13px] text-gray-700"
                                    autoFocus
                                  />
                                </div>
                                <div className="max-h-48 overflow-y-auto">
                                  {filteredStates(shippingStateSearch, formData.shippingCountry).map((state: string) => (
                                    <div
                                      key={state}
                                      onClick={() => handleShippingStateSelect(state)}
                                      className={`px-3 py-1.5 text-[13px] cursor-pointer flex items-center justify-between hover:bg-gray-100 ${formData.shippingState === state ? "bg-blue-50 text-blue-600" : "text-gray-700"}`}
                                    >
                                      <span>{state}</span>
                                      {formData.shippingState === state && <Check size={14} className="text-blue-600" />}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-[140px_1fr] gap-4 items-center mb-5">
                          <label className="text-[13px] font-medium text-gray-700">ZIP Code</label>
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

                        <div className="grid grid-cols-1 md:grid-cols-[140px_1fr] gap-4 items-center mb-5">
                          <label className="text-[13px] font-medium text-gray-700">Phone</label>
                          <div className="w-full max-w-sm">
                            <input
                              type="text"
                              name="shippingPhone"
                              value={formData.shippingPhone}
                              onChange={handleChange}
                              placeholder="Enter phone"
                              className="w-full px-3 py-1.5 border border-gray-300 rounded text-[13px] text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#156372] focus:border-[#156372]"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-[140px_1fr] gap-4 items-center">
                          <label className="text-[13px] font-medium text-gray-700">Fax Number</label>
                          <div className="w-full max-w-sm">
                            <input
                              type="text"
                              name="shippingFax"
                              value={formData.shippingFax}
                              onChange={handleChange}
                              placeholder="Enter fax number"
                              className="w-full px-3 py-1.5 border border-gray-300 rounded text-[13px] text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#156372] focus:border-[#156372]"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Note Section */}
                    <div className="mt-8 p-4 bg-white border-l-4 border-[#f09c2a] flex flex-col gap-2">
                      <div className="text-[13px] font-semibold text-gray-900">Note:</div>
                      <div className="space-y-1.5">
                        <div className="text-[13px] text-gray-600 flex gap-1.5">
                          <span className="text-gray-400">â€¢</span>
                          <span>Add and manage additional addresses from this Customers and Vendors details section.</span>
                        </div>
                        <div className="text-[13px] text-gray-600 flex gap-1.5">
                          <span className="text-gray-400">â€¢</span>
                          <span>You can customise how customers' addresses are displayed in transaction PDFs. To do this, go to Settings &gt; Preferences &gt; Customers and Vendors, and navigate to the Address Format sections.</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === "contact-persons" && (
                  <div className="mt-6">
                    {/* Table Structure */}
                    <div className="border border-gray-200 rounded-md scrollbar-hide">
                      {/* Table Header */}
                      <div
                        className="bg-gray-50 border-b border-gray-200 grid gap-4 px-4 py-3 items-center"
                        style={{
                          gridTemplateColumns: showExtendedContactColumns
                            ? '90px 1fr 1fr 1.5fr 1.3fr 1.3fr 1fr 1fr 1fr 50px'
                            : '90px 1fr 1fr 1.5fr 1.3fr 1.3fr 50px'
                        }}
                      >
                        <div className="text-xs font-semibold text-gray-700 uppercase">SALUTATION</div>
                        <div className="text-xs font-semibold text-gray-700 uppercase">FIRST NAME</div>
                        <div className="text-xs font-semibold text-gray-700 uppercase">LAST NAME</div>
                        <div className="text-xs font-semibold text-gray-700 uppercase">EMAIL ADDRESS</div>
                        <div className="text-xs font-semibold text-gray-700 uppercase">WORK PHONE</div>
                        <div className="text-xs font-semibold text-gray-700 uppercase">MOBILE</div>
                        {showExtendedContactColumns && (
                          <>
                            <div className="text-xs font-semibold text-gray-700 uppercase">SKYPE NAME/NUMBER</div>
                            <div className="text-xs font-semibold text-gray-700 uppercase">DESIGNATION</div>
                            <div className="text-xs font-semibold text-gray-700 uppercase">DEPARTMENT</div>
                          </>
                        )}
                        <div></div>
                      </div>

                      {/* Contact Person Rows */}
                      {formData.contactPersons.length === 0 ? (
                        <div className="p-8 text-center text-sm text-gray-500">
                          No contact persons added yet. Click the button below to add one.
                        </div>
                      ) : (
                        formData.contactPersons.map((contact, index) => (
                          <div
                            key={contact.id}
                            className="grid gap-4 px-4 py-3 border-b border-gray-200 last:border-b-0 hover:bg-gray-50 items-start"
                            style={{
                              gridTemplateColumns: showExtendedContactColumns
                                ? '90px 1fr 1fr 1.5fr 1.3fr 1.3fr 1fr 1fr 1fr 50px'
                                : '90px 1fr 1fr 1.5fr 1.3fr 1.3fr 50px'
                            }}
                          >
                            {/* Salutation */}
                            <div>
                              <div className="relative">
                                <select
                                  value={contact.salutation}
                                  onChange={(e) => {
                                    const updated = formData.contactPersons.map(cp =>
                                      cp.id === contact.id ? { ...cp, salutation: e.target.value } : cp
                                    );
                                    setFormData(prev => ({ ...prev, contactPersons: updated }));
                                  }}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none"
                                >
                                  <option value=""></option>
                                  <option value="Mr.">Mr.</option>
                                  <option value="Mrs.">Mrs.</option>
                                  <option value="Ms.">Ms.</option>
                                  <option value="Dr.">Dr.</option>
                                  <option value="Miss">Miss</option>
                                </select>
                                <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                              </div>
                            </div>

                            {/* First Name */}
                            <input
                              type="text"
                              value={contact.firstName}
                              onChange={(e) => {
                                const updated = formData.contactPersons.map(cp =>
                                  cp.id === contact.id ? { ...cp, firstName: e.target.value } : cp
                                );
                                setFormData(prev => ({ ...prev, contactPersons: updated }));
                              }}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />

                            {/* Last Name */}
                            <input
                              type="text"
                              value={contact.lastName}
                              onChange={(e) => {
                                const updated = formData.contactPersons.map(cp =>
                                  cp.id === contact.id ? { ...cp, lastName: e.target.value } : cp
                                );
                                setFormData(prev => ({ ...prev, contactPersons: updated }));
                              }}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />

                            {/* Email */}
                            <input
                              type="email"
                              value={contact.email}
                              onChange={(e) => {
                                const updated = formData.contactPersons.map(cp =>
                                  cp.id === contact.id ? { ...cp, email: e.target.value } : cp
                                );
                                setFormData(prev => ({ ...prev, contactPersons: updated }));
                              }}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />

                            {/* Work Phone */}
                            <div className="flex items-center border border-gray-300 rounded-md focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 bg-white">
                              <div className="relative">
                                <div
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const isOpen = openContactDropdown?.id === contact.id && openContactDropdown?.type === 'work';
                                    closeAllDropdowns(); // Close others
                                    if (!isOpen) {
                                      setOpenContactDropdown({ id: contact.id, type: 'work' });
                                      setContactDropdownSearch("");
                                    }
                                  }}
                                  className={`flex items-center gap-1 px-2 py-2 border-r border-gray-300 text-sm cursor-pointer transition-colors min-w-[70px] justify-between rounded-l-md ${openContactDropdown?.id === contact.id && openContactDropdown?.type === 'work' ? "bg-white" : "bg-gray-50 text-gray-600 hover:bg-gray-100"}`}
                                >
                                  <span className="font-medium text-gray-700">{contact.workPhonePrefix || "+358"}</span>
                                  <ChevronDown size={12} className="text-gray-400" />
                                </div>

                                {openContactDropdown?.id === contact.id && openContactDropdown?.type === 'work' && (
                                  <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-gray-200 rounded-md shadow-xl z-[100] flex flex-col overflow-hidden">
                                    <div className="p-2 border-b border-gray-100">
                                      <input
                                        type="text"
                                        value={contactDropdownSearch}
                                        onChange={(e) => setContactDropdownSearch(e.target.value)}
                                        placeholder="Search..."
                                        className="w-full px-2 py-1 text-xs border border-gray-200 rounded focus:border-blue-500 focus:outline-none"
                                        autoFocus
                                        onClick={(e) => e.stopPropagation()}
                                      />
                                    </div>
                                    <div className="max-h-48 overflow-y-auto">
                                      {countryPhoneCodes
                                        .filter(c => c.name.toLowerCase().includes(contactDropdownSearch.toLowerCase()) || c.code.includes(contactDropdownSearch))
                                        .map((code, idx) => (
                                          <div
                                            key={idx}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              const updated = formData.contactPersons.map(cp =>
                                                cp.id === contact.id ? { ...cp, workPhonePrefix: code.code } : cp
                                              );
                                              setFormData(prev => ({ ...prev, contactPersons: updated }));
                                              setOpenContactDropdown(null);
                                            }}
                                            className={`px-3 py-2 text-xs flex items-center justify-between cursor-pointer hover:bg-gray-50 ${contact.workPhonePrefix === code.code ? "bg-blue-50 text-blue-600" : "text-gray-700"}`}
                                          >
                                            <span className="font-medium">{code.code}</span>
                                            <span className="text-gray-500 ml-2 truncate flex-1 text-right">{code.name}</span>
                                          </div>
                                        ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                              <input
                                type="text"
                                value={contact.workPhone}
                                onChange={(e) => {
                                  const updated = formData.contactPersons.map(cp =>
                                    cp.id === contact.id ? { ...cp, workPhone: e.target.value } : cp
                                  );
                                  setFormData(prev => ({ ...prev, contactPersons: updated }));
                                }}
                                className="flex-1 w-full px-2 py-2 text-sm text-gray-700 border-none focus:outline-none bg-transparent"
                              />
                            </div>

                            {/* Mobile */}
                            <div className="flex items-center border border-gray-300 rounded-md focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 bg-white">
                              <div className="relative">
                                <div
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const isOpen = openContactDropdown?.id === contact.id && openContactDropdown?.type === 'mobile';
                                    closeAllDropdowns();
                                    if (!isOpen) {
                                      setOpenContactDropdown({ id: contact.id, type: 'mobile' });
                                      setContactDropdownSearch("");
                                    }
                                  }}
                                  className={`flex items-center gap-1 px-2 py-2 border-r border-gray-300 text-sm cursor-pointer transition-colors min-w-[70px] justify-between rounded-l-md ${openContactDropdown?.id === contact.id && openContactDropdown?.type === 'mobile' ? "bg-white" : "bg-gray-50 text-gray-600 hover:bg-gray-100"}`}
                                >
                                  <span className="font-medium text-gray-700">{contact.mobilePrefix || "+252"}</span>
                                  <ChevronDown size={12} className="text-gray-400" />
                                </div>

                                {openContactDropdown?.id === contact.id && openContactDropdown?.type === 'mobile' && (
                                  <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-gray-200 rounded-md shadow-xl z-[100] flex flex-col overflow-hidden">
                                    <div className="p-2 border-b border-gray-100">
                                      <input
                                        type="text"
                                        value={contactDropdownSearch}
                                        onChange={(e) => setContactDropdownSearch(e.target.value)}
                                        placeholder="Search..."
                                        className="w-full px-2 py-1 text-xs border border-gray-200 rounded focus:border-blue-500 focus:outline-none"
                                        autoFocus
                                        onClick={(e) => e.stopPropagation()}
                                      />
                                    </div>
                                    <div className="max-h-48 overflow-y-auto">
                                      {countryPhoneCodes
                                        .filter(c => c.name.toLowerCase().includes(contactDropdownSearch.toLowerCase()) || c.code.includes(contactDropdownSearch))
                                        .map((code, idx) => (
                                          <div
                                            key={idx}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              const updated = formData.contactPersons.map(cp =>
                                                cp.id === contact.id ? { ...cp, mobilePrefix: code.code } : cp
                                              );
                                              setFormData(prev => ({ ...prev, contactPersons: updated }));
                                              setOpenContactDropdown(null);
                                            }}
                                            className={`px-3 py-2 text-xs flex items-center justify-between cursor-pointer hover:bg-gray-50 ${contact.mobilePrefix === code.code ? "bg-blue-50 text-blue-600" : "text-gray-700"}`}
                                          >
                                            <span className="font-medium">{code.code}</span>
                                            <span className="text-gray-500 ml-2 truncate flex-1 text-right">{code.name}</span>
                                          </div>
                                        ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                              <input
                                type="text"
                                value={contact.mobile}
                                onChange={(e) => {
                                  const updated = formData.contactPersons.map(cp =>
                                    cp.id === contact.id ? { ...cp, mobile: e.target.value } : cp
                                  );
                                  setFormData(prev => ({ ...prev, contactPersons: updated }));
                                }}
                                className="flex-1 w-full px-2 py-2 text-sm text-gray-700 border-none focus:outline-none bg-transparent"
                              />
                            </div>

                            {/* Extended Columns */}
                            {showExtendedContactColumns && (
                              <>
                                <input
                                  type="text"
                                  value={contact.skypeName}
                                  onChange={(e) => {
                                    const updated = formData.contactPersons.map(cp =>
                                      cp.id === contact.id ? { ...cp, skypeName: e.target.value } : cp
                                    );
                                    setFormData(prev => ({ ...prev, contactPersons: updated }));
                                  }}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                                <input
                                  type="text"
                                  value={contact.designation}
                                  onChange={(e) => {
                                    const updated = formData.contactPersons.map(cp =>
                                      cp.id === contact.id ? { ...cp, designation: e.target.value } : cp
                                    );
                                    setFormData(prev => ({ ...prev, contactPersons: updated }));
                                  }}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                                <input
                                  type="text"
                                  value={contact.department}
                                  onChange={(e) => {
                                    const updated = formData.contactPersons.map(cp =>
                                      cp.id === contact.id ? { ...cp, department: e.target.value } : cp
                                    );
                                    setFormData(prev => ({ ...prev, contactPersons: updated }));
                                  }}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                              </>
                            )}

                            {/* Actions */}
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => setShowExtendedContactColumns(!showExtendedContactColumns)}
                                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md"
                              >
                                <MoreVertical size={16} />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setFormData(prev => ({
                                    ...prev,
                                    contactPersons: prev.contactPersons.filter(cp => cp.id !== contact.id)
                                  }));
                                }}
                                className="flex items-center justify-center w-6 h-6 rounded-full border border-red-500 text-red-500 hover:bg-red-50 transition-colors"
                                title="Delete contact person"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Add Contact Person Button */}
                    <div className="mt-4">
                      <button
                        type="button"
                        onClick={() => {
                          const newContact = {
                            id: Date.now(),
                            salutation: "",
                            firstName: "",
                            lastName: "",
                            email: "",
                            phone: "",
                            mobile: "",
                            designation: ""
                          };
                          setFormData(prev => ({
                            ...prev,
                            contactPersons: [...prev.contactPersons, newContact]
                          }));
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-md text-sm font-medium hover:bg-blue-100 transition-colors"
                      >
                        <Plus size={16} />
                        Add Contact Person
                      </button>
                    </div>
                  </div>
                )}


                {activeTab === "custom-fields" && (
                  <div className="mt-6">
                    <div className="mb-4 flex items-center justify-between">
                      <label className="block text-sm font-medium text-gray-700">Custom Fields</label>
                      <button
                        type="button"
                        onClick={() => {
                          setFormData(prev => {
                            const currentFields = { ...(prev.customFields || {}) } as Record<string, string>;
                            let counter = 1;
                            while (currentFields[`Custom Field ${counter}`] !== undefined) {
                              counter += 1;
                            }
                            currentFields[`Custom Field ${counter}`] = "";
                            return { ...prev, customFields: currentFields };
                          });
                        }}
                        className="px-3 py-1.5 text-xs font-medium text-blue-700 border border-blue-200 rounded-md hover:bg-blue-50 transition-colors"
                      >
                        + Add Field
                      </button>
                    </div>

                    {Object.keys(formData.customFields || {}).length === 0 ? (
                      <div className="p-6 border border-dashed border-gray-300 rounded-md bg-gray-50 text-sm text-gray-500">
                        No custom fields added yet.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {Object.entries(formData.customFields || {}).map(([fieldKey, fieldValue]) => (
                          <div key={fieldKey} className="grid grid-cols-[220px_1fr_auto] gap-3 items-center">
                            <div className="text-sm text-gray-700 font-medium truncate" title={fieldKey}>
                              {fieldKey}
                            </div>
                            <input
                              type="text"
                              value={String(fieldValue ?? "")}
                              onChange={(e) => {
                                const value = e.target.value;
                                setFormData(prev => ({
                                  ...prev,
                                  customFields: {
                                    ...(prev.customFields || {}),
                                    [fieldKey]: value
                                  }
                                }));
                              }}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              placeholder="Enter value"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                setFormData(prev => {
                                  const currentFields = { ...(prev.customFields || {}) } as Record<string, string>;
                                  delete currentFields[fieldKey];
                                  return { ...prev, customFields: currentFields };
                                });
                              }}
                              className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                              aria-label={`Remove ${fieldKey}`}
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}



                {activeTab === "remarks" && (
                  <div className="mt-6">
                    <div className="mb-6">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Remarks</label>
                      <p className="text-sm text-gray-600 mt-2">
                        Add any additional notes or remarks about this customer. This information is for internal use only.
                      </p>
                      <textarea
                        name="remarks"
                        value={formData.remarks}
                        onChange={handleChange}
                        placeholder="Enter remarks or notes about this customer..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-y"
                        rows={8}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-8 mt-12 border-t border-gray-100">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="px-5 py-2 bg-[#156372] text-white rounded text-[13px] font-semibold hover:bg-[#0f4f5a] transition-all disabled:opacity-70 flex items-center gap-2 shadow-sm"
                >
                  {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                  Save
                </button>
                <button
                  type="button"
                  onClick={handleSaveAndSubscribe}
                  disabled={isSaving}
                  className="px-5 py-2 bg-white text-gray-700 border border-gray-300 rounded text-[13px] font-semibold hover:bg-gray-50 hover:border-gray-400 transition-all disabled:opacity-70 flex items-center gap-2 shadow-sm"
                >
                  {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                  Save and Subscribe
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={isSaving}
                  className="px-5 py-2 bg-white text-gray-600 border border-gray-300 rounded text-[13px] font-semibold hover:bg-gray-50 hover:text-gray-800 transition-all disabled:opacity-70 shadow-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Help Sidebar */}
        <div className={`fixed top-0 right-0 h-screen w-[320px] bg-white border-l border-gray-200 shadow-2xl z-[1000] transition-transform duration-300 transform ${isHelpSidebarOpen ? 'translate-x-0' : 'translate-x-full'} flex flex-col`}>
          {/* Sidebar Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white">
            <h2 className="text-sm font-semibold text-gray-800 m-0">Help</h2>
            <button
              onClick={() => setIsHelpSidebarOpen(false)}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all"
              title="Close this instant helper"
            >
              <X size={18} />
            </button>
          </div>

          {/* Sidebar Content */}
          <div className="flex-1 overflow-y-auto p-6">
            <h3 className="text-[14px] font-bold text-gray-900 mb-6 mt-2">
              To assign a user as the customer owner:
            </h3>

            <ul className="space-y-6 list-none p-0">
              <li className="flex gap-3 items-start">
                <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-600 flex-shrink-0" />
                <p className="text-[12px] leading-relaxed text-gray-700 m-0">
                  Go to <span className="font-bold">Users & Roles</span> under Preferences.
                </p>
              </li>
              <li className="flex gap-3 items-start">
                <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-600 flex-shrink-0" />
                <p className="text-[12px] leading-relaxed text-gray-700 m-0">
                  Invite users with the predefined role <span className="font-bold">Staff - Assigned Customers Only</span>.
                </p>
              </li>
              <li className="flex gap-3 items-start">
                <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-600 flex-shrink-0" />
                <p className="text-[12px] leading-relaxed text-gray-700 m-0">
                  Select the user with that role as a <span className="font-bold">Customer Owner</span> when you create or edit a customer.
                </p>
              </li>
            </ul>

            <p className="mt-8 text-[12px] italic text-gray-500 leading-relaxed border-t border-gray-50 pt-6">
              Now, this user will only be able to view the data related to this customer.
            </p>
          </div>
        </div>
      </div>

      {/* Documents Modal */}
      {
        isDocumentsModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[2000]" onClick={() => setIsDocumentsModalOpen(false)}>
            <div className="bg-white rounded-lg shadow-xl w-[90%] max-w-4xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
              {/* Header */}
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
                      <button
                        onClick={() => setDocumentSearch("")}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                  <button
                    onClick={() => setIsDocumentsModalOpen(false)}
                    className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="flex flex-1 overflow-hidden">
                {/* Left Navigation - INBOXES */}
                <div className="w-64 border-r border-slate-100 bg-slate-50/50 flex flex-col h-full">
                  <div className="p-4 space-y-1">
                    <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest px-3 mb-2">INBOXES</div>
                    {[
                      { id: 'all-documents', label: 'All Documents', icon: LayoutGrid },
                      { id: 'files', label: 'Inbox', icon: Folder },
                      { id: 'bank-statements', label: 'Bank Statements', icon: CreditCard },
                    ].map((tab) => {
                      const Icon = tab.icon;
                      const isActive = selectedInbox === tab.id;
                      return (
                        <button
                          key={tab.id}
                          onClick={() => setSelectedInbox(tab.id)}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-bold transition-all ${isActive
                            ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
                            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                            }`}
                        >
                          <Icon size={16} className={isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-600'} />
                          {tab.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 flex flex-col overflow-hidden bg-white">
                  {/* Search Header */}
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
                    {(() => {
                      let filteredDocs = [];
                      if (selectedInbox === "files") {
                        filteredDocs = availableDocuments.filter(doc =>
                          doc.folder === "Inbox" || doc.folder === "Files" || !doc.folder
                        );
                      } else if (selectedInbox === "bank-statements") {
                        filteredDocs = availableDocuments.filter(doc =>
                          doc.folder === "Bank Statements" || doc.module === "Banking"
                        );
                      } else if (selectedInbox === "all-documents") {
                        filteredDocs = availableDocuments;
                      }

                      // Filter by search term
                      if (documentSearch) {
                        filteredDocs = filteredDocs.filter(doc =>
                          doc.name.toLowerCase().includes(documentSearch.toLowerCase()) ||
                          (doc.associatedTo && doc.associatedTo.toLowerCase().includes(documentSearch.toLowerCase()))
                        );
                      }

                      if (filteredDocs.length === 0) {
                        return (
                          <div className="flex flex-col items-center justify-center py-20 px-8 text-center space-y-4 h-full">
                            <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-300">
                              <Upload size={32} />
                            </div>
                            <div>
                              <p className="text-[14px] font-bold text-slate-600">No documents found</p>
                              <p className="text-[12px] text-slate-400 mt-1">Try changing your search or switching folders.</p>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-slate-100 bg-slate-50/30">
                              <th className="px-6 py-3 w-12">
                                <input
                                  type="checkbox"
                                  checked={filteredDocs.length > 0 && filteredDocs.every(d => selectedDocuments.includes(d.id))}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedDocuments(filteredDocs.map(d => d.id));
                                    } else {
                                      setSelectedDocuments([]);
                                    }
                                  }}
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
                                  onClick={() => {
                                    if (isSelected) {
                                      setSelectedDocuments(selectedDocuments.filter(id => id !== doc.id));
                                    } else {
                                      setSelectedDocuments([...selectedDocuments, doc.id]);
                                    }
                                  }}
                                  className={`transition-all duration-200 cursor-pointer border-b border-slate-50 ${isSelected ? 'bg-blue-50/30' : 'hover:bg-slate-50/50'}`}
                                >
                                  <td className="px-6 py-4">
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      readOnly
                                      className="w-4 h-4 rounded border-slate-300 accent-blue-600 pointer-events-none"
                                    />
                                  </td>
                                  <td className="px-6 py-4">
                                    <div className="flex flex-col">
                                      <span className="text-[13px] font-bold text-slate-700">{doc.name}</span>
                                      {doc.associatedTo && <span className="text-[11px] text-slate-400 font-medium">Associated to: {doc.associatedTo}</span>}
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 text-right">
                                    <div className="flex flex-col text-right">
                                      <span className="text-[12px] font-bold text-slate-600">{doc.size || '52 KB'}</span>
                                      <span className="text-[11px] text-slate-400 font-medium">{doc.uploadedOn || '29 Dec 2025'}</span>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      );
                    })()}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-100 bg-slate-50/10">
                <button
                  onClick={() => {
                    setIsDocumentsModalOpen(false);
                    setSelectedDocuments([]);
                    setDocumentSearch("");
                  }}
                  className="px-6 py-2.5 text-[13px] font-bold text-slate-600 hover:text-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (selectedDocuments.length > 0) {
                      const selectedDocs = availableDocuments.filter(doc =>
                        selectedDocuments.includes(doc.id)
                      );
                      const newDocs = selectedDocs.map(doc => ({
                        id: doc.id,
                        name: doc.name,
                        size: typeof doc.size === 'string' ? parseFileSize(doc.size) : (doc.size || 0),
                        file: null,
                        documentId: doc.id
                      }));
                      setFormData(prev => ({
                        ...prev,
                        documents: [...prev.documents, ...newDocs]
                      }));
                    }
                    setIsDocumentsModalOpen(false);
                    setSelectedDocuments([]);
                    setDocumentSearch("");
                  }}
                  disabled={selectedDocuments.length === 0}
                  className="px-8 py-2.5 bg-[#3b82f6] hover:bg-[#2563eb] disabled:bg-slate-200 disabled:cursor-not-allowed text-white rounded-lg text-[13px] font-extrabold shadow-lg shadow-blue-500/20 transition-all active:scale-95"
                >
                  Attach {selectedDocuments.length > 0 ? `(${selectedDocuments.length})` : ''} Selected
                </button>
              </div>
            </div>
          </div>
        )
      }

      {/* Cloud Picker Modal - Same implementation as NewInvoice */}
      {
        isCloudPickerOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000]" onClick={() => setIsCloudPickerOpen(false)}>
            <div className="bg-white rounded-lg shadow-xl w-[900px] h-[640px] flex flex-col" onClick={(e) => e.stopPropagation()}>
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-700">Cloud Picker</h2>
                <button
                  onClick={() => setIsCloudPickerOpen(false)}
                  className="text-red-500 hover:text-red-600 transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="flex flex-1 overflow-hidden">
                {/* Cloud Services Sidebar */}
                <div className="w-[180px] bg-white border-r border-gray-200 flex flex-col overflow-y-auto">
                  <div className="p-2">
                    {[
                      { id: "zoho", name: "Zoho WorkDrive", icon: Grid3x3 },
                      { id: "gdrive", name: "Google Drive", icon: HardDrive },
                      { id: "dropbox", name: "Dropbox", icon: Box },
                      { id: "box", name: "Box", icon: Square },
                      { id: "onedrive", name: "OneDrive", icon: Cloud },
                      { id: "evernote", name: "Evernote", icon: FileText },
                    ].map((provider) => {
                      const IconComponent = provider.icon;
                      const isSelected = selectedCloudProvider === provider.id;
                      return (
                        <button
                          key={provider.id}
                          onClick={() => setSelectedCloudProvider(provider.id)}
                          className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors ${isSelected
                            ? "bg-blue-50 text-blue-600 border-l-4 border-blue-600"
                            : "text-gray-700 hover:bg-gray-50"
                            }`}
                        >
                          <IconComponent
                            size={24}
                            className={isSelected ? "text-blue-600" : "text-gray-500"}
                          />
                          <span>{provider.name}</span>
                        </button>
                      );
                    })}
                  </div>
                  {/* Scroll indicator */}
                  <div className="mt-auto p-2 flex justify-center">
                    <div className="flex flex-col gap-1">
                      <ChevronUp size={16} className="text-gray-300" />
                      <ChevronDown size={16} className="text-gray-300" />
                    </div>
                  </div>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 flex flex-col items-center justify-center p-8 bg-white">
                  {selectedCloudProvider === "gdrive" ? (
                    /* Google Drive Authentication Content */
                    <div className="flex flex-col items-center max-w-lg">
                      {/* Google Drive Logo */}
                      <div className="mb-8">
                        <div className="relative w-32 h-32">
                          {/* Google Drive Triangle Logo */}
                          <svg viewBox="0 0 256 256" className="w-full h-full">
                            {/* Green triangle */}
                            <path
                              d="M128 32L32 128l96 96V32z"
                              fill="#0F9D58"
                            />
                            {/* Blue triangle */}
                            <path
                              d="M128 32l96 96-96 96V32z"
                              fill="#4285F4"
                            />
                            {/* Yellow triangle */}
                            <path
                              d="M32 128l96 96V128L32 32v96z"
                              fill="#F4B400"
                            />
                          </svg>
                        </div>
                      </div>

                      {/* Terms and Conditions Text */}
                      <div className="text-sm text-gray-700 text-center mb-8 leading-relaxed">
                        <p>
                          By clicking on this button you agree to the provider's{" "}
                          <a
                            href="#"
                            className="text-blue-600 underline hover:text-blue-700"
                            onClick={(e) => e.preventDefault()}
                          >
                            terms of use
                          </a>{" "}
                          and{" "}
                          <a
                            href="#"
                            className="text-blue-600 underline hover:text-blue-700"
                            onClick={(e) => e.preventDefault()}
                          >
                            privacy policy
                          </a>{" "}
                          and understand that the rights to use this product do not come from Zoho. The use and transfer of information received from Google APIs to Zoho will adhere to{" "}
                          <a
                            href="#"
                            className="text-blue-600 underline hover:text-blue-700"
                            onClick={(e) => e.preventDefault()}
                          >
                            Google API Services User Data Policy
                          </a>
                          , including the{" "}
                          <a
                            href="#"
                            className="text-blue-600 underline hover:text-blue-700"
                            onClick={(e) => e.preventDefault()}
                          >
                            Limited Use Requirements
                          </a>
                          .
                        </p>
                      </div>

                      {/* Authenticate Google Button */}
                      <button
                        className="px-8 py-3 bg-blue-600 text-white rounded-md text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm"
                        onClick={() => {
                          window.open(
                            "https://accounts.google.com/v3/signin/accountchooser?access_type=offline&approval_prompt=force&client_id=932402265855-3k3mfquq4o5kh60o8tnc9mhgn9h77717.apps.googleusercontent.com&redirect_uri=https%3A%2F%2Fgadgets.zoho.com%2Fauth%2Fgoogle&response_type=code&scope=https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fuserinfo.email+https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fdrive&state=3a3b0106a0c2d908b369a75ad93185c0aa431c64497733bda2d375130c4da610d88104c252c552adc1dee9d6167ad6bb8d2258113b9dce48b47ca4a970314a1fa7b51df3a7716016ac37be9e7d4d9f21077f946b82dc039ae2f08b7be79117042545529cf82d67d58ef6426621f5b5f885af900571347968d419f6d1a5abe3e7e1a3a4d04a433a6b3c5173f68c0c5bea&dsh=S557386361%3A1766903862725658&o2v=1&service=lso&flowName=GeneralOAuthFlow&opparams=%253F&continue=https%3A%2F%2Faccounts.google.com%2Fsignin%2Foauth%2Fconsent%3Fauthuser%3Dunknown%26part%3DAJi8hAP8z-36EGAbjuuLEd2uWDyjQgraM1HNpjnJVe4mUhXhPOQkoJHNKZG6WoCFPPrb5EDYGeFuyF3TI7jUSvDUIwBbk0PGoZLgn4Jt5TdOWWzFyQf6jLfEXhnKHaHRvCzRofERa0CbAnwAUviCEIRh6OE8GWAy3xDGHH6VltpKe7vSGjJfzwkDnAckJm1v9fghFiv7u6_xqfZlF8iB26QlWNE86HHYqzyIP3N9LKEh0NWNZAdiV__IdSu_RqOJPYoHDRNRRsyctIbVsj3CDhUyCADZvROzoeQI9VvIqJSiWLTxE7royBXKDDS96rJYovyIQ79hC_n_aNjoPVUD9jfp5cnJkn_rkGpzetwAYJTRSKhP8gM5YlFdK2Pfp2uT6ZHzVAOYmlyeCX4dc1IsyRtinTLx5WyAUPR_QcLPQzuQcRPvtjL23ZvKxoexvKp3t4zX_HTFKMrduT4G6ojAd7C-kurnZ1Wx6g%26flowName%3DGeneralOAuthFlow%26as%3DS557386361%253A1766903862725658%26client_id%3D932402265855-3k3mfquq4o5kh60o8tnc9mhgn9h77717.apps.googleusercontent.com%26requestPath%3D%252Fsignin%252Foauth%252Fconsent%23&app_domain=https%3A%2F%2Fgadgets.zoho.com",
                            "_blank"
                          );
                        }}
                      >
                        Authenticate Google
                      </button>
                    </div>
                  ) : selectedCloudProvider === "dropbox" ? (
                    /* Dropbox Authentication Content */
                    <div className="flex flex-col items-center max-w-lg">
                      {/* Dropbox Logo */}
                      <div className="mb-8">
                        <div className="relative w-32 h-32 flex items-center justify-center">
                          {/* Dropbox Box Logo - Geometric box made of smaller boxes */}
                          <svg viewBox="0 0 128 128" className="w-full h-full">
                            <defs>
                              <linearGradient id="dropboxGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#0061FF" />
                                <stop offset="100%" stopColor="#0052CC" />
                              </linearGradient>
                            </defs>
                            {/* Dropbox geometric box icon - composed of smaller boxes */}
                            <g fill="url(#dropboxGradient)">
                              {/* Top-left box */}
                              <rect x="8" y="8" width="48" height="48" rx="4" />
                              {/* Top-right box */}
                              <rect x="72" y="8" width="48" height="48" rx="4" />
                              {/* Bottom-left box */}
                              <rect x="8" y="72" width="48" height="48" rx="4" />
                              {/* Bottom-right box */}
                              <rect x="72" y="72" width="48" height="48" rx="4" />
                            </g>
                          </svg>
                        </div>
                      </div>

                      {/* Terms and Conditions Text */}
                      <div className="text-sm text-gray-700 text-center mb-8 leading-relaxed">
                        <p>
                          By clicking on this button you agree to the provider's{" "}
                          <a
                            href="#"
                            className="text-blue-600 underline hover:text-blue-700"
                            onClick={(e) => e.preventDefault()}
                          >
                            terms of use
                          </a>{" "}
                          and{" "}
                          <a
                            href="#"
                            className="text-blue-600 underline hover:text-blue-700"
                            onClick={(e) => e.preventDefault()}
                          >
                            privacy policy
                          </a>{" "}
                          and understand that the rights to use this product do not come from Zoho.
                        </p>
                      </div>

                      {/* Authenticate Dropbox Button */}
                      <button
                        className="px-8 py-3 bg-blue-600 text-white rounded-md text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm"
                        onClick={() => {
                          window.open(
                            "https://www.dropbox.com/oauth2/authorize?response_type=code&client_id=ovpkm9147d63ifh&redirect_uri=https://gadgets.zoho.com/dropbox/auth/v2/saveToken&state=190d910cedbc107e58195259f79a434d05c66c88e1e6eaa0bc585c6a0fddb159871ede64adb4d5da61c107ca7cbb7bae891c80e9c69cf125faaaf622ab58f37c5b1d42b42c7f3add07d92465295564a6c5bd98228654cce8ff68da24941db6f0aab9a60398ac49e41b3ec211acfd5bcc&force_reapprove=true&token_access_type=offline",
                            "_blank"
                          );
                        }}
                      >
                        Authenticate Dropbox
                      </button>
                    </div>
                  ) : selectedCloudProvider === "box" ? (
                    /* Box Authentication Content */
                    <div className="flex flex-col items-center max-w-lg">
                      {/* Box Logo */}
                      <div className="mb-8">
                        <div className="relative w-32 h-32 flex items-center justify-center">
                          {/* Box Logo - Blue "b" inside a square with cloud background */}
                          <div className="relative">
                            {/* White cloud shape background */}
                            <div className="absolute inset-0 bg-gray-100 rounded-full transform scale-110"></div>
                            {/* Blue square with rounded corners */}
                            <div className="relative w-24 h-24 bg-[#0061D5] rounded-lg flex items-center justify-center">
                              {/* White lowercase "b" */}
                              <span className="text-white text-4xl font-bold">b</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Terms and Conditions Text */}
                      <div className="text-sm text-gray-700 text-center mb-8 leading-relaxed">
                        <p>
                          By clicking on this button you agree to the provider's{" "}
                          <a
                            href="#"
                            className="text-blue-600 underline hover:text-blue-700"
                            onClick={(e) => e.preventDefault()}
                          >
                            terms of use
                          </a>{" "}
                          and{" "}
                          <a
                            href="#"
                            className="text-blue-600 underline hover:text-blue-700"
                            onClick={(e) => e.preventDefault()}
                          >
                            privacy policy
                          </a>{" "}
                          and understand that the rights to use this product do not come from Zoho.
                        </p>
                      </div>

                      {/* Authenticate Box Button */}
                      <button
                        className="px-8 py-3 bg-blue-600 text-white rounded-md text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm"
                        onClick={() => {
                          window.open(
                            "https://account.box.com/api/oauth2/authorize?response_type=code&client_id=f95f6ysfm8vg1q3g84m0xyyblwnj3tr5&redirect_uri=https%3A%2F%2Fgadgets.zoho.com%2Fauth%2Fbox&state=37e352acfadd37786b1d388fb0f382baa59c9246f4dda329361910db55643700578352e4636bde8a0743bd3060e51af0ee338a34b2080bbd53a337f46b0995e28facbeff76d7efaf8db4493a0ef77be45364e38816d94499fba739987744dd1f6f5c08f84c0a11b00e075d91d7ea5c6d",
                            "_blank"
                          );
                        }}
                      >
                        Authenticate Box
                      </button>
                    </div>
                  ) : selectedCloudProvider === "onedrive" ? (
                    /* OneDrive Authentication Content */
                    <div className="flex flex-col items-center max-w-lg">
                      {/* OneDrive Logo */}
                      <div className="mb-8">
                        <div className="relative w-32 h-32 flex items-center justify-center">
                          {/* OneDrive Logo - Blue cloud icon */}
                          <div className="relative">
                            <Cloud size={128} className="text-[#0078D4]" fill="#0078D4" strokeWidth={0} />
                          </div>
                        </div>
                      </div>

                      {/* Terms and Conditions Text */}
                      <div className="text-sm text-gray-700 text-center mb-8 leading-relaxed">
                        <p>
                          By clicking on this button you agree to the provider's{" "}
                          <a
                            href="#"
                            className="text-blue-600 underline hover:text-blue-700"
                            onClick={(e) => e.preventDefault()}
                          >
                            terms of use
                          </a>{" "}
                          and{" "}
                          <a
                            href="#"
                            className="text-blue-600 underline hover:text-blue-700"
                            onClick={(e) => e.preventDefault()}
                          >
                            privacy policy
                          </a>{" "}
                          and understand that the rights to use this product do not come from Zoho.
                        </p>
                      </div>

                      {/* Authenticate OneDrive Button */}
                      <button
                        className="px-8 py-3 bg-blue-600 text-white rounded-md text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm"
                        onClick={() => {
                          window.open(
                            "https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=0ecabec7-1fac-433f-a968-9985926b51c3&state=e0b1053c9465a9cb98fea7eea99d3074930c6c5607a21200967caf2db861cf9df77442c92e8565087c2a339614e18415cbeb95d59c63605cee4415353b2c44da13c6b9f34bca1fcd3abdd630595133a5232ddb876567bedbe620001a59c9989df94c3823476d0eef4363b351e8886c5563f56bc9d39db9f3db7c37cd1ad827c5.%5E.US&redirect_uri=https%3A%2F%2Fgadgets.zoho.com%2Ftpa%2Foffice365&response_type=code&prompt=select_account&scope=Files.Read%20User.Read%20offline_access&sso_reload=true",
                            "_blank"
                          );
                        }}
                      >
                        Authenticate OneDrive
                      </button>
                    </div>
                  ) : selectedCloudProvider === "zoho" || selectedCloudProvider === "gdrive" || selectedCloudProvider === "dropbox" || selectedCloudProvider === "box" ? (
                    /* Functional Cloud Picker Content */
                    <div className="w-full flex-1 overflow-hidden flex flex-col">
                      {/* Search bar inside picker */}
                      <div className="mb-4 relative">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          type="text"
                          placeholder={`Search in ${selectedCloudProvider}...`}
                          className="w-full pl-10 pr-3 py-2 border border-gray-200 rounded-md text-sm outline-none focus:border-blue-500 transition-all font-medium text-slate-700"
                          value={cloudSearchQuery}
                          onChange={(e) => setCloudSearchQuery(e.target.value)}
                        />
                      </div>

                      <div className="flex-1 overflow-y-auto">
                        <div className="flex border-b border-gray-100 pb-2 mb-2 text-xs font-bold text-gray-400 uppercase tracking-wider px-2">
                          <div className="w-[60%]">File Name</div>
                          <div className="w-[20%] text-right">Size</div>
                          <div className="w-[20%] text-right">Modified</div>
                        </div>
                        <div className="space-y-1">
                          {[
                            { id: 'cf1', name: 'Contract_Draft.pdf', size: 1048576, modified: '2 days ago', type: 'pdf' },
                            { id: 'cf2', name: 'Identity_Proof.jpg', size: 2097152, modified: 'Yesterday', type: 'image' },
                            { id: 'cf3', name: 'Tax_Exemption_Form.pdf', size: 524288, modified: '1 week ago', type: 'pdf' },
                            { id: 'cf4', name: 'Company_Logo_HighRes.png', size: 4194304, modified: '3 hours ago', type: 'image' },
                            { id: 'cf5', name: 'Previous_Invoices_Bundle.zip', size: 8388608, modified: 'May 12, 2025', type: 'zip' },
                          ]
                            .filter(f => f.name.toLowerCase().includes(cloudSearchQuery.toLowerCase()))
                            .map((file) => (
                              <div
                                key={file.id}
                                onClick={() => {
                                  if (selectedCloudFiles.find(sf => sf.id === file.id)) {
                                    setSelectedCloudFiles(selectedCloudFiles.filter(sf => sf.id !== file.id));
                                  } else {
                                    setSelectedCloudFiles([...selectedCloudFiles, file]);
                                  }
                                }}
                                className={`flex items-center p-3 rounded-lg border cursor-pointer transition-all ${selectedCloudFiles.find(sf => sf.id === file.id)
                                  ? 'bg-blue-50 border-blue-200'
                                  : 'bg-white border-transparent hover:bg-slate-50'
                                  }`}
                              >
                                <div className="w-[60%] flex items-center gap-3">
                                  <div className={`w-8 h-8 rounded flex items-center justify-center ${selectedCloudFiles.find(sf => sf.id === file.id) ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500'
                                    }`}>
                                    <FileText size={16} />
                                  </div>
                                  <span className="text-[14px] font-medium text-slate-700">{file.name}</span>
                                </div>
                                <div className="w-[20%] text-right text-xs text-slate-500">{(file.size / 1024 / 1024).toFixed(1)} MB</div>
                                <div className="w-[20%] text-right text-xs text-slate-500">{file.modified}</div>
                              </div>
                            ))}
                        </div>
                      </div>
                    </div>
                  ) : selectedCloudProvider === "evernote" ? (
                    /* Evernote Authentication Content */
                    <div className="flex flex-col items-center max-w-lg">
                      {/* Evernote Logo */}
                      <div className="mb-8">
                        <div className="relative w-32 h-32 flex items-center justify-center">
                          {/* Evernote Logo - Green square with elephant head */}
                          <div className="relative w-32 h-32 bg-[#00A82D] rounded-lg flex items-center justify-center shadow-lg">
                            {/* Elephant head silhouette - simplified */}
                            <svg viewBox="0 0 100 100" className="w-20 h-20">
                              {/* Elephant head - main shape */}
                              <path
                                d="M 50 15 Q 25 15 15 35 Q 10 45 10 60 Q 10 75 20 85 Q 15 80 15 70 Q 15 60 25 55 Q 20 50 20 40 Q 20 30 30 30 Q 35 25 40 30 Q 45 25 50 30 Q 55 25 60 30 Q 65 25 70 30 Q 75 30 75 40 Q 75 50 70 55 Q 80 60 80 70 Q 80 80 75 85 Q 85 75 85 60 Q 85 45 80 35 Q 70 15 50 15 Z"
                                fill="#2D2926"
                              />
                              {/* Elephant ear */}
                              <ellipse cx="20" cy="50" rx="8" ry="15" fill="#2D2926" />
                              {/* Elephant trunk */}
                              <path
                                d="M 40 40 Q 35 45 35 50 Q 35 55 40 60"
                                stroke="#2D2926"
                                strokeWidth="2.5"
                                fill="none"
                                strokeLinecap="round"
                              />
                            </svg>
                          </div>
                        </div>
                      </div>

                      {/* Terms and Conditions Text */}
                      <div className="text-sm text-gray-700 text-center mb-8 leading-relaxed">
                        <p>
                          By clicking on this button you agree to the provider's{" "}
                          <a
                            href="#"
                            className="text-blue-600 underline hover:text-blue-700"
                            onClick={(e) => e.preventDefault()}
                          >
                            terms of use
                          </a>{" "}
                          and{" "}
                          <a
                            href="#"
                            className="text-blue-600 underline hover:text-blue-700"
                            onClick={(e) => e.preventDefault()}
                          >
                            privacy policy
                          </a>{" "}
                          and understand that the rights to use this product do not come from Zoho.
                        </p>
                      </div>

                      {/* Authenticate Evernote Button */}
                      <button
                        className="px-8 py-3 bg-[#00A82D] text-white rounded-md text-sm font-semibold hover:bg-[#008A24] transition-colors shadow-sm"
                        onClick={() => {
                          window.open(
                            "https://accounts.evernote.com/login",
                            "_blank"
                          );
                        }}
                      >
                        Authenticate Evernote
                      </button>
                    </div>
                  ) : (
                    /* Default Content for Zoho WorkDrive */
                    <div className="flex flex-col items-center justify-center">
                      {/* Illustration Area - Using a placeholder illustration */}
                      <div className="relative w-full max-w-md h-64 mb-6 flex items-center justify-center">
                        <div className="relative w-full h-full">
                          {/* Stylized illustration with people and documents */}
                          <div className="absolute inset-0 flex items-end justify-center">
                            {/* Person on document with laptop */}
                            <div className="relative">
                              <div className="w-24 h-32 bg-gray-300 rounded-lg mb-2"></div>
                              <div className="absolute -top-8 left-1/2 transform -translate-x-1/2">
                                <div className="w-12 h-12 bg-blue-400 rounded-full flex items-center justify-center">
                                  <Plus size={20} className="text-white" />
                                </div>
                              </div>
                              <div className="absolute top-2 left-1/2 transform -translate-x-1/2">
                                <div className="w-8 h-6 bg-gray-200 rounded"></div>
                              </div>
                            </div>
                            {/* Person pushing document */}
                            <div className="relative ml-8">
                              <div className="w-20 h-28 bg-purple-300 rounded-lg mb-2"></div>
                              <div className="absolute -top-8 left-1/2 transform -translate-x-1/2">
                                <div className="w-12 h-12 bg-purple-400 rounded-full flex items-center justify-center">
                                  <Plus size={20} className="text-white" />
                                </div>
                              </div>
                              <div className="absolute top-4 left-1/2 transform -translate-x-1/2">
                                <div className="text-2xl font-bold text-purple-600">A</div>
                              </div>
                            </div>
                            {/* Person with list */}
                            <div className="relative ml-8">
                              <div className="w-20 h-28 bg-pink-300 rounded-lg mb-2"></div>
                              <div className="absolute -top-8 left-1/2 transform -translate-x-1/2">
                                <div className="w-12 h-12 bg-pink-400 rounded-full flex items-center justify-center">
                                  <Plus size={20} className="text-white" />
                                </div>
                              </div>
                              <div className="absolute top-4 left-1/2 transform -translate-x-1/2">
                                <div className="space-y-1">
                                  <div className="w-12 h-1 bg-pink-600 rounded"></div>
                                  <div className="w-10 h-1 bg-pink-600 rounded"></div>
                                  <div className="w-8 h-1 bg-pink-600 rounded"></div>
                                </div>
                              </div>
                            </div>
                          </div>
                          {/* Decorative shapes */}
                          <div className="absolute top-4 left-8 w-3 h-3 bg-yellow-400 rounded-full"></div>
                          <div className="absolute top-12 right-12 w-4 h-4 bg-blue-400 transform rotate-45"></div>
                          <div className="absolute bottom-8 left-12 w-2 h-2 bg-purple-400 rounded-full"></div>
                          <div className="absolute bottom-16 right-8 w-3 h-3 bg-pink-400 transform rotate-45"></div>
                        </div>
                      </div>

                      {/* Description Text */}
                      <p className="text-sm text-gray-600 text-center mb-6 max-w-md">
                        Zoho WorkDrive is an online file sync, storage and content collaboration platform.
                      </p>

                      {/* Set up your team button */}
                      <button
                        className="px-6 py-2.5 bg-green-600 text-white rounded-md text-sm font-semibold hover:bg-green-700 transition-colors shadow-sm"
                        onClick={() => {
                          window.open(
                            "https://workdrive.zoho.com/home/onboard/createteamwithsoid?org_id=909892451&service_name=ZohoBooks",
                            "_blank"
                          );
                        }}
                      >
                        Set up your team
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

        )
      }

      {/* Configure Payment Terms Modal */}
      {configureTermsOpen && (
        <ConfigurePaymentTermsModal
          isOpen={configureTermsOpen}
          onClose={() => setConfigureTermsOpen(false)}
          onSave={(terms) => setPaymentTermsList(terms)}
          initialTerms={paymentTermsList}
        />
      )}

      {isNewCurrencyModalOpen && (
        <NewCurrencyModal
          onClose={() => setIsNewCurrencyModalOpen(false)}
          onSave={handleSaveNewCurrency}
        />
      )}

      {/* Customer Number Settings Modal */}
      {isCustomerNumberSettingsModalOpen && createPortal(
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-3 sm:p-4 bg-black/25 backdrop-blur-[2px]">
          <div className="bg-white rounded-md shadow-xl w-full max-w-[720px] max-h-[90vh] overflow-y-auto">
            <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-800">
                Configure Customer Numbers Preferences
              </h3>
              <button
                type="button"
                onClick={() => setIsCustomerNumberSettingsModalOpen(false)}
                className="w-6 h-6 flex items-center justify-center border border-blue-500 rounded-sm text-red-500 hover:bg-red-50"
              >
                <X size={14} />
              </button>
            </div>

            <div className="px-5 py-4">
              <p className="text-sm text-gray-600 max-w-[620px] mb-6 leading-relaxed">
                Customer numbers will be auto-generated based on the preferences below. For each new customer that is created, the number after the prefix will be incremented by 1.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-5 max-w-[520px]">
                <div>
                  <label className="block text-sm text-gray-700 mb-2">Prefix</label>
                  <input
                    type="text"
                    value={customerNumberPrefix}
                    onChange={(e) => setCustomerNumberPrefix(e.target.value)}
                    placeholder="CUS-"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-2">Next Number</label>
                  <input
                    type="text"
                    value={customerNumberStart}
                    onChange={(e) => setCustomerNumberStart(e.target.value)}
                    placeholder="00003"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="bg-[#fdf4ec] border border-[#f6e4d3] rounded-md p-4 mb-4">
                <p className="text-sm text-gray-700 leading-relaxed">
                  Note: If you want to change only this customer's number without affecting the current series, you can edit it directly from the Customer Number field after closing this popup.
                </p>
              </div>
            </div>

            <div className="px-5 py-4 border-t border-gray-200 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleSaveCustomerNumberSettings}
                disabled={isSavingSettings}
                className="px-4 py-2 bg-[#156372] text-white text-sm rounded-md hover:bg-[#0f4f5a] disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSavingSettings && <Loader2 className="w-4 h-4 animate-spin" />}
                Save
              </button>
              <button
                type="button"
                onClick={() => setIsCustomerNumberSettingsModalOpen(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 text-sm border border-gray-300 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
      <NewTaxModal
        isOpen={isNewTaxModalOpen}
        onClose={() => setIsNewTaxModalOpen(false)}
        onCreated={async (tax) => {
          const createdTax = tax?.tax || tax?.data || tax;
          const taxId = String(createdTax?._id || createdTax?.id || createdTax?.tax_id || "");
          await loadTaxes();
          if (taxId) {
            setFormData((prev) => ({ ...prev, taxRate: taxId }));
          }
          setIsNewTaxModalOpen(false);
        }}
      />
    </div>
  );
}

