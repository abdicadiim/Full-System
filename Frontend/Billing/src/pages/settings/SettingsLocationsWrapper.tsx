import React from "react";
import SettingsLayout from "./SettingsLayout";
import { useLocation } from "react-router-dom";
import LocationsPage from "./organization-settings/organization/locations/LocationsPage";
import AddLocationPage from "./organization-settings/organization/locations/new/AddLocationPage";
import EditLocationPage from "./organization-settings/organization/locations/edit/EditLocationPage";

export default function SettingsLocationsWrapper() {
  const location = useLocation();
  const path = location.pathname;

  let Component = LocationsPage; // Default to list page
  
  if (path.includes("/locations/edit/")) {
    Component = EditLocationPage;
  } else if (path.includes("/locations/new") || path.endsWith("/locations/new")) {
    Component = AddLocationPage;
  }

  return (
    <SettingsLayout>
      <Component />
    </SettingsLayout>
  );
}



