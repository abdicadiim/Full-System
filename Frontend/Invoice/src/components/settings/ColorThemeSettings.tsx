import React, { useState } from 'react';
import { useSettings } from '../../lib/settings/SettingsContext';

export default function ColorThemeSettings() {
  const { settings, updateTheme } = useSettings();
  const theme = settings?.theme || {};

  const [localTheme, setLocalTheme] = useState(() => ({
    primaryColor: theme.primaryColor || '#005766',
    sidebarColor: theme.sidebarColor || 'rgb(21, 99, 114)',
    headerColor: theme.headerColor || '#005766',
    buttonColor: theme.buttonColor || 'rgb(21, 99, 114)',
    buttonHoverColor: theme.buttonHoverColor || 'rgb(245, 178, 33)',
    accentColor: theme.accentColor || 'rgb(245, 178, 33)',
  }));

  // Update local theme when settings change externally
  React.useEffect(() => {
    if (settings?.theme) {
      setLocalTheme({
        primaryColor: settings.theme.primaryColor || '#005766',
        sidebarColor: settings.theme.sidebarColor || 'rgb(21, 99, 114)',
        headerColor: settings.theme.headerColor || '#005766',
        buttonColor: settings.theme.buttonColor || 'rgb(21, 99, 114)',
        buttonHoverColor: settings.theme.buttonHoverColor || 'rgb(245, 178, 33)',
        accentColor: settings.theme.accentColor || 'rgb(245, 178, 33)',
      });
    }
  }, [settings?.theme]);

  const handleColorChange = (key, value) => {
    setLocalTheme((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSave = () => {
    updateTheme(localTheme);
    alert('Theme colors updated successfully!');
  };

  const handleReset = () => {
    const defaultTheme = {
      primaryColor: '#005766',
      sidebarColor: 'rgb(21, 99, 114)',
      headerColor: '#005766',
      buttonColor: 'rgb(21, 99, 114)',
      buttonHoverColor: 'rgb(245, 178, 33)',
      accentColor: 'rgb(245, 178, 33)',
    };
    setLocalTheme(defaultTheme);
    updateTheme(defaultTheme);
    alert('Theme colors reset to defaults!');
  };

  // Helper to convert rgb to hex for color input
  const rgbToHex = (rgb) => {
    if (rgb.startsWith('#')) return rgb;
    const match = rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
    if (!match) return rgb;
    const r = parseInt(match[1], 10).toString(16).padStart(2, '0');
    const g = parseInt(match[2], 10).toString(16).padStart(2, '0');
    const b = parseInt(match[3], 10).toString(16).padStart(2, '0');
    return `#${r}${g}${b}`;
  };

  // Helper to convert hex to rgb
  const hexToRgb = (hex) => {
    if (!hex.startsWith('#')) return hex;
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return hex;
    return `rgb(${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)})`;
  };

  const handleColorInputChange = (key, value) => {
    // If it's a hex color, convert to rgb for sidebar/button colors that expect rgb
    if (key === 'sidebarColor' || key === 'buttonColor' || key === 'buttonHoverColor' || key === 'accentColor') {
      if (value.startsWith('#')) {
        handleColorChange(key, hexToRgb(value));
      } else {
        handleColorChange(key, value);
      }
    } else {
      handleColorChange(key, value);
    }
  };

  const ColorPicker = ({ label, description, colorKey, value }) => {
    const displayValue = value.startsWith('rgb') ? rgbToHex(value) : value;
    
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <label className="block text-sm font-medium text-slate-700">
              {label}
            </label>
            {description && (
              <p className="text-xs text-slate-500 mt-0.5">{description}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={displayValue}
              onChange={(e) => handleColorInputChange(colorKey, e.target.value)}
              className="h-10 w-20 cursor-pointer rounded border border-slate-300"
            />
            <input
              type="text"
              value={value}
              onChange={(e) => handleColorChange(colorKey, e.target.value)}
              className="w-32 rounded-md border border-slate-300 px-2 py-1.5 text-sm font-mono"
              placeholder="#005766 or rgb(21, 99, 114)"
            />
          </div>
        </div>
        <div
          className="h-12 w-full rounded-lg border border-slate-200 shadow-sm"
          style={{ backgroundColor: value }}
        />
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Color Theme Customization</h2>
        <p className="text-sm text-slate-600 mt-1">
          Customize the colors used throughout the system including buttons, sidebar, header, and accent colors.
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-6">
        <ColorPicker
          label="Primary Color"
          description="Main brand color used for primary elements"
          colorKey="primaryColor"
          value={localTheme.primaryColor}
        />

        <div className="border-t border-slate-200 pt-6">
          <ColorPicker
            label="Sidebar Background"
            description="Background color of the sidebar navigation"
            colorKey="sidebarColor"
            value={localTheme.sidebarColor}
          />
        </div>

        <div className="border-t border-slate-200 pt-6">
          <ColorPicker
            label="Header Background"
            description="Background color of the top header"
            colorKey="headerColor"
            value={localTheme.headerColor}
          />
        </div>

        <div className="border-t border-slate-200 pt-6">
          <ColorPicker
            label="Button Color"
            description="Default color for primary buttons"
            colorKey="buttonColor"
            value={localTheme.buttonColor}
          />
        </div>

        <div className="border-t border-slate-200 pt-6">
          <ColorPicker
            label="Button Hover Color"
            description="Color buttons change to on hover"
            colorKey="buttonHoverColor"
            value={localTheme.buttonHoverColor}
          />
        </div>

        <div className="border-t border-slate-200 pt-6">
          <ColorPicker
            label="Accent Color"
            description="Accent color for highlights and special elements"
            colorKey="accentColor"
            value={localTheme.accentColor}
          />
        </div>

        <div className="border-t border-slate-200 pt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={handleReset}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Reset to Defaults
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors"
            style={{
              backgroundColor: localTheme.buttonColor,
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = localTheme.buttonHoverColor;
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = localTheme.buttonColor;
            }}
          >
            Save Changes
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <h3 className="text-sm font-medium text-slate-900 mb-2">Preview</h3>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div
              className="h-10 w-32 rounded-lg flex items-center justify-center text-white text-sm font-medium"
              style={{ backgroundColor: localTheme.sidebarColor }}
            >
              Sidebar
            </div>
            <div
              className="h-10 flex-1 rounded-lg flex items-center justify-center text-white text-sm font-medium"
              style={{ backgroundColor: localTheme.headerColor }}
            >
              Header
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors"
              style={{
                backgroundColor: localTheme.buttonColor,
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = localTheme.buttonHoverColor;
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = localTheme.buttonColor;
              }}
            >
              Button Preview
            </button>
            <div
              className="px-4 py-2 text-sm font-medium rounded-lg border-2"
              style={{
                borderColor: localTheme.accentColor,
                color: localTheme.accentColor,
              }}
            >
              Accent Element
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
