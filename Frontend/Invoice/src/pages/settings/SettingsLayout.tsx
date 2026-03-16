import React, { useState, useEffect, useRef } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { Search, X, Building2, Users, Receipt, Settings as SettingsIcon, Palette, Zap, Package, CreditCard, ShoppingCart, ShoppingBag, Puzzle, Plug, Code, FileText } from "lucide-react";
import { getToken, API_BASE_URL } from "../../services/auth";

const simpleSettingsNav = [
  { label: "Organization Profile", path: "/settings/profile", icon: Building2 },
  { label: "Branding", path: "/settings/branding", icon: Palette },
  { label: "Usage Stats", path: "/settings/usage-stats", icon: Zap },
  { label: "Users", path: "/settings/users", icon: Users },
  { label: "Roles", path: "/settings/roles", icon: Users },
  { label: "Taxes", path: "/settings/taxes", icon: Receipt },
  { label: "Customer Portal", path: "/settings/customer-portal", icon: SettingsIcon },
  { label: "General Preferences", path: "/settings/general", icon: SettingsIcon },
  { label: "Items", path: "/settings/items", icon: Package },
  { label: "Customers", path: "/sales/customers", icon: Users },
  { label: "Quotes", path: "/settings/quotes", icon: FileText },
  { label: "Invoices", path: "/settings/invoices", icon: FileText },
  { label: "Recurring Invoices", path: "/settings/recurring-invoices", icon: FileText },
  { label: "Sales Receipt", path: "/settings/sales-receipts", icon: ShoppingCart },
  { label: "Payments Received", path: "/settings/payments-received", icon: CreditCard },
  { label: "Credit Notes", path: "/settings/credit-notes", icon: FileText },
  { label: "Delivery Notes", path: "/settings/delivery-notes", icon: FileText },
  { label: "Packing Slips", path: "/settings/packing-slips", icon: FileText },
  { label: "Expenses", path: "/settings/expenses", icon: FileText },
  { label: "Projects", path: "/settings/projects", icon: Puzzle },
  { label: "Timesheet", path: "/settings/timesheet", icon: SettingsIcon },
  { label: "Online Payments", path: "/settings/online-payments", icon: CreditCard },
  { label: "Reminders", path: "/settings/reminders", icon: SettingsIcon },
  { label: "PDF Templates", path: "/settings/customization/pdf-templates", icon: FileText },
  { label: "Email Notifications", path: "/settings/customization/email-notifications", icon: FileText },
  { label: "Integrations", path: "/settings/integrations/zoho", icon: Plug },
  { label: "API Usage", path: "/settings/developer/api-usage", icon: Code },
  { label: "Data Management", path: "/settings/custom-modules", icon: Puzzle },
  { label: "Marketplace", path: "/settings/marketplace", icon: ShoppingBag },
];

export default function SettingsLayout({ children }: { children?: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const sidebarScrollRef = useRef<HTMLDivElement | null>(null);
  const contentScrollRef = useRef<HTMLDivElement | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [appearance, setAppearance] = useState("dark");
  const [accentColor, setAccentColor] = useState("#2f6fed");
  const [sidebarColors, setSidebarColors] = useState({
    darkFrom: "#156372",
    darkTo: "#156372",
    lightFrom: "#f9fafb",
    lightTo: "#f3f4f6",
  });

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
            // Keep sidebar highlight color consistent with the desired UI
            if (data.data.accentColor) {
              setAccentColor(data.data.accentColor);
            }
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

  // Reset scroll position when entering settings routes
  useEffect(() => {
    const sidebarEl = sidebarScrollRef.current;
    const contentEl = contentScrollRef.current;

    if (sidebarEl) sidebarEl.scrollTop = 0;
    if (contentEl) contentEl.scrollTop = 0;

    // Also reset window scroll in case the page itself scrolls
    if (typeof window !== "undefined") {
      window.scrollTo(0, 0);
    }
  }, [location.pathname]);

  const isActive = (path: string) => {
    if (!path) return false;
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  return (
    <div className="fixed inset-0 bg-gray-50 flex flex-col" style={{ marginLeft: 0, paddingLeft: 0, zIndex: 9999 }}>
      {/* Top Bar */}
      <div className="bg-[#f6f7fb] sticky top-0 z-50">
        <div className="px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-[220px]">
            <div className="h-10 w-10 rounded-xl border border-[#d9deea] bg-white flex items-center justify-center text-[#2f6fed]">
              <SettingsIcon size={20} />
            </div>
            <div>
              <div className="text-lg font-semibold text-gray-900 leading-tight">All Settings</div>
              <div className="text-sm text-gray-500">TABAN ENTERPRISES</div>
            </div>
          </div>

          <div className="flex-1 max-w-md mx-8">
            <div className="relative">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[#2f6fed]"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search settings ( / )"
                className="w-full h-10 pl-9 pr-4 rounded-lg border border-[#d9deea] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#2f6fed]/30 focus:border-transparent"
              />
            </div>
          </div>

          <button
            onClick={() => navigate("/")}
            className="px-4 py-2 text-sm text-gray-700 hover:bg-white rounded-lg flex items-center gap-2"
          >
            <X size={16} />
            Close Settings
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        <div
          className="w-64 flex-shrink-0 overflow-y-auto bg-white"
          ref={sidebarScrollRef}
          style={{
            backgroundColor: "#ffffff",
          }}
        >
          <div className="p-3">
            <div className="space-y-1">
              {simpleSettingsNav.map((item) => {
                const active = isActive(item.path);
                const Icon = item.icon;
                return (
                  <button
                    key={item.label}
                    onClick={() => navigate(item.path)}
                    className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition ${active
                      ? "font-semibold"
                      : "text-slate-700 hover:bg-slate-100"
                      }`}
                    style={active ? { backgroundColor: "rgba(47, 111, 237, 0.12)", color: accentColor } : {}}
                  >
                    <Icon size={16} className={active ? "text-current" : "text-gray-400"} />
                    <span className="text-left">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          <div className="flex-1 overflow-y-auto bg-gray-50" ref={contentScrollRef}>
            {children || <Outlet />}
          </div>
        </div>
      </div>
    </div>
  );
}
