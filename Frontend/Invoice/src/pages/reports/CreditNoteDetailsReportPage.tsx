import React from "react";
import ReceivablesReportPage from "./ReceivablesReportPage";

export default function CreditNoteDetailsReportPage() {
  return (
    <ReceivablesReportPage
      reportId="credit-note-details"
      categoryId="payments-received"
    />
  );
}
