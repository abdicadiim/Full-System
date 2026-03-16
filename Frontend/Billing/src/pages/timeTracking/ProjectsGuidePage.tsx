import React from "react";

const sections = [
  {
    id: "basic-functions",
    title: "Basic Functions in Projects",
    items: [
      "Enable Time Tracking",
      "Create Project",
      "Billing Method",
      "Budget Type",
      "Tasks",
      "Import Projects",
    ],
  },
  {
    id: "functions",
    title: "Functions in Projects",
    items: [
      "Log Time (Manual and Start Timer)",
      "Track Project Cost and Revenue",
      "Create and Send Project Quotes",
      "Invoice Customers for Projects",
      "Record Project Expenses",
      "Create Retainer Invoice for Projects",
      "Bill Vendors for a Project",
      "Manual Journals",
      "Bulk Update Line Items",
      "Track Transactions",
      "Profitability Report",
    ],
  },
  {
    id: "manage-projects",
    title: "Manage Projects",
    items: [
      "Filter Projects",
      "Sort Projects",
      "Card and List View",
    ],
  },
  {
    id: "other-actions",
    title: "Other Actions in Projects",
    items: [
      "Edit Projects",
      "Clone Projects",
      "Add Users",
      "Mark Project as Inactive",
      "Delete Project",
      "Bulk Update",
      "Bulk Actions",
      "Export Projects",
    ],
  },
  {
    id: "preferences",
    title: "Projects Preferences",
    items: ["Field Customization", "Custom Buttons", "Related Lists"],
  },
];

const basicSteps = [
  {
    title: "Enable Time Tracking",
    steps: [
      "Go to Settings in the top right.",
      "Open Preferences > General.",
      "Enable Timesheet in module selection.",
      "Click Save.",
    ],
  },
  {
    title: "Create Project",
    steps: [
      "Go to Time Tracking > Projects.",
      "Click + New Project.",
      "Enter project name, description, and customer.",
      "Choose billing method and optional customer approval.",
      "Save the project.",
    ],
  },
  {
    title: "Billing Methods",
    steps: [
      "Fixed Cost for Project",
      "Based on Project Hours",
      "Based on Task Hours",
      "Based on Staff Hours",
    ],
  },
  {
    title: "Budget Types",
    steps: [
      "Total Budget Cost",
      "Total Project Hours (HH:MM)",
      "Hours Per Task",
      "Hours Per Staff",
      "Account Level Budgets",
    ],
  },
  {
    title: "Import Projects and Tasks",
    steps: [
      "Go to Time Tracking > Projects.",
      "Click the gear icon.",
      "Choose Import Projects or Import Tasks.",
      "Upload CSV/TSV/XLS (max 1 MB), map fields, preview, and import.",
    ],
  },
];

const functionSteps = [
  {
    title: "Log Time",
    steps: [
      "Open project and click Log Time.",
      "Use Manual entry (date, task, time spent) or Start Timer (Ctrl/cmd + t).",
      "Stop/Pause/Discard timer and save entry.",
    ],
  },
  {
    title: "Sales Transactions",
    steps: [
      "Create Quote from project and send to customer.",
      "Create Invoice for project (supports retainers and sorting options).",
      "Create Retainer Invoice and apply retainers while invoicing.",
      "Associate multiple projects to invoice if needed.",
    ],
  },
  {
    title: "Purchase Transactions",
    steps: [
      "Record project expenses (auto-populates customer and project).",
      "Mark bills as billable and associate project to line items.",
      "Associate project in Vendor Credits and Purchase Orders.",
    ],
  },
  {
    title: "Manual Journals",
    steps: [
      "Open project, choose More Transaction > Create Manual Journal.",
      "Associate project on each journal row.",
      "Save and publish.",
    ],
  },
  {
    title: "Reporting",
    steps: [
      "Use Profit and Loss with Advanced Filter = Project.",
      "Use transaction reports like Bills/Invoices/Quotes details filtered by project.",
      "Use Project Cost Summary and Project Revenue Summary for budget vs actuals.",
    ],
  },
  {
    title: "Cost Tracking for Staff",
    steps: [
      "Enable cost tracking in Settings > Preferences > Timesheet.",
      "Set user cost per hour in Settings > Users and Roles.",
      "Adjust cost while logging time if needed.",
      "Review totals in timesheets and project cost reports.",
    ],
  },
];

const manageSteps = [
  "Filter projects by status using View By.",
  "Sort projects by clicking list columns.",
  "Switch between List View and Card View.",
];

