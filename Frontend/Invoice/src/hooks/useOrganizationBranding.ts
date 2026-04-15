import { useSettings } from "../lib/settings/SettingsContext";

export const useOrganizationBranding = () => {
  const { settings } = useSettings();
  const theme = settings?.theme || {};
  const branding = settings?.branding || {};

  return {
    accentColor:
      theme.accentColor ||
      theme.primaryColor ||
      branding.primaryColor ||
      "#156372",
  };
};

export default useOrganizationBranding;
