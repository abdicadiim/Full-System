import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import AuthShell from "../components/AuthShell";
import { getAppDisplayName, getFallbackUrl } from "../lib/appBranding";
import { goReturnTo } from "../lib/returnTo";
import { authApi } from "../services/authApi";
import { waitForBackendReady } from "../services/backendReady";

const persistSession = (result: any) => {
  if (typeof window === "undefined") return;
  const token = typeof result?.token === "string" ? result.token : "";
  const user = result?.data ?? null;

  if (token) {
    localStorage.setItem("auth_token", token);
    localStorage.setItem("token", token);
    localStorage.setItem("accessToken", token);
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const appName = getAppDisplayName();

  useEffect(() => {
    const checkLogin = async () => {
      await waitForBackendReady();
      const token =
        localStorage.getItem("auth_token") ||
        localStorage.getItem("token") ||
        localStorage.getItem("accessToken") ||
        "";
      try {
        const res = await fetch("/api/auth/me", {
          credentials: 'include',
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        if (res.ok) {
          goReturnTo(getFallbackUrl());
        }
      } catch (e) {}
    };
    checkLogin();
  }, []);

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
          <input
            className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-primary"
            placeholder="••••••••"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
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
