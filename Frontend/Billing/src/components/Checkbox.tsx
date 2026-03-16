import React from "react";

export default function Checkbox({ checked, onChange, onClick, readOnly, ...props }) {
  // If checked is provided without onChange, use defaultChecked for read-only checkboxes
  const isReadOnly = checked !== undefined && !onChange;
  
  return (
    <input
      type="checkbox"
      {...(isReadOnly ? { defaultChecked: checked, readOnly: true } : { checked: checked || false, onChange: onChange || (() => {}) })}
      onClick={onClick}
      style={{
        cursor: isReadOnly ? "default" : "pointer",
        width: "16px",
        height: "16px",
        accentColor: "rgb(21, 99, 114)",
      }}
      {...props}
    />
  );
}

