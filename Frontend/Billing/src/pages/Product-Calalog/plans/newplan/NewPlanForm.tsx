import React, { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, HelpCircle, Image as ImageIcon, PlusCircle, Search, X, GripVertical, Trash2 } from "lucide-react";
import { toast } from "react-toastify";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useOrganizationBranding } from "../../../../hooks/useOrganizationBranding";
import { useCurrency } from "../../../../hooks/useCurrency";
import { plansAPI, productsAPI, reportingTagsAPI, taxesAPI, unitsAPI } from "../../../../services/api";
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
const TAX_GROUP_MARKER = "__taban_tax_group__";

const normalizeReportingTagOptions = (tag: any): string[] => {
  const raw = Array.isArray(tag?.options) ? tag.options : [];
  return raw
    .map((value: any) => String(value ?? "").trim())
    .filter(Boolean);
};

const getGroupedTaxes = (rows: any[]) => {
  const rateById = new Map<string, number>();

  rows.forEach((tax) => {
    if (!tax) return;
    const id = String(tax._id || tax.id || "");
    if (!id) return;
    const rate = Number(tax.rate ?? tax.taxRate ?? 0);
    rateById.set(id, Number.isFinite(rate) ? rate : 0);
  });

  const taxes: string[] = [];
  const compoundTaxes: string[] = [];
  const taxGroups: string[] = [];

  const computeTaxLabel = (tax: any) => {
    const name = String(tax?.name || tax?.taxName || "").trim();
    const rate = Number(tax?.rate ?? tax?.taxRate ?? 0);
    const groupTaxes = Array.isArray(tax?.groupTaxes) ? tax.groupTaxes.map((x: any) => String(x)) : [];

    const isGroup =
      tax?.isGroup === true ||
      String(tax?.kind || "").toLowerCase() === "group" ||
      String(tax?.type || "").toLowerCase() === "group" ||
      tax?.description === TAX_GROUP_MARKER ||
      groupTaxes.length > 0;

    const computedRate = isGroup
      ? Number(groupTaxes.reduce((sum: number, taxId: string) => sum + (rateById.get(taxId) || 0), 0).toFixed(2))
      : (Number.isFinite(rate) ? rate : 0);

    const taxTypeRaw = String(tax?.taxType || tax?.tax_type || tax?.typeRaw || tax?.type_raw || "").toLowerCase();
    const nameLower = name.toLowerCase();
    const isCompoundFlag = tax?.isCompound ?? tax?.is_compound;
    const isCompound =
      isCompoundFlag === true ||
      String(isCompoundFlag).toLowerCase() === "true" ||
      taxTypeRaw.includes("compound") ||
      nameLower.includes("(compound tax)") ||
      nameLower.includes("compound tax");

    return { name, isGroup, isCompound, computedRate, label: `${name} [${computedRate}%]` };
  };

  rows.forEach((tax) => {
    if (!tax) return;
    if (tax.isActive === false) return;

    const id = String(tax._id || tax.id || "");
    if (!id) return;

    const { name, isGroup, isCompound, label } = computeTaxLabel(tax);
    if (!name) return;

    if (isGroup) taxGroups.push(label);
    else if (isCompound) compoundTaxes.push(label);
    else taxes.push(label);
  });

  return [
    { label: "Tax", options: Array.from(new Set(taxes)) },
    { label: "Compound tax", options: Array.from(new Set(compoundTaxes)) },
    { label: "Tax Group", options: Array.from(new Set(taxGroups)) },
  ].filter((g) => g.options.length > 0);
};

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
  accentColor?: string;
}

type TaxSearchableDropdownProps = {
  value: string;
  options?: Array<string | DropdownOption>;
  groupedOptions?: Array<{ label: string; options: Array<string | DropdownOption> }>;
  onChange: (value: string) => void;
  placeholder: string;
  accentColor: string;
  addNewLabel?: string;
  onAddNew?: () => void;
  disabled?: boolean;
};

