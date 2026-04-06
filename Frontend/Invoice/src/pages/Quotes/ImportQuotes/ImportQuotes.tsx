import React from "react";
import ImportQuotesView from "./ImportQuotesView";
import { useImportQuotesController } from "./useImportQuotesController";

export default function ImportQuotes() {
  const controller = useImportQuotesController();
  return <ImportQuotesView controller={controller} />;
}
