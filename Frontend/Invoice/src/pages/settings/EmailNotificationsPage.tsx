import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Edit, Trash2, Info, Check } from "lucide-react";
import { createPortal } from "react-dom";
import NewEmailTemplateModal from "./NewEmailTemplateModal";
import SignatureSettingsModal from "./SignatureSettingsModal";
import AddAdditionalContactModal from "./AddAdditionalContactModal";
import ShowMailContentModal from "./ShowMailContentModal";
import {
  emailTemplatesAPI,
  senderEmailsAPI,
  emailNotificationPreferencesAPI,
  emailRelayAPI,
} from "../../services/api";
import { getTemplateKeyFromLabel } from "./emailTemplateUtils";

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
    "Email Relay",
    "Email Insights"
  ];

  const emailCategories = [
    {
      category: "GENERAL",
      emails: [
        "Customer Review Notification",
        "Item Notification"
      ]
    },
    {
      category: "SALES",
      emails: [
        "Customer Notification",
        "Customer Statement",
        "Quote Notification",
        "Invoice Notification",
        "Recurring Invoice Notification",
        "Credit Note Notification",
        "Customer Portal Invitation",
        "Customer Portal Link"
      ]
    },
    {
      category: "PURCHASES",
      emails: [
        "Vendor Statement",
        "Vendor Credit Notification",
        "Vendor Portal Invitation",
        "Expense Notification",
        "Recurring Expense",
        "Recurring Expense Notification",
        "Expense Refund Notification",
        "Purchase Order Notification",
        "Bill Notification",
        "Recurring Bill Notification"
      ]
    },
    {
      category: "TIME TRACKING",
      emails: ["Project Notification", "Timesheet Notification"]
    },
    {
      category: "ACCOUNTING",
      emails: [
        "Chart of Accounts Notification",
        "Budget Notification",
        "Transfer Fund Notification",
        "Deposit Notification",
        "Owner Drawings Notification",
        "Owner Contribution Notification",
        "Other Income Notification",
        "Interest Income Notification"
      ]
    },
    {
      category: "CUSTOMER PAYMENTS",
      emails: [
        "Payment Thank-you",
        "Payment Initiated",
        "Payment Refund",
        "Card Payment Notification",
        "Refund/Credit Notification"
      ]
    },
    {
      category: "VENDOR PAYMENTS",
      emails: ["Payment Made Notification"]
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
  const sendingFromAddress = primarySender?.isVerified
    ? primarySender.email
    : "message-service@sender.tabanbooks.com";
  const sendingFromLabel = primarySender?.isVerified
    ? "Primary sender email"
    : "Email address of Taban Books";

  const markPrimaryContact = async (sender: Sender) => {
    try {
      setErrorMessage(null);
      const response = await senderEmailsAPI.update(sender._id || sender.id, { isPrimary: true });
      if (!response?.success) {
        setErrorMessage(response?.message || "Failed to mark as primary.");
        return;
      }
      await fetchSenders();
      showSuccess("Primary sender updated.");
    } catch (error) {
      console.error("Error marking sender as primary:", error);
      setErrorMessage("Failed to mark as primary.");
    }
  };

  const resendVerification = async (sender: Sender) => {
    try {
      setErrorMessage(null);
      const response = await senderEmailsAPI.update(sender._id || sender.id, { isVerified: true });
      if (!response?.success) {
        setErrorMessage(response?.message || "Failed to resend verification.");
        return;
      }
      await fetchSenders();
      showSuccess("Verification status updated.");
    } catch (error) {
      console.error("Error resending verification:", error);
      setErrorMessage("Failed to resend verification.");
    }
  };

  const authenticateDomain = async (domain: string) => {
    try {
      setErrorMessage(null);
      const domainSenders = senders.filter((sender) => getDomain(sender.email) === domain);
      await Promise.all(
        domainSenders.map((sender) =>
          senderEmailsAPI.update(sender._id || sender.id, { isVerified: true })
        )
      );
      await fetchSenders();
      showSuccess(`Domain ${domain} authenticated.`);
    } catch (error: any) {
      setErrorMessage(error?.message || `Failed to authenticate ${domain}.`);
    }
  };

  const toggleRelayServer = async (server: RelayServer, enabled: boolean) => {
    try {
      setErrorMessage(null);
      const response = await emailRelayAPI.toggle(server.id, enabled);
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
    <div className="p-6 max-w-7xl">
      {/* Success Notification */}
      {showSuccessNotification && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[10001] bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-fade-in">
          <Check size={20} />
          <span>{successMessage}</span>
        </div>
      )}
      {errorMessage && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-[10001] bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg">
          {errorMessage}
        </div>
      )}

      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Emails</h1>

      <div className="flex gap-6">
        {/* Left Sidebar - Email List */}
        <div className="w-80 bg-white rounded-lg border border-gray-200 p-4 max-h-[600px] overflow-y-auto">
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

        {/* Right Content - Email Details */}
        <div className="flex-1 bg-white rounded-lg border border-gray-200 p-6">
          {selectedPreference === "Sender Email Preferences" ? (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-900">Sender Email Preferences</h2>
                <div className="flex items-center gap-3">
                  <button className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
                    Page Tips
                  </button>
                  <button
                    onClick={() => setShowAddContactModal(true)}
                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 flex items-center gap-2"
                  >
                    <Plus size={16} />
                    New Sender
                  </button>
                </div>
              </div>

              {/* Domain Classification */}
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-sm font-semibold text-gray-900">Domain Classification</h3>
                  <Info size={14} className="text-gray-400" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="text-xs font-semibold text-red-700 uppercase mb-2">Unauthenticated Domains</div>
                    {unauthenticatedDomains.length === 0 ? (
                      <p className="text-sm text-gray-600">No unauthenticated domains.</p>
                    ) : (
                      <div className="space-y-2">
                        {unauthenticatedDomains.map((domain) => (
                          <div key={domain} className="flex items-center justify-between">
                            <span className="text-sm text-gray-800">{domain}</span>
                            <button
                              onClick={() => authenticateDomain(domain)}
                              className="text-xs text-blue-700 hover:underline"
                            >
                              Authenticate Now
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="text-xs font-semibold text-green-700 uppercase mb-2">Authenticated Domains</div>
                    {authenticatedDomains.length === 0 ? (
                      <p className="text-sm text-gray-600">No authenticated domains yet.</p>
                    ) : (
                      <div className="space-y-1">
                        {authenticatedDomains.map((domain) => (
                          <div key={domain} className="text-sm text-gray-800">{domain}</div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Emails Are Sent Through Section */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-900 mb-2">EMAILS ARE SENT THROUGH</h3>
                <div className="text-sm text-gray-700 mb-1">{sendingFromLabel}</div>
                <div className="text-sm text-gray-600">{sendingFromAddress}</div>
              </div>

              {/* Senders Table */}
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">NAME</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">EMAIL ADDRESS</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {loadingSenders && (
                      <tr>
                        <td colSpan={3} className="px-4 py-6 text-sm text-gray-500">Loading sender emails...</td>
                      </tr>
                    )}
                    {!loadingSenders && senders.length === 0 && (
                      <tr>
                        <td colSpan={3} className="px-4 py-6 text-sm text-gray-500">No sender emails found.</td>
                      </tr>
                    )}
                    {senders.map((sender) => (
                      <tr key={sender._id || sender.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-900">{sender.name}</span>
                            {sender.isPrimary && (
                              <span className="px-2 py-0.5 text-xs font-medium text-green-700 bg-green-50 rounded">
                                PRIMARY
                              </span>
                            )}
                            {!sender.isVerified && (
                              <span className="px-2 py-0.5 text-xs font-medium text-amber-700 bg-amber-50 rounded">
                                UNVERIFIED
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-gray-600">{sender.email}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            {!sender.isPrimary && (
                              <button
                                onClick={() => markPrimaryContact(sender)}
                                className="text-xs text-blue-700 hover:underline"
                              >
                                Mark as Primary
                              </button>
                            )}
                            {!sender.isVerified && (
                              <button
                                onClick={() => resendVerification(sender)}
                                className="text-xs text-blue-700 hover:underline"
                              >
                                Resend Email
                              </button>
                            )}
                            <button
                              onClick={() => setEditingSender(sender)}
                              className="p-1.5 text-gray-600 hover:bg-gray-100 rounded transition"
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              onClick={async () => {
                                if (window.confirm(`Are you sure you want to delete ${sender.name}?`)) {
                                  try {
                                    const response = await senderEmailsAPI.delete(sender._id || sender.id);
                                    if (response?.success) {
                                      await fetchSenders();
                                      showSuccess("Sender deleted successfully.");
                                    } else {
                                      alert(response?.message || "Failed to delete sender");
                                    }
                                  } catch (error) {
                                    console.error("Error deleting sender:", error);
                                  }
                                }
                              }}
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

