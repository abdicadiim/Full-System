import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthShell from "../components/AuthShell";
import { getAppDisplayName } from "../lib/appBranding";
import { prepareAuthViewTransition } from "../lib/authViewTransition";
import { authApi } from "../services/authApi";

const getAuthDraftKey = () => {
  if (typeof window === "undefined") return "full";
  const app = new URLSearchParams(window.location.search).get("app")?.toLowerCase();
  if (app === "billing") return "billing";
  if (app === "invoice") return "invoice";
  return "full";
};

const SIGNUP_DRAFT_KEY = (suffix: string) => `auth:signup:draft:${getAuthDraftKey()}:${suffix}`;

const readDraftValue = (key: string) => {
  if (typeof window === "undefined") return "";
  try {
    return localStorage.getItem(key) || "";
  } catch {
    return "";
  }
};

const readSessionDraftValue = (key: string) => {
  if (typeof window === "undefined") return "";
  try {
    return sessionStorage.getItem(key) || "";
  } catch {
    return "";
  }
};

const writeDraftValue = (key: string, value: string) => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, value);
  } catch {}
};

const writeSessionDraftValue = (key: string, value: string) => {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(key, value);
  } catch {}
};

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

const clearInputValidationMessage = (event: React.FormEvent<HTMLInputElement>) => {
  event.currentTarget.setCustomValidity("");
};

