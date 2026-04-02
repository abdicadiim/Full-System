const MONTHS = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
];

const DEFAULT_DATE_FORMAT = "dd MMM yyyy";
const DEFAULT_FIELD_SEPARATOR = " ";
const DEFAULT_LANGUAGE_CODE = "en";
const DEFAULT_TIME_ZONE = "UTC";
const DEFAULT_CURRENCY_CODE = "USD";
const MAX_BRANDING_LEN = 2_000_000;
const MAX_CUSTOM_FIELDS = 20;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PORTAL_NAME_REGEX = /^[A-Za-z0-9]{5,30}$/;
const LANGUAGE_CODE_REGEX = /^[A-Za-z]{2,10}(?:[-_][A-Za-z0-9]{2,10})?$/;

const LANGUAGE_NAME_TO_CODE: Record<string, string> = {
  arabic: "ar",
  english: "en",
  french: "fr",
  german: "de",
  hindi: "hi",
  portuguese: "pt",
  spanish: "es",
  swahili: "sw",
};

const hasOwn = (value: unknown, key: string) =>
  Boolean(value) && Object.prototype.hasOwnProperty.call(value as object, key);

const readFirstPresent = (source: unknown, keys: string[]) => {
  for (const key of keys) {
    if (hasOwn(source, key)) {
      return {
        present: true,
        key,
        value: (source as Record<string, unknown>)[key],
      };
    }
  }

  return {
    present: false,
    key: "",
    value: undefined,
  };
};

const trimTo = (value: unknown, maxLength: number) =>
  String(typeof value === "string" ? value : "").trim().slice(0, maxLength);

const titleCaseMonth = (month: string) =>
  month ? `${month.charAt(0).toUpperCase()}${month.slice(1)}` : "";

const normalizeBoolean = (value: unknown) =>
  typeof value === "boolean" ? value : undefined;

export const normalizeCurrencyCode = (value: unknown) => {
  const raw = trimTo(value, 32);
  if (!raw) return "";
  const code = raw.includes(" - ") ? raw.split(" - ")[0] : raw;
  return code.trim().toUpperCase();
};

export const normalizeMonthName = (value: unknown) => {
  if (typeof value === "number" && Number.isInteger(value) && value >= 0 && value < MONTHS.length) {
    return MONTHS[value];
  }

  const raw = trimTo(value, 80).toLowerCase();
  if (!raw) return "";
  if (MONTHS.includes(raw)) return raw;

  const firstChunk = raw.split(" - ")[0]?.trim() || "";
  if (MONTHS.includes(firstChunk)) return firstChunk;

  return "";
};

const inferMonthFromDate = (value: unknown) => {
  const raw = trimTo(value, 80);
  if (!raw) return "";
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return "";
  return MONTHS[parsed.getMonth()] || "";
};

const guessLanguageCode = (value: unknown) => {
  const raw = trimTo(value, 40).toLowerCase();
  if (!raw) return "";
  if (LANGUAGE_CODE_REGEX.test(raw)) return raw.replace("_", "-");
  return LANGUAGE_NAME_TO_CODE[raw] || "";
};

