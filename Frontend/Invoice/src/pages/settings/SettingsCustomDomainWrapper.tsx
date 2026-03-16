import React from "react";
import SettingsLayout from "./SettingsLayout";
import CustomDomainPage from "./organization-settings/organization/custom-domain/CustomDomainPage";

export default function SettingsCustomDomainWrapper() {
  return (
    <SettingsLayout>
      <CustomDomainPage />
    </SettingsLayout>
  );
}



