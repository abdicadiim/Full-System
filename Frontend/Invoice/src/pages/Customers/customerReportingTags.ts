import { reportingTagsAPI } from "../../services/api";

const INACTIVE_TAG_STATUSES = new Set(["inactive", "disabled", "archived", "not ready", "draft"]);
const INACTIVE_OPTION_STATUSES = new Set(["inactive", "disabled", "archived"]);

const normalizeText = (value: any) => String(value ?? "").trim();

export const normalizeReportingTagAppliesTo = (tag: any): string[] => {
  const direct = Array.isArray(tag?.appliesTo) ? tag.appliesTo : [];
  const fromModulesObject = tag?.modules && typeof tag.modules === "object"
    ? Object.keys(tag.modules).filter((key) => Boolean(tag.modules[key]))
    : [];
  const fromModuleSettings = tag?.moduleSettings && typeof tag.moduleSettings === "object"
    ? Object.keys(tag.moduleSettings).filter((key) => Boolean(tag.moduleSettings[key]))
    : [];
  const fromAssociations = Array.isArray(tag?.associations) ? tag.associations : [];
  const fromModulesList = Array.isArray(tag?.modulesList) ? tag.modulesList : [];

  return [...direct, ...fromModulesObject, ...fromModuleSettings, ...fromAssociations, ...fromModulesList]
    .map((value: any) => normalizeText(value).toLowerCase())
    .filter(Boolean);
};

export const isReportingTagActive = (tag: any): boolean => {
  if (!tag || typeof tag !== "object") return false;
  if (tag.isInactive === true) return false;
  if (typeof tag.isActive === "boolean") return tag.isActive;
  if (typeof tag.active === "boolean") return tag.active;
  if (typeof tag.enabled === "boolean") return tag.enabled;

  const status = normalizeText(tag.status).toLowerCase();
  if (!status) return true;
  return !INACTIVE_TAG_STATUSES.has(status);
};

export const normalizeReportingTagOptions = (tag: any): string[] => {
  const inactiveOptions = new Set(
    (Array.isArray(tag?.inactiveOptions) ? tag.inactiveOptions : [])
      .map((value: any) => normalizeText(value).toLowerCase())
      .filter(Boolean),
  );
  const candidates = Array.isArray(tag?.options)
    ? tag.options
    : Array.isArray(tag?.values)
      ? tag.values
      : [];
  const seen = new Set<string>();

  return candidates
    .map((option: any) => {
      if (typeof option === "string") {
        const value = normalizeText(option);
        return { value, isActive: !inactiveOptions.has(value.toLowerCase()) };
      }

      if (option && typeof option === "object") {
        const value = normalizeText(
          option.value ??
          option.label ??
          option.name ??
          option.option ??
          option.title,
        );
        const status = normalizeText(option.status).toLowerCase();
        const isOptionActive = option.inactive !== true
          && option.isInactive !== true
          && (typeof option.isActive === "boolean"
            ? option.isActive
            : typeof option.active === "boolean"
              ? option.active
              : typeof option.enabled === "boolean"
                ? option.enabled
                : !INACTIVE_OPTION_STATUSES.has(status));

        return {
          value,
          isActive: Boolean(value) && isOptionActive && !inactiveOptions.has(value.toLowerCase()),
        };
      }

      return { value: "", isActive: false };
    })
    .filter((entry: { value: string; isActive: boolean }) => entry.isActive && Boolean(entry.value))
    .map((entry: { value: string; isActive: boolean }) => entry.value)
    .filter((value: string) => {
      const key = value.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
};

export const isCustomerReportingTag = (tag: any): boolean => {
  const appliesTo = normalizeReportingTagAppliesTo(tag);
  return appliesTo.some((entry) => entry.includes("customer"));
};

export const normalizeCustomerReportingTagDefinitions = (rows: any[]): any[] => {
  const activeRows = (Array.isArray(rows) ? rows : [])
    .filter(isReportingTagActive)
    .map((tag: any) => ({
      ...tag,
      options: normalizeReportingTagOptions(tag),
    }));
  const customerScopedRows = activeRows.filter(isCustomerReportingTag);
  return customerScopedRows.length > 0 ? customerScopedRows : activeRows;
};

export const loadCustomerReportingTags = async (): Promise<any[]> => {
  const response = await reportingTagsAPI.getAll({ limit: 10000 });
  const rows = Array.isArray(response) ? response : (response?.data || []);
  return normalizeCustomerReportingTagDefinitions(rows);
};
