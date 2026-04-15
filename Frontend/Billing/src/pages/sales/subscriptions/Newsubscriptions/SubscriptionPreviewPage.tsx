import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { Check, ChevronDown, Search } from "lucide-react";
import { creditNotesAPI, invoicesAPI, paymentsReceivedAPI, subscriptionsAPI, transactionNumberSeriesAPI } from "../../../../services/api";
import { buildSubscriptionEditDraft } from "../subscriptionDraftUtils";

type PreviewState = {
  currency?: string;
  customerId?: string;
  subscriptionNumber?: string;
  productId?: string;
  productName?: string;
  planName?: string;
  quantity?: number;
  price?: number;
  tax?: string;
  taxRate?: number;
  startDate?: string;
  coupon?: string;
  couponCode?: string;
  couponValue?: string;
  manualRenewal?: boolean;
  manualRenewalInvoicePreference?: string;
  manualRenewalFreeExtension?: string;
  advanceBillingEnabled?: boolean;
  advanceBillingMethod?: string;
  advanceBillingPeriodDays?: number;
  advanceBillingAutoGenerate?: boolean;
  advanceBillingApplyUpcomingTerms?: boolean;
  invoicePreference?: string;
  usageBillingEnabled?: boolean;
  prepaidBillingEnabled?: boolean;
  prepaidPlanName?: string;
  drawdownCreditName?: string;
  drawdownRate?: string;
  consolidatedBillingEnabled?: boolean;
  calendarBillingMode?: string;
  calendarBillingDays?: string;
  calendarBillingMonths?: string;
  paymentReceived?: boolean;
  amountReceived?: number;
  paymentStatus?: string;
  applyChanges?: "immediately" | "end_of_term" | "scheduled";
  applyChangesDate?: string;
  backdatedGenerateInvoice?: boolean;
  addons?: Array<{
    name: string;
    quantity: number;
    rate: number;
    tax?: string;
    taxRate?: number;
  }>;
};

const formatMoney = (value: number, currency: string) => {
  const safe = Number.isFinite(value) ? value : 0;
  return `${currency}${safe.toFixed(2)}`;
};

const addMonths = (value?: string, months: number = 1) => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  const next = new Date(d);
  next.setMonth(next.getMonth() + months);
  return next.toISOString().split("T")[0];
};

const formatShortDate = (value?: string) => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
};

const alignNextBillingDate = (startDate?: string) => {
  if (!startDate) return "";
  let next = addMonths(startDate, 1);
  if (!next) return "";
  const today = new Date();
  let nextDate = new Date(next);
  while (!Number.isNaN(nextDate.getTime()) && nextDate.getTime() <= today.getTime()) {
    next = addMonths(next, 1);
    nextDate = new Date(next);
  }
  return next;
};

const parseCouponDiscount = (rawValue: string | undefined, baseAmount: number) => {
  const raw = String(rawValue || "").trim();
  if (!raw) return 0;
  const percentMatch = raw.match(/(-?\d+(\.\d+)?)\s*%/);
  if (percentMatch) {
    const pct = Number(percentMatch[1]) || 0;
    return (baseAmount * pct) / 100;
  }
  const numeric = Number(raw.replace(/[^\d.-]/g, ""));
  return Number.isFinite(numeric) ? numeric : 0;
};

const normalizeLifecycleStatus = (value: any) => {
  const raw = String(value || "").toUpperCase().trim();
  if (!raw) return "LIVE";
  if (["PAUSED", "CANCELLED", "CANCELED", "EXPIRED", "DRAFT"].includes(raw)) return raw;
  return "LIVE";
};

const formatDateLabel = (value?: string) => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
};

const addMonthsDate = (value?: string, months: number = 1) => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  const next = new Date(d);
  next.setMonth(next.getMonth() + months);
  return next.toISOString().split("T")[0];
};

type SelectOption = {
  value: string;
  label?: string;
  bold?: boolean;
  type?: "option" | "header";
};

