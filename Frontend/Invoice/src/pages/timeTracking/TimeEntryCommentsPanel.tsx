import React from "react";
import QuoteCommentsPanel, { QuoteComment } from "../Quotes/QuoteDetail/QuoteCommentsPanel";

type TimeEntryCommentsPanelProps = {
  open: boolean;
  onClose: () => void;
  entryId: string;
  comments?: any[];
  onCommentsChange?: (comments: QuoteComment[]) => void;
  updateEntry: (entryId: string, data: any) => Promise<any>;
};

export default function TimeEntryCommentsPanel({
  open,
  onClose,
  entryId,
  comments = [],
  onCommentsChange,
  updateEntry,
}: TimeEntryCommentsPanelProps) {
  return (
    <QuoteCommentsPanel
      open={open}
      onClose={onClose}
      quoteId={entryId}
      comments={comments}
      onCommentsChange={onCommentsChange}
      updateQuote={updateEntry}
    />
  );
}
