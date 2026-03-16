import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

/* ...your other Sales imports... */
import InvoiceDetail from "./Invoices/InvoiceDetail/InvoiceDetail";

export default function SalesRoutes() {
  return (
    <Routes>
      {/* keep existing sales routes */}
      {/* e.g. <Route index element={<Navigate to="invoices" replace />} /> */}

      {/* Invoice detail page */}
      <Route path="invoices/:invoiceId" element={<InvoiceDetail />} />
    </Routes>
  );
}
