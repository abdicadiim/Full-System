import React, { useEffect, useState } from "react";
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

type Step = "request" | "verify" | "reset";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [step, setStep] = useState<Step>("request");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const appName = getAppDisplayName();
  const search = window.location.search;
  const isLogoutRedirect = new URLSearchParams(search).get("logout") === "1";
  const app = new URLSearchParams(search).get("app") || "";

  useEffect(() => {
    if (isLogoutRedirect) return;
  }, [isLogoutRedirect]);

  const requestResetCode = async () => {
    const nextEmail = email.trim();
    if (!nextEmail) {
      setError("Please enter your email address.");
      return;
    }
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const result = await authApi.requestPasswordReset(nextEmail, app);
      if (!result.success) {
        setError(result.message || "Unable to send reset code");
        return;
      }

      setStep("verify");
      setMessage(result.message || "Reset code sent to your email.");
    } catch (err: any) {
      setError(err?.message || "Unable to send reset code");
    } finally {
      setLoading(false);
    }
  };

  const verifyResetCode = async () => {
    const nextEmail = email.trim();
    const nextCode = code.trim();
    if (!nextEmail || !nextCode) {
      setError("Please enter your email address and reset code.");
      return;
    }
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const result = await authApi.verifyPasswordResetCode(nextEmail, nextCode);
      if (!result.success) {
        setError(result.message || "Reset code verification failed");
        return;
      }

      setStep("reset");
      setMessage("Code verified. Now set your new password.");
    } catch (err: any) {
      setError(err?.message || "Reset code verification failed");
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async () => {
    const nextEmail = email.trim();
    const nextCode = code.trim();
    if (!nextEmail || !nextCode || !newPassword) {
      setError("Please enter your email, code, and new password.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const result = await authApi.resetPassword(nextEmail, nextCode, newPassword);
      if (!result.success) {
        setError(result.message || "Password reset failed");
        return;
      }
      persistSession(result);
      goReturnTo(getFallbackUrl());
    } catch (err: any) {
      setError(err?.message || "Password reset failed");
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step === "request") await requestResetCode();
    if (step === "verify") await verifyResetCode();
    if (step === "reset") await resetPassword();
  };

  return (
    <AuthShell>
      <div className="mb-8">
        <h2 className="mb-2 text-3xl font-bold text-slate-900">Forgot Password?</h2>
        <p className="text-slate-600">We will send a reset code to the email address for {appName}.</p>
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
            disabled={step !== "request" && step !== "verify"}
          />
        </div>

        {step !== "request" ? (
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">Reset Code</label>
            <input
              className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-primary"
              placeholder="Enter the 6-digit code"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              disabled={step === "reset"}
            />
          </div>
        ) : null}

        {step === "reset" ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">New Password</label>
              <input
                className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-primary"
                placeholder="Enter your new password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Confirm Password</label>
              <input
                className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-primary"
                placeholder="Confirm your new password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          </div>
        ) : null}

        {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <button
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-4 font-bold text-white shadow-[0_10px_25px_rgba(18,86,99,0.20)] transition-all hover:bg-primary/90 disabled:opacity-60"
          disabled={loading}
          type="submit"
        >
          <span>
            {loading
              ? step === "request"
                ? "Sending code..."
                : step === "verify"
                  ? "Verifying code..."
                  : "Resetting..."
              : step === "request"
                ? "Send reset code"
                : step === "verify"
                  ? "Verify code"
                  : "Reset Password"}
          </span>
          <span className="material-symbols-outlined text-sm">arrow_forward</span>
        </button>
      </form>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm">
        {step !== "request" ? (
          <button
            className="font-semibold text-primary hover:underline disabled:cursor-not-allowed disabled:opacity-50"
            disabled={loading}
            onClick={() => {
              setStep("request");
              setCode("");
              setNewPassword("");
              setConfirmPassword("");
              setMessage(null);
              setError(null);
            }}
            type="button"
          >
            Start over
          </button>
        ) : (
          <button
            className="font-semibold text-primary hover:underline disabled:cursor-not-allowed disabled:opacity-50"
            disabled={loading}
            onClick={() => {
              void requestResetCode();
            }}
            type="button"
          >
            Resend code
          </button>
        )}
        <Link className="font-semibold text-slate-600 hover:underline" to={`/login${search}`}>
          Back to sign in
        </Link>
      </div>
    </AuthShell>
  );
}
