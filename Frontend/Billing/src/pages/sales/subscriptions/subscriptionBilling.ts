import { invoicesAPI } from "../../../services/api";

const SUBSCRIPTIONS_STORAGE_KEY = "taban_subscriptions_v1";
const BILLING_LAST_RUN_KEY = "taban_subscriptions_billing_last_run";

const parseSubscriptionDate = (value?: string): Date | null => {
  if (!value) return null;
  const raw = String(value).trim();
  if (!raw) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
    const direct = new Date(raw);
    return Number.isNaN(direct.getTime()) ? null : direct;
  }
  const match = raw.match(/^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})$/);
  if (match) {
    const day = match[1].padStart(2, "0");
    const monthMap: Record<string, string> = {
      Jan: "01",
      Feb: "02",
      Mar: "03",
      Apr: "04",
      May: "05",
      Jun: "06",
      Jul: "07",
      Aug: "08",
      Sep: "09",
      Oct: "10",
      Nov: "11",
      Dec: "12",
    };
    const month = monthMap[match[2]];
    if (!month) return null;
    const parsed = new Date(`${match[3]}-${month}-${day}`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  const fallback = new Date(raw);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
};

const formatSubscriptionDate = (value: Date) =>
  value.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

const addMonths = (value: Date, months: number) => {
  const next = new Date(value);
  next.setMonth(next.getMonth() + months);
  return next;
};

const toNumber = (value: any) => {
  const raw = String(value ?? "").trim();
  if (!raw) return 0;
  const numeric = Number(raw.replace(/[^\d.-]/g, ""));
  return Number.isFinite(numeric) ? numeric : 0;
};

const buildInvoicePayload = async (subscription: any, invoiceDate: Date) => {
  const amountValue = toNumber(subscription?.amount || 0);
  const currencyMatch = String(subscription?.amount || "").match(/^[A-Za-z]+/);
  const currency = currencyMatch ? currencyMatch[0] : subscription?.currency || "USD";
  const quantity = Number(subscription?.quantity || 1) || 1;
  const price = Number(subscription?.price || 0) || 0;
  const taxRate = Number(subscription?.taxRate || 0) || 0;
  const subtotal = price * quantity + (Array.isArray(subscription?.addonLines)
    ? subscription.addonLines.reduce((sum: number, addon: any) => {
        const qty = Number(addon?.quantity || 0) || 0;
        const rate = Number(addon?.rate || 0) || 0;
        return sum + qty * rate;
      }, 0)
    : 0);
  const discountAmount = toNumber(subscription?.couponValue || 0);
  const taxAmount = taxRate ? (subtotal * taxRate) / 100 : 0;
  const total = Math.max(subtotal + taxAmount - discountAmount, 0);

  const nextNumberResponse = await invoicesAPI.getNextNumber("INV-");
  const nextNumber =
    nextNumberResponse?.data?.nextNumber ||
    nextNumberResponse?.data?.invoiceNumber ||
    `INV-${String(Date.now()).slice(-5)}`;

  const items = [
    ...(subscription?.planName
      ? [
          {
            itemDetails: subscription.planName,
            description: subscription.planDescription || "",
            quantity,
            rate: price,
            tax: taxRate ? `${taxRate}%` : "",
            taxRate,
            amount: quantity * price,
          },
        ]
      : []),
    ...(Array.isArray(subscription?.addonLines)
      ? subscription.addonLines
          .filter((addon: any) => addon?.addonName)
          .map((addon: any) => ({
            itemDetails: addon.addonName,
            description: addon.description || "",
            quantity: Number(addon.quantity || 0) || 0,
            rate: Number(addon.rate || 0) || 0,
            tax: addon.taxRate ? `${addon.taxRate}%` : addon.tax || "",
            taxRate: Number(addon.taxRate || 0) || 0,
            amount: (Number(addon.quantity || 0) || 0) * (Number(addon.rate || 0) || 0),
          }))
      : []),
  ];

  return {
    invoiceNumber: nextNumber,
    invoiceDate: formatSubscriptionDate(invoiceDate),
    date: invoiceDate.toISOString(),
    dueDate: formatSubscriptionDate(invoiceDate),
    status: "sent",
    customerId: subscription?.customerId,
    customerName: subscription?.customerName,
    customerEmail: subscription?.customerEmail,
    billingAddress: subscription?.billingAddress,
    shippingAddress: subscription?.shippingAddress,
    salesperson: subscription?.salesperson,
    currency,
    items,
    subTotal: subtotal || amountValue,
    taxAmount,
    discountAmount,
    total: total || amountValue,
    balanceDue: total || amountValue,
    balance: total || amountValue,
    amountPaid: 0,
    isRecurringInvoice: true,
    recurringProfileId: subscription?.id,
    referenceNumber: subscription?.referenceNumber || "",
    createdAt: new Date().toISOString(),
  };
};

export const runSubscriptionBillingSimulation = async () => {
  const now = new Date();
  if (now.getHours() < 6) return;
  const todayKey = now.toISOString().split("T")[0];
  const lastRun = localStorage.getItem(BILLING_LAST_RUN_KEY);
  if (lastRun === todayKey) return;

  let subscriptions: any[] = [];
  try {
    const raw = localStorage.getItem(SUBSCRIPTIONS_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    subscriptions = Array.isArray(parsed) ? parsed : [];
  } catch {
    subscriptions = [];
  }

  let updated = [...subscriptions];
  let didUpdate = false;

  for (let i = 0; i < updated.length; i += 1) {
    const sub = updated[i];
    if (!sub || sub.status !== "LIVE" || !sub.generateInvoices) continue;

    const scheduled = sub.scheduledUpdate;
    if (scheduled?.applyOn) {
      const applyOnDate = parseSubscriptionDate(scheduled.applyOn);
      if (applyOnDate && applyOnDate.getTime() <= now.getTime()) {
        const payload = scheduled.payload || {};
        updated[i] = {
          ...sub,
          ...payload,
          id: sub.id,
          scheduledUpdate: null,
          scheduledUpdateDate: "",
        };
      }
    }

    const nextBillingDate = parseSubscriptionDate(updated[i]?.nextBillingOn);
    if (!nextBillingDate) continue;
    if (nextBillingDate.getTime() > now.getTime()) continue;

    try {
      const invoicePayload = await buildInvoicePayload(updated[i], nextBillingDate);
      await invoicesAPI.create(invoicePayload);
    } catch {
      // ignore invoice creation errors
    }

    const next = addMonths(nextBillingDate, 1);
    updated[i] = {
      ...updated[i],
      lastBilledOn: formatSubscriptionDate(nextBillingDate),
      nextBillingOn: formatSubscriptionDate(next),
    };
    didUpdate = true;
  }

  if (didUpdate) {
    try {
      localStorage.setItem(SUBSCRIPTIONS_STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // ignore storage errors
    }
  }
  try {
    localStorage.setItem(BILLING_LAST_RUN_KEY, todayKey);
  } catch {
    // ignore storage errors
  }
};

