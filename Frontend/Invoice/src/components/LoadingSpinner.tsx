import React from "react";

type LoadingSpinnerProps = {
  label?: string;
  className?: string;
};

export default function LoadingSpinner({
  label = "Loading...",
  className = "",
}: LoadingSpinnerProps) {
  return (
    <div className={`flex items-center justify-center gap-3 py-10 text-gray-600 ${className}`}>
      <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-transparent" />
      <span className="text-sm">{label}</span>
    </div>
  );
}
