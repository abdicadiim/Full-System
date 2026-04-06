import React from "react";
import useNewCustomerController from "./useNewCustomerController";
import NewCustomerView from "./NewCustomerView";

export default function NewCustomer() {
  const controller = useNewCustomerController();

  return <NewCustomerView controller={controller} />;
}
