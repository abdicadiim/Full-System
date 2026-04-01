import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import ReportCategoryPage from "./ReportCategoryPage";
import ReportDetailPage from "./ReportDetailPage";
import ReportsHomePage from "./ReportsHomePage";
import TimeToGetPaidReportPage from "./TimeToGetPaidReportPage";

export default function ReportsRoutes() {
  return (
    <Routes>
      <Route index element={<ReportsHomePage />} />
      <Route path=":categoryId" element={<ReportCategoryPage />} />
      <Route path=":categoryId/time-to-get-paid" element={<TimeToGetPaidReportPage />} />
      <Route path=":categoryId/:reportId" element={<ReportDetailPage />} />
      <Route path="*" element={<Navigate to="/reports" replace />} />
    </Routes>
  );
}
