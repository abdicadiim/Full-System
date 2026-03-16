import React, { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Image as ImageIcon, Info, MinusCircle, PlusCircle, Search, Trash2, X } from "lucide-react";
import { toast } from "react-toastify";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useCurrency } from "../../../../hooks/useCurrency";
import NewProductModal from "../../plans/newProduct/NewProductModal";
import { readAddons, writeAddons } from "../storage";
import type { AddonRecord } from "../types";

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
};

type VolumeBracket = {
  startingQty: string;
  endingQty: string;
  price: string;
};

const PRODUCTS_STORAGE_KEY = "inv_products_v1";
const TAX_STORAGE_KEY = "taban_settings_taxes_v1";
const PLANS_STORAGE_KEY = "inv_plans_v1";
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

const readActiveProductNames = (): string[] => {
  try {
    const rows = JSON.parse(localStorage.getItem(PRODUCTS_STORAGE_KEY) || "[]");
    return dedupe(
      (Array.isArray(rows) ? rows : [])
        .filter((row: any) => !(row?.active === false || String(row?.status || "").toLowerCase() === "inactive"))
        .map((row: any) => String(row?.name || row?.displayName || row?.product || ""))
    );
  } catch {
    return [];
  }
};

const readTaxOptions = (): string[] => {
  try {
    const rows = JSON.parse(localStorage.getItem(TAX_STORAGE_KEY) || "[]");
    const list = (Array.isArray(rows) ? rows : [])
      .filter((tax: any) => tax && tax.isActive !== false && tax.isGroup !== true && String(tax.type || "").toLowerCase() !== "group")
      .map((tax: any) => {
        const name = String(tax.name || tax.taxName || "").trim();
        const rate = Number(tax.rate ?? tax.taxRate ?? 0);
        return name ? `${name} [${Number.isFinite(rate) ? rate : 0}%]` : "";
      });
    return dedupe(list);
  } catch {
    return [];
  }
};

