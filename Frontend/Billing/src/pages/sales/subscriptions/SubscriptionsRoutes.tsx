import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import SubscriptionsPage from "./subscriptionsPage";
import SubscriptionDetailPage from "./SubscriptionDetailPage";
import NewSubscriptionPage from "./Newsubscriptions/NewSubscriptionPage";
import SubscriptionPreviewPage from "./Newsubscriptions/SubscriptionPreviewPage";

export default function SubscriptionsRoutes() {
  return (
    <Routes>
      <Route index element={<SubscriptionsPage />} />
      <Route path="new" element={<NewSubscriptionPage />} />
      <Route path=":subscriptionId/edit" element={<NewSubscriptionPage />} />
      <Route path="preview" element={<SubscriptionPreviewPage />} />
      <Route path=":subscriptionId" element={<SubscriptionDetailPage />} />
      <Route path="*" element={<Navigate to="." replace />} />
    </Routes>
  );
}
