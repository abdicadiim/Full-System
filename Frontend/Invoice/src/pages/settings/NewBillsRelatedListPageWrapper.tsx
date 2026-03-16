import React from "react";
import SettingsLayout from "./SettingsLayout";
import NewQuotesRelatedListPage from "./NewQuotesRelatedListPage";

export default function NewBillsRelatedListPageWrapper() {
  return (
    <SettingsLayout>
      <NewQuotesRelatedListPage />
    </SettingsLayout>
  );
}

