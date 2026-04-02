const MAX_NAME_LENGTH = 100;
const MAX_DESCRIPTION_LENGTH = 2000;

const trimTo = (value: unknown, maxLength: number) =>
  String(typeof value === "string" ? value : "").trim().slice(0, maxLength);

const asNumber = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
};

export const normalizeProductType = (value: unknown) => {
  const raw = String(value ?? "").trim().toLowerCase();
  if (!raw) return "goods";
  if (["service", "services"].includes(raw)) return "service";
  return "goods";
};

export const toFrontendItemStatus = (value: unknown) =>
  String(value ?? "").trim().toLowerCase() === "inactive" ? "Inactive" : "Active";

export const toZohoItemStatus = (value: unknown) =>
  String(value ?? "").trim().toLowerCase() === "inactive" ? "inactive" : "active";

export const toFrontendItemType = (value: unknown) =>
  normalizeProductType(value) === "service" ? "Service" : "Goods";

const computeFrontendActive = (record: any) => {
  if (typeof record?.active === "boolean") return record.active;
  if (typeof record?.isActive === "boolean") return record.isActive;
  return toZohoItemStatus(record?.status) !== "inactive";
};

const parseTaxLabel = (value: unknown) => {
  const label = String(value ?? "").trim();
  if (!label) return { name: "", percentage: "" };

  const match = label.match(/^(.*?)\s*\[(.*?)%\]\s*$/);
  if (!match) {
    return { name: label, percentage: "" };
  }

  return {
    name: String(match[1] || "").trim(),
    percentage: String(match[2] || "").trim(),
  };
};

const normalizeCustomFields = (value: unknown) => {
  if (!Array.isArray(value)) return [];
  return value
    .map((row: any) => {
      const customfield_id = trimTo(row?.customfield_id ?? row?.id, 80);
      const nextValue = trimTo(row?.value, 255);
      return { customfield_id, value: nextValue };
    })
    .filter((row) => row.customfield_id || row.value);
};

const normalizeItemTaxPreferences = (value: unknown) => {
  if (!Array.isArray(value)) return [];
  return value
    .map((row: any) => ({
      tax_id: trimTo(row?.tax_id, 80),
      tax_specification: trimTo(row?.tax_specification, 40),
    }))
    .filter((row) => row.tax_id || row.tax_specification);
};

export const buildFrontendItemPayload = (record: any) => {
  const active = computeFrontendActive(record);
  const productType = normalizeProductType(record?.product_type ?? record?.type);
  const taxNameFromLabel = parseTaxLabel(record?.salesTax);
  const taxName =
    trimTo(record?.tax_name ?? record?.taxName ?? record?.taxInfo?.taxName, 120) ||
    taxNameFromLabel.name;
  const taxPercentage =
    trimTo(record?.tax_percentage ?? record?.taxInfo?.taxRate, 40) ||
    taxNameFromLabel.percentage;

  return {
    ...record,
    id: String(record?._id || record?.id || record?.item_id || "").trim(),
    _id: String(record?._id || record?.id || record?.item_id || "").trim(),
    item_id: String(record?._id || record?.id || record?.item_id || "").trim(),
    name: trimTo(record?.name, MAX_NAME_LENGTH),
    sku: trimTo(record?.sku, 120),
    description: trimTo(record?.description ?? record?.salesDescription, MAX_DESCRIPTION_LENGTH),
    salesDescription: trimTo(record?.salesDescription ?? record?.description, MAX_DESCRIPTION_LENGTH),
    unit: trimTo(record?.unit, 80),
    rate: asNumber(record?.rate ?? record?.sellingPrice) ?? 0,
    sellingPrice: asNumber(record?.sellingPrice ?? record?.rate) ?? 0,
    status: active ? "Active" : "Inactive",
    active,
    isActive: active,
    type: toFrontendItemType(productType),
    product_type: productType,
    taxId: trimTo(record?.tax_id ?? record?.taxId ?? record?.taxInfo?.taxId, 80),
    salesTax:
      trimTo(record?.salesTax, 160) ||
      (taxName ? `${taxName} [${taxPercentage || "0"}%]` : ""),
    taxInfo:
      taxName || taxPercentage
        ? {
            taxId: trimTo(record?.tax_id ?? record?.taxId ?? record?.taxInfo?.taxId, 80),
            taxName,
            taxRate: Number(taxPercentage || 0),
            kind: trimTo(record?.tax_type ?? record?.taxType ?? record?.taxInfo?.kind, 80) || "tax",
          }
        : record?.taxInfo,
    custom_fields: normalizeCustomFields(record?.custom_fields),
    item_tax_preferences: normalizeItemTaxPreferences(record?.item_tax_preferences),
  };
};

