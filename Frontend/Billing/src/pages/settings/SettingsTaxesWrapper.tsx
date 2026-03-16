import React from "react";
import SettingsLayout from "./SettingsLayout";
import TaxesPage from "./organization-settings/taxes-compliance/TAX/TaxesPage";

export default function SettingsTaxesWrapper() {
  return (
    <SettingsLayout>
      <TaxesPage />
    </SettingsLayout>
  );
}


