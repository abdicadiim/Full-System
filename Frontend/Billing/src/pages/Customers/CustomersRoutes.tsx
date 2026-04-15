import React, { Suspense } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import CustomerDetail from "./CustomerDetail/CustomerDetail";
import {
  CustomersIndexRoute,
  ImportCustomersRoute,
  NewCustomerRoute,
  NewCustomViewRoute,
  RequestReviewRoute,
  SendEmailStatementRoute,
} from "./customerRouteLoaders";

function CustomersRouteFallback() {
  return null;
}

function CustomerDetailRoute() {
  const location = useLocation();

  // Remount the detail screen on each customer navigation so stale overlay/menu state
  // does not leak from one customer record to the next.
  return <CustomerDetail key={`${location.pathname}:${location.key}`} />;
}

const withSuspense = (node: React.ReactNode) => (
  <Suspense fallback={<CustomersRouteFallback />}>
    {node}
  </Suspense>
);

export default function CustomersRoutes() {
  return (
    <Routes>
      <Route index element={withSuspense(<CustomersIndexRoute />)} />
      <Route path="new" element={withSuspense(<NewCustomerRoute />)} />
      <Route path="import" element={withSuspense(<ImportCustomersRoute />)} />
      <Route path="new-custom-view" element={withSuspense(<NewCustomViewRoute />)} />
      <Route path=":id/edit" element={withSuspense(<NewCustomerRoute />)} />
      <Route path=":id/request-review" element={withSuspense(<RequestReviewRoute />)} />
      <Route path=":id/send-email-statement" element={withSuspense(<SendEmailStatementRoute />)} />
      <Route path=":id" element={<CustomerDetailRoute />} />
      <Route path="*" element={<Navigate to="." replace />} />
    </Routes>
  );
}
