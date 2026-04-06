import {
  contactStatusOptions,
  CustomerFormData,
  gstTreatmentOptions,
  taxRegimeOptions,
  taxTreatmentOptions,
  vatTreatmentOptions,
} from "./NewCustomer.constants";

export const MAX_CONTACT_NAME_LENGTH = 200;
export const MAX_COMPANY_NAME_LENGTH = 200;

const supportedZohoLanguageCodes = new Set(["de", "en", "es", "fr", "it", "ja", "nl", "pt", "sv", "zh"]);

const formLanguageToZohoCodeMap: Record<string, string> = {
  english: "en",
  german: "de",
  spanish: "es",
  french: "fr",
  italian: "it",
  japanese: "ja",
  dutch: "nl",
  portuguese: "pt",
  swedish: "sv",
  "chinese-simplified": "zh",
  "chinese-traditional": "zh",
};

const zohoCodeToFormLanguageMap: Record<string, string> = {
  de: "german",
  en: "english",
  es: "spanish",
  fr: "french",
  it: "italian",
  ja: "japanese",
  nl: "dutch",
  pt: "portuguese",
  sv: "swedish",
  zh: "chinese-simplified",
};

const paymentTermsAliases: Record<string, string> = {
  "dueonreceipt": "due-on-receipt",
  "dueendofnextmonth": "due-end-of-next-month",
  "dueendofthemonth": "due-end-of-the-month",
  "net15": "net-15",
  "net30": "net-30",
  "net45": "net-45",
  "net60": "net-60",
  "custom": "custom",
};

const paymentTermsByDays: Record<number, string> = {
  0: "due-on-receipt",
  15: "net-15",
  30: "net-30",
  45: "net-45",
  60: "net-60",
};

const paymentTermsLabelMap: Record<string, string> = {
  "due-on-receipt": "Due on Receipt",
  "due-end-of-next-month": "Due end of next month",
  "due-end-of-the-month": "Due end of the month",
  "net-15": "Net 15",
  "net-30": "Net 30",
  "net-45": "Net 45",
  "net-60": "Net 60",
  custom: "Custom",
};

const allowedStatusValues = new Set(
  contactStatusOptions.map((option) => option.value).filter(Boolean),
);
const allowedVatTreatmentValues = new Set(
  vatTreatmentOptions.map((option) => option.value).filter(Boolean),
);
const allowedTaxTreatmentValues = new Set(
  taxTreatmentOptions.map((option) => option.value).filter(Boolean),
);
const allowedTaxRegimeValues = new Set(
  taxRegimeOptions.map((option) => option.value).filter(Boolean),
);
const allowedGstTreatmentValues = new Set(
  gstTreatmentOptions.map((option) => option.value).filter(Boolean),
);

type PaymentTermLike = {
  label: string;
  value: string;
  days?: number | string;
};

const normalizeText = (value: any) =>
  String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

export const normalizeComparableName = (value: any) =>
  normalizeText(value).replace(/[^a-z0-9]+/g, "");

