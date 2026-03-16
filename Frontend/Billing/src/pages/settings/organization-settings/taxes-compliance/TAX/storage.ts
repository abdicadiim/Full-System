export const TAX_GROUP_MARKER = "__taban_tax_group__";

const TAXES_STORAGE_KEY = "taban_settings_taxes_v1";
const LEGACY_TAXES_STORAGE_KEY = "taban_books_taxes";
const TAX_SETTINGS_STORAGE_KEY = "taban_settings_tax_compliance_v1";

export const TAXES_STORAGE_EVENT = "taban:taxes-storage-updated";
export const TAX_SETTINGS_STORAGE_EVENT = "taban:tax-settings-storage-updated";

export type LocalTaxRecord = {
  _id: string;
  name: string;
  rate: number;
  type?: string;
  description?: string;
  groupTaxes?: string[];
  isActive: boolean;
  isDefault: boolean;
  isCompound?: boolean;
  isDigitalServiceTax?: boolean;
  digitalServiceCountry?: string;
  trackTaxByCountryScheme?: boolean;
  accountToTrackSales?: string;
  accountToTrackPurchases?: string;
  isValueAddedTax?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type TaxComplianceSettings = {
  taxRegistrationLabel: string;
  taxRegistrationNumber: string;
  enableUseTaxInPurchases: boolean;
  enableTDS: boolean;
  tdsFor: string;
  enableTDSOverride: boolean;
  enableReverseChargeSales: boolean;
  enableReverseChargePurchase: boolean;
  taxTrackingAccount: "single" | "separate";
  overrideTaxSales: boolean;
  overrideTaxPurchases: boolean;
  enableVATMOSS: boolean;
  eoriNumber: string;
  salesTaxDisabled: boolean;
};

const DEFAULT_TAX_SETTINGS: TaxComplianceSettings = {
  taxRegistrationLabel: "PIN",
  taxRegistrationNumber: "",
  enableUseTaxInPurchases: false,
  enableTDS: false,
  tdsFor: "Customers",
  enableTDSOverride: false,
  enableReverseChargeSales: false,
  enableReverseChargePurchase: false,
  taxTrackingAccount: "single",
  overrideTaxSales: false,
  overrideTaxPurchases: false,
  enableVATMOSS: false,
  eoriNumber: "",
  salesTaxDisabled: false,
};

const safeParse = <T>(raw: string | null, fallback: T): T => {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

const nowIso = () => new Date().toISOString();

const createId = () =>
  `tax-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export const isTaxGroupRecord = (tax: Partial<LocalTaxRecord> | null | undefined) => {
  if (!tax) return false;
  return (
    tax.description === TAX_GROUP_MARKER ||
    (Array.isArray(tax.groupTaxes) && tax.groupTaxes.length > 0)
  );
};

const normalizeTaxRecord = (row: any): LocalTaxRecord | null => {
  const id = String(row?._id || row?.id || "").trim();
  const name = String(row?.name || "").trim();
  if (!id || !name) return null;

  const createdAt = String(row?.createdAt || "") || nowIso();
  const updatedAt = String(row?.updatedAt || "") || createdAt;

  return {
    _id: id,
    name,
    rate: Number(row?.rate || 0),
    type: row?.type || "both",
    description: row?.description || "",
    groupTaxes: Array.isArray(row?.groupTaxes)
      ? row.groupTaxes.map((taxId: any) => String(taxId))
      : [],
    isActive: row?.isActive !== false,
    isDefault: !!row?.isDefault,
    isCompound: !!row?.isCompound,
    isDigitalServiceTax: !!row?.isDigitalServiceTax,
    digitalServiceCountry: String(row?.digitalServiceCountry || ""),
    trackTaxByCountryScheme: !!row?.trackTaxByCountryScheme,
    accountToTrackSales: String(row?.accountToTrackSales || ""),
    accountToTrackPurchases: String(row?.accountToTrackPurchases || ""),
    isValueAddedTax: !!row?.isValueAddedTax,
    createdAt,
    updatedAt,
  };
};

const ensureDefaultTax = (rows: LocalTaxRecord[]): LocalTaxRecord[] => {
  const normalized = rows.map((row) => ({
    ...row,
    isDefault: isTaxGroupRecord(row) ? false : !!row.isDefault,
  }));

  const hasDefault = normalized.some((row) => !isTaxGroupRecord(row) && row.isDefault);
  if (hasDefault) return normalized;

  const firstTaxIndex = normalized.findIndex((row) => !isTaxGroupRecord(row));
  if (firstTaxIndex >= 0) {
    normalized[firstTaxIndex] = { ...normalized[firstTaxIndex], isDefault: true };
  }
  return normalized;
};

const emitStorageEvent = (eventName: string) => {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(eventName));
  }
};

const syncLegacyTaxesKey = (rows: LocalTaxRecord[]) => {
  const legacyRows = rows
    .filter((row) => !isTaxGroupRecord(row))
    .map((row) => ({
      id: row._id,
      _id: row._id,
      name: row.name,
      rate: row.rate,
      type: row.type || "both",
      isCompound: !!row.isCompound,
      isDefault: !!row.isDefault,
      isActive: row.isActive !== false,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }));

  localStorage.setItem(LEGACY_TAXES_STORAGE_KEY, JSON.stringify(legacyRows));
};

export const readTaxesLocal = (): LocalTaxRecord[] => {
  const currentRows = safeParse<any[]>(localStorage.getItem(TAXES_STORAGE_KEY), [])
    .map(normalizeTaxRecord)
    .filter(Boolean) as LocalTaxRecord[];

  if (currentRows.length > 0) {
    return ensureDefaultTax(currentRows);
  }

  const legacyRows = safeParse<any[]>(localStorage.getItem(LEGACY_TAXES_STORAGE_KEY), [])
    .map((row) =>
      normalizeTaxRecord({
        ...row,
        _id: row?._id || row?.id || createId(),
      })
    )
    .filter(Boolean) as LocalTaxRecord[];

  if (legacyRows.length === 0) {
    return [];
  }

  const migrated = ensureDefaultTax(legacyRows);
  localStorage.setItem(TAXES_STORAGE_KEY, JSON.stringify(migrated));
  syncLegacyTaxesKey(migrated);
  return migrated;
};

export const writeTaxesLocal = (rows: LocalTaxRecord[]) => {
  const normalized = ensureDefaultTax(
    rows
      .map(normalizeTaxRecord)
      .filter(Boolean)
      .map((row) => ({
        ...(row as LocalTaxRecord),
        updatedAt: nowIso(),
      }))
  );

  localStorage.setItem(TAXES_STORAGE_KEY, JSON.stringify(normalized));
  syncLegacyTaxesKey(normalized);
  emitStorageEvent(TAXES_STORAGE_EVENT);
};

export const getTaxByIdLocal = (taxId: string) =>
  readTaxesLocal().find((row) => String(row._id) === String(taxId)) || null;

export const createTaxLocal = (payload: Partial<LocalTaxRecord>) => {
  const rows = readTaxesLocal();
  const created: LocalTaxRecord = {
    _id: createId(),
    name: String(payload.name || "").trim(),
    rate: Number(payload.rate || 0),
    type: payload.type || "both",
    description: payload.description || "",
    groupTaxes: Array.isArray(payload.groupTaxes)
      ? payload.groupTaxes.map((taxId) => String(taxId))
      : [],
    isActive: payload.isActive !== false,
    isDefault: !!payload.isDefault,
    isCompound: !!payload.isCompound,
    isDigitalServiceTax: !!payload.isDigitalServiceTax,
    digitalServiceCountry: String(payload.digitalServiceCountry || ""),
    trackTaxByCountryScheme: !!payload.trackTaxByCountryScheme,
    accountToTrackSales: String(payload.accountToTrackSales || ""),
    accountToTrackPurchases: String(payload.accountToTrackPurchases || ""),
    isValueAddedTax: !!payload.isValueAddedTax,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };

  const nextRows = [...rows];
  if (created.isDefault && !isTaxGroupRecord(created)) {
    nextRows.forEach((row) => {
      if (!isTaxGroupRecord(row)) row.isDefault = false;
    });
  }
  nextRows.unshift(created);
  writeTaxesLocal(nextRows);
  return created;
};

export const updateTaxLocal = (taxId: string, payload: Partial<LocalTaxRecord>) => {
  const rows = readTaxesLocal();
  let updatedTax: LocalTaxRecord | null = null;

  const updatedRows = rows.map((row) => {
    if (String(row._id) !== String(taxId)) return row;

    const next: LocalTaxRecord = {
      ...row,
      ...payload,
      _id: row._id,
      name: String(payload.name ?? row.name).trim(),
      rate: Number(payload.rate ?? row.rate),
      groupTaxes: Array.isArray(payload.groupTaxes)
        ? payload.groupTaxes.map((id) => String(id))
        : row.groupTaxes || [],
      updatedAt: nowIso(),
    };
    updatedTax = next;
    return next;
  });

  if (!updatedTax) return null;

  if (updatedTax.isDefault && !isTaxGroupRecord(updatedTax)) {
    updatedRows.forEach((row) => {
      if (!isTaxGroupRecord(row)) row.isDefault = String(row._id) === String(taxId);
    });
  }

  writeTaxesLocal(updatedRows);
  return updatedTax;
};

export const markDefaultTaxLocal = (taxId: string) => {
  const rows = readTaxesLocal();
  const target = rows.find((row) => String(row._id) === String(taxId));
  if (!target || isTaxGroupRecord(target)) return null;

  rows.forEach((row) => {
    if (!isTaxGroupRecord(row)) {
      row.isDefault = String(row._id) === String(taxId);
      row.updatedAt = nowIso();
    }
  });
  writeTaxesLocal(rows);
  return rows.find((row) => String(row._id) === String(taxId)) || null;
};

export const deleteTaxesLocal = (ids: string[]) => {
  const idSet = new Set(ids.map((id) => String(id)));
  const current = readTaxesLocal();
  const nextRows = current
    .filter((row) => !idSet.has(String(row._id)))
    .map((row) => ({
      ...row,
      groupTaxes: (row.groupTaxes || []).filter((taxId) => !idSet.has(String(taxId))),
    }));

  const deletedCount = current.length - nextRows.length;
  writeTaxesLocal(nextRows);
  return deletedCount;
};

export const getAssociatedRecordsLocal = (taxId: string) => {
  const rows = readTaxesLocal();
  const tax = rows.find((row) => String(row._id) === String(taxId));
  if (!tax) {
    return { exactMatches: [], rateMatches: [] };
  }

  if (isTaxGroupRecord(tax)) {
    return {
      exactMatches: [{ module: "Associated Taxes", count: (tax.groupTaxes || []).length }],
      rateMatches: [],
    };
  }

  const usedInGroups = rows.filter((row) =>
    isTaxGroupRecord(row) && (row.groupTaxes || []).some((id) => String(id) === String(taxId))
  ).length;

  const sameRate = rows.filter(
    (row) => String(row._id) !== String(taxId) && Number(row.rate || 0) === Number(tax.rate || 0)
  ).length;

  return {
    exactMatches: usedInGroups > 0 ? [{ module: "Tax Groups", count: usedInGroups }] : [],
    rateMatches: sameRate > 0 ? [{ module: "Other Taxes", count: sameRate }] : [],
  };
};

export const readTaxComplianceSettingsLocal = (): TaxComplianceSettings => {
  const parsed = safeParse<Partial<TaxComplianceSettings>>(
    localStorage.getItem(TAX_SETTINGS_STORAGE_KEY),
    {}
  );

  return {
    ...DEFAULT_TAX_SETTINGS,
    ...parsed,
    taxTrackingAccount: parsed.taxTrackingAccount === "separate" ? "separate" : "single",
  };
};

export const writeTaxComplianceSettingsLocal = (settings: Partial<TaxComplianceSettings>) => {
  const next = {
    ...readTaxComplianceSettingsLocal(),
    ...settings,
    taxTrackingAccount: settings.taxTrackingAccount === "separate" ? "separate" : "single",
  };
  localStorage.setItem(TAX_SETTINGS_STORAGE_KEY, JSON.stringify(next));
  emitStorageEvent(TAX_SETTINGS_STORAGE_EVENT);
  return next;
};
