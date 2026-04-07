import React from "react";

type SetupProgressBarProps = {
  value: number;
};

export default function SetupProgressBar({ value }: SetupProgressBarProps) {
  const clampedValue = Math.max(0, Math.min(1, value));

  return (
    <div
      className="h-1 w-full rounded-full bg-slate-200"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(clampedValue * 100)}
      aria-label="Onboarding progress"
    >
      <div
        className="h-1 rounded-full bg-primary transition-[width] duration-500 ease-out"
        style={{ width: `${clampedValue * 100}%` }}
      />
    </div>
  );
}
