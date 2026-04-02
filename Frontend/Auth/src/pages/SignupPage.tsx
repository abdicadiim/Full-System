import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthShell from "../components/AuthShell";
import { getAppDisplayName } from "../lib/appBranding";
import { authApi } from "../services/authApi";

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

export default function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [emailExists, setEmailExists] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const appName = getAppDisplayName();
  const navigate = useNavigate();
  const trimmedEmail = email.trim().toLowerCase();

  useEffect(() => {
    let active = true;

    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setCheckingEmail(false);
      setEmailExists(false);
      return;
    }

    setCheckingEmail(true);
    const timer = window.setTimeout(async () => {
      const result = await authApi.checkEmail(trimmedEmail).catch(() => null);
      if (!active) return;
      setCheckingEmail(false);
      setEmailExists(Boolean(result?.success && result.data?.exists));
    }, 350);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [trimmedEmail]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const nextEmail = trimmedEmail;
    const existsResult = nextEmail ? await authApi.checkEmail(nextEmail).catch(() => null) : null;
    if (existsResult?.success && existsResult.data?.exists) {
      setEmailExists(true);
      setLoading(false);
      setError("An account with this email already exists. Please log in.");
      return;
    }

    try {
      sessionStorage.setItem("orgName", name);
    } catch {}

    const result = await authApi.signup(name, email, password).catch(() => null);
    if (!result || !result.success) {
      setLoading(false);
      const message = result && !result.success ? result.message || "Signup failed" : "Signup failed";
      if (message.toLowerCase().includes("already exists")) {
        setEmailExists(true);
      }
      setError(message);
      return;
    }

    persistSession(result);
    navigate(`/org-setup${window.location.search}`, { state: { orgName: name } });
  };

  return (
    <AuthShell>
      <div className="mb-10">
        <h2 className="mb-2 text-3xl font-bold text-slate-900">Create your account</h2>
        <p className="text-slate-600">{`Join 10,000+ businesses scaling with ${appName}.`}</p>
      </div>

      <form className="space-y-5" onSubmit={onSubmit}>
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">Company Name</label>
          <input
            className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-primary"
            placeholder="Acme Corp"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">Email Address</label>
          <input
            className={[
              "w-full rounded-lg border bg-white px-4 py-3 text-slate-900 outline-none transition-all focus:border-transparent focus:ring-2",
              emailExists ? "border-red-300 focus:ring-red-200" : "border-slate-200 focus:ring-primary",
            ].join(" ")}
            placeholder="name@company.com"
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setError(null);
            }}
          />
          {checkingEmail ? <p className="mt-2 text-xs text-slate-500">Checking email...</p> : null}
          {!checkingEmail && emailExists ? (
            <p className="mt-2 text-xs text-red-600">
              An account with this email already exists.{" "}
              <Link className="font-semibold underline" to={`/login${window.location.search}`}>
                Log in
              </Link>
            </p>
          ) : null}
        </div>
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">Password</label>
          <input
            className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-primary"
            placeholder="Enter your password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <button
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-4 font-bold text-white shadow-[0_10px_25px_rgba(18,86,99,0.20)] transition-all hover:bg-primary/90 disabled:opacity-60"
          disabled={loading || checkingEmail || emailExists}
          type="submit"
        >
          <span>{loading ? "Creating..." : "Create Account"}</span>
          <span className="material-symbols-outlined text-sm">arrow_forward</span>
        </button>
      </form>

      <p className="mt-10 text-center text-sm text-slate-600">
        Already have an account?{" "}
        <Link className="font-bold text-primary hover:underline" to={`/login${window.location.search}`}>
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}
