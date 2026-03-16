import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  BriefcaseBusiness,
  Building2,
  Calendar,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  FileText,
  Info,
  Mail,
  MapPin,
  Pencil,
  Plus,
  Search,
  Settings,
  Tag,
  Upload,
  X,
  ChevronLeft,
} from "lucide-react";
import { customersAPI, invoicesAPI, salespersonsAPI } from "../../../../services/api";
import { getTaxes, saveInvoice } from "../../salesModel";
import { usePaymentTermsDropdown, defaultPaymentTerms, PaymentTerm } from "../../../../hooks/usePaymentTermsDropdown";
import PaymentTermsDropdown from "../../../../components/PaymentTermsDropdown";
import { ConfigurePaymentTermsModal } from "../../../../components/ConfigurePaymentTermsModal";
import { computeDueDateFromTerm } from "../../../shared/termPaymetn";

type DebitNoteItem = {
  id: number;
  description: string;
  rate: number;
  baseRate?: number;
  tax: string;
  amount: number;
};
type ReportingTagDef = {
  key: string;
  label: string;
  options: string[];
};
type CustomerOption = Record<string, any>;

const getCustomerPrimaryName = (customer: CustomerOption) =>
  String(
    customer?.name ||
    customer?.displayName ||
    customer?.customerName ||
    customer?.contactName ||
    customer?.companyName ||
    ""
  ).trim();

const getCustomerCode = (customer: CustomerOption) =>
  String(customer?.customerNumber || customer?.customerCode || customer?.code || "").trim();

const getCustomerEmail = (customer: CustomerOption) =>
  String(customer?.email || customer?.emailAddress || customer?.primaryEmail || "").trim();

const getCustomerCompany = (customer: CustomerOption) =>
  String(customer?.companyName || customer?.company || "").trim();

const getCustomerInitial = (customer: CustomerOption) => {
  const name = getCustomerPrimaryName(customer);
  return name ? name.charAt(0).toUpperCase() : "C";
};

const getCustomerCurrency = (customer: CustomerOption) =>
  String(customer?.currency || customer?.currencyCode || customer?.preferredCurrency || "").trim();

const getCustomerId = (customer: CustomerOption) =>
  String(customer?.id || customer?._id || customer?.customerId || "").trim();

const getAddress = (customer: CustomerOption, kind: "billing" | "shipping") => {
  const nested =
    customer?.[`${kind}Address`] ||
    customer?.[kind] ||
    customer?.[`${kind}_address`] ||
    (kind === "billing" ? customer?.address : null) ||
    {};

  return {
    attention: String(nested?.attention || customer?.[`${kind}Attention`] || "").trim(),
    street1: String(
      nested?.street1 ||
      nested?.address1 ||
      nested?.addressLine1 ||
      nested?.line1 ||
      nested?.street ||
      customer?.[`${kind}Street1`] ||
      customer?.[`${kind}AddressLine1`] ||
      ""
    ).trim(),
    street2: String(
      nested?.street2 ||
      nested?.address2 ||
      nested?.addressLine2 ||
      nested?.line2 ||
      customer?.[`${kind}Street2`] ||
      customer?.[`${kind}AddressLine2`] ||
      ""
    ).trim(),
    city: String(nested?.city || customer?.[`${kind}City`] || "").trim(),
    state: String(nested?.state || customer?.[`${kind}State`] || "").trim(),
    zipCode: String(
      nested?.zipCode ||
      nested?.postalCode ||
      nested?.zip ||
      customer?.[`${kind}ZipCode`] ||
      customer?.[`${kind}PostalCode`] ||
      ""
    ).trim(),
    country: String(nested?.country || customer?.[`${kind}Country`] || "").trim(),
    phone: String(nested?.phone || customer?.[`${kind}Phone`] || "").trim(),
    fax: String(nested?.fax || customer?.[`${kind}Fax`] || "").trim(),
  };
};

const getAddressLines = (address: any): string[] =>
  [
    address?.attention,
    address?.street1,
    address?.street2,
    address?.city,
    address?.state ? `${address.state}${address?.zipCode ? ` ${address.zipCode}` : ""}` : address?.zipCode,
    address?.country,
    address?.phone ? `Phone: ${address.phone}` : "",
    address?.fax ? `Fax Number: ${address.fax}` : "",
  ].filter((line) => Boolean(String(line || "").trim()));

const hasAddress = (address: any) =>
  Boolean(
    address?.attention ||
    address?.street1 ||
    address?.street2 ||
    address?.city ||
    address?.state ||
    address?.zipCode ||
    address?.country ||
    address?.phone ||
    address?.fax
  );

const reasons = [
  "Correction in invoice",
  "Change in POS",
  "Finalization of Provisional assessment",
  "Others",
];
const taxChoices = ["Select a Tax", "VAT [5%]", "GST [10%]", "Sales Tax [11%]"];
const PRICE_LISTS_STORAGE_KEY = "inv_price_lists_v1";

const formatDate = (date: Date) =>
  date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

const parseDisplayDate = (value: any) => {
  const raw = String(value || "").trim();
  if (!raw) return new Date();
  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) return parsed;
  const fallback = new Date(raw.replace(/(\d{2}) ([A-Za-z]{3}) (\d{4})/, "$1 $2, $3"));
  return Number.isNaN(fallback.getTime()) ? new Date() : fallback;
};

const parseTaxRate = (taxLabel: string): number => {
  const match = String(taxLabel || "").match(/(\d+(?:\.\d+)?)\s*%/);
  return match ? Number(match[1]) : 0;
};
const parsePercent = (raw: any): number => {
  const match = String(raw ?? "").match(/(\d+(?:\.\d+)?)/);
  return match ? Number(match[1]) : 0;
};

