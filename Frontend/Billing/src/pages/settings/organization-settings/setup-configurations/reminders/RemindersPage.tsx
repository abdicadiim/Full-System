import React, { useState, useRef, useEffect } from "react";
import { Edit, MoreVertical, Plus, Info, Trash2 } from "lucide-react";
import EditReminderModal from "./EditReminderModal";
import PaymentExpectedInfoModal from "./PaymentExpectedInfoModal";
import AutomatedReminderModal from "./AutomatedReminderModal";
import { getCurrentUser, getToken, API_BASE_URL } from "../../../../../services/auth";
import { toast } from "react-hot-toast";

export default function RemindersPage() {
  const [activeTab, setActiveTab] = useState("invoices");
  const [editingReminder, setEditingReminder] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showAutomatedModal, setShowAutomatedModal] = useState(false);
  const [automatedReminder, setAutomatedReminder] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);
  const menuRefs = useRef({});
  const [dbReminders, setDbReminders] = useState<Record<string, any>>({});
  const [reminderStatuses, setReminderStatuses] = useState({
    "payment-expected-invoices": false,
    "reminder-2-invoices": false,
    "reminder-3-invoices": false,
    "payment-expected-bills": false,
    "default-bills": false
  });
  const currentUser = getCurrentUser();

  const manualRemindersInvoices = [
    {
      id: "overdue-invoices",
      name: "Reminder For Overdue Invoices",
      description: "You can send this reminder to your customers manually, from an overdue invoice's details page."
    },
    {
      id: "sent-invoices",
      name: "Reminder For Sent Invoices",
      description: "You can send this reminder to your customers manually, from a sent (but not overdue) details page."
    }
  ];

  const automatedRemindersInvoices = [
    {
      id: "payment-expected-invoices",
      name: "Payment Expected",
      schedule: "Remind me 0 day(s) After expected payment date",
      category: "Reminders Based on Expected Payment Date",
      hasInfo: true
    },
    {
      id: "reminder-2-invoices",
      name: "Reminder - 2",
      schedule: "Remind me 0 day(s) After due date",
      category: "Reminders Based on Due Date"
    },
    {
      id: "reminder-3-invoices",
      name: "Reminder - 3",
      schedule: "Remind me 0 day(s) After due date",
      category: "Reminders Based on Due Date"
    }
  ];

  const automatedRemindersBills = [
    {
      id: "payment-expected-bills",
      name: "Payment Expected",
      schedule: "0 day(s) Before",
      category: "Reminders Based on Expected Payment Date",
      hasInfo: true
    },
    {
      id: "default-bills",
      name: "Default",
      schedule: "Reminder will be sent 0 day(s) before the bill due date.",
      category: "Reminders Based on Due Date"
    }
  ];

  const parseEmailList = (value: string): string[] => {
    if (!value) return [];
    return value
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);
  };

  const buildScheduleLabel = (dbReminder: any, fallback: string): string => {
    const conditions = dbReminder?.conditions || {};
    const basedOn = conditions.basedOn === "expectedPaymentDate" ? "expected payment date" : "due date";

    if (typeof conditions.daysBefore === "number") {
      return `Remind me ${conditions.daysBefore} day(s) Before ${basedOn}`;
    }
    if (typeof conditions.daysAfter === "number") {
      return `Remind me ${conditions.daysAfter} day(s) After ${basedOn}`;
    }
    return fallback;
  };

  const handleEditManual = async (reminder) => {
    const token = getToken();
    if (!token) {
      toast.error("You are not logged in.");
      return;
    }

    const templateKey =
      reminder.id === "overdue-invoices"
        ? "invoice_manual_overdue_reminder"
        : reminder.id === "sent-invoices"
          ? "invoice_manual_sent_reminder"
          : "";

    try {
      const response = await fetch(`${API_BASE_URL}/settings/email-templates/${encodeURIComponent(templateKey)}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();

      setEditingReminder({
        ...reminder,
        templateKey,
        template: data?.success ? data.data : null,
      });
      setShowEditModal(true);
    } catch (error: any) {
      toast.error(error.message || "Failed to load reminder template");
    }
  };

  const getReminderPayload = (reminder) => {
    const map: any = {
      "payment-expected-invoices": {
        name: "Payment Expected",
        type: "payment_due",
        entityType: "Invoice",
        conditions: { daysAfter: 0, basedOn: "expectedPaymentDate" },
        recipients: {
          customer: false,
          vendor: false,
          internalUsers: [],
          customEmails: currentUser?.email ? [currentUser.email] : [],
        },
      },
      "reminder-2-invoices": {
        name: "Reminder - 2",
        type: "invoice_overdue",
        entityType: "Invoice",
        conditions: { daysAfter: 0, basedOn: "dueDate" },
      },
      "reminder-3-invoices": {
        name: "Reminder - 3",
        type: "invoice_overdue",
        entityType: "Invoice",
        conditions: { daysAfter: 3, basedOn: "dueDate" },
      },
      "payment-expected-bills": {
        name: "Payment Expected",
        type: "bill_due",
        entityType: "Bill",
        conditions: { daysAfter: 0, basedOn: "expectedPaymentDate" },
        recipients: {
          customer: false,
          vendor: false,
          internalUsers: [],
          customEmails: currentUser?.email ? [currentUser.email] : [],
        },
      },
      "default-bills": {
        name: "Default",
        type: "bill_due",
        entityType: "Bill",
        conditions: { daysBefore: 0, basedOn: "dueDate" },
        recipients: {
          customer: false,
          vendor: false,
          internalUsers: [],
          customEmails: currentUser?.email ? [currentUser.email] : [],
        },
      },
    };
    const base = map[reminder.id] || {
      name: reminder.name,
      type: "custom",
      entityType: activeTab === "bills" ? "Bill" : "Invoice",
      conditions: {},
    };

    return {
      key: reminder.id,
      ...base,
      recipients: base.recipients || {
        customer: base.entityType === "Invoice",
        vendor: base.entityType === "Bill",
        internalUsers: [],
        customEmails: [],
      },
    };
  };

  const handleToggleStatus = async (reminderId, reminder, e) => {
    e.stopPropagation();
    const token = getToken();
    if (!token) {
      toast.error("You are not logged in.");
      return;
    }

    const currentStatus = !!reminderStatuses[reminderId];
    const nextStatus = !currentStatus;

    try {
      const existing = dbReminders[reminderId];
      let updatedReminder = existing;

      if (existing?._id) {
        const response = await fetch(`${API_BASE_URL}/settings/reminders/${existing._id}`, {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ isActive: nextStatus }),
        });
        const data = await response.json();
        if (!response.ok || !data.success) throw new Error(data.message || "Failed to update reminder");
        updatedReminder = data.data;
      } else {
        const payload = getReminderPayload(reminder);
        const response = await fetch(`${API_BASE_URL}/settings/reminders`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ ...payload, isActive: nextStatus }),
        });
        const data = await response.json();
        if (!response.ok || !data.success) throw new Error(data.message || "Failed to create reminder");
        updatedReminder = data.data;
      }

      setDbReminders((prev: any) => ({ ...prev, [reminderId]: updatedReminder }));
      setReminderStatuses(prev => ({ ...prev, [reminderId]: nextStatus }));

      if (nextStatus) {
        setAutomatedReminder({ ...reminder, db: updatedReminder });
        setShowAutomatedModal(true);
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to update reminder");
    }
  };

  const handleReminderNameClick = (reminder) => {
    setAutomatedReminder({ ...reminder, db: dbReminders[reminder.id] });
    setShowAutomatedModal(true);
  };

  const handleInfoClick = (e) => {
    e.stopPropagation();
    setShowInfoModal(true);
  };

  const handleMenuClick = (reminderId, e) => {
    e.stopPropagation();
    setOpenMenuId(openMenuId === reminderId ? null : reminderId);
  };

  const handleDelete = async (reminderId) => {
    const token = getToken();
    if (!token) return;
    if (!window.confirm("Are you sure you want to delete this reminder?")) return;

    try {
      const existing = dbReminders[reminderId];
      if (existing?._id) {
        const response = await fetch(`${API_BASE_URL}/settings/reminders/${existing._id}`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await response.json();
        if (!response.ok || !data.success) throw new Error(data.message || "Failed to delete reminder");
      }

      setDbReminders((prev: any) => {
        const next = { ...prev };
        delete next[reminderId];
        return next;
      });
      setReminderStatuses((prev) => ({ ...prev, [reminderId]: false }));
      setOpenMenuId(null);
      toast.success("Reminder deleted");
    } catch (error: any) {
      toast.error(error.message || "Failed to delete reminder");
    }
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      Object.values(menuRefs.current).forEach((ref) => {
        if (ref && !ref.contains(event.target)) {
          setOpenMenuId(null);
        }
      });
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const loadReminders = async () => {
      const token = getToken();
      if (!token) return;

      try {
        const response = await fetch(`${API_BASE_URL}/settings/reminders`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await response.json();
        if (!response.ok || !data.success || !Array.isArray(data.data)) return;

        const nextDbMap: Record<string, any> = {};
        const nextStatuses: any = { ...reminderStatuses };

        for (const reminder of data.data) {
          if (reminder?.key) {
            nextDbMap[reminder.key] = reminder;
            nextStatuses[reminder.key] = !!reminder.isActive;
            continue;
          }
          const key = `${reminder.name}::${reminder.entityType}`.toLowerCase();
          if (key === "payment expected::invoice") {
            nextDbMap["payment-expected-invoices"] = reminder;
            nextStatuses["payment-expected-invoices"] = !!reminder.isActive;
          } else if (key === "reminder - 2::invoice") {
            nextDbMap["reminder-2-invoices"] = reminder;
            nextStatuses["reminder-2-invoices"] = !!reminder.isActive;
          } else if (key === "reminder - 3::invoice") {
            nextDbMap["reminder-3-invoices"] = reminder;
            nextStatuses["reminder-3-invoices"] = !!reminder.isActive;
          } else if (key === "payment expected::bill") {
            nextDbMap["payment-expected-bills"] = reminder;
            nextStatuses["payment-expected-bills"] = !!reminder.isActive;
          } else if (key === "default::bill") {
            nextDbMap["default-bills"] = reminder;
            nextStatuses["default-bills"] = !!reminder.isActive;
          }
        }

        setDbReminders(nextDbMap);
        setReminderStatuses(nextStatuses);
      } catch {
        // Ignore silent load errors.
      }
    };
    loadReminders();
  }, []);

  const getRemindersByCategory = (reminders) => {
    const grouped = {};
    reminders.forEach(reminder => {
      if (!grouped[reminder.category]) {
        grouped[reminder.category] = [];
      }
      grouped[reminder.category].push(reminder);
    });
    return grouped;
  };

  const automatedReminders = activeTab === "invoices" ? automatedRemindersInvoices : automatedRemindersBills;
  const automatedRemindersWithDb = automatedReminders.map((r) => ({
    ...r,
    schedule: buildScheduleLabel(dbReminders[r.id], r.schedule),
  }));
  const groupedReminders = getRemindersByCategory(automatedRemindersWithDb);

  return (
    <div className="p-6 max-w-6xl">
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Reminders</h1>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-gray-200 mb-6">
        <button
          onClick={() => setActiveTab("invoices")}
          className={`px-4 py-2 text-sm font-medium transition ${
            activeTab === "invoices"
              ? "text-blue-600 border-b-2 border-blue-600"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Invoices
        </button>
        <button
          onClick={() => setActiveTab("bills")}
          className={`px-4 py-2 text-sm font-medium transition ${
            activeTab === "bills"
              ? "text-blue-600 border-b-2 border-blue-600"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Bills
        </button>
      </div>

      <div className="space-y-6">
        {/* Manual Reminders - Only for Invoices */}
        {activeTab === "invoices" && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Manual Reminders</h2>
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">NAME</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">DESCRIPTION</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase">ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {manualRemindersInvoices.map((reminder) => (
                    <tr key={reminder.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <span className="text-sm font-medium text-gray-900">{reminder.name}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-600">{reminder.description}</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleEditManual(reminder)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition"
                          title="Edit"
                        >
                          <Edit size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Automated Reminders */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Automated Reminders</h2>
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">NAME</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">SCHEDULE</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">STATUS</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {Object.entries(groupedReminders).map(([category, reminders]) => (
                  <React.Fragment key={category}>
                    <tr>
                      <td colSpan="4" className="px-6 py-3 bg-gray-50">
                        <span className="text-sm font-semibold text-gray-900">{category}</span>
                      </td>
                    </tr>
                    {reminders.map((reminder) => (
                      <tr key={reminder.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleReminderNameClick(reminder)}
                              className="text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline"
                            >
                              {reminder.name}
                            </button>
                            {reminder.hasInfo && (
                              <button
                                onClick={handleInfoClick}
                                className="p-0.5 hover:bg-gray-100 rounded transition"
                                title="More information"
                              >
                                <Info size={14} className="text-gray-400 hover:text-blue-600" />
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-gray-600">{reminder.schedule}</span>
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={(e) => handleToggleStatus(reminder.id, reminder, e)}
                            className={`relative w-12 h-6 rounded-full transition-colors ${
                              reminderStatuses[reminder.id] ? 'bg-blue-600' : 'bg-gray-300'
                            }`}
                          >
                            <span
                              className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                                reminderStatuses[reminder.id] ? 'translate-x-6' : 'translate-x-0'
                              }`}
                            />
                          </button>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="relative inline-block">
                            {reminder.id.includes("reminder-") ? (
                              <>
                                <button
                                  onClick={(e) => handleMenuClick(reminder.id, e)}
                                  className="p-1.5 text-gray-600 hover:bg-gray-100 rounded transition"
                                >
                                  <MoreVertical size={16} />
                                </button>
                                {openMenuId === reminder.id && (
                                  <div
                                    ref={(el) => (menuRefs.current[reminder.id] = el)}
                                    className="absolute right-0 mt-1 bg-white border border-gray-300 rounded-md shadow-lg z-[1000] min-w-[120px]"
                                  >
                                    <button
                                      onClick={() => {
                                        handleReminderNameClick(reminder);
                                        setOpenMenuId(null);
                                      }}
                                      className="w-full px-4 py-2 text-sm text-left text-gray-700 hover:bg-blue-50 flex items-center gap-2"
                                    >
                                      <Edit size={14} />
                                      Edit
                                    </button>
                                    <button
                                      onClick={() => handleDelete(reminder.id)}
                                      className="w-full px-4 py-2 text-sm text-left text-gray-700 hover:bg-red-50 flex items-center gap-2"
                                    >
                                      <Trash2 size={14} />
                                      Delete
                                    </button>
                                  </div>
                                )}
                              </>
                            ) : (
                              <button
                                onClick={() => handleReminderNameClick(reminder)}
                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition"
                                title="Edit"
                              >
                                <Edit size={16} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
          <button className="mt-4 px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center gap-2">
            <Plus size={16} />
            New Reminder
          </button>
        </div>
      </div>

      {/* Edit Reminder Modal */}
      {showEditModal && editingReminder && (
        <EditReminderModal
          reminder={editingReminder}
          onClose={() => {
            setShowEditModal(false);
            setEditingReminder(null);
          }}
          onSave={async (updatedReminder) => {
            try {
              const token = getToken();
              if (!token) return;

              const templateKey = updatedReminder?.templateKey;
              if (!templateKey) throw new Error("Template key is missing");

              const response = await fetch(`${API_BASE_URL}/settings/email-templates/${encodeURIComponent(templateKey)}`, {
                method: "PUT",
                headers: {
                  Authorization: `Bearer ${token}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  name: "Default",
                  from: updatedReminder.from || "",
                  cc: updatedReminder.cc || "",
                  bcc: updatedReminder.bcc || "",
                  subject: updatedReminder.subject || "",
                  body: updatedReminder.emailBody || "",
                }),
              });
              const data = await response.json();
              if (!response.ok || !data.success) throw new Error(data.message || "Failed to save template");

              toast.success("Reminder template saved");
              setShowEditModal(false);
              setEditingReminder(null);
            } catch (error: any) {
              toast.error(error.message || "Failed to save reminder template");
            }
          }}
        />
      )}

      {/* Payment Expected Info Modal */}
      {showInfoModal && (
        <PaymentExpectedInfoModal
          onClose={() => setShowInfoModal(false)}
        />
      )}

      {/* Automated Reminder Modal */}
      {showAutomatedModal && automatedReminder && (
        <AutomatedReminderModal
          reminder={automatedReminder}
          onClose={() => {
            setShowAutomatedModal(false);
            setAutomatedReminder(null);
          }}
          onSave={async (updatedReminder) => {
            try {
              const token = getToken();
              if (!token) return;

              const existing = dbReminders[updatedReminder.id] || automatedReminder?.db;
              if (!existing?._id) throw new Error("Reminder is not created yet");

              const basedOn =
                String(updatedReminder.remindBasedOn || "").toLowerCase().includes("expected")
                  ? "expectedPaymentDate"
                  : "dueDate";

              const conditions: any = { basedOn };
              const when = String(updatedReminder.remindWhen || "after").toLowerCase();
              const days = Number(updatedReminder.remindDays || 0);
              if (when === "before") {
                conditions.daysBefore = days;
              } else {
                conditions.daysAfter = when === "on" ? 0 : days;
              }

              const isPaymentExpected = String(updatedReminder.name || "").toLowerCase() === "payment expected";
              const existingRecipients = existing.recipients || {};
              const recipients = isPaymentExpected
                ? {
                    customer: false,
                    vendor: false,
                    internalUsers: Array.isArray(existingRecipients.internalUsers)
                      ? existingRecipients.internalUsers.map((u: any) => u?._id || u?.id || u).filter(Boolean)
                      : [],
                    customEmails: parseEmailList(updatedReminder.to || (currentUser?.email || "")),
                  }
                : undefined;

              const email: any = {
                cc: parseEmailList(updatedReminder.cc || ""),
                bcc: parseEmailList(updatedReminder.bcc || ""),
              };

              if (!isPaymentExpected) {
                email.from = updatedReminder.from || "";
                email.subject = updatedReminder.subject || "";
                email.body = updatedReminder.emailBody || "";
              }

              const response = await fetch(`${API_BASE_URL}/settings/reminders/${existing._id}`, {
                method: "PUT",
                headers: {
                  Authorization: `Bearer ${token}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  key: updatedReminder.id,
                  name: existing.name,
                  type: existing.type,
                  entityType: existing.entityType,
                  conditions,
                  ...(recipients ? { recipients } : {}),
                  email,
                  isActive: !!updatedReminder.enabled,
                }),
              });

              const data = await response.json();
              if (!response.ok || !data.success) throw new Error(data.message || "Failed to save reminder");

              setDbReminders((prev: any) => ({ ...prev, [updatedReminder.id]: data.data }));
              setReminderStatuses((prev) => ({ ...prev, [updatedReminder.id]: !!updatedReminder.enabled }));
              toast.success("Reminder saved");

              setShowAutomatedModal(false);
              setAutomatedReminder(null);
            } catch (error: any) {
              toast.error(error.message || "Failed to save reminder");
            }
          }}
        />
      )}
    </div>
  );
}



