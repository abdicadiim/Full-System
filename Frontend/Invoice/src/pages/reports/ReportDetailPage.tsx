import React from "react";
import { useParams } from "react-router-dom";
import BankChargesReportPage from "./BankChargesReportPage";
import BadDebtsReportPage from "./BadDebtsReportPage";
import CreditNoteDetailsReportPage from "./CreditNoteDetailsReportPage";
import ReceivableDetailsReportPage from "./ReceivableDetailsReportPage";
import ReceivableSummaryReportPage from "./ReceivableSummaryReportPage";
import RefundHistoryReportPage from "./RefundHistoryReportPage";
import WithholdingTaxReportPage from "./WithholdingTaxReportPage";
import SalesByCustomerReportPage from "./SalesByCustomerReportPage";
import ActivityLogsReportPage from "./ActivityLogsReportPage";
import ExceptionReportPage from "./ExceptionReportPage";
import PortalActivitiesReportPage from "./PortalActivitiesReportPage";
import CustomerReviewsReportPage from "./CustomerReviewsReportPage";
import TimesheetDetailsReportPage from "./TimesheetDetailsReportPage";
import ProjectSummaryReportPage from "./ProjectSummaryReportPage";
import ProjectDetailsReportPage from "./ProjectDetailsReportPage";
import ExpenseDetailsReportPage from "./ExpenseDetailsReportPage";
import SystemMailsReportPage from "./SystemMailsReportPage";
import TimeToGetPaidReportPage from "./TimeToGetPaidReportPage";
import TaxSummaryReportPage from "./TaxSummaryReportPage";
import TdsReceivablesReportPage from "./TdsReceivablesReportPage";
import ExpensesByCategoryReportPage from "./ExpensesByCategoryReportPage";
import ExpensesByCustomerReportPage from "./ExpensesByCustomerReportPage";

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
  if (reportId === "credit-note-details") {
    return <CreditNoteDetailsReportPage />;
  }
  if (reportId === "refund-history") {
    return <RefundHistoryReportPage />;
  }
  if (reportId === "withholding-tax") {
    return <WithholdingTaxReportPage />;
  }
  if (reportId === "time-to-get-paid") {
    return <TimeToGetPaidReportPage />;
  }
  if (reportId === "tax-summary") {
    return <TaxSummaryReportPage />;
  }
  if (reportId === "tds-receivables") {
    return <TdsReceivablesReportPage />;
  }
  if (reportId === "system-mails") {
    return <SystemMailsReportPage />;
  }
  if (reportId === "activity-logs-audit-trail") {
    return <ActivityLogsReportPage />;
  }
  if (reportId === "exception-report") {
    return <ExceptionReportPage />;
  }
  if (reportId === "portal-activities") {
    return <PortalActivitiesReportPage />;
  }
  if (reportId === "customer-reviews") {
    return <CustomerReviewsReportPage />;
  }
  if (reportId === "timesheet-details") {
    return <TimesheetDetailsReportPage />;
  }
  if (reportId === "project-summary") {
    return <ProjectSummaryReportPage />;
  }
  if (reportId === "project-details") {
    return <ProjectDetailsReportPage />;
  }
  if (reportId === "expenses-by-customer") {
    return <ExpensesByCustomerReportPage />;
  }
  if (reportId === "expense-details") {
    return <ExpenseDetailsReportPage />;
  }
  if (reportId === "expenses-by-category") {
    return <ExpensesByCategoryReportPage />;
  }

  return <SalesByCustomerReportPage />;
}
