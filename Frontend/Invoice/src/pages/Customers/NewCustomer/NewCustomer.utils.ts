import { Country, State } from "country-state-city";
import { CustomerFormData } from "./NewCustomer.constants";
import {
  normalizeCustomerLanguageForForm,
  normalizePaymentTermsForForm,
  normalizeZohoLanguageCode,
  resolveCustomerDisplayName,
  resolvePaymentTermsMeta,
} from "./NewCustomer.validation";

export const splitPhoneNumber = (phone: string, defaultPrefix: string) => {
  if (!phone) return { prefix: defaultPrefix, number: "" };
  const parts = phone.split(" ");
  if (parts.length > 1 && parts[0].startsWith("+")) {
    return { prefix: parts[0], number: parts.slice(1).join(" ").replace(/\D/g, "") };
  }
  return { prefix: defaultPrefix, number: String(phone || "").replace(/\D/g, "") };
};

export const normalizeReportingTagOptions = (tag: any): string[] => {
  const candidates = Array.isArray(tag?.options)
    ? tag.options
    : Array.isArray(tag?.values)
      ? tag.values
      : [];

  return candidates
    .map((option: any) => {
      if (typeof option === "string") return option.trim();
      if (option && typeof option === "object") {
        return String(
          option.value ??
          option.label ??
          option.name ??
          option.option ??
          option.title ??
          ""
        ).trim();
      }
      return "";
    })
    .filter(Boolean);
};

export const normalizeReportingTagAppliesTo = (tag: any): string[] => {
  const direct = Array.isArray(tag?.appliesTo) ? tag.appliesTo : [];
  const fromModulesObject = tag?.modules && typeof tag.modules === "object"
    ? Object.keys(tag.modules).filter((key) => Boolean(tag.modules[key]))
    : [];
  const fromModuleSettings = tag?.moduleSettings && typeof tag.moduleSettings === "object"
    ? Object.keys(tag.moduleSettings).filter((key) => Boolean(tag.moduleSettings[key]))
    : [];
  const fromAssociations = Array.isArray(tag?.associations) ? tag.associations : [];
  const fromModulesList = Array.isArray(tag?.modulesList) ? tag.modulesList : [];

  return [...direct, ...fromModulesObject, ...fromModuleSettings, ...fromAssociations, ...fromModulesList]
    .map((value: any) => String(value || "").toLowerCase().trim())
    .filter(Boolean);
};

export const normalizeReportingTagsForCustomers = (response: any) => {
  const rows = Array.isArray(response) ? response : (response?.data || []);
  if (!Array.isArray(rows)) return [];

  const filtered = rows
    .filter((tag: any) => {
      const appliesTo = normalizeReportingTagAppliesTo(tag);
      return appliesTo.some((entry) => entry.includes("customer"));
    })
    .map((tag: any) => ({
      ...tag,
      options: normalizeReportingTagOptions(tag),
    }));

  return filtered.length > 0
    ? filtered
    : rows.map((tag: any) => ({
      ...tag,
      options: normalizeReportingTagOptions(tag),
    }));
};

export const normalizeTaxesList = (response: any) => {
  const rows = Array.isArray(response) ? response : [];
  return rows
    .filter((tax: any) => tax.isActive !== false)
    .map((tax: any) => ({
      ...tax,
      id: String(tax?._id || tax?.id || tax?.tax_id || ""),
    }))
    .filter((tax: any) => tax.id);
};

export const normalizePriceLists = (raw: string | null) => {
  try {
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.map((p: any) => ({
      id: String(p.id || p._id || ""),
      name: String(p.name || ""),
      currency: String(p.currency || ""),
      pricingScheme: String(p.pricingScheme || ""),
    }));
  } catch {
    return [];
  }
};

export const normalizeCountryName = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]/g, "");

const countryAliases: Record<string, string> = {
  usa: "us",
  unitedstatesofamerica: "us",
  uk: "gb",
  unitedkingdomofgreatbritainandnorthernireland: "gb",
  uae: "ae",
  vietnam: "vn",
  southkorea: "kr",
  northkorea: "kp",
  russia: "ru",
  bolivia: "bo",
  tanzania: "tz",
  venezuela: "ve",
  laos: "la",
  moldova: "md",
  iran: "ir",
  syria: "sy",
};

export const getCountryIsoByName = (countryName: string) => {
  if (!countryName) return "";
  const countryOptions = Country.getAllCountries();
  const normalized = normalizeCountryName(countryName.trim());
  const resolved = countryAliases[normalized] || normalized;
  const matchedCountry = countryOptions.find((country) => {
    const normalizedName = normalizeCountryName(country.name);
    const normalizedIso = normalizeCountryName(country.isoCode);
    return normalizedName === resolved || normalizedIso === resolved;
  });
  return matchedCountry?.isoCode || "";
};

