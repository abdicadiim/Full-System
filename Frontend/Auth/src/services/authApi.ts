export type ApiSuccess<T> = { success: true; data: T; message?: string; token?: string };
export type ApiFailure<T = unknown> = { success: false; message?: string; data?: T; code?: number; token?: string };
type ApiResult<T, F = unknown> = ApiSuccess<T> | ApiFailure<F>;

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  organizationId: string;
  emailVerified?: boolean;
};

export type VerificationRequirement = {
  requiresEmailVerification?: boolean;
  email?: string;
  alreadyVerified?: boolean;
};

const request = async <T, F = unknown>(path: string, body?: unknown, method = "POST"): Promise<ApiResult<T, F>> => {
  const res = await fetch(`/api${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: method === "GET" ? undefined : JSON.stringify(body ?? {}),
    credentials: "include",
  });
  const payload = await res.json().catch(() => null);
  return payload ?? { success: false, message: "Bad response" };
};

export const authApi = {
  checkEmail: (email: string) =>
    request<{ exists: boolean }>("/auth/check-email", { email }),
  login: (email: string, password: string) => request<AuthUser, VerificationRequirement>(
      "/auth/login",
      { email, password }
    ),
  requestLoginOtp: (email: string, app?: string) =>
    request<{ email: string; expiresInSeconds: number; debugCode?: string }>(
      "/auth/login/email-otp",
      { email, app }
    ),
  verifyLoginOtp: (email: string, otp: string) =>
    request<AuthUser>(
      "/auth/login/email-otp/verify",
      { email, otp }
    ),
  requestEmailVerification: (email: string, app?: string) =>
    request<{ email: string; expiresInSeconds?: number; debugCode?: string; alreadyVerified?: boolean }>(
      "/auth/email-verification",
      { email, app }
    ),
  verifyEmailVerification: (email: string, code: string) =>
    request<AuthUser, VerificationRequirement>("/auth/email-verification/verify", { email, code }),
  requestPasswordReset: (email: string, app?: string) =>
    request<{ email: string; expiresInSeconds: number; debugCode?: string }>(
      "/auth/password/reset-request",
      { email, app }
    ),
  verifyPasswordResetCode: (email: string, code: string) =>
    request<{ verified: true; email: string }>("/auth/password/reset-verify", { email, code }),
  resetPassword: (email: string, code: string, newPassword: string, name?: string) =>
    request<AuthUser>(
      "/auth/password/reset",
      { email, code, newPassword, name }
    ),
  getUserInvitation: (userId: string, token: string) =>
    request<{ id: string; name: string; email: string; photoUrl?: string; organizationName: string; role: string }>(
      `/public/users/invitations/${encodeURIComponent(userId)}?token=${encodeURIComponent(token)}`,
      undefined,
      "GET"
    ),
  acceptUserInvitation: (userId: string, token: string) =>
    request<{ id: string; name: string; email: string; photoUrl?: string; organizationName: string; role: string }>(
      `/public/users/invitations/${encodeURIComponent(userId)}/accept`,
      { token }
    ),
  rejectUserInvitation: (userId: string, token: string) =>
    request<{ id: string }>(`/public/users/invitations/${encodeURIComponent(userId)}/reject`, { token }),
  signup: (name: string, email: string, password: string) =>
    request<AuthUser & { requiresEmailVerification: true }>("/auth/signup", { name, email, password }),
};


