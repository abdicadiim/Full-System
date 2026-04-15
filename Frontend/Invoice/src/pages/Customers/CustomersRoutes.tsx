import React, { Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import {
  CustomersIndexRoute,
  CustomerDetailRoute,
  ImportCustomersRoute,
  NewCustomerRoute,
  NewCustomViewRoute,
  RequestReviewRoute,
  SendEmailStatementRoute,
} from "./customerRouteLoaders";

function CustomersRouteFallback() {
  return null;
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
      <Route path=":id/*" element={withSuspense(<CustomerDetailRoute />)} />
      <Route path="*" element={<Navigate to="." replace />} />
    </Routes>
  );
}
