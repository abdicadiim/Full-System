import React from "react";
import SettingsLayout from "./SettingsLayout";
import PurchaseOrdersPage from "./PurchaseOrdersPage";

export default function SettingsPurchaseOrdersWrapper() {
  return (
    <SettingsLayout>
      <PurchaseOrdersPage />
    </SettingsLayout>
  );
}

