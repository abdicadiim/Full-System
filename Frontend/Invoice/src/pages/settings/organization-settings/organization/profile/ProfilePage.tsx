import React, { useState, useRef, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { Upload, Edit2, X, Search, HelpCircle, Send, Settings as SettingsIcon, Info } from "lucide-react";
import { toast } from "react-toastify";
import Skeleton from "../../../../../components/ui/Skeleton";
import { TIMEZONES } from "../../../../../constants/timezones";
import { currenciesAPI } from "../../../../../services/api";

const API_BASE_URL = '/api';
const DEFAULT_SYSTEM_SENDER_EMAIL = "message-service@sender.tabanbooks.com";
const USER_STORAGE_KEYS = ["user", "current_user", "auth_user"];
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ORGANIZATION_PROFILE_STORAGE_KEYS = ["org_profile", "organization_profile"];
const LANGUAGE_LABEL_BY_CODE: Record<string, string> = {
  ar: "Arabic",
  de: "German",
  en: "English",
  es: "Spanish",
  fr: "French",
  hi: "Hindi",
  zh: "Chinese",
};

const getStoredUser = () => {
  try {
    for (const key of USER_STORAGE_KEYS) {
      const user = localStorage.getItem(key);
      if (!user) continue;
      return JSON.parse(user);
    }
    return null;
  } catch (error) {
    console.error('Error parsing local user:', error);
    return null;
  }
};

const safeParseJson = (value: string | null) => {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

const readStoredOrganizationProfile = () => {
  if (typeof localStorage === "undefined") return null;

  const profiles = ORGANIZATION_PROFILE_STORAGE_KEYS
    .map((key) => safeParseJson(localStorage.getItem(key)))
    .filter((profile) => profile && typeof profile === "object");

  if (profiles.length === 0) {
    return null;
  }

  return profiles.reduceRight((merged: any, profile: any) => {
    const profileAddress = profile?.address && typeof profile.address === "object" ? profile.address : {};
    const mergedAddress = merged?.address && typeof merged.address === "object" ? merged.address : {};
    return {
      ...profile,
      ...merged,
      address: {
        ...profileAddress,
        ...mergedAddress,
      },
    };
  }, {});
};

const getStoredProfileValue = (profile: any, keys: string[], fallback = "") => {
  if (!profile || typeof profile !== "object") return fallback;
  const address = profile?.address && typeof profile.address === "object" ? profile.address : {};

  for (const key of keys) {
    const candidates = [profile?.[key], address?.[key]];
    for (const candidate of candidates) {
      if (candidate === undefined || candidate === null) continue;
      const text = String(candidate).trim();
      if (text) return text;
    }
  }

  return fallback;
};

const getStoredProfileBoolean = (profile: any, keys: string[], fallback = false) => {
  if (!profile || typeof profile !== "object") return fallback;
  const address = profile?.address && typeof profile.address === "object" ? profile.address : {};

  for (const key of keys) {
    const candidates = [profile?.[key], address?.[key]];
    for (const candidate of candidates) {
      if (typeof candidate === "boolean") return candidate;
      if (typeof candidate === "string") {
        const normalized = candidate.trim().toLowerCase();
        if (["true", "1", "yes"].includes(normalized)) return true;
        if (["false", "0", "no"].includes(normalized)) return false;
      }
    }
  }

  return fallback;
};

const getStoredAdditionalFields = (profile: any) => {
  const candidates = [
    profile?.additionalFields,
    profile?.custom_fields,
  ];

  for (const candidate of candidates) {
    if (!Array.isArray(candidate)) continue;

    const normalized = candidate
      .map((field: any, index: number) => ({
        label: String(field?.label || "").trim(),
        value: String(field?.value || "").trim(),
        index: Number(field?.index) || index + 1,
      }))
      .filter((field: any) => field.label || field.value);

    return normalized.length > 0 ? normalized : [{ label: "", value: "" }];
  }

  return [{ label: "", value: "" }];
};

const INDUSTRIES = [
  "Agency or Sales House",
  "Agriculture",
  "Art and Design",
  "Automotive",
  "Construction",
  "Consulting",
  "Consumer Packaged Goods",
  "Education",
  "Engineering",
  "Entertainment",
  "Financial Services",
  "Food Services (Restaurants/Fast Food)",
  "Gaming",
  "Government",
  "Health Care",
  "Interior Design",
  "Internal",
  "Legal",
  "Manufacturing",
  "Marketing",
  "Mining and Logistics",
  "Non-Profit",
  "Publishing and Web Media",
  "Real Estate",
  "Retail (E-Commerce and Offline)",
  "Services",
  "Technology",
  "Telecommunications",
  "Travel/Hospitality",
  "Web Designing",
  "Web Development",
  "Writers"
];

const COUNTRIES = [
  "Aland Islands",
  "Albania",
  "Algeria",
  "American Samoa",
  "Andorra",
  "Angola",
  "Anguilla",
  "Antarctica",
  "Antigua and Barbuda",
  "Argentina",
  "Armenia",
  "Aruba",
  "Ashmore and Cartier Islands",
  "Australia",
  "Austria",
  "Azerbaijan",
  "Bahamas",
  "Bahrain",
  "Bangladesh",
  "Barbados",
  "Belarus",
  "Belgium",
  "Belize",
  "Benin",
  "Bermuda",
  "Bhutan",
  "Bolivia",
  "Bonaire, Sint Eustatius and Saba",
  "Bosnia",
  "Bosnia and Herzegovina",
  "Botswana",
  "Bouvet Island",
  "Brazil",
  "British Indian Ocean Territory",
  "British Virgin Islands",
  "Brunei",
  "Bulgaria",
  "Burkina Faso",
  "Burundi",
  "Cambodia",
  "Cameroon",
  "Canada",
  "Cape Verde",
  "Cayman Islands",
  "Central African Republic",
  "Chad",
  "Chile",
  "China",
  "Christmas Island",
  "Clipperton Island",
  "Cocos Islands",
  "Colombia",
  "Comoros",
  "Congo",
  "Cook Islands",
  "Coral Sea Islands",
  "Costa Rica",
  "Croatia",
  "Cuba",
  "Curacao",
  "Cyprus",
  "Czech Republic",
  "DR Congo",
  "Denmark",
  "Djibouti",
  "Dominica",
  "Dominican Republic",
  "Ecuador",
  "Egypt",
  "El Salvador",
  "Equatorial Guinea",
  "Eritrea",
  "Estonia",
  "Eswatini",
  "Ethiopia",
  "Falkland Islands",
  "Faroe Islands",
  "Fiji",
  "Finland",
  "France",
  "French Guiana",
  "French Polynesia",
  "French Southern Territories",
  "Gabon",
  "Gambia",
  "Georgia",
  "Germany",
  "Ghana",
  "Gibraltar",
  "Greece",
  "Greenland",
  "Grenada",
  "Guadeloupe",
  "Guam",
  "Guatemala",
  "Guernsey",
  "Guinea",
  "Guinea-Bissau",
  "Guyana",
  "Haiti",
  "Heard Island and McDonald Islands",
  "High Seas",
  "Honduras",
  "Hong Kong",
  "Hungary",
  "Iceland",
  "India",
  "Indonesia",
  "Iran",
  "Iraq",
  "Ireland",
  "Isle of Man",
  "Israel",
  "Italy",
  "Côte d'Ivoire",
  "Jamaica",
  "Japan",
  "Jersey",
  "Jordan",
  "Kazakhstan",
  "Kenya",
  "Kiribati",
  "Kosova Republic",
  "Kosovo",
  "Kuwait",
  "Kyrgyzstan",
  "Laos",
  "Latvia",
  "Lebanon",
  "Lesotho",
  "Liberia",
  "Libya",
  "Liechtenstein",
  "Lithuania",
  "Luxembourg",
  "Macau",
  "Madagascar",
  "Malawi",
  "Malaysia",
  "Maldives",
  "Mali",
  "Malta",
  "Marshall Islands",
  "Martinique",
  "Mauritania",
  "Mauritius",
  "Mayotte",
  "Mexico",
  "Micronesia",
  "Moldova",
  "Monaco",
  "Mongolia",
  "Montenegro",
  "Montserrat",
  "Morocco",
  "Mozambique",
  "Myanmar",
  "Namibia",
  "Nauru",
  "Nepal",
  "Netherlands",
  "Netherlands Antilles",
  "New Caledonia",
  "New Zealand",
  "Nicaragua",
  "Niger",
  "Nigeria",
  "Niue",
  "Norfolk Island",
  "North Korea",
  "North Macedonia",
  "Northern Mariana Islands",
  "Norway",
  "Oman",
  "Pakistan",
  "Palau",
  "Palestine",
  "Panama",
  "Papua New Guinea",
  "Paraguay",
  "Peru",
  "Philippines",
  "Pitcairn",
  "Poland",
  "Portugal",
  "Puerto Rico",
  "Qatar",
  "Reunion",
  "Romania",
  "Russia",
  "Rwanda",
  "Saint Barthelemy",
  "Saint Helena",
  "Saint Kitts and Nevis",
  "Saint Lucia",
  "Saint Martin",
  "Saint Pierre and Miquelon",
  "Saint Vincent and the Grenadines",
  "Samoa",
  "San Marino",
  "Sao Tome and Principe",
  "Saudi Arabia",
  "Senegal",
  "Serbia",
  "Serbia and Montenegro",
  "Seychelles",
  "Sierra Leone",
  "Singapore",
  "Sint Maarten",
  "Slovakia",
  "Slovenia",
  "Solomon Islands",
  "Somalia",
  "Somaliland",
  "South Africa",
  "South Georgia and the South Sandwich Islands",
  "South Korea",
  "South Sudan",
  "Spain",
  "Sri Lanka",
  "Sudan",
  "Suriname",
  "Svalbard and Jan Mayen",
  "Swaziland",
  "Sweden",
  "Switzerland",
  "Syria",
  "Taiwan",
  "Tajikistan",
  "Tanzania",
  "Thailand",
  "Timor Leste",
  "Togo",
  "Tokelau",
  "Tonga",
  "Trinidad and Tobago",
  "Tunisia",
  "Turkey",
  "Turkmenistan",
  "Turks and Caicos Islands",
  "Tuvalu",
  "U.A.E",
  "U.S.A",
  "Uganda",
  "Ukraine",
  "United Arab Emirates",
  "United Kingdom",
  "United States Minor Outlying Islands",
  "Uruguay",
  "Uzbekistan",
  "Vanuatu",
  "Vatican City",
  "Venezuela",
  "Vietnam",
  "Virgin Islands, British",
  "Virgin Islands, U.S.",
  "Wallis and Futuna",
  "Western Sahara",
  "Yemen",
  "Zambia",
  "Zimbabwe"
];

const DEFAULT_CURRENCY_OPTIONS = [
  "SOS - Somali Shilling",
  "USD - US Dollar",
  "EUR - Euro",
  "GBP - British Pound",
  "AMD - Armenian Dram",
  "AED - UAE Dirham",
  "SAR - Saudi Riyal",
  "INR - Indian Rupee",
  "CNY - Chinese Yuan",
  "JPY - Japanese Yen"
];
const CURRENCY_STORAGE_KEYS = ["taban_currencies", "taban_books_currencies"];
const LANGUAGES = ["English", "Spanish", "French", "German", "Arabic", "Chinese", "Hindi"];
const TIME_ZONES = TIMEZONES;
const DATE_FORMATS = {
  "short": [
    "MM-dd-yy [ 12-25-25 ]",
    "dd-MM-yy [ 25-12-25 ]",
    "yy-MM-dd [ 25-12-25 ]"
  ],
  "medium": [
    "MM-dd-yyyy [ 12-25-2025 ]",
    "dd-MM-yyyy [ 25-12-2025 ]",
    "yyyy-MM-dd [ 2025-12-25 ]"
  ],
  "long": [
    "dd MMM yyyy [ 25 Dec 2025 ]",
    "dd MMMM yyyy [ 25 December 2025 ]",
    "MMMM dd, yyyy [ December 25, 2025 ]",
    "EEE, MMMM dd, yyyy [ Thu, December 25, 2025 ]",
    "EEEEEE, MMMM dd, yyyy [ Thursday, December 25, 2025 ]",
    "MMM dd, yyyy [ Dec 25, 2025 ]",
    "yyyy MM dd [ 2025 12 25 ]",
    "yyyy年MM月dd日 [ 2025年12月25日 ]"
  ]
};

// Flatten all date formats for the value
const ALL_DATE_FORMATS = [
  ...DATE_FORMATS.short,
  ...DATE_FORMATS.medium,
  ...DATE_FORMATS.long
];
const FISCAL_YEARS = ["January - December", "February - January", "March - February", "April - March"];
const START_DATES = Array.from({ length: 31 }, (_, i) => i + 1);
const MONTH_OPTIONS = [
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

const getOrganizationEndpoint = () => {
  const organizationId = String(getStoredUser()?.organizationId || "").trim();
  return organizationId ? `${API_BASE_URL}/organizations/${organizationId}` : `${API_BASE_URL}/settings/organization/profile`;
};

const extractOrganizationResponse = (payload: any) => payload?.organization || payload?.data || null;

const getLanguageLabel = (value: string | null | undefined) => {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const normalized = raw.toLowerCase();
  return LANGUAGE_LABEL_BY_CODE[normalized] || raw;
};

const getLanguageCode = (value: string | null | undefined) => {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const normalized = raw.toLowerCase();
  const found = Object.entries(LANGUAGE_LABEL_BY_CODE).find(([, label]) => label.toLowerCase() === normalized);
  return found?.[0] || normalized;
};

const getFiscalYearLabel = (value: string | number | null | undefined) => {
  const raw = String(value ?? "").trim().toLowerCase();
  if (!raw) return "";

  let monthIndex = MONTH_OPTIONS.indexOf(raw);
  if (monthIndex < 0) {
    const numericValue = Number(raw);
    if (Number.isInteger(numericValue) && numericValue >= 0 && numericValue < MONTH_OPTIONS.length) {
      monthIndex = numericValue;
    }
  }

  if (monthIndex < 0) {
    return String(value || "");
  }

  const start = MONTH_OPTIONS[monthIndex];
  const end = MONTH_OPTIONS[(monthIndex + 11) % MONTH_OPTIONS.length];
  return `${start.charAt(0).toUpperCase()}${start.slice(1)} - ${end.charAt(0).toUpperCase()}${end.slice(1)}`;
};

const normalizeOrganizationPayload = (responsePayload: any) => {
  const payload = extractOrganizationResponse(responsePayload);
  if (!payload || typeof payload !== "object") return null;

  const address = payload?.address && typeof payload.address === "object" ? payload.address : {};
  const customFields = Array.isArray(payload?.custom_fields)
    ? payload.custom_fields
    : Array.isArray(payload?.additionalFields)
      ? payload.additionalFields
      : [];

  return {
    name: String(payload?.name || payload?.organizationName || "").trim(),
    industry: String(payload?.industry || payload?.industry_type || "").trim(),
    country: String(address?.country || payload?.country || "").trim(),
    website: String(payload?.website || "").trim(),
    email: String(payload?.email || "").trim(),
    baseCurrency: String(payload?.baseCurrency || payload?.currency_code || "").trim(),
    fiscalYear: String(payload?.fiscalYear || getFiscalYearLabel(payload?.fiscal_year_start_month)).trim(),
    startDate: String(payload?.startDate || payload?.start_date || "").trim(),
    reportBasis: String(payload?.reportBasis || "").trim(),
    orgLanguage: String(payload?.orgLanguage || getLanguageLabel(payload?.language_code)).trim(),
    commLanguage: String(payload?.commLanguage || "").trim(),
    timeZone: String(payload?.timeZone || payload?.time_zone || "").trim(),
    dateFormat: String(payload?.dateFormat || payload?.date_format || "").trim(),
    dateSeparator: String(payload?.dateSeparator || payload?.field_separator || "").trim(),
    street1: String(address?.street1 || address?.street_address1 || "").trim(),
    street2: String(address?.street2 || address?.street_address2 || "").trim(),
    city: String(address?.city || "").trim(),
    zipCode: String(address?.zipCode || address?.zip || "").trim(),
    state: String(address?.state || "").trim(),
    phone: String(address?.phone || payload?.phone || "").trim(),
    fax: String(address?.fax || payload?.fax || "").trim(),
    logo: String(payload?.logo || payload?.logoUrl || "").trim(),
    companyIdType: String(payload?.companyIdType || payload?.company_id_label || payload?.companyid_label || "").trim(),
    companyIdValue: String(payload?.companyIdValue || payload?.company_id_value || payload?.companyid_value || "").trim(),
    additionalFields: customFields.map((field: any, index: number) => ({
      label: String(field?.label || "").trim(),
      value: String(field?.value || "").trim(),
      index: Number(field?.index) || index + 1,
    })),
    paymentStubAddress: String(payload?.paymentStubAddress || "").trim(),
    showPaymentStubAddress: Boolean(payload?.showPaymentStubAddress),
  };
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

const validateProfileForm = (input: {
  orgName: string;
  industry: string;
  location: string;
  email: string;
  website: string;
  baseCurrency: string;
  timeZone: string;
  paymentStubAddress: string;
  companyIdType: string;
  companyIdValue: string;
  additionalFields: Array<{ label?: string; value?: string }>;
}) => {
  if (!input.orgName.trim()) return "Organization name is required.";
  if (!input.industry.trim()) return "Industry is required.";
  if (!input.location.trim()) return "Organization location is required.";
  if (!extractCurrencyCode(input.baseCurrency)) return "Base currency is required.";
  if (!input.timeZone.trim()) return "Time zone is required.";

  const normalizedEmail = input.email.trim().toLowerCase();
  if (normalizedEmail && !EMAIL_REGEX.test(normalizedEmail)) {
    return "Enter a valid organization email address.";
  }

  if (input.website.trim() && !isValidWebsite(input.website.trim())) {
    return "Enter a valid website URL.";
  }

  if ((input.companyIdType.trim() && !input.companyIdValue.trim()) || (!input.companyIdType.trim() && input.companyIdValue.trim())) {
    return "Company ID type and value must be entered together.";
  }

  const incompleteAdditionalField = input.additionalFields.find((field) => {
    const label = String(field?.label || "").trim();
    const value = String(field?.value || "").trim();
    return (label || value) && (!label || !value);
  });

  if (incompleteAdditionalField) {
    return "Each additional field needs both a label and a value.";
  }

  if (input.paymentStubAddress.trim().length > 255) {
    return "Payment stub address cannot exceed 255 characters.";
  }

  return "";
};

const isBaseCurrencyRecord = (currency: any) => {
  const flag = currency?.isBase ?? currency?.isBaseCurrency ?? currency?.is_base_currency ?? currency?.baseCurrency ?? currency?.base_currency;
  if (typeof flag === "string") {
    return ["true", "yes", "1", "base"].includes(flag.trim().toLowerCase());
  }
  return Boolean(flag);
};

const formatCurrencyOption = (code: string, name: string) => `${code} - ${name}`;

const normalizeCurrencyOption = (raw: any) => {
  const code = String(raw?.code || raw?.currencyCode || "").trim().toUpperCase();
  const name = String(raw?.name || raw?.currencyName || "").trim();

  if (!code || !name) {
    return null;
  }

  return {
    label: formatCurrencyOption(code, name),
    isBase: isBaseCurrencyRecord(raw),
  };
};

const buildCurrencyOptions = (rows: any[]) => {
  const seen = new Set<string>();
  const normalized = rows
    .map(normalizeCurrencyOption)
    .filter((currency): currency is { label: string; isBase: boolean } => Boolean(currency))
    .filter((currency) => {
      if (seen.has(currency.label)) {
        return false;
      }
      seen.add(currency.label);
      return true;
    });

  normalized.sort((a, b) => {
    if (a.isBase !== b.isBase) {
      return a.isBase ? -1 : 1;
    }
    return a.label.localeCompare(b.label);
  });

  return normalized.map((currency) => currency.label);
};

const extractCurrencyRows = (response: any) => {
  const candidates = [
    response?.data,
    response?.data?.data,
    response?.data?.currencies,
    response?.data?.items,
    response?.currencies,
    response?.items,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate;
    }
  }

  return [];
};

const readStoredCurrencyRows = () => {
  for (const storageKey of CURRENCY_STORAGE_KEYS) {
    try {
      const stored = localStorage.getItem(storageKey);
      if (!stored) continue;

      const parsed = JSON.parse(stored);
      const rows = Array.isArray(parsed)
        ? parsed
        : Array.isArray(parsed?.data)
          ? parsed.data
          : Array.isArray(parsed?.currencies)
            ? parsed.currencies
            : [];

      if (rows.length > 0) {
        return rows;
      }
    } catch {
      // Ignore malformed cache and try the next storage key.
    }
  }

  return [];
};

const resolveCurrencySelection = (value: string | null | undefined, options: string[]) => {
  const availableOptions = options.length > 0 ? options : DEFAULT_CURRENCY_OPTIONS;
  const fallback = availableOptions[0] || DEFAULT_CURRENCY_OPTIONS[0];
  const raw = String(value || "").trim();

  if (!raw) {
    return fallback;
  }

  const code = raw.split(" - ")[0].trim().toUpperCase();

  return availableOptions.find((option) => option.toUpperCase() === raw.toUpperCase())
    || availableOptions.find((option) => option.toUpperCase().startsWith(`${code} - `))
    || raw;
};

const readStoredCurrencyOptions = () => {
  const rows = readStoredCurrencyRows();
  const options = buildCurrencyOptions(rows);
  return options.length > 0 ? options : DEFAULT_CURRENCY_OPTIONS;
};

const extractCurrencyCode = (value: string | null | undefined) =>
  String(value || "").split(" - ")[0].trim().toUpperCase();

const getBaseCurrencySelectionFromRows = (rows: any[], options?: string[]) => {
  const base = normalizeCurrencyOption(rows.find(isBaseCurrencyRecord));
  if (!base) return null;
  const availableOptions = options && options.length > 0 ? options : buildCurrencyOptions(rows);
  return resolveCurrencySelection(base.label, availableOptions);
};

const readStoredBaseCurrencySelection = () => {
  const rows = readStoredCurrencyRows();
  return rows.length > 0 ? getBaseCurrencySelectionFromRows(rows) : null;
};

const updateStoredBaseCurrencySelection = (selectedCurrency: string) => {
  const targetCode = extractCurrencyCode(selectedCurrency);
  if (!targetCode) return;

  for (const storageKey of CURRENCY_STORAGE_KEYS) {
    try {
      const stored = localStorage.getItem(storageKey);
      if (!stored) continue;

      const parsed = JSON.parse(stored);
      const rows = Array.isArray(parsed)
        ? parsed
        : Array.isArray(parsed?.data)
          ? parsed.data
          : Array.isArray(parsed?.currencies)
            ? parsed.currencies
            : [];

      if (!rows.length) continue;

      const nextRows = rows.map((row: any) => {
        const rowCode = extractCurrencyCode(String(row?.code || row?.currencyCode || ""));
        const isTarget = rowCode === targetCode;
        const nextRow: any = {
          ...row,
          isBase: isTarget,
          isBaseCurrency: isTarget,
        };

        if (Object.prototype.hasOwnProperty.call(row, "is_base_currency")) {
          nextRow.is_base_currency = isTarget;
        }
        if (Object.prototype.hasOwnProperty.call(row, "baseCurrency")) {
          nextRow.baseCurrency = isTarget;
        }
        if (Object.prototype.hasOwnProperty.call(row, "base_currency")) {
          nextRow.base_currency = isTarget;
        }

        return nextRow;
      });

      localStorage.setItem(storageKey, JSON.stringify(nextRows));
    } catch {
      // Ignore malformed cache writes.
    }
  }
};

// Helper for click away
function useClickAway(ref, onAway, additionalRef = null) {
  useEffect(() => {
    const fn = (e) => {
      const clickedInside = ref.current?.contains(e.target) || additionalRef?.current?.contains(e.target);
      if (!clickedInside) onAway?.();
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, [onAway, ref, additionalRef]);
}

// Searchable Dropdown Component
function SearchableDropdown({ value, placeholder, options, onChange }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0, openUpward: false });
  const box = useRef(null);
  const dropdownRef = useRef(null);

  useClickAway(box, () => setOpen(false), dropdownRef);

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? options.filter((o) => o.toLowerCase().includes(s)) : options;
  }, [options, q]);

  useEffect(() => {
    if (open && box.current) {
      const rect = box.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const dropdownHeight = 320;
      const spaceBelow = viewportHeight - rect.bottom;
      const spaceAbove = rect.top;
      const openUpward = spaceBelow < dropdownHeight && spaceAbove > spaceBelow;

      setPosition({
        top: openUpward ? rect.top - dropdownHeight - 8 : rect.bottom + 8,
        left: rect.left,
        width: rect.width,
        openUpward
      });
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const updatePosition = () => {
      if (box.current) {
        const rect = box.current.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const dropdownHeight = 320;
        const spaceBelow = viewportHeight - rect.bottom;
        const spaceAbove = rect.top;
        const openUpward = spaceBelow < dropdownHeight && spaceAbove > spaceBelow;

        setPosition({
          top: openUpward ? rect.top - dropdownHeight - 8 : rect.bottom + 8,
          left: rect.left,
          width: rect.width,
          openUpward
        });
      }
    };
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [open]);

  return (
    <>
      <div ref={box} className="relative w-full">
        <button
          type="button"
          className={`h-10 w-full rounded-lg border-2 bg-transparent px-3 text-left text-sm font-medium flex items-center justify-between transition
            ${open ? "border-blue-500 ring-2 ring-blue-100 shadow-md" : "border-gray-300 hover:border-gray-400"}
          `}
          onClick={() => setOpen((v) => !v)}
        >
          <span className={`truncate ${value ? "text-gray-900 font-semibold" : "text-gray-500"}`}>
            {value || placeholder}
          </span>
          <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
            className={`transition-transform ${open ? "rotate-180" : ""}`}
          >
            <path d="M3.5 5.25l3.5 3.5 3.5-3.5" stroke="#6b7280" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      {open && createPortal(
        <div
          ref={dropdownRef}
          className="fixed overflow-hidden rounded-xl border-2 border-blue-300 bg-white shadow-[0_20px_40px_rgba(0,0,0,0.25)]"
          style={{
            top: `${position.top}px`,
            left: `${position.left}px`,
            width: `${position.width}px`,
            zIndex: 99999,
            maxHeight: '320px',
            display: 'flex',
            flexDirection: 'column'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-2 border-b-2 border-gray-200 bg-gradient-to-r from-gray-50 to-blue-50/30 px-3 py-3 flex-shrink-0">
            <Search size={16} className="text-gray-400" />
            <input
              autoFocus
              className="w-full bg-transparent text-sm font-medium outline-none placeholder:text-gray-400"
              placeholder="Search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>

          <div className="overflow-auto flex-1" style={{ maxHeight: '280px' }}>
            {list.map((opt) => {
              const isSelected = opt === value;
              return (
                <button
                  key={opt}
                  type="button"
                  className={`w-full px-4 py-2.5 text-left text-sm font-medium transition
                    ${isSelected ? "bg-blue-500 text-white" : "text-gray-900 hover:bg-gray-50"}
                  `}
                  onClick={() => {
                    onChange(opt);
                    setOpen(false);
                    setQ("");
                  }}
                >
                  {opt}
                </button>
              );
            })}
            {list.length === 0 && (
              <div className="px-4 py-3 text-sm text-gray-400 text-center">No matches found</div>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

// Help Tooltip Component
function HelpTooltip({ text, children }) {
  const [show, setShow] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const targetRef = useRef(null);

  useEffect(() => {
    if (show && targetRef.current) {
      const rect = targetRef.current.getBoundingClientRect();
      setPosition({
        top: rect.top - 10, // 10px spacing
        left: rect.left + rect.width / 2
      });
    }
  }, [show]);

  return (
    <div
      ref={targetRef}
      className="inline-block relative"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && createPortal(
        <div
          className="fixed z-[999999] pointer-events-none"
          style={{
            top: `${position.top}px`,
            left: `${position.left}px`,
            transform: 'translate(-50%, -100%)'
          }}
        >
          <div className="bg-[#1f2937] text-white text-[13px] leading-relaxed py-3 px-4 rounded-lg shadow-xl max-w-[320px] relative font-medium text-center">
            {text}
            {/* Arrow */}
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-[6px] border-transparent border-t-[#1f2937]" />
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

// Date Format Dropdown with Categories
function DateFormatDropdown({ value, placeholder, onChange }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0, openUpward: false });
  const box = useRef(null);
  const dropdownRef = useRef(null);

  useClickAway(box, () => setOpen(false), dropdownRef);

  // Filter options by search query
  const filteredCategories = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return DATE_FORMATS;

    const filtered: Record<string, string[]> = {};
    Object.entries(DATE_FORMATS).forEach(([category, formats]) => {
      const matching = formats.filter(f => f.toLowerCase().includes(s));
      if (matching.length > 0) {
        filtered[category] = matching;
      }
    });
    return filtered;
  }, [q]);

  useEffect(() => {
    if (open && box.current) {
      const rect = box.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const dropdownHeight = 400;
      const spaceBelow = viewportHeight - rect.bottom;
      const spaceAbove = rect.top;
      const openUpward = spaceBelow < dropdownHeight && spaceAbove > spaceBelow;

      setPosition({
        top: openUpward ? rect.top - dropdownHeight - 8 : rect.bottom + 8,
        left: rect.left,
        width: rect.width,
        openUpward
      });
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const updatePosition = () => {
      if (box.current) {
        const rect = box.current.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const dropdownHeight = 400;
        const spaceBelow = viewportHeight - rect.bottom;
        const spaceAbove = rect.top;
        const openUpward = spaceBelow < dropdownHeight && spaceAbove > spaceBelow;

        setPosition({
          top: openUpward ? rect.top - dropdownHeight - 8 : rect.bottom + 8,
          left: rect.left,
          width: rect.width,
          openUpward
        });
      }
    };
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [open]);

  return (
    <>
      <div ref={box} className="relative w-full">
        <button
          type="button"
          className={`h-10 w-full rounded-lg border-2 bg-transparent px-3 text-left text-sm font-medium flex items-center justify-between transition
            ${open ? "border-blue-500 ring-2 ring-blue-100 shadow-md" : "border-gray-300 hover:border-gray-400"}
          `}
          onClick={() => setOpen((v) => !v)}
        >
          <span className={`truncate ${value ? "text-gray-900 font-semibold" : "text-gray-500"}`}>
            {value || placeholder}
          </span>
          <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
            className={`transition-transform ${open ? "rotate-180" : ""}`}
          >
            <path d="M3.5 5.25l3.5 3.5 3.5-3.5" stroke="#6b7280" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      {open && createPortal(
        <div
          ref={dropdownRef}
          className="fixed overflow-hidden rounded-xl border-2 border-blue-300 bg-white shadow-[0_20px_40px_rgba(0,0,0,0.25)]"
          style={{
            top: `${position.top}px`,
            left: `${position.left}px`,
            width: `${position.width}px`,
            zIndex: 99999,
            maxHeight: '400px',
            display: 'flex',
            flexDirection: 'column'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-2 border-b-2 border-gray-200 bg-gradient-to-r from-gray-50 to-blue-50/30 px-3 py-3 flex-shrink-0">
            <Search size={16} className="text-gray-400" />
            <input
              autoFocus
              className="w-full bg-transparent text-sm font-medium outline-none placeholder:text-gray-400"
              placeholder="Search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>

          <div className="overflow-auto flex-1" style={{ maxHeight: '360px' }}>
            {Object.entries(filteredCategories).map(([category, formats]) => (
              <div key={category}>
                <div className="px-4 py-2 text-xs font-semibold text-gray-700 bg-gray-50 border-b border-gray-100 uppercase">
                  {category}
                </div>
                {formats.map((format) => {
                  const isSelected = format === value;
                  return (
                    <button
                      key={format}
                      type="button"
                      className={`w-full px-4 py-2.5 text-left text-sm font-medium transition flex items-center justify-between
                        ${isSelected ? "bg-blue-500 text-white" : "text-gray-900 hover:bg-gray-50"}
                      `}
                      onClick={() => {
                        onChange(format);
                        setOpen(false);
                        setQ("");
                      }}
                    >
                      <span>{format}</span>
                      {isSelected && (
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                          <path d="M13 4l-6 6-3-3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
            {Object.keys(filteredCategories).length === 0 && (
              <div className="px-4 py-3 text-sm text-gray-400 text-center">No matches found</div>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

export default function ProfilePage() {
  const navigate = useNavigate();
  const storedOrgProfile = useMemo(() => readStoredOrganizationProfile(), []);
  const [currencyOptions, setCurrencyOptions] = useState<string[]>(() => readStoredCurrencyOptions());
  const [orgName, setOrgName] = useState(() => getStoredProfileValue(storedOrgProfile, ["organizationName", "name"], "Taban enterprise") || "Taban enterprise");
  const [industry, setIndustry] = useState(() => getStoredProfileValue(storedOrgProfile, ["industry", "industry_type"], "Agriculture") || "Agriculture");
  const [location, setLocation] = useState(() => getStoredProfileValue(storedOrgProfile, ["location", "country"], "Somalia") || "Somalia");
  const [email, setEmail] = useState(() => getStoredProfileValue(storedOrgProfile, ["email"]));
  const [primarySenderName, setPrimarySenderName] = useState(() => {
    const storedUser = getStoredUser();
    return storedUser?.name || storedUser?.fullName || getStoredProfileValue(storedOrgProfile, ["primarySenderName"], "Organization Owner") || "Organization Owner";
  });
  const [primarySenderEmail, setPrimarySenderEmail] = useState(() => {
    const storedUser = getStoredUser();
    return storedUser?.email || getStoredProfileValue(storedOrgProfile, ["primarySenderEmail"], "");
  });
  const [logoImage, setLogoImage] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(() => getStoredProfileValue(storedOrgProfile, ["logo", "logoUrl"], "") || null);
  const [loadingProfile, setLoadingProfile] = useState(() => !storedOrgProfile);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [street1, setStreet1] = useState(() => getStoredProfileValue(storedOrgProfile, ["street1", "street_address1"]));
  const [street2, setStreet2] = useState(() => getStoredProfileValue(storedOrgProfile, ["street2", "street_address2"]));
  const [city, setCity] = useState(() => getStoredProfileValue(storedOrgProfile, ["city"]));
  const [zipCode, setZipCode] = useState(() => getStoredProfileValue(storedOrgProfile, ["zipCode", "zip"]));
  const [state, setState] = useState(() => getStoredProfileValue(storedOrgProfile, ["state"]));

  const [phone, setPhone] = useState(() => getStoredProfileValue(storedOrgProfile, ["phone"]));
  const [fax, setFax] = useState(() => getStoredProfileValue(storedOrgProfile, ["fax"]));
  const [website, setWebsite] = useState(() => getStoredProfileValue(storedOrgProfile, ["website"]));
  const [showPaymentStubAddress, setShowPaymentStubAddress] = useState(() => getStoredProfileBoolean(storedOrgProfile, ["showPaymentStubAddress"]));
  const [paymentStubAddress, setPaymentStubAddress] = useState(() => getStoredProfileValue(storedOrgProfile, ["paymentStubAddress"]));
  const [isEditAddressModalOpen, setIsEditAddressModalOpen] = useState(false);

  // Additional fields
  const [baseCurrency, setBaseCurrency] = useState(() => {
    const storedBaseSelection = readStoredBaseCurrencySelection();
    if (storedBaseSelection) {
      return storedBaseSelection;
    }
    const options = readStoredCurrencyOptions();
    const cur = getStoredProfileValue(storedOrgProfile, ["currency", "baseCurrency", "currency_code"]);
    if (cur) {
      return resolveCurrencySelection(cur, options);
    }
    return resolveCurrencySelection(null, options);
  });
  const [fiscalYear, setFiscalYear] = useState(() => getStoredProfileValue(storedOrgProfile, ["fiscalYear", "fiscal_year_start_month"], "January - December") || "January - December");
  const [startDate, setStartDate] = useState(() => getStoredProfileValue(storedOrgProfile, ["startDate"], "1") || "1");
  const [reportBasis, setReportBasis] = useState(() => getStoredProfileValue(storedOrgProfile, ["reportBasis"], "Accrual") || "Accrual");
  const [orgLanguage, setOrgLanguage] = useState(() => getStoredProfileValue(storedOrgProfile, ["orgLanguage", "language", "language_code"], "English") || "English");
  const [commLanguage, setCommLanguage] = useState(() => getStoredProfileValue(storedOrgProfile, ["commLanguage"], "English") || "English");
  const [timeZone, setTimeZone] = useState(() => getStoredProfileValue(storedOrgProfile, ["timeZone", "time_zone", "timezone"], "(GMT 3:00) Eastern African Time (Africa/Mogadishu)") || "(GMT 3:00) Eastern African Time (Africa/Mogadishu)");

  const [dateFormat, setDateFormat] = useState(() => getStoredProfileValue(storedOrgProfile, ["dateFormat", "date_format"], "dd-MM-yyyy [ 25-12-2025 ]") || "dd-MM-yyyy [ 25-12-2025 ]");
  const [dateSeparator, setDateSeparator] = useState(() => getStoredProfileValue(storedOrgProfile, ["dateSeparator", "field_separator"], "-") || "-");

  // Update date format when separator changes
  const handleDateSeparatorChange = (newSeparator) => {
    setDateSeparator(newSeparator);
    // Replace all separators in the current date format
    const updatedFormat = dateFormat.replace(/[-./]/g, newSeparator);
    setDateFormat(updatedFormat);
  };
  const [companyIdType, setCompanyIdType] = useState(() => getStoredProfileValue(storedOrgProfile, ["companyIdType", "companyid_label", "company_id_label"], "Company ID :") || "Company ID :");
  const [companyIdValue, setCompanyIdValue] = useState(() => getStoredProfileValue(storedOrgProfile, ["companyIdValue", "companyid_value", "company_id_value"]));
  const [additionalFields, setAdditionalFields] = useState<any[]>(() => getStoredAdditionalFields(storedOrgProfile));
  const [isSaving, setIsSaving] = useState(false);
  // Save feedback uses react-toastify (see `handleSave`).
  const [isEditCurrencyModalOpen, setIsEditCurrencyModalOpen] = useState(false);
  const [editCurrencyCode, setEditCurrencyCode] = useState("USD");
  const [editCurrencySymbol, setEditCurrencySymbol] = useState("$");
  const [editCurrencyName, setEditCurrencyName] = useState("United States Dollar");
  const [editCurrencyDecimals, setEditCurrencyDecimals] = useState("2");
  const [editCurrencyFormat, setEditCurrencyFormat] = useState("1,234,567.89");

  // Temporary state for the edit modal
  const [editStreet1, setEditStreet1] = useState(street1);
  const [editStreet2, setEditStreet2] = useState(street2);
  const [editCity, setEditCity] = useState(city);
  const [editZipCode, setEditZipCode] = useState(zipCode);
  const [editState, setEditState] = useState(state);
  const [editPhone, setEditPhone] = useState(phone);
  const [editFax, setEditFax] = useState(fax);

  const handleOpenEditModal = () => {
    setEditStreet1(street1);
    setEditStreet2(street2);
    setEditCity(city);
    setEditZipCode(zipCode);
    setEditState(state);
    setEditPhone(phone);
    setEditFax(fax);
    setIsEditAddressModalOpen(true);
  };

  const handleSaveAddress = () => {
    setStreet1(editStreet1);
    setStreet2(editStreet2);
    setCity(editCity);
    setZipCode(editZipCode);
    setState(editState);
    setPhone(editPhone);
    setFax(editFax);
    setIsEditAddressModalOpen(false);
  };

  const handleAddField = () => {
    setAdditionalFields([...additionalFields, { label: "", value: "" }]);
  };

  const handleFieldChange = (index, field, value) => {
    const updated = [...additionalFields];
    updated[index][field] = value;
    setAdditionalFields(updated);
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/bmp'];
      if (!validTypes.includes(file.type)) {
        alert('Please select a valid image file (jpg, jpeg, png, gif, bmp)');
        return;
      }

      // Validate file size (1MB = 1048576 bytes)
      if (file.size > 1048576) {
        alert('File size must be less than 1MB');
        return;
      }

      setLogoImage(file);

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(typeof reader.result === "string" ? reader.result : null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLogoClick = () => {
    fileInputRef.current?.click();
  };

  const handleRemoveLogo = (e) => {
    e.stopPropagation();
    setLogoImage(null);
    setLogoPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleOpenOrganizationAddressFormat = () => {
    navigate("/settings/general#organization-address-format");
  };
  const handleOpenCurrencyModal = () => {
    const code = baseCurrency?.split(" - ")[0] || "USD";
    setEditCurrencyCode(code);
    setEditCurrencySymbol(code === "USD" ? "$" : editCurrencySymbol);
    setEditCurrencyName(code === "USD" ? "United States Dollar" : editCurrencyName);
    setIsEditCurrencyModalOpen(true);
  };

  useEffect(() => {
    let isMounted = true;

    const applyCurrencyOptions = (options: string[], preferredSelection: string | null = null) => {
      if (!isMounted || options.length === 0) return;
      setCurrencyOptions(options);
      setBaseCurrency((current) => resolveCurrencySelection(preferredSelection || current, options));
    };

    const loadCurrencyOptions = async () => {
      const storedRows = readStoredCurrencyRows();
      const storedOptions = buildCurrencyOptions(storedRows);
      const storedBaseSelection = getBaseCurrencySelectionFromRows(storedRows, storedOptions);
      applyCurrencyOptions(
        storedOptions.length > 0 ? storedOptions : readStoredCurrencyOptions(),
        storedBaseSelection,
      );

      try {
        const response = await currenciesAPI.getAll({ limit: 2000 });
        const rows = extractCurrencyRows(response);
        const options = buildCurrencyOptions(rows);
        const baseSelection = getBaseCurrencySelectionFromRows(rows, options);
        if (options.length > 0) {
          applyCurrencyOptions(options, baseSelection);
        }
      } catch (error) {
        console.error("Error loading currency options:", error);
      }
    };

    void loadCurrencyOptions();

    return () => {
      isMounted = false;
    };
  }, []);

  // Load profile data on mount
  useEffect(() => {
    let isMounted = true;
    const applyIfEmpty = (currentValue: string, setter: (value: string) => void, nextValue: string) => {
      if (!String(currentValue || "").trim() && String(nextValue || "").trim()) {
        setter(nextValue);
      }
    };

    const loadProfile = async () => {
      if (!storedOrgProfile) {
        setLoadingProfile(true);
      }

      try {
        const token = localStorage.getItem('auth_token');
        if (!token) {
          return;
        }

        const response = await fetch(getOrganizationEndpoint(), {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          const p = normalizeOrganizationPayload(data);
          if (p && isMounted) {
            const storedBaseSelection = readStoredBaseCurrencySelection();

            applyIfEmpty(orgName, setOrgName, p.name);
            applyIfEmpty(industry, setIndustry, p.industry);
            applyIfEmpty(location, setLocation, p.country);
            applyIfEmpty(email, setEmail, p.email);
            applyIfEmpty(website, setWebsite, p.website);
            applyIfEmpty(street1, setStreet1, p.street1);
            applyIfEmpty(street2, setStreet2, p.street2);
            applyIfEmpty(city, setCity, p.city);
            applyIfEmpty(zipCode, setZipCode, p.zipCode);
            applyIfEmpty(state, setState, p.state);
            applyIfEmpty(phone, setPhone, p.phone);
            applyIfEmpty(fax, setFax, p.fax);
            applyIfEmpty(paymentStubAddress, setPaymentStubAddress, p.paymentStubAddress);
            applyIfEmpty(companyIdType, setCompanyIdType, p.companyIdType);
            applyIfEmpty(companyIdValue, setCompanyIdValue, p.companyIdValue);
            applyIfEmpty(fiscalYear, setFiscalYear, p.fiscalYear);
            applyIfEmpty(startDate, setStartDate, p.startDate || "1");
            applyIfEmpty(reportBasis, setReportBasis, p.reportBasis);
            applyIfEmpty(orgLanguage, setOrgLanguage, p.orgLanguage);
            applyIfEmpty(commLanguage, setCommLanguage, p.commLanguage);
            applyIfEmpty(timeZone, setTimeZone, p.timeZone);
            applyIfEmpty(dateFormat, setDateFormat, p.dateFormat);
            applyIfEmpty(dateSeparator, setDateSeparator, p.dateSeparator);

            if (storedBaseSelection) {
              setBaseCurrency(storedBaseSelection);
            } else if (!String(baseCurrency || "").trim() && p.baseCurrency) {
              setBaseCurrency(resolveCurrencySelection(p.baseCurrency, readStoredCurrencyOptions()));
            }

            if (!String(logoPreview || "").trim() && p.logo) {
              setLogoPreview(p.logo);
            }

            if (!showPaymentStubAddress && typeof p.showPaymentStubAddress === "boolean") {
              setShowPaymentStubAddress(p.showPaymentStubAddress);
            }

            if ((additionalFields.length === 0 || additionalFields.every((field) => !String(field?.label || "").trim() && !String(field?.value || "").trim()))
              && Array.isArray(p.additionalFields) && p.additionalFields.length > 0) {
              setAdditionalFields(p.additionalFields);
            }
          }
        }
      } catch (error) {
        console.error('Error loading profile:', error);
      } finally {
        if (isMounted) {
          setLoadingProfile(false);
        }
      }
    };

    loadProfile();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const loadPrimarySender = async () => {
      try {
        const storedUser = getStoredUser();
        if (storedUser?.name || storedUser?.fullName) {
          setPrimarySenderName(storedUser.name || storedUser.fullName);
        }
        if (storedUser?.email) {
          setPrimarySenderEmail(storedUser.email);
        }

        const token = localStorage.getItem('auth_token');
        if (!token) return;

        const response = await fetch(`${API_BASE_URL}/settings/sender-emails/primary`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) return;

        const data = await response.json();
        if (data?.success && data?.data) {
          if (data.data.name) setPrimarySenderName(data.data.name);
          if (data.data.email) setPrimarySenderEmail(data.data.email);
        }
      } catch (error) {
        console.error('Error loading primary sender:', error);
      }
    };

    loadPrimarySender();
  }, []);

  useEffect(() => {
    if (loadingProfile) return;

    const baseCurrencyCode = baseCurrency.split(" - ")[0];
    const sanitizedAdditionalFields = additionalFields
      .map((field, index) => ({
        index: index + 1,
        label: String(field?.label || "").trim(),
        value: String(field?.value || "").trim(),
      }))
      .filter((field) => field.label || field.value);

    const liveOrgProfile = {
      organizationName: orgName,
      name: orgName,
      industry,
      location,
      logo: logoPreview || "",
      logoUrl: logoPreview || "",
      email,
      website,
      baseCurrency: baseCurrencyCode,
      currency_code: baseCurrencyCode,
      fiscalYear,
      startDate,
      reportBasis,
      orgLanguage,
      commLanguage,
      language_code: getLanguageCode(orgLanguage) || "en",
      timeZone,
      time_zone: timeZone,
      dateFormat,
      date_format: dateFormat,
      dateSeparator,
      field_separator: dateSeparator,
      companyIdType,
      company_id_label: companyIdType,
      companyid_label: companyIdType,
      companyIdValue,
      company_id_value: companyIdValue,
      companyid_value: companyIdValue,
      custom_fields: sanitizedAdditionalFields,
      additionalFields: sanitizedAdditionalFields,
      paymentStubAddress,
      showPaymentStubAddress,
      address: {
        street1,
        street2,
        city,
        zipCode,
        state,
        country: location,
        phone,
        fax,
      },
    };

    if (orgName) {
      document.title = orgName;
    }

    try {
      localStorage.setItem("org_profile", JSON.stringify(liveOrgProfile));
      localStorage.setItem("organization_profile", JSON.stringify(liveOrgProfile));
    } catch {
      // ignore storage sync failures
    }

    window.dispatchEvent(new CustomEvent("organizationProfileUpdated", {
      detail: liveOrgProfile,
    }));

    window.dispatchEvent(new CustomEvent("brandingUpdated", {
      detail: {
        logo: logoPreview || "",
      },
    }));
  }, [
    loadingProfile,
    orgName,
    industry,
    location,
    logoPreview,
    email,
    website,
    baseCurrency,
    orgLanguage,
    timeZone,
    dateFormat,
    dateSeparator,
    street1,
    street2,
    city,
    zipCode,
    state,
    phone,
    fax,
    fiscalYear,
    startDate,
    reportBasis,
    commLanguage,
    companyIdType,
    companyIdValue,
    additionalFields,
    paymentStubAddress,
    showPaymentStubAddress,
  ]);

  const syncBaseCurrencyWithCurrencyTable = async (selectedCurrency: string) => {
    const selectedCode = extractCurrencyCode(selectedCurrency);
    if (!selectedCode) {
      return resolveCurrencySelection(selectedCurrency, currencyOptions);
    }

    const response = await currenciesAPI.getAll({ limit: 2000 });
    const rows = extractCurrencyRows(response);
    if (!rows.length) {
      updateStoredBaseCurrencySelection(selectedCurrency);
      return resolveCurrencySelection(selectedCurrency, currencyOptions);
    }

    const targetCurrency = rows.find(
      (row) => extractCurrencyCode(String(row?.code || row?.currencyCode || "")) === selectedCode,
    );

    if (!targetCurrency) {
      updateStoredBaseCurrencySelection(selectedCurrency);
      return resolveCurrencySelection(selectedCurrency, buildCurrencyOptions(rows));
    }

    const targetId = String(targetCurrency?._id || targetCurrency?.id || "").trim();
    if (targetId && !isBaseCurrencyRecord(targetCurrency)) {
      const updateResponse = await currenciesAPI.update(targetId, { isBaseCurrency: true });
      if (!updateResponse?.success) {
        throw new Error(updateResponse?.message || "Failed to update base currency in currencies table");
      }
    }

    const refreshedResponse = targetId ? await currenciesAPI.getAll({ limit: 2000 }) : response;
    const refreshedRows = extractCurrencyRows(refreshedResponse);
    const nextRows = refreshedRows.length > 0 ? refreshedRows : rows;
    const nextOptions = buildCurrencyOptions(nextRows);
    const nextSelection =
      getBaseCurrencySelectionFromRows(nextRows, nextOptions)
      || resolveCurrencySelection(selectedCurrency, nextOptions.length > 0 ? nextOptions : currencyOptions);

    if (nextOptions.length > 0) {
      setCurrencyOptions(nextOptions);
    }
    updateStoredBaseCurrencySelection(nextSelection);

    return nextSelection;
  };

  // Save profile function
  const handleSave = async () => {
    setIsSaving(true);

    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        toast.error('Not authenticated. Please login again.');
        setIsSaving(false);
        return;
      }

      const validationError = validateProfileForm({
        orgName,
        industry,
        location,
        email,
        website,
        baseCurrency,
        timeZone,
        paymentStubAddress,
        companyIdType,
        companyIdValue,
        additionalFields,
      });

      if (validationError) {
        toast.error(validationError);
        setIsSaving(false);
        return;
      }

      // Convert logo to base64 if image file is selected
      let logoBase64 = logoPreview || "";
      if (logoImage) {
        try {
          const reader = new FileReader();
          logoBase64 = await new Promise((resolve, reject) => {
            reader.onloadend = () => {
              const result = reader.result;
              // Check if result is too large (limit to 5MB for base64)
              if (result && (result as string).length > 5000000) {
                reject(new Error('Logo file is too large. Please use an image smaller than 1MB.'));
              } else {
                resolve(typeof result === "string" ? result : "");
              }
            };
            reader.onerror = reject;
            reader.readAsDataURL(logoImage);
          });
        } catch (logoError: any) {
          toast.error(logoError.message || 'Error processing logo image.');
          setIsSaving(false);
          return;
        }
      }

      // Convert fiscalYear and startDate to a Date object
      const startMonthName = fiscalYear.split(' - ')[0];
      const monthMap: { [key: string]: number } = {
        'January': 0, 'February': 1, 'March': 2, 'April': 3, 'May': 4, 'June': 5,
        'July': 6, 'August': 7, 'September': 8, 'October': 9, 'November': 10, 'December': 11
      };
      const monthIdx = monthMap[startMonthName] || 0;
      const fStartDate = new Date(new Date().getFullYear(), monthIdx, parseInt(startDate) || 1);
      const sanitizedAdditionalFields = additionalFields
        .map((field, index) => ({
          index: index + 1,
          label: String(field?.label || "").trim(),
          value: String(field?.value || "").trim(),
        }))
        .filter((field) => field.label || field.value);
      const baseCurrencyCode = baseCurrency.split(' - ')[0];

      const profileData = {
        name: orgName,
        industry_type: industry,
        contact_name: primarySenderName || orgName,
        email: email,
        website: website,
        logo: logoBase64,
        address: {
          street_address1: street1,
          street_address2: street2,
          city: city,
          zip: zipCode,
          state: state,
          country: location,
          phone: phone,
          fax: fax,
        },
        currency_code: baseCurrencyCode,
        baseCurrency: baseCurrencyCode,
        fiscal_year_start_month: startMonthName.toLowerCase(),
        fiscalYearStart: fStartDate.toISOString(),
        fiscalYear: fiscalYear,
        startDate: startDate,
        reportBasis: reportBasis,
        orgLanguage: orgLanguage,
        commLanguage: commLanguage,
        language_code: getLanguageCode(orgLanguage) || "en",
        time_zone: timeZone,
        timeZone: timeZone,
        date_format: dateFormat,
        dateFormat: dateFormat,
        field_separator: dateSeparator,
        dateSeparator: dateSeparator,
        companyid_label: companyIdType,
        companyid_value: companyIdValue,
        companyIdType: companyIdType,
        companyIdValue: companyIdValue,
        custom_fields: sanitizedAdditionalFields,
        additionalFields: sanitizedAdditionalFields,
        paymentStubAddress: paymentStubAddress,
        showPaymentStubAddress: showPaymentStubAddress,
      };

      console.log('Saving profile data:', profileData);

      const response = await fetch(getOrganizationEndpoint(), {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(profileData),
      });

      // Check if response has content before parsing
      let data;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const text = await response.text();
        if (text) {
          try {
            data = JSON.parse(text);
          } catch (parseError) {
            console.error('JSON parse error:', parseError);
            toast.error('Invalid response from server. Please try again.');
            setIsSaving(false);
            return;
          }
        } else {
          data = { success: false, message: 'Empty response from server' };
        }
      } else {
        const text = await response.text();
        toast.error(text || `Server error: ${response.status} ${response.statusText}`);
        setIsSaving(false);
        return;
      }

      if (response.ok && (data?.success || data?.code === 0)) {
        let syncedBaseCurrency = baseCurrency;
        try {
          syncedBaseCurrency = await syncBaseCurrencyWithCurrencyTable(baseCurrency);
          setBaseCurrency(syncedBaseCurrency);
        } catch (currencyError: any) {
          console.error('Error syncing base currency:', currencyError);
          toast.warn(currencyError?.message || 'Profile was saved, but the currencies table base currency could not be updated.');
        }

        toast.success('Profile saved successfully!');
        try {
          const existingOrgProfile = (() => {
            try {
              return JSON.parse(localStorage.getItem("organization_profile") || "{}");
            } catch {
              return {};
            }
          })();
          const updatedOrgProfile = {
            ...existingOrgProfile,
            organizationName: orgName,
            name: orgName,
            industry: industry,
            location: location,
            logo: logoBase64,
            logoUrl: logoBase64,
            email: email,
            website: website,
            baseCurrency: syncedBaseCurrency.split(" - ")[0],
            currency_code: syncedBaseCurrency.split(" - ")[0],
            fiscalYear: fiscalYear,
            startDate: startDate,
            reportBasis: reportBasis,
            orgLanguage: orgLanguage,
            commLanguage: commLanguage,
            language_code: getLanguageCode(orgLanguage) || "en",
            timeZone: timeZone,
            time_zone: timeZone,
            dateFormat: dateFormat,
            date_format: dateFormat,
            dateSeparator: dateSeparator,
            field_separator: dateSeparator,
            companyIdType: companyIdType,
            companyid_label: companyIdType,
            company_id_label: companyIdType,
            companyIdValue: companyIdValue,
            companyid_value: companyIdValue,
            company_id_value: companyIdValue,
            custom_fields: sanitizedAdditionalFields,
            additionalFields: sanitizedAdditionalFields,
            paymentStubAddress: paymentStubAddress,
            showPaymentStubAddress: showPaymentStubAddress,
            address: {
              ...(existingOrgProfile?.address || {}),
              street1: street1,
              street2: street2,
              city: city,
              zipCode: zipCode,
              state: state,
              country: location,
              phone: phone,
              fax: fax,
            },
          };
          localStorage.setItem("org_profile", JSON.stringify(updatedOrgProfile));
          localStorage.setItem("organization_profile", JSON.stringify(updatedOrgProfile));

          window.dispatchEvent(new CustomEvent("organizationProfileUpdated", {
            detail: updatedOrgProfile,
          }));

          window.dispatchEvent(new CustomEvent("brandingUpdated", {
            detail: {
              logo: logoBase64,
            },
          }));
        } catch {
          // ignore local storage sync failures
        }
      } else {
        toast.error(data.message || data.error || 'Failed to save profile. Please try again.');
      }
    } catch (error: any) {
      console.error('Error saving profile:', error);
      toast.error('An error occurred while saving. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const getFiscalPeriod = () => {
    if (fiscalYear === "January - December") {
      return "31 December - 30 December";
    }
    return "Period calculation";
  };

  if (loadingProfile) {
    return (
      <div className="p-6 max-w-4xl">
        <div className="mb-6 space-y-2">
          <Skeleton className="h-7 w-64" />
          <Skeleton className="h-4 w-40" />
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-6 mb-6">
          <div className="flex items-center gap-6">
            <Skeleton className="h-32 w-32 rounded-lg" />
            <div className="flex-1 space-y-3">
              <Skeleton className="h-4 w-56" />
              <Skeleton className="h-10 w-full max-w-[520px]" />
              <Skeleton className="h-4 w-44" />
              <Skeleton className="h-10 w-full max-w-[520px]" />
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-6 space-y-4">
          <Skeleton className="h-4 w-52" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="relative p-6 max-w-4xl pb-28">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-2xl font-semibold text-gray-900">Organization Profile</h1>
          <span className="px-3 py-1 bg-blue-100 text-blue-700 text-sm font-medium rounded-full">
            ID: 907496461
          </span>
        </div>
      </div>



      {/* Organization Logo */}
      <div className="rounded-lg border-0 p-6 mb-6">
        <div className="flex gap-6">
          <div className="flex-shrink-0">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/gif,image/bmp"
              onChange={handleLogoUpload}
              className="hidden"
            />
            <div
              className="w-32 h-32 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 transition relative"
              onClick={handleLogoClick}
            >
              {logoPreview ? (
                <>
                  <img
                    src={logoPreview}
                    alt="Organization Logo"
                    className="w-full h-full object-contain rounded-lg"
                  />
                  <button
                    onClick={handleRemoveLogo}
                    className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition"
                    title="Remove logo"
                  >
                    <X size={16} />
                  </button>
                  <div className="absolute bottom-2 left-2 right-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded text-center">
                    Click to change
                  </div>
                </>
              ) : (
                <>
                  <Upload size={32} className="text-gray-400 mb-2" />
                  <span className="text-sm font-medium text-gray-600 text-center px-2">Upload Your Organization Logo</span>
                </>
              )}
            </div>
          </div>
          <div className="flex-1">
            <p className="text-sm text-gray-600 mb-4">
              This logo will be displayed in transaction PDFs and email notifications.
            </p>
            <div className="space-y-1 text-xs text-gray-500">
              <p>Preferred Image Dimensions: 240 x 240 pixels @ 72 DPI</p>
              <p>Supported Files: jpg, jpeg, png, gif, bmp</p>
              <p>Maximum File Size: 1MB</p>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-gray-200 my-6" />

      {/* Organization Details */}
      <div className="rounded-lg border-0 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Organization Details</h2>
        <div className="space-y-4">
          <div className="grid grid-cols-[220px_1fr] items-center gap-6">
            <label className="text-sm font-medium text-red-500">
              Organization Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-gray-300 bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="grid grid-cols-[220px_1fr] items-center gap-6">
            <label className="text-sm font-medium text-red-500 flex items-center gap-1">
              Industry <span className="text-red-500">*</span>
              <HelpTooltip text="Select your industry type to help us fine-tune your experience. If you can't find your industry type from the list of options, you can input your own.">
                <HelpCircle size={14} className="inline text-gray-400 cursor-help" />
              </HelpTooltip>
            </label>
            <SearchableDropdown
              value={industry}
              placeholder="Select Industry"
              options={INDUSTRIES}
              onChange={setIndustry}
            />
          </div>
          <div className="grid grid-cols-[220px_1fr] items-center gap-6">
            <label className="text-sm font-medium text-red-500">
              Organization Location <span className="text-red-500">*</span>
            </label>
            <SearchableDropdown
              value={location}
              placeholder="Select Country"
              options={COUNTRIES}
              onChange={setLocation}
            />
          </div>
          <div className="space-y-3 rounded-2xl p-5">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-700">Organization Address</span>
              <HelpTooltip text="Street details, city, state, and contact numbers display on PDFs and transaction headers.">
                <HelpCircle size={14} className="text-gray-400 cursor-help" />
              </HelpTooltip>
              <button
                type="button"
                className="ml-auto flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700"
              >
                <Edit2 size={16} />
                Edit
              </button>
            </div>
            <div className="space-y-3">
              <input
                type="text"
                value={street1}
                onChange={(e) => setStreet1(e.target.value)}
                placeholder="Street 1"
                className="w-full h-10 px-3 rounded-lg border border-gray-300 bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                value={street2}
                onChange={(e) => setStreet2(e.target.value)}
                placeholder="Street 2"
                className="w-full h-10 px-3 rounded-lg border border-gray-300 bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="grid gap-3 md:grid-cols-2">
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="City"
                  className="w-full h-10 px-3 rounded-lg border border-gray-300 bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="text"
                  value={zipCode}
                  onChange={(e) => setZipCode(e.target.value)}
                  placeholder="ZIP/Postal Code"
                  className="w-full h-10 px-3 rounded-lg border border-gray-300 bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <select
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-gray-300 bg-transparent text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">State/Province *</option>
                  <option value="Banaadir">Banaadir</option>
                  <option value="Lower Shabelle">Lower Shabelle</option>
                  <option value="Mogadishu">Mogadishu</option>
                </select>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Phone"
                  className="w-full h-10 px-3 rounded-lg border border-gray-300 bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <input
                type="text"
                value={fax}
                onChange={(e) => setFax(e.target.value)}
                placeholder="Fax Number"
                className="w-full h-10 px-3 rounded-lg border border-gray-300 bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="pt-2">
              <button
                type="button"
                onClick={handleOpenOrganizationAddressFormat}
                className="text-sm font-medium text-blue-600 hover:text-blue-700"
              >
                Organization Address Format &gt;
              </button>
            </div>
          </div>
          <div className="rounded-lg border border-gray-200 p-4 bg-[#d8dbe0]">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">
                Would you like to add a different address for payment stubs?
              </span>
              <div className="flex items-center gap-2">
                <span className={`text-sm font-medium ${showPaymentStubAddress ? 'text-gray-600' : 'text-blue-600'}`}>
                  {showPaymentStubAddress ? 'Yes' : 'No'}
                </span>
                <button
                  onClick={() => setShowPaymentStubAddress(!showPaymentStubAddress)}
                  className={`relative w-12 h-6 rounded-full transition-colors ${showPaymentStubAddress ? 'bg-blue-600' : 'bg-gray-300'
                    }`}
                >
                  <span
                    className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${showPaymentStubAddress ? 'translate-x-6' : 'translate-x-0'
                      }`}
                  />
                </button>
              </div>
            </div>
            {showPaymentStubAddress && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Stub Address <HelpTooltip text="This address will be displayed on payment stubs. You can view this by enabling Payment Stub in Templates.">
                    <HelpCircle size={14} className="inline text-gray-400 cursor-help" />
                  </HelpTooltip>
                </label>
                <textarea
                  value={paymentStubAddress}
                  onChange={(e) => setPaymentStubAddress(e.target.value)}
                  placeholder="You can enter a maximum of 255 characters"
                  rows={4}
                  maxLength={255}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Organization Address hidden per request */}

      <div className="border-t border-gray-200 my-6" />

      {/* Primary Contact */}
      <div className="rounded-lg border-0 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Primary Contact</h2>
        <div className="rounded-lg border border-gray-200 bg-white p-4 mb-4">
          <div className="grid grid-cols-2 gap-6">
            <div className="pr-6 border-r border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <Send size={16} className="text-gray-600" />
                <span className="text-xs font-semibold text-gray-600 uppercase">SENDER</span>
              </div>
              <div className="text-sm font-medium text-gray-900">{primarySenderName || "Organization Owner"}</div>
              <div className="text-sm text-gray-600">({primarySenderEmail || email || "No email"})</div>
            </div>
            <div className="pl-2">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-gray-600 uppercase">EMAILS ARE SENT THROUGH</span>
                </div>
                <button
                  className="p-1 hover:bg-gray-100 rounded"
                  onClick={() => navigate("/settings/customization/email-notifications")}
                >
                  <SettingsIcon size={16} className="text-blue-600" />
                </button>
              </div>
              <div className="text-sm font-medium text-gray-900">Email address of {orgName || "Organization"}</div>
              <div className="text-sm text-gray-600">({email || DEFAULT_SYSTEM_SENDER_EMAIL})</div>
            </div>
          </div>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2">
          <HelpCircle size={16} className="text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-gray-700">
            Your primary contact's email address belongs to a public domain. So, emails will be sent from {DEFAULT_SYSTEM_SENDER_EMAIL} to prevent them from landing in the Spam folder.
          </div>
        </div>
      </div>

      <div className="border-t border-gray-200 my-6" />

      {/* Base Currency */}
      <div className="rounded-lg border-0 p-6 mb-6">
        <div className="flex items-start gap-6">
          <label className="w-56 text-sm font-medium text-gray-700 pt-2">
            Base Currency <HelpTooltip text="Your transactions and financial reports will be shown in the base currency.">
              <HelpCircle size={14} className="inline text-gray-400 cursor-help ml-1" />
            </HelpTooltip>
          </label>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <SearchableDropdown
                  value={baseCurrency}
                  placeholder="Select Currency"
                  options={currencyOptions}
                  onChange={setBaseCurrency}
                />
              </div>
              <button className="p-1 hover:bg-gray-100 rounded" onClick={handleOpenCurrencyModal}>
                <SettingsIcon size={16} className="text-blue-600" />
              </button>
            </div>
            <div className="text-xs text-gray-500 mt-2">
              You can't change the base currency as there are <button className="text-blue-600 hover:underline">transactions</button> recorded in your organization.
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-gray-200 my-6" />

      {/* Fiscal Year */}
      <div className="rounded-lg border-0 p-6 mb-6">
        <div className="flex items-start gap-6">
          <label className="w-56 text-sm font-medium text-gray-700 pt-2">Fiscal Year</label>
          <div className="flex-1">
            <div className="grid grid-cols-2 gap-4 mb-2">
              <SearchableDropdown
                value={fiscalYear}
                placeholder="Select Fiscal Year"
                options={FISCAL_YEARS}
                onChange={setFiscalYear}
              />
              <SearchableDropdown
                value={startDate}
                placeholder="Start Date"
                options={START_DATES.map(d => d.toString())}
                onChange={setStartDate}
              />
            </div>
            <div className="mt-2">
              <div className="h-10 px-3 rounded-lg border border-gray-300 bg-transparent text-sm text-gray-700 flex items-center">
                Period: {getFiscalPeriod()}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-gray-200 my-6" />

      {/* Report Basis */}
      <div className="rounded-lg border-0 p-6 mb-6">
        <div className="flex items-start gap-6">
          <label className="w-56 text-sm font-medium text-gray-700 pt-2">Report Basis</label>
          <div className="flex-1 space-y-3">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="radio"
                name="reportBasis"
                value="Accrual"
                checked={reportBasis === "Accrual"}
                onChange={() => setReportBasis("Accrual")}
                className="mt-1 h-4 w-4 accent-[#0f6e60] border-gray-300"
              />
              <div>
                <span className="text-sm font-semibold text-gray-900">Accrual</span>
                <p className="text-xs text-gray-500">You owe tax as of invoice date</p>
              </div>
            </label>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="radio"
                name="reportBasis"
                value="Cash"
                checked={reportBasis === "Cash"}
                onChange={() => setReportBasis("Cash")}
                className="mt-1 h-4 w-4 accent-[#0f6e60] border-gray-300"
              />
              <div>
                <span className="text-sm font-semibold text-gray-900">Cash</span>
                <p className="text-xs text-gray-500">You owe tax upon payment receipt</p>
              </div>
            </label>
          </div>
        </div>
      </div>

      {/* Organization Language */}
      <div className="rounded-lg border-0 p-6 mb-6">
        <div className="flex items-start gap-6">
          <label className="w-56 text-sm font-medium text-gray-700 pt-2">
            Organization Language <HelpTooltip text="Any change in the language will not be reflected in Chart of Accounts, Email Templates, Template Customizations, Payment Modes and Default tax Rates. These will still remain in the language selected during this organization's setup.">
              <HelpCircle size={14} className="inline text-gray-400 cursor-help ml-1" />
            </HelpTooltip>
          </label>
          <div className="flex-1">
            <SearchableDropdown
              value={orgLanguage}
              placeholder="Select Language"
              options={LANGUAGES}
              onChange={setOrgLanguage}
            />
          </div>
        </div>
      </div>

      <div className="border-t border-gray-200 my-6" />

      {/* Communication Languages */}
      <div className="rounded-lg border-0 p-6 mb-6">
        <div className="flex items-start gap-6">
          <label className="w-56 text-sm font-medium text-gray-700 pt-2">
            Communication Languages <HelpTooltip text="Select the languages in which users can create email templates and send emails to customers and vendors.">
              <HelpCircle size={14} className="inline text-gray-400 cursor-help ml-1" />
            </HelpTooltip>
          </label>
          <div className="flex-1">
            <SearchableDropdown
              value={commLanguage}
              placeholder="Select Language"
              options={LANGUAGES}
              onChange={setCommLanguage}
            />
          </div>
        </div>
      </div>

      <div className="border-t border-gray-200 my-6" />

      {/* Time Zone */}
      <div className="rounded-lg border-0 p-6 mb-6">
        <div className="flex items-start gap-6">
          <label className="w-56 text-sm font-medium text-gray-700 pt-2">Time Zone</label>
          <div className="flex-1">
            <SearchableDropdown
              value={timeZone}
              placeholder="Select Time Zone"
              options={TIME_ZONES}
              onChange={setTimeZone}
            />
          </div>
        </div>
      </div>

      <div className="border-t border-gray-200 my-6" />

      {/* Date Format */}
      <div className="rounded-lg border-0 p-6 mb-6">
        <div className="flex items-start gap-6">
          <label className="w-56 text-sm font-medium text-gray-700 pt-2">Date Format</label>
          <div className="flex-1">
            <div className="grid grid-cols-1">
              <DateFormatDropdown
                value={dateFormat}
                placeholder="Select Date Format"
                onChange={setDateFormat}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-gray-200 my-6" />

      {/* Company ID */}
      <div className="rounded-lg border-0 p-6 mb-6">
        <div className="flex items-start gap-6">
          <label className="w-56 text-sm font-medium text-gray-700 pt-2">Company ID</label>
          <div className="flex-1">
            <div className="grid grid-cols-2 gap-4">
              <SearchableDropdown
                value={companyIdType}
                placeholder="Select Type"
                options={["ACN", "BN", "CN", "CPR", "CVR", "DIW", "KT", "ORG", "SEC", "CRN", "Company ID :"]}
                onChange={setCompanyIdType}
              />
              <input
                type="text"
                value={companyIdValue}
                onChange={(e) => setCompanyIdValue(e.target.value)}
                placeholder="Enter Company ID"
                className="h-10 px-3 rounded-lg border border-gray-300 bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-gray-200 my-6" />

      {/* Additional Fields */}
      <div className="rounded-lg border-0 p-6 mb-6">
        <h3 className="text-sm font-bold text-gray-900 mb-4">Additional Fields</h3>
        <div className="mb-4">
          <div className="rounded-lg border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-600 uppercase">LABEL NAME</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-600 uppercase">VALUE</th>
                </tr>
              </thead>
              <tbody>
                {additionalFields.map((field, index) => (
                  <tr key={index} className="border-b border-gray-200 last:border-b-0">
                    <td className="py-2 px-3 border-r border-gray-200">
                      <input
                        type="text"
                        value={field.label}
                        onChange={(e) => handleFieldChange(index, 'label', e.target.value)}
                        placeholder="Label"
                        className="w-full h-9 px-3 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="text"
                        value={field.value}
                        onChange={(e) => handleFieldChange(index, 'value', e.target.value)}
                        placeholder="Value"
                        className="w-full h-9 px-3 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <button
          onClick={handleAddField}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700"
        >
          <span className="text-lg">+</span> New Field
        </button>
        <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2">
          <HelpCircle size={16} className="text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-gray-700">
            You can include the Company ID and additional fields in your organization address which will be displayed in your transaction PDFs. Configure this by selecting the required placeholders in your{" "}
            <button
              type="button"
              onClick={handleOpenOrganizationAddressFormat}
              className="text-blue-600 hover:underline"
            >
              Organization Address Format
            </button>.
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="sticky bottom-0 z-20 -mx-6 mt-8 flex items-center justify-start gap-3 bg-transparent px-6 py-4">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? 'Saving...' : 'Save'}
        </button>
        <button
          onClick={() => window.history.back()}
          className="px-4 py-2 rounded-lg border border-gray-300 bg-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-300"
          disabled={isSaving}
        >
          Cancel
        </button>
      </div>

      {/* Edit Address Modal */}
      {
        isEditAddressModalOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000]"
            onClick={() => setIsEditAddressModalOpen(false)}
          >
            <div
              className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <div className="flex items-center gap-2">
                  <Edit2 size={18} className="text-gray-600" />
                  <h3 className="text-lg font-semibold text-gray-900">Edit Organization Address</h3>
                </div>
                <button
                  onClick={() => setIsEditAddressModalOpen(false)}
                  className="p-1 hover:bg-gray-100 rounded transition"
                >
                  <X size={20} className="text-gray-500" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                  <input
                    type="text"
                    value={editStreet1}
                    onChange={(e) => setEditStreet1(e.target.value)}
                    placeholder="Street 1"
                    className="w-full h-10 px-3 rounded-lg border border-gray-300 bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
                  />
                  <input
                    type="text"
                    value={editStreet2}
                    onChange={(e) => setEditStreet2(e.target.value)}
                    placeholder="Street 2"
                    className="w-full h-10 px-3 rounded-lg border border-gray-300 bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                  <input
                    type="text"
                    value={editCity}
                    onChange={(e) => setEditCity(e.target.value)}
                    placeholder="City"
                    className="w-full h-10 px-3 rounded-lg border border-gray-300 bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">ZIP/Postal Code</label>
                  <input
                    type="text"
                    value={editZipCode}
                    onChange={(e) => setEditZipCode(e.target.value)}
                    placeholder="ZIP/Postal Code"
                    className="w-full h-10 px-3 rounded-lg border border-gray-300 bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    State/County
                  </label>
                  <select
                    value={editState}
                    onChange={(e) => setEditState(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-gray-300 bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">State/Province *</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                  <input
                    type="text"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    placeholder="Phone"
                    className="w-full h-10 px-3 rounded-lg border border-gray-300 bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Fax Number</label>
                  <input
                    type="text"
                    value={editFax}
                    onChange={(e) => setEditFax(e.target.value)}
                    placeholder="Fax Number"
                    className="w-full h-10 px-3 rounded-lg border border-gray-300 bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200">
                <button
                  onClick={() => setIsEditAddressModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-gray-300 bg-transparent text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveAddress}
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
                >
                  Proceed
                </button>
              </div>
            </div>
          </div>
        )
      }

      {/* Edit Currency Modal */}
      {
        isEditCurrencyModalOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-[10000] pt-16"
            onClick={() => setIsEditCurrencyModalOpen(false)}
          >
            <div
              className="bg-white rounded-lg shadow-xl w-full max-w-xl mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Edit Currency</h3>
                <button
                  onClick={() => setIsEditCurrencyModalOpen(false)}
                  className="p-1 hover:bg-gray-100 rounded transition"
                >
                  <X size={20} className="text-red-500" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-red-500 mb-2">Currency Code*</label>
                  <input
                    type="text"
                    value={editCurrencyCode}
                    onChange={(e) => setEditCurrencyCode(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-gray-300 bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-red-500 mb-2">Currency Symbol*</label>
                  <input
                    type="text"
                    value={editCurrencySymbol}
                    onChange={(e) => setEditCurrencySymbol(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-gray-300 bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-red-500 mb-2">Currency Name*</label>
                  <input
                    type="text"
                    value={editCurrencyName}
                    onChange={(e) => setEditCurrencyName(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-gray-300 bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Decimal Places</label>
                  <SearchableDropdown
                    value={editCurrencyDecimals}
                    placeholder="2"
                    options={["0", "1", "2", "3"]}
                    onChange={setEditCurrencyDecimals}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Format</label>
                  <SearchableDropdown
                    value={editCurrencyFormat}
                    placeholder="1,234,567.89"
                    options={["1,234,567.89", "1.234.567,89", "1 234 567.89"]}
                    onChange={setEditCurrencyFormat}
                  />
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 border-t border-gray-200">
                <button
                  onClick={() => setIsEditCurrencyModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-gray-300 bg-transparent text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => setIsEditCurrencyModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )
      }
    </div >
  );
}

