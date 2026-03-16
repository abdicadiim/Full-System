import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Bell,
  Check,
  ChevronDown,
  Menu,
  Plus,
  Search,
  Settings,
  Users,
} from "lucide-react";
import { useUser } from "../../lib/auth/UserContext";
import { useSettings } from "../../lib/settings/SettingsContext";

function Header({ onToggleSidebar }) {
  const { user, logout } = useUser();
  const { settings } = useSettings();
  const navigate = useNavigate();
  const location = useLocation();

  const [openMenu, setOpenMenu] = useState(false);
  const [openQuickCreate, setOpenQuickCreate] = useState(false);
  const [openSearchScopeDropdown, setOpenSearchScopeDropdown] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [searchScope, setSearchScope] = useState("");

  const menuRef = useRef(null);
  const quickCreateRef = useRef(null);
  const searchDropdownRef = useRef(null);
  const searchInputRef = useRef(null);

  const displayName = user?.name || "Guest";
  const role = user?.roleName || user?.role || "User";
  const email = user?.email || "";
  const schoolName = settings?.general?.schoolDisplayName || "Taban Billing";
  const avatarInitial = displayName.trim().charAt(0).toUpperCase() || "A";
  const unreadMessages = user?.unreadMessages ?? 0;
  const unreadNotifications = user?.unreadNotifications ?? 0;

  const currentSection = useMemo(() => {
    const segment = location.pathname.split("/").filter(Boolean)[0] || "dashboard";
    return segment
      .replace(/[-_]/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }, [location.pathname]);

  const searchScopeOptions = useMemo(
    () => [
      "Customers",
      "Products",
      "Items",
      "Plans",
      "Addon",
      "Price Lists",
      "Coupons",
      "Pricing Widgets",
      "Quotes",
      "Retainer Invoices",
      "Invoices",
      "Sales Receipts",
      "Payment Links",
      "Subscriptions",
      "Credit Notes",
      "Expenses",
      "Projects",
      "Timesheet",
      "Events",
      "Tasks",
    ],
    []
  );

  useEffect(() => {
    const sectionLabel = currentSection || "Customers";
    if (!searchScope) {
      setSearchScope(sectionLabel);
    }
  }, [currentSection, searchScope]);

  const quickCreateSections = useMemo(
    () => [
      {
        title: "GENERAL",
        items: [
          { label: "Add User", to: "/settings/users" },
          { label: "Log Time", to: "/dashboard" },
          { label: "Weekly Log", to: "/dashboard" },
          { label: "Task", to: "/dashboard" },
        ],
      },
      {
        title: "PRODUCT CATALOG",
        items: [
          { label: "Product", to: "/products/items" },
          { label: "Plans", to: "/plans" },
          { label: "Addons", to: "/products/subscription-items" },
          { label: "Coupons", to: "/coupons" },
          { label: "Item", to: "/products/items" },
        ],
      },
      {
        title: "SALES",
        items: [
          { label: "Customer", to: "/customers/new" },
          { label: "Quotes", to: "/sales/quotes" },
          { label: "Subscription", to: "/sales/subscriptions" },
          { label: "Invoices", to: "/sales/invoices" },
          { label: "Sales Receipts", to: "/sales/receipts" },
          { label: "Retainer Invoices", to: "/sales/retainer-invoices" },
          { label: "Payment Links", to: "/payments/payment-links" },
          { label: "Customer Payment", to: "/payments/payments-received" },
          { label: "Credit Notes", to: "/sales/credit-notes" },
        ],
      },
      {
        title: "EXPENSES",
        items: [
          { label: "Expenses", to: "/expenses" },
          { label: "Recurring Expense", to: "/expenses" },
        ],
      },
    ],
    []
  );

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpenMenu(false);
      }
      if (quickCreateRef.current && !quickCreateRef.current.contains(event.target)) {
        setOpenQuickCreate(false);
      }
      if (searchDropdownRef.current && !searchDropdownRef.current.contains(event.target)) {
        setOpenSearchScopeDropdown(false);
      }
    }

    if (openMenu || openQuickCreate || openSearchScopeDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [openMenu, openQuickCreate, openSearchScopeDropdown]);

  useEffect(() => {
    function onSlashShortcut(event) {
      if (event.key !== "/") return;
      const tag = event.target?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || event.target?.isContentEditable) {
        return;
      }

      event.preventDefault();
      searchInputRef.current?.focus();
      setOpenSearchScopeDropdown(true);
    }

    window.addEventListener("keydown", onSlashShortcut);
    return () => window.removeEventListener("keydown", onSlashShortcut);
  }, []);

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  const headerBg = settings?.theme?.sidebarColor || "#156372";

  return (
    <div className="sticky top-0 z-40 bg-white pt-2">
      <header className="relative rounded-2xl shadow-md" style={{ backgroundColor: headerBg }}>
      <div className="flex h-14 w-full items-center justify-between gap-2 px-3 sm:px-5">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <button
            type="button"
            onClick={onToggleSidebar}
            className="hidden h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white transition hover:bg-white/20"
            aria-label="Toggle sidebar"
          >
            <Menu className="h-4 w-4" />
          </button>

          <div className="relative min-w-0 w-full max-w-[560px]" ref={searchDropdownRef}>
            <div
              className="flex h-9 min-w-0 w-full items-center rounded-lg border border-white/15 bg-white/10 px-3 shadow-sm"
              onClick={() => setOpenSearchScopeDropdown(true)}
            >
              <Search className="h-4 w-4 shrink-0 text-white/80" />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenSearchScopeDropdown((state) => !state);
                }}
                className="ml-1 inline-flex items-center justify-center text-white/70 hover:text-white transition-colors"
                aria-label="Open search scope dropdown"
              >
                <ChevronDown className="h-3.5 w-3.5 shrink-0" />
              </button>
              <input
                ref={searchInputRef}
                type="text"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                onFocus={() => setOpenSearchScopeDropdown(true)}
                className="ml-2 min-w-0 flex-1 bg-transparent text-sm text-white placeholder:text-white/70 focus:outline-none"
                placeholder={`Search in ${searchScope || currentSection} ( / )`}
              />
            </div>

            {openSearchScopeDropdown && (
              <div className="absolute left-0 top-11 z-50 w-full max-w-[420px] rounded-lg border border-slate-200 bg-white shadow-xl">
                <div className="max-h-[320px] overflow-y-auto p-2">
                  <div className="space-y-0.5">
                    {searchScopeOptions.map((option) => {
                      const isActive = searchScope === option;
                      return (
                        <button
                          key={option}
                          type="button"
                          onClick={() => {
                            setSearchScope(option);
                            setOpenSearchScopeDropdown(false);
                            searchInputRef.current?.focus();
                          }}
                          className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-[15px] transition-colors ${isActive
                              ? "bg-[#156372] text-white"
                              : "text-slate-700 hover:bg-[#156372]/10 hover:text-[#156372]"
                            }`}
                        >
                          <span>{option}</span>
                          {isActive && <Check className="h-4 w-4" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="border-t border-slate-100 p-2 space-y-1">
                  <button
                    type="button"
                    className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-[15px] text-slate-700 transition-colors hover:bg-[#156372]/10 hover:text-[#156372]"
                  >
                    <span className="flex items-center gap-2">
                      <Search className="h-4 w-4" />
                      Advanced Search
                    </span>
                    <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600">Alt + /</span>
                  </button>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-[15px] text-slate-700 transition-colors hover:bg-[#156372]/10 hover:text-[#156372]"
                  >
                    <span className="flex items-center gap-2">
                      <Search className="h-4 w-4" />
                      Search across Zoho
                    </span>
                    <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600">Ctrl + /</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <div className="relative" ref={quickCreateRef}>
            <button
              type="button"
              onClick={() => setOpenQuickCreate((state) => !state)}
              className="inline-flex h-8 w-8 items-center justify-center rounded bg-white/10 text-white transition hover:bg-white/20"
              aria-label="Quick add"
            >
              <Plus className="h-4 w-4" />
            </button>

            {openQuickCreate && (
              <div className="absolute right-0 top-11 z-50 w-[95vw] max-w-[980px] rounded-lg border border-slate-200 bg-white shadow-xl">
                <div className="max-h-[72vh] overflow-y-auto p-4 sm:p-5">
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                    {quickCreateSections.map((section) => (
                      <div key={section.title}>
                        <p className="mb-3 text-xs font-semibold tracking-wide text-slate-500">
                          {section.title}
                        </p>
                        <div className="space-y-2">
                          {section.items.map((item) => (
                            <button
                              key={item.label}
                              type="button"
                              onClick={() => {
                                setOpenQuickCreate(false);
                                navigate(item.to);
                              }}
                              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[15px] text-slate-700 transition hover:bg-slate-100"
                            >
                              <Plus className="h-3.5 w-3.5 text-slate-400" />
                              <span>{item.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          <Link
            to="/messages"
            className="relative inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
            aria-label="Messages"
          >
            <Users className="h-4 w-4" />
            {unreadMessages > 0 && (
              <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-rose-500" />
            )}
          </Link>

          <Link
            to="/notifications"
            className="relative inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
            aria-label="Notifications"
          >
            <Bell className="h-4 w-4" />
            {unreadNotifications > 0 && (
              <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-rose-500" />
            )}
          </Link>

          <button
            type="button"
            onClick={() => navigate("/settings")}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
            aria-label="Open settings"
          >
            <Settings className="h-4 w-4" />
          </button>

          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setOpenMenu((state) => !state)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-sm font-semibold text-white transition hover:bg-white/30"
              aria-label="Open profile menu"
            >
              {avatarInitial}
            </button>

            {openMenu && (
              <div className="absolute right-0 top-11 z-50 w-64 rounded-xl border border-slate-200 bg-white p-3 shadow-xl">
                <div className="border-b border-slate-100 pb-3">
                  <p className="truncate text-sm font-semibold text-slate-800">{displayName}</p>
                  <p className="truncate text-xs text-slate-500">{role}</p>
                  <p className="truncate text-xs text-slate-500">{email || schoolName}</p>
                </div>

                <div className="pt-2">
                  <Link
                    to="/profile"
                    className="block rounded-lg px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-100"
                    onClick={() => setOpenMenu(false)}
                  >
                    View Profile
                  </Link>
                  <button
                    type="button"
                    className="w-full rounded-lg px-3 py-2 text-left text-sm text-rose-600 transition hover:bg-rose-50"
                    onClick={handleLogout}
                  >
                    Logout
                  </button>
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            className="inline-flex h-8 w-8 items-center justify-center text-white/90 transition hover:text-white"
            aria-label="Open apps"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <circle cx="2" cy="2" r="1.1" fill="currentColor" />
              <circle cx="7" cy="2" r="1.1" fill="currentColor" />
              <circle cx="12" cy="2" r="1.1" fill="currentColor" />
              <circle cx="2" cy="7" r="1.1" fill="currentColor" />
              <circle cx="7" cy="7" r="1.1" fill="currentColor" />
              <circle cx="12" cy="7" r="1.1" fill="currentColor" />
              <circle cx="2" cy="12" r="1.1" fill="currentColor" />
              <circle cx="7" cy="12" r="1.1" fill="currentColor" />
              <circle cx="12" cy="12" r="1.1" fill="currentColor" />
            </svg>
          </button>
        </div>
      </div>
      </header>
    </div>
  );
}

export default Header;
