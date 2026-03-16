import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { Check, ChevronDown, Search } from "lucide-react";
import { creditNotesAPI, invoicesAPI, paymentsReceivedAPI } from "../../../../services/api";

type PreviewState = {
  currency?: string;
  customerId?: string;
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
            if (draft?.id) {
              navigate(`/sales/subscriptions/${draft.id}/edit`, { state: { draft } });
              return;
            }
            navigate("/sales/subscriptions/new", { state: draft ? { draft } : state });
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
                onChange={(e) => setReceivedPayment(e.target.checked)}
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

            const listKey = "taban_subscriptions_v1";
            let existing: any[] = [];
            try {
              const rawList = localStorage.getItem(listKey);
              const parsed = rawList ? JSON.parse(rawList) : [];
              existing = Array.isArray(parsed) ? parsed : [];
            } catch {
              existing = [];
            }

            const nextIndex = existing.length + 1;
            const fallbackNumber = `SUB-${String(nextIndex).padStart(5, "0")}`;
            const subscriptionNumber = String(draft?.subscriptionNumber || fallbackNumber);
            const isEditMode = Boolean(draft?.id);
            const existingIndex = isEditMode
              ? existing.findIndex((row: any) => String(row?.id || "") === String(draft?.id || ""))
              : -1;
            const existingRow = existingIndex >= 0 ? existing[existingIndex] : null;
            const createdOnValue = String(draft?.createdOn || existingRow?.createdOn || createdOn);
            const activatedOnValue = activatedOn || String(existingRow?.activatedOn || createdOnValue);
            const isBackdated = Boolean(startDateRaw && startDateRaw < new Date().toISOString().split("T")[0]);
            const lastBilledOnValue = isBackdated
              ? formatShortDate(new Date().toISOString())
              : activatedOnValue || String(existingRow?.lastBilledOn || createdOnValue);
            const nextBillingOnValue = nextBillingOn || String(existingRow?.nextBillingOn || "");
            const amountReceivedValue = receivedPayment ? totalImmediate : 0;
            const subscription = {
              id: String(draft?.id || existingRow?.id || `sub-${Date.now()}`),
              createdOn: createdOnValue,
              activatedOn: activatedOnValue,
              location: String(draft?.location || existingRow?.location || "Head Office"),
              subscriptionNumber,
              customerName: String(draft?.customerName || existingRow?.customerName || "Customer"),
              customerEmail: String(draft?.contactPersons?.[0]?.email || existingRow?.customerEmail || ""),
              customerId: String(draft?.customerId || existingRow?.customerId || ""),
              contactPersons: Array.isArray(draft?.contactPersons)
                ? draft.contactPersons
                : existingRow?.contactPersons || [],
              billingAddress: draft?.billingAddress ?? existingRow?.billingAddress ?? null,
              shippingAddress: draft?.shippingAddress ?? existingRow?.shippingAddress ?? null,
              salesperson: String(draft?.salesperson || existingRow?.salesperson || ""),
              salespersonName: String(draft?.salespersonName || existingRow?.salespersonName || ""),
              productId: String(draft?.productId || existingRow?.productId || ""),
              productName: String(draft?.productName || existingRow?.productName || ""),
              planName: String(draft?.planName || state.planName || existingRow?.planName || ""),
              planDescription: String(draft?.planDescription || existingRow?.planDescription || ""),
              status: "LIVE",
              amount: amountLabel,
              quantity: Number(draft?.quantity || existingRow?.quantity || 1) || 1,
              price: Number(draft?.price || existingRow?.price || 0) || 0,
              basePrice: Number(draft?.basePrice || existingRow?.basePrice || 0) || 0,
              tax: String(draft?.tax || existingRow?.tax || ""),
              taxRate: Number(draft?.taxRate || existingRow?.taxRate || 0) || 0,
              taxPreference: String(draft?.taxPreference || existingRow?.taxPreference || "Tax Exclusive"),
              contentType: String(draft?.contentType || existingRow?.contentType || "product"),
              items: Array.isArray(draft?.items) ? draft.items : existingRow?.items || [],
              customerNotes: String(draft?.customerNotes || existingRow?.customerNotes || ""),
              expiresAfter: String(draft?.expiresAfter || existingRow?.expiresAfter || ""),
              neverExpires: Boolean(draft?.neverExpires ?? existingRow?.neverExpires ?? false),
              coupon: String(draft?.coupon || existingRow?.coupon || ""),
              couponCode: String(draft?.couponCode || existingRow?.couponCode || ""),
              couponValue: String(draft?.couponValue || existingRow?.couponValue || ""),
              tag: String(draft?.tag || existingRow?.tag || ""),
              reportingTags: Array.isArray(draft?.reportingTags)
                ? draft.reportingTags
                : existingRow?.reportingTags || [],
              lastBilledOn: lastBilledOnValue,
              nextBillingOn: nextBillingOnValue,
              referenceNumber: String(draft?.referenceNumber || existingRow?.referenceNumber || ""),
              immediateCharges: totalImmediate,
              paymentReceived: amountReceivedValue > 0,
              priceListId: draft?.priceListId || existingRow?.priceListId || "",
              priceListName: draft?.priceListName || existingRow?.priceListName || "",
              addonLines: Array.isArray(draft?.addonLines) ? draft.addonLines : existingRow?.addonLines || [],
              meteredBilling: Boolean(draft?.meteredBilling ?? existingRow?.meteredBilling ?? false),
              paymentMode: String(draft?.paymentMode || existingRow?.paymentMode || "offline"),
              paymentTerms: String(draft?.paymentTerms || existingRow?.paymentTerms || "Due on Receipt"),
              partialPayments: Boolean(draft?.partialPayments ?? existingRow?.partialPayments ?? false),
              prorateCharges: Boolean(draft?.prorateCharges ?? existingRow?.prorateCharges ?? true),
              generateInvoices: Boolean(draft?.generateInvoices ?? existingRow?.generateInvoices ?? true),
              invoiceTemplate: String(draft?.invoiceTemplate || existingRow?.invoiceTemplate || "Standard Template"),
              roundOffPreference: String(draft?.roundOffPreference || existingRow?.roundOffPreference || "No Rounding"),
              scheduledUpdate: existingRow?.scheduledUpdate || null,
              scheduledUpdateDate: existingRow?.scheduledUpdateDate || "",
            };

            let updated = [...existing];
            if (isEditMode && existingIndex >= 0) {
              const applyMode = String(draft?.applyChanges || state.applyChanges || "immediately");
              if (applyMode === "immediately") {
                updated[existingIndex] = subscription;
              } else {
                const applyOn =
                  applyMode === "end_of_term"
                    ? existingRow?.nextBillingOn || subscription.nextBillingOn
                    : formatShortDate(draft?.applyChangesDate || state.applyChangesDate || "");
                updated[existingIndex] = {
                  ...existingRow,
                  scheduledUpdate: { applyOn, mode: applyMode, payload: subscription },
                  scheduledUpdateDate: applyOn,
                };
              }
            } else {
              updated = [subscription, ...existing];
            }
            try {
              localStorage.setItem(listKey, JSON.stringify(updated));
            } catch {
              // ignore storage errors
            }

            // Auto-generate invoice for new subscriptions when enabled
            if (!isEditMode && subscription.generateInvoices) {
              try {
                const nextNumberResponse = await invoicesAPI.getNextNumber("INV-");
                const nextNumber =
                  nextNumberResponse?.data?.nextNumber ||
                  nextNumberResponse?.data?.invoiceNumber ||
                  `INV-${String(Date.now()).slice(-5)}`;
                const backdatedGenerate = Boolean(
                  (draft?.backdatedGenerateInvoice ?? state.backdatedGenerateInvoice) ?? true
                );
                const todayLabel = formatShortDate(new Date().toISOString());
                const isBackdatedCycle = Boolean(startDateRaw && startDateRaw < new Date().toISOString().split("T")[0]);
                if (isBackdatedCycle && !backdatedGenerate) {
                  // Skip generating invoice for backdated subscriptions when disabled
                  return;
                }
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
                  customerId: subscription.customerId,
                  customerName: subscription.customerName,
                  customerEmail: subscription.customerEmail,
                  billingAddress: subscription.billingAddress,
                  shippingAddress: subscription.shippingAddress,
                  salesperson: subscription.salesperson,
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
                  recurringProfileId: subscription.id,
                  referenceNumber: subscription.referenceNumber || "",
                  createdAt: new Date().toISOString(),
                });

                const createdInvoice = invoiceResponse?.data;
                if (amountReceivedValue > 0 && createdInvoice?.id) {
                  await paymentsReceivedAPI.create({
                    invoiceId: createdInvoice.id,
                    invoiceNumber: createdInvoice.invoiceNumber || nextNumber,
                    customerId: subscription.customerId,
                    customerName: subscription.customerName,
                    amountReceived: amountReceivedValue,
                    paymentMode,
                    depositTo,
                    referenceNumber,
                    notes: paymentNotes,
                    paymentDate: paymentDate || createdOnValue,
                    status: amountReceivedValue >= totalImmediate ? "paid" : "partially paid",
                  });
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
          className="px-5 py-2 bg-[#22b573] text-white rounded font-bold text-[13px] hover:brightness-95"
        >
          {draftSnapshot?.id ? "Update" : "Create"}
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
