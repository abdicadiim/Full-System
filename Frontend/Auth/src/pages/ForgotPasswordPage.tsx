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

const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());

type Step = "request" | "verify" | "reset";

export default function ForgotPasswordPage() {
  const emailInputRef = useRef<HTMLInputElement | null>(null);
  const codeInputRef = useRef<HTMLInputElement | null>(null);
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
  const [emailInvalid, setEmailInvalid] = useState(false);
  const [codeInvalid, setCodeInvalid] = useState(false);
  const [newPasswordInvalid, setNewPasswordInvalid] = useState(false);
  const [confirmPasswordInvalid, setConfirmPasswordInvalid] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const appName = getAppDisplayName();
  const search = window.location.search;
  const searchParams = useMemo(() => new URLSearchParams(search), [search]);
  const isLogoutRedirect = searchParams.get("logout") === "1";
  const app = searchParams.get("app") || "";
  const isInvitationFlow = searchParams.get("invite") === "1";
  const fieldWrapClass = "w-full max-w-[460px]";
  const inputClassName =
    "h-14 w-full rounded-2xl border border-slate-200 bg-slate-100/80 px-4 py-0 text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-primary/25 focus:bg-white focus:ring-2 focus:ring-primary/20";
  const invalidInputClass = "border-red-300 bg-red-50/80 focus:border-red-300 focus:ring-red-200";
  const fieldErrorClass = "mt-2 text-xs font-medium text-red-600";
  const codeInvalidMessage = isInvitationFlow ? "Please enter the verification code." : "Please enter the reset code.";
  const passwordMismatchMessage = "Passwords do not match.";
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
    const input = emailInputRef.current;
    if (!input) return;

    if (emailInvalid) {
      input.setCustomValidity("No account found with this email address.");
      return;
    }

    input.setCustomValidity("");
  }, [emailInvalid]);

  useEffect(() => {
    if (!isInvitationFlow || !initialName || fullName) return;
    setFullName(initialName);
  }, [fullName, initialName, isInvitationFlow]);

  useEffect(() => {
    if (!isInvitationFlow || !initialPhotoUrl || photoUrl) return;
    setPhotoUrl(initialPhotoUrl);
  }, [initialPhotoUrl, isInvitationFlow, photoUrl]);

  const handleEmailChange = (value: string) => {
    setEmail(value);
    if (step !== "request" && codeSent) {
      setCode("");
      setCodeSent(false);
      setRemainingSeconds(0);
      setStep("request");
      setError(null);
    }
  };

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
      setEmailInvalid(true);
      emailInputRef.current?.setCustomValidity("Please enter your email address.");
      emailInputRef.current?.reportValidity();
      return;
    }
    if (!isValidEmail(nextEmail)) {
      setError("Please enter a valid email address.");
      setEmailInvalid(true);
      emailInputRef.current?.setCustomValidity("Please enter a valid email address.");
      emailInputRef.current?.reportValidity();
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await authApi.requestPasswordReset(nextEmail, app);
      if (!result.success) {
        setEmailInvalid(true);
        emailInputRef.current?.setCustomValidity(result.message || "No account found with this email address.");
        emailInputRef.current?.reportValidity();
        setError(result.message || "Unable to send reset code");
        return;
      }

      setEmailInvalid(false);
      emailInputRef.current?.setCustomValidity("");
      setCodeInvalid(false);
      setNewPasswordInvalid(false);
      setConfirmPasswordInvalid(false);
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
      setCodeInvalid(true);
      codeInputRef.current?.setCustomValidity(codeInvalidMessage);
      codeInputRef.current?.reportValidity();
      setError("Please enter your email address and reset code.");
      return;
    }
    if (!isValidEmail(nextEmail)) {
      setError("Please enter a valid email address.");
      return;
    }
    setCodeInvalid(false);
    codeInputRef.current?.setCustomValidity("");
    setLoading(true);
    setError(null);
    try {
      const result = await authApi.verifyPasswordResetCode(nextEmail, nextCode);
      if (!result.success) {
        setCodeInvalid(true);
        codeInputRef.current?.setCustomValidity(codeInvalidMessage);
        codeInputRef.current?.reportValidity();
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
      if (!newPassword) {
        setNewPasswordInvalid(true);
      }
      setError("Please enter your email, code, and new password.");
      return;
    }
    if (!isValidEmail(nextEmail)) {
      setError("Please enter a valid email address.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(passwordMismatchMessage);
      setConfirmPasswordInvalid(true);
      return;
    }
    if (!newPassword) {
      setError("Please enter a new password.");
      return;
    }
    setNewPasswordInvalid(false);
    setConfirmPasswordInvalid(false);
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
    <AuthShell
      variant="split"
      sidePanel={
        <div className="mx-auto flex h-full w-full max-w-md flex-col items-center justify-center text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-white/85">
            <span className="material-symbols-outlined text-base">
              {isInvitationFlow ? "person_add" : "verified_user"}
            </span>
            {isInvitationFlow ? "Invitation Access" : "Secure Recovery"}
          </div>
          <h2 className="whitespace-nowrap text-3xl font-bold tracking-tight sm:text-4xl">{`Welcome to ${appName}`}</h2>
          <p className="mt-5 max-w-sm text-base leading-7 text-white/80">
            {isInvitationFlow
              ? `Complete your ${appName} setup securely and get back into the same workspace experience.`
              : `Reset your password securely and continue using ${appName} from the same workspace.`}
          </p>
          <Link
            className="mt-10 inline-flex min-w-[200px] items-center justify-center rounded-full border border-white/35 px-6 py-3.5 text-sm font-bold text-white transition-colors hover:bg-white/10"
            to={`/login${loginSearch}`}
            viewTransition
            onClick={() => prepareAuthViewTransition("backward")}
          >
            Sign In
          </Link>
        </div>
      }
    >
      <div className="mb-8">
        <h2 className="mb-2 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
          {isInvitationFlow ? "Complete Invitation" : "Forgot Password?"}
        </h2>
        <p className="mt-4 max-w-md text-sm leading-6 text-slate-500">
          {isInvitationFlow
            ? `Set up your ${appName} account by verifying your email and choosing a password.`
            : `We will send a reset code to the email address for ${appName}.`}
        </p>
      </div>

      <form className="space-y-5" onSubmit={onSubmit}>
        {isInvitationFlow ? (
          <div className={`${fieldWrapClass} rounded-2xl border border-slate-200 bg-white p-5`}>
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
                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-slate-400">
                    <span className="material-symbols-outlined block text-[18px] leading-none">badge</span>
                  </span>
                  <input
                    className={`${inputClassName} pl-12`}
                    placeholder="Your full name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>
        ) : null}

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
                step !== "request" ? "cursor-not-allowed bg-slate-100 text-slate-500" : "",
                emailInvalid ? invalidInputClass : "",
              ]
                .filter(Boolean)
                .join(" ")}
              placeholder="info@taban.so"
              type="email"
              value={email}
              ref={emailInputRef}
              aria-invalid={emailInvalid}
              aria-describedby={emailInvalid ? "forgot-email-error" : undefined}
              onChange={(e) => handleEmailChange(e.target.value)}
              onInput={() => {
                setEmailInvalid(false);
                emailInputRef.current?.setCustomValidity("");
              }}
              readOnly={step !== "request"}
              disabled={step !== "request"}
            />
          </div>
          {emailInvalid ? (
            <p id="forgot-email-error" className={fieldErrorClass}>
              No account found with this email address.
            </p>
          ) : null}
        </div>

        {step === "verify" ? (
          <div className={fieldWrapClass}>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              {isInvitationFlow ? "Verification Code" : "Reset Code"}
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-slate-400">
                <span className="material-symbols-outlined block text-[18px] leading-none">password_2</span>
              </span>
              <input
                className={[
                  inputClassName,
                  "pl-12",
                  codeInvalid ? invalidInputClass : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                placeholder="Enter the 6-digit code"
                inputMode="numeric"
                maxLength={6}
                value={code}
                ref={codeInputRef}
                aria-invalid={codeInvalid}
                aria-describedby={codeInvalid ? "forgot-code-error" : undefined}
                onChange={(e) => {
                  setCode(e.target.value);
                  setCodeInvalid(false);
                  codeInputRef.current?.setCustomValidity("");
                }}
              />
            </div>
            {codeInvalid ? (
              <p id="forgot-code-error" className={fieldErrorClass}>
                {codeInvalidMessage}
              </p>
            ) : null}
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
          <div className={`${fieldWrapClass} grid grid-cols-1 gap-4`}>
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">New Password</label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-slate-400">
                  <span className="material-symbols-outlined block text-[18px] leading-none">lock</span>
                </span>
                <input
                  className={[
                    inputClassName,
                    "pl-12 pr-12",
                    newPasswordInvalid ? invalidInputClass : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  placeholder="Enter your new password"
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    setNewPasswordInvalid(false);
                    setConfirmPasswordInvalid(false);
                  }}
                />
                <button
                  aria-label={showNewPassword ? "Hide new password" : "Show new password"}
                  className="absolute inset-y-0 right-3 flex items-center rounded-full p-1.5 text-slate-500 transition-colors hover:bg-slate-200/70 hover:text-slate-700"
                  onClick={() => setShowNewPassword((current) => !current)}
                  type="button"
                >
                  <span className="material-symbols-outlined block text-[20px] leading-none">
                    {showNewPassword ? "visibility_off" : "visibility"}
                  </span>
                </button>
              </div>
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Confirm Password</label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-slate-400">
                  <span className="material-symbols-outlined block text-[18px] leading-none">lock_reset</span>
                </span>
                <input
                  className={[
                    inputClassName,
                    "pl-12 pr-12",
                    confirmPasswordInvalid ? invalidInputClass : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  placeholder="Confirm your new password"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  aria-invalid={confirmPasswordInvalid}
                  aria-describedby={confirmPasswordInvalid ? "confirm-password-error" : undefined}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setConfirmPasswordInvalid(false);
                  }}
                />
                <button
                  aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                  className="absolute inset-y-0 right-3 flex items-center rounded-full p-1.5 text-slate-500 transition-colors hover:bg-slate-200/70 hover:text-slate-700"
                  onClick={() => setShowConfirmPassword((current) => !current)}
                  type="button"
                >
                  <span className="material-symbols-outlined block text-[20px] leading-none">
                    {showConfirmPassword ? "visibility_off" : "visibility"}
                  </span>
                </button>
              </div>
              {confirmPasswordInvalid ? (
                <p id="confirm-password-error" className={fieldErrorClass}>
                  {passwordMismatchMessage}
                </p>
              ) : null}
            </div>
          </div>
        ) : null}

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <button
          className="mx-auto flex w-full max-w-[220px] items-center justify-center gap-2 rounded-2xl bg-primary py-4 font-bold text-white shadow-[0_10px_25px_rgba(18,86,99,0.20)] transition-all hover:bg-primary/90 disabled:opacity-60"
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
    </AuthShell>
  );
}
