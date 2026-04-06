import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { createPortal } from "react-dom";
import { toast } from "react-toastify";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { customersAPI, vendorsAPI, currenciesAPI, invoicesAPI, paymentsReceivedAPI, creditNotesAPI, quotesAPI, recurringInvoicesAPI, expensesAPI, recurringExpensesAPI, projectsAPI, billsAPI, salesReceiptsAPI, journalEntriesAPI, paymentsMadeAPI, purchaseOrdersAPI, vendorCreditsAPI, documentsAPI, reportingTagsAPI, senderEmailsAPI } from "../../../services/api";
import SearchableDropdown from "../../../components/ui/SearchableDropdown";
import {
    X, Edit, Paperclip, ChevronDown, Plus, MoreVertical,
    Settings, User, Mail, Phone, MapPin, Globe,
    DollarSign, TrendingUp, Calendar, UserPlus,
    ChevronUp, ChevronRight, Sparkles, Bold, Italic, Underline, ChevronRight as ChevronRightIcon,
    Filter, ArrowUpDown, Search, ChevronLeft, Link2, FileText, Monitor, Check, Upload, Trash2, Loader2, Download, RefreshCw, AlertTriangle, Smartphone
} from "lucide-react";
import { Customer, Invoice, CreditNote, AttachedFile, Quote, RecurringInvoice, Expense, RecurringExpense, Project, Bill, SalesReceipt } from "../../salesModel";
import { resolveVerifiedPrimarySender } from "../../../utils/emailSenderDisplay";
import CustomerCommentsPanel from "../CustomerDetail/CustomerCommentsPanel";
import CustomerAttachmentsPopover from "../CustomerDetail/CustomerAttachmentsPopover";

import type { ExtendedCustomer, Transaction, Comment, Mail as CustomerMail } from "../CustomerDetail/CustomerDetail.shared";
import { formatCurrency, formatDateForDisplay, formatMailDateTime, formatStatusLabel, normalizeInvoiceStatus, normalizeComments } from "../CustomerDetail/CustomerDetail.shared";

