import React from "react";
import { Routes, Route, NavLink } from "react-router-dom";

import OverviewPage from "./pages/OverviewPage";
import MetricsPage from "./pages/MetricsPage";
import SubscriptionsPage from "./pages/SubscriptionsPage";
import FinancePage from "./pages/FinancePage";
import ProjectsPage from "./pages/ProjectsPage";

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
  return (
    <Routes>
      <Route index element={<OverviewPage />} />
      <Route path="metrics" element={<MetricsPage />} />
      <Route path="subscriptions" element={<SubscriptionsPage />} />
      <Route path="finance" element={<FinancePage />} />
      <Route path="projects" element={<ProjectsPage />} />
    </Routes>
  );
}
