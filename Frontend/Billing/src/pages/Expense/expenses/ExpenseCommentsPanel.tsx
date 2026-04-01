import React from "react";
import QuoteCommentsPanel from "../../sales/Quotes/QuoteDetail/QuoteCommentsPanel";

type ExpenseCommentsPanelProps = {
  open: boolean;
  onClose: () => void;
  expenseId: string;
  comments?: any[];
  onCommentsChange?: (comments: any[]) => void;
  updateExpense: (expenseId: string, data: any) => Promise<any>;
};

export default function ExpenseCommentsPanel({
  open,
  onClose,
  expenseId,
  comments = [],
  onCommentsChange,
  updateExpense,
}: ExpenseCommentsPanelProps) {
  return (
    <QuoteCommentsPanel
      open={open}
      onClose={onClose}
      quoteId={expenseId}
      comments={comments}
      onCommentsChange={onCommentsChange}
      updateQuote={updateExpense}
    />
  );
}
