import React, { useState, useRef, useEffect } from "react";
import { Upload, X, Moon, Sun, Check } from "lucide-react";

const API_BASE_URL = '/api';

export default function BrandingPage({ onColorChange }) {
  const [logoImage, setLogoImage] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [appearance, setAppearance] = useState("dark"); // Default to dark, will update from API
  const [accentColor, setAccentColor] = useState("blue");
  const [keepZohoBranding, setKeepZohoBranding] = useState(false);
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
  const [customColor, setCustomColor] = useState("#9374F5");
  const [hue, setHue] = useState(260);
  const [saturation, setSaturation] = useState(75);
  const [lightness, setLightness] = useState(75);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [showSuccessNotification, setShowSuccessNotification] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const notificationTimeoutRef = useRef(null);
  const fileInputRef = useRef(null);
  const colorPickerRef = useRef(null);
  const saveTimeoutRef = useRef(null);

  // Load branding data on mount
  useEffect(() => {
    const loadBranding = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        if (!token) {
          setAppearance("dark"); // Default if no token
          setIsInitialLoad(false);
          return;
        }

        const response = await fetch(`${API_BASE_URL}/settings/organization/branding`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data) {
            const branding = data.data;
            // Convert "system" to "dark" for backward compatibility
            const appearanceValue = branding.appearance === "system" ? "dark" : (branding.appearance || "dark");
            setAppearance(appearanceValue);
            setAccentColor(branding.accentColor || "blue");
            setKeepZohoBranding(branding.keepZohoBranding || false);

            // Load logo from profile - check both branding.logo and fetch from profile if needed
            if (branding.logo) {
              setLogoPreview(branding.logo);
            } else {
              // Also try to load logo directly from profile
              try {
                const profileResponse = await fetch(`${API_BASE_URL}/settings/organization/profile`, {
                  headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                  },
                });
                if (profileResponse.ok) {
                  const profileData = await profileResponse.json();
                  if (profileData.success && profileData.data && profileData.data.logo) {
                    setLogoPreview(profileData.data.logo);
                  }
                }
              } catch (profileError) {
                console.error('Error loading logo from profile:', profileError);
              }
            }
          } else {
            // No branding data found, use defaults
            setAppearance("dark");
          }
        } else {
          // API error, use defaults
          setAppearance("dark");
        }
      } catch (error) {
        console.error('Error loading branding:', error);
        // On error, use defaults
        setAppearance("dark");
      } finally {
        // Always set initial load to false, even if there's an error
        setIsInitialLoad(false);
      }
    };

    loadBranding();
  }, []);

  const accentColors = [
    { name: "blue", value: "#3b82f6", label: "Blue" },
    { name: "green", value: "#10b981", label: "Green" },
    { name: "red", value: "#ef4444", label: "Red" },
    { name: "orange", value: "#f97316", label: "Orange" },
    { name: "purple", value: "#a855f7", label: "Purple" }
  ];

  const selectedColor = accentColor === "custom"
    ? customColor
    : accentColors.find(c => c.name === accentColor)?.value || "#3b82f6";

  // Convert HSL to Hex
  const hslToHex = (h, s, l) => {
    s /= 100;
    l /= 100;
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs((h / 60) % 2 - 1));
    const m = l - c / 2;
    let r = 0, g = 0, b = 0;

    if (0 <= h && h < 60) {
      r = c; g = x; b = 0;
    } else if (60 <= h && h < 120) {
      r = x; g = c; b = 0;
    } else if (120 <= h && h < 180) {
      r = 0; g = c; b = x;
    } else if (180 <= h && h < 240) {
      r = 0; g = x; b = c;
    } else if (240 <= h && h < 300) {
      r = x; g = 0; b = c;
    } else if (300 <= h && h < 360) {
      r = c; g = 0; b = x;
    }
    r = Math.round((r + m) * 255).toString(16).padStart(2, '0');
    g = Math.round((g + m) * 255).toString(16).padStart(2, '0');
    b = Math.round((b + m) * 255).toString(16).padStart(2, '0');
    return `#${r}${g}${b}`;
  };

  // Convert Hex to HSL
  const hexToHsl = (hex) => {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;

    if (max === min) {
      h = s = 0;
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
        default: h = 0;
      }
    }
    return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
  };

  // Update custom color when HSL changes
  useEffect(() => {
    setCustomColor(hslToHex(hue, saturation, lightness));
  }, [hue, saturation, lightness]);

  // Close color picker on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (colorPickerRef.current && !colorPickerRef.current.contains(event.target)) {
        setIsColorPickerOpen(false);
      }
    };
    if (isColorPickerOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isColorPickerOpen]);

  const handleColorChange = (colorName) => {
    setAccentColor(colorName);
    const colorValue = accentColors.find(c => c.name === colorName)?.value || "#3b82f6";

    // Immediate optimistic update (Instant Feedback)
    const darkColor = "#156372";
    const lightGreyFrom = "#f9fafb";
    const lightGreyTo = "#f3f4f6";

    const eventData = {
      appearance: appearance,
      accentColor: colorValue,
      sidebarDarkFrom: darkColor,
      sidebarDarkTo: darkColor,
      sidebarLightFrom: lightGreyFrom,
      sidebarLightTo: lightGreyTo
    };
    window.dispatchEvent(new CustomEvent('brandingUpdated', { detail: eventData }));

    if (onColorChange) {
      onColorChange(colorValue);
    }
    // Auto-save will be triggered by useEffect
  };

  const handleCustomColorApply = () => {
    setAccentColor("custom");
    if (onColorChange) {
      onColorChange(customColor);
    }
    setIsColorPickerOpen(false);
    // Auto-save will be triggered by useEffect
  };

  const handleHexChange = (e) => {
    const hexValue = e.target.value;
    const hex = hexValue.startsWith('#') ? hexValue : `#${hexValue}`;
    if (/^#[0-9A-Fa-f]{6}$/i.test(hex)) {
      setCustomColor(hex);
      const [h, s, l] = hexToHsl(hex);
      setHue(h);
      setSaturation(s);
      setLightness(l);
    } else if (hexValue.length <= 6) {
      setCustomColor(hex);
    }
  };

  const handleColorSquareClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const s = Math.round((x / rect.width) * 100);
    const l = Math.round(100 - (y / rect.height) * 100);
    setSaturation(Math.max(0, Math.min(100, s)));
    setLightness(Math.max(0, Math.min(100, l)));
  };

  const handleHueSliderClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const h = Math.round((x / rect.width) * 360);
    setHue(Math.max(0, Math.min(360, h)));
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/bmp'];
      if (!validTypes.includes(file.type)) {
        alert('Please select a valid image file (jpg, jpeg, png, gif, bmp)');
        return;
      }

      // Validate file size (1MB = 1048576 bytes)
      if (file.size > 1048576) {
        alert('File size must be less than 1MB');
        return;
      }

      setLogoImage(file);

      // Create preview and auto-save
      const reader = new FileReader();
      reader.onloadend = async () => {
        const result = reader.result;
        setLogoPreview(result);
        // Auto-save logo immediately after upload
        if (!isInitialLoad) {
          await autoSaveBranding(false, null, false, null, "logo"); // Include logo, pass "logo" as changeType
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLogoClick = () => {
    fileInputRef.current?.click();
  };

  const handleRemoveLogo = async (e) => {
    e.stopPropagation();
    setLogoImage(null);
    setLogoPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    // Auto-save empty logo
    if (!isInitialLoad) {
      await autoSaveBranding(false, null, false, null, "logo"); // Include logo (empty), pass "logo" as changeType
    }
  };

  // Auto-save branding function
  const autoSaveBranding = async (skipLogo = false, newLogoFile = null, immediate = false, appearanceOverride = null, changeType = "branding") => {
    // Don't save during initial load
    if (isInitialLoad) return;

    // Clear any existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    const saveFunction = async () => {
      setIsSaving(true);

      try {
        const token = localStorage.getItem('auth_token');
        if (!token) {
          setIsSaving(false);
          return;
        }

        // Use override appearance if provided, otherwise use state
        const currentAppearance = appearanceOverride || appearance;

        // Convert logo to base64 if image file is selected (only if not skipping)
        let logoBase64 = logoPreview || "";
        if (!skipLogo && logoImage) {
          try {
            const reader = new FileReader();
            logoBase64 = await new Promise((resolve, reject) => {
              reader.onloadend = () => {
                const result = reader.result;
                if (typeof result === 'string') {
                  if (result.length > 5000000) {
                    reject(new Error('Logo file is too large. Please use an image smaller than 1MB.'));
                  } else {
                    resolve(result);
                  }
                } else {
                  reject(new Error('Failed to read logo file as string'));
                }
              };
              reader.onerror = reject;
              reader.readAsDataURL(logoImage);
            });
          } catch (logoError) {
            console.error('Error processing logo:', logoError);
            setIsSaving(false);
            return;
          }
        }

        const selectedColorValue = accentColor === "custom"
          ? customColor
          : accentColors.find(c => c.name === accentColor)?.value || "#3b82f6";

        // Set sidebar colors based on appearance
        // Dark mode: Solid New button color
        const darkColor = "#156372"; // Solid New button color (same for from and to)
        // Light mode: Light grey (expense form background)
        const lightGreyFrom = "#f9fafb"; // bg-gray-50
        const lightGreyTo = "#f3f4f6"; // bg-gray-100

        const brandingData: any = {
          appearance: currentAppearance,
          accentColor: selectedColorValue,
          keepZohoBranding: keepZohoBranding,
          sidebarDarkFrom: darkColor,
          sidebarDarkTo: darkColor, // Same color for solid (no gradient)
          sidebarLightFrom: lightGreyFrom,
          sidebarLightTo: lightGreyTo,
        };

        // Only include logo if we're not skipping it
        if (!skipLogo) {
          brandingData.logo = logoBase64;
        }

        const response = await fetch(`${API_BASE_URL}/settings/organization/branding`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(brandingData),
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            // Update sidebar in real-time by dispatching event with appropriate colors
            const darkColor = "#156372"; // Solid New button color
            const lightGreyFrom = "#f9fafb"; // bg-gray-50
            const lightGreyTo = "#f3f4f6"; // bg-gray-100
            const eventData = {
              appearance: currentAppearance,
              accentColor: selectedColorValue,
              logo: brandingData.logo, // Include logo in the event
              sidebarDarkFrom: darkColor,
              sidebarDarkTo: darkColor,
              sidebarLightFrom: lightGreyFrom,
              sidebarLightTo: lightGreyTo
            };
            console.log("📤 Dispatching branding update event:", eventData);
            window.dispatchEvent(new CustomEvent('brandingUpdated', {
              detail: eventData
            }));

            // Show success notification based on what changed
            if (changeType === "logo") {
              setSuccessMessage("Logo has been saved.");
            } else if (changeType === "appearance") {
              setSuccessMessage("Theme preference has been saved.");
            } else if (changeType === "accent") {
              setSuccessMessage("Accent color has been saved.");
            } else {
              setSuccessMessage("Branding preference has been saved.");
            }
            setShowSuccessNotification(true);

            // Auto-hide notification after 3 seconds
            if (notificationTimeoutRef.current) {
              clearTimeout(notificationTimeoutRef.current as any);
            }
            notificationTimeoutRef.current = setTimeout(() => {
              setShowSuccessNotification(false);
            }, 3000) as any;
          }
        }
      } catch (error) {
        console.error('Error auto-saving branding:', error);
      } finally {
        setIsSaving(false);
      }
    };

    // If immediate is true, save right away, otherwise use very short debounce for faster response
    if (immediate) {
      saveFunction();
    } else {
      saveTimeoutRef.current = setTimeout(saveFunction, 50); // Very short debounce for faster updates (50ms)
    }
  };

  // Auto-save when appearance changes - but skip if triggered by button click (already handled with immediate save)
  // Note: Button clicks already handle the save immediately, this is a backup for programmatic changes
  useEffect(() => {
    if (!isInitialLoad && appearance) {
      // Use very short delay for appearance changes to save faster
      // The button click handler already saves immediately, so this is just a backup
      const timeoutId = setTimeout(() => {
        autoSaveBranding(true, null, false, appearance, "appearance"); // Pass appearance and changeType
      }, 50); // Slightly longer delay to let button click save first
      return () => clearTimeout(timeoutId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appearance]);

  // Auto-save and update UI when accent color changes
  useEffect(() => {
    if (!isInitialLoad) {
      // Immediate UI update for custom color changes (e.g. while dragging color picker)
      const selectedColorValue = accentColor === "custom"
        ? customColor
        : accentColors.find(c => c.name === accentColor)?.value || "#3b82f6";

      const darkColor = "#0c4c59ff";
      const lightGreyFrom = "#f9fafb";
      const lightGreyTo = "#f3f4f6";

      const eventData = {
        appearance: appearance,
        accentColor: selectedColorValue,
        sidebarDarkFrom: darkColor,
        sidebarDarkTo: darkColor,
        sidebarLightFrom: lightGreyFrom,
        sidebarLightTo: lightGreyTo
      };
      window.dispatchEvent(new CustomEvent('brandingUpdated', { detail: eventData }));

      autoSaveBranding(true, null, false, null, "accent"); // Skip logo, pass "accent" as changeType
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accentColor, customColor]);

  // Auto-save when keepZohoBranding changes
  useEffect(() => {
    if (!isInitialLoad) {
      autoSaveBranding(true); // Skip logo for toggle changes
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keepZohoBranding]);

  // Cleanup notification timeout on unmount
  useEffect(() => {
    return () => {
      if (notificationTimeoutRef.current) {
        clearTimeout(notificationTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Branding</h1>
      </div>

      {/* Organization Logo */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Organization Logo</h2>
        <div className="flex gap-6">
          <div className="flex-shrink-0">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/gif,image/bmp"
              onChange={handleLogoUpload}
              className="hidden"
            />
            <div
              className="w-48 h-48 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 transition relative bg-gray-50"
              onClick={handleLogoClick}
            >
              {logoPreview ? (
                <>
                  <img
                    src={logoPreview}
                    alt="Organization Logo"
                    className="w-full h-full object-contain rounded-lg"
                  />
                  <button
                    onClick={handleRemoveLogo}
                    className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition"
                    title="Remove logo"
                  >
                    <X size={16} />
                  </button>
                  <div className="absolute bottom-2 left-2 right-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded text-center">
                    Click to change
                  </div>
                </>
              ) : (
                <>
                  <Upload size={32} className="text-gray-400 mb-2" />
                  <span className="text-sm font-medium text-gray-600 text-center px-2">Upload Your Organization Logo</span>
                </>
              )}
            </div>
          </div>
          <div className="flex-1">
            <p className="text-sm text-gray-600 mb-4">
              This logo will be displayed in transaction PDFs and email notifications.
            </p>
            <div className="space-y-1 text-xs text-gray-500">
              <p>Preferred Image Dimensions: 240 x 240 pixels @ 72 DPI</p>
              <p>Supported Files: jpg, jpeg, png, gif, bmp</p>
              <p>Maximum File Size: 1MB</p>
            </div>
          </div>
        </div>
      </div>

      {/* Appearance */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Appearance</h2>
        <div className="grid grid-cols-2 gap-4 max-w-md">
          <button
            onClick={async () => {
              const newAppearance = "dark";
              setAppearance(newAppearance);
              // Immediately update sidebar without waiting for debounce
              const darkColor = "#156372";
              const lightGreyFrom = "#f9fafb";
              const lightGreyTo = "#f3f4f6";
              const eventData = {
                appearance: newAppearance,
                accentColor: selectedColor,
                sidebarDarkFrom: darkColor,
                sidebarDarkTo: darkColor,
                sidebarLightFrom: lightGreyFrom,
                sidebarLightTo: lightGreyTo
              };
              // Immediately update sidebar (instant visual feedback)
              window.dispatchEvent(new CustomEvent('brandingUpdated', { detail: eventData }));
              // Save immediately without debounce
              setIsInitialLoad(false);
              // Clear any pending save
              if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
              }
              // Force immediate save without debounce, passing the appearance value
              autoSaveBranding(true, null, true, newAppearance, "appearance");
            }}
            className={`p-3 rounded-lg border-2 transition ${appearance === "dark"
              ? "border-blue-500 bg-blue-50"
              : "border-gray-200 hover:border-gray-300"
              }`}
          >
            <div className="flex items-center justify-center mb-2">
              <Moon size={18} className="text-gray-600" />
            </div>
            <div className="text-xs font-semibold text-gray-900 mb-2 text-center">DARK PANE</div>
            <div className="flex gap-1 h-12 rounded overflow-hidden">
              <div className="w-1/3 relative" style={{ backgroundColor: "#156372" }}>
                <div className="absolute bottom-0 left-0 right-0 h-1" style={{ backgroundColor: selectedColor }}></div>
              </div>
              <div className="flex-1 bg-slate-100"></div>
            </div>
          </button>
          <button
            onClick={async () => {
              const newAppearance = "light";
              setAppearance(newAppearance);
              // Immediately update sidebar without waiting for debounce
              const darkColor = "#156372";
              const lightGreyFrom = "#f9fafb";
              const lightGreyTo = "#f3f4f6";
              const eventData = {
                appearance: newAppearance,
                accentColor: selectedColor,
                sidebarDarkFrom: darkColor,
                sidebarDarkTo: darkColor,
                sidebarLightFrom: lightGreyFrom,
                sidebarLightTo: lightGreyTo
              };
              // Immediately update sidebar (instant visual feedback)
              window.dispatchEvent(new CustomEvent('brandingUpdated', { detail: eventData }));
              // Save immediately without debounce
              setIsInitialLoad(false);
              // Clear any pending save
              if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
              }
              // Force immediate save without debounce, passing the appearance value
              autoSaveBranding(true, null, true, newAppearance, "appearance");
            }}
            className={`p-3 rounded-lg border-2 transition ${appearance === "light"
              ? "border-blue-500 bg-blue-50"
              : "border-gray-200 hover:border-gray-300"
              }`}
          >
            <div className="flex items-center justify-center mb-2">
              <Sun size={18} className="text-gray-600" />
            </div>
            <div className="text-xs font-semibold text-gray-900 mb-2 text-center">LIGHT PANE</div>
            <div className="flex gap-1 h-12 rounded overflow-hidden">
              <div className="w-1/3 bg-gradient-to-b from-[#f9fafb] to-[#f3f4f6] relative border border-gray-200">
                <div className="absolute bottom-0 left-0 right-0 h-1" style={{ backgroundColor: selectedColor }}></div>
              </div>
              <div className="flex-1 bg-white border border-gray-200"></div>
            </div>
          </button>
        </div>
      </div>

      {/* Accent Color */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Accent Color</h2>
          <button
            onClick={() => setIsColorPickerOpen(true)}
            className="px-3 py-1.5 rounded-lg border border-gray-300 bg-gray-50 text-sm font-medium text-gray-700 hover:bg-gray-100 transition"
          >
            Custom Color
          </button>
        </div>
        <div className="flex gap-3 mb-4">
          {accentColors.map((color) => (
            <button
              key={color.name}
              onClick={() => handleColorChange(color.name)}
              className={`w-12 h-12 rounded-lg border-2 transition relative ${accentColor === color.name
                ? "border-gray-800 ring-2 ring-offset-2 ring-gray-300"
                : "border-gray-300 hover:border-gray-400"
                }`}
              style={{ backgroundColor: color.value }}
              title={color.label}
            >
              {accentColor === color.name && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Check size={20} className="text-white drop-shadow-lg" />
                </div>
              )}
            </button>
          ))}
        </div>
        <p className="text-sm text-gray-600">
          Note: These preferences will be applied across Taban Finance apps, including the customer and vendor portals.
        </p>
      </div>

      {/* Auto-save indicator */}
      {isSaving && (
        <div className="fixed bottom-4 right-4 z-50 px-4 py-2 rounded-lg shadow-lg bg-blue-500 text-white text-sm">
          Saving...
        </div>
      )}

      {/* Success notification */}
      {showSuccessNotification && (
        <div className="fixed bottom-4 right-4 z-50 transition-all duration-300 ease-in-out">
          <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 shadow-lg flex items-center gap-3 min-w-[300px] max-w-md">
            <div className="bg-green-600 rounded-lg p-2 flex-shrink-0">
              <Check size={20} className="text-white" />
            </div>
            <span className="text-sm font-medium text-gray-900 flex-1">
              {successMessage}
            </span>
            <button
              onClick={() => {
                setShowSuccessNotification(false);
                if (notificationTimeoutRef.current) {
                  clearTimeout(notificationTimeoutRef.current);
                }
              }}
              className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
              aria-label="Close notification"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Color Picker Modal */}
      {isColorPickerOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000]">
          <div
            ref={colorPickerRef}
            className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Select Color</h3>

            {/* Color Square */}
            <div className="mb-4">
              <div
                className="w-full h-48 rounded-lg cursor-crosshair relative overflow-hidden"
                style={{
                  background: `linear-gradient(to bottom, transparent, hsl(${hue}, 100%, 50%)), linear-gradient(to right, white, transparent)`
                }}
                onClick={handleColorSquareClick}
              >
                <div
                  className="absolute w-4 h-4 border-2 border-white rounded-full shadow-lg transform -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                  style={{
                    left: `${saturation}%`,
                    top: `${100 - lightness}%`,
                    boxShadow: '0 0 0 1px rgba(0,0,0,0.2)'
                  }}
                />
              </div>
            </div>

            {/* Hue Slider */}
            <div className="mb-4">
              <div
                className="w-full h-8 rounded-lg cursor-pointer relative"
                style={{
                  background: 'linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)'
                }}
                onClick={handleHueSliderClick}
              >
                <div
                  className="absolute w-4 h-4 border-2 border-white rounded-full shadow-lg transform -translate-x-1/2 -translate-y-1/2 top-1/2 pointer-events-none"
                  style={{
                    left: `${(hue / 360) * 100}%`,
                    boxShadow: '0 0 0 1px rgba(0,0,0,0.2)'
                  }}
                />
              </div>
            </div>

            {/* Hex Input */}
            <div className="mb-4 flex items-center gap-3">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Hex Code</label>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 font-medium">#</span>
                  <input
                    type="text"
                    value={customColor.replace('#', '')}
                    onChange={handleHexChange}
                    className="flex-1 h-10 px-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
                    placeholder="9374F5"
                    maxLength={6}
                  />
                </div>
              </div>
              <div className="mt-6">
                <div
                  className="w-12 h-12 rounded-lg border-2 border-gray-300"
                  style={{ backgroundColor: customColor }}
                />
              </div>
            </div>

            {/* Swatches Link */}
            <div className="mb-4">
              <button className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <rect x="2" y="2" width="12" height="12" rx="2" fill="url(#gradient)" />
                  <defs>
                    <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#3b82f6" />
                      <stop offset="50%" stopColor="#a855f7" />
                      <stop offset="100%" stopColor="#ec4899" />
                    </linearGradient>
                  </defs>
                </svg>
                Swatches &gt;
              </button>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setIsColorPickerOpen(false)}
                className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCustomColorApply}
                className="px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

