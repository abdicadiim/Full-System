import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Image as ImageIcon, Info, MinusCircle, PlusCircle, Search, Trash2, X } from "lucide-react";
import { toast } from "react-toastify";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useCurrency } from "../../../../hooks/useCurrency";
import { usePermissions } from "../../../../hooks/usePermissions";
import AccessDenied from "../../../../components/AccessDenied";
import NewProductModal from "../../plans/newProduct/NewProductModal";
import type { AddonRecord } from "../types";
import { addonsAPI, plansAPI, productsAPI, taxesAPI } from "../../../../services/api";

type FormState = {
  product: string;
  addonName: string;
  addonCode: string;
  description: string;
  addonType: "One-time" | "Recurring";
  billingFrequency: string;
  pricingModel: "Per Unit" | "Volume" | "Tier" | "Package" | "Flat";
  price: string;
  unit: string;
  taxName: string;
  type: "Goods" | "Service";
  account: string;
  associatedPlans: "All Plans" | "Selected Plans";
  selectedPlans: string[];
  includeInWidget: boolean;
  showInPortal: boolean;
  isDigitalService: boolean;
};

type DropdownProps = {
  value: string;
  options?: string[];
  groupedOptions?: Array<{ label: string; options: string[] }>;
  onChange: (value: string) => void;
  placeholder: string;
  disabled?: boolean;
  footerLabel?: string;
  onFooterClick?: () => void;
  groupLabel?: string;
  selectedStyle?: "default" | "blue";
  openUpward?: boolean;
  inlineMenu?: boolean;
  menuClassName?: string;
  portalMenu?: boolean;
};

type VolumeBracket = {
  startingQty: string;
  endingQty: string;
  price: string;
};

