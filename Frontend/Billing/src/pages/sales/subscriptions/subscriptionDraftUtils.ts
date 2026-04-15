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

const mapQuoteItemToAddonLine = (item: any, index: number) => {
  const quantity = parseNumber(item?.quantity, 1) || 1;
  const rate = parseNumber(item?.unitPrice ?? item?.rate ?? item?.price ?? 0, 0);
  const amount = parseNumber(item?.total ?? item?.amount ?? quantity * rate, 0);

  return {
    id: index + 1,
    addonId: asTrimmed(item?.addonId || item?.itemId || item?.id || ""),
    addonName: asTrimmed(item?.addonName || item?.name || item?.item?.name || item?.itemDetails || "Add-on"),
    description: asTrimmed(item?.description || item?.itemDetails || ""),
    quantity,
    rate,
    baseRate: parseNumber(item?.baseRate ?? item?.unitPrice ?? item?.rate ?? item?.price ?? 0, 0),
    tax: asTrimmed(item?.tax || "Select a Tax"),
    taxRate: parseNumber(item?.taxRate, 0),
    amount,
  };
};

const normalizeQuoteLocation = (source: any) =>
  asTrimmed(source?.selectedLocation || source?.location || "Head Office");

const normalizeQuotePriceList = (source: any) =>
  asTrimmed(source?.selectedPriceList || source?.priceListName || source?.priceList || "Select Price List");

const formatQuoteDiscountValue = (source: any) => {
  const rawDiscount = parseNumber(source?.discountAmount ?? source?.discount, 0);
  if (rawDiscount <= 0) return "";

  const discountType = String(source?.discountType || "").trim().toLowerCase();
  const currency = asTrimmed(source?.currency || parseCurrencyFromAmount(source?.amount) || "USD");

  if (discountType === "amount") {
    return `${currency}${rawDiscount.toFixed(2)}`;
  }

  if (discountType === "percent") {
    return `${rawDiscount}%`;
  }

  return rawDiscount > 100 ? `${currency}${rawDiscount.toFixed(2)}` : `${rawDiscount}%`;
};

const isHeaderQuoteItem = (item: any) => String(item?.itemType || item?.type || "").trim().toLowerCase() === "header";

const getQuoteItemLabel = (item: any) =>
  asTrimmed(
    item?.itemDetails ||
      item?.name ||
      item?.item?.name ||
      item?.description ||
      item?.itemName ||
      item?.title ||
      ""
  );

const getMeaningfulQuoteItems = (items: any[]) =>
  (Array.isArray(items) ? items : []).filter((item) => !isHeaderQuoteItem(item) && Boolean(getQuoteItemLabel(item) || parseNumber(item?.quantity, 0) > 0));

const resolveQuoteCustomerId = (source: any) =>
  asTrimmed(
    source?.customerId ||
      source?.customerID ||
      source?.customer?.id ||
      source?.customer?._id ||
      source?.customer?.customerId ||
      ""
  );

const resolveQuoteCustomerName = (source: any) => {
  const customer = source?.customer && typeof source.customer === "object" ? source.customer : null;
  const customerFullName = customer ? `${customer?.firstName || ""} ${customer?.lastName || ""}`.trim() : "";
  return asTrimmed(
    source?.customerName ||
      source?.customerDisplayName ||
      customer?.displayName ||
      customer?.companyName ||
      customer?.name ||
      customerFullName ||
      ""
  );
};

const resolveQuoteProductId = (source: any, primaryItem: any) =>
  asTrimmed(
    source?.productId ||
      source?.product?.id ||
      source?.product?._id ||
      source?.product?.productId ||
      primaryItem?.product ||
      primaryItem?.productId ||
      primaryItem?.item?.productId ||
      primaryItem?.item?.product?._id ||
      primaryItem?.item?.product?.id ||
      primaryItem?.item?.product?.productId ||
      ""
  );

