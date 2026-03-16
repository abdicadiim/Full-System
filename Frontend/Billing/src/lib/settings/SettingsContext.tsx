import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';

const SettingsContext = createContext(null);

const DEFAULT_CAMPUSES = [
  { id: 'all', name: 'All Campuses' },
];

// Default theme colors
const DEFAULT_THEME = {
  primaryColor: 'rgb(21, 99, 114)',
  sidebarColor: 'rgb(21, 99, 114)',
  headerColor: 'rgb(21, 99, 114)',
  buttonColor: 'rgb(21, 99, 114)',
  buttonHoverColor: 'rgb(245, 178, 33)',
  accentColor: 'rgb(245, 178, 33)',
};

// Helper function to convert hex to rgb
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? `rgb(${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)})`
    : hex;
}

// Apply CSS variables to document root
function applyThemeColors(theme) {
  const root = document.documentElement;
  
  // Convert hex colors to rgb if needed
  const primaryRgb = theme.primaryColor.startsWith('#') 
    ? hexToRgb(theme.primaryColor) 
    : theme.primaryColor;
  const headerRgb = theme.headerColor.startsWith('#') 
    ? hexToRgb(theme.headerColor) 
    : theme.headerColor;
  const sidebarRgb = theme.sidebarColor.startsWith('#') 
    ? hexToRgb(theme.sidebarColor) 
    : theme.sidebarColor;
  const buttonRgb = theme.buttonColor.startsWith('#') 
    ? hexToRgb(theme.buttonColor) 
    : theme.buttonColor;
  const buttonHoverRgb = theme.buttonHoverColor.startsWith('#') 
    ? hexToRgb(theme.buttonHoverColor) 
    : theme.buttonHoverColor;
  const accentRgb = theme.accentColor.startsWith('#') 
    ? hexToRgb(theme.accentColor) 
    : theme.accentColor;

  root.style.setProperty('--brand', primaryRgb);
  root.style.setProperty('--teal', primaryRgb);
  root.style.setProperty('--sidebar-bg', sidebarRgb);
  root.style.setProperty('--header-bg', headerRgb);
  root.style.setProperty('--button-primary', buttonRgb);
  root.style.setProperty('--button-hover', buttonHoverRgb);
  root.style.setProperty('--accent', accentRgb);
}

export function SettingsProvider({ children }) {
  // Load settings from localStorage or use defaults
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('appSettings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          general: {
            schoolDisplayName: parsed.general?.schoolDisplayName || 'Taban Enterprise',
            shortName: parsed.general?.shortName || 'Taban',
            companyDisplayName: parsed.general?.companyDisplayName || 'Taban Enterprise',
          },
          branding: {
            primaryColor: parsed.branding?.primaryColor || DEFAULT_THEME.primaryColor,
            logoUrl: parsed.branding?.logoUrl || '',
            logoFile: parsed.branding?.logoFile || '',
          },
          theme: {
            primaryColor: parsed.theme?.primaryColor || DEFAULT_THEME.primaryColor,
            sidebarColor: parsed.theme?.sidebarColor || DEFAULT_THEME.sidebarColor,
            headerColor: parsed.theme?.headerColor || DEFAULT_THEME.headerColor,
            buttonColor: parsed.theme?.buttonColor || DEFAULT_THEME.buttonColor,
            buttonHoverColor: parsed.theme?.buttonHoverColor || DEFAULT_THEME.buttonHoverColor,
            accentColor: parsed.theme?.accentColor || DEFAULT_THEME.accentColor,
          },
        };
      } catch (e) {
        console.error('Error parsing saved settings:', e);
      }
    }
    return {
      general: {
        schoolDisplayName: 'Taban Enterprise',
        shortName: 'Taban',
        companyDisplayName: 'Taban Enterprise',
      },
      branding: {
        primaryColor: DEFAULT_THEME.primaryColor,
        logoUrl: '',
        logoFile: '',
      },
      theme: { ...DEFAULT_THEME },
    };
  });

  const [campuses, setCampuses] = useState(DEFAULT_CAMPUSES);
  const [currentCampusId, setCurrentCampusId] = useState('all');
  const [loadingCampuses, setLoadingCampuses] = useState(false);

  // Apply theme colors when settings change
  useEffect(() => {
    if (settings.theme) {
      applyThemeColors(settings.theme);
    }
  }, [settings.theme]);

  // Save settings to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('appSettings', JSON.stringify(settings));
  }, [settings]);

  const setCampus = (campusId, campusData) => {
    setCurrentCampusId(campusId);
    localStorage.setItem('currentCampusId', campusId);
  };

  // Update theme colors
  const updateTheme = (themeUpdates) => {
    setSettings((prev) => ({
      ...prev,
      theme: {
        ...prev.theme,
        ...themeUpdates,
      },
    }));
  };

  useEffect(() => {
    // Load saved campus from localStorage
    const savedCampusId = localStorage.getItem('currentCampusId');
    if (savedCampusId) {
      setCurrentCampusId(savedCampusId);
    }
  }, []);

  const value = useMemo(
    () => ({
      settings,
      setSettings,
      updateTheme,
      campuses,
      setCampuses,
      currentCampusId,
      setCampus,
      loadingCampuses,
    }),
    [settings, campuses, currentCampusId, loadingCampuses]
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
