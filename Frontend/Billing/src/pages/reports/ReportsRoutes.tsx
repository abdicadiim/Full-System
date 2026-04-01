import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import CreateCustomReportPage from "./CreateCustomReportPage";
import ReportCategoryPage from "./ReportCategoryPage";
import ReportDetailPage from "./ReportDetailPage";
import ReceivableDetailsReportPage from "./ReceivableDetailsReportPage";
import ReportsHomePage from "./ReportsHomePage";

export default function ReportsRoutes() {
  return (
    <Routes>
      <Route index element={<ReportsHomePage />} />
      <Route path="custom/create" element={<CreateCustomReportPage />} />
      <Route path=":categoryId" element={<ReportCategoryPage />} />
      <Route path=":categoryId/receivable-details" element={<ReceivableDetailsReportPage />} />
      <Route path=":categoryId/:reportId" element={<ReportDetailPage />} />
      <Route path="*" element={<Navigate to="/reports" replace />} />
    </Routes>
  );
}
