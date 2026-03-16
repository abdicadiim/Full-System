import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";

function RetainerInvoicesHome() {
  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold text-slate-900">Retainer Invoices</h1>
      <p className="mt-2 text-sm text-slate-600">This module will be configured next.</p>
    </div>
  );
}

export default function RetainerInvoiceRoutes() {
  return (
    <Routes>
      <Route index element={<RetainerInvoicesHome />} />
      <Route path="*" element={<Navigate to="." replace />} />
    </Routes>
  );
}

