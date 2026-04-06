import React from "react";
import { useCustomersState } from "./useCustomersState";
import { useCustomersView } from "./useCustomersView";
import { useCustomersActions } from "./useCustomersActions";
import CustomersView from "./CustomersView";

export default function Customers() {
  const state = useCustomersState();
  const view = useCustomersView(state);
  const actions = useCustomersActions({ ...state, ...view });
  const controller = { ...state, ...view, ...actions };

  return <CustomersView controller={controller} />;
}
