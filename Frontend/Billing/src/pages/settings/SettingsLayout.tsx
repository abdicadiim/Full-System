import React, { useState, useEffect } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { Search, X, Building2, Users, Receipt, Settings as SettingsIcon, Palette, Zap, CreditCard, ShoppingCart, ShoppingBag, Puzzle, Plug, Code, RefreshCw, ChevronDown, ChevronRight } from "lucide-react";
import { getToken, API_BASE_URL } from "../../services/auth";
import { useSettings } from "../../lib/settings/SettingsContext";

const ACCENT = "#156372";

const organizationSettings = [
  {
    icon: Building2,
    color: "green",
    title: "Organization",
    path: "/settings/profile",
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
    path: "/settings/users",
    items: [
      { label: "Users", path: "/settings/users" },
      { label: "Roles", path: "/settings/roles" },
      { label: "User Preferences", path: "/settings/user-preferences" },
    ],
  },
  {
    icon: Receipt,
    color: "sky",
    iconSize: 18,
    iconStrokeWidth: 2.25,
    title: "Taxes & Compliance",
    path: "/settings/taxes",
    items: [
      { label: "Taxes", path: "/settings/taxes" },
    ],
  },
  {
    icon: SettingsIcon,
    color: "orange",
    title: "Setup & Configurations",
    path: "/settings/general",
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
    path: "/settings/customization",
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
    path: "/settings/workflow-actions",
    items: [
      { label: "Workflow Actions", path: "/settings/workflow-actions" },
      { label: "Workflow Logs", path: "/settings/workflow-logs" },
      { label: "Schedules", path: "/settings/schedules" },
    ],
  },
];

const moduleSettings = [
  {
    icon: SettingsIcon,
    color: "green",
    title: "General",
    path: "/settings/customers-vendors",
    items: [
      { label: "Customers", path: "/settings/customers-vendors" },
      { label: "Items", path: "/settings/items" },
      { label: "Tasks", path: "/settings/tasks" },
      { label: "Projects", path: "/settings/projects" },
      { label: "Timesheet", path: "/settings/timesheet" },
    ],
  },
  {
    icon: CreditCard,
    color: "orange",
    title: "Online Payments",
    path: "/settings/online-payments",
    items: [
      { label: "Payment Gateways", path: "/settings/online-payments" },
    ],
  },
  {
    icon: ShoppingCart,
    color: "green",
    title: "Sales",
    path: "/settings/quotes",
    items: [
      { label: "Quotes", path: "/settings/quotes" },
      { label: "Invoices", path: "/settings/invoices" },
      { label: "Recurring Invoices", path: "/settings/recurring-invoices" },
      { label: "Sales Receipts", path: "/settings/sales-receipts" },
      { label: "Payments Received", path: "/settings/payments-received" },
      { label: "Credit Notes", path: "/settings/credit-notes" },
      { label: "Delivery Notes", path: "/settings/delivery-notes" },
      { label: "Packing Slips", path: "/settings/packing-slips" },
    ],
  },
  {
    icon: RefreshCw,
    color: "green",
    title: "Subscriptions",
    path: "/sales/subscriptions",
    items: [
      { label: "General", path: "/settings/subscription/general" },
      { label: "Billing Preferences", path: "/settings/subscription/billing-preferences" },
      { label: "Advance Billing", path: "/settings/subscription/advance-billing" },
      { label: "Dunning Management", path: "/settings/subscription/dunning-management" },
      { label: "Cancellation Preferences", path: "/settings/subscription/cancellation-preferences" },
    ],
  },
  {
    icon: ShoppingBag,
    color: "green",
    title: "Purchases",
    path: "/settings/expenses",
    items: [
      { label: "Expenses", path: "/settings/expenses" },
      { label: "Recurring Expenses", path: "/settings/recurring-expenses" },
    ],
  },
  {
    icon: Users,
    color: "green",
    title: "Customer Portal",
    path: "/settings/customer-portal",
    items: [
      { label: "General", path: "/settings/customer-portal" },
      { label: "Subscription Management", path: "/settings/customer-portal" },
    ],
  },
  {
    icon: Puzzle,
    color: "indigo",
    iconSize: 18,
    iconStrokeWidth: 2.25,
    title: "Custom Modules",
    path: "/settings/custom-modules",
    items: [
      { label: "Overview", path: "/settings/custom-modules" },
    ],
  },
];

