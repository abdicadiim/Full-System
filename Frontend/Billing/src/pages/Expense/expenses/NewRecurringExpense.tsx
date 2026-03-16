import React, { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "react-toastify";
import {
  Search,
  Check,
  ChevronDown,
  Plus,
  X,
  FileText,
} from "lucide-react";
import { recurringExpensesAPI, customersAPI, accountantAPI, taxesAPI, reportingTagsAPI, currenciesAPI, projectsAPI } from "../../../services/api";
import { useCurrency } from "../../../hooks/useCurrency";
import { filterActiveRecords } from "../shared/activeFilters";
import NewCurrencyModal from "../../settings/organization-settings/setup-configurations/currencies/NewCurrencyModal";

const REPEAT_EVERY_OPTIONS = [
  "Week",
  "2 Weeks",
  "Month",
  "2 Months",
  "3 Months",
  "6 Months",
  "Year",
  "2 Years",
  "3 Years",
  "Custom"
];

const CUSTOM_REPEAT_UNITS = ["Day(s)", "Week(s)", "Month(s)", "Year(s)"];
const CATEGORY_OPTIONS = [
  "Advertising And Marketing",
  "Automobile Expense",
  "Consultant Expense",
  "Credit Card Charges",
  "Depreciation Expense",
  "IT and Internet Expenses",
  "Janitorial Expense",
  "Lodging",
  "Meals and Entertainment",
  "Office Supplies",
  "Postage",
  "Printing and Stationery",
  "Purchase Discounts",
  "Rent Expense",
  "Repairs and Maintenance",
  "Salaries and Employee Wages",
  "Telephone Expense",
  "Travel Expense",
  "Goods In Transit",
  "Prepaid Expenses",
];

const safeReadLocalArray = (keys: string[]) => {
  if (typeof window === "undefined") return [];
  for (const key of keys) {
    try {
      const raw = localStorage.getItem(key);
      const parsed = raw ? JSON.parse(raw) : [];
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch {
      // ignore and continue
    }
  }
  return [];
};

const getLocationName = (location: any) =>
  String(
    location?.name ||
    location?.locationName ||
    location?.location_name ||
    location?.branchName ||
    location?.branch_name ||
    location?.displayName ||
    location?.title ||
    ""
  ).trim();

const toLocalCategoryId = (name: string) =>
  `local-${String(name || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")}`;

const normalizeReportingTagOptions = (tag: any): string[] => {
  const candidates = Array.isArray(tag?.options)
    ? tag.options
    : Array.isArray(tag?.values)
      ? tag.values
      : [];
  const normalized = candidates
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
    .filter(Boolean);
  return Array.from(new Set(normalized));
};

const buildReportingTagMeta = (tag: any) => ({
  tagId: String(tag?._id || tag?.id || tag?.tagId || ""),
  tagName: String(tag?.name || tag?.tagName || tag?.title || "Reporting Tag"),
  options: normalizeReportingTagOptions(tag),
  isMandatory: Boolean(tag?.isMandatory || tag?.mandatory),
});

const extractTaxesFromResponse = (response: any): any[] => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.taxes)) return response.taxes;
  if (Array.isArray(response?.data?.taxes)) return response.data.taxes;
  if (Array.isArray(response?.results)) return response.results;
  return [];
};

const readTaxesFromLocalStorage = (): any[] => {
  const keys = ["taban_settings_taxes_v1", "taban_books_taxes", "taban_taxes"];
  const rows: any[] = [];
  keys.forEach((key) => {
    try {
      const raw = localStorage.getItem(key);
      const parsed = raw ? JSON.parse(raw) : [];
      if (Array.isArray(parsed)) rows.push(...parsed);
    } catch {
      // ignore malformed cache
    }
  });
  return rows;
};

const normalizeAndDedupTaxes = (rows: any[]): any[] => {
  const map = new Map<string, any>();
  rows.forEach((tax: any) => {
    const id = String(
      tax?._id || tax?.id || tax?.tax_id || tax?.taxId || tax?.name || tax?.taxName || tax?.tax_name || ""
    ).trim();
    const name = String(tax?.name || tax?.taxName || tax?.tax_name || tax?.displayName || tax?.title || "").trim();
    if (!id && !name) return;
    const key = (id || name).toLowerCase();
    if (!map.has(key)) map.set(key, tax);
  });
  return Array.from(map.values()).filter((tax: any) =>
    String(tax?.name || tax?.taxName || tax?.tax_name || tax?.displayName || tax?.title || "").trim().length > 0
  );
};

const getTaxIdentifier = (value: any): string => {
  if (!value) return "";
  if (typeof value === "string" || typeof value === "number") return String(value).trim();
  if (typeof value === "object") {
    return String(value?._id || value?.id || value?.tax_id || value?.taxId || value?.name || value?.taxName || value?.tax_name || "").trim();
  }
  return "";
};

const normalizeCurrencyOption = (currency: any) => {
  const id = String(currency?._id || currency?.id || "");
  const code = String(
    currency?.code ||
    currency?.currencyCode ||
    currency?.isoCode ||
    ""
  )
    .trim()
    .toUpperCase();
  const name = String(currency?.name || currency?.currencyName || "").trim();
  const isActive = String(currency?.status || "active").toLowerCase() !== "inactive";
  return { id, code, name, isActive, isBaseCurrency: Boolean(currency?.isBaseCurrency) };
};

const getProjectId = (project: any) =>
  String(project?._id || project?.id || project?.project_id || project?.projectId || "").trim();

const getProjectName = (project: any) =>
  String(project?.name || project?.projectName || project?.project_name || project?.title || "").trim();

const getProjectCustomerId = (project: any) => {
  const rawCustomer = project?.customer_id || project?.customerId || project?.customer;
  if (rawCustomer && typeof rawCustomer === "object") {
    return String(rawCustomer?._id || rawCustomer?.id || "").trim();
  }
  return String(rawCustomer || "").trim();
};

const getProjectCustomerName = (project: any) =>
  String(
    project?.customerName ||
    project?.customer_name ||
    project?.customer?.displayName ||
    project?.customer?.name ||
    ""
  ).trim();

