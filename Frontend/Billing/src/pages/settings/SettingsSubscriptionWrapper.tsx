import React from "react";
import SettingsLayout from "./SettingsLayout";
import SubscriptionPage from "./organization-settings/organization/subscription/SubscriptionPage";

export default function SettingsSubscriptionWrapper() {
  return (
    <SettingsLayout>
      <SubscriptionPage />
    </SettingsLayout>
  );
}

