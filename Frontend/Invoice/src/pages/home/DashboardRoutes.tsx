import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";

function DashboardHome() {
  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold text-slate-900">Dashboard</h1>
      <p className="mt-2 text-sm text-slate-600">Welcome back.</p>
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

