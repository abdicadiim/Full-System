const asTrimmed = (value: any, fallback = "") => String(value ?? fallback).trim();

const parseCurrencyFromAmount = (amount: any, fallback = "USD") => {
  const text = asTrimmed(amount);
  const match = text.match(/^[A-Za-z]+/);
  return match?.[0] || fallback;
};

const parseNumber = (value: any, fallback = 0) => {
  const numeric = Number(String(value ?? fallback).replace(/[^\d.-]/g, ""));
  return Number.isFinite(numeric) ? numeric : fallback;
};

export const buildSubscriptionEditDraft = (source: any) => {
  const items = Array.isArray(source?.items) ? source.items : [];
  const addonLines = Array.isArray(source?.addonLines) ? source.addonLines : [];
  const contactPersons = Array.isArray(source?.contactPersons)
    ? source.contactPersons
    : source?.customerEmail
    ? [{ email: String(source.customerEmail).trim() }]
    : [];
  const startDate = asTrimmed(source?.startDate || source?.activatedOn || source?.createdOn || new Date().toISOString().split("T")[0]);
  const currency = asTrimmed(source?.currency || parseCurrencyFromAmount(source?.amount) || "USD");

  return {
    id: asTrimmed(source?.id || source?._id || ""),
    customerId: asTrimmed(source?.customerId || source?.customerID || source?.customer?.id || source?.customer?._id || ""),
    customerName: asTrimmed(source?.customerName || source?.customer?.name || ""),
    customerEmail: asTrimmed(source?.customerEmail || source?.contactPersons?.[0]?.email || ""),
    contactPersons,
    billingAddress: source?.billingAddress ?? null,
    shippingAddress: source?.shippingAddress ?? null,
    currency,
    productId: asTrimmed(source?.productId || ""),
    productName: asTrimmed(source?.productName || source?.planName || ""),
    planName: asTrimmed(source?.planName || "Select a Plan"),
    planDescription: asTrimmed(source?.planDescription || ""),
    quantity: parseNumber(source?.quantity, 1) || 1,
    price: parseNumber(source?.price, 0) || 0,
    basePrice: parseNumber(source?.basePrice ?? source?.price, 0) || 0,
    tax: asTrimmed(source?.tax || "Select a Tax"),
    taxRate: parseNumber(source?.taxRate, 0) || 0,
    taxPreference: asTrimmed(source?.taxPreference || "Tax Exclusive"),
    contentType: asTrimmed(source?.contentType || "product"),
    items,
    customerNotes: asTrimmed(source?.customerNotes || ""),
    expiresAfter: asTrimmed(source?.expiresAfter || ""),
    neverExpires: Boolean(source?.neverExpires ?? false),
    tag: asTrimmed(source?.tag || ""),
    reportingTags: Array.isArray(source?.reportingTags) ? source.reportingTags : [],
    startDate,
    coupon: asTrimmed(source?.coupon || ""),
    couponCode: asTrimmed(source?.couponCode || ""),
    couponValue: asTrimmed(source?.couponValue || "0.00"),
    addonLines,
    priceListId: asTrimmed(source?.priceListId || ""),
    priceListName: asTrimmed(source?.priceListName || "Select Price List"),
    location: asTrimmed(source?.location || "Head Office"),
    subscriptionNumber: asTrimmed(source?.subscriptionNumber || ""),
    referenceNumber: asTrimmed(source?.referenceNumber || ""),
    salesperson: asTrimmed(source?.salesperson || source?.salespersonId || ""),
    salespersonName: asTrimmed(source?.salespersonName || ""),
    meteredBilling: Boolean(source?.meteredBilling ?? false),
    paymentMode: asTrimmed(source?.paymentMode || "offline"),
    paymentTerms: asTrimmed(source?.paymentTerms || "Due on Receipt"),
    partialPayments: Boolean(source?.partialPayments ?? false),
    prorateCharges: Boolean(source?.prorateCharges ?? true),
    generateInvoices: Boolean(source?.generateInvoices ?? true),
    manualRenewal: Boolean(source?.manualRenewal ?? false),
    manualRenewalInvoicePreference: asTrimmed(source?.manualRenewalInvoicePreference || "Generate a New Invoice"),
    manualRenewalFreeExtension: asTrimmed(source?.manualRenewalFreeExtension || ""),
    advanceBillingEnabled: Boolean(source?.advanceBillingEnabled ?? false),
    advanceBillingMethod: asTrimmed(source?.advanceBillingMethod || "Advance Invoice"),
    advanceBillingPeriodDays: parseNumber(source?.advanceBillingPeriodDays, 5) || 5,
    advanceBillingAutoGenerate: Boolean(source?.advanceBillingAutoGenerate ?? false),
    advanceBillingApplyUpcomingTerms: Boolean(source?.advanceBillingApplyUpcomingTerms ?? false),
    invoicePreference: asTrimmed(source?.invoicePreference || "Create and Send Invoices"),
    usageBillingEnabled: Boolean(source?.usageBillingEnabled ?? false),
    prepaidBillingEnabled: Boolean(source?.prepaidBillingEnabled ?? false),
    prepaidPlanName: asTrimmed(source?.prepaidPlanName || ""),
    drawdownCreditName: asTrimmed(source?.drawdownCreditName || ""),
    drawdownRate: asTrimmed(source?.drawdownRate || ""),
    consolidatedBillingEnabled: Boolean(source?.consolidatedBillingEnabled ?? false),
    calendarBillingMode: asTrimmed(source?.calendarBillingMode || "Same as a subscription's activation date"),
    calendarBillingDays: asTrimmed(source?.calendarBillingDays || ""),
    calendarBillingMonths: asTrimmed(source?.calendarBillingMonths || ""),
    invoiceTemplate: asTrimmed(source?.invoiceTemplate || "Standard Template"),
    roundOffPreference: asTrimmed(source?.roundOffPreference || "No Rounding"),
    createdOn: asTrimmed(source?.createdOn || ""),
    activatedOn: asTrimmed(source?.activatedOn || ""),
    lastBilledOn: asTrimmed(source?.lastBilledOn || ""),
    nextBillingOn: asTrimmed(source?.nextBillingOn || ""),
    status: asTrimmed(source?.status || ""),
    profileName: asTrimmed(source?.profileName || ""),
    billEveryCount: parseNumber(source?.billEveryCount, 1) || 1,
    billEveryUnit: asTrimmed(source?.billEveryUnit || "Week(s)"),
    customZxc: asTrimmed(source?.customZxc || ""),
    applyChanges: asTrimmed(source?.applyChanges || "immediately"),
    applyChangesDate: asTrimmed(source?.applyChangesDate || ""),
    backdatedGenerateInvoice: Boolean(source?.backdatedGenerateInvoice ?? true),
    immediateCharges: parseNumber(source?.immediateCharges, 0) || 0,
    amountReceived: parseNumber(source?.amountReceived, 0) || 0,
    paymentReceived: Boolean(source?.paymentReceived ?? false),
    paymentStatus: asTrimmed(source?.paymentStatus || ""),
    paymentDate: asTrimmed(source?.paymentDate || ""),
    depositTo: asTrimmed(source?.depositTo || ""),
    paymentNotes: asTrimmed(source?.paymentNotes || ""),
    paymentReferenceNumber: asTrimmed(source?.paymentReferenceNumber || ""),
  };
};
