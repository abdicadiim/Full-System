import React from "react";
import QuoteCommentsPanel from "../../Quotes/QuoteDetail/QuoteCommentsPanel";

type SalesReceiptCommentsPanelProps = {
  open: boolean;
  onClose: () => void;
  receiptId: string;
  comments?: any[];
  onCommentsChange?: (comments: any[]) => void;
  updateSalesReceipt: (receiptId: string, data: any) => Promise<any>;
};

export default function SalesReceiptCommentsPanel({
  open,
  onClose,
  receiptId,
  comments = [],
  onCommentsChange,
  updateSalesReceipt,
}: SalesReceiptCommentsPanelProps) {
  return (
    <QuoteCommentsPanel
      open={open}
      onClose={onClose}
      quoteId={receiptId}
      comments={comments}
      onCommentsChange={onCommentsChange}
      updateQuote={updateSalesReceipt}
    />
  );
}