export const getFallbackStatesByCountryName = (countryName: string, countryData: Record<string, string[]>) => {
  if (!countryName) return [];
  const normalized = normalizeCountryName(countryName.trim());
  const fallbackKey = Object.keys(countryData).find(
    (key) => normalizeCountryName(key) === normalized
  );
  return fallbackKey ? countryData[fallbackKey] : [];
};

export const getStatesByCountryName = (countryName: string, countryData: Record<string, string[]>) => {
  const countryIso = getCountryIsoByName(countryName);
  const libraryStates = countryIso
    ? State.getStatesOfCountry(countryIso).map((state) => state.name)
    : [];
  return libraryStates.length > 0 ? libraryStates : getFallbackStatesByCountryName(countryName, countryData);
};

export const parseFileSize = (sizeStr: any) => {
  if (typeof sizeStr === "number") return sizeStr;
  if (!sizeStr) return 0;

  const match = sizeStr.toString().match(/^([\d.]+)\s*(B|KB|MB|GB)$/i);
  if (!match) return 0;

  const value = parseFloat(match[1]);
  const unit = match[2].toUpperCase() as "B" | "KB" | "MB" | "GB";
  const multipliers: Record<string, number> = {
    B: 1,
    KB: 1024,
    MB: 1024 * 1024,
    GB: 1024 * 1024 * 1024,
  };
  return Math.round(value * (multipliers[unit] || 1));
};

const asStringValue = (value: any) => {
  if (value === null || value === undefined) return "";
  return String(value).trim();
};

const pickFirstValue = (...values: any[]) => {
  for (const value of values) {
    const text = asStringValue(value);
    if (text) return text;
  }
  return "";
};

const normalizeCustomFieldsRecord = (customFields: any) => {
  if (Array.isArray(customFields)) {
    return customFields.reduce((acc: Record<string, any>, field: any, index: number) => {
      const label = pickFirstValue(field?.label, field?.name, field?.fieldName, `Field ${index + 1}`);
      if (!label) return acc;
      acc[label] = field?.value ?? "";
      return acc;
    }, {});
  }

  if (customFields && typeof customFields === "object") {
    return Object.entries(customFields).reduce((acc: Record<string, any>, [key, value]) => {
      const label = pickFirstValue(key);
      if (!label) return acc;
      acc[label] = value;
      return acc;
    }, {});
  }

  return {};
};

const buildCustomFieldsArray = (customFields: any) => {
  if (Array.isArray(customFields)) {
    return customFields
      .map((field: any, index: number) => ({
        index: Number(field?.index ?? index + 1),
        label: pickFirstValue(field?.label, field?.name, field?.fieldName),
        value: field?.value ?? "",
      }))
      .filter((field: any) => field.label || pickFirstValue(field.value));
  }

  if (customFields && typeof customFields === "object") {
    return Object.entries(customFields).map(([label, value], index) => ({
      index: index + 1,
      label: pickFirstValue(label),
      value,
    })).filter((field) => field.label || pickFirstValue(field.value));
  }

  return [];
};

const normalizeAddressForForm = (address: any, fallback: any = {}) => ({
  attention: pickFirstValue(address?.attention, fallback?.attention),
  country: pickFirstValue(address?.country, fallback?.country),
  street1: pickFirstValue(
    address?.street1,
    address?.address,
    fallback?.street1,
    fallback?.address,
  ),
  street2: pickFirstValue(address?.street2, fallback?.street2),
  city: pickFirstValue(address?.city, fallback?.city),
  state: pickFirstValue(address?.state, fallback?.state),
  zipCode: pickFirstValue(address?.zipCode, address?.zip, fallback?.zipCode, fallback?.zip),
  phone: pickFirstValue(address?.phone, fallback?.phone),
  fax: pickFirstValue(address?.fax, fallback?.fax),
});

const normalizeContactPersonsForForm = (contactPersons: any[]) => {
  return (Array.isArray(contactPersons) ? contactPersons : []).map((contact: any) => {
    const workPhoneData = splitPhoneNumber(
      contact?.workPhone || contact?.phone || contact?.phone_number || "",
      "+358",
    );
    const mobileData = splitPhoneNumber(
      contact?.mobile || contact?.mobilePhone || contact?.mobile_phone || "",
      "+252",
    );

    return {
      ...contact,
      id: contact?.id || contact?.contact_person_id || contact?._id || Date.now() + Math.random(),
      salutation: pickFirstValue(contact?.salutation, contact?.salutation_name),
      firstName: pickFirstValue(contact?.firstName, contact?.first_name),
      lastName: pickFirstValue(contact?.lastName, contact?.last_name),
      email: pickFirstValue(contact?.email, contact?.contact_email),
      workPhonePrefix: workPhoneData.prefix,
      workPhone: workPhoneData.number,
      mobilePrefix: mobileData.prefix,
      mobile: mobileData.number,
      skypeName: pickFirstValue(contact?.skypeName, contact?.skype_name),
      designation: pickFirstValue(contact?.designation),
      department: pickFirstValue(contact?.department),
      isPrimary: Boolean(
        contact?.isPrimary ??
        contact?.is_primary_contact ??
        false,
      ),
    };
  });
};

