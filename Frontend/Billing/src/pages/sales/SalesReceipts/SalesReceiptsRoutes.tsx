import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import SalesReceipts from "./SalesReceipts";
import NewSalesReceipt from "./NewSalesReceipt/NewSalesReceipt";
import ImportSalesReceipts from "./ImportSalesReceipts/ImportSalesReceipts";
import SalesReceiptDetail from "./SalesReceiptDetail/SalesReceiptDetail";
import SendSalesReceiptEmail from "./SendEmail/SendSalesReceiptEmail";

export default function SalesReceiptsRoutes() {
  return (
    <Routes>
      <Route index element={<SalesReceipts />} />
      <Route path="new" element={<NewSalesReceipt />} />
      <Route path="import" element={<ImportSalesReceipts />} />
      <Route path="custom-view/new" element={<SalesReceipts />} />
      <Route path=":id/edit" element={<NewSalesReceipt />} />
      <Route path=":id/send-email" element={<SendSalesReceiptEmail />} />
      <Route path=":id" element={<SalesReceiptDetail />} />
      <Route path="*" element={<Navigate to="." replace />} />
    </Routes>
  );
}