const resolveQuoteProductName = (source: any, primaryItem: any) =>
  asTrimmed(
    source?.productName ||
      source?.product?.displayName ||
      source?.product?.name ||
      source?.product?.productName ||
      source?.product?.title ||
      source?.product?.productTitle ||
      (typeof source?.product === "string" ? source.product : "") ||
      (typeof primaryItem?.product === "string" ? primaryItem.product : "") ||
      primaryItem?.productName ||
      primaryItem?.product?.displayName ||
      primaryItem?.product?.name ||
      primaryItem?.product?.productName ||
      primaryItem?.product?.title ||
      primaryItem?.product?.productTitle ||
      primaryItem?.item?.productName ||
      primaryItem?.item?.product?.displayName ||
      primaryItem?.item?.product?.name ||
      primaryItem?.item?.product?.productName ||
      primaryItem?.item?.product?.title ||
      primaryItem?.item?.product?.productTitle ||
      primaryItem?.name ||
      primaryItem?.itemDetails ||
      primaryItem?.title ||
      ""
  );

const resolveQuoteCouponName = (source: any) => {
  const existing = asTrimmed(source?.coupon || source?.couponName || "");
  if (existing) return existing;
  return parseNumber(source?.discountAmount ?? source?.discount, 0) > 0 ? "Quote Discount" : "";
};

const resolveQuoteCouponCode = (source: any, couponName: string) => {
  const existing = asTrimmed(source?.couponCode || "");
  if (existing) return existing;
  if (!couponName) return "";
  return asTrimmed(source?.quoteNumber || source?.referenceNumber || source?.id || source?._id || "");
};

const resolveQuoteCouponValue = (source: any) => asTrimmed(source?.couponValue || formatQuoteDiscountValue(source) || "0.00");

const resolveQuoteReportingTag = (source: any) => {
  const directValue = asTrimmed(source?.tag || source?.reportingTag || source?.customZxc || "");
  if (directValue) return directValue;

  const tags = Array.isArray(source?.reportingTags) ? source.reportingTags : [];
  for (const tag of tags) {
    const candidate = asTrimmed(
      tag?.value ||
        tag?.name ||
        tag?.tagName ||
        tag?.label ||
        tag?.text ||
        tag?.reportingTag ||
        ""
    );
    if (candidate) return candidate;
  }

  return "";
};

const resolveQuoteSalespersonId = (source: any) =>
  asTrimmed(
    source?.salespersonId ||
      source?.salesperson?.id ||
      source?.salesperson?._id ||
      ""
  );

const resolveQuoteSalespersonName = (source: any) =>
  asTrimmed(
    source?.salespersonName ||
      source?.salesperson?.name ||
      source?.salesperson?.displayName ||
      source?.salesperson?.fullName ||
      (typeof source?.salesperson === "string" ? source.salesperson : "") ||
      ""
  );