function TaxSearchableDropdown({
  value,
  options = [],
  groupedOptions,
  onChange,
  placeholder,
  accentColor,
  addNewLabel,
  onAddNew,
  disabled = false,
}: TaxSearchableDropdownProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const wrapperRef = useRef<HTMLDivElement>(null);

  const normalizeOptions = (opts: Array<string | DropdownOption>): DropdownOption[] =>
    opts.map((opt) => (typeof opt === "string" ? { value: opt, label: opt } : opt));

  const normalizedOptions = normalizeOptions(options);
  const selected = (groupedOptions
    ? groupedOptions.flatMap((g) => normalizeOptions(g.options))
    : normalizedOptions
  ).find((opt) => opt.value === value);

  const filterOptions = (opts: DropdownOption[]) =>
    opts.filter((opt) => opt.label.toLowerCase().includes(searchTerm.toLowerCase()));

  const displayedGroups =
    groupedOptions?.map((group) => ({
      label: group.label,
      options: filterOptions(normalizeOptions(group.options)),
    })).filter((group) => group.options.length > 0) || [];

  const displayedOptions = filterOptions(normalizedOptions);

  useEffect(() => {
    const handleOutside = (event: MouseEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  const renderOptionItem = (opt: DropdownOption, isIndented = false) => {
    const isSelected = value === opt.value;
    return (
      <button
        key={opt.value}
        type="button"
        onClick={() => {
          onChange(opt.value);
          setOpen(false);
          setSearchTerm("");
        }}
        className={`flex w-full items-center justify-between rounded-lg py-2 text-[13px] transition-colors ${isIndented ? "pl-8 pr-4" : "px-4"} ${isSelected ? "font-medium text-white" : "text-slate-700 hover:bg-slate-50"}`}
        style={isSelected ? { backgroundColor: accentColor } : undefined}
      >
        <span>{opt.label}</span>
        {isSelected ? <Check size={14} className="text-white" /> : null}
      </button>
    );
  };

  return (
    <div ref={wrapperRef} className={`relative ${open ? "z-[9999]" : ""}`}>
      <button
        type="button"
        onClick={() => {
          if (disabled) return;
          setOpen((prev) => !prev);
        }}
        disabled={disabled}
        className={`h-[34px] w-full rounded border px-3 text-left text-[13px] transition-colors ${
          disabled ? "cursor-not-allowed border-gray-200 bg-gray-50 text-gray-400" : "border-gray-300 hover:border-gray-400"
        }`}
        style={open && !disabled ? { borderColor: accentColor } : {}}
      >
        <div className="flex items-center justify-between gap-2">
          <span className={selected ? "text-[#1f2937]" : "text-[#6b7280]"}>{selected?.label || placeholder}</span>
          <ChevronDown size={14} className={`transition-transform ${open ? "rotate-180" : ""}`} style={{ color: accentColor }} />
        </div>
      </button>

      {open && !disabled && (
        <div className="absolute left-0 bottom-full z-[9999] mb-1 w-full rounded-xl border border-[#d6dbe8] bg-white p-1 shadow-2xl animate-in fade-in zoom-in-95 duration-100">
          <div className="p-2">
            <div className="flex items-center gap-2 rounded-lg border bg-slate-50/50 px-3 py-1.5 transition-all focus-within:bg-white" style={{ borderColor: accentColor }}>
              <Search size={14} className="text-slate-400" />
              <input
                autoFocus
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search..."
                className="w-full border-none bg-transparent text-[13px] text-slate-700 outline-none placeholder:text-slate-400"
              />
            </div>
          </div>

          <div className="max-h-56 overflow-y-auto py-1">
            {groupedOptions ? (
              displayedGroups.length === 0 ? (
                <div className="px-4 py-2 text-[13px] text-slate-400">No results found</div>
              ) : (
                displayedGroups.map((group) => (
                  <div key={group.label} className="pb-1">
                    <div className="px-4 pt-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                      {group.label}
                    </div>
                    <div className="mt-1 space-y-1">
                      {group.options.map((opt) => renderOptionItem(opt, true))}
                    </div>
                  </div>
                ))
              )
            ) : displayedOptions.length === 0 ? (
              <div className="px-4 py-2 text-[13px] text-slate-400">No results found</div>
            ) : (
              <div className="space-y-1">{displayedOptions.map((opt) => renderOptionItem(opt))}</div>
            )}
          </div>

          {onAddNew && addNewLabel ? (
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setSearchTerm("");
                onAddNew();
              }}
              className="flex w-full items-center gap-2 border-t border-slate-100 px-4 py-2 text-[13px] text-slate-600 hover:text-[#1d4ed8]"
            >
              <PlusCircle size={14} />
              {addNewLabel}
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
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
  accentColor = "#3b82f6",
}: StyledDropdownProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [direction, setDirection] = useState<"down" | "up">("down");
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

  const isBlueStyle = selectedStyle === "blue";
  const highlightColor = isBlueStyle ? accentColor : "#3b82f6";

  useEffect(() => {
    const handleOutside = (event: MouseEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  const computeDirection = () => {
    const el = wrapperRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
    const spaceBelow = viewportHeight - rect.bottom;
    const spaceAbove = rect.top;
    // dropdown panel is roughly ~280px tall (search + list + footer)
    const estimated = 280;
    if (spaceBelow < estimated && spaceAbove > spaceBelow) {
      setDirection("up");
    } else {
      setDirection("down");
    }
  };

  return (
    <div ref={wrapperRef} className={`relative ${open ? "z-[1200]" : ""}`}>
      <button
        type="button"
        onClick={() => {
          if (disabled) return;
          setOpen((prev) => {
            const next = !prev;
            if (next) computeDirection();
            return next;
          });
        }}
        disabled={disabled}
        className={`h-[36px] w-full rounded border px-3 text-left text-[13px] transition-colors ${disabled
          ? "cursor-not-allowed border-gray-200 bg-gray-50 text-gray-400"
          : open
            ? "border-gray-300 bg-white text-[#1f2937]"
            : "border-gray-200 bg-white text-[#1f2937] hover:border-gray-300"
          }`}
        style={open && !disabled && isBlueStyle ? { borderColor: highlightColor, boxShadow: `0 0 0 1px ${highlightColor}` } : undefined}
      >
        <div className="flex items-center justify-between gap-2">
          <span className={selected ? "text-[#1f2937]" : "text-[#6b7280]"}>{selected?.label || placeholder}</span>
          <ChevronDown
            size={14}
            className={`transition-transform ${open ? "rotate-180" : ""}`}
            style={{ color: open && isBlueStyle ? highlightColor : "#64748b" }}
          />
        </div>
      </button>

      {open && !disabled && (
        <div
          className={`absolute left-0 z-[180] w-full rounded-xl border border-gray-200 bg-white p-2 shadow-xl animate-in fade-in zoom-in-95 duration-200 ${
            direction === "up"
              ? "bottom-full mb-1 origin-bottom"
              : "top-full mt-1 origin-top"
          }`}
        >
          {searchable && (
            <div
              className="mb-2 flex items-center gap-2 rounded-lg border bg-gray-50 px-3 py-2 transition-colors focus-within:bg-white focus-within:border-gray-300"
              style={isBlueStyle ? { borderColor: highlightColor } : undefined}
            >
              <Search size={14} className="text-gray-400" />
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search"
                className="w-full border-none bg-transparent text-[13px] text-gray-700 outline-none placeholder:text-gray-400"
                autoFocus
              />
            </div>
          )}

          {groupLabel ? (
            <div className="px-4 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">{groupLabel}</div>
          ) : null}

          <div className="max-h-64 overflow-y-auto custom-scrollbar py-1">
            {normalizedGroups.length > 0 ? (
              filteredGroups.length === 0 ? (
                <div className="px-3 py-2 text-[13px] text-gray-400">No options found</div>
              ) : (
                filteredGroups.map((group) => (
                  <div key={group.label} className="mb-1 last:mb-0">
                    <div className="px-4 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">{group.label}</div>
                    {group.options.map((opt) => {
                      const isSelected = value === opt.value;
                      const isIndented = true;
                      const selectedBlue = isSelected && selectedStyle === "blue";
                      return (
                        <button
                          type="button"
                          key={`${group.label}-${opt.value}`}
                          onClick={() => {
                            onChange(opt.value);
                            setOpen(false);
                            setSearchTerm("");
                          }}
                          className={`mb-1 flex w-full items-center justify-between rounded-lg py-2 text-[13px] transition-colors last:mb-0 ${isIndented ? "pl-8 pr-4" : "px-4"} ${selectedBlue
                            ? "font-medium text-white"
                            : isSelected
                              ? "bg-slate-50 text-slate-900 font-medium"
                              : "text-slate-700 hover:bg-slate-50"
                            }`}
                          style={selectedBlue ? { backgroundColor: highlightColor } : undefined}
                        >
                          <span>{opt.label}</span>
                          {isSelected ? (
                            <Check size={14} className={selectedBlue ? "text-white" : "text-gray-500"} />
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
                const selectedBlue = isSelected && selectedStyle === "blue";
                return (
                  <button
                    type="button"
                    key={opt.value}
                    onClick={() => {
                      onChange(opt.value);
                      setOpen(false);
                      setSearchTerm("");
                    }}
                    className={`mb-1 flex w-full items-center justify-between rounded-lg px-3 py-2 text-[13px] transition-colors last:mb-0 ${selectedBlue
                      ? "font-medium text-white"
                      : isSelected
                        ? "bg-slate-50 text-slate-900 font-medium"
                        : "text-slate-700 hover:bg-slate-50"
                      }`}
                    style={selectedBlue ? { backgroundColor: highlightColor } : undefined}
                  >
                    <span>{opt.label}</span>
                    {isSelected ? (
                      <Check size={14} className={selectedBlue ? "text-white" : "text-gray-500"} />
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
  const [productNameToId, setProductNameToId] = useState<Record<string, string>>({});
  const [newProductModalOpen, setNewProductModalOpen] = useState(false);
  const [isUnitModalOpen, setIsUnitModalOpen] = useState(false);
  const [unitOptions, setUnitOptions] = useState<string[]>([]);
  const [taxRows, setTaxRows] = useState<any[]>([]);
  const groupedTaxOptions = React.useMemo(() => getGroupedTaxes(taxRows), [taxRows]);
  const [images, setImages] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<"pricing" | "hosted" | "details">("pricing");
  const [isSaving, setIsSaving] = useState(false);
  const [availableReportingTags, setAvailableReportingTags] = useState<any[]>([]);
  const [reportingTagValues, setReportingTagValues] = useState<Record<string, string>>({});
  const planReportingTags = React.useMemo(() => {
    // Show all active reporting tags here (same behavior user expects from Settings),
    // regardless of appliesTo config.
    return availableReportingTags.filter((tag: any) => tag?.isActive !== false);
  }, [availableReportingTags]);
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
  const pricePeriodLabel = toPricePeriodLabel(form.billingFrequencyPeriod);
  const isFlatPricing = form.pricingModel === "Flat";
  const currencyCode = String(baseCurrency?.code || "USD").split(" - ")[0].trim().toUpperCase() || "USD";
  // Use code (e.g. ARS) to clearly indicate the base currency (symbol like "$" can be ambiguous).
  const currencyPrefix = currencyCode;

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

  const loadActiveProducts = async (): Promise<string[]> => {
    try {
      const res: any = await productsAPI.getAll({ limit: 1000 });
      const rows = Array.isArray(res?.data) ? res.data : [];
      const map: Record<string, string> = {};
      const names = rows
        .filter((p: any) => String(p?.status || "Active").toLowerCase() === "active")
        .map((p: any): string => {
          const name = String(p?.name || "").trim();
          const id = String(p?.id || p?._id || "").trim();
          if (name && id) map[name.toLowerCase()] = id;
          return name;
        })
        .filter((v: string) => v.length > 0);
      const unique = Array.from(new Set<string>(names));
      setProductNameToId(map);
      setProducts(unique);
      return unique;
    } catch {
      setProductNameToId({});
      setProducts([]);
      return [];
    }
  };

  useEffect(() => {
    void loadActiveProducts();
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

      let settingsRows: any[] = [];
      try {
        const local = localStorage.getItem("taban_settings_taxes_v1");
        const parsed = local ? JSON.parse(local) : [];
        settingsRows = Array.isArray(parsed) ? parsed : [];
      } catch {
        settingsRows = [];
      }

      // Merge API/local tax lists (tax groups often live under settings storage).
      const merged: any[] = [];
      const seen = new Set<string>();
      [...apiRows, ...settingsRows].forEach((row: any) => {
        if (!row) return;
        const id = String(row?._id || row?.id || "").trim();
        const name = String(row?.name || row?.taxName || "").trim().toLowerCase();
        const key = id ? `id:${id}` : name ? `name:${name}` : "";
        if (!key || seen.has(key)) return;
        seen.add(key);
        merged.push(row);
      });

      setTaxRows(merged);
    } catch (error) {
      console.warn("Failed to fetch taxes", error);
      setTaxRows([]);
    }
  };

  useEffect(() => {
    refreshUnits();
    refreshTaxes();
  }, []);

  useEffect(() => {
    const handleTaxesUpdated = () => {
      void refreshTaxes();
    };
    window.addEventListener("taban:taxes-storage-updated", handleTaxesUpdated);
    return () => window.removeEventListener("taban:taxes-storage-updated", handleTaxesUpdated);
  }, []);

  useEffect(() => {
    let mounted = true;
    const loadTags = async () => {
      try {
        const res: any = await reportingTagsAPI.getAll({ limit: 1000 });
        const rows = Array.isArray(res?.data) ? res.data : [];
        if (mounted) setAvailableReportingTags(rows);
      } catch {
        if (mounted) setAvailableReportingTags([]);
      }
    };
    void loadTags();
    return () => { mounted = false; };
  }, []);

  const handleNewProductSaved = () => {
    void (async () => {
      const names = await loadActiveProducts();
      if (names.length > 0) {
        setForm((prev) => ({ ...prev, product: prev.product || names[0] }));
      }
    })();
  };

  useEffect(() => {
    if (!productPrefill || editPlanId || clonePlanId) return;
    setForm((prev) => ({ ...prev, product: prev.product || productPrefill }));
  }, [productPrefill, editPlanId, clonePlanId]);

  useEffect(() => {
    const sourceId = editPlanId || clonePlanId;
    if (!sourceId) return;
    void (async () => {
      try {
        const res: any = await plansAPI.getById(sourceId);
        const source = res?.data;
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
        setReportingTagValues(source?.reportingTagValues && typeof source.reportingTagValues === "object" ? source.reportingTagValues : {});
      } catch (error) {
        console.error("Failed to prefill plan form", error);
      }
    })();
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
    const productId = productNameToId[String(form.product || "").trim().toLowerCase()];
    if (!productId) {
      toast.error("Invalid product. Please select a product from the list.");
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
      const payload: any = {
        ...form,
        productId,
        price: Number(form.price),
        setupFee: Number(form.setupFee || 0),
        freeTrialDays: Number(form.freeTrialDays || 0),
        image: images[0] || "",
        reportingTagValues,
      };

      if (isEditMode && editPlanId) {
        const res: any = await plansAPI.update(editPlanId, payload);
        if (res?.success === false) throw new Error(res?.message || "Failed to update plan");
        toast.success("Plan updated successfully");
        const id = String(res?.data?.id || res?.data?._id || editPlanId);
        navigate(`/products/plans/${id}`);
        return;
      }

      const res: any = await plansAPI.create({ ...payload, status: "Active" });
      if (res?.success === false) throw new Error(res?.message || "Failed to save plan");
      toast.success(clonePlanId ? "Plan cloned successfully" : "Plan saved successfully");
      const id = String(res?.data?.id || res?.data?._id || "");
      if (id) navigate(`/products/plans/${id}`);
      else navigate("/products/plans");
    } catch (error) {
      console.error("Failed to save plan:", error);
      toast.error((error as any)?.message || "Failed to save plan");
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
                    <span className="flex h-[36px] items-center justify-center rounded-l border border-r-0 border-gray-200 bg-gray-50 text-[13px]">{currencyPrefix}</span>
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
                    <span className="flex h-[36px] items-center justify-center rounded-l border border-r-0 border-gray-200 bg-gray-50 text-[13px]">{currencyPrefix}</span>
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
                  <TaxSearchableDropdown
                    value={form.salesTax}
                    groupedOptions={groupedTaxOptions}
                    onChange={(newValue) => setForm((prev) => ({ ...prev, salesTax: newValue }))}
                    placeholder="Select a Tax"
                    accentColor={accentColor}
                    addNewLabel="New Tax"
                    onAddNew={() => navigate("/settings/taxes/new")}
                    disabled={lockDependentFields}
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

              <div className="mt-10 border-t border-gray-200 pt-8">
                <h2 className="mb-5 text-[15px] font-medium text-gray-800">Reporting Tags</h2>
                {planReportingTags.length === 0 ? (
                  <div className="text-[13px] text-gray-500">No reporting tags found for Plans.</div>
                ) : (
                  <div className="space-y-4">
                    {planReportingTags.map((tag: any) => {
                      const id = String(tag?._id || "");
                      const name = String(tag?.name || "Reporting Tag").trim() || "Reporting Tag";
                      const options = normalizeReportingTagOptions(tag);
                      const value = reportingTagValues[id] || "";
                      const required = Boolean(tag?.isMandatory);
                      return (
                        <div key={id || name} className="grid grid-cols-1 items-center gap-4 md:grid-cols-[180px_340px]">
                          <label className={`text-[13px] ${required ? "text-[#ef4444]" : "text-[#111827]"}`}>
                            {name}{required ? " *" : ""}
                          </label>
                          <StyledDropdown
                            value={value}
                            options={[{ value: "", label: "None" }, ...options.map((opt) => ({ value: opt, label: opt }))]}
                            onChange={(nextValue) => setReportingTagValues((prev) => ({ ...prev, [id]: nextValue }))}
                            placeholder="None"
                            disabled={lockDependentFields}
                            selectedStyle="blue"
                          />
                        </div>
                      );
                    })}
                  </div>
                )}
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
