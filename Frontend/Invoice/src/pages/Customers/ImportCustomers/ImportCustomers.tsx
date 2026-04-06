import React from "react";
import ImportCustomersView from "./ImportCustomersView";
import { useImportCustomersController } from "./useImportCustomersController";

export default function ImportCustomers() {
  const controller = useImportCustomersController();
  return <ImportCustomersView controller={controller} />;
}
