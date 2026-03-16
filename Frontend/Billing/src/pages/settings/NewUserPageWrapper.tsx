import React from "react";
import SettingsLayout from "./SettingsLayout";
import NewUserPage from "./organization-settings/users-roles/users/new/NewUserPage";

export default function NewUserPageWrapper() {
  return (
    <SettingsLayout>
      <NewUserPage />
    </SettingsLayout>
  );
}

