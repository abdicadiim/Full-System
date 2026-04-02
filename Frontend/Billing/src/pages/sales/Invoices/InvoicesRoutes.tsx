import React, { Suspense, lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

const Invoices = lazy(() => import("./Invoices"));
const NewInvoice = lazy(() => import("./NewInvoice/NewInvoice"));
const NewRetailInvoice = lazy(() => import("../RetainerInvoice/NewRetailInvoice/NewRetailInvoice"));
const ImportInvoices = lazy(() => import("./ImportInvoices/ImportInvoices"));
const InvoiceDetail = lazy(() => import("./InvoiceDetail/InvoiceDetail"));
const SendInvoiceEmail = lazy(() => import("./SendInvoiceEmail/SendInvoiceEmail"));

function RouteFallback() {
  return (
    <div className="flex min-h-[30vh] items-center justify-center p-6 text-sm text-gray-500">
      Loading...
    </div>
  );
}

export default function InvoicesRoutes() {
  return (
    <Suspense fallback={<RouteFallback />}>
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
    </Suspense>
  );
}
