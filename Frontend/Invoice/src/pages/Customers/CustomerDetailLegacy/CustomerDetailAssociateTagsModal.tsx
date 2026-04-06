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

export default function CustomerDetailAssociateTagsModal({ detail }: { detail: any }) {
    const {
        associateTagsValues,
        availableReportingTags,
        closeAssociateTagsModal,
        handleSaveAssociateTags,
        isAssociateTagsModalOpen,
        isSavingAssociateTags,
        setAssociateTagsValues,
    } = detail as any;
    const associateTagsValuesTyped = (associateTagsValues || {}) as Record<string, string>;
    const setAssociateTagsValuesTyped = setAssociateTagsValues as React.Dispatch<React.SetStateAction<Record<string, string>>>;
    return (
        <>
            {/* Associate Tags Modal */}
            {isAssociateTagsModalOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-[2000] flex items-start justify-center pt-10 pb-10 overflow-y-auto"
                    onClick={(e: React.MouseEvent<HTMLDivElement>) => {
                        if (e.target === e.currentTarget) {
                            closeAssociateTagsModal();
                        }
                    }}
                >
                    <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full mx-6 overflow-visible">
                        <div className="sticky top-0 bg-white z-10 flex items-center justify-between p-6 border-b border-gray-200">
                            <h2 className="text-xl font-semibold text-gray-900">Associate Tags</h2>
                            <button
                                type="button"
                                className="flex items-center justify-center w-10 h-10 bg-white border-2 border-blue-600 rounded text-gray-800 cursor-pointer hover:bg-gray-50 transition-colors"
                                onClick={closeAssociateTagsModal}
                                aria-label="Close"
                                title="Close"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="p-6">
                            {availableReportingTags.length === 0 ? (
                                <div className="text-sm text-gray-600">Loading tags...</div>
                            ) : (
                                <div className="space-y-4">
                                    {availableReportingTags.map((tag: any) => {
                                        const tagId = String(tag?._id || tag?.id || "").trim();
                                        if (!tagId) return null;
                                        const isRequired = Boolean(tag?.isRequired || tag?.required);
                                        const selectedVal = String(associateTagsValues?.[tagId] || "");
                                        const normalizedOptions = Array.isArray(tag?.options) ? tag.options : [];
                                        const options = [
                                            { value: "", label: "None" },
                                            ...normalizedOptions.map((opt: string) => ({ value: opt, label: opt })),
                                        ];

                                        return (
                                            <div key={tagId} className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-3 items-start">
                                                <label className={`text-sm font-medium ${isRequired ? "text-red-600" : "text-gray-700"} pt-2`}>
                                                    {tag?.name || "Tag"}{isRequired ? " *" : ""}
                                                </label>
                                                <div className="max-w-md">
                                                    <SearchableDropdown
                                                        value={selectedVal}
                                                        options={options}
                                                        placeholder="None"
                                                        accentColor="#2563eb"
                                                        showClear={true}
                                                        onClear={() => {
                                                            const next = { ...associateTagsValuesTyped };
                                                            delete next[tagId];
                                                            setAssociateTagsValuesTyped(next);
                                                        }}
                                                        onChange={(value) => {
                                                            const next = { ...associateTagsValuesTyped };
                                                            if (!value) {
                                                                delete next[tagId];
                                                            } else {
                                                                next[tagId] = value;
                                                            }
                                                            setAssociateTagsValuesTyped(next);
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        <div className="sticky bottom-0 bg-white z-10 flex items-center justify-start gap-3 p-6 border-t border-gray-200">
                            <button
                                type="button"
                                className={`px-6 py-2 rounded-md text-sm font-medium transition-colors ${isSavingAssociateTags ? "bg-blue-400 text-white cursor-not-allowed" : "bg-blue-600 text-white cursor-pointer hover:bg-blue-700"}`}
                                onClick={handleSaveAssociateTags}
                                disabled={isSavingAssociateTags}
                            >
                                Save
                            </button>
                            <button
                                type="button"
                                className="px-6 py-2 bg-white border border-gray-300 text-gray-700 rounded-md text-sm font-medium cursor-pointer hover:bg-gray-50 transition-colors"
                                onClick={closeAssociateTagsModal}
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
