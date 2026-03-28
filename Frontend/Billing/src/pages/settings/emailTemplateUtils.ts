export type EmailTemplateKey = string;

const DEFAULT_TEMPLATE_KEY: EmailTemplateKey = "customer_notification";

const toTemplateKey = (label: string): EmailTemplateKey =>
  label
    .trim()
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

export const getTemplateKeyFromLabel = (label?: string | null): EmailTemplateKey => {
  if (!label) return DEFAULT_TEMPLATE_KEY;
  return toTemplateKey(label);
};

export const applyEmailTemplate = (
  templateText: string,
  placeholders: Record<string, string | number | undefined | null>
): string => {
  let result = templateText || "";
  Object.entries(placeholders).forEach(([key, value]) => {
    const placeholder = `%${key}%`;
    const safeValue = value === undefined || value === null ? "" : String(value);
    result = result.split(placeholder).join(safeValue);
  });
  return result;
};
