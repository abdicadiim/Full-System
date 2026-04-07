import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import AuthShell from "../components/AuthShell";
import { getAppDisplayName, getFallbackUrl } from "../lib/appBranding";
import { prepareAuthViewTransition } from "../lib/authViewTransition";
import { goReturnTo } from "../lib/returnTo";
import { setSessionBridgeToken } from "../lib/sessionBridge";
import { authApi, type ApiFailure, type VerificationRequirement } from "../services/authApi";

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

const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
const maskEmail = (value: string) => {
  const [localPart, domainPart] = String(value || "").trim().split("@");
  if (!localPart || !domainPart) return value;
  if (localPart.length <= 1) return `${localPart}*@${domainPart}`;
  if (localPart.length === 2) return `${localPart.charAt(0)}*@${domainPart}`;
  return `${localPart.charAt(0)}${"*".repeat(Math.max(1, localPart.length - 2))}${localPart.charAt(localPart.length - 1)}@${domainPart}`;
};

type VerifyIntent = "login" | "signup";

export default function VerifyEmailPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const search = window.location.search;
  const searchParams = useMemo(() => new URLSearchParams(search), [search]);
  const state = (location.state as { orgName?: string; intent?: VerifyIntent } | null) || null;
  const initialEmail = searchParams.get("email") || "";
  const app = searchParams.get("app") || "";
  const intent: VerifyIntent =
    state?.intent === "signup" || searchParams.get("intent") === "signup" ? "signup" : "login";
  const isSignupVerification = intent === "signup";
  const baseSearch = useMemo(() => {
    const params = new URLSearchParams(search);
    params.delete("email");
    params.delete("intent");
    params.delete("logout");
    const query = params.toString();
    return query ? `?${query}` : "";
  }, [search]);
  const appName = getAppDisplayName();
  const fieldWrapClass = "w-full max-w-[460px]";
  const inputClassName =
    "h-14 w-full rounded-2xl border border-slate-200 bg-slate-100/80 px-4 py-0 text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-primary/25 focus:bg-white focus:ring-2 focus:ring-primary/20";
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const autoSendAttemptedRef = useRef(false);
  const hasPresetEmail = Boolean(initialEmail.trim());
  const showSignupCodeOnly = isSignupVerification;
  const showCodeField = showSignupCodeOnly || codeSent || hasPresetEmail;
  const maskedEmail = maskEmail(email.trim().toLowerCase());

  useEffect(() => {
    if (initialEmail && !email) {
      setEmail(initialEmail);
    }
  }, [email, initialEmail]);

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
    if (!initialEmail) return;
    if (autoSendAttemptedRef.current) return;
    autoSendAttemptedRef.current = true;
    setEmail(initialEmail);
    void requestCode(initialEmail, { silentNotice: isSignupVerification });
  }, [initialEmail, isSignupVerification]);

  const requestCode = async (emailOverride?: string, options?: { silentNotice?: boolean }) => {
    const nextEmail = String(emailOverride ?? email).trim().toLowerCase();
    if (!nextEmail) {
      setError("Please enter your email address.");
      return;
    }
    if (!isValidEmail(nextEmail)) {
      setError("Please enter a valid email address.");
      return;
    }

    setLoading(true);
    setError(null);
    setNotice(null);
    try {
      const result = await authApi.requestEmailVerification(nextEmail, app);
      if (!result.success) {
        setError(result.message || "Unable to send verification code");
        return;
      }
      if (result.data?.alreadyVerified) {
        setCodeSent(false);
        setRemainingSeconds(0);
        setNotice(options?.silentNotice ? null : "This email is already verified. You can sign in now.");
        return;
      }

      setEmail(nextEmail);
      setCode("");
      setCodeSent(true);
      setRemainingSeconds(Math.max(0, Number(result.data?.expiresInSeconds ?? 300)));
      setNotice(options?.silentNotice ? null : `We sent a verification code to ${nextEmail}.`);
    } catch (err: any) {
      setError(err?.message || "Unable to send verification code");
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async () => {
    const nextEmail = email.trim().toLowerCase();
    const nextCode = code.trim();
    if (!nextEmail || !nextCode) {
      setError("Please enter your email and verification code.");
      return;
    }
    if (!isValidEmail(nextEmail)) {
      setError("Please enter a valid email address.");
      return;
    }

    setLoading(true);
    setError(null);
    setNotice(null);
    try {
      const result = await authApi.verifyEmailVerification(nextEmail, nextCode);
      if (!result.success) {
        const failure = result as ApiFailure<VerificationRequirement>;
        if (failure.data?.alreadyVerified) {
          setNotice("This email is already verified. Please sign in.");
          return;
        }
        setError(failure.message || "Verification failed");
        return;
      }

      persistSession(result);
      if (intent === "signup" && state?.orgName) {
        navigate(`/org-setup${baseSearch}`, {
          replace: true,
          state: { orgName: state?.orgName },
        });
        return;
      }

      goReturnTo(getFallbackUrl());
    } catch (err: any) {
      setError(err?.message || "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (codeSent) {
      await verifyCode();
      return;
    }
    await requestCode();
  };

  if (isSignupVerification) {
    return (
      <div className="min-h-screen w-full bg-[linear-gradient(135deg,#e8f2f3_0%,#f6f8f8_45%,#ecf6f6_100%)] font-display text-slate-900">
        <div className="flex min-h-screen items-center justify-center px-4 py-6 sm:px-6 lg:px-10">
          <div className="w-full max-w-2xl rounded-[32px] border border-white/70 bg-white/95 px-8 py-10 shadow-[0_24px_70px_rgba(18,86,99,0.16)] backdrop-blur sm:px-10 sm:py-12">
            <div className="mx-auto w-full max-w-[460px]">
              <div className="mb-8 text-center">
                <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">Verify Email</h1>
                <p className="mt-4 text-sm leading-6 text-slate-500">Enter the verification code sent to your organization email.</p>
                <p className="mt-4 text-sm font-semibold tracking-[0.08em] text-slate-700">{maskedEmail}</p>
              </div>

              <form className="space-y-5" onSubmit={onSubmit}>
                <div className={fieldWrapClass}>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">Verification Code</label>
                  <div className="relative">
                    <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-slate-400">
                      <span className="material-symbols-outlined block text-[18px] leading-none">password_2</span>
                    </span>
                    <input
                      className={`${inputClassName} pl-12`}
                      placeholder="Enter the 6-digit code"
                      inputMode="numeric"
                      maxLength={6}
                      value={code}
                      onChange={(event) => {
                        setCode(event.target.value);
                        setError(null);
                      }}
                    />
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-3 text-sm font-medium">
                    <p className={codeSent ? (remainingSeconds > 0 ? "text-slate-500" : "text-rose-600") : "text-slate-500"}>
                      {codeSent
                        ? remainingSeconds > 0
                          ? `Code expires in ${Math.floor(remainingSeconds / 60)
                              .toString()
                              .padStart(2, "0")}:${(remainingSeconds % 60).toString().padStart(2, "0")}`
                          : "Code expired. Please resend the code."
                        : loading
                          ? "Sending verification code..."
                          : "Use resend if you did not receive the code."}
                    </p>
                    <button
                      className="font-semibold text-primary hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={loading}
                      onClick={() => {
                        autoSendAttemptedRef.current = true;
                        void requestCode(undefined, { silentNotice: true });
                      }}
                      type="button"
                    >
                      Resend code
                    </button>
                  </div>
                </div>

                {error ? <p className="text-sm text-red-600">{error}</p> : null}

                <button
                  className="mx-auto flex w-full max-w-[220px] items-center justify-center gap-2 rounded-2xl bg-primary px-6 py-4 font-bold text-white shadow-[0_18px_40px_rgba(18,86,99,0.24)] transition-all hover:-translate-y-0.5 hover:bg-primary/90 disabled:transform-none disabled:opacity-60"
                  disabled={loading || !codeSent}
                  type="submit"
                >
                  <span>{loading && codeSent ? "Verifying..." : "Verify email"}</span>
                  <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AuthShell
      variant="split"
      sidePanel={
        <div className="mx-auto flex h-full w-full max-w-md flex-col items-center justify-center text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-white/85">
            <span className="material-symbols-outlined text-base">mark_email_read</span>
            Secure Verification
          </div>
          <h2 className="whitespace-nowrap text-3xl font-bold tracking-tight sm:text-4xl">{`Welcome to ${appName}`}</h2>
          <p className="mt-5 max-w-sm text-base leading-7 text-white/80">
            Verify your email to continue signing in to {appName} securely.
          </p>
          <Link
            className="mt-10 inline-flex min-w-[200px] items-center justify-center rounded-full border border-white/35 px-6 py-3.5 text-sm font-bold text-white transition-colors hover:bg-white/10"
            to={`/login${baseSearch}`}
            viewTransition
            onClick={() => prepareAuthViewTransition("backward")}
          >
            Sign In
          </Link>
        </div>
      }
    >
      <div className="mb-8">
        <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">Verify Email</h1>
        <p className="mt-4 max-w-md text-sm leading-6 text-slate-500">
          {`Please verify your email before continuing to ${appName}.`}
        </p>
      </div>

      <form className="space-y-5" onSubmit={onSubmit}>
        <div className={fieldWrapClass}>
          <label className="mb-2 block text-sm font-semibold text-slate-700">Email Address</label>
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-slate-400">
              <span className="material-symbols-outlined block text-[18px] leading-none">mail</span>
            </span>
            <input
              className={`${inputClassName} pl-12 ${showCodeField ? "cursor-not-allowed bg-slate-100 text-slate-500" : ""}`}
              placeholder="info@taban.so"
              type="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setError(null);
                setNotice(null);
              }}
              readOnly={showCodeField}
              disabled={showCodeField}
            />
          </div>
        </div>

        {showCodeField ? (
          <div className={fieldWrapClass}>
            <label className="mb-2 block text-sm font-semibold text-slate-700">Verification Code</label>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-slate-400">
                <span className="material-symbols-outlined block text-[18px] leading-none">password_2</span>
              </span>
              <input
                className={`${inputClassName} pl-12`}
                placeholder="Enter the 6-digit code"
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(event) => {
                  setCode(event.target.value);
                  setError(null);
                }}
              />
            </div>
            <div className="mt-2 flex items-center justify-between gap-3 text-sm font-medium">
              <p className={codeSent ? (remainingSeconds > 0 ? "text-slate-500" : "text-rose-600") : "text-slate-500"}>
                {codeSent
                  ? remainingSeconds > 0
                    ? `Code expires in ${Math.floor(remainingSeconds / 60)
                        .toString()
                        .padStart(2, "0")}:${(remainingSeconds % 60).toString().padStart(2, "0")}`
                    : "Code expired. Please resend the code."
                  : loading
                    ? "Sending verification code..."
                    : "Use resend if you did not receive the code."}
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

        {notice ? <p className="text-sm text-slate-500">{notice}</p> : null}
        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <button
          className="mx-auto flex w-full max-w-[220px] items-center justify-center gap-2 rounded-2xl bg-primary px-6 py-4 font-bold text-white shadow-[0_18px_40px_rgba(18,86,99,0.24)] transition-all hover:-translate-y-0.5 hover:bg-primary/90 disabled:transform-none disabled:opacity-60"
          disabled={loading || (showCodeField && !codeSent)}
          type="submit"
        >
          <span>
            {loading && codeSent
              ? "Verifying..."
              : showCodeField
                ? "Verify email"
                : "Send code"}
          </span>
          <span className="material-symbols-outlined text-sm">arrow_forward</span>
        </button>
      </form>
    </AuthShell>
  );
}
