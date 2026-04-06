import React from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import QuoteDetailView from "./QuoteDetailView";
import { useQuoteDetailController } from "./useQuoteDetailController";

const QuoteDetail = () => {
  const { quoteId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const preloadedQuote = (location.state as any)?.preloadedQuote || null;
  const preloadedQuotes = (location.state as any)?.preloadedQuotes || null;

  const controller = useQuoteDetailController({
    quoteId: String(quoteId || ""),
    preloadedQuote,
    preloadedQuotes,
    navigate,
  });

  return <QuoteDetailView {...controller} />;
};

export default QuoteDetail;
