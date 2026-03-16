import React from "react";
import SettingsLayout from "./SettingsLayout";
import ProfilePage from "./organization-settings/organization/profile/ProfilePage";

export default function SettingsProfileWrapper() {
  return (
    <SettingsLayout>
      <ProfilePage />
    </SettingsLayout>
  );
}



