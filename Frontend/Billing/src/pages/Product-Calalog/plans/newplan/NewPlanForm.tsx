import React, { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, HelpCircle, Image as ImageIcon, PlusCircle, Search, X, GripVertical, Trash2 } from "lucide-react";
import { toast } from "react-toastify";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useOrganizationBranding } from "../../../../hooks/useOrganizationBranding";
import { useCurrency } from "../../../../hooks/useCurrency";
import { taxesAPI, unitsAPI } from "../../../../services/api";
import NewProductModal from "../newProduct/NewProductModal";
import ManageUnitsModal from "../../items/components/modals/ManageUnitsModal";

const BILLING_PERIODS = ["Day(s)", "Week(s)", "Month(s)", "Year(s)"];
const BILLING_CYCLES = ["Auto-renews until canceled", "Fixed number of cycles"];
const PRICING_MODELS = ["Per Unit", "Flat"];
const UNIT_NAMES = ["box", "cm", "dz", "ft", "g", "in", "kg", "km", "lb", "mg", "ml", "m", "pcs", "SAV"];
const ACCOUNT_GROUPS: Array<{ label: string; options: string[] }> = [
  { label: "Other Current Asset", options: ["Advance Tax", "Employee Advance", "Goods In Transit", "Prepaid Expenses"] },
  { label: "Fixed Asset", options: ["Furniture and Equipment"] },
  { label: "Other Current Liability", options: ["Employee Reimbursements", "Opening Balance Adjustments", "Unearned Revenue"] },
  { label: "Equity", options: ["Drawings", "Opening Balance Offset", "Owner's Equity"] },
  { label: "Income", options: ["Discount", "General Income", "Interest Income", "Late Fee Income", "Other Charges", "Sales", "Shipping Charge"] },
  {
    label: "Expense",
    options: [
      "Advertising And Marketing",
      "Automobile Expense",
      "Bad Debt",
      "Bank Fees and Charges",
      "Consultant Expense",
      "Credit Card Charges",
      "Depreciation Expense",
      "IT and Internet Expenses",
      "Janitorial Expense",
      "Lodging",
      "Meals and Entertainment",
      "Office Supplies",
      "Other Expenses",
      "Postage",
      "Printing and Stationery",
      "Purchase Discounts",
      "Rent Expense",
      "Repairs and Maintenance",
      "Salaries and Employee Wages",
      "Telephone Expense",
      "Travel Expense",
      "Uncategorized",
    ],
  },
  { label: "Cost Of Goods Sold", options: ["Cost of Goods Sold"] },
];
const PRODUCTS_STORAGE_KEY = "inv_products_v1";
const PLANS_STORAGE_KEY = "inv_plans_v1";
const TAX_GROUP_MARKER = "__taban_tax_group__";

const normalizeTaxOptions = (rows: any[]) =>
  rows
    .filter((tax) => {
      if (!tax) return false;
      if (tax.isActive === false) return false;
      if (tax.description === TAX_GROUP_MARKER) return false;
      if (tax.isGroup === true || String(tax.type || "").toLowerCase() === "group") return false;
      return true;
    })
    .map((tax) => {
      const name = String(tax.name || tax.taxName || "").trim();
      const rate = Number(tax.rate ?? tax.taxRate ?? 0);
      if (!name) return "";
      const safeRate = Number.isFinite(rate) ? rate : 0;
      return `${name} [${safeRate}%]`;
    })
    .filter(Boolean);

interface DropdownOption {
  value: string;
  label: string;
}

interface StyledDropdownProps {
  value: string;
  options?: Array<string | DropdownOption>;
  groupedOptions?: Array<{ label: string; options: Array<string | DropdownOption> }>;
  onChange: (value: string) => void;
  placeholder: string;
  disabled?: boolean;
  searchable?: boolean;
  footerActionLabel?: string;
  onFooterActionClick?: () => void;
  selectedStyle?: "default" | "blue";
  groupLabel?: string;
}