const otherActions = [
  "Edit project",
  "Clone project",
  "Add users",
  "Mark active/inactive",
  "Delete project",
  "Bulk update fields",
  "Bulk actions",
  "Export projects",
];

export default function ProjectsGuidePage() {
  return (
    <div className="min-h-screen bg-[#f3f8f8] text-slate-900">
      <div className="mx-auto max-w-[1300px] p-4 md:p-6 grid grid-cols-1 lg:grid-cols-[280px,1fr] gap-4">
        <aside className="lg:sticky lg:top-4 self-start rounded-2xl border border-[#b9d4d8] bg-white p-4">
          <h2 className="text-[14px] font-semibold text-[#156372] mb-3">Projects Guide</h2>
          <nav className="space-y-2">
            {sections.map((section) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className="block text-[12px] text-[#4a666d] hover:text-[#156372]"
              >
                {section.title}
              </a>
            ))}
          </nav>
        </aside>

        <main className="space-y-4">
          <section className="rounded-2xl border border-[#b9d4d8] bg-white p-5">
            <h1 className="text-[30px] font-semibold leading-tight">
              Projects in Zoho Books
            </h1>
            <p className="mt-2 text-[13px] text-[#55737a] leading-6">
              Service and product businesses can track project work by hours, tasks, or fixed rates. This guide covers setup,
              operations, billing, expenses, reporting, and administration for projects.
            </p>
          </section>

          <section id="basic-functions" className="rounded-2xl border border-[#b9d4d8] bg-white p-5">
            <h2 className="text-[22px] font-semibold mb-3">Basic Functions in Projects</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
              {sections[0].items.map((item) => (
                <div key={item} className="rounded-lg border border-[#d7e7ea] bg-[#f7fbfc] px-3 py-2 text-[12px]">
                  {item}
                </div>
              ))}
            </div>
            <div className="space-y-3">
              {basicSteps.map((entry) => (
                <div key={entry.title} className="rounded-lg border border-[#d7e7ea] p-3">
                  <h3 className="text-[14px] font-semibold text-[#156372]">{entry.title}</h3>
                  <ul className="mt-2 list-disc pl-5 text-[12px] text-slate-700 space-y-1">
                    {entry.steps.map((step) => (
                      <li key={step}>{step}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>

          <section id="functions" className="rounded-2xl border border-[#b9d4d8] bg-white p-5">
            <h2 className="text-[22px] font-semibold mb-3">Functions in Projects</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
              {sections[1].items.map((item) => (
                <div key={item} className="rounded-lg border border-[#d7e7ea] bg-[#f7fbfc] px-3 py-2 text-[12px]">
                  {item}
                </div>
              ))}
            </div>
            <div className="space-y-3">
              {functionSteps.map((entry) => (
                <div key={entry.title} className="rounded-lg border border-[#d7e7ea] p-3">
                  <h3 className="text-[14px] font-semibold text-[#156372]">{entry.title}</h3>
                  <ul className="mt-2 list-disc pl-5 text-[12px] text-slate-700 space-y-1">
                    {entry.steps.map((step) => (
                      <li key={step}>{step}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>

          <section id="manage-projects" className="rounded-2xl border border-[#b9d4d8] bg-white p-5">
            <h2 className="text-[22px] font-semibold mb-3">Manage Projects</h2>
            <ul className="list-disc pl-5 text-[12px] text-slate-700 space-y-1">
              {manageSteps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ul>
          </section>

          <section id="other-actions" className="rounded-2xl border border-[#b9d4d8] bg-white p-5">
            <h2 className="text-[22px] font-semibold mb-3">Other Actions in Projects</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
              {otherActions.map((action) => (
                <div key={action} className="rounded-lg border border-[#d7e7ea] bg-[#f7fbfc] px-3 py-2 text-[12px]">
                  {action}
                </div>
              ))}
            </div>
          </section>

          <section id="preferences" className="rounded-2xl border border-[#b9d4d8] bg-white p-5">
            <h2 className="text-[22px] font-semibold mb-3">Projects Preferences</h2>
            <ul className="list-disc pl-5 text-[12px] text-slate-700 space-y-1">
              <li>Field Customization: Add custom fields with suitable data types.</li>
              <li>Custom Buttons: Build actions/links with scripts.</li>
              <li>Related Lists: Show linked data from modules or external providers.</li>
            </ul>
          </section>
        </main>
      </div>
    </div>
  );
}
