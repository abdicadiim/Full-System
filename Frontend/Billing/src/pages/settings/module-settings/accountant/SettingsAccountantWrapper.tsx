import React from "react";
import SettingsLayout from "../../SettingsLayout";
import AccountantSettingsListPage from "./list/AccountantSettingsListPage";

export default function SettingsAccountantWrapper() {
  return (
    <SettingsLayout>
      <AccountantSettingsListPage />
    </SettingsLayout>
  );
}



