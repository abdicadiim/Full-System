import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { FileText } from "lucide-react";
import { useUser } from "../../lib/auth/UserContext";

function DashboardHome() {
  const { user } = useUser();
  const displayName = user?.name || "User";
  const displayEmail = user?.email || "";
  const avatarSrc = String(user?.photoUrl || "").trim();

  return (
    <div className="p-6">
      <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50 text-slate-500">
          {avatarSrc ? <img src={avatarSrc} alt={`${displayName} avatar`} className="h-full w-full object-cover" /> : <FileText size={22} />}
        </div>
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Dashboard</h1>
          <p className="mt-1 text-sm text-slate-700">{displayName}</p>
          {displayEmail ? <p className="text-sm text-slate-500">{displayEmail}</p> : null}
        </div>
      </div>
      <p className="mt-4 text-sm text-slate-600">Welcome back.</p>
    </div>
  );
}

export default function DashboardRoutes() {
  return (
    <Routes>
      <Route index element={<DashboardHome />} />
      <Route path="*" element={<Navigate to="." replace />} />
    </Routes>
  );
}