const normalizeDefaultTemplatesForForm = (defaultTemplates: any) => {
  if (defaultTemplates && typeof defaultTemplates === "object") {
    return { ...defaultTemplates };
  }
  return {};
};

const normalizeCountryCodeField = (value: any) => {
  const text = pickFirstValue(value);
  return text ? text.toUpperCase() : "";
};

const normalizeComplianceSelectValue = (value: any) => pickFirstValue(value).toLowerCase();

const normalizeComplianceFieldsForForm = (customer: any) => ({
  status: normalizeComplianceSelectValue(customer?.status) || "active",
  paymentReminderEnabled: Boolean(
    customer?.payment_reminder_enabled ??
    customer?.paymentReminderEnabled ??
    false,
  ),
  isLinkedWithZohoCrm: Boolean(
    customer?.is_linked_with_zohocrm ??
    customer?.isLinkedWithZohoCrm ??
    false,
  ),
  vatRegNo: pickFirstValue(customer?.vatRegNo, customer?.vat_reg_no),
  taxRegNo: pickFirstValue(customer?.taxRegNo, customer?.tax_reg_no),
  countryCode: normalizeCountryCodeField(customer?.countryCode || customer?.country_code),
  vatTreatment: normalizeComplianceSelectValue(customer?.vatTreatment || customer?.vat_treatment),
  taxTreatment: normalizeComplianceSelectValue(customer?.taxTreatment || customer?.tax_treatment),
  taxRegime: normalizeComplianceSelectValue(customer?.taxRegime || customer?.tax_regime),
  legalName: pickFirstValue(customer?.legalName, customer?.legal_name),
  isTdsRegistered: Boolean(
    customer?.isTdsRegistered ??
    customer?.is_tds_registered ??
    false,
  ),
  placeOfContact: pickFirstValue(customer?.placeOfContact, customer?.place_of_contact),
  gstNo: pickFirstValue(customer?.gstNo, customer?.gst_no).toUpperCase(),
  gstTreatment: normalizeComplianceSelectValue(customer?.gstTreatment || customer?.gst_treatment),
  taxAuthorityName: pickFirstValue(customer?.taxAuthorityName, customer?.tax_authority_name),
  taxExemptionCode: pickFirstValue(customer?.taxExemptionCode, customer?.tax_exemption_code),
  avataxExemptNo: pickFirstValue(customer?.avataxExemptNo, customer?.avatax_exempt_no),
  avataxUseCode: pickFirstValue(customer?.avataxUseCode, customer?.avatax_use_code),
  taxExemptionId: pickFirstValue(customer?.taxExemptionId, customer?.tax_exemption_id),
  taxAuthorityId: pickFirstValue(customer?.taxAuthorityId, customer?.tax_authority_id),
  tdsTaxId: pickFirstValue(customer?.tdsTaxId, customer?.tds_tax_id),
  defaultTemplates: normalizeDefaultTemplatesForForm(
    customer?.defaultTemplates || customer?.default_templates,
  ),
});

const formatPhoneWithPrefix = (prefix: string, number: string) => {
  const trimmedPrefix = pickFirstValue(prefix);
  const trimmedNumber = pickFirstValue(number).replace(/\D/g, "");
  if (!trimmedNumber) return "";
  return trimmedPrefix ? `${trimmedPrefix} ${trimmedNumber}`.trim() : trimmedNumber;
};

const getStateIsoCodeByName = (countryName: string, stateName: string) => {
  const countryIso = getCountryIsoByName(countryName);
  if (!countryIso || !stateName) return "";

  const matchedState = State.getStatesOfCountry(countryIso).find((state) => {
    const stateNameNormalized = normalizeCountryName(state.name);
    const stateIsoNormalized = normalizeCountryName(state.isoCode);
    const lookup = normalizeCountryName(stateName);
    return stateNameNormalized === lookup || stateIsoNormalized === lookup;
  });

  return matchedState?.isoCode || "";
};

const buildAddressPayload = (formData: CustomerFormData, prefix: "billing" | "shipping") => {
  const country = pickFirstValue(
    prefix === "billing" ? formData.billingCountry : formData.shippingCountry,
  );
  const state = pickFirstValue(
    prefix === "billing" ? formData.billingState : formData.shippingState,
  );
  const street1 = pickFirstValue(
    prefix === "billing" ? formData.billingStreet1 : formData.shippingStreet1,
  );
  const street2 = pickFirstValue(
    prefix === "billing" ? formData.billingStreet2 : formData.shippingStreet2,
  );
  const attention = pickFirstValue(
    prefix === "billing" ? formData.billingAttention : formData.shippingAttention,
  );
  const city = pickFirstValue(
    prefix === "billing" ? formData.billingCity : formData.shippingCity,
  );
  const zipCode = pickFirstValue(
    prefix === "billing" ? formData.billingZipCode : formData.shippingZipCode,
  );
  const phonePrefix = pickFirstValue(
    prefix === "billing" ? formData.billingPhonePrefix : formData.shippingPhonePrefix,
  );
  const phone = formatPhoneWithPrefix(
    phonePrefix,
    prefix === "billing" ? formData.billingPhone : formData.shippingPhone,
  );
  const fax = pickFirstValue(
    prefix === "billing" ? formData.billingFax : formData.shippingFax,
  );

  return {
    attention,
    address: street1,
    street1,
    street2,
    city,
    state,
    state_code: getStateIsoCodeByName(country, state) || state,
    zip: zipCode,
    zipCode,
    country,
    fax,
    phone,
  };
};

