import React, { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Calculator, CalendarDays, ChevronDown, ChevronRight, ChevronUp, Image as ImageIcon, Info, MoreVertical, PlusCircle, Search, Settings, ShoppingBag, Tag, Upload, X } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { Customer, Salesperson, getCustomers, getPlansFromAPI, getQuotes, getSalespersonsFromAPI, getTaxesFromAPI, saveQuote, saveSalesperson, saveTax } from "../../salesModel";
import { customersAPI, quotesAPI, reportingTagsAPI } from "../../../../services/api";
import { createTaxLocal, readTaxesLocal } from "../../../settings/organization-settings/taxes-compliance/TAX/storage";
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
  wsq: string;
  meteredBilling: boolean;
};

type ProductOption = {
  id: string;
  name: string;
  code?: string;
  status?: string;
  active?: boolean;
};

type PlanAddonOption = {
  id: string;
  name: string;
  code: string;
  type: "plan" | "addon";
  productId?: string;
  productName: string;
  rate: number;
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

const inputClass =
  "h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-[13px] text-slate-800 outline-none transition focus:border-[#3b82f6]";
const requiredLabelClass = "text-[16px] font-normal text-red-600";

export default function SubscriptionQuote() {
  const navigate = useNavigate();
  const location = useLocation();
  const customerDropdownRef = useRef<HTMLDivElement | null>(null);
  const salespersonDropdownRef = useRef<HTMLDivElement | null>(null);
  const productDropdownRef = useRef<HTMLDivElement | null>(null);
  const planAddonDropdownRef = useRef<HTMLDivElement | null>(null);
  const quoteDateNativeRef = useRef<HTMLInputElement | null>(null);
  const expiryDateNativeRef = useRef<HTMLInputElement | null>(null);
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
    taxPreference: "Tax Exclusive",
    priceList: "Select Price List",
    coupon: "",
    couponCode: "",
    couponValue: "0.00",
    wsq: "None",
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
  const [isProductDropdownOpen, setIsProductDropdownOpen] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const [isPlanAddonDropdownOpen, setIsPlanAddonDropdownOpen] = useState(false);
  const [planAddonSearch, setPlanAddonSearch] = useState("");
  const [isManageSalespersonsOpen, setIsManageSalespersonsOpen] = useState(false);
  const [manageSalespersonSearch, setManageSalespersonSearch] = useState("");
  const [isNewSalespersonFormOpen, setIsNewSalespersonFormOpen] = useState(false);
  const [newSalespersonData, setNewSalespersonData] = useState({ name: "", email: "" });
  const [locationOptions, setLocationOptions] = useState<string[]>(["Head Office"]);
  const [isLocationDropdownOpen, setIsLocationDropdownOpen] = useState(false);
  const locationDropdownRef = useRef<HTMLDivElement | null>(null);
  const [isTaxPreferenceDropdownOpen, setIsTaxPreferenceDropdownOpen] = useState(false);
  const taxPreferenceDropdownRef = useRef<HTMLDivElement | null>(null);
  const [isPriceListDropdownOpen, setIsPriceListDropdownOpen] = useState(false);
  const priceListDropdownRef = useRef<HTMLDivElement | null>(null);
  const [catalogPriceLists, setCatalogPriceLists] = useState<any[]>([]);
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
  const isProductSelected = formData.product.trim().length > 0;
  const normalizeText = (value: any) => String(value || "").trim().toLowerCase();
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

  const normalizeTaxRows = (rows: any[]) => {
    return rows
      .map((tax: any, idx: number) => ({
        id: String(tax?.id || tax?._id || tax?.tax_id || `tax-${idx}`),
        name: String(tax?.name || tax?.taxName || "").trim(),
        rate: Number(tax?.rate ?? tax?.taxRate ?? 0) || 0,
        type: String(tax?.type || (tax?.isGroup ? "group" : "tax")).toLowerCase(),
        isActive: tax?.isActive !== false && String(tax?.status || "").toLowerCase() !== "inactive",
        isGroup: Boolean(tax?.isGroup) || String(tax?.type || "").toLowerCase() === "group",
      }))
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
    const readProducts = () => {
      try {
        const rows = readRows("inv_products_v1");
        const mapped = rows
          .map((row: any, idx: number) => ({
            id: String(row?.id || row?._id || `prod-${idx}`),
            name: String(row?.name || row?.productName || row?.product || "").trim(),
            code: String(row?.code || row?.productCode || row?.sku || "").trim(),
            status: String(row?.status || ""),
            active: typeof row?.active === "boolean" ? row.active : undefined,
          }))
          .filter((row: ProductOption) => row.name);
        setProducts(mapped);
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
            status: String(row?.status || ""),
            active: typeof row?.active === "boolean" ? row.active : undefined,
          }))
          .filter((row: PlanAddonOption) => row.name);

        setPlanAddons([...mappedPlans, ...mappedAddons]);
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
            status: String(row?.status || ""),
            active: typeof row?.active === "boolean" ? row.active : undefined,
          }))
          .filter((row: PlanAddonOption) => row.name);

        setPlanAddons([...mappedPlans, ...mappedAddons]);
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
        const response: any = await quotesAPI.getNextNumber("QT-");
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
      if (locationDropdownRef.current && !locationDropdownRef.current.contains(event.target as Node)) {
        setIsLocationDropdownOpen(false);
      }
      if (taxPreferenceDropdownRef.current && !taxPreferenceDropdownRef.current.contains(event.target as Node)) {
        setIsTaxPreferenceDropdownOpen(false);
      }
      if (priceListDropdownRef.current && !priceListDropdownRef.current.contains(event.target as Node)) {
        setIsPriceListDropdownOpen(false);
      }
      if (couponDropdownRef.current && !couponDropdownRef.current.contains(event.target as Node)) {
        setIsCouponDropdownOpen(false);
      }
      if (taxDropdownRef.current && !taxDropdownRef.current.contains(event.target as Node)) {
        setIsTaxDropdownOpen(false);
      }
      if (reportingTagsDropdownRef.current && !reportingTagsDropdownRef.current.contains(event.target as Node)) {
        setIsReportingTagsDropdownOpen(false);
      }
      if (phoneCodeDropdownRef.current && !phoneCodeDropdownRef.current.contains(event.target as Node)) {
        setIsPhoneCodeDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const loadPriceLists = () => {
      try {
        const raw = localStorage.getItem("inv_price_lists_v1");
        const parsed = raw ? JSON.parse(raw) : [];
        setCatalogPriceLists(Array.isArray(parsed) ? parsed : []);
      } catch {
        setCatalogPriceLists([]);
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
        isActive: true,
        status: "Active",
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

        if (!alreadyExists) {
          createTaxLocal({
            name: selectedName,
            rate: selectedRate,
            type: "both",
            isActive: true,
            isCompound: !!newTaxForm.isCompound,
          });
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

  const activeProducts = products.filter((product: any) => {
    const status = String(product?.status || "").toLowerCase();
    if (status) return status === "active";
    if (typeof product?.active === "boolean") return product.active;
    return true;
  });

  const filteredProducts = activeProducts.filter((product: ProductOption) => {
    const term = productSearch.toLowerCase().trim();
    if (!term) return true;
    return product.name.toLowerCase().includes(term);
  });

  const selectedProduct = activeProducts.find((product: ProductOption) => product.name === formData.product);
  const selectedProductNameKey = normalizeText(formData.product);
  const selectedProductAliases = new Set(
    [selectedProduct?.id, selectedProduct?.name, selectedProduct?.code]
      .map((value) => normalizeText(value))
      .filter(Boolean)
  );

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

  const linkedPlanAddons = searchMatchedPlanAddons.filter((row: PlanAddonOption) => {
    const rowAliases = new Set(
      [row.productId, row.productName]
        .map((value) => normalizeText(value))
        .filter(Boolean)
    );
    const rowProductNameKey = normalizeText(row.productName);

    let linked = false;
    for (const alias of selectedProductAliases) {
      if (rowAliases.has(alias)) {
        linked = true;
        break;
      }
    }
    if (!linked && selectedProductNameKey && rowProductNameKey) {
      linked =
        rowProductNameKey.includes(selectedProductNameKey) ||
        selectedProductNameKey.includes(rowProductNameKey);
    }
    return linked;
  });

  const availablePlanAddons = !isProductSelected
    ? []
    : (linkedPlanAddons.length > 0 ? linkedPlanAddons : searchMatchedPlanAddons);
  const isPlanAddonFallbackMode = isProductSelected && linkedPlanAddons.length === 0 && searchMatchedPlanAddons.length > 0;

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

      const response: any = await customersAPI.update(String(customerId), payload);
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
    updateField("customerName", name);
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

  const handleProductSelect = (product: ProductOption) => {
    updateField("product", product.name);
    updateField("plan", "");
    updateField("rate", "0.00");
    updateField("coupon", "");
    updateField("couponCode", "");
    updateField("couponValue", "0.00");
    setProductSearch("");
    setPlanAddonSearch("");
    setCouponSearch("");
    setIsProductDropdownOpen(false);
    setIsPlanAddonDropdownOpen(false);
    setIsCouponDropdownOpen(false);
  };

  const handlePlanAddonSelect = (row: PlanAddonOption) => {
    updateField("plan", row.name);
    updateField("rate", (Number(row.rate || 0)).toFixed(2));
    setPlanAddonSearch("");
    setIsPlanAddonDropdownOpen(false);
  };

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
  const quoteTaxRate = useMemo(() => extractTaxRate(formData.tax), [formData.tax]);
  const quoteBaseAmount = useMemo(() => toAmount(formData.quantity) * toAmount(formData.rate), [formData.quantity, formData.rate]);
  const quoteTaxAmount = useMemo(() => {
    if (quoteTaxRate <= 0 || quoteBaseAmount <= 0) return 0;
    if (isTaxInclusive) return (quoteBaseAmount * quoteTaxRate) / (100 + quoteTaxRate);
    return (quoteBaseAmount * quoteTaxRate) / 100;
  }, [quoteBaseAmount, quoteTaxRate, isTaxInclusive]);
  const quoteLineAmount = useMemo(() => {
    if (quoteTaxRate <= 0) return quoteBaseAmount;
    return isTaxInclusive ? quoteBaseAmount : quoteBaseAmount + quoteTaxAmount;
  }, [quoteBaseAmount, quoteTaxAmount, quoteTaxRate, isTaxInclusive]);
  const couponDiscountAmount = useMemo(() => parseCouponDiscount(formData.couponValue, quoteBaseAmount), [formData.couponValue, quoteBaseAmount]);
  const recurringTotal = useMemo(() => Math.max(quoteBaseAmount - couponDiscountAmount, 0), [quoteBaseAmount, couponDiscountAmount]);
  const quoteDateForSummary = useMemo(() => {
    const iso = toIsoDate(formData.quoteDate);
    if (iso) {
      const parsed = new Date(`${iso}T00:00:00`);
      if (!Number.isNaN(parsed.getTime())) return parsed;
    }
    return new Date();
  }, [formData.quoteDate]);
  const billingCycleDays = useMemo(
    () => new Date(quoteDateForSummary.getFullYear(), quoteDateForSummary.getMonth() + 1, 0).getDate(),
    [quoteDateForSummary]
  );
  const prorateDays = 5;
  const immediateTotal = useMemo(
    () => (recurringTotal > 0 ? (recurringTotal * prorateDays) / Math.max(billingCycleDays, 1) : 0),
    [recurringTotal, prorateDays, billingCycleDays]
  );
  const immediateRangeEnd = useMemo(() => {
    const d = new Date(quoteDateForSummary);
    d.setDate(d.getDate() + prorateDays - 1);
    return d;
  }, [quoteDateForSummary, prorateDays]);
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

  const buildQuotePayload = () => {
    const quantity = toAmount(formData.quantity);
    const rate = toAmount(formData.rate);
    const subtotal = quoteBaseAmount;
    const discount = couponDiscountAmount;
    const totalBeforeDiscount = isTaxInclusive ? subtotal : subtotal + quoteTaxAmount;
    const total = Math.max(totalBeforeDiscount - discount, 0);

    const quoteItems = formData.plan
      ? [
        {
          id: 1,
          itemType: "plan",
          itemDetails: formData.plan,
          quantity,
          rate,
          tax: formData.tax || "Non-Taxable",
          amount: quoteLineAmount,
          reportingTags: Object.entries(reportingTagSelections).map(([tagId, value]) => ({ tagId, value })),
        },
      ]
      : [];

    return {
      quoteNumber: formData.quoteNumber,
      referenceNumber: formData.referenceNumber,
      customerName: formData.customerName,
      customer: selectedCustomer?.id || selectedCustomer?._id || formData.customerName,
      customerId: selectedCustomer?.id || selectedCustomer?._id || undefined,
      quoteDate: formData.quoteDate,
      expiryDate: formData.expiryDate || undefined,
      salesperson: formData.salesperson,
      subject: formData.subject,
      selectedPriceList: formData.priceList,
      priceList: formData.priceList,
      taxExclusive: formData.taxPreference,
      items: quoteItems,
      subtotal,
      subTotal: subtotal,
      tax: quoteTaxRate,
      taxAmount: quoteTaxAmount,
      discount,
      discountAmount: discount,
      shippingCharges: 0,
      adjustment: 0,
      total,
      currency: "AMD",
      customerNotes: formData.customerNotes,
      termsAndConditions: formData.termsAndConditions,
      reportingTags: Object.entries(reportingTagSelections).map(([tagId, value]) => ({ tagId, value })),
      customFields: [
        {
          label: "wsq",
          value: formData.wsq || "None",
        },
      ],
      quoteType: "subscription",
      isSubscriptionQuote: true,
      meteredBilling: Boolean(formData.meteredBilling),
      status: "draft" as const,
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
    setSaveLoading("draft");
    try {
      const payload = buildQuotePayload();
      const savedQuote: any = await saveQuote(payload);
      const id = extractSavedQuoteId(savedQuote);
      setIsSummaryModalOpen(false);
      if (id) navigate(`/sales/quotes/${id}`, { replace: true });
      else navigate("/sales/quotes", { replace: true });
    } catch (error) {
      console.error("Failed to save subscription quote as draft:", error);
      alert("Failed to save quote as draft.");
    } finally {
      setSaveLoading(null);
    }
  };

  const handleSaveAndSend = async () => {
    if (saveLoading) return;
    setSaveLoading("send");
    try {
      const payload = buildQuotePayload();
      const savedQuote: any = await saveQuote(payload);
      const id = extractSavedQuoteId(savedQuote);
      setIsSendApprovalModalOpen(false);
      setIsSummaryModalOpen(false);
      if (id) navigate(`/sales/quotes/${id}/email`, { state: { preloadedQuote: savedQuote } });
      else navigate("/sales/quotes", { replace: true });
    } catch (error) {
      console.error("Failed to save and open email for subscription quote:", error);
      alert("Failed to save and send quote.");
    } finally {
      setSaveLoading(null);
    }
  };

  const handleSaveNewSalesperson = async () => {
    const name = newSalespersonData.name.trim();
    if (!name) return;

    try {
      const saved = await saveSalesperson({
        name,
        email: newSalespersonData.email.trim(),
        status: "active",
      });

      try {
        const refreshed = await getSalespersonsFromAPI();
        setSalespersons(Array.isArray(refreshed) ? refreshed : []);
      } catch {
        setSalespersons((prev) => [saved as any, ...prev]);
      }

      handleSalespersonSelect(saved);
      setNewSalespersonData({ name: "", email: "" });
      setIsNewSalespersonFormOpen(false);
    } catch (error) {
      console.error("Failed to save salesperson:", error);
    }
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
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

      <div className="max-h-[calc(100vh-220px)] overflow-y-auto relative">
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
                  <span className={formData.salesperson ? "text-slate-900" : "text-slate-400"}>
                    {formData.salesperson || "Select or Add Salesperson"}
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
                            className="cursor-pointer truncate px-4 py-2 text-sm text-slate-700 hover:bg-[#156372] hover:text-white"
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

            <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[260px_minmax(0,420px)]">
              <label className="text-[16px] text-slate-800">wsq</label>
              <div className="relative">
                <select
                  className={`${inputClass} appearance-none pr-10`}
                  value={formData.wsq}
                  onChange={(e) => updateField("wsq", e.target.value)}
                >
                  <option value="None">None</option>
                </select>
                <ChevronDown size={18} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" />
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
                        <div className="px-3 py-2 text-[13px] text-slate-500">No active products found</div>
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

              <div className="h-6 w-px bg-slate-200" />

              <div className="relative flex items-center" ref={priceListDropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsPriceListDropdownOpen((prev) => !prev)}
                  className="inline-flex h-9 min-w-[180px] items-center justify-between gap-2 px-2 text-left text-[14px] text-slate-700"
                >
                  <CalendarDays size={14} className="text-slate-500" />
                  <span className="max-w-[130px] truncate">
                    {formData.priceList || "Select Price List"}
                  </span>
                  <ChevronDown size={14} className="text-slate-500" />
                </button>
                {isPriceListDropdownOpen && (
                  <div className="absolute left-0 top-full z-40 mt-1 w-[230px] overflow-hidden rounded-md border border-slate-200 bg-white shadow-lg">
                    <button
                      type="button"
                      className="block w-full border-b border-slate-100 px-3 py-2 text-left text-[13px] text-slate-700 hover:bg-[#eef5ff]"
                      onClick={() => {
                        updateField("priceList", "Select Price List");
                        setIsPriceListDropdownOpen(false);
                      }}
                    >
                      Select Price List
                    </button>
                    {catalogPriceLists.map((priceList: any, idx: number) => (
                      <button
                        key={priceList?.id || priceList?._id || idx}
                        type="button"
                        className="block w-full border-b border-slate-100 px-3 py-2 text-left text-[13px] text-slate-700 hover:bg-[#eef5ff]"
                        onClick={() => {
                          updateField("priceList", String(priceList?.name || priceList?.priceListName || "Select Price List"));
                          setIsPriceListDropdownOpen(false);
                        }}
                      >
                        {String(priceList?.name || priceList?.priceListName || "Unnamed Price List")}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className={`mt-4 w-full max-w-[1060px] border border-slate-200 relative ${(isPlanAddonDropdownOpen || isTaxDropdownOpen || isReportingTagsDropdownOpen) ? "overflow-visible z-[100]" : "overflow-x-auto z-0"}`}>
              <div className="min-w-[860px]">
                <div className="grid grid-cols-[2.2fr_1fr_1fr_1fr_0.7fr_48px] border-b border-slate-200 bg-white text-[12px] font-medium uppercase tracking-wide text-slate-700">
                  <div className="px-3 py-2.5">Plan and Addon</div>
                  <div className="border-l border-slate-200 px-3 py-2.5 text-right">Quantity</div>
                  <div className="border-l border-slate-200 px-3 py-2.5 text-right">
                    <span className="inline-flex items-center gap-1">
                      Rate
                      <span className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-[2px] border border-slate-400 text-slate-500">
                        <Calculator size={10} />
                      </span>
                    </span>
                  </div>
                  <div className="border-l border-slate-200 px-3 py-2.5">Tax</div>
                  <div className="border-l border-slate-200 px-3 py-2.5 text-right">Amount</div>
                  <div className="border-l border-slate-200 px-2 py-2.5" />
                </div>

                <div className={`grid grid-cols-[2.2fr_1fr_1fr_1fr_0.7fr_48px] items-center gap-0 border-b border-slate-200 divide-x divide-slate-200 px-2.5 py-2 ${!isProductSelected ? "opacity-60" : ""} relative ${(isPlanAddonDropdownOpen || isTaxDropdownOpen || isReportingTagsDropdownOpen) ? "z-50" : "z-0"}`}>
                  <div className="pr-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-7 w-7 items-center justify-center rounded border border-slate-300 bg-slate-50 text-slate-400">
                        <ImageIcon size={14} />
                      </div>
                      <div className="relative flex-1" ref={planAddonDropdownRef}>
                        <button
                          type="button"
                          disabled={!isProductSelected}
                          onClick={() => setIsPlanAddonDropdownOpen((prev) => !prev)}
                          className={`h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-[13px] text-left ${formData.plan ? "text-slate-800" : "text-slate-400"} flex items-center justify-between ${!isProductSelected ? "cursor-not-allowed" : ""}`}
                        >
                          <span>{formData.plan || "Type or click to select a plan."}</span>
                          <ChevronDown size={16} className="text-slate-500" />
                        </button>
                      {isPlanAddonDropdownOpen && isProductSelected && (
                        <div className="absolute left-0 right-0 top-full z-[100] mt-1 overflow-hidden rounded-md border border-slate-200 bg-white shadow-none">
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
                              Showing all active plans and addons.
                            </div>
                          )}
                          <div className="max-h-60 overflow-y-auto">
                            {availablePlanAddons.length === 0 ? (
                              <div className="px-3 py-2 text-[13px] text-slate-500">No plans/addons found</div>
                            ) : (
                              availablePlanAddons.map((row: PlanAddonOption) => (
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
                  </div>
                  <input
                    type="text"
                    className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-[13px] text-right text-slate-800 outline-none transition focus:border-[#3b82f6]"
                    value={formData.quantity}
                    onChange={(e) => updateField("quantity", e.target.value)}
                    disabled={!isProductSelected}
                  />
                  <input
                    type="text"
                    className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-[13px] text-right text-slate-800 outline-none transition focus:border-[#3b82f6]"
                    value={formData.rate}
                    onChange={(e) => updateField("rate", e.target.value)}
                    disabled={!isProductSelected}
                  />
                  <div className="relative" ref={taxDropdownRef}>
                    <button
                      type="button"
                      disabled={!isProductSelected}
                      onClick={() => setIsTaxDropdownOpen((prev) => !prev)}
                        className={`h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-[13px] text-left ${formData.tax ? "text-slate-800" : "text-slate-400"} outline-none transition focus:border-[#3b82f6] flex items-center justify-between ${!isProductSelected ? "cursor-not-allowed" : ""}`}
                      >
                        <span>{formData.tax || "Select a Tax"}</span>
                        <ChevronDown size={16} className="text-slate-500 transition-transform duration-200" style={{ transform: isTaxDropdownOpen ? "rotate(180deg)" : "rotate(0deg)" }} />
                      </button>
                    {isTaxDropdownOpen && isProductSelected && (
                      <div className="absolute left-0 right-0 top-full z-[150] mt-1 overflow-hidden rounded-md border border-slate-200 bg-white shadow-xl min-w-[280px]">
                        <div className="border-b border-slate-200 p-2">
                          <div className="relative">
                            <Search size={14} className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                              type="text"
                              className="h-8 w-full rounded border border-slate-300 bg-white pl-7 pr-2 text-[13px] text-slate-700 outline-none focus:border-[#3b82f6]"
                              value={taxSearch}
                              onChange={(e) => setTaxSearch(e.target.value)}
                              placeholder="Search"
                              autoFocus
                            />
                          </div>
                        </div>
                        <div className="max-h-60 overflow-y-auto">

                          {/* Group Taxes */}
                          {taxes.filter(t => t.type === "group" && (taxSearch === "" || t.name.toLowerCase().includes(taxSearch.toLowerCase()))).length > 0 && (
                            <div className="p-2">
                              <div className="mb-1 px-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">Tax Group</div>
                              {taxes.filter(t => t.type === "group" && (taxSearch === "" || t.name.toLowerCase().includes(taxSearch.toLowerCase()))).map((tax: any) => (
                                <button
                                  key={tax.id || tax._id}
                                  type="button"
                                  className="block w-full rounded px-2 py-1.5 text-left text-[13px] text-slate-700 hover:bg-[#3b82f6] hover:text-white"
                                  onClick={() => {
                                    updateField("tax", `${tax.name} [${tax.rate}%]`);
                                    setIsTaxDropdownOpen(false);
                                  }}
                                >
                                  {tax.name} [{tax.rate}%]
                                </button>
                              ))}
                            </div>
                          )}

                          {/* Simple/Standard Taxes */}
                          {taxes.filter(t => t.type !== "group" && (taxSearch === "" || t.name.toLowerCase().includes(taxSearch.toLowerCase()))).length > 0 && (
                            <div className="p-2 border-t border-slate-100">
                              <div className="mb-1 px-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">Taxes</div>
                              {taxes.filter(t => t.type !== "group" && (taxSearch === "" || t.name.toLowerCase().includes(taxSearch.toLowerCase()))).map((tax: any) => (
                                <button
                                  key={tax.id || tax._id}
                                  type="button"
                                  className="block w-full rounded px-2 py-1.5 text-left text-[13px] text-slate-700 hover:bg-[#3b82f6] hover:text-white"
                                  onClick={() => {
                                    updateField("tax", `${tax.name} [${tax.rate}%]`);
                                    setIsTaxDropdownOpen(false);
                                  }}
                                >
                                  {tax.name} [{tax.rate}%]
                                </button>
                              ))}
                            </div>
                          )}

                          {taxes.length === 0 && (
                            <div className="px-4 py-3 text-center text-[13px] text-slate-500">No taxes found</div>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={handleOpenNewTaxModal}
                          className="flex w-full items-center justify-center gap-2 border-t border-slate-200 px-3 py-2.5 text-[13px] text-[#0f6c82] hover:bg-slate-50 transition-colors"
                        >
                          <PlusCircle size={14} />
                          New Tax
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="pr-2 text-right text-[14px] font-semibold leading-none text-slate-900">{quoteLineAmount.toFixed(2)}</div>
                  <div className="relative" ref={moreMenuRef}>
                    <button
                      type="button"
                      disabled={!isProductSelected}
                      onClick={() => {
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
                        onClick={() => setIsReportingTagsDropdownOpen(!isReportingTagsDropdownOpen)}
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
                              availableReportingTags.map((tag: any) => (
                                <div key={tag.id || tag._id}>
                                  <label className="mb-1 block text-[12px] font-medium text-slate-600">{tag.name}</label>
                                  <select
                                    className="w-full rounded border border-slate-300 bg-white px-2 py-1.5 text-[13px] text-slate-700 outline-none focus:border-[#3b82f6]"
                                    value={reportingTagSelections[tag.id || tag._id] || ""}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setReportingTagSelections(prev => {
                                        const next = { ...prev };
                                        if (val) next[tag.id || tag._id] = val;
                                        else delete next[tag.id || tag._id];
                                        return next;
                                      });
                                    }}
                                  >
                                    <option value="">Select an option</option>
                                    {(Array.isArray(tag.options) ? tag.options : []).map((opt: any) => (
                                      <option key={opt} value={opt}>{opt}</option>
                                    ))}
                                  </select>
                                </div>
                              ))
                            )}
                          </div>
                          <div className="mt-4 flex justify-end gap-2 border-t border-slate-100 pt-3">
                            <button
                              type="button"
                              onClick={() => setIsReportingTagsDropdownOpen(false)}
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

            {activeCoupons.length > 0 && (
            <div className={`mt-6 w-full max-w-[1060px] relative ${isCouponDropdownOpen ? "z-[500]" : "z-0"}`}>
                <h3 className="mb-3 text-[14px] font-medium text-slate-600">Coupon</h3>
                <div className={`${isCouponDropdownOpen ? "overflow-visible" : "overflow-x-auto"} border border-slate-200 relative`}>
                  <table className="w-full min-w-[860px] border-collapse text-left text-[13px]">
                    <thead>
                      <tr className="border-b border-slate-200 bg-white text-[12px] font-semibold uppercase tracking-wide text-slate-800">
                        <th className="border-r border-slate-200 px-4 py-3">Coupon</th>
                        <th className="border-r border-slate-200 px-4 py-3">Coupon Code</th>
                        <th className="px-4 py-3 text-right">Value</th>
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
                              onClick={() => setIsCouponDropdownOpen((prev) => !prev)}
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
                                    <div className="px-3 py-2 text-[13px] text-slate-500">No active coupons found</div>
                                  ) : (
                                    filteredCoupons.map((coupon: CouponOption) => (
                                      <button
                                        key={coupon.id}
                                        type="button"
                                        onClick={() => handleCouponSelect(coupon)}
                                        className="block w-full border-b border-slate-100 px-3 py-2 text-left hover:bg-[#3b82f6] hover:text-white"
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
            className="rounded-md bg-[#22c55e] px-6 py-2 text-[14px] font-medium text-white hover:bg-[#16a34a]"
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

      {isManageSalespersonsOpen && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/40 p-4" onClick={() => setIsManageSalespersonsOpen(false)}>
          <div className="w-full max-w-2xl rounded-lg bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <h3 className="text-[18px] font-semibold text-slate-900">Manage Salespersons</h3>
              <button type="button" onClick={() => setIsManageSalespersonsOpen(false)} className="rounded p-1 text-slate-500 hover:bg-slate-100">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 p-4">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search size={14} className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    className="h-9 w-full rounded border border-slate-300 bg-white pl-7 pr-2 text-[13px] text-slate-700 outline-none focus:border-[#3b82f6]"
                    value={manageSalespersonSearch}
                    onChange={(e) => setManageSalespersonSearch(e.target.value)}
                    placeholder="Search Salesperson"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setIsNewSalespersonFormOpen((prev) => !prev)}
                  className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-[13px] text-slate-700 hover:bg-slate-50"
                >
                  <PlusCircle size={14} />
                  New Salesperson
                </button>
              </div>

              {isNewSalespersonFormOpen && (
                <div className="grid grid-cols-1 gap-2 rounded-md border border-slate-200 bg-slate-50 p-3 md:grid-cols-[1fr_1fr_auto]">
                  <input
                    type="text"
                    className="h-9 rounded border border-slate-300 px-3 text-[13px] outline-none focus:border-[#3b82f6]"
                    placeholder="Name"
                    value={newSalespersonData.name}
                    onChange={(e) => setNewSalespersonData((prev) => ({ ...prev, name: e.target.value }))}
                  />
                  <input
                    type="email"
                    className="h-9 rounded border border-slate-300 px-3 text-[13px] outline-none focus:border-[#3b82f6]"
                    placeholder="Email"
                    value={newSalespersonData.email}
                    onChange={(e) => setNewSalespersonData((prev) => ({ ...prev, email: e.target.value }))}
                  />
                  <button
                    type="button"
                    onClick={handleSaveNewSalesperson}
                    className="h-9 rounded bg-[#22c55e] px-4 text-[13px] font-medium text-white hover:bg-[#16a34a]"
                  >
                    Save
                  </button>
                </div>
              )}

              <div className="max-h-72 overflow-y-auto rounded-md border border-slate-200">
                {filteredManageSalespersons.length === 0 ? (
                  <div className="px-4 py-3 text-[13px] text-slate-500">No salespersons found</div>
                ) : (
                  filteredManageSalespersons.map((salesperson: any, index) => (
                    <button
                      key={salesperson?.id || salesperson?._id || index}
                      type="button"
                      onClick={() => handleSalespersonSelect(salesperson)}
                      className="flex w-full items-center justify-between border-b border-slate-100 px-4 py-2.5 text-left hover:bg-[#eef5ff]"
                    >
                      <span className="text-[14px] text-slate-800">{salesperson?.name || salesperson?.displayName || "Unnamed Salesperson"}</span>
                      <span className="text-[12px] text-slate-500">{salesperson?.email || ""}</span>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
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
                    <p className="text-[13px] text-slate-600">
                      From {displaySummaryDate(quoteDateForSummary)} to {displaySummaryDate(immediateRangeEnd)}
                    </p>
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
                    <p className="text-[12px] italic text-slate-500">Prorated Amount</p>
                  </div>
                </div>

                {showImmediateBreakdown && (
                  <div className="mt-3 border-t border-slate-200 pt-3 text-[13px] text-slate-700">
                    <div className="flex items-center justify-between">
                      <span>{formData.plan || "-"}</span>
                      <span className="flex items-center gap-1">{formatCurrency(immediateTotal)} <ChevronDown size={12} className="text-[#2563eb]" /></span>
                    </div>
                    <div className="mt-1 text-[12px] italic text-slate-500">
                      Actual Cost: {formatCurrency(toAmount(formData.rate))}/Unit
                    </div>
                    <div className="mt-3 flex items-center justify-between border-t border-slate-200 pt-3">
                      <span className="font-medium">Sub Total</span>
                      <span className="font-medium">{formatCurrency(immediateTotal)}</span>
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
                      className="mt-1 w-full rounded border border-[#3b82f6] px-2 py-1 text-left text-[13px] text-[#2563eb]"
                      onClick={() => setShowRecurringBreakdown((prev) => !prev)}
                    >
                      {showRecurringBreakdown ? "Hide Breakdown" : "Show Breakdown"} <ChevronDown size={12} className="inline-block" />
                    </button>
                  </div>
                  <p className="text-[30px] font-semibold text-slate-800">{formatCurrency(recurringTotal)}</p>
                </div>

                {showRecurringBreakdown && (
                  <div className="mt-3 space-y-1 border-t border-slate-200 pt-3 text-[13px] text-slate-700">
                    <div className="flex items-center justify-between">
                      <span>{formData.plan || "-"}</span>
                      <span>{formatCurrency(quoteBaseAmount)}</span>
                    </div>
                    <div className="mt-3 flex items-center justify-between border-t border-slate-200 pt-3">
                      <span className="font-medium">Sub Total</span>
                      <span className="font-medium">{formatCurrency(quoteBaseAmount)}</span>
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
                className="rounded bg-[#22c55e] px-4 py-2 text-[12px] font-medium text-white hover:bg-[#16a34a] disabled:cursor-not-allowed disabled:opacity-60"
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
                className="rounded border border-slate-300 bg-white px-4 py-2 text-[12px] text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
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
                className="rounded bg-[#22c55e] px-4 py-1.5 text-[12px] font-medium text-white hover:bg-[#16a34a] disabled:cursor-not-allowed disabled:opacity-60"
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
