import React from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import Customers from "./Customers";
import NewCustomer from "./NewCustomer/NewCustomer";
import CustomerDetail from "./CustomerDetail/CustomerDetail";
import ImportCustomers from "./ImportCustomers/ImportCustomers";
import NewCustomView from "./NewCustomView/NewCustomView";
import RequestReview from "./RequestReview/RequestReview";
import SendEmailStatement from "./CustomerDetail/SendEmailStatement/SendEmailStatement";

export default function CustomersRoutes() {
  const location = useLocation();
  const routeKey = `${location.pathname}${location.search}${location.hash}`;

  return (
    <Routes location={location} key={routeKey}>
      <Route index element={<Customers />} />
      <Route path="new" element={<NewCustomer key={`customer-new-${routeKey}`} />} />
      <Route path="import" element={<ImportCustomers />} />
      <Route path="new-custom-view" element={<NewCustomView />} />
      <Route path=":id/edit" element={<NewCustomer key={`customer-edit-${routeKey}`} />} />
      <Route path=":id/request-review" element={<RequestReview />} />
      <Route path=":id/send-email-statement" element={<SendEmailStatement />} />
      <Route path=":id" element={<CustomerDetail key={`customer-detail-${routeKey}`} />} />
      <Route path="*" element={<Navigate to="." replace />} />
    </Routes>
  );
}