const buildContactPersonsPayload = (contactPersons: any[]) => {
  const normalized = normalizeContactPersonsForForm(contactPersons);
  const meaningfulContacts = normalized.filter((contact: any) =>
    [contact.firstName, contact.lastName, contact.email, contact.workPhone, contact.mobile].some((value) => Boolean(pickFirstValue(value))),
  );

  const hasPrimary = meaningfulContacts.some((contact: any) => Boolean(contact.isPrimary));

  return meaningfulContacts.map((contact: any, index: number) => {
    const workPhone = formatPhoneWithPrefix(contact.workPhonePrefix, contact.workPhone);
    const mobile = formatPhoneWithPrefix(contact.mobilePrefix, contact.mobile);
    const isPrimary = Boolean(contact.isPrimary || (!hasPrimary && index === 0));

    return {
      contact_person_id: contact.id,
      id: contact.id,
      salutation: pickFirstValue(contact.salutation),
      firstName: pickFirstValue(contact.firstName),
      lastName: pickFirstValue(contact.lastName),
      first_name: pickFirstValue(contact.firstName),
      last_name: pickFirstValue(contact.lastName),
      email: pickFirstValue(contact.email),
      phone: workPhone,
      mobile,
      workPhone,
      workPhonePrefix: contact.workPhonePrefix,
      mobilePrefix: contact.mobilePrefix,
      skypeName: pickFirstValue(contact.skypeName),
      designation: pickFirstValue(contact.designation),
      department: pickFirstValue(contact.department),
      is_primary_contact: isPrimary,
      isPrimary,
    };
  });
};

const getPrimaryContactId = (contactPersonsPayload: any[]) => {
  const primaryContact = (Array.isArray(contactPersonsPayload) ? contactPersonsPayload : []).find((contact: any) =>
    Boolean(contact?.is_primary_contact),
  );

  return primaryContact?.contact_person_id || primaryContact?.id || "";
};

const buildCompliancePayload = (formData: CustomerFormData) => {
  const defaultTemplates = normalizeDefaultTemplatesForForm(formData.defaultTemplates);

  return {
    status: normalizeComplianceSelectValue(formData.status) || "active",
    paymentReminderEnabled: Boolean(formData.paymentReminderEnabled),
    payment_reminder_enabled: Boolean(formData.paymentReminderEnabled),
    isLinkedWithZohoCrm: Boolean(formData.isLinkedWithZohoCrm),
    is_linked_with_zohocrm: Boolean(formData.isLinkedWithZohoCrm),
    vatRegNo: pickFirstValue(formData.vatRegNo),
    vat_reg_no: pickFirstValue(formData.vatRegNo),
    taxRegNo: pickFirstValue(formData.taxRegNo),
    tax_reg_no: pickFirstValue(formData.taxRegNo),
    countryCode: normalizeCountryCodeField(formData.countryCode),
    country_code: normalizeCountryCodeField(formData.countryCode),
    vatTreatment: normalizeComplianceSelectValue(formData.vatTreatment),
    vat_treatment: normalizeComplianceSelectValue(formData.vatTreatment),
    taxTreatment: normalizeComplianceSelectValue(formData.taxTreatment),
    tax_treatment: normalizeComplianceSelectValue(formData.taxTreatment),
    taxRegime: normalizeComplianceSelectValue(formData.taxRegime),
    tax_regime: normalizeComplianceSelectValue(formData.taxRegime),
    legalName: pickFirstValue(formData.legalName),
    legal_name: pickFirstValue(formData.legalName),
    isTdsRegistered: Boolean(formData.isTdsRegistered),
    is_tds_registered: Boolean(formData.isTdsRegistered),
    placeOfContact: pickFirstValue(formData.placeOfContact),
    place_of_contact: pickFirstValue(formData.placeOfContact),
    gstNo: pickFirstValue(formData.gstNo).toUpperCase(),
    gst_no: pickFirstValue(formData.gstNo).toUpperCase(),
    gstTreatment: normalizeComplianceSelectValue(formData.gstTreatment),
    gst_treatment: normalizeComplianceSelectValue(formData.gstTreatment),
    taxAuthorityName: pickFirstValue(formData.taxAuthorityName),
    tax_authority_name: pickFirstValue(formData.taxAuthorityName),
    taxExemptionCode: pickFirstValue(formData.taxExemptionCode),
    tax_exemption_code: pickFirstValue(formData.taxExemptionCode),
    avataxExemptNo: pickFirstValue(formData.avataxExemptNo),
    avatax_exempt_no: pickFirstValue(formData.avataxExemptNo),
    avataxUseCode: pickFirstValue(formData.avataxUseCode),
    avatax_use_code: pickFirstValue(formData.avataxUseCode),
    taxExemptionId: pickFirstValue(formData.taxExemptionId),
    tax_exemption_id: pickFirstValue(formData.taxExemptionId),
    taxAuthorityId: pickFirstValue(formData.taxAuthorityId),
    tax_authority_id: pickFirstValue(formData.taxAuthorityId),
    tdsTaxId: pickFirstValue(formData.tdsTaxId),
    tds_tax_id: pickFirstValue(formData.tdsTaxId),
    defaultTemplates,
    default_templates: defaultTemplates,
  };
};

