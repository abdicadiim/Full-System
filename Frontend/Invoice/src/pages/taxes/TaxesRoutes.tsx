import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";

function TaxesHome() {
  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold text-slate-900">Taxes</h1>
      <p className="mt-2 text-sm text-slate-600">This module will be configured next.</p>
    </div>
  );
}

export default function TaxesRoutes() {
  return (
    <Routes>
      <Route index element={<TaxesHome />} />
      <Route path="*" element={<Navigate to="." replace />} />
    </Routes>
  );
}

