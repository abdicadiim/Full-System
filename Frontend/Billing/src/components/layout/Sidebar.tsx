// src/components/layout/sidebar/Sidebar.jsx
import React, { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { NavLink, useLocation } from "react-router-dom";
import {
  BarChart3,
  Calendar,
  Clock3,
  CreditCard,
  File,
  FileText,
  Home,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
  Users,
} from "lucide-react";
import { useUser } from "../../lib/auth/UserContext";
import { useSettings } from "../../lib/settings/SettingsContext";
import { getNavConfigForRole } from "../../config/roleBasedNav";
import tabnLogo from "../../assets/tabnlog.png";
import packageJson from "../../../package.json";

function renderIcon(name) {
  const common = {
    className: "h-5 w-5",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  const lineIconProps = {
    className: "h-5 w-5",
    strokeWidth: 1.8,
    "aria-hidden": true,
  };
  switch (name) {
    case "dashboard":
      return (
        <svg {...common}>
          <path d="M4 4h7v7H4zM13 4h7v4h-7zM13 11h7v9h-7zM4 13h7v7H4z" />
        </svg>
      );
    case "academic":
      return (
        <svg {...common}>
          <path d="M4 5h16M7 3v4M17 3v4M5 9h14v10H5z" />
        </svg>
      );
    case "campus":
      return (
        <svg {...common}>
          <path d="M4 20h16M6 10v6h4v-6M14 6v10h4V6l-4-2-4 2v2" />
        </svg>
      );
    case "classes":
      return (
        <svg {...common}>
          <path d="M5 5h14v4H5zM5 11h8v4H5zM5 17h5v2H5zM15 12h4v7h-4z" />
        </svg>
      );
    case "subjects":
      return (
        <svg {...common}>
          <path d="M6 4h9l3 3v13H6zM9 8h6M9 12h4M9 16h3" />
        </svg>
      );
    case "students":
      return (
        <svg {...common}>
          <path d="M12 4a3 3 0 1 1 0 6 3 3 0 0 1 0-6zM6 18a6 6 0 0 1 12 0H6z" />
        </svg>
      );
    case "parents":
      return (
        <svg {...common}>
          <path d="M7 5a2.5 2.5 0 1 1 0 5A2.5 2.5 0 0 1 7 5zm10 0a2.5 2.5 0 1 1 0 5A2.5 2.5 0 0 1 17 5zM3 19a4 4 0 0 1 8 0M13 19a4 4 0 0 1 8 0" />
        </svg>
      );
    case "staff":
      return (
        <svg {...common}>
          <path d="M12 4a3 3 0 1 1 0 6 3 3 0 0 1 0-6zM5 19a7 7 0 0 1 14 0" />
        </svg>
      );
    case "timetable":
      return (
        <svg {...common}>
          <path d="M7 4v3M17 4v3M5 8h14M6 20h12a1 1 0 0 0 1-1V8H5v11a1 1 0 0 0 1 1zM10 12h4v4h-4z" />
        </svg>
      );
    case "attendance":
      return (
        <svg {...common}>
          <path d="M5 5h14v14H5zM9 11l2 2 4-4" />
        </svg>
      );
    case "assignments":
      return (
        <svg {...common}>
          <path d="M8 4h8l3 3v13H5V4zM9 8h6M9 12h4M9 16h3" />
        </svg>
      );
    case "exams":
      return (
        <svg {...common}>
          <path d="M5 11h14M7 7h2M15 7h2M7 15h2M15 15h2M6 4h12v16H6z" />
        </svg>
      );
    case "discipline":
      return (
        <svg {...common}>
          <path d="M12 3 4 7v1h16V7zM6 9v8l6 4 6-4V9" />
        </svg>
      );
    case "finance":
      return (
        <svg {...common}>
          <path d="M6 6h12v12H6zM10 3v3M14 3v3M9 11h6M9 14h4" />
        </svg>
      );
    case "library":
      return (
        <svg {...common}>
          <path d="M5 5h4v14H5zM10 7h4v12h-4zM15 9h4v10h-4z" />
        </svg>
      );
    case "transport":
      return (
        <svg {...common}>
          <path d="M5 16V9a2 2 0 0 1 2-2h10l2 4v5M7 18a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm9 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2zM5 12h10" />
        </svg>
      );
    case "assets":
      return (
        <svg {...common}>
          <path d="M4 9h16v10H4zM7 5h10v4H7zM9 13h2v4H9zM13 13h2v4h-2z" />
        </svg>
      );
    case "hr":
      return (
        <svg {...common}>
          <path d="M7 7a3 3 0 1 1 6 0 3 3 0 0 1-6 0zM4 19a5 5 0 0 1 10 0M15 10h3v8" />
        </svg>
      );
    case "messages":
      return (
        <svg {...common}>
          <path d="M5 5h14v9H8l-3 3z" />
        </svg>
      );
    case "announcements":
      return (
        <svg {...common}>
          <path d="M5 9v6l7 4 7-4V9l-7-4zM12 5v14" />
        </svg>
      );
    case "calendar":
      return (
        <svg {...common}>
          <path d="M7 4v3M17 4v3M5 8h14M6 20h12a1 1 0 0 0 1-1V8H5v11a1 1 0 0 0 1 1zM9 12h2v2H9zM13 12h2v2h-2z" />
        </svg>
      );
    case "safeguarding":
      return (
        <svg {...common}>
          <path d="M12 4l8 4v5c0 4-3 7-8 9-5-2-8-5-8-9V8z" />
        </svg>
      );
    case "calculator":
      return (
        <svg {...common}>
          <path d="M6 4h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zM8 8h8M8 12h8M8 16h4" />
        </svg>
      );
    case "certificates":
      return (
        <svg {...common}>
          <path d="M6 4h12v16H6zM9 9h6M9 13h6M9 17h3" />
        </svg>
      );
    case "idcards":
      return (
        <svg {...common}>
          <path d="M4 6h16v12H4zM8 10a2 2 0 1 1 4 0 2 2 0 0 1-4 0zm-1 6c0-1.5 2-2 3-2s3 .5 3 2M15 10h3M15 13h3" />
        </svg>
      );
    case "templates":
      return (
        <svg {...common}>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8" />
        </svg>
      );
    case "users":
      return (
        <svg {...common}>
          <path d="M12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8zM4 13h2M18 13h2M7 5l1.5 1.5M15.5 6.5 17 5M7 21l1.5-1.5M15.5 19.5 17 21" />
        </svg>
      );
    case "roles":
      return (
        <svg {...common}>
          <path d="M6 4h12v6H6zM4 14h16v6H4zM4 10h16" />
        </svg>
      );
    case "system":
      return (
        <svg {...common}>
          <path d="M12 6.5l3.5-2 3.5 2v4l-3.5 2-3.5-2zM5 13l3.5-2 3.5 2v4l-3.5 2L5 17z" />
        </svg>
      );
    case "audit":
      return (
        <svg {...common}>
          <path d="M6 4h10l2 3v13H6zM9 8h5M9 11h4M9 14h3" />
        </svg>
      );
    case "export":
      return (
        <svg {...common}>
          <path d="M6 18h12M12 5v9M9 9l3-4 3 4" />
        </svg>
      );
    case "promotions":
      return (
        <svg {...common}>
          <path d="M4 18l4-4 3 3 7-7" />
          <path d="M20 7h-4M20 7v4" />
        </svg>
      );
    case "reports":
      return <BarChart3 {...lineIconProps} />;
    case "settings":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="3" />
          <path d="M12 1v6m0 6v6M5.64 5.64l4.24 4.24m4.24 4.24l4.24 4.24M1 12h6m6 0h6M5.64 18.36l4.24-4.24m4.24-4.24l4.24-4.24" />
        </svg>
      );
    case "getting-started":
      return <Sparkles {...lineIconProps} />;
    case "home":
      return <Home {...lineIconProps} />;
    case "customers":
      return <Users {...lineIconProps} />;
    case "product-catalog":
      return <ShoppingBag {...lineIconProps} />;
    case "sales":
      return <ShoppingCart {...lineIconProps} />;
    case "payments":
      return <CreditCard {...lineIconProps} />;
    case "expenses":
      return <FileText {...lineIconProps} />;
    case "time-tracking":
      return <Clock3 {...lineIconProps} />;
    case "events":
      return <Calendar {...lineIconProps} />;
    case "documents":
      return <File {...lineIconProps} />;
    default:
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="4" />
        </svg>
      );
  }
}

