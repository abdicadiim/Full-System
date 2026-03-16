import React from "react";
import SettingsLayout from "./SettingsLayout";
import UserPreferencesPage from "./organization-settings/users-roles/user-preferences/UserPreferencesPage";

export default function SettingsUserPreferencesWrapper() {
  return (
    <SettingsLayout>
      <UserPreferencesPage />
    </SettingsLayout>
  );
}



