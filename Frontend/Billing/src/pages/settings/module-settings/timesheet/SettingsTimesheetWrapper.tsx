import React from "react";
import SettingsLayout from "../../SettingsLayout";
import TimesheetSettingsListPage from "./list/TimesheetSettingsListPage";

export default function SettingsTimesheetWrapper() {
  return (
    <SettingsLayout>
      <TimesheetSettingsListPage />
    </SettingsLayout>
  );
}



