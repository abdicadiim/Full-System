import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthShell from "../components/AuthShell";
import { getAppDisplayName } from "../lib/appBranding";
import { prepareAuthViewTransition } from "../lib/authViewTransition";
import { clearSessionBridgeToken, setSessionBridgeToken } from "../lib/sessionBridge";
import { authApi, type ApiFailure, type VerificationRequirement } from "../services/authApi";
import { clearOrganizationSelectionCache, orgApi, writeOrganizationSelectionCache } from "../services/orgApi";

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

const prefetchOrganizationSelection = async () => {
  try {
    const result = await orgApi.list();
    if (result?.success && Array.isArray(result.organizations)) {
      writeOrganizationSelectionCache(result.organizations);
    } else {
      clearOrganizationSelectionCache();
    }
  } catch {
    // Ignore prefetch errors; the org select page will retry.
  }
};

const clearInputValidationMessage = (event: React.FormEvent<HTMLInputElement>) => {
  event.currentTarget.setCustomValidity("");
};

const handleEmailInvalid = (event: React.InvalidEvent<HTMLInputElement>) => {
  const input = event.currentTarget;
  if (input.validity.valueMissing) {
    input.setCustomValidity("Please enter your email address.");
    return;
  }
  if (input.validity.typeMismatch) {
    input.setCustomValidity("Please enter a valid email address.");
    return;
  }
  input.setCustomValidity("");
};

const handlePasswordInvalid = (event: React.InvalidEvent<HTMLInputElement>) => {
  const input = event.currentTarget;
  if (input.validity.valueMissing) {
    input.setCustomValidity("Please enter your password.");
    return;
  }
  input.setCustomValidity("");
};