export const mapCustomerToFormData = (customer: any): Partial<CustomerFormData> => {
  const customerType = pickFirstValue(customer.customerType, customer.customer_type) || "business";
  const salutation = pickFirstValue(customer.salutation, customer.salutation_name);
  const firstName = pickFirstValue(customer.firstName, customer.first_name);
  const lastName = pickFirstValue(customer.lastName, customer.last_name);
  const companyName = pickFirstValue(customer.companyName, customer.company_name);
  const displayName = pickFirstValue(
    customer.displayName,
    customer.display_name,
    customer.contact_name,
    customer.name,
    companyName,
    [firstName, lastName].filter(Boolean).join(" "),
  );
  const workPhoneData = splitPhoneNumber(
    customer.workPhone || customer.phone || customer.work_phone || "",
    "+358",
  );
  const mobileData = splitPhoneNumber(
    customer.mobile || customer.mobilePhone || customer.mobile_phone || "",
    "+252",
  );
  const billingAddress = normalizeAddressForForm(
    customer.billingAddress || customer.billing_address || {},
    {
      attention: customer.billingAttention,
      country: customer.billingCountry,
      street1: customer.billingStreet1,
      street2: customer.billingStreet2,
      city: customer.billingCity,
      state: customer.billingState,
      zipCode: customer.billingZipCode,
      phone: customer.billingPhone,
      fax: customer.billingFax,
    },
  );
  const billingPhoneData = splitPhoneNumber(billingAddress.phone, "+252");
  const shippingAddress = normalizeAddressForForm(
    customer.shippingAddress || customer.shipping_address || {},
    {
      attention: customer.shippingAttention,
      country: customer.shippingCountry,
      street1: customer.shippingStreet1,
      street2: customer.shippingStreet2,
      city: customer.shippingCity,
      state: customer.shippingState,
      zipCode: customer.shippingZipCode,
      phone: customer.shippingPhone,
      fax: customer.shippingFax,
    },
  );
  const shippingPhoneData = splitPhoneNumber(shippingAddress.phone, "+252");
  const contactPersons = normalizeContactPersonsForForm(
    customer.contactPersons || customer.contact_persons || [],
  );

  return {
    customerType,
    salutation,
    firstName,
    lastName,
    companyName,
    displayName,
    email: pickFirstValue(customer.email, customer.emailAddress, customer.contactEmail),
    workPhonePrefix: workPhoneData.prefix,
    workPhone: workPhoneData.number,
    mobilePrefix: mobileData.prefix,
    mobile: mobileData.number,
    customerLanguage: normalizeCustomerLanguageForForm(
      pickFirstValue(customer.customerLanguage, customer.portalLanguage, customer.language_code),
    ),
    isTrackedForMoss: Boolean(customer.isTrackedForMoss ?? customer.is_tracked_for_moss ?? false),
    taxRate: pickFirstValue(customer.taxRate, customer.tax_id),
    companyId: pickFirstValue(customer.companyId, customer.company_id, customer.companyid_value),
    locationCode: pickFirstValue(customer.locationCode, customer.place_of_contact),
    currency: pickFirstValue(customer.currency, customer.currency_code, customer.currencyCode) || "USD",
    accountsReceivable: pickFirstValue(customer.accountsReceivable),
    openingBalance: pickFirstValue(customer.receivables, customer.openingBalance),
    paymentTerms: normalizePaymentTermsForForm(
      pickFirstValue(customer.paymentTerms, customer.payment_terms_label, customer.payment_terms),
    ),
    priceListId: pickFirstValue(customer.priceListId, customer.price_list_id),
    enablePortal: Boolean(
      customer.enablePortal ??
      customer.hasPortalAccess ??
      customer.portalAccess ??
      customer.portalStatus === "Enabled",
    ),
    customerOwner: pickFirstValue(customer.customerOwner, customer.salesperson, customer.customer_owner),
    websiteUrl: pickFirstValue(customer.websiteUrl, customer.website, customer.webSite),
    department: pickFirstValue(customer.department),
    designation: pickFirstValue(customer.designation),
    xHandle: pickFirstValue(customer.xHandle, customer.twitter),
    skypeName: pickFirstValue(customer.skypeName, customer.skype_name),
    facebook: pickFirstValue(customer.facebook),
    ...normalizeComplianceFieldsForForm(customer),
    billingAttention: billingAddress.attention,
    billingCountry: billingAddress.country,
    billingStreet1: billingAddress.street1,
    billingStreet2: billingAddress.street2,
    billingCity: billingAddress.city,
    billingState: billingAddress.state,
    billingZipCode: billingAddress.zipCode,
    billingPhonePrefix: billingPhoneData.prefix,
    billingPhone: billingPhoneData.number,
    billingFax: billingAddress.fax,
    shippingAttention: shippingAddress.attention,
    shippingCountry: shippingAddress.country,
    shippingStreet1: shippingAddress.street1,
    shippingStreet2: shippingAddress.street2,
    shippingCity: shippingAddress.city,
    shippingState: shippingAddress.state,
    shippingZipCode: shippingAddress.zipCode,
    shippingPhonePrefix: shippingPhoneData.prefix,
    shippingPhone: shippingPhoneData.number,
    shippingFax: shippingAddress.fax,
    documents: customer.documents || customer.documentList || [],
    contactPersons,
    customFields: normalizeCustomFieldsRecord(customer.customFields || customer.custom_fields),
    reportingTags: customer.reportingTags || customer.reporting_tags || [],
    remarks: pickFirstValue(customer.remarks, customer.notes),
    exchangeRate: pickFirstValue(customer.exchangeRate) || "1.00",
    customerNumber: pickFirstValue(customer.customerNumber, customer.customer_number, customer.contact_number),
  };
};

