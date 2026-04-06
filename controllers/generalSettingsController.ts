import type express from "express";
import mongoose from "mongoose";
import { GeneralSettings } from "../models/GeneralSettings.js";

const DEFAULT_COPY_LABELS = {
  original: "ORIGINAL",
  duplicate: "DUPLICATE",
  triplicate: "TRIPLICATE",
  quadruplicate: "QUADRUPLICATE",
  quintuplicate: "QUINTUPLICATE",
};

const DEFAULT_ADDRESS_FORMAT =
  "${ORGANIZATION.STREET_ADDRESS_1}\n" +
  "${ORGANIZATION.STREET_ADDRESS_2}\n" +
  "${ORGANIZATION.CITY} ${ORGANIZATION.STATE}\n" +
  "${ORGANIZATION.POSTAL_CODE}\n" +
  "${ORGANIZATION.COUNTRY}\n" +
  "${ORGANIZATION.PHONE}\n" +
  "${ORGANIZATION.EMAIL}\n" +
  "${ORGANIZATION.WEBSITE}";

const DEFAULT_SETTINGS = {
  modules: {
    quotes: true,
    salesOrders: false,
    salesReceipts: true,
    purchaseOrders: false,
    timeTracking: true,
    retainerInvoices: false,
    recurringInvoice: true,
    recurringExpense: true,
    recurringBills: true,
    recurringJournals: false,
    creditNote: true,
  },
  workWeek: "Sunday",
  enableInventory: false,
  enablePANValidation: false,
  pdfSettings: {
    attachPDFInvoice: true,
    attachPaymentReceipt: false,
    encryptPDF: false,
  },
  discountSettings: {
    discountType: "transaction",
    discountBeforeTax: "Discount Before Tax",
  },
  chargeSettings: {
    adjustments: true,
    shippingCharges: true,
    enableTaxAutomation: false,
    defaultTaxRate: "Apply Default Tax Rate",
  },
  taxSettings: {
    taxInclusive: "inclusive",
    roundOffTax: "line-item",
  },
  roundingSettings: {
    roundingOff: "incremental",
    roundingIncrement: "0.05",
  },
  salesSettings: {
    addSalespersonField: true,
  },
  billingSettings: {
    billableAccount: "",
    defaultMarkup: "3",
  },
  documentSettings: {
    documentCopies: 2,
    copyLabels: DEFAULT_COPY_LABELS,
  },
  printSettings: {
    printPreferences: "choose-while-printing",
  },
  reportSettings: {
    sendWeeklySummary: false,
  },
  retentionSettings: {
    paymentRetention: false,
  },
  pdfFormatSettings: {
    addressFormat: DEFAULT_ADDRESS_FORMAT,
  },
};

const pickString = (value: unknown, fallback: string) => {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed || fallback;
};

const pickBoolean = (value: unknown, fallback: boolean) => (typeof value === "boolean" ? value : fallback);
const pickNumber = (value: unknown, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};
const pickObject = (value: unknown) => (value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {});

const normalizeModules = (value: unknown) => {
  const source = pickObject(value);
  const normalized: Record<string, boolean> = {
    ...DEFAULT_SETTINGS.modules,
  };

  for (const [key, rawValue] of Object.entries(source)) {
    if (typeof rawValue === "boolean") {
      normalized[key] = rawValue;
    }
  }

  return normalized;
};

const normalizeCopyLabels = (value: unknown) => {
  const source = pickObject(value);
  const normalized: Record<string, string> = {
    ...DEFAULT_COPY_LABELS,
  };

  for (const [key, rawValue] of Object.entries(source)) {
    if (typeof rawValue === "string" && rawValue.trim()) {
      normalized[key] = rawValue.trim();
    }
  }

  return normalized;
};

