import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import RetainerInvoice from "./RetainerInvoice";
import Retailinvoicedetail from "./Retailinvoicedetail";
import NewRetailInvoice from "./NewRetailInvoice/NewRetailInvoice";
import ImportRetainerInvoices from "./ImportRetainerInvoices";
import SendRetainerEmail from "./SendEmail/SendRetainerEmail";

export default function RetainerInvoiceRoutes() {
  return (
    <Routes>
      <Route index element={<RetainerInvoice />} />
      <Route path="new" element={<NewRetailInvoice />} />
      <Route path="import" element={<ImportRetainerInvoices />} />
      <Route path=":id/edit" element={<NewRetailInvoice />} />
      <Route path=":id/send-email" element={<SendRetainerEmail />} />
      <Route path=":id" element={<Retailinvoicedetail />} />
      <Route path="*" element={<Navigate to="." replace />} />
    </Routes>
  );
}
