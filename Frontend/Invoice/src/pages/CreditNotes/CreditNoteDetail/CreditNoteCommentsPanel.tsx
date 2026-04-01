import React from "react";
import QuoteCommentsPanel from "../../Quotes/QuoteDetail/QuoteCommentsPanel";

type CreditNoteCommentsPanelProps = {
  open: boolean;
  onClose: () => void;
  creditNoteId: string;
  comments?: any[];
  onCommentsChange?: (comments: any[]) => void;
  updateCreditNote: (creditNoteId: string, data: any) => Promise<any>;
};

export default function CreditNoteCommentsPanel({
  open,
  onClose,
  creditNoteId,
  comments = [],
  onCommentsChange,
  updateCreditNote,
}: CreditNoteCommentsPanelProps) {
  return (
    <QuoteCommentsPanel
      open={open}
      onClose={onClose}
      quoteId={creditNoteId}
      comments={comments}
      onCommentsChange={onCommentsChange}
      updateQuote={updateCreditNote}
    />
  );
}
