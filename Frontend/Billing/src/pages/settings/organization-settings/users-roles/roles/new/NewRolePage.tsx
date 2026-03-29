import React, { useState, useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { HelpCircle, ChevronRight, ChevronDown, AlertCircle, Lock } from "lucide-react";
import { rolesAPI } from "../../../../../../services/api";
import { AUTH_USER_REFRESH_EVENT } from "../../../../../../services/auth";
import { usePermissions } from "../../../../../../hooks/usePermissions";
import AccessDenied from "../../../../../../components/AccessDenied";

export default function NewRolePage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const isEditMode = Boolean(id);
  const { hasPermission, loading: permissionsLoading } = usePermissions();
  const canManageRoles = hasPermission("settings", "Roles");
  const [isLoadingRole, setIsLoadingRole] = useState(isEditMode);
  const [roleName, setRoleName] = useState("");
  const [description, setDescription] = useState("");
  const [isAccountantRole, setIsAccountantRole] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);

  const [permissions, setPermissions] = useState({
    products: {
      "Products": { full: false, view: false, create: false, edit: false, delete: false },
      "Plan": { full: false, view: false, create: false, edit: false, delete: false },
      "Addon": { full: false, view: false, create: false, edit: false, delete: false },
      "Coupon": { full: false, view: false, create: false, edit: false, delete: false },
      "Price List": { full: false, view: false, create: false, edit: false, delete: false },
      "Pricing Widgets": { full: false, view: false, create: false, edit: false, delete: false },
    },
    customers: {
      "Customers": { full: false, view: false, create: false, edit: false, delete: false, morePermissions: {} },
    },
    transactions: {
      "Invoices": { full: false, view: false, create: false, edit: false, delete: false, approve: false, morePermissions: {} },
      "Payments": { full: false, view: false, create: false, edit: false, delete: false, approve: false, morePermissions: {} },
      "Credit Notes": { full: false, view: false, create: false, edit: false, delete: false, approve: false, morePermissions: {} },
      "Quotes": { full: false, view: false, create: false, edit: false, delete: false, approve: false, morePermissions: {} },
      "Sales Receipt": { full: false, view: false, create: false, edit: false, delete: false, approve: false, morePermissions: {} },
    },
    subscriptions: {
      "Subscriptions": { full: false, view: false, create: false, edit: false, delete: false },
    },
    tasks: {
      "Tasks": { full: false, view: false, create: false, edit: false, delete: false, morePermissions: {} },
    },
    locations: {
      "Locations": { full: false, view: false, create: false, edit: false, delete: false },
    },
    multipleTransactionSeries: {
      "Multiple Transaction Series": { full: false, view: false, create: false, edit: false, delete: false },
    },
    usageRecords: {
      "Usage Records": { full: false, view: false, create: false, edit: false, delete: false },
    },
    items: {
      "Item": { full: false, view: false, create: false, edit: false, delete: false },
    },
    timesheets: {
      "Projects": { full: false, view: false, create: false, edit: false, delete: false, morePermissions: {} },
      "noExpenses": true,
    },
    expenses: {
      "Expenses": { full: false, view: false, create: false, edit: false, delete: false },
    },
    settings: {
      "Events": false,
      "Update organization profile": false,
      "Users": false,
      "Roles": false,
      "Export data": false,
      "General preferences": false,
      "Payment Terms": false,
      "Taxes": false,
      "Currencies": false,
      "Templates": false,
      "Hosted Pages": false,
      "Email Notifications": false,
      "Reminders": false,
      "Provide access to protected data": false,
      "Manage Integration": false,
      "Automation": false,
      "Incoming Webhook": false,
      "Signal": false,
    },
    documents: {
      "View Documents": false,
      "Upload Documents": false,
      "Delete Documents": false,
      "Manage Folder": false,
    },
    dashboard: {
      "View Dashboard": false,
      "Projects": false,
      "Sales and Expenses": false,
      "Your Top Expense": false,
    },
    reportsData: {
      fullReportsAccess: false,
      Sales: {
        "Sales by Customer": { full: false, view: false, export: false, schedule: false, share: false, locked: true },
        "Sales by Item": { full: false, view: false, export: false, schedule: false, share: false },
        "Order Fulfillment By Item": { full: false, view: false, export: false, schedule: false, share: false },
        "Sales Return History": { full: false, view: false, export: false, schedule: false, share: false },
        "Sales by Sales Person": { full: false, view: false, export: false, schedule: false, share: false },
        "EC Sales list": { full: false, view: false, export: false, schedule: false, share: false },
        "Sales Summary": { full: false, view: false, export: false, schedule: false, share: false },
        "Profit By Item": { full: false, view: false, export: false, schedule: false, share: false }
      },
      Receivables: {
        "AR Aging Summary": { full: false, view: false, export: false, schedule: false, share: false },
        "AR Aging Details": { full: false, view: false, export: false, schedule: false, share: false },
        "Invoice Details": { full: false, view: false, export: false, schedule: false, share: false },
        "Retainer Invoice Details": { full: false, view: false, export: false, schedule: false, share: false },
        "Quote Details": { full: false, view: false, export: false, schedule: false, share: false },
        "Bad Debts": { full: false, view: false, export: false, schedule: false, share: false },
        "Customer Balance Summary": { full: false, view: false, export: false, schedule: false, share: false },
        "Receivable Summary": { full: false, view: false, export: false, schedule: false, share: false },
        "Receivable Details": { full: false, view: false, export: false, schedule: false, share: false },
        "Subscription Order Details": { full: false, view: false, export: false, schedule: false, share: false },
        "Progress Invoice Summary": { full: false, view: false, export: false, schedule: false, share: false }
      },
      // Keep it somewhat brief, but representative of the others
      "Acquisition Insights": {
        "Active Trials": { full: false, view: false, export: false, schedule: false, share: false },
        "Inactive Trials": { full: false, view: false, export: false, schedule: false, share: false },
        "Trial to Live Conversions": { full: false, view: false, export: false, schedule: false, share: false },
        "Average Sales Cycle Length": { full: false, view: false, export: false, schedule: false, share: false },
        "Lost Opportunities": { full: false, view: false, export: false, schedule: false, share: false }
      },
      "Signups & Activations": {
        "Signups": { full: false, view: false, export: false, schedule: false, share: false },
        "Activations": { full: false, view: false, export: false, schedule: false, share: false },
        "Activations By Country": { full: false, view: false, export: false, schedule: false, share: false }
      },
      Subscriptions: {
        "Active Subscriptions": { full: false, view: false, export: false, schedule: false, share: false },
        "Net Customers": { full: false, view: false, export: false, schedule: false, share: false },
        "Subscription Details": { full: false, view: false, export: false, schedule: false, share: false },
        "Upgrades": { full: false, view: false, export: false, schedule: false, share: false },
        "Downgrades": { full: false, view: false, export: false, schedule: false, share: false },
        "Summary": { full: false, view: false, export: false, schedule: false, share: false },
        "ARPU": { full: false, view: false, export: false, schedule: false, share: false },
        "LTV": { full: false, view: false, export: false, schedule: false, share: false }
      },
      Revenue: {
        "Net Revenue": { full: false, view: false, export: false, schedule: false, share: false },
        "Revenue By Country": { full: false, view: false, export: false, schedule: false, share: false }
      },
      Retention: {
        "Revenue Retention Cohort": { full: false, view: false, export: false, schedule: false, share: false },
        "Revenue Retention Rate": { full: false, view: false, export: false, schedule: false, share: false },
        "Renewal Summary": { full: false, view: false, export: false, schedule: false, share: false },
        "Renewal Failures": { full: false, view: false, export: false, schedule: false, share: false },
        "Subscription Retention Rate": { full: false, view: false, export: false, schedule: false, share: false }
      },
      "MRR & ARR": {
        "MRR": { full: false, view: false, export: false, schedule: false, share: false },
        "ARR": { full: false, view: false, export: false, schedule: false, share: false },
        "MRR Quick Ratio": { full: false, view: false, export: false, schedule: false, share: false }
      },
      Churn: {
        "Under Risk": { full: false, view: false, export: false, schedule: false, share: false },
        "Non Renewing Profiles": { full: false, view: false, export: false, schedule: false, share: false },
        "Churned After Retries": { full: false, view: false, export: false, schedule: false, share: false },
        "Churned Subscriptions": { full: false, view: false, export: false, schedule: false, share: false },
        "Subscription Expiry": { full: false, view: false, export: false, schedule: false, share: false }
      },
      "Churn Insights": {
        "Net Cancellations": { full: false, view: false, export: false, schedule: false, share: false },
        "Churn Rate": { full: false, view: false, export: false, schedule: false, share: false },
        "Cancellations by Country": { full: false, view: false, export: false, schedule: false, share: false },
        "Cancellations by Product": { full: false, view: false, export: false, schedule: false, share: false },
        "Revenue Churn": { full: false, view: false, export: false, schedule: false, share: false }
      },
      "Payments Received": {
        "Payments Received": { full: false, view: false, export: false, schedule: false, share: false },
        "Time to Get Paid": { full: false, view: false, export: false, schedule: false, share: false },
        "Credit Note Details": { full: false, view: false, export: false, schedule: false, share: false },
        "Refund History": { full: false, view: false, export: false, schedule: false, share: false },
        "Payment Failures": { full: false, view: false, export: false, schedule: false, share: false },
        "Automatic Refund Details": { full: false, view: false, export: false, schedule: false, share: false },
        "Card Expiry": { full: false, view: false, export: false, schedule: false, share: false }
      },
      "Purchases and Expenses": {
        "Expense Details": { full: false, view: false, export: false, schedule: false, share: false },
        "Expenses by Category": { full: false, view: false, export: false, schedule: false, share: false },
        "Expenses by Customer": { full: false, view: false, export: false, schedule: false, share: false },
        "Expenses by Project": { full: false, view: false, export: false, schedule: false, share: false },
        "Billable Expense Details": { full: false, view: false, export: false, schedule: false, share: false }
      },
      Taxes: {
        "Tax Summary": { full: false, view: false, export: false, schedule: false, share: false },
        "Overseas Digital Tax Summary": { full: false, view: false, export: false, schedule: false, share: false }
      },
      "Projects and Timesheet": {
        "Timesheet Details": { full: false, view: false, export: false, schedule: false, share: false },
        "Project Summary": { full: false, view: false, export: false, schedule: false, share: false },
        "Project Details": { full: false, view: false, export: false, schedule: false, share: false },
        "Projects Revenue Summary": { full: false, view: false, export: false, schedule: false, share: false }
      },
      Activity: {
        "System Mails": { full: false, view: false, export: false, schedule: false, share: false },
        "SMS Notifications": { full: false, view: false, export: false, schedule: false, share: false },
        "Activity Logs": { full: false, view: false, export: false, schedule: false, share: false },
        "Exception Report": { full: false, view: false, export: false, schedule: false, share: false },
        "Portal Activities": { full: false, view: false, export: false, schedule: false, share: false },
        "Customer Reviews": { full: false, view: false, export: false, schedule: false, share: false },
        "API Usage": { full: false, view: false, export: false, schedule: false, share: false }
      },
      Automation: {
        "Scheduled Date Based Workflow Rules": { full: false, view: false, export: false, schedule: false, share: false }
      },
      Distribution: {
        "Sales Region Collection and Outstanding Balance": { full: false, view: false, export: false, schedule: false, share: false },
        "Sales Region Outstanding Balance by Customer": { full: false, view: false, export: false, schedule: false, share: false }
      }
    }
  });

  const [expandedReports, setExpandedReports] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let isMounted = true;

    const loadRole = async () => {
      if (!isEditMode || !id) {
        setIsLoadingRole(false);
        return;
      }

      try {
        setIsLoadingRole(true);
        setError(null);

        const response = await rolesAPI.getById(id);
        if (!response?.success || !response?.data) {
          throw new Error(response?.message || "Failed to load role");
        }

        if (!isMounted) return;
        
        const roleData = response.data;
        setRoleName(roleData.name || "");
        setDescription(roleData.description || "");
        setIsAccountantRole(Boolean(roleData.isAccountantRole));

        if (roleData.permissions) {
           setPermissions(prev => ({
              ...prev,
              ...roleData.permissions
           }));
        }

      } catch (loadError: any) {
        if (!isMounted) return;
        console.error("Error loading role:", loadError);
        setError(loadError?.message || "Failed to load role");
      } finally {
        if (isMounted) setIsLoadingRole(false);
      }
    };

    loadRole();

    return () => {
      isMounted = false;
    };
  }, [id, isEditMode]);

  if (permissionsLoading) {
    return (
      <div className="flex min-h-[40vh] w-full items-center justify-center p-6 text-sm text-gray-500">
        Loading permissions...
      </div>
    );
  }

  if (!canManageRoles) {
    return (
      <AccessDenied
        title="Roles access required"
        message="Your role does not include permission to create or edit roles."
      />
    );
  }

  const handlePermChange = (section: string, item: string, action: string, value: boolean) => {
    setPermissions(prev => {
        const newSection = { ...prev[section as keyof typeof prev] };
        if (action === "full") {
            newSection[item] = { 
                ...newSection[item], 
                full: value, 
                view: value, 
                create: value, 
                edit: value, 
                delete: value 
            };
        } else {
            newSection[item] = { ...newSection[item], [action]: value };
        }
        return { ...prev, [section]: newSection };
    });
  };

  const handleSettingsChange = (section: string, item: string, value: boolean) => {
        setPermissions(prev => ({
            ...prev,
            [section]: {
                ...prev[section as keyof typeof prev],
                [item]: value
            }
        }))
  };

  const handleReportChange = (group: string, report: string, action: string, value: boolean) => {
      setPermissions(prev => {
          const reportsData = prev?.reportsData as any;
          const groupData = reportsData?.[group];
          const current = groupData?.[report];

          if (!groupData || !current || current.locked) return prev; // Cannot change locked/missing

          const updatedReport =
            action === "full"
              ? {
                  ...current,
                  full: value,
                  view: value,
                  export: value,
                  schedule: value,
                  share: value,
                }
              : {
                  ...current,
                  [action]: value,
                };

          return {
            ...prev,
            reportsData: {
              ...reportsData,
              [group]: {
                ...groupData,
                [report]: updatedReport,
              },
            },
          };
      });
  };

  const handleReportGroupSelectAll = (group: string, action: string) => {
      setPermissions(prev => {
          const newReports = { ...prev.reportsData };
          const newGroup = { ...(newReports[group as keyof typeof newReports] as any) };
          
          // Determine if we should set all to true or false by checking if all unlocked are currently true
          const unlockedReports = Object.keys(newGroup).filter(r => !newGroup[r].locked);
          if (unlockedReports.length === 0) return prev;
          
          const areAllTrue = unlockedReports.every(r => {
             if (action === "full") return newGroup[r].full;
             return newGroup[r][action];
          });
          const newValue = !areAllTrue;
          
          Object.keys(newGroup).forEach(report => {
              if (newGroup[report].locked) return;
              
              if (action === "full") {
                 newGroup[report] = {
                     ...newGroup[report],
                     full: newValue,
                     view: newValue,
                     export: newValue,
                     schedule: newValue,
                     share: newValue
                 };
              } else {
                  newGroup[report] = { ...newGroup[report], [action]: newValue };
              }
          });
          
          newReports[group as keyof typeof newReports] = newGroup;
          return { ...prev, reportsData: newReports };
      });
  };

  const toggleReportGroup = (group: string) => {
      setExpandedReports(prev => ({
          ...prev,
          [group]: !prev[group]
      }));
  }

  const renderPermissionTable = (
    title: string, 
    sectionKey: string,
    items: string[], 
    actions: string[] = ["Full", "View", "Create", "Edit", "Delete"],
    hasOthers: boolean = false
  ) => {
      return (
        <div className="bg-white rounded-lg border border-gray-200 mb-6 overflow-hidden">
            <div className="bg-gray-50 border-b border-gray-200 px-4 py-3">
                <h2 className="text-[15px] font-medium text-gray-800">{title}</h2>
                {title === "Subscriptions" && (
                    <p className="text-xs text-gray-700 mt-1">
                        <strong>Note:</strong> Users with this permission will be able to view products, plans, etc, when creating subscriptions even if they don't have access to the Products Catalog module.
                    </p>
                )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-white border-b border-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 w-1/3">Particulars</th>
                    {actions.map(action => (
                      <th key={action} className="px-4 py-3 text-center text-xs font-semibold text-gray-600">
                        {action === "Full" ? "Full Access" : action}
                      </th>
                    ))}
                    {hasOthers && (
                       <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 w-48">Others</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                    {items.map(item => {
                        const perm = (permissions[sectionKey as keyof typeof permissions] as any)[item];
                        if (!perm) return null;
                        return (
                            <tr key={item} className="hover:bg-gray-50">
                                <td className="px-4 py-4 text-sm font-medium text-gray-700">{item}</td>
                                {actions.map(action => {
                                    const actionKey = action.toLowerCase();
                                    // if the action isn't available for this item (like 'approve' on something that doesn't have it), show disabled empty slot
                                    if (perm[actionKey] === undefined) {
                                         return <td key={action} className="px-4 py-4 text-center"></td>;
                                    }
                                    
                                    return (
                                        <td key={action} className="px-4 py-4 text-center">
                                          {action === "Full" && perm[actionKey] === false && ['view', 'create', 'edit', 'delete'].some(k => perm[k]) ? (
                                              // Render indeterminate state manually
                                              <input type="checkbox" className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 accent-blue-600"
                                                ref={el => { if (el) el.indeterminate = true; }}
                                                onChange={(e) => handlePermChange(sectionKey, item, "full", e.target.checked)}
                                              />
                                          ) : (
                                              <input type="checkbox" 
                                               checked={perm[actionKey] || false} 
                                               onChange={(e) => handlePermChange(sectionKey, item, actionKey, e.target.checked)}
                                               className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer accent-blue-600" 
                                             />
                                          )}
                                        </td>
                                    );
                                })}
                                {hasOthers && (
                                    <td className="px-4 py-4 text-left">
                                        {perm.morePermissions && (
                                            <button className="text-sm text-blue-600 hover:text-blue-800">
                                                More Permissions
                                            </button>
                                        )}
                                    </td>
                                )}
                            </tr>
                        )
                    })}
                    {sectionKey === "timesheets" && (
                        <tr>
                             <td colSpan={actions.length + (hasOthers ? 2 : 1)} className="px-4 py-3 bg-white border-t border-gray-100 pl-4">
                                  <label className="flex items-center gap-2 cursor-pointer">
                                      <input type="checkbox" className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 accent-blue-600"
                                        checked={(permissions.timesheets as any).noExpenses}
                                        onChange={(e) => setPermissions(prev => ({...prev, timesheets: { ...prev.timesheets, noExpenses: e.target.checked}}))}
                                      />
                                      <span className="text-sm text-gray-700">Don't allow timesheet staffs to record expenses for the associated project(s).</span>
                                  </label>
                             </td>
                        </tr>
                    )}
                </tbody>
              </table>
            </div>
        </div>
      );
  }

  const renderCheckboxList = (
    title: string, 
    sectionKey: string,
    hasHelpIcons: string[] = []
  ) => {
     const items = permissions[sectionKey as keyof typeof permissions] as Record<string, boolean>;

     return (
        <div className="bg-white rounded-lg border border-gray-200 mb-6 overflow-hidden">
             <div className="bg-gray-50 border-b border-gray-200 px-4 py-3">
                 <label className="flex items-center gap-2 cursor-pointer">
                     <span className="text-[15px] font-medium text-gray-800">{title}</span>
                 </label>
             </div>
             <div className="p-4 space-y-3">
                 {Object.keys(items).map(item => (
                     <label key={item} className="flex items-center gap-2 cursor-pointer w-fit">
                         <input type="checkbox" 
                           checked={items[item] || false} 
                           onChange={(e) => handleSettingsChange(sectionKey, item, e.target.checked)}
                           className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 accent-blue-600" 
                         />
                         <span className="text-sm text-gray-700">{item}</span>
                         {hasHelpIcons.includes(item) && (
                            <HelpCircle size={14} className="text-orange-400" />
                         )}
                     </label>
                 ))}
             </div>
        </div>
     );
  }

  return (
    <div className="p-6 w-full max-w-7xl bg-gray-50 min-h-screen">
      <div className="mb-6">
          <h1 className="text-2xl font-semibold text-gray-900 mb-4">{isEditMode ? "Edit Role" : "New Role"}</h1>
          <div className="flex items-center text-sm">
             <span className="text-gray-500 font-medium">General</span>
             <ChevronRight size={16} className="text-gray-400 mx-1" />
             <span className="text-gray-800">Segmented Access Control</span>
          </div>
          <div className="w-16 h-0.5 bg-blue-600 mt-2"></div>
      </div>

      <div className="bg-white shadow-sm border border-gray-100 p-0 mb-6">
        <div className="p-6 space-y-6">
            <div className="flex">
                <div className="w-48 text-sm font-medium text-red-500 pt-2">
                    Role Name*
                </div>
                <div className="flex-1 max-w-xl">
                    <input
                        type="text"
                        value={roleName}
                        onChange={(e) => setRoleName(e.target.value)}
                        className="w-full h-10 px-3 rounded border border-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-sm"
                    />
                </div>
            </div>
            <div className="flex">
                 <div className="w-48 text-sm font-medium text-gray-600 pt-2">
                    Description
                </div>
                <div className="flex-1 max-w-xl">
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={3}
                        maxLength={500}
                        className="w-full px-3 py-2 rounded border border-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none shadow-sm"
                        placeholder="Max. 500 characters"
                    />
                </div>
            </div>
        </div>

        <div className="bg-[#f0f5fa] p-4 mx-6 mb-6 rounded-md">
            <label className="flex items-start gap-3 cursor-pointer">
                <input
                type="checkbox"
                checked={isAccountantRole}
                onChange={(e) => setIsAccountantRole(e.target.checked)}
                className="mt-1 h-4 w-4 bg-white border-gray-300"
                />
                <div>
                  <span className="text-[15px] font-semibold text-gray-800">This role is for Accountant users</span>
                  <p className="text-sm text-gray-600 mt-1">
                      If you mark this option, all users who are added with this role will be an accountant user.
                  </p>
                </div>
            </label>
        </div>
      </div>

      {renderPermissionTable("Products", "products", ["Products", "Plan", "Addon", "Coupon", "Price List", "Pricing Widgets"])}
      {renderPermissionTable("Customers", "customers", ["Customers"], ["Full", "View", "Create", "Edit", "Delete"], true)}
      {renderPermissionTable("Transactions", "transactions", ["Invoices", "Payments", "Credit Notes", "Quotes", "Sales Receipt"], ["Full", "View", "Create", "Edit", "Delete", "Approve"], true)}
      {renderPermissionTable("Subscriptions", "subscriptions", ["Subscriptions"])}
      {renderPermissionTable("Tasks", "tasks", ["Tasks"], ["Full", "View", "Create", "Edit", "Delete"], true)}
      {renderPermissionTable("Locations", "locations", ["Locations"])}
      {renderPermissionTable("Multiple Transaction Series", "multipleTransactionSeries", ["Multiple Transaction Series"])}
      {renderPermissionTable("Usage Records", "usageRecords", ["Usage Records"])}
      {renderPermissionTable("Items", "items", ["Item"], ["Full", "View", "Create", "Edit", "Delete"], true)}
      {renderPermissionTable("Timesheets", "timesheets", ["Projects"], ["Full", "View", "Create", "Edit", "Delete"], true)}
      {renderPermissionTable("Expenses", "expenses", ["Expenses"], ["Full", "View", "Create", "Edit", "Delete"], true)}

      {renderCheckboxList("Settings", "settings", ["Events", "General preferences", "Roles", "Provide access to protected data", "Incoming Webhook", "Signal"])}
      {renderCheckboxList("Documents", "documents")}
      {renderCheckboxList("Dashboard", "dashboard")}

      {/* Reports Engine */}
      <div className="bg-white rounded-lg border border-gray-200 mb-6 overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
               <label className="flex items-center gap-2 cursor-pointer w-fit">
                    <input type="checkbox" className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 accent-blue-600" 
                      checked={permissions.reportsData.fullReportsAccess}
                      onChange={(e) => setPermissions(prev => ({...prev, reportsData: {...prev.reportsData, fullReportsAccess: e.target.checked}}))}
                    />
                    <span className="text-[15px] font-medium text-gray-800">Enable full access for all reports</span>
                    <AlertCircle size={14} className="text-gray-400" />
               </label>
          </div>

          {!permissions.reportsData.fullReportsAccess && (
             <div className="bg-[#fff7ed] px-4 py-3 border-b border-orange-100 flex items-start gap-2">
                 <AlertCircle size={16} className="text-orange-500 mt-0.5" />
                 <p className="text-sm text-gray-700">When new reports are introduced, you will have to edit the role and provide access to them.</p>
             </div>
          )}

          {!permissions.reportsData.fullReportsAccess && (
              <table className="w-full">
                  <thead className="bg-white border-b border-gray-100">
                      <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Report Groups</th>
                          <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">Full Access</th>
                          <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">View</th>
                          <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">Export</th>
                          <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">Schedule</th>
                          <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">Share</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                      {Object.keys(permissions.reportsData).filter(x => x !== 'fullReportsAccess').map((groupName) => {
                          const isExpanded = expandedReports[groupName];
                          const groupItems = (permissions.reportsData as any)[groupName];
                          
                          return (
                              <React.Fragment key={groupName}>
                                  <tr className="hover:bg-gray-50 cursor-pointer" onClick={() => toggleReportGroup(groupName)}>
                                      <td className="px-4 py-3 flex items-center gap-2 text-sm font-medium text-gray-700">
                                          {isExpanded ? <ChevronDown size={14} className="text-gray-500"/> : <ChevronRight size={14} className="text-gray-500"/>}
                                          {groupName}
                                      </td>
                                      <td className="px-4 py-3 text-center">
                                          {isExpanded && <button type="button" onClick={(e) => { e.stopPropagation(); handleReportGroupSelectAll(groupName, 'full'); }} className="text-xs text-blue-600 font-medium hover:text-blue-800">Select All</button>}
                                      </td>
                                      <td className="px-4 py-3 text-center">
                                          {isExpanded && <button type="button" onClick={(e) => { e.stopPropagation(); handleReportGroupSelectAll(groupName, 'view'); }} className="text-xs text-blue-600 font-medium hover:text-blue-800">Select All</button>}
                                      </td>
                                      <td className="px-4 py-3 text-center">
                                          {isExpanded && <button type="button" onClick={(e) => { e.stopPropagation(); handleReportGroupSelectAll(groupName, 'export'); }} className="text-xs text-blue-600 font-medium hover:text-blue-800">Select All</button>}
                                      </td>
                                      <td className="px-4 py-3 text-center">
                                          {isExpanded && <button type="button" onClick={(e) => { e.stopPropagation(); handleReportGroupSelectAll(groupName, 'schedule'); }} className="text-xs text-blue-600 font-medium hover:text-blue-800">Select All</button>}
                                      </td>
                                      <td className="px-4 py-3 text-center">
                                          {isExpanded && <button type="button" onClick={(e) => { e.stopPropagation(); handleReportGroupSelectAll(groupName, 'share'); }} className="text-xs text-blue-600 font-medium hover:text-blue-800">Select All</button>}
                                      </td>
                                  </tr>
                                  {isExpanded && Object.keys(groupItems).map((reportName) => {
                                      const rep = groupItems[reportName];
                                      return (
                                           <tr key={reportName} className="hover:bg-gray-50 bg-gray-50/50 border-t border-gray-50">
                                                <td className="px-4 py-3 pl-8 text-sm text-gray-600 flex items-center gap-2">
                                                     {reportName}
                                                     {rep.locked && <Lock size={12} className="text-gray-400" />}
                                                </td>
                                                {["full", "view", "export", "schedule", "share"].map(action => (
                                                    <td key={action} className="px-4 py-3 text-center">
                                                         {action === "full" && rep[action] === false && ['view', 'export', 'schedule', 'share'].some(k => rep[k]) ? (
                                                              <input type="checkbox" className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 accent-blue-600"
                                                                ref={el => { if (el) el.indeterminate = true; }}
                                                                onChange={(e) => handleReportChange(groupName, reportName, "full", e.target.checked)}
                                                                disabled={rep.locked}
                                                              />
                                                         ) : (
                                                              <input type="checkbox" 
                                                                checked={rep[action] || false} 
                                                                onChange={(e) => handleReportChange(groupName, reportName, action, e.target.checked)}
                                                                className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer accent-blue-600 disabled:opacity-50" 
                                                                disabled={rep.locked}
                                                              />
                                                         )}
                                                    </td>
                                                ))}
                                           </tr>
                                      )
                                  })}
                              </React.Fragment>
                          )
                      })}
                  </tbody>
              </table>
          )}
      </div>

      <div className="flex items-center gap-2 pt-4 border-t border-gray-200 mt-6 sticky bottom-0 bg-gray-50 pb-6 z-10">
        <button
          onClick={async () => {
            if (!roleName.trim()) {
              setError("Role name is required");
              return;
            }

            setIsSaving(true);
            setError(null);

            try {
              const roleData = {
                name: roleName.trim(),
                description: description.trim(),
                isAccountantRole,
                permissions,
                updatedAt: new Date().toISOString()
              };

              const response = isEditMode && id
                ? await rolesAPI.update(id, roleData)
                : await rolesAPI.create(roleData);

              if (response && response.success) {
                window.dispatchEvent(new Event(AUTH_USER_REFRESH_EVENT));
                navigate("/settings/roles");
              } else {
                setError((response as any)?.message || "Failed to save role");
              }
            } catch (err: any) {
              console.error("Error saving role:", err);
              setError(err.message || "Failed to save role.");
            } finally {
              setIsSaving(false);
            }
          }}
          disabled={isSaving || isLoadingRole}
          className="bg-blue-600 text-white px-4 py-2 rounded shadow-sm text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {isSaving ? "Saving..." : "Save"}
        </button>
        <button
          onClick={() => navigate("/settings/roles")}
          className="bg-white border text-gray-700 border-gray-300 px-4 py-2 rounded shadow-sm text-sm font-medium hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
