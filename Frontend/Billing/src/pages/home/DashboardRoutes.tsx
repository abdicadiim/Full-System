import React from "react";
import { Routes, Route, Navigate, NavLink } from "react-router-dom";

import OverviewPage from "./pages/OverviewPage";
import { usePermissions } from "../../hooks/usePermissions";

const Tab = ({ to, children }) => (
  <NavLink
    to={to}
    end
    className={({ isActive }) =>
      `rounded-full px-3 py-1.5 text-[12px] transition ${
        isActive
          ? "bg-slate-900 text-white"
          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
      }`
    }
  >
    {children}
  </NavLink>
);

export default function DashboardRoutes() {
  const { loading } = usePermissions();

  if (loading) {
    return <div className="p-6 text-sm text-slate-500">Loading dashboard permissions...</div>;
  }

  return (
    <Routes>
      <Route index element={<OverviewPage />} />
      <Route path="metrics" element={<Navigate to="/dashboard" replace />} />
      <Route path="subscriptions" element={<Navigate to="/dashboard" replace />} />
      <Route path="finance" element={<Navigate to="/dashboard" replace />} />
      <Route path="projects" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
