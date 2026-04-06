export type QuoteColumnOption = {
  key: string;
  label: string;
  locked: boolean;
};

export const defaultQuoteViews = [
  "All Quotes",
  "Open Quotes",
  "Sent",
  "Accepted",
  "Declined",
  "Expired",
  "Converted to Invoice",
  "Draft Quotes",
];

export const defaultVisibleColumns = [
  "date",
  "location",
  "quoteNumber",
  "referenceNumber",
  "customerName",
  "status",
  "amount",
];

export const allColumnOptions: QuoteColumnOption[] = [
  { key: "date", label: "Date", locked: true },
  { key: "location", label: "Location", locked: true },
  { key: "quoteNumber", label: "Quote Number", locked: true },
  { key: "referenceNumber", label: "Reference number", locked: false },
  { key: "customerName", label: "Customer Name", locked: true },
  { key: "status", label: "Status", locked: true },
  { key: "amount", label: "Amount", locked: true },
  { key: "acceptedDate", label: "Accepted Date", locked: false },
  { key: "companyName", label: "Company Name", locked: false },
  { key: "declinedDate", label: "Declined Date", locked: false },
  { key: "expiryDate", label: "Expiry Date", locked: false },
  { key: "salesperson", label: "Sales person", locked: false },
  { key: "subTotal", label: "Sub Total", locked: false },
];

export const lockedColumnKeys = allColumnOptions.filter((col) => col.locked).map((col) => col.key);
export const allColumnKeys = allColumnOptions.map((col) => col.key);

export const defaultColumnWidths: Record<string, number> = {
  date: 150,
  location: 150,
  quoteNumber: 150,
  referenceNumber: 180,
  customerName: 250,
  status: 120,
  amount: 120,
  acceptedDate: 150,
  companyName: 200,
  declinedDate: 150,
  expiryDate: 150,
  salesperson: 150,
  subTotal: 150,
};

export const defaultSortConfig = {
  key: "createdTime",
  direction: "desc" as "asc" | "desc",
};

export const exportStatusOptions = [
  "All",
  "Draft",
  "Pending Approval",
  "Approved",
  "Sent",
  "Invoiced",
  "Accepted",
  "Declined",
  "Expired",
  "Rejected",
  "Partially Invoiced",
];

export const sortMenuOptions = [
  { key: "createdTime", label: "Created Time" },
  { key: "lastModifiedTime", label: "Last Modified Time" },
  { key: "date", label: "Date" },
  { key: "quoteNumber", label: "Quote Number" },
  { key: "customerName", label: "Customer Name" },
  { key: "amount", label: "Amount" },
];

export const searchTypeOptions = [
  "Customers",
  "Items",
  "Inventory Adjustments",
  "Banking",
  "Quotes",
  "Invoices",
  "Payments Received",
  "Recurring Invoices",
  "Credit Notes",
  "Vendors",
  "Expenses",
  "Recurring Expenses",
  "Purchase Orders",
  "Bills",
  "Payments Made",
  "Recurring Bills",
  "Vendor Credits",
  "Projects",
  "Timesheet",
  "Journals",
  "Chart of Accounts",
  "Documents",
  "Task",
];

export const defaultExportQuotesData = {
  module: "Quotes",
  status: "All",
  dateFrom: "",
  dateTo: "",
  exportTemplate: "",
  decimalFormat: "1234567.89",
  fileFormat: "XLSX",
  includeSensitive: false,
  password: "",
};

export const defaultExportCurrentViewData = {
  decimalFormat: "1234567.89",
  fileFormat: "XLSX",
  password: "",
};

