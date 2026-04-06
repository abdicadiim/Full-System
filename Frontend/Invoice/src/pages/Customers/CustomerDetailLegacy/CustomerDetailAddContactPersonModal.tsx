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

export default function CustomerDetailAddContactPersonModal({ detail }: { detail: any }) {
    const {
        contactPersonMobilePhoneCode,
        contactPersonProfileInputRef,
        contactPersonProfilePreview,
        contactPersonWorkPhoneCode,
        customer,
        editingContactPersonIndex,
        filteredMobilePhoneCodeOptions,
        filteredWorkPhoneCodeOptions,
        handleContactPersonProfileFile,
        isAddContactPersonModalOpen,
        isMobilePhoneCodeDropdownOpen,
        isSavingContactPerson,
        isWorkPhoneCodeDropdownOpen,
        mobilePhoneCodeDropdownRef,
        mobilePhoneCodeSearch,
        newContactPerson,
        resetContactPersonModal,
        saveContactPerson,
        setContactPersonMobilePhoneCode,
        setContactPersonProfilePreview,
        setContactPersonWorkPhoneCode,
        setIsAddContactPersonModalOpen,
        setIsMobilePhoneCodeDropdownOpen,
        setIsWorkPhoneCodeDropdownOpen,
        setMobilePhoneCodeSearch,
        setNewContactPerson,
        setWorkPhoneCodeSearch,
        workPhoneCodeDropdownRef,
        workPhoneCodeSearch,
    } = detail as any;
    return (
        <>
            {/* Add Contact Person Modal */}
            {
                isAddContactPersonModalOpen && (
                    <div
                        className="fixed inset-0 bg-black/50 z-[2000] flex items-start justify-center pt-10 pb-10 overflow-y-auto"
                        onClick={(e: React.MouseEvent<HTMLDivElement>) => {
                            if (e.target === e.currentTarget) {
                                setIsAddContactPersonModalOpen(false);
                                resetContactPersonModal();
                            }
                        }}
                    >
                        <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full mx-6 max-h-[calc(100vh-80px)] overflow-y-auto">
                            {/* Header */}
                            <div className="sticky top-0 bg-white z-10 flex items-center justify-between p-6 border-b border-gray-200">
                                <h2 className="text-xl font-semibold text-gray-900">
                                    {editingContactPersonIndex !== null ? "Edit Contact Person" : "Add Contact Person"}
                                </h2>
                                <button
                                    className="flex items-center justify-center w-7 h-7 bg-white border-2 border-blue-600 rounded text-red-500 cursor-pointer hover:bg-red-50 transition-colors"
                                    onClick={() => {
                                        setIsAddContactPersonModalOpen(false);
                                        resetContactPersonModal();
                                    }}
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            {/* Content */}
                            <div className="p-6">
                                <div className="flex flex-col lg:flex-row gap-6">
                                    <div className="flex-1 space-y-6">
                                {/* Name Section */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                                    <div className="grid grid-cols-3 gap-3">
                                        <div className="relative">
                                            <select
                                                value={newContactPerson.salutation}
                                                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setNewContactPerson((prev: any) => ({ ...prev, salutation: e.target.value }))}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 appearance-none pr-8"
                                            >
                                                <option value="Mr">Mr</option>
                                                <option value="Mrs">Mrs</option>
                                                <option value="Ms">Ms</option>
                                                <option value="Dr">Dr</option>
                                                <option value="Prof">Prof</option>
                                            </select>
                                            <ChevronDown size={16} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                                        </div>
                                        <input
                                            type="text"
                                            placeholder="First Name"
                                            value={newContactPerson.firstName}
                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewContactPerson((prev: any) => ({ ...prev, firstName: e.target.value }))}
                                            className="col-span-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                        <input
                                            type="text"
                                            placeholder="Last Name"
                                            value={newContactPerson.lastName}
                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewContactPerson((prev: any) => ({ ...prev, lastName: e.target.value }))}
                                            className="col-span-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>
                                </div>

                                {/* Email Address */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                                    <input
                                        type="email"
                                        placeholder="Email Address"
                                        value={newContactPerson.email}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewContactPerson((prev: any) => ({ ...prev, email: e.target.value }))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>

                                {/* Phone Section */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                                    <div className="space-y-3">
                                        <div className="flex gap-2">
                                            <div className="relative w-[92px]" ref={workPhoneCodeDropdownRef}>
                                                <button
                                                    type="button"
                                                    onClick={() => setIsWorkPhoneCodeDropdownOpen((prev: boolean) => !prev)}
                                                    className="w-full px-2 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 flex items-center justify-between bg-white"
                                                >
                                                    <span className="truncate">{contactPersonWorkPhoneCode}</span>
                                                    <ChevronDown size={14} className={`ml-1 text-gray-500 transition-transform ${isWorkPhoneCodeDropdownOpen ? "rotate-180" : ""}`} />
                                                </button>
                                                {isWorkPhoneCodeDropdownOpen && (
                                                    <div className="absolute z-50 mt-1 w-60 rounded-md border border-gray-200 bg-white shadow-lg">
                                                        <div className="p-2 border-b border-gray-100">
                                                            <div className="relative">
                                                                <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
                                                                <input
                                                                    value={workPhoneCodeSearch}
                                                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setWorkPhoneCodeSearch(e.target.value)}
                                                                    placeholder="Search"
                                                                    className="w-full pl-7 pr-2 py-1.5 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                                />
                                                            </div>
                                                        </div>
                                                        <div className="max-h-[200px] overflow-y-auto">
                                                            {filteredWorkPhoneCodeOptions.length === 0 && (
                                                                <div className="px-3 py-2 text-xs text-gray-500">No results</div>
                                                            )}
                                                            {filteredWorkPhoneCodeOptions.map((option: any) => (
                                                                <button
                                                                    key={`${option.code}-${option.name}-work`}
                                                                    type="button"
                                                                    className={`w-full flex items-center gap-2 px-3 py-2 text-left text-xs hover:bg-blue-50 ${contactPersonWorkPhoneCode === option.code ? "bg-blue-50 text-blue-700" : "text-gray-700"}`}
                                                                    onClick={() => {
                                                                        setContactPersonWorkPhoneCode(option.code);
                                                                        setIsWorkPhoneCodeDropdownOpen(false);
                                                                        setWorkPhoneCodeSearch("");
                                                                    }}
                                                                >
                                                                    <span className="inline-block w-12">{option.code}</span>
                                                                    <span className="truncate">{option.name}</span>
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                            <input
                                                type="tel"
                                                placeholder="Work Phone"
                                                value={newContactPerson.workPhone}
                                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewContactPerson((prev: any) => ({ ...prev, workPhone: e.target.value }))}
                                                className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                            />
                                        </div>
                                        <div className="flex gap-2">
                                            <div className="relative w-[92px]" ref={mobilePhoneCodeDropdownRef}>
                                                <button
                                                    type="button"
                                                    onClick={() => setIsMobilePhoneCodeDropdownOpen((prev: boolean) => !prev)}
                                                    className="w-full px-2 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 flex items-center justify-between bg-white"
                                                >
                                                    <span className="truncate">{contactPersonMobilePhoneCode}</span>
                                                    <ChevronDown size={14} className={`ml-1 text-gray-500 transition-transform ${isMobilePhoneCodeDropdownOpen ? "rotate-180" : ""}`} />
                                                </button>
                                                {isMobilePhoneCodeDropdownOpen && (
                                                    <div className="absolute z-50 mt-1 w-60 rounded-md border border-gray-200 bg-white shadow-lg">
                                                        <div className="p-2 border-b border-gray-100">
                                                            <div className="relative">
                                                                <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
                                                                <input
                                                                    value={mobilePhoneCodeSearch}
                                                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMobilePhoneCodeSearch(e.target.value)}
                                                                    placeholder="Search"
                                                                    className="w-full pl-7 pr-2 py-1.5 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                                />
                                                            </div>
                                                        </div>
                                                        <div className="max-h-[200px] overflow-y-auto">
                                                            {filteredMobilePhoneCodeOptions.length === 0 && (
                                                                <div className="px-3 py-2 text-xs text-gray-500">No results</div>
                                                            )}
                                                            {filteredMobilePhoneCodeOptions.map((option: any) => (
                                                                <button
                                                                    key={`${option.code}-${option.name}-mobile`}
                                                                    type="button"
                                                                    className={`w-full flex items-center gap-2 px-3 py-2 text-left text-xs hover:bg-blue-50 ${contactPersonMobilePhoneCode === option.code ? "bg-blue-50 text-blue-700" : "text-gray-700"}`}
                                                                    onClick={() => {
                                                                        setContactPersonMobilePhoneCode(option.code);
                                                                        setIsMobilePhoneCodeDropdownOpen(false);
                                                                        setMobilePhoneCodeSearch("");
                                                                    }}
                                                                >
                                                                    <span className="inline-block w-12">{option.code}</span>
                                                                    <span className="truncate">{option.name}</span>
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                            <input
                                                type="tel"
                                                placeholder="Mobile"
                                                value={newContactPerson.mobile}
                                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewContactPerson((prev: any) => ({ ...prev, mobile: e.target.value }))}
                                                className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Skype Name/Number */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Skype Name/Number</label>
                                    <div className="relative">
                                        <div className="absolute left-3 top-1/2 -translate-y-1/2">
                                            <div className="w-5 h-5 bg-blue-500 rounded flex items-center justify-center">
                                                <span className="text-white text-xs font-bold">S</span>
                                            </div>
                                        </div>
                                        <input
                                            type="text"
                                            placeholder="Skype Name/Number"
                                            value={newContactPerson.skype}
                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewContactPerson((prev: any) => ({ ...prev, skype: e.target.value }))}
                                            className="w-full pl-11 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>
                                </div>

                                {/* Other Details */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Other Details</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <input
                                            type="text"
                                            placeholder="Designation"
                                            value={newContactPerson.designation}
                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewContactPerson((prev: any) => ({ ...prev, designation: e.target.value }))}
                                            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                        <input
                                            type="text"
                                            placeholder="Department"
                                            value={newContactPerson.department}
                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewContactPerson((prev: any) => ({ ...prev, department: e.target.value }))}
                                            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>
                                </div>

                                {/* Enable Portal Access */}
                                <div className="border-t border-gray-200 pt-4">
                                    <div className="flex items-start gap-3">
                                        <input
                                            type="checkbox"
                                            id="enablePortalAccess"
                                            checked={newContactPerson.enablePortalAccess}
                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewContactPerson((prev: any) => ({ ...prev, enablePortalAccess: e.target.checked }))}
                                            className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                                        />
                                        <div className="flex-1">
                                            <label htmlFor="enablePortalAccess" className="block text-sm font-medium text-gray-700 mb-2 cursor-pointer">
                                                Enable portal access
                                            </label>
                                            <p className="text-sm text-gray-600 leading-relaxed">
                                                This customer will be able to see all their transactions with your organization by logging in to the portal using their email address.{" "}
                                                <a
                                                    href="#"
                                                    className="text-blue-600 hover:text-blue-700 hover:underline font-medium"
                                                    onClick={(e) => e.preventDefault()}
                                                >
                                                    Learn More
                                                </a>
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                    </div>

                                    {/* Profile Image Upload */}
                                    <div className="w-full lg:w-[320px] lg:pt-2">
                                        <div
                                            className="h-[310px] w-full rounded-lg border border-dashed border-gray-300 bg-white flex flex-col items-center justify-center text-center px-6"
                                            onDragOver={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                            }}
                                            onDrop={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                const file = e.dataTransfer?.files?.[0];
                                                handleContactPersonProfileFile(file);
                                            }}
                                        >
                                            {contactPersonProfilePreview ? (
                                                <div className="w-full h-full flex flex-col items-center justify-center gap-3">
                                                    <div className="w-28 h-28 rounded-full overflow-hidden border border-gray-200 bg-gray-50">
                                                        <img src={contactPersonProfilePreview} alt="Profile preview" className="w-full h-full object-cover" />
                                                    </div>
                                                    <button
                                                        type="button"
                                                        className="text-sm text-blue-600 hover:underline"
                                                        onClick={() => contactPersonProfileInputRef.current?.click()}
                                                    >
                                                        Change Image
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="text-sm text-gray-500 hover:underline"
                                                        onClick={() => setContactPersonProfilePreview(null)}
                                                    >
                                                        Remove
                                                    </button>
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center mb-3">
                                                        <Upload size={18} className="text-blue-600" />
                                                    </div>
                                                    <div className="text-sm font-medium text-gray-800 mb-1">Drag &amp; Drop Profile Image</div>
                                                    <div className="text-xs text-gray-500 mb-4">
                                                        Supported Files: jpg, jpeg, png, gif, bmp
                                                        <div className="mt-1">Maximum File Size: 5MB</div>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        className="text-sm text-blue-600 hover:underline"
                                                        onClick={() => contactPersonProfileInputRef.current?.click()}
                                                    >
                                                        Upload File
                                                    </button>
                                                </>
                                            )}
                                            <input
                                                ref={contactPersonProfileInputRef}
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={(e) => handleContactPersonProfileFile(e.target.files?.[0])}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="sticky bottom-0 bg-white z-10 flex items-center justify-start gap-3 p-6 border-t border-gray-200">
                                <button
                                    className={`px-6 py-2 bg-blue-600 text-white rounded-md text-sm font-medium cursor-pointer hover:bg-blue-700 transition-colors ${isSavingContactPerson ? "opacity-70 cursor-not-allowed" : ""}`}
                                    onClick={saveContactPerson}
                                    disabled={isSavingContactPerson}
                                >
                                    {isSavingContactPerson ? (
                                        <span className="inline-flex items-center gap-2">
                                            <Loader2 size={14} className="animate-spin" />
                                            Saving...
                                        </span>
                                    ) : (
                                        "Save"
                                    )}
                                </button>
                                <button
                                    className="px-6 py-2 bg-white border border-gray-300 text-gray-700 rounded-md text-sm font-medium cursor-pointer hover:bg-gray-50 transition-colors"
                                    onClick={() => {
                                        setIsAddContactPersonModalOpen(false);
                                        resetContactPersonModal();
                                    }}
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                )}
        </>
    );
}
