export type AuthApp = "billing" | "invoice" | "full";

export const getAuthApp = (): AuthApp => {
  const params = new URLSearchParams(window.location.search);
  const app = (params.get("app") || "").toLowerCase();
  if (app === "billing") return "billing";
  if (app === "invoice") return "invoice";
  return "full";
};

export const getAppDisplayName = () => {
  const app = getAuthApp();
  if (app === "billing") return "Billing";
  if (app === "invoice") return "Invoice";
  return "Full System";
};

export const getHeroTitle = () => {
  const app = getAuthApp();
  if (app === "billing") return "The Future of Billing is Here";
  if (app === "invoice") return "The Future of Invoicing is Here";
  return "The Future is Here";
};

export const getHeroIcon = () => {
  const app = getAuthApp();
  if (app === "billing") return "payments";
  if (app === "invoice") return "receipt_long";
  return "account_balance";
};

export const getFallbackUrl = () => {
  const app = getAuthApp();
  const billingUrl = (import.meta as any).env?.VITE_BILLING_URL || "http://localhost:5173";
  const invoiceUrl = (import.meta as any).env?.VITE_INVOICE_URL || "http://localhost:5174";
  if (app === "invoice") return invoiceUrl;
  if (app === "billing") return billingUrl;
  return billingUrl;
};

