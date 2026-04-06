import React, { Suspense, lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

const RecurringInvoices = lazy(() => import("./RecurringInvoices"));
const NewRecurringInvoice = lazy(() => import("./NewRecurringInvoice/NewRecurringInvoice"));
const ImportRecurringInvoices = lazy(() => import("./ImportRecurringInvoices/ImportRecurringInvoices"));
const RecurringInvoiceDetail = lazy(() => import("./RecurringInvoiceDetail/RecurringInvoiceDetail"));

export default function RecurringInvoicesRoutes() {
  return (
    <Suspense fallback={null}>
      <Routes>
        <Route index element={<RecurringInvoices />} />
        <Route path="new" element={<NewRecurringInvoice />} />
        <Route path="import" element={<ImportRecurringInvoices />} />
        <Route path=":id/edit" element={<NewRecurringInvoice />} />
        <Route path=":id" element={<RecurringInvoiceDetail />} />
        <Route path="*" element={<Navigate to="." replace />} />
      </Routes>
    </Suspense>
  );
}

