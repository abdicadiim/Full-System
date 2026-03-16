import React, { useState } from "react";
import { Link } from "react-router-dom";
import AuthShell from "../components/AuthShell";
import { getAppDisplayName, getFallbackUrl } from "../lib/appBranding";
import { goReturnTo } from "../lib/returnTo";
import { authApi } from "../services/authApi";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const appName = getAppDisplayName();

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    authApi.login(email, password).catch(() => {});
    goReturnTo(getFallbackUrl());
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

