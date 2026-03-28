import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import AuthShell from "../components/AuthShell";
import { getAppDisplayName, getFallbackUrl } from "../lib/appBranding";
import { goReturnTo } from "../lib/returnTo";
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

const getAutoSendKey = (app: string, email: string) => `auth:otp:auto-sent:${app.trim().toLowerCase()}:${email.trim().toLowerCase()}`;

const hasAutoSentOtp = (app: string, email: string) => {
  if (typeof window === "undefined") return false;
  return window.sessionStorage.getItem(getAutoSendKey(app, email)) === "1";
};

const markAutoSentOtp = (app: string, email: string) => {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(getAutoSendKey(app, email), "1");
};

export default function EmailOtpLoginPage() {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const appName = getAppDisplayName();
  const search = window.location.search;
  const isLogoutRedirect = new URLSearchParams(search).get("logout") === "1";
  const app = new URLSearchParams(search).get("app") || "";
  const initialEmail = useMemo(() => new URLSearchParams(search).get("email") || "", [search]);
  const autoSendAttemptedRef = useRef(false);

  useEffect(() => {
    if (isLogoutRedirect) return;
    if (initialEmail && !email) {
      setEmail(initialEmail);
    }
  }, [isLogoutRedirect, initialEmail, email]);

  useEffect(() => {
    autoSendAttemptedRef.current = false;
  }, [initialEmail]);

  useEffect(() => {
    if (!codeSent || remainingSeconds <= 0) return;

    const interval = window.setInterval(() => {
      setRemainingSeconds((current) => {
        if (current <= 1) {
          window.clearInterval(interval);
          return 0;
        }
        return current - 1;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [codeSent, remainingSeconds]);

  useEffect(() => {
    if (isLogoutRedirect) return;
    if (!initialEmail) return;
    if (autoSendAttemptedRef.current) return;
    if (hasAutoSentOtp(app, initialEmail)) return;
    autoSendAttemptedRef.current = true;
    setEmail(initialEmail);
    void requestCode(initialEmail);
  }, [app, isLogoutRedirect, initialEmail]);

  const requestCode = async (emailOverride?: string) => {
    const nextEmail = String(emailOverride ?? email).trim();
    if (!nextEmail) {
      setError("Please enter your email address.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await authApi.requestLoginOtp(nextEmail, app);
      if (!result.success) {
        setError(result.message || "Unable to send OTP");
        return;
      }

      setRemainingSeconds(Math.max(0, Number(result.data?.expiresInSeconds ?? 90)));
      setCodeSent(true);
      setOtp("");
      markAutoSentOtp(app, nextEmail);
    } catch (err: any) {
      setError(err?.message || "Unable to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async () => {
    const nextEmail = email.trim();
    const nextOtp = otp.trim();
    if (!nextEmail || !nextOtp) {
      setError("Please enter both your email and OTP.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await authApi.verifyLoginOtp(nextEmail, nextOtp);
      if (!result.success) {
        setError(result.message || "OTP verification failed");
        return;
      }
      persistSession(result);
      goReturnTo(getFallbackUrl());
    } catch (err: any) {
      setError(err?.message || "OTP verification failed");
    } finally {
      setLoading(false);
    }
  };

  const onRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    await requestCode();
  };

  const onVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    await verifyCode();
  };

  return (
    <AuthShell>
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h2 className="mb-2 text-3xl font-bold text-slate-900">Sign in using email OTP</h2>
          <p className="text-slate-600">We will send a one-time code to your email for {appName}.</p>
        </div>
        <Link className="mt-2 shrink-0 text-sm font-semibold text-slate-600 hover:underline" to={`/login${search}`}>
          Back to password sign in
        </Link>
      </div>

      <form className="space-y-5" onSubmit={codeSent ? onVerifyCode : onRequestCode}>
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

        {codeSent ? (
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">OTP Code</label>
            <input
              className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-primary"
              placeholder="Enter the 6-digit code"
              inputMode="numeric"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
            />
            <div className="mt-2 flex items-center justify-between gap-3 text-sm font-medium">
              <p className={remainingSeconds > 0 ? "text-slate-500" : "text-rose-600"}>
                {remainingSeconds > 0
                  ? `OTP expires in ${Math.floor(remainingSeconds / 60)
                      .toString()
                      .padStart(2, "0")}:${(remainingSeconds % 60).toString().padStart(2, "0")}`
                  : "OTP expired. Please resend the code."}
              </p>
              <button
                className="font-semibold text-primary hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                disabled={loading}
                onClick={() => {
                  autoSendAttemptedRef.current = true;
                  void requestCode();
                }}
                type="button"
              >
                Resend code
              </button>
            </div>
          </div>
        ) : null}
        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <button
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-4 font-bold text-white shadow-[0_10px_25px_rgba(18,86,99,0.20)] transition-all hover:bg-primary/90 disabled:opacity-60"
          disabled={loading}
          type="submit"
        >
          <span>{loading ? (codeSent ? "Verifying..." : "Sending code...") : codeSent ? "Sign in" : "Send code"}</span>
          <span className="material-symbols-outlined text-sm">arrow_forward</span>
        </button>
      </form>

    </AuthShell>
  );
}