export default function CustomerDetailAddressModal({ detail }: { detail: any }) {
    const {
        addressFormData,
        addressType,
        comments,
        customer,
        setAddressFormData,
        setComments,
        setCustomer,
        setShowAddressModal,
        showAddressModal,
    } = detail as any;
    return (
        <>
            {/* Address Modal */}
            {
                showAddressModal && typeof document !== 'undefined' && document.body && createPortal(
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
                        onClick={() => setShowAddressModal(false)}
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
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Modal Header */}
                            <div style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                padding: "20px 24px",
                                borderBottom: "1px solid #e5e7eb",
                            }}>
                                <h2 style={{
                                    fontSize: "18px",
                                    fontWeight: "600",
                                    color: "#111827",
                                    margin: 0,
                                }}>
                                    {addressType === "billing" ? "Billing Address" : "Shipping Address"}
                                </h2>
                                <button
                                    onClick={() => setShowAddressModal(false)}
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

                            {/* Modal Body */}
                            <div style={{ padding: "24px" }}>
                                <div style={{ marginBottom: "16px" }}>
                                    <label style={{
                                        display: "block",
                                        fontSize: "14px",
                                        fontWeight: "500",
                                        color: "#374151",
                                        marginBottom: "8px",
                                    }}>
                                        Attention
                                    </label>
                                    <input
                                        type="text"
                                        value={addressFormData.attention}
                                        onChange={(e) => setAddressFormData({ ...addressFormData, attention: e.target.value })}
                                        style={{
                                            width: "100%",
                                            padding: "8px 12px",
                                            border: "1px solid #d1d5db",
                                            borderRadius: "6px",
                                            fontSize: "14px",
                                        }}
                                        placeholder=""
                                    />
                                </div>

                                <div style={{ marginBottom: "16px" }}>
                                    <label style={{
                                        display: "block",
                                        fontSize: "14px",
                                        fontWeight: "500",
                                        color: "#374151",
                                        marginBottom: "8px",
                                    }}>
                                        Country/Region
                                    </label>
                                    <select
                                        value={addressFormData.country}
                                        onChange={(e) => setAddressFormData({ ...addressFormData, country: e.target.value })}
                                        style={{
                                            width: "100%",
                                            padding: "8px 12px",
                                            border: "1px solid #d1d5db",
                                            borderRadius: "6px",
                                            fontSize: "14px",
                                            backgroundColor: "#ffffff",
                                        }}
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
                                    <label style={{
                                        display: "block",
                                        fontSize: "14px",
                                        fontWeight: "500",
                                        color: "#374151",
                                        marginBottom: "8px",
                                    }}>
                                        Address
                                    </label>
                                    <div style={{ marginBottom: "8px" }}>
                                        <input
                                            type="text"
                                            value={addressFormData.addressLine1}
                                            onChange={(e) => setAddressFormData({ ...addressFormData, addressLine1: e.target.value })}
                                            style={{
                                                width: "100%",
                                                padding: "8px 12px",
                                                border: "1px solid #d1d5db",
                                                borderRadius: "6px",
                                                fontSize: "14px",
                                            }}
                                            placeholder="Address Line 1"
                                        />
                                    </div>
                                    <div>
                                        <input
                                            type="text"
                                            value={addressFormData.addressLine2}
                                            onChange={(e) => setAddressFormData({ ...addressFormData, addressLine2: e.target.value })}
                                            style={{
                                                width: "100%",
                                                padding: "8px 12px",
                                                border: "1px solid #d1d5db",
                                                borderRadius: "6px",
                                                fontSize: "14px",
                                            }}
                                            placeholder="Address Line 2"
                                        />
                                    </div>
                                </div>

                                <div style={{ marginBottom: "16px" }}>
                                    <label style={{
                                        display: "block",
                                        fontSize: "14px",
                                        fontWeight: "500",
                                        color: "#374151",
                                        marginBottom: "8px",
                                    }}>
                                        City
                                    </label>
                                    <input
                                        type="text"
                                        value={addressFormData.city}
                                        onChange={(e) => setAddressFormData({ ...addressFormData, city: e.target.value })}
                                        style={{
                                            width: "100%",
                                            padding: "8px 12px",
                                            border: "1px solid #d1d5db",
                                            borderRadius: "6px",
                                            fontSize: "14px",
                                        }}
                                        placeholder=""
                                    />
                                </div>

                                <div style={{ marginBottom: "16px" }}>
                                    <label style={{
                                        display: "block",
                                        fontSize: "14px",
                                        fontWeight: "500",
                                        color: "#374151",
                                        marginBottom: "8px",
                                    }}>
                                        State
                                    </label>
                                    <select
                                        value={addressFormData.state}
                                        onChange={(e) => setAddressFormData({ ...addressFormData, state: e.target.value })}
                                        style={{
                                            width: "100%",
                                            padding: "8px 12px",
                                            border: "1px solid #d1d5db",
                                            borderRadius: "6px",
                                            fontSize: "14px",
                                            backgroundColor: "#ffffff",
                                        }}
                                    >
                                        <option value="">Select or type to add</option>
                                        <option value="CA">California</option>
                                        <option value="NY">New York</option>
                                        <option value="TX">Texas</option>
                                        <option value="FL">Florida</option>
                                    </select>
                                </div>

                                <div style={{ marginBottom: "16px" }}>
                                    <label style={{
                                        display: "block",
                                        fontSize: "14px",
                                        fontWeight: "500",
                                        color: "#374151",
                                        marginBottom: "8px",
                                    }}>
                                        ZIP Code
                                    </label>
                                    <input
                                        type="text"
                                        value={addressFormData.zipCode}
                                        onChange={(e) => setAddressFormData({ ...addressFormData, zipCode: e.target.value })}
                                        style={{
                                            width: "100%",
                                            padding: "8px 12px",
                                            border: "1px solid #d1d5db",
                                            borderRadius: "6px",
                                            fontSize: "14px",
                                        }}
                                        placeholder=""
                                    />
                                </div>

                                <div style={{ marginBottom: "16px" }}>
                                    <label style={{
                                        display: "block",
                                        fontSize: "14px",
                                        fontWeight: "500",
                                        color: "#374151",
                                        marginBottom: "8px",
                                    }}>
                                        Phone
                                    </label>
                                    <input
                                        type="text"
                                        value={addressFormData.phone}
                                        onChange={(e) => setAddressFormData({ ...addressFormData, phone: e.target.value })}
                                        style={{
                                            width: "100%",
                                            padding: "8px 12px",
                                            border: "1px solid #d1d5db",
                                            borderRadius: "6px",
                                            fontSize: "14px",
                                        }}
                                        placeholder=""
                                    />
                                </div>

                                <div style={{ marginBottom: "24px" }}>
                                    <label style={{
                                        display: "block",
                                        fontSize: "14px",
                                        fontWeight: "500",
                                        color: "#374151",
                                        marginBottom: "8px",
                                    }}>
                                        Fax Number
                                    </label>
                                    <input
                                        type="text"
                                        value={addressFormData.faxNumber}
                                        onChange={(e) => setAddressFormData({ ...addressFormData, faxNumber: e.target.value })}
                                        style={{
                                            width: "100%",
                                            padding: "8px 12px",
                                            border: "1px solid #d1d5db",
                                            borderRadius: "6px",
                                            fontSize: "14px",
                                        }}
                                        placeholder=""
                                    />
                                </div>
                            </div>

                            {/* Modal Footer */}
                            <div style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "flex-end",
                                gap: "12px",
                                padding: "20px 24px",
                                borderTop: "1px solid #e5e7eb",
                            }}>
                                <button
                                    onClick={() => setShowAddressModal(false)}
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
                                    onClick={async () => {
                                        // Save address data
                                        if (!customer || !id) return;

                                        const updatedCustomer = { ...customer };
                                        if (addressType === "billing") {
                                            updatedCustomer.billingAddress = {
                                                attention: addressFormData.attention || '',
                                                country: addressFormData.country || '',
                                                street1: addressFormData.addressLine1 || '',
                                                street2: addressFormData.addressLine2 || '',
                                                city: addressFormData.city || '',
                                                state: addressFormData.state || '',
                                                zipCode: addressFormData.zipCode || '',
                                                phone: addressFormData.phone || '',
                                                fax: addressFormData.faxNumber || ''
                                            };
                                            // Also keep flat fields for backward compatibility
                                            updatedCustomer.billingAttention = addressFormData.attention;
                                            updatedCustomer.billingCountry = addressFormData.country;
                                            updatedCustomer.billingStreet1 = addressFormData.addressLine1;
                                            updatedCustomer.billingStreet2 = addressFormData.addressLine2;
                                            updatedCustomer.billingCity = addressFormData.city;
                                            updatedCustomer.billingState = addressFormData.state;
                                            updatedCustomer.billingZipCode = addressFormData.zipCode;
                                            updatedCustomer.billingPhone = addressFormData.phone;
                                            updatedCustomer.billingFax = addressFormData.faxNumber;
                                        } else {
                                            updatedCustomer.shippingAddress = {
                                                attention: addressFormData.attention || '',
                                                country: addressFormData.country || '',
                                                street1: addressFormData.addressLine1 || '',
                                                street2: addressFormData.addressLine2 || '',
                                                city: addressFormData.city || '',
                                                state: addressFormData.state || '',
                                                zipCode: addressFormData.zipCode || '',
                                                phone: addressFormData.phone || '',
                                                fax: addressFormData.faxNumber || ''
                                            };
                                            // Also keep flat fields for backward compatibility
                                            updatedCustomer.shippingAttention = addressFormData.attention;
                                            updatedCustomer.shippingCountry = addressFormData.country;
                                            updatedCustomer.shippingStreet1 = addressFormData.addressLine1;
                                            updatedCustomer.shippingStreet2 = addressFormData.addressLine2;
                                            updatedCustomer.shippingCity = addressFormData.city;
                                            updatedCustomer.shippingState = addressFormData.state;
                                            updatedCustomer.shippingZipCode = addressFormData.zipCode;
                                            updatedCustomer.shippingPhone = addressFormData.phone;
                                            updatedCustomer.shippingFax = addressFormData.faxNumber;
                                        }

                                        // Update customer using API
                                        try {
                                            await customersAPI.update(id, updatedCustomer);
                                            // Reload customer to get updated data from API
                                            const response = await customersAPI.getById(id);
                                            if (response && response.data) {
                                                const normalizedComments = normalizeComments(response.data.comments);
                                                const mappedCustomer = {
                                                    ...response.data,
                                                    billingStreet1: response.data.billingAddress?.street1 || response.data.billingStreet1 || '',
                                                    billingStreet2: response.data.billingAddress?.street2 || response.data.billingStreet2 || '',
                                                    billingCity: response.data.billingAddress?.city || response.data.billingCity || '',
                                                    billingState: response.data.billingAddress?.state || response.data.billingState || '',
                                                    billingZipCode: response.data.billingAddress?.zipCode || response.data.billingZipCode || '',
                                                    billingPhone: response.data.billingAddress?.phone || response.data.billingPhone || '',
                                                    billingFax: response.data.billingAddress?.fax || response.data.billingFax || '',
                                                    billingAttention: response.data.billingAddress?.attention || response.data.billingAttention || '',
                                                    billingCountry: response.data.billingAddress?.country || response.data.billingCountry || '',
                                                    shippingStreet1: response.data.shippingAddress?.street1 || response.data.shippingStreet1 || '',
                                                    shippingStreet2: response.data.shippingAddress?.street2 || response.data.shippingStreet2 || '',
                                                    shippingCity: response.data.shippingAddress?.city || response.data.shippingCity || '',
                                                    shippingState: response.data.shippingAddress?.state || response.data.shippingState || '',
                                                    shippingZipCode: response.data.shippingAddress?.zipCode || response.data.shippingZipCode || '',
                                                    shippingPhone: response.data.shippingAddress?.phone || response.data.shippingPhone || '',
                                                    shippingFax: response.data.shippingAddress?.fax || response.data.shippingFax || '',
                                                    shippingAttention: response.data.shippingAddress?.attention || response.data.shippingAttention || '',
                                                    shippingCountry: response.data.shippingAddress?.country || response.data.shippingCountry || '',
                                                    comments: normalizedComments
                                                };
                                                setCustomer(mappedCustomer);
                                                setComments(normalizedComments);
                                            }
                                            toast.success(`${addressType === "billing" ? "Billing" : "Shipping"} address saved successfully`);
                                        } catch (error) {
                                            toast.error('Failed to update address: ' + (error.message || 'Unknown error'));
                                        }

                                        setShowAddressModal(false);
                                    }}
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
                    document.body
                )
            }
        </>
    );
}
