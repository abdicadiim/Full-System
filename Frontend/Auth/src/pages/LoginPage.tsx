import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import AuthShell from "../components/AuthShell";
import { getAppDisplayName, getFallbackUrl } from "../lib/appBranding";
import { goReturnTo } from "../lib/returnTo";
import { clearSessionBridgeToken, setSessionBridgeToken } from "../lib/sessionBridge";
import { authApi } from "../services/authApi";

const persistSession = (result: any) => {
  if (typeof window === "undefined") return;
  const token = typeof result?.token === "string" ? result.token : "";
  const user = result?.data ?? null;

  if (token) {
    localStorage.setItem("auth_token", token);
    localStorage.setItem("token", token);
    localStorage.setItem("accessToken", token);
    setSessionBridgeToken(token);
  }
  if (user) {
    const serialized = JSON.stringify(user);
    localStorage.setItem("user", serialized);
    localStorage.setItem("current_user", serialized);
    localStorage.setItem("auth_user", serialized);
  }
};

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const appName = getAppDisplayName();
  const search = window.location.search;
  const isLogoutRedirect = new URLSearchParams(search).get("logout") === "1";
  const trimmedEmail = email.trim();
  const otpQuery = (() => {
    const params = new URLSearchParams(search);
    params.delete("logout");
    params.delete("auth_return");
    if (trimmedEmail) {
      params.set("email", trimmedEmail);
    } else {
      params.delete("email");
    }
    const query = params.toString();
    return query ? `?${query}` : "";
  })();
  const forgotPasswordQuery = (() => {
    const params = new URLSearchParams(search);
    params.delete("logout");
    params.delete("auth_return");
    if (trimmedEmail) {
      params.set("email", trimmedEmail);
    } else {
      params.delete("email");
    }
    const query = params.toString();
    return query ? `?${query}` : "";
  })();

  const clearStoredSession = () => {
    if (typeof localStorage === "undefined") return;
    localStorage.removeItem("auth_token");
    localStorage.removeItem("token");
    localStorage.removeItem("accessToken");
    localStorage.removeItem("user");
    localStorage.removeItem("current_user");
    localStorage.removeItem("auth_user");
    localStorage.removeItem("timerState");
    localStorage.removeItem("auth_bootstrap_ready");
    clearSessionBridgeToken();
  };

  useEffect(() => {
    if (isLogoutRedirect) {
      clearStoredSession();
    }
  }, [isLogoutRedirect]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const nextEmail = email.trim();
    const nextPassword = password;
    if (!nextEmail || !nextPassword) {
      setError("Please enter both email and password.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await authApi.login(nextEmail, nextPassword);
      if (!result || !result.success) {
        const failure = result && !result.success ? (result as { success: false; message?: string }) : null;
        setError(failure?.message || "Login failed");
      } else {
        persistSession(result);
        goReturnTo(getFallbackUrl());
      }
    } catch (err: any) {
      setError(err?.message || "An error occurred during login");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell>
      <div className="mb-10">
        <h2 className="mb-2 text-3xl font-bold text-slate-900">{`Welcome to ${appName}`}</h2>
        <p className="text-slate-600">Sign in to continue.</p>
      </div>

      <form className="space-y-5" onSubmit={onSubmit}>
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">Email Address</label>
          <input
            className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-primary"
            placeholder="name@company.com"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">Password</label>
          <div className="relative">
            <input
              className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 pr-12 text-slate-900 outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-primary"
              placeholder="Enter your password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-500 transition-colors hover:text-slate-700"
              onClick={() => setShowPassword((current) => !current)}
              type="button"
            >
              <span className="material-symbols-outlined text-[20px]">
                {showPassword ? "visibility_off" : "visibility"}
              </span>
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-3 pt-1 text-sm sm:flex-row sm:items-center sm:justify-between">
          <Link
            className="inline-flex items-center justify-center rounded-lg border border-primary/20 bg-primary/5 px-4 py-2 font-semibold text-primary transition-colors hover:bg-primary/10"
            to={`/login/email-otp${otpQuery}`}
          >
            Sign in using email OTP
          </Link>
          <Link
            className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50"
            to={`/forgot-password${forgotPasswordQuery}`}
          >
            Forgot Password?
          </Link>
        </div>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <button
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-4 font-bold text-white shadow-[0_10px_25px_rgba(18,86,99,0.20)] transition-all hover:bg-primary/90 disabled:opacity-60"
          disabled={loading}
          type="submit"
        >
          <span>{loading ? "Signing in..." : "Sign in"}</span>
          <span className="material-symbols-outlined text-sm">arrow_forward</span>
        </button>
      </form>

      <p className="mt-10 text-center text-sm text-slate-600">
        No account?{" "}
        <Link className="font-bold text-primary hover:underline" to={`/signup${window.location.search}`}>
          Create one
        </Link>
      </p>
    </AuthShell>
  );
}
