type ApiResult<T> =
  | { success: true; data: T }
  | { success: false; message?: string; data?: unknown };

const getAuthToken = () => {
  if (typeof window === "undefined") return "";
  return String(
    localStorage.getItem("auth_token")
      || localStorage.getItem("token")
      || localStorage.getItem("accessToken")
      || ""
  ).trim();
};

const request = async <T>(path: string, method: "GET" | "PATCH", body?: unknown): Promise<ApiResult<T>> => {
  const token = getAuthToken();
  const headers: Record<string, string> = {};
  if (method === "PATCH") {
    headers["Content-Type"] = "application/json";
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`/api${path}`, {
    method,
    headers: Object.keys(headers).length > 0 ? headers : undefined,
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
