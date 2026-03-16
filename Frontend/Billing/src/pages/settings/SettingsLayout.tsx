import React, { useState, useEffect } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { Search, X, Building2, Users, Receipt, Settings as SettingsIcon, Palette, Zap, Package, CreditCard, ShoppingCart, ShoppingBag, Puzzle, Plug, Code, ChevronDown, ChevronRight } from "lucide-react";
import { getToken, API_BASE_URL } from "../../services/auth";

const ACCENT = "#156372";

const organizationSettings = [
  {
    icon: Building2,
    color: "green",
    title: "Organization",
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
    items: [
      { label: "Users", path: "/settings/users" },
      { label: "Roles", path: "/settings/roles" },
    ],
  },
  {
    icon: Receipt,
    color: "blue",
    title: "Taxes & Compliance",
    items: [
      { label: "Taxes", path: "/settings/taxes" },
    ],
  },
  {
    icon: SettingsIcon,
    color: "orange",
    title: "Setup & Configurations",
    items: [
      { label: "General", path: "/settings/general" },
      { label: "Currencies", path: "/settings/currencies" },
      { label: "Opening Balances", path: "/settings/opening-balances" },
      { label: "Reminders", path: "/settings/reminders" },
    ],
  },
  {
    icon: Palette,
    color: "yellow",
    title: "Customization",
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
    items: [
      { label: "Customers", path: "/settings/customers-vendors" },
      { label: "Products", path: "/settings/items" },
      { label: "Tasks", path: "/settings/tasks" },
      { label: "Projects", path: "/settings/projects" },
      { label: "Timesheet", path: "/settings/timesheet" },
    ],
  },
  {
    icon: Package,
    color: "pink",
    title: "Inventory",
    items: [
      { label: "Inventory Adjustments", path: "/settings/inventory-adjustments" },
    ],
  },
  {
    icon: CreditCard,
    color: "orange",
    title: "Online Payments",
    items: [
      { label: "Payment Gateways", path: "/settings/online-payments" },
    ],
  },
  {
    icon: ShoppingCart,
    color: "green",
    title: "Sales",
    items: [
      { label: "Customers", path: "/sales/customers" },
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
    icon: ShoppingBag,
    color: "green",
    title: "Purchases",
    items: [
      { label: "Expenses", path: "/settings/expenses" },
      { label: "Recurring Expenses", path: "/settings/recurring-expenses" },
      { label: "Purchase Orders", path: "/settings/purchase-orders" },
      { label: "Bills", path: "/settings/bills" },
      { label: "Recurring Bills", path: "/settings/recurring-bills" },
      { label: "Payments Made", path: "/settings/payments-made" },
      { label: "Vendor Credits", path: "/settings/vendor-credits" },
    ],
  },
  {
    icon: Puzzle,
    color: "blue",
    title: "Custom Modules",
    items: [
      { label: "Overview", path: "/settings/custom-modules" },
    ],
  },
];

const extensionSettings = [
  {
    icon: Plug,
    color: "green",
    title: "Integrations",
    items: [
      { label: "Zoho Apps", path: "/settings/integrations/zoho" },
      { label: "WhatsApp", path: "/settings/integrations/whatsapp" },
      { label: "Marketplace", path: "/settings/marketplace" },
    ],
  },
  {
    icon: Code,
    color: "orange",
    title: "Developer Space",
    items: [
      { label: "Webhooks", path: "/settings/developer/webhooks" },
      { label: "API Usage", path: "/settings/developer/api-usage" },
    ],
  },
];

export default function SettingsLayout({ children }: { children?: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    organization: true,
  });
  const [appearance, setAppearance] = useState("dark");
  const [accentColor, setAccentColor] = useState("#3b82f6");
  const [sidebarColors, setSidebarColors] = useState({
    darkFrom: "#156372",
    darkTo: "#156372",
    lightFrom: "#f9fafb",
    lightTo: "#f3f4f6",
  });

  // Auto-expand sections based on current path
  useEffect(() => {
    const path = location.pathname;
    setExpandedSections(prev => {
      const newExpanded = { ...prev };

      [...organizationSettings, ...moduleSettings, ...extensionSettings].forEach((section) => {
        const sectionKey = section.title.toLowerCase().replace(/\s+/g, '-');
        const hasActiveItem = section.items.some(item =>
          path === item.path || path.startsWith(item.path + '/')
        );
        if (hasActiveItem) {
          newExpanded[sectionKey] = true;
        }
      });

      return newExpanded;
    });
  }, [location.pathname]);

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
            setAccentColor(data.data.accentColor || "#3b82f6");
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
      const { appearance: newAppearance, accentColor: newAccentColor, sidebarDarkFrom, sidebarDarkTo, sidebarLightFrom, sidebarLightTo } = event.detail;
      if (newAppearance) {
        setAppearance(newAppearance);
      }
      if (newAccentColor) {
        setAccentColor(newAccentColor);
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

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const getColorClasses = (color: string) => {
    const colors: Record<string, string> = {
      green: "bg-green-100 text-green-600",
      pink: "bg-pink-100 text-pink-600",
      blue: "bg-blue-100 text-blue-600",
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

  const renderSection = (section: any, idx: number) => {
    const Icon = section.icon;
    const sectionKey = section.title.toLowerCase().replace(/\s+/g, '-');
    const isExpanded = expandedSections[sectionKey];
    return (
      <div key={idx} className="mb-1">
        <button
          onClick={() => toggleSection(sectionKey)}
          className={`w-full flex items-center gap-2 px-2 py-2 text-sm font-medium rounded-lg transition ${appearance === "light"
            ? "text-gray-700 hover:bg-gray-50"
            : "text-gray-200 hover:bg-white/10"
            }`}
        >
          {isExpanded ? (
            <ChevronDown size={16} />
          ) : (
            <ChevronRight size={16} />
          )}
          <div className={`p-1 rounded-md flex-shrink-0 flex items-center justify-center ${getColorClasses(section.color)}`}>
            <Icon size={16} />
          </div>
          <span className="flex-1 text-left">{section.title}</span>
        </button>
        {isExpanded && (
          <div className="ml-6 mt-1 space-y-1">
            {section.items.map((item: any, itemIdx: number) => {
              const active = isActive(item.path);
              return (
                <button
                  key={itemIdx}
                  onClick={() => navigate(item.path)}
                  className={`w-full text-left px-3 py-2 text-sm rounded-lg transition ${active
                    ? "font-medium"
                    : appearance === "light"
                      ? "text-gray-600 hover:bg-gray-50"
                      : "text-gray-300 hover:bg-white/10"
                    }`}
                  style={active ? {
                    backgroundColor: `${accentColor}15`,
                    color: accentColor
                  } : {}}
                >
                  <div className="flex items-center justify-between">
                    <span>{item.label}</span>
                    {item.badge && (
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
                EXTENSIONS & TOOLS
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
                <div className="w-8 h-8 rounded bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
                  B
                </div>
                <div>
                  <div className="text-lg font-semibold text-gray-900">All Settings</div>
                  <div className="text-sm text-gray-500">TABAN ENTERPRISES</div>
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
