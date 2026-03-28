type ApiResult<T> =
  | { success: true; data: T; message?: string }
  | { success: false; message?: string; data?: unknown };

const request = async <T>(path: string, body?: unknown): Promise<ApiResult<T>> => {
  const res = await fetch(`/api${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
    credentials: "include",
  });
  const payload = await res.json().catch(() => null);
  return payload ?? { success: false, message: "Bad response" };
};

export const authApi = {
  login: (email: string, password: string) => request<{ id: string; name: string; email: string }>(
      "/auth/login",
      { email, password }
    ),
  requestLoginOtp: (email: string, app?: string) =>
    request<{ email: string; expiresInSeconds: number; debugCode?: string }>(
      "/auth/login/email-otp",
      { email, app }
    ),
  verifyLoginOtp: (email: string, otp: string) =>
    request<{ id: string; name: string; email: string }>(
      "/auth/login/email-otp/verify",
      { email, otp }
    ),
  requestPasswordReset: (email: string, app?: string) =>
    request<{ email: string; expiresInSeconds: number; debugCode?: string }>(
      "/auth/password/reset-request",
      { email, app }
    ),
  verifyPasswordResetCode: (email: string, code: string) =>
    request<{ verified: true; email: string }>("/auth/password/reset-verify", { email, code }),
  resetPassword: (email: string, code: string, newPassword: string) =>
    request<{ id: string; name: string; email: string }>(
      "/auth/password/reset",
      { email, code, newPassword }
    ),
  signup: (name: string, email: string, password: string) =>
    request<{ id: string; name: string; email: string }>("/auth/signup", { name, email, password }),
};