export const defaultAdvancedSearchData: Record<string, any> = {
  searchType: "Quotes",
  filterType: "All",
  displayName: "",
  companyName: "",
  lastName: "",
  status: "All",
  address: "",
  customerType: "",
  firstName: "",
  email: "",
  phone: "",
  notes: "",
  itemName: "",
  description: "",
  purchaseRate: "",
  salesAccount: "",
  sku: "",
  rate: "",
  purchaseAccount: "",
  referenceNumber: "",
  reason: "",
  itemDescription: "",
  adjustmentType: "All",
  dateFrom: "",
  dateTo: "",
  totalRangeFrom: "",
  totalRangeTo: "",
  dateRangeFrom: "",
  dateRangeTo: "",
  transactionType: "",
  quoteNumber: "",
  referenceNumberQuote: "",
  itemNameQuote: "",
  itemDescriptionQuote: "",
  totalRangeFromQuote: "",
  totalRangeToQuote: "",
  customerName: "",
  salesperson: "",
  projectName: "",
  taxExemptions: "",
  addressType: "Billing and Shipping",
  attention: "",
  dateRangeStart: "",
  dateRangeEnd: "",
  totalRangeStart: "",
  totalRangeEnd: "",
  tax: "",
  addressLine: "",
  invoiceNumber: "",
  orderNumber: "",
  createdBetweenFrom: "",
  createdBetweenTo: "",
  itemNameInvoice: "",
  itemDescriptionInvoice: "",
  account: "",
  totalRangeFromInvoice: "",
  totalRangeToInvoice: "",
  customerNameInvoice: "",
  salespersonInvoice: "",
  projectNameInvoice: "",
  taxExemptionsInvoice: "",
  addressTypeInvoice: "Billing and Shipping",
  attentionInvoice: "",
  paymentNumber: "",
  referenceNumberPayment: "",
  dateRangeFromPayment: "",
  dateRangeToPayment: "",
  totalRangeFromPayment: "",
  totalRangeToPayment: "",
  statusPayment: "",
  paymentMethod: "",
  notesPayment: "",
  expenseNumber: "",
  vendorName: "",
};

export const ensureLockedColumns = (keys: string[]) => {
  const next = Array.from(new Set(keys));
  lockedColumnKeys.forEach((key) => {
    if (!next.includes(key)) next.push(key);
  });
  return next;
};

export const buildTempColumnOrder = (currentVisible: string[]) => {
  const cleanVisible = Array.from(new Set(currentVisible.filter((key) => allColumnKeys.includes(key))));
  const remaining = allColumnKeys.filter((key) => !cleanVisible.includes(key));
  return [...cleanVisible, ...remaining];
};

export const normalizeStatusKey = (value: any) => String(value || "").toLowerCase().replace(/[\s_-]+/g, "");

