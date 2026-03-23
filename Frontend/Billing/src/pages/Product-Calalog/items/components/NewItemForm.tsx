import React, { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-toastify";
import { Check, ChevronDown, HelpCircle, Image as ImageIcon, PlusCircle, Search, X, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useOrganizationBranding } from "../../../../hooks/useOrganizationBranding";
import { reportingTagsAPI, taxesAPI, unitsAPI } from "../../../../services/api";
import CreateAccountModal from "../../../settings/organization-settings/setup-configurations/opening-balances/CreateAccountModal";

interface NewItemFormProps {
  onCancel: () => void;
  onCreate: (data: any, selectedTagIds: string[]) => Promise<void>;
  baseCurrency?: any;
  initialData?: any;
  formTitle?: string;
}

const BUILTIN_UNITS = ["cm", "dz", "ft", "g", "in", "kg", "km", "lb", "mg", "ml", "m", "pcs"];
const SALES_ACCOUNTS = [
  "Income",
  "Discount",
  "General Income",
  "Interest Income",
  "Late Fee Income",
  "Other Charges",
  "Sales",
  "Shipping Charge",
];

const TAX_GROUP_MARKER = "__taban_tax_group__";

const normalizeReportingTagOptions = (tag: any): string[] => {
  const raw = Array.isArray(tag?.options) ? tag.options : [];
  return raw
    .map((value: any) => String(value ?? "").trim())
    .filter(Boolean);
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

    return { name, isGroup, isCompound: !!tax?.isCompound, computedRate, label: `${name} [${computedRate}%]` };
  };

  rows.forEach((tax) => {
    if (!tax) return;
    if (tax.isActive === false) return;

    const id = String(tax._id || tax.id || "");
    if (!id) return;

    const { name, isGroup, isCompound, label } = computeTaxLabel(tax);
    if (!name) return;

    if (isGroup) {
      taxGroups.push(label);
    } else if (isCompound) {
      compoundTaxes.push(label);
    } else {
      taxes.push(label);
    }
  });

  return [
    { label: "Tax", options: Array.from(new Set(taxes)) },
    { label: "Compound tax", options: Array.from(new Set(compoundTaxes)) },
    { label: "Tax Group", options: Array.from(new Set(taxGroups)) },
  ].filter((g) => g.options.length > 0);
};

type DropdownOption = {
  value: string;
  label: string;
};

type SearchableDropdownProps = {
  value: string;
  options?: Array<string | DropdownOption>;
  groupedOptions?: Array<{ label: string; options: Array<string | DropdownOption> }>;
  onChange: (value: string) => void;
  placeholder: string;
  accentColor: string;
  groupLabel?: string;
  addNewLabel?: string;
  onAddNew?: () => void;
};