const routePermissionMap = {
  "/": "dashboard",
  "/dashboard": "dashboard",
  "/getting-started": "dashboard",

  "/customers": "customers",
  "/sales/customers": "customers",
  "/products": "products",
  "/products/items": "products",
  "/products/subscription-items": "products",
  "/products/pricing-widgets": "products",
  "/products/price-lists": "products",

  "/sales": "sales",
  "/sales/invoices": "sales",
  "/sales/quotes": "sales",
  "/sales/retainer-invoices": "sales",
  "/sales/receipts": "sales",
  "/sales/credit-notes": "sales",
  "/invoices": "sales",
  "/quotes": "sales",

  "/payments": "payments",
  "/expenses": "expenses",
  "/time-tracking": "time-tracking",
  "/events": "events",
  "/reports": "reports",
  "/documents": "documents",

  "/subscriptions": "sales",
  "/plans": "plans",
  "/coupons": "coupons",
  "/taxes": "taxes",
  "/gateways": "gateways",
  "/orgs": "orgs",

  "/settings": "settings",
  "/settings/users": "settings",
  "/settings/roles": "settings",
  "/settings/system": "settings",
};

function getModuleKeyForPath(pathname) {
  if (!pathname) return null;
  let match = null;
  // Sort routes by length (descending) to ensure most specific match wins
  const sortedRoutes = Object.keys(routePermissionMap).sort((a, b) => b.length - a.length);

  for (const route of sortedRoutes) {
    if (pathname === route || pathname.startsWith(route + "/")) {
      return routePermissionMap[route];
    }
  }
  return null;
}

