import React, { Suspense, lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

const Quotes = lazy(() => import("./Quotes"));
const NewQuote = lazy(() => import("./NewQuote/NewQuote"));
const SubscriptionQuote = lazy(() => import("./NewQuote/SubscriptionQuote"));
const ImportQuotes = lazy(() => import("./ImportQuotes/ImportQuotes"));
const QuoteDetail = lazy(() => import("./QuoteDetail/QuoteDetail"));
const SendQuoteEmail = lazy(() => import("./SendQuoteEmail/SendQuoteEmail"));

function RouteFallback() {
  return (
    <div className="flex min-h-[30vh] items-center justify-center p-6 text-sm text-gray-500">
      Loading...
    </div>
  );
}

export default function QuotesRoutes() {
  return (
    <Suspense fallback={<RouteFallback />}>
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
    </Suspense>
  );
}
