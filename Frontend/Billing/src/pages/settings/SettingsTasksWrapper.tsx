import React from "react";
import SettingsLayout from "./SettingsLayout";

function TasksSettingsPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold text-gray-900">Tasks</h1>
      <p className="mt-2 text-sm text-gray-600">Task settings will be added here.</p>
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
