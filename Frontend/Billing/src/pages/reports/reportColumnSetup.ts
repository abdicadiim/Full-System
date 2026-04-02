export type ColumnGroup = {
  label: string;
  items: string[];
};

export type ReportColumnSetup = {
  availableGroups: ColumnGroup[];
};

const DEFAULT_COLUMN_GROUPS: ColumnGroup[] = [
  { label: "Reports", items: ["Name", "Date", "Status", "Amount"] },
  { label: "Locations", items: ["Location", "Warehouse", "Country", "City"] },
];

const COLUMN_GROUPS_BY_REPORT: Record<string, ColumnGroup[]> = {
  "sales-by-customer": [
    {
      label: "Reports",
      items: ["Name", "Customer Name", "Invoice Count", "Sales", "Sales With Tax", "Average Price"],
    },
    { label: "Customer", items: ["Customer Type", "Customer Email", "Sales Person"] },
    { label: "Locations", items: ["Location", "Country", "City"] },
  ],
  "sales-by-item": [
    {
      label: "Reports",
      items: ["Item", "Item Name", "SKU", "Quantity Sold", "Amount", "Average Price", "Sales With Tax"],
    },
    {
      label: "Item",
      items: [
        "Item Type",
        "Product Type",
        "Status",
        "Usage Unit",
        "Sales Description",
        "Sales Price",
        "Created By",
        "Created Time",
        "Last Modified Time",
        "Purchase Description",
        "Purchase Price",
      ],
    },
    { label: "Locations", items: ["Location", "Customer Name"] },
  ],
  "sales-by-plan": [
    { label: "Reports", items: ["Plan", "Plan Name", "Subscriptions", "Invoices", "Sales", "Sales With Tax"] },
    { label: "Plan", items: ["Billing Cycle", "Status", "Created By", "Created Time", "Last Modified Time"] },
    { label: "Locations", items: ["Location", "Customer Name"] },
  ],
  "sales-by-addon": [
    {
      label: "Reports",
      items: ["Addon", "Addon Name", "Quantity Sold", "Customers", "Sales", "Sales With Tax", "Average Price"],
    },
    { label: "Addon", items: ["Status", "Created By", "Created Time", "Last Modified Time"] },
    { label: "Locations", items: ["Location", "Customer Name"] },
  ],
  "sales-by-coupon": [
    { label: "Reports", items: ["Coupon", "Coupon Code", "Uses", "Discount", "Sales", "Net Sales"] },
    { label: "Coupon", items: ["Type", "Status", "Created By", "Created Time"] },
    { label: "Locations", items: ["Location", "Customer Name"] },
  ],
  "sales-by-sales-person": [
    {
      label: "Reports",
      items: ["Sales Person", "Name", "Invoices", "Sales", "Sales With Tax", "Average Price"],
    },
    { label: "Sales Person", items: ["Email", "Status"] },
    { label: "Locations", items: ["Location"] },
  ],
  "sales-summary": [
    { label: "Reports", items: ["Date", "Name", "Invoices", "Credit Notes", "Sales Receipts", "Sales", "Sales With Tax"] },
    { label: "Locations", items: ["Location"] },
  ],
  "time-to-get-paid": [
    { label: "Reports", items: ["Customer Name", "0 - 15 Days", "16 - 30 Days", "31 - 45 Days", "Above 45 Days"] },
  ],
  signups: [
    {
      label: "Reports",
      items: ["Date", "Signups", "Active", "Inactive"],
    },
  ],
  activations: [
    {
      label: "Reports",
      items: ["Date", "Activations", "Active Subscriptions", "Notes"],
    },
  ],
  "activations-by-country": [
    {
      label: "Reports",
      items: ["Country", "Total"],
    },
  ],
  "active-trials": [
    {
      label: "Reports",
      items: [
        "SUBSCRIPTION#",
        "TRIAL START DATE",
        "SUBSCRIPTION STATUS",
        "TRIAL END DATE",
        "REMAINING TRIAL DAYS",
        "PLAN NAME",
        "PRODUCT NAME",
        "CUSTOMER NAME",
        "CUSTOMER SALUTATION",
        "EMAIL",
        "REFERENCE#",
        "MOBILE",
      ],
    },
  ],
  "inactive-trials": [
    {
      label: "Reports",
      items: [
        "CUSTOMER NAME",
        "EMAIL",
        "SUBSCRIPTION#",
        "SUBSCRIPTION STATUS",
        "PLAN NAME",
        "PLAN CODE",
        "AMOUNT",
        "TRIAL START DATE",
        "TRIAL END DATE",
        "CUSTOMER SALUTATION",
        "REFERENCE NUMBER",
        "MOBILE",
      ],
    },
  ],
  "ar-aging-summary": [
    {
      label: "Reports",
      items: ["Customer Name", "Current", "1-15 Days", "16-30 Days", "31-45 Days", "> 45 Days", "Total", "Total (FCY)"],
    },
  ],
  "ar-aging-details": [
    {
      label: "Reports",
      items: ["DATE", "DUE DATE", "TRANSACTION#", "TYPE", "STATUS", "CUSTOMER NAME", "AGE", "AMOUNT", "BALANCE DUE"],
    },
  ],
  "invoice-details": [
    {
      label: "Reports",
      items: ["STATUS", "INVOICE DATE", "DUE DATE", "INVOICE#", "ORDER NUMBER", "CUSTOMER NAME", "TOTAL", "BALANCE DUE"],
    },
  ],
  "receivable-details": [
    {
      label: "Reports",
      items: [
        "Customer Name",
        "Date",
        "Transaction#",
        "Reference#",
        "Status",
        "Transaction Type",
        "Item Name",
        "Quantity Ordered",
        "Item Price (BCY)",
        "Total (BCY)",
      ],
    },
    { label: "Transaction", items: ["Invoice", "Credit Note"] },
  ],
};

