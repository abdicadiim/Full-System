export type EmailTemplateKey =
  | "invoice_notification"
  | "quote_notification"
  | "customer_statement"
  | "vendor_statement"
  | "purchase_order_notification"
  | "payment_made_notification"
  | "bill_notification"
  | "customer_notification";

const TEMPLATE_KEY_BY_LABEL: Record<string, EmailTemplateKey> = {
  "Invoice Notification": "invoice_notification",
  "Quote Notification": "quote_notification",
  "Customer Statement": "customer_statement",
  "Vendor Statement": "vendor_statement",
  "Purchase Order Notification": "purchase_order_notification",
  "Payment Made Notification": "payment_made_notification",
  "Bill Notification": "bill_notification",
  "Customer Notification": "customer_notification",
};

export const getTemplateKeyFromLabel = (label?: string | null): EmailTemplateKey => {
  if (!label) return "customer_notification";
  return TEMPLATE_KEY_BY_LABEL[label] || "customer_notification";
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
