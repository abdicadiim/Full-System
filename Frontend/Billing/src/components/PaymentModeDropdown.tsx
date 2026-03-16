import React from "react";
import { ChevronDown } from "lucide-react";

type PaymentModeDropdownProps = {
  value: string;
  onChange: (value: string) => void;
  options?: string[];
  className?: string;
};

const DEFAULT_OPTIONS = [
  "Cash",
  "Check",
  "Credit Card",
  "Bank Transfer",
  "Bank Remittance",
  "Other",
];

export default function PaymentModeDropdown({
  value,
  onChange,
  options = DEFAULT_OPTIONS,
  className = "",
}: PaymentModeDropdownProps) {
  return (
    <div className={`relative ${className}`}>
      <select
        value={value || options[0]}
        onChange={(event) => onChange(event.target.value)}
        className="w-full appearance-none rounded border border-gray-300 bg-white px-3 py-2 pr-9 text-sm text-gray-700 focus:border-[#156372] focus:outline-none"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      <ChevronDown
        size={14}
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
      />
    </div>
  );
}
