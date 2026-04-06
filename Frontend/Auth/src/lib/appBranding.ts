export type AuthApp = "billing" | "invoice" | "full";

export const AUTH_BRAND_NAME = "Taban";

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

export const getAuthTabTitle = () => `${AUTH_BRAND_NAME} ${getAppDisplayName()}`;

export const getAuthFaviconDataUrl = () => {
  const app = getAuthApp();
  const label = app === "billing" ? "TB" : app === "invoice" ? "TI" : "TF";
  const background = app === "billing" ? "#125663" : app === "invoice" ? "#1f6f8b" : "#163c52";
  const accent = app === "billing" ? "#5fa6b4" : app === "invoice" ? "#7dbad1" : "#6b9bc2";
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${accent}" />
          <stop offset="100%" stop-color="${background}" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="18" fill="url(#g)" />
      <text x="32" y="39" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="22" font-weight="800" fill="#ffffff">${label}</text>
    </svg>
  `;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
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

