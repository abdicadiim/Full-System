import React from "react";
import SettingsLayout from "./SettingsLayout";
import ExpensesPage from "./ExpensesPage";

export default function SettingsExpensesWrapper() {
  return (
    <SettingsLayout>
      <ExpensesPage />
    </SettingsLayout>
  );
}

