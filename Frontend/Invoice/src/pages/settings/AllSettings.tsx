import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, X, Building2, Users, Receipt, Settings as SettingsIcon, Palette, Zap, Package, CreditCard, ShoppingCart, ShoppingBag, Puzzle, Plug, Code } from "lucide-react";
import { useUser } from "../../lib/auth/UserContext";

export default function AllSettings() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSetting, setSelectedSetting] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);

  const { user } = useUser();
  const permissions = user?.permissions;

  // Helper to check permissions
  // Return true if access allowed
  const checkPermission = (key: string, subKey?: string) => {
    if (!user) return false;
    if (user.role === 'owner' || user.role === 'admin' || permissions === 'full_access') return true;
    if (!permissions) return false;

    // Check settings permissions
    const p = permissions.settings;
    if (!p) return false;

    if (subKey) {
      return p[key]?.[subKey]?.view; // e.g. p.usersRoles.view
    }
    return p[key]?.view;
  };

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
        "Recurring Invoices",
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
      const label = typeof item === "string" ? item : item.label;
      return label.toLowerCase().includes(lowerQuery);
    });
  };

  const filteredOrgSettings = filterItems(organizationSettings, searchQuery);
  const filteredModuleSettings = filterItems(moduleSettings, searchQuery);
  const filteredExtensionSettings = filterItems(extensionSettings, searchQuery);

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
                  className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow"
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
                  className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow"
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
                  className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow"
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
                          defaultValue="Taban enterprise"
                          className="w-full h-10 px-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] items-center gap-3">
                        <label className="text-sm font-medium text-gray-700">
                          Business Type
                        </label>
                        <select className="w-full h-10 px-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500">
                          <option>Select</option>
                        </select>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] items-center gap-3">
                        <label className="text-sm font-medium text-red-500">
                          Industry <span className="text-red-500">*</span>
                        </label>
                        <select className="w-full h-10 px-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500">
                          <option>Agriculture</option>
                        </select>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] items-center gap-3">
                        <label className="text-sm font-medium text-red-500">
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