export const mapClonedCustomerToFormData = (cloned: any): Partial<CustomerFormData> => {
  const workPhoneData = splitPhoneNumber(
    cloned.workPhone || cloned.phone || cloned.work_phone || "",
    "+358",
  );
  const mobileData = cloned.mobile
    ? splitPhoneNumber(cloned.mobile, "+252")
    : splitPhoneNumber(cloned.mobilePhone || cloned.mobile_phone || "", "+252");
  const billingAddress = normalizeAddressForForm(
    cloned.billingAddress || cloned.billing_address || {},
    {
      attention: cloned.billingAttention,
      country: cloned.billingCountry,
      street1: cloned.billingStreet1,
      street2: cloned.billingStreet2,
      city: cloned.billingCity,
      state: cloned.billingState,
      zipCode: cloned.billingZipCode,
      phone: cloned.billingPhone,
      fax: cloned.billingFax,
    },
  );
  const billingPhoneData = splitPhoneNumber(billingAddress.phone, "+252");
  const shippingAddress = normalizeAddressForForm(
    cloned.shippingAddress || cloned.shipping_address || {},
    {
      attention: cloned.shippingAttention,
      country: cloned.shippingCountry,
      street1: cloned.shippingStreet1,
      street2: cloned.shippingStreet2,
      city: cloned.shippingCity,
      state: cloned.shippingState,
      zipCode: cloned.shippingZipCode,
      phone: cloned.shippingPhone,
      fax: cloned.shippingFax,
    },
  );
  const shippingPhoneData = splitPhoneNumber(shippingAddress.phone, "+252");
  const contactPersons = normalizeContactPersonsForForm(
    cloned.contactPersons || cloned.contact_persons || [],
  );

  return {
    customerType: pickFirstValue(cloned.customerType, cloned.customer_type) || "business",
    salutation: pickFirstValue(cloned.salutation, cloned.salutation_name),
    firstName: pickFirstValue(cloned.firstName, cloned.first_name),
    lastName: pickFirstValue(cloned.lastName, cloned.last_name),
    companyName: pickFirstValue(cloned.companyName, cloned.company_name),
    displayName: pickFirstValue(
      cloned.displayName,
      cloned.display_name,
      cloned.contact_name,
      cloned.name,
      cloned.companyName,
      cloned.company_name,
      [cloned.firstName, cloned.lastName].filter(Boolean).join(" "),
    ),
    email: pickFirstValue(cloned.email, cloned.emailAddress, cloned.contactEmail),
    workPhonePrefix: workPhoneData.prefix,
    workPhone: workPhoneData.number,
    mobilePrefix: mobileData.prefix,
    mobile: mobileData.number,
    customerLanguage: normalizeCustomerLanguageForForm(
      pickFirstValue(cloned.customerLanguage, cloned.portalLanguage, cloned.language_code),
    ),
    isTrackedForMoss: Boolean(cloned.isTrackedForMoss ?? cloned.is_tracked_for_moss ?? false),
    taxRate: pickFirstValue(cloned.taxRate, cloned.tax_id),
    companyId: pickFirstValue(cloned.companyId, cloned.company_id, cloned.companyid_value),
    locationCode: pickFirstValue(cloned.locationCode, cloned.place_of_contact),
    currency: pickFirstValue(cloned.currency, cloned.currency_code, cloned.currencyCode) || "USD",
    accountsReceivable: pickFirstValue(cloned.accountsReceivable),
    openingBalance: pickFirstValue(cloned.openingBalance, cloned.receivables),
    paymentTerms: normalizePaymentTermsForForm(
      pickFirstValue(cloned.paymentTerms, cloned.payment_terms_label, cloned.payment_terms),
    ),
    priceListId: pickFirstValue(cloned.priceListId, cloned.price_list_id),
    enablePortal: Boolean(
      cloned.enablePortal ??
      cloned.hasPortalAccess ??
      cloned.portalAccess ??
      cloned.portalStatus === "Enabled",
    ),
    customerOwner: pickFirstValue(cloned.customerOwner, cloned.salesperson, cloned.customer_owner),
    websiteUrl: pickFirstValue(cloned.websiteUrl, cloned.website, cloned.webSite),
    department: pickFirstValue(cloned.department),
    designation: pickFirstValue(cloned.designation),
    xHandle: pickFirstValue(cloned.xHandle, cloned.twitter),
    skypeName: pickFirstValue(cloned.skypeName, cloned.skype_name),
    facebook: pickFirstValue(cloned.facebook),
    ...normalizeComplianceFieldsForForm(cloned),
    billingAttention: billingAddress.attention,
    billingCountry: billingAddress.country,
    billingStreet1: billingAddress.street1,
    billingStreet2: billingAddress.street2,
    billingCity: billingAddress.city,
    billingState: billingAddress.state,
    billingZipCode: billingAddress.zipCode,
    billingPhonePrefix: billingPhoneData.prefix,
    billingPhone: billingPhoneData.number,
    billingFax: billingAddress.fax,
    shippingAttention: shippingAddress.attention,
    shippingCountry: shippingAddress.country,
    shippingStreet1: shippingAddress.street1,
    shippingStreet2: shippingAddress.street2,
    shippingCity: shippingAddress.city,
    shippingState: shippingAddress.state,
    shippingZipCode: shippingAddress.zipCode,
    shippingPhonePrefix: shippingPhoneData.prefix,
    shippingPhone: shippingPhoneData.number,
    shippingFax: shippingAddress.fax,
    documents: cloned.documents || cloned.documentList || [],
    contactPersons,
    customFields: normalizeCustomFieldsRecord(cloned.customFields || cloned.custom_fields),
    reportingTags: cloned.reportingTags || cloned.reporting_tags || [],
    remarks: pickFirstValue(cloned.remarks, cloned.notes),
    exchangeRate: pickFirstValue(cloned.exchangeRate) || "1.00",
  };
};

