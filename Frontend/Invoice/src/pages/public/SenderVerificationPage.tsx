import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { CheckCircle2, Clock3, RefreshCw, XCircle } from "lucide-react";
import toast from "react-hot-toast";
import { senderEmailsAPI } from "../../services/api";

type InvitationData = {
  id: string;
  name: string;
  email: string;
  organizationName: string;
  isVerified: boolean;
  verificationState: string;
  verificationSentAt?: string | null;
  otpExpiresAt?: string | null;
  invitationAcceptedAt?: string | null;
};

const formatSeconds = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
};

export default function SenderVerificationPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const senderId = params.get("senderId") || "";
  const token = params.get("token") || "";

  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [step, setStep] = useState<"invite" | "otp" | "verified" | "rejected" | "expired">("invite");
  const [otpExpiresAt, setOtpExpiresAt] = useState<number | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(90);

  useEffect(() => {
    let alive = true;

    const loadInvitation = async () => {
      if (!senderId || !token) {
        setError("Missing invitation details.");
        setLoading(false);
        return;
      }

      try {
        const response = await senderEmailsAPI.getInvitation(senderId, token);
        if (!alive) return;
        if (!response?.success) {
          setError(response?.message || "Invitation not found.");
          setStep("expired");
          return;
        }
        const data = response.data as InvitationData;
        setInvitation(data);
        if (data.isVerified || data.verificationState === "verified") {
          setStep("verified");
        } else if (data.verificationState === "rejected") {
          setStep("rejected");
        } else if (data.verificationState === "accepted" && data.otpExpiresAt) {
          setStep("otp");
          setOtpExpiresAt(new Date(data.otpExpiresAt).getTime());
        } else {
          setStep("invite");
        }
      } catch (err: any) {
        if (!alive) return;
        setError(err?.message || "Failed to load invitation.");
        setStep("expired");
      } finally {
        if (alive) setLoading(false);
      }
    };

    loadInvitation();
    return () => {
      alive = false;
    };
  }, [senderId, token]);

  useEffect(() => {
    if (step !== "otp" || !otpExpiresAt) return;
    const tick = () => {
      const remaining = Math.max(0, Math.ceil((otpExpiresAt - Date.now()) / 1000));
      setSecondsLeft(remaining);
      if (remaining <= 0) {
        setStep("otp");
      }
    };
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [step, otpExpiresAt]);

  const handleAccept = async () => {
    if (!senderId || !token) return;
    setProcessing(true);
    setError("");
    try {
      const response = await senderEmailsAPI.acceptInvitation(senderId, token);
      if (!response?.success) {
        setError(response?.message || "Failed to accept invitation.");
        return;
      }
      const nextExpiresAt = response?.data?.otpExpiresAt ? new Date(response.data.otpExpiresAt).getTime() : Date.now() + 90_000;
      setOtpExpiresAt(nextExpiresAt);
      setSecondsLeft(Math.max(0, Math.ceil((nextExpiresAt - Date.now()) / 1000)));
      setStep("otp");
      toast.success("OTP sent to your email.");
    } catch (err: any) {
      setError(err?.message || "Failed to accept invitation.");
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!senderId || !token) return;
    setProcessing(true);
    setError("");
    try {
      const response = await senderEmailsAPI.rejectInvitation(senderId, token);
      if (!response?.success) {
        setError(response?.message || "Failed to reject invitation.");
        return;
      }
      setStep("rejected");
      toast.success("Invitation rejected.");
    } catch (err: any) {
      setError(err?.message || "Failed to reject invitation.");
    } finally {
      setProcessing(false);
    }
  };

  const handleVerify = async () => {
    if (!senderId || !token || !otp.trim()) {
      setError("Enter the OTP code.");
      return;
    }
    setProcessing(true);
    setError("");
    try {
      const response = await senderEmailsAPI.verifyInvitationOtp(senderId, token, otp.trim());
      if (!response?.success) {
        setError(response?.message || "Invalid OTP.");
        return;
      }
      setStep("verified");
      toast.success("Sender verified successfully.");
    } catch (err: any) {
      setError(err?.message || "Invalid OTP.");
    } finally {
      setProcessing(false);
    }
  };

  const handleResendOtp = async () => {
    if (!senderId || !token) return;
    setProcessing(true);
    setError("");
    try {
      const response = await senderEmailsAPI.resendInvitationOtp(senderId, token);
      if (!response?.success) {
        setError(response?.message || "Failed to resend OTP.");
        return;
      }
      const nextExpiresAt = response?.data?.otpExpiresAt ? new Date(response.data.otpExpiresAt).getTime() : Date.now() + 90_000;
      setOtpExpiresAt(nextExpiresAt);
      setSecondsLeft(Math.max(0, Math.ceil((nextExpiresAt - Date.now()) / 1000)));
      setOtp("");
      toast.success("New OTP sent.");
    } catch (err: any) {
      setError(err?.message || "Failed to resend OTP.");
    } finally {
      setProcessing(false);
    }
  };

  const backToSettings = () => navigate("/settings/customization/email-notifications?senderVerified=1");

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-sm">
          <div className="flex items-center gap-3 text-slate-700">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700" />
            Loading invitation...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8fbfd_0%,#eff6f7_100%)] px-4 py-10">
      <div className="mx-auto w-full max-w-3xl">
        <div className="mb-6 flex items-center justify-end">
          <div className="text-right">
            <div className="text-sm text-slate-500">Sender Invitation</div>
            <div className="text-xl font-semibold text-slate-900">{invitation?.organizationName || "Organization"}</div>
          </div>
        </div>

        <div className="rounded-[28px] border border-slate-200 bg-white shadow-[0_28px_80px_rgba(15,23,42,0.08)] overflow-hidden">
          <div className="border-b border-slate-200 bg-white px-8 py-7">
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
              {step === "verified"
                ? "Sender Verified"
                : step === "rejected"
                  ? "Invitation Rejected"
                  : "Verify Sender Email"}
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              {invitation?.name || invitation?.email || "Sender"} {invitation?.organizationName ? `from ${invitation.organizationName}` : ""}
            </p>
          </div>

          <div className="px-8 py-8">
            {error && (
              <div className="mb-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {error}
              </div>
            )}

            {step === "invite" && (
              <div className="space-y-6">
                <p className="max-w-2xl text-base leading-7 text-slate-700">
                  You have been invited by the admin of <span className="font-semibold">{invitation?.organizationName || "this organization"}</span>{" "}
                  to verify <span className="font-semibold">{invitation?.email || "your sender email"}</span>. Click below to either accept or reject the invitation.
                </p>

                <div className="flex flex-wrap gap-3">
                  <button
                    disabled={processing}
                    onClick={handleAccept}
                    className="rounded-xl bg-[#156372] px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-[#0f4e5a] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Accept Invitation
                  </button>
                  <button
                    disabled={processing}
                    onClick={handleReject}
                    className="rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Reject Invitation
                  </button>
                </div>

                <div className="text-sm italic text-slate-500">This invitation will expire in 25 days.</div>
              </div>
            )}

            {step === "otp" && (
              <div className="space-y-6">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
                  <div className="mb-2 text-sm font-medium text-slate-600">Enter the 6-digit OTP sent to</div>
                  <div className="text-lg font-semibold text-slate-900">{invitation?.email}</div>
                  <div className="mt-2 text-sm text-slate-500">
                    Expires in{" "}
                    <span className={secondsLeft <= 15 ? "font-semibold text-rose-600" : "font-semibold text-slate-700"}>
                      {formatSeconds(secondsLeft)}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">OTP Code</label>
                  <input
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    inputMode="numeric"
                    maxLength={6}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-lg tracking-[0.35em] text-slate-900 outline-none focus:border-[#156372] focus:ring-4 focus:ring-[#156372]/10"
                    placeholder="______"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    disabled={processing}
                    onClick={handleVerify}
                    className="rounded-xl bg-[#156372] px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-[#0f4e5a] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Verify OTP
                  </button>
                  <button
                    disabled={processing || secondsLeft > 0}
                    onClick={handleResendOtp}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <RefreshCw size={16} />
                    Resend OTP
                  </button>
                  {secondsLeft > 0 && (
                    <div className="inline-flex items-center gap-2 text-sm text-slate-500">
                      <Clock3 size={15} />
                      Resend available in {secondsLeft}s
                    </div>
                  )}
                </div>
              </div>
            )}

            {step === "verified" && (
              <div className="space-y-5">
                <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
                  <CheckCircle2 className="mt-0.5 text-emerald-600" size={24} />
                  <div>
                    <div className="text-base font-semibold text-emerald-900">Sender email verified successfully.</div>
                    <div className="mt-1 text-sm text-emerald-800">
                      {invitation?.email} is now verified and can be marked as primary in Email Settings.
                    </div>
                  </div>
                </div>
                <button
                  onClick={backToSettings}
                  className="rounded-xl bg-[#3aa775] px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-[#2e8c62]"
                >
                  Back to Email Settings
                </button>
              </div>
            )}

            {step === "rejected" && (
              <div className="space-y-5">
                <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-5">
                  <XCircle className="mt-0.5 text-amber-600" size={24} />
                  <div>
                    <div className="text-base font-semibold text-amber-900">Invitation rejected.</div>
                    <div className="mt-1 text-sm text-amber-800">
                      {invitation?.email} will remain unverified until a new invitation is sent.
                    </div>
                  </div>
                </div>
                <button
                  onClick={backToSettings}
                  className="rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Back to Email Settings
                </button>
              </div>
            )}

            {step === "expired" && (
              <div className="space-y-4">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-700">
                  {error || "This invitation link is invalid or expired."}
                </div>
                <button
                  onClick={backToSettings}
                  className="rounded-xl bg-[#156372] px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-[#0f4e5a]"
                >
                  Back to Email Settings
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