const normalizeGeneralSettings = (value: unknown) => {
  const source = pickObject(value);
  const pdfSettings = pickObject(source.pdfSettings);
  const discountSettings = pickObject(source.discountSettings);
  const chargeSettings = pickObject(source.chargeSettings);
  const taxSettings = pickObject(source.taxSettings);
  const roundingSettings = pickObject(source.roundingSettings);
  const salesSettings = pickObject(source.salesSettings);
  const billingSettings = pickObject(source.billingSettings);
  const documentSettings = pickObject(source.documentSettings);
  const printSettings = pickObject(source.printSettings);
  const reportSettings = pickObject(source.reportSettings);
  const retentionSettings = pickObject(source.retentionSettings);
  const pdfFormatSettings = pickObject(source.pdfFormatSettings);

  return {
    modules: normalizeModules(source.modules),
    workWeek: pickString(source.workWeek, DEFAULT_SETTINGS.workWeek),
    enableInventory: pickBoolean(source.enableInventory, DEFAULT_SETTINGS.enableInventory),
    enablePANValidation: pickBoolean(source.enablePANValidation, DEFAULT_SETTINGS.enablePANValidation),
    pdfSettings: {
      attachPDFInvoice: pickBoolean(pdfSettings.attachPDFInvoice, DEFAULT_SETTINGS.pdfSettings.attachPDFInvoice),
      attachPaymentReceipt: pickBoolean(pdfSettings.attachPaymentReceipt, DEFAULT_SETTINGS.pdfSettings.attachPaymentReceipt),
      encryptPDF: pickBoolean(pdfSettings.encryptPDF, DEFAULT_SETTINGS.pdfSettings.encryptPDF),
    },
    discountSettings: {
      discountType: pickString(discountSettings.discountType, DEFAULT_SETTINGS.discountSettings.discountType),
      discountBeforeTax: pickString(discountSettings.discountBeforeTax, DEFAULT_SETTINGS.discountSettings.discountBeforeTax),
    },
    chargeSettings: {
      adjustments: pickBoolean(chargeSettings.adjustments, DEFAULT_SETTINGS.chargeSettings.adjustments),
      shippingCharges: pickBoolean(chargeSettings.shippingCharges, DEFAULT_SETTINGS.chargeSettings.shippingCharges),
      enableTaxAutomation: pickBoolean(chargeSettings.enableTaxAutomation, DEFAULT_SETTINGS.chargeSettings.enableTaxAutomation),
      defaultTaxRate: pickString(chargeSettings.defaultTaxRate, DEFAULT_SETTINGS.chargeSettings.defaultTaxRate),
    },
    taxSettings: {
      taxInclusive: pickString(taxSettings.taxInclusive, DEFAULT_SETTINGS.taxSettings.taxInclusive),
      roundOffTax: pickString(taxSettings.roundOffTax, DEFAULT_SETTINGS.taxSettings.roundOffTax),
    },
    roundingSettings: {
      roundingOff: pickString(roundingSettings.roundingOff, DEFAULT_SETTINGS.roundingSettings.roundingOff),
      roundingIncrement: pickString(roundingSettings.roundingIncrement, DEFAULT_SETTINGS.roundingSettings.roundingIncrement),
    },
    salesSettings: {
      addSalespersonField: pickBoolean(salesSettings.addSalespersonField, DEFAULT_SETTINGS.salesSettings.addSalespersonField),
    },
    billingSettings: {
      billableAccount: pickString(billingSettings.billableAccount, DEFAULT_SETTINGS.billingSettings.billableAccount),
      defaultMarkup: pickString(billingSettings.defaultMarkup, DEFAULT_SETTINGS.billingSettings.defaultMarkup),
    },
    documentSettings: {
      documentCopies: Math.max(1, Math.round(pickNumber(documentSettings.documentCopies, DEFAULT_SETTINGS.documentSettings.documentCopies))),
      copyLabels: normalizeCopyLabels(documentSettings.copyLabels),
    },
    printSettings: {
      printPreferences: pickString(printSettings.printPreferences, DEFAULT_SETTINGS.printSettings.printPreferences),
    },
    reportSettings: {
      sendWeeklySummary: pickBoolean(reportSettings.sendWeeklySummary, DEFAULT_SETTINGS.reportSettings.sendWeeklySummary),
    },
    retentionSettings: {
      paymentRetention: pickBoolean(retentionSettings.paymentRetention, DEFAULT_SETTINGS.retentionSettings.paymentRetention),
    },
    pdfFormatSettings: {
      addressFormat: pickString(pdfFormatSettings.addressFormat, DEFAULT_SETTINGS.pdfFormatSettings.addressFormat),
    },
  };
};