function Sidebar({ mobileOpen = false, onCloseMobile, collapsed = false, onToggleCollapse }) {
  const location = useLocation();
  const { user, hasPermission } = useUser();
  const { settings } = useSettings();
  const isCollapsed = collapsed && !mobileOpen;
  const sidebarContainerRef = useRef(null);
  const flyoutCloseTimeoutRef = useRef(null);
  const [hoveredParent, setHoveredParent] = useState(null);
  const [hoveredParentLabel, setHoveredParentLabel] = useState("");
  const [flyoutPosition, setFlyoutPosition] = useState({ top: 0, left: 0 });

  const cancelFlyoutClose = () => {
    if (!flyoutCloseTimeoutRef.current) return;
    clearTimeout(flyoutCloseTimeoutRef.current);
    flyoutCloseTimeoutRef.current = null;
  };

  const scheduleFlyoutClose = () => {
    cancelFlyoutClose();
    flyoutCloseTimeoutRef.current = setTimeout(() => {
      setHoveredParent(null);
    }, 250);
  };

  // Get company name from settings
  const companyName = (settings?.general?.companyDisplayName || "Billing").trim();
  const [companyPrimaryRaw, ...companySecondaryParts] = companyName.split(/\s+/).filter(Boolean);
  const companyPrimary = companyPrimaryRaw || "Billing";
  const companySecondary = companySecondaryParts.join(" ");

  // === ROLE-BASED NAVIGATION ===
  // Get user role and load appropriate navigation config
  const userRole = user?.role || 'admin'; // Default to admin if no role
  const navConfig = getNavConfigForRole(userRole);
  const sections = navConfig.sections;
  const subMenus = navConfig.subMenus;

  const [openParent, setOpenParent] = useState(() => {
    return Object.keys(subMenus).find(
      (parent) =>
        location.pathname === parent ||
        subMenus[parent].some(sub =>
          location.pathname === sub.to ||
          location.pathname.startsWith(sub.to + "/")
        )
    );
  });

  const handleLinkClick = () => {
    if (onCloseMobile) onCloseMobile();
  };
  const handleParentToggle = (itemTo, hasSubMenu) => {
    if (!hasSubMenu) return;
    setOpenParent((prev) => (prev === itemTo ? null : itemTo));
  };

  const sidebarClasses = [
    "z-50 -translate-x-full transform transition duration-200 ease-out",
    "fixed inset-y-0 left-0",
    "lg:fixed lg:inset-y-4 lg:left-2 lg:translate-x-0",
    isCollapsed ? "w-[220px] lg:w-[96px]" : "w-[220px] lg:w-[220px]",
    mobileOpen ? "translate-x-0" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const sidebarColor = settings?.theme?.sidebarColor || "#1f2647";

  const linkClasses = (isActive, isSpecial = false, isDropdownOpen = false, hasSubMenu = false) =>
    [
      "group relative flex items-center rounded-xl transition-colors no-underline",
      isCollapsed ? "flex-col justify-center gap-1 px-2 py-2.5" : "gap-2.5 px-4 py-2 text-[15px]",
      isSpecial
        ? "border border-[#4f5d83] bg-[#303a5d] text-white hover:bg-[#36406a]"
        : hasSubMenu && isActive
          ? "bg-white text-slate-900"
          : isActive
            ? "bg-white/10 text-white"
            : "text-white hover:bg-white/10",
    ].join(" ");

  const submenuClasses = (isActive) =>
    [
      "block rounded-lg px-3 py-2 text-[14px] font-medium transition-colors no-underline",
      isActive
        ? "bg-white/10 text-white"
        : "text-white/90 hover:bg-white/10 hover:text-white",
    ].join(" ");

  // Filter sections based on permissions - only show items if user has view permission
  const visibleSections = React.useMemo(() => {
    if (!user) return [];

    return sections.map(section => ({
      ...section,
      items: section.items.filter(item => {
        // Hide special onboarding card from sidebar modules.
        if (item.special) return false;

        // Find module key (e.g., '/timetable' -> 'timetable')
        const moduleKey = getModuleKeyForPath(item.to);

        // If no key found, assume it's allowed (or handle as 'public')
        // For Dashboard ( '/'), key is 'dashboard'.
        if (!moduleKey) {
          // Dashboard is always visible
          if (item.to === "/" || item.to === "/dashboard") return true;
          // If no permission mapping, show it (could be a public route)
          return true;
        }

        // Check 'view' permission using the context helper
        // Only show menu item if user has view permission for this module
        return hasPermission(moduleKey, 'view');
      }).map(item => {
        // Dynamic link replacements
        if (item.to === '/subjects' && user?.role === 'Student' && user?.studentClass) {
          return { ...item, to: `/subjects/class/${user.studentClass}` };
        }
        return item;
      })
    })).filter(section => section.items.length > 0); // Hide empty sections
  }, [sections, hasPermission, user]);

  return (
    <aside className={sidebarClasses} aria-label="Primary sidebar navigation">
      <div className="flex h-full w-full flex-col">
        <div
          ref={sidebarContainerRef}
          className="relative flex h-full max-h-screen flex-col border-r border-[#30395f] text-white transition-colors duration-300 lg:rounded-3xl"
          style={{ backgroundColor: sidebarColor }}
        >
          <div
            className={`flex items-center border-b border-white/10 px-4 py-4 ${isCollapsed ? "justify-center" : "justify-between"}`}
          >
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full border border-white/25 text-white">
                <img src={tabnLogo} alt="Taban logo" className="h-[18px] w-[18px] object-contain" />
              </div>
              {!isCollapsed && (
                <div className="min-w-0">
                  <div className="truncate text-lg font-semibold leading-tight tracking-tight">{companyPrimary}</div>
                  {companySecondary ? (
                    <div className="truncate text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">
                      {companySecondary}
                    </div>
                  ) : null}
                </div>
              )}
            </div>

            {!isCollapsed && (
              <button
                type="button"
                className="flex h-10 w-10 items-center justify-center rounded-2xl bg-transparent text-white transition-colors hover:bg-white/10"
                aria-label="Collapse sidebar"
                onClick={() => onToggleCollapse?.()}
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
                  />
                </svg>
              </button>
            )}
          </div>

          <nav className="flex-1 overflow-y-auto overflow-x-visible px-2.5 py-3.5 scrollbar-hide">
            <div className="space-y-1.5">
              {visibleSections.map((section, index) => (
                <div key={index} className="mb-4 last:mb-0 space-y-1.5">
                  <ul className="space-y-1.5">
                    {section.items.map((item) => {
                      const hasSubMenu = !!subMenus[item.to];
                      const currentModule = getModuleKeyForPath(location.pathname);
                      const itemModule = getModuleKeyForPath(item.to);
                      const isActive = currentModule !== null && currentModule === itemModule;
                      const isDropdownOpen = hasSubMenu && openParent === item.to;
                      const isSpecial = item.special === true;

                      const isParentActive = hasSubMenu && isActive;
                      const arrowColorClass = hasSubMenu
                        ? (isDropdownOpen || isParentActive ? "text-slate-600" : "text-white/45")
                        : "text-transparent";

                      return (
                        <li
                          key={item.to}
                          className="relative"
                          onMouseEnter={(event) => {
                            if (!isCollapsed || !hasSubMenu) return;
                            cancelFlyoutClose();
                            setHoveredParent(item.to);
                            setHoveredParentLabel(item.label);
                            const itemRect = event.currentTarget.getBoundingClientRect();
                            const sidebarRect = sidebarContainerRef.current?.getBoundingClientRect?.();
                            const left = (sidebarRect?.right ?? itemRect.right) + 12;
                            setFlyoutPosition({ top: itemRect.top, left });
                          }}
                          onMouseLeave={() => {
                            if (!isCollapsed || !hasSubMenu) return;
                            scheduleFlyoutClose();
                          }}
                        >
                          <NavLink
                            to={item.to}
                            end={item.to === "/dashboard" || item.to === "/"}
                            onClick={(event) => {
                              if (hasSubMenu) {
                                if (!isCollapsed) {
                                  event.preventDefault();
                                  handleParentToggle(item.to, true);
                                  return;
                                }
                              }
                              handleLinkClick();
                              handleParentToggle(item.to, false);
                            }}
                            className={() =>
                              linkClasses(isActive || isParentActive, isSpecial, isDropdownOpen, hasSubMenu)
                            }
                            style={{ textDecoration: "none" }}
                          >
                            {!isSpecial && !isCollapsed && (
                              <span
                                className={`flex h-4 w-4 items-center justify-center transition-transform ${arrowColorClass} ${hasSubMenu && openParent === item.to ? "rotate-90" : ""}`}
                                aria-hidden="true"
                              >
                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 5l7 7-7 7" />
                                </svg>
                              </span>
                            )}

                            <span className="flex h-6 w-6 items-center justify-center">
                              {renderIcon(item.icon)}
                            </span>
                            {isCollapsed && hasSubMenu && (
                              <div className="absolute bottom-1 right-1 opacity-40 text-white" aria-hidden="true">
                                <svg width="6" height="6" viewBox="0 0 6 6" fill="currentColor">
                                  <path d="M6 6L0 6L6 0V6Z" />
                                </svg>
                              </div>
                            )}

                            {!isCollapsed && (
                              <div className="min-w-0 flex-1">
                                <span className={`block truncate ${isSpecial || isActive || isParentActive ? "font-semibold" : "font-medium"}`}>
                                  {item.label}
                                </span>
                                {isSpecial && (
                                  <div className="mt-2 h-1.5 w-full rounded-full bg-white/20">
                                    <div className="h-full w-2/3 rounded-full bg-white/35" />
                                  </div>
                                )}
                              </div>
                            )}

                            {isCollapsed && (
                              <span className="w-full px-1 text-center text-[11px] font-semibold leading-tight opacity-90 break-words max-h-[2.4rem] overflow-hidden">
                                {item.label}
                              </span>
                            )}

                            {isSpecial && !isCollapsed && (
                              <svg className="h-4 w-4 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            )}
                          </NavLink>

                          {!isCollapsed && hasSubMenu && openParent === item.to && (
                            <div className="relative mt-2 ml-12">
                              <span
                                aria-hidden="true"
                                className="absolute -left-4 -top-3 bottom-0 w-px bg-white/10"
                              />
                              <ul className="space-y-2.5">
                                {subMenus[item.to]
                                  .filter(sub => {
                                    // Filter submenu items based on permissions too
                                    const subModuleKey = getModuleKeyForPath(sub.to);
                                    if (!subModuleKey) return true;
                                    return hasPermission(subModuleKey, 'view');
                                  })
                                  .map((sub) => {
                                    const Icon = getSubmenuIcon(sub.to);
                                    return (
                                      <li key={sub.to}>
                                        <NavLink
                                          to={sub.to}
                                          end={sub.to === item.to}
                                          onClick={handleLinkClick}
                                          className={({ isActive }) =>
                                            submenuClasses(isActive)
                                          }
                                          style={{ textDecoration: 'none' }}
                                        >
                                          <span className="flex items-center justify-between gap-2">
                                            <span className="flex items-center gap-2 min-w-0">
                                              <Icon size={14} className="text-white/70" />
                                              <span className="truncate">{sub.label}</span>
                                            </span>
                                            {sub.showAddBadge && (
                                              <span className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-white/10 text-white text-[14px] leading-none">
                                                +
                                              </span>
                                            )}
                                          </span>
                                        </NavLink>
                                      </li>
                                    );
                                  })}
                              </ul>
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          </nav>

          {isCollapsed && hoveredParent && subMenus[hoveredParent] && typeof document !== "undefined"
            ? createPortal(
              <div
                className="fixed z-[9999]"
                style={{ top: flyoutPosition.top, left: flyoutPosition.left }}
                onMouseEnter={cancelFlyoutClose}
                onMouseLeave={scheduleFlyoutClose}
              >
                <div
                  className="w-72 rounded-2xl shadow-2xl border border-white/10 overflow-hidden"
                  style={{ backgroundColor: sidebarColor }}
                >
                  <div className="border-b border-white/10 px-5 py-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/55">
                    {hoveredParentLabel}
                  </div>
                  <div className="pb-4 px-3 max-h-[70vh] overflow-y-auto">
                    {subMenus[hoveredParent]
                      .filter((sub) => {
                        const subModuleKey = getModuleKeyForPath(sub.to);
                        if (!subModuleKey) return true;
                        return hasPermission(subModuleKey, "view");
                      })
                      .map((sub) => (
                        <NavLink
                          key={sub.to}
                          to={sub.to}
                          end
                          onClick={handleLinkClick}
                          className={({ isActive }) =>
                            `group flex items-center justify-between gap-2 rounded-xl px-4 py-2.5 text-[14px] font-medium transition-colors no-underline mb-1 border ${isActive ? "bg-white/10 text-white border-blue-500" : "text-white/90 hover:bg-white/10 border-transparent"}`
                          }
                          style={{ textDecoration: "none" }}
                        >
                          <span className="min-w-0 truncate">{sub.label}</span>
                          {sub.showAddBadge && (
                            <span className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-white/10 text-white text-[14px] leading-none">
                              +
                            </span>
                          )}
                        </NavLink>
                      ))}
                  </div>
                </div>
              </div>,
              document.body
            )
            : null}

          {!isCollapsed && (
            <div className="px-4 pb-6 pt-3">
              <div className="border-t border-white/10 pt-3">
                <div className="text-xs font-medium text-white/80">Version {packageJson.version}</div>
                <div className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-white/70">
                  <span aria-hidden="true">{"\u00A9"}</span>
                  <span className="truncate">{companyName}</span>
                </div>
              </div>
            </div>
          )}

          {isCollapsed && (
            <div className="px-4 pb-6 pt-3">
              <div className="border-t border-white/10 pt-3">
                <div className="flex justify-center">
                  <button
                    type="button"
                    className="flex h-10 w-10 items-center justify-center rounded-2xl bg-transparent text-white transition-colors hover:bg-white/10"
                    aria-label="Expand sidebar"
                    onClick={() => onToggleCollapse?.()}
                  >
                    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 19l7-7-7-7M5 19l7-7-7-7"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
const getSubmenuIcon = (path) => {
  const map = {
    "/products/items": ShoppingBag,
    "/products/plans": Sparkles,
    "/products/addons": ShoppingCart,
    "/products/coupons": FileText,
    "/products/pricing-widgets": BarChart3,
    "/products/price-lists": FileText,
    "/sales/quotes": FileText,
    "/sales/retainer-invoices": File,
    "/sales/invoices": FileText,
    "/sales/sales-receipts": ShoppingCart,
    "/sales/subscriptions": Calendar,
    "/sales/credit-notes": CreditCard,
    "/payments/payments-received": CreditCard,
    "/payments/payment-links": FileText,
    "/payments/gateways": BarChart3,
    "/expenses": FileText,
    "/expenses/recurring-expenses": Clock3,
    "/time-tracking/projects": BarChart3,
    "/time-tracking/timesheet": Clock3,
    "/time-tracking/approvals": FileText,
    "/time-tracking/customer-approvals": Users,
    "/settings/all-settings": FileText,
    "/settings/organization-settings/users-roles/users": Users,
    "/settings/organization-settings/users-roles/roles": Users,
  };
  return map[path] || FileText;
};
