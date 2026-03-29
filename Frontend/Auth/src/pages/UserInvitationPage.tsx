import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getAppDisplayName } from "../lib/appBranding";
import { authApi } from "../services/authApi";

type InvitationData = {
  id: string;
  name: string;
  email: string;
  organizationName: string;
  role?: string;
  status?: string;
};

export default function UserInvitationPage() {
  const search = window.location.search;
  const params = useMemo(() => new URLSearchParams(search), [search]);
  const userId = params.get("userId") || "";
  const token = params.get("token") || "";
  const app = (params.get("app") || "").trim().toLowerCase();
  const appName = getAppDisplayName();

  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [error, setError] = useState("");
  const [step, setStep] = useState<"invite" | "accepted" | "rejected" | "expired">("invite");

  useEffect(() => {
    let alive = true;

    const loadInvitation = async () => {
      if (!userId || !token) {
        setError("Missing invitation details.");
        setStep("expired");
        setLoading(false);
        return;
      }

      try {
        const response = await authApi.getUserInvitation(userId, token);
        if (!alive) return;
        if (!response.success) {
          setError(response.message || "Invitation not found.");
          setStep("expired");
          return;
        }
        setInvitation(response.data as InvitationData);
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
  }, [token, userId]);

  const redirectToSetup = (data: InvitationData | null) => {
    const next = new URL("/forgot-password", window.location.origin);
    next.searchParams.set("invite", "1");
    if (app) next.searchParams.set("app", app);
    next.searchParams.set("email", data?.email || invitation?.email || "");
    next.searchParams.set("name", data?.name || invitation?.name || "");
    window.location.replace(next.toString());
  };

  const handleAccept = async () => {
    if (!userId || !token) return;
    setProcessing(true);
    setError("");
    try {
      const response = await authApi.acceptUserInvitation(userId, token);
      if (!response.success) {
        setError(response.message || "Failed to accept invitation.");
        return;
      }
      setInvitation(response.data as InvitationData);
      setStep("accepted");
      redirectToSetup(response.data as InvitationData);
    } catch (err: any) {
      setError(err?.message || "Failed to accept invitation.");
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!userId || !token) return;
    setProcessing(true);
    setError("");
    try {
      const response = await authApi.rejectUserInvitation(userId, token);
      if (!response.success) {
        setError(response.message || "Failed to reject invitation.");
        return;
      }
      setStep("rejected");
    } catch (err: any) {
      setError(err?.message || "Failed to reject invitation.");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-white px-4 py-10 font-display text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-2xl flex-col items-center pt-2 sm:pt-6">
        <div className="w-full max-w-xl rounded-2xl bg-white p-6 sm:p-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-3xl font-black tracking-tight text-slate-900 sm:text-[2.2rem]">
                {step === "rejected" ? "Invitation Rejected" : `Invitation to join ${invitation?.organizationName || appName}`}
              </h2>
              <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
                {step === "rejected"
                  ? "You have declined the invitation."
                  : "Review the invitation below, then choose whether to continue or decline."}
              </p>
            </div>

            {step === "invite" ? (
              <Link
                className="hidden rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 sm:inline-flex"
                to={`/login${app ? `?app=${app}` : ""}`}
              >
                Back to sign in
              </Link>
            ) : null}
          </div>

          <div className="mt-8">
            {loading ? (
              <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-slate-700">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700" />
                Loading invitation...
              </div>
            ) : (
              <div className="space-y-5">
                {error ? <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}

                {step !== "rejected" ? (
                  <div className="rounded-2xl bg-white p-5">
                    <div className="text-sm font-medium text-slate-500">Invited user</div>
                    <div className="mt-1 text-lg font-semibold text-slate-900">{invitation?.name || "Invitation recipient"}</div>
                    <div className="mt-1 text-sm text-slate-600">{invitation?.email || "Email not loaded"}</div>
                    <div className="mt-4 text-sm text-slate-600">
                      You were invited by <span className="font-semibold text-slate-900">{invitation?.organizationName || "your organization"}</span>.
                    </div>
                    <div className="mt-2 text-sm text-slate-500">
                      Your name can be adjusted during account setup, but the email address stays locked.
                    </div>
                  </div>
                ) : null}

                {step === "invite" ? (
                  <div className="flex flex-wrap gap-3">
                    <button
                      disabled={processing}
                      onClick={handleAccept}
                      className="inline-flex items-center justify-center rounded-lg bg-primary px-5 py-3 font-semibold text-white shadow-[0_10px_25px_rgba(18,86,99,0.20)] transition-all hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                      type="button"
                    >
                      Accept Invitation
                    </button>
                    <button
                      disabled={processing}
                      onClick={handleReject}
                      className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-5 py-3 font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                      type="button"
                    >
                      Reject Invitation
                    </button>
                  </div>
                ) : null}

                {step === "rejected" ? (
                  <div className="flex flex-wrap gap-3">
                    <Link
                      className="inline-flex items-center justify-center rounded-lg bg-primary px-5 py-3 font-semibold text-white shadow-[0_10px_25px_rgba(18,86,99,0.20)] transition-all hover:bg-primary/90"
                      to={`/login${app ? `?app=${app}` : ""}`}
                    >
                      Back to sign in
                    </Link>
                  </div>
                ) : null}

                {step === "invite" ? (
                  <div className="sm:hidden">
                    <Link
                      className="inline-flex rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                      to={`/login${app ? `?app=${app}` : ""}`}
                    >
                      Back to sign in
                    </Link>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
