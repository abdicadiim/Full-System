import React, { createContext, useContext, useState, useEffect, useMemo, useRef } from 'react';
import { useUser } from '../auth/UserContext';

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
const DEFAULT_LIGHT_SIDEBAR_COLOR = '#f9fafb';

function normalizeAppearance(value: any, fallback = 'dark') {
  const raw = String(value || '').trim();
  if (!raw) return fallback;
  return raw === 'system' ? 'dark' : raw;
}

function readStoredBranding() {
  try {
    const savedBranding = localStorage.getItem("organization_branding");
    if (!savedBranding) return {};
    const parsed = JSON.parse(savedBranding);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function mergeBrandingPayload(existing: any, incoming: any) {
  const merged = {
    ...(existing && typeof existing === "object" ? existing : {}),
    ...(incoming && typeof incoming === "object" ? incoming : {}),
  };

  merged.appearance = normalizeAppearance(
    merged.appearance,
    normalizeAppearance(existing?.appearance, 'dark')
  );

  return merged;
}

function normalizeModuleSettings(value: any) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

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

function setDocumentFavicon(href: string) {
  if (!href) return;
  const head = document.head || document.getElementsByTagName("head")[0];
  const existing =
    (head.querySelector('link[rel="icon"]') as HTMLLinkElement | null) ||
    (head.querySelector('link[rel="shortcut icon"]') as HTMLLinkElement | null);

  const link = existing || (document.createElement("link") as HTMLLinkElement);
  link.rel = existing?.rel || "icon";
  link.type = "image/png";
  const commit = (iconHref: string) => {
    link.href = iconHref;
    if (!existing) head.appendChild(link);
  };

  const renderCircularFavicon = (source: string) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const size = 64;
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        commit(source);
        return;
      }

      ctx.clearRect(0, 0, size, size);
      ctx.save();
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(img, 0, 0, size, size);
      ctx.restore();

      commit(canvas.toDataURL("image/png"));
    };
    img.onerror = () => commit(source);
    img.src = source;
  };

  if (href.startsWith("data:image")) {
    renderCircularFavicon(href);
    return;
  }

  renderCircularFavicon(href);
}