export const buildZohoItemPayload = (record: any) => {
  const frontend = buildFrontendItemPayload(record);
  const taxName = trimTo(record?.tax_name ?? record?.taxInfo?.taxName, 120) || parseTaxLabel(record?.salesTax).name;
  const taxPercentage =
    trimTo(record?.tax_percentage ?? record?.taxInfo?.taxRate, 40) || parseTaxLabel(record?.salesTax).percentage;

  return {
    item_id: frontend.item_id,
    name: frontend.name,
    status: toZohoItemStatus(record?.status ?? frontend.status),
    description: frontend.description,
    rate: frontend.rate,
    unit: frontend.unit,
    tax_id: trimTo(record?.tax_id ?? record?.taxId ?? record?.taxInfo?.taxId, 80),
    tax_name: taxName,
    tax_percentage: taxPercentage ? `${String(taxPercentage).replace(/%$/, "")}%` : "",
    tax_type: trimTo(record?.tax_type ?? record?.taxType ?? record?.taxInfo?.kind, 80) || "tax",
    sku: frontend.sku,
    product_type: frontend.product_type,
    hsn_or_sac: trimTo(record?.hsn_or_sac, 80),
    sat_item_key_code: trimTo(record?.sat_item_key_code, 80),
    unitkey_code: trimTo(record?.unitkey_code, 80),
    item_tax_preferences: normalizeItemTaxPreferences(record?.item_tax_preferences),
    custom_fields: normalizeCustomFields(record?.custom_fields),
  };
};

