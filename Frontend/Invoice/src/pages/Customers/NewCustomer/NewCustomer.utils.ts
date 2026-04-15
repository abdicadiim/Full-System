import { Country, State } from "country-state-city";

const countryOptions = Country.getAllCountries();

const normalizeCountryName = (value: string) =>
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
  const normalized = normalizeCountryName(countryName.trim());
  const resolved = countryAliases[normalized] || normalized;
  const matchedCountry = countryOptions.find((country) => {
    const normalizedName = normalizeCountryName(country.name);
    const normalizedIso = normalizeCountryName(country.isoCode);
    return normalizedName === resolved || normalizedIso === resolved;
  });
  return matchedCountry?.isoCode || "";
};

export const getFallbackStatesByCountryName = (
  countryName: string,
  countryData: Record<string, string[]> = {}
) => {
  if (!countryName) return [];
  const normalized = normalizeCountryName(countryName.trim());
  const fallbackKey = Object.keys(countryData).find(
    (key) => normalizeCountryName(key) === normalized
  );
  return fallbackKey ? countryData[fallbackKey] : [];
};

export const getStatesByCountryName = (
  countryName: string,
  countryData: Record<string, string[]> = {}
) => {
  const countryIso = getCountryIsoByName(countryName);
  const libraryStates = countryIso
    ? State.getStatesOfCountry(countryIso).map((state) => state.name)
    : [];

  return libraryStates.length > 0
    ? libraryStates
    : getFallbackStatesByCountryName(countryName, countryData);
};