const readPlanNames = (): string[] => {
  try {
    const rows = JSON.parse(localStorage.getItem(PLANS_STORAGE_KEY) || "[]");
    const parsed = Array.isArray(rows) ? rows : [];
    return dedupe(
      parsed
        .map((row: any) => String(row?.planName || row?.plan || row?.name || "").trim())
        .filter(Boolean)
    );
  } catch {
    return [];
  }
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
}: DropdownProps) {
  const accentColor = "#1b5e6a";
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);
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
    const close = (event: MouseEvent) => !ref.current?.contains(event.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  return (
    <div ref={ref} className="relative w-full">
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
        <div className="absolute left-0 top-full z-[120] mt-1 w-full rounded-xl border border-[#d6dbe8] bg-white p-2 shadow-xl">
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isEditMode = Boolean(addonId);
  const [activeTab, setActiveTab] = useState("Pricing");
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [editingAddon, setEditingAddon] = useState<AddonRecord | null>(null);
  const [products, setProducts] = useState<string[]>([]);
  const [plans, setPlans] = useState<string[]>([]);
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
  const code = String(baseCurrency?.code || "AMD").split(" - ")[0].trim().toUpperCase() || "AMD";

  const unitOptions = useMemo(() => dedupe([form.unit, ...UNIT_OPTIONS]), [form.unit]);
  const taxOptions = useMemo(() => dedupe([form.taxName, ...taxes]), [form.taxName, taxes]);
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

  const addVolumeBracket = () => {
    setVolumeBrackets((prev) => {
      if (isPackagePricing) {
        return [...prev, { startingQty: "", endingQty: "", price: "" }];
      }
      const last = prev[prev.length - 1];
      const parsedNext = Number(last?.endingQty || last?.startingQty);
      const nextStart = Number.isFinite(parsedNext) && parsedNext > 0 ? String(parsedNext + 1) : "";
      return [...prev, { startingQty: nextStart, endingQty: "", price: "" }];
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
    const load = () => {
      const names = readActiveProductNames();
      if (
        productPrefill &&
        !names.some((name) => name.toLowerCase() === productPrefill.toLowerCase())
      ) {
        setProducts([productPrefill, ...names]);
        return;
      }
      setProducts(names);
    };
    load();
    window.addEventListener("storage", load);
    return () => window.removeEventListener("storage", load);
  }, [productPrefill]);

  useEffect(() => {
    if (!productPrefill || isEditMode) return;
    setForm((prev) => ({ ...prev, product: prev.product || productPrefill }));
  }, [productPrefill, isEditMode]);

  useEffect(() => {
    const load = () => setPlans(readPlanNames());
    load();
    window.addEventListener("storage", load);
    return () => window.removeEventListener("storage", load);
  }, []);

  useEffect(() => {
    const load = () => setTaxes(readTaxOptions());
    load();
    window.addEventListener("storage", load);
    return () => window.removeEventListener("storage", load);
  }, []);

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
    const found = readAddons().find((row) => String(row.id) === String(addonId));
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
      setVolumeBrackets([
        {
          startingQty: normModel(found.pricingModel) === "Package" ? "" : String((found as any).startingQuantity ?? "1"),
          endingQty: String((found as any).endingQuantity ?? (normModel(found.pricingModel) === "Package" ? "" : "2")),
          price: Number.isFinite(Number(found.price)) ? String(found.price) : "",
        },
      ]);
      return;
    }
    setVolumeBrackets(DEFAULT_VOLUME_BRACKETS);
  }, [addonId, isEditMode, navigate, productPrefill]);

  const handleSave = () => {
    const product = form.product.trim();
    const addonName = form.addonName.trim();
    const addonCode = form.addonCode.trim();
    const selectedPlans = dedupe(form.selectedPlans);
    const planSummary = form.associatedPlans === "Selected Plans" ? (selectedPlans.join(", ") || "Selected Plans") : "All Plans";
    if (!product) return toast.error("Please select a product.");
    if (!addonName || !addonCode) return toast.error("Addon Name and Addon Code are required.");
    if (form.associatedPlans === "Selected Plans" && selectedPlans.length === 0) return toast.error("Please select at least one plan.");
    const rows = readAddons();
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
      const updated: AddonRecord = {
        ...editingAddon,
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
        taxName: form.taxName.trim(),
        startingQuantity,
        endingQuantity,
        updatedAt: now,
      };
      const updatedWithBrackets: any = {
        ...updated,
        volumeBrackets: isBracketPricing ? cleanVolumeBrackets : undefined,
        pricingBrackets: isBracketPricing ? cleanVolumeBrackets : undefined,
      };
      writeAddons(rows.map((row) => (String(row.id) === String(editingAddon.id) ? ({ ...updatedWithBrackets, type: form.type } as any) : row)));
      toast.success("Addon updated successfully.");
      return navigate(`/products/addons/${editingAddon.id}`);
    }
    const id = `addon-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const created: AddonRecord = {
      id,
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
      taxName: form.taxName.trim(),
      startingQuantity,
      endingQuantity,
      createdAt: now,
      updatedAt: now,
    };
    const createdWithBrackets: any = {
      ...(created as any),
      type: form.type,
      volumeBrackets: isBracketPricing ? cleanVolumeBrackets : undefined,
      pricingBrackets: isBracketPricing ? cleanVolumeBrackets : undefined,
    };
    writeAddons([createdWithBrackets, ...rows]);
    toast.success("Addon created successfully.");
    navigate(`/products/addons/${id}`);
  };

  const handleCancel = () => navigate(isEditMode && addonId ? `/products/addons/${addonId}` : "/products/addons");
  const onNewProductSaved = () => {
    const names = readActiveProductNames();
    setProducts(names);
    if (names.length > 0) setField("product", names[0]);
  };

  const labelRequiredClass = "mb-1 block text-[13px] font-normal text-[#ef4444]";
  const labelClass = "mb-1 block text-[13px] font-normal text-gray-700";
  const inputBaseClass = "h-[34px] w-full rounded border border-gray-300 bg-white px-3 text-[13px] outline-none focus:border-blue-400 transition-all disabled:cursor-not-allowed disabled:bg-gray-100";
  const textareaBaseClass = "w-full rounded border border-gray-300 bg-white p-2 text-[13px] outline-none focus:border-blue-400 transition-all disabled:cursor-not-allowed disabled:bg-gray-100 resize-none";

  return (
    <div className="w-full min-h-screen flex flex-col bg-gray-50 overflow-x-hidden">
      <div className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
        <h1 className="text-[18px] font-semibold text-slate-900">{isEditMode ? "Edit Addon" : "New Addon"}</h1>
        <button onClick={handleCancel} className="text-gray-400 hover:text-gray-600 transition-colors" aria-label="Close">
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden bg-gray-50">
	        <div className="w-full max-w-[1120px] px-6 py-8">
	          <div className="overflow-visible rounded-lg bg-transparent">
	            <div className="space-y-6 p-6">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_280px]">
          <div className="grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2">
            <div className="w-full max-w-[520px]">
              <label className={labelRequiredClass}>Product*</label>
              <StyledDropdown value={form.product} options={products} onChange={(v) => setField("product", v)} placeholder="Select Product" footerLabel="New Product" onFooterClick={() => setNewProductOpen(true)} />
            </div>
            <div className="md:col-span-1" />

            <div className={`w-full max-w-[520px] ${inputsDisabled ? "opacity-60" : ""}`}>
              <label className={labelRequiredClass}>Addon Name*</label>
              <input type="text" value={form.addonName} disabled={inputsDisabled} onChange={(e) => setField("addonName", e.target.value)} className={inputBaseClass} />
            </div>
            <div className={`w-full max-w-[520px] ${inputsDisabled ? "opacity-60" : ""}`}>
              <label className={labelRequiredClass}>Addon Code*</label>
              <input type="text" value={form.addonCode} disabled={inputsDisabled} onChange={(e) => setField("addonCode", e.target.value)} className={inputBaseClass} />
            </div>

            <div className={`w-full max-w-[520px] ${inputsDisabled ? "opacity-60" : ""}`}>
              <label className={labelClass}>Addon Description</label>
              <textarea value={form.description} disabled={inputsDisabled} onChange={(e) => setField("description", e.target.value)} className={`h-20 ${textareaBaseClass}`} />
            </div>
            <div className={`w-full max-w-[520px] ${inputsDisabled ? "opacity-60" : ""}`}>
              <label className={labelRequiredClass}>Addon Type*</label>
              <div className="mt-2 flex gap-4">
                <label className="flex cursor-pointer items-center text-[13px] text-gray-700"><input type="radio" name="addonType" checked={form.addonType === "One-time"} disabled={inputsDisabled} onChange={() => setField("addonType", "One-time")} style={{ accentColor: "#1b5e6a" }} className="mr-2 disabled:cursor-not-allowed" />One-time</label>
                <label className="flex cursor-pointer items-center text-[13px] text-gray-700"><input type="radio" name="addonType" checked={form.addonType === "Recurring"} disabled={inputsDisabled} onChange={() => setField("addonType", "Recurring")} style={{ accentColor: "#1b5e6a" }} className="mr-2 disabled:cursor-not-allowed" />Recurring</label>
              </div>
            </div>

            {form.addonType === "Recurring" ? (
              <div className={`w-full max-w-[520px] ${inputsDisabled ? "opacity-60" : ""}`}>
                <label className={labelRequiredClass}>Pricing Interval*</label>
                <StyledDropdown value={form.billingFrequency} options={BILLING_INTERVALS} onChange={(v) => setField("billingFrequency", v)} placeholder="Select interval" disabled={inputsDisabled} />
              </div>
            ) : null}
          </div>

          <div className="flex items-start justify-center">
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onImageInputChange} />
            {imageUrl ? (
              <div className="mt-1 flex h-[230px] w-[260px] flex-col overflow-hidden rounded-lg border border-[#cfd5e3] bg-white">
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
                className={`mt-1 flex h-[230px] w-[260px] flex-col items-center justify-center rounded-lg border border-dashed border-[#d7dce8] bg-white text-center ${
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

        <div className={`border-b border-[#d8deea] bg-[#f7f8fc] px-4 ${inputsDisabled ? "opacity-60" : ""}`}>
          <nav className="flex flex-wrap items-end gap-2 border-b border-[#d8deea] pt-2">
            {["Pricing", "Plans", "Hosted Payment Pages & Portal", "Other Details"].map((tab) => (
              <button
                key={tab}
                disabled={inputsDisabled}
                onClick={() => setActiveTab(tab)}
                className={`px-5 py-3 text-[13px] transition-colors disabled:cursor-not-allowed ${
                  activeTab === tab
                    ? "border-x border-t-2 border-b-0 border-[#d8deea] border-t-[#22b573] bg-white font-medium text-[#111827]"
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
            <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
              <div className="w-full max-w-[520px]">
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
                        return prev.length
                          ? prev.map((row, index) => ({
                              ...row,
                              startingQty: row.startingQty || (index === 0 ? "1" : ""),
                              endingQty: row.endingQty || (index === 0 ? "2" : row.endingQty),
                            }))
                          : [{ startingQty: "1", endingQty: "2", price: "" }];
                      }
                      return prev;
                    });
                  }}
                  placeholder="Select Pricing Model"
                  disabled={inputsDisabled}
                />
              </div>
              {!isFlatPricing ? (
                <div className="w-full max-w-[520px]">
                  <label className={labelRequiredClass}>Unit Name*</label>
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <StyledDropdown value={form.unit} options={unitOptions} onChange={(v) => setField("unit", v)} placeholder="Select Unit" disabled={inputsDisabled} />
                    </div>
                    <Info size={16} className="text-gray-400" />
                  </div>
                </div>
              ) : <div />}
            </div>

            {isBracketPricing ? (
              <>
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
                      <div className="px-3 py-2">{`Price (${code})${recurringSuffix}`}</div>
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
                      <div className="px-3 py-2">{`Price (${code}) /unit${recurringSuffix}`}</div>
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
              </>
            ) : (
              <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
                <div className="w-full max-w-[520px] space-y-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-red-600">Price*</label>
                    {isFlatPricing ? (
                      <div className="grid grid-cols-[54px_1fr] overflow-hidden rounded-md border border-gray-300">
                        <span className="border-r bg-gray-50 px-3 py-2 text-sm text-gray-500">{code}</span>
                        <input type="text" value={form.price} disabled={inputsDisabled} onChange={(e) => setField("price", e.target.value)} className="flex-1 p-2 text-sm outline-none disabled:cursor-not-allowed disabled:bg-gray-100" />
                      </div>
                    ) : (
                      <div className="grid grid-cols-[54px_1fr_105px] overflow-hidden rounded-md border border-gray-300">
                        <span className="border-r bg-gray-50 px-3 py-2 text-sm text-gray-500">{code}</span>
                        <input type="text" value={form.price} disabled={inputsDisabled} onChange={(e) => setField("price", e.target.value)} className="flex-1 p-2 text-sm outline-none disabled:cursor-not-allowed disabled:bg-gray-100" />
                        <span className="border-l bg-gray-50 px-3 py-2 text-sm text-gray-500">{`/unit${recurringSuffix}`}</span>
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-red-600">Type*</label>
                    <div className="mt-2 flex gap-4">
                      <label className="flex cursor-pointer items-center text-sm"><input type="radio" name="productType" checked={form.type === "Goods"} disabled={inputsDisabled} onChange={() => setField("type", "Goods")} className="mr-2 accent-blue-600 disabled:cursor-not-allowed" />Goods</label>
                      <label className="flex cursor-pointer items-center text-sm"><input type="radio" name="productType" checked={form.type === "Service"} disabled={inputsDisabled} onChange={() => setField("type", "Service")} className="mr-2 accent-blue-600 disabled:cursor-not-allowed" />Service</label>
                    </div>
                  </div>
                </div>
                <div className="w-full max-w-[520px]">
                  <label className="mb-1 block text-sm font-medium text-slate-600">Sales Tax</label>
                  <StyledDropdown value={form.taxName} options={taxOptions} onChange={(v) => setField("taxName", v)} placeholder="Select a Tax" disabled={inputsDisabled} groupLabel="Compound tax" footerLabel="New Tax" onFooterClick={() => navigate("/settings/taxes/new")} />
                  <p className="mt-1 text-[11px] leading-tight text-gray-400">Add tax to your Plan or Addon. Use tax group for more than one tax.</p>
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
                    options={plans}
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

	            <div className="flex gap-3 border-t border-gray-200 bg-transparent px-6 py-4">
              <button
                onClick={handleSave}
                disabled={inputsDisabled}
                className="cursor-pointer transition-all text-white px-8 py-1.5 rounded-lg border-[#0D4A52] border-b-[4px] hover:brightness-110 hover:-translate-y-[1px] hover:border-b-[6px] active:border-b-[2px] active:brightness-90 active:translate-y-[2px] flex items-center gap-2 text-[13px] font-semibold disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none disabled:border-b-[4px]"
                style={{ background: "linear-gradient(90deg, #156372 0%, #0D4A52 100%)" }}
              >
                {isEditMode ? "Save Changes" : "Save"}
              </button>
              <button
                onClick={handleCancel}
                className="cursor-pointer transition-all bg-white text-slate-600 px-8 py-1.5 rounded-lg border-slate-200 border border-b-[4px] hover:bg-slate-50 active:border-b-[2px] active:translate-y-[2px] text-[13px] font-semibold"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>

      <NewProductModal isOpen={newProductOpen} onClose={() => setNewProductOpen(false)} onSaveSuccess={onNewProductSaved} />
    </div>
  );
}

