import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Edit, Trash2, Info, Check, X } from "lucide-react";
import { createPortal } from "react-dom";
import NewEmailTemplateModal from "./NewEmailTemplateModal";
import SignatureSettingsModal from "./SignatureSettingsModal";
import AddAdditionalContactModal from "./AddAdditionalContactModal";
import ShowMailContentModal from "./ShowMailContentModal";
import Skeleton from "../../components/ui/Skeleton";
import {
  emailTemplatesAPI,
  senderEmailsAPI,
  emailNotificationPreferencesAPI,
  emailRelayAPI,
} from "../../services/api";
import { getTemplateKeyFromLabel } from "./emailTemplateUtils";
import { useSettings } from "../../lib/settings/SettingsContext";
import { useUser } from "../../lib/auth/UserContext";

const DEFAULT_SYSTEM_SENDER_EMAIL = "message-service@sender.tabanbooks.com";

interface Sender {
  _id?: string;
  id?: string;
  name: string;
  email: string;
  isPrimary: boolean;
  isVerified?: boolean;
  smtpHost?: string;
  smtpPort?: number;
  smtpSecure?: boolean;
}

interface RelayServer {
  id: string;
  serverName: string;
  port: number;
  dailyMailLimit: number;
  useSecureConnection: "SSL" | "TLS" | "Never";
  mailDeliveryPreference: "domain" | "email";
  domainInServer: string;
  authenticationRequired: boolean;
  username?: string;
  password?: string;
  isEnabled: boolean;
}