const mergeGeneralSettings = (currentValue: unknown, incomingValue: unknown) => {
  const current = normalizeGeneralSettings(currentValue);
  const incoming = pickObject(incomingValue);

  return normalizeGeneralSettings({
    ...current,
    ...incoming,
    modules: {
      ...current.modules,
      ...pickObject(incoming.modules),
    },
    pdfSettings: {
      ...current.pdfSettings,
      ...pickObject(incoming.pdfSettings),
    },
    discountSettings: {
      ...current.discountSettings,
      ...pickObject(incoming.discountSettings),
    },
    chargeSettings: {
      ...current.chargeSettings,
      ...pickObject(incoming.chargeSettings),
    },
    taxSettings: {
      ...current.taxSettings,
      ...pickObject(incoming.taxSettings),
    },
    roundingSettings: {
      ...current.roundingSettings,
      ...pickObject(incoming.roundingSettings),
    },
    salesSettings: {
      ...current.salesSettings,
      ...pickObject(incoming.salesSettings),
    },
    billingSettings: {
      ...current.billingSettings,
      ...pickObject(incoming.billingSettings),
    },
    documentSettings: {
      ...current.documentSettings,
      ...pickObject(incoming.documentSettings),
      copyLabels: {
        ...current.documentSettings.copyLabels,
        ...pickObject(pickObject(incoming.documentSettings).copyLabels),
      },
    },
    printSettings: {
      ...current.printSettings,
      ...pickObject(incoming.printSettings),
    },
    reportSettings: {
      ...current.reportSettings,
      ...pickObject(incoming.reportSettings),
    },
    retentionSettings: {
      ...current.retentionSettings,
      ...pickObject(incoming.retentionSettings),
    },
    pdfFormatSettings: {
      ...current.pdfFormatSettings,
      ...pickObject(incoming.pdfFormatSettings),
    },
  });
};

export const getGeneralSettings: express.RequestHandler = async (req, res, next) => {
  try {
    const orgId = req.user?.organizationId;
    if (!orgId) return res.status(401).json({ success: false, message: "Unauthenticated", data: null });
    if (!mongoose.isValidObjectId(orgId)) {
      return res.status(400).json({ success: false, message: "Invalid organization", data: null });
    }

    const doc = await GeneralSettings.findOneAndUpdate(
      { organizationId: orgId },
      { $setOnInsert: { organizationId: orgId, settings: DEFAULT_SETTINGS } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    ).lean();

    return res.json({
      success: true,
      data: { settings: normalizeGeneralSettings(doc?.settings) },
    });
  } catch (err) {
    next(err);
  }
};

export const upsertGeneralSettings: express.RequestHandler = async (req, res, next) => {
  try {
    const orgId = req.user?.organizationId;
    if (!orgId) return res.status(401).json({ success: false, message: "Unauthenticated", data: null });
    if (!mongoose.isValidObjectId(orgId)) {
      return res.status(400).json({ success: false, message: "Invalid organization", data: null });
    }

    const body = pickObject(req.body);
    const incomingSettings = pickObject(body.settings);
    const current = await GeneralSettings.findOne({ organizationId: orgId }).lean();
    const mergedSettings = mergeGeneralSettings(current?.settings, incomingSettings);

    const saved = await GeneralSettings.findOneAndUpdate(
      { organizationId: orgId },
      { $set: { settings: mergedSettings }, $setOnInsert: { organizationId: orgId } },
      { new: true, upsert: true }
    ).lean();

    return res.json({
      success: true,
      data: { settings: normalizeGeneralSettings(saved?.settings) },
    });
  } catch (err) {
    next(err);
  }
};
