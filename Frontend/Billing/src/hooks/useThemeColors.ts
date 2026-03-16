import { useSettings } from '../lib/settings/SettingsContext';

/**
 * Hook to get theme colors for use in components
 * Returns all theme colors with fallbacks
 */
export function useThemeColors() {
  const { settings } = useSettings();
  const theme = settings?.theme || {};
  const branding = settings?.branding || {};

  return {
    primaryColor: theme.primaryColor || branding.primaryColor || '#005766',
    sidebarColor: theme.sidebarColor || 'rgb(21, 99, 114)',
    headerColor: theme.headerColor || branding.primaryColor || '#005766',
    buttonColor: theme.buttonColor || 'rgb(21, 99, 114)',
    buttonHoverColor: theme.buttonHoverColor || 'rgb(245, 178, 33)',
    accentColor: theme.accentColor || 'rgb(245, 178, 33)',
  };
}

/**
 * Hook to get button styles based on theme
 * Returns style objects for primary buttons
 */
export function useButtonStyles() {
  const colors = useThemeColors();

  return {
    primary: {
      backgroundColor: colors.buttonColor,
      color: '#ffffff',
      border: 'none',
      transition: 'all 0.2s ease',
    },
    primaryHover: {
      backgroundColor: colors.buttonHoverColor,
    },
    getPrimaryStyle: (isHovered = false) => ({
      backgroundColor: isHovered ? colors.buttonHoverColor : colors.buttonColor,
      color: '#ffffff',
      border: 'none',
      transition: 'all 0.2s ease',
    }),
  };
}
