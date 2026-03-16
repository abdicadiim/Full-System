import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import RecurringInvoices from "./RecurringInvoices";
import NewRecurringInvoice from "./NewRecurringInvoice/NewRecurringInvoice";
import ImportRecurringInvoices from "./ImportRecurringInvoices/ImportRecurringInvoices";
import RecurringInvoiceDetail from "./RecurringInvoiceDetail/RecurringInvoiceDetail";

export default function RecurringInvoicesRoutes() {
  return (
    <Routes>
      <Route index element={<RecurringInvoices />} />
      <Route path="new" element={<NewRecurringInvoice />} />
      <Route path="import" element={<ImportRecurringInvoices />} />
      <Route path=":id/edit" element={<NewRecurringInvoice />} />
      <Route path=":id" element={<RecurringInvoiceDetail />} />
      <Route path="*" element={<Navigate to="." replace />} />
    </Routes>
  );
}

