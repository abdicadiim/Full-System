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

export default function CustomerDetailOverviewLeft({ detail }: { detail: any }) {
    const { id: routeCustomerId } = useParams();
    const {
        activeTab,
        associatedTagLabels,
        customer,
        customers,
        displayName,
        expandedSections,
        handleProfileImageUpload,
        isAvatarHovered,
        isSettingsDropdownOpen,
        markContactPersonAsPrimary,
        navigate,
        openAssociateTagsModal,
        openAdditionalAddressModal,
        openContactPersonSettingsIndex,
        openDeleteContactPersonModal,
        deleteAdditionalAddress,
        openEditContactPerson,
        primaryContact,
        profileImage,
        profileImageInputRef,
        resetContactPersonModal,
        resolvedPrimaryContactIndex,
        setAddressFormData,
        setAddressType,
        setIsAddContactPersonModalOpen,
        setIsAvatarHovered,
        setIsConfigurePortalModalOpen,
        setIsDeleteModalOpen,
        setIsInviteModalOpen,
        setIsSettingsDropdownOpen,
        setOpenContactPersonSettingsIndex,
        setShowAddressModal,
        setShowInviteCard,
        settingsDropdownRef,
        showInviteCard,
        toggleSection,
    } = detail as any;
    const customerId = String(customer?._id || customer?.id || routeCustomerId || "").trim();
    return (
        <>
                {activeTab === "overview" && (
                    <div className="h-full bg-white overflow-hidden">
                        <div className="flex h-full min-h-0">
                            {/* Left Column */}
                            <div className="w-[360px] flex-shrink-0 border-r border-gray-200 bg-white overflow-y-auto">
                                {/* Customer Profile Section */}
                                <div className="border-b border-gray-200 p-4">
                                    <div className="mb-2 text-[12px] font-medium text-gray-500">
                                        {(customer as any).companyName || displayName}
                                    </div>
                                    {!showInviteCard ? (
                                        <div className="rounded-xl border border-gray-100 bg-[#f7f8fb] p-3 shadow-sm">
                                            <div className="flex items-start gap-3">
                                                {(() => {
                                                    const topProfileImage =
                                                        String((primaryContact as any)?.profileImage || (primaryContact as any)?.image || profileImage || "").trim() || null;

                                                    return (
                                                <div
                                                    className="w-12 h-12 rounded-lg bg-gray-200 flex items-center justify-center flex-shrink-0 relative cursor-pointer overflow-hidden group"
                                                    onMouseEnter={() => setIsAvatarHovered(true)}
                                                    onMouseLeave={() => setIsAvatarHovered(false)}
                                                    onClick={() => profileImageInputRef.current?.click()}
                                                >
                                                    {topProfileImage ? (
                                                        <img src={topProfileImage} alt="Profile" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <User size={24} className="text-gray-400" />
                                                    )}
                                                    {isAvatarHovered && (
                                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                                            <Upload size={16} className="text-white" />
                                                        </div>
                                                    )}
                                                    <input
                                                        type="file"
                                                        ref={profileImageInputRef}
                                                        onChange={handleProfileImageUpload}
                                                        accept="image/*"
                                                        style={{ display: "none" }}
                                                    />
                                                </div>
                                                    );
                                                })()}
                                                <div className="flex-1">
                                                    <div className="flex items-start justify-between gap-2 mb-1">
                                                        <span className="text-[13px] font-semibold text-gray-900 leading-5">
                                                            {primaryContact ? (
                                                                <>
                                                                    {primaryContact.salutation && `${primaryContact.salutation}. `}
                                                                    {primaryContact.firstName} {primaryContact.lastName}
                                                                </>
                                                            ) : (
                                                                displayName
                                                            )}
                                                        </span>
                                                        <div className="flex items-center gap-1">
                                                            <div className="relative" ref={settingsDropdownRef}>
                                                                <button
                                                                    type="button"
                                                                    className="h-7 w-7 flex items-center justify-center rounded-md border border-gray-200 bg-white text-gray-500 hover:text-gray-700 hover:bg-gray-50 cursor-pointer"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setIsSettingsDropdownOpen(!isSettingsDropdownOpen);
                                                                    }}
                                                                    aria-label="Customer settings"
                                                                >
                                                                    <Settings size={14} />
                                                                </button>
                                                                {isSettingsDropdownOpen && (
                                                                    <div className="absolute top-full right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 min-w-[120px]">
                                                                    <button
                                                                        className="w-full text-left px-4 py-2 text-sm text-blue-600 bg-blue-50 cursor-pointer hover:bg-blue-100 transition-colors"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setIsSettingsDropdownOpen(false);
                                                                            if (primaryContact && resolvedPrimaryContactIndex >= 0) {
                                                                                openEditContactPerson(primaryContact, resolvedPrimaryContactIndex);
                                                                            } else {
                                                                                navigate(customerId ? `/sales/customers/${customerId}/edit` : "/sales/customers");
                                                                            }
                                                                        }}
                                                                    >
                                                                        Edit
                                                                    </button>
                                                                    <button
                                                                        className="w-full text-left px-4 py-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-50 transition-colors"
                                                                                    onClick={async (e) => {
                                                                                        e.stopPropagation();
                                                                                        setIsSettingsDropdownOpen(false);
                                                                                        if (primaryContact && resolvedPrimaryContactIndex >= 0) {
                                                                            openDeleteContactPersonModal(resolvedPrimaryContactIndex);
                                                                                        } else {
                                                                                            setIsDeleteModalOpen(true);
                                                                                        }
                                                                                    }}
                                                                                >
                                                                                    Delete
                                                                    </button>
                                                                </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="text-[12px] text-gray-600 mb-1">
                                                        {primaryContact?.email || customer.email || ""}
                                                    </div>
                                                    <button
                                                        onClick={() => setIsInviteModalOpen(true)}
                                                        className="text-[12px] text-blue-600 hover:underline bg-transparent border-none p-0 cursor-pointer"
                                                    >
                                                        Invite to Portal
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="bg-[#f8f9ff] rounded-xl border border-gray-100 shadow-sm p-4 relative overflow-hidden w-full">
                                            <div className="absolute top-0 left-0 right-0 h-1 bg-blue-500"></div>
                                            <button
                                                className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 cursor-pointer"
                                                onClick={() => setShowInviteCard(false)}
                                            >
                                                <Settings size={14} />
                                            </button>
                                            <div className="flex gap-4">
                                                <div
                                                    className="w-12 h-12 rounded-lg bg-gray-300 flex-shrink-0 overflow-hidden cursor-pointer relative group"
                                                    onMouseEnter={() => setIsAvatarHovered(true)}
                                                    onMouseLeave={() => setIsAvatarHovered(false)}
                                                    onClick={() => profileImageInputRef.current?.click()}
                                                >
                                                    {profileImage ? (
                                                        <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center bg-gray-200">
                                                            <User size={24} className="text-white" />
                                                        </div>
                                                    )}
                                                    {isAvatarHovered && (
                                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                                            <Upload size={16} className="text-white" />
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-base font-bold text-gray-900 truncate mb-0.5">
                                                        {primaryContact ? `${primaryContact.firstName} ${primaryContact.lastName}` : displayName}
                                                    </div>
                                                    <div className="text-sm text-gray-600 truncate mb-3">
                                                        {primaryContact?.email || customer.email || ""}
                                                    </div>
                                                    <div className="text-[13px] text-gray-600 font-medium mb-3">
                                                        Portal invitation not accepted
                                                    </div>
                                                    <button
                                                        className="text-[13px] text-blue-600 font-medium hover:underline bg-transparent border-none p-0 cursor-pointer"
                                                        onClick={() => toast.success("Re-invitation sent!")}
                                                    >
                                                        Re-invite
                                                    </button>
                                                </div>
                                            </div>
                                            <input
                                                type="file"
                                                ref={profileImageInputRef}
                                                onChange={handleProfileImageUpload}
                                                accept="image/*"
                                                style={{ display: "none" }}
                                            />
                                        </div>
                                    )}
                                </div>

                                {/* Address Section */}
                                <div className="border-b border-gray-200">
                                    <button
                                        type="button"
                                        className="flex w-full items-center justify-between px-4 py-3 text-left cursor-pointer transition-colors hover:bg-gray-50"
                                        onClick={() => toggleSection("address")}
                                        aria-expanded={expandedSections.address}
                                    >
                                        <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">ADDRESS</span>
                                        {expandedSections.address ? (
                                            <ChevronUp size={14} className="text-gray-400" />
                                        ) : (
                                            <ChevronDown size={14} className="text-gray-400" />
                                        )}
                                    </button>

                                    {expandedSections.address && (
                                        <div className="px-4 pb-4">
                                            <div className="mb-4">
                                                <div className="text-[12px] font-medium text-gray-700 mb-1">Billing Address</div>
                                                {(customer.billingAddress?.street1 || customer.billingStreet1 || customer.billingAddress?.city || customer.billingCity) ? (
                                                    <div>
                                                        <div className="text-[12px] text-gray-900">
                                                            {customer.billingAddress?.street1 || customer.billingStreet1 || ""}
                                                            {(customer.billingAddress?.city || customer.billingCity) && `, ${customer.billingAddress?.city || customer.billingCity}`}
                                                            {(customer.billingAddress?.state || customer.billingState) && `, ${customer.billingAddress?.state || customer.billingState}`}
                                                            {(customer.billingAddress?.zipCode || customer.billingZipCode) && ` ${customer.billingAddress?.zipCode || customer.billingZipCode}`}
                                                        </div>
                                                        {(customer.billingAddress?.phone || customer.billingPhone) && (
                                                            <div className="text-[12px] text-gray-900">
                                                                Phone: {customer.billingAddress?.phone || customer.billingPhone}
                                                            </div>
                                                        )}
                                                        <a
                                                            href="#"
                                                            className="text-[12px] text-blue-600 hover:underline"
                                                            onClick={(e) => {
                                                                e.preventDefault();
                                                                setAddressType("billing");
                                                                // Read data exactly from both nested and flat structures
                                                                const billingAddr = customer.billingAddress || {};
                                                                setAddressFormData({
                                                                    attention: billingAddr.attention ?? customer.billingAttention ?? "",
                                                                    country: billingAddr.country ?? customer.billingCountry ?? "",
                                                                    addressLine1: billingAddr.street1 ?? customer.billingStreet1 ?? "",
                                                                    addressLine2: billingAddr.street2 ?? customer.billingStreet2 ?? "",
                                                                    city: billingAddr.city ?? customer.billingCity ?? "",
                                                                    state: billingAddr.state ?? customer.billingState ?? "",
                                                                    zipCode: billingAddr.zipCode ?? customer.billingZipCode ?? "",
                                                                    phone: billingAddr.phone ?? customer.billingPhone ?? "",
                                                                    faxNumber: billingAddr.fax ?? customer.billingFax ?? "",
                                                                });
                                                                setShowAddressModal(true);
                                                            }}
                                                        >
                                                            Edit
                                                        </a>
                                                    </div>
                                                ) : (
                                                    <a
                                                        href="#"
                                                        className="text-[12px] text-blue-600 hover:underline"
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            setAddressType("billing");
                                                            // Read data exactly from both nested and flat structures
                                                            const billingAddr = customer.billingAddress || {};
                                                            setAddressFormData({
                                                                attention: billingAddr.attention ?? customer.billingAttention ?? "",
                                                                country: billingAddr.country ?? customer.billingCountry ?? "",
                                                                addressLine1: billingAddr.street1 ?? customer.billingStreet1 ?? "",
                                                                addressLine2: billingAddr.street2 ?? customer.billingStreet2 ?? "",
                                                                city: billingAddr.city ?? customer.billingCity ?? "",
                                                                state: billingAddr.state ?? customer.billingState ?? "",
                                                                zipCode: billingAddr.zipCode ?? customer.billingZipCode ?? "",
                                                                phone: billingAddr.phone ?? customer.billingPhone ?? "",
                                                                faxNumber: billingAddr.fax ?? customer.billingFax ?? "",
                                                            });
                                                            setShowAddressModal(true);
                                                        }}
                                                    >
                                                        No Billing Address - New Address
                                                    </a>
                                                )}
                                            </div>
                                            <div>
                                                <div className="text-[12px] font-medium text-gray-700 mb-1">Shipping Address</div>
                                                {(customer.shippingAddress?.street1 || customer.shippingStreet1 || customer.shippingAddress?.city || customer.shippingCity) ? (
                                                    <div>
                                                        <div className="text-[12px] text-gray-900">
                                                            {customer.shippingAddress?.street1 || customer.shippingStreet1 || ""}
                                                            {(customer.shippingAddress?.city || customer.shippingCity) && `, ${customer.shippingAddress?.city || customer.shippingCity}`}
                                                            {(customer.shippingAddress?.state || customer.shippingState) && `, ${customer.shippingAddress?.state || customer.shippingState}`}
                                                            {(customer.shippingAddress?.zipCode || customer.shippingZipCode) && ` ${customer.shippingAddress?.zipCode || customer.shippingZipCode}`}
                                                        </div>
                                                        {(customer.shippingAddress?.phone || customer.shippingPhone) && (
                                                            <div className="text-[12px] text-gray-900">
                                                                Phone: {customer.shippingAddress?.phone || customer.shippingPhone}
                                                            </div>
                                                        )}
                                                        <a
                                                            href="#"
                                                            className="text-[12px] text-blue-600 hover:underline"
                                                            onClick={(e) => {
                                                                e.preventDefault();
                                                                setAddressType("shipping");
                                                                // Read data exactly from both nested and flat structures
                                                                const shippingAddr = customer.shippingAddress || {};
                                                                setAddressFormData({
                                                                    attention: shippingAddr.attention ?? customer.shippingAttention ?? "",
                                                                    country: shippingAddr.country ?? customer.shippingCountry ?? "",
                                                                    addressLine1: shippingAddr.street1 ?? customer.shippingStreet1 ?? "",
                                                                    addressLine2: shippingAddr.street2 ?? customer.shippingStreet2 ?? "",
                                                                    city: shippingAddr.city ?? customer.shippingCity ?? "",
                                                                    state: shippingAddr.state ?? customer.shippingState ?? "",
                                                                    zipCode: shippingAddr.zipCode ?? customer.shippingZipCode ?? "",
                                                                    phone: shippingAddr.phone ?? customer.shippingPhone ?? "",
                                                                    faxNumber: shippingAddr.fax ?? customer.shippingFax ?? "",
                                                                });
                                                                setShowAddressModal(true);
                                                            }}
                                                        >
                                                            Edit
                                                        </a>
                                                    </div>
                                                ) : (
                                                    <a
                                                        href="#"
                                                        className="text-[12px] text-blue-600 hover:underline"
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            setAddressType("shipping");
                                                            // Read data exactly from both nested and flat structures
                                                            const shippingAddr = customer.shippingAddress || {};
                                                            setAddressFormData({
                                                                attention: shippingAddr.attention ?? customer.shippingAttention ?? "",
                                                                country: shippingAddr.country ?? customer.shippingCountry ?? "",
                                                                addressLine1: shippingAddr.street1 ?? customer.shippingStreet1 ?? "",
                                                                addressLine2: shippingAddr.street2 ?? customer.shippingStreet2 ?? "",
                                                                city: shippingAddr.city ?? customer.shippingCity ?? "",
                                                                state: shippingAddr.state ?? customer.shippingState ?? "",
                                                                zipCode: shippingAddr.zipCode ?? customer.shippingZipCode ?? "",
                                                                phone: shippingAddr.phone ?? customer.shippingPhone ?? "",
                                                                faxNumber: shippingAddr.fax ?? customer.shippingFax ?? "",
                                                            });
                                                            setShowAddressModal(true);
                                                        }}
                                                    >
                                                        No Shipping Address - New Address
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Additional Addresses */}
                                <div className="border-b border-gray-200">
                                    <div className="flex items-center justify-between px-4 py-3">
                                        <button
                                            type="button"
                                            className="flex-1 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider cursor-pointer"
                                            onClick={() => toggleSection("additionalAddresses" as any)}
                                            aria-expanded={(expandedSections as any).additionalAddresses}
                                        >
                                            ADDITIONAL ADDRESSES ({Array.isArray(customer?.additionalAddresses) ? customer.additionalAddresses.length : 0})
                                        </button>
                                        <div className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                className="h-6 w-6 flex items-center justify-center rounded-full bg-blue-600 text-white cursor-pointer transition-colors hover:bg-blue-700"
                                                onClick={() => openAdditionalAddressModal()}
                                                aria-label="Add additional address"
                                                title="Add additional address"
                                            >
                                                <Plus size={14} />
                                            </button>
                                            <button
                                                type="button"
                                                className="p-1 text-gray-400 hover:bg-gray-50 rounded cursor-pointer"
                                                onClick={() => toggleSection("additionalAddresses" as any)}
                                                aria-label={(expandedSections as any).additionalAddresses ? "Collapse" : "Expand"}
                                            >
                                                {(expandedSections as any).additionalAddresses ? (
                                                    <ChevronUp size={14} className="text-gray-400" />
                                                ) : (
                                                    <ChevronDown size={14} className="text-gray-400" />
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                    {(expandedSections as any).additionalAddresses && (
                                        <div className="px-4 pb-4">
                                            {Array.isArray(customer?.additionalAddresses) && customer.additionalAddresses.length > 0 ? (
                                                <div className="space-y-3">
                                                    {customer?.additionalAddresses?.map((address: any, index: number) => {
                                                        const addressId = String(address?.addressId || address?.id || address?._id || index).trim();
                                                        const lines = [
                                                            address?.street1,
                                                            address?.street2,
                                                            address?.city,
                                                            address?.state,
                                                            address?.zipCode,
                                                            address?.country,
                                                        ].filter(Boolean);
                                                        return (
                                                            <div key={addressId || index} className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                                                                <div className="flex items-start justify-between gap-3">
                                                                    <div className="min-w-0">
                                                                        <div className="text-sm font-medium text-gray-900">
                                                                            {address?.attention || `Address ${index + 1}`}
                                                                        </div>
                                                                        <div className="mt-1 text-[12px] leading-5 text-gray-700">
                                                                            {lines.length > 0 ? lines.join(", ") : "No address details saved."}
                                                                        </div>
                                                                        {(address?.phone || address?.fax) && (
                                                                            <div className="mt-1 text-[12px] text-gray-600">
                                                                                {address?.phone ? `Phone: ${address.phone}` : ""}
                                                                                {address?.phone && address?.fax ? " | " : ""}
                                                                                {address?.fax ? `Fax: ${address.fax}` : ""}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                    <div className="flex items-center gap-2 flex-shrink-0">
                                                                        <button
                                                                            type="button"
                                                                            className="text-[12px] font-medium text-blue-600 hover:underline"
                                                                            onClick={() => openAdditionalAddressModal(address)}
                                                                        >
                                                                            Edit
                                                                        </button>
                                                                        <button
                                                                            type="button"
                                                                            className="text-[12px] font-medium text-rose-600 hover:underline"
                                                                            onClick={() => deleteAdditionalAddress(addressId)}
                                                                        >
                                                                            Delete
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            ) : (
                                                <div className="rounded-lg border border-dashed border-gray-200 bg-white px-3 py-4 text-sm text-gray-500">
                                                    No additional addresses saved.
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Other Details Section */}
                                <div className="border-b border-gray-200">
                                    <button
                                        type="button"
                                        className="flex w-full items-center justify-between px-4 py-3 text-left cursor-pointer transition-colors hover:bg-gray-50"
                                        onClick={() => toggleSection("otherDetails")}
                                        aria-expanded={expandedSections.otherDetails}
                                    >
                                        <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">OTHER DETAILS</span>
                                        {expandedSections.otherDetails ? (
                                            <ChevronUp size={14} className="text-gray-400" />
                                        ) : (
                                            <ChevronDown size={14} className="text-gray-400" />
                                        )}
                                    </button>
                                    {expandedSections.otherDetails && (
                                        <div className="grid grid-cols-[170px_minmax(0,1fr)] gap-x-3 gap-y-4 px-4 pt-2 pb-5">
                                        <span className="text-[12px] text-slate-500">Customer Type</span>
                                        <span className="text-[12px] font-medium text-slate-900">
                                            {customer.customerType === "individual" ? "Individual" : "Business"}
                                        </span>

                                        <span className="text-[12px] text-slate-500">Customer Number</span>
                                        <span className="text-[12px] font-medium text-slate-900">{customer.customerNumber || "--"}</span>

                                        <span className="text-[12px] text-slate-500">Company ID</span>
                                        <span className="text-[12px] font-medium text-slate-900">{(customer as any).companyId || "--"}</span>

                                        <span className="text-[12px] text-slate-500">Default Currency</span>
                                        <span className="text-[12px] font-medium text-slate-900">{customer.currency || "USD"}</span>

                                        <span className="text-[12px] text-slate-500">Price List</span>
                                        <span className="text-[12px] font-medium text-slate-900">{(customer as any).priceList || "--"}</span>

                                        <span className="text-[12px] text-slate-500">Portal Status</span>
                                        {(() => {
                                            const portalEnabled =
                                                !!(customer as any)?.enablePortal ||
                                                (customer?.contactPersons?.some((cp: any) => cp?.hasPortalAccess || cp?.enablePortal) ?? false);
                                            return (
                                                <span className={`inline-flex items-center gap-1 text-[12px] font-medium ${portalEnabled ? "text-emerald-600" : "text-rose-500"}`}>
                                                    <span className={`h-1.5 w-1.5 rounded-full ${portalEnabled ? "bg-emerald-500" : "bg-rose-500"}`} />
                                                    {portalEnabled ? "Enabled" : "Disabled"}
                                                </span>
                                            );
                                        })()}

                                        <span className="text-[12px] text-slate-500">Customer Language</span>
                                        <span className="text-[12px] font-medium text-slate-900">
                                            {customer.customerLanguage
                                                ? `${customer.customerLanguage.charAt(0).toUpperCase()}${customer.customerLanguage.slice(1)}`
                                                : "English"}
                                        </span>
                                        </div>
                                    )}
                                </div>

                                {/* Contact Persons Section */}
                                <div className="border-b border-gray-200">
                                    <div className="flex items-center justify-between px-4 py-3">
                                        <button
                                            type="button"
                                            className="flex-1 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider cursor-pointer"
                                            onClick={() => toggleSection("contactPersons")}
                                            aria-expanded={expandedSections.contactPersons}
                                        >
                                            CONTACT PERSONS ({customer?.contactPersons?.length || 0})
                                        </button>
                                        <div className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                className="h-6 w-6 flex items-center justify-center rounded-full bg-blue-600 text-white cursor-pointer transition-colors hover:bg-blue-700"
                                                onClick={() => {
                                                    setOpenContactPersonSettingsIndex(null);
                                                    resetContactPersonModal();
                                                    setIsAddContactPersonModalOpen(true);
                                                }}
                                                aria-label="Add contact person"
                                                title="Add contact person"
                                            >
                                                <Plus size={14} />
                                            </button>
                                            <button
                                                type="button"
                                                className="p-1 text-gray-400 hover:bg-gray-50 rounded cursor-pointer"
                                                onClick={() => toggleSection("contactPersons")}
                                                aria-label={expandedSections.contactPersons ? "Collapse" : "Expand"}
                                            >
                                                {expandedSections.contactPersons ? (
                                                    <ChevronUp size={14} className="text-gray-400" />
                                                ) : (
                                                    <ChevronDown size={14} className="text-gray-400" />
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                    {expandedSections.contactPersons && (
                                        <div className="px-4 pb-4">
                                        {customer?.contactPersons?.length ? (
                                            <div className="space-y-0">
                                                {customer?.contactPersons?.map((contact: any, index: number) => {
                                                    const name =
                                                        String(
                                                            `${contact?.salutation ? `${contact.salutation}. ` : ""}${contact?.firstName || ""} ${contact?.lastName || ""}`
                                                        ).trim() ||
                                                        String(contact?.name || contact?.displayName || "Contact");
                                                    const email = String(contact?.email || "").trim();
                                                    const workPhone = String(contact?.workPhone || contact?.phone || "").trim();
                                                    const mobile = String(contact?.mobile || contact?.mobilePhone || "").trim();
                                                    const avatar = contact?.profileImage || contact?.image || null;
                                                    const isPrimary = Boolean(contact?.isPrimary);

                                                    return (
                                                        <div
                                                            key={String(email || name || index)}
                                                            className="flex items-start gap-3 py-4 border-b border-gray-100 last:border-b-0"
                                                        >
                                                            <div className="w-12 h-12 rounded-lg bg-gray-200 flex items-center justify-center flex-shrink-0 overflow-hidden">
                                                                {avatar ? (
                                                                    <img src={String(avatar)} alt={name} className="w-full h-full object-cover" />
                                                                ) : (
                                                                    <User size={22} className="text-gray-400" />
                                                                )}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-start justify-between gap-3">
                                                                    <div className="min-w-0">
                                                                        <div className="text-sm font-semibold text-gray-900 truncate flex items-center gap-2">
                                                                            <span className="truncate">{name}</span>
                                                                            {isPrimary && (
                                                                                <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-2 py-0.5 flex-shrink-0">
                                                                                    Primary
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                        {email && (
                                                                            <div className="text-sm text-gray-600 truncate">{email}</div>
                                                                        )}
                                                                    </div>
                                                                    <div className="relative flex-shrink-0" data-contact-person-menu-root="true">
                                                                        <button
                                                                            type="button"
                                                                            className="p-1 text-gray-500 hover:text-gray-700 cursor-pointer"
                                                                            title="Contact settings"
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                setOpenContactPersonSettingsIndex(openContactPersonSettingsIndex === index ? null : index);
                                                                            }}
                                                                        >
                                                                            <Settings size={14} />
                                                                        </button>
                                                                        {openContactPersonSettingsIndex === index && (
                                                                            <div className="absolute top-full right-0 mt-2 w-44 bg-white border border-gray-200 rounded-lg shadow-xl z-[120] py-1">
                                                                                <button
                                                                                    type="button"
                                                                                    className="w-[calc(100%-8px)] mx-1 my-1 text-left px-3 py-2 text-sm text-gray-800 rounded-md cursor-pointer hover:bg-gray-50 transition-colors"
                                                                                    onClick={(e) => {
                                                                                        e.stopPropagation();
                                                                                        setOpenContactPersonSettingsIndex(null);
                                                                                        openEditContactPerson(contact, index);
                                                                                    }}
                                                                                >
                                                                                    Edit
                                                                                </button>
                                                                                <button
                                                                                    type="button"
                                                                                    className="w-full text-left px-4 py-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-50 transition-colors"
                                                                                    onClick={async (e) => {
                                                                                        e.stopPropagation();
                                                                                        setOpenContactPersonSettingsIndex(null);
                                                                                        await markContactPersonAsPrimary(index);
                                                                                    }}
                                                                                >
                                                                                    Mark as Primary
                                                                                </button>
                                                                                <button
                                                                                    type="button"
                                                                                    className="w-full text-left px-4 py-2 text-sm text-red-600 cursor-pointer hover:bg-red-50 transition-colors"
                                                                                    onClick={async (e) => {
                                                                                        e.stopPropagation();
                                                                                        setOpenContactPersonSettingsIndex(null);
                                                                                        openDeleteContactPersonModal(index);
                                                                                    }}
                                                                                >
                                                                                    Delete
                                                                                </button>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                {workPhone && (
                                                                    <div className="mt-1 flex items-center gap-2 text-sm text-gray-700">
                                                                        <Phone size={14} className="text-gray-500" />
                                                                        <span className="truncate">{workPhone}</span>
                                                                    </div>
                                                                )}
                                                                {mobile && (
                                                                    <div className="mt-1 flex items-center gap-2 text-sm text-gray-700">
                                                                        <Smartphone size={14} className="text-gray-500" />
                                                                        <span className="truncate">{mobile}</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        ) : (
                                            <div className="text-sm text-gray-500 text-center py-4">No contact persons found.</div>
                                        )}
                                        </div>
                                    )}
                                </div>

                                {/* Associate Tags */}
                                <div className="border-b border-gray-200">
                                    <div className="flex items-center justify-between px-4 py-3">
                                        <button
                                            type="button"
                                            className="flex-1 text-left text-xs font-semibold uppercase tracking-wider text-gray-800 cursor-pointer"
                                            onClick={() => toggleSection("associateTags")}
                                            aria-expanded={expandedSections.associateTags}
                                        >
                                            ASSOCIATE TAGS
                                        </button>
                                        <div className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                className="h-6 w-6 flex items-center justify-center rounded-full bg-blue-600 text-white cursor-pointer transition-colors hover:bg-blue-700"
                                                onClick={() => openAssociateTagsModal()}
                                                aria-label="Add tag"
                                                title="Add tag"
                                            >
                                                <Plus size={14} />
                                            </button>
                                            <button
                                                type="button"
                                                className="p-1 text-blue-600 hover:bg-blue-50 rounded cursor-pointer"
                                                onClick={() => toggleSection("associateTags")}
                                                aria-label={expandedSections.associateTags ? "Collapse" : "Expand"}
                                            >
                                                {expandedSections.associateTags ? (
                                                    <ChevronUp size={14} className="text-[#2563eb]" />
                                                ) : (
                                                    <ChevronDown size={14} className="text-[#2563eb]" />
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                    {expandedSections.associateTags && (
                                        <div className="px-4 pb-4">
                                            <div className="flex flex-wrap gap-2">
                                                {associatedTagLabels.length > 0 ? (
                                                    associatedTagLabels.map((tag: string, idx: number) => (
                                                        <span key={`${tag}-${idx}`} className="inline-flex items-center gap-1 rounded bg-blue-50 px-2 py-1 text-xs text-blue-700">
                                                            {tag}
                                                            <X size={12} className="text-gray-500" />
                                                        </span>
                                                    ))
                                                ) : (
                                                    <span className="text-xs text-gray-400">No tags associated</span>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Customer Portal Info */}
                                <div className="border-b border-gray-200 p-4">
                                    <div className="rounded-md border border-emerald-200 bg-emerald-50/70 p-4">
                                        <div className="flex gap-3">
                                            <div className="h-9 w-9 rounded-md bg-white border border-emerald-100 flex items-center justify-center text-emerald-600">
                                                <Monitor size={16} />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-[12px] leading-5 text-gray-700">
                                                    Customer Portal allows your customers to keep track of all the transactions between them and your business.
                                                </p>
                                                <button
                                                    type="button"
                                                    className="mt-1 text-[12px] text-blue-600 hover:underline bg-transparent border-none p-0 cursor-pointer"
                                                >
                                                    Learn More
                                                </button>
                                            </div>
                                        </div>
                                        <div className="mt-3">
                                            <button
                                                type="button"
                                                className="rounded border border-gray-300 bg-white px-4 py-1.5 text-[12px] font-medium text-gray-700 hover:bg-gray-50"
                                                onClick={() => setIsConfigurePortalModalOpen(true)}
                                            >
                                                Enable Portal
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Record Info Section */}
                                <div>
                                    <button
                                        type="button"
                                        className="flex w-full items-center justify-between px-4 py-3 text-left cursor-pointer transition-colors hover:bg-gray-50"
                                        onClick={() => toggleSection("recordInfo")}
                                        aria-expanded={expandedSections.recordInfo}
                                    >
                                        <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">RECORD INFO</span>
                                        {expandedSections.recordInfo ? (
                                            <ChevronUp size={14} className="text-gray-400" />
                                        ) : (
                                            <ChevronDown size={14} className="text-gray-400" />
                                        )}
                                    </button>
                                    {expandedSections.recordInfo && (
                                        <div className="px-4 pb-4">
                                            <div className="space-y-3">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-sm text-gray-600">Customer Number:</span>
                                                    <span className="text-sm font-medium text-gray-900">{customer.customerNumber || "--"}</span>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-sm text-gray-600">Customer ID:</span>
                                                    <span className="text-sm font-medium text-gray-900">{customer.id || customer._id || customerId || "--"}</span>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-sm text-gray-600">Created On:</span>
                                                    <span className="text-sm font-medium text-gray-900">
                                                        {customer.createdDate ? new Date(customer.createdDate).toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" }) : "03/12/2025"}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </>
    );
}
