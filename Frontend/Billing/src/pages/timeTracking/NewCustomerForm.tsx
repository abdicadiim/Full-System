import React, { useState } from "react";

export default function NewCustomerForm({ onClose, onSave }) {
  const [formData, setFormData] = useState({
    customerType: "Business",
    salutation: "",
    firstName: "",
    lastName: "",
    companyName: "",
    displayName: "",
    email: "",
    workPhone: "",
    mobile: "",
    customerLanguage: "English",
    taxRate: "",
    companyId: "",
    currency: "SOS- Somali Shilling",
    accountsReceivable: "",
    openingBalance: "",
    paymentTerms: "Due on Receipt",
    enablePortal: false
  });

  const [activeTab, setActiveTab] = useState("Other Details");

  const tabs = ["Other Details", "Address", "Custom Fields", "Reporting Tags", "Remarks"];

  return (
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(0,0,0,0.5)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 3000,
      padding: "20px",
      overflowY: "auto"
    }}>
      <div style={{
        backgroundColor: "#fff",
        borderRadius: "8px",
        width: "100%",
        maxWidth: "900px",
        maxHeight: "90vh",
        overflowY: "auto",
        padding: "24px",
        margin: "auto"
      }}>
        {/* Header */}
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "24px"
        }}>
          <h2 style={{
            fontSize: "20px",
            fontWeight: "600",
            color: "#333",
            margin: 0
          }}>
            New Customer
          </h2>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              fontSize: "24px",
              cursor: "pointer",
              color: "#666"
            }}
          >
            ×
          </button>
        </div>

        {/* General Information Section */}
        <div style={{ marginBottom: "24px" }}>
          <h3 style={{
            fontSize: "16px",
            fontWeight: "600",
            color: "#333",
            marginBottom: "16px"
          }}>
            General Information
          </h3>

          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {/* Customer Type */}
            <div>
              <label style={{
                fontSize: "14px",
                fontWeight: "500",
                color: "#333",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                marginBottom: "6px"
              }}>
                Customer Type
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="8" cy="8" r="7" stroke="#666" strokeWidth="1.5"/>
                  <path d="M8 6v2M8 10h.01" stroke="#666" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </label>
              <div style={{ display: "flex", gap: "16px" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
                  <input
                    type="radio"
                    name="customerType"
                    value="Business"
                    checked={formData.customerType === "Business"}
                    onChange={(e) => setFormData({ ...formData, customerType: e.target.value })}
                  />
                  <span style={{ fontSize: "14px", color: "#333" }}>Business</span>
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
                  <input
                    type="radio"
                    name="customerType"
                    value="Individual"
                    checked={formData.customerType === "Individual"}
                    onChange={(e) => setFormData({ ...formData, customerType: e.target.value })}
                  />
                  <span style={{ fontSize: "14px", color: "#333" }}>Individual</span>
                </label>
              </div>
            </div>

            {/* Primary Contact */}
            <div>
              <label style={{
                fontSize: "14px",
                fontWeight: "500",
                color: "#333",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                marginBottom: "6px"
              }}>
                Primary Contact
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="8" cy="8" r="7" stroke="#666" strokeWidth="1.5"/>
                  <path d="M8 6v2M8 10h.01" stroke="#666" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </label>
              <div style={{ display: "flex", gap: "8px" }}>
                <select
                  value={formData.salutation}
                  onChange={(e) => setFormData({ ...formData, salutation: e.target.value })}
                  style={{
                    padding: "10px 12px",
                    border: "1px solid #ddd",
                    borderRadius: "4px",
                    fontSize: "14px",
                    outline: "none"
                  }}
                >
                  <option value="">Salutation</option>
                  <option value="Mr">Mr</option>
                  <option value="Mrs">Mrs</option>
                  <option value="Ms">Ms</option>
                  <option value="Dr">Dr</option>
                </select>
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  placeholder="First Name"
                  style={{
                    flex: 1,
                    padding: "10px 12px",
                    border: "1px solid #1976d2",
                    borderRadius: "4px",
                    fontSize: "14px",
                    outline: "none"
                  }}
                />
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  placeholder="Last Name"
                  style={{
                    flex: 1,
                    padding: "10px 12px",
                    border: "1px solid #ddd",
                    borderRadius: "4px",
                    fontSize: "14px",
                    outline: "none"
                  }}
                />
              </div>
            </div>

            {/* Company Name */}
            <div>
              <input
                type="text"
                value={formData.companyName}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                placeholder="Company Name"
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                  fontSize: "14px",
                  outline: "none"
                }}
              />
            </div>

            {/* Display Name */}
            <div>
              <label style={{
                fontSize: "14px",
                fontWeight: "500",
                color: "#d32f2f",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                marginBottom: "6px"
              }}>
                Display Name<span style={{ color: "#d32f2f" }}>*</span>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="8" cy="8" r="7" stroke="#666" strokeWidth="1.5"/>
                  <path d="M8 6v2M8 10h.01" stroke="#666" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </label>
              <input
                type="text"
                value={formData.displayName}
                onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                placeholder="Select or type to add"
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                  fontSize: "14px",
                  outline: "none"
                }}
              />
            </div>

            {/* Email Address */}
            <div>
              <label style={{
                fontSize: "14px",
                fontWeight: "500",
                color: "#333",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                marginBottom: "6px"
              }}>
                Email Address
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="8" cy="8" r="7" stroke="#666" strokeWidth="1.5"/>
                  <path d="M8 6v2M8 10h.01" stroke="#666" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="Email"
                  style={{
                    width: "100%",
                    padding: "10px 12px 10px 40px",
                    border: "1px solid #ddd",
                    borderRadius: "4px",
                    fontSize: "14px",
                    outline: "none"
                  }}
                />
                <svg 
                  width="20" 
                  height="20" 
                  viewBox="0 0 20 20" 
                  fill="none" 
                  xmlns="http://www.w3.org/2000/svg"
                  style={{
                    position: "absolute",
                    left: "12px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    pointerEvents: "none"
                  }}
                >
                  <path d="M3 5l7 5 7-5M3 5v10l7-5 7 5V5" stroke="#666" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>

            {/* Phone */}
            <div>
              <label style={{
                fontSize: "14px",
                fontWeight: "500",
                color: "#333",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                marginBottom: "6px"
              }}>
                Phone
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="8" cy="8" r="7" stroke="#666" strokeWidth="1.5"/>
                  <path d="M8 6v2M8 10h.01" stroke="#666" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </label>
              <div style={{ display: "flex", gap: "8px" }}>
                <div style={{ position: "relative", flex: 1 }}>
                  <input
                    type="tel"
                    value={formData.workPhone}
                    onChange={(e) => setFormData({ ...formData, workPhone: e.target.value })}
                    placeholder="Work Phone"
                    style={{
                      width: "100%",
                      padding: "10px 12px 10px 40px",
                      border: "1px solid #ddd",
                      borderRadius: "4px",
                      fontSize: "14px",
                      outline: "none"
                    }}
                  />
                  <svg 
                    width="20" 
                    height="20" 
                    viewBox="0 0 20 20" 
                    fill="none" 
                    xmlns="http://www.w3.org/2000/svg"
                    style={{
                      position: "absolute",
                      left: "12px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      pointerEvents: "none"
                    }}
                  >
                    <path d="M4 3h3l2 4-2 4H4M12 3h4l-1 4 1 4h-4" stroke="#666" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </div>
                <div style={{ position: "relative", flex: 1 }}>
                  <input
                    type="tel"
                    value={formData.mobile}
                    onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                    placeholder="Mobile"
                    style={{
                      width: "100%",
                      padding: "10px 12px 10px 40px",
                      border: "1px solid #ddd",
                      borderRadius: "4px",
                      fontSize: "14px",
                      outline: "none"
                    }}
                  />
                  <svg 
                    width="20" 
                    height="20" 
                    viewBox="0 0 20 20" 
                    fill="none" 
                    xmlns="http://www.w3.org/2000/svg"
                    style={{
                      position: "absolute",
                      left: "12px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      pointerEvents: "none"
                    }}
                  >
                    <rect x="6" y="2" width="8" height="16" rx="2" stroke="#666" strokeWidth="1.5"/>
                    <path d="M9 6h2" stroke="#666" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </div>
              </div>
            </div>

            {/* Customer Language */}
            <div>
              <label style={{
                fontSize: "14px",
                fontWeight: "500",
                color: "#333",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                marginBottom: "6px"
              }}>
                Customer Language
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="8" cy="8" r="7" stroke="#666" strokeWidth="1.5"/>
                  <path d="M8 6v2M8 10h.01" stroke="#666" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </label>
              <select
                value={formData.customerLanguage}
                onChange={(e) => setFormData({ ...formData, customerLanguage: e.target.value })}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                  fontSize: "14px",
                  outline: "none"
                }}
              >
                <option value="English">English</option>
                <option value="Spanish">Spanish</option>
                <option value="French">French</option>
              </select>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{
          display: "flex",
          gap: "8px",
          borderBottom: "1px solid #ddd",
          marginBottom: "24px"
        }}>
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: "12px 16px",
                border: "none",
                borderBottom: activeTab === tab ? "2px solid #1976d2" : "2px solid transparent",
                backgroundColor: "transparent",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: activeTab === tab ? "600" : "400",
                color: activeTab === tab ? "#1976d2" : "#666"
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab Content - Other Details */}
        {activeTab === "Other Details" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {/* Tax Rate */}
            <div>
              <label style={{
                fontSize: "14px",
                fontWeight: "500",
                color: "#333",
                display: "block",
                marginBottom: "6px"
              }}>
                Tax Rate
              </label>
              <select
                value={formData.taxRate}
                onChange={(e) => setFormData({ ...formData, taxRate: e.target.value })}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                  fontSize: "14px",
                  outline: "none"
                }}
              >
                <option value="">Select a Tax</option>
                <option value="tax1">Tax 1</option>
                <option value="tax2">Tax 2</option>
              </select>
              <p style={{ fontSize: "12px", color: "#666", marginTop: "4px", margin: 0 }}>
                To associate more than one tax, you need to create a tax group in Settings.
              </p>
            </div>

            {/* Company ID */}
            <div>
              <label style={{
                fontSize: "14px",
                fontWeight: "500",
                color: "#333",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                marginBottom: "6px"
              }}>
                Company ID
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="8" cy="8" r="7" stroke="#666" strokeWidth="1.5"/>
                  <path d="M8 6v2M8 10h.01" stroke="#666" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </label>
              <input
                type="text"
                value={formData.companyId}
                onChange={(e) => setFormData({ ...formData, companyId: e.target.value })}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                  fontSize: "14px",
                  outline: "none"
                }}
              />
            </div>

            {/* Currency */}
            <div>
              <label style={{
                fontSize: "14px",
                fontWeight: "500",
                color: "#333",
                display: "block",
                marginBottom: "6px"
              }}>
                Currency
              </label>
              <select
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                  fontSize: "14px",
                  outline: "none"
                }}
              >
                <option value="SOS- Somali Shilling">SOS- Somali Shilling</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
              </select>
            </div>

            {/* Accounts Receivable */}
            <div>
              <label style={{
                fontSize: "14px",
                fontWeight: "500",
                color: "#333",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                marginBottom: "6px"
              }}>
                Accounts Receivable
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="8" cy="8" r="7" stroke="#666" strokeWidth="1.5"/>
                  <path d="M8 6v2M8 10h.01" stroke="#666" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </label>
              <select
                value={formData.accountsReceivable}
                onChange={(e) => setFormData({ ...formData, accountsReceivable: e.target.value })}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                  fontSize: "14px",
                  outline: "none"
                }}
              >
                <option value="">Select an account</option>
                <option value="account1">Account 1</option>
                <option value="account2">Account 2</option>
              </select>
            </div>

            {/* Opening Balance */}
            <div>
              <label style={{
                fontSize: "14px",
                fontWeight: "500",
                color: "#333",
                display: "block",
                marginBottom: "6px"
              }}>
                Opening Balance
              </label>
              <div style={{ position: "relative" }}>
                <span style={{
                  position: "absolute",
                  left: "12px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  fontSize: "14px",
                  color: "#666"
                }}>
                  SOS
                </span>
                <input
                  type="text"
                  value={formData.openingBalance}
                  onChange={(e) => setFormData({ ...formData, openingBalance: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "10px 12px 10px 50px",
                    border: "1px solid #ddd",
                    borderRadius: "4px",
                    fontSize: "14px",
                    outline: "none"
                  }}
                />
              </div>
            </div>

            {/* Payment Terms */}
            <div>
              <label style={{
                fontSize: "14px",
                fontWeight: "500",
                color: "#333",
                display: "block",
                marginBottom: "6px"
              }}>
                Payment Terms
              </label>
              <select
                value={formData.paymentTerms}
                onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                  fontSize: "14px",
                  outline: "none"
                }}
              >
                <option value="Due on Receipt">Due on Receipt</option>
                <option value="Net 15">Net 15</option>
                <option value="Net 30">Net 30</option>
              </select>
            </div>

            {/* Enable Portal */}
            <div>
              <label style={{
                fontSize: "14px",
                fontWeight: "500",
                color: "#333",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                marginBottom: "6px"
              }}>
                Enable Portal?
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="8" cy="8" r="7" stroke="#666" strokeWidth="1.5"/>
                  <path d="M8 6v2M8 10h.01" stroke="#666" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={formData.enablePortal}
                  onChange={(e) => setFormData({ ...formData, enablePortal: e.target.checked })}
                />
                <span style={{ fontSize: "14px", color: "#333" }}>
                  Allow portal access for this customer
                </span>
              </label>
            </div>

            {/* Documents */}
            <div>
              <label style={{
                fontSize: "14px",
                fontWeight: "500",
                color: "#333",
                display: "block",
                marginBottom: "6px"
              }}>
                Documents
              </label>
              <button style={{
                padding: "10px 16px",
                border: "1px solid #ddd",
                borderRadius: "4px",
                backgroundColor: "#fff",
                cursor: "pointer",
                fontSize: "14px",
                display: "flex",
                alignItems: "center",
                gap: "8px"
              }}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M8 3v10M3 8h10" stroke="#1976d2" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                Upload File
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M3 4.5l3 3 3-3" stroke="#1976d2" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              <p style={{ fontSize: "12px", color: "#666", marginTop: "4px", margin: 0 }}>
                You can upload a maximum of 10 files, 10MB each
              </p>
            </div>

            <a href="#" style={{
              color: "#1976d2",
              fontSize: "14px",
              textDecoration: "none"
            }}>
              Add more details
            </a>
          </div>
        )}

        {/* Other Tabs Content Placeholder */}
        {activeTab !== "Other Details" && (
          <div style={{ padding: "40px 0", textAlign: "center", color: "#666" }}>
            {activeTab} content coming soon...
          </div>
        )}

        {/* Footer */}
        <div style={{
          marginTop: "32px",
          paddingTop: "16px",
          borderTop: "1px solid #e0e0e0"
        }}>
          <p style={{ fontSize: "14px", color: "#666", margin: 0 }}>
            Customer Owner: Assign a user as the customer owner to provide access only to the data of this customer.{" "}
            <a href="#" style={{ color: "#1976d2", textDecoration: "none" }}>Learn More</a>
          </p>
        </div>

        {/* Action Buttons */}
        <div style={{
          display: "flex",
          justifyContent: "flex-end",
          gap: "12px",
          paddingTop: "16px",
          borderTop: "1px solid #e0e0e0",
          marginTop: "16px"
        }}>
          <button
            onClick={onClose}
            style={{
              padding: "10px 20px",
              border: "1px solid #ddd",
              borderRadius: "4px",
              backgroundColor: "#fff",
              cursor: "pointer",
              fontSize: "14px",
              color: "#333"
            }}
          >
            Cancel
          </button>
          <button
            onClick={() => {
              // Validate required fields
              if (!formData.displayName || !formData.displayName.trim()) {
                alert("Please enter a Display Name");
                return;
              }

              // Save to localStorage
              const newCustomer = {
                id: Date.now().toString(),
                customerType: formData.customerType,
                salutation: formData.salutation,
                firstName: formData.firstName,
                lastName: formData.lastName,
                companyName: formData.companyName,
                displayName: formData.displayName.trim(),
                name: formData.displayName.trim(), // For compatibility
                email: formData.email,
                workPhone: formData.workPhone,
                mobile: formData.mobile,
                customerLanguage: formData.customerLanguage,
                taxRate: formData.taxRate,
                companyId: formData.companyId,
                currency: formData.currency,
                accountsReceivable: formData.accountsReceivable,
                openingBalance: formData.openingBalance,
                paymentTerms: formData.paymentTerms,
                enablePortal: formData.enablePortal,
                createdAt: new Date().toISOString(),
                createdBy: "Zouhair Yare",
              };

              const existingCustomers = JSON.parse(localStorage.getItem("customers") || "[]");
              const updatedCustomers = [...existingCustomers, newCustomer];
              localStorage.setItem("customers", JSON.stringify(updatedCustomers));

              // Trigger custom event for same-tab updates
              window.dispatchEvent(new Event("customersUpdated"));

              // Call onSave callback if provided
              if (onSave) {
                onSave(newCustomer);
              }

              onClose();
            }}
            style={{
              padding: "10px 20px",
              border: "none",
              borderRadius: "4px",
              backgroundColor: "#1976d2",
              color: "white",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "500"
            }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

