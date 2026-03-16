import React from "react";

type AccessDeniedProps = {
  title?: string;
  message?: string;
};

export default function AccessDenied({
  title = "Access denied",
  message = "You do not have permission to view this page.",
}: AccessDeniedProps) {
  return (
    <div className="min-h-[40vh] flex items-center justify-center p-6">
      <div className="max-w-lg w-full rounded-lg border border-red-200 bg-red-50 p-6">
        <h2 className="text-lg font-semibold text-red-700">{title}</h2>
        <p className="mt-2 text-sm text-red-700">{message}</p>
      </div>
    </div>
  );
}
