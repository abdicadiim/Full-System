import React from "react";
import SettingsLayout from "../../../SettingsLayout";
import SchedulesListPage from "./list/SchedulesListPage";

export default function SettingsSchedulesWrapper() {
  return (
    <SettingsLayout>
      <SchedulesListPage />
    </SettingsLayout>
  );
}


