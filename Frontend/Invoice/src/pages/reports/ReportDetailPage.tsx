import React from "react";
import { useParams } from "react-router-dom";
import BankChargesReportPage from "./BankChargesReportPage";
import BadDebtsReportPage from "./BadDebtsReportPage";
import SalesByCustomerReportPage from "./SalesByCustomerReportPage";

export default function ReportDetailPage() {
  const { reportId } = useParams();

  if (reportId === "bank-charges") {
    return <BankChargesReportPage />;
  }
  if (reportId === "bad-debts") {
    return <BadDebtsReportPage />;
  }

  return <SalesByCustomerReportPage />;
}
