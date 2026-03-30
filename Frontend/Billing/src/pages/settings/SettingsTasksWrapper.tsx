import React, { useEffect, useRef, useState } from "react";
import SearchableDropdown from "../../components/ui/SearchableDropdown";
import SettingsLayout from "./SettingsLayout";

type TaskStatus = {
  name: string;
  description: string;
  color: string;
};

function TasksSettingsPage() {
  const [activeTab, setActiveTab] = useState<"general" | "status" | "fields">("general");
  const [taskCompletionNotify, setTaskCompletionNotify] = useState(true);
  const [reminderNotify, setReminderNotify] = useState(true);
  const [alertType, setAlertType] = useState("Email");
  const [remindBeforeValue, setRemindBeforeValue] = useState("1");
  const [remindBeforeUnit, setRemindBeforeUnit] = useState("Days");
  const [remindBeforeOpen, setRemindBeforeOpen] = useState(false);
  const remindBeforeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (remindBeforeRef.current && !remindBeforeRef.current.contains(event.target as Node)) {
        setRemindBeforeOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const customStatuses: TaskStatus[] = [
    {
      name: "Open",
      description: "Task has been created and is ready to start.",
      color: "bg-sky-100 text-sky-700",
    },
    {
      name: "In Progress",
      description: "Work is actively happening on this task.",
      color: "bg-amber-100 text-amber-700",
    },
    {
      name: "Completed",
      description: "Task has been finished and can be closed.",
      color: "bg-emerald-100 text-emerald-700",
    },
  ];

  const customFieldsUsage = 0;
  const maxCustomFields = 59;
  const alertTypeOptions = [
    { value: "Email", label: "Email" },
    { value: "In-app Notification", label: "In-app Notification" },
    { value: "Email & In-app Notification", label: "Email & In-app Notification" },
  ];
  const remindBeforeOptions = ["Days", "Monthly", "Years"];

  return (
    <div className="p-6">
      <div className="max-w-5xl">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">Tasks</h1>
        </div>

        <div className="border-b border-gray-200 mb-6">
          <div className="flex flex-wrap items-center gap-1">
            <button
              type="button"
              onClick={() => setActiveTab("general")}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition ${
                activeTab === "general"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-600 hover:text-gray-900"
              }`}
            >
              General Preferences
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("status")}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition ${
                activeTab === "status"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-600 hover:text-gray-900"
              }`}
            >
              Custom Status
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("fields")}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition ${
                activeTab === "fields"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-600 hover:text-gray-900"
              }`}
            >
              Custom Fields
            </button>
          </div>
        </div>

        {activeTab === "general" && (
          <div className="space-y-8">
            <div className="space-y-8">
              <div>
                <div className="flex items-start gap-3">
                  <input
                    id="task-completion-notify"
                    type="checkbox"
                    checked={taskCompletionNotify}
                    onChange={(e) => setTaskCompletionNotify(e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <label htmlFor="task-completion-notify" className="block text-sm font-medium text-gray-900">
                      Task Completion Notify
                    </label>
                    <p className="mt-1 text-sm text-gray-600">
                      Notify users once the status is changed to Completed
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      An email and an in-app notification will be sent to the users associated with each task when a task&apos;s status is updated to Completed.
                    </p>
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-8">
                <div className="flex items-start gap-3">
                  <input
                    id="reminder-notify"
                    type="checkbox"
                    checked={reminderNotify}
                    onChange={(e) => setReminderNotify(e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div className="flex-1">
                    <label htmlFor="reminder-notify" className="block text-sm font-medium text-gray-900">
                      Set Reminder Notify
                    </label>
                    <p className="mt-1 text-sm text-gray-600">
                      Set the default preference for reminder
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      The reminder preference configured here will auto-populate when you create a task and enable a reminder for it.
                    </p>
                  </div>
                </div>

                <div className="mt-6 flex flex-col gap-5 sm:flex-row sm:flex-wrap">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">Alert Type</label>
                    <SearchableDropdown
                      value={alertType}
                      options={alertTypeOptions}
                      onChange={setAlertType}
                      placeholder="Email"
                      openDirection="down"
                      className="w-80"
                      inputClassName="h-10 w-80"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">Remind Before</label>
                    <div className="flex items-stretch">
                      <input
                        type="number"
                        min="1"
                        value={remindBeforeValue}
                        onChange={(e) => setRemindBeforeValue(e.target.value)}
                        className="h-10 w-40 rounded-l-md border border-gray-300 px-3 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      />
                      <div ref={remindBeforeRef} className="relative">
                        <button
                          type="button"
                          onClick={() => setRemindBeforeOpen((open) => !open)}
                          className="flex h-10 w-24 items-center justify-between rounded-r-md border-y border-r border-gray-300 bg-white px-3 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                          style={remindBeforeOpen ? { borderColor: "#3b82f6", boxShadow: "0 0 0 1px #3b82f6" } : {}}
                        >
                          <span className="truncate pr-2">{remindBeforeUnit}</span>
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 20 20"
                            fill="none"
                            aria-hidden="true"
                            className={`shrink-0 transition-transform ${remindBeforeOpen ? "rotate-180" : ""}`}
                          >
                            <path
                              d="M5 8l5 5 5-5"
                              stroke="#6b7280"
                              strokeWidth="1.6"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </button>

                        {remindBeforeOpen && (
                          <div className="absolute right-0 top-full z-50 mt-1 w-32 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
                            {remindBeforeOptions.map((option) => {
                              const isSelected = remindBeforeUnit === option;
                              return (
                                <button
                                  key={option}
                                  type="button"
                                  onClick={() => {
                                    setRemindBeforeUnit(option);
                                    setRemindBeforeOpen(false);
                                  }}
                                  className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm transition ${
                                    isSelected ? "bg-gray-100 text-gray-900" : "text-gray-700 hover:bg-gray-50"
                                  }`}
                                >
                                  <span>{option}</span>
                                  {isSelected && (
                                    <span className="text-xs font-semibold text-gray-500">✓</span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === "status" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">Custom Status Usage: {customStatuses.length}/20</div>
              <button
                type="button"
                className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700"
              >
                + New Custom Status
              </button>
            </div>

            <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
                      Status Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
                      Description
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {customStatuses.map((status) => (
                    <tr key={status.name} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{status.name}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{status.description}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${status.color}`}>
                          Active
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "fields" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Custom Fields Usage: {customFieldsUsage}/{maxCustomFields}
              </div>
              <button
                type="button"
                className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700"
              >
                + New Custom Field
              </button>
            </div>

            <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
                      Field Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
                      Data Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
                      Mandatory
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white">
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center">
                      <p className="text-sm text-gray-500">
                        Do you have information that does not go under any existing field? Go ahead and create a custom field.
                      </p>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SettingsTasksWrapper() {
  return (
    <SettingsLayout>
      <TasksSettingsPage />
    </SettingsLayout>
  );
}
