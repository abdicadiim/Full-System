type ApiResult<T> =
  | { success: true; data: T; message?: string }
  | { success: false; message?: string; data?: unknown };

const request = async <T>(path: string, body?: unknown, method = "POST"): Promise<ApiResult<T>> => {
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
  resetPassword: (email: string, code: string, newPassword: string, name?: string) =>
    request<{ id: string; name: string; email: string }>(
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
    request<{ id: string; name: string; email: string }>("/auth/signup", { name, email, password }),
};

