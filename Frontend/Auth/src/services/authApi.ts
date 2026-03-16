type ApiResult<T> =
  | { success: true; data: T }
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
  signup: (name: string, email: string, password: string) =>
    request<{ id: string; name: string; email: string }>("/auth/signup", { name, email, password }),
};

