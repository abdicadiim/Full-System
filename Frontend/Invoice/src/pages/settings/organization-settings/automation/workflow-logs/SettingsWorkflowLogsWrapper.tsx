import React from "react";
import SettingsLayout from "../../../SettingsLayout";
import WorkflowLogsListPage from "./list/WorkflowLogsListPage";

export default function SettingsWorkflowLogsWrapper() {
  return (
    <SettingsLayout>
      <WorkflowLogsListPage />
    </SettingsLayout>
  );
}


