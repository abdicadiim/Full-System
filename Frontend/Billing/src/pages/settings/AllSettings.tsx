import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, X, Building2, Users, Receipt, Settings as SettingsIcon, Palette, Zap, CreditCard, ShoppingCart, ShoppingBag, Puzzle, Plug, Code, RefreshCw, BarChart3 } from "lucide-react";
import { useUser } from "../../lib/auth/UserContext";
import { useSettings } from "../../lib/settings/SettingsContext";
import { usePermissions } from "../../hooks/usePermissions";

export default function AllSettings() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSetting, setSelectedSetting] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);

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
    if (label === "Locations") {
      return hasPermission("locations", "Locations");
    }
    if (label === "Manage Subscription") {
      return hasSettingsAccess;
    }
    if (label === "Users") {
      return hasPermission("settings", "Users");
    }
    if (label === "Roles") {
      return hasPermission("settings", "Roles");
    }
    if (label === "User Preferences") {
      return hasPermission("settings", "General preferences");
    }
    if (label === "Taxes") {
      return hasPermission("settings", "Taxes");
    }
    if (label === "General") {
      return hasPermission("settings", "General preferences");
    }
    if (label === "Currencies") {
      return hasPermission("settings", "Currencies");
    }
    if (label === "Reminders") {
      return hasPermission("settings", "Reminders");
    }
    if (label === "Hosted Payment Pages") {
      return hasPermission("settings", "Hosted Pages");
    }
    if (label === "Transaction Number Series") {
      return hasPermission("settings", "Payment Terms") || hasPermission("settings", "Manage Integration");
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
    if (label === "Workflow Actions" || label === "Workflow Logs" || label === "Schedules" || label === "Workflow Rules") {
      return hasPermission("settings", "Automation");
    }
    return hasSettingsAccess;
  };

  const canSeeModuleItem = (sectionTitle: string, label: string) => {
    if (!label) return false;
    const normalizedSection = String(sectionTitle || "").toLowerCase();
    const normalizedLabel = String(label || "").toLowerCase();

    if (normalizedSection === "general") {
      if (normalizedLabel === "customers") return hasPermission("customers", "Customers");
      if (normalizedLabel === "items") return hasPermission("items", "Item");
      if (normalizedLabel === "tasks") return hasPermission("tasks", "Tasks");
      if (normalizedLabel === "projects" || normalizedLabel === "timesheet") return hasPermission("timesheets", "Projects");
      if (normalizedLabel === "reports") return hasPermission("reports");
      return hasSettingsAccess;
    }

    if (normalizedSection === "online payments") {
      return hasPermission("payments");
    }

    if (normalizedSection === "sales") {
      if (normalizedLabel === "customers") return hasPermission("customers", "Customers");
      return hasPermission("sales");
    }

    if (normalizedSection === "subscriptions") {
      return hasPermission("subscriptions");
    }

    if (normalizedSection === "purchases") {
      return hasPermission("purchases");
    }

    if (normalizedSection === "customer portal") {
      return hasSettingsAccess;
    }

    if (normalizedSection === "custom modules") {
      return hasSettingsAccess;
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
        { label: "User Preferences", path: "/settings/user-preferences" },
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
        { label: "Reminders", path: "/settings/reminders" },
      ],
    },
    {
      icon: Palette,
      color: "yellow",
      title: "Customization",
      visible: true,
      items: [
        { label: "Hosted Payment Pages", path: "/settings/online-payments" },
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
      description: "",
      visible: true,
      items: [
        "Customers",
        "Items",
        "Tasks",
        "Projects",
        "Timesheet",
        "Reports",
      ],
    },
    {
      icon: CreditCard,
      color: "orange",
      title: "Online Payments",
      description: "",
      visible: true,
      items: ["Payment Gateways"],
    },
    {
      icon: ShoppingCart,
      color: "green",
      title: "Sales",
      description: "",
      visible: true,
      items: [
        "Quotes",
        "Retainer Invoices",
        "Invoices",
        "Sales Receipts",
        "Payments Received",
        "Credit Notes",
        "Delivery Notes",
        "Packing Slips",
      ],
    },
    {
      icon: RefreshCw,
      color: "green",
      title: "Subscriptions",
      description: "",
      visible: true,
      items: [
        "General",
        "Billing Preferences",
        "Advance Billing",
        "Dunning Management",
        "Cancellation Preferences",
      ],
    },
    {
      icon: ShoppingBag,
      color: "green",
      title: "Purchases",
      description: "",
      visible: true,
      items: [
        "Expenses",
        "Recurring Expenses",
      ],
    },
    {
      icon: Users,
      color: "green",
      title: "Customer Portal",
      description: "",
      visible: true,
      items: [
        "General",
        "Subscription Management",
      ],
    },
    {
      icon: Puzzle,
      color: "blue",
      title: "Custom Modules",
      description: "",
      visible: true,
      items: [
        "Overview",
      ],
    },
  ];

  const extensionSettings = [
    {
      icon: Plug,
      color: "green",
      title: "Integrations & Marketplaces",
      items: [
        "Zoho Apps",
        "WhatsApp",
        "SMS Integrations",
        "Accounting",
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

  const navigateFromSettingsLabel = (item: any, label: string, sectionTitle: string) => {
    const path = typeof item === "object" && item.path ? item.path : null;
    if (path) {
      navigate(path);
      return;
    }

    if (label === "Profile") {
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
    } else if (label === "User Preferences") {
      navigate("/settings/user-preferences");
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
    } else if (label === "Workflow Actions") {
      navigate("/settings/workflow-actions");
    } else if (label === "Workflow Logs") {
      navigate("/settings/workflow-logs");
    } else if (label === "Schedules") {
      navigate("/settings/schedules");
    } else {
      setSelectedSetting(label);
      setSelectedCategory(sectionTitle);
    }
  };

  const renderSettingItems = (setting: any, compact = false) => (
    <ul className={compact ? "px-4 py-3 space-y-1" : "space-y-1"}>
      {setting.items.map((item: any, itemIdx: number) => {
        const label = typeof item === "string" ? item : item.label;
        const badge = typeof item === "object" ? item.badge : null;
        return (
          <li
            key={itemIdx}
            onClick={() => navigateFromSettingsLabel(item, label, setting.title)}
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
  );

  const renderBandedSettingCard = (setting: any, toneClass: string) => {
    const Icon = setting.icon;
    return (
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition-shadow h-full flex flex-col">
        <div className={`flex items-center gap-3 px-4 py-3 border-b border-gray-200 ${toneClass}`}>
          <div className={`w-10 h-10 rounded-lg ${getColorClasses(setting.color)} flex items-center justify-center`}>
            <Icon size={20} />
          </div>
          <h3 className="font-semibold text-gray-900">{setting.title}</h3>
        </div>
        <div className="flex-1">
          {renderSettingItems(setting, true)}
        </div>
      </div>
    );
  };

  const renderBandSection = (setting: any, toneClass: string) => {
    const Icon = setting.icon;
    return (
      <div className="flex flex-col">
        <div className={`flex items-center gap-3 px-4 py-3 border-b border-gray-200 ${toneClass}`}>
          <div className={`w-10 h-10 rounded-lg ${getColorClasses(setting.color)} flex items-center justify-center`}>
            <Icon size={20} />
          </div>
          <h3 className="font-semibold text-gray-900">{setting.title}</h3>
        </div>
        <div className="flex-1">
          {renderSettingItems(setting, true)}
        </div>
      </div>
    );
  };

  const navigateFromModuleLabel = (item: any, label: string, sectionTitle: string) => {
    const path = typeof item === "object" && item.path ? item.path : null;
    if (path) {
      navigate(path);
      return;
    }

    if (sectionTitle === "Customer Portal") {
      navigate("/settings/customer-portal");
    } else if (sectionTitle === "Custom Modules") {
      navigate("/settings/custom-modules");
    } else if (sectionTitle === "Subscriptions") {
      navigate("/sales/subscriptions");
    } else if (label === "Customers") {
      if (sectionTitle === "General") {
        navigate("/settings/customers-vendors");
      } else {
        navigate("/sales/customers");
      }
    } else if (label === "Items" || label === "Products") {
      navigate("/settings/items");
    } else if (label === "Reports") {
      navigate("/reports");
    } else if (label === "Tasks") {
      navigate("/settings/tasks");
    } else if (label === "Projects") {
      navigate("/settings/projects");
    } else if (label === "Timesheet") {
      navigate("/settings/timesheet");
    } else if (label === "Payment Gateways") {
      navigate("/settings/online-payments");
    } else if (label === "Quotes") {
      navigate("/settings/quotes");
    } else if (label === "Retainer Invoices") {
      navigate("/sales/retainer-invoices");
    } else if (label === "Invoices") {
      navigate("/settings/invoices");
    } else if (label === "Sales Receipts") {
      navigate("/settings/sales-receipts");
    } else if (label === "Recurring Invoices") {
      navigate("/settings/recurring-invoices");
    } else if (label === "Payments Received") {
      navigate("/settings/payments-received");
    } else if (label === "Credit Notes") {
      navigate("/settings/credit-notes");
    } else if (label === "Delivery Notes") {
      navigate("/settings/delivery-notes");
    } else if (label === "Packing Slips") {
      navigate("/settings/packing-slips");
    } else if (sectionTitle === "Subscriptions") {
      navigate("/sales/subscriptions");
    } else if (label === "Expenses") {
      navigate("/settings/expenses");
    } else if (label === "Recurring Expenses") {
      navigate("/settings/recurring-expenses");
    } else if (label === "Subscription Management" && sectionTitle === "Customer Portal") {
      navigate("/settings/customer-portal");
    } else if (label === "Overview" && sectionTitle === "Custom Modules") {
      navigate("/settings/custom-modules");
    } else {
      setSelectedSetting(label);
      setSelectedCategory(sectionTitle);
    }
  };

  const renderModuleCard = (setting: any, toneClass: string) => {
    const Icon = setting.icon;
    const showDescription = Boolean(setting.description);
    const isGeneralCard = setting.title === "General";
    return (
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition-shadow h-full flex flex-col">
        <div className={`flex items-center gap-3 px-4 py-3 border-b border-gray-200 ${toneClass}`}>
          <div className={`w-10 h-10 rounded-lg ${getColorClasses(setting.color)} flex items-center justify-center`}>
            <Icon size={20} />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{setting.title}</h3>
            {showDescription && (
              <p className="text-xs text-gray-500 mt-0.5 max-w-[260px]">{setting.description}</p>
            )}
          </div>
        </div>
        <div className="flex-1 px-4 py-3">
          <ul className="space-y-1">
            {setting.items.map((item: any, itemIdx: number) => {
              const label = typeof item === "string" ? item : item.label;
              return (
                <li
                  key={itemIdx}
                  onClick={() => navigateFromModuleLabel(item, label, setting.title)}
                  className={isGeneralCard ? "text-sm text-gray-700 hover:text-[#156372] cursor-pointer py-1" : "text-sm text-gray-600 hover:text-blue-600 cursor-pointer py-1"}
                >
                  {label}
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    );
  };

  const renderExtensionCard = (setting: any, toneClass: string) => {
    const Icon = setting.icon;
    return (
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition-shadow h-full flex flex-col">
        <div className={`flex items-center gap-3 px-4 py-3 border-b border-gray-200 ${toneClass}`}>
          <div className={`w-10 h-10 rounded-lg ${getColorClasses(setting.color)} flex items-center justify-center`}>
            <Icon size={20} />
          </div>
          <h3 className="font-semibold text-gray-900 truncate">{setting.title}</h3>
        </div>
        <div className="flex-1 px-4 py-3">
          <ul className="space-y-1">
            {setting.items.map((item: any, itemIdx: number) => (
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
      </div>
    );
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

  return (
    <div className="min-h-screen bg-gray-50 w-full ml-0 pl-0">
      {/* Top Bar */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-50 w-full">
        <div className="px-6 py-4 flex items-center justify-between max-w-full">
          <div className="flex items-center gap-3">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            {filteredOrgSettings.some((setting) => setting.title === "Organization") && (
              renderBandedSettingCard(filteredOrgSettings.find((setting) => setting.title === "Organization"), "bg-gradient-to-r from-green-50 to-transparent")
            )}
            {(filteredOrgSettings.some((setting) => setting.title === "Users & Roles") || filteredOrgSettings.some((setting) => setting.title === "Taxes & Compliance")) && (
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition-shadow h-full flex flex-col">
                {filteredOrgSettings.find((setting) => setting.title === "Users & Roles") && renderBandSection(filteredOrgSettings.find((setting) => setting.title === "Users & Roles"), "bg-gradient-to-r from-pink-50 to-transparent")}
                {filteredOrgSettings.find((setting) => setting.title === "Users & Roles") && filteredOrgSettings.find((setting) => setting.title === "Taxes & Compliance") && (
                  <div className="border-t border-gray-200" />
                )}
                {filteredOrgSettings.find((setting) => setting.title === "Taxes & Compliance") && renderBandSection(filteredOrgSettings.find((setting) => setting.title === "Taxes & Compliance"), "bg-gradient-to-r from-blue-50 to-transparent")}
              </div>
            )}
            {filteredOrgSettings.some((setting) => setting.title === "Setup & Configurations") && (
              renderBandedSettingCard(filteredOrgSettings.find((setting) => setting.title === "Setup & Configurations"), "bg-gradient-to-r from-orange-50 to-transparent")
            )}
            {filteredOrgSettings.some((setting) => setting.title === "Customization") && (
              renderBandedSettingCard(filteredOrgSettings.find((setting) => setting.title === "Customization"), "bg-gradient-to-r from-yellow-50 to-transparent")
            )}
            {filteredOrgSettings.some((setting) => setting.title === "Automation") && (
              renderBandedSettingCard(filteredOrgSettings.find((setting) => setting.title === "Automation"), "bg-gradient-to-r from-red-50 to-transparent")
            )}
          </div>
        </div>

        {/* Module Settings */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Module Settings</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            {filteredModuleSettings.map((setting, idx) => {
              const isGeneralCard = setting.title === "General";
              const headerClass = setting.title === "General"
                ? "bg-gradient-to-r from-green-50 to-transparent"
                : setting.title === "Online Payments"
                  ? "bg-gradient-to-r from-orange-50 to-transparent"
                  : setting.title === "Sales"
                    ? "bg-gradient-to-r from-green-50 to-transparent"
                    : setting.title === "Subscriptions"
                      ? "bg-gradient-to-r from-emerald-50 to-transparent"
                      : setting.title === "Customer Portal"
                        ? "bg-gradient-to-r from-green-50 to-transparent"
                        : setting.title === "Custom Modules"
                          ? "bg-gradient-to-r from-blue-50 to-transparent"
                      : "bg-gradient-to-r from-green-50 to-transparent";
              return (
                <div key={idx} className={isGeneralCard ? "h-full" : "h-full"}>
                  {renderModuleCard(setting, headerClass)}
                </div>
              );
            })}
          </div>
        </div>

        {/* Extension Settings */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Extension and Developer Data</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            {filteredExtensionSettings.map((setting, idx) => {
              const toneClass = setting.title === "Developer Data"
                ? "bg-gradient-to-r from-orange-50 to-transparent"
                : "bg-gradient-to-r from-green-50 to-transparent";
              return (
                <div key={idx} className="h-full">
                  {renderExtensionCard(setting, toneClass)}
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
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Organization Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          defaultValue="Taban enterprise"
                          className="w-full h-10 px-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Industry <span className="text-red-500">*</span>
                        </label>
                        <select className="w-full h-10 px-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500">
                          <option>Agriculture</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Organization Location <span className="text-red-500">*</span>
                        </label>
                        <select className="w-full h-10 px-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500">
                          <option>Algeria</option>
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
                  onClick={() => setSelectedSetting(null)}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
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
