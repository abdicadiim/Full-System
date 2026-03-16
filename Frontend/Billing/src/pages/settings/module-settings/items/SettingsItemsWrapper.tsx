import React from "react";
import SettingsLayout from "../../SettingsLayout";
import ItemsSettingsListPage from "./list/ItemsSettingsListPage";

export default function SettingsItemsWrapper() {
  return (
    <SettingsLayout>
      <ItemsSettingsListPage />
    </SettingsLayout>
  );
}