export const buildSubscriptionDraftFromQuote = (source: any) => {
  const items = Array.isArray(source?.items) ? source.items : [];
  const meaningfulItems = getMeaningfulQuoteItems(items);
  const primaryItem = meaningfulItems[0] || items[0] || {};
  const sourceObject = source && typeof source === "object" ? source : {};
  const { customZxc: _customZxc, ...restSource } = sourceObject as Record<string, any>;
  const quoteDate = asTrimmed(source?.quoteDate || source?.date || source?.createdAt || new Date().toISOString().split("T")[0]);
  const normalizedBillingAddress =
    source?.billingAddress && typeof source.billingAddress === "object"
      ? source.billingAddress
      : source?.customer?.billingAddress && typeof source.customer.billingAddress === "object"
        ? source.customer.billingAddress
        : null;
  const normalizedShippingAddress =
    source?.shippingAddress && typeof source.shippingAddress === "object"
      ? source.shippingAddress
      : source?.customer?.shippingAddress && typeof source.customer.shippingAddress === "object"
        ? source.customer.shippingAddress
        : null;
  const customerId = resolveQuoteCustomerId(source);
  const customerName = resolveQuoteCustomerName(source);
  const productId = resolveQuoteProductId(source, primaryItem);
  const productName = resolveQuoteProductName(source, primaryItem);
  const salespersonId = resolveQuoteSalespersonId(source);
  const salespersonName = resolveQuoteSalespersonName(source);
  const planName = asTrimmed(
    source?.planName ||
      primaryItem?.planName ||
      primaryItem?.name ||
      primaryItem?.item?.name ||
      primaryItem?.itemDetails ||
      "Select a Plan"
  );
  const planDescription = asTrimmed(source?.planDescription || primaryItem?.description || "");
  const quantity = parseNumber(source?.quantity ?? primaryItem?.quantity, 1) || 1;
  const price = parseNumber(source?.price ?? source?.basePrice ?? primaryItem?.unitPrice ?? primaryItem?.rate ?? primaryItem?.price, 0);
  const tax = asTrimmed(source?.tax || primaryItem?.tax || "Select a Tax");
  const taxRate = parseNumber(source?.taxRate ?? primaryItem?.taxRate, 0);
  const addonLines = Array.isArray(source?.addonLines) && source.addonLines.length > 0
    ? source.addonLines
    : meaningfulItems.slice(1).map((item: any, index: number) => mapQuoteItemToAddonLine(item, index));
  const coupon = resolveQuoteCouponName(source);
  const couponCode = resolveQuoteCouponCode(source, coupon);
  const couponValue = resolveQuoteCouponValue(source);
  const quoteId = asTrimmed(source?.quoteId || source?.id || source?._id || "");

  return {
    ...restSource,
    id: "",
    quoteId,
    sourceType: "quote",
    customerId,
    customerName,
    customerEmail: asTrimmed(source?.customerEmail || source?.contactPersons?.[0]?.email || ""),
    contactPersons: Array.isArray(source?.contactPersons)
      ? source.contactPersons
      : source?.customerEmail
        ? [{ email: String(source.customerEmail).trim() }]
        : [],
    billingAddress: normalizedBillingAddress,
    shippingAddress: normalizedShippingAddress,
    currency: asTrimmed(source?.currency || parseCurrencyFromAmount(source?.amount) || "USD"),
    selectedLocation: normalizeQuoteLocation(source),
    selectedPriceList: normalizeQuotePriceList(source),
    location: normalizeQuoteLocation(source),
    priceListName: normalizeQuotePriceList(source),
    productId,
    productName,
    planName,
    planDescription,
    quantity,
    price,
    basePrice: parseNumber(source?.basePrice ?? price, 0) || 0,
    tax,
    taxRate,
    taxPreference: asTrimmed(source?.taxPreference || "Tax Exclusive"),
    contentType: asTrimmed(source?.contentType || "product"),
    items: meaningfulItems.length > 0 ? meaningfulItems : items,
    customerNotes: asTrimmed(source?.customerNotes || ""),
    expiresAfter: asTrimmed(source?.expiresAfter || ""),
    neverExpires: Boolean(source?.neverExpires ?? false),
    tag: resolveQuoteReportingTag(source),
    reportingTags: Array.isArray(source?.reportingTags) ? source.reportingTags : [],
    startDate: quoteDate,
    activatedOn: quoteDate,
    createdOn: asTrimmed(source?.createdOn || quoteDate),
    coupon,
    couponCode,
    couponValue,
    addonLines,
    priceListId: asTrimmed(source?.priceListId || ""),
    subscriptionNumber: asTrimmed(source?.subscriptionNumber || ""),
    referenceNumber: asTrimmed(source?.referenceNumber || source?.quoteNumber || ""),
    salesperson: salespersonName,
    salespersonId,
    salespersonName,
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
    lastBilledOn: asTrimmed(source?.lastBilledOn || ""),
    nextBillingOn: asTrimmed(source?.nextBillingOn || ""),
    status: asTrimmed(source?.status || ""),
    profileName: asTrimmed(source?.profileName || ""),
    billEveryCount: parseNumber(source?.billEveryCount, 1) || 1,
    billEveryUnit: asTrimmed(source?.billEveryUnit || "Week(s)"),
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

export const buildSubscriptionEditDraft = (source: any) => {
  const items = Array.isArray(source?.items) ? source.items : [];
  const meaningfulItems = getMeaningfulQuoteItems(items);
  const sourceObject = source && typeof source === "object" ? source : {};
  const { customZxc: _customZxc, ...restSource } = sourceObject as Record<string, any>;
  const addonLines = Array.isArray(source?.addonLines) && source.addonLines.length > 0
    ? source.addonLines
    : meaningfulItems.slice(1).map((item: any, index: number) => mapQuoteItemToAddonLine(item, index));
  const contactPersons = Array.isArray(source?.contactPersons)
    ? source.contactPersons
    : source?.customerEmail
    ? [{ email: String(source.customerEmail).trim() }]
    : [];
  const startDate = asTrimmed(source?.startDate || source?.activatedOn || source?.createdOn || new Date().toISOString().split("T")[0]);
  const currency = asTrimmed(source?.currency || parseCurrencyFromAmount(source?.amount) || "USD");
  const selectedLocation = normalizeQuoteLocation(source);
  const selectedPriceList = normalizeQuotePriceList(source);
  const customerId = resolveQuoteCustomerId(source);
  const customerName = resolveQuoteCustomerName(source);
  const productId = resolveQuoteProductId(source, meaningfulItems[0] || items[0] || {});
  const productName = resolveQuoteProductName(source, meaningfulItems[0] || items[0] || {});
  const salespersonId = resolveQuoteSalespersonId(source);
  const salespersonName = resolveQuoteSalespersonName(source);
  const coupon = resolveQuoteCouponName(source);
  const couponCode = resolveQuoteCouponCode(source, coupon);
  const couponValue = resolveQuoteCouponValue(source);
  const sourceId = asTrimmed(source?.id || source?._id || "");
  const isQuoteConversion = String(source?.sourceType || "").trim().toLowerCase() === "quote" && !sourceId;
  const quoteId = asTrimmed(source?.quoteId || source?.sourceQuoteId || source?.convertedFromQuote || (isQuoteConversion ? sourceId : ""));

  return {
    ...restSource,
    id: isQuoteConversion ? "" : sourceId,
    quoteId,
    sourceType: isQuoteConversion ? "quote" : asTrimmed(source?.sourceType || ""),
    customerId,
    customerName,
    customerEmail: asTrimmed(source?.customerEmail || source?.contactPersons?.[0]?.email || ""),
    contactPersons,
    billingAddress: source?.billingAddress ?? null,
    shippingAddress: source?.shippingAddress ?? null,
    currency,
    selectedLocation,
    selectedPriceList,
    location: selectedLocation,
    productId,
    productName,
    planName: asTrimmed(source?.planName || "Select a Plan"),
    planDescription: asTrimmed(source?.planDescription || ""),
    quantity: parseNumber(source?.quantity, 1) || 1,
    price: parseNumber(source?.price, 0) || 0,
    basePrice: parseNumber(source?.basePrice ?? source?.price, 0) || 0,
    tax: asTrimmed(source?.tax || "Select a Tax"),
    taxRate: parseNumber(source?.taxRate, 0) || 0,
    taxPreference: asTrimmed(source?.taxPreference || "Tax Exclusive"),
    contentType: asTrimmed(source?.contentType || "product"),
    items: meaningfulItems.length > 0 ? meaningfulItems : items,
    customerNotes: asTrimmed(source?.customerNotes || ""),
    expiresAfter: asTrimmed(source?.expiresAfter || ""),
    neverExpires: Boolean(source?.neverExpires ?? false),
    tag: resolveQuoteReportingTag(source),
    reportingTags: Array.isArray(source?.reportingTags) ? source.reportingTags : [],
    startDate,
    quoteNumber: asTrimmed(source?.quoteNumber || ""),
    referenceNumber: asTrimmed(source?.referenceNumber || source?.quoteNumber || ""),
    coupon,
    couponCode,
    couponValue,
    addonLines,
    priceListId: asTrimmed(source?.priceListId || ""),
    priceListName: selectedPriceList,
    subscriptionNumber: asTrimmed(source?.subscriptionNumber || ""),
    salesperson: salespersonName,
    salespersonId,
    salespersonName,
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
