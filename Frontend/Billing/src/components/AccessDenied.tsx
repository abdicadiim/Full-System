import React from "react";
import { ArrowLeft, ShieldAlert } from "lucide-react";

type AccessDeniedProps = {
  title?: string;
  message?: string;
};

export default function AccessDenied({
  title = "Access denied",
  message = "You do not have permission to view this page.",
}: AccessDeniedProps) {
  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      window.history.back();
    }
  };

  return (
    <div className="min-h-[calc(100vh-100px)] flex items-center justify-center p-6">
      <div className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-red-200 bg-white shadow-[0_18px_60px_rgba(239,68,68,0.12)]">
        <div className="h-1 w-full bg-gradient-to-r from-red-500 via-rose-500 to-orange-400" />
        <div className="relative p-8 sm:p-10">
          <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-red-50 blur-2xl" aria-hidden />
          <div className="absolute -bottom-12 -left-12 h-36 w-36 rounded-full bg-rose-50 blur-2xl" aria-hidden />

          <div className="relative flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-600 ring-1 ring-red-100">
                <ShieldAlert size={30} />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-red-500">Permission required</p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-900">{title}</h2>
                <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600">{message}</p>
                <p className="mt-3 text-sm text-slate-500">
                  If you think this is a mistake, ask your administrator to update the role permissions.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleBack}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:border-red-200 hover:text-red-600"
              >
                <ArrowLeft size={16} />
                Go back
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
