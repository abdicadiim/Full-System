import React from "react";
import { getAppDisplayName, getHeroIcon } from "../lib/appBranding";

export default function SetupHeader() {
  const appName = getAppDisplayName();
  const icon = getHeroIcon();

  return (
    <div className="flex items-center gap-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white">
        <span className="material-symbols-outlined text-primary">{icon}</span>
      </div>
      <div className="min-w-0">
        <div className="truncate text-xs font-semibold text-slate-800">BillForward</div>
        <div className="truncate text-[11px] text-slate-500">{appName}</div>
      </div>
    </div>
  );
}