export const isValidEmail = (value: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

const isDigitsOnly = (value: string) => /^\d+$/.test(value);

export const resolveCustomerDisplayName = (
  formData: Pick<CustomerFormData, "displayName" | "companyName" | "firstName" | "lastName">,
) => {
  const direct = String(formData.displayName || "").trim();
  if (direct) return direct;

  const companyName = String(formData.companyName || "").trim();
  if (companyName) return companyName;

  const personName = [formData.firstName, formData.lastName]
    .map((part) => String(part || "").trim())
    .filter(Boolean)
    .join(" ");

  return personName.trim();
};

export const normalizeCustomerLanguageForForm = (value?: any) => {
  const raw = normalizeText(value);
  if (!raw) return "english";
  if (zohoCodeToFormLanguageMap[raw]) return zohoCodeToFormLanguageMap[raw];
  if (raw in formLanguageToZohoCodeMap) return raw;
  return String(value ?? "").trim() || "english";
};

export const normalizeZohoLanguageCode = (value?: any) => {
  const raw = normalizeText(value);
  if (!raw) return "en";
  if (supportedZohoLanguageCodes.has(raw)) return raw;
  return formLanguageToZohoCodeMap[raw] || "en";
};

export const normalizePaymentTermsForForm = (value?: any) => {
  const raw = String(value ?? "").trim();
  if (!raw) return "due-on-receipt";

  const lowered = normalizeText(raw);
  const compact = lowered.replace(/[^a-z0-9]/g, "");
  if (paymentTermsAliases[compact]) return paymentTermsAliases[compact];

  const numeric = Number(raw);
  if (Number.isFinite(numeric) && paymentTermsByDays[numeric] ) {
    return paymentTermsByDays[numeric];
  }

  const numericFromLabel = lowered.match(/(\d+)/)?.[1];
  if (numericFromLabel) {
    const byDays = paymentTermsByDays[Number(numericFromLabel)];
    if (byDays) return byDays;
  }

  return raw;
};

export const resolvePaymentTermsMeta = (
  value: any,
  paymentTermsList: PaymentTermLike[] = [],
) => {
  const normalizedValue = normalizePaymentTermsForForm(value);
  const selected = paymentTermsList.find((term) => term.value === normalizedValue) ||
    paymentTermsList.find((term) => normalizeText(term.label) === normalizeText(value));

  const daysValue = selected?.days;
  const parsedDays = Number(daysValue);

  return {
    value: normalizedValue,
    label: String(selected?.label || paymentTermsLabelMap[normalizedValue] || value || "").trim(),
    days: Number.isFinite(parsedDays) && String(daysValue ?? "").trim() !== "" ? parsedDays : undefined,
  };
};

type ValidationContext = {
  availableCurrencies?: any[];
  availableTaxes?: any[];
  enableCustomerNumbers?: boolean;
  resolvedCustomerNumber?: string;
};

export const buildCustomerValidationErrors = (
  formData: CustomerFormData,
  context: ValidationContext = {},
) => {
  const errors: Record<string, string> = {};

  const contactName = resolveCustomerDisplayName(formData);
  if (!contactName) {
    errors.displayName = "Enter a valid Contact Name.";
  } else if (contactName.length > MAX_CONTACT_NAME_LENGTH) {
    errors.displayName = "Contact Name must be 200 characters or fewer.";
  }

  const companyName = String(formData.companyName || "").trim();
  if (companyName.length > MAX_COMPANY_NAME_LENGTH) {
    errors.companyName = "Company Name must be 200 characters or fewer.";
  }

  const email = String(formData.email || "").trim();
  if (email && !isValidEmail(email)) {
    errors.email = "Enter a valid email address.";
  }

  const workPhone = String(formData.workPhone || "").trim();
  if (workPhone && !isDigitsOnly(workPhone)) {
    errors.workPhone = "Work Phone can contain digits only.";
  }

  const mobile = String(formData.mobile || "").trim();
  if (mobile && !isDigitsOnly(mobile)) {
    errors.mobile = "Mobile can contain digits only.";
  }

  const status = String(formData.status || "").trim().toLowerCase();
  if (status && !allowedStatusValues.has(status)) {
    errors.status = "Choose a valid contact status.";
  }

  const vatTreatment = String(formData.vatTreatment || "").trim();
  const vatRegNo = String(formData.vatRegNo || "").trim();
  if (vatTreatment && !allowedVatTreatmentValues.has(vatTreatment)) {
    errors.vatTreatment = "Choose a valid VAT treatment.";
  }
  if (vatRegNo && (vatRegNo.length < 2 || vatRegNo.length > 12)) {
    errors.vatRegNo = "VAT registration number must be between 2 and 12 characters.";
  }
  if (vatTreatment && !vatRegNo) {
    errors.vatRegNo = "Enter a VAT registration number.";
  }

  const countryCode = String(formData.countryCode || "").trim();
  if (countryCode && !/^[a-z]{2}$/i.test(countryCode)) {
    errors.countryCode = "Country code must contain exactly 2 letters.";
  }
  if ((vatTreatment || String(formData.avataxExemptNo || "").trim() || String(formData.avataxUseCode || "").trim()) && !countryCode) {
    errors.countryCode = "Enter a valid 2-letter country code.";
  }

  const taxTreatment = String(formData.taxTreatment || "").trim();
  const taxRegNo = String(formData.taxRegNo || "").trim();
  if (taxTreatment && !allowedTaxTreatmentValues.has(taxTreatment)) {
    errors.taxTreatment = "Choose a valid tax treatment.";
  }
  if (taxTreatment && !taxRegNo) {
    errors.taxRegNo = "Enter a tax registration number.";
  }

  const taxRegime = String(formData.taxRegime || "").trim();
  if (taxRegime && !allowedTaxRegimeValues.has(taxRegime)) {
    errors.taxRegime = "Choose a valid tax regime.";
  }

  const legalName = String(formData.legalName || "").trim();
  if (legalName.length > MAX_CONTACT_NAME_LENGTH) {
    errors.legalName = "Legal Name must be 200 characters or fewer.";
  }

  const gstTreatment = String(formData.gstTreatment || "").trim();
  const gstNo = String(formData.gstNo || "").trim();
  if (gstTreatment && !allowedGstTreatmentValues.has(gstTreatment)) {
    errors.gstTreatment = "Choose a valid GST treatment.";
  }
  if (gstTreatment === "business_gst" && !gstNo) {
    errors.gstNo = "Enter a GST identification number.";
  }
  if (gstNo && !/^[0-9A-Z]{15}$/i.test(gstNo.replace(/\s+/g, ""))) {
    errors.gstNo = "Enter a valid 15 character GST identification number.";
  }

  const isTdsRegistered = Boolean(formData.isTdsRegistered);
  const tdsTaxId = String(formData.tdsTaxId || "").trim();
  if (isTdsRegistered && !tdsTaxId) {
    errors.tdsTaxId = "Enter a TDS tax ID.";
  }

  const taxAuthorityName = String(formData.taxAuthorityName || "").trim();
  if (taxAuthorityName.length > MAX_CONTACT_NAME_LENGTH) {
    errors.taxAuthorityName = "Tax authority name must be 200 characters or fewer.";
  }

  const taxExemptionCode = String(formData.taxExemptionCode || "").trim();
  if (taxExemptionCode.length > MAX_CONTACT_NAME_LENGTH) {
    errors.taxExemptionCode = "Tax exemption code must be 200 characters or fewer.";
  }

  const avataxExemptNo = String(formData.avataxExemptNo || "").trim();
  if (avataxExemptNo.length > MAX_CONTACT_NAME_LENGTH) {
    errors.avataxExemptNo = "Avalara exemption number must be 200 characters or fewer.";
  }

  const avataxUseCode = String(formData.avataxUseCode || "").trim();
  if (avataxUseCode.length > MAX_CONTACT_NAME_LENGTH) {
    errors.avataxUseCode = "Avalara use code must be 200 characters or fewer.";
  }

  const currencies = Array.isArray(context.availableCurrencies) ? context.availableCurrencies : [];
  const currencyCode = String(formData.currency || "").trim().toUpperCase();
  if (currencies.length > 0 && currencyCode) {
    const currencyExists = currencies.some((currency) => {
      const code = String(currency?.code || currency?.currency_code || currency?.currencyCode || "").trim().toUpperCase();
      const currencyId = String(currency?.id || currency?._id || currency?.currency_id || "").trim().toUpperCase();
      return code === currencyCode || currencyId === currencyCode;
    });

    if (!currencyExists) {
      errors.currency = "This currency does not exist. Please choose a valid currency.";
    }
  }

  const taxes = Array.isArray(context.availableTaxes) ? context.availableTaxes : [];
  const taxRate = String(formData.taxRate || "").trim();
  if (taxes.length > 0 && taxRate) {
    const taxExists = taxes.some((tax: any) => {
      const id = String(tax?.id || tax?._id || tax?.tax_id || "").trim();
      return id === taxRate;
    });

    if (!taxExists) {
      errors.taxRate = "This tax does not exist. Please choose a valid tax.";
    }
  }

  if (context.enableCustomerNumbers !== false) {
    const customerNumber = String(
      context.resolvedCustomerNumber || formData.customerNumber || "",
    ).trim();
    if (!customerNumber) {
      errors.customerNumber = "Customer Number is required.";
    }
  }

  const contactPersons = Array.isArray(formData.contactPersons)
    ? formData.contactPersons
    : [];
  contactPersons.forEach((contact: any, index: number) => {
    const email = String(contact?.email || "").trim();
    if (email && !isValidEmail(email)) {
      const contactKey = String(contact?.id ?? index);
      errors[`contactPersons.${contactKey}.email`] = "Enter a valid email address.";
    }
  });
  const hasPortalEligibleContact = contactPersons.some((contact: any) =>
    String(contact?.email || "").trim() &&
    (String(contact?.firstName || "").trim() || String(contact?.lastName || "").trim()),
  );

  if (formData.enablePortal && !hasPortalEligibleContact) {
    errors.enablePortal = "Add at least one contact person with an email address before enabling portal access.";
  }

  return errors;
};

const apiErrorFieldMap: Record<number, { field: string; message: string }> = {
  1002: { field: "displayName", message: "Contact does not exist." },
  3013: { field: "displayName", message: "Enter a valid Contact Name." },
  3062: { field: "displayName", message: "The contact already exists. Please specify a different name." },
  9004: { field: "currency", message: "This currency does not exist. Please choose a valid currency." },
  31006: { field: "enablePortal", message: "Portal is disabled for your organization. Please contact support@zohoinvoice.com to enable it." },
};

export const mapCustomerApiErrorsToFormErrors = (response: any) => {
  const code = Number(response?.data?.code ?? response?.code ?? response?.error?.code ?? NaN);
  const message = String(response?.data?.message || response?.message || response?.error?.message || "").trim();
  const mapped = apiErrorFieldMap[code];

  if (mapped) {
    return {
      [mapped.field]: message || mapped.message,
    };
  }

  if (/contact name/i.test(message)) {
    return { displayName: message };
  }

  if (/duplicate customer display name/i.test(message) || /contact already exists/i.test(message)) {
    return { displayName: message };
  }

  if (/currency/i.test(message)) {
    return { currency: message };
  }

  if (/portal/i.test(message)) {
    return { enablePortal: message };
  }

  if (/vat/i.test(message) && /registration|reg/i.test(message)) {
    return { vatRegNo: message };
  }

  if (/gst/i.test(message)) {
    return { gstNo: message };
  }

  if (/tax regime/i.test(message)) {
    return { taxRegime: message };
  }

  if (/country code/i.test(message)) {
    return { countryCode: message };
  }

  if (/tax registration/i.test(message) || /tax no/i.test(message)) {
    return { taxRegNo: message };
  }

  if (/tds/i.test(message)) {
    return { tdsTaxId: message };
  }

  if (/tax authority/i.test(message)) {
    return { taxAuthorityName: message };
  }

  if (/avatax/i.test(message) && /exempt|certificate/i.test(message)) {
    return { avataxExemptNo: message };
  }

  if (/exemption/i.test(message) && /id/i.test(message)) {
    return { taxExemptionId: message };
  }

  if (/exemption/i.test(message) && /code/i.test(message)) {
    return { taxExemptionCode: message };
  }

  if (/avatax/i.test(message)) {
    return { avataxUseCode: message };
  }

  if (/payment reminder/i.test(message)) {
    return { paymentReminderEnabled: message };
  }

  if (/status/i.test(message)) {
    return { status: message };
  }

  return {};
};
