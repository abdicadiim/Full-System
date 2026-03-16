import React from "react";
import SettingsLayout from "../../../SettingsLayout";
import WorkflowRulesListPage from "./list/WorkflowRulesListPage";

export default function SettingsWorkflowRulesWrapper() {
  return (
    <SettingsLayout>
      <WorkflowRulesListPage />
    </SettingsLayout>
  );
}