export const parseItemPayload = (
  body: unknown,
  options: { requireName?: boolean; requireRate?: boolean } = {},
) => {
  const source = body && typeof body === "object" ? { ...(body as Record<string, unknown>) } : {};
  const errors: string[] = [];

  delete source._id;
  delete source.id;
  delete source.item_id;
  delete source.organizationId;
  delete source.createdBy;
  delete source.updatedBy;
  delete source.history;
  delete source.createdAt;
  delete source.updatedAt;
  delete source.__v;

  const namePresent = Object.prototype.hasOwnProperty.call(source, "name");
  const nextName = trimTo(source.name, MAX_NAME_LENGTH);
  if (namePresent) {
    source.name = nextName;
    if (!nextName) {
      errors.push("Item name is required");
    }
  }
  if (options.requireName && !nextName && !errors.includes("Item name is required")) {
    errors.push("Item name is required");
  }

  const ratePresent =
    Object.prototype.hasOwnProperty.call(source, "rate") ||
    Object.prototype.hasOwnProperty.call(source, "sellingPrice");
  const nextRate = asNumber(source.rate ?? source.sellingPrice);
  if (ratePresent) {
    if (nextRate === null || nextRate < 0) {
      errors.push("Rate must be a valid non-negative number");
    } else {
      source.rate = nextRate;
      source.sellingPrice = nextRate;
    }
  }
  if (options.requireRate && (nextRate === null || nextRate < 0)) {
    errors.push("Rate is required");
  }

  if (Object.prototype.hasOwnProperty.call(source, "description")) {
    source.description = trimTo(source.description, MAX_DESCRIPTION_LENGTH);
  } else if (Object.prototype.hasOwnProperty.call(source, "salesDescription")) {
    source.description = trimTo(source.salesDescription, MAX_DESCRIPTION_LENGTH);
  }

  if (Object.prototype.hasOwnProperty.call(source, "salesDescription")) {
    source.salesDescription = trimTo(source.salesDescription, MAX_DESCRIPTION_LENGTH);
  } else if (Object.prototype.hasOwnProperty.call(source, "description")) {
    source.salesDescription = trimTo(source.description, MAX_DESCRIPTION_LENGTH);
  }

  if (Object.prototype.hasOwnProperty.call(source, "sku")) {
    source.sku = trimTo(source.sku, 120);
  }
  if (Object.prototype.hasOwnProperty.call(source, "unit")) {
    source.unit = trimTo(source.unit, 80);
  }

  const productTypePresent =
    Object.prototype.hasOwnProperty.call(source, "product_type") ||
    Object.prototype.hasOwnProperty.call(source, "type");
  if (productTypePresent) {
    const productType = normalizeProductType(source.product_type ?? source.type);
    source.product_type = productType;
    source.type = toFrontendItemType(productType);
  }

  const statusPresent =
    Object.prototype.hasOwnProperty.call(source, "status") ||
    Object.prototype.hasOwnProperty.call(source, "active") ||
    Object.prototype.hasOwnProperty.call(source, "isActive");
  if (statusPresent) {
    const active =
      typeof source.active === "boolean"
        ? source.active
        : typeof source.isActive === "boolean"
          ? source.isActive
          : toZohoItemStatus(source.status) !== "inactive";
    source.active = active;
    source.isActive = active;
    source.status = active ? "Active" : "Inactive";
  }

  const taxInfo =
    source.taxInfo && typeof source.taxInfo === "object"
      ? (source.taxInfo as Record<string, unknown>)
      : {};

  const taxId = trimTo(source.tax_id ?? source.taxId ?? taxInfo.taxId, 80);
  if (taxId) {
    source.tax_id = taxId;
    source.taxId = taxId;
  }

  const taxName = trimTo(source.tax_name ?? source.taxName ?? taxInfo.taxName, 120) || parseTaxLabel(source.salesTax).name;
  const taxPercentage =
    trimTo(source.tax_percentage ?? taxInfo.taxRate, 40) || parseTaxLabel(source.salesTax).percentage;
  const taxType = trimTo(source.tax_type ?? source.taxType ?? taxInfo.kind, 80);
  if (taxName || taxPercentage || taxType || taxId) {
    source.tax_name = taxName;
    source.taxName = taxName;
    source.tax_percentage = taxPercentage ? String(taxPercentage).replace(/%$/, "") : "";
    source.tax_type = taxType || "tax";
    source.taxType = taxType || "tax";
    source.taxInfo = {
      taxId,
      taxName,
      taxRate: Number(taxPercentage || 0),
      kind: taxType || "tax",
    };
    if (!Object.prototype.hasOwnProperty.call(source, "salesTax")) {
      source.salesTax = taxName ? `${taxName} [${taxPercentage || "0"}%]` : "";
    }
  }

  if (Object.prototype.hasOwnProperty.call(source, "custom_fields")) {
    source.custom_fields = normalizeCustomFields(source.custom_fields);
  }
  if (Object.prototype.hasOwnProperty.call(source, "item_tax_preferences")) {
    source.item_tax_preferences = normalizeItemTaxPreferences(source.item_tax_preferences);
  }

  if (!Object.prototype.hasOwnProperty.call(source, "status")) {
    const active =
      typeof source.active === "boolean"
        ? source.active
        : typeof source.isActive === "boolean"
          ? source.isActive
          : true;
    source.active = active;
    source.isActive = active;
    source.status = active ? "Active" : "Inactive";
  }

  if (!Object.prototype.hasOwnProperty.call(source, "product_type") && !Object.prototype.hasOwnProperty.call(source, "type")) {
    source.product_type = normalizeProductType(source.product_type ?? source.type ?? "goods");
    source.type = toFrontendItemType(source.product_type);
  }

  return {
    patch: source,
    errors,
  };
};
