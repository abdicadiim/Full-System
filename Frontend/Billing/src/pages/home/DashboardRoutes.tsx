import React from "react";
import { Routes, Route, NavLink } from "react-router-dom";

import OverviewPage from "./pages/OverviewPage";
import MetricsPage from "./pages/MetricsPage";
import SubscriptionsPage from "./pages/SubscriptionsPage";
import FinancePage from "./pages/FinancePage";
import ProjectsPage from "./pages/ProjectsPage";
import { usePermissions } from "../../hooks/usePermissions";
import AccessDenied from "../../components/AccessDenied";

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
  const { loading, canView } = usePermissions();
  const canViewProjects = canView("dashboard", "Projects");

  if (loading) {
    return <div className="p-6 text-sm text-slate-500">Loading dashboard permissions...</div>;
  }

  return (
    <Routes>
      <Route index element={<OverviewPage />} />
      <Route path="metrics" element={<MetricsPage />} />
      <Route path="subscriptions" element={<SubscriptionsPage />} />
      <Route path="finance" element={<FinancePage />} />
      <Route
        path="projects"
        element={
          canViewProjects ? (
            <ProjectsPage />
          ) : (
            <AccessDenied
              title="Projects access required"
              message="Your role does not include permission to view the dashboard projects page."
            />
          )
        }
      />
    </Routes>
  );
}