const handleNameInvalid = (event: React.InvalidEvent<HTMLInputElement>) => {
  const input = event.currentTarget;
  if (input.validity.valueMissing) {
    input.setCustomValidity("Please enter your company name.");
    return;
  }
  input.setCustomValidity("");
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

export default function SignupPage() {
  const emailInputRef = useRef<HTMLInputElement | null>(null);
  const [name, setName] = useState(() => readDraftValue(SIGNUP_DRAFT_KEY("name")));
  const [email, setEmail] = useState(() => readDraftValue(SIGNUP_DRAFT_KEY("email")));
  const [password, setPassword] = useState(() => readSessionDraftValue(SIGNUP_DRAFT_KEY("password")));
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [emailExists, setEmailExists] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const appName = getAppDisplayName();
  const navigate = useNavigate();
  const search = window.location.search;
  const draftKey = useMemo(() => SIGNUP_DRAFT_KEY("base"), []);
  const fieldWrapClass = "w-full max-w-[460px]";
  const inputClassName =
    "h-14 w-full rounded-2xl border border-slate-200 bg-slate-100/80 px-4 py-0 text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-primary/25 focus:bg-white focus:ring-2 focus:ring-primary/20";
  const trimmedEmail = email.trim().toLowerCase();
  const emailExistsMessage = "An account with this email already exists. Please log in.";
  const emailIsTaken = emailExists && !checkingEmail;

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

  useEffect(() => {
    writeDraftValue(SIGNUP_DRAFT_KEY("name"), name);
    writeDraftValue(SIGNUP_DRAFT_KEY("email"), email);
    writeSessionDraftValue(SIGNUP_DRAFT_KEY("password"), password);
  }, [draftKey, email, name, password]);

  useEffect(() => {
    const input = emailInputRef.current;
    if (!input) return;

    if (emailExists) {
      input.setCustomValidity(emailExistsMessage);
      return;
    }

    input.setCustomValidity("");
  }, [emailExists, emailExistsMessage]);

  const validateEmailAvailability = async (candidate: string) => {
    const nextEmail = candidate.trim().toLowerCase();
    if (!nextEmail) {
      setEmailExists(false);
      return false;
    }

    const existsResult = await authApi.checkEmail(nextEmail).catch(() => null);
    const exists = Boolean(existsResult?.success && existsResult.data?.exists);
    setEmailExists(exists);
    emailInputRef.current?.setCustomValidity(exists ? emailExistsMessage : "");
    return exists;
  };

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    if (!e.currentTarget.reportValidity()) {
      return;
    }

    const nextName = name.trim();
    if (!nextName) {
      setError("Please enter your company name.");
      return;
    }
    if (!password.trim()) {
      setError("Please enter your password.");
      return;
    }

    setLoading(true);

    const nextEmail = trimmedEmail;
    const emailTaken = await validateEmailAvailability(nextEmail);
    if (emailTaken) {
      setLoading(false);
      setError(emailExistsMessage);
      emailInputRef.current?.reportValidity();
      return;
    }

    try {
      sessionStorage.setItem("orgName", nextName);
    } catch {}

    const result = await authApi.signup(nextName, nextEmail, password).catch(() => null);
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
    navigate(`/org-setup${search}`, {
      state: { orgName: nextName, intent: "signup" },
    });
  };

  return (
    <AuthShell
      variant="split"
      panelSide="left"
      sidePanel={
        <div className="mx-auto flex h-full w-full max-w-md flex-col items-center justify-center text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-white/85">
            <span className="material-symbols-outlined text-base">shield_person</span>
            Secure Signup
          </div>
          <h2 className="whitespace-nowrap text-3xl font-bold tracking-tight sm:text-4xl">Welcome Back</h2>
          <p className="mt-5 max-w-sm text-base leading-7 text-white/80">
            Enter your personal details to continue with {appName} and manage everything in one place.
          </p>
          <Link
            className="mt-10 inline-flex min-w-[200px] items-center justify-center rounded-full border border-white/35 px-6 py-3.5 text-sm font-bold text-white transition-colors hover:bg-white/10"
            to={`/login${search}`}
            viewTransition
            onClick={() => prepareAuthViewTransition("backward")}
          >
            Sign In
          </Link>
        </div>
      }
    >
      <div className="mb-8">
        <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">Create Account</h1>
        <p className="mt-4 max-w-md text-sm leading-6 text-slate-500">
          Use your email and password to create your workspace.
        </p>
      </div>

      <form className="space-y-5" onSubmit={onSubmit}>
        <div className={fieldWrapClass}>
          <label className="mb-2 block text-sm font-semibold text-slate-700">Company Name</label>
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-slate-400">
              <span className="material-symbols-outlined block text-[18px] leading-none">business</span>
            </span>
            <input
              className={`${inputClassName} pl-12`}
              placeholder="Taban Enterprise"
              required
              autoComplete="organization"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError(null);
              }}
              onInput={clearInputValidationMessage}
              onInvalid={handleNameInvalid}
            />
          </div>
        </div>

        <div className={fieldWrapClass}>
          <label className="mb-2 block text-sm font-semibold text-slate-700" htmlFor="signup-email">
            Email Address
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-slate-400">
              <span className="material-symbols-outlined block text-[18px] leading-none">mail</span>
            </span>
            <input
              className={[
                inputClassName,
                "pl-12",
                emailExists ? "border-red-300 bg-red-50/80 focus:border-red-300 focus:ring-red-200" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              placeholder="info@taban.so"
              type="email"
              required
              autoComplete="email"
              inputMode="email"
              id="signup-email"
              aria-invalid={emailIsTaken}
              aria-describedby={emailIsTaken ? "signup-email-error" : "signup-email-help"}
              value={email}
              ref={emailInputRef}
              onChange={(e) => {
                setEmail(e.target.value);
                setError(null);
                setEmailExists(false);
                emailInputRef.current?.setCustomValidity("");
              }}
              onInput={clearInputValidationMessage}
              onBlur={(e) => {
                void validateEmailAvailability(e.currentTarget.value);
              }}
              onInvalid={handleEmailInvalid}
            />
          </div>
          {checkingEmail ? <p className="mt-2 text-xs text-slate-500">Checking email...</p> : null}
          {emailIsTaken ? (
            <p id="signup-email-error" className="mt-2 text-xs font-medium text-red-600">
              {emailExistsMessage}{" "}
              <Link className="font-semibold underline" to={`/login${search}`}>
                Log in
              </Link>
            </p>
          ) : (
            <p id="signup-email-help" className="mt-2 text-xs text-slate-500">
              We'll let you know if this email is already in use.
            </p>
          )}
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
              autoComplete="new-password"
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

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <button
          className="mx-auto flex w-full max-w-[220px] items-center justify-center gap-2 rounded-2xl bg-primary px-6 py-4 font-bold text-white shadow-[0_18px_40px_rgba(18,86,99,0.24)] transition-all hover:-translate-y-0.5 hover:bg-primary/90 disabled:transform-none disabled:opacity-60"
          disabled={loading || checkingEmail || emailExists}
          type="submit"
        >
          <span>{loading ? "Creating..." : "Sign Up"}</span>
          <span className="material-symbols-outlined text-sm">arrow_forward</span>
        </button>
      </form>
    </AuthShell>
  );
}

