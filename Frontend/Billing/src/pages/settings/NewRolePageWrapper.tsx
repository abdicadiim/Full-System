import React from "react";
import SettingsLayout from "./SettingsLayout";
import NewRolePage from "./organization-settings/users-roles/roles/new/NewRolePage";

export default function NewRolePageWrapper() {
  return (
    <SettingsLayout>
      <NewRolePage />
    </SettingsLayout>
  );
}



