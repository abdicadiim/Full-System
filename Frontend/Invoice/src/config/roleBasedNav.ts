type NavItem = {
  label: string;
  to: string;
  icon: string;
  special?: boolean;
};

type NavSection = {
  items: NavItem[];
};

type NavConfig = {
  sections: NavSection[];
  subMenus: Record<string, Array<{ label: string; to: string; showAddBadge?: boolean }>>;
};

const baseSections: NavSection[] = [
  {
    items: [
      { label: "Home", to: "/dashboard", icon: "home" },
      { label: "Customers", to: "/sales/customers", icon: "customers" },
      { label: "Items", to: "/products/items", icon: "items" },
      { label: "Quotes", to: "/sales/quotes", icon: "quotes" },
      { label: "Invoices", to: "/sales/invoices", icon: "invoices" },
      { label: "Sales Receipts", to: "/sales/sales-receipts", icon: "sales-receipts" },
      { label: "Recurring Invoices", to: "/sales/recurring-invoices", icon: "recurring-invoices" },
      { label: "Payments Received", to: "/payments/payments-received", icon: "payments-received" },
      { label: "Credit Notes", to: "/sales/credit-notes", icon: "credit-notes" },
      { label: "Expenses", to: "/expenses", icon: "expenses" },
      { label: "Time Tracking", to: "/time-tracking/projects", icon: "time-tracking" },
      { label: "Reports", to: "/reports", icon: "reports" },
    ],
  },
];

const subMenus: NavConfig["subMenus"] = {};

export const getNavConfigForRole = (_role: string): NavConfig => {
  // Temporary: return same nav for all roles until role-specific mapping is added.
  return {
    sections: baseSections,
    subMenus,
  };
};

export default getNavConfigForRole;
