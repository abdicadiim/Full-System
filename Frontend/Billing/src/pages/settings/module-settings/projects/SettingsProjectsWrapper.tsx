import React from "react";
import SettingsLayout from "../../SettingsLayout";
import ProjectsSettingsListPage from "./list/ProjectsSettingsListPage";

export default function SettingsProjectsWrapper() {
  return (
    <SettingsLayout>
      <ProjectsSettingsListPage />
    </SettingsLayout>
  );
}



