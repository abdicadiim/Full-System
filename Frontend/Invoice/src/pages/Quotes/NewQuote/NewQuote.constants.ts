export const defaultSampleItems = [
  { id: "1", name: "iphone", sku: "Ip011", rate: 20.0, stockOnHand: 0.0, unit: "box" },
  { id: "2", name: "laptop", sku: "Lp022", rate: 1500.0, stockOnHand: 5.0, unit: "piece" },
  { id: "3", name: "keyboard", sku: "Kb033", rate: 45.0, stockOnHand: 12.0, unit: "piece" },
  { id: "4", name: "mouse", sku: "Ms044", rate: 25.0, stockOnHand: 8.0, unit: "piece" },
  { id: "5", name: "monitor", sku: "Mn055", rate: 300.0, stockOnHand: 3.0, unit: "piece" }
];

export const PRICE_LISTS_STORAGE_KEY = "inv_price_lists_v1";
export const PLANS_STORAGE_KEY = "inv_plans_v1";
export const LS_LOCATIONS_ENABLED_KEY = "taban_locations_enabled";
export const LS_LOCATIONS_CACHE_KEY = "taban_locations_cache";

export type CatalogPriceListOption = {
  id: string;
  name: string;
  pricingScheme: string;
  currency: string;
  status: string;
  displayLabel: string;
};

export type PriceListSwitchDialogState = {
  customerName: string;
  currentPriceListName: string;
  nextPriceListName: string;
  customerCurrency: string;
  nextPriceListCurrency: string;
};
