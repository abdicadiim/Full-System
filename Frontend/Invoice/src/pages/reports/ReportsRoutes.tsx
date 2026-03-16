import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import ReportCategoryPage from "./ReportCategoryPage";
import ReportDetailPage from "./ReportDetailPage";
import ReportsHomePage from "./ReportsHomePage";

export default function ReportsRoutes() {
  return (
    <Routes>
      <Route index element={<ReportsHomePage />} />
      <Route path=":categoryId" element={<ReportCategoryPage />} />
      <Route path=":categoryId/:reportId" element={<ReportDetailPage />} />
      <Route path="*" element={<Navigate to="/reports" replace />} />
    </Routes>
  );
}
