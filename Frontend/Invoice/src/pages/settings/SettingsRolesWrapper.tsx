import React from "react";
import SettingsLayout from "./SettingsLayout";
import RolesPage from "./organization-settings/users-roles/roles/RolesPage";

export default function SettingsRolesWrapper() {
  return (
    <SettingsLayout>
      <RolesPage />
    </SettingsLayout>
  );
}