export default function NewDebitNote() {
  const navigate = useNavigate();
  const location = useLocation();
  const invoiceId = new URLSearchParams(location.search).get("invoiceId") || "";

  const [formData, setFormData] = useState({
    customerName: "",
    reason: "",
    location: "Head Office",
    debitNoteNumber: "CDN-000001",
    orderNumber: "",
    debitNoteDate: formatDate(new Date()),
    term: defaultPaymentTerms[2]?.value || "due-on-receipt",
    dueDate: formatDate(new Date()),
    earlyPaymentDays: "",
    earlyPaymentPercent: 0,
    salesperson: "",
    customField: "None",
    subject: "",
    taxMode: "Tax Exclusive",
    priceList: "Select Price List",
    customerNotes: "Thanks for your business.",
    termsAndConditions: "",
    discount: 0,
    discountType: "percent",
    shippingCharges: 0,
    adjustment: 0,
    currency: "AMD",
  });

  const [items, setItems] = useState<DebitNoteItem[]>([
    { id: Date.now(), description: "", rate: 0, baseRate: 0, tax: "", amount: 0 },
  ]);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerOption | null>(null);
  const [customerSearch, setCustomerSearch] = useState("");
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);
  const [reasonSearch, setReasonSearch] = useState("");
  const [isReasonDropdownOpen, setIsReasonDropdownOpen] = useState(false);
  const [invoiceOptions, setInvoiceOptions] = useState<string[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState("");
  const [locationOptions, setLocationOptions] = useState<string[]>(["Head Office"]);
  const [salespersons, setSalespersons] = useState<any[]>([]);
  const [salespersonSearch, setSalespersonSearch] = useState("");
  const [isSalespersonDropdownOpen, setIsSalespersonDropdownOpen] = useState(false);
  const [catalogPriceLists, setCatalogPriceLists] = useState<
    Array<{ id: string; name: string; status?: string; markup?: number; markupType?: string }>
  >([]);
  const [paymentTerms, setPaymentTerms] = useState<PaymentTerm[]>(defaultPaymentTerms);
  const [selectedPaymentTerm, setSelectedPaymentTerm] = useState(
    defaultPaymentTerms[2]?.value || "due-on-receipt"
  );
  const [isConfigureTermsOpen, setIsConfigureTermsOpen] = useState(false);
  const [isDueDatePickerOpen, setIsDueDatePickerOpen] = useState(false);
  const [isDebitNoteDatePickerOpen, setIsDebitNoteDatePickerOpen] = useState(false);
  const [debitNoteDateCalendar, setDebitNoteDateCalendar] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [dueDateCalendar, setDueDateCalendar] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [isBulkActionsOpen, setIsBulkActionsOpen] = useState(false);
  const [isBulkUpdateLineItemsActive, setIsBulkUpdateLineItemsActive] = useState(false);
  const [activeBulkUpdateAction, setActiveBulkUpdateAction] = useState<"project" | "reporting" | "account">("project");
  const [itemsWithAdditionalInfo, setItemsWithAdditionalInfo] = useState<Set<number>>(new Set());
  const [openTaxDropdowns, setOpenTaxDropdowns] = useState<Record<number, boolean>>({});
  const [taxSearches, setTaxSearches] = useState<Record<number, string>>({});
  const [activeAdditionalInfoMenu, setActiveAdditionalInfoMenu] = useState<{ itemId: number; type: "account" | "reporting" } | null>(null);
  const [additionalInfoSearch, setAdditionalInfoSearch] = useState("");
  const [itemAccountSelections, setItemAccountSelections] = useState<Record<number, string>>({});
  const [availableReportingTags, setAvailableReportingTags] = useState<ReportingTagDef[]>([]);
  const [headerReportingTagSelections, setHeaderReportingTagSelections] = useState<Record<string, string>>({});
  const [itemReportingTagSelections, setItemReportingTagSelections] = useState<Record<number, Record<string, string>>>({});
  const [reportingTagDraft, setReportingTagDraft] = useState<Record<string, string>>({});
  const bulkActionsRef = useRef<HTMLDivElement | null>(null);
  const taxDropdownRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const additionalInfoMenuRef = useRef<HTMLDivElement | null>(null);
  const additionalInfoReportingRef = useRef<HTMLDivElement | null>(null);
  const customerDropdownRef = useRef<HTMLDivElement | null>(null);

  const [saveLoading, setSaveLoading] = useState<string | null>(null);

  const handleSave = async (status = "open") => {
    if (!selectedCustomer) {
      alert("Please select a customer");
      return;
    }

    setSaveLoading(status === "draft" ? "draft" : "open");
    try {
      const payload = {
        invoiceNumber: formData.debitNoteNumber,
        customer: selectedCustomer.id || selectedCustomer._id,
        customerId: selectedCustomer.id || selectedCustomer._id,
        customerName: getCustomerPrimaryName(selectedCustomer),
        date: parseDisplayDate(formData.debitNoteDate).toISOString(),
        invoiceDate: parseDisplayDate(formData.debitNoteDate).toISOString(),
        dueDate: parseDisplayDate(formData.dueDate).toISOString(),
        orderNumber: formData.orderNumber,
        salesperson: formData.salesperson,
        subject: formData.subject,
        taxExclusive: formData.taxMode,
        customerNotes: formData.customerNotes,
        termsAndConditions: formData.termsAndConditions,
        subtotal: total - (formData.shippingCharges || 0) - (formData.adjustment || 0), // Simplification
        total: total,
        currency: formData.currency,
        status: status,
        debitNote: true,
        items: items.map(item => ({
          name: item.description,
          description: item.description,
          quantity: 1,
          unitPrice: item.rate,
          rate: item.rate,
          tax: item.tax,
          amount: item.amount,
        })),
      };

      const saved = await saveInvoice(payload as any);

      if (status === "open") {
        navigate(`/sales/invoices/${saved.id}/email`);
      } else {
        navigate("/sales/invoices");
      }
    } catch (error) {
      console.error("Error saving debit note:", error);
      alert("Failed to save debit note");
    } finally {
      setSaveLoading(null);
    }
  };
  const reasonDropdownRef = useRef<HTMLDivElement | null>(null);
  const salespersonDropdownRef = useRef<HTMLDivElement | null>(null);
  const dueDatePickerRef = useRef<HTMLDivElement | null>(null);
  const debitNoteDatePickerRef = useRef<HTMLDivElement | null>(null);
  const paymentTermsDropdownRef = useRef<HTMLDivElement | null>(null);

  const applyPaymentTerm = (termValue: string, termsList: PaymentTerm[] = paymentTerms) => {
    const dueDate = computeDueDateFromTerm(formData.debitNoteDate, termValue, termsList);
    setSelectedPaymentTerm(termValue);
    setFormData((prev) => {
      const selectedTerm = termsList.find(t => t.value === termValue);
      return {
        ...prev,
        term: termValue,
        dueDate,
        earlyPaymentDays: termValue === "custom" ? prev.earlyPaymentDays : String(selectedTerm?.discountDays || ""),
        earlyPaymentPercent: termValue === "custom" ? prev.earlyPaymentPercent : Number(selectedTerm?.discountPercentage || 0),
      };
    });
  };

  const navigateMonth = (direction: "prev" | "next", field: "debitNoteDate" | "dueDate") => {
    const setter = field === "debitNoteDate" ? setDebitNoteDateCalendar : setDueDateCalendar;
    setter((prev) => {
      const next = new Date(prev);
      next.setMonth(next.getMonth() + (direction === "next" ? 1 : -1));
      return next;
    });
  };

  const handleDateSelect = (date: Date, field: "debitNoteDate" | "dueDate") => {
    const formatted = formatDate(date);
    if (field === "debitNoteDate") {
      setDebitNoteDateCalendar(new Date(date.getFullYear(), date.getMonth(), 1));
      setIsDebitNoteDatePickerOpen(false);
      setFormData((prev) => ({
        ...prev,
        debitNoteDate: formatted,
        dueDate: computeDueDateFromTerm(formatted, selectedPaymentTerm, paymentTerms),
      }));
      const calculatedDueDate = computeDueDateFromTerm(formatted, selectedPaymentTerm, paymentTerms);
      setDueDateCalendar(new Date(parseDisplayDate(calculatedDueDate).getFullYear(), parseDisplayDate(calculatedDueDate).getMonth(), 1));
    } else {
      setDueDateCalendar(new Date(date.getFullYear(), date.getMonth(), 1));
      setIsDueDatePickerOpen(false);
      setFormData((prev) => ({
        ...prev,
        dueDate: formatted,
      }));
    }
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 0);
    const days = [];
    const prevMonthEnd = new Date(year, month, 0);

    for (let day = 1; day <= end.getDate(); day += 1) {
      days.push({ date: day, fullDate: new Date(year, month, day), month: "current" });
    }

    const startOffset = (start.getDay() + 6) % 7;
    for (let i = startOffset - 1; i >= 0; i -= 1) {
      const prevDate = prevMonthEnd.getDate() - i;
      days.unshift({ date: prevDate, fullDate: new Date(year, month - 1, prevDate), month: "prev" });
    }

    const remainingCells = Math.max(35, Math.ceil(days.length / 7) * 7) - days.length;
    for (let day = 1; day <= remainingCells; day += 1) {
      days.push({ date: day, fullDate: new Date(year, month + 1, day), month: "next" });
    }
    return days;
  };

  const taxComputation = useMemo(() => {
    const mode = String(formData.taxMode || "Tax Exclusive").toLowerCase();
    const isInclusive = mode.includes("inclusive");
    const grouped = new Map<string, number>();
    let baseSubTotal = 0;
    let taxTotal = 0;

    items.forEach((item) => {
      const gross = Number(item.amount || 0);
      const rate = parseTaxRate(item.tax);
      if (!item.tax || rate <= 0) {
        baseSubTotal += gross;
        return;
      }
      if (isInclusive) {
        const base = gross / (1 + rate / 100);
        const tax = gross - base;
        baseSubTotal += base;
        taxTotal += tax;
        grouped.set(item.tax, (grouped.get(item.tax) || 0) + tax);
      } else {
        const base = gross;
        const tax = (base * rate) / 100;
        baseSubTotal += base;
        taxTotal += tax;
        grouped.set(item.tax, (grouped.get(item.tax) || 0) + tax);
      }
    });

    return {
      baseSubTotal,
      taxTotal,
      groupedTaxes: Array.from(grouped.entries()).map(([label, amount]) => ({ label, amount })),
    };
  }, [formData.taxMode, items]);

  const subTotal = useMemo(() => Number(taxComputation.baseSubTotal || 0), [taxComputation.baseSubTotal]);
  const discountAmount = useMemo(() => {
    const raw = Number(formData.discount || 0);
    const computed = formData.discountType === "amount" ? raw : (subTotal * raw) / 100;
    return Math.max(0, Math.min(subTotal, computed));
  }, [formData.discount, formData.discountType, subTotal]);
  const discountFactor = useMemo(() => {
    if (subTotal <= 0) return 1;
    return Math.max(0, (subTotal - discountAmount) / subTotal);
  }, [discountAmount, subTotal]);
  const discountedTaxTotal = useMemo(
    () => taxComputation.taxTotal * discountFactor,
    [discountFactor, taxComputation.taxTotal]
  );
  const discountedGroupedTaxes = useMemo(
    () =>
      taxComputation.groupedTaxes
        .map((row) => ({ ...row, amount: row.amount * discountFactor }))
        .filter((row) => row.amount > 0),
    [discountFactor, taxComputation.groupedTaxes]
  );
  const total = useMemo(
    () =>
      Number(
        Math.max(0, subTotal - discountAmount + discountedTaxTotal) +
        Number(formData.shippingCharges || 0) +
        Number(formData.adjustment || 0)
      ),
    [discountAmount, discountedTaxTotal, formData.adjustment, formData.shippingCharges, subTotal]
  );

  const setField = (name: string, value: any) => setFormData((prev) => ({ ...prev, [name]: value }));
  const selectedPriceListOption = useMemo(
    () => catalogPriceLists.find((row) => row.name === formData.priceList),
    [catalogPriceLists, formData.priceList]
  );
  const getPriceListAdjustedRate = (baseRate: number) => {
    if (!selectedPriceListOption) return baseRate;
    const pct = Math.max(0, parsePercent(selectedPriceListOption.markup));
    if (!pct) return baseRate;
    const mode = String(selectedPriceListOption.markupType || "Markup").toLowerCase();
    const adjusted =
      mode === "markdown" ? baseRate * (1 - pct / 100) : baseRate * (1 + pct / 100);
    return Math.max(0, adjusted);
  };

  const updateItem = (id: number, patch: Partial<DebitNoteItem>) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const next = { ...item, ...patch };
        if (Object.prototype.hasOwnProperty.call(patch, "rate")) {
          next.baseRate = Number(patch.rate || 0);
        } else if (typeof next.baseRate !== "number") {
          next.baseRate = Number(next.rate || 0);
        }
        const appliedRate = getPriceListAdjustedRate(Number(next.baseRate || 0));
        next.rate = Number(appliedRate.toFixed(2));
        next.amount = Number(next.rate.toFixed(2));
        return next;
      })
    );
  };

  const addRow = () =>
    setItems((prev) => [
      ...prev,
      { id: Date.now() + prev.length, description: "", rate: 0, baseRate: 0, tax: "", amount: 0 },
    ]);
  const removeRow = (id: number) => setItems((prev) => (prev.length > 1 ? prev.filter((item) => item.id !== id) : prev));
  const getFilteredTaxes = (itemId: number) => {
    const query = String(taxSearches[itemId] || "").toLowerCase().trim();
    return taxChoices.filter((tax) => tax !== "Select a Tax" && (!query || tax.toLowerCase().includes(query)));
  };
  const groupedAccountOptions = [
    { group: "Other Current Asset", options: ["Advance Tax", "Employee Advance", "Goods In Transit", "Prepaid Expenses"] },
    { group: "Fixed Asset", options: ["Furniture and Equipment", "Office Equipment", "Computer Hardware"] },
  ];
  const filteredGroupedAccountOptions = groupedAccountOptions
    .map((group) => ({
      ...group,
      options: group.options.filter((option) =>
        option.toLowerCase().includes(String(additionalInfoSearch || "").toLowerCase().trim())
      ),
    }))
    .filter((group) => group.options.length > 0);
  const filteredCustomers = useMemo(() => {
    const query = customerSearch.trim().toLowerCase();
    if (!query) return customers;
    return customers.filter((customer) =>
      [
        getCustomerPrimaryName(customer),
        getCustomerCode(customer),
        getCustomerEmail(customer),
        getCustomerCompany(customer),
      ]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [customerSearch, customers]);
  const filteredReasons = useMemo(() => {
    const query = reasonSearch.trim().toLowerCase();
    if (!query) return reasons;
    return reasons.filter((reason) => reason.toLowerCase().includes(query));
  }, [reasonSearch]);
  const filteredSalespersons = useMemo(() => {
    const query = salespersonSearch.trim().toLowerCase();
    if (!query) return salespersons;
    return salespersons.filter((salesperson) =>
      String(salesperson?.name || "").toLowerCase().includes(query)
    );
  }, [salespersonSearch, salespersons]);
  const customerDetails =
    selectedCustomer ||
    customers.find((customer) => {
      const selectedName = String(formData.customerName || "").trim().toLowerCase();
      if (!selectedName) return false;
      return getCustomerPrimaryName(customer).toLowerCase() === selectedName;
    });
  const billingAddress = customerDetails ? getAddress(customerDetails, "billing") : null;
  const shippingAddress = customerDetails ? getAddress(customerDetails, "shipping") : null;
  const hasBillingAddress = hasAddress(billingAddress);
  const hasShippingAddress = hasAddress(shippingAddress);

  const normalizeReportingTagOptions = (tag: any): string[] => {
    const rawOptions = Array.isArray(tag?.options)
      ? tag.options
      : Array.isArray(tag?.values)
        ? tag.values
        : Array.isArray(tag?.tagValues)
          ? tag.tagValues
          : Array.isArray(tag?.choices)
            ? tag.choices
            : [];
    return Array.from(
      new Set(
        rawOptions
          .map((option: any) => {
            if (typeof option === "string") return option.trim();
            if (option && typeof option === "object") {
              return String(option.value ?? option.name ?? option.option ?? option.title ?? "").trim();
            }
            return "";
          })
          .filter(Boolean)
      )
    );
  };

  useEffect(() => {
    const loadCustomers = async () => {
      try {
        const response = await customersAPI.getAll();
        const raw = (Array.isArray(response) ? response : response?.data) || [];
        const rows = Array.isArray(raw) ? raw : [];
        const activeRows = rows.filter((customer: any) => {
          const status = String(customer?.status || "").toLowerCase();
          if (status === "inactive") return false;
          if (customer?.isActive === false) return false;
          if (customer?.active === false) return false;
          return true;
        });
        setCustomers(activeRows);
      } catch {
        setCustomers([]);
      }
    };
    const loadSalespersons = async () => {
      try {
        const response = await salespersonsAPI.getAll();
        const rows = Array.isArray(response?.data) ? response.data : Array.isArray(response) ? response : [];
        setSalespersons(rows);
      } catch {
        setSalespersons([]);
      }
    };
    loadCustomers();
    loadSalespersons();
    try {
      const raw = localStorage.getItem("taban_locations_cache");
      const parsed = raw ? JSON.parse(raw) : [];
      const options = Array.isArray(parsed)
        ? parsed
          .map((row: any) => String(row?.name || row?.locationName || row?.title || "").trim())
          .filter(Boolean)
        : [];
      setLocationOptions(options.length > 0 ? Array.from(new Set(options)) : ["Head Office"]);
    } catch {
      setLocationOptions(["Head Office"]);
    }
  }, []);

  useEffect(() => {
    const loadPriceLists = () => {
      try {
        const raw = localStorage.getItem(PRICE_LISTS_STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        const rows = Array.isArray(parsed) ? parsed : [];
        const normalized = rows
          .map((row: any, index: number) => ({
            id: String(row?.id || row?._id || `price-list-${index}`),
            name: String(row?.name || row?.priceListName || "").trim(),
            status: String(row?.status || "").toLowerCase(),
            markup: parsePercent(row?.markup),
            markupType: String(row?.markupType || "Markup"),
          }))
          .filter((row: any) => row.name);
        const active = normalized.filter((row: any) => row.status !== "inactive");
        setCatalogPriceLists(active);
      } catch {
        setCatalogPriceLists([]);
      }
    };

    loadPriceLists();
    const onStorage = (event: StorageEvent) => {
      if (!event.key || event.key === PRICE_LISTS_STORAGE_KEY) loadPriceLists();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    setItems((prev) =>
      prev.map((item) => {
        const baseRate = Number(
          typeof item.baseRate === "number" ? item.baseRate : item.rate || 0
        );
        const nextRate = Number(getPriceListAdjustedRate(baseRate).toFixed(2));
        return { ...item, baseRate, rate: nextRate, amount: nextRate };
      })
    );
  }, [selectedPriceListOption]);

  useEffect(() => {
    const loadReportingTags = () => {
      try {
        const raw = localStorage.getItem("taban_books_reporting_tags");
        const parsed = raw ? JSON.parse(raw) : [];
        const normalized = (Array.isArray(parsed) ? parsed : [])
          .map((tag: any, index: number) => ({
            key: String(tag?.id || tag?._id || tag?.name || tag?.title || `reporting-tag-${index}`),
            label: String(tag?.name || tag?.title || tag?.label || `Reporting Tag ${index + 1}`),
            options: (() => {
              const options = normalizeReportingTagOptions(tag);
              return options.length > 0 ? options : ["None"];
            })(),
          }))
          .filter((tag: ReportingTagDef) => Boolean(tag.key));
        setAvailableReportingTags(normalized);
        setHeaderReportingTagSelections((prev) => {
          const next = { ...prev };
          normalized.forEach((tag) => {
            if (typeof next[tag.key] === "undefined") {
              next[tag.key] = tag.options[0] || "None";
            }
          });
          return next;
        });
      } catch {
        setAvailableReportingTags([]);
      }
    };
    loadReportingTags();
  }, []);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      // Debit Note Date Picker
      if (debitNoteDatePickerRef.current && !debitNoteDatePickerRef.current.contains(event.target as Node)) {
        setIsDebitNoteDatePickerOpen(false);
      }
      // Due Date Picker
      if (dueDatePickerRef.current && !dueDatePickerRef.current.contains(event.target as Node)) {
        setIsDueDatePickerOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  useEffect(() => {
    const onOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (bulkActionsRef.current && !bulkActionsRef.current.contains(target)) {
        setIsBulkActionsOpen(false);
      }
      const clickedInsideTax = Object.values(taxDropdownRefs.current).some((el) => el && el.contains(target));
      if (!clickedInsideTax) setOpenTaxDropdowns({});
      if (additionalInfoMenuRef.current && !additionalInfoMenuRef.current.contains(target)) {
        setActiveAdditionalInfoMenu(null);
        setAdditionalInfoSearch("");
      }
      if (additionalInfoReportingRef.current && !additionalInfoReportingRef.current.contains(target)) {
        if (activeAdditionalInfoMenu?.type === "reporting") {
          setActiveAdditionalInfoMenu(null);
        }
      }
      if (customerDropdownRef.current && !customerDropdownRef.current.contains(target)) {
        setIsCustomerDropdownOpen(false);
      }
      if (reasonDropdownRef.current && !reasonDropdownRef.current.contains(target)) {
        setIsReasonDropdownOpen(false);
      }
      if (salespersonDropdownRef.current && !salespersonDropdownRef.current.contains(target)) {
        setIsSalespersonDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", onOutsideClick);
    return () => document.removeEventListener("mousedown", onOutsideClick);
  }, [activeAdditionalInfoMenu?.type]);

  const handleCustomerSelect = async (customer: CustomerOption) => {
    const customerName = getCustomerPrimaryName(customer);
    const customerCurrency = getCustomerCurrency(customer);
    const customerId = getCustomerId(customer);
    setSelectedCustomer(customer);
    setField("customerName", customerName);
    if (customerCurrency) setField("currency", customerCurrency);
    setInvoiceOptions([]);
    setSelectedInvoice("");
    setIsCustomerDropdownOpen(false);
    setCustomerSearch("");

    if (customerId) {
      try {
        const response = await invoicesAPI.getByCustomer(customerId);
        const rows = Array.isArray(response?.data) ? response.data : [];
        const invoiceNames = rows
          .map((invoice: any) =>
            String(
              invoice?.invoiceNumber ||
              invoice?.number ||
              invoice?.invoiceNo ||
              invoice?.reference ||
              invoice?.id ||
              invoice?._id ||
              ""
            ).trim()
          )
          .filter(Boolean);
        setInvoiceOptions(Array.from(new Set(invoiceNames)));
        return;
      } catch {
        // Fallback to customer-embedded invoice references when invoice API fails.
      }
    }

    const embeddedInvoices = Array.isArray(customer?.invoices)
      ? customer.invoices
      : Array.isArray(customer?.invoiceNumbers)
        ? customer.invoiceNumbers
        : Array.isArray(customer?.invoiceRefs)
          ? customer.invoiceRefs
          : [];
    const embeddedInvoiceNames = embeddedInvoices
      .map((invoice: any) =>
        typeof invoice === "string"
          ? invoice
          : String(invoice?.invoiceNumber || invoice?.number || invoice?.ref || "").trim()
      )
      .filter(Boolean);
    setInvoiceOptions(Array.from(new Set(embeddedInvoiceNames)));
  };

  const handleSalespersonSelect = (salesperson: any) => {
    setField("salesperson", salesperson?.name || "");
    setIsSalespersonDropdownOpen(false);
    setSalespersonSearch("");
  };

  return (
    <div className="w-full h-full min-h-0 overflow-y-auto bg-white">
      <div className="border-b border-slate-200 bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="flex items-center gap-2 text-3xl font-semibold text-slate-900">
            <FileText size={22} className="text-slate-700" />
            New Debit Note
          </h1>
          <div className="flex items-center gap-3">
            <button className="text-[#3b82f6]"><Settings size={14} /></button>
            <button className="text-slate-500" onClick={() => navigate("/sales/invoices")}><X size={18} /></button>
          </div>
        </div>
      </div>

      <div className="space-y-6 px-6 py-5">
        <section className="rounded-md bg-slate-50 p-4">
          <div className="grid grid-cols-1 gap-3 lg:max-w-[920px]">
            <div className="grid grid-cols-[160px_1fr] items-start gap-3">
              <label className="pt-2 text-sm text-[#ef4444]">Customer Name*</label>
              <div>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1" ref={customerDropdownRef}>
                    <div className="flex">
                      <button
                        type="button"
                        className="h-9 flex-1 rounded-l-md border border-slate-300 bg-white px-3 text-left text-sm text-slate-700 focus:border-blue-400"
                        onClick={() => setIsCustomerDropdownOpen((prev) => !prev)}
                      >
                        {formData.customerName || "Select or add a customer"}
                      </button>
                      <button
                        type="button"
                        className="h-9 w-9 border-y border-r border-slate-300 bg-white text-slate-500"
                        onClick={() => setIsCustomerDropdownOpen((prev) => !prev)}
                      >
                        {isCustomerDropdownOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                      <button type="button" className="h-9 w-9 rounded-r-md bg-[#17a86b] text-white">
                        <Search size={14} />
                      </button>
                    </div>
                    {isCustomerDropdownOpen && (
                      <div className="absolute top-full left-0 right-0 z-50 mt-1 overflow-hidden rounded-md border border-slate-200 bg-white shadow-xl">
                        <div className="border-b border-slate-100 p-2">
                          <div className="relative">
                            <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                              type="text"
                              placeholder="Search"
                              value={customerSearch}
                              onChange={(e) => setCustomerSearch(e.target.value)}
                              className="h-9 w-full rounded-md border border-[#3b82f6] pl-7 pr-2 text-sm focus:outline-none"
                            />
                          </div>
                        </div>
                        <div className="max-h-[220px] overflow-y-auto p-1.5">
                          {filteredCustomers.length === 0 ? (
                            <div className="px-3 py-4 text-sm text-slate-500">No customers found.</div>
                          ) : (
                            filteredCustomers.map((customer, index) => {
                              const isSelected =
                                getCustomerId(customer) &&
                                getCustomerId(customer) === getCustomerId(selectedCustomer || {});
                              return (
                                <button
                                  type="button"
                                  key={getCustomerId(customer) || `customer-${index}`}
                                  className={`mb-1 flex w-full items-center gap-3 rounded-md px-3 py-2 text-left ${isSelected ? "bg-[#4a89e8] text-white" : "text-slate-800 hover:bg-slate-50"
                                    }`}
                                  onClick={() => handleCustomerSelect(customer)}
                                >
                                  <div
                                    className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold ${isSelected ? "bg-white/25 text-white" : "bg-slate-100 text-slate-500"
                                      }`}
                                  >
                                    {getCustomerInitial(customer)}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="truncate text-[15px]">
                                      {getCustomerPrimaryName(customer)}
                                      {getCustomerCode(customer) ? (
                                        <span className={`ml-1 ${isSelected ? "text-blue-100" : "text-slate-500"}`}>
                                          | {getCustomerCode(customer)}
                                        </span>
                                      ) : null}
                                    </div>
                                    <div className={`mt-1 flex items-center gap-2 truncate text-sm ${isSelected ? "text-blue-100" : "text-slate-500"}`}>
                                      {getCustomerEmail(customer) ? (
                                        <span className="inline-flex items-center gap-1 truncate">
                                          <Mail size={12} />
                                          <span className="truncate">{getCustomerEmail(customer)}</span>
                                        </span>
                                      ) : null}
                                      {getCustomerCompany(customer) ? (
                                        <span className="inline-flex items-center gap-1 truncate">
                                          <Building2 size={12} />
                                          <span className="truncate">{getCustomerCompany(customer)}</span>
                                        </span>
                                      ) : null}
                                    </div>
                                  </div>
                                  {isSelected ? <Check size={14} className="shrink-0" /> : null}
                                </button>
                              );
                            })
                          )}
                        </div>
                        <button
                          type="button"
                          className="w-full border-t border-slate-100 px-3 py-2 text-left text-sm font-medium text-[#3b82f6] hover:bg-slate-50"
                        >
                          + New Customer
                        </button>
                      </div>
                    )}
                  </div>
                  {customerDetails ? (
                    <div className="inline-flex h-9 items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-700">
                      <MapPin size={13} className="text-[#1fa971]" />
                      {getCustomerCurrency(customerDetails) || formData.currency || "AMD"}
                    </div>
                  ) : null}
                </div>

                {customerDetails ? (
                  <div className="mt-4 flex items-start justify-between gap-4">
                    <div className="grid flex-1 grid-cols-1 gap-6 md:grid-cols-2">
                      <div>
                        <div className="flex items-center gap-1 text-[13px] uppercase tracking-wide text-[#344d7d]">
                          BILLING ADDRESS
                          {hasBillingAddress ? <Pencil size={12} className="text-slate-500" /> : null}
                        </div>
                        {hasBillingAddress ? (
                          <div className="mt-1 space-y-0.5 text-sm text-slate-900">
                            {getAddressLines(billingAddress).map((line, idx) => (
                              <div key={`billing-${idx}`}>{line}</div>
                            ))}
                          </div>
                        ) : (
                          <button type="button" className="mt-2 text-sm text-[#3f66e0] hover:underline">
                            New Address
                          </button>
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-1 text-[13px] uppercase tracking-wide text-[#344d7d]">
                          SHIPPING ADDRESS
                          {hasShippingAddress ? <Pencil size={12} className="text-slate-500" /> : null}
                        </div>
                        {hasShippingAddress ? (
                          <div className="mt-1 space-y-0.5 text-sm text-slate-900">
                            {getAddressLines(shippingAddress).map((line, idx) => (
                              <div key={`shipping-${idx}`}>{line}</div>
                            ))}
                          </div>
                        ) : (
                          <button type="button" className="mt-2 text-sm text-[#3f66e0] hover:underline">
                            New Address
                          </button>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="inline-flex h-9 items-center gap-2 whitespace-nowrap rounded-md bg-[#4b5578] px-4 text-sm font-medium text-white hover:bg-[#434d6f]"
                      onClick={() => {
                        const id = getCustomerId(customerDetails);
                        if (id) navigate(`/sales/customers/${id}`);
                      }}
                    >
                      {getCustomerPrimaryName(customerDetails) || "Customer"}'s Details
                      <ChevronRight size={15} />
                    </button>
                  </div>
                ) : null}
              </div>
            </div>

            {customerDetails ? (
              <div className="grid grid-cols-[160px_1fr] items-center gap-3">
                <label className="text-sm text-slate-700">Invoice#</label>
                <div className="relative">
                  <select
                    className="h-9 w-full appearance-none rounded-md border border-slate-300 bg-white px-3 pr-8 text-[14px]"
                    value={selectedInvoice}
                    onChange={(e) => setSelectedInvoice(e.target.value)}
                  >
                    <option value="">Select Invoice</option>
                    {invoiceOptions.map((invoice) => (
                      <option key={invoice} value={invoice}>
                        {invoice}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" />
                </div>
              </div>
            ) : null}

            <div className="grid grid-cols-[160px_1fr] items-center gap-3">
              <label className="text-sm text-[#ef4444]">Reason*</label>
              <div className="relative" ref={reasonDropdownRef}>
                <button
                  type="button"
                  className="flex h-9 w-full items-center justify-between rounded-md border border-slate-300 bg-white px-3 text-left text-[14px] text-slate-700 focus:border-blue-400"
                  onClick={() => setIsReasonDropdownOpen((prev) => !prev)}
                >
                  <span>{formData.reason || ""}</span>
                  {isReasonDropdownOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
                {isReasonDropdownOpen && (
                  <div className="absolute left-0 right-0 top-full z-40 mt-1 overflow-hidden rounded-md border border-slate-200 bg-white shadow-xl">
                    <div className="border-b border-slate-100 p-2">
                      <div className="relative">
                        <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Search"
                          value={reasonSearch}
                          onChange={(e) => setReasonSearch(e.target.value)}
                          className="h-8 w-full rounded border border-[#3b82f6] pl-7 pr-2 text-sm focus:outline-none"
                        />
                      </div>
                    </div>
                    <div className="max-h-44 overflow-y-auto p-1.5">
                      {filteredReasons.map((reason) => (
                        <button
                          key={reason}
                          type="button"
                          className={`mb-1 w-full rounded px-3 py-2 text-left text-sm ${formData.reason === reason
                            ? "bg-[#4a89e8] text-white"
                            : "text-slate-700 hover:bg-slate-50"
                            }`}
                          onClick={() => {
                            setField("reason", reason);
                            setIsReasonDropdownOpen(false);
                            setReasonSearch("");
                          }}
                        >
                          {reason}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-[160px_1fr] items-center gap-3">
              <label className="text-sm text-slate-700">Location</label>
              <div className="relative">
                <select
                  className="h-9 w-full appearance-none rounded-md border border-slate-300 bg-white px-3 pr-8 text-[14px] focus:border-blue-400"
                  value={formData.location}
                  onChange={(e) => setField("location", e.target.value)}
                >
                  {locationOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" />
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-4 lg:max-w-[980px]">
          <div className="grid grid-cols-[160px_1fr] items-center gap-3">
            <label className="text-sm text-[#ef4444]">Debit Note Number*</label>
            <div className="relative">
              <input className="h-9 w-full rounded-md border border-slate-300 px-3 text-[14px]" value={formData.debitNoteNumber} onChange={(e) => setField("debitNoteNumber", e.target.value)} />
              <Settings size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#3b82f6]" />
            </div>
          </div>
          <div className="grid grid-cols-[160px_1fr] items-center gap-3">
            <label className="text-sm text-slate-700">Order Number</label>
            <input className="h-9 rounded-md border border-slate-300 px-3 text-[14px]" value={formData.orderNumber} onChange={(e) => setField("orderNumber", e.target.value)} />
          </div>
          <div className="grid grid-cols-[160px_1fr_70px_170px_70px_170px] items-center gap-3">
            <label className="text-sm text-[#ef4444]">Debit Note Date*</label>
            <div className="relative" ref={debitNoteDatePickerRef}>
              <input
                className="h-9 w-full rounded-md border border-slate-300 px-3 text-[14px] cursor-pointer"
                value={formData.debitNoteDate}
                readOnly
                onClick={() => setIsDebitNoteDatePickerOpen(!isDebitNoteDatePickerOpen)}
              />
              <Calendar size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
              {isDebitNoteDatePickerOpen && (
                <div className="absolute top-full left-0 z-50 mt-2 w-[286px] rounded-md border border-slate-200 bg-white p-3 shadow-xl">
                  <div className="mb-3 flex items-center justify-between px-1">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); navigateMonth("prev", "debitNoteDate"); }}
                      className="rounded p-1 text-slate-500 transition hover:bg-slate-100"
                    >
                      <ChevronLeft size={14} />
                    </button>
                    <div className="text-[15px] font-medium text-slate-700">
                      {debitNoteDateCalendar.toLocaleString('default', { month: 'long', year: 'numeric' })}
                    </div>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); navigateMonth("next", "debitNoteDate"); }}
                      className="rounded p-1 text-slate-500 transition hover:bg-slate-100"
                    >
                      <ChevronRight size={14} />
                    </button>
                  </div>
                  <div className="grid grid-cols-7 gap-1">
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                      <div key={day} className="py-1 text-center text-[11px] font-semibold text-slate-400 uppercase">
                        {day}
                      </div>
                    ))}
                    {getDaysInMonth(debitNoteDateCalendar).map((day, idx) => {
                      const isSelected = formData.debitNoteDate === formatDate(day.fullDate);
                      const isToday = formatDate(new Date()) === formatDate(day.fullDate);
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleDateSelect(day.fullDate, "debitNoteDate"); }}
                          className={`h-8 w-8 rounded text-[13px] transition-colors ${day.month === 'current' ? 'text-slate-700 hover:bg-blue-50 hover:text-blue-600' : 'text-slate-300'} ${isSelected ? 'bg-blue-600 font-semibold !text-white' : ''} ${isToday && !isSelected ? 'border border-blue-200 bg-blue-50/50 text-blue-600' : ''}`}
                        >
                          {day.date}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
            <span className="text-sm text-slate-700">Terms</span>
            <div className="w-full" ref={paymentTermsDropdownRef}>
              <PaymentTermsDropdown
                value={selectedPaymentTerm}
                onChange={(value) => applyPaymentTerm(value)}
                customTerms={paymentTerms}
                onConfigureTerms={() => setIsConfigureTermsOpen(true)}
              />
            </div>
            <span className="text-sm text-slate-700">Due Date</span>
            <div className="relative" ref={dueDatePickerRef}>
              <input
                className="h-9 w-full rounded-md border border-dashed border-slate-300 bg-slate-50 px-3 text-[14px] cursor-pointer"
                value={formData.dueDate}
                readOnly
                onClick={() => setIsDueDatePickerOpen(!isDueDatePickerOpen)}
              />
              {isDueDatePickerOpen && (
                <div className="absolute top-full left-0 z-50 mt-2 w-[286px] rounded-md border border-slate-200 bg-white p-3 shadow-xl">
                  <div className="mb-3 flex items-center justify-between px-1">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); navigateMonth("prev", "dueDate"); }}
                      className="rounded p-1 text-slate-500 transition hover:bg-slate-100"
                    >
                      <ChevronLeft size={14} />
                    </button>
                    <div className="text-[15px] font-medium text-slate-700">
                      {dueDateCalendar.toLocaleString('default', { month: 'long', year: 'numeric' })}
                    </div>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); navigateMonth("next", "dueDate"); }}
                      className="rounded p-1 text-slate-500 transition hover:bg-slate-100"
                    >
                      <ChevronRight size={14} />
                    </button>
                  </div>
                  <div className="grid grid-cols-7 gap-1">
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                      <div key={day} className="py-1 text-center text-[11px] font-semibold text-slate-400 uppercase">
                        {day}
                      </div>
                    ))}
                    {getDaysInMonth(dueDateCalendar).map((day, idx) => {
                      const isSelected = formData.dueDate === formatDate(day.fullDate);
                      const isToday = formatDate(new Date()) === formatDate(day.fullDate);
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleDateSelect(day.fullDate, "dueDate"); }}
                          className={`h-8 w-8 rounded text-[13px] transition-colors ${day.month === 'current' ? 'text-slate-700 hover:bg-blue-50 hover:text-blue-600' : 'text-slate-300'} ${isSelected ? 'bg-blue-600 font-semibold !text-white' : ''} ${isToday && !isSelected ? 'border border-blue-200 bg-blue-50/50 text-blue-600' : ''}`}
                        >
                          {day.date}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="grid grid-cols-[160px_1fr] items-center gap-3">
            <label className="flex items-center gap-1 text-sm text-slate-700">Early Payment Discount <Info size={13} className="text-slate-400" /></label>
            <div className="grid grid-cols-[140px_60px_140px_40px] gap-2">
              <input className="h-9 rounded-md border border-slate-300 px-3 text-[14px]" value={formData.earlyPaymentDays} onChange={(e) => setField("earlyPaymentDays", e.target.value)} />
              <div className="inline-flex h-9 items-center justify-center rounded-md border border-slate-300 bg-slate-50 text-sm">Days</div>
              <input type="number" className="h-9 rounded-md border border-slate-300 px-3 text-right text-[14px]" value={formData.earlyPaymentPercent} onChange={(e) => setField("earlyPaymentPercent", Number(e.target.value || 0))} />
              <div className="inline-flex h-9 items-center justify-center rounded-md border border-slate-300 bg-slate-50 text-sm">%</div>
            </div>
          </div>
          <div className="grid grid-cols-[160px_1fr] items-center gap-3 border-t border-slate-200 pt-4">
            <label className="text-sm text-slate-700">Salesperson</label>
            <div className="relative max-w-xs" ref={salespersonDropdownRef}>
              <button
                type="button"
                className="flex h-9 w-full items-center justify-between rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-700"
                onClick={() => setIsSalespersonDropdownOpen((prev) => !prev)}
              >
                <span className={formData.salesperson ? "text-slate-900" : "text-slate-400"}>
                  {formData.salesperson || "Select or Add Salesperson"}
                </span>
                <ChevronDown size={14} className="text-slate-400" />
              </button>
              {isSalespersonDropdownOpen && (
                <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-md border border-slate-200 bg-white shadow-lg">
                  <div className="flex items-center gap-2 border-b border-slate-200 p-2">
                    <Search size={14} className="text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search"
                      value={salespersonSearch}
                      onChange={(e) => setSalespersonSearch(e.target.value)}
                      className="w-full text-sm outline-none"
                      autoFocus
                    />
                  </div>
                  <div className="max-h-60 overflow-y-auto">
                    {filteredSalespersons.length > 0 ? (
                      filteredSalespersons.map((salesperson) => (
                        <button
                          key={salesperson?.id || salesperson?._id || salesperson?.name}
                          type="button"
                          className="block w-full truncate px-4 py-2 text-left text-sm text-slate-700 hover:bg-[#156372] hover:text-white"
                          onClick={() => handleSalespersonSelect(salesperson)}
                        >
                          {salesperson?.name}
                        </button>
                      ))
                    ) : (
                      <div className="px-4 py-2 text-sm italic text-slate-500">No salespersons found</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
          {availableReportingTags.map((tag) => (
            <div key={`header-reporting-${tag.key}`} className="grid grid-cols-[160px_1fr] items-center gap-3 border-t border-slate-200 pt-4">
              <label className="text-sm text-[#ef4444]">{tag.label} *</label>
              <div className="relative">
                <select
                  className="h-9 w-full appearance-none rounded-md border border-slate-300 bg-white px-3 pr-8 text-[14px]"
                  value={headerReportingTagSelections[tag.key] ?? tag.options[0] ?? "None"}
                  onChange={(e) =>
                    setHeaderReportingTagSelections((prev) => ({
                      ...prev,
                      [tag.key]: e.target.value,
                    }))
                  }
                >
                  {tag.options.map((option) => (
                    <option key={`${tag.key}-${option}`} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" />
              </div>
            </div>
          ))}
          <div className="grid grid-cols-[160px_1fr] items-start gap-3 border-t border-slate-200 pt-4">
            <label className="text-sm text-slate-700">Subject</label>
            <textarea className="h-20 rounded-md border border-slate-300 px-3 py-2 text-[14px]" placeholder="Let your customer know what this Debit Note is for" value={formData.subject} onChange={(e) => setField("subject", e.target.value)} />
          </div>
        </section>

        <section className="space-y-4 border-t border-slate-200 pt-4">
          <div className="flex items-center gap-4 text-sm text-slate-600">
            <select className="h-9 rounded-md border border-slate-300 px-2 text-[14px]" value={formData.taxMode} onChange={(e) => setField("taxMode", e.target.value)}>
              <option>Tax Exclusive</option>
              <option>Tax Inclusive</option>
            </select>
            <select className="h-9 rounded-md border border-slate-300 px-2 text-[14px]" value={formData.priceList} onChange={(e) => setField("priceList", e.target.value)}>
              <option value="Select Price List">Select Price List</option>
              {catalogPriceLists.map((priceList) => (
                <option key={priceList.id} value={priceList.name}>
                  {priceList.name}
                </option>
              ))}
            </select>
          </div>
          <div className="overflow-visible rounded-xl border border-slate-200 bg-white relative z-20">
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
              <h2 className="text-[14px] font-semibold text-slate-800">Item Table</h2>
              <div className="flex items-center gap-4 text-sm text-[#2563eb]">
                <button className="inline-flex items-center gap-1"><Search size={14} />Scan Item</button>
                <div className="relative" ref={bulkActionsRef}>
                  <button className="inline-flex items-center gap-1" onClick={() => setIsBulkActionsOpen((prev) => !prev)}>
                    <Check size={14} />Bulk Actions
                  </button>
                  {isBulkActionsOpen && (
                    <div className="absolute right-0 top-full z-50 mt-2 min-w-[220px] overflow-hidden rounded-md border border-slate-200 bg-white shadow-[0_12px_24px_rgba(15,23,42,0.16)]">
                      <button
                        type="button"
                        className="mx-1 mt-1 flex w-[calc(100%-8px)] items-center justify-between rounded-md bg-[#4a89e8] px-3 py-2 text-left text-[13px] font-medium text-white"
                        onClick={() => {
                          setIsBulkUpdateLineItemsActive(true);
                          setActiveBulkUpdateAction("project");
                          setIsBulkActionsOpen(false);
                        }}
                      >
                        <span>Bulk Update Line Items</span>
                        <Check size={13} />
                      </button>
                      <button
                        type="button"
                        className="flex w-full items-center px-3 py-2 text-left text-[13px] text-slate-700 hover:bg-slate-50"
                        onClick={() => {
                          const allVisible = items.length > 0 && items.every((item) => itemsWithAdditionalInfo.has(item.id));
                          if (allVisible) setItemsWithAdditionalInfo(new Set());
                          else setItemsWithAdditionalInfo(new Set(items.map((item) => item.id)));
                          setIsBulkActionsOpen(false);
                        }}
                      >
                        {items.length > 0 && items.every((item) => itemsWithAdditionalInfo.has(item.id))
                          ? "Hide All Additional Information"
                          : "Show All Additional Information"}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
            {isBulkUpdateLineItemsActive && (
              <div className="mx-3 mt-3 mb-0 flex items-center justify-between rounded-md bg-[#dce8f6] px-4 py-3">
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    className={`rounded-md bg-[#1fb374] px-3 py-1.5 text-[13px] font-medium text-white hover:bg-[#18a067] ${activeBulkUpdateAction === "project" ? "ring-2 ring-[#2f6fed] ring-offset-1" : ""}`}
                    onClick={() => setActiveBulkUpdateAction("project")}
                  >
                    Update Project
                  </button>
                  <button
                    type="button"
                    className={`rounded-md bg-[#1fb374] px-3 py-1.5 text-[13px] font-medium text-white hover:bg-[#18a067] ${activeBulkUpdateAction === "reporting" ? "ring-2 ring-[#2f6fed] ring-offset-1" : ""}`}
                    onClick={() => {
                      setActiveBulkUpdateAction("reporting");
                      setItemsWithAdditionalInfo(new Set(items.map((item) => item.id)));
                    }}
                  >
                    Update Reporting Tags
                  </button>
                  <button
                    type="button"
                    className={`rounded-md bg-[#1fb374] px-3 py-1.5 text-[13px] font-medium text-white hover:bg-[#18a067] ${activeBulkUpdateAction === "account" ? "ring-2 ring-[#2f6fed] ring-offset-1" : ""}`}
                    onClick={() => setActiveBulkUpdateAction("account")}
                  >
                    Update Account
                  </button>
                </div>
                <button
                  type="button"
                  className="text-[#3b82f6] hover:text-[#2563eb]"
                  onClick={() => {
                    setIsBulkUpdateLineItemsActive(false);
                    setActiveBulkUpdateAction("project");
                  }}
                >
                  <X size={20} />
                </button>
              </div>
            )}
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-white">
                  <th className="w-8" />
                  <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-600">DESCRIPTION</th>
                  <th className="w-36 px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-600">RATE</th>
                  <th className="w-36 px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-600">TAX</th>
                  <th className="w-36 px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-600">AMOUNT</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <React.Fragment key={item.id}>
                    <tr className="border-b border-slate-200">
                      <td className="text-center text-slate-300">::</td>
                      <td className="px-3 py-3">
                        <textarea className="h-11 w-full resize-none border-none text-[14px] outline-none" value={item.description} onChange={(e) => updateItem(item.id, { description: e.target.value })} />
                      </td>
                      <td className="px-3 py-3">
                        <input type="number" className="h-9 w-full rounded-md border border-slate-300 px-2 text-right text-[14px]" value={item.rate} onChange={(e) => updateItem(item.id, { rate: Number(e.target.value || 0) })} />
                      </td>
                      <td className="px-3 py-3">
                        <div className="relative" ref={(el) => { taxDropdownRefs.current[item.id] = el; }}>
                          <button
                            className="flex h-9 w-full items-center justify-between rounded-md border border-slate-300 px-2 text-[14px]"
                            onClick={() => setOpenTaxDropdowns((prev) => ({ ...prev, [item.id]: !prev[item.id] }))}
                            type="button"
                          >
                            <span className={item.tax ? "text-slate-700" : "text-slate-500"}>{item.tax || "Select a Tax"}</span>
                            <ChevronDown size={14} />
                          </button>
                          {openTaxDropdowns[item.id] && (
                            <div className="absolute top-full left-0 z-[160] mt-1 w-[220px] rounded-md border border-gray-200 bg-white shadow-xl">
                              <div className="border-b border-gray-100 p-2">
                                <div className="relative">
                                  <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
                                  <input
                                    type="text"
                                    placeholder="Search"
                                    value={taxSearches[item.id] || ""}
                                    onChange={(e) => setTaxSearches((prev) => ({ ...prev, [item.id]: e.target.value }))}
                                    className="h-8 w-full rounded border border-gray-300 pl-7 pr-2 text-sm focus:border-blue-500 focus:outline-none"
                                  />
                                </div>
                              </div>
                              <div className="max-h-48 overflow-y-auto py-1">
                                {getFilteredTaxes(item.id).map((tax) => (
                                  <button
                                    key={`${item.id}-${tax}`}
                                    type="button"
                                    className={`w-full px-3 py-1.5 text-left text-sm hover:bg-blue-50 ${item.tax === tax ? "bg-blue-600 text-white hover:bg-blue-600" : "text-gray-700"}`}
                                    onClick={() => {
                                      updateItem(item.id, { tax });
                                      setOpenTaxDropdowns((prev) => ({ ...prev, [item.id]: false }));
                                      setTaxSearches((prev) => ({ ...prev, [item.id]: "" }));
                                    }}
                                  >
                                    {tax}
                                  </button>
                                ))}
                                {getFilteredTaxes(item.id).length === 0 && (
                                  <div className="px-3 py-2 text-sm text-gray-500">No taxes found</div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-right font-semibold">{Number(item.amount || 0).toFixed(2)}</td>
                      <td className="px-3 py-3 text-center">
                        <button className="text-red-500" onClick={() => removeRow(item.id)}><X size={16} /></button>
                      </td>
                    </tr>
                    {itemsWithAdditionalInfo.has(item.id) && (
                      <tr className="border-b border-slate-200 bg-slate-50">
                        <td />
                        <td colSpan={5} className="px-3 py-2 text-[14px] text-slate-600">
                          <div className="flex items-center gap-3">
                            <div className="relative" ref={additionalInfoMenuRef}>
                              <button
                                type="button"
                                className={`inline-flex h-8 items-center gap-1.5 rounded border px-2 text-[14px] ${activeAdditionalInfoMenu?.itemId === item.id && activeAdditionalInfoMenu.type === "account"
                                  ? "border-[#3b82f6] bg-white"
                                  : "border-transparent hover:border-slate-300"
                                  }`}
                                onClick={() => {
                                  setActiveAdditionalInfoMenu((prev) =>
                                    prev?.itemId === item.id && prev.type === "account" ? null : { itemId: item.id, type: "account" }
                                  );
                                }}
                              >
                                <BriefcaseBusiness size={13} className="text-slate-500" />
                                <span>{itemAccountSelections[item.id] || "Select an account"}</span>
                                <ChevronDown size={13} className="text-slate-500" />
                              </button>
                              {activeAdditionalInfoMenu?.itemId === item.id && activeAdditionalInfoMenu.type === "account" && (
                                <div className="absolute left-0 top-full z-[170] mt-1 w-[280px] rounded-md border border-slate-200 bg-white shadow-xl">
                                  <div className="border-b border-slate-100 p-2">
                                    <div className="relative">
                                      <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                                      <input
                                        type="text"
                                        placeholder="Search"
                                        value={additionalInfoSearch}
                                        onChange={(e) => setAdditionalInfoSearch(e.target.value)}
                                        className="h-8 w-full rounded border border-[#3b82f6] pl-7 pr-2 text-sm focus:outline-none"
                                      />
                                    </div>
                                  </div>
                                  <div className="max-h-56 overflow-y-auto py-1">
                                    {filteredGroupedAccountOptions.length > 0 ? (
                                      filteredGroupedAccountOptions.map((group) => (
                                        <div key={group.group}>
                                          <div className="px-3 py-1 text-sm font-semibold text-slate-700">{group.group}</div>
                                          {group.options.map((option) => (
                                            <button
                                              key={option}
                                              type="button"
                                              className={`w-full px-3 py-1.5 text-left text-sm ${itemAccountSelections[item.id] === option
                                                ? "bg-[#4a89e8] text-white"
                                                : "text-slate-700 hover:bg-slate-50"
                                                }`}
                                              onClick={() => {
                                                setItemAccountSelections((prev) => ({ ...prev, [item.id]: option }));
                                                setActiveAdditionalInfoMenu(null);
                                                setAdditionalInfoSearch("");
                                              }}
                                            >
                                              {option}
                                            </button>
                                          ))}
                                        </div>
                                      ))
                                    ) : (
                                      <div className="px-3 py-2 text-sm text-slate-500">NO RESULTS FOUND</div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>

                            <div className="relative" ref={additionalInfoReportingRef}>
                              <button
                                type="button"
                                className="inline-flex h-8 items-center gap-1.5 rounded border border-transparent px-2 text-[14px] hover:border-slate-300"
                                onClick={() => {
                                  const current = itemReportingTagSelections[item.id] || {};
                                  const initialDraft: Record<string, string> = {};
                                  availableReportingTags.forEach((tag) => {
                                    initialDraft[tag.key] = current[tag.key] || tag.options[0] || "";
                                  });
                                  setReportingTagDraft(initialDraft);
                                  setActiveAdditionalInfoMenu((prev) =>
                                    prev?.itemId === item.id && prev.type === "reporting" ? null : { itemId: item.id, type: "reporting" }
                                  );
                                }}
                              >
                                <Tag size={13} className="text-slate-500" />
                                <span>
                                  {(() => {
                                    const selected = itemReportingTagSelections[item.id] || {};
                                    const selectedCount = availableReportingTags.filter((tag) => {
                                      const value = String(selected[tag.key] || "").trim().toLowerCase();
                                      return value && value !== "none";
                                    }).length;
                                    return availableReportingTags.length > 0
                                      ? `Reporting Tags : ${selectedCount} out of ${availableReportingTags.length} selected.`
                                      : "Reporting Tags";
                                  })()}
                                </span>
                                <ChevronDown size={13} className="text-slate-500" />
                              </button>
                              {activeAdditionalInfoMenu?.itemId === item.id && activeAdditionalInfoMenu.type === "reporting" && (
                                <div className="absolute left-0 top-full z-[170] mt-1 w-[480px] rounded-md border border-slate-200 bg-white shadow-xl">
                                  <div className="border-b border-slate-200 px-4 py-3 text-[24px] text-slate-700">Reporting Tags</div>
                                  <div className="space-y-3 px-4 py-4">
                                    {availableReportingTags.length === 0 ? (
                                      <p className="text-sm text-slate-500">No reporting tags found.</p>
                                    ) : (
                                      availableReportingTags.map((tag) => (
                                        <div key={tag.key} className="space-y-2">
                                          <label className="block text-sm text-[#ef4444]">
                                            {tag.label} *
                                          </label>
                                          <select
                                            className="h-10 w-[260px] rounded-md border border-[#3b82f6] bg-white px-3 text-sm"
                                            value={reportingTagDraft[tag.key] ?? tag.options[0] ?? ""}
                                            onChange={(e) =>
                                              setReportingTagDraft((prev) => ({ ...prev, [tag.key]: e.target.value }))
                                            }
                                          >
                                            {tag.options.map((option) => (
                                              <option key={`${tag.key}-${option}`} value={option}>
                                                {option}
                                              </option>
                                            ))}
                                          </select>
                                        </div>
                                      ))
                                    )}
                                  </div>
                                  <div className="flex items-center gap-3 border-t border-slate-200 px-4 py-3">
                                    <button
                                      type="button"
                                      className="rounded-md bg-[#17a86b] px-4 py-1.5 text-sm font-medium text-white"
                                      onClick={() => {
                                        setItemReportingTagSelections((prev) => ({ ...prev, [item.id]: reportingTagDraft }));
                                        setActiveAdditionalInfoMenu(null);
                                      }}
                                    >
                                      Save
                                    </button>
                                    <button
                                      type="button"
                                      className="rounded-md border border-slate-300 bg-white px-4 py-1.5 text-sm text-slate-700"
                                      onClick={() => setActiveAdditionalInfoMenu(null)}
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
          <button className="inline-flex h-9 items-center gap-1 rounded-md border border-[#d7deef] bg-[#eef3ff] px-4 text-[13px] font-medium text-[#1f3f79]" onClick={addRow}>
            <Plus size={14} /> Add New Row
          </button>
        </section>

        <section className="grid grid-cols-1 gap-8 pt-3 lg:grid-cols-[1fr_420px]">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-800">Customer Notes</label>
            <textarea className="h-24 w-full rounded-md border border-slate-300 px-3 py-2 text-[14px]" value={formData.customerNotes} onChange={(e) => setField("customerNotes", e.target.value)} />
            <p className="mt-1 text-[12px] text-slate-500">Will be displayed on the invoice</p>
          </div>
          <div className="space-y-4">
            <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-5">
              <div className="flex justify-between text-[14px] font-semibold"><span>Sub Total</span><span>{subTotal.toFixed(2)}</span></div>
              <div className="flex justify-between items-center text-[14px]">
                <span>Discount</span>
                <div className="flex items-center gap-2">
                  <input type="number" className="h-8 w-20 rounded border border-slate-300 px-2 text-right" value={formData.discount} onChange={(e) => setField("discount", Number(e.target.value || 0))} />
                  <select className="h-8 rounded border border-slate-300 px-1 text-xs" value={formData.discountType} onChange={(e) => setField("discountType", e.target.value)}>
                    <option value="percent">%</option>
                    <option value="amount">{formData.currency}</option>
                  </select>
                </div>
                <span>{discountAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-[14px]">
                <span>Shipping Charges</span>
                <div className="flex items-center gap-2">
                  <input type="number" className="h-8 w-24 rounded border border-slate-300 px-2 text-right" value={formData.shippingCharges} onChange={(e) => setField("shippingCharges", Number(e.target.value || 0))} />
                  <Info size={14} className="text-slate-400" />
                </div>
                <span>{Number(formData.shippingCharges || 0).toFixed(2)}</span>
              </div>
              {discountedGroupedTaxes.length > 0 && (
                <div className="space-y-2 border-t border-slate-200 pt-3">
                  {discountedGroupedTaxes.map((tax) => (
                    <div key={tax.label} className="flex justify-between items-center text-[14px]">
                      <span>{tax.label}</span>
                      <span>{Number(tax.amount || 0).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex justify-between items-center text-[14px]">
                <span>Adjustment</span>
                <div className="flex items-center gap-2">
                  <input type="number" className="h-8 w-24 rounded border border-slate-300 px-2 text-right" value={formData.adjustment} onChange={(e) => setField("adjustment", Number(e.target.value || 0))} />
                  <Info size={14} className="text-slate-400" />
                </div>
                <span>{Number(formData.adjustment || 0).toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between border-t border-slate-200 pt-4 text-[22px] font-semibold">
                <span>Total ({formData.currency})</span>
                <span>{total.toFixed(2)}</span>
              </div>
            </div>
            <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-5">
              <div className="flex items-center justify-between text-[16px]">
                <span>Early Payment Discount</span>
                <span>0.00</span>
              </div>
              <div className="flex items-center justify-between text-[22px] font-semibold">
                <span className="text-[16px]">Total After Early Payment Discount</span>
                <span>{total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-8 border-t border-slate-200 pt-5 lg:grid-cols-[1fr_360px]">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-800">Terms & Conditions</label>
            <textarea className="h-24 w-full rounded-md border border-slate-300 px-3 py-2 text-[14px]" placeholder="Enter the terms and conditions of your business to be displayed in your transaction" value={formData.termsAndConditions} onChange={(e) => setField("termsAndConditions", e.target.value)} />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-800">Attach File(s) to Debit Note</label>
            <button type="button" className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-300 bg-white px-4 text-[14px]">
              <Upload size={15} /> Upload File <ChevronDown size={14} />
            </button>
            <p className="mt-2 text-[12px] text-slate-500">You can upload a maximum of 10 files, 10MB each</p>
          </div>
        </section>
      </div >

      <div className="sticky bottom-0 z-10 flex items-center justify-between border-t border-slate-200 bg-white px-6 py-3">
        <div className="flex items-center gap-3">
          <button
            className="h-10 rounded-md border border-slate-300 bg-white px-4 text-[14px] disabled:opacity-50"
            onClick={() => handleSave("draft")}
            disabled={!!saveLoading}
          >
            {saveLoading === "draft" ? "Saving..." : "Save as Draft"}
          </button>
          <button
            className="inline-flex h-10 items-center gap-2 rounded-md bg-[#17a86b] px-4 text-[14px] font-semibold text-white disabled:opacity-50"
            onClick={() => handleSave("open")}
            disabled={!!saveLoading}
          >
            {saveLoading === "open" ? "Saving..." : "Save and Send"} <ChevronDown size={14} />
          </button>
          <button
            className="h-10 rounded-md border border-slate-300 bg-white px-4 text-[14px]"
            onClick={() => navigate("/sales/invoices")}
          >
            Cancel
          </button>
        </div>
        <div className="text-right text-[14px]">
          <div>Total Amount: {formData.currency} {total.toFixed(2)}</div>
        </div>
      </div>

      {invoiceId ? (
        <div className="fixed bottom-4 right-4 rounded-md border border-slate-200 bg-white px-3 py-2 text-[12px] text-slate-600 shadow">
          Source Invoice: {invoiceId}
        </div>
      ) : null}

      <ConfigurePaymentTermsModal
        isOpen={isConfigureTermsOpen}
        onClose={() => setIsConfigureTermsOpen(false)}
        initialTerms={paymentTerms}
        onSave={(updated) => {
          setPaymentTerms(updated);
          setIsConfigureTermsOpen(false);
          const newDueDate = computeDueDateFromTerm(formData.debitNoteDate, selectedPaymentTerm, updated);
          setFormData(prev => ({ ...prev, dueDate: newDueDate }));
        }}
      />
    </div>
  );
}