const COLUMN_GROUPS_BY_CATEGORY: Record<string, ColumnGroup[]> = {
  receivables: [
    { label: "Reports", items: ["Invoice", "Credit Note", "Retainer Invoice", "Quote", "Customer", "Due Date", "Status", "Amount"] },
    { label: "Locations", items: ["Location", "Warehouse", "Country"] },
  ],
  "acquisition-insights": [
    { label: "Reports", items: ["Trial", "Customer", "Date", "Stage", "Conversion Rate"] },
    { label: "Locations", items: ["Location", "Country"] },
  ],
  subscriptions: [
    { label: "Reports", items: ["Subscription", "Customer", "Plan", "Addon", "Status", "Date"] },
    { label: "Locations", items: ["Location", "Country"] },
  ],
  retention: [
    { label: "Reports", items: ["Customer", "Cohort", "Renewal", "Subscription", "Date", "Status"] },
    { label: "Locations", items: ["Location", "Country"] },
  ],
  churn: [
    { label: "Reports", items: ["Customer", "Subscription", "Retry Count", "Status", "Date"] },
    { label: "Locations", items: ["Location", "Country"] },
  ],
  "payments-received": [
    { label: "Reports", items: ["Customer Name", "0 - 15 Days", "16 - 30 Days", "31 - 45 Days", "Above 45 Days"] },
  ],
  "purchases-expenses": [
    { label: "Reports", items: ["Purchase", "Expense", "Bill", "Vendor", "Project", "Date", "Amount"] },
    { label: "Locations", items: ["Location", "Country"] },
  ],
  projects: [
    { label: "Reports", items: ["Project", "Timesheet", "Task", "Customer", "User", "Date", "Hours"] },
    { label: "Locations", items: ["Location", "Country"] },
  ],
  "projects-timesheets": [
    { label: "Reports", items: ["Project", "Timesheet", "Task", "Customer", "User", "Date", "Hours"] },
    { label: "Locations", items: ["Location", "Country"] },
  ],
  activity: [
    { label: "Reports", items: ["Mail", "User Action", "Portal Activity", "Review", "Date"] },
    { label: "Locations", items: ["Location", "Country"] },
  ],
};

export const getReportColumnGroups = (reportId: string, categoryId: string): ColumnGroup[] => {
  if (COLUMN_GROUPS_BY_REPORT[reportId]) {
    return COLUMN_GROUPS_BY_REPORT[reportId];
  }

  if (COLUMN_GROUPS_BY_CATEGORY[categoryId]) {
    return COLUMN_GROUPS_BY_CATEGORY[categoryId];
  }

  return DEFAULT_COLUMN_GROUPS;
};
