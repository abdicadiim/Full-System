import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import AuthShell from "../components/AuthShell";
import { getAppDisplayName, getFallbackUrl } from "../lib/appBranding";
import { prepareAuthViewTransition } from "../lib/authViewTransition";
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
  const emailInputRef = useRef<HTMLInputElement | null>(null);
  const codeInputRef = useRef<HTMLInputElement | null>(null);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [loading, setLoading] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [emailMissing, setEmailMissing] = useState(false);
  const [codeInvalid, setCodeInvalid] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const appName = getAppDisplayName();
  const search = window.location.search;
  const isLogoutRedirect = new URLSearchParams(search).get("logout") === "1";
  const fieldWrapClass = "w-full max-w-[460px]";
  const inputClassName =
    "h-14 w-full rounded-2xl border border-slate-200 bg-slate-100/80 px-4 py-0 text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-primary/25 focus:bg-white focus:ring-2 focus:ring-primary/20";
  const app = new URLSearchParams(search).get("app") || "";
  const initialEmail = useMemo(() => new URLSearchParams(search).get("email") || "", [search]);
  const autoSendAttemptedRef = useRef(false);
  const emailMissingMessage = "No account found with this email address.";
  const codeInvalidMessage = "Please enter the 6-digit code sent to your email.";

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

  useEffect(() => {
    const input = emailInputRef.current;
    if (!input) return;

    if (emailMissing) {
      input.setCustomValidity(emailMissingMessage);
      return;
    }

    input.setCustomValidity("");
  }, [emailMissing, emailMissingMessage]);

  const validateEmailExists = async (candidate: string) => {
    const nextEmail = candidate.trim();
    if (!nextEmail) {
      setEmailMissing(false);
      emailInputRef.current?.setCustomValidity("");
      return false;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nextEmail)) {
      setEmailMissing(false);
      emailInputRef.current?.setCustomValidity("");
      return false;
    }

    setCheckingEmail(true);
    try {
      const result = await authApi.checkEmail(nextEmail).catch(() => null);
      if (!result?.success) {
        setEmailMissing(false);
        emailInputRef.current?.setCustomValidity("");
        setError(result?.message || "Unable to verify this email right now.");
        return false;
      }

      const exists = Boolean(result.data?.exists);
      setEmailMissing(!exists);
      emailInputRef.current?.setCustomValidity(exists ? "" : emailMissingMessage);
      return exists;
    } finally {
      setCheckingEmail(false);
    }
  };

  const requestCode = async (emailOverride?: string) => {
    const nextEmail = String(emailOverride ?? email).trim();
    if (!nextEmail) {
      setError("Please enter your email address.");
      return;
    }
    const emailExists = await validateEmailExists(nextEmail);
    if (!emailExists) {
      setError(emailMissingMessage);
      emailInputRef.current?.reportValidity();
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
      setCodeInvalid(true);
      codeInputRef.current?.setCustomValidity(codeInvalidMessage);
      codeInputRef.current?.reportValidity();
      setError("Please enter both your email and OTP.");
      return;
    }
    setCodeInvalid(false);
    codeInputRef.current?.setCustomValidity("");
    setLoading(true);
    setError(null);
    try {
      const result = await authApi.verifyLoginOtp(nextEmail, nextOtp);
      if (!result.success) {
        setCodeInvalid(true);
        codeInputRef.current?.setCustomValidity(codeInvalidMessage);
        codeInputRef.current?.reportValidity();
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
    <AuthShell
      variant="split"
      sidePanel={
        <div className="mx-auto flex h-full w-full max-w-md flex-col items-center justify-center text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-white/85">
            <span className="material-symbols-outlined text-base">verified_user</span>
            Secure Login
          </div>
          <h2 className="whitespace-nowrap text-3xl font-bold tracking-tight sm:text-4xl">{`Welcome to ${appName}`}</h2>
          <p className="mt-5 max-w-sm text-base leading-7 text-white/80">
            Use your email code to access {appName} quickly and securely from the same workspace.
          </p>
          <Link
            className="mt-10 inline-flex min-w-[200px] items-center justify-center rounded-full border border-white/35 px-6 py-3.5 text-sm font-bold text-white transition-colors hover:bg-white/10"
            to={`/signup${window.location.search}`}
            viewTransition
            onClick={() => prepareAuthViewTransition("forward")}
          >
            Create Account
          </Link>
        </div>
      }
    >
      <div className="mb-8">
        <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">Sign In with OTP</h1>
        <p className="mt-4 max-w-md text-sm leading-6 text-slate-500">
          We will send a one-time code to your email for {appName}.
        </p>
      </div>

      <form className="space-y-5" onSubmit={codeSent ? onVerifyCode : onRequestCode}>
        <div className={fieldWrapClass}>
          <label className="mb-2 block text-sm font-semibold text-slate-700">Email Address</label>
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-slate-400">
              <span className="material-symbols-outlined block text-[18px] leading-none">mail</span>
            </span>
            <input
              className={[
                inputClassName,
                "pl-12",
                codeSent ? "cursor-not-allowed bg-slate-100 text-slate-500" : "",
                emailMissing ? "border-red-300 bg-red-50/80 focus:border-red-300 focus:ring-red-200" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              placeholder="info@taban.so"
              type="email"
              value={email}
              ref={emailInputRef}
              aria-invalid={emailMissing}
              aria-describedby={emailMissing ? "otp-email-error" : undefined}
              onChange={(e) => {
                setEmail(e.target.value);
                setEmailMissing(false);
                setCheckingEmail(false);
                setError(null);
                emailInputRef.current?.setCustomValidity("");
              }}
              onBlur={(e) => {
                void validateEmailExists(e.currentTarget.value);
              }}
              readOnly={codeSent}
              disabled={codeSent}
            />
          </div>
          {checkingEmail ? <p className="mt-2 text-xs text-slate-500">Checking email...</p> : null}
          {emailMissing ? (
            <p id="otp-email-error" className="mt-2 text-xs font-medium text-red-600">
              {emailMissingMessage}
            </p>
          ) : null}
        </div>

        {codeSent ? (
          <div className={fieldWrapClass}>
            <label className="mb-2 block text-sm font-semibold text-slate-700">OTP Code</label>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-slate-400">
                <span className="material-symbols-outlined block text-[18px] leading-none">password_2</span>
              </span>
              <input
                className={[
                  inputClassName,
                  "pl-12",
                  codeInvalid ? "border-red-300 bg-red-50/80 focus:border-red-300 focus:ring-red-200" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                placeholder="Enter the 6-digit code"
                inputMode="numeric"
                maxLength={6}
                value={otp}
                ref={codeInputRef}
                aria-invalid={codeInvalid}
                aria-describedby={codeInvalid ? "otp-code-error" : undefined}
                onChange={(e) => {
                  setOtp(e.target.value);
                  setCodeInvalid(false);
                  codeInputRef.current?.setCustomValidity("");
                }}
              />
            </div>
            {codeInvalid ? (
              <p id="otp-code-error" className="mt-2 text-xs font-medium text-red-600">
                {codeInvalidMessage}
              </p>
            ) : null}
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

        <div className={`${fieldWrapClass} flex items-center justify-end`}>
          <Link
            className="inline-flex items-center justify-center px-1 py-2.5 text-sm font-semibold text-blue-600 transition-colors hover:text-blue-700"
            to={`/login${search}`}
            viewTransition
            onClick={() => prepareAuthViewTransition("backward")}
          >
            Back to password sign in
          </Link>
        </div>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <button
          className="mx-auto flex w-full max-w-[220px] items-center justify-center gap-2 rounded-2xl bg-primary px-6 py-4 font-bold text-white shadow-[0_18px_40px_rgba(18,86,99,0.24)] transition-all hover:-translate-y-0.5 hover:bg-primary/90 disabled:transform-none disabled:opacity-60"
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
