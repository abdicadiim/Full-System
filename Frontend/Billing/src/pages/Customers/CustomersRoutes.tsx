import React, { Suspense } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import {
  CustomerDetailRoute,
  CustomersIndexRoute,
  ImportCustomersRoute,
  NewCustomerRoute,
  NewCustomViewRoute,
  RequestReviewRoute,
  SendEmailStatementRoute,
} from "./customerRouteLoaders";

function CustomersRouteFallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center p-6 text-sm text-gray-500">
      Loading customers...
    </div>
  );
}

const withSuspense = (node: React.ReactNode) => (
  <Suspense fallback={<CustomersRouteFallback />}>
    {node}
  </Suspense>
);

export default function CustomersRoutes() {
  const location = useLocation();
  const routeKey = `${location.pathname}${location.search}${location.hash}`;

  return (
    <Routes location={location} key={routeKey}>
      <Route index element={withSuspense(<CustomersIndexRoute />)} />
      <Route path="new" element={withSuspense(<NewCustomerRoute key={`customer-new-${routeKey}`} />)} />
      <Route path="import" element={withSuspense(<ImportCustomersRoute />)} />
      <Route path="new-custom-view" element={withSuspense(<NewCustomViewRoute />)} />
      <Route path=":id/edit" element={withSuspense(<NewCustomerRoute key={`customer-edit-${routeKey}`} />)} />
      <Route path=":id/request-review" element={withSuspense(<RequestReviewRoute />)} />
      <Route path=":id/send-email-statement" element={withSuspense(<SendEmailStatementRoute />)} />
      <Route path=":id" element={withSuspense(<CustomerDetailRoute key={`customer-detail-${routeKey}`} />)} />
      <Route path="*" element={<Navigate to="." replace />} />
    </Routes>
  );
}
