export type SenderIdentity = {
  name: string;
  email: string;
};

export const formatSenderDisplay = (
  name?: string | null,
  email?: string | null,
  fallbackName = "Team"
): string => {
  const resolvedName = String(name || fallbackName).trim() || fallbackName;
  const resolvedEmail = String(email || "").trim();
  return resolvedEmail ? `"${resolvedName}" <${resolvedEmail}>` : resolvedName;
};

export const resolveVerifiedPrimarySender = (
  senderResponse: any,
  fallbackName = "Team",
  fallbackEmail = ""
): SenderIdentity => {
  if (senderResponse?.success && senderResponse.data?.isVerified) {
    return {
      name: String(senderResponse.data.name || fallbackName).trim() || fallbackName,
      email: String(senderResponse.data.email || fallbackEmail).trim() || fallbackEmail,
    };
  }

  return {
    name: String(fallbackName || "Team").trim() || "Team",
    email: String(fallbackEmail || "").trim(),
  };
};