const isValidWebsite = (value: string) => {
  if (!value) return true;
  try {
    const url = new URL(value.startsWith("http://") || value.startsWith("https://") ? value : `https://${value}`);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
};

const normalizeWebsite = (value: unknown) => {
  const website = trimTo(value, 255);
  if (!website) return "";

  if (website.startsWith("http://") || website.startsWith("https://")) {
    return website;
  }

  return `https://${website}`;
};

const normalizeCustomFields = (value: unknown) => {
  if (!Array.isArray(value)) return [];

  return value
    .map((row: any, index) => {
      const label = trimTo(row?.label, 120);
      const nextValue = trimTo(row?.value, 255);
      const rowIndexRaw = Number(row?.index);
      const rowIndex = Number.isInteger(rowIndexRaw) && rowIndexRaw > 0 ? rowIndexRaw : index + 1;

      return {
        index: rowIndex,
        label,
        value: nextValue,
      };
    })
    .filter((row) => row.label || row.value)
    .slice(0, MAX_CUSTOM_FIELDS);
};

const regionNameFromIso = (iso2: string) => {
  if (!iso2) return "";
  try {
    const dn = new Intl.DisplayNames(["en"], { type: "region" });
    return dn.of(iso2.toUpperCase()) || iso2;
  } catch {
    return iso2;
  }
};

export const fiscalYearLabelFromStartMonth = (monthValue: unknown) => {
  const month = normalizeMonthName(monthValue) || "january";
  const startIndex = MONTHS.indexOf(month);
  const endMonth = MONTHS[(startIndex + 11) % MONTHS.length] || "december";
  return `${titleCaseMonth(month)} - ${titleCaseMonth(endMonth)}`;
};

const monthIndexFromValue = (value: unknown) => {
  const month = normalizeMonthName(value);
  return month ? MONTHS.indexOf(month) : 0;
};

const toDateOnly = (value: unknown) => {
  if (!value) return "";
  const parsed = new Date(String(value));
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().slice(0, 10);
};

export const buildOrganizationProfilePayload = (org: any, user?: any) => {
  const startMonth =
    normalizeMonthName(org?.fiscalYearStartMonth) ||
    normalizeMonthName(org?.fiscalYear) ||
    inferMonthFromDate(org?.fiscalYearStart) ||
    "january";
  const currencyCode = normalizeCurrencyCode(org?.currencyCode || org?.baseCurrency) || DEFAULT_CURRENCY_CODE;
  const language = trimTo(org?.language, 50);
  const languageCode = trimTo(org?.languageCode, 20).toLowerCase() || guessLanguageCode(language) || DEFAULT_LANGUAGE_CODE;
  const country = trimTo(org?.country, 80) || regionNameFromIso(trimTo(org?.countryIso, 2));

  return {
    id: String(org?._id || ""),
    organization_id: String(org?._id || ""),
    name: trimTo(org?.name, 100),
    organizationName: trimTo(org?.name, 100),
    logoUrl: trimTo(org?.logoUrl, MAX_BRANDING_LEN),
    logo: trimTo(org?.logoUrl, MAX_BRANDING_LEN),
    businessType: trimTo(org?.businessType, 80),
    industry: trimTo(org?.industry, 120),
    email: trimTo(org?.primaryContactEmail, 255),
    website: trimTo(org?.websiteUrl, 255),
    baseCurrency: currencyCode,
    currency_code: currencyCode,
    fiscalYear: trimTo(org?.fiscalYear, 80) || fiscalYearLabelFromStartMonth(startMonth),
    fiscal_year_start_month: startMonth,
    orgLanguage: language || languageCode,
    commLanguage: trimTo(org?.communicationLanguage, 50),
    language_code: languageCode,
    timeZone: trimTo(org?.timeZone, 80) || DEFAULT_TIME_ZONE,
    time_zone: trimTo(org?.timeZone, 80) || DEFAULT_TIME_ZONE,
    dateFormat: trimTo(org?.dateFormat, 50) || DEFAULT_DATE_FORMAT,
    date_format: trimTo(org?.dateFormat, 50) || DEFAULT_DATE_FORMAT,
    dateSeparator: trimTo(org?.fieldSeparator, 10) || DEFAULT_FIELD_SEPARATOR,
    field_separator: trimTo(org?.fieldSeparator, 10) || DEFAULT_FIELD_SEPARATOR,
    reportBasis: trimTo(org?.reportBasis, 30),
    contactName: trimTo(org?.contactName, 120) || trimTo(user?.name, 120),
    companyIdType: trimTo(org?.companyIdLabel, 80),
    companyIdValue: trimTo(org?.companyIdValue, 120),
    taxIdType: trimTo(org?.taxIdLabel, 80),
    taxIdValue: trimTo(org?.taxIdValue, 120),
    additionalFields: normalizeCustomFields(org?.customFields),
    custom_fields: normalizeCustomFields(org?.customFields),
    paymentStubAddress: trimTo(org?.paymentStubAddress, 255),
    showPaymentStubAddress: Boolean(org?.showPaymentStubAddress),
    mileagePreferences: org?.mileagePreferences || null,
    address: {
      country,
      state: trimTo(org?.state, 80),
      city: trimTo(org?.city, 80),
      street1: trimTo(org?.addressLine1, 255),
      street2: trimTo(org?.addressLine2, 255),
      zipCode: trimTo(org?.postalCode, 20),
      phone: trimTo(org?.phone, 40),
      fax: trimTo(org?.fax, 40),
    },
  };
};

export const buildZohoOrganizationPayload = (org: any, user?: any) => {
  const startMonth =
    normalizeMonthName(org?.fiscalYearStartMonth) ||
    normalizeMonthName(org?.fiscalYear) ||
    inferMonthFromDate(org?.fiscalYearStart) ||
    "january";
  const currencyCode = normalizeCurrencyCode(org?.currencyCode || org?.baseCurrency) || DEFAULT_CURRENCY_CODE;
  const language = trimTo(org?.language, 50);
  const languageCode = trimTo(org?.languageCode, 20).toLowerCase() || guessLanguageCode(language) || DEFAULT_LANGUAGE_CODE;
  const country = trimTo(org?.country, 80) || regionNameFromIso(trimTo(org?.countryIso, 2));

  return {
    organization_id: String(org?._id || ""),
    name: trimTo(org?.name, 100),
    is_logo_uploaded: Boolean(trimTo(org?.logoUrl, MAX_BRANDING_LEN)),
    is_default_org: false,
    user_role: trimTo(user?.role, 60),
    account_created_date: toDateOnly(org?.createdAt),
    time_zone: trimTo(org?.timeZone, 80) || DEFAULT_TIME_ZONE,
    language_code: languageCode,
    date_format: trimTo(org?.dateFormat, 50) || DEFAULT_DATE_FORMAT,
    field_separator: trimTo(org?.fieldSeparator, 10) || DEFAULT_FIELD_SEPARATOR,
    fiscal_year_start_month: monthIndexFromValue(startMonth),
    tax_group_enabled: typeof org?.taxGroupEnabled === "boolean" ? org.taxGroupEnabled : true,
    user_status: trimTo(user?.status, 40),
    contact_name: trimTo(org?.contactName, 120) || trimTo(user?.name, 120),
    industry_type: trimTo(org?.industry, 120),
    industry_size: trimTo(org?.industrySize, 40),
    company_id_label: trimTo(org?.companyIdLabel, 80),
    company_id_value: trimTo(org?.companyIdValue, 120),
    tax_id_label: trimTo(org?.taxIdLabel, 80),
    tax_id_value: trimTo(org?.taxIdValue, 120),
    currency_id: trimTo(org?.currencyId, 80),
    currency_code: currencyCode,
    currency_symbol: trimTo(org?.currencySymbol, 12),
    currency_format: trimTo(org?.currencyFormat, 40),
    price_precision: Number.isFinite(Number(org?.pricePrecision)) ? Number(org.pricePrecision) : 2,
    org_address: trimTo(org?.orgAddress, 255),
    remit_to_address: trimTo(org?.remitToAddress, 255),
    phone: trimTo(org?.phone, 40),
    fax: trimTo(org?.fax, 40),
    website: trimTo(org?.websiteUrl, 255),
    email: trimTo(org?.primaryContactEmail, 255),
    is_org_active: typeof org?.isOrgActive === "boolean" ? org.isOrgActive : true,
    portal_name: trimTo(org?.portalName, 40),
    custom_fields: normalizeCustomFields(org?.customFields),
    address: {
      street_address1: trimTo(org?.addressLine1, 255),
      street_address2: trimTo(org?.addressLine2, 255),
      city: trimTo(org?.city, 80),
      state: trimTo(org?.state, 80),
      country,
      zip: trimTo(org?.postalCode, 20),
    },
  };
};

export const buildZohoOrganizationListItem = (org: any, user?: any) => {
  const detail = buildZohoOrganizationPayload(org, user);

  return {
    organization_id: detail.organization_id,
    name: detail.name,
    contact_name: detail.contact_name,
    email: detail.email,
    is_default_org: detail.is_default_org,
    tax_group_enabled: detail.tax_group_enabled,
    language_code: detail.language_code,
    fiscal_year_start_month: detail.fiscal_year_start_month,
    account_created_date: detail.account_created_date,
    account_created_date_formatted: detail.account_created_date,
    time_zone: detail.time_zone,
    is_org_active: detail.is_org_active,
    currency_id: detail.currency_id,
    currency_code: detail.currency_code,
    currency_symbol: detail.currency_symbol,
    currency_format: detail.currency_format,
    price_precision: detail.price_precision,
  };
};

export const parseOrganizationPayload = (
  body: unknown,
  options: {
    requireCreateFields?: boolean;
  } = {},
) => {
  const requireCreateFields = Boolean(options.requireCreateFields);
  const source = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const addressSource =
    source.address && typeof source.address === "object" ? (source.address as Record<string, unknown>) : {};
  const patch: Record<string, unknown> = {};
  const errors: string[] = [];

  const assignString = (target: string, field: { present: boolean; value: unknown }, maxLength: number) => {
    if (!field.present) return;
    patch[target] = trimTo(field.value, maxLength);
  };

  const nameField = readFirstPresent(source, ["name"]);
  if (nameField.present || requireCreateFields) {
    const nextName = trimTo(nameField.value, 100);
    if (!nextName) {
      errors.push("Organization name is required.");
    } else {
      patch.name = nextName;
    }
  }

  assignString("businessType", readFirstPresent(source, ["businessType"]), 80);
  assignString("industry", readFirstPresent(source, ["industry_type", "industry"]), 120);
  assignString("industrySize", readFirstPresent(source, ["industry_size"]), 40);
  assignString("contactName", readFirstPresent(source, ["contact_name", "contactName"]), 120);

  const portalNameField = readFirstPresent(source, ["portal_name", "portalName"]);
  if (portalNameField.present || requireCreateFields) {
    const portalName = trimTo(portalNameField.value, 40);
    if (!portalName) {
      errors.push("Portal name is required.");
    } else if (!PORTAL_NAME_REGEX.test(portalName)) {
      errors.push("Portal name must be 5 to 30 characters and contain only letters and numbers.");
    } else {
      patch.portalName = portalName;
    }
  }

  const emailField = readFirstPresent(source, ["email", "primaryContactEmail"]);
  if (emailField.present) {
    const email = trimTo(emailField.value, 255).toLowerCase();
    if (email && !EMAIL_REGEX.test(email)) {
      errors.push("Enter a valid organization email address.");
    } else {
      patch.primaryContactEmail = email;
    }
  }

  const websiteField = readFirstPresent(source, ["website", "websiteUrl"]);
  if (websiteField.present) {
    const website = normalizeWebsite(websiteField.value);
    if (website && !isValidWebsite(website)) {
      errors.push("Enter a valid website URL.");
    } else {
      patch.websiteUrl = website;
    }
  }

  const logoField = readFirstPresent(source, ["logo", "logoUrl"]);
  if (logoField.present) {
    patch.logoUrl = trimTo(logoField.value, MAX_BRANDING_LEN);
  }

  const currencyField = readFirstPresent(source, ["currency_code", "currencyCode", "baseCurrency"]);
  if (currencyField.present || requireCreateFields) {
    const currencyCode = normalizeCurrencyCode(currencyField.value);
    if (!currencyCode) {
      errors.push("Currency code is required.");
    } else if (!/^[A-Z0-9]{3,10}$/.test(currencyCode)) {
      errors.push("Currency code must contain 3 to 10 letters or numbers.");
    } else {
      patch.currencyCode = currencyCode;
      patch.baseCurrency = currencyCode;
    }
  }

  assignString("currencyId", readFirstPresent(source, ["currency_id", "currencyId"]), 80);

  const fiscalMonthField = readFirstPresent(source, ["fiscal_year_start_month"]);
  const fiscalYearField = readFirstPresent(source, ["fiscalYear"]);
  const fiscalDateField = readFirstPresent(source, ["fiscalYearStart"]);
  const normalizedMonth =
    normalizeMonthName(fiscalMonthField.value) ||
    normalizeMonthName(fiscalYearField.value) ||
    inferMonthFromDate(fiscalDateField.value);

  if (fiscalMonthField.present || fiscalYearField.present || fiscalDateField.present) {
    if (!normalizedMonth) {
      errors.push("Fiscal year start month must be a valid month.");
    } else {
      patch.fiscalYearStartMonth = normalizedMonth;
      patch.fiscalYear = fiscalYearLabelFromStartMonth(normalizedMonth);
    }
  }

  const timeZoneField = readFirstPresent(source, ["time_zone", "timeZone"]);
  if (timeZoneField.present || requireCreateFields) {
    const timeZone = trimTo(timeZoneField.value, 80);
    if (!timeZone) {
      errors.push("Time zone is required.");
    } else {
      patch.timeZone = timeZone;
    }
  }

  const orgLanguageField = readFirstPresent(source, ["orgLanguage", "language"]);
  const languageCodeField = readFirstPresent(source, ["language_code", "languageCode"]);
  if (orgLanguageField.present) {
    patch.language = trimTo(orgLanguageField.value, 50);
  }
  if (languageCodeField.present) {
    const languageCode = trimTo(languageCodeField.value, 20).replace("_", "-").toLowerCase();
    if (languageCode && !LANGUAGE_CODE_REGEX.test(languageCode)) {
      errors.push("Language code is invalid.");
    } else {
      patch.languageCode = languageCode;
      if (!orgLanguageField.present) {
        patch.language = languageCode;
      }
    }
  } else if (orgLanguageField.present) {
    const fallbackLanguageCode = guessLanguageCode(orgLanguageField.value);
    if (fallbackLanguageCode) patch.languageCode = fallbackLanguageCode;
  }

  assignString("communicationLanguage", readFirstPresent(source, ["commLanguage", "communicationLanguage"]), 50);
  assignString("dateFormat", readFirstPresent(source, ["date_format", "dateFormat"]), 50);
  assignString("fieldSeparator", readFirstPresent(source, ["field_separator", "dateSeparator"]), 10);
  assignString("reportBasis", readFirstPresent(source, ["reportBasis"]), 30);
  assignString("orgAddress", readFirstPresent(source, ["org_address", "orgAddress"]), 255);
  assignString("remitToAddress", readFirstPresent(source, ["remit_to_address", "remitToAddress"]), 255);
  assignString("paymentStubAddress", readFirstPresent(source, ["paymentStubAddress"]), 255);
  assignString("companyIdLabel", readFirstPresent(source, ["companyid_label", "company_id_label", "companyIdType"]), 80);
  assignString("companyIdValue", readFirstPresent(source, ["companyid_value", "company_id_value", "companyIdValue"]), 120);
  assignString("taxIdLabel", readFirstPresent(source, ["taxid_label", "tax_id_label", "taxIdType"]), 80);
  assignString("taxIdValue", readFirstPresent(source, ["taxid_value", "tax_id_value", "taxIdValue"]), 120);

  const paymentStubToggleField = readFirstPresent(source, ["showPaymentStubAddress"]);
  if (paymentStubToggleField.present) {
    const nextBoolean = normalizeBoolean(paymentStubToggleField.value);
    if (typeof nextBoolean === "boolean") patch.showPaymentStubAddress = nextBoolean;
  }

  const taxGroupEnabledField = readFirstPresent(source, ["tax_group_enabled", "taxGroupEnabled"]);
  if (taxGroupEnabledField.present) {
    const nextBoolean = normalizeBoolean(taxGroupEnabledField.value);
    if (typeof nextBoolean === "boolean") patch.taxGroupEnabled = nextBoolean;
  }

  const customFieldsField = readFirstPresent(source, ["custom_fields", "customFields", "additionalFields"]);
  if (customFieldsField.present) {
    patch.customFields = normalizeCustomFields(customFieldsField.value);
  }

  const countryIsoField = readFirstPresent(source, ["countryIso"]);
  if (countryIsoField.present) {
    const countryIso = trimTo(countryIsoField.value, 2).toUpperCase();
    if (countryIso && countryIso.length !== 2) {
      errors.push("Country ISO code must contain exactly 2 letters.");
    } else {
      patch.countryIso = countryIso;
    }
  }

  const countryField = readFirstPresent(addressSource, ["country"]);
  if (countryField.present) {
    patch.country = trimTo(countryField.value, 80);
  } else {
    const legacyLocationField = readFirstPresent(source, ["location"]);
    if (legacyLocationField.present) {
      patch.country = trimTo(legacyLocationField.value, 80);
    }
  }

  assignString("state", readFirstPresent(addressSource, ["state"]), 80);
  assignString("city", readFirstPresent(addressSource, ["city"]), 80);
  assignString("addressLine1", readFirstPresent(addressSource, ["street_address1", "street1"]), 255);
  assignString("addressLine2", readFirstPresent(addressSource, ["street_address2", "street2"]), 255);
  assignString("postalCode", readFirstPresent(addressSource, ["zip", "zipCode"]), 20);

  const phoneField = readFirstPresent(source, ["phone"]);
  if (phoneField.present) {
    patch.phone = trimTo(phoneField.value, 40);
  } else {
    assignString("phone", readFirstPresent(addressSource, ["phone"]), 40);
  }

  const faxField = readFirstPresent(source, ["fax"]);
  if (faxField.present) {
    patch.fax = trimTo(faxField.value, 40);
  } else {
    assignString("fax", readFirstPresent(addressSource, ["fax"]), 40);
  }

  return {
    patch,
    errors,
  };
};
