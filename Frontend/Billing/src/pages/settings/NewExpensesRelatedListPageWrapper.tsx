import React from "react";
import SettingsLayout from "./SettingsLayout";
import NewQuotesRelatedListPage from "./NewQuotesRelatedListPage";

export default function NewExpensesRelatedListPageWrapper() {
  return (
    <SettingsLayout>
      <NewQuotesRelatedListPage />
    </SettingsLayout>
  );
}

