import React from "react";
import { useParams } from "react-router-dom";
import SalesByCustomerReportPage from "./SalesByCustomerReportPage";
import BadDebtsReportPage from "./BadDebtsReportPage";

export default function ReportDetailPage() {
  const { reportId } = useParams();

  if (reportId === "bad-debts") {
    return <BadDebtsReportPage />;
  }

  return <SalesByCustomerReportPage />;
}
