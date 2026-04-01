import React from "react";
import QuoteCommentsPanel from "../../Quotes/QuoteDetail/QuoteCommentsPanel";

type InvoiceCommentsPanelProps = {
  open: boolean;
  onClose: () => void;
  invoiceId: string;
  comments?: any[];
  onCommentsChange?: (comments: any[]) => void;
  updateInvoice: (invoiceId: string, data: any) => Promise<any>;
};

export default function InvoiceCommentsPanel({
  open,
  onClose,
  invoiceId,
  comments = [],
  onCommentsChange,
  updateInvoice,
}: InvoiceCommentsPanelProps) {
  return (
    <QuoteCommentsPanel
      open={open}
      onClose={onClose}
      quoteId={invoiceId}
      comments={comments}
      onCommentsChange={onCommentsChange}
      updateQuote={updateInvoice}
    />
  );
}