const SearchableDropdown = ({
  value,
  options = [],
  groupedOptions,
  onChange,
  placeholder,
  accentColor,
  groupLabel,
  addNewLabel,
  onAddNew,
}: SearchableDropdownProps) => {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const wrapperRef = useRef<HTMLDivElement>(null);

  const normalizeOptions = (opts: Array<string | DropdownOption>): DropdownOption[] =>
    opts.map((opt) => (typeof opt === "string" ? { value: opt, label: opt } : opt));

  const normalizedOptions = normalizeOptions(options);
  const selected = (groupedOptions
    ? groupedOptions.flatMap(g => normalizeOptions(g.options))
    : normalizedOptions
  ).find((opt) => opt.value === value);

  const filterOptions = (opts: DropdownOption[]) =>
    opts.filter((opt) => opt.label.toLowerCase().includes(searchTerm.toLowerCase()));

  const displayedGroups = groupedOptions?.map(group => ({
    label: group.label,
    options: filterOptions(normalizeOptions(group.options))
  })).filter(group => group.options.length > 0) || [];

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
        onClick={() => setOpen((prev) => !prev)}
        className="h-[34px] w-full rounded border border-gray-300 px-3 text-left text-[13px] transition-colors hover:border-gray-400"
        style={open ? { borderColor: accentColor } : {}}
      >
        <div className="flex items-center justify-between gap-2">
          <span className={selected ? "text-[#1f2937]" : "text-[#6b7280]"}>{selected?.label || placeholder}</span>
          <ChevronDown size={14} className={`transition-transform ${open ? "rotate-180" : ""}`} style={{ color: accentColor }} />
        </div>
      </button>

      {open && (
        <div className="absolute left-0 top-full z-[9999] mt-1 w-full rounded-xl border border-[#d6dbe8] bg-white p-1 shadow-2xl animate-in fade-in zoom-in-95 duration-100">
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

          <div className="max-h-64 overflow-y-auto custom-scrollbar py-1">
            {groupedOptions ? (
              displayedGroups.length === 0 ? (
                <div className="px-4 py-3 text-center text-[13px] text-slate-400">No results found</div>
              ) : (
                displayedGroups.map((group) => (
                  <div key={group.label} className="mb-1 last:mb-0">
                    <div className="px-4 py-1.5 text-[10px] font-extrabold text-slate-700 uppercase tracking-widest">{group.label}</div>
                    {group.options.map((opt) => renderOptionItem(opt, true))}
                  </div>
                ))
              )
            ) : displayedOptions.length === 0 ? (
              <div className="px-4 py-3 text-center text-[13px] text-slate-400">No results found</div>
            ) : (
              <>
                {groupLabel && <div className="px-4 py-1.5 text-[10px] font-extrabold text-slate-700 uppercase tracking-widest">{groupLabel}</div>}
                {displayedOptions.map((opt) => renderOptionItem(opt))}
              </>
            )}
          </div>

          {onAddNew && addNewLabel && (
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setSearchTerm("");
                onAddNew();
              }}
              className="w-full flex items-center gap-2 px-4 py-2.5 text-[13px] font-medium border-t border-slate-100 hover:bg-slate-50 transition-colors"
              style={{ color: accentColor }}
            >
              <PlusCircle size={14} />
              {addNewLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

const Label = ({ children, required = false, tooltip, dotted = false }: any) => (
  <div className="flex items-center gap-1 text-[13px]">
    <span className={`${required ? "text-[#ef4444]" : "text-gray-700"}`}>
      {children}
      {required ? "*" : ""}
    </span>
    {tooltip && <HelpCircle size={14} className="cursor-help text-gray-400" />}
  </div>
);

const isReportingTagRequired = (tag: any) =>
  Boolean(
    tag?.isMandatory ||
    tag?.mandatory ||
    tag?.is_required ||
    tag?.required ||
    tag?.isRequired ||
    tag?.is_mandatory
  );

export default function NewItemForm({ onCancel, onCreate, baseCurrency, initialData, formTitle = "New Item" }: NewItemFormProps) {
  const navigate = useNavigate();
  const { accentColor } = useOrganizationBranding();
  const currencyCode = String(baseCurrency?.code || "USD").trim() || "USD";
  // Use code (e.g. ARS) to clearly indicate the base currency (symbol like "$" can be ambiguous).
  const currencyPrefix = currencyCode;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [extraSalesAccounts, setExtraSalesAccounts] = useState<string[]>([]);
  const [unitOptions, setUnitOptions] = useState<string[]>([]);

  const [form, setForm] = useState({
    name: initialData?.name || "",
    type: (initialData?.type === "Service" ? "Service" : "Goods") as "Goods" | "Service",
    unit: initialData?.unit || "",
    sku: initialData?.sku || "",
    sellingPrice: initialData?.sellingPrice?.toString() || "",
    salesAccount: initialData?.salesAccount || "Sales",
    salesTax: initialData?.salesTax || (initialData?.taxInfo ? `${initialData.taxInfo.taxName} [${initialData.taxInfo.taxRate}%]` : ""),
    salesDescription: initialData?.salesDescription || initialData?.description || "",
    isDigitalService: initialData?.isDigitalService || false,
  });
  const initialSalesTaxLabel = String(
    initialData?.salesTax ||
    (initialData?.taxInfo ? `${initialData.taxInfo.taxName} [${initialData.taxInfo.taxRate}%]` : "")
  ).trim();
  const [taxRows, setTaxRows] = useState<any[]>([]);
  const [availableReportingTags, setAvailableReportingTags] = useState<any[]>([]);
  const [reportingTagValues, setReportingTagValues] = useState<Record<string, string>>({});

  const [images, setImages] = useState<string[]>(
    Array.isArray(initialData?.images)
      ? initialData.images
      : initialData?.image
        ? [initialData.image]
        : []
  );

  const inputBaseClass = "h-[34px] w-full rounded border border-gray-300 px-3 text-[13px] outline-none focus:border-blue-400 transition-all";
  const selectBaseClass = "h-[34px] w-full appearance-none rounded border border-gray-300 bg-white px-3 pr-8 text-[13px] outline-none focus:border-blue-400 cursor-pointer";
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
  const salesAccountOptions = dedupeOptions([form.salesAccount, ...SALES_ACCOUNTS, ...extraSalesAccounts]);
  const mergedTaxOptions = useMemo(() => getGroupedTaxes(taxRows), [taxRows]);
  const mergedUnitOptions = dedupeOptions([form.unit, ...BUILTIN_UNITS, ...unitOptions]);

  useEffect(() => {
    const taxId = String(initialData?.taxId || initialData?.taxInfo?.taxId || "").trim();
    const taxNameFallback = String(initialData?.taxInfo?.taxName || "").trim();
    const parsedName = String(initialSalesTaxLabel.split("[")[0] || "").trim();
    const desiredName = taxNameFallback || parsedName;
    if (!taxId && !desiredName) return;
    if (!Array.isArray(taxRows) || taxRows.length === 0) return;

    const rateById = new Map<string, number>();
    taxRows.forEach((row: any) => {
      const rowId = String(row?._id || row?.id || "");
      if (!rowId) return;
      const rowRate = Number(row?.rate ?? row?.taxRate ?? 0);
      rateById.set(rowId, Number.isFinite(rowRate) ? rowRate : 0);
    });

    const row = taxId
      ? taxRows.find((t: any) => String(t?._id || t?.id || "") === taxId)
      : taxRows.find((t: any) => String(t?.name || t?.taxName || "").trim().toLowerCase() === desiredName.toLowerCase());
    if (!row) return;

    const name = String(row?.name || row?.taxName || "").trim();
    if (!name) return;

    const groupTaxes = Array.isArray(row?.groupTaxes) ? row.groupTaxes.map((x: any) => String(x)) : [];
    const isGroup =
      row?.isGroup === true ||
      String(row?.kind || "").toLowerCase() === "group" ||
      String(row?.type || "").toLowerCase() === "group" ||
      row?.description === TAX_GROUP_MARKER ||
      groupTaxes.length > 0;
    const rate = Number(row?.rate ?? row?.taxRate ?? 0);
    const computedRate = isGroup
      ? Number(groupTaxes.reduce((sum: number, childId: string) => sum + (rateById.get(childId) || 0), 0).toFixed(2))
      : (Number.isFinite(rate) ? rate : 0);
    const computedLabel = `${name} [${computedRate}%]`;

    setForm((prev) => {
      const current = String(prev.salesTax || "").trim();
      if (!current || current === initialSalesTaxLabel) {
        return { ...prev, salesTax: computedLabel };
      }
      return prev;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taxRows, initialData?.taxId]);

  useEffect(() => {
    let mounted = true;
    const loadReportingTags = async () => {
      try {
        const response = await reportingTagsAPI.getAll();
        const rows = Array.isArray(response) ? response : (response?.data || []);
        if (!Array.isArray(rows)) {
          if (mounted) setAvailableReportingTags([]);
          return;
        }

        const tagsForItems = rows
          .filter((tag: any) => {
            if (tag?.isActive === false) return false;
            const appliesTo = normalizeReportingTagAppliesTo(tag);
            return appliesTo.some((entry) => entry.includes("item"));
          })
          .map((tag: any) => ({
            ...tag,
            _id: String(tag?._id || tag?.id || ""),
            options: normalizeReportingTagOptions(tag),
          }))
          .filter((tag: any) => tag._id && String(tag?.name || "").trim());

        const fallbackAll = rows
          .map((tag: any) => ({
            ...tag,
            _id: String(tag?._id || tag?.id || ""),
            options: normalizeReportingTagOptions(tag),
          }))
          .filter((tag: any) => tag._id && String(tag?.name || "").trim());

        const finalTags = tagsForItems.length > 0 ? tagsForItems : fallbackAll;
        if (mounted) setAvailableReportingTags(finalTags);
      } catch (e) {
        if (mounted) setAvailableReportingTags([]);
      }
    };
    loadReportingTags();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!initialData?.tags || !Array.isArray(initialData.tags)) return;
    // Pre-fill reporting tag selections from existing item tags.
    setReportingTagValues((prev) => {
      const next = { ...prev };
      initialData.tags.forEach((t: any) => {
        const groupId = String(t?.groupId || t?.group_id || t?.tagId || "");
        const groupName = String(t?.groupName || t?.group || "").trim();
        const value = String(t?.name || t?.value || "").trim();
        if (!value) return;
        if (groupId) next[groupId] = value;
        else if (groupName) next[`name:${groupName.toLowerCase()}`] = value;
      });
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialData?._id, initialData?.id]);

  useEffect(() => {
    let mounted = true;

    const loadTaxes = async () => {
      try {
        const response: any = await taxesAPI.getAll({ limit: 1000 });
        let apiRows = Array.isArray(response?.data) ? response.data : Array.isArray(response) ? response : [];

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

        if (mounted) {
          setTaxRows(merged);
        }
      } catch (error) {
        console.error("Failed to load taxes", error);
      }
    };

    const fetchUnits = async () => {
      try {
        const response: any = await unitsAPI.getAll();
        const apiUnits = Array.isArray(response?.data) ? response.data : Array.isArray(response) ? response : [];
        if (mounted) {
          setUnitOptions(apiUnits.map((u: any) => u.name).filter(Boolean));
        }
      } catch (err) {
        console.warn("Failed to fetch units", err);
      }
    };

    loadTaxes();
    fetchUnits();

    return () => {
      mounted = false;
    };
  }, []);


  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setImages([String(reader.result || "")]);
    reader.readAsDataURL(file);
    event.target.value = "";
  };

  const handleChange = (e: any) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error("Name is required.");
      return;
    }
    if (!form.sku.trim()) {
      toast.error("SKU is required.");
      return;
    }
    if (!form.sellingPrice || Number(form.sellingPrice) <= 0) {
      toast.error("Selling Price must be greater than 0.");
      return;
    }

    const selectedReportingTags = availableReportingTags
      .map((tag: any) => {
        const id = String(tag?._id || "");
        const name = String(tag?.name || "").trim();
        const keyById = id;
        const keyByName = `name:${name.toLowerCase()}`;
        const selected = reportingTagValues[keyById] || reportingTagValues[keyByName] || "";
        return { id, groupName: name, value: selected, isMandatory: isReportingTagRequired(tag) };
      })
      .filter((row: any) => row.id && row.groupName);

    const missingMandatory = selectedReportingTags.find((row: any) => row.isMandatory && !row.value);
    if (missingMandatory) {
      toast.error(`${missingMandatory.groupName} is required.`);
      return;
    }

    const tagsPayload = selectedReportingTags
      .filter((row: any) => Boolean(row.value))
      .map((row: any) => ({
        groupId: row.id,
        groupName: row.groupName,
        name: row.value,
      }));

    setIsSaving(true);
    try {
      const selectedTaxLabel = String(form.salesTax || "").trim();
      const selectedTaxName = String(selectedTaxLabel.split("[")[0] || "").trim().toLowerCase();
      const selectedTaxRecord = selectedTaxLabel
        ? taxRows.find((tax: any) => {
          if (!tax) return false;
          if (tax.isActive === false) return false;

          const id = String(tax._id || tax.id || "");
          const name = String(tax.name || tax.taxName || "").trim();
          if (!id || !name) return false;

          const rateById = new Map<string, number>();
          taxRows.forEach((row: any) => {
            const rowId = String(row?._id || row?.id || "");
            if (!rowId) return;
            const rowRate = Number(row?.rate ?? row?.taxRate ?? 0);
            rateById.set(rowId, Number.isFinite(rowRate) ? rowRate : 0);
          });

          const groupTaxes = Array.isArray(tax.groupTaxes) ? tax.groupTaxes.map((x: any) => String(x)) : [];
          const isGroup =
            tax.isGroup === true ||
            String(tax.kind || "").toLowerCase() === "group" ||
            String(tax.type || "").toLowerCase() === "group" ||
            tax.description === TAX_GROUP_MARKER ||
            groupTaxes.length > 0;

          const computedRate = isGroup
            ? Number(groupTaxes.reduce((sum: number, taxId: string) => sum + (rateById.get(taxId) || 0), 0).toFixed(2))
            : Number(tax.rate ?? tax.taxRate ?? 0);

          const label = `${name} [${Number.isFinite(computedRate) ? computedRate : 0}%]`;
          return label === selectedTaxLabel;
        }) || taxRows.find((tax: any) => {
          if (!tax) return false;
          if (tax.isActive === false) return false;
          const name = String(tax.name || tax.taxName || "").trim().toLowerCase();
          return Boolean(selectedTaxName) && name === selectedTaxName;
        })
        : null;

      const selectedTaxInfo = selectedTaxRecord
        ? (() => {
          const id = String(selectedTaxRecord._id || selectedTaxRecord.id || "");
          const name = String(selectedTaxRecord.name || selectedTaxRecord.taxName || "").trim();

          const rateById = new Map<string, number>();
          taxRows.forEach((row: any) => {
            const rowId = String(row?._id || row?.id || "");
            if (!rowId) return;
            const rowRate = Number(row?.rate ?? row?.taxRate ?? 0);
            rateById.set(rowId, Number.isFinite(rowRate) ? rowRate : 0);
          });

          const groupTaxes = Array.isArray(selectedTaxRecord.groupTaxes) ? selectedTaxRecord.groupTaxes.map((x: any) => String(x)) : [];
          const isGroup =
            selectedTaxRecord.isGroup === true ||
            String(selectedTaxRecord.kind || "").toLowerCase() === "group" ||
            String(selectedTaxRecord.type || "").toLowerCase() === "group" ||
            selectedTaxRecord.description === TAX_GROUP_MARKER ||
            groupTaxes.length > 0;

          const computedRate = isGroup
            ? Number(groupTaxes.reduce((sum: number, taxId: string) => sum + (rateById.get(taxId) || 0), 0).toFixed(2))
            : Number(selectedTaxRecord.rate ?? selectedTaxRecord.taxRate ?? 0);

          return {
            taxId: id,
            taxName: name,
            taxRate: Number.isFinite(computedRate) ? computedRate : 0,
            kind: isGroup ? "group" : "tax",
            isCompound: !!selectedTaxRecord.isCompound,
          };
        })()
        : null;

      await onCreate(
        {
          type: form.type,
          name: form.name.trim(),
          unit: form.unit.trim(),
          sku: form.sku.trim(),
          sellingPrice: Number(form.sellingPrice),
          salesAccount: form.salesAccount || "Sales",
          salesTax: selectedTaxLabel || "",
          taxId: selectedTaxInfo?.taxId,
          taxInfo: selectedTaxInfo || undefined,
          salesDescription: form.salesDescription || "",
          description: form.salesDescription || "",
          rate: Number(form.sellingPrice),
          images,
          currency: currencyCode,
          tags: tagsPayload,
          active: initialData?.active ?? true,
          status: initialData?.status || "Active",
          isDigitalService: form.type === "Service" ? form.isDigitalService : false,
        },
        tagsPayload.map((t: any) => String(t.groupId)).filter(Boolean)
      );
    } catch (error) {
      console.error("Failed to save item:", error);
      toast.error("Failed to save item.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-98px)] flex-col bg-gray-50">

      {/* HEADER: Fixed at top */}
      <div className="flex items-center justify-between border-b bg-white px-6 py-3">
        <h1 className="text-lg font-normal text-gray-800">{formTitle}</h1>
        <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 transition-colors">
          <X size={20} />
        </button>
      </div>

      <div className="bg-gray-50">
        <div className="max-w-[1120px] px-6 py-6">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_320px]">

            {/* Left Inputs */}
            <div className="space-y-6">
              <div className="grid grid-cols-[180px_1fr] items-center gap-4">
                <Label required>Name</Label>
                <input name="name" value={form.name} onChange={handleChange} className={inputBaseClass} />
              </div>

              <div className="grid grid-cols-[180px_1fr] items-center gap-4">
                <Label tooltip="Select if this item is a physical good or a service. Remember that you cannot change the type if this item is included in a transaction.">Type</Label>
                <div className="flex gap-6 text-[13px]">
                  {["Goods", "Service"].map((t) => (
                    <label key={t} className="flex items-center gap-2 cursor-pointer group">
                      <input type="radio" name="type" value={t} checked={form.type === t} onChange={handleChange} className="accent-[#1b5e6a] w-4 h-4 cursor-pointer" />
                      <span className="group-hover:text-gray-900 transition-colors">{t}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-[180px_1fr] items-center gap-4">
                <Label tooltip="The item will be measured in terms of this unit (e.g.: kg, dozen)">Unit</Label>
                <SearchableDropdown
                  value={form.unit}
                  options={mergedUnitOptions}
                  onChange={(value) => setForm((prev) => ({ ...prev, unit: value }))}
                  placeholder="Select or type to add"
                  accentColor={accentColor}
                />
              </div>

              <div className="grid grid-cols-[180px_1fr] items-center gap-4">
                <Label required dotted tooltip="The Stock Keeping Unit of the item">SKU</Label>
                <input name="sku" value={form.sku} onChange={handleChange} className={inputBaseClass} />
              </div>

              {form.type === "Service" && (
                <div className="grid grid-cols-[180px_1fr] items-center gap-4">
                  <div />
                  <label className="flex items-center gap-2 text-[13px] text-gray-600 cursor-pointer w-fit group">
                    <input
                      type="checkbox"
                      checked={form.isDigitalService}
                      onChange={(e) => setForm((prev) => ({ ...prev, isDigitalService: e.target.checked }))}
                      className="accent-[#1b5e6a] w-4 h-4 cursor-pointer"
                    />
                    <span className="group-hover:text-gray-900 transition-colors">It is a digital service</span>
                    <HelpCircle size={14} className="text-gray-400" />
                  </label>
                </div>
              )}
            </div>

            {/* Right Column Image Section */}
            <div className="flex justify-start lg:justify-end">
              <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handleImageUpload} />

              {images.length > 0 ? (
                <div className="w-full lg:w-[320px] border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm">
                  <div className="h-[200px] w-full flex items-center justify-center bg-[#f3f4f6]">
                    <img src={images[0]} alt="Preview" className="max-h-[90%] max-w-[90%] object-contain" />
                  </div>
                  <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-100">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-[13px] text-blue-600 font-medium hover:text-blue-700"
                    >
                      Change Image
                    </button>
                    <button type="button" onClick={() => setImages([])} className="text-gray-400 hover:text-red-500 transition-colors">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-[210px] lg:w-[320px] border-2 border-dashed border-gray-200 rounded-lg bg-[#f9fafb] flex flex-col items-center justify-center cursor-pointer transition-all group"
                  style={{ borderColor: "#e5e7eb" }}
                >
                  <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 mb-3 group-hover:border-blue-100 transition-all">
                    <ImageIcon size={32} strokeWidth={1.5} className="text-gray-400" />
                  </div>
                  <p className="text-[13px] text-gray-500">Drag image(s) here or</p>
                  <p className="text-[13px] text-blue-600 font-medium">Browse images</p>
                </div>
              )}
            </div>
          </div>

          {/* Sales Information */}
          <div className="mt-8">
            <h2 className="mb-6 border-b border-gray-50 pb-2 text-[15px] font-medium text-gray-800">Sales Information</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-20 gap-y-6">
              <div className="grid grid-cols-[180px_1fr] items-center gap-4">
                <Label required dotted>Selling Price</Label>
                <div className="flex">
                  <span className="h-[34px] flex items-center px-3 bg-gray-50 border border-r-0 border-gray-300 text-[12px] text-gray-500 rounded-l">{currencyPrefix}</span>
                  <input
                    name="sellingPrice"
                    type="number"
                    value={form.sellingPrice}
                    onChange={handleChange}
                    placeholder="0.00"
                    className={`${inputBaseClass} rounded-l-none`}
                  />
                </div>
              </div>
              <div className="grid grid-cols-[180px_1fr] items-center gap-4">
                <Label required dotted>Account</Label>
                <SearchableDropdown
                  value={form.salesAccount}
                  options={salesAccountOptions}
                  onChange={(value) => setForm((prev) => ({ ...prev, salesAccount: value }))}
                  placeholder="Select Account"
                  accentColor={accentColor}
                  groupLabel="Income"
                  addNewLabel="Add New Account"
                  onAddNew={() => setIsAccountModalOpen(true)}
                />
              </div>
              <div className="grid grid-cols-[180px_1fr] items-start gap-4">
                <Label>Description</Label>
                <textarea
                  name="salesDescription"
                  value={form.salesDescription}
                  onChange={handleChange}
                  rows={3}
                  className="min-h-[72px] w-full rounded-md border border-gray-300 px-3 py-2 text-[13px] outline-none focus:border-blue-400 resize-y transition-all"
                />
              </div>
              <div className="grid grid-cols-[180px_1fr] items-center gap-4">
                <Label tooltip="Add the sales tax that's applicable for this item. Create a group tax from Settings if you want to apply more than one tax. This tax will be auto-populated when you create transactions with this item.">Tax</Label>
                <SearchableDropdown
                  value={form.salesTax}
                  groupedOptions={mergedTaxOptions}
                  onChange={(value) => setForm((prev) => ({ ...prev, salesTax: value }))}
                  placeholder="Select a Tax"
                  accentColor={accentColor}
                  addNewLabel="Add New Tax"
                  onAddNew={() => navigate("/settings/taxes/new")}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Associated / Reporting Tags */}
      <div className="bg-gray-50 border-t border-gray-100">
        <div className="max-w-[1120px] px-6 py-8">
          <h2 className="mb-5 text-[15px] font-medium text-gray-800">Associated Tags</h2>
          {availableReportingTags.length === 0 ? (
            <div className="text-[13px] text-gray-500">No reporting tags found in Settings.</div>
          ) : (
            <div className="space-y-4">
              {availableReportingTags.map((tag: any) => {
                const id = String(tag?._id || "");
                const name = String(tag?.name || "").trim();
                const options = Array.isArray(tag?.options) ? tag.options : [];
                const keyById = id;
                const keyByName = `name:${name.toLowerCase()}`;
                const value = reportingTagValues[keyById] || reportingTagValues[keyByName] || "";
                const required = isReportingTagRequired(tag);

                return (
                  <div key={id || name} className="grid grid-cols-[180px_1fr] items-center gap-4">
                    <Label required={required}>{name || "Reporting Tag"}</Label>
                    <div className="w-full max-w-[300px]">
                      <SearchableDropdown
                        value={value}
                        options={[{ value: "", label: "None" }, ...options.filter(Boolean).map((opt: any) => String(opt))]}
                        onChange={(nextValue) => {
                          setReportingTagValues((prev) => ({ ...prev, [keyById]: nextValue }));
                        }}
                        placeholder="None"
                        accentColor={accentColor}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="mt-20 border-t bg-[#f9fafb] px-6 py-4">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="cursor-pointer transition-all text-white px-8 py-1.5 rounded-lg border-[#0D4A52] border-b-[4px] hover:brightness-110 hover:-translate-y-[1px] hover:border-b-[6px] active:border-b-[2px] active:brightness-90 active:translate-y-[2px] flex items-center gap-2 text-[13px] font-semibold disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none disabled:border-b-[4px]"
            style={{ background: 'linear-gradient(90deg, #156372 0%, #0D4A52 100%)' }}
          >
            {isSaving ? (
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                <span>Saving...</span>
              </div>
            ) : (
              <>
                <Check size={16} strokeWidth={3} />
                <span>Save</span>
              </>
            )}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="cursor-pointer transition-all bg-white text-slate-600 px-8 py-1.5 rounded-lg border-slate-200 border border-b-[4px] hover:bg-slate-50 active:border-b-[2px] active:translate-y-[2px] text-[13px] font-semibold"
          >
            Cancel
          </button>
        </div>
      </div>

      {isAccountModalOpen && (
        <CreateAccountModal
          accountType="Income"
          onClose={() => setIsAccountModalOpen(false)}
          onSave={(account) => {
            const accountName = String(account?.accountName || account?.name || "").trim();
            if (!accountName) return;
            setExtraSalesAccounts((prev) => Array.from(new Set([...prev, accountName])));
            setForm((prev) => ({ ...prev, salesAccount: accountName }));
            setIsAccountModalOpen(false);
          }}
        />
      )}

    </div>
  );
}