export function SettingsProvider({ children }) {
  // Load settings from localStorage or use defaults
  const brandingUpdatedLocallyRef = useRef(false);
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('appSettings');
    const parsedBranding = readStoredBranding();
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const accentColor = String(parsedBranding?.accentColor || parsed.theme?.accentColor || DEFAULT_THEME.accentColor).trim();
        const appearance = normalizeAppearance(parsedBranding?.appearance, parsed.branding?.appearance || "dark");
        const sidebarDarkFrom = String(parsedBranding?.sidebarDarkFrom || "").trim();
        const sidebarLightFrom = String(parsedBranding?.sidebarLightFrom || "").trim();
        const logo = String(parsedBranding?.logo || parsed.branding?.logoUrl || "").trim();
        return {
        general: {
          schoolDisplayName: parsed.general?.schoolDisplayName || 'Taban Enterprise',
          shortName: parsed.general?.shortName || 'Taban',
          companyDisplayName: parsed.general?.companyDisplayName || 'Taban Enterprise',
          organizationEmail: parsed.general?.organizationEmail || "",
          baseCurrency: parsed.general?.baseCurrency || "",
          modules: normalizeModuleSettings(parsed.general?.modules),
        },
          branding: {
            primaryColor: parsed.branding?.primaryColor || DEFAULT_THEME.primaryColor,
            logoUrl: logo,
            logoFile: parsed.branding?.logoFile || '',
            appearance,
          },
          theme: {
            primaryColor: parsed.theme?.primaryColor || DEFAULT_THEME.primaryColor,
            sidebarColor: appearance === "light"
              ? (sidebarLightFrom || parsed.theme?.sidebarColor || DEFAULT_THEME.sidebarColor)
              : (sidebarDarkFrom || parsed.theme?.sidebarColor || DEFAULT_THEME.sidebarColor),
            headerColor: parsed.theme?.headerColor || DEFAULT_THEME.headerColor,
            buttonColor: parsed.theme?.buttonColor || DEFAULT_THEME.buttonColor,
            buttonHoverColor: accentColor || parsed.theme?.buttonHoverColor || DEFAULT_THEME.buttonHoverColor,
            accentColor,
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
        organizationEmail: "",
        baseCurrency: "",
        modules: {},
      },
      branding: {
        primaryColor: DEFAULT_THEME.primaryColor,
        logoUrl: '',
        logoFile: '',
        appearance: 'dark',
      },
      theme: { ...DEFAULT_THEME },
    };
  });

  const [campuses, setCampuses] = useState(DEFAULT_CAMPUSES);
  const [currentCampusId, setCurrentCampusId] = useState('all');
  const [loadingCampuses, setLoadingCampuses] = useState(false);
  const { user, hasChecked } = useUser();

  const applyOrganizationProfileToSettings = (profile: any) => {
    const name = String(profile?.name || profile?.organizationName || "").trim();
    const logo = String(profile?.logoUrl || profile?.logo || "").trim();
    const orgEmail = String(profile?.email || profile?.primaryContactEmail || "").trim();
    const baseCurrency = String(profile?.baseCurrency || "").trim().toUpperCase();

    if (!name && !logo && !orgEmail && !baseCurrency) return;

    setSettings((prev) => {
      const nextName = name || prev.general?.companyDisplayName || prev.general?.schoolDisplayName || "";
      const shortName = nextName.split(/\s+/).filter(Boolean)[0] || prev.general?.shortName || "";
      return {
        ...prev,
        general: {
          ...prev.general,
          ...(nextName ? { companyDisplayName: nextName, schoolDisplayName: nextName, shortName } : {}),
          ...(orgEmail ? { organizationEmail: orgEmail } : {}),
          ...(baseCurrency ? { baseCurrency } : {}),
        },
        branding: {
          ...prev.branding,
          ...(logo ? { logoUrl: logo } : {}),
        },
      };
    });
  };

  const applyBrandingToSettings = (branding: any) => {
    if (!branding) return;

    const accentColor = String(branding?.accentColor || "").trim();
    const sidebarDarkFrom = String(branding?.sidebarDarkFrom || "").trim();
    const sidebarLightFrom = String(branding?.sidebarLightFrom || "").trim();
    const logo = String(branding?.logo || "").trim();
    const hasLogoField = Object.prototype.hasOwnProperty.call(branding, "logo");

    setSettings((prev) => {
      const previousAppearance = normalizeAppearance(prev?.branding?.appearance, 'dark');
      const appearance = normalizeAppearance(branding?.appearance, previousAppearance);
      const nextSidebarColor =
        appearance === "light"
          ? (
              sidebarLightFrom
              || (previousAppearance === "light" ? prev.theme?.sidebarColor : DEFAULT_LIGHT_SIDEBAR_COLOR)
              || DEFAULT_LIGHT_SIDEBAR_COLOR
            )
          : (
              sidebarDarkFrom
              || (previousAppearance === "dark" ? prev.theme?.sidebarColor : DEFAULT_THEME.sidebarColor)
              || DEFAULT_THEME.sidebarColor
            );

      const nextAccent = accentColor || prev.theme?.accentColor || DEFAULT_THEME.accentColor;

      return {
        ...prev,
        branding: {
          ...prev.branding,
          appearance,
          ...(hasLogoField ? { logoUrl: logo } : {}),
        },
        theme: {
          ...prev.theme,
          sidebarColor: nextSidebarColor,
          accentColor: nextAccent,
          buttonHoverColor: nextAccent,
        },
      };
    });
  };

  const applyGeneralSettingsToSettings = (generalSettings: any) => {
    const modules = normalizeModuleSettings(generalSettings?.modules);
    if (!Object.keys(modules).length) return;

    setSettings((prev) => ({
      ...prev,
      general: {
        ...prev.general,
        modules: {
          ...normalizeModuleSettings(prev.general?.modules),
          ...modules,
        },
      },
    }));
  };

  useEffect(() => {
    if (!hasChecked || !user) return;

    try {
      const cached = localStorage.getItem("organization_profile");
      if (cached) applyOrganizationProfileToSettings(JSON.parse(cached));
    } catch {}

    const token = localStorage.getItem("auth_token") || localStorage.getItem("token") || "";
    fetch("/api/settings/organization/profile", {
      credentials: "include",
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    })
      .then((res) => res.json().catch(() => null))
      .then((payload) => {
        const profile = payload?.success ? payload?.data : null;
        if (!profile) return;
        try {
          localStorage.setItem("organization_profile", JSON.stringify(profile));
        } catch {}
        applyOrganizationProfileToSettings(profile);
      })
      .catch(() => {});
  }, [hasChecked, user?.id]);

  useEffect(() => {
    if (!hasChecked || !user) return;

    const token = localStorage.getItem("auth_token") || localStorage.getItem("token") || "";
    fetch("/api/settings/general", {
      credentials: "include",
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    })
      .then((res) => res.json().catch(() => null))
      .then((payload) => {
        const generalSettings = payload?.success ? payload?.data?.settings : null;
        if (!generalSettings) return;
        applyGeneralSettingsToSettings(generalSettings);
      })
      .catch(() => {});
  }, [hasChecked, user?.id]);

  useEffect(() => {
    if (!hasChecked || !user) return;

    try {
      const cached = localStorage.getItem("organization_branding");
      if (cached) applyBrandingToSettings(JSON.parse(cached));
    } catch {}

    const token = localStorage.getItem("auth_token") || localStorage.getItem("token") || "";
    fetch("/api/settings/organization/branding", {
      credentials: "include",
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    })
      .then((res) => res.json().catch(() => null))
      .then((payload) => {
        const branding = payload?.success ? payload?.data : null;
        if (!branding || brandingUpdatedLocallyRef.current) return;
        try {
          localStorage.setItem("organization_branding", JSON.stringify(branding));
        } catch {}
        applyBrandingToSettings(branding);
      })
      .catch(() => {});
  }, [hasChecked, user?.id]);

  useEffect(() => {
    const handleBrandingUpdate = (event: any) => {
      const detail = event?.detail;
      if (!detail) return;
      const hasVisualBrandingFields = Boolean(
        String(detail?.appearance || "").trim()
        || String(detail?.accentColor || "").trim()
        || String(detail?.sidebarDarkFrom || "").trim()
        || String(detail?.sidebarLightFrom || "").trim()
      );
      brandingUpdatedLocallyRef.current = hasVisualBrandingFields;
      const mergedBranding = mergeBrandingPayload(readStoredBranding(), detail);
      try {
        localStorage.setItem("organization_branding", JSON.stringify(mergedBranding));
      } catch {}
      applyBrandingToSettings(mergedBranding);
    };

    window.addEventListener("brandingUpdated" as any, handleBrandingUpdate);
    return () => window.removeEventListener("brandingUpdated" as any, handleBrandingUpdate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handleOrganizationProfileUpdate = (event: any) => {
      const detail = event?.detail;
      if (!detail) return;
      try {
        localStorage.setItem("organization_profile", JSON.stringify(detail));
      } catch {}
      applyOrganizationProfileToSettings(detail);
    };

    window.addEventListener("organizationProfileUpdated" as any, handleOrganizationProfileUpdate);
    return () => window.removeEventListener("organizationProfileUpdated" as any, handleOrganizationProfileUpdate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handleGeneralSettingsUpdate = (event: any) => {
      const detail = event?.detail;
      if (!detail) return;
      applyGeneralSettingsToSettings(detail);
    };

    window.addEventListener("generalSettingsUpdated" as any, handleGeneralSettingsUpdate);
    return () => window.removeEventListener("generalSettingsUpdated" as any, handleGeneralSettingsUpdate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Apply theme colors when settings change
  useEffect(() => {
    if (settings.theme) {
      applyThemeColors(settings.theme);
    }
  }, [settings.theme]);

  useEffect(() => {
    const title = String(settings?.general?.companyDisplayName || settings?.general?.schoolDisplayName || "").trim();
    if (title) document.title = title;
  }, [settings?.general?.companyDisplayName, settings?.general?.schoolDisplayName]);

  useEffect(() => {
    const icon = String(settings?.branding?.logoUrl || settings?.branding?.logoFile || "").trim();
    if (icon) setDocumentFavicon(icon);
  }, [settings?.branding?.logoUrl, settings?.branding?.logoFile]);

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
