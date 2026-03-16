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
      { label: "Product Catalog", to: "/products", icon: "product-catalog" },
      { label: "Sales", to: "/sales", icon: "sales" },
      { label: "Payments", to: "/payments", icon: "payments" },
      { label: "Expenses", to: "/expenses", icon: "expenses" },
      { label: "Time Tracking", to: "/time-tracking", icon: "time-tracking" },
      { label: "Events", to: "/events", icon: "events" },
      { label: "Reports", to: "/reports", icon: "reports" },
      { label: "Documents", to: "/documents", icon: "documents" },
    ],
  },
];

const subMenus: NavConfig["subMenus"] = {
  "/products": [
    { label: "Items", to: "/products/items" },
    { label: "Plans", to: "/products/plans" },
    { label: "Addons", to: "/products/addons" },
    { label: "Coupons", to: "/products/coupons" },
    { label: "Pricing Widgets", to: "/products/pricing-widgets" },
    { label: "Price Lists", to: "/products/price-lists" },
  ],
  "/sales": [
    { label: "Quotes", to: "/sales/quotes" },
    { label: "Retainer Invoices", to: "/sales/retainer-invoices" },
    { label: "Invoices", to: "/sales/invoices" },
    { label: "Sales Receipts", to: "/sales/sales-receipts" },
    { label: "Subscriptions", to: "/sales/subscriptions" },
    { label: "Credit Notes", to: "/sales/credit-notes" },
  ],
  "/payments": [
    { label: "Payments Received", to: "/payments/payments-received" },
    { label: "Payment Links", to: "/payments/payment-links" },
    { label: "Gateways", to: "/payments/gateways" },
  ],
  "/expenses": [
    { label: "Expenses", to: "/expenses" },
    { label: "Recurring Expenses", to: "/expenses/recurring-expenses", showAddBadge: true },
  ],
  "/time-tracking": [
    { label: "Projects", to: "/time-tracking/projects" },
    { label: "Timesheet", to: "/time-tracking/timesheet" },
    { label: "Approvals", to: "/time-tracking/approvals" },
    { label: "Customer Approvals", to: "/time-tracking/customer-approvals" },
  ],
  "/settings": [
    { label: "All Settings", to: "/settings/all-settings" },
    { label: "Users", to: "/settings/organization-settings/users-roles/users" },
    { label: "Roles", to: "/settings/organization-settings/users-roles/roles" },
  ],
};

export const getNavConfigForRole = (_role: string): NavConfig => {
  // Temporary: return same nav for all roles until role-specific mapping is added.
  return {
    sections: baseSections,
    subMenus,
  };
};

export default getNavConfigForRole;
