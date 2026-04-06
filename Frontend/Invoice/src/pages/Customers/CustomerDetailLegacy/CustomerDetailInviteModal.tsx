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

export default function CustomerDetailInviteModal({ detail }: { detail: any }) {
    const { id: routeCustomerId } = useParams();
    const {
        customer,
        displayName,
        inviteEmail,
        inviteMethod,
        isInviteModalOpen,
        loading,
        location,
        setInviteEmail,
        setInviteMethod,
        setIsInviteModalOpen,
        setShowInviteCard,
    } = detail as any;
    const customerId = String(customer?._id || customer?.id || routeCustomerId || "").trim();
    return (
        <>
            {/* Invite Customer Modal */}
            {
                isInviteModalOpen && (
                    <div
                        className="fixed inset-0 bg-black/50 flex items-center justify-center z-[2000]"
                        onClick={(e: React.MouseEvent<HTMLDivElement>) => {
                            if (e.target === e.currentTarget) {
                                setIsInviteModalOpen(false);
                            }
                        }}
                    >
                        <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
                            <div className="p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-xl font-semibold text-gray-900">Invite Customer</h2>
                                    <button
                                        onClick={() => setIsInviteModalOpen(false)}
                                        className="p-1 text-gray-400 hover:text-gray-600 cursor-pointer"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>

                                {/* Invite Method Selection */}
                                <div className="mb-6">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Invite Method</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            onClick={() => setInviteMethod('email')}
                                            className={`px-4 py-2.5 rounded-md text-sm font-medium cursor-pointer transition-colors ${inviteMethod === 'email'
                                                ? 'text-white'
                                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                                }`}
                                            style={inviteMethod === 'email' ? { backgroundColor: '#156372' } : {}}
                                        >
                                            <Mail size={16} className="inline mr-2" />
                                            Email
                                        </button>
                                        <button
                                            onClick={() => setInviteMethod('social')}
                                            className={`px-4 py-2.5 rounded-md text-sm font-medium cursor-pointer transition-colors ${inviteMethod === 'social'
                                                ? 'text-white'
                                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                                }`}
                                            style={inviteMethod === 'social' ? { backgroundColor: '#156372' } : {}}
                                        >
                                            <UserPlus size={16} className="inline mr-2" />
                                            Social
                                        </button>
                                    </div>
                                </div>

                                {/* Email Invite Form */}
                                {inviteMethod === 'email' && (
                                    <div className="mb-6">
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Email Address
                                        </label>
                                        <input
                                            type="email"
                                            value={inviteEmail || customer?.email || customer?.contactPersons?.[0]?.email || ''}
                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInviteEmail(e.target.value)}
                                            placeholder="Enter email address"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 rounded-md"
                                            style={{ '--tw-ring-color': '#156372' } as React.CSSProperties}
                                            onFocus={(e: React.FocusEvent<HTMLInputElement>) => (e.target as HTMLElement).style.borderColor = '#156372'}
                                            onBlur={(e: React.FocusEvent<HTMLInputElement>) => (e.target as HTMLElement).style.borderColor = '#d1d5db'}
                                        />
                                        <p className="mt-2 text-xs text-gray-500">
                                            An invitation email will be sent to this address
                                        </p>
                                    </div>
                                )}

                                {/* Social Media Invite Options */}
                                {inviteMethod === 'social' && (
                                    <div className="mb-6">
                                        <label className="block text-sm font-medium text-gray-700 mb-3">
                                            Share via Social Media & Messaging
                                        </label>
                                        <div className="space-y-2">
                                            <button
                                                onClick={async () => {
                                                    const customerName = customer?.name || customer?.displayName || 'Customer';
                                                    const customerEmail = inviteEmail || customer?.email || customer?.contactPersons?.[0]?.email || '';
                                                    const inviteMessage = `Hello ${customerName},

You have been invited to join our customer portal. Please click the link below to access your account:

${window.location.href}

Thank you!`;
                                                    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(inviteMessage)}`;
                                                    window.open(whatsappUrl, '_blank');
                                                    toast.success('Opening WhatsApp...');
                                                }}
                                                className="w-full flex items-center gap-3 px-4 py-2.5 text-white rounded-md text-sm font-medium cursor-pointer transition-colors"
                                                style={{ backgroundColor: '#25D366' }}
                                                onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => (e.currentTarget as HTMLElement).style.backgroundColor = '#20BA5A'}
                                                onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => (e.currentTarget as HTMLElement).style.backgroundColor = '#25D366'}
                                            >
                                                <span className="text-lg">💚</span>
                                                Send via WhatsApp
                                            </button>
                                            <button
                                                onClick={async () => {
                                                    const customerName = customer?.name || customer?.displayName || 'Customer';
                                                    const shareText = `Invite ${customerName} to join our customer portal`;
                                                    const shareUrl = window.location.href;
                                                    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(shareText)}`;
                                                    window.open(facebookUrl, '_blank', 'width=600,height=400');
                                                }}
                                                className="w-full flex items-center gap-3 px-4 py-2.5 bg-blue-600 text-white rounded-md text-sm font-medium cursor-pointer hover:bg-blue-700 transition-colors"
                                            >
                                                <span className="text-lg">📘</span>
                                                Share on Facebook
                                            </button>
                                            <button
                                                onClick={async () => {
                                                    const customerName = customer?.name || customer?.displayName || 'Customer';
                                                    const shareText = `Invite ${customerName} to join our customer portal`;
                                                    const shareUrl = window.location.href;
                                                    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
                                                    window.open(twitterUrl, '_blank', 'width=600,height=400');
                                                }}
                                                className="w-full flex items-center gap-3 px-4 py-2.5 bg-sky-500 text-white rounded-md text-sm font-medium cursor-pointer hover:bg-sky-600 transition-colors"
                                            >
                                                <span className="text-lg">🐦</span>
                                                Share on Twitter
                                            </button>
                                            <button
                                                onClick={async () => {
                                                    const customerName = customer?.name || customer?.displayName || 'Customer';
                                                    const shareText = `Invite ${customerName} to join our customer portal`;
                                                    const shareUrl = window.location.href;
                                                    const linkedinUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
                                                    window.open(linkedinUrl, '_blank', 'width=600,height=400');
                                                }}
                                                className="w-full flex items-center gap-3 px-4 py-2.5 bg-blue-700 text-white rounded-md text-sm font-medium cursor-pointer hover:bg-blue-800 transition-colors"
                                            >
                                                <span className="text-lg">💼</span>
                                                Share on LinkedIn
                                            </button>
                                            <button
                                                onClick={async () => {
                                                    const customerName = customer?.name || customer?.displayName || 'Customer';
                                                    const shareText = `Invite ${customerName} to join our customer portal: ${window.location.href}`;
                                                    if (navigator.share) {
                                                        try {
                                                            await navigator.share({
                                                                title: 'Customer Portal Invitation',
                                                                text: shareText,
                                                            });
                                                        } catch (err) {
                                                        }
                                                    } else {
                                                        // Fallback: copy to clipboard
                                                        navigator.clipboard.writeText(shareText);
                                                        toast.success('Invitation link copied to clipboard!');
                                                    }
                                                }}
                                                className="w-full flex items-center gap-3 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-md text-sm font-medium cursor-pointer hover:bg-gray-200 transition-colors"
                                            >
                                                <span className="text-lg">📋</span>
                                                Copy Invitation Link
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Action Buttons */}
                                <div className="flex items-center justify-end gap-3">
                                    <button
                                        onClick={() => {
                                            setIsInviteModalOpen(false);
                                            setInviteEmail('');
                                            setInviteMethod('email');
                                        }}
                                        className="px-6 py-2.5 bg-gray-200 text-gray-700 rounded-md text-sm font-medium cursor-pointer transition-colors hover:bg-gray-300"
                                    >
                                        Cancel
                                    </button>
                                    {inviteMethod === 'email' && (
                                        <button
                                            onClick={async (e) => {
                                                const emailToSend = inviteEmail || customer?.email || customer?.contactPersons?.[0]?.email;
                                                if (!emailToSend || !emailToSend.trim()) {
                                                    toast.error('Please enter an email address');
                                                    return;
                                                }

                                                // Validate email format
                                                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                                                if (!emailRegex.test(emailToSend.trim())) {
                                                    toast.error('Please enter a valid email address');
                                                    return;
                                                }

                                                const button = e.currentTarget;
                                                const originalText = button.textContent;

                                                try {
                                                    // Show loading state
                                                    button.disabled = true;
                                                    button.textContent = 'Sending...';
                                                    button.style.opacity = '0.7';

                                                    if (!customerId) {
                                                        throw new Error('Missing customer id');
                                                    }

                                                    const response = await customersAPI.sendInvitation(customerId, {
                                                        email: emailToSend.trim(),
                                                        method: 'email'
                                                    });

                                                    if (response && response.success) {
                                                        toast.success(`✅ Invitation email sent successfully to ${emailToSend.trim()}`);
                                                        setIsInviteModalOpen(false);
                                                        setInviteEmail('');
                                                        setShowInviteCard(true);
                                                    } else {
                                                        throw new Error(response?.message || 'Failed to send invitation');
                                                    }
                                                } catch (error: unknown) {
                                                    const apiError = error && typeof error === 'object'
                                                        ? error as { data?: { message?: string; error?: string }; message?: string }
                                                        : null;
                                                    const errorMessage = apiError?.data?.message || apiError?.data?.error || apiError?.message || (error instanceof Error ? error.message : 'Unknown error');

                                                    toast.error(`❌ Failed to send invitation: ${errorMessage}`, {
                                                        autoClose: 5000
                                                    });
                                                    // Reset button
                                                    button.disabled = false;
                                                    button.textContent = originalText;
                                                    button.style.opacity = '1';
                                                }
                                            }}
                                            className="px-6 py-2.5 text-white rounded-md text-sm font-medium cursor-pointer transition-all"
                                            style={{ backgroundColor: '#156372' }}
                                            onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => (e.currentTarget as HTMLElement).style.backgroundColor = '#0f4d5a'}
                                            onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => (e.currentTarget as HTMLElement).style.backgroundColor = '#156372'}
                                        >
                                            Send Invitation
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }
        </>
    );
}