export const buildCustomerPayload = (
  formData: CustomerFormData,
  enableCustomerNumbers: boolean,
  resolvedCustomerNumber: string,
  context: {
    availableCurrencies?: any[];
    paymentTermsList?: Array<{ label: string; value: string; days?: number | string }>;
  } = {},
) => {
  const displayName = resolveCustomerDisplayName(formData);
  const customerLanguage = String(formData.customerLanguage || "english").trim();
  const languageCode = normalizeZohoLanguageCode(customerLanguage);
  const paymentTermsMeta = resolvePaymentTermsMeta(formData.paymentTerms, context.paymentTermsList || []);
  const selectedCurrency = (Array.isArray(context.availableCurrencies) ? context.availableCurrencies : []).find((currency) => {
    const code = String(currency?.code || currency?.currency_code || "").trim().toUpperCase();
    return code && code === String(formData.currency || "").trim().toUpperCase();
  }) || (Array.isArray(context.availableCurrencies) ? context.availableCurrencies : []).find((currency) => currency?.isBaseCurrency) || null;
  const billingAddress = buildAddressPayload(formData, "billing");
  const shippingAddress = buildAddressPayload(formData, "shipping");
  const contactPersonsPayload = buildContactPersonsPayload(formData.contactPersons || []);
  const primaryContactId = getPrimaryContactId(contactPersonsPayload);
  const customFieldsArray = buildCustomFieldsArray(formData.customFields || {});
  const resolvedCurrencyCode = String(selectedCurrency?.code || selectedCurrency?.currency_code || formData.currency || "").trim().toUpperCase();

  return {
    contact_name: displayName,
    displayName,
    display_name: displayName,
    name: displayName,
    customerType: formData.customerType || (formData.companyName ? "business" : "individual"),
    customer_type: formData.customerType || (formData.companyName ? "business" : "individual"),
    contact_type: "customer",
    salutation: formData.salutation || "",
    firstName: formData.firstName || "",
    lastName: formData.lastName || "",
    companyName: formData.companyName || "",
    company_name: formData.companyName || "",
    email: formData.email || "",
    workPhone: formatPhoneWithPrefix(formData.workPhonePrefix, formData.workPhone),
    phone: formatPhoneWithPrefix(formData.workPhonePrefix, formData.workPhone),
    mobile: formatPhoneWithPrefix(formData.mobilePrefix, formData.mobile),
    websiteUrl: formData.websiteUrl || "",
    website: formData.websiteUrl || "",
    xHandle: formData.xHandle || "",
    twitter: formData.xHandle || "",
    skypeName: formData.skypeName || "",
    facebook: formData.facebook || "",
    customerNumber: enableCustomerNumbers ? (resolvedCustomerNumber || "") : "",
    customer_number: enableCustomerNumbers ? (resolvedCustomerNumber || "") : "",
    customerLanguage: formData.customerLanguage || "english",
    portalLanguage: formData.customerLanguage || "english",
    language_code: languageCode,
    isTrackedForMoss: Boolean(formData.isTrackedForMoss),
    taxRate: formData.taxRate || "",
    tax_id: formData.taxRate || "",
    is_taxable: Boolean(formData.taxRate),
    exchangeRate: parseFloat(formData.exchangeRate || "1"),
    companyId: formData.companyId || "",
    locationCode: formData.locationCode || "",
    currency: resolvedCurrencyCode || formData.currency || "",
    currency_code: resolvedCurrencyCode || formData.currency || "",
    currency_id: String(selectedCurrency?.id || selectedCurrency?._id || selectedCurrency?.currency_id || ""),
    currency_symbol: String(selectedCurrency?.symbol || selectedCurrency?.currency_symbol || ""),
    paymentTerms: paymentTermsMeta.value || "due-on-receipt",
    payment_terms: paymentTermsMeta.days,
    payment_terms_label: paymentTermsMeta.label,
    department: formData.department || "",
    designation: formData.designation || "",
    accountsReceivable: formData.accountsReceivable || "",
    openingBalance: formData.openingBalance || "0.00",
    receivables: parseFloat(formData.openingBalance || "0"),
    enablePortal: formData.enablePortal || false,
    ...buildCompliancePayload(formData),
    customerOwner: formData.customerOwner || "",
    remarks: formData.remarks || "",
    notes: formData.remarks || "",
    billingAddress,
    billing_address: billingAddress,
    shippingAddress,
    shipping_address: shippingAddress,
    contactPersons: contactPersonsPayload,
    contact_persons: contactPersonsPayload,
    primary_contact_id: primaryContactId,
    documents: formData.documents || [],
    customFields: formData.customFields || {},
    custom_fields: customFieldsArray,
    reportingTags: [],
  };
};

