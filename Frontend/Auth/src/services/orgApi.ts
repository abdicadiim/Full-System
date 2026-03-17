type ApiResult<T> =
  | { success: true; data: T }
  | { success: false; message?: string; data?: unknown };

const request = async <T>(path: string, method: "GET" | "PATCH", body?: unknown): Promise<ApiResult<T>> => {
  const res = await fetch(`/api${path}`, {
    method,
    headers: method === "PATCH" ? { "Content-Type": "application/json" } : undefined,
    body: method === "PATCH" ? JSON.stringify(body ?? {}) : undefined,
    credentials: "include",
  });
  const payload = await res.json().catch(() => null);
  return payload ?? { success: false, message: "Bad response" };
};

export type OrganizationProfilePatch = Partial<{
  name: string;
  industry: string;
  countryIso: string;
  state: string;
  baseCurrency: string;
  fiscalYear: string;
  language: string;
  timeZone: string;
  billingProcess: string;
  invoicingTool: string;
  currentBillingTool: string;
  wantsImport: boolean;
  logoUrl: string;
}>;

export const orgApi = {
  getMe: () => request<any>("/organizations/me", "GET"),
  patchMe: (patch: OrganizationProfilePatch) => request<any>("/organizations/me", "PATCH", patch),
};
