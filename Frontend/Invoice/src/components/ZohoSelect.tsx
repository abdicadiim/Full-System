import React from "react";

type Option = string | { [key: string]: any };

type ZohoSelectProps = {
  value?: string;
  onChange: (value: string) => void;
  options?: Option[];
  placeholder?: string;
  className?: string;
  error?: boolean;
  onAddNew?: () => void;
  addNewLabel?: string;
  groupBy?: string;
};

const toOptionValue = (option: Option) => {
  if (typeof option === "string") return option;
  return (
    option.value ||
    option.name ||
    option.accountName ||
    option.label ||
    option.code ||
    option.id ||
    option._id ||
    ""
  );
};

const toOptionLabel = (option: Option) => {
  if (typeof option === "string") return option;
  return (
    option.label ||
    option.name ||
    option.accountName ||
    option.value ||
    option.code ||
    "Option"
  );
};

export default function ZohoSelect({
  value = "",
  onChange,
  options = [],
  placeholder = "Select",
  className = "",
  error = false,
  onAddNew,
  addNewLabel = "Add New",
}: ZohoSelectProps) {
  return (
    <select
      value={value}
      onChange={(e) => {
        const next = e.target.value;
        if (next === "__ADD_NEW__") {
          onAddNew?.();
          return;
        }
        onChange(next);
      }}
      className={`w-full rounded-md border px-3 py-1.5 text-[13px] ${
        error ? "border-red-500" : "border-slate-200"
      } ${className}`}
    >
      <option value="">{placeholder}</option>
      {options.map((option, idx) => {
        const optValue = String(toOptionValue(option));
        const optLabel = String(toOptionLabel(option));
        return (
          <option key={`${optValue}-${idx}`} value={optValue}>
            {optLabel}
          </option>
        );
      })}
      {onAddNew && <option value="__ADD_NEW__">{addNewLabel}</option>}
    </select>
  );
}
