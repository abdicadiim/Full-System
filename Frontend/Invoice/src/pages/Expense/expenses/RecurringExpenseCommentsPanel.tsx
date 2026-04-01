import React from "react";
import QuoteCommentsPanel from "../../Quotes/QuoteDetail/QuoteCommentsPanel";

type RecurringExpenseCommentsPanelProps = {
  open: boolean;
  onClose: () => void;
  recurringExpenseId: string;
  comments?: any[];
  onCommentsChange?: (comments: any[]) => void;
  updateRecurringExpense: (recurringExpenseId: string, data: any) => Promise<any>;
};

export default function RecurringExpenseCommentsPanel({
  open,
  onClose,
  recurringExpenseId,
  comments = [],
  onCommentsChange,
  updateRecurringExpense,
}: RecurringExpenseCommentsPanelProps) {
  return (
    <QuoteCommentsPanel
      open={open}
      onClose={onClose}
      quoteId={recurringExpenseId}
      comments={comments}
      onCommentsChange={onCommentsChange}
      updateQuote={updateRecurringExpense}
    />
  );
}
