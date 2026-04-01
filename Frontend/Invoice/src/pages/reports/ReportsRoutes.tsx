import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import ReportCategoryPage from "./ReportCategoryPage";
import ReportDetailPage from "./ReportDetailPage";
import ReportsHomePage from "./ReportsHomePage";
import RefundHistoryReportPage from "./RefundHistoryReportPage";
import TimeToGetPaidReportPage from "./TimeToGetPaidReportPage";

export default function ReportsRoutes() {
  return (
    <Routes>
      <Route index element={<ReportsHomePage />} />
      <Route path=":categoryId/time-to-get-paid" element={<TimeToGetPaidReportPage />} />
      <Route path=":categoryId/refund-history" element={<RefundHistoryReportPage />} />
      <Route path=":categoryId" element={<ReportCategoryPage />} />
      <Route path=":categoryId/:reportId" element={<ReportDetailPage />} />
      <Route path="*" element={<Navigate to="/reports" replace />} />
    </Routes>
  );
}
