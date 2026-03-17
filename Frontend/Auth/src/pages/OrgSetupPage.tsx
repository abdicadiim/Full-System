import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Country, State } from "country-state-city";
import { iso6393 } from "iso-639-3";
import SetupHeader from "../components/SetupHeader";
import SearchableSelect, { type SelectOption } from "../components/SearchableSelect";
import { getAppDisplayName } from "../lib/appBranding";
import { TIME_ZONES } from "./timezones";
import { orgApi } from "../services/orgApi";

const COUNTRIES: SelectOption[] = Country.getAllCountries()
  .map((c) => ({ value: c.isoCode, label: c.name }))
  .sort((a, b) => a.label.localeCompare(b.label));

const getDefaultCountryIso = () => {
  const somalia = COUNTRIES.find((c) => c.label === "Somalia")?.value;
  return somalia ?? COUNTRIES[0]?.value ?? "SO";
};
const CURRENCIES = [
  "AED - UAE Dirham",
  "AFN - Afghan Afghani",
  "ALL - Albanian Lek",
  "AMD - Armenian Dram",
  "ANG - Netherlands Antillian Guilder",
  "AOA - Angolan Kwanza",
  "ARS - Argentine Peso",
  "AUD - Australian Dollar",
  "AWG - Aruban Guilder",
  "AZN - Azerbaijanian Manat",
  "BAM - Bosnia and Herzegovina Convertible Marks",
  "BBD - Barbadian Dollar",
  "BDT - Bangladeshi Taka",
  "BGN - Bulgarian Lev",
  "BHD - Bahraini Dinar",
  "BIF - Burundian Franc",
  "BMD - Bermudian Dollar (Bermuda Dollar)",
  "BND - Brunei Dollar",
  "BOB - Bolivian Boliviano",
  "BOV - Mvdol",
  "BRL - Brazilian Real",
  "BSD - Bahamian Dollar",
  "BTN - Bhutanese Ngultrum",
  "BWP - Botswana Pula",
  "BYN - Belarussian Ruble",
  "BZD - Belize Dollar",
  "CAD - Canadian Dollar",
  "CDF - Congolese franc",
  "CHE - WIR Euro",
  "CHF - Swiss Franc",
  "CHW - WIR Franc",
  "CLF - Chilean Unidades de formento",
  "CLP - Chilean Peso",
  "CNY - Yuan Renminbi",
  "COP - Colombian Peso",
  "COU - Unidad de Valor Real",
  "CRC - Costa Rican Colon",
  "CUC - Cuban Convertible Peso",
  "CUP - Cuban Peso",
  "CVE - Cape Verdean Escudo",
  "CZK - Czech Koruna",
  "DJF - Djiboutian Franc",
  "DKK - Danish Krone",
  "DOP - Dominican Peso",
  "DZD - Algerian Dinar",
  "EGP - Egyptian Pound",
  "ERN - Eritrean Nakfa",
  "ETB - Ethiopian Birr",
  "EUR - Euro",
  "FJD - Fijian Dollar",
  "FKP - Falkland Islands Pound",
  "GBP - Pound Sterling",
  "GEL - Georgian Lari",
  "GGP - Guernsey Pound",
  "GHS - Ghanaian Cedi",
  "GIP - Gibraltar Pound",
  "GMD - Gambian Dalasi",
  "GNF - Guinean Franc",
  "GTQ - Guatemalan Quetzal",
  "GYD - Guyanese Dollar",
  "HKD - Hong Kong Dollar",
  "HNL - Honduran Lempira",
  "HRK - Croatian Kuna",
  "HTG - Haitian Gourde",
  "HUF - Hungarian Forint",
  "IDR - Indonesian Rupiah",
  "ILS - Israeli new shekel",
  "IMP - Manx Pound",
  "INR - Indian Rupee",
  "IQD - Iraqi Dinar",
  "IRR - Iranian Rial",
  "ISK - Icelandic Krona",
  "JEP - Jersey Pound",
  "JMD - Jamaican Dollar",
  "JOD - Jordanian Dinar",
  "JPY - Japanese Yen",
  "KES - Kenyan Shilling",
  "KGS - Kyrgyzstani Som",
  "KHR - Cambodian Riel",
  "KMF - Comorian Franc",
  "KPW - North Korean Won",
  "KRW - South Korean Won",
  "KWD - Kuwaiti Dinar",
  "KYD - Cayman Islands Dollar",
  "KZT - Kazakhstani Tenge",
  "LAK - Lao Kip",
  "LBP - Lebanese Pound",
  "LKR - Sri Lankan Rupee",
  "LRD - Liberian Dollar",
  "LSL - Lesotho Loti",
  "LYD - Libyan Dinar",
  "MAD - Moroccan Dirham",
  "MDL - Moldovan Leu",
  "MGA - Malagascy Ariary",
  "MKD - Macedonian Denar",
  "MMK - Burmese Kyat",
  "MNT - Mongolian Tugrik",
  "MOP - Macanese Pataca",
  "MRO - Ouguiya",
  "MRU - Ouguiya",
  "MUR - Mauritian Rupee",
  "MVR - Maldivian Rufiyaa",
  "MWK - Malawian Kwacha",
  "MXN - Mexican Peso",
  "MXV - Mexican Unidad de Inversion (UID)",
  "MYR - Malaysian Ringgit",
  "MZN - Mozambican Metical",
  "NAD - Namibian Dollar",
  "NGN - Nigerian Naira",
  "NIO - Nicaraguan Cordoba Oro",
  "NOK - Norwegian Krone",
  "NPR - Nepalese Rupee",
  "NZD - New Zealand Dollar",
  "OMR - Omani rial",
  "PAB - Panamanian Balboa",
  "PEN - Peruvian Nuevo Sol",
  "PGK - Papua New Guinean Kina",
  "PHP - Philippine Peso",
  "PKR - Pakistani Rupee",
  "PLN - Polish Zloty",
  "PYG - Paraguayan Guarani",
  "QAR - Qatari Riyal",
  "RON - Romanian Leu",
  "RSD - Serbian Dinar",
  "RUB - Russian Ruble",
  "RWF - Rwandan Franc",
  "SAR - Saudi Riyal",
  "SBD - Solomon Islands Dollar",
  "SCR - Seychellois Rupee",
  "SDG - Sudanese Pound",
  "SEK - Swedish Krona",
  "SGD - Singapore Dollar",
  "SHP - Saint Helena Pound",
  "SLE - Sierra Leonean Leone",
  "SLL - Sierra Leonean Leone",
  "SOS - Somali Shilling",
  "SRD - Surinamese Dollar",
  "SSP - South Sudanese Pound",
  "STD - Sao Tomean Dobra",
  "STN - Sao Tome and Principe Dobra",
  "SVC - El Salvador Colon",
  "SYP - Syrian Pound",
  "SZL - Swazi Lilangeni",
  "THB - Thai Baht",
  "TJS - Tajikistani Somoni",
  "TMT - Turkmenistan Manat",
  "TND - Tunisian Dinar",
  "TOP - Tongan Paanga",
  "TRY - Turkish Lira",
  "TTD - Trinidad and Tobago Dollar",
  "TVD - Tuvaluan Dollar",
  "TWD - New Taiwan Dollar",
  "TZS - Tanzanian Shilling",
  "UAH - Ukrainian Hryvnia",
  "UGX - Ugandan Shilling",
  "USD - United States Dollar",
  "UYI - Uruguay Peso en Unidades Indexadas",
  "UYU - Uruguayan peso",
  "UZS - Uzbekistani Sum",
  "VED - Venezuelan Bolivar Digital",
  "VEF - Venezuelan Bolivar Fuerte",
  "VES - Venezuelan Bolivar Soberano",
  "VND - Vietnamese Dong",
  "VUV - Vanuatu Vatu",
  "WST - Samoan Tala",
  "XAF - Central African CFA Franc",
  "XCD - Eastern Caribbean Dollar",
  "XCG - Caribbean Guilder",
  "XDR - SDR",
  "XOF - CFA Franc BCEAO",
  "XPF - CFP Franc",
  "YER - Yemeni Rial",
  "ZAR - South African Rand",
  "ZMW - Zambian Kwacha",
  "ZWG - Zimbabwe Gold",
  "ZWL - Zimbabwe Dollar",
];

