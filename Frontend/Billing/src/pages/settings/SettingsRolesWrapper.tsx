import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import SettingsLayout from "./SettingsLayout";
import RolesPage from "./organization-settings/users-roles/roles/RolesPage";
import NewRolePage from "./organization-settings/users-roles/roles/new/NewRolePage";

export default function SettingsRolesWrapper() {
  return (
    <SettingsLayout>
      <Routes>
        <Route index element={<RolesPage />} />
        <Route path="new" element={<NewRolePage />} />
        <Route path="edit/:id" element={<NewRolePage />} />
        <Route path="*" element={<Navigate to="/settings/roles" replace />} />
      </Routes>
    </SettingsLayout>
  );
}



