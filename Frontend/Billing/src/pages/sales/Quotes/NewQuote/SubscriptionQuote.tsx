import React, { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Calculator, CalendarDays, ChevronDown, ChevronRight, ChevronUp, Edit2, Image as ImageIcon, Info, MoreVertical, PlusCircle, Search, Settings, ShoppingBag, Tag, Upload, X } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import { toast } from "react-toastify";
import { Customer, Salesperson, getCustomers, getPlansFromAPI, getQuotes, getSalespersonsFromAPI, getTaxesFromAPI, saveQuote, saveSalesperson, saveTax, updateCustomer, updateSalesperson } from "../../salesModel.ts";
import { quotesAPI, reportingTagsAPI, priceListsAPI, productsAPI, salespersonsAPI, settingsAPI, transactionNumberSeriesAPI } from "../../../../services/api.ts";
import { readTaxesLocal, writeTaxesLocal } from "../../../settings/organization-settings/taxes-compliance/TAX/storage.ts";
import { buildTaxOptionGroups, taxLabel, normalizeCreatedTaxPayload } from "../../../../hooks/Taxdropdownstyle";
import { Country, State } from "country-state-city";

type SubscriptionQuoteForm = {
  customerName: string;
  quoteNumber: string;
  referenceNumber: string;
  quoteDate: string;
  expiryDate: string;
  salesperson: string;
  subject: string;
  product: string;
  plan: string;
  quantity: string;
  rate: string;
  tax: string;
  expiresAfter: string;
  neverExpires: boolean;
  customerNotes: string;
  termsAndConditions: string;
  collectPaymentOffline: boolean;
  location: string;
  taxPreference: string;
  priceList: string;
  coupon: string;
  couponCode: string;
  couponValue: string;
  meteredBilling: boolean;
};

type ProductOption = {
  id: string;
  name: string;
  code?: string;
  status?: string;
  active?: boolean;
  plans?: any[];
  addons?: any[];
};

type PlanAddonOption = {
  id: string;
  name: string;
  code: string;
  type: "plan" | "addon";
  productId?: string;
  productName: string;
  rate: number;
  taxSelection?: string;
  taxName?: string;
  taxRate?: number;
  status?: string;
  active?: boolean;
};

type CouponOption = {
  id: string;
  couponName: string;
  couponCode: string;
  discountType: string;
  discountValue: number;
  status?: string;
  active?: boolean;
  product?: string;
  productId?: string;
};

type PriceListSwitchDialogState = {
  customerName: string;
  currentPriceListName: string;
  nextPriceListName: string;
};

const inputClass =
  "h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-[13px] text-slate-800 outline-none transition focus:border-[#3b82f6]";
const requiredLabelClass = "text-[16px] font-normal text-red-600";
const primaryActionBg = "#0d4a52";
const primaryActionHover = "#0b3b43";

