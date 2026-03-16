import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { X, Info } from "lucide-react";
import { emailRelayAPI, senderEmailsAPI } from "../../services/api";

type SecureConnectionMode = "SSL" | "TLS" | "Never";
type DeliveryPreference = "domain" | "email";

export default function NewServerPage() {
  const navigate = useNavigate();
  const [serverName, setServerName] = useState("");
  const [port, setPort] = useState("465");
  const [dailyMailLimit, setDailyMailLimit] = useState("100");
  const [useSecureConnection, setUseSecureConnection] = useState<SecureConnectionMode>("SSL");
  const [mailDeliveryPreference, setMailDeliveryPreference] = useState<DeliveryPreference>("domain");
  const [domainInServer, setDomainInServer] = useState("");
  const [authenticationRequired, setAuthenticationRequired] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [availableDomains, setAvailableDomains] = useState<string[]>([]);

  const ports = ["465", "587", "25", "2525"];
  const secureConnectionOptions: SecureConnectionMode[] = ["SSL", "TLS", "Never"];

  useEffect(() => {
    const loadDomains = async () => {
      try {
        const response = await senderEmailsAPI.getAll();
        if (!response?.success) return;
        const senders = Array.isArray(response.data) ? response.data : [];
        const domains = Array.from(
          new Set(
            senders
              .map((sender: any) => String(sender.email || "").split("@")[1]?.toLowerCase())
              .filter(Boolean)
          )
        );
        setAvailableDomains(domains);
      } catch {
        setAvailableDomains([]);
      }
    };

    loadDomains();
  }, []);

  const domainPlaceholder = useMemo(() => {
    return mailDeliveryPreference === "domain"
      ? "Ex: company.com"
      : "Ex: finance@company.com";
  }, [mailDeliveryPreference]);

  const handleSave = async () => {
    try {
      setError(null);

      if (!serverName.trim()) {
        setError("Server Name is required.");
        return;
      }
      if (!domainInServer.trim()) {
        setError(
          mailDeliveryPreference === "domain"
            ? "Domain in this Server is required."
            : "Email in this Server is required."
        );
        return;
      }
      if (authenticationRequired && (!username.trim() || !password.trim())) {
        setError("Username and password are required when authentication is enabled.");
        return;
      }

      setIsSaving(true);
      const payload = {
        serverName: serverName.trim(),
        port: Number(port || 587),
        dailyMailLimit: Number(dailyMailLimit || 100),
        useSecureConnection,
        mailDeliveryPreference,
        domainInServer: domainInServer.trim().toLowerCase(),
        authenticationRequired,
        username: authenticationRequired ? username.trim() : "",
        password: authenticationRequired ? password : "",
        isEnabled: true,
      };

      const response = await emailRelayAPI.create(payload);
      if (!response?.success) {
        setError(response?.message || "Failed to save relay server.");
        return;
      }

      navigate("/settings/customization/email-notifications");
    } catch (saveError: any) {
      setError(saveError?.message || "Failed to save relay server.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-50 flex flex-col z-[10000]">
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-900">New Server</h1>
        <button
          onClick={() => navigate("/settings/customization/email-notifications")}
          className="p-1 hover:bg-gray-100 rounded transition"
        >
          <X size={20} className="text-red-500" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-3xl mx-auto bg-white rounded-lg border border-gray-200 p-6">
          {error && (
            <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="mb-8">
            <h2 className="text-base font-semibold text-gray-900 mb-4">Server Details</h2>
            <div className="space-y-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Server Name<span className="text-red-500">*</span>
                  </label>
                  <Info size={14} className="text-gray-400" />
                </div>
                <input
                  type="text"
                  value={serverName}
                  onChange={(e) => setServerName(e.target.value)}
                  className="w-full h-10 px-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: smtp.secureserver.com"
                />
              </div>

              <div>
                <div className="flex items-center gap-2 mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Port<span className="text-red-500">*</span>
                  </label>
                  <Info size={14} className="text-gray-400" />
                </div>
                <select
                  value={port}
                  onChange={(e) => setPort(e.target.value)}
                  className="w-full h-10 px-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {ports.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Daily Mail Limit<span className="text-red-500">*</span>
                  </label>
                  <Info size={14} className="text-gray-400" />
                </div>
                <input
                  type="number"
                  min={1}
                  value={dailyMailLimit}
                  onChange={(e) => setDailyMailLimit(e.target.value)}
                  className="w-full h-10 px-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: 100"
                />
              </div>

              <div>
                <div className="flex items-center gap-2 mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Use Secure Connection<span className="text-red-500">*</span>
                  </label>
                  <Info size={14} className="text-gray-400" />
                </div>
                <div className="flex gap-4">
                  {secureConnectionOptions.map((option) => (
                    <label key={option} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="useSecureConnection"
                        value={option}
                        checked={useSecureConnection === option}
                        onChange={(e) => setUseSecureConnection(e.target.value as SecureConnectionMode)}
                        className="w-4 h-4 text-blue-600"
                      />
                      <span className="text-sm text-gray-700">{option}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-base font-semibold text-gray-900 mb-4">Domain Settings</h2>
            <div className="space-y-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Mail Delivery Preference<span className="text-red-500">*</span>
                  </label>
                  <Info size={14} className="text-gray-400" />
                </div>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="mailDeliveryPreference"
                      value="domain"
                      checked={mailDeliveryPreference === "domain"}
                      onChange={() => setMailDeliveryPreference("domain")}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-sm text-gray-700">Domain-based</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="mailDeliveryPreference"
                      value="email"
                      checked={mailDeliveryPreference === "email"}
                      onChange={() => setMailDeliveryPreference("email")}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-sm text-gray-700">Email-based</span>
                  </label>
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    {mailDeliveryPreference === "domain"
                      ? "Domain in this Server"
                      : "Email in this Server"}
                    <span className="text-red-500">*</span>
                  </label>
                  <Info size={14} className="text-gray-400" />
                </div>
                <input
                  list="email-relay-domains"
                  type="text"
                  value={domainInServer}
                  onChange={(e) => setDomainInServer(e.target.value)}
                  className="w-full h-10 px-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={domainPlaceholder}
                />
                <datalist id="email-relay-domains">
                  {availableDomains.map((domain) => (
                    <option key={domain} value={domain} />
                  ))}
                </datalist>
              </div>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-base font-semibold text-gray-900 mb-4">Authentication</h2>
            <div className="space-y-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Authentication Required<span className="text-red-500">*</span>
                  </label>
                  <Info size={14} className="text-gray-400" />
                </div>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="authenticationRequired"
                      value="yes"
                      checked={authenticationRequired}
                      onChange={() => setAuthenticationRequired(true)}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-sm text-gray-700">Yes</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="authenticationRequired"
                      value="no"
                      checked={!authenticationRequired}
                      onChange={() => setAuthenticationRequired(false)}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-sm text-gray-700">No</span>
                  </label>
                </div>
              </div>

              {authenticationRequired && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Username<span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full h-10 px-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="SMTP username"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Password<span className="text-red-500">*</span>
                    </label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full h-10 px-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="SMTP password"
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-60"
            >
              {isSaving ? "Saving..." : "Save"}
            </button>
            <button
              onClick={() => navigate("/settings/customization/email-notifications")}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