export const parseDateSafe = (value: any) => {
  if (!value) return null;
  const direct = new Date(value);
  if (!Number.isNaN(direct.getTime())) return direct;
  const text = String(value);
  const ddmmyyyy = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (ddmmyyyy) {
    const [, d, m, y] = ddmmyyyy;
    const parsed = new Date(Number(y), Number(m) - 1, Number(d));
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
};

export const formatDateISO = (value: any) => {
  const parsed = parseDateSafe(value);
  if (!parsed) return "";
  return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}-${String(parsed.getDate()).padStart(2, "0")}`;
};

export const formatDate = (dateString: any) => {
  if (!dateString) return "-";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export const formatCurrency = (amount: any, currency = "USD") => {
  const currencySymbol = currency ? String(currency).split(" - ")[0].split(" ")[0] : "USD";
  return `${currencySymbol}${parseFloat(amount || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

export const formatAmount = (num: any, currency = "USD") => {
  const currencySymbols: Record<string, string> = {
    USD: "$",
    INR: "₹",
    EUR: "€",
    GBP: "£",
    AED: "د.إ",
    AUD: "A$",
    CAD: "C$",
    KES: "KSh",
  };
  const symbol = currencySymbols[String(currency || "USD").toUpperCase()] || String(currency || "USD");
  return `${symbol}${Number(num || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export const getStatusColor = (status: string) => {
  const statusColors: Record<string, string> = {
    draft: "#f59e0b",
    pendingapproval: "#f97316",
    approved: "#16a34a",
    sent: "#2563eb",
    invoiced: "#0d4a52",
    converted: "#0d4a52",
    accepted: "#0d4a52",
    declined: "#dc2626",
    rejected: "#dc2626",
    expired: "#6b7280",
  };
  return statusColors[normalizeStatusKey(status)] || "#6b7280";
};

export const getStatusText = (status: string) => {
  const s = normalizeStatusKey(status);
  const statusTexts: Record<string, string> = {
    draft: "Draft",
    pendingapproval: "Pending Approval",
    approved: "Approved",
    sent: "Sent",
    invoiced: "Invoiced",
    converted: "Invoiced",
    accepted: "Accepted",
    declined: "Declined",
    rejected: "Declined",
    expired: "Expired",
  };
  return statusTexts[s] || String(status || "Draft");
};

export const getStatusDisplay = (status: string) => getStatusText(status);

export const getStatusClass = (status: string) => {
  const s = normalizeStatusKey(status);
  const statusClasses: Record<string, string> = {
    draft: "text-yellow-700",
    pendingapproval: "text-orange-600",
    approved: "text-emerald-700",
    sent: "text-blue-700",
    invoiced: "text-[#0D4A52]",
    converted: "text-[#0D4A52]",
    accepted: "text-[#0D4A52]",
    declined: "text-red-700",
    rejected: "text-red-700",
    expired: "text-gray-700",
  };
  return statusClasses[s] || "text-gray-700";
};

export const resolveCustomerName = (quote: any, customers: any[] = []) => {
  if (typeof quote?.customer === "object" && quote.customer) {
    const name = quote.customer.displayName || quote.customer.name || quote.customer.companyName;
    if (name) return name;
  }

  const customerId = quote?.customerId || (typeof quote?.customer === "string" ? quote.customer : quote?.customer?._id || quote?.customer?.id);
  if (customerId) {
    const found = customers.find((c) => (c._id || c.id) === customerId);
    if (found) return found.displayName || found.name || found.companyName || found.company_name;
  }

  if (quote?.customerName && String(quote.customerName).startsWith("cus-")) {
    const found = customers.find((c) => (c._id || c.id) === quote.customerName);
    if (found) return found.displayName || found.name || found.companyName;
  }

  return quote?.customerName || (typeof quote?.customer === "string" ? quote.customer : "") || "N/A";
};

export const getQuoteFieldValue = (quote: any, fieldName: string, customers: any[] = []) => {
  const fieldMap: Record<string, any> = {
    Date: quote.quoteDate || quote.date || "",
    "Quote#": quote.quoteNumber || quote.id || "",
    "Reference Number": quote.referenceNumber || "",
    "Customer Name": resolveCustomerName(quote, customers),
    Status: quote.status || "draft",
    Amount: quote.total || quote.amount || 0,
    "Project Name": quote.projectName || "",
    Salesperson: quote.salesperson || "",
  };
  return fieldMap[fieldName] !== undefined ? fieldMap[fieldName] : "";
};

export const evaluateCriterion = (fieldValue: any, comparator: string, value: any) => {
  const fieldStr = String(fieldValue || "").toLowerCase();
  const valueStr = String(value || "").toLowerCase();

  switch (comparator) {
    case "is":
      return fieldStr === valueStr;
    case "is not":
      return fieldStr !== valueStr;
    case "starts with":
      return fieldStr.startsWith(valueStr);
    case "contains":
      return fieldStr.includes(valueStr);
    case "doesn't contain":
      return !fieldStr.includes(valueStr);
    case "is in":
      return valueStr.split(",").map((v) => v.trim()).includes(fieldStr);
    case "is not in":
      return !valueStr.split(",").map((v) => v.trim()).includes(fieldStr);
    case "is empty":
      return !fieldValue || fieldStr === "";
    case "is not empty":
      return Boolean(fieldValue) && fieldStr !== "";
    default:
      return true;
  }
};

export const getEffectiveStatus = (quote: any) => {
  const statusRaw = String(quote?.status || "").toLowerCase();
  const expiry = parseDateSafe(quote?.expiryDate);
  if (expiry) {
    const expiryDate = new Date(expiry);
    const today = new Date();
    expiryDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    const isPast = expiryDate < today;
    const protectedStatuses = ["converted", "invoiced", "accepted", "approved", "declined", "rejected"];
    if (isPast && !protectedStatuses.includes(statusRaw)) {
      return "expired";
    }
  }
  return statusRaw || "draft";
};

export const buildQuoteExportRows = (quotes: any[], customers: any[] = []) => {
  return quotes.map((quote) => ({
    ESTIMATE_ID: quote.id || quote._id || "",
    Date: formatDate(quote.date || quote.quoteDate),
    Location: quote.selectedLocation || quote.location || "Head Office",
    "Quote Number": quote.quoteNumber || quote.id,
    "Reference number": quote.referenceNumber || "",
    "Customer Name": resolveCustomerName(quote, customers),
    Status: getStatusDisplay(quote.status),
    Amount: formatAmount(quote.total || quote.amount, quote.currency),
  }));
};

export const getQuoteRowsForDetailedExport = (
  quotes: any[],
  exportStatus: string,
  dateFrom: any,
  dateTo: any
) => {
  const statusFilterKey = normalizeStatusKey(exportStatus);
  const fromDate = parseDateSafe(dateFrom);
  const toDate = parseDateSafe(dateTo);

  return quotes.filter((quote) => {
    if (statusFilterKey !== "all") {
      const quoteStatusKey = normalizeStatusKey(quote.status || getStatusDisplay(quote.status));
      if (quoteStatusKey !== statusFilterKey) return false;
    }

    if (!fromDate && !toDate) return true;
    const quoteDate = parseDateSafe(quote.quoteDate || quote.date);
    if (!quoteDate) return false;
    if (fromDate && quoteDate < fromDate) return false;
    if (toDate && quoteDate > toDate) return false;
    return true;
  });
};

export const buildDetailedQuoteExportRows = (quotes: any[], exportStatus: string, dateFrom: any, dateTo: any) => {
  const rows = getQuoteRowsForDetailedExport(quotes, exportStatus, dateFrom, dateTo);
  const detailedRows: any[] = [];

  rows.forEach((quote) => {
    const items = Array.isArray(quote.items) && quote.items.length > 0 ? quote.items : [{}];
    items.forEach((item: any) => {
      detailedRows.push({
        "Quote Date": formatDateISO(quote.quoteDate || quote.date),
        "Quote ID": quote.id || quote._id || "",
        "Quote Number": quote.quoteNumber || quote.id || "",
        "Quote Status": String(quote.status || "").toLowerCase(),
        "Customer ID": quote.customerId || quote.customer?._id || quote.customer?.id || "",
        "Branch Name": quote.selectedLocation || quote.location || "Head Office",
        "Location Name": quote.selectedLocation || quote.location || "Head Office",
        "Expiry Date": formatDateISO(quote.expiryDate),
        "PurchaseOrder": quote.referenceNumber || "",
        "Currency Code": quote.currency || "AMD",
        "Exchange Rate": Number(quote.exchangeRate ?? 1).toFixed(2),
        "Discount Type": quote.discountType ? "entity_level" : "",
        "Is Discount Before Tax": "true",
        "Entity Discount Percent": Number(quote.discount ?? 0).toFixed(2),
        "Is Inclusive Tax": String(quote.taxExclusive || "").toLowerCase().includes("inclusive"),
        "SubTotal": Number(quote.subTotal ?? 0).toFixed(2),
        "Total": Number(quote.total ?? quote.amount ?? 0).toFixed(2),
        "Adjustment": Number(quote.adjustment ?? 0).toFixed(2),
        "Notes": quote.customerNotes || "Looking forward for your business.",
        "Terms & Conditions": quote.termsAndConditions || "",
        "Subject": quote.subject || "",
        "Customer Name": quote.customerName || quote.customer?.displayName || quote.customer?.name || "",
        "Project Name": quote.projectName || "",
        "Project ID": quote.projectId || quote.project?._id || quote.project?.id || "",
        "Sales person": quote.salesperson || quote.salespersonName || "",
        "Billing Address": quote.billingAddress || "",
        "Billing City": quote.billingCity || "",
        "Billing State": quote.billingState || "",
        "Billing Country": quote.billingCountry || "",
        "Billing Code": quote.billingCode || "",
        "Billing Fax": quote.billingFax || "",
        "Template Name": quote.templateName || "Standard Template",
        "Adjustment Description": quote.adjustmentDescription || (Number(quote.adjustment || 0) !== 0 ? "Adjustment" : ""),
        "Shipping Address": quote.shippingAddress || "",
        "Shipping City": quote.shippingCity || "",
        "Shipping State": quote.shippingState || "",
        "Shipping Country": quote.shippingCountry || "",
        "Shipping Code": quote.shippingCode || "",
        "Shipping Fax": quote.shippingFax || "",
        Source: quote.source || "1",
        "Reference ID": quote.referenceId || "",
        "Last Sync Time": quote.lastSyncTime || "",
        "Entity Discount Amount": Number(quote.discountAmount ?? 0).toFixed(3),
        "Shipping Charge": Number(quote.shippingCharges ?? 0).toFixed(2),
        "Shipping Charge Tax ID": quote.shippingChargeTaxId || "",
        "Shipping Charge Tax Amount": Number(quote.shippingChargeTaxAmount ?? 0).toFixed(2),
        "Shipping Charge Tax Name": quote.shippingChargeTaxName || "",
        "Shipping Charge Tax %": quote.shippingChargeTaxPercent || "",
        "Shipping Charge Tax Type": quote.shippingChargeTaxType || "",
        "Item Name": item.itemDetails || item.name || "",
        "Item Desc": item.description || item.itemDesc || "",
        Quantity: Number(item.quantity ?? 1).toFixed(2),
        Discount: Number(item.discountPercent ?? 0).toFixed(2),
        "Discount Amount": Number(item.discountAmount ?? 0).toFixed(1),
        "Item Tax Amount": Number(item.taxAmount ?? 0).toFixed(2),
        "Item Total": Number(item.amount ?? item.total ?? 0).toFixed(2),
        "Product ID": item.productId || item.id || "",
        Account: item.account || "Sales",
        SKU: item.sku || "",
        "Usage unit": item.unit || "",
        "Item Price": Number(item.rate ?? 0).toFixed(2),
        "Tax ID": item.taxId || item.tax || "",
        "Item Tax": item.taxName || "",
        "Item Tax %": item.taxRate || "",
        "Item Tax Type": item.taxType || "",
        "Coupon Name": item.couponName || "",
        "Coupon Code": item.couponCode || "",
        "Item Code": item.itemCode || "",
        "Line Item Type": item.itemType || "Item",
        "Quote Type": "Quote",
        "LINEITEM.TAG.sc": item?.reportingTags?.[0]?.name || "",
        "TAG.wsq": quote?.reportingTags?.[0]?.name || "",
      });
    });
  });

  return detailedRows;
};

export const getOrganizationProfileForPdf = () => {
  try {
    const stored = localStorage.getItem("organizationProfile");
    if (stored) return JSON.parse(stored);
  } catch (error) {
    console.error("Error reading organization profile for quotes PDF:", error);
  }
  return null;
};

export const generateQuoteHTMLForQuote = (quote: any, organizationProfile?: any) => {
  const itemsHTML = (quote.items || [])
    .map((item: any, index: number) => {
      const rate = Number(item.rate || item.price || 0);
      const amount = Number(item.amount || (item.quantity * rate) || 0);
      const qty = Number(item.quantity || 0);
      const unit = item.unit || "pcs";
      const itemName = item.name || item.itemName || "Item";
      return `
        <tr>
          <td style="padding: 12px; font-size: 14px; color: #111;">${index + 1}</td>
          <td style="padding: 12px; font-size: 14px; color: #111;">${itemName}</td>
          <td style="padding: 12px; font-size: 14px; color: #111; text-align: right;">${qty} ${unit}</td>
          <td style="padding: 12px; font-size: 14px; color: #111; text-align: right;">${formatAmount(rate, quote.currency)}</td>
          <td style="padding: 12px; font-size: 14px; color: #111; text-align: right;">${formatAmount(amount, quote.currency)}</td>
        </tr>`;
    })
    .join("");

  const quoteDate = quote.quoteDate || quote.date || "";
  const formattedDate = formatDate(quoteDate);
  const date = new Date(quoteDate);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  const customerName =
    quote.customerName ||
    quote.customer?.displayName ||
    quote.customer?.companyName ||
    (typeof quote.customer === "string" ? quote.customer : "N/A");
  const total = formatAmount(quote.total || quote.amount || 0, quote.currency);
  const notes = quote.customerNotes || "Looking forward for your business.";
  const profile = organizationProfile || getOrganizationProfileForPdf() || {};
  const organizationName = profile.name || "TABAN ENTERPRISES";
  const organizationEmail = profile.email || "jirdehusseinkhalif@gmail.com";
  const organizationStreet = profile.address?.street || "taleex";
  const organizationCity = profile.address?.city || "mogadishu";
  const organizationState = profile.address?.state || "Nairobi";
  const organizationCountry = profile.address?.country || "Kenya";
  const organizationPhone = profile.phone || "";
  const hasSentRibbon = String(quote.status || "").toLowerCase() === "sent";
  const subTotal = formatAmount(quote.subTotal || quote.total || 0, quote.currency);

  return `
    <div style="font-family: Arial, sans-serif; color: #111; padding: 40px; background: white;">
      ${hasSentRibbon ? '<div style="position:absolute; top:0; left:0; color:#fff; background:#2563eb; padding:6px 42px; transform:rotate(-45deg);">SENT</div>' : ""}
      <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:32px;">
        <div>
          <div style="font-size:18px; font-weight:700; margin-bottom:4px;">${organizationName}</div>
          <div style="font-size:14px; color:#666; line-height:1.6;">
            ${organizationStreet}<br />
            ${organizationCity}<br />
            ${organizationState}<br />
            ${organizationCountry}<br />
            ${organizationEmail}
          </div>
        </div>
      </div>
      <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:32px;">
        <div>
          <div style="font-size:32px; font-weight:700; margin-bottom:8px;">QUOTE</div>
          <div style="font-size:16px; color:#666; font-weight:500;">#${quote.quoteNumber || quote.id}</div>
        </div>
        <div style="font-size:14px; color:#666;">${formattedDate || `${day}/${month}/${year}`}</div>
      </div>
      <div style="margin-bottom:32px;">
        <div style="font-size:14px; font-weight:600; margin-bottom:8px;">Bill To</div>
        <div style="font-size:16px; color:#2563eb; font-weight:500;">${customerName}</div>
      </div>
      <div style="margin-bottom:32px;">
        <table style="width:100%; border-collapse:collapse;">
          <thead>
            <tr style="background:#4b5563;">
              <th style="padding:12px; text-align:left; color:white; font-size:12px; font-weight:600;">#</th>
              <th style="padding:12px; text-align:left; color:white; font-size:12px; font-weight:600;">Item & Description</th>
              <th style="padding:12px; text-align:right; color:white; font-size:12px; font-weight:600;">Qty</th>
              <th style="padding:12px; text-align:right; color:white; font-size:12px; font-weight:600;">Rate</th>
              <th style="padding:12px; text-align:right; color:white; font-size:12px; font-weight:600;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHTML || `<tr><td colspan="5" style="padding:24px; text-align:center; color:#666; font-size:14px;">No items added</td></tr>`}
          </tbody>
        </table>
      </div>
      <div style="display:flex; justify-content:flex-end; margin-bottom:32px;">
        <div style="width:300px;">
          <div style="display:flex; justify-content:space-between; padding:8px 0; font-size:14px; color:#666;">
            <span>Sub Total</span>
            <span style="color:#111; font-weight:500;">${subTotal}</span>
          </div>
          ${quote.discount > 0 ? `<div style="display:flex; justify-content:space-between; padding:8px 0; font-size:14px; color:#666;"><span>Discount</span><span style="color:#111; font-weight:500;">-${formatAmount(quote.discount || 0, quote.currency)}</span></div>` : ""}
          ${quote.taxAmount > 0 ? `<div style="display:flex; justify-content:space-between; padding:8px 0; font-size:14px; color:#666;"><span>${quote.taxName || "Tax"}</span><span style="color:#111; font-weight:500;">${formatAmount(quote.taxAmount || 0, quote.currency)}</span></div>` : ""}
          <div style="display:flex; justify-content:space-between; padding:12px 0; font-size:16px; font-weight:700; border-top:2px solid #111; margin-top:8px;">
            <span>Total</span>
            <span>${total}</span>
          </div>
        </div>
      </div>
      <div style="margin-bottom:32px;">
        <div style="font-size:14px; font-weight:600; margin-bottom:8px;">Notes</div>
        <div style="font-size:14px; color:#666; line-height:1.6;">${notes}</div>
      </div>
    </div>
  `;
};
