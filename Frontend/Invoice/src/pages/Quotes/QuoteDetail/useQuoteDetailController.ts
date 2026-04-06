import { getQuoteTotalsMeta } from "./QuoteDetail.utils";
import { useQuoteDetailAttachmentActions } from "./useQuoteDetailAttachmentActions";
import { useQuoteDetailBulkActions } from "./useQuoteDetailBulkActions";
import { useQuoteDetailCommunicationActions } from "./useQuoteDetailCommunicationActions";
import { useQuoteDetailQuoteActions } from "./useQuoteDetailQuoteActions";
import { useQuoteDetailSidebarActions } from "./useQuoteDetailSidebarActions";
import { useQuoteDetailState } from "./useQuoteDetailState";

type Args = {
  quoteId?: string;
  preloadedQuote?: any;
  preloadedQuotes?: any[];
  navigate: (to: string, options?: any) => void;
};

export const useQuoteDetailController = ({ quoteId, preloadedQuote, preloadedQuotes, navigate }: Args) => {
  const state = useQuoteDetailState({ quoteId, preloadedQuote, preloadedQuotes }, {});
  const ctx = { ...state, navigate };

  const bulkActions = useQuoteDetailBulkActions(ctx);
  const quoteActions = useQuoteDetailQuoteActions(ctx);
  const communicationActions = useQuoteDetailCommunicationActions(ctx);
  const attachmentActions = useQuoteDetailAttachmentActions(ctx);
  const sidebarActions = useQuoteDetailSidebarActions(ctx);

  const filteredQuotesList = state.getFilteredQuotes();
  const quoteTotalsMeta = getQuoteTotalsMeta(state.quote);

  return {
    ...state,
    ...bulkActions,
    ...quoteActions,
    ...communicationActions,
    ...attachmentActions,
    ...sidebarActions,
    navigate,
    filteredQuotesList,
    quoteTotalsMeta,
  };
};

