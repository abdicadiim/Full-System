import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { Search, X, Plus, ChevronDown, ChevronUp, Settings, Info, BriefcaseBusiness, Check } from "lucide-react";
import { toast } from "react-toastify";
import { getCustomers, getInvoiceById, saveInvoice, updateInvoice } from "../../salesModel";
import { customersAPI, invoicesAPI, projectsAPI, reportingTagsAPI, taxesAPI } from "../../../../services/api";
import { useOrganizationBranding } from "../../../../hooks/useOrganizationBranding";

type TaxOption = { id: string; name: string; rate: number };
type ProjectOption = { id: string; name: string; customer?: string; status?: string };
type ReportingTag = {
  id: string;
  name: string;
  status?: string;
  required?: boolean;
  mandatory?: boolean;
  options?: any[];
  tagOptions?: any[];
};
type LineRow = {
  id: number;
  description: string;
  taxId: string;
  amount: number;
};

const todayISO = () => new Date().toISOString().slice(0, 10);
const LS_LOCATIONS_ENABLED_KEY = "taban_locations_enabled";
const LS_LOCATIONS_CACHE_KEY = "taban_locations_cache";

export default function NewRetailInvoice() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const { accentColor } = useOrganizationBranding();
  const isEditMode = Boolean(id);

  const [loading, setLoading] = useState(false);
  const [savingMode, setSavingMode] = useState<"draft" | "sent" | null>(null);

  const [invoiceNumber, setInvoiceNumber] = useState("RET-00001");
  const [isRetainerNumberModalOpen, setIsRetainerNumberModalOpen] = useState(false);
  const [retainerNumberMode, setRetainerNumberMode] = useState<"auto" | "manual">("auto");
  const [retainerPrefix, setRetainerPrefix] = useState("RET-");
  const [retainerNextNumber, setRetainerNextNumber] = useState("00001");
  const RETAINER_SELECTED_VIEW_STORAGE_KEY = "taban_retainer_selected_view_v1";
  const ensureRetainerListAllView = () => {
    try {
      localStorage.setItem(RETAINER_SELECTED_VIEW_STORAGE_KEY, "all");
    } catch {
      // ignore local storage errors
    }
  };
  const [customerId, setCustomerId] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("Head Office");
  const [reference, setReference] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(todayISO());
  const [projectId, setProjectId] = useState("");
  const [xcv, setXcv] = useState("None");
  const [customerNotes, setCustomerNotes] = useState("");
  const [terms, setTerms] = useState("");

  const [customers, setCustomers] = useState<any[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [taxes, setTaxes] = useState<TaxOption[]>([]);
  const [availableReportingTags, setAvailableReportingTags] = useState<ReportingTag[]>([]);
  const [reportingTagOptionsById, setReportingTagOptionsById] = useState<Record<string, string[]>>({});
  const [loadingReportingTagId, setLoadingReportingTagId] = useState<string | null>(null);
  const [reportingTagSelections, setReportingTagSelections] = useState<Record<string, string>>({});
  const [openReportingTagId, setOpenReportingTagId] = useState<string | null>(null);
  const [reportingTagSearch, setReportingTagSearch] = useState("");
  const [isLocationFeatureEnabled, setIsLocationFeatureEnabled] = useState(false);
  const [locationOptions, setLocationOptions] = useState<string[]>(["Head Office"]);
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");
  const [isNewCustomerQuickActionOpen, setIsNewCustomerQuickActionOpen] = useState(false);
  const [isSavingQuickCustomer, setIsSavingQuickCustomer] = useState(false);
  const [isQuickCustomerMoreDetailsOpen, setIsQuickCustomerMoreDetailsOpen] = useState(false);
  const [quickCustomerFiles, setQuickCustomerFiles] = useState<File[]>([]);
  const [quickCustomerTab, setQuickCustomerTab] = useState<"otherDetails" | "address" | "customFields" | "reportingTags" | "remarks">("otherDetails");
  const [quickCustomerForm, setQuickCustomerForm] = useState({
    customerType: "business",
    salutation: "",
    firstName: "",
    lastName: "",
    companyName: "",
    displayName: "",
    email: "",
    customerNumber: "CUS-00001",
    workCountryCode: "+213",
    workPhone: "",
    mobileCountryCode: "+213",
    mobile: "",
    language: "English",
    taxRate: "",
    companyId: "",
    currency: "AMD - Armenian Dram",
    paymentTerms: "Due on Receipt",
    priceList: "",
    enablePortal: false,
    websiteUrl: "",
    department: "",
    designation: "",
    xHandle: "",
    skype: "",
    facebook: "",
    notes: "",
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
    tagSc: "None",
    tagWsq: "None",
  });

  const customerDropdownRef = useRef<HTMLDivElement | null>(null);
  const quickCustomerFileInputRef = useRef<HTMLInputElement | null>(null);
  const prefillFromProjectRef = useRef(false);

  const [rows, setRows] = useState<LineRow[]>([
    { id: Date.now(), description: "", taxId: "", amount: 0 },
  ]);
  const [taxPreference, setTaxPreference] = useState<"Tax Exclusive" | "Tax Inclusive">("Tax Exclusive");
  const [isTaxPreferenceOpen, setIsTaxPreferenceOpen] = useState(false);
  const [taxPreferenceSearch, setTaxPreferenceSearch] = useState("");

  const extractRetainerDigits = (value: any) => {
    const raw = String(value || "").trim();
    const matches = raw.match(/(\d+)\s*$/);
    return matches ? matches[1] : "";
  };

  const deriveRetainerPrefix = (value: any, fallbackPrefix = "RET-") => {
    const raw = String(value || "").trim();
    const match = raw.match(/^(.*?)(\d+)\s*$/);
    if (match && String(match[1] || "").trim()) return String(match[1]);
    return fallbackPrefix;
  };

  const buildRetainerNumber = (prefixValue: any, numberValue: any) => {
    const safePrefix = String(prefixValue || "RET-").trim() || "RET-";
    const rawDigits = extractRetainerDigits(numberValue);
    const safeDigits = rawDigits ? rawDigits.padStart(5, "0") : "00001";
    return `${safePrefix}${safeDigits}`;
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        const [custs, nextNumResp, taxResp, projectResp, reportingTagsResp, editInvoiceResp] = await Promise.all([
          getCustomers(),
          invoicesAPI.getNextNumber("RET-").catch(() => null),
          taxesAPI.getForTransactions().catch(() => null),
          projectsAPI.getAll({ limit: 1000 }).catch(() => ({ data: [] })),
          reportingTagsAPI.getAll().catch(() => ({ data: [] })),
          isEditMode && id ? getInvoiceById(id).catch(() => null) : Promise.resolve(null),
        ]);

        setCustomers(Array.isArray(custs) ? custs : []);

        const nextNumber =
          nextNumResp?.data?.nextNumber || nextNumResp?.nextNumber || nextNumResp?.data?.invoiceNumber;
        if (!isEditMode && nextNumber && typeof nextNumber === "string") {
          setInvoiceNumber(nextNumber);
          setRetainerPrefix(deriveRetainerPrefix(nextNumber, "RET-"));
          setRetainerNextNumber(extractRetainerDigits(nextNumber) || "00001");
        }

        const fallbackTaxesResp =
          Array.isArray((taxResp as any)?.data) && (taxResp as any).data.length > 0
            ? null
            : await taxesAPI.getAll({ limit: 10000 }).catch(() => ({ data: [] }));

        const taxSource = Array.isArray((taxResp as any)?.data)
          ? (taxResp as any).data
          : Array.isArray((taxResp as any)?.taxes)
          ? (taxResp as any).taxes
          : Array.isArray((fallbackTaxesResp as any)?.data)
          ? (fallbackTaxesResp as any).data
          : Array.isArray((fallbackTaxesResp as any)?.taxes)
          ? (fallbackTaxesResp as any).taxes
          : [];
        const taxList = taxSource
          .map((t: any) => ({
            id: String(t._id || t.id || t.taxId || ""),
            name: String(t.name || t.taxName || t.displayName || "Tax"),
            rate: Number(t.rate ?? t.taxRate ?? t.percentage ?? t.taxPercentage ?? 0),
          }))
          .filter((t: TaxOption) => t.id)
          .filter((t: TaxOption, index: number, list: TaxOption[]) => list.findIndex((row) => row.id === t.id) === index);
        setTaxes(taxList);

        const projectSource = Array.isArray((projectResp as any)?.data)
          ? (projectResp as any).data
          : Array.isArray((projectResp as any)?.projects)
          ? (projectResp as any).projects
          : [];
        const projectList = projectSource
          .map((p: any) => ({
            id: String(p._id || p.id),
            name: String(p.projectName || p.name || "Project"),
            customer: String(
              p.customer?._id ||
                p.customer?.id ||
                p.customerId ||
                p.customer_id ||
                p.customer ||
                ""
            ),
            status: String(p.status || "").toLowerCase(),
          }))
          .filter((p: ProjectOption) => p.id);
        setProjects(projectList);

        const reportingSource = Array.isArray((reportingTagsResp as any)?.data)
          ? (reportingTagsResp as any).data
          : Array.isArray((reportingTagsResp as any)?.reportingTags)
          ? (reportingTagsResp as any).reportingTags
          : [];
        const tags = reportingSource
          .map((tag: any) => ({
            ...tag,
            id: String(tag._id || tag.id),
            name: String(
              tag.label ||
                tag.displayLabel ||
                tag.display_name ||
                tag.tagLabel ||
                tag.tag_name ||
                tag.tagName ||
                tag.name ||
                tag.displayName ||
                ""
            ).trim(),
            status: String(tag.status || "").toLowerCase(),
          }))
          .filter((tag: ReportingTag) => tag.id && tag.name)
          .filter((tag: ReportingTag) => tag.status !== "inactive");
        setAvailableReportingTags(tags);
        setReportingTagSelections((prev) => {
          const next: Record<string, string> = {};
          tags.forEach((tag: ReportingTag) => {
            next[tag.id] = prev[tag.id] || "None";
          });
          return next;
        });

        if (isEditMode && editInvoiceResp) {
          const existing: any = editInvoiceResp;
          const selectedCustomerId = String(
            existing?.customer?._id || existing?.customer?.id || existing?.customerId || existing?.customer || ""
          );

          setInvoiceNumber(String(existing?.invoiceNumber || "RET-00001"));
          setRetainerPrefix(deriveRetainerPrefix(existing?.invoiceNumber, "RET-"));
          setRetainerNextNumber(extractRetainerDigits(existing?.invoiceNumber) || "00001");
          setCustomerId(selectedCustomerId);
          setSelectedLocation(String(existing?.location || existing?.selectedLocation || "Head Office"));
          setReference(String(existing?.orderNumber || existing?.reference || ""));
          setInvoiceDate(
            String(existing?.invoiceDate || existing?.date || "").slice(0, 10) || todayISO()
          );
          setProjectId(String(existing?.project?._id || existing?.project?.id || existing?.projectId || existing?.project || ""));
          setCustomerNotes(String(existing?.notes || existing?.customerNotes || ""));
          setTerms(String(existing?.terms || existing?.termsAndConditions || ""));
          setTaxPreference(existing?.taxExclusive === "Tax Inclusive" ? "Tax Inclusive" : "Tax Exclusive");

          const itemRows = Array.isArray(existing?.items) ? existing.items : [];
          const mappedRows: LineRow[] = itemRows.length
            ? itemRows.map((item: any, index: number) => {
                const rate = Number(item?.taxRate ?? item?.rate ?? 0);
                const matchedTax = taxList.find((t: TaxOption) => Number(t.rate) === rate);
                const amountFromPayload =
                  Number(item?.unitPrice ?? item?.amount ?? 0) ||
                  Number(item?.total ?? 0) ||
                  0;
                return {
                  id: Date.now() + index,
                  description: String(item?.description || item?.name || ""),
                  taxId: matchedTax?.id || "",
                  amount: amountFromPayload,
                };
              })
            : [{ id: Date.now(), description: "", taxId: "", amount: 0 }];
          setRows(mappedRows);

          const existingReportingTags = Array.isArray(existing?.reportingTags) ? existing.reportingTags : [];
          if (existingReportingTags.length > 0) {
            setReportingTagSelections((prev) => {
              const next = { ...prev };
              existingReportingTags.forEach((tagEntry: any) => {
                const tagId = String(tagEntry?.tagId || tagEntry?.id || "");
                const value = String(tagEntry?.value || tagEntry?.option || "None");
                if (tagId) next[tagId] = value;
              });
              return next;
            });
          }

          if (selectedCustomerId) {
            await loadProjectsForCustomer(selectedCustomerId);
          }
        }
      } catch (error) {
        console.error("Error loading retail invoice page data:", error);
      }
    };

    loadData();
  }, [id, isEditMode]);

  useEffect(() => {
    const loadLocationSettings = () => {
      try {
        const enabled = localStorage.getItem(LS_LOCATIONS_ENABLED_KEY) === "true";
        setIsLocationFeatureEnabled(enabled);

        const raw = localStorage.getItem(LS_LOCATIONS_CACHE_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        const names = Array.isArray(parsed)
          ? parsed
              .map((row: any) =>
                String(
                  row?.name ||
                    row?.locationName ||
                    row?.displayName ||
                    row?.location?.name ||
                    ""
                ).trim()
              )
              .filter((name: string) => name.length > 0)
          : [];
        const uniqueNames = Array.from(new Set(names));
        const nextOptions = uniqueNames.length > 0 ? uniqueNames : ["Head Office"];
        setLocationOptions(nextOptions);
        setSelectedLocation((prev) => (nextOptions.includes(prev) ? prev : nextOptions[0]));
      } catch {
        setIsLocationFeatureEnabled(false);
        setLocationOptions(["Head Office"]);
        setSelectedLocation("Head Office");
      }
    };

    loadLocationSettings();
    const onStorage = (event: StorageEvent) => {
      if (!event.key || event.key === LS_LOCATIONS_ENABLED_KEY || event.key === LS_LOCATIONS_CACHE_KEY) {
        loadLocationSettings();
      }
    };
    const onFocus = () => loadLocationSettings();
    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", onFocus);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  const selectedCustomer = useMemo(
    () => customers.find((c) => String(c._id || c.id) === customerId),
    [customers, customerId]
  );

  const isCustomerActive = (customer: any) => {
    const status = String(customer?.status || "").toLowerCase();
    if (status) {
      return !["inactive", "disabled", "archived"].includes(status);
    }
    if (typeof customer?.isActive === "boolean") {
      return customer.isActive;
    }
    return true;
  };

  const filteredCustomers = useMemo(() => {
    const term = customerSearch.trim().toLowerCase();
    const activeCustomers = customers.filter((customer: any) => isCustomerActive(customer));
    if (!term) return activeCustomers;
    return activeCustomers.filter((customer: any) => {
      const name = String(customer.displayName || customer.name || customer.companyName || "").toLowerCase();
      const email = String(customer.email || "").toLowerCase();
      return name.includes(term) || email.includes(term);
    });
  }, [customers, customerSearch]);

  const customerProjects = useMemo(() => {
    if (!customerId) return [] as ProjectOption[];
    return projects.filter((p) => {
      const status = String(p.status || "").toLowerCase();
      const isActive = !status || !["inactive", "archived", "closed"].includes(status);
      return isActive && String(p.customer || "") === String(customerId);
    });
  }, [projects, customerId]);

  useEffect(() => {
    const onDocClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (customerDropdownRef.current && !customerDropdownRef.current.contains(target)) {
        setIsCustomerDropdownOpen(false);
      }
      const element = target as HTMLElement;
      if (element && !element.closest("[data-rt-dropdown='true']")) {
        setOpenReportingTagId(null);
      }
      if (element && !element.closest("[data-tax-pref-dropdown='true']")) {
        setIsTaxPreferenceOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const taxById = useMemo(() => {
    const map = new Map<string, TaxOption>();
    taxes.forEach((t) => map.set(t.id, t));
    return map;
  }, [taxes]);

  const subtotal = useMemo(
    () => rows.reduce((sum, r) => sum + (Number(r.amount) || 0), 0),
    [rows]
  );

  const totalTax = useMemo(
    () =>
      rows.reduce((sum, r) => {
        const rate = Number(taxById.get(r.taxId)?.rate || 0);
        const amount = Number(r.amount) || 0;
        if (!rate || amount <= 0) return sum;
        if (taxPreference === "Tax Inclusive") {
          return sum + amount * (rate / (100 + rate));
        }
        return sum + amount * (rate / 100);
      }, 0),
    [rows, taxById, taxPreference]
  );

  const total = useMemo(
    () => (taxPreference === "Tax Inclusive" ? subtotal : subtotal + totalTax),
    [subtotal, totalTax, taxPreference]
  );
  const reportingTagsForForm = useMemo(() => {
    const tags = Array.isArray(availableReportingTags) ? [...availableReportingTags] : [];
    return tags.sort((a, b) => {
      const aRequired = Boolean(a?.required || a?.mandatory);
      const bRequired = Boolean(b?.required || b?.mandatory);
      if (aRequired !== bRequired) return aRequired ? -1 : 1;
      return String(a?.name || "").localeCompare(String(b?.name || ""));
    });
  }, [availableReportingTags]);

  const setRow = (id: number, patch: Partial<LineRow>) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const getNextCustomerCode = (list: any[]) => {
    const maxCode = list.reduce((max, customer) => {
      const code = String(customer?.customerNumber || customer?.customerCode || customer?.code || "");
      const digits = Number((code.match(/\d+/g) || []).join(""));
      return Number.isFinite(digits) ? Math.max(max, digits) : max;
    }, 0);
    return `CUS-${String(maxCode + 1).padStart(5, "0")}`;
  };

  const reloadCustomersForRetainer = async () => {
    try {
      const list = await getCustomers();
      const normalized = (list || []).map((c: any) => ({
        ...c,
        id: c.id || c._id,
        name: c.displayName || c.name || c.companyName || "Unknown",
      }));
      setCustomers(normalized);
      return normalized;
    } catch (error) {
      console.error("Error refreshing customers for retainer quick action:", error);
      return [] as any[];
    }
  };

  const addRow = () => {
    setRows((prev) => [...prev, { id: Date.now(), description: "", taxId: "", amount: 0 }]);
  };

  const removeRow = (id: number) => {
    setRows((prev) => (prev.length > 1 ? prev.filter((r) => r.id !== id) : prev));
  };

  const loadProjectsForCustomer = async (selectedCustomerId: string) => {
    if (!selectedCustomerId) {
      setProjects([]);
      return;
    }
    try {
      const response = await projectsAPI.getByCustomer(selectedCustomerId);
      const projectSource = Array.isArray((response as any)?.data)
        ? (response as any).data
        : Array.isArray((response as any)?.projects)
        ? (response as any).projects
        : [];
      if (projectSource.length > 0) {
        const next = projectSource
          .map((p: any) => ({
            id: String(p._id || p.id),
            name: String(p.projectName || p.name || "Project"),
            customer: String(
              p.customer?._id ||
                p.customer?.id ||
                p.customerId ||
                p.customer_id ||
                p.customer ||
                selectedCustomerId
            ),
            status: String(p.status || "").toLowerCase(),
          }))
          .filter((p: ProjectOption) => p.id);
        setProjects(next);
      }
    } catch (error) {
      console.error("Error loading projects for selected customer:", error);
    }
  };

  useEffect(() => {
    if (prefillFromProjectRef.current) return;
    if (isEditMode) return;
    const state = location.state as any;
    if (!state || state.source !== "timeTrackingProjects") return;

    const customerIdFromState = String(state.customerId || state.project?.customerId || "").trim();
    const customerNameFromState = String(state.customerName || state.project?.customerName || "").trim();
    const projectIdFromState = String(state.projectId || state.project?.id || state.project?.projectId || "").trim();
    const projectNameFromState = String(state.projectName || state.project?.projectName || state.project?.name || "").trim();

    const applyCustomer = async () => {
      if (customerIdFromState) {
        setCustomerId(customerIdFromState);
        await loadProjectsForCustomer(customerIdFromState);
        return;
      }
      if (customerNameFromState) {
        const match =
          customers.find((c: any) => String(c?._id || c?.id || "") === customerIdFromState) ||
          customers.find(
            (c: any) =>
              String(c?.displayName || c?.name || c?.companyName || "").trim().toLowerCase() ===
              customerNameFromState.toLowerCase()
          );
        if (match) {
          setCustomerId(String(match._id || match.id || ""));
          await loadProjectsForCustomer(String(match._id || match.id || ""));
        }
      }
    };

    applyCustomer();

    if (projectIdFromState) {
      setProjectId(projectIdFromState);
    } else if (projectNameFromState) {
      const matchProject = projects.find(
        (p: any) =>
          String(p?.id || p?._id || "").trim() === projectIdFromState ||
          String(p?.name || p?.projectName || "").trim().toLowerCase() === projectNameFromState.toLowerCase()
      );
      if (matchProject) {
        setProjectId(String(matchProject.id || matchProject._id || ""));
      }
    }

    prefillFromProjectRef.current = true;
  }, [location.state, customers, projects, isEditMode]);

  const handleCustomerSelect = async (customer: any) => {
    const selectedId = String(customer._id || customer.id || "");
    if (!selectedId) return;
    setCustomerId(selectedId);
    setProjectId("");
    setIsCustomerDropdownOpen(false);
    setCustomerSearch("");
    await loadProjectsForCustomer(selectedId);
  };

  const openCustomerQuickAction = () => {
    setIsCustomerDropdownOpen(false);
    setQuickCustomerTab("otherDetails");
    setIsQuickCustomerMoreDetailsOpen(false);
    setQuickCustomerFiles([]);
    setQuickCustomerForm((prev) => ({
      ...prev,
      customerNumber: getNextCustomerCode(customers),
    }));
    setIsNewCustomerQuickActionOpen(true);
  };

  const closeCustomerQuickAction = () => {
    setIsNewCustomerQuickActionOpen(false);
  };

  const handleQuickCustomerFieldChange = (field: string, value: string | boolean) => {
    setQuickCustomerForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleQuickCustomerFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files || []);
    if (selected.length === 0) return;
    setQuickCustomerFiles((prev) => [...prev, ...selected].slice(0, 10));
    event.target.value = "";
  };

  const handleSaveQuickCustomer = async () => {
    if (isSavingQuickCustomer) return;
    const fallbackName = `${quickCustomerForm.firstName} ${quickCustomerForm.lastName}`.trim();
    const displayName = quickCustomerForm.displayName.trim() || quickCustomerForm.companyName.trim() || fallbackName;
    if (!displayName) {
      alert("Display Name is required.");
      return;
    }

    const payload = {
      customerType: quickCustomerForm.customerType,
      salutation: quickCustomerForm.salutation,
      firstName: quickCustomerForm.firstName,
      lastName: quickCustomerForm.lastName,
      companyName: quickCustomerForm.companyName,
      displayName,
      name: displayName,
      email: quickCustomerForm.email,
      customerNumber: quickCustomerForm.customerNumber,
      customerCode: quickCustomerForm.customerNumber,
      workPhone: `${quickCustomerForm.workCountryCode} ${quickCustomerForm.workPhone}`.trim(),
      mobile: `${quickCustomerForm.mobileCountryCode} ${quickCustomerForm.mobile}`.trim(),
      language: quickCustomerForm.language,
      taxName: quickCustomerForm.taxRate,
      companyId: quickCustomerForm.companyId,
      currency: quickCustomerForm.currency,
      paymentTerms: quickCustomerForm.paymentTerms,
      priceList: quickCustomerForm.priceList,
      isPortalEnabled: quickCustomerForm.enablePortal,
      websiteUrl: quickCustomerForm.websiteUrl,
      department: quickCustomerForm.department,
      designation: quickCustomerForm.designation,
      socialLinks: {
        x: quickCustomerForm.xHandle,
        skype: quickCustomerForm.skype,
        facebook: quickCustomerForm.facebook,
      },
      documents: quickCustomerFiles.map((file) => ({
        name: file.name,
        size: file.size,
        type: file.type,
      })),
      notes: quickCustomerForm.notes,
      billingAddress: {
        attention: quickCustomerForm.billingAttention,
        country: quickCustomerForm.billingCountry,
        street1: quickCustomerForm.billingStreet1,
        street2: quickCustomerForm.billingStreet2,
        city: quickCustomerForm.billingCity,
        state: quickCustomerForm.billingState,
        zipCode: quickCustomerForm.billingZipCode,
        phone: quickCustomerForm.billingPhone,
        fax: quickCustomerForm.billingFax,
      },
      shippingAddress: {
        attention: quickCustomerForm.shippingAttention,
        country: quickCustomerForm.shippingCountry,
        street1: quickCustomerForm.shippingStreet1,
        street2: quickCustomerForm.shippingStreet2,
        city: quickCustomerForm.shippingCity,
        state: quickCustomerForm.shippingState,
        zipCode: quickCustomerForm.shippingZipCode,
        phone: quickCustomerForm.shippingPhone,
        fax: quickCustomerForm.shippingFax,
      },
      reportingTags: {
        sc: quickCustomerForm.tagSc,
        wsq: quickCustomerForm.tagWsq,
      },
      status: "active",
    };

    setIsSavingQuickCustomer(true);
    try {
      const response = await customersAPI.create(payload);
      const created = (response as any)?.data || payload;
      const latestCustomers = await reloadCustomersForRetainer();
      const selected =
        latestCustomers.find((customer: any) => String(customer.id || customer._id) === String(created.id || created._id)) ||
        latestCustomers.find((customer: any) => (customer.displayName || customer.name || customer.companyName) === displayName);
      if (selected) handleCustomerSelect(selected);
      toast.success("Customer created successfully.");
      setIsNewCustomerQuickActionOpen(false);
    } catch (error: any) {
      console.error("Error creating customer from retainer quick action:", error);
      alert(error?.message || "Failed to create customer.");
    } finally {
      setIsSavingQuickCustomer(false);
    }
  };

  const handleSave = async (status: "draft" | "sent") => {
    if (!customerId) {
      alert("Please select a customer.");
      return;
    }

    const items = rows
      .filter((r) => r.description.trim() || Number(r.amount) > 0)
      .map((r) => {
        const rate = Number(taxById.get(r.taxId)?.rate || 0);
        const amount = Number(r.amount) || 0;
        const taxAmount =
          taxPreference === "Tax Inclusive"
            ? amount * (rate / (100 + rate))
            : amount * (rate / 100);
        return {
          name: r.description || "Item",
          description: r.description,
          quantity: 1,
          unitPrice: amount,
          taxRate: rate,
          taxAmount,
          total: taxPreference === "Tax Inclusive" ? amount : amount + taxAmount,
        };
      });

    setLoading(true);
    setSavingMode(status);

    try {
      const resolvedCustomer =
        selectedCustomer ||
        customers.find((c: any) => String(c._id || c.id) === String(customerId));
      const resolvedCustomerName = String(
        resolvedCustomer?.displayName ||
          resolvedCustomer?.name ||
          resolvedCustomer?.companyName ||
          ""
      ).trim();

    const normalizedInvoiceNumber = String(invoiceNumber || "").trim();
    const finalInvoiceNumber =
      normalizedInvoiceNumber.toUpperCase().startsWith("RET-")
        ? normalizedInvoiceNumber
        : buildRetainerNumber(retainerPrefix || "RET-", normalizedInvoiceNumber);

    const payload = {
      invoiceNumber: finalInvoiceNumber,
      customer: customerId,
      customerName: resolvedCustomerName,
      date: invoiceDate,
      invoiceDate,
        dueDate: invoiceDate,
        status,
        items,
        subtotal,
        tax: totalTax,
        total,
        notes: customerNotes,
        terms,
        orderNumber: reference,
        paymentTerms: "Due on Receipt",
        currency: "USD",
        taxExclusive: taxPreference,
        location: selectedLocation,
        selectedLocation,
      reportingTags: Object.entries(reportingTagSelections)
        .filter(([, value]) => value && value !== "None")
        .map(([tagId, value]) => ({ tagId, value })),
      invoiceType: "retainer",
    } as any;

      let savedInvoice: any = null;
      if (isEditMode && id) {
        savedInvoice = await updateInvoice(id, payload);
      } else {
        savedInvoice = await saveInvoice(payload);
      }

      const resolvedInvoiceId = String(
        (savedInvoice as any)?.id || (savedInvoice as any)?._id || id || ""
      ).trim();
      try {
        const key = "taban_books_invoices";
        const raw = localStorage.getItem(key);
        const parsed = raw ? JSON.parse(raw) : [];
        const list = Array.isArray(parsed) ? parsed : [];
        const idx = list.findIndex((row: any) => String(row?._id || row?.id) === resolvedInvoiceId);
        const stored = {
          ...payload,
          ...savedInvoice,
          id: resolvedInvoiceId || (savedInvoice as any)?.id || (savedInvoice as any)?._id,
          _id: resolvedInvoiceId || (savedInvoice as any)?.id || (savedInvoice as any)?._id,
          invoiceNumber: finalInvoiceNumber,
          updatedAt: new Date().toISOString(),
        };
        if (idx >= 0) {
          list[idx] = { ...list[idx], ...stored };
        } else {
          list.unshift(stored);
        }
        localStorage.setItem(key, JSON.stringify(list));
      } catch {
        // ignore local storage errors
      }

      toast.success(
        isEditMode
          ? status === "draft"
            ? "Retainer invoice updated as draft."
            : "Retainer invoice updated and sent successfully."
          : status === "draft"
          ? "Retainer invoice saved as draft."
          : "Retainer invoice saved and sent successfully."
      );
      try {
        localStorage.setItem(RETAINER_SELECTED_VIEW_STORAGE_KEY, "all");
      } catch {
        // ignore local storage errors
      }

      if (status === "sent" && resolvedInvoiceId) {
        navigate(`/sales/retainer-invoices/${resolvedInvoiceId}/send-email`);
      } else if (isEditMode && id) {
        navigate(`/sales/retainer-invoices/${id}`);
      } else {
        ensureRetainerListAllView();
        navigate("/sales/retainer-invoices");
      }
    } catch (error: any) {
      console.error("Error saving retail invoice:", error);
      alert(error?.message || "Failed to save invoice");
    } finally {
      setLoading(false);
      setSavingMode(null);
    }
  };

  const inputBaseClass =
    "h-[34px] w-full rounded border border-gray-300 px-3 text-[13px] outline-none focus:border-blue-400 transition-all";
  const selectBaseClass =
    "h-[34px] w-full appearance-none rounded border border-gray-300 bg-white px-3 pr-8 text-[13px] outline-none focus:border-blue-400 transition-all";
  const labelClass = "text-[13px] text-gray-700";
  const requiredLabelClass = "text-[13px] text-[#ef4444]";

  const openRetainerNumberModal = () => {
    setRetainerPrefix(deriveRetainerPrefix(invoiceNumber, retainerPrefix || "RET-"));
    setRetainerNextNumber(extractRetainerDigits(invoiceNumber) || retainerNextNumber || "00001");
    setIsRetainerNumberModalOpen(true);
  };

  const saveRetainerNumberPreferences = () => {
    if (retainerNumberMode === "auto") {
      setInvoiceNumber(buildRetainerNumber(retainerPrefix, retainerNextNumber));
    }
    setIsRetainerNumberModalOpen(false);
  };

  const normalizeTagOptions = (tag: any): string[] => {
    const rawBuckets: any[] = [];
    if (Array.isArray(tag?.options)) rawBuckets.push(...tag.options);
    if (Array.isArray(tag?.tagOptions)) rawBuckets.push(...tag.tagOptions);
    if (Array.isArray(tag?.values)) rawBuckets.push(...tag.values);
    if (Array.isArray(tag?.allowedValues)) rawBuckets.push(...tag.allowedValues);
    if (Array.isArray(tag?.optionValues)) rawBuckets.push(...tag.optionValues);
    if (typeof tag?.options === "string") rawBuckets.push(...String(tag.options).split(","));
    if (typeof tag?.tagOptions === "string") rawBuckets.push(...String(tag.tagOptions).split(","));

    const labels = rawBuckets
      .map((option: any) => {
        if (typeof option === "string") return option.trim();
        return String(
          option?.name ||
            option?.label ||
            option?.value ||
            option?.option ||
            option?.optionName ||
            option?.displayName ||
            ""
        ).trim();
      })
      .filter((value: string) => value.length > 0);
    return Array.from(new Set(labels));
  };

  const getReportingTagOptions = (tag: ReportingTag) => {
    const fromLoaded = reportingTagOptionsById[tag.id];
    if (Array.isArray(fromLoaded) && fromLoaded.length > 0) return fromLoaded;
    return normalizeTagOptions(tag);
  };

  const getFilteredReportingTagOptions = (tag: ReportingTag) => {
    const options = getReportingTagOptions(tag);
    const term = reportingTagSearch.trim().toLowerCase();
    if (!term) return options;
    return options.filter((option) => option.toLowerCase().includes(term));
  };

  const ensureReportingTagOptions = async (tag: ReportingTag) => {
    const current = getReportingTagOptions(tag);
    if (current.length > 0) return;
    if (!tag?.id) return;
    try {
      setLoadingReportingTagId(tag.id);
      const response = await reportingTagsAPI.getById(tag.id);
      const row = (response as any)?.data || response || {};
      const options = normalizeTagOptions(row);
      if (options.length > 0) {
        setReportingTagOptionsById((prev) => ({ ...prev, [tag.id]: options }));
      }
    } catch (error) {
      console.error("Failed to load reporting tag options:", error);
    } finally {
      setLoadingReportingTagId((prev) => (prev === tag.id ? null : prev));
    }
  };
  const taxPreferenceOptions = ["Tax Exclusive", "Tax Inclusive"];
  const filteredTaxPreferenceOptions = taxPreferenceOptions.filter((option) =>
    option.toLowerCase().includes(taxPreferenceSearch.trim().toLowerCase())
  );

  return (
    <div className="flex min-h-[calc(100vh-98px)] flex-col bg-white">
      <div className="flex items-center justify-between border-b px-6 py-3">
        <h1 className="text-lg font-normal text-gray-800">{isEditMode ? "Edit Retainer Invoice" : "New Retainer Invoice"}</h1>
        <button
          onClick={() => {
            ensureRetainerListAllView();
            navigate("/sales/retainer-invoices");
          }}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X size={22} />
        </button>
      </div>

      <div className="bg-white">
        <div className="max-w-[1120px] px-6 py-6">
          <div className="space-y-6">
            <div className="bg-white p-6">
              <div className="grid grid-cols-[220px_1fr] items-center gap-y-4 gap-x-4 max-w-[860px]">
                <label className={requiredLabelClass}>Customer Name*</label>
                <div className="relative flex items-center" ref={customerDropdownRef}>
                  <div className="relative flex-1">
                    <input
                      type="text"
                      readOnly
                      value={selectedCustomer ? (selectedCustomer.displayName || selectedCustomer.name || selectedCustomer.companyName || "") : ""}
                      placeholder="Select or add a customer"
                      onClick={() => setIsCustomerDropdownOpen((prev) => !prev)}
                      className={`${inputBaseClass} rounded-r-none pr-9 cursor-pointer`}
                    />
                    <button
                      type="button"
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400"
                      onClick={() => setIsCustomerDropdownOpen((prev) => !prev)}
                    >
                      {isCustomerDropdownOpen ? <ChevronUp size={14} className="text-[#156372]" /> : <ChevronDown size={14} className="text-gray-400" />}
                    </button>
                  </div>
                  <button
                    type="button"
                    className="h-[34px] w-10 rounded-r border border-l-0 border-gray-300 text-white flex items-center justify-center"
                    onClick={() => setIsCustomerDropdownOpen((prev) => !prev)}
                    style={{ backgroundColor: accentColor }}
                  >
                    <Search size={14} />
                  </button>

                  {isCustomerDropdownOpen && (
                    <div className="absolute left-0 top-full mt-1 w-[calc(100%-40px)] rounded-md border border-gray-200 bg-white shadow-xl z-[200]">
                      <div className="p-2 border-b border-gray-100">
                        <div className="flex items-center gap-2 px-2 py-1.5 border border-gray-200 rounded bg-gray-50">
                          <Search size={13} className="text-gray-400" />
                          <input
                            value={customerSearch}
                            onChange={(e) => setCustomerSearch(e.target.value)}
                            placeholder="Search customer"
                            className="w-full bg-transparent border-none outline-none text-[13px] text-gray-700"
                          />
                        </div>
                      </div>
                      <div className="max-h-56 overflow-y-auto py-1">
                        {filteredCustomers.length > 0 ? (
                          filteredCustomers.map((customer: any) => {
                            const id = String(customer._id || customer.id);
                            const name = customer.displayName || customer.name || customer.companyName || "Customer";
                            const email = customer.email || "";
                            const isSelected = id === customerId;
                            return (
                              <button
                                key={id}
                                type="button"
                                onClick={() => handleCustomerSelect(customer)}
                                className={`w-full text-left px-3 py-2 transition-colors ${isSelected ? "bg-[#156372] text-white" : "hover:bg-gray-50 text-gray-700"}`}
                              >
                                <div className="text-[13px] font-medium">{name}</div>
                                <div className={`text-[11px] ${isSelected ? "text-white/80" : "text-gray-500"}`}>{email || "-"}</div>
                              </button>
                            );
                          })
                        ) : (
                          <div className="px-3 py-3 text-[13px] text-gray-500">No customers found</div>
                        )}
                      </div>
                      <div className="border-t border-gray-100 p-1">
                        <button
                          type="button"
                          onClick={openCustomerQuickAction}
                          className="w-full text-left px-3 py-2 text-[13px] text-[#156372] hover:bg-gray-50"
                        >
                          New Customer
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <label className={labelClass}>Location</label>
                <div className="max-w-[260px]">
                  <select
                    className={selectBaseClass}
                    value={selectedLocation}
                    onChange={(e) => setSelectedLocation(e.target.value)}
                  >
                    {locationOptions.map((loc) => (
                      <option key={loc} value={loc}>
                        {loc}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="bg-white p-6">
              <div className="grid grid-cols-[220px_1fr] items-start gap-y-4 gap-x-4 max-w-[860px]">
                <label className={requiredLabelClass}>Retainer Invoice Number*</label>
                <div className="relative max-w-[260px]">
                  <input
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    className={`${inputBaseClass} pr-9`}
                  />
                  <button
                    type="button"
                    title="Invoice number settings"
                    aria-label="Invoice number settings"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-[#3b82f6] hover:text-[#2563eb]"
                    onClick={openRetainerNumberModal}
                  >
                    <Settings size={14} />
                  </button>
                </div>

                <label className={labelClass}>Reference#</label>
                <input
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  className={`${inputBaseClass} max-w-[260px]`}
                />

                <label className={requiredLabelClass}>Retainer Invoice Date*</label>
                <input
                  type="date"
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                  className={`${inputBaseClass} max-w-[260px]`}
                />

                <label className={labelClass}>Project Name</label>
                <div className="max-w-[260px]">
                  <select
                    value={projectId}
                    onChange={(e) => setProjectId(e.target.value)}
                    className={selectBaseClass}
                    disabled={!customerId}
                  >
                    <option value="">Select a project</option>
                    {customerProjects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                  {!customerId && <p className="text-xs text-gray-500 mt-1">Select a customer to associate a project.</p>}
                  {customerId && customerProjects.length === 0 && <p className="text-xs text-gray-500 mt-1">No active projects found for this customer.</p>}
                </div>
              </div>
            </div>

            <div className="bg-white p-6 border-y border-gray-200">
              {reportingTagsForForm.length > 0 ? (
                <div className="grid grid-cols-[220px_1fr] items-center gap-y-4 gap-x-4 max-w-[860px]">
                  {reportingTagsForForm.map((tag) => {
                    const isOpen = openReportingTagId === tag.id;
                    const isRequired = Boolean(tag.required || tag.mandatory);
                    const selectedValue = reportingTagSelections[tag.id] || "None";
                    const options = getFilteredReportingTagOptions(tag);
                    return (
                      <React.Fragment key={tag.id}>
                        <label className={isRequired ? requiredLabelClass : labelClass}>
                          {tag.name}
                          {isRequired ? " *" : ""}
                        </label>
                        <div className="relative max-w-[300px]" data-rt-dropdown="true">
                          <button
                            type="button"
                            onClick={() => {
                              setOpenReportingTagId((prev) => (prev === tag.id ? null : tag.id));
                              setReportingTagSearch("");
                              void ensureReportingTagOptions(tag);
                            }}
                            className="h-[34px] w-full rounded border border-gray-300 bg-white px-3 text-left text-[13px] text-gray-700"
                          >
                            {selectedValue}
                            {isOpen ? (
                              <ChevronUp size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#3b82f6]" />
                            ) : (
                              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            )}
                          </button>
                          {isOpen && (
                            <div className="absolute left-0 top-full mt-1 w-full rounded-md border border-gray-200 bg-white shadow-lg z-[220]">
                              <div className="p-2 border-b border-gray-100">
                                <div className="flex items-center gap-2 px-2 py-1.5 border border-[#3b82f6] rounded bg-white">
                                  <Search size={13} className="text-gray-400" />
                                  <input
                                    value={reportingTagSearch}
                                    onChange={(e) => setReportingTagSearch(e.target.value)}
                                    placeholder="Search"
                                    className="w-full bg-transparent border-none outline-none text-[13px] text-gray-700"
                                    autoFocus
                                  />
                                </div>
                              </div>
                              <div className="max-h-44 overflow-y-auto py-1">
                                {options.map((option) => {
                                  const isSelected = selectedValue === option;
                                  return (
                                    <button
                                      key={`${tag.id}-${option}`}
                                      type="button"
                                      onClick={() => {
                                        setReportingTagSelections((prev) => ({
                                          ...prev,
                                          [tag.id]: option,
                                        }));
                                        setOpenReportingTagId(null);
                                        setReportingTagSearch("");
                                      }}
                                      className={`w-full px-3 py-2 text-left text-[13px] ${
                                        isSelected ? "bg-[#3b82f6] text-white" : "text-gray-700 hover:bg-gray-50"
                                      }`}
                                    >
                                      {option}
                                    </button>
                                  );
                                })}
                                {options.length === 0 && loadingReportingTagId === tag.id && (
                                  <div className="px-3 py-2 text-[13px] text-gray-500">Loading options...</div>
                                )}
                                {options.length === 0 && loadingReportingTagId !== tag.id && (
                                  <div className="px-3 py-2 text-[13px] text-gray-500">No options found</div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </React.Fragment>
                    );
                  })}
                </div>
              ) : (
                <div className="text-[13px] text-gray-500">No reporting tags found in Settings.</div>
              )}
            </div>

            <div className="bg-white p-6">
              <div className="mb-4 relative inline-block" data-tax-pref-dropdown="true">
                <button
                  type="button"
                  onClick={() => {
                    setIsTaxPreferenceOpen((prev) => !prev);
                    setTaxPreferenceSearch("");
                  }}
                  className="inline-flex items-center gap-2 text-[13px] text-gray-800"
                >
                  <BriefcaseBusiness size={15} className="text-[#8b8fab]" />
                  <span>{taxPreference}</span>
                  {isTaxPreferenceOpen ? (
                    <ChevronUp size={14} className="text-[#3b82f6]" />
                  ) : (
                    <ChevronDown size={14} className="text-gray-500" />
                  )}
                </button>

                {isTaxPreferenceOpen && (
                  <div className="absolute left-0 top-full mt-2 w-[235px] rounded-md border border-gray-200 bg-white shadow-xl z-[240]">
                    <div className="p-2 border-b border-gray-100">
                      <div className="flex items-center gap-2 px-2 py-1.5 border border-[#3b82f6] rounded bg-white">
                        <Search size={13} className="text-gray-400" />
                        <input
                          value={taxPreferenceSearch}
                          onChange={(e) => setTaxPreferenceSearch(e.target.value)}
                          placeholder="Search"
                          className="w-full bg-transparent border-none outline-none text-[13px] text-gray-700"
                          autoFocus
                        />
                      </div>
                    </div>
                    <div className="px-3 py-2 text-[13px] font-semibold text-gray-500">Item Tax Preference</div>
                    <div className="pb-2">
                      {filteredTaxPreferenceOptions.map((option) => {
                        const isSelected = option === taxPreference;
                        return (
                          <button
                            key={option}
                            type="button"
                            onClick={() => {
                              setTaxPreference(option as "Tax Exclusive" | "Tax Inclusive");
                              setIsTaxPreferenceOpen(false);
                              setTaxPreferenceSearch("");
                            }}
                            className={`flex w-full items-center justify-between px-3 py-2 text-left text-[13px] ${
                              isSelected ? "bg-[#3b82f6] text-white" : "text-gray-700 hover:bg-gray-50"
                            }`}
                          >
                            <span>{option}</span>
                            {isSelected && <Check size={14} />}
                          </button>
                        );
                      })}
                      {filteredTaxPreferenceOptions.length === 0 && (
                        <div className="px-3 py-2 text-[13px] text-gray-500">No options found</div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="border border-gray-200 rounded-md overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-white border-b border-gray-200">
                    <tr className="text-[12px] text-slate-700">
                      <th className="text-left px-3 py-2 font-medium border-r border-gray-200">Description</th>
                      <th className="text-left px-3 py-2 font-medium border-r border-gray-200 w-[180px]">Tax</th>
                      <th className="text-right px-3 py-2 font-medium w-[180px]">Amount</th>
                      <th className="w-[48px]" />
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={row.id} className="border-t border-gray-200">
                        <td className="px-3 py-2 border-r border-gray-200">
                          <input
                            value={row.description}
                            onChange={(e) => setRow(row.id, { description: e.target.value })}
                            placeholder="Description"
                            className="w-full h-[34px] border-none outline-none text-[13px]"
                          />
                        </td>
                        <td className="px-3 py-2 border-r border-gray-200">
                          <div className="relative">
                            <select
                              value={row.taxId}
                              onChange={(e) => setRow(row.id, { taxId: e.target.value })}
                              className="w-full h-[34px] appearance-none rounded border border-gray-200 px-2 pr-8 text-[13px] outline-none focus:border-blue-400"
                            >
                              <option value="">Select a Tax</option>
                              {taxes.map((t) => (
                                <option key={t.id} value={t.id}>{`${t.name} [${t.rate}%]`}</option>
                              ))}
                            </select>
                            <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                          </div>
                        </td>
                        <td className="px-3 py-2 text-right font-medium">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={row.amount}
                            onChange={(e) => setRow(row.id, { amount: Number(e.target.value) || 0 })}
                            className="w-full h-[34px] text-right rounded border border-gray-200 px-2 text-[13px] outline-none focus:border-blue-400"
                          />
                        </td>
                        <td className="px-2 py-2 text-center">
                          <button onClick={() => removeRow(row.id)} className="text-red-500 hover:text-red-700 text-sm">x</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-3">
                <button
                  onClick={addRow}
                  className="inline-flex items-center gap-1.5 text-[13px] hover:underline"
                  style={{ color: accentColor }}
                >
                  <Plus size={14} /> Add New Row
                </button>
              </div>

              <div className="mt-4 grid grid-cols-[1fr_430px] gap-6">
                <div />
                <div className="bg-[#f8fafc] rounded-md border border-gray-200 p-4 text-sm">
                  <div className="flex items-center justify-between py-2">
                    <span className="font-medium">Sub Total</span>
                    <span className="font-medium">{subtotal.toFixed(2)}</span>
                  </div>
                  <div className="border-t border-gray-200 my-2" />
                  <div className="flex items-center justify-between py-2 text-xl font-semibold">
                    <span>Total</span>
                    <span>{total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 space-y-6">
              <div className="grid grid-cols-[220px_1fr] items-start gap-4">
                <label className={labelClass}>Customer Notes</label>
                <textarea
                  value={customerNotes}
                  onChange={(e) => setCustomerNotes(e.target.value)}
                  placeholder="Enter any notes to be displayed in your transaction"
                  className="w-full max-w-[560px] h-20 rounded border border-gray-300 p-3 text-[13px] outline-none focus:border-blue-400 resize-none"
                />
              </div>

              <div className="grid grid-cols-[220px_1fr] items-start gap-4">
                <label className={labelClass}>Terms & Conditions</label>
                <textarea
                  value={terms}
                  onChange={(e) => setTerms(e.target.value)}
                  placeholder="Enter the terms and conditions of your business to be displayed in your transaction"
                  className="w-full max-w-[900px] h-20 rounded border border-gray-300 p-3 text-[13px] outline-none focus:border-blue-400 resize-none"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="sticky bottom-0 z-20 border-t bg-[#f9fafb] px-6 py-4">
        <div className="flex gap-2">
          <button
            onClick={() => handleSave("draft")}
            disabled={loading}
            className="text-white px-6 py-1.5 rounded text-[13px] font-medium hover:opacity-90 shadow-sm active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            style={{ backgroundColor: accentColor }}
          >
            {savingMode === "draft" ? "Saving..." : isEditMode ? "Update as Draft" : "Save as Draft"}
          </button>
          <button
            onClick={() => handleSave("sent")}
            disabled={loading}
            className="bg-white border border-gray-300 text-gray-700 px-6 py-1.5 rounded text-[13px] font-medium hover:bg-gray-50 active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {savingMode === "sent" ? "Saving..." : isEditMode ? "Update and Send" : "Save and Send"}
          </button>
          <button
            onClick={() => {
              ensureRetainerListAllView();
              navigate("/sales/retainer-invoices");
            }}
            className="bg-white border border-gray-300 text-gray-700 px-6 py-1.5 rounded text-[13px] font-medium hover:bg-gray-50 active:scale-95 transition-all"
          >
            Cancel
          </button>
        </div>
      </div>

      {isNewCustomerQuickActionOpen && typeof document !== "undefined" && document.body && createPortal(
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/45" onClick={closeCustomerQuickAction}>
          <div className="w-[96vw] max-w-[1220px] h-[92vh] bg-white rounded-md shadow-2xl overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="h-[72px] border-b border-gray-200 px-6 flex items-center justify-between">
              <h2 className="text-[30px] leading-none font-normal text-gray-800">New Customer</h2>
              <button type="button" className="text-red-500 hover:text-red-600 text-[30px] leading-none" onClick={closeCustomerQuickAction}>x</button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 bg-white">
              <div className="max-w-[980px] space-y-4">
                <div className="grid grid-cols-[170px_1fr] items-center gap-4">
                  <label className="text-[14px] text-gray-700">Customer Type</label>
                  <div className="flex items-center gap-6 text-[14px] text-gray-700">
                    <label className="inline-flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="quick-customer-type" checked={quickCustomerForm.customerType === "business"} onChange={() => handleQuickCustomerFieldChange("customerType", "business")} />
                      <span>Business</span>
                    </label>
                    <label className="inline-flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="quick-customer-type" checked={quickCustomerForm.customerType === "individual"} onChange={() => handleQuickCustomerFieldChange("customerType", "individual")} />
                      <span>Individual</span>
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-[170px_1fr] items-center gap-4">
                  <label className="text-[14px] text-gray-700">Primary Contact</label>
                  <div className="grid grid-cols-3 gap-3">
                    <select className="h-[38px] rounded border border-gray-300 px-3 text-[13px] text-gray-700" value={quickCustomerForm.salutation} onChange={(e) => handleQuickCustomerFieldChange("salutation", e.target.value)}>
                      <option value="">Salutation</option>
                      <option value="Mr">Mr.</option>
                      <option value="Mrs">Mrs.</option>
                      <option value="Ms">Ms.</option>
                      <option value="Dr">Dr.</option>
                    </select>
                    <input className="h-[38px] rounded border border-gray-300 px-3 text-[13px] text-gray-700" placeholder="First Name" value={quickCustomerForm.firstName} onChange={(e) => handleQuickCustomerFieldChange("firstName", e.target.value)} />
                    <input className="h-[38px] rounded border border-gray-300 px-3 text-[13px] text-gray-700" placeholder="Last Name" value={quickCustomerForm.lastName} onChange={(e) => handleQuickCustomerFieldChange("lastName", e.target.value)} />
                  </div>
                </div>

                <div className="grid grid-cols-[170px_1fr] items-center gap-4">
                  <label className="text-[14px] text-gray-700">Company Name</label>
                  <input className="h-[38px] max-w-[520px] rounded border border-gray-300 px-3 text-[13px] text-gray-700" value={quickCustomerForm.companyName} onChange={(e) => handleQuickCustomerFieldChange("companyName", e.target.value)} />
                </div>

                <div className="grid grid-cols-[170px_1fr] items-center gap-4">
                  <label className="text-[14px] text-[#ef4444]">Display Name*</label>
                  <div className="max-w-[520px] relative">
                    <input className="h-[38px] w-full rounded border border-gray-300 px-3 pr-8 text-[13px] text-gray-700" placeholder="Select or type to add" value={quickCustomerForm.displayName} onChange={(e) => handleQuickCustomerFieldChange("displayName", e.target.value)} />
                    <ChevronDown size={22} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                  </div>
                </div>

                <div className="grid grid-cols-[170px_1fr] items-center gap-4">
                  <label className="text-[14px] text-gray-700">Email Address</label>
                  <input className="h-[38px] max-w-[520px] rounded border border-gray-300 px-3 text-[13px] text-gray-700" value={quickCustomerForm.email} onChange={(e) => handleQuickCustomerFieldChange("email", e.target.value)} />
                </div>

                <div className="grid grid-cols-[170px_1fr] items-center gap-4">
                  <label className="text-[14px] text-[#ef4444]">Customer Number*</label>
                  <input className="h-[38px] max-w-[520px] rounded border border-gray-300 px-3 text-[13px] text-gray-700" value={quickCustomerForm.customerNumber} onChange={(e) => handleQuickCustomerFieldChange("customerNumber", e.target.value)} />
                </div>

                <div className="grid grid-cols-[170px_1fr] items-center gap-4">
                  <label className="text-[14px] text-gray-700">Phone</label>
                  <div className="grid grid-cols-2 gap-4 max-w-[720px]">
                    <div className="flex">
                      <input className="h-[38px] w-[78px] rounded-l border border-gray-300 px-2 text-[13px] text-gray-700" value={quickCustomerForm.workCountryCode} onChange={(e) => handleQuickCustomerFieldChange("workCountryCode", e.target.value)} />
                      <input className="h-[38px] flex-1 rounded-r border border-l-0 border-gray-300 px-3 text-[13px] text-gray-700" placeholder="Work Phone" value={quickCustomerForm.workPhone} onChange={(e) => handleQuickCustomerFieldChange("workPhone", e.target.value)} />
                    </div>
                    <div className="flex">
                      <input className="h-[38px] w-[78px] rounded-l border border-gray-300 px-2 text-[13px] text-gray-700" value={quickCustomerForm.mobileCountryCode} onChange={(e) => handleQuickCustomerFieldChange("mobileCountryCode", e.target.value)} />
                      <input className="h-[38px] flex-1 rounded-r border border-l-0 border-gray-300 px-3 text-[13px] text-gray-700" placeholder="Mobile" value={quickCustomerForm.mobile} onChange={(e) => handleQuickCustomerFieldChange("mobile", e.target.value)} />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-[170px_1fr] items-center gap-4">
                  <label className="text-[14px] text-gray-700">Customer Language</label>
                  <div className="max-w-[520px] relative">
                    <input className="h-[38px] w-full rounded border border-gray-300 px-3 pr-8 text-[13px] text-gray-700" value={quickCustomerForm.language} onChange={(e) => handleQuickCustomerFieldChange("language", e.target.value)} />
                    <ChevronDown size={22} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                  </div>
                </div>

                <div className="border-b border-gray-200 mt-2">
                  <div className="flex items-center gap-6 text-[14px] text-gray-700">
                    {[
                      { key: "otherDetails", label: "Other Details" },
                      { key: "address", label: "Address" },
                      { key: "customFields", label: "Custom Fields" },
                      { key: "reportingTags", label: "Reporting Tags" },
                      { key: "remarks", label: "Remarks" },
                    ].map((tab) => (
                      <button
                        key={tab.key}
                        type="button"
                        className={`pb-3 border-b-2 ${quickCustomerTab === tab.key ? "border-[#3b82f6] text-gray-900" : "border-transparent text-gray-600"}`}
                        onClick={() => setQuickCustomerTab(tab.key as "otherDetails" | "address" | "customFields" | "reportingTags" | "remarks")}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>

                {quickCustomerTab === "otherDetails" && (
                  <div className="pt-4 grid grid-cols-[170px_1fr] gap-y-4 gap-x-4">
                    <label className="text-[14px] text-gray-700">Tax Rate</label>
                    <div className="max-w-[520px] relative">
                      <input className="h-[38px] w-full rounded border border-gray-300 px-3 pr-8 text-[13px] text-gray-700" placeholder="Select a Tax" value={quickCustomerForm.taxRate} onChange={(e) => handleQuickCustomerFieldChange("taxRate", e.target.value)} />
                      <ChevronDown size={22} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                    </div>

                    <label className="text-[14px] text-gray-700">Company ID</label>
                    <input className="h-[38px] max-w-[520px] rounded border border-gray-300 px-3 text-[13px] text-gray-700" value={quickCustomerForm.companyId} onChange={(e) => handleQuickCustomerFieldChange("companyId", e.target.value)} />

                    <label className="text-[14px] text-gray-700">Currency</label>
                    <div className="max-w-[520px] relative">
                      <input className="h-[38px] w-full rounded border border-gray-300 px-3 pr-8 text-[13px] text-gray-700" value={quickCustomerForm.currency} onChange={(e) => handleQuickCustomerFieldChange("currency", e.target.value)} />
                      <ChevronDown size={22} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                    </div>

                    <label className="text-[14px] text-gray-700">Payment Terms</label>
                    <div className="max-w-[520px] relative">
                      <input className="h-[38px] w-full rounded border border-gray-300 px-3 pr-8 text-[13px] text-gray-700" value={quickCustomerForm.paymentTerms} onChange={(e) => handleQuickCustomerFieldChange("paymentTerms", e.target.value)} />
                      <ChevronDown size={22} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                    </div>

                    <label className="text-[14px] text-gray-700">Price List</label>
                    <div className="max-w-[520px] relative">
                      <input className="h-[38px] w-full rounded border border-gray-300 px-3 pr-8 text-[13px] text-gray-700" value={quickCustomerForm.priceList} onChange={(e) => handleQuickCustomerFieldChange("priceList", e.target.value)} />
                      <ChevronDown size={22} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                    </div>

                    <label className="text-[14px] text-gray-700">Enable Portal?</label>
                    <label className="inline-flex items-center gap-2 text-[14px] text-gray-700">
                      <input type="checkbox" checked={quickCustomerForm.enablePortal} onChange={(e) => handleQuickCustomerFieldChange("enablePortal", e.target.checked)} />
                      <span>Allow portal access for this customer</span>
                    </label>

                    <label className="text-[14px] text-gray-700">Documents</label>
                    <div>
                      <input
                        ref={quickCustomerFileInputRef}
                        type="file"
                        className="hidden"
                        multiple
                        onChange={handleQuickCustomerFileChange}
                      />
                      <button
                        type="button"
                        onClick={() => quickCustomerFileInputRef.current?.click()}
                        className="h-[36px] px-4 rounded border border-dashed border-gray-300 text-[13px] text-gray-700 bg-white hover:bg-gray-50 inline-flex items-center gap-2"
                      >
                        <span className="inline-flex items-center justify-center text-gray-500">
                          <svg width="14" height="14" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" className="block">
                            <path d="M10 13.5V4.5M10 4.5L6.5 8M10 4.5L13.5 8M3.5 12.5V14.5C3.5 15.6 4.4 16.5 5.5 16.5H14.5C15.6 16.5 16.5 15.6 16.5 14.5V12.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </span>
                        <span>Upload File</span>
                        <ChevronDown size={14} className="text-gray-500" />
                      </button>
                      <p className="mt-1 text-[12px] text-gray-500">You can upload a maximum of 10 files, 10MB each</p>
                      {quickCustomerFiles.length > 0 && (
                        <div className="mt-1 text-[12px] text-gray-600">
                          {quickCustomerFiles.length} file(s): {quickCustomerFiles.map((f) => f.name).join(", ")}
                        </div>
                      )}
                    </div>

                    <div />
                    <button
                      type="button"
                      onClick={() => setIsQuickCustomerMoreDetailsOpen((prev) => !prev)}
                      className="w-fit text-[14px] text-[#2563eb] hover:underline"
                    >
                      {isQuickCustomerMoreDetailsOpen ? "Hide more details" : "Add more details"}
                    </button>

                    {isQuickCustomerMoreDetailsOpen && (
                      <>
                        <label className="text-[14px] text-gray-700">Website URL</label>
                        <div className="max-w-[520px] relative">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400">
                            <svg width="16" height="16" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg" className="block fill-current">
                              <path d="M437 75C389 27 325 0 257 0h-2C187 0 123 27 75 75 27 123 0 188 0 256s27 133 75 181c48 48 112 75 180 75h2c68 0 132-27 180-75 48-48 75-113 75-181s-27-133-75-181zM40 236c5-50 26-96 62-133 23-23 51-41 82-51-5 9-10 19-14 30-17 42-27 96-29 154H40zm62 173c-36-36-57-83-62-133h101c2 58 12 112 29 154 4 11 9 21 14 30-31-10-59-28-82-51zm228 7c-14 35-32 56-48 56s-34-21-48-56c-15-38-24-87-26-140h148c-2 53-11 102-26 140zm0-180H182c2-53 11-102 26-140 14-35 32-56 48-56s34 21 48 56c15 38 24 87 26 140zm13 224c5-9 10-19 14-30 17-42 27-96 29-154h101c-5 50-26 97-62 133-23 23-51 41-82 51zm43-224c-2-58-12-112-29-154-4-11-9-21-14-30 31 10 59 28 82 51 36 37 57 83 62 133H386z"/>
                            </svg>
                          </span>
                          <input
                            className="h-[38px] w-full rounded border border-gray-300 pl-8 pr-3 text-[13px] text-gray-700"
                            placeholder="ex: www.zylker.com"
                            value={quickCustomerForm.websiteUrl}
                            onChange={(e) => handleQuickCustomerFieldChange("websiteUrl", e.target.value)}
                          />
                        </div>

                        <label className="text-[14px] text-gray-700">Department</label>
                        <input
                          className="h-[38px] max-w-[520px] rounded border border-gray-300 px-3 text-[13px] text-gray-700"
                          value={quickCustomerForm.department}
                          onChange={(e) => handleQuickCustomerFieldChange("department", e.target.value)}
                        />

                        <label className="text-[14px] text-gray-700">Designation</label>
                        <input
                          className="h-[38px] max-w-[520px] rounded border border-gray-300 px-3 text-[13px] text-gray-700"
                          value={quickCustomerForm.designation}
                          onChange={(e) => handleQuickCustomerFieldChange("designation", e.target.value)}
                        />

                        <label className="text-[14px] text-gray-700">X</label>
                        <div>
                          <div className="max-w-[520px] w-full flex rounded border border-gray-300 overflow-hidden">
                            <span className="h-[38px] w-9 border-r border-gray-300 bg-[#f8fafc] flex items-center justify-center text-gray-700">
                              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" className="fill-current">
                                <path d="M14.23 10.16L22.97 0H20.9l-7.59 8.82L7.24 0H.25l9.17 13.34L.25 24h2.07l8.02-9.32 6.4 9.32h6.99l-9.5-13.84zm-2.84 3.3l-.93-1.33L3.07 1.56h3.18l5.97 8.53.92 1.33 7.76 11.09h-3.18l-6.33-9.05z"></path>
                              </svg>
                            </span>
                            <input
                              className="h-[38px] w-full px-3 text-[13px] text-gray-700 outline-none"
                              value={quickCustomerForm.xHandle}
                              onChange={(e) => handleQuickCustomerFieldChange("xHandle", e.target.value)}
                            />
                          </div>
                          <p className="mt-1 text-[12px] text-gray-500">https://x.com/</p>
                        </div>

                        <label className="text-[14px] text-gray-700">Skype Name/Number</label>
                        <div className="max-w-[520px] w-full flex rounded border border-gray-300 overflow-hidden">
                          <span className="h-[38px] w-9 border-r border-gray-300 bg-[#f8fafc] flex items-center justify-center">
                            <span className="w-4 h-4 rounded-full bg-[#00aff0] text-white text-[11px] leading-4 text-center font-semibold">S</span>
                          </span>
                          <input
                            className="h-[38px] w-full px-3 text-[13px] text-gray-700 outline-none"
                            value={quickCustomerForm.skype}
                            onChange={(e) => handleQuickCustomerFieldChange("skype", e.target.value)}
                          />
                        </div>

                        <label className="text-[14px] text-gray-700">Facebook</label>
                        <div>
                          <div className="max-w-[520px] w-full flex rounded border border-gray-300 overflow-hidden">
                            <span className="h-[38px] w-9 border-r border-gray-300 bg-[#f8fafc] flex items-center justify-center">
                              <svg width="14" height="14" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" className="block">
                                <path d="M64 32.199C64 14.425 49.664 0 32 0S0 14.425 0 32.199C0 48.282 11.7 61.612 27.024 64V41.484H18.85v-9.285h8.173v-7.096c0-8.058 4.745-12.535 12.061-12.535 3.494 0 7.119.663 7.119.663v7.86h-4.02c-3.988 0-5.24 2.52-5.24 5.04v6.035h8.897l-1.417 9.285h-7.48v22.516C52.3 61.612 64 48.282 64 32.199z" fill="#1877F2"></path>
                              </svg>
                            </span>
                            <input
                              className="h-[38px] w-full px-3 text-[13px] text-gray-700 outline-none"
                              value={quickCustomerForm.facebook}
                              onChange={(e) => handleQuickCustomerFieldChange("facebook", e.target.value)}
                            />
                          </div>
                          <p className="mt-1 text-[12px] text-gray-500">http://www.facebook.com/</p>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {quickCustomerTab === "address" && (
                  <div className="grid grid-cols-2 gap-6 pt-4">
                    <div className="space-y-3">
                      <h3 className="text-[14px] text-gray-800">Billing Address</h3>
                      <input className="h-[38px] w-full rounded border border-gray-300 px-3 text-[13px]" placeholder="Attention" value={quickCustomerForm.billingAttention} onChange={(e) => handleQuickCustomerFieldChange("billingAttention", e.target.value)} />
                      <input className="h-[38px] w-full rounded border border-gray-300 px-3 text-[13px]" placeholder="Country/Region" value={quickCustomerForm.billingCountry} onChange={(e) => handleQuickCustomerFieldChange("billingCountry", e.target.value)} />
                      <textarea className="min-h-[64px] w-full rounded border border-gray-300 px-3 py-2 text-[13px]" placeholder="Street 1" value={quickCustomerForm.billingStreet1} onChange={(e) => handleQuickCustomerFieldChange("billingStreet1", e.target.value)} />
                      <textarea className="min-h-[64px] w-full rounded border border-gray-300 px-3 py-2 text-[13px]" placeholder="Street 2" value={quickCustomerForm.billingStreet2} onChange={(e) => handleQuickCustomerFieldChange("billingStreet2", e.target.value)} />
                      <input className="h-[38px] w-full rounded border border-gray-300 px-3 text-[13px]" placeholder="City" value={quickCustomerForm.billingCity} onChange={(e) => handleQuickCustomerFieldChange("billingCity", e.target.value)} />
                      <input className="h-[38px] w-full rounded border border-gray-300 px-3 text-[13px]" placeholder="State" value={quickCustomerForm.billingState} onChange={(e) => handleQuickCustomerFieldChange("billingState", e.target.value)} />
                      <input className="h-[38px] w-full rounded border border-gray-300 px-3 text-[13px]" placeholder="ZIP Code" value={quickCustomerForm.billingZipCode} onChange={(e) => handleQuickCustomerFieldChange("billingZipCode", e.target.value)} />
                    </div>
                    <div className="space-y-3">
                      <h3 className="text-[14px] text-gray-800">Shipping Address</h3>
                      <input className="h-[38px] w-full rounded border border-gray-300 px-3 text-[13px]" placeholder="Attention" value={quickCustomerForm.shippingAttention} onChange={(e) => handleQuickCustomerFieldChange("shippingAttention", e.target.value)} />
                      <input className="h-[38px] w-full rounded border border-gray-300 px-3 text-[13px]" placeholder="Country/Region" value={quickCustomerForm.shippingCountry} onChange={(e) => handleQuickCustomerFieldChange("shippingCountry", e.target.value)} />
                      <textarea className="min-h-[64px] w-full rounded border border-gray-300 px-3 py-2 text-[13px]" placeholder="Street 1" value={quickCustomerForm.shippingStreet1} onChange={(e) => handleQuickCustomerFieldChange("shippingStreet1", e.target.value)} />
                      <textarea className="min-h-[64px] w-full rounded border border-gray-300 px-3 py-2 text-[13px]" placeholder="Street 2" value={quickCustomerForm.shippingStreet2} onChange={(e) => handleQuickCustomerFieldChange("shippingStreet2", e.target.value)} />
                      <input className="h-[38px] w-full rounded border border-gray-300 px-3 text-[13px]" placeholder="City" value={quickCustomerForm.shippingCity} onChange={(e) => handleQuickCustomerFieldChange("shippingCity", e.target.value)} />
                      <input className="h-[38px] w-full rounded border border-gray-300 px-3 text-[13px]" placeholder="State" value={quickCustomerForm.shippingState} onChange={(e) => handleQuickCustomerFieldChange("shippingState", e.target.value)} />
                      <input className="h-[38px] w-full rounded border border-gray-300 px-3 text-[13px]" placeholder="ZIP Code" value={quickCustomerForm.shippingZipCode} onChange={(e) => handleQuickCustomerFieldChange("shippingZipCode", e.target.value)} />
                    </div>
                  </div>
                )}

                {quickCustomerTab === "customFields" && (
                  <div className="py-8 text-[13px] text-gray-500">Start adding custom fields from Settings &gt; Preferences &gt; Customers.</div>
                )}

                {quickCustomerTab === "reportingTags" && (
                  <div className="pt-4 grid grid-cols-[170px_1fr] gap-4">
                    <label className="text-[14px] text-gray-700">sc</label>
                    <div className="max-w-[520px] relative">
                      <input className="h-[38px] w-full rounded border border-gray-300 px-3 pr-8 text-[13px] text-gray-700" value={quickCustomerForm.tagSc} onChange={(e) => handleQuickCustomerFieldChange("tagSc", e.target.value)} />
                      <ChevronDown size={22} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                    </div>
                    <label className="text-[14px] text-gray-700">wsq</label>
                    <div className="max-w-[520px] relative">
                      <input className="h-[38px] w-full rounded border border-gray-300 px-3 pr-8 text-[13px] text-gray-700" value={quickCustomerForm.tagWsq} onChange={(e) => handleQuickCustomerFieldChange("tagWsq", e.target.value)} />
                      <ChevronDown size={22} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                    </div>
                  </div>
                )}

                {quickCustomerTab === "remarks" && (
                  <div className="pt-4 grid grid-cols-[170px_1fr] gap-4">
                    <label className="text-[14px] text-gray-700">Remarks</label>
                    <textarea rows={5} className="max-w-[760px] rounded border border-gray-300 px-3 py-2 text-[13px] text-gray-700" value={quickCustomerForm.notes} onChange={(e) => handleQuickCustomerFieldChange("notes", e.target.value)} />
                  </div>
                )}
              </div>
            </div>

            <div className="border-t border-gray-200 px-6 py-4 flex items-center gap-3 bg-white">
              <button type="button" onClick={handleSaveQuickCustomer} disabled={isSavingQuickCustomer} className="h-[36px] px-6 rounded bg-[#22b573] text-white text-[14px] font-medium disabled:opacity-60">
                {isSavingQuickCustomer ? "Saving..." : "Save"}
              </button>
              <button type="button" onClick={closeCustomerQuickAction} disabled={isSavingQuickCustomer} className="h-[36px] px-6 rounded border border-gray-300 text-[14px] text-gray-700 bg-white">
                Cancel
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {isRetainerNumberModalOpen && typeof document !== "undefined" && document.body && createPortal(
        <div className="fixed inset-0 z-[10000] bg-black/45 flex items-center justify-center p-4" onClick={() => setIsRetainerNumberModalOpen(false)}>
          <div className="w-full max-w-[640px] bg-white rounded-lg shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="h-14 border-b border-gray-200 px-5 flex items-center justify-between">
              <h3 className="text-[16px] font-medium text-gray-800">Configure Retainer Invoice Number Preferences</h3>
              <button
                type="button"
                onClick={() => setIsRetainerNumberModalOpen(false)}
                className="w-7 h-7 rounded text-[#ef4444] hover:bg-red-50 flex items-center justify-center"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-5">
              <div className="mb-4 flex items-start gap-10 text-[14px] text-gray-700">
                <div>
                  <div className="font-semibold text-[13px]">Location</div>
                  <div>{selectedLocation || "Head Office"}</div>
                </div>
                <div>
                  <div className="font-semibold text-[13px]">Associated Series</div>
                  <div>Default Transaction Series</div>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-4">
                <p className="text-[14px] text-gray-700 max-w-[560px] mb-4">
                  {retainerNumberMode === "manual"
                    ? "You have selected manual retainer invoice numbering. Do you want us to auto-generate it for you?"
                    : "Your retainer invoice numbers are set on auto-generate mode to save your time. Are you sure about changing this setting?"}
                </p>

                <label className="flex items-center gap-2 text-[14px] text-gray-800 mb-2">
                  <input
                    type="radio"
                    name="retainer-number-mode"
                    checked={retainerNumberMode === "auto"}
                    onChange={() => setRetainerNumberMode("auto")}
                  />
                  <span>Continue auto-generating retainer invoice numbers</span>
                  <Info size={12} className="text-gray-500" />
                </label>

                {retainerNumberMode === "auto" && (
                  <div className="ml-6 mb-3 grid grid-cols-[130px_1fr] gap-3 max-w-[400px]">
                    <div>
                      <label className="block text-[12px] text-gray-600 mb-1">Prefix</label>
                      <input
                        value={retainerPrefix}
                        onChange={(e) => setRetainerPrefix(e.target.value)}
                        className="h-[34px] w-full rounded border border-gray-300 px-2 text-[13px] outline-none focus:border-blue-400"
                      />
                    </div>
                    <div>
                      <label className="block text-[12px] text-gray-600 mb-1">Next Number</label>
                      <input
                        value={retainerNextNumber}
                        onChange={(e) => setRetainerNextNumber(extractRetainerDigits(e.target.value))}
                        className="h-[34px] w-full rounded border border-gray-300 px-2 text-[13px] outline-none focus:border-blue-400"
                      />
                    </div>
                  </div>
                )}

                <label className="flex items-center gap-2 text-[14px] text-gray-800">
                  <input
                    type="radio"
                    name="retainer-number-mode"
                    checked={retainerNumberMode === "manual"}
                    onChange={() => setRetainerNumberMode("manual")}
                  />
                  <span>Enter retainer invoice numbers manually</span>
                </label>
              </div>
            </div>

            <div className="border-t border-gray-200 px-5 py-4 flex items-center gap-2">
              <button
                type="button"
                onClick={saveRetainerNumberPreferences}
                className="h-[34px] px-4 rounded bg-[#22b573] text-white text-[14px] font-medium"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => setIsRetainerNumberModalOpen(false)}
                className="h-[34px] px-4 rounded border border-gray-300 bg-white text-[14px] text-gray-700"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}