export default function EmailNotificationsPage() {
  const navigate = useNavigate();
  const { settings } = useSettings();
  const { user } = useUser();
  const [selectedEmail, setSelectedEmail] = useState<string | null>(null);
  const [selectedPreference, setSelectedPreference] = useState<string | null>("Sender Email Preferences");
  const [showNewTemplateModal, setShowNewTemplateModal] = useState(false);
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [showAddContactModal, setShowAddContactModal] = useState(false);
  const [showMailContentModal, setShowMailContentModal] = useState(false);
  const [editingSender, setEditingSender] = useState<Sender | null>(null);
  const [emailInsightsEnabled, setEmailInsightsEnabled] = useState(false);
  const [signature, setSignature] = useState("");
  const [showSuccessNotification, setShowSuccessNotification] = useState(false);
  const [successMessage, setSuccessMessage] = useState("Settings saved successfully.");
  const [senders, setSenders] = useState<Sender[]>([]);
  const [templatesByKey, setTemplatesByKey] = useState<Record<string, any>>({});
  const [relayServers, setRelayServers] = useState<RelayServer[]>([]);
  const [loadingSenders, setLoadingSenders] = useState(true);
  const [loadingRelayServers, setLoadingRelayServers] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Fetch senders from API
  const fetchSenders = async () => {
    try {
      const response = await senderEmailsAPI.getAll();
      if (response?.success) {
        setSenders(Array.isArray(response.data) ? response.data : []);
      }
    } catch (error) {
      console.error("Error fetching senders:", error);
    } finally {
      setLoadingSenders(false);
    }
  };

  useEffect(() => {
    fetchSenders();
  }, []);

  const fetchEmailPreferences = async () => {
    try {
      const response = await emailNotificationPreferencesAPI.get();
      if (response?.success && response?.data) {
        setEmailInsightsEnabled(Boolean(response.data.emailInsightsEnabled));
        setSignature(String(response.data.signature || ""));
      }
    } catch (error) {
      console.error("Error fetching email preferences:", error);
    }
  };

  useEffect(() => {
    fetchEmailPreferences();
  }, []);

  const fetchRelayServers = async () => {
    try {
      const response = await emailRelayAPI.getAll();
      if (response?.success) {
        const servers = Array.isArray(response?.data?.servers) ? response.data.servers : [];
        setRelayServers(servers);
      }
    } catch (error) {
      console.error("Error fetching relay servers:", error);
    } finally {
      setLoadingRelayServers(false);
    }
  };

  useEffect(() => {
    fetchRelayServers();
  }, []);

  const fetchTemplates = async () => {
    try {
      const response = await emailTemplatesAPI.getAll();
      if (response?.success && response?.data) {
        setTemplatesByKey(response.data);
      }
    } catch (error) {
      console.error("Error fetching email templates:", error);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("senderVerified") === "1") {
      showSuccess("Sender email verified successfully.");
      params.delete("senderVerified");
      const nextSearch = params.toString();
      const nextUrl = `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ""}`;
      window.history.replaceState({}, "", nextUrl);
      return;
    }
  }, []);

  // Auto-hide success notification after 3 seconds
  useEffect(() => {
    if (showSuccessNotification) {
      const timer = setTimeout(() => {
        setShowSuccessNotification(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [showSuccessNotification]);

  const showSuccess = (message = "Settings saved successfully.") => {
    setSuccessMessage(message);
    setShowSuccessNotification(true);
  };

  const handleEmailInsightsToggle = async () => {
    try {
      const newValue = !emailInsightsEnabled;
      setErrorMessage(null);
      const response = await emailNotificationPreferencesAPI.update({
        emailInsightsEnabled: newValue,
      });
      if (!response?.success) {
        setErrorMessage(response?.message || "Failed to update Email Insights.");
        return;
      }
      setEmailInsightsEnabled(newValue);
      showSuccess("Email insights preference saved.");
    } catch (error: any) {
      setErrorMessage(error?.message || "Failed to update Email Insights.");
    }
  };

  const preferences = [
    "Sender Email Preferences",
    "Email Insights"
  ];

  const emailCategories = [
    {
      category: "General",
      emails: [
        "Customer Review Notification",
        "Item Notification",
        "Task Notification"
      ]
    },
    {
      category: "Sales",
      emails: [
        "Customer Notification",
        "Customer Statement",
        "Quote Notification",
        "Retainer Invoice Notification",
        "Invoice Notification",
        "Sales Receipt Notification",
        "Credit Note Notification",
        "Customer Portal Invitation",
        "Customer Portal Link"
      ]
    },
    {
      category: "Purchases",
      emails: [
        "Expense Notification",
        "Recurring Expense Notification"
      ]
    },
    {
      category: "Time Tracking",
      emails: ["Project Notification", "Timesheet Notification", "Timesheet Customer Approval"]
    },
    {
      category: "Customer Payments",
      emails: [
        "Payment Thank-you",
        "Retainer Payment Thank you",
        "Payment Initiated",
        "Payment Refund",
        "Offline Payment Failure"
      ]
    },
    {
      category: "Subscriptions",
      emails: [
        "New Subscription",
        "Update Subscription",
        "One-time Addon Purchase",
        "Subscription Renewal",
        "Reactivate Subscription",
        "Subscription Reactivation Scheduled",
        "Cancel Subscription",
        "Change Subscription Status",
        "Subscription Renewal Ahead"
      ]
    },
    {
      category: "Expiry & Cancellation",
      emails: [
        "Trial About to Expire",
        "Subscription About to Cancel",
        "Subscription about to Expire",
        "Card about to Expire",
        "Card Expired",
        "Subscription Expired",
        "Trial Expired"
      ]
    }
  ];

  const PUBLIC_DOMAINS = new Set([
    "gmail.com",
    "yahoo.com",
    "outlook.com",
    "hotmail.com",
    "live.com",
    "icloud.com",
    "aol.com",
    "proton.me",
    "protonmail.com",
  ]);

  const getDomain = (email: string) => String(email || "").split("@")[1]?.toLowerCase() || "";
  const selectedTemplateKey = getTemplateKeyFromLabel(selectedEmail);
  const selectedTemplate = templatesByKey[selectedTemplateKey];
  const uniqueDomains = Array.from(new Set(senders.map((s) => getDomain(s.email)).filter(Boolean)));
  const authenticatedDomains = uniqueDomains.filter((domain) => {
    const domainSenders = senders.filter((s) => getDomain(s.email) === domain);
    if (PUBLIC_DOMAINS.has(domain)) return false;
    return domainSenders.some((s) => Boolean(s.isVerified));
  });
  const unauthenticatedDomains = uniqueDomains.filter((domain) => {
    const domainSenders = senders.filter((s) => getDomain(s.email) === domain);
    if (PUBLIC_DOMAINS.has(domain)) return true;
    return !domainSenders.some((s) => Boolean(s.isVerified));
  });
  const primarySender = senders.find((sender) => sender.isPrimary);
  const orgEmail = String(settings?.general?.organizationEmail || "").trim();
  const orgName = String(settings?.general?.companyDisplayName || settings?.general?.schoolDisplayName || "").trim() || "Organization";
  const sendingFromAddress = primarySender?.isVerified ? primarySender.email : DEFAULT_SYSTEM_SENDER_EMAIL;

  const getSenderId = (sender: Sender) => String(sender._id || sender.id || "").trim();

  const handleResendSenderVerification = async (sender: Sender) => {
    const senderId = getSenderId(sender);
    if (!senderId) return;
    try {
      setErrorMessage(null);
      const response = await senderEmailsAPI.resendVerification(senderId);
      if (response?.success) {
        showSuccess("Verification email sent.");
      } else {
        setErrorMessage(response?.message || "Failed to resend verification email.");
      }
    } catch (error: any) {
      console.error("Error resending sender verification:", error);
      setErrorMessage(error?.message || "Failed to resend verification email.");
    }
  };

  const handleMarkSenderPrimary = async (sender: Sender) => {
    const senderId = getSenderId(sender);
    if (!senderId) return;
    try {
      setErrorMessage(null);
      const response = await senderEmailsAPI.update(senderId, { isPrimary: true });
      if (response?.success) {
        await fetchSenders();
        showSuccess("Primary sender updated.");
      } else {
        setErrorMessage(response?.message || "Failed to update primary sender.");
      }
    } catch (error: any) {
      console.error("Error updating primary sender:", error);
      setErrorMessage(error?.message || "Failed to update primary sender.");
    }
  };

  const handleDeleteSender = async (sender: Sender) => {
    const senderId = getSenderId(sender);
    if (!senderId) return;
    if (!window.confirm("Delete this sender?")) return;
    try {
      setErrorMessage(null);
      const response = await senderEmailsAPI.delete(senderId);
      if (response?.success) {
        await fetchSenders();
        showSuccess("Sender deleted.");
      } else {
        setErrorMessage(response?.message || "Failed to delete sender.");
      }
    } catch (error: any) {
      console.error("Error deleting sender:", error);
      setErrorMessage(error?.message || "Failed to delete sender.");
    }
  };

  // Verification emails are not used in this system. SMTP config is treated as ready-to-use.

  const toggleRelayServer = async (server: RelayServer, enabled: boolean) => {
    try {
      setErrorMessage(null);
      const response = await emailRelayAPI.toggle(server.id);
      if (!response?.success) {
        setErrorMessage(response?.message || "Failed to update relay server.");
        return;
      }
      await fetchRelayServers();
      showSuccess("Email relay status updated.");
    } catch (error: any) {
      setErrorMessage(error?.message || "Failed to update relay server.");
    }
  };

  const deleteRelayServer = async (server: RelayServer) => {
    try {
      if (!window.confirm(`Delete relay server ${server.serverName}?`)) return;
      setErrorMessage(null);
      const response = await emailRelayAPI.delete(server.id);
      if (!response?.success) {
        setErrorMessage(response?.message || "Failed to delete relay server.");
        return;
      }
      await fetchRelayServers();
      showSuccess("Email relay server deleted.");
    } catch (error: any) {
      setErrorMessage(error?.message || "Failed to delete relay server.");
    }
  };

  const editRelayServer = async (server: RelayServer) => {
    try {
      const nextServerName = window.prompt("SMTP server host", server.serverName);
      if (nextServerName === null) return;
      const nextPortInput = window.prompt("Port", String(server.port));
      if (nextPortInput === null) return;
      const nextPort = Number(nextPortInput);
      if (!Number.isFinite(nextPort) || nextPort <= 0) {
        setErrorMessage("Invalid relay server port.");
        return;
      }

      setErrorMessage(null);
      const response = await emailRelayAPI.update(server.id, {
        serverName: nextServerName.trim(),
        port: nextPort,
      });
      if (!response?.success) {
        setErrorMessage(response?.message || "Failed to update relay server.");
        return;
      }
      await fetchRelayServers();
      showSuccess("Email relay server updated.");
    } catch (error: any) {
      setErrorMessage(error?.message || "Failed to update relay server.");
    }
  };

  const saveSignature = async (nextSignature: string) => {
    try {
      setErrorMessage(null);
      const response = await emailNotificationPreferencesAPI.update({ signature: nextSignature });
      if (!response?.success) {
        setErrorMessage(response?.message || "Failed to update signature.");
        return false;
      }
      setSignature(nextSignature);
      showSuccess("Signature saved successfully.");
      return true;
    } catch (error: any) {
      setErrorMessage(error?.message || "Failed to update signature.");
      return false;
    }
  };

  return (
    <div className="w-full">
      {/* Success Notification */}
      {showSuccessNotification && (
        <div className="fixed top-4 right-4 z-[10001] min-w-[320px] max-w-[420px] rounded-xl border border-slate-100 bg-white px-4 py-3 shadow-[0_12px_30px_rgba(15,23,42,0.14)]">
          <button
            type="button"
            onClick={() => setShowSuccessNotification(false)}
            className="absolute right-2 top-2 text-slate-400 transition hover:text-slate-600"
            aria-label="Dismiss notification"
          >
            <X size={16} />
          </button>
          <div className="flex items-center gap-3 pr-6">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-green-500 text-white">
              <Check size={16} strokeWidth={3} />
            </div>
            <span className="text-sm font-medium text-slate-700">{successMessage}</span>
          </div>
        </div>
      )}
      {errorMessage && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-[10001] bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg">
          {errorMessage}
        </div>
      )}

      <div className="flex items-stretch gap-4">
        {/* Left Sidebar - Email List */}
        <div className="hidden w-80 bg-white rounded-lg border border-gray-200 h-[calc(100vh-2rem)] flex flex-col">
          <div className="shrink-0 border-b border-gray-200 px-4 py-3">
            <h2 className="text-xl font-semibold text-gray-900">Emails</h2>
          </div>
          <div className="flex-1 overflow-y-auto px-4 pt-4 pb-0">
            <div className="space-y-4">
            {/* PREFERENCES Section */}
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">PREFERENCES</h3>
              <div className="space-y-1">
                {preferences.map((pref, prefIndex) => (
                  <button
                    key={prefIndex}
                    onClick={() => {
                      setSelectedPreference(pref);
                      setSelectedEmail(null);
                    }}
                    className={`w-full text-left px-3 py-2 text-sm rounded transition ${selectedPreference === pref
                      ? "bg-gray-100 text-gray-900 font-medium"
                      : "text-gray-700 hover:bg-gray-50"
                      }`}
                  >
                    {pref}
                  </button>
                ))}
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-gray-200 my-4"></div>

            {/* TEMPLATES Section */}
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">TEMPLATES</h3>
              <div className="space-y-4">
                {emailCategories.map((cat, catIndex) => (
                  <div key={catIndex}>
                    <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">{cat.category}</h4>
                    <div className="space-y-1">
                      {cat.emails.map((email, emailIndex) => (
                        <button
                          key={emailIndex}
                          onClick={() => {
                            setSelectedEmail(email);
                            setSelectedPreference(null);
                          }}
                          className={`w-full text-left px-3 py-2 text-sm rounded transition ${selectedEmail === email
                            ? "bg-blue-50 text-blue-900 font-medium"
                            : "text-gray-700 hover:bg-gray-50"
                            }`}
                        >
                          {email}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            </div>
          </div>
        </div>

        {/* Right Content - Email Details */}
        <div className="flex-1 rounded-lg p-6 h-[calc(100vh-2rem)] overflow-y-auto">
          {selectedPreference === "Sender Email Preferences" ? (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-900">Sender Email Preferences</h2>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowAddContactModal(true)}
                    className="px-4 py-2 text-sm font-medium text-white bg-[#156372] rounded-lg hover:bg-[#0f4e5a] flex items-center gap-2"
                  >
                    <Plus size={16} />
                    New Sender
                  </button>
                </div>
              </div>

              {/* Emails Are Sent Through Section */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-900 mb-2">Public Domains</h3>
                <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
                  <div className="grid grid-cols-1 md:grid-cols-[320px_1fr]">
                    <div className="p-5 border-b md:border-b-0 md:border-r border-slate-200">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 mb-3">
                        EMAILS ARE SENT THROUGH
                      </div>
                      {loadingSenders ? (
                        <>
                          <Skeleton className="h-4 w-44 mb-2" />
                          <Skeleton className="h-3 w-56" />
                        </>
                      ) : (
                        <>
                          <div className="text-sm font-semibold text-slate-900">
                            Email address of {orgName}
                          </div>
                          <div className="text-sm text-slate-500">
                            ({sendingFromAddress})
                          </div>
                          {!primarySender?.isVerified && orgEmail ? (
                            <div className="mt-1 text-xs text-slate-500">
                              Reply-To: {orgEmail}
                            </div>
                          ) : null}
                        </>
                      )}
                    </div>
                    <div className="p-5 bg-sky-50/60">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-sky-100 text-sky-700">
                          <Info size={14} />
                        </div>
                        <p className="text-sm text-slate-700 leading-relaxed">
                          Emails sent from a public domain may be flagged as spam. If you use a public domain address,
                          the email will be delivered via a system sender. In all cases, the Reply-To address will be set to the from address.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-700">Name</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-700">Email Address</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-700">Status</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {loadingSenders && (
                      <tr>
                        <td colSpan={4} className="px-4 py-6 text-sm text-slate-500">
                          Loading sender emails...
                        </td>
                      </tr>
                    )}
                    {!loadingSenders && senders.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-4 py-6 text-sm text-slate-500">
                          No sender emails found.
                        </td>
                      </tr>
                    )}
                    {senders.map((sender) => {
                      const senderId = getSenderId(sender);
                      const isVerified = Boolean(sender.isVerified);
                      const isPrimary = Boolean(sender.isPrimary);
                      return (
                        <tr key={senderId || sender.email}>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-slate-900">{sender.name || "Unnamed sender"}</span>
                              {isPrimary ? (
                                <span className="rounded bg-lime-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-lime-700">Primary</span>
                              ) : null}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-700">{sender.email}</td>
                          <td className="px-4 py-3">
                            {isVerified ? (
                              <span className="rounded bg-emerald-100 px-2 py-1 text-[11px] font-semibold text-emerald-700">Verified</span>
                            ) : (
                              <span className="rounded bg-amber-100 px-2 py-1 text-[11px] font-semibold text-amber-700">Unverified</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-2">
                              {!isVerified ? (
                                <button
                                  type="button"
                                  onClick={() => handleResendSenderVerification(sender)}
                                  className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                                >
                                  Resend Email
                                </button>
                              ) : !isPrimary ? (
                                <button
                                  type="button"
                                  onClick={() => handleMarkSenderPrimary(sender)}
                                  className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                                >
                                  Mark as Primary
                                </button>
                              ) : null}
                              <button
                                type="button"
                                onClick={() => setEditingSender(sender)}
                                className="rounded-md p-2 text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                                aria-label="Edit sender"
                              >
                                <Edit size={16} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteSender(sender)}
                                className="rounded-md p-2 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                                aria-label="Delete sender"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

            </div>
          ) : selectedPreference === "Email Relay" ? (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-900">Email Relay</h2>
                <button
                  onClick={() => navigate("/settings/customization/email-notifications/new-server")}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 flex items-center gap-2"
                >
                  <Plus size={16} />
                  New Server
                </button>
              </div>

              <p className="text-sm text-gray-600 mb-4">
                Route outgoing emails through your own SMTP relay servers to improve deliverability and domain control.
              </p>

              <div className="border border-gray-200 rounded-lg overflow-hidden mb-4">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">SERVER</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">DELIVERY</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">SECURITY</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">STATUS</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {loadingRelayServers && (
                      <tr>
                        <td colSpan={5} className="px-4 py-6 text-sm text-gray-500">
                          Loading relay servers...
                        </td>
                      </tr>
                    )}
                    {!loadingRelayServers && relayServers.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-4 py-6 text-sm text-gray-500">
                          No relay server configured yet.
                        </td>
                      </tr>
                    )}
                    {relayServers.map((server) => (
                      <tr key={server.id}>
                        <td className="px-4 py-3">
                          <div className="text-sm font-medium text-gray-900">{server.serverName}</div>
                          <div className="text-xs text-gray-500">Port {server.port}</div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {server.mailDeliveryPreference === "email" ? "Email-based" : "Domain-based"}:{" "}
                          {server.domainInServer}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">{server.useSecureConnection}</td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => toggleRelayServer(server, !server.isEnabled)}
                            className={`px-2.5 py-1 text-xs font-medium rounded ${
                              server.isEnabled
                                ? "text-green-700 bg-green-50"
                                : "text-gray-700 bg-gray-100"
                            }`}
                          >
                            {server.isEnabled ? "Enabled" : "Disabled"}
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => editRelayServer(server)}
                              className="p-1.5 text-gray-600 hover:bg-gray-100 rounded transition"
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              onClick={() => deleteRelayServer(server)}
                              className="p-1.5 text-gray-600 hover:bg-gray-100 rounded transition"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="text-xs text-gray-500">
                Once enabled, outgoing emails follow: Taban Books -&gt; Relay Server -&gt; Recipient.
              </div>
            </div>
          ) : selectedPreference === "Email Insights" ? (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-900">Email Insights</h2>
              </div>

              {/* Toggle Section */}
              <div className="flex items-center justify-between mb-6">
                <span className="text-sm font-medium text-gray-900">Track the emails sent to your customers</span>
                <button
                  onClick={handleEmailInsightsToggle}
                  className={`relative w-12 h-6 rounded-full transition-colors ${emailInsightsEnabled ? 'bg-blue-600' : 'bg-gray-300'
                    }`}
                >
                  <span
                    className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${emailInsightsEnabled ? 'translate-x-6' : 'translate-x-0'
                      }`}
                  />
                </button>
              </div>

              {/* Benefits Section */}
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-900 mb-3">By enabling Email Insights, you can:</h3>
                <ul className="space-y-2">
                  <li className="flex items-start gap-2">
                    <Check size={18} className="text-green-600 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-gray-700">Track the emails that are sent for Invoices and Sales Orders.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check size={18} className="text-green-600 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-gray-700">View the time when the email was opened, in the transaction list and details page.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check size={18} className="text-green-600 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-gray-700">View the list of transactions viewed via email by the customer, when you filter by 'Client Viewed'.</span>
                  </li>
                </ul>
              </div>

              {/* Note Section */}
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <p className="text-sm font-semibold text-gray-900 mb-2">Note:</p>
                <ul className="space-y-1 text-sm text-gray-700">
                  <li>If you enable Email Insights, the emails sent from your Taban Books organization will be tracked to know when your customer has viewed them.</li>
                  <li>If the email you sent has multiple recipients, the corresponding transaction will be marked as viewed when any one of them opens it.</li>
                </ul>
              </div>
            </div>
          ) : selectedPreference ? (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">{selectedPreference}</h2>
              <div className="text-sm text-gray-600">
                <p>Configure {selectedPreference.toLowerCase()} settings here.</p>
              </div>
            </div>
          ) : selectedEmail ? (
            <>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">{selectedEmail}</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    {selectedEmail === "Customer Review Notification"
                      ? "Sent when requested for customer review."
                      : "Sent when a customer is invoiced."}
                  </p>
                </div>
                {selectedEmail !== "Customer Review Notification" && (
                  <button
                    onClick={() => setShowNewTemplateModal(true)}
                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 flex items-center gap-2"
                  >
                    <Plus size={16} />
                    New
                  </button>
                )}
              </div>

              {selectedEmail === "Customer Review Notification" ? (
                <div className="text-center py-12">
                  <div className="max-w-md mx-auto">
                    <p className="text-sm text-gray-700">
                      Enable customer review to access <strong>Client Review Notification</strong> template
                    </p>
                    <p className="text-sm text-gray-700 mt-2">
                      Go to <strong>Settings ➔ Preferences ➔ Portal</strong> and mark the <strong>Enable customer review for my services</strong> option.
                    </p>
                  </div>
                  <div className="mt-6">
                    <button
                      onClick={() => setShowSignatureModal(true)}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      Edit Signature
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  {/* Table View */}
                  <div className="border border-gray-200 rounded-lg overflow-hidden mb-4">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">NAME</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">SUBJECT AND CONTENT</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">LANGUAGES WITH CONTENT</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        <tr>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-blue-600 cursor-pointer hover:underline">Default</span>
                              <span className="px-2 py-1 text-xs font-medium text-blue-600 bg-blue-50 rounded">DEFAULT</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-sm text-gray-900 mb-1">
                              {selectedTemplate?.subject || (
                                selectedEmail === "Customer Statement"
                                  ? "Account Statement from %StartDate% to %EndDate%"
                                  : selectedEmail === "Customer Notification"
                                    ? "Customer Notification"
                                    : `${selectedEmail} - %InvoiceNumber% from %CompanyName%`
                              )}
                            </div>
                            <div className="flex items-center gap-4">
                              <button
                                onClick={() => setShowMailContentModal(true)}
                                className="text-sm text-blue-600 hover:text-blue-700"
                              >
                                Show Mail Content
                              </button>
                              <button className="text-sm text-blue-600 hover:text-blue-700">Attachments</button>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm text-gray-900">English</span>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Edit Signature Button */}
                  <div>
                    <button
                      onClick={() => setShowSignatureModal(true)}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      Edit Signature
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <p className="text-sm">Select an email template or preference from the sidebar</p>
            </div>
          )}
        </div>
      </div>

      {/* New Email Template Modal */}
      {showNewTemplateModal && createPortal(
        <NewEmailTemplateModal
          emailType={selectedEmail}
          onClose={() => setShowNewTemplateModal(false)}
          onSave={async (templateData: any) => {
            try {
              await emailTemplatesAPI.upsert(selectedTemplateKey, templateData);
              await fetchTemplates();
              showSuccess("Email template saved.");
            } catch (error) {
              console.error("Error saving template:", error);
              setErrorMessage("Failed to save email template.");
            }
            setShowNewTemplateModal(false);
          }}
        />,
        document.body
      )}

      {/* Signature Settings Modal */}
      {showSignatureModal && createPortal(
        <SignatureSettingsModal
          initialSignature={signature}
          onClose={() => setShowSignatureModal(false)}
          onSave={async (nextSignature: string) => {
            const saved = await saveSignature(nextSignature);
            if (saved) {
              setShowSignatureModal(false);
            }
          }}
        />,
        document.body
      )}

      {/* Add Additional Contact Modal */}
      {showAddContactModal && createPortal(
        <AddAdditionalContactModal
          onClose={() => setShowAddContactModal(false)}
          onSave={async (contactData) => {
            try {
              const response = await senderEmailsAPI.create(contactData);
              if (response?.success) {
                await fetchSenders();
                showSuccess("Sender added.");
              } else {
                setErrorMessage(response?.message || "Failed to add sender.");
              }
            } catch (error) {
              console.error("Error adding sender:", error);
              setErrorMessage("Failed to add sender.");
            }
            setShowAddContactModal(false);
          }}
        />,
        document.body
      )}

      {/* Edit Contact Modal */}
      {editingSender && createPortal(
        <AddAdditionalContactModal
          editData={editingSender}
          onClose={() => setEditingSender(null)}
          onSave={async (contactData) => {
            try {
              const response = await senderEmailsAPI.update(editingSender._id || editingSender.id, contactData);
              if (response?.success) {
                await fetchSenders();
                showSuccess("Sender updated.");
              } else {
                setErrorMessage(response?.message || "Failed to update sender.");
              }
            } catch (error) {
              console.error("Error updating sender:", error);
              setErrorMessage("Failed to update sender.");
            }
            setEditingSender(null);
          }}
        />,
        document.body
      )}

      {/* Show Mail Content Modal */}
      {showMailContentModal && createPortal(
        <ShowMailContentModal
          emailType={selectedEmail}
          template={selectedTemplate}
          signature={signature}
          onClose={() => setShowMailContentModal(false)}
        />,
        document.body
      )}
    </div>
  );
}

