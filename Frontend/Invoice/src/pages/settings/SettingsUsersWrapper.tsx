import React from "react";
import SettingsLayout from "./SettingsLayout";
import UsersPage from "./organization-settings/users-roles/users/UsersPage";

export default function SettingsUsersWrapper() {
  return (
    <SettingsLayout>
      <UsersPage />
    </SettingsLayout>
  );
}



