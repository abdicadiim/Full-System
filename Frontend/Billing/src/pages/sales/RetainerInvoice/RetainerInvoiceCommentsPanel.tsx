import React from "react";
import QuoteCommentsPanel from "../Quotes/QuoteDetail/QuoteCommentsPanel";

type RetainerInvoiceCommentsPanelProps = {
  open: boolean;
  onClose: () => void;
  retainerInvoiceId: string;
  comments?: any[];
  onCommentsChange?: (comments: any[]) => void;
  updateRetainerInvoice: (retainerInvoiceId: string, data: any) => Promise<any>;
};

export default function RetainerInvoiceCommentsPanel({
  open,
  onClose,
  retainerInvoiceId,
  comments = [],
  onCommentsChange,
  updateRetainerInvoice,
}: RetainerInvoiceCommentsPanelProps) {
  return (
    <QuoteCommentsPanel
      open={open}
      onClose={onClose}
      quoteId={retainerInvoiceId}
      comments={comments}
      onCommentsChange={onCommentsChange}
      updateQuote={updateRetainerInvoice}
    />
  );
}
