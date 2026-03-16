import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";

function OrgsHome() {
  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold text-slate-900">Organizations</h1>
      <p className="mt-2 text-sm text-slate-600">This module will be configured next.</p>
    </div>
  );
}

export default function OrgsRoutes() {
  return (
    <Routes>
      <Route index element={<OrgsHome />} />
      <Route path="*" element={<Navigate to="." replace />} />
    </Routes>
  );
}