export default function SubscriptionQuote() {
  const navigate = useNavigate();
  const location = useLocation();
  const customerDropdownRef = useRef<HTMLDivElement | null>(null);
  const salespersonDropdownRef = useRef<HTMLDivElement | null>(null);
  const productDropdownRef = useRef<HTMLDivElement | null>(null);
  const planAddonDropdownRef = useRef<HTMLDivElement | null>(null);
  const quoteDateNativeRef = useRef<HTMLInputElement | null>(null);
  const expiryDateNativeRef = useRef<HTMLInputElement | null>(null);
  const cachedGeneralSettings = settingsAPI.getCachedGeneralSettings?.() || {};
  const cachedTaxModeSetting = String(
    cachedGeneralSettings?.taxSettings?.taxInclusive ??
    cachedGeneralSettings?.taxSettings?.taxBasis ??
    cachedGeneralSettings?.taxSettings?.taxMode ??
    "both"
  ).trim().toLowerCase();
  const initialTaxPreferenceValue = (() => {
    if (
      cachedTaxModeSetting.includes("both") ||
      (cachedTaxModeSetting.includes("inclusive") && cachedTaxModeSetting.includes("exclusive"))
    ) {
      return "Tax Exclusive";
    }
    if (
      cachedTaxModeSetting === "inclusive" ||
      cachedTaxModeSetting === "tax inclusive" ||
      cachedTaxModeSetting.includes("tax inclusive")
    ) {
      return "Tax Inclusive";
    }
    if (
      cachedTaxModeSetting === "exclusive" ||
      cachedTaxModeSetting === "tax exclusive" ||
      cachedTaxModeSetting.includes("tax exclusive")
    ) {
      return "Tax Exclusive";
    }
    return "Tax Exclusive";
  })();
  const todayLabel = useMemo(
    () =>
      new Intl.DateTimeFormat("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(new Date()),
    []
  );

  const [formData, setFormData] = useState<SubscriptionQuoteForm>({
    customerName: "",
    quoteNumber: "QT-000001",
    referenceNumber: "",
    quoteDate: todayLabel,
    expiryDate: "",
    salesperson: "",
    subject: "",
    product: "",
    plan: "",
    quantity: "1.00",
    rate: "0.00",
    tax: "",
    expiresAfter: "",
    neverExpires: true,
    customerNotes: "Looking forward for your business.",
    termsAndConditions: "",
    collectPaymentOffline: true,
    location: "Head Office",
    taxPreference: initialTaxPreferenceValue,
    priceList: "Select Price List",
    coupon: "",
    couponCode: "",
    couponValue: "0.00",
    meteredBilling: false,
  });
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isSalespersonDropdownOpen, setIsSalespersonDropdownOpen] = useState(false);
  const [salespersonSearch, setSalespersonSearch] = useState("");
  const [salespersons, setSalespersons] = useState<Salesperson[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [planAddons, setPlanAddons] = useState<PlanAddonOption[]>([]);
  const [selectedPlanAddon, setSelectedPlanAddon] = useState<PlanAddonOption | null>(null);
  const [selectedAddon, setSelectedAddon] = useState<PlanAddonOption | null>(null);
  const [isProductDropdownOpen, setIsProductDropdownOpen] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const [isPlanAddonDropdownOpen, setIsPlanAddonDropdownOpen] = useState(false);
  const [planAddonSearch, setPlanAddonSearch] = useState("");
  const addonRowRef = useRef<HTMLDivElement | null>(null);
  const [isAddonRowVisible, setIsAddonRowVisible] = useState(false);
  const [isAddonDropdownOpen, setIsAddonDropdownOpen] = useState(false);
  const [addonSearch, setAddonSearch] = useState("");
  const [addonQuantity, setAddonQuantity] = useState("1.00");
  const [addonRate, setAddonRate] = useState("0.00");
  const [addonTax, setAddonTax] = useState("");
  const [addonTaxSearch, setAddonTaxSearch] = useState("");
  const [isAddonTaxDropdownOpen, setIsAddonTaxDropdownOpen] = useState(false);
  const [isManageSalespersonsOpen, setIsManageSalespersonsOpen] = useState(false);
  const [manageSalespersonSearch, setManageSalespersonSearch] = useState("");
  const [selectedSalespersonIds, setSelectedSalespersonIds] = useState<string[]>([]);
  const [manageSalespersonMenuOpen, setManageSalespersonMenuOpen] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const [isNewSalespersonFormOpen, setIsNewSalespersonFormOpen] = useState(false);
  const [editingSalespersonId, setEditingSalespersonId] = useState<string | null>(null);
  const [newSalespersonData, setNewSalespersonData] = useState({ name: "", email: "" });
  const [locationOptions, setLocationOptions] = useState<string[]>(["Head Office"]);
  const [isLocationDropdownOpen, setIsLocationDropdownOpen] = useState(false);
  const locationDropdownRef = useRef<HTMLDivElement | null>(null);
  const [isTaxPreferenceDropdownOpen, setIsTaxPreferenceDropdownOpen] = useState(false);
  const taxPreferenceDropdownRef = useRef<HTMLDivElement | null>(null);
  const [catalogPriceLists, setCatalogPriceLists] = useState<any[]>([]);
  const [priceListSwitchDialog, setPriceListSwitchDialog] = useState<PriceListSwitchDialogState | null>(null);
  const [enabledSettings, setEnabledSettings] = useState<any>(cachedGeneralSettings);
  const [isCouponDropdownOpen, setIsCouponDropdownOpen] = useState(false);
  const couponDropdownRef = useRef<HTMLTableCellElement | null>(null);
  const [couponSearch, setCouponSearch] = useState("");
  const [coupons, setCoupons] = useState<CouponOption[]>([]);
  const [isTaxDropdownOpen, setIsTaxDropdownOpen] = useState(false);
  const taxDropdownRef = useRef<HTMLDivElement | null>(null);
  const [taxSearch, setTaxSearch] = useState("");
  const [taxes, setTaxes] = useState<any[]>([]);
  const [isNewTaxModalOpen, setIsNewTaxModalOpen] = useState(false);
  const [isNewTaxSaving, setIsNewTaxSaving] = useState(false);
  const [newTaxForm, setNewTaxForm] = useState({ name: "", rate: "", isCompound: false });
  const [newTaxError, setNewTaxError] = useState("");
  const moreMenuRef = useRef<HTMLDivElement | null>(null);
  const [showReportingTags, setShowReportingTags] = useState(true);
  const [availableReportingTags, setAvailableReportingTags] = useState<any[]>([]);
  const [reportingTagSelections, setReportingTagSelections] = useState<Record<string, string>>({});
  const [isReportingTagsDropdownOpen, setIsReportingTagsDropdownOpen] = useState(false);
  const [activeReportingTagId, setActiveReportingTagId] = useState<string | null>(null);
  const [reportingTagSearch, setReportingTagSearch] = useState("");
  const reportingTagsDropdownRef = useRef<HTMLDivElement | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const didPrefillCustomerRef = useRef(false);
  const [billingAddress, setBillingAddress] = useState<any | null>(null);
  const [shippingAddress, setShippingAddress] = useState<any | null>(null);
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [addressModalType, setAddressModalType] = useState<"billing" | "shipping">("billing");
  const [isAddressSaving, setIsAddressSaving] = useState(false);
  const [isPhoneCodeDropdownOpen, setIsPhoneCodeDropdownOpen] = useState(false);
  const [phoneCodeSearch, setPhoneCodeSearch] = useState("");
  const phoneCodeDropdownRef = useRef<HTMLDivElement | null>(null);
  const [addressFormData, setAddressFormData] = useState({
    attention: "",
    country: "",
    street1: "",
    street2: "",
    city: "",
    state: "",
    zipCode: "",
    phoneCountryCode: "",
    phone: "",
    fax: "",
  });
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);
  const [showImmediateBreakdown, setShowImmediateBreakdown] = useState(true);
  const [showRecurringBreakdown, setShowRecurringBreakdown] = useState(true);
  const [isSendApprovalModalOpen, setIsSendApprovalModalOpen] = useState(false);
  const [saveLoading, setSaveLoading] = useState<null | "draft" | "send">(null);
  const [isQuoteNumberModalOpen, setIsQuoteNumberModalOpen] = useState(false);
  const [quoteNumberMode, setQuoteNumberMode] = useState<"auto" | "manual">("auto");
  const [quotePrefix, setQuotePrefix] = useState("QT-");
  const [quoteNextNumber, setQuoteNextNumber] = useState("000001");

  const updateField = <K extends keyof SubscriptionQuoteForm>(field: K, value: SubscriptionQuoteForm[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };
  const closeOpenDropdowns = () => {
    setIsCustomerDropdownOpen(false);
    setIsSalespersonDropdownOpen(false);
    setIsProductDropdownOpen(false);
    setIsPlanAddonDropdownOpen(false);
    setIsAddonDropdownOpen(false);
    setIsAddonTaxDropdownOpen(false);
    setIsLocationDropdownOpen(false);
    setIsTaxPreferenceDropdownOpen(false);
    setIsCouponDropdownOpen(false);
    setIsTaxDropdownOpen(false);
    setIsReportingTagsDropdownOpen(false);
    setActiveReportingTagId(null);
    setReportingTagSearch("");
    setIsPhoneCodeDropdownOpen(false);
  };
  const isProductSelected = formData.product.trim().length > 0;
  const normalizeText = (value: any) => String(value || "").trim().toLowerCase();
  const rawTaxPreferenceMode = String(
    enabledSettings?.taxSettings?.taxInclusive ??
    enabledSettings?.taxSettings?.taxBasis ??
    enabledSettings?.taxSettings?.taxMode ??
    "both"
  ).trim().toLowerCase();
  const taxPreferenceMode = (() => {
    if (!rawTaxPreferenceMode) return "both";
    if (
      rawTaxPreferenceMode.includes("both") ||
      (rawTaxPreferenceMode.includes("inclusive") && rawTaxPreferenceMode.includes("exclusive"))
    ) {
      return "both";
    }
    if (
      rawTaxPreferenceMode === "inclusive" ||
      rawTaxPreferenceMode === "tax inclusive" ||
      rawTaxPreferenceMode.includes("tax inclusive")
    ) {
      return "inclusive";
    }
    if (
      rawTaxPreferenceMode === "exclusive" ||
      rawTaxPreferenceMode === "tax exclusive" ||
      rawTaxPreferenceMode.includes("tax exclusive")
    ) {
      return "exclusive";
    }
    if (rawTaxPreferenceMode.includes("inclusive")) return "inclusive";
    if (rawTaxPreferenceMode.includes("exclusive")) return "exclusive";
    return "both";
  })();
  const isTaxPreferenceLocked = taxPreferenceMode === "inclusive" || taxPreferenceMode === "exclusive";
  const resolvedTaxPreference = taxPreferenceMode === "inclusive"
    ? "Tax Inclusive"
    : taxPreferenceMode === "exclusive"
      ? "Tax Exclusive"
      : formData.taxPreference || "Tax Exclusive";

  const selectedPriceList = useMemo(() => {
    const selected = String(formData.priceList || "").trim();
    if (!selected || normalizeText(selected) === "select price list") return null;
    return (
      catalogPriceLists.find((row: any) => String(row?.name || "").trim() === selected) ||
      catalogPriceLists.find((row: any) => String(row?.id || row?._id || "").trim() === selected) ||
      null
    );
  }, [catalogPriceLists, formData.priceList]);

  const normalizeSelectedPriceListName = (value: any) => {
    const normalized = String(value || "").trim();
    if (!normalized || normalizeText(normalized) === "select price list") return "";
    return normalized;
  };

  const resolveCustomerPriceListDefault = (customer: any) => {
    const customerPriceListId = String(customer?.priceListId || customer?.priceListID || customer?.price_list_id || "").trim();
    const customerPriceListNameRaw = String(customer?.priceListName || customer?.priceList || customer?.price_list || "").trim();
    const resolvedPriceList =
      (customerPriceListId
        ? catalogPriceLists.find((row: any) => String(row?.id || row?._id || "").trim() === customerPriceListId)
        : null) ||
      (customerPriceListNameRaw
        ? catalogPriceLists.find((row: any) => String(row?.name || "").trim() === customerPriceListNameRaw)
        : null) ||
      null;

    return {
      id: String(resolvedPriceList?.id || resolvedPriceList?._id || customerPriceListId || "").trim(),
      name: String(resolvedPriceList?.name || customerPriceListNameRaw || "").trim(),
    };
  };

  const parsePercentage = (value: any) => {
    const raw = String(value || "").replace(/[^0-9.-]/g, "");
    const num = Number(raw);
    return Number.isFinite(num) ? num : 0;
  };

  const applyRounding = (value: number, roundOffTo: string) => {
    const label = String(roundOffTo || "").toLowerCase();
    if (label.includes("decimal places")) {
      const digits = Number(label.split(" ")[0]);
      if (Number.isFinite(digits)) return Number(value.toFixed(digits));
    }
    if (label.includes("nearest whole")) return Math.round(value);
    if (label.includes("0.99")) return Math.floor(value) + 0.99;
    if (label.includes("0.50")) return Math.floor(value) + 0.5;
    if (label.includes("0.49")) return Math.floor(value) + 0.49;
    return value;
  };

  const getIndividualPriceListRate = (priceList: any, planAddon: PlanAddonOption | null) => {
    if (!priceList || !planAddon) return null;
    if (String(priceList.priceListType || "").toLowerCase() !== "individual") return null;

    const productRates = Array.isArray(priceList.productRates) ? priceList.productRates : [];
    const productRow = productRates.find((row: any) => {
      const rowId = String(row?.productId || "").trim();
      const rowName = String(row?.productName || "").trim();
      return (planAddon.productId && rowId && rowId === String(planAddon.productId).trim()) || (rowName && rowName === planAddon.productName);
    });
    if (!productRow) return null;

    const listRows = planAddon.type === "plan" ? (productRow.plans || []) : (productRow.addons || []);
    const match = (Array.isArray(listRows) ? listRows : []).find((row: any) => {
      const idKey = planAddon.type === "plan" ? "planId" : "addonId";
      const rowId = String(row?.[idKey] || "").trim();
      const rowName = String(row?.name || "").trim();
      return (rowId && rowId === String(planAddon.id)) || (rowName && rowName === planAddon.name);
    });
    if (!match) return null;
    const rate = Number(match.rate ?? match.price);
    return Number.isFinite(rate) ? rate : null;
  };

  const applyPriceListToBaseRate = (baseRate: number, priceList: any, planAddon: PlanAddonOption | null) => {
    if (!priceList) return baseRate;
    const override = getIndividualPriceListRate(priceList, planAddon);
    if (override !== null) return override;
    if (String(priceList.priceListType || "").toLowerCase() === "individual") return baseRate;
    const pct = parsePercentage(priceList.markup);
    if (!pct) return baseRate;
    const type = String(priceList.markupType || "").toLowerCase();
    const next = type === "markdown" ? baseRate * (1 - pct / 100) : baseRate * (1 + pct / 100);
    return applyRounding(next, priceList.roundOffTo || "Never mind");
  };

  const parseTaxRate = (value: any) => {
    const raw = String(value ?? "").trim();
    if (!raw) return 0;
    const percentMatch = raw.match(/-?\d+(\.\d+)?/);
    const parsed = Number(percentMatch ? percentMatch[0] : raw);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const getTaxBySelection = (taxValue: any): any => {
    const valueStr = String(taxValue || "").trim();
    if (!valueStr) return null;

    const direct = taxes.find((tax: any) => {
      const id = String(tax?.id || tax?._id || "").trim();
      const name = String(tax?.name || tax?.taxName || "").trim().toLowerCase();
      return id === valueStr || name === valueStr.toLowerCase();
    });
    if (direct) return direct;

    const numericRate = parseTaxRate(valueStr);
    if (numericRate > 0) {
      const byRate = taxes.find((tax: any) => Number(tax?.rate || 0) === numericRate);
      if (byRate) return byRate;
    }

    return null;
  };

  const formatTaxLabel = (tax: any) => {
    if (!tax) return "";
    const name = String(tax?.name || tax?.taxName || "").trim();
    const rate = Number(tax?.rate ?? tax?.taxRate ?? 0) || 0;
    if (!name) return "";
    return `${name} [${rate}%]`;
  };

  const getCustomerTaxLabel = (customer: any) => {
    const raw = String(customer?.taxRate || customer?.taxId || customer?.tax || "").trim();
    if (!raw) return "";
    const matched = getTaxBySelection(raw);
    if (matched) return formatTaxLabel(matched);
    const parsedRate = parseTaxRate(raw);
    if (parsedRate > 0) return raw.includes("[") ? raw : `Tax [${parsedRate}%]`;
    return "";
  };

  const getPlanAddonTaxLabel = (row: PlanAddonOption | null) => {
    if (!row) return "";
    const rawSelection = String(row.taxSelection || "").trim();
    if (rawSelection) {
      const matched = getTaxBySelection(rawSelection);
      if (matched) return formatTaxLabel(matched);
    }
    const explicitName = String(row.taxName || "").trim();
    const explicitRate = Number(row.taxRate ?? 0) || 0;
    if (explicitName && explicitRate > 0) return `${explicitName} [${explicitRate}%]`;
    if (explicitName) return explicitName;
    if (explicitRate > 0) return `Tax [${explicitRate}%]`;
    return "";
  };

  const taxOptionGroups = useMemo(() => buildTaxOptionGroups(taxes as any[]), [taxes]);
  const filteredTaxGroups = useMemo(() => {
    const keyword = taxSearch.trim().toLowerCase();
    if (!keyword) return taxOptionGroups;
    return taxOptionGroups
      .map((group) => ({
        ...group,
        options: group.options.filter((tax) => taxLabel(tax.raw ?? tax).toLowerCase().includes(keyword)),
      }))
      .filter((group) => group.options.length > 0);
  }, [taxSearch, taxOptionGroups]);
  const filteredAddonTaxGroups = useMemo(() => {
    const keyword = addonTaxSearch.trim().toLowerCase();
    if (!keyword) return taxOptionGroups;
    return taxOptionGroups
      .map((group) => ({
        ...group,
        options: group.options.filter((tax) => taxLabel(tax.raw ?? tax).toLowerCase().includes(keyword)),
      }))
      .filter((group) => group.options.length > 0);
  }, [addonTaxSearch, taxOptionGroups]);
  const selectedTaxLabel = useMemo(() => {
    const matchedTax = taxes.find((tax: any) => {
      const id = String(tax?.id || tax?._id || "").trim();
      const label = taxLabel(tax);
      return (id && String(formData.tax || "").trim() === id) || String(formData.tax || "").trim() === label;
    });
    if (!matchedTax) return String(formData.tax || "").trim();
    return taxLabel(matchedTax);
  }, [taxes, formData.tax]);
  const selectedAddonTaxLabel = useMemo(() => {
    const matchedTax = taxes.find((tax: any) => {
      const id = String(tax?.id || tax?._id || "").trim();
      const label = taxLabel(tax);
      return (id && String(addonTax || "").trim() === id) || String(addonTax || "").trim() === label;
    });
    if (!matchedTax) return String(addonTax || "").trim();
    return taxLabel(matchedTax);
  }, [taxes, addonTax]);

  const applyResolvedPriceListChoice = (nextPriceListName: string) => {
    setFormData((prev) => ({
      ...prev,
      priceList: nextPriceListName || "Select Price List",
    }));
    setPriceListSwitchDialog(null);
  };

  const sanitizeQuotePrefix = (value: any) => String(value || "QT-").trim() || "QT-";
  const extractQuoteDigits = (value: any) => {
    const raw = String(value || "").trim();
    const matches = raw.match(/(\d+)\s*$/);
    return matches ? matches[1] : "";
  };
  const deriveQuotePrefixFromNumber = (value: any, fallbackPrefix = "QT-") => {
    const raw = String(value || "").trim();
    if (!raw) return fallbackPrefix;
    const exact = raw.match(/^([^\d]*)(\d+)$/);
    if (exact) {
      const prefix = String(exact[1] || "").trim();
      return prefix || fallbackPrefix;
    }
    const firstDigitIndex = raw.search(/\d/);
    if (firstDigitIndex > 0) {
      return raw.slice(0, firstDigitIndex).trim() || fallbackPrefix;
    }
    return fallbackPrefix;
  };
  const buildQuoteNumber = (prefix: string, number: string) => {
    const normalizedPrefix = sanitizeQuotePrefix(prefix);
    const digits = String(number || "").replace(/\D/g, "") || "000001";
    return `${normalizedPrefix}${digits.padStart(6, "0")}`;
  };

  const isDuplicateQuoteNumberError = (error: any) => {
    const message = String(
      error?.response?.data?.message ||
      error?.response?.data?.error ||
      error?.message ||
      error?.data?.message ||
      ""
    ).toLowerCase();
    return (
      message.includes("duplicate") ||
      message.includes("already exists") ||
      message.includes("conflict") ||
      message.includes("409") ||
      message.includes("quote number already exists")
    );
  };

  const getFreshQuoteNumberForSave = async (currentNumber: string) => {
    const current = String(currentNumber || "").trim();
    const fallbackPrefix = deriveQuotePrefixFromNumber(current, quotePrefix);
    const fallbackDigits = extractQuoteDigits(current) || quoteNextNumber || "000001";

    try {
      const response: any = await transactionNumberSeriesAPI.getNextNumber({ module: "Quote", reserve: true });
      const reservedNumber = String(
        response?.data?.quoteNumber ||
        response?.data?.nextNumber ||
        response?.quoteNumber ||
        response?.nextNumber ||
        ""
      ).trim();
      if (reservedNumber) {
        const reservedPrefix = deriveQuotePrefixFromNumber(reservedNumber, fallbackPrefix);
        const reservedDigits = extractQuoteDigits(reservedNumber) || fallbackDigits;
        return buildQuoteNumber(reservedPrefix, reservedDigits);
      }
    } catch (error) {
      console.error("Failed to reserve quote number before saving subscription quote:", error);
    }

    try {
      const response: any = await transactionNumberSeriesAPI.getNextNumber({ module: "Quote", reserve: false });
      const nextNumber = String(
        response?.data?.quoteNumber ||
        response?.data?.nextNumber ||
        response?.quoteNumber ||
        response?.nextNumber ||
        ""
      ).trim();
      if (nextNumber) {
        const nextPrefix = deriveQuotePrefixFromNumber(nextNumber, fallbackPrefix);
        const nextDigits = extractQuoteDigits(nextNumber) || fallbackDigits;
        return buildQuoteNumber(nextPrefix, nextDigits);
      }
    } catch (error) {
      console.error("Failed to fetch fallback quote number before saving subscription quote:", error);
    }

    try {
      const existingQuotes = await getQuotes();
      const prefix = sanitizeQuotePrefix(fallbackPrefix);
      const maxSuffix = existingQuotes
        .map((quote: any) => String(quote?.quoteNumber || "").trim())
        .filter((number) => number.startsWith(prefix))
        .map((number) => {
          const digits = number.match(/\d+$/);
          return digits ? parseInt(digits[0], 10) : 0;
        })
        .reduce((max, cur) => (cur > max ? cur : max), 0);
      return buildQuoteNumber(prefix, String(maxSuffix + 1));
    } catch (error) {
      console.error("Failed to derive fallback quote number before saving subscription quote:", error);
    }

    return buildQuoteNumber(fallbackPrefix, fallbackDigits);
  };

  const normalizeTaxRows = (rows: any[]) => {
    return rows
      .map((tax: any, idx: number) => {
        const id = String(tax?.id || tax?._id || tax?.tax_id || `tax-${idx}`).trim();
        const name = String(tax?.name || tax?.taxName || "").trim();
        const type = String(tax?.type || (tax?.isGroup ? "group" : "tax")).toLowerCase();
        return {
          ...tax,
          id,
          _id: String(tax?._id || tax?.id || tax?.tax_id || id).trim(),
          name,
          rate: Number(tax?.rate ?? tax?.taxRate ?? 0) || 0,
          type,
          kind: tax?.kind,
          taxType: tax?.taxType,
          description: tax?.description,
          groupTaxes: Array.isArray(tax?.groupTaxes) ? tax.groupTaxes : Array.isArray(tax?.groupTaxIds) ? tax.groupTaxIds : [],
          isActive: tax?.isActive !== false && String(tax?.status || "").toLowerCase() !== "inactive",
          isGroup: Boolean(tax?.isGroup) || type === "group" || String(tax?.description || "") === "__taban_tax_group__",
          isCompound: Boolean(tax?.isCompound || tax?.is_compound),
        };
      })
      .filter((tax: any) => tax.name && tax.isActive);
  };

  const readLocalTaxRows = () => {
    const keys = [
      "taban_taxes_cache",
      "taban_settings_taxes_v1",
      "taban_books_taxes",
      "taban_taxes",
    ];
    const merged: any[] = [];
    keys.forEach((key) => {
      try {
        const raw = localStorage.getItem(key);
        const parsed = raw ? JSON.parse(raw) : [];
        if (Array.isArray(parsed)) merged.push(...parsed);
      } catch {
        // ignore invalid key and continue
      }
    });
    return merged;
  };

  const loadTaxesForDropdown = async () => {
    try {
      const localRows = normalizeTaxRows(readLocalTaxRows());
      const apiRows = normalizeTaxRows(await getTaxesFromAPI());
      const merged = [...localRows, ...apiRows];
      const seen = new Set<string>();
      const deduped = merged.filter((tax: any) => {
        const key = `${String(tax.id || "").toLowerCase()}|${String(tax.name || "").toLowerCase()}|${Number(tax.rate || 0)}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      setTaxes(deduped);
    } catch {
      setTaxes([]);
    }
  };

  const readRows = (key: string) => {
    try {
      const raw = localStorage.getItem(key);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  const extractProductLink = (row: any) => {
    const productSource = row?.product;
    const sourceName =
      typeof productSource === "string"
        ? productSource
        : (productSource?.name || productSource?.productName || productSource?.title || row?.productName || row?.productTitle || "");
    const sourceId =
      typeof productSource === "object"
        ? (productSource?._id || productSource?.id || productSource?.productId || "")
        : "";
    return {
      productId: String(row?.productId || sourceId || "").trim(),
      productName: String(row?.productName || sourceName || "").trim(),
    };
  };
  const buildPlanAddonDedupKey = (row: PlanAddonOption) =>
    [
      row.type,
      normalizeText(row.name),
      normalizeText(row.code),
      String(Number(row.rate || 0).toFixed(2)),
    ].join("|");
  const mapProductsRows = (rows: any[]): ProductOption[] =>
    rows
      .map((row: any, idx: number) => {
        const statusValue =
          row?.status ??
          row?.Status ??
          row?.productStatus ??
          row?.state ??
          row?.statusLabel ??
          row?.statusText;
        const rawActive =
          row?.active ??
          row?.isActive ??
          row?.is_active ??
          row?.enabled;
        const rawInactive =
          row?.inactive ??
          row?.isInactive ??
          row?.is_inactive ??
          row?.disabled;
        const activeValue =
          typeof rawInactive !== "undefined" ? !rawInactive : rawActive;
        return {
          id: String(row?.id || row?._id || `prod-${idx}`),
          name: String(row?.name || row?.productName || row?.product || "").trim(),
          code: String(row?.code || row?.sku || row?.productCode || "").trim(),
          status: String(statusValue || ""),
          active: typeof activeValue === "boolean" ? activeValue : undefined,
          plans: Array.isArray(row?.plans) ? row.plans : [],
          addons: Array.isArray(row?.addons) ? row.addons : [],
        };
      })
      .filter((row: ProductOption) => row.name);

  const formatDateForDisplay = (raw: string) => {
    if (!raw) return "";
    const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (isoMatch) {
      const d = new Date(`${raw}T00:00:00`);
      if (!Number.isNaN(d.getTime())) {
        return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(d);
      }
    }
    const parsed = new Date(raw);
    if (!Number.isNaN(parsed.getTime())) {
      return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(parsed);
    }
    return raw;
  };

  const toIsoDate = (value: string) => {
    if (!value) return "";
    const isoMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (isoMatch) return value;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "";
    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, "0");
    const day = String(parsed.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const handleDateInputChange = (field: "quoteDate" | "expiryDate", isoValue: string) => {
    if (!isoValue) {
      updateField(field, "");
      return;
    }
    const d = new Date(`${isoValue}T00:00:00`);
    updateField(
      field,
      new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(d)
    );
  };

  const openNativeDatePicker = (ref: React.RefObject<HTMLInputElement>) => {
    const target = ref.current;
    if (!target) return;
    if (typeof target.showPicker === "function") {
      target.showPicker();
    } else {
      target.focus();
      target.click();
    }
  };

  useEffect(() => {
    const loadCustomers = async () => {
      try {
        const data = await getCustomers();
        setCustomers(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Failed to load customers for subscription quote:", error);
        setCustomers([]);
      }
    };
    loadCustomers();
  }, []);

  useEffect(() => {
    if (didPrefillCustomerRef.current) return;
    if (!customers.length) return;

    const state = location.state as any;
    if (!state) return;

    const rawId = state.customerId || state?.customer?._id || state?.customer?.id;
    const rawName = state.customerName || state?.customer?.name || state?.customer?.displayName;
    const customerId = rawId ? String(rawId).trim() : "";
    const customerName = rawName ? String(rawName).trim() : "";

    if (!customerId && !customerName) return;

    const match = customers.find((cust: any) => {
      if (customerId) {
        const id = String(cust?.id || cust?._id || cust?.customerId || "").trim();
        if (id && id === customerId) return true;
      }
      if (customerName) {
        const name = displayCustomerName(cust).toLowerCase();
        return name === customerName.toLowerCase();
      }
      return false;
    });

    if (match) {
      updateField("customerName", displayCustomerName(match));
      setSelectedCustomer(match);
      didPrefillCustomerRef.current = true;
      return;
    }

    if (customerName) {
      updateField("customerName", customerName);
      didPrefillCustomerRef.current = true;
    }
  }, [customers, location.key]);

  useEffect(() => {
    const readProducts = async () => {
      try {
        const localRows = mapProductsRows(readRows("inv_products_v1"));
        if (localRows.length) setProducts(localRows);

        try {
          const response: any = await productsAPI.list({ limit: 5000 });
          const rows =
            response?.success && Array.isArray(response?.data)
              ? response.data
              : Array.isArray(response?.data)
                ? response.data
                : Array.isArray(response)
                  ? response
                  : [];
          const apiRows = mapProductsRows(rows);

          if (apiRows.length) {
            const merged = new Map<string, ProductOption>();
            apiRows.forEach((row) => merged.set(String(row.id), row));
            localRows.forEach((row) => {
              if (!merged.has(String(row.id))) merged.set(String(row.id), row);
            });
            setProducts(Array.from(merged.values()));
          }
        } catch (error) {
          console.error("Error loading products from API:", error);
        }
      } catch {
        setProducts([]);
      }
    };

    readProducts();
    const onStorage = (event: StorageEvent) => {
      if (!event.key || event.key === "inv_products_v1") {
        readProducts();
      }
    };
    const onFocus = () => readProducts();
    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", onFocus);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  useEffect(() => {
    const loadPlanAddons = async () => {
      try {
        const plansFromApi = await getPlansFromAPI();
        const localPlans = readRows("inv_plans_v1");
        const mergedPlans = [...(Array.isArray(plansFromApi) ? plansFromApi : []), ...localPlans];
        const mappedPlans: PlanAddonOption[] = mergedPlans
          .map((row: any, idx: number) => ({
            id: `plan:${row?.id || row?._id || idx}`,
            name: String(row?.planName || row?.plan || row?.name || row?.title || "").trim(),
            code: String(row?.planCode || row?.code || "").trim(),
            type: "plan" as const,
            ...extractProductLink(row),
            rate: Number(row?.price ?? row?.rate ?? 0) || 0,
            taxSelection: String(row?.taxInfo?.taxId || row?.taxId || row?.salesTaxId || row?.tax || row?.salesTax || "").trim(),
            taxName: String(row?.taxName || row?.taxInfo?.taxName || "").trim(),
            taxRate: Number(row?.taxRate ?? row?.taxInfo?.taxRate ?? row?.salesTaxRate ?? 0) || 0,
            status: String(row?.status || "active"),
            active: row?.status ? String(row.status).toLowerCase() === "active" : undefined,
          }))
          .filter((row: PlanAddonOption) => row.name);

        const addonsRows = readRows("inv_addons_v1");
        const mappedAddons: PlanAddonOption[] = addonsRows
          .map((row: any, idx: number) => ({
            id: `addon:${row?.id || row?._id || idx}`,
            name: String(row?.addonName || row?.addon || row?.name || row?.title || "").trim(),
            code: String(row?.addonCode || row?.code || "").trim(),
            type: "addon" as const,
            ...extractProductLink(row),
            rate: Number(row?.price ?? row?.rate ?? row?.recurringPrice ?? 0) || 0,
            taxSelection: String(row?.taxInfo?.taxId || row?.taxId || row?.salesTaxId || row?.tax || row?.salesTax || "").trim(),
            taxName: String(row?.taxName || row?.taxInfo?.taxName || "").trim(),
            taxRate: Number(row?.taxRate ?? row?.taxInfo?.taxRate ?? row?.salesTaxRate ?? 0) || 0,
            status: String(row?.status || ""),
            active: typeof row?.active === "boolean" ? row.active : undefined,
          }))
          .filter((row: PlanAddonOption) => row.name);

        const mergedPlanAddons = [...mappedPlans, ...mappedAddons];
        const uniquePlanAddons = Array.from(
          new Map(mergedPlanAddons.map((row) => [buildPlanAddonDedupKey(row), row])).values()
        );
        setPlanAddons(uniquePlanAddons);
      } catch {
        const localPlans = readRows("inv_plans_v1");
        const mappedPlans: PlanAddonOption[] = localPlans
          .map((row: any, idx: number) => ({
            id: `plan:${row?.id || row?._id || idx}`,
            name: String(row?.planName || row?.plan || row?.name || row?.title || "").trim(),
            code: String(row?.planCode || row?.code || "").trim(),
            type: "plan" as const,
            ...extractProductLink(row),
            rate: Number(row?.price ?? row?.rate ?? 0) || 0,
            taxSelection: String(row?.taxInfo?.taxId || row?.taxId || row?.salesTaxId || row?.tax || row?.salesTax || "").trim(),
            taxName: String(row?.taxName || row?.taxInfo?.taxName || "").trim(),
            taxRate: Number(row?.taxRate ?? row?.taxInfo?.taxRate ?? row?.salesTaxRate ?? 0) || 0,
            status: String(row?.status || "active"),
            active: row?.status ? String(row.status).toLowerCase() === "active" : undefined,
          }))
          .filter((row: PlanAddonOption) => row.name);

        const addonsRows = readRows("inv_addons_v1");
        const mappedAddons: PlanAddonOption[] = addonsRows
          .map((row: any, idx: number) => ({
            id: `addon:${row?.id || row?._id || idx}`,
            name: String(row?.addonName || row?.addon || row?.name || row?.title || "").trim(),
            code: String(row?.addonCode || row?.code || "").trim(),
            type: "addon" as const,
            ...extractProductLink(row),
            rate: Number(row?.price ?? row?.rate ?? row?.recurringPrice ?? 0) || 0,
            taxSelection: String(row?.taxInfo?.taxId || row?.taxId || row?.salesTaxId || row?.tax || row?.salesTax || "").trim(),
            taxName: String(row?.taxName || row?.taxInfo?.taxName || "").trim(),
            taxRate: Number(row?.taxRate ?? row?.taxInfo?.taxRate ?? row?.salesTaxRate ?? 0) || 0,
            status: String(row?.status || ""),
            active: typeof row?.active === "boolean" ? row.active : undefined,
          }))
          .filter((row: PlanAddonOption) => row.name);

        const mergedPlanAddons = [...mappedPlans, ...mappedAddons];
        const uniquePlanAddons = Array.from(
          new Map(mergedPlanAddons.map((row) => [buildPlanAddonDedupKey(row), row])).values()
        );
        setPlanAddons(uniquePlanAddons);
      }
    };

    loadPlanAddons();

    const onStorage = (event: StorageEvent) => {
      if (!event.key || event.key === "inv_plans_v1" || event.key === "inv_addons_v1") {
        loadPlanAddons();
      }
    };
    const onFocus = () => loadPlanAddons();
    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", onFocus);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  useEffect(() => {
    const loadSalespersons = async () => {
      try {
        const data = await getSalespersonsFromAPI();
        setSalespersons(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Failed to load salespersons for subscription quote:", error);
        setSalespersons([]);
      }
    };
    loadSalespersons();

    const onFocus = () => {
      loadSalespersons();
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  useEffect(() => {
    let isMounted = true;

    const normalizeQuoteNumber = (value: string, fallbackPrefix = "QT-") => {
      const raw = String(value || "").trim();
      if (!raw) return `${fallbackPrefix}000001`;
      const exact = raw.match(/^([^\d]*)(\d+)$/);
      if (exact) {
        const prefix = exact[1] || fallbackPrefix;
        const digits = exact[2].padStart(6, "0");
        return `${prefix}${digits}`;
      }
      const digits = raw.match(/(\d+)/)?.[1];
      if (digits) return `${fallbackPrefix}${digits.padStart(6, "0")}`;
      return `${fallbackPrefix}000001`;
    };

    const loadNextQuoteNumber = async () => {
      try {
        const response: any = await transactionNumberSeriesAPI.getNextNumber({ module: "Quote", reserve: false });
        const nextFromApi = String(response?.data?.quoteNumber || response?.data?.nextNumber || "").trim();
        if (nextFromApi && isMounted) {
          setFormData((prev) => ({ ...prev, quoteNumber: normalizeQuoteNumber(nextFromApi, "QT-") }));
          return;
        }
      } catch (error) {
        console.error("Failed to load next quote number from API:", error);
      }

      try {
        const quotes = await getQuotes();
        const max = quotes.reduce((currentMax, quote: any) => {
          const number = String(quote?.quoteNumber || "").trim();
          const match = number.match(/^QT-(\d+)$/i);
          if (!match) return currentMax;
          const value = Number(match[1]);
          return Number.isFinite(value) ? Math.max(currentMax, value) : currentMax;
        }, 0);
        if (isMounted) {
          const fallbackNext = `QT-${String(max + 1).padStart(6, "0")}`;
          setFormData((prev) => ({ ...prev, quoteNumber: fallbackNext }));
        }
      } catch (error) {
        console.error("Failed to calculate fallback quote number:", error);
      }
    };

    loadNextQuoteNumber();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("taban_locations_cache");
      const parsed = raw ? JSON.parse(raw) : [];
      const names = Array.isArray(parsed)
        ? parsed
          .map((row: any) => String(row?.name || "").trim())
          .filter((name: string) => name.length > 0)
        : [];
      const uniqueNames = Array.from(new Set(names));
      const nextOptions = uniqueNames.length > 0 ? uniqueNames : ["Head Office"];
      setLocationOptions(nextOptions);

      if (!nextOptions.includes(formData.location)) {
        updateField("location", nextOptions[0]);
      }
    } catch {
      setLocationOptions(["Head Office"]);
    }
  }, []);

  useEffect(() => {
    const fetchReportingTags = async () => {
      try {
        const response = await reportingTagsAPI.getAll();
        const rows = response.success ? response.data : [];
        setAvailableReportingTags(rows.filter((tag: any) => tag.status !== "inactive"));
      } catch (err) {
        console.error("Error fetching reporting tags:", err);
      }
    };
    fetchReportingTags();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (customerDropdownRef.current && !customerDropdownRef.current.contains(event.target as Node)) {
        setIsCustomerDropdownOpen(false);
      }
      if (salespersonDropdownRef.current && !salespersonDropdownRef.current.contains(event.target as Node)) {
        setIsSalespersonDropdownOpen(false);
      }
      if (productDropdownRef.current && !productDropdownRef.current.contains(event.target as Node)) {
        setIsProductDropdownOpen(false);
      }
      if (planAddonDropdownRef.current && !planAddonDropdownRef.current.contains(event.target as Node)) {
        setIsPlanAddonDropdownOpen(false);
      }
      if (addonRowRef.current && !addonRowRef.current.contains(event.target as Node)) {
        setIsAddonDropdownOpen(false);
        setIsAddonTaxDropdownOpen(false);
      }
      if (locationDropdownRef.current && !locationDropdownRef.current.contains(event.target as Node)) {
        setIsLocationDropdownOpen(false);
      }
      if (taxPreferenceDropdownRef.current && !taxPreferenceDropdownRef.current.contains(event.target as Node)) {
        setIsTaxPreferenceDropdownOpen(false);
      }
      if (couponDropdownRef.current && !couponDropdownRef.current.contains(event.target as Node)) {
        setIsCouponDropdownOpen(false);
      }
      if (taxDropdownRef.current && !taxDropdownRef.current.contains(event.target as Node)) {
        setIsTaxDropdownOpen(false);
      }
      if (reportingTagsDropdownRef.current && !reportingTagsDropdownRef.current.contains(event.target as Node)) {
        setIsReportingTagsDropdownOpen(false);
        setActiveReportingTagId(null);
        setReportingTagSearch("");
      }
      if (phoneCodeDropdownRef.current && !phoneCodeDropdownRef.current.contains(event.target as Node)) {
        setIsPhoneCodeDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadGeneralSettings = async () => {
      try {
        const response: any = await settingsAPI.getGeneralSettings();
        if (cancelled) return;
        if (!response?.success) return;
        const generalSettings = response?.data?.settings || response?.data || {};
        setEnabledSettings(generalSettings);
      } catch (error) {
        console.error("Error loading general settings:", error);
      }
    };

    void loadGeneralSettings();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const handleGeneralSettingsUpdate = (event: any) => {
      const detail = event?.detail;
      if (!detail) return;
      setEnabledSettings(detail?.settings || detail || {});
    };

    window.addEventListener("generalSettingsUpdated", handleGeneralSettingsUpdate as EventListener);
    return () => window.removeEventListener("generalSettingsUpdated", handleGeneralSettingsUpdate as EventListener);
  }, []);

  useEffect(() => {
    if (!isTaxPreferenceLocked) return;
    setFormData((prev) => {
      if (prev.taxPreference === resolvedTaxPreference) return prev;
      return { ...prev, taxPreference: resolvedTaxPreference };
    });
  }, [isTaxPreferenceLocked, resolvedTaxPreference]);

  useEffect(() => {
    const loadPriceLists = async () => {
      // Local fallback
      try {
        const raw = localStorage.getItem("inv_price_lists_v1");
        const parsed = raw ? JSON.parse(raw) : [];
        setCatalogPriceLists(Array.isArray(parsed) ? parsed : []);
      } catch {
        setCatalogPriceLists([]);
      }

      // Refresh from backend
      try {
        const response: any = await priceListsAPI.list({ limit: 5000 });
        const rows = response?.success ? response?.data : null;
        if (Array.isArray(rows)) {
          localStorage.setItem("inv_price_lists_v1", JSON.stringify(rows));
          setCatalogPriceLists(rows);
        }
      } catch (error) {
        console.error("Failed to refresh price lists:", error);
      }
    };
    loadPriceLists();
    window.addEventListener("storage", loadPriceLists);
    window.addEventListener("focus", loadPriceLists);
    return () => {
      window.removeEventListener("storage", loadPriceLists);
      window.removeEventListener("focus", loadPriceLists);
    };
  }, []);

  useEffect(() => {
    const loadCoupons = () => {
      try {
        const rows = readRows("inv_coupons_v1");
        const mapped: CouponOption[] = rows
          .map((row: any, idx: number) => ({
            id: String(row?.id || row?._id || `coupon-${idx}`),
            couponName: String(row?.couponName || row?.name || "").trim(),
            couponCode: String(row?.couponCode || row?.code || "").trim(),
            discountType: String(row?.discountType || "Flat"),
            discountValue: Number(row?.discountValue ?? row?.value ?? 0) || 0,
            status: String(row?.status || ""),
            active: typeof row?.active === "boolean" ? row.active : undefined,
            product: String(row?.product || row?.productName || "").trim(),
            productId: String(row?.productId || "").trim(),
          }))
          .filter((row: CouponOption) => row.couponName && row.couponCode);
        setCoupons(mapped);
      } catch {
        setCoupons([]);
      }
    };

    loadCoupons();
    const onStorage = (event: StorageEvent) => {
      if (!event.key || event.key === "inv_coupons_v1") loadCoupons();
    };
    const onFocus = () => loadCoupons();
    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", onFocus);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  useEffect(() => {
    loadTaxesForDropdown();
    window.addEventListener("storage", loadTaxesForDropdown);
    window.addEventListener("focus", loadTaxesForDropdown);
    return () => {
      window.removeEventListener("storage", loadTaxesForDropdown);
      window.removeEventListener("focus", loadTaxesForDropdown);
    };
  }, []);

  const handleOpenNewTaxModal = () => {
    setNewTaxError("");
    setNewTaxForm({ name: "", rate: "", isCompound: false });
    setIsNewTaxModalOpen(true);
    setIsTaxDropdownOpen(false);
  };

  const handleSaveNewTax = async () => {
    const taxName = String(newTaxForm.name || "").trim();
    const taxRate = Number(newTaxForm.rate);
    if (!taxName) {
      setNewTaxError("Tax name is required.");
      return;
    }
    if (!Number.isFinite(taxRate) || taxRate < 0) {
      setNewTaxError("Enter a valid tax rate.");
      return;
    }

    try {
      setIsNewTaxSaving(true);
      setNewTaxError("");
      const savedTax: any = await saveTax({
        name: taxName,
        rate: taxRate,
        type: "tax",
        isCompound: newTaxForm.isCompound,
      });
      const selectedName = String(savedTax?.name || taxName).trim();
      const selectedRate = Number(savedTax?.rate ?? taxRate) || 0;

      // Keep Settings > Taxes storage in sync with taxes created from this modal.
      try {
        const existing = readTaxesLocal();
        const alreadyExists = existing.some((row: any) => {
          const byId =
            String(row?._id || row?.id || "").trim() &&
            String(row?._id || row?.id || "").trim() === String(savedTax?._id || savedTax?.id || "").trim();
          const byNameRate =
            String(row?.name || "").trim().toLowerCase() === selectedName.toLowerCase() &&
            Number(row?.rate || 0) === Number(selectedRate || 0);
          return byId || byNameRate;
        });

        const nextRow = {
          _id: String(savedTax?._id || savedTax?.id || selectedName).trim() || selectedName,
          id: String(savedTax?._id || savedTax?.id || selectedName).trim() || selectedName,
          name: selectedName,
          rate: selectedRate,
          type: "both",
          isActive: true,
          isCompound: !!newTaxForm.isCompound,
        };

        if (!alreadyExists) {
          writeTaxesLocal([nextRow as any, ...existing]);
        }
      } catch {
        // ignore settings sync failure; primary save already completed
      }

      await loadTaxesForDropdown();
      updateField("tax", `${selectedName} [${selectedRate}%]`);
      setIsNewTaxModalOpen(false);
      setIsTaxDropdownOpen(false);
    } catch (error) {
      setNewTaxError("Failed to save tax. Please try again.");
    } finally {
      setIsNewTaxSaving(false);
    }
  };

  const isCustomerActive = (customer: any) => {
    const status = String(customer?.status || "").toLowerCase();
    if (status) return status === "active";
    if (typeof customer?.isActive === "boolean") return customer.isActive;
    return true;
  };

  const isSalespersonActive = (salesperson: any) => {
    const status = String(salesperson?.status || "").toLowerCase();
    if (status) return status === "active";
    if (typeof salesperson?.isActive === "boolean") return salesperson.isActive;
    return true;
  };

  const displayCustomerName = (customer: any) =>
    customer?.displayName ||
    customer?.name ||
    customer?.companyName ||
    `${customer?.firstName || ""} ${customer?.lastName || ""}`.trim() ||
    "Unnamed Customer";

  const customerEmail = (customer: any) => customer?.email || customer?.primaryEmail || "";
  const customerCode = (customer: any) => customer?.customerCode || customer?.contactCode || customer?.code || "";

  const filteredCustomers = customers.filter((customer: any) => {
    if (!isCustomerActive(customer)) return false;
    const term = customerSearch.toLowerCase().trim();
    if (!term) return true;
    return (
      displayCustomerName(customer).toLowerCase().includes(term) ||
      String(customerEmail(customer)).toLowerCase().includes(term) ||
      String(customerCode(customer)).toLowerCase().includes(term)
    );
  });

  const filteredSalespersons = salespersons.filter((salesperson: any) => {
    if (!isSalespersonActive(salesperson)) return false;
    const term = salespersonSearch.toLowerCase().trim();
    if (!term) return true;
    const name = String(salesperson?.name || salesperson?.displayName || "").toLowerCase();
    const email = String(salesperson?.email || "").toLowerCase();
    return name.includes(term) || email.includes(term);
  });

  const filteredManageSalespersons = salespersons.filter((salesperson: any) => {
    const term = manageSalespersonSearch.toLowerCase().trim();
    if (!term) return true;
    const name = String(salesperson?.name || salesperson?.displayName || "").toLowerCase();
    const email = String(salesperson?.email || "").toLowerCase();
    return name.includes(term) || email.includes(term);
  });
  const selectedSalespersonRecord = useMemo(() => {
    const salespersonId = String(formData.salespersonId || "").trim();
    if (salespersonId) {
      const byId = salespersons.find((sp: any) => String(sp.id || sp._id || "") === salespersonId);
      if (byId) return byId;
    }
    const selectedName = String(formData.salesperson || "").trim().toLowerCase();
    if (!selectedName) return null;
    return salespersons.find((sp: any) => String(sp.name || sp.displayName || "").trim().toLowerCase() === selectedName) || null;
  }, [formData.salesperson, formData.salespersonId, salespersons]);
  const selectedSalespersonIsActive = Boolean(selectedSalespersonRecord && isSalespersonActive(selectedSalespersonRecord));

  const manageSalespersonsPageSize = 3;
  const [manageSalespersonsPage, setManageSalespersonsPage] = useState(1);
  const manageSalespersonsTotalPages = Math.max(1, Math.ceil(filteredManageSalespersons.length / manageSalespersonsPageSize));
  const manageSalespersonsCurrentPage = Math.min(manageSalespersonsPage, manageSalespersonsTotalPages);
  const paginatedManageSalespersons = useMemo(() => {
    const startIndex = (manageSalespersonsCurrentPage - 1) * manageSalespersonsPageSize;
    return filteredManageSalespersons.slice(startIndex, startIndex + manageSalespersonsPageSize);
  }, [filteredManageSalespersons, manageSalespersonsCurrentPage]);

  const filteredProducts = products.filter((product: ProductOption) => {
    const term = productSearch.toLowerCase().trim();
    if (!term) return true;
    return product.name.toLowerCase().includes(term);
  });

  const selectedProduct = products.find((product: ProductOption) => product.name === formData.product);

  const activePlanAddons = planAddons.filter((row: PlanAddonOption) => {
    const status = normalizeText(row.status);
    if (typeof row.active === "boolean") return row.active;
    if (!status) return true;
    return ["active", "enabled", "published", "live"].includes(status);
  });

  const searchMatchedPlanAddons = activePlanAddons.filter((row: PlanAddonOption) => {
    const term = normalizeText(planAddonSearch);
    if (!term) return true;
    return normalizeText(row.name).includes(term) || normalizeText(row.code).includes(term);
  });

  const getLinkedPlanAddonsForProduct = (product: ProductOption | null, sourceRows: PlanAddonOption[] = activePlanAddons) => {
    if (!product) return [];
    const productPlans = Array.isArray(product.plans) ? product.plans : [];
    const productAddons = Array.isArray(product.addons) ? product.addons : [];
    const productAliases = new Set(
      [product.id, product.name, product.code]
        .map((value) => normalizeText(value))
        .filter(Boolean)
    );
    const productNameKey = normalizeText(product.name);
    const hasEmbeddedLinks = productPlans.length > 0 || productAddons.length > 0;

    const embeddedRows: PlanAddonOption[] = [
      ...productPlans.map((linked: any, index: number) => ({
        id: String(linked?.planId || linked?.id || linked?._id || linked?.code || linked?.name || `plan-${index}`),
        name: String(linked?.name || linked?.planName || linked?.title || "").trim(),
        code: String(linked?.code || linked?.planCode || "").trim(),
        type: "plan" as const,
        productId: product.id,
        productName: product.name,
        rate: Number(linked?.rate ?? linked?.price ?? 0) || 0,
        taxSelection: String(linked?.taxId || linked?.tax || linked?.taxSelection || "").trim(),
        taxName: String(linked?.taxName || "").trim(),
        taxRate: Number(linked?.taxRate ?? 0) || 0,
        status: String(linked?.status || "active"),
        active: linked?.status ? String(linked.status).toLowerCase() === "active" : undefined,
      })),
      ...productAddons.map((linked: any, index: number) => ({
        id: String(linked?.addonId || linked?.id || linked?._id || linked?.code || linked?.name || `addon-${index}`),
        name: String(linked?.name || linked?.addonName || linked?.title || "").trim(),
        code: String(linked?.code || linked?.addonCode || "").trim(),
        type: "addon" as const,
        productId: product.id,
        productName: product.name,
        rate: Number(linked?.rate ?? linked?.price ?? 0) || 0,
        taxSelection: String(linked?.taxId || linked?.tax || linked?.taxSelection || "").trim(),
        taxName: String(linked?.taxName || "").trim(),
        taxRate: Number(linked?.taxRate ?? 0) || 0,
        status: String(linked?.status || "active"),
        active: linked?.status ? String(linked.status).toLowerCase() === "active" : undefined,
      })),
    ].filter((row) => row.name);

    const matchesEmbeddedPlan = (row: PlanAddonOption) => {
      const listRows = row.type === "plan" ? productPlans : productAddons;
      return (Array.isArray(listRows) ? listRows : []).some((linked: any) => {
        const linkedId = String(linked?.planId || linked?.addonId || linked?.id || linked?._id || "").trim();
        const linkedName = String(linked?.name || linked?.planName || linked?.addonName || "").trim();
        const linkedCode = String(linked?.code || linked?.planCode || linked?.addonCode || "").trim();
        const rowId = String(row.id || "").trim();
        const rowName = normalizeText(row.name);
        const rowCode = normalizeText(row.code);
        return (
          (linkedId && linkedId === rowId) ||
          (linkedName && rowName === normalizeText(linkedName)) ||
          (linkedCode && rowCode === normalizeText(linkedCode))
        );
      });
    };

    const matchesLegacyLink = (row: PlanAddonOption) => {
      const rowAliases = new Set(
        [row.productId, row.productName]
          .map((value) => normalizeText(value))
          .filter(Boolean)
      );
      const rowProductNameKey = normalizeText(row.productName);

      let linked = false;
      for (const alias of productAliases) {
        if (rowAliases.has(alias)) {
          linked = true;
          break;
        }
      }
      if (!linked && productNameKey && rowProductNameKey) {
        linked =
          rowProductNameKey.includes(productNameKey) ||
          productNameKey.includes(rowProductNameKey);
      }
      return linked;
    };

    const filteredRows = sourceRows
      .filter((row: PlanAddonOption) => (hasEmbeddedLinks ? matchesEmbeddedPlan(row) : matchesLegacyLink(row)));

    const rowsToUse = hasEmbeddedLinks && filteredRows.length === 0 ? embeddedRows : filteredRows;

    return rowsToUse
      .sort((a, b) => {
        if (a.type !== b.type) return a.type === "plan" ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
  };

  const linkedPlanAddons = getLinkedPlanAddonsForProduct(selectedProduct, searchMatchedPlanAddons);

  const availablePlanOptions = isProductSelected ? linkedPlanAddons.filter((row: PlanAddonOption) => row.type === "plan") : [];
  const availableAddonOptions = isProductSelected ? linkedPlanAddons.filter((row: PlanAddonOption) => row.type === "addon") : [];
  const filteredAddonOptions = availableAddonOptions.filter((row: PlanAddonOption) => {
    const term = normalizeText(addonSearch);
    if (!term) return true;
    return normalizeText(row.name).includes(term) || normalizeText(row.code).includes(term);
  });
  const getFilteredReportingTagOptions = (tag: any) => {
    const options = Array.isArray(tag?.options) ? tag.options : [];
    const term = normalizeText(reportingTagSearch);
    if (!term) return options;
    return options.filter((opt: any) => normalizeText(opt).includes(term));
  };
  const isPlanAddonFallbackMode = false;

  const activeCoupons = coupons.filter((coupon: CouponOption) => {
    const status = normalizeText(coupon.status);
    const isActive = status ? status === "active" : (typeof coupon.active === "boolean" ? coupon.active : true);
    if (!isActive) return false;

    if (!isProductSelected) return false;
    const couponProduct = normalizeText(coupon.product);
    const couponProductId = normalizeText(coupon.productId);
    if (!couponProduct && !couponProductId) return false;

    const selectedProductId = normalizeText(selectedProduct?.id);
    const selectedProductName = normalizeText(formData.product);
    return (
      (!!selectedProductId && couponProductId === selectedProductId) ||
      (!!selectedProductName && (couponProduct === selectedProductName || couponProduct.includes(selectedProductName) || selectedProductName.includes(couponProduct)))
    );
  });

  const filteredCoupons = activeCoupons.filter((coupon: CouponOption) => {
    const term = normalizeText(couponSearch);
    if (!term) return true;
    return normalizeText(coupon.couponName).includes(term) || normalizeText(coupon.couponCode).includes(term);
  });

  useEffect(() => {
    if (activeCoupons.length > 0) return;
    if (!formData.coupon && !formData.couponCode && (formData.couponValue === "0.00" || !formData.couponValue)) return;
    setFormData((prev) => ({ ...prev, coupon: "", couponCode: "", couponValue: "0.00" }));
    setIsCouponDropdownOpen(false);
  }, [activeCoupons.length, formData.coupon, formData.couponCode, formData.couponValue]);

  const countryOptions = useMemo(() => Country.getAllCountries(), []);

  const selectedCountryIso = useMemo(() => {
    const raw = String(addressFormData.country || "").trim();
    if (!raw) return "";
    const byName = countryOptions.find((country: any) => String(country.name || "").toLowerCase() === raw.toLowerCase());
    if (byName?.isoCode) return byName.isoCode;
    const byCode = countryOptions.find((country: any) => String(country.isoCode || "").toLowerCase() === raw.toLowerCase());
    return byCode?.isoCode || "";
  }, [addressFormData.country, countryOptions]);

  const stateOptions = useMemo(() => {
    if (!selectedCountryIso) return [];
    return State.getStatesOfCountry(selectedCountryIso) || [];
  }, [selectedCountryIso]);

  const phoneCountryOptions = useMemo(
    () =>
      countryOptions
        .filter((country: any) => String(country.phonecode || "").trim())
        .map((country: any) => ({
          isoCode: country.isoCode,
          name: country.name,
          phoneCode: `+${country.phonecode}`,
        })),
    [countryOptions]
  );

  const filteredPhoneCountryOptions = useMemo(() => {
    const term = String(phoneCodeSearch || "").trim().toLowerCase();
    if (!term) return phoneCountryOptions;
    return phoneCountryOptions.filter(
      (entry: any) =>
        String(entry.name || "").toLowerCase().includes(term) || String(entry.phoneCode || "").toLowerCase().includes(term)
    );
  }, [phoneCodeSearch, phoneCountryOptions]);

  useEffect(() => {
    if (!addressFormData.state) return;
    if (!stateOptions.length) return;
    const exists = stateOptions.some((state: any) => String(state.name || "").toLowerCase() === String(addressFormData.state || "").toLowerCase());
    if (!exists) {
      setAddressFormData((prev) => ({ ...prev, state: "" }));
    }
  }, [addressFormData.state, stateOptions]);

  useEffect(() => {
    if (addressFormData.phoneCountryCode) return;
    const country = countryOptions.find(
      (entry: any) => String(entry.name || "").toLowerCase() === String(addressFormData.country || "").toLowerCase()
    );
    if (country?.phonecode) {
      setAddressFormData((prev) => ({ ...prev, phoneCountryCode: `+${country.phonecode}` }));
    }
  }, [addressFormData.country, addressFormData.phoneCountryCode, countryOptions]);

  useEffect(() => {
    if (!selectedCustomer) {
      setBillingAddress(null);
      setShippingAddress(null);
      return;
    }

    const normalizeAddress = (address: any) => {
      if (!address) return null;
      const rawPhone = String(address.phone || "").trim();
      const phoneCodeMatch = rawPhone.match(/^(\+\d{1,5})\s*/);
      const phoneCountryCode = phoneCodeMatch ? phoneCodeMatch[1] : "";
      const phone = phoneCodeMatch ? rawPhone.replace(phoneCodeMatch[0], "").trim() : rawPhone;
      return {
        attention: address.attention || "",
        country: address.country || "",
        street1: address.street1 || "",
        street2: address.street2 || "",
        city: address.city || "",
        state: address.state || "",
        zipCode: address.zipCode || "",
        phoneCountryCode,
        phone,
        fax: address.fax || "",
      };
    };

    setBillingAddress(normalizeAddress((selectedCustomer as any).billingAddress));
    setShippingAddress(normalizeAddress((selectedCustomer as any).shippingAddress));
  }, [selectedCustomer]);

  const openAddressModal = (type: "billing" | "shipping") => {
    const source = type === "billing" ? billingAddress : shippingAddress;
    setAddressModalType(type);
    setAddressFormData({
      attention: source?.attention || "",
      country: source?.country || "",
      street1: source?.street1 || "",
      street2: source?.street2 || "",
      city: source?.city || "",
      state: source?.state || "",
      zipCode: source?.zipCode || "",
      phoneCountryCode: source?.phoneCountryCode || "",
      phone: source?.phone || "",
      fax: source?.fax || "",
    });
    setPhoneCodeSearch("");
    setIsPhoneCodeDropdownOpen(false);
    setIsAddressModalOpen(true);
  };

  const handleAddressFieldChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setAddressFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveAddress = async () => {
    if (!selectedCustomer) return;
    const customerId = (selectedCustomer as any).id || (selectedCustomer as any)._id || (selectedCustomer as any).customerId;
    if (!customerId) return;

    setIsAddressSaving(true);
    try {
      const addressPayload = {
        attention: String(addressFormData.attention || "").trim(),
        country: String(addressFormData.country || "").trim(),
        street1: String(addressFormData.street1 || "").trim(),
        street2: String(addressFormData.street2 || "").trim(),
        city: String(addressFormData.city || "").trim(),
        state: String(addressFormData.state || "").trim(),
        zipCode: String(addressFormData.zipCode || "").trim(),
        phone: `${String(addressFormData.phoneCountryCode || "").trim()} ${String(addressFormData.phone || "").trim()}`.trim(),
        fax: String(addressFormData.fax || "").trim(),
        phoneCountryCode: String(addressFormData.phoneCountryCode || "").trim(),
      };

      const payload =
        addressModalType === "billing" ? { billingAddress: addressPayload } : { shippingAddress: addressPayload };

      const response: any = await updateCustomer(String(customerId), payload);
      const updatedFromApi = response?.data || response;

      setCustomers((prev) =>
        prev.map((customer: any) =>
          String(customer.id || customer._id) === String(customerId)
            ? {
                ...customer,
                ...(updatedFromApi || {}),
                ...(addressModalType === "billing" ? { billingAddress: addressPayload } : { shippingAddress: addressPayload }),
              }
            : customer
        )
      );

      setSelectedCustomer((prev: any) =>
        prev
          ? {
              ...prev,
              ...(updatedFromApi || {}),
              ...(addressModalType === "billing" ? { billingAddress: addressPayload } : { shippingAddress: addressPayload }),
            }
          : prev
      );

      if (addressModalType === "billing") {
        setBillingAddress(addressPayload);
      } else {
        setShippingAddress(addressPayload);
      }

      setIsAddressModalOpen(false);
    } catch (error) {
      console.error("Failed to save customer address:", error);
      alert("Failed to save address.");
    } finally {
      setIsAddressSaving(false);
    }
  };

  const openQuoteNumberModal = () => {
    const current = String(formData.quoteNumber || "").trim();
    const nextPrefix = deriveQuotePrefixFromNumber(current, quotePrefix);
    const nextDigits = extractQuoteDigits(current) || quoteNextNumber || "000001";
    setQuotePrefix(nextPrefix);
    setQuoteNextNumber(String(nextDigits).padStart(6, "0"));
    setQuoteNumberMode("auto");
    setIsQuoteNumberModalOpen(true);
  };

  const handleCustomerSelect = (customer: any) => {
    const name = displayCustomerName(customer);
    const currentPriceListName = normalizeSelectedPriceListName(formData.priceList);
    const customerPriceListDefault = resolveCustomerPriceListDefault(customer);
    const nextCustomerPriceListName = normalizeSelectedPriceListName(customerPriceListDefault.name);
    const hadExistingCustomerOrPriceList = Boolean(selectedCustomer) || Boolean(currentPriceListName);
    const shouldPromptForPriceListChange =
      hadExistingCustomerOrPriceList &&
      Boolean(currentPriceListName || nextCustomerPriceListName) &&
      currentPriceListName !== nextCustomerPriceListName;
    const customerTaxLabel = getCustomerTaxLabel(customer);
    const selectedPlanTaxLabel = getPlanAddonTaxLabel(selectedPlanAddon);

    setFormData((prev) => ({
      ...prev,
      customerName: name,
      priceList: shouldPromptForPriceListChange
        ? (normalizeSelectedPriceListName(prev.priceList) || "Select Price List")
        : (nextCustomerPriceListName || normalizeSelectedPriceListName(prev.priceList) || "Select Price List"),
      tax: customerTaxLabel || selectedPlanTaxLabel || prev.tax,
    }));

    if (shouldPromptForPriceListChange) {
      setPriceListSwitchDialog({
        customerName: name,
        currentPriceListName,
        nextPriceListName: nextCustomerPriceListName,
      });
    } else {
      setPriceListSwitchDialog(null);
    }
    setSelectedCustomer(customer);
    setCustomerSearch("");
    setIsCustomerDropdownOpen(false);
  };

  const handleSalespersonSelect = (salesperson: any) => {
    updateField("salesperson", salesperson?.name || salesperson?.displayName || "");
    setSalespersonSearch("");
    setIsSalespersonDropdownOpen(false);
    setIsManageSalespersonsOpen(false);
  };

  const handleStartNewSalesperson = () => {
    setEditingSalespersonId(null);
    setNewSalespersonData({ name: "", email: "" });
    setIsNewSalespersonFormOpen(true);
  };

  const handleStartEditSalesperson = (salesperson: any) => {
    const salespersonId = String(salesperson?.id || salesperson?._id || "").trim();
    setEditingSalespersonId(salespersonId || null);
    setNewSalespersonData({
      name: String(salesperson?.name || salesperson?.displayName || ""),
      email: String(salesperson?.email || "")
    });
    setIsNewSalespersonFormOpen(true);
  };

  const handleNewSalespersonChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewSalespersonData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleProductSelect = (product: ProductOption) => {
    updateField("product", product.name);
    updateField("coupon", "");
    updateField("couponCode", "");
    updateField("couponValue", "0.00");
    updateField("plan", "");
    updateField("rate", "0.00");
    updateField("tax", "");
    setSelectedPlanAddon(null);
    setSelectedAddon(null);
    setAddonQuantity("1.00");
    setAddonRate("0.00");
    setAddonTax("");
    setAddonSearch("");
    setAddonTaxSearch("");
    setIsAddonRowVisible(false);
    setIsAddonDropdownOpen(false);
    setIsAddonTaxDropdownOpen(false);
    setProductSearch("");
    setPlanAddonSearch("");
    setCouponSearch("");
    setIsProductDropdownOpen(false);
    setIsPlanAddonDropdownOpen(false);
    setIsCouponDropdownOpen(false);
  };

  const handlePlanAddonSelect = (row: PlanAddonOption) => {
    setSelectedPlanAddon(row);
    const baseRate = Number(row.rate || 0);
    const nextRate = selectedPriceList ? applyPriceListToBaseRate(baseRate, selectedPriceList, row) : baseRate;
    const customerTaxLabel = selectedCustomer ? getCustomerTaxLabel(selectedCustomer) : "";
    const planTaxLabel = getPlanAddonTaxLabel(row);
    setFormData((prev) => ({
      ...prev,
      plan: row.name,
      rate: nextRate.toFixed(2),
      tax: customerTaxLabel || planTaxLabel || prev.tax,
    }));
    setPlanAddonSearch("");
    setIsPlanAddonDropdownOpen(false);
  };

  const handleAddonSelect = (row: PlanAddonOption) => {
    setSelectedAddon(row);
    const baseRate = Number(row.rate || 0);
    const nextRate = selectedPriceList ? applyPriceListToBaseRate(baseRate, selectedPriceList, row) : baseRate;
    const customerTaxLabel = selectedCustomer ? getCustomerTaxLabel(selectedCustomer) : "";
    const addonTaxLabel = getPlanAddonTaxLabel(row);
    setAddonQuantity("1.00");
    setAddonRate(nextRate.toFixed(2));
    setAddonTax(customerTaxLabel || addonTaxLabel || "");
    setIsAddonRowVisible(true);
    setAddonSearch("");
    setIsAddonDropdownOpen(false);
    setAddonTaxSearch("");
    setIsAddonTaxDropdownOpen(false);
  };

  const handleRemoveAddon = () => {
    setSelectedAddon(null);
    setAddonQuantity("1.00");
    setAddonRate("0.00");
    setAddonTax("");
    setAddonSearch("");
    setAddonTaxSearch("");
    setIsAddonRowVisible(false);
    setIsAddonDropdownOpen(false);
    setIsAddonTaxDropdownOpen(false);
  };

  useEffect(() => {
    if (!selectedPlanAddon) return;
    const baseRate = Number(selectedPlanAddon.rate || 0);
    const nextRate = selectedPriceList ? applyPriceListToBaseRate(baseRate, selectedPriceList, selectedPlanAddon) : baseRate;
    const nextRateText = nextRate.toFixed(2);
    const customerTaxLabel = selectedCustomer ? getCustomerTaxLabel(selectedCustomer) : "";
    const planTaxLabel = getPlanAddonTaxLabel(selectedPlanAddon);
    setFormData((prev) => {
      const nextTax = customerTaxLabel || planTaxLabel || prev.tax;
      if (String(prev.rate || "").trim() === nextRateText && String(prev.tax || "").trim() === String(nextTax || "").trim()) return prev;
      return { ...prev, rate: nextRateText, tax: nextTax };
    });
  }, [selectedPriceList, selectedPlanAddon, selectedCustomer, taxes]);

  useEffect(() => {
    if (!selectedAddon) return;
    const baseRate = Number(selectedAddon.rate || 0);
    const nextRate = selectedPriceList ? applyPriceListToBaseRate(baseRate, selectedPriceList, selectedAddon) : baseRate;
    const nextRateText = nextRate.toFixed(2);
    const customerTaxLabel = selectedCustomer ? getCustomerTaxLabel(selectedCustomer) : "";
    const addonTaxLabel = getPlanAddonTaxLabel(selectedAddon);
    setAddonRate((prev) => (String(prev || "").trim() === nextRateText ? prev : nextRateText));
    setAddonTax((prev) => {
      const nextTax = customerTaxLabel || addonTaxLabel || prev;
      if (String(prev || "").trim() === String(nextTax || "").trim()) return prev;
      return nextTax;
    });
  }, [selectedPriceList, selectedAddon, selectedCustomer, taxes]);

  const formatCouponValue = (coupon: CouponOption) => {
    const isPercent = normalizeText(coupon.discountType).includes("percent");
    if (isPercent) return `${coupon.discountValue}%`;
    return `AMD${coupon.discountValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const toAmount = (value: string) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  };

  const parseCouponDiscount = (couponValue: string, baseAmount: number) => {
    const raw = String(couponValue || "").trim();
    if (!raw || raw === "0.00") return 0;
    const percentMatch = raw.match(/(-?\d+(\.\d+)?)\s*%/);
    if (percentMatch) {
      const pct = Number(percentMatch[1]) || 0;
      return (baseAmount * pct) / 100;
    }
    const numeric = Number(raw.replace(/[^\d.-]/g, ""));
    return Number.isFinite(numeric) ? numeric : 0;
  };

  const extractTaxRate = (taxLabel: string) => {
    const raw = String(taxLabel || "").trim();
    if (!raw || normalizeText(raw) === "non-taxable" || normalizeText(raw) === "select a tax") return 0;
    const percentMatch = raw.match(/(-?\d+(\.\d+)?)\s*%/);
    if (!percentMatch) return 0;
    const rate = Number(percentMatch[1]);
    return Number.isFinite(rate) ? rate : 0;
  };

  const isTaxInclusive = normalizeText(formData.taxPreference) === "tax inclusive";
  const planQuantityAmount = useMemo(() => toAmount(formData.quantity), [formData.quantity]);
  const planRateAmount = useMemo(() => toAmount(formData.rate), [formData.rate]);
  const planBaseAmount = useMemo(() => planQuantityAmount * planRateAmount, [planQuantityAmount, planRateAmount]);
  const quoteTaxRate = useMemo(() => extractTaxRate(formData.tax), [formData.tax]);
  const planTaxAmount = useMemo(() => {
    if (quoteTaxRate <= 0 || planBaseAmount <= 0) return 0;
    if (isTaxInclusive) return (planBaseAmount * quoteTaxRate) / (100 + quoteTaxRate);
    return (planBaseAmount * quoteTaxRate) / 100;
  }, [planBaseAmount, quoteTaxRate, isTaxInclusive]);
  const planLineAmount = useMemo(() => {
    if (quoteTaxRate <= 0) return planBaseAmount;
    return isTaxInclusive ? planBaseAmount : planBaseAmount + planTaxAmount;
  }, [planBaseAmount, planTaxAmount, quoteTaxRate, isTaxInclusive]);

  const hasAddonSelection = Boolean(isAddonRowVisible && selectedAddon);
  const addonQuantityAmount = useMemo(() => (hasAddonSelection ? toAmount(addonQuantity) : 0), [hasAddonSelection, addonQuantity]);
  const addonRateAmount = useMemo(() => (hasAddonSelection ? toAmount(addonRate) : 0), [hasAddonSelection, addonRate]);
  const addonBaseAmount = useMemo(() => addonQuantityAmount * addonRateAmount, [addonQuantityAmount, addonRateAmount]);
  const addonTaxRate = useMemo(() => extractTaxRate(addonTax), [addonTax]);
  const addonTaxAmount = useMemo(() => {
    if (!hasAddonSelection || addonTaxRate <= 0 || addonBaseAmount <= 0) return 0;
    if (isTaxInclusive) return (addonBaseAmount * addonTaxRate) / (100 + addonTaxRate);
    return (addonBaseAmount * addonTaxRate) / 100;
  }, [addonBaseAmount, addonTaxRate, hasAddonSelection, isTaxInclusive]);
  const addonLineAmount = useMemo(() => {
    if (!hasAddonSelection || addonTaxRate <= 0) return addonBaseAmount;
    return isTaxInclusive ? addonBaseAmount : addonBaseAmount + addonTaxAmount;
  }, [addonBaseAmount, addonTaxAmount, addonTaxRate, hasAddonSelection, isTaxInclusive]);

  const quoteBaseAmount = useMemo(() => planBaseAmount + (hasAddonSelection ? addonBaseAmount : 0), [planBaseAmount, addonBaseAmount, hasAddonSelection]);
  const quoteTaxAmount = useMemo(() => planTaxAmount + (hasAddonSelection ? addonTaxAmount : 0), [planTaxAmount, addonTaxAmount, hasAddonSelection]);
  const quoteLineAmount = planLineAmount;
  const couponDiscountAmount = useMemo(() => parseCouponDiscount(formData.couponValue, quoteBaseAmount), [formData.couponValue, quoteBaseAmount]);
  const summaryLineItems = useMemo(() => {
    const items: Array<{ name: string; amount: number; rate: number }> = [];
    if (formData.plan) {
      items.push({
        name: formData.plan,
        amount: planLineAmount,
        rate: planRateAmount,
      });
    }
    if (selectedAddon && isAddonRowVisible) {
      items.push({
        name: selectedAddon.name,
        amount: addonLineAmount,
        rate: addonRateAmount,
      });
    }
    return items;
  }, [formData.plan, planLineAmount, planRateAmount, selectedAddon, isAddonRowVisible, addonLineAmount, addonRateAmount]);
  const summarySubtotal = useMemo(() => summaryLineItems.reduce((sum, item) => sum + item.amount, 0), [summaryLineItems]);
  const immediateTotal = useMemo(() => Math.max(summarySubtotal - couponDiscountAmount, 0), [summarySubtotal, couponDiscountAmount]);
  const recurringTotal = useMemo(() => Math.max(summarySubtotal - couponDiscountAmount, 0), [summarySubtotal, couponDiscountAmount]);
  const quoteDateForSummary = useMemo(() => {
    const iso = toIsoDate(formData.quoteDate);
    if (iso) {
      const parsed = new Date(`${iso}T00:00:00`);
      if (!Number.isNaN(parsed.getTime())) return parsed;
    }
    return new Date();
  }, [formData.quoteDate]);
  const immediateRangeEnd = useMemo(() => {
    const d = new Date(quoteDateForSummary);
    d.setMonth(d.getMonth() + 1);
    return d;
  }, [quoteDateForSummary]);
  const displaySummaryDate = (d: Date) =>
    new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(d);

  const formatCurrency = (value: number) => `AMD${value.toFixed(2)}`;

  const handleCouponSelect = (coupon: CouponOption) => {
    updateField("coupon", coupon.couponName);
    updateField("couponCode", coupon.couponCode);
    updateField("couponValue", formatCouponValue(coupon));
    setCouponSearch("");
    setIsCouponDropdownOpen(false);
  };

  const formatAddressSnapshot = (address: any) => {
    if (!address) return "";
    if (typeof address === "string") return address.trim();

    const attention = String(address?.attention || "").trim();
    const street1 = String(address?.street1 || "").trim();
    const street2 = String(address?.street2 || "").trim();
    const city = String(address?.city || "").trim();
    const state = String(address?.state || "").trim();
    const zipCode = String(address?.zipCode || "").trim();
    const country = String(address?.country || "").trim();
    const cityStateZip = [city, state, zipCode].filter(Boolean).join(", ");

    return [attention, street1, street2, cityStateZip, country].filter(Boolean).join(", ");
  };

  const ensureCustomerAddressBeforeSave = () => {
    const billing = formatAddressSnapshot(billingAddress || (selectedCustomer as any)?.billingAddress);
    const shipping = formatAddressSnapshot(shippingAddress || (selectedCustomer as any)?.shippingAddress);
    if (billing || shipping) return true;
    toast.error("Add a billing or shipping address before saving the quote.");
    openAddressModal("billing");
    return false;
  };

  const buildQuotePayload = (overrideQuoteNumber?: string) => {
    const billing = formatAddressSnapshot(billingAddress || (selectedCustomer as any)?.billingAddress);
    const shipping = formatAddressSnapshot(shippingAddress || (selectedCustomer as any)?.shippingAddress);
    const quoteNumberValue = String(overrideQuoteNumber || formData.quoteNumber || "").trim();
    const quantity = planQuantityAmount;
    const rate = planRateAmount;
    const subtotal = quoteBaseAmount;
    const discount = couponDiscountAmount;
    const totalBeforeDiscount = isTaxInclusive ? subtotal : subtotal + quoteTaxAmount;
    const total = Math.max(totalBeforeDiscount - discount, 0);

    const taxName = String(formData.tax || "").split("[")[0].trim() || (normalizeText(formData.tax) === "non-taxable" ? "Non-Taxable" : "");
    const quoteItems: any[] = [];
    if (formData.plan) {
      quoteItems.push({
        id: 1,
        itemId: String(selectedPlanAddon?.id || ""),
        itemType: String(selectedPlanAddon?.type || "plan"),
        name: formData.plan,
        description: "",
        quantity,
        rate,
        taxId: "",
        taxName: taxName || "Non-Taxable",
        taxRate: quoteTaxRate,
        tax: formData.tax || "Non-Taxable",
        amount: quoteLineAmount,
        reportingTags: Object.entries(reportingTagSelections).map(([tagId, value]) => ({ tagId, value })),
      });
    }
    if (selectedAddon && isAddonRowVisible) {
      const addonTaxName = String(addonTax || "").split("[")[0].trim() || (normalizeText(addonTax) === "non-taxable" ? "Non-Taxable" : "");
      quoteItems.push({
        id: quoteItems.length + 1,
        itemId: String(selectedAddon.id || ""),
        itemType: String(selectedAddon.type || "addon"),
        name: selectedAddon.name,
        description: "",
        quantity: addonQuantityAmount,
        rate: addonRateAmount,
        taxId: "",
        taxName: addonTaxName || "Non-Taxable",
        taxRate: addonTaxRate,
        tax: addonTax || "Non-Taxable",
        amount: addonLineAmount,
        reportingTags: Object.entries(reportingTagSelections).map(([tagId, value]) => ({ tagId, value })),
      });
    }

    return {
      quoteNumber: quoteNumberValue,
      referenceNumber: formData.referenceNumber,
      customerName: formData.customerName,
      customer: selectedCustomer?.id || selectedCustomer?._id || formData.customerName,
      customerId: selectedCustomer?.id || selectedCustomer?._id || undefined,
      billingAddress: billing,
      shippingAddress: shipping,
      quoteDate: formData.quoteDate,
      expiryDate: formData.expiryDate || undefined,
      salesperson: formData.salesperson,
      subject: formData.subject,
      priceListId: String((selectedPriceList as any)?.id || (selectedPriceList as any)?._id || ""),
      priceListName: String((selectedPriceList as any)?.name || ""),
      taxPreference: formData.taxPreference,
      taxExclusive: formData.taxPreference,
      items: quoteItems,
      subtotal,
      subTotal: subtotal,
      tax: quoteTaxAmount,
      taxAmount: quoteTaxAmount,
      totalTax: quoteTaxAmount,
      discount,
      discountAmount: discount,
      shippingCharges: 0,
      adjustment: 0,
      total,
      currency: String((selectedPriceList as any)?.currency || "USD"),
      customerNotes: formData.customerNotes,
      termsAndConditions: formData.termsAndConditions,
      reportingTags: Object.entries(reportingTagSelections).map(([tagId, value]) => ({ tagId, value })),
      quoteType: "subscription",
      isSubscriptionQuote: true,
      meteredBilling: Boolean(formData.meteredBilling),
      status: "Draft" as const,
      date: formData.quoteDate,
    };
  };

  const extractSavedQuoteId = (savedQuote: any) => {
    if (!savedQuote) return "";
    const directId = savedQuote?._id || savedQuote?.id || savedQuote?.quoteId;
    if (directId) return String(directId);
    const nested = savedQuote?.data || savedQuote?.quote || savedQuote?.result;
    const nestedId = nested?._id || nested?.id || nested?.quoteId;
    return nestedId ? String(nestedId) : "";
  };

  const handleSaveAsDraft = async () => {
    if (saveLoading) return;
    if (!ensureCustomerAddressBeforeSave()) return;
    setSaveLoading("draft");
    try {
      const currentNumber = String(formData.quoteNumber || "").trim();
      const effectiveQuoteNumber =
        quoteNumberMode === "auto"
          ? await getFreshQuoteNumberForSave(currentNumber)
          : currentNumber || await getFreshQuoteNumberForSave(currentNumber);
      if (effectiveQuoteNumber && effectiveQuoteNumber !== currentNumber) {
        updateField("quoteNumber", effectiveQuoteNumber);
      }
      const payload = buildQuotePayload(effectiveQuoteNumber);
      const savedQuote: any = await saveQuote(payload);
      const id = extractSavedQuoteId(savedQuote);
      setIsSummaryModalOpen(false);
      if (id) navigate(`/sales/quotes/${id}`, { replace: true });
      else navigate("/sales/quotes", { replace: true });
    } catch (error) {
      if (isDuplicateQuoteNumberError(error)) {
        try {
          const retryQuoteNumber = await getFreshQuoteNumberForSave(formData.quoteNumber);
          if (retryQuoteNumber) {
            updateField("quoteNumber", retryQuoteNumber);
            const retryPayload = buildQuotePayload(retryQuoteNumber);
            const savedQuote: any = await saveQuote(retryPayload);
            const id = extractSavedQuoteId(savedQuote);
            setIsSummaryModalOpen(false);
            if (id) navigate(`/sales/quotes/${id}`, { replace: true });
            else navigate("/sales/quotes", { replace: true });
            return;
          }
        } catch (retryError) {
          console.error("Failed retrying subscription quote save with fresh quote number:", retryError);
        }
      }
      console.error("Failed to save subscription quote as draft:", error);
      alert("Failed to save quote as draft.");
    } finally {
      setSaveLoading(null);
    }
  };

  const handleSaveAndSend = async () => {
    if (saveLoading) return;
    if (!ensureCustomerAddressBeforeSave()) return;
    setSaveLoading("send");
    try {
      const currentNumber = String(formData.quoteNumber || "").trim();
      const effectiveQuoteNumber =
        quoteNumberMode === "auto"
          ? await getFreshQuoteNumberForSave(currentNumber)
          : currentNumber || await getFreshQuoteNumberForSave(currentNumber);
      if (effectiveQuoteNumber && effectiveQuoteNumber !== currentNumber) {
        updateField("quoteNumber", effectiveQuoteNumber);
      }
      const payload = buildQuotePayload(effectiveQuoteNumber);
      const savedQuote: any = await saveQuote(payload);
      const id = extractSavedQuoteId(savedQuote);
      setIsSendApprovalModalOpen(false);
      setIsSummaryModalOpen(false);
      if (id) navigate(`/sales/quotes/${id}/email`, { state: { preloadedQuote: savedQuote } });
      else navigate("/sales/quotes", { replace: true });
    } catch (error) {
      if (isDuplicateQuoteNumberError(error)) {
        try {
          const retryQuoteNumber = await getFreshQuoteNumberForSave(formData.quoteNumber);
          if (retryQuoteNumber) {
            updateField("quoteNumber", retryQuoteNumber);
            const retryPayload = buildQuotePayload(retryQuoteNumber);
            const savedQuote: any = await saveQuote(retryPayload);
            const id = extractSavedQuoteId(savedQuote);
            setIsSendApprovalModalOpen(false);
            setIsSummaryModalOpen(false);
            if (id) navigate(`/sales/quotes/${id}/email`, { state: { preloadedQuote: savedQuote } });
            else navigate("/sales/quotes", { replace: true });
            return;
          }
        } catch (retryError) {
          console.error("Failed retrying subscription quote send with fresh quote number:", retryError);
        }
      }
      console.error("Failed to save and open email for subscription quote:", error);
      alert("Failed to save and send quote.");
    } finally {
      setSaveLoading(null);
    }
  };

  const handleSaveNewSalesperson = async () => {
    const trimmedName = String(newSalespersonData.name || "").trim();
    const trimmedEmail = String(newSalespersonData.email || "").trim();
    const normalizedName = trimmedName.toLowerCase();
    const normalizedEmail = trimmedEmail.toLowerCase();
    const editingId = String(editingSalespersonId || "").trim();

    if (!trimmedName) {
      toast.error("Please enter a name for the salesperson");
      return;
    }

    const duplicateSalesperson = salespersons.find((sp: any) => {
      const spId = String(sp.id || sp._id || "").trim();
      if (editingId && spId === editingId) return false;
      const existingName = String(sp.name || sp.displayName || "").trim().toLowerCase();
      const existingEmail = String(sp.email || "").trim().toLowerCase();
      return (
        (existingName && existingName === normalizedName) ||
        (normalizedEmail && existingEmail && existingEmail === normalizedEmail)
      );
    });

    if (duplicateSalesperson) {
      const existingName = String(duplicateSalesperson.name || duplicateSalesperson.displayName || "").trim();
      const existingEmail = String(duplicateSalesperson.email || "").trim();
      if (existingName.toLowerCase() === normalizedName && normalizedName) {
        toast.error(`A salesperson named "${trimmedName}" already exists.`);
      } else if (normalizedEmail && existingEmail.toLowerCase() === normalizedEmail) {
        toast.error(`A salesperson with email "${trimmedEmail}" already exists.`);
      } else {
        toast.error("This salesperson already exists.");
      }
      return;
    }

    try {
      const payload = {
        name: trimmedName,
        email: trimmedEmail,
        status: "active",
      };

      const isEditing = Boolean(editingId);
      const saved = isEditing
        ? await updateSalesperson(editingId, payload)
        : await saveSalesperson(payload);

      try {
        const refreshed = await getSalespersonsFromAPI();
        setSalespersons(Array.isArray(refreshed) ? refreshed : []);
      } catch {
        setSalespersons((prev) => {
          if (!saved) return prev;
          if (!isEditing) return [saved as any, ...prev];
          return prev.map((sp: any) => {
            const spId = String(sp.id || sp._id || "").trim();
            return spId === editingId ? (saved as any) : sp;
          });
        });
      }

      if (saved) {
        handleSalespersonSelect(saved);
      }
      setNewSalespersonData({ name: "", email: "" });
      setEditingSalespersonId(null);
      setIsNewSalespersonFormOpen(false);
      setIsManageSalespersonsOpen(false);
      toast.success(isEditing ? "Salesperson updated successfully" : "Salesperson added successfully");
    } catch (error) {
      console.error("Failed to save salesperson:", error);
      toast.error("Error saving salesperson: " + ((error as any)?.message || "Unknown error"));
    }
  };

  const handleCancelNewSalesperson = () => {
    setNewSalespersonData({ name: "", email: "" });
    setEditingSalespersonId(null);
    setIsNewSalespersonFormOpen(false);
  };

  const handleDeleteSalesperson = async (salespersonId: string) => {
    const normalizedId = String(salespersonId || "").trim();
    if (!normalizedId) return;

    if (!window.confirm("Are you sure you want to delete this salesperson?")) {
      return;
    }

    try {
      await salespersonsAPI.delete(normalizedId);
      const refreshed = await getSalespersonsFromAPI();
      setSalespersons(Array.isArray(refreshed) ? refreshed : []);

      if (String(formData.salespersonId || "") === normalizedId) {
        updateField("salesperson", "");
        updateField("salespersonId", "");
      }

      if (editingSalespersonId === normalizedId) {
        handleCancelNewSalesperson();
      }

      toast.success("Salesperson deleted successfully");
    } catch (error) {
      console.error("Failed to delete salesperson:", error);
      toast.error("Error deleting salesperson: " + ((error as any)?.message || "Unknown error"));
    }
  };

  const handleSetSalespersonStatus = async (salespersonId: string, nextStatus: "active" | "inactive") => {
    const normalizedId = String(salespersonId || "").trim();
    if (!normalizedId) return;

    const salesperson = salespersons.find((sp: any) => String(sp.id || sp._id || "") === normalizedId);
    if (!salesperson) {
      toast.error("Salesperson not found");
      return;
    }

    const previousSalespersons = salespersons;
    const previousSalespersonName = formData.salesperson;
    const previousSalespersonId = formData.salespersonId;
    const nextIsActive = nextStatus === "active";

    setSalespersons((prev) =>
      prev.map((sp: any) => {
        const spId = String(sp.id || sp._id || "");
        if (spId !== normalizedId) return sp;
        return {
          ...sp,
          status: nextStatus,
          active: nextIsActive,
          isActive: nextIsActive,
        };
      })
    );

    setManageSalespersonMenuOpen(null);
    toast.success(nextStatus === "inactive" ? "Salesperson marked inactive" : "Salesperson marked active");

    try {
      const response = await updateSalesperson(normalizedId, {
        name: String(salesperson.name || salesperson.displayName || "").trim(),
        email: String(salesperson.email || "").trim(),
        status: nextStatus,
        active: nextIsActive,
        isActive: nextIsActive,
      });

      if (response) {
        const updatedSalesperson = {
          ...salesperson,
          ...response,
          status: nextStatus,
        };

        if (String(formData.salespersonId || "") === normalizedId) {
          if (nextStatus === "inactive") {
            updateField("salesperson", "");
            updateField("salespersonId", "");
          } else {
            updateField("salesperson", String(updatedSalesperson.name || previousSalespersonName || ""));
            updateField("salespersonId", String(updatedSalesperson.id || updatedSalesperson._id || previousSalespersonId || ""));
          }
        }

        try {
          const refreshed = await salespersonsAPI.getAll();
          setSalespersons(Array.isArray(refreshed?.data) ? refreshed.data : []);
        } catch {
          const refreshed = await getSalespersonsFromAPI();
          setSalespersons(Array.isArray(refreshed) ? refreshed : []);
        }
        return;
      }

      setSalespersons(previousSalespersons);
      updateField("salesperson", previousSalespersonName);
      updateField("salespersonId", previousSalespersonId);
      toast.error("Failed to update salesperson status");
    } catch (error: any) {
      console.error("Error updating salesperson status:", error);
      setSalespersons(previousSalespersons);
      updateField("salesperson", previousSalespersonName);
      updateField("salespersonId", previousSalespersonId);
      toast.error("Error updating salesperson: " + ((error as any)?.message || "Unknown error"));
    }
  };

  const applySalespersonStatusLocally = (ids: string[], nextStatus: "active" | "inactive") => {
    const normalizedIds = new Set(ids.map((id) => String(id || "").trim()).filter(Boolean));
    const isActive = nextStatus === "active";
    setSalespersons((prev) =>
      prev.map((sp: any) => {
        const spId = String(sp.id || sp._id || "").trim();
        if (!normalizedIds.has(spId)) return sp;
        return {
          ...sp,
          status: nextStatus,
          active: isActive,
          isActive,
        };
      })
    );
  };

  const handleBulkSalespersonStatusChange = async (nextStatus: "active" | "inactive") => {
    const ids = Array.from(
      new Set(
        selectedSalespersonIds
          .map((id: any) => String(id || "").trim())
          .filter(Boolean)
      )
    );

    if (ids.length === 0) {
      toast.error("Please select at least one salesperson");
      return;
    }

    const previousSalespersons = salespersons;
    applySalespersonStatusLocally(ids, nextStatus);
    setSelectedSalespersonIds([]);
    setManageSalespersonMenuOpen(null);
    toast.success(
      nextStatus === "inactive"
        ? `${ids.length} salesperson${ids.length === 1 ? "" : "s"} marked inactive`
        : `${ids.length} salesperson${ids.length === 1 ? "" : "s"} marked active`
    );

    try {
      await Promise.all(
        ids.map(async (salespersonId) => {
          const salesperson = salespersons.find((sp: any) => String(sp.id || sp._id || "") === salespersonId);
          if (!salesperson) return;
          await updateSalesperson(salespersonId, {
            name: String(salesperson.name || salesperson.displayName || "").trim(),
            email: String(salesperson.email || "").trim(),
            status: nextStatus,
            active: nextStatus === "active",
            isActive: nextStatus === "active",
          });
        })
      );

      try {
        const refreshed = await salespersonsAPI.getAll();
        setSalespersons(Array.isArray(refreshed?.data) ? refreshed.data : []);
      } catch {
        const refreshed = await getSalespersonsFromAPI();
        setSalespersons(Array.isArray(refreshed) ? refreshed : []);
      }
    } catch (error: any) {
      console.error("Error updating salesperson statuses:", error);
      setSalespersons(previousSalespersons);
      try {
        const refreshed = await getSalespersonsFromAPI();
        setSalespersons(Array.isArray(refreshed) ? refreshed : []);
      } catch {
        setSalespersons(previousSalespersons);
      }
      toast.error("Error updating salespersons: " + ((error as any)?.message || "Unknown error"));
    }
  };

  const handleBulkDeleteSalespersons = async () => {
    const ids = Array.from(
      new Set(
        selectedSalespersonIds
          .map((id: any) => String(id || "").trim())
          .filter(Boolean)
      )
    );

    if (ids.length === 0) {
      toast.error("Please select at least one salesperson");
      return;
    }

    if (!window.confirm(`Are you sure you want to delete ${ids.length} salesperson${ids.length === 1 ? "" : "s"}?`)) {
      return;
    }

    try {
      await Promise.all(ids.map((salespersonId) => salespersonsAPI.delete(salespersonId)));
      try {
        const refreshed = await salespersonsAPI.getAll();
        setSalespersons(Array.isArray(refreshed?.data) ? refreshed.data : []);
      } catch {
        const refreshed = await getSalespersonsFromAPI();
        setSalespersons(Array.isArray(refreshed) ? refreshed : []);
      }
      setSelectedSalespersonIds([]);
      setManageSalespersonMenuOpen(null);

      if (ids.includes(String(formData.salespersonId || ""))) {
        updateField("salesperson", "");
        updateField("salespersonId", "");
      }

      toast.success(`${ids.length} salesperson${ids.length === 1 ? "" : "s"} deleted`);
    } catch (error: any) {
      console.error("Error deleting salespersons:", error);
      toast.error("Error deleting salespersons: " + ((error as any)?.message || "Unknown error"));
    }
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="sticky top-0 z-40 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
        <div className="flex items-end gap-8">
          <button
            type="button"
            onClick={() => navigate("/sales/quotes/new")}
            className="pb-3 text-[18px] text-slate-700 transition hover:text-slate-900"
          >
            Quote
          </button>
          <button
            type="button"
            className="border-b-2 border-[#3b82f6] pb-3 text-[18px] font-semibold text-slate-900"
          >
            Subscription Quote
          </button>
        </div>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="rounded-md p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
          aria-label="Close"
        >
          <X size={34} />
        </button>
      </div>

      <div className="relative">
        {selectedCustomer && (
          <div className="absolute right-6 top-8 z-20 w-[240px] rounded-lg !bg-[#1e222d] p-3.5 text-white shadow-xl cursor-pointer hover:!bg-[#2a2f3b] transition-all border border-slate-700">
            <div className="flex items-center justify-between">
              <div className="flex flex-col min-w-0">
                <span className="text-[14px] font-semibold truncate pr-2 text-white">
                  {displayCustomerName(selectedCustomer)}'s De...
                </span>
                <div className="mt-1.5 flex items-center gap-2 text-slate-300">
                  <AlertTriangle size={14} className="text-slate-400" />
                  <span className="text-[12px]">1 Unpaid Invoices</span>
                </div>
              </div>
              <ChevronRight size={18} className="text-slate-400 ml-2 flex-shrink-0" />
            </div>
          </div>
        )}
        <div className="space-y-0">
          <section className="px-6 py-8">
            <div className="grid grid-cols-1 gap-8 xl:max-w-[1280px]">
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-[260px_minmax(0,420px)]">
                <label className="pt-2 text-sm text-red-600">Customer Name*</label>
                <div className="flex flex-col">
                  <div className="flex" ref={customerDropdownRef}>
                    <div className="relative flex-1">
                      <input
                        type="text"
                        className={`h-10 w-full rounded-l border px-3 pr-10 text-sm text-slate-700 outline-none transition ${isCustomerDropdownOpen ? "border-[#156372]" : "border-slate-300"} focus:border-[#156372]`}
                        value={formData.customerName}
                        onChange={(e) => {
                          updateField("customerName", e.target.value);
                          setCustomerSearch(e.target.value);
                        }}
                        onFocus={() => setIsCustomerDropdownOpen(true)}
                        onClick={() => setIsCustomerDropdownOpen(true)}
                        placeholder="Select or add a customer"
                      />
                      {isCustomerDropdownOpen ? (
                        <ChevronUp size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#156372]" />
                      ) : (
                        <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      )}
                      {isCustomerDropdownOpen && (
                        <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-md border border-slate-200 bg-white shadow-lg">
                          <div className="border-b border-slate-200 p-2">
                            <div className="relative">
                              <Search size={14} className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                              <input
                                type="text"
                                className="h-8 w-full rounded border border-slate-300 bg-white pl-7 pr-2 text-[13px] text-slate-700 outline-none focus:border-[#3b82f6]"
                                value={customerSearch}
                                onChange={(e) => setCustomerSearch(e.target.value)}
                                placeholder="Search"
                              />
                            </div>
                          </div>
                          <div className="max-h-52 overflow-y-auto">
                            {filteredCustomers.length === 0 ? (
                              <div className="px-3 py-2 text-[13px] text-slate-500">No customers found</div>
                            ) : (
                              filteredCustomers.map((customer: any, index) => {
                                const name = displayCustomerName(customer);
                                const email = customerEmail(customer);
                                const code = customerCode(customer);
                                return (
                                  <button
                                    key={customer?.id || customer?._id || index}
                                    type="button"
                                    className="w-full border-b border-slate-100 px-3 py-2 text-left hover:bg-[#eef5ff]"
                                    onClick={() => handleCustomerSelect(customer)}
                                  >
                                    <div className="flex items-start gap-2">
                                      <div className="mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-200 text-[12px] font-medium text-slate-700">
                                        {name.charAt(0).toUpperCase()}
                                      </div>
                                      <div className="min-w-0">
                                        <div className="truncate text-[13px] font-medium text-slate-800">
                                          {name} {code ? `| ${code}` : ""}
                                        </div>
                                        {email ? <div className="truncate text-[12px] text-slate-500">{email}</div> : null}
                                      </div>
                                    </div>
                                  </button>
                                );
                              })
                            )}
                          </div>
                          <button
                            type="button"
                            className="flex w-full items-center gap-2 px-3 py-2 text-[13px] text-[#3b82f6] hover:bg-slate-50"
                            onClick={() => navigate("/sales/customers/new")}
                          >
                            <PlusCircle size={14} />
                            New Customer
                          </button>
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      className="inline-flex h-10 w-10 items-center justify-center rounded-r border border-[#156372] bg-[#156372] text-white hover:bg-[#0D4A52]"
                      aria-label="Search customer"
                      onClick={() => setIsCustomerDropdownOpen((prev) => !prev)}
                    >
                      <Search size={16} />
                    </button>
                    {selectedCustomer && (
                      <button
                        type="button"
                        className="ml-4 inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-3 py-1 text-[13px] font-medium text-slate-700 hover:bg-slate-50"
                      >
                        <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                        {selectedCustomer.currency || "AMD"}
                      </button>
                    )}
                  </div>

                  {selectedCustomer && (
                    <div className="mt-4 flex gap-20">
                      <div className="flex flex-col">
                        <span className="text-[12px] font-semibold tracking-wide text-slate-400">BILLING ADDRESS</span>
                        <div className="mt-3 text-[13px] text-slate-600">
                          {billingAddress?.street1 ? (
                            <div className="flex flex-col space-y-0.5 leading-relaxed">
                              <span className="font-medium text-slate-700">{billingAddress.attention}</span>
                              <span>{billingAddress.street1}</span>
                              <span>{billingAddress.city}, {billingAddress.state} {billingAddress.zipCode}</span>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => openAddressModal("billing")}
                              className="text-[#3b82f6] hover:text-[#2563eb] font-medium text-[13px] flex items-center gap-1"
                            >
                              New Address
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[12px] font-semibold tracking-wide text-slate-400">SHIPPING ADDRESS</span>
                        <div className="mt-3 text-[13px] text-slate-600">
                          {shippingAddress?.street1 ? (
                            <div className="flex flex-col space-y-0.5 leading-relaxed">
                              <span className="font-medium text-slate-700">{shippingAddress.attention}</span>
                              <span>{shippingAddress.street1}</span>
                              <span>{shippingAddress.city}, {shippingAddress.state} {shippingAddress.zipCode}</span>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => openAddressModal("shipping")}
                              className="text-[#3b82f6] hover:text-[#2563eb] font-medium text-[13px] flex items-center gap-1"
                            >
                              New Address
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-[260px_minmax(0,420px)]">
                <label className="text-[16px] text-slate-800">Location</label>
                <div className="relative" ref={locationDropdownRef}>
                  <button
                    type="button"
                    onClick={() => setIsLocationDropdownOpen((prev) => !prev)}
                    className={`${inputClass} text-left flex items-center justify-between`}
                  >
                    <span>{formData.location || "Select Location"}</span>
                    <ChevronDown size={16} className="text-slate-400" />
                  </button>
                  {isLocationDropdownOpen && (
                    <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-md border border-slate-200 bg-white shadow-lg overflow-hidden">
                      <div className="max-h-44 overflow-y-auto">
                        {locationOptions.length === 0 ? (
                          <div className="px-3 py-2 text-[13px] text-slate-500">No locations found</div>
                        ) : (
                          locationOptions.map((loc, idx) => (
                            <button
                              key={idx}
                              type="button"
                              className="block w-full border-b border-slate-100 px-3 py-2 text-left text-[14px] text-slate-700 hover:bg-[#eef5ff]"
                              onClick={() => {
                                updateField("location", loc);
                                setIsLocationDropdownOpen(false);
                              }}
                            >
                              {loc}
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-[260px_320px]">
                <label className={requiredLabelClass}>Quote#*</label>
                <div className="relative">
                  <input
                    type="text"
                    className={`${inputClass} pr-10`}
                    value={formData.quoteNumber}
                    onChange={(e) => updateField("quoteNumber", e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={openQuoteNumberModal}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-[#3b82f6] hover:bg-[#eef5ff]"
                    aria-label="Configure quote number preferences"
                  >
                    <Settings size={18} />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-[260px_320px]">
                <label className="text-sm text-slate-800">Reference#</label>
                <input
                  type="text"
                  className={inputClass}
                  value={formData.referenceNumber}
                  onChange={(e) => updateField("referenceNumber", e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
                <label className={requiredLabelClass}>Quote Date*</label>
                <div className="flex flex-wrap items-center gap-6">
                  <div className="relative w-[320px] max-w-full">
                    <input
                      type="text"
                      className={`${inputClass} pr-9`}
                      value={formatDateForDisplay(formData.quoteDate)}
                      readOnly
                      onClick={() => openNativeDatePicker(quoteDateNativeRef)}
                    />
                    <CalendarDays size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      ref={quoteDateNativeRef}
                      type="date"
                      className="pointer-events-none absolute h-0 w-0 opacity-0"
                      value={toIsoDate(formData.quoteDate)}
                      onChange={(e) => handleDateInputChange("quoteDate", e.target.value)}
                      tabIndex={-1}
                      aria-hidden
                    />
                  </div>
                  <label className="text-sm text-slate-800">Expiry Date</label>
                  <div className="relative w-[320px] max-w-full">
                    <input
                      type="text"
                      className={`${inputClass} pr-9`}
                      value={formatDateForDisplay(formData.expiryDate)}
                      readOnly
                      onClick={() => openNativeDatePicker(expiryDateNativeRef)}
                      placeholder="dd/MM/yyyy"
                    />
                    <CalendarDays size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      ref={expiryDateNativeRef}
                      type="date"
                      className="pointer-events-none absolute h-0 w-0 opacity-0"
                      value={toIsoDate(formData.expiryDate)}
                      onChange={(e) => handleDateInputChange("expiryDate", e.target.value)}
                      min={toIsoDate(formData.quoteDate) || undefined}
                      tabIndex={-1}
                      aria-hidden
                    />
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="px-6 py-4">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[260px_minmax(0,420px)]">
              <label className="text-[16px] text-slate-800">Salesperson</label>
              <div className="relative w-full" ref={salespersonDropdownRef}>
                <div
                  className={`${inputClass} flex items-center justify-between cursor-pointer`}
                  onClick={() => setIsSalespersonDropdownOpen(!isSalespersonDropdownOpen)}
                >
                  <span className={selectedSalespersonIsActive ? "text-slate-900" : "text-slate-400"}>
                    {selectedSalespersonIsActive ? (formData.salesperson || "Select or Add Salesperson") : "Select or Add Salesperson"}
                  </span>
                  <ChevronDown size={18} className="text-slate-500" />
                </div>
                {isSalespersonDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 z-50 mt-1 flex flex-col rounded-md border border-slate-200 bg-white shadow-lg">
                    <div className="sticky top-0 flex items-center gap-2 border-b border-slate-200 bg-white p-2">
                      <Search size={14} className="text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search"
                        value={salespersonSearch}
                        onChange={(e) => setSalespersonSearch(e.target.value)}
                        className="flex-1 text-sm focus:outline-none"
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                    <div className="max-h-60 overflow-y-auto">
                      {filteredSalespersons.length > 0 ? (
                        filteredSalespersons.map((salesperson: any, index) => (
                          <div
                            key={salesperson?.id || salesperson?._id || index}
                            className="cursor-pointer truncate px-4 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900"
                            onClick={() => handleSalespersonSelect(salesperson)}
                          >
                            {salesperson?.name || salesperson?.displayName || "Unnamed Salesperson"}
                          </div>
                        ))
                      ) : (
                        <div className="px-4 py-2 text-sm italic text-slate-500">No salespersons found</div>
                      )}
                    </div>
                    <div
                      className="flex cursor-pointer items-center gap-2 border-t border-slate-100 p-3 text-sm font-medium text-[#156372] hover:bg-slate-50"
                      onClick={() => {
                        setIsManageSalespersonsOpen(true);
                        setIsSalespersonDropdownOpen(false);
                      }}
                    >
                      <PlusCircle size={16} />
                      <span>Manage Salespersons</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

          </section>

          <section className="px-6 py-8">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[260px_minmax(0,420px)]">
              <label className="flex items-center gap-2 text-[16px] text-slate-800">
                Subject
                <Info size={18} className="text-slate-500" />
              </label>
              <textarea
                className="min-h-[72px] w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-[14px] text-slate-800 outline-none transition focus:border-[#3b82f6]"
                value={formData.subject}
                onChange={(e) => updateField("subject", e.target.value)}
                placeholder="Let your customer know what this Quote is for"
              />
            </div>
          </section>

          <section className="border-b border-slate-200 px-6 py-8">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[260px_minmax(0,420px)]">
              <label className={requiredLabelClass}>Product*</label>
              <div className="relative" ref={productDropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsProductDropdownOpen((prev) => !prev)}
                  className={`${inputClass} pr-2 text-left ${formData.product ? "text-slate-800" : "text-slate-400"} flex items-center justify-between`}
                >
                  <span>{formData.product || "Select Product"}</span>
                  <ChevronDown size={16} className="text-slate-500" />
                </button>
                {isProductDropdownOpen && (
                  <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-md border border-slate-200 bg-white shadow-lg">
                    <div className="border-b border-slate-200 p-2">
                      <div className="relative">
                        <Search size={14} className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          className="h-8 w-full rounded border border-slate-300 bg-white pl-7 pr-2 text-[13px] text-slate-700 outline-none focus:border-[#3b82f6]"
                          value={productSearch}
                          onChange={(e) => setProductSearch(e.target.value)}
                          placeholder="Search"
                          autoFocus
                        />
                      </div>
                    </div>
                    <div className="max-h-44 overflow-y-auto">
                      {filteredProducts.length === 0 ? (
                        <div className="px-3 py-2 text-[13px] text-slate-500">No products found</div>
                      ) : (
                        filteredProducts.map((product, index) => (
                          <button
                            key={product.id || index}
                            type="button"
                            className="block w-full border-b border-slate-100 px-3 py-2 text-left text-[14px] text-slate-700 hover:bg-[#eef5ff]"
                            onClick={() => handleProductSelect(product)}
                          >
                            {product.name}
                          </button>
                        ))
                      )}
                    </div>
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 px-3 py-2 text-[13px] text-[#0f6c82] hover:bg-slate-50"
                      onClick={() => navigate("/products/products/new")}
                    >
                      <PlusCircle size={14} />
                      New Product
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-4 pb-2">
              {isTaxPreferenceLocked ? (
                <div className="inline-flex h-9 min-w-[170px] items-center gap-2 px-2 text-left text-[14px] text-slate-700">
                  <ShoppingBag size={14} className="text-slate-500" />
                  <span>{resolvedTaxPreference}</span>
                </div>
              ) : (
                <div className="relative" ref={taxPreferenceDropdownRef}>
                  <button
                    type="button"
                    onClick={() => setIsTaxPreferenceDropdownOpen((prev) => !prev)}
                    className="inline-flex h-9 min-w-[170px] items-center justify-between gap-2 px-2 text-left text-[14px] text-slate-700"
                  >
                    <span className="inline-flex items-center gap-2">
                      <ShoppingBag size={14} className="text-slate-500" />
                      {formData.taxPreference || "Tax Exclusive"}
                    </span>
                    <ChevronDown size={14} className="text-slate-500" />
                  </button>
                  {isTaxPreferenceDropdownOpen && (
                    <div className="absolute left-0 top-full z-40 mt-1 w-[190px] overflow-hidden rounded-md border border-slate-200 bg-white shadow-lg">
                      {["Tax Exclusive", "Tax Inclusive"].map((option) => (
                        <button
                          key={option}
                          type="button"
                          className="block w-full border-b border-slate-100 px-3 py-2 text-left text-[13px] text-slate-700 hover:bg-[#eef5ff]"
                          onClick={() => {
                            updateField("taxPreference", option);
                            setIsTaxPreferenceDropdownOpen(false);
                          }}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className={`mt-4 w-full max-w-[1060px] border border-slate-200 bg-white relative ${(isPlanAddonDropdownOpen || isTaxDropdownOpen || isReportingTagsDropdownOpen) ? "overflow-visible z-[300]" : "overflow-x-auto z-0"}`}>
              <div className="min-w-[860px]">
                <div className="grid grid-cols-[2.5fr_0.72fr_0.82fr_0.9fr_0.82fr_44px] border-b border-slate-200 bg-white text-[11px] font-semibold uppercase tracking-wide text-slate-800">
                  <div className="px-4 py-2.5">Plan and Addon</div>
                  <div className="border-l border-slate-200 px-4 py-2.5 text-right">Quantity</div>
                  <div className="border-l border-slate-200 px-4 py-2.5 text-right">
                    <span className="inline-flex items-center gap-1">
                      Rate
                      <span className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-[2px] border border-slate-400 text-slate-500">
                        <Calculator size={10} />
                      </span>
                    </span>
                  </div>
                  <div className="border-l border-slate-200 px-4 py-2.5">Tax</div>
                  <div className="border-l border-slate-200 px-4 py-2.5 text-right">Amount</div>
                  <div className="border-l border-slate-200 px-2 py-2.5" />
                </div>

                <div className={`grid grid-cols-[2.5fr_0.72fr_0.82fr_0.9fr_0.82fr_44px] items-stretch gap-0 border-b border-slate-200 bg-white ${!isProductSelected ? "opacity-60" : ""} relative ${(isPlanAddonDropdownOpen || isTaxDropdownOpen || isReportingTagsDropdownOpen) ? "z-[300]" : "z-0"}`}>
                  <div className="flex items-center gap-3 px-4 py-3 border-r border-slate-200">
                    <div className="flex h-7 w-7 items-center justify-center rounded-sm bg-slate-100 text-slate-400">
                      <ImageIcon size={14} />
                    </div>
                    <div className="relative flex-1" ref={planAddonDropdownRef}>
                      <button
                        type="button"
                        disabled={!isProductSelected}
                        onClick={() => {
                          closeOpenDropdowns();
                          setIsPlanAddonDropdownOpen((prev) => !prev);
                        }}
                        className={`w-full bg-white px-0 text-left text-[13px] text-slate-500 outline-none flex items-center justify-between ${!isProductSelected ? "cursor-not-allowed" : ""}`}
                      >
                        <span className="truncate">{formData.plan || "Type or click to select a plan."}</span>
                        <ChevronDown size={16} className="ml-2 text-slate-500" />
                      </button>
                      {isPlanAddonDropdownOpen && isProductSelected && (
                        <div className="absolute left-0 right-0 top-full z-[500] mt-1 overflow-hidden rounded-md border border-slate-200 bg-white shadow-none">
                          <div className="border-b border-slate-200 p-2">
                            <div className="relative">
                              <Search size={14} className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                              <input
                                type="text"
                                className="h-8 w-full rounded border border-slate-300 bg-white pl-7 pr-2 text-[13px] text-slate-700 outline-none focus:border-slate-300"
                                value={planAddonSearch}
                                onChange={(e) => setPlanAddonSearch(e.target.value)}
                                placeholder="Search"
                                autoFocus
                              />
                            </div>
                          </div>
                          {isPlanAddonFallbackMode && (
                            <div className="border-b border-slate-200 px-3 py-1.5 text-[12px] text-slate-500">
                              Showing all active plans.
                            </div>
                          )}
                          <div className="max-h-60 overflow-y-auto">
                            {availablePlanOptions.length === 0 ? (
                              <div className="px-3 py-2 text-[13px] text-slate-500">No plans found</div>
                            ) : (
                              availablePlanOptions.map((row: PlanAddonOption) => (
                                <button
                                  key={row.id}
                                  type="button"
                                  className={`block w-full border-b border-slate-100 px-3 py-2 text-left hover:bg-[#eef5ff] ${normalizeText(formData.plan) === normalizeText(row.name) ? "border-l-2 border-l-[#3b82f6]" : ""}`}
                                  onClick={() => handlePlanAddonSelect(row)}
                                >
                                  <div className={`text-[13px] font-medium ${normalizeText(formData.plan) === normalizeText(row.name) ? "text-[#1d4ed8]" : "text-slate-800"}`}>{row.name}</div>
                                  <div className="text-[12px] text-slate-500">{row.type === "plan" ? "Code" : "Addon Code"}: {row.code || "-"}</div>
                                </button>
                              ))
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => navigate("/products/plans/new")}
                            className="flex w-full items-center justify-center gap-2 border-t border-slate-200 px-3 py-2 text-[13px] text-[#0f6c82] hover:bg-slate-50"
                          >
                            <PlusCircle size={14} />
                            Add New Item
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  <input
                    type="text"
                    className="h-full w-full border-r border-slate-200 bg-white px-4 text-[13px] text-right text-slate-700 outline-none"
                    value={formData.quantity}
                    onChange={(e) => updateField("quantity", e.target.value)}
                    disabled={!isProductSelected}
                  />
                  <input
                    type="text"
                    className="h-full w-full border-r border-slate-200 bg-white px-4 text-[13px] text-right text-slate-700 outline-none"
                    value={formData.rate}
                    onChange={(e) => updateField("rate", e.target.value)}
                    disabled={!isProductSelected}
                  />
                  <div className="relative border-r border-slate-200" ref={taxDropdownRef}>
                    <button
                      type="button"
                      disabled={!isProductSelected}
                      onClick={() => {
                        closeOpenDropdowns();
                        setIsTaxDropdownOpen((prev) => !prev);
                      }}
                      className="w-full px-2 py-1.5 border border-gray-300 bg-white rounded outline-none text-sm text-left flex items-center justify-between hover:border-gray-400 transition-colors"
                    >
                      <span className={selectedTaxLabel ? "text-gray-900" : "text-gray-500"}>
                        {selectedTaxLabel || "Select a Tax"}
                      </span>
                      <ChevronDown
                        size={14}
                        className={`transition-transform ${isTaxDropdownOpen ? "rotate-180" : ""}`}
                        style={{ color: "#156372" }}
                      />
                    </button>
                    {isTaxDropdownOpen && isProductSelected && (
                      <div className="absolute left-0 top-full z-[9999] mt-1 w-72 rounded-xl border border-[#d6dbe8] bg-white p-1 shadow-2xl animate-in fade-in zoom-in-95 duration-100">
                        <div className="p-2">
                          <div
                            className="flex items-center gap-2 rounded-lg border bg-slate-50/50 px-3 py-1.5 transition-all focus-within:bg-white"
                            style={{ borderColor: "#156372" }}
                          >
                            <Search size={14} className="text-slate-400" />
                            <input
                              type="text"
                              className="w-full border-none bg-transparent text-[13px] text-slate-700 outline-none placeholder:text-slate-400"
                              value={taxSearch}
                              onChange={(e) => setTaxSearch(e.target.value)}
                              placeholder="Search..."
                              autoFocus
                            />
                          </div>
                        </div>
                        <div className="max-h-64 overflow-y-auto py-1 custom-scrollbar">
                          {filteredTaxGroups.length > 0 ? (
                            filteredTaxGroups.map((group) => (
                              <div key={group.label}>
                                <div className="px-4 py-1.5 text-[10px] font-extrabold uppercase tracking-widest text-slate-700">
                                  {group.label}
                                </div>
                                {group.options.map((tax) => {
                                  const label = taxLabel(tax.raw ?? tax);
                                  const taxId = String(tax.id || "").trim();
                                  const selected = String(formData.tax || "").trim() === taxId || String(formData.tax || "").trim() === label;
                                  return (
                                    <button
                                      key={taxId}
                                      type="button"
                                      className={`w-full px-4 py-2 text-left text-[13px] ${selected
                                        ? "text-[#156372] font-medium hover:bg-gray-50 hover:text-gray-900"
                                        : "text-slate-700 hover:bg-gray-50 hover:text-gray-900"
                                        }`}
                                      onClick={() => {
                                        updateField("tax", taxId || label);
                                        setIsTaxDropdownOpen(false);
                                        setTaxSearch("");
                                      }}
                                    >
                                      {label}
                                    </button>
                                  );
                                })}
                              </div>
                            ))
                          ) : (
                            <div className="px-4 py-3 text-center text-[13px] text-slate-500">No taxes found</div>
                          )}
                        </div>
                        <button
                          type="button"
                          className="w-full border-t border-gray-200 px-4 py-2 text-left text-[#156372] text-[13px] font-medium flex items-center gap-2 hover:bg-gray-50"
                          onClick={() => {
                            setIsTaxDropdownOpen(false);
                            setTaxSearch("");
                            handleOpenNewTaxModal();
                          }}
                        >
                          <PlusCircle size={14} />
                          New Tax
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="border-r border-slate-200 px-4 py-3 text-right text-[14px] font-semibold leading-none text-slate-900">{planLineAmount.toFixed(2)}</div>
                  <div className="relative flex items-center justify-center" ref={moreMenuRef}>
                    <button
                      type="button"
                      disabled={!isProductSelected}
                    onClick={() => {
                        closeOpenDropdowns();
                        setShowReportingTags((prev) => {
                          const next = !prev;
                          if (!next) setIsReportingTagsDropdownOpen(false);
                          return next;
                        });
                      }}
                      className="inline-flex items-center justify-center rounded-md p-2 text-[#2563eb] hover:bg-slate-100 disabled:cursor-not-allowed"
                    >
                      <MoreVertical size={16} />
                    </button>
                  </div>
                </div>

                {showReportingTags && (
                  <div className={`border-t border-slate-200 px-3 py-3 text-[13px] ${isProductSelected ? "text-slate-500" : "text-slate-400"} relative z-[220]`} ref={reportingTagsDropdownRef}>
                    <div className="relative">
                      <button
                        type="button"
                        disabled={!isProductSelected}
                        onClick={() => {
                          closeOpenDropdowns();
                          setIsReportingTagsDropdownOpen((prev) => !prev);
                        }}
                        className="flex items-center gap-2 hover:text-slate-700 font-medium"
                      >
                        <Tag size={14} className="text-slate-400" />
                        {Object.keys(reportingTagSelections).length > 0
                          ? `Reporting Tags: ${Object.keys(reportingTagSelections).length} selected`
                          : "Reporting Tags"}
                        <ChevronDown size={14} className={`text-slate-400 transition-transform ${isReportingTagsDropdownOpen ? "rotate-180" : ""}`} />
                      </button>

                      {isReportingTagsDropdownOpen && (
                        <div className="absolute left-0 top-full z-[400] mt-1 w-72 rounded-md border border-slate-200 bg-white p-4 shadow-2xl">
                          <h4 className="mb-3 text-[14px] font-semibold text-slate-800">Assign Reporting Tags</h4>
                          <div className="space-y-4">
                            {availableReportingTags.length === 0 ? (
                              <div className="text-slate-500">No reporting tags available.</div>
                            ) : (
                              availableReportingTags.map((tag: any) => {
                                const tagKey = String(tag.id || tag._id || "").trim();
                                const selectedValue = reportingTagSelections[tagKey] || "";
                                const isOpen = activeReportingTagId === tagKey;
                                const options = getFilteredReportingTagOptions(tag);
                                return (
                                  <div key={tagKey || tag.name}>
                                    <label className="mb-1 block text-[12px] font-medium text-slate-600">{tag.name}</label>
                                    <div className="relative">
                                      <button
                                        type="button"
                                        className={`h-10 w-full rounded border px-3 pr-10 text-left text-[13px] text-slate-700 outline-none transition ${isOpen ? "border-[#156372]" : "border-slate-300"} focus:border-[#156372]`}
                                        onClick={() => {
                                          const nextOpen = isOpen ? null : tagKey;
                                          setActiveReportingTagId(nextOpen);
                                          setReportingTagSearch("");
                                        }}
                                      >
                                        <span className={selectedValue ? "text-slate-700" : "text-slate-400"}>
                                          {selectedValue || "Select an option"}
                                        </span>
                                      </button>
                                      {isOpen ? (
                                        <ChevronUp size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#156372]" />
                                      ) : (
                                        <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                      )}
                                      {isOpen && (
                                        <div className="absolute left-0 top-full z-50 mt-1 w-full rounded-md border border-slate-200 bg-white shadow-lg">
                                          <div className="border-b border-slate-200 p-2">
                                            <div className="relative">
                                              <Search size={14} className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                                              <input
                                                type="text"
                                                className="h-8 w-full rounded border border-slate-300 bg-white pl-7 pr-2 text-[13px] text-slate-700 outline-none focus:border-[#3b82f6]"
                                                value={reportingTagSearch}
                                                onChange={(e) => setReportingTagSearch(e.target.value)}
                                                placeholder="Search"
                                                autoFocus
                                              />
                                            </div>
                                          </div>
                                          <div className="max-h-52 overflow-y-auto">
                                            {options.length === 0 ? (
                                              <div className="px-3 py-2 text-[13px] text-slate-500">No options found</div>
                                            ) : (
                                              options.map((opt: any) => {
                                                const optionValue = String(opt || "").trim();
                                                const selected = selectedValue === optionValue;
                                                return (
                                                  <button
                                                    key={optionValue}
                                                    type="button"
                                                    className={`w-full border-b border-slate-100 px-3 py-2 text-left text-[13px] ${selected ? "bg-[#eef5ff] text-[#156372]" : "text-slate-700 hover:bg-[#eef5ff]"}`}
                                                    onClick={() => {
                                                      setReportingTagSelections((prev) => {
                                                        const next = { ...prev };
                                                        if (optionValue) next[tagKey] = optionValue;
                                                        else delete next[tagKey];
                                                        return next;
                                                      });
                                                      setActiveReportingTagId(null);
                                                      setReportingTagSearch("");
                                                    }}
                                                  >
                                                    {optionValue}
                                                  </button>
                                                );
                                              })
                                            )}
                                          </div>
                                          <button
                                            type="button"
                                            className="flex w-full items-center gap-2 border-t border-slate-100 px-3 py-2 text-[13px] text-[#3b82f6] hover:bg-slate-50"
                                            onClick={() => {
                                              setReportingTagSelections((prev) => {
                                                const next = { ...prev };
                                                delete next[tagKey];
                                                return next;
                                              });
                                              setActiveReportingTagId(null);
                                              setReportingTagSearch("");
                                            }}
                                          >
                                            Clear Selection
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })
                            )}
                          </div>
                          <div className="mt-4 flex justify-end gap-2 border-t border-slate-100 pt-3">
                            <button
                              type="button"
                              onClick={() => {
                                setIsReportingTagsDropdownOpen(false);
                                setActiveReportingTagId(null);
                                setReportingTagSearch("");
                              }}
                              className="rounded bg-[#0f6c82] px-4 py-1.5 text-[13px] font-medium text-white hover:bg-[#0d5a6d]"
                            >
                              Done
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {isProductSelected && selectedPlanAddon && (
              <div className="mt-3 w-full max-w-[1060px]">
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-[13px] font-medium text-[#156372] shadow-sm hover:bg-slate-50"
                  onClick={() => {
                    closeOpenDropdowns();
                    setIsAddonRowVisible(true);
                    setAddonSearch("");
                    setIsAddonDropdownOpen(true);
                  }}
                >
                  <PlusCircle size={14} />
                  Add Addon
                </button>
              </div>
            )}

            {isProductSelected && selectedPlanAddon && isAddonRowVisible && (
              <div className={`mt-3 w-full max-w-[1060px] relative ${(isAddonDropdownOpen || isAddonTaxDropdownOpen) ? "z-[900]" : "z-20"}`}>
                <div className={`${(isAddonDropdownOpen || isAddonTaxDropdownOpen) ? "overflow-visible" : "overflow-x-auto"} border border-slate-200 bg-white`}>
                  <div ref={addonRowRef} className="relative z-[910] grid grid-cols-[2.5fr_0.72fr_0.82fr_0.9fr_0.82fr_44px] items-stretch gap-0 border-b border-slate-200 bg-white">
                    <div className="flex items-center gap-3 px-4 py-3 border-r border-slate-200">
                      <div className="flex h-7 w-7 items-center justify-center rounded-sm bg-slate-100 text-slate-400">
                        <ImageIcon size={14} />
                      </div>
                      <div className="relative flex-1">
                        <button
                          type="button"
                          onClick={() => {
                            closeOpenDropdowns();
                            setIsAddonDropdownOpen((prev) => !prev);
                          }}
                          className="w-full bg-white px-0 text-left text-[13px] text-slate-500 outline-none flex items-center justify-between"
                        >
                          <span className="truncate">{selectedAddon?.name || "Type or click to select an addon."}</span>
                          <ChevronDown size={16} className="ml-2 text-slate-500" />
                        </button>
                        {isAddonDropdownOpen && (
                          <div className="absolute left-0 right-0 top-full z-[950] mt-1 overflow-hidden rounded-md border border-slate-200 bg-white shadow-none">
                            <div className="border-b border-slate-200 p-2">
                              <div className="relative">
                                <Search size={14} className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                  type="text"
                                  className="h-8 w-full rounded border border-slate-300 bg-white pl-7 pr-2 text-[13px] text-slate-700 outline-none focus:border-slate-300"
                                  value={addonSearch}
                                  onChange={(e) => setAddonSearch(e.target.value)}
                                  placeholder="Search"
                                  autoFocus
                                />
                              </div>
                            </div>
                            <div className="max-h-60 overflow-y-auto">
                              {filteredAddonOptions.length === 0 ? (
                                <div className="px-3 py-2 text-[13px] text-slate-500">No addons found</div>
                              ) : (
                                filteredAddonOptions.map((row: PlanAddonOption) => (
                                  <button
                                    key={row.id}
                                    type="button"
                                    className={`block w-full border-b border-slate-100 px-3 py-2 text-left hover:bg-[#eef5ff] ${normalizeText(selectedAddon?.name) === normalizeText(row.name) ? "border-l-2 border-l-[#3b82f6]" : ""}`}
                                    onClick={() => handleAddonSelect(row)}
                                  >
                                    <div className={`text-[13px] font-medium ${normalizeText(selectedAddon?.name) === normalizeText(row.name) ? "text-[#1d4ed8]" : "text-slate-800"}`}>{row.name}</div>
                                    <div className="text-[12px] text-slate-500">Code: {row.code || "-"}</div>
                                  </button>
                                ))
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    <input
                      type="text"
                      className="h-full w-full border-r border-slate-200 bg-white px-4 text-[13px] text-right text-slate-700 outline-none"
                      value={addonQuantity}
                      onChange={(e) => setAddonQuantity(e.target.value)}
                    />
                    <input
                      type="text"
                      className="h-full w-full border-r border-slate-200 bg-white px-4 text-[13px] text-right text-slate-700 outline-none"
                      value={addonRate}
                      onChange={(e) => setAddonRate(e.target.value)}
                    />
                    <div className="relative border-r border-slate-200">
                      <button
                        type="button"
                        onClick={() => {
                          closeOpenDropdowns();
                          setIsAddonTaxDropdownOpen((prev) => !prev);
                        }}
                        className="w-full px-2 py-1.5 border border-gray-300 bg-white rounded outline-none text-sm text-left flex items-center justify-between hover:border-gray-400 transition-colors"
                      >
                        <span className={selectedAddonTaxLabel ? "text-gray-900" : "text-gray-500"}>
                          {selectedAddonTaxLabel || "Select a Tax"}
                        </span>
                        <ChevronDown
                          size={14}
                          className={`transition-transform ${isAddonTaxDropdownOpen ? "rotate-180" : ""}`}
                          style={{ color: "#156372" }}
                        />
                      </button>
                      {isAddonTaxDropdownOpen && (
                        <div className="absolute left-0 top-full z-[950] mt-1 w-72 rounded-xl border border-[#d6dbe8] bg-white p-1 shadow-2xl animate-in fade-in zoom-in-95 duration-100">
                          <div className="p-2">
                            <div
                              className="flex items-center gap-2 rounded-lg border bg-slate-50/50 px-3 py-1.5 transition-all focus-within:bg-white"
                              style={{ borderColor: "#156372" }}
                            >
                              <Search size={14} className="text-slate-400" />
                              <input
                                type="text"
                                className="w-full border-none bg-transparent text-[13px] text-slate-700 outline-none placeholder:text-slate-400"
                                value={addonTaxSearch}
                                onChange={(e) => setAddonTaxSearch(e.target.value)}
                                placeholder="Search..."
                                autoFocus
                              />
                            </div>
                          </div>
                          <div className="max-h-64 overflow-y-auto py-1 custom-scrollbar">
                            {filteredAddonTaxGroups.length > 0 ? (
                              filteredAddonTaxGroups.map((group) => (
                                <div key={group.label}>
                                  <div className="px-4 py-1.5 text-[10px] font-extrabold uppercase tracking-widest text-slate-700">
                                    {group.label}
                                  </div>
                                  {group.options.map((tax) => {
                                    const label = taxLabel(tax.raw ?? tax);
                                    const taxId = String(tax.id || "").trim();
                                    const selected = String(addonTax || "").trim() === taxId || String(addonTax || "").trim() === label;
                                    return (
                                      <button
                                        key={taxId}
                                        type="button"
                                        className={`w-full px-4 py-2 text-left text-[13px] ${selected
                                          ? "text-[#156372] font-medium hover:bg-gray-50 hover:text-gray-900"
                                          : "text-slate-700 hover:bg-gray-50 hover:text-gray-900"
                                          }`}
                                        onClick={() => {
                                          setAddonTax(taxId || label);
                                          setIsAddonTaxDropdownOpen(false);
                                          setAddonTaxSearch("");
                                        }}
                                      >
                                        {label}
                                      </button>
                                    );
                                  })}
                                </div>
                              ))
                            ) : (
                              <div className="px-4 py-3 text-center text-[13px] text-slate-500">No taxes found</div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="border-r border-slate-200 px-4 py-3 text-right text-[14px] font-semibold leading-none text-slate-900">
                      {addonLineAmount.toFixed(2)}
                    </div>
                    <div className="flex items-center justify-center px-2">
                      <button
                        type="button"
                        className="text-red-400 hover:text-red-500"
                        onClick={handleRemoveAddon}
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {isProductSelected && (
            <div className={`mt-8 w-full max-w-[1060px] relative ${isCouponDropdownOpen ? "z-[500]" : "z-0"}`}>
                <h3 className="mb-3 text-[14px] font-medium text-slate-700">Coupon</h3>
                <div className={`${isCouponDropdownOpen ? "overflow-visible" : "overflow-x-auto"} border border-slate-200 bg-white relative`}>
                  <table className="w-full min-w-[860px] border-collapse text-left text-[13px]">
                    <thead>
                      <tr className="border-b border-slate-200 bg-white text-[12px] font-semibold uppercase tracking-wide text-slate-800">
                        <th className="border-r border-slate-200 px-4 py-3">Coupon</th>
                        <th className="border-r border-slate-200 px-4 py-3">Coupon Code</th>
                        <th className="border-r border-slate-200 px-4 py-3 text-right">Value</th>
                        <th className="w-10 px-2 py-3"></th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="border-r border-slate-200 px-4 py-4 relative z-[510]" ref={couponDropdownRef}>
                          <div className="relative">
                            <button
                              type="button"
                              className="flex w-full items-center justify-between text-[13px] text-slate-500"
                              onClick={() => {
                                closeOpenDropdowns();
                                setIsCouponDropdownOpen((prev) => !prev);
                              }}
                            >
                              <span>{formData.coupon || "Enter at least 3 characters to search"}</span>
                              <ChevronDown size={14} className={`text-slate-400 transition-transform ${isCouponDropdownOpen ? "rotate-180" : ""}`} />
                            </button>
                            {isCouponDropdownOpen && (
                              <div className="absolute left-0 right-0 top-full z-[700] mt-1 overflow-hidden rounded-md border border-slate-200 bg-white shadow-2xl">
                                <div className="border-b border-slate-200 p-2">
                                  <div className="relative">
                                    <Search size={14} className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                      type="text"
                                      className="h-8 w-full rounded border border-slate-300 bg-white pl-7 pr-2 text-[13px] text-slate-700 outline-none focus:border-[#3b82f6]"
                                      value={couponSearch}
                                      onChange={(e) => setCouponSearch(e.target.value)}
                                      placeholder="Search"
                                      autoFocus
                                    />
                                  </div>
                                </div>
                                <div className="max-h-56 overflow-y-auto">
                                  {filteredCoupons.length === 0 ? (
                                    <div className="px-3 py-2 text-[13px] text-slate-500">No coupons found</div>
                                  ) : (
                                    filteredCoupons.map((coupon: CouponOption) => (
                                      <button
                                        key={coupon.id}
                                        type="button"
                                        onClick={() => handleCouponSelect(coupon)}
                                        className="block w-full border-b border-slate-100 px-3 py-2 text-left text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                                      >
                                        <div className="text-[13px] font-medium">{coupon.couponName}</div>
                                        <div className="text-[12px] opacity-80">[{formatCouponValue(coupon)}]</div>
                                      </button>
                                    ))
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="border-r border-slate-200 px-4 py-4 text-[13px] text-slate-700">{formData.couponCode}</td>
                        <td className="px-4 py-4 text-right text-[13px] text-slate-700">{formData.couponValue}</td>
                        <td className="px-2 py-4 text-center">
                          <button
                            type="button"
                            className="text-red-400 hover:text-red-500"
                            onClick={() => {
                              updateField("coupon", "");
                              updateField("couponCode", "");
                              updateField("couponValue", "0.00");
                              setIsCouponDropdownOpen(false);
                            }}
                          >
                            <X size={16} />
                          </button>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="mt-8 space-y-3">
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-[260px_420px]">
                <label className="text-[16px] text-slate-800">Expires After</label>
                <div className="flex">
                  <input
                    type="number"
                    min="0"
                    step="1"
                    className={`${inputClass} rounded-r-none`}
                    value={formData.expiresAfter}
                    onChange={(e) => updateField("expiresAfter", e.target.value)}
                    disabled={formData.neverExpires}
                  />
                  <span className="inline-flex items-center rounded-r-md border border-l-0 border-slate-300 bg-slate-50 px-4 text-[14px] text-slate-700">
                    cycles
                  </span>
                </div>
              </div>

              <div className="pl-0 lg:pl-[276px]">
                <label className="inline-flex items-center gap-2 text-[14px] text-slate-700">
                  <input
                    type="checkbox"
                    checked={formData.neverExpires}
                    onChange={(e) => updateField("neverExpires", e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-[#3b82f6] focus:ring-[#3b82f6]"
                  />
                  Never Expires
                </label>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-[260px_420px]">
              <label className="text-[16px] text-slate-800">Metered Billing</label>
              <label className="inline-flex items-center gap-2 text-[14px] text-slate-700">
                <input
                  type="checkbox"
                  checked={formData.meteredBilling}
                  onChange={(e) => updateField("meteredBilling", e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-[#3b82f6] focus:ring-[#3b82f6]"
                />
                Invoice customer based on their usage
              </label>
            </div>

            <div className="mt-10 grid grid-cols-1 gap-4 lg:grid-cols-[260px_420px]">
              <label className="text-[16px] text-slate-800">Customer Notes</label>
              <textarea
                className="min-h-[76px] w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-[14px] text-slate-800 outline-none transition focus:border-[#3b82f6]"
                value={formData.customerNotes}
                onChange={(e) => updateField("customerNotes", e.target.value)}
              />
            </div>
          </section>

          <section className="border-b border-slate-200 px-6 py-8">
            <div className="grid grid-cols-1 gap-8 xl:grid-cols-2">
              <div>
                <label className="mb-2 block text-[16px] text-slate-800">Terms &amp; Conditions</label>
                <textarea
                  className="min-h-[140px] w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-[14px] text-slate-800 outline-none transition focus:border-[#3b82f6]"
                  value={formData.termsAndConditions}
                  onChange={(e) => updateField("termsAndConditions", e.target.value)}
                  placeholder="Enter the terms and conditions of your business to be displayed in your transaction"
                />
              </div>

              <div className="xl:border-l xl:border-slate-200 xl:pl-6">
                <label className="mb-2 block text-[16px] text-slate-800">Attach File(s) to Quote</label>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-md border border-dashed border-slate-300 bg-white px-4 py-2 text-[14px] text-slate-700 hover:bg-slate-50"
                >
                  <Upload size={16} />
                  Upload File
                  <ChevronDown size={16} />
                </button>
                <p className="mt-2 text-[13px] text-slate-500">You can upload a maximum of 5 files, 10MB each</p>
              </div>
            </div>
          </section>

          <section className="px-6 py-8">
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-[260px_minmax(0,420px)]">
                <label className="text-[16px] text-slate-800">Payment Mode</label>
                <label className="inline-flex items-center gap-2 text-[14px] text-slate-700">
                  <input
                    type="checkbox"
                    checked={formData.collectPaymentOffline}
                    onChange={(e) => updateField("collectPaymentOffline", e.target.checked)}
                    disabled
                    className="h-4 w-4 rounded border-slate-300 text-[#3b82f6] focus:ring-[#3b82f6]"
                  />
                  Collect payment offline
                </label>
              </div>

              <p className="flex flex-wrap items-center text-[15px] text-slate-700">
                <span>Want to get paid faster?</span>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 262 162" className="h-4 w-auto ml-1">
                  <ellipse fill="#FF5F00" cx="130.4" cy="81.2" rx="30.1" ry="62.3"></ellipse>
                  <path fill="#EB001B" d="M100.3 81.2c0-25.3 11.9-47.7 30.1-62.3C117 8.4 100 2 81.6 2 37.8 2 2.4 37.4 2.4 81.2c0 43.8 35.4 79.2 79.2 79.2 18.5 0 35.4-6.4 48.8-16.9-18.5-14.6-30.1-37.2-30.1-62.3z"></path>
                  <path fill="#F79E1B" d="M179.2 2c-18.5 0-35.4 6.4-48.8 16.9 18.3 14.5 30.1 37 30.1 62.3 0 25.3-11.7 47.7-30.1 62.3 13.4 10.6 30.4 16.9 48.8 16.9 43.8 0 79.2-35.4 79.2-79.2C258.4 37.4 223 2 179.2 2z"></path>
                </svg>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 620.07" className="h-3 w-auto ml-1">
                  <path d="M728.98 10.95L477.61 610.69h-164l-123.7-478.62c-7.51-29.48-14.04-40.28-36.88-52.7C115.76 59.14 54.18 40.17 0 28.39l3.68-17.44h263.99c33.65 0 63.9 22.4 71.54 61.15l65.33 347.04L566 10.95h162.98zm642.59 403.93c.66-158.29-218.88-167.01-217.37-237.72.47-21.52 20.96-44.4 65.81-50.24 22.23-2.91 83.48-5.13 152.95 26.84l27.25-127.18c-37.33-13.55-85.36-26.59-145.12-26.59-153.35 0-261.27 81.52-262.18 198.25-.99 86.34 77.03 134.52 135.81 163.21 60.47 29.38 80.76 48.26 80.53 74.54-.43 40.23-48.23 57.99-92.9 58.69-77.98 1.2-123.23-21.1-159.3-37.87L928.93 588.2c36.25 16.63 103.16 31.14 172.53 31.87 162.99 0 269.61-80.51 270.11-205.19m404.94 195.82H1920L1794.75 10.95h-132.44c-29.78 0-54.9 17.34-66.02 44l-232.81 555.74h162.91l32.35-89.59h199.05l18.73 89.59zM1603.4 398.19l81.66-225.18 47 225.18h-128.65zM950.66 10.95L822.37 610.69H667.23L795.57 10.95h155.09z" fill="#1434cb"></path>
                </svg>
              </p>
              <p className="text-[14px] text-slate-500">
                Configure payment gateways and receive payments online.{" "}
                <button type="button" className="text-[#3b82f6] hover:underline">
                  Set up Payment Gateway
                </button>
              </p>
            </div>

            <p className="mt-8 text-[14px] text-slate-500">
              <span className="font-semibold text-slate-700">Additional Fields:</span>{" "}
              Start adding custom fields for your quotes by going to{" "}
              <span className="italic">Settings</span> {"\u2794"}{" "}
              <span className="italic">Sales</span> {"\u2794"}{" "}
              <span className="italic">Quotes</span>.
            </p>
          </section>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsSummaryModalOpen(true)}
            className={`rounded-md px-6 py-2 text-[14px] font-medium text-white hover:bg-[${primaryActionHover}]`}
            style={{ backgroundColor: primaryActionBg }}
          >
            Continue
          </button>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="rounded-md border border-slate-300 bg-white px-5 py-2 text-[14px] text-slate-800 hover:bg-slate-100"
          >
            Cancel
          </button>
        </div>
      <div className="text-[14px] text-slate-700">
          PDF Template: <span className="text-slate-500">'Standard Template'</span>{" "}
          <button type="button" className="text-[#3b82f6] hover:underline">
            Change
          </button>
        </div>
      </div>

      {isQuoteNumberModalOpen && (
        <div
          className="fixed inset-0 z-[12100] flex items-start justify-center bg-black/50 pt-16"
          onClick={() => setIsQuoteNumberModalOpen(false)}
        >
          <div
            className="mx-4 w-full max-w-[520px] rounded-lg bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <h2 className="text-[18px] leading-none font-medium text-slate-800">Configure Quote Number Preferences</h2>
              <button
                type="button"
                onClick={() => setIsQuoteNumberModalOpen(false)}
                className="flex h-7 w-7 items-center justify-center rounded-md border border-[#2f80ed] text-red-500 hover:bg-blue-50"
              >
                <X size={16} />
              </button>
            </div>

            <div className="px-4 py-4">
              <div className="grid grid-cols-[1fr_1fr] gap-x-5 gap-y-1 border-b border-slate-200 pb-4">
                <div>
                  <p className="mb-2 text-[13px] font-semibold leading-none text-slate-800">Location</p>
                  <p className="text-[14px] leading-none text-slate-700">{formData.location || "Head Office"}</p>
                </div>
                <div>
                  <p className="mb-2 text-[13px] font-semibold leading-none text-slate-800">Associated Series</p>
                  <p className="text-[14px] leading-none text-slate-700">Default Transaction Series</p>
                </div>
              </div>

              <div className="pt-4">
                {quoteNumberMode === "auto" ? (
                  <p className="mb-3 max-w-[96%] text-[12px] leading-[1.45] text-slate-700">
                    Your quote numbers are set on auto-generate mode to save your time. Are you sure about changing this setting?
                  </p>
                ) : (
                  <p className="mb-3 max-w-[96%] text-[12px] leading-[1.45] text-slate-700">
                    You have selected manual quote numbering. Do you want us to auto-generate it for you?
                  </p>
                )}

                <div className="space-y-4">
                  <label className="flex cursor-pointer items-start gap-3">
                    <div className="pt-1">
                      <input
                        type="radio"
                        name="subscriptionQuoteNumberMode"
                        value="auto"
                        checked={quoteNumberMode === "auto"}
                        onChange={() => setQuoteNumberMode("auto")}
                        className="h-4 w-4 cursor-pointer border-slate-300 text-[#2f80ed] focus:ring-[#2f80ed]"
                      />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-semibold leading-none text-slate-800">Continue auto-generating quote numbers</span>
                        <Info size={11} className="text-slate-400" />
                      </div>
                      {quoteNumberMode === "auto" && (
                        <div className="mt-3 pl-4">
                          <div className="grid grid-cols-[95px_1fr] gap-3">
                            <div>
                              <label className="mb-1 block text-[11px] text-slate-700">Prefix</label>
                              <input
                                type="text"
                                value={quotePrefix}
                                onChange={(e) => {
                                  const nextPrefix = sanitizeQuotePrefix(e.target.value);
                                  setQuotePrefix(nextPrefix);
                                  setFormData((prev) => ({
                                    ...prev,
                                    quoteNumber: buildQuoteNumber(nextPrefix, quoteNextNumber),
                                  }));
                                }}
                                className="h-8 w-full rounded-md border border-slate-300 px-2.5 text-[12px] text-slate-700 focus:border-[#156372] focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="mb-1 block text-[11px] text-slate-700">Next Number</label>
                              <input
                                type="text"
                                value={quoteNextNumber}
                                onChange={(e) => {
                                  const nextDigits = extractQuoteDigits(e.target.value) || "";
                                  setQuoteNextNumber(nextDigits);
                                  setFormData((prev) => ({
                                    ...prev,
                                    quoteNumber: buildQuoteNumber(quotePrefix, nextDigits),
                                  }));
                                }}
                                className="h-8 w-full rounded-md border border-slate-300 px-2.5 text-[12px] text-slate-700 focus:border-[#156372] focus:outline-none"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </label>

                  <label className="flex cursor-pointer items-start gap-3">
                    <div className="pt-1">
                      <input
                        type="radio"
                        name="subscriptionQuoteNumberMode"
                        value="manual"
                        checked={quoteNumberMode === "manual"}
                        onChange={() => setQuoteNumberMode("manual")}
                        className="h-4 w-4 cursor-pointer border-slate-300 text-[#2f80ed] focus:ring-[#2f80ed]"
                      />
                    </div>
                    <div className="flex-1">
                      <span className="text-[13px] leading-none text-slate-700">Enter quote numbers manually</span>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 border-t border-slate-200 px-4 py-4">
              <button
                type="button"
                onClick={() => {
                  if (quoteNumberMode === "auto") {
                    setFormData((prev) => ({
                      ...prev,
                      quoteNumber: buildQuoteNumber(quotePrefix, quoteNextNumber),
                    }));
                  }
                  setIsQuoteNumberModalOpen(false);
                }}
                className="h-8 rounded-md bg-[#22b573] px-4 text-[12px] font-semibold text-white hover:bg-[#1ea465]"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => setIsQuoteNumberModalOpen(false)}
                className="h-8 rounded-md border border-slate-300 bg-white px-4 text-[12px] font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {isAddressModalOpen && (
        <div className="fixed inset-0 z-[12000] flex items-center justify-center bg-black/45 p-4" onClick={() => !isAddressSaving && setIsAddressModalOpen(false)}>
          <div className="w-full max-w-[620px] overflow-hidden rounded-lg bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <h3 className="text-[36px] leading-none font-medium text-slate-800">
                {addressModalType === "billing" ? "Billing Address" : "Shipping Address"}
              </h3>
              <button
                type="button"
                className="flex h-7 w-7 items-center justify-center rounded-md border border-[#2f80ed] text-red-500 hover:bg-blue-50"
                onClick={() => setIsAddressModalOpen(false)}
                disabled={isAddressSaving}
              >
                <X size={16} />
              </button>
            </div>

            <div className="max-h-[70vh] space-y-4 overflow-y-auto px-5 py-4">
              <div>
                <label className="mb-1 block text-sm text-slate-700">Attention</label>
                <input
                  className="h-10 w-full rounded border border-slate-300 px-3 text-sm text-slate-700 outline-none focus:border-[#156372]"
                  name="attention"
                  value={addressFormData.attention}
                  onChange={handleAddressFieldChange}
                  autoFocus
                />
              </div>

              <div>
                <label className="mb-1 block text-sm text-slate-700">Country/Region</label>
                <input
                  className="h-10 w-full rounded border border-slate-300 px-3 text-sm text-slate-700 outline-none focus:border-[#156372]"
                  name="country"
                  value={addressFormData.country}
                  onChange={handleAddressFieldChange}
                  placeholder="Select or type to add"
                  list="subscription-country-list"
                />
                <datalist id="subscription-country-list">
                  {countryOptions.map((country: any) => (
                    <option key={country.isoCode} value={country.name} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="mb-1 block text-sm text-slate-700">Address</label>
                <textarea
                  className="min-h-[54px] w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-700 outline-none focus:border-[#156372]"
                  name="street1"
                  value={addressFormData.street1}
                  onChange={handleAddressFieldChange}
                  placeholder="Street 1"
                />
                <textarea
                  className="mt-2 min-h-[54px] w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-700 outline-none focus:border-[#156372]"
                  name="street2"
                  value={addressFormData.street2}
                  onChange={handleAddressFieldChange}
                  placeholder="Street 2"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm text-slate-700">City</label>
                <input
                  className="h-10 w-full rounded border border-slate-300 px-3 text-sm text-slate-700 outline-none focus:border-[#156372]"
                  name="city"
                  value={addressFormData.city}
                  onChange={handleAddressFieldChange}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm text-slate-700">State</label>
                  <input
                    className="h-10 w-full rounded border border-slate-300 px-3 text-sm text-slate-700 outline-none focus:border-[#156372]"
                    name="state"
                    value={addressFormData.state}
                    onChange={handleAddressFieldChange}
                    placeholder="Select or type to add"
                    list="subscription-state-list"
                  />
                  <datalist id="subscription-state-list">
                    {stateOptions.map((state: any) => (
                      <option key={state.isoCode} value={state.name} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <label className="mb-1 block text-sm text-slate-700">ZIP Code</label>
                  <input
                    className="h-10 w-full rounded border border-slate-300 px-3 text-sm text-slate-700 outline-none focus:border-[#156372]"
                    name="zipCode"
                    value={addressFormData.zipCode}
                    onChange={handleAddressFieldChange}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm text-slate-700">Phone</label>
                  <div className="grid grid-cols-[88px_1fr] gap-0">
                    <div className="relative" ref={phoneCodeDropdownRef}>
                      <button
                        type="button"
                        className="flex h-10 w-full items-center justify-between rounded-l border border-slate-300 bg-white px-2 text-sm text-slate-700 outline-none focus:border-[#156372]"
                        onClick={() => {
                          setIsPhoneCodeDropdownOpen((prev) => !prev);
                          setPhoneCodeSearch("");
                        }}
                      >
                        <span>{addressFormData.phoneCountryCode || "+"}</span>
                        {isPhoneCodeDropdownOpen ? (
                          <ChevronUp size={14} className="text-slate-400" />
                        ) : (
                          <ChevronDown size={14} className="text-slate-400" />
                        )}
                      </button>

                      {isPhoneCodeDropdownOpen && (
                        <div className="absolute left-0 top-full z-[13000] mt-1 w-[320px] overflow-hidden rounded-md border border-slate-200 bg-white shadow-xl">
                          <div className="border-b border-slate-100 p-2">
                            <div className="relative">
                              <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                              <input
                                type="text"
                                value={phoneCodeSearch}
                                onChange={(e) => setPhoneCodeSearch(e.target.value)}
                                placeholder="Search"
                                className="h-9 w-full rounded border border-slate-300 pl-7 pr-2 text-sm text-slate-700 outline-none focus:border-[#156372]"
                                autoFocus
                              />
                            </div>
                          </div>
                          <div className="max-h-64 overflow-y-auto">
                            {filteredPhoneCountryOptions.length === 0 ? (
                              <div className="px-3 py-2 text-sm text-slate-500">No matching country code</div>
                            ) : (
                              filteredPhoneCountryOptions.map((country: any) => (
                                <button
                                  key={`${country.isoCode}-${country.phoneCode}`}
                                  type="button"
                                  className={`w-full px-3 py-2 text-left text-sm hover:bg-[#3b82f6] hover:text-white ${
                                    addressFormData.phoneCountryCode === country.phoneCode ? "bg-[#3b82f6] text-white" : "text-slate-700"
                                  }`}
                                  onClick={() => {
                                    setAddressFormData((prev: any) => ({ ...prev, phoneCountryCode: country.phoneCode }));
                                    setIsPhoneCodeDropdownOpen(false);
                                  }}
                                >
                                  <span className="inline-block w-14">{country.phoneCode}</span>
                                  <span>{country.name}</span>
                                </button>
                              ))
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    <input
                      className="h-10 rounded-r border border-l-0 border-slate-300 px-3 text-sm text-slate-700 outline-none focus:border-[#156372]"
                      name="phone"
                      value={addressFormData.phone}
                      onChange={handleAddressFieldChange}
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-sm text-slate-700">Fax Number</label>
                  <input
                    className="h-10 w-full rounded border border-slate-300 px-3 text-sm text-slate-700 outline-none focus:border-[#156372]"
                    name="fax"
                    value={addressFormData.fax}
                    onChange={handleAddressFieldChange}
                  />
                </div>
              </div>

              <p className="text-[13px] text-slate-500">
                <span className="font-semibold text-slate-600">Note:</span> Changes made here will be updated for this customer.
              </p>
            </div>

            <div className="flex items-center gap-3 border-t border-slate-200 px-5 py-4">
              <button
                type="button"
                className="rounded bg-[#22c55e] px-5 py-2 text-[14px] font-medium text-white hover:bg-[#16a34a] disabled:cursor-not-allowed disabled:opacity-60"
                onClick={handleSaveAddress}
                disabled={isAddressSaving}
              >
                {isAddressSaving ? "Saving..." : "Save"}
              </button>
              <button
                type="button"
                className="rounded border border-slate-300 bg-white px-5 py-2 text-[14px] text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                onClick={() => setIsAddressModalOpen(false)}
                disabled={isAddressSaving}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {isManageSalespersonsOpen && createPortal(
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center pt-4 z-[10000]">
          <div
            className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="text-[18px] leading-none font-semibold text-gray-900">Manage Salespersons</h3>
              <button
                type="button"
                onClick={() => {
                  handleCancelNewSalesperson();
                  setSelectedSalespersonIds([]);
                  setManageSalespersonMenuOpen(null);
                  setIsManageSalespersonsOpen(false);
                }}
                className="flex h-8 w-8 items-center justify-center rounded-md text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-colors"
                aria-label="Close manage salespersons"
              >
                <X size={20} />
              </button>
            </div>

            {selectedSalespersonIds.length > 0 ? (
              <div className="p-6 border-b border-gray-200 flex items-center justify-between bg-gray-50">
                <div className="flex items-center gap-2">
                  <button className="px-3 py-1.5 bg-white border border-gray-300 rounded text-sm text-gray-700 hover:bg-gray-50 shadow-sm">
                    Merge
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      const rect = e.currentTarget.getBoundingClientRect();
                      setMenuPosition({ top: rect.bottom, left: rect.left });
                      setManageSalespersonMenuOpen("BULK_ACTIONS");
                    }}
                    className="px-3 py-1.5 bg-white border border-gray-300 rounded text-sm text-gray-700 hover:bg-gray-50 shadow-sm flex items-center gap-2"
                  >
                    More Actions
                    <ChevronDown size={14} />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedSalespersonIds([])}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={20} />
                </button>
              </div>
            ) : (
              <div className="p-6 border-b border-gray-200 flex items-center gap-3">
                <div className="flex-1 relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search Salesperson"
                    value={manageSalespersonSearch}
                    onChange={(e) => {
                      setManageSalespersonSearch(e.target.value);
                      setManageSalespersonsPage(1);
                    }}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#156372]"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    handleStartNewSalesperson();
                    setManageSalespersonSearch("");
                    setManageSalespersonsPage(1);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-[#156372] text-white rounded-md"
                >
                  <PlusCircle size={16} />
                  New Salesperson
                </button>
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-6">
              {isNewSalespersonFormOpen ? (
                <div className="mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
                  <h3 className="text-sm font-semibold text-gray-900 mb-4">
                    {editingSalespersonId ? "Edit Salesperson" : "Add New Salesperson"}
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                      <input
                        type="text"
                        name="name"
                        value={newSalespersonData.name}
                        onChange={handleNewSalespersonChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#156372]"
                        placeholder="Enter name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                      <input
                        type="email"
                        name="email"
                        value={newSalespersonData.email}
                        onChange={handleNewSalespersonChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#156372]"
                        placeholder="Enter email"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleSaveNewSalesperson}
                        className="flex-1 px-4 py-2 bg-[#156372] text-white rounded-md"
                      >
                        {editingSalespersonId ? "Save Changes" : "Add"}
                      </button>
                      <button
                        onClick={handleCancelNewSalesperson}
                        className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-md"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}

              <table className="w-full">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                      <input
                        type="checkbox"
                        className="rounded border-gray-300 text-[#156372] focus:ring-[#156372]"
                        checked={
                          paginatedManageSalespersons.length > 0 &&
                          paginatedManageSalespersons.every((sp: any) =>
                            selectedSalespersonIds.includes(String(sp.id || sp._id || ""))
                          )
                        }
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedSalespersonIds(paginatedManageSalespersons.map((s: any) => String(s.id || s._id || "")));
                          } else {
                            setSelectedSalespersonIds(
                              selectedSalespersonIds.filter(
                                (id) => !paginatedManageSalespersons.some((sp: any) => String(sp.id || sp._id || "") === String(id))
                              )
                            );
                          }
                        }}
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">SALESPERSON NAME</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">EMAIL</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedManageSalespersons.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                        {manageSalespersonSearch ? "No salespersons found" : "No salespersons available"}
                      </td>
                    </tr>
                  ) : (
                    paginatedManageSalespersons.map((salesperson: any) => {
                      const salespersonId = String(salesperson.id || salesperson._id || "");
                      const isInactive = String(salesperson.status || "").toLowerCase() === "inactive";
                      return (
                        <tr key={salespersonId} className="group hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <div className="flex items-center">
                              <input
                                type="checkbox"
                                className="rounded border-gray-300 text-[#156372] focus:ring-[#156372]"
                                checked={selectedSalespersonIds.includes(salespersonId)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedSalespersonIds([...selectedSalespersonIds, salespersonId]);
                                  } else {
                                    setSelectedSalespersonIds(selectedSalespersonIds.filter((id) => id !== salespersonId));
                                  }
                                }}
                              />
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {salesperson.name || salesperson.displayName || "Unnamed Salesperson"}
                            {isInactive && (
                              <span className="ml-2 inline-flex items-center rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-800">
                                Inactive
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">{salesperson.email || ""}</td>
                          <td className="px-4 py-3 text-right">
                            <div className="hidden group-hover:flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleStartEditSalesperson(salesperson);
                                }}
                                className="p-1 text-gray-500 hover:text-[#156372] hover:bg-gray-100 rounded"
                                title="Edit"
                              >
                                <Edit2 size={16} />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const rect = e.currentTarget.getBoundingClientRect();
                                  setMenuPosition({ top: rect.bottom, left: rect.right });
                                  setManageSalespersonMenuOpen(manageSalespersonMenuOpen === salespersonId ? null : salespersonId);
                                }}
                                className={`p-1 text-gray-500 hover:text-[#156372] hover:bg-gray-100 rounded ${manageSalespersonMenuOpen === salespersonId ? "bg-gray-100 text-[#156372]" : ""}`}
                              >
                                <MoreVertical size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>

              {manageSalespersonsTotalPages > 1 && (
                <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
                  <div>
                    Page {manageSalespersonsCurrentPage} of {manageSalespersonsTotalPages}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="rounded border border-gray-300 bg-white px-3 py-1.5 disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={manageSalespersonsCurrentPage <= 1}
                      onClick={() => setManageSalespersonsPage((prev) => Math.max(1, prev - 1))}
                    >
                      Prev
                    </button>
                    <button
                      type="button"
                      className="rounded border border-gray-300 bg-white px-3 py-1.5 disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={manageSalespersonsCurrentPage >= manageSalespersonsTotalPages}
                      onClick={() => setManageSalespersonsPage((prev) => Math.min(manageSalespersonsTotalPages, prev + 1))}
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {manageSalespersonMenuOpen && menuPosition && createPortal(
        <>
          <div
            className="fixed inset-0 z-[10001]"
            onClick={() => setManageSalespersonMenuOpen(null)}
          />
          <div
            className="fixed z-[10002] w-48 rounded-md border border-slate-200 bg-white py-1 shadow-lg"
            style={{
              top: menuPosition.top,
              left: manageSalespersonMenuOpen === "BULK_ACTIONS" ? menuPosition.left : menuPosition.left - 192,
            }}
          >
            {manageSalespersonMenuOpen === "BULK_ACTIONS" ? (
              <>
                <button
                  type="button"
                  className="w-full px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                  onClick={() => handleBulkSalespersonStatusChange("active")}
                >
                  Mark as Active
                </button>
                <button
                  type="button"
                  className="w-full px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                  onClick={() => handleBulkSalespersonStatusChange("inactive")}
                >
                  Mark as Inactive
                </button>
                <button
                  type="button"
                  className="w-full px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                  onClick={() => handleBulkDeleteSalespersons()}
                >
                  Delete
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  className="w-full px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50"
                  onClick={() => {
                    const salesperson = salespersons.find((sp: any) => String(sp.id || sp._id || "") === manageSalespersonMenuOpen);
                    if (salesperson) handleStartEditSalesperson(salesperson);
                    setManageSalespersonMenuOpen(null);
                  }}
                >
                  Edit
                </button>
                <button
                  type="button"
                  className="w-full px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                  onClick={() => {
                    const salesperson = salespersons.find((sp: any) => String(sp.id || sp._id || "") === manageSalespersonMenuOpen);
                    if (salesperson) {
                      const nextStatus = String(salesperson?.status || "").toLowerCase() === "inactive" ? "active" : "inactive";
                      void handleSetSalespersonStatus(manageSalespersonMenuOpen, nextStatus);
                    }
                  }}
                >
                  {salespersons.find((sp: any) => String(sp.id || sp._id || "") === manageSalespersonMenuOpen && String(sp?.status || "").toLowerCase() === "inactive") ? "Mark as Active" : "Mark as Inactive"}
                </button>
                <button
                  type="button"
                  className="w-full px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50"
                  onClick={() => {
                    void handleDeleteSalesperson(manageSalespersonMenuOpen);
                    setManageSalespersonMenuOpen(null);
                  }}
                >
                  Delete
                </button>
              </>
            )}
          </div>
        </>,
        document.body
      )}

      {isSummaryModalOpen && !isSendApprovalModalOpen && (
        <div className="fixed inset-0 z-[11000] flex items-start justify-center bg-black/40 px-4 pt-6 pb-4" onClick={() => setIsSummaryModalOpen(false)}>
          <div className="w-full max-w-[720px] rounded-lg bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <h3 className="text-[14px] font-medium text-slate-900">Quote Summary</h3>
              <button type="button" className="text-red-500 hover:text-red-600" onClick={() => setIsSummaryModalOpen(false)}>
                <X size={16} />
              </button>
            </div>

            <div className="space-y-4 p-4">
              <div className="rounded border border-slate-200 p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[16px] font-medium text-[#f97316]">Immediate Charges</p>
                    <p className="text-[13px] text-slate-600">On {displaySummaryDate(quoteDateForSummary)}</p>
                    <button
                      type="button"
                      className="mt-1 text-[13px] text-[#2563eb] hover:underline"
                      onClick={() => setShowImmediateBreakdown((prev) => !prev)}
                    >
                      {showImmediateBreakdown ? "Hide Breakdown" : "Show Breakdown"} <ChevronDown size={12} className="inline-block" />
                    </button>
                  </div>
                  <div className="text-right">
                    <p className="text-[30px] font-semibold text-slate-800">{formatCurrency(immediateTotal)}</p>
                    <p className="text-[12px] italic text-slate-500">Monthly Amount</p>
                  </div>
                </div>

                {showImmediateBreakdown && (
                  <div className="mt-3 border-t border-slate-200 pt-3 text-[13px] text-slate-700">
                    {summaryLineItems.length === 0 ? (
                      <div className="text-slate-500">No items selected.</div>
                    ) : (
                      summaryLineItems.map((item, index) => (
                        <div key={`${item.name}-${index}`} className="mb-3">
                          <div className="flex items-center justify-between">
                            <span>{item.name}</span>
                            <span className="flex items-center gap-1">
                              {formatCurrency(item.amount)}
                              <ChevronDown size={12} className="text-[#2563eb]" />
                            </span>
                          </div>
                          <div className="mt-1 text-[12px] italic text-slate-500">
                            Actual Cost: {formatCurrency(item.rate)}/Unit
                          </div>
                        </div>
                      ))
                    )}
                    <div className="mt-3 flex items-center justify-between border-t border-slate-200 pt-3">
                      <span className="font-medium">Sub Total</span>
                      <span className="font-medium">{formatCurrency(summarySubtotal)}</span>
                    </div>
                    <div className="mt-3 flex items-center justify-between border-t border-slate-200 pt-3">
                      <span className="font-medium">Total Immediate Charges</span>
                      <span className="font-medium">{formatCurrency(immediateTotal)}</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="rounded border border-slate-200 p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[16px] font-medium text-[#2563eb]">Recurring Charges</p>
                    <p className="text-[13px] text-slate-600">Billed per month, starting from {displaySummaryDate(immediateRangeEnd)}</p>
                    <button
                      type="button"
                      className="mt-1 inline-flex items-center gap-1 rounded px-0 py-0 text-left text-[13px] text-[#2563eb] hover:underline focus:outline-none"
                      onClick={() => setShowRecurringBreakdown((prev) => !prev)}
                    >
                      {showRecurringBreakdown ? "Hide Breakdown" : "Show Breakdown"} <ChevronDown size={12} className="inline-block" />
                    </button>
                  </div>
                  <p className="text-[30px] font-semibold text-slate-800">{formatCurrency(recurringTotal)}</p>
                </div>

                {showRecurringBreakdown && (
                  <div className="mt-3 space-y-1 border-t border-slate-200 pt-3 text-[13px] text-slate-700">
                    {summaryLineItems.length === 0 ? (
                      <div className="text-slate-500">No items selected.</div>
                    ) : (
                      summaryLineItems.map((item, index) => (
                        <div key={`${item.name}-${index}`} className="flex items-center justify-between">
                          <span>{item.name}</span>
                          <span>{formatCurrency(item.amount)}</span>
                        </div>
                      ))
                    )}
                    <div className="mt-3 flex items-center justify-between border-t border-slate-200 pt-3">
                      <span className="font-medium">Sub Total</span>
                      <span className="font-medium">{formatCurrency(summarySubtotal)}</span>
                    </div>
                    <div className="mt-3 flex items-center justify-between border-t border-slate-200 pt-3 text-slate-500">
                      <span>Round Off</span>
                      <span>{formatCurrency(0)}</span>
                    </div>
                    <div className="mt-3 flex items-center justify-between border-t border-slate-200 pt-3 font-medium text-slate-900">
                      <span>Total Recurring Charges</span>
                      <span>{formatCurrency(recurringTotal)}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 border-t border-slate-200 px-4 py-3">
              <button
                type="button"
                disabled={saveLoading !== null}
                onClick={handleSaveAsDraft}
                className={`rounded px-4 py-2 text-[12px] font-medium text-white hover:bg-[${primaryActionHover}] disabled:cursor-not-allowed disabled:opacity-60`}
                style={{ backgroundColor: primaryActionBg }}
              >
                Save as Draft
              </button>
              <button
                type="button"
                disabled={saveLoading !== null}
                onClick={() => {
                  setIsSummaryModalOpen(false);
                  setIsSendApprovalModalOpen(true);
                }}
                className={`rounded px-4 py-2 text-[12px] font-medium text-white hover:bg-[${primaryActionHover}] disabled:cursor-not-allowed disabled:opacity-60`}
                style={{ backgroundColor: primaryActionBg }}
              >
                Save and Send
              </button>
              <button
                type="button"
                className="rounded border border-slate-300 bg-white px-4 py-2 text-[12px] text-slate-700 hover:bg-slate-50"
                onClick={() => setIsSummaryModalOpen(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {isSendApprovalModalOpen && (
        <div className="fixed inset-0 z-[12000] flex items-start justify-center bg-black/55 px-4 pt-20" onClick={() => setIsSendApprovalModalOpen(false)}>
          <div className="w-[520px] max-w-[92vw] rounded-lg bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-6">
              <div className="flex items-center gap-3">
                <AlertTriangle size={18} className="text-amber-500" />
                <p className="text-[14px] text-slate-700">Quote will be automatically approved once you send it.</p>
              </div>
            </div>
            <div className="flex items-center gap-2 border-t border-slate-200 px-5 py-3">
            <button
              type="button"
              disabled={saveLoading !== null}
              onClick={handleSaveAndSend}
              className={`rounded px-4 py-1.5 text-[12px] font-medium text-white hover:bg-[${primaryActionHover}] disabled:cursor-not-allowed disabled:opacity-60`}
              style={{ backgroundColor: primaryActionBg }}
            >
              OK
            </button>
              <button
                type="button"
                disabled={saveLoading !== null}
                onClick={() => setIsSendApprovalModalOpen(false)}
                className="rounded border border-slate-300 bg-white px-4 py-1.5 text-[12px] text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {priceListSwitchDialog && (
        <div className="fixed inset-0 z-[12100] flex items-start justify-center bg-black/35 px-4 pt-16" onClick={() => setPriceListSwitchDialog(null)}>
          <div className="w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start gap-4 border-b border-slate-200 px-5 py-6">
              <div className="mt-0.5 rounded-full bg-amber-100 p-2 text-amber-600">
                <AlertTriangle size={20} />
              </div>
              <div className="flex-1 pr-6">
                <p className="text-base font-semibold text-slate-900">
                  {priceListSwitchDialog.nextPriceListName
                    ? "You have selected a customer with a different price list."
                    : "You have selected a customer without a price list."}
                </p>
                <p className="mt-2 text-sm leading-7 text-slate-700">
                  {priceListSwitchDialog.nextPriceListName
                    ? `${priceListSwitchDialog.customerName} uses "${priceListSwitchDialog.nextPriceListName}". You can apply this new price list to update the selected plan or add-on rate, or keep the existing price list "${priceListSwitchDialog.currentPriceListName}".`
                    : `${priceListSwitchDialog.customerName} does not have a saved price list. You can clear the current subscription quote price list "${priceListSwitchDialog.currentPriceListName}" and use the standard plan or add-on rate, or keep the existing price list.`}
                </p>
              </div>
              <button
                type="button"
                className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                onClick={() => setPriceListSwitchDialog(null)}
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-3 px-5 py-5">
              <button
                type="button"
                className="rounded-md bg-[#156372] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#0f4f5b]"
                onClick={() => applyResolvedPriceListChoice(priceListSwitchDialog.nextPriceListName)}
              >
                {priceListSwitchDialog.nextPriceListName ? "Apply New Price List" : "Clear Price List"}
              </button>
              <button
                type="button"
                className="rounded-md border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                onClick={() => setPriceListSwitchDialog(null)}
              >
                Keep Existing Price List
              </button>
            </div>
          </div>
        </div>
      )}

      {isNewTaxModalOpen && (
        <div
          className="fixed inset-0 z-[12500] flex items-start justify-center bg-black/45 px-4 pt-16"
          onClick={() => !isNewTaxSaving && setIsNewTaxModalOpen(false)}
        >
          <div className="w-full max-w-[640px] overflow-hidden rounded-lg bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <h3 className="text-[16px] leading-none font-medium text-slate-700">New Tax</h3>
              <button
                type="button"
                onClick={() => setIsNewTaxModalOpen(false)}
                className="flex h-7 w-7 items-center justify-center rounded-md border border-[#2f80ed] text-red-500 hover:bg-blue-50"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-4 px-5 py-5">
              <div className="grid grid-cols-1 items-center gap-3 md:grid-cols-[190px_1fr]">
                <label className="text-[16px] leading-none font-normal text-red-600">Tax Name*</label>
                <input
                  type="text"
                  value={newTaxForm.name}
                  onChange={(e) => setNewTaxForm((prev) => ({ ...prev, name: e.target.value }))}
                  className="h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-[13px] text-slate-800 outline-none focus:border-[#3b82f6]"
                />
              </div>

              <div className="grid grid-cols-1 items-center gap-3 md:grid-cols-[190px_1fr]">
                <label className="text-[16px] leading-none font-normal text-red-600">Rate (%)*</label>
                <div className="flex">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={newTaxForm.rate}
                    onChange={(e) => setNewTaxForm((prev) => ({ ...prev, rate: e.target.value }))}
                    className="h-11 w-full rounded-l-md border border-slate-300 bg-white px-3 text-[13px] text-slate-800 outline-none focus:border-[#3b82f6]"
                  />
                  <span className="inline-flex items-center rounded-r-md border border-l-0 border-slate-300 bg-slate-50 px-3 text-[13px] text-slate-700">%</span>
                </div>
              </div>

              <div className="md:pl-[190px]">
                <label className="inline-flex items-center gap-2 text-[13px] text-slate-700">
                  <input
                    type="checkbox"
                    checked={newTaxForm.isCompound}
                    onChange={(e) => setNewTaxForm((prev) => ({ ...prev, isCompound: e.target.checked }))}
                    className="h-4 w-4 rounded border-slate-300 text-[#3b82f6] focus:ring-[#3b82f6]"
                  />
                  This tax is a compound tax.
                  <Info size={14} className="text-slate-400" />
                </label>
              </div>

              {newTaxError && <p className="text-[14px] text-red-500">{newTaxError}</p>}
            </div>

            <div className="flex items-center gap-2 border-t border-slate-200 px-5 py-4">
              <button
                type="button"
                onClick={handleSaveNewTax}
                disabled={isNewTaxSaving}
                className="rounded bg-[#22c55e] px-5 py-2 text-[14px] font-medium text-white hover:bg-[#16a34a] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isNewTaxSaving ? "Saving..." : "Save"}
              </button>
              <button
                type="button"
                onClick={() => setIsNewTaxModalOpen(false)}
                disabled={isNewTaxSaving}
                className="rounded border border-slate-300 bg-white px-5 py-2 text-[14px] text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