function StyledDropdown({
  value,
  options = [],
  groupedOptions,
  onChange,
  placeholder,
  disabled = false,
  searchable = true,
  footerActionLabel,
  onFooterActionClick,
  selectedStyle = "default",
  groupLabel,
}: StyledDropdownProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const wrapperRef = useRef<HTMLDivElement>(null);

  const normalizedOptions: DropdownOption[] = options.map((opt) =>
    typeof opt === "string" ? { value: opt, label: opt } : opt
  );
  const normalizedGroups =
    groupedOptions?.map((group) => ({
      label: group.label,
      options: group.options.map((opt) => (typeof opt === "string" ? { value: opt, label: opt } : opt)),
    })) || [];
  const sourceOptions = normalizedGroups.length > 0 ? normalizedGroups.flatMap((group) => group.options) : normalizedOptions;
  const selected = sourceOptions.find((opt) => opt.value === value);
  const filteredOptions = sourceOptions.filter((opt) => opt.label.toLowerCase().includes(searchTerm.toLowerCase()));
  const filteredGroups =
    normalizedGroups.length > 0
      ? normalizedGroups
        .map((group) => ({
          ...group,
          options: group.options.filter((opt) => opt.label.toLowerCase().includes(searchTerm.toLowerCase())),
        }))
        .filter((group) => group.options.length > 0)
      : [];

  useEffect(() => {
    const handleOutside = (event: MouseEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={() => !disabled && setOpen((prev) => !prev)}
        disabled={disabled}
        className={`h-[36px] w-full rounded border px-3 text-left text-[13px] transition-colors ${disabled
          ? "cursor-not-allowed border-gray-200 bg-gray-50 text-gray-400"
          : open
            ? "border-gray-300 bg-white text-[#1f2937]"
            : "border-gray-200 bg-white text-[#1f2937] hover:border-gray-300"
          }`}
      >
        <div className="flex items-center justify-between gap-2">
          <span className={selected ? "text-[#1f2937]" : "text-[#6b7280]"}>{selected?.label || placeholder}</span>
          <ChevronDown size={14} className={`text-[#64748b] transition-transform ${open ? "rotate-180" : ""}`} />
        </div>
      </button>

      {open && !disabled && (
        <div className="absolute left-0 top-full z-[120] mt-1 w-full rounded-xl border border-gray-200 bg-white p-2 shadow-xl animate-in fade-in zoom-in-95 duration-200">
          {searchable && (
            <div className="mb-2 flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 focus-within:border-gray-300 transition-colors">
              <Search size={14} className="text-gray-400" />
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search"
                className="w-full border-none bg-transparent text-[13px] text-gray-700 outline-none placeholder:text-gray-400"
              />
            </div>
          )}

          {groupLabel ? <div className="px-2 pb-1 text-[13px] font-semibold text-gray-700">{groupLabel}</div> : null}

          <div className="max-h-52 overflow-auto rounded-lg bg-white">
            {normalizedGroups.length > 0 ? (
              filteredGroups.length === 0 ? (
                <div className="px-3 py-2 text-[13px] text-gray-400">No options found</div>
              ) : (
                filteredGroups.map((group) => (
                  <div key={group.label} className="mb-1 last:mb-0">
                    <div className="px-2 pb-1 text-[13px] font-semibold text-gray-700">{group.label}</div>
                    {group.options.map((opt) => {
                      const isSelected = value === opt.value;
                      return (
                        <button
                          type="button"
                          key={`${group.label}-${opt.value}`}
                          onClick={() => {
                            onChange(opt.value);
                            setOpen(false);
                            setSearchTerm("");
                          }}
                          className={`mb-1 flex w-full items-center justify-between rounded-lg px-4 py-2 text-[13px] transition-colors last:mb-0 ${isSelected
                            ? "bg-slate-50 text-slate-900 font-medium"
                            : "text-gray-600 hover:bg-slate-50 hover:text-slate-900"
                            }`}
                        >
                          <span>{opt.label}</span>
                          {isSelected ? (
                            <Check size={14} className="text-gray-500" />
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                ))
              )
            ) : filteredOptions.length === 0 ? (
              <div className="px-3 py-2 text-[13px] text-gray-400">No options found</div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = value === opt.value;
                return (
                  <button
                    type="button"
                    key={opt.value}
                    onClick={() => {
                      onChange(opt.value);
                      setOpen(false);
                      setSearchTerm("");
                    }}
                    className={`mb-1 flex w-full items-center justify-between rounded-lg px-3 py-2 text-[13px] transition-colors last:mb-0 ${isSelected
                      ? "bg-slate-50 text-slate-900 font-medium"
                      : "text-gray-600 hover:bg-slate-50 hover:text-slate-900"
                      }`}
                  >
                    <span>{opt.label}</span>
                    {isSelected ? (
                      <Check size={14} className="text-gray-500" />
                    ) : null}
                  </button>
                );
              })
            )}
          </div>

          {footerActionLabel && onFooterActionClick && (
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setSearchTerm("");
                onFooterActionClick();
              }}
              className="mt-2 flex w-full items-center gap-2 border-t border-gray-100 px-2 pt-2 text-[13px] text-gray-600 hover:text-gray-900 transition-colors"
            >
              <PlusCircle size={14} />
              {footerActionLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

const getActiveProductNames = (): string[] => {
  try {
    const productRaw = localStorage.getItem(PRODUCTS_STORAGE_KEY);
    const productParsed = productRaw ? JSON.parse(productRaw) : [];
    const rows = Array.isArray(productParsed) ? productParsed : [];
    return Array.from(
      new Set(
        rows
          .filter((row: any) => {
            const isInactive =
              row?.active === false || String(row?.status || "").toLowerCase() === "inactive";
            return !isInactive;
          })
          .map((row: any) => String(row?.name || row?.displayName || "").trim())
          .filter(Boolean)
      )
    );
  } catch {
    return [];
  }
};

const dedupeOptions = (rows: string[]) => {
  const seen = new Set<string>();
  const out: string[] = [];
  rows.forEach((value) => {
    const trimmed = String(value || "").trim();
    if (!trimmed) return;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push(trimmed);
  });
  return out;
};

const toPricePeriodLabel = (period: string) => {
  const value = String(period || "").toLowerCase();
  if (value.includes("day")) return "day";
  if (value.includes("week")) return "week";
  if (value.includes("year")) return "year";
  return "month";
};

const normalizePricingModel = (value: string) => {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "flat") return "Flat";
  return "Per Unit";
};

export default function NewPlanForm() {
  const { accentColor } = useOrganizationBranding();
  const { baseCurrency } = useCurrency();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editPlanId = searchParams.get("edit");
  const clonePlanId = searchParams.get("clone");
  const productPrefill = searchParams.get("product");
  const isEditMode = Boolean(editPlanId);

  const [products, setProducts] = useState<string[]>([]);
  const [newProductModalOpen, setNewProductModalOpen] = useState(false);
  const [isUnitModalOpen, setIsUnitModalOpen] = useState(false);
  const [unitOptions, setUnitOptions] = useState<string[]>([]);
  const [taxOptions, setTaxOptions] = useState<string[]>([]);
  const [images, setImages] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<"pricing" | "hosted" | "details">("pricing");
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState({
    product: "",
    planName: "",
    planCode: "",
    billingFrequencyValue: "1",
    billingFrequencyPeriod: "Month(s)",
    billingCyclesType: BILLING_CYCLES[0],
    billingCyclesCount: "",
    planDescription: "",
    pricingModel: PRICING_MODELS[0],
    unitName: "",
    price: "",
    freeTrialDays: "",
    setupFee: "",
    type: "Service",
    salesTax: "",
    widgetsPreference: false,
    planFeatures: [{ name: "", tooltip: "", addNewTag: false }],
    planChange: false,
    planAccount: "Sales",
    setupFeeAccount: "Sales",
  });

  const hasSelectedProduct = Boolean(form.product);
  const lockDependentFields = !hasSelectedProduct;
  const mergedUnitOptions = dedupeOptions([form.unitName, ...UNIT_NAMES, ...unitOptions]);
  const mergedTaxOptions = dedupeOptions([form.salesTax, ...taxOptions]);
  const pricePeriodLabel = toPricePeriodLabel(form.billingFrequencyPeriod);
  const isFlatPricing = form.pricingModel === "Flat";
  const currencyCode = String(baseCurrency?.code || "USD").split(" - ")[0].trim().toUpperCase() || "USD";

  const toBillingPeriod = (value: string) => {
    const v = String(value || "").toLowerCase();
    if (v.includes("day")) return "Day(s)";
    if (v.includes("week")) return "Week(s)";
    if (v.includes("year")) return "Year(s)";
    return "Month(s)";
  };

  const parseFrequency = (value: string) => {
    const trimmed = String(value || "").trim();
    const match = trimmed.match(/^(\d+)\s*(.*)$/);
    if (!match) return { frequencyValue: "1", frequencyPeriod: "Month(s)" };
    return {
      frequencyValue: match[1] || "1",
      frequencyPeriod: toBillingPeriod(match[2] || "Month(s)"),
    };
  };

  useEffect(() => {
    const loadActiveProducts = () => {
      setProducts(getActiveProductNames());
    };

    loadActiveProducts();

    const onStorage = () => loadActiveProducts();
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const refreshUnits = async () => {
    try {
      const response: any = await unitsAPI.getAll();
      const apiUnits = Array.isArray(response?.data) ? response.data : Array.isArray(response) ? response : [];
      const normalized = apiUnits
        .map((unit: any) => String(unit?.name || unit?.unitName || "").trim())
        .filter(Boolean);
      setUnitOptions(normalized);
    } catch (error) {
      console.warn("Failed to fetch units", error);
    }
  };

  const refreshTaxes = async () => {
    try {
      const response: any = await taxesAPI.getAll({ limit: 1000 });
      const apiRows = Array.isArray(response?.data) ? response.data : Array.isArray(response) ? response : [];
      let options = normalizeTaxOptions(apiRows);
      if (options.length === 0) {
        const settingsRows = JSON.parse(localStorage.getItem("taban_settings_taxes_v1") || "[]");
        if (Array.isArray(settingsRows)) {
          options = normalizeTaxOptions(settingsRows);
        }
      }
      setTaxOptions(Array.from(new Set(options)));
    } catch (error) {
      console.warn("Failed to fetch taxes", error);
    }
  };

  useEffect(() => {
    refreshUnits();
    refreshTaxes();
  }, []);

  const handleNewProductSaved = () => {
    const names = getActiveProductNames();
    setProducts(names);
    if (names.length > 0) {
      setForm((prev) => ({ ...prev, product: names[0] }));
    }
  };

  useEffect(() => {
    if (!productPrefill || editPlanId || clonePlanId) return;
    setForm((prev) => ({ ...prev, product: prev.product || productPrefill }));
  }, [productPrefill, editPlanId, clonePlanId]);

  useEffect(() => {
    const sourceId = editPlanId || clonePlanId;
    if (!sourceId) return;
    try {
      const raw = localStorage.getItem(PLANS_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      const rows = Array.isArray(parsed) ? parsed : [];
      const source = rows.find((row: any) => String(row?.id || row?._id) === sourceId);
      if (!source) return;

      const parsedFrequency = parseFrequency(source?.billingFrequency || "");
      setForm({
        product: String(source?.product || ""),
        planName: String(source?.planName || source?.plan || ""),
        planCode: String(source?.planCode || ""),
        billingFrequencyValue: String(source?.billingFrequencyValue || parsedFrequency.frequencyValue || "1"),
        billingFrequencyPeriod: String(source?.billingFrequencyPeriod || parsedFrequency.frequencyPeriod || "Month(s)"),
        billingCyclesType:
          source?.billingCyclesType ||
          (String(source?.billingCyclesCount || "").trim() ? "Fixed number of cycles" : "Auto-renews until canceled"),
        billingCyclesCount: String(source?.billingCyclesCount || ""),
        planDescription: String(source?.planDescription || source?.description || ""),
        pricingModel: normalizePricingModel(String(source?.pricingModel || source?.pricingScheme || "Per Unit")),
        unitName: String(source?.unitName || ""),
        price: String(source?.price || ""),
        freeTrialDays: String(source?.freeTrialDays || source?.trialDays || ""),
        setupFee: String(source?.setupFee || ""),
        type: source?.type === "Goods" ? "Goods" : "Service",
        salesTax: String(source?.salesTax || source?.taxName || ""),
        widgetsPreference: source?.widgetsPreference || false,
        planFeatures: source?.planFeatures || [{ name: "", tooltip: "", addNewTag: false }],
        planChange: source?.planChange || false,
        planAccount: source?.planAccount || "Sales",
        setupFeeAccount: source?.setupFeeAccount || "Sales",
      });

      const image = String(source?.image || "");
      setImages(image ? [image] : []);
    } catch (error) {
      console.error("Failed to prefill plan form", error);
    }
  }, [editPlanId, clonePlanId]);

  const inputClass =
    "h-[36px] w-full rounded border border-gray-200 bg-white px-3 text-[13px] text-[#1f2937] outline-none focus:border-gray-400 disabled:bg-gray-50 disabled:text-[#9ca3af] disabled:border-gray-200 disabled:cursor-not-allowed transition-all";

  const onFieldChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const onImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setImages([String(reader.result || "")]);
    reader.readAsDataURL(file);
    event.target.value = "";
  };

  const handleSave = async () => {
    if (!form.product) {
      toast.error("Product is required.");
      return;
    }
    if (!form.planName.trim()) {
      toast.error("Plan Name is required.");
      return;
    }
    if (!form.planCode.trim()) {
      toast.error("Plan Code is required.");
      return;
    }
    if (!form.price || Number(form.price) <= 0) {
      toast.error("Price must be greater than 0.");
      return;
    }

    setIsSaving(true);
    try {
      const raw = localStorage.getItem(PLANS_STORAGE_KEY);
      const current = raw ? JSON.parse(raw) : [];
      const rows = Array.isArray(current) ? current : [];
      const now = new Date().toISOString();

      if (isEditMode && editPlanId) {
        const idx = rows.findIndex((row: any) => String(row?.id || row?._id) === editPlanId);
        if (idx === -1) {
          toast.error("Plan not found for editing.");
          return;
        }

        const existing = rows[idx];
        const updatedRecord = {
          ...existing,
          ...form,
          price: Number(form.price),
          setupFee: Number(form.setupFee || 0),
          freeTrialDays: Number(form.freeTrialDays || 0),
          image: images[0] || existing?.image || "",
          createdAt: existing?.createdAt || now,
          updatedAt: now,
        };
        const nextRows = [...rows];
        nextRows[idx] = updatedRecord;
        localStorage.setItem(PLANS_STORAGE_KEY, JSON.stringify(nextRows));
        toast.success("Plan updated successfully");
        navigate(`/products/plans/${updatedRecord.id}`);
        return;
      }

      const id = `plan-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
      const record = {
        id,
        ...form,
        price: Number(form.price),
        setupFee: Number(form.setupFee || 0),
        freeTrialDays: Number(form.freeTrialDays || 0),
        image: images[0] || "",
        status: "Active",
        createdAt: now,
        updatedAt: now,
      };
      localStorage.setItem(PLANS_STORAGE_KEY, JSON.stringify([record, ...rows]));
      toast.success(clonePlanId ? "Plan cloned successfully" : "Plan saved successfully");
      navigate("/products/plans");
    } catch (error) {
      console.error("Failed to save plan:", error);
      toast.error("Failed to save plan");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex h-screen flex-col bg-gray-50">
      <div className="flex items-center justify-between border-b border-gray-200 bg-white px-8 py-5">
        <h1 className="text-[18px] font-medium text-[#111827]">
          {isEditMode ? "Edit Plan" : clonePlanId ? "Clone Plan" : "Add Plan"}
        </h1>
        <button
          type="button"
          onClick={() => (isEditMode && editPlanId ? navigate(`/products/plans/${editPlanId}`) : navigate("/products/plans"))}
          className="text-gray-500 hover:text-gray-700"
        >
          <X size={26} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="border-b border-gray-200 bg-gray-50 px-8 py-8">
          <div className="grid grid-cols-1 gap-10 xl:grid-cols-[1fr_320px]">
            <div className="space-y-6">
              <div className="grid grid-cols-1 items-center gap-4 md:grid-cols-[180px_340px]">
                <label className="text-[13px] text-[#ef4444]">Product*</label>
                <StyledDropdown
                  value={form.product}
                  options={products}
                  onChange={(newValue) => setForm((prev) => ({ ...prev, product: newValue }))}
                  placeholder={products.length ? "Select Product" : "No active products found"}
                  footerActionLabel="New Product"
                  onFooterActionClick={() => setNewProductModalOpen(true)}
                  selectedStyle="blue"
                />
              </div>

              <div className={`grid grid-cols-1 gap-8 xl:grid-cols-2 ${lockDependentFields ? "opacity-45" : ""}`}>
                <div className="grid grid-cols-1 items-center gap-4 md:grid-cols-[180px_340px]">
                  <label className="text-[13px] text-[#ef4444]">Plan Name*</label>
                  <input name="planName" value={form.planName} onChange={onFieldChange} className={inputClass} disabled={lockDependentFields} />
                </div>
                <div className="grid grid-cols-1 items-center gap-4 md:grid-cols-[180px_340px_auto]">
                  <label className="text-[13px] text-[#ef4444]">Plan Code*</label>
                  <input name="planCode" value={form.planCode} onChange={onFieldChange} className={inputClass} disabled={lockDependentFields} />
                  <HelpCircle size={16} className="text-gray-400" />
                </div>
              </div>

              <div className={`grid grid-cols-1 gap-8 xl:grid-cols-2 ${lockDependentFields ? "opacity-45" : ""}`}>
                <div className="grid grid-cols-1 items-center gap-4 md:grid-cols-[180px_340px]">
                  <label className="text-[13px] text-[#ef4444]">Billing Frequency*</label>
                  <div className="grid grid-cols-[86px_1fr] gap-3">
                    <input
                      name="billingFrequencyValue"
                      value={form.billingFrequencyValue}
                      onChange={onFieldChange}
                      className={`${inputClass} text-center`}
                      disabled={lockDependentFields}
                    />
                    <div className="relative">
                      <StyledDropdown
                        value={form.billingFrequencyPeriod}
                        options={BILLING_PERIODS}
                        onChange={(newValue) =>
                          setForm((prev) => ({ ...prev, billingFrequencyPeriod: newValue }))
                        }
                        placeholder="Select period"
                        disabled={lockDependentFields}
                      />
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 items-center gap-4 md:grid-cols-[180px_340px_auto]">
                  <label className="text-[13px] text-[#ef4444]">Billing Cycles*</label>
                  <div className="grid grid-cols-[220px_84px] gap-3">
                    <div className="relative">
                      <StyledDropdown
                        value={form.billingCyclesType}
                        options={BILLING_CYCLES}
                        onChange={(newValue) =>
                          setForm((prev) => ({ ...prev, billingCyclesType: newValue }))
                        }
                        placeholder="Select cycle type"
                        disabled={lockDependentFields}
                      />
                    </div>
                    <input
                      name="billingCyclesCount"
                      value={form.billingCyclesCount}
                      onChange={onFieldChange}
                      className={inputClass}
                      disabled={lockDependentFields || form.billingCyclesType !== "Fixed number of cycles"}
                    />
                  </div>
                  <HelpCircle size={16} className="text-gray-400" />
                </div>
              </div>

              <div className={`grid grid-cols-1 items-start gap-4 md:grid-cols-[180px_340px] ${lockDependentFields ? "opacity-45" : ""}`}>
                <label className="pt-2 text-[13px] text-[#111827]">Plan Description</label>
                <textarea
                  name="planDescription"
                  value={form.planDescription}
                  onChange={onFieldChange}
                  rows={3}
                  className="w-full resize-none rounded border border-gray-200 bg-white p-2.5 text-[13px] outline-none focus:border-gray-400 transition-all"
                  disabled={lockDependentFields}
                />
              </div>
            </div>

            <div className={`flex justify-start xl:justify-end ${lockDependentFields ? "opacity-45" : ""}`}>
              <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={onImageChange} disabled={lockDependentFields} />
              <div
                className={`flex h-[230px] w-full max-w-[300px] flex-col items-center justify-center rounded-md border border-dashed border-gray-200 bg-gray-50 text-center ${lockDependentFields ? "cursor-not-allowed" : "cursor-pointer"}`}
                onClick={() => !lockDependentFields && fileInputRef.current?.click()}
              >
                {images.length ? (
                  <img src={images[0]} alt="Plan" className="h-[200px] w-[90%] rounded object-contain" />
                ) : (
                  <>
                    <ImageIcon size={42} className="mb-3 text-[#8a8aa0]" />
                    <p className="text-[14px] text-[#4b5563]">Drag image(s) here or</p>
                    <p className="text-[14px] text-[#2563eb]">Browse images</p>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className={`border-b border-gray-200 bg-gray-50 px-8 ${lockDependentFields ? "opacity-45" : ""}`}>
          <div className="flex items-end gap-5 border-b border-gray-200 pt-2">
            <button
              className={`px-5 py-3 text-[13px] ${activeTab === "pricing" ? "border-t-2 border-[#22b573] bg-white font-medium text-[#111827]" : "text-[#111827]"} ${lockDependentFields ? "cursor-not-allowed" : ""}`}
              onClick={() => !lockDependentFields && setActiveTab("pricing")}
              type="button"
              disabled={lockDependentFields}
            >
              Pricing
            </button>
            <button
              className={`px-5 py-3 text-[13px] ${activeTab === "hosted" ? "border-t-2 border-[#22b573] bg-white font-medium text-[#111827]" : "text-[#111827]"} ${lockDependentFields ? "cursor-not-allowed" : ""}`}
              onClick={() => !lockDependentFields && setActiveTab("hosted")}
              type="button"
              disabled={lockDependentFields}
            >
              Hosted Payment Pages & Portal
            </button>
            <button
              className={`px-5 py-3 text-[13px] ${activeTab === "details" ? "border-t-2 border-[#22b573] bg-white font-medium text-[#111827]" : "text-[#111827]"} ${lockDependentFields ? "cursor-not-allowed" : ""}`}
              onClick={() => !lockDependentFields && setActiveTab("details")}
              type="button"
              disabled={lockDependentFields}
            >
              Other Details
            </button>
          </div>

          {activeTab === "pricing" && (
            <div className="grid grid-cols-1 gap-x-14 gap-y-6 py-8 xl:grid-cols-2">
              <div className="grid grid-cols-1 items-center gap-4 md:grid-cols-[180px_340px]">
                <label className="text-[13px] text-[#ef4444]">Pricing Model*</label>
                <StyledDropdown
                  value={form.pricingModel}
                  options={PRICING_MODELS}
                  onChange={(newValue) =>
                    setForm((prev) => ({
                      ...prev,
                      pricingModel: newValue,
                      unitName: newValue === "Flat" ? "" : prev.unitName,
                    }))
                  }
                  placeholder="Select pricing model"
                  disabled={lockDependentFields}
                />
              </div>

              {isFlatPricing ? (
                <div className="grid grid-cols-1 items-center gap-4 md:grid-cols-[180px_340px] xl:col-start-2 xl:row-start-1">
                  <label className="text-[13px] text-[#ef4444]">Price*</label>
                  <div className="grid grid-cols-[54px_1fr]">
                    <span className="flex h-[36px] items-center justify-center rounded-l border border-r-0 border-gray-200 bg-gray-50 text-[13px]">{currencyCode}</span>
                    <input name="price" value={form.price} onChange={onFieldChange} className={`${inputClass} rounded-l-none`} disabled={lockDependentFields} />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 items-center gap-4 md:grid-cols-[180px_340px_auto]">
                  <label className="text-[13px] text-[#111827]">Unit Name</label>
                  <StyledDropdown
                    value={form.unitName}
                    options={mergedUnitOptions}
                    onChange={(newValue) => setForm((prev) => ({ ...prev, unitName: newValue }))}
                    placeholder="Select unit"
                    disabled={lockDependentFields}
                    footerActionLabel="Manage Units"
                    onFooterActionClick={() => setIsUnitModalOpen(true)}
                    selectedStyle="blue"
                  />
                  <HelpCircle size={16} className="text-gray-400" />
                </div>
              )}

              {!isFlatPricing ? (
                <div className="grid grid-cols-1 items-center gap-4 md:grid-cols-[180px_340px]">
                  <label className="text-[13px] text-[#ef4444]">Price*</label>
                  <div className="grid grid-cols-[54px_1fr_105px]">
                    <span className="flex h-[36px] items-center justify-center rounded-l border border-r-0 border-gray-200 bg-gray-50 text-[13px]">{currencyCode}</span>
                    <input name="price" value={form.price} onChange={onFieldChange} className={`${inputClass} rounded-none`} disabled={lockDependentFields} />
                    <span className="flex h-[36px] items-center justify-center rounded-r border border-l-0 border-gray-200 bg-gray-50 text-[13px]">{`/unit /${pricePeriodLabel}`}</span>
                  </div>
                </div>
              ) : null}

              <div className={`grid grid-cols-1 items-center gap-4 md:grid-cols-[180px_340px] ${isFlatPricing ? "xl:col-start-1 xl:row-start-2" : ""}`}>
                <label className="text-[13px] text-[#111827]">Free Trial</label>
                <div className="grid grid-cols-[1fr_56px]">
                  <input name="freeTrialDays" value={form.freeTrialDays} onChange={onFieldChange} className={`${inputClass} rounded-r-none`} disabled={lockDependentFields} />
                  <span className="flex h-[36px] items-center justify-center rounded-r border border-l-0 border-gray-200 bg-gray-50 text-[13px]">Days</span>
                </div>
              </div>

              <div className={`grid grid-cols-1 items-center gap-4 md:grid-cols-[180px_340px] ${isFlatPricing ? "xl:col-start-2 xl:row-start-2" : ""}`}>
                <label className="text-[13px] text-[#111827]">Setup Fee</label>
                <input name="setupFee" value={form.setupFee} onChange={onFieldChange} className={inputClass} disabled={lockDependentFields} />
              </div>

              <div className={`grid grid-cols-1 items-center gap-4 md:grid-cols-[180px_340px] ${isFlatPricing ? "xl:col-start-1 xl:row-start-3" : ""}`}>
                <label className="text-[13px] text-[#ef4444]">Type*</label>
                <div className="flex items-center gap-5 text-[13px]">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="type"
                      value="Goods"
                      checked={form.type === "Goods"}
                      onChange={onFieldChange}
                      className="h-4 w-4"
                      disabled={lockDependentFields}
                    />
                    Goods
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="type"
                      value="Service"
                      checked={form.type === "Service"}
                      onChange={onFieldChange}
                      className="h-4 w-4"
                      disabled={lockDependentFields}
                    />
                    Service
                  </label>
                </div>
              </div>

              <div className={`grid grid-cols-1 items-start gap-2 md:grid-cols-[180px_340px] ${isFlatPricing ? "xl:col-start-2 xl:row-start-3" : ""}`}>
                <label className="text-[13px] text-[#111827]">Sales Tax</label>
                <div>
                  <StyledDropdown
                    value={form.salesTax}
                    options={mergedTaxOptions}
                    onChange={(newValue) => setForm((prev) => ({ ...prev, salesTax: newValue }))}
                    placeholder="Select a Tax"
                    disabled={lockDependentFields}
                    groupLabel="Compound tax"
                    footerActionLabel="New Tax"
                    onFooterActionClick={() => navigate("/settings/taxes/new")}
                    selectedStyle="blue"
                  />
                  <p className="mt-2 text-[12px] text-[#64748b]">
                    Add tax to your Plan or Addon. Use tax group for more than one tax.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === "hosted" && (
            <div className="py-8">
              <div className="grid grid-cols-1 gap-x-14 gap-y-6">
                <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-[180px_1fr]">
                  <label className="text-[13px] text-[#111827]">Widgets Preference</label>
                  <div>
                    <label className="flex items-center gap-2 text-[13px] text-[#111827] cursor-pointer">
                      <input
                        type="checkbox"
                        name="widgetsPreference"
                        checked={form.widgetsPreference}
                        onChange={(e) => setForm(prev => ({ ...prev, widgetsPreference: e.target.checked }))}
                        className="h-4 w-4 rounded border-[#cfd5e3] text-[#3b82f6] focus:ring-[#3b82f6]"
                        disabled={lockDependentFields}
                      />
                      Display this plan in the pricing and checkout widgets.
                    </label>
                  </div>
                </div>

                {form.widgetsPreference && (
                  <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-[180px_1fr]">
                    <div className="flex items-center gap-1">
                      <label className="text-[13px] text-[#111827]">Plan Features</label>
                      <HelpCircle size={14} className="text-gray-400" />
                    </div>

                    <div className="space-y-3">
                      <div className="rounded-lg border border-[#cfd5e3] bg-white">
                        <div className="grid grid-cols-[auto_1fr_1fr_auto_auto] gap-4 border-b border-[#cfd5e3] px-4 py-3 text-[11px] font-medium tracking-wider text-[#64748b]">
                          <div className="w-[16px]"></div>
                          <div>NAME</div>
                          <div>TOOLTIP</div>
                          <div className="w-[100px] text-center">ADD NEW TAG</div>
                          <div className="w-[32px]"></div>
                        </div>
                        {form.planFeatures.map((feature, idx) => (
                          <div key={idx} className="grid grid-cols-[auto_1fr_1fr_auto_auto] items-center gap-4 border-b border-[#cfd5e3] px-4 py-3 last:border-b-0">
                            <div className="w-[16px] text-[#94a3b8]">
                              <GripVertical size={16} className="cursor-grab" />
                            </div>
                            <div>
                              <input
                                type="text"
                                placeholder="Enter a feature name"
                                value={feature.name}
                                onChange={(e) => {
                                  const next = [...form.planFeatures];
                                  next[idx].name = e.target.value;
                                  setForm(p => ({ ...p, planFeatures: next }));
                                }}
                                className={inputClass}
                                disabled={lockDependentFields}
                              />
                            </div>
                            <div>
                              <input
                                type="text"
                                placeholder="Enter a tooltip"
                                value={feature.tooltip}
                                onChange={(e) => {
                                  const next = [...form.planFeatures];
                                  next[idx].tooltip = e.target.value;
                                  setForm(p => ({ ...p, planFeatures: next }));
                                }}
                                className={inputClass}
                                disabled={lockDependentFields}
                              />
                            </div>
                            <div className="flex w-[100px] justify-center text-[#2563eb]">
                              <input
                                type="checkbox"
                                checked={feature.addNewTag}
                                onChange={(e) => {
                                  const next = [...form.planFeatures];
                                  next[idx].addNewTag = e.target.checked;
                                  setForm(p => ({ ...p, planFeatures: next }));
                                }}
                                className="h-4 w-4 cursor-pointer rounded border-[#cfd5e3] text-[#3b82f6] focus:ring-[#3b82f6]"
                                disabled={lockDependentFields}
                              />
                            </div>
                            <div className="flex w-[32px] justify-center">
                              <button
                                type="button"
                                onClick={() => {
                                  if (form.planFeatures.length > 1) {
                                    const next = form.planFeatures.filter((_, i) => i !== idx);
                                    setForm(p => ({ ...p, planFeatures: next }));
                                  } else {
                                    setForm(p => ({ ...p, planFeatures: [{ name: "", tooltip: "", addNewTag: false }] }));
                                  }
                                }}
                                className="text-[#ef4444] hover:text-[#dc2626]"
                                disabled={lockDependentFields}
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setForm(p => ({ ...p, planFeatures: [...p.planFeatures, { name: "", tooltip: "", addNewTag: false }] }))
                        }}
                        disabled={lockDependentFields}
                        className="flex items-center gap-2 rounded border border-[#cfd5e3] bg-[#f8fafc] px-3 py-1.5 text-[13px] text-[#3b82f6] hover:bg-[#f1f5f9] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <PlusCircle size={14} /> Add Feature
                      </button>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-[180px_1fr]">
                  <label className="text-[13px] text-[#111827]">Plan Change</label>
                  <div>
                    <label className="flex items-center gap-2 text-[13px] text-[#111827] cursor-pointer">
                      <input
                        type="checkbox"
                        name="planChange"
                        checked={form.planChange}
                        onChange={(e) => setForm(prev => ({ ...prev, planChange: e.target.checked }))}
                        className="h-4 w-4 rounded border-[#cfd5e3] text-[#3b82f6] focus:ring-[#3b82f6]"
                        disabled={lockDependentFields}
                      />
                      Allow customers to switch to this plan from the portal <HelpCircle size={14} className="text-gray-400" />
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "details" && (
            <div className="py-8">
              <div className="grid grid-cols-1 gap-x-14 gap-y-6 xl:grid-cols-2">
                <div className="grid grid-cols-1 items-center gap-4 md:grid-cols-[180px_1fr_auto]">
                  <label className="text-[13px] text-[#111827]">Plan Account</label>
                  <StyledDropdown
                    value={form.planAccount}
                    groupedOptions={ACCOUNT_GROUPS}
                    onChange={(newValue) => setForm(prev => ({ ...prev, planAccount: newValue }))}
                    placeholder="Select Account"
                    disabled={lockDependentFields}
                    selectedStyle="blue"
                  />
                  <HelpCircle size={16} className="text-gray-400" />
                </div>

                <div className="grid grid-cols-1 items-center gap-4 md:grid-cols-[180px_1fr_auto]">
                  <label className="text-[13px] text-[#111827]">Setup Fee Account</label>
                  <StyledDropdown
                    value={form.setupFeeAccount}
                    groupedOptions={ACCOUNT_GROUPS}
                    onChange={(newValue) => setForm(prev => ({ ...prev, setupFeeAccount: newValue }))}
                    placeholder="Select Account"
                    disabled={lockDependentFields}
                    selectedStyle="blue"
                  />
                  <HelpCircle size={16} className="text-gray-400" />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-gray-200 bg-white px-8 py-4">
        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || lockDependentFields}
            className="cursor-pointer transition-all text-white px-6 py-2 rounded-lg border-[#0D4A52] border-b-[4px] hover:brightness-110 hover:-translate-y-[1px] hover:border-b-[6px] active:border-b-[2px] active:brightness-90 active:translate-y-[2px] flex items-center gap-2 text-[13px] font-semibold disabled:opacity-60 disabled:pointer-events-none"
            style={{ background: 'linear-gradient(90deg, #156372 0%, #0D4A52 100%)' }}
          >
            {isSaving ? "Saving..." : "Save"}
          </button>
          <button
            type="button"
            onClick={() => (isEditMode && editPlanId ? navigate(`/products/plans/${editPlanId}`) : navigate("/products/plans"))}
            className="rounded-lg border border-gray-200 bg-white px-6 py-2 text-[13px] text-[#111827] hover:bg-slate-50 font-medium transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>

      <NewProductModal
        isOpen={newProductModalOpen}
        onClose={() => setNewProductModalOpen(false)}
        onSaveSuccess={handleNewProductSaved}
      />

      <ManageUnitsModal
        isOpen={isUnitModalOpen}
        onClose={() => setIsUnitModalOpen(false)}
        onUnitsChanged={refreshUnits}
      />
    </div>
  );
}
