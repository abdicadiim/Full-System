import React, { useEffect, useMemo, useState } from "react";
import { Check, ChevronDown, ChevronLeft, ChevronUp, Eye, Gift, HelpCircle, PlusCircle, Settings, Upload, X } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";

const PRODUCTS_STORAGE_KEY = "inv_products_v1";
const PLANS_STORAGE_KEY = "inv_plans_v1";
const ADDONS_STORAGE_KEY = "inv_addons_v1";
const SUBSCRIBE_TARGET_URL = "https://taban.so/";

const readRows = (key: string) => {
  try {
    const raw = localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const getId = (row: any) => String(row?.id || row?._id || "");
const normalizeProduct = (value: unknown) => String(value || "").trim().toLowerCase();
const escapeJsString = (value: string) =>
  String(value || "")
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'");
const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);
const normalizeHex = (value: string) => {
  const cleaned = String(value || "").trim().replace(/^#/, "");
  if (!/^[0-9A-Fa-f]{6}$/.test(cleaned)) return null;
  return `#${cleaned.toUpperCase()}`;
};
const rgbToHex = (r: number, g: number, b: number) =>
  `#${[r, g, b].map((value) => clamp(Math.round(value), 0, 255).toString(16).padStart(2, "0")).join("").toUpperCase()}`;
const hexToRgb = (hex: string) => {
  const normalized = normalizeHex(hex);
  if (!normalized) return null;
  const raw = normalized.slice(1);
  return {
    r: parseInt(raw.slice(0, 2), 16),
    g: parseInt(raw.slice(2, 4), 16),
    b: parseInt(raw.slice(4, 6), 16),
  };
};
const rgbToHsv = (r: number, g: number, b: number) => {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;
  let h = 0;
  if (delta !== 0) {
    if (max === rn) h = ((gn - bn) / delta) % 6;
    else if (max === gn) h = (bn - rn) / delta + 2;
    else h = (rn - gn) / delta + 4;
  }
  h = Math.round(h * 60);
  if (h < 0) h += 360;
  const s = max === 0 ? 0 : (delta / max) * 100;
  const v = max * 100;
  return { h, s, v };
};
const hsvToRgb = (h: number, s: number, v: number) => {
  const hue = ((h % 360) + 360) % 360;
  const sat = clamp(s, 0, 100) / 100;
  const val = clamp(v, 0, 100) / 100;
  const c = val * sat;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = val - c;
  let rn = 0;
  let gn = 0;
  let bn = 0;
  if (hue < 60) {
    rn = c;
    gn = x;
  } else if (hue < 120) {
    rn = x;
    gn = c;
  } else if (hue < 180) {
    gn = c;
    bn = x;
  } else if (hue < 240) {
    gn = x;
    bn = c;
  } else if (hue < 300) {
    rn = x;
    bn = c;
  } else {
    rn = c;
    bn = x;
  }
  return {
    r: (rn + m) * 255,
    g: (gn + m) * 255,
    b: (bn + m) * 255,
  };
};
const hsvToHex = (h: number, s: number, v: number) => {
  const { r, g, b } = hsvToRgb(h, s, v);
  return rgbToHex(r, g, b);
};
const hexToHsv = (hex: string) => {
  const rgb = hexToRgb(hex);
  if (!rgb) return { h: 0, s: 0, v: 0 };
  return rgbToHsv(rgb.r, rgb.g, rgb.b);
};

const BUTTON_STYLES = [
  { id: "button_1", name: "Button 1", color: "#6f50b7", fill: false, rounded: false },
  { id: "button_2", name: "Button 2", color: "#6f50b7", fill: true, rounded: false },
  { id: "button_3", name: "Button 3", color: "#f0a021", fill: false, rounded: false },
  { id: "button_4", name: "Button 4", color: "#f0a021", fill: true, rounded: false },
  { id: "button_5", name: "Button 5", color: "#29b856", fill: false, rounded: false },
  { id: "button_6", name: "Button 6", color: "#29b856", fill: true, rounded: false },
  { id: "button_7", name: "Button 7", color: "#ff7a59", fill: false, rounded: false },
  { id: "button_8", name: "Button 8", color: "#ff7a59", fill: true, rounded: false },
  { id: "button_9", name: "Button 9", color: "#f54b73", fill: false, rounded: true },
  { id: "button_10", name: "Button 10", color: "#f54b73", fill: true, rounded: true },
  { id: "button_11", name: "Button 11", color: "#4d86f3", fill: false, rounded: true },
  { id: "button_12", name: "Button 12", color: "#4d86f3", fill: true, rounded: true },
] as const;

export default function ConfigureCheckoutButton() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const productId = searchParams.get("productId") || "";

  const [products, setProducts] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [addons, setAddons] = useState<any[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [selectedAddonIds, setSelectedAddonIds] = useState<string[]>([]);
  const [buttonLabel, setButtonLabel] = useState("Subscribe");
  const [selectedStyleId, setSelectedStyleId] = useState<(typeof BUTTON_STYLES)[number]["id"]>("button_12");
  const [buttonColor, setButtonColor] = useState("#4D86F3");
  const [draftColor, setDraftColor] = useState("#4D86F3");
  const [pickerHsv, setPickerHsv] = useState(() => hexToHsv("#4D86F3"));
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
  const [isSourceCodeOpen, setIsSourceCodeOpen] = useState(false);
  const [sourceCode, setSourceCode] = useState("");
  const [isAddonPanelOpen, setIsAddonPanelOpen] = useState(false);
  const [addonDraftIds, setAddonDraftIds] = useState<string[]>([]);
  const [isAddonDetailsExpanded, setIsAddonDetailsExpanded] = useState(false);
  const [isStyleSelectorOpen, setIsStyleSelectorOpen] = useState(false);

  useEffect(() => {
    const load = () => {
      setProducts(readRows(PRODUCTS_STORAGE_KEY));
      setPlans(readRows(PLANS_STORAGE_KEY));
      setAddons(readRows(ADDONS_STORAGE_KEY));
    };
    load();
    const onStorage = () => load();
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const selectedProduct = useMemo(
    () => products.find((row) => getId(row) === productId) || null,
    [products, productId]
  );

  const selectedProductName = String(selectedProduct?.name || "").trim();

  const productPlans = useMemo(() => {
    const key = normalizeProduct(selectedProductName);
    if (!key) return [];
    return plans.filter((row) => normalizeProduct(row?.product) === key);
  }, [plans, selectedProductName]);

  const productAddons = useMemo(() => {
    const key = normalizeProduct(selectedProductName);
    if (!key) return [];
    return addons.filter((row) => normalizeProduct(row?.product) === key);
  }, [addons, selectedProductName]);

  useEffect(() => {
    if (productPlans.length === 0) {
      setSelectedPlanId("");
      return;
    }
    setSelectedPlanId((prev) => {
      if (prev && productPlans.some((plan) => getId(plan) === prev)) return prev;
      return getId(productPlans[0]);
    });
  }, [productPlans]);

  useEffect(() => {
    setSelectedAddonIds((prev) => prev.filter((id) => productAddons.some((addon) => getId(addon) === id)));
  }, [productAddons]);

  const selectedPlan = useMemo(
    () => productPlans.find((plan) => getId(plan) === selectedPlanId) || null,
    [productPlans, selectedPlanId]
  );

  const selectedAddonNames = useMemo(
    () =>
      selectedAddonIds
        .map((id) => productAddons.find((addon) => getId(addon) === id))
        .filter(Boolean)
        .map((row: any) => String(row?.addonName || row?.name || "-")),
    [selectedAddonIds, productAddons]
  );
  const selectedStyle = useMemo(
    () => BUTTON_STYLES.find((row) => row.id === selectedStyleId) || BUTTON_STYLES[0],
    [selectedStyleId]
  );
  const selectedPlanTitle = String(selectedPlan?.planName || selectedPlan?.plan || "-");
  const selectedPlanCode = String(selectedPlan?.planCode || selectedPlan?.plan || "-");
  const selectedPlanPrice = String(selectedPlan?.price || selectedPlan?.amount || "0.00");
  const selectedPlanPeriod = String(selectedPlan?.frequency || selectedPlan?.billingFrequency || "month").toLowerCase();
  const selectedPlanBillingCycles = String(
    selectedPlan?.billingCycles ||
      selectedPlan?.billingCycle ||
      selectedPlan?.cycles ||
      selectedPlan?.billingCycleCount ||
      ""
  ).trim();
  const billingCyclesDisplay = selectedPlanBillingCycles || "∞";
  const allAddonsDraftSelected = productAddons.length > 0 && productAddons.every((addon) => addonDraftIds.includes(getId(addon)));

  const checkoutUrl = SUBSCRIBE_TARGET_URL;
  const generatedSourceCode = `<div id="zf-widget-root-id"></div>
<script type="text/javascript" src="https://js.zohostatic.com/books/v1/zf-widget.js"></script>
<script>
var buttonOptions = {
  id: 'zf-widget-root-id',
  template: '${selectedStyle.id}',
  product_id: '${escapeJsString(getId(selectedProduct))}',
  plan_code: '${escapeJsString(String(selectedPlan?.planCode || selectedPlan?.plan || selectedPlanId || ""))}',
  addons: [${selectedAddonIds.map((id) => `'${escapeJsString(id)}'`).join(", ")}],
  theme: {
    color: '${escapeJsString(buttonColor)}'
  },
  button_text: '${escapeJsString(buttonLabel || "Subscribe")}',
  product_url: '${escapeJsString(checkoutUrl)}'
};
ZFWidget.init('zf-subscribe-button', buttonOptions);
</script>`;

  useEffect(() => {
    setSourceCode(generatedSourceCode);
  }, [generatedSourceCode]);
  useEffect(() => {
    if (!isAddonPanelOpen) return;
    setAddonDraftIds(selectedAddonIds);
    setIsAddonDetailsExpanded(false);
  }, [isAddonPanelOpen, selectedAddonIds]);
  useEffect(() => {
    if (isColorPickerOpen) return;
    const normalized = normalizeHex(buttonColor);
    if (!normalized) return;
    setDraftColor(normalized);
    setPickerHsv(hexToHsv(normalized));
  }, [buttonColor, isColorPickerOpen]);

  const previewStyle: React.CSSProperties = {
    borderColor: buttonColor,
    color: selectedStyle.fill ? "#ffffff" : buttonColor,
    backgroundColor: selectedStyle.fill ? buttonColor : "#ffffff",
    borderRadius: selectedStyle.rounded ? 999 : 4,
  };
  const hueColor = useMemo(() => hsvToHex(pickerHsv.h, 100, 100), [pickerHsv.h]);

  const openColorPicker = () => {
    const normalized = normalizeHex(buttonColor) || "#4D86F3";
    setDraftColor(normalized);
    setPickerHsv(hexToHsv(normalized));
    setIsColorPickerOpen(true);
  };
  const closeColorPicker = () => setIsColorPickerOpen(false);
  const applyColorPicker = () => {
    const valid = normalizeHex(draftColor) || hsvToHex(pickerHsv.h, pickerHsv.s, pickerHsv.v);
    setButtonColor(valid);
    setDraftColor(valid);
    setPickerHsv(hexToHsv(valid));
    setIsColorPickerOpen(false);
  };
  const updateSvFromPointer = (event: React.PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = clamp(event.clientX - rect.left, 0, rect.width);
    const y = clamp(event.clientY - rect.top, 0, rect.height);
    const next = { ...pickerHsv, s: (x / rect.width) * 100, v: 100 - (y / rect.height) * 100 };
    const nextHex = hsvToHex(next.h, next.s, next.v);
    event.currentTarget.setPointerCapture(event.pointerId);
    setPickerHsv(next);
    setDraftColor(nextHex);
  };

  const closePage = () => {
    if (selectedProduct) {
      navigate(`/products/products/${getId(selectedProduct)}`);
      return;
    }
    navigate("/products/plans?tab=products");
  };

  return (
    <div className="min-h-screen bg-[#f3f4f8]">
      <div className="flex items-center justify-between border-b border-[#d8deea] bg-white px-4 py-3">
        <h1 className="text-[34px] font-medium text-[#111827]">Checkout Button</h1>
        <div className="flex items-center gap-5">
          <button
            type="button"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(sourceCode || generatedSourceCode);
                toast.success("Checkout button code copied");
              } catch {
                toast.error("Could not copy code");
              }
            }}
            className="rounded-md border border-[#0f9f6e] bg-[#1faa74] px-4 py-1.5 text-[14px] font-medium text-white hover:opacity-90"
          >
            Copy Code
          </button>
          <button
            type="button"
            onClick={() => setIsSourceCodeOpen(true)}
            className="text-[14px] text-[#4f46e5] hover:text-[#3730a3]"
          >
            Source Code
          </button>
          <button type="button" onClick={closePage} className="text-[#6b7280] hover:text-[#374151]">
            <X size={20} />
          </button>
        </div>
      </div>

      {isStyleSelectorOpen ? (
        <div className="mx-auto w-full max-w-[760px] px-8 py-10">
          <button
            type="button"
            onClick={() => setIsStyleSelectorOpen(false)}
            className="mb-3 inline-flex items-center gap-1 text-[14px] text-[#2563eb]"
          >
            <ChevronLeft size={16} />
            Back
          </button>
          <h2 className="mb-8 text-[32px] font-medium text-[#111827]">Select a button type</h2>
          <div className="grid grid-cols-4 gap-x-10 gap-y-10">
            {BUTTON_STYLES.map((styleOption) => {
              const active = selectedStyleId === styleOption.id;
              return (
                <button
                  key={styleOption.id}
                  type="button"
                  onClick={() => {
                    setSelectedStyleId(styleOption.id);
                    setButtonColor(styleOption.color.toUpperCase());
                    setIsStyleSelectorOpen(false);
                  }}
                  className="relative text-left"
                >
                  <span
                    style={{
                      borderColor: styleOption.color,
                      backgroundColor: styleOption.fill ? styleOption.color : "#ffffff",
                      color: styleOption.fill ? "#ffffff" : styleOption.color,
                      borderRadius: styleOption.rounded ? 999 : 3,
                    }}
                    className="inline-flex h-10 w-[126px] items-center justify-center border text-[14px] font-semibold"
                  >
                    Pay now
                  </span>
                  {active ? (
                    <span className="absolute -right-4 top-0 text-[#29b856]">
                      <Check size={18} />
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="mx-auto w-full max-w-[1320px] p-6">
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_420px]">
            <div className="rounded-lg border border-[#d8deea] bg-white">
              <div className="grid grid-cols-1 xl:grid-cols-2">
                <section className="border-b border-[#d8deea] p-5 xl:border-b-0 xl:border-r">
                  <div className="mb-5 flex items-center gap-2 text-[14px] font-semibold uppercase tracking-wide text-[#6b728f]">
                    <Upload size={15} />
                    Customize Button
                  </div>

                  <div className="space-y-5">
                    <div>
                      <label className="mb-2 block text-[14px] text-[#334155]">Button Style</label>
                      <div className="flex items-center justify-between border-l-2 border-[#3b82f6] bg-[#f8fafc] px-3 py-2">
                        <span className="text-[14px] text-[#334155]">{selectedStyle.name}</span>
                        <button
                          type="button"
                          onClick={() => setIsStyleSelectorOpen(true)}
                          className="text-[14px] text-[#2563eb]"
                        >
                          Change
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="mb-2 block text-[14px] text-[#334155]">Button Label</label>
                      <input
                        value={buttonLabel}
                        onChange={(e) => setButtonLabel(e.target.value)}
                        className="h-10 w-full rounded border border-[#cfd5e3] px-3 text-[14px] text-[#334155] outline-none focus:border-[#3b82f6]"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-[14px] text-[#334155]">Button Color</label>
                      <div className="relative grid grid-cols-[1fr_28px]">
                        <input
                          value={buttonColor}
                          onChange={(e) => setButtonColor(e.target.value.toUpperCase())}
                          className="h-10 rounded-l border border-r-0 border-[#cfd5e3] px-3 text-[14px] text-[#334155] outline-none focus:border-[#3b82f6]"
                        />
                        <button
                          type="button"
                          onClick={openColorPicker}
                          style={{ backgroundColor: buttonColor }}
                          className="h-10 w-full rounded-r border border-[#cfd5e3]"
                          aria-label="Open color picker"
                        />
                        {isColorPickerOpen ? (
                          <div className="absolute right-0 top-[44px] z-[215] w-[320px] rounded-lg border border-[#d8deea] bg-white shadow-xl">
                            <div className="p-3">
                              <div
                                onPointerDown={updateSvFromPointer}
                                onPointerMove={(event) => {
                                  if ((event.buttons & 1) === 0) return;
                                  updateSvFromPointer(event);
                                }}
                                className="relative h-[120px] w-full cursor-crosshair overflow-hidden rounded"
                                style={{ backgroundColor: hueColor }}
                              >
                                <div className="absolute inset-0 bg-gradient-to-r from-white to-transparent" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent" />
                                <span
                                  className="pointer-events-none absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow"
                                  style={{ left: `${pickerHsv.s}%`, top: `${100 - pickerHsv.v}%` }}
                                />
                              </div>
                              <input
                                type="range"
                                min={0}
                                max={360}
                                value={pickerHsv.h}
                                onChange={(e) => {
                                  const next = { ...pickerHsv, h: Number(e.target.value) };
                                  const nextHex = hsvToHex(next.h, next.s, next.v);
                                  setPickerHsv(next);
                                  setDraftColor(nextHex);
                                }}
                                className="mt-3 h-2 w-full cursor-pointer appearance-none rounded-lg"
                                style={{
                                  background:
                                    "linear-gradient(90deg,#ff0000,#ffff00,#00ff00,#00ffff,#0000ff,#ff00ff,#ff0000)",
                                }}
                              />
                              <div className="mt-3 grid grid-cols-[1fr_52px] gap-2">
                                <input
                                  value={draftColor}
                                  onChange={(e) => {
                                    const nextRaw = e.target.value.toUpperCase();
                                    setDraftColor(nextRaw);
                                    const normalized = normalizeHex(nextRaw);
                                    if (normalized) setPickerHsv(hexToHsv(normalized));
                                  }}
                                  className="h-8 rounded border border-[#3b82f6] px-2 text-[13px] text-[#334155] outline-none"
                                />
                                <span
                                  style={{ backgroundColor: draftColor }}
                                  className="block h-8 rounded border border-[#cfd5e3]"
                                />
                              </div>
                              <div className="mt-3 flex flex-wrap items-center gap-2">
                                {["#6F50B7", "#F0A021", "#29B856", "#FF7A59", "#F54B73", "#4D86F3", "#1FAA74"].map((swatch) => (
                                  <button
                                    key={swatch}
                                    type="button"
                                    onClick={() => {
                                      setDraftColor(swatch);
                                      setPickerHsv(hexToHsv(swatch));
                                    }}
                                    title={swatch}
                                    className="h-5 w-5 rounded-full border border-[#d1d5db]"
                                    style={{ backgroundColor: swatch }}
                                  />
                                ))}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 border-t border-[#e5e7eb] px-3 py-3">
                              <button
                                type="button"
                                onClick={applyColorPicker}
                                className="rounded bg-[#1faa74] px-3 py-1.5 text-[13px] font-medium text-white"
                              >
                                Apply
                              </button>
                              <button
                                type="button"
                                onClick={closeColorPicker}
                                className="rounded border border-[#cfd5e3] px-3 py-1.5 text-[13px] text-[#334155]"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </section>

                <section className="p-5">
                  <div className="mb-5 flex items-center gap-2 text-[14px] font-semibold uppercase tracking-wide text-[#6b728f]">
                    <Settings size={15} />
                    Configure Plans
                  </div>

                  <div className="space-y-5">
                    <div>
                      <label className="mb-2 block text-[14px] text-[#334155]">Plan</label>
                      <select
                        value={selectedPlanId}
                        onChange={(e) => setSelectedPlanId(e.target.value)}
                        className="h-10 w-full rounded border border-[#cfd5e3] bg-white px-3 text-[14px] text-[#334155] outline-none focus:border-[#3b82f6]"
                      >
                        {productPlans.length === 0 ? (
                          <option value="">No plans available</option>
                        ) : (
                          productPlans.map((plan) => (
                            <option key={getId(plan)} value={getId(plan)}>
                              {String(plan?.planName || plan?.plan || "-")}
                            </option>
                          ))
                        )}
                      </select>
                    </div>

                    <div>
                      <label className="mb-2 block text-[14px] text-[#334155]">Addons</label>
                      <div className="rounded border border-[#e5e7eb] bg-[#f8fafc] px-3 py-4 text-center text-[14px] text-[#334155]">
                        {selectedAddonNames.length > 0 ? selectedAddonNames.join(", ") : "No Addons Associated"}
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsAddonPanelOpen(true)}
                        className="mt-3 inline-flex items-center gap-1 text-[14px] text-[#2563eb] hover:underline"
                      >
                        <PlusCircle size={14} />
                        Click to associate addons
                      </button>
                    </div>
                  </div>
                </section>
              </div>
            </div>

            <section className="rounded-lg border border-[#d8deea] bg-white">
              <div className="flex items-center gap-2 border-b border-[#d8deea] px-4 py-3 text-[14px] font-semibold uppercase tracking-wide text-[#6b728f]">
                <Eye size={15} />
                Preview
              </div>
              <div className="flex h-[345px] items-start justify-center p-6">
                <button
                  type="button"
                  onClick={() => window.open(SUBSCRIBE_TARGET_URL, "_blank", "noopener,noreferrer")}
                  style={previewStyle}
                  className="border px-7 py-1.5 text-[22px]"
                >
                  {buttonLabel || "Subscribe"}
                </button>
              </div>
            </section>
          </div>
        </div>
      )}

      {isAddonPanelOpen ? (
        <>
          <button
            type="button"
            aria-label="Close associate addons panel"
            className="fixed inset-0 z-[204] bg-[rgba(15,23,42,0.08)]"
            onClick={() => setIsAddonPanelOpen(false)}
          />
          <aside className="fixed right-0 top-0 z-[205] h-screen w-[430px] border-l border-[#d8deea] bg-white shadow-[-12px_0_24px_rgba(15,23,42,0.18)]">
            <div className="flex items-center justify-between border-b border-[#e5e7eb] px-5 py-4">
              <h3 className="text-[32px] font-medium text-[#1f2937]">Associate Addons</h3>
              <button
                type="button"
                onClick={() => setIsAddonPanelOpen(false)}
                className="rounded border border-[#2563eb] p-0.5 text-[#64748b] hover:text-[#334155]"
                aria-label="Close associate addons panel"
              >
                <X size={22} />
              </button>
            </div>

            <div className="flex h-[calc(100%-77px)] flex-col">
              <div className="flex-1 overflow-y-auto p-4">
                <div className="rounded border border-[#e5e7eb] bg-[#f8fafc] p-3">
                  <div className="flex items-start gap-3">
                    <div className="mt-1 rounded bg-[#e0ebff] p-2 text-[#4d86f3]">
                      <Gift size={16} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[15px] font-medium text-[#1f2937]">{selectedPlanTitle}</div>
                      <div className="text-[14px] text-[#64748b]">Plan Code: {selectedPlanCode}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[15px] font-medium text-[#1f2937]">AMD{selectedPlanPrice}</div>
                      <div className="text-[14px] text-[#64748b]">per {selectedPlanPeriod}</div>
                    </div>
                  </div>

                  <div className="mt-3 border-t border-[#e5e7eb] pt-3">
                    {isAddonDetailsExpanded ? (
                      <>
                        <div className="text-[14px] text-[#64748b]">Billing Cycles</div>
                        <div className="text-[35px] leading-none text-[#111827]">{billingCyclesDisplay}</div>
                      </>
                    ) : null}
                    <div className="mt-2 flex justify-end">
                      <button
                        type="button"
                        onClick={() => setIsAddonDetailsExpanded((prev) => !prev)}
                        className="inline-flex items-center gap-1 text-[14px] text-[#2563eb]"
                      >
                        {isAddonDetailsExpanded ? "View Less" : "View More"}
                        {isAddonDetailsExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="mt-4 rounded border border-[#e5e7eb]">
                  <div className="grid grid-cols-[26px_1fr_56px] items-center border-b border-[#e5e7eb] px-4 py-2 text-[13px] font-semibold uppercase tracking-wide text-[#64748b]">
                    <input
                      type="checkbox"
                      checked={allAddonsDraftSelected}
                      onChange={(e) =>
                        setAddonDraftIds(e.target.checked ? productAddons.map((row) => getId(row)) : [])
                      }
                    />
                    <span>Addon</span>
                    <span className="text-right">Qty</span>
                  </div>

                  {productAddons.length === 0 ? (
                    <p className="px-5 py-5 text-center text-[14px] text-[#64748b]">
                      You haven&apos;t configured any addons to be included in this product&apos;s Embed Widget.{" "}
                      <HelpCircle className="inline" size={14} />
                    </p>
                  ) : (
                    <div className="max-h-[420px] overflow-y-auto">
                      {productAddons.map((addon) => {
                        const id = getId(addon);
                        const checked = addonDraftIds.includes(id);
                        return (
                          <label
                            key={id}
                            className="grid grid-cols-[26px_1fr_56px] items-center border-b border-[#eef2f7] px-4 py-3 text-[14px] text-[#334155]"
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) =>
                                setAddonDraftIds((prev) =>
                                  e.target.checked ? [...prev, id] : prev.filter((rowId) => rowId !== id)
                                )
                              }
                            />
                            <span className="truncate">{String(addon?.addonName || addon?.name || "-")}</span>
                            <span className="text-right text-[#64748b]">{String(addon?.qty || 1)}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3 border-t border-[#e5e7eb] px-5 py-4">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedAddonIds(addonDraftIds);
                    setIsAddonPanelOpen(false);
                  }}
                  className="rounded bg-[#1faa74] px-4 py-2 text-[14px] font-medium text-white"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddonPanelOpen(false)}
                  className="rounded border border-[#cfd5e3] px-4 py-2 text-[14px] text-[#334155]"
                >
                  Cancel
                </button>
              </div>
            </div>
          </aside>
        </>
      ) : null}

      {isSourceCodeOpen ? (
        <aside className="fixed right-0 top-0 z-[210] h-screen w-[360px] border-l border-[#30365e] bg-[#1e2140] text-[#d8ddff] shadow-[-12px_0_24px_rgba(15,23,42,0.35)]">
          <div className="flex items-center justify-between border-b border-[#30365e] px-4 py-3">
            <button
              type="button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(sourceCode);
                  toast.success("Checkout button code copied");
                } catch {
                  toast.error("Could not copy code");
                }
              }}
              className="text-sm font-medium text-[#ffffff]"
            >
              Copy Code from here
            </button>
            <button
              type="button"
              onClick={() => setIsSourceCodeOpen(false)}
              className="text-[#9ca3d9] transition-colors hover:text-[#ffffff]"
              aria-label="Close source code panel"
            >
              <X size={18} />
            </button>
          </div>
          <div className="h-[calc(100%-57px)] p-3">
            <textarea
              spellCheck={false}
              value={sourceCode}
              onChange={(e) => setSourceCode(e.target.value)}
              className="h-full w-full resize-none rounded border border-[#2d3359] bg-[#1f2344] p-3 font-mono text-[12px] leading-6 text-[#d8ddff] outline-none focus:border-[#46508f]"
            />
          </div>
        </aside>
      ) : null}
    </div>
  );
}
