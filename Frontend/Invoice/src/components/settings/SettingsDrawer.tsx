import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  BarChart3,
  Building2,
  CreditCard,
  FileText,
  Grid3x3,
  Package,
  Palette,
  ScrollText,
  Settings,
  ShoppingCart,
  StickyNote,
  Users,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

type SettingsItem = {
  label: string;
  path?: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
};

type SettingsSection = {
  title: string;
  items: SettingsItem[];
};

const sections: SettingsSection[] = [
  {
    title: "Organization",
    items: [
      { label: "Organization Profile", path: "/settings/profile", icon: Building2 },
      { label: "Branding", path: "/settings/branding", icon: Palette },
      { label: "Usage Stats", path: "/settings/usage-stats", icon: BarChart3 },
      { label: "Users", path: "/settings/users", icon: Users },
      { label: "Roles", path: "/settings/roles", icon: Users },
      { label: "Taxes", path: "/settings/taxes", icon: FileText },
      { label: "Customer Portal", path: "/settings/customer-portal", icon: StickyNote },
    ],
  },
  {
    title: "General Preferences",
    items: [
      { label: "Items", path: "/settings/items", icon: Package },
      { label: "Customers", path: "/sales/customers", icon: Users },
      { label: "Quotes", path: "/settings/quotes", icon: FileText },
      { label: "Invoices", path: "/settings/invoices", icon: FileText },
      { label: "Recurring Invoices", path: "/settings/recurring-invoices", icon: ScrollText },
      { label: "Sales Receipt", path: "/settings/sales-receipts", icon: ShoppingCart },
      { label: "Payments Received", path: "/settings/payments-received", icon: CreditCard },
      { label: "Credit Notes", path: "/settings/credit-notes", icon: FileText },
      { label: "Delivery Notes", path: "/settings/delivery-notes", icon: FileText },
      { label: "Packing Slips", path: "/settings/packing-slips", icon: FileText },
      { label: "Expenses", path: "/settings/expenses", icon: FileText },
      { label: "Projects", path: "/settings/projects", icon: Grid3x3 },
      { label: "Timesheet", path: "/settings/timesheet", icon: ScrollText },
    ],
  },
  {
    title: "More",
    items: [
      { label: "Online Payments", path: "/settings/online-payments", icon: CreditCard },
      { label: "Reminders", path: "/settings/reminders", icon: Settings },
      { label: "PDF Templates", path: "/settings/customization/pdf-templates", icon: FileText },
      { label: "Email Notifications", path: "/settings/customization/email-notifications", icon: FileText },
      { label: "Integrations", path: "/settings/integrations/zoho", icon: Grid3x3 },
      { label: "API Usage", path: "/settings/developer/api-usage", icon: BarChart3 },
      { label: "Data Management", path: "/settings/custom-modules", icon: Settings },
      { label: "Marketplace", path: "/settings/marketplace", icon: Grid3x3 },
    ],
  },
];

type SettingsDrawerProps = {
  open: boolean;
  onClose: () => void;
};

export default function SettingsDrawer({ open, onClose }: SettingsDrawerProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const panelRef = useRef<HTMLDivElement | null>(null);

  const filteredSections = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sections;
    return sections
      .map((section) => ({
        ...section,
        items: section.items.filter((item) => item.label.toLowerCase().includes(q)),
      }))
      .filter((section) => section.items.length > 0);
  }, [query]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[60]">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="Close settings"
        onClick={onClose}
      />
      <div
        ref={panelRef}
        className="absolute right-4 top-16 h-[calc(100%-5rem)] w-[360px] max-w-[92vw] rounded-2xl bg-white shadow-2xl border border-slate-200 flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-label="Settings"
      >
        <div className="flex items-center justify-between px-5 pt-4">
          <div className="text-lg font-semibold text-slate-900">Settings</div>
          <button
            type="button"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100"
            onClick={onClose}
            aria-label="Close settings"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="px-5 pt-3">
          <div className="relative">
            <Settings className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search Settings"
              className="w-full h-10 rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#156372]/40"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {filteredSections.map((section) => (
            <div key={section.title} className="mb-5 last:mb-0">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
                {section.title}
              </div>
              <div className="space-y-1">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => {
                        if (item.path) navigate(item.path);
                        onClose();
                      }}
                      className="w-full flex items-center gap-3 rounded-lg px-2.5 py-2 text-left text-sm text-slate-700 hover:bg-slate-100"
                    >
                      <Icon className="h-4 w-4 text-slate-400" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>,
    document.body
  );
}