const FISCAL_YEARS: SelectOption[] = [
  { value: "January - December", label: "January - December" },
  { value: "February - January", label: "February - January" },
  { value: "March - February", label: "March - February" },
  { value: "April - March", label: "April - March" },
  { value: "May - April", label: "May - April" },
  { value: "June - May", label: "June - May" },
  { value: "July - June", label: "July - June" },
  { value: "August - July", label: "August - July" },
  { value: "September - August", label: "September - August" },
  { value: "October - September", label: "October - September" },
  { value: "November - October", label: "November - October" },
  { value: "December - November", label: "December - November" },
];

const LANGUAGE_OPTIONS: SelectOption[] = iso6393
  .map((l) => ({ value: l.iso6393, label: l.name }))
  .sort((a, b) => a.label.localeCompare(b.label));

export default function OrgSetupPage() {
  const appName = getAppDisplayName();
  const location = useLocation();
  const navigate = useNavigate();
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string>("");
  const [orgName, setOrgName] = useState(() => {
    const fromState = (location.state as { orgName?: unknown } | null)?.orgName;
    if (typeof fromState === "string" && fromState.trim()) return fromState;
    try {
      const fromStorage = sessionStorage.getItem("orgName");
      if (fromStorage && fromStorage.trim()) return fromStorage;
    } catch {}
    return "";
  });
  const [countryIso, setCountryIso] = useState(getDefaultCountryIso);
  const [state, setState] = useState("");
  const [currency, setCurrency] = useState("SOS - Somali Shilling");
  const [fiscalYear, setFiscalYear] = useState("January - December");
  const [language, setLanguage] = useState("eng");
  const [timeZone, setTimeZone] = useState("Africa/Nairobi");

  const currencyOptions = useMemo<SelectOption[]>(() => CURRENCIES.map((c) => ({ value: c, label: c })), []);

  const stateOptions = useMemo(() => {
    const list = State.getStatesOfCountry(countryIso).map((s) => s.name);
    return list.sort((a, b) => a.localeCompare(b));
  }, [countryIso]);

  useEffect(() => {
    if (stateOptions.length === 0) return;
    if (!state) return;
    if (!stateOptions.includes(state)) setState("");
  }, [countryIso, state, stateOptions]);


  const onContinue = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    if (!orgName.trim()) return;

    setSaving(true);
    setSaveError(null);

    orgApi
      .patchMe({
        name: orgName.trim(),
        countryIso,
        state,
        baseCurrency: currency,
        fiscalYear,
        language,
        timeZone,
        ...(logoUrl ? { logoUrl } : {}),
      })
      .then((r) => {
        if (!r.success) {
          setSaving(false);
          setSaveError(r.message || "Failed to save organization profile");
          return;
        }
        setSaving(false);
        navigate(`/optimize${window.location.search}`);
      })
      .catch(() => {
        setSaving(false);
        setSaveError("Failed to save organization profile");
      });
  };

  return (
    <div className="min-h-screen w-full bg-background-light font-display text-slate-900">
      <div className="mx-auto max-w-5xl px-6 py-7">
        <div className="mb-6">
          <SetupHeader />
        </div>

        <div className="mb-8">
          <div className="h-1 w-full rounded-full bg-slate-200">
            <div className="h-1 w-1/3 rounded-full bg-primary" />
          </div>
        </div>

        <div className="mb-7">
          <p className="text-xs text-slate-600">{`Welcome aboard!`}</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight">{`Tell us about your organization`}</h1>
          <p className="mt-2 text-[11px] text-slate-600">{`This helps set up ${appName}.`}</p>
        </div>

        <form onSubmit={onContinue} className="space-y-8">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-700">
              Organization Name<span className="text-red-500">*</span>
            </label>
            <input
              className={[
                "w-full rounded-lg border bg-white px-3 py-2.5 text-sm outline-none transition-all focus:border-transparent focus:ring-2",
                submitted && !orgName.trim() ? "border-red-300 focus:ring-red-200" : "border-slate-200 focus:ring-primary",
              ].join(" ")}
              placeholder="taban"
              value={orgName}
              onChange={(e) => {
                const next = e.target.value;
                setOrgName(next);
                try {
                  sessionStorage.setItem("orgName", next);
                } catch {}
              }}
            />
            {submitted && !orgName.trim() ? <p className="text-[11px] text-red-600">Organization name is required.</p> : null}
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-700">Organization Logo (optional)</label>
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 overflow-hidden rounded-full border border-slate-200 bg-white">
                {logoUrl ? (
                  <img src={logoUrl} alt="Organization logo preview" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-slate-600">
                    {orgName.trim().slice(0, 2).toUpperCase() || "OR"}
                  </div>
                )}
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  if (!file) {
                    setLogoUrl("");
                    return;
                  }
                  if (file.size > 2 * 1024 * 1024) {
                    setSaveError("Logo must be less than 2MB");
                    return;
                  }
                  const reader = new FileReader();
                  reader.onloadend = () => {
                    const result = typeof reader.result === "string" ? reader.result : "";
                    setLogoUrl(result);
                  };
                  reader.onerror = () => setSaveError("Failed to read logo file");
                  reader.readAsDataURL(file);
                }}
                className="block w-full text-xs text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-primary/10 file:px-4 file:py-2 file:text-xs file:font-semibold file:text-primary hover:file:bg-primary/20"
              />
            </div>
            <p className="text-[11px] text-slate-500">This will be used in the sidebar and browser tab icon.</p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <SearchableSelect
              label="Organization Location"
              required
              value={countryIso}
              options={COUNTRIES}
              placeholder="Select"
              invalid={submitted && !countryIso}
              onChange={(next) => {
                setCountryIso(next);
                setState("");
              }}
            />

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700">State/Province</label>
              {stateOptions.length > 0 ? (
                <SearchableSelect
                  label={undefined}
                  value={state}
                  options={stateOptions.map((s) => ({ value: s, label: s }))}
                  placeholder="Select"
                  onChange={setState}
                />
              ) : (
                <input
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-primary"
                  placeholder="Type state/province"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                />
              )}
            </div>
          </div>

          <SearchableSelect
            label="Base Currency"
            required
            value={currency}
            options={currencyOptions}
            placeholder="Select"
            invalid={submitted && !currency}
            onChange={setCurrency}
          />
          <p className="-mt-6 text-xs text-slate-500">The base currency cannot be changed later.</p>

          <div className="space-y-6">
            <div className="flex flex-col gap-2 md:flex-row md:items-center">
              <div className="w-40 text-xs font-semibold text-slate-700">
                Fiscal Year<span className="text-red-500">*</span>
              </div>
              <div className="w-full md:max-w-md">
                <SearchableSelect
                  label=""
                  value={fiscalYear}
                  options={FISCAL_YEARS}
                  placeholder="Select"
                  invalid={submitted && !fiscalYear}
                  onChange={setFiscalYear}
                />
              </div>
            </div>

            <div className="flex flex-col gap-2 md:flex-row md:items-center">
              <div className="w-40 text-xs font-semibold text-slate-700">
                Language<span className="text-red-500">*</span>
              </div>
              <div className="w-full md:max-w-md">
                <SearchableSelect
                  label=""
                  value={language}
                  options={LANGUAGE_OPTIONS}
                  placeholder="Select"
                  invalid={submitted && !language}
                  onChange={setLanguage}
                  renderLimit={80}
                />
              </div>
            </div>

            <div className="flex flex-col gap-2 md:flex-row md:items-center">
              <div className="w-40 text-xs font-semibold text-slate-700">
                Time Zone<span className="text-red-500">*</span>
              </div>
              <div className="w-full md:max-w-md">
                <SearchableSelect
                  label=""
                  value={timeZone}
                  options={TIME_ZONES}
                  placeholder="Select"
                  invalid={submitted && !timeZone}
                  onChange={setTimeZone}
                  openDirection="up"
                />
              </div>
            </div>
          </div>

          <div className="pt-4">
            {saveError ? <p className="mb-3 text-[11px] text-red-600">{saveError}</p> : null}
            <button
              className="w-full rounded-lg bg-primary py-4 text-sm font-bold text-white shadow-[0_10px_25px_rgba(18,86,99,0.20)] transition-colors hover:bg-primary/90"
              type="submit"
              disabled={saving}
            >
              {saving ? "Saving..." : "Save & Continue"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
