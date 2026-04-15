import React from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

type CustomerAddressModalProps = {
  isOpen: boolean;
  addressType: string;
  addressFormData: {
    attention: string;
    country: string;
    addressLine1: string;
    addressLine2: string;
    city: string;
    state: string;
    zipCode: string;
    phone: string;
    faxNumber: string;
  };
  setAddressFormData: React.Dispatch<
    React.SetStateAction<{
      attention: string;
      country: string;
      addressLine1: string;
      addressLine2: string;
      city: string;
      state: string;
      zipCode: string;
      phone: string;
      faxNumber: string;
    }>
  >;
  onClose: () => void;
  onSave: () => void | Promise<void>;
};

const fieldStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 12px",
  border: "1px solid #d1d5db",
  borderRadius: "6px",
  fontSize: "14px",
};

export default function CustomerAddressModal({
  isOpen,
  addressType,
  addressFormData,
  setAddressFormData,
  onClose,
  onSave,
}: CustomerAddressModalProps) {
  if (!isOpen || typeof document === "undefined" || !document.body) return null;

  return createPortal(
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 99999,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: "#ffffff",
          borderRadius: "8px",
          width: "100%",
          maxWidth: "500px",
          maxHeight: "90vh",
          overflowY: "auto",
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "20px 24px",
            borderBottom: "1px solid #e5e7eb",
          }}
        >
          <h2
            style={{
              fontSize: "18px",
              fontWeight: "600",
              color: "#111827",
              margin: 0,
            }}
          >
            {addressType === "billing" ? "Billing Address" : "Shipping Address"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "4px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <X size={20} style={{ color: "#6b7280" }} />
          </button>
        </div>

        <div style={{ padding: "24px" }}>
          <div style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", fontSize: "14px", fontWeight: "500", color: "#374151", marginBottom: "8px" }}>
              Attention
            </label>
            <input
              type="text"
              value={addressFormData.attention}
              onChange={(event) =>
                setAddressFormData((prev) => ({ ...prev, attention: event.target.value }))
              }
              style={fieldStyle}
            />
          </div>

          <div style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", fontSize: "14px", fontWeight: "500", color: "#374151", marginBottom: "8px" }}>
              Country/Region
            </label>
            <select
              value={addressFormData.country}
              onChange={(event) =>
                setAddressFormData((prev) => ({ ...prev, country: event.target.value }))
              }
              style={{ ...fieldStyle, backgroundColor: "#ffffff" }}
            >
              <option value="">Select or type to add</option>
              <option value="US">United States</option>
              <option value="GB">United Kingdom</option>
              <option value="CA">Canada</option>
              <option value="AU">Australia</option>
              <option value="KE">Kenya</option>
              <option value="AW">Aruba</option>
            </select>
          </div>

          <div style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", fontSize: "14px", fontWeight: "500", color: "#374151", marginBottom: "8px" }}>
              Address
            </label>
            <div style={{ marginBottom: "8px" }}>
              <input
                type="text"
                value={addressFormData.addressLine1}
                onChange={(event) =>
                  setAddressFormData((prev) => ({ ...prev, addressLine1: event.target.value }))
                }
                style={fieldStyle}
                placeholder="Address Line 1"
              />
            </div>
            <input
              type="text"
              value={addressFormData.addressLine2}
              onChange={(event) =>
                setAddressFormData((prev) => ({ ...prev, addressLine2: event.target.value }))
              }
              style={fieldStyle}
              placeholder="Address Line 2"
            />
          </div>

          {[
            { label: "City", key: "city" },
            { label: "ZIP Code", key: "zipCode" },
            { label: "Phone", key: "phone" },
            { label: "Fax Number", key: "faxNumber" },
          ].map((field) => (
            <div key={field.key} style={{ marginBottom: "16px" }}>
              <label
                style={{ display: "block", fontSize: "14px", fontWeight: "500", color: "#374151", marginBottom: "8px" }}
              >
                {field.label}
              </label>
              <input
                type="text"
                value={addressFormData[field.key as keyof typeof addressFormData]}
                onChange={(event) =>
                  setAddressFormData((prev) => ({
                    ...prev,
                    [field.key]: event.target.value,
                  }))
                }
                style={fieldStyle}
              />
            </div>
          ))}

          <div style={{ marginBottom: "24px" }}>
            <label style={{ display: "block", fontSize: "14px", fontWeight: "500", color: "#374151", marginBottom: "8px" }}>
              State
            </label>
            <select
              value={addressFormData.state}
              onChange={(event) =>
                setAddressFormData((prev) => ({ ...prev, state: event.target.value }))
              }
              style={{ ...fieldStyle, backgroundColor: "#ffffff" }}
            >
              <option value="">Select or type to add</option>
              <option value="CA">California</option>
              <option value="NY">New York</option>
              <option value="TX">Texas</option>
              <option value="FL">Florida</option>
            </select>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: "12px",
            padding: "20px 24px",
            borderTop: "1px solid #e5e7eb",
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: "8px 16px",
              fontSize: "14px",
              fontWeight: "500",
              borderRadius: "6px",
              border: "1px solid #d1d5db",
              backgroundColor: "#ffffff",
              color: "#374151",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSave}
            style={{
              padding: "8px 16px",
              fontSize: "14px",
              fontWeight: "500",
              borderRadius: "6px",
              border: "none",
              backgroundColor: "#2563eb",
              color: "#ffffff",
              cursor: "pointer",
            }}
          >
            Save
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
