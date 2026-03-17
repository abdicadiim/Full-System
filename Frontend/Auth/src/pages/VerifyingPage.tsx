import React, { useEffect } from "react";
import SetupHeader from "../components/SetupHeader";
import { getAppDisplayName, getFallbackUrl } from "../lib/appBranding";
import { goReturnTo } from "../lib/returnTo";

export default function VerifyingPage() {
  const appName = getAppDisplayName();

  useEffect(() => {
    const t = window.setTimeout(() => {
      goReturnTo(getFallbackUrl());
    }, 900);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <div className="min-h-screen w-full bg-white font-display text-slate-900">
      <div className="mx-auto max-w-5xl px-6 py-7">
        <div className="mb-6">
          <SetupHeader />
        </div>

        <div className="mb-8">
          <div className="h-1 w-full rounded-full bg-slate-200">
            <div className="h-1 w-full rounded-full bg-primary" />
          </div>
        </div>

        <div className="mx-auto max-w-xl">
          <h1 className="text-2xl font-bold tracking-tight">{`Verifying your ${appName} setup…`}</h1>
          <p className="mt-2 text-[11px] text-slate-600">Just a moment. We&apos;re getting everything ready.</p>

          <div className="mt-8 flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-primary" />
            <div className="text-sm text-slate-700">Checking your session…</div>
          </div>
        </div>
      </div>
    </div>
  );
}

