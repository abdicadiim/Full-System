import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Building2,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Check,
  Copy,
  Gift,
  GripVertical,
  HelpCircle,
  Maximize2,
  Monitor,
  Pencil,
  PenLine,
  PlusCircle,
  Search,
  Settings,
  Smartphone,
  Star,
  Trash2,
  X,
} from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import { createPricingWidget, readPricingWidgets, updatePricingWidget } from "../storage";

const PLANS_STORAGE_KEY = "inv_plans_v1";

type BuilderTab = "select-plans" | "configure-plans" | "customize-widget";

type BuilderPlan = {
  id: string;
  name: string;
  code: string;
  price: number;
  billingLabel: string;
};
type CustomPlan = {
  id: string;
  planName: string;
  planDescription: string;
  buttonName: string;
  buttonAction: ButtonActionOption;
  planFeatures: string;
};
type CurrencyConfigRow = {
  id: string;
  code: string;
  priceList: string;
  template: string;
  location: string;
  enabled: boolean;
};

const normalizeText = (value: unknown) => String(value || "").trim().toLowerCase();
const getId = (row: any) => String(row?.id || row?._id || "");
const getPlanName = (row: any) => String(row?.planName || row?.plan || row?.name || "Plan").trim();
const getPlanCode = (row: any) => String(row?.planCode || row?.code || "-").trim() || "-";
const getPlanPrice = (row: any) => Number(row?.price || row?.amount || 0);
const getBillingLabel = (row: any) =>
  String(
    row?.billingFrequency ||
      row?.frequency ||
      `${String(row?.billingFrequencyValue || "1")} ${String(row?.billingFrequencyPeriod || "Month(s)")}`
  ).trim();
const isPlanActive = (row: any) => {
  const status = String(row?.status || "").trim().toLowerCase();
  const active = row?.active;
  const isActive = row?.isActive;
  if (active === false || String(active).toLowerCase() === "false") return false;
  if (isActive === false || String(isActive).toLowerCase() === "false") return false;
  if (status && status !== "active") return false;
  return true;
};
const formatBilledText = (billing: string) => {
  const normalized = String(billing || "").toLowerCase();
  if (normalized.includes("year")) return "Billed Yearly";
  if (normalized.includes("week")) return "Billed Weekly";
  if (normalized.includes("day")) return "Billed Daily";
  return "Billed Monthly";
};
const formatPrice = (value: number) => {
  const amount = Number.isFinite(value) ? value : 0;
  return Number.isInteger(amount) ? `AMD${amount.toFixed(0)}` : `AMD${amount.toFixed(2)}`;
};
const BUTTON_ACTION_OPTIONS = ["Hosted Payment Page", "Custom Link", "Email Address", "Phone Number"] as const;
type ButtonActionOption = (typeof BUTTON_ACTION_OPTIONS)[number];
const BUTTON_ACTION_INPUT_CONFIG: Record<ButtonActionOption, { type: "url" | "email" | "tel" | "text"; placeholder: string }> = {
  "Hosted Payment Page": { type: "url", placeholder: "https://your-hosted-payment-page-url.com" },
  "Custom Link": { type: "url", placeholder: "https://www.example.com" },
  "Email Address": { type: "email", placeholder: "name@example.com" },
  "Phone Number": { type: "tel", placeholder: "+1 555 123 4567" },
};
const getDefaultCurrencies = (): CurrencyConfigRow[] => [
  {
    id: "currency-amd-default",
    code: "AMD",
    priceList: "Default",
    template: "Default",
    location: "Head Office",
    enabled: true,
  },
];
const EXTRA_CURRENCY_CODES = ["USD", "EUR", "GBP", "CAD", "AED", "INR"];
const PRICE_LIST_OPTIONS = ["Default"];
const TEMPLATE_OPTIONS = ["Default"];
const LOCATION_OPTIONS = ["Head Office"];
const TEMPLATE_LIBRARY = [
  { name: "Modern", buttonColor: "#e8c367", buttonTextColor: "#111827", titleColor: "#111827", illustration: false },
  { name: "Elegant", buttonColor: "#7a52b3", buttonTextColor: "#ffffff", titleColor: "#7a52b3", illustration: true },
  { name: "Elegant Pro", buttonColor: "#22a373", buttonTextColor: "#ffffff", titleColor: "#22a373", illustration: false },
  { name: "Combo", buttonColor: "#3b82f6", buttonTextColor: "#ffffff", titleColor: "#2563eb", illustration: false },
  { name: "Combo Pro", buttonColor: "#f97316", buttonTextColor: "#ffffff", titleColor: "#ea580c", illustration: false },
  { name: "Solo", buttonColor: "#16a34a", buttonTextColor: "#ffffff", titleColor: "#15803d", illustration: false },
] as const;
const getTemplateTheme = (templateName: string) =>
  TEMPLATE_LIBRARY.find((template) => normalizeText(template.name) === normalizeText(templateName)) || TEMPLATE_LIBRARY[0];
const emptyCustomPlanDraft = (): Omit<CustomPlan, "id"> => ({
  planName: "",
  planDescription: "",
  buttonName: "",
  buttonAction: BUTTON_ACTION_OPTIONS[0],
  planFeatures: "",
});