export default function NewRecurringExpense() {
  const navigate = useNavigate();
  const location = useLocation();
  const editExpense = location.state?.editExpense || null;
  const fromExpense = location.state?.fromExpense || null;
  const preselectedCustomerId = location.state?.customerId || "";
  const preselectedCustomerName = location.state?.customerName || "";
  const isEditMode = Boolean(location.state?.isEdit && editExpense);

  // Form state
  const initialLocationsCache = safeReadLocalArray(["taban_locations_cache"]);
  const initialLocationName = getLocationName(initialLocationsCache[0]) || "Head Office";
  const [formData, setFormData] = useState({
    profileName: "",
    location: initialLocationName,
    repeatEvery: "Week",
    customRepeatValue: "1",
    customRepeatUnit: "Week(s)",
    startDate: new Date().toISOString().split('T')[0],
    endsOn: "",
    neverExpires: true,
    expenseAccount: "",
    amount: "",
    currency: "",
    is_inclusive_tax: false,
    tax: "",
    paidThrough: "",
    vendor: "",
    description: "",
    customerName: "",
    projectName: "",
    expenseAccountId: "",
    paidThroughId: "",
    vendor_id: "",
    customer_id: "",
    project_id: "",
    currencyId: "",
    taxId: "",
    locationId: "",
    isBillable: false,
  });

  // Dropdown states
  const [expenseAccountOpen, setExpenseAccountOpen] = useState(false);
  const [expenseAccountSearch, setExpenseAccountSearch] = useState("");
  const [customerOpen, setCustomerOpen] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");
  const [projectOpen, setProjectOpen] = useState(false);
  const [projectSearch, setProjectSearch] = useState("");
  const [repeatEveryOpen, setRepeatEveryOpen] = useState(false);
  const [repeatEverySearch, setRepeatEverySearch] = useState("");
  const [currencyOpen, setCurrencyOpen] = useState(false);
  const [locationOpen, setLocationOpen] = useState(false);
  const [locationSearch, setLocationSearch] = useState("");
  const [taxOpen, setTaxOpen] = useState(false);
  const [taxSearch, setTaxSearch] = useState("");
  const [newCurrencyModalOpen, setNewCurrencyModalOpen] = useState(false);

  // Data from API
  const [allCustomers, setAllCustomers] = useState([]);
  const [allProjects, setAllProjects] = useState<any[]>([]);
  const [expenseCategoryOptions, setExpenseCategoryOptions] = useState<{ id: string; name: string }[]>(
    CATEGORY_OPTIONS.map((name) => ({ id: toLocalCategoryId(name), name }))
  );
  const [availableTaxes, setAvailableTaxes] = useState<any[]>([]);
  const [availableCurrencies, setAvailableCurrencies] = useState<Array<{ id: string; code: string; name: string; isActive: boolean; isBaseCurrency: boolean }>>([]);
  const [reportingTagDefinitions, setReportingTagDefinitions] = useState<any[]>([]);
  const [reportingTagValues, setReportingTagValues] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const { code: baseCurrencyCode, baseCurrency } = useCurrency();
  const baseCurrencyId = baseCurrency?.id || "";

  // Refs
  const expenseAccountRef = useRef<HTMLDivElement>(null);
  const customerRef = useRef<HTMLDivElement>(null);
  const projectRef = useRef<HTMLDivElement>(null);
  const repeatEveryRef = useRef<HTMLDivElement>(null);
  const currencyRef = useRef<HTMLDivElement>(null);
  const locationRef = useRef<HTMLDivElement>(null);
  const taxRef = useRef<HTMLDivElement>(null);

  const loadCurrencies = async () => {
    try {
      const currenciesResponse = await currenciesAPI.getAll({ limit: 1000 });
      const rows = Array.isArray(currenciesResponse?.data) ? currenciesResponse.data : [];
      const normalized = rows
        .map((row: any) => normalizeCurrencyOption(row))
        .filter((row: any) => row.code && row.isActive);
      const deduped = normalized.filter(
        (row: any, idx: number, arr: any[]) => arr.findIndex((x: any) => x.code === row.code) === idx
      );
      deduped.sort((a, b) => a.code.localeCompare(b.code));
      setAvailableCurrencies(deduped);
    } catch (currencyError) {
      console.error("Error loading currencies:", currencyError);
      setAvailableCurrencies([]);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        // Load Customers
        const customersResponse = await customersAPI.getAll({ limit: 1000 });
        if (customersResponse && customersResponse.success) {
          const customersList = filterActiveRecords(customersResponse.data || []);
          setAllCustomers(customersList);
        }

        // Load Accounts
        const accountsResponse = await accountantAPI.getAccounts();
        if (accountsResponse && accountsResponse.success) {
          const accounts = filterActiveRecords(accountsResponse.data || []);
          processAccounts(accounts);
        }

        // Load Projects (local-storage backed)
        try {
          const projectsResponse = await projectsAPI.getAll({ limit: 10000 });
          const rows = Array.isArray(projectsResponse?.data) ? projectsResponse.data : [];
          setAllProjects(rows);
        } catch (projectError) {
          console.error("Error loading projects:", projectError);
          setAllProjects([]);
        }

        // Load Taxes
        try {
          const taxesResponse = await taxesAPI.getForTransactions().catch(() => null);
          const fallbackResponse = await taxesAPI.getAll({ status: "active" }).catch(() => null);
          const apiTaxes = [
            ...extractTaxesFromResponse(taxesResponse),
            ...extractTaxesFromResponse(fallbackResponse),
          ];
          const cachedTaxes = readTaxesFromLocalStorage();
          const normalizedTaxes = normalizeAndDedupTaxes([...apiTaxes, ...cachedTaxes]);
          const activeTaxes = filterActiveRecords(normalizedTaxes);
          const taxesToUse = activeTaxes.length > 0 ? activeTaxes : normalizedTaxes;
          setAvailableTaxes(taxesToUse);
          console.info("[NewRecurringExpense] Taxes loaded", {
            api: apiTaxes.length,
            cached: cachedTaxes.length,
            total: normalizedTaxes.length,
            active: activeTaxes.length,
          });
        } catch (taxError) {
          console.error("Error loading taxes:", taxError);
          const cachedTaxes = normalizeAndDedupTaxes(readTaxesFromLocalStorage());
          setAvailableTaxes(cachedTaxes);
        }

        await loadCurrencies();

        // Load Reporting Tags for last two fields (same source as Settings page)
        try {
          const tagsResponse = await reportingTagsAPI.getAll();
          const rows = Array.isArray(tagsResponse) ? tagsResponse : (tagsResponse?.data || []);
          const tagsToUse = (Array.isArray(rows) ? rows : [])
            .filter((tag: any) => {
              const applies = Array.isArray(tag?.appliesTo) ? tag.appliesTo.map((x: any) => String(x).toLowerCase()) : [];
              return (
                applies.length === 0 ||
                applies.includes("purchases") ||
                applies.includes("expense") ||
                applies.includes("expenses") ||
                applies.includes("all")
              );
            })
            .map((tag: any) => buildReportingTagMeta(tag))
            .filter((tag: any) => tag.tagId);
          setReportingTagDefinitions(tagsToUse);
          setReportingTagValues((prev) => {
            const next: Record<string, string> = {};
            tagsToUse.forEach((tag: any) => {
              next[tag.tagId] = prev[tag.tagId] || "None";
            });
            return next;
          });
        } catch (tagError) {
          console.error("Error loading reporting tags:", tagError);
          setReportingTagDefinitions([]);
        }
      } catch (error) {
        console.error("Error loading data:", error);
      }
    };

    loadData();

    // Load saved draft form data
    const savedDraft = localStorage.getItem("recurringExpenseDraft");
    if (savedDraft) {
      try {
        const draftData = JSON.parse(savedDraft);
        setFormData(prev => ({ ...prev, ...draftData }));
      } catch (e) {
        console.error("Error loading draft:", e);
      }
    }
  }, []);

  const formatDateForInput = (value: any): string => {
    if (!value) return "";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "";
    return parsed.toISOString().split("T")[0];
  };

  useEffect(() => {
    if (!isEditMode || !editExpense) return;

    const vendorName =
      editExpense?.vendor_name
      || editExpense?.vendorName
      || editExpense?.vendor?.displayName
      || editExpense?.vendor?.name
      || "";
    const vendorId = editExpense?.vendor_id || editExpense?.vendor?._id || editExpense?.vendor?.id || "";

    const customerName =
      editExpense?.customer_name
      || editExpense?.customerName
      || editExpense?.customer?.displayName
      || editExpense?.customer?.name
      || "";

    const accountName = editExpense?.account_name || editExpense?.expenseAccount || "";
    const accountId = editExpense?.account_id || editExpense?.account?._id || editExpense?.account?.id || "";

    const paidThroughName = editExpense?.paid_through_account_name || editExpense?.paidThrough || "";
    const paidThroughId =
      editExpense?.paid_through_account_id
      || editExpense?.paidThroughId
      || editExpense?.paid_through_account?._id
      || editExpense?.paid_through_account?.id
      || "";

    setFormData((prev) => ({
      ...prev,
      profileName: editExpense?.profile_name || editExpense?.profileName || prev.profileName,
      repeatEvery: editExpense?.repeat_every || editExpense?.repeatEvery || prev.repeatEvery,
      startDate: formatDateForInput(editExpense?.start_date || editExpense?.startDate) || prev.startDate,
      endsOn: formatDateForInput(editExpense?.end_date || editExpense?.endDate) || "",
      neverExpires: Boolean(editExpense?.never_expire ?? !editExpense?.end_date),
      expenseAccount: accountName || prev.expenseAccount,
      expenseAccountId: accountId || prev.expenseAccountId,
      amount: String(editExpense?.amount ?? prev.amount ?? ""),
      currency: editExpense?.currency_code || editExpense?.currency || prev.currency,
      currencyId: editExpense?.currency_id || editExpense?.currency?._id || editExpense?.currency?.id || prev.currencyId, // Added
      is_inclusive_tax: Boolean(editExpense?.is_inclusive_tax),
      tax: getTaxIdentifier(editExpense?.tax_id || editExpense?.tax) || prev.tax,
      taxId: getTaxIdentifier(editExpense?.tax_id || editExpense?.tax) || prev.taxId, // Added
      paidThrough: paidThroughName || prev.paidThrough,
      paidThroughId: paidThroughId || prev.paidThroughId,
      vendor: vendorName || prev.vendor,
      vendor_id: vendorId || prev.vendor_id,
      description: editExpense?.description || prev.description,
      customerName: customerName || prev.customerName,
      customer_id: editExpense?.customer_id || editExpense?.customer?._id || editExpense?.customer?.id || prev.customer_id,
      projectName:
        editExpense?.project_name
        || editExpense?.projectName
        || editExpense?.project?.name
        || prev.projectName,
      project_id:
        editExpense?.project_id
        || editExpense?.project?._id
        || editExpense?.project?.id
        || prev.project_id,
      isBillable: Boolean(editExpense?.is_billable ?? prev.isBillable),
      location: editExpense?.location || editExpense?.location_name || prev.location, // Added
      locationId: editExpense?.location_id || editExpense?.location?._id || editExpense?.location?.id || prev.locationId, // Added
    }));
  }, [isEditMode, editExpense]);

  useEffect(() => {
    if (!isEditMode || !editExpense || reportingTagDefinitions.length === 0) return;
    const sourceTags = Array.isArray((editExpense as any)?.reporting_tags)
      ? (editExpense as any).reporting_tags
      : Array.isArray((editExpense as any)?.reportingTags)
        ? (editExpense as any).reportingTags
        : [];
    if (sourceTags.length === 0) return;

    setReportingTagValues((prev) => {
      const next = { ...prev };
      reportingTagDefinitions.slice(0, 2).forEach((def: any) => {
        const found = sourceTags.find((tag: any) =>
          String(tag?.tagId || tag?.id || "") === String(def.tagId)
        );
        if (found) next[def.tagId] = String(found?.value || "None");
      });
      return next;
    });
  }, [isEditMode, editExpense, reportingTagDefinitions]);

  useEffect(() => {
    if (isEditMode || !fromExpense) return;

    const accountId =
      (typeof fromExpense?.account_id === "object" ? fromExpense?.account_id?._id || fromExpense?.account_id?.id : fromExpense?.account_id)
      || "";
    const paidThroughId =
      (typeof fromExpense?.paid_through_account_id === "object"
        ? fromExpense?.paid_through_account_id?._id || fromExpense?.paid_through_account_id?.id
        : fromExpense?.paid_through_account_id)
      || "";
    const vendorId =
      (typeof fromExpense?.vendor_id === "object" ? fromExpense?.vendor_id?._id || fromExpense?.vendor_id?.id : fromExpense?.vendor_id)
      || "";
    const customerId =
      (typeof fromExpense?.customer_id === "object" ? fromExpense?.customer_id?._id || fromExpense?.customer_id?.id : fromExpense?.customer_id)
      || "";

    setFormData((prev) => ({
      ...prev,
      profileName: prev.profileName || `Recurring - ${fromExpense?.reference || fromExpense?.expenseAccount || "Expense"}`,
      expenseAccount: fromExpense?.expenseAccount || fromExpense?.account_name || prev.expenseAccount,
      expenseAccountId: accountId || prev.expenseAccountId,
      amount: String(fromExpense?.amount ?? fromExpense?.total ?? prev.amount ?? ""),
      currency: fromExpense?.currency || fromExpense?.currency_code || prev.currency,
      currencyId: fromExpense?.currency_id || prev.currencyId, // Added
      is_inclusive_tax: Boolean(fromExpense?.is_inclusive_tax ?? prev.is_inclusive_tax),
      tax: getTaxIdentifier(fromExpense?.tax || fromExpense?.tax_id || prev.tax) || prev.tax,
      taxId: getTaxIdentifier(fromExpense?.tax || fromExpense?.tax_id) || prev.taxId, // Added
      paidThrough: fromExpense?.paidThrough || fromExpense?.paid_through_account_name || prev.paidThrough,
      paidThroughId: paidThroughId || prev.paidThroughId,
      vendor: fromExpense?.vendor || fromExpense?.vendor_name || prev.vendor,
      vendor_id: vendorId || prev.vendor_id,
      customerName: fromExpense?.customerName || fromExpense?.customer_name || prev.customerName,
      customer_id: customerId || prev.customer_id,
      projectName: fromExpense?.projectName || fromExpense?.project_name || prev.projectName,
      project_id: fromExpense?.project_id || prev.project_id,
      isBillable: Boolean(fromExpense?.is_billable ?? prev.isBillable),
      description: fromExpense?.notes || fromExpense?.description || prev.description,
      location: fromExpense?.location || fromExpense?.location_name || prev.location, // Added
      locationId: fromExpense?.location_id || prev.locationId, // Added
    }));
  }, [isEditMode, fromExpense]);

  useEffect(() => {
    if (isEditMode) return;
    if (!preselectedCustomerId && !preselectedCustomerName) return;

    setFormData((prev) => ({
      ...prev,
      customer_id: preselectedCustomerId || prev.customer_id,
      customerName: preselectedCustomerName || prev.customerName,
    }));
  }, [isEditMode, preselectedCustomerId, preselectedCustomerName]);

  useEffect(() => {
    if (!baseCurrencyCode) return;
    setFormData((prev) => {
      if (String(prev.currency || "").trim()) return prev;
      return { ...prev, currency: baseCurrencyCode, currencyId: baseCurrencyId };
    });
  }, [baseCurrencyCode, baseCurrencyId]);

  useEffect(() => {
    if (!formData.tax && formData.taxId) {
      setFormData((prev) => ({ ...prev, tax: String(prev.taxId || "") }));
    }
  }, [formData.tax, formData.taxId]);

  const processAccounts = (accounts: any[]) => {
    const categoryMap = new Map<string, { id: string; name: string }>();
    CATEGORY_OPTIONS.forEach((name) => {
      categoryMap.set(name.toLowerCase(), { id: toLocalCategoryId(name), name });
    });

    (accounts || []).forEach((acc: any) => {
      const accountName = String(acc?.accountName || "").trim();
      if (!accountName) return;
      const key = accountName.toLowerCase();
      if (!categoryMap.has(key)) return;
      categoryMap.set(key, {
        id: String(acc?._id || acc?.id || toLocalCategoryId(accountName)),
        name: accountName,
      });
    });

    const options = CATEGORY_OPTIONS.map((name) => {
      const existing = categoryMap.get(name.toLowerCase());
      return existing || { id: toLocalCategoryId(name), name };
    });
    setExpenseCategoryOptions(options);
  };

  // Save form data as draft when it changes
  useEffect(() => {
    const draftTimer = setTimeout(() => {
      localStorage.setItem("recurringExpenseDraft", JSON.stringify(formData));
    }, 500);
    return () => clearTimeout(draftTimer);
  }, [formData]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (expenseAccountRef.current && !expenseAccountRef.current.contains(event.target as Node)) {
        setExpenseAccountOpen(false);
        setExpenseAccountSearch("");
      }
      if (customerRef.current && !customerRef.current.contains(event.target as Node)) {
        setCustomerOpen(false);
        setCustomerSearch("");
      }
      if (projectRef.current && !projectRef.current.contains(event.target as Node)) {
        setProjectOpen(false);
        setProjectSearch("");
      }
      if (repeatEveryRef.current && !repeatEveryRef.current.contains(event.target as Node)) {
        setRepeatEveryOpen(false);
        setRepeatEverySearch("");
      }
      if (currencyRef.current && !currencyRef.current.contains(event.target as Node)) {
        setCurrencyOpen(false);
      }
      if (locationRef.current && !locationRef.current.contains(event.target as Node)) {
        setLocationOpen(false);
        setLocationSearch("");
      }
      if (taxRef.current && !taxRef.current.contains(event.target as Node)) {
        setTaxOpen(false);
        setTaxSearch("");
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    // content editable or textarea doesn't have checked, but we only check if type is checkbox
    const checked = type === "checkbox" ? (e.target as HTMLInputElement).checked : false;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const calculateNextExpenseDate = () => {
    if (!formData.startDate) return "";
    const startDate = new Date(formData.startDate);
    if (formData.repeatEvery === "Custom") {
      const value = Math.max(1, Number(formData.customRepeatValue) || 1);
      const nextDate = new Date(startDate);
      switch (formData.customRepeatUnit) {
        case "Day(s)":
          nextDate.setDate(nextDate.getDate() + value);
          break;
        case "Week(s)":
          nextDate.setDate(nextDate.getDate() + value * 7);
          break;
        case "Month(s)":
          nextDate.setMonth(nextDate.getMonth() + value);
          break;
        case "Year(s)":
          nextDate.setFullYear(nextDate.getFullYear() + value);
          break;
        default:
          nextDate.setDate(nextDate.getDate() + value * 7);
      }
      return nextDate.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" });
    }
    const frequencyMap = {
      "Week": 7, "2 Weeks": 14, "Month": 30, "2 Months": 60,
      "3 Months": 90, "6 Months": 180, "Year": 365, "2 Years": 730, "3 Years": 1095,
    };
    const days = frequencyMap[formData.repeatEvery as keyof typeof frequencyMap] || 7;
    const nextDate = new Date(startDate);
    nextDate.setDate(nextDate.getDate() + days);
    return nextDate.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" });
  };

  const getFilteredExpenseCategories = () => {
    const allOptions = [...expenseCategoryOptions];
    if (
      formData.expenseAccount &&
      !allOptions.some((item) => item.name.toLowerCase() === formData.expenseAccount.toLowerCase())
    ) {
      allOptions.unshift({
        id: formData.expenseAccountId || toLocalCategoryId(formData.expenseAccount),
        name: formData.expenseAccount,
      });
    }
    if (!expenseAccountSearch.trim()) return allOptions;
    return allOptions.filter((item) =>
      item.name.toLowerCase().includes(expenseAccountSearch.toLowerCase())
    );
  };

  const locationOptions = (() => {
    const names = Array.from(new Set(initialLocationsCache.map((loc: any) => getLocationName(loc)).filter(Boolean)));
    return names.length > 0 ? names : ["Head Office"];
  })();

  const filteredLocationOptions = locationOptions.filter((loc) =>
    loc.toLowerCase().includes(locationSearch.toLowerCase())
  );

  const filteredTaxes = availableTaxes.filter((tax: any) => {
    const taxName = tax?.taxName || tax?.name || tax?.tax_name || "Tax";
    const rate = Number(tax?.taxPercentage ?? tax?.rate ?? tax?.percentage ?? 0);
    const label = rate ? `${taxName} [${rate}%]` : taxName;
    return label.toLowerCase().includes(taxSearch.toLowerCase());
  });

  const filteredRepeatEveryOptions = REPEAT_EVERY_OPTIONS.filter((option) =>
    option.toLowerCase().includes(repeatEverySearch.toLowerCase())
  );
  const selectedCustomerName = String(formData.customerName || "").trim().toLowerCase();
  const selectedCustomerId = String(formData.customer_id || "").trim() || String(
    (allCustomers.find((c: any) => String(c.displayName || c.name || "").trim() === String(formData.customerName || "").trim()) as any)?._id
    || (allCustomers.find((c: any) => String(c.displayName || c.name || "").trim() === String(formData.customerName || "").trim()) as any)?.id
    || ""
  ).trim();
  const customerProjects = allProjects.filter((project: any) => {
    const projectCustomerId = getProjectCustomerId(project);
    const projectCustomerName = getProjectCustomerName(project).toLowerCase();
    const idMatch = selectedCustomerId && projectCustomerId && String(projectCustomerId) === String(selectedCustomerId);
    const nameMatch = selectedCustomerName && projectCustomerName && projectCustomerName === selectedCustomerName;
    return Boolean(idMatch || nameMatch);
  });
  const filteredCustomerProjects = customerProjects
    .map((project: any) => ({
      id: getProjectId(project),
      name: getProjectName(project),
    }))
    .filter((project: any) => project.id && project.name)
    .filter((project: any, index: number, arr: any[]) => arr.findIndex((x: any) => x.id === project.id) === index)
    .filter((project: any) => project.name.toLowerCase().includes(projectSearch.toLowerCase()));
  const currencyList = (() => {
    const list = [...availableCurrencies];
    const current = String(formData.currency || "").toUpperCase();
    if (current && !list.some((item) => item.code === current)) {
      list.unshift({
        id: String(formData.currencyId || `cur-${current.toLowerCase()}`),
        code: current,
        name: "",
        isActive: true,
        isBaseCurrency: false,
      });
    }
    return list;
  })();
  const reportingTagsToRender = reportingTagDefinitions.slice(0, 2);

  const handleSave = async () => {
    if (isSaving) return;
    if (!formData.expenseAccount) { alert("Please select an Expense Account"); return; }
    if (!formData.amount || parseFloat(formData.amount) <= 0) { alert("Please enter a valid Amount"); return; }
    if (!formData.startDate) { alert("Please select a Start Date"); return; }

    try {
      setIsSaving(true);
      const resolvedProfileName =
        formData.profileName.trim() ||
        `${formData.expenseAccount || "Recurring Expense"} - ${formData.startDate}`;
      const repeatEveryValue = formData.repeatEvery === "Custom"
        ? `${Math.max(1, Number(formData.customRepeatValue) || 1)} ${formData.customRepeatUnit}`
        : formData.repeatEvery;

      const recurringExpenseData = {
        profile_name: resolvedProfileName,
        repeat_every: repeatEveryValue,
        start_date: formData.startDate,
        end_date: formData.neverExpires ? null : formData.endsOn,
        account_id: formData.expenseAccountId || null,
        account_name: formData.expenseAccount,
        amount: parseFloat(formData.amount),
        currency_code: formData.currency,
        currency_id: formData.currencyId,
        vendor_id: formData.vendor_id || undefined,
        vendor_name: formData.vendor || undefined,
        description: formData.description || undefined,
        customer_id: formData.customer_id || undefined,
        customer_name: formData.customerName || undefined,
        is_billable: Boolean(formData.isBillable && formData.customer_id),
        project_id: formData.project_id || undefined,
        project_name: formData.projectName || undefined,
        status: "active",
        never_expire: formData.neverExpires,
        tax_id: formData.tax || formData.taxId || undefined,
        location: formData.location,
        location_id: formData.locationId,
        reporting_tags: reportingTagDefinitions
          .slice(0, 2)
          .map((tag: any) => ({
            tagId: tag.tagId,
            name: tag.tagName,
            value: reportingTagValues[tag.tagId] === "None" ? "" : String(reportingTagValues[tag.tagId] || ""),
          })),
      };

      if (!recurringExpenseData.account_id) {
        alert("Please select an expense account from the dropdown");
        return;
      }

      const editId = editExpense?._id || editExpense?.id || editExpense?.recurring_expense_id;
      const response = isEditMode && editId
        ? await recurringExpensesAPI.update(editId, recurringExpenseData)
        : await recurringExpensesAPI.create(recurringExpenseData);

      if (response && (response.code === 0 || response.success)) {
        const recurringExpenseId =
          (response as any).recurring_expense?._id
          || (response as any).data?._id
          || editId;

        if (!isEditMode && recurringExpenseId) {
          try {
            await recurringExpensesAPI.generateExpense(recurringExpenseId);
          } catch (genError) {
            console.error("Error generating initial expense:", genError);
          }
        }

        localStorage.removeItem("recurringExpenseDraft");
        window.dispatchEvent(new Event("recurringExpensesUpdated"));
        toast.success(isEditMode ? "Recurring expense updated successfully." : "Recurring expense created successfully.");
        navigate("/expenses/recurring-expenses");
      } else {
        alert((response as any)?.message || `Failed to ${isEditMode ? "update" : "create"} recurring expense`);
      }
    } catch (error) {
      console.error("Error saving recurring expense:", error);
      alert(`An error occurred while ${isEditMode ? "updating" : "creating"} the recurring expense.`);
    } finally {
      setIsSaving(false);
    }
  };



  return (
    <div className="min-h-screen w-full bg-white flex flex-col font-sans">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileText size={20} className="text-gray-900" />
          <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 m-0">New Recurring Expense</h1>
        </div>
        <button
          onClick={() => navigate("/expenses/recurring-expenses")}
          className="p-1 text-gray-500 hover:text-gray-700 transition-all duration-200"
        >
          <X size={22} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden bg-white">
        <div className="w-full bg-white p-0 rounded-none shadow-none border-none mb-0">

          <div className="bg-white px-4 py-3 space-y-3">

          {/* Profile Name */}
          <div className="grid grid-cols-1 md:grid-cols-[170px_minmax(0,420px)] gap-6 items-center group">
            <label className="text-sm font-semibold text-red-500 flex items-center">
              Profile Name
              <span className="text-red-500 ml-1 font-bold">*</span>
            </label>
            <input
              type="text"
              name="profileName"
              value={formData.profileName}
              onChange={handleChange}
              placeholder="Enter profile name"
              className="max-w-[420px] w-full h-10 px-3 py-2 text-sm bg-white border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200 placeholder-gray-400"
            />
          </div>

          {/* Location */}
          <div className="grid grid-cols-1 md:grid-cols-[170px_minmax(0,420px)] gap-6 items-center group">
            <label className="text-sm font-semibold text-gray-700">Location</label>
            <div className="relative max-w-[420px] w-full" ref={locationRef}>
              <button
                type="button"
                onClick={() => setLocationOpen((prev) => !prev)}
                className="w-full h-10 px-3 py-2 bg-white border border-gray-300 rounded-md flex items-center justify-between hover:border-gray-400 focus:ring-1 focus:ring-blue-500 transition-all duration-200 group/btn"
              >
                <span className={`text-sm font-medium ${formData.location ? "text-gray-900" : "text-gray-400"}`}>
                  {formData.location || "Select location"}
                </span>
                <ChevronDown size={16} className={`text-gray-400 group-hover/btn:text-blue-500 transition-transform duration-200 ${locationOpen ? 'rotate-180' : ''}`} />
              </button>
              {locationOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-md shadow-lg z-[100] max-h-[300px] overflow-hidden flex flex-col animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="p-3 border-b border-gray-100 flex items-center gap-2 bg-gray-50 sticky top-0">
                    <Search size={14} className="text-gray-400" />
                    <input
                      value={locationSearch}
                      onChange={(e) => setLocationSearch(e.target.value)}
                      placeholder="Search locations..."
                      className="w-full bg-transparent border-none outline-none text-sm font-medium placeholder-gray-400"
                      autoFocus
                    />
                  </div>
                  <div className="p-2 overflow-y-auto custom-scrollbar">
                    {filteredLocationOptions.map((loc) => {
                      const selected = formData.location === loc;
                      return (
                        <button
                          key={loc}
                          type="button"
                          onClick={() => {
                            setFormData((prev) => ({ ...prev, location: loc }));
                            setLocationOpen(false);
                            setLocationSearch("");
                          }}
                          className={`w-full px-4 py-2.5 rounded-lg text-sm text-left transition-all duration-200 flex items-center justify-between ${selected
                            ? "bg-blue-50 text-blue-600 font-medium"
                            : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                            }`}
                        >
                          {loc}
                          {selected && <Check size={14} className="text-blue-600" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Repeat Every */}
          <div className="grid grid-cols-1 md:grid-cols-[170px_minmax(0,420px)] gap-6 items-center group">
            <label className="text-sm font-semibold text-red-500 flex items-center">
              Repeat Every
              <span className="text-red-500 ml-1 font-bold">*</span>
            </label>
            <div className="flex flex-wrap items-center gap-3 w-full">
              <div className="relative max-w-[420px] w-full" ref={repeatEveryRef}>
                <button
                  type="button"
                  onClick={() => setRepeatEveryOpen((prev) => !prev)}
                  className="w-full h-10 px-3 py-2 bg-white border border-gray-300 rounded-md flex items-center justify-between hover:border-gray-400 focus:ring-1 focus:ring-blue-500 transition-all duration-200 group/btn"
                >
                  <span className="text-sm font-medium text-gray-900">{formData.repeatEvery}</span>
                  <ChevronDown size={16} className={`text-gray-400 group-hover/btn:text-blue-500 transition-transform duration-200 ${repeatEveryOpen ? 'rotate-180' : ''}`} />
                </button>
                {repeatEveryOpen && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-md shadow-lg z-[100] max-h-[300px] overflow-hidden flex flex-col animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="p-3 border-b border-gray-100 flex items-center gap-2 bg-gray-50 sticky top-0">
                      <Search size={14} className="text-gray-400" />
                      <input
                        value={repeatEverySearch}
                        onChange={(e) => setRepeatEverySearch(e.target.value)}
                        placeholder="Search frequency..."
                        className="w-full bg-transparent border-none outline-none text-sm font-medium placeholder-gray-400"
                        autoFocus
                      />
                    </div>
                    <div className="p-2 overflow-y-auto custom-scrollbar">
                      {filteredRepeatEveryOptions.map((opt) => {
                        const selected = formData.repeatEvery === opt;
                        return (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => {
                              setFormData((prev) => ({ ...prev, repeatEvery: opt }));
                              setRepeatEveryOpen(false);
                              setRepeatEverySearch("");
                            }}
                            className={`w-full px-4 py-2.5 rounded-lg text-sm text-left transition-all duration-200 flex items-center justify-between ${selected
                              ? "bg-blue-50 text-blue-600 font-medium"
                              : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                              }`}
                          >
                            <span>{opt}</span>
                            {selected && <Check size={14} className="text-blue-600" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
              {formData.repeatEvery === "Custom" && (
                <>
                  <input
                    type="number"
                    min={1}
                    value={formData.customRepeatValue}
                    onChange={(e) => setFormData((prev) => ({ ...prev, customRepeatValue: e.target.value }))}
                    className="w-20 h-10 px-3 py-2 text-sm bg-white border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200 text-center"
                  />
                  <select
                    value={formData.customRepeatUnit}
                    onChange={(e) => setFormData((prev) => ({ ...prev, customRepeatUnit: e.target.value }))}
                    className="w-32 h-10 px-3 py-2 text-sm bg-white border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200"
                  >
                    {CUSTOM_REPEAT_UNITS.map((unit) => (
                      <option key={unit} value={unit}>{unit}</option>
                    ))}
                  </select>
                </>
              )}
            </div>
          </div>

          {/* Start Date */}
          <div className="grid grid-cols-1 md:grid-cols-[170px_minmax(0,420px)] gap-6 items-start group">
            <label className="text-sm font-semibold text-gray-700 pt-3">Start Date</label>
            <div className="max-w-[420px] w-full space-y-2">
              <input
                type="date"
                name="startDate"
                value={formData.startDate}
                onChange={handleChange}
                className="w-full h-10 px-3 py-2 text-sm bg-white border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200"
              />
              {formData.startDate && (
                <div className="flex items-center gap-2 px-1 text-xs text-gray-500 font-medium italic">
                  <span>The recurring expense will be created on</span>
                  <span className="text-blue-600 font-bold not-italic underline decoration-blue-200 underline-offset-4">{calculateNextExpenseDate()}</span>
                </div>
              )}
            </div>
          </div>

          {/* Ends On */}
          <div className="grid grid-cols-1 md:grid-cols-[170px_minmax(0,420px)] gap-6 items-start group">
            <label className="text-sm font-semibold text-gray-700 pt-3">Ends On</label>
            <div className="max-w-[420px] w-full space-y-4">
              <input
                type="date"
                name="endsOn"
                value={formData.endsOn}
                onChange={handleChange}
                disabled={formData.neverExpires}
                className={`w-full h-10 px-3 py-2 text-sm border border-gray-300 rounded-md outline-none transition-all duration-200 ${formData.neverExpires
                  ? "bg-gray-100/50 text-gray-400 cursor-not-allowed border-gray-100"
                  : "bg-white text-gray-900 focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500"
                  }`}
              />
              <label className="flex items-center gap-2 cursor-pointer w-fit">
                <input
                  type="checkbox"
                  name="neverExpires"
                  checked={formData.neverExpires}
                  onChange={handleChange}
                  className="h-4 w-4"
                />
                <span className="text-sm text-gray-700">Never Expires</span>
              </label>
            </div>
          </div>


          {/* Expense Account */}
          <div className="grid grid-cols-1 md:grid-cols-[170px_minmax(0,420px)] gap-6 items-center group">
            <label className="text-sm font-semibold text-red-500 flex items-center">
              Category Name
              <span className="text-red-500 ml-1 font-bold">*</span>
            </label>
            <div className="relative max-w-[420px] w-full" ref={expenseAccountRef}>
              <button
                type="button"
                onClick={() => setExpenseAccountOpen(!expenseAccountOpen)}
                className={`w-full h-10 px-3 py-2 bg-white border rounded-md flex items-center justify-between transition-all duration-200 group/btn ${
                  expenseAccountOpen
                    ? "border-blue-500 ring-1 ring-blue-500"
                    : "border-gray-300 hover:border-gray-400 focus:ring-1 focus:ring-blue-500"
                }`}
              >
                <span className={`text-sm font-medium ${formData.expenseAccount ? "text-gray-900" : "text-gray-400"}`}>
                  {formData.expenseAccount || "Select an account"}
                </span>
                <ChevronDown size={16} className={`text-gray-400 transition-transform duration-200 ${expenseAccountOpen ? 'rotate-180' : ''}`} />
              </button>
              {expenseAccountOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-md shadow-lg z-[100] max-h-[350px] overflow-hidden flex flex-col">
                  <div className="p-2 border-b border-gray-100 bg-white sticky top-0">
                    <div className="h-9 px-3 border border-gray-300 rounded-md flex items-center gap-2">
                      <Search size={14} className="text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search"
                        value={expenseAccountSearch}
                        onChange={e => setExpenseAccountSearch(e.target.value)}
                        onClick={e => e.stopPropagation()}
                        autoFocus
                        className="w-full bg-transparent border-none outline-none text-sm text-gray-700 placeholder-gray-400"
                      />
                    </div>
                  </div>
                  <div className="overflow-y-auto custom-scrollbar p-1">
                    {getFilteredExpenseCategories().map((acc) => {
                      const selected = formData.expenseAccount === acc.name;
                      return (
                        <button
                          key={acc.id}
                          type="button"
                          onClick={() => {
                            setFormData(prev => ({ ...prev, expenseAccount: acc.name, expenseAccountId: acc.id }));
                            setExpenseAccountOpen(false);
                          }}
                          className={`w-full px-3 py-2 rounded-md text-sm text-left transition-all duration-150 flex items-center justify-between ${
                            selected
                              ? "bg-blue-50 text-blue-600 font-medium"
                              : "text-gray-700 hover:bg-gray-50"
                          }`}
                        >
                          <span>{acc.name}</span>
                          {selected && <Check size={14} className="text-blue-600" />}
                        </button>
                      );
                    })}
                    {getFilteredExpenseCategories().length === 0 && (
                      <div className="px-3 py-5 text-sm text-gray-400 text-center">No categories found</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          </div>

          <div className="px-4 py-3 space-y-2">

          {/* Amount */}
          <div className="grid grid-cols-1 md:grid-cols-[170px_minmax(0,420px)] gap-6 items-center group mt-1">
            <label className="text-sm font-medium text-red-500 flex items-center">
              Amount
              <span className="text-red-500 ml-1 font-bold">*</span>
            </label>
            <div className="flex max-w-[420px] w-full">
              <div className="relative group/curr" ref={currencyRef}>
                <button
                  type="button"
                  onClick={() => setCurrencyOpen(!currencyOpen)}
                  className="h-9 px-3 bg-white border border-gray-300 border-r-0 rounded-l-md flex items-center gap-2 text-sm text-gray-700 transition-colors duration-200"
                >
                  {String(formData.currency || baseCurrencyCode || "USD").toUpperCase()}
                  <ChevronDown size={14} className={`text-gray-400 group-hover/curr:text-blue-500 transition-transform ${currencyOpen ? 'rotate-180' : ''}`} />
                </button>
                {currencyOpen && (
                  <div className="absolute top-full left-0 mt-2 bg-white border border-gray-200 rounded-md shadow-lg z-[100] w-[250px] overflow-hidden">
                    <div className="max-h-[260px] overflow-y-auto custom-scrollbar p-1">
                      {currencyList.map((curr) => {
                        const selected = String(formData.currency || "").toUpperCase() === curr.code;
                        return (
                          <button
                            key={curr.id || curr.code}
                            type="button"
                            onClick={() => {
                              setFormData((prev) => ({ ...prev, currency: curr.code, currencyId: curr.id || prev.currencyId }));
                              setCurrencyOpen(false);
                            }}
                            className={`w-full px-3 py-2 rounded-md text-sm text-left transition-all duration-150 flex items-center justify-between ${
                              selected ? "bg-blue-50 text-blue-600 font-medium" : "text-gray-700 hover:bg-gray-50"
                            }`}
                          >
                            <span>{curr.code}</span>
                            {selected && <Check size={14} className="text-blue-600" />}
                          </button>
                        );
                      })}
                      {currencyList.length === 0 && (
                        <div className="px-3 py-3 text-sm text-gray-400 text-center">No currencies found</div>
                      )}
                    </div>
                    <div className="border-t border-gray-100 p-1">
                      <button
                        type="button"
                        onClick={() => {
                          setCurrencyOpen(false);
                          setNewCurrencyModalOpen(true);
                        }}
                        className="w-full px-3 py-2 rounded-md text-sm text-left text-[#156372] hover:bg-gray-50 flex items-center gap-2"
                      >
                        <Plus size={14} />
                        New Currency
                      </button>
                    </div>
                  </div>
                )}
              </div>
              <input
                type="number"
                name="amount"
                value={formData.amount}
                onChange={handleChange}
                placeholder="0.00"
                className="flex-1 h-9 px-3 py-2 text-sm bg-white border border-gray-300 rounded-r-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200 placeholder-gray-400"
              />
            </div>
          </div>

          {/* Amount Is */}
          <div className="grid grid-cols-1 md:grid-cols-[170px_minmax(0,420px)] gap-6 items-center group">
            <label className="text-sm font-medium text-red-500 flex items-center">
              Amount Is
              <span className="text-red-500 ml-1 font-bold">*</span>
            </label>
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={formData.is_inclusive_tax === true}
                  onChange={() => setFormData(prev => ({ ...prev, is_inclusive_tax: true }))}
                  className="h-4 w-4"
                />
                <span className="text-sm text-gray-700">Tax Inclusive</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={formData.is_inclusive_tax === false}
                  onChange={() => setFormData(prev => ({ ...prev, is_inclusive_tax: false }))}
                  className="h-4 w-4"
                />
                <span className="text-sm text-gray-700">Tax Exclusive</span>
              </label>
            </div>
          </div>

          {/* Tax */}
          <div className="grid grid-cols-1 md:grid-cols-[170px_minmax(0,420px)] gap-6 items-center group">
            <label className="text-sm font-medium text-gray-700">Tax</label>
            <div className="relative max-w-[420px] w-full" ref={taxRef}>
              <button
                type="button"
                onClick={() => setTaxOpen((prev) => !prev)}
                className="w-full h-9 px-3 py-2 bg-white border border-gray-300 rounded-md flex items-center justify-between hover:border-gray-400 focus:ring-1 focus:ring-blue-500 transition-all duration-200 group/btn"
              >
                <span className={`text-sm font-medium ${formData.tax ? "text-gray-900" : "text-gray-400"}`}>
                  {(() => {
                    const currentTaxValue = String(formData.tax || "").trim().toLowerCase();
                    const selectedTax = availableTaxes.find((tax: any) => {
                      const id = String(tax?._id || tax?.id || "").trim().toLowerCase();
                      const name = String(tax?.taxName || tax?.name || tax?.tax_name || "").trim().toLowerCase();
                      return currentTaxValue === id || (currentTaxValue && currentTaxValue === name);
                    });
                    if (!selectedTax) return "Select a Tax";
                    const taxName = selectedTax?.taxName || selectedTax?.name || selectedTax?.tax_name || "Tax";
                    const rate = Number(selectedTax?.taxPercentage ?? selectedTax?.rate ?? selectedTax?.percentage ?? 0);
                    return rate ? `${taxName} [${rate}%]` : taxName;
                  })()}
                </span>
                <ChevronDown size={16} className={`text-gray-400 group-hover/btn:text-blue-500 transition-transform duration-200 ${taxOpen ? 'rotate-180' : ''}`} />
              </button>
              {taxOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-md shadow-lg z-[100] max-h-[300px] overflow-hidden flex flex-col animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="p-3 border-b border-gray-100 flex items-center gap-2 bg-gray-50 sticky top-0">
                    <Search size={14} className="text-gray-400" />
                    <input
                      value={taxSearch}
                      onChange={(e) => setTaxSearch(e.target.value)}
                      placeholder="Search taxes..."
                      className="w-full bg-transparent border-none outline-none text-sm font-medium placeholder-gray-400"
                      autoFocus
                    />
                  </div>
                  <div className="p-2 overflow-y-auto custom-scrollbar">
                    <button
                      type="button"
                      onClick={() => {
                        setFormData((prev) => ({ ...prev, tax: "", taxId: "" }));
                        setTaxOpen(false);
                        setTaxSearch("");
                      }}
                      className={`w-full px-4 py-2.5 rounded-lg text-sm text-left transition-all duration-200 mb-1 ${!formData.tax
                          ? "bg-blue-50 text-blue-600 font-medium"
                          : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                        }`}
                    >
                      Non-Taxable
                    </button>
                    <div className="px-4 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-t border-gray-50 mt-1 mb-1">Selectable Taxes</div>
                    {filteredTaxes.map((tax: any) => {
                      const taxId = String(tax?._id || tax?.id);
                      const taxName = tax?.taxName || tax?.name || tax?.tax_name || "Tax";
                      const rate = Number(tax?.taxPercentage ?? tax?.rate ?? tax?.percentage ?? 0);
                      const label = rate ? `${taxName} [${rate}%]` : taxName;
                      const currentTaxValue = String(formData.tax || "").trim().toLowerCase();
                      const selected = currentTaxValue === taxId.toLowerCase() || currentTaxValue === String(taxName || "").trim().toLowerCase();
                      return (
                        <button
                          key={taxId}
                          type="button"
                          onClick={() => {
                            setFormData((prev) => ({ ...prev, tax: taxId, taxId }));
                            setTaxOpen(false);
                            setTaxSearch("");
                          }}
                          className={`w-full px-4 py-2.5 rounded-lg text-sm text-left transition-all duration-200 flex items-center justify-between ${selected
                              ? "bg-blue-50 text-blue-600 font-medium"
                              : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                            }`}
                        >
                          {label}
                          {selected && <Check size={14} className="text-blue-600" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          <div className="grid grid-cols-1 md:grid-cols-[170px_minmax(0,420px)] gap-6 items-start group">
            <label className="text-sm font-medium text-gray-700 pt-2">Notes</label>
            <div className="max-w-[420px] w-full relative">
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Max. 500 characters"
                className="w-full h-[88px] p-3 text-sm bg-white border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200 placeholder-gray-400 resize-y"
                maxLength={500}
              />
            </div>
          </div>

          <div className="h-px bg-gray-200 mt-3 mb-2" />

          </div>

          <div className="px-4 pt-1">

          {/* Customer */}
          <div className="grid grid-cols-1 md:grid-cols-[170px_minmax(0,420px)] gap-6 items-center group py-2">
            <label className="text-sm font-medium text-gray-700">Customer Name</label>
            <div className="max-w-[420px] w-full">
              <div className="relative w-full flex items-center gap-2">
                <div className="relative flex-1 flex items-stretch" ref={customerRef}>
                  <button
                    type="button"
                    onClick={() => setCustomerOpen(!customerOpen)}
                    className="flex-1 h-9 px-3 py-2 bg-white border border-gray-300 border-r-0 rounded-l-md flex items-center justify-between hover:border-gray-400 transition-all duration-200 group/btn"
                  >
                    <span className={`text-sm font-medium ${formData.customerName ? "text-gray-900" : "text-gray-400"}`}>
                      {formData.customerName || "Select customer"}
                    </span>
                    <ChevronDown size={16} className={`text-gray-400 group-hover/btn:text-blue-500 transition-transform ${customerOpen ? 'rotate-180' : ''}`} />
                  </button>
                  <div className="w-9 h-9 bg-[#22b573] flex items-center justify-center rounded-r-md text-white">
                    <Search size={16} />
                  </div>

                  {customerOpen && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-md shadow-lg z-[100] max-h-[350px] overflow-hidden flex flex-col animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="p-3 border-b border-gray-100 flex items-center gap-2 bg-gray-50 sticky top-0">
                        <Search size={14} className="text-gray-400" />
                        <input
                          type="text"
                          placeholder="Search customers..."
                          value={customerSearch}
                          onChange={e => setCustomerSearch(e.target.value)}
                          onClick={e => e.stopPropagation()}
                          autoFocus
                          className="w-full bg-transparent border-none outline-none text-sm font-medium placeholder-gray-400"
                        />
                      </div>
                      <div className="p-1 overflow-y-auto custom-scrollbar">
                        {allCustomers.filter((c: any) => (c.displayName || c.name || "").toLowerCase().includes(customerSearch.toLowerCase())).map((c: any) => {
                          const name = c.displayName || c.name;
                          const selected = String(formData.customerName || "") === String(name || "");
                          return (
                            <button
                              key={c.id || c._id}
                              type="button"
                              onClick={() => {
                                setFormData(prev => ({
                                  ...prev,
                                  customerName: name,
                                  customer_id: c._id || c.id,
                                  projectName: "",
                                  project_id: "",
                                  isBillable: false,
                                }));
                                setCustomerOpen(false);
                                setProjectOpen(false);
                                setProjectSearch("");
                              }}
                              className={`w-full px-4 py-2.5 rounded-lg text-sm text-left transition-all duration-200 flex items-center justify-between ${selected
                                ? "bg-blue-50 text-blue-600 font-medium"
                                : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                                }`}
                            >
                              {name}
                              {selected && <Check size={14} className="text-blue-600" />}
                            </button>
                          );
                        })}
                        {allCustomers.length === 0 && <div className="px-4 py-8 text-center text-sm text-gray-400 italic font-medium">No customers found</div>}
                      </div>
                    </div>
                  )}
                </div>
                {formData.customer_id && (
                  <label className="inline-flex items-center gap-2 text-sm text-gray-700 whitespace-nowrap">
                    <input
                      type="checkbox"
                      name="isBillable"
                      checked={!!formData.isBillable}
                      onChange={handleChange}
                      className="h-4 w-4 rounded border-gray-300 text-[#156372] focus:ring-[#156372]"
                    />
                    Billable
                  </label>
                )}
              </div>
            </div>
          </div>

          {formData.customer_id && (
            <div className="grid grid-cols-1 md:grid-cols-[170px_minmax(0,420px)] gap-6 items-center group py-1">
              <label className="text-sm font-medium text-gray-700">Projects</label>
              <div className="relative max-w-[420px] w-full" ref={projectRef}>
                <button
                  type="button"
                  onClick={() => setProjectOpen((prev) => !prev)}
                  className="w-full h-9 px-3 py-2 bg-white border border-gray-300 rounded-md flex items-center justify-between hover:border-gray-400 transition-all duration-200"
                >
                  <span className={`text-sm font-medium ${formData.projectName ? "text-gray-900" : "text-gray-400"}`}>
                    {formData.projectName || "Select a project"}
                  </span>
                  <ChevronDown size={16} className={`text-gray-400 transition-transform ${projectOpen ? "rotate-180" : ""}`} />
                </button>

                {projectOpen && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-md shadow-lg z-[100] max-h-[320px] overflow-hidden flex flex-col">
                    <div className="p-3 border-b border-gray-100 flex items-center gap-2 bg-gray-50">
                      <Search size={14} className="text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search projects..."
                        value={projectSearch}
                        onChange={(e) => setProjectSearch(e.target.value)}
                        className="w-full bg-transparent border-none outline-none text-sm font-medium placeholder-gray-400"
                      />
                    </div>
                    <div className="p-1 overflow-y-auto custom-scrollbar">
                      {filteredCustomerProjects.map((project: any) => {
                        const selected = String(formData.project_id || "") === String(project.id);
                        return (
                          <button
                            key={project.id}
                            type="button"
                            onClick={() => {
                              setFormData((prev) => ({ ...prev, project_id: project.id, projectName: project.name }));
                              setProjectOpen(false);
                              setProjectSearch("");
                            }}
                            className={`w-full px-4 py-2.5 rounded-lg text-sm text-left transition-all duration-200 flex items-center justify-between ${selected
                              ? "bg-blue-50 text-blue-600 font-medium"
                              : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                              }`}
                          >
                            {project.name}
                            {selected && <Check size={14} className="text-blue-600" />}
                          </button>
                        );
                      })}
                      {filteredCustomerProjects.length === 0 && (
                        <div className="px-4 py-8 text-center text-sm text-gray-400 italic font-medium">
                          No projects found for selected customer
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="h-px bg-gray-200 mt-2 mb-3" />

          <div className="pt-1 pb-1">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-10">
              {[0, 1].map((idx) => {
                const tag = reportingTagsToRender[idx];
                const fallbackLabel = idx === 0 ? "wsq" : "sc";
                const tagId = tag?.tagId || `fallback-${idx}`;
                const label = fallbackLabel;
                const isMandatory = true;
                const options = Array.isArray(tag?.options) ? tag.options : [];
                const selected = reportingTagValues[tagId] || "None";
                return (
                  <div key={tagId} className="grid grid-cols-[170px_minmax(0,245px)] gap-4 items-center">
                    <label className={`text-sm ${isMandatory ? "text-red-500" : "text-gray-700"} font-medium`}>
                      {label} {isMandatory ? "*" : ""}
                    </label>
                    <select
                      value={selected}
                      onChange={(e) => setReportingTagValues((prev) => ({ ...prev, [tagId]: e.target.value }))}
                      className="h-9 px-3 bg-white border border-gray-300 rounded-md text-sm text-gray-700"
                    >
                      <option value="None">None</option>
                      {options.map((option: string) => (
                        <option key={`${tagId}-${option}`} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              })}
            </div>
          </div>

          </div>

          {/* Action Buttons */}
          <div className="sticky bottom-0 flex items-center gap-3 bg-white px-4 py-3 z-20">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className={`px-6 h-10 rounded-md text-sm font-semibold text-white transition-all duration-200 ${isSaving ? "bg-[#156372]/70 cursor-not-allowed" : "bg-[#156372] hover:bg-[#0f4f5a]"}`}
            >
              {isSaving ? "Saving..." : "Save"}
            </button>
            <button
              onClick={() => navigate("/expenses/recurring-expenses")}
              disabled={isSaving}
              className="px-6 h-10 rounded-md text-sm font-medium text-gray-700 border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
          </div>

        </div>
      </div>

      {newCurrencyModalOpen && (
        <NewCurrencyModal
          onClose={() => setNewCurrencyModalOpen(false)}
          onSave={async (currencyData) => {
            try {
              const code = String(currencyData.code || "").split(" - ")[0].trim().toUpperCase();
              const symbol = String(currencyData.symbol || "").trim();
              const name = String(currencyData.name || "").trim();
              const decimalPlaces = String(currencyData.decimalPlaces || "2");
              const format = String(currencyData.format || "1,234,567.89");
              const isBaseCurrency = Boolean(currencyData.isBaseCurrency);

              if (!code || !name || !symbol) {
                alert("Please enter currency code, name, and symbol");
                return;
              }

              const existing = await currenciesAPI.getAll({ limit: 1000 });
              const rows = Array.isArray(existing?.data) ? existing.data : [];
              const hasDuplicate = rows.some((row: any) =>
                String(row?.code || row?.currencyCode || "").trim().toUpperCase() === code
              );
              if (hasDuplicate) {
                alert("Currency code already exists.");
                return;
              }

              const created = await currenciesAPI.create({
                code,
                symbol,
                name,
                decimalPlaces,
                format,
                isBaseCurrency,
                status: "Active",
              });

              await loadCurrencies();
              const createdId = String(created?.data?._id || created?.data?.id || "");
              setFormData((prev) => ({ ...prev, currency: code, currencyId: createdId || prev.currencyId }));
              setNewCurrencyModalOpen(false);
            } catch (error) {
              console.error("Error creating currency:", error);
              alert("Failed to create currency");
            }
          }}
        />
      )}
    </div>
  );
}