const extensionSettings = [
  {
    icon: Plug,
    color: "green",
    title: "Integrations & Marketplaces",
    path: "/settings/integrations/zoho",
    items: [
      { label: "Zoho Apps", path: "/settings/integrations/zoho" },
      { label: "WhatsApp", path: "/settings/integrations/whatsapp" },
      { label: "SMS Integrations", path: "/settings/integrations/sms" },
      { label: "Accounting", path: "/settings/integrations/accounting" },
      { label: "Other Apps", path: "/settings/integrations/other-apps" },
      { label: "Marketplace", path: "/settings/marketplace" },
    ],
  },
  {
    icon: Code,
    color: "orange",
    title: "Developer Data",
    path: "/settings/developer/webhooks",
    items: [
      { label: "Incoming Webhooks", path: "/settings/developer/webhooks" },
      { label: "Connections", path: "/settings/developer/connections" },
      { label: "API Usage", path: "/settings/developer/api-usage" },
      { label: "Signals", path: "/settings/developer/signals" },
      { label: "Data Management", path: "/settings/developer/data-management" },
      { label: "Deluge Components Usage", path: "/settings/developer/deluge-components-usage" },
      { label: "Web Forms", path: "/settings/developer/web-forms" },
    ],
  },
];

export default function SettingsLayout({ children }: { children?: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { settings } = useSettings();
  const [searchQuery, setSearchQuery] = useState("");
  const [openSectionKey, setOpenSectionKey] = useState<string>("organization");
  const [appearance, setAppearance] = useState("dark");
  const [sidebarColors, setSidebarColors] = useState({
    darkFrom: "#156372",
    darkTo: "#156372",
    lightFrom: "#f9fafb",
    lightTo: "#f3f4f6",
  });
  const organizationName = String(settings?.general?.companyDisplayName || settings?.general?.schoolDisplayName || "").trim() || "Organization";
  const accentColor = String(settings?.theme?.accentColor || "#3b82f6").trim();
  const isLightAccent = accentColor.toLowerCase() === "#ffffff" || accentColor.toLowerCase() === "#fff" || accentColor.toLowerCase() === "white";
  const activeSidebarColor = accentColor;
  const activeSidebarTextColor = isLightAccent ? "#1f2937" : "#ffffff";

  // Load branding data on mount
  useEffect(() => {
    const loadBranding = async () => {
      try {
        const token = getToken();
        if (!token) return;
        const response = await fetch(`${API_BASE_URL}/settings/organization/branding`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data) {
            setAppearance(data.data.appearance || "dark");
            setSidebarColors({
              darkFrom: data.data.sidebarDarkFrom || "#156372",
              darkTo: data.data.sidebarDarkTo || "#156372",
              lightFrom: data.data.sidebarLightFrom || "#f9fafb",
              lightTo: data.data.sidebarLightTo || "#f3f4f6",
            });
          }
        }
      } catch (error) {
        console.error('Error loading branding:', error);
      }
    };
    loadBranding();
  }, []);

  // Listen to branding updated events
  useEffect(() => {
    const handleBrandingUpdate = (event: any) => {
      const { appearance: newAppearance, sidebarDarkFrom, sidebarDarkTo, sidebarLightFrom, sidebarLightTo } = event.detail;
      if (newAppearance) {
        setAppearance(newAppearance);
      }
      if (sidebarDarkFrom || sidebarDarkTo || sidebarLightFrom || sidebarLightTo) {
        setSidebarColors(prev => ({
          darkFrom: sidebarDarkFrom || prev.darkFrom,
          darkTo: sidebarDarkTo || prev.darkTo,
          lightFrom: sidebarLightFrom || prev.lightFrom,
          lightTo: sidebarLightTo || prev.lightTo,
        }));
      }
    };

    window.addEventListener('brandingUpdated' as any, handleBrandingUpdate);
    return () => {
      window.removeEventListener('brandingUpdated' as any, handleBrandingUpdate);
    };
  }, []);

  // Hide main app sidebar when SettingsLayout is mounted
  useEffect(() => {
    const sidebar = document.querySelector('aside');
    const topBar = document.querySelector('header');
    if (sidebar) {
      (sidebar as HTMLElement).style.display = 'none';
    }
    if (topBar) {
      (topBar as HTMLElement).style.display = 'none';
    }
    return () => {
      if (sidebar) {
        (sidebar as HTMLElement).style.display = '';
      }
      if (topBar) {
        (topBar as HTMLElement).style.display = '';
      }
    };
  }, []);

  const getColorClasses = (color: string) => {
    const colors: Record<string, string> = {
      green: "bg-green-100 text-green-600",
      pink: "bg-pink-100 text-pink-600",
      blue: "bg-blue-100 text-blue-600",
      sky: "bg-sky-100 text-sky-600",
      indigo: "bg-indigo-100 text-indigo-600",
      orange: "bg-orange-100 text-orange-600",
      yellow: "bg-yellow-100 text-yellow-600",
      red: "bg-red-100 text-red-600",
    };
    return colors[color] || colors.green;
  };

  const isActive = (path: string) => {
    if (!path) return false;
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const sectionIsActive = (section: any) => {
    if (section.path && isActive(section.path)) return true;
    return Array.isArray(section.items) && section.items.some((item: any) => {
      const itemPath = typeof item === "object" ? item.path : null;
      return itemPath ? isActive(itemPath) : false;
    });
  };

  useEffect(() => {
    const activeSection = [...organizationSettings, ...moduleSettings, ...extensionSettings].find((section) =>
      sectionIsActive(section)
    );

    if (activeSection) {
      setOpenSectionKey(activeSection.title.toLowerCase().replace(/\s+/g, "-"));
    }
  }, [location.pathname]);

  const renderSection = (section: any, idx: number) => {
    const Icon = section.icon;
    const active = sectionIsActive(section);
    const iconSize = section.iconSize ?? 16;
    const iconStrokeWidth = section.iconStrokeWidth ?? 2;
    const sectionKey = section.title.toLowerCase().replace(/\s+/g, "-");
    const isExpanded = openSectionKey === sectionKey;
    return (
      <div key={idx} className="mb-1">
        <button
          onClick={() => setOpenSectionKey(sectionKey)}
          className={`w-full flex items-center gap-2 px-2 py-2 text-sm font-medium rounded-lg transition ${active
            ? "text-white"
            : isExpanded
              ? "bg-white border border-gray-200 text-gray-900"
              : appearance === "light"
                ? "text-gray-700 hover:bg-gray-50"
                : "text-gray-200 hover:bg-white/10"
            }`}
          style={active ? {
          backgroundColor: activeSidebarColor,
          borderColor: activeSidebarColor,
          boxShadow: `0 0 0 1px ${activeSidebarColor} inset`,
          color: activeSidebarTextColor,
          } : {}}
        >
          {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          <div className={`p-1 rounded-md flex-shrink-0 flex items-center justify-center ${getColorClasses(section.color)}`}>
            <Icon size={iconSize} strokeWidth={iconStrokeWidth} />
          </div>
          <span className="flex-1 text-left">{section.title}</span>
        </button>
        {isExpanded && (
          <div className="ml-6 mt-1 space-y-1">
            {section.items.map((item: any, itemIdx: number) => {
              const label = typeof item === "string" ? item : item.label;
              const itemPath = typeof item === "object" ? item.path : null;
              const itemActive = itemPath ? isActive(itemPath) : false;
              return (
                <button
                  key={itemIdx}
                  onClick={() => itemPath && navigate(itemPath)}
                  className={`w-full text-left px-3 py-2 text-sm rounded-lg transition ${itemActive
                    ? "font-medium"
                    : appearance === "light"
                      ? "text-gray-600 hover:bg-gray-50"
                      : "text-gray-300 hover:bg-white/10"
                    }`}
                  style={itemActive ? { backgroundColor: activeSidebarColor, color: activeSidebarTextColor, boxShadow: `0 0 0 1px ${activeSidebarColor} inset` } : {}}
                >
                  <div className="flex items-center justify-between">
                    <span>{label}</span>
                    {typeof item === "object" && item.badge && (
                      <span className="text-xs bg-red-500 text-white px-1.5 py-0.5 rounded">
                        {item.badge}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-gray-50 flex flex-col" style={{ marginLeft: 0, paddingLeft: 0, zIndex: 9999 }}>
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        <div
          className="w-64 border-r flex-shrink-0 overflow-y-auto transition-colors duration-300"
          style={{
            backgroundColor: appearance === "light"
              ? sidebarColors.lightFrom
              : sidebarColors.darkFrom,
            borderColor: appearance === "light"
              ? "#e5e7eb"
              : "rgba(255, 255, 255, 0.1)",
          }}
        >
          <div className="p-4">
            {/* Organization Settings */}
            <div className="mb-6">
              <div className={`text-xs font-semibold uppercase mb-2 px-2 ${appearance === "light" ? "text-gray-500" : "text-gray-400"}`}>
                ORGANIZATION SETTINGS
              </div>
              {organizationSettings.map((section, idx) => renderSection(section, idx))}
            </div>

            {/* Module Settings */}
            <div className="mb-6">
              <div className={`text-xs font-semibold uppercase mb-2 px-2 ${appearance === "light" ? "text-gray-500" : "text-gray-400"}`}>
                MODULE SETTINGS
              </div>
              {moduleSettings.map((section, idx) => renderSection(section, idx))}
            </div>

            {/* Extension Settings */}
            <div className="mb-6">
              <div className={`text-xs font-semibold uppercase mb-2 px-2 ${appearance === "light" ? "text-gray-500" : "text-gray-400"}`}>
                EXTENSION AND DEVELOPER DATA
              </div>
              {extensionSettings.map((section, idx) => renderSection(section, idx))}
            </div>

          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {/* Top Bar */}
          <div className="bg-white border-b border-gray-200 sticky top-0 z-50">
            <div className="px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => navigate("/settings")}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M12.5 5l-5 5 5 5" stroke="#374151" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
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
                onClick={() => navigate("/")}
                className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg flex items-center gap-2"
              >
                <X size={16} />
                Close Settings
              </button>
            </div>
          </div>

          {/* Page Content */}
          <div className="flex-1 overflow-y-auto bg-gray-50">
            {children || <Outlet />}
          </div>
        </div>
      </div>
    </div>
  );
}
