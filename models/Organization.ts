import mongoose from "mongoose";

const OrganizationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, index: true },
    primaryContactEmail: { type: String, default: "" },

    // Optional branding (can be a URL or a data: URI)
    logoUrl: { type: String, default: "" },

    // Organization UI branding preferences (used by Billing/Invoice settings)
    brandingAppearance: { type: String, default: "dark" }, // "dark" | "light"
    brandingAccentColor: { type: String, default: "#3b82f6" },
    brandingKeepZohoBranding: { type: Boolean, default: false },
    sidebarDarkFrom: { type: String, default: "#156372" },
    sidebarDarkTo: { type: String, default: "#156372" },
    sidebarLightFrom: { type: String, default: "#f9fafb" },
    sidebarLightTo: { type: String, default: "#f3f4f6" },

    businessType: { type: String, default: "" },
    industry: { type: String, default: "" },
    industrySize: { type: String, default: "" },

    countryIso: { type: String, default: "" },
    country: { type: String, default: "" },
    state: { type: String, default: "" },

    baseCurrency: { type: String, default: "" },
    currencyCode: { type: String, default: "" },
    currencyId: { type: String, default: "" },
    currencySymbol: { type: String, default: "" },
    currencyFormat: { type: String, default: "" },
    pricePrecision: { type: Number, default: 2 },
    fiscalYear: { type: String, default: "" },
    fiscalYearStartMonth: { type: String, default: "" },
    language: { type: String, default: "" },
    languageCode: { type: String, default: "" },
    communicationLanguage: { type: String, default: "" },
    timeZone: { type: String, default: "" },
    dateFormat: { type: String, default: "dd MMM yyyy" },
    fieldSeparator: { type: String, default: " " },
    reportBasis: { type: String, default: "" },

    mileagePreferences: { type: mongoose.Schema.Types.Mixed, default: undefined },

    websiteUrl: { type: String, default: "" },
    phone: { type: String, default: "" },
    fax: { type: String, default: "" },
    contactName: { type: String, default: "" },

    addressLine1: { type: String, default: "" },
    addressLine2: { type: String, default: "" },
    city: { type: String, default: "" },
    postalCode: { type: String, default: "" },
    orgAddress: { type: String, default: "" },
    remitToAddress: { type: String, default: "" },
    paymentStubAddress: { type: String, default: "" },
    showPaymentStubAddress: { type: Boolean, default: false },

    companyIdLabel: { type: String, default: "" },
    companyIdValue: { type: String, default: "" },
    taxIdLabel: { type: String, default: "" },
    taxIdValue: { type: String, default: "" },
    customFields: { type: [mongoose.Schema.Types.Mixed], default: [] },

    portalName: { type: String, default: "" },
    taxGroupEnabled: { type: Boolean, default: true },
    isOrgActive: { type: Boolean, default: true },

    // Billing/invoice onboarding preferences
    billingProcess: { type: String, default: "" },
    invoicingTool: { type: String, default: "" },
    currentBillingTool: { type: String, default: "" },
    wantsImport: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Organization = mongoose.model("Organization", OrganizationSchema);
