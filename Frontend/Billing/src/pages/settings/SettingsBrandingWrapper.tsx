import React, { useState } from "react";
import SettingsLayout from "./SettingsLayout";
import BrandingPage from "./organization-settings/organization/branding/BrandingPage";

export default function SettingsBrandingWrapper() {
  const [accentColor, setAccentColor] = useState("#3b82f6");

  return (
    <SettingsLayout accentColor={accentColor}>
      <BrandingPage onColorChange={setAccentColor} />
    </SettingsLayout>
  );
}

