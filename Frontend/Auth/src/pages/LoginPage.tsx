import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthShell from "../components/AuthShell";
import { getAppDisplayName, getFallbackUrl } from "../lib/appBranding";
import { prepareAuthViewTransition } from "../lib/authViewTransition";
import { goReturnTo } from "../lib/returnTo";
import { clearSessionBridgeToken, setSessionBridgeToken } from "../lib/sessionBridge";
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
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const appName = getAppDisplayName();
  const navigate = useNavigate();
  const search = window.location.search;
  const isLogoutRedirect = new URLSearchParams(search).get("logout") === "1";
  const fieldWrapClass = "w-full max-w-[460px]";
  const inputClassName =
    "h-14 w-full rounded-2xl border border-slate-200 bg-slate-100/80 px-4 py-0 text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-primary/25 focus:bg-white focus:ring-2 focus:ring-primary/20";
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
  };

  useEffect(() => {
    if (isLogoutRedirect) {
      clearStoredSession();
    }
  }, [isLogoutRedirect]);

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
              className={`${inputClassName} pl-12`}
              placeholder="name@company.com"
              type="email"
              required
              autoComplete="email"
              inputMode="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError(null);
              }}
              onInput={clearInputValidationMessage}
              onInvalid={handleEmailInvalid}
            />
          </div>
        </div>
        <div className={fieldWrapClass}>
          <label className="mb-2 block text-sm font-semibold text-slate-700">Password</label>
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-slate-400">
              <span className="material-symbols-outlined block text-[18px] leading-none">lock</span>
            </span>
            <input
              className={`${inputClassName} pl-12 pr-12`}
              placeholder="Enter your password"
              type={showPassword ? "text" : "password"}
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError(null);
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
