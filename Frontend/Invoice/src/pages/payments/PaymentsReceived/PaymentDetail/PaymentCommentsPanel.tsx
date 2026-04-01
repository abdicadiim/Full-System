import React from "react";
import QuoteCommentsPanel from "../../../Quotes/QuoteDetail/QuoteCommentsPanel";

type PaymentCommentsPanelProps = {
  open: boolean;
  onClose: () => void;
  paymentId: string;
  comments?: any[];
  onCommentsChange?: (comments: any[]) => void;
  updatePaymentRecord: (paymentId: string, data: any) => Promise<any>;
};

export default function PaymentCommentsPanel({
  open,
  onClose,
  paymentId,
  comments = [],
  onCommentsChange,
  updatePaymentRecord,
}: PaymentCommentsPanelProps) {
  return (
    <QuoteCommentsPanel
      open={open}
      onClose={onClose}
      quoteId={paymentId}
      comments={comments}
      onCommentsChange={onCommentsChange}
      updateQuote={updatePaymentRecord}
    />
  );
}
