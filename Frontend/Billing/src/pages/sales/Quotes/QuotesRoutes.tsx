import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import Quotes from "./Quotes";
import NewQuote from "./NewQuote/NewQuote";
import SubscriptionQuote from "./NewQuote/SubscriptionQuote";
import ImportQuotes from "./ImportQuotes/ImportQuotes";
import QuoteDetail from "./QuoteDetail/QuoteDetail";
import SendQuoteEmail from "./SendQuoteEmail/SendQuoteEmail";

export default function QuotesRoutes() {
  return (
    <Routes>
      <Route index element={<Quotes />} />
      <Route path="new" element={<NewQuote />} />
      <Route path="subscription/new" element={<SubscriptionQuote />} />
      <Route path="import" element={<ImportQuotes />} />
      <Route path="custom-view/new" element={<Quotes />} />
      <Route path=":quoteId/edit" element={<NewQuote />} />
      <Route path=":quoteId/email" element={<SendQuoteEmail />} />
      <Route path=":quoteId" element={<QuoteDetail />} />
      <Route path="*" element={<Navigate to="." replace />} />
    </Routes>
  );
}
