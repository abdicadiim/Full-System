const MAX_NAME_LENGTH = 220;
const MAX_DESCRIPTION_LENGTH = 5000;
const MAX_EMAIL_IDS_LENGTH = 1000;
const MAX_REDIRECT_URL_LENGTH = 2000;
const MAX_PREFIX_LENGTH = 30;
const MAX_NEXT_NUMBER_LENGTH = 30;

const trimTo = (value: unknown, maxLength: number) =>
  String(typeof value === "string" ? value : "").trim().slice(0, maxLength);

const toTimestampString = (value: unknown) => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString();
  }
  const text = String(value ?? "").trim();
  if (!text) return "";
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? text : parsed.toISOString();
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

const normalizeEmailIds = (value: unknown) =>
  trimTo(value, MAX_EMAIL_IDS_LENGTH)
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

const isValidRedirectUrl = (value: string) => {
  try {
    const parsed = new URL(value);
    return ["http:", "https:"].includes(parsed.protocol);
  } catch {
    return false;
  }
};

export const normalizeProductStatus = (value: unknown) =>
  String(value ?? "").trim().toLowerCase() === "inactive" ? "inactive" : "active";

export const toFrontendProductStatus = (value: unknown) =>
  normalizeProductStatus(value) === "inactive" ? "Inactive" : "Active";

export const toZohoProductStatus = (value: unknown) => normalizeProductStatus(value);

export const buildFrontendProductPayload = (record: any) => {
  const id = String(record?._id || record?.id || record?.product_id || "").trim();
  const emailIds = trimTo(record?.email_ids ?? record?.emailRecipients, MAX_EMAIL_IDS_LENGTH);
  const redirectUrl = trimTo(record?.redirect_url ?? record?.redirectionUrl, MAX_REDIRECT_URL_LENGTH);
  const createdTime = toTimestampString(record?.created_time ?? record?.createdAt);
  const updatedTime = toTimestampString(record?.updated_time ?? record?.updatedAt);
  const status = toFrontendProductStatus(record?.status);

  return {
    ...record,
    id,
    _id: id,
    product_id: id,
    name: trimTo(record?.name, MAX_NAME_LENGTH),
    description: trimTo(record?.description, MAX_DESCRIPTION_LENGTH),
    emailRecipients: emailIds,
    email_ids: emailIds,
    redirectionUrl: redirectUrl,
    redirect_url: redirectUrl,
    status,
    active: status === "Active",
    isActive: status === "Active",
    creationDate: createdTime,
    created_time: createdTime,
    updated_time: updatedTime,
    createdAt: createdTime,
    updatedAt: updatedTime,
    autoGenerateSubscriptionNumbers: Boolean(record?.autoGenerateSubscriptionNumbers),
    prefix: trimTo(record?.prefix, MAX_PREFIX_LENGTH),
    nextNumber: trimTo(record?.nextNumber, MAX_NEXT_NUMBER_LENGTH),
  };
};

export const buildZohoProductPayload = (record: any) => {
  const frontend = buildFrontendProductPayload(record);

  return {
    product_id: frontend.product_id,
    name: frontend.name,
    description: frontend.description,
    email_ids: frontend.email_ids,
    redirect_url: frontend.redirect_url,
    status: toZohoProductStatus(frontend.status),
    created_time: frontend.created_time,
    updated_time: frontend.updated_time,
  };
};

export const parseProductPayload = (
  body: unknown,
  options: { requireName?: boolean } = {},
) => {
  const source = body && typeof body === "object" ? { ...(body as Record<string, unknown>) } : {};
  const errors: string[] = [];

  delete source._id;
  delete source.id;
  delete source.product_id;
  delete source.organizationId;
  delete source.createdAt;
  delete source.updatedAt;
  delete source.created_time;
  delete source.updated_time;
  delete source.__v;

  const namePresent = Object.prototype.hasOwnProperty.call(source, "name");
  const nextName = trimTo(source.name, MAX_NAME_LENGTH);
  if (namePresent) {
    source.name = nextName;
    if (!nextName) {
      errors.push("Product name is required");
    }
  }
  if (options.requireName && !nextName && !errors.includes("Product name is required")) {
    errors.push("Product name is required");
  }

  if (Object.prototype.hasOwnProperty.call(source, "description")) {
    source.description = trimTo(source.description, MAX_DESCRIPTION_LENGTH);
  }

  const emailIdsPresent =
    Object.prototype.hasOwnProperty.call(source, "email_ids") ||
    Object.prototype.hasOwnProperty.call(source, "emailRecipients");
  if (emailIdsPresent) {
    const emails = normalizeEmailIds(source.email_ids ?? source.emailRecipients);
    const invalidEmail = emails.find((email) => !EMAIL_REGEX.test(email));
    if (invalidEmail) {
      errors.push("Email IDs must contain valid email addresses");
    }
    const normalized = emails.join(", ");
    source.email_ids = normalized;
    source.emailRecipients = normalized;
  }

  const redirectUrlPresent =
    Object.prototype.hasOwnProperty.call(source, "redirect_url") ||
    Object.prototype.hasOwnProperty.call(source, "redirectionUrl");
  if (redirectUrlPresent) {
    const redirectUrl = trimTo(source.redirect_url ?? source.redirectionUrl, MAX_REDIRECT_URL_LENGTH);
    if (redirectUrl && !isValidRedirectUrl(redirectUrl)) {
      errors.push("Redirect URL must be a valid http or https URL");
    }
    source.redirect_url = redirectUrl;
    source.redirectionUrl = redirectUrl;
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
          : normalizeProductStatus(source.status) !== "inactive";
    source.status = active ? "Active" : "Inactive";
  }

  if (Object.prototype.hasOwnProperty.call(source, "autoGenerateSubscriptionNumbers")) {
    source.autoGenerateSubscriptionNumbers = Boolean(source.autoGenerateSubscriptionNumbers);
  }

  if (Object.prototype.hasOwnProperty.call(source, "prefix")) {
    source.prefix = trimTo(source.prefix, MAX_PREFIX_LENGTH);
  }

  if (Object.prototype.hasOwnProperty.call(source, "nextNumber")) {
    source.nextNumber = trimTo(source.nextNumber, MAX_NEXT_NUMBER_LENGTH);
  }

  return {
    patch: source,
    errors,
  };
};
