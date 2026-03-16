import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import Invoices from "./Invoices";
import NewInvoice from "./NewInvoice/NewInvoice";
import NewRetailInvoice from "../RetainerInvoice/NewRetailInvoice/NewRetailInvoice";
import ImportInvoices from "./ImportInvoices/ImportInvoices";
import InvoiceDetail from "./InvoiceDetail/InvoiceDetail";
import SendInvoiceEmail from "./SendInvoiceEmail/SendInvoiceEmail";

export default function InvoicesRoutes() {
  return (
    <Routes>
      <Route index element={<Invoices />} />
      <Route path="new" element={<NewInvoice />} />
      <Route path="new-retail" element={<NewRetailInvoice />} />
      <Route path="import" element={<ImportInvoices />} />
      <Route path="custom-view/new" element={<Invoices />} />
      <Route path=":id/edit" element={<NewInvoice />} />
      <Route path=":id/email" element={<SendInvoiceEmail />} />
      <Route path=":id" element={<InvoiceDetail />} />
      <Route path="*" element={<Navigate to="." replace />} />
    </Routes>
  );
}
