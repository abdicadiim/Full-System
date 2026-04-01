import React from "react";
import { useParams } from "react-router-dom";
import BankChargesReportPage from "./BankChargesReportPage";
import BadDebtsReportPage from "./BadDebtsReportPage";
import ReceivableDetailsReportPage from "./ReceivableDetailsReportPage";
import ReceivableSummaryReportPage from "./ReceivableSummaryReportPage";
import SalesByCustomerReportPage from "./SalesByCustomerReportPage";
import TimeToGetPaidReportPage from "./TimeToGetPaidReportPage";

export default function ReportDetailPage() {
  const { reportId } = useParams();

  if (reportId === "bank-charges") {
    return <BankChargesReportPage />;
  }
  if (reportId === "bad-debts") {
    return <BadDebtsReportPage />;
  }
  if (reportId === "receivable-summary") {
    return <ReceivableSummaryReportPage />;
  }
  if (reportId === "receivable-details") {
    return <ReceivableDetailsReportPage />;
  }
  if (reportId === "time-to-get-paid") {
    return <TimeToGetPaidReportPage />;
  }

  return <SalesByCustomerReportPage />;
}