const SearchSelect = ({
  value,
  options,
  onChange,
  placeholder,
}: {
  value: string;
  options: SelectOption[];
  onChange: (next: string) => void;
  placeholder?: string;
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [openUpward, setOpenUpward] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (!open) return;
    const el = wrapperRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const desiredHeight = 280;
    if (spaceBelow < desiredHeight && spaceAbove > spaceBelow) {
      setOpenUpward(true);
    } else {
      setOpenUpward(false);
    }
  }, [open]);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return options;
    return options.filter((opt) => {
      if (opt.type === "header") return String(opt.label ?? opt.value).toLowerCase().includes(term);
      return String(opt.label ?? opt.value).toLowerCase().includes(term);
    });
  }, [options, query]);

  const selectedLabel = options.find((opt) => opt.value === value)?.label ?? value;

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-[13px] text-slate-700 focus:border-blue-500 focus:outline-none flex items-center justify-between"
      >
        <span className={value ? "text-slate-700" : "text-slate-400"}>
          {value ? selectedLabel : placeholder || "Select"}
        </span>
        <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div
          className={`absolute z-20 w-full rounded-md border border-slate-200 bg-white shadow-lg ${
            openUpward ? "bottom-full mb-2" : "mt-2"
          }`}
        >
          <div className="p-2">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search"
                className="h-9 w-full rounded-md border border-slate-200 bg-white pl-8 pr-2 text-[12px] text-slate-700 focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>
          <div className="max-h-56 overflow-auto py-1">
            {filtered.length === 0 && (
              <div className="px-3 py-2 text-[12px] text-slate-400">No results</div>
            )}
            {filtered.map((opt) => {
              const isSelected = value === opt.value;
              if (opt.type === "header") {
                return (
                  <div
                    key={`header-${opt.value}`}
                    className="px-3 py-2 text-[12px] font-semibold text-slate-700"
                  >
                    {opt.label ?? opt.value}
                  </div>
                );
              }
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                    setQuery("");
                  }}
                  className={`w-full px-3 py-2 text-left text-[13px] flex items-center justify-between ${
                    isSelected ? "bg-blue-500 text-white" : "text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <span>{opt.label ?? opt.value}</span>
                  {isSelected && <Check className="h-4 w-4 text-white" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

const SubscriptionPreviewPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state || {}) as PreviewState;
  const readDraftFromSession = () => {
    try {
      const raw = sessionStorage.getItem("taban_subscription_draft_v1");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  };
  const draftSnapshot = useMemo(() => readDraftFromSession(), []);
  const isQuoteConversionDraft =
    String(draftSnapshot?.sourceType || "").trim().toLowerCase() === "quote" &&
    !String(draftSnapshot?.id || "").trim();
  const currency = state.currency || "USD";
  const quantity = Number(state.quantity || 0) || 0;
  const price = Number(state.price || 0) || 0;
  const taxRate = Number(state.taxRate || 0) || 0;
  const [creditNotes, setCreditNotes] = useState<any[]>([]);

  const recurringStartDate = addMonths(state.startDate, 1);

  const lineItems = useMemo(() => {
    const items: Array<{ label: string; quantity: number; rate: number; taxRate: number }> = [];
    if (state.planName && state.planName !== "Select a Plan") {
      items.push({
        label: state.planName,
        quantity,
        rate: price,
        taxRate,
      });
    }
    const addonList = Array.isArray(state.addons) ? state.addons : [];
    addonList.forEach((addon) => {
      if (!addon?.name) return;
      items.push({
        label: addon.name,
        quantity: Number(addon.quantity || 0) || 0,
        rate: Number(addon.rate || 0) || 0,
        taxRate: Number(addon.taxRate || 0) || 0,
      });
    });
    return items;
  }, [state.planName, quantity, price, taxRate, state.addons]);

  useEffect(() => {
    let active = true;
    const customerId = String(state.customerId || "").trim();
    if (!customerId) {
      setCreditNotes([]);
      return () => {
        active = false;
      };
    }
    (async () => {
      try {
        const response = await creditNotesAPI.getByCustomer(customerId, { limit: 10000 });
        if (!active) return;
        setCreditNotes(Array.isArray(response?.data) ? response.data : []);
      } catch {
        if (!active) return;
        setCreditNotes([]);
      }
    })();
    return () => {
      active = false;
    };
  }, [state.customerId]);

  const subtotal = useMemo(
    () => lineItems.reduce((sum, item) => sum + item.quantity * item.rate, 0),
    [lineItems]
  );
  const taxAmount = useMemo(
    () =>
      lineItems.reduce((sum, item) => {
        const ratePct = Number(item.taxRate || 0) || 0;
        if (!ratePct) return sum;
        return sum + (item.quantity * item.rate * ratePct) / 100;
      }, 0),
    [lineItems]
  );
  const discountAmount = useMemo(() => parseCouponDiscount(state.couponValue, subtotal), [state.couponValue, subtotal]);
  const preCreditImmediate = useMemo(
    () => Math.max(subtotal + taxAmount - discountAmount, 0),
    [subtotal, taxAmount, discountAmount]
  );
  const creditAvailable = useMemo(() => {
    if (!creditNotes.length) return 0;
    return creditNotes.reduce((sum, note) => {
      const total = Number(note?.total ?? note?.amount ?? 0) || 0;
      const balanceCandidate =
        note?.balance ??
        note?.unusedCredits ??
        note?.unused_credits ??
        (total - (Number(note?.amountReceived ?? 0) || 0));
      const balance = Number(balanceCandidate) || 0;
      const status = String(note?.status || "").toLowerCase();
      if (status === "void" || status === "cancelled" || status === "canceled") return sum;
      if (balance <= 0) return sum;
      return sum + balance;
    }, 0);
  }, [creditNotes]);
  const creditsApplied = useMemo(() => Math.min(preCreditImmediate, creditAvailable), [preCreditImmediate, creditAvailable]);
  const totalImmediate = useMemo(() => Math.max(preCreditImmediate - creditsApplied, 0), [preCreditImmediate, creditsApplied]);
  const recurringCharges = preCreditImmediate;
  const immediateCharges = totalImmediate;
  const [receivedPayment, setReceivedPayment] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(true);
  const [showRecurringBreakdown, setShowRecurringBreakdown] = useState(false);
  const breakdownLabel = state.planName || state.productName || "Plan";
  const [paymentDate, setPaymentDate] = useState(state.startDate || new Date().toISOString().split("T")[0]);
  const [paymentMode, setPaymentMode] = useState("Cash");
  const [depositTo, setDepositTo] = useState("Petty Cash");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");


  const paymentModes: SelectOption[] = [
    { value: "Cash" },
    { value: "Bank Remittance" },
    { value: "Bank Transfer" },
    { value: "Check" },
    { value: "Credit Card" },
  ];
  const depositAccounts: SelectOption[] = [
    { value: "cash-group", label: "Cash", type: "header" },
    { value: "Petty Cash" },
    { value: "Undeposited Funds" },
    { value: "liability-group", label: "Other Current Liability", type: "header" },
    { value: "Employee Reimbursements" },
    { value: "Opening Balance Adjustments" },
    { value: "Retention Payable" },
  ];

  return (
    <div className="min-h-screen bg-white font-sans text-slate-700 pb-24">
      <div className="px-8 py-4 border-b border-gray-100 bg-white sticky top-0 z-[50]">
        <h1 className="text-lg font-medium text-slate-800">Subscription Preview</h1>
      </div>

      <div className="px-8 py-6 max-w-5xl space-y-6">
        <button
          type="button"
          onClick={() => {
            const draft = readDraftFromSession();
            const isQuoteConversionDraft =
              String(draft?.sourceType || "").trim().toLowerCase() === "quote" &&
              !String(draft?.id || "").trim();
            if (draft?.id && !isQuoteConversionDraft) {
              navigate(`/sales/subscriptions/${draft.id}/edit`, { state: { draft: buildSubscriptionEditDraft(draft) } });
              return;
            }
            navigate("/sales/subscriptions/new", { state: draft ? { draft: buildSubscriptionEditDraft(draft) } : state });
          }}
          className="text-[13px] text-blue-600 hover:underline"
        >
          &laquo; Previous
        </button>

        <div className="border border-gray-200 rounded-md p-5 bg-white shadow-sm">
          <div className="flex items-center justify-between text-[14px] text-slate-700">
            <span className="font-medium">Immediate Charges</span>
            <span className="font-semibold text-slate-900">{formatMoney(immediateCharges, currency)}</span>
          </div>
          <div className="mt-1 text-[12px] text-slate-400">
            {state.startDate ? `On ${formatDateLabel(state.startDate)}` : ""}
          </div>

          <div className="mt-6 flex items-center justify-between text-[14px] text-slate-700">
            <span className="font-medium">Recurring Charges</span>
            <span className="font-semibold text-slate-900">{formatMoney(recurringCharges, currency)}</span>
          </div>
          <div className="mt-1 text-[12px] text-slate-400">
            {state.startDate ? `Billed per month, starting from ${formatDateLabel(recurringStartDate)}` : ""}
          </div>

          <div className="mt-4 text-right">
            <button
              type="button"
              className="text-[12px] text-blue-600 hover:underline"
              onClick={() => setShowDetails((prev) => !prev)}
            >
              View full details &raquo;
            </button>
          </div>
        </div>

        {immediateCharges > 0 && (
          <div className="border border-gray-200 rounded-md p-4 flex items-center justify-between">
            <span className="text-[13px] text-slate-700">Have you received payment for the current billing cycle?</span>
            <label className="inline-flex items-center">
              <input
                type="checkbox"
                checked={receivedPayment}
                onChange={(e) => {
                  const next = e.target.checked;
                  setReceivedPayment(next);
                  setPaymentAmount(next ? totalImmediate.toFixed(2) : "");
                }}
                className="sr-only"
              />
              <span
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  receivedPayment ? "bg-blue-500" : "bg-gray-300"
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                    receivedPayment ? "translate-x-5" : "translate-x-1"
                  }`}
                />
              </span>
            </label>
          </div>
        )}

        {receivedPayment && (
          <div className="border border-gray-200 rounded-md p-5 bg-white shadow-sm">
            <div className="text-[14px] font-semibold text-slate-800">Record Payment</div>
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-[180px_1fr]">
              <div className="text-[13px] text-slate-600">Amount Received</div>
              <input
                type="number"
                min="0"
                step="0.01"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                placeholder={totalImmediate.toFixed(2)}
                className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-[13px] text-slate-700 focus:border-blue-500 focus:outline-none"
              />

              <div className="text-[13px] text-slate-600">Payment Date</div>
              <input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-[13px] text-slate-700 focus:border-blue-500 focus:outline-none"
              />

              <div className="text-[13px] text-slate-600">Mode Of Payment</div>
              <SearchSelect
                value={paymentMode}
                options={paymentModes}
                onChange={setPaymentMode}
                placeholder="Select Mode"
              />

              <div className="text-[13px] text-slate-600">Deposit To</div>
              <SearchSelect
                value={depositTo}
                options={depositAccounts}
                onChange={setDepositTo}
                placeholder="Select Account"
              />

              <div className="text-[13px] text-slate-600">Reference#</div>
              <input
                type="text"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-[13px] text-slate-700 focus:border-blue-500 focus:outline-none"
              />

              <div className="text-[13px] text-slate-600">Notes</div>
              <textarea
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
                className="min-h-[88px] w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-[13px] text-slate-700 focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>
        )}
      </div>

      {showDetails && (
        <div className="fixed inset-0 z-[12000] pointer-events-none">
          <div className="absolute right-40 top-28 w-[400px] rounded-lg border border-gray-200 bg-white shadow-2xl pointer-events-auto">
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 text-[13px] font-semibold text-gray-800">
              Detailed Summary
              <button
                type="button"
                onClick={() => setShowDetails(false)}
                className="text-gray-400 hover:text-gray-600"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 p-4">
              <div className="rounded-md border border-gray-100 bg-white p-3">
                <div className="flex items-center justify-between text-[12px] font-semibold text-orange-600">
                  <span>Immediate Charges</span>
                  <span className="text-gray-900">{formatMoney(totalImmediate, currency)}</span>
                </div>
                <div className="mt-1 text-[11px] text-gray-400">On {formatDateLabel(state.startDate)}</div>
                <button
                  type="button"
                  className="mt-2 text-[12px] text-blue-600 hover:underline"
                  onClick={() => setShowBreakdown((prev) => !prev)}
                >
                  {showBreakdown ? "Hide Breakdown" : "Show Breakdown"} &raquo;
                </button>

                {showBreakdown && (
                  <div className="mt-3 space-y-2 text-[12px] text-gray-600">
                    {lineItems.map((item, idx) => (
                      <div key={`${item.label}-${idx}`} className="flex items-center justify-between">
                        <span>{item.label}</span>
                        <span>{formatMoney(item.quantity * item.rate, currency)}</span>
                      </div>
                    ))}
                    {lineItems.length > 0 && <div className="border-t border-gray-100 pt-2" />}
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">Sub Total</span>
                      <span className="font-semibold">{formatMoney(subtotal, currency)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>{state.tax || "Tax"} {taxRate ? `(${taxRate}%)` : ""}</span>
                      <span>{formatMoney(taxAmount, currency)}</span>
                    </div>
                    {discountAmount > 0 && (
                      <div className="flex items-center justify-between">
                        <span>Coupon Discount</span>
                        <span>{formatMoney(discountAmount, currency)}</span>
                      </div>
                    )}
                    {creditsApplied > 0 && (
                      <div className="flex items-center justify-between">
                        <span>Credits Applied</span>
                        <span>{formatMoney(creditsApplied, currency)}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span>Round Off</span>
                      <span>{formatMoney(0, currency)}</span>
                    </div>
                    <div className="flex items-center justify-between border-t border-gray-100 pt-2 font-semibold text-gray-800">
                      <span>Total Immediate Charges</span>
                      <span>{formatMoney(totalImmediate, currency)}</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="rounded-md border border-gray-100 bg-white p-3">
                <div className="flex items-center justify-between text-[12px] font-semibold text-blue-600">
                  <span>Recurring Charges</span>
                  <span className="text-gray-900">{formatMoney(recurringCharges, currency)}</span>
                </div>
                <div className="mt-1 text-[11px] text-gray-400">
                  Billed per month, starting from {formatDateLabel(recurringStartDate)}
                </div>
                <button
                  type="button"
                  className="mt-2 text-[12px] text-blue-600 hover:underline"
                  onClick={() => setShowRecurringBreakdown((prev) => !prev)}
                >
                  {showRecurringBreakdown ? "Hide Breakdown" : "Show Breakdown"} &raquo;
                </button>

                {showRecurringBreakdown && (
                  <div className="mt-3 space-y-2 text-[12px] text-gray-600">
                    {lineItems.map((item, idx) => (
                      <div key={`${item.label}-${idx}`} className="flex items-center justify-between">
                        <span>{item.label}</span>
                        <span>{formatMoney(item.quantity * item.rate, currency)}</span>
                      </div>
                    ))}
                    {lineItems.length > 0 && <div className="border-t border-gray-100 pt-2" />}
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">Sub Total</span>
                      <span className="font-semibold">{formatMoney(subtotal, currency)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>{state.tax || "Tax"} {taxRate ? `(${taxRate}%)` : ""}</span>
                      <span>{formatMoney(taxAmount, currency)}</span>
                    </div>
                    {discountAmount > 0 && (
                      <div className="flex items-center justify-between">
                        <span>Coupon Discount</span>
                        <span>{formatMoney(discountAmount, currency)}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span>Round Off</span>
                      <span>{formatMoney(0, currency)}</span>
                    </div>
                    <div className="flex items-center justify-between border-t border-gray-100 pt-2 font-semibold text-gray-800">
                      <span>Total Recurring Charges</span>
                      <span>{formatMoney(recurringCharges, currency)}</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="rounded-md border border-gray-100 bg-white p-3">
                <div className="text-[12px] font-semibold text-slate-600">Billing Preferences</div>
                <div className="mt-3 space-y-2 text-[12px] text-gray-600">
                  <div className="flex items-center justify-between gap-4">
                    <span>Invoice Preference</span>
                    <span className="text-gray-900 text-right max-w-[180px]">{state.invoicePreference || "Create and Send Invoices"}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span>Usage Billing</span>
                    <span className="text-gray-900">{state.usageBillingEnabled ? "Enabled" : "Disabled"}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span>Prepaid Billing</span>
                    <span className="text-gray-900">{state.prepaidBillingEnabled ? "Enabled" : "Disabled"}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span>Consolidated Billing</span>
                    <span className="text-gray-900">{state.consolidatedBillingEnabled ? "Enabled" : "Disabled"}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span>Calendar Billing</span>
                    <span className="text-gray-900 text-right max-w-[180px]">
                      {state.calendarBillingMode || "Same as a subscription's activation date"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="fixed bottom-0 left-[220px] right-0 bg-white border-t border-gray-100 py-4 px-8 flex items-center gap-4 z-[100] shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <button
          onClick={async () => {
            const draft = readDraftFromSession();

            const currencyCode = String(draft?.currency || state.currency || "USD");
            const createdOn = formatShortDate(new Date().toISOString());
            const startDateRaw = draft?.startDate || state.startDate;
            const activatedOn = formatShortDate(startDateRaw);
            const lastBilledOn = activatedOn || createdOn;
            const nextBillingAligned = alignNextBillingDate(startDateRaw);
            const nextBillingOn = formatShortDate(nextBillingAligned || addMonthsDate(startDateRaw, 1));
            const amountValue = totalImmediate;
    const amountLabel = `${currencyCode}${amountValue.toFixed(2)}`;

            const isEditMode = Boolean(draft?.id) && !isQuoteConversionDraft;
            const subscriptionNumber = String(
              draft?.subscriptionNumber ||
              state.subscriptionNumber ||
              `SUB-${String(Date.now()).slice(-8)}`
            );
            const subscriptionId = isEditMode ? String(draft?.id || draft?._id || "").trim() : "";
            const createdOnValue = String(draft?.createdOn || createdOn);
            const activatedOnValue = activatedOn || createdOnValue;
            const isBackdated = Boolean(startDateRaw && startDateRaw < new Date().toISOString().split("T")[0]);
            const lastBilledOnValue = isBackdated ? formatShortDate(new Date().toISOString()) : activatedOnValue;
            const nextBillingOnValue = nextBillingOn || String(draft?.nextBillingOn || "");
            const enteredPaymentAmount = Number(String(paymentAmount || "").replace(/[^\d.-]/g, "")) || 0;
            const amountReceivedValue = receivedPayment ? Math.max(0, Math.min(enteredPaymentAmount, totalImmediate)) : 0;
            const paymentStatusValue =
              totalImmediate <= 0
                ? "paid"
                : amountReceivedValue >= totalImmediate
                ? "paid"
                : amountReceivedValue > 0
                ? "partially paid"
                : "unpaid";
            const manualRenewalPreference = String(draft?.manualRenewalInvoicePreference || "Generate a New Invoice");
            const shouldGenerateInvoices = Boolean(draft?.manualRenewal ?? false)
              ? manualRenewalPreference === "Generate a New Invoice" && Boolean(draft?.generateInvoices ?? true)
              : Boolean(draft?.generateInvoices ?? true);
            const {
              sourceType: _draftSourceType,
              quoteConversion: _draftQuoteConversion,
              ...subscriptionDraft
            } = draft && typeof draft === "object" ? draft : {};
            const subscription = {
              ...subscriptionDraft,
              id: subscriptionId,
              createdOn: createdOnValue,
              activatedOn: activatedOnValue,
              location: String(draft?.location || "Head Office"),
              subscriptionNumber,
              customerName: String(draft?.customerName || "Customer"),
              customerEmail: String(draft?.contactPersons?.[0]?.email || draft?.customerEmail || ""),
              customerId: String(draft?.customerId || ""),
              contactPersons: Array.isArray(draft?.contactPersons)
                ? draft.contactPersons
                : [],
              billingAddress: draft?.billingAddress ?? null,
              shippingAddress: draft?.shippingAddress ?? null,
              salesperson: String(draft?.salesperson || ""),
              salespersonId: String(draft?.salespersonId || ""),
              salespersonName: String(draft?.salespersonName || ""),
              productId: String(draft?.productId || ""),
              productName: String(draft?.productName || ""),
              planName: String(draft?.planName || state.planName || ""),
              planDescription: String(draft?.planDescription || ""),
              status: normalizeLifecycleStatus(draft?.status || "LIVE"),
              amount: amountLabel,
              quantity: Number(draft?.quantity || 1) || 1,
              price: Number(draft?.price || 0) || 0,
              basePrice: Number(draft?.basePrice || 0) || 0,
              tax: String(draft?.tax || ""),
              taxRate: Number(draft?.taxRate || 0) || 0,
              taxPreference: String(draft?.taxPreference || "Tax Exclusive"),
              contentType: String(draft?.contentType || "product"),
              items: Array.isArray(draft?.items) ? draft.items : [],
              customerNotes: String(draft?.customerNotes || ""),
              expiresAfter: String(draft?.expiresAfter || ""),
              neverExpires: Boolean(draft?.neverExpires ?? false),
              coupon: String(draft?.coupon || ""),
              couponCode: String(draft?.couponCode || ""),
              couponValue: String(draft?.couponValue || ""),
              manualRenewal: Boolean(draft?.manualRenewal ?? false),
              manualRenewalInvoicePreference: String(draft?.manualRenewalInvoicePreference || "Generate a New Invoice"),
              manualRenewalFreeExtension: String(draft?.manualRenewalFreeExtension || ""),
              advanceBillingEnabled: Boolean(draft?.advanceBillingEnabled ?? false),
              advanceBillingMethod: String(draft?.advanceBillingMethod || "Advance Invoice"),
              advanceBillingPeriodDays: Number(draft?.advanceBillingPeriodDays ?? 5) || 5,
              advanceBillingAutoGenerate: Boolean(draft?.advanceBillingAutoGenerate ?? false),
              advanceBillingApplyUpcomingTerms: Boolean(draft?.advanceBillingApplyUpcomingTerms ?? false),
              invoicePreference: String(draft?.invoicePreference || "Create and Send Invoices"),
              usageBillingEnabled: Boolean(draft?.usageBillingEnabled ?? false),
              prepaidBillingEnabled: Boolean(draft?.prepaidBillingEnabled ?? false),
              prepaidPlanName: String(draft?.prepaidPlanName || ""),
              drawdownCreditName: String(draft?.drawdownCreditName || ""),
              drawdownRate: String(draft?.drawdownRate || ""),
              consolidatedBillingEnabled: Boolean(draft?.consolidatedBillingEnabled ?? false),
              calendarBillingMode: String(draft?.calendarBillingMode || "Same as a subscription's activation date"),
              calendarBillingDays: String(draft?.calendarBillingDays || ""),
              calendarBillingMonths: String(draft?.calendarBillingMonths || ""),
              tag: String(draft?.tag || ""),
              reportingTags: Array.isArray(draft?.reportingTags) ? draft.reportingTags : [],
              lastBilledOn: lastBilledOnValue,
              nextBillingOn: nextBillingOnValue,
              referenceNumber: String(draft?.referenceNumber || ""),
              immediateCharges: totalImmediate,
              paymentReceived: amountReceivedValue > 0,
              amountReceived: amountReceivedValue,
              paymentStatus: paymentStatusValue,
              paymentDate: paymentDate || createdOnValue,
              paymentMode: String(paymentMode || ""),
              depositTo: String(depositTo || ""),
              paymentNotes: String(paymentNotes || ""),
              paymentReferenceNumber: String(referenceNumber || ""),
              priceListId: draft?.priceListId || "",
              priceListName: draft?.priceListName || "",
              addonLines: Array.isArray(draft?.addonLines) ? draft.addonLines : [],
              meteredBilling: Boolean(draft?.meteredBilling ?? false),
              paymentTerms: String(draft?.paymentTerms || "Due on Receipt"),
              partialPayments: Boolean(draft?.partialPayments ?? false),
              prorateCharges: Boolean(draft?.prorateCharges ?? true),
              generateInvoices: shouldGenerateInvoices,
              invoiceTemplate: String(draft?.invoiceTemplate || "Standard Template"),
              roundOffPreference: String(draft?.roundOffPreference || "No Rounding"),
              scheduledUpdate: null,
              scheduledUpdateDate: "",
              formSnapshot: draft && typeof draft === "object" ? draft : {},
            };

            const applyMode = String(draft?.applyChanges || state.applyChanges || "immediately");
            const applyOn =
              applyMode === "end_of_term"
                ? subscription.nextBillingOn
                : applyMode === "scheduled"
                ? formatShortDate(draft?.applyChangesDate || state.applyChangesDate || "")
                : "";

            let finalSubscription = { ...subscription };
            let createdViaApi = false;
            let backendGeneratedInvoice = false;
            try {
              if (isEditMode) {
                const editId = String(draft?.id || draft?._id || "").trim();
                if (!editId) {
                  throw new Error("Missing subscription id.");
                }
                const payload =
                  applyMode === "immediately"
                    ? {
                        ...subscription,
                        id: undefined,
                        _id: undefined,
                      }
                    : {
                        scheduledUpdate: { applyOn, mode: applyMode, payload: subscription },
                        scheduledUpdateDate: applyOn,
                      };
                const updatedRes: any = await subscriptionsAPI.update(editId, payload);
                if (!updatedRes?.success || !updatedRes?.data) {
                  throw new Error(updatedRes?.message || "Failed to update subscription.");
                }
                finalSubscription = { ...finalSubscription, ...updatedRes.data, id: String(updatedRes.data.id || editId) };
              } else {
                const createdRes: any = await subscriptionsAPI.create({
                  ...subscription,
                  id: undefined,
                  _id: undefined,
                });
                if (!createdRes?.success || !createdRes?.data) {
                  throw new Error(createdRes?.message || "Failed to create subscription.");
                }
                createdViaApi = true;
                backendGeneratedInvoice = Boolean(
                  createdRes?.data?.generatedInvoiceId ||
                    createdRes?.data?.generatedInvoiceNumber ||
                    createdRes?.data?.generatedInvoice?.id ||
                    createdRes?.data?.generatedInvoice?._id
                );
                finalSubscription = {
                  ...finalSubscription,
                  ...createdRes.data,
                  id: String(createdRes.data.id || createdRes.data._id || ""),
                };
              }
            } catch (error) {
              const message = error instanceof Error ? error.message : "Failed to save subscription.";
              toast.error(message);
              return;
            }

            // Auto-generate invoice for new subscriptions when enabled
            if (!isEditMode && finalSubscription.generateInvoices && (!createdViaApi || !backendGeneratedInvoice)) {
              try {
                const nextNumberResponse = await transactionNumberSeriesAPI.getNextNumber({ module: "Invoice", reserve: false });
                const nextNumber =
                  nextNumberResponse?.data?.nextNumber ||
                  nextNumberResponse?.data?.invoiceNumber ||
                  `INV-${String(Date.now()).slice(-5)}`;
                const backdatedGenerate = Boolean(
                  (draft?.backdatedGenerateInvoice ?? state.backdatedGenerateInvoice) ?? true
                );
                const todayLabel = formatShortDate(new Date().toISOString());
                const isBackdatedCycle = Boolean(startDateRaw && startDateRaw < new Date().toISOString().split("T")[0]);
                if (!(isBackdatedCycle && !backdatedGenerate)) {
                  const invoiceDate = isBackdatedCycle ? todayLabel : createdOnValue;
                  const dueDate = invoiceDate;
                  const invoiceStatus =
                    totalImmediate <= 0
                      ? "paid"
                      : amountReceivedValue >= totalImmediate
                      ? "paid"
                      : amountReceivedValue > 0
                      ? "partially paid"
                      : "sent";
                  const balanceDue = Math.max(totalImmediate - amountReceivedValue, 0);
                  const items = lineItems.map((item) => ({
                    itemDetails: item.label,
                    description: "",
                    quantity: item.quantity,
                    rate: item.rate,
                    tax: item.taxRate ? `${item.taxRate}%` : "",
                    taxRate: item.taxRate,
                    amount: item.quantity * item.rate,
                  }));

                  const invoiceResponse = await invoicesAPI.create({
                    invoiceNumber: nextNumber,
                    invoiceDate,
                    date: invoiceDate,
                    dueDate,
                    status: invoiceStatus,
                    customerId: finalSubscription.customerId,
                    customerName: finalSubscription.customerName,
                    customerEmail: finalSubscription.customerEmail,
                    billingAddress: finalSubscription.billingAddress,
                    shippingAddress: finalSubscription.shippingAddress,
                    salesperson: finalSubscription.salesperson,
                    currency: currencyCode,
                    items,
                    subTotal: subtotal,
                    taxAmount,
                    discountAmount,
                    total: totalImmediate,
                    balanceDue,
                    balance: balanceDue,
                    amountPaid: amountReceivedValue,
                    isRecurringInvoice: true,
                    source: "subscription",
                    invoiceSource: "subscription",
                    recurringProfileId: finalSubscription.id,
                    referenceNumber: finalSubscription.referenceNumber || "",
                    createdAt: new Date().toISOString(),
                  });

                  const createdInvoice = invoiceResponse?.data;
                  if (createdInvoice?.id || createdInvoice?._id || createdInvoice?.invoiceNumber) {
                    finalSubscription = {
                      ...finalSubscription,
                      generatedInvoiceId: String(createdInvoice?.id || createdInvoice?._id || "").trim(),
                      generatedInvoiceNumber: String(createdInvoice?.invoiceNumber || nextNumber).trim(),
                      generatedInvoiceStatus: String(createdInvoice?.status || invoiceStatus || "").trim(),
                    };
                  }
                  if (amountReceivedValue > 0 && createdInvoice?.id) {
                    await paymentsReceivedAPI.create({
                      invoiceId: createdInvoice.id,
                      invoiceNumber: createdInvoice.invoiceNumber || nextNumber,
                      customerId: finalSubscription.customerId,
                      customerName: finalSubscription.customerName,
                      amountReceived: amountReceivedValue,
                      paymentMode,
                      depositTo,
                      referenceNumber,
                      notes: paymentNotes,
                      paymentDate: paymentDate || createdOnValue,
                      status: amountReceivedValue >= totalImmediate ? "paid" : "partially paid",
                    });
                  }
                }
              } catch {
                // ignore invoice create errors for now
              }
            }

            try {
              sessionStorage.removeItem("taban_subscription_draft_v1");
            } catch {
              // ignore storage errors
            }
            try {
              sessionStorage.setItem("taban_subscription_clear_v1", "1");
            } catch {
              // ignore storage errors
            }
            toast.success(isEditMode ? "Subscription updated successfully." : "Subscription created successfully.");
            navigate("/sales/subscriptions");
          }}
          className="px-5 py-2 bg-[#156372] text-white rounded font-bold text-[13px] hover:bg-[#0f4f5b]"
        >
          {draftSnapshot?.id && !isQuoteConversionDraft ? "Update" : "Create"}
        </button>
        <button
          onClick={() => {
            try {
              sessionStorage.removeItem("taban_subscription_draft_v1");
            } catch {
              // ignore storage errors
            }
            navigate(-1);
          }}
          className="px-5 py-2 bg-white border border-gray-200 text-gray-600 rounded font-bold text-[13px] hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default SubscriptionPreviewPage;
