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

export default function CustomerDetailPrimaryModals({ detail }: { detail: any }) {
    const {
        bulkConsolidatedAction,
        cloneContactType,
        confirmSidebarBulkConsolidatedBilling,
        creditNotes,
        customer,
        customers,
        displayName,
        handleAssociateTemplatesSave,
        handleCloneSubmit,
        handleTemplateSelect,
        invoices,
        isBulkConsolidatedUpdating,
        isAssociateTemplatesModalOpen,
        isCloneModalOpen,
        isCloning,
        isConfigurePortalModalOpen,
        isLinkToVendorModalOpen,
        isVendorDropdownOpen,
        pdfTemplateOptions,
        pdfTemplates,
        portalAccessContacts,
        quotes,
        refreshData,
        navigate,
        selectedVendor,
        setBulkConsolidatedAction,
        setCloneContactType,
        setCustomer,
        setIsAssociateTemplatesModalOpen,
        setIsCloneModalOpen,
        setIsConfigurePortalModalOpen,
        setIsLinkToVendorModalOpen,
        setIsVendorDropdownOpen,
        setPortalAccessContacts,
        setSelectedVendor,
        setVendorSearch,
        vendorDropdownRef,
        vendorSearch,
        vendors,
    } = detail as any;
    return (
        <>
            {/* Associate Templates Modal */}
            {
                isAssociateTemplatesModalOpen && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
                        <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                            <div className="flex items-center justify-between p-6 border-b border-gray-200">
                                <h2 className="text-lg font-semibold text-gray-900">Associate Templates</h2>
                                <button
                                    className="p-1 rounded-md border border-red-500 text-red-600 hover:bg-red-50 cursor-pointer"
                                    onClick={() => setIsAssociateTemplatesModalOpen(false)}
                                >
                                    <X size={18} />
                                </button>
                            </div>
                            <div className="p-6">
                                <p className="text-sm text-gray-600 mb-6">
                                    Associate PDF templates to this customer.
                                </p>

                                <div className="mb-6 pb-4 border-b border-gray-200 last:border-b-0">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-base font-semibold text-gray-900">PDF Templates</h3>
                                        <button
                                            className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700"
                                            onClick={() => navigate("/settings/customization/pdf-templates")}
                                        >
                                            <Plus size={16} />
                                            New PDF Template
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-1 gap-4">
                                        <div className="flex items-center justify-between gap-4">
                                            <label className="text-sm text-gray-700">Customer Statement</label>
                                            <select
                                                className="w-full max-w-xs border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-700 bg-white"
                                                value={pdfTemplates.customerStatement}
                                                onChange={(e) => handleTemplateSelect("pdf", "customerStatement", e.target.value)}
                                            >
                                                {pdfTemplateOptions.map((opt: string) => (
                                                    <option key={opt} value={opt}>{opt}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="flex items-center justify-between gap-4">
                                            <label className="text-sm text-gray-700">Quotes</label>
                                            <select
                                                className="w-full max-w-xs border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-700 bg-white"
                                                value={pdfTemplates.quotes}
                                                onChange={(e) => handleTemplateSelect("pdf", "quotes", e.target.value)}
                                            >
                                                {pdfTemplateOptions.map((opt: string) => (
                                                    <option key={opt} value={opt}>{opt}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="flex items-center justify-between gap-4">
                                            <label className="text-sm text-gray-700">Invoices</label>
                                            <select
                                                className="w-full max-w-xs border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-700 bg-white"
                                                value={pdfTemplates.invoices}
                                                onChange={(e) => handleTemplateSelect("pdf", "invoices", e.target.value)}
                                            >
                                                {pdfTemplateOptions.map((opt: string) => (
                                                    <option key={opt} value={opt}>{opt}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="flex items-center justify-between gap-4">
                                            <label className="text-sm text-gray-700">Credit Notes</label>
                                            <select
                                                className="w-full max-w-xs border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-700 bg-white"
                                                value={pdfTemplates.creditNotes}
                                                onChange={(e) => handleTemplateSelect("pdf", "creditNotes", e.target.value)}
                                            >
                                                {pdfTemplateOptions.map((opt: string) => (
                                                    <option key={opt} value={opt}>{opt}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="flex items-center justify-between gap-4">
                                            <label className="text-sm text-gray-700">Payment Thank You</label>
                                            <select
                                                className="w-full max-w-xs border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-700 bg-white"
                                                value={pdfTemplates.paymentThankYou}
                                                onChange={(e) => handleTemplateSelect("pdf", "paymentThankYou", e.target.value)}
                                            >
                                                {pdfTemplateOptions.map((opt: string) => (
                                                    <option key={opt} value={opt}>{opt}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
                                <button
                                    className="px-4 py-2 text-white rounded-md text-sm font-medium cursor-pointer transition-colors"
                                    style={{ background: "linear-gradient(90deg, #156372 0%, #0D4A52 100%)" }}
                                    onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => (e.currentTarget as HTMLElement).style.opacity = "0.9"}
                                    onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => (e.currentTarget as HTMLElement).style.opacity = "1"}
                                    onClick={handleAssociateTemplatesSave}
                                >
                                    Save
                                </button>
                                <button
                                    className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md text-sm font-medium cursor-pointer hover:bg-gray-50"
                                    onClick={() => setIsAssociateTemplatesModalOpen(false)}
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Clone Modal */}
            {
                isCloneModalOpen && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
                        <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto customer-detail-clone-modal">
                            <div className="p-6">
                                <p className="text-sm text-gray-600 mb-6">
                                    Select the contact type under which you want to create the new cloned contact.
                                </p>

                                <div className="space-y-3">
                                    <label className="flex items-center gap-3 p-4 border border-gray-200 rounded-md cursor-pointer hover:bg-gray-50">
                                        <input
                                            type="radio"
                                            name="cloneContactType"
                                            value="customer"
                                            checked={cloneContactType === "customer"}
                                            onChange={(e) => setCloneContactType(e.target.value)}
                                        />
                                        <span className="w-4 h-4 rounded-full border-2 border-gray-300 flex items-center justify-center"></span>
                                        <span className="text-sm font-medium text-gray-700">Customer</span>
                                    </label>

                                    <label className="flex items-center gap-3 p-4 border border-gray-200 rounded-md cursor-pointer hover:bg-gray-50">
                                        <input
                                            type="radio"
                                            name="cloneContactType"
                                            value="vendor"
                                            checked={cloneContactType === "vendor"}
                                            onChange={(e) => setCloneContactType(e.target.value)}
                                        />
                                        <span className="w-4 h-4 rounded-full border-2 border-gray-300 flex items-center justify-center"></span>
                                        <span className="text-sm font-medium text-gray-700">Vendor</span>
                                    </label>
                                </div>
                            </div>
                            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
                                <button
                                    className={`px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium cursor-pointer hover:bg-blue-700 flex items-center gap-2 ${isCloning ? "opacity-70 cursor-not-allowed" : ""}`}
                                    onClick={() => handleCloneSubmit()}
                                    disabled={isCloning}
                                >
                                    {isCloning && <Loader2 size={14} className="animate-spin" />}
                                    {isCloning ? "Cloning..." : "Proceed"}
                                </button>
                                <button
                                    className={`px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md text-sm font-medium cursor-pointer hover:bg-gray-50 ${isCloning ? "opacity-70 cursor-not-allowed" : ""}`}
                                    onClick={() => setIsCloneModalOpen(false)}
                                    disabled={isCloning}
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Configure Portal Access Modal */}
            {
                isConfigurePortalModalOpen && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
                        <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                            {/* Header */}
                            <div className="flex items-center justify-between p-6 border-b border-gray-200">
                                <h2 className="text-xl font-semibold text-gray-900">Configure Portal Access</h2>
                                <button
                                    className="flex items-center justify-center w-7 h-7 bg-white border-2 border-blue-600 rounded text-red-500 cursor-pointer hover:bg-red-50 transition-colors"
                                    onClick={() => setIsConfigurePortalModalOpen(false)}
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            {/* Content */}
                            <div className="p-6">
                                <div className="overflow-x-auto">
                                    <table className="w-full border-collapse">
                                        <thead>
                                            <tr className="border-b border-gray-200">
                                                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">NAME</th>
                                                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">EMAIL ADDRESS</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {portalAccessContacts.length > 0 ? (
                                                portalAccessContacts.map((contact: any) => (
                                                    <tr key={contact.id} className="border-b border-gray-100 hover:bg-gray-50">
                                                        <td className="py-3 px-4">
                                                            <div className="flex items-center gap-3">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={contact.hasAccess}
                                                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                                                        setPortalAccessContacts((prev: any[]) =>
                                                                            prev.map((c: any) =>
                                                                                c.id === contact.id ? { ...c, hasAccess: e.target.checked } : c
                                                                            )
                                                                        );
                                                                    }}
                                                                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                                                                />
                                                                <span className="text-sm text-gray-900">{contact.name}</span>
                                                            </div>
                                                        </td>
                                                        <td className="py-3 px-4">
                                                            {contact.email ? (
                                                                <span className="text-sm text-gray-900">{contact.email}</span>
                                                            ) : (
                                                                <button
                                                                    className="text-sm text-blue-600 hover:text-blue-700 hover:underline font-medium cursor-pointer"
                                                                    onClick={() => {
                                                                        const email = prompt("Enter email address:");
                                                                        if (email) {
                                                                            setPortalAccessContacts((prev: any[]) =>
                                                                                prev.map((c: any) =>
                                                                                    c.id === contact.id ? { ...c, email: email } : c
                                                                                )
                                                                            );
                                                                        }
                                                                    }}
                                                                >
                                                                    Add Email
                                                                </button>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td colSpan={2} className="py-8 text-center text-sm text-gray-500">
                                                        No contacts available
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="flex items-center justify-start gap-3 p-6 border-t border-gray-200">
                                <button
                                    className="px-6 py-2 bg-red-600 text-white rounded-md text-sm font-medium cursor-pointer hover:bg-red-700 transition-colors"
                                    onClick={async () => {
                                        if (customer) {
                                            const contactPersonsPayload = portalAccessContacts.map((contact: any) => ({
                                                contact_person_id: String(contact.id || "").trim(),
                                                email: String(contact.email || "").trim(),
                                                hasAccess: Boolean(contact.hasAccess),
                                            }));

                                            try {
                                                if (portalAccessContacts.some((contact: any) => contact.hasAccess)) {
                                                    await customersAPI.enablePortal(customer.id, { contact_persons: contactPersonsPayload });
                                                } else {
                                                    await customersAPI.disablePortal(customer.id, { contact_persons: contactPersonsPayload });
                                                }
                                            } catch (error: any) {
                                                toast.error("Failed to update customer: " + (error.message || "Unknown error"));
                                                return;
                                            }

                                            const refreshResponse = await customersAPI.getById(customer.id);
                                            const updatedCustomer = refreshResponse?.success ? refreshResponse.data : null;
                                            if (updatedCustomer) {
                                                setCustomer(updatedCustomer);
                                            }
                                        }
                                        setIsConfigurePortalModalOpen(false);
                                    }}
                                >
                                    Save
                                </button>
                                <button
                                    className="px-6 py-2 bg-white border border-gray-300 text-gray-700 rounded-md text-sm font-medium cursor-pointer hover:bg-gray-50 transition-colors"
                                    onClick={() => setIsConfigurePortalModalOpen(false)}
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Link to Vendor Modal */}
            {
                isLinkToVendorModalOpen && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
                        <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4">
                            {/* Header */}
                            <div className="flex items-center justify-between p-6 border-b border-gray-200">
                                <h2 className="text-xl font-semibold text-gray-900">
                                    Link {customer?.name || customer?.displayName || "Customer"} to Vendor
                                </h2>
                                <button
                                    className="flex items-center justify-center w-7 h-7 bg-white border-2 border-blue-600 rounded text-red-500 cursor-pointer hover:bg-red-50 transition-colors"
                                    onClick={() => {
                                        setIsLinkToVendorModalOpen(false);
                                        setSelectedVendor(null);
                                        setVendorSearch("");
                                    }}
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            {/* Content */}
                            <div className="p-6">
                                <p className="text-sm text-gray-700 mb-6 leading-relaxed">
                                    You're about to link this customer to a vendor. As a result the customer profile of the contact will be linked to the vendor profile of the other contact. This process will allow you to view receivables and payables for the contact from the contact's overview section.
                                </p>

                                {/* Vendor Selection Dropdown */}
                                <div className="relative" ref={vendorDropdownRef}>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Choose a vendor to link
                                    </label>
                                    <button
                                        className="w-full flex items-center justify-between px-4 py-3 border-2 border-gray-200 rounded-lg bg-white text-gray-700 hover:border-blue-500 transition-colors text-left"
                                        onClick={() => setIsVendorDropdownOpen(!isVendorDropdownOpen)}
                                    >
                                        <span className={selectedVendor ? "text-gray-900" : "text-gray-400"}>
                                            {selectedVendor ? selectedVendor.name || selectedVendor.formData?.displayName || selectedVendor.formData?.companyName || selectedVendor.formData?.vendorName : "Choose a vendor to link"}
                                        </span>
                                        <ChevronDown size={16} className={`text-gray-400 transition-transform ${isVendorDropdownOpen ? "rotate-180" : ""}`} />
                                    </button>
                                    {isVendorDropdownOpen && (
                                        <div className="absolute top-full left-0 right-0 mt-2 bg-white border-2 border-gray-200 rounded-xl shadow-xl z-50 max-h-60 overflow-hidden">
                                            <div className="flex items-center gap-2 p-3 border-b border-gray-200 bg-gray-50">
                                                <Search size={16} className="text-gray-400" />
                                                <input
                                                    type="text"
                                                    placeholder="Search vendors..."
                                                    value={vendorSearch}
                                                    onChange={(e) => setVendorSearch(e.target.value)}
                                                    className="flex-1 text-sm bg-transparent focus:outline-none"
                                                    autoFocus
                                                />
                                            </div>
                                            <div className="max-h-48 overflow-y-auto">
                                                {vendors
                                                    .filter((vendor: any) => {
                                                        const searchTerm = vendorSearch.toLowerCase();
                                                        const vendorName = (vendor.name || vendor.formData?.displayName || vendor.formData?.companyName || vendor.formData?.vendorName || "").toLowerCase();
                                                        return vendorName.includes(searchTerm);
                                                    })
                                                    .map((vendor: any) => {
                                                        const vendorName = vendor.name || vendor.formData?.displayName || vendor.formData?.companyName || vendor.formData?.vendorName || "";
                                                        const isSelected = selectedVendor?.id === vendor.id;
                                                        return (
                                                            <div
                                                                key={vendor.id}
                                                                className={`p-3 cursor-pointer hover:bg-blue-50 flex items-center justify-between transition-colors ${isSelected ? "bg-blue-50 border-l-4 border-blue-600" : ""
                                                                    }`}
                                                                onClick={() => {
                                                                    setSelectedVendor(vendor);
                                                                    setIsVendorDropdownOpen(false);
                                                                    setVendorSearch("");
                                                                }}
                                                            >
                                                                <span className="text-sm font-medium text-gray-900">{vendorName}</span>
                                                                {isSelected && (
                                                                    <Check size={16} className="text-blue-600" />
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                {vendors.filter((vendor: any) => {
                                                    const searchTerm = vendorSearch.toLowerCase();
                                                    const vendorName = (vendor.name || vendor.formData?.displayName || vendor.formData?.companyName || vendor.formData?.vendorName || "").toLowerCase();
                                                    return vendorName.includes(searchTerm);
                                                }).length === 0 && (
                                                        <div className="p-3 text-sm text-gray-500 text-center">
                                                            No vendors found
                                                        </div>
                                                    )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="flex items-center justify-start gap-3 p-6 border-t border-gray-200">
                                <button
                                    className="px-6 py-2 bg-red-600 text-white rounded-md text-sm font-medium cursor-pointer hover:bg-red-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                                    onClick={async () => {
                                        if (selectedVendor && customer) {
                                            // Link customer to vendor
                                            const vendorName = selectedVendor.name || selectedVendor.formData?.displayName || selectedVendor.formData?.companyName || selectedVendor.formData?.vendorName || "";
                                            const customerId = String(customer.id || customer._id || "");
                                            const selectedVendorId = String(selectedVendor.id || selectedVendor._id || "");
                                            const previousLinkedVendorId = String(customer.linkedVendorId || "").trim();
                                            try {
                                                await customersAPI.update(customerId, {
                                                    ...customer,
                                                    linkedVendorId: selectedVendorId,
                                                    linkedVendorName: vendorName
                                                });

                                                await vendorsAPI.update(selectedVendorId, {
                                                    linkedCustomerId: customerId,
                                                    linkedCustomerName: customer.name || customer.displayName || ""
                                                });

                                                if (previousLinkedVendorId && previousLinkedVendorId !== selectedVendorId) {
                                                    try {
                                                        await vendorsAPI.update(previousLinkedVendorId, {
                                                            linkedCustomerId: null,
                                                            linkedCustomerName: null
                                                        });
                                                    } catch (unlinkError) {
                                                    }
                                                }
                                            } catch (error: any) {
                                                toast.error('Failed to update customer: ' + (error.message || 'Unknown error'));
                                                return;
                                            }

                                            // Refresh customer data
                                            await refreshData();

                                            toast.success(`Customer "${customer.name || customer.displayName}" has been linked to vendor "${vendorName}"`);
                                        }
                                        setIsLinkToVendorModalOpen(false);
                                        setSelectedVendor(null);
                                        setVendorSearch("");
                                    }}
                                    disabled={!selectedVendor}
                                >
                                    Link
                                </button>
                                <button
                                    className="px-6 py-2 bg-white border border-gray-300 text-gray-700 rounded-md text-sm font-medium cursor-pointer hover:bg-gray-50 transition-colors"
                                    onClick={() => {
                                        setIsLinkToVendorModalOpen(false);
                                        setSelectedVendor(null);
                                        setVendorSearch("");
                                    }}
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Bulk Consolidated Billing Confirmation Modal */}
            {
                bulkConsolidatedAction && (
                    <div
                        className="fixed inset-0 bg-black/50 z-[2000] flex items-start justify-center pt-16 pb-10 overflow-y-auto"
                        onClick={(e: React.MouseEvent<HTMLDivElement>) => {
                            if (e.target === e.currentTarget && !isBulkConsolidatedUpdating) {
                                setBulkConsolidatedAction(null);
                            }
                        }}
                    >
                        <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-6 overflow-hidden">
                            <div className="flex items-start justify-between gap-4 p-6 border-b border-gray-200">
                                <div className="flex items-start gap-3">
                                    <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-full bg-orange-50 text-orange-600">
                                        <AlertTriangle size={18} />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-semibold text-gray-900">
                                            {bulkConsolidatedAction === "enable" ? "Enable Consolidated Billing?" : "Disable Consolidated Billing?"}
                                        </h2>
                                        <p className="mt-2 text-sm text-gray-700 leading-relaxed max-w-[640px]">
                                            Invoices will be {bulkConsolidatedAction === "enable" ? "consolidated" : "separated"} for the selected customers. Any invoices that were generated already will not be affected.
                                        </p>
                                    </div>
                                </div>
                                <button
                                    className="p-2 text-gray-500 hover:text-gray-700 cursor-pointer"
                                    onClick={() => setBulkConsolidatedAction(null)}
                                    disabled={isBulkConsolidatedUpdating}
                                    aria-label="Close"
                                    title="Close"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            <div className="p-6">
                                <div className="flex items-center justify-start gap-3">
                                    <button
                                        onClick={confirmSidebarBulkConsolidatedBilling}
                                        disabled={isBulkConsolidatedUpdating}
                                        className={`px-5 py-2.5 bg-blue-600 text-white rounded-md text-sm font-medium cursor-pointer transition-colors hover:bg-blue-700 flex items-center gap-2 ${isBulkConsolidatedUpdating ? "opacity-70 cursor-not-allowed" : ""}`}
                                    >
                                        {isBulkConsolidatedUpdating && <Loader2 size={14} className="animate-spin" />}
                                        {bulkConsolidatedAction === "enable" ? "Enable Now" : "Disable Now"}
                                    </button>
                                    <button
                                        onClick={() => setBulkConsolidatedAction(null)}
                                        disabled={isBulkConsolidatedUpdating}
                                        className={`px-5 py-2.5 bg-gray-100 text-gray-700 rounded-md text-sm font-medium cursor-pointer transition-colors hover:bg-gray-200 ${isBulkConsolidatedUpdating ? "opacity-70 cursor-not-allowed" : ""}`}
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }
        </>
    );
}
