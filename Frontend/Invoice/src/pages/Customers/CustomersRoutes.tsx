import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import Customers from "./Customers";
import NewCustomer from "./NewCustomer/NewCustomer";
import CustomerDetail from "./CustomerDetail/CustomerDetail";
import ImportCustomers from "./ImportCustomers/ImportCustomers";
import NewCustomView from "./NewCustomView/NewCustomView";
import RequestReview from "./RequestReview/RequestReview";
import SendEmailStatement from "./CustomerDetail/SendEmailStatement/SendEmailStatement";

export default function CustomersRoutes() {
  return (
    <Routes>
      <Route index element={<Customers />} />
      <Route path="new" element={<NewCustomer />} />
      <Route path="import" element={<ImportCustomers />} />
      <Route path="new-custom-view" element={<NewCustomView />} />
      <Route path=":id/edit" element={<NewCustomer />} />
      <Route path=":id/request-review" element={<RequestReview />} />
      <Route path=":id/send-email-statement" element={<SendEmailStatement />} />
      <Route path=":id" element={<CustomerDetail />} />
      <Route path="*" element={<Navigate to="." replace />} />
    </Routes>
  );
}