export default function LoginPage() {
  const emailInputRef = useRef<HTMLInputElement | null>(null);
  const passwordInputRef = useRef<HTMLInputElement | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [emailMissing, setEmailMissing] = useState(false);
  const [passwordInvalid, setPasswordInvalid] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const appName = getAppDisplayName();
  const navigate = useNavigate();
  const search = window.location.search;
  const isLogoutRedirect = new URLSearchParams(search).get("logout") === "1";
  const fieldWrapClass = "w-full max-w-[460px]";
  const inputClassName =
    "h-14 w-full rounded-2xl border border-slate-200 bg-slate-100/80 px-4 py-0 text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-primary/25 focus:bg-white focus:ring-2 focus:ring-primary/20";
  const invalidInputClass = "border-red-300 bg-red-50/80 focus:border-red-300 focus:ring-red-200";
  const fieldErrorClass = "mt-2 text-xs font-medium text-red-600";
  const trimmedEmail = email.trim();
  const emailMissingMessage = "No account found with this email address.";
  const passwordMismatchMessage = "Email or password is incorrect.";
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
  const buildVerifyEmailPath = (emailValue: string) => {
    const params = new URLSearchParams(search);
    params.delete("logout");
    params.set("email", emailValue);
    params.set("intent", "login");
    const query = params.toString();
    return `/verify-email${query ? `?${query}` : ""}`;
  };

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
    clearOrganizationSelectionCache();
  };

  useEffect(() => {
    if (isLogoutRedirect) {
      clearStoredSession();
    }
  }, [isLogoutRedirect]);

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

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    if (!e.currentTarget.reportValidity()) {
      return;
    }
    const nextEmail = email.trim();
    const nextPassword = password;
    if (!nextPassword.trim()) {
      setError("Please enter your password.");
      return;
    }

    const emailExists = await validateEmailExists(nextEmail);
    if (!emailExists) {
      setLoading(false);
      setError(emailMissingMessage);
      emailInputRef.current?.reportValidity();
      return;
    }

    setLoading(true);
    try {
      const result = await authApi.login(nextEmail, nextPassword);
      if (!result || !result.success) {
        const failure = result && !result.success ? (result as ApiFailure<VerificationRequirement>) : null;
        if (failure?.data?.requiresEmailVerification) {
          navigate(buildVerifyEmailPath(failure.data.email || nextEmail), {
            state: { intent: "login" },
          });
          return;
        }

        const emailNotFound =
          failure?.code === 404 || /email address not found/i.test(String(failure?.message || ""));

        if (emailNotFound) {
          setEmailMissing(true);
          emailInputRef.current?.setCustomValidity(emailMissingMessage);
          emailInputRef.current?.reportValidity();
          setError(emailMissingMessage);
          return;
        }

        const failureMessage = String(failure?.message || "");
        const badCredentials =
          failure?.code === 401 ||
          /incorrect password/i.test(failureMessage) ||
          /invalid username or password/i.test(failureMessage) ||
          /invalid credentials/i.test(failureMessage) ||
          (!failure?.code &&
            !/email address not found/i.test(failureMessage) &&
            !/verify your email/i.test(failureMessage) &&
            !/inactive/i.test(failureMessage));

        if (badCredentials) {
          setPasswordInvalid(true);
          passwordInputRef.current?.setCustomValidity(passwordMismatchMessage);
          passwordInputRef.current?.reportValidity();
          setError(passwordMismatchMessage);
        } else {
          setError(failure?.message || "Login failed");
        }
      } else {
        persistSession(result);
        void prefetchOrganizationSelection();
        navigate(`/org-select${search}`, { replace: true });
      }
    } catch (err: any) {
      setError(err?.message || "An error occurred during login");
    } finally {
      setLoading(false);
    }
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
          <p className="mt-5 max-w-xs text-base leading-7 text-white/80">
            Create your account to start using {appName} with the same secure workspace and tools.
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
        <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">Sign In</h1>
        <p className="mt-4 max-w-md text-sm leading-6 text-slate-500">
          Use your email and password to continue to your workspace.
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
              className={[
                inputClassName,
                "pl-12",
                emailMissing ? invalidInputClass : "",
              ]
                .filter(Boolean)
                .join(" ")}
              placeholder="info@taban.so"
              type="email"
              required
              autoComplete="email"
              inputMode="email"
              ref={emailInputRef}
              aria-invalid={emailMissing}
              aria-describedby={emailMissing ? "login-email-error" : undefined}
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError(null);
                setEmailMissing(false);
                setCheckingEmail(false);
                emailInputRef.current?.setCustomValidity("");
              }}
              onInput={clearInputValidationMessage}
              onBlur={(e) => {
                void validateEmailExists(e.currentTarget.value);
              }}
              onInvalid={handleEmailInvalid}
            />
          </div>
          {checkingEmail ? <p className="mt-2 text-xs text-slate-500">Checking email...</p> : null}
          {emailMissing ? (
            <p id="login-email-error" className={fieldErrorClass}>
              {emailMissingMessage}
            </p>
          ) : null}
        </div>
        <div className={fieldWrapClass}>
          <label className="mb-2 block text-sm font-semibold text-slate-700">Password</label>
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-slate-400">
              <span className="material-symbols-outlined block text-[18px] leading-none">lock</span>
            </span>
            <input
              className={[
                inputClassName,
                "pl-12 pr-12",
                passwordInvalid ? invalidInputClass : "",
              ]
                .filter(Boolean)
                .join(" ")}
              placeholder="Enter your password"
              type={showPassword ? "text" : "password"}
              required
              autoComplete="current-password"
              aria-invalid={passwordInvalid}
              aria-describedby={passwordInvalid ? "login-password-error" : undefined}
              value={password}
              ref={passwordInputRef}
              onChange={(e) => {
                setPassword(e.target.value);
                setError(null);
                setPasswordInvalid(false);
                passwordInputRef.current?.setCustomValidity("");
              }}
              onInput={clearInputValidationMessage}
              onInvalid={handlePasswordInvalid}
            />
            <button
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute inset-y-0 right-3 flex items-center rounded-full p-1.5 text-slate-500 transition-colors hover:bg-slate-200/70 hover:text-slate-700"
              onClick={() => setShowPassword((current) => !current)}
              type="button"
            >
              <span className="material-symbols-outlined block text-[20px] leading-none">
                {showPassword ? "visibility_off" : "visibility"}
              </span>
            </button>
          </div>
          {passwordInvalid ? (
            <p id="login-password-error" className={fieldErrorClass}>
              {passwordMismatchMessage}
            </p>
          ) : null}
        </div>

        <div className={`${fieldWrapClass} flex flex-col gap-3 pt-1 text-sm sm:flex-row sm:items-center sm:justify-between sm:pr-1`}>
          <Link
            className="inline-flex items-center justify-center px-1 py-2.5 font-semibold text-blue-600 transition-colors hover:text-blue-700"
            to={`/login/email-otp${otpQuery}`}
          >
            Sign in using email OTP
          </Link>
          <Link
            className="inline-flex items-center justify-center px-1 py-2.5 font-semibold text-blue-600 transition-colors hover:text-blue-700"
            to={`/forgot-password${forgotPasswordQuery}`}
          >
            Forgot Password?
          </Link>
        </div>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <button
          className="mx-auto flex w-full max-w-[220px] items-center justify-center gap-2 rounded-2xl bg-primary px-6 py-4 font-bold text-white shadow-[0_18px_40px_rgba(18,86,99,0.24)] transition-all hover:-translate-y-0.5 hover:bg-primary/90 disabled:transform-none disabled:opacity-60"
          disabled={loading}
          type="submit"
        >
          <span>{loading ? "Signing in..." : "Sign in"}</span>
          <span className="material-symbols-outlined text-sm">arrow_forward</span>
        </button>
      </form>

    </AuthShell>
  );
}
