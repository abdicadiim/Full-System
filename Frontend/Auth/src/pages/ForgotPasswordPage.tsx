import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import AuthShell from "../components/AuthShell";
import { getAppDisplayName, getFallbackUrl } from "../lib/appBranding";
import { goReturnTo } from "../lib/returnTo";
import { setSessionBridgeToken } from "../lib/sessionBridge";
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

type Step = "request" | "verify" | "reset";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [step, setStep] = useState<Step>("request");
  const [codeSent, setCodeSent] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const appName = getAppDisplayName();
  const search = window.location.search;
  const searchParams = useMemo(() => new URLSearchParams(search), [search]);
  const isLogoutRedirect = searchParams.get("logout") === "1";
  const app = searchParams.get("app") || "";
  const isInvitationFlow = searchParams.get("invite") === "1";
  const initialEmail = useMemo(() => searchParams.get("email") || "", [searchParams]);
  const initialName = useMemo(() => searchParams.get("name") || "", [searchParams]);
  const initialPhotoUrl = useMemo(() => searchParams.get("photoUrl") || "", [searchParams]);
  const [fullName, setFullName] = useState(initialName);
  const [photoUrl, setPhotoUrl] = useState(initialPhotoUrl);
  const loginSearch = useMemo(() => {
    const params = new URLSearchParams(search);
    params.delete("invite");
    params.delete("email");
    params.delete("name");
    params.delete("photoUrl");
    const query = params.toString();
    return query ? `?${query}` : "";
  }, [search]);

  useEffect(() => {
    if (isLogoutRedirect) return;
    if (initialEmail && !email) {
      setEmail(initialEmail);
    }
  }, [isLogoutRedirect, initialEmail, email]);

  useEffect(() => {
    if (!isInvitationFlow || !initialName || fullName) return;
    setFullName(initialName);
  }, [fullName, initialName, isInvitationFlow]);

  useEffect(() => {
    if (!isInvitationFlow || !initialPhotoUrl || photoUrl) return;
    setPhotoUrl(initialPhotoUrl);
  }, [initialPhotoUrl, isInvitationFlow, photoUrl]);

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

  const requestResetCode = async () => {
    const nextEmail = email.trim();
    if (!nextEmail) {
      setError("Please enter your email address.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await authApi.requestPasswordReset(nextEmail, app);
      if (!result.success) {
        setError(result.message || "Unable to send reset code");
        return;
      }

      setCode("");
      setNewPassword("");
      setConfirmPassword("");
      setCodeSent(true);
      setRemainingSeconds(Math.max(0, Number(result.data?.expiresInSeconds ?? 90)));
      setStep("verify");
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
    try {
      const result = await authApi.verifyPasswordResetCode(nextEmail, nextCode);
      if (!result.success) {
        setError(result.message || "Reset code verification failed");
        return;
      }

      setError(null);
      setStep("reset");
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
    try {
      const result = await authApi.resetPassword(
        nextEmail,
        nextCode,
        newPassword,
        isInvitationFlow ? fullName.trim() : undefined
      );
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
        <h2 className="mb-2 text-3xl font-bold text-slate-900">
          {isInvitationFlow ? "Complete Invitation" : "Forgot Password?"}
        </h2>
        <p className="text-slate-600">
          {isInvitationFlow
            ? `Set up your ${appName} account by verifying your email and choosing a password.`
            : `We will send a reset code to the email address for ${appName}.`}
        </p>
      </div>

      <form className="space-y-5" onSubmit={onSubmit}>
        {isInvitationFlow ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-start gap-4">
              {photoUrl ? (
                <img
                  alt={fullName || "Invited user"}
                  className="h-14 w-14 rounded-full border border-slate-200 object-cover"
                  src={photoUrl}
                />
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-lg font-bold text-slate-500">
                  {(fullName || email || "I").trim().charAt(0).toUpperCase()}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <label className="mb-2 block text-sm font-semibold text-slate-700">Full Name</label>
                <input
                  className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-primary"
                  placeholder="Your full name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>
            </div>
          </div>
        ) : null}

        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">Email Address</label>
          <input
            className={`w-full rounded-lg border border-slate-200 px-4 py-3 text-slate-900 outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-primary ${
              isInvitationFlow ? "bg-slate-50" : "bg-white"
            }`}
            placeholder="name@company.com"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            readOnly={isInvitationFlow}
            disabled={step !== "request" && step !== "verify"}
          />
        </div>

        {step === "verify" ? (
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              {isInvitationFlow ? "Verification Code" : "Reset Code"}
            </label>
            <input
              className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-primary"
              placeholder="Enter the 6-digit code"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
            {codeSent && step === "verify" ? (
              <div className="mt-2 flex items-center justify-between gap-3 text-sm font-medium">
                <p className={remainingSeconds > 0 ? "text-slate-500" : "text-rose-600"}>
                  {remainingSeconds > 0
                    ? `Code expires in ${Math.floor(remainingSeconds / 60)
                        .toString()
                        .padStart(2, "0")}:${(remainingSeconds % 60).toString().padStart(2, "0")}`
                    : "Code expired. Please resend the code."}
                </p>
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
              </div>
            ) : null}
          </div>
        ) : null}

        {step === "reset" ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">New Password</label>
              <div className="relative">
                <input
                  className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 pr-12 text-slate-900 outline-none transition-all placeholder:text-xs placeholder:font-medium focus:border-transparent focus:ring-2 focus:ring-primary"
                  placeholder="Enter your new password"
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
                <button
                  aria-label={showNewPassword ? "Hide new password" : "Show new password"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-500 transition-colors hover:text-slate-700"
                  onClick={() => setShowNewPassword((current) => !current)}
                  type="button"
                >
                  <span className="material-symbols-outlined text-[20px]">
                    {showNewPassword ? "visibility_off" : "visibility"}
                  </span>
                </button>
              </div>
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Confirm Password</label>
              <div className="relative">
                <input
                  className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 pr-12 text-slate-900 outline-none transition-all placeholder:text-xs placeholder:font-medium focus:border-transparent focus:ring-2 focus:ring-primary"
                  placeholder="Confirm your new password"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
                <button
                  aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-500 transition-colors hover:text-slate-700"
                  onClick={() => setShowConfirmPassword((current) => !current)}
                  type="button"
                >
                  <span className="material-symbols-outlined text-[20px]">
                    {showConfirmPassword ? "visibility_off" : "visibility"}
                  </span>
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <button
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-4 font-bold text-white shadow-[0_10px_25px_rgba(18,86,99,0.20)] transition-all hover:bg-primary/90 disabled:opacity-60"
          disabled={loading}
          type="submit"
        >
          <span>
            {loading
              ? step === "request"
                ? isInvitationFlow
                  ? "Sending code..."
                  : "Sending code..."
                : step === "verify"
                  ? "Verifying code..."
                  : "Resetting..."
              : step === "request"
                ? isInvitationFlow
                  ? "Send code"
                  : "Send reset code"
                : step === "verify"
                  ? "Verify code"
                  : isInvitationFlow
                    ? "Set Password"
                    : "Reset Password"}
          </span>
          <span className="material-symbols-outlined text-sm">arrow_forward</span>
        </button>
      </form>

      <div className="mt-5 flex flex-wrap items-center justify-end gap-3 text-sm">
        <Link className="font-semibold text-slate-600 hover:underline" to={`/login${loginSearch}`}>
          Back to sign in
        </Link>
      </div>

    </AuthShell>
  );
}
