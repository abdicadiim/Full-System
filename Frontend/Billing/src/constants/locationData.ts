import { Country, State } from "country-state-city";

const countryNameToIso = new Map(
  Country.getAllCountries().map((country) => [country.name.toLowerCase(), country.isoCode])
);

export const getStatesByCountry = (countryNameOrIso: string): string[] => {
  const value = String(countryNameOrIso || "").trim();
  if (!value) return [];

  const isoCode =
    value.length === 2 ? value.toUpperCase() : countryNameToIso.get(value.toLowerCase()) || "";

  if (!isoCode) return [];
  return State.getStatesOfCountry(isoCode).map((state) => state.name);
};