export const mergeCustomerForUpdate = (existingCustomerData: any, customerData: any) => {
  if (!existingCustomerData) return customerData;
  return {
    ...existingCustomerData,
    ...customerData,
    billingAddress: {
      ...(existingCustomerData.billingAddress || {}),
      ...(customerData.billingAddress || {}),
    },
    shippingAddress: {
      ...(existingCustomerData.shippingAddress || {}),
      ...(customerData.shippingAddress || {}),
    },
    defaultTemplates: {
      ...(existingCustomerData.defaultTemplates || existingCustomerData.default_templates || {}),
      ...(customerData.defaultTemplates || customerData.default_templates || {}),
    },
    default_templates: {
      ...(existingCustomerData.default_templates || existingCustomerData.defaultTemplates || {}),
      ...(customerData.default_templates || customerData.defaultTemplates || {}),
    },
    contactPersons: customerData.contactPersons,
    documents: customerData.documents,
    customFields: customerData.customFields,
    reportingTags: customerData.reportingTags,
  };
};

export const processCustomerDocuments = async (documents: any[], documentsAPI: any) => {
  const processedDocuments: any[] = [];
  if (!Array.isArray(documents) || documents.length === 0) {
    return processedDocuments;
  }

  for (const doc of documents) {
    if (doc.file) {
      try {
        const uploadResponse = await documentsAPI.upload(doc.file);
        if (uploadResponse.success && uploadResponse.data) {
          const document = uploadResponse.data as any;
          processedDocuments.push({
            documentId: document.documentId || document.id || document._id,
            name: doc.name,
            size: document.size || doc.file.size,
            mimeType: document.mimeType || doc.file.type || "application/octet-stream",
            url: document.viewUrl || document.url || document.contentUrl || document.previewUrl || "",
            viewUrl: document.viewUrl || document.url || document.contentUrl || document.previewUrl || "",
            downloadUrl: document.downloadUrl || document.url || document.contentUrl || "",
            uploadedAt: document.uploadedAt || new Date().toISOString(),
          });
        }
      } catch {
        // Skip failed uploads and continue with the rest.
      }
    } else {
      processedDocuments.push({
        documentId: doc.documentId || doc.id || doc._id,
        name: doc.name,
        size: doc.size || 0,
        mimeType: doc.mimeType || doc.type || "application/octet-stream",
        url: doc.viewUrl || doc.url || doc.contentUrl || doc.previewUrl || doc.base64 || "",
        viewUrl: doc.viewUrl || doc.url || doc.contentUrl || doc.previewUrl || doc.base64 || "",
        downloadUrl: doc.downloadUrl || doc.url || doc.contentUrl || "",
        uploadedAt: doc.uploadedAt || new Date().toISOString(),
      });
    }
  }

  return processedDocuments;
};