export default function PricingWidgetBuilderPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState<BuilderTab>("select-plans");
  const [plans, setPlans] = useState<BuilderPlan[]>([]);
  const [enabledPlanIds, setEnabledPlanIds] = useState<string[]>([]);
  const [expandedConfigurePlanId, setExpandedConfigurePlanId] = useState<string | null>(null);
  const [strikeAmountByPlanId, setStrikeAmountByPlanId] = useState<Record<string, string>>({});
  const [buttonActionByPlanId, setButtonActionByPlanId] = useState<Record<string, ButtonActionOption>>({});
  const [buttonActionSearchByPlanId, setButtonActionSearchByPlanId] = useState<Record<string, string>>({});
  const [buttonActionValueByPlanId, setButtonActionValueByPlanId] = useState<
    Record<string, Partial<Record<ButtonActionOption, string>>>
  >({});
  const [openedButtonActionPlanId, setOpenedButtonActionPlanId] = useState<string | null>(null);
  const [currenciesByPlanId, setCurrenciesByPlanId] = useState<Record<string, CurrencyConfigRow[]>>({});
  const [isAssociateCurrenciesOpen, setIsAssociateCurrenciesOpen] = useState(false);
  const [associateCurrenciesPlanId, setAssociateCurrenciesPlanId] = useState<string | null>(null);
  const [currencyDraftRows, setCurrencyDraftRows] = useState<CurrencyConfigRow[]>([]);
  const [isCurrenciesDetailsExpanded, setIsCurrenciesDetailsExpanded] = useState(false);
  const [isAddCurrencyFormOpen, setIsAddCurrencyFormOpen] = useState(false);
  const [currencyAddDraft, setCurrencyAddDraft] = useState({ priceList: "", template: "", location: "" });
  const [isLocationDropdownOpen, setIsLocationDropdownOpen] = useState(false);
  const [locationSearch, setLocationSearch] = useState("");
  const [isAssociateAddonsOpen, setIsAssociateAddonsOpen] = useState(false);
  const [associateAddonsPlanId, setAssociateAddonsPlanId] = useState<string | null>(null);
  const [customPlans, setCustomPlans] = useState<CustomPlan[]>([]);
  const [isCustomPlanFormOpen, setIsCustomPlanFormOpen] = useState(false);
  const [editingCustomPlanId, setEditingCustomPlanId] = useState<string | null>(null);
  const [customPlanDraft, setCustomPlanDraft] = useState<Omit<CustomPlan, "id">>(() => emptyCustomPlanDraft());
  const [highlightLabel, setHighlightLabel] = useState("Most Popular");
  const [caption, setCaption] = useState("");
  const [customButtonLabel, setCustomButtonLabel] = useState("Subscribe");
  const [customButtonColor, setCustomButtonColor] = useState("#f4ca71");
  const [language, setLanguage] = useState("English");
  const [backgroundColor, setBackgroundColor] = useState("#f9f9f9");
  const [decimalPlaces, setDecimalPlaces] = useState("");
  const [showBillingFrequency, setShowBillingFrequency] = useState(false);
  const [includeFeaturesFromPrevious, setIncludeFeaturesFromPrevious] = useState(false);
  const [showMonthWiseSplit, setShowMonthWiseSplit] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [isTemplatePickerOpen, setIsTemplatePickerOpen] = useState(false);

  const editingWidgetId = String(searchParams.get("widgetId") || "").trim();
  const editingWidget = useMemo(() => {
    if (!editingWidgetId) return null;
    return readPricingWidgets().find((row) => row.id === editingWidgetId) || null;
  }, [editingWidgetId]);
  const widgetName = String(editingWidget?.name || searchParams.get("name") || "").trim();
  const productName = String(editingWidget?.product || searchParams.get("product") || "").trim();
  const initialTemplateName = String(editingWidget?.template || searchParams.get("template") || "Modern").trim();
  const [selectedTemplate, setSelectedTemplate] = useState(initialTemplateName);
  const selectedTemplateTheme = useMemo(() => getTemplateTheme(selectedTemplate), [selectedTemplate]);

  useEffect(() => {
    if (!editingWidget) return;
    setCaption(editingWidget.caption || "");
    setCustomButtonLabel(editingWidget.buttonLabel || "Subscribe");
    setCustomButtonColor(editingWidget.buttonColor || "#f4ca71");
  }, [editingWidget]);

  useEffect(() => {
    setSelectedTemplate(initialTemplateName || "Modern");
  }, [initialTemplateName]);

  useEffect(() => {
    const load = () => {
      try {
        const raw = localStorage.getItem(PLANS_STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        const rows = Array.isArray(parsed)
          ? parsed
          : Array.isArray(parsed?.rows)
            ? parsed.rows
            : Array.isArray(parsed?.data)
              ? parsed.data
              : [];
        const productKey = normalizeText(productName);
        const nextPlans = rows
          .filter((row) => (productKey ? normalizeText(row?.product || row?.productName) === productKey : true))
          .filter(isPlanActive)
          .map((row) => ({
            id: getId(row),
            name: getPlanName(row),
            code: getPlanCode(row),
            price: getPlanPrice(row),
            billingLabel: getBillingLabel(row),
          }))
          .filter((row) => row.id && row.name);

        setPlans(nextPlans);
        setEnabledPlanIds((prev) => {
          const stillValid = prev.filter((id) => nextPlans.some((row) => row.id === id));
          if (stillValid.length > 0) return stillValid;
          return nextPlans[0]?.id ? [nextPlans[0].id] : [];
        });
      } catch {
        setPlans([]);
        setEnabledPlanIds([]);
      }
    };

    load();
    const onStorage = () => load();
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [productName]);

  const enabledPlans = useMemo(
    () => plans.filter((plan) => enabledPlanIds.includes(plan.id)),
    [plans, enabledPlanIds]
  );
  const configurablePlans = enabledPlans.length > 0 ? enabledPlans : plans;

  const togglePlan = (planId: string) => {
    setEnabledPlanIds((prev) => (prev.includes(planId) ? prev.filter((id) => id !== planId) : [...prev, planId]));
  };
  const toggleConfigurePlan = (planId: string) => {
    setExpandedConfigurePlanId((prev) => (prev === planId ? null : planId));
    setOpenedButtonActionPlanId(null);
  };
  const getSelectedButtonAction = (planId: string): ButtonActionOption => buttonActionByPlanId[planId] || BUTTON_ACTION_OPTIONS[0];
  const getButtonActionSearch = (planId: string) => buttonActionSearchByPlanId[planId] || "";
  const getFilteredButtonActions = (planId: string) => {
    const search = getButtonActionSearch(planId).trim().toLowerCase();
    if (!search) return BUTTON_ACTION_OPTIONS;
    return BUTTON_ACTION_OPTIONS.filter((item) => item.toLowerCase().includes(search));
  };
  const getPlanCurrencies = (planId: string | null) => {
    if (!planId) return getDefaultCurrencies();
    return currenciesByPlanId[planId] || getDefaultCurrencies();
  };
  const openAssociateCurrenciesPanel = (planId: string) => {
    setAssociateCurrenciesPlanId(planId);
    setCurrencyDraftRows(getPlanCurrencies(planId).map((row) => ({ ...row })));
    setIsCurrenciesDetailsExpanded(false);
    setIsAssociateCurrenciesOpen(true);
    closeAssociateAddonsPanel();
  };
  const closeAssociateCurrenciesPanel = () => {
    setIsAssociateCurrenciesOpen(false);
    setAssociateCurrenciesPlanId(null);
    setCurrencyDraftRows([]);
    setIsCurrenciesDetailsExpanded(false);
    setIsAddCurrencyFormOpen(false);
    setCurrencyAddDraft({ priceList: "", template: "", location: "" });
    setIsLocationDropdownOpen(false);
    setLocationSearch("");
  };
  const getNextCurrencyCode = (rows: CurrencyConfigRow[]) => {
    const usedCodes = new Set(rows.map((row) => row.code.toUpperCase()));
    return EXTRA_CURRENCY_CODES.find((code) => !usedCodes.has(code)) || `CUR${Math.max(rows.length + 1, 1)}`;
  };
  const openAddCurrencyForm = () => {
    setIsAddCurrencyFormOpen(true);
    setCurrencyAddDraft({ priceList: "", template: "Default", location: "Head Office" });
    setIsLocationDropdownOpen(false);
    setLocationSearch("");
  };
  const cancelAddCurrencyForm = () => {
    setIsAddCurrencyFormOpen(false);
    setCurrencyAddDraft({ priceList: "", template: "", location: "" });
    setIsLocationDropdownOpen(false);
    setLocationSearch("");
  };
  const confirmAddCurrencyRow = () => {
    const priceList = currencyAddDraft.priceList.trim();
    const template = currencyAddDraft.template.trim();
    const location = currencyAddDraft.location.trim();
    if (!priceList || !template || !location) {
      toast.error("Select price list, template and location.");
      return;
    }
    const nextId = `currency-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setCurrencyDraftRows((prev) => [
      ...prev,
      {
        id: nextId,
        code: getNextCurrencyCode(prev),
        priceList,
        template,
        location,
        enabled: true,
      },
    ]);
    cancelAddCurrencyForm();
  };
  const saveAssociateCurrencies = () => {
    if (!associateCurrenciesPlanId) {
      closeAssociateCurrenciesPanel();
      return;
    }
    const sanitized = currencyDraftRows.length > 0 ? currencyDraftRows : getDefaultCurrencies();
    setCurrenciesByPlanId((prev) => ({ ...prev, [associateCurrenciesPlanId]: sanitized.map((row) => ({ ...row })) }));
    toast.success("Currencies updated");
    closeAssociateCurrenciesPanel();
  };
  const openAssociateAddonsPanel = (planId: string) => {
    setAssociateAddonsPlanId(planId);
    setIsAssociateAddonsOpen(true);
    closeAssociateCurrenciesPanel();
  };
  const closeAssociateAddonsPanel = () => {
    setIsAssociateAddonsOpen(false);
    setAssociateAddonsPlanId(null);
  };
  const openAddCustomPlan = () => {
    setEditingCustomPlanId(null);
    setCustomPlanDraft(emptyCustomPlanDraft());
    setIsCustomPlanFormOpen(true);
  };
  const closeCustomPlanForm = () => {
    setIsCustomPlanFormOpen(false);
    setEditingCustomPlanId(null);
    setCustomPlanDraft(emptyCustomPlanDraft());
  };
  const openEditCustomPlan = (planId: string) => {
    const row = customPlans.find((item) => item.id === planId);
    if (!row) return;
    setEditingCustomPlanId(planId);
    setCustomPlanDraft({
      planName: row.planName,
      planDescription: row.planDescription,
      buttonName: row.buttonName,
      buttonAction: row.buttonAction,
      planFeatures: row.planFeatures,
    });
    setIsCustomPlanFormOpen(true);
  };
  const saveCustomPlan = () => {
    if (!customPlanDraft.planName.trim()) {
      toast.error("Plan Name is required.");
      return;
    }
    const payload: Omit<CustomPlan, "id"> = {
      planName: customPlanDraft.planName.trim(),
      planDescription: customPlanDraft.planDescription.trim(),
      buttonName: customPlanDraft.buttonName.trim() || "Subscribe",
      buttonAction: customPlanDraft.buttonAction,
      planFeatures: customPlanDraft.planFeatures.trim(),
    };

    if (editingCustomPlanId) {
      setCustomPlans((prev) => prev.map((row) => (row.id === editingCustomPlanId ? { ...row, ...payload } : row)));
    } else {
      const nextId = `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      setCustomPlans((prev) => [...prev, { id: nextId, ...payload }]);
    }
    closeCustomPlanForm();
  };
  const deleteCustomPlan = (planId: string) => {
    setCustomPlans((prev) => prev.filter((row) => row.id !== planId));
  };
  const selectPreviewCards = useMemo(
    () => [
      ...enabledPlans.map((plan) => ({
        id: plan.id,
        type: "existing" as const,
        name: plan.name,
        code: plan.code,
        price: plan.price,
        billingLabel: plan.billingLabel,
      })),
      ...customPlans.map((plan) => ({
        id: plan.id,
        type: "custom" as const,
        planName: plan.planName,
        planDescription: plan.planDescription,
        buttonName: plan.buttonName,
        planFeatures: plan.planFeatures,
      })),
    ],
    [enabledPlans, customPlans]
  );

  useEffect(() => {
    if (tab !== "configure-plans") {
      setOpenedButtonActionPlanId(null);
      closeAssociateAddonsPanel();
      closeAssociateCurrenciesPanel();
    }
  }, [tab]);

  const associateAddonsPlan =
    configurablePlans.find((plan) => plan.id === associateAddonsPlanId) || configurablePlans[0] || null;
  const associateCurrenciesPlan =
    configurablePlans.find((plan) => plan.id === associateCurrenciesPlanId) || configurablePlans[0] || null;
  const configurePreviewPlan = associateAddonsPlan || associateCurrenciesPlan || configurablePlans[0] || null;
  const filteredLocationOptions = LOCATION_OPTIONS.filter((item) =>
    item.toLowerCase().includes(locationSearch.trim().toLowerCase())
  );
  const savePricingWidget = () => {
    const normalizedName = widgetName.trim();
    const normalizedProduct = productName.trim();
    if (!normalizedName) {
      toast.error("Widget name is required.");
      return;
    }
    if (!normalizedProduct) {
      toast.error("Product is required.");
      return;
    }

    if (isAddCurrencyFormOpen) {
      const priceList = currencyAddDraft.priceList.trim();
      const template = currencyAddDraft.template.trim();
      const location = currencyAddDraft.location.trim();
      if (!priceList || !template || !location) {
        toast.error("Select price list, template and location.");
        return;
      }
      const nextId = `currency-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      setCurrencyDraftRows((prev) => [
        ...prev,
        {
          id: nextId,
          code: getNextCurrencyCode(prev),
          priceList,
          template,
          location,
          enabled: true,
        },
      ]);
      setIsAddCurrencyFormOpen(false);
      setCurrencyAddDraft({ priceList: "", template: "", location: "" });
      setIsLocationDropdownOpen(false);
      setLocationSearch("");
    }

    const selectedPlanNames = [
      ...enabledPlans.map((plan) => plan.name).filter(Boolean),
      ...customPlans.map((plan) => plan.planName).filter(Boolean),
    ];
    const payload = {
      name: normalizedName,
      product: normalizedProduct,
      template: selectedTemplate || "Modern",
      status: editingWidget?.status || "Active",
      selectedPlans: selectedPlanNames.join(", "),
      caption: caption.trim(),
      buttonLabel: customButtonLabel.trim() || "Subscribe",
      buttonColor: customButtonColor.trim() || "#f4ca71",
    };

    if (editingWidgetId) {
      updatePricingWidget(editingWidgetId, payload);
      toast.success("Pricing widget updated");
    } else {
      createPricingWidget(payload);
      toast.success("Pricing widget saved");
    }
    navigate("/products/pricing-widgets");
  };

  const closeBuilder = () => navigate("/products/pricing-widgets");
  const setPreviewMode = (enabled: boolean) => {
    setIsPreviewMode(enabled);
    if (enabled) {
      setIsTemplatePickerOpen(false);
      closeAssociateAddonsPanel();
      closeAssociateCurrenciesPanel();
      setOpenedButtonActionPlanId(null);
    }
  };
  const returnToFirstPage = () => {
    setPreviewMode(false);
    setIsTemplatePickerOpen(false);
    setTab("select-plans");
  };
  const openTemplatePicker = () => {
    setPreviewMode(false);
    setIsTemplatePickerOpen(true);
  };
  const applyTemplate = (templateName: string) => {
    const theme = getTemplateTheme(templateName);
    setSelectedTemplate(templateName);
    setCustomButtonColor(theme.buttonColor);
    setIsTemplatePickerOpen(false);
  };
  const copyBuilderCode = async () => {
    const widgetId = String(editingWidget?.id || editingWidgetId || "").trim();
    if (!widgetId) {
      toast.info("Save the widget first to generate embed code.");
      return;
    }
    const snippet = `<div id="pricing-widget-${widgetId}"></div>\n<script src="https://app.example.com/embed/pricing-widget.js" data-widget-id="${widgetId}"></script>`;
    try {
      await navigator.clipboard.writeText(snippet);
      toast.success("Embed code copied");
    } catch {
      toast.error("Unable to copy code");
    }
  };

  return (
    <div className="h-screen min-h-[560px] w-full overflow-hidden rounded-lg border border-[#d8deea] bg-[#f3f4f7]">
      <div className="flex items-center justify-between border-b border-[#d8deea] bg-white px-4 py-3">
        {isPreviewMode ? (
          <div />
        ) : (
          <div className="flex items-center gap-2 text-[#111827]">
            <span className="text-[14px] font-medium text-[#0f172a]">{widgetName || "Untitled Widget"}</span>
            <button type="button" onClick={returnToFirstPage} className="text-[#3b82f6] hover:text-[#2563eb]">
              <PenLine size={14} />
            </button>
            <div className="mx-1 h-5 w-px bg-[#d8deea]" />
            <span className="text-[14px] font-medium text-[#111827]">{selectedTemplate}</span>
            <button type="button" onClick={openTemplatePicker} className="text-[14px] text-[#3b82f6] hover:text-[#2563eb]">
              (Change)
            </button>
          </div>
        )}

        {isPreviewMode ? (
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={copyBuilderCode}
              className="rounded-md border border-[#d8deea] bg-white px-4 py-2 text-[14px] font-medium text-[#0f172a] hover:bg-[#f8fafc]"
            >
              Copy Code
            </button>
            <button
              type="button"
              onClick={returnToFirstPage}
              className="inline-flex cursor-pointer items-center gap-1 rounded-lg border-b-[4px] border-[#0D4A52] px-4 py-2 text-[14px] font-medium text-white transition-all hover:-translate-y-[1px] hover:border-b-[6px] hover:brightness-110 active:translate-y-[2px] active:border-b-[2px] active:brightness-90"
              style={{ background: "linear-gradient(90deg, #156372 0%, #0D4A52 100%)" }}
            >
              <Pencil size={14} />
              Edit
            </button>
            <button
              type="button"
              onClick={closeBuilder}
              className="rounded-md border border-[#d8deea] bg-white p-2 text-[#6b7280] hover:bg-[#f8fafc] hover:text-[#334155]"
            >
              <X size={20} />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button type="button" className="rounded border border-[#d8deea] bg-white p-2 text-[#2563eb]">
              <Monitor size={16} />
            </button>
            <button type="button" className="rounded border border-[#d8deea] bg-white p-2 text-[#334155]">
              <Smartphone size={16} />
            </button>
            <button
              type="button"
              onClick={() => setPreviewMode(true)}
              className="rounded border border-[#d8deea] bg-white p-2 text-[#334155] hover:bg-[#f8fafc]"
            >
              <Maximize2 size={16} />
            </button>
            <button
              type="button"
              onClick={savePricingWidget}
              className="cursor-pointer rounded-lg border-b-[4px] border-[#0D4A52] px-4 py-2 text-[14px] font-medium text-white transition-all hover:-translate-y-[1px] hover:border-b-[6px] hover:brightness-110 active:translate-y-[2px] active:border-b-[2px] active:brightness-90"
              style={{ background: "linear-gradient(90deg, #156372 0%, #0D4A52 100%)" }}
            >
              Save
            </button>
            <button type="button" onClick={closeBuilder} className="p-1 text-[#6b7280] hover:text-[#334155]">
              <X size={22} />
            </button>
          </div>
        )}
      </div>

      <div className="flex h-full min-h-0">
        {!isPreviewMode && !isTemplatePickerOpen ? (
          <aside className="w-[84px] border-r border-[#d8deea] bg-[#1d2648] text-white">
          <button
            type="button"
            onClick={() => setTab("select-plans")}
            className={`flex h-[84px] w-full flex-col items-center justify-center gap-2 border-b border-[#2c365d] px-2 text-center text-[12px] font-medium ${
              tab === "select-plans" ? "bg-[#13b680]" : "hover:bg-[#23305a]"
            }`}
          >
            <Check size={16} />
            <span>Select Plans</span>
          </button>
          <button
            type="button"
            onClick={() => setTab("configure-plans")}
            className={`flex h-[84px] w-full flex-col items-center justify-center gap-2 border-b border-[#2c365d] px-2 text-center text-[12px] font-medium ${
              tab === "configure-plans" ? "bg-[#13b680]" : "hover:bg-[#23305a]"
            }`}
          >
            <Settings size={16} />
            <span>Configure Plans</span>
          </button>
          <button
            type="button"
            onClick={() => setTab("customize-widget")}
            className={`flex h-[84px] w-full flex-col items-center justify-center gap-2 px-2 text-center text-[12px] font-medium ${
              tab === "customize-widget" ? "bg-[#13b680]" : "hover:bg-[#23305a]"
            }`}
          >
            <Smartphone size={16} />
            <span>Customize Widget</span>
          </button>
          </aside>
        ) : null}

        {!isPreviewMode && !isTemplatePickerOpen ? (
          <section className="flex h-full min-h-0 w-[420px] flex-col border-r border-[#d8deea] bg-white">
          {tab === "select-plans" ? (
            <>
              <div className="border-b border-[#e5e7eb] px-5 py-4">
                <h2 className="text-[18px] font-medium text-[#111827]">Select & Reorder Plans</h2>
              </div>

              <div className="flex-1 overflow-y-auto">
                {plans.length === 0 ? (
                  <div className="px-5 py-6 text-[14px] text-[#64748b]">
                    No active plans found for <span className="font-medium text-[#111827]">{productName || "this product"}</span>.
                  </div>
                ) : (
                  plans.map((plan) => {
                    const checked = enabledPlanIds.includes(plan.id);
                    return (
                      <div key={plan.id} className="flex items-center justify-between border-b border-[#eef2f7] px-5 py-4">
                        <div className="flex items-center gap-2">
                          <GripVertical size={14} className="text-[#64748b]" />
                          <Star size={14} className="text-[#cbd5e1]" />
                          <span className="text-[14px] text-[#111827]">{plan.name}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => togglePlan(plan.id)}
                          className={`relative h-6 w-10 rounded-full transition-colors ${checked ? "bg-[#36a3f7]" : "bg-[#cbd5e1]"}`}
                          aria-pressed={checked}
                        >
                          <span
                            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-4" : "translate-x-0.5"}`}
                          />
                        </button>
                      </div>
                    );
                  })
                )}

                <div className="mx-3 mt-4 border-t border-[#e5e7eb] pt-3">
                  <button
                    type="button"
                    onClick={openAddCustomPlan}
                    className="flex items-center gap-1 px-1 py-1 text-[14px] text-[#2563eb] hover:underline"
                  >
                    <PlusCircle size={14} />
                    Add a custom plan
                  </button>

                  {isCustomPlanFormOpen ? (
                    <div className="mt-3 overflow-hidden rounded-md border border-[#d8deea] bg-white">
                      <div className="border-b border-[#e5e7eb] bg-[#f8fafc] px-3 py-2 text-[16px] font-medium text-[#111827]">
                        Add Custom Plan
                      </div>

                      <div className="space-y-3 p-3">
                        <div>
                          <label className="mb-1 block text-[16px] text-[#111827]">Plan Name</label>
                          <input
                            value={customPlanDraft.planName}
                            onChange={(event) =>
                              setCustomPlanDraft((prev) => ({
                                ...prev,
                                planName: event.target.value,
                              }))
                            }
                            className="h-10 w-full rounded-md border border-[#cfd5e3] px-3 text-[14px] text-[#111827] outline-none focus:border-[#3b82f6]"
                          />
                        </div>

                        <div>
                          <label className="mb-1 block text-[16px] text-[#111827]">Plan Description</label>
                          <textarea
                            value={customPlanDraft.planDescription}
                            onChange={(event) =>
                              setCustomPlanDraft((prev) => ({
                                ...prev,
                                planDescription: event.target.value,
                              }))
                            }
                            className="h-[60px] w-full resize-none rounded-md border border-[#cfd5e3] px-3 py-2 text-[14px] text-[#111827] outline-none focus:border-[#3b82f6]"
                          />
                        </div>

                        <div>
                          <label className="mb-1 block text-[16px] text-[#111827]">Button Name</label>
                          <input
                            value={customPlanDraft.buttonName}
                            onChange={(event) =>
                              setCustomPlanDraft((prev) => ({
                                ...prev,
                                buttonName: event.target.value,
                              }))
                            }
                            className="h-10 w-full rounded-md border border-[#cfd5e3] px-3 text-[14px] text-[#111827] outline-none focus:border-[#3b82f6]"
                          />
                        </div>

                        <div>
                          <label className="mb-1 block text-[16px] text-[#111827]">Button Action</label>
                          <select
                            value={customPlanDraft.buttonAction}
                            onChange={(event) =>
                              setCustomPlanDraft((prev) => ({
                                ...prev,
                                buttonAction: event.target.value as ButtonActionOption,
                              }))
                            }
                            className="h-10 w-full rounded-md border border-[#cfd5e3] bg-white px-3 text-[14px] text-[#111827] outline-none focus:border-[#3b82f6]"
                          >
                            {BUTTON_ACTION_OPTIONS.map((action) => (
                              <option key={action} value={action}>
                                {action}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="mb-1 block text-[16px] text-[#111827]">Plan Features</label>
                          <input
                            value={customPlanDraft.planFeatures}
                            onChange={(event) =>
                              setCustomPlanDraft((prev) => ({
                                ...prev,
                                planFeatures: event.target.value,
                              }))
                            }
                            className="h-10 w-full rounded-md border border-[#cfd5e3] px-3 text-[14px] text-[#111827] outline-none focus:border-[#3b82f6]"
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-2 border-t border-[#e5e7eb] px-3 py-3">
                        <button
                          type="button"
                          onClick={saveCustomPlan}
                          className="cursor-pointer rounded-lg border-b-[4px] border-[#0D4A52] px-4 py-1.5 text-[14px] font-medium text-white transition-all hover:-translate-y-[1px] hover:border-b-[6px] hover:brightness-110 active:translate-y-[2px] active:border-b-[2px] active:brightness-90"
                          style={{ background: "linear-gradient(90deg, #156372 0%, #0D4A52 100%)" }}
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={closeCustomPlanForm}
                          className="rounded border border-[#cfd5e3] bg-white px-4 py-1.5 text-[14px] text-[#334155]"
                        >
                          Close
                        </button>
                      </div>
                    </div>
                  ) : null}

                  {customPlans.length > 0 && !isCustomPlanFormOpen ? (
                    <div className="mt-3 overflow-hidden rounded-md border border-[#d8deea] bg-white">
                      <div className="border-b border-[#e5e7eb] bg-[#f8fafc] px-3 py-2 text-[16px] font-medium text-[#111827]">
                        Custom Plan
                      </div>
                      {customPlans.map((plan) => (
                        <div key={plan.id} className="flex items-center justify-between border-b border-[#eef2f7] px-3 py-2 last:border-b-0">
                          <span className="text-[14px] text-[#111827]">{plan.planName}</span>
                          <div className="flex items-center gap-2 text-[#3b82f6]">
                            <button type="button" onClick={() => openEditCustomPlan(plan.id)} className="hover:text-[#2563eb]">
                              <Pencil size={14} />
                            </button>
                            <button type="button" onClick={() => deleteCustomPlan(plan.id)} className="hover:text-[#2563eb]">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            </>
          ) : tab === "configure-plans" ? (
            <>
              <div className="border-b border-[#e5e7eb] px-5 py-4">
                <h2 className="text-[18px] font-medium leading-[1.1] text-[#111827]">Configure Plans</h2>
              </div>

              <div className="flex-1 overflow-y-auto">
                {configurablePlans.length === 0 ? (
                  <div className="px-5 py-6 text-[14px] text-[#64748b]">
                    No plans available for <span className="font-medium text-[#111827]">{productName || "this product"}</span>.
                  </div>
                ) : (
                  configurablePlans.map((plan) => {
                    const expanded = expandedConfigurePlanId === plan.id;
                    const selectedAction = getSelectedButtonAction(plan.id);
                    const dropdownOpen = openedButtonActionPlanId === plan.id;
                    const filteredActions = getFilteredButtonActions(plan.id);
                    const strikeAmount = strikeAmountByPlanId[plan.id] || "";
                    const actionInputConfig = BUTTON_ACTION_INPUT_CONFIG[selectedAction];
                    const actionInputValue = buttonActionValueByPlanId[plan.id]?.[selectedAction] || "";
                    const planCurrencies = (currenciesByPlanId[plan.id] || getDefaultCurrencies()).filter((row) => row.enabled);

                    return (
                      <div key={plan.id} className="border-b border-[#e5e7eb]">
                        <button
                          type="button"
                          onClick={() => toggleConfigurePlan(plan.id)}
                          className="flex w-full items-center gap-1 px-4 py-3 text-left text-[14px] text-[#111827]"
                        >
                          {expanded ? <ChevronDown size={16} className="text-[#111827]" /> : <ChevronRight size={16} className="text-[#111827]" />}
                          <span className="text-[14px] leading-none">{plan.name}</span>
                        </button>

                        {expanded ? (
                          <div className="space-y-4 px-4 pb-4">
                            <div className="grid grid-cols-[110px_1fr] items-center gap-3">
                              <label className="text-[13px] text-[#111827]">
                                <div>Strike Amount</div>
                                <div className="text-[#64748b]">({formatPrice(plan.price)})</div>
                              </label>
                              <input
                                value={strikeAmount}
                                onChange={(event) =>
                                  setStrikeAmountByPlanId((prev) => ({ ...prev, [plan.id]: event.target.value }))
                                }
                                className="h-9 rounded-md border border-[#cfd5e3] bg-white px-3 text-[14px] text-[#111827] outline-none focus:border-[#3b82f6]"
                              />
                            </div>

                            <div className="overflow-hidden rounded-md border border-[#d8deea]">
                              <div className="border-b border-[#e5e7eb] bg-[#f5f7fb] px-3 py-2 text-[12px] font-medium tracking-[0.04em] text-[#334155]">
                                ADDONS
                              </div>
                              <button
                                type="button"
                                onClick={() => openAssociateAddonsPanel(plan.id)}
                                className="flex w-full items-center justify-center gap-1 px-3 py-4 text-[14px] text-[#2563eb] hover:bg-[#f8fafc]"
                              >
                                <PlusCircle size={14} />
                                Click to associate addons
                              </button>
                            </div>

                            <div className="group overflow-hidden rounded-md border border-[#d8deea]">
                              <div className="border-b border-[#e5e7eb] bg-[#f5f7fb] px-3 py-2 text-[12px] font-medium tracking-[0.04em] text-[#334155]">
                                CURRENCIES
                              </div>
                              <div className="px-3 py-2">
                                <div className="grid grid-cols-[58px_1fr_1fr_1fr] gap-2 border-b border-[#e5e7eb] pb-2 text-[11px] font-medium text-[#111827]">
                                  <span />
                                  <span>Price List</span>
                                  <span className="text-center">
                                    <span className="group-hover:hidden">Template</span>
                                    <button
                                      type="button"
                                      onClick={() => openAssociateCurrenciesPanel(plan.id)}
                                      className="hidden rounded bg-[#13b680] px-3 py-1 text-[14px] font-medium text-white group-hover:inline-flex"
                                    >
                                      Configure
                                    </button>
                                  </span>
                                  <span>Location</span>
                                </div>
                                {planCurrencies.length > 0 ? (
                                  planCurrencies.map((row) => (
                                    <div key={row.id} className="grid grid-cols-[58px_1fr_1fr_1fr] items-center gap-2 py-2 text-[13px] text-[#111827]">
                                      <span className="inline-flex w-fit rounded bg-[#1fb981] px-1.5 py-0.5 text-[12px] font-medium text-white">
                                        {row.code}
                                      </span>
                                      <span>{row.priceList}</span>
                                      <span>{row.template}</span>
                                      <span>{row.location}</span>
                                    </div>
                                  ))
                                ) : (
                                  <div className="py-2 text-[13px] text-[#64748b]">No currencies selected.</div>
                                )}
                              </div>
                            </div>

                            <div className="grid grid-cols-[110px_1fr] items-start gap-3">
                              <label className="pt-2 text-[14px] text-[#111827]">Button Action</label>
                              <div className="relative">
                                <button
                                  type="button"
                                  onClick={() => setOpenedButtonActionPlanId((prev) => (prev === plan.id ? null : plan.id))}
                                  className="flex h-9 w-full items-center justify-between rounded-md border border-[#3b82f6] bg-white px-3 text-[13px] text-[#111827]"
                                >
                                  <span>{selectedAction}</span>
                                  <ChevronDown size={15} className="text-[#2563eb]" />
                                </button>

                                {dropdownOpen ? (
                                  <div className="absolute left-0 right-0 top-[42px] z-20 overflow-hidden rounded-lg border border-[#d8deea] bg-white shadow-lg">
                                    <div className="relative border-b border-[#e5e7eb] px-2 py-1.5">
                                      <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
                                      <input
                                        value={getButtonActionSearch(plan.id)}
                                        onChange={(event) =>
                                          setButtonActionSearchByPlanId((prev) => ({ ...prev, [plan.id]: event.target.value }))
                                        }
                                        placeholder="Search"
                                        className="h-8 w-full rounded-md border border-[#cfd5e3] pl-8 pr-2 text-[13px] outline-none focus:border-[#3b82f6]"
                                      />
                                    </div>

                                    <div className="max-h-[180px] overflow-y-auto py-1">
                                      {(filteredActions.length > 0 ? filteredActions : BUTTON_ACTION_OPTIONS).map((action) => {
                                        const active = action === selectedAction;
                                        return (
                                          <button
                                            key={action}
                                            type="button"
                                            onClick={() => {
                                              setButtonActionByPlanId((prev) => ({ ...prev, [plan.id]: action }));
                                              setOpenedButtonActionPlanId(null);
                                            }}
                                            className={`flex w-full items-center justify-between px-3 py-2 text-left text-[14px] ${
                                              active ? "bg-[#3b82f6] text-white" : "text-[#475569] hover:bg-[#f8fafc]"
                                            }`}
                                          >
                                            <span>{action}</span>
                                            {active ? <Check size={14} /> : null}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>
                                ) : null}

                                <input
                                  type={actionInputConfig.type}
                                  value={actionInputValue}
                                  onChange={(event) =>
                                    setButtonActionValueByPlanId((prev) => ({
                                      ...prev,
                                      [plan.id]: {
                                        ...(prev[plan.id] || {}),
                                        [selectedAction]: event.target.value,
                                      },
                                    }))
                                  }
                                  placeholder={actionInputConfig.placeholder}
                                  className="mt-2 h-10 w-full rounded-md border border-[#cfd5e3] bg-white px-3 text-[14px] text-[#111827] outline-none focus:border-[#3b82f6]"
                                />
                              </div>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    );
                  })
                )}
              </div>
            </>
          ) : tab === "customize-widget" ? (
            <>
              <div className="border-b border-[#e5e7eb] px-5 py-4">
                <h2 className="text-[18px] font-medium leading-[1.1] text-[#111827]">Customization</h2>
              </div>

              <div className="flex-1 overflow-y-auto px-5 py-4">
                <div className="space-y-4">
                  <div>
                    <label className="mb-1.5 block text-[15px] text-[#111827]">Highlight Label</label>
                    <input
                      value={highlightLabel}
                      onChange={(event) => setHighlightLabel(event.target.value)}
                      className="h-10 w-full rounded-md border border-[#cfd5e3] bg-white px-3 text-[14px] text-[#111827] outline-none focus:border-[#3b82f6]"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 flex items-center gap-1 text-[15px] text-[#111827]">
                      <span>Caption</span>
                      <HelpCircle size={13} className="text-[#64748b]" />
                    </label>
                    <input
                      value={caption}
                      onChange={(event) => setCaption(event.target.value)}
                      className="h-10 w-full rounded-md border border-[#cfd5e3] bg-white px-3 text-[14px] text-[#111827] outline-none focus:border-[#3b82f6]"
                    />
                    <p className="mt-1.5 text-[12px] leading-[1.35] text-[#64748b]">
                      If your plans include a setup fee, use %setupfee% to display it dynamically.
                    </p>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-[15px] text-[#111827]">Button Label</label>
                    <input
                      value={customButtonLabel}
                      onChange={(event) => setCustomButtonLabel(event.target.value)}
                      className="h-10 w-full rounded-md border border-[#cfd5e3] bg-white px-3 text-[14px] text-[#111827] outline-none focus:border-[#3b82f6]"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-[15px] text-[#111827]">Button Color</label>
                    <div className="flex h-10 w-full overflow-hidden rounded-md border border-[#cfd5e3] bg-white">
                      <input
                        value={customButtonColor}
                        onChange={(event) => setCustomButtonColor(event.target.value)}
                        className="h-full flex-1 border-0 px-3 text-[14px] text-[#111827] outline-none"
                      />
                      <span className="w-7 border-l border-[#cfd5e3]" style={{ backgroundColor: customButtonColor }} />
                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-[15px] text-[#111827]">Language</label>
                    <select
                      value={language}
                      onChange={(event) => setLanguage(event.target.value)}
                      className="h-10 w-full rounded-md border border-[#cfd5e3] bg-white px-3 text-[14px] text-[#111827] outline-none focus:border-[#3b82f6]"
                    >
                      <option value="English">English</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-[15px] text-[#111827]">Background Color</label>
                    <div className="flex h-10 w-full overflow-hidden rounded-md border border-[#cfd5e3] bg-white">
                      <input
                        value={backgroundColor}
                        onChange={(event) => setBackgroundColor(event.target.value)}
                        className="h-full flex-1 border-0 px-3 text-[14px] text-[#111827] outline-none"
                      />
                      <span className="w-7 border-l border-[#cfd5e3]" style={{ backgroundColor }} />
                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-[15px] text-[#111827]">Decimal Places</label>
                    <select
                      value={decimalPlaces}
                      onChange={(event) => setDecimalPlaces(event.target.value)}
                      className="h-10 w-full rounded-md border border-[#cfd5e3] bg-white px-3 text-[14px] text-[#111827] outline-none focus:border-[#3b82f6]"
                    >
                      <option value="" />
                      <option value="0">0</option>
                      <option value="1">1</option>
                      <option value="2">2</option>
                      <option value="3">3</option>
                    </select>
                  </div>

                  <label className="flex items-center gap-2 text-[14px] text-[#111827]">
                    <input
                      type="checkbox"
                      checked={showBillingFrequency}
                      onChange={(event) => setShowBillingFrequency(event.target.checked)}
                      className="h-4 w-4 rounded border-[#cbd5e1]"
                    />
                    <span>Show Billing Frequency</span>
                  </label>

                  <label className="flex items-center gap-2 text-[14px] text-[#111827]">
                    <input
                      type="checkbox"
                      checked={includeFeaturesFromPrevious}
                      onChange={(event) => setIncludeFeaturesFromPrevious(event.target.checked)}
                      className="h-4 w-4 rounded border-[#cbd5e1]"
                    />
                    <span className="flex items-center gap-1">
                      Include features from previous plan in the next plan
                      <HelpCircle size={13} className="text-[#64748b]" />
                    </span>
                  </label>

                  <label className="flex items-center gap-2 text-[14px] text-[#111827]">
                    <input
                      type="checkbox"
                      checked={showMonthWiseSplit}
                      onChange={(event) => setShowMonthWiseSplit(event.target.checked)}
                      className="h-4 w-4 rounded border-[#cbd5e1]"
                    />
                    <span>Show month-wise split for yearly plan</span>
                  </label>
                </div>
              </div>
            </>
          ) : (
            <div className="px-5 py-6 text-[14px] text-[#64748b]">Select a section.</div>
          )}
          </section>
        ) : null}

        {isTemplatePickerOpen ? (
          <section className="flex flex-1 min-h-0 overflow-auto bg-[#f3f4f7] p-8">
            <div className="mx-auto w-full max-w-[760px]">
              <button
                type="button"
                onClick={() => setIsTemplatePickerOpen(false)}
                className="mb-3 inline-flex items-center gap-1 text-[14px] text-[#2563eb] hover:underline"
              >
                <ArrowLeft size={14} />
                Back
              </button>
              <h2 className="mb-5 text-[30px] font-medium text-[#111827]">Select Your Template</h2>

              <div className="grid grid-cols-2 gap-4">
                {TEMPLATE_LIBRARY.map((template) => {
                  const selected = normalizeText(template.name) === normalizeText(selectedTemplate);
                  return (
                    <button
                      key={template.name}
                      type="button"
                      onClick={() => applyTemplate(template.name)}
                      className={`overflow-hidden rounded-md border bg-white text-left transition ${
                        selected ? "border-[#74c86a] shadow-[0_0_0_1px_#74c86a]" : "border-[#d8deea] hover:border-[#93c5fd]"
                      }`}
                    >
                      <div className="flex h-[150px] items-center justify-center bg-[#f8fafc] p-4">
                        <div className="w-full max-w-[220px] rounded-md border border-[#e5e7eb] bg-white p-3 shadow-sm">
                          <div className="mb-3 h-2 rounded" style={{ backgroundColor: template.buttonColor, opacity: 0.75 }} />
                          <div className="mb-2 h-1.5 w-3/4 rounded bg-[#e2e8f0]" />
                          <div className="mb-2 h-1.5 w-1/2 rounded bg-[#e2e8f0]" />
                          <div className="h-6 rounded" style={{ backgroundColor: template.buttonColor }} />
                        </div>
                      </div>
                      <div className="px-2 py-1.5 text-[14px] text-[#475569]">{template.name}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          </section>
        ) : (
          <section className="flex flex-1 min-h-0 overflow-hidden bg-[#f3f4f7]">
          {tab === "select-plans" ? (
            <div className="flex flex-1 items-start justify-center overflow-auto p-8">
              {selectPreviewCards.length === 0 ? (
                <div className="rounded-md border border-[#d8deea] bg-white px-6 py-5 text-[14px] text-[#64748b]">
                  Select plans or add a custom plan to preview.
                </div>
              ) : (
                <div className="w-full max-w-[980px] overflow-hidden rounded-xl border border-[#d8deea] bg-white shadow-sm">
                  <div className="grid" style={{ gridTemplateColumns: `repeat(${selectPreviewCards.length}, minmax(0, 1fr))` }}>
                    {selectPreviewCards.map((card, index) => (
                      <div
                        key={card.id}
                        className={`min-w-0 border-[#e5e7eb] ${
                          index !== selectPreviewCards.length - 1 ? "border-r" : ""
                        }`}
                      >
                        {card.type === "existing" ? (
                          <>
                            <div
                              className="border-b border-[#e5e7eb] px-5 py-3 text-center text-[22px] tracking-[0.15em]"
                              style={{ color: selectedTemplateTheme.titleColor }}
                            >
                              {card.name || "PREVIEW"}
                            </div>
                            <div className="px-5 py-10 text-center">
                              {selectedTemplateTheme.illustration ? (
                                <div className="mb-6 flex justify-center">
                                  <div className="rounded-md border border-[#e5e7eb] bg-white p-3">
                                    <Building2 size={42} className="text-[#7a52b3]" />
                                  </div>
                                </div>
                              ) : null}
                              <div className="text-[58px] font-medium text-[#0f172a]">{formatPrice(card.price || 0)}</div>
                              <p className="mt-2 text-[16px] text-[#111827]">{formatBilledText(card.billingLabel || "")}</p>
                              <button
                                type="button"
                                className="mt-5 h-10 w-full rounded text-[14px] font-medium"
                                style={{ backgroundColor: customButtonColor || selectedTemplateTheme.buttonColor, color: selectedTemplateTheme.buttonTextColor }}
                              >
                                SUBSCRIBE
                              </button>
                            </div>
                            <div className="flex items-center gap-2 border-t border-[#e5e7eb] bg-[#f8fafc] px-5 py-4 text-[14px] text-[#111827]">
                              <Check size={14} />
                              <span>{card.code || "-"}</span>
                              <span className="rounded bg-[#1e2a4a] px-1.5 py-0.5 text-[11px] text-white">New</span>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="border-b border-[#e5e7eb] px-5 py-3 text-center text-[22px] tracking-[0.05em] text-[#111827]">
                              {card.planName || "CUSTOM PLAN"}
                            </div>
                            <div className="px-5 py-10 text-center">
                              <p className="text-[18px] text-[#111827]">{card.planDescription || "\u00A0"}</p>
                              <div className="mt-5 text-[58px] font-medium text-[#0f172a]">{card.planName || "Plan"}</div>
                              <button
                                type="button"
                                className="mt-5 h-10 w-full rounded text-[14px] font-medium"
                                style={{ backgroundColor: customButtonColor || selectedTemplateTheme.buttonColor, color: selectedTemplateTheme.buttonTextColor }}
                              >
                                {card.buttonName || "SUBSCRIBE"}
                              </button>
                            </div>
                            <div className="flex items-center gap-2 border-t border-[#e5e7eb] bg-[#f8fafc] px-5 py-4 text-[14px] text-[#111827]">
                              <Check size={14} />
                              <span>{card.planFeatures || "-"}</span>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : tab === "configure-plans" ? (
            <div className="flex h-full w-full min-h-0">
              <div className="flex min-h-0 flex-1 items-start justify-center overflow-auto p-8">
                {configurePreviewPlan ? (
                  <div className="w-full max-w-[340px] overflow-hidden rounded-xl border border-[#d8deea] bg-white shadow-sm">
                    <div
                      className="border-b border-[#e5e7eb] px-5 py-3 text-center text-[22px] tracking-[0.15em]"
                      style={{ color: selectedTemplateTheme.titleColor }}
                    >
                      {configurePreviewPlan.name || "PREVIEW"}
                    </div>
                    <div className="px-5 py-10 text-center">
                      {selectedTemplateTheme.illustration ? (
                        <div className="mb-6 flex justify-center">
                          <div className="rounded-md border border-[#e5e7eb] bg-white p-3">
                            <Building2 size={42} className="text-[#7a52b3]" />
                          </div>
                        </div>
                      ) : null}
                      <div className="text-[58px] font-medium text-[#0f172a]">{formatPrice(configurePreviewPlan.price || 0)}</div>
                      <p className="mt-2 text-[16px] text-[#111827]">{formatBilledText(configurePreviewPlan.billingLabel || "")}</p>
                      <button
                        type="button"
                        className="mt-5 h-10 w-full rounded text-[14px] font-medium"
                        style={{ backgroundColor: customButtonColor || selectedTemplateTheme.buttonColor, color: selectedTemplateTheme.buttonTextColor }}
                      >
                        SUBSCRIBE
                      </button>
                    </div>
                    <div className="flex items-center gap-2 border-t border-[#e5e7eb] bg-[#f8fafc] px-5 py-4 text-[14px] text-[#111827]">
                      <Check size={14} />
                      <span>{configurePreviewPlan.code || "-"}</span>
                      <span className="rounded bg-[#1e2a4a] px-1.5 py-0.5 text-[11px] text-white">New</span>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-md border border-[#d8deea] bg-white px-6 py-5 text-[14px] text-[#64748b]">
                    No plan selected to preview.
                  </div>
                )}
              </div>

              {!isPreviewMode && isAssociateCurrenciesOpen ? (
                <aside className="flex h-full w-[380px] min-w-[380px] flex-col border-l border-[#d8deea] bg-white">
                  <div className="flex items-center justify-between border-b border-[#e5e7eb] px-5 py-4">
                    <h3 className="flex items-center gap-1 text-[18px] font-medium text-[#111827]">
                      <span>Associate Currencies</span>
                      <HelpCircle size={14} className="text-[#64748b]" />
                    </h3>
                    <button type="button" onClick={closeAssociateCurrenciesPanel} className="text-[#64748b] hover:text-[#334155]">
                      <X size={18} />
                    </button>
                  </div>

                  <div className="border-b border-[#e5e7eb] bg-[#f8fafc] px-4 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#dbeafe] text-[#3b6cb8]">
                          <Gift size={20} />
                        </div>
                        <div>
                          <div className="text-[16px] text-[#111827]">{associateCurrenciesPlan?.name || "-"}</div>
                          <div className="text-[13px] text-[#64748b]">Plan Code: {associateCurrenciesPlan?.code || "-"}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[16px] text-[#111827]">{formatPrice(associateCurrenciesPlan?.price || 0)}</div>
                        <div className="text-[13px] text-[#64748b]">per month</div>
                      </div>
                    </div>

                    {isCurrenciesDetailsExpanded ? (
                      <div className="mt-3 border-t border-[#e5e7eb] pt-3">
                        <div className="text-[14px] text-[#64748b]">Billing Cycles</div>
                        <div className="mt-1 text-[30px] leading-none text-[#111827]">∞</div>
                      </div>
                    ) : null}

                    <div className="mt-2 flex justify-end">
                      <button
                        type="button"
                        onClick={() => setIsCurrenciesDetailsExpanded((prev) => !prev)}
                        className="inline-flex items-center gap-1 text-[13px] text-[#2563eb]"
                      >
                        {isCurrenciesDetailsExpanded ? "View Less" : "View More"}
                        {isCurrenciesDetailsExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                      </button>
                    </div>
                  </div>

                  <div className="border-b border-[#e5e7eb] px-4 py-3">
                    <div className="grid grid-cols-[24px_70px_1fr_1fr_1fr] items-center gap-2 text-[13px] font-medium tracking-[0.04em] text-[#64748b]">
                      <input
                        type="checkbox"
                        checked={currencyDraftRows.length > 0 && currencyDraftRows.every((row) => row.enabled)}
                        onChange={(event) =>
                          setCurrencyDraftRows((prev) => prev.map((row) => ({ ...row, enabled: event.target.checked })))
                        }
                        className="h-4 w-4 rounded border-[#cbd5e1]"
                      />
                      <span />
                      <span>PRICE LIST</span>
                      <span>HOSTED PAGE TEMPLATE</span>
                      <span>LOCATION</span>
                    </div>
                  </div>

                  <div className="flex-1 overflow-auto">
                    {currencyDraftRows.map((row) => (
                      <div
                        key={row.id}
                        className="grid grid-cols-[24px_70px_1fr_1fr_1fr] items-center gap-2 border-b border-[#e5e7eb] px-4 py-3 text-[14px] text-[#111827]"
                      >
                        <input
                          type="checkbox"
                          checked={row.enabled}
                          onChange={(event) =>
                            setCurrencyDraftRows((prev) =>
                              prev.map((item) => (item.id === row.id ? { ...item, enabled: event.target.checked } : item))
                            )
                          }
                          className="h-4 w-4 rounded border-[#cbd5e1]"
                        />
                        <span className="inline-flex w-fit rounded bg-[#1fb981] px-1.5 py-0.5 text-[12px] font-medium text-white">
                          {row.code}
                        </span>
                        <span>{row.priceList}</span>
                        <span>{row.template}</span>
                        <span>{row.location}</span>
                      </div>
                    ))}

                    {isAddCurrencyFormOpen ? (
                      <div className="mx-3 mt-3 rounded-md border border-[#e5e7eb] bg-[#f8fafc] p-3">
                        <div className="grid grid-cols-2 gap-2">
                          <select
                            value={currencyAddDraft.priceList}
                            onChange={(event) =>
                              setCurrencyAddDraft((prev) => ({
                                ...prev,
                                priceList: event.target.value,
                              }))
                            }
                            className="h-10 rounded-md border border-[#cfd5e3] bg-white px-3 text-[14px] text-[#475569] outline-none focus:border-[#3b82f6]"
                          >
                            <option value="">Select a Price List</option>
                            {PRICE_LIST_OPTIONS.map((item) => (
                              <option key={item} value={item}>
                                {item}
                              </option>
                            ))}
                          </select>
                          <select
                            value={currencyAddDraft.template}
                            onChange={(event) =>
                              setCurrencyAddDraft((prev) => ({
                                ...prev,
                                template: event.target.value,
                              }))
                            }
                            className="h-10 rounded-md border border-[#cfd5e3] bg-white px-3 text-[14px] text-[#475569] outline-none focus:border-[#3b82f6]"
                          >
                            <option value="">Select a Template</option>
                            {TEMPLATE_OPTIONS.map((item) => (
                              <option key={item} value={item}>
                                {item}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="relative mt-2 w-[48%] min-w-[180px]">
                          <button
                            type="button"
                            onClick={() => setIsLocationDropdownOpen((prev) => !prev)}
                            className="flex h-10 w-full items-center justify-between rounded-md border border-[#cfd5e3] bg-white px-3 text-[14px] text-[#475569]"
                          >
                            <span>{currencyAddDraft.location || "Select a location"}</span>
                            {isLocationDropdownOpen ? <ChevronUp size={16} className="text-[#64748b]" /> : <ChevronDown size={16} className="text-[#64748b]" />}
                          </button>

                          {isLocationDropdownOpen ? (
                            <div className="absolute left-0 right-0 top-[42px] z-30 overflow-hidden rounded-lg border border-[#d8deea] bg-white shadow-lg">
                              <div className="relative border-b border-[#e5e7eb] px-2 py-1.5">
                                <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
                                <input
                                  value={locationSearch}
                                  onChange={(event) => setLocationSearch(event.target.value)}
                                  placeholder="Search"
                                  className="h-8 w-full rounded-md border border-[#cfd5e3] pl-8 pr-2 text-[13px] outline-none focus:border-[#3b82f6]"
                                />
                              </div>
                              <div className="max-h-[180px] overflow-y-auto py-1">
                                {(filteredLocationOptions.length > 0 ? filteredLocationOptions : LOCATION_OPTIONS).map((item) => (
                                  <button
                                    key={item}
                                    type="button"
                                    onClick={() => {
                                      setCurrencyAddDraft((prev) => ({ ...prev, location: item }));
                                      setIsLocationDropdownOpen(false);
                                    }}
                                    className={`w-full px-3 py-2 text-left text-[14px] ${
                                      currencyAddDraft.location === item
                                        ? "bg-[#3b82f6] text-white"
                                        : "text-[#475569] hover:bg-[#f8fafc]"
                                    }`}
                                  >
                                    {item}
                                  </button>
                                ))}
                              </div>
                            </div>
                          ) : null}
                        </div>

                        <div className="mt-2 flex items-center gap-4 text-[14px]">
                          <button type="button" onClick={confirmAddCurrencyRow} className="inline-flex items-center gap-1 text-[#2563eb]">
                            <Check size={14} />
                            Add
                          </button>
                          <button type="button" onClick={cancelAddCurrencyForm} className="inline-flex items-center gap-1 text-[#ef4444]">
                            <X size={14} />
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={openAddCurrencyForm}
                        className="mt-3 inline-flex items-center gap-1 px-4 text-[14px] text-[#2563eb] hover:underline"
                      >
                        <PlusCircle size={14} />
                        Add Currency
                      </button>
                    )}
                  </div>

                  <div className="mt-auto flex items-center gap-3 border-t border-[#e5e7eb] px-4 py-3">
                    <button
                      type="button"
                      onClick={saveAssociateCurrencies}
                      className="cursor-pointer rounded-lg border-b-[4px] border-[#0D4A52] px-5 py-2 text-[14px] font-medium text-white transition-all hover:-translate-y-[1px] hover:border-b-[6px] hover:brightness-110 active:translate-y-[2px] active:border-b-[2px] active:brightness-90"
                      style={{ background: "linear-gradient(90deg, #156372 0%, #0D4A52 100%)" }}
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={closeAssociateCurrenciesPanel}
                      className="rounded border border-[#cfd5e3] bg-white px-5 py-2 text-[14px] text-[#334155]"
                    >
                      Cancel
                    </button>
                  </div>
                </aside>
              ) : !isPreviewMode && isAssociateAddonsOpen ? (
                <aside className="flex h-full w-[360px] min-w-[360px] flex-col border-l border-[#d8deea] bg-white">
                  <div className="flex items-center justify-between border-b border-[#e5e7eb] px-5 py-4">
                    <h3 className="text-[18px] font-medium text-[#111827]">Associate Addons</h3>
                    <button
                      type="button"
                      onClick={closeAssociateAddonsPanel}
                      className="flex h-8 w-8 items-center justify-center rounded border border-[#3b82f6] text-[#3b82f6]"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  <div className="border-b border-[#e5e7eb] bg-[#f8fafc] px-4 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#dbeafe] text-[#3b6cb8]">
                          <Gift size={20} />
                        </div>
                        <div>
                          <div className="text-[16px] text-[#111827]">{associateAddonsPlan?.name || "-"}</div>
                          <div className="text-[13px] text-[#64748b]">Plan Code: {associateAddonsPlan?.code || "-"}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[16px] text-[#111827]">{formatPrice(associateAddonsPlan?.price || 0)}</div>
                        <div className="text-[13px] text-[#64748b]">per month</div>
                        <button type="button" className="mt-1 inline-flex items-center gap-1 text-[13px] text-[#2563eb]">
                          View More
                          <ChevronDown size={12} />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-b border-[#e5e7eb] px-4 py-3 text-[13px] font-medium tracking-[0.04em] text-[#64748b]">
                    <label className="flex items-center gap-2">
                      <input type="checkbox" className="h-4 w-4 rounded border-[#cbd5e1]" />
                      <span>ADDON</span>
                    </label>
                    <span>QTY</span>
                  </div>

                  <div className="px-4 py-4 text-center text-[14px] leading-7 text-[#475569]">
                    You haven't configured any addons to be included in this product's Embed Widget.
                    <HelpCircle size={14} className="ml-1 inline-block text-[#94a3b8]" />
                  </div>

                  <div className="mt-auto flex items-center gap-3 border-t border-[#e5e7eb] px-4 py-3">
                    <button
                      type="button"
                      onClick={() => {
                        toast.success("Addon association saved");
                        closeAssociateAddonsPanel();
                      }}
                      className="cursor-pointer rounded-lg border-b-[4px] border-[#0D4A52] px-5 py-2 text-[14px] font-medium text-white transition-all hover:-translate-y-[1px] hover:border-b-[6px] hover:brightness-110 active:translate-y-[2px] active:border-b-[2px] active:brightness-90"
                      style={{ background: "linear-gradient(90deg, #156372 0%, #0D4A52 100%)" }}
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={closeAssociateAddonsPanel}
                      className="rounded border border-[#cfd5e3] bg-white px-5 py-2 text-[14px] text-[#334155]"
                    >
                      Cancel
                    </button>
                  </div>
                </aside>
              ) : null}
            </div>
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <div className="h-px w-24 bg-[#1e2a4a]" />
            </div>
          )}
          </section>
        )}
      </div>
    </div>
  );
}
