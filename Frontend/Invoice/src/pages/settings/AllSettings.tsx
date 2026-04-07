import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Search, X, Building2, Users, Receipt, Settings as SettingsIcon, Palette, Zap, Package, CreditCard, ShoppingCart, ShoppingBag, Puzzle, Plug, Code } from "lucide-react";
import { useUser } from "../../lib/auth/UserContext";
import { useSettings } from "../../lib/settings/SettingsContext";
import { usePermissions } from "../../hooks/usePermissions";

const ORGANIZATION_PROFILE_STORAGE_KEYS = ["org_profile", "organization_profile"];

const safeParseJson = (value: string | null) => {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

const readStoredOrganizationProfile = () => {
  if (typeof localStorage === "undefined") return null;

  const profiles = ORGANIZATION_PROFILE_STORAGE_KEYS
    .map((key) => safeParseJson(localStorage.getItem(key)))
    .filter((profile) => profile && typeof profile === "object");

  if (profiles.length === 0) return null;

  return profiles.reduceRight((merged: any, profile: any) => {
    const profileAddress = profile?.address && typeof profile.address === "object" ? profile.address : {};
    const mergedAddress = merged?.address && typeof merged.address === "object" ? merged.address : {};
    return {
      ...profile,
      ...merged,
      address: {
        ...profileAddress,
        ...mergedAddress,
      },
    };
  }, {});
};

const getStoredProfileValue = (profile: any, keys: string[], fallback = "") => {
  if (!profile || typeof profile !== "object") return fallback;
  const address = profile?.address && typeof profile.address === "object" ? profile.address : {};

  for (const key of keys) {
    const candidates = [profile?.[key], address?.[key]];
    for (const candidate of candidates) {
      if (candidate === undefined || candidate === null) continue;
      const text = String(candidate).trim();
      if (text) return text;
    }
  }

  return fallback;
};

const mergeStoredOrganizationProfile = (nextFields: Record<string, string>) => {
  if (typeof localStorage === "undefined") return;

  const existing = readStoredOrganizationProfile() || {};
  const merged = {
    ...existing,
    organizationName: nextFields.organizationName,
    name: nextFields.organizationName,
    businessType: nextFields.businessType,
    industry: nextFields.industry,
    location: nextFields.location,
    country: nextFields.location,
    address: {
      ...(existing as any)?.address,
      country: nextFields.location,
    },
  };

  for (const key of ORGANIZATION_PROFILE_STORAGE_KEYS) {
    localStorage.setItem(key, JSON.stringify(merged));
  }
};

export default function AllSettings() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSetting, setSelectedSetting] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const storedOrgProfile = useMemo(() => readStoredOrganizationProfile(), []);
  const [organizationNameDraft, setOrganizationNameDraft] = useState(() =>
    getStoredProfileValue(storedOrgProfile, ["organizationName", "name"], "Taban enterprise") || "Taban enterprise",
  );
  const [businessTypeDraft, setBusinessTypeDraft] = useState(() =>
    getStoredProfileValue(storedOrgProfile, ["businessType"], "Select") || "Select",
  );
  const [industryDraft, setIndustryDraft] = useState(() =>
    getStoredProfileValue(storedOrgProfile, ["industry"], "Agriculture") || "Agriculture",
  );
  const [locationDraft, setLocationDraft] = useState(() =>
    getStoredProfileValue(storedOrgProfile, ["location", "country"], "Algeria") || "Algeria",
  );

  const { user } = useUser();
  const { hasPermission } = usePermissions();
  const { settings } = useSettings();
  const organizationName = String(settings?.general?.companyDisplayName || settings?.general?.schoolDisplayName || "").trim() || "Organization";
  const hasSettingsAccess = hasPermission("settings");

  const getItemLabel = (item: any) => (typeof item === "string" ? item : item?.label || "");

  const canSeeOrgItem = (label: string) => {
    if (!label) return false;
    if (label === "Profile" || label === "Branding" || label === "Custom Domain") {
      return hasPermission("settings", "Update organization profile");
    }
    if (label === "Users") return hasPermission("settings", "Users");
    if (label === "Roles") return hasPermission("settings", "Roles");
    if (label === "Taxes") return hasPermission("settings", "Taxes");
    if (label === "Customer Portal" || label === "Vendor Portal") return hasSettingsAccess;
    if (label === "General") {
      return hasPermission("settings", "General preferences");
    }
    if (label === "Currencies") {
      return hasPermission("settings", "Currencies");
    }
    if (label === "Opening Balances") {
      return hasSettingsAccess;
    }
    if (label === "Reminders") {
      return hasPermission("settings", "Reminders");
    }
    if (label === "Transaction Number Series") {
      return hasPermission("settings", "Manage Integration") || hasSettingsAccess;
    }
    if (label === "PDF Templates") {
      return hasPermission("settings", "Templates");
    }
    if (label === "Email Notifications") {
      return hasPermission("settings", "Email Notifications");
    }
    if (label === "Reporting Tags") {
      return hasPermission("settings", "Reporting Tags");
    }
    if (label === "Web Tabs") {
      return hasPermission("settings", "Manage Integration");
    }
    if (label === "Workflow Rules" || label === "Workflow Actions" || label === "Workflow Logs" || label === "Schedules") {
      return hasPermission("settings", "Automation");
    }
    return hasSettingsAccess;
  };

  const canSeeModuleItem = (sectionTitle: string, label: string) => {
    if (!label) return false;
    const normalizedSection = String(sectionTitle || "").toLowerCase();
    const normalizedLabel = String(label || "").toLowerCase();

    if (normalizedSection === "general") {
      if (normalizedLabel === "customers and vendors" || normalizedLabel === "customers") return hasPermission("customers", "Customers");
      if (normalizedLabel === "items" || normalizedLabel === "inventory adjustments") return hasPermission("items", "Item");
      if (normalizedLabel === "accountant") return hasPermission("accountant");
      if (normalizedLabel === "projects" || normalizedLabel === "timesheet") return hasPermission("timesheets", "Projects");
      if (normalizedLabel === "reports") return hasPermission("reports");
      return hasSettingsAccess;
    }

    if (normalizedSection === "inventory") {
      return hasPermission("items", "Item");
    }

    if (normalizedSection === "sales") {
      if (normalizedLabel === "customers") return hasPermission("customers", "Customers");
      if (normalizedLabel === "recurring invoices") return hasPermission("subscriptions");
      return hasPermission("sales");
    }

    if (normalizedSection === "purchases") {
      if (normalizedLabel === "expenses" || normalizedLabel === "recurring expenses") return hasPermission("expenses", "Expenses");
      return hasPermission("purchases");
    }

    return hasSettingsAccess;
  };

  const canSeeExtensionItem = () => hasSettingsAccess;

  // Sections are hardcoded to visible: true per user request "i need all of them disply it"
  const organizationSettings = [
    {
      icon: Building2,
      color: "green",
      title: "Organization",
      visible: true,
      items: [
        { label: "Profile", path: "/settings/profile" },
        { label: "Branding", path: "/settings/branding" },
        { label: "Custom Domain", path: "/settings/custom-domain" },
        { label: "Locations", path: "/settings/locations", badge: "NEW" },
        { label: "Manage Subscription", path: "/settings/subscription" },
      ],
    },
    {
      icon: Users,
      color: "pink",
      title: "Users & Roles",
      visible: true,
      items: [
        { label: "Users", path: "/settings/users" },
        { label: "Roles", path: "/settings/roles" },
      ],
    },
    {
      icon: Receipt,
      color: "blue",
      title: "Taxes & Compliance",
      visible: true,
      items: [
        { label: "Taxes", path: "/settings/taxes" },
      ],
    },
    {
      icon: SettingsIcon,
      color: "orange",
      title: "Setup & Configurations",
      visible: true,
      items: [
        { label: "General", path: "/settings/general" },
        { label: "Currencies", path: "/settings/currencies" },
        { label: "Opening Balances", path: "/settings/opening-balances" },
        { label: "Reminders", path: "/settings/reminders" },
        { label: "Customer Portal", path: "/settings/customer-portal" },
        { label: "Vendor Portal", path: "/settings/vendor-portal" },
      ],
    },
    {
      icon: Palette,
      color: "yellow",
      title: "Customization",
      visible: true,
      items: [
        { label: "Transaction Number Series", path: "/settings/customization/transaction-number-series" },
        { label: "PDF Templates", path: "/settings/customization/pdf-templates" },
        { label: "Email Notifications", path: "/settings/customization/email-notifications" },
        { label: "Reporting Tags", path: "/settings/customization/reporting-tags" },
        { label: "Web Tabs", path: "/settings/customization/web-tabs" },
      ],
    },
    {
      icon: Zap,
      color: "red",
      title: "Automation",
      visible: true,
      items: [
        "Workflow Rules",
        "Workflow Actions",
        "Workflow Logs",
        "Schedules",
      ],
    },
  ];

  const moduleSettings = [
    {
      icon: SettingsIcon,
      color: "green",
      title: "General",
      description: "Configure core master data used across transactions and reports.",
      visible: true,
      items: [
        "Customers and Vendors",
        "Items",
        "Accountant",
        "Projects",
        "Timesheet",
        "Reports",
      ],
    },
    {
      icon: Package,
      color: "pink",
      title: "Inventory",
      description: "Track stock movement, quantity/value adjustments, and inventory controls.",
      visible: true,
      items: ["Inventory Adjustments"],
    },
    {
      icon: ShoppingCart,
      color: "green",
      title: "Sales",
      description: "Handle daily sales with fast billing and clean records for every customer transaction.",
      visible: true,
        items: [
          "Customers",
          "Quotes",
          "Invoices",
          "Sales Receipts",
          "Payments Received",
          "Credit Notes",
          "Delivery Notes",
          "Packing Slips",
        ],
    },
    {
      icon: ShoppingBag,
      color: "green",
      title: "Purchases",
      description: "Manage vendor-side spend from purchase orders to bills, expenses, and payments.",
      visible: true,
      items: [
        "Expenses",
        "Recurring Expenses",
        "Purchase Orders",
        "Bills",
        "Recurring Bills",
        "Payments Made",
        "Vendor Credits",
      ],
    },
  ];

  const extensionSettings = [
    {
      icon: Plug,
      color: "green",
      title: "Integrations & Market...",
      items: [
        "Zoho Apps",
        "WhatsApp",
        "SMS Integrations",
        "Other Apps",
        "Marketplace",
      ],
    },
    {
      icon: Code,
      color: "orange",
      title: "Developer Data",
      items: [
        "Incoming Webhooks",
        "Connections",
        "API Usage",
        "Signals",
        "Data Management",
        "Deluge Components Usage",
        "Web Forms",
      ],
    },
  ];

  const getColorClasses = (color) => {
    const colors = {
      green: "bg-green-100 text-green-600",
      pink: "bg-pink-100 text-pink-600",
      blue: "bg-blue-100 text-blue-600",
      orange: "bg-orange-100 text-orange-600",
      yellow: "bg-yellow-100 text-yellow-600",
      red: "bg-red-100 text-red-600",
    };
    return colors[color] || colors.green;
  };

  const filterItems = (items, query) => {
    if (!query) return items;
    const lowerQuery = query.toLowerCase();
    return items.filter((item) => {
      const label = typeof item === "string" ? item : item.label || item.title || "";
      return label.toLowerCase().includes(lowerQuery);
    });
  };

  const orgSettingsVisible = organizationSettings
    .map((setting) => ({
      ...setting,
      items: setting.items.filter((item: any) => canSeeOrgItem(getItemLabel(item))),
    }))
    .filter((setting) => setting.items.length > 0);

  const moduleSettingsVisible = moduleSettings
    .map((setting) => ({
      ...setting,
      items: setting.items.filter((item: any) => canSeeModuleItem(setting.title, getItemLabel(item))),
    }))
    .filter((setting) => setting.items.length > 0);

  const extensionSettingsVisible = extensionSettings
    .map((setting) => ({
      ...setting,
      items: setting.items.filter(() => canSeeExtensionItem()),
    }))
    .filter((setting) => setting.items.length > 0);

  const filteredOrgSettings = filterItems(orgSettingsVisible, searchQuery);
  const filteredModuleSettings = filterItems(moduleSettingsVisible, searchQuery);
  const filteredExtensionSettings = filterItems(extensionSettingsVisible, searchQuery);

  const persistProfileDraft = (nextDraft?: Partial<{
    organizationName: string;
    businessType: string;
    industry: string;
    location: string;
  }>) => {
    mergeStoredOrganizationProfile({
      organizationName: nextDraft?.organizationName ?? organizationNameDraft,
      businessType: nextDraft?.businessType ?? businessTypeDraft,
      industry: nextDraft?.industry ?? industryDraft,
      location: nextDraft?.location ?? locationDraft,
    });
  };

  // Hide sidebar when on settings page
  useEffect(() => {
    const sidebar = document.querySelector('aside');
    if (sidebar) {
      sidebar.style.display = 'none';
    }
    return () => {
      if (sidebar) {
        sidebar.style.display = '';
      }
    };
  }, []);

  // Ensure settings page always opens at top
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.scrollTo(0, 0);
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 w-full ml-0 pl-0">
      {/* Top Bar */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-50 w-full">
        <div className="px-6 py-4 flex items-center justify-between max-w-full">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
              B
            </div>
            <div>
              <div className="text-lg font-semibold text-gray-900">All Settings</div>
              <div className="text-sm text-gray-500">{organizationName}</div>
            </div>
          </div>

          <div className="flex-1 max-w-md mx-8">
            <div className="relative">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search settings ( / )"
                className="w-full h-10 pl-9 pr-4 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg flex items-center gap-2"
          >
            <X size={16} />
            Close Settings
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="w-full px-6 py-8">
        {/* Organization Settings */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Organization Settings</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredOrgSettings.map((setting, idx) => {
              const Icon = setting.icon;
              return (
                <div
                  key={idx}
                  className="rounded-lg bg-transparent p-4 transition-colors hover:bg-white/40"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-10 h-10 rounded-lg ${getColorClasses(setting.color)} flex items-center justify-center`}>
                      <Icon size={20} />
                    </div>
                    <h3 className="font-semibold text-gray-900">{setting.title}</h3>
                  </div>
                  <ul className="space-y-1">
                    {setting.items.map((item, itemIdx) => {
                      const label = typeof item === "string" ? item : item.label;
                      const badge = typeof item === "object" ? item.badge : null;
                      return (
                        <li
                          key={itemIdx}
                          onClick={() => {
                            const path = typeof item === "object" && item.path ? item.path : null;
                            if (path) {
                              navigate(path);
                            } else if (label === "Profile") {
                              navigate("/settings/profile");
                            } else if (label === "Branding") {
                              navigate("/settings/branding");
                            } else if (label === "Custom Domain") {
                              navigate("/settings/custom-domain");
                            } else if (label === "Locations") {
                              navigate("/settings/locations");
                            } else if (label === "Users") {
                              navigate("/settings/users");
                            } else if (label === "Roles") {
                              navigate("/settings/roles");
                            } else if (label === "Taxes") {
                              navigate("/settings/taxes");
                            } else if (label === "General") {
                              navigate("/settings/general");
                            } else if (label === "Currencies") {
                              navigate("/settings/currencies");
                            } else if (label === "Opening Balances") {
                              navigate("/settings/opening-balances");
                            } else if (label === "Reminders") {
                              navigate("/settings/reminders");
                            } else if (label === "Customer Portal") {
                              navigate("/settings/customer-portal");
                            } else if (label === "Vendor Portal") {
                              navigate("/settings/vendor-portal");
                            } else if (label === "Transaction Number Series") {
                              navigate("/settings/customization/transaction-number-series");
                            } else if (label === "PDF Templates") {
                              navigate("/settings/customization/pdf-templates");
                            } else if (label === "Email Notifications") {
                              navigate("/settings/customization/email-notifications");
                            } else if (label === "Reporting Tags") {
                              navigate("/settings/customization/reporting-tags");
                            } else if (label === "Web Tabs") {
                              navigate("/settings/customization/web-tabs");
                            } else if (label === "Workflow Rules") {
                              navigate("/settings/workflow-rules");
                            } else if (label === "Workflow Actions") {
                              navigate("/settings/workflow-actions");
                            } else if (label === "Workflow Logs") {
                              navigate("/settings/workflow-logs");
                            } else if (label === "Schedules") {
                              navigate("/settings/schedules");
                            } else {
                              setSelectedSetting(label);
                              setSelectedCategory(setting.title);
                            }
                          }}
                          className="text-sm text-gray-600 hover:text-blue-600 cursor-pointer py-1 flex items-center justify-between"
                        >
                          <span>{label}</span>
                          {badge && (
                            <span className="text-xs bg-red-500 text-white px-1.5 py-0.5 rounded">
                              {badge}
                            </span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>

        {/* Module Settings */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Module Settings</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredModuleSettings.map((setting, idx) => {
              const Icon = setting.icon;
              return (
                <div
                  key={idx}
                  className="rounded-lg bg-transparent p-4 transition-colors hover:bg-white/40"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-10 h-10 rounded-lg ${getColorClasses(setting.color)} flex items-center justify-center`}>
                      <Icon size={20} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{setting.title}</h3>
                      {setting.description && (
                        <p className="text-xs text-gray-500 mt-0.5 max-w-[260px]">{setting.description}</p>
                      )}
                    </div>
                  </div>
                  <ul className="space-y-1">
                    {setting.items.map((item, itemIdx) => (
                      <li
                        key={itemIdx}
                        onClick={() => {
                          if (item === "Customers and Vendors") {
                            navigate("/settings/customers-vendors");
                          } else if (item === "Customers") {
                            navigate("/sales/customers");
                          } else if (item === "Items") {
                            navigate("/settings/items");
                          } else if (item === "Accountant") {
                            navigate("/settings/accountant");
                          } else if (item === "Projects") {
                            navigate("/settings/projects");
                          } else if (item === "Timesheet") {
                            navigate("/settings/timesheet");
                          } else if (item === "Reports") {
                            navigate("/reports");
                          } else if (item === "Inventory Adjustments") {
                            navigate("/settings/inventory-adjustments");
                          } else if (item === "Quotes") {
                            navigate("/settings/quotes");
                          } else if (item === "Invoices") {
                            navigate("/settings/invoices");
                          } else if (item === "Recurring Invoices") {
                            navigate("/settings/recurring-invoices");
                          } else if (item === "Sales Receipts") {
                            navigate("/settings/sales-receipts");
                          } else if (item === "Payments Received") {
                            navigate("/settings/payments-received");
                          } else if (item === "Credit Notes") {
                            navigate("/settings/credit-notes");
                          } else if (item === "Delivery Notes") {
                            navigate("/settings/delivery-notes");
                          } else if (item === "Packing Slips") {
                            navigate("/settings/packing-slips");
                          } else if (item === "Expenses") {
                            navigate("/settings/expenses");
                          } else if (item === "Purchase Orders") {
                            navigate("/settings/purchase-orders");
                          } else if (item === "Bills") {
                            navigate("/settings/bills");
                          } else if (item === "Recurring Bills") {
                            navigate("/settings/recurring-bills");
                          } else if (item === "Payments Made") {
                            navigate("/settings/payments-made");
                          } else if (item === "Vendor Credits") {
                            navigate("/settings/vendor-credits");
                          } else {
                            setSelectedSetting(item);
                            setSelectedCategory(setting.title);
                          }
                        }}
                        className="text-sm text-gray-600 hover:text-blue-600 cursor-pointer py-1"
                      >
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>

        {/* Extension Settings */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Integrations & Developer</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredExtensionSettings.map((setting, idx) => {
              const Icon = setting.icon;
              return (
                <div
                  key={idx}
                  className="rounded-lg bg-transparent p-4 transition-colors hover:bg-white/40"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-10 h-10 rounded-lg ${getColorClasses(setting.color)} flex items-center justify-center`}>
                      <Icon size={20} />
                    </div>
                    <h3 className="font-semibold text-gray-900">{setting.title}</h3>
                  </div>
                  <ul className="space-y-1">
                    {setting.items.map((item, itemIdx) => (
                      <li
                        key={itemIdx}
                        onClick={() => {
                          setSelectedSetting(item);
                          setSelectedCategory(setting.title);
                        }}
                        className="text-sm text-gray-600 hover:text-blue-600 cursor-pointer py-1"
                      >
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* Side Panel */}
      {selectedSetting && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-end">
          <div className="bg-white h-full w-full max-w-2xl overflow-y-auto shadow-2xl">
            {/* Panel Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSelectedSetting(null)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M12.5 5l-5 5 5 5" stroke="#374151" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">{selectedSetting}</h2>
                  {selectedCategory && (
                    <div className="text-sm text-gray-500">{selectedCategory}</div>
                  )}
                </div>
              </div>
              <button
                onClick={() => setSelectedSetting(null)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X size={20} className="text-gray-600" />
              </button>
            </div>

            {/* Panel Content */}
            <div className="p-6">
              {selectedSetting === "Profile" && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-base font-semibold text-gray-900 mb-4">Organization Profile</h3>
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] items-center gap-3">
                        <label className="text-sm font-medium text-red-500">
                          Organization Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={organizationNameDraft}
                          onChange={(e) => {
                            const next = e.target.value;
                            setOrganizationNameDraft(next);
                            persistProfileDraft({ organizationName: next });
                          }}
                          className="w-full h-10 px-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] items-center gap-3">
                        <label className="text-sm font-medium text-gray-700">
                          Business Type
                        </label>
                        <select
                          value={businessTypeDraft}
                          onChange={(e) => {
                            const next = e.target.value;
                            setBusinessTypeDraft(next);
                            persistProfileDraft({ businessType: next });
                          }}
                          className="w-full h-10 px-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="Select">Select</option>
                          <option value="Sole Proprietorship">Sole Proprietorship</option>
                          <option value="Partnership">Partnership</option>
                          <option value="Limited Liability Company (LLC)">Limited Liability Company (LLC)</option>
                          <option value="Corporation">Corporation</option>
                          <option value="Non-profit">Non-profit</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] items-center gap-3">
                        <label className="text-sm font-medium text-red-500">
                          Industry <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={industryDraft}
                          onChange={(e) => {
                            const next = e.target.value;
                            setIndustryDraft(next);
                            persistProfileDraft({ industry: next });
                          }}
                          className="w-full h-10 px-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="Agriculture">Agriculture</option>
                          <option value="Consulting">Consulting</option>
                          <option value="Education">Education</option>
                          <option value="Financial Services">Financial Services</option>
                          <option value="Health Care">Health Care</option>
                          <option value="Manufacturing">Manufacturing</option>
                          <option value="Technology">Technology</option>
                        </select>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] items-center gap-3">
                        <label className="text-sm font-medium text-red-500">
                          Organization Location <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={locationDraft}
                          onChange={(e) => {
                            const next = e.target.value;
                            setLocationDraft(next);
                            persistProfileDraft({ location: next });
                          }}
                          className="w-full h-10 px-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="Algeria">Algeria</option>
                          <option value="Somalia">Somalia</option>
                          <option value="Kenya">Kenya</option>
                          <option value="United States">United States</option>
                          <option value="United Kingdom">United Kingdom</option>
                          <option value="Canada">Canada</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {selectedSetting !== "Profile" && (
                <div className="text-center py-12">
                  <p className="text-gray-500">{selectedSetting} settings will be displayed here.</p>
                </div>
              )}
            </div>

            {/* Panel Footer */}
            {selectedSetting === "Profile" && (
              <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex items-center justify-end gap-3">
                <button
                  onClick={() => {
                    persistProfileDraft();
                    setSelectedSetting(null);
                  }}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    persistProfileDraft();
                    setSelectedSetting(null);
                  }}
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
                >
                  Save
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
