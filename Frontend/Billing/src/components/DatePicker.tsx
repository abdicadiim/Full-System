import React from "react";

type DatePickerProps = {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
};

const toInputDate = (value: string): string => {
  if (!value) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(value)) {
    const [dd, mm, yyyy] = value.split("/");
    return `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
  }
  return "";
};

const fromInputDate = (value: string): string => {
  if (!value) return "";
  const [yyyy, mm, dd] = value.split("-");
  if (!yyyy || !mm || !dd) return value;
  return `${dd}/${mm}/${yyyy}`;
};

export default function DatePicker({
  value = "",
  onChange,
  placeholder = "dd/mm/yyyy",
  className = "",
  disabled = false,
}: DatePickerProps) {
  const inputValue = toInputDate(value);

  return (
    <input
      type="date"
      value={inputValue}
      onChange={(e) => onChange(fromInputDate(e.target.value))}
      placeholder={placeholder}
      disabled={disabled}
      className={`w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-[#156372] focus:ring-1 focus:ring-[#156372] disabled:bg-gray-100 disabled:cursor-not-allowed ${className}`.trim()}
    />
  );
}