const BILLING_INTERVALS = ["Week(s)", "Month(s)", "Year(s)", "Day(s)"];
const PRICING_MODELS: Array<FormState["pricingModel"]> = ["Per Unit", "Volume", "Tier", "Package"];
const UNIT_OPTIONS = ["box", "cm", "dz", "ft", "g", "in", "kg", "km", "lb", "mg", "ml", "m", "pcs", "SAV"];
const ACCOUNT_GROUPS = [
  {
    label: "Income",
    options: ["Discount", "General Income", "Interest Income", "Late Fee Income", "Other Charges", "Sales", "Shipping Charge"],
  },
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
const DEFAULT_VOLUME_BRACKETS: VolumeBracket[] = [{ startingQty: "1", endingQty: "2", price: "" }];

const DEFAULT_FORM: FormState = {
  product: "",
  addonName: "",
  addonCode: "",
  description: "",
  addonType: "Recurring",
  billingFrequency: "Month(s)",
  pricingModel: "Per Unit",
  price: "",
  unit: "",
  taxName: "",
  type: "Service",
  account: "Sales",
  associatedPlans: "All Plans",
  selectedPlans: [],
  includeInWidget: false,
  showInPortal: false,
  isDigitalService: false,
};

const dedupe = (rows: string[]) => Array.from(new Set(rows.map((v) => String(v || "").trim()).filter(Boolean)));
const normBilling = (v: string) => (v.toLowerCase().includes("day") ? "Day(s)" : v.toLowerCase().includes("week") ? "Week(s)" : v.toLowerCase().includes("year") ? "Year(s)" : "Month(s)");
const normModel = (v: string): FormState["pricingModel"] => {
  const value = String(v || "").toLowerCase();
  if (value.includes("volume")) return "Volume";
  if (value.includes("tier")) return "Tier";
  if (value.includes("package")) return "Package";
  if (value.includes("flat")) return "Flat";
  return "Per Unit";
};
const periodLabel = (v: string) => (v.toLowerCase().includes("day") ? "day" : v.toLowerCase().includes("week") ? "week" : v.toLowerCase().includes("year") ? "year" : "month");

type PlanRow = {
  id: string;
  name: string;
  product: string;
  productId?: string;
  status?: string;
};

const toForm = (row: AddonRecord): FormState => ({
  ...(() => {
    const selectedPlans = Array.isArray((row as any).selectedPlans)
      ? (row as any).selectedPlans.map((name: any) => String(name || "").trim()).filter(Boolean)
      : [];
    const associatedPlans: FormState["associatedPlans"] =
      selectedPlans.length > 0 || String((row as any).associatedPlans || "").toLowerCase() === "selected plans"
        ? "Selected Plans"
        : "All Plans";
    return { selectedPlans, associatedPlans };
  })(),
  product: row.product || "",
  addonName: row.addonName || "",
  addonCode: row.addonCode || "",
  description: row.description || "",
  addonType: String(row.addonType || "").toLowerCase() === "one-time" ? "One-time" : "Recurring",
  billingFrequency: normBilling(row.billingFrequency || "Month(s)"),
  pricingModel: normModel(row.pricingModel),
  price: Number.isFinite(Number(row.price)) ? String(row.price) : "",
  unit: row.unit || "",
  taxName: row.taxName || "",
  type: String((row as any).type || "Service").toLowerCase() === "goods" ? "Goods" : "Service",
  account: String((row as any).account || "Sales"),
  includeInWidget: Boolean((row as any).includeInWidget),
  showInPortal: Boolean((row as any).showInPortal),
  isDigitalService: Boolean((row as any).isDigitalService),
});

function StyledDropdown({
  value,
  options = [],
  groupedOptions,
  onChange,
  placeholder,
  disabled,
  footerLabel,
  onFooterClick,
  groupLabel,
  selectedStyle = "blue",
  openUpward = false,
  inlineMenu = false,
  menuClassName = "mt-1",
  portalMenu = false,
}: DropdownProps) {
  const accentColor = "#1b5e6a";
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [portalStyle, setPortalStyle] = useState<React.CSSProperties | null>(null);
  const normalizedGroups = useMemo(
    () => (groupedOptions || []).map((group) => ({ label: group.label, options: group.options || [] })),
    [groupedOptions]
  );
  const sourceOptions = useMemo(
    () => (normalizedGroups.length > 0 ? normalizedGroups.flatMap((group) => group.options) : options),
    [normalizedGroups, options]
  );
  const filtered = useMemo(() => sourceOptions.filter((o) => o.toLowerCase().includes(query.toLowerCase())), [sourceOptions, query]);
  const filteredGroups = useMemo(
    () =>
      normalizedGroups
        .map((group) => ({
          ...group,
          options: group.options.filter((opt) => opt.toLowerCase().includes(query.toLowerCase())),
        }))
        .filter((group) => group.options.length > 0),
    [normalizedGroups, query]
  );

  useEffect(() => {
    const close = (event: MouseEvent) => {
      const target = event.target as Node;
      if (ref.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  useLayoutEffect(() => {
    if (!open || (!openUpward && !portalMenu) || disabled) {
      setPortalStyle(null);
      return;
    }
    const button = ref.current?.querySelector("button");
    if (!button) return;
    const rect = button.getBoundingClientRect();
    setPortalStyle({
      position: "fixed",
      left: rect.left,
      width: rect.width,
      top: openUpward ? undefined : rect.bottom + 6,
      bottom: openUpward ? window.innerHeight - rect.top + 6 : undefined,
      zIndex: 120,
    });
  }, [open, openUpward, portalMenu, disabled, query]);

  return (
    <div ref={ref} className={`relative w-full ${open && !disabled ? "z-[200]" : ""}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((p) => !p)}
        className={`flex h-[34px] w-full items-center justify-between rounded border px-3 text-left text-[13px] transition-colors hover:border-gray-400 ${disabled ? "cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400" : "border-gray-300 bg-white text-gray-800"}`}
        style={open && !disabled ? { borderColor: accentColor, boxShadow: `0 0 0 1px ${accentColor}` } : {}}
      >
        <span className={value ? "text-gray-800" : "text-gray-500"}>{value || placeholder}</span>
        <ChevronDown size={14} className={`transition-transform ${open ? "rotate-180" : ""}`} style={{ color: accentColor }} />
      </button>
      {open && !disabled ? (
        inlineMenu ? (
          <div className="mt-1 w-full rounded-xl border border-[#d6dbe8] bg-white p-2 shadow-xl">
            <div className="mb-2 flex items-center gap-2 rounded-lg border bg-slate-50/50 px-3 py-1.5 transition-all focus-within:bg-white" style={{ borderColor: accentColor }}>
              <Search size={14} className="text-slate-400" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search" className="w-full border-none bg-transparent text-[13px] text-slate-700 outline-none placeholder:text-slate-400" />
            </div>
            {groupLabel ? <div className="px-2 pb-1 text-[13px] font-semibold text-[#475569]">{groupLabel}</div> : null}
            <div className="max-h-52 overflow-auto rounded-lg bg-white">
              {normalizedGroups.length > 0 ? (
                filteredGroups.length === 0 ? (
                  <div className="px-3 py-2 text-[13px] text-[#94a3b8]">No options found</div>
                ) : (
                  filteredGroups.map((group) => (
                    <div key={group.label} className="mb-1 last:mb-0">
                      <div className="px-2 pb-1 text-[13px] font-semibold text-[#475569]">{group.label}</div>
                      {group.options.map((opt) => (
                        <button
                          key={`${group.label}-${opt}`}
                          type="button"
                          onClick={() => {
                            onChange(opt);
                            setOpen(false);
                            setQuery("");
                          }}
                          className={`mb-1 flex w-full items-center justify-between rounded-lg px-3 py-2 text-[13px] transition-colors last:mb-0 hover:bg-slate-50 ${value === opt ? "font-medium text-slate-900" : "text-slate-700"}`}
                        >
                          <span>{opt}</span>
                          {value === opt ? <Check size={14} style={{ color: accentColor }} /> : null}
                        </button>
                      ))}
                    </div>
                  ))
                )
              ) : filtered.length === 0 ? (
                <div className="px-3 py-2 text-[13px] text-[#94a3b8]">No options found</div>
              ) : (
                filtered.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => {
                      onChange(opt);
                      setOpen(false);
                      setQuery("");
                    }}
                    className={`mb-1 flex w-full items-center justify-between rounded-lg px-3 py-2 text-[13px] transition-colors last:mb-0 hover:bg-slate-50 ${value === opt ? "font-medium text-slate-900" : "text-slate-700"}`}
                  >
                    <span>{opt}</span>
                    {value === opt ? <Check size={14} style={{ color: accentColor }} /> : null}
                  </button>
                ))
              )}
            </div>
            {footerLabel && onFooterClick ? <button type="button" onClick={() => { setOpen(false); setQuery(""); onFooterClick(); }} className="mt-2 flex w-full items-center gap-2 border-t border-slate-100 px-2 pt-2 text-[13px] font-medium transition-colors hover:opacity-90" style={{ color: accentColor }}><PlusCircle size={14} />{footerLabel}</button> : null}
          </div>
        ) : openUpward || portalMenu ? (
          createPortal(
            <div
              ref={menuRef}
              className="rounded-xl border border-[#d6dbe8] bg-white p-2 shadow-xl"
              style={portalStyle || undefined}
            >
              <div className="mb-2 flex items-center gap-2 rounded-lg border bg-slate-50/50 px-3 py-1.5 transition-all focus-within:bg-white" style={{ borderColor: accentColor }}>
                <Search size={14} className="text-slate-400" />
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search" className="w-full border-none bg-transparent text-[13px] text-slate-700 outline-none placeholder:text-slate-400" />
              </div>
              {groupLabel ? <div className="px-2 pb-1 text-[13px] font-semibold text-[#475569]">{groupLabel}</div> : null}
              <div className="max-h-52 overflow-auto rounded-lg bg-white">
                {normalizedGroups.length > 0 ? (
                  filteredGroups.length === 0 ? (
                    <div className="px-3 py-2 text-[13px] text-[#94a3b8]">No options found</div>
                  ) : (
                    filteredGroups.map((group) => (
                      <div key={group.label} className="mb-1 last:mb-0">
                        <div className="px-2 pb-1 text-[13px] font-semibold text-[#475569]">{group.label}</div>
                        {group.options.map((opt) => (
                          <button
                            key={`${group.label}-${opt}`}
                            type="button"
                            onClick={() => {
                              onChange(opt);
                              setOpen(false);
                              setQuery("");
                            }}
                            className={`mb-1 flex w-full items-center justify-between rounded-lg px-3 py-2 text-[13px] transition-colors last:mb-0 hover:bg-slate-50 ${value === opt ? "font-medium text-slate-900" : "text-slate-700"}`}
                          >
                            <span>{opt}</span>
                            {value === opt ? <Check size={14} style={{ color: accentColor }} /> : null}
                          </button>
                        ))}
                      </div>
                    ))
                  )
                ) : filtered.length === 0 ? (
                  <div className="px-3 py-2 text-[13px] text-[#94a3b8]">No options found</div>
                ) : (
                  filtered.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => {
                        onChange(opt);
                        setOpen(false);
                        setQuery("");
                      }}
                      className={`mb-1 flex w-full items-center justify-between rounded-lg px-3 py-2 text-[13px] transition-colors last:mb-0 hover:bg-slate-50 ${value === opt ? "font-medium text-slate-900" : "text-slate-700"}`}
                    >
                      <span>{opt}</span>
                      {value === opt ? <Check size={14} style={{ color: accentColor }} /> : null}
                    </button>
                  ))
                )}
              </div>
              {footerLabel && onFooterClick ? <button type="button" onClick={() => { setOpen(false); setQuery(""); onFooterClick(); }} className="mt-2 flex w-full items-center gap-2 border-t border-slate-100 px-2 pt-2 text-[13px] font-medium transition-colors hover:opacity-90" style={{ color: accentColor }}><PlusCircle size={14} />{footerLabel}</button> : null}
            </div>,
            document.body
          )
        ) : (
          <div className={`absolute left-0 top-full z-[120] ${menuClassName} w-full rounded-xl border border-[#d6dbe8] bg-white p-2 shadow-xl`}>
            <div className="mb-2 flex items-center gap-2 rounded-lg border bg-slate-50/50 px-3 py-1.5 transition-all focus-within:bg-white" style={{ borderColor: accentColor }}>
              <Search size={14} className="text-slate-400" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search" className="w-full border-none bg-transparent text-[13px] text-slate-700 outline-none placeholder:text-slate-400" />
            </div>
            {groupLabel ? <div className="px-2 pb-1 text-[13px] font-semibold text-[#475569]">{groupLabel}</div> : null}
            <div className="max-h-52 overflow-auto rounded-lg bg-white">
              {normalizedGroups.length > 0 ? (
                filteredGroups.length === 0 ? (
                  <div className="px-3 py-2 text-[13px] text-[#94a3b8]">No options found</div>
                ) : (
                  filteredGroups.map((group) => (
                    <div key={group.label} className="mb-1 last:mb-0">
                      <div className="px-2 pb-1 text-[13px] font-semibold text-[#475569]">{group.label}</div>
                      {group.options.map((opt) => (
                        <button
                          key={`${group.label}-${opt}`}
                          type="button"
                          onClick={() => {
                            onChange(opt);
                            setOpen(false);
                            setQuery("");
                          }}
                          className={`mb-1 flex w-full items-center justify-between rounded-lg px-3 py-2 text-[13px] transition-colors last:mb-0 hover:bg-slate-50 ${value === opt ? "font-medium text-slate-900" : "text-slate-700"}`}
                        >
                          <span>{opt}</span>
                          {value === opt ? <Check size={14} style={{ color: accentColor }} /> : null}
                        </button>
                      ))}
                    </div>
                  ))
                )
              ) : filtered.length === 0 ? (
                <div className="px-3 py-2 text-[13px] text-[#94a3b8]">No options found</div>
              ) : (
                filtered.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => {
                      onChange(opt);
                      setOpen(false);
                      setQuery("");
                    }}
                    className={`mb-1 flex w-full items-center justify-between rounded-lg px-3 py-2 text-[13px] transition-colors last:mb-0 hover:bg-slate-50 ${value === opt ? "font-medium text-slate-900" : "text-slate-700"}`}
                  >
                    <span>{opt}</span>
                    {value === opt ? <Check size={14} style={{ color: accentColor }} /> : null}
                  </button>
                ))
              )}
            </div>
            {footerLabel && onFooterClick ? <button type="button" onClick={() => { setOpen(false); setQuery(""); onFooterClick(); }} className="mt-2 flex w-full items-center gap-2 border-t border-slate-100 px-2 pt-2 text-[13px] font-medium transition-colors hover:opacity-90" style={{ color: accentColor }}><PlusCircle size={14} />{footerLabel}</button> : null}
          </div>
        )
      ) : null}
    </div>
  );
}

function MultiSelectPlansDropdown({
  values,
  options,
  onChange,
  placeholder,
  disabled,
}: {
  values: string[];
  options: string[];
  onChange: (values: string[]) => void;
  placeholder: string;
  disabled?: boolean;
}) {
  const accentColor = "#1b5e6a";
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  const filtered = useMemo(
    () =>
      options.filter(
        (option) =>
          option.toLowerCase().includes(query.toLowerCase()) &&
          !values.includes(option)
      ),
    [options, query, values]
  );

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const addValue = (value: string) => {
    if (values.includes(value)) return;
    onChange([...values, value]);
  };

  const removeValue = (value: string) => {
    onChange(values.filter((item) => item !== value));
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((prev) => !prev)}
        className={`flex min-h-[34px] w-full items-center justify-between rounded border px-2 text-left text-[13px] transition-colors hover:border-gray-400 ${
          disabled ? "cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400" : "border-gray-300 bg-white text-gray-800"
        }`}
        style={open && !disabled ? { borderColor: accentColor, boxShadow: `0 0 0 1px ${accentColor}` } : {}}
      >
        <div className="flex flex-1 flex-wrap items-center gap-1 py-1">
          {values.length === 0 ? (
            <span className="px-1 text-gray-500">{placeholder}</span>
          ) : (
            values.map((value) => (
              <span key={value} className="inline-flex items-center gap-1 rounded bg-[#e9edf6] px-2 py-1 text-[13px] text-[#334155]">
                {value}
                <button
                  type="button"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    removeValue(value);
                  }}
                  className="text-[#64748b] hover:text-[#334155]"
                >
                  x
                </button>
              </span>
            ))
          )}
        </div>
        <ChevronDown size={14} className={`transition-transform ${open ? "rotate-180" : ""}`} style={{ color: accentColor }} />
      </button>

      {open && !disabled ? (
        <div className="absolute left-0 top-full z-[120] mt-1 w-full rounded-xl border border-[#d6dbe8] bg-white p-2 shadow-xl">
          <div className="mb-2 flex items-center gap-2 rounded-lg border bg-slate-50/50 px-3 py-1.5 transition-all focus-within:bg-white" style={{ borderColor: accentColor }}>
            <Search size={14} className="text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search"
              className="w-full border-none bg-transparent text-[13px] text-slate-700 outline-none placeholder:text-slate-400"
            />
          </div>

          <div className="max-h-52 overflow-auto rounded-lg bg-white">
            {filtered.length === 0 ? (
              <div className="px-3 py-2 text-[13px] text-[#94a3b8]">No options found</div>
            ) : (
              filtered.map((option) => {
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => addValue(option)}
                    className="mb-1 flex w-full items-center justify-between rounded-lg px-3 py-2 text-[13px] text-slate-700 transition-colors last:mb-0 hover:bg-slate-50"
                  >
                    <span>{option}</span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function NewAddonPage() {
  const navigate = useNavigate();
  const { addonId } = useParams<{ addonId?: string }>();
  const [searchParams] = useSearchParams();
  const productPrefill = String(searchParams.get("product") || "").trim();
  const { baseCurrency } = useCurrency();
  const { canCreate, canEdit, loading: permissionsLoading } = usePermissions();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isEditMode = Boolean(addonId);
  const [activeTab, setActiveTab] = useState("Pricing");
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [editingAddon, setEditingAddon] = useState<AddonRecord | null>(null);
  const [products, setProducts] = useState<string[]>([]);
  const [productNameToId, setProductNameToId] = useState<Record<string, string>>({});
  const [planRows, setPlanRows] = useState<PlanRow[]>([]);
  const [taxes, setTaxes] = useState<string[]>([]);
  const [newProductOpen, setNewProductOpen] = useState(false);
  const [volumeBrackets, setVolumeBrackets] = useState<VolumeBracket[]>(DEFAULT_VOLUME_BRACKETS);
  const [imageUrl, setImageUrl] = useState("");
  const inputsDisabled = !isEditMode && !form.product.trim();
  const isFlatPricing = form.pricingModel === "Flat";
  const isVolumePricing = form.pricingModel === "Volume";
  const isTierPricing = form.pricingModel === "Tier";
  const isPackagePricing = form.pricingModel === "Package";
  const isBracketPricing = isVolumePricing || isTierPricing || isPackagePricing;
  const currencyCode = String(baseCurrency?.code || "USD").split(" - ")[0].trim().toUpperCase() || "USD";
  const currencyPrefix = currencyCode;
  const canCreateAddon = canCreate("products", "Addon");
  const canEditAddon = canEdit("products", "Addon");

  const unitOptions = useMemo(() => dedupe([form.unit, ...UNIT_OPTIONS]), [form.unit]);
  const taxOptions = useMemo(() => dedupe([form.taxName, ...taxes]), [form.taxName, taxes]);
  const plansForSelectedProduct = useMemo(() => {
    const selectedProduct = String(form.product || "").trim().toLowerCase();
    const rows = Array.isArray(planRows) ? planRows : [];
    const filtered = rows.filter((row) => {
      if (!row) return false;
      const status = String(row.status || "Active").toLowerCase();
      if (status === "inactive") return false;
      if (!selectedProduct) return true;
      return String(row.product || "").trim().toLowerCase() === selectedProduct;
    });
    return dedupe(filtered.map((row) => row.name));
  }, [planRows, form.product]);
  const freqLabel = useMemo(() => periodLabel(form.billingFrequency), [form.billingFrequency]);
  const recurringSuffix = form.addonType === "Recurring" ? ` /${freqLabel}` : "";

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((prev) => ({ ...prev, [key]: value }));
  const getAutoStartingQty = (index: number) => {
    if (index === 0) return "1";
    const prevEnding = Number(volumeBrackets[index - 1]?.endingQty);
    if (!Number.isFinite(prevEnding) || prevEnding <= 0) return "";
    return String(prevEnding + 1);
  };

  const updateVolumeBracket = (index: number, key: keyof VolumeBracket, value: string) => {
    setVolumeBrackets((prev) => prev.map((row, rowIndex) => (rowIndex === index ? { ...row, [key]: value } : row)));
  };

  const getNextBracketStart = (rows: VolumeBracket[]) => {
    for (let index = rows.length - 1; index >= 0; index -= 1) {
      const candidate = Number(rows[index]?.endingQty || rows[index]?.startingQty);
      if (Number.isFinite(candidate) && candidate > 0) return String(candidate + 1);
    }
    return rows.length === 0 ? "1" : "";
  };

  const addVolumeBracket = () => {
    setVolumeBrackets((prev) => {
      if (isPackagePricing) {
        return [...prev, { startingQty: "", endingQty: "", price: "" }];
      }
      return [...prev, { startingQty: getNextBracketStart(prev), endingQty: "", price: "" }];
    });
  };

  const removeVolumeBracket = (index: number) => {
    setVolumeBrackets((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((_, rowIndex) => rowIndex !== index);
    });
  };

  const applyImageFile = (file?: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setImageUrl(String(reader.result || ""));
    reader.readAsDataURL(file);
  };

  const onImageInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    applyImageFile(event.target.files?.[0]);
    event.target.value = "";
  };

  useEffect(() => {
    void (async () => {
      try {
        const res: any = await productsAPI.getAll({ limit: 1000 });
        const rows = Array.isArray(res?.data) ? res.data : [];
        const map: Record<string, string> = {};
        const names = rows
          .filter((row: any) => String(row?.status || "Active").toLowerCase() === "active")
          .map((row: any) => {
            const id = String(row?.id || row?._id || "").trim();
            const name = String(row?.name || "").trim();
            if (id && name) map[name.toLowerCase()] = id;
            return name;
          })
          .filter(Boolean);
        const unique = dedupe(names);
        setProductNameToId(map);
        setProducts(unique);
      } catch (e) {
        console.error("Failed to load products", e);
        setProductNameToId({});
        setProducts([]);
      }
    })();
  }, [productPrefill]);

  useEffect(() => {
    if (!productPrefill || isEditMode) return;
    setForm((prev) => ({ ...prev, product: prev.product || productPrefill }));
  }, [productPrefill, isEditMode]);

  useEffect(() => {
    void (async () => {
      try {
        const res: any = await plansAPI.getAll({ limit: 2000 });
        const rows = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
        const merged: PlanRow[] = rows
          .map((row: any): PlanRow | null => {
            const id = String(row?.id || row?._id || "").trim();
            const name = String(row?.planName || row?.plan || row?.name || "").trim();
            const product = String(row?.product || "").trim();
            const productId = String(row?.productId || "").trim();
            const status = String(row?.status || "Active").trim();
            if (!id || !name) return null;
            return { id, name, product, productId, status };
          })
          .filter(Boolean) as PlanRow[];
        setPlanRows(merged);
      } catch (e) {
        console.error("Failed to load plans", e);
        setPlanRows([]);
      }
    })();
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        const res: any = await taxesAPI.getAll({ limit: 1000 });
        const rows = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
        const options = rows
          .filter((tax: any) => tax && tax.isActive !== false && tax.isGroup !== true && String(tax.type || "").toLowerCase() !== "group")
          .map((tax: any) => {
            const name = String(tax.name || tax.taxName || "").trim();
            const rate = Number(tax.rate ?? tax.taxRate ?? 0);
            return name ? `${name} [${Number.isFinite(rate) ? rate : 0}%]` : "";
          })
          .filter(Boolean);
        setTaxes(dedupe(options));
      } catch (e) {
        console.error("Failed to load taxes", e);
        setTaxes([]);
      }
    })();
  }, []);

  useEffect(() => {
    if (form.associatedPlans !== "Selected Plans") return;
    const allowed = new Set(plansForSelectedProduct.map((p) => String(p).toLowerCase()));
    setForm((prev) => ({
      ...prev,
      selectedPlans: Array.isArray(prev.selectedPlans)
        ? prev.selectedPlans.filter((p) => allowed.has(String(p).toLowerCase()))
        : [],
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.product, form.associatedPlans, plansForSelectedProduct.join("|")]);

  useEffect(() => {
    if (!isEditMode || !addonId) {
      setEditingAddon(null);
      setForm({
        ...DEFAULT_FORM,
        product: productPrefill || "",
      });
      setVolumeBrackets(DEFAULT_VOLUME_BRACKETS);
      setImageUrl("");
      return;
    }
    void (async () => {
      try {
        const res: any = await addonsAPI.getById(String(addonId));
        const found = (res as any)?.data as AddonRecord | null;
        if (!found) return navigate("/products/addons", { replace: true });
        setEditingAddon(found);
        setForm(toForm(found));
        setImageUrl(String((found as any).imageUrl || ""));
        const rawBrackets = Array.isArray((found as any).pricingBrackets)
          ? (found as any).pricingBrackets
          : Array.isArray((found as any).volumeBrackets)
            ? (found as any).volumeBrackets
            : [];
        const mappedBrackets: VolumeBracket[] = rawBrackets
          .map((row: any) => ({
            startingQty: String(row?.startingQty ?? row?.startingQuantity ?? ""),
            endingQty: String(row?.endingQty ?? row?.endingQuantity ?? ""),
            price: String(row?.price ?? ""),
          }))
          .filter((row: VolumeBracket) => row.startingQty || row.endingQty || row.price);
        if (mappedBrackets.length > 0) {
          setVolumeBrackets(mappedBrackets);
          return;
        }
        if (["Volume", "Tier", "Package"].includes(normModel(found.pricingModel))) {
          const firstRow: VolumeBracket = {
            startingQty: normModel(found.pricingModel) === "Package" ? "" : String((found as any).startingQuantity ?? "1"),
            endingQty: String((found as any).endingQuantity ?? (normModel(found.pricingModel) === "Package" ? "" : "2")),
            price: Number.isFinite(Number(found.price)) ? String(found.price) : "",
          };
          setVolumeBrackets(
            normModel(found.pricingModel) === "Package"
              ? [firstRow]
              : [
                  firstRow,
                  {
                    startingQty: "",
                    endingQty: "",
                    price: "",
                  },
                ]
          );
          return;
        }
        setVolumeBrackets(DEFAULT_VOLUME_BRACKETS);
      } catch (e) {
        console.error("Failed to load addon", e);
        navigate("/products/addons", { replace: true });
      }
    })();
  }, [addonId, isEditMode, navigate, productPrefill]);

  if (permissionsLoading) {
    return (
      <div className="flex min-h-[40vh] w-full items-center justify-center p-6 text-sm text-gray-500">
        Loading permissions...
      </div>
    );
  }

  if ((isEditMode && !canEditAddon) || (!isEditMode && !canCreateAddon)) {
    return (
      <AccessDenied
        title="Addons access required"
        message={isEditMode ? "Your role does not include permission to edit Addons." : "Your role does not include permission to create Addons."}
      />
    );
  }

  const handleSave = () => {
    const product = form.product.trim();
    const productId = productNameToId[product.toLowerCase()];
    const addonName = form.addonName.trim();
    const addonCode = form.addonCode.trim();
    const selectedPlans = dedupe(form.selectedPlans);
    const planSummary = form.associatedPlans === "Selected Plans" ? (selectedPlans.join(", ") || "Selected Plans") : "All Plans";
    if (!product) return toast.error("Please select a product.");
    if (!productId) return toast.error("Invalid product. Please select a product from the list.");
    if (!addonName || !addonCode) return toast.error("Addon Name and Addon Code are required.");
    if (form.associatedPlans === "Selected Plans" && selectedPlans.length === 0) return toast.error("Please select at least one plan.");
    const now = new Date().toISOString();
    const cleanVolumeBrackets = volumeBrackets
      .map((row, index) => ({
        startingQty: isPackagePricing ? "" : getAutoStartingQty(index),
        endingQty: String(row.endingQty || "").trim(),
        price: String(row.price || "").trim(),
      }))
      .filter((row) => row.startingQty || row.endingQty || row.price);
    const firstVolumeBracket = cleanVolumeBrackets[0];
    const basePriceInput = isBracketPricing ? firstVolumeBracket?.price ?? form.price : form.price;
    const price = Number.isFinite(Number(basePriceInput)) ? Number(basePriceInput) : 0;
    const startingQuantity = isBracketPricing && !isPackagePricing ? firstVolumeBracket?.startingQty || "" : "";
    const endingQuantity = isBracketPricing ? firstVolumeBracket?.endingQty || "" : "";
    if (isEditMode && editingAddon) {
      void (async () => {
        try {
          const payload: any = {
            productId,
            product,
            addonName,
            addonCode,
            description: form.description.trim(),
            addonType: form.addonType,
            billingFrequency: form.billingFrequency,
            pricingModel: form.pricingModel,
            price,
            unit: form.unit.trim(),
            imageUrl: imageUrl || "",
            account: form.account || "Sales",
            associatedPlans: form.associatedPlans,
            selectedPlans,
            plan: planSummary,
            includeInWidget: form.includeInWidget,
            showInPortal: form.showInPortal,
            isDigitalService: form.isDigitalService,
            taxName: form.taxName.trim(),
            startingQuantity,
            endingQuantity,
            updatedAt: now,
            type: form.type,
            volumeBrackets: isBracketPricing ? cleanVolumeBrackets : [],
            pricingBrackets: isBracketPricing ? cleanVolumeBrackets : [],
          };
          await addonsAPI.update(editingAddon.id, payload);
          toast.success("Addon updated successfully.");
          navigate(`/products/addons/${editingAddon.id}`);
        } catch (e: any) {
          console.error("Failed to update addon", e);
          toast.error(e?.message || "Failed to update addon");
        }
      })();
      return;
    }
    void (async () => {
      try {
        const payload: any = {
          productId,
          product,
          addonName,
          addonCode,
          description: form.description.trim(),
          status: "Active",
          addonType: form.addonType,
          billingFrequency: form.billingFrequency,
          pricingModel: form.pricingModel,
          price,
          unit: form.unit.trim(),
          imageUrl: imageUrl || "",
          account: form.account || "Sales",
          associatedPlans: form.associatedPlans,
          selectedPlans,
          plan: planSummary,
          includeInWidget: form.includeInWidget,
          showInPortal: form.showInPortal,
          isDigitalService: form.isDigitalService,
          taxName: form.taxName.trim(),
          startingQuantity,
          endingQuantity,
          createdAt: now,
          updatedAt: now,
          type: form.type,
          volumeBrackets: isBracketPricing ? cleanVolumeBrackets : [],
          pricingBrackets: isBracketPricing ? cleanVolumeBrackets : [],
        };
        const res: any = await addonsAPI.create(payload);
        const id = String(res?.data?.id || res?.data?._id || "");
        toast.success("Addon created successfully.");
        navigate(id ? `/products/addons/${id}` : "/products/addons");
      } catch (e: any) {
        console.error("Failed to create addon", e);
        toast.error(e?.message || "Failed to create addon");
      }
    })();
  };

  const handleCancel = () => navigate(isEditMode && addonId ? `/products/addons/${addonId}` : "/products/addons");
  const onNewProductSaved = () => {
    void (async () => {
      try {
        const res: any = await productsAPI.getAll({ limit: 1000 });
        const rows = Array.isArray(res?.data) ? res.data : [];
        const map: Record<string, string> = {};
        const names = rows
          .filter((row: any) => String(row?.status || "Active").toLowerCase() === "active")
          .map((row: any) => {
            const id = String(row?.id || row?._id || "").trim();
            const name = String(row?.name || "").trim();
            if (id && name) map[name.toLowerCase()] = id;
            return name;
          })
          .filter(Boolean);
        const unique = dedupe(names);
        setProductNameToId(map);
        setProducts(unique);
        if (unique.length > 0) setField("product", unique[0]);
      } catch {
        // ignore
      }
    })();
  };

  const labelRequiredClass = "mb-1 block text-[12px] font-normal text-[#ff4d4f]";
  const labelClass = "mb-1 block text-[12px] font-normal text-[#1f2937]";
  const inputBaseClass =
    "h-[32px] w-full rounded border border-[#cfd6e6] bg-white px-3 text-[12px] text-[#111827] outline-none transition-all focus:border-[#4c8bf5] disabled:cursor-not-allowed disabled:bg-gray-100";
  const textareaBaseClass =
    "w-full rounded border border-[#cfd6e6] bg-white px-3 py-2 text-[12px] text-[#111827] outline-none transition-all focus:border-[#4c8bf5] disabled:cursor-not-allowed disabled:bg-gray-100 resize-none";

  return (
    <div className="flex min-h-full w-full flex-col bg-[#f8f9fc]">
      <div className="flex-none flex items-center justify-between border-b border-[#dbe2ef] bg-white px-8 py-4">
        <h1 className="text-[18px] font-semibold text-[#111827]">{isEditMode ? "Edit Addon" : "New Addon"}</h1>
        <button onClick={handleCancel} className="text-[#9ca3af] hover:text-[#6b7280] transition-colors" aria-label="Close">
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden bg-[#f8f9fc] pb-6">
        <div className="w-full px-8 py-6">
          <div className="space-y-0">
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
              <div className="space-y-5">
                <div className={`grid grid-cols-[140px_minmax(0,420px)] items-center gap-x-6 ${inputsDisabled ? "opacity-60" : ""}`}>
                  <label className={labelRequiredClass}>Product*</label>
                  <StyledDropdown
                    value={form.product}
                    options={products}
                    onChange={(v) => setField("product", v)}
                    placeholder="Select Product"
                    footerLabel="New Product"
                    onFooterClick={() => setNewProductOpen(true)}
                    menuClassName="mt-0"
                    portalMenu
                  />
                </div>

                <div className="grid grid-cols-2 gap-x-10">
                  <div className={`grid grid-cols-[140px_minmax(0,1fr)] items-center gap-x-6 ${inputsDisabled ? "opacity-60" : ""}`}>
                    <label className={labelRequiredClass}>Addon Name*</label>
                    <input type="text" value={form.addonName} disabled={inputsDisabled} onChange={(e) => setField("addonName", e.target.value)} className={inputBaseClass} />
                  </div>
                  <div className={`grid grid-cols-[140px_minmax(0,1fr)] items-center gap-x-6 ${inputsDisabled ? "opacity-60" : ""}`}>
                    <label className={labelRequiredClass}>Addon Code*</label>
                    <input type="text" value={form.addonCode} disabled={inputsDisabled} onChange={(e) => setField("addonCode", e.target.value)} className={inputBaseClass} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-x-10">
                  <div className={`grid grid-cols-[140px_minmax(0,1fr)] items-start gap-x-6 ${inputsDisabled ? "opacity-60" : ""}`}>
                    <label className={labelClass}>Addon Description</label>
                    <textarea value={form.description} disabled={inputsDisabled} onChange={(e) => setField("description", e.target.value)} className={`h-20 ${textareaBaseClass}`} />
                  </div>
                  <div className={`grid grid-cols-[140px_minmax(0,1fr)] items-start gap-x-6 ${inputsDisabled ? "opacity-60" : ""}`}>
                    <label className={labelRequiredClass}>Addon Type*</label>
                    <div className="mt-1 flex gap-5">
                      <label className="flex cursor-pointer items-center text-[12px] text-[#111827]">
                        <input type="radio" name="addonType" checked={form.addonType === "One-time"} disabled={inputsDisabled} onChange={() => setField("addonType", "One-time")} style={{ accentColor: "#1b5e6a" }} className="mr-2 disabled:cursor-not-allowed" />
                        One-time
                      </label>
                      <label className="flex cursor-pointer items-center text-[12px] text-[#111827]">
                        <input type="radio" name="addonType" checked={form.addonType === "Recurring"} disabled={inputsDisabled} onChange={() => setField("addonType", "Recurring")} style={{ accentColor: "#1b5e6a" }} className="mr-2 disabled:cursor-not-allowed" />
                        Recurring
                      </label>
                    </div>
                  </div>
                </div>

                <div className={`grid grid-cols-[140px_minmax(0,420px)] items-center gap-x-6 ${inputsDisabled ? "opacity-60" : ""}`}>
                  <label className={labelRequiredClass}>Pricing Interval*</label>
                  <StyledDropdown value={form.billingFrequency} options={BILLING_INTERVALS} onChange={(v) => setField("billingFrequency", v)} placeholder="Select interval" disabled={inputsDisabled} />
                </div>
              </div>

              <div className="flex items-start justify-center lg:pt-4">
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onImageInputChange} />
                {imageUrl ? (
                  <div className="mt-1 flex h-[190px] w-[230px] flex-col overflow-hidden rounded-lg border border-[#cfd5e3] bg-white">
                    <div className="flex-1 bg-white p-2">
                      <img src={imageUrl} alt="Addon" className="h-full w-full object-contain" />
                    </div>
                    <div className="flex h-[44px] items-center justify-between border-t border-[#e5e7eb] px-3">
                      <button type="button" disabled={inputsDisabled} onClick={() => fileInputRef.current?.click()} className="text-[14px] text-[#2563eb] disabled:cursor-not-allowed disabled:opacity-50">
                        Change Image
                      </button>
                      <button type="button" disabled={inputsDisabled} onClick={() => setImageUrl("")} className="text-[#111827] hover:text-[#ef4444] disabled:cursor-not-allowed disabled:opacity-50">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => !inputsDisabled && fileInputRef.current?.click()}
                    onKeyDown={(e) => {
                      if (inputsDisabled) return;
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        fileInputRef.current?.click();
                      }
                    }}
                    onDragOver={(e) => {
                      if (inputsDisabled) return;
                      e.preventDefault();
                    }}
                    onDrop={(e) => {
                      if (inputsDisabled) return;
                      e.preventDefault();
                      applyImageFile(e.dataTransfer.files?.[0]);
                    }}
                    className={`mt-1 flex h-[190px] w-[230px] flex-col items-center justify-center rounded-lg border border-dashed border-[#d7dce8] bg-white text-center ${
                      inputsDisabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"
                    }`}
                  >
                    <ImageIcon size={42} className="mb-3 text-[#8a8aa0]" />
                    <p className="text-[14px] text-[#4b5563]">Drag image(s) here or</p>
                    <span className="text-[14px] text-[#156372]">Browse images</span>
                  </div>
                )}
              </div>
            </div>

            <div className={`mt-6 border-b border-[#d8deea] bg-[#f7f8fc] px-4 ${inputsDisabled ? "opacity-60" : ""}`}>
              <nav className="flex flex-wrap items-end gap-2 border-b border-[#d8deea] pt-2">
                {["Pricing", "Plans", "Hosted Payment Pages & Portal", "Other Details"].map((tab) => (
                  <button
                    key={tab}
                    disabled={inputsDisabled}
                    onClick={() => setActiveTab(tab)}
                    className={`px-5 py-3 text-[13px] transition-colors disabled:cursor-not-allowed ${
                      activeTab === tab
                        ? "border-x border-t-2 border-b-0 border-[#d8deea] border-t-[#22b573] bg-white font-medium text-[#111827] shadow-[0_-1px_0_0_#fff]"
                        : "text-[#111827] hover:text-[#0f172a]"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </nav>
            </div>

        {activeTab === "Pricing" ? (
          <div className={`space-y-6 py-2 ${inputsDisabled ? "opacity-60" : ""}`}>
            {isBracketPricing ? (
              <>
                <div className="grid grid-cols-1 gap-x-14 gap-y-6 md:grid-cols-2">
                  <div className={`grid grid-cols-[140px_minmax(0,1fr)] items-center gap-x-6 ${inputsDisabled ? "opacity-60" : ""}`}>
                    <label className={labelRequiredClass}>Pricing Model*</label>
                    <StyledDropdown
                      value={form.pricingModel}
                      options={PRICING_MODELS}
                      onChange={(v) => {
                        const nextModel = normModel(v);
                        setForm((prev) => ({ ...prev, pricingModel: nextModel, unit: nextModel === "Flat" ? "" : prev.unit }));
                        setVolumeBrackets((prev) => {
                          if (nextModel === "Package") {
                            return prev.length ? prev.map((row) => ({ ...row, startingQty: "" })) : [{ startingQty: "", endingQty: "", price: "" }];
                          }
                          if (nextModel === "Volume" || nextModel === "Tier") {
                            const nextRows =
                              prev.length > 0
                                ? [...prev]
                                : [
                                    { startingQty: "1", endingQty: "2", price: "" },
                                    { startingQty: "", endingQty: "", price: "" },
                                  ];
                            while (nextRows.length < 2) {
                              nextRows.push({ startingQty: "", endingQty: "", price: "" });
                            }
                            return nextRows.map((row, index) => ({
                              ...row,
                              startingQty: row.startingQty || (index === 0 ? "1" : ""),
                              endingQty: row.endingQty || (index === 0 ? "2" : ""),
                            }));
                          }
                          return prev;
                        });
                      }}
                      placeholder="Select Pricing Model"
                      disabled={inputsDisabled}
                    />
                  </div>

                  <div className={`grid grid-cols-[140px_minmax(0,1fr)] items-center gap-x-6 ${inputsDisabled ? "opacity-60" : ""}`}>
                    <label className={labelRequiredClass}>Unit Name*</label>
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <StyledDropdown value={form.unit} options={unitOptions} onChange={(v) => setField("unit", v)} placeholder="Select Unit" disabled={inputsDisabled} />
                      </div>
                      <Info size={16} className="text-gray-400" />
                    </div>
                  </div>
                </div>

                {isPackagePricing ? (
                  <p className="max-w-[780px] text-[15px] leading-7 text-[#64748b]">
                    Price is set for a fixed quantity of addons. Unit price is not applicable.
                  </p>
                ) : isTierPricing ? (
                  <p className="max-w-[780px] text-[15px] leading-7 text-[#64748b]">
                    Price of the addon is calculated based on the per unit price of each pricing bracket.
                    <br />
                    For example, if 1-3 stamps cost $6 and 4-6 stamps cost $5, buying 5 stamps will cost $28 (3*$6+2*$5).
                  </p>
                ) : (
                  <p className="max-w-[780px] text-[15px] leading-7 text-[#64748b]">
                    Per unit price of the addon depends on the quantity of addons purchased.
                    <br />
                    For example, say 1-10 stamps costs $5 each and a purchase of more than 10 stamps cost only $3 each.
                  </p>
                )}

                {isPackagePricing ? (
                  <div className="relative max-w-[780px] overflow-hidden rounded-md border border-[#d9deea]">
                    <div className="grid grid-cols-2 border-b border-[#d9deea] bg-[#f8fafc] text-[13px] font-medium uppercase tracking-wide text-[#64748b]">
                      <div className="border-r border-[#d9deea] px-3 py-2">Ending Qty</div>
                      <div className="px-3 py-2">{`Price (${currencyPrefix})${recurringSuffix}`}</div>
                    </div>

                    {volumeBrackets.map((row, index) => (
                      <div key={`package-${index}`} className="grid grid-cols-2 border-b border-[#d9deea] last:border-b-0">
                        <input
                          type="text"
                          value={row.endingQty}
                          disabled={inputsDisabled}
                          onChange={(e) => updateVolumeBracket(index, "endingQty", e.target.value)}
                          className="h-[40px] border-r border-[#d9deea] px-3 text-sm outline-none disabled:cursor-not-allowed disabled:bg-gray-100"
                        />
                        <input
                          type="text"
                          value={row.price}
                          disabled={inputsDisabled}
                          onChange={(e) => updateVolumeBracket(index, "price", e.target.value)}
                          className="h-[40px] px-3 text-sm outline-none disabled:cursor-not-allowed disabled:bg-gray-100"
                        />
                      </div>
                    ))}

                    {volumeBrackets.length > 1 ? (
                      <button
                        type="button"
                        disabled={inputsDisabled}
                        onClick={() => removeVolumeBracket(volumeBrackets.length - 1)}
                        className="absolute right-[-24px] top-1/2 -translate-y-1/2 text-[#f43f5e] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <MinusCircle size={16} />
                      </button>
                    ) : null}
                  </div>
                ) : (
                  <div className="relative max-w-[780px] overflow-hidden rounded-md border border-[#d9deea]">
                    <div className="grid grid-cols-3 border-b border-[#d9deea] bg-[#f8fafc] text-[13px] font-medium uppercase tracking-wide text-[#64748b]">
                      <div className="border-r border-[#d9deea] px-3 py-2">Starting Qty</div>
                      <div className="border-r border-[#d9deea] px-3 py-2">Ending Qty</div>
                      <div className="px-3 py-2">{`Price (${currencyPrefix}) /unit${recurringSuffix}`}</div>
                    </div>

                    {volumeBrackets.map((row, index) => (
                      <div key={`volume-${index}`} className="grid grid-cols-3 border-b border-[#d9deea] last:border-b-0">
                        <input
                          type="text"
                          value={getAutoStartingQty(index)}
                          disabled
                          readOnly
                          className="h-[40px] cursor-not-allowed border-r border-[#d9deea] bg-[#f8fafc] px-3 text-sm text-[#475569] outline-none"
                        />
                        <input
                          type="text"
                          value={row.endingQty}
                          disabled={inputsDisabled}
                          onChange={(e) => updateVolumeBracket(index, "endingQty", e.target.value)}
                          className="h-[40px] border-r border-[#d9deea] px-3 text-sm outline-none disabled:cursor-not-allowed disabled:bg-gray-100"
                        />
                        <input
                          type="text"
                          value={row.price}
                          disabled={inputsDisabled}
                          onChange={(e) => updateVolumeBracket(index, "price", e.target.value)}
                          className="h-[40px] px-3 text-sm outline-none disabled:cursor-not-allowed disabled:bg-gray-100"
                        />
                      </div>
                    ))}

                    {volumeBrackets.length > 1 ? (
                      <button
                        type="button"
                        disabled={inputsDisabled}
                        onClick={() => removeVolumeBracket(volumeBrackets.length - 1)}
                        className="absolute right-[-24px] top-1/2 -translate-y-1/2 text-[#f43f5e] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <MinusCircle size={16} />
                      </button>
                    ) : null}
                  </div>
                )}

                <button
                  type="button"
                  disabled={inputsDisabled}
                  onClick={addVolumeBracket}
                  className="flex items-center gap-2 text-sm text-[#2563eb] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <PlusCircle size={16} />
                  <span>Add another price bracket.</span>
                </button>

                <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
                  <div className="w-full max-w-[520px]">
                    <label className="mb-1 block text-sm font-medium text-red-600">Type*</label>
                    <div className="mt-2 flex gap-4">
                      <label className="flex cursor-pointer items-center text-sm"><input type="radio" name="productType" checked={form.type === "Goods"} disabled={inputsDisabled} onChange={() => setField("type", "Goods")} className="mr-2 accent-blue-600 disabled:cursor-not-allowed" />Goods</label>
                      <label className="flex cursor-pointer items-center text-sm"><input type="radio" name="productType" checked={form.type === "Service"} disabled={inputsDisabled} onChange={() => setField("type", "Service")} className="mr-2 accent-blue-600 disabled:cursor-not-allowed" />Service</label>
                    </div>
                  </div>
                  <div className="w-full max-w-[520px]">
                    <label className="mb-1 block text-sm font-medium text-slate-600">Sales Tax</label>
                    <StyledDropdown value={form.taxName} options={taxOptions} onChange={(v) => setField("taxName", v)} placeholder="Select a Tax" disabled={inputsDisabled} groupLabel="Compound tax" footerLabel="New Tax" onFooterClick={() => navigate("/settings/taxes/new")} />
                    <p className="mt-1 text-[11px] leading-tight text-gray-400">Add tax to your Plan or Addon. Use tax group for more than one tax.</p>
                  </div>
                </div>

                {form.type === "Service" ? (
                  <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
                    <div />
                    <div className="flex items-center gap-2">
                      <label className="flex cursor-pointer items-center gap-2 text-[12px] text-[#111827]">
                        <input
                          type="checkbox"
                          checked={form.isDigitalService}
                          onChange={(e) => setField("isDigitalService", e.target.checked)}
                          className="h-4 w-4 rounded border-gray-300 disabled:cursor-not-allowed"
                          disabled={inputsDisabled}
                        />
                        <span>It is a digital service</span>
                      </label>
                      <Info size={14} className="text-gray-400" />
                    </div>
                  </div>
                ) : null}
              </>
            ) : (
              <div className="w-full max-w-[700px] space-y-6">
                <div className="grid grid-cols-1 gap-x-14 gap-y-6 md:grid-cols-2">
                  <div className={`grid grid-cols-[140px_minmax(0,1fr)] items-center gap-x-6 ${inputsDisabled ? "opacity-60" : ""}`}>
                    <label className={labelRequiredClass}>Pricing Model*</label>
                    <StyledDropdown
                      value={form.pricingModel}
                      options={PRICING_MODELS}
                      onChange={(v) => {
                        const nextModel = normModel(v);
                        setForm((prev) => ({ ...prev, pricingModel: nextModel, unit: nextModel === "Flat" ? "" : prev.unit }));
                        setVolumeBrackets((prev) => {
                          if (nextModel === "Package") {
                            return prev.length ? prev.map((row) => ({ ...row, startingQty: "" })) : [{ startingQty: "", endingQty: "", price: "" }];
                          }
                          if (nextModel === "Volume" || nextModel === "Tier") {
                            const nextRows =
                              prev.length > 0
                                ? [...prev]
                                : [
                                    { startingQty: "1", endingQty: "2", price: "" },
                                    { startingQty: "", endingQty: "", price: "" },
                                  ];
                            while (nextRows.length < 2) {
                              nextRows.push({ startingQty: "", endingQty: "", price: "" });
                            }
                            return nextRows.map((row, index) => ({
                              ...row,
                              startingQty: row.startingQty || (index === 0 ? "1" : ""),
                              endingQty: row.endingQty || (index === 0 ? "2" : ""),
                            }));
                          }
                          return prev;
                        });
                      }}
                      placeholder="Select Pricing Model"
                      disabled={inputsDisabled}
                    />
                  </div>

                  {!isFlatPricing ? (
                    <div className={`grid grid-cols-[140px_minmax(0,1fr)] items-center gap-x-6 ${inputsDisabled ? "opacity-60" : ""}`}>
                      <label className={labelRequiredClass}>Unit Name*</label>
                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          <StyledDropdown value={form.unit} options={unitOptions} onChange={(v) => setField("unit", v)} placeholder="Select Unit" disabled={inputsDisabled} />
                        </div>
                        <Info size={16} className="text-gray-400" />
                      </div>
                    </div>
                  ) : (
                    <div />
                  )}
                </div>

                <div className="grid grid-cols-1 gap-x-14 gap-y-6 md:grid-cols-2">
                  <div className="grid grid-cols-[140px_minmax(0,1fr)] items-center gap-x-6">
                    <label className={labelRequiredClass}>Price*</label>
                    <div className="grid grid-cols-[54px_1fr_105px] overflow-hidden rounded-md border border-[#cfd6e6] bg-white">
                      <span className="border-r border-[#cfd6e6] bg-[#f8fafc] px-3 py-2 text-[12px] text-[#64748b]">{currencyPrefix}</span>
                      <input
                        type="text"
                        value={form.price}
                        disabled={inputsDisabled}
                        onChange={(e) => setField("price", e.target.value)}
                        className="flex-1 px-3 py-2 text-[12px] outline-none disabled:cursor-not-allowed disabled:bg-gray-100"
                      />
                      <span className="border-l border-[#cfd6e6] bg-[#f8fafc] px-3 py-2 text-[12px] text-[#64748b]">{`/unit${recurringSuffix}`}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-[140px_minmax(0,1fr)] items-start gap-x-6">
                    <label className={labelClass}>Sales Tax</label>
                    <div>
                      <StyledDropdown
                        value={form.taxName}
                        options={taxOptions}
                        onChange={(v) => setField("taxName", v)}
                        placeholder="Select a Tax"
                        disabled={inputsDisabled}
                        groupLabel="Compound tax"
                        footerLabel="New Tax"
                        onFooterClick={() => navigate("/settings/taxes/new")}
                      />
                      <p className="mt-1 max-w-[260px] text-[11px] leading-tight text-gray-400">Add tax to your Plan or Addon. Use tax group for more than one tax.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-[140px_minmax(0,1fr)] items-center gap-x-6">
                    <label className={labelRequiredClass}>Type*</label>
                    <div className="flex items-center gap-5">
                      <label className="flex cursor-pointer items-center text-[12px] text-[#111827]">
                        <input
                          type="radio"
                          name="productType"
                          checked={form.type === "Goods"}
                          disabled={inputsDisabled}
                          onChange={() => {
                            setField("type", "Goods");
                            setField("isDigitalService", false);
                          }}
                          className="mr-2 accent-[#1b5e6a] disabled:cursor-not-allowed"
                        />
                        Goods
                      </label>
                      <label className="flex cursor-pointer items-center text-[12px] text-[#111827]">
                        <input
                          type="radio"
                          name="productType"
                          checked={form.type === "Service"}
                          disabled={inputsDisabled}
                          onChange={() => setField("type", "Service")}
                          className="mr-2 accent-[#1b5e6a] disabled:cursor-not-allowed"
                        />
                        Service
                      </label>
                    </div>
                  </div>

                  {form.type === "Service" ? (
                    <div className="grid grid-cols-[140px_minmax(0,1fr)] items-center gap-x-6">
                      <span className="text-[12px] text-[#111827]">It is a digital service</span>
                      <label className="flex cursor-pointer items-center gap-2 text-[12px] text-[#111827]">
                        <input
                          type="checkbox"
                          checked={form.isDigitalService}
                          onChange={(e) => setField("isDigitalService", e.target.checked)}
                          className="h-4 w-4 rounded border-gray-300 disabled:cursor-not-allowed"
                          disabled={inputsDisabled}
                        />
                        <Info size={14} className="text-gray-400" />
                      </label>
                    </div>
                  ) : (
                    <div />
                  )}
                </div>
              </div>
            )}
          </div>
        ) : null}

        {activeTab === "Plans" ? (
          <div className={`space-y-6 py-6 ${inputsDisabled ? "opacity-60" : ""}`}>
            <div className="grid grid-cols-[200px_1fr] items-center gap-4">
              <span className="text-sm font-medium text-red-600">Associated Plans*</span>
              <div className="w-full max-w-[320px]">
                <StyledDropdown
                  value={form.associatedPlans}
                  options={["All Plans", "Selected Plans"]}
                  onChange={(v) =>
                    setForm((prev) => ({
                      ...prev,
                      associatedPlans: v === "Selected Plans" ? "Selected Plans" : "All Plans",
                      selectedPlans: v === "Selected Plans" ? prev.selectedPlans : [],
                    }))
                  }
                  placeholder="Select Plans"
                  disabled={inputsDisabled}
                />
              </div>
            </div>

            {form.associatedPlans === "Selected Plans" ? (
              <div className="grid grid-cols-[200px_1fr] items-start gap-4">
                <span className="text-sm font-medium text-red-600">Select Plans*</span>
                <div className="w-full max-w-[320px]">
                  <MultiSelectPlansDropdown
                    values={form.selectedPlans}
                    options={plansForSelectedProduct}
                    onChange={(values) => setField("selectedPlans", values)}
                    placeholder="Choose Plans"
                    disabled={inputsDisabled}
                  />
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        {activeTab === "Hosted Payment Pages & Portal" ? (
          <div className={`space-y-8 py-6 pl-4 ${inputsDisabled ? "opacity-60" : ""}`}>
            <div className="grid grid-cols-[200px_1fr] items-center gap-4">
              <span className="text-sm font-medium text-slate-700">Widgets Preference</span>
              <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={form.includeInWidget}
                  onChange={(e) => setField("includeInWidget", e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 disabled:cursor-not-allowed"
                  disabled={inputsDisabled}
                />
                <span>Display this addon in the pricing and checkout widgets. <span className="cursor-pointer text-blue-500 hover:underline">Learn more</span></span>
              </label>
            </div>
            <div className="grid grid-cols-[200px_1fr] items-center gap-4">
              <span className="text-sm font-medium text-slate-700">Associate Addon</span>
              <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={form.showInPortal}
                  onChange={(e) => setField("showInPortal", e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 disabled:cursor-not-allowed"
                  disabled={inputsDisabled}
                />
                <span>Allow customers to associate this addon with subscriptions in the Portal <Info size={14} className="relative -top-[1px] inline-block text-gray-400" /></span>
              </label>
            </div>
          </div>
        ) : null}

        {activeTab === "Other Details" ? (
          <div className={`space-y-6 py-6 pl-4 ${inputsDisabled ? "opacity-60" : ""}`}>
            <div className="grid grid-cols-1 items-center gap-4 md:grid-cols-[160px_260px_auto]">
              <span className="text-sm text-[#111827]">Account</span>
              <StyledDropdown
                value={form.account}
                groupedOptions={ACCOUNT_GROUPS}
                onChange={(v) => setField("account", v)}
                placeholder="Select Account"
                disabled={inputsDisabled}
                selectedStyle="default"
              />
              <Info size={16} className="text-gray-400" />
            </div>
          </div>
        ) : null}
      </div>
      </div>
      </div>
      <div className="flex-none border-t border-gray-200 bg-white px-8 py-4 shadow-[0_-1px_3px_0_rgba(0,0,0,0.1)]">
        <div className="flex gap-3">
          <button
            onClick={handleSave}
            disabled={inputsDisabled}
            className="cursor-pointer rounded-lg border-b-[4px] border-[#0D4A52] px-8 py-1.5 text-[13px] font-semibold text-white transition-all hover:-translate-y-[1px] hover:border-b-[6px] hover:brightness-110 active:translate-y-[2px] active:border-b-[2px] active:brightness-90 disabled:cursor-not-allowed disabled:transform-none disabled:opacity-60 disabled:border-b-[4px]"
            style={{ background: "linear-gradient(90deg, #156372 0%, #0D4A52 100%)" }}
          >
            {isEditMode ? "Save Changes" : "Save"}
          </button>
          <button
            onClick={handleCancel}
            className="cursor-pointer rounded-lg border border-slate-200 border-b-[4px] bg-white px-8 py-1.5 text-[13px] font-semibold text-slate-600 transition-all hover:bg-slate-50 active:translate-y-[2px] active:border-b-[2px]"
          >
            Cancel
          </button>
        </div>
      </div>

      <NewProductModal isOpen={newProductOpen} onClose={() => setNewProductOpen(false)} onSaveSuccess={onNewProductSaved} />
    </div>
  );
}

